import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const MOBILE_QUERY = window.matchMedia('(max-width: 760px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bodies = [];
const clickTargets = [];
const navButtons = new Map();
const clock = new THREE.Clock();
const tempVector = new THREE.Vector3();
const tempVectorB = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let renderer;
let composer;
let labelRenderer;
let scene;
let camera;
let controls;
let sunMesh;
let sunMaterial;
let sunGroup;
let asteroidBelt;
let kuiperBelt;
let bloomPass;
let starMaterial;
let firstFrame = true;

const state = {
  isMobile: MOBILE_QUERY.matches,
  focused: null,
  flight: null,
  paused: false,
  speedIndex: 2,
  speeds: [0.25, 0.5, 1, 2, 4],
  simDays: 0,
  lastFollowPosition: new THREE.Vector3(),
};

const planetData = [
  {
    id: 'sun',
    name: 'Sun',
    index: '00',
    type: 'G-TYPE MAIN SEQUENCE',
    radius: 4.6,
    accent: '#ffb15c',
    description:
      'A 4.6-billion-year-old furnace of hydrogen and helium, holding our planetary family in its gravitational embrace.',
    distance: 'SYSTEM CENTER',
    day: '25 EARTH DAYS',
    year: '230 MILLION YRS',
    moons: '8 PLANETS',
    note: 'The heart of our system',
    isSun: true,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    index: '01',
    type: 'TERRESTRIAL WORLD',
    radius: 0.52,
    orbitRadius: 11.2,
    angle: 0.25,
    orbitSpeed: 0.16,
    inclination: 0.12,
    tilt: 0.001,
    spin: 0.07,
    accent: '#b7afa5',
    description:
      'A cratered sentinel of rock, scorched by day and frozen by night as it races around the Sun.',
    distance: '0.39 AU',
    day: '59 EARTH DAYS',
    year: '88 DAYS',
    moons: '00',
    note: 'Sunward sentinel',
    texture: 'mercury',
  },
  {
    id: 'venus',
    name: 'Venus',
    index: '02',
    type: 'TERRESTRIAL WORLD',
    radius: 0.82,
    orbitRadius: 15.6,
    angle: 2.25,
    orbitSpeed: 0.12,
    inclination: 0.06,
    tilt: 0.05,
    spin: -0.025,
    accent: '#e9c88c',
    description:
      'A runaway greenhouse world, wrapped in luminous clouds and burning beneath a crushing atmosphere.',
    distance: '0.72 AU',
    day: '243 EARTH DAYS',
    year: '225 DAYS',
    moons: '00',
    note: 'The veiled world',
    texture: 'venus',
  },
  {
    id: 'earth',
    name: 'Earth',
    index: '03',
    type: 'TERRESTRIAL WORLD',
    radius: 0.88,
    orbitRadius: 20.8,
    angle: 1.18,
    orbitSpeed: 0.09,
    inclination: 0,
    tilt: 0.41,
    spin: 0.22,
    accent: '#78c5e2',
    description:
      'The pale blue dot. A water world wrapped in a thin, luminous atmosphere and alive with possibility.',
    distance: '1.00 AU',
    day: '24 HOURS',
    year: '365 DAYS',
    moons: '01',
    note: 'You are here',
    texture: 'earth',
  },
  {
    id: 'mars',
    name: 'Mars',
    index: '04',
    type: 'TERRESTRIAL WORLD',
    radius: 0.68,
    orbitRadius: 27,
    angle: 4.8,
    orbitSpeed: 0.07,
    inclination: 0.04,
    tilt: 0.44,
    spin: 0.2,
    accent: '#d47b58',
    description:
      'A rust-red desert with the tallest volcano in the solar system and canyons carved by ancient water.',
    distance: '1.52 AU',
    day: '24.6 HOURS',
    year: '687 DAYS',
    moons: '02',
    note: 'The red frontier',
    texture: 'mars',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    index: '05',
    type: 'GAS GIANT',
    radius: 2.25,
    orbitRadius: 40.5,
    angle: 0.55,
    orbitSpeed: 0.045,
    inclination: 0.025,
    tilt: 0.05,
    spin: 0.36,
    accent: '#d8ab7d',
    description:
      'A colossal sphere of storms and banded clouds, massive enough to hold a miniature solar system of moons.',
    distance: '5.20 AU',
    day: '9.9 HOURS',
    year: '11.9 YEARS',
    moons: '95',
    note: 'The great protector',
    texture: 'jupiter',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    index: '06',
    type: 'GAS GIANT',
    radius: 1.9,
    orbitRadius: 54,
    angle: 3.45,
    orbitSpeed: 0.033,
    inclination: 0.045,
    tilt: 0.47,
    spin: 0.3,
    accent: '#e4c891',
    description:
      'A pale giant crowned by a vast necklace of ice and rock, each particle tracing its own silent orbit.',
    distance: '9.54 AU',
    day: '10.7 HOURS',
    year: '29.4 YEARS',
    moons: '146',
    note: 'Lord of the rings',
    texture: 'saturn',
    ring: true,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    index: '07',
    type: 'ICE GIANT',
    radius: 1.32,
    orbitRadius: 68,
    angle: 4.25,
    orbitSpeed: 0.024,
    inclination: 0.03,
    tilt: 1.71,
    spin: -0.16,
    accent: '#9cdcdf',
    description:
      'An ice-blue world knocked onto its side, rolling through its 84-year orbit beneath faint, narrow rings.',
    distance: '19.20 AU',
    day: '17.2 HOURS',
    year: '84 YEARS',
    moons: '28',
    note: 'The tilted world',
    texture: 'uranus',
    minorRing: true,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    index: '08',
    type: 'ICE GIANT',
    radius: 1.28,
    orbitRadius: 82,
    angle: 5.75,
    orbitSpeed: 0.019,
    inclination: 0.035,
    tilt: 0.49,
    spin: 0.17,
    accent: '#6d9bf0',
    description:
      'A deep-blue giant at the solar system’s edge, where supersonic winds tear across a frozen atmosphere.',
    distance: '30.10 AU',
    day: '16.1 HOURS',
    year: '164.8 YEARS',
    moons: '16',
    note: 'The wind world',
    texture: 'neptune',
  },
];

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  paint(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function drawWrappedEllipse(context, x, y, radiusX, radiusY, width, fill, rotation = 0) {
  for (const offset of [-width, 0, width]) {
    context.beginPath();
    context.ellipse(x + offset, y, radiusX, radiusY, rotation, 0, TAU);
    context.fillStyle = fill;
    context.fill();
  }
}

function createRockyTexture(options) {
  const { seed, base, dark, light, craters = false, polarCaps = false } = options;
  return canvasTexture(768, 384, (context, width, height) => {
    const random = mulberry32(seed);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, dark);
    gradient.addColorStop(0.28, base);
    gradient.addColorStop(0.55, light);
    gradient.addColorStop(0.78, base);
    gradient.addColorStop(1, dark);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 210; index += 1) {
      const color = random() > 0.48 ? dark : light;
      drawWrappedEllipse(
        context,
        random() * width,
        random() * height,
        10 + random() * 80,
        3 + random() * 25,
        width,
        rgba(color, 0.035 + random() * 0.09),
        random() * Math.PI,
      );
    }

    for (let index = 0; index < 2200; index += 1) {
      const color = random() > 0.5 ? dark : light;
      context.fillStyle = rgba(color, 0.035 + random() * 0.1);
      context.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 2);
    }

    if (craters) {
      for (let index = 0; index < 64; index += 1) {
        const x = random() * width;
        const y = 25 + random() * (height - 50);
        const radius = 2 + random() * 17;
        for (const offset of [-width, 0, width]) {
          const crater = context.createRadialGradient(
            x + offset - radius * 0.2,
            y - radius * 0.2,
            radius * 0.05,
            x + offset,
            y,
            radius,
          );
          crater.addColorStop(0, rgba(light, 0.22));
          crater.addColorStop(0.52, rgba(dark, 0.28));
          crater.addColorStop(0.78, rgba(light, 0.12));
          crater.addColorStop(1, rgba(dark, 0));
          context.beginPath();
          context.arc(x + offset, y, radius, 0, TAU);
          context.fillStyle = crater;
          context.fill();
        }
      }
    }

    if (polarCaps) {
      const north = context.createLinearGradient(0, 0, 0, height * 0.14);
      north.addColorStop(0, rgba('#f3eee3', 0.88));
      north.addColorStop(1, rgba('#f3eee3', 0));
      context.fillStyle = north;
      context.fillRect(0, 0, width, height * 0.14);
      const south = context.createLinearGradient(0, height, 0, height * 0.87);
      south.addColorStop(0, rgba('#e9e4d9', 0.78));
      south.addColorStop(1, rgba('#e9e4d9', 0));
      context.fillStyle = south;
      context.fillRect(0, height * 0.87, width, height * 0.13);
    }
  });
}

