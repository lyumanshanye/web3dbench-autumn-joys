import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROOM = Object.freeze({
  width: 6,
  depth: 4,
  wallHeight: 2.76,
  boundaryMargin: 0.035,
  collisionGap: 0.045,
  gridStep: 0.25
});

const STORAGE_KEY = 'roomcraft.layout.v1';
const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;

const TYPE_DEFS = {
  sofa: {
    label: 'Sofa',
    icon: '#i-sofa',
    width: 2.35,
    depth: 0.95,
    spawn: { x: 0, z: 0.95 },
    colors: ['#cbb7a1', '#dcd6cc', '#86917c', '#a8684e', '#65747b', '#343837']
  },
  armchair: {
    label: 'Armchair',
    icon: '#i-armchair',
    width: 0.96,
    depth: 0.96,
    spawn: { x: -1.3, z: 1.05 },
    colors: ['#84917c', '#c77858', '#d5c8b6', '#596e76', '#8a745e', '#3d4240']
  },
  coffeeTable: {
    label: 'Coffee table',
    icon: '#i-table',
    width: 1.3,
    depth: 0.72,
    spawn: { x: 0, z: 0.25 },
    colors: ['#78553c', '#9a7657', '#3f4543', '#c5ad8d', '#d8d1c3']
  },
  floorLamp: {
    label: 'Floor lamp',
    icon: '#i-lamp',
    width: 0.56,
    depth: 0.56,
    spawn: { x: 1.9, z: 0.9 },
    colors: ['#e7d8bc', '#f4eee2', '#53636a', '#a66d54', '#2e3331']
  }
};

const INITIAL_LAYOUT = [
  { type: 'sofa', x: 0, z: -1.4, rotation: 0, color: '#cbb7a1' },
  { type: 'coffeeTable', x: 0, z: 0.28, rotation: 0, color: '#78553c' },
  { type: 'armchair', x: -2.24, z: 0.52, rotation: HALF_PI, color: '#84917c' },
  { type: 'floorLamp', x: 2.4, z: -1.38, rotation: 0, color: '#e7d8bc' }
];

const dom = {
  canvas: document.querySelector('#sceneCanvas'),
  stage: document.querySelector('#roomStage'),
  loading: document.querySelector('#loadingScreen'),
  selectionPanel: document.querySelector('#selectionPanel'),
  selectionName: document.querySelector('#selectionName'),
  selectionMeta: document.querySelector('#selectionMeta'),
  selectionIconUse: document.querySelector('#selectionIcon use'),
  swatches: document.querySelector('#colorSwatches'),
  deleteBtn: document.querySelector('#deleteBtn'),
  closeSelection: document.querySelector('#closeSelection'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  toastUse: document.querySelector('#toast use'),
  dropNote: document.querySelector('#dropNote'),
  cameraMode: document.querySelector('#cameraMode'),
  snapStatus: document.querySelector('#snapStatus'),
  interactionHintOrbit: document.querySelector('.interaction-hint .hint-orbit-text'),
  saveBtn: document.querySelector('#saveBtn'),
  restoreBtn: document.querySelector('#restoreBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  pieceCount: document.querySelector('.room-stats span:last-child strong')
};

let pieceIdCounter = 0;
let toastTimer = 0;
let panelConflictTimer = 0;
let pieceTintTimer = 0;
let conflictFlashUntil = 0;
let activeView = 'perspective';
let snapEnabled = true;
let selectedId = null;
let dragState = null;
let emptyClickInfo = null;
let perspectiveUserAdjusted = false;
let activeControls = null;

const pieces = [];

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const perspectiveCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
perspectiveCamera.position.set(6.5, 5.4, 7.3);

const topCamera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
topCamera.position.set(0, 14, 0);
topCamera.up.set(0, 0, -1);
topCamera.lookAt(0, 0, 0);

const perspectiveControls = new OrbitControls(perspectiveCamera, dom.canvas);
perspectiveControls.target.set(0, 0.58, 0);
perspectiveControls.enableDamping = true;
perspectiveControls.dampingFactor = 0.075;
perspectiveControls.enablePan = true;
perspectiveControls.screenSpacePanning = false;
perspectiveControls.minDistance = 5.5;
perspectiveControls.maxDistance = 30;
perspectiveControls.minPolarAngle = 0.3;
perspectiveControls.maxPolarAngle = Math.PI / 2.03;
perspectiveControls.zoomSpeed = 0.8;
perspectiveControls.rotateSpeed = 0.68;
perspectiveControls.addEventListener('start', () => {
  perspectiveUserAdjusted = true;
});

const topControls = new OrbitControls(topCamera, dom.canvas);
topControls.target.set(0, 0, 0);
topControls.enableDamping = true;
topControls.dampingFactor = 0.08;
topControls.enableRotate = false;
topControls.screenSpacePanning = true;
topControls.minZoom = 0.68;
topControls.maxZoom = 2.7;
topControls.zoomSpeed = 0.8;
topControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
topControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
topControls.touches.ONE = THREE.TOUCH.PAN;
topControls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
topControls.enabled = false;

activeControls = perspectiveControls;

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const floorPoint = new THREE.Vector3();
const cameraFitTarget = new THREE.Vector3(0, 0.58, 0);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.91 }),
  wallTrim: new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: 0.82 }),
  platform: new THREE.MeshStandardMaterial({ color: 0xc7b9a6, roughness: 0.90 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4d392b, roughness: 0.62 }),
  blackMetal: new THREE.MeshStandardMaterial({ color: 0x2c302f, roughness: 0.35, metalness: 0.65 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x8e6c42, roughness: 0.33, metalness: 0.74 })
};

const selectionGraphic = createFootprintGraphic(0xc97548);
const conflictGraphic = createFootprintGraphic(0xc84c3d);
selectionGraphic.group.visible = false;
conflictGraphic.group.visible = false;
scene.add(selectionGraphic.group, conflictGraphic.group);

buildEnvironment();
buildLighting();
loadLayout(INITIAL_LAYOUT, { select: null, animate: false, announce: false });
bindUI();
resize();
setView('perspective', { quiet: true });
requestAnimationFrame(() => {
  dom.loading.classList.add('is-hidden');
  window.setTimeout(() => dom.loading.remove(), 400);
});

const clock = new THREE.Clock();

animate();

