import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PLANETS = [
  {
    key: 'mercury',
    index: '01',
    name: 'Mercury',
    type: 'Terrestrial planet',
    subtitle: 'The swift messenger',
    description:
      'A cratered world of iron and stone, racing through the Sun’s fierce inner heat. Mercury has almost no atmosphere to soften the light or slow the fall of night.',
    fact: 'A single day on Mercury lasts longer than two of its years.',
    stats: { distance: '0.39 AU', diameter: '4,879 km', day: '58.6 d', year: '88 d' },
    color: '#a8a29a',
    radius: 0.3,
    orbit: 7.4,
    speed: 0.32,
    phase: 2.3,
    inclination: 0.08,
    tilt: 0.001,
    spin: 0.16,
    seed: 11,
  },
  {
    key: 'venus',
    index: '02',
    name: 'Venus',
    type: 'Terrestrial planet',
    subtitle: 'The veiled twin',
    description:
      'Beneath a pale ceiling of sulfuric cloud, Venus hides a furnace world. Its runaway greenhouse atmosphere makes it hotter than Mercury, even at twice the distance.',
    fact: 'Venus turns backwards, so slowly that its Sun sets in the east.',
    stats: { distance: '0.72 AU', diameter: '12,104 km', day: '243 d', year: '225 d' },
    color: '#e8cda5',
    radius: 0.54,
    orbit: 10.4,
    speed: 0.19,
    phase: 4.6,
    inclination: 0.04,
    tilt: 2.64,
    spin: -0.05,
    seed: 23,
  },
  {
    key: 'earth',
    index: '03',
    name: 'Earth',
    type: 'Terrestrial planet',
    subtitle: 'The pale blue dot',
    description:
      'Our home resolves into ocean, cloud, and green continental shelves. A magnetosphere and a thin blue atmosphere hold the only known life in the cosmos within reach.',
    fact: 'More than a billion worlds could fit inside the Sun.',
    stats: { distance: '1.00 AU', diameter: '12,742 km', day: '24 h', year: '365.25 d' },
    color: '#72a9ce',
    radius: 0.62,
    orbit: 14.6,
    speed: 0.13,
    phase: 1.85,
    inclination: 0,
    tilt: 0.41,
    spin: 0.42,
    seed: 37,
    atmosphere: '#6bb7ff',
    clouds: true,
    moon: { radius: 0.17, distance: 1.38, speed: 1.25, color: '#b9b8b2' },
  },
  {
    key: 'mars',
    index: '04',
    name: 'Mars',
    type: 'Terrestrial planet',
    subtitle: 'The rust-red frontier',
    description:
      'Iron-rich dust gives Mars its color. Across its cold deserts lie the largest volcano in the solar system and canyons that would stretch across a continent.',
    fact: 'Olympus Mons rises roughly three times higher than Mount Everest.',
    stats: { distance: '1.52 AU', diameter: '6,779 km', day: '24.6 h', year: '687 d' },
    color: '#c97752',
    radius: 0.4,
    orbit: 19.2,
    speed: 0.085,
    phase: 5.15,
    inclination: 0.03,
    tilt: 0.44,
    spin: 0.39,
    seed: 49,
  },
  {
    key: 'jupiter',
    index: '05',
    name: 'Jupiter',
    type: 'Gas giant',
    subtitle: 'The king of planets',
    description:
      'A world with no firm surface, wrapped in ammonia cloud belts and storms older than telescopes. Jupiter’s gravity shapes much of the architecture of the outer system.',
    fact: 'The Great Red Spot is a storm wider than Earth.',
    stats: { distance: '5.20 AU', diameter: '139,820 km', day: '9.9 h', year: '11.86 yr' },
    color: '#d9b28b',
    radius: 1.64,
    orbit: 27.2,
    speed: 0.043,
    phase: 3.35,
    inclination: 0.025,
    tilt: 0.05,
    spin: 0.88,
    seed: 61,
    moons: [
      { radius: 0.105, distance: 2.45, speed: 1.7, color: '#d6c091', phase: 0.4 },
      { radius: 0.09, distance: 3.0, speed: 1.32, color: '#ddd9c8', phase: 2.2 },
      { radius: 0.13, distance: 3.65, speed: 1.02, color: '#a9937d', phase: 4.5 },
      { radius: 0.11, distance: 4.35, speed: 0.78, color: '#77716c', phase: 5.7 },
    ],
  },
  {
    key: 'saturn',
    index: '06',
    name: 'Saturn',
    type: 'Gas giant',
    subtitle: 'The ringed jewel',
    description:
      'Saturn’s rings are a suspended landscape of ice and rock, only tens of meters thick in places. The planet itself is so light it would float in a sufficiently large ocean.',
    fact: 'Saturn’s rings span about 280,000 km, yet can be thinner than a football field.',
    stats: { distance: '9.58 AU', diameter: '116,460 km', day: '10.7 h', year: '29.45 yr' },
    color: '#e5c987',
    radius: 1.34,
    orbit: 35.6,
    speed: 0.029,
    phase: 0.6,
    inclination: 0.045,
    tilt: 0.47,
    spin: 0.76,
    seed: 73,
    rings: true,
    moon: { radius: 0.14, distance: 4.15, speed: 0.52, color: '#bda77f', phase: 4.1 },
  },
  {
    key: 'uranus',
    index: '07',
    name: 'Uranus',
    type: 'Ice giant',
    subtitle: 'The tilted world',
    description:
      'Methane gives Uranus its quiet blue-green sheen. Knocked onto its side long ago, the planet rolls around the Sun, giving each pole a generation-long day and night.',
    fact: 'Uranus was the first planet found with a telescope, in 1781.',
    stats: { distance: '19.22 AU', diameter: '50,724 km', day: '17.2 h', year: '84 yr' },
    color: '#9bd4d4',
    radius: 0.9,
    orbit: 42.8,
    speed: 0.017,
    phase: 2.9,
    inclination: 0.02,
    tilt: 1.71,
    spin: -0.5,
    seed: 89,
    atmosphere: '#a6eeea',
  },
  {
    key: 'neptune',
    index: '08',
    name: 'Neptune',
    type: 'Ice giant',
    subtitle: 'The wind-whipped blue',
    description:
      'At the edge of the planetary realm, Neptune glows cobalt beneath the fastest winds measured anywhere. Sunlight takes more than four hours to reach this distant world.',
    fact: 'Neptune was predicted mathematically before it was seen through a telescope.',
    stats: { distance: '30.05 AU', diameter: '49,244 km', day: '16.1 h', year: '164.8 yr' },
    color: '#527be5',
    radius: 0.87,
    orbit: 50,
    speed: 0.012,
    phase: 5.7,
    inclination: 0.03,
    tilt: 0.49,
    spin: 0.63,
    seed: 97,
    atmosphere: '#5f86ff',
  },
];

