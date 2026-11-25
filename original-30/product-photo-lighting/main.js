import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const canvas = document.querySelector('#sceneCanvas');
const previewWrap = document.querySelector('#previewWrap');
const previewFrame = document.querySelector('#previewFrame');
const loadingScreen = document.querySelector('#loadingScreen');
const previewError = document.querySelector('#previewError');
const studioMap = document.querySelector('#studioMap');
const toast = document.querySelector('#toast');
const exportButton = document.querySelector('#exportButton');
const resetButton = document.querySelector('#resetButton');

const STORAGE_KEY = 'northlight-tabletop-studio-v1';
const MAP_X_MIN = -3.8;
const MAP_X_MAX = 3.8;
const MAP_Z_MIN = -2.2;
const MAP_Z_MAX = 2.7;

const DEFAULT_STATE = {
  crop: 'square',
  backdrop: { color: '#b7aa95', name: 'Dune' },
  key: { x: -2.55, z: 0.75, power: 78 },
  fill: { x: 2.55, z: 0.42, power: 42 },
  reflector: { x: 1.72, z: 1.42, bounce: 58 },
  exposure: 0.15,
};

const CROP_CONFIG = {
  square: { aspect: 1, fov: 31, width: 2000, height: 2000, label: '1:1 SQUARE', size: '2000 × 2000 PX' },
  portrait: { aspect: 0.8, fov: 35.5, width: 1600, height: 2000, label: '4:5 PORTRAIT', size: '1600 × 2000 PX' },
};

const state = loadState();
let renderer;
let scene;
let camera;
let backdrop;
let backdropMaterial;
let keySpot;
let fillSpot;
let keyArea;
let fillArea;
let bounceArea;
let keyRig;
let fillRig;
let reflectorRig;
let studioGear;
let cameraModel;
let needsRender = true;
let saveTimer = 0;
let toastTimer = 0;
let dragState = null;
let hasRenderedOnce = false;

init();

function init() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.error(error);
    loadingScreen.classList.add('is-hidden');
    previewError.hidden = false;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposureToExposureValue(state.exposure);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(state.backdrop.color);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment(renderer);
  const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  scene.environment = environmentTarget.texture;
  pmremGenerator.dispose();

  camera = new THREE.PerspectiveCamera(CROP_CONFIG[state.crop].fov, CROP_CONFIG[state.crop].aspect, 0.1, 40);
  camera.position.set(0, 1.36, 4.92);
  camera.lookAt(0, 0.62, 0);

  studioGear = new THREE.Group();
  studioGear.name = 'Studio gear';
  scene.add(studioGear);

  buildBackdrop();
  buildMug();
  buildLighting();
  buildReflector();
  buildCameraModel();

  bindInterface();
  syncAllControls();
  updateLighting();
  resizePreview();
  window.setTimeout(() => loadingScreen.classList.add('is-hidden'), 850);

  const resizeObserver = new ResizeObserver(resizePreview);
  resizeObserver.observe(previewWrap);
  window.addEventListener('resize', resizePreview, { passive: true });

  renderer.setAnimationLoop(renderLoop);
}

