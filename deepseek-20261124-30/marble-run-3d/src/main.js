import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';

const COLORS = {
  ink: 0x183445,
  inkDeep: 0x102a39,
  cream: 0xfff7e6,
  table: 0xeadbc1,
  tableEdge: 0xbb865b,
  leg: 0x8e6346,
  teal: 0x24bca7,
  tealDeep: 0x118c81,
  coral: 0xff745d,
  coralDeep: 0xdf4f3a,
  yellow: 0xffd15c,
  yellowDeep: 0xdda72f,
  blue: 0x5d8ef5,
  lavender: 0x9b87ff,
  lavenderDeep: 0x7160dc,
  white: 0xfffbf0,
  floor: 0xc9d8dc,
};

const TABLE_TOP = -0.16;
const BALL_RADIUS = 0.265;
const START_POSITION = new THREE.Vector3(-7.03, 4.9 + BALL_RADIUS + 0.012, 0);
const JUMP_PIVOT = new THREE.Vector3(-2.65, 3.72, 0);
const JUMP_LENGTH = 2.25;
const JUMP_WIDTH = 1.28;
const BASIN_CENTER = new THREE.Vector3(5.12, 0.52, 0);
const BASIN_RADIUS = 1.18;
const DEFAULTS = { power: 62, angle: 20 };

const container = document.getElementById('scene-root');
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdce9ef, 28, 52);

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 90);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment(renderer);
scene.environment = pmrem.fromScene(roomEnvironment, 0.035).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 7;
controls.maxDistance = 34;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 2.15, 0);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 14;
world.solver.tolerance = 0.001;
world.defaultContactMaterial.friction = 0.16;
world.defaultContactMaterial.restitution = 0.18;

const trackPhysicsMaterial = new CANNON.Material('painted-wood');
const marblePhysicsMaterial = new CANNON.Material('steel-marble');
world.addContactMaterial(
  new CANNON.ContactMaterial(marblePhysicsMaterial, trackPhysicsMaterial, {
    friction: 0.105,
    restitution: 0.31,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
  }),
);

const materials = {
  table: new THREE.MeshStandardMaterial({ color: COLORS.table, roughness: 0.78, metalness: 0.01 }),
  tableEdge: new THREE.MeshStandardMaterial({ color: COLORS.tableEdge, roughness: 0.7, metalness: 0.02 }),
  wood: new THREE.MeshStandardMaterial({ color: COLORS.leg, roughness: 0.68, metalness: 0.02 }),
  ink: new THREE.MeshStandardMaterial({ color: COLORS.ink, roughness: 0.34, metalness: 0.16 }),
  cream: new THREE.MeshStandardMaterial({ color: COLORS.cream, roughness: 0.55, metalness: 0.02 }),
  teal: new THREE.MeshStandardMaterial({ color: COLORS.teal, roughness: 0.34, metalness: 0.03 }),
  tealDeep: new THREE.MeshStandardMaterial({ color: COLORS.tealDeep, roughness: 0.34, metalness: 0.04 }),
  coral: new THREE.MeshStandardMaterial({ color: COLORS.coral, roughness: 0.33, metalness: 0.03 }),
  coralDeep: new THREE.MeshStandardMaterial({ color: COLORS.coralDeep, roughness: 0.38, metalness: 0.03 }),
  yellow: new THREE.MeshStandardMaterial({ color: COLORS.yellow, roughness: 0.36, metalness: 0.03 }),
  yellowDeep: new THREE.MeshStandardMaterial({ color: COLORS.yellowDeep, roughness: 0.4, metalness: 0.03 }),
  blue: new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.34, metalness: 0.04 }),
  lavender: new THREE.MeshStandardMaterial({ color: COLORS.lavender, roughness: 0.34, metalness: 0.04 }),
  lavenderDeep: new THREE.MeshStandardMaterial({ color: COLORS.lavenderDeep, roughness: 0.38, metalness: 0.04 }),
  white: new THREE.MeshStandardMaterial({ color: COLORS.white, roughness: 0.3, metalness: 0.02 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xcfd7dc, roughness: 0.18, metalness: 0.92 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x314c5c, roughness: 0.28, metalness: 0.62 }),
  floor: new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 1, metalness: 0 }),
};

function roundedMesh(width, height, depth, radius, material) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addStaticBox(width, height, depth, position, quaternion = null, material = trackPhysicsMaterial) {
  const body = new CANNON.Body({
    mass: 0,
    material,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
  });
  body.position.set(position.x, position.y, position.z);
  if (quaternion) body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  world.addBody(body);
  return body;
}

function addStaticBoxAt(width, height, depth, x, y, z, material = trackPhysicsMaterial) {
  return addStaticBox(width, height, depth, new THREE.Vector3(x, y, z), null, material);
}

function makeSignTexture(lines, options = {}) {
  const width = options.width || 640;
  const height = options.height || 220;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pad = options.pad ?? 18;
  const radius = options.radius ?? 34;

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, radius);
  ctx.fillStyle = options.background || '#173244';
  ctx.fill();
  ctx.lineWidth = options.borderWidth ?? 7;
  ctx.strokeStyle = options.border || 'rgba(255,255,255,0.16)';
  ctx.stroke();

  if (options.accent) {
    ctx.beginPath();
    ctx.arc(pad + 38, height / 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = options.accent;
    ctx.fill();
  }

  const lineList = Array.isArray(lines) ? lines : [lines];
  const main = lineList[0];
  const sub = lineList[1];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.color || '#fff9ec';
  ctx.font = `900 ${options.fontSize || 92}px "Arial Black", Impact, sans-serif`;
  ctx.fillText(main, width / 2 + (options.accent ? 16 : 0), sub ? height * 0.42 : height * 0.5);
  if (sub) {
    ctx.fillStyle = options.subColor || 'rgba(255,249,236,0.72)';
    ctx.font = `700 ${options.subSize || 25}px "Roboto Mono", Consolas, monospace`;
    ctx.fillText(sub, width / 2, height * 0.72);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function addSignPanel(lines, width, height, position, rotationY = 0, options = {}) {
  const texture = makeSignTexture(lines, options);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, toneMapped: false }),
  );
  panel.position.copy(position);
  panel.rotation.y = rotationY;
  panel.renderOrder = 3;
  scene.add(panel);
  return panel;
}