const SUN_DATA = {
  key: 'sun',
  index: '00',
  name: 'Sun',
  type: 'G2V main-sequence star',
  subtitle: 'The heart of the orrery',
  description:
    'A sphere of hydrogen and helium holding 99.86% of the solar system’s mass. Its fusion core turns matter into light, and its gravity keeps every world in this atlas in motion.',
  fact: 'Light leaves the Sun’s surface and reaches Earth in about 8 minutes 20 seconds.',
  stats: { distance: '0.00 AU', diameter: '1,392,700 km', day: '25.4 d', year: '230 Myr' },
  color: '#ffb84d',
};

const ALL_DATA = Object.fromEntries([
  ['sun', SUN_DATA],
  ...PLANETS.map((planet) => [planet.key, planet]),
]);

const dom = {
  canvas: document.getElementById('solar-canvas'),
  loader: document.getElementById('loader'),
  fallback: document.getElementById('fallback'),
  hero: document.getElementById('hero'),
  panel: document.getElementById('object-panel'),
  panelIndex: document.getElementById('panel-index'),
  panelType: document.getElementById('panel-type'),
  panelName: document.getElementById('panel-name'),
  panelSubtitle: document.getElementById('panel-subtitle'),
  panelDescription: document.getElementById('panel-description'),
  panelFact: document.getElementById('panel-fact'),
  statDistance: document.getElementById('stat-distance'),
  statDiameter: document.getElementById('stat-diameter'),
  statDay: document.getElementById('stat-day'),
  statYear: document.getElementById('stat-year'),
  labels: document.getElementById('planet-labels'),
  reticle: document.getElementById('reticle'),
  navItems: [...document.querySelectorAll('.nav-item')],
  overviewButton: document.getElementById('overview-button'),
  panelClose: document.getElementById('panel-close'),
  brandButton: document.getElementById('brand-button'),
  beginDrift: document.getElementById('begin-drift'),
  driftButton: document.getElementById('drift-button'),
  fullscreenButton: document.getElementById('fullscreen-button'),
  hoverTag: document.getElementById('hover-tag'),
  frameDistance: document.getElementById('frame-distance'),
};

let renderer;
let scene;
let camera;
let controls;
let composer;
let bloomPass;
let softwareRenderer = false;
let sunMaterial;
let starField;
let sunGlowA;
let sunGlowB;
let sunParticles;
let asteroidBelt;
let kuiperBelt;
let systemGroup;
let sunGroup;
let elapsed = 0;
let selectedKey = 'overview';
let followTarget = null;
let flyState = null;
let tourActive = false;
let lastTourAdvance = 0;
let hoveredKey = null;
let pointerDown = null;
let activePointerId = null;
let readoutAccumulator = 0;

const planetObjects = new Map();
const planetLabels = new Map();
const orbitLines = new Map();
const pickables = [];
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2(10, 10);
const pointerScreen = new THREE.Vector2();
const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();
const followPrevious = new THREE.Vector3();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mix(a, b, t) {
  const k = clamp(t, 0, 1);
  return a + (b - a) * k;
}

function mixRgb(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function latticeHash(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = ((xi % period) + period) % period;
  const x1 = ((xi + 1) % period + period) % period;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = latticeHash(x0, yi, seed);
  const b = latticeHash(x1, yi, seed);
  const c = latticeHash(x0, yi + 1, seed);
  const d = latticeHash(x1, yi + 1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v);
}

function fbm2(x, y, period, seed, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += periodicValueNoise(x * frequency, y * frequency, period * frequency, seed + i * 31) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / normalization;
}

function makeTexture(width, height, pixelFn, afterDraw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  const image = context.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const rgb = pixelFn(u, v, x, y);
      const index = (y * width + x) * 4;
      data[index] = clamp(Math.round(rgb[0]), 0, 255);
      data[index + 1] = clamp(Math.round(rgb[1]), 0, 255);
      data[index + 2] = clamp(Math.round(rgb[2]), 0, 255);
      data[index + 3] = clamp(Math.round(rgb[3] ?? 255), 0, 255);
    }
  }

  context.putImageData(image, 0, 0);
  if (afterDraw) afterDraw(context, canvas);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy?.() || 1);
  texture.needsUpdate = true;
  return texture;
}

