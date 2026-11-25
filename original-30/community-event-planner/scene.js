import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ENTRANCES,
  NAV_NODES,
  getNavEdges,
  getNavNodes,
} from './model.js';

const SOIL = '#8da77f';
const PARK_GREEN = '#a9c296';
const PATH = '#e4d8b9';
const PATH_EDGE = '#c7b991';
const INK = '#18362f';
const CYAN = '#16c8ba';
const RED = '#ef5b4d';
const ORANGE = '#f37a3e';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function makeTextSprite(primary, secondary = '', options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const background = options.background || 'rgba(244, 239, 224, 0.94)';
  const foreground = options.foreground || INK;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  roundRect(ctx, 5, 5, 630, 170, 28);
  ctx.fill();
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = foreground;
  ctx.font = options.compact ? '700 45px Inter, Arial, sans-serif' : '700 42px Inter, Arial, sans-serif';
  ctx.fillText(primary, 320, secondary ? 68 : 91);
  if (secondary) {
    ctx.globalAlpha = 0.72;
    ctx.font = '500 31px Inter, Arial, sans-serif';
    ctx.fillText(secondary, 320, 124);
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(options.scale || 4.4, (options.scale || 4.4) * 0.28125, 1);
  sprite.renderOrder = 50;
  return sprite;
}

function makeSignSprite(text, color = '#f4efe0') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20, 42, 36, 0.94)';
  roundRect(ctx, 4, 4, 504, 132, 22);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 40px Inter, Arial, sans-serif';
  ctx.fillText(text, 256, 72);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.2, 1.15, 1);
  sprite.renderOrder = 55;
  return sprite;
}

function standardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.02,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

function addBox(group, width, height, depth, x, y, z, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    standardMaterial(color, options),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radiusTop, radiusBottom, height, x, y, z, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 12),
    standardMaterial(color, options),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function buildStage(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w, 0.55, d, 0, 0.3, 0, '#25495f');
  addBox(group, w * 0.86, 0.08, d * 0.84, 0, 0.6, 0.1, '#315f86');
  addBox(group, w * 0.65, 2.65, 0.18, 0, 1.95, -d / 2 + 0.12, '#1d3d52');
  addBox(group, w * 0.66, 0.12, 0.1, 0, 3.2, -d / 2 + 0.2, '#f0bc5a');
  for (const x of [-w / 2 + 0.35, w / 2 - 0.35]) {
    for (const z of [-d / 2 + 0.35, d / 2 - 0.35]) {
      addCylinder(group, 0.07, 0.07, 4.1, x, 2.3, z, '#95a5a2', { segments: 8 });
    }
    addBox(group, 0.7, 1.5, 0.7, x * 0.88, 1.35, d / 2 - 0.45, '#243238');
  }
  addBox(group, w + 0.35, 0.18, d * 0.58, 0, 4.26, -d * 0.14, '#315f86');
  addBox(group, w * 0.5, 0.42, 0.12, 0, 3.55, -d / 2 + 0.02, '#f5efe2');
  return group;
}

function buildSeating(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w, 0.12, d, 0, 0.08, 0, '#c9b880');
  const rows = 4;
  for (let row = 0; row < rows; row += 1) {
    const z = -d * 0.32 + (row / (rows - 1)) * d * 0.64;
    addBox(group, w * 0.82, 0.16, 0.48, 0, 0.45, z, '#d39b3d');
    addBox(group, w * 0.82, 0.48, 0.12, 0, 0.7, z - 0.22, '#ae7729');
    for (const x of [-w * 0.37, w * 0.37]) {
      addBox(group, 0.12, 0.36, 0.42, x, 0.26, z, '#735f38');
    }
  }
  addBox(group, 0.14, 1.45, 0.14, -w / 2 + 0.25, 0.75, -d / 2 + 0.25, '#365f50');
  addBox(group, 0.14, 1.45, 0.14, -w / 2 + 0.25, 0.75, d / 2 - 0.25, '#365f50');
  addBox(group, 1.9, 0.55, 0.13, -w / 2 + 0.25, 1.35, 0, '#f3ead1');
  return group;
}

