import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BASIN,
  DEFAULT_SETTINGS,
  GAP,
  KICKER,
  LIMITS,
  MARBLE_RADIUS,
  START,
  TABLE,
  buildCourseLayout,
  supportPoints,
} from './course-data.js';
import {
  addBasinBodies,
  addSegmentBodies,
  createMarbleBody,
  createPhysicsWorld,
  launchMarble,
  resetMarble,
  segmentFrame,
} from './course-physics.js';


const dom = {
  scene: document.getElementById('scene'),
  attemptCount: document.getElementById('attemptCount'),
  courseCamBtn: document.getElementById('courseCamBtn'),
  followCamBtn: document.getElementById('followCamBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  pauseOverlay: document.getElementById('pauseOverlay'),
  resumeBtn: document.getElementById('resumeBtn'),
  impulseInput: document.getElementById('impulseInput'),
  impulseValue: document.getElementById('impulseValue'),
  angleInput: document.getElementById('angleInput'),
  angleValue: document.getElementById('angleValue'),
  releaseBtn: document.getElementById('releaseBtn'),
  retryBtn: document.getElementById('retryBtn'),
  resetBtn: document.getElementById('resetBtn'),
  runStatus: document.getElementById('runStatus'),
  stateBadge: document.getElementById('stateBadge'),
  deckHint: document.getElementById('deckHint'),
  resultCard: document.getElementById('resultCard'),
  resultKicker: document.getElementById('resultKicker'),
  resultTitle: document.getElementById('resultTitle'),
  resultText: document.getElementById('resultText'),
  resultRetryBtn: document.getElementById('resultRetryBtn'),
  resultTuneBtn: document.getElementById('resultTuneBtn'),
  srStatus: document.getElementById('srStatus'),
};
const releaseLabel = dom.releaseBtn.querySelector('span:nth-of-type(2)');
const pauseLabel = dom.pauseBtn.querySelector('span');

const state = {
  mode: 'ready',
  paused: false,
  attempts: 0,
  impulse: DEFAULT_SETTINGS.impulse,
  rampAngle: DEFAULT_SETTINGS.rampAngle,
  cameraMode: 'course',
  attemptTime: 0,
  settleTime: 0,
  launchPulse: 0,
  successFx: 0,
  failFx: 0,
  trailDistance: 0,
  lastTrailPoint: new THREE.Vector3(START.spawn.x, START.spawn.y, START.spawn.z),
  readyPulse: 0,
};

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
const gl = renderer.getContext();
const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
const gpuRenderer = debugRendererInfo
  ? String(gl.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL))
  : '';
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software/i.test(gpuRenderer);
const renderPixelRatio = Math.min(window.devicePixelRatio || 1, SOFTWARE_RENDERER ? 1.25 : 1.8)
  * (SOFTWARE_RENDERER ? 0.68 : 1);