function loadState() {
  const fallback = structuredClone(DEFAULT_STATE);

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== 'object') return fallback;

    if (stored.crop === 'square' || stored.crop === 'portrait') fallback.crop = stored.crop;
    if (typeof stored.backdrop?.color === 'string' && /^#[0-9a-f]{6}$/i.test(stored.backdrop.color)) {
      fallback.backdrop.color = stored.backdrop.color;
      fallback.backdrop.name = typeof stored.backdrop.name === 'string' ? stored.backdrop.name : 'Custom';
    }
    fallback.key.x = clampNumber(stored.key?.x, MAP_X_MIN + 0.3, MAP_X_MAX - 0.3, fallback.key.x);
    fallback.key.z = clampNumber(stored.key?.z, MAP_Z_MIN + 0.2, MAP_Z_MAX - 0.2, fallback.key.z);
    fallback.key.power = clampNumber(stored.key?.power, 12, 100, fallback.key.power);
    fallback.fill.x = clampNumber(stored.fill?.x, MAP_X_MIN + 0.3, MAP_X_MAX - 0.3, fallback.fill.x);
    fallback.fill.z = clampNumber(stored.fill?.z, MAP_Z_MIN + 0.2, MAP_Z_MAX - 0.2, fallback.fill.z);
    fallback.fill.power = clampNumber(stored.fill?.power, 5, 100, fallback.fill.power);
    fallback.reflector.x = clampNumber(stored.reflector?.x, MAP_X_MIN + 0.3, MAP_X_MAX - 0.3, fallback.reflector.x);
    fallback.reflector.z = clampNumber(stored.reflector?.z, MAP_Z_MIN + 0.2, MAP_Z_MAX - 0.2, fallback.reflector.z);
    fallback.reflector.bounce = clampNumber(stored.reflector?.bounce, 0, 100, fallback.reflector.bounce);
    fallback.exposure = clampNumber(stored.exposure, -1, 1, fallback.exposure);
  } catch (error) {
    console.warn('Could not restore studio setup.', error);
  }

  return fallback;
}

function persistState() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Could not save studio setup.', error);
    }
  }, 160);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? THREE.MathUtils.clamp(number, min, max) : fallback;
}

function buildBackdrop() {
  backdropMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.backdrop.color),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.09,
    side: THREE.DoubleSide,
  });

  const profile = [];
  const wallTop = 8.5;
  const wallBottom = 0.82;
  for (let i = 0; i <= 14; i += 1) {
    profile.push(new THREE.Vector2(-5.25, THREE.MathUtils.lerp(wallTop, wallBottom, i / 14)));
  }

  const sweep = new THREE.CubicBezierCurve(
    new THREE.Vector2(-5.25, wallBottom),
    new THREE.Vector2(-5.245, 0.2),
    new THREE.Vector2(-4.82, 0.025),
    new THREE.Vector2(-4.18, 0)
  );
  for (let i = 1; i <= 26; i += 1) {
    profile.push(sweep.getPoint(i / 26));
  }

  for (let i = 1; i <= 8; i += 1) {
    profile.push(new THREE.Vector2(THREE.MathUtils.lerp(-4.18, 4.2, i / 8), 0));
  }

  const columns = 44;
  const rows = profile.length;
  const positions = [];
  const uvs = [];
  const indices = [];
  const widthStart = -8.5;
  const widthEnd = 8.5;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = THREE.MathUtils.lerp(widthStart, widthEnd, column / (columns - 1));
      positions.push(x, profile[row].y, profile[row].x);
      uvs.push(column / (columns - 1), row / (rows - 1));
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = (row + 1) * columns + column;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  backdrop = new THREE.Mesh(geometry, backdropMaterial);
  backdrop.receiveShadow = true;
  backdrop.name = 'Seamless backdrop';
  scene.add(backdrop);

  addContactShadow();
}

function addContactShadow() {
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 18, 128, 128, 122);
  gradient.addColorStop(0, 'rgba(38, 27, 18, 0.42)');
  gradient.addColorStop(0.42, 'rgba(38, 27, 18, 0.2)');
  gradient.addColorStop(1, 'rgba(38, 27, 18, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(shadowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(2.7, 1.6);
  const contactShadow = new THREE.Mesh(geometry, material);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0.08, 0.008, 0.13);
  contactShadow.renderOrder = 1;
  contactShadow.name = 'Contact shadow';
  scene.add(contactShadow);
}