function createPlanetTexture(planet) {
  const seed = planet.seed;
  const size = planet.key === 'earth' ? 640 : 512;
  const height = size / 2;

  return makeTexture(
    size,
    height,
    (u, v) => {
      const latitude = Math.abs(v - 0.5) * 2;

      if (planet.key === 'mercury') {
        const broad = fbm2(u * 7, v * 7, 7, seed, 5);
        const fine = fbm2(u * 28, v * 28, 28, seed + 20, 3);
        const shade = 76 + broad * 88 + (fine - 0.5) * 24;
        return [shade * 1.02, shade * 0.96, shade * 0.88];
      }

      if (planet.key === 'venus') {
        const broad = fbm2(u * 5, v * 5, 5, seed, 5);
        const cloud = fbm2(u * 14 + 2, v * 14, 14, seed + 8, 4);
        const wave = 0.5 + 0.5 * Math.sin((v * 9 + broad * 2.1) * TAU + u * 3.2);
        let color = mixRgb([178, 139, 89], [247, 225, 180], 0.25 + wave * 0.68);
        color = mixRgb(color, [255, 240, 208], smoothstep(0.52, 0.85, cloud) * 0.44);
        color = mixRgb(color, [131, 95, 58], smoothstep(0.62, 0.9, 1 - broad) * 0.12);
        return color;
      }

      if (planet.key === 'earth') {
        const continental = fbm2(u * 5.2, v * 5.2, 5, seed, 6);
        const detail = fbm2(u * 19, v * 19, 19, seed + 17, 4);
        const coast = continental + (detail - 0.5) * 0.15;
        const landMix = smoothstep(0.535, 0.575, coast);
        const oceanDepth = smoothstep(0.33, 0.57, continental);
        let ocean = mixRgb([5, 25, 61], [25, 83, 132], oceanDepth);
        ocean = mixRgb(ocean, [47, 128, 158], smoothstep(0.6, 0.8, detail) * 0.22);
        let land = mixRgb([38, 83, 49], [124, 119, 70], detail);
        land = mixRgb(land, [159, 142, 104], smoothstep(0.63, 0.78, detail) * 0.7);
        land = mixRgb(land, [42, 73, 43], smoothstep(0.58, 0.76, 1 - broadNoise(continental)) * 0.3);
        const ice = smoothstep(0.79, 0.94, latitude + (detail - 0.5) * 0.08);
        let color = mixRgb(ocean, land, landMix);
        color = mixRgb(color, [223, 231, 225], ice * 0.92);
        return color;
      }

      if (planet.key === 'mars') {
        const broad = fbm2(u * 6.5, v * 6.5, 6, seed, 5);
        const fine = fbm2(u * 24, v * 24, 24, seed + 4, 3);
        let color = mixRgb([91, 42, 31], [189, 98, 60], 0.28 + broad * 0.72);
        color = mixRgb(color, [72, 43, 39], smoothstep(0.55, 0.76, 1 - broad) * 0.42);
        color = mixRgb(color, [119, 64, 42], smoothstep(0.6, 0.85, fine) * 0.2);
        const ice = smoothstep(0.86, 0.96, latitude + (fine - 0.5) * 0.035);
        color = mixRgb(color, [232, 225, 210], ice);
        return color;
      }

      if (planet.key === 'jupiter') {
        const turbulence = fbm2(u * 8, v * 8, 8, seed, 5);
        const fine = fbm2(u * 22, v * 22, 22, seed + 7, 3);
        const bands = 0.5 + 0.5 * Math.sin((v * 16 + turbulence * 2.4 + (fine - 0.5) * 0.35) * Math.PI);
        let color = mixRgb([133, 83, 55], [231, 210, 177], bands);
        color = mixRgb(color, [249, 236, 208], smoothstep(0.7, 0.92, bands) * 0.28);
        color = mixRgb(color, [159, 105, 68], smoothstep(0.56, 0.82, turbulence) * 0.18);
        let du = u - 0.26;
        if (du > 0.5) du -= 1;
        if (du < -0.5) du += 1;
        const spotDistance = Math.sqrt((du / 0.06) ** 2 + ((v - 0.63) / 0.027) ** 2);
        if (spotDistance < 1) {
          const spot = (1 - spotDistance) * smoothstep(0.1, 0.8, 1 - spotDistance);
          color = mixRgb(color, [153, 67, 44], spot * 0.85);
          color = mixRgb(color, [220, 137, 95], spot * smoothstep(0.58, 0.95, fine) * 0.25);
        }
        return color;
      }

      if (planet.key === 'saturn') {
        const turbulence = fbm2(u * 7, v * 7, 7, seed, 4);
        const bands = 0.5 + 0.5 * Math.sin((v * 18 + turbulence * 1.4) * Math.PI);
        let color = mixRgb([168, 137, 88], [235, 212, 162], bands);
        color = mixRgb(color, [249, 232, 190], smoothstep(0.7, 0.98, bands) * 0.24);
        color = mixRgb(color, [133, 111, 77], smoothstep(0.54, 0.78, turbulence) * 0.12);
        return color;
      }

      if (planet.key === 'uranus') {
        const haze = fbm2(u * 6, v * 6, 6, seed, 4);
        const bands = 0.5 + 0.5 * Math.sin((v * 11 + haze * 0.8) * Math.PI);
        let color = mixRgb([118, 191, 197], [178, 229, 224], bands);
        color = mixRgb(color, [207, 242, 235], smoothstep(0.68, 0.92, haze) * 0.2);
        return color;
      }

      const turbulence = fbm2(u * 7, v * 7, 7, seed, 4);
      const bands = 0.5 + 0.5 * Math.sin((v * 12 + turbulence * 1.1) * Math.PI);
      let color = mixRgb([26, 55, 133], [68, 111, 202], bands);
      color = mixRgb(color, [108, 153, 231], smoothstep(0.72, 0.97, turbulence) * 0.22);
      let du = u - 0.68;
      if (du > 0.5) du -= 1;
      if (du < -0.5) du += 1;
      const spotDistance = Math.sqrt((du / 0.055) ** 2 + ((v - 0.38) / 0.024) ** 2);
      if (spotDistance < 1) color = mixRgb(color, [18, 37, 91], (1 - spotDistance) * 0.7);
      return color;
    },
    (context, canvas) => {
      if (planet.key === 'mercury') drawCraters(context, canvas, seed);
      if (planet.key === 'mars') drawMarsDetails(context, canvas, seed);
    },
  );
}

function broadNoise(value) {
  return smoothstep(0.35, 0.65, value);
}

