import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.querySelector('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
} catch (error) {
  document.querySelector('#loading').remove();
  document.querySelector('#scene-error').hidden = false;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
container.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'Percy, a white pelican in a straw hat, pedals a mint bicycle along a sunny miniature beach.');
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.setAttribute('tabindex', '0');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 23;
controls.minPolarAngle = Math.PI * 0.17;
controls.maxPolarAngle = Math.PI * 0.47;
controls.zoomSpeed = 0.65;
controls.rotateSpeed = 0.55;

const hemisphere = new THREE.HemisphereLight('#fcf7dc', '#a0b4a0', 2.5);
scene.add(hemisphere);
const sunlight = new THREE.DirectionalLight('#fff1cc', 3.4);
sunlight.position.set(-3, 8, 5);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, { left: -8, right: 8, top: 7, bottom: -6, near: 0.1, far: 30 });
sunlight.shadow.normalBias = 0.035;
sunlight.shadow.bias = -0.0003;
sunlight.shadow.radius = 4;
scene.add(sunlight);
const fill = new THREE.DirectionalLight('#e1f8f1', 1.1);
fill.position.set(5, 4, -5);
scene.add(fill);

const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
const palette = {
  sand: material('#e8ce97'), sandEdge: material('#d5b886'),
  white: material('#fff8e9'), feather: material('#e6e3d1'), featherLight: material('#f4efdd'),
  orange: material('#efa045'), pouch: material('#e9a16c'), foot: material('#d68a40'),
  dark: material('#35483f'), eye: material('#1e302a', { roughness: 0.22 }),
  mint: material('#6eaa94', { roughness: 0.36, metalness: 0.22 }),
  chrome: material('#c4c8b5', { metalness: 0.6, roughness: 0.32 }),
  cream: material('#f5e6bf'), leather: material('#a16d44'), straw: material('#d4ad65'),
  palm: material('#73935d'), palmLight: material('#93a56b'), trunk: material('#a48257'),
  coral: material('#d98d71'), rock: material('#c1bfa5'),
};
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const sphereGeometry = new THREE.SphereGeometry(1, 32, 20);

function mesh(geometry, mat, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function ellipsoid(parent, mat, position, scale, rotation = 0) {
  const object = mesh(sphereGeometry, mat, parent, position);
  object.scale.set(...scale);
  object.rotation.z = rotation;
  return object;
}

function rod(parent, a, b, radius, mat, radiusTop = radius) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const object = mesh(new THREE.CylinderGeometry(radiusTop, radius, start.distanceTo(end), 12), mat, parent);
  object.position.copy(start.add(end).multiplyScalar(0.5));
  object.quaternion.setFromUnitVectors(v(0, 1, 0), end.sub(new THREE.Vector3(...a)).normalize());
  return object;
}

function tube(parent, points, radius, mat, segments = 40) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return mesh(new THREE.TubeGeometry(curve, segments, radius, 10, false), mat, parent);
}

function torus(parent, radius, thickness, mat, position, rotation = [0, 0, 0]) {
  const object = mesh(new THREE.TorusGeometry(radius, thickness, 10, 64), mat, parent, position);
  object.rotation.set(...rotation);
  return object;
}

let seed = 1043;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

// An oval slice of the coast, with a gently irregular waterline.
const island = new THREE.Group();
scene.add(island);
const base = mesh(new THREE.CylinderGeometry(1, 0.98, 0.3, 128), palette.sandEdge, island, [0, -0.17, 0]);
base.scale.set(5.1, 1, 3.2);
const sand = mesh(new THREE.CircleGeometry(1, 128), palette.sand, island, [0, -0.012, 0]);
sand.rotation.x = -Math.PI / 2;
sand.scale.set(5.1, 3.2, 1);
sand.castShadow = false;

function coast(x) { return -0.72 + Math.sin(x * 0.9) * 0.24 + Math.cos(x * 1.5) * 0.08; }
function backEdge(x) { return -3.2 * Math.sqrt(Math.max(0, 1 - (x / 5.1) ** 2)); }
const waterPositions = [], waterColors = [], waterIndices = [];
const deepColor = new THREE.Color('#64b8ad'), shallowColor = new THREE.Color('#a3d8bd');
for (let i = 0; i <= 120; i++) {
  const x = -5.09 + i / 120 * 10.18;
  const far = backEdge(x), near = Math.max(far, coast(x));
  for (let j = 0; j <= 12; j++) {
    const t = j / 12;
    waterPositions.push(x, 0.015, THREE.MathUtils.lerp(far, near, t));
    const color = deepColor.clone().lerp(shallowColor, t ** 3 * 0.85);
    waterColors.push(color.r, color.g, color.b);
    if (i < 120 && j < 12) {
      const a = i * 13 + j;
      waterIndices.push(a, a + 1, a + 13, a + 1, a + 14, a + 13);
    }
  }
}
const waterGeometry = new THREE.BufferGeometry();
waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
waterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
waterGeometry.setIndex(waterIndices);
waterGeometry.computeVertexNormals();
const water = mesh(waterGeometry, material('#ffffff', { vertexColors: true, roughness: 0.34, metalness: 0.04 }), island);
water.castShadow = false;

