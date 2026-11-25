import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const LOCATIONS = [
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
  { id: 'london', city: 'London', country: 'United Kingdom', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
  { id: 'new-york', city: 'New York', country: 'United States', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { id: 'dubai', city: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { id: 'cape-town', city: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, tz: 'Africa/Johannesburg' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
];

const PLANTS = [
  { name: 'Monstera', latin: 'Monstera deliciosa', type: 'monstera', pot: '#b8674b', leaf: '#3f6b4c' },
  { name: 'Olive tree', latin: 'Olea europaea', type: 'olive', pot: '#c6b89d', leaf: '#73886a' },
  { name: 'Snake plant', latin: 'Dracaena trifasciata', type: 'snake', pot: '#4c5e53', leaf: '#45684c' },
  { name: 'Boston fern', latin: 'Nephrolepis exaltata', type: 'fern', pot: '#c47e5b', leaf: '#5d7f4d' },
  { name: 'Calamondin', latin: 'Citrus microcarpa', type: 'citrus', pot: '#bda579', leaf: '#466c48' },
];

const DEFAULT_ARRANGEMENTS = {
  A: [
    { x: -2.63, z: -1.18 },
    { x: -1.72, z: 1.54 },
    { x: 0.25, z: -1.2 },
    { x: 1.08, z: 1.56 },
    { x: 2.9, z: 1.18 },
  ],
  B: [
    { x: -2.72, z: 1.52 },
    { x: -1.48, z: -1.18 },
    { x: 0.58, z: 1.54 },
    { x: 1.66, z: 1.42 },
    { x: 2.9, z: -1.48 },
  ],
};

const BALCONY = {
  width: 7.4,
  depth: 4.7,
  floorMinX: -3.7,
  floorMaxX: 3.7,
  floorMinZ: -2.35,
  floorMaxZ: 2.35,
  minPlanX: -3.02,
  maxPlanX: 3.02,
  minPlanZ: -1.86,
  maxPlanZ: 1.86,
};

const state = {
  scheme: 'A',
  compare: false,
  heading: 218,
  date: '2026-06-21',
  locationId: 'lisbon',
  timeFrac: 0.47,
  currentMinutes: 790,
  sunrise: 371,
  sunset: 1264,
  solarNoon: 810,
  sun: null,
  sunDir: new THREE.Vector3(0, 1, 0),
  exposures: { A: [0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0] },
  arrangements: {
    A: DEFAULT_ARRANGEMENTS.A.map((position) => ({ ...position })),
    B: DEFAULT_ARRANGEMENTS.B.map((position) => ({ ...position })),
  },
  selected: null,
  drag: null,
  playing: false,
  cameraTouched: false,
};

const ui = {
  locationSelect: $('#locationSelect'),
  dateInput: $('#dateInput'),
  stage: $('#stage'),
  sceneCanvas: $('#sceneCanvas'),
  clockDisplay: $('#clockDisplay'),
  altitudeValue: $('#altitudeValue'),
  azimuthValue: $('#azimuthValue'),
  lightValue: $('#lightValue'),
  schemeSwitch: $('#schemeSwitch'),
  schemeCaption: $('#schemeCaption'),
  headingDisplay: $('#headingDisplay'),
  headingDegrees: $('#headingDegrees'),
  headingCardinal: $('#headingCardinal'),
  headingDirectionInline: $('#headingDirectionInline'),
  headingSlider: $('#headingSlider'),
  compassNeedle: $('#compassDialNeedle'),
  miniCompassArrow: $('.compass-arrow'),
  headingStepLeft: $('#headingStepLeft'),
  headingStepRight: $('#headingStepRight'),
  timeSlider: $('#timeSlider'),
  timelineTime: $('#timelineTime'),
  timelinePhase: $('#timelinePhase'),
  sunriseLabel: $('#sunriseLabel'),
  sunsetLabel: $('#sunsetLabel'),
  daylightLength: $('#daylightLength'),
  playButton: $('#playButton'),
  planWrap: $('#planWrap'),
  planCanvas: $('#planCanvas'),
  planSchemeSwitch: $('#planSchemeSwitch'),
  compareButton: $('#compareButton'),
  compareSummary: $('#compareSummary'),
  compareSunA: $('#compareSunA'),
  compareShadeA: $('#compareShadeA'),
  compareSunB: $('#compareSunB'),
  compareShadeB: $('#compareShadeB'),
  resetButton: $('#resetButton'),
  arrangementEyebrow: $('#arrangementEyebrow'),
  sunlitCount: $('#sunlitCount'),
  plantList: $('#plantList'),
};

let scene;
let camera;
let renderer;
let controls;
let sunLight;
let hemiLight;
let ambientLight;
let planterGroups = [];
let occluders = [];
let plantRows = [];
let lastFrameTime = performance.now();
let planDpr = 1;
let planWidth = 0;
let planHeight = 0;
let planRegions = [];
const planContext = ui.planCanvas.getContext('2d');
const solarRaycaster = new THREE.Raycaster();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function radToDeg(value) {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function formatTime(minutes) {
  const rounded = Math.round(minutes);
  const hours = Math.floor((rounded % 1440) / 60);
  const mins = rounded % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}

function cardinalName(degrees, short = false) {
  const names = [
    ['North', 'N'],
    ['Northeast', 'NE'],
    ['East', 'E'],
    ['Southeast', 'SE'],
    ['South', 'S'],
    ['Southwest', 'SW'],
    ['West', 'W'],
    ['Northwest', 'NW'],
  ];
  const index = Math.round(normalizeDegrees(degrees) / 45) % 8;
  return names[index][short ? 1 : 0];
}

function dayOfYear(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
}

function timezoneOffsetHours(dateString, timeZone) {
  const probe = new Date(`${dateString}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(probe);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });
  const localAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
  return (localAsUtc - probe.getTime()) / 3600000;
}

function solarPosition(latitude, longitude, dateString, localMinutes, offsetHours) {
  const doy = dayOfYear(dateString);
  const localHour = localMinutes / 60;
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (localHour - 12) / 24);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const trueSolarTime = localMinutes + equationOfTime + 4 * longitude - 60 * offsetHours;
  const hourAngle = normalizeDegrees(trueSolarTime / 4) - 180;
  const hourAngleRad = degToRad(hourAngle);
  const latitudeRad = degToRad(latitude);
  const cosZenith = clamp(
    Math.sin(latitudeRad) * Math.sin(declination) +
      Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngleRad),
    -1,
    1,
  );
  const altitude = 90 - radToDeg(Math.acos(cosZenith));
  const azimuth = normalizeDegrees(
    radToDeg(
      Math.atan2(
        Math.sin(hourAngleRad),
        Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(declination) * Math.cos(latitudeRad),
      ),
    ) + 180,
  );
  return { altitude, azimuth, declination, equationOfTime };
}

function daylightWindow(location, dateString, offsetHours) {
  let sunrise = null;
  let sunset = null;
  let solarNoon = 720;
  let peakAltitude = -90;
  let previousMinute = 0;
  let previousAltitude = solarPosition(location.lat, location.lon, dateString, 0, offsetHours).altitude;

  for (let minute = 4; minute <= 1440; minute += 4) {
    const altitude = solarPosition(location.lat, location.lon, dateString, minute, offsetHours).altitude;
    if (previousAltitude < -0.833 && altitude >= -0.833 && sunrise === null) {
      const ratio = (-0.833 - previousAltitude) / (altitude - previousAltitude);
      sunrise = previousMinute + (minute - previousMinute) * ratio;
    }
    if (previousAltitude >= -0.833 && altitude < -0.833 && sunset === null) {
      const ratio = (-0.833 - previousAltitude) / (altitude - previousAltitude);
      sunset = previousMinute + (minute - previousMinute) * ratio;
    }
    if (altitude > peakAltitude) {
      peakAltitude = altitude;
      solarNoon = minute;
    }
    previousMinute = minute;
    previousAltitude = altitude;
  }

  if (sunrise === null) sunrise = 360;
  if (sunset === null) sunset = 1080;
  return { sunrise, sunset, solarNoon, peakAltitude };
}

function getLocation() {
  return LOCATIONS.find((location) => location.id === state.locationId) || LOCATIONS[0];
}

function currentSunVector(sun) {
  const relativeAzimuth = degToRad(sun.azimuth - state.heading);
  const altitude = degToRad(sun.altitude);
  return new THREE.Vector3(
    Math.sin(relativeAzimuth) * Math.cos(altitude),
    Math.sin(altitude),
    Math.cos(relativeAzimuth) * Math.cos(altitude),
  ).normalize();
}

function mixHex(start, end, amount) {
  return `#${new THREE.Color(start).lerp(new THREE.Color(end), amount).getHexString()}`;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const random = seededRandom(73);
  context.fillStyle = '#b68161';
  context.fillRect(0, 0, 512, 512);
  const size = 128;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const lightness = 4 + random() * 11;
      context.fillStyle = `hsl(20 38% ${58 + lightness * 0.45}%)`;
      context.fillRect(col * size + 4, row * size + 4, size - 8, size - 8);
      context.fillStyle = `rgba(255, 235, 210, ${0.07 + random() * 0.08})`;
      context.fillRect(col * size + 9, row * size + 9, size - 18, 3);
      for (let blot = 0; blot < 8; blot += 1) {
        context.beginPath();
        context.fillStyle = `rgba(88, 55, 35, ${0.025 + random() * 0.04})`;
        context.arc(
          col * size + 10 + random() * (size - 20),
          row * size + 10 + random() * (size - 20),
          2 + random() * 10,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.55);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  context.fillStyle = '#d8c8a7';
  context.fillRect(0, 0, 512, 320);
  context.strokeStyle = 'rgba(112, 84, 55, 0.35)';
  context.lineWidth = 5;
  context.strokeRect(12, 12, 488, 296);
  context.lineWidth = 2;
  context.strokeRect(26, 26, 460, 268);
  for (let x = 48; x < 480; x += 26) {
    context.strokeStyle = x % 52 === 0 ? 'rgba(168, 102, 72, 0.31)' : 'rgba(92, 113, 82, 0.2)';
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(x, 34);
    context.lineTo(x, 286);
    context.stroke();
  }
  for (let y = 60; y < 280; y += 48) {
    context.strokeStyle = 'rgba(255, 250, 233, 0.3)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(34, y);
    context.lineTo(478, y);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...options });
}

function addOccluder(object) {
  object.userData.occluder = true;
  occluders.push(object);
  return object;
}

function box(parent, width, height, depth, meshMaterial, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), meshMaterial);
  mesh.position.set(x, y, z);
  if (options.rotationX) mesh.rotation.x = options.rotationX;
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  if (options.rotationZ) mesh.rotation.z = options.rotationZ;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  if (options.occluder) addOccluder(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, height, segments, meshMaterial, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), meshMaterial);
  mesh.position.set(x, y, z);
  if (options.rotationX) mesh.rotation.x = options.rotationX;
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  if (options.rotationZ) mesh.rotation.z = options.rotationZ;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  if (options.occluder) addOccluder(mesh);
  return mesh;
}

function registerTreeAsOccluders(root) {
  root.traverse((child) => {
    if (child.isMesh && child.castShadow) addOccluder(child);
  });
}

function buildArchitecture() {
  const balcony = new THREE.Group();
  scene.add(balcony);

  const plaster = material('#d9d1bd', { roughness: 0.94 });
  const wallShade = material('#c9c0ab', { roughness: 0.95 });
  const roofMaterial = material('#ded6c4', { roughness: 0.94 });
  const roofTrim = material('#bdb39f', { roughness: 0.9 });
  const charcoal = material('#263c32', { roughness: 0.42, metalness: 0.42 });
  const wood = material('#8c6349', { roughness: 0.7 });
  const baseMaterial = material('#9b917e', { roughness: 0.9 });
  const floorMaterial = material('#ffffff', { map: makeTileTexture(), roughness: 0.87 });

  box(balcony, 7.56, 0.28, 4.86, baseMaterial, 0, -0.15, 0);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7.45, 4.75), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  balcony.add(floor);

  box(balcony, 7.48, 2.94, 0.19, plaster, 0, 1.47, -2.36, { occluder: true });
  box(balcony, 0.18, 2.94, 4.82, wallShade, -3.7, 1.47, 0, { occluder: true });
  box(balcony, 0.26, 0.07, 4.88, roofTrim, -3.7, 2.955, 0, { occluder: true });

  box(balcony, 7.52, 0.23, 2.24, roofMaterial, 0, 2.98, -1.21, { occluder: true });
  box(balcony, 7.52, 0.33, 0.13, roofTrim, 0, 2.86, -0.055, { occluder: true });
  box(balcony, 7.48, 0.09, 0.06, plaster, 0, 0.045, -2.24, { occluder: true });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#38564d',
    roughness: 0.18,
    metalness: 0.24,
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
    transparent: true,
    opacity: 0.94,
  });
  box(balcony, 3.64, 2.36, 0.035, glassMaterial, 0, 1.22, -2.235, { occluder: true });
  box(balcony, 0.055, 2.44, 0.07, charcoal, -1.84, 1.22, -2.18, { occluder: true });
  box(balcony, 0.055, 2.44, 0.07, charcoal, 1.84, 1.22, -2.18, { occluder: true });
  box(balcony, 0.045, 2.41, 0.06, charcoal, 0, 1.23, -2.18, { occluder: true });
  box(balcony, 3.7, 0.055, 0.07, charcoal, 0, 2.41, -2.18, { occluder: true });
  box(balcony, 3.7, 0.055, 0.07, charcoal, 0, 0.07, -2.18, { occluder: true });

  const reflectionMaterial = new THREE.MeshBasicMaterial({
    color: '#b2c9bc',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  box(balcony, 0.07, 2.1, 0.012, reflectionMaterial, -1.48, 1.24, -2.155, {
    castShadow: false,
    receiveShadow: false,
  });
  box(balcony, 0.025, 1.95, 0.012, reflectionMaterial, -1.35, 1.27, -2.153, {
    castShadow: false,
    receiveShadow: false,
  });

  const lightGlow = new THREE.MeshStandardMaterial({
    color: '#f4d9a1',
    emissive: '#ffc978',
    emissiveIntensity: 2.8,
    roughness: 0.4,
  });
  [-1.75, 1.75].forEach((x) => {
    cylinder(balcony, 0.07, 0.07, 0.018, 20, lightGlow, x, 2.846, -1.36, {
      castShadow: false,
      receiveShadow: false,
    });
  });

  buildRailings(balcony, charcoal, wood);
}

function buildRailings(parent, metalMaterial, woodMaterial) {
  const frontZ = 2.35;
  const frontStart = -3.58;
  const frontEnd = 3.58;
  const frontLength = frontEnd - frontStart;
  const frontCenter = (frontStart + frontEnd) / 2;

  box(parent, frontLength, 0.075, 0.09, woodMaterial, frontCenter, 1.145, frontZ, { occluder: true });
  box(parent, frontLength, 0.038, 0.038, metalMaterial, frontCenter, 0.105, frontZ, { occluder: true });

  const frontPosts = 10;
  for (let index = 0; index < frontPosts; index += 1) {
    const x = frontStart + (index / (frontPosts - 1)) * frontLength;
    box(parent, 0.058, 1.10, 0.058, metalMaterial, x, 0.57, frontZ, { occluder: true });
  }

  const frontBarCount = 46;
  const frontBars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.91, 0.016), metalMaterial, frontBarCount);
  const tempMatrix = new THREE.Matrix4();
  for (let index = 0; index < frontBarCount; index += 1) {
    const x = frontStart + ((index + 0.5) / frontBarCount) * frontLength;
    tempMatrix.makeTranslation(x, 0.585, frontZ);
    frontBars.setMatrixAt(index, tempMatrix);
  }
  frontBars.instanceMatrix.needsUpdate = true;
  frontBars.castShadow = true;
  frontBars.receiveShadow = true;
  parent.add(frontBars);
  addOccluder(frontBars);

  const sideX = 3.65;
  const sideStart = -2.34;
  const sideEnd = 2.34;
  const sideLength = sideEnd - sideStart;
  const sideCenter = (sideStart + sideEnd) / 2;

  box(parent, 0.09, 0.075, sideLength, woodMaterial, sideX, 1.145, sideCenter, { occluder: true });
  box(parent, 0.038, 0.038, sideLength, metalMaterial, sideX, 0.105, sideCenter, { occluder: true });

  const sidePosts = 8;
  for (let index = 0; index < sidePosts; index += 1) {
    const z = sideStart + (index / (sidePosts - 1)) * sideLength;
    box(parent, 0.058, 1.10, 0.058, metalMaterial, sideX, 0.57, z, { occluder: true });
  }

  const sideBarCount = 29;
  const sideBars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.91, 0.016), metalMaterial, sideBarCount);
  for (let index = 0; index < sideBarCount; index += 1) {
    const z = sideStart + ((index + 0.5) / sideBarCount) * sideLength;
    tempMatrix.makeTranslation(sideX, 0.585, z);
    sideBars.setMatrixAt(index, tempMatrix);
  }
  sideBars.instanceMatrix.needsUpdate = true;
  sideBars.castShadow = true;
  sideBars.receiveShadow = true;
  parent.add(sideBars);
  addOccluder(sideBars);
}

