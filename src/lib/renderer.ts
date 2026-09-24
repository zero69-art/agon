import { PALETTES, isLight, mix, rgba, shade, type Palette } from './palettes';
import { hashString, mulberry32 } from './rng';
import { MOOD_BPM } from './music';
import { CARD_DURATION, getTimeline, itemAt, type TimelineItem } from './timeline';
import type { BackgroundKind, FontStyle, MotifKind, Project, Scene, TextAnim } from './types';
import { createFrameCanvas, type FrameCanvas } from './rendererCanvas';

/** 0..1 envelope, sharply peaked right on each beat of `bpm`, decaying until the next one. */
function beatPulse(bpm: number, t: number): number {
  if (bpm <= 0 || !isFinite(t)) return 0;
  const beatDur = 60 / bpm;
  const phase = ((t % beatDur) + beatDur) % beatDur / beatDur;
  return Math.pow(1 - phase, 4);
}

export const FONT_FAMILY: Record<FontStyle, string> = {
  display: '"Bricolage Grotesque", "Instrument Sans", sans-serif',
  serif: '"Fraunces", Georgia, serif',
  mono: '"DM Mono", ui-monospace, monospace',
  rounded: '"Nunito", "Instrument Sans", sans-serif',
};

const TRANSITION = 0.8;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;

