import { PALETTES, isLight, mix, rgba, shade, type Palette } from './palettes';
import { hashString, mulberry32 } from './rng';
import { MOOD_BPM } from './music';
import { CARD_DURATION, getTimeline, itemAt, type TimelineItem } from './timeline';
import type { BackgroundKind, FontStyle, MotifKind, Project, Scene, TextAnim } from './types';

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

type Ctx = CanvasRenderingContext2D;

let off: HTMLCanvasElement | null = null;
function offscreen(w: number, h: number): Ctx {
  if (!off) off = document.createElement('canvas');
  if (off.width !== w || off.height !== h) {
    off.width = w;
    off.height = h;
  }
  return off.getContext('2d')!;
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (i > 0 && trans !== 'cut' && local < TRANSITION) {
    const prev = tl[i - 1];
    drawItem(ctx, prev, prev.duration, t, project, w, h, tl.length);
    const octx = offscreen(w, h);
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalAlpha = 1;
    drawItem(octx, item, local, t, project, w, h, tl.length);
    const p = easeInOut(local / TRANSITION);
    ctx.save();
    if (trans === 'fade') {
      ctx.globalAlpha = p;
      ctx.drawImage(off!, 0, 0);
    } else if (trans === 'wipe') {
      ctx.beginPath();
      ctx.rect(0, 0, w * p, h);
      ctx.clip();
      ctx.drawImage(off!, 0, 0);
      ctx.restore();
      ctx.save();
      const pal = paletteFor(item, project);
      ctx.fillStyle = rgba(pal.accent, 1 - p);
      ctx.fillRect(w * p - 3, 0, 6, h);
    } else if (trans === 'iris') {
      const maxR = Math.hypot(w, h) / 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * p, 0, TAU);
      ctx.clip();
      ctx.drawImage(off!, 0, 0);
      ctx.restore();
      ctx.save();
      const pal = paletteFor(item, project);
      ctx.strokeStyle = rgba(pal.accent, 1 - p);
      ctx.lineWidth = Math.max(2, maxR * 0.01);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * p, 0, TAU);
      ctx.stroke();
    } else if (trans === 'flash') {
      const pal = paletteFor(item, project);
      if (p < 0.5) {
        ctx.globalAlpha = p * 2;
        ctx.fillStyle = pal.accent2;
        ctx.fillRect(0, 0, w, h);
      } else {
        const q = (p - 0.5) * 2;
        ctx.drawImage(off!, 0, 0);
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = pal.accent2;
        ctx.fillRect(0, 0, w, h);
      }
    } else if (trans === 'dissolve') {
      ctx.globalAlpha = 1 - p * 0.9;
      ctx.drawImage(off!, 0, 0);
      ctx.globalAlpha = p * 0.9;
      const pal = paletteFor(item, project);
      ctx.fillStyle = rgba(pal.accent, p * 0.25);
      ctx.fillRect(0, 0, w, h);
    } else if (trans === 'parallax') {
      const dx = (1 - p) * w * 0.18;
      ctx.translate(-dx, 0);
      ctx.drawImage(off!, 0, 0);
      ctx.restore();
      ctx.save();
      const prevPal = paletteFor(prev, project);
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = rgba(prevPal.accent, 0.18);
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.globalAlpha = p;
      const s = 1.12 - 0.12 * p;
      ctx.translate(w / 2, h / 2);
      ctx.scale(s, s);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(off!, 0, 0);
    }
    ctx.restore();
  } else {
    drawItem(ctx, item, local, t, project, w, h, tl.length);
  }
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

/* ------------------------------------------------------------------ */
/* Scenes / cards                                                      */
/* ------------------------------------------------------------------ */

const GROUND_MOTIFS = new Set<MotifKind>(['forest', 'city', 'mountains', 'ocean']);