renderer.setPixelRatio(Math.max(0.6, renderPixelRatio));
renderer.setSize(dom.scene.clientWidth, dom.scene.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
dom.scene.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = createBackdropTexture();
scene.fog = new THREE.Fog(0x0a222b, 32, 56);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(-8.4, 16.2, 22.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.target.set(0, 0.55, 0.5);
controls.minDistance = 9;
controls.maxDistance = 44;
controls.minPolarAngle = 0.24;
controls.maxPolarAngle = Math.PI * 0.475;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.zoomSpeed = 0.8;
controls.rotateSpeed = 0.7;
controls.update();

if (SOFTWARE_RENDERER) {
  scene.environment = makeCubeEnvironment();
} else {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment(renderer);
  scene.environment = pmrem.fromScene(environmentScene, 0.04).texture;
  environmentScene.traverse((object) => {
    if (object.isMesh) {
      object.geometry?.dispose();
      object.material?.dispose();
    }
  });
  pmrem.dispose();
}

const hemiLight = new THREE.HemisphereLight(0xc8f1ff, 0x2a1712, 1.65);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff3dc, 2.85);
keyLight.position.set(8.5, 17.5, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(SOFTWARE_RENDERER ? 1024 : 2048, SOFTWARE_RENDERER ? 1024 : 2048);
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 16;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 45;
keyLight.shadow.bias = -0.00025;
keyLight.shadow.normalBias = 0.035;
keyLight.target.position.set(0, 0, 1);
scene.add(keyLight);
scene.add(keyLight.target);

const rimLight = new THREE.DirectionalLight(0x76d8ff, 1.2);
rimLight.position.set(-10, 8, -8);
scene.add(rimLight);

const mintFill = new THREE.PointLight(0x58f4d4, 11, 9, 2);
mintFill.position.set(-4.2, 3.4, 2.8);
scene.add(mintFill);

const coralFill = new THREE.PointLight(0xff745e, 8, 8, 2);
coralFill.position.set(4.5, 2.8, -4.2);
scene.add(coralFill);

const textureSettings = {
  wood: makeWoodTexture(),
  marble: makeMarbleTexture(),
  finish: makeFinishTexture(),
  gap: makeGapTexture(),
  arrow: makeArrowTexture(),
};

const materials = {
  wood: new THREE.MeshStandardMaterial({
    map: textureSettings.wood,
    color: 0xd59a68,
    roughness: 0.72,
    metalness: 0.02,
    envMapIntensity: 0.35,
  }),
  woodEdge: new THREE.MeshStandardMaterial({
    color: 0x4e291d,
    roughness: 0.75,
    metalness: 0.02,
  }),
  support: new THREE.MeshStandardMaterial({
    color: 0x1b4b53,
    roughness: 0.44,
    metalness: 0.3,
    envMapIntensity: 0.7,
  }),
  supportBand: new THREE.MeshStandardMaterial({
    color: 0xffc74f,
    roughness: 0.38,
    metalness: 0.25,
    emissive: 0x4b2d00,
    emissiveIntensity: 0.35,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xffc74f,
    roughness: 0.32,
    metalness: 0.55,
    emissive: 0x5b3500,
    emissiveIntensity: 0.25,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x102f37,
    roughness: 0.42,
    metalness: 0.35,
    envMapIntensity: 0.6,
  }),
  cream: new THREE.MeshStandardMaterial({
    color: 0xfff2d2,
    roughness: 0.4,
    metalness: 0.05,
    envMapIntensity: 0.5,
  }),
  coral: new THREE.MeshStandardMaterial({
    color: 0xff685b,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x3f0c08,
    emissiveIntensity: 0.25,
  }),
  mint: new THREE.MeshStandardMaterial({
    color: 0x59efce,
    roughness: 0.3,
    metalness: 0.16,
    emissive: 0x0c4d40,
    emissiveIntensity: 0.55,
  }),
  violet: new THREE.MeshStandardMaterial({
    color: 0x6e5bcc,
    roughness: 0.4,
    metalness: 0.18,
    emissive: 0x180d46,
    emissiveIntensity: 0.3,
  }),
  basinFloor: new THREE.MeshStandardMaterial({
    color: 0x092f36,
    roughness: 0.44,
    metalness: 0.22,
    envMapIntensity: 0.8,
  }),
};

const trackMaterialCache = new Map();
const railMaterialCache = new Map();
const railCapMaterialCache = new Map();

const { world, materials: physicsMaterials } = createPhysicsWorld();
let layout = buildCourseLayout(state.rampAngle);
let marbleBody = createMarbleBody(physicsMaterials);
world.addBody(marbleBody);

let trail;
let dust;

const courseGroup = new THREE.Group();
courseGroup.name = 'course';
scene.add(courseGroup);

let kickerVisual = null;
let kickerBodies = [];
let kickerLabel = null;

for (const segment of layout.segments) {
  if (segment.stage === 'kicker') continue;
  addSegmentBodies(world, physicsMaterials, segment);
  courseGroup.add(createSegmentVisual(segment));
}
addBasinBodies(world, physicsMaterials);

buildTable();
buildSupports();
buildStartGate();
buildBasin();
buildGapWarning();
buildDust();
rebuildKicker(state.rampAngle);

const finishGlow = new THREE.PointLight(0x64ffe0, 10, 5.5, 2);
finishGlow.position.set(BASIN.center.x, 1.2, BASIN.center.z);
scene.add(finishGlow);

const finishPulse = new THREE.Mesh(
  new THREE.RingGeometry(1.32, 1.48, 64),
  new THREE.MeshBasicMaterial({
    color: 0x66ffe2,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
finishPulse.rotation.x = -Math.PI / 2;
finishPulse.position.set(BASIN.center.x, 0.19, BASIN.center.z);
scene.add(finishPulse);

const startPulse = new THREE.Mesh(
  new THREE.TorusGeometry(MARBLE_RADIUS * 1.38, 0.012, 8, 48),
  new THREE.MeshBasicMaterial({
    color: 0x84ffe8,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
startPulse.rotation.x = Math.PI / 2;
startPulse.position.set(START.spawn.x, 4.067, START.spawn.z);
scene.add(startPulse);

const marbleGroup = new THREE.Group();
const marbleMesh = new THREE.Mesh(
  new THREE.SphereGeometry(MARBLE_RADIUS, 64, 48),
  new THREE.MeshPhysicalMaterial({
    map: textureSettings.marble,
    color: 0xffffff,
    metalness: 0.58,
    roughness: 0.055,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 2.7,
  }),
);
marbleMesh.castShadow = true;
marbleMesh.receiveShadow = true;
marbleGroup.add(marbleMesh);

const marbleHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  color: 0x8cffe8,
  transparent: true,
  opacity: 0.38,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
}));
marbleHalo.scale.setScalar(1.2);
marbleGroup.add(marbleHalo);

const marbleLight = new THREE.PointLight(0x83ffe9, 1.9, 2.2, 2);
marbleGroup.add(marbleLight);
scene.add(marbleGroup);
syncMarbleVisual();
setupTrail();

const celebrationGroup = new THREE.Group();
scene.add(celebrationGroup);
const celebrationParticles = [];

const launcher = buildLauncher();
courseGroup.add(launcher.group);

let savedCourseView = {
  position: camera.position.clone(),
  target: controls.target.clone(),
};
let cameraTransition = null;
let followLook = new THREE.Vector3(START.spawn.x, START.spawn.y, START.spawn.z);
let hasUserOrbited = false;


setOverviewCamera(true);
bindControls();
updateSliderVisuals();
updateUI();

const clock = new THREE.Clock();
let accumulator = 0;
let physicsFrame = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.28);
  updateSimulation(dt);
  updateCamera(dt);
  updateEffects(dt);
  renderer.render(scene, camera);
}

function updateSimulation(dt) {
  const shouldStep = !state.paused && (state.mode === 'running' || (state.mode === 'success' && state.settleTime > 0));
  if (shouldStep) {
    accumulator = Math.min(accumulator + dt, 0.3);
    const step = 1 / 120;
    let steps = 0;
    while (accumulator >= step && steps < 36) {
      world.step(step);
      accumulator -= step;
      steps += 1;
      physicsFrame += 1;
      if (state.mode === 'running') {
        state.attemptTime += step;
        checkAttemptResult();
        if (state.mode !== 'running') break;
      }
    }

    if (state.mode === 'success' && state.settleTime > 0) {
      state.settleTime -= dt;
      if (state.settleTime <= 0) {
        marbleBody.velocity.setZero();
        marbleBody.angularVelocity.setZero();
      }
    }

    if (state.mode === 'running' && state.attemptTime > 18) {
      failAttempt('timeout');
    }
  }

  syncMarbleVisual();
  updateTrail(dt);
  launcher.update(dt);
}

function checkAttemptResult() {
  const p = marbleBody.position;
  const distanceToFinish = Math.hypot(p.x - BASIN.center.x, p.z - BASIN.center.z);
  if (distanceToFinish < BASIN.successRadius && p.y < BASIN.floorTop + 0.76) {
    succeedAttempt();
    return;
  }
  if (p.y < 0.23) {
    failAttempt('fall');
  }
}

function releaseAttempt() {
  if (state.mode === 'running') return;
  if (!Number.isFinite(state.impulse) || !Number.isFinite(state.rampAngle)) return;
  state.mode = 'running';
  state.paused = false;
  state.attempts += 1;
  state.attemptTime = 0;
  state.settleTime = 0;
  state.launchPulse = 0.42;
  state.successFx = 0;
  state.trailDistance = 0;
  clearCelebration();
  state.lastTrailPoint.set(START.spawn.x, START.spawn.y, START.spawn.z);
  accumulator = 0;
  hideResult();
  resetMarble(marbleBody);
  launchMarble(marbleBody, state.impulse);
  marbleBody.linearDamping = 0.006;
  marbleBody.angularDamping = 0.035;
  clearTrail();
  syncMarbleVisual();
  launcher.trigger();
  dom.srStatus.textContent = `Attempt ${state.attempts} started.`;
  updateUI();
}

function succeedAttempt() {
  if (state.mode !== 'running') return;
  state.mode = 'success';
  state.settleTime = 1.15;
  state.successFx = 1.4;
  state.paused = false;
  marbleBody.linearDamping = 0.4;
  marbleBody.angularDamping = 0.48;
  spawnCelebration();
  dom.resultKicker.textContent = 'RUN COMPLETE';
  dom.resultTitle.textContent = 'Basin reached!';
  dom.resultText.textContent = `Attempt ${state.attempts} cleared the gap in ${state.attemptTime.toFixed(1)}s.`;
  showResult('success');
  dom.srStatus.textContent = 'Success. The marble reached the finish basin.';
  updateUI();
}

function failAttempt(reason) {
  if (state.mode !== 'running') return;
  state.mode = 'failed';
  state.paused = false;
  state.failFx = 0.45;
  state.paused = false;
  marbleBody.velocity.setZero();
  marbleBody.angularVelocity.setZero();
  dom.resultKicker.textContent = reason === 'timeout' ? 'RUN TIMED OUT' : 'MARBLE OFF COURSE';
  dom.resultTitle.textContent = reason === 'timeout' ? 'Lost momentum.' : 'Missed the course.';
  dom.resultText.textContent = reason === 'timeout'
    ? 'The marble stalled before the basin. Add more launch impulse.'
    : 'The marble fell off the run. Retry the same setup or tune it.';
  showResult('failed');
  dom.srStatus.textContent = 'Failure. The marble fell off the course.';
  updateUI();
}

function retryAttempt() {
  state.mode = 'ready';
  state.paused = false;
  state.attemptTime = 0;
  state.settleTime = 0;
  accumulator = 0;
  resetMarble(marbleBody);
  marbleBody.linearDamping = 0.006;
  marbleBody.angularDamping = 0.035;
  clearTrail();
  clearCelebration();
  syncMarbleVisual();
  hideResult();
  hidePauseOverlay();
  dom.srStatus.textContent = 'Marble returned to the start. Settings preserved.';
  updateUI();
}

function resetEverything() {
  state.mode = 'ready';
  state.paused = false;
  state.attempts = 0;
  state.impulse = DEFAULT_SETTINGS.impulse;
  state.rampAngle = DEFAULT_SETTINGS.rampAngle;
  state.attemptTime = 0;
  state.settleTime = 0;
  state.successFx = 0;
  state.failFx = 0;
  state.trailDistance = 0;
  accumulator = 0;
  clearTrail();
  resetMarble(marbleBody);
  marbleBody.linearDamping = 0.006;
  marbleBody.angularDamping = 0.035;
  syncMarbleVisual();
  dom.impulseInput.value = state.impulse.toFixed(1);
  dom.angleInput.value = String(state.rampAngle);
  rebuildKicker(state.rampAngle);
  updateSliderVisuals();
  hideResult();
  hidePauseOverlay();
  clearCelebration();
  setCameraMode('course', true);
  resetOverviewCamera();
  dom.srStatus.textContent = 'Full reset complete.';
  updateUI();
}

function togglePause() {
  if (state.mode !== 'running') return;
  state.paused = !state.paused;
  if (state.paused) {
    showPauseOverlay();
    dom.srStatus.textContent = 'Simulation paused.';
  } else {
    hidePauseOverlay();
    dom.srStatus.textContent = 'Simulation resumed.';
  }
  updateUI();
}

function updateUI() {
  dom.attemptCount.textContent = String(state.attempts).padStart(2, '0');
  dom.impulseValue.textContent = state.impulse.toFixed(1);
  dom.angleValue.textContent = `${Math.round(state.rampAngle)}°`;

  const locked = state.mode === 'running';
  dom.impulseInput.disabled = locked;
  dom.angleInput.disabled = locked;
  dom.releaseBtn.disabled = locked;
  dom.pauseBtn.disabled = state.mode !== 'running';

  dom.stateBadge.className = 'status-pill';
  if (state.paused) {
    dom.stateBadge.classList.add('running');
    dom.stateBadge.querySelector('span').textContent = 'PAUSED';
  } else if (state.mode === 'running') {
    dom.stateBadge.classList.add('running');
    dom.stateBadge.querySelector('span').textContent = 'ROLLING';
  } else if (state.mode === 'success') {
    dom.stateBadge.classList.add('success');
    dom.stateBadge.querySelector('span').textContent = 'CLEARED';
  } else if (state.mode === 'failed') {
    dom.stateBadge.classList.add('failed');
    dom.stateBadge.querySelector('span').textContent = 'MISSED';
  } else {
    dom.stateBadge.classList.add('ready');
    dom.stateBadge.querySelector('span').textContent = 'READY';
  }

  if (state.paused) {
    dom.runStatus.textContent = 'Run paused';
    dom.deckHint.textContent = 'Resume when you are ready. Your setup stays locked.';
    releaseLabel.textContent = 'MARBLE ROLLING';
  } else if (state.mode === 'running') {
    dom.runStatus.textContent = 'Marble in motion';
    dom.deckHint.textContent = 'The setup is locked until this attempt ends.';
    releaseLabel.textContent = 'MARBLE ROLLING';
  } else if (state.mode === 'success') {
    dom.runStatus.textContent = 'Basin reached';
    dom.deckHint.textContent = 'Nice shot. Retry the same setup or tune the next run.';
    releaseLabel.textContent = 'RUN AGAIN';
  } else if (state.mode === 'failed') {
    dom.runStatus.textContent = 'Marble off course';
    dom.deckHint.textContent = 'Adjust the impulse or ramp angle, then release again.';
    releaseLabel.textContent = 'TRY AGAIN';
  } else {
    dom.runStatus.textContent = 'Ready to roll';
    dom.deckHint.textContent = 'Set the power and ramp angle before you release.';
    releaseLabel.textContent = 'RELEASE MARBLE';
  }

  const paused = state.paused;
  dom.pauseBtn.classList.toggle('is-paused', paused);
  pauseLabel.textContent = paused ? 'Resume' : 'Pause';
  dom.pauseBtn.setAttribute('aria-label', paused ? 'Resume simulation' : 'Pause simulation');
  dom.pauseOverlay.setAttribute('aria-hidden', String(!paused));
  dom.courseCamBtn.classList.toggle('active', state.cameraMode === 'course');
  dom.followCamBtn.classList.toggle('active', state.cameraMode === 'follow');
  dom.courseCamBtn.setAttribute('aria-pressed', String(state.cameraMode === 'course'));
  dom.followCamBtn.setAttribute('aria-pressed', String(state.cameraMode === 'follow'));
}

function showResult(type) {
  dom.resultCard.classList.remove('success', 'failed', 'visible');
  dom.resultCard.classList.add(type);
  void dom.resultCard.offsetWidth;
  dom.resultCard.classList.add('visible');
}

function hideResult() {
  dom.resultCard.classList.remove('visible');
}

function showPauseOverlay() {
  dom.pauseOverlay.classList.add('visible');
  dom.pauseOverlay.setAttribute('aria-hidden', 'false');
}

function hidePauseOverlay() {
  dom.pauseOverlay.classList.remove('visible');
  dom.pauseOverlay.setAttribute('aria-hidden', 'true');
}

function dismissResultForTuning() {
  hideResult();
  clearCelebration();
  if (state.mode === 'success' || state.mode === 'failed') {
    state.mode = 'ready';
    state.attemptTime = 0;
    updateUI();
  }
}

function onSettingChange() {
  if (state.mode === 'running') return;
  if (state.mode === 'success' || state.mode === 'failed') {
    hideResult();
    clearCelebration();
    state.mode = 'ready';
  }
  updateUI();
}

function bindControls() {
  dom.impulseInput.addEventListener('input', () => {
    state.impulse = Number(dom.impulseInput.value);
    updateSliderVisuals();
    onSettingChange();
  });

  dom.angleInput.addEventListener('input', () => {
    state.rampAngle = Number(dom.angleInput.value);
    updateSliderVisuals();
    rebuildKicker(state.rampAngle);
    onSettingChange();
  });

  dom.releaseBtn.addEventListener('click', releaseAttempt);
  dom.retryBtn.addEventListener('click', retryAttempt);
  dom.resetBtn.addEventListener('click', resetEverything);
  dom.pauseBtn.addEventListener('click', togglePause);
  dom.resumeBtn.addEventListener('click', togglePause);
  dom.resultRetryBtn.addEventListener('click', retryAttempt);
  dom.resultTuneBtn.addEventListener('click', dismissResultForTuning);
  dom.courseCamBtn.addEventListener('click', () => setCameraMode('course'));
  dom.followCamBtn.addEventListener('click', () => setCameraMode('follow'));

  controls.addEventListener('end', () => {
    if (state.cameraMode === 'course' && !cameraTransition) {
      savedCourseView.position.copy(camera.position);
      savedCourseView.target.copy(controls.target);
      hasUserOrbited = true;
    }
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'button' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'Space') {
      event.preventDefault();
      if (state.mode === 'running') togglePause();
      else releaseAttempt();
    } else if (event.code === 'KeyP') {
      togglePause();
    } else if (event.code === 'KeyR') {
      retryAttempt();
    } else if (event.code === 'KeyF') {
      setCameraMode('follow');
    } else if (event.code === 'KeyC') {
      setCameraMode('course');
    }
  });
}

function onResize() {
  const width = dom.scene.clientWidth;
  const height = dom.scene.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / Math.max(height, 1);
  camera.fov = camera.aspect < 0.72 ? 57 : 45;
  camera.updateProjectionMatrix();
  if (!hasUserOrbited && state.cameraMode === 'course' && !cameraTransition) {
    resetOverviewCamera();
  }
}

function updateSliderVisuals() {
  setSliderFill(dom.impulseInput, LIMITS.impulse);
  setSliderFill(dom.angleInput, LIMITS.rampAngle);
}

function setSliderFill(input, limits) {
  const fill = ((Number(input.value) - limits.min) / (limits.max - limits.min)) * 100;
  input.style.setProperty('--fill', `${fill}%`);
}

function setCameraMode(mode, instant = false) {
  if (mode === state.cameraMode && !instant) return;
  if (state.cameraMode === 'course' && mode !== 'course' && !cameraTransition) {
    savedCourseView.position.copy(camera.position);
    savedCourseView.target.copy(controls.target);
  }
  state.cameraMode = mode;
  if (mode === 'follow') {
    controls.enabled = false;
    cameraTransition = null;
    followLook.set(marbleBody.position.x, marbleBody.position.y + 0.2, marbleBody.position.z);
  } else if (instant) {
    controls.enabled = true;
    cameraTransition = null;
    camera.position.copy(savedCourseView.position);
    controls.target.copy(savedCourseView.target);
    controls.update();
  } else {
    controls.enabled = false;
    cameraTransition = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: savedCourseView.position.clone(),
      toTarget: savedCourseView.target.clone(),
      elapsed: 0,
      duration: 0.72,
    };
  }
  updateUI();
}

function updateCamera(dt) {
  if (cameraTransition) {
    cameraTransition.elapsed += dt;
    const t = Math.min(cameraTransition.elapsed / cameraTransition.duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, eased);
    controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, eased);
    camera.lookAt(controls.target);
    if (t >= 1) {
      cameraTransition = null;
      if (state.cameraMode === 'course') controls.enabled = true;
    }
    return;
  }

  if (state.cameraMode === 'follow') {
    const velocity = marbleBody.velocity;
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    const forward = horizontalSpeed > 0.5
      ? new THREE.Vector3(velocity.x, 0, velocity.z).normalize()
      : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const marblePosition = new THREE.Vector3(marbleBody.position.x, marbleBody.position.y, marbleBody.position.z);
    const desired = marblePosition.clone()
      .addScaledVector(forward, -5.1)
      .addScaledVector(side, 1.2)
      .add(new THREE.Vector3(0, 2.9, 0));
    desired.y = Math.max(desired.y, 1.45);
    desired.x = THREE.MathUtils.clamp(desired.x, -10, 10);
    desired.z = THREE.MathUtils.clamp(desired.z, -11, 11.5);

    const desiredLook = marblePosition.clone()
      .addScaledVector(forward, 1.15)
      .add(new THREE.Vector3(0, 0.28, 0));

    const positionAlpha = 1 - Math.exp(-4.4 * dt);
    const lookAlpha = 1 - Math.exp(-6.2 * dt);
    camera.position.lerp(desired, positionAlpha);
    followLook.lerp(desiredLook, lookAlpha);
    controls.target.copy(followLook);
    camera.lookAt(followLook);
  } else {
    controls.update();
  }
}

