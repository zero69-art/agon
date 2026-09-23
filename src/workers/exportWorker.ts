/// <reference lib="webworker" />
import { renderFrame } from '../lib/renderer';
import type { Project } from '../lib/types';
import { SimpleWebmMuxer, type WebmCodecId } from '../lib/webmMux';

type StartMsg = {
  type: 'start';
  project: Project;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
};

type InMsg = StartMsg | { type: 'cancel' };

let cancelled = false;

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (msg.type !== 'start') return;

  cancelled = false;
  const { project, width, height, fps, bitrate, duration } = msg;

  try {
    const codecInfo = await pickCodec(width, height, bitrate, fps);
    if (!codecInfo) {
      self.postMessage({ type: 'error', message: 'No supported WebCodecs video encoder (VP9/VP8) in this browser.' });
      return;
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      self.postMessage({ type: 'error', message: 'OffscreenCanvas 2D context unavailable.' });
      return;
    }

    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const muxer = new SimpleWebmMuxer(width, height, codecInfo.webmCodecId, fps);

    const chunkQueue: EncodedVideoChunk[] = [];

    const encoder = new VideoEncoder({
      output: (chunk) => {
        chunkQueue.push(chunk);
      },
      error: (e) => {
        self.postMessage({ type: 'error', message: e.message || 'VideoEncoder error' });
      },
    });

    encoder.configure({
      codec: codecInfo.codec,
      width,
      height,
      bitrate,
      framerate: fps,
      latencyMode: 'quality',
      hardwareAcceleration: 'prefer-hardware',
    });

    for (let i = 0; i < totalFrames; i++) {
      if (cancelled) {
        try {
          encoder.close();
        } catch {
          /* ignore */
        }
        self.postMessage({ type: 'error', message: 'Export cancelled' });
        return;
      }

      const t = Math.min(duration - 1e-4, i / fps);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      renderFrame(ctx as unknown as CanvasRenderingContext2D, project, t, width, height);

      const timestamp = Math.round((i * 1_000_000) / fps);
      const frame = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / fps) });
      const keyFrame = i % Math.max(1, Math.round(fps * 2)) === 0;
      encoder.encode(frame, { keyFrame });
      frame.close();

      while (chunkQueue.length) {
        const chunk = chunkQueue.shift()!;
        const buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        muxer.addChunk(buf, chunk.timestamp, chunk.type === 'key');
      }

      if (i % 3 === 0 || i === totalFrames - 1) {
        self.postMessage({ type: 'progress', frame: i + 1, totalFrames });
      }

      if (i % 15 === 0) await Promise.resolve();
    }

    await encoder.flush();
    encoder.close();

    while (chunkQueue.length) {
      const chunk = chunkQueue.shift()!;
      const buf = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      muxer.addChunk(buf, chunk.timestamp, chunk.type === 'key');
    }

    const blob = muxer.finalize();
    const buffer = await blob.arrayBuffer();
    self.postMessage({ type: 'done', buffer, mime: 'video/webm', duration }, [buffer]);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    self.postMessage({ type: 'error', message });
  }
};

async function pickCodec(
  width: number,
  height: number,
  bitrate: number,
  framerate: number,
): Promise<{ codec: string; webmCodecId: WebmCodecId } | null> {
  const candidates: { codec: string; webmCodecId: WebmCodecId }[] = [
    { codec: 'vp09.00.10.08', webmCodecId: 'V_VP9' },
    { codec: 'vp8', webmCodecId: 'V_VP8' },
  ];
  for (const c of candidates) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec: c.codec,
        width,
        height,
        bitrate,
        framerate,
      });
      if (supported) return c;
    } catch {
      /* next */
    }
  }
  return null;
}

export {};