function addSupportPost(x, z, topY, material = materials.darkMetal, thickness = 0.11) {
  const height = topY - TABLE_TOP;
  const post = roundedMesh(thickness, height, thickness, 0.025, material);
  post.position.set(x, TABLE_TOP + height / 2, z);
  scene.add(post);

  const foot = roundedMesh(thickness * 1.9, 0.055, thickness * 1.9, 0.02, materials.yellow);
  foot.position.set(x, TABLE_TOP + 0.03, z);
  scene.add(foot);
  return post;
}

function addTrestle(x, topY, width, material = materials.darkMetal) {
  const zOffset = width / 2 - 0.14;
  addSupportPost(x, -zOffset, topY, material);
  addSupportPost(x, zOffset, topY, material);

  const bar = roundedMesh(0.08, 0.08, width - 0.18, 0.018, material);
  bar.position.set(x, Math.max(TABLE_TOP + 0.5, topY - 0.48), 0);
  scene.add(bar);
}

function createSegment(start, end, width, deckMaterial, railMaterial, options = {}) {
  const thickness = options.thickness ?? 0.22;
  const railHeight = options.railHeight ?? 0.29;
  const railWidth = options.railWidth ?? 0.1;
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const side = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const deckCenter = midpoint.clone().addScaledVector(up, -thickness / 2);

  const deck = roundedMesh(length, thickness, width, 0.045, deckMaterial);
  deck.position.copy(deckCenter);
  deck.quaternion.copy(quaternion);
  scene.add(deck);
  addStaticBox(length, thickness, width, deckCenter, quaternion);

  if (options.stripe !== false) {
    const stripeMaterial = options.stripeMaterial || materials.white;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(length * 0.84, 0.012, 0.07), stripeMaterial);
    stripe.position.copy(midpoint).addScaledVector(up, 0.008);
    stripe.quaternion.copy(quaternion);
    stripe.receiveShadow = true;
    scene.add(stripe);
  }

  if (options.rails !== false) {
    const offset = width / 2 - railWidth / 2 - 0.005;
    for (const sign of [-1, 1]) {
      const railCenter = midpoint
        .clone()
        .addScaledVector(up, railHeight / 2)
        .addScaledVector(side, offset * sign);
      const rail = roundedMesh(length, railHeight, railWidth, 0.025, railMaterial);
      rail.position.copy(railCenter);
      rail.quaternion.copy(quaternion);
      scene.add(rail);
      addStaticBox(length, railHeight, railWidth, railCenter, quaternion);
    }
  }

  return { deck, length, quaternion, up, side };
}

function makeTableGrid() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(41, 76, 91, 0.055)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(41, 76, 91, 0.12)';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  ctx.fillStyle = 'rgba(41, 76, 91, 0.18)';
  ctx.font = '700 15px "Roboto Mono", Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('GRAVITY WORKS / BENCH 07', 38, 52);
  ctx.textAlign = 'right';
  ctx.fillText('SCALE 1:6', canvas.width - 38, canvas.height - 38);

  ctx.textAlign = 'center';
  ctx.font = '900 28px "Arial Black", Impact, sans-serif';
  ctx.fillStyle = 'rgba(255, 116, 93, 0.12)';
  ctx.fillText('LAUNCH', 180, 282);
  ctx.fillText('JUMP ZONE', 555, 385);
  ctx.fillText('FINISH', 846, 258);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8.25),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, TABLE_TOP + 0.006, 0);
  grid.renderOrder = 1;
  scene.add(grid);
}

function makeContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 128, 20, 256, 128, 238);
  gradient.addColorStop(0, 'rgba(30, 50, 60, 0.32)');
  gradient.addColorStop(0.45, 'rgba(30, 50, 60, 0.19)');
  gradient.addColorStop(1, 'rgba(30, 50, 60, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(23, 14),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -3.88;
  scene.add(mesh);
}

function makeHazardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffd15c';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#183445';
  for (let i = -64; i < 160; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 64);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 48, 0);
    ctx.lineTo(i + 16, 64);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1);
  return texture;
}

const hazardTexture = makeHazardTexture();
const hazardMaterial = new THREE.MeshStandardMaterial({
  map: hazardTexture,
  roughness: 0.42,
  metalness: 0.02,
});

function buildTable() {
  const table = roundedMesh(16.4, 0.58, 8.65, 0.28, materials.table);
  table.position.set(0, TABLE_TOP - 0.29, 0);
  scene.add(table);

  const edge = roundedMesh(16.55, 0.18, 8.8, 0.15, materials.tableEdge);
  edge.position.set(0, TABLE_TOP - 0.49, 0);
  scene.add(edge);

  for (const x of [-7.25, 7.25]) {
    for (const z of [-3.48, 3.48]) {
      const leg = roundedMesh(0.38, 3.25, 0.38, 0.07, materials.wood);
      leg.position.set(x, -1.97, z);
      scene.add(leg);
      const foot = roundedMesh(0.58, 0.12, 0.58, 0.05, materials.ink);
      foot.position.set(x, -3.66, z);
      scene.add(foot);
    }
  }

  makeTableGrid();
  makeContactShadow();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.9;
  floor.receiveShadow = true;
  scene.add(floor);

  const cornerBoltMaterial = new THREE.MeshStandardMaterial({ color: 0x8e765e, roughness: 0.4, metalness: 0.62 });
  for (const x of [-7.85, 7.85]) {
    for (const z of [-4.03, 4.03]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 20), cornerBoltMaterial);
      bolt.position.set(x, TABLE_TOP + 0.02, z);
      bolt.castShadow = true;
      scene.add(bolt);
    }
  }
}

