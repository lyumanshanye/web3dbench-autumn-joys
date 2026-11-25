import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BUILD_VOLUME = Object.freeze({ width: 220, depth: 220, height: 250 });
const BED_HALF = BUILD_VOLUME.width / 2;
const EPSILON = 0.02;
const BED_TOLERANCE = 0.65;

const COLORS = Object.freeze({
  part: new THREE.Color(0x8fb8ad),
  overhang: new THREE.Color(0xff9d45),
  outside: new THREE.Color(0xff4d57),
});

const dom = {
  canvas: document.querySelector('#viewCanvas'),
  viewportShell: document.querySelector('#viewportShell'),
  loadingCover: document.querySelector('#loadingCover'),
  fileInput: document.querySelector('#fileInput'),
  importBtn: document.querySelector('#importBtn'),
  exportBtn: document.querySelector('#exportBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  sourceChip: document.querySelector('#sourceChip'),
  triangleChip: document.querySelector('#triangleChip'),
  partName: document.querySelector('#partName'),
  partMeta: document.querySelector('#partMeta'),
  rotX: document.querySelector('#rotX'),
  rotY: document.querySelector('#rotY'),
  rotZ: document.querySelector('#rotZ'),
  scaleSlider: document.querySelector('#scaleSlider'),
  scaleInput: document.querySelector('#scaleInput'),
  scalePercent: document.querySelector('#scalePercent'),
  scaleResetBtn: document.querySelector('#scaleResetBtn'),
  posX: document.querySelector('#posX'),
  posY: document.querySelector('#posY'),
  placeBtn: document.querySelector('#placeBtn'),
  centerBtn: document.querySelector('#centerBtn'),
  dimWidth: document.querySelector('#dimWidth'),
  dimDepth: document.querySelector('#dimDepth'),
  dimHeight: document.querySelector('#dimHeight'),
  fitDot: document.querySelector('#fitDot'),
  fitLabel: document.querySelector('#fitLabel'),
  fitPill: document.querySelector('#fitPill'),
  fitMessage: document.querySelector('#fitMessage'),
  utilW: document.querySelector('#utilW'),
  utilD: document.querySelector('#utilD'),
  utilH: document.querySelector('#utilH'),
  utilWText: document.querySelector('#utilWText'),
  utilDText: document.querySelector('#utilDText'),
  utilHText: document.querySelector('#utilHText'),
  overhangToggle: document.querySelector('#overhangToggle'),
  overhangRange: document.querySelector('#overhangRange'),
  overhangValue: document.querySelector('#overhangValue'),
  overhangMetric: document.querySelector('#overhangMetric'),
  sectionToggle: document.querySelector('#sectionToggle'),
  sectionRange: document.querySelector('#sectionRange'),
  sectionValue: document.querySelector('#sectionValue'),
  sectionCopy: document.querySelector('#sectionCopy'),
  sectionBadge: document.querySelector('#sectionBadge'),
  sectionBadgeValue: document.querySelector('#sectionBadgeValue'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  viewButtons: Array.from(document.querySelectorAll('.view-button')),
};

const state = {
  geometry: null,
  initialGeometry: null,
  name: 'L-bracket.stl',
  kind: 'procedural',
  detail: 'Procedural demo · ready to orient',
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  position: { x: 0, y: 0, z: 0 },
  overhangEnabled: true,
  overhangThreshold: 45,
  sectionEnabled: false,
  sectionHeight: 30,
  box: new THREE.Box3(),
  cameraTween: null,
  activeView: 'orbit',
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
camera.up.set(0, 0, 1);
camera.position.set(360, 540, 300);

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const controls = new OrbitControls(camera, dom.canvas);
controls.target.set(0, 0, 120);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;
controls.minDistance = 120;
controls.maxDistance = 1050;
controls.minPolarAngle = 0.03;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
controls.zoomSpeed = 0.85;
controls.rotateSpeed = 0.7;
controls.update();

const partGroup = new THREE.Group();
scene.add(partGroup);

const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), state.sectionHeight);
const partMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.58,
  metalness: 0.09,
  flatShading: true,
  side: THREE.DoubleSide,
  clippingPlanes: [],
  clipShadows: true,
});

let partMesh = new THREE.Mesh(new THREE.BufferGeometry(), partMaterial);
partMesh.castShadow = true;
partMesh.receiveShadow = true;
partGroup.add(partMesh);

