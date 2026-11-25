import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.querySelector('#scene');
const windInput = document.querySelector('#wind-speed');
const windValue = document.querySelector('#wind-value');
const pauseButton = document.querySelector('#pause-button');
const pauseLabel = document.querySelector('#pause-label');
const paletteButtons = [...document.querySelectorAll('.palette')];
const liveRegion = document.querySelector('#live-region');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const palettes = {
  orchard: ['#ff7968', '#ffc857', '#74bd8d', '#62b6d7'],
  candy: ['#f05d89', '#ffa5bb', '#b58bd8', '#ffd166'],
  lagoon: ['#1c858d', '#59c3b3', '#b6dde0', '#f4b942'],
  meadow: ['#5f8d4e', '#a6c48a', '#eadbb8', '#ee9b63'],
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const world = new THREE.Group();
scene.add(world);

const clock = new THREE.Clock();
let animationFrame = null;
let elapsed = 0;
let spinAngle = 0.34;
let isPaused = reducedMotionQuery.matches;
let hasRendered = false;

function seededRandom(seed = 9) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = seededRandom(28);

function createPaperTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');

  context.fillStyle = '#fbf7ed';
  context.fillRect(0, 0, 256, 256);

  for (let index = 0; index < 1900; index += 1) {
    const alpha = 0.018 + random() * 0.035;
    context.fillStyle = `rgba(86, 72, 50, ${alpha})`;
    context.fillRect(random() * 256, random() * 256, 0.6 + random() * 1.4, 0.6 + random() * 1.2);
  }

  context.lineWidth = 0.55;
  for (let index = 0; index < 55; index += 1) {
    const y = random() * 256;
    context.strokeStyle = `rgba(255, 255, 255, ${0.06 + random() * 0.1})`;
    context.beginPath();
    context.moveTo(random() * 60, y);
    context.lineTo(150 + random() * 100, y + random() * 4 - 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

const paperTexture = createPaperTexture();

function paperMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    map: options.map === false ? null : paperTexture,
    roughness: options.roughness ?? 0.92,
    metalness: 0,
    flatShading: options.flatShading ?? false,
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

function setShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

const hemiLight = new THREE.HemisphereLight(0xfffbe8, 0x6e9b78, 1.95);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff2d7, 2.45);
keyLight.position.set(-5.5, 9, 6.5);
keyLight.target.position.set(0, 1.4, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 24;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.025;
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.DirectionalLight(0x9fd7dc, 0.55);
fillLight.position.set(5, 3, -4);
scene.add(fillLight);

const materials = {
  hill: paperMaterial('#83bd7f', { flatShading: true }),
  backHill: paperMaterial('#a5d19a', { flatShading: true }),
  frontHill: paperMaterial('#96c987', { flatShading: true }),
  cream: paperMaterial('#f4e6c6', { flatShading: true }),
  creamLight: paperMaterial('#fff5dc', { flatShading: true }),
  terracotta: paperMaterial('#db6e55', { flatShading: true }),
  terracottaDark: paperMaterial('#bc5748', { flatShading: true }),
  door: paperMaterial('#a85b45', { flatShading: true }),
  window: paperMaterial('#75bfd0', { flatShading: true }),
  wood: paperMaterial('#866044', { flatShading: true }),
  gold: paperMaterial('#f6bb4e', { flatShading: true }),
  stem: paperMaterial('#54865a', { flatShading: true }),
  cloud: paperMaterial('#fffdf7', { roughness: 1 }),
  stone: paperMaterial('#eadcb9', { flatShading: true }),
};

const paperEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0x604b3a,
  transparent: true,
  opacity: 0.19,
});

const hillGeometry = new THREE.SphereGeometry(1, 56, 28);

const backHill = setShadow(
  new THREE.Mesh(hillGeometry, materials.backHill),
  false,
  true,
);
backHill.position.set(-2.8, -1.65, -2.5);
backHill.scale.set(5.1, 1.7, 3.2);
world.add(backHill);

const mainHill = setShadow(new THREE.Mesh(hillGeometry, materials.hill), true, true);
mainHill.position.set(0, -1.62, 0.15);
mainHill.scale.set(4.85, 1.85, 3.15);
world.add(mainHill);

const frontHill = setShadow(
  new THREE.Mesh(hillGeometry, materials.frontHill),
  false,
  true,
);
frontHill.position.set(2.45, -1.95, 2.35);
frontHill.scale.set(3.1, 1.15, 2.25);
world.add(frontHill);

const windmill = new THREE.Group();
world.add(windmill);

const plinth = setShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.02, 0.18, 8), materials.terracottaDark),
);
plinth.position.y = 0.15;
plinth.rotation.y = Math.PI / 8;
windmill.add(plinth);
plinth.add(new THREE.LineSegments(new THREE.EdgesGeometry(plinth.geometry, 24), paperEdgeMaterial));

