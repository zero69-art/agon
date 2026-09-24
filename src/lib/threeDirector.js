import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { isQuaterniusCharacterLabel, QUATERNIUS_ASSETS, QUATERNIUS_CLIP_CANDIDATES } from './quaternius';
import { RUNTIME_ASSETS } from './assetRegistry';

const paletteSets = [
  ['#101726', '#64d8ff', '#ff8a65', '#ece7d5'],
  ['#1a0f12', '#ff754e', '#ffd166', '#fff1e4'],
  ['#0d1c16', '#9be28f', '#77c7ff', '#efffe8'],
  ['#111225', '#bba7ff', '#6ce5e9', '#f7f2ff'],
  ['#20151a', '#ff8db8', '#f5c77b', '#fff1f6'],
  ['#121212', '#efefef', '#8b8b8b', '#ffffff'],
  ['#17110c', '#ffbf69', '#70d6ff', '#fff8ed'],
  ['#0d1521', '#5ee7df', '#b490ff', '#eefbff'],
];

function colorFor(index, slot) {
  return paletteSets[index % paletteSets.length][slot % 4];
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function ease(v) {
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

function words(text) {
  return text.toLowerCase().split(/\s+/);
}

let quaterniusAssetsPromise = null;
let quaterniusAssets = null;
let runtimeAssetsPromise = null;
const runtimeAssets = new Map();

async function loadQuaterniusAssets() {
  if (quaterniusAssets) return quaterniusAssets;
  if (quaterniusAssetsPromise) return quaterniusAssetsPromise;
  const loader = new GLTFLoader();
  quaterniusAssetsPromise = Promise.all([
    loader.loadAsync(QUATERNIUS_ASSETS.hero.modelUrl),
    loader.loadAsync(QUATERNIUS_ASSETS.animations.modelUrl),
  ])
    .then(([hero, animationLibrary]) => {
      quaterniusAssets = {
        hero: hero.scene,
        clips: animationLibrary.animations || [],
      };
      return quaterniusAssets;
    })
    .catch((error) => {
      quaterniusAssetsPromise = null;
      throw error;
    });
  return quaterniusAssetsPromise;
}

async function loadRuntimeAssets() {
  if (runtimeAssets.size) return runtimeAssets;
  if (runtimeAssetsPromise) return runtimeAssetsPromise;
  const loader = new GLTFLoader();
  runtimeAssetsPromise = Promise.all(
    Object.values(RUNTIME_ASSETS).map(async (definition) => {
      try {
        const gltf = await loader.loadAsync(definition.modelUrl);
        runtimeAssets.set(definition.id, {
          definition,
          scene: gltf.scene,
          clips: gltf.animations || [],
        });
      } catch {
        // External runtime assets are optional; the procedural fallback remains active.
      }
    }),
  ).then(() => runtimeAssets);
  return runtimeAssetsPromise;
}

async function loadAll3DAssets() {
  await Promise.allSettled([loadQuaterniusAssets(), loadRuntimeAssets()]);
  return { quaternius: quaterniusAssets, runtime: runtimeAssets };
}

function inferSpecies(text, fallback) {
  const t = text.toLowerCase();
  if (/\bfox\b|\bvixen\b/.test(t)) return 'fox';
  if (/\bbear\b/.test(t)) return 'bear';
  if (/\bowl\b/.test(t)) return 'owl';
  if (/\brobot\b|\bandroid\b|\bmachine\b/.test(t)) return 'robot';
  if (/\brabbit\b|\bbunny\b/.test(t)) return 'rabbit';
  return fallback;
}

function inferAction(text) {
  const t = text.toLowerCase();
  if (/\b(?:run|runs|running|ran|chase|chases|chased|sprint|sprints|sprinted)\b/.test(t)) return 'run';
  if (/\b(?:jump|jumps|jumped|leap|leaps|leapt|hopped|hops)\b/.test(t)) return 'jump';
  if (/\b(?:wave|waves|waved|hello|beckon|beckons|greeted|greet|signaled|signal)\b/.test(t)) return 'wave';
  if (/\b(?:fight|fights|attack|attacks|punch|punches|battle|battles)\b/.test(t)) return 'fight';
  if (/\b(?:dance|dances|danced|twirl|twirls)\b/.test(t)) return 'dance';
  if (/\b(?:sit|sits|sat|seated)\b/.test(t)) return 'sit';
  if (/\b(?:kneel|kneels|kneeling)\b/.test(t)) return 'kneel';
  if (/\b(?:point|points|pointing|gesture|gestures)\b/.test(t)) return 'point';
  if (/\b(?:reach|reaches|reaching|grab|grabs|grabbed|gather|gathered|held|hold|holds|open|opened|pull|pulled|push|pushed)\b/.test(t)) return 'reach';
  if (/\b(?:look|looks|looked|stare|stares|watched|watch|watches|gaze|gazes|noticed|noticed)\b/.test(t)) return 'look';
  if (/\b(?:talk|talks|speaks|says|asks|replies|whispers|shouts|calls)\b/.test(t)) return 'talk';
  if (/\b(?:walk|walks|walking|walked|approach|approaches|approached|steps|stepped|climb|climbed|row|rowed|sailed|crossed|entered|followed)\b/.test(t)) return 'walk';
  return 'idle';
}


function speciesFromCharacter(value, fallback) {
  const t = String(value || '').toLowerCase();
  if (/\b(?:fox|vixen)\b/.test(t)) return 'fox';
  if (/\bbear\b/.test(t)) return 'bear';
  if (/\bowl\b/.test(t)) return 'owl';
  if (/\b(?:rabbit|bunny)\b/.test(t)) return 'rabbit';
  if (/\b(?:robot|android|machine)\b/.test(t)) return 'robot';
  return fallback;
}

function inferEmotion(text, explicit) {
  const value = String(explicit || '').trim().toLowerCase();
  if (value) return value;
  const t = text.toLowerCase();
  if (/\b(angry|furious|rage|shouts|attacks)\b/.test(t)) return 'angry';
  if (/\b(sad|cries|tearful|grief|lonely)\b/.test(t)) return 'sad';
  if (/\b(happy|laugh|laughs|joy|smiles|excited)\b/.test(t)) return 'happy';
  if (/\b(surprised|shock|gasps|stunned)\b/.test(t)) return 'surprised';
  if (/\b(afraid|fear|scared|terrified|nervous)\b/.test(t)) return 'afraid';
  return 'neutral';
}

function parseDialogue(text) {
  const m = text.match(/^\s*([^:]{1,32}):\s*(.+)$/s);
  return m ? { speaker: m[1].trim(), line: m[2].trim() } : { speaker: '', line: '' };
}

function makeMaterial(THREE, color, roughness = 0.8, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(THREE, geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeActor(THREE, species, index, paletteIndex) {
  const root = new THREE.Group();
  root.name = species + '-actor-' + index;

  const coat = makeMaterial(THREE, colorFor(paletteIndex, index === 0 ? 1 : 2));
  const dark = makeMaterial(THREE, index === 0 ? '#1b1720' : '#18202a');
  const accent = makeMaterial(THREE, colorFor(paletteIndex + index, 2));
  const white = makeMaterial(THREE, '#f7f3eb', 0.65);
  const black = makeMaterial(THREE, '#07090d', 0.45);

  const rig = new THREE.Group();
  root.add(rig);

  const body = mesh(THREE, new THREE.CapsuleGeometry(0.38, 0.75, 6, 14), coat);
  body.position.y = 1.28;
  rig.add(body);

  const belly = mesh(THREE, new THREE.SphereGeometry(0.3, 20, 14), white);
  belly.scale.set(0.95, 1.25, 0.65);
  belly.position.set(0, 1.2, 0.32);
  rig.add(belly);

  const head = new THREE.Group();
  head.position.y = 2.08;
  rig.add(head);

  const headMesh = mesh(THREE, new THREE.SphereGeometry(0.5, 24, 18), coat);
  headMesh.scale.set(1.02, 0.94, 0.98);
  head.add(headMesh);

  const eyeL = mesh(THREE, new THREE.SphereGeometry(0.075, 12, 10), white);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18, 0.04, 0.44);
  eyeR.position.set(0.18, 0.04, 0.44);
  head.add(eyeL, eyeR);

  const pupilL = mesh(THREE, new THREE.SphereGeometry(0.035, 10, 8), black);
  const pupilR = pupilL.clone();
  pupilL.position.set(-0.18, 0.04, 0.505);
  pupilR.position.set(0.18, 0.04, 0.505);
  head.add(pupilL, pupilR);

  const browL = mesh(THREE, new THREE.BoxGeometry(0.13, 0.025, 0.025), dark);
  const browR = browL.clone();
  browL.position.set(-0.18, 0.16, 0.465);
  browR.position.set(0.18, 0.16, 0.465);
  browL.rotation.z = 0.08;
  browR.rotation.z = -0.08;
  head.add(browL, browR);

  const mouth = mesh(THREE, new THREE.BoxGeometry(0.18, 0.035, 0.025), dark);
  mouth.position.set(0, -0.19, 0.46);
  head.add(mouth);

  const nose = mesh(THREE, new THREE.SphereGeometry(0.055, 12, 8), dark);
  nose.position.set(0, -0.04, 0.5);
  head.add(nose);

  const earL = mesh(
    THREE,
    new THREE.ConeGeometry(species === 'owl' ? 0.14 : 0.18, species === 'owl' ? 0.18 : 0.42, 4),
    accent,
  );
  const earR = earL.clone();
  earL.position.set(-0.28, 0.43, 0);
  earR.position.set(0.28, 0.43, 0);
  earL.rotation.z = -0.18;
  earR.rotation.z = 0.18;
  head.add(earL, earR);

  if (species === 'robot') {
    headMesh.scale.set(0.95, 0.82, 0.92);
    const antenna = mesh(THREE, new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), accent);
    antenna.position.y = 0.42;
    head.add(antenna);
    const bulb = mesh(THREE, new THREE.SphereGeometry(0.06, 12, 8), accent);
    bulb.position.y = 0.57;
    head.add(bulb);
  }

  if (species === 'fox' || species === 'rabbit') {
    const muzzle = mesh(THREE, new THREE.SphereGeometry(0.2, 16, 12), white);
    muzzle.scale.set(1.15, 0.75, 0.75);
    muzzle.position.set(0, -0.1, 0.43);
    head.add(muzzle);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.95, -0.36);
    rig.add(tailPivot);
    const tail = mesh(THREE, new THREE.ConeGeometry(0.16, 0.78, 10), coat);
    tail.rotation.x = Math.PI / 2;
    tail.rotation.z = -0.35;
    tail.position.z = -0.35;
    tailPivot.add(tail);
    root.userData.tailPivot = tailPivot;
  }

  const hip = new THREE.Group();
  hip.position.y = 0.88;
  rig.add(hip);

  function limb(x, y, z, side, arm) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const upper = mesh(
      THREE,
      new THREE.CapsuleGeometry(arm ? 0.1 : 0.115, arm ? 0.42 : 0.5, 5, 10),
      arm ? dark : accent,
    );
    upper.position.y = arm ? -0.22 : -0.26;
    g.add(upper);
    if (arm) {
      const hand = mesh(THREE, new THREE.SphereGeometry(0.115, 12, 10), coat);
      hand.position.y = -0.48;
      g.add(hand);
    } else {
      const foot = mesh(THREE, new THREE.SphereGeometry(0.14, 12, 10), dark);
      foot.scale.set(1.1, 0.55, 1.5);
      foot.position.set(0, -0.55, 0.04);
      g.add(foot);
    }
    rig.add(g);
    return g;
  }

  const armL = limb(-0.44, 1.54, 0, -1, true);
  const armR = limb(0.44, 1.54, 0, 1, true);
  const legL = limb(-0.2, 0.9, 0, -1, false);
  const legR = limb(0.2, 0.9, 0, 1, false);

  root.userData = {
    rig,
    body,
    head,
    mouth,
    eyeL,
    eyeR,
    pupilL,
    pupilR,
    browL,
    browR,
    armL,
    armR,
    legL,
    legR,
    tailPivot: root.userData.tailPivot || null,
    phase: index * 1.7,
    species,
    baseX: index === 0 ? -1.05 : 1.05,
  };

  return root;
}

function pickQuaterniusClip(action) {
  const clips = quaterniusAssets?.clips || [];
  const candidates = QUATERNIUS_CLIP_CANDIDATES[action] || QUATERNIUS_CLIP_CANDIDATES.idle;
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = candidates.map(normalize);
  return clips.find((clip) => {
    const n = normalize(clip.name);
    return names.some((candidate) => n === candidate || n.includes(candidate) || candidate.includes(n));
  }) || clips[0] || null;
}

function findBone(root, names) {
  let match = null;
  const wanted = names.map((value) => String(value).toLowerCase());
  root.traverse((node) => {
    if (match || !node.isBone) return;
    const lower = node.name.toLowerCase();
    if (wanted.some((name) => lower.includes(name))) match = node;
  });
  return match;
}

function makeKayKitActor(index) {
  const entry = runtimeAssets.get('kaykit-crew');
  if (!entry?.scene) return null;
  const root = new THREE.Group();
  root.name = 'kaykit-crew-' + index;
  const model = normalizeExternalModel(THREE, entry.scene, 3);
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  root.userData = {
    kaykit: true,
    model,
    clips: entry.clips || [],
    mixer,
    activeAction: null,
    activeClip: '',
    phase: index * 0.72,
    headBone: findBone(model, ['head', 'neck']),
  };
  return root;
}

function pickKayKitClip(clips, action) {
  const list = clips || [];
  const candidates = KAYKIT_ACTION_CANDIDATES[action] || KAYKIT_ACTION_CANDIDATES.idle;
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = candidates.map(normalize);
  return list.find((clip) => {
    const n = normalize(clip.name);
    return names.some((candidate) => n === candidate || n.includes(candidate) || candidate.includes(n));
  }) || list[0] || null;
}

function animateKayKitActor(actor, actorIndex, action, globalTime, speakingIndex, emotion) {
  const u = actor.userData;
  const clip = pickKayKitClip(u.clips, action);
  if (clip) {
    if (u.activeClip !== clip.name) {
      if (u.activeAction) u.activeAction.stop();
      const next = u.mixer.clipAction(clip);
      next.reset();
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.play();
      u.activeAction = next;
      u.activeClip = clip.name;
    }
    const duration = Math.max(0.001, clip.duration);
    u.mixer.setTime(((globalTime + u.phase) % duration + duration) % duration);
  }
  const speaking = speakingIndex === actorIndex;
  if (u.headBone) {
    u.headBone.rotation.y = (speaking ? 0.14 : actorIndex === 0 ? -0.05 : 0.05) + Math.sin(globalTime * 1.1 + u.phase) * 0.025;
    u.headBone.rotation.x = emotion === 'surprised' ? -0.04 : Math.sin(globalTime * 0.7 + u.phase) * 0.015;
  }
  actor.rotation.y = (actorIndex === 0 ? 0.12 : -0.15) + Math.sin(globalTime * 0.25 + u.phase) * 0.018;
}

