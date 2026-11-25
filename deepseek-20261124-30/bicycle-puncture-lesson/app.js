import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const steps = [
  {
    short: 'Deflate',
    title: 'Let the air out',
    text: 'Press the valve core to release all the air. A soft tire makes the bead much easier to work free.',
    tip: 'Presta valve? Unscrew the small nut, then press the core.',
    tool: 'Valve core tool',
    pressure: 0,
    status: 'Valve open · air released',
    tone: 'warning'
  },
  {
    short: 'Unseat',
    title: 'Free one bead',
    text: 'Slide a tire lever under one bead. Hook it on a spoke, then ease that section of bead over the rim.',
    tip: 'Work one side only. Leave the other bead seated.',
    tool: 'Tire levers',
    pressure: 0,
    status: 'One bead lifted from the rim',
    tone: 'warning'
  },
  {
    short: 'Remove',
    title: 'Ease the tube out',
    text: 'Reach in opposite the valve and draw the tube out slowly. Keep the valve stem clear of the rim.',
    tip: 'Never use a screwdriver — it can pinch or puncture the tube.',
    tool: 'Your hands',
    pressure: 0,
    status: 'Tube eased clear of the tire',
    tone: 'neutral'
  },
  {
    short: 'Locate',
    title: 'Find the puncture',
    text: 'Inflate the tube slightly and listen, feel, or look for escaping air. A soapy water test makes the leak obvious.',
    tip: 'Match the puncture to the tire so you can check for a thorn.',
    tool: 'Soapy water',
    pressure: 8,
    status: 'Puncture found · bubbles rising',
    tone: 'warning'
  },
  {
    short: 'Patch',
    title: 'Clean, glue, patch',
    text: 'Roughen the area, apply a thin layer of rubber cement, let it tack, then press on the patch.',
    tip: 'Hold pressure for a minute before peeling the backing.',
    tool: 'Patch kit',
    pressure: 8,
    status: 'Patch pressed over the puncture',
    tone: 'neutral'
  },
  {
    short: 'Rebuild',
    title: 'Refit and inflate',
    text: 'Tuck the tube in, seat both beads by hand, and inflate in small stages. Check that the bead line stays even.',
    tip: 'If the tire bulges, deflate and reseat before riding.',
    tool: 'Floor pump',
    pressure: 45,
    status: 'Bead seated · ready to roll',
    tone: 'success'
  }
];

const practiceTargets = [
  {
    id: 'inner-tube',
    name: 'inner tube',
    copy: 'Tap the soft ring that holds the air inside the tire.'
  },
  {
    id: 'valve',
    name: 'valve',
    copy: 'Tap the small stem that lets air in and out of the tube.'
  },
  {
    id: 'rim',
    name: 'rim',
    copy: 'Tap the rigid metal hoop that the tire seats onto.'
  }
];

const partOptions = [
  { id: 'tire', name: 'Tire' },
  { id: 'inner-tube', name: 'Inner tube' },
  { id: 'rim', name: 'Rim' },
  { id: 'spokes', name: 'Spokes' },
  { id: 'hub', name: 'Hub' },
  { id: 'valve', name: 'Valve' }
];

const partInfo = {
  tire: 'The tire is the thick outer rubber ring that carries the tread.',
  'inner-tube': 'The inner tube is the soft ring inside the tire. It is the part that holds air.',
  rim: 'The rim is the rigid metal hoop that the tire and tube sit against.',
  spokes: 'The spokes are the thin tensioned wires linking the hub to the rim.',
  hub: 'The hub is the central barrel that spins on the axle.',
  valve: 'The valve is the small stem that lets air in and out of the tube.'
};

const partNames = {
  tire: 'tire',
  'inner-tube': 'inner tube',
  rim: 'rim',
  spokes: 'spokes',
  hub: 'hub',
  valve: 'valve'
};

const repairOrder = [
  { id: 'deflate', name: 'Deflate the tube', short: 'Let the air out' },
  { id: 'unseat', name: 'Unseat one bead', short: 'Free the tire bead' },
  { id: 'remove', name: 'Remove the tube', short: 'Ease it out of the tire' },
  { id: 'locate', name: 'Locate the puncture', short: 'Listen, feel, or use water' },
  { id: 'patch', name: 'Patch the tube', short: 'Clean, glue, press' },
  { id: 'reassemble', name: 'Reassemble and inflate', short: 'Seat the bead, add air' }
];

const orderReasons = {
  deflate: 'release the air first — a firm tire is much harder to unseat.',
  unseat: 'free one bead before reaching in for the tube.',
  remove: 'the tube comes out only after one bead is lifted.',
  locate: 'find the leak before you cover it with a patch.',
  patch: 'patch the tube before you refit it.',
  reassemble: 'reassembly is the final step.'
};