const tempBox = new THREE.Box3();
const tempSize = new THREE.Vector3();
const tempCenter = new THREE.Vector3();
const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const vC = new THREE.Vector3();
const edgeAB = new THREE.Vector3();
const edgeAC = new THREE.Vector3();
const faceNormal = new THREE.Vector3();

let toastTimer = 0;
let refreshQueued = false;
let sectionLine = null;
let sectionGroup = null;

init();

function init() {
  createLighting();
  createBuildVolume();
  createSectionVisuals();
  bindEvents();
  resizeRenderer();

  const bracket = createBracketGeometry();
  installPart(bracket, {
    name: 'L-bracket.stl',
    kind: 'procedural',
    detail: 'Procedural demo · 132 × 104 × 92 mm',
    captureInitial: true,
    resetTransform: true,
  });

  new ResizeObserver(resizeRenderer).observe(dom.viewportShell);
  requestAnimationFrame(animate);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => dom.loadingCover.classList.add('is-hidden'));
  });
}

function createLighting() {
  const hemisphere = new THREE.HemisphereLight(0xd9eee7, 0x071012, 1.65);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xfff3da, 2.9);
  key.position.set(190, 250, 360);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -220;
  key.shadow.camera.right = 220;
  key.shadow.camera.top = 220;
  key.shadow.camera.bottom = -220;
  key.shadow.camera.near = 40;
  key.shadow.camera.far = 850;
  key.shadow.bias = -0.0007;
  key.target.position.set(0, 0, 40);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0x65d7c7, 1.2);
  rim.position.set(-250, -180, 190);
  scene.add(rim);

  const frontFill = new THREE.DirectionalLight(0xa9c9dc, 0.55);
  frontFill.position.set(0, 320, 70);
  scene.add(frontFill);
}

function createBuildVolume() {
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(BUILD_VOLUME.width, BUILD_VOLUME.depth),
    new THREE.MeshStandardMaterial({
      color: 0x122024,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  bed.position.z = 0;
  bed.receiveShadow = true;
  scene.add(bed);

  const minorGrid = new THREE.GridHelper(220, 22, 0x31504f, 0x263d3e);
  minorGrid.rotation.x = Math.PI / 2;
  minorGrid.position.z = 0.12;
  minorGrid.material.transparent = true;
  minorGrid.material.opacity = 0.54;
  minorGrid.material.depthWrite = false;
  scene.add(minorGrid);

  const majorGrid = new THREE.GridHelper(220, 11, 0x4f746e, 0x4f746e);
  majorGrid.rotation.x = Math.PI / 2;
  majorGrid.position.z = 0.16;
  majorGrid.material.transparent = true;
  majorGrid.material.opacity = 0.34;
  majorGrid.material.depthWrite = false;
  scene.add(majorGrid);

  const bedBorderGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-110, -110, 0.22),
    new THREE.Vector3(110, -110, 0.22),
    new THREE.Vector3(110, 110, 0.22),
    new THREE.Vector3(-110, 110, 0.22),
  ]);
  const bedBorder = new THREE.LineLoop(
    bedBorderGeometry,
    new THREE.LineBasicMaterial({ color: 0x78c8bc, transparent: true, opacity: 0.7 }),
  );
  scene.add(bedBorder);

  const volumeGeometry = new THREE.BoxGeometry(BUILD_VOLUME.width, BUILD_VOLUME.depth, BUILD_VOLUME.height);
  volumeGeometry.translate(0, 0, BUILD_VOLUME.height / 2);
  const volumeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(volumeGeometry),
    new THREE.LineBasicMaterial({ color: 0x73c6b9, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  scene.add(volumeEdges);
  volumeGeometry.dispose();

  const topLoop = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-110, -110, BUILD_VOLUME.height),
      new THREE.Vector3(110, -110, BUILD_VOLUME.height),
      new THREE.Vector3(110, 110, BUILD_VOLUME.height),
      new THREE.Vector3(-110, 110, BUILD_VOLUME.height),
    ]),
    new THREE.LineBasicMaterial({ color: 0x91d9cb, transparent: true, opacity: 0.66 }),
  );
  scene.add(topLoop);

  const axisOrigin = new THREE.Vector3(-107, -107, 0.5);
  const axes = [
    { direction: new THREE.Vector3(1, 0, 0), color: 0xe6796f },
    { direction: new THREE.Vector3(0, 1, 0), color: 0x89ca75 },
    { direction: new THREE.Vector3(0, 0, 1), color: 0x6eafea },
  ];
  for (const axis of axes) {
    const arrow = new THREE.ArrowHelper(axis.direction, axisOrigin, 24, axis.color, 5, 2.5);
    arrow.line.material.transparent = true;
    arrow.line.material.opacity = 0.66;
    arrow.cone.material.transparent = true;
    arrow.cone.material.opacity = 0.66;
    scene.add(arrow);
  }
}