function buildMug() {
  const mug = new THREE.Group();
  mug.name = 'Ceramic mug';
  mug.position.set(0, 0.02, 0);
  mug.rotation.y = -0.13;

  const ceramicMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eee8dc'),
    roughness: 0.27,
    metalness: 0,
    clearcoat: 0.82,
    clearcoatRoughness: 0.19,
    sheen: 0.32,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#fffaf0'),
    envMapIntensity: 0.62,
  });

  const rimMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f5efe5'),
    roughness: 0.22,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.72,
  });

  const profile = [
    [0.0, 0.03],
    [0.48, 0.03],
    [0.53, 0.045],
    [0.56, 0.085],
    [0.6, 0.17],
    [0.645, 0.35],
    [0.685, 0.62],
    [0.712, 0.88],
    [0.71, 1.0],
    [0.697, 1.045],
    [0.668, 1.052],
    [0.65, 1.027],
    [0.638, 0.95],
    [0.625, 0.75],
    [0.607, 0.48],
    [0.58, 0.27],
    [0.535, 0.175],
    [0.48, 0.145],
    [0.0, 0.13],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));

  const bodyGeometry = new THREE.LatheGeometry(profile, 96);
  const body = new THREE.Mesh(bodyGeometry, ceramicMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  mug.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.682, 0.017, 14, 110), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.047;
  rim.castShadow = true;
  rim.receiveShadow = true;
  mug.add(rim);

  const handleCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.62, 0.8, 0),
      new THREE.Vector3(0.82, 0.96, 0.005),
      new THREE.Vector3(1.01, 0.89, 0.008),
      new THREE.Vector3(1.12, 0.65, 0.008),
      new THREE.Vector3(1.06, 0.39, 0.004),
      new THREE.Vector3(0.88, 0.25, 0),
      new THREE.Vector3(0.62, 0.29, -0.004),
    ],
    false,
    'centripetal',
    0.45
  );

  const handleGeometry = new THREE.TubeGeometry(handleCurve, 80, 0.102, 24, false);
  const handle = new THREE.Mesh(handleGeometry, ceramicMaterial);
  handle.castShadow = true;
  handle.receiveShadow = true;
  handle.scale.z = 0.82;
  mug.add(handle);

  const foot = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.018, 10, 80), rimMaterial);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.035;
  foot.receiveShadow = true;
  mug.add(foot);

  scene.add(mug);
}

function buildLighting() {
  const hemisphere = new THREE.HemisphereLight(0xfff6e8, 0x6e6354, 0.42);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfff4e6, 0.13);
  scene.add(ambient);

  keySpot = new THREE.SpotLight(0xffefd3, 1, 14, 0.49, 0.78, 2);
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.set(2048, 2048);
  keySpot.shadow.camera.near = 0.4;
  keySpot.shadow.camera.far = 11;
  keySpot.shadow.bias = -0.00012;
  keySpot.shadow.normalBias = 0.022;
  keySpot.shadow.radius = 5;
  keySpot.target.position.set(0, 0.58, 0);
  scene.add(keySpot, keySpot.target);

  fillSpot = new THREE.SpotLight(0xddefff, 1, 12, 0.66, 0.94, 2);
  fillSpot.castShadow = true;
  fillSpot.shadow.mapSize.set(1024, 1024);
  fillSpot.shadow.camera.near = 0.4;
  fillSpot.shadow.camera.far = 10;
  fillSpot.shadow.bias = -0.00016;
  fillSpot.shadow.normalBias = 0.026;
  fillSpot.shadow.radius = 7;
  fillSpot.target.position.set(0, 0.58, 0);
  scene.add(fillSpot, fillSpot.target);

  keyArea = new THREE.RectAreaLight(0xfff0d8, 1, 1.35, 1.75);
  keyArea.target = keySpot.target;
  scene.add(keyArea);

  fillArea = new THREE.RectAreaLight(0xe4f2ff, 1, 1.5, 1.85);
  fillArea.target = fillSpot.target;
  scene.add(fillArea);

  bounceArea = new THREE.RectAreaLight(0xfff6e7, 1, 1.55, 1.9);
  bounceArea.target = keySpot.target;
  scene.add(bounceArea);

  keyRig = createSoftbox('key');
  fillRig = createSoftbox('fill');
  studioGear.add(keyRig.root, fillRig.root);
}

