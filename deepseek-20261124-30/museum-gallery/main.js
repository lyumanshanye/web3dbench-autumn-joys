import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const sceneHost = document.querySelector('#scene');
const loadingScreen = document.querySelector('#loading-screen');
const app = document.querySelector('#app');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCompact = () => window.innerWidth <= 820;
const pageStartedAt = performance.now();

function detectRendererBackend() {
  const probe = document.createElement('canvas');
  const context = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!context) return { software: true, name: 'Unavailable' };
  const info = context.getExtension('WEBGL_debug_renderer_info');
  const name = info
    ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
    : context.getParameter(context.RENDERER);
  return { software: !info || /swiftshader|llvmpipe|software|basic render/i.test(name || ''), name };
}

const backend = detectRendererBackend();
const softwareRenderer = backend.software;
if (softwareRenderer) document.documentElement.classList.add('software-renderer');

const renderer = new THREE.WebGLRenderer({
  antialias: !softwareRenderer,
  powerPreference: 'high-performance',
});
const gl = renderer.getContext();
const gpuName = backend.name;
const debugTimings = { gpuName, softwareRenderer, pageStartedAt };

renderer.setPixelRatio(Math.min(window.devicePixelRatio, softwareRenderer ? 0.82 : isCompact() ? 1.6 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = !softwareRenderer;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050807);
scene.fog = new THREE.FogExp2(0x050807, 0.028);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 2.35, 10.7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.35, 1.58, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.052;
controls.enablePan = false;
controls.rotateSpeed = 0.38;
controls.zoomSpeed = 0.65;
controls.minDistance = 5.5;
controls.maxDistance = 16;
controls.minPolarAngle = 0.82;
controls.maxPolarAngle = 1.5;
controls.minAzimuthAngle = -0.58;
controls.maxAzimuthAngle = 0.58;

const clock = new THREE.Clock();
const pointer = new THREE.Vector2(10, 10);
const raycaster = new THREE.Raycaster();
const tempVector = new THREE.Vector3();
const tempVectorB = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

const artifacts = [];
const pickTargets = [];
const tags = new Map();
const ambientAnimations = [];
const dustParticles = [];
const gold = 0xc9a96b;
const artifactsById = new Map();

let selectedArtifact = null;
let hoveredArtifact = null;
let cameraTween = null;
let hasInteracted = false;
let autoRotateUntil = 0;
let pointerDown = null;
let firstFrameRendered = false;
let loadingHidden = false;
let elapsed = 0;
let introBounds = null;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(0x50e8ab89);

function lerpEase(t) {
  return 1 - Math.pow(1 - t, 3);
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createFallbackEnvironment() {
  const faces = [];
  for (let i = 0; i < 6; i += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, i === 2 ? '#8d8069' : '#343b37');
    gradient.addColorStop(0.55, '#161d1a');
    gradient.addColorStop(1, '#050807');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    if (i === 2) {
      const glow = ctx.createRadialGradient(34, 24, 0, 34, 24, 29);
      glow.addColorStop(0, 'rgba(255, 225, 170, 0.95)');
      glow.addColorStop(0.3, 'rgba(207, 163, 100, 0.35)');
      glow.addColorStop(1, 'rgba(90, 68, 42, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
    }
    faces.push(canvas);
  }
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  return cube;
}

function createMarbleTexture(options = {}) {
  const {
    base = '#09110f',
    light = '#23302b',
    vein = '#927b53',
    size = softwareRenderer ? 512 : 1024,
    seed = 137,
  } = options;
  const rand = mulberry32(seed);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 42; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const radius = 35 + rand() * 185;
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, `rgba(86, 105, 94, ${0.018 + rand() * 0.035})`);
    bloom.addColorStop(1, 'rgba(86, 105, 94, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i += 1) {
    let x = -40 + rand() * size * 0.5;
    let y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j += 1) {
      const nx = x + 95 + rand() * 210;
      const ny = y + (rand() - 0.5) * 180;
      ctx.bezierCurveTo(
        x + 45,
        y + (rand() - 0.5) * 70,
        nx - 45,
        ny + (rand() - 0.5) * 70,
        nx,
        ny,
      );
      x = nx;
      y = ny;
    }
    ctx.strokeStyle = `rgba(164, 143, 94, ${0.035 + rand() * 0.11})`;
    ctx.lineWidth = 0.45 + rand() * 1.3;
    ctx.stroke();
  }

  for (let i = 0; i < 430; i += 1) {
    const alpha = 0.025 + rand() * 0.07;
    ctx.fillStyle = rand() > 0.72 ? `rgba(166, 150, 108, ${alpha})` : `rgba(116, 137, 123, ${alpha})`;
    ctx.fillRect(rand() * size, rand() * size, 0.5 + rand() * 1.7, 0.5 + rand() * 1.1);
  }

  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createPotteryTexture() {
  const canvas = document.createElement('canvas');
  const textureScale = softwareRenderer ? 0.5 : 1;
  canvas.width = 512 * textureScale;
  canvas.height = 1024 * textureScale;
  const ctx = canvas.getContext('2d');
  ctx.scale(textureScale, textureScale);

  const clay = ctx.createLinearGradient(0, 0, 512, 0);
  clay.addColorStop(0, '#7d3f26');
  clay.addColorStop(0.18, '#b8683d');
  clay.addColorStop(0.46, '#d0804d');
  clay.addColorStop(0.72, '#b65e38');
  clay.addColorStop(1, '#6f351f');
  ctx.fillStyle = clay;
  ctx.fillRect(0, 0, 512, 1024);

  ctx.fillStyle = 'rgba(34, 17, 11, 0.95)';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillRect(0, 70, 512, 28);
  ctx.fillRect(0, 155, 512, 13);
  ctx.fillRect(0, 752, 512, 22);
  ctx.fillRect(0, 938, 512, 86);

  ctx.strokeStyle = 'rgba(28, 14, 9, 0.94)';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'miter';
  for (let i = -1; i < 9; i += 1) {
    const x = i * 74;
    ctx.beginPath();
    ctx.moveTo(x, 352);
    ctx.lineTo(x, 452);
    ctx.lineTo(x + 48, 452);
    ctx.lineTo(x + 48, 390);
    ctx.lineTo(x + 22, 390);
    ctx.lineTo(x + 22, 424);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(32, 15, 9, 0.72)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 15; i += 1) {
    const x = 9 + i * 36;
    ctx.beginPath();
    ctx.moveTo(x, 548);
    ctx.quadraticCurveTo(x + 18, 515, x + 36, 548);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(30, 14, 8, 0.78)';
  for (let i = 0; i < 18; i += 1) {
    const x = 14 + i * 29;
    const h = 9 + (i % 3) * 5;
    ctx.fillRect(x, 206, 4, h);
  }

  for (let i = 0; i < 150; i += 1) {
    ctx.fillStyle = `rgba(248, 198, 137, ${0.025 + random() * 0.08})`;
    ctx.fillRect(random() * 512, random() * 1024, 1, 1 + random() * 3);
  }

  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 206, 135, 0.5)');
  gradient.addColorStop(0.28, 'rgba(204, 151, 82, 0.18)');
  gradient.addColorStop(1, 'rgba(136, 92, 45, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return canvasTexture(canvas);
}

function createStripedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#143042';
  ctx.fillRect(0, 0, 128, 512);
  ctx.fillStyle = '#c5a262';
  for (let y = -40; y < 560; y += 44) {
    ctx.fillRect(0, y, 128, 11);
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1.2);
  return texture;
}

function createPlaqueTexture(index, title) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b100e';
  ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = 'rgba(201, 169, 107, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, 496, 96);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c6aa73';
  ctx.font = '21px Georgia, serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(index, 256, 42);
  ctx.fillStyle = '#d9d2c3';
  ctx.font = '19px Helvetica, Arial, sans-serif';
  ctx.fillText(title.toUpperCase(), 256, 72);
  return canvasTexture(canvas);
}

