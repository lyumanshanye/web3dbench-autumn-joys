import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.querySelector('#watch-canvas');
const loader = document.querySelector('#loader');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ui = {
  range: document.querySelector('#explode-range'),
  value: document.querySelector('#explode-value'),
  state: document.querySelector('#assembly-state'),
  toggle: document.querySelector('#assembly-toggle'),
  label: document.querySelector('#assembly-label'),
  callouts: document.querySelector('.callouts'),
  balanceCallout: document.querySelector('#callout-balance'),
  barrelCallout: document.querySelector('#callout-barrel'),
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0b08, 0.027);

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.rotateSpeed = 0.54;
controls.zoomSpeed = 0.7;
controls.minPolarAngle = 0.22;
controls.maxPolarAngle = 1.34;
controls.target.set(-0.62, 0.7, 0);

function layoutCamera(resetPosition = true) {
  const aspect = window.innerWidth / window.innerHeight;
  const portrait = aspect < 0.8;

  camera.fov = portrait ? 46 : 34;
  controls.minDistance = portrait ? 9.0 : 5.2;
  controls.maxDistance = portrait ? 20 : 15;

  if (resetPosition) {
    controls.target.set(portrait ? 0 : -0.62, portrait ? 0.78 : 0.34, 0);
    if (portrait) {
      camera.position.set(3.95, 10.45, 7.45);
    } else {
      camera.position.set(4.65, 5.6, 6.26);
    }
  }

  camera.updateProjectionMatrix();
  controls.update();
}

layoutCamera(true);

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment(renderer);
const environmentTarget = pmrem.fromScene(roomEnvironment, 0.04);
scene.environment = environmentTarget.texture;
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0xf0e5d0, 0x17130e, 0.72);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffe7c3, 3.6);
keyLight.position.set(5.6, 9.4, 6.8);
keyLight.target.position.set(0, 0.5, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(window.innerWidth < 760 ? 1024 : 2048, window.innerWidth < 760 ? 1024 : 2048);
keyLight.shadow.camera.left = -6.5;
keyLight.shadow.camera.right = 6.5;
keyLight.shadow.camera.top = 6.5;
keyLight.shadow.camera.bottom = -6.5;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 25;
keyLight.shadow.bias = -0.00018;
keyLight.shadow.normalBias = 0.018;
scene.add(keyLight, keyLight.target);

const coolFill = new THREE.DirectionalLight(0x9db8c8, 1.1);
coolFill.position.set(-7, 4.5, -2);
scene.add(coolFill);

const warmRim = new THREE.SpotLight(0xffc17b, 240, 30, 0.48, 0.8, 1.25);
warmRim.position.set(-4.2, 7.2, -5.5);
warmRim.target.position.set(0, 0.4, 0);
scene.add(warmRim, warmRim.target);

const gold = new THREE.MeshPhysicalMaterial({
  color: 0xc9a66d,
  metalness: 1,
  roughness: 0.19,
  clearcoat: 0.45,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.35,
});

const warmGold = new THREE.MeshPhysicalMaterial({
  color: 0xb98a4d,
  metalness: 1,
  roughness: 0.27,
  clearcoat: 0.3,
  envMapIntensity: 1.2,
});

const roseGold = new THREE.MeshPhysicalMaterial({
  color: 0xc48f72,
  metalness: 1,
  roughness: 0.22,
  envMapIntensity: 1.25,
});

const steel = new THREE.MeshPhysicalMaterial({
  color: 0xd3d3cb,
  metalness: 1,
  roughness: 0.17,
  clearcoat: 0.28,
  envMapIntensity: 1.45,
});

const darkSteel = new THREE.MeshPhysicalMaterial({
  color: 0x5c615d,
  metalness: 0.95,
  roughness: 0.3,
  envMapIntensity: 1.0,
});

const plateMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x202724,
  metalness: 0.82,
  roughness: 0.34,
  clearcoat: 0.3,
  clearcoatRoughness: 0.3,
  envMapIntensity: 0.9,
});

const plateMaterialDark = new THREE.MeshPhysicalMaterial({
  color: 0x101716,
  metalness: 0.72,
  roughness: 0.4,
  envMapIntensity: 0.8,
});

const dialMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x071312,
  metalness: 0.58,
  roughness: 0.25,
  clearcoat: 0.85,
  clearcoatRoughness: 0.14,
  envMapIntensity: 1.3,
});

const ruby = new THREE.MeshPhysicalMaterial({
  color: 0x8f1631,
  metalness: 0.08,
  roughness: 0.08,
  clearcoat: 1,
  clearcoatRoughness: 0.03,
  emissive: 0x1d0005,
  emissiveIntensity: 0.55,
  envMapIntensity: 1.7,
});

