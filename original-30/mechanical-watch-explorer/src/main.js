import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWatch } from './watch.js';

const bootStartedAt = performance.now();
const canvas = document.querySelector('#watch-canvas');
const explodeRange = document.querySelector('#explode-range');
const explodeButton = document.querySelector('#explode-toggle');
const explodeButtonLabel = document.querySelector('#explode-button-label');
const assemblyState = document.querySelector('#assembly-state');
const motionButton = document.querySelector('#motion-toggle');
const resetViewButton = document.querySelector('#reset-view');
const annotationsLayer = document.querySelector('#annotations');
const tooltip = document.querySelector('#part-tooltip');

const annotationElements = new Map(
  [...document.querySelectorAll('.annotation')].map((element) => [element.dataset.anchor, element]),
);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d0c);
scene.fog = new THREE.FogExp2(0x0b0d0c, 0.025);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 60);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

let softwareRenderer = false;
try {
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));
  const forceHighQuality = new URLSearchParams(window.location.search).get('quality') === 'high';
  softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName) && !forceHighQuality;
} catch {
  softwareRenderer = false;
}

const renderScale = () => {
  if (softwareRenderer) return window.innerWidth <= 720 ? 0.78 : 0.68;
  return Math.min(window.devicePixelRatio, window.innerWidth <= 720 ? 1.7 : 1.8);
};

if (softwareRenderer) {
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(renderScale());
}
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setPixelRatio(renderScale());

if (!softwareRenderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = pmremGenerator.fromScene(environmentScene, 0.035);
  scene.environment = environment.texture;
  environmentScene.dispose?.();
  pmremGenerator.dispose();
}

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.rotateSpeed = 0.52;
controls.zoomSpeed = 0.72;
controls.minDistance = 6.4;
controls.maxDistance = 16;
controls.minPolarAngle = 0.32;
controls.maxPolarAngle = 1.32;
controls.minAzimuthAngle = -1.18;
controls.maxAzimuthAngle = 1.18;

const watch = createWatch(scene, renderer, { performance: softwareRenderer });

// A warm, low-key watchmaker's bench setup.
const hemisphere = new THREE.HemisphereLight(0xaebfc2, 0x26180f, 0.46);
scene.add(hemisphere);