const floorTexture = createMarbleTexture({ base: '#07100e', seed: 921 });
floorTexture.repeat.set(3.5, 3.5);
const stoneTexture = createMarbleTexture({ base: '#141c1a', seed: 447, size: 512 });
stoneTexture.repeat.set(1.8, 1.8);
const potteryTexture = createPotteryTexture();
const stripedTexture = createStripedTexture();
const glowTexture = createGlowTexture();

const materials = {
  floor: surfaceMaterial({
    color: 0xa7b3aa,
    map: floorTexture,
    roughness: 0.19,
    metalness: 0.38,
    clearcoat: 0.9,
    clearcoatRoughness: 0.13,
    envMapIntensity: 1.15,
  }),
  stone: surfaceMaterial({
    color: 0x747d76,
    map: stoneTexture,
    roughness: 0.43,
    metalness: 0.12,
    clearcoat: 0.24,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.55,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    color: 0x1a211f,
    roughness: 0.72,
    metalness: 0.1,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0x0d1412,
    roughness: 0.94,
    metalness: 0.02,
    side: THREE.BackSide,
  }),
  wallTrim: new THREE.MeshStandardMaterial({
    color: 0x262b25,
    roughness: 0.64,
    metalness: 0.24,
  }),
  arch: new THREE.MeshStandardMaterial({
    color: 0x0e1715,
    emissive: 0x0c1713,
    emissiveIntensity: 0.5,
    roughness: 0.95,
    side: THREE.DoubleSide,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: gold,
    roughness: 0.25,
    metalness: 1,
    envMapIntensity: 1.35,
  }),
  brassDark: new THREE.MeshStandardMaterial({
    color: 0x725a31,
    roughness: 0.42,
    metalness: 0.9,
    envMapIntensity: 0.9,
  }),
  goldGlow: new THREE.MeshStandardMaterial({
    color: 0xc6a25e,
    emissive: 0x8f6429,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.9,
  }),
  marble: surfaceMaterial({
    color: 0xd9d1c2,
    roughness: 0.34,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.54,
    envMapIntensity: 0.7,
  }),
  marbleShadow: surfaceMaterial({
    color: 0xb6ac9c,
    roughness: 0.46,
    metalness: 0.01,
    clearcoat: 0.12,
    envMapIntensity: 0.56,
  }),
  marbleDetail: new THREE.MeshStandardMaterial({
    color: 0x736c62,
    roughness: 0.68,
    metalness: 0,
  }),
  pottery: new THREE.MeshStandardMaterial({
    map: potteryTexture,
    color: 0xd59a78,
    roughness: 0.43,
    metalness: 0.04,
    envMapIntensity: 0.62,
  }),
  potteryDark: new THREE.MeshStandardMaterial({
    color: 0x281710,
    roughness: 0.5,
    metalness: 0.04,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x536f5d,
    roughness: 0.45,
    metalness: 0.95,
    envMapIntensity: 1.05,
  }),
  bronzeHighlight: new THREE.MeshStandardMaterial({
    color: 0x9a702f,
    roughness: 0.3,
    metalness: 1,
    envMapIntensity: 1.25,
  }),
  lapis: new THREE.MeshStandardMaterial({
    color: 0x183a56,
    roughness: 0.3,
    metalness: 0.4,
    envMapIntensity: 0.8,
  }),
  striped: new THREE.MeshStandardMaterial({
    map: stripedTexture,
    roughness: 0.46,
    metalness: 0.25,
    envMapIntensity: 0.65,
  }),
  eye: new THREE.MeshStandardMaterial({
    color: 0x151817,
    roughness: 0.42,
    metalness: 0.15,
  }),
};

if (softwareRenderer) {
  scene.environment = createFallbackEnvironment();
} else {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();
}
debugTimings.sceneBuilt = performance.now() - pageStartedAt;

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function surfaceMaterial(parameters) {
  if (!softwareRenderer) return new THREE.MeshPhysicalMaterial(parameters);
  const { clearcoat, clearcoatRoughness, ...standardParameters } = parameters;
  return new THREE.MeshStandardMaterial(standardParameters);
}

function addRodBetween(parent, start, end, radius, material, radialSegments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const rod = mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(upVector, direction.normalize());
  parent.add(rod);
  return rod;
}

function createFloorInlay() {
  const group = new THREE.Group();
  const ringMaterial = materials.brassDark;

  [2.12, 2.4, 4.78, 5.02].forEach((radius, index) => {
    const ring = mesh(
      new THREE.RingGeometry(radius, radius + (index % 2 === 0 ? 0.012 : 0.006), 128),
      ringMaterial,
      [0, 0.012, 0],
      [-Math.PI / 2, 0, 0],
    );
    ring.castShadow = false;
    group.add(ring);
  });

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const radial = mesh(new THREE.BoxGeometry(0.012, 0.008, 2.28), ringMaterial, [
      Math.sin(angle) * 3.56,
      0.012,
      Math.cos(angle) * 3.56,
    ], [0, angle, 0]);
    radial.castShadow = false;
    group.add(radial);
  }

  scene.add(group);
}

