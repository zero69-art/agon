export type BackgroundKind = 'aurora' | 'starfield' | 'waves' | 'geo' | 'rain' | 'bokeh' | 'grid' | 'sunset' | 'particles' | 'matrix' | 'nebula' | 'horizon' | 'mist';
export type MotifKind = 'none' | 'forest' | 'city' | 'mountains' | 'space' | 'ocean' | 'hearts' | 'snow' | 'embers' | 'clouds';
export type TextAnim = 'rise' | 'pop' | 'typewriter' | 'fade' | 'slide' | 'zoom' | 'glitch' | 'blur' | 'float' | 'beam';
export type Transition = 'fade' | 'wipe' | 'zoom' | 'cut' | 'iris' | 'flash' | 'dissolve' | 'parallax';
export type Aspect = '16:9' | '9:16' | '1:1';
export type MusicMood = 'none' | 'dreamy' | 'upbeat' | 'epic' | 'mystery' | 'lofi' | 'ambient' | 'cinematic' | 'retro';
export type FontStyle = 'display' | 'serif' | 'mono' | 'rounded';
export type Quality = 'standard' | 'high' | 'ultra';
export type CameraMotion = 'still' | 'push' | 'drift' | 'orbit' | 'parallax';
export type SceneDimension = '2d' | '3d';
export type SceneAssetMode = 'auto' | 'quaternius' | 'procedural';
export type ActionKind = 'idle' | 'walk' | 'run' | 'jump' | 'wave' | 'fight' | 'dance' | 'sit' | 'point' | 'look' | 'kneel' | 'reach' | 'talk';

export interface Scene {
  id: string;
  text: string;
  bg: BackgroundKind;
  motif: MotifKind;
  palette: number;
  textAnim: TextAnim;
  duration: number;
  locked: boolean;
  camera: CameraMotion;
  dimension: SceneDimension;
  asset?: SceneAssetMode;
  action?: ActionKind;
  characters?: string[];
  emotion?: string;
  speakingCharacter?: string;
}

export interface Project {
  id: string;
  title: string;
  script: string;
  scenes: Scene[];
  aspect: Aspect;
  music: MusicMood;
  musicVolume: number;
  transition: Transition;
  font: FontStyle;
  wpm: number;
  introCard: boolean;
  outroCard: boolean;
  quality: Quality;
  basePalette: number;
  narrationVoice: string;
  narrationRate: number;
  narrationPitch: number;
  beatSync: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ExportedClip {
  id: string;
  title: string;
  url: string;
  size: number;
  duration: number;
  mime: string;
  createdAt: number;
}

export const BACKGROUNDS: { id: BackgroundKind; label: string; hint: string }[] = [
  { id: 'aurora', label: 'Aurora', hint: 'Drifting color clouds' },
  { id: 'starfield', label: 'Starfield', hint: 'Twinkling night sky' },
  { id: 'waves', label: 'Waves', hint: 'Layered rolling sea' },
  { id: 'geo', label: 'Geometry', hint: 'Floating polygons' },
  { id: 'rain', label: 'Rainfall', hint: 'Storm with lightning' },
  { id: 'bokeh', label: 'Bokeh', hint: 'Soft glowing orbs' },
  { id: 'grid', label: 'Retro grid', hint: 'Synthwave horizon' },
  { id: 'sunset', label: 'Sunset', hint: 'Warm sky and birds' },
  { id: 'particles', label: 'Particles', hint: 'Floating glowing motes' },
  { id: 'matrix', label: 'Matrix', hint: 'Falling code rain' },
  { id: 'nebula', label: 'Nebula', hint: 'Deep-space haze and bloom' },
  { id: 'horizon', label: 'Horizon', hint: 'Glowing coastline and silhouettes' },
  { id: 'mist', label: 'Mist', hint: 'Foggy dream drift' },
];

export const MOTIFS: { id: MotifKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'forest', label: 'Forest' },
  { id: 'city', label: 'City' },
  { id: 'mountains', label: 'Mountains' },
  { id: 'space', label: 'Planet' },
  { id: 'ocean', label: 'Sailboat' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'snow', label: 'Snowfall' },
  { id: 'embers', label: 'Embers' },
  { id: 'clouds', label: 'Clouds' },
];