function updateEffects(dt) {
  state.readyPulse += dt;
  const readyFactor = state.mode === 'ready' ? (Math.sin(state.readyPulse * 3.2) + 1) * 0.5 : 0;
  startPulse.material.opacity = 0.35 + readyFactor * 0.45;
  startPulse.scale.setScalar(0.94 + readyFactor * 0.11);
  marbleHalo.material.opacity = state.mode === 'running' ? 0.3 + Math.sin(state.readyPulse * 8) * 0.06 : 0.42;
  finishGlow.intensity = 7 + Math.sin(state.readyPulse * 2.1) * 1.8 + state.successFx * 10;
  finishPulse.material.opacity = 0.22 + (Math.sin(state.readyPulse * 2.2) + 1) * 0.08 + state.successFx * 0.5;
  finishPulse.scale.setScalar(1 + state.successFx * 1.4);
  finishPulse.rotation.z += dt * 0.16;

  if (state.launchPulse > 0) {
    state.launchPulse = Math.max(0, state.launchPulse - dt);
  }
  if (state.failFx > 0) {
    state.failFx = Math.max(0, state.failFx - dt);
  }

  if (state.successFx > 0) {
    state.successFx = Math.max(0, state.successFx - dt * 0.55);
    for (const particle of celebrationParticles) {
      if (!particle.mesh.visible) continue;
      particle.life -= dt;
      particle.velocity.y -= 3.4 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += particle.spin.x * dt;
      particle.mesh.rotation.y += particle.spin.y * dt;
      particle.mesh.rotation.z += particle.spin.z * dt;
      if (particle.mesh.position.y < 0.1 || particle.life <= 0) {
        particle.mesh.visible = false;
      }
    }
  }

  for (const child of launcher.group.children) {
    if (child.userData.isPlunger) {
      const t = state.launchPulse > 0 ? 1 - state.launchPulse / 0.42 : 0;
      child.position.z = child.userData.baseZ + Math.sin(t * Math.PI) * 0.16;
    }
  }

  dust.rotation.y += dt * 0.005;
}