function createRoom() {
  const floor = mesh(
    new THREE.CircleGeometry(15, 128),
    materials.floor,
    [0, 0, 0],
    [-Math.PI / 2, 0, 0],
  );
  floor.receiveShadow = true;
  floor.castShadow = false;
  scene.add(floor);

  const wall = mesh(
    new THREE.CylinderGeometry(12.2, 12.35, 10, 128, 1, true),
    materials.wall,
    [0, 4.9, 0],
  );
  wall.castShadow = false;
  wall.receiveShadow = true;
  scene.add(wall);

  const cornice = mesh(new THREE.CylinderGeometry(12.1, 12.1, 0.28, 128, 1, true), materials.wallTrim, [0, 6.25, 0]);
  cornice.castShadow = false;
  scene.add(cornice);

  [0.32, 6.12].forEach((height, index) => {
    const brassLine = mesh(
      new THREE.TorusGeometry(11.92, index === 0 ? 0.022 : 0.014, 5, 160),
      materials.brassDark,
      [0, height, 0],
      [Math.PI / 2, 0, 0],
    );
    brassLine.castShadow = false;
    scene.add(brassLine);
  });

  const dome = mesh(
    new THREE.SphereGeometry(12.15, 80, 32, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x070b0a,
      roughness: 1,
      side: THREE.BackSide,
    }),
    [0, 5.9, 0],
  );
  dome.scale.y = 0.46;
  dome.castShadow = false;
  scene.add(dome);

  const oculus = mesh(
    new THREE.TorusGeometry(1.12, 0.035, 8, 96),
    materials.brassDark,
    [0, 11.45, 0],
    [Math.PI / 2, 0, 0],
  );
  oculus.castShadow = false;
  scene.add(oculus);

  createFloorInlay();
  createWallArchitecture();
}

function createPilaster(x, z, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  group.add(mesh(new THREE.BoxGeometry(0.62, 0.16, 0.62), materials.stoneDark, [0, 0.08, 0]));
  const shaft = mesh(new THREE.CylinderGeometry(0.2, 0.24, 5.45, 12, 1), materials.stoneDark, [0, 2.84, 0]);
  shaft.material = materials.stoneDark;
  group.add(shaft);

  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const flute = mesh(
      new THREE.BoxGeometry(0.015, 5.25, 0.012),
      materials.brassDark,
      [Math.sin(angle) * 0.225, 2.84, Math.cos(angle) * 0.225],
      [0, angle, 0],
    );
    flute.castShadow = false;
    group.add(flute);
  }

  group.add(mesh(new THREE.BoxGeometry(0.54, 0.12, 0.54), materials.wallTrim, [0, 5.59, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.44, 0.055, 0.44), materials.brassDark, [0, 5.68, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), materials.brassDark, [0, 0.19, 0]));
  scene.add(group);
}

function createWallArchitecture() {
  const archData = [
    { x: -4.55, width: 3.7, height: 5.55, depth: -8.72 },
    { x: 0, width: 5.15, height: 6.45, depth: -9.36 },
    { x: 4.55, width: 3.7, height: 5.55, depth: -8.72 },
  ];

  archData.forEach((arch, archIndex) => {
    const radius = arch.width / 2;
    const spring = arch.height - radius;
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    shape.lineTo(-radius, spring);
    shape.absarc(0, spring, radius, Math.PI, 0, true);
    shape.lineTo(radius, 0);
    shape.closePath();

    const panel = mesh(new THREE.ShapeGeometry(shape, 48), materials.arch, [arch.x, 0.03, arch.depth]);
    panel.receiveShadow = true;
    panel.castShadow = false;
    scene.add(panel);

    const borderPoints = [];
    borderPoints.push(new THREE.Vector3(-radius, 0.02, 0));
    borderPoints.push(new THREE.Vector3(-radius, spring, 0));
    for (let i = 1; i <= 28; i += 1) {
      const angle = Math.PI - (i / 28) * Math.PI;
      borderPoints.push(new THREE.Vector3(Math.cos(angle) * radius, spring + Math.sin(angle) * radius, 0));
    }
    borderPoints.push(new THREE.Vector3(radius, 0.02, 0));
    const borderCurve = new THREE.CatmullRomCurve3(borderPoints, false, 'centripetal', 0.1);
    const border = mesh(
      new THREE.TubeGeometry(borderCurve, 110, 0.019, 6, false),
      materials.brassDark,
      [arch.x, 0.03, arch.depth + 0.025],
    );
    border.castShadow = false;
    scene.add(border);

    const threshold = mesh(
      new THREE.BoxGeometry(arch.width * 0.9, 0.018, 0.035),
      materials.goldGlow,
      [arch.x, 0.09, arch.depth + 0.03],
    );
    threshold.castShadow = false;
    scene.add(threshold);

    if (archIndex === 1) {
      const haloGroup = new THREE.Group();
      haloGroup.position.set(0, 3.65, -4.44);
      scene.add(haloGroup);

      [2.06, 2.35].forEach((haloRadius, index) => {
        const halo = mesh(
          new THREE.TorusGeometry(haloRadius, index === 0 ? 0.018 : 0.009, 7, 160),
          index === 0 ? materials.goldGlow : materials.brassDark,
          [0, 0, 0],
        );
        halo.castShadow = false;
        haloGroup.add(halo);
      });

      for (let i = 0; i < 32; i += 1) {
        const angle = (i / 32) * Math.PI * 2;
        const tick = mesh(
          new THREE.BoxGeometry(i % 4 === 0 ? 0.014 : 0.007, i % 4 === 0 ? 0.12 : 0.065, 0.008),
          materials.brassDark,
          [Math.cos(angle) * 2.48, Math.sin(angle) * 2.48, 0],
          [0, 0, angle - Math.PI / 2],
        );
        tick.castShadow = false;
        haloGroup.add(tick);
      }
    }
  });

  createPilaster(-7.85, -7.24, 0.45);
  createPilaster(7.85, -7.24, -0.45);
  createPilaster(-4.65, -10.45, 0.18);
  createPilaster(4.65, -10.45, -0.18);
}

function createLighting() {
  const ambient = new THREE.AmbientLight(0x819188, 0.32);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0x6f8c84, 0x090603, 0.58);
  scene.add(hemisphere);

  const backLight = new THREE.DirectionalLight(0x779a94, 0.82);
  backLight.position.set(2.5, 7.5, -6);
  scene.add(backLight);

  const rimLight = new THREE.DirectionalLight(0xd3a564, 0.32);
  rimLight.position.set(-7, 4.5, 3.5);
  scene.add(rimLight);

  const warmCoveLeft = new THREE.PointLight(0xb9763e, 22, 15, 2);
  warmCoveLeft.position.set(-8.8, 4.4, -5.5);
  scene.add(warmCoveLeft);

  const warmCoveRight = new THREE.PointLight(0xb9763e, 19, 15, 2);
  warmCoveRight.position.set(8.8, 4.4, -5.5);
  scene.add(warmCoveRight);

  const coolCove = new THREE.PointLight(0x527d80, 16, 18, 2);
  coolCove.position.set(0, 6.7, -4.3);
  scene.add(coolCove);
}

