import type { Project, Scene } from './types';

export interface Preset {
  id: string;
  label: string;
  description: string;
  accent: string;
  patch: Partial<Project>;
  scenePatch: Partial<Scene>;
}

export const PRESETS: Preset[] = [
  {
    id: 'cinematic',
    label: 'Cinematic Story',
    description: 'Wide atmosphere, elegant titles, and slow camera depth.',
    accent: '#ff8a55',
    patch: { aspect: '16:9', music: 'cinematic', transition: 'dissolve', font: 'serif', wpm: 145, quality: 'high', introCard: true, outroCard: true },
    scenePatch: { dimension: '3d', camera: 'push', textAnim: 'fade' },
  },
  {
    id: 'shorts',
    label: 'Vertical Shorts',
    description: 'High-contrast pacing for Reels, TikTok, and Shorts.',
    accent: '#b6f5c8',
    patch: { aspect: '9:16', music: 'upbeat', transition: 'flash', font: 'rounded', wpm: 190, quality: 'high', introCard: false, outroCard: false },
    scenePatch: { dimension: '2d', camera: 'drift', textAnim: 'pop' },
  },
  {
    id: 'dream',
    label: 'Dream Journal',
    description: 'Soft motion, mist, and spacious ambient sound.',
    accent: '#c9b8ff',
    patch: { aspect: '1:1', music: 'ambient', transition: 'parallax', font: 'display', wpm: 125, quality: 'high', introCard: true, outroCard: false },
    scenePatch: { dimension: '3d', camera: 'orbit', textAnim: 'float' },
  },
  {
    id: 'mystery',
    label: 'Dark Mystery',
    description: 'Tense cuts, deep space, and restrained typography.',
    accent: '#8fa8ff',
    patch: { aspect: '16:9', music: 'mystery', transition: 'iris', font: 'mono', wpm: 135, quality: 'high', introCard: true, outroCard: true },
    scenePatch: { dimension: '3d', camera: 'parallax', textAnim: 'beam' },
  },
];

export function applyPreset(project: Project, preset: Preset): Project {
  return {
    ...project,
    ...preset.patch,
    scenes: project.scenes.map((scene) => ({ ...scene, ...preset.scenePatch })),
    updatedAt: Date.now(),
  };
}