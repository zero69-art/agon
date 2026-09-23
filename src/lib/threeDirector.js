const THREE_READY_TIMEOUT = 15000;

function getThreePromise() {
  const win = window;
  if (win.__AGON_THREE_PROMISE__) return win.__AGON_THREE_PROMISE__;
  if (win.__AGON_THREE__) return Promise.resolve(win.__AGON_THREE__);

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('agon-three-ready', onReady);
      reject(new Error('Three.js did not load.'));
    }, THREE_READY_TIMEOUT);

    function onReady() {
      const three = window.__AGON_THREE__;
      if (!three) return;
      window.clearTimeout(timer);
      window.removeEventListener('agon-three-ready', onReady);
      resolve(three);
    }

    window.addEventListener('agon-three-ready', onReady);
  });
}

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
  if (/\brun|runs|running|chase|chases|sprint/.test(t)) return 'run';
  if (/\bjump|jumps|jumped|leap|leaps/.test(t)) return 'jump';
  if (/\bwave|waves|waved|hello/.test(t)) return 'wave';
  if (/\bfight|fights|attack|attacks|punch|punches|battle/.test(t)) return 'fight';
  if (/\bdance|dances|danced/.test(t)) return 'dance';
  if (/\bsit|sits|sat/.test(t)) return 'sit';
  if (/\bwalk|walks|walking|approach|approaches/.test(t)) return 'walk';
  return 'idle';
}


function speciesFromCharacter(value, fallback) {
  const t = String(value || '').toLowerCase();
  if (/\bfox|vixen\b/.test(t)) return 'fox';
  if (/\bbear\b/.test(t)) return 'bear';
  if (/\bowl\b/.test(t)) return 'owl';
  if (/\brabbit|bunny\b/.test(t)) return 'rabbit';
  if (/\brobot|android|machine\b/.test(t)) return 'robot';
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

function addEnvironment(THREE, scene, motif, paletteIndex) {
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

export async function createThreeDirector(host, sceneCount = 1) {
  const THREE = await getThreePromise();

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
  let actors = [];
  let currentSignature = '';
  let lastW = 0;
  let lastH = 0;
  let outputSize = null;

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
    const signature = motif + ':' + paletteIndex + ':' + (currentScene?.id || '') + ':' + (currentScene?.text || '') + ':' + sceneCount;
    if (signature === currentSignature) return;
    currentSignature = signature;

    while (environment) {
      scene3d.remove(environment);
      environment = null;
    }
    actors.forEach((actor) => scene3d.remove(actor));
    actors = [];

    environment = addEnvironment(THREE, scene3d, motif, paletteIndex);
    scene3d.add(environment);

    const baseText = currentScene?.text || project?.script || '';
    const requested = Array.isArray(currentScene?.characters) ? currentScene.characters.filter(Boolean).slice(0, 2) : [];
    const s0 = requested[0] ? speciesFromCharacter(requested[0], motif === 'space' ? 'robot' : 'fox') : inferSpecies(baseText, motif === 'space' ? 'robot' : 'fox');
    const s1 = requested[1] ? speciesFromCharacter(requested[1], s0 === 'fox' ? 'owl' : 'human') : inferSpecies(baseText, s0 === 'fox' ? 'owl' : 'human');
    actors = [
      makeActor(THREE, s0, 0, paletteIndex),
      makeActor(THREE, s1, 1, paletteIndex),
    ];

    actors[0].position.x = -1.1;
    actors[1].position.x = 1.1;
    actors[0].position.z = 0.3;
    actors[1].position.z = -0.2;
    actors[0].rotation.y = 0.12;
    actors[1].rotation.y = -0.15;

    actors.forEach((actor) => scene3d.add(actor));

    const backdrop = new THREE.Mesh(
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

    actor.rotation.y += (actorIndex === 0 ? 0.0008 : -0.0008);
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
      animateActor(actor, index, action, local, globalTime, speakingIndex, emotion);
    });

    const progress = currentScene?.duration ? clamp(local / currentScene.duration, 0, 1) : 0;
    const cameraMode = currentScene?.camera || 'still';
    let targetX = 0;
    let targetZ = 0;
    let camX = 0;
    let camY = 3.1;
    let camZ = 8.6;

    if (cameraMode === 'push') {
      camZ = 8.6 - ease(progress) * 2.0;
      camY = 3.0;
    } else if (cameraMode === 'drift') {
      camX = Math.sin(globalTime * 0.25) * 1.0;
      camY = 3.2 + Math.cos(globalTime * 0.2) * 0.18;
    } else if (cameraMode === 'orbit') {
      camX = Math.sin(globalTime * 0.32) * 2.6;
      camZ = 8.2 + Math.cos(globalTime * 0.32) * 0.7;
    } else if (cameraMode === 'parallax') {
      camX = Math.sin(globalTime * 0.45) * 0.9;
      camZ = 8.2;
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
    renderer.dispose();
    while (scene3d.children.length) scene3d.remove(scene3d.children[0]);
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