function buildFoodStall(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w * 0.84, 1.1, d * 0.72, 0, 0.58, -d * 0.08, '#f0e5ce');
  addBox(group, w * 0.9, 0.16, d * 0.8, 0, 1.18, d * 0.02, '#7d4f39');
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {
    addCylinder(group, 0.06, 0.06, 2.6, x, 1.3, -d / 2 + 0.3, '#725c43', { segments: 8 });
    addCylinder(group, 0.06, 0.06, 2.6, x, 1.3, d / 2 - 0.3, '#725c43', { segments: 8 });
  }
  addBox(group, w + 0.25, 0.12, d + 0.15, 0, 2.68, 0, '#c95e4b');
  const stripeCount = 6;
  for (let index = 0; index < stripeCount; index += 1) {
    if (index % 2 === 0) continue;
    addBox(
      group,
      (w + 0.25) / stripeCount,
      0.025,
      d + 0.17,
      -w / 2 + ((index + 0.5) * (w + 0.25)) / stripeCount,
      2.75,
      0,
      '#f2d9b2',
      { castShadow: false },
    );
  }
  addBox(group, w * 0.64, 0.4, 0.08, 0, 2.18, d / 2 + 0.02, '#24473e');
  addBox(group, w * 0.36, 0.08, 0.24, 0, 1.32, d * 0.42, '#d6ad5d');
  return group;
}

function buildInfoDesk(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w, 1.0, 0.42, 0, 0.5, d * 0.27, '#5c8d76');
  addBox(group, w + 0.18, 0.12, 0.56, 0, 1.06, d * 0.27, '#f1ead7');
  addBox(group, 0.4, 1.0, d * 0.72, -w / 2 + 0.2, 0.5, 0, '#5c8d76');
  addBox(group, 0.4, 1.0, d * 0.72, w / 2 - 0.2, 0.5, 0, '#5c8d76');
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) {
    addCylinder(group, 0.055, 0.055, 2.3, x, 1.6, -d / 2 + 0.18, '#5e5d50', { segments: 8 });
  }
  addBox(group, w * 0.8, 0.75, 0.09, 0, 2.22, -d / 2 + 0.18, '#24473e');
  const sign = makeSignSprite('INFORMATION', '#f3d28b');
  sign.position.set(0, 2.22, -d / 2 + 0.10);
  sign.scale.set(2.4, 0.66, 1);
  group.add(sign);
  return group;
}

function buildRestroom(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w, 2.65, d, 0, 1.35, 0, '#486f7c');
  addBox(group, w + 0.25, 0.18, d + 0.25, 0, 2.82, 0, '#2c4e59');
  addBox(group, 0.86, 1.9, 0.08, -w * 0.23, 1.0, d / 2 + 0.05, '#d9d3c4');
  addBox(group, 0.08, 0.08, 0.06, -w * 0.23 + 0.28, 1.0, d / 2 + 0.1, '#3f4342');
  addBox(group, 0.08, 1.7, d * 0.68, w * 0.75, 1.0, 0, '#5b8992');
  const sign = makeSignSprite('ACCESSIBLE WC', '#b8ebee');
  sign.position.set(0, 2.16, d / 2 + 0.18);
  sign.scale.set(2.15, 0.58, 1);
  group.add(sign);
  return group;
}

function buildFirstAid(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w, 1.9, d, 0, 0.97, 0, '#f3eee3');
  addBox(group, w + 0.35, 0.16, d + 0.35, 0, 2.0, 0, '#d8d0bf');
  addBox(group, 0.46, 1.0, 0.06, 0, 1.0, d / 2 + 0.04, '#c8493d');
  addBox(group, 1.0, 0.46, 0.06, 0, 1.0, d / 2 + 0.05, '#c8493d');
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {
    addCylinder(group, 0.05, 0.05, 2.4, x, 1.2, -d / 2 + 0.2, '#6e7067', { segments: 8 });
  }
  addBox(group, w * 0.66, 0.46, 0.07, 0, 2.42, -d / 2 + 0.24, '#c8493d');
  return group;
}