function buildFurniture() {
  const balcony = new THREE.Group();
  balcony.name = 'balconyFurniture';
  scene.add(balcony);

  const wood = material('#7e5b42', { roughness: 0.72 });
  const metal = material('#2b3d35', { roughness: 0.42, metalness: 0.46 });
  const cushion = material('#e4dbc7', { roughness: 0.95 });
  const cushionWarm = material('#c98766', { roughness: 0.94 });
  const travertine = material('#d9c7a7', { roughness: 0.84 });
  const darkerStone = material('#bda887', { roughness: 0.88 });

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.18, 1.42),
    new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 0.96 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.78, 0.011, 1.16);
  rug.receiveShadow = true;
  balcony.add(rug);

  const bench = new THREE.Group();
  bench.position.set(-3.16, 0, 0.48);
  balcony.add(bench);
  [-0.23, -0.075, 0.08, 0.235].forEach((x) => {
    box(bench, 0.14, 0.055, 2.08, wood, x, 0.405, 0);
  });
  box(bench, 0.58, 0.075, 0.84, cushion, 0, 0.469, -0.47);
  box(bench, 0.58, 0.075, 0.84, cushion, 0, 0.469, 0.45);
  box(bench, 0.36, 0.17, 0.34, cushionWarm, 0, 0.56, 0.12, { rotationY: -0.15 });
  [-0.255, 0.255].forEach((x) => {
    [-0.88, 0.88].forEach((z) => {
      box(bench, 0.038, 0.38, 0.038, metal, x, 0.19, z);
    });
  });
  registerTreeAsOccluders(bench);

  const table = new THREE.Group();
  table.position.set(1.25, 0, -0.55);
  balcony.add(table);
  cylinder(table, 0.55, 0.55, 0.06, 36, travertine, 0, 0.735, 0, { occluder: true });
  cylinder(table, 0.57, 0.57, 0.018, 36, darkerStone, 0, 0.697, 0, { occluder: true });
  cylinder(table, 0.034, 0.045, 0.67, 14, metal, 0, 0.36, 0, { occluder: true });
  cylinder(table, 0.29, 0.31, 0.032, 20, metal, 0, 0.025, 0, { occluder: true });

  const bowlMaterial = material('#8ca38d', { roughness: 0.55 });
  cylinder(table, 0.13, 0.1, 0.09, 20, bowlMaterial, 0.08, 0.805, -0.04, { occluder: true });
  const bowlFruit = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), material('#e0a143', { roughness: 0.7 }));
  bowlFruit.position.set(0.08, 0.865, -0.04);
  bowlFruit.castShadow = true;
  table.add(bowlFruit);

  createChair(balcony, 1.25, 0.47, Math.PI, metal, cushion);
  createChair(balcony, 2.31, -0.55, -Math.PI / 2, metal, cushion);

  const lantern = new THREE.Group();
  lantern.position.set(-2.52, 0, 1.91);
  balcony.add(lantern);
  cylinder(lantern, 0.13, 0.16, 0.035, 18, metal, 0, 0.018, 0, { occluder: true });
  const lanternGlass = new THREE.MeshPhysicalMaterial({
    color: '#f0cf92',
    roughness: 0.2,
    metalness: 0,
    transmission: 0.55,
    transparent: true,
    opacity: 0.72,
  });
  cylinder(lantern, 0.11, 0.12, 0.23, 16, lanternGlass, 0, 0.15, 0, {
    castShadow: false,
    receiveShadow: false,
  });
  cylinder(lantern, 0.13, 0.13, 0.03, 18, metal, 0, 0.285, 0, { occluder: true });
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#ffd48c', emissive: '#ffb44d', emissiveIntensity: 3 }),
  );
  flame.position.y = 0.16;
  lantern.add(flame);

  const wateringCan = new THREE.Group();
  wateringCan.position.set(2.86, 0, 1.83);
  wateringCan.rotation.y = -0.3;
  balcony.add(wateringCan);
  const canMaterial = material('#687f73', { roughness: 0.46, metalness: 0.34 });
  cylinder(wateringCan, 0.16, 0.18, 0.28, 18, canMaterial, 0, 0.16, 0, { occluder: true });
  cylinder(wateringCan, 0.03, 0.04, 0.29, 12, canMaterial, 0.19, 0.22, 0, { rotationZ: -0.9, occluder: true });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 18, Math.PI * 1.3), canMaterial);
  handle.position.set(-0.1, 0.31, 0);
  handle.rotation.z = 0.5;
  handle.castShadow = true;
  wateringCan.add(handle);
}

