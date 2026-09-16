import type { Project, Scene } from './types';

export const CARD_DURATION = 3.2;

export interface TimelineItem {
  kind: 'intro' | 'scene' | 'outro';
  scene: Scene | null;
  index: number;
  start: number;
  duration: number;
}

export function getTimeline(project: Project): TimelineItem[] {
  const items: TimelineItem[] = [];
  let t = 0;
  if (project.introCard && project.scenes.length) {
    items.push({ kind: 'intro', scene: null, index: -1, start: t, duration: CARD_DURATION });
    t += CARD_DURATION;
  }
  project.scenes.forEach((scene, index) => {
    items.push({ kind: 'scene', scene, index, start: t, duration: scene.duration });
    t += scene.duration;
  });
  if (project.outroCard && project.scenes.length) {
    items.push({ kind: 'outro', scene: null, index: project.scenes.length, start: t, duration: CARD_DURATION });
  }
  return items;
}

export function totalDuration(project: Project): number {
  const tl = getTimeline(project);
  if (!tl.length) return 0;
  const last = tl[tl.length - 1];
  return last.start + last.duration;
}

export function itemAt(tl: TimelineItem[], t: number): { item: TimelineItem; i: number; local: number } | null {
  if (!tl.length) return null;
  for (let i = 0; i < tl.length; i++) {
    const it = tl[i];
    if (t < it.start + it.duration) return { item: it, i, local: Math.max(0, t - it.start) };
  }
  const last = tl[tl.length - 1];
  return { item: last, i: tl.length - 1, local: last.duration };
}

export function sceneStart(project: Project, sceneId: string): number {
  const it = getTimeline(project).find((x) => x.scene?.id === sceneId);
  return it ? it.start : 0;
}
