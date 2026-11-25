import * as THREE from "three";

const CYCLE_DAYS = 29.5;
const INITIAL_DAY = 7.375;
const DAYS_PER_SECOND = 0.72;
const ORBIT_RADIUS = 2.78;
const EARTH_RADIUS = 0.64;
const MOON_RADIUS = 0.235;
const SUN_RADIUS = 0.94;
const SUN_X = -7.15;
const QUARTER_DAY = CYCLE_DAYS / 4;
const HALF_DAY = CYCLE_DAYS / 2;
const THREE_QUARTER_DAY = (CYCLE_DAYS * 3) / 4;

const PHASES = {
  new: {
    name: "New Moon",
    kicker: "Turning point",
    description: "The Moon is between Earth and the Sun. Its sunlit half faces away from us.",
  },
  waxingCrescent: {
    name: "Waxing Crescent",
    kicker: "Waxing",
    description: "A thin sliver of the Sunlit side is turning toward Earth.",
  },
  firstQuarter: {
    name: "First Quarter",
    kicker: "Waxing",
    description: "We see exactly half of the Moon's Sunlit side. The bright half is growing.",
  },
  waxingGibbous: {
    name: "Waxing Gibbous",
    kicker: "Waxing",
    description: "More than half of the Sunlit side is visible as the Moon approaches full.",
  },
  full: {
    name: "Full Moon",
    kicker: "Turning point",
    description: "Earth is between the Sun and the Moon, so the whole Sunlit side faces us.",
  },
  waningGibbous: {
    name: "Waning Gibbous",
    kicker: "Waning",
    description: "The bright portion is shrinking, but more than half is still visible.",
  },
  lastQuarter: {
    name: "Last Quarter",
    kicker: "Waning",
    description: "We see exactly half of the Sunlit side. The bright half is shrinking.",
  },
  waningCrescent: {
    name: "Waning Crescent",
    kicker: "Waning",
    description: "Only a thin sliver remains before the Moon returns to new.",
  },
};

const QUESTIONS = [
  {
    day: 0,
    phase: "New Moon",
    question: "At new moon, where is the Moon in its orbit?",
    options: [
      "Between Earth and the Sun",
      "On the opposite side of Earth from the Sun",
      "At a right angle to the Earth–Sun line",
    ],
    correct: 0,
    explanation:
      "The Moon sits between Earth and the Sun. Sunlight reaches the far side, so the side facing Earth appears dark. The model is now showing that alignment.",
  },
  {
    day: QUARTER_DAY,
    phase: "First Quarter",
    question: "What does the Earth-view preview show at first quarter?",
    options: ["A thin crescent", "Half lit, with the right side bright", "A completely dark disk"],
    correct: 1,
    explanation:
      "At first quarter, our line of sight is at a right angle to the Sunlight. We see half of the sunlit half. The illuminated portion is growing toward full.",
  },
  {
    day: HALF_DAY,
    phase: "Full Moon",
    question: "At full moon, what do we see from Earth?",
    options: [
      "The whole Sunlit disk",
      "Only Earth's shadow on the Moon",
      "A thin crescent of sunlight",
    ],
    correct: 0,
    explanation:
      "Earth is between the Sun and the Moon, so the entire Sunlit side faces us. Earth's shadow is not what creates the familiar phases.",
  },
];

const sceneElement = document.querySelector("#scene");
const orbitCanvas = document.querySelector("#orbitCanvas");
const previewCanvas = document.querySelector("#previewCanvas");
const daySlider = document.querySelector("#daySlider");
const dayOutput = document.querySelector("#dayOutput");
const illumInline = document.querySelector("#illumInline");
const illumBadge = document.querySelector("#illumBadge");
const illumFill = document.querySelector("#illumFill");
const phaseNow = document.querySelector("#phaseNow");
const previewPhase = document.querySelector("#previewPhase");
const phaseKicker = document.querySelector("#phaseKicker");
const phaseDescription = document.querySelector("#phaseDescription");
const moonDayLabel = document.querySelector("#moonDayLabel");
const playButton = document.querySelector("#playButton");
const playSymbol = document.querySelector("#playSymbol");
const playText = document.querySelector("#playText");
const resetButton = document.querySelector("#resetButton");
const phaseButtons = [...document.querySelectorAll(".phase-button")];
const quizContent = document.querySelector("#quizContent");
const quizDots = document.querySelector("#quizDots");
const sunLabel = document.querySelector("#sunLabel");
const earthLabel = document.querySelector("#earthLabel");
const moonLabel = document.querySelector("#moonLabel");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = reducedMotionQuery.matches;
let currentDay = INITIAL_DAY;
let isPlaying = false;
let quizIndex = 0;
let quizAnswered = false;
let quizSelected = null;
const quizResults = [];
let previewDirty = true;
let lastFrameTime = performance.now();

function makeRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeMoonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const random = makeRandom(27);

  const base = ctx.createLinearGradient(0, 0, 1024, 512);
  base.addColorStop(0, "#cfd6df");
  base.addColorStop(0.42, "#aeb8c5");
  base.addColorStop(1, "#8995a5");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 52; i += 1) {
    const x = random() * 1024;
    const y = random() * 512;
    const radius = 16 + random() * 92;
    const shade = random() > 0.48 ? "255, 255, 255" : "115, 126, 142";
    const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
    patch.addColorStop(0, `rgba(${shade}, ${0.035 + random() * 0.07})`);
    patch.addColorStop(1, `rgba(${shade}, 0)`);
    ctx.fillStyle = patch;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 150; i += 1) {
    const x = random() * 1024;
    const y = 20 + random() * 472;
    const radius = 1.2 + Math.pow(random(), 2.2) * 21;
    const edge = 0.55 + random() * 0.3;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(66, 76, 91, ${0.07 + random() * 0.16})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - radius * 0.18, y - radius * 0.2, radius * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(242, 246, 252, ${edge * 0.3})`;
    ctx.lineWidth = Math.max(0.6, radius * 0.08);
    ctx.stroke();

    if (radius > 6) {
      ctx.beginPath();
      ctx.arc(x + radius * 0.2, y + radius * 0.2, radius * 0.72, 0.15, Math.PI * 1.1);
      ctx.strokeStyle = `rgba(51, 59, 72, ${edge * 0.24})`;
      ctx.lineWidth = Math.max(0.7, radius * 0.1);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 900; i += 1) {
    const tone = 110 + Math.floor(random() * 100);
    ctx.fillStyle = `rgba(${tone}, ${tone + 6}, ${tone + 15}, ${0.018 + random() * 0.035})`;
    ctx.fillRect(random() * 1024, random() * 512, 1 + random() * 2.2, 1 + random() * 2.2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function drawLandMass(ctx, points, tone) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i][0] + points[i + 1][0]) / 2;
    const midY = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], midX, midY);
  }
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, 100, 0, 430);
  gradient.addColorStop(0, tone[0]);
  gradient.addColorStop(1, tone[1]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(209, 229, 180, 0.2)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function makeEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  const random = makeRandom(81);

  const ocean = ctx.createLinearGradient(0, 0, 0, 768);
  ocean.addColorStop(0, "#143c72");
  ocean.addColorStop(0.46, "#1e5ea0");
  ocean.addColorStop(1, "#0b2a57");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 1536, 768);

  for (let i = 0; i < 145; i += 1) {
    const x = random() * 1536;
    const y = random() * 768;
    const radius = 20 + random() * 90;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(91, 158, 216, 0.08)");
    glow.addColorStop(1, "rgba(91, 158, 216, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  drawLandMass(
    ctx,
    [
      [150, 194],
      [225, 156],
      [300, 181],
      [323, 251],
      [286, 319],
      [247, 329],
      [234, 383],
      [187, 404],
      [166, 349],
      [125, 292],
    ],
    ["#49754b", "#887a48"],
  );

  drawLandMass(
    ctx,
    [
      [244, 390],
      [291, 408],
      [312, 457],
      [299, 536],
      [260, 621],
      [225, 560],
      [210, 485],
    ],
    ["#4d7849", "#877445"],
  );

  drawLandMass(
    ctx,
    [
      [683, 211],
      [755, 175],
      [840, 190],
      [884, 236],
      [846, 297],
      [782, 341],
      [739, 404],
      [693, 380],
      [668, 316],
      [632, 267],
    ],
    ["#7e804a", "#b29657"],
  );

  drawLandMass(
    ctx,
    [
      [779, 389],
      [836, 401],
      [868, 458],
      [833, 541],
      [780, 520],
      [756, 453],
    ],
    ["#527b4b", "#95804b"],
  );

  drawLandMass(
    ctx,
    [
      [860, 138],
      [989, 92],
      [1141, 121],
      [1241, 192],
      [1217, 266],
      [1128, 286],
      [1062, 251],
      [999, 299],
      [921, 262],
      [887, 205],
    ],
    ["#39744f", "#8b814a"],
  );

  drawLandMass(
    ctx,
    [
      [1086, 354],
      [1166, 336],
      [1228, 380],
      [1204, 448],
      [1129, 455],
      [1082, 411],
    ],
    ["#537c4d", "#9a8350"],
  );

  drawLandMass(
    ctx,
    [
      [1259, 488],
      [1338, 466],
      [1409, 506],
      [1381, 574],
      [1297, 587],
      [1241, 542],
    ],
    ["#4a774b", "#8f7848"],
  );

  for (let i = 0; i < 45; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      random() * 1536,
      105 + random() * 560,
      10 + random() * 45,
      4 + random() * 15,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(225, 235, 216, ${0.07 + random() * 0.11})`;
    ctx.fill();
  }

  const iceTop = ctx.createLinearGradient(0, 0, 0, 80);
  iceTop.addColorStop(0, "rgba(240, 248, 255, 0.8)");
  iceTop.addColorStop(1, "rgba(240, 248, 255, 0)");
  ctx.fillStyle = iceTop;
  ctx.fillRect(0, 0, 1536, 95);

  const iceBottom = ctx.createLinearGradient(0, 768, 0, 670);
  iceBottom.addColorStop(0, "rgba(232, 244, 252, 0.75)");
  iceBottom.addColorStop(1, "rgba(232, 244, 252, 0)");
  ctx.fillStyle = iceBottom;
  ctx.fillRect(0, 650, 1536, 118);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function makeCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  const random = makeRandom(391);

  for (let i = 0; i < 110; i += 1) {
    const x = random() * 1536;
    const y = 70 + random() * 615;
    const width = 20 + random() * 110;
    const height = 3 + random() * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((random() - 0.5) * 0.55);
    const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.58);
    cloud.addColorStop(0, `rgba(255, 255, 255, ${0.12 + random() * 0.18})`);
    cloud.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function makeGlowTexture(innerColor, middleColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.28, middleColor);
  gradient.addColorStop(0.62, "rgba(255, 145, 46, 0.09)");
  gradient.addColorStop(1, "rgba(255, 126, 26, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a13);
scene.fog = new THREE.FogExp2(0x050a13, 0.018);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(-1.48, 9.15, 8.8);
camera.lookAt(-1.45, 0.05, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: orbitCanvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const previewRenderer = new THREE.WebGLRenderer({
  canvas: previewCanvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewRenderer.toneMappingExposure = 1.2;
previewRenderer.setClearColor(0x000000, 0);

const moonTexture = makeMoonTexture();
moonTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const earthTexture = makeEarthTexture();
earthTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const cloudTexture = makeCloudTexture();
cloudTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const ambientLight = new THREE.AmbientLight(0x8fa6cf, 0.32);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff4dd, 3.25);
sunLight.position.set(-12, 0, 0);
sunLight.target.position.set(0, 0, 0);
scene.add(sunLight, sunLight.target);

const planetFill = new THREE.DirectionalLight(0x6989c9, 0.36);
planetFill.position.set(5, 6, 4);
scene.add(planetFill);

const starRandom = makeRandom(510);
const starPositions = new Float32Array(650 * 3);
for (let i = 0; i < 650; i += 1) {
  const radius = 13 + starRandom() * 17;
  const theta = starRandom() * Math.PI * 2;
  const y = -7 + starRandom() * 24;
  starPositions[i * 3] = Math.cos(theta) * radius - 1.5;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = Math.sin(theta) * radius;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xb4d0ff,
  size: 0.045,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const sun = new THREE.Group();
sun.position.set(SUN_X, 0.08, 0);
scene.add(sun);

const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc35e }),
);
sun.add(sunSphere);

const sunCore = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS * 0.9, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xffe5a0, transparent: true, opacity: 0.62 }),
);
sun.add(sunCore);

