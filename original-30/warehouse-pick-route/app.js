import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const WAREHOUSE = { width: 24, depth: 18 };
const SHELF_X_MIN = -8.4;
const SHELF_X_MAX = 8.4;
const SHELF_LENGTH = SHELF_X_MAX - SHELF_X_MIN;
const SHELF_DEPTH = 1.15;
const ROW_Z = [-5.6, -2.3, 1.0, 4.3];
const ROW_NAMES = ['A', 'B', 'C', 'D'];
const WEST_X = -10.05;
const EAST_X = 10.05;
const PACK_X = -8.15;
const PACK_Z = 6.35;
const BASE_WALK_SPEED = 2.5;
const PICKER_WALK_SPEED = 1.35;

const PRODUCTS = [
  {
    id: 'nb-01',
    sku: 'NB-01',
    name: 'A5 notebook',
    qty: 3,
    bin: 'A-01',
    row: 0,
    side: 'south',
    x: -5.2,
    lane: 'aisleA',
    targetZ: -4.34,
    color: '#eab95d',
    colorHex: 0xd8a84e,
  },
  {
    id: 'pn-02',
    sku: 'PN-02',
    name: 'Pen set',
    qty: 2,
    bin: 'B-04',
    row: 1,
    side: 'south',
    x: 4.7,
    lane: 'aisleB',
    targetZ: -1.08,
    color: '#75c8c2',
    colorHex: 0x5eb8b1,
  },
  {
    id: 'tp-03',
    sku: 'TP-03',
    name: 'Packing tape',
    qty: 1,
    bin: 'C-02',
    row: 2,
    side: 'north',
    x: -6.1,
    lane: 'aisleB',
    targetZ: -0.14,
    color: '#e6895c',
    colorHex: 0xd6784d,
  },
  {
    id: 'mg-04',
    sku: 'MG-04',
    name: 'Ceramic mug',
    qty: 2,
    bin: 'D-06',
    row: 3,
    side: 'north',
    x: 5.2,
    lane: 'aisleC',
    targetZ: 3.13,
    color: '#9aa7db',
    colorHex: 0x8795c8,
  },
  {
    id: 'fl-05',
    sku: 'FL-05',
    name: 'Document folder',
    qty: 4,
    bin: 'A-08',
    row: 0,
    side: 'north',
    x: 5.9,
    lane: 'back',
    targetZ: -6.8,
    color: '#b5cd8d',
    colorHex: 0xa4bd79,
  },
  {
    id: 'bx-06',
    sku: 'BX-06',
    name: 'Gift box',
    qty: 1,
    bin: 'D-01',
    row: 3,
    side: 'south',
    x: -4.3,
    lane: 'front',
    targetZ: 5.54,
    color: '#d9a0b5',
    colorHex: 0xc98ba4,
  },
];

const H_LANES = [
  { id: 'back', z: -7.55, label: 'Back aisle' },
  { id: 'aisleA', z: -3.95, label: 'Aisle A' },
  { id: 'aisleB', z: -0.65, label: 'Aisle B' },
  { id: 'aisleC', z: 2.65, label: 'Aisle C' },
  { id: 'front', z: 6.85, label: 'Front aisle' },
];

const V_LANES = [
  { id: 'west', x: WEST_X, label: 'West cross-aisle' },
  { id: 'east', x: EAST_X, label: 'East cross-aisle' },
];

const AISLES = [
  { id: 'aisleA', label: 'Aisle A', detail: 'notebooks', type: 'horizontal' },
  { id: 'aisleB', label: 'Aisle B', detail: 'pens + tape', type: 'horizontal' },
  { id: 'aisleC', label: 'Aisle C', detail: 'mug bay', type: 'horizontal' },
  { id: 'back', label: 'Back aisle', detail: 'folders', type: 'horizontal' },
  { id: 'west', label: 'West cross', detail: 'west end', type: 'cross' },
  { id: 'east', label: 'East cross', detail: 'east end', type: 'cross' },
];

const state = {
  items: [],
  blocked: new Set(),
  route: { valid: true, points: [], length: 0, stopDistances: [], unreachableIds: new Set() },
  unreachableIds: new Set(),
  viewMode: 'plan',
  playing: false,
  distance: 0,
  speed: 1,
  nextStopIndex: 0,
  activeStopIndex: -1,
  dwell: 0,
  completed: false,
  autoFollowOnPlay: true,
};

function makeInitialItems() {
  return PRODUCTS.map((product) => ({
    ...product,
    picked: 0,
    unreachable: false,
    facing: product.side === 'south' ? { x: 0, z: -1 } : { x: 0, z: 1 },
    shelfFaceZ:
      product.side === 'south'
        ? ROW_Z[product.row] + SHELF_DEPTH / 2
        : ROW_Z[product.row] - SHELF_DEPTH / 2,
  }));
}

state.items = makeInitialItems();

const sceneContainer = $('#scene-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x091116);
scene.fog = new THREE.Fog(0x091116, 46, 94);

const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 130);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 12;
controls.maxDistance = 60;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(0, 0.25, 0.5);
controls.enabled = true;

const clock = new THREE.Clock();
const sceneRoot = new THREE.Group();
scene.add(sceneRoot);

const routeGroup = new THREE.Group();
const stopMarkerGroup = new THREE.Group();
const blockedVisualGroup = new THREE.Group();
const picker = new THREE.Group();
sceneRoot.add(routeGroup, stopMarkerGroup, blockedVisualGroup, picker);