function createVenusTexture() {
  return canvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(412);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#8c6238');
    gradient.addColorStop(0.22, '#c99552');
    gradient.addColorStop(0.5, '#e1b66d');
    gradient.addColorStop(0.77, '#c18a4d');
    gradient.addColorStop(1, '#805834');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let band = 0; band < 95; band += 1) {
      const y = random() * height;
      const phase = random() * TAU;
      const frequency = 1 + Math.floor(random() * 3);
      const amplitude = 2 + random() * 15;
      context.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const wave =
          Math.sin((x / width) * TAU * frequency + phase) * amplitude +
          Math.sin((x / width) * TAU * (frequency + 2) - phase) * amplitude * 0.32;
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.strokeStyle = rgba(random() > 0.46 ? '#f2d79d' : '#8d5d35', 0.05 + random() * 0.14);
      context.lineWidth = 3 + random() * 24;
      context.stroke();
    }

    for (let swirl = 0; swirl < 38; swirl += 1) {
      const x = random() * width;
      const y = random() * height;
      const radiusX = 18 + random() * 80;
      const radiusY = 3 + random() * 13;
      context.beginPath();
      context.ellipse(x, y, radiusX, radiusY, random() * 0.3 - 0.15, 0, TAU);
      context.strokeStyle = rgba(random() > 0.5 ? '#ffe4ac' : '#a06e3e', 0.08 + random() * 0.13);
      context.lineWidth = 1 + random() * 4;
      context.stroke();
    }
  });
}

function drawLandmass(context, centerX, centerY, radiusX, radiusY, random, fill, width) {
  const points = [];
  const steps = 28;
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * TAU;
    const wobble = 0.72 + random() * 0.52;
    points.push([
      centerX + Math.cos(angle) * radiusX * wobble,
      centerY + Math.sin(angle) * radiusY * wobble,
    ]);
  }

  for (const offset of [-width, 0, width]) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x + offset, y);
      else context.lineTo(x + offset, y);
    });
    context.closePath();
    context.fillStyle = fill;
    context.fill();
  }
}