function drawCraters(context, canvas, seed) {
  const random = mulberry32(seed + 100);
  context.save();
  for (let i = 0; i < 115; i += 1) {
    const x = random() * canvas.width;
    const y = canvas.height * (0.08 + random() * 0.84);
    const radius = 1.5 + random() ** 3 * 17;
    const gradient = context.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    gradient.addColorStop(0, `rgba(25, 24, 22, ${0.16 + random() * 0.16})`);
    gradient.addColorStop(0.58, 'rgba(45, 43, 40, 0.07)');
    gradient.addColorStop(0.82, 'rgba(215, 208, 194, 0.11)');
    gradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawMarsDetails(context, canvas, seed) {
  const random = mulberry32(seed + 44);
  context.save();
  for (let i = 0; i < 34; i += 1) {
    const x = random() * canvas.width;
    const y = canvas.height * (0.14 + random() * 0.72);
    const radius = 4 + random() * 28;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(49, 31, 26, ${0.06 + random() * 0.06})`);
    gradient.addColorStop(1, 'rgba(49, 31, 26, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  context.restore();
}

function createCloudTexture() {
  return makeTexture(384, 192, (u, v) => {
    const broad = fbm2(u * 7, v * 7, 7, 901, 4);
    const wisps = fbm2(u * 23 + 4, v * 23, 23, 913, 3);
    const latitude = Math.abs(v - 0.5) * 2;
    const storm = broad * 0.72 + wisps * 0.28 - latitude * 0.06;
    const alpha = smoothstep(0.58, 0.76, storm) * 235;
    return [244, 246, 241, alpha];
  });
}

function createRingTexture() {
  const width = 1024;
  const height = 8;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  const data = image.data;
  const random = mulberry32(717);

  for (let x = 0; x < width; x += 1) {
    const r = x / (width - 1);
    const fineBands = 0.5 + 0.5 * Math.sin(r * 116 + Math.sin(r * 31) * 2.1);
    const mediumBands = 0.5 + 0.5 * Math.sin(r * 53 + 1.8);
    const gap = 1 - Math.exp(-(((r - 0.63) / 0.035) ** 2)) * 0.92;
    const outerFade = 1 - smoothstep(0.88, 1, r);
    const innerFade = smoothstep(0.02, 0.15, r);
    const grain = 0.84 + random() * 0.16;
    const alpha = clamp((0.22 + fineBands * 0.34 + mediumBands * 0.18) * gap * outerFade * innerFade * grain, 0, 0.92);
    const color = mixRgb([151, 121, 79], [245, 226, 183], mediumBands * 0.72 + fineBands * 0.2);
    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = alpha * 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy?.() || 1);
  return texture;
}

function createRadialGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 250, 224, 1)');
  gradient.addColorStop(0.08, 'rgba(255, 224, 144, 0.96)');
  gradient.addColorStop(0.2, 'rgba(255, 171, 69, 0.52)');
  gradient.addColorStop(0.42, 'rgba(255, 115, 30, 0.16)');
  gradient.addColorStop(0.7, 'rgba(255, 85, 18, 0.035)');
  gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBodyMaterial(planet) {
  if (softwareRenderer) {
    return new THREE.MeshLambertMaterial({
      map: createPlanetTexture(planet),
      emissive: new THREE.Color(planet.color).multiplyScalar(0.055),
      emissiveIntensity: 1,
    });
  }
  return new THREE.MeshStandardMaterial({
    map: createPlanetTexture(planet),
    roughness: planet.key === 'earth' ? 0.72 : 0.91,
    metalness: 0,
    emissive: new THREE.Color(planet.color).multiplyScalar(0.055),
    emissiveIntensity: 1,
  });
}

function createAtmosphereMaterial(color, intensity = 0.7) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.4);
        gl_FragColor = vec4(uColor, fresnel * uIntensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

function createSun() {
  sunGroup = new THREE.Group();
  scene.add(sunGroup);

  sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vView;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);
        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);
        return mix(nxy0, nxy1, f.z);
      }

      float fbm3(vec3 p) {
        float value = 0.0;
        float amplitude = 0.55;
        for (int i = 0; i < 4; i++) {
          value += noise3(p) * amplitude;
          p = p * 2.03 + vec3(13.1, 7.7, 5.3);
          amplitude *= 0.48;
        }
        return value;
      }

      void main() {
        vec3 direction = normalize(vPosition);
        vec3 p = direction * 2.7;
        float slow = uTime * 0.035;
        float turbulence = fbm3(p + vec3(0.0, slow, slow * 0.55));
        float cells = fbm3(p * 3.1 - vec3(slow * 0.7));
        float heat = smoothstep(0.27, 0.87, turbulence + cells * 0.28);
        vec3 deep = vec3(0.42, 0.045, 0.002);
        vec3 orange = vec3(1.0, 0.32, 0.015);
        vec3 whiteHot = vec3(1.0, 0.87, 0.48);
        vec3 color = mix(deep, orange, heat);
        color = mix(color, whiteHot, pow(heat, 3.4) * 0.74);
        color += vec3(1.0, 0.35, 0.04) * pow(1.0 - max(dot(vNormal, vView), 0.0), 3.4) * 0.9;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.15, softwareRenderer ? 64 : 96, softwareRenderer ? 44 : 64), sunMaterial);
  sunMesh.userData.objectKey = 'sun';
  sunGroup.add(sunMesh);
  pickables.push(sunMesh);

  const glowTexture = createRadialGlowTexture();
  sunGlowA = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffc26a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }),
  );
  sunGlowA.scale.setScalar(15.5);
  sunGroup.add(sunGlowA);

  sunGlowB = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff8b32,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }),
  );
  sunGlowB.scale.setScalar(35);
  sunGroup.add(sunGlowB);

  const particleCount = 260;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const random = mulberry32(455);
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 3.5 + random() * 2.3;
    const theta = random() * TAU;
    const phi = Math.acos(2 * random() - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    const color = new THREE.Color().setHSL(0.08 + random() * 0.035, 1, 0.56 + random() * 0.25);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  sunParticles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: 0.075,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  sunGroup.add(sunParticles);

  const sunLight = new THREE.PointLight(0xffd4a0, 760, 0, 2);
  sunGroup.add(sunLight);
}

function createOrbitLine(radius, color) {
  const points = [];
  const segments = 192;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * TAU;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.17,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.userData.baseColor = new THREE.Color(color);
  line.userData.radius = radius;
  return line;
}

function makeRingGeometry(innerRadius, outerRadius, segments = 220) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments, 3);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const radius = Math.sqrt(x * x + y * y);
    uvs.setXY(i, clamp((radius - innerRadius) / (outerRadius - innerRadius), 0, 1), 0.5);
  }
  uvs.needsUpdate = true;
  return geometry;
}

function createMoon(moon, index) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(moon.radius, 24, 16);
  const material = softwareRenderer
    ? new THREE.MeshLambertMaterial({
        color: new THREE.Color(moon.color),
        emissive: new THREE.Color(moon.color).multiplyScalar(0.05),
      })
    : new THREE.MeshStandardMaterial({
        color: new THREE.Color(moon.color),
        roughness: 1,
        metalness: 0,
        emissive: new THREE.Color(moon.color).multiplyScalar(0.05),
      });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = moon.distance;
  group.add(mesh);
  group.rotation.x = (index % 2 === 0 ? 1 : -1) * (0.06 + index * 0.025);
  return { group, mesh, data: moon };
}

function createPlanet(planet) {
  const orbitPlane = new THREE.Group();
  orbitPlane.rotation.x = planet.inclination;
  systemGroup.add(orbitPlane);

  const orbitLine = createOrbitLine(planet.orbit, planet.color);
  orbitPlane.add(orbitLine);
  orbitLines.set(planet.key, orbitLine);

  const holder = new THREE.Group();
  orbitPlane.add(holder);

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = planet.tilt;
  holder.add(tiltGroup);

  const geometry = softwareRenderer
    ? new THREE.SphereGeometry(planet.radius, 40, 28)
    : new THREE.SphereGeometry(planet.radius, 64, 48);
  const material = createBodyMaterial(planet);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.objectKey = planet.key;
  tiltGroup.add(mesh);
  pickables.push(mesh);

  let atmosphere = null;
  if (planet.atmosphere) {
    atmosphere = new THREE.Mesh(
      softwareRenderer
        ? new THREE.SphereGeometry(planet.radius * 1.035, 36, 24)
        : new THREE.SphereGeometry(planet.radius * 1.035, 64, 48),
      createAtmosphereMaterial(planet.atmosphere, planet.key === 'earth' ? 0.9 : 0.58),
    );
    tiltGroup.add(atmosphere);
  }

  let clouds = null;
  if (planet.clouds) {
    clouds = new THREE.Mesh(
      softwareRenderer
        ? new THREE.SphereGeometry(planet.radius * 1.012, 36, 24)
        : new THREE.SphereGeometry(planet.radius * 1.012, 64, 48),
      softwareRenderer
        ? new THREE.MeshLambertMaterial({
            map: createCloudTexture(),
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            emissive: new THREE.Color(0x4c6078).multiplyScalar(0.08),
          })
        : new THREE.MeshStandardMaterial({
            map: createCloudTexture(),
            transparent: true,
            opacity: 0.82,
            roughness: 1,
            metalness: 0,
            depthWrite: false,
            emissive: new THREE.Color(0x4c6078).multiplyScalar(0.08),
          }),
    );
    tiltGroup.add(clouds);
  }

  let ringMesh = null;
  if (planet.rings) {
    const ringGeometry = makeRingGeometry(planet.radius * 1.42, planet.radius * 2.45, softwareRenderer ? 160 : 220);
    const ringMaterial = softwareRenderer
      ? new THREE.MeshLambertMaterial({
          map: createRingTexture(),
          transparent: true,
          opacity: 0.93,
          side: THREE.DoubleSide,
          depthWrite: false,
          emissive: new THREE.Color(0x4b3921).multiplyScalar(0.05),
        })
      : new THREE.MeshStandardMaterial({
          map: createRingTexture(),
          transparent: true,
          opacity: 0.93,
          roughness: 0.95,
          metalness: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          emissive: new THREE.Color(0x4b3921).multiplyScalar(0.05),
        });
    ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.userData.objectKey = 'saturn';
    tiltGroup.add(ringMesh);
    pickables.push(ringMesh);
  }

  const moons = [];
  const moonList = planet.moon ? [planet.moon] : planet.moons || [];
  moonList.forEach((moon, index) => {
    const moonObject = createMoon(moon, index);
    tiltGroup.add(moonObject.group);
    moons.push(moonObject);
  });

  planetObjects.set(planet.key, {
    data: planet,
    orbitPlane,
    holder,
    tiltGroup,
    mesh,
    clouds,
    atmosphere,
    ringMesh,
    moons,
    angle: planet.phase,
  });
}

function createOrbitSystem() {
  systemGroup = new THREE.Group();
  scene.add(systemGroup);

  const ecliptic = new THREE.Mesh(
    new THREE.CircleGeometry(52.4, 96),
    new THREE.MeshBasicMaterial({
      color: 0x6f8ca8,
      transparent: true,
      opacity: 0.018,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ecliptic.rotation.x = -Math.PI / 2;
  ecliptic.position.y = -0.05;
  systemGroup.add(ecliptic);

  PLANETS.forEach(createPlanet);

  const random = mulberry32(3434);
  const asteroidCount = softwareRenderer ? 850 : isCoarsePointer ? 1200 : 2200;
  const asteroidPositions = new Float32Array(asteroidCount * 3);
  const asteroidColors = new Float32Array(asteroidCount * 3);
  for (let i = 0; i < asteroidCount; i += 1) {
    const radius = 22.2 + (random() - 0.5) * 2.8;
    const angle = random() * TAU;
    const y = (random() - 0.5) * 0.48;
    asteroidPositions[i * 3] = Math.cos(angle) * radius;
    asteroidPositions[i * 3 + 1] = y;
    asteroidPositions[i * 3 + 2] = Math.sin(angle) * radius;
    const tone = 0.42 + random() * 0.34;
    asteroidColors[i * 3] = tone * 1.08;
    asteroidColors[i * 3 + 1] = tone * 0.91;
    asteroidColors[i * 3 + 2] = tone * 0.68;
  }
  const asteroidGeometry = new THREE.BufferGeometry();
  asteroidGeometry.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
  asteroidGeometry.setAttribute('color', new THREE.BufferAttribute(asteroidColors, 3));
  asteroidBelt = new THREE.Points(
    asteroidGeometry,
    new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  systemGroup.add(asteroidBelt);

  const kuiperCount = softwareRenderer ? 420 : isCoarsePointer ? 600 : 1100;
  const kuiperPositions = new Float32Array(kuiperCount * 3);
  const kuiperColors = new Float32Array(kuiperCount * 3);
  for (let i = 0; i < kuiperCount; i += 1) {
    const radius = 56 + random() * 9;
    const angle = random() * TAU;
    kuiperPositions[i * 3] = Math.cos(angle) * radius;
    kuiperPositions[i * 3 + 1] = (random() - 0.5) * 2.2;
    kuiperPositions[i * 3 + 2] = Math.sin(angle) * radius;
    const tone = 0.3 + random() * 0.26;
    kuiperColors[i * 3] = tone * 0.8;
    kuiperColors[i * 3 + 1] = tone * 0.9;
    kuiperColors[i * 3 + 2] = tone;
  }
  const kuiperGeometry = new THREE.BufferGeometry();
  kuiperGeometry.setAttribute('position', new THREE.BufferAttribute(kuiperPositions, 3));
  kuiperGeometry.setAttribute('color', new THREE.BufferAttribute(kuiperColors, 3));
  kuiperBelt = new THREE.Points(
    kuiperGeometry,
    new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  systemGroup.add(kuiperBelt);
}

function createStarField() {
  const count = softwareRenderer ? 6200 : isCoarsePointer ? 7200 : 13000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const random = mulberry32(1977);
  const cool = new THREE.Color(0xaec9ff);
  const neutral = new THREE.Color(0xfff6e6);
  const warm = new THREE.Color(0xffc99c);

  for (let i = 0; i < count; i += 1) {
    const radius = 150 + random() * 310;
    const theta = random() * TAU;
    const phi = Math.acos(2 * random() - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

    const pick = random();
    const color = pick < 0.2 ? cool : pick > 0.82 ? warm : neutral;
    const brightness = 0.42 + random() ** 2 * 0.72;
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
    sizes[i] = 0.9 + random() ** 3 * 2.9;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uPixelRatio;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(8.0, aSize * uPixelRatio * (260.0 / max(-mvPosition.z, 1.0)));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float distanceToCenter = length(p);
        float alpha = smoothstep(0.5, 0.04, distanceToCenter);
        alpha = pow(alpha, 1.8);
        gl_FragColor = vec4(vColor, alpha * 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  starField = new THREE.Points(geometry, material);
  starField.frustumCulled = false;
  scene.add(starField);
}

function createSkyBackground() {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const random = mulberry32(8081);

  const baseGradient = context.createLinearGradient(0, 0, 0, height);
  baseGradient.addColorStop(0, '#010207');
  baseGradient.addColorStop(0.42, '#030611');
  baseGradient.addColorStop(0.58, '#05070d');
  baseGradient.addColorStop(1, '#010207');
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  context.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 96; i += 1) {
    const x = random() * width;
    const bandY = height * (0.49 + Math.sin((x / width) * TAU * 1.3 + 0.8) * 0.12);
    const y = bandY + (random() - 0.5) * 90;
    const radius = 34 + random() * 150;
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    const cool = random() > 0.45;
    glow.addColorStop(0, cool ? 'rgba(42, 67, 108, 0.028)' : 'rgba(89, 58, 88, 0.018)');
    glow.addColorStop(0.55, cool ? 'rgba(24, 45, 78, 0.012)' : 'rgba(65, 42, 70, 0.008)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 30; i += 1) {
    const x = random() * width;
    const y = height * (0.34 + random() * 0.35);
    const radius = 80 + random() * 260;
    const veil = context.createRadialGradient(x, y, 0, x, y, radius);
    veil.addColorStop(0, 'rgba(37, 55, 96, 0.018)');
    veil.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = veil;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 1800; i += 1) {
    const x = random() * width;
    const bandBias = Math.exp(-(((x / width) * TAU - 3.3) ** 2)) * 0.22;
    const y = random() * height;
    const alpha = 0.12 + random() ** 2 * 0.54;
    const size = random() < 0.94 ? 0.7 : 1.4;
    const warmth = random();
    const r = warmth > 0.86 ? 255 : 205;
    const g = warmth > 0.86 ? 215 : 220;
    const b = warmth > 0.86 ? 172 : 255;
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.72, alpha + bandBias)})`;
    context.fillRect(x, y, size, size);
  }
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function overviewPosition() {
  if (window.innerWidth <= 760) return new THREE.Vector3(43, 40, 102);
  return new THREE.Vector3(46, 29, 70);
}

function updateCameraFov() {
  camera.fov = window.innerWidth <= 760 ? 61 : 50;
  camera.updateProjectionMatrix();
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
  softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);
  const softwarePixelRatio = window.innerWidth <= 760 ? 0.9 : 0.72;
  const pixelRatioCap = softwareRenderer ? softwarePixelRatio : isCoarsePointer ? 1.7 : 1.9;
  renderer.setPixelRatio(softwareRenderer ? softwarePixelRatio : Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = softwareRenderer ? null : createSkyBackground();
  if (softwareRenderer) renderer.setClearColor(0x000000, 0);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 1000);
  updateCameraFov();
  camera.position.copy(overviewPosition());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.052;
  controls.enablePan = false;
  controls.rotateSpeed = 0.44;
  controls.zoomSpeed = 0.72;
  controls.minDistance = 1.45;
  controls.maxDistance = 175;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.96;
  controls.target.set(0, 0, 0);
  controls.update();

  controls.addEventListener('start', () => {
    if (tourActive) setTour(false);
  });

  createStarField();
  createSun();

  const ambient = new THREE.AmbientLight(0x6f86ad, 0.34);
  scene.add(ambient);

  const fill = new THREE.DirectionalLight(0x87a9da, 0.62);
  fill.position.set(-16, 18, 12);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd0a0, 0.2);
  rim.position.set(18, -12, -14);
  scene.add(rim);

  createOrbitSystem();

  if (!softwareRenderer) {
    const bloomResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.35 : 1.7));
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(bloomResolution, isCoarsePointer ? 0.38 : 0.5, 0.66, 0.82);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
}