function createChair(parent, x, z, rotation, metal, cushion) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  parent.add(chair);
  box(chair, 0.43, 0.055, 0.4, metal, 0, 0.43, 0, { occluder: true });
  box(chair, 0.38, 0.055, 0.34, cushion, 0, 0.478, 0.01);
  box(chair, 0.42, 0.38, 0.045, metal, 0, 0.64, -0.19, { occluder: true });
  box(chair, 0.36, 0.27, 0.055, cushion, 0, 0.655, -0.215);
  [-0.175, 0.175].forEach((legX) => {
    [-0.15, 0.15].forEach((legZ) => {
      box(chair, 0.025, 0.42, 0.025, metal, legX, 0.21, legZ);
    });
  });
  box(chair, 0.025, 0.23, 0.025, metal, -0.205, 0.555, -0.14);
  box(chair, 0.025, 0.23, 0.025, metal, 0.205, 0.555, -0.14);
  box(chair, 0.025, 0.025, 0.34, metal, -0.205, 0.67, -0.07);
  box(chair, 0.025, 0.025, 0.34, metal, 0.205, 0.67, -0.07);
  registerTreeAsOccluders(chair);
}

function createLeafGeometry(width, height, curve = 0.9) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-width, height * 0.22, -width * curve, height * 0.74, 0, height);
  shape.bezierCurveTo(width * curve, height * 0.74, width, height * 0.22, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  geometry.computeVertexNormals();
  return geometry;
}