/* Environment and lighting */
function buildEnvironment() {
  const platform = new THREE.Mesh(
    new RoundedBoxGeometry(ROOM.width + 0.2, 0.18, ROOM.depth + 0.2, 5, 0.075),
    materials.platform
  );
  platform.position.y = -0.09;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);

  const floorTexture = createWoodTexture();
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      roughness: 0.76,
      metalness: 0
    })
  );
  floor.rotation.x = -HALF_PI;
  floor.position.y = 0.012;
  floor.receiveShadow = true;
  scene.add(floor);

  const rugTexture = createRugTexture();
  rugTexture.colorSpace = THREE.SRGBColorSpace;
  rugTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.82, 2.28),
    new THREE.MeshStandardMaterial({
      map: rugTexture,
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1
    })
  );
  rug.rotation.x = -HALF_PI;
  rug.position.set(-0.08, 0.024, 0.3);
  rug.receiveShadow = true;
  scene.add(rug);

  const grid = createFloorGrid();
  grid.position.y = 0.034;
  scene.add(grid);

  buildWalls();
  buildWallArt();
  buildWindow();

  const dimensionMaterial = new THREE.MeshBasicMaterial({
    color: 0x77766f,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  });

  const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.012), dimensionMaterial);
  frontLine.rotation.x = -HALF_PI;
  frontLine.position.set(0, 0.01, 2.19);
  scene.add(frontLine);
}

function buildLighting() {
  const hemisphere = new THREE.HemisphereLight(0xeaf4ff, 0x8e7962, 1.5);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfffaf2, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff1d8, 2.7);
  sun.position.set(4.8, 8.4, 6.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 24;
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3.4;
  sun.target.position.set(0, 0.3, 0);
  scene.add(sun, sun.target);

  const windowFill = new THREE.DirectionalLight(0xd9e9ef, 0.75);
  windowFill.position.set(-5.5, 3.6, -1.4);
  windowFill.target.position.set(0.4, 0.7, 0.3);
  scene.add(windowFill, windowFill.target);

  const softBounce = new THREE.PointLight(0xffd6ad, 5.8, 5.5, 2);
  softBounce.position.set(-0.4, 1.8, 2.1);
  scene.add(softBounce);
}

function buildWalls() {
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width + 0.16, ROOM.wallHeight, 0.14),
    materials.wall
  );
  backWall.position.set(0, ROOM.wallHeight / 2, -ROOM.depth / 2 - 0.07);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, ROOM.wallHeight, ROOM.depth + 0.14),
    materials.wall
  );
  leftWall.position.set(-ROOM.width / 2 - 0.07, ROOM.wallHeight / 2, -0.01);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  scene.add(leftWall);

  const backBase = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.13, 0.055), materials.wallTrim);
  backBase.position.set(0, 0.075, -ROOM.depth / 2 + 0.022);
  backBase.castShadow = true;
  backBase.receiveShadow = true;
  scene.add(backBase);

  const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, ROOM.depth), materials.wallTrim);
  leftBase.position.set(-ROOM.width / 2 + 0.022, 0.075, 0);
  leftBase.castShadow = true;
  leftBase.receiveShadow = true;
  scene.add(leftBase);

  const backTop = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width + 0.02, 0.045, 0.04), materials.wallTrim);
  backTop.position.set(0, ROOM.wallHeight - 0.04, -ROOM.depth / 2 + 0.02);
  scene.add(backTop);

  const leftTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, ROOM.depth), materials.wallTrim);
  leftTop.position.set(-ROOM.width / 2 + 0.02, ROOM.wallHeight - 0.04, 0);
  scene.add(leftTop);
}

function buildWallArt() {
  const artTexture = createArtTexture();
  artTexture.colorSpace = THREE.SRGBColorSpace;

  const artBacking = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.99, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x5b4b3d, roughness: 0.7 })
  );
  artBacking.position.set(0.2, 1.86, -1.974);
  artBacking.castShadow = true;
  scene.add(artBacking);

  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(1.43, 0.88),
    new THREE.MeshStandardMaterial({ map: artTexture, roughness: 0.86 })
  );
  art.position.set(0.2, 1.86, -1.948);
  scene.add(art);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3f342c, roughness: 0.52 });
  const framePieces = [
    { size: [1.59, 0.052, 0.052], pos: [0.2, 2.36, -1.938] },
    { size: [1.59, 0.052, 0.052], pos: [0.2, 1.36, -1.938] },
    { size: [0.052, 1.03, 0.052], pos: [-0.595, 1.86, -1.938] },
    { size: [0.052, 1.03, 0.052], pos: [0.995, 1.86, -1.938] }
  ];

  for (const piece of framePieces) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(...piece.size), frameMat);
    frame.position.set(...piece.pos);
    frame.castShadow = true;
    scene.add(frame);
  }
}

function buildWindow() {
  const windowTexture = createWindowTexture();
  windowTexture.colorSpace = THREE.SRGBColorSpace;

  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.68, 1.55),
    new THREE.MeshBasicMaterial({ map: windowTexture, toneMapped: false })
  );
  pane.rotation.y = HALF_PI;
  pane.position.set(-2.993, 1.63, -0.55);
  scene.add(pane);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f2e7, roughness: 0.68 });
  const parts = [
    { size: [0.062, 0.075, 1.82], pos: [-2.972, 2.43, -0.55] },
    { size: [0.062, 0.075, 1.82], pos: [-2.972, 0.83, -0.55] },
    { size: [0.062, 1.66, 0.075], pos: [-2.972, 1.63, -1.45] },
    { size: [0.062, 1.66, 0.075], pos: [-2.972, 1.63, 0.35] },
    { size: [0.046, 1.56, 0.034], pos: [-2.967, 1.63, -0.55] },
    { size: [0.13, 0.062, 1.92], pos: [-2.935, 0.79, -0.55] }
  ];

  for (const part of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), frameMaterial);
    mesh.position.set(...part.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function createFloorGrid() {
  const positions = [];
  const y = 0;
  const xMin = -ROOM.width / 2;
  const xMax = ROOM.width / 2;
  const zMin = -ROOM.depth / 2;
  const zMax = ROOM.depth / 2;

  for (let x = xMin; x <= xMax + 0.001; x += ROOM.gridStep) {
    positions.push(x, y, zMin, x, y, zMax);
  }
  for (let z = zMin; z <= zMax + 0.001; z += ROOM.gridStep) {
    positions.push(xMin, y, z, xMax, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x58574f,
    transparent: true,
    opacity: 0.11,
    depthWrite: false
  });
  const grid = new THREE.LineSegments(geometry, material);
  grid.renderOrder = 1;
  grid.name = 'floorGrid';
  return grid;
}

/* Furniture models */
function createPiece(type, config = {}) {
  const def = TYPE_DEFS[type];
  if (!def) return null;

  const group = new THREE.Group();
  group.name = `Roomcraft ${def.label}`;
  let colorTargets = [];

  if (type === 'sofa') colorTargets = buildSofa(group, config.color || def.colors[0]);
  if (type === 'armchair') colorTargets = buildArmchair(group, config.color || def.colors[0]);
  if (type === 'coffeeTable') colorTargets = buildCoffeeTable(group, config.color || def.colors[0]);
  if (type === 'floorLamp') colorTargets = buildFloorLamp(group, config.color || def.colors[0]);

  group.position.set(config.x ?? 0, 0, config.z ?? 0);
  group.rotation.y = config.rotation ?? 0;

  const id = `piece-${++pieceIdCounter}`;
  group.userData.pieceId = id;
  group.userData.colorTargets = colorTargets;

  const piece = {
    id,
    type,
    group,
    color: config.color || def.colors[0],
    def
  };

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.owningPieceId = id;
    }
  });

  applyPieceColor(piece, piece.color);
  scene.add(group);
  pieces.push(piece);
  return piece;
}