const tower = setShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.94, 3.03, 8, 1), materials.cream),
);
tower.position.y = 1.73;
tower.rotation.y = Math.PI / 8;
windmill.add(tower);
tower.add(new THREE.LineSegments(new THREE.EdgesGeometry(tower.geometry, 24), paperEdgeMaterial));

const roofRim = setShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.12, 8), materials.terracottaDark),
);
roofRim.position.y = 3.245;
roofRim.rotation.y = Math.PI / 8;
windmill.add(roofRim);

const roof = setShadow(
  new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.75, 8), materials.terracotta),
);
roof.position.y = 3.64;
roof.rotation.y = Math.PI / 8;
windmill.add(roof);
roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roof.geometry, 24), paperEdgeMaterial));

const finial = setShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), materials.gold));
finial.position.y = 4.06;
windmill.add(finial);

function makeDoorShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.25, 0);
  shape.lineTo(0.25, 0);
  shape.lineTo(0.25, 0.49);
  shape.absarc(0, 0.49, 0.25, 0, Math.PI, false);
  shape.lineTo(-0.25, 0);
  return shape;
}

const door = setShadow(
  new THREE.Mesh(new THREE.ShapeGeometry(makeDoorShape(), 20), materials.door),
  false,
  true,
);
door.position.set(0, 0.19, 0.873);
windmill.add(door);

const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), materials.gold);
doorKnob.position.set(0.13, 0.57, 0.906);
windmill.add(doorKnob);

const windowFrame = new THREE.Mesh(
  new THREE.TorusGeometry(0.168, 0.035, 8, 24),
  materials.creamLight,
);
windowFrame.position.set(0, 2.02, 0.719);
windmill.add(windowFrame);

const windowGlass = new THREE.Mesh(new THREE.CircleGeometry(0.155, 24), materials.window);
windowGlass.position.set(0, 2.02, 0.716);
windmill.add(windowGlass);

const windowBarMaterial = new THREE.LineBasicMaterial({
  color: 0xf9efda,
  transparent: true,
  opacity: 0.88,
});
const windowBars = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1.87, 0.724),
    new THREE.Vector3(0, 2.17, 0.724),
    new THREE.Vector3(-0.14, 2.02, 0.724),
    new THREE.Vector3(0.14, 2.02, 0.724),
  ]),
  windowBarMaterial,
);
windmill.add(windowBars);

const axle = setShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.14, 0.52, 16), materials.wood),
);
axle.rotation.x = Math.PI / 2;
axle.position.set(0, 2.9, 0.86);
windmill.add(axle);

const bladeShape = new THREE.Shape();
bladeShape.moveTo(-0.04, 0.17);
bladeShape.bezierCurveTo(-0.17, 0.73, -0.23, 1.38, -0.1, 1.84);
bladeShape.quadraticCurveTo(-0.05, 2.08, 0.22, 2.17);
bladeShape.quadraticCurveTo(0.51, 2.25, 0.61, 2.07);
bladeShape.quadraticCurveTo(0.69, 1.89, 0.43, 1.73);
bladeShape.lineTo(0.09, 0.24);
bladeShape.quadraticCurveTo(0.02, 0.11, -0.04, 0.17);

const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
  depth: 0.036,
  bevelEnabled: false,
  curveSegments: 14,
  steps: 1,
});
bladeGeometry.center();
bladeGeometry.translate(0, 1.16, -0.018);