function createPedestal(width, height, depth) {
  const group = new THREE.Group();
  const base = mesh(
    new RoundedBoxGeometry(width + 0.16, 0.075, depth + 0.16, 3, 0.018),
    materials.stoneDark,
    [0, 0.04, 0],
  );
  group.add(base);

  const body = mesh(
    new RoundedBoxGeometry(width, height - 0.15, depth, 4, 0.018),
    materials.stone,
    [0, height * 0.5, 0],
  );
  group.add(body);

  const top = mesh(
    new RoundedBoxGeometry(width + 0.09, 0.08, depth + 0.09, 3, 0.014),
    materials.wallTrim,
    [0, height - 0.04, 0],
  );
  group.add(top);

  const topLine = mesh(new THREE.BoxGeometry(width + 0.1, 0.009, depth + 0.1), materials.brassDark, [0, height + 0.006, 0]);
  topLine.castShadow = false;
  group.add(topLine);
  return group;
}

function createPlaque(index, title, width, height, depth) {
  const plaque = mesh(
    new THREE.PlaneGeometry(width * 0.56, width * 0.125),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture(index, title) }),
    [0, height * 0.58, depth / 2 + 0.011],
  );
  plaque.castShadow = false;
  plaque.receiveShadow = false;
  return plaque;
}

function createFloorGlow() {
  const plane = mesh(
    new THREE.PlaneGeometry(3.3, 3.3),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [0, 0.016, 0],
    [-Math.PI / 2, 0, 0],
  );
  plane.castShadow = false;
  plane.receiveShadow = false;
  plane.renderOrder = 2;
  return plane;
}

function createBeam() {
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xe8be7b) },
      uOpacity: { value: 0.075 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float sideFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float lengthFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.62, vUv.y);
        gl_FragColor = vec4(uColor, uOpacity * sideFade * lengthFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const beam = mesh(new THREE.CylinderGeometry(0.045, 0.84, 4.25, 32, 1, true), beamMaterial, [0, 3.65, 0.08]);
  beam.castShadow = false;
  beam.receiveShadow = false;
  beam.renderOrder = 3;
  return beam;
}

function createSpotlight(isHero) {
  const light = new THREE.SpotLight(0xffd39a, isHero ? 96 : 58, 9.5, 0.47, 0.78, 1.65);
  light.position.set(0, 5.2, 1.3);
  light.target.position.set(0, isHero ? 1.5 : 1.1, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(isHero ? 1024 : 512, isHero ? 1024 : 512);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 8;
  light.shadow.bias = -0.0002;
  light.shadow.radius = 4;
  return light;
}

function createGlowPoint() {
  const light = new THREE.PointLight(0xffc77d, 3, 3.4, 2);
  light.position.set(0, 2.35, 0.9);
  return light;
}

function createBust() {
  const group = new THREE.Group();

  const torsoGeo = new THREE.SphereGeometry(1, 48, 36, 0, Math.PI * 2, 0, Math.PI);
  const torso = mesh(torsoGeo, materials.marble, [0, 0.52, 0]);
  torso.scale.set(0.69, 0.62, 0.42);
  group.add(torso);

  const shoulder = mesh(new THREE.SphereGeometry(0.52, 40, 24), materials.marbleShadow, [0, 0.65, -0.01]);
  shoulder.scale.set(1.2, 0.26, 0.72);
  group.add(shoulder);

  const neck = mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 28), materials.marble, [0, 1.03, 0]);
  group.add(neck);

  const head = mesh(new THREE.SphereGeometry(1, 64, 48), materials.marble, [0, 1.37, 0.015]);
  head.scale.set(0.31, 0.41, 0.31);
  head.rotation.set(-0.04, -0.2, 0.025);
  group.add(head);

  const jaw = mesh(new THREE.SphereGeometry(0.25, 32, 24), materials.marble, [0, 1.19, 0.09]);
  jaw.scale.set(0.86, 0.72, 0.78);
  group.add(jaw);

  const nose = mesh(new THREE.ConeGeometry(0.047, 0.18, 8), materials.marble, [0, 1.37, 0.323], [Math.PI / 2.1, 0, 0]);
  nose.castShadow = true;
  group.add(nose);

  [-1, 1].forEach((side) => {
    const eye = mesh(new THREE.SphereGeometry(0.055, 16, 10), materials.marbleDetail, [side * 0.105, 1.43, 0.296]);
    eye.scale.set(1.3, 0.5, 0.25);
    eye.castShadow = false;
    group.add(eye);

    const brow = mesh(new THREE.SphereGeometry(0.067, 16, 10), materials.marble, [side * 0.108, 1.5, 0.281], [0, 0, side * 0.13]);
    brow.scale.set(1.25, 0.28, 0.22);
    brow.castShadow = false;
    group.add(brow);

    const ear = mesh(new THREE.SphereGeometry(0.09, 20, 16), materials.marbleShadow, [side * 0.302, 1.37, -0.005]);
    ear.scale.set(0.42, 1.1, 0.5);
    group.add(ear);
  });

  const mouth = mesh(new THREE.BoxGeometry(0.105, 0.012, 0.012), materials.marbleDetail, [0, 1.235, 0.298]);
  mouth.castShadow = false;
  group.add(mouth);

  const hairBack = mesh(new THREE.SphereGeometry(1, 32, 24), materials.marbleShadow, [0, 1.52, -0.1]);
  hairBack.scale.set(0.36, 0.35, 0.32);
  group.add(hairBack);

  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2;
    const ring = i % 3;
    const curl = mesh(new THREE.IcosahedronGeometry(0.035 + random() * 0.032, 1), materials.marbleShadow, [
      Math.cos(angle) * (0.24 + ring * 0.025),
      1.53 + Math.sin(angle * 2.7) * 0.09 + (ring - 1) * 0.08,
      Math.sin(angle) * (0.24 + ring * 0.014) - 0.075,
    ]);
    curl.rotation.set(random() * 2, random() * 2, random() * 2);
    group.add(curl);
  }

  const collar = mesh(new THREE.TorusGeometry(0.24, 0.018, 6, 48), materials.marbleShadow, [0, 0.91, 0], [Math.PI / 2, 0, 0]);
  collar.scale.set(1.35, 1, 1);
  group.add(collar);

  for (let i = 0; i < 8; i += 1) {
    const fold = mesh(new THREE.TorusGeometry(0.38 + i * 0.03, 0.008, 4, 36, Math.PI * 0.42), materials.marbleShadow, [
      -0.18 + (i % 2) * 0.08,
      0.52 + i * 0.045,
      0.33,
    ], [0.15, 0.08, -1.1 + (i % 2) * 0.09]);
    fold.castShadow = false;
    group.add(fold);
  }

  group.rotation.y = -0.1;
  group.userData.objectHeight = 1.9;
  group.userData.anchorOffset = 0.18;
  group.userData.animate = (time) => {
    head.rotation.y = -0.2 + Math.sin(time * 0.23) * 0.025;
  };
  return group;
}