function buildSofa(group, color) {
  const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0 });
  const fabricLight = new THREE.MeshStandardMaterial({ color, roughness: 0.98, metalness: 0 });
  const targets = [
    { material: fabric, tone: 0 },
    { material: fabricLight, tone: 0.045 }
  ];

  addRoundedBox(group, [2.25, 0.34, 0.88], 0.09, fabric, [0, 0.29, 0]);
  addRoundedBox(group, [2.12, 0.61, 0.17], 0.075, fabric, [0, 0.56, -0.365]);
  addRoundedBox(group, [0.18, 0.58, 0.9], 0.08, fabric, [-1.035, 0.43, 0.005]);
  addRoundedBox(group, [0.18, 0.58, 0.9], 0.08, fabric, [1.035, 0.43, 0.005]);
  addRoundedBox(group, [1.005, 0.17, 0.66], 0.07, fabricLight, [-0.515, 0.51, 0.075]);
  addRoundedBox(group, [1.005, 0.17, 0.66], 0.07, fabricLight, [0.515, 0.51, 0.075]);
  addRoundedBox(group, [0.98, 0.52, 0.15], 0.075, fabricLight, [-0.515, 0.735, -0.305], [-0.11, 0, 0]);
  addRoundedBox(group, [0.98, 0.52, 0.15], 0.075, fabricLight, [0.515, 0.735, -0.305], [-0.11, 0, 0]);
  addRoundedBox(group, [0.44, 0.41, 0.14], 0.06, new THREE.MeshStandardMaterial({ color: 0x7a8974, roughness: 1 }), [0.66, 0.73, -0.15], [0, 0.20, 0.12]);

  const legGeo = new THREE.CylinderGeometry(0.031, 0.039, 0.15, 12);
  for (const x of [-0.92, 0.92]) {
    for (const z of [-0.32, 0.32]) {
      addMesh(group, legGeo, materials.darkWood, [x, 0.075, z]);
    }
  }

  return targets;
}

function buildArmchair(group, color) {
  const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0 });
  const fabricLight = new THREE.MeshStandardMaterial({ color, roughness: 0.99, metalness: 0 });
  const targets = [
    { material: fabric, tone: 0 },
    { material: fabricLight, tone: 0.04 }
  ];

  addRoundedBox(group, [0.81, 0.31, 0.78], 0.09, fabric, [0, 0.25, 0.015]);
  addRoundedBox(group, [0.75, 0.58, 0.17], 0.075, fabric, [0, 0.55, -0.315]);
  addRoundedBox(group, [0.14, 0.48, 0.84], 0.065, fabric, [-0.39, 0.39, 0.01]);
  addRoundedBox(group, [0.14, 0.48, 0.84], 0.065, fabric, [0.39, 0.39, 0.01]);
  addRoundedBox(group, [0.62, 0.16, 0.56], 0.065, fabricLight, [0, 0.445, 0.075]);
  addRoundedBox(group, [0.64, 0.44, 0.14], 0.07, fabricLight, [0, 0.62, -0.255], [-0.1, 0, 0]);

  const legGeo = new THREE.CylinderGeometry(0.025, 0.033, 0.16, 12);
  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.27, 0.27]) {
      addMesh(group, legGeo, materials.darkWood, [x, 0.08, z]);
    }
  }

  return targets;
}

function buildCoffeeTable(group, color) {
  const topMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.02 });
  const shelfMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02 });
  const targets = [
    { material: topMaterial, tone: 0 },
    { material: shelfMaterial, tone: -0.035 }
  ];

  addRoundedBox(group, [1.3, 0.075, 0.72], 0.03, topMaterial, [0, 0.425, 0]);
  addRoundedBox(group, [0.96, 0.045, 0.46], 0.018, shelfMaterial, [0, 0.165, 0]);

  const legGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.39, 12);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.265, 0.265]) {
      addMesh(group, legGeo, materials.darkWood, [x, 0.205, z]);
    }
  }

  const bookOne = new THREE.MeshStandardMaterial({ color: 0xa25f45, roughness: 0.82 });
  const bookTwo = new THREE.MeshStandardMaterial({ color: 0x64746f, roughness: 0.9 });
  addRoundedBox(group, [0.31, 0.037, 0.23], 0.008, bookOne, [-0.31, 0.478, 0.01], [0, 0.1, 0]);
  addRoundedBox(group, [0.26, 0.031, 0.19], 0.006, bookTwo, [-0.30, 0.513, 0.01], [0, -0.06, 0]);

  const vaseMaterial = new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.38 });
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.078, 0.22, 20), vaseMaterial);
  vase.position.set(0.33, 0.575, 0.01);
  group.add(vase);

  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x526551, roughness: 0.88 });
  const stemGeo = new THREE.CylinderGeometry(0.005, 0.007, 0.35, 7);
  for (const [x, z, rz, rx] of [
    [0.31, 0.01, 0.12, 0.05],
    [0.35, 0.02, -0.13, -0.05],
    [0.33, -0.01, 0.02, 0.11]
  ]) {
    const stem = new THREE.Mesh(stemGeo, stemMaterial);
    stem.position.set(x, 0.82, z);
    stem.rotation.set(rx, 0, rz);
    group.add(stem);
  }

  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x6f8065, roughness: 0.9 });
  for (const [x, y, z] of [[0.27, 0.97, 0.01], [0.37, 1.0, 0.02], [0.32, 1.03, -0.02]]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), leafMaterial);
    leaf.scale.set(0.65, 1.25, 0.45);
    leaf.position.set(x, y, z);
    group.add(leaf);
  }

  return targets;
}