const foldShape = new THREE.Shape();
foldShape.moveTo(0.02, 0.29);
foldShape.lineTo(-0.055, 1.7);
foldShape.lineTo(0.21, 2.1);
foldShape.lineTo(0.57, 2.04);
foldShape.lineTo(0.1, 0.29);
foldShape.closePath();

const foldGeometry = new THREE.ShapeGeometry(foldShape, 14);
foldGeometry.center();
foldGeometry.translate(0, 1.16, 0.003);

const foldMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff8e8,
  transparent: true,
  opacity: 0.19,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const bladeEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0x654638,
  transparent: true,
  opacity: 0.3,
});

const bladeMaterials = [];
const blades = new THREE.Group();
blades.position.set(0, 2.9, 1.09);
blades.rotation.z = spinAngle;
windmill.add(blades);

for (let index = 0; index < 4; index += 1) {
  const bladeGroup = new THREE.Group();
  const material = paperMaterial(palettes.orchard[index]);
  material.side = THREE.DoubleSide;
  bladeMaterials.push(material);

  const blade = setShadow(new THREE.Mesh(bladeGeometry, material));
  blade.position.z = 0;
  bladeGroup.add(blade);

  const fold = new THREE.Mesh(foldGeometry, foldMaterial);
  fold.position.z = 0.024;
  bladeGroup.add(fold);

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(bladeGeometry, 28), bladeEdgeMaterial);
  outline.position.z = 0.019;
  bladeGroup.add(outline);

  const creaseGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.015, 0.28, 0.04),
    new THREE.Vector3(0.58, 2.04, 0.04),
  ]);
  const crease = new THREE.Line(creaseGeometry, bladeEdgeMaterial);
  bladeGroup.add(crease);

  bladeGroup.rotation.z = index * (Math.PI / 2);
  blades.add(bladeGroup);
}

const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.19, 20), materials.wood);
hub.rotation.x = Math.PI / 2;
hub.position.set(0, 2.9, 1.18);
windmill.add(hub);

const hubCap = new THREE.Mesh(new THREE.CircleGeometry(0.145, 24), materials.gold);
hubCap.position.set(0, 2.9, 1.279);
windmill.add(hubCap);

const hubPin = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), materials.creamLight);
hubPin.position.set(0, 2.9, 1.308);
windmill.add(hubPin);

const pathStones = [
  [0.03, 0.165, 0.94, 0.31, 0.22],
  [0.12, 0.105, 1.3, 0.35, 0.23],
  [-0.04, 0.035, 1.68, 0.39, 0.24],
  [0.1, -0.045, 2.08, 0.44, 0.27],
];

for (const [x, y, z, width, depth] of pathStones) {
  const stone = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), materials.stone);
  stone.position.set(x, y, z);
  stone.scale.set(width, 0.035, depth);
  stone.rotation.y = random() * 0.8 - 0.4;
  stone.receiveShadow = true;
  world.add(stone);
}

const flowerCenters = [
  [-1.28, 0.11, 0.84, '#ff8a72', 1],
  [1.37, 0.1, 0.76, '#ffd166', 0.95],
  [-1.76, 0.08, 0.25, '#fff1d0', 0.82],
  [1.67, 0.03, 0.15, '#f19b83', 0.86],
  [-1.98, -0.02, -0.38, '#f7c85c', 0.78],
  [1.92, -0.04, -0.42, '#f5eee0', 0.74],
  [-0.92, 0.14, 1.23, '#efb0bc', 0.72],
  [1.02, 0.115, 1.34, '#f4eee0', 0.7],
];

const flowerPetalGeometry = new THREE.SphereGeometry(0.052, 9, 7);
const flowerCenterGeometry = new THREE.SphereGeometry(0.038, 9, 7);
const stemGeometry = new THREE.CylinderGeometry(0.016, 0.021, 0.22, 5);
const flowerCenterMaterial = paperMaterial('#f2bb4a', { flatShading: true });