const foamMaterial = material('#f6f7df', { transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
const foamPositions = [], foamIndices = [];
for (let i = 0; i <= 150; i++) {
  const x = -4.95 + i / 150 * 9.9;
  const z = Math.max(backEdge(x) + 0.015, coast(x));
  const width = Math.max(0, Math.min(0.09 + Math.sin(x * 7) * 0.035, z - backEdge(x)));
  foamPositions.push(x, 0.032, z, x, 0.033, z - width);
  if (i < 150) { const a = i * 2; foamIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
}
const foamGeometry = new THREE.BufferGeometry();
foamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
foamGeometry.setIndex(foamIndices);
foamGeometry.computeVertexNormals();
const foam = mesh(foamGeometry, foamMaterial, island);
foam.castShadow = false;

const waveLines = [];
for (let i = 0; i < 28; i++) {
  const x = (random() - 0.5) * 8.6, z = -1.15 - random() * 1.5;
  if (z < backEdge(x) + 0.15 || z > coast(x) - 0.2) continue;
  const width = 0.12 + random() * 0.5;
  const line = tube(island, [[x - width, 0.036, z], [x, 0.036, z - 0.028], [x + width, 0.036, z]], 0.011,
    material('#e4f0d9', { transparent: true, opacity: 0.45, depthWrite: false }));
  line.castShadow = false;
  waveLines.push({ object: line, phase: random() * Math.PI * 2 });
}

// Fine grains, shells, and two thin tire marks make the sand feel lived in.
const grainGeometry = new THREE.BufferGeometry();
const grains = [];
for (let i = 0; i < 1800; i++) {
  const x = (random() - 0.5) * 10, z = (random() - 0.5) * 6.2;
  if ((x / 5) ** 2 + (z / 3.1) ** 2 < 1 && z > coast(x) + 0.08) grains.push(x, 0.004, z);
}
grainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grains, 3));
island.add(new THREE.Points(grainGeometry, new THREE.PointsMaterial({ color: '#ac9366', size: 0.018, transparent: true, opacity: 0.32 })));
const trackMaterial = material('#bb9c66', { transparent: true, opacity: 0.28 });
for (const z of [0.57, 0.66]) {
  const points = Array.from({ length: 30 }, (_, i) => {
    const x = -4.1 + i / 29 * 7.7;
    return [x, 0.006, z + Math.sin(x * 0.5) * 0.12];
  });
  const track = tube(island, points, 0.013, trackMaterial);
  track.castShadow = false;
}

for (let i = 0; i < 22; i++) {
  const x = (random() - 0.5) * 8.8, z = 0.3 + random() * 2.2;
  if ((x / 4.9) ** 2 + (z / 3.0) ** 2 > 0.85 || (Math.abs(x) < 1.9 && z < 1.4)) continue;
  const shell = ellipsoid(island, i % 3 ? palette.cream : palette.coral, [x, 0.045, z], [0.065, 0.025, 0.045]);
  shell.rotation.y = random() * 6;
  for (let j = 0; j < 3; j++) rod(shell, [-0.4 + j * 0.35, 0.7, -0.5], [-0.2 + j * 0.25, 0.8, 0.7], 0.025, palette.sandEdge);
}

// Palm fronds are folded, tapered surfaces rather than flat cutout leaves.
const palms = [];
function palm(x, z, height, lean) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  island.add(group);
  tube(group, [[0, 0, 0], [lean * 0.25, height * 0.4, 0.03], [lean * 0.7, height * 0.78, 0], [lean, height, 0]], 0.105, palette.trunk);
  for (let i = 1; i < 13; i++) {
    const y = i / 13 * height;
    const ring = torus(group, 0.105, 0.014, palette.straw, [lean * (i / 13) ** 1.5, y, 0], [Math.PI / 2, 0, -lean * 0.2]);
    ring.scale.setScalar(1 - i / 40);
  }
  const crown = new THREE.Group();
  crown.position.set(lean, height, 0);
  group.add(crown);
  for (let leaf = 0; leaf < 8; leaf++) {
    const angle = leaf / 8 * Math.PI * 2 + 0.2;
    const length = 1.08 + (leaf % 3) * 0.17;
    const positions = [], indices = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, distance = t * length;
      const width = Math.sin(t * Math.PI) * 0.24 * (1 - t * 0.3);
      const y = Math.sin(t * Math.PI * 0.8) * 0.37 - t * t * 0.7;
      for (const side of [-1, 0, 1]) {
        positions.push(Math.cos(angle) * distance + Math.sin(angle) * width * side,
          y + (side === 0 ? 0.045 : 0), Math.sin(angle) * distance - Math.cos(angle) * width * side);
      }
      if (i < 16) {
        const a = i * 3;
        indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mat = (leaf % 2 ? palette.palm : palette.palmLight).clone();
    mat.side = THREE.DoubleSide;
    mesh(geometry, mat, crown);
    tube(crown, [[0, 0.04, 0], [Math.cos(angle) * length * 0.5, 0.17, Math.sin(angle) * length * 0.5],
      [Math.cos(angle) * length, -0.48, Math.sin(angle) * length]], 0.014, palette.palm);
  }
  for (let i = 0; i < 3; i++) ellipsoid(crown, palette.leather, [Math.cos(i * 2) * 0.15, -0.1, Math.sin(i * 2) * 0.15], [0.12, 0.15, 0.12]);
  palms.push(crown);
}
palm(-3.1, -0.28, 3.35, 0.38);
palm(-4.15, -0.7, 2.55, -0.22);

const board = new THREE.Group();
board.position.set(-2.75, 0.66, 0.15);
board.rotation.set(-0.13, 0.1, -0.35);
island.add(board);
ellipsoid(board, palette.cream, [0, 0, 0], [0.24, 0.85, 0.07]);
ellipsoid(board, palette.mint, [0, 0, 0.064], [0.07, 0.8, 0.015]);
ellipsoid(board, palette.coral, [0.12, -0.1, 0.056], [0.025, 0.66, 0.012]);

function umbrella(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  island.add(group);
  rod(group, [0, 0, 0], [0, 1.95, 0], 0.025, palette.leather);
  const canopy = new THREE.Group();
  canopy.position.y = 1.7;
  canopy.rotation.z = -0.09;
  group.add(canopy);
  for (let panel = 0; panel < 10; panel++) {
    const positions = [], indices = [];
    for (let row = 0; row <= 8; row++) {
      const r = row / 8 * 0.83;
      for (let col = 0; col <= 6; col++) {
        const angle = (panel + col / 6) / 10 * Math.PI * 2;
        const scallop = Math.sin(col / 6 * Math.PI) * (row / 8) ** 5 * 0.05;
        positions.push(Math.cos(angle) * r, 0.29 * (1 - (row / 8) ** 1.4) - scallop, Math.sin(angle) * r);
        if (row < 8 && col < 6) { const a = row * 7 + col; indices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8); }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mat = (panel % 2 ? palette.cream : palette.coral).clone();
    mat.side = THREE.DoubleSide;
    mesh(geometry, mat, canopy);
  }
  ellipsoid(canopy, palette.cream, [0, 0.3, 0], [0.055, 0.07, 0.055]);
  const towel = mesh(new THREE.BoxGeometry(0.72, 0.015, 1.1), palette.cream, group, [0.05, 0.01, 0.22]);
  towel.rotation.y = -0.25;
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.72, 0.006, 0.045), palette.coral, towel, [0, 0.01, -0.42 + i * 0.21]);
  const bag = mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.25, 20), palette.straw, group, [0.55, 0.13, 0.15]);
  torus(bag, 0.11, 0.018, palette.leather, [0, 0.16, 0]);
}
umbrella(3.45, 0.5);