const pickerParts = {};
const activeRings = [];
const turntable = { elapsed: 0 };

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function makeCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createFloorTexture() {
  const random = mulberry32(73);
  const texture = makeCanvasTexture(512, 512, (ctx, width, height) => {
    ctx.fillStyle = '#c9cdc4';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 2800; i += 1) {
      const shade = 145 + Math.floor(random() * 65);
      ctx.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade - 2}, ${0.05 + random() * 0.12})`;
      const size = 0.5 + random() * 1.5;
      ctx.fillRect(random() * width, random() * height, size, size);
    }
    ctx.strokeStyle = 'rgba(82, 99, 93, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const p = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(width, p);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 5);
  return texture;
}

function createStripedTexture() {
  const texture = makeCanvasTexture(256, 64, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(159, 44, 34, 0.52)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 208, 193, 0.42)';
    ctx.lineWidth = 11;
    for (let x = -height; x < width + height; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, height + 8);
      ctx.lineTo(x + height, -8);
      ctx.stroke();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
}

const floorTexture = createFloorTexture();
const stripedTexture = createStripedTexture();

function addBox(parent, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, height, position, material, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTextPlane(parent, text, options) {
  const texture = makeCanvasTexture(options.textureWidth || 512, options.textureHeight || 160, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.color || 'rgba(54, 68, 67, 0.62)';
    ctx.font = `${options.weight || 600} ${options.fontSize || 64}px ${options.mono ? 'monospace' : 'Arial, sans-serif'}`;
    ctx.fillText(text, width / 2, height / 2 + 2);
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(options.width, options.height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  if (options.rotationZ) mesh.rotation.z = options.rotationZ;
  mesh.position.set(options.x, options.y ?? 0.016, options.z);
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function makeProductTagTexture(item) {
  return makeCanvasTexture(512, 184, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    roundedRect(ctx, 3, 3, width - 6, height - 6, 26);
    ctx.fillStyle = 'rgba(10, 20, 24, 0.94)';
    ctx.fill();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = item.color;
    roundedRect(ctx, 20, 20, 9, height - 40, 5);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f8f4';
    ctx.font = '600 64px monospace';
    ctx.fillText(item.sku, 49, 67);
    ctx.fillStyle = '#a6b6b3';
    ctx.font = '500 31px Arial, sans-serif';
    ctx.fillText(item.name.toUpperCase(), 50, 124);
    ctx.fillStyle = item.color;
    ctx.font = '500 26px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(item.bin, width - 27, 124);
  });
}

function makeBinLabelTexture(item) {
  return makeCanvasTexture(512, 190, (ctx, width, height) => {
    roundedRect(ctx, 2, 2, width - 4, height - 4, 18);
    ctx.fillStyle = '#101a1d';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 236, 230, 0.24)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = item.color;
    ctx.fillRect(0, 0, 17, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1f6f2';
    ctx.font = '600 78px monospace';
    ctx.fillText(item.sku, 40, 75);
    ctx.fillStyle = '#b5c2bf';
    ctx.font = '500 34px Arial, sans-serif';
    ctx.fillText(item.name.toUpperCase(), 42, 143);
    ctx.textAlign = 'right';
    ctx.fillStyle = item.color;
    ctx.font = '500 31px monospace';
    ctx.fillText(`BIN ${item.bin}`, width - 22, 143);
  });
}

function makeStopTexture(number, color, sku) {
  return makeCanvasTexture(256, 256, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 90, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 20, 23, 0.94)';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = '600 92px monospace';
    ctx.fillText(String(number), width / 2, height / 2 - 4);
    if (sku) {
      ctx.fillStyle = '#e9f2ed';
      ctx.font = '500 27px monospace';
      ctx.fillText(sku, width / 2, height / 2 + 66);
    }
  });
}

function makeWorldSprite(texture, width, height, position) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.position.set(position.x, position.y, position.z);
  sprite.renderOrder = 12;
  return sprite;
}

function buildLighting() {
  const hemi = new THREE.HemisphereLight(0xe7f6f2, 0x524d40, 1.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff1d2, 2.8);
  key.position.set(12, 23, 16);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0x9cd7da, 0.7);
  fill.position.set(-16, 13, -10);
  scene.add(fill);

  const rim = new THREE.PointLight(0x5bd4ce, 10, 24, 2);
  rim.position.set(0, 8, 7);
  scene.add(rim);
}

function buildFloor() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xe1e4dc,
    roughness: 0.92,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WAREHOUSE.width, WAREHOUSE.depth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  sceneRoot.add(floor);

  const underlay = new THREE.Mesh(
    new THREE.BoxGeometry(WAREHOUSE.width + 0.55, 0.35, WAREHOUSE.depth + 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1b292d, roughness: 0.9 })
  );
  underlay.position.y = -0.23;
  underlay.receiveShadow = true;
  sceneRoot.add(underlay);

  const gridGroup = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x435857, transparent: true, opacity: 0.16 });
  for (let x = -12; x <= 12; x += 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.012, -9),
      new THREE.Vector3(x, 0.012, 9),
    ]);
    gridGroup.add(new THREE.Line(geometry, lineMaterial));
  }
  for (let z = -9; z <= 9; z += 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-12, 0.012, z),
      new THREE.Vector3(12, 0.012, z),
    ]);
    gridGroup.add(new THREE.Line(geometry, lineMaterial));
  }
  sceneRoot.add(gridGroup);

  const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xe0b84d });
  addBox(sceneRoot, { x: 23.75, y: 0.018, z: 0.045 }, { x: 0, y: 0.018, z: -8.9 }, borderMaterial, {
    castShadow: false,
  });
  addBox(sceneRoot, { x: 23.75, y: 0.018, z: 0.045 }, { x: 0, y: 0.018, z: 8.9 }, borderMaterial, {
    castShadow: false,
  });
  addBox(sceneRoot, { x: 0.045, y: 0.018, z: 17.75 }, { x: -11.9, y: 0.018, z: 0 }, borderMaterial, {
    castShadow: false,
  });
  addBox(sceneRoot, { x: 0.045, y: 0.018, z: 17.75 }, { x: 11.9, y: 0.018, z: 0 }, borderMaterial, {
    castShadow: false,
  });

  addTextPlane(sceneRoot, 'AISLE A', { x: -1.8, z: -3.95, width: 2.4, height: 0.55, fontSize: 58, opacity: 1 });
  addTextPlane(sceneRoot, 'AISLE B', { x: -1.8, z: -0.65, width: 2.4, height: 0.55, fontSize: 58 });
  addTextPlane(sceneRoot, 'AISLE C', { x: -1.8, z: 2.65, width: 2.4, height: 0.55, fontSize: 58 });
  addTextPlane(sceneRoot, 'CROSS AISLE', {
    x: WEST_X,
    z: 1.0,
    width: 2.4,
    height: 0.5,
    fontSize: 48,
    rotationZ: Math.PI / 2,
  });
  addTextPlane(sceneRoot, 'CROSS AISLE', {
    x: EAST_X,
    z: 1.0,
    width: 2.4,
    height: 0.5,
    fontSize: 48,
    rotationZ: Math.PI / 2,
  });
  addTextPlane(sceneRoot, 'ENTRANCE  /  OUTBOUND', {
    x: -8.15,
    z: 8.55,
    width: 4.7,
    height: 0.6,
    fontSize: 42,
    color: 'rgba(66, 83, 80, 0.78)',
  });
}

function buildWarehouseShell() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6f70, roughness: 0.82, metalness: 0.12 });
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x324348, roughness: 0.58, metalness: 0.42 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x8db8b8,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.18,
  });

  addBox(sceneRoot, { x: 24, y: 0.62, z: 0.18 }, { x: 0, y: 0.31, z: -8.9 }, wallMaterial);
  addBox(sceneRoot, { x: 0.18, y: 0.62, z: 18 }, { x: -11.9, y: 0.31, z: 0 }, wallMaterial);
  addBox(sceneRoot, { x: 0.18, y: 0.62, z: 18 }, { x: 11.9, y: 0.31, z: 0 }, wallMaterial);
  addBox(sceneRoot, { x: 2.74, y: 0.52, z: 0.18 }, { x: -10.63, y: 0.26, z: 8.9 }, wallMaterial);
  addBox(sceneRoot, { x: 19.04, y: 0.52, z: 0.18 }, { x: 2.48, y: 0.26, z: 8.9 }, wallMaterial);

  [
    [-11.9, -8.9],
    [11.9, -8.9],
    [-11.9, 8.9],
    [11.9, 8.9],
  ].forEach(([x, z]) => {
    addBox(sceneRoot, { x: 0.26, y: 1.45, z: 0.26 }, { x, y: 0.72, z }, postMaterial);
  });

  addBox(sceneRoot, { x: 2.05, y: 1.0, z: 0.15 }, { x: -8.15, y: 1.72, z: 8.87 }, glassMaterial, {
    castShadow: false,
  });
  const doorFrameTop = addBox(sceneRoot, { x: 2.25, y: 0.11, z: 0.22 }, { x: -8.15, y: 2.2, z: 8.86 }, postMaterial);
  doorFrameTop.castShadow = true;
  addBox(sceneRoot, { x: 0.1, y: 2.0, z: 0.22 }, { x: -9.26, y: 1.1, z: 8.86 }, postMaterial);
  addBox(sceneRoot, { x: 0.1, y: 2.0, z: 0.22 }, { x: -7.04, y: 1.1, z: 8.86 }, postMaterial);
}

function buildShelving() {
  const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x31474a, roughness: 0.54, metalness: 0.42 });
  const darkSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x1b292d, roughness: 0.64, metalness: 0.28 });
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0xc8b991, roughness: 0.8, metalness: 0.05 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c373, roughness: 0.68, metalness: 0.08 });
  const binColors = [0xa98b67, 0x8e9f95, 0xb7aa8b, 0x708d88, 0xb98b71, 0x9d9677];
  const random = mulberry32(211);

  ROW_Z.forEach((rowZ, rowIndex) => {
    const rowGroup = new THREE.Group();
    sceneRoot.add(rowGroup);

    const postXs = [-8.4, -4.2, 0, 4.2, 8.4];
    postXs.forEach((x) => {
      [-SHELF_DEPTH / 2 + 0.08, SHELF_DEPTH / 2 - 0.08].forEach((zOffset) => {
        addBox(
          rowGroup,
          { x: 0.075, y: 2.46, z: 0.075 },
          { x, y: 1.23, z: rowZ + zOffset },
          steelMaterial
        );
      });
    });

    [0.31, 1.01, 1.71, 2.39].forEach((y) => {
      [-SHELF_DEPTH / 2 + 0.08, SHELF_DEPTH / 2 - 0.08].forEach((zOffset) => {
        addBox(
          rowGroup,
          { x: SHELF_LENGTH + 0.1, y: 0.075, z: 0.075 },
          { x: 0, y, z: rowZ + zOffset },
          steelMaterial
        );
      });
    });

    [0.46, 1.16, 1.86].forEach((y) => {
      addBox(rowGroup, { x: SHELF_LENGTH, y: 0.055, z: 0.98 }, { x: 0, y, z: rowZ }, shelfMaterial);
    });

    [-1, 1].forEach((side) => {
      addBox(
        rowGroup,
        { x: SHELF_LENGTH + 0.17, y: 0.022, z: 0.035 },
        { x: 0, y: 0.025, z: rowZ + side * (SHELF_DEPTH / 2 + 0.09) },
        edgeMaterial,
        { castShadow: false }
      );
    });

    for (let i = 0; i < 15; i += 1) {
      const x = -7.7 + i * 1.1;
      const hasProduct = PRODUCTS.some((product) => product.row === rowIndex && Math.abs(product.x - x) < 0.78);
      if (hasProduct) continue;
      [0.49, 1.19].forEach((y, tier) => {
        if ((i + tier + rowIndex) % 5 === 0) return;
        const h = 0.26 + random() * 0.17;
        const side = (i + tier + rowIndex) % 2 === 0 ? 1 : -1;
        const z = rowZ + side * 0.23;
        const material = new THREE.MeshStandardMaterial({
          color: binColors[(i + tier + rowIndex * 2) % binColors.length],
          roughness: 0.82,
        });
        addBox(
          rowGroup,
          { x: 0.82, y: h, z: 0.36 },
          { x, y: y + h / 2, z },
          material,
          { castShadow: false }
        );
      });
    }

    const rowTagTexture = makeCanvasTexture(256, 256, (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 92, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(9, 19, 23, 0.94)';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(107, 221, 214, 0.65)';
      ctx.stroke();
      ctx.fillStyle = '#ecf6f1';
      ctx.font = '600 115px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ROW_NAMES[rowIndex], width / 2, height / 2 + 4);
    });
    [-8.87, 8.87].forEach((x) => {
      const rowTag = makeWorldSprite(rowTagTexture, 0.64, 0.64, { x, y: 2.88, z: rowZ });
      rowTag.renderOrder = 10;
      sceneRoot.add(rowTag);
    });
  });
}

function buildProductBins() {
  const binMaterialCache = new Map();

  state.items.forEach((item) => {
    const rowZ = ROW_Z[item.row];
    const sideSign = item.side === 'south' ? 1 : -1;
    const binZ = rowZ + sideSign * 0.29;
    if (!binMaterialCache.has(item.colorHex)) {
      binMaterialCache.set(
        item.colorHex,
        new THREE.MeshStandardMaterial({ color: item.colorHex, roughness: 0.7, metalness: 0.02 })
      );
    }
    const bin = addBox(
      sceneRoot,
      { x: 1.1, y: 0.54, z: 0.53 },
      { x: item.x, y: 1.462, z: binZ },
      binMaterialCache.get(item.colorHex)
    );
    bin.castShadow = true;

    addBox(
      sceneRoot,
      { x: 1.08, y: 0.065, z: 0.08 },
      { x: item.x, y: 1.705, z: binZ + sideSign * 0.22 },
      new THREE.MeshStandardMaterial({ color: 0xe8dfc9, roughness: 0.58 }),
      { castShadow: false }
    );

    const labelTexture = makeBinLabelTexture(item);
    [1, -1].forEach((faceSign) => {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.01, 0.38),
        new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide })
      );
      label.position.set(item.x, 1.462, rowZ + faceSign * (SHELF_DEPTH / 2 + 0.012));
      if (faceSign === -1) label.rotation.y = Math.PI;
      sceneRoot.add(label);
    });

    const hangingTag = makeWorldSprite(makeProductTagTexture(item), 1.55, 0.56, {
      x: item.x,
      y: 2.83,
      z: rowZ,
    });
    sceneRoot.add(hangingTag);
  });
}

function buildPackingStation() {
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x92704e, roughness: 0.72, metalness: 0.02 });
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0xd5b582, roughness: 0.52, metalness: 0.04 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x33484b, roughness: 0.55, metalness: 0.4 });
  const cardboardMaterial = new THREE.MeshStandardMaterial({ color: 0xb69062, roughness: 0.87 });
  const tapeMaterial = new THREE.MeshStandardMaterial({ color: 0xe3d4af, roughness: 0.64 });

  const counterX = -8.15;
  const counterZ = 7.64;
  addBox(sceneRoot, { x: 2.75, y: 0.14, z: 0.96 }, { x: counterX, y: 1.02, z: counterZ }, topMaterial);
  addBox(sceneRoot, { x: 2.55, y: 0.8, z: 0.76 }, { x: counterX, y: 0.55, z: counterZ }, woodMaterial);
  [-1.17, 1.17].forEach((xOffset) => {
    [-0.31, 0.31].forEach((zOffset) => {
      addBox(
        sceneRoot,
        { x: 0.08, y: 0.92, z: 0.08 },
        { x: counterX + xOffset, y: 0.49, z: counterZ + zOffset },
        metalMaterial
      );
    });
  });

  addBox(sceneRoot, { x: 2.38, y: 0.035, z: 0.56 }, { x: counterX, y: 1.1, z: counterZ }, metalMaterial, {
    castShadow: false,
  });

  [
    { x: -8.6, z: 7.62, w: 0.62, h: 0.42, d: 0.54 },
    { x: -8.25, z: 7.58, w: 0.54, h: 0.34, d: 0.48 },
    { x: -7.55, z: 7.68, w: 0.72, h: 0.5, d: 0.5 },
  ].forEach((box) => {
    addBox(sceneRoot, { x: box.w, y: box.h, z: box.d }, { x: box.x, y: 1.27 + box.h / 2, z: box.z }, cardboardMaterial);
    addBox(
      sceneRoot,
      { x: box.w + 0.015, y: 0.035, z: 0.1 },
      { x: box.x, y: 1.48 + box.h / 2, z: box.z },
      tapeMaterial,
      { castShadow: false }
    );
  });

  const packTexture = makeCanvasTexture(512, 200, (ctx, width, height) => {
    roundedRect(ctx, 2, 2, width - 4, height - 4, 22);
    ctx.fillStyle = '#0b181b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(107, 221, 214, 0.58)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#dffcf7';
    ctx.font = '600 68px monospace';
    ctx.fillText('PACKING', width / 2, 74);
    ctx.fillStyle = '#6bddd6';
    ctx.font = '500 34px monospace';
    ctx.fillText('START  /  RETURN', width / 2, 142);
  });
  const packSprite = makeWorldSprite(packTexture, 2.4, 0.94, { x: counterX, y: 2.52, z: counterZ });
  sceneRoot.add(packSprite);

  const packPad = new THREE.Mesh(
    new THREE.RingGeometry(0.37, 0.48, 32),
    new THREE.MeshBasicMaterial({ color: 0x6bddd6, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  packPad.rotation.x = -Math.PI / 2;
  packPad.position.set(PACK_X, 0.035, PACK_Z);
  sceneRoot.add(packPad);
}

function createPicker() {
  const orange = new THREE.MeshStandardMaterial({ color: 0xf58d48, roughness: 0.66, metalness: 0.04 });
  const orangeDark = new THREE.MeshStandardMaterial({ color: 0xb84f24, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb97c59, roughness: 0.78 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x263b46, roughness: 0.76 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101a1e, roughness: 0.86 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x89f1e6, roughness: 0.52, emissive: 0x164844, emissiveIntensity: 0.45 });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.37, 24),
    new THREE.MeshBasicMaterial({ color: 0x071012, transparent: true, opacity: 0.28, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  shadow.scale.set(1, 1.35, 1);
  picker.add(shadow);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.205, 0.47, 4, 10), orange);
  body.position.y = 1.07;
  body.castShadow = true;
  picker.add(body);

  const vestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.37, 0.06), accent);
  vestPanel.position.set(0, 1.1, 0.18);
  vestPanel.castShadow = false;
  picker.add(vestPanel);

  const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 12), pants);
  hip.position.y = 0.73;
  hip.castShadow = true;
  picker.add(hip);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.172, 16, 12), skin);
  head.position.y = 1.59;
  head.castShadow = true;
  picker.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 16), orangeDark);
  cap.position.y = 1.74;
  cap.castShadow = true;
  picker.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.035, 0.16), orangeDark);
  brim.position.set(0, 1.71, 0.13);
  brim.castShadow = true;
  picker.add(brim);

  const legGeometry = new THREE.CapsuleGeometry(0.075, 0.35, 4, 8);
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.105, 0.67, 0);
    const leg = new THREE.Mesh(legGeometry, pants);
    leg.position.y = -0.25;
    leg.castShadow = true;
    pivot.add(leg);
    picker.add(pivot);
    pickerParts[side < 0 ? 'leftLeg' : 'rightLeg'] = pivot;
  });

  const armGeometry = new THREE.CapsuleGeometry(0.058, 0.34, 4, 8);
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.27, 1.24, 0);
    pivot.rotation.z = side * -0.13;
    const arm = new THREE.Mesh(armGeometry, orange);
    arm.position.y = -0.2;
    arm.castShadow = true;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skin);
    hand.position.y = -0.43;
    pivot.add(hand);
    picker.add(pivot);
    pickerParts[side < 0 ? 'leftArm' : 'rightArm'] = pivot;
  });

  const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.055), dark);
  scanner.position.set(0.31, 0.79, 0.07);
  scanner.rotation.z = -0.15;
  picker.add(scanner);

  picker.position.set(PACK_X, 0, PACK_Z);
  picker.rotation.y = Math.PI;
}

function buildStaticScene() {
  buildLighting();
  buildFloor();
  buildWarehouseShell();
  buildShelving();
  buildProductBins();
  buildPackingStation();
  createPicker();
}

function createGraph() {
  const nodes = new Map();
  const adjacency = new Map();

  function addNode(key, x, z, meta = {}) {
    if (!nodes.has(key)) {
      nodes.set(key, { key, x, z, ...meta });
      adjacency.set(key, []);
    }
    return nodes.get(key);
  }

  function laneNodeKey(laneId, x) {
    return `lane:${laneId}:${x.toFixed(2)}`;
  }

  function addEdge(aKey, bKey, options = {}) {
    if (options.kind === 'horizontal' && state.blocked.has(options.lane)) return;
    if (options.kind === 'vertical' && state.blocked.has(options.lane)) return;
    const a = nodes.get(aKey);
    const b = nodes.get(bKey);
    if (!a || !b) return;
    const distance = Math.hypot(a.x - b.x, a.z - b.z);
    if (distance < 0.0001) return;
    adjacency.get(aKey).push({ node: bKey, distance, ...options });
    adjacency.get(bKey).push({ node: aKey, distance, ...options });
  }

  const hLaneXs = new Map();
  H_LANES.forEach((lane) => {
    const xs = new Set([WEST_X, EAST_X]);
    if (lane.id === 'front') xs.add(PACK_X);
    state.items.forEach((item) => {
      if (item.lane === lane.id) xs.add(item.x);
    });
    hLaneXs.set(lane.id, [...xs].sort((a, b) => a - b));
  });

  H_LANES.forEach((lane) => {
    hLaneXs.get(lane.id).forEach((x) => {
      addNode(laneNodeKey(lane.id, x), x, lane.z, { type: 'lane', lane: lane.id });
    });
    const xs = hLaneXs.get(lane.id);
    for (let index = 0; index < xs.length - 1; index += 1) {
      addEdge(laneNodeKey(lane.id, xs[index]), laneNodeKey(lane.id, xs[index + 1]), {
        kind: 'horizontal',
        lane: lane.id,
      });
    }
  });

  V_LANES.forEach((lane) => {
    H_LANES.forEach((hLane) => {
      addNode(laneNodeKey(hLane.id, lane.x), lane.x, hLane.z, { type: 'lane', lane: hLane.id, cross: lane.id });
    });
    for (let index = 0; index < H_LANES.length - 1; index += 1) {
      addEdge(laneNodeKey(H_LANES[index].id, lane.x), laneNodeKey(H_LANES[index + 1].id, lane.x), {
        kind: 'vertical',
        lane: lane.id,
      });
    }
  });

  state.items.forEach((item) => {
    const stopKey = `stop:${item.id}`;
    addNode(stopKey, item.x, item.targetZ, { type: 'stop', itemId: item.id });
    addEdge(stopKey, laneNodeKey(item.lane, item.x), { kind: 'stop' });
  });

  addNode('pack', PACK_X, PACK_Z, { type: 'pack' });
  addEdge('pack', laneNodeKey('front', PACK_X), { kind: 'pack' });

  return { nodes, adjacency };
}

function shortestPath(graph, startKey, endKey) {
  if (!graph.nodes.has(startKey) || !graph.nodes.has(endKey)) return null;
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(graph.nodes.keys());
  graph.nodes.forEach((_, key) => distances.set(key, Infinity));
  distances.set(startKey, 0);

  while (unvisited.size > 0) {
    let current = null;
    let currentDistance = Infinity;
    unvisited.forEach((key) => {
      if (distances.get(key) < currentDistance) {
        current = key;
        currentDistance = distances.get(key);
      }
    });
    if (current === null || current === endKey) break;
    unvisited.delete(current);
    const neighbours = graph.adjacency.get(current) || [];
    neighbours.forEach((edge) => {
      if (!unvisited.has(edge.node)) return;
      const candidate = currentDistance + edge.distance;
      if (candidate < distances.get(edge.node)) {
        distances.set(edge.node, candidate);
        previous.set(edge.node, current);
      }
    });
  }

  if (!Number.isFinite(distances.get(endKey))) return null;
  const keys = [];
  let cursor = endKey;
  while (cursor) {
    keys.unshift(cursor);
    if (cursor === startKey) break;
    cursor = previous.get(cursor);
  }
  if (keys[0] !== startKey) return null;
  return {
    distance: distances.get(endKey),
    nodes: keys.map((key) => graph.nodes.get(key)),
  };
}

function computeRoute() {
  const graph = createGraph();
  const items = state.items;
  const unreachableIds = new Set();
  const paths = [];

  items.forEach((item) => {
    const path = shortestPath(graph, 'pack', `stop:${item.id}`);
    if (!path) unreachableIds.add(item.id);
  });

  if (unreachableIds.size > 0) {
    return {
      valid: false,
      points: [],
      length: 0,
      stopDistances: [],
      unreachableIds,
    };
  }

  let cursor = 'pack';
  let length = 0;
  const points = [];
  const stopDistances = [];
  const firstNode = graph.nodes.get('pack');
  points.push({ x: firstNode.x, z: firstNode.z });

  items.forEach((item) => {
    const path = shortestPath(graph, cursor, `stop:${item.id}`);
    if (!path) {
      unreachableIds.add(item.id);
      return;
    }
    path.nodes.forEach((node, index) => {
      if (index === 0 && points.length > 0) return;
      const last = points[points.length - 1];
      if (Math.abs(last.x - node.x) < 0.001 && Math.abs(last.z - node.z) < 0.001) return;
      points.push({ x: node.x, z: node.z });
    });
    length += path.distance;
    stopDistances.push(length);
    cursor = `stop:${item.id}`;
  });

  if (unreachableIds.size > 0) {
    return { valid: false, points: [], length: 0, stopDistances: [], unreachableIds };
  }

  const returnPath = shortestPath(graph, cursor, 'pack');
  if (!returnPath) {
    unreachableIds.add('return');
    return { valid: false, points: [], length: 0, stopDistances: [], unreachableIds };
  }
  returnPath.nodes.forEach((node, index) => {
    if (index === 0) return;
    const last = points[points.length - 1];
    if (Math.abs(last.x - node.x) < 0.001 && Math.abs(last.z - node.z) < 0.001) return;
    points.push({ x: node.x, z: node.z });
  });
  length += returnPath.distance;

  return { valid: true, points, length, stopDistances, unreachableIds };
}

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (material.map && material.map.userData?.shared !== true) material.map.dispose();
          if (material.userData?.shared !== true) material.dispose();
        });
      }
    });
  }
}

const routeCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0x73eee5,
  emissive: 0x1aaea6,
  emissiveIntensity: 0.95,
  roughness: 0.35,
  metalness: 0.15,
});
routeCoreMaterial.userData.shared = true;
const routeGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x52d7d1,
  transparent: true,
  opacity: 0.17,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
routeGlowMaterial.userData.shared = true;
stripedTexture.userData.shared = true;

function addTubeBetween(parent, a, b, radius, material, y = 0.075) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  const direction = new THREE.Vector3(dx, 0, dz).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function renderRoute() {
  disposeGroup(routeGroup);
  disposeGroup(stopMarkerGroup);
  activeRings.length = 0;

  if (state.route.valid && state.route.points.length > 1) {
    for (let index = 0; index < state.route.points.length - 1; index += 1) {
      const a = state.route.points[index];
      const b = state.route.points[index + 1];
      addTubeBetween(routeGroup, a, b, 0.13, routeGlowMaterial, 0.055);
      addTubeBetween(routeGroup, a, b, 0.052, routeCoreMaterial, 0.076);
    }

    state.route.points.slice(0, -1).forEach((point, index) => {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), routeCoreMaterial);
      sphere.position.set(point.x, 0.077, point.z);
      routeGroup.add(sphere);
    });

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xb8fff8 });
    let carried = 0;
    for (let segment = 0; segment < state.route.points.length - 1; segment += 1) {
      const a = state.route.points[segment];
      const b = state.route.points[segment + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 1.7) {
        carried += length;
        continue;
      }
      const direction = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      const spacing = 3.3;
      let distance = spacing - (carried % spacing);
      if (distance < 1.1) distance += spacing;
      while (distance < length - 0.65) {
        const ratio = distance / length;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), arrowMaterial);
        cone.position.set(a.x + (b.x - a.x) * ratio, 0.1, a.z + (b.z - a.z) * ratio);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        routeGroup.add(cone);
        distance += spacing;
      }
      carried += length;
    }
  }

  state.items.forEach((item, index) => {
    const unreachable = state.unreachableIds.has(item.id);
    const color = unreachable ? 0xf47262 : 0x6bddd6;
    const marker = new THREE.Group();
    marker.position.set(item.x, 0, item.targetZ);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.37, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    marker.add(ring);

    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.032;
    marker.add(disk);

    const faceLine = addTubeBetween(
      marker,
      { x: 0, z: 0 },
      { x: 0, z: item.shelfFaceZ - item.targetZ },
      0.018,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }),
      0.045
    );
    if (faceLine) faceLine.castShadow = false;

    const numberSprite = makeWorldSprite(makeStopTexture(index + 1, unreachable ? '#f47262' : '#6bddd6', item.sku), 0.58, 0.58, {
      x: 0,
      y: 0.79,
      z: 0,
    });
    marker.add(numberSprite);

    stopMarkerGroup.add(marker);
    activeRings.push({ ring, disk, itemId: item.id, index });
  });
}

function addBarrierTape(parent, lane) {
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2521, roughness: 0.75 });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xe55346, roughness: 0.55, emissive: 0x5b140d, emissiveIntensity: 0.25 });
  const creamMaterial = new THREE.MeshStandardMaterial({ color: 0xf4dfcf, roughness: 0.65 });
  const isHorizontal = lane.type === 'horizontal';
  const laneDef = isHorizontal ? H_LANES.find((item) => item.id === lane.id) : V_LANES.find((item) => item.id === lane.id);
  const x = isHorizontal ? 0 : laneDef.x;
  const z = isHorizontal ? laneDef.z : 0.0;
  const axis = isHorizontal ? 'x' : 'z';

  [-1.25, 1.25].forEach((offset) => {
    const px = axis === 'x' ? x + offset : x;
    const pz = axis === 'z' ? z + offset : z;
    addBox(parent, { x: 0.13, y: 0.08, z: 0.13 }, { x: px, y: 0.035, z: pz }, postMaterial, { castShadow: false });
    addBox(parent, { x: 0.09, y: 0.72, z: 0.09 }, { x: px, y: 0.39, z: pz }, postMaterial, { castShadow: false });
  });
  for (let index = 0; index < 5; index += 1) {
    const offset = -1.15 + index * 0.57;
    const px = axis === 'x' ? x + offset : x;
    const pz = axis === 'z' ? z + offset : z;
    addBox(
      parent,
      axis === 'x' ? { x: 0.57, y: 0.13, z: 0.035 } : { x: 0.035, y: 0.13, z: 0.57 },
      { x: px, y: 0.63, z: pz },
      index % 2 === 0 ? redMaterial : creamMaterial,
      { castShadow: false }
    );
  }

  const signTexture = makeCanvasTexture(512, 190, (ctx, width, height) => {
    roundedRect(ctx, 2, 2, width - 4, height - 4, 22);
    ctx.fillStyle = 'rgba(60, 19, 16, 0.96)';
    ctx.fill();
    ctx.strokeStyle = '#f47262';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#ffd2cc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 61px monospace';
    ctx.fillText('BLOCKED', width / 2, 73);
    ctx.fillStyle = '#f19b91';
    ctx.font = '500 29px monospace';
    ctx.fillText(lane.label.toUpperCase(), width / 2, 137);
  });
  const sign = makeWorldSprite(signTexture, 1.7, 0.63, { x, y: 1.42, z });
  sign.renderOrder = 14;
  parent.add(sign);
}

function renderBlockedVisuals() {
  disposeGroup(blockedVisualGroup);
  state.blocked.forEach((id) => {
    const lane = AISLES.find((item) => item.id === id);
    if (!lane) return;
    if (lane.type === 'horizontal') {
      const laneDef = H_LANES.find((item) => item.id === id);
      const overlay = new THREE.Mesh(
        new THREE.PlaneGeometry(SHELF_LENGTH, 1.42),
        new THREE.MeshBasicMaterial({
          map: stripedTexture,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      overlay.rotation.x = -Math.PI / 2;
      overlay.position.set(0, 0.028, laneDef.z);
      blockedVisualGroup.add(overlay);
    } else {
      const laneDef = V_LANES.find((item) => item.id === id);
      const overlay = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 14.1),
        new THREE.MeshBasicMaterial({
          map: stripedTexture,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      overlay.rotation.x = -Math.PI / 2;
      overlay.rotation.z = Math.PI / 2;
      overlay.position.set(laneDef.x, 0.028, -0.35);
      blockedVisualGroup.add(overlay);
    }
    addBarrierTape(blockedVisualGroup, lane);
  });
}

function routePointAt(distance) {
  const route = state.route;
  if (!route.valid || route.points.length === 0) {
    return { x: PACK_X, z: PACK_Z, direction: new THREE.Vector3(0, 0, -1) };
  }
  if (route.points.length === 1 || route.length <= 0.0001) {
    return { x: route.points[0].x, z: route.points[0].z, direction: new THREE.Vector3(0, 0, -1) };
  }
  let remaining = Math.max(0, Math.min(distance, route.length));
  for (let index = 0; index < route.points.length - 1; index += 1) {
    const a = route.points[index];
    const b = route.points[index + 1];
    const segmentLength = Math.hypot(b.x - a.x, b.z - a.z);
    if (segmentLength < 0.0001) continue;
    if (remaining <= segmentLength || index === route.points.length - 2) {
      const ratio = Math.min(1, remaining / segmentLength);
      return {
        x: a.x + (b.x - a.x) * ratio,
        z: a.z + (b.z - a.z) * ratio,
        direction: new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(),
      };
    }
    remaining -= segmentLength;
  }
  const last = route.points[route.points.length - 1];
  return { x: last.x, z: last.z, direction: new THREE.Vector3(0, 0, -1) };
}

function updatePicker(dt) {
  const point = routePointAt(state.distance);
  const targetX = point.x;
  const targetZ = point.z;
  const smoothing = 1 - Math.exp(-dt * 10);
  picker.position.x += (targetX - picker.position.x) * smoothing;
  picker.position.z += (targetZ - picker.position.z) * smoothing;

  let targetHeading = Math.atan2(point.direction.x, point.direction.z);
  if (state.activeStopIndex >= 0) {
    const item = state.items[state.activeStopIndex];
    if (item) targetHeading = Math.atan2(item.facing.x, item.facing.z);
  } else if (state.completed) {
    targetHeading = Math.PI;
  }

  let delta = targetHeading - picker.rotation.y;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  picker.rotation.y += delta * (1 - Math.exp(-dt * 8));

  const moving = state.playing && state.dwell <= 0;
  const cadence = turntable.elapsed * (state.playing ? 8.2 * state.speed : 2.4);
  const stride = moving ? Math.sin(cadence) * 0.44 : 0;
  if (pickerParts.leftLeg) pickerParts.leftLeg.rotation.x = stride;
  if (pickerParts.rightLeg) pickerParts.rightLeg.rotation.x = -stride;
  if (pickerParts.leftArm) {
    pickerParts.leftArm.rotation.x = state.activeStopIndex >= 0 ? -0.72 : -stride * 0.55;
  }
  if (pickerParts.rightArm) pickerParts.rightArm.rotation.x = state.activeStopIndex >= 0 ? -0.3 : stride * 0.55;
  picker.position.y = moving ? Math.abs(Math.sin(cadence)) * 0.025 : 0;

  activeRings.forEach(({ ring, disk, itemId }) => {
    const selectedItem = state.items[state.activeStopIndex];
    const isActive = selectedItem && selectedItem.id === itemId;
    if (isActive) {
      const pulse = 1 + Math.sin(turntable.elapsed * 7) * 0.12;
      ring.scale.set(pulse, pulse, pulse);
      disk.scale.set(pulse, pulse, pulse);
      ring.material.opacity = 0.65 + Math.sin(turntable.elapsed * 7) * 0.25;
    } else {
      ring.scale.set(1, 1, 1);
      disk.scale.set(1, 1, 1);
    }
  });
}

function setPlanCamera() {
  const aspect = Math.max(0.5, camera.aspect);
  const distance = aspect < 0.92 ? 50 : aspect < 1.2 ? 41 : 38;
  const target = new THREE.Vector3(0, 0.6, 0.5);
  const direction = new THREE.Vector3(0.5, 0.83, 0.74).normalize();
  camera.position.copy(target).addScaledVector(direction, distance);
  controls.target.copy(target);
  camera.lookAt(target);
  controls.update();
}

const followLookTarget = new THREE.Vector3();
const followDesiredPosition = new THREE.Vector3();
let followInitialized = false;

function updateFollowCamera(dt, force = false) {
  const heading = picker.rotation.y;
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  followDesiredPosition
    .set(picker.position.x, 0, picker.position.z)
    .addScaledVector(forward, -4.8)
    .addScaledVector(right, 0.65)
    .add(new THREE.Vector3(0, 3.5, 0));
  followLookTarget.set(picker.position.x, 0.95, picker.position.z).addScaledVector(forward, 1.65);
  if (force || !followInitialized) {
    camera.position.copy(followDesiredPosition);
    controls.target.copy(followLookTarget);
    followInitialized = true;
  } else {
    const positionSmoothing = 1 - Math.exp(-dt * 4.6);
    const lookSmoothing = 1 - Math.exp(-dt * 5.8);
    camera.position.lerp(followDesiredPosition, positionSmoothing);
    controls.target.lerp(followLookTarget, lookSmoothing);
  }
  camera.lookAt(controls.target);
}

function setViewMode(mode, options = {}) {
  state.viewMode = mode;
  $$('.view-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === mode);
  });
  if (mode === 'plan') {
    followInitialized = false;
    controls.enabled = true;
    setPlanCamera();
  } else {
    controls.enabled = false;
    followInitialized = false;
    updateFollowCamera(0, true);
    if (options.toast) showToast('Following the picker');
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const elements = {
  orderList: $('#order-list'),
  emptyOrder: $('#empty-order'),
  totalDistance: $('#total-distance'),
  walkTime: $('#walk-time'),
  stopCount: $('#stop-count'),
  sceneDistance: $('#scene-distance'),
  sceneStops: $('#scene-stops'),
  sceneStatus: $('#scene-status-copy'),
  orderStatus: $('#order-status'),
  blockedList: $('#blocked-list'),
  blockNote: $('#block-note'),
  clearBlocks: $('#clear-blocks'),
  resetOrder: $('#reset-order'),
  playButton: $('#play-button'),
  restartButton: $('#restart-button'),
  playbackTitle: $('#playback-title'),
  playbackTime: $('#playback-time'),
  progressFill: $('#progress-fill'),
  progressPicker: $('#progress-picker'),
  progressTrack: $('.progress-track'),
  unreachableBanner: $('#unreachable-banner'),
  unreachableCopy: $('#unreachable-copy'),
  toast: $('#toast'),
};

let toastTimer = null;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderOrderList() {
  elements.emptyOrder.hidden = state.items.length > 0;
  elements.orderList.hidden = state.items.length === 0;
  elements.orderList.innerHTML = state.items
    .map((item, index) => {
      const active = state.activeStopIndex === index;
      const unreachable = state.unreachableIds.has(item.id);
      const picked = item.picked > 0;
      return `
        <article class="order-item${active ? ' is-active' : ''}${unreachable ? ' is-unreachable' : ''}${picked ? ' is-picked' : ''}" data-id="${escapeHtml(item.id)}" draggable="true">
          <button class="drag-handle" type="button" aria-label="Reorder or move ${escapeHtml(item.sku)}" title="Drag to reorder">⠿</button>
          <div class="stop-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="item-copy">
            <div class="item-code-row">
              <span class="sku">${escapeHtml(item.sku)}</span>
              <span class="bin-tag">BIN ${escapeHtml(item.bin)}</span>
            </div>
            <div class="product-name">${escapeHtml(item.name)}</div>
            <div class="picked-copy">${unreachable ? '<strong>No walkable access</strong>' : `Picked <strong>${item.picked}/${item.qty}</strong>`}</div>
          </div>
          <div class="qty-control" aria-label="Quantity for ${escapeHtml(item.sku)}">
            <button data-action="decrease" type="button" aria-label="Decrease quantity" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
            <span>${item.qty}</span>
            <button data-action="increase" type="button" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-button" data-action="remove" type="button" aria-label="Remove ${escapeHtml(item.sku)}" title="Remove item">×</button>
        </article>
      `;
    })
    .join('');
}

function renderBlockedList() {
  elements.blockedList.innerHTML = AISLES.map((aisle) => {
    const blocked = state.blocked.has(aisle.id);
    return `
      <button class="aisle-toggle${aisle.type === 'cross' ? ' cross' : ''}${blocked ? ' blocked' : ''}" data-block="${aisle.id}" type="button" aria-pressed="${blocked}" title="${escapeHtml(aisle.detail)}">
        <i></i><span>${escapeHtml(aisle.label)}</span>
      </button>
    `;
  }).join('');

  const unreachableNames = state.items
    .filter((item) => state.unreachableIds.has(item.id))
    .map((item) => item.sku);
  if (unreachableNames.length > 0) {
    elements.blockNote.textContent = `${unreachableNames.join(', ')} unreachable. Clear a blocked segment or restore the shelf access.`;
    elements.blockNote.classList.add('warning');
  } else if (state.blocked.size > 0) {
    elements.blockNote.textContent = `Route recalculated around ${state.blocked.size} blocked ${state.blocked.size === 1 ? 'segment' : 'segments'}.`;
    elements.blockNote.classList.remove('warning');
  } else {
    elements.blockNote.textContent = 'Select a segment to simulate a temporary obstruction.';
    elements.blockNote.classList.remove('warning');
  }
}

function statusForUI() {
  if (!state.route.valid) return { label: 'Route blocked', className: 'blocked' };
  if (state.playing) return { label: 'Playing', className: 'playing' };
  if (state.completed) return { label: 'Complete', className: 'complete' };
  if (state.distance > 0.05) return { label: 'Paused', className: 'playing' };
  return { label: 'Ready', className: 'ready' };
}

function updateSummaryUI() {
  const count = state.items.length;
  const valid = state.route.valid && count > 0;
  const distance = valid ? state.route.length : 0;
  const duration = valid ? distance / PICKER_WALK_SPEED : 0;
  elements.totalDistance.textContent = valid ? distance.toFixed(1) : '—';
  elements.walkTime.textContent = valid ? formatDuration(duration) : '—:—';
  elements.stopCount.textContent = String(count);
  elements.sceneDistance.textContent = valid ? distance.toFixed(1) : '—';
  elements.sceneStops.textContent = `${count} ${count === 1 ? 'stop' : 'stops'}`;

  const status = statusForUI();
  const currentStatusLabel = elements.orderStatus.querySelector('span')?.textContent;
  if (currentStatusLabel !== status.label) {
    elements.orderStatus.className = `status-chip ${status.className}`;
    elements.orderStatus.innerHTML = `<i></i><span>${status.label}</span>`;
  }
  elements.sceneStatus.textContent = status.label;

  const progress = state.route.valid && state.route.length > 0 ? (state.distance / state.route.length) * 100 : 0;
  elements.progressFill.style.width = `${Math.min(100, progress)}%`;
  elements.progressPicker.style.left = `${Math.min(100, progress)}%`;
  elements.progressTrack.setAttribute('aria-valuenow', String(Math.round(progress)));
  elements.playbackTime.textContent = formatDuration(state.distance / BASE_WALK_SPEED);

  if (!valid) {
    elements.playbackTitle.textContent = count === 0 ? 'No stops selected' : 'Route blocked · check aisle access';
  } else if (state.completed) {
    elements.playbackTitle.textContent = `All ${count} stops picked · back at packing`;
  } else if (state.playing && state.activeStopIndex >= 0) {
    const item = state.items[state.activeStopIndex];
    elements.playbackTitle.textContent = `Picking ${item.qty} × ${item.sku} at ${item.bin}`;
  } else if (state.playing) {
    if (state.nextStopIndex < count) {
      const item = state.items[state.nextStopIndex];
      elements.playbackTitle.textContent = `En route to ${String(state.nextStopIndex + 1).padStart(2, '0')} · ${item.sku}`;
    } else {
      elements.playbackTitle.textContent = 'Returning to packing station';
    }
  } else if (state.distance > 0.05) {
    elements.playbackTitle.textContent = `Paused · ${Math.round(progress)}% complete`;
  } else {
    elements.playbackTitle.textContent = count > 0 ? `Ready to pick · ${count} ${count === 1 ? 'stop' : 'stops'}` : 'Ready for a new order';
  }

  elements.playButton.disabled = !valid;
  elements.playButton.classList.toggle('playing', state.playing);
  elements.playButton.setAttribute('aria-label', state.playing ? 'Pause route' : 'Play route');
  elements.playButton.title = state.playing ? 'Pause route' : 'Play route';

  const unreachable = state.items.filter((item) => state.unreachableIds.has(item.id));
  elements.unreachableBanner.hidden = unreachable.length === 0 || count === 0;
  if (unreachable.length > 0) {
    elements.unreachableCopy.textContent = `${unreachable.map((item) => item.sku).join(', ')} ${unreachable.length === 1 ? 'is' : 'are'} cut off from the packing station. Playback is locked until access is restored.`;
  }
}

function updateAllUI() {
  renderOrderList();
  renderBlockedList();
  updateSummaryUI();
}

function resetPlaybackState() {
  state.playing = false;
  state.distance = 0;
  state.nextStopIndex = 0;
  state.activeStopIndex = -1;
  state.dwell = 0;
  state.completed = false;
  state.items.forEach((item) => {
    item.picked = 0;
  });
  picker.position.set(PACK_X, 0, PACK_Z);
  picker.rotation.y = 0;
  followInitialized = false;
  if (state.viewMode === 'follow') updateFollowCamera(0, true);
}

function rebuildRoute(message, showMessage = false) {
  resetPlaybackState();
  state.route = computeRoute();
  state.unreachableIds = state.route.unreachableIds;
  state.items.forEach((item) => {
    item.unreachable = state.unreachableIds.has(item.id);
  });
  renderRoute();
  renderBlockedVisuals();
  updateAllUI();
  updatePicker(0);
  if (showMessage && message) showToast(message);
}

function findItem(id) {
  return state.items.find((item) => item.id === id);
}

function commitOrderChange(message) {
  state.items.forEach((item) => {
    item.picked = 0;
  });
  rebuildRoute(message, true);
}

function playRoute() {
  if (!state.route.valid || state.items.length === 0) {
    showToast('Route is not available. Clear the obstruction first.');
    return;
  }
  if (state.completed) {
    resetPlaybackState();
    updateAllUI();
  }
  state.playing = true;
  if (state.autoFollowOnPlay && state.viewMode === 'plan') {
    setViewMode('follow', { toast: true });
  }
  updateAllUI();
}

function pauseRoute() {
  if (!state.playing) return;
  state.playing = false;
  updateAllUI();
}

function restartRoute() {
  resetPlaybackState();
  updateAllUI();
  updatePicker(0);
  if (state.viewMode === 'follow') updateFollowCamera(0, true);
  showToast('Playback reset to packing station');
}

function markStopPicked(index) {
  const item = state.items[index];
  if (!item) return;
  item.picked = item.qty;
  state.activeStopIndex = index;
  state.dwell = 0.78;
  updateAllUI();
}

function updatePlayback(dt) {
  if (!state.playing || !state.route.valid) return;
  if (state.dwell > 0) {
    state.dwell = Math.max(0, state.dwell - dt);
    if (state.dwell === 0) {
      state.activeStopIndex = -1;
      updateAllUI();
    }
    return;
  }

  const step = dt * BASE_WALK_SPEED * state.speed;
  const nextStopDistance =
    state.nextStopIndex < state.route.stopDistances.length
      ? state.route.stopDistances[state.nextStopIndex]
      : state.route.length;
  state.distance = Math.min(nextStopDistance, state.distance + step);

  if (
    state.nextStopIndex < state.route.stopDistances.length &&
    state.distance >= state.route.stopDistances[state.nextStopIndex] - 0.001
  ) {
    state.distance = state.route.stopDistances[state.nextStopIndex];
    markStopPicked(state.nextStopIndex);
    state.nextStopIndex += 1;
    updateSummaryUI();
    return;
  }

  if (state.nextStopIndex >= state.route.stopDistances.length && state.distance >= state.route.length - 0.001) {
    state.distance = state.route.length;
    state.playing = false;
    state.completed = true;
    state.activeStopIndex = -1;
    updateAllUI();
    showToast(`Route complete · ${state.items.length} stops picked`);
    return;
  }

  updateSummaryUI();
}

function moveItemByKeyboard(id, direction) {
  const index = state.items.findIndex((item) => item.id === id);
  const target = Math.max(0, Math.min(state.items.length - 1, index + direction));
  if (index === target) return;
  const [item] = state.items.splice(index, 1);
  state.items.splice(target, 0, item);
  commitOrderChange('Pick sequence updated · playback reset');
}

function commitPointerSort() {
  const ids = $$('.order-item', elements.orderList).map((node) => node.dataset.id);
  if (ids.length !== state.items.length) return false;
  const changed = ids.some((id, index) => state.items[index].id !== id);
  if (!changed) return false;
  state.items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  commitOrderChange('Pick sequence updated · playback reset');
  return true;
}

let sortState = null;

function bindInteractions() {
  elements.orderList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = button.closest('.order-item');
    if (!row) return;
    const item = findItem(row.dataset.id);
    if (!item) return;
    const action = button.dataset.action;
    if (action === 'increase') {
      item.qty += 1;
      commitOrderChange(`${item.sku} quantity updated · playback reset`);
    } else if (action === 'decrease') {
      if (item.qty <= 1) return;
      item.qty -= 1;
      commitOrderChange(`${item.sku} quantity updated · playback reset`);
    } else if (action === 'remove') {
      state.items = state.items.filter((entry) => entry.id !== item.id);
      commitOrderChange(`${item.sku} removed · playback reset`);
    }
  });

  elements.orderList.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('.drag-handle');
    if (!handle) return;
    const row = handle.closest('.order-item');
    if (!row) return;
    event.preventDefault();
    sortState = { id: row.dataset.id, pointerId: event.pointerId, moved: false, source: 'pointer' };
    row.classList.add('dragging');
    document.body.classList.add('is-sorting');
    handle.setPointerCapture?.(event.pointerId);
  });

  document.addEventListener('pointermove', (event) => {
    if (!sortState || event.pointerId !== sortState.pointerId) return;
    const dragged = $(`.order-item[data-id="${CSS.escape(sortState.id)}"]`, elements.orderList);
    if (!dragged) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.order-item');
    if (!target || target === dragged || !elements.orderList.contains(target)) return;
    const rect = target.getBoundingClientRect();
    if (event.clientY < rect.top + rect.height / 2) {
      target.before(dragged);
    } else {
      target.after(dragged);
    }
    sortState.moved = true;
  });

  function endPointerSort(event) {
    if (!sortState || (event.pointerId !== undefined && event.pointerId !== sortState.pointerId)) return;
    const moved = sortState.moved;
    $$('.order-item.dragging', elements.orderList).forEach((row) => row.classList.remove('dragging'));
    document.body.classList.remove('is-sorting');
    sortState = null;
    if (moved) commitPointerSort();
  }

  document.addEventListener('pointerup', endPointerSort);
  document.addEventListener('pointercancel', endPointerSort);

  elements.orderList.addEventListener('dragstart', (event) => {
    if (event.target.closest('button')) {
      event.preventDefault();
      return;
    }
    if (sortState?.source === 'pointer') {
      event.preventDefault();
      return;
    }
    const row = event.target.closest('.order-item');
    if (!row) return;
    sortState = { id: row.dataset.id, pointerId: undefined, moved: false, source: 'native' };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.id);
    row.classList.add('dragging');
    document.body.classList.add('is-sorting');
  });

  elements.orderList.addEventListener('dragover', (event) => {
    if (!sortState || sortState.source !== 'native') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const dragged = $(`.order-item[data-id="${CSS.escape(sortState.id)}"]`, elements.orderList);
    if (!dragged) return;
    const target = event.target.closest('.order-item');
    if (!target || target === dragged) return;
    const rect = target.getBoundingClientRect();
    if (event.clientY < rect.top + rect.height / 2) target.before(dragged);
    else target.after(dragged);
    sortState.moved = true;
  });

  elements.orderList.addEventListener('drop', (event) => {
    if (!sortState || sortState.source !== 'native') return;
    event.preventDefault();
    const moved = sortState.moved;
    $$('.order-item.dragging', elements.orderList).forEach((row) => row.classList.remove('dragging'));
    document.body.classList.remove('is-sorting');
    sortState = null;
    if (moved) commitPointerSort();
  });

  elements.orderList.addEventListener('dragend', () => {
    if (!sortState || sortState.source !== 'native') return;
    const moved = sortState.moved;
    $$('.order-item.dragging', elements.orderList).forEach((row) => row.classList.remove('dragging'));
    document.body.classList.remove('is-sorting');
    sortState = null;
    if (moved) commitPointerSort();
  });

  elements.orderList.addEventListener('keydown', (event) => {
    const handle = event.target.closest('.drag-handle');
    if (!handle) return;
    const row = handle.closest('.order-item');
    if (!row) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveItemByKeyboard(row.dataset.id, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveItemByKeyboard(row.dataset.id, 1);
    }
  });

  elements.blockedList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-block]');
    if (!button) return;
    const id = button.dataset.block;
    if (state.blocked.has(id)) state.blocked.delete(id);
    else state.blocked.add(id);
    const title = AISLES.find((aisle) => aisle.id === id)?.label || 'Aisle';
    rebuildRoute(`${title} ${state.blocked.has(id) ? 'blocked' : 'reopened'} · route recalculated`, true);
  });

  elements.clearBlocks.addEventListener('click', () => {
    if (state.blocked.size === 0) return;
    state.blocked.clear();
    rebuildRoute('All aisle segments reopened', true);
  });

  elements.resetOrder.addEventListener('click', () => {
    state.items = makeInitialItems();
    state.blocked.clear();
    rebuildRoute('Order restored to its ready-to-run state', true);
  });

  elements.playButton.addEventListener('click', () => {
    if (state.playing) pauseRoute();
    else playRoute();
  });

  elements.restartButton.addEventListener('click', restartRoute);

  $$('.speed-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.speed = Number(button.dataset.speed);
      $$('.speed-button').forEach((item) => item.classList.toggle('active', item === button));
      showToast(`Playback speed · ${button.textContent}`);
    });
  });

  $$('.view-button').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.view;
      if (mode === state.viewMode) return;
      setViewMode(mode, { toast: mode === 'follow' });
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.target.matches('input, textarea, button')) return;
    event.preventDefault();
    if (state.playing) pauseRoute();
    else playRoute();
  });

  window.addEventListener('resize', handleResize);
}

function handleResize() {
  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;
  if (width === 0 || height === 0) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (state.viewMode === 'plan') setPlanCamera();
  else updateFollowCamera(0, true);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  turntable.elapsed += dt;
  updatePlayback(dt);
  updatePicker(dt);
  if (state.viewMode === 'follow') updateFollowCamera(dt);
  else controls.update();
  renderer.render(scene, camera);
}

buildStaticScene();
bindInteractions();
rebuildRoute();
handleResize();
setViewMode('plan');
animate();

const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(sceneContainer);