function syncMarbleVisual() {
  marbleGroup.position.set(marbleBody.position.x, marbleBody.position.y, marbleBody.position.z);
  marbleMesh.quaternion.set(
    marbleBody.quaternion.x,
    marbleBody.quaternion.y,
    marbleBody.quaternion.z,
    marbleBody.quaternion.w,
  );
}

function setupTrail() {
  const count = 84;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = START.spawn.x;
    positions[i * 3 + 1] = START.spawn.y;
    positions[i * 3 + 2] = START.spawn.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  trail = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x70ffe3,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  trail.frustumCulled = false;
  scene.add(trail);
}

function updateTrail() {
  if (state.mode !== 'running' && state.mode !== 'success') return;
  const point = new THREE.Vector3(marbleBody.position.x, marbleBody.position.y, marbleBody.position.z);
  if (point.distanceToSquared(state.lastTrailPoint) < 0.0008) return;
  state.lastTrailPoint.copy(point);
  const attribute = trail.geometry.attributes.position;
  for (let i = attribute.count - 1; i > 0; i--) {
    attribute.setXYZ(i, attribute.getX(i - 1), attribute.getY(i - 1), attribute.getZ(i - 1));
  }
  attribute.setXYZ(0, point.x, point.y, point.z);
  attribute.needsUpdate = true;
}