function drawScene(ctx: Ctx, scene: Scene, local: number, gt: number, project: Project, w: number, h: number): void {
  const pal = PALETTES[scene.palette % PALETTES.length];
  const seed = hashString(scene.id);
  const progress = clamp01(local / Math.max(0.1, scene.duration));
  ctx.save();
  applyCamera(ctx, scene.camera, progress, gt, w, h);
  drawBackground(ctx, scene.bg, pal, seed, gt, w, h);
  if (scene.dimension === '3d') draw3DWorld(ctx, pal, scene.motif, seed, progress, gt, w, h);
  drawMotif(ctx, scene.motif, pal, seed, gt, w, h);
  drawVignette(ctx, pal, w, h);
  if (project.beatSync && project.music !== 'none') {
    const pulse = beatPulse(MOOD_BPM[project.music], gt);
    if (pulse > 0.03) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = pulse * 0.16;
      ctx.fillStyle = pal.accent;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
  const portrait = h > w;
  const anchor = GROUND_MOTIFS.has(scene.motif) ? (portrait ? 0.32 : 0.37) : scene.motif === 'space' ? (portrait ? 0.4 : 0.44) : 0.5;
  const dialogue = parseDialogue(scene.text);
  drawText(ctx, dialogue.text, scene.textAnim, pal, project.font, local, scene.duration, project.transition === 'cut', w, h, anchor);
  if (dialogue.speaker) drawSpeaker(ctx, dialogue.speaker, pal, local, w, h);
  drawProgress(ctx, pal, local / scene.duration, w, h);
  ctx.restore();
}

function parseDialogue(text: string): { speaker: string; text: string } {
  const match = text.match(/^\s*([^:]{1,32}):\s*(.+)$/s);
  return match ? { speaker: match[1].trim(), text: match[2].trim() } : { speaker: '', text };
}

function drawSpeaker(ctx: Ctx, speaker: string, pal: Palette, local: number, w: number, h: number): void {
  const reveal = easeOut(clamp01(local / 0.45));
  ctx.save();
  ctx.globalAlpha = reveal * 0.95;
  ctx.fillStyle = rgba(pal.accent, 0.92);
  ctx.font = `700 ${Math.round(Math.min(w, h) * 0.026)}px "DM Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const x = w * 0.12;
  const y = h * 0.72;
  ctx.fillText(speaker.toUpperCase().slice(0, 24), x, y);
  ctx.fillStyle = rgba(pal.text, 0.65);
  ctx.fillRect(x, y + Math.min(w, h) * 0.035, Math.min(w, h) * 0.18 * reveal, 2);
  ctx.restore();
}

function applyCamera(ctx: Ctx, camera: Scene['camera'], progress: number, t: number, w: number, h: number): void {
  const scale = camera === 'push' ? 1 + progress * 0.1 : camera === 'parallax' ? 1 + progress * 0.045 : camera === 'orbit' ? 1.025 : 1;
  const dx = camera === 'drift' || camera === 'parallax' ? Math.sin(t * 0.28) * w * 0.018 : camera === 'orbit' ? Math.sin(t * 0.32) * w * 0.025 : 0;
  const dy = camera === 'drift' || camera === 'parallax' ? Math.cos(t * 0.22) * h * 0.012 : camera === 'orbit' ? Math.cos(t * 0.32) * h * 0.012 : 0;
  ctx.translate(w / 2 + dx, h / 2 + dy);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
}

function draw3DWorld(ctx: Ctx, pal: Palette, motif: MotifKind, seed: number, progress: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed ^ 0x3d3d3d);
  const horizon = h * (0.53 + Math.sin(t * 0.12) * 0.012);
  const centerX = w * 0.5 + Math.sin(t * 0.18) * w * 0.035;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(pal.accent, 0.2);
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.002);
  for (let i = 0; i < 12; i++) {
    const y = horizon + Math.pow(i / 12, 1.8) * h * 0.58;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let i = -9; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(centerX, horizon);
    ctx.lineTo(w / 2 + i * w * 0.13, h);
    ctx.stroke();
  }
  ctx.restore();

  const count = motif === 'space' ? 11 : 8;
  for (let i = 0; i < count; i++) {
    const depth = mod(rng() + progress * (0.18 + i * 0.015), 1);
    const z = 0.18 + depth * 0.82;
    const x = w * (0.12 + rng() * 0.76) + Math.sin(t * (0.25 + i * 0.03) + i) * w * 0.025;
    const y = horizon - h * 0.08 + rng() * h * 0.5 * z;
    const size = Math.min(w, h) * (0.018 + 0.065 * z);
    const color = i % 2 ? pal.accent : pal.accent2;
    ctx.save();
    ctx.globalAlpha = 0.18 + z * 0.62;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.8;
    if (motif === 'mountains' || motif === 'forest') {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 1.8);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  const beam = ctx.createLinearGradient(0, horizon, 0, h);
  beam.addColorStop(0, rgba(pal.accent2, 0));
  beam.addColorStop(0.55, rgba(pal.accent2, 0.12));
  beam.addColorStop(1, rgba(pal.accent2, 0));
  ctx.fillStyle = beam;
  ctx.fillRect(0, horizon, w, h - horizon);
}

function drawIntro(ctx: Ctx, project: Project, local: number, gt: number, w: number, h: number): void {
  const first = project.scenes[0];
  const pal = PALETTES[(first?.palette ?? project.basePalette) % PALETTES.length];
  drawBackground(ctx, first?.bg ?? 'aurora', pal, hashString(project.id + 'intro'), gt, w, h);
  drawVignette(ctx, pal, w, h);
  drawText(ctx, project.title || 'Untitled', 'zoom', pal, project.font, local, CARD_DURATION, false, w, h, 0.47);
  drawKicker(ctx, 'AN AGON STORY', pal, local, w, h);
}

function drawOutro(ctx: Ctx, project: Project, local: number, gt: number, w: number, h: number): void {
  const last = project.scenes[project.scenes.length - 1];
  const pal = PALETTES[(last?.palette ?? project.basePalette) % PALETTES.length];
  drawBackground(ctx, 'starfield', pal, hashString(project.id + 'outro'), gt, w, h);
  drawVignette(ctx, pal, w, h);
  drawText(ctx, 'The End', 'pop', pal, project.font, local, CARD_DURATION, false, w, h, 0.47);
  drawKicker(ctx, (project.title || 'Untitled').toUpperCase(), pal, local, w, h);
}

function drawKicker(ctx: Ctx, text: string, pal: Palette, local: number, w: number, h: number): void {
  const d = easeOut(clamp01((local - 0.45) / 0.7));
  if (d <= 0) return;
  ctx.save();
  ctx.globalAlpha = d * 0.85;
  ctx.fillStyle = pal.accent;
  ctx.font = `500 ${Math.round(Math.min(w, h) * 0.024)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0.32em';
  ctx.fillText(text.slice(0, 48), w / 2, h * 0.86 - (1 - d) * 12);
  ctx.letterSpacing = '0px';
  const barW = Math.min(w, h) * 0.06 * d;
  ctx.fillRect(w / 2 - barW / 2, h * 0.86 + Math.min(w, h) * 0.03, barW, 2);
  ctx.restore();
}

function drawEmpty(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#15141b');
  g.addColorStop(1, '#0c0b10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(244,239,228,0.55)';
  ctx.font = `500 ${Math.round(Math.min(w, h) * 0.028)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0.2em';
  ctx.fillText('WRITE A STORY TO BEGIN', w / 2, h / 2);
  ctx.letterSpacing = '0px';
}

function drawProgress(ctx: Ctx, pal: Palette, p: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = rgba(pal.accent, 0.75);
  ctx.fillRect(0, h - Math.max(3, h * 0.005), w * clamp01(p), Math.max(3, h * 0.005));
  ctx.restore();
}

function drawVignette(ctx: Ctx, pal: Palette, w: number, h: number): void {
  const light = isLight(pal);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, light ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

interface WordPos {
  text: string;
  x: number;
  y: number;
  line: number;
  width: number;
  charStart: number;
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? `${cur} ${wd}` : wd;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = wd;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawText(
  ctx: Ctx,
  text: string,
  anim: TextAnim,
  pal: Palette,
  font: FontStyle,
  local: number,
  dur: number,
  exitFade: boolean,
  w: number,
  h: number,
  anchorY: number,
): void {
  if (!text.trim()) return;
  const family = FONT_FAMILY[font];
  const weight = font === 'mono' ? 500 : font === 'serif' ? 700 : 700;
  const portrait = h > w;
  const maxW = w * (portrait ? 0.84 : 0.76);
  const maxLines = portrait ? 9 : 5;
  const chars = text.length;
  const base = Math.min(w, h) * (chars < 24 ? 0.11 : chars < 60 ? 0.082 : chars < 110 ? 0.064 : chars < 170 ? 0.054 : 0.046);
  let fontSize = base;
  let lines: string[] = [];
  for (let k = 0; k < 10; k++) {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) break;
    fontSize *= 0.9;
  }
  const lineH = fontSize * 1.18;
  const blockH = lines.length * lineH;
  const top = h * anchorY - blockH / 2 + lineH / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const spaceW = ctx.measureText(' ').width;

  const words: WordPos[] = [];
  let charCursor = 0;
  lines.forEach((line, li) => {
    const ws = line.split(' ');
    const widths = ws.map((wd) => ctx.measureText(wd).width);
    const total = widths.reduce((a, b) => a + b, 0) + spaceW * (ws.length - 1);
    let x = (w - total) / 2;
    ws.forEach((wd, wi) => {
      words.push({ text: wd, x, y: top + li * lineH, line: li, width: widths[wi], charStart: charCursor });
      charCursor += wd.length + 1;
      x += widths[wi] + spaceW;
    });
  });

  const light = isLight(pal);
  const exit = exitFade ? clamp01((dur - local) / 0.4) : 1;

  ctx.save();
  ctx.fillStyle = pal.text;
  ctx.shadowColor = light ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = fontSize * 0.4;
  ctx.shadowOffsetY = fontSize * 0.05;

  const drawWord = (wp: WordPos, alpha: number, dx: number, dy: number, scale: number, str?: string) => {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha * exit;
    if (scale !== 1) {
      const cx = wp.x + wp.width / 2;
      const cy = wp.y;
      ctx.translate(cx + dx, cy + dy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.fillText(str ?? wp.text, wp.x, wp.y);
    } else {
      ctx.fillText(str ?? wp.text, wp.x + dx, wp.y + dy);
    }
    ctx.restore();
  };

  const N = words.length;
  const stagger = Math.min(0.09, 1.1 / Math.max(1, N));

  switch (anim) {
    case 'rise':
      words.forEach((wp, i) => {
        const d = clamp01((local - i * stagger) / 0.55);
        const e = easeOut(d);
        drawWord(wp, d, 0, (1 - e) * fontSize * 0.7, 1);
      });
      break;
    case 'pop':
      words.forEach((wp, i) => {
        const d = clamp01((local - i * stagger * 0.9) / 0.45);
        drawWord(wp, Math.min(1, d * 2.5), 0, 0, d > 0 ? backOut(d) : 0);
      });
      break;
    case 'fade': {
      const d = easeOut(clamp01(local / 1.0));
      words.forEach((wp) => drawWord(wp, d, 0, 0, 1));
      break;
    }
    case 'slide':
      words.forEach((wp) => {
        const d = clamp01((local - wp.line * 0.14) / 0.65);
        const e = easeOut(d);
        const dir = wp.line % 2 === 0 ? -1 : 1;
        drawWord(wp, d, (1 - e) * dir * w * 0.12, 0, 1);
      });
      break;
    case 'zoom': {
      const d = clamp01(local / 0.85);
      const e = easeOut(d);
      const s = 0.78 + 0.22 * e;
      ctx.save();
      ctx.translate(w / 2, h * anchorY);
      ctx.scale(s, s);
      ctx.translate(-w / 2, -h * anchorY);
      words.forEach((wp) => drawWord(wp, d, 0, 0, 1));
      ctx.restore();
      break;
    }
    case 'typewriter': {
      const revealed = Math.floor(Math.max(0, local - 0.15) * 28);
      let cursorX = -1;
      let cursorY = 0;
      let complete = true;
      words.forEach((wp) => {
        const vis = Math.max(0, Math.min(wp.text.length, revealed - wp.charStart));
        if (vis <= 0) {
          complete = false;
          return;
        }
        const str = wp.text.slice(0, vis);
        drawWord(wp, 1, 0, 0, 1, str);
        if (vis < wp.text.length) {
          complete = false;
          cursorX = wp.x + ctx.measureText(str).width;
          cursorY = wp.y;
        } else if (cursorX < 0 || wp.charStart + vis > revealed - 2) {
          cursorX = wp.x + wp.width + spaceW * 0.2;
          cursorY = wp.y;
        }
      });
      if (!complete && cursorX >= 0 && Math.floor(local * 6) % 2 === 0) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = exit;
        ctx.fillRect(cursorX + 2, cursorY - fontSize * 0.42, Math.max(3, fontSize * 0.08), fontSize * 0.84);
        ctx.restore();
      }
      break;
    }
    case 'glitch': {
      const settle = clamp01((local - 0.05) / 0.5);
      words.forEach((wp, i) => {
        const d = clamp01((local - i * stagger * 0.6) / 0.3);
        if (d <= 0) return;
        const jitter = (1 - easeOut(settle)) * fontSize * 0.5;
        if (jitter > 0.4) {
          // RGB-split ghost copies while it's still "glitching in"
          ctx.save();
          ctx.globalAlpha = d * exit * 0.5;
          ctx.fillStyle = 'rgba(255,60,90,0.9)';
          ctx.shadowBlur = 0;
          ctx.fillText(wp.text, wp.x - jitter, wp.y + (Math.random() - 0.5) * jitter * 0.6);
          ctx.fillStyle = 'rgba(70,220,255,0.9)';
          ctx.fillText(wp.text, wp.x + jitter, wp.y + (Math.random() - 0.5) * jitter * 0.6);
          ctx.restore();
        }
        drawWord(wp, d, (Math.random() - 0.5) * jitter * 0.3, 0, 1);
      });
      break;
    }
    case 'blur': {
      words.forEach((wp, i) => {
        const d = clamp01((local - i * stagger * 0.7) / 0.7);
        const e = easeOut(d);
        const blurPx = (1 - e) * fontSize * 0.5;
        ctx.save();
        ctx.filter = blurPx > 0.3 ? `blur(${blurPx}px)` : 'none';
        drawWord(wp, d, 0, 0, 0.94 + 0.06 * e);
        ctx.restore();
      });
      break;
    }
    case 'float': {
      words.forEach((wp, i) => {
        const d = clamp01((local - i * stagger * 0.8) / 0.8);
        const e = easeOut(d);
        const drift = Math.sin((local * 2.6) + i * 0.7) * fontSize * 0.18;
        drawWord(wp, d, 0, -drift * (1 - e), 1);
      });
      break;
    }
    case 'beam': {
      const d = clamp01(local / 0.9);
      const beam = easeOut(d);
      const reveal = Math.min(1, (local * 1.8) / 1.1);
      words.forEach((wp, i) => {
        const start = i * 0.12;
        const alpha = clamp01((reveal - start) / 0.35);
        const dx = (1 - beam) * (wp.line % 2 === 0 ? -12 : 12);
        drawWord(wp, alpha, dx, 0, 1 + beam * 0.08);
      });
      ctx.save();
      ctx.globalAlpha = exit * 0.85;
      ctx.fillStyle = pal.accent;
      const y = h * anchorY + (lines.length * (fontSize * 1.18)) / 2 + fontSize * 0.15;
      ctx.fillRect(w * 0.18, y, w * 0.64 * beam, Math.max(2, fontSize * 0.08));
      ctx.restore();
      break;
    }
  }

  ctx.restore();

  // Accent bar under the text block
  const bd = easeOut(clamp01((local - 0.3) / 0.7));
  const barW = w * 0.1 * bd;
  if (barW > 0) {
    ctx.save();
    ctx.globalAlpha = exit;
    ctx.fillStyle = pal.accent;
    const y = top + blockH - lineH / 2 + fontSize * 0.55;
    const bh = Math.max(3, fontSize * 0.075);
    roundRect(ctx, (w - barW) / 2, y, barW, bh, bh / 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                     */
/* ------------------------------------------------------------------ */

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx.fill();
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
}

function baseGradient(ctx: Ctx, pal: Palette, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, pal.bg[0]);
  g.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------ */
/* Backgrounds                                                         */
/* ------------------------------------------------------------------ */

function drawBackground(ctx: Ctx, kind: BackgroundKind, pal: Palette, seed: number, t: number, w: number, h: number): void {
  switch (kind) {
    case 'aurora':
      return bgAurora(ctx, pal, seed, t, w, h);
    case 'starfield':
      return bgStarfield(ctx, pal, seed, t, w, h);
    case 'waves':
      return bgWaves(ctx, pal, seed, t, w, h);
    case 'geo':
      return bgGeo(ctx, pal, seed, t, w, h);
    case 'rain':
      return bgRain(ctx, pal, seed, t, w, h);
    case 'bokeh':
      return bgBokeh(ctx, pal, seed, t, w, h);
    case 'grid':
      return bgGrid(ctx, pal, seed, t, w, h);
    case 'sunset':
      return bgSunset(ctx, pal, seed, t, w, h);
    case 'particles':
      return bgParticles(ctx, pal, seed, t, w, h);
    case 'matrix':
      return bgMatrix(ctx, pal, seed, t, w, h);
    case 'nebula':
      return bgNebula(ctx, pal, seed, t, w, h);
    case 'horizon':
      return bgHorizon(ctx, pal, seed, t, w, h);
    case 'mist':
      return bgMist(ctx, pal, seed, t, w, h);
  }
}

function bgAurora(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  const light = isLight(pal);
  ctx.save();
  ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
  const m = Math.min(w, h);
  for (let i = 0; i < 6; i++) {
    const ox = rng();
    const oy = rng();
    const rr = rng();
    const bx = w * (0.15 + 0.7 * ox) + Math.sin(t * 0.28 + i * 1.7) * w * 0.16;
    const by = h * (0.15 + 0.7 * oy) + Math.cos(t * 0.22 + i * 1.1) * h * 0.16;
    const r = m * (0.32 + 0.3 * rr);
    const col = i % 2 ? pal.accent : pal.accent2;
    glow(ctx, bx, by, r, col, light ? 0.22 : 0.3);
  }
  ctx.restore();
}

function bgStarfield(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shade(pal.bg[0], 0.35));
  g.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(seed);
  const light = isLight(pal);
  ctx.save();
  ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
  glow(ctx, w * 0.25, h * 0.35, Math.min(w, h) * 0.5, pal.accent, 0.18);
  glow(ctx, w * 0.75, h * 0.7, Math.min(w, h) * 0.45, pal.accent2, 0.14);
  ctx.restore();
  const starColor = light ? pal.accent2 : pal.text;
  const n = 170;
  for (let i = 0; i < n; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const size = 0.6 + rng() * 1.9;
    const speed = 0.2 + rng() * 0.8;
    const phase = rng() * TAU;
    const x = mod(x0 + t * speed * 9, w);
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + speed * 2.2) + phase);
    ctx.fillStyle = rgba(starColor, 0.35 + 0.65 * tw);
    circle(ctx, x, y0, size * (h / 720));
  }
  // shooting star every 5 seconds
  const period = 5;
  const k = Math.floor(t / period);
  const lt = t - k * period;
  const srng = mulberry32(seed ^ (k * 7919));
  if (lt < 1.1 && srng() < 0.85) {
    const sx = w * (0.1 + 0.7 * srng());
    const sy = h * (0.08 + 0.35 * srng());
    const p = lt / 1.1;
    const hx = sx + p * w * 0.45;
    const hy = sy + p * h * 0.28;
    const len = Math.min(w, h) * 0.18;
    const grad = ctx.createLinearGradient(hx, hy, hx - len, hy - len * 0.62);
    grad.addColorStop(0, rgba(starColor, 0.95 * (1 - p)));
    grad.addColorStop(1, rgba(starColor, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2 * (h / 720);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - len, hy - len * 0.62);
    ctx.stroke();
  }
}

function bgWaves(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  glow(ctx, w * (0.3 + 0.4 * rng()), h * 0.3, Math.min(w, h) * 0.5, pal.accent2, isLight(pal) ? 0.18 : 0.14);
  for (let k = 0; k < 4; k++) {
    const yBase = h * (0.6 + k * 0.09);
    const amp = h * 0.028 * (1 + k * 0.35);
    const freq = ((2 + k) * TAU) / w;
    const speed = 0.7 + k * 0.3;
    const col = mix(pal.accent, pal.bg[0], 0.15 + k * 0.22);
    ctx.fillStyle = rgba(col, 0.55 + k * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
      const y = yBase + Math.sin(x * freq + t * speed + k * 1.3) * amp + Math.sin(x * freq * 0.5 - t * speed * 0.6 + k) * amp * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

function bgGeo(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  ctx.lineWidth = Math.max(1.5, m * 0.0025);
  for (let i = 0; i < 16; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const sides = 3 + Math.floor(rng() * 4);
    const size = m * (0.035 + 0.1 * rng());
    const rot = (rng() - 0.5) * 0.7;
    const drift = 0.4 + rng();
    const x = x0 + Math.sin(t * 0.3 + i) * w * 0.04;
    const y = mod(y0 - t * h * 0.018 * drift, h + size * 2) - size;
    const col = i % 2 ? pal.accent : pal.accent2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * rot + i);
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * TAU;
      const px = Math.cos(a) * size;
      const py = Math.sin(a) * size;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(col, 0.09);
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.55);
    ctx.stroke();
    ctx.restore();
  }
}

function bgRain(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shade(pal.bg[0], 0.3));
  g.addColorStop(1, shade(pal.bg[1], 0.25));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(seed);
  // lightning
  const k = Math.floor(t / 6.5);
  const lt = t - k * 6.5;
  const lr = mulberry32(seed ^ (k * 104729));
  if (lr() < 0.7 && lt < 0.35) {
    const flick = 0.5 + 0.5 * Math.sin(lt * 90);
    ctx.fillStyle = rgba(pal.text, ((0.35 - lt) / 0.35) * 0.32 * flick);
    ctx.fillRect(0, 0, w, h);
  }
  // clouds top
  ctx.save();
  ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen';
  glow(ctx, w * 0.5, -h * 0.1, w * 0.6, pal.accent, 0.12);
  ctx.restore();
  const streakColor = isLight(pal) ? pal.accent2 : pal.text;
  ctx.strokeStyle = rgba(streakColor, 0.28);
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.beginPath();
  for (let i = 0; i < 150; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const len = (18 + rng() * 40) * (h / 720);
    const speed = h * (0.9 + rng() * 0.8);
    const y = mod(y0 + t * speed, h + len) - len;
    const x = mod(x0 - y * 0.07, w);
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.12, y + len);
  }
  ctx.stroke();
  // puddle sheen
  const pg = ctx.createLinearGradient(0, h * 0.8, 0, h);
  pg.addColorStop(0, rgba(pal.accent, 0));
  pg.addColorStop(1, rgba(pal.accent, 0.2));
  ctx.fillStyle = pg;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
}

function bgBokeh(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  ctx.save();
  ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen';
  for (let i = 0; i < 30; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const r = m * (0.018 + 0.085 * rng());
    const speed = 0.012 + 0.03 * rng();
    const phase = rng() * TAU;
    const y = mod(y0 - t * h * speed, h + r * 2) - r;
    const x = x0 + Math.sin(t * 0.35 + phase) * w * 0.025;
    const col = i % 3 === 0 ? pal.accent2 : pal.accent;
    glow(ctx, x, y, r, col, 0.22 + 0.12 * Math.sin(t + phase));
  }
  ctx.restore();
}

function bgNebula(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = isLight(pal) ? 'screen' : 'screen';
  for (let i = 0; i < 7; i++) {
    const x = w * (0.15 + 0.7 * rng());
    const y = h * (0.12 + 0.7 * rng());
    const r = Math.min(w, h) * (0.12 + 0.18 * rng());
    const color = i % 2 === 0 ? pal.accent : pal.accent2;
    glow(ctx, x + Math.sin(t * 0.2 + i) * 30, y + Math.cos(t * 0.24 + i) * 26, r, color, 0.28);
  }
  ctx.restore();
}

function bgHorizon(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, pal.bg[0]);
  sky.addColorStop(0.55, mix(pal.accent, pal.bg[1], 0.35));
  sky.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizonY = h * 0.62;
  const sun = Math.min(w, h) * 0.16;
  glow(ctx, w * 0.7, h * 0.22, sun * 2.6, pal.accent2, 0.28);

  ctx.fillStyle = rgba(pal.accent, 0.2);
  ctx.fillRect(0, horizonY, w, h - horizonY);
  for (let i = 0; i < 6; i++) {
    const y = horizonY + i * 14;
    const wave = Math.sin((t * 0.8) + i) * 18;
    ctx.fillStyle = rgba(mix(pal.accent, pal.bg[0], 0.2 + i * 0.08), 0.15 + i * 0.06);
    ctx.fillRect(0, y, w, 12);
    ctx.beginPath();
    ctx.moveTo(0, y + 8);
    for (let x = 0; x <= w; x += 18) {
      ctx.quadraticCurveTo(x + 9, y + wave * 0.5 + Math.sin(x * 0.05 + t) * 10, x + 18, y + 8);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  const rng = mulberry32(seed);
  for (let i = 0; i < 18; i++) {
    const x = rng() * w;
    const y = horizonY + rng() * h * 0.25;
    const size = 8 + rng() * 18;
    ctx.fillStyle = rgba(pal.text, 0.18 + rng() * 0.22);
    ctx.fillRect(x, y, size * 0.7, size * 0.35);
  }
}

function bgMist(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 14; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = Math.min(w, h) * (0.12 + rng() * 0.25);
    const alpha = 0.09 + rng() * 0.16;
    glow(ctx, x + Math.sin(t * 0.25 + i) * 30, y + Math.cos(t * 0.2 + i) * 20, r, i % 2 ? pal.accent : pal.accent2, alpha);
  }
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const band = h * (0.28 + i * 0.22);
    const grad = ctx.createLinearGradient(0, band, 0, band + h * 0.18);
    grad.addColorStop(0, rgba(pal.text, 0));
    grad.addColorStop(1, rgba(pal.text, 0.08));
    ctx.fillStyle = grad;
    ctx.fillRect(0, band, w, h * 0.18);
  }
}

function bgGrid(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const hy = h * 0.58;
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, pal.bg[0]);
  sky.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, hy);
  // sun
  const r = Math.min(w, h) * 0.17;
  const sx = w / 2;
  const sy = hy - r * 0.32;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, hy);
  ctx.clip();
  glow(ctx, sx, sy, r * 2.2, pal.accent, 0.35);
  const sg = ctx.createLinearGradient(0, sy - r, 0, sy + r);
  sg.addColorStop(0, pal.accent2);
  sg.addColorStop(1, pal.accent);
  ctx.fillStyle = sg;
  circle(ctx, sx, sy, r);
  ctx.fillStyle = pal.bg[1];
  for (let i = 0; i < 6; i++) {
    const yy = sy + r * (0.05 + i * 0.16);
    ctx.fillRect(sx - r, yy, r * 2, r * (0.03 + i * 0.012));
  }
  ctx.restore();
  // ground
  ctx.fillStyle = shade(pal.bg[0], 0.35);
  ctx.fillRect(0, hy, w, h - hy);
  const hg = ctx.createLinearGradient(0, hy, 0, hy + h * 0.12);
  hg.addColorStop(0, rgba(pal.accent, 0.55));
  hg.addColorStop(1, rgba(pal.accent, 0));
  ctx.fillStyle = hg;
  ctx.fillRect(0, hy, w, h * 0.12);
  ctx.strokeStyle = rgba(pal.accent, 0.55);
  ctx.lineWidth = Math.max(1, h * 0.0018);
  ctx.beginPath();
  for (let k = -12; k <= 12; k++) {
    ctx.moveTo(w / 2 + k * w * 0.045, hy);
    ctx.lineTo(w / 2 + k * w * 0.36, h + 20);
  }
  ctx.stroke();
  for (let j = 0; j < 14; j++) {
    const f = mod(j / 14 + t * 0.22, 1);
    const y = hy + (h - hy) * f * f;
    ctx.strokeStyle = rgba(pal.accent, 0.15 + 0.6 * f);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  void seed;
}

function bgSunset(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal.bg[0]);
  g.addColorStop(0.55, mix(pal.bg[1], pal.accent, 0.35));
  g.addColorStop(0.8, mix(pal.accent, pal.accent2, 0.4));
  g.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.13;
  const sx = w * 0.62;
  const sy = h * (h > w ? 0.58 : 0.56) + Math.sin(t * 0.05) * h * 0.015;
  glow(ctx, sx, sy, r * 3, pal.accent2, 0.35);
  const sg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
  sg.addColorStop(0, pal.accent2);
  sg.addColorStop(1, pal.accent);
  ctx.fillStyle = sg;
  circle(ctx, sx, sy, r);
  // birds
  const rng = mulberry32(seed);
  const birdColor = shade(pal.bg[0], 0.4);
  ctx.strokeStyle = rgba(birdColor, 0.85);
  ctx.lineWidth = Math.max(1.5, h * 0.0025);
  for (let i = 0; i < 5; i++) {
    const y0 = h * (0.12 + rng() * 0.3);
    const sp = 0.02 + rng() * 0.02;
    const off0 = rng();
    const x = mod(off0 * w + t * w * sp, w * 1.3) - w * 0.15;
    const y = y0 + Math.sin(t * 1.3 + i) * h * 0.01;
    const s = Math.min(w, h) * (0.008 + rng() * 0.006);
    const flap = Math.sin(t * 7 + i * 2) * s * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - s, y + flap);
    ctx.quadraticCurveTo(x - s / 2, y - s * 0.3, x, y);
    ctx.quadraticCurveTo(x + s / 2, y - s * 0.3, x + s, y + flap);
    ctx.stroke();
  }
}

function bgParticles(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  baseGradient(ctx, pal, w, h);
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  const n = 70;
  ctx.save();
  ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen';
  for (let i = 0; i < n; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const depth = 0.3 + rng() * 0.7; // closer = bigger + faster
    const r = m * (0.003 + 0.011 * depth);
    const speed = 0.01 + 0.05 * depth;
    const drift = rng() * TAU;
    const y = mod(y0 - t * h * speed * 0.4, h + r * 4) - r * 2;
    const x = mod(x0 + Math.sin(t * 0.2 + drift) * w * 0.05 + t * w * 0.004 * (i % 2 === 0 ? 1 : -1), w + r * 4) - r * 2;
    const col = i % 4 === 0 ? pal.accent2 : pal.accent;
    const twinkle = 0.35 + 0.35 * Math.sin(t * (1.2 + depth) + drift);
    glow(ctx, x, y, r * 2.4, col, twinkle * depth * 0.5);
    ctx.fillStyle = rgba(col, Math.min(1, twinkle + 0.4));
    circle(ctx, x, y, r * depth);
  }
  ctx.restore();
}

function bgMatrix(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shade(pal.bg[0], 0.3));
  g.addColorStop(1, shade(pal.bg[1], 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(seed);
  const cell = Math.max(14, Math.min(w, h) * 0.024);
  const cols = Math.ceil(w / cell) + 1;
  const chars = '01アイウエオカキクケコ';
  ctx.save();
  ctx.font = `600 ${cell}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let c = 0; c < cols; c++) {
    const speed = cell * (2.6 + rng() * 3.2);
    const startOff = rng() * h * 2;
    const len = 6 + Math.floor(rng() * 10);
    const headY = mod(startOff + t * speed, h + len * cell) - len * cell;
    for (let k = 0; k < len; k++) {
      const y = headY + k * cell;
      if (y < -cell || y > h) continue;
      const a = k === len - 1 ? 1 : Math.max(0, 0.85 - k / len);
      ctx.fillStyle = k === len - 1 ? rgba(pal.accent2, 1) : rgba(pal.accent, a * 0.8);
      const ch = chars[(c * 7 + k + Math.floor(t * 6)) % chars.length];
      ctx.fillText(ch, c * cell + cell / 2, y);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Motifs                                                              */
/* ------------------------------------------------------------------ */

function drawMotif(ctx: Ctx, kind: MotifKind, pal: Palette, seed: number, t: number, w: number, h: number): void {
  switch (kind) {
    case 'none':
      return;
    case 'forest':
      return motifForest(ctx, pal, seed, t, w, h);
    case 'city':
      return motifCity(ctx, pal, seed, t, w, h);
    case 'mountains':
      return motifMountains(ctx, pal, seed, t, w, h);
    case 'space':
      return motifSpace(ctx, pal, seed, t, w, h);
    case 'ocean':
      return motifOcean(ctx, pal, seed, t, w, h);
    case 'hearts':
      return motifHearts(ctx, pal, seed, t, w, h);
    case 'snow':
      return motifSnow(ctx, pal, seed, t, w, h);
    case 'embers':
      return motifEmbers(ctx, pal, seed, t, w, h);
    case 'clouds':
      return motifClouds(ctx, pal, seed, t, w, h);
  }
}

function silhouette(pal: Palette, depth: number): string {
  // depth 0 = far (lighter), 1 = near (darker)
  const light = isLight(pal);
  if (light) return mix(pal.accent2, pal.bg[1], 0.55 - depth * 0.45);
  return mix(mix(pal.bg[1], pal.bg[0], 0.5), '#000000', 0.25 + depth * 0.5);
}

function motifForest(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  for (let k = 0; k < 3; k++) {
    const depth = k / 2;
    const col = silhouette(pal, depth);
    const baseY = h * (0.8 + k * 0.07);
    const count = 9 + k * 3;
    ctx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const x = (i / count) * w * 1.1 - w * 0.05 + (rng() - 0.5) * (w / count) * 0.8;
      const th = m * (0.32 - k * 0.05) * (0.75 + 0.5 * rng());
      const tw = th * 0.42;
      const sway = Math.sin(t * 0.7 + x * 0.01 + k) * th * 0.02;
      // trunk
      ctx.fillRect(x - tw * 0.06, baseY - th * 0.2, tw * 0.12, th * 0.22);
      for (let s = 0; s < 3; s++) {
        const y = baseY - th * (0.2 + s * 0.28);
        const ww = tw * (1 - s * 0.22);
        const hh = th * 0.4;
        ctx.beginPath();
        ctx.moveTo(x + sway * (s + 1) * 0.5, y - hh);
        ctx.lineTo(x + ww / 2, y);
        ctx.lineTo(x - ww / 2, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // ground strip
    ctx.fillRect(0, baseY - 2, w, h - baseY + 2);
  }
  // fireflies
  const fc = isLight(pal) ? pal.accent : pal.accent2;
  for (let i = 0; i < 20; i++) {
    const x0 = rng() * w;
    const y0 = h * (0.5 + rng() * 0.38);
    const phase = rng() * TAU;
    const x = x0 + Math.sin(t * 0.6 + phase) * w * 0.02;
    const y = y0 + Math.cos(t * 0.5 + phase * 1.3) * h * 0.02;
    const blink = Math.pow(Math.max(0, Math.sin(t * 1.8 + phase)), 3);
    if (blink > 0.02) glow(ctx, x, y, m * 0.012, fc, blink * 0.9);
  }
}

function motifCity(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const winColor = isLight(pal) ? pal.accent : pal.accent2;
  for (let k = 0; k < 2; k++) {
    const depth = k;
    const col = silhouette(pal, depth);
    const count = k === 0 ? 16 : 11;
    let x = -w * 0.02;
    let bi = 0;
    while (x < w * 1.02 && bi < count + 6) {
      const bw = w * (0.035 + 0.07 * rng());
      const bh = h * (k === 0 ? 0.15 + 0.3 * rng() : 0.1 + 0.36 * rng());
      const y = h - bh;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, bw, bh);
      if (k === 1) {
        const cell = Math.max(6, w * 0.011);
        const cols = Math.max(1, Math.floor((bw - cell) / cell));
        const rows = Math.max(1, Math.floor((bh - cell) / cell));
        const wr = mulberry32(seed + bi * 31);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const baseLit = wr() < 0.5;
            const flick = ((bi * 7 + r * 13 + c * 3 + Math.floor(t / 1.6)) * 2654435761) >>> 0;
            const lit = baseLit !== (flick % 11 === 0);
            if (lit) {
              ctx.fillStyle = rgba(winColor, 0.75);
              ctx.fillRect(x + cell * 0.6 + c * cell, y + cell * 0.6 + r * cell, cell * 0.42, cell * 0.5);
            }
          }
        }
        if (bh > h * 0.34) {
          ctx.fillStyle = col;
          ctx.fillRect(x + bw / 2 - 1, y - h * 0.05, 2, h * 0.05);
          const on = Math.sin(t * 3 + bi) > 0;
          if (on) glow(ctx, x + bw / 2, y - h * 0.05, Math.min(w, h) * 0.01, '#ff4d4d', 0.95);
        }
      }
      x += bw + w * 0.004;
      bi++;
    }
  }
}

function motifMountains(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  // moon
  const mx = w * 0.78;
  const my = h * 0.2;
  const mr = Math.min(w, h) * 0.055;
  glow(ctx, mx, my, mr * 3.5, pal.text, 0.18);
  ctx.fillStyle = rgba(pal.text, 0.92);
  circle(ctx, mx, my, mr);
  for (let k = 0; k < 3; k++) {
    const depth = k / 2;
    const col = silhouette(pal, depth);
    const segs = 6 + k * 3;
    const base = h * (0.56 + k * 0.11);
    const shift = Math.sin(t * 0.08) * (k + 1) * w * 0.004;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, h);
    for (let s = 0; s <= segs; s++) {
      const x = (s / segs) * w * 1.2 - w * 0.1 + shift;
      const y = base + (rng() - 0.5) * h * (0.22 - k * 0.04);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w * 1.1, h);
    ctx.closePath();
    ctx.fill();
  }
}

function motifSpace(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  const R = m * 0.15;
  const px = w > h ? w * 0.8 : w * 0.72;
  const py = w > h ? h * 0.72 : h * 0.78;
  const tilt = -0.35;
  const ringColor = isLight(pal) ? pal.accent2 : pal.text;
  const a = t * 0.55 + rng() * TAU;
  const moonX = px + Math.cos(a) * R * 2.5;
  const moonY = py + Math.sin(a) * R * 0.75;
  const moonBehind = Math.sin(a) < 0;
  const drawMoon = () => {
    ctx.fillStyle = rgba(ringColor, 0.9);
    circle(ctx, moonX, moonY, R * 0.14);
  };
  const drawRing = (front: boolean) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(tilt);
    ctx.strokeStyle = rgba(ringColor, 0.32);
    ctx.lineWidth = R * 0.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.9, R * 0.5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.stroke();
    ctx.restore();
  };
  glow(ctx, px, py, R * 2.4, pal.accent, 0.25);
  if (moonBehind) drawMoon();
  drawRing(false);
  const pg = ctx.createRadialGradient(px - R * 0.4, py - R * 0.4, R * 0.1, px, py, R);
  pg.addColorStop(0, pal.accent2);
  pg.addColorStop(0.6, pal.accent);
  pg.addColorStop(1, shade(pal.accent, 0.6));
  ctx.fillStyle = pg;
  circle(ctx, px, py, R);
  // bands
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = rgba(shade(pal.accent, 0.3), 0.35);
  for (let i = 0; i < 3; i++) {
    const yy = py - R * 0.5 + i * R * 0.45 + Math.sin(t * 0.3 + i) * R * 0.03;
    ctx.fillRect(px - R, yy, R * 2, R * 0.12);
  }
  ctx.restore();
  drawRing(true);
  if (!moonBehind) drawMoon();
}

function motifOcean(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  // moon + shimmer
  const mx = w * 0.72;
  const my = h * 0.2;
  glow(ctx, mx, my, m * 0.16, pal.text, 0.15);
  ctx.fillStyle = rgba(pal.text, 0.9);
  circle(ctx, mx, my, m * 0.045);
  for (let i = 0; i < 9; i++) {
    const y = h * (0.62 + i * 0.038);
    const len = m * (0.03 + 0.05 * rng()) * (0.6 + 0.4 * Math.sin(t * 2.4 + i * 1.7));
    ctx.fillStyle = rgba(pal.text, 0.25 + 0.2 * Math.sin(t * 3 + i));
    ctx.fillRect(mx - len / 2 + Math.sin(t + i) * m * 0.01, y, len, Math.max(1.5, h * 0.003));
  }
  // sea band so the boat always has water beneath it
  const freq = (2 * TAU) / w;
  const amp = h * 0.028;
  ctx.fillStyle = rgba(silhouette(pal, 0.35), 0.8);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, h * 0.6 + Math.sin(x * freq + t * 0.7) * amp + m * 0.012);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // boat
  const bx = w * 0.3 + Math.sin(t * 0.18) * w * 0.02;
  const by = h * 0.6 + Math.sin(bx * freq + t * 0.7) * amp - m * 0.01;
  const slope = Math.cos(bx * freq + t * 0.7) * amp * freq;
  const s = m * 0.11;
  const boatColor = silhouette(pal, 1);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(Math.atan(slope) * 0.9);
  ctx.fillStyle = boatColor;
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, 0);
  ctx.lineTo(s * 0.55, 0);
  ctx.lineTo(s * 0.38, s * 0.17);
  ctx.lineTo(-s * 0.4, s * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-s * 0.02, -s * 0.85, s * 0.04, s * 0.85);
  ctx.fillStyle = rgba(pal.text, 0.92);
  ctx.beginPath();
  ctx.moveTo(s * 0.03, -s * 0.8);
  ctx.lineTo(s * 0.45 + Math.sin(t * 2) * s * 0.02, -s * 0.12);
  ctx.lineTo(s * 0.03, -s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(pal.text, 0.7);
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, -s * 0.7);
  ctx.lineTo(-s * 0.32, -s * 0.12);
  ctx.lineTo(-s * 0.03, -s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heartPath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.35, x - s * 0.35, y - s * 1.05, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.35, y - s * 1.05, x + s * 0.9, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}

function motifHearts(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  for (let i = 0; i < 18; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const s = m * (0.012 + 0.03 * rng());
    const speed = 0.04 + 0.06 * rng();
    const phase = rng() * TAU;
    const y = mod(y0 - t * h * speed, h * 1.2) - h * 0.1;
    const x = x0 + Math.sin(t * 0.9 + phase) * w * 0.025;
    const fade = clamp01((y / h) * 4) * clamp01((1 - y / h) * 4 + 0.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t + phase) * 0.25);
    ctx.fillStyle = rgba(i % 3 === 0 ? pal.accent2 : pal.accent, 0.75 * fade);
    heartPath(ctx, 0, 0, s);
    ctx.fill();
    ctx.restore();
  }
}