function createSectionVisuals() {
  sectionGroup = new THREE.Group();
  sectionGroup.visible = false;
  scene.add(sectionGroup);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(BUILD_VOLUME.width, BUILD_VOLUME.depth),
    new THREE.MeshBasicMaterial({
      color: 0xffb258,
      transparent: true,
      opacity: 0.065,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  plane.renderOrder = 2;
  sectionGroup.add(plane);

  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-110, -110, 0.03),
      new THREE.Vector3(110, -110, 0.03),
      new THREE.Vector3(110, 110, 0.03),
      new THREE.Vector3(-110, 110, 0.03),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffb258, transparent: true, opacity: 0.48, depthWrite: false }),
  );
  border.renderOrder = 3;
  sectionGroup.add(border);
}

function bindEvents() {
  dom.importBtn.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', handleFileSelection);
  dom.exportBtn.addEventListener('click', exportPart);
  dom.resetBtn.addEventListener('click', resetToInitialPart);

  dom.rotX.addEventListener('change', () => setRotationFromInput('x', dom.rotX));
  dom.rotY.addEventListener('change', () => setRotationFromInput('y', dom.rotY));
  dom.rotZ.addEventListener('change', () => setRotationFromInput('z', dom.rotZ));

  for (const button of document.querySelectorAll('.turn-button')) {
    button.addEventListener('click', () => {
      const axis = button.dataset.axis;
      const turn = Number(button.dataset.turn);
      state.rotation[axis] = normalizeDegrees(state.rotation[axis] + turn);
      syncTransformInputs();
      applyTransforms();
    });
  }

  dom.scaleSlider.addEventListener('input', () => {
    setScale(Number(dom.scaleSlider.value), 'slider');
  });
  dom.scaleInput.addEventListener('change', () => {
    setScale(Number(dom.scaleInput.value), 'input');
  });
  dom.scaleResetBtn.addEventListener('click', () => setScale(1, 'both'));

  dom.posX.addEventListener('change', () => setBedPosition('x', dom.posX));
  dom.posY.addEventListener('change', () => setBedPosition('y', dom.posY));
  dom.placeBtn.addEventListener('click', placeOnBed);
  dom.centerBtn.addEventListener('click', centerOverBedOrigin);

  dom.overhangRange.addEventListener('input', () => {
    state.overhangThreshold = Number(dom.overhangRange.value);
    dom.overhangValue.textContent = `${state.overhangThreshold}°`;
    requestRefresh();
  });
  dom.overhangToggle.addEventListener('change', () => {
    state.overhangEnabled = dom.overhangToggle.checked;
    requestRefresh();
  });

  dom.sectionToggle.addEventListener('change', () => {
    state.sectionEnabled = dom.sectionToggle.checked;
    setSectionClipping();
    requestRefresh();
  });
  dom.sectionRange.addEventListener('input', () => {
    state.sectionHeight = clamp(Number(dom.sectionRange.value), 0, BUILD_VOLUME.height);
    requestRefresh();
  });

  for (const button of dom.viewButtons) {
    button.addEventListener('click', () => setCameraPreset(button.dataset.view));
  }

  controls.addEventListener('start', () => {
    if (!state.cameraTween) setActiveView('orbit');
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.sectionEnabled) {
      state.sectionEnabled = false;
      dom.sectionToggle.checked = false;
      setSectionClipping();
      requestRefresh();
    }
  });
}