function buildWaterPoint(item) {
  const group = new THREE.Group();
  const { width: w, depth: d } = item;
  addBox(group, w * 0.78, 0.85, d * 0.72, 0, 0.44, 0, '#3c6772');
  const tank = addCylinder(group, 0.55, 0.55, 1.15, 0, 1.28, -d * 0.08, '#4f9eb5', { segments: 18 });
  tank.castShadow = true;
  addBox(group, w * 0.16, 0.18, 0.3, 0, 0.65, d * 0.38, '#d6d1c1');
  addBox(group, 0.34, 0.32, 0.13, 0, 1.82, -d * 0.08, '#f2e8d1');
  return group;
}

function buildBarrier(item) {
  const group = new THREE.Group();
  const { width: w } = item;
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {
    addBox(group, 0.16, 1.25, 0.16, x, 0.63, 0, '#403d38');
    addBox(group, 0.16, 0.12, 1.1, x, 0.08, 0, '#403d38');
  }
  addBox(group, w, 0.23, 0.16, 0, 0.48, 0, ORANGE);
  addBox(group, w, 0.23, 0.16, 0, 0.86, 0, ORANGE);
  for (let i = 0; i < 7; i += 1) {
    addBox(group, 0.2, 0.25, 0.18, -w / 2 + 0.3 + i * (w - 0.6) / 6, 0.86, 0, '#f6e4be', {
      castShadow: false,
    });
  }
  return group;
}

function buildEquipmentModel(item) {
  switch (item.type) {
    case 'stage':
      return buildStage(item);
    case 'seating':
      return buildSeating(item);
    case 'foodStall':
      return buildFoodStall(item);
    case 'infoDesk':
      return buildInfoDesk(item);
    case 'restroom':
      return buildRestroom(item);
    case 'firstAid':
      return buildFirstAid(item);
    case 'waterPoint':
      return buildWaterPoint(item);
    case 'barrier':
      return buildBarrier(item);
    default:
      return new THREE.Group();
  }
}