for (const [x, z, scale] of [[3.6, -1.3, 0.33], [3.95, -1.45, 0.22], [-4.6, -0.9, 0.18]]) {
  const rock = mesh(new THREE.DodecahedronGeometry(scale, 1), palette.rock, island, [x, scale * 0.25, z]);
  rock.scale.set(1.1, 0.65, 0.9);
}

const boat = new THREE.Group();
boat.position.set(1.1, 0.07, -2.2);
boat.rotation.y = -0.3;
island.add(boat);
ellipsoid(boat, palette.cream, [0, 0.07, 0], [0.42, 0.12, 0.14]);
ellipsoid(boat, palette.coral, [0, 0.02, 0], [0.4, 0.085, 0.13]);
rod(boat, [0, 0.1, 0], [0, 0.95, 0], 0.013, palette.leather);
const sailGeometry = new THREE.BufferGeometry();
sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.03, 0.9, 0, -0.03, 0.22, 0, -0.48, 0.22, 0], 3));
sailGeometry.computeVertexNormals();
mesh(sailGeometry, material('#f7ead0', { side: THREE.DoubleSide }), boat);

// Percy and his beach cruiser. The bicycle faces +X, with the axles along Z.
const ride = new THREE.Group();
ride.position.set(0.15, 0.025, 0.65);
scene.add(ride);
const wheels = [];
for (const x of [-0.98, 1.02]) {
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.61, 0);
  ride.add(wheel);
  torus(wheel, 0.54, 0.072, palette.dark, [0, 0, 0]);
  for (const z of [-0.051, 0.051]) torus(wheel, 0.54, 0.024, palette.cream, [0, 0, z]);
  torus(wheel, 0.48, 0.018, palette.chrome, [0, 0, 0]);
  rod(wheel, [0, 0, -0.12], [0, 0, 0.12], 0.07, palette.chrome);
  for (let spoke = 0; spoke < 24; spoke++) {
    const angle = spoke / 24 * Math.PI * 2;
    rod(wheel, [0, 0, spoke % 2 ? -0.04 : 0.04], [Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, 0], 0.007, palette.chrome);
  }
  for (const angle of [0.65, 3.8]) {
    const reflector = mesh(new THREE.BoxGeometry(0.06, 0.025, 0.026), palette.orange, wheel, [Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, 0.04]);
    reflector.rotation.z = angle;
  }
  wheels.push(wheel);
  const fenderPoints = Array.from({ length: 25 }, (_, i) => {
    const angle = 0.2 + i / 24 * (Math.PI - 0.4);
    return [x + Math.cos(angle) * 0.64, 0.61 + Math.sin(angle) * 0.64, 0];
  });
  tube(ride, fenderPoints, 0.034, palette.mint);
}