function buildFloorLamp(group, color) {
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffd49a),
    emissiveIntensity: 0.06
  });
  const targets = [{ material: shadeMaterial, tone: 0 }];

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.035, 30), materials.blackMetal);
  base.position.y = 0.023;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.47, 14), materials.brass);
  pole.position.y = 0.77;
  group.add(pole);

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.235, 0.28, 32, 1, true), shadeMaterial);
  shade.position.y = 1.59;
  group.add(shade);

  const shadeTop = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.009, 8, 32), materials.brass);
  shadeTop.rotation.x = HALF_PI;
  shadeTop.position.y = 1.73;
  group.add(shadeTop);

  const shadeBottom = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.008, 8, 32), materials.brass);
  shadeBottom.rotation.x = HALF_PI;
  shadeBottom.position.y = 1.45;
  group.add(shadeBottom);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe3b7, toneMapped: false })
  );
  bulb.position.y = 1.56;
  group.add(bulb);

  const lampLight = new THREE.PointLight(0xffc783, 1.1, 2.3, 2);
  lampLight.position.set(0, 1.55, 0);
  group.add(lampLight);

  return targets;
}

function addMesh(parent, geometry, material, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addRoundedBox(parent, size, radius, material, position, rotation = null) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 4, radius);
  return addMesh(parent, geometry, material, position, rotation);
}

function applyPieceColor(piece, color) {
  piece.color = color;
  const base = new THREE.Color(color);
  for (const target of piece.group.userData.colorTargets || []) {
    const tint = base.clone();
    if (target.tone) tint.offsetHSL(0, 0, target.tone);
    target.material.color.copy(tint);
    target.material.needsUpdate = true;
  }
}

/* Placement and selection */
function getFootprint(type, x, z, rotation) {
  const def = TYPE_DEFS[type];
  const quarterTurns = Math.round(normalizeAngle(rotation) / HALF_PI) % 4;
  const swapped = quarterTurns % 2 === 1;
  const width = swapped ? def.depth : def.width;
  const depth = swapped ? def.width : def.depth;
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    width,
    depth
  };
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function validatePlacement(type, x, z, rotation, ignoreId = null) {
  const footprint = getFootprint(type, x, z, rotation);
  const margin = ROOM.boundaryMargin;

  if (
    footprint.minX < -ROOM.width / 2 + margin ||
    footprint.maxX > ROOM.width / 2 - margin ||
    footprint.minZ < -ROOM.depth / 2 + margin ||
    footprint.maxZ > ROOM.depth / 2 - margin
  ) {
    return {
      valid: false,
      reason: 'boundary',
      message: 'That position extends outside the room.',
      footprint
    };
  }

  for (const other of pieces) {
    if (other.id === ignoreId) continue;
    const otherFootprint = getFootprint(
      other.type,
      other.group.position.x,
      other.group.position.z,
      other.group.rotation.y
    );
    if (
      footprint.minX < otherFootprint.maxX + ROOM.collisionGap &&
      footprint.maxX > otherFootprint.minX - ROOM.collisionGap &&
      footprint.minZ < otherFootprint.maxZ + ROOM.collisionGap &&
      footprint.maxZ > otherFootprint.minZ - ROOM.collisionGap
    ) {
      return {
        valid: false,
        reason: 'overlap',
        message: `${TYPE_DEFS[type].label} would overlap the ${other.def.label.toLowerCase()}.`,
        footprint,
        other
      };
    }
  }

  return { valid: true, footprint };
}

function getSelectedPiece() {
  return pieces.find((piece) => piece.id === selectedId) || null;
}

function selectPiece(id) {
  const piece = pieces.find((item) => item.id === id);
  if (!piece) return;

  selectedId = id;
  conflictGraphic.group.visible = false;
  conflictFlashUntil = 0;
  document.body.classList.add('has-selection');
  dom.selectionPanel.classList.add('is-visible');
  dom.selectionPanel.setAttribute('aria-hidden', 'false');
  refreshSelectionUI();
  updateSelectionGraphic(piece, false);
}

function clearSelection() {
  selectedId = null;
  document.body.classList.remove('has-selection');
  dom.selectionPanel.classList.remove('is-visible', 'is-conflict');
  dom.selectionPanel.setAttribute('aria-hidden', 'true');
  selectionGraphic.group.visible = false;
  conflictGraphic.group.visible = false;
  conflictFlashUntil = 0;
}

function refreshSelectionUI() {
  const piece = getSelectedPiece();
  if (!piece) return;

  const def = piece.def;
  const rotation = Math.round(normalizeAngle(piece.group.rotation.y) / HALF_PI) % 4;
  const degrees = rotation * 90;
  const footprint = getFootprint(piece.type, 0, 0, piece.group.rotation.y);

  dom.selectionName.textContent = def.label;
  dom.selectionMeta.textContent = `${footprint.width.toFixed(2)} × ${footprint.depth.toFixed(2)} m · ${degrees}°`;
  dom.selectionIconUse.setAttribute('href', def.icon);

  dom.swatches.replaceChildren();
  for (const color of def.colors) {
    const button = document.createElement('button');
    button.className = 'swatch';
    button.type = 'button';
    button.setAttribute('aria-label', `Change ${def.label.toLowerCase()} color to ${color}`);
    button.style.setProperty('--swatch', color);
    if (color.toLowerCase() === piece.color.toLowerCase()) button.classList.add('is-active');
    button.dataset.color = color;
    dom.swatches.append(button);
  }
}

function updateSelectionGraphic(piece, conflict = false, override = null) {
  const x = override?.x ?? piece.group.position.x;
  const z = override?.z ?? piece.group.position.z;
  const rotation = override?.rotation ?? piece.group.rotation.y;
  const footprint = getFootprint(piece.type, x, z, rotation);
  setGraphicTransform(conflict ? conflictGraphic : selectionGraphic, footprint, x, z, rotation, conflict);

  if (conflict) {
    selectionGraphic.group.visible = false;
    conflictGraphic.group.visible = true;
  } else {
    selectionGraphic.group.visible = true;
    conflictGraphic.group.visible = false;
  }
}

function setGraphicTransform(graphic, footprint, x, z, rotation, conflict) {
  graphic.group.position.set(x, conflict ? 0.047 : 0.043, z);
  graphic.group.rotation.y = rotation;
  graphic.fill.scale.set(footprint.width + 0.09, 1, footprint.depth + 0.09);
  graphic.border.scale.set(footprint.width + 0.13, 1, footprint.depth + 0.13);
  graphic.marker.scale.setScalar(1);
  graphic.marker.position.set(0, 0, footprint.depth / 2 + 0.10);
}