const sunGlowTexture = makeGlowTexture("rgba(255, 246, 210, 0.95)", "rgba(255, 190, 82, 0.42)");
const sunGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: sunGlowTexture,
    color: 0xffbd60,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.92,
  }),
);
sunGlow.scale.set(5.2, 5.2, 1);
sun.add(sunGlow);

const sunTinyGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: sunGlowTexture,
    color: 0xffe4a2,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.5,
  }),
);
sunTinyGlow.scale.set(2.35, 2.35, 1);
sun.add(sunTinyGlow);

const earthGroup = new THREE.Group();
earthGroup.position.set(0, 0, 0);
scene.add(earthGroup);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 64, 48),
  new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.9,
    metalness: 0,
  }),
);
earth.rotation.z = THREE.MathUtils.degToRad(-12);
earth.rotation.y = 1.25;
earthGroup.add(earth);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 48, 32),
  new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.62,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
  }),
);
clouds.rotation.z = earth.rotation.z;
clouds.rotation.y = earth.rotation.y;
earthGroup.add(clouds);

const earthAtmosphereTexture = makeGlowTexture("rgba(93, 182, 255, 0.26)", "rgba(51, 120, 255, 0.2)");
const earthGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: earthAtmosphereTexture,
    color: 0x5e9cff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.5,
  }),
);
earthGlow.scale.set(1.95, 1.95, 1);
earthGroup.add(earthGlow);

