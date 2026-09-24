export type RuntimeAssetKind = 'character' | 'environment' | 'prop' | 'vehicle';

export interface RuntimeAsset {
  id: string;
  label: string;
  kind: RuntimeAssetKind;
  modelUrl: string;
  sourceUrl: string;
  license: string;
  tags: string[];
  targetSize?: number;
}

const KAYKIT_ADVENTURES = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf';
const KAYKIT_SKELETONS = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf';
const KAYKIT_CITY = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/addons/kaykit_city_builder_bits/Assets/gltf';
const KAYKIT_DUNGEON = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/main/addons/kaykit_dungeon_remastered/Assets/gltf';
const KAYKIT_SPACE = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0/main/addons/kaykit_space_base_bits/Assets/gltf';

const LEGACY_MIRROR = 'https://raw.githubusercontent.com/Station-Sciences/bot-crossing/main/public/assets';
const QUATERNIUS_MIRROR = 'https://raw.githubusercontent.com/Seyamalam/blood-league-kickoff/main/public/assets/vendor/quaternius';

export const RUNTIME_ASSETS: Record<string, RuntimeAsset> = {
  'quaternius-hero': {
    id: 'quaternius-hero', label: 'Quaternius Human Hero', kind: 'character',
    modelUrl: QUATERNIUS_MIRROR + '/night-striker.glb',
    sourceUrl: 'https://quaternius.com/packs/universalbasecharacters.html', license: 'CC0 1.0',
    tags: ['human', 'character', 'hero', 'quaternius'],
  },
  'quaternius-animations': {
    id: 'quaternius-animations', label: 'Quaternius Universal Animation Library', kind: 'character',
    modelUrl: QUATERNIUS_MIRROR + '/universal-animation-library.glb',
    sourceUrl: 'https://quaternius.com/packs/universalanimationlibrary.html', license: 'CC0 1.0',
    tags: ['animation', 'humanoid', 'quaternius'],
  },
  'kaykit-crew': {
    id: 'kaykit-crew', label: 'KayKit Crew', kind: 'character',
    modelUrl: LEGACY_MIRROR + '/crew.glb',
    sourceUrl: 'https://kaylousberg.itch.io/kaykit-character-animations', license: 'CC0 1.0',
    tags: ['human', 'character', 'humanoid', 'animation', 'worker'],
  },
  'kaykit-knight': {
    id: 'kaykit-knight', label: 'KayKit Knight', kind: 'character',
    modelUrl: KAYKIT_ADVENTURES + '/Knight.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', license: 'CC0 1.0',
    tags: ['knight', 'warrior', 'soldier', 'guard', 'fighter'],
  },
  'kaykit-mage': {
    id: 'kaykit-mage', label: 'KayKit Mage', kind: 'character',
    modelUrl: KAYKIT_ADVENTURES + '/Mage.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', license: 'CC0 1.0',
    tags: ['wizard', 'mage', 'sorcerer', 'necromancer', 'priest'],
  },
  'kaykit-rogue': {
    id: 'kaykit-rogue', label: 'KayKit Rogue', kind: 'character',
    modelUrl: KAYKIT_ADVENTURES + '/Rogue.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', license: 'CC0 1.0',
    tags: ['rogue', 'thief', 'adventurer', 'scout'],
  },
  'kaykit-barbarian': {
    id: 'kaykit-barbarian', label: 'KayKit Barbarian', kind: 'character',
    modelUrl: KAYKIT_ADVENTURES + '/Barbarian.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', license: 'CC0 1.0',
    tags: ['barbarian', 'warrior', 'fighter'],
  },
  'kaykit-hooded-rogue': {
    id: 'kaykit-hooded-rogue', label: 'KayKit Hooded Rogue', kind: 'character',
    modelUrl: KAYKIT_ADVENTURES + '/Rogue_Hooded.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', license: 'CC0 1.0',
    tags: ['rogue', 'hooded', 'pirate', 'thief'],
  },
  'kaykit-skeleton-warrior': {
    id: 'kaykit-skeleton-warrior', label: 'KayKit Skeleton Warrior', kind: 'character',
    modelUrl: KAYKIT_SKELETONS + '/Skeleton_Warrior.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0', license: 'CC0 1.0',
    tags: ['skeleton', 'undead', 'warrior', 'fighter', 'monster'],
  },
  'kaykit-skeleton-mage': {
    id: 'kaykit-skeleton-mage', label: 'KayKit Skeleton Mage', kind: 'character',
    modelUrl: KAYKIT_SKELETONS + '/Skeleton_Mage.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0', license: 'CC0 1.0',
    tags: ['skeleton', 'undead', 'mage', 'wizard', 'monster'],
  },
  'kaykit-skeleton-rogue': {
    id: 'kaykit-skeleton-rogue', label: 'KayKit Skeleton Rogue', kind: 'character',
    modelUrl: KAYKIT_SKELETONS + '/Skeleton_Rogue.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0', license: 'CC0 1.0',
    tags: ['skeleton', 'undead', 'rogue', 'thief', 'monster'],
  },
  'kaykit-skeleton-minion': {
    id: 'kaykit-skeleton-minion', label: 'KayKit Skeleton Minion', kind: 'character',
    modelUrl: KAYKIT_SKELETONS + '/Skeleton_Minion.glb',
    sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0', license: 'CC0 1.0',
    tags: ['skeleton', 'undead', 'minion', 'monster', 'ghost'],
  },
  'kaykit-forest': {
    id: 'kaykit-forest', label: 'KayKit Forest Nature', kind: 'environment',
    modelUrl: LEGACY_MIRROR + '/forest.glb',
    sourceUrl: 'https://kaylousberg.itch.io/kaykit-forest-nature', license: 'CC0 1.0',
    tags: ['forest', 'woods', 'trees', 'nature', 'jungle'], targetSize: 16,
  },
  'kenney-nature': {
    id: 'kenney-nature', label: 'Kenney Nature', kind: 'environment',
    modelUrl: LEGACY_MIRROR + '/nature.glb',
    sourceUrl: 'https://kenney.nl/assets/nature-kit', license: 'CC0',
    tags: ['nature', 'mountains', 'rocks', 'plants'], targetSize: 16,
  },
  'kaykit-space-base': {
    id: 'kaykit-space-base', label: 'KayKit Space Base', kind: 'environment',
    modelUrl: LEGACY_MIRROR + '/spacebase.glb',
    sourceUrl: 'https://kaylousberg.itch.io/space-base-bits', license: 'CC0 1.0',
    tags: ['space', 'station', 'sci-fi', 'spaceship', 'future'], targetSize: 16,
  },
  'kaykit-city-building-a': {
    id: 'kaykit-city-building-a', label: 'KayKit City Building A', kind: 'environment',
    modelUrl: KAYKIT_CITY + '/building_A.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'street', 'building', 'town'], targetSize: 7,
  },
  'kaykit-city-building-b': {
    id: 'kaykit-city-building-b', label: 'KayKit City Building B', kind: 'environment',
    modelUrl: KAYKIT_CITY + '/building_B.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'street', 'building', 'town'], targetSize: 7,
  },
  'kaykit-city-building-c': {
    id: 'kaykit-city-building-c', label: 'KayKit City Building C', kind: 'environment',
    modelUrl: KAYKIT_CITY + '/building_C.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'street', 'building', 'town'], targetSize: 7,
  },
  'kaykit-city-road': {
    id: 'kaykit-city-road', label: 'KayKit City Road', kind: 'environment',
    modelUrl: KAYKIT_CITY + '/road_straight.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'road', 'street'], targetSize: 7,
  },
  'kaykit-city-taxi': {
    id: 'kaykit-city-taxi', label: 'KayKit City Taxi', kind: 'vehicle',
    modelUrl: KAYKIT_CITY + '/car_taxi.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'car', 'taxi', 'vehicle'], targetSize: 2.5,
  },
  'kaykit-city-streetlight': {
    id: 'kaykit-city-streetlight', label: 'KayKit Streetlight', kind: 'prop',
    modelUrl: KAYKIT_CITY + '/streetlight.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',
    license: 'CC0 1.0', tags: ['city', 'street', 'streetlight', 'prop'], targetSize: 3.5,
  },
  'kaykit-dungeon-floor': {
    id: 'kaykit-dungeon-floor', label: 'KayKit Dungeon Floor', kind: 'environment',
    modelUrl: KAYKIT_DUNGEON + '/floor_tile_large.gltf.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'floor', 'crypt', 'castle'], targetSize: 7,
  },
  'kaykit-dungeon-wall': {
    id: 'kaykit-dungeon-wall', label: 'KayKit Dungeon Wall', kind: 'environment',
    modelUrl: KAYKIT_DUNGEON + '/wall.gltf.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'wall', 'crypt', 'castle'], targetSize: 6,
  },
  'kaykit-dungeon-doorway': {
    id: 'kaykit-dungeon-doorway', label: 'KayKit Dungeon Doorway', kind: 'environment',
    modelUrl: KAYKIT_DUNGEON + '/wall_doorway.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'door', 'castle', 'ruins'], targetSize: 6,
  },
  'kaykit-dungeon-barrel': {
    id: 'kaykit-dungeon-barrel', label: 'KayKit Dungeon Barrel', kind: 'prop',
    modelUrl: KAYKIT_DUNGEON + '/barrel_large.gltf.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'barrel', 'tavern', 'prop'], targetSize: 2,
  },
  'kaykit-dungeon-chest': {
    id: 'kaykit-dungeon-chest', label: 'KayKit Dungeon Chest', kind: 'prop',
    modelUrl: KAYKIT_DUNGEON + '/chest.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'chest', 'treasure', 'prop'], targetSize: 1.8,
  },
  'kaykit-dungeon-torch': {
    id: 'kaykit-dungeon-torch', label: 'KayKit Dungeon Torch', kind: 'prop',
    modelUrl: KAYKIT_DUNGEON + '/torch_lit.gltf.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'torch', 'fire', 'prop'], targetSize: 2.2,
  },
  'kaykit-dungeon-stairs': {
    id: 'kaykit-dungeon-stairs', label: 'KayKit Dungeon Stairs', kind: 'environment',
    modelUrl: KAYKIT_DUNGEON + '/stairs.gltf.glb', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0',
    license: 'CC0 1.0', tags: ['dungeon', 'stairs', 'castle'], targetSize: 5,
  },
  'kaykit-space-module': {
    id: 'kaykit-space-module', label: 'KayKit Space Base Module', kind: 'environment',
    modelUrl: KAYKIT_SPACE + '/basemodule_A.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0',
    license: 'CC0 1.0', tags: ['space', 'station', 'module', 'sci-fi'], targetSize: 7,
  },
  'kaykit-space-truck': {
    id: 'kaykit-space-truck', label: 'KayKit Space Truck', kind: 'vehicle',
    modelUrl: KAYKIT_SPACE + '/spacetruck.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0',
    license: 'CC0 1.0', tags: ['space', 'vehicle', 'truck', 'sci-fi'], targetSize: 3.2,
  },
  'kaykit-space-rock': {
    id: 'kaykit-space-rock', label: 'KayKit Space Rock', kind: 'prop',
    modelUrl: KAYKIT_SPACE + '/rock_A.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0',
    license: 'CC0 1.0', tags: ['space', 'rock', 'planet', 'prop'], targetSize: 3,
  },
  'kaykit-space-solar': {
    id: 'kaykit-space-solar', label: 'KayKit Solar Panel', kind: 'prop',
    modelUrl: KAYKIT_SPACE + '/solarpanel.gltf', sourceUrl: 'https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0',
    license: 'CC0 1.0', tags: ['space', 'solar', 'station', 'prop'], targetSize: 2.7,
  },
};

export const SOURCE_CATALOG = [
  { id: 'quaternius', label: 'Quaternius', license: 'CC0 1.0', sourceUrl: 'https://quaternius.com/', scope: 'Characters, animals, animations, environments, props and vehicles' },
  { id: 'kaykit', label: 'KayKit', license: 'CC0 1.0', sourceUrl: 'https://kaylousberg.itch.io/', scope: 'Humanoids, animations, RPG, dungeon, city, nature, space and props' },
  { id: 'kenney', label: 'Kenney', license: 'CC0', sourceUrl: 'https://kenney.nl/assets', scope: 'Characters, vehicles, environment kits, nature and props' },
  { id: 'polyhaven', label: 'Poly Haven', license: 'CC0', sourceUrl: 'https://polyhaven.com/', scope: 'Realistic HDRIs, materials and models' },
  { id: 'opengameart-cc0', label: 'OpenGameArt CC0', license: 'CC0 per marked asset', sourceUrl: 'https://opengameart.org/content/3d-assets-cc0', scope: 'Community CC0 characters, creatures, props and environments' },
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
