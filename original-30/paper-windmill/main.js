import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const sceneHost = document.querySelector('#scene');
const windSlider = document.querySelector('#windSpeed');
const windValue = document.querySelector('#windValue');
const floatingWind = document.querySelector('#floatingWind');
const pauseButton = document.querySelector('#pauseButton');
const pauseLabel = document.querySelector('#pauseLabel');
const statusText = document.querySelector('#statusText');
const statusLabel = document.querySelector('#statusLabel');
const colorName = document.querySelector('#colorName');
const swatches = [...document.querySelectorAll('.swatch')];
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let windSpeed = Number(windSlider.value);
let isPaused = reducedMotionQuery.matches;
let ambientTime = 0;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdcebdc, 24, 48);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const cameraTarget = new THREE.Vector3();

const hemiLight = new THREE.HemisphereLight(0xfff5d4, 0x749b72, 2.3);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff6d7, 2.7);
sunLight.position.set(7, 12, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -11;
sunLight.shadow.camera.right = 11;
sunLight.shadow.camera.top = 12;
sunLight.shadow.camera.bottom = -5;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 30;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xc8e8dc, 0.8);
fillLight.position.set(-8, 5, 7);
scene.add(fillLight);

function makePaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1700; i += 1) {
    const alpha = 0.018 + Math.random() * 0.06;
    const warm = Math.random() > 0.46;
    context.fillStyle = warm
      ? `rgba(103, 82, 48, ${alpha})`
      : `rgba(255, 255, 255, ${alpha * 1.8})`;
    const size = Math.random() > 0.88 ? 2 : 1;
    context.fillRect(Math.random() * 256, Math.random() * 256, size, 1);
  }

  for (let i = 0; i < 34; i += 1) {
    context.strokeStyle = `rgba(116, 93, 58, ${0.018 + Math.random() * 0.03})`;
    context.lineWidth = 0.7;
    context.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 6, y + Math.random() * 4 - 2, x + 13, y + 1);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const paperTexture = makePaperTexture();

function paperMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    map: paperTexture,
    roughness: 0.94,
    metalness: 0,
    ...options,
  });
}

const materials = {
  cream: paperMaterial('#fff4d8'),
  creamLight: paperMaterial('#fffbed'),
  creamDark: paperMaterial('#e8dcbc'),
  leaf: paperMaterial('#517f65'),
  leafDark: paperMaterial('#335c4b'),
  coral: paperMaterial('#d96e5d'),
  coralDark: paperMaterial('#b95449'),
  yellow: paperMaterial('#f5bd45'),
  stone: paperMaterial('#d8c8a8'),
  stoneLight: paperMaterial('#eadfc7'),
  ground: paperMaterial('#94c78f', { roughness: 1 }),
  groundLight: paperMaterial('#add397', { roughness: 1 }),
  cloud: paperMaterial('#fffdf3', { roughness: 1, flatShading: true }),
  bark: paperMaterial('#8f674c'),
};

const bladeMaterial = paperMaterial('#f6b73c', { roughness: 0.88 });

function roundedBox(width, height, depth, radius, material) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
  return new THREE.Mesh(geometry, material);
}

function addShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

const world = new THREE.Group();
scene.add(world);

const horizonGroup = new THREE.Group();
world.add(horizonGroup);

function addHill(x, y, z, sx, sy, sz, color) {
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    paperMaterial(color, { roughness: 1, flatShading: true }),
  );
  hill.position.set(x, y, z);
  hill.scale.set(sx, sy, sz);
  hill.receiveShadow = true;
  horizonGroup.add(hill);
  return hill;
}

addHill(-9.5, -1.2, -11, 8.2, 2.6, 3.2, '#8ac393');
addHill(7.5, -1.35, -14, 9.5, 3.15, 3.4, '#7eb88b');
addHill(0.5, -1.55, -20, 14, 4.2, 4, '#9ccc96');
addHill(-2.8, -1.75, -16, 7, 2.5, 3.2, '#aad49e');

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(32, 72),
  materials.ground,
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.09;
ground.receiveShadow = true;
world.add(ground);

