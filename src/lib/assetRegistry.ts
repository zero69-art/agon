export type RuntimeAssetKind = 'character' | 'environment';

export interface RuntimeAsset {
  id: string;
  label: string;
  kind: RuntimeAssetKind;
  modelUrl: string;
  sourceUrl: string;
  license: string;
  tags: string[];
}

const KAYKIT_MIRROR = 'https://raw.githubusercontent.com/Station-Sciences/bot-crossing/main/public/assets';

export const RUNTIME_ASSETS: Record<string, RuntimeAsset> = {
  'kaykit-crew': {
    id: 'kaykit-crew',
    label: 'KayKit Crew',
    kind: 'character',
    modelUrl: KAYKIT_MIRROR + '/crew.glb',
    sourceUrl: 'https://kaylousberg.itch.io/kaykit-character-animations',
    license: 'CC0 1.0',
    tags: ['human', 'character', 'humanoid', 'animation', 'adventurer', 'worker'],
  },
  'kaykit-forest': {
    id: 'kaykit-forest',
    label: 'KayKit Forest Nature',
    kind: 'environment',
    modelUrl: KAYKIT_MIRROR + '/forest.glb',
    sourceUrl: 'https://kaylousberg.itch.io/kaykit-forest-nature',
    license: 'CC0 1.0',
    tags: ['forest', 'woods', 'trees', 'nature', 'jungle'],
  },
  'kenney-nature': {
    id: 'kenney-nature',
    label: 'Kenney Nature',
    kind: 'environment',
    modelUrl: KAYKIT_MIRROR + '/nature.glb',
    sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0',
    tags: ['nature', 'mountains', 'forest', 'rocks', 'plants'],
  },
  'kaykit-space-base': {
    id: 'kaykit-space-base',
    label: 'KayKit Space Base',
    kind: 'environment',
    modelUrl: KAYKIT_MIRROR + '/spacebase.glb',
    sourceUrl: 'https://kaylousberg.itch.io/space-base-bits',
    license: 'CC0 1.0',
    tags: ['space', 'station', 'sci-fi', 'spaceship', 'future'],
  },
};

export const SOURCE_CATALOG = [
  {
    id: 'quaternius',
    label: 'Quaternius',
    license: 'CC0 1.0',
    sourceUrl: 'https://quaternius.com/',
    scope: 'Characters, animals, animations, environments, props and vehicles',
  },
  {
    id: 'kaykit',
    label: 'KayKit',
    license: 'CC0 1.0',
    sourceUrl: 'https://kaylousberg.itch.io/',
    scope: 'Humanoids, animations, RPG, dungeon, city, nature, space and props',
  },
  {
    id: 'kenney',
    label: 'Kenney',
    license: 'CC0 1.0',
    sourceUrl: 'https://kenney.nl/assets',
    scope: 'Characters, vehicles, environment kits, nature and props',
  },
  {
    id: 'polyhaven',
    label: 'Poly Haven',
    license: 'CC0',
    sourceUrl: 'https://polyhaven.com/',
    scope: 'Realistic HDRIs, materials and models',
  },
  {
    id: 'opengameart-cc0',
    label: 'OpenGameArt CC0',
    license: 'CC0 per marked asset',
    sourceUrl: 'https://opengameart.org/content/3d-assets-cc0',
    scope: 'Community CC0 characters, creatures, props and environments',
  },
] as const;

export function getRuntimeAsset(id: string | undefined): RuntimeAsset | undefined {
  return id ? RUNTIME_ASSETS[id] : undefined;
}

export function findRuntimeAsset(tag: string, kind?: RuntimeAssetKind): RuntimeAsset | undefined {
  const wanted = tag.toLowerCase();
  return Object.values(RUNTIME_ASSETS).find(
    (asset) => (!kind || asset.kind === kind) && asset.tags.some((item) => item === wanted),
  );
}