const dom = {
  sceneRoot: document.getElementById('sceneRoot'),
  sceneShell: document.getElementById('sceneShell'),
  sceneLoader: document.getElementById('sceneLoader'),
  spinBtn: document.getElementById('spinBtn'),
  spinText: document.getElementById('spinText'),
  labelBtn: document.getElementById('labelBtn'),
  resetBtn: document.getElementById('resetBtn'),
  stepTrack: document.getElementById('stepTrack'),
  stepNumber: document.getElementById('stepNumber'),
  stepTitle: document.getElementById('stepTitle'),
  stepText: document.getElementById('stepText'),
  stepTip: document.getElementById('stepTip'),
  toolValue: document.getElementById('toolValue'),
  pressureChip: document.getElementById('pressureChip'),
  pressureValue: document.getElementById('pressureValue'),
  pressureNeedle: document.getElementById('pressureNeedle'),
  sceneStatusText: document.getElementById('sceneStatusText'),
  statusPressure: document.getElementById('statusPressure'),
  statusLight: document.getElementById('statusLight'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  nextLabel: document.getElementById('nextLabel'),
  lessonPanel: document.getElementById('lessonPanel'),
  practicePanel: document.getElementById('practicePanel'),
  lessonControls: document.getElementById('lessonControls'),
  guidePanel: document.getElementById('guidePanel'),
  headerPractice: document.getElementById('headerPractice'),
  orbitHint: document.getElementById('orbitHint'),
  toast: document.getElementById('toast'),
  keyboardHint: document.querySelector('.keyboard-hint')
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const projected = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);
const tempVector = new THREE.Vector3();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-hidden', 'true');
dom.sceneRoot.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
dom.sceneRoot.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.72;
controls.minDistance = 6.8;
controls.maxDistance = 15.5;
controls.minPolarAngle = 0.72;
controls.maxPolarAngle = 1.96;
controls.autoRotate = !prefersReducedMotion;
controls.autoRotateSpeed = 0.42;

const keyLight = new THREE.DirectionalLight(0xfff0d7, 3.6);
keyLight.position.set(4.6, 7.2, 8.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -5.2;
keyLight.shadow.camera.right = 5.2;
keyLight.shadow.camera.top = 5.4;
keyLight.shadow.camera.bottom = -4.4;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 18;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xbfd8dc, 1.45);
fillLight.position.set(-6.5, 2.2, 5.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffb27d, 2.1);
rimLight.position.set(-2.5, -4.5, 5.5);
scene.add(rimLight);

scene.add(new THREE.HemisphereLight(0xfffbf1, 0x5b4b39, 1.4));

const materials = {
  tire: new THREE.MeshStandardMaterial({ color: 0x252522, roughness: 0.78, metalness: 0.04 }),
  tireTread: new THREE.MeshStandardMaterial({ color: 0x35352f, roughness: 0.7, metalness: 0.05 }),
  tireCut: new THREE.MeshStandardMaterial({ color: 0x44433c, roughness: 0.85, side: THREE.DoubleSide }),
  tube: new THREE.MeshStandardMaterial({ color: 0xc55e38, roughness: 0.52, metalness: 0.03, emissive: 0x2a0d05, emissiveIntensity: 0.34 }),
  tubeCut: new THREE.MeshStandardMaterial({ color: 0xdb7249, roughness: 0.5, side: THREE.DoubleSide }),
  rim: new THREE.MeshStandardMaterial({ color: 0xd7d4ca, roughness: 0.24, metalness: 0.92 }),
  rimDark: new THREE.MeshStandardMaterial({ color: 0x8d8d86, roughness: 0.34, metalness: 0.9, side: THREE.DoubleSide }),
  spoke: new THREE.MeshStandardMaterial({ color: 0xb9bab3, roughness: 0.28, metalness: 0.95 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xc9c5b8, roughness: 0.27, metalness: 0.9 }),
  hubDark: new THREE.MeshStandardMaterial({ color: 0x676962, roughness: 0.36, metalness: 0.88 }),
  valve: new THREE.MeshStandardMaterial({ color: 0xc79a51, roughness: 0.3, metalness: 0.82 }),
  valveCap: new THREE.MeshStandardMaterial({ color: 0x242724, roughness: 0.45, metalness: 0.2 }),
  lever: new THREE.MeshStandardMaterial({ color: 0xe8a43b, roughness: 0.32, metalness: 0.05 }),
  leverTip: new THREE.MeshStandardMaterial({ color: 0x4d4d45, roughness: 0.38, metalness: 0.72 }),
  platform: new THREE.MeshStandardMaterial({ color: 0xe9e2d3, roughness: 0.88, metalness: 0 }),
  platformEdge: new THREE.MeshStandardMaterial({ color: 0xcec3ad, roughness: 0.8, metalness: 0.02 }),
  patch: new THREE.MeshStandardMaterial({ color: 0x30302c, roughness: 0.7, metalness: 0.04 }),
  patchEdge: new THREE.MeshBasicMaterial({ color: 0xe68b50, side: THREE.DoubleSide }),
  reward: new THREE.MeshBasicMaterial({ color: 0x55a17d, transparent: true, opacity: 0, depthWrite: false })
};

materials.tire.flatShading = false;

function markPart(root, part) {
  root.traverse((object) => {
    object.userData.part = part;
  });
}

function makeMesh(geometry, material, part, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  if (part) mesh.userData.part = part;
  return mesh;
}

function orientBetween(mesh, start, end) {
  tempVector.copy(end).sub(start);
  const length = tempVector.length();
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.y = length;
  mesh.quaternion.setFromUnitVectors(yAxis, tempVector.normalize());
}

const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.12, 3.24, 0.12, 96), materials.platform);
platform.position.y = -2.55;
platform.receiveShadow = true;
scene.add(platform);

const platformEdge = new THREE.Mesh(new THREE.RingGeometry(3.02, 3.12, 96), new THREE.MeshBasicMaterial({ color: 0x7f7562, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
platformEdge.position.y = -2.485;
platformEdge.rotation.x = -Math.PI / 2;
scene.add(platformEdge);

const wheelRoot = new THREE.Group();
wheelRoot.position.y = 0.02;
scene.add(wheelRoot);

const gapStart = 0.34;
const gapEnd = 1.34;
const tireArc = Math.PI * 2 - (gapEnd - gapStart);

const tireGroup = new THREE.Group();
wheelRoot.add(tireGroup);

const tire = makeMesh(new THREE.TorusGeometry(2.18, 0.33, 24, 200, tireArc), materials.tire);
tire.rotation.z = gapEnd;
tireGroup.add(tire);

for (let i = 0; i < 3; i += 1) {
  const tread = makeMesh(new THREE.TorusGeometry(2.43, 0.028, 8, 200, tireArc), materials.tireTread);
  tread.rotation.z = gapEnd;
  tread.position.z = (i - 1) * 0.13;
  tireGroup.add(tread);
}

const cutRingGeometry = new THREE.RingGeometry(0.185, 0.335, 36);
const cutTubeGeometry = new THREE.CircleGeometry(0.176, 36);
const cutHoleGeometry = new THREE.CircleGeometry(0.042, 24);
const tangent = new THREE.Vector3();
const cutNormal = new THREE.Vector3();

function addCutSection(angle) {
  const center = new THREE.Vector3(Math.cos(angle) * 2.18, Math.sin(angle) * 2.18, 0);
  tangent.set(-Math.sin(angle), Math.cos(angle), 0).normalize();
  const group = new THREE.Group();
  group.position.copy(center);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

  const outer = makeMesh(cutRingGeometry, materials.tireCut, 'tire');
  const tubeSection = makeMesh(cutTubeGeometry, materials.tubeCut, 'inner-tube');
  tubeSection.position.z = 0.003;
  const hole = makeMesh(cutHoleGeometry, materials.tireCut, 'inner-tube');
  hole.position.z = 0.006;

  group.add(outer, tubeSection, hole);
  tireGroup.add(group);
}

addCutSection(gapStart);
addCutSection(gapEnd);
markPart(tireGroup, 'tire');

const beadLift = new THREE.Group();
const beadMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b3b35,
  roughness: 0.68,
  metalness: 0.04,
  transparent: true,
  opacity: 0
});
const beadArc = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.145, 16, 44, 0.58), beadMaterial);
beadArc.rotation.z = -0.86;
beadArc.castShadow = true;
beadLift.add(beadArc);
wheelRoot.add(beadLift);