function clearTrail() {
  if (!trail) return;
  const attribute = trail.geometry.attributes.position;
  for (let i = 0; i < attribute.count; i++) {
    attribute.setXYZ(i, START.spawn.x, START.spawn.y, START.spawn.z);
  }
  attribute.needsUpdate = true;
}

function spawnCelebration() {
  clearCelebration();
  const colors = [0x59efce, 0xffc74f, 0xff685b, 0x9c8cff, 0xfff2d2, 0x54a7ff];
  const geometry = new THREE.BoxGeometry(0.09, 0.02, 0.15);
  for (let i = 0; i < 74; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      BASIN.center.x + (Math.random() - 0.5) * 0.8,
      BASIN.floorTop + 0.55 + Math.random() * 0.35,
      BASIN.center.z + (Math.random() - 0.5) * 0.8,
    );
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.5;
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 2.4 + Math.random() * 3.6, Math.sin(angle) * speed);
    const spin = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
    );
    celebrationGroup.add(mesh);
    celebrationParticles.push({ mesh, velocity, spin, life: 1.8 + Math.random() * 1.4 });
  }
}

function clearCelebration() {
  const geometries = new Set();
  for (const particle of celebrationParticles) {
    celebrationGroup.remove(particle.mesh);
    geometries.add(particle.mesh.geometry);
    particle.mesh.material.dispose();
  }
  geometries.forEach((geometry) => geometry.dispose());
  celebrationParticles.length = 0;
}

function rebuildKicker(angle) {
  if (kickerVisual) {
    courseGroup.remove(kickerVisual);
    disposeObject(kickerVisual);
    kickerVisual = null;
    kickerLabel = null;
  }
  for (const body of kickerBodies) {
    world.removeBody(body);
  }
  kickerBodies = [];

  layout = buildCourseLayout(angle);
  const kicker = layout.segments.find((segment) => segment.stage === 'kicker');
  kickerVisual = createSegmentVisual(kicker);
  const frame = segmentFrame(kicker);
  const lipPosition = {
    x: kicker.b.x + frame.normal.x * 0.06,
    y: kicker.b.y + frame.normal.y * 0.06,
    z: kicker.b.z + frame.normal.z * 0.06,
  };
  const lip = new THREE.Mesh(
    new RoundedBoxGeometry(kicker.width + 0.12, 0.09, 0.12, 3, 0.035),
    materials.coral,
  );
  lip.position.set(lipPosition.x, lipPosition.y, lipPosition.z);
  lip.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
  lip.castShadow = true;
  kickerVisual.add(lip);

  for (const sign of [-1, 1]) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), new THREE.MeshBasicMaterial({
      color: 0xffc74f,
      toneMapped: false,
    }));
    light.position.set(
      kicker.b.x + frame.side.x * sign * (kicker.width * 0.5 + 0.03) + frame.normal.x * 0.11,
      kicker.b.y + frame.side.y * sign * (kicker.width * 0.5 + 0.03) + frame.normal.y * 0.11,
      kicker.b.z + frame.side.z * sign * (kicker.width * 0.5 + 0.03) + frame.normal.z * 0.11,
    );
    kickerVisual.add(light);
  }

  kickerLabel = makeSprite(`${Math.round(angle)}°`, {
    accent: '#ffc74f',
    width: 250,
    height: 118,
    fontSize: 58,
    scaleX: 0.92,
    scaleY: 0.43,
  });
  kickerLabel.position.set(
    frame.midpoint.x,
    frame.midpoint.y + 0.72,
    frame.midpoint.z - 0.06,
  );
  kickerVisual.add(kickerLabel);
  courseGroup.add(kickerVisual);
  kickerBodies = addSegmentBodies(world, physicsMaterials, kicker);
}

function createSegmentVisual(segment) {
  const group = new THREE.Group();
  const frame = segmentFrame(segment);
  const length = frame.length + 0.075;
  const deckMaterial = getTrackMaterial(segment.color);
  const railMaterial = getRailMaterial(segment.railColor);
  const railCapMaterial = getRailCapMaterial(segment.color);

  const deck = new THREE.Mesh(
    new RoundedBoxGeometry(segment.width, segment.thickness, length, 4, 0.06),
    deckMaterial,
  );
  deck.position.set(
    frame.midpoint.x - frame.normal.x * segment.thickness * 0.5,
    frame.midpoint.y - frame.normal.y * segment.thickness * 0.5,
    frame.midpoint.z - frame.normal.z * segment.thickness * 0.5,
  );
  deck.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  if (segment.rails) {
    for (const sideSign of [-1, 1]) {
      const lateral = segment.width * 0.5 - segment.railThickness * 0.5;
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(segment.railThickness, segment.railHeight, length, 3, 0.035),
        railMaterial,
      );
      rail.position.set(
        frame.midpoint.x + frame.side.x * lateral * sideSign + frame.normal.x * segment.railHeight * 0.5,
        frame.midpoint.y + frame.side.y * lateral * sideSign + frame.normal.y * segment.railHeight * 0.5,
        frame.midpoint.z + frame.side.z * lateral * sideSign + frame.normal.z * segment.railHeight * 0.5,
      );
      rail.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(segment.railThickness * 0.56, 0.016, length * 0.97),
        railCapMaterial,
      );
      cap.position.set(
        frame.midpoint.x + frame.side.x * lateral * sideSign + frame.normal.x * (segment.railHeight + 0.008),
        frame.midpoint.y + frame.side.y * lateral * sideSign + frame.normal.y * (segment.railHeight + 0.008),
        frame.midpoint.z + frame.side.z * lateral * sideSign + frame.normal.z * (segment.railHeight + 0.008),
      );
      cap.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
      group.add(cap);
    }
  }

  group.userData.segment = segment;
  return group;
}