const garden = new THREE.Mesh(
  new THREE.CircleGeometry(4.8, 56),
  materials.groundLight,
);
garden.rotation.x = -Math.PI / 2;
garden.position.set(1.2, -0.065, 0.4);
garden.scale.set(1.2, 0.82, 1);
garden.receiveShadow = true;
world.add(garden);

const windmill = new THREE.Group();
windmill.position.set(0.45, 0, 0);
world.add(windmill);

const patio = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.35, 0.2, 48), materials.stone),
  false,
  true,
);
patio.position.y = 0.01;
windmill.add(patio);

const base = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.42, 0.52, 40), materials.stoneLight),
);
base.position.y = 0.3;
windmill.add(base);

const tower = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(1.42, 2.02, 4.42, 40, 1, false), materials.cream),
);
tower.position.y = 2.66;
windmill.add(tower);

[
  [1.3, 1.86],
  [2.55, 1.69],
  [3.8, 1.53],
].forEach(([y, radius]) => {
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.033, 6, 48),
    materials.creamDark,
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = y;
  windmill.add(band);
});

const shoulder = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.46, 0.28, 40), materials.creamLight),
);
shoulder.position.y = 4.92;
windmill.add(shoulder);

const roof = addShadow(
  new THREE.Mesh(new THREE.ConeGeometry(2.16, 1.98, 12, 1, false), materials.coral),
);
roof.position.y = 5.94;
windmill.add(roof);

const roofRim = new THREE.Mesh(
  new THREE.TorusGeometry(2.13, 0.085, 8, 48),
  materials.coralDark,
);
roofRim.rotation.x = Math.PI / 2;
roofRim.position.y = 4.96;
windmill.add(roofRim);

[
  [5.39, 1.67],
  [5.82, 1.21],
  [6.25, 0.73],
].forEach(([y, radius]) => {
  const shingleBand = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.018, 5, 40),
    materials.coralDark,
  );
  shingleBand.rotation.x = Math.PI / 2;
  shingleBand.position.y = y;
  windmill.add(shingleBand);
});

const finial = addShadow(
  new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), materials.leafDark),
);
finial.position.y = 6.99;
windmill.add(finial);

function makeArch(width, height) {
  const shape = new THREE.Shape();
  const radius = width / 2;
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, height - radius);
  shape.quadraticCurveTo(-width / 2, height, 0, height);
  shape.quadraticCurveTo(width / 2, height, width / 2, height - radius);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  return shape;
}

const doorFrame = new THREE.Mesh(
  new THREE.ShapeGeometry(makeArch(1.08, 1.83), 16),
  materials.creamDark,
);
doorFrame.position.set(0, 0.34, 1.9);
windmill.add(doorFrame);

const door = new THREE.Mesh(
  new THREE.ShapeGeometry(makeArch(0.84, 1.62), 16),
  materials.leafDark,
);
door.position.set(0, 0.39, 1.92);
windmill.add(door);

const doorLine = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.035, 0.025),
  materials.creamDark,
);
doorLine.position.set(0, 1.05, 1.94);
windmill.add(doorLine);

const doorKnob = new THREE.Mesh(
  new THREE.SphereGeometry(0.065, 14, 10),
  materials.yellow,
);
doorKnob.position.set(0.22, 0.91, 1.99);
windmill.add(doorKnob);

const step = addShadow(
  new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 0.55), materials.stone),
);
step.position.set(0, 0.15, 2.06);
windmill.add(step);

const windowFrame = new THREE.Mesh(
  new THREE.TorusGeometry(0.45, 0.085, 8, 32),
  materials.creamDark,
);
windowFrame.position.set(0, 3.35, 1.58);
windmill.add(windowFrame);

const windowGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.37, 28),
  new THREE.MeshStandardMaterial({
    color: '#7ab8a5',
    roughness: 0.55,
    metalness: 0,
  }),
);
windowGlass.position.set(0, 3.35, 1.59);
windmill.add(windowGlass);