const rimGroup = new THREE.Group();
const rim = makeMesh(new THREE.TorusGeometry(1.84, 0.088, 20, 160), materials.rim, 'rim');
rimGroup.add(rim);

const rimShell = makeMesh(new THREE.CylinderGeometry(1.865, 1.865, 0.19, 120, 1, true), materials.rimDark, 'rim');
rimShell.rotation.x = Math.PI / 2;
rimGroup.add(rimShell);

for (const z of [-0.105, 0.105]) {
  const flange = makeMesh(new THREE.TorusGeometry(1.86, 0.025, 8, 160), materials.rim, 'rim');
  flange.position.z = z;
  rimGroup.add(flange);
}
wheelRoot.add(rimGroup);

const spokeGroup = new THREE.Group();
const spokeGeometry = new THREE.CylinderGeometry(0.009, 0.009, 1, 6, 1);
const spokeCount = 32;
for (let i = 0; i < spokeCount; i += 1) {
  const side = i % 2 === 0 ? 1 : -1;
  const hubAngle = (i / spokeCount) * Math.PI * 2;
  const rimAngle = hubAngle + (side > 0 ? 0.16 : -0.16);
  const hubRadius = 0.285;
  const rimRadius = 1.81;
  const start = new THREE.Vector3(Math.cos(hubAngle) * hubRadius, Math.sin(hubAngle) * hubRadius, side * 0.115);
  const end = new THREE.Vector3(Math.cos(rimAngle) * rimRadius, Math.sin(rimAngle) * rimRadius, side * 0.012);
  const spoke = makeMesh(spokeGeometry, materials.spoke, 'spokes');
  orientBetween(spoke, start, end);
  spokeGroup.add(spoke);
}
markPart(spokeGroup, 'spokes');
wheelRoot.add(spokeGroup);

const hubGroup = new THREE.Group();
const hubBarrel = makeMesh(new THREE.CylinderGeometry(0.235, 0.235, 0.42, 40), materials.hub, 'hub');
hubBarrel.rotation.x = Math.PI / 2;
hubGroup.add(hubBarrel);

for (const z of [-0.145, 0.145]) {
  const hubFlange = makeMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.038, 40), materials.hub, 'hub');
  hubFlange.rotation.x = Math.PI / 2;
  hubFlange.position.z = z;
  hubGroup.add(hubFlange);

  const hubRing = makeMesh(new THREE.TorusGeometry(0.29, 0.022, 8, 40), materials.hubDark, 'hub');
  hubRing.position.z = z + Math.sign(z) * 0.022;
  hubGroup.add(hubRing);
}

const axle = makeMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 16), materials.hubDark, 'hub');
axle.rotation.x = Math.PI / 2;
hubGroup.add(axle);

const hubCap = makeMesh(new THREE.CylinderGeometry(0.082, 0.082, 0.07, 18), materials.rim, 'hub');
hubCap.rotation.x = Math.PI / 2;
hubCap.position.z = 0.465;
hubGroup.add(hubCap);
markPart(hubGroup, 'hub');
wheelRoot.add(hubGroup);

const tubeGroup = new THREE.Group();
wheelRoot.add(tubeGroup);

const tube = makeMesh(new THREE.TorusGeometry(2.02, 0.195, 22, 200), materials.tube, 'inner-tube');
tubeGroup.add(tube);

const tubeSeam = makeMesh(new THREE.TorusGeometry(2.02, 0.012, 6, 200), new THREE.MeshStandardMaterial({ color: 0x8f3d23, roughness: 0.5 }), 'inner-tube', false);
tubeSeam.position.z = 0.195;
tubeGroup.add(tubeSeam);

const valveAngle = -1.08;
const valveGroup = new THREE.Group();
valveGroup.position.set(Math.cos(valveAngle) * 1.835, Math.sin(valveAngle) * 1.835, 0.075);
valveGroup.rotation.z = valveAngle - Math.PI / 2;
tubeGroup.add(valveGroup);

const valveStem = makeMesh(new THREE.CylinderGeometry(0.038, 0.042, 0.31, 14), materials.valve, 'valve');
valveStem.position.y = -0.165;
valveGroup.add(valveStem);

const valveNut = makeMesh(new THREE.CylinderGeometry(0.064, 0.064, 0.055, 6), materials.valve, 'valve');
valveNut.position.y = -0.012;
valveGroup.add(valveNut);

const valveRing = makeMesh(new THREE.TorusGeometry(0.048, 0.009, 6, 18), materials.valve, 'valve', false);
valveRing.rotation.x = Math.PI / 2;
valveRing.position.y = -0.295;
valveGroup.add(valveRing);

const valveCap = makeMesh(new THREE.CylinderGeometry(0.052, 0.052, 0.09, 16), materials.valveCap, 'valve');
valveCap.position.y = -0.365;
valveGroup.add(valveCap);
const valveCapBaseY = valveCap.position.y;
markPart(valveGroup, 'valve');

const airGroup = new THREE.Group();
airGroup.position.y = -0.39;
valveGroup.add(airGroup);
const airPuffs = [];
for (let i = 0; i < 16; i += 1) {
  const puffMaterial = new THREE.MeshBasicMaterial({ color: 0xfffdf5, transparent: true, opacity: 0, depthWrite: false });
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), puffMaterial);
  puff.userData.phase = Math.random();
  puff.userData.speed = 0.55 + Math.random() * 0.7;
  puff.userData.spread = 0.03 + Math.random() * 0.09;
  puff.userData.angle = Math.random() * Math.PI * 2;
  airGroup.add(puff);
  airPuffs.push(puff);
}

