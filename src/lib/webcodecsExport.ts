import type { Project } from './types';
import { canvasSize } from './types';
import { totalDuration } from './timeline';
import { ensureThreeDirectorReady, renderFrame } from './renderer';
import { SimpleWebmMuxer, type WebmCodecId } from './webmMux';
import { supportsWebCodecsExport } from './webcodecsSupport';

export type WebcodecsExportProgress = {
  frame: number;
  totalFrames: number;
  ratio: number;
};

export type WebcodecsExportResult = {
  blob: Blob;
  mime: string;
  duration: number;
};

export function canUseWebCodecsExport(): boolean {
  return supportsWebCodecsExport();
}

type ExportOptions = {
  fps?: number;
  signal?: AbortSignal;
  onProgress?: (p: WebcodecsExportProgress) => void;
  /**
   * 3D scenes must stay on the main thread because the Three.js director
   * uses the browser's WebGL context. The old worker path remains for 2D.
   */
  mainThreadRenderer?: boolean;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
}

async function waitForEncoderCapacity(encoder: VideoEncoder, signal?: AbortSignal): Promise<void> {
  while (encoder.encodeQueueSize > 3) {
    throwIfAborted(signal);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
}

function pickBitrate(project: Project): number {
  return project.quality === 'ultra' ? 16_000_000 : project.quality === 'high' ? 8_000_000 : 4_000_000;
}

async function pickCodec(width: number, height: number, bitrate: number, fps: number): Promise<{ codec: string; webmCodecId: WebmCodecId } | null> {
  const candidates: { codec: string; webmCodecId: WebmCodecId }[] = [
    { codec: 'vp09.00.10.08', webmCodecId: 'V_VP9' },
    { codec: 'vp8', webmCodecId: 'V_VP8' },
  ];
  for (const candidate of candidates) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec: candidate.codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (supported) return candidate;
    } catch {
      // Try the next codec.
    }
  }
  return null;
}

/**
 * Deterministic browser-side export for 3D.
 *
 * Unlike MediaRecorder, this path renders an exact frame for every timestamp
 * and feeds those frames directly into WebCodecs. It can be slower than realtime,
 * but the output is not dependent on tab timing or requestAnimationFrame cadence.
 */
async function exportOnMainThread(project: Project, opts: ExportOptions): Promise<WebcodecsExportResult> {
  if (typeof document === 'undefined' || typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    throw new Error('Frame-accurate export requires a browser with WebCodecs support.');
  }

  const fps = opts.fps ?? 30;
  const { w, h } = canvasSize(project.aspect, project.quality);
  const duration = totalDuration(project);
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const bitrate = pickBitrate(project);

  throwIfAborted(opts.signal);

  const ready = await ensureThreeDirectorReady(project.scenes.length, w, h);
  if (!ready) throw new Error('The 3D renderer could not start. Try Chrome or Edge with hardware acceleration enabled.');

  const codec = await pickCodec(w, h, bitrate, fps);
  if (!codec) throw new Error('No supported WebCodecs video encoder (VP9/VP8) was found in this browser.');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  canvas.style.top = '-10000px';
  canvas.style.width = '1px';
  canvas.style.height = '1px';
  canvas.style.pointerEvents = 'none';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    canvas.remove();
    throw new Error('Could not create the export canvas.');
  }

  const muxer = new SimpleWebmMuxer(w, h, codec.webmCodecId, fps);
  const output: EncodedVideoChunk[] = [];
  let encoder: VideoEncoder | null = null;
  let encoderError: Error | null = null;

  try {
    encoder = new VideoEncoder({
      output: (chunk) => output.push(chunk),
      error: (error) => {
        encoderError = new Error(error.message || 'VideoEncoder error');
      },
    });

    encoder.configure({
      codec: codec.codec,
      width: w,
      height: h,
      bitrate,
      framerate: fps,
      latencyMode: 'quality',
      hardwareAcceleration: 'prefer-hardware',
    });

    for (let i = 0; i < totalFrames; i++) {
      throwIfAborted(opts.signal);

      const t = Math.min(Math.max(0, duration - 0.0001), i / fps);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      renderFrame(ctx, project, t, w, h);

      const timestamp = Math.round((i * 1_000_000) / fps);
      const frame = new VideoFrame(canvas, {
        timestamp,
        duration: Math.round(1_000_000 / fps),
      });
      const keyFrame = i % Math.max(1, Math.round(fps * 2)) === 0;
      encoder.encode(frame, { keyFrame });
      frame.close();

      await waitForEncoderCapacity(encoder, opts.signal);
      if (encoderError) throw encoderError;

      while (output.length) {
        const chunk = output.shift()!;
        const buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        muxer.addChunk(buf, chunk.timestamp, chunk.type === 'key');
      }

      if (i % 2 === 0 || i === totalFrames - 1) {
        opts.onProgress?.({ frame: i + 1, totalFrames, ratio: (i + 1) / totalFrames });
      }
    }

    await encoder.flush();
    if (encoderError) throw encoderError;

    while (output.length) {
      const chunk = output.shift()!;
      const buf = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      muxer.addChunk(buf, chunk.timestamp, chunk.type === 'key');
    }

    const blob = muxer.finalize();
    return { blob, mime: 'video/webm', duration };
  } finally {
    try {
      encoder?.close();
    } catch {
      // Ignore encoder shutdown failures during cancellation/cleanup.
    }
    canvas.remove();
  }
}

/**
 * Offline export.
 * 2D projects use a worker; 3D projects use the deterministic main-thread path.
 */
export function exportWithWebCodecs(
  project: Project,
  opts: ExportOptions = {},
): Promise<WebcodecsExportResult> {
  if (!supportsWebCodecsExport()) {
    return Promise.reject(new Error('WebCodecs export is not supported in this browser.'));
  }

  const fps = opts.fps ?? 30;
  const { w, h } = canvasSize(project.aspect, project.quality);
  const duration = totalDuration(project);
  if (duration <= 0 || !project.scenes.length) {
    return Promise.reject(new Error('Nothing to export — build scenes from a script first.'));
  }

  if (opts.mainThreadRenderer) {
    return exportOnMainThread(project, opts);
  }

  const bitrate = pickBitrate(project);

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/exportWorker.ts', import.meta.url), { type: 'module' });
    let settled = false;

    const cleanup = () => {
      worker.terminate();
      opts.signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      worker.postMessage({ type: 'cancel' });
      cleanup();
      reject(new DOMException('Export cancelled', 'AbortError'));
    };

    opts.signal?.addEventListener('abort', onAbort);

    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as
        | { type: 'progress'; frame: number; totalFrames: number }
        | { type: 'done'; buffer: ArrayBuffer; mime: string; duration: number }
        | { type: 'error'; message: string };

      if (msg.type === 'progress') {
        opts.onProgress?.({
          frame: msg.frame,
          totalFrames: msg.totalFrames,
          ratio: msg.totalFrames ? msg.frame / msg.totalFrames : 0,
        });
        return;
      }
      if (msg.type === 'done') {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({
          blob: new Blob([msg.buffer], { type: msg.mime }),
          mime: msg.mime,
          duration: msg.duration,
        });
        return;
      }
      if (msg.type === 'error') {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(msg.message || 'WebCodecs export failed'));
      }
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err.error ?? new Error(err.message || 'Export worker crashed'));
    };

    worker.postMessage({
      type: 'start',
      project,
      width: w,
      height: h,
      fps,
      bitrate,
      duration,
    });
  });
}