const moonMaterial = new THREE.MeshStandardMaterial({
  map: moonTexture,
  color: 0xf2f5fb,
  roughness: 0.98,
  metalness: 0,
  emissive: 0x03060b,
  emissiveIntensity: 1,
});

const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS, 64, 48), moonMaterial);
moon.rotation.set(0.15, -0.7, 0.08);
scene.add(moon);

const orbitPoints = [];
for (let i = 0; i < 180; i += 1) {
  const angle = (i / 180) * Math.PI * 2;
  orbitPoints.push(
    new THREE.Vector3(Math.cos(angle) * ORBIT_RADIUS, 0.005, Math.sin(angle) * ORBIT_RADIUS),
  );
}
const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
const orbitLine = new THREE.LineLoop(
  orbitGeometry,
  new THREE.LineDashedMaterial({
    color: 0x6f86ae,
    transparent: true,
    opacity: 0.42,
    dashSize: 0.11,
    gapSize: 0.095,
  }),
);
orbitLine.computeLineDistances();
scene.add(orbitLine);

const orbitPlane = new THREE.Mesh(
  new THREE.CircleGeometry(ORBIT_RADIUS, 96),
  new THREE.MeshBasicMaterial({
    color: 0x35557c,
    transparent: true,
    opacity: 0.045,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
orbitPlane.rotation.x = -Math.PI / 2;
scene.add(orbitPlane);

const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xa8dcea, transparent: true, opacity: 0.8 });
for (let i = 0; i < 4; i += 1) {
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), markerMaterial);
  const angle = Math.PI - (i / 4) * Math.PI * 2;
  marker.position.set(Math.cos(angle) * ORBIT_RADIUS, 0.01, Math.sin(angle) * ORBIT_RADIUS);
  scene.add(marker);
}

function makeOrbitArrow(day) {
  const angle = Math.PI - ((day % CYCLE_DAYS) / CYCLE_DAYS) * Math.PI * 2;
  const tangent = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)).normalize();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.18, 10),
    new THREE.MeshBasicMaterial({ color: 0x79d9ee, transparent: true, opacity: 0.56 }),
  );
  cone.position.set(Math.cos(angle) * ORBIT_RADIUS, 0.015, Math.sin(angle) * ORBIT_RADIUS);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  scene.add(cone);
}

makeOrbitArrow(3.4);
makeOrbitArrow(10.8);
makeOrbitArrow(18.2);
makeOrbitArrow(25.6);

const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),
  new THREE.Vector3(),
]);
const connectorLine = new THREE.Line(
  connectorGeometry,
  new THREE.LineDashedMaterial({
    color: 0x9fd8e5,
    transparent: true,
    opacity: 0.23,
    dashSize: 0.08,
    gapSize: 0.09,
  }),
);
connectorLine.computeLineDistances();
scene.add(connectorLine);

const sunEarthPoints = [
  new THREE.Vector3(SUN_X + SUN_RADIUS * 0.8, 0, 0),
  new THREE.Vector3(3.55, 0, 0),
];
const sunEarthLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(sunEarthPoints),
  new THREE.LineDashedMaterial({
    color: 0xffc86b,
    transparent: true,
    opacity: 0.12,
    dashSize: 0.16,
    gapSize: 0.22,
  }),
);
sunEarthLine.computeLineDistances();
scene.add(sunEarthLine);