function createAmphora() {
  const group = new THREE.Group();
  const profile = [
    [0.15, 0],
    [0.24, 0.035],
    [0.29, 0.1],
    [0.38, 0.22],
    [0.47, 0.42],
    [0.52, 0.64],
    [0.45, 0.9],
    [0.32, 1.08],
    [0.24, 1.16],
    [0.22, 1.24],
    [0.25, 1.29],
    [0.29, 1.31],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const body = mesh(new THREE.LatheGeometry(profile, 64), materials.pottery);
  group.add(body);

  const foot = mesh(new THREE.CylinderGeometry(0.245, 0.275, 0.05, 40), materials.potteryDark, [0, 0.06, 0]);
  group.add(foot);

  const rim = mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 48), materials.potteryDark, [0, 1.3, 0], [Math.PI / 2, 0, 0]);
  group.add(rim);

  [-1, 1].forEach((side) => {
    const points = [
      new THREE.Vector3(side * 0.31, 1.08, 0),
      new THREE.Vector3(side * 0.57, 1.12, 0),
      new THREE.Vector3(side * 0.63, 0.92, 0),
      new THREE.Vector3(side * 0.5, 0.77, 0),
      new THREE.Vector3(side * 0.43, 0.73, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const handle = mesh(new THREE.TubeGeometry(curve, 32, 0.035, 8, false), materials.potteryDark);
    group.add(handle);
  });

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const dot = mesh(new THREE.SphereGeometry(0.012, 8, 6), materials.potteryDark, [
      Math.sin(angle) * 0.505,
      0.61 + Math.sin(angle * 3) * 0.015,
      Math.cos(angle) * 0.505,
    ]);
    dot.castShadow = false;
    group.add(dot);
  }

  group.rotation.y = -0.25;
  group.userData.objectHeight = 1.32;
  group.userData.anchorOffset = 0.16;
  return group;
}

function createArmillarySphere() {
  const group = new THREE.Group();
  const rings = new THREE.Group();
  rings.position.y = 1.0;
  group.add(rings);

  const ringSpecs = [
    [0.62, 0, 0, 0],
    [0.58, Math.PI / 2, 0, 0],
    [0.54, 0, 0, Math.PI / 2],
    [0.49, Math.PI / 2.8, Math.PI / 3.6, 0.2],
    [0.43, -Math.PI / 3.2, -Math.PI / 5.5, 0.4],
  ];
  ringSpecs.forEach(([radius, rx, ry, rz], index) => {
    const ring = mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.027 : 0.017, 7, 96),
      index === 3 ? materials.brassDark : materials.brass,
      [0, 0, 0],
      [rx, ry, rz],
    );
    rings.add(ring);
  });

  const earth = mesh(new THREE.SphereGeometry(0.112, 28, 20), materials.lapis);
  rings.add(earth);

  const equator = mesh(new THREE.TorusGeometry(0.123, 0.009, 5, 48), materials.brass, [0, 0, 0], [Math.PI / 2, 0, 0]);
  rings.add(equator);

  const axis = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.46, 8), materials.brass, [0, 0, 0], [0, 0, 0.22]);
  rings.add(axis);
  [-1, 1].forEach((side) => {
    const tip = mesh(new THREE.ConeGeometry(0.035, 0.1, 8), materials.brass, [side * -0.104, side * 0.736, 0], [0, 0, 0.22]);
    rings.add(tip);
  });

  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    if (i % 3 === 0) {
      const star = mesh(new THREE.OctahedronGeometry(0.025, 0), materials.brassDark, [
        Math.cos(angle) * 0.62,
        Math.sin(angle) * 0.62,
        0,
      ]);
      rings.add(star);
    }
  }

  const base = mesh(new THREE.CylinderGeometry(0.21, 0.29, 0.075, 32), materials.brassDark, [0, 0.075, 0]);
  group.add(base);
  group.add(mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.63, 10), materials.brass, [0, 0.39, 0]));
  group.add(mesh(new THREE.TorusGeometry(0.12, 0.026, 8, 32), materials.brass, [0, 0.76, 0], [Math.PI / 2, 0, 0]));

  [-1, 1].forEach((side) => {
    const supportCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.07, 0.28, 0),
      new THREE.Vector3(side * 0.22, 0.52, 0),
      new THREE.Vector3(side * 0.37, 0.74, 0),
      new THREE.Vector3(side * 0.37, 1.0, 0),
    ]);
    group.add(mesh(new THREE.TubeGeometry(supportCurve, 28, 0.022, 7, false), materials.brassDark));
  });

  group.userData.objectHeight = 1.7;
  group.userData.anchorOffset = 0.14;
  group.userData.animate = (time) => {
    rings.rotation.y = time * 0.12;
    rings.rotation.x = Math.sin(time * 0.17) * 0.045;
    rings.children[1].rotation.z = time * 0.05;
  };
  return group;
}

function createSunMask() {
  const group = new THREE.Group();
  const faceY = 0.72;

  const backPlateShape = new THREE.Shape();
  backPlateShape.moveTo(-0.47, 0.1);
  backPlateShape.lineTo(-0.39, 0.88);
  backPlateShape.absarc(0, 0.88, 0.39, Math.PI, 0, true);
  backPlateShape.lineTo(0.47, 0.1);
  backPlateShape.closePath();
  const backPlate = mesh(
    new THREE.ExtrudeGeometry(backPlateShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }),
    materials.goldGlow,
    [0, 0.04, -0.1],
  );
  group.add(backPlate);

  [-1, 1].forEach((side) => {
    const sidePanelShape = new THREE.Shape();
    sidePanelShape.moveTo(side * 0.17, 0.1);
    sidePanelShape.lineTo(side * 0.44, 0.18);
    sidePanelShape.lineTo(side * 0.35, 0.79);
    sidePanelShape.lineTo(side * 0.19, 0.69);
    sidePanelShape.closePath();
    const geometry = new THREE.ShapeGeometry(sidePanelShape, 12);
    const panel = mesh(geometry, materials.striped, [0, 0.03, 0.02]);
    panel.scale.set(1, 1, 1);
    group.add(panel);
  });

  const face = mesh(new THREE.SphereGeometry(1, 48, 32), materials.goldGlow, [0, faceY, 0.08]);
  face.scale.set(0.24, 0.36, 0.16);
  group.add(face);

  const browBand = mesh(new THREE.BoxGeometry(0.44, 0.055, 0.055), materials.lapis, [0, faceY + 0.22, 0.205]);
  group.add(browBand);

  [-1, 1].forEach((side) => {
    const eye = mesh(new THREE.SphereGeometry(0.075, 18, 10), materials.eye, [side * 0.09, faceY + 0.1, 0.218]);
    eye.scale.set(1.35, 0.65, 0.2);
    eye.castShadow = false;
    group.add(eye);

    const eyeLiner = mesh(new THREE.BoxGeometry(0.13, 0.012, 0.018), materials.lapis, [side * 0.165, faceY + 0.105, 0.226], [0, 0, side * 0.12]);
    eyeLiner.castShadow = false;
    group.add(eyeLiner);
  });

  const nose = mesh(new THREE.ConeGeometry(0.04, 0.16, 5), materials.brassDark, [0, faceY - 0.015, 0.25], [Math.PI / 2.1, 0, 0]);
  group.add(nose);

  const mouth = mesh(new THREE.BoxGeometry(0.09, 0.014, 0.016), materials.lapis, [0, faceY - 0.16, 0.225]);
  mouth.castShadow = false;
  group.add(mouth);

  const chin = mesh(new THREE.SphereGeometry(0.07, 16, 10), materials.goldGlow, [0, faceY - 0.24, 0.19]);
  chin.scale.set(1, 0.6, 0.7);
  group.add(chin);

  const stand = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.56, 10), materials.brassDark, [0, 0.25, -0.13]);
  group.add(stand);
  group.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.07, 24), materials.brassDark, [0, 0.035, -0.13]));

  group.position.y = 0.03;
  group.userData.objectHeight = 1.55;
  group.userData.anchorOffset = 0.12;
  group.userData.animate = (time) => {
    group.rotation.y = -0.18 + Math.sin(time * 0.3) * 0.018;
  };
  return group;
}