const crankCenter = [-0.13, 0.72, 0], seatStem = [-0.43, 1.49, 0], headset = [0.69, 1.5, 0];
for (const z of [-0.085, 0.085]) {
  rod(ride, [-0.98, 0.61, z], [-0.43, 1.49, z * 0.5], 0.023, palette.mint);
  rod(ride, [-0.98, 0.61, z], [-0.13, 0.72, z * 0.5], 0.025, palette.mint);
  rod(ride, [0.71, 1.49, z], [1.02, 0.61, z], 0.036, palette.mint);
}
rod(ride, crankCenter, seatStem, 0.045, palette.mint);
tube(ride, [seatStem, [-0.01, 1.28, 0], [0.34, 1.32, 0], headset], 0.043, palette.mint);
rod(ride, crankCenter, [0.64, 1.37, 0], 0.045, palette.mint);
rod(ride, [0.65, 1.38, 0], [0.78, 1.71, 0], 0.05, palette.mint);
rod(ride, [-0.43, 1.43, 0], [-0.48, 1.71, 0], 0.033, palette.chrome);
ellipsoid(ride, palette.leather, [-0.48, 1.72, 0], [0.27, 0.07, 0.18]);
rod(ride, [0.77, 1.66, 0], [0.8, 1.94, 0], 0.027, palette.chrome);
tube(ride, [[0.83, 1.94, -0.39], [0.72, 1.96, -0.32], [0.8, 1.94, 0], [0.72, 1.96, 0.32], [0.83, 1.94, 0.39]], 0.026, palette.chrome);
for (const z of [-0.38, 0.38]) rod(ride, [0.76, 1.95, z], [0.96, 1.95, z], 0.044, palette.leather);
ellipsoid(ride, palette.chrome, [0.76, 2, 0.2], [0.065, 0.045, 0.065]);
ellipsoid(ride, palette.cream, [0.93, 1.54, 0], [0.1, 0.105, 0.105]);
ellipsoid(ride, palette.orange, [-1.18, 1.18, 0], [0.035, 0.055, 0.055]);
// A chain runs around the rear hub and chainring, on the far side of the frame.
tube(ride, [[-0.13, 0.91, -0.1], [-0.98, 0.72, -0.1], [-1.09, 0.61, -0.1], [-0.98, 0.5, -0.1], [-0.13, 0.53, -0.1], [0.06, 0.72, -0.1], [-0.13, 0.91, -0.1]], 0.015, palette.dark);
const crank = new THREE.Group();
crank.position.set(...crankCenter);
ride.add(crank);
torus(crank, 0.18, 0.026, palette.chrome, [0, 0, 0.13]);
for (let i = 0; i < 5; i++) {
  const a = i / 5 * Math.PI * 2;
  rod(crank, [0, 0, 0.13], [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.13], 0.018, palette.chrome);
}