export const TEXT_ANIMS: { id: TextAnim; label: string }[] = [
  { id: 'rise', label: 'Rise' },
  { id: 'pop', label: 'Pop' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'blur', label: 'Blur focus' },
  { id: 'float', label: 'Float' },
  { id: 'beam', label: 'Beam' },
];

export const CAMERA_MOTIONS: { id: CameraMotion; label: string; hint: string }[] = [
  { id: 'still', label: 'Still', hint: 'Clean locked shot' },
  { id: 'push', label: 'Push in', hint: 'Slow cinematic zoom' },
  { id: 'drift', label: 'Drift', hint: 'Gentle floating movement' },
  { id: 'orbit', label: 'Orbit', hint: 'Subtle circular camera move' },
  { id: 'parallax', label: 'Parallax', hint: 'Layered depth movement' },
];

export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: 'fade', label: 'Crossfade' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'cut', label: 'Cut' },
  { id: 'iris', label: 'Iris' },
  { id: 'flash', label: 'Flash' },
  { id: 'dissolve', label: 'Dissolve' },
  { id: 'parallax', label: 'Parallax' },
];

export const ASPECTS: { id: Aspect; label: string; hint: string; w: number; h: number; hw: number; hh: number; uw: number; uh: number }[] = [
  { id: '16:9', label: 'Landscape', hint: 'YouTube · 16:9', w: 1280, h: 720, hw: 1920, hh: 1080, uw: 3840, uh: 2160 },
  { id: '9:16', label: 'Vertical', hint: 'Reels · Shorts · 9:16', w: 720, h: 1280, hw: 1080, hh: 1920, uw: 2160, uh: 3840 },
  { id: '1:1', label: 'Square', hint: 'Feed · 1:1', w: 1080, h: 1080, hw: 1440, hh: 1440, uw: 2160, uh: 2160 },
];

export const MUSIC_MOODS: { id: MusicMood; label: string; desc: string; bpm: string }[] = [
  { id: 'none', label: 'Silent', desc: 'No background music', bpm: '—' },
  { id: 'dreamy', label: 'Dreamy', desc: 'Warm pads and slow arpeggios', bpm: '70' },
  { id: 'upbeat', label: 'Upbeat', desc: 'Bright plucks with a bouncing beat', bpm: '122' },
  { id: 'epic', label: 'Epic', desc: 'Cinematic strings and deep drums', bpm: '92' },
  { id: 'mystery', label: 'Mystery', desc: 'Sparse, eerie tones and pulses', bpm: '78' },
  { id: 'lofi', label: 'Lo-fi', desc: 'Dusty keys with a soft groove', bpm: '84' },
  { id: 'ambient', label: 'Ambient', desc: 'Slow atmospheric drones and breathy textures', bpm: '60' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Wide, layered swells for dramatic reveals', bpm: '86' },
  { id: 'retro', label: 'Retro', desc: 'Synthwave sparkle with a nostalgic pulse', bpm: '110' },
];

export const FONTS: { id: FontStyle; label: string; sample: string }[] = [
  { id: 'display', label: 'Display', sample: 'Bricolage' },
  { id: 'serif', label: 'Serif', sample: 'Fraunces' },
  { id: 'mono', label: 'Mono', sample: 'DM Mono' },
  { id: 'rounded', label: 'Rounded', sample: 'Nunito' },
];

export function canvasSize(aspect: Aspect, quality: Quality): { w: number; h: number } {
  const a = ASPECTS.find((x) => x.id === aspect) ?? ASPECTS[0];
  if (quality === 'ultra') return { w: a.uw, h: a.uh };
  if (quality === 'high') return { w: a.hw, h: a.hh };
  return { w: a.w, h: a.h };
}

/** Narration voice/rate/pitch defaults, and a couple of helpers for the Sound panel. */
export const NARRATION_DEFAULTS = { voice: '', rate: 1, pitch: 1 };