const screwSlotMaterial = new THREE.MeshBasicMaterial({ color: 0x121412 });

const crystalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xdde9e7,
  metalness: 0,
  roughness: 0.015,
  transmission: 0.93,
  thickness: 0.24,
  ior: 1.52,
  transparent: true,
  opacity: 0.42,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.5,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const deskMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.04 });
const matMaterial = new THREE.MeshStandardMaterial({ color: 0x10221c, roughness: 0.9, metalness: 0.04 });

function makeWoodTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const ctx = textureCanvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, '#21150f');
  base.addColorStop(0.48, '#160f0b');
  base.addColorStop(1, '#100c09');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);

  let seed = 37;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 150; i += 1) {
    const y = random() * 1080 - 30;
    const amp = 10 + random() * 38;
    const alpha = 0.025 + random() * 0.075;
    ctx.beginPath();
    for (let x = -40; x <= 1060; x += 18) {
      const wave = Math.sin(x * (0.006 + random() * 0.004) + i) * amp;
      const drift = x * 0.018;
      const py = y + wave + Math.sin(x * 0.002 + i * 0.3) * 15 + drift * 0.15;
      if (x === -40) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.strokeStyle = i % 5 === 0 ? `rgba(188, 127, 74, ${alpha * 0.8})` : `rgba(3, 2, 1, ${alpha})`;
    ctx.lineWidth = 0.6 + random() * 2.5;
    ctx.stroke();
  }

  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.translate(random() * 1000, random() * 1000);
    ctx.rotate(random() * Math.PI);
    ctx.scale(2.8 + random() * 2.6, 0.7 + random() * 0.8);
    for (let ring = 1; ring < 8; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + ring * 4, 5 + ring * 2.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(2, 1, 0, ${0.05 + ring * 0.006})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeLeatherTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#10221c';
  ctx.fillRect(0, 0, 512, 512);
  let seed = 821;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 4800; i += 1) {
    const light = random() > 0.48;
    ctx.fillStyle = light ? `rgba(77, 105, 88, ${random() * 0.08})` : `rgba(0, 4, 2, ${random() * 0.13})`;
    const size = random() * 2.4 + 0.35;
    ctx.fillRect(random() * 512, random() * 512, size, size);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const woodTexture = makeWoodTexture();
deskMaterial.map = woodTexture;
matMaterial.map = makeLeatherTexture();

const desk = new THREE.Mesh(new THREE.PlaneGeometry(45, 45), deskMaterial);
desk.rotation.x = -Math.PI / 2;
desk.position.y = -0.06;
desk.receiveShadow = true;
scene.add(desk);

const workMat = new THREE.Mesh(new THREE.CylinderGeometry(3.08, 3.08, 0.06, 128), matMaterial);
workMat.position.y = -0.03;
workMat.receiveShadow = true;
workMat.castShadow = true;
scene.add(workMat);

const matEdge = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.017, 8, 160), warmGold);
matEdge.rotation.x = Math.PI / 2;
matEdge.position.y = 0.018;
matEdge.castShadow = true;
scene.add(matEdge);

const innerMatLine = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.005, 4, 140), darkSteel);
innerMatLine.rotation.x = Math.PI / 2;
innerMatLine.position.y = 0.017;
scene.add(innerMatLine);

function makeRingShape(outerRadius, innerRadius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function extrudeFlat(shape, depth, material, bevel = 0.02, curveSegments = 64) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createScrew(radius = 0.06, material = steel) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, radius * 0.42, 24), material);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.62, radius * 0.08, radius * 0.16),
    screwSlotMaterial,
  );
  slot.position.y = radius * 0.218;
  group.add(slot);
  return group;
}

function createJewel(radius = 0.062) {
  const group = new THREE.Group();
  const chaton = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.62, radius * 1.62, radius * 0.38, 24), gold);
  chaton.castShadow = true;
  chaton.receiveShadow = true;
  group.add(chaton);

  const stone = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, radius * 0.5, 24), ruby);
  stone.position.y = radius * 0.34;
  stone.castShadow = true;
  group.add(stone);

  const oil = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, radius * 0.03, 12),
    new THREE.MeshBasicMaterial({ color: 0x40000d }),
  );
  oil.position.y = radius * 0.6;
  group.add(oil);
  return group;
}