// An open wicker basket with visible woven bands and a rolled beach blanket.
const basket = new THREE.Group();
basket.position.set(1.14, 1.57, 0);
ride.add(basket);
const basketBody = mesh(new THREE.CylinderGeometry(0.29, 0.22, 0.34, 32, 1, true), palette.straw, basket);
basketBody.material = palette.straw.clone();
basketBody.material.side = THREE.DoubleSide;
for (let i = 0; i < 6; i++) torus(basket, 0.225 + i * 0.013, 0.012, palette.leather, [0, -0.15 + i * 0.06, 0], [Math.PI / 2, 0, 0]);
for (let i = 0; i < 20; i++) {
  const a = i / 20 * Math.PI * 2;
  rod(basket, [Math.cos(a) * 0.22, -0.17, Math.sin(a) * 0.22], [Math.cos(a) * 0.29, 0.17, Math.sin(a) * 0.29], 0.009, palette.cream);
}
torus(basket, 0.29, 0.025, palette.straw, [0, 0.17, 0], [Math.PI / 2, 0, 0]);
const blanket = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 24), palette.coral, basket, [0.04, 0.2, 0]);
blanket.rotation.z = -0.2;
torus(blanket, 0.07, 0.012, palette.cream, [0, 0.185, 0], [Math.PI / 2, 0, 0]);

const percy = new THREE.Group();
ride.add(percy);
ellipsoid(percy, palette.white, [-0.4, 2.27, 0], [0.7, 0.64, 0.43], -0.14);
ellipsoid(percy, palette.featherLight, [-0.75, 2.07, 0], [0.43, 0.36, 0.35], -0.2);
for (let i = 0; i < 4; i++) ellipsoid(percy, i % 2 ? palette.feather : palette.white,
  [-1.04 - i * 0.045, 2.13 - i * 0.04, (i - 1.5) * 0.095], [0.34, 0.1, 0.085], 0.32 + i * 0.05);

// The thick S-shaped neck and long bill distinguish Percy from a duck or gull.
tube(percy, [[-0.04, 2.34, 0], [0.22, 2.57, 0], [0.12, 2.86, 0], [0.24, 3.14, 0], [0.53, 3.3, 0]], 0.19, palette.white);
ellipsoid(percy, palette.white, [0.03, 2.55, 0], [0.33, 0.41, 0.27], -0.3);
const head = new THREE.Group();
head.position.set(0.53, 3.31, 0);
percy.add(head);
ellipsoid(head, palette.white, [0, 0, 0], [0.39, 0.33, 0.29], -0.04);
// Extruded curved throat pouch, with a separate slender upper mandible.
const pouchShape = new THREE.Shape();
pouchShape.moveTo(0.27, -0.02);
pouchShape.lineTo(1.48, -0.04);
pouchShape.quadraticCurveTo(1.13, -0.28, 0.58, -0.3);
pouchShape.quadraticCurveTo(0.25, -0.28, 0.27, -0.02);
mesh(new THREE.ExtrudeGeometry(pouchShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.035, curveSegments: 24 }), palette.pouch, head, [0, 0, -0.08]);
const billShape = new THREE.Shape();
billShape.moveTo(0.25, 0.04);
billShape.quadraticCurveTo(0.8, 0.08, 1.51, -0.035);
billShape.lineTo(0.28, -0.035);
billShape.closePath();
mesh(new THREE.ExtrudeGeometry(billShape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.018, bevelSegments: 2, steps: 1 }), palette.orange, head, [0, 0, -0.1]);
for (const side of [-1, 1]) {
  tube(head, [[0.31, -0.035, side * 0.13], [0.8, -0.04, side * 0.12], [1.43, -0.045, side * 0.08]], 0.008, palette.leather);
  ellipsoid(head, palette.orange, [0.16, 0.095, side * 0.265], [0.105, 0.115, 0.037]);
  ellipsoid(head, palette.eye, [0.175, 0.105, side * 0.296], [0.059, 0.069, 0.025]);
  ellipsoid(head, palette.white, [0.194, 0.129, side * 0.317], [0.017, 0.02, 0.009]);
  ellipsoid(head, palette.leather, [0.48, 0.02, side * 0.129], [0.025, 0.011, 0.005]);
}

