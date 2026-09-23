import { PALETTES, isLight, mix, rgba, shade, type Palette } from './palettes';
import { hashString, mulberry32 } from './rng';
import { MOOD_BPM } from './music';
import { CARD_DURATION, getTimeline, itemAt, type TimelineItem } from './timeline';
import type { BackgroundKind, FontStyle, MotifKind, Project, Scene, TextAnim } from './types';
import { createFrameCanvas, type FrameCanvas } from './rendererCanvas';

// NOTE: Full file restored in follow-up - temporary stub that fails loudly if incomplete
export function renderFrame(ctx: CanvasRenderingContext2D, project: Project, time: number, w: number, h: number): void {
  throw new Error('renderer.ts was corrupted during branch work; restore from main. See PR #4.');
}
