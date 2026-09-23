import { PALETTES } from './palettes';
import { hashString, mulberry32, pick, uid } from './rng';
import type { ActionKind, BackgroundKind, CameraMotion, MotifKind, Project, Scene, TextAnim } from './types';

const MAX_WORDS = 22;
const HARD_MAX = 28;

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function splitLong(chunk: string): string[] {
  if (wordCount(chunk) <= HARD_MAX) return [chunk];
  const words = chunk.split(/\s+/);
  const mid = Math.floor(words.length / 2);
  let cut = mid;
  for (let d = 0; d < 6; d++) {
    if (words[mid + d]?.endsWith(',') || words[mid + d]?.endsWith(';')) {
      cut = mid + d + 1;
      break;
    }
    if (words[mid - d]?.endsWith(',') || words[mid - d]?.endsWith(';')) {
      cut = mid - d + 1;
      break;
    }
  }
  const a = words.slice(0, cut).join(' ');
  const b = words.slice(cut).join(' ');
  return [...splitLong(a), ...splitLong(b)];
}

export function splitText(text: string): string[] {
  const paras = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const p of paras) {
    const sentences =
      p
        .match(/[^.!?…]+[.!?…]+["'”’)]*|[^.!?…]+$/g)
        ?.map((s) => s.trim())
        .filter(Boolean) ?? [p];
    let cur = '';
    for (const s of sentences) {
      const combined = cur ? `${cur} ${s}` : s;
      if (wordCount(combined) > MAX_WORDS && cur) {
        chunks.push(cur);
        cur = s;
      } else {
        cur = combined;
      }
    }
    if (cur) chunks.push(cur);
  }
  return chunks.flatMap(splitLong);
}

interface Rule {
  keys: RegExp;
  motif: MotifKind;
  bg: BackgroundKind;
  palette: number;
}

const RULES: Rule[] = [
  { keys: /\b(forest|forests|tree|trees|woods|jungle|grove|leaves|garden|oak|pine)\b/i, motif: 'forest', bg: 'bokeh', palette: 2 },
  { keys: /\b(city|cities|street|streets|neon|town|skyline|building|buildings|downtown|traffic|subway|rooftop)\b/i, motif: 'city', bg: 'grid', palette: 9 },
  { keys: /\b(mountain|mountains|hill|hills|peak|peaks|valley|cliff|cliffs|summit|highlands)\b/i, motif: 'mountains', bg: 'sunset', palette: 5 },
  { keys: /\b(space|star|stars|galaxy|planet|planets|moon|cosmos|orbit|rocket|universe|comet|station)\b/i, motif: 'space', bg: 'starfield', palette: 0 },
  { keys: /\b(ocean|sea|wave|waves|ship|ships|boat|sail|sailed|river|lake|shore|tide|harbor|harbour|island|lighthouse)\b/i, motif: 'ocean', bg: 'waves', palette: 3 },
  { keys: /\b(love|loved|heart|hearts|kiss|kissed|romance|wedding|darling|beloved|valentine)\b/i, motif: 'hearts', bg: 'bokeh', palette: 4 },
  { keys: /\b(snow|snowing|winter|ice|frost|frozen|cold|blizzard)\b/i, motif: 'snow', bg: 'aurora', palette: 3 },
  { keys: /\b(fire|flame|flames|burn|burning|dragon|battle|war|forge|ember|embers|lava|volcano)\b/i, motif: 'embers', bg: 'geo', palette: 1 },
  { keys: /\b(cloud|clouds|sky|skies|wind|dream|dreams|dreamed|float|floating|heaven|breeze)\b/i, motif: 'clouds', bg: 'aurora', palette: 5 },
  { keys: /\b(rain|raining|storm|thunder|lightning|tempest)\b/i, motif: 'none', bg: 'rain', palette: 0 },
  { keys: /\b(night|dark|darkness|midnight|shadow|shadows)\b/i, motif: 'space', bg: 'starfield', palette: 0 },
  { keys: /\b(morning|sunrise|dawn|sunset|dusk|golden|evening)\b/i, motif: 'mountains', bg: 'sunset', palette: 5 },
  { keys: /\b(code|computer|robot|robots|machine|digital|data|ai|algorithm|signal)\b/i, motif: 'none', bg: 'grid', palette: 9 },
  { keys: /\b(party|dance|danced|music|celebrate|birthday|festival)\b/i, motif: 'none', bg: 'geo', palette: 4 },
  { keys: /\b(nebula|galaxy|cosmic|supernova|void|orbit|spacecraft|moonlit)\b/i, motif: 'space', bg: 'nebula', palette: 0 },
  { keys: /\b(horizon|shore|coast|beach|sunrise|dawn|golden hour|seaside|cliff)\b/i, motif: 'ocean', bg: 'horizon', palette: 3 },
  { keys: /\b(mist|fog|haze|dream|whisper|drift|memory|veil|shadowed)\b/i, motif: 'clouds', bg: 'mist', palette: 5 },
];

const ANIMS: TextAnim[] = ['rise', 'pop', 'slide', 'fade', 'zoom', 'typewriter', 'float', 'beam'];
const CAMERAS: CameraMotion[] = ['still', 'push', 'drift', 'orbit', 'parallax'];
const BG_CYCLE: BackgroundKind[] = ['aurora', 'bokeh', 'geo', 'starfield', 'waves', 'grid', 'sunset', 'rain', 'particles', 'matrix', 'nebula', 'horizon', 'mist'];

const ACTIONS: ActionKind[] = ['idle', 'walk', 'run', 'jump', 'wave', 'fight', 'dance', 'sit', 'point', 'look', 'kneel', 'reach', 'talk'];

function directive(text: string, key: string): string {
  const match = text.match(new RegExp('\\[' + key + '\\s*:\\s*([^\\]]+)\\]', 'i'));
  return match?.[1]?.trim() ?? '';
}

function cleanDirectorCues(text: string): string {
  return text
    .replace(/\[(?:ACTION|CHARACTERS?|EMOTION|CAMERA)\s*:\s*[^\]]+\]/gi, '')
    .replace(/^\s*\|\s*/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeAction(value: string): ActionKind | undefined {
  const v = value.trim().toLowerCase().replace(/[^a-z]/g, '') as ActionKind;
  return ACTIONS.includes(v) ? v : undefined;
}

function inferAction(text: string): ActionKind {
  const t = text.toLowerCase();
  if (/\b(run|runs|running|chase|chases|sprint|sprints)\b/.test(t)) return 'run';
  if (/\b(jump|jumps|jumped|leap|leaps|leapt)\b/.test(t)) return 'jump';
  if (/\b(wave|waves|waved|hello|beckon|beckons)\b/.test(t)) return 'wave';
  if (/\b(fight|fights|attack|attacks|punch|punches|battle|battles)\b/.test(t)) return 'fight';
  if (/\b(dance|dances|danced|twirl|twirls)\b/.test(t)) return 'dance';
  if (/\b(sit|sits|sat|sit down)\b/.test(t)) return 'sit';
  if (/\b(kneel|kneels|kneeling)\b/.test(t)) return 'kneel';
  if (/\b(point|points|pointing|gesture|gestures)\b/.test(t)) return 'point';
  if (/\b(reach|reaches|reaching|grab|grabs)\b/.test(t)) return 'reach';
  if (/\b(look|looks|stare|stares|watch|watches|gaze|gazes)\b/.test(t)) return 'look';
  if (/\b(talk|talks|speaks|says|asks|replies|whispers|shouts|calls)\b/.test(t)) return 'talk';
  if (/\b(walk|walks|walking|approach|approaches|steps)\b/.test(t)) return 'walk';
  return 'idle';
}

function inferCharacters(text: string): string[] {
  const explicit = directive(text, 'CHARACTERS');
  if (explicit) return explicit.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 2);
  const hits: string[] = [];
  for (const [key, label] of [['fox', 'fox'], ['vixen', 'fox'], ['bear', 'bear'], ['owl', 'owl'], ['rabbit', 'rabbit'], ['bunny', 'rabbit'], ['robot', 'robot'], ['android', 'robot']] as const) {
    if (new RegExp('\\b' + key + '\\b', 'i').test(text) && !hits.includes(label)) hits.push(label);
  }
  return hits.slice(0, 2);
}

export function computeDuration(text: string, wpm: number): number {
  const words = wordCount(text);
  const secs = (words / Math.max(60, wpm)) * 60 + 1.4;
  return Math.round(Math.min(25, Math.max(2.5, secs)) * 10) / 10;
}

export function makeScene(text: string, index: number, wpm: number, basePalette: number): Scene {
  const rng = mulberry32(hashString(text) + index * 977);
  const rule = RULES.find((r) => r.keys.test(text));
  const textAnim = ANIMS[index % ANIMS.length];
  const action = normalizeAction(directive(text, 'ACTION')) ?? inferAction(text);
  const characters = inferCharacters(text);
  const emotion = directive(text, 'EMOTION');
  const cameraCue = directive(text, 'CAMERA').toLowerCase().trim();
  const camera = (CAMERAS.includes(cameraCue as CameraMotion) ? cameraCue : CAMERAS[index % CAMERAS.length]) as CameraMotion;
  const cleanText = cleanDirectorCues(text);
  const speakerMatch = cleanText.match(/^\\s*([^:]{1,32}):\\s*/);
  const speakingCharacter = speakerMatch?.[1]?.trim() || undefined;
  return {
    id: uid(),
    text: cleanText,
    bg: rule ? rule.bg : BG_CYCLE[(index + Math.floor(rng() * 2)) % BG_CYCLE.length],
    motif: rule ? rule.motif : 'none',
    palette: rule ? rule.palette : basePalette,
    textAnim,
    duration: computeDuration(cleanText, wpm),
    locked: false,
    camera,
    dimension: '3d',
    action,
    characters: characters.length ? characters : undefined,
    emotion: emotion || undefined,
    speakingCharacter,
  };
}

const ALT_BG: Record<BackgroundKind, BackgroundKind[]> = {
  waves: ['starfield', 'bokeh'],
  starfield: ['aurora', 'rain'],
  grid: ['geo', 'starfield'],
  bokeh: ['aurora', 'geo'],
  sunset: ['aurora', 'waves'],
  aurora: ['bokeh', 'starfield'],
  geo: ['aurora', 'grid'],
  rain: ['starfield', 'aurora'],
  particles: ['bokeh', 'starfield'],
  matrix: ['grid', 'geo'],
  nebula: ['starfield', 'mist'],
  horizon: ['sunset', 'waves'],
  mist: ['aurora', 'bokeh'],
};

export function buildScenes(script: string, wpm: number, basePalette: number): Scene[] {
  const scenes = splitText(script).map((t, i) => makeScene(t, i, wpm, basePalette));
  // avoid two identical looks back-to-back: keep the content motif, vary the backdrop
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1];
    const cur = scenes[i];
    if (prev.bg === cur.bg && prev.motif === cur.motif) {
      const alts = ALT_BG[cur.bg];
      cur.bg = alts[i % alts.length];
    }
  }
  return scenes;
}