for (const z of [-1.82, 1.82]) {
  const ray = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(SUN_X + SUN_RADIUS * 1.18, 0.02, z),
    2.4,
    0xffc45f,
    0.16,
    0.09,
  );
  ray.line.material.transparent = true;
  ray.line.material.opacity = 0.17;
  ray.cone.material.transparent = true;
  ray.cone.material.opacity = 0.27;
  scene.add(ray);
}

const previewScene = new THREE.Scene();
const previewCamera = new THREE.OrthographicCamera(-0.36, 0.36, 0.36, -0.36, 0.1, 12);
previewCamera.position.set(0, 0, 0);
previewCamera.up.set(0, 1, 0);

const previewMoon = new THREE.Mesh(
  new THREE.SphereGeometry(MOON_RADIUS, 72, 52),
  moonMaterial.clone(),
);
previewMoon.rotation.copy(moon.rotation);
previewScene.add(previewMoon);

const previewAmbient = new THREE.AmbientLight(0x6c82aa, 0.09);
previewScene.add(previewAmbient);

const previewSunLight = new THREE.DirectionalLight(0xfff8e8, 3.4);
previewSunLight.position.set(-10, 0, 0);
previewSunLight.target.position.set(0, 0, 0);
previewScene.add(previewSunLight, previewSunLight.target);

function normalizeDay(value) {
  return Math.min(CYCLE_DAYS, Math.max(0, value));
}

function circularDistance(a, b) {
  const direct = Math.abs(a - b);
  return Math.min(direct, CYCLE_DAYS - direct);
}

function fractionLit(day) {
  const phaseAngle = (day / CYCLE_DAYS) * Math.PI * 2;
  return (1 - Math.cos(phaseAngle)) / 2;
}

function getPhase(day, litFraction) {
  if (circularDistance(day, 0) <= 0.14) return PHASES.new;
  if (circularDistance(day, HALF_DAY) <= 0.14) return PHASES.full;
  if (Math.abs(day - QUARTER_DAY) <= 0.14) return PHASES.firstQuarter;
  if (Math.abs(day - THREE_QUARTER_DAY) <= 0.14) return PHASES.lastQuarter;
  if (day < HALF_DAY) {
    return litFraction < 0.5 ? PHASES.waxingCrescent : PHASES.waxingGibbous;
  }
  return litFraction > 0.5 ? PHASES.waningGibbous : PHASES.waningCrescent;
}