function createGearGeometry(teeth, radius, thickness, holeRadius, windowCount = 5) {
  const shape = new THREE.Shape();
  const rootRadius = radius * 0.79;
  const step = (Math.PI * 2) / teeth;
  const profile = [
    [-0.5, rootRadius],
    [-0.33, rootRadius],
    [-0.19, radius],
    [0.19, radius],
    [0.33, rootRadius],
  ];

  for (let tooth = 0; tooth < teeth; tooth += 1) {
    for (let point = 0; point < profile.length; point += 1) {
      const angle = tooth * step + profile[point][0] * step;
      const r = profile[point][1];
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (tooth === 0 && point === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();

  if (holeRadius > 0) {
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);
  }

  for (let i = 0; i < windowCount; i += 1) {
    const angle = (i / windowCount) * Math.PI * 2 + 0.22;
    const distance = radius * 0.49;
    const hole = new THREE.Path();
    hole.absarc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      radius * (windowCount > 6 ? 0.095 : 0.125),
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }

  return extrudeFlat(shape, thickness, gold, Math.min(0.012, thickness * 0.18), 18);
}

function createGear({
  x,
  z,
  radius,
  teeth,
  y = 0.18,
  thickness = 0.085,
  speed = 0,
  phase = 0,
  material = gold,
  windows = 5,
}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = phase;

  const wheel = createGearGeometry(teeth, radius, thickness, radius * 0.13, windows);
  wheel.material = material;
  group.add(wheel);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, thickness + 0.055, 32),
    material === gold ? roseGold : steel,
  );
  hub.castShadow = true;
  hub.receiveShadow = true;
  group.add(hub);

  const pinion = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.055, radius * 0.055, thickness + 0.13, 16),
    steel,
  );
  pinion.position.y = thickness * 0.18;
  pinion.castShadow = true;
  group.add(pinion);

  gearRotors.push({ group, speed });
  return group;
}

function createBridge(length, width, angle, x, z, material = gold) {
  const group = new THREE.Group();
  group.position.set(x, 0.295, z);
  group.rotation.y = angle;

  const body = new THREE.Mesh(new RoundedBoxGeometry(length, 0.075, width, 6, width * 0.46), material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const inset = new THREE.Mesh(
    new RoundedBoxGeometry(length * 0.76, 0.007, width * 0.13, 4, width * 0.05),
    plateMaterialDark,
  );
  inset.position.y = 0.041;
  group.add(inset);
  return group;
}

function addBridgeHardware(bridge, length) {
  for (const side of [-1, 1]) {
    const screw = createScrew(0.046, steel);
    screw.position.set(side * length * 0.39, 0.065, 0);
    bridge.add(screw);
  }
  const jewel = createJewel(0.054);
  jewel.position.set(0, 0.062, 0);
  bridge.add(jewel);
}

class SpiralCurve extends THREE.Curve {
  constructor(startRadius, endRadius, turns) {
    super();
    this.startRadius = startRadius;
    this.endRadius = endRadius;
    this.turns = turns;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * Math.PI * 2 * this.turns;
    const radius = THREE.MathUtils.lerp(this.startRadius, this.endRadius, t);
    return target.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
}

function createBalanceWheel() {
  const group = new THREE.Group();
  group.position.set(-0.76, 0.205, -0.63);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.028, 12, 96), steel);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  group.add(rim);

  for (let i = 0; i < 2; i += 1) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.035, 0.035), steel);
    arm.rotation.y = i * Math.PI / 2;
    arm.castShadow = true;
    group.add(arm);
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 16), gold);
    weight.position.set(Math.cos(angle) * 0.43, 0.014, Math.sin(angle) * 0.43);
    weight.castShadow = true;
    group.add(weight);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 24), roseGold);
  hub.castShadow = true;
  group.add(hub);

  const hairspring = new THREE.Mesh(
    new THREE.TubeGeometry(new SpiralCurve(0.07, 0.38, 5.4), 220, 0.0045, 4, false),
    warmGold,
  );
  hairspring.position.y = 0.035;
  group.add(hairspring);

  return group;
}

function createPalletFork() {
  const group = new THREE.Group();
  group.position.set(-0.28, 0.235, -0.35);
  group.rotation.y = -0.62;
  const material = darkSteel;

  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.055), material);
  stem.position.x = 0.08;
  stem.castShadow = true;
  group.add(stem);

  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.18), material);
  fork.position.x = -0.18;
  fork.castShadow = true;
  group.add(fork);

  const jewel = createJewel(0.032);
  jewel.position.set(0.28, 0.028, 0);
  group.add(jewel);
  return group;
}

const watchRoot = new THREE.Group();
watchRoot.position.y = 0.35;
watchRoot.rotation.y = -0.11;
scene.add(watchRoot);

const caseGroup = new THREE.Group();
watchRoot.add(caseGroup);

const caseBody = extrudeFlat(makeRingShape(2.08, 1.72), 0.52, gold, 0.085, 128);
caseBody.position.y = 0;
caseGroup.add(caseBody);