function createBracketGeometry() {
  const baseShape = roundedRectShape(132, 104, 6);
  const boltHole = new THREE.Path();
  boltHole.absarc(42, 26, 10.5, 0, Math.PI * 2, true);
  baseShape.holes.push(boltHole);

  const base = new THREE.ExtrudeGeometry(baseShape, {
    depth: 10,
    bevelEnabled: false,
    curveSegments: 36,
    steps: 1,
  });

  const wallShape = new THREE.Shape();
  wallShape.moveTo(-66, 0);
  wallShape.lineTo(-66, 78);
  wallShape.lineTo(-56, 92);
  wallShape.lineTo(56, 92);
  wallShape.lineTo(66, 78);
  wallShape.lineTo(66, 0);
  wallShape.closePath();
  const wall = new THREE.ExtrudeGeometry(wallShape, {
    depth: 10,
    bevelEnabled: false,
    steps: 1,
  });
  wall.rotateX(Math.PI / 2);
  wall.translate(0, -37, 0);

  const lip = new THREE.BoxGeometry(112, 58, 12);
  lip.translate(0, -13, 86);

  const ribProfile = new THREE.Shape();
  ribProfile.moveTo(-42, 54);
  ribProfile.lineTo(-42, 80);
  ribProfile.lineTo(14, 80);
  ribProfile.closePath();

  const ribRotation = new THREE.Matrix4().set(
    0, 0, 1, 0,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1,
  );

  const ribLeft = new THREE.ExtrudeGeometry(ribProfile, { depth: 6, bevelEnabled: false, steps: 1 });
  ribLeft.applyMatrix4(ribRotation);
  ribLeft.translate(-44, 0, 0);

  const ribRight = new THREE.ExtrudeGeometry(ribProfile, { depth: 6, bevelEnabled: false, steps: 1 });
  ribRight.applyMatrix4(ribRotation);
  ribRight.translate(38, 0, 0);

  const pieces = [base, wall, lip, ribLeft, ribRight].map((geometry) => {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    if (nonIndexed !== geometry) geometry.dispose();
    nonIndexed.deleteAttribute('uv');
    return nonIndexed;
  });

  const merged = mergeGeometries(pieces, false);
  if (!merged) throw new Error('Could not assemble the procedural bracket.');
  for (const piece of pieces) piece.dispose();
  merged.computeBoundingBox();
  const bounds = merged.boundingBox;
  merged.translate(
    -(bounds.min.x + bounds.max.x) / 2,
    -(bounds.min.y + bounds.max.y) / 2,
    -bounds.min.z,
  );
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function prepareGeometry(geometry) {
  if (!geometry || !geometry.getAttribute || !geometry.getAttribute('position')) {
    throw new Error('The STL does not contain triangle positions.');
  }

  let prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  if (prepared !== geometry) geometry.dispose();

  const positions = prepared.getAttribute('position');
  if (!positions || positions.count < 3 || positions.count % 3 !== 0) {
    prepared.dispose();
    throw new Error('The STL does not contain a valid triangle mesh.');
  }

  for (let i = 0; i < positions.array.length; i += 1) {
    if (!Number.isFinite(positions.array[i])) {
      prepared.dispose();
      throw new Error('The STL contains invalid coordinates.');
    }
  }

  prepared.deleteAttribute('uv');
  prepared.deleteAttribute('color');
  prepared.computeVertexNormals();
  prepared.computeBoundingBox();
  prepared.computeBoundingSphere();

  const size = prepared.boundingBox.getSize(new THREE.Vector3());
  if (size.lengthSq() < 1e-10) {
    prepared.dispose();
    throw new Error('The STL has no measurable geometry.');
  }

  return prepared;
}

function installPart(geometry, options) {
  const prepared = prepareGeometry(geometry);

  if (options.captureInitial) {
    if (state.initialGeometry) state.initialGeometry.dispose();
    state.initialGeometry = prepared.clone();
  }

  partMesh.geometry.dispose();
  partMesh.geometry = prepared;
  state.geometry = prepared;
  state.name = options.name;
  state.kind = options.kind;
  state.detail = options.detail;

  if (options.resetTransform) {
    state.rotation = { x: 0, y: 0, z: 0 };
    state.scale = 1;
    state.position = { x: 0, y: 0, z: 0 };
  }

  dom.partName.textContent = state.name;
  dom.partMeta.textContent = state.detail;
  dom.sourceChip.textContent = state.kind === 'procedural' ? 'Procedural' : 'Imported';
  dom.triangleChip.textContent = `${formatInteger(prepared.getAttribute('position').count / 3)} tris`;
  syncTransformInputs();
  applyTransforms();
}

function resetToInitialPart() {
  if (!state.initialGeometry) return;

  const restored = state.initialGeometry.clone();
  partMesh.geometry.dispose();
  partMesh.geometry = prepareGeometry(restored);
  state.geometry = partMesh.geometry;
  state.rotation = { x: 0, y: 0, z: 0 };
  state.scale = 1;
  state.position = { x: 0, y: 0, z: 0 };
  state.sectionEnabled = false;
  dom.sectionToggle.checked = false;
  setSectionClipping();
  syncTransformInputs();
  applyTransforms();
  setCameraPreset('orbit');
  showToast(`Restored ${state.name} to its initially loaded state.`);
}

async function handleFileSelection(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const originalImportMarkup = dom.importBtn.innerHTML;
  dom.importBtn.disabled = true;
  dom.importBtn.textContent = 'Reading…';

  try {
    if (file.size === 0) throw new Error('The file is empty.');
    const buffer = await file.arrayBuffer();
    const loader = new STLLoader();
    const geometry = loader.parse(buffer);
    const prepared = prepareGeometry(geometry);
    const triangles = prepared.getAttribute('position').count / 3;

    installPart(prepared, {
      name: file.name,
      kind: 'imported',
      detail: `${formatBytes(file.size)} · ${formatInteger(triangles)} triangles · mm`,
      captureInitial: true,
      resetTransform: true,
    });

    setCameraPreset('orbit');
    showToast(`Loaded ${file.name} · ${formatInteger(triangles)} triangles · coordinates read as millimeters.`);
  } catch (error) {
    showToast(
      `Could not read “${file.name}”. It is not a readable ASCII or binary STL. The current part is unchanged.`,
      'error',
      7000,
    );
  } finally {
    dom.importBtn.disabled = false;
    dom.importBtn.innerHTML = originalImportMarkup;
    dom.fileInput.value = '';
  }
}

function setRotationFromInput(axis, input) {
  const value = Number(input.value);
  state.rotation[axis] = Number.isFinite(value) ? normalizeDegrees(value) : 0;
  input.value = formatInputNumber(state.rotation[axis]);
  applyTransforms();
}

function setScale(value, source) {
  const safeValue = clamp(Number.isFinite(value) ? value : 1, 0.1, 3);
  state.scale = Math.round(safeValue * 100) / 100;
  if (source !== 'slider') dom.scaleSlider.value = String(state.scale);
  if (source !== 'input') dom.scaleInput.value = state.scale.toFixed(2);
  dom.scalePercent.textContent = `${Math.round(state.scale * 100)}%`;
  applyTransforms();
}

function setBedPosition(axis, input) {
  const value = Number(input.value);
  state.position[axis] = Number.isFinite(value) ? clamp(value, -900, 900) : 0;
  input.value = formatInputNumber(state.position[axis]);
  applyTransforms();
}

function syncTransformInputs() {
  dom.rotX.value = formatInputNumber(state.rotation.x);
  dom.rotY.value = formatInputNumber(state.rotation.y);
  dom.rotZ.value = formatInputNumber(state.rotation.z);
  dom.scaleSlider.value = String(state.scale);
  dom.scaleInput.value = state.scale.toFixed(2);
  dom.scalePercent.textContent = `${Math.round(state.scale * 100)}%`;
  dom.posX.value = formatInputNumber(state.position.x);
  dom.posY.value = formatInputNumber(state.position.y);
}

function applyTransforms() {
  partGroup.rotation.set(
    THREE.MathUtils.degToRad(state.rotation.x),
    THREE.MathUtils.degToRad(state.rotation.y),
    THREE.MathUtils.degToRad(state.rotation.z),
  );
  partGroup.scale.setScalar(state.scale);
  partGroup.position.set(state.position.x, state.position.y, state.position.z);
  partGroup.updateMatrixWorld(true);
  requestRefresh();
}

function placeOnBed() {
  const previousZ = state.position.z;
  partGroup.position.z = 0;
  partGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(partMesh);
  const lift = -box.min.z;
  state.position.z = lift;
  partGroup.position.z = lift;
  partGroup.updateMatrixWorld(true);

  if (!Number.isFinite(lift)) {
    state.position.z = previousZ;
    partGroup.position.z = previousZ;
  }

  applyTransforms();
}

function centerOverBedOrigin() {
  partGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(partMesh);
  const center = box.getCenter(new THREE.Vector3());
  state.position.x -= center.x;
  state.position.y -= center.y;
  syncTransformInputs();
  applyTransforms();
}

function requestRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    refreshWorkbench();
  });
}