function createSoftbox(variant) {
  const isKey = variant === 'key';
  const accent = isKey ? 0xfff0ce : 0xdff5ff;
  const root = new THREE.Group();
  root.name = `${isKey ? 'Key' : 'Fill'} softbox`;

  const head = new THREE.Group();
  head.name = `${isKey ? 'Key' : 'Fill'} softbox head`;

  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x161914,
    roughness: 0.72,
    metalness: 0.35,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x292d25,
    roughness: 0.42,
    metalness: 0.55,
  });
  const diffusionMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 2.5,
    roughness: 0.64,
    side: THREE.DoubleSide,
  });

  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.55, 0.17), housingMaterial);
  head.add(housing);

  const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.41), diffusionMaterial);
  diffuser.position.z = 0.091;
  head.add(diffuser);

  const innerFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.45, 0.025)),
    new THREE.LineBasicMaterial({ color: 0x454b3d, transparent: true, opacity: 0.8 })
  );
  innerFrame.position.z = 0.094;
  head.add(innerFrame);

  root.add(head);

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x292c27, roughness: 0.48, metalness: 0.58 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1, 12), poleMaterial);
  pole.name = 'Light stand pole';
  root.add(pole);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.035, 24), poleMaterial);
  base.name = 'Light stand foot';
  root.add(base);

  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), frameMaterial);
  joint.name = 'Light stand joint';
  root.add(joint);

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });

  return { root, head, pole, base, joint, diffusionMaterial };
}

function buildReflector() {
  reflectorRig = {};
  const root = new THREE.Group();
  root.name = 'Reflector';

  const boardPivot = new THREE.Group();
  boardPivot.position.y = 0.88;
  root.add(boardPivot);

  const boardMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f0eadf'),
    roughness: 0.27,
    metalness: 0.15,
    clearcoat: 0.28,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.58,
    side: THREE.DoubleSide,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.72, 0.055), boardMaterial);
  board.castShadow = false;
  board.receiveShadow = true;
  boardPivot.add(board);

  const boardEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 1.74, 0.06)),
    new THREE.LineBasicMaterial({ color: 0x77746d, transparent: true, opacity: 0.6 })
  );
  boardPivot.add(boardEdge);

  const metal = new THREE.MeshStandardMaterial({ color: 0x252823, roughness: 0.42, metalness: 0.65 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.88, 10), metal);
  pole.position.y = 0.44;
  root.add(pole);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.03, 20), metal);
  foot.position.y = 0.015;
  root.add(foot);

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = false;
  });

  reflectorRig = { root, boardPivot, board, pole, foot };
  studioGear.add(root);
}

function buildCameraModel() {
  const root = new THREE.Group();
  root.name = 'Camera 01';
  root.position.set(0, 1.22, 5.32);
  root.lookAt(0, 0.62, 0);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x171a16, roughness: 0.42, metalness: 0.36 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6156, roughness: 0.3, metalness: 0.7 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x263c41,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.4,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.28), bodyMaterial);
  root.add(body);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), bodyMaterial);
  grip.position.set(0.26, -0.01, 0);
  root.add(grip);

  const viewfinder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.18), bodyMaterial);
  viewfinder.position.set(0, 0.26, -0.01);
  root.add(viewfinder);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.35, 32), bodyMaterial);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.29;
  root.add(lens);

  const lensRim = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.055, 32), trimMaterial);
  lensRim.rotation.x = Math.PI / 2;
  lensRim.position.z = 0.48;
  root.add(lensRim);

  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.145, 32), glassMaterial);
  glass.position.z = 0.512;
  root.add(glass);

  const recordLight = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 12),
    new THREE.MeshBasicMaterial({ color: 0xd97961, toneMapped: false })
  );
  recordLight.position.set(-0.24, 0.08, 0.142);
  root.add(recordLight);

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = false;
  });

  cameraModel = root;
  studioGear.add(root);
}

function updateLighting() {
  const keyPosition = new THREE.Vector3(state.key.x, 2.92, state.key.z);
  const fillPosition = new THREE.Vector3(state.fill.x, 2.17, state.fill.z);
  const target = new THREE.Vector3(0, 0.6, 0);
  const keyPower = state.key.power / 100;
  const fillPower = state.fill.power / 100;
  const bouncePower = state.reflector.bounce / 100;

  keySpot.position.copy(keyPosition);
  keySpot.intensity = 210 * keyPower;
  keySpot.target.position.copy(target);
  keySpot.target.updateMatrixWorld();

  fillSpot.position.copy(fillPosition);
  fillSpot.intensity = 76 * fillPower;
  fillSpot.target.position.copy(target);
  fillSpot.target.updateMatrixWorld();

  keyArea.position.copy(keyPosition);
  keyArea.lookAt(target);
  keyArea.intensity = 4.8 * keyPower;

  fillArea.position.copy(fillPosition);
  fillArea.lookAt(target);
  fillArea.intensity = 3.4 * fillPower;

  updateRigGeometry(keyRig, keyPosition, target);
  updateRigGeometry(fillRig, fillPosition, target);

  keyRig.diffusionMaterial.emissiveIntensity = 1.7 + keyPower * 4.6;
  fillRig.diffusionMaterial.emissiveIntensity = 1.1 + fillPower * 4.2;

  const reflectorPosition = new THREE.Vector3(state.reflector.x, 0.88, state.reflector.z);
  reflectorRig.root.position.set(state.reflector.x, 0, state.reflector.z);
  reflectorRig.boardPivot.lookAt(target);
  reflectorRig.boardPivot.rotateX(THREE.MathUtils.degToRad(-8));
  reflectorRig.boardPivot.rotateY(THREE.MathUtils.degToRad(-10));

  const bouncePosition = reflectorPosition.clone().lerp(target, 0.12);
  bouncePosition.y = 1.1;
  bounceArea.position.copy(bouncePosition);
  bounceArea.lookAt(target);
  bounceArea.intensity = 2.9 * bouncePower;
  bounceArea.visible = bouncePower > 0.005;
  reflectorRig.board.material.envMapIntensity = 0.25 + bouncePower * 0.55;

  renderer.toneMappingExposure = exposureToExposureValue(state.exposure);
  needsRender = true;
}

function updateRigGeometry(rig, position, target) {
  const standHeight = Math.max(0.4, position.y - 0.76);
  rig.head.position.copy(position);
  rig.head.lookAt(target);

  rig.pole.position.set(position.x, standHeight * 0.5, position.z);
  rig.pole.scale.y = standHeight;
  rig.base.position.set(position.x, 0.018, position.z);
  rig.joint.position.set(position.x, standHeight, position.z);
}

function exposureToExposureValue(exposure) {
  return Math.pow(2, exposure);
}

function bindInterface() {
  document.querySelectorAll('[data-crop]').forEach((button) => {
    button.addEventListener('click', () => setCrop(button.dataset.crop));
  });

  document.querySelectorAll('[data-color]').forEach((button) => {
    button.addEventListener('click', () => {
      setBackdrop(button.dataset.color, button.dataset.name);
      persistState();
    });
  });

  const customColor = document.querySelector('#customColor');
  customColor.addEventListener('input', () => {
    setBackdrop(customColor.value, 'Custom');
    persistState();
  });

  bindRange('keyPower', (value) => {
    state.key.power = value;
    updateLighting();
  }, (value) => `${Math.round(value)}%`);

  bindRange('fillPower', (value) => {
    state.fill.power = value;
    updateLighting();
  }, (value) => `${Math.round(value)}%`);

  bindRange('reflectorBounce', (value) => {
    state.reflector.bounce = value;
    updateLighting();
  }, (value) => `${Math.round(value)}%`);

  const exposureRange = document.querySelector('#exposureRange');
  exposureRange.addEventListener('input', () => {
    state.exposure = Number(exposureRange.value);
    updateRangeFill(exposureRange);
    document.querySelector('#exposureValue').textContent = formatExposure(state.exposure);
    document.querySelector('#hudExposure').textContent = formatExposure(state.exposure);
    updateLighting();
    persistState();
  });

  ['key', 'fill', 'reflector'].forEach((rigName) => {
    const marker = document.querySelector(`#${rigName}Marker`);
    marker.addEventListener('pointerdown', (event) => beginDrag(event, rigName, marker));
    marker.addEventListener('pointermove', (event) => moveDrag(event, rigName, marker));
    marker.addEventListener('pointerup', (event) => endDrag(event, marker));
    marker.addEventListener('pointercancel', (event) => endDrag(event, marker));
    marker.addEventListener('keydown', (event) => nudgeRigWithKeyboard(event, rigName, marker));
  });

  resetButton.addEventListener('click', resetSetup);
  document.querySelector('#saveHint').addEventListener('click', resetSetup);
  exportButton.addEventListener('click', exportPng);
}

function bindRange(id, onInput, formatter) {
  const range = document.querySelector(`#${id}`);
  const outputIds = {
    keyPower: 'keyOutput',
    fillPower: 'fillOutput',
    reflectorBounce: 'reflectorOutput',
  };
  range.addEventListener('input', () => {
    const value = Number(range.value);
    updateRangeFill(range);
    onInput(value);
    const output = document.querySelector(`#${outputIds[id]}`);
    if (output) output.textContent = formatter(value);
    persistState();
  });
}

function setCrop(crop) {
  if (!CROP_CONFIG[crop] || state.crop === crop) return;
  state.crop = crop;
  document.querySelectorAll('[data-crop]').forEach((button) => {
    const active = button.dataset.crop === crop;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#frameMeta').textContent = CROP_CONFIG[crop].label;
  document.querySelector('#frameSizeLabel').textContent = CROP_CONFIG[crop].size;
  resizePreview();
  needsRender = true;
  persistState();
}

function setBackdrop(color, name) {
  state.backdrop.color = color;
  state.backdrop.name = name;
  scene.background.set(color);
  backdropMaterial.color.set(color);
  previewFrame.style.backgroundColor = color;
  loadingScreen.style.backgroundColor = color;

  document.querySelectorAll('[data-color]').forEach((button) => {
    const active = button.dataset.color.toLowerCase() === color.toLowerCase();
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    if (active) name = button.dataset.name;
  });

  state.backdrop.name = name;
  document.querySelector('#backdropName').textContent = name;
  document.querySelector('#colorHex').textContent = color.toUpperCase();
  document.querySelector('#customColor').value = color;
  needsRender = true;
}

function beginDrag(event, rigName, marker) {
  event.preventDefault();
  dragState = { rigName, marker, pointerId: event.pointerId };
  marker.classList.add('is-dragging');
  marker.setPointerCapture(event.pointerId);
  updateRigFromPointer(event, rigName);
}

function moveDrag(event, rigName, marker) {
  if (!dragState || dragState.pointerId !== event.pointerId || dragState.marker !== marker) return;
  event.preventDefault();
  updateRigFromPointer(event, rigName);
}

function endDrag(event, marker) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  marker.classList.remove('is-dragging');
  if (marker.hasPointerCapture(event.pointerId)) marker.releasePointerCapture(event.pointerId);
  dragState = null;
  persistState();
}

function updateRigFromPointer(event, rigName) {
  const rect = studioMap.getBoundingClientRect();
  const nx = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0.075, 0.925);
  const ny = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0.16, 0.86);
  const x = THREE.MathUtils.lerp(MAP_X_MIN, MAP_X_MAX, nx);
  const z = THREE.MathUtils.lerp(MAP_Z_MIN, MAP_Z_MAX, ny);
  state[rigName].x = Math.round(x * 20) / 20;
  state[rigName].z = Math.round(z * 20) / 20;
  updateLighting();
  syncRigControls();
}

function nudgeRigWithKeyboard(event, rigName, marker) {
  const amount = event.shiftKey ? 0.25 : 0.1;
  let handled = true;

  if (event.key === 'ArrowLeft') state[rigName].x -= amount;
  else if (event.key === 'ArrowRight') state[rigName].x += amount;
  else if (event.key === 'ArrowUp') state[rigName].z -= amount;
  else if (event.key === 'ArrowDown') state[rigName].z += amount;
  else handled = false;

  if (!handled) return;
  event.preventDefault();
  state[rigName].x = THREE.MathUtils.clamp(state[rigName].x, MAP_X_MIN, MAP_X_MAX);
  state[rigName].z = THREE.MathUtils.clamp(state[rigName].z, MAP_Z_MIN, MAP_Z_MAX);
  updateLighting();
  syncRigControls();
  persistState();
}

function syncRigControls() {
  ['key', 'fill', 'reflector'].forEach((rigName) => {
    const marker = document.querySelector(`#${rigName}Marker`);
    const xPercent = ((state[rigName].x - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN)) * 100;
    const yPercent = ((state[rigName].z - MAP_Z_MIN) / (MAP_Z_MAX - MAP_Z_MIN)) * 100;
    marker.style.left = `${xPercent}%`;
    marker.style.top = `${yPercent}%`;
    const coords = document.querySelector(`#${rigName}MarkerCoords`);
    coords.textContent = `${state[rigName].x >= 0 ? '+' : ''}${state[rigName].x.toFixed(1)} / ${state[rigName].z >= 0 ? '+' : ''}${state[rigName].z.toFixed(1)}`;
  });

  const subjectX = 50;
  const subjectY = 57;
  updateBeam('#keyBeam', state.key, subjectX, subjectY);
  updateBeam('#fillBeam', state.fill, subjectX, subjectY);
  updateBeam('#reflectorBeam', state.reflector, subjectX, subjectY);
}

function updateBeam(selector, rigState, subjectX, subjectY) {
  const line = document.querySelector(selector);
  const xPercent = ((rigState.x - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN)) * 100;
  const yPercent = ((rigState.z - MAP_Z_MIN) / (MAP_Z_MAX - MAP_Z_MIN)) * 100;
  line.setAttribute('x1', (xPercent / 100) * 300);
  line.setAttribute('y1', (yPercent / 100) * 172);
  line.setAttribute('x2', (subjectX / 100) * 300);
  line.setAttribute('y2', (subjectY / 100) * 172);
}