const caseBevelTop = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.034, 10, 160), steel);
caseBevelTop.rotation.x = Math.PI / 2;
caseBevelTop.position.y = 0.343;
caseGroup.add(caseBevelTop);

const caseBevelBottom = caseBevelTop.clone();
caseBevelBottom.position.y = -0.343;
caseGroup.add(caseBevelBottom);

const caseInnerLip = extrudeFlat(makeRingShape(1.76, 1.66), 0.12, plateMaterialDark, 0.008, 96);
caseInnerLip.position.y = 0.13;
caseGroup.add(caseInnerLip);

const caseFlutes = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.018, 0.58, 0.027),
  warmGold,
  88,
);
const fluteMatrix = new THREE.Matrix4();
const fluteQuaternion = new THREE.Quaternion();
const flutePosition = new THREE.Vector3();
const fluteScale = new THREE.Vector3(1, 1, 1);
for (let i = 0; i < 88; i += 1) {
  const angle = (i / 88) * Math.PI * 2;
  flutePosition.set(Math.cos(angle) * 2.174, 0, Math.sin(angle) * 2.174);
  fluteQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
  fluteMatrix.compose(flutePosition, fluteQuaternion, fluteScale);
  caseFlutes.setMatrixAt(i, fluteMatrix);
}
caseFlutes.instanceMatrix.needsUpdate = true;
caseFlutes.castShadow = true;
caseFlutes.receiveShadow = true;
caseGroup.add(caseFlutes);

function createLug(x, z) {
  const lug = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.25, 0.62, 5, 0.09), gold);
  lug.position.set(x, 0.005, z);
  lug.rotation.y = x > 0 ? -0.19 : 0.19;
  lug.castShadow = true;
  lug.receiveShadow = true;
  return lug;
}

for (const x of [-1.35, 1.35]) {
  for (const z of [-1.9, 1.9]) {
    caseGroup.add(createLug(x, z));
  }
}

for (const z of [-2.1, 2.1]) {
  const springBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.75, 16), steel);
  springBar.rotation.z = Math.PI / 2;
  springBar.position.set(0, -0.035, z);
  springBar.castShadow = true;
  caseGroup.add(springBar);
}

function createCrown() {
  const group = new THREE.Group();
  group.position.set(2.05, 0.015, 0);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 24), steel);
  stem.rotation.z = Math.PI / 2;
  stem.position.x = 0.1;
  stem.castShadow = true;
  group.add(stem);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.3, 36), gold);
  body.rotation.z = Math.PI / 2;
  body.position.x = 0.32;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.035, 0.017), warmGold);
    ridge.position.set(0.32, Math.cos(angle) * 0.215, Math.sin(angle) * 0.215);
    ridge.rotation.x = -angle;
    group.add(ridge);
  }

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.026, 32), roseGold);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 0.48;
  cap.castShadow = true;
  group.add(cap);
  return group;
}

caseGroup.add(createCrown());

const casebackGroup = new THREE.Group();
watchRoot.add(casebackGroup);

const caseback = new THREE.Mesh(new THREE.CylinderGeometry(2.015, 2.015, 0.1, 128), gold);
caseback.position.y = -0.245;
caseback.castShadow = true;
caseback.receiveShadow = true;
casebackGroup.add(caseback);

const casebackGlass = new THREE.Mesh(new THREE.CircleGeometry(1.52, 96), new THREE.MeshPhysicalMaterial({
  color: 0x07100f,
  metalness: 0.45,
  roughness: 0.06,
  clearcoat: 1,
  envMapIntensity: 1.7,
}));
casebackGlass.rotation.x = -Math.PI / 2;
casebackGlass.position.y = -0.193;
casebackGroup.add(casebackGlass);

for (let i = 0; i < 6; i += 1) {
  const angle = (i / 6) * Math.PI * 2;
  const screw = createScrew(0.048, steel);
  screw.position.set(Math.cos(angle) * 1.78, -0.185, Math.sin(angle) * 1.78);
  screw.rotation.y = angle;
  casebackGroup.add(screw);
}

const movementGroup = new THREE.Group();
watchRoot.add(movementGroup);

const mainPlateShape = new THREE.Shape();
mainPlateShape.absarc(0, 0, 1.69, 0, Math.PI * 2, false);
for (let i = 0; i < 6; i += 1) {
  const angle = (i / 6) * Math.PI * 2 + 0.15;
  const hole = new THREE.Path();
  hole.absarc(Math.cos(angle) * 0.88, Math.sin(angle) * 0.88, 0.29, 0, Math.PI * 2, true);
  mainPlateShape.holes.push(hole);
}
const mainPlate = extrudeFlat(mainPlateShape, 0.15, plateMaterial, 0.02, 64);
mainPlate.position.y = 0.045;
movementGroup.add(mainPlate);