let jumpRampGroup;
let jumpDeckBody;
const jumpRailBodies = [];
let jumpLabelSprite;
let jumpLabelTexture;

function createJumpRamp() {
  jumpRampGroup = new THREE.Group();
  jumpRampGroup.position.copy(JUMP_PIVOT);
  scene.add(jumpRampGroup);

  const thickness = 0.22;
  const railHeight = 0.31;
  const railWidth = 0.11;
  const railOffset = JUMP_WIDTH / 2 - railWidth / 2 - 0.005;

  const deck = roundedMesh(JUMP_LENGTH, thickness, JUMP_WIDTH, 0.045, materials.yellow);
  deck.position.set(JUMP_LENGTH / 2, -thickness / 2, 0);
  jumpRampGroup.add(deck);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(JUMP_LENGTH * 0.82, 0.013, 0.08), materials.white);
  stripe.position.set(JUMP_LENGTH / 2, 0.008, 0);
  stripe.receiveShadow = true;
  jumpRampGroup.add(stripe);

  for (const sign of [-1, 1]) {
    const rail = roundedMesh(JUMP_LENGTH, railHeight, railWidth, 0.025, materials.coral);
    rail.position.set(JUMP_LENGTH / 2, railHeight / 2, railOffset * sign);
    jumpRampGroup.add(rail);
  }

  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, JUMP_WIDTH * 0.97), hazardMaterial);
  lip.position.set(JUMP_LENGTH - 0.12, 0.024, 0);
  lip.castShadow = true;
  lip.receiveShadow = true;
  jumpRampGroup.add(lip);

  const pivotBar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, JUMP_WIDTH + 0.28, 28), materials.metal);
  pivotBar.rotation.x = Math.PI / 2;
  pivotBar.position.set(0, 0.015, 0);
  pivotBar.castShadow = true;
  scene.add(pivotBar);

  const pivotCapGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 28);
  for (const sign of [-1, 1]) {
    const cap = new THREE.Mesh(pivotCapGeometry, materials.ink);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(JUMP_PIVOT.x, JUMP_PIVOT.y + 0.015, sign * (JUMP_WIDTH / 2 + 0.17));
    cap.castShadow = true;
    scene.add(cap);
  }

  jumpDeckBody = new CANNON.Body({
    mass: 0,
    material: trackPhysicsMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(JUMP_LENGTH / 2, thickness / 2, JUMP_WIDTH / 2)),
  });
  world.addBody(jumpDeckBody);

  for (let i = 0; i < 2; i += 1) {
    const body = new CANNON.Body({
      mass: 0,
      material: trackPhysicsMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(JUMP_LENGTH / 2, railHeight / 2, railWidth / 2)),
    });
    world.addBody(body);
    jumpRailBodies.push(body);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 150;
  jumpLabelTexture = new THREE.CanvasTexture(canvas);
  jumpLabelTexture.colorSpace = THREE.SRGBColorSpace;
  const spriteMaterial = new THREE.SpriteMaterial({ map: jumpLabelTexture, transparent: true, toneMapped: false });
  jumpLabelSprite = new THREE.Sprite(spriteMaterial);
  jumpLabelSprite.scale.set(1.38, 0.52, 1);
  jumpLabelSprite.position.set(JUMP_PIVOT.x + 0.35, JUMP_PIVOT.y + 1.2, 1.15);
  jumpLabelSprite.renderOrder = 5;
  scene.add(jumpLabelSprite);
}

function paintJumpLabel(angle) {
  const canvas = jumpLabelTexture.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 26);
  ctx.fillStyle = 'rgba(255, 249, 236, 0.94)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#183445';
  ctx.stroke();
  ctx.fillStyle = '#e9513c';
  ctx.font = '900 63px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${angle}°`, canvas.width / 2, 61);
  ctx.fillStyle = 'rgba(23, 50, 68, 0.62)';
  ctx.font = '700 20px "Roboto Mono", Consolas, monospace';
  ctx.fillText('LIVE LIP ANGLE', canvas.width / 2, 114);
  jumpLabelTexture.needsUpdate = true;
}

function syncJumpRamp(angleDegrees) {
  const angle = -THREE.MathUtils.degToRad(angleDegrees);
  jumpRampGroup.rotation.z = angle;

  const thickness = 0.22;
  const railHeight = 0.31;
  const railWidth = 0.11;
  const railOffset = JUMP_WIDTH / 2 - railWidth / 2 - 0.005;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const placeBody = (body, localX, localY, localZ) => {
    body.position.set(
      JUMP_PIVOT.x + localX * cos - localY * sin,
      JUMP_PIVOT.y + localX * sin + localY * cos,
      JUMP_PIVOT.z + localZ,
    );
    body.quaternion.setFromEuler(0, 0, angle);
    body.aabbNeedsUpdate = true;
  };

  placeBody(jumpDeckBody, JUMP_LENGTH / 2, -thickness / 2, 0);
  placeBody(jumpRailBodies[0], JUMP_LENGTH / 2, railHeight / 2, -railOffset);
  placeBody(jumpRailBodies[1], JUMP_LENGTH / 2, railHeight / 2, railOffset);
  paintJumpLabel(angleDegrees);
}