function makeQuaterniusActor(index) {
  if (!quaterniusAssets?.hero) return null;
  const root = new THREE.Group();
  root.name = 'quaternius-human-' + index;
  const model = SkeletonUtils.clone(quaterniusAssets.hero);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const height = Math.max(0.001, size.y);
  const scale = 3 / height;
  model.scale.setScalar(scale);
  model.position.x -= center.x * scale;
  model.position.z -= center.z * scale;
  model.position.y -= box.min.y * scale;
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  root.userData = {
    quaternius: true,
    model,
    mixer,
    activeAction: null,
    activeClip: '',
    phase: index * 0.65,
    headBone: findBone(model, ['head', 'neck', 'mixamorighead']),
  };
  return root;
}

function animateQuaterniusActor(actor, actorIndex, action, globalTime, speakingIndex, emotion) {
  const u = actor.userData;
  const clip = pickQuaterniusClip(action);
  if (clip) {
    if (u.activeClip !== clip.name) {
      if (u.activeAction) u.activeAction.stop();
      const next = u.mixer.clipAction(clip);
      next.reset();
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.play();
      u.activeAction = next;
      u.activeClip = clip.name;
    }
    const duration = Math.max(0.001, clip.duration);
    u.mixer.setTime(((globalTime + u.phase) % duration + duration) % duration);
  }
  const speaking = speakingIndex === actorIndex;
  if (u.headBone) {
    u.headBone.rotation.y = (speaking ? 0.14 : actorIndex === 0 ? -0.05 : 0.05) + Math.sin(globalTime * 1.1 + u.phase) * 0.025;
    u.headBone.rotation.x = emotion === 'surprised' ? -0.04 : Math.sin(globalTime * 0.7 + u.phase) * 0.015;
  }
  actor.rotation.y = (actorIndex === 0 ? 0.12 : -0.15) + Math.sin(globalTime * 0.25 + u.phase) * 0.018;
}

const KAYKIT_ACTION_CANDIDATES = {
  idle: ['Idle', 'Idle_Loop', 'idle'],
  walk: ['Walking', 'Walk', 'Walk_Loop', 'Jog'],
  run: ['Running', 'Run', 'Sprint', 'Jog'],
  jump: ['Jump', 'Jump_Start'],
  wave: ['Waving', 'Wave', 'Emote_Wave'],
  fight: ['Punch', 'Attack', 'Sword', 'Melee'],
  dance: ['Dance', 'Dance_Loop'],
  sit: ['Sitting', 'Sit'],
  point: ['Point', 'Pointing'],
  look: ['Look', 'Idle'],
  kneel: ['Kneel', 'Kneeling'],
  reach: ['Interact', 'Reach', 'Work'],
  talk: ['Talk', 'Idle_Talking', 'Idle'],
};

function normalizeExternalModel(THREE, source, targetSize = 14) {
  const model = SkeletonUtils.clone(source);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / maxDimension;
  model.scale.setScalar(scale);
  model.position.x -= center.x * scale;
  model.position.y -= box.min.y * scale;
  model.position.z -= center.z * scale;
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return model;
}