const plateRim = new THREE.Mesh(new THREE.TorusGeometry(1.665, 0.025, 8, 128), darkSteel);
plateRim.rotation.x = Math.PI / 2;
plateRim.position.y = 0.145;
movementGroup.add(plateRim);

for (let i = 0; i < 6; i += 1) {
  const angle = (i / 6) * Math.PI * 2 + 0.2;
  const screw = createScrew(0.04, steel);
  screw.position.set(Math.cos(angle) * 1.48, 0.138, Math.sin(angle) * 1.48);
  movementGroup.add(screw);
}

const gearRotors = [];
const gearTrain = new THREE.Group();
movementGroup.add(gearTrain);

const barrel = createGear({
  x: -0.55,
  z: 0.55,
  radius: 0.55,
  teeth: 42,
  speed: 0.11,
  phase: 0.31,
  material: gold,
  windows: 6,
});
gearTrain.add(barrel);

const mainspring = new THREE.Mesh(
  new THREE.TubeGeometry(new SpiralCurve(0.1, 0.41, 6.2), 260, 0.011, 5, false),
  darkSteel,
);
mainspring.position.y = 0.056;
barrel.add(mainspring);

const barrelHub = createJewel(0.075);
barrelHub.position.y = 0.06;
barrel.add(barrelHub);

gearTrain.add(createGear({
  x: 0.24,
  z: 0.2,
  radius: 0.37,
  teeth: 30,
  speed: -0.31,
  phase: 0.9,
  material: steel,
}));

gearTrain.add(createGear({
  x: 0.49,
  z: -0.43,
  radius: 0.29,
  teeth: 24,
  speed: 0.61,
  phase: 0.15,
  material: gold,
}));

gearTrain.add(createGear({
  x: 0.91,
  z: -0.02,
  radius: 0.205,
  teeth: 18,
  speed: -1.17,
  phase: 0.63,
  material: roseGold,
  windows: 4,
}));

gearTrain.add(createGear({
  x: 1.02,
  z: -0.61,
  radius: 0.235,
  teeth: 20,
  speed: 1.74,
  phase: 0.48,
  material: steel,
  windows: 4,
}));

gearTrain.add(createGear({
  x: -0.13,
  z: -0.75,
  radius: 0.245,
  teeth: 22,
  speed: -0.78,
  phase: 0.37,
  material: gold,
  windows: 4,
}));

gearTrain.add(createGear({
  x: 0.94,
  z: 0.58,
  radius: 0.16,
  teeth: 14,
  speed: 2.21,
  phase: 0.21,
  material: gold,
  windows: 3,
}));

const balanceWheel = createBalanceWheel();
gearTrain.add(balanceWheel);

const palletFork = createPalletFork();
gearTrain.add(palletFork);

for (const [x, z] of [[-0.72, 0.13], [0.72, -0.16], [0.12, 0.7], [-0.25, -0.85], [0.6, 0.74]]) {
  const jewel = createJewel(0.052);
  jewel.position.set(x, 0.142, z);
  movementGroup.add(jewel);
}

const movementRim = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.018, 6, 128), warmGold);
movementRim.rotation.x = Math.PI / 2;
movementRim.position.y = 0.144;
movementGroup.add(movementRim);

const bridgeGroup = new THREE.Group();
watchRoot.add(bridgeGroup);

const bridgeOne = createBridge(1.35, 0.19, 0.61, -0.04, -0.12, gold);
addBridgeHardware(bridgeOne, 1.35);
bridgeGroup.add(bridgeOne);

const bridgeTwo = createBridge(1.12, 0.165, -0.74, 0.1, -0.36, steel);
addBridgeHardware(bridgeTwo, 1.12);
bridgeGroup.add(bridgeTwo);

const bridgeThree = createBridge(0.72, 0.15, 1.18, -0.71, -0.42, roseGold);
addBridgeHardware(bridgeThree, 0.72);
bridgeGroup.add(bridgeThree);

const balanceBridge = createBridge(0.58, 0.135, 0.18, -0.76, -0.64, gold);
balanceBridge.position.y = 0.345;
bridgeGroup.add(balanceBridge);

const balanceBridgeJewel = createJewel(0.052);
balanceBridgeJewel.position.set(-0.76, 0.448, -0.64);
bridgeGroup.add(balanceBridgeJewel);

const bridgeScrews = [
  [-1.0, 0.355, 0.17],
  [0.65, 0.355, -0.13],
  [-0.2, 0.355, -0.82],
  [0.52, 0.355, 0.62],
];
for (const [x, y, z] of bridgeScrews) {
  const screw = createScrew(0.044, steel);
  screw.position.set(x, y, z);
  bridgeGroup.add(screw);
}