function createFootprintGraphic(color) {
  const group = new THREE.Group();
  group.renderOrder = 3;

  const fillMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const fillGeometry = new THREE.PlaneGeometry(1, 1);
  fillGeometry.rotateX(-HALF_PI);
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.renderOrder = 3;

  const borderGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(-0.5, 0, 0.5)
  ]);
  const borderMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false
  });
  const border = new THREE.LineLoop(borderGeometry, borderMaterial);
  border.renderOrder = 4;

  const markerGeometry = new THREE.ConeGeometry(0.055, 0.12, 3);
  markerGeometry.rotateX(HALF_PI);
  const marker = new THREE.Mesh(
    markerGeometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })
  );
  marker.renderOrder = 4;

  group.add(fill, border, marker);
  return { group, fill, border, marker };
}

function flashConflictGraphic(piece, placement, message) {
  const conflict = validatePlacement(
    piece.type,
    placement.x,
    placement.z,
    placement.rotation,
    piece.id
  );
  if (conflict.valid) return;

  setGraphicTransform(
    conflictGraphic,
    conflict.footprint,
    placement.x,
    placement.z,
    placement.rotation,
    true
  );
  conflictGraphic.group.visible = true;
  conflictFlashUntil = performance.now() + 1050;

  setPieceConflictTint(piece, true);
  flashPanelConflict();
  showToast(message || conflict.message, 'error');
}

function setPieceConflictTint(piece, active) {
  window.clearTimeout(pieceTintTimer);

  if (active) {
    for (const mesh of collectMeshes(piece.group)) {
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of meshMaterials) {
        if (!material || !material.emissive) continue;
        if (!material.userData.roomcraftEmissive) {
          material.userData.roomcraftEmissive = {
            color: material.emissive.clone(),
            intensity: material.emissiveIntensity
          };
        }
        material.emissive.set(0xc84c3d);
        material.emissiveIntensity = 0.18;
      }
    }

    pieceTintTimer = window.setTimeout(() => setPieceConflictTint(piece, false), 720);
  } else {
    for (const mesh of collectMeshes(piece.group)) {
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of meshMaterials) {
        if (!material || !material.emissive || !material.userData.roomcraftEmissive) continue;
        material.emissive.copy(material.userData.roomcraftEmissive.color);
        material.emissiveIntensity = material.userData.roomcraftEmissive.intensity;
        delete material.userData.roomcraftEmissive;
      }
    }
  }
}

function collectMeshes(group) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes;
}

function flashPanelConflict() {
  window.clearTimeout(panelConflictTimer);
  dom.selectionPanel.classList.remove('is-conflict');
  void dom.selectionPanel.offsetWidth;
  dom.selectionPanel.classList.add('is-conflict');
  panelConflictTimer = window.setTimeout(() => {
    dom.selectionPanel.classList.remove('is-conflict');
  }, 760);
}

/* Layout actions */
function addPiece(type, options = {}) {
  const def = TYPE_DEFS[type];
  if (!def) return null;

  const placement = options.placement || findOpenPlacement(type);
  if (!placement) {
    showToast(`No open floor space for another ${def.label.toLowerCase()}.`, 'error');
    return null;
  }

  const piece = createPiece(type, {
    x: placement.x,
    z: placement.z,
    rotation: placement.rotation,
    color: placement.color || def.colors[0]
  });
  if (!piece) return null;

  if (options.animate !== false) {
    piece.group.scale.setScalar(0.78);
    piece.spawnStarted = performance.now();
  }

  updatePieceCount();
  if (options.select !== false) selectPiece(piece.id);
  if (options.announce !== false) {
    showToast(`${def.label} added to the room.`);
  }
  return piece;
}

function findOpenPlacement(type) {
  const def = TYPE_DEFS[type];
  const candidates = [];
  const step = ROOM.gridStep;
  const preferred = def.spawn;

  for (let z = -ROOM.depth / 2 + step; z <= ROOM.depth / 2 - step; z += step) {
    for (let x = -ROOM.width / 2 + step; x <= ROOM.width / 2 - step; x += step) {
      const dx = x - preferred.x;
      const dz = z - preferred.z;
      candidates.push({ x: roundTo(x, 3), z: roundTo(z, 3), distance: dx * dx + dz * dz });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);

  for (const rotation of [0, HALF_PI]) {
    for (const candidate of candidates) {
      if (validatePlacement(type, candidate.x, candidate.z, rotation).valid) {
        return { x: candidate.x, z: candidate.z, rotation };
      }
    }
  }
  return null;
}

function rotateSelected(direction) {
  const piece = getSelectedPiece();
  if (!piece) return;

  const nextRotation = normalizeAngle(piece.group.rotation.y + direction * HALF_PI);
  const result = validatePlacement(
    piece.type,
    piece.group.position.x,
    piece.group.position.z,
    nextRotation,
    piece.id
  );

  if (!result.valid) {
    flashConflictGraphic(piece, {
      x: piece.group.position.x,
      z: piece.group.position.z,
      rotation: nextRotation
    }, `Rotation blocked — ${result.message.charAt(0).toLowerCase()}${result.message.slice(1)}`);
    return;
  }

  piece.group.rotation.y = nextRotation;
  refreshSelectionUI();
  updateSelectionGraphic(piece, false);
}

function deleteSelected() {
  const piece = getSelectedPiece();
  if (!piece) return;

  const label = piece.def.label;
  scene.remove(piece.group);
  disposeGroup(piece.group);
  const index = pieces.indexOf(piece);
  if (index >= 0) pieces.splice(index, 1);

  clearSelection();
  updatePieceCount();
  showToast(`${label} removed.`);
}

function updatePieceCount() {
  if (dom.pieceCount) dom.pieceCount.textContent = String(pieces.length);
}

function disposeGroup(group) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      material?.dispose?.();
    }
  });
}

function clearPieces() {
  clearSelection();
  for (const piece of pieces) {
    scene.remove(piece.group);
    disposeGroup(piece.group);
  }
  pieces.length = 0;
  updatePieceCount();
}

function loadLayout(layout, options = {}) {
  clearPieces();

  for (const item of layout) {
    if (!TYPE_DEFS[item.type]) continue;
    const piece = createPiece(item.type, {
      x: clamp(Number(item.x) || 0, -ROOM.width / 2, ROOM.width / 2),
      z: clamp(Number(item.z) || 0, -ROOM.depth / 2, ROOM.depth / 2),
      rotation: normalizeAngle(Number(item.rotation) || 0),
      color: validColor(item.color) ? item.color : TYPE_DEFS[item.type].colors[0]
    });

    if (piece && options.animate) {
      piece.group.scale.setScalar(0.78);
      piece.spawnStarted = performance.now();
    }
  }

  updatePieceCount();
  if (options.select) selectPiece(options.select);
  if (options.announce) showToast('Initial layout restored.');
}