const hat = new THREE.Group();
hat.position.set(-0.03, 0.29, 0);
hat.rotation.z = 0.09;
head.add(hat);
const brim = mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.035, 64), palette.straw, hat);
brim.scale.z = 0.87;
mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.23, 48), palette.straw, hat, [0, 0.13, 0]);
mesh(new THREE.CylinderGeometry(0.304, 0.32, 0.065, 48), palette.mint, hat, [0, 0.054, 0]);
for (const radius of [0.35, 0.39, 0.43, 0.47]) {
  const ring = torus(hat, radius, 0.004, palette.cream, [0, 0.02, 0], [Math.PI / 2, 0, 0]);
  ring.scale.y = 0.87;
}

// Folded flight feathers on the far wing; the near wing reaches the handlebar.
ellipsoid(percy, palette.featherLight, [-0.46, 2.26, -0.37], [0.59, 0.32, 0.12], -0.25);
for (let i = 0; i < 5; i++) ellipsoid(percy, i % 2 ? palette.white : palette.feather,
  [-0.67 + i * 0.11, 2.13 + i * 0.055, -0.46], [0.3, 0.062, 0.045], 0.2);
ellipsoid(percy, palette.featherLight, [-0.19, 2.31, 0.36], [0.49, 0.29, 0.16], -0.39);
ellipsoid(percy, palette.white, [0.36, 2.13, 0.39], [0.55, 0.18, 0.12], -0.33);
for (let i = 0; i < 4; i++) ellipsoid(percy, i % 2 ? palette.featherLight : palette.white,
  [0.62 + i * 0.033, 2.04 - i * 0.04, 0.4 + i * 0.012], [0.33, 0.055, 0.048], -0.2);

const scarf = new THREE.Group();
scarf.position.set(0.12, 2.79, 0);
percy.add(scarf);
const scarfRing = torus(scarf, 0.2, 0.057, palette.mint, [0, 0, 0], [Math.PI / 2, 0, 0]);
scarfRing.scale.x = 1.15;
ellipsoid(scarf, palette.mint, [-0.15, -0.045, 0.18], [0.1, 0.09, 0.08]);
const scarfTail = ellipsoid(scarf, palette.mint, [-0.4, 0.025, 0.16], [0.29, 0.09, 0.035], -0.13);

const legs = [];
for (const side of [-1, 1]) {
  const hip = v(-0.36, 1.95, side * 0.25);
  ellipsoid(percy, palette.featherLight, hip.toArray(), [0.21, 0.25, 0.18]);
  const upper = mesh(new THREE.CylinderGeometry(0.057, 0.055, 1, 12), palette.foot, ride);
  const lower = mesh(new THREE.CylinderGeometry(0.043, 0.055, 1, 12), palette.foot, ride);
  const knee = ellipsoid(ride, palette.foot, [0, 0, 0], [0.075, 0.075, 0.065]);
  const foot = new THREE.Group();
  ride.add(foot);
  const footShape = new THREE.Shape();
  footShape.moveTo(-0.08, -0.06);
  footShape.lineTo(0.25, -0.16);
  footShape.lineTo(0.2, -0.05);
  footShape.lineTo(0.31, 0);
  footShape.lineTo(0.2, 0.05);
  footShape.lineTo(0.25, 0.15);
  footShape.lineTo(-0.08, 0.06);
  footShape.closePath();
  const web = mesh(new THREE.ExtrudeGeometry(footShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.015, bevelSegments: 2, steps: 1 }), palette.foot, foot);
  web.rotation.x = -Math.PI / 2;
  const pedal = mesh(new THREE.BoxGeometry(0.21, 0.055, 0.2), palette.dark, ride);
  const arm = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 12), palette.chrome, ride);
  legs.push({ side, hip, upper, lower, knee, foot, pedal, arm });
}

const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const shadowContext = shadowCanvas.getContext('2d');
const gradient = shadowContext.createRadialGradient(64, 64, 3, 64, 64, 64);
gradient.addColorStop(0, 'rgba(71,64,35,0.23)');
gradient.addColorStop(1, 'rgba(71,64,35,0)');
shadowContext.fillStyle = gradient;
shadowContext.fillRect(0, 0, 128, 128);
const contactShadow = mesh(new THREE.PlaneGeometry(3.7, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }), ride, [0, -0.005, 0]);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.castShadow = false;
const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.075 }), scene, [0, -0.335, 0]);
ground.rotation.x = -Math.PI / 2;
ground.castShadow = false;