const punctureAngle = -0.72;
const puncturePosition = new THREE.Vector3(Math.cos(punctureAngle) * 2.02, Math.sin(punctureAngle) * 2.02, 0.195);
const punctureGroup = new THREE.Group();
punctureGroup.position.copy(puncturePosition);
tubeGroup.add(punctureGroup);

const punctureMaterial = new THREE.MeshBasicMaterial({ color: 0xef6d37, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
const punctureRing = makeMesh(new THREE.RingGeometry(0.095, 0.145, 32), punctureMaterial, 'inner-tube', false);
punctureGroup.add(punctureRing);

const punctureCore = makeMesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: 0x39140b, side: THREE.DoubleSide }), 'inner-tube', false);
punctureCore.position.z = 0.002;
punctureGroup.add(punctureCore);

const bubbleGroup = new THREE.Group();
punctureGroup.add(bubbleGroup);
const bubbles = [];
for (let i = 0; i < 12; i += 1) {
  const bubbleMaterial = new THREE.MeshBasicMaterial({ color: 0xf4fbf5, transparent: true, opacity: 0, depthWrite: false });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.023, 8, 8), bubbleMaterial);
  bubble.userData.phase = Math.random();
  bubble.userData.speed = 0.5 + Math.random() * 0.65;
  bubble.userData.offset = new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.13, 0.02);
  bubbleGroup.add(bubble);
  bubbles.push(bubble);
}

const patchGroup = new THREE.Group();
patchGroup.position.copy(puncturePosition).add(new THREE.Vector3(0, 0, 0.012));
tubeGroup.add(patchGroup);

const patchBody = makeMesh(new THREE.CircleGeometry(0.17, 36), materials.patch, 'inner-tube', false);
patchGroup.add(patchBody);

const patchRing = makeMesh(new THREE.RingGeometry(0.157, 0.19, 36), materials.patchEdge, 'inner-tube', false);
patchRing.position.z = 0.002;
patchGroup.add(patchRing);

const patchStripe = makeMesh(new THREE.PlaneGeometry(0.22, 0.032), new THREE.MeshBasicMaterial({ color: 0xd7d0bf, side: THREE.DoubleSide }), 'inner-tube', false);
patchStripe.position.z = 0.004;
patchStripe.rotation.z = -0.32;
patchGroup.add(patchStripe);
markPart(tubeGroup, 'inner-tube');
markPart(valveGroup, 'valve');

const leverGroup = new THREE.Group();
const leverShaft = makeMesh(new THREE.CapsuleGeometry(0.046, 0.67, 5, 10), materials.lever, null);
leverShaft.position.y = 0.38;
leverGroup.add(leverShaft);
const leverHook = makeMesh(new THREE.TorusGeometry(0.13, 0.038, 8, 22, Math.PI * 1.2), materials.leverTip, null);
leverHook.rotation.z = 0.18;
leverHook.position.y = -0.06;
leverGroup.add(leverHook);
leverGroup.position.set(2.14, -1.15, 0.39);
leverGroup.rotation.z = -0.84;
wheelRoot.add(leverGroup);

const successRing = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.011, 8, 200), materials.reward);
successRing.castShadow = false;
wheelRoot.add(successRing);

const labelEntries = [];
const labelAnchors = {};

function createLabel(part, name, parent, position, extraClass = '') {
  const element = document.createElement('div');
  element.className = `part-label ${extraClass}`.trim();
  element.dataset.part = part;
  element.innerHTML = `<span class="label-pin"></span><span class="label-leader"></span><span class="label-bubble"><span class="label-name">${name}</span></span>`;
  const label = new CSS2DObject(element);
  label.position.copy(position);
  label.center.set(0, 0);
  parent.add(label);
  const entry = { part, name, object: label, element, sideLeft: false };
  labelEntries.push(entry);
  labelAnchors[part] = label;
  return entry;
}

createLabel('tire', 'Tire', wheelRoot, new THREE.Vector3(Math.cos(2.42) * 2.18, Math.sin(2.42) * 2.18, 0.23));
createLabel('inner-tube', 'Inner tube', tubeGroup, new THREE.Vector3(Math.cos(0.84) * 2.02, Math.sin(0.84) * 2.02, 0.31), 'is-layer');
createLabel('rim', 'Rim', wheelRoot, new THREE.Vector3(Math.cos(3.82) * 1.84, Math.sin(3.82) * 1.84, 0.13));
createLabel('spokes', 'Spokes', wheelRoot, new THREE.Vector3(Math.cos(4.46) * 1.17, Math.sin(4.46) * 1.17, 0.08));
createLabel('hub', 'Hub', wheelRoot, new THREE.Vector3(0, 0, 0.32));
createLabel('valve', 'Valve', valveGroup, new THREE.Vector3(0, -0.44, 0.06));

markPart(tireGroup, 'tire');

const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0x55a17d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.31, 40), pulseMaterial);
pulseRing.renderOrder = 50;
pulseRing.visible = false;
scene.add(pulseRing);
let pulseStart = -1;

const model = {
  tubeX: 0,
  tubeY: 0,
  tubeZ: 0,
  tubeScale: 1,
  tubeRot: 0,
  bead: 0,
  lever: 0,
  puncture: 0,
  patch: 0,
  bubble: 0,
  cap: 0,
  air: 0,
  success: 0
};

let targetModel = makeModelTarget(0);
let currentStep = 0;
let labelsVisible = true;
let temporaryLabelsUntil = 0;
let labelsBeforePractice = true;
let spinPaused = prefersReducedMotion;
let userMovedView = false;
let toastTimer = 0;
let practiceActive = false;
let practicePhase = 'parts';
let practicePartIndex = 0;
let partMistakes = 0;
let orderMistakes = 0;
let practiceLocked = false;
let practiceTimer = 0;
let orderItems = [];
let placedOrder = [];
let feedbackState = null;
let savedStep = 0;
let pointerDown = null;
let firstFrameRendered = false;