function createDialTexture() {
  const size = 2048;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');
  const center = size / 2;
  const outer = size * 0.466;
  const inner = outer * (1.33 / 1.84);
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);

  const sheen = ctx.createLinearGradient(-outer, -outer, outer, outer);
  sheen.addColorStop(0, 'rgba(26, 57, 51, 0.22)');
  sheen.addColorStop(0.48, 'rgba(2, 12, 10, 0.04)');
  sheen.addColorStop(1, 'rgba(44, 78, 68, 0.16)');
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2, false);
  ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
  ctx.fillStyle = sheen;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, outer - 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(207, 177, 122, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, inner + 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(207, 177, 122, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const length = major ? 68 : 32;
    const rStart = outer - 31;
    const x1 = Math.cos(angle) * rStart;
    const y1 = Math.sin(angle) * rStart;
    const x2 = Math.cos(angle) * (rStart - length);
    const y2 = Math.sin(angle) * (rStart - length);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = major ? 'rgba(233, 210, 169, 0.87)' : 'rgba(218, 200, 169, 0.42)';
    ctx.lineWidth = major ? 4.2 : 1.7;
    ctx.stroke();
  }

  const drawSpaced = (text, y, fontSize, spacing, color, weight = 500) => {
    ctx.save();
    ctx.font = `${weight} ${fontSize}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const widths = [...text].map((char) => ctx.measureText(char).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (text.length - 1);
    let x = -total / 2;
    for (let i = 0; i < text.length; i += 1) {
      ctx.fillText(text[i], x, y);
      x += widths[i] + spacing;
    }
    ctx.restore();
  };

  drawSpaced('MÉCANIQUE', -outer + 190, 41, 10, 'rgba(235, 220, 194, 0.94)', 600);
  drawSpaced('GENÈVE · 21 RUBIS', -outer + 232, 18, 6, 'rgba(201, 169, 113, 0.82)', 500);
  drawSpaced('SWISS MADE', outer - 175, 17, 6, 'rgba(201, 169, 113, 0.68)', 500);

  ctx.restore();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const dialGroup = new THREE.Group();
watchRoot.add(dialGroup);

const chapterRing = extrudeFlat(makeRingShape(1.84, 1.33), 0.085, dialMaterial, 0.024, 128);
chapterRing.position.y = 0.4;
dialGroup.add(chapterRing);

const dialFace = new THREE.Mesh(
  new THREE.RingGeometry(1.33, 1.84, 192, 1),
  new THREE.MeshBasicMaterial({
    map: createDialTexture(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
);
dialFace.rotation.x = -Math.PI / 2;
dialFace.position.y = 0.469;
dialFace.renderOrder = 1;
dialGroup.add(dialFace);

for (let i = 0; i < 12; i += 1) {
  const angle = (i / 12) * Math.PI * 2;
  const major = i % 3 === 0;
  const marker = new THREE.Mesh(
    new RoundedBoxGeometry(major ? 0.062 : 0.032, 0.028, major ? 0.235 : 0.12, 4, 0.009),
    i === 0 ? roseGold : gold,
  );
  marker.position.set(Math.sin(angle) * 1.66, 0.482, -Math.cos(angle) * 1.66);
  marker.rotation.y = -angle;
  marker.castShadow = true;
  dialGroup.add(marker);
}

const dialInnerRim = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.015, 6, 128), warmGold);
dialInnerRim.rotation.x = Math.PI / 2;
dialInnerRim.position.y = 0.47;
dialGroup.add(dialInnerRim);

const handsGroup = new THREE.Group();
watchRoot.add(handsGroup);

function createHandGeometry(length, width, tail, depth = 0.016) {
  const shape = new THREE.Shape();
  shape.moveTo(0, length);
  shape.bezierCurveTo(width * 0.28, length * 0.83, width * 0.75, length * 0.34, width * 0.5, 0);
  shape.lineTo(width * 0.32, -tail * 0.25);
  shape.lineTo(width * 0.14, -tail);
  shape.lineTo(-width * 0.14, -tail);
  shape.lineTo(-width * 0.32, -tail * 0.25);
  shape.lineTo(-width * 0.5, 0);
  shape.bezierCurveTo(-width * 0.75, length * 0.34, -width * 0.28, length * 0.83, 0, length);
  return extrudeFlat(shape, depth, gold, 0.0035, 32);
}

function createLumeInlay(length, width, y) {
  const inlay = new THREE.Mesh(
    new RoundedBoxGeometry(width * 0.5, 0.004, length * 0.52, 3, width * 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xe7ddbf,
      roughness: 0.42,
      metalness: 0.02,
      emissive: 0x5c4e31,
      emissiveIntensity: 0.18,
    }),
  );
  inlay.position.set(0, y, -length * 0.55);
  return inlay;
}

const hourHand = new THREE.Group();
const hourMesh = createHandGeometry(0.92, 0.115, 0.14, 0.022);
hourMesh.position.y = 0.546;
hourHand.add(hourMesh);
hourMesh.add(createLumeInlay(0.92, 0.115, 0.014));
handsGroup.add(hourHand);

const minuteHand = new THREE.Group();
const minuteMesh = createHandGeometry(1.37, 0.078, 0.16, 0.018);
minuteMesh.position.y = 0.573;
minuteHand.add(minuteMesh);
minuteMesh.add(createLumeInlay(1.37, 0.078, 0.012));
handsGroup.add(minuteHand);

const secondHand = new THREE.Group();
const secondMesh = createHandGeometry(1.53, 0.026, 0.24, 0.011);
secondMesh.material = roseGold;
secondMesh.position.y = 0.596;
secondHand.add(secondMesh);
handsGroup.add(secondHand);

const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.065, 32), gold);
centerCap.position.y = 0.615;
centerCap.castShadow = true;
handsGroup.add(centerCap);

const centerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.078, 20), steel);
centerPin.position.y = 0.636;
handsGroup.add(centerPin);

const bezelGroup = new THREE.Group();
watchRoot.add(bezelGroup);

const bezel = extrudeFlat(makeRingShape(2.09, 1.91), 0.16, gold, 0.05, 128);
bezel.position.y = 0.46;
bezelGroup.add(bezel);

const bezelInner = extrudeFlat(makeRingShape(1.9, 1.82), 0.2, plateMaterialDark, 0.008, 96);
bezelInner.position.y = 0.46;
bezelGroup.add(bezelInner);

const bezelEdge = new THREE.Mesh(new THREE.TorusGeometry(2.035, 0.028, 8, 160), steel);
bezelEdge.rotation.x = Math.PI / 2;
bezelEdge.position.y = 0.55;
bezelGroup.add(bezelEdge);

const crystal = new THREE.Mesh(
  new THREE.SphereGeometry(6, 96, 20, 0, Math.PI * 2, 0, 0.3125),
  crystalMaterial,
);
crystal.position.y = 0.55 - 6 * Math.cos(0.3125);
crystal.renderOrder = 4;
bezelGroup.add(crystal);

const crystalEdge = new THREE.Mesh(new THREE.TorusGeometry(1.845, 0.009, 5, 128), new THREE.MeshBasicMaterial({
  color: 0xcfdedb,
  transparent: true,
  opacity: 0.34,
}));
crystalEdge.rotation.x = Math.PI / 2;
crystalEdge.position.y = 0.555;
bezelGroup.add(crystalEdge);

const layers = [
  { group: movementGroup, offset: 0.32 },
  { group: bridgeGroup, offset: 0.8 },
  { group: dialGroup, offset: 1.25 },
  { group: handsGroup, offset: 1.52 },
  { group: bezelGroup, offset: 1.86 },
];
for (const layer of layers) layer.baseY = layer.group.position.y;

function createToolGroup() {
  const tools = new THREE.Group();

  const tweezer = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.035, 0.065, 5, 0.026), steel);
    arm.position.set(0, 0.03 + side * 0.008, side * 0.045);
    arm.rotation.y = side * -0.035;
    arm.castShadow = true;
    tweezer.add(arm);
  }
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.11, 18), darkSteel);
  hinge.rotation.x = Math.PI / 2;
  hinge.position.x = -0.71;
  tweezer.add(hinge);
  tweezer.position.set(-3.42, 0.045, 0.98);
  tweezer.rotation.y = 0.46;
  tools.add(tweezer);

  const loupe = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 12, 48), darkSteel);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  loupe.add(rim);

  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.25, 48), crystalMaterial);
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0.012;
  loupe.add(glass);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.58, 24), warmGold);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.55;
  handle.castShadow = true;
  loupe.add(handle);

  loupe.position.set(3.45, 0.1, 1.15);
  loupe.rotation.y = -0.5;
  tools.add(loupe);

  const screwPositions = [
    [-2.58, -1.1, 0.35],
    [2.42, -1.67, -0.2],
    [2.2, 1.95, 0.7],
    [-2.2, 1.9, -0.3],
  ];
  for (const [x, z, rotation] of screwPositions) {
    const screw = createScrew(0.075, gold);
    screw.position.set(x, 0.035, z);
    screw.rotation.y = rotation;
    tools.add(screw);
  }

  return tools;
}

scene.add(createToolGroup());

function createDust() {
  const count = window.innerWidth < 760 ? 90 : 180;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = 0.15 + Math.random() * 4.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf0d4a8,
    size: 0.016,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

const dust = createDust();
scene.add(dust);

const balanceAnchor = new THREE.Object3D();
balanceAnchor.position.set(-0.76, 0.42, -0.63);
movementGroup.add(balanceAnchor);

const barrelAnchor = new THREE.Object3D();
barrelAnchor.position.set(-0.55, 0.38, 0.55);
movementGroup.add(barrelAnchor);

let targetExplode = 0.52;
let currentExplode = 0;
let elapsed = 0;
let introStarted = false;

ui.range.value = String(Math.round(targetExplode * 100));
syncAssemblyUI();

function syncAssemblyUI() {
  const percent = Math.round(targetExplode * 100);
  ui.range.value = String(percent);
  ui.range.style.setProperty('--fill', `${percent}%`);
  ui.value.innerHTML = `${percent}<small>%</small>`;
  ui.label.textContent = targetExplode > 0.02 ? 'Reassemble' : 'Take apart';
  if (targetExplode < 0.02) ui.state.textContent = 'Fully assembled';
  else if (targetExplode > 0.97) ui.state.textContent = 'Fully exploded';
  else ui.state.textContent = 'Exploded view';
}

ui.range.addEventListener('input', () => {
  targetExplode = Number(ui.range.value) / 100;
  syncAssemblyUI();
});

ui.toggle.addEventListener('click', () => {
  targetExplode = targetExplode > 0.02 ? 0 : 1;
  syncAssemblyUI();
});

function updateLayerPositions(explode) {
  for (const layer of layers) {
    layer.group.position.y = layer.baseY + layer.offset * explode;
  }
}

const handAngles = {
  hour: (10 + 10 / 60) / 12 * Math.PI * 2,
  minute: (10 / 60) * Math.PI * 2,
  second: (32 / 60) * Math.PI * 2,
};

function updateClockHands(dt) {
  handAngles.second += dt * Math.PI * 2 / 60;
  handAngles.minute += dt * Math.PI * 2 / 3600;
  handAngles.hour += dt * Math.PI * 2 / 43200;

  hourHand.rotation.y = -handAngles.hour;
  minuteHand.rotation.y = -handAngles.minute;
  secondHand.rotation.y = -handAngles.second;
}

const projected = new THREE.Vector3();
let calloutsVisible = false;

function updateCallouts(explode) {
  const shouldShow = explode > 0.23 && window.innerWidth > 760;
  if (shouldShow !== calloutsVisible) {
    calloutsVisible = shouldShow;
    ui.callouts.classList.toggle('is-visible', shouldShow);
  }
  if (!shouldShow) return;

  const place = (anchor, element, alignLeft) => {
    anchor.getWorldPosition(projected);
    projected.project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const clampedX = Math.min(Math.max(x, 85), window.innerWidth - 85);
    const clampedY = Math.min(Math.max(y, 95), window.innerHeight - 140);
    const xShift = alignLeft ? '-100%' : '0%';
    element.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(${xShift}, -50%)`;
    element.style.opacity = projected.z < 1 ? '1' : '0';
  };

  place(balanceAnchor, ui.balanceCallout, false);
  place(barrelAnchor, ui.barrelCallout, true);
}

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (!prefersReducedMotion && elapsed > 0.38) {
    if (!introStarted) introStarted = true;
    const easing = 1 - Math.exp(-dt * 3.0);
    currentExplode += (targetExplode - currentExplode) * easing;
    if (Math.abs(targetExplode - currentExplode) < 0.0002) currentExplode = targetExplode;
  } else if (prefersReducedMotion && elapsed > 0.15) {
    currentExplode = targetExplode;
  }

  updateLayerPositions(currentExplode);

  if (!prefersReducedMotion) {
    for (const rotor of gearRotors) {
      rotor.group.rotation.y += rotor.speed * dt;
    }
    balanceWheel.rotation.y = Math.sin(elapsed * Math.PI * 8) * 0.69;
    palletFork.rotation.y = -0.62 + Math.sin(elapsed * Math.PI * 8 + 0.4) * 0.045;
    updateClockHands(dt);
    dust.rotation.y += dt * 0.0026;
  }

  updateCallouts(currentExplode);
  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  layoutCamera(true);
  keyLight.shadow.mapSize.set(width < 760 ? 1024 : 2048, width < 760 ? 1024 : 2048);
  if (keyLight.shadow.map) {
    keyLight.shadow.map.dispose();
    keyLight.shadow.map = null;
  }
}

window.addEventListener('resize', onResize);

renderer.setAnimationLoop(animate);

requestAnimationFrame(() => {
  loader.classList.add('is-hidden');
});