function createTripod() {
  const group = new THREE.Group();
  const bowlProfile = [
    [0.12, 0],
    [0.2, 0.03],
    [0.31, 0.1],
    [0.4, 0.24],
    [0.43, 0.38],
    [0.37, 0.45],
    [0.2, 0.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = mesh(new THREE.LatheGeometry(bowlProfile, 48), materials.bronze, [0, 0.48, 0]);
  group.add(bowl);

  const rim = mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 64), materials.bronzeHighlight, [0, 0.955, 0], [Math.PI / 2, 0, 0]);
  group.add(rim);

  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const top = new THREE.Vector3(Math.sin(angle) * 0.23, 0.54, Math.cos(angle) * 0.23);
    const knee = new THREE.Vector3(Math.sin(angle) * 0.39, 0.29, Math.cos(angle) * 0.39);
    const foot = new THREE.Vector3(Math.sin(angle) * 0.54, 0.05, Math.cos(angle) * 0.54);
    const curve = new THREE.CatmullRomCurve3([top, knee, foot], false, 'centripetal');
    group.add(mesh(new THREE.TubeGeometry(curve, 28, 0.035, 8, false), materials.bronze));
    const footCap = mesh(new THREE.SphereGeometry(0.055, 12, 8), materials.bronzeHighlight, [foot.x, foot.y, foot.z]);
    footCap.scale.y = 0.6;
    group.add(footCap);
  }

  [-1, 1].forEach((side) => {
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.34, 0.95, 0),
      new THREE.Vector3(side * 0.5, 1.08, 0),
      new THREE.Vector3(side * 0.56, 0.91, 0),
      new THREE.Vector3(side * 0.41, 0.79, 0),
    ]);
    group.add(mesh(new THREE.TubeGeometry(handleCurve, 28, 0.022, 7, false), materials.bronzeHighlight));
  });

  const lid = mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), materials.bronze, [0, 0.96, 0]);
  lid.scale.y = 0.24;
  group.add(lid);
  group.add(mesh(new THREE.SphereGeometry(0.045, 14, 10), materials.bronzeHighlight, [0, 1.055, 0]));

  group.userData.objectHeight = 1.12;
  group.userData.anchorOffset = 0.13;
  return group;
}

const artifactDefinitions = [
  {
    id: 'mask',
    index: '01',
    title: 'Mask of the Sun',
    navTitle: 'Sun Mask',
    meta: 'Egypt · New Kingdom, c. 1320 BCE',
    description: 'A gilded funerary mask once laid over the face of a temple singer. Its lapis brow and solar disc were intended to guide the wearer through the underworld.',
    material: 'Gilded wood & lapis lazuli',
    provenance: 'Thebes, West Bank',
    accession: 'AUR · 1889.11',
    x: -5.28,
    z: -1.65,
    plinthWidth: 0.92,
    plinthHeight: 1.16,
    plinthDepth: 0.88,
    hero: false,
    build: createSunMask,
    focusDistance: 4.7,
  },
  {
    id: 'amphora',
    index: '02',
    title: 'Vessel of the Aegean',
    navTitle: 'Aegean Amphora',
    meta: 'Greece · Attic, c. 530 BCE',
    description: 'The meander and wave motifs wrapping this amphora frame a vanished scene of procession. It likely carried oil from the groves outside Athens.',
    material: 'Fired terracotta',
    provenance: 'Attica, Greece',
    accession: 'AUR · 1904.27',
    x: -2.94,
    z: 0.12,
    plinthWidth: 0.86,
    plinthHeight: 0.98,
    plinthDepth: 0.84,
    hero: false,
    build: createAmphora,
    focusDistance: 4.35,
  },
  {
    id: 'muse',
    index: '03',
    title: 'The Marble Muse',
    navTitle: 'Marble Muse',
    meta: 'Roman · 2nd century CE',
    description: 'A copy after a Hellenistic original, the Muse turns her gaze from the room. Traces of pigment survive in the folds of her hair and along the lower lip.',
    material: 'Carrara marble',
    provenance: 'Ostia Antica',
    accession: 'AUR · 1912.04',
    x: 0,
    z: 0,
    plinthWidth: 0.96,
    plinthHeight: 1.12,
    plinthDepth: 0.92,
    hero: true,
    build: createBust,
    focusDistance: 4.8,
  },
  {
    id: 'armillary',
    index: '04',
    title: 'The Celestial Ring',
    navTitle: 'Celestial Ring',
    meta: 'Hellenistic world · 1st century CE',
    description: 'Five brass rings model the paths of sun, moon, and planets. To turn the sphere is to command a private, pocket-sized cosmos.',
    material: 'Gilded bronze',
    provenance: 'Alexandria, Egypt',
    accession: 'AUR · 1928.62',
    x: 2.94,
    z: 0.12,
    plinthWidth: 0.86,
    plinthHeight: 1.05,
    plinthDepth: 0.84,
    hero: false,
    build: createArmillarySphere,
    focusDistance: 4.35,
  },
  {
    id: 'tripod',
    index: '05',
    title: 'The Oracle’s Tripod',
    navTitle: 'Oracle’s Tripod',
    meta: 'Etruria · 4th century BCE',
    description: 'A ritual brazier balanced on three lion feet. Its green patina records centuries of smoke, bronze disease, and burial beneath volcanic soil.',
    material: 'Patinated bronze',
    provenance: 'Perugia, Etruria',
    accession: 'AUR · 1897.38',
    x: 5.28,
    z: -1.65,
    plinthWidth: 0.92,
    plinthHeight: 1.12,
    plinthDepth: 0.88,
    hero: false,
    build: createTripod,
    focusDistance: 4.7,
  },
];