function createBasin() {
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.02, 0.56, 36), materials.ink);
  pedestal.position.set(BASIN_CENTER.x, TABLE_TOP + 0.28, BASIN_CENTER.z);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, 0.24, 52), materials.lavenderDeep);
  floor.position.set(BASIN_CENTER.x, 0.4, BASIN_CENTER.z);
  floor.castShadow = true;
  floor.receiveShadow = true;
  scene.add(floor);
  addStaticBoxAt(2.26, 0.24, 2.26, BASIN_CENTER.x, 0.4, BASIN_CENTER.z);

  const ringDefinitions = [
    { radius: 1.11, tube: 0.035, color: 0xffd15c, y: BASIN_CENTER.y + 0.012 },
    { radius: 0.84, tube: 0.026, color: 0xfffbf0, y: BASIN_CENTER.y + 0.018 },
    { radius: 0.55, tube: 0.033, color: 0xff745d, y: BASIN_CENTER.y + 0.024 },
    { radius: 0.25, tube: 0.05, color: 0xffd15c, y: BASIN_CENTER.y + 0.03 },
  ];
  for (const ring of ringDefinitions) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ring.radius, ring.tube, 10, 64),
      new THREE.MeshStandardMaterial({
        color: ring.color,
        roughness: 0.35,
        metalness: 0.05,
        emissive: ring.color,
        emissiveIntensity: 0.06,
      }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(BASIN_CENTER.x, ring.y, BASIN_CENTER.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const wallSegments = 18;
  const wallRadius = 1.18;
  const wallHeight = 0.43;
  const wallThickness = 0.13;
  const arc = (Math.PI * 2) / wallSegments;
  const segmentLength = 2 * wallRadius * Math.sin(arc / 2) + 0.015;
  for (let i = 0; i < wallSegments; i += 1) {
    const angle = (i + 0.5) * arc;
    const distanceFromOpening = Math.abs(Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)));
    if (distanceFromOpening < 0.53) continue;

    const x = BASIN_CENTER.x + Math.cos(angle) * wallRadius;
    const z = BASIN_CENTER.z + Math.sin(angle) * wallRadius;
    const rotationY = -(angle + Math.PI / 2);
    const wallMaterial = i % 3 === 0 ? materials.yellow : i % 3 === 1 ? materials.cream : materials.lavender;
    const wall = roundedMesh(segmentLength, wallHeight, wallThickness, 0.025, wallMaterial);
    wall.position.set(x, 0.73, z);
    wall.rotation.y = rotationY;
    scene.add(wall);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(segmentLength, 0.028, wallThickness + 0.035), materials.ink);
    topCap.position.set(x, 0.957, z);
    topCap.rotation.y = rotationY;
    topCap.castShadow = true;
    scene.add(topCap);

    const body = new CANNON.Body({
      mass: 0,
      material: trackPhysicsMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(segmentLength / 2, wallHeight / 2, wallThickness / 2)),
    });
    body.position.set(x, 0.73, z);
    body.quaternion.setFromEuler(0, rotationY, 0);
    world.addBody(body);
  }

  const finishGlowMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.yellow,
    emissive: COLORS.yellow,
    emissiveIntensity: 1.3,
    roughness: 0.24,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  const finishGlow = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.028, 12, 72), finishGlowMaterial);
  finishGlow.rotation.x = Math.PI / 2;
  finishGlow.position.set(BASIN_CENTER.x, 1.0, BASIN_CENTER.z);
  scene.add(finishGlow);

  const basinLight = new THREE.PointLight(0xffd15c, 1.5, 4.4, 2);
  basinLight.position.set(BASIN_CENTER.x, 1.6, BASIN_CENTER.z);
  scene.add(basinLight);

  for (const z of [-1.58, 1.58]) {
    addSupportPost(BASIN_CENTER.x, z, 3.42, materials.ink, 0.12);
  }
  const finishBar = roundedMesh(0.14, 0.14, 3.36, 0.04, materials.ink);
  finishBar.position.set(BASIN_CENTER.x, 3.38, 0);
  scene.add(finishBar);

  addSignPanel(['FINISH'], 2.6, 0.64, new THREE.Vector3(BASIN_CENTER.x - 0.01, 3.0, 0), Math.PI / 2, {
    background: '#183445',
    color: '#fff7e6',
    accent: '#ffd15c',
    fontSize: 102,
    border: 'rgba(255,209,92,0.55)',
  });

  return { finishGlow, finishGlowMaterial, basinLight };
}