function refreshWorkbench() {
  partGroup.updateMatrixWorld(true);
  state.box.setFromObject(partMesh);
  state.box.getSize(tempSize);
  state.box.getCenter(tempCenter);

  updateEnvelopeUI();
  const scan = updatePartColors();
  updateOverhangUI(scan);
  updateSectionUI();
  updateSectionContour();
}

function updateEnvelopeUI() {
  const width = Math.max(0, tempSize.x);
  const depth = Math.max(0, tempSize.y);
  const height = Math.max(0, tempSize.z);

  dom.dimWidth.textContent = formatMillimeters(width);
  dom.dimDepth.textContent = formatMillimeters(depth);
  dom.dimHeight.textContent = formatMillimeters(height);

  const fits =
    state.box.min.x >= -BED_HALF - EPSILON &&
    state.box.max.x <= BED_HALF + EPSILON &&
    state.box.min.y >= -BED_HALF - EPSILON &&
    state.box.max.y <= BED_HALF + EPSILON &&
    state.box.min.z >= -EPSILON &&
    state.box.max.z <= BUILD_VOLUME.height + EPSILON;

  dom.fitDot.classList.toggle('is-bad', !fits);
  dom.fitPill.classList.toggle('is-bad', !fits);
  dom.fitLabel.textContent = fits ? 'Inside build volume' : 'Outside build volume';
  dom.fitPill.textContent = fits ? 'Fits' : 'Outside';

  updateUtilization(dom.utilW, dom.utilWText, width, BUILD_VOLUME.width);
  updateUtilization(dom.utilD, dom.utilDText, depth, BUILD_VOLUME.depth);
  updateUtilization(dom.utilH, dom.utilHText, height, BUILD_VOLUME.height);

  if (fits) {
    const clearance = Math.max(
      0,
      Math.min(
        state.box.min.x + BED_HALF,
        BED_HALF - state.box.max.x,
        state.box.min.y + BED_HALF,
        BED_HALF - state.box.max.y,
        BUILD_VOLUME.height - state.box.max.z,
      ),
    );
    const bedContact = Math.abs(state.box.min.z) <= BED_TOLERANCE ? ' · sitting on bed' : '';
    dom.fitMessage.textContent = `Clear of every limit${bedContact}. Closest side clearance: ${formatMillimeters(clearance)} mm.`;
  } else {
    const issues = [];
    const overX = Math.max(0, -BED_HALF - state.box.min.x, state.box.max.x - BED_HALF);
    const overY = Math.max(0, -BED_HALF - state.box.min.y, state.box.max.y - BED_HALF);
    const belowBed = Math.max(0, -state.box.min.z);
    const overTop = Math.max(0, state.box.max.z - BUILD_VOLUME.height);
    if (overX > 0.01) issues.push(`${formatMillimeters(overX)} mm on X`);
    if (overY > 0.01) issues.push(`${formatMillimeters(overY)} mm on Y`);
    if (belowBed > 0.01) issues.push(`${formatMillimeters(belowBed)} mm below the bed`);
    if (overTop > 0.01) issues.push(`${formatMillimeters(overTop)} mm above the height limit`);
    dom.fitMessage.textContent = issues.length
      ? `Outside by ${issues.join(', ')}. Move, rotate, scale, or place the part on the bed.`
      : 'The transformed part is outside the printer envelope.';
  }
}