function syncAllControls() {
  document.querySelectorAll('[data-crop]').forEach((button) => {
    const active = button.dataset.crop === state.crop;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#frameMeta').textContent = CROP_CONFIG[state.crop].label;
  document.querySelector('#frameSizeLabel').textContent = CROP_CONFIG[state.crop].size;

  const keyPower = document.querySelector('#keyPower');
  const fillPower = document.querySelector('#fillPower');
  const reflectorBounce = document.querySelector('#reflectorBounce');
  const exposureRange = document.querySelector('#exposureRange');

  keyPower.value = state.key.power;
  fillPower.value = state.fill.power;
  reflectorBounce.value = state.reflector.bounce;
  exposureRange.value = state.exposure;

  updateRangeFill(keyPower);
  updateRangeFill(fillPower);
  updateRangeFill(reflectorBounce);
  updateRangeFill(exposureRange);

  document.querySelector('#keyOutput').textContent = `${Math.round(state.key.power)}%`;
  document.querySelector('#fillOutput').textContent = `${Math.round(state.fill.power)}%`;
  document.querySelector('#reflectorOutput').textContent = `${Math.round(state.reflector.bounce)}%`;
  document.querySelector('#exposureValue').textContent = formatExposure(state.exposure);
  document.querySelector('#hudExposure').textContent = formatExposure(state.exposure);

  document.querySelector('#backdropName').textContent = state.backdrop.name;
  document.querySelector('#colorHex').textContent = state.backdrop.color.toUpperCase();
  document.querySelector('#customColor').value = state.backdrop.color;
  document.querySelectorAll('[data-color]').forEach((button) => {
    const active = button.dataset.color.toLowerCase() === state.backdrop.color.toLowerCase();
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  previewFrame.style.backgroundColor = state.backdrop.color;
  loadingScreen.style.backgroundColor = state.backdrop.color;
  syncRigControls();
}

function updateRangeFill(range) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 100;
  const percent = ((Number(range.value) - min) / (max - min)) * 100;
  range.style.setProperty('--range-fill', `${percent}%`);
}

function formatExposure(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} EV`;
}

function resetSetup() {
  const fresh = structuredClone(DEFAULT_STATE);
  state.crop = fresh.crop;
  state.key = fresh.key;
  state.fill = fresh.fill;
  state.reflector = fresh.reflector;
  state.exposure = fresh.exposure;
  state.backdrop = fresh.backdrop;

  setBackdrop(state.backdrop.color, state.backdrop.name);
  document.querySelectorAll('[data-crop]').forEach((button) => {
    const active = button.dataset.crop === 'square';
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#frameMeta').textContent = CROP_CONFIG.square.label;
  document.querySelector('#frameSizeLabel').textContent = CROP_CONFIG.square.size;

  const keyPower = document.querySelector('#keyPower');
  const fillPower = document.querySelector('#fillPower');
  const reflectorBounce = document.querySelector('#reflectorBounce');
  const exposureRange = document.querySelector('#exposureRange');
  keyPower.value = state.key.power;
  fillPower.value = state.fill.power;
  reflectorBounce.value = state.reflector.bounce;
  exposureRange.value = state.exposure;
  updateRangeFill(keyPower);
  updateRangeFill(fillPower);
  updateRangeFill(reflectorBounce);
  updateRangeFill(exposureRange);
  document.querySelector('#keyOutput').textContent = `${state.key.power}%`;
  document.querySelector('#fillOutput').textContent = `${state.fill.power}%`;
  document.querySelector('#reflectorOutput').textContent = `${state.reflector.bounce}%`;
  document.querySelector('#exposureValue').textContent = formatExposure(state.exposure);
  document.querySelector('#hudExposure').textContent = formatExposure(state.exposure);

  syncRigControls();
  resizePreview();
  updateLighting();
  persistState();
  showToast('Starting light setup restored');
}

function resizePreview() {
  if (!renderer) return;
  const config = CROP_CONFIG[state.crop];
  const style = getComputedStyle(previewWrap);
  const availableWidth = Math.max(120, previewWrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
  const availableHeight = Math.max(120, previewWrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
  let width = availableWidth;
  let height = width / config.aspect;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * config.aspect;
  }

  width = Math.floor(width);
  height = Math.floor(height);
  previewFrame.style.width = `${width}px`;
  previewFrame.style.height = `${height}px`;
  previewFrame.style.aspectRatio = String(config.aspect);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = config.aspect;
  camera.fov = config.fov;
  camera.updateProjectionMatrix();
  needsRender = true;
}

function renderLoop() {
  if (!needsRender) return;
  renderer.render(scene, camera);
  needsRender = false;

  if (!hasRenderedOnce) {
    hasRenderedOnce = true;
    loadingScreen.classList.add('is-hidden');
  }
}

async function exportPng() {
  if (!renderer || exportButton.classList.contains('is-busy')) return;
  const config = CROP_CONFIG[state.crop];
  const originalLabel = exportButton.querySelector('span').textContent;
  exportButton.classList.add('is-busy');
  exportButton.querySelector('span').textContent = 'Rendering…';

  try {
    const previousAspect = camera.aspect;
    const previousFov = camera.fov;
    const previousGearVisibility = studioGear.visible;

    studioGear.visible = false;
    renderer.setPixelRatio(1);
    renderer.setSize(config.width, config.height, false);
    camera.aspect = config.aspect;
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG encoding failed'))), 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `northlight-ceramic-mug-${state.crop}-${config.width}x${config.height}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    studioGear.visible = previousGearVisibility;
    camera.aspect = previousAspect;
    camera.fov = previousFov;
    camera.updateProjectionMatrix();
    resizePreview();
    showToast(`PNG exported · ${config.width} × ${config.height}`);
  } catch (error) {
    console.error(error);
    showToast('Export failed — try again');
    studioGear.visible = true;
    resizePreview();
  } finally {
    exportButton.classList.remove('is-busy');
    exportButton.querySelector('span').textContent = originalLabel;
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