function createEarthTexture() {
  return canvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(7319);
    const ocean = context.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, '#0a2439');
    ocean.addColorStop(0.22, '#0c3b58');
    ocean.addColorStop(0.5, '#105a78');
    ocean.addColorStop(0.78, '#0b3d5c');
    ocean.addColorStop(1, '#082036');
    context.fillStyle = ocean;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 500; index += 1) {
      drawWrappedEllipse(
        context,
        random() * width,
        random() * height,
        3 + random() * 35,
        1 + random() * 10,
        width,
        rgba(random() > 0.55 ? '#3c94a8' : '#071b31', 0.03 + random() * 0.08),
      );
    }

    const landmasses = [
      [0.17, 0.33, 76, 52, '#6b6f43'],
      [0.2, 0.51, 52, 78, '#45653f'],
      [0.25, 0.76, 34, 62, '#596943'],
      [0.47, 0.31, 44, 29, '#8a7545'],
      [0.5, 0.52, 65, 94, '#4d6a3e'],
      [0.55, 0.2, 35, 22, '#6b6d43'],
      [0.67, 0.34, 116, 68, '#5d6c40'],
      [0.73, 0.52, 80, 36, '#817342'],
      [0.82, 0.64, 34, 26, '#756b42'],
      [0.43, 0.14, 30, 18, '#777346'],
    ];

    for (const [x, y, radiusX, radiusY, fill] of landmasses) {
      drawLandmass(context, x * width, y * height, radiusX, radiusY, random, rgba(fill, 0.92), width);
      drawLandmass(
        context,
        x * width + 5,
        y * height - 4,
        radiusX * 0.6,
        radiusY * 0.62,
        random,
        rgba(random() > 0.45 ? '#87915a' : '#a08855', 0.33),
        width,
      );
    }

    for (let index = 0; index < 580; index += 1) {
      const land = random() > 0.64;
      context.fillStyle = rgba(land ? '#9e915d' : '#3d93a5', 0.04 + random() * 0.08);
      context.fillRect(random() * width, random() * height, 1 + random() * 4, 1 + random() * 3);
    }

    const north = context.createLinearGradient(0, 0, 0, height * 0.1);
    north.addColorStop(0, 'rgba(234, 242, 241, 0.95)');
    north.addColorStop(1, 'rgba(220, 238, 239, 0)');
    context.fillStyle = north;
    context.fillRect(0, 0, width, height * 0.1);

    const south = context.createLinearGradient(0, height, 0, height * 0.93);
    south.addColorStop(0, 'rgba(244, 248, 244, 1)');
    south.addColorStop(1, 'rgba(221, 239, 239, 0)');
    context.fillStyle = south;
    context.fillRect(0, height * 0.93, width, height * 0.07);
  });
}

function createCloudTexture() {
  return canvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(9902);
    context.clearRect(0, 0, width, height);

    for (let index = 0; index < 145; index += 1) {
      const y = 28 + random() * (height - 56);
      const x = random() * width;
      const radiusX = 20 + random() * 105;
      const radiusY = 2 + random() * 10;
      drawWrappedEllipse(
        context,
        x,
        y,
        radiusX,
        radiusY,
        width,
        rgba('#f5fbfb', 0.05 + random() * 0.14),
        (random() - 0.5) * 0.18,
      );
    }

    for (let index = 0; index < 34; index += 1) {
      const x = random() * width;
      const y = 40 + random() * (height - 80);
      context.beginPath();
      for (let step = 0; step < 4; step += 1) {
        const radius = 5 + step * (4 + random() * 5);
        context.ellipse(x, y + step * 1.5, radius * 1.8, radius * 0.42, random() * 0.15, 0, TAU);
      }
      context.strokeStyle = rgba('#ffffff', 0.05 + random() * 0.09);
      context.lineWidth = 1.5 + random() * 3;
      context.stroke();
    }
  });
}

function createMarsTexture() {
  const texture = createRockyTexture({
    seed: 92,
    base: '#a95035',
    dark: '#5f2b20',
    light: '#d1865b',
    craters: true,
    polarCaps: true,
  });

  const canvas = texture.image;
  const context = canvas.getContext('2d');
  const random = mulberry32(8172);
  for (let index = 0; index < 90; index += 1) {
    drawWrappedEllipse(
      context,
      random() * canvas.width,
      random() * canvas.height,
      6 + random() * 54,
      2 + random() * 17,
      canvas.width,
      rgba(random() > 0.55 ? '#3f1e1a' : '#e0a071', 0.04 + random() * 0.1),
      random() * Math.PI,
    );
  }
  texture.needsUpdate = true;
  return texture;
}