function updateUtilization(bar, text, value, limit) {
  const percentage = (value / limit) * 100;
  bar.style.width = `${Math.min(100, percentage)}%`;
  bar.classList.toggle('is-over', percentage > 100.01);
  text.textContent = `${Math.round(percentage)}%`;
}

function updatePartColors() {
  const geometry = partMesh.geometry;
  const position = geometry.getAttribute('position');
  let color = geometry.getAttribute('color');

  if (!color || color.count !== position.count) {
    color = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
    geometry.setAttribute('color', color);
  }

  partGroup.updateMatrixWorld(true);
  const matrix = partMesh.matrixWorld;
  const vertexCount = position.count;
  const threshold = state.overhangThreshold + 1e-6;
  let overhangTriangles = 0;
  let overhangArea = 0;
  let outsideTriangles = 0;

  for (let i = 0; i < vertexCount; i += 3) {
    vA.fromBufferAttribute(position, i).applyMatrix4(matrix);
    vB.fromBufferAttribute(position, i + 1).applyMatrix4(matrix);
    vC.fromBufferAttribute(position, i + 2).applyMatrix4(matrix);

    edgeAB.subVectors(vB, vA);
    edgeAC.subVectors(vC, vA);
    faceNormal.crossVectors(edgeAB, edgeAC);
    const doubleArea = faceNormal.length();
    if (doubleArea > 1e-12) faceNormal.multiplyScalar(1 / doubleArea);

    const outside =
      vA.x < -BED_HALF - EPSILON || vB.x < -BED_HALF - EPSILON || vC.x < -BED_HALF - EPSILON ||
      vA.x > BED_HALF + EPSILON || vB.x > BED_HALF + EPSILON || vC.x > BED_HALF + EPSILON ||
      vA.y < -BED_HALF - EPSILON || vB.y < -BED_HALF - EPSILON || vC.y < -BED_HALF - EPSILON ||
      vA.y > BED_HALF + EPSILON || vB.y > BED_HALF + EPSILON || vC.y > BED_HALF + EPSILON ||
      vA.z < -EPSILON || vB.z < -EPSILON || vC.z < -EPSILON ||
      vA.z > BUILD_VOLUME.height + EPSILON || vB.z > BUILD_VOLUME.height + EPSILON || vC.z > BUILD_VOLUME.height + EPSILON;

    let flaggedOverhang = false;
    if (state.overhangEnabled && faceNormal.z < -1e-7) {
      const angleFromHorizontal = THREE.MathUtils.radToDeg(Math.acos(clamp(-faceNormal.z, -1, 1)));
      const restingOnBed = vA.z <= BED_TOLERANCE && vB.z <= BED_TOLERANCE && vC.z <= BED_TOLERANCE;
      flaggedOverhang = !restingOnBed && angleFromHorizontal <= threshold;
      if (flaggedOverhang) {
        overhangTriangles += 1;
        overhangArea += doubleArea * 0.5;
      }
    }

    if (outside) outsideTriangles += 1;
    const colorForFace = outside ? COLORS.outside : flaggedOverhang ? COLORS.overhang : COLORS.part;
    writeFaceColor(color, i, colorForFace);
  }

  color.needsUpdate = true;
  return { overhangTriangles, overhangArea, outsideTriangles };
}