function createExhibit(definition) {
  const group = new THREE.Group();
  group.position.set(definition.x, 0, definition.z);

  const pedestal = createPedestal(definition.plinthWidth, definition.plinthHeight, definition.plinthDepth);
  group.add(pedestal);
  group.add(createPlaque(definition.index, definition.title, definition.plinthWidth, definition.plinthHeight, definition.plinthDepth));
  group.add(createFloorGlow());

  const objectGroup = definition.build();
  objectGroup.position.y = definition.plinthHeight;
  group.add(objectGroup);

  const artistLight = createSpotlight(definition.hero);
  group.add(artistLight);
  group.add(artistLight.target);
  group.add(createGlowPoint());
  group.add(createBeam());

  const anchor = new THREE.Object3D();
  anchor.position.set(
    0,
    definition.plinthHeight + (objectGroup.userData.objectHeight || 1.5) + (objectGroup.userData.anchorOffset || 0.1),
    0,
  );
  group.add(anchor);

  const artifact = {
    ...definition,
    group,
    objectGroup,
    anchor,
    light: artistLight,
    currentRotation: 0,
  };

  objectGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData.artifact = artifact;
      if (child.material === materials.pottery || child.material === materials.potteryDark) {
        child.castShadow = true;
      }
    }
  });
  pickTargets.push(objectGroup);

  if (objectGroup.userData.animate) {
    ambientAnimations.push((time) => objectGroup.userData.animate(time, artifact));
  }

  scene.add(group);
  artifacts.push(artifact);
  artifactsById.set(artifact.id, artifact);
  return artifact;
}

function buildCollection() {
  artifactDefinitions.forEach(createExhibit);
}

function createDust() {
const count = softwareRenderer ? 220 : isCompact() ? 290 : 520;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * 18;
    positions[i * 3 + 1] = 0.2 + random() * 6.5;
    positions[i * 3 + 2] = -8 + random() * 15;
    dustParticles.push({
      baseX: positions[i * 3],
      baseY: positions[i * 3 + 1],
      speed: 0.018 + random() * 0.035,
      phase: random() * Math.PI * 2,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xd6bb87,
    size: isCompact() ? 0.018 : 0.022,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  return points;
}

createRoom();
createLighting();
buildCollection();
const dust = createDust();

let composer = null;
let bloomPass = null;
if (!softwareRenderer) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isCompact() ? 0.26 : 0.36,
    0.62,
    0.84,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}
debugTimings.composerBuilt = performance.now() - pageStartedAt;

const artifactNav = document.querySelector('#artifact-nav');
const artifactTags = document.querySelector('#artifact-tags');
const currentIndex = document.querySelector('#current-index');
const currentTitle = document.querySelector('#current-title');
const currentMeta = document.querySelector('#current-meta');
const detailPanel = document.querySelector('#detail-panel');
const detailNumber = document.querySelector('#detail-number');
const detailTitle = document.querySelector('#detail-title');
const detailMeta = document.querySelector('#detail-meta');
const detailDescription = document.querySelector('#detail-description');
const detailMaterial = document.querySelector('#detail-material');
const detailProvenance = document.querySelector('#detail-provenance');
const detailAccession = document.querySelector('#detail-accession');

function buildInterface() {
  artifacts.forEach((artifact) => {
    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.className = 'artifact-nav-item';
    navButton.dataset.id = artifact.id;
    navButton.setAttribute('aria-label', `View ${artifact.title}`);
    navButton.innerHTML = `<span class="nav-number">${artifact.index}</span><span class="nav-name">${artifact.navTitle}</span>`;
    navButton.addEventListener('click', () => selectArtifact(artifact, { openPanel: true, focus: true }));
    artifactNav.appendChild(navButton);
    artifact.navButton = navButton;

    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'artifact-tag';
    tag.dataset.id = artifact.id;
    tag.setAttribute('aria-label', `Open details for ${artifact.title}`);
    tag.innerHTML = `<span class="tag-number">${artifact.index}</span><span class="tag-name">${artifact.navTitle}</span>`;
    tag.addEventListener('click', () => selectArtifact(artifact, { openPanel: true, focus: true }));
    artifactTags.appendChild(tag);
    tags.set(artifact.id, tag);
    artifact.tag = tag;
  });
}

function updateCurrentDisplay(artifact) {
  currentIndex.textContent = artifact.index;
  currentTitle.textContent = artifact.title;
  currentMeta.textContent = artifact.meta;
  artifactNav.querySelectorAll('.artifact-nav-item').forEach((button) => {
    const isActive = button.dataset.id === artifact.id;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  tags.forEach((tag, id) => tag.classList.toggle('is-active', id === artifact.id));
}

function updateDetailPanel(artifact) {
  detailNumber.textContent = artifact.index;
  detailTitle.textContent = artifact.title;
  detailMeta.textContent = artifact.meta;
  detailDescription.textContent = artifact.description;
  detailMaterial.textContent = artifact.material;
  detailProvenance.textContent = artifact.provenance;
  detailAccession.textContent = artifact.accession;
}

function openDetailPanel(artifact) {
  updateDetailPanel(artifact);
  detailPanel.classList.add('is-open');
  detailPanel.setAttribute('aria-hidden', 'false');
  app.classList.add('panel-open');
}

function closeDetailPanel() {
  detailPanel.classList.remove('is-open');
  detailPanel.setAttribute('aria-hidden', 'true');
  app.classList.remove('panel-open');
}

function worldPositionOf(object) {
  object.getWorldPosition(tempVector);
  return tempVector;
}

function focusCameraOn(artifact, duration = 1.1) {
  const world = worldPositionOf(artifact.group);
  const compact = isCompact();
  const target = new THREE.Vector3(
    world.x + (compact ? 0 : 0.42),
    artifact.plinthHeight + (artifact.objectGroup.userData.objectHeight || 1.4) * 0.52,
    world.z,
  );
  const distance = compact ? artifact.focusDistance + 0.55 : artifact.focusDistance;
  const cameraPosition = new THREE.Vector3(target.x, target.y + 0.64, world.z + distance);
  cameraTween = {
    start: performance.now(),
    duration: duration * 1000,
    fromPosition: camera.position.clone(),
    toPosition: cameraPosition,
    fromTarget: controls.target.clone(),
    toTarget: target,
  };
  controls.enabled = false;
  hasInteracted = true;
}

function resetCamera(duration = 1.25) {
  const compact = isCompact();
  cameraTween = {
    start: performance.now(),
    duration: duration * 1000,
    fromPosition: camera.position.clone(),
    toPosition: new THREE.Vector3(0, compact ? 2.42 : 2.35, compact ? 10.2 : 10.7),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(compact ? 0 : -0.35, 1.58, 0),
  };
  controls.enabled = false;
  hasInteracted = true;
}

function selectArtifact(artifact, options = {}) {
  if (!artifact) return;
  selectedArtifact = artifact;
  updateCurrentDisplay(artifact);
  if (options.openPanel) openDetailPanel(artifact);
  if (options.focus) focusCameraOn(artifact);
}

function beginOrbit() {
  if (!selectedArtifact) return;
  focusCameraOn(selectedArtifact, 0.9);
  autoRotateUntil = performance.now() + 6800;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.48;
  openDetailPanel(selectedArtifact);
}

function updateTags() {
  if (isCompact()) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  artifacts.forEach((artifact) => {
    const tag = artifact.tag;
    worldPositionOf(artifact.anchor).project(camera);
    const x = (tempVector.x * 0.5 + 0.5) * width;
    const y = (-tempVector.y * 0.5 + 0.5) * height;
    const overIntro = introBounds
      && x > introBounds.left - 24
      && x < introBounds.right + 24
      && y > introBounds.top - 24
      && y < introBounds.bottom + 24;
    const visible = !overIntro && tempVector.z > -1 && tempVector.z < 1 && x > -80 && x < width + 80 && y > 70 && y < height - 105;
    tag.style.opacity = visible ? (artifact === selectedArtifact ? '1' : '0.62') : '0';
    tag.style.pointerEvents = visible ? 'auto' : 'none';
    tag.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

function findArtifactFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData.artifact) return current.userData.artifact;
    current = current.parent;
  }
  return null;
}

function updateHover(event) {
  if (event.pointerType === 'touch') return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersection = raycaster.intersectObjects(pickTargets, true)[0];
  const artifact = intersection ? findArtifactFromObject(intersection.object) : null;
  if (hoveredArtifact !== artifact) {
    hoveredArtifact = artifact;
    renderer.domElement.classList.toggle('is-hovering', Boolean(artifact));
  }
}

function handleSceneClick(event) {
  if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersection = raycaster.intersectObjects(pickTargets, true)[0];
  if (!intersection) return;
  const artifact = findArtifactFromObject(intersection.object);
  if (artifact) selectArtifact(artifact, { openPanel: true, focus: true });
}

function onPointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY };
  cameraTween = null;
  autoRotateUntil = 0;
  controls.enabled = true;
  controls.autoRotate = false;
  renderer.domElement.classList.add('is-dragging');
}

function onPointerUp(event) {
  renderer.domElement.classList.remove('is-dragging');
  handleSceneClick(event);
  pointerDown = null;
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = isCompact();
  const aspect = width / height;
  camera.aspect = aspect;
  camera.fov = compact ? 56 : 44;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, softwareRenderer ? 0.82 : compact ? 1.6 : 2));
  renderer.setSize(width, height);
  if (composer) {
    composer.setSize(width, height);
    bloomPass.strength = compact ? 0.26 : 0.36;
  }

  const introRect = document.querySelector('.intro').getBoundingClientRect();
  introBounds = {
    left: introRect.left,
    top: introRect.top,
    right: introRect.right,
    bottom: introRect.bottom,
  };

  const spread = compact ? 0.43 : 1;
  artifacts.forEach((artifact) => {
    artifact.group.position.x = artifact.x * spread;
  });

  if (!hasInteracted && !cameraTween) {
    camera.position.set(0, compact ? 2.42 : 2.35, compact ? 10.2 : 10.7);
    controls.target.set(compact ? 0 : -0.35, 1.58, 0);
    controls.minDistance = compact ? 4.3 : 5.5;
    controls.maxDistance = compact ? 14 : 16;
    controls.update();
  }
}