function getTrackMaterial(color) {
  if (!trackMaterialCache.has(color)) {
    trackMaterialCache.set(color, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.36,
      metalness: 0.08,
      envMapIntensity: 0.65,
    }));
  }
  return trackMaterialCache.get(color);
}

function getRailMaterial(color) {
  if (!railMaterialCache.has(color)) {
    railMaterialCache.set(color, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.16,
      envMapIntensity: 0.5,
    }));
  }
  return railMaterialCache.get(color);
}

function getRailCapMaterial(color) {
  if (!railCapMaterialCache.has(color)) {
    const emissive = new THREE.Color(color).multiplyScalar(0.18);
    railCapMaterialCache.set(color, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xfff2d2), 0.48),
      emissive,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.1,
    }));
  }
  return railCapMaterialCache.get(color);
}

function createRoundedMesh(width, height, depth, radius, material) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 4, radius),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildTable() {
  const table = new THREE.Mesh(
    new RoundedBoxGeometry(TABLE.size.x, TABLE.size.y, TABLE.size.z, 5, 0.32),
    materials.wood,
  );
  table.position.set(TABLE.center.x, TABLE.center.y, TABLE.center.z);
  table.receiveShadow = true;
  table.castShadow = true;
  scene.add(table);

  const apron = new THREE.Mesh(
    new RoundedBoxGeometry(TABLE.size.x - 0.6, 0.22, TABLE.size.z - 0.6, 3, 0.1),
    materials.woodEdge,
  );
  apron.position.set(TABLE.center.x, TABLE.center.y - 0.38, TABLE.center.z);
  apron.receiveShadow = true;
  scene.add(apron);

  const inset = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE.size.x - 1.4, TABLE.size.z - 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x9a5a39,
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  inset.rotation.x = -Math.PI / 2;
  inset.position.set(TABLE.center.x, 0.004, TABLE.center.z);
  inset.receiveShadow = true;
  scene.add(inset);

  const gapDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(GAP.size.x, GAP.size.z),
    new THREE.MeshStandardMaterial({
      map: textureSettings.gap,
      roughness: 0.7,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  gapDecal.rotation.x = -Math.PI / 2;
  gapDecal.position.set(GAP.center.x, GAP.center.y, GAP.center.z);
  gapDecal.receiveShadow = true;
  scene.add(gapDecal);

  const gapLabel = makeSprite('THE GAP', {
    accent: '#ffc74f',
    width: 360,
    height: 110,
    fontSize: 48,
    scaleX: 1.45,
    scaleY: 0.44,
  });
  gapLabel.position.set(0, 1.48, GAP.center.z);
  scene.add(gapLabel);
}

function buildSupports() {
  for (const point of supportPoints()) {
    const height = Math.max(0.15, point.y - 0.18);
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(point.radius * 1.35, point.radius * 1.65, height, 20),
      materials.support,
    );
    support.position.set(point.x, height * 0.5, point.z);
    support.castShadow = true;
    support.receiveShadow = true;
    scene.add(support);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(point.radius * 1.72, point.radius * 1.48, 0.09, 20),
      materials.supportBand,
    );
    collar.position.set(point.x, height - 0.045, point.z);
    collar.castShadow = true;
    scene.add(collar);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(point.radius * 2.3, point.radius * 2.55, 0.06, 24),
      materials.dark,
    );
    foot.position.set(point.x, 0.03, point.z);
    foot.receiveShadow = true;
    scene.add(foot);

    if (height > 1.2) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(point.radius * 1.44, 0.017, 8, 24),
        materials.mint,
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(point.x, height * 0.46, point.z);
      scene.add(band);
    }
  }
}

function buildStartGate() {
  const gate = new THREE.Group();
  const postGeometry = new THREE.BoxGeometry(0.16, 1.5, 0.18);
  for (const sign of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry, materials.dark);
    post.position.set(START.gate.x + sign * 1.02, START.gate.y + 0.78, START.gate.z);
    post.castShadow = true;
    gate.add(post);

    const light = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), materials.mint);
    light.position.set(START.gate.x + sign * 0.78, START.gate.y + 1.47, START.gate.z + 0.08);
    gate.add(light);
  }

  const beam = createRoundedMesh(2.3, 0.2, 0.2, 0.06, materials.dark);
  beam.position.set(START.gate.x, START.gate.y + 1.5, START.gate.z);
  gate.add(beam);

  const signBacking = createRoundedMesh(1.54, 0.62, 0.11, 0.08, materials.gold);
  signBacking.position.set(START.gate.x, START.gate.y + 1.76, START.gate.z - 0.01);
  gate.add(signBacking);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.5),
    new THREE.MeshStandardMaterial({
      map: makeBoardTexture('LAUNCH', '#ffc74f', 'SET  •  DROP  •  GO'),
      roughness: 0.42,
      metalness: 0.05,
      emissive: 0x3a2600,
      emissiveIntensity: 0.2,
    }),
  );
  sign.position.set(START.gate.x, START.gate.y + 1.76, START.gate.z + 0.05);
  gate.add(sign);

  const launchStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.34),
    new THREE.MeshBasicMaterial({
      map: makeTrackTextTexture('LAUNCH PAD'),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
  );
  launchStrip.rotation.x = -Math.PI / 2;
  launchStrip.position.set(START.spawn.x, 4.058, START.spawn.z + 0.16);
  gate.add(launchStrip);

  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, KICKER.width, 20),
    materials.gold,
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(KICKER.pivot.x, KICKER.pivot.y - 0.04, KICKER.pivot.z);
  hinge.castShadow = true;
  scene.add(hinge);

  scene.add(gate);
}

function buildLauncher() {
  const group = new THREE.Group();
  const base = createRoundedMesh(0.42, 0.28, 0.42, 0.06, materials.dark);
  base.position.set(0, 4.22, -8.92);
  group.add(base);

  const plunger = new THREE.Group();
  plunger.userData.isPlunger = true;
  plunger.userData.baseZ = -8.72;

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.075, 0.42, 14),
    materials.cream,
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.18;
  plunger.add(shaft);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.16, 20),
    materials.coral,
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.08;
  cap.castShadow = true;
  plunger.add(cap);

  plunger.position.set(0, 4.34, plunger.userData.baseZ);
  group.add(plunger);

  return {
    group,
    trigger() {
      state.launchPulse = 0.42;
    },
    update() {},
  };
}