/* Save and restore */
function saveLayout() {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    pieces: pieces.map((piece) => ({
      type: piece.type,
      x: roundTo(piece.group.position.x, 4),
      z: roundTo(piece.group.position.z, 4),
      rotation: roundTo(normalizeAngle(piece.group.rotation.y), 4),
      color: piece.color
    }))
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    dom.saveBtn.classList.add('is-saved');
    window.setTimeout(() => dom.saveBtn.classList.remove('is-saved'), 900);
    showToast('Layout saved to this browser.');
  } catch (error) {
    console.error('Roomcraft save failed', error);
    showToast('Could not save — browser storage is unavailable.', 'error');
  }
}

function restoreLayout() {
  let payload = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) payload = JSON.parse(raw);
  } catch (error) {
    console.error('Roomcraft restore failed', error);
  }

  if (!payload || !Array.isArray(payload.pieces) || !payload.pieces.length) {
    showToast('No saved layout found on this browser.', 'error');
    return;
  }

  const validPieces = payload.pieces.filter((item) => item && TYPE_DEFS[item.type]);
  if (!validPieces.length) {
    showToast('The saved layout could not be read.', 'error');
    return;
  }

  clearPieces();
  for (const item of validPieces) {
    createPiece(item.type, {
      x: clamp(Number(item.x) || 0, -ROOM.width / 2, ROOM.width / 2),
      z: clamp(Number(item.z) || 0, -ROOM.depth / 2, ROOM.depth / 2),
      rotation: normalizeAngle(Number(item.rotation) || 0),
      color: validColor(item.color) ? item.color : TYPE_DEFS[item.type].colors[0]
    });
  }
  updatePieceCount();
  showToast('Saved layout restored.');
}

function resetLayout() {
  if (dragState) cancelDrag();
  loadLayout(INITIAL_LAYOUT, { animate: true, announce: false });
  showToast('Initial living room restored.');
}

/* Views */
function setView(view, options = {}) {
  activeView = view;
  if (dragState) cancelDrag();

  const isTop = view === 'top';
  perspectiveControls.enabled = !isTop;
  topControls.enabled = isTop;
  activeControls = isTop ? topControls : perspectiveControls;

  if (isTop) {
    resizeTopCamera();
    topControls.update();
    dom.cameraMode.textContent = 'Top-down floor plan';
    if (dom.interactionHintOrbit) dom.interactionHintOrbit.textContent = 'Drag to pan';
  } else {
    resizePerspectiveCamera();
    perspectiveControls.update();
    dom.cameraMode.textContent = 'Isometric perspective';
    if (dom.interactionHintOrbit) dom.interactionHintOrbit.textContent = 'Drag room to orbit';
  }

  for (const button of document.querySelectorAll('[data-view]')) {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  }

  const grid = scene.getObjectByName('floorGrid');
  if (grid?.material) grid.material.opacity = isTop ? 0.24 : 0.11;

  if (!options.quiet && selectedId) {
    const piece = getSelectedPiece();
    if (piece) updateSelectionGraphic(piece, false);
  }
}

function resize() {
  const width = dom.stage.clientWidth;
  const height = dom.stage.clientHeight;
  if (!width || !height) return;

  renderer.setSize(width, height, false);
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  resizeTopCamera();

  if (!perspectiveUserAdjusted) resizePerspectiveCamera();
  else perspectiveControls.update();
}

function resizeTopCamera() {
  const width = dom.stage.clientWidth || 1;
  const height = dom.stage.clientHeight || 1;
  const aspect = width / height;
  const portrait = aspect < 0.82;
  const roomWidth = portrait ? 4.7 : 6.75;
  const roomHeight = portrait ? 6.9 : 4.9;
  const viewHeight = Math.max(roomHeight, roomWidth / aspect);
  const viewWidth = viewHeight * aspect;
  const desiredUp = portrait ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, -1);

  if (!topCamera.up.equals(desiredUp)) {
    topCamera.up.copy(desiredUp);
    topCamera.lookAt(topControls.target);
  }

  topCamera.left = -viewWidth / 2;
  topCamera.right = viewWidth / 2;
  topCamera.top = viewHeight / 2;
  topCamera.bottom = -viewHeight / 2;
  topCamera.updateProjectionMatrix();
}

function resizePerspectiveCamera() {
  const width = dom.stage.clientWidth || 1;
  const height = dom.stage.clientHeight || 1;
  const aspect = width / height;
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  const direction = new THREE.Vector3(0.61, 0.52, 0.72).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const cameraRight = new THREE.Vector3().crossVectors(worldUp, direction).normalize();
  const cameraUp = new THREE.Vector3().crossVectors(cameraRight, direction).negate().normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov) / 2);
  const tanH = tanV * aspect;
  const points = [];

  for (const x of [-ROOM.width / 2 - 0.12, ROOM.width / 2 + 0.12]) {
    for (const z of [-ROOM.depth / 2 - 0.12, ROOM.depth / 2 + 0.12]) {
      for (const y of [0, ROOM.wallHeight + 0.06]) {
        points.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  let distance = 8;
  const relative = new THREE.Vector3();
  for (const point of points) {
    relative.copy(point).sub(cameraFitTarget);
    const depth = relative.dot(direction);
    const x = Math.abs(relative.dot(cameraRight));
    const y = Math.abs(relative.dot(cameraUp));
    const horizontalDistance = x / (tanH * 0.88);
    const verticalDistance = y / (tanV * 0.82);
    distance = Math.max(distance, depth + horizontalDistance, depth + verticalDistance);
  }

  distance = Math.min(distance, 26);
  perspectiveCamera.position.copy(cameraFitTarget).addScaledVector(direction, distance);
  perspectiveCamera.lookAt(cameraFitTarget);
  perspectiveControls.target.copy(cameraFitTarget);
  perspectiveControls.update();
}

/* Interaction */
function bindUI() {
  for (const button of document.querySelectorAll('[data-add]')) {
    button.addEventListener('click', () => addPiece(button.dataset.add));
  }

  for (const button of document.querySelectorAll('[data-snap-toggle]')) {
    button.addEventListener('click', toggleSnap);
  }

  for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => setView(button.dataset.view));
  }

  for (const button of document.querySelectorAll('[data-rotate]')) {
    button.addEventListener('click', () => rotateSelected(Number(button.dataset.rotate)));
  }

  dom.swatches.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    if (!swatch) return;
    const piece = getSelectedPiece();
    if (!piece) return;
    applyPieceColor(piece, swatch.dataset.color);
    for (const button of dom.swatches.querySelectorAll('[data-color]')) {
      button.classList.toggle('is-active', button === swatch);
    }
  });

  dom.deleteBtn.addEventListener('click', deleteSelected);
  dom.closeSelection.addEventListener('click', clearSelection);
  dom.saveBtn.addEventListener('click', saveLayout);
  dom.restoreBtn.addEventListener('click', restoreLayout);
  dom.resetBtn.addEventListener('click', resetLayout);

  dom.canvas.addEventListener('pointerdown', onCanvasPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);

  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(dom.stage);
  }
}

