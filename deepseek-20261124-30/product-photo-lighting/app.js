import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const STORAGE_KEY = 'lumen-studio-setup-v1';
const OUTPUT_WIDTH = 1600;
const AIM = new THREE.Vector3(0.02, 0.52, 0.16);
const CAMERA_TARGET = new THREE.Vector3(0.24, 0.52, 0.16);

const DEFAULT_STATE = {
  backdrop: '#b76749',
  backdropName: 'Terracotta',
  crop: 'square',
  lens: 50,
  cameraHeight: 135,
  key: { u: 0.17, v: 0.75, power: 78 },
  fill: { u: 0.84, v: 0.58, power: 42 },
  reflector: { u: 0.78, v: 0.84, power: 58 },
};

const BACKDROP_PRESETS = [
  { color: '#b76749', name: 'Terracotta' },
  { color: '#c8b8a4', name: 'Oat' },
  { color: '#87947e', name: 'Sage' },
  { color: '#90a9b2', name: 'Fog' },
  { color: '#d9c8b8', name: 'Shell' },
  { color: '#c79598', name: 'Rose' },
  { color: '#303235', name: 'Ink' },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const numberOr = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
};

const refs = {
  canvas: $('#studio-canvas'),
  previewShell: $('#preview-shell'),
  previewFrame: $('#preview-frame'),
  previewSettings: $('#preview-settings'),
  frameMeta: $('#frame-meta'),
  renderMeta: $('#render-meta'),
  cropInfo: $('#crop-info'),
  backdropName: $('#backdrop-name'),
  backdropColor: $('#backdrop-color'),
  swatches: $$('.swatch[data-color]'),
  customSwatch: $('.swatch-custom'),
  cropOptions: $$('.crop-option'),
  lensSlider: $('#lens-slider'),
  lensOutput: $('#lens-output'),
  heightSlider: $('#height-slider'),
  heightOutput: $('#height-output'),
  keyPower: $('#key-power'),
  fillPower: $('#fill-power'),
  reflectorPower: $('#reflector-power'),
  keyOutput: $('#key-output'),
  fillOutput: $('#fill-output'),
  reflectorOutput: $('#reflector-output'),
  lightPlan: $('#light-plan'),
  planKey: $('#plan-key'),
  planFill: $('#plan-fill'),
  planReflector: $('#plan-reflector'),
  saveStatus: $('#save-status'),
  saveStatusText: $('#save-status-text'),
  saveButton: $('#save-button'),
  resetButton: $('#reset-button'),
  exportButton: $('#export-button'),
  exportLabel: $('#export-label'),
  toast: $('#toast'),
  toastText: $('#toast-text'),
};

function cloneDefaultState() {
  return {
    ...DEFAULT_STATE,
    key: { ...DEFAULT_STATE.key },
    fill: { ...DEFAULT_STATE.fill },
    reflector: { ...DEFAULT_STATE.reflector },
  };
}

function normalizeState(candidate) {
  const next = cloneDefaultState();
  if (!candidate || typeof candidate !== 'object') return next;

  if (typeof candidate.backdrop === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.backdrop)) {
    next.backdrop = candidate.backdrop.toLowerCase();
    const preset = BACKDROP_PRESETS.find((item) => item.color.toLowerCase() === next.backdrop);
    next.backdropName = preset ? preset.name : 'Custom';
  }

  next.crop = candidate.crop === 'portrait' ? 'portrait' : 'square';
  next.lens = numberOr(candidate.lens, next.lens, 35, 105);
  next.cameraHeight = numberOr(candidate.cameraHeight, next.cameraHeight, 75, 225);

  for (const key of ['key', 'fill', 'reflector']) {
    if (candidate[key] && typeof candidate[key] === 'object') {
      next[key].u = numberOr(candidate[key].u, next[key].u, 0.07, 0.93);
      next[key].v = numberOr(candidate[key].v, next[key].v, 0.08, 0.91);
      next[key].power = numberOr(candidate[key].power, next[key].power, 0, 100);
    }
  }

  return next;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : cloneDefaultState();
  } catch (error) {
    return cloneDefaultState();
  }
}