function draw3DTransition(ctx: Ctx, scene: Scene, local: number, w: number, h: number): void {
  const fadeDuration = Math.min(0.42, Math.max(0.18, scene.duration * 0.12));
  let alpha = 0;
  if (local < fadeDuration) {
    alpha = 1 - easeOut(clamp01(local / fadeDuration));
  } else if (local > scene.duration - fadeDuration) {
    alpha = easeInOut(clamp01((local - (scene.duration - fadeDuration)) / fadeDuration));
  }
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

type Ctx = CanvasRenderingContext2D;

type ThreeDirectorBridge = {
  canvas: HTMLCanvasElement;
  render: (project: Project, scene: Scene | null, local: number, globalTime: number) => void;
  dispose: () => void;
  setOutputSize?: (size: { w: number; h: number } | null) => void;
};

let threeDirector: ThreeDirectorBridge | null = null;
let threeDirectorPromise: Promise<void> | null = null;
let threeHost: HTMLDivElement | null = null;

function ensureThreeDirector(sceneCount: number, w: number, h: number): void {
  if (typeof window === 'undefined') return;
  if (threeDirector) {
    threeDirector.setOutputSize?.({ w, h });
    return;
  }
  if (threeDirectorPromise) return;

  const create = (window as Window & {
    __AGON_CREATE_THREE_DIRECTOR__?: (host: HTMLDivElement, sceneCount: number) => Promise<ThreeDirectorBridge>;
  }).__AGON_CREATE_THREE_DIRECTOR__;
  if (typeof create !== 'function') return;

  threeHost = document.createElement('div');
  threeHost.setAttribute('aria-hidden', 'true');
  threeHost.style.position = 'fixed';
  threeHost.style.left = '-10000px';
  threeHost.style.top = '-10000px';
  threeHost.style.width = '1px';
  threeHost.style.height = '1px';
  threeHost.style.pointerEvents = 'none';
  threeHost.style.opacity = '0';
  document.body.appendChild(threeHost);

  threeDirectorPromise = create(threeHost, sceneCount)
    .then((director) => {
      threeDirector = director;
      director.setOutputSize?.({ w, h });
    })
    .catch(() => {
      threeDirector = null;
    })
    .finally(() => {
      threeDirectorPromise = null;
    });
}

function renderThreeToCanvas(
  ctx: Ctx,
  project: Project,
  scene: Scene,
  local: number,
  globalTime: number,
  w: number,
  h: number,
  sceneCount: number,
): boolean {
  if (scene.dimension !== '3d') return false;
  ensureThreeDirector(sceneCount, w, h);
  if (!threeDirector) return false;
  try {
    threeDirector.setOutputSize?.({ w, h });
    threeDirector.render(project, scene, local, globalTime);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(threeDirector.canvas, 0, 0, w, h);
    return true;
  } catch {
    try {
      threeDirector.dispose();
    } catch {
      // Ignore renderer cleanup failures and fall back to the deterministic 2D frame.
    }
    threeDirector = null;
    threeDirectorPromise = null;
    return false;
  }
}

let off: FrameCanvas | null = null;
function offscreen(w: number, h: number): Ctx {
  if (!off) off = createFrameCanvas(w, h);
  if (off.width !== w || off.height !== h) {
    off.width = w;
    off.height = h;
  }
  return off.getContext('2d') as Ctx;
}

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

export function renderFrame(ctx: Ctx, project: Project, time: number, w: number, h: number): void {
  const tl = getTimeline(project);
  if (!tl.length) {
    drawEmpty(ctx, w, h);
    return;
  }
  const total = tl[tl.length - 1].start + tl[tl.length - 1].duration;
  const t = Math.min(Math.max(time, 0), total - 0.0001);
  const hit = itemAt(tl, t)!;
  const { item, i, local } = hit;
  const trans = project.transition;

  if (item.kind === 'scene' && item.scene) {
    if (renderThreeToCanvas(ctx, project, item.scene, local, t, w, h, project.scenes.length)) {
      if (trans === 'fade') draw3DTransition(ctx, item.scene, local, w, h);
      return;
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // PART1_END - remaining body restored in subsequent commits
  drawItem(ctx, item, local, t, project, w, h, tl.length);
}

function paletteFor(item: TimelineItem, project: Project): Palette {
  if (item.scene) return PALETTES[item.scene.palette % PALETTES.length];
  const s = item.kind === 'intro' ? project.scenes[0] : project.scenes[project.scenes.length - 1];
  return PALETTES[(s?.palette ?? project.basePalette) % PALETTES.length];
}

function drawItem(ctx: Ctx, item: TimelineItem, local: number, gt: number, project: Project, w: number, h: number, count: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  if (item.kind === 'scene' && item.scene) drawScene(ctx, item.scene, local, gt, project, w, h);
  else if (item.kind === 'intro') drawIntro(ctx, project, local, gt, w, h);
  else drawOutro(ctx, project, local, gt, w, h);
  void count;
}

function drawScene(ctx: Ctx, scene: Scene, local: number, gt: number, project: Project, w: number, h: number): void {
  const pal = PALETTES[scene.palette % PALETTES.length];
  drawBackground(ctx, scene.bg, pal, hashString(scene.id), gt, w, h);
  drawText(ctx, scene.text, scene.textAnim, pal, project.font, local, scene.duration, true, w, h, 0.5);
}

function drawIntro(ctx: Ctx, project: Project, local: number, gt: number, w: number, h: number): void {
  const pal = PALETTES[project.basePalette % PALETTES.length];
  drawBackground(ctx, 'aurora', pal, 1, gt, w, h);
  drawText(ctx, project.title || 'Untitled', 'zoom', pal, project.font, local, 3.2, false, w, h, 0.47);
}

function drawOutro(ctx: Ctx, project: Project, local: number, gt: number, w: number, h: number): void {
  const pal = PALETTES[project.basePalette % PALETTES.length];
  drawBackground(ctx, 'starfield', pal, 2, gt, w, h);
  drawText(ctx, 'The End', 'pop', pal, project.font, local, 3.2, false, w, h, 0.47);
}

function drawEmpty(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#0c0b10';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(244,239,228,0.55)';
  ctx.font = '500 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WRITE A STORY TO BEGIN', w / 2, h / 2);
}

function drawBackground(ctx: Ctx, bg: BackgroundKind, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.bg[0]);
  g.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawText(
  ctx: Ctx,
  text: string,
  anim: TextAnim,
  pal: Palette,
  font: FontStyle,
  local: number,
  duration: number,
  _cut: boolean,
  w: number,
  h: number,
  anchor: number,
): void {
  ctx.save();
  ctx.fillStyle = pal.text;
  ctx.font = `600 ${Math.round(Math.min(w, h) * 0.045)}px ${FONT_FAMILY[font]}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const alpha = clamp01(local / 0.4);
  ctx.globalAlpha = alpha;
  const lines = text.split(/\n/).flatMap((line) => {
    const words = line.split(/\s+/);
    const out: string[] = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > w * 0.8 && cur) {
        out.push(cur);
        cur = word;
      } else cur = test;
    }
    if (cur) out.push(cur);
    return out;
  });
  const lh = Math.min(w, h) * 0.055;
  const startY = h * anchor - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, startY + i * lh));
  ctx.restore();
}