function toggleSnap() {
  snapEnabled = !snapEnabled;
  for (const button of document.querySelectorAll('[data-snap-toggle]')) {
    if (button.classList.contains('switch')) {
      button.setAttribute('aria-checked', String(snapEnabled));
    } else {
      button.setAttribute('aria-pressed', String(snapEnabled));
    }
  }
  dom.snapStatus.textContent = snapEnabled ? 'Grid 25 cm' : 'Free placement';
  showToast(snapEnabled ? 'Grid snapping on — 25 cm.' : 'Grid snapping off.');
}

function onCanvasPointerDown(event) {
  if (event.button !== 0) return;

  const piece = getPieceAt(event.clientX, event.clientY);
  if (!piece) {
    emptyClickInfo = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      pointerId: event.pointerId
    };
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  selectPiece(piece.id);
  beginDrag(event, piece);
}

function beginDrag(event, piece) {
  const hit = getFloorIntersection(event.clientX, event.clientY);
  if (!hit) return;

  const start = {
    x: piece.group.position.x,
    z: piece.group.position.z,
    rotation: piece.group.rotation.y
  };

  dragState = {
    piece,
    pointerId: event.pointerId,
    startPointer: { x: event.clientX, y: event.clientY },
    floorStart: { x: hit.x, z: hit.z },
    start,
    lastValid: { ...start },
    candidate: { ...start },
    valid: true,
    moved: false
  };

  perspectiveControls.enabled = false;
  topControls.enabled = false;
  document.body.classList.add('is-dragging');
  dom.dropNote.textContent = snapEnabled ? 'Release to place · grid on' : 'Release to place';
  dom.dropNote.classList.add('is-visible');
  dom.dropNote.classList.remove('is-invalid');

  try {
    dom.canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer capture is best-effort on older mobile browsers.
  }
}

function onPointerMove(event) {
  if (dragState && event.pointerId === dragState.pointerId) {
    event.preventDefault();
    updateDrag(event);
    return;
  }

  if (!dragState && event.target === dom.canvas && event.buttons === 0) {
    const hovered = getPieceAt(event.clientX, event.clientY);
    document.body.classList.toggle('is-hovering-piece', Boolean(hovered));
  }
}

function updateDrag(event) {
  const hit = getFloorIntersection(event.clientX, event.clientY);
  if (!hit) return;

  let x = dragState.start.x + (hit.x - dragState.floorStart.x);
  let z = dragState.start.z + (hit.z - dragState.floorStart.z);

  if (snapEnabled) {
    x = Math.round(x / ROOM.gridStep) * ROOM.gridStep;
    z = Math.round(z / ROOM.gridStep) * ROOM.gridStep;
  }

  x = roundTo(x, 4);
  z = roundTo(z, 4);

  const distance = Math.hypot(
    event.clientX - dragState.startPointer.x,
    event.clientY - dragState.startPointer.y
  );
  if (distance > 3) dragState.moved = true;

  dragState.piece.group.position.set(x, 0, z);
  const result = validatePlacement(
    dragState.piece.type,
    x,
    z,
    dragState.piece.group.rotation.y,
    dragState.piece.id
  );

  dragState.candidate = { x, z, rotation: dragState.piece.group.rotation.y };
  dragState.valid = result.valid;

  if (result.valid) {
    dragState.lastValid = { x, z, rotation: dragState.piece.group.rotation.y };
    updateSelectionGraphic(dragState.piece, false);
    dom.dropNote.textContent = snapEnabled ? 'Release to place · grid on' : 'Release to place';
    dom.dropNote.classList.remove('is-invalid');
    setPieceConflictTint(dragState.piece, false);
  } else {
    updateSelectionGraphic(dragState.piece, true);
    dom.dropNote.textContent = result.reason === 'boundary' ? 'Outside room bounds' : 'Overlaps another piece';
    dom.dropNote.classList.add('is-invalid');
    setPieceConflictTint(dragState.piece, true);
  }
}

function onPointerUp(event) {
  if (dragState && event.pointerId === dragState.pointerId) {
    finishDrag(event.pointerId, true);
    return;
  }

  if (
    emptyClickInfo &&
    emptyClickInfo.pointerId === event.pointerId &&
    Math.hypot(event.clientX - emptyClickInfo.x, event.clientY - emptyClickInfo.y) < 6 &&
    performance.now() - emptyClickInfo.time < 700
  ) {
    const piece = getPieceAt(event.clientX, event.clientY);
    if (!piece) clearSelection();
  }
  emptyClickInfo = null;
}

function onPointerCancel(event) {
  if (dragState && event.pointerId === dragState.pointerId) {
    cancelDrag();
  }
}

function finishDrag(pointerId, commitIfValid) {
  if (!dragState) return;

  const state = dragState;
  const piece = state.piece;
  const invalid = !state.valid;

  try {
    dom.canvas.releasePointerCapture(pointerId);
  } catch (error) {
    // Ignore browsers that already released capture.
  }

  if (invalid && commitIfValid) {
    piece.group.position.set(state.lastValid.x, 0, state.lastValid.z);
    piece.group.rotation.y = state.lastValid.rotation;
    flashConflictGraphic(piece, state.candidate, 'Placement blocked — returning to the last valid position.');
  } else {
    piece.group.position.set(state.lastValid.x, 0, state.lastValid.z);
    piece.group.rotation.y = state.lastValid.rotation;
  }

  if (!invalid) setPieceConflictTint(piece, false);
  perspectiveControls.enabled = activeView === 'perspective';
  topControls.enabled = activeView === 'top';
  document.body.classList.remove('is-dragging');
  dom.dropNote.classList.remove('is-visible', 'is-invalid');
  dragState = null;
  emptyClickInfo = null;

  if (selectedId === piece.id && !invalid) updateSelectionGraphic(piece, false);
  if (selectedId === piece.id && invalid) selectionGraphic.group.visible = true;
  emptyClickInfo = null;
}

function cancelDrag() {
  if (!dragState) return;
  const state = dragState;
  state.piece.group.position.set(state.lastValid.x, 0, state.lastValid.z);
  state.piece.group.rotation.y = state.lastValid.rotation;
  setPieceConflictTint(state.piece, false);
  perspectiveControls.enabled = activeView === 'perspective';
  topControls.enabled = activeView === 'top';
  document.body.classList.remove('is-dragging');
  dom.dropNote.classList.remove('is-visible', 'is-invalid');
  dragState = null;
  emptyClickInfo = null;
  updateSelectionGraphic(state.piece, false);
}