// A pair of tiny gulls drift above the edge of the miniature.
const gulls = [];
for (let i = 0; i < 2; i++) {
  const gull = new THREE.Group();
  gull.position.set(1.8 + i * 1.1, 3.7 + i * 0.28, -2.4);
  scene.add(gull);
  const mat = material('#899b82');
  tube(gull, [[-0.24, 0.04, 0], [-0.12, 0.1, 0], [0, 0, 0], [0.12, 0.1, 0], [0.24, 0.04, 0]], 0.018, mat);
  gulls.push(gull);
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { playing: !reducedMotion.matches, speed: 0.8, golden: false, sound: false, view: 'postcard' };
let cameraTransition = null;
const views = {
  postcard: { position: v(7.5, 6.2, 11.5), target: v(0, 1.1, 0) },
  close: { position: v(4.3, 3.5, 7.2), target: v(0.25, 2, 0.6) },
};
function setView(name, immediate = false) {
  state.view = name;
  const view = views[name];
  const position = view.position.clone();
  if (name === 'postcard' && container.clientWidth < 600) position.multiplyScalar(1.08);
  if (immediate) {
    camera.position.copy(position);
    controls.target.copy(view.target);
    controls.update();
  } else cameraTransition = { position, target: view.target.clone() };
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
controls.addEventListener('start', () => { cameraTransition = null; });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelector('#reset').addEventListener('click', () => setView('postcard'));

function updatePlayButton() {
  document.querySelector('#play').setAttribute('aria-label', state.playing ? 'Pause the ride' : 'Resume the ride');
  document.querySelector('#play').setAttribute('aria-pressed', String(!state.playing));
  document.querySelector('#play-symbol').className = state.playing ? 'pause-symbol' : 'play-symbol';
  document.querySelector('#ride-status').textContent = state.playing ? 'Enjoying the ride' : 'Taking a little breather';
}
document.querySelector('#play').addEventListener('click', () => { state.playing = !state.playing; updatePlayButton(); });
updatePlayButton();

document.querySelector('#pace').addEventListener('input', event => {
  state.speed = Number(event.target.value);
  document.querySelector('#pace-value').textContent = state.speed < 0.6 ? 'Unhurried' : state.speed < 1.2 ? 'Easy breezy' : 'Feeling the breeze';
  event.target.style.background = `linear-gradient(to right, #708c74 ${(state.speed - 0.3) / 1.5 * 100}%, #d9dfce 0%)`;
});
document.querySelector('#sunlight').addEventListener('click', event => {
  state.golden = !state.golden;
  event.currentTarget.setAttribute('aria-pressed', String(state.golden));
  document.querySelector('#weather').textContent = state.golden ? '25° & golden' : '27° & sunny';
});

let toastTimeout;
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove('visible'), 3200);
}

// The optional surf ambience is synthesized locally; no audio files are needed.
let audioContext, surfGain;
async function toggleSound() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 8, audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < samples.length; i++) {
        previous = (previous + (Math.random() * 2 - 1) * 0.04) / 1.02;
        samples[i] = previous * 4;
      }
      const surfSource = audioContext.createBufferSource();
      surfSource.buffer = buffer;
      surfSource.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 850;
      surfGain = audioContext.createGain();
      surfGain.gain.value = 0;
      surfSource.connect(filter).connect(surfGain).connect(audioContext.destination);
      surfSource.start();
    }
    await audioContext.resume();
    state.sound = !state.sound;
    surfGain.gain.setTargetAtTime(state.sound ? 0.26 : 0, audioContext.currentTime, 0.4);
    document.querySelector('#sound').setAttribute('aria-pressed', String(state.sound));
    document.querySelector('.sound-state').textContent = state.sound ? 'ON' : 'OFF';
  } catch {
    toast('Ocean sounds aren’t available in this browser.');
  }
}
document.querySelector('#sound').addEventListener('click', toggleSound);

