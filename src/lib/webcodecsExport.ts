import type { Project } from './types';
import { canvasSize } from './types';
import { totalDuration } from './timeline';
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

/**
 * Offline (faster-than-realtime when possible) export via a dedicated worker.
 * Renders frames with OffscreenCanvas + encodes with WebCodecs VideoEncoder.
 * Video only (no music track) — silent WebM.
 */
export function exportWithWebCodecs(
  project: Project,
  opts: {
    fps?: number;
    signal?: AbortSignal;
    onProgress?: (p: WebcodecsExportProgress) => void;
  } = {},
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

  const bitrate =
    project.quality === 'ultra' ? 16_000_000 : project.quality === 'high' ? 8_000_000 : 4_000_000;

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