function makeModelTarget(index) {
  const base = {
    tubeX: 0,
    tubeY: 0,
    tubeZ: 0,
    tubeScale: 1,
    tubeRot: 0,
    bead: 0,
    lever: 0,
    puncture: 0,
    patch: 0,
    bubble: 0,
    cap: 0,
    air: 0,
    success: 0
  };

  if (index === 0) {
    return { ...base, cap: 1, air: 1 };
  }

  if (index === 1) {
    return { ...base, cap: 1, bead: 1, lever: 1 };
  }

  if (index === 2) {
    return { ...base, cap: 1, bead: 1, tubeX: -0.82, tubeY: -0.27, tubeZ: 1.12, tubeScale: 0.87, tubeRot: 0.2 };
  }

  if (index === 3) {
    return { ...base, cap: 1, bead: 1, tubeX: -0.82, tubeY: -0.27, tubeZ: 1.12, tubeScale: 0.87, tubeRot: 0.2, puncture: 1, bubble: 1 };
  }

  if (index === 4) {
    return { ...base, cap: 1, bead: 1, tubeX: -0.82, tubeY: -0.27, tubeZ: 1.12, tubeScale: 0.87, tubeRot: 0.2, puncture: 0.28, patch: 1 };
  }

  return { ...base, cap: 0, tubeX: 0, tubeY: 0, tubeZ: 0, tubeScale: 1, tubeRot: 0, puncture: 0.22, patch: 1, success: 1 };
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function padStep(number) {
  return String(number + 1).padStart(2, '0');
}

function renderStepTrack() {
  dom.stepTrack.innerHTML = steps.map((step, index) => `
    <button class="step-jump" type="button" data-step="${index}" aria-label="Step ${index + 1}: ${step.short}">
      <span class="jump-num">${padStep(index)}</span>
      <span class="jump-name">${step.short}</span>
    </button>
  `).join('');

  dom.stepTrack.querySelectorAll('.step-jump').forEach((button) => {
    button.addEventListener('click', () => {
      goToStep(Number(button.dataset.step));
    });
  });
}

function updateStepTrack() {
  dom.stepTrack.querySelectorAll('.step-jump').forEach((button, index) => {
    button.classList.toggle('is-active', index === currentStep);
    button.classList.toggle('is-past', index < currentStep);
    if (index === currentStep) {
      button.setAttribute('aria-current', 'step');
    } else {
      button.removeAttribute('aria-current');
    }
  });
}

function setPressure(pressure) {
  dom.pressureValue.textContent = `${pressure} PSI`;
  dom.statusPressure.textContent = `${pressure} PSI`;
  const angle = -125 + (Math.min(pressure, 80) / 80) * 210;
  dom.pressureNeedle.style.transform = `rotate(${angle}deg)`;
}

function setStatus(text, pressure, tone) {
  dom.sceneStatusText.textContent = text;
  dom.statusPressure.textContent = pressure;
  dom.statusLight.classList.toggle('is-warning', tone === 'warning');
  dom.statusLight.classList.toggle('is-success', tone === 'success');
}

function updateStepUI() {
  const step = steps[currentStep];
  dom.stepNumber.textContent = padStep(currentStep);
  dom.stepTitle.textContent = step.title;
  dom.stepText.textContent = step.text;
  dom.stepTip.textContent = step.tip;
  dom.toolValue.textContent = step.tool;
  dom.prevBtn.disabled = currentStep === 0;
  dom.nextLabel.textContent = currentStep === steps.length - 1 ? 'Practice round' : 'Next step';
  setPressure(step.pressure);
  setStatus(step.status, `${step.pressure} PSI`, step.tone);
  updateStepTrack();
}

function goToStep(index) {
  const nextIndex = THREE.MathUtils.clamp(index, 0, steps.length - 1);
  if (practiceActive) {
    leavePractice(false);
  }
  currentStep = nextIndex;
  targetModel = makeModelTarget(currentStep);
  updateStepUI();
  temporaryLabelsUntil = 0;
  updateLabelVisibility();
}

function updateSpinUI() {
  dom.spinBtn.classList.toggle('is-paused', spinPaused);
  dom.spinBtn.setAttribute('aria-pressed', String(spinPaused));
  dom.spinText.textContent = spinPaused ? 'Spin' : 'Pause';
  dom.spinBtn.title = spinPaused ? 'Resume wheel rotation' : 'Pause wheel rotation';
}

function updateLabelButton() {
  dom.labelBtn.setAttribute('aria-pressed', String(labelsVisible));
  dom.labelBtn.title = labelsVisible ? 'Hide part labels' : 'Show part labels';
}

function updateLabelVisibility() {
  const temporary = practiceActive && practicePhase === 'parts' && performance.now() < temporaryLabelsUntil;
  const visible = labelsVisible || temporary;
  labelEntries.forEach((entry) => {
    entry.object.visible = visible;
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 2600);
}

function defaultCameraPosition() {
  const rect = dom.sceneRoot.getBoundingClientRect();
  const aspect = Math.max(rect.width / Math.max(rect.height, 1), 0.55);
  const distance = aspect < 0.9 ? 11.7 : 10.45;
  return new THREE.Vector3(0.31, 0.2, 0.93).normalize().multiplyScalar(distance);
}

function resize() {
  const rect = dom.sceneRoot.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  renderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (!userMovedView) {
    camera.position.copy(defaultCameraPosition());
    controls.target.set(0, 0.02, 0);
    controls.update();
  }
}

function resetView(announce = true) {
  userMovedView = false;
  camera.position.copy(defaultCameraPosition());
  controls.target.set(0, 0.02, 0);
  controls.update();
  if (announce) showToast('View reset to the cutaway.');
}

function cameraFacingLabels() {
  const width = dom.sceneRoot.clientWidth;
  const height = dom.sceneRoot.clientHeight;
  if (!width || !height) return;
  labelEntries.forEach((entry) => {
    if (!entry.object.visible) return;
    entry.object.getWorldPosition(projected);
    projected.project(camera);
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const shouldLeft = screenX > width * 0.56;
    if (shouldLeft !== entry.sideLeft) {
      entry.sideLeft = shouldLeft;
      entry.element.classList.toggle('side-left', shouldLeft);
    }
  });
}

function pulsePart(part, color = 0x55a17d) {
  const anchor = labelAnchors[part];
  if (!anchor) return;
  anchor.getWorldPosition(pulseRing.position);
  pulseMaterial.color.set(color);
  pulseMaterial.opacity = 0.9;
  pulseRing.visible = true;
  pulseStart = performance.now();
}

function updatePulse(now) {
  if (pulseStart < 0) return;
  const elapsed = (now - pulseStart) / 780;
  if (elapsed >= 1) {
    pulseRing.visible = false;
    pulseStart = -1;
    return;
  }
  pulseRing.quaternion.copy(camera.quaternion);
  const scale = 0.75 + elapsed * 1.5;
  pulseRing.scale.setScalar(scale);
  pulseMaterial.opacity = 0.9 * (1 - elapsed);
}

function setPickingState(active) {
  dom.sceneRoot.classList.toggle('is-picking', active);
}

function enterPractice() {
  if (practiceActive) {
    leavePractice(true);
    return;
  }
  savedStep = currentStep;
  labelsBeforePractice = labelsVisible;
  goToStep(steps.length - 1);
  practiceActive = true;
  practicePhase = 'parts';
  practicePartIndex = 0;
  partMistakes = 0;
  orderMistakes = 0;
  placedOrder = [];
  orderItems = shuffle(repairOrder);
  practiceLocked = false;
  feedbackState = null;
  labelsVisible = false;
  updateLabelButton();
  updateLabelVisibility();
  dom.headerPractice.querySelector('span').textContent = 'Exit practice';
  dom.headerPractice.setAttribute('aria-label', 'Exit practice');
  dom.guidePanel.classList.add('is-practice');
  dom.lessonPanel.hidden = true;
  dom.practicePanel.hidden = false;
  dom.stepTrack.hidden = true;
  dom.lessonControls.hidden = true;
  dom.keyboardHint.hidden = true;
  setPickingState(true);
  renderPracticeParts();
}

function leavePractice(restore = true) {
  window.clearTimeout(practiceTimer);
  practiceActive = false;
  practicePhase = 'parts';
  practiceLocked = false;
  labelsVisible = labelsBeforePractice;
  updateLabelButton();
  updateLabelVisibility();
  dom.headerPractice.querySelector('span').textContent = 'Practice';
  dom.headerPractice.setAttribute('aria-label', 'Open practice');
  dom.guidePanel.classList.remove('is-practice');
  dom.lessonPanel.hidden = false;
  dom.practicePanel.hidden = true;
  dom.stepTrack.hidden = false;
  dom.lessonControls.hidden = false;
  dom.keyboardHint.hidden = false;
  setPickingState(false);
  if (restore) {
    currentStep = savedStep;
    targetModel = makeModelTarget(currentStep);
    updateStepUI();
  }
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function practiceScene(message, tone = 'neutral', badge = '') {
  setStatus(message, badge, tone);
}

function feedbackMarkup(tone, message) {
  const mark = tone === 'good' ? '✓' : tone === 'bad' ? '!' : '·';
  const className = tone === 'good' ? 'is-good' : tone === 'bad' ? 'is-bad' : '';
  return `<div class="feedback-strip ${className}"><span class="feedback-mark">${mark}</span><span>${message}</span></div>`;
}

function renderPracticeParts() {
  const target = practiceTargets[practicePartIndex];
  const tone = feedbackState?.tone || 'neutral';
  const message = feedbackState?.message || 'Tap the part in the wheel, or choose a name below.';
  const filledDots = practiceTargets.map((item, index) => `
    <span class="order-slot ${index < practicePartIndex ? 'is-filled' : ''}">${index < practicePartIndex ? '✓' : index + 1}</span>
  `).join('');

  dom.practicePanel.innerHTML = `
    <div class="practice-top">
      <div class="practice-kicker"><span>P</span>Practice bay</div>
      <div class="practice-progress">Part ${practicePartIndex + 1} of 3</div>
    </div>
    <h2 class="practice-title">Find the ${target.name}</h2>
    <p class="practice-copy">${target.copy}</p>
    <div class="order-instruction"><span>Part hunt</span><div class="order-slots">${filledDots}</div></div>
    <div class="part-options" role="group" aria-label="Choose the bicycle part">
      ${partOptions.map((part) => `<button class="part-option" type="button" data-part-option="${part.id}"><span class="part-option-dot"></span>${part.name}</button>`).join('')}
    </div>
    ${feedbackMarkup(tone, message)}
    <button class="practice-link" id="showNamesBtn" type="button">Show part names for 3 seconds</button>
    <button class="practice-link" id="exitPracticeBtn" type="button">Back to lesson</button>
  `;

  dom.practicePanel.querySelectorAll('[data-part-option]').forEach((button) => {
    button.addEventListener('click', () => choosePart(button.dataset.partOption));
  });
  document.getElementById('showNamesBtn').addEventListener('click', revealPracticeNames);
  document.getElementById('exitPracticeBtn').addEventListener('click', () => leavePractice(true));
  practiceScene(`Find the ${target.name} · tap the wheel`, 'warning', 'PRACTICE');
  updateLabelVisibility();
}

function choosePart(part) {
  if (!practiceActive || practicePhase !== 'parts' || practiceLocked) return;
  const target = practiceTargets[practicePartIndex];
  if (!part) {
    feedbackState = { tone: 'bad', message: 'No part there. Try again, or use the part buttons below.' };
    renderPracticeParts();
    return;
  }

  if (part === target.id) {
    practiceLocked = true;
    practicePartIndex += 1;
    pulsePart(part, 0x55a17d);
    feedbackState = {
      tone: 'good',
      message: `Correct — that’s the ${target.name}. ${partInfo[target.id]}`
    };
    const finishedParts = practicePartIndex >= practiceTargets.length;
    if (!finishedParts) {
      renderPracticeParts();
    } else {
      const strip = dom.practicePanel.querySelector('.feedback-strip');
      if (strip) {
        strip.className = 'feedback-strip is-good';
        strip.innerHTML = `<span class="feedback-mark">✓</span><span>${feedbackState.message}</span>`;
      }
      dom.practicePanel.querySelectorAll('.order-slot').forEach((slot) => {
        slot.classList.add('is-filled');
        slot.textContent = '✓';
      });
      dom.practicePanel.querySelector(`[data-part-option="${part}"]`)?.classList.add('is-correct');
    }
    practiceScene(`Found the ${target.name}`, 'success', 'PRACTICE');
    practiceTimer = window.setTimeout(() => {
      practiceLocked = false;
      if (finishedParts) {
        practicePhase = 'order';
        orderItems = shuffle(repairOrder);
        placedOrder = [];
        orderMistakes = 0;
        feedbackState = null;
        renderPracticeOrder();
      } else {
        feedbackState = null;
        renderPracticeParts();
      }
    }, 950);
    return;
  }

  partMistakes += 1;
  pulsePart(part, 0xe45c2f);
  feedbackState = {
    tone: 'bad',
    message: `That’s the ${partNames[part]}. ${partInfo[target.id]} Try again.`
  };
  renderPracticeParts();
  practiceScene(`Not quite · find the ${target.name}`, 'warning', 'PRACTICE');
  const wrongButton = dom.practicePanel.querySelector(`[data-part-option="${part}"]`);
  if (wrongButton) {
    wrongButton.classList.remove('is-wrong');
    void wrongButton.offsetWidth;
    wrongButton.classList.add('is-wrong');
  }
}

function revealPracticeNames() {
  if (!practiceActive || practicePhase !== 'parts') return;
  document.getElementById('showNamesBtn')?.remove();
  labelsVisible = true;
  updateLabelButton();
  temporaryLabelsUntil = performance.now() + 3000;
  updateLabelVisibility();
  showToast('Part names are shown for 3 seconds.');
  window.setTimeout(() => {
    if (practiceActive && practicePhase === 'parts') {
      labelsVisible = false;
      updateLabelButton();
      updateLabelVisibility();
    }
  }, 3050);
}

function renderPracticeOrder() {
  if (!practiceActive) return;
  practicePhase = 'order';
  const tone = feedbackState?.tone || 'neutral';
  const message = feedbackState?.message || 'Pick any step. If it is next in the repair, it will lock into place.';
  const slots = repairOrder.map((item, index) => `<span class="order-slot ${index < placedOrder.length ? 'is-filled' : ''}">${index < placedOrder.length ? '✓' : index + 1}</span>`).join('');

  dom.practicePanel.innerHTML = `
    <div class="practice-top">
      <div class="practice-kicker"><span>P</span>Practice bay</div>
      <div class="practice-progress">${placedOrder.length} of 6 placed</div>
    </div>
    <h2 class="practice-title">Rebuild the repair</h2>
    <p class="practice-copy">Put the workshop steps back in order. The first one is the first thing you would do.</p>
    <div class="order-instruction"><span>Tap in sequence</span><div class="order-slots">${slots}</div></div>
    <div class="order-list" role="group" aria-label="Repair steps to order">
      ${orderItems.map((item) => {
        const placedIndex = placedOrder.indexOf(item.id);
        const isPlaced = placedIndex >= 0;
        return `
          <button class="order-card ${isPlaced ? 'is-placed' : ''}" type="button" data-order-id="${item.id}" ${isPlaced ? 'disabled' : ''}>
            <span class="sequence-badge">${isPlaced ? String(placedIndex + 1).padStart(2, '0') : '··'}</span>
            <span class="order-card-text"><strong>${item.name}</strong><small>${item.short}</small></span>
          </button>
        `;
      }).join('')}
    </div>
    ${feedbackMarkup(tone, message)}
    <button class="practice-link" id="exitPracticeBtn" type="button">Back to lesson</button>
  `;

  dom.practicePanel.querySelectorAll('[data-order-id]').forEach((button) => {
    button.addEventListener('click', () => chooseOrderStep(button.dataset.orderId, button));
  });
  document.getElementById('exitPracticeBtn').addEventListener('click', () => leavePractice(true));
  practiceScene('Repair sequence · tap the next step', 'neutral', `${placedOrder.length} / 6`);
  updateLabelVisibility();
}

function chooseOrderStep(id, button) {
  if (!practiceActive || practicePhase !== 'order' || practiceLocked || placedOrder.includes(id)) return;
  const expected = repairOrder[placedOrder.length];

  if (id === expected.id) {
    placedOrder.push(id);
    practiceLocked = true;
    feedbackState = {
      tone: 'good',
      message: `Correct — ${expected.name.toLowerCase()} comes at position ${placedOrder.length}.`
    };
    renderPracticeOrder();
    practiceScene(`Sequence ${placedOrder.length} of 6 placed`, 'success', `${placedOrder.length} / 6`);
    practiceTimer = window.setTimeout(() => {
      practiceLocked = false;
      if (placedOrder.length === repairOrder.length) {
        practicePhase = 'complete';
        renderPracticeComplete();
      } else {
        feedbackState = null;
        renderPracticeOrder();
      }
    }, 620);
    return;
  }

  orderMistakes += 1;
  button.classList.remove('is-wrong');
  void button.offsetWidth;
  button.classList.add('is-wrong');
  feedbackState = {
    tone: 'bad',
    message: `Not yet — ${orderReasons[expected.id]} Try another step.`
  };
  practiceLocked = true;
  practiceScene('Try another step', 'warning', `${placedOrder.length} / 6`);
  practiceTimer = window.setTimeout(() => {
    practiceLocked = false;
    renderPracticeOrder();
  }, 430);
}

function renderPracticeComplete() {
  if (!practiceActive) return;
  const totalMistakes = partMistakes + orderMistakes;
  const correctionText = totalMistakes === 0
    ? 'You identified all three parts and built the complete sequence without a wrong turn.'
    : `You found every part and placed all six steps, with ${totalMistakes} correction${totalMistakes === 1 ? '' : 's'} along the way.`;
  dom.practicePanel.innerHTML = `
    <div class="practice-top">
      <div class="practice-kicker"><span>✓</span>Practice complete</div>
      <div class="practice-score">${totalMistakes === 0 ? 'Clean run' : `${totalMistakes} retry${totalMistakes === 1 ? '' : 's'}`}</div>
    </div>
    <div class="result-card">
      <div class="result-icon">✓</div>
      <h3>Bench ready.</h3>
      <p>${correctionText}</p>
      <div class="practice-actions">
        <button class="practice-action is-primary" id="retryPracticeBtn" type="button">Try again</button>
        <button class="practice-action" id="finishPracticeBtn" type="button">Back to lesson</button>
      </div>
    </div>
    <div class="feedback-strip is-good"><span class="feedback-mark">✓</span><span>Deflate → unseat → remove → locate → patch → reassemble.</span></div>
  `;
  document.getElementById('retryPracticeBtn').addEventListener('click', startPracticeAgain);
  document.getElementById('finishPracticeBtn').addEventListener('click', () => leavePractice(true));
  practiceScene('Practice complete · nice work', 'success', 'DONE');
  updateLabelVisibility();
}

function startPracticeAgain() {
  window.clearTimeout(practiceTimer);
  practicePartIndex = 0;
  partMistakes = 0;
  orderMistakes = 0;
  placedOrder = [];
  orderItems = shuffle(repairOrder);
  feedbackState = null;
  practiceLocked = false;
  practicePhase = 'parts';
  renderPracticeParts();
}

function getPartAtPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(wheelRoot.children, true);
  for (const hit of hits) {
    let object = hit.object;
    while (object && !object.userData.part) {
      object = object.parent;
    }
    if (object?.userData.part) return object.userData.part;
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance < 8 && practiceActive && practicePhase === 'parts') {
    choosePart(getPartAtPointer(event));
  }
});

renderer.domElement.addEventListener('pointercancel', () => {
  pointerDown = null;
});

dom.spinBtn.addEventListener('click', () => {
  spinPaused = !spinPaused;
  controls.autoRotate = !spinPaused;
  updateSpinUI();
  dom.orbitHint.classList.add('is-hidden');
});

dom.labelBtn.addEventListener('click', () => {
  labelsVisible = !labelsVisible;
  temporaryLabelsUntil = 0;
  updateLabelButton();
  updateLabelVisibility();
});

dom.resetBtn.addEventListener('click', () => resetView(true));

dom.prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
dom.nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    goToStep(currentStep + 1);
  } else {
    enterPractice();
  }
});