function buildBasin() {
  const basin = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BASIN.outerRadius + 0.16, BASIN.outerRadius + 0.25, 0.27, 64),
    materials.violet,
  );
  base.position.set(BASIN.center.x, 0.015, BASIN.center.z);
  base.castShadow = true;
  base.receiveShadow = true;
  basin.add(base);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(BASIN.floorRadius, BASIN.floorRadius, 0.2, 64),
    materials.basinFloor,
  );
  floor.position.set(BASIN.center.x, BASIN.floorTop - 0.1, BASIN.center.z);
  floor.receiveShadow = true;
  floor.castShadow = true;
  basin.add(floor);

  const target = new THREE.Mesh(
    new THREE.CircleGeometry(BASIN.floorRadius - 0.05, 64),
    new THREE.MeshStandardMaterial({
      map: textureSettings.finish,
      roughness: 0.42,
      metalness: 0.18,
      emissiveMap: textureSettings.finish,
      emissive: 0x16473f,
      emissiveIntensity: 0.38,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  target.rotation.x = -Math.PI / 2;
  target.position.set(BASIN.center.x, BASIN.floorTop + 0.006, BASIN.center.z);
  target.receiveShadow = true;
  basin.add(target);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(BASIN.floorRadius, BASIN.outerRadius + 0.02, 64),
    materials.dark,
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(BASIN.center.x, BASIN.floorTop + 0.012, BASIN.center.z);
  basin.add(rim);

  const panelCount = 24;
  const panelLength = (Math.PI * 2 * BASIN.outerRadius / panelCount) * 1.12;
  const wallMaterials = [materials.coral, materials.mint, materials.gold, materials.violet];
  for (let i = 0; i < panelCount; i++) {
    const angle = (i / panelCount) * Math.PI * 2;
    const angleDelta = Math.atan2(
      Math.sin(angle - BASIN.entryAngle),
      Math.cos(angle - BASIN.entryAngle),
    );
    if (Math.abs(angleDelta) < 0.47) continue;

    const wall = new THREE.Mesh(
      new RoundedBoxGeometry(panelLength, BASIN.wallHeight, 0.14, 3, 0.035),
      wallMaterials[i % wallMaterials.length],
    );
    wall.position.set(
      BASIN.center.x + Math.cos(angle) * BASIN.outerRadius,
      BASIN.floorTop + BASIN.wallHeight * 0.5,
      BASIN.center.z + Math.sin(angle) * BASIN.outerRadius,
    );
    wall.rotation.y = -(angle + Math.PI / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    basin.add(wall);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(panelLength * 0.82, 0.026, 0.17),
      materials.cream,
    );
    cap.position.set(
      BASIN.center.x + Math.cos(angle) * BASIN.outerRadius,
      BASIN.floorTop + BASIN.wallHeight + 0.016,
      BASIN.center.z + Math.sin(angle) * BASIN.outerRadius,
    );
    cap.rotation.y = -(angle + Math.PI / 2);
    basin.add(cap);
  }

  const finishPostMaterial = materials.dark;
  for (const sign of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.05, 0.13), finishPostMaterial);
    post.position.set(BASIN.center.x + sign * 1.73, 1.02, BASIN.center.z + 1.95);
    post.castShadow = true;
    basin.add(post);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 3), sign < 0 ? materials.gold : materials.coral);
    flag.rotation.z = Math.PI / 2;
    flag.position.set(BASIN.center.x + sign * 1.5, 1.88, BASIN.center.z + 1.95);
    basin.add(flag);
  }

  const backing = createRoundedMesh(3.35, 0.72, 0.12, 0.08, materials.gold);
  backing.position.set(BASIN.center.x, 1.83, BASIN.center.z + 1.88);
  basin.add(backing);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.16, 0.58),
    new THREE.MeshStandardMaterial({
      map: makeBoardTexture('FINISH', '#59efce', 'DROP ZONE'),
      roughness: 0.38,
      metalness: 0.06,
      emissive: 0x0d3d35,
      emissiveIntensity: 0.35,
    }),
  );
  sign.position.set(BASIN.center.x, 1.83, BASIN.center.z + 1.95);
  basin.add(sign);

  const chevrons = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.5),
    new THREE.MeshBasicMaterial({
      map: textureSettings.arrow,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  chevrons.rotation.x = -Math.PI / 2;
  chevrons.position.set(0, 0.44, 7.36);
  basin.add(chevrons);

  scene.add(basin);
}

function buildGapWarning() {
  const hazardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc74f,
    roughness: 0.38,
    metalness: 0.08,
    emissive: 0x5b3600,
    emissiveIntensity: 0.4,
  });
  for (const z of [2.92, 5.16]) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.047, 0.52, 12), materials.dark);
      post.position.set(side * 1.48, 0.26, z);
      post.castShadow = true;
      scene.add(post);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), hazardMaterial);
      top.position.set(side * 1.48, 0.54, z);
      scene.add(top);
    }
  }
}

function buildDust() {
  const count = 160;
  const positions = new Float32Array(count * 3);
  const random = mulberry32(73119);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 24;
    positions[i * 3 + 1] = 1 + random() * 11;
    positions[i * 3 + 2] = (random() - 0.5) * 26;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dust = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xa7fff0,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(dust);
}

function setOverviewCamera(instant = false) {
  const view = getOverviewView();
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  if (instant) {
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
    savedCourseView.position.copy(view.position);
    savedCourseView.target.copy(view.target);
    return;
  }
  cameraTransition = {
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosition: view.position.clone(),
    toTarget: view.target.clone(),
    elapsed: 0,
    duration: 0.72,
  };
  controls.enabled = false;
  state.cameraMode = 'course';
}

function resetOverviewCamera() {
  setOverviewCamera(true);
  hasUserOrbited = false;
}

function getOverviewView() {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  if (aspect < 0.72) {
    return {
      position: new THREE.Vector3(9, 23, 29),
      target: new THREE.Vector3(0, 0.2, 0.3),
      fov: 57,
    };
  }
  return {
    position: new THREE.Vector3(-8.4, 16.2, 22.2),
    target: new THREE.Vector3(0, 0.55, 0.5),
    fov: 45,
  };
}

function disposeObject(root) {
  const sharedMaterials = new Set([
    ...Object.values(materials),
    ...trackMaterialCache.values(),
    ...railMaterialCache.values(),
    ...railCapMaterialCache.values(),
  ]);
  root.traverse((object) => {
    if (object.isMesh || object.isSprite || object.isLine) {
      object.geometry?.dispose();
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) {
        if (material && !sharedMaterials.has(material)) {
          material.map?.dispose();
          material.dispose();
        }
      }
    }
  });
}