function setDay(value, { announce = true } = {}) {
  currentDay = normalizeDay(value);
  const phaseAngle = (currentDay / CYCLE_DAYS) * Math.PI * 2;
  const orbitAngle = Math.PI - phaseAngle;
  const litFraction = (1 - Math.cos(phaseAngle)) / 2;
  const litPercent = Math.round(litFraction * 100);
  const phase = getPhase(currentDay, litFraction);

  moon.position.set(
    Math.cos(orbitAngle) * ORBIT_RADIUS,
    0,
    Math.sin(orbitAngle) * ORBIT_RADIUS,
  );
  previewMoon.position.copy(moon.position);
  previewCamera.lookAt(previewMoon.position);
  previewCamera.updateMatrixWorld();

  const connectorPositions = connectorGeometry.attributes.position;
  connectorPositions.setXYZ(0, 0, 0, 0);
  connectorPositions.setXYZ(1, moon.position.x, moon.position.y, moon.position.z);
  connectorPositions.needsUpdate = true;
  connectorGeometry.computeBoundingSphere();
  connectorLine.computeLineDistances();

  dayOutput.value = currentDay.toFixed(1);
  dayOutput.textContent = currentDay.toFixed(1);
  daySlider.value = String(currentDay);
  daySlider.setAttribute(
    "aria-valuetext",
    `Day ${currentDay.toFixed(1)} of 29.5, ${phase.name}, ${litPercent}% illuminated`,
  );
  daySlider.style.setProperty("--progress", `${(currentDay / CYCLE_DAYS) * 100}%`);
  illumInline.textContent = String(litPercent);
  illumBadge.textContent = `${litPercent}% lit`;
  illumFill.style.width = `${litPercent}%`;
  phaseNow.textContent = phase.name;
  previewPhase.textContent = phase.name;
  phaseKicker.textContent = `${phase.kicker} · Day ${currentDay.toFixed(1)}`;
  phaseDescription.textContent = phase.description;
  moonDayLabel.textContent = `Day ${currentDay.toFixed(1)}`;

  if (announce) {
    sceneElement.setAttribute(
      "aria-label",
      `Top-down 3D model of the Sun, Earth, and Moon. It is day ${currentDay.toFixed(
        1,
      )} of a 29.5-day cycle. From Earth, the Moon appears ${litPercent}% illuminated as ${phase.name}. Sizes and distances are not to scale.`,
    );
  }

  for (const button of phaseButtons) {
    const targetDay = Number(button.dataset.day);
    const isActive = circularDistance(currentDay, targetDay) <= 0.14;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  previewDirty = true;
  updateLabels();
}

function setPlaying(playing) {
  isPlaying = playing;
  playButton.classList.toggle("is-playing", playing);
  playButton.setAttribute("aria-pressed", String(playing));
  playText.textContent = playing ? "Pause" : "Play";
  playSymbol.textContent = playing ? "Ⅱ" : "▶";
  lastFrameTime = performance.now();
}

function pause() {
  if (isPlaying) setPlaying(false);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function placeLabel(element, x, y) {
  element.style.transform = `translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

function boxFor(element, x, y, padding = 4) {
  const width = element.offsetWidth || 72;
  const height = element.offsetHeight || 28;
  return {
    left: x - width / 2 - padding,
    right: x + width / 2 + padding,
    top: y - height / 2 - padding,
    bottom: y + height / 2 + padding,
  };
}

function boxesOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

const projectedPoint = new THREE.Vector3();
function projectToScene(worldPosition) {
  const rect = sceneElement.getBoundingClientRect();
  projectedPoint.copy(worldPosition).project(camera);
  return {
    x: (projectedPoint.x * 0.5 + 0.5) * rect.width,
    y: (-projectedPoint.y * 0.5 + 0.5) * rect.height,
    width: rect.width,
    height: rect.height,
  };
}

function updateLabels() {
  const sceneRect = sceneElement.getBoundingClientRect();
  if (sceneRect.width === 0 || sceneRect.height === 0) return;

  camera.updateMatrixWorld();
  const sunPoint = projectToScene(sun.position);
  const earthPoint = projectToScene(earthGroup.position);
  const moonPoint = projectToScene(moon.position);
  const small = sceneRect.width < 520;
  const labelMarginX = small ? 43 : 57;
  const labelMarginY = small ? 19 : 23;

  const pixelRadius = (worldPosition, radius) => {
    const distance = camera.position.distanceTo(worldPosition);
    const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return (radius / visibleHeight) * sceneRect.height;
  };
  const sunRadiusPx = pixelRadius(sun.position, SUN_RADIUS);
  const earthRadiusPx = pixelRadius(earthGroup.position, EARTH_RADIUS);
  const moonRadiusPx = pixelRadius(moon.position, MOON_RADIUS);

  const sunLabelX = clamp(sunPoint.x, labelMarginX, sceneRect.width - labelMarginX);
  const sunLabelY = clamp(
    sunPoint.y + sunRadiusPx + sunLabel.offsetHeight / 2 + (small ? 6 : 10),
    labelMarginY,
    sceneRect.height - 20,
  );
  placeLabel(sunLabel, sunLabelX, sunLabelY);
  const sunBox = boxFor(sunLabel, sunLabelX, sunLabelY);

  const earthLabelX = clamp(
    earthPoint.x + earthRadiusPx + earthLabel.offsetWidth / 2 + (small ? 6 : 10),
    labelMarginX,
    sceneRect.width - labelMarginX,
  );
  const earthLabelY = clamp(earthPoint.y + 4, labelMarginY, sceneRect.height - labelMarginY);
  placeLabel(earthLabel, earthLabelX, earthLabelY);
  const earthBox = boxFor(earthLabel, earthLabelX, earthLabelY);

  let awayX = moonPoint.x - earthPoint.x;
  let awayY = moonPoint.y - earthPoint.y;
  const awayLength = Math.hypot(awayX, awayY) || 1;
  awayX /= awayLength;
  awayY /= awayLength;

  const moonGap =
    moonRadiusPx + Math.max(moonLabel.offsetWidth, moonLabel.offsetHeight) * 0.5 + (small ? 6 : 10);
  const candidateOffsets = [
    { x: awayX * moonGap, y: awayY * moonGap },
    { x: 0, y: -moonGap },
    { x: 0, y: moonGap },
    { x: moonGap, y: 0 },
    { x: -moonGap, y: 0 },
    { x: awayX * moonGap * 1.35, y: awayY * moonGap * 1.35 },
  ];

  let bestCandidate = candidateOffsets[0];
  let bestCandidateX = moonPoint.x + bestCandidate.x;
  let bestCandidateY = moonPoint.y + bestCandidate.y;
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (const offset of candidateOffsets) {
    const candidateX = clamp(moonPoint.x + offset.x, labelMarginX, sceneRect.width - labelMarginX);
    const candidateY = clamp(moonPoint.y + offset.y, labelMarginY, sceneRect.height - 39);
    const candidateBox = boxFor(moonLabel, candidateX, candidateY);
    const overlaps = (boxesOverlap(candidateBox, sunBox) ? 1 : 0) + (boxesOverlap(candidateBox, earthBox) ? 1 : 0);
    if (overlaps < bestOverlap) {
      bestOverlap = overlaps;
      bestCandidate = offset;
      bestCandidateX = candidateX;
      bestCandidateY = candidateY;
    }
    if (overlaps === 0) break;
  }

  placeLabel(moonLabel, bestCandidateX, bestCandidateY);
}

function renderPreview() {
  previewRenderer.render(previewScene, previewCamera);
  previewDirty = false;
}

function resizeRenderer() {
  const sceneRect = sceneElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(sceneRect.width));
  const height = Math.max(1, Math.round(sceneRect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const previewRect = previewCanvas.getBoundingClientRect();
  const previewWidth = Math.max(1, Math.round(previewRect.width));
  const previewHeight = Math.max(1, Math.round(previewRect.height));
  previewRenderer.setSize(previewWidth, previewHeight, false);
  const aspect = previewWidth / previewHeight;
  const previewHeightWorld = 0.72;
  const previewWidthWorld = previewHeightWorld * aspect;
  previewCamera.left = -previewWidthWorld / 2;
  previewCamera.right = previewWidthWorld / 2;
  previewCamera.top = previewHeightWorld / 2;
  previewCamera.bottom = -previewHeightWorld / 2;
  previewCamera.updateProjectionMatrix();
  previewDirty = true;
  updateLabels();
}

const sceneResizeObserver = new ResizeObserver(resizeRenderer);
sceneResizeObserver.observe(sceneElement);
const previewResizeObserver = new ResizeObserver(resizeRenderer);
previewResizeObserver.observe(previewCanvas);

function animate(now) {
  const delta = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (isPlaying) {
    let nextDay = currentDay + delta * DAYS_PER_SECOND;
    if (nextDay >= CYCLE_DAYS) nextDay -= CYCLE_DAYS;
    setDay(nextDay, { announce: false });
  }

  if (!reduceMotion) {
    earth.rotation.y += delta * 0.035;
    clouds.rotation.y += delta * 0.045;
  }

  updateLabels();
  renderer.render(scene, camera);
  if (previewDirty) renderPreview();
  requestAnimationFrame(animate);
}

daySlider.addEventListener("input", (event) => {
  pause();
  setDay(Number(event.target.value));
});

for (const button of phaseButtons) {
  button.addEventListener("click", () => {
    pause();
    setDay(Number(button.dataset.day));
  });
}

playButton.addEventListener("click", () => {
  setPlaying(!isPlaying);
});

resetButton.addEventListener("click", () => {
  pause();
  setDay(INITIAL_DAY);
  resetQuiz();
});

reducedMotionQuery.addEventListener("change", (event) => {
  reduceMotion = event.matches;
  if (reduceMotion && isPlaying) setPlaying(false);
});

function renderQuizDots() {
  quizDots.innerHTML = "";
  for (let i = 0; i < QUESTIONS.length; i += 1) {
    const dot = document.createElement("span");
    if (i === quizIndex) dot.classList.add("is-current");
    if (quizResults[i] === true) {
      dot.classList.remove("is-current");
      dot.classList.add("is-correct");
    } else if (quizResults[i] === false) {
      dot.classList.remove("is-current");
      dot.classList.add("is-wrong");
    }
    quizDots.appendChild(dot);
  }
  quizDots.setAttribute(
    "aria-label",
    quizIndex < QUESTIONS.length ? `Question ${quizIndex + 1} of ${QUESTIONS.length}` : "Quiz complete",
  );
}

function renderQuizQuestion() {
  quizAnswered = false;
  quizSelected = null;
  const question = QUESTIONS[quizIndex];
  renderQuizDots();

  quizContent.innerHTML = `
    <p class="quiz-count">Question ${quizIndex + 1} of ${QUESTIONS.length}</p>
    <h3 class="quiz-question" id="currentQuestion" tabindex="-1">${question.question}</h3>
    <div class="quiz-options" role="group" aria-labelledby="currentQuestion">
      ${question.options
        .map(
          (option, index) => `
            <button class="quiz-option" type="button" data-answer="${index}">
              <span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
              <span>${option}</span>
            </button>
          `,
        )
        .join("")}
    </div>
    <div class="quiz-feedback-slot"></div>
    <div class="quiz-actions">
      <span class="quiz-hint">Select an answer to check it.</span>
    </div>
  `;

  for (const option of quizContent.querySelectorAll(".quiz-option")) {
    option.addEventListener("click", () => answerQuestion(Number(option.dataset.answer)));
  }
}

function answerQuestion(answerIndex) {
  if (quizAnswered) return;
  quizAnswered = true;
  quizSelected = answerIndex;

  const question = QUESTIONS[quizIndex];
  const isCorrect = answerIndex === question.correct;
  quizResults[quizIndex] = isCorrect;
  pause();
  setDay(question.day);
  renderQuizDots();

  for (const option of quizContent.querySelectorAll(".quiz-option")) {
    const optionIndex = Number(option.dataset.answer);
    option.disabled = true;
    if (optionIndex === question.correct) option.classList.add("is-correct");
    if (optionIndex === answerIndex && !isCorrect) option.classList.add("is-wrong");
    option.setAttribute("aria-pressed", String(optionIndex === answerIndex));
  }

  const feedbackSlot = quizContent.querySelector(".quiz-feedback-slot");
  feedbackSlot.innerHTML = `
    <div class="quiz-feedback ${isCorrect ? "is-correct" : "is-wrong"}" role="status">
      <strong>${isCorrect ? "Correct!" : "Not quite."}</strong>
      <p>${question.explanation}</p>
    </div>
  `;

  const actions = quizContent.querySelector(".quiz-actions");
  const isLast = quizIndex === QUESTIONS.length - 1;
  actions.innerHTML = `
    <span class="quiz-hint">${isCorrect ? "Nice observation." : "The model shows the key idea."}</span>
    <button class="quiz-next" type="button">${isLast ? "See results" : "Next question"} <span aria-hidden="true">→</span></button>
  `;
  const nextButton = actions.querySelector(".quiz-next");
  nextButton.addEventListener("click", () => {
    quizIndex += 1;
    if (quizIndex >= QUESTIONS.length) {
      renderQuizResults();
    } else {
      renderQuizQuestion();
      requestAnimationFrame(() => quizContent.querySelector(".quiz-question")?.focus());
    }
  });
  requestAnimationFrame(() => nextButton.focus());
}

function renderQuizResults() {
  const score = quizResults.filter(Boolean).length;
  quizIndex = QUESTIONS.length;
  renderQuizDots();
  const title = score === 3 ? "Phases decoded." : score === 2 ? "Good orbit sense." : "One more orbit?";
  const summary =
    score === 3
      ? "You connected the Moon's position, our viewing angle, and the Sunlit half."
      : score === 2
        ? "You are close. Revisit the Earth-view preview, then try the questions again."
        : "Use the model and Earth-view preview together, then retry when you are ready.";

  quizContent.innerHTML = `
    <div class="results">
      <p class="results-kicker">Orbit check complete</p>
      <h3>${title}</h3>
      <div class="results-score">${score}<small>out of ${QUESTIONS.length} correct</small></div>
      <p>${summary}</p>
      <button class="quiz-next" id="retryQuiz" type="button">Retry quiz <span aria-hidden="true">↻</span></button>
    </div>
  `;
  quizContent.querySelector("#retryQuiz").addEventListener("click", () => {
    resetQuiz();
    requestAnimationFrame(() => quizContent.querySelector(".quiz-option")?.focus());
  });
  requestAnimationFrame(() => quizContent.querySelector("#retryQuiz")?.focus());
}

function resetQuiz() {
  quizIndex = 0;
  quizAnswered = false;
  quizSelected = null;
  quizResults.length = 0;
  renderQuizQuestion();
}

setDay(INITIAL_DAY);
resizeRenderer();
renderQuizQuestion();
setPlaying(false);
renderer.render(scene, camera);
renderPreview();
requestAnimationFrame(animate);