function createGasTexture(options) {
  const { seed, palette, bands, spot = false, storm = false } = options;
  return canvasTexture(1024, 512, (context, width, height) => {
    const random = mulberry32(seed);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    palette.forEach((color, index) => gradient.addColorStop(index / (palette.length - 1), color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < bands; index += 1) {
      const y = random() * height;
      const phase = random() * TAU;
      const frequency = 1 + Math.floor(random() * 3);
      const amplitude = 1 + random() * 8;
      const color = palette[Math.floor(random() * palette.length)];
      context.beginPath();
      for (let x = 0; x <= width; x += 14) {
        const wave =
          Math.sin((x / width) * TAU * frequency + phase) * amplitude +
          Math.sin((x / width) * TAU * (frequency + 2) + phase * 0.7) * amplitude * 0.35;
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.strokeStyle = rgba(color, 0.08 + random() * 0.24);
      context.lineWidth = 2 + random() * 19;
      context.stroke();
    }

    for (let index = 0; index < 52; index += 1) {
      context.beginPath();
      context.ellipse(
        random() * width,
        random() * height,
        8 + random() * 40,
        2 + random() * 8,
        0,
        0,
        TAU,
      );
      context.strokeStyle = rgba(random() > 0.46 ? '#fff0cc' : '#593924', 0.045 + random() * 0.09);
      context.lineWidth = 1 + random() * 3;
      context.stroke();
    }

    if (spot) {
      context.save();
      context.translate(width * 0.64, height * 0.62);
      context.scale(2.7, 1);
      const spotGradient = context.createRadialGradient(0, 0, 1, 0, 0, 45);
      spotGradient.addColorStop(0, rgba('#ad5d3e', 0.85));
      spotGradient.addColorStop(0.56, rgba('#c77955', 0.55));
      spotGradient.addColorStop(1, rgba('#e8b67d', 0));
      context.beginPath();
      context.arc(0, 0, 45, 0, TAU);
      context.fillStyle = spotGradient;
      context.fill();
      context.restore();
    }

    if (storm) {
      context.save();
      context.translate(width * 0.35, height * 0.46);
      context.scale(2.1, 0.7);
      const stormGradient = context.createRadialGradient(0, 0, 1, 0, 0, 38);
      stormGradient.addColorStop(0, 'rgba(225, 238, 255, 0.62)');
      stormGradient.addColorStop(0.55, 'rgba(160, 204, 246, 0.25)');
      stormGradient.addColorStop(1, 'rgba(72, 116, 188, 0)');
      context.beginPath();
      context.arc(0, 0, 38, 0, TAU);
      context.fillStyle = stormGradient;
      context.fill();
      context.restore();
    }

    for (let index = 0; index < 1400; index += 1) {
      context.fillStyle = rgba('#ffffff', 0.008 + random() * 0.018);
      context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2);
    }
  });
}

function createMoonTexture() {
  return createRockyTexture({
    seed: 551,
    base: '#8a8984',
    dark: '#4f5153',
    light: '#c1beb6',
    craters: true,
  });
}

function getPlanetTexture(id) {
  switch (id) {
    case 'mercury':
      return createRockyTexture({
        seed: 18,
        base: '#8f887e',
        dark: '#514d49',
        light: '#c2bbb0',
        craters: true,
      });
    case 'venus':
      return createVenusTexture();
    case 'earth':
      return createEarthTexture();
    case 'mars':
      return createMarsTexture();
    case 'jupiter':
      return createGasTexture({
        seed: 713,
        palette: ['#694533', '#b98259', '#dfb887', '#9a6647', '#c99568', '#e7c99e', '#7e513b'],
        bands: 72,
        spot: true,
      });
    case 'saturn':
      return createGasTexture({
        seed: 811,
        palette: ['#816943', '#bda273', '#e3cca0', '#c6aa79', '#e9d6ac', '#a98c5f'],
        bands: 55,
      });
    case 'uranus':
      return createGasTexture({
        seed: 927,
        palette: ['#4f969f', '#79bdc4', '#a5dadd', '#86c7ca', '#5ca6ae'],
        bands: 24,
      });
    case 'neptune':
      return createGasTexture({
        seed: 1041,
        palette: ['#142c65', '#24559c', '#397bc2', '#275d9e', '#183b7a'],
        bands: 31,
        storm: true,
      });
    default:
      return null;
  }
}

function createBackground() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
              mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
              mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
          f.z
        );
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p = p * 2.03 + vec3(1.7, 9.2, 3.4);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 direction = normalize(vDirection);
        float cloud = fbm(direction * 3.2 + vec3(2.0, 1.0, 4.0));
        float dust = fbm(direction * 7.0 - vec3(3.0, 2.0, 1.0));
        float band = exp(-pow(dot(direction, normalize(vec3(0.35, 0.78, 0.22))), 2.0) * 16.0);
        vec3 base = mix(vec3(0.002, 0.004, 0.011), vec3(0.008, 0.019, 0.043), smoothstep(0.2, 0.9, cloud));
        base += vec3(0.028, 0.053, 0.075) * band * (0.25 + cloud * 0.6);
        base += vec3(0.045, 0.025, 0.035) * smoothstep(0.52, 0.88, dust);
        base *= 0.8 + 0.2 * smoothstep(-0.8, 0.6, direction.y);
        gl_FragColor = vec4(base, 1.0);
      }
    `,
  });

  const background = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 32), material);
  background.renderOrder = -100;
  background.frustumCulled = false;
  scene.add(background);
}

function createStars() {
  const count = state.isMobile ? 5200 : 8800;
  const random = mulberry32(4460);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const palette = [
    new THREE.Color('#d7e8ff'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#ffd9ad'),
    new THREE.Color('#a9c8ea'),
    new THREE.Color('#f3c6b4'),
  ];

  for (let index = 0; index < count; index += 1) {
    const latitude = random() * 2 - 1;
    const theta = random() * TAU;
    const radius = 170 + random() * 350;
    const horizontal = Math.sqrt(1 - latitude * latitude);
    positions[index * 3] = Math.cos(theta) * horizontal * radius;
    positions[index * 3 + 1] = latitude * radius;
    positions[index * 3 + 2] = Math.sin(theta) * horizontal * radius;

    const color = palette[Math.floor(random() * palette.length)];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    sizes[index] = 0.42 + Math.pow(random(), 3) * 2.7;
    phases[index] = random() * TAU;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = aSize * (560.0 / max(1.0, -viewPosition.z));
        vColor = aColor;
        vTwinkle = 0.72 + 0.28 * sin(uTime * 0.72 + aPhase);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.08, distanceToCenter);
        alpha *= alpha;
        gl_FragColor = vec4(vColor, alpha * vTwinkle);
      }
    `,
  });

  starMaterial = material;
  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -60;
  stars.frustumCulled = false;
  scene.add(stars);

  const bandCount = state.isMobile ? 2300 : 3900;
  const bandPositions = new Float32Array(bandCount * 3);
  const bandColors = new Float32Array(bandCount * 3);
  const bandRotation = new THREE.Euler(0.72, 0.22, -0.38);
  const bandColorA = new THREE.Color('#9ebbd9');
  const bandColorB = new THREE.Color('#f0d7bd');
  for (let index = 0; index < bandCount; index += 1) {
    const latitude = (random() + random() + random() - 1.5) * 0.18;
    const theta = random() * TAU;
    const radius = 230 + random() * 290;
    const horizontal = Math.sqrt(Math.max(0, 1 - latitude * latitude));
    const direction = new THREE.Vector3(
      Math.cos(theta) * horizontal,
      latitude,
      Math.sin(theta) * horizontal,
    ).applyEuler(bandRotation);
    bandPositions[index * 3] = direction.x * radius;
    bandPositions[index * 3 + 1] = direction.y * radius;
    bandPositions[index * 3 + 2] = direction.z * radius;
    const color = bandColorA.clone().lerp(bandColorB, random() * 0.4);
    bandColors[index * 3] = color.r;
    bandColors[index * 3 + 1] = color.g;
    bandColors[index * 3 + 2] = color.b;
  }

  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3));
  bandGeometry.setAttribute('color', new THREE.BufferAttribute(bandColors, 3));
  const bandMaterial = new THREE.PointsMaterial({
    size: 0.7,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const band = new THREE.Points(bandGeometry, bandMaterial);
  band.renderOrder = -70;
  band.frustumCulled = false;
  scene.add(band);

  return stars;
}

function createSun() {
  sunGroup = new THREE.Group();
  scene.add(sunGroup);

  const geometry = new THREE.SphereGeometry(1, 96, 64);
  sunMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
              mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
              mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
          f.z
        );
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = p * 2.04 + vec3(8.3, 1.7, 4.1);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 flow = vPosition * 2.2;
        flow.y += uTime * 0.035;
        flow.x += uTime * 0.018;
        float large = fbm(flow);
        float small = fbm(vPosition * 8.0 + vec3(0.0, -uTime * 0.08, uTime * 0.025));
        float heat = smoothstep(0.2, 0.8, large * 0.76 + small * 0.36);
        vec3 color = mix(vec3(1.0, 0.22, 0.012), vec3(1.0, 0.64, 0.09), heat);
        color = mix(color, vec3(1.0, 0.95, 0.72), pow(heat, 5.0));
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), 2.2);
        color += vec3(1.0, 0.39, 0.035) * rim * 1.35;
        gl_FragColor = vec4(color * (1.55 + small * 0.9), 1.0);
      }
    `,
  });

  sunMesh = new THREE.Mesh(geometry, sunMaterial);
  sunMesh.scale.setScalar(4.6);
  sunMesh.userData.body = planetData[0];
  sunGroup.add(sunMesh);
  clickTargets.push(sunMesh);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 512;
  glowCanvas.height = 512;
  const context = glowCanvas.getContext('2d');
  const glowGradient = context.createRadialGradient(256, 256, 4, 256, 256, 250);
  glowGradient.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
  glowGradient.addColorStop(0.06, 'rgba(255, 235, 180, 0.82)');
  glowGradient.addColorStop(0.18, 'rgba(255, 164, 65, 0.32)');
  glowGradient.addColorStop(0.42, 'rgba(255, 104, 26, 0.09)');
  glowGradient.addColorStop(0.72, 'rgba(255, 76, 20, 0.025)');
  glowGradient.addColorStop(1, 'rgba(255, 55, 10, 0)');
  context.fillStyle = glowGradient;
  context.fillRect(0, 0, 512, 512);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;

  const innerGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  innerGlow.scale.set(19, 19, 1);
  innerGlow.renderOrder = 4;
  sunGroup.add(innerGlow);

  const outerGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff9a4b,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  outerGlow.scale.set(38, 38, 1);
  outerGlow.renderOrder = 3;
  sunGroup.add(outerGlow);

  const sunLight = new THREE.PointLight(0xffd1a0, 6200, 0, 2);
  sunGroup.add(sunLight);

  const body = planetData[0];
  body.holder = sunGroup;
  body.mesh = sunMesh;
  bodies.push(body);

  const label = createLabel(body, 6.3);
  sunGroup.add(label);
}

function createLabel(body, height) {
  const element = document.createElement('div');
  element.className = `planet-label${body.isSun ? ' is-sun' : ''}`;
  element.style.setProperty('--label-accent', body.accent);
  element.textContent = body.name;
  const label = new CSS2DObject(element);
  label.position.set(0, height, 0);
  label.center.set(0.5, 1);
  label.visible = !state.isMobile || body.orbitRadius < 32 || body.isSun;
  body.label = label;
  body.labelElement = element;
  return label;
}

function createAtmosphere(radius, color, intensity, rimPower = 2.4) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uRimPower: { value: rimPower },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uRimPower;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), uRimPower);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 48, 32), material);
  return atmosphere;
}

function createRingMaterial(innerRadius, outerRadius, colorA, colorB, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uInner: { value: innerRadius },
      uOuter: { value: outerRadius },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vLocalPosition;
      void main() {
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uInner;
      uniform float uOuter;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      varying vec3 vLocalPosition;
      void main() {
        float radius = length(vLocalPosition.xy);
        float t = clamp((radius - uInner) / (uOuter - uInner), 0.0, 1.0);
        float edge = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.94, 1.0, t));
        float band = 0.5 + 0.26 * sin(t * 71.0) + 0.14 * sin(t * 191.0 + 1.4);
        float cassini = 1.0 - 0.92 * exp(-pow((t - 0.55) / 0.022, 2.0));
        float alpha = clamp((0.14 + band * 0.7) * edge * cassini, 0.0, 0.92);
        vec3 color = mix(uColorA, uColorB, clamp(band, 0.0, 1.0));
        gl_FragColor = vec4(color, alpha * uOpacity);
      }
    `,
  });
}