function runtimeEnvironmentId(motif, explicit) {
  if (explicit && explicit !== 'auto' && explicit !== 'procedural') {
    if (explicit === 'kaykit-space') return 'kaykit-space-base';
    return explicit;
  }
  if (explicit === 'procedural') return '';
  if (motif === 'forest') return 'kaykit-forest';
  if (motif === 'space') return 'kaykit-space-base';
  if (motif === 'mountains') return 'kenney-nature';
  return '';
}

function addRuntimeEnvironment(THREE, motif, explicit) {
  const id = runtimeEnvironmentId(motif, explicit);
  const entry = id ? runtimeAssets.get(id) : null;
  if (!entry?.scene) return null;
  const model = normalizeExternalModel(THREE, entry.scene, 16);
  model.position.z = -5;
  model.userData.assetId = id;
  return model;
}

function addEnvironment(THREE, scene, motif, paletteIndex, explicitEnvironment) {
  const group = new THREE.Group();
  group.name = 'environment';

  const groundColor = colorFor(paletteIndex, 0);
  const floor = mesh(
    THREE,
    new THREE.PlaneGeometry(24, 24),
    makeMaterial(THREE, groundColor, 1),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  const accent = colorFor(paletteIndex, 1);
  const accent2 = colorFor(paletteIndex, 2);

  if (motif === 'forest') {
    for (let i = 0; i < 18; i++) {
      const x = -8 + (i % 6) * 3.1;
      const z = -3 - Math.floor(i / 6) * 2.6;
      const trunk = mesh(THREE, new THREE.CylinderGeometry(0.16, 0.23, 1.4, 8), makeMaterial(THREE, '#5b3b2b'));
      trunk.position.set(x, 0.7, z);
      const crown = mesh(THREE, new THREE.SphereGeometry(0.65, 12, 10), makeMaterial(THREE, accent));
      crown.position.set(x, 1.6, z);
      group.add(trunk, crown);
    }
  } else if (motif === 'city') {
    for (let i = 0; i < 12; i++) {
      const x = -8 + (i % 6) * 3;
      const z = -4 - Math.floor(i / 6) * 3;
      const height = 1.8 + (i % 4) * 0.7;
      const b = mesh(THREE, new THREE.BoxGeometry(1.5, height, 1.4), makeMaterial(THREE, i % 2 ? accent : accent2));
      b.position.set(x, height / 2, z);
      group.add(b);
    }
  } else if (motif === 'mountains') {
    for (let i = 0; i < 8; i++) {
      const x = -8 + i * 2.3;
      const mountain = mesh(THREE, new THREE.ConeGeometry(1.4 + (i % 3) * 0.4, 3 + (i % 2) * 1.5, 5), makeMaterial(THREE, accent2));
      mountain.position.set(x, 1.5, -5 - (i % 2) * 2);
      group.add(mountain);
    }
  } else if (motif === 'ocean') {
    const water = mesh(THREE, new THREE.PlaneGeometry(24, 16, 24, 16), makeMaterial(THREE, '#0a4560', 0.25, 0.15));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.06;
    group.add(water);
    for (let i = 0; i < 10; i++) {
      const wave = mesh(THREE, new THREE.TorusGeometry(0.6 + (i % 3) * 0.1, 0.035, 6, 20), makeMaterial(THREE, accent2));
      wave.rotation.x = Math.PI / 2;
      wave.position.set(-8 + i * 1.7, 0.03, -3 - (i % 3) * 1.7);
      group.add(wave);
    }
  } else if (motif === 'space') {
    const sphere = mesh(THREE, new THREE.SphereGeometry(2.2, 24, 18), makeMaterial(THREE, accent2, 0.95));
    sphere.position.set(-3, 4, -7);
    group.add(sphere);
    for (let i = 0; i < 50; i++) {
      const star = mesh(THREE, new THREE.SphereGeometry(0.025 + (i % 3) * 0.015, 6, 6), makeMaterial(THREE, '#ffffff', 0.7));
      star.position.set(-9 + ((i * 37) % 180) / 10, 2 + ((i * 17) % 80) / 10, -8 - (i % 5));
      group.add(star);
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const box = mesh(THREE, new THREE.BoxGeometry(0.7, 0.7, 0.7), makeMaterial(THREE, i % 2 ? accent : accent2));
      box.position.set(-8 + (i % 7) * 2.5, 0.35 + (i % 3) * 0.25, -4 - Math.floor(i / 7) * 2);
      box.rotation.set(0.2 * i, 0.35 * i, 0.15 * i);
      group.add(box);
    }
  }

  return group;
}

function disposeObject3D(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material?.dispose?.());
  });
}