document.querySelector('#postcard').addEventListener('click', () => {
  renderer.render(scene, camera);
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 1400;
  const context = canvas.getContext('2d');
  context.fillStyle = state.golden ? '#f7ead7' : '#f7f5ec';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(1700 / renderer.domElement.width, 1130 / renderer.domElement.height);
  const width = renderer.domElement.width * scale, height = renderer.domElement.height * scale;
  context.drawImage(renderer.domElement, (1800 - width) / 2, 40 + (1130 - height) / 2, width, height);
  context.fillStyle = '#294f46';
  context.textAlign = 'center';
  context.font = 'italic 64px Georgia';
  context.fillText('Life in the slow lane.', 900, 1230);
  context.font = '20px sans-serif';
  context.fillText('THE SLOW COAST  /  A LITTLE SEASIDE ESCAPE', 900, 1295);
  canvas.toBlob(blob => {
    if (!blob) return toast('The postcard couldn’t be saved. Please try again.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'the-slow-coast-postcard.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('A little piece of the coast, yours to keep.');
  }, 'image/png');
});

function resize() {
  const width = container.clientWidth, height = container.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container);
resize();
setView('postcard', true);

function positionLimb(object, start, end) {
  object.position.copy(start).add(end).multiplyScalar(0.5);
  object.scale.y = start.distanceTo(end);
  object.quaternion.setFromUnitVectors(v(0, 1, 0), end.clone().sub(start).normalize());
}

let lastTime = performance.now(), rideTime = 0, worldTime = 0, goldenBlend = 0;
const noonColor = new THREE.Color('#fff1cc'), goldenColor = new THREE.Color('#ffd18e');
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!document.hidden) {
    if (state.playing) rideTime += delta * state.speed;
    if (!reducedMotion.matches) worldTime += delta;
  }
  const angle = -rideTime * 2.6;
  wheels.forEach(wheel => { wheel.rotation.z = angle; });
  crank.rotation.z = angle;
  ride.position.x = 0.15 + Math.sin(rideTime * 0.35) * 0.47;
  ride.rotation.y = Math.sin(rideTime * 0.35) * 0.025;
  percy.position.y = Math.sin(rideTime * 5.2) * 0.018;
  head.rotation.z = Math.sin(rideTime * 1.4) * 0.025;
  scarfTail.rotation.z = -0.13 + Math.sin(rideTime * 7) * 0.08;

  for (const leg of legs) {
    const phase = angle + (leg.side < 0 ? Math.PI : 0);
    const pedal = v(crankCenter[0] + Math.cos(phase) * 0.24, crankCenter[1] + Math.sin(phase) * 0.24, leg.side * 0.3);
    const ankle = pedal.clone().add(v(-0.05, 0.07, 0));
    // Two-link inverse kinematics keeps the leg lengths constant through the cycle.
    const hip = leg.hip.clone().add(v(0, percy.position.y, 0));
    const distance = hip.distanceTo(ankle);
    const upperLength = 0.76, lowerLength = 0.76;
    const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    const direction = ankle.clone().sub(hip).normalize();
    const perpendicular = v(-direction.y, direction.x, 0).normalize().multiplyScalar(-1);
    const knee = hip.clone().addScaledVector(direction, along).addScaledVector(perpendicular, bend);
    positionLimb(leg.upper, hip, knee);
    positionLimb(leg.lower, knee, ankle);
    leg.knee.position.copy(knee);
    leg.foot.position.copy(ankle);
    leg.foot.rotation.z = Math.sin(phase) * 0.09;
    leg.pedal.position.copy(pedal);
    positionLimb(leg.arm, v(...crankCenter).add(v(0, 0, leg.side * 0.18)), pedal);
  }

  palms.forEach((crown, i) => { crown.rotation.z = Math.sin(worldTime * 0.8 + i) * 0.025; });
  waveLines.forEach(({ object, phase }) => {
    object.position.z = Math.sin(worldTime * 0.6 + phase) * 0.045;
    object.material.opacity = 0.3 + Math.sin(worldTime * 0.8 + phase) * 0.18;
  });
  foam.material.opacity = 0.6 + Math.sin(worldTime * 0.7) * 0.15;
  boat.rotation.z = Math.sin(worldTime * 1.2) * 0.04;
  boat.position.y = 0.07 + Math.sin(worldTime * 1.2) * 0.018;
  gulls.forEach((gull, i) => {
    gull.position.y = 3.7 + i * 0.28 + Math.sin(worldTime * 0.8 + i) * 0.07;
    gull.rotation.z = Math.sin(worldTime + i) * 0.05;
  });
  goldenBlend = THREE.MathUtils.damp(goldenBlend, state.golden ? 1 : 0, 3, delta);
  sunlight.color.copy(noonColor).lerp(goldenColor, goldenBlend);
  sunlight.position.set(-3 - goldenBlend * 3, 8 - goldenBlend * 3.5, 5);
  hemisphere.intensity = 2.5 - goldenBlend * 0.55;
  renderer.toneMappingExposure = 1.3 - goldenBlend * 0.08;
  if (state.sound && surfGain) {
    surfGain.gain.setTargetAtTime(0.2 + Math.sin(worldTime * 0.45) * 0.08, audioContext.currentTime, 0.3);
  }
  if (cameraTransition) {
    const blend = 1 - Math.exp(-delta * 5);
    camera.position.lerp(cameraTransition.position, blend);
    controls.target.lerp(cameraTransition.target, blend);
    if (camera.position.distanceTo(cameraTransition.position) < 0.01) cameraTransition = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
document.querySelector('#loading').remove();