dom.headerPractice.addEventListener('click', () => {
  if (practiceActive) {
    leavePractice(true);
  } else {
    enterPractice();
  }
});

controls.addEventListener('start', () => {
  userMovedView = true;
  if (!spinPaused) {
    spinPaused = true;
    controls.autoRotate = false;
    updateSpinUI();
  }
  dom.orbitHint.classList.add('is-hidden');
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (practiceActive) {
    if (event.key === 'Escape') leavePractice(true);
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    if (currentStep < steps.length - 1) goToStep(currentStep + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    if (currentStep > 0) goToStep(currentStep - 1);
  }
});

window.addEventListener('resize', resize);
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(resize);
  observer.observe(dom.sceneRoot);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  const seconds = clock.elapsedTime;

  model.tubeX = damp(model.tubeX, targetModel.tubeX, 6.5, delta);
  model.tubeY = damp(model.tubeY, targetModel.tubeY, 6.5, delta);
  model.tubeZ = damp(model.tubeZ, targetModel.tubeZ, 6.5, delta);
  model.tubeScale = damp(model.tubeScale, targetModel.tubeScale, 6.5, delta);
  model.tubeRot = damp(model.tubeRot, targetModel.tubeRot, 6.5, delta);
  model.bead = damp(model.bead, targetModel.bead, 8, delta);
  model.lever = damp(model.lever, targetModel.lever, 8, delta);
  model.puncture = damp(model.puncture, targetModel.puncture, 8, delta);
  model.patch = damp(model.patch, targetModel.patch, 9, delta);
  model.bubble = damp(model.bubble, targetModel.bubble, 7, delta);
  model.cap = damp(model.cap, targetModel.cap, 8, delta);
  model.air = damp(model.air, targetModel.air, 7, delta);
  model.success = damp(model.success, targetModel.success, 5, delta);

  tubeGroup.position.set(model.tubeX, model.tubeY, model.tubeZ);
  tubeGroup.scale.setScalar(model.tubeScale);
  tubeGroup.rotation.z = model.tubeRot;

  const beadMid = -0.57;
  beadLift.position.set(
    Math.cos(beadMid) * 0.2 * model.bead,
    Math.sin(beadMid) * 0.2 * model.bead,
    0.16 * model.bead
  );
  beadMaterial.opacity = THREE.MathUtils.clamp(model.bead, 0, 1);
  beadLift.visible = model.bead > 0.02;

  leverGroup.visible = model.lever > 0.02;
  leverGroup.scale.setScalar(Math.max(0.001, model.lever));
  leverGroup.position.z = 0.39 + 0.09 * model.lever;

  valveCap.position.y = valveCapBaseY + 0.075 * model.cap;
  valveCap.rotation.y = model.cap * Math.PI * 3.5;

  airGroup.visible = model.air > 0.02;
  if (airGroup.visible) {
    airPuffs.forEach((puff) => {
      const cycle = ((seconds * puff.userData.speed + puff.userData.phase) % 1);
      puff.position.set(
        Math.cos(puff.userData.angle) * puff.userData.spread * (0.5 + cycle),
        -cycle * 0.82,
        Math.sin(puff.userData.angle) * puff.userData.spread * (0.5 + cycle)
      );
      puff.scale.setScalar(0.5 + cycle * 1.2);
      puff.material.opacity = model.air * (1 - cycle) * 0.72;
    });
  }

  punctureGroup.visible = model.puncture > 0.02;
  punctureGroup.scale.setScalar(0.62 + model.puncture * 0.38);
  punctureMaterial.opacity = model.puncture * 0.95;
  punctureRing.scale.setScalar(1 + Math.sin(seconds * 4.5) * 0.08);

  bubbleGroup.visible = model.bubble > 0.02;
  if (bubbleGroup.visible) {
    bubbles.forEach((bubble) => {
      const cycle = ((seconds * bubble.userData.speed + bubble.userData.phase) % 1);
      bubble.position.copy(bubble.userData.offset);
      bubble.position.z += cycle * 0.28;
      bubble.position.y += cycle * 0.05;
      bubble.scale.setScalar(0.55 + cycle * 1.25);
      bubble.material.opacity = model.bubble * (1 - cycle) * 0.7;
    });
  }

  patchGroup.visible = model.patch > 0.02;
  patchGroup.scale.setScalar(Math.max(0.001, model.patch));

  materials.reward.opacity = model.success * 0.55;
  successRing.visible = model.success > 0.02;
  const successScale = 0.96 + model.success * 0.04;
  successRing.scale.setScalar(successScale);
  successRing.rotation.z = seconds * 0.04;

  updatePulse(now);
  cameraFacingLabels();
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    window.setTimeout(() => dom.sceneLoader.classList.add('is-hidden'), 180);
  }
}

renderStepTrack();
updateStepUI();
updateSpinUI();
updateLabelButton();
resize();
resetView(false);
updateLabelVisibility();
window.setTimeout(() => dom.orbitHint.classList.add('is-hidden'), 8000);
animate();