function addSatellites(body, holder, tiltGroup) {
  if (body.id === 'earth') {
    const moonPivot = new THREE.Group();
    moonPivot.rotation.x = 0.2;
    holder.add(moonPivot);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 0.27, 24, 18),
      new THREE.MeshStandardMaterial({
        map: createMoonTexture(),
        roughness: 1,
        metalness: 0,
      }),
    );
    moon.position.x = body.radius * 2.35;
    moon.userData.body = null;
    moonPivot.add(moon);
    body.moonPivot = moonPivot;
  }

  if (body.id === 'jupiter') {
    const moonColors = ['#cfc4ae', '#9c8b79', '#d7d0c0', '#8d7e6e'];
    const moonPivots = [];
    for (let index = 0; index < 4; index += 1) {
      const pivot = new THREE.Group();
      pivot.rotation.x = (index - 1.5) * 0.055;
      pivot.rotation.z = (index - 1.5) * 0.035;
      holder.add(pivot);
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(body.radius * (0.055 + index * 0.014), 16, 12),
        new THREE.MeshStandardMaterial({ color: moonColors[index], roughness: 1, metalness: 0 }),
      );
      moon.position.x = body.radius * (1.42 + index * 0.32);
      pivot.add(moon);
      moonPivots.push(pivot);
    }
    body.moonPivots = moonPivots;
  }

  if (body.id === 'saturn') {
    const moonPivot = new THREE.Group();
    moonPivot.rotation.x = -0.13;
    holder.add(moonPivot);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 0.13, 18, 12),
      new THREE.MeshStandardMaterial({ color: '#d5b77f', roughness: 1, metalness: 0 }),
    );
    moon.position.x = body.radius * 2.7;
    moonPivot.add(moon);
    body.moonPivot = moonPivot;
  }
}