function createLabels() {
  const entries = [{ key: 'sun', name: 'Sun', color: SUN_DATA.color, radius: 3.15 }, ...PLANETS];
  entries.forEach((entry) => {
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.dataset.key = entry.key;
    label.style.setProperty('--label-color', entry.color);
    label.innerHTML = `<i></i><span>${entry.name}</span>`;
    dom.labels.appendChild(label);
    planetLabels.set(entry.key, label);
  });
}

function getWorldPosition(key, target) {
  if (key === 'sun') return target.set(0, 0, 0);
  return planetObjects.get(key)?.holder.getWorldPosition(target) ?? target.set(0, 0, 0);
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const halfHeight = height * 0.5;
  const tanHalfFov = Math.tan((camera.fov * DEG) / 2);

  planetLabels.forEach((label, key) => {
    getWorldPosition(key, tempVecA);
    const distance = camera.position.distanceTo(tempVecA);
    tempVecB.copy(tempVecA).project(camera);
    const visible = tempVecB.z > -1 && tempVecB.z < 1 && tempVecB.x > -1.08 && tempVecB.x < 1.08 && tempVecB.y > -1.08 && tempVecB.y < 1.08;

    if (!visible) {
      label.style.opacity = '0';
      return;
    }

    const x = (tempVecB.x * 0.5 + 0.5) * width;
    const y = (-tempVecB.y * 0.5 + 0.5) * height;
    const planetRadius = key === 'sun' ? 3.15 : planetObjects.get(key)?.data.radius || 0.4;
    const screenRadius = (planetRadius / Math.max(0.1, distance * tanHalfFov)) * halfHeight;
    const offset = clamp(screenRadius * 0.66 + 7, 7, 26);
    label.style.opacity = '';
    label.style.transform = `translate3d(${(x + offset).toFixed(1)}px, ${(y - screenRadius * 0.35 - 4).toFixed(1)}px, 0)`;
    label.classList.toggle('is-near', key === selectedKey);
    label.classList.toggle('is-muted', selectedKey !== 'overview' && key !== selectedKey);
  });
}