for (const [x, y, z, color, scale] of flowerCenters) {
  const flower = new THREE.Group();
  flower.position.set(x, y, z);
  flower.scale.setScalar(scale);

  const stem = new THREE.Mesh(stemGeometry, materials.stem);
  stem.position.y = 0.11;
  flower.add(stem);

  const petalMaterial = paperMaterial(color, { flatShading: true });
  for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
    const angle = (petalIndex / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(flowerPetalGeometry, petalMaterial);
    petal.position.set(Math.cos(angle) * 0.064, 0.245 + Math.sin(angle) * 0.064, 0.012);
    petal.scale.set(1, 1, 0.48);
    flower.add(petal);
  }

  const flowerCenter = new THREE.Mesh(flowerCenterGeometry, flowerCenterMaterial);
  flowerCenter.position.set(0, 0.245, 0.042);
  flowerCenter.scale.z = 0.6;
  flower.add(flowerCenter);
  world.add(flower);
}

const grassMaterial = paperMaterial('#5d945f', { flatShading: true });
for (let index = 0; index < 16; index += 1) {
  const angle = random() * Math.PI * 2;
  const radius = 1.25 + random() * 2.2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius * 0.58 + 0.25;
  const grass = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.18 + random() * 0.16, 3), grassMaterial);
  grass.position.set(x, 0.03 + random() * 0.13, z);
  grass.rotation.z = random() * 0.3 - 0.15;
  world.add(grass);
}

const cloudPuffGeometry = new THREE.SphereGeometry(1, 18, 12);
const clouds = [];

function addCloud(x, y, z, scale, phase) {
  const cloud = new THREE.Group();
  const puffs = [
    [-0.78, -0.03, 0.05, 0.63],
    [-0.32, 0.17, 0, 0.82],
    [0.22, 0.27, -0.02, 0.93],
    [0.73, 0.05, 0.04, 0.68],
    [0.2, -0.12, 0.08, 0.72],
  ];

  for (const [px, py, pz, size] of puffs) {
    const puff = new THREE.Mesh(cloudPuffGeometry, materials.cloud);
    puff.position.set(px, py, pz);
    puff.scale.set(size * 1.25, size * 0.75, size * 0.55);
    cloud.add(puff);
  }

  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  cloud.userData.baseX = x;
  cloud.userData.baseY = y;
  cloud.userData.phase = phase;
  world.add(cloud);
  clouds.push(cloud);
}

addCloud(-2.45, 4.82, -2.2, 0.96, 0.3);
addCloud(2.48, 3.85, -2.6, 0.72, 2.1);
addCloud(-0.6, 5.3, -3.6, 0.46, 4.2);

const confettiGeometry = new RoundedBoxGeometry(0.16, 0.22, 0.035, 3, 0.035);
const confetti = [];
const confettiMaterials = [];

for (let index = 0; index < 15; index += 1) {
  const material = new THREE.MeshStandardMaterial({
    color: palettes.orchard[index % 4],
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
  });
  const piece = new THREE.Mesh(confettiGeometry, material);
  piece.position.set(
    -2.75 + random() * 5.5,
    2.6 + random() * 3,
    -1.35 + random() * 2,
  );
  const scale = 0.72 + random() * 0.62;
  piece.scale.setScalar(scale);
  piece.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
  piece.userData.baseY = piece.position.y;
  piece.userData.phase = random() * Math.PI * 2;
  piece.userData.tumble = 0.3 + random() * 0.5;
  world.add(piece);
  confetti.push(piece);
  confettiMaterials.push(material);
}

let currentPaletteName = 'orchard';

function lightenColor(hex, amount = 0.2) {
  return new THREE.Color(hex).lerp(new THREE.Color('#fff7e5'), amount);
}