function createStartGate() {
  for (const z of [-0.94, 0.94]) {
    const post = roundedMesh(0.15, 1.48, 0.15, 0.04, materials.ink);
    post.position.set(-7.03, 5.62, z);
    scene.add(post);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), materials.coral);
    cap.position.set(-7.03, 6.4, z);
    cap.castShadow = true;
    scene.add(cap);
  }
  const bar = roundedMesh(0.15, 0.15, 2.03, 0.045, materials.ink);
  bar.position.set(-7.03, 6.34, 0);
  scene.add(bar);

  addSignPanel(['START'], 1.55, 0.46, new THREE.Vector3(-7.03, 5.96, 1.015), 0, {
    background: '#183445',
    color: '#fff7e6',
    accent: '#24bca7',
    fontSize: 106,
    border: 'rgba(36,188,167,0.56)',
  });

  const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 24), materials.metal);
  plunger.rotation.z = Math.PI / 2;
  plunger.position.set(-7.72, 4.98, 0);
  plunger.castShadow = true;
  scene.add(plunger);

  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(0.37, 0.43, 48),
    new THREE.MeshBasicMaterial({ color: 0x183445, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(START_POSITION.x, 4.906, 0);
  scene.add(padRing);
}

function createCourse() {
  createSegment(
    new THREE.Vector3(-7.94, 4.9, 0),
    new THREE.Vector3(-6.08, 4.9, 0),
    1.56,
    materials.lavenderDeep,
    materials.yellow,
    { stripe: false },
  );

  createSegment(
    new THREE.Vector3(-6.12, 4.9, 0),
    new THREE.Vector3(-3.3, 3.72, 0),
    1.3,
    materials.teal,
    materials.yellow,
  );

  createSegment(
    new THREE.Vector3(-3.31, 3.72, 0),
    new THREE.Vector3(-2.64, 3.72, 0),
    1.42,
    materials.coral,
    materials.blue,
    { stripe: false },
  );

  createJumpRamp();

  createSegment(
    new THREE.Vector3(0.79, 1.68, 0),
    new THREE.Vector3(3.98, 1.08, 0),
    1.62,
    materials.coral,
    materials.blue,
  );

  const landingStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 1.58), hazardMaterial);
  landingStripe.position.set(0.98, 1.665, 0);
  landingStripe.rotation.z = -0.157;
  landingStripe.castShadow = true;
  landingStripe.receiveShadow = true;
  scene.add(landingStripe);

  for (const x of [-5.1, -4.05]) {
    const t = (x + 6.12) / (-3.3 + 6.12);
    const topY = THREE.MathUtils.lerp(4.9, 3.72, t) - 0.13;
    addTrestle(x, topY, 1.24, materials.darkMetal);
  }
  addTrestle(-3.0, 3.56, 1.36, materials.darkMetal);
  addTrestle(1.55, 1.49, 1.48, materials.darkMetal);
  addTrestle(3.35, 1.08, 1.48, materials.darkMetal);

  addSupportPost(-7.72, -0.57, 4.78, materials.darkMetal, 0.13);
  addSupportPost(-7.72, 0.57, 4.78, materials.darkMetal, 0.13);
  addSupportPost(-6.35, -0.57, 4.78, materials.darkMetal, 0.13);
  addSupportPost(-6.35, 0.57, 4.78, materials.darkMetal, 0.13);

  const crossOne = roundedMesh(1.24, 0.09, 0.09, 0.02, materials.darkMetal);
  crossOne.position.set(-7.72, 2.65, 0);
  scene.add(crossOne);
  const crossTwo = roundedMesh(1.24, 0.09, 0.09, 0.02, materials.darkMetal);
  crossTwo.position.set(-6.35, 2.65, 0);
  scene.add(crossTwo);

  createStartGate();
  const basin = createBasin();

  const gapSign = addSignPanel(['JUMP ZONE'], 1.55, 0.44, new THREE.Vector3(0.35, 0.23, 2.15), 0, {
    background: '#ffd15c',
    color: '#183445',
    fontSize: 74,
    border: 'rgba(24,52,69,0.32)',
  });
  gapSign.rotation.x = -0.22;

  return basin;
}

function addSpareMarbles() {
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 0.12, 36), materials.tealDeep);
  cup.position.set(6.55, TABLE_TOP + 0.06, -3.05);
  cup.castShadow = true;
  cup.receiveShadow = true;
  scene.add(cup);

  const marbleGeometry = new THREE.SphereGeometry(0.2, 32, 24);
  const spareMaterials = [
    new THREE.MeshPhysicalMaterial({ color: 0xff745d, metalness: 0.88, roughness: 0.08, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: 0x5d8ef5, metalness: 0.86, roughness: 0.1, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffd15c, metalness: 0.84, roughness: 0.1, clearcoat: 1 }),
  ];
  const positions = [
    [-0.21, 0.16, -0.06],
    [0.16, 0.16, 0.08],
    [0.01, 0.31, -0.02],
  ];
  positions.forEach((position, index) => {
    const ball = new THREE.Mesh(marbleGeometry, spareMaterials[index]);
    ball.position.set(6.55 + position[0], TABLE_TOP + 0.12 + position[1], -3.05 + position[2]);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);
  });
}

function addLighting() {
  const hemisphere = new THREE.HemisphereLight(0xf1fbff, 0xb99d7b, 1.45);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xfff7e8, 3.25);
  key.position.set(-7.5, 15, 9.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 36;
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 4;
  key.target.position.set(0, 1.6, 0);
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xa7d7ff, 1.1);
  fill.position.set(9, 6, -6);
  fill.target.position.set(0, 2, 0);
  scene.add(fill);
  scene.add(fill.target);

  const rim = new THREE.PointLight(0xffb89e, 1.5, 14, 2);
  rim.position.set(-8, 6, 4);
  scene.add(rim);
}

const basinParts = createCourse();
addSpareMarbles();
addLighting();

const marbleGeometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 48);
const marbleMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xeaf8ff,
  metalness: 1,
  roughness: 0.035,
  clearcoat: 1,
  clearcoatRoughness: 0.015,
  envMapIntensity: 2.4,
  iridescence: 0.55,
  iridescenceIOR: 1.45,
  iridescenceThicknessRange: [120, 360],
});
const marble = new THREE.Mesh(marbleGeometry, marbleMaterial);
marble.castShadow = true;
marble.receiveShadow = true;
scene.add(marble);

const marbleBody = new CANNON.Body({
  mass: 0.5,
  material: marblePhysicsMaterial,
  shape: new CANNON.Sphere(BALL_RADIUS),
  linearDamping: 0.012,
  angularDamping: 0.055,
  allowSleep: false,
});
world.addBody(marbleBody);