function createPlanet(body) {
  const orbitGroup = new THREE.Group();
  orbitGroup.rotation.x = body.inclination;
  scene.add(orbitGroup);
  body.orbitGroup = orbitGroup;

  const orbitPositions = [];
  const segments = 256;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * TAU;
    orbitPositions.push(
      Math.cos(angle) * body.orbitRadius,
      0,
      Math.sin(angle) * body.orbitRadius,
    );
  }
  const orbitGeometry = new THREE.BufferGeometry();
  orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPositions, 3));
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: body.accent,
    transparent: true,
    opacity: 0.095,
    depthWrite: false,
  });
  const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbitLine.renderOrder = -2;
  orbitGroup.add(orbitLine);
  body.orbitLine = orbitLine;

  const holder = new THREE.Group();
  holder.position.set(
    Math.cos(body.angle) * body.orbitRadius,
    0,
    Math.sin(body.angle) * body.orbitRadius,
  );
  orbitGroup.add(holder);
  body.holder = holder;

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = body.tilt;
  holder.add(tiltGroup);
  body.tiltGroup = tiltGroup;

  const texture = getPlanetTexture(body.id);
  const isGas = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(body.id);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: isGas ? 0.82 : 0.94,
    metalness: 0,
    emissiveMap: texture,
    emissive: new THREE.Color(body.accent),
    emissiveIntensity: isGas ? 0.045 : 0.025,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), material);
  mesh.scale.setScalar(body.radius);
  mesh.userData.body = body;
  tiltGroup.add(mesh);
  body.mesh = mesh;
  clickTargets.push(mesh);

  if (body.id === 'earth') {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.017, 64, 40),
      new THREE.MeshStandardMaterial({
        map: createCloudTexture(),
        transparent: true,
        opacity: 0.53,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
      }),
    );
    clouds.scale.setScalar(body.radius);
    tiltGroup.add(clouds);
    body.clouds = clouds;
    tiltGroup.add(createAtmosphere(body.radius, '#69c8ef', 0.74, 2.15));
  }

  if (body.id === 'venus') {
    tiltGroup.add(createAtmosphere(body.radius, '#f1ca82', 0.45, 2.7));
  }

  if (body.id === 'mars') {
    tiltGroup.add(createAtmosphere(body.radius, '#e98b61', 0.18, 3.2));
  }

  if (['jupiter', 'saturn', 'uranus', 'neptune'].includes(body.id)) {
    const atmosphereColors = {
      jupiter: '#ecc49a',
      saturn: '#eddaaa',
      uranus: '#9ee5ea',
      neptune: '#6e9df0',
    };
    tiltGroup.add(createAtmosphere(body.radius, atmosphereColors[body.id], 0.25, 2.8));
  }

  if (body.ring) {
    const inner = body.radius * 1.32;
    const outer = body.radius * 2.32;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 192, 12),
      createRingMaterial(inner, outer, '#d7be8d', '#8d704b', 0.86),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0;
    ring.renderOrder = 1;
    tiltGroup.add(ring);
    body.ringMesh = ring;
  }

  if (body.minorRing) {
    const inner = body.radius * 1.62;
    const outer = body.radius * 2.18;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 128, 4),
      createRingMaterial(inner, outer, '#a9dbdf', '#4f8792', 0.22),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 1;
    tiltGroup.add(ring);
  }

  addSatellites(body, holder, tiltGroup);
  holder.add(createLabel(body, body.radius < 1 ? body.radius + 1.05 : body.radius + 1.35));
  bodies.push(body);
}

function createOrbitBelt(options) {
  const { count, inner, outer, height, color, size, opacity, seed } = options;
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color(color);

  for (let index = 0; index < count; index += 1) {
    const angle = random() * TAU;
    const radius = inner + Math.pow(random(), 0.62) * (outer - inner);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = (random() - 0.5) * height;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
    const shade = 0.62 + random() * 0.55;
    colors[index * 3] = baseColor.r * shade;
    colors[index * 3 + 1] = baseColor.g * shade;
    colors[index * 3 + 2] = baseColor.b * shade;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const belt = new THREE.Points(geometry, material);
  belt.frustumCulled = false;
  scene.add(belt);
  return belt;
}

function setupScene() {
  const canvas = document.getElementById('scene');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setClearColor(0x02040a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.45 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.08, 1300);
  camera.position.copy(getOverviewPosition());

  controls = new OrbitControls(camera, canvas);
  controls.target.copy(getOverviewTarget());
  controls.enableDamping = true;
  controls.dampingFactor = 0.045;
  controls.enablePan = false;
  controls.rotateSpeed = 0.34;
  controls.zoomSpeed = 0.72;
  controls.minDistance = 1.25;
  controls.maxDistance = 360;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI * 0.86;
  controls.update();

  labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
  labelRenderer.setSize(window.innerWidth, window.innerHeight);

  scene.add(new THREE.AmbientLight(0x7390a6, 0.54));
  const fillLight = new THREE.DirectionalLight(0x608fc4, 0.58);
  fillLight.position.set(-1, 0.8, 0.65);
  scene.add(fillLight);
  const warmFill = new THREE.DirectionalLight(0xffb57b, 0.12);
  warmFill.position.set(1, -0.4, -0.7);
  scene.add(warmFill);

  createBackground();
  createStars();
  createSun();
  for (const body of planetData.slice(1)) createPlanet(body);

  asteroidBelt = createOrbitBelt({
    count: state.isMobile ? 900 : 1750,
    inner: 32,
    outer: 37.4,
    height: 1.8,
    color: '#9a8a71',
    size: 0.28,
    opacity: 0.6,
    seed: 5541,
  });
  kuiperBelt = createOrbitBelt({
    count: state.isMobile ? 650 : 1200,
    inner: 87,
    outer: 96,
    height: 5,
    color: '#5d7084',
    size: 0.32,
    opacity: 0.35,
    seed: 8891,
  });

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.45 : 1.75));
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    state.isMobile ? 0.58 : 0.78,
    state.isMobile ? 0.55 : 0.68,
    0.9,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  composer.setSize(window.innerWidth, window.innerHeight);

  buildNavigation();
  bindInterface();
  bindSceneInteraction(canvas);

  window.addEventListener('resize', handleResize);
  MOBILE_QUERY.addEventListener?.('change', handleBreakpointChange);
}