function updateReticle() {
  if (selectedKey === 'overview') {
    dom.reticle.classList.remove('is-visible');
    return;
  }
  getWorldPosition(selectedKey, tempVecA);
  tempVecB.copy(tempVecA).project(camera);
  const inFront = tempVecB.z > -1 && tempVecB.z < 1;
  const x = (tempVecB.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-tempVecB.y * 0.5 + 0.5) * window.innerHeight;
  dom.reticle.classList.toggle('is-visible', inFront && x > 10 && x < window.innerWidth - 10 && y > 10 && y < window.innerHeight - 10);
  const reticleSize = dom.reticle.offsetWidth || 62;
  dom.reticle.style.transform = `translate3d(${x - reticleSize / 2}px, ${y - reticleSize / 2}px, 0)`;
}

function updateObjectPanel(data) {
  dom.panelIndex.textContent = data.index;
  dom.panelType.textContent = data.type;
  dom.panelName.textContent = data.name;
  dom.panelSubtitle.textContent = data.subtitle;
  dom.panelDescription.textContent = data.description;
  dom.panelFact.textContent = data.fact;
  dom.statDistance.textContent = data.stats.distance;
  dom.statDiameter.textContent = data.stats.diameter;
  dom.statDay.textContent = data.stats.day;
  dom.statYear.textContent = data.stats.year;
}