const leafGeometries = {
  monstera: createLeafGeometry(0.25, 0.66, 1.08),
  snake: createLeafGeometry(0.07, 0.92, 0.7),
  fern: createLeafGeometry(0.075, 0.32, 0.9),
};

function createPlanter(plant, index) {
  const group = new THREE.Group();
  group.userData.plantIndex = index;
  group.userData.plant = plant;

  const potMaterial = material(plant.pot, { roughness: 0.84 });
  const rimMaterial = material(plant.pot, { roughness: 0.74 });
  const soilMaterial = material('#4c392b', { roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: plant.leaf,
    roughness: 0.84,
    side: THREE.DoubleSide,
  });

  cylinder(group, 0.285, 0.29, 0.034, 20, rimMaterial, 0, 0.021, 0);
  cylinder(group, 0.255, 0.19, 0.37, 18, potMaterial, 0, 0.225, 0);
  cylinder(group, 0.282, 0.282, 0.052, 20, rimMaterial, 0, 0.392, 0);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.245, 20), soilMaterial);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.421;
  soil.receiveShadow = true;
  group.add(soil);

  const foliage = new THREE.Group();
  group.add(foliage);

  if (plant.type === 'monstera') {
    for (let leafIndex = 0; leafIndex < 8; leafIndex += 1) {
      const pivot = new THREE.Group();
      const angle = (leafIndex / 8) * Math.PI * 2 + 0.3;
      pivot.position.set(Math.cos(angle) * 0.035, 0.42 + (leafIndex % 3) * 0.045, Math.sin(angle) * 0.035);
      pivot.rotation.y = -angle;
      const leaf = new THREE.Mesh(leafGeometries.monstera, leafMaterial);
      leaf.scale.setScalar(0.72 + (leafIndex % 4) * 0.1);
      leaf.rotation.z = 0.3 + (leafIndex % 5) * 0.095;
      leaf.position.y = 0.07;
      leaf.castShadow = true;
      pivot.add(leaf);
      foliage.add(pivot);
    }
  }

  if (plant.type === 'olive') {
    const trunkMaterial = material('#7d6348', { roughness: 0.9 });
    cylinder(foliage, 0.025, 0.045, 0.69, 10, trunkMaterial, 0, 0.74, 0);
    const branchGeometry = new THREE.CylinderGeometry(0.012, 0.02, 0.38, 8);
    [[0.12, 0.95, 0.03, -0.7], [-0.12, 0.93, -0.02, 0.7], [0.02, 0.98, -0.11, 0.5]].forEach(
      ([x, y, z, rotationZ]) => {
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
        branch.position.set(x, y, z);
        branch.rotation.z = rotationZ;
        branch.castShadow = true;
        foliage.add(branch);
      },
    );
    const canopyGeometry = new THREE.IcosahedronGeometry(0.17, 1);
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: plant.leaf, roughness: 0.9, flatShading: true });
    [
      [0, 1.14, 0, 1],
      [0.18, 1.17, 0.06, 0.9],
      [-0.17, 1.2, 0.02, 0.85],
      [0.04, 1.27, -0.12, 0.8],
      [0.1, 1.28, 0.12, 0.76],
      [-0.11, 1.31, -0.11, 0.75],
      [-0.19, 1.1, 0.13, 0.66],
      [0.19, 1.04, -0.1, 0.62],
    ].forEach(([x, y, z, scale]) => {
      const cluster = new THREE.Mesh(canopyGeometry, canopyMaterial);
      cluster.position.set(x, y, z);
      cluster.scale.set(scale * 1.15, scale * 0.9, scale);
      cluster.castShadow = true;
      foliage.add(cluster);
    });
  }

  if (plant.type === 'snake') {
    for (let leafIndex = 0; leafIndex < 11; leafIndex += 1) {
      const pivot = new THREE.Group();
      const angle = (leafIndex / 11) * Math.PI * 2 + 0.15;
      pivot.position.set(Math.cos(angle) * 0.055, 0.42, Math.sin(angle) * 0.055);
      pivot.rotation.y = -angle;
      const leaf = new THREE.Mesh(leafGeometries.snake, leafMaterial);
      leaf.scale.set(0.72 + (leafIndex % 3) * 0.12, 0.72 + (leafIndex % 4) * 0.12, 1);
      leaf.rotation.z = (leafIndex % 2 === 0 ? 1 : -1) * (0.08 + (leafIndex % 4) * 0.05);
      leaf.castShadow = true;
      pivot.add(leaf);
      foliage.add(pivot);
    }
  }

  if (plant.type === 'fern') {
    for (let leafIndex = 0; leafIndex < 21; leafIndex += 1) {
      const pivot = new THREE.Group();
      const angle = (leafIndex / 21) * Math.PI * 2 + 0.24;
      pivot.position.set(Math.cos(angle) * 0.04, 0.43, Math.sin(angle) * 0.04);
      pivot.rotation.y = -angle;
      const leaf = new THREE.Mesh(leafGeometries.fern, leafMaterial);
      leaf.scale.setScalar(0.7 + (leafIndex % 5) * 0.08);
      leaf.rotation.z = 0.42 + (leafIndex % 6) * 0.1;
      leaf.castShadow = true;
      pivot.add(leaf);
      foliage.add(pivot);
    }
  }

  if (plant.type === 'citrus') {
    const trunkMaterial = material('#785d43', { roughness: 0.92 });
    cylinder(foliage, 0.024, 0.042, 0.56, 10, trunkMaterial, 0, 0.68, 0);
    const canopyGeometry = new THREE.IcosahedronGeometry(0.19, 2);
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: plant.leaf, roughness: 0.86, flatShading: true });
    [
      [0, 1.06, 0, 1.15],
      [0.16, 1.13, 0.05, 0.92],
      [-0.16, 1.15, 0.01, 0.86],
      [0.04, 1.23, -0.12, 0.76],
      [-0.03, 0.98, 0.16, 0.7],
      [0.16, 0.99, -0.14, 0.66],
    ].forEach(([x, y, z, scale]) => {
      const cluster = new THREE.Mesh(canopyGeometry, canopyMaterial);
      cluster.position.set(x, y, z);
      cluster.scale.setScalar(scale);
      cluster.castShadow = true;
      foliage.add(cluster);
    });
    const fruitMaterial = new THREE.MeshStandardMaterial({
      color: '#e29b35',
      roughness: 0.62,
      emissive: '#6c310d',
      emissiveIntensity: 0.08,
    });
    const fruitGeometry = new THREE.SphereGeometry(0.037, 9, 7);
    [[0.19, 1.02, 0.1], [-0.13, 1.06, 0.18], [0.12, 1.2, -0.16], [-0.18, 1.17, -0.08]].forEach(([x, y, z]) => {
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial);
      fruit.position.set(x, y, z);
      fruit.castShadow = true;
      foliage.add(fruit);
    });
  }

  foliage.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#d56f4c',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 36), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.028;
  ring.visible = false;
  group.add(ring);
  group.userData.selectionRing = ring;
  return group;
}

function buildPlanters() {
  planterGroups = PLANTS.map((plant, index) => {
    const group = createPlanter(plant, index);
    scene.add(group);
    return group;
  });
  updatePlanterMeshes();
}