function writeFaceColor(colorAttribute, index, color) {
  const array = colorAttribute.array;
  for (let vertex = 0; vertex < 3; vertex += 1) {
    const offset = (index + vertex) * 3;
    array[offset] = color.r;
    array[offset + 1] = color.g;
    array[offset + 2] = color.b;
  }
}

function updateOverhangUI(scan) {
  if (!state.overhangEnabled) {
    dom.overhangMetric.textContent = 'Overhang highlighting is paused.';
  } else if (scan.overhangTriangles === 0) {
    dom.overhangMetric.textContent = `No faces flagged at ${state.overhangThreshold}° or flatter.`;
  } else {
    dom.overhangMetric.textContent = `${formatInteger(scan.overhangTriangles)} faces · ${formatArea(scan.overhangArea)} mm² flagged`;
  }
}

function setSectionClipping() {
  const active = state.sectionEnabled;
  partMaterial.clippingPlanes = active ? [clipPlane] : [];
  partMaterial.needsUpdate = true;
}

function updateSectionUI() {
  const active = state.sectionEnabled;
  dom.sectionRange.disabled = !active;
  dom.sectionBadge.hidden = !active;
  dom.sectionValue.textContent = `${state.sectionHeight.toFixed(1)} mm`;
  dom.sectionBadgeValue.textContent = `${state.sectionHeight.toFixed(1)} mm`;
  dom.sectionCopy.textContent = active
    ? `Cutaway above Z = ${state.sectionHeight.toFixed(1)} mm. Camera and part orientation stay fixed.`
    : 'Turn on the horizontal plane to cut away geometry above the chosen height.';
  clipPlane.constant = state.sectionHeight;
  sectionGroup.position.z = state.sectionHeight;
  sectionGroup.visible = active;
}