let state = loadState();
let saveTimer = 0;
let toastTimer = 0;
let dragState = null;
let exporting = false;
let renderQueued = false;

function requestRender() {
  if (renderQueued || !renderer) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderer.render(scene, camera);
  });
}

function setRangeFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value);
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${percent}%`);
}

function cropAspect() {
  return state.crop === 'portrait' ? 4 / 5 : 1;
}

function lensToFov(lens) {
  return THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * lens)));
}

RectAreaLightUniformsLib.init();

const renderer = new THREE.WebGLRenderer({
  canvas: refs.canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(state.backdrop);

const camera = new THREE.PerspectiveCamera(lensToFov(state.lens), 1, 0.05, 40);
camera.position.set(0.1, state.cameraHeight / 100, 5.72);
camera.lookAt(CAMERA_TARGET);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const environmentScene = new RoomEnvironment(renderer);
const environmentTexture = pmremGenerator.fromScene(environmentScene, 0.04).texture;
scene.environment = environmentTexture;
pmremGenerator.dispose();

function createCycloramaGeometry() {
  const profile = [
    [5.9, 0.0],
    [2.4, 0.0],
    [0.75, 0.0],
    [0.12, 0.002],
    [-0.55, 0.014],
    [-1.12, 0.054],
    [-1.55, 0.158],
    [-1.84, 0.34],
    [-1.99, 0.66],
    [-2.07, 1.18],
    [-2.11, 2.15],
    [-2.13, 3.6],
    [-2.14, 6.2],
  ];
  const halfWidth = 7.2;
  const positions = [];
  const uvs = [];
  const indices = [];
  const profileSegments = 96;

  for (let i = 0; i <= profileSegments; i += 1) {
    const t = i / profileSegments;
    const sourceIndex = t * (profile.length - 1);
    const lowIndex = Math.min(profile.length - 2, Math.floor(sourceIndex));
    const mix = sourceIndex - lowIndex;
    const a = profile[lowIndex];
    const b = profile[lowIndex + 1];
    const z = THREE.MathUtils.lerp(a[0], b[0], mix);
    const y = THREE.MathUtils.lerp(a[1], b[1], mix);

    positions.push(-halfWidth, y, z, halfWidth, y, z);
    uvs.push(0, t, 1, t);

    if (i < profileSegments) {
      const left = i * 2;
      const right = left + 1;
      indices.push(left, right, left + 2, right, right + 2, left + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const backdropMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(state.backdrop),
  roughness: 0.88,
  metalness: 0.0,
  envMapIntensity: 0.22,
  side: THREE.DoubleSide,
});
const backdrop = new THREE.Mesh(createCycloramaGeometry(), backdropMaterial);
backdrop.receiveShadow = true;
scene.add(backdrop);

function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 118);
  gradient.addColorStop(0, 'rgba(38, 24, 17, 0.28)');
  gradient.addColorStop(0.4, 'rgba(38, 24, 17, 0.13)');
  gradient.addColorStop(0.75, 'rgba(38, 24, 17, 0.035)');
  gradient.addColorStop(1, 'rgba(38, 24, 17, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.6), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0.08, 0.008, 0.26);
  mesh.renderOrder = 1;
  return mesh;
}

const contactShadow = createContactShadow();
scene.add(contactShadow);

const mugMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#e8e0d3'),
  roughness: 0.2,
  metalness: 0.0,
  clearcoat: 0.72,
  clearcoatRoughness: 0.15,
  envMapIntensity: 0.38,
  ior: 1.46,
  specularIntensity: 0.95,
  side: THREE.DoubleSide,
});

function createMug() {
  const group = new THREE.Group();
  group.position.set(0, 0.004, 0.2);
  group.rotation.y = -0.27;

  const profile = [
    [0.0, 0.0],
    [0.46, 0.0],
    [0.535, 0.018],
    [0.573, 0.072],
    [0.598, 0.2],
    [0.608, 0.49],
    [0.602, 0.78],
    [0.59, 0.858],
    [0.572, 0.891],
    [0.548, 0.902],
    [0.523, 0.888],
    [0.513, 0.86],
    [0.526, 0.816],
    [0.54, 0.56],
    [0.537, 0.245],
    [0.518, 0.086],
    [0.442, 0.064],
    [0.0, 0.064],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const bodyGeometry = new THREE.LatheGeometry(profile, 160);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, mugMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.49, 0.735, 0.0),
    new THREE.Vector3(0.73, 0.765, 0.0),
    new THREE.Vector3(0.962, 0.683, 0.0),
    new THREE.Vector3(1.075, 0.5, 0.0),
    new THREE.Vector3(1.018, 0.302, 0.0),
    new THREE.Vector3(0.836, 0.19, 0.0),
    new THREE.Vector3(0.49, 0.183, 0.0),
  ], false, 'catmullrom', 0.35);
  const handleGeometry = new THREE.TubeGeometry(handleCurve, 96, 0.076, 20, false);
  const handle = new THREE.Mesh(handleGeometry, mugMaterial);
  handle.castShadow = true;
  handle.receiveShadow = true;
  group.add(handle);

  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return group;
}

const mug = createMug();
scene.add(mug);

const ambientLight = new THREE.HemisphereLight(0xfff8ea, 0x73513d, 0.28);
scene.add(ambientLight);

const keyTarget = new THREE.Object3D();
const fillTarget = new THREE.Object3D();
keyTarget.position.copy(AIM);
fillTarget.position.copy(AIM);
scene.add(keyTarget, fillTarget);

const keyDirectional = new THREE.DirectionalLight(0xfff0d9, 1.75);
keyDirectional.target = keyTarget;
keyDirectional.castShadow = true;
keyDirectional.shadow.mapSize.set(2048, 2048);
keyDirectional.shadow.camera.left = -3.2;
keyDirectional.shadow.camera.right = 3.2;
keyDirectional.shadow.camera.top = 3.2;
keyDirectional.shadow.camera.bottom = -2.4;
keyDirectional.shadow.camera.near = 0.1;
keyDirectional.shadow.camera.far = 14;
keyDirectional.shadow.bias = -0.0004;
keyDirectional.shadow.normalBias = 0.022;
keyDirectional.shadow.radius = 3.5;
keyDirectional.shadow.blurSamples = 16;
scene.add(keyDirectional);

const keySoftbox = new THREE.RectAreaLight(0xffe6c9, 6.2, 2.4, 1.6);
scene.add(keySoftbox);

const fillDirectional = new THREE.DirectionalLight(0xe8f2ff, 0.46);
fillDirectional.target = fillTarget;
scene.add(fillDirectional);

const fillSoftbox = new THREE.RectAreaLight(0xe4efff, 2.5, 1.9, 1.35);
scene.add(fillSoftbox);

const reflectorTarget = new THREE.Object3D();
reflectorTarget.position.set(-0.02, 0.48, 0.12);
scene.add(reflectorTarget);

const reflectorBounce = new THREE.RectAreaLight(0xfff9ed, 1.85, 1.35, 0.9);
scene.add(reflectorBounce);

function planToWorld(light) {
  return {
    x: (light.u - 0.5) * 5.9,
    z: (light.v - 0.55) * 4.9,
  };
}

function updateLights() {
  const keyPosition = planToWorld(state.key);
  const fillPosition = planToWorld(state.fill);
  const reflectorPosition = planToWorld(state.reflector);

  keyDirectional.position.set(keyPosition.x, 2.38, keyPosition.z);
  keyDirectional.intensity = Math.pow(state.key.power / 100, 1.08) * 2.5;
  keySoftbox.position.set(keyPosition.x, 2.18, keyPosition.z);
  keySoftbox.lookAt(AIM);
  keySoftbox.intensity = Math.pow(state.key.power / 100, 1.1) * 5.7;

  fillDirectional.position.set(fillPosition.x, 1.88, fillPosition.z);
  fillDirectional.intensity = Math.pow(state.fill.power / 100, 1.1) * 0.7;
  fillSoftbox.position.set(fillPosition.x, 1.78, fillPosition.z);
  fillSoftbox.lookAt(AIM);
  fillSoftbox.intensity = Math.pow(state.fill.power / 100, 1.08) * 2.9;

  reflectorBounce.position.set(reflectorPosition.x, 0.7, reflectorPosition.z);
  reflectorBounce.lookAt(reflectorTarget.position);
  reflectorBounce.intensity = Math.pow(state.reflector.power / 100, 1.1) * 2.5;
}

function updateCamera() {
  camera.fov = lensToFov(state.lens);
  camera.position.set(0.1, state.cameraHeight / 100, 5.72);
  camera.aspect = cropAspect();
  camera.lookAt(CAMERA_TARGET);
  camera.updateProjectionMatrix();
  requestRender();
}

function resizePreview() {
  if (!refs.previewShell) return;
  const shellRect = refs.previewShell.getBoundingClientRect();
  if (shellRect.width <= 0 || shellRect.height <= 0) return;

  const aspect = cropAspect();
  const availableWidth = Math.max(40, shellRect.width - 8);
  const availableHeight = Math.max(40, shellRect.height - 8);
  const height = Math.min(availableHeight, availableWidth / aspect);
  const width = height * aspect;

  refs.previewFrame.style.width = `${width}px`;
  refs.previewFrame.style.height = `${height}px`;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.round(width), Math.round(height), false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  requestRender();
}

async function exportPng() {
  if (exporting) return;
  exporting = true;
  refs.exportButton.disabled = true;
  refs.exportLabel.textContent = 'Rendering…';

  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
    const width = OUTPUT_WIDTH;
    const height = state.crop === 'portrait' ? Math.round(OUTPUT_WIDTH * 5 / 4) : OUTPUT_WIDTH;

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const blob = await new Promise((resolve) => renderer.domElement.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The browser returned an empty PNG');

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    resizePreview();

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `lumen-stoneware-mug-${state.crop}-${Date.now()}.png`;
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

    refs.exportLabel.textContent = 'Exported';
    showToast(`${width} × ${height} PNG exported`);
    window.setTimeout(() => {
      refs.exportLabel.textContent = 'Export PNG';
      refs.exportButton.disabled = false;
      exporting = false;
    }, 1500);
  } catch (error) {
    console.error('PNG export failed', error);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    resizePreview();
    refs.exportLabel.textContent = 'Try again';
    showToast('Could not render the PNG');
    window.setTimeout(() => {
      refs.exportLabel.textContent = 'Export PNG';
      refs.exportButton.disabled = false;
      exporting = false;
    }, 1500);
  }
}

function updateCropUI() {
  const isPortrait = state.crop === 'portrait';
  const ratioLabel = isPortrait ? '4:5' : '1:1';
  const dimensions = isPortrait ? '1600 × 2000' : '1600 × 1600';

  refs.cropOptions.forEach((button) => {
    const active = button.dataset.crop === state.crop;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  refs.cropInfo.textContent = `${ratioLabel} · 1600 px`;
  refs.frameMeta.textContent = ratioLabel;
  refs.renderMeta.textContent = dimensions;
  refs.previewSettings.textContent = `${state.lens} MM · ${ratioLabel}`;
}

function updateBackdropUI() {
  refs.backdropName.textContent = state.backdropName;
  refs.backdropColor.value = state.backdrop;
  const presetMatch = BACKDROP_PRESETS.some((preset) => preset.color.toLowerCase() === state.backdrop.toLowerCase());

  refs.swatches.forEach((swatch) => {
    const active = swatch.dataset.color.toLowerCase() === state.backdrop.toLowerCase();
    swatch.classList.toggle('is-active', active);
    swatch.setAttribute('aria-pressed', String(active));
  });

  refs.customSwatch.classList.toggle('is-active', !presetMatch);
}

function applyBackdrop(color, name) {
  state.backdrop = color.toLowerCase();
  state.backdropName = name;
  scene.background.set(state.backdrop);
  backdropMaterial.color.set(state.backdrop);
  updateBackdropUI();
  requestRender();
  scheduleSave();
}

function updateRangeUI(input, output, value, suffix = '%') {
  input.value = String(value);
  output.textContent = `${Math.round(value)}${suffix}`;
  setRangeFill(input);
}

function positionPlanNode(element, light) {
  element.style.left = `${light.u * 100}%`;
  element.style.top = `${light.v * 100}%`;
  const dx = 0.5 - light.u;
  const dy = 0.55 - light.v;
  const angle = THREE.MathUtils.radToDeg(Math.atan2(dy, dx)) + 90;
  element.style.setProperty('--angle', `${angle}deg`);
  element.setAttribute('aria-valuetext', `${Math.round(light.u * 100)} percent across, ${Math.round(light.v * 100)} percent down`);
}

function updatePlanUI() {
  positionPlanNode(refs.planKey, state.key);
  positionPlanNode(refs.planFill, state.fill);
  positionPlanNode(refs.planReflector, state.reflector);
}

function updateLensUI() {
  updateRangeUI(refs.lensSlider, refs.lensOutput, state.lens, ' mm');
  refs.previewSettings.textContent = `${state.lens} MM · ${state.crop === 'portrait' ? '4:5' : '1:1'}`;
}

function updateHeightUI() {
  updateRangeUI(refs.heightSlider, refs.heightOutput, state.cameraHeight, ' cm');
}

function syncAllUI() {
  updateBackdropUI();
  updateCropUI();
  updateLensUI();
  updateHeightUI();
  updateRangeUI(refs.keyPower, refs.keyOutput, state.key.power);
  updateRangeUI(refs.fillPower, refs.fillOutput, state.fill.power);
  updateRangeUI(refs.reflectorPower, refs.reflectorOutput, state.reflector.power);
  updatePlanUI();
}

function updateSaveStatus(text, mode = 'saved') {
  refs.saveStatusText.textContent = text;
  refs.saveStatus.classList.toggle('is-saving', mode === 'saving');
  refs.saveStatus.classList.toggle('is-error', mode === 'error');
}

function persistState(notify = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSaveStatus('Saved locally');
    if (notify) showToast('Setup saved to this browser');
  } catch (error) {
    updateSaveStatus('Session only', 'error');
    if (notify) showToast('Browser storage is unavailable');
  }
}

function scheduleSave() {
  updateSaveStatus('Saving…', 'saving');
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => persistState(false), 480);
}

function showToast(message) {
  refs.toastText.textContent = message;
  refs.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 2400);
}

function resetStudio() {
  state = cloneDefaultState();
  applyStateToScene();
  syncAllUI();
  resizePreview();
  persistState(false);
  showToast('Starting setup restored');
}

refs.swatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    applyBackdrop(swatch.dataset.color, swatch.dataset.name);
  });
});

refs.backdropColor.addEventListener('input', (event) => {
  applyBackdrop(event.target.value, 'Custom');
});

refs.cropOptions.forEach((button) => {
  button.addEventListener('click', () => {
    if (state.crop === button.dataset.crop) return;
    state.crop = button.dataset.crop;
    updateCropUI();
    updateCamera();
    resizePreview();
    scheduleSave();
  });
});

refs.lensSlider.addEventListener('input', (event) => {
  state.lens = Number(event.target.value);
  updateLensUI();
  updateCamera();
  scheduleSave();
});

refs.heightSlider.addEventListener('input', (event) => {
  state.cameraHeight = Number(event.target.value);
  updateHeightUI();
  updateCamera();
  scheduleSave();
});

refs.keyPower.addEventListener('input', (event) => {
  state.key.power = Number(event.target.value);
  updateRangeUI(refs.keyPower, refs.keyOutput, state.key.power);
  updateLights();
  requestRender();
  scheduleSave();
});

refs.fillPower.addEventListener('input', (event) => {
  state.fill.power = Number(event.target.value);
  updateRangeUI(refs.fillPower, refs.fillOutput, state.fill.power);
  updateLights();
  requestRender();
  scheduleSave();
});

refs.reflectorPower.addEventListener('input', (event) => {
  state.reflector.power = Number(event.target.value);
  updateRangeUI(refs.reflectorPower, refs.reflectorOutput, state.reflector.power);
  updateLights();
  requestRender();
  scheduleSave();
});

function setupPlanDragging(element, key) {
  const startDrag = (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
    dragState = {
      key,
      element,
      pointerId: event.pointerId,
      rect: refs.lightPlan.getBoundingClientRect(),
    };
  };

  const moveDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.key !== key) return;
    event.preventDefault();
    const rect = dragState.rect;
    state[key].u = clamp((event.clientX - rect.left) / rect.width, 0.07, 0.93);
    state[key].v = clamp((event.clientY - rect.top) / rect.height, 0.08, 0.91);
    positionPlanNode(element, state[key]);
    updateLights();
    requestRender();
  };

  const endDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragState.element.classList.remove('is-dragging');
    dragState = null;
    scheduleSave();
  };

  element.addEventListener('pointerdown', startDrag);
  element.addEventListener('pointermove', moveDrag);
  element.addEventListener('pointerup', endDrag);
  element.addEventListener('pointercancel', endDrag);
  element.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.04 : 0.015;
    let handled = true;
    if (event.key === 'ArrowLeft') state[key].u -= step;
    else if (event.key === 'ArrowRight') state[key].u += step;
    else if (event.key === 'ArrowUp') state[key].v -= step;
    else if (event.key === 'ArrowDown') state[key].v += step;
    else handled = false;

    if (handled) {
      event.preventDefault();
      state[key].u = clamp(state[key].u, 0.07, 0.93);
      state[key].v = clamp(state[key].v, 0.08, 0.91);
      positionPlanNode(element, state[key]);
      updateLights();
      requestRender();
      scheduleSave();
    }
  });
}

setupPlanDragging(refs.planKey, 'key');
setupPlanDragging(refs.planFill, 'fill');
setupPlanDragging(refs.planReflector, 'reflector');

refs.saveButton.addEventListener('click', () => {
  window.clearTimeout(saveTimer);
  persistState(true);
});

refs.resetButton.addEventListener('click', resetStudio);
refs.exportButton.addEventListener('click', exportPng);

function applyStateToScene() {
  scene.background.set(state.backdrop);
  backdropMaterial.color.set(state.backdrop);
  updateLights();
  updateCamera();
}

syncAllUI();
applyStateToScene();
updateSaveStatus('Saved locally');

if ('ResizeObserver' in window) {
  const previewObserver = new ResizeObserver(resizePreview);
  previewObserver.observe(refs.previewShell);
} else {
  window.addEventListener('resize', resizePreview);
}
window.addEventListener('resize', resizePreview);

requestAnimationFrame(() => {
  resizePreview();
  renderer.render(scene, camera);
});

window.__LUMEN_STUDIO__ = {
  getState: () => JSON.parse(JSON.stringify(state)),
  getRendererInfo: () => ({
    width: renderer.domElement.width,
    height: renderer.domElement.height,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  }),
};