function updateNavState() {
  dom.navItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.target === selectedKey);
  });
}

function getFocusOffset(key, targetWorld) {
  let distance = 5;
  if (key === 'sun') distance = 12.4;
  else if (key === 'saturn') distance = planetObjects.get(key).data.radius * 7.6;
  else if (key === 'earth') distance = planetObjects.get(key).data.radius * 7.4;
  else distance = Math.max(2.15, planetObjects.get(key).data.radius * 6.2);

  if (key === 'sun') {
    return new THREE.Vector3(0.64, 0.25, 0.73).normalize().multiplyScalar(distance);
  }

  const towardSun = targetWorld.clone().negate();
  if (towardSun.lengthSq() < 0.0001) towardSun.set(0, 0, 1);
  towardSun.normalize();
  const side = new THREE.Vector3(-towardSun.z, 0, towardSun.x).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = towardSun.multiplyScalar(0.58).add(side.multiplyScalar(0.64)).add(up.multiplyScalar(0.37)).normalize();
  return direction.multiplyScalar(distance);
}

function flyToObject(key, followObject) {
  const targetNow = followObject ? followObject.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 0, 0);
  const offset = getFocusOffset(key, targetNow);
  const destination = targetNow.clone().add(offset);
  const distance = camera.position.distanceTo(destination);
  const duration = clamp(1.25 + distance * 0.014, 1.4, 2.8) * (prefersReducedMotion ? 0.15 : 1);

  flyState = {
    start: performance.now() / 1000,
    duration,
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    followObject,
    offset,
    lift: Math.min(11, distance * 0.11),
  };
  controls.enabled = false;
}

function selectObject(key, options = {}) {
  const { fromTour = false } = options;
  if (!ALL_DATA[key] && key !== 'overview') return;
  if (!fromTour && tourActive) setTour(false);

  selectedKey = key;
  updateNavState();

  if (key === 'overview') {
    followTarget = null;
    controls.enabled = true;
    document.body.classList.remove('object-open');
    dom.panel.setAttribute('aria-hidden', 'true');
    dom.reticle.classList.remove('is-visible');
    flyState = {
      start: performance.now() / 1000,
      duration: prefersReducedMotion ? 0.2 : 1.6,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      followObject: null,
      offset: overviewPosition(),
      lift: 2,
    };
    controls.enabled = false;
    return;
  }

  const data = ALL_DATA[key];
  updateObjectPanel(data);
  document.body.classList.add('object-open');
  dom.panel.setAttribute('aria-hidden', 'false');

  if (key === 'sun') {
    followTarget = sunGroup;
  } else {
    followTarget = planetObjects.get(key)?.holder || null;
  }
  if (!followTarget) return;

  getWorldPosition(key, followPrevious);
  flyToObject(key, followTarget);
}

function setHover(key) {
  if (hoveredKey === key) return;
  hoveredKey = key;
  const label = key ? ALL_DATA[key]?.name : null;
  dom.hoverTag.classList.toggle('is-visible', Boolean(label) && window.innerWidth > 760);
  if (label) dom.hoverTag.querySelector('span').textContent = label;
  if (!dom.canvas.classList.contains('is-dragging')) {
    dom.canvas.style.cursor = key ? 'pointer' : 'grab';
  }
}

function pickObject(event) {
  if (!camera) return null;
  raycaster.setFromCamera(pointerNdc, camera);
  const intersections = raycaster.intersectObjects(pickables, false);
  return intersections.length ? intersections[0].object.userData.objectKey : null;
}

function updatePointerFromEvent(event) {
  const rect = dom.canvas.getBoundingClientRect();
  pointerScreen.x = event.clientX;
  pointerScreen.y = event.clientY;
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  dom.hoverTag.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
}

function setTour(enabled) {
  tourActive = enabled;
  document.body.classList.toggle('tour-on', enabled);
  dom.driftButton.setAttribute('aria-pressed', String(enabled));
  dom.driftButton.querySelector('span:nth-child(2)').textContent = enabled ? 'Drifting' : 'Auto drift';
  lastTourAdvance = performance.now() / 1000;
}

function advanceTour() {
  const order = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'mercury', 'venus'];
  const currentIndex = order.indexOf(selectedKey);
  const nextKey = order[(currentIndex + 1) % order.length];
  selectObject(nextKey, { fromTour: true });
}

function updateTour(now) {
  if (!tourActive || flyState) return;
  if (now - lastTourAdvance > 12.5) {
    lastTourAdvance = now;
    advanceTour();
  }
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  activePointerId = event.pointerId;
  pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
  dom.canvas.classList.add('is-dragging');
  dom.canvas.style.cursor = 'grabbing';
  updatePointerFromEvent(event);
}

function onPointerMove(event) {
  updatePointerFromEvent(event);
  if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) {
    pointerDown.moved = true;
  }
  if (event.pointerType === 'mouse' && !pointerDown?.moved && activePointerId === null) {
    setHover(pickObject(event));
  }
}

function onPointerUp(event) {
  if (pointerDown && !pointerDown.moved) {
    updatePointerFromEvent(event);
    const picked = pickObject(event);
    if (picked) selectObject(picked);
  }
  pointerDown = null;
  activePointerId = null;
  dom.canvas.classList.remove('is-dragging');
  dom.canvas.style.cursor = hoveredKey ? 'pointer' : 'grab';
}

function onPointerCancel() {
  pointerDown = null;
  activePointerId = null;
  dom.canvas.classList.remove('is-dragging');
  dom.canvas.style.cursor = 'grab';
}