function updateSectionContour() {
  if (!state.sectionEnabled) {
    if (sectionLine) sectionLine.visible = false;
    return;
  }

  const position = partMesh.geometry.getAttribute('position');
  const matrix = partMesh.matrixWorld;
  const height = state.sectionHeight;
  const segments = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i).applyMatrix4(matrix);
    b.fromBufferAttribute(position, i + 1).applyMatrix4(matrix);
    c.fromBufferAttribute(position, i + 2).applyMatrix4(matrix);

    const da = a.z - height;
    const db = b.z - height;
    const dc = c.z - height;
    const points = [];

    if (da * db < 0) points.push(interpolatePlanePoint(a, b, da, db, height));
    if (db * dc < 0) points.push(interpolatePlanePoint(b, c, db, dc, height));
    if (dc * da < 0) points.push(interpolatePlanePoint(c, a, dc, da, height));

    if (points.length >= 2) {
      segments.push(points[0].x, points[0].y, height + 0.06);
      segments.push(points[1].x, points[1].y, height + 0.06);
    }
  }

  if (sectionLine) {
    sectionLine.geometry.dispose();
    scene.remove(sectionLine);
    sectionLine = null;
  }

  if (segments.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  sectionLine = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xffc66f,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    }),
  );
  sectionLine.renderOrder = 5;
  scene.add(sectionLine);
}

function interpolatePlanePoint(a, b, da, db, height) {
  const t = (height - a.z) / (b.z - a.z);
  return new THREE.Vector3(
    THREE.MathUtils.lerp(a.x, b.x, t),
    THREE.MathUtils.lerp(a.y, b.y, t),
    height,
  );
}

function exportPart() {
  if (!state.geometry) return;

  const exportGeometry = partMesh.geometry.clone();
  exportGeometry.applyMatrix4(partMesh.matrixWorld);
  exportGeometry.computeVertexNormals();
  const exportMesh = new THREE.Mesh(exportGeometry, new THREE.MeshBasicMaterial());

  try {
    const exporter = new STLExporter();
    const data = exporter.parse(exportMesh, { binary: true });
    const blob = new Blob([data], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = state.name.replace(/\.stl$/i, '') || 'part';
    link.href = url;
    link.download = `${baseName}-bedwise.stl`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`Exported ${link.download} with scale, rotation, and placement baked in.`);
  } catch (error) {
    console.error('STL export failed:', error);
    showToast('The STL could not be exported. The current part is unchanged.', 'error');
  } finally {
    exportGeometry.dispose();
    exportMesh.material.dispose();
  }
}

function setCameraPreset(view) {
  const presets = {
    orbit: { position: new THREE.Vector3(360, 540, 300), target: new THREE.Vector3(0, 0, 120) },
    front: { position: new THREE.Vector3(0, 560, 130), target: new THREE.Vector3(0, 0, 105) },
    side: { position: new THREE.Vector3(560, 0, 130), target: new THREE.Vector3(0, 0, 105) },
    top: { position: new THREE.Vector3(0, 80, 700), target: new THREE.Vector3(0, 0, 50) },
  };
  const preset = presets[view] || presets.orbit;

  state.cameraTween = {
    start: performance.now(),
    duration: 520,
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosition: preset.position,
    toTarget: preset.target,
  };
  controls.enabled = false;
  setActiveView(view);
}

function setActiveView(view) {
  state.activeView = view;
  for (const button of dom.viewButtons) {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function updateCameraTween(now) {
  const tween = state.cameraTween;
  if (!tween) return;

  const rawT = clamp((now - tween.start) / tween.duration, 0, 1);
  const eased = 1 - Math.pow(1 - rawT, 3);
  camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
  camera.lookAt(controls.target);

  if (rawT >= 1) {
    state.cameraTween = null;
    controls.enabled = true;
    controls.update();
  }
}

function resizeRenderer() {
  const rect = dom.viewportShell.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(now) {
  requestAnimationFrame(animate);
  updateCameraTween(now);
  if (!state.cameraTween && controls.enabled) controls.update();
  renderer.render(scene, camera);
}

function showToast(message, type = 'info', duration = 4300) {
  window.clearTimeout(toastTimer);
  dom.toastMessage.textContent = message;
  dom.toast.classList.toggle('is-error', type === 'error');
  dom.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, duration);
}

function formatMillimeters(value) {
  if (!Number.isFinite(value)) return '0.0';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  return value.toFixed(1);
}

function formatInputNumber(value) {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatArea(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeDegrees(value) {
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