const ambient = new THREE.AmbientLight(0xffead2, 0.18);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffdfb4, 3.15);
keyLight.position.set(-4.5, 8.2, 7.5);
keyLight.target.position.set(0.8, 0, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 24;
keyLight.shadow.camera.left = -6.2;
keyLight.shadow.camera.right = 6.2;
keyLight.shadow.camera.top = 6.2;
keyLight.shadow.camera.bottom = -6.2;
keyLight.shadow.bias = -0.00035;
keyLight.shadow.normalBias = 0.026;
scene.add(keyLight, keyLight.target);

const rimLight = new THREE.DirectionalLight(0x8db9c7, 2.15);
rimLight.position.set(5.4, 2.8, -4.2);
rimLight.target.position.set(0.8, 0.2, 0);
scene.add(rimLight, rimLight.target);

const warmSpot = new THREE.SpotLight(0xffb765, 70, 20, 0.28, 0.72, 1.35);
warmSpot.position.set(5.2, 5.8, 4.3);
warmSpot.target.position.set(1.1, 0, 0);
scene.add(warmSpot, warmSpot.target);

const subtleFill = new THREE.PointLight(0xb7d3c6, 8.5, 9, 2);
subtleFill.position.set(-4.3, 2.4, 3.1);
scene.add(subtleFill);

if (softwareRenderer) {
  keyLight.castShadow = false;
  warmSpot.visible = false;
  subtleFill.visible = false;
}

// Fine dust in the air above the bench.
let dust = null;
if (!softwareRenderer) {
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(180 * 3);
  let dustSeed = 43;
  const random = () => {
    dustSeed = (dustSeed * 16807) % 2147483647;
    return (dustSeed - 1) / 2147483646;
  };
  for (let index = 0; index < 180; index += 1) {
    dustPositions[index * 3] = (random() - 0.5) * 13;
    dustPositions[index * 3 + 1] = -1.1 + random() * 6.1;
    dustPositions[index * 3 + 2] = (random() - 0.5) * 10;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xf5d39c,
      size: 0.018,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  scene.add(dust);
}

const pointer = new THREE.Vector2(-10, -10);
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
let elapsed = 0;
let dragging = false;
let hoveredPart = null;
let lastPointerEvent = null;
let hoverDirty = false;
let slowMotion = false;
let cameraTween = null;
let currentLayout = '';
let baseScale = 1;
let displayScale = 1;
let shadowExplode = -1;

function getViewConfig() {
  const mobile = window.innerWidth <= 720;
  if (mobile) {
    return {
      position: new THREE.Vector3(0.12, 4.7, 12.4),
      target: new THREE.Vector3(0.05, 0.08, 0),
      fov: 39,
      watchX: 0,
      watchY: 0.14,
      scale: 0.66,
    };
  }

  const compact = window.innerWidth <= 980;
  if (compact) {
    return {
      position: new THREE.Vector3(0.65, 4.45, 9.8),
      target: new THREE.Vector3(0.78, -0.08, 0),
      fov: 34,
      watchX: 0.72,
      watchY: 0.16,
      scale: 0.7,
    };
  }

  return {
    position: new THREE.Vector3(0.55, 4.4, 9.0),
    target: new THREE.Vector3(1.08, -0.13, 0),
    fov: 32,
    watchX: 1.25,
    watchY: 0.17,
    scale: 0.75,
  };
}

function applyLayout({ immediate = false } = {}) {
  const config = getViewConfig();
  const layoutKey = `${window.innerWidth <= 720 ? 'mobile' : window.innerWidth <= 980 ? 'compact' : 'desktop'}`;
  const isNewLayout = layoutKey !== currentLayout;
  currentLayout = layoutKey;

  camera.fov = config.fov;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  watch.root.position.x = config.watchX;
  watch.root.position.y = config.watchY;
  baseScale = config.scale;

  if (immediate || isNewLayout) {
    displayScale = baseScale;
    watch.root.scale.setScalar(displayScale);
    camera.position.copy(config.position);
    controls.target.copy(config.target);
    controls.update();
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  cameraTween = null;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(renderScale());
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  applyLayout({ immediate: true });
}

function setRange(value) {
  const percent = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 100);
  explodeRange.value = String(percent);
  explodeRange.style.setProperty('--progress', `${percent}%`);
  updateExplodeLabels(percent / 100);
}

function updateExplodeLabels(value) {
  let state = 'Assembled';
  if (value >= 0.08 && value < 0.72) state = 'Inspection';
  else if (value >= 0.72) state = 'Exploded';
  assemblyState.textContent = state;
  explodeRange.setAttribute('aria-valuetext', state);
  explodeButtonLabel.textContent = value >= 0.5 ? 'Reassemble' : 'Take apart';
  annotationsLayer.classList.toggle('is-hidden', value > 0.055);
}

function setExplode(value) {
  watch.setExplode(value);
  setRange(value);
}

function resetView() {
  const config = getViewConfig();
  cameraTween = {
    startedAt: performance.now(),
    duration: 850,
    fromPosition: camera.position.clone(),
    toPosition: config.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: config.target.clone(),
  };
}

explodeRange.addEventListener('input', (event) => {
  const value = Number(event.target.value) / 100;
  setExplode(value);
});

explodeButton.addEventListener('click', () => {
  const shouldExplode = Number(explodeRange.value) < 50;
  setExplode(shouldExplode ? 1 : 0);
});

motionButton.addEventListener('click', () => {
  slowMotion = !slowMotion;
  watch.setSlowMotion(slowMotion);
  motionButton.classList.toggle('is-active', slowMotion);
  motionButton.querySelector('span').textContent = slowMotion ? '¼×' : '1×';
  motionButton.setAttribute('aria-label', slowMotion ? 'Enable normal motion' : 'Toggle slow motion');
  motionButton.setAttribute('aria-pressed', String(slowMotion));
});

resetViewButton.addEventListener('click', resetView);

controls.addEventListener('start', () => {
  dragging = true;
  cameraTween = null;
  tooltip.classList.remove('is-visible');
});
controls.addEventListener('end', () => {
  dragging = false;
});

canvas.addEventListener('pointermove', (event) => {
  lastPointerEvent = event;
  if (event.pointerType === 'touch' || dragging) {
    tooltip.classList.remove('is-visible');
    return;
  }
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  hoverDirty = true;
});

canvas.addEventListener('pointerleave', () => {
  pointer.set(-10, -10);
  lastPointerEvent = null;
  hoverDirty = false;
  tooltip.classList.remove('is-visible');
  canvas.style.cursor = '';
});

window.addEventListener('resize', resize);

function updateTooltip() {
  if (!hoverDirty || !lastPointerEvent || dragging || pointer.x < -2 || lastPointerEvent.pointerType === 'touch') {
    return;
  }
  hoverDirty = false;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(watch.touchableParts, false);
  const hit = intersections.find((intersection) => intersection.object.userData.part);
  if (hit) {
    hoveredPart = hit.object.userData.part;
    tooltip.querySelector('span').textContent = hoveredPart;
    tooltip.style.left = `${lastPointerEvent.clientX}px`;
    tooltip.style.top = `${lastPointerEvent.clientY}px`;
    tooltip.classList.add('is-visible');
    canvas.style.cursor = 'crosshair';
  } else {
    hoveredPart = null;
    tooltip.classList.remove('is-visible');
    canvas.style.cursor = '';
  }
}

const projected = new THREE.Vector3();

function updateAnnotations() {
  if (window.innerWidth <= 980) return;
  const visible = watch.explode < 0.055;
  annotationElements.forEach((element, key) => {
    const anchor = watch.anchors[key];
    if (!anchor) return;
    projected.copy(anchor);
    watch.root.localToWorld(projected);
    projected.project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const onScreen = visible && projected.z < 1 && x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight;
    element.style.opacity = onScreen ? '1' : '0';
    if (onScreen) element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
}

function updateCameraTween(now) {
  if (!cameraTween) return;
  const progress = Math.min(1, (now - cameraTween.startedAt) / cameraTween.duration);
  const ease = 1 - Math.pow(1 - progress, 3);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, ease);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, ease);
  if (progress >= 1) cameraTween = null;
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;

  updateCameraTween(now);
  controls.update();
  watch.update(elapsed, delta);
  if (Math.abs(watch.explode - shadowExplode) > 0.012) {
    shadowExplode = watch.explode;
    renderer.shadowMap.needsUpdate = true;
  }
  const targetScale = baseScale * (1 - watch.explode * 0.14);
  displayScale += (targetScale - displayScale) * Math.min(1, delta * 5);
  watch.root.scale.setScalar(displayScale);
  updateAnnotations();
  updateTooltip();

  if (dust) {
    dust.rotation.y = elapsed * 0.011;
    dust.position.y = Math.sin(elapsed * 0.16) * 0.035;
  }

  renderer.render(scene, camera);
}

setRange(0);
resize();
applyLayout({ immediate: true });
document.body.classList.add('is-ready');
const readyAt = performance.now();
animate(performance.now());
const firstFrameAt = performance.now();

// Exposed only for lightweight automated sanity checks; no application state depends on it.
window.__ATELIER_DEBUG__ = {
  scene,
  camera,
  controls,
  watch,
  renderer,
  timings: {
    bootMs: readyAt - bootStartedAt,
    readyAt,
    firstRenderMs: firstFrameAt - readyAt,
  },
  getProjectedWatchBounds() {
    const box = new THREE.Box3().setFromObject(watch.root);
    const corners = [];
    for (let x = 0; x < 2; x += 1) {
      for (let y = 0; y < 2; y += 1) {
        for (let z = 0; z < 2; z += 1) {
          corners.push(new THREE.Vector3(
            x ? box.max.x : box.min.x,
            y ? box.max.y : box.min.y,
            z ? box.max.z : box.min.z,
          ));
        }
      }
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    corners.forEach((corner) => {
      corner.project(camera);
      const sx = (corner.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-corner.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, sx);
      minY = Math.min(minY, sy);
      maxX = Math.max(maxX, sx);
      maxY = Math.max(maxY, sy);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  },
};