function setupInteractions() {
  dom.canvas.addEventListener('pointerdown', onPointerDown);
  dom.canvas.addEventListener('pointermove', onPointerMove);
  dom.canvas.addEventListener('pointerup', onPointerUp);
  dom.canvas.addEventListener('pointercancel', onPointerCancel);
  dom.canvas.addEventListener('pointerleave', () => {
    if (!pointerDown) {
      setHover(null);
      dom.hoverTag.classList.remove('is-visible');
    }
  });

  dom.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target === 'overview') selectObject('overview');
      else selectObject(target);
    });
  });

  dom.overviewButton.addEventListener('click', () => selectObject('overview'));
  dom.brandButton.addEventListener('click', () => selectObject('overview'));
  dom.panelClose.addEventListener('click', () => selectObject('overview'));

  dom.beginDrift.addEventListener('click', () => {
    setTour(true);
    selectObject('earth', { fromTour: true });
  });

  dom.driftButton.addEventListener('click', () => {
    const next = !tourActive;
    setTour(next);
    if (next && selectedKey === 'overview') selectObject('earth', { fromTour: true });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectedKey !== 'overview') selectObject('overview');
  });

  dom.fullscreenButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen can be blocked by embedded browsers; the experience remains intact.
    }
  });

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const softwarePixelRatio = window.innerWidth <= 760 ? 0.9 : 0.72;
  const pixelRatioCap = softwareRenderer ? softwarePixelRatio : isCoarsePointer ? 1.7 : 1.9;
  renderer.setPixelRatio(softwareRenderer ? softwarePixelRatio : Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(width, height);
  updateCameraFov();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  composer?.setSize(width, height);
  if (starField?.material?.uniforms?.uPixelRatio) {
    starField.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }
  if (bloomPass) bloomPass.setSize(width, height);
}

function updatePlanetOrbits(time, delta) {
  PLANETS.forEach((planet) => {
    const object = planetObjects.get(planet.key);
    if (!object) return;
    object.angle = planet.phase + time * planet.speed;
    object.holder.position.x = Math.cos(object.angle) * planet.orbit;
    object.holder.position.z = Math.sin(object.angle) * planet.orbit;
    object.mesh.rotation.y += planet.spin * delta;
    if (object.clouds) object.clouds.rotation.y += planet.spin * delta * 1.08 + delta * 0.015;

    object.moons.forEach((moon) => {
      const angle = (moon.data.phase || 0) + time * moon.data.speed;
      moon.mesh.position.x = Math.cos(angle) * moon.data.distance;
      moon.mesh.position.z = Math.sin(angle) * moon.data.distance;
      moon.mesh.rotation.y += delta * 0.5;
    });
  });

  asteroidBelt.rotation.y = time * 0.012;
  kuiperBelt.rotation.y = time * 0.003;
  sunParticles.rotation.y = time * 0.035;
  sunParticles.rotation.x = Math.sin(time * 0.08) * 0.08;
  sunGlowA.scale.setScalar(15.5 + Math.sin(time * 0.7) * 0.18);
  sunGlowB.scale.setScalar(35 + Math.sin(time * 0.45 + 1) * 0.5);
}

function updateCamera(delta, now) {
  if (flyState) {
    const t = clamp((now - flyState.start) / flyState.duration, 0, 1);
    const eased = easeInOutCubic(t);
    if (flyState.followObject) {
      flyState.followObject.getWorldPosition(tempVecA);
      tempVecB.copy(tempVecA).add(flyState.offset);
    } else {
      tempVecA.set(0, 0, 0);
      tempVecB.copy(flyState.offset);
    }
    camera.position.lerpVectors(flyState.fromPosition, tempVecB, eased);
    camera.position.y += Math.sin(Math.PI * eased) * flyState.lift;
    controls.target.lerpVectors(flyState.fromTarget, tempVecA, eased);

    if (t >= 1) {
      camera.position.copy(tempVecB);
      controls.target.copy(tempVecA);
      followTarget = flyState.followObject;
      if (followTarget) getWorldPosition(selectedKey, followPrevious);
      flyState = null;
      controls.enabled = true;
      controls.update();
    }
  } else if (followTarget) {
    followTarget.getWorldPosition(tempVecA);
    tempVecB.copy(tempVecA).sub(followPrevious);
    camera.position.add(tempVecB);
    controls.target.copy(tempVecA);
    followPrevious.copy(tempVecA);
  }

  controls.update();
}

function updateOrbitHighlights() {
  orbitLines.forEach((line, key) => {
    const active = key === selectedKey;
    const muted = selectedKey !== 'overview' && !active;
    line.material.opacity = active ? 0.5 : muted ? 0.075 : 0.165;
    if (active) {
      line.material.color.set(0xf1b96f);
    } else {
      line.material.color.copy(line.userData.baseColor);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  const now = performance.now() / 1000;

  sunMaterial.uniforms.uTime.value = elapsed;
  updatePlanetOrbits(elapsed, delta);
  updateCamera(delta, now);
  updateTour(now);
  updateOrbitHighlights();
  updateLabels();
  updateReticle();

  starField.rotation.y = elapsed * 0.0008;
  starField.rotation.x = Math.sin(elapsed * 0.004) * 0.01;

  readoutAccumulator += delta;
  if (readoutAccumulator > 0.12) {
    const distanceAu = camera.position.length() / 14.6;
    dom.frameDistance.textContent = `Camera · ${distanceAu.toFixed(2)} AU`;
    readoutAccumulator = 0;
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

const clock = new THREE.Clock();

function finishLoading() {
  dom.canvas.classList.add('is-ready');
  document.body.classList.remove('is-loading');
  document.body.classList.add('ready');
  performance.mark('helios-ready');
}

function showFallback(error) {
  console.error('Helios could not start:', error);
  dom.loader?.classList.add('is-hidden');
  if (dom.fallback) dom.fallback.hidden = false;
  document.body.classList.remove('is-loading');
}

function boot() {
  try {
    setupRenderer();
    setupScene();
    createLabels();
    setupInteractions();

    document.querySelectorAll('.nav-item.is-active').forEach((item) => item.classList.remove('is-active'));
    updateObjectPanel(ALL_DATA.earth);
    updateNavState();

    dom.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      showFallback(new Error('The WebGL context was lost.'));
    });

    finishLoading();
    window.setTimeout(animate, 80);
  } catch (error) {
    showFallback(error);
  }
}

boot();