function applyPalette(name, announce = false) {
  const colors = palettes[name];
  if (!colors) return;

  currentPaletteName = name;
  bladeMaterials.forEach((material, index) => {
    material.color.set(colors[index]);
  });

  confettiMaterials.forEach((material, index) => {
    material.color.set(colors[index % 4]);
  });

  paletteButtons.forEach((button) => {
    const selected = button.dataset.palette === name;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  if (announce) {
    const button = paletteButtons.find((item) => item.dataset.palette === name);
    liveRegion.textContent = `${button?.querySelector('.palette-name')?.textContent ?? name} blade colors selected.`;
  }

  if (isPaused) renderScene();
}

function renderScene() {
  renderer.render(scene, camera);
  hasRendered = true;
}

function updateWindLabel() {
  const speed = Number(windInput.value);
  let description = 'Calm';
  if (speed > 84) description = 'Gusty';
  else if (speed > 64) description = 'Brisk';
  else if (speed > 32) description = 'Breezy';
  else if (speed > 10) description = 'Light';

  const kmh = Math.round(speed * 0.38);
  windValue.textContent = `${description} · ${kmh} km/h`;
  windInput.setAttribute('aria-valuetext', `${description}, ${kmh} kilometers per hour`);
}

function updatePauseUI(announce = false) {
  pauseButton.classList.toggle('is-paused', isPaused);
  pauseButton.setAttribute('aria-pressed', String(isPaused));
  pauseLabel.textContent = isPaused ? 'Play' : 'Pause';
  pauseButton.setAttribute(
    'aria-label',
    isPaused ? 'Play windmill animation' : 'Pause windmill animation',
  );
  document.body.classList.toggle('motion-paused', isPaused);

  if (announce) {
    liveRegion.textContent = isPaused ? 'Windmill paused.' : 'Windmill playing.';
  }
}

function stopAnimation() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function animate() {
  if (isPaused) {
    animationFrame = null;
    return;
  }

  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;

  const windAmount = Number(windInput.value) / 100;
  if (windAmount > 0) {
    spinAngle += delta * (0.12 + Math.pow(windAmount, 1.18) * 4.45);
    blades.rotation.z = spinAngle;
  }

  clouds.forEach((cloud) => {
    cloud.position.x = cloud.userData.baseX + Math.sin(elapsed * 0.18 + cloud.userData.phase) * 0.12;
    cloud.position.y = cloud.userData.baseY + Math.sin(elapsed * 0.32 + cloud.userData.phase) * 0.045;
  });

  confetti.forEach((piece) => {
    piece.position.y =
      piece.userData.baseY + Math.sin(elapsed * 0.72 + piece.userData.phase) * 0.14;
    piece.rotation.x += delta * piece.userData.tumble;
    piece.rotation.z += delta * piece.userData.tumble * 0.7;
  });

  renderScene();
  animationFrame = requestAnimationFrame(animate);
}

function startAnimation() {
  stopAnimation();
  clock.start();
  animationFrame = requestAnimationFrame(animate);
}

function setPaused(nextPaused, announce = true) {
  isPaused = nextPaused;
  updatePauseUI(announce);

  if (isPaused) {
    stopAnimation();
    renderScene();
  } else {
    startAnimation();
  }
}

pauseButton.addEventListener('click', () => {
  setPaused(!isPaused);
});

windInput.addEventListener('input', () => {
  updateWindLabel();
  if (isPaused) renderScene();
});

windInput.addEventListener('change', () => {
  liveRegion.textContent = `Wind speed set to ${windValue.textContent}.`;
});

paletteButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    applyPalette(button.dataset.palette, true);
  });

  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + paletteButtons.length) % paletteButtons.length;
    const nextButton = paletteButtons[nextIndex];
    nextButton.focus();
    nextButton.click();
  });
});

function resizeScene() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  camera.aspect = aspect;
  camera.fov = 32;

  const fitHeight = Math.max(7.75, 6.25 / aspect);
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = fitHeight / (2 * Math.tan(halfFov));

  const targetX = aspect > 1.08 ? -1.28 : 0;
  const targetY = aspect > 1.08 ? 2.23 : 2.23;
  const target = new THREE.Vector3(targetX, targetY, 0);
  const viewDirection = new THREE.Vector3(0.16, 0.135, 1).normalize();

  camera.position.copy(target).addScaledVector(viewDirection, distance);
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  renderScene();
}

applyPalette(currentPaletteName);
updateWindLabel();
updatePauseUI(false);
resizeScene();

window.addEventListener('resize', resizeScene);

if (!isPaused) {
  startAnimation();
}

reducedMotionQuery.addEventListener?.('change', (event) => {
  if (event.matches) {
    setPaused(true, false);
    liveRegion.textContent = 'Reduced motion is on. The windmill is paused.';
  }
});

// Avoid a blank frame if web fonts or the browser delay the first paint.
requestAnimationFrame(() => {
  if (!hasRendered) renderScene();
});
