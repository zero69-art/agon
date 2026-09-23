/** Canvas factory that works on the main thread and in Web Workers. */
export type FrameCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createFrameCanvas(w: number, h: number): FrameCanvas {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}
