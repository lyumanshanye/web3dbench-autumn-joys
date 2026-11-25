import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const CYCLE_DAYS = 29.5;
const ORBIT_RADIUS = 3.25;
const SUN_POSITION = new THREE.Vector3(-6.35, 0, 0);
const DAY_SPEED = 1.8;
const PHASE_EPSILON = 0.32;
const KEY_DAYS = {
  new: 0,
  first: CYCLE_DAYS / 4,
  full: CYCLE_DAYS / 2,
  last: (CYCLE_DAYS * 3) / 4,
};

const PHASE_INFO = {
  new: {
    name: 'New moon',
    description:
      'The Moon is between Earth and the Sun. Its sunlit half faces away from us, so the Earth-facing side looks dark.',
  },
  waxing_crescent: {
    name: 'Waxing crescent',
    description:
      'A thin sliver of the Moon’s sunlit side is growing wider each night.',
  },
  first: {
    name: 'First quarter',
    description:
      'We see half of the Moon’s sunlit side. For observers in the Northern Hemisphere, the bright side is on the right.',
  },
  waxing_gibbous: {
    name: 'Waxing gibbous',
    description:
      'More than half of the Earth-facing side is lit, and the bright area is still growing.',
  },
  full: {
    name: 'Full moon',
    description:
      'Earth is between the Sun and the Moon. The entire sunlit half of the Moon faces Earth.',
  },
  waning_gibbous: {
    name: 'Waning gibbous',
    description:
      'The lit portion is shrinking, but more than half of the Earth-facing side is still bright.',
  },
  last: {
    name: 'Last quarter',
    description:
      'Half of the sunlit side is visible again. For Northern Hemisphere observers, the bright side is now on the left.',
  },
  waning_crescent: {
    name: 'Waning crescent',
    description:
      'Only a thin sliver of sunlight remains visible before the Moon returns to new moon.',
  },
};

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = motionQuery.matches;

const sceneCanvas = document.querySelector('#scene-canvas');
const sceneWrap = document.querySelector('#scene-wrap');
const previewCanvas = document.querySelector('#preview-canvas');
const previewWrap = previewCanvas.parentElement;
const currentPhaseEl = document.querySelector('#current-phase');
const currentDayEl = document.querySelector('#current-day');
const previewPhaseEl = document.querySelector('#preview-phase');
const previewDayEl = document.querySelector('#preview-day');
const phaseDescriptionEl = document.querySelector('#phase-description');
const illuminationEl = document.querySelector('#illumination-value');
const daySlider = document.querySelector('#day-slider');
const dayOutput = document.querySelector('#day-output');
const playButton = document.querySelector('#play-button');
const playLabel = document.querySelector('#play-label');
const resetButton = document.querySelector('#reset-button');
const phaseButtons = [...document.querySelectorAll('.phase-button')];
const liveStatus = document.querySelector('#live-status');
const modelCard = document.querySelector('.model-card');
const previewCard = document.querySelector('.preview-card');
const quizContent = document.querySelector('#quiz-content');
const quizFeedback = document.querySelector('#quiz-feedback');
const quizActions = document.querySelector('#quiz-actions');
const quizCounter = document.querySelector('#quiz-counter');
const quizDots = [...document.querySelectorAll('#quiz-progress span')];

let currentDay = 0;
let isPlaying = !prefersReducedMotion;
let lastFrameTime = performance.now();
let lastUiDay = -1;
let earthSpin = 0;