function getOverviewPosition() {
  if (state.isMobile) return new THREE.Vector3(0, 49, 101);
  return new THREE.Vector3(0, 63, 136);
}

function getOverviewTarget() {
  if (state.isMobile) return new THREE.Vector3(0, -5.5, 0);
  return new THREE.Vector3(0, -2, 0);
}

function buildNavigation() {
  const nav = document.getElementById('planet-nav');
  for (const body of bodies) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Travel to ${body.name}`);
    button.style.setProperty('--planet-accent', body.accent);
    button.innerHTML = `
      <span class="nav-index">${body.index}</span>
      <span class="nav-name">${body.name}</span>
      <span class="nav-orbit" aria-hidden="true"></span>
    `;
    button.addEventListener('click', () => focusBody(body));
    nav.appendChild(button);
    navButtons.set(body.id, button);
  }
}

function bindInterface() {
  document.getElementById('home-button').addEventListener('click', clearFocus);
  document.getElementById('overview-button').addEventListener('click', clearFocus);
  document.getElementById('card-close').addEventListener('click', clearFocus);
  document.getElementById('explore-button').addEventListener('click', () => {
    focusBody(bodies.find((body) => body.id === 'earth'));
  });

  document.getElementById('play-toggle').addEventListener('click', togglePaused);
  document.getElementById('speed-down').addEventListener('click', () => changeSpeed(-1));
  document.getElementById('speed-up').addEventListener('click', () => changeSpeed(1));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearFocus();
    if (event.key === 'ArrowRight') cycleFocus(1);
    if (event.key === 'ArrowLeft') cycleFocus(-1);
    if (event.key === ' ') {
      event.preventDefault();
      togglePaused();
    }
    const number = Number.parseInt(event.key, 10);
    if (number >= 1 && number <= bodies.length - 1) focusBody(bodies[number]);
  });
}

function bindSceneInteraction(canvas) {
  let pointerDown = null;

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!pointerDown || pointerDown.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (distance > 6) return;

    const hit = raycastBody(event.clientX, event.clientY);
    if (hit) focusBody(hit);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    const hit = raycastBody(event.clientX, event.clientY);
    canvas.style.cursor = hit ? 'pointer' : '';
    bodies.forEach((body) => {
      body.labelElement?.classList.toggle('is-hovered', body === hit);
    });
  });

  canvas.addEventListener('pointerleave', () => {
    canvas.style.cursor = '';
  });
}

function raycastBody(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(clickTargets, false);
  return intersections[0]?.object.userData.body ?? null;
}

function bodyWorldPosition(body, target = new THREE.Vector3()) {
  return body.holder.getWorldPosition(target);
}

function focusOffsetFor(body) {
  if (body.isSun) {
    return new THREE.Vector3(0, body.radius * 2.9, body.radius * 4.9);
  }
  const world = bodyWorldPosition(body, tempVector);
  const radial = world.clone().setY(0).normalize();
  const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
  const side = Number.parseInt(body.index, 10) % 2 === 0 ? -1 : 1;
  return radial
    .clone()
    .multiplyScalar(body.radius * 2.15)
    .add(tangent.multiplyScalar(body.radius * 6.65 * side))
    .add(new THREE.Vector3(0, body.radius * 3.25, 0));
}

function focusBody(body) {
  if (!body) return;
  state.focused = body;
  setActiveBody(body);
  const holdPosition = bodyWorldPosition(body, new THREE.Vector3());
  const offset = focusOffsetFor(body);
  state.flight = {
    started: performance.now(),
    duration: reducedMotion ? 0.01 : 1.85,
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    offset,
    body,
  };
  state.lastFollowPosition.copy(holdPosition);
  controls.enabled = false;
  document.getElementById('interaction-hint').style.opacity = '0';
}

function clearFocus() {
  state.focused = null;
  setActiveBody(null);
  state.flight = {
    started: performance.now(),
    duration: reducedMotion ? 0.01 : 1.7,
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    offset: null,
    body: null,
    target: getOverviewTarget(),
    position: getOverviewPosition(),
  };
  controls.enabled = false;
  document.getElementById('interaction-hint').style.opacity = '';
}

function cycleFocus(direction) {
  if (!bodies.length) return;
  const currentIndex = state.focused ? bodies.indexOf(state.focused) : -1;
  const nextIndex = (currentIndex + direction + bodies.length) % bodies.length;
  focusBody(bodies[nextIndex]);
}

function setActiveBody(body) {
  navButtons.forEach((button, id) => {
    button.classList.toggle('is-active', body?.id === id);
  });
  bodies.forEach((item) => {
    item.labelElement?.classList.toggle('is-active', item === body);
    if (item.label) {
      item.label.visible = !state.isMobile || item.orbitRadius < 32 || item.isSun || item === body;
    }
    if (item.orbitLine) {
      item.orbitLine.material.opacity = item === body ? 0.52 : 0.095;
    }
  });

  if (!body) {
    document.body.classList.remove('has-selection');
    return;
  }

  document.getElementById('card-index').textContent = body.index;
  document.getElementById('card-type').textContent = body.type;
  document.getElementById('card-name').textContent = body.name;
  document.getElementById('card-description').textContent = body.description;
  document.getElementById('card-distance').textContent = body.distance;
  document.getElementById('card-day').textContent = body.day;
  document.getElementById('card-year').textContent = body.year;
  document.getElementById('card-moons').textContent = body.moons;
  document.getElementById('card-note').textContent = body.note;
  document.getElementById('planet-card').style.setProperty('--card-accent', body.accent);
  document.body.classList.add('has-selection');
}

function updateFlight(now) {
  if (!state.flight) return false;
  const flight = state.flight;
  const progress = THREE.MathUtils.clamp((now - flight.started) / (flight.duration * 1000), 0, 1);
  const eased = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  let goalTarget;
  let goalPosition;
  if (flight.body) {
    goalTarget = bodyWorldPosition(flight.body, tempVectorB);
    goalPosition = goalTarget.clone().add(flight.offset);
  } else {
    goalTarget = flight.target;
    goalPosition = flight.position;
  }

  camera.position.lerpVectors(flight.fromPosition, goalPosition, eased);
  controls.target.lerpVectors(flight.fromTarget, goalTarget, eased);
  camera.lookAt(controls.target);

  if (progress >= 1) {
    controls.target.copy(goalTarget);
    camera.position.copy(goalPosition);
    camera.lookAt(controls.target);
    controls.enabled = true;
    controls.update();
    if (flight.body) state.lastFollowPosition.copy(goalTarget);
    state.flight = null;
  }
  return true;
}

function updateCamera(now) {
  if (updateFlight(now)) return;

  if (state.focused && !state.focused.isSun) {
    const world = bodyWorldPosition(state.focused, tempVectorB);
    const delta = tempVector.copy(world).sub(state.lastFollowPosition);
    camera.position.add(delta);
    controls.target.copy(world);
    state.lastFollowPosition.copy(world);
  }
  controls.update();
}

function updateBodies(delta, elapsed) {
  const motion = state.paused ? 0 : delta * state.speeds[state.speedIndex];
  sunMaterial.uniforms.uTime.value = elapsed;
  if (starMaterial) starMaterial.uniforms.uTime.value = elapsed;
  sunMesh.rotation.y += delta * 0.014;

  for (const body of bodies) {
    if (body.isSun) continue;
    body.angle += body.orbitSpeed * motion;
    body.holder.position.set(
      Math.cos(body.angle) * body.orbitRadius,
      0,
      Math.sin(body.angle) * body.orbitRadius,
    );
    body.mesh.rotation.y += body.spin * motion;
    if (body.clouds) body.clouds.rotation.y += body.spin * 0.55 * motion;
    if (body.moonPivot) body.moonPivot.rotation.y += 0.62 * motion;
    if (body.moonPivots) {
      body.moonPivots.forEach((pivot, index) => {
        pivot.rotation.y += (0.38 - index * 0.055) * motion;
      });
    }
  }

  asteroidBelt.rotation.y += motion * 0.035;
  kuiperBelt.rotation.y += motion * 0.011;
}

function updateClock(delta) {
  if (!state.paused) state.simDays += delta * 3.25 * state.speeds[state.speedIndex];
  const day = state.simDays + 1;
  const whole = String(Math.floor(day)).padStart(3, '0');
  const fraction = Math.floor((day % 1) * 100).toString().padStart(2, '0');
  document.getElementById('sim-clock').textContent = `DAY ${whole}.${fraction}`;
}

function togglePaused() {
  state.paused = !state.paused;
  const button = document.getElementById('play-toggle');
  const icon = document.getElementById('play-icon');
  button.setAttribute('aria-label', state.paused ? 'Resume simulation' : 'Pause simulation');
  icon.classList.toggle('is-play', state.paused);
}

function changeSpeed(direction) {
  const next = THREE.MathUtils.clamp(state.speedIndex + direction, 0, state.speeds.length - 1);
  state.speedIndex = next;
  document.getElementById('speed-readout').textContent = `${state.speeds[next].toFixed(1)}×`;
}

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.45 : 1.75));
  renderer.setSize(width, height);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.45 : 1.75));
  composer.setSize(width, height);
  labelRenderer.setSize(width, height);
  if (!state.focused && !state.flight) {
    camera.position.copy(getOverviewPosition());
    controls.target.copy(getOverviewTarget());
    controls.update();
  }
}

function handleBreakpointChange(event) {
  state.isMobile = event.matches;
  if (bloomPass) bloomPass.strength = state.isMobile ? 0.58 : 0.78;
  bodies.forEach((body) => {
    if (body.label) body.label.visible = !state.isMobile || body.orbitRadius < 32 || body.isSun;
  });
  handleResize();
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updateBodies(delta, elapsed);
  updateCamera(now);
  updateClock(delta);

  if (firstFrame) {
    firstFrame = false;
    window.setTimeout(() => document.body.classList.add('is-ready'), 360);
  }

  composer.render();
  labelRenderer.render(scene, camera);
}

try {
  setupScene();
  document.body.classList.add('is-ready');
  requestAnimationFrame(animate);
} catch (error) {
  console.error('Unable to initialize the solar system.', error);
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.innerHTML = '<span>WEBGL IS UNAVAILABLE IN THIS BROWSER</span>';
  }
}