function updatePlanterMeshes() {
  const arrangement = state.arrangements[state.scheme];
  planterGroups.forEach((group, index) => {
    group.position.x = arrangement[index].x;
    group.position.z = arrangement[index].z;
    group.rotation.y = index * 0.68 + 0.3;
    group.userData.selectionRing.visible = state.selected === index;
  });
}

function setInitialCamera(width, height) {
  const aspect = width / Math.max(1, height);
  const target = new THREE.Vector3(0, 0.55, 0);
  const direction = new THREE.Vector3(0.51, 0.41, 0.76).normalize();
  const distance = aspect < 0.95 ? 14.6 : 12.65;
  camera.fov = width < 700 ? 49 : 42;
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  controls.target.copy(target);
  controls.update();
}

function resizeStage() {
  const rect = ui.stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  if (!state.cameraTouched) setInitialCamera(rect.width, rect.height);
  camera.updateProjectionMatrix();
}

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  renderer = new THREE.WebGLRenderer({
    canvas: ui.sceneCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 21;
  controls.minPolarAngle = 0.38;
  controls.maxPolarAngle = Math.PI / 2 - 0.075;
  controls.rotateSpeed = 0.52;
  controls.zoomSpeed = 0.7;
  controls.addEventListener('start', () => {
    state.cameraTouched = true;
  });

  hemiLight = new THREE.HemisphereLight(0xe8f0e2, 0x705646, 0.8);
  scene.add(hemiLight);
  ambientLight = new THREE.AmbientLight(0xfff6e8, 0.18);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffebc3, 2.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -9;
  sunLight.shadow.camera.right = 9;
  sunLight.shadow.camera.top = 9;
  sunLight.shadow.camera.bottom = -9;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.018;
  sunLight.shadow.radius = 2.4;
  sunLight.target.position.set(0, 0.35, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  buildArchitecture();
  buildFurniture();
  buildPlanters();

  const resizeObserver = new ResizeObserver(resizeStage);
  resizeObserver.observe(ui.stage);
  resizeStage();
  window.addEventListener('resize', resizeStage);
}

function updateHeadingUI() {
  const degrees = Math.round(normalizeDegrees(state.heading));
  const shortName = cardinalName(degrees, true);
  ui.headingDisplay.textContent = `${shortName} · ${degrees}°`;
  ui.headingDegrees.textContent = `${degrees}°`;
  ui.headingCardinal.textContent = cardinalName(degrees);
  ui.headingDirectionInline.textContent = shortName;
  ui.headingSlider.value = String(degrees);
  ui.compassNeedle.style.transform = `rotate(${degrees}deg)`;
  ui.miniCompassArrow.style.transform = `translate(-50%, -8px) rotate(${degrees}deg)`;
}

function syncSchemeControls() {
  [ui.schemeSwitch, ui.planSchemeSwitch].forEach((switchElement) => {
    switchElement.querySelectorAll('button').forEach((button) => {
      const active = button.dataset.scheme === state.scheme;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });
  ui.schemeCaption.textContent = `Plan ${state.scheme}`;
}

function setScheme(scheme) {
  if (scheme !== 'A' && scheme !== 'B') return;
  state.scheme = scheme;
  syncSchemeControls();
  updatePlanterMeshes();
  updateSunStudy();
}

function classifyExposure(exposure) {
  if (exposure >= 0.55) return { key: 'sun', label: 'Sun' };
  if (exposure > 0.01) return { key: 'dapple', label: 'Dappled' };
  return { key: 'shade', label: 'Shade' };
}

function countSunlit(exposures) {
  return exposures.filter((exposure) => exposure >= 0.5).length;
}

function updateTimeUI() {
  const location = getLocation();
  const sun = state.sun;
  const phase = (() => {
    if (!sun) return 'daylight';
    if (state.currentMinutes > state.sunset - 75) return 'golden hour';
    if (state.currentMinutes < state.sunrise + 75) return 'early light';
    if (state.currentMinutes < state.solarNoon) return 'morning sun';
    return 'afternoon sun';
  })();

  ui.clockDisplay.textContent = formatTime(state.currentMinutes);
  ui.timelineTime.textContent = formatTime(state.currentMinutes);
  ui.timelinePhase.textContent = phase;
  ui.sunriseLabel.textContent = formatTime(state.sunrise);
  ui.sunsetLabel.textContent = formatTime(state.sunset);
  ui.daylightLength.textContent = formatDuration(state.sunset - state.sunrise);
  ui.timeSlider.value = String(Math.round(state.timeFrac * 1000));
  ui.timeSlider.style.setProperty('--time-pct', `${(state.timeFrac * 100).toFixed(1)}%`);
  ui.arrangementEyebrow.textContent = `Arrangement ${state.scheme} · ${formatTime(state.currentMinutes)} · ${location.city}`;

  if (sun) {
    ui.altitudeValue.textContent = `${Math.round(Math.max(-90, sun.altitude))}°`;
    ui.azimuthValue.textContent = `${Math.round(sun.azimuth)}° ${cardinalName(sun.azimuth, true)}`;
    ui.lightValue.textContent = sun.altitude > 24 ? 'Direct' : sun.altitude > 9 ? 'Low' : 'Golden';
  }
}

function updatePlanterRows() {
  const exposures = state.exposures[state.scheme];
  plantRows.forEach((row, index) => {
    const exposure = exposures[index] ?? 0;
    const status = classifyExposure(exposure);
    row.classList.toggle('is-sun', status.key === 'sun');
    row.classList.toggle('is-dapple', status.key === 'dapple');
    row.classList.toggle('is-shade', status.key === 'shade');
    row.classList.toggle('is-selected', state.selected === index);
    row.querySelector('.exposure-track i').style.width = `${Math.round(exposure * 100)}%`;
    row.querySelector('.plant-exposure > span').textContent = status.label;
  });
  ui.sunlitCount.textContent = `${countSunlit(exposures)}/5`;
}

function updateCompareSummary() {
  ui.compareSummary.hidden = !state.compare;
  if (!state.compare) return;
  const sunA = countSunlit(state.exposures.A);
  const sunB = countSunlit(state.exposures.B);
  ui.compareSunA.textContent = `${sunA}/5`;
  ui.compareShadeA.textContent = `${5 - sunA} shaded`;
  ui.compareSunB.textContent = `${sunB}/5`;
  ui.compareShadeB.textContent = `${5 - sunB} shaded`;
  $$('.compare-card').forEach((card) => {
    card.classList.toggle('is-current', card.dataset.schemeCard === state.scheme);
  });
}

function updateUI() {
  updateHeadingUI();
  syncSchemeControls();
  updateTimeUI();
  updatePlanterRows();
  updateCompareSummary();
  drawPlan();
}

function updateSunStudy() {
  const location = getLocation();
  const offset = timezoneOffsetHours(state.date, location.tz);
  const sun = solarPosition(location.lat, location.lon, state.date, state.currentMinutes, offset);
  state.sun = sun;
  state.sunDir = currentSunVector(sun);

  sunLight.position.copy(state.sunDir).multiplyScalar(24);
  sunLight.target.position.set(0, 0.35, 0);
  sunLight.target.updateMatrixWorld();
  const daylightFactor = clamp(sun.altitude / 48, 0, 1);
  const warmFactor = clamp(1 - sun.altitude / 28, 0, 1);
  sunLight.intensity = 1.35 + daylightFactor * 1.65;
  sunLight.color.set(warmFactor > 0.5 ? '#ffbd7e' : '#ffedc9');
  hemiLight.intensity = 0.65 + daylightFactor * 0.22;
  ambientLight.intensity = 0.16 + daylightFactor * 0.06;

  ui.stage.style.setProperty('--stage-top', mixHex('#dfd4c2', '#d3dfd1', daylightFactor));
  ui.stage.style.setProperty('--stage-mid', mixHex('#f0d8bb', '#e9e5d1', daylightFactor));
  ui.stage.style.setProperty('--stage-bottom', mixHex('#efc89d', '#f2dfbe', daylightFactor));
  const relativeAzimuth = degToRad(sun.azimuth - state.heading);
  const sunX = clamp(50 + Math.sin(relativeAzimuth) * 39, 8, 92);
  const sunY = clamp(66 - sun.altitude * 1.15, 5, 66);
  ui.stage.style.setProperty('--sun-x', `${sunX.toFixed(1)}%`);
  ui.stage.style.setProperty('--sun-y', `${sunY.toFixed(1)}%`);

  scene.updateMatrixWorld(true);
  solarRaycaster.far = 50;
  const sampleHeights = [0.32, 0.66, 1.04];
  ['A', 'B'].forEach((scheme) => {
    state.exposures[scheme] = PLANTS.map((_, index) => {
      const position = state.arrangements[scheme][index];
      let litSamples = 0;
      sampleHeights.forEach((height) => {
        solarRaycaster.set(new THREE.Vector3(position.x, height, position.z), state.sunDir);
        const hits = solarRaycaster.intersectObjects(occluders, false);
        if (!hits.length) litSamples += 1;
      });
      return litSamples / sampleHeights.length;
    });
  });

  renderer.shadowMap.needsUpdate = true;
  updateUI();
}

function recomputeDaylight() {
  const location = getLocation();
  const offset = timezoneOffsetHours(state.date, location.tz);
  const daylight = daylightWindow(location, state.date, offset);
  state.sunrise = daylight.sunrise;
  state.sunset = daylight.sunset;
  state.solarNoon = daylight.solarNoon;
  state.currentMinutes = state.sunrise + state.timeFrac * (state.sunset - state.sunrise);
  updateSunStudy();
}

function resizePlanCanvas() {
  const rect = ui.planWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  planDpr = Math.min(window.devicePixelRatio || 1, 2);
  planWidth = rect.width;
  planHeight = rect.height;
  ui.planCanvas.width = Math.round(planWidth * planDpr);
  ui.planCanvas.height = Math.round(planHeight * planDpr);
  ui.planCanvas.style.width = `${planWidth}px`;
  ui.planCanvas.style.height = `${planHeight}px`;
  drawPlan();
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function planTransform(region) {
  const inset = region.width < 150 ? 6 : 9;
  const scale = Math.min(
    (region.width - inset * 2) / (BALCONY.floorMaxX - BALCONY.floorMinX),
    (region.height - inset * 2) / (BALCONY.floorMaxZ - BALCONY.floorMinZ),
  );
  return {
    scale,
    originX: region.x + region.width / 2,
    originY: region.y + region.height / 2,
  };
}

function worldToPlanCoordinates(x, z, transform) {
  return {
    x: transform.originX + x * transform.scale,
    y: transform.originY + z * transform.scale,
  };
}

function planToWorldCoordinates(x, y, transform) {
  return {
    x: (x - transform.originX) / transform.scale,
    z: (y - transform.originY) / transform.scale,
  };
}

function drawPlan() {
  if (!planWidth || !planHeight || !state.sun) return;
  const context = planContext;
  context.setTransform(planDpr, 0, 0, planDpr, 0, 0);
  context.clearRect(0, 0, planWidth, planHeight);

  const outerPadding = 7;
  const labelHeight = state.compare ? 21 : 3;
  const gap = state.compare ? 9 : 0;
  const count = state.compare ? 2 : 1;
  const regionWidth = (planWidth - outerPadding * 2 - gap * (count - 1)) / count;
  planRegions = [];

  for (let index = 0; index < count; index += 1) {
    const scheme = state.compare ? (index === 0 ? 'A' : 'B') : state.scheme;
    const region = {
      x: outerPadding + index * (regionWidth + gap),
      y: outerPadding + labelHeight,
      width: regionWidth,
      height: planHeight - outerPadding * 2 - labelHeight,
      scheme,
    };
    planRegions.push(region);
    if (state.compare) {
      context.fillStyle = scheme === state.scheme ? 'rgba(24, 59, 47, 0.92)' : 'rgba(24, 59, 47, 0.1)';
      roundedRect(context, region.x, 7, 19, 14, 7);
      context.fill();
      context.fillStyle = scheme === state.scheme ? '#f7f3e8' : '#53665a';
      context.font = '800 8px "Helvetica Neue", Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(scheme, region.x + 9.5, 14.5);
      context.textAlign = 'left';
      context.fillStyle = '#6b7a70';
      context.font = '700 7px "Helvetica Neue", Arial, sans-serif';
      context.fillText(`PLAN ${scheme}`, region.x + 25, 15);
      context.textBaseline = 'alphabetic';
    }
    drawPlanRegion(context, region, scheme);
  }
}

function drawPlanRegion(context, region, scheme) {
  const transform = planTransform(region);
  const scale = transform.scale;
  const floorX = transform.originX + BALCONY.floorMinX * scale;
  const floorY = transform.originY + BALCONY.floorMinZ * scale;
  const floorWidth = (BALCONY.floorMaxX - BALCONY.floorMinX) * scale;
  const floorHeight = (BALCONY.floorMaxZ - BALCONY.floorMinZ) * scale;
  const tiny = region.width < 176;

  context.save();
  context.shadowColor = 'rgba(35, 55, 42, 0.13)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 4;
  context.fillStyle = '#faf6ec';
  roundedRect(context, floorX, floorY, floorWidth, floorHeight, 5);
  context.fill();
  context.restore();

  context.save();
  roundedRect(context, floorX, floorY, floorWidth, floorHeight, 5);
  context.clip();
  context.fillStyle = 'rgba(204, 190, 161, 0.18)';
  context.fillRect(floorX, floorY, floorWidth, floorHeight);

  const overhangX = transform.originX + BALCONY.floorMinX * scale;
  const overhangY = transform.originY + BALCONY.floorMinZ * scale;
  const overhangWidth = (BALCONY.floorMaxX - BALCONY.floorMinX) * scale;
  const overhangHeight = (-0.05 - BALCONY.floorMinZ) * scale;
  context.fillStyle = 'rgba(24, 59, 47, 0.075)';
  context.fillRect(overhangX, overhangY, overhangWidth, overhangHeight);
  context.strokeStyle = 'rgba(24, 59, 47, 0.09)';
  context.lineWidth = 1;
  for (let offset = -overhangHeight; offset < overhangWidth + overhangHeight; offset += 12) {
    context.beginPath();
    context.moveTo(overhangX + offset, overhangY);
    context.lineTo(overhangX + offset + overhangHeight, overhangY + overhangHeight);
    context.stroke();
  }

  context.strokeStyle = 'rgba(112, 96, 70, 0.11)';
  context.lineWidth = 1;
  for (let x = BALCONY.floorMinX + 0.74; x < BALCONY.floorMaxX; x += 0.74) {
    const screenX = transform.originX + x * scale;
    context.beginPath();
    context.moveTo(screenX, floorY);
    context.lineTo(screenX, floorY + floorHeight);
    context.stroke();
  }
  for (let z = BALCONY.floorMinZ + 0.78; z < BALCONY.floorMaxZ; z += 0.78) {
    const screenY = transform.originY + z * scale;
    context.beginPath();
    context.moveTo(floorX, screenY);
    context.lineTo(floorX + floorWidth, screenY);
    context.stroke();
  }
  context.restore();

  const rug = worldToPlanCoordinates(-0.78, 1.16, transform);
  context.fillStyle = 'rgba(198, 177, 143, 0.38)';
  context.strokeStyle = 'rgba(121, 96, 68, 0.23)';
  context.lineWidth = 1;
  roundedRect(context, rug.x - 1.09 * scale, rug.y - 0.71 * scale, 2.18 * scale, 1.42 * scale, 2);
  context.fill();
  context.stroke();

  const bench = worldToPlanCoordinates(-3.16, 0.48, transform);
  context.fillStyle = 'rgba(121, 89, 62, 0.28)';
  roundedRect(context, bench.x - 0.34 * scale, bench.y - 1.04 * scale, 0.68 * scale, 2.08 * scale, 2);
  context.fill();
  context.strokeStyle = 'rgba(80, 64, 47, 0.32)';
  context.stroke();

  const table = worldToPlanCoordinates(1.25, -0.55, transform);
  context.beginPath();
  context.arc(table.x, table.y, 0.55 * scale, 0, Math.PI * 2);
  context.fillStyle = 'rgba(201, 179, 143, 0.52)';
  context.fill();
  context.strokeStyle = 'rgba(100, 80, 56, 0.4)';
  context.stroke();
  context.beginPath();
  context.arc(table.x, table.y, 0.08 * scale, 0, Math.PI * 2);
  context.fillStyle = 'rgba(100, 80, 56, 0.32)';
  context.fill();

  const chairOne = worldToPlanCoordinates(1.25, 0.47, transform);
  context.fillStyle = 'rgba(117, 96, 68, 0.25)';
  roundedRect(context, chairOne.x - 0.22 * scale, chairOne.y - 0.2 * scale, 0.44 * scale, 0.4 * scale, 2);
  context.fill();
  const chairTwo = worldToPlanCoordinates(2.31, -0.55, transform);
  roundedRect(context, chairTwo.x - 0.2 * scale, chairTwo.y - 0.22 * scale, 0.4 * scale, 0.44 * scale, 2);
  context.fill();

  const sunRelative = degToRad(state.sun.azimuth - state.heading);
  const sunDirection = { x: Math.sin(sunRelative), y: Math.cos(sunRelative) };
  const halfWidth = floorWidth / 2;
  const halfHeight = floorHeight / 2;
  const horizontalReach = Math.abs(sunDirection.x) > 0.001 ? halfWidth / Math.abs(sunDirection.x) : Infinity;
  const verticalReach = Math.abs(sunDirection.y) > 0.001 ? halfHeight / Math.abs(sunDirection.y) : Infinity;
  const reach = Math.min(horizontalReach, verticalReach) + 9;
  const sunX = transform.originX + sunDirection.x * reach;
  const sunY = transform.originY + sunDirection.y * reach;

  context.save();
  context.setLineDash([3, 3]);
  context.strokeStyle = 'rgba(199, 109, 78, 0.32)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(sunX, sunY);
  context.lineTo(transform.originX, transform.originY);
  context.stroke();
  context.restore();

  const glow = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, 11);
  glow.addColorStop(0, 'rgba(239, 190, 82, 0.5)');
  glow.addColorStop(1, 'rgba(239, 190, 82, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(sunX, sunY, 11, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#dca33d';
  context.beginPath();
  context.arc(sunX, sunY, tiny ? 3.5 : 4.2, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = '#28483c';
  context.lineWidth = 3;
  context.lineCap = 'square';
  context.beginPath();
  context.moveTo(floorX, floorY + 1.5);
  context.lineTo(floorX, floorY + floorHeight - 1.5);
  context.stroke();
  context.beginPath();
  context.moveTo(floorX + 1.5, floorY);
  context.lineTo(floorX + floorWidth - 1.5, floorY);
  context.stroke();

  context.strokeStyle = 'rgba(46, 75, 60, 0.7)';
  context.lineWidth = 1.6;
  context.setLineDash([4, 3]);
  context.beginPath();
  context.moveTo(floorX + 1, floorY + floorHeight);
  context.lineTo(floorX + floorWidth, floorY + floorHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(floorX + floorWidth, floorY + 3);
  context.lineTo(floorX + floorWidth, floorY + floorHeight);
  context.stroke();
  context.setLineDash([]);

  const northRelative = degToRad(-state.heading);
  const northVector = { x: Math.sin(northRelative), y: Math.cos(northRelative) };
  const northX = region.x + region.width - 14;
  const northY = region.y + region.height - 15;
  context.fillStyle = 'rgba(250, 247, 236, 0.88)';
  context.strokeStyle = 'rgba(24, 59, 47, 0.18)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(northX, northY, tiny ? 8 : 9.5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.save();
  context.translate(northX, northY);
  context.rotate(Math.atan2(northVector.x, -northVector.y));
  context.strokeStyle = '#28483c';
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(0, 5);
  context.lineTo(0, -5);
  context.stroke();
  context.beginPath();
  context.moveTo(-2.4, -2.6);
  context.lineTo(0, -5.6);
  context.lineTo(2.4, -2.6);
  context.stroke();
  context.fillStyle = '#28483c';
  context.font = '800 5px "Helvetica Neue", Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('N', 0, -7.6);
  context.restore();

  const arrangement = state.arrangements[scheme];
  const exposures = state.exposures[scheme];
  const radius = tiny ? 8.2 : 10.2;
  arrangement.forEach((position, index) => {
    const point = worldToPlanCoordinates(position.x, position.z, transform);
    const exposure = exposures[index] ?? 0;
    const status = classifyExposure(exposure);
    const selected = state.selected === index && scheme === state.scheme;

    context.beginPath();
    context.ellipse(
      point.x - sunDirection.x * 3.2,
      point.y - sunDirection.y * 3.2,
      radius * 1.12,
      radius * 0.72,
      Math.atan2(sunDirection.y, sunDirection.x),
      0,
      Math.PI * 2,
    );
    context.fillStyle = 'rgba(37, 55, 43, 0.13)';
    context.fill();

    if (selected) {
      context.beginPath();
      context.arc(point.x, point.y, radius + 4.2, 0, Math.PI * 2);
      context.strokeStyle = '#c96749';
      context.lineWidth = 1.6;
      context.stroke();
    }

    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = status.key === 'sun' ? '#efbe52' : status.key === 'dapple' ? '#a9b46e' : '#91a095';
    context.fill();
    context.strokeStyle = '#fdf9ef';
    context.lineWidth = 1.6;
    context.stroke();

    context.fillStyle = status.key === 'sun' ? '#4a3517' : '#f7f3e8';
    context.font = `${tiny ? 700 : 800} ${tiny ? 6.5 : 7.5}px "Helvetica Neue", Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(tiny ? String(index + 1) : String(index + 1).padStart(2, '0'), point.x, point.y + 0.4);

    if (!tiny) {
      const label = status.label;
      const labelWidth = context.measureText(label).width + 10;
      const labelX = point.x - labelWidth / 2;
      const labelY = point.y + radius + 4;
      context.fillStyle = 'rgba(250, 247, 236, 0.9)';
      roundedRect(context, labelX, labelY, labelWidth, 12, 6);
      context.fill();
      context.fillStyle = '#53665a';
      context.font = '700 6.5px "Helvetica Neue", Arial, sans-serif';
      context.fillText(label, point.x, labelY + 6.5);
    }
  });

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
}

function findPlanRegion(x, y) {
  return planRegions.find(
    (region) => x >= region.x && x <= region.x + region.width && y >= region.y - 24 && y <= region.y + region.height,
  );
}

function planPointerPosition(event) {
  const rect = ui.planCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function findPlanterAt(region, x, y) {
  const transform = planTransform(region);
  const arrangement = state.arrangements[region.scheme];
  let best = null;
  arrangement.forEach((position, index) => {
    const point = worldToPlanCoordinates(position.x, position.z, transform);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= (region.width < 176 ? 13 : 16) && (!best || distance < best.distance)) {
      best = { index, distance };
    }
  });
  return best;
}

function handlePlanPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const point = planPointerPosition(event);
  const region = findPlanRegion(point.x, point.y);
  if (!region) return;
  const hit = findPlanterAt(region, point.x, point.y);
  if (!hit) return;
  state.scheme = region.scheme;
  state.selected = hit.index;
  state.drag = {
    scheme: region.scheme,
    index: hit.index,
    pointerId: event.pointerId,
    transform: planTransform(region),
  };
  syncSchemeControls();
  updatePlanterMeshes();
  ui.planCanvas.setPointerCapture(event.pointerId);
  ui.planCanvas.classList.add('is-dragging');
  ui.planCanvas.focus({ preventScroll: true });
  event.preventDefault();
  drawPlan();
}

function handlePlanPointerMove(event) {
  const point = planPointerPosition(event);
  if (!state.drag) {
    const region = findPlanRegion(point.x, point.y);
    const hit = region ? findPlanterAt(region, point.x, point.y) : null;
    ui.planCanvas.style.cursor = hit ? 'grab' : 'default';
    return;
  }
  const world = planToWorldCoordinates(point.x, point.y, state.drag.transform);
  const arrangement = state.arrangements[state.drag.scheme];
  arrangement[state.drag.index].x = clamp(world.x, BALCONY.minPlanX, BALCONY.maxPlanX);
  arrangement[state.drag.index].z = clamp(world.z, BALCONY.minPlanZ, BALCONY.maxPlanZ);
  if (state.drag.scheme === state.scheme) updatePlanterMeshes();
  updateSunStudy();
  event.preventDefault();
}

function handlePlanPointerUp(event) {
  if (!state.drag) return;
  if (ui.planCanvas.hasPointerCapture(event.pointerId)) ui.planCanvas.releasePointerCapture(event.pointerId);
  state.drag = null;
  ui.planCanvas.classList.remove('is-dragging');
  ui.planCanvas.style.cursor = 'default';
}

function handlePlanKeyDown(event) {
  if (state.selected === null) return;
  const step = event.shiftKey ? 0.3 : 0.11;
  let dx = 0;
  let dz = 0;
  if (event.key === 'ArrowLeft') dx = -step;
  if (event.key === 'ArrowRight') dx = step;
  if (event.key === 'ArrowUp') dz = -step;
  if (event.key === 'ArrowDown') dz = step;
  if (!dx && !dz) return;
  const arrangement = state.arrangements[state.scheme];
  arrangement[state.selected].x = clamp(arrangement[state.selected].x + dx, BALCONY.minPlanX, BALCONY.maxPlanX);
  arrangement[state.selected].z = clamp(arrangement[state.selected].z + dz, BALCONY.minPlanZ, BALCONY.maxPlanZ);
  updatePlanterMeshes();
  updateSunStudy();
  event.preventDefault();
}

function buildPlantRows() {
  plantRows = PLANTS.map((plant, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'plant-row';
    row.innerHTML = `
      <span class="plant-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="plant-name"><strong>${plant.name}</strong><span>${plant.latin}</span></span>
      <span class="plant-exposure"><span>Shade</span><span class="exposure-track"><i></i></span></span>
    `;
    row.addEventListener('click', () => {
      state.selected = index;
      updatePlanterMeshes();
      updateUI();
    });
    ui.plantList.appendChild(row);
    return row;
  });
}

function setupLocationOptions() {
  ui.locationSelect.innerHTML = LOCATIONS.map(
    (location) => `<option value="${location.id}">${location.city}, ${location.country}</option>`,
  ).join('');
  ui.locationSelect.value = state.locationId;
  ui.dateInput.value = state.date;
}

function setupEvents() {
  ui.locationSelect.addEventListener('change', () => {
    state.locationId = ui.locationSelect.value;
    recomputeDaylight();
  });

  ui.dateInput.addEventListener('change', () => {
    if (!ui.dateInput.value) return;
    state.date = ui.dateInput.value;
    recomputeDaylight();
  });

  [ui.schemeSwitch, ui.planSchemeSwitch].forEach((switchElement) => {
    switchElement.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-scheme]');
      if (button) setScheme(button.dataset.scheme);
    });
  });

  ui.headingSlider.addEventListener('input', () => {
    state.heading = Number(ui.headingSlider.value);
    updateHeadingUI();
    updateSunStudy();
  });

  [ui.headingStepLeft, ui.headingStepRight].forEach((button, index) => {
    button.addEventListener('click', () => {
      state.heading = normalizeDegrees(state.heading + (index === 0 ? -15 : 15));
      updateHeadingUI();
      updateSunStudy();
    });
  });

  ui.timeSlider.addEventListener('input', () => {
    state.playing = false;
    ui.playButton.setAttribute('aria-pressed', 'false');
    state.timeFrac = Number(ui.timeSlider.value) / 1000;
    state.currentMinutes = state.sunrise + state.timeFrac * (state.sunset - state.sunrise);
    updateSunStudy();
  });

  ui.playButton.addEventListener('click', () => {
    state.playing = !state.playing;
    ui.playButton.setAttribute('aria-pressed', String(state.playing));
    ui.playButton.setAttribute('aria-label', state.playing ? 'Pause daylight animation' : 'Play through daylight');
    if (state.playing && state.timeFrac >= 0.995) {
      state.timeFrac = 0;
      state.currentMinutes = state.sunrise;
      updateSunStudy();
    }
  });

  ui.compareButton.addEventListener('click', () => {
    state.compare = !state.compare;
    ui.compareButton.setAttribute('aria-pressed', String(state.compare));
    ui.compareButton.setAttribute('aria-label', state.compare ? 'Return to single arrangement' : 'Compare both arrangements');
    const compareLabel = ui.compareButton.querySelector('span');
    if (compareLabel) compareLabel.textContent = state.compare ? 'Split' : 'Compare';
    updateCompareSummary();
    drawPlan();
  });

  ui.resetButton.addEventListener('click', () => {
    state.arrangements[state.scheme] = DEFAULT_ARRANGEMENTS[state.scheme].map((position) => ({ ...position }));
    state.selected = null;
    updatePlanterMeshes();
    updateSunStudy();
    ui.resetButton.textContent = 'Layout reset';
    window.setTimeout(() => {
      ui.resetButton.textContent = 'Reset layout';
    }, 1100);
  });

  ui.planCanvas.addEventListener('pointerdown', handlePlanPointerDown);
  ui.planCanvas.addEventListener('pointermove', handlePlanPointerMove);
  ui.planCanvas.addEventListener('pointerup', handlePlanPointerUp);
  ui.planCanvas.addEventListener('pointercancel', handlePlanPointerUp);
  ui.planCanvas.addEventListener('pointerleave', () => {
    if (!state.drag) ui.planCanvas.style.cursor = 'default';
  });
  ui.planCanvas.addEventListener('keydown', handlePlanKeyDown);

  const planResizeObserver = new ResizeObserver(resizePlanCanvas);
  planResizeObserver.observe(ui.planWrap);
  resizePlanCanvas();
}

function animate(now) {
  const delta = Math.min((now - lastFrameTime) / 1000, 0.08);
  lastFrameTime = now;

  if (state.playing) {
    state.timeFrac += delta / 28;
    if (state.timeFrac > 1) state.timeFrac = 0;
    state.currentMinutes = state.sunrise + state.timeFrac * (state.sunset - state.sunrise);
    updateSunStudy();
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

setupLocationOptions();
buildPlantRows();
buildScene();
setupEvents();
recomputeDaylight();
updateHeadingUI();
requestAnimationFrame(animate);