export async function createThreeDirector(host, sceneCount = 1) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(Math.max(320, host.clientWidth), Math.max(180, host.clientHeight), false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, Math.max(1, host.clientWidth / Math.max(1, host.clientHeight)), 0.1, 100);
  camera.position.set(0, 3.4, 8.8);

  const scene3d = new THREE.Scene();
  scene3d.fog = new THREE.Fog('#0b0e15', 7, 28);

  const hemi = new THREE.HemisphereLight('#fff6e9', '#162032', 1.9);
  scene3d.add(hemi);

  const key = new THREE.DirectionalLight('#fff0da', 3.2);
  key.position.set(5, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  scene3d.add(key);

  const rim = new THREE.DirectionalLight('#7ec8ff', 2.2);
  rim.position.set(-6, 5, -7);
  scene3d.add(rim);

  let environment = null;
  let backdrop = null;
  let actors = [];
  let currentSignature = '';
  let lastW = 0;
  let lastH = 0;
  let outputSize = null;

  void loadAll3DAssets().then(() => {
    currentSignature = '';
    window.dispatchEvent(new Event('agon-three-assets-ready'));
  }).catch(() => {
    window.dispatchEvent(new Event('agon-three-assets-error'));
  });

  function resize() {
    const w = Math.max(320, outputSize?.w ?? host.clientWidth);
    const h = Math.max(180, outputSize?.h ?? host.clientHeight);
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setOutputSize(size) {
    if (!size) {
      outputSize = null;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      lastW = 0;
      lastH = 0;
      resize();
      return;
    }
    outputSize = { w: Math.max(320, Math.round(size.w)), h: Math.max(180, Math.round(size.h)) };
    renderer.setPixelRatio(1);
    lastW = 0;
    lastH = 0;
    resize();
  }

  function rebuild(project, currentScene) {
    const motif = currentScene?.motif || 'none';
    const paletteIndex = currentScene?.palette || project?.basePalette || 0;
    const environmentAsset = currentScene?.environmentAsset || 'auto';
    const signature = motif + ':' + paletteIndex + ':' + environmentAsset + ':' + (currentScene?.asset || 'auto') + ':' + (currentScene?.id || '') + ':' + (currentScene?.text || '') + ':' + (currentScene?.action || '') + ':' + (currentScene?.emotion || '') + ':' + (currentScene?.speakingCharacter || '') + ':' + JSON.stringify(currentScene?.characters || []) + ':' + sceneCount;
    if (signature === currentSignature) return;
    currentSignature = signature;

    if (environment) {
      scene3d.remove(environment);
      disposeObject3D(environment);
      environment = null;
    }
    if (backdrop) {
      scene3d.remove(backdrop);
      disposeObject3D(backdrop);
      backdrop = null;
    }
    actors.forEach((actor) => {
      scene3d.remove(actor);
      disposeObject3D(actor);
    });
    actors = [];

    environment = addEnvironment(THREE, scene3d, motif, paletteIndex, environmentAsset);
    const runtimeEnvironment = addRuntimeEnvironment(THREE, motif, environmentAsset);
    if (runtimeEnvironment) environment.add(runtimeEnvironment);
    scene3d.add(environment);

    const baseText = currentScene?.text || project?.script || '';
    const requested = Array.isArray(currentScene?.characters) ? currentScene.characters.filter(Boolean).slice(0, 2) : [];
    const s0 = requested[0] ? speciesFromCharacter(requested[0], 'human') : inferSpecies(baseText, 'human');
    const s1 = requested[1] ? speciesFromCharacter(requested[1], 'human') : inferSpecies(baseText, 'human');
    const assetMode = currentScene?.asset || 'auto';
    const requestedLabels = [requested[0], requested[1]];
    const useKayKit = assetMode === 'kaykit' || (assetMode === 'auto' && /\b(knight|mage|wizard|ranger|rogue|barbarian|druid|engineer|adventurer)\b/i.test(String(label || '')));
    const useQuaternius = assetMode !== 'procedural' && !useKayKit &&
      (assetMode === 'quaternius' || (assetMode === 'auto' && (species === 'human' || isQuaterniusCharacterLabel(label))));
    const makeSceneActor = (species, index, label) => {
      if (useKayKit) {
        const imported = makeKayKitActor(index);
        if (imported) return imported;
      }
      if (useQuaternius) {
        const imported = makeQuaterniusActor(index);
        if (imported) return imported;
      }
      return makeActor(THREE, species, index, paletteIndex);
    };

    actors = [
      makeSceneActor(s0, 0, requestedLabels[0] || ''),
      makeSceneActor(s1, 1, requestedLabels[1] || ''),
    ];

    actors[0].position.x = -1.1;
    actors[1].position.x = 1.1;
    actors[0].position.z = 0.3;
    actors[1].position.z = -0.2;
    actors[0].rotation.y = 0.12;
    actors[1].rotation.y = -0.15;

    actors.forEach((actor) => scene3d.add(actor));

    backdrop = new THREE.Mesh(
      new THREE.CircleGeometry(11, 64),
      new THREE.MeshBasicMaterial({ color: colorFor(paletteIndex, 0) }),
    );
    backdrop.rotation.x = -Math.PI / 2;
    backdrop.position.y = 0.01;
    backdrop.position.z = -9;
    scene3d.add(backdrop);
  }

  function animateActor(actor, actorIndex, action, local, globalTime, speakingIndex, emotion) {
    const u = actor.userData;
    const speed = action === 'run' ? 8.5 : action === 'walk' ? 5.0 : action === 'dance' ? 4.5 : action === 'fight' ? 7.5 : 2.4;
    const phase = globalTime * speed + u.phase;
    const speaking = speakingIndex === actorIndex;
    const stride = action === 'run' ? 0.65 : action === 'walk' ? 0.4 : 0.16;
    const bob = action === 'jump'
      ? Math.max(0, Math.sin(local * Math.PI * 2)) * 0.9
      : Math.abs(Math.sin(phase)) * 0.07;

    if (action === 'walk' || action === 'run') {
      u.legL.rotation.x = Math.sin(phase) * stride;
      u.legR.rotation.x = -Math.sin(phase) * stride;
      u.armL.rotation.x = -Math.sin(phase) * stride * 0.75;
      u.armR.rotation.x = Math.sin(phase) * stride * 0.75;
      actor.position.x += Math.sin(phase) * (action === 'run' ? 0.004 : 0.0015);
    } else {
      u.legL.rotation.x = Math.sin(phase) * 0.08;
      u.legR.rotation.x = -Math.sin(phase) * 0.08;
    }

    if (action === 'wave') {
      u.armR.rotation.z = -0.75 + Math.sin(globalTime * 8 + u.phase) * 0.18;
      u.armR.rotation.x = -0.35;
    } else if (action === 'fight') {
      u.armL.rotation.x = -1.25 + Math.sin(globalTime * 8) * 0.2;
      u.armR.rotation.x = -1.05 - Math.sin(globalTime * 9) * 0.2;
      actor.rotation.y += Math.sin(globalTime * 6 + u.phase) * 0.006;
    } else if (action === 'point') {
      u.armR.rotation.z = -0.45;
      u.armR.rotation.x = -0.85;
    } else if (action === 'reach') {
      u.armR.rotation.z = -0.25;
      u.armR.rotation.x = -0.7 + Math.sin(globalTime * 3 + u.phase) * 0.08;
      actor.position.z = -0.05 + Math.sin(globalTime * 1.6 + u.phase) * 0.12;
    } else if (action === 'kneel') {
      u.legL.rotation.x = -0.8;
      u.legR.rotation.x = 0.65;
      actor.position.y = 0.0;
    } else if (action === 'sit') {
      u.legL.rotation.x = -1.05;
      u.legR.rotation.x = -1.05;
      actor.position.y = -0.1;
    } else if (action === 'look') {
      u.head.rotation.y += Math.sin(globalTime * 1.2 + u.phase) * 0.25;
    } else if (action === 'talk') {
      u.armL.rotation.z = Math.sin(globalTime * 3.5 + u.phase) * 0.12;
      u.armR.rotation.z = -Math.sin(globalTime * 3.5 + u.phase) * 0.12;
    } else if (action === 'dance') {
      u.armL.rotation.z = 0.6 + Math.sin(phase) * 0.35;
      u.armR.rotation.z = -0.6 - Math.sin(phase) * 0.35;
      actor.rotation.z = Math.sin(phase * 0.5) * 0.08;
    } else {
      u.armL.rotation.z = 0.05;
      u.armR.rotation.z = -0.05;
    }

    actor.position.y = bob;
    u.rig.rotation.z = Math.sin(globalTime * 1.5 + u.phase) * 0.018;

    const look = speaking ? 0.16 : actorIndex === 0 ? -0.08 : 0.08;
    u.head.rotation.y = look + Math.sin(globalTime * 0.8 + u.phase) * 0.05;
    u.head.rotation.x = Math.sin(globalTime * 0.9 + u.phase) * 0.025;

    const blink = Math.sin(globalTime * 1.75 + u.phase);
    const blinkScale = blink > 0.94 ? 0.12 : 1;
    u.eyeL.scale.y = blinkScale;
    u.eyeR.scale.y = blinkScale;
    u.pupilL.scale.y = blinkScale;
    u.pupilR.scale.y = blinkScale;

    const mouthOpen = speaking ? 0.035 + Math.abs(Math.sin(globalTime * 11.5 + u.phase)) * 0.11 : emotion === 'happy' ? 0.055 : 0.035;
    u.mouth.scale.y = 1 + mouthOpen * 4;
    const browTilt = emotion === 'angry' ? 0.28 : emotion === 'sad' ? -0.18 : emotion === 'surprised' ? -0.42 : 0.08;
    u.browL.rotation.z = browTilt;
    u.browR.rotation.z = -browTilt;

    if (u.tailPivot) {
      u.tailPivot.rotation.y = Math.sin(globalTime * 4.5 + u.phase) * 0.38;
    }

    actor.rotation.y = (actorIndex === 0 ? 0.12 : -0.15) + Math.sin(globalTime * 0.32 + u.phase) * 0.025;
  }

  function render(project, currentScene, local, globalTime) {
    resize();
    rebuild(project, currentScene);

    const action = currentScene?.action || inferAction(currentScene?.text || '');
    const dialogue = parseDialogue(currentScene?.text || '');
    const emotion = inferEmotion(currentScene?.text || '', currentScene?.emotion);
    const speakingCharacter = String(currentScene?.speakingCharacter || dialogue.speaker || '').toLowerCase();
    const characterLabels = Array.isArray(currentScene?.characters) ? currentScene.characters : [];
    const speakingIndex = speakingCharacter
      ? characterLabels.findIndex((label) => String(label).toLowerCase() === speakingCharacter)
      : dialogue.speaker
        ? (dialogue.speaker.toLowerCase().includes('2') ? 1 : 0)
        : -1;

    actors.forEach((actor, index) => {
      const startX = index === 0 ? -1.1 : 1.1;
      if (action === 'run') actor.position.x = startX + Math.sin(globalTime * 0.8 + index) * 0.65;
      else if (action === 'walk') actor.position.x = startX + Math.sin(globalTime * 0.5 + index) * 0.35;
      else actor.position.x = startX;
      if (actor.userData.kaykit) animateKayKitActor(actor, index, action, globalTime, speakingIndex, emotion);
      else if (actor.userData.quaternius) animateQuaterniusActor(actor, index, action, globalTime, speakingIndex, emotion);
      else animateActor(actor, index, action, local, globalTime, speakingIndex, emotion);
    });

    const progress = currentScene?.duration ? clamp(local / currentScene.duration, 0, 1) : 0;
    const cameraMode = currentScene?.camera || 'still';
    let targetX = 0;
    let targetZ = 0;
    let camX = 0;
    let camY = 2.85;
    let camZ = 6.6;

    if (cameraMode === 'push') {
      camZ = 6.6 - ease(progress) * 1.6;
      camY = 2.75;
    } else if (cameraMode === 'drift') {
      camX = Math.sin(globalTime * 0.25) * 1.0;
      camY = 3.2 + Math.cos(globalTime * 0.2) * 0.18;
    } else if (cameraMode === 'orbit') {
      camX = Math.sin(globalTime * 0.32) * 2.6;
      camZ = 6.3 + Math.cos(globalTime * 0.32) * 0.6;
    } else if (cameraMode === 'parallax') {
      camX = Math.sin(globalTime * 0.45) * 0.9;
      camZ = 6.4;
    }

    camera.position.set(camX, camY, camZ);
    camera.lookAt(targetX, 1.35, targetZ);
    scene3d.fog.color.set(colorFor(currentScene?.palette || 0, 0));
    scene3d.background = new THREE.Color(colorFor(currentScene?.palette || 0, 0));

    const speaking = dialogue.speaker ? 'Speaking' : action === 'idle' ? 'Acting' : action;
    renderer.domElement.setAttribute('aria-label', 'Agon 3D scene preview: ' + speaking);

    renderer.render(scene3d, camera);
  }

  function dispose() {
    window.removeEventListener('resize', resize);
    while (scene3d.children.length) {
      const child = scene3d.children[0];
      scene3d.remove(child);
      disposeObject3D(child);
    }
    renderer.dispose();
  }

  window.addEventListener('resize', resize);

  return {
    canvas: renderer.domElement,
    render,
    dispose,
    setOutputSize,
    ready: true,
  };
}


if (typeof window !== 'undefined') {
  window.__AGON_CREATE_THREE_DIRECTOR__ = createThreeDirector;
  window.__AGON_PRELOAD_THREE_ASSETS__ = loadAll3DAssets;
  window.dispatchEvent(new Event('agon-three-director-ready'));
}