export function randomizeScene(scene: Scene): Scene {
  const rng = mulberry32(Math.floor(Math.random() * 1e9));
  const motifs: MotifKind[] = ['none', 'none', 'forest', 'city', 'mountains', 'space', 'ocean', 'hearts', 'snow', 'embers', 'clouds'];
  return {
    ...scene,
    id: uid(),
    bg: pick(rng, BG_CYCLE),
    motif: pick(rng, motifs),
    palette: Math.floor(rng() * PALETTES.length),
    textAnim: pick(rng, ANIMS),
    camera: pick(rng, CAMERAS),
    dimension: '3d',
  };
}

export function retimeScenes(scenes: Scene[], wpm: number): Scene[] {
  return scenes.map((s) => (s.locked ? s : { ...s, duration: computeDuration(s.text, wpm) }));
}

export const DEMO_TITLE = 'The Keeper of Falling Stars';
export const DEMO_SCRIPT = `Every night, the old lighthouse keeper climbed two hundred and twelve steps to light the lamp.
The sea below was restless, and the ships far out needed a reason to believe in the shore.
One winter, the stars began to fall — slow as snow — and land in the water like coins.
She rowed out in her small boat and gathered them, one by one, into a glass jar.
By morning, the city on the far hill glowed brighter than it ever had.
And when people asked where the light came from, she simply pointed at the sky.`;

export function createProject(title = DEMO_TITLE, script = DEMO_SCRIPT): Project {
  const now = Date.now();
  const wpm = 165;
  const basePalette = 0;
  return {
    id: uid(),
    title,
    script,
    scenes: buildScenes(script, wpm, basePalette),
    aspect: '16:9',
    music: 'dreamy',
    musicVolume: 0.55,
    transition: 'fade',
    font: 'display',
    wpm,
    introCard: true,
    outroCard: true,
    quality: 'high',
    basePalette,
    narrationVoice: '',
    narrationRate: 1,
    narrationPitch: 1,
    beatSync: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function blankProject(): Project {
  const p = createProject('Untitled story', '');
  p.music = 'none';
  return p;
}
