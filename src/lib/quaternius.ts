import type { ActionKind } from './types';

const RUNTIME_MIRROR = 'https://raw.githubusercontent.com/Seyamalam/blood-league-kickoff/main/public/assets/vendor/quaternius';

export const QUATERNIUS_ASSETS = {
  hero: {
    id: 'quaternius-universal-base-hero',
    label: 'Quaternius Human Hero',
    modelUrl: `${RUNTIME_MIRROR}/night-striker.glb`,
    sourceUrl: 'https://quaternius.com/packs/universalbasecharacters.html',
    license: 'CC0 1.0',
  },
  animations: {
    id: 'quaternius-universal-animation-library',
    label: 'Quaternius Universal Animation Library',
    modelUrl: `${RUNTIME_MIRROR}/universal-animation-library.glb`,
    sourceUrl: 'https://quaternius.com/packs/universalanimationlibrary.html',
    license: 'CC0 1.0',
  },
} as const;

export const QUATERNIUS_CLIP_CANDIDATES: Record<ActionKind, string[]> = {
  idle: ['Idle_Loop', 'Idle'],
  walk: ['Walk_Loop', 'Walk', 'Jog_Fwd_Loop'],
  run: ['Sprint_Fwd_Loop', 'Sprint_Loop', 'Sprint', 'Jog_Fwd_Loop'],
  jump: ['Jump_Loop', 'Jump_Start', 'Jump_Land'],
  wave: ['Wave_Loop', 'Wave', 'Interact', 'Idle_Talking_Loop'],
  fight: ['Punch_Cross', 'Punch_Jab', 'Sword_Attack', 'Attack', 'Interact'],
  dance: ['Dance_Loop', 'Dance'],
  sit: ['Sitting_Idle', 'Sitting_Enter', 'Sitting_Talking'],
  point: ['Point', 'Pointing', 'Interact', 'Idle_Loop'],
  look: ['Look', 'Idle_Loop'],
  kneel: ['Fixing_Kneeling', 'Kneeling', 'Sitting_Enter'],
  reach: ['Reach', 'Interact', 'Idle_Loop'],
  talk: ['Idle_Talking_Loop', 'Sitting_Talking', 'Talk', 'Interact'],
};

export function isQuaterniusCharacterLabel(value: string | undefined): boolean {
  const text = String(value || '').toLowerCase();
  return /\b(quaternius|human|person|people|man|woman|boy|girl|hero|villager|soldier|guard|knight|wizard|worker|captain|pirate)\b/.test(text);
}