const trailPointLimit = 110;
const trailPoints = [];
const trailPositions = new Float32Array(trailPointLimit * 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
trailGeometry.setDrawRange(0, 0);
const trailMaterial = new THREE.LineBasicMaterial({
  color: 0x49d7c4,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
});
const trail = new THREE.Line(trailGeometry, trailMaterial);
trail.frustumCulled = false;
scene.add(trail);

function resetMarble() {
  marbleBody.position.set(START_POSITION.x, START_POSITION.y, START_POSITION.z);
  marbleBody.velocity.setZero();
  marbleBody.angularVelocity.setZero();
  marbleBody.force.setZero();
  marbleBody.torque.setZero();
  marbleBody.quaternion.set(0, 0, 0, 1);
  marbleBody.aabbNeedsUpdate = true;
  marbleBody.wakeUp();
  marble.position.copy(START_POSITION);
  marble.quaternion.identity();
  marble.visible = true;
  trailPoints.length = 0;
  trailGeometry.setDrawRange(0, 0);
}

resetMarble();

const ui = {
  attemptCount: document.getElementById('attempt-count'),
  statusChip: document.getElementById('status-chip'),
  statusText: document.getElementById('status-text'),
  pauseButton: document.getElementById('pause-button'),
  pauseOverlay: document.getElementById('pause-overlay'),
  resumeButton: document.getElementById('resume-button'),
  resultCard: document.getElementById('result-card'),
  resultEyebrow: document.getElementById('result-eyebrow'),
  resultTitle: document.getElementById('result-title'),
  resultMessage: document.getElementById('result-message'),
  resultRetry: document.getElementById('result-retry'),
  confetti: document.getElementById('confetti'),
  powerSlider: document.getElementById('power-slider'),
  powerOutput: document.getElementById('power-output'),
  angleSlider: document.getElementById('angle-slider'),
  angleOutput: document.getElementById('angle-output'),
  releaseButton: document.getElementById('release-button'),
  releaseLabel: document.querySelector('.release-label'),
  retryButton: document.getElementById('retry-button'),
  resetButton: document.getElementById('reset-button'),
  lockBadge: document.getElementById('lock-badge'),
  courseCamera: document.getElementById('course-camera'),
  followCamera: document.getElementById('follow-camera'),
  viewHint: document.getElementById('view-hint'),
  sliderRows: [...document.querySelectorAll('.slider-row')],
};

let state = 'setup';
let cameraMode = 'course';
let attempts = 0;
let power = DEFAULTS.power;
let angle = DEFAULTS.angle;
let runElapsed = 0;
let stallTime = 0;
let lastTrailTime = 0;
let finishFlash = 0;
let cameraTransition = null;
const followLook = new THREE.Vector3();

function padAttempt(value) {
  return String(value).padStart(2, '0');
}

function updateRangeFill(input) {
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const value = Number(input.value);
  const percent = ((value - minimum) / (maximum - minimum)) * 100;
  input.style.setProperty('--fill', `${percent}%`);
}

function setStatus(kind, text) {
  ui.statusChip.className = `status-chip is-${kind}`;
  ui.statusText.textContent = text;
}

function setControlsLocked(locked) {
  ui.powerSlider.disabled = locked;
  ui.angleSlider.disabled = locked;
  ui.sliderRows.forEach((row) => row.classList.toggle('is-disabled', locked));
  ui.lockBadge.classList.toggle('is-locked', locked);
  ui.lockBadge.lastChild.textContent = locked ? ' Locked' : ' Ready';
  ui.releaseButton.disabled = locked;
  ui.releaseLabel.textContent = locked ? (state === 'won' ? 'Basin reached' : state === 'lost' ? 'Run ended' : 'Marble running') : 'Release marble';
}

function updateAttempts() {
  ui.attemptCount.textContent = padAttempt(attempts);
}

function hideResult() {
  ui.resultCard.classList.remove('is-visible', 'is-failure');
  ui.resultCard.setAttribute('aria-hidden', 'true');
}

function showResult(success) {
  ui.resultCard.classList.toggle('is-failure', !success);
  ui.resultCard.classList.add('is-visible');
  ui.resultCard.setAttribute('aria-hidden', 'false');
  if (success) {
    ui.resultEyebrow.textContent = `Attempt ${padAttempt(attempts)} · ${runElapsed.toFixed(1)} sec`;
    ui.resultTitle.textContent = 'Made it!';
    ui.resultMessage.textContent = 'Clean landing. The steel marble found the finish basin.';
  } else {
    ui.resultEyebrow.textContent = `Attempt ${padAttempt(attempts)} · Missed`;
    ui.resultTitle.textContent = 'Off course';
    ui.resultMessage.textContent = 'The marble missed the line. Retry, then tune the impulse or lip angle.';
  }
}

function burstConfetti() {
  ui.confetti.innerHTML = '';
  const colors = ['#ff745d', '#24bca7', '#ffd15c', '#5d8ef5', '#9b87ff', '#fff7e6'];
  for (let i = 0; i < 42; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    const angleValue = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 260;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--dx', `${Math.cos(angleValue) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angleValue) * distance + 150}px`);
    piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 130}ms`;
    piece.style.width = `${5 + Math.random() * 7}px`;
    piece.style.height = `${8 + Math.random() * 9}px`;
    ui.confetti.appendChild(piece);
  }
  window.setTimeout(() => {
    ui.confetti.innerHTML = '';
  }, 2000);
}

function getImpulse() {
  return 2.0 + (power / 100) * 4.3;
}

function releaseMarble() {
  if (state !== 'setup') return;

  state = 'running';
  attempts += 1;
  runElapsed = 0;
  stallTime = 0;
  lastTrailTime = 0;
  finishFlash = 0;
  resetMarble();
  hideResult();
  updateAttempts();
  setStatus('running', 'In motion');
  setControlsLocked(true);
  ui.pauseButton.disabled = false;
  ui.pauseButton.classList.remove('is-paused');
  ui.pauseButton.querySelector('.icon-label').textContent = 'Pause';
  ui.pauseButton.setAttribute('aria-label', 'Pause run');
  ui.pauseButton.title = 'Pause run (P)';
  ui.pauseOverlay.classList.remove('is-visible');
  ui.pauseOverlay.setAttribute('aria-hidden', 'true');

  marbleBody.wakeUp();
  const impulse = getImpulse();
  marbleBody.applyImpulse(new CANNON.Vec3(impulse, 0, 0));
}

function finishRun(success) {
  if (state !== 'running') return;
  state = success ? 'won' : 'lost';
  marbleBody.velocity.setZero();
  marbleBody.angularVelocity.setZero();
  marbleBody.sleep();
  if (!success) marble.visible = false;
  setControlsLocked(true);
  ui.pauseButton.disabled = true;
  ui.pauseButton.classList.remove('is-paused');
  ui.pauseButton.querySelector('.icon-label').textContent = 'Pause';
  ui.pauseButton.setAttribute('aria-label', 'Pause run');
  ui.pauseButton.title = 'Pause run (P)';
  setStatus(success ? 'won' : 'lost', success ? 'Finished' : 'Missed');
  showResult(success);
  if (success) {
    burstConfetti();
    finishFlash = 1.6;
  }
  ui.releaseLabel.textContent = success ? 'Basin reached' : 'Run ended';
}

function retryRun() {
  const wasRunning = state === 'running';
  if (wasRunning) {
    marbleBody.velocity.setZero();
    marbleBody.angularVelocity.setZero();
  }
  state = 'setup';
  resetMarble();
  hideResult();
  setControlsLocked(false);
  setStatus('setup', 'Set up');
  ui.pauseButton.disabled = true;
  ui.pauseButton.classList.remove('is-paused');
  ui.pauseButton.querySelector('.icon-label').textContent = 'Pause';
  ui.pauseButton.setAttribute('aria-label', 'Pause run');
  ui.pauseButton.title = 'Pause run (P)';
  ui.pauseOverlay.classList.remove('is-visible');
  ui.pauseOverlay.setAttribute('aria-hidden', 'true');
  if (cameraMode === 'course') {
    setCourseView(true);
  } else {
    followLook.copy(START_POSITION);
  }
}

function resetAll() {
  state = 'setup';
  attempts = 0;
  power = DEFAULTS.power;
  angle = DEFAULTS.angle;
  ui.powerSlider.value = String(power);
  ui.angleSlider.value = String(angle);
  ui.powerOutput.textContent = `${power}%`;
  ui.angleOutput.textContent = `${angle}°`;
  updateRangeFill(ui.powerSlider);
  updateRangeFill(ui.angleSlider);
  syncJumpRamp(angle);
  updateAttempts();
  cameraMode = 'course';
  updateCameraButtons();
  retryRun();
  setCourseView(false);
}

function togglePause() {
  if (state === 'running') {
    state = 'paused';
    setStatus('paused', 'Paused');
    ui.pauseButton.classList.add('is-paused');
    ui.pauseButton.querySelector('.icon-label').textContent = 'Resume';
    ui.pauseButton.setAttribute('aria-label', 'Resume run');
    ui.pauseButton.title = 'Resume run (P)';
    ui.pauseOverlay.classList.add('is-visible');
    ui.pauseOverlay.setAttribute('aria-hidden', 'false');
  } else if (state === 'paused') {
    state = 'running';
    setStatus('running', 'In motion');
    ui.pauseButton.classList.remove('is-paused');
    ui.pauseButton.querySelector('.icon-label').textContent = 'Pause';
    ui.pauseButton.setAttribute('aria-label', 'Pause run');
    ui.pauseButton.title = 'Pause run (P)';
    ui.pauseOverlay.classList.remove('is-visible');
    ui.pauseOverlay.setAttribute('aria-hidden', 'true');
  }
}

function setPower(value) {
  power = Number(value);
  ui.powerOutput.textContent = `${power}%`;
  updateRangeFill(ui.powerSlider);
}

function setAngle(value) {
  angle = Number(value);
  ui.angleOutput.textContent = `${angle}°`;
  updateRangeFill(ui.angleSlider);
  syncJumpRamp(angle);
}

ui.powerSlider.addEventListener('input', (event) => setPower(event.target.value));
ui.angleSlider.addEventListener('input', (event) => setAngle(event.target.value));
ui.releaseButton.addEventListener('click', releaseMarble);
ui.retryButton.addEventListener('click', retryRun);
ui.resetButton.addEventListener('click', resetAll);
ui.resultRetry.addEventListener('click', retryRun);
ui.pauseButton.addEventListener('click', togglePause);
ui.resumeButton.addEventListener('click', togglePause);
ui.courseCamera.addEventListener('click', () => setCameraMode('course'));
ui.followCamera.addEventListener('click', () => setCameraMode('follow'));

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (state === 'setup') releaseMarble();
  } else if (event.key.toLowerCase() === 'p') {
    event.preventDefault();
    if (state === 'running' || state === 'paused') togglePause();
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    retryRun();
  }
});

function updateCameraButtons() {
  const isCourse = cameraMode === 'course';
  ui.courseCamera.classList.toggle('is-active', isCourse);
  ui.followCamera.classList.toggle('is-active', !isCourse);
  ui.courseCamera.setAttribute('aria-pressed', String(isCourse));
  ui.followCamera.setAttribute('aria-pressed', String(!isCourse));
  ui.viewHint.textContent = isCourse ? 'Drag to orbit · Scroll to zoom' : 'Camera follows the marble';
}

function getCourseCameraSetup() {
  const portrait = isPortraitLayout();
  if (portrait) {
    return {
      fov: 50,
      position: new THREE.Vector3(11.4, 12.8, 18.3),
      target: new THREE.Vector3(0.2, 2.25, 0),
    };
  }
  return {
    fov: 39,
    position: new THREE.Vector3(10.8, 9.4, 13.8),
    target: new THREE.Vector3(0.1, 2.05, 0),
  };
}

function isPortraitLayout() {
  return window.innerWidth <= 760 || window.innerWidth / window.innerHeight < 0.9;
}

function setCourseView(animate = true) {
  const setup = getCourseCameraSetup();
  camera.fov = setup.fov;
  camera.updateProjectionMatrix();
  controls.enabled = false;
  if (animate) {
    cameraTransition = {
      start: performance.now(),
      duration: 720,
      fromPosition: camera.position.clone(),
      toPosition: setup.position,
      fromTarget: controls.target.clone(),
      toTarget: setup.target,
    };
  } else {
    cameraTransition = null;
    camera.position.copy(setup.position);
    controls.target.copy(setup.target);
    followLook.copy(setup.target);
    camera.lookAt(setup.target);
    controls.enabled = true;
    controls.update();
  }
}

function setCameraMode(mode) {
  if (cameraMode === mode) return;
  cameraMode = mode;
  updateCameraButtons();
  if (mode === 'course') {
    setCourseView(true);
  } else {
    cameraTransition = null;
    controls.enabled = false;
    followLook.copy(marble.position);
  }
}

function updateCourseTransition(now) {
  if (!cameraTransition) {
    controls.enabled = true;
    controls.update();
    followLook.copy(controls.target);
    return;
  }
  const raw = THREE.MathUtils.clamp((now - cameraTransition.start) / cameraTransition.duration, 0, 1);
  const t = 1 - Math.pow(1 - raw, 3);
  camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, t);
  const target = new THREE.Vector3().lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, t);
  controls.target.copy(target);
  followLook.copy(target);
  camera.lookAt(target);
  if (raw >= 1) {
    cameraTransition = null;
    controls.enabled = true;
    controls.update();
  }
}

function updateFollowCamera(dt) {
  const portrait = isPortraitLayout();
  const offset = portrait ? new THREE.Vector3(-4.9, 3.6, 6.4) : new THREE.Vector3(-3.8, 2.85, 4.9);
  const targetOffset = new THREE.Vector3(0.72, 0.22, 0);
  const desiredPosition = marble.position.clone().add(offset);
  const desiredTarget = marble.position.clone().add(targetOffset);
  const positionBlend = 1 - Math.exp(-dt * 4.1);
  const targetBlend = 1 - Math.exp(-dt * 5.3);
  camera.position.lerp(desiredPosition, positionBlend);
  followLook.lerp(desiredTarget, targetBlend);
  camera.lookAt(followLook);
  camera.fov += ((portrait ? 49 : 40) - camera.fov) * (1 - Math.exp(-dt * 3));
  camera.updateProjectionMatrix();
}

function updateTrail(now) {
  if (state !== 'running' || now - lastTrailTime < 28) return;
  lastTrailTime = now;
  const last = trailPoints[trailPoints.length - 1];
  if (!last || last.distanceToSquared(marble.position) > 0.0012) {
    trailPoints.push(marble.position.clone());
    if (trailPoints.length > trailPointLimit) trailPoints.shift();
  }
  for (let i = 0; i < trailPoints.length; i += 1) {
    const point = trailPoints[i];
    trailPositions[i * 3] = point.x;
    trailPositions[i * 3 + 1] = point.y;
    trailPositions[i * 3 + 2] = point.z;
  }
  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.setDrawRange(0, trailPoints.length);
}

function updatePhysics(dt) {
  if (state !== 'running') return;
  world.step(1 / 60, Math.min(dt, 0.05), 4);
  marble.position.copy(marbleBody.position);
  marble.quaternion.copy(marbleBody.quaternion);

  runElapsed += dt;
  const dx = marbleBody.position.x - BASIN_CENTER.x;
  const dz = marbleBody.position.z - BASIN_CENTER.z;
  const basinDistanceSq = dx * dx + dz * dz;

  if (basinDistanceSq < (BASIN_RADIUS * 0.96) ** 2 && marbleBody.position.y < 1.17 && marbleBody.position.y > 0.2) {
    finishRun(true);
    return;
  }

  const speedSq = marbleBody.velocity.lengthSquared();
  if (runElapsed > 2.8 && speedSq < 0.035) {
    stallTime += dt;
  } else {
    stallTime = 0;
  }

  const fell =
    marbleBody.position.y < 0.18 ||
    marbleBody.position.x > 8.4 ||
    marbleBody.position.x < -9.8 ||
    Math.abs(marbleBody.position.z) > 5.1 ||
    runElapsed > 16 ||
    stallTime > 2.6;
  if (fell) finishRun(false);
}

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (cameraMode === 'course') setCourseView(false);
}

const resizeObserver = new ResizeObserver(() => resize());
resizeObserver.observe(container);
window.addEventListener('resize', resize);

updateRangeFill(ui.powerSlider);
updateRangeFill(ui.angleSlider);
syncJumpRamp(angle);
updateAttempts();
updateCameraButtons();
resize();
setCourseView(false);

const clock = new THREE.Clock();
let totalTime = 0;
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  totalTime += dt;

  if (state === 'running') {
    updatePhysics(dt);
    updateTrail(now);
  } else {
    marble.position.copy(marbleBody.position);
    marble.quaternion.copy(marbleBody.quaternion);
  }

  if (cameraMode === 'follow') {
    updateFollowCamera(dt);
  } else {
    updateCourseTransition(now);
  }

  if (finishFlash > 0) finishFlash = Math.max(0, finishFlash - dt);
  const pulse = 1 + Math.sin(totalTime * 2.4) * 0.018 + finishFlash * Math.max(0, Math.sin(totalTime * 13)) * 0.08;
  basinParts.finishGlow.scale.setScalar(pulse);
  basinParts.finishGlowMaterial.emissiveIntensity = 1.15 + Math.sin(totalTime * 2.4) * 0.25 + finishFlash * 2.2;
  basinParts.finishGlowMaterial.opacity = 0.72 + Math.sin(totalTime * 2.4) * 0.12;
  basinParts.basinLight.intensity = 1.35 + Math.sin(totalTime * 2.4) * 0.25 + finishFlash * 1.6;
  jumpLabelSprite.position.y = JUMP_PIVOT.y + 1.2 + Math.sin(totalTime * 1.7) * 0.035;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