function getFloorIntersection(clientX, clientY) {
  setPointerCoordinates(clientX, clientY);
  raycaster.setFromCamera(pointerNdc, getActiveCamera());
  const point = raycaster.ray.intersectPlane(dragPlane, floorPoint);
  return point ? { x: point.x, z: point.z } : null;
}

function getPieceAt(clientX, clientY) {
  setPointerCoordinates(clientX, clientY);
  raycaster.setFromCamera(pointerNdc, getActiveCamera());
  const hits = raycaster.intersectObjects(pieces.map((piece) => piece.group), true);
  if (!hits.length) return null;

  let node = hits[0].object;
  while (node && !node.userData.pieceId) node = node.parent;
  if (!node?.userData.pieceId) return null;
  return pieces.find((piece) => piece.id === node.userData.pieceId) || null;
}

function setPointerCoordinates(clientX, clientY) {
  const rect = dom.canvas.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function getActiveCamera() {
  return activeView === 'top' ? topCamera : perspectiveCamera;
}

function onKeyDown(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

  if (event.key === 'Escape') {
    if (dragState) cancelDrag();
    else clearSelection();
    return;
  }

  if (!selectedId) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelected();
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    rotateSelected(event.shiftKey ? -1 : 1);
  }
}

/* Feedback */
function showToast(message, type = 'success') {
  window.clearTimeout(toastTimer);
  dom.toastMessage.textContent = message;
  dom.toast.classList.toggle('is-error', type === 'error');
  dom.toastUse.setAttribute('href', type === 'error' ? '#i-alert' : '#i-check');
  dom.toast.classList.remove('is-visible');
  void dom.toast.offsetWidth;
  dom.toast.classList.add('is-visible');

  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 2850);
}

/* Utilities */
function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function validColor(color) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(7431);
  const palette = ['#b99a78', '#b19170', '#c0a27f', '#b69774', '#c3a783'];
  const plankHeight = 80;
  const plankWidth = 270;

  ctx.fillStyle = '#b49673';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < Math.ceil(canvas.height / plankHeight); row += 1) {
    const offset = row % 2 === 0 ? -96 : 36;
    for (let x = offset; x < canvas.width + plankWidth; x += plankWidth) {
      const y = row * plankHeight;
      ctx.fillStyle = palette[Math.floor(random() * palette.length)];
      ctx.fillRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, plankWidth - 4, plankHeight - 4);
      ctx.clip();
      for (let line = 0; line < 18; line += 1) {
        const grainY = y + random() * plankHeight;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(75, 48, 29, ${0.018 + random() * 0.035})`;
        ctx.lineWidth = 0.7 + random() * 1.5;
        ctx.moveTo(x, grainY);
        ctx.bezierCurveTo(
          x + plankWidth * 0.3,
          grainY + (random() - 0.5) * 9,
          x + plankWidth * 0.7,
          grainY + (random() - 0.5) * 9,
          x + plankWidth,
          grainY + (random() - 0.5) * 5
        );
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(77, 53, 34, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, plankWidth - 1.5, plankHeight - 1.5);
    }
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(90,62,40,0.055)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return new THREE.CanvasTexture(canvas);
}

function createRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(2907);

  ctx.fillStyle = '#d2c4b0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(104, 88, 68, 0.34)';
  ctx.lineWidth = 12;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
  ctx.strokeStyle = 'rgba(250, 245, 234, 0.42)';
  ctx.lineWidth = 4;
  ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
  ctx.strokeStyle = 'rgba(109, 92, 72, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 72, canvas.width - 144, canvas.height - 144);

  for (let x = 0; x < canvas.width; x += 16) {
    ctx.strokeStyle = 'rgba(91, 73, 54, 0.055)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 16) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let index = 0; index < 7500; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    ctx.fillStyle = random() > 0.5 ? 'rgba(88, 70, 52, 0.08)' : 'rgba(255, 250, 240, 0.11)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(112, 94, 72, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 90);
  ctx.lineTo(canvas.width - 130, canvas.height / 2);
  ctx.lineTo(canvas.width / 2, canvas.height - 90);
  ctx.lineTo(130, canvas.height / 2);
  ctx.closePath();
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

function createArtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ded6c6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#c16f4d';
  ctx.beginPath();
  ctx.ellipse(330, 285, 190, 210, -0.18, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#8a997f';
  ctx.beginPath();
  ctx.arc(585, 235, 138, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#efe9dc';
  ctx.beginPath();
  ctx.arc(325, 290, 92, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = '#303533';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(170, 410);
  ctx.bezierCurveTo(310, 335, 390, 445, 515, 355);
  ctx.bezierCurveTo(620, 285, 685, 350, 760, 220);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(48, 53, 51, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(155, 125);
  ctx.lineTo(155, 470);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 250, 241, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(530, 0);
  ctx.lineTo(0, 420);
  ctx.closePath();
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function createWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#c7dde4');
  gradient.addColorStop(0.54, '#e7ece5');
  gradient.addColorStop(1, '#f4ead8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 252, 242, 0.55)';
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.lineTo(330, 0);
  ctx.lineTo(170, 640);
  ctx.lineTo(0, 640);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(127, 150, 143, 0.18)';
  ctx.beginPath();
  ctx.arc(425, 470, 150, 0, TAU);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/* Render loop */
function animate(now = 0) {
  requestAnimationFrame(animate);
  clock.getDelta();

  if (activeControls) activeControls.update();

  for (const piece of pieces) {
    if (piece.spawnStarted) {
      const progress = Math.min(1, (now - piece.spawnStarted) / 320);
      const eased = 1 - (1 - progress) ** 3;
      piece.group.scale.setScalar(0.78 + 0.22 * eased);
      if (progress >= 1) {
        piece.group.scale.setScalar(1);
        delete piece.spawnStarted;
      }
    }
  }

  if (conflictFlashUntil && now > conflictFlashUntil) {
    conflictGraphic.group.visible = false;
    conflictFlashUntil = 0;
    if (selectedId) {
      const selected = getSelectedPiece();
      if (selected) updateSelectionGraphic(selected, false);
    }
  } else if (conflictGraphic.group.visible) {
    const pulse = 0.75 + Math.sin(now * 0.016) * 0.2;
    conflictGraphic.fill.material.opacity = 0.1 + pulse * 0.08;
    conflictGraphic.border.material.opacity = 0.55 + pulse * 0.35;
  }

  renderer.render(scene, getActiveCamera());
}