function makeCubeEnvironment() {
  const colors = [
    ['#d9fff7', '#4fa4a4', '#183d48'],
    ['#ffe6c8', '#b5674e', '#22343d'],
    ['#ffffff', '#83d9d3', '#143640'],
    ['#9b8cff', '#31566c', '#081c25'],
    ['#ffd168', '#bb7454', '#162e37'],
    ['#65f1d4', '#418d92', '#09222c'],
  ];
  const faces = colors.map((colorsForFace, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, colorsForFace[0]);
    gradient.addColorStop(0.42, colorsForFace[1]);
    gradient.addColorStop(1, colorsForFace[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,.88)' : 'rgba(255,219,136,.72)';
    ctx.fillRect(12 + index * 5, 14, 24, 62);
    ctx.fillStyle = 'rgba(10,34,42,.65)';
    ctx.fillRect(62, 30 + index * 2, 44, 36);
    return canvas;
  });
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  return cube;
}

function createBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, 1024);
  base.addColorStop(0, '#06141d');
  base.addColorStop(0.48, '#0a242d');
  base.addColorStop(1, '#12333a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);

  const glow = ctx.createRadialGradient(540, 440, 20, 540, 440, 520);
  glow.addColorStop(0, 'rgba(62, 151, 153, 0.18)');
  glow.addColorStop(0.56, 'rgba(25, 80, 91, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(44822);
  const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
  gradient.addColorStop(0, '#8d4e2e');
  gradient.addColorStop(0.22, '#a8653d');
  gradient.addColorStop(0.5, '#9a5935');
  gradient.addColorStop(0.77, '#b06d42');
  gradient.addColorStop(1, '#8b4b2b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 96; i++) {
    const y = random() * 1024;
    ctx.beginPath();
    ctx.moveTo(-30, y);
    for (let x = 0; x <= 1054; x += 40) {
      ctx.lineTo(x, y + Math.sin(x * 0.012 + i) * (5 + random() * 8));
    }
    ctx.strokeStyle = `rgba(63, 28, 13, ${0.035 + random() * 0.075})`;
    ctx.lineWidth = 1 + random() * 2.7;
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const x = random() * 1024;
    const y = random() * 1024;
    ctx.beginPath();
    ctx.ellipse(x, y, 24 + random() * 34, 6 + random() * 11, random() * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(65, 28, 12, 0.17)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 3.1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 768, 384);
  base.addColorStop(0, '#dffbf6');
  base.addColorStop(0.32, '#67c9cc');
  base.addColorStop(0.55, '#f3d5da');
  base.addColorStop(0.76, '#8f88dd');
  base.addColorStop(1, '#c9fff1');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 768, 384);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(-60, 20 + i * 26);
    ctx.bezierCurveTo(180, 90 + i * 11, 470, -20 + i * 19, 840, 160 + i * 6);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,.75)' : i % 3 === 1 ? 'rgba(255,118,103,.34)' : 'rgba(67,255,222,.38)';
    ctx.lineWidth = 4 + (i % 5) * 2;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(80 + i * 86, 190 + Math.sin(i * 2.3) * 80, 11 + (i % 3) * 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeFinishTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.translate(512, 512);

  ctx.fillStyle = '#0a343a';
  ctx.beginPath();
  ctx.arc(0, 0, 500, 0, Math.PI * 2);
  ctx.fill();

  const checkerRadius = 430;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * checkerRadius, Math.sin(a) * checkerRadius);
    ctx.arc(0, 0, 500, a, a + Math.PI / 32);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#f5f1d9' : '#1a6e69';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, checkerRadius - 10, 0, Math.PI * 2);
  ctx.fillStyle = '#0b3d43';
  ctx.fill();

  for (const [radius, width, color] of [[370, 8, '#59efce'], [290, 3, '#ffc74f'], [210, 7, '#ff685b']]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.86;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#fff7df';
  ctx.font = '900 120px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', 0, 12);

  ctx.fillStyle = '#59efce';
  ctx.font = '800 34px "Trebuchet MS", sans-serif';
  ctx.fillText('DROP  ZONE', 0, 112);

  ctx.strokeStyle = 'rgba(255,255,255,.26)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 150, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeGapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f2bf45';
  ctx.fillRect(0, 0, 1024, 720);

  ctx.save();
  ctx.translate(-200, 0);
  ctx.fillStyle = '#182b2e';
  for (let x = 0; x < 1600; x += 132) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 68, 0);
    ctx.lineTo(x + 68 + 250, 720);
    ctx.lineTo(x + 250, 720);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const plaque = ctx.createLinearGradient(0, 240, 0, 480);
  plaque.addColorStop(0, 'rgba(8,30,34,.94)');
  plaque.addColorStop(1, 'rgba(18,48,53,.94)');
  ctx.fillStyle = plaque;
  roundRect(ctx, 142, 240, 740, 240, 38);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,199,79,.85)';
  ctx.lineWidth = 8;
  roundRect(ctx, 142, 240, 740, 240, 38);
  ctx.stroke();

  ctx.fillStyle = '#fff7df';
  ctx.font = '900 102px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE GAP', 512, 348);
  ctx.fillStyle = '#ffc74f';
  ctx.font = '800 28px "Trebuchet MS", sans-serif';
  ctx.fillText('MIND  YOUR  SPEED', 512, 425);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeBoardTexture(title, accent, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a232a';
  roundRect(ctx, 4, 4, 760, 248, 28);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  roundRect(ctx, 12, 12, 744, 232, 24);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff7df';
  ctx.font = '900 94px "Arial Black", Impact, sans-serif';
  ctx.fillText(title, 384, 112);
  ctx.fillStyle = accent;
  ctx.font = '800 24px "Trebuchet MS", sans-serif';
  ctx.fillText(subtitle, 384, 194);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeTrackTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10,35,42,.88)';
  roundRect(ctx, 5, 5, 630, 170, 42);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,247,223,.55)';
  ctx.lineWidth = 5;
  roundRect(ctx, 12, 12, 616, 156, 36);
  ctx.stroke();
  ctx.fillStyle = '#fff7df';
  ctx.font = '900 58px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 320, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeArrowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#6bffe4';
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const y = 100 + i * 120;
    ctx.beginPath();
    ctx.moveTo(55, y + 56);
    ctx.lineTo(128, y);
    ctx.lineTo(201, y + 56);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 3, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,.94)');
  gradient.addColorStop(0.2, 'rgba(135,255,232,.65)');
  gradient.addColorStop(0.52, 'rgba(82,238,211,.18)');
  gradient.addColorStop(1, 'rgba(82,238,211,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSprite(text, options = {}) {
  const width = options.width || 512;
  const height = options.height || 144;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const accent = options.accent || '#59efce';
  ctx.fillStyle = 'rgba(7,28,35,.88)';
  roundRect(ctx, 7, 7, width - 14, height - 14, height * 0.3);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  roundRect(ctx, 12, 12, width - 24, height - 24, height * 0.28);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `900 ${options.fontSize || 56}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width * 0.5, height * 0.53);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  sprite.scale.set(options.scaleX || 1.5, options.scaleY || 0.45, 1);
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

window.addEventListener('load', onResize);
onResize();

window.__gravityWorks = {
  state,
  world,
  marbleBody,
  camera,
  controls,
  renderer,
  scene,
};

animate();