function motifSnow(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const col = isLight(pal) ? pal.accent2 : pal.text;
  for (let i = 0; i < 130; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const r = (1 + rng() * 2.6) * (h / 720);
    const speed = 0.045 + 0.08 * rng();
    const phase = rng() * TAU;
    const y = mod(y0 + t * h * speed, h + 12) - 6;
    const x = mod(x0 + Math.sin(t * 0.7 + phase) * 22 + t * 10, w);
    ctx.fillStyle = rgba(col, 0.45 + 0.45 * rng());
    circle(ctx, x, y, r);
  }
}

function motifEmbers(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  const g = ctx.createLinearGradient(0, h * 0.65, 0, h);
  g.addColorStop(0, rgba(pal.accent, 0));
  g.addColorStop(1, rgba(pal.accent, 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
  for (let i = 0; i < 70; i++) {
    const x0 = rng() * w;
    const y0 = rng() * h;
    const speed = 0.06 + 0.12 * rng();
    const phase = rng() * TAU;
    const y = mod(y0 - t * h * speed, h * 1.1) - h * 0.05;
    const x = x0 + Math.sin(t * 1.5 + phase) * w * 0.012;
    const life = y / h;
    const size = m * 0.004 * (0.5 + life);
    const flick = 0.55 + 0.45 * Math.sin(t * 6 + phase);
    glow(ctx, x, y, size * 4, i % 4 === 0 ? pal.accent2 : pal.accent, flick * life * 0.9);
  }
}

function motifClouds(ctx: Ctx, pal: Palette, seed: number, t: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const m = Math.min(w, h);
  const col = isLight(pal) ? '#ffffff' : pal.text;
  for (let i = 0; i < 7; i++) {
    const layer = i % 3;
    const speed = 0.012 + layer * 0.008;
    const x0 = rng() * w;
    const y = h * (0.08 + rng() * 0.55);
    const s = m * (0.05 + rng() * 0.05) * (1 + layer * 0.35);
    const x = mod(x0 + t * w * speed, w * 1.5) - w * 0.25;
    ctx.fillStyle = rgba(col, 0.16 + layer * 0.08);
    circle(ctx, x, y, s * 0.6);
    circle(ctx, x + s * 0.55, y - s * 0.15, s * 0.75);
    circle(ctx, x + s * 1.2, y, s * 0.6);
    circle(ctx, x + s * 0.6, y + s * 0.25, s * 0.55);
    circle(ctx, x - s * 0.3, y + s * 0.2, s * 0.45);
  }
}