function addEventListeners() {
  renderer.domElement.addEventListener('pointermove', updateHover);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', () => {
    renderer.domElement.classList.remove('is-dragging');
    if (hoveredArtifact) {
      hoveredArtifact = null;
      renderer.domElement.classList.remove('is-hovering');
    }
  });
  renderer.domElement.addEventListener('wheel', () => {
    cameraTween = null;
    autoRotateUntil = 0;
    controls.enabled = true;
    controls.autoRotate = false;
    hasInteracted = true;
  }, { passive: true });
  window.addEventListener('resize', onResize);

  document.querySelector('#detail-close').addEventListener('click', closeDetailPanel);
  document.querySelector('#detail-orbit').addEventListener('click', beginOrbit);
  document.querySelector('#begin-button').addEventListener('click', () => {
    selectArtifact(artifactsById.get('muse'), { openPanel: true, focus: true });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetailPanel();
      resetCamera();
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const index = artifacts.indexOf(selectedArtifact);
      selectArtifact(artifacts[(index + direction + artifacts.length) % artifacts.length], { openPanel: true, focus: true });
    }
  });
}

function updateDust(time) {
  const positions = dust.geometry.attributes.position.array;
  for (let i = 0; i < dustParticles.length; i += 1) {
    const particle = dustParticles[i];
    positions[i * 3] = particle.baseX + Math.sin(time * 0.12 + particle.phase) * 0.2;
    positions[i * 3 + 1] = ((particle.baseY + time * particle.speed) % 6.7) + 0.1;
    positions[i * 3 + 2] += Math.sin(time * 0.04 + particle.phase) * 0.0007;
  }
  dust.geometry.attributes.position.needsUpdate = true;
}

function animateCameraTween(now) {
  if (!cameraTween) return;
  const raw = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
  const progress = lerpEase(raw);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, progress);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, progress);
  if (raw >= 1) {
    cameraTween = null;
    controls.enabled = true;
    controls.update();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  const now = performance.now();

  animateCameraTween(now);
  controls.autoRotate = now < autoRotateUntil;
  controls.update();

  ambientAnimations.forEach((animateArtifact) => {
    if (!prefersReducedMotion) animateArtifact(elapsed);
  });

  artifacts.forEach((artifact, index) => {
    const pulse = 0.965 + Math.sin(elapsed * 1.4 + index * 1.7) * 0.035;
    artifact.light.intensity = (artifact.hero ? 96 : 58) * pulse;
  });

  updateDust(elapsed);
  updateTags();

  if (!selectedArtifact) {
    selectedArtifact = artifactsById.get('muse');
    updateCurrentDisplay(selectedArtifact);
  }

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    debugTimings.firstFrame = performance.now() - pageStartedAt;
    debugTimings.firstFrameAt = performance.now();
    debugTimings.drawCalls = renderer.info.render.calls;
    debugTimings.triangles = renderer.info.render.triangles;
    debugTimings.programs = renderer.info.programs?.length || 0;
    window.__AURELIA_DEBUG = debugTimings;
    window.__AURELIA_READY = true;
    if (softwareRenderer) {
      loadingHidden = true;
      loadingScreen.remove();
    } else {
      setTimeout(() => {
        if (!loadingHidden) {
          loadingHidden = true;
          loadingScreen.classList.add('is-hidden');
        }
      }, 340);
    }
  }
}

buildInterface();
addEventListeners();
onResize();
selectedArtifact = artifactsById.get('muse');
updateCurrentDisplay(selectedArtifact);
updateDetailPanel(selectedArtifact);
animate();