const windowBarVertical = new THREE.Mesh(
  new THREE.BoxGeometry(0.045, 0.66, 0.035),
  materials.creamLight,
);
windowBarVertical.position.set(0, 3.35, 1.64);
windmill.add(windowBarVertical);

const windowBarHorizontal = new THREE.Mesh(
  new THREE.BoxGeometry(0.66, 0.045, 0.035),
  materials.creamLight,
);
windowBarHorizontal.position.set(0, 3.35, 1.64);
windmill.add(windowBarHorizontal);

const axle = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 1.1, 20), materials.creamDark),
);
axle.rotation.x = Math.PI / 2;
axle.position.set(0, 4.99, 1.82);
windmill.add(axle);

const axleCap = addShadow(
  new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 0.22, 28), materials.leaf),
);
axleCap.rotation.x = Math.PI / 2;
axleCap.position.set(0, 4.99, 2.38);
windmill.add(axleCap);

const bladeGroup = new THREE.Group();
bladeGroup.position.set(0, 4.99, 2.48);
bladeGroup.rotation.z = Math.PI / 7;
windmill.add(bladeGroup);

function createBlade(index) {
  const blade = new THREE.Group();
  blade.rotation.z = index * (Math.PI / 2);

  const arm = addShadow(roundedBox(0.115, 2.62, 0.105, 0.045, materials.creamLight));
  arm.position.set(0, 1.4, 0);
  blade.add(arm);

  const panel = addShadow(roundedBox(1.04, 1.88, 0.065, 0.05, bladeMaterial));
  panel.position.set(0.63, 1.64, 0.055);
  blade.add(panel);

  const innerRail = addShadow(roundedBox(0.055, 1.91, 0.035, 0.018, materials.creamLight));
  innerRail.position.set(0.13, 1.64, 0.098);
  blade.add(innerRail);

  const outerRail = addShadow(roundedBox(0.055, 1.91, 0.035, 0.018, materials.creamLight));
  outerRail.position.set(1.13, 1.64, 0.098);
  blade.add(outerRail);

  [0.76, 1.63, 2.5].forEach((y) => {
    const slat = addShadow(roundedBox(1.05, 0.05, 0.035, 0.018, materials.creamLight));
    slat.position.set(0.63, y, 0.099);
    blade.add(slat);
  });

  const pin = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), materials.yellow),
  );
  pin.position.set(0.13, 0.72, 0.11);
  blade.add(pin);

  return blade;
}

for (let i = 0; i < 4; i += 1) {
  bladeGroup.add(createBlade(i));
}

const hub = addShadow(
  new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 16), materials.yellow),
);
hub.position.set(0, 0, 0.16);
bladeGroup.add(hub);

const hubPin = addShadow(
  new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), materials.coralDark),
);
hubPin.position.set(0, 0, 0.44);
bladeGroup.add(hubPin);

function createFlower(x, z, color, scale = 1, rotation = 0) {
  const flower = new THREE.Group();
  flower.position.set(x, 0, z);
  flower.rotation.y = rotation;
  flower.scale.setScalar(scale);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.032, 0.58, 7),
    materials.leaf,
  );
  stem.position.y = 0.28;
  flower.add(stem);

  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 5),
    materials.leaf,
  );
  leaf.scale.set(1.55, 0.36, 0.55);
  leaf.position.set(0.1, 0.26, 0);
  leaf.rotation.z = -0.42;
  flower.add(leaf);

  const petalMaterial = paperMaterial(color, { roughness: 0.86 });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), petalMaterial);
    petal.scale.set(1.65, 0.72, 0.44);
    petal.position.set(Math.cos(angle) * 0.13, 0.62 + Math.sin(angle) * 0.13, 0);
    petal.rotation.z = angle;
    flower.add(petal);
  }

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    materials.yellow,
  );
  center.position.set(0, 0.62, 0.07);
  flower.add(center);
  world.add(flower);
  return flower;
}