export class ParkScene {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.equipment = [];
    this.itemMap = new Map();
    this.footprintMap = new Map();
    this.selectedId = null;
    this.overlappedIds = new Set();
    this.snapEnabled = true;
    this.currentView = 'orbit';
    this.routeGroup = new THREE.Group();
    this.equipmentGroup = new THREE.Group();
    this.graphGroup = new THREE.Group();
    this.gridGroup = new THREE.Group();
    this.parkGroup = new THREE.Group();
    this.drag = null;
    this.cameraTween = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#c6dcdb');
    this.scene.fog = new THREE.Fog('#c6dcdb', 105, 190);
    this.scene.add(this.parkGroup, this.gridGroup, this.equipmentGroup, this.routeGroup, this.graphGroup);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 260);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'park-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Editable three-dimensional festival site');
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 155;
    this.controls.maxPolarAngle = Math.PI / 2.03;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => {
      if (this.cameraTween) this.cameraTween = null;
    });

    this.setupLights();
    this.setupRaycaster();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight('#f6fbfb', '#56634d', 2.15);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff4da', 2.9);
    sun.position.set(-24, 42, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.00035;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#bde5e9', 0.8);
    fill.position.set(30, 20, -30);
    this.scene.add(fill);
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.domPointerDown = this.onPointerDown.bind(this);
    this.domPointerMove = this.onPointerMove.bind(this);
    this.domPointerUp = this.onPointerUp.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.domPointerDown, true);
    this.renderer.domElement.addEventListener('pointermove', this.domPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.domPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.domPointerUp);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate(now) {
    this.frame = requestAnimationFrame(this.animate);
    if (this.cameraTween) {
      const elapsed = Math.min(1, (now - this.cameraTween.started) / this.cameraTween.duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      this.camera.position.lerpVectors(
        this.cameraTween.fromPosition,
        this.cameraTween.toPosition,
        eased,
      );
      this.controls.target.lerpVectors(
        this.cameraTween.fromTarget,
        this.cameraTween.toTarget,
        eased,
      );
      if (elapsed >= 1) this.cameraTween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setPlan(plan, equipment, selectedId, overlappedIds, route, showGrid, showGraph) {
    this.plan = plan;
    this.clearGroup(this.graphGroup);
    this.clearGroup(this.gridGroup);
    this.buildPark(plan);
    this.equipment = equipment;
    this.rebuildEquipment(equipment);
    this.setSelection(selectedId);
    this.setOverlaps(overlappedIds);
    this.setRoute(route);
    this.setGridVisible(showGrid);
    this.setGraphVisible(showGraph);
    this.resetCamera(false);
  }

  buildPark(plan) {
    this.clearGroup(this.parkGroup);
    const { width, depth } = plan.park;
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(width + 28, 0.2, depth + 28),
      standardMaterial(SOIL, { roughness: 1 }),
    );
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.parkGroup.add(ground);

    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.22, depth),
      standardMaterial(PARK_GREEN, { roughness: 1 }),
    );
    lawn.position.y = -0.08;
    lawn.receiveShadow = true;
    this.parkGroup.add(lawn);

    const edgeMaterial = standardMaterial('#6e7f68', { roughness: 0.95 });
    const curbHeight = 0.2;
    const curbWidth = 0.3;
    const addCurb = (w, d, x, z) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w, curbHeight, d), edgeMaterial);
      curb.position.set(x, 0.1, z);
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.parkGroup.add(curb);
    };
    addCurb(width, curbWidth, 0, -depth / 2);
    addCurb(width, curbWidth, 0, depth / 2);
    addCurb(curbWidth, depth, -width / 2, 0);
    addCurb(curbWidth, depth, width / 2, 0);

    const pathMaterial = standardMaterial(PATH, { roughness: 0.95 });
    const pathEdgeMaterial = standardMaterial(PATH_EDGE, { roughness: 0.95 });
    for (const edge of getNavEdges()) {
      if (edge.stepOnly) continue;
      const a = NAV_NODES.find((node) => node.id === edge.a);
      const b = NAV_NODES.find((node) => node.id === edge.b);
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const angle = Math.atan2(b.z - a.z, b.x - a.x);
      const path = new THREE.Mesh(
        new THREE.BoxGeometry(length + 1.0, 0.07, 2.75),
        pathMaterial,
      );
      path.position.set((a.x + b.x) / 2, 0.045, (a.z + b.z) / 2);
      path.rotation.y = -angle;
      path.receiveShadow = true;
      this.parkGroup.add(path);
      const edgeLine = new THREE.Mesh(
        new THREE.BoxGeometry(length + 0.7, 0.015, 0.08),
        pathEdgeMaterial,
      );
      edgeLine.position.set((a.x + b.x) / 2, 0.087, (a.z + b.z) / 2);
      edgeLine.rotation.y = -angle;
      this.parkGroup.add(edgeLine);
    }

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(4.3, 4.3, 0.08, 42),
      pathMaterial,
    );
    plaza.position.y = 0.045;
    plaza.receiveShadow = true;
    this.parkGroup.add(plaza);
    const plazaRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.65, 0.09, 8, 48),
      pathEdgeMaterial,
    );
    plazaRing.rotation.x = Math.PI / 2;
    plazaRing.position.y = 0.1;
    this.parkGroup.add(plazaRing);

    this.buildSteps();
    this.buildEntrances(plan);
    this.buildTrees(plan);
  }

  buildSteps() {
    const start = NAV_NODES.find((node) => node.id === 'STEP_W');
    const end = NAV_NODES.find((node) => node.id === 'STEP_E');
    const count = 6;
    const stepLength = (end.x - start.x) / count;
    for (let index = 0; index < count; index += 1) {
      const step = addBox(
        this.parkGroup,
        Math.abs(stepLength) * 0.96,
        0.1 + index * 0.035,
        2.65,
        start.x + stepLength * (index + 0.5),
        0.06 + index * 0.035,
        0,
        index % 2 === 0 ? '#d8cba9' : '#cdbd98',
      );
      step.castShadow = true;
    }
    const label = makeTextSprite('STEPPED SHORTCUT', 'Pedestrian mode only', {
      background: 'rgba(32, 56, 49, 0.94)',
      foreground: '#f6ead0',
      scale: 3.7,
    });
    label.position.set((start.x + end.x) / 2, 2.2, 0);
    this.parkGroup.add(label);
  }

  buildEntrances(plan) {
    const west = ENTRANCES.find((entrance) => entrance.id === 'west');
    const south = ENTRANCES.find((entrance) => entrance.id === 'south');
    const westGroup = new THREE.Group();
    westGroup.position.set(-plan.park.width / 2 + 0.2, 0, 0);
    addBox(westGroup, 0.32, 2.8, 0.32, 0, 1.4, -2.3, '#394d44');
    addBox(westGroup, 0.32, 2.8, 0.32, 0, 1.4, 2.3, '#394d44');
    addBox(westGroup, 0.42, 0.34, 4.95, 0, 2.82, 0, '#394d44');
    const westSign = makeSignSprite('WEST GATE · 01', '#f5d58c');
    westSign.position.set(0.05, 3.42, 0);
    westSign.scale.set(3.4, 0.94, 1);
    westGroup.add(westSign);
    this.parkGroup.add(westGroup);

    const southGroup = new THREE.Group();
    southGroup.position.set(0, 0, plan.park.depth / 2 - 0.2);
    addBox(southGroup, 0.32, 2.8, 0.32, -2.3, 1.4, 0, '#394d44');
    addBox(southGroup, 0.32, 2.8, 0.32, 2.3, 1.4, 0, '#394d44');
    addBox(southGroup, 4.95, 0.34, 0.42, 0, 2.82, 0, '#394d44');
    const southSign = makeSignSprite('SOUTH GATE · 02', '#f5d58c');
    southSign.position.set(0, 3.42, -0.05);
    southSign.scale.set(3.4, 0.94, 1);
    southGroup.add(southSign);
    this.parkGroup.add(southGroup);

    const westEnterLabel = makeTextSprite(west.name, 'Route start', {
      background: 'rgba(20, 42, 36, 0.9)',
      foreground: '#d7f4ec',
      scale: 2.5,
    });
    westEnterLabel.position.set(-plan.park.width / 2 + 2.5, 1.3, -4.2);
    this.parkGroup.add(westEnterLabel);
    const southEnterLabel = makeTextSprite(south.name, 'Route start', {
      background: 'rgba(20, 42, 36, 0.9)',
      foreground: '#d7f4ec',
      scale: 2.5,
    });
    southEnterLabel.position.set(-4.5, 1.3, plan.park.depth / 2 - 2.5);
    this.parkGroup.add(southEnterLabel);
  }

  buildTrees(plan) {
    const trunkMaterial = standardMaterial('#745b3d', { roughness: 1 });
    const leafMaterials = [
      standardMaterial('#52774f', { roughness: 1 }),
      standardMaterial('#668a5b', { roughness: 1 }),
      standardMaterial('#3f684b', { roughness: 1 }),
    ];
    for (const [index, tree] of (plan.park.trees || []).entries()) {
      const group = new THREE.Group();
      group.position.set(tree.x, 0, tree.z);
      const scale = tree.scale || 1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * scale, 0.22 * scale, 2.25 * scale, 9), trunkMaterial);
      trunk.position.y = 1.12 * scale;
      trunk.castShadow = true;
      group.add(trunk);
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 * scale, 1), leafMaterials[index % leafMaterials.length]);
      canopy.position.y = 3 * scale;
      canopy.scale.set(1, 0.94, 1);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      group.add(canopy);
      const canopy2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * scale, 1), leafMaterials[(index + 1) % leafMaterials.length]);
      canopy2.position.set(0.55 * scale, 3.55 * scale, -0.25 * scale);
      canopy2.castShadow = true;
      group.add(canopy2);
      this.parkGroup.add(group);
    }
  }

  rebuildEquipment(equipment) {
    this.clearGroup(this.equipmentGroup);
    this.itemMap.clear();
    this.footprintMap.clear();
    this.equipment = equipment;
    for (const item of equipment) {
      const group = buildEquipmentModel(item);
      group.position.set(item.x, 0, item.z);
      group.rotation.y = THREE.MathUtils.degToRad(item.rotation || 0);
      group.userData.objectId = item.id;
      group.traverse((child) => {
        if (child.isMesh) {
          child.userData.objectId = item.id;
          child.castShadow = child.castShadow !== false;
          child.receiveShadow = true;
        }
      });

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(item.width, item.depth),
        new THREE.MeshBasicMaterial({
          color: item.color,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.105;
      fill.userData.objectId = item.id;
      group.add(fill);

      const halfW = item.width / 2;
      const halfD = item.depth / 2;
      const points = [
        new THREE.Vector3(-halfW, 0.14, -halfD),
        new THREE.Vector3(halfW, 0.14, -halfD),
        new THREE.Vector3(halfW, 0.14, halfD),
        new THREE.Vector3(-halfW, 0.14, halfD),
      ];
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }),
      );
      outline.userData.objectId = item.id;
      group.add(outline);

      const label = makeTextSprite(item.name, `${item.width.toFixed(1)} × ${item.depth.toFixed(1)} m`, {
        background: 'rgba(246, 241, 226, 0.92)',
        foreground: INK,
        scale: Math.max(3.3, Math.min(5.8, item.name.length * 0.13 + 2.0)),
      });
      label.position.set(0, item.height + 0.9, 0);
      group.add(label);

      this.equipmentGroup.add(group);
      this.itemMap.set(item.id, group);
      this.footprintMap.set(item.id, { group, fill, outline, label });
    }
    this.applyVisualStates();
  }

  updateEquipmentTransforms(equipment) {
    this.equipment = equipment;
    for (const item of equipment) {
      const group = this.itemMap.get(item.id);
      if (!group) continue;
      group.position.set(item.x, 0, item.z);
      group.rotation.y = THREE.MathUtils.degToRad(item.rotation || 0);
    }
  }

  syncEquipment(equipment, selectedId, overlappedIds) {
    const signature = equipment.map((item) => `${item.id}:${item.type}`).join('|');
    const currentSignature = this.equipment.map((item) => `${item.id}:${item.type}`).join('|');
    if (signature !== currentSignature || this.itemMap.size !== equipment.length) {
      this.rebuildEquipment(equipment);
    } else {
      this.updateEquipmentTransforms(equipment);
    }
    this.setSelection(selectedId);
    this.setOverlaps(overlappedIds);
  }

  setSelection(id) {
    this.selectedId = id;
    this.applyVisualStates();
  }

  setOverlaps(ids) {
    this.overlappedIds = new Set(ids || []);
    this.applyVisualStates();
  }

  applyVisualStates() {
    this.footprintMap.forEach((parts, id) => {
      const selected = id === this.selectedId;
      const overlapped = this.overlappedIds.has(id);
      const item = this.equipment.find((entry) => entry.id === id);
      if (!item) return;
      parts.fill.material.color.set(overlapped ? RED : selected ? CYAN : item.color);
      parts.fill.material.opacity = selected ? 0.3 : overlapped ? 0.28 : 0.16;
      parts.outline.material.color.set(overlapped ? RED : selected ? CYAN : '#ffffff');
      parts.outline.material.opacity = selected || overlapped ? 1 : 0.62;
      parts.label.material.opacity = selected ? 1 : 0.92;
      parts.group.traverse((child) => {
        if (!child.isMesh) return;
        if (child === parts.fill) return;
        if (child.material && child.material.emissive) {
          child.material.emissive.set(overlapped ? '#7e1f16' : selected ? '#0d6b63' : '#000000');
          child.material.emissiveIntensity = overlapped ? 0.18 : selected ? 0.24 : 0;
        }
      });
    });
  }

  setRoute(route) {
    this.clearGroup(this.routeGroup);
    if (!route || !route.found || !route.points || route.points.length < 2) return;
    const routeMaterial = standardMaterial(ORANGE, { roughness: 0.35 });
    routeMaterial.emissive = new THREE.Color('#7b2b0b');
    routeMaterial.emissiveIntensity = 0.28;
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const a = route.points[index];
      const b = route.points[index + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 0.01) continue;
      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(length + 0.2, 0.09, 0.28),
        routeMaterial,
      );
      segment.position.set((a.x + b.x) / 2, 0.26, (a.z + b.z) / 2);
      segment.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      segment.castShadow = false;
      this.routeGroup.add(segment);
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 10, 8),
        routeMaterial,
      );
      node.position.set(a.x, 0.28, a.z);
      this.routeGroup.add(node);
    }
    const last = route.points[route.points.length - 1];
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.12, 24),
      new THREE.MeshBasicMaterial({ color: ORANGE }),
    );
    marker.position.set(last.x, 0.23, last.z);
    this.routeGroup.add(marker);
    const midpoint = route.points[Math.floor(route.points.length / 2)];
    const label = makeTextSprite(`${route.distance.toFixed(1)} m`, route.mode === 'stepFree' ? 'Step-free route' : 'Pedestrian route', {
      background: 'rgba(31, 60, 51, 0.94)',
      foreground: '#ffe4c4',
      scale: 3.15,
    });
    label.position.set(midpoint.x, 1.55, midpoint.z);
    this.routeGroup.add(label);
  }

  buildGraphOverlay() {
    this.clearGroup(this.graphGroup);
    const nodeMaterial = standardMaterial('#1c8e94', { roughness: 0.3 });
    const regularMaterial = new THREE.LineBasicMaterial({ color: '#23a7ad', transparent: true, opacity: 0.9 });
    const stepMaterial = new THREE.LineBasicMaterial({ color: '#f3a23c', transparent: true, opacity: 1 });
    for (const edge of getNavEdges()) {
      const a = NAV_NODES.find((node) => node.id === edge.a);
      const b = NAV_NODES.find((node) => node.id === edge.b);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a.x, 0.52, a.z),
        new THREE.Vector3(b.x, 0.52, b.z),
      ]);
      this.graphGroup.add(new THREE.Line(geometry, edge.stepOnly ? stepMaterial : regularMaterial));
    }
    for (const node of getNavNodes()) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), nodeMaterial);
      sphere.position.set(node.x, 0.55, node.z);
      this.graphGroup.add(sphere);
    }
    const note = makeTextSprite('NAVIGATION GRAPH', 'Cyan: fixed paths · Amber: steps', {
      background: 'rgba(18, 52, 48, 0.94)',
      foreground: '#d4f5ee',
      scale: 4.2,
    });
    note.position.set(0, 2.2, 17);
    this.graphGroup.add(note);
  }

  setGraphVisible(visible) {
    if (visible && this.graphGroup.children.length === 0) this.buildGraphOverlay();
    this.graphGroup.visible = Boolean(visible);
  }

  buildGrid() {
    this.clearGroup(this.gridGroup);
    if (!this.plan) return;
    const { width, depth } = this.plan.park;
    const points = [];
    for (let x = -width / 2; x <= width / 2 + 0.01; x += 1) {
      points.push(x, 0, -depth / 2, x, 0, depth / 2);
    }
    for (let z = -depth / 2; z <= depth / 2 + 0.01; z += 1) {
      points.push(-width / 2, 0, z, width / 2, 0, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color: '#f6f1df',
      transparent: true,
      opacity: 0.2,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.position.y = 0.12;
    this.gridGroup.add(lines);
  }

  setGridVisible(visible) {
    if (visible && this.gridGroup.children.length === 0) this.buildGrid();
    this.gridGroup.visible = Boolean(visible);
  }

  setSnap(enabled) {
    this.snapEnabled = Boolean(enabled);
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children.pop();
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
          else node.material.dispose();
        }
      });
    }
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  pointerGroundPoint(event) {
    this.updatePointer(event);
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return null;
    return point;
  }

  hitEquipment(event) {
    this.updatePointer(event);
    const intersections = this.raycaster.intersectObjects(this.equipmentGroup.children, true);
    for (const intersection of intersections) {
      let cursor = intersection.object;
      while (cursor) {
        if (cursor.userData && cursor.userData.objectId) {
          return cursor.userData.objectId;
        }
        cursor = cursor.parent;
      }
    }
    return null;
  }

  onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    const id = this.hitEquipment(event);
    this.pendingEmptyClick = null;
    if (id) {
      const item = this.equipment.find((entry) => entry.id === id);
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      this.callbacks.onSelect?.(id);
      if (item.locked) return;
      const point = this.pointerGroundPoint(event);
      if (!point) return;
      this.controls.enabled = false;
      this.drag = {
        id,
        offsetX: item.x - point.x,
        offsetZ: item.z - point.z,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      };
      this.renderer.domElement.setPointerCapture?.(event.pointerId);
      this.callbacks.onDragStart?.(id);
    } else {
      this.pendingEmptyClick = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }
  }

  onPointerMove(event) {
    if (!this.drag) return;
    const dx = event.clientX - this.drag.startClientX;
    const dy = event.clientY - this.drag.startClientY;
    if (!this.drag.moved && Math.hypot(dx, dy) < 3) return;
    this.drag.moved = true;
    event.preventDefault();
    this.updatePointer(event);
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return;
    this.callbacks.onDragPosition?.(this.drag.id, point.x + this.drag.offsetX, point.z + this.drag.offsetZ);
  }

  onPointerUp(event) {
    if (this.drag) {
      const drag = this.drag;
      this.drag = null;
      this.controls.enabled = true;
      this.callbacks.onDragEnd?.(drag.id, drag.moved);
      if (this.renderer.domElement.hasPointerCapture?.(event.pointerId)) {
        this.renderer.domElement.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (this.pendingEmptyClick) {
      const moved = Math.hypot(
        event.clientX - this.pendingEmptyClick.clientX,
        event.clientY - this.pendingEmptyClick.clientY,
      );
      if (moved < 4) this.callbacks.onSelect?.(null);
      this.pendingEmptyClick = null;
    }
  }

  defaultOrbitPosition() {
    const maxDim = this.plan ? Math.max(this.plan.park.width, this.plan.park.depth) : 64;
    return new THREE.Vector3(maxDim * 0.68, maxDim * 0.78, maxDim * 0.92);
  }

  animateCamera(position, target, duration = 520) {
    this.cameraTween = {
      started: performance.now(),
      duration,
      fromPosition: this.camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
    };
  }

  setView(view) {
    this.currentView = view;
    if (view === 'top') {
      const maxDim = this.plan ? Math.max(this.plan.park.width, this.plan.park.depth) : 64;
      this.animateCamera(new THREE.Vector3(0, maxDim * 1.48, 0.01), new THREE.Vector3(0, 0, 0));
    } else {
      this.animateCamera(this.defaultOrbitPosition(), new THREE.Vector3(0, 0, 0));
    }
    return view;
  }

  resetCamera(animated = true) {
    this.currentView = 'orbit';
    const position = this.defaultOrbitPosition();
    const target = new THREE.Vector3(0, 0, 0);
    if (animated) this.animateCamera(position, target);
    else {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  focusSelection(id) {
    const item = this.equipment.find((entry) => entry.id === id);
    if (!item) return;
    const target = new THREE.Vector3(item.x, 0.7, item.z);
    const extent = Math.max(item.width, item.depth, 6);
    const distance = Math.max(20, extent * 2.7);
    let direction = this.camera.position.clone().sub(this.controls.target).normalize();
    if (this.currentView === 'top' || direction.y > 0.94) {
      direction = new THREE.Vector3(0.45, 1.15, 0.62).normalize();
    }
    const position = target.clone().add(direction.multiplyScalar(distance));
    this.animateCamera(position, target, 480);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.domPointerDown, true);
    this.renderer.domElement.removeEventListener('pointermove', this.domPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.domPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.domPointerUp);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