function normalizeDay(value) {
  return ((value % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
}

function formatDay(value) {
  return value.toFixed(1);
}

function phaseForDay(value) {
  const day = normalizeDay(value);
  const distance = (target) => {
    const direct = Math.abs(day - target);
    return Math.min(direct, CYCLE_DAYS - direct);
  };

  if (day < PHASE_EPSILON || day > CYCLE_DAYS - PHASE_EPSILON) {
    return { id: 'new', ...PHASE_INFO.new };
  }
  if (distance(KEY_DAYS.first) <= PHASE_EPSILON) {
    return { id: 'first', ...PHASE_INFO.first };
  }
  if (distance(KEY_DAYS.full) <= PHASE_EPSILON) {
    return { id: 'full', ...PHASE_INFO.full };
  }
  if (distance(KEY_DAYS.last) <= PHASE_EPSILON) {
    return { id: 'last', ...PHASE_INFO.last };
  }
  if (day < KEY_DAYS.first) {
    return { id: 'waxing_crescent', ...PHASE_INFO.waxing_crescent };
  }
  if (day < KEY_DAYS.full) {
    return { id: 'waxing_gibbous', ...PHASE_INFO.waxing_gibbous };
  }
  if (day < KEY_DAYS.last) {
    return { id: 'waning_gibbous', ...PHASE_INFO.waning_gibbous };
  }
  return { id: 'waning_crescent', ...PHASE_INFO.waning_crescent };
}

function illuminationForDay(value) {
  const phaseAngle = (normalizeDay(value) / CYCLE_DAYS) * Math.PI * 2;
  return (1 - Math.cos(phaseAngle)) / 2;
}

function nearestPhaseButton(value) {
  const day = normalizeDay(value);
  let nearest = null;
  let best = Infinity;
  for (const [key, target] of Object.entries(KEY_DAYS)) {
    const direct = Math.abs(day - target);
    const distance = Math.min(direct, CYCLE_DAYS - direct);
    if (distance < best) {
      best = distance;
      nearest = key;
    }
  }
  return best <= PHASE_EPSILON ? nearest : null;
}

/* -------------------------------------------------------------------------- */
/* Textures                                                                   */
/* -------------------------------------------------------------------------- */

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textureFromCanvas(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function makeMoonTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(41);

  const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, '#c5c0b7');
  base.addColorStop(0.45, '#aaa59d');
  base.addColorStop(1, '#8f8b85');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 12000; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 0.4 + random() * 2.5;
    const light = random() > 0.48;
    ctx.fillStyle = light
      ? `rgba(236, 232, 223, ${0.02 + random() * 0.08})`
      : `rgba(68, 65, 62, ${0.018 + random() * 0.075})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const maria = [
    [255, 156, 96, 42, 0.22],
    [332, 206, 54, 35, 0.2],
    [416, 140, 43, 25, 0.15],
    [511, 219, 82, 41, 0.21],
    [590, 186, 58, 47, 0.16],
    [719, 235, 34, 26, 0.1],
    [213, 286, 66, 35, 0.15],
    [684, 308, 52, 33, 0.11],
  ];

  for (const [x, y, rx, ry, alpha] of maria) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    gradient.addColorStop(0, `rgba(75, 74, 73, ${alpha})`);
    gradient.addColorStop(0.62, `rgba(88, 86, 83, ${alpha * 0.85})`);
    gradient.addColorStop(1, 'rgba(106, 103, 98, 0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 95; i += 1) {
    const x = 30 + random() * (canvas.width - 60);
    const y = 25 + random() * (canvas.height - 50);
    const radius = 2 + random() * 17;
    const gradient = ctx.createRadialGradient(
      x - radius * 0.24,
      y - radius * 0.24,
      radius * 0.08,
      x,
      y,
      radius,
    );
    gradient.addColorStop(0, 'rgba(70, 68, 65, 0.27)');
    gradient.addColorStop(0.7, 'rgba(83, 80, 76, 0.17)');
    gradient.addColorStop(1, 'rgba(232, 227, 218, 0.12)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 59, 56, 0.12)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  return textureFromCanvas(canvas, renderer);
}

function makeEarthTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(90210);

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#0b3157');
  ocean.addColorStop(0.38, '#0c4e7d');
  ocean.addColorStop(0.62, '#0b4b7b');
  ocean.addColorStop(1, '#092d50');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const oceanTexture = ctx.createRadialGradient(555, 220, 20, 555, 220, 600);
  oceanTexture.addColorStop(0, 'rgba(47, 153, 202, 0.22)');
  oceanTexture.addColorStop(1, 'rgba(0, 19, 50, 0.18)');
  ctx.fillStyle = oceanTexture;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function land(points, fill, edge = 'rgba(194, 218, 179, 0.18)') {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 2) {
      const controlX = points[i][0];
      const controlY = points[i][1];
      const end = points[Math.min(i + 1, points.length - 1)];
      ctx.quadraticCurveTo(controlX, controlY, end[0], end[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  land(
    [
      [128, 111],
      [170, 63],
      [275, 70],
      [310, 115],
      [296, 160],
      [247, 176],
      [225, 223],
      [185, 235],
      [158, 189],
      [113, 171],
    ],
    '#547b50',
  );
  land(
    [
      [246, 219],
      [291, 228],
      [332, 266],
      [320, 323],
      [303, 383],
      [276, 410],
      [252, 355],
      [232, 293],
    ],
    '#4d7a4d',
  );
  land(
    [
      [450, 119],
      [495, 90],
      [559, 101],
      [589, 148],
      [575, 203],
      [538, 228],
      [503, 204],
      [465, 187],
    ],
    '#65805a',
  );
  land(
    [
      [491, 184],
      [541, 174],
      [589, 205],
      [613, 261],
      [606, 319],
      [561, 361],
      [520, 343],
      [499, 292],
      [474, 247],
    ],
    '#7b8558',
  );
  land(
    [
      [568, 101],
      [640, 67],
      [733, 79],
      [811, 108],
      [886, 155],
      [854, 207],
      [790, 219],
      [735, 199],
      [691, 227],
      [640, 201],
      [596, 175],
    ],
    '#56774f',
  );
  land(
    [
      [788, 315],
      [831, 300],
      [883, 325],
      [889, 367],
      [851, 388],
      [805, 367],
    ],
    '#8a8050',
  );
  land(
    [
      [389, 53],
      [431, 43],
      [451, 92],
      [436, 126],
      [397, 115],
    ],
    '#d6ded5',
  );

  const iceNorth = ctx.createLinearGradient(0, 0, 0, 43);
  iceNorth.addColorStop(0, 'rgba(238, 247, 249, 0.96)');
  iceNorth.addColorStop(1, 'rgba(221, 237, 241, 0)');
  ctx.fillStyle = iceNorth;
  ctx.fillRect(0, 0, canvas.width, 43);

  const iceSouth = ctx.createLinearGradient(0, canvas.height, 0, 459);
  iceSouth.addColorStop(0, 'rgba(239, 247, 248, 0.99)');
  iceSouth.addColorStop(1, 'rgba(218, 235, 239, 0)');
  ctx.fillStyle = iceSouth;
  ctx.fillRect(0, 459, canvas.width, 53);

  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 28; i += 1) {
    const x = random() * canvas.width;
    const y = 80 + random() * 340;
    const width = 35 + random() * 115;
    const height = 5 + random() * 16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((random() - 0.5) * 0.38);
    ctx.fillStyle = 'rgba(244, 250, 255, 0.62)';
    ctx.beginPath();
    ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const grain = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const variation = (random() - 0.5) * 8;
    grain.data[i] += variation;
    grain.data[i + 1] += variation;
    grain.data[i + 2] += variation;
  }
  ctx.putImageData(grain, 0, 0);

  return textureFromCanvas(canvas, renderer);
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, 'rgba(255, 249, 222, 1)');
  glow.addColorStop(0.16, 'rgba(255, 225, 146, 0.8)');
  glow.addColorStop(0.4, 'rgba(255, 184, 70, 0.3)');
  glow.addColorStop(0.72, 'rgba(255, 153, 37, 0.08)');
  glow.addColorStop(1, 'rgba(255, 145, 28, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* -------------------------------------------------------------------------- */
/* Main orbital model                                                         */
/* -------------------------------------------------------------------------- */

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const cameraTarget = new THREE.Vector3(-1.65, 0, 0);
camera.position.set(cameraTarget.x, 11.5, 12.5);
camera.lookAt(cameraTarget);

const sceneRenderer = new THREE.WebGLRenderer({
  canvas: sceneCanvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
sceneRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
sceneRenderer.setClearColor(0x000000, 0);
sceneRenderer.outputColorSpace = THREE.SRGBColorSpace;
sceneRenderer.toneMapping = THREE.ACESFilmicToneMapping;
sceneRenderer.toneMappingExposure = 1.08;

const labelRenderer = new CSS2DRenderer({ element: document.querySelector('#scene-labels') });

scene.add(new THREE.AmbientLight(0x9fb4e0, 0.15));
scene.add(new THREE.HemisphereLight(0x243a61, 0x11101a, 0.2));

const sunlight = new THREE.DirectionalLight(0xffe9bf, 3.1);
sunlight.position.copy(SUN_POSITION).add(new THREE.Vector3(0, 0.3, 0));
sunlight.target.position.set(0, 0, 0);
scene.add(sunlight, sunlight.target);

const moonTexture = makeMoonTexture(sceneRenderer);
const earthTexture = makeEarthTexture(sceneRenderer);
const glowTexture = makeGlowTexture();

const sunGeometry = new THREE.SphereGeometry(1.02, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffda82 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.copy(SUN_POSITION);
scene.add(sun);

const sunGlowMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  color: 0xffc864,
  transparent: true,
  opacity: 0.78,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
});
const sunGlow = new THREE.Sprite(sunGlowMaterial);
sunGlow.position.copy(SUN_POSITION);
sunGlow.scale.setScalar(6.2);
sunGlow.renderOrder = -1;
scene.add(sunGlow);

const sunHaloMaterial = sunGlowMaterial.clone();
sunHaloMaterial.opacity = 0.22;
const sunHalo = new THREE.Sprite(sunHaloMaterial);
sunHalo.position.copy(SUN_POSITION);
sunHalo.scale.setScalar(3.3);
scene.add(sunHalo);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(0.83, 64, 64),
  new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.82,
    metalness: 0.02,
  }),
);
earth.rotation.z = -0.18;
scene.add(earth);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.885, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x5cbfff,
    transparent: true,
    opacity: 0.065,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
scene.add(atmosphere);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.33, 48, 48),
  new THREE.MeshStandardMaterial({
    map: moonTexture,
    roughness: 0.98,
    metalness: 0,
  }),
);
moon.renderOrder = 2;
scene.add(moon);

function orbitPoint(angle, radius = ORBIT_RADIUS) {
  return new THREE.Vector3(-radius * Math.cos(angle), 0.025, radius * Math.sin(angle));
}

const orbitSegments = 180;
const orbitPoints = [];
for (let i = 0; i <= orbitSegments; i += 1) {
  orbitPoints.push(orbitPoint((i / orbitSegments) * Math.PI * 2));
}

const orbitGuideGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
const orbitGuide = new THREE.LineLoop(
  orbitGuideGeometry,
  new THREE.LineBasicMaterial({
    color: 0x8ca2cc,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  }),
);
scene.add(orbitGuide);

const orbitProgressGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
const orbitProgress = new THREE.Line(
  orbitProgressGeometry,
  new THREE.LineBasicMaterial({
    color: 0xffd27c,
    transparent: true,
    opacity: 0.67,
    depthWrite: false,
  }),
);
scene.add(orbitProgress);

const radiusGuideGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0.018, 0),
  new THREE.Vector3(-ORBIT_RADIUS, 0.018, 0),
]);
const radiusGuide = new THREE.Line(
  radiusGuideGeometry,
  new THREE.LineBasicMaterial({
    color: 0xc6d4f3,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  }),
);
scene.add(radiusGuide);

const markerGeometry = new THREE.SphereGeometry(0.055, 12, 12);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xbac7e5, transparent: true, opacity: 0.62 });
for (const day of Object.values(KEY_DAYS)) {
  const angle = (day / CYCLE_DAYS) * Math.PI * 2;
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.copy(orbitPoint(angle, ORBIT_RADIUS));
  scene.add(marker);
}

function createObjectLabel(text, className) {
  const element = document.createElement('div');
  element.className = `object-label ${className}`;
  element.textContent = text;
  return new CSS2DObject(element);
}

const sunLabel = createObjectLabel('Sun', 'label-sun');
sunLabel.position.set(SUN_POSITION.x, 1.55, SUN_POSITION.z);
scene.add(sunLabel);

const earthLabel = createObjectLabel('Earth', 'label-earth');
earthLabel.position.set(0, -1.16, 0);
scene.add(earthLabel);

const moonLabel = createObjectLabel('Moon', 'label-moon');
moonLabel.position.set(0, 0.7, 0);
moon.add(moonLabel);

/* -------------------------------------------------------------------------- */
/* Earth-view preview                                                         */
/* -------------------------------------------------------------------------- */

const previewScene = new THREE.Scene();
const previewCamera = new THREE.OrthographicCamera(-1.26, 1.26, 1.26, -1.26, 0.1, 20);
previewCamera.position.set(0, 0, 5);
previewCamera.lookAt(0, 0, 0);

const previewRenderer = new THREE.WebGLRenderer({
  canvas: previewCanvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
previewRenderer.setClearColor(0x000000, 0);
previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewRenderer.toneMappingExposure = 1.04;

previewScene.add(new THREE.AmbientLight(0x8195bd, 0.13));

const previewLight = new THREE.DirectionalLight(0xfff3d7, 3.45);
previewLight.target.position.set(0, 0, 0);
previewScene.add(previewLight, previewLight.target);

const previewMoon = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshStandardMaterial({
    map: moonTexture,
    roughness: 0.95,
    metalness: 0,
  }),
);
previewMoon.rotation.y = -0.38;
previewScene.add(previewMoon);

/* -------------------------------------------------------------------------- */
/* Layout and rendering                                                       */
/* -------------------------------------------------------------------------- */

function resizeScene() {
  const width = Math.max(sceneWrap.clientWidth, 1);
  const height = Math.max(sceneWrap.clientHeight, 1);
  const aspect = width / height;
  const halfWidth = Math.max(6.22, 3.66 * aspect);
  const halfHeight = halfWidth / aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();

  sceneRenderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
}

function resizePreview() {
  const width = Math.max(previewWrap.clientWidth, 1);
  const height = Math.max(previewWrap.clientHeight, 1);
  previewRenderer.setSize(width, height, false);
}

function updateModel() {
  const angle = (normalizeDay(currentDay) / CYCLE_DAYS) * Math.PI * 2;
  moon.position.set(-ORBIT_RADIUS * Math.cos(angle), 0, ORBIT_RADIUS * Math.sin(angle));
  moon.rotation.y = angle - Math.PI / 2;
  moonLabel.position.set(-Math.cos(angle) * 0.46, 0.7, Math.sin(angle) * 0.46);

  const progress = normalizeDay(currentDay) / CYCLE_DAYS;
  const drawCount = progress <= 0.0001 ? 0 : Math.max(2, Math.ceil(progress * orbitSegments) + 1);
  orbitProgressGeometry.setDrawRange(0, drawCount);

  const radiusGuidePosition = radiusGuideGeometry.getAttribute('position');
  radiusGuidePosition.setXYZ(1, moon.position.x, 0.018, moon.position.z);
  radiusGuidePosition.needsUpdate = true;

  previewLight.position.set(Math.sin(angle) * 5, 0.25, -Math.cos(angle) * 5);
  previewMoon.rotation.y = -0.38 + angle * 0.03;
}

function announceCurrentPhase() {
  const info = phaseForDay(currentDay);
  const percent = Math.round(illuminationForDay(currentDay) * 100);
  liveStatus.textContent = `Day ${formatDay(currentDay)} of ${CYCLE_DAYS}. ${info.name}, ${percent} percent illuminated.`;
}

function syncUI(force = false) {
  if (!force && Math.abs(currentDay - lastUiDay) < 0.002) {
    return;
  }
  lastUiDay = currentDay;

  const info = phaseForDay(currentDay);
  const percent = Math.round(illuminationForDay(currentDay) * 100);
  const dayText = formatDay(currentDay);
  const progress = (normalizeDay(currentDay) / CYCLE_DAYS) * 100;

  currentPhaseEl.textContent = info.name;
  currentDayEl.textContent = `Day ${dayText} of ${CYCLE_DAYS}`;
  previewPhaseEl.textContent = info.name;
  previewDayEl.textContent = `Day ${dayText}`;
  phaseDescriptionEl.textContent = info.description;
  illuminationEl.textContent = `${percent}%`;
  dayOutput.textContent = dayText;
  daySlider.value = normalizeDay(currentDay).toFixed(3);
  daySlider.style.setProperty('--progress', `${progress.toFixed(3)}%`);
  daySlider.setAttribute(
    'aria-valuetext',
    `Day ${dayText} of ${CYCLE_DAYS}, ${info.name.toLowerCase()}, ${percent} percent illuminated`,
  );
  previewCanvas.setAttribute(
    'aria-label',
    `Earth-view preview showing a ${info.name.toLowerCase()} with ${percent} percent of the disk illuminated`,
  );

  const activePhase = nearestPhaseButton(currentDay);
  for (const button of phaseButtons) {
    const isActive = button.dataset.phase === activePhase;
    button.classList.toggle('is-active', isActive);
  }
}

function setDay(value, { announce = false, rerender = true } = {}) {
  currentDay = normalizeDay(Number.isFinite(value) ? value : 0);
  if (rerender) {
    updateModel();
    syncUI(true);
  }
  if (announce) {
    announceCurrentPhase();
  }
}

function syncPlaybackButton() {
  playButton.classList.toggle('is-paused', !isPlaying);
  playButton.setAttribute('aria-pressed', String(isPlaying));
  playLabel.textContent = isPlaying ? 'Pause animation' : 'Play animation';
  playButton.title = isPlaying ? 'Pause animation' : 'Play animation';
}

function setPlaying(nextPlaying, { announce = false } = {}) {
  isPlaying = nextPlaying;
  lastFrameTime = performance.now();
  syncPlaybackButton();
  if (announce) {
    liveStatus.textContent = isPlaying
      ? 'Animation playing. The Moon is orbiting Earth.'
      : 'Animation paused. Use the slider or phase buttons to explore.';
  }
}

function pulseModel() {
  modelCard.classList.remove('is-illustrating');
  // Restart the one-shot highlight even when answers are changed quickly.
  void modelCard.offsetWidth;
  modelCard.classList.add('is-illustrating');
  previewCard.classList.remove('is-illustrating');
  void previewCard.offsetWidth;
  previewCard.classList.add('is-illustrating');
  window.setTimeout(() => {
    modelCard.classList.remove('is-illustrating');
    previewCard.classList.remove('is-illustrating');
  }, 950);
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastFrameTime) / 1000, 0.12);
  lastFrameTime = now;

  if (isPlaying) {
    currentDay = normalizeDay(currentDay + delta * DAY_SPEED);
    updateModel();
    syncUI();
    earthSpin += delta * 0.028;
    earth.rotation.y = earthSpin;
  }

  sceneRenderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  previewRenderer.render(previewScene, previewCamera);
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

playButton.addEventListener('click', () => {
  setPlaying(!isPlaying, { announce: true });
});

resetButton.addEventListener('click', () => {
  setPlaying(false);
  setDay(0, { announce: true });
  daySlider.focus({ preventScroll: true });
});

daySlider.addEventListener('input', () => {
  setPlaying(false);
  setDay(Number(daySlider.value), { announce: true });
});

for (const button of phaseButtons) {
  button.addEventListener('click', () => {
    setPlaying(false);
    setDay(Number(button.dataset.day), { announce: true });
  });
}

function handleMotionPreferenceChange(event) {
  prefersReducedMotion = event.matches;
  if (prefersReducedMotion) {
    setPlaying(false);
  }
}

if (typeof motionQuery.addEventListener === 'function') {
  motionQuery.addEventListener('change', handleMotionPreferenceChange);
} else if (typeof motionQuery.addListener === 'function') {
  motionQuery.addListener(handleMotionPreferenceChange);
}

/* -------------------------------------------------------------------------- */
/* Quiz                                                                       */
/* -------------------------------------------------------------------------- */

const quizQuestions = [
  {
    prompt: 'Look at the Earth-view preview. At which phase does the disk appear completely dark?',
    options: ['New moon', 'First quarter', 'Full moon'],
    correct: 0,
    referenceDay: KEY_DAYS.new,
    illustration: 'new moon',
    explanation:
      'At new moon the Moon sits between Earth and the Sun. Its sunlit half faces away from Earth, so the preview disk is dark.',
  },
  {
    prompt: 'About how much of the Moon’s Earth-facing side is lit at first quarter?',
    options: ['None of it', 'Half of it', 'All of it'],
    correct: 1,
    referenceDay: KEY_DAYS.first,
    illustration: 'first quarter',
    explanation:
      'First quarter means we see one half of the sunlit side. The model is set there now, with the bright half on the right.',
  },
  {
    prompt: 'At full moon, which arrangement is correct?',
    options: [
      'Earth is between the Sun and the Moon.',
      'The Moon is between the Sun and Earth.',
      'The Sun is between Earth and the Moon.',
    ],
    correct: 0,
    referenceDay: KEY_DAYS.full,
    illustration: 'full moon',
    explanation:
      'At full moon, Earth is between the Sun and the Moon. The whole sunlit half faces Earth, so the preview disk is fully bright.',
  },
];

let quizIndex = 0;
let quizAnswered = false;
let quizCorrect = false;
let quizWrongIndex = null;

function updateQuizProgress() {
  quizCounter.textContent = quizIndex >= quizQuestions.length ? '3 / 3' : `${quizIndex + 1} / 3`;
  quizDots.forEach((dot, index) => {
    dot.classList.toggle('is-current', quizIndex < quizQuestions.length && index === quizIndex);
    dot.classList.toggle('is-complete', index < quizIndex || (index === quizIndex && quizAnswered && quizCorrect));
  });
}

function resetQuestionState() {
  quizAnswered = false;
  quizCorrect = false;
  quizWrongIndex = null;
  quizFeedback.hidden = true;
  quizFeedback.classList.remove('is-wrong');
  quizFeedback.innerHTML = '';
  quizActions.hidden = true;
  quizActions.innerHTML = '';
}

function renderQuiz() {
  updateQuizProgress();

  if (quizIndex >= quizQuestions.length) {
    quizFeedback.hidden = true;
    quizActions.hidden = true;
    quizActions.innerHTML = '';
    quizContent.innerHTML = `
      <div class="quiz-complete">
        <span class="quiz-complete-badge" aria-hidden="true">✓</span>
        <h3>Orbit complete</h3>
        <p>You connected all three phases to the Moon’s position and the view from Earth. Ready for another pass?</p>
        <div class="quiz-actions">
          <button id="retry-quiz" class="quiz-action primary" type="button">Retry quiz</button>
        </div>
      </div>
    `;
    return;
  }

  const question = quizQuestions[quizIndex];
  const optionMarkup = question.options
    .map((option, index) => {
      let stateClass = '';
      if (quizAnswered && quizCorrect && index === question.correct) {
        stateClass = ' is-correct';
      } else if (quizAnswered && !quizCorrect && index === quizWrongIndex) {
        stateClass = ' is-wrong';
      }
      return `
        <button
          class="answer-button${stateClass}"
          type="button"
          data-answer="${index}"
          ${quizAnswered ? 'disabled' : ''}
        >
          <span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
          <span>${option}</span>
        </button>
      `;
    })
    .join('');

  quizContent.innerHTML = `
    <p class="quiz-question" id="quiz-question">${question.prompt}</p>
    <div class="answer-list" role="group" aria-labelledby="quiz-question">${optionMarkup}</div>
  `;

  if (!quizAnswered) {
    resetQuestionState();
  }
}

function showQuestionFeedback(correct) {
  const question = quizQuestions[quizIndex];
  quizFeedback.hidden = false;
  quizFeedback.classList.toggle('is-wrong', !correct);

  if (correct) {
    quizFeedback.innerHTML = `<strong>Correct — ${question.illustration}.</strong> ${question.explanation}`;
  } else {
    quizFeedback.innerHTML = `<strong>Not quite — try again.</strong> The model is set to ${question.illustration} so you can compare the Moon’s position with the Earth-view preview. ${question.explanation}`;
  }

  quizActions.hidden = false;
  quizActions.innerHTML = correct
    ? `<button id="quiz-next" class="quiz-action primary" type="button">${quizIndex === quizQuestions.length - 1 ? 'See results' : 'Next question'}</button>`
    : '<button id="quiz-retry" class="quiz-action secondary" type="button">Try this question again</button>';

  window.requestAnimationFrame(() => {
    document.querySelector(correct ? '#quiz-next' : '#quiz-retry')?.focus({ preventScroll: true });
  });
}

function answerQuestion(index) {
  if (quizAnswered || quizIndex >= quizQuestions.length) {
    return;
  }

  const question = quizQuestions[quizIndex];
  quizAnswered = true;
  quizCorrect = index === question.correct;
  quizWrongIndex = quizCorrect ? null : index;

  setPlaying(false);
  setDay(question.referenceDay, { announce: false });
  pulseModel();

  renderQuiz();
  updateQuizProgress();
  showQuestionFeedback(quizCorrect);
}

quizContent.addEventListener('click', (event) => {
  const answer = event.target.closest('.answer-button');
  if (answer) {
    answerQuestion(Number(answer.dataset.answer));
    return;
  }

  if (event.target.closest('#retry-quiz')) {
    quizIndex = 0;
    resetQuestionState();
    setDay(KEY_DAYS.new, { announce: false });
    renderQuiz();
    window.requestAnimationFrame(() => {
      quizContent.querySelector('.answer-button')?.focus({ preventScroll: true });
    });
  }
});

quizActions.addEventListener('click', (event) => {
  if (event.target.closest('#quiz-next')) {
    quizIndex += 1;
    resetQuestionState();
    renderQuiz();
    window.requestAnimationFrame(() => {
      quizContent.querySelector('.answer-button')?.focus({ preventScroll: true });
    });
    return;
  }

  if (event.target.closest('#quiz-retry')) {
    resetQuestionState();
    renderQuiz();
    window.requestAnimationFrame(() => {
      quizContent.querySelector('.answer-button')?.focus({ preventScroll: true });
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Initial boot                                                               */
/* -------------------------------------------------------------------------- */

const sceneObserver = new ResizeObserver(() => {
  resizeScene();
});
sceneObserver.observe(sceneWrap);

const previewObserver = new ResizeObserver(() => {
  resizePreview();
});
previewObserver.observe(previewWrap);

resizeScene();
resizePreview();
updateModel();
syncUI(true);
syncPlaybackButton();
renderQuiz();
requestAnimationFrame(animate);