const flowers = [
  createFlower(-2.9, 2.25, '#f3c55f', 1.1, 0.4),
  createFlower(-3.55, 0.65, '#ef887d', 0.85, -0.2),
  createFlower(3.25, 2.52, '#f4eee0', 1, 0.6),
  createFlower(4.1, 0.8, '#e58ba7', 0.9, -0.5),
  createFlower(2.65, 3.5, '#f3c55f', 0.82, 0.1),
  createFlower(-1.75, 3.75, '#f4eee0', 0.76, 0.9),
  createFlower(4.65, 2.85, '#ef887d', 0.74, 0.25),
];

for (let i = 0; i < 34; i += 1) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2.9 + Math.random() * 4.6;
  const tuft = new THREE.Mesh(
    new THREE.ConeGeometry(0.045 + Math.random() * 0.025, 0.27 + Math.random() * 0.34, 3),
    i % 3 === 0 ? materials.leafDark : materials.leaf,
  );
  tuft.position.set(
    windmill.position.x + Math.cos(angle) * radius,
    0.12,
    Math.sin(angle) * radius,
  );
  tuft.rotation.z = Math.random() * 0.28 - 0.14;
  tuft.rotation.y = Math.random() * Math.PI;
  world.add(tuft);
}

for (let i = 0; i < 12; i += 1) {
  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 + Math.random() * 0.13, 0.2 + Math.random() * 0.16, 0.075, 10),
    i % 2 ? materials.stone : materials.stoneLight,
  );
  const angle = -0.2 + Math.random() * 1.45;
  const radius = 3.65 + Math.random() * 3.8;
  stone.position.set(Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius);
  stone.rotation.y = Math.random() * Math.PI;
  stone.scale.z = 0.65 + Math.random() * 0.3;
  world.add(stone);
}

function createTree(x, z, scale, foliageColor) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 1.05, 9), materials.bark),
  );
  trunk.position.y = 0.52;
  tree.add(trunk);

  const foliageMaterial = paperMaterial(foliageColor, { flatShading: true });
  [
    [0.9, 1.12, 1.1],
    [1.3, 1.72, 1.05],
    [1.66, 2.24, 0.83],
  ].forEach(([y, height, radius]) => {
    const foliage = addShadow(
      new THREE.Mesh(new THREE.ConeGeometry(radius, height, 9), foliageMaterial),
    );
    foliage.position.y = y;
    foliage.rotation.y = Math.random() * Math.PI;
    tree.add(foliage);
  });

  world.add(tree);
  return tree;
}

const leftTree = createTree(-5.4, -2.0, 0.95, '#548f6a');
leftTree.rotation.y = 0.6;
const rightTree = createTree(5.7, -3.3, 1.12, '#6ba978');
rightTree.rotation.y = -0.4;
const farTree = createTree(7.8, -5.8, 0.72, '#5c9c72');
farTree.rotation.y = 0.2;

const cloudGroup = new THREE.Group();
world.add(cloudGroup);

function createCloud(x, y, z, scale) {
  const cloud = new THREE.Group();
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  const puffs = [
    [-1.05, 0, 0, 0.85, 0.55, 0.5],
    [-0.38, 0.22, 0, 1.02, 0.72, 0.55],
    [0.42, 0.1, 0, 0.92, 0.6, 0.5],
    [1.05, -0.02, 0, 0.68, 0.45, 0.42],
  ];

  puffs.forEach(([px, py, pz, sx, sy, sz]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), materials.cloud);
    puff.position.set(px, py, pz);
    puff.scale.set(sx, sy, sz);
    puff.castShadow = false;
    cloud.add(puff);
  });

  cloud.userData.homeX = x;
  cloud.userData.drift = 0.15 + Math.random() * 0.14;
  cloud.userData.range = 1.8 + Math.random() * 1.4;
  cloudGroup.add(cloud);
  return cloud;
}

createCloud(-3.9, 7.7, -6.2, 0.9);
createCloud(5.1, 8.25, -8.2, 1.08);
createCloud(1.0, 9.1, -12, 0.62);

const gustGroup = new THREE.Group();
world.add(gustGroup);
const gustMaterial = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
});

const gusts = [];
for (let i = 0; i < 17; i += 1) {
  const length = 0.28 + Math.random() * 0.72;
  const gust = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.018 + Math.random() * 0.018, length, 3, 6),
    gustMaterial,
  );
  gust.rotation.z = Math.PI / 2;
  gust.position.set(
    -10 + Math.random() * 20,
    1.55 + Math.random() * 6.2,
    -3.5 + Math.random() * 8,
  );
  gust.userData.factor = 0.65 + Math.random() * 0.85;
  gust.userData.wrap = 10.5 + Math.random() * 1.5;
  gustGroup.add(gust);
  gusts.push(gust);
}

function updateCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;

  if (aspect < 0.82) {
    camera.fov = 37;
    camera.position.set(0, 5.8, 25.2);
    cameraTarget.set(0.42, 1.45, 0);
    windmill.rotation.y = 0.07;
  } else {
    camera.fov = 35;
    camera.position.set(9.5, 7.1, 15);
    cameraTarget.set(-1.6, 3.5, 0);
    windmill.rotation.y = 0.36;
  }

  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateWindUI() {
  const percent = (windSpeed / Number(windSlider.max)) * 100;
  const label = `${windSpeed} km/h`;
  windValue.textContent = label;
  floatingWind.textContent = label;
  windSlider.style.setProperty('--wind-pct', `${percent}%`);
  windSlider.setAttribute('aria-valuetext', `${windSpeed} kilometers per hour`);

  if (isPaused) {
    statusLabel.textContent = 'The breeze is paused';
  } else if (windSpeed === 0) {
    statusLabel.textContent = 'The air is calm';
  } else {
    statusLabel.textContent = 'Sails are turning';
  }
}

function syncMotionUI() {
  pauseButton.setAttribute('aria-pressed', String(isPaused));
  pauseLabel.textContent = isPaused ? 'Let it spin' : 'Pause the breeze';
  statusText.classList.toggle('is-paused', isPaused);
  updateWindUI();
}

windSlider.addEventListener('input', () => {
  windSpeed = Number(windSlider.value);
  updateWindUI();
});

swatches.forEach((swatch, index) => {
  swatch.addEventListener('click', () => {
    swatches.forEach((item) => item.setAttribute('aria-checked', 'false'));
    swatch.setAttribute('aria-checked', 'true');
    bladeMaterial.color.set(swatch.dataset.color);
    colorName.textContent = swatch.dataset.colorName;
  });

  swatch.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = (index + direction + swatches.length) % swatches.length;
    swatches[nextIndex].focus();
    swatches[nextIndex].click();
  });
});

pauseButton.addEventListener('click', () => {
  isPaused = !isPaused;
  syncMotionUI();
});

reducedMotionQuery.addEventListener('change', (event) => {
  if (event.matches) {
    isPaused = true;
    syncMotionUI();
  }
});

window.addEventListener('resize', updateCamera, { passive: true });

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const windFactor = windSpeed / Number(windSlider.max);

  if (!isPaused) {
    ambientTime += delta;

    if (windSpeed > 0) {
      bladeGroup.rotation.z -= (0.14 + windFactor * 1.72) * delta;
    }

    const gustSpeed = 0.55 + windFactor * 4.1;
    gusts.forEach((gust) => {
      gust.position.x += gustSpeed * gust.userData.factor * delta;
      if (gust.position.x > gust.userData.wrap) {
        gust.position.x = -gust.userData.wrap;
        gust.position.y = 1.55 + Math.random() * 6.2;
        gust.position.z = -3.5 + Math.random() * 8;
      }
    });

    gustMaterial.opacity = 0.14 + windFactor * 0.44;

    cloudGroup.children.forEach((cloud) => {
      cloud.position.x =
        cloud.userData.homeX +
        Math.sin(ambientTime * cloud.userData.drift + cloud.userData.homeX) *
          cloud.userData.range;
    });

    flowers.forEach((flower, index) => {
      flower.rotation.z =
        Math.sin(ambientTime * (1.1 + windFactor * 2.3) + index * 0.8) *
        (0.018 + windFactor * 0.06);
    });
  }

  renderer.render(scene, camera);
}

updateCamera();
syncMotionUI();
animate();
