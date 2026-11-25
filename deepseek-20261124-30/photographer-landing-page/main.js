import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { gsap } from "gsap";

gsap.ticker.lagSmoothing(0);

const PROJECTS = [
  {
    title: "The Quiet Coast",
    category: "Personal series",
    location: "Atlantic Coast, Portugal",
    year: "2025",
    image: "assets/coast.jpg",
    alt: "A quiet stretch of Atlantic coastline at dusk",
    deck: "At the edge of the Atlantic, the landscape becomes a study in patience — water, granite and the last minutes of daylight.",
    paragraphs: [
      "There is a particular hour on the Portuguese coast when the wind drops and the ocean seems to hold its breath. The horizon softens. The rocks turn the colour of old silver. For a few minutes, the whole landscape feels less like a place than a room you have wandered into by accident.",
      "I returned to this stretch of coast over four winters, always travelling light: one camera, a 50mm lens and a small notebook. The pictures were made slowly, often on foot before sunrise, following the same paths until the familiar began to reveal its smaller variations.",
      "The series is not an argument about landscape. It is closer to a record of attention — a way of measuring how long it takes to stop looking at a view and begin listening to it."
    ],
    quote: "The coast does not perform. It simply remains.",
    quoteAttribution: "Notes from the western shore",
    indexLabel: "01 — 03",
    bodyIndex: "Atlantic field notes / Winter light / 35mm and medium format"
  },
  {
    title: "Portrait of a Place",
    category: "Editorial commission",
    location: "Marrakech, Morocco",
    year: "2024",
    image: "assets/portrait.jpg",
    alt: "An intimate editorial portrait in warm natural light",
    deck: "A portrait is never only a face. It is weather, memory, and the room a person carries with them.",
    paragraphs: [
      "We met in a courtyard just after the midday heat had broken. The light arrived through a lattice screen, moving across the wall in slow increments. Before I made a single frame, we sat together for an hour and talked about the city, his family, and the house he was rebuilding by hand.",
      "The image came near the end of the afternoon, when the conversation had loosened and the performance of being photographed had fallen away. What remains is not a pose but a pause — the brief interval between one thought and the next.",
      "Commissioned for a special issue on home and belonging, the portrait became part of a larger body of work about interiors that live inside people long after they have left them."
    ],
    quote: "A face is a landscape that has learned how to speak.",
    quoteAttribution: "Marrakech, April 2024",
    indexLabel: "02 — 03",
    bodyIndex: "Editorial portrait / Natural light / 80mm"
  },
  {
    title: "Stillness in Stone",
    category: "Documentary study",
    location: "Kyoto, Japan",
    year: "2023",
    image: "assets/kyoto.jpg",
    alt: "A quiet architectural scene in Kyoto",
    deck: "In Kyoto, architecture is not a backdrop to daily life. It is a participant — patient, exact and quietly alive.",
    paragraphs: [
      "The oldest buildings in Kyoto do not announce themselves. They sit behind low walls and long gardens, allowing the city to pass without interruption. To photograph them is to learn a different pace: one governed by shadow, season and the sound of water.",
      "I spent ten days walking between temples at opening time, before the tour groups arrived. In that early quiet, the architecture became legible in small details — the damp edge of a stone step, the grain of a wooden pillar, a square of light moving across a tatami floor.",
      "These photographs are fragments of that attention. They are not intended as a complete record, but as an invitation to stand still for a moment longer than the world usually permits."
    ],
    quote: "The room was built around the light. Everything else came later.",
    quoteAttribution: "Kyoto, early autumn",
    indexLabel: "03 — 03",
    bodyIndex: "Architecture / Natural light / Medium format"
  }
];

const dom = {
  canvas: document.querySelector("#webgl"),
  loader: document.querySelector("#loader"),
  spinner: document.querySelector("#spinner"),
  header: document.querySelector("#siteHeader"),
  brand: document.querySelector("#brand"),
  contactLink: document.querySelector("#contactLink"),
  hero: document.querySelector("#heroCopy"),
  projectUi: document.querySelector("#projectUi"),
  projectTitle: document.querySelector("#projectTitle"),
  projectMeta: document.querySelector("#projectMeta"),
  projectCounter: document.querySelector("#projectCounter"),
  openStory: document.querySelector("#openStory"),
  progressRail: document.querySelector("#progressRail"),
  railFill: document.querySelector("#railFill"),
  railNumbers: [...document.querySelectorAll(".rail-numbers span")],
  scrollCue: document.querySelector("#scrollCue"),
  contactUi: document.querySelector("#contactUi"),
  projectBackgrounds: document.querySelector("#projectBackgrounds"),
  backgrounds: [...document.querySelectorAll("[data-project-bg]")],
  blog: document.querySelector("#blog"),
  blogBackdrop: document.querySelector("#blogBackdrop"),
  blogScroll: document.querySelector("#blogScroll"),
  blogPhotoWrap: document.querySelector("#blogPhotoWrap"),
  blogPhoto: document.querySelector("#blogPhoto"),
  blogPhotoCaption: document.querySelector("#blogPhotoCaption"),
  blogPhotoIndex: document.querySelector("#blogPhotoIndex"),
  blogCategory: document.querySelector("#blogCategory"),
  blogYear: document.querySelector("#blogYear"),
  blogTitle: document.querySelector("#blogTitle"),
  blogDeck: document.querySelector("#blogDeck"),
  blogBody: document.querySelector("#blogBody"),
  backButton: document.querySelector("#backButton"),
  nextProject: document.querySelector("#nextProject"),
  nextTitle: document.querySelector("#nextTitle")
};

const state = {
  scroll: 0,
  targetScroll: 0,
  intro: 0,
  heroIntro: 0,
  headerIntro: 0,
  cueIntro: 0,
  revealStarted: 0,
  activeProject: -1,
  interactive: false,
  blogOpen: false,
  blogBusy: false,
  blogProject: 0,
  ready: false
};

const projectCenters = [0.285, 0.525, 0.745];
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.08, 80);
const probeCanvas = document.createElement("canvas");
const probeGl = probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
const probeDebugInfo = probeGl ? probeGl.getExtension("WEBGL_debug_renderer_info") : null;
const probeRendererName = probeDebugInfo
  ? probeGl.getParameter(probeDebugInfo.UNMASKED_RENDERER_WEBGL)
  : "";
const softwareRenderer = !probeGl || /swiftshader|llvmpipe|software/i.test(probeRendererName);

function getRenderPixelRatio() {
  if (!softwareRenderer) {
    return Math.min(window.devicePixelRatio, 1.75);
  }
  const targetPixels = window.innerWidth <= 900 ? 350000 : 390000;
  const viewportPixels = window.innerWidth * window.innerHeight;
  return clamp(Math.sqrt(targetPixels / viewportPixels), 0.48, 1.15);
}

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: !softwareRenderer,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(getRenderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = false;

scene.add(new THREE.HemisphereLight(0xfff9eb, 0x68655e, 2.2));

const keyLight = new THREE.DirectionalLight(0xfff2dc, 4.2);
keyLight.position.set(-4.8, 7.2, 5.8);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xc9d8df, 3.1);
rimLight.position.set(4.5, 3.2, -4.5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xffe9ca, 24, 12, 1.8);
fillLight.position.set(0.2, 1.2, 5.5);
scene.add(fillLight);

const lowerLight = new THREE.PointLight(0xb8ccd5, 9, 9, 2);
lowerLight.position.set(-3, -1.2, 3);
scene.add(lowerLight);

const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = 256;
shadowCanvas.height = 256;
const shadowContext = shadowCanvas.getContext("2d");
const shadowGradient = shadowContext.createRadialGradient(128, 128, 8, 128, 128, 118);
shadowGradient.addColorStop(0, "rgba(28, 27, 24, 0.5)");
shadowGradient.addColorStop(0.38, "rgba(28, 27, 24, 0.26)");
shadowGradient.addColorStop(0.72, "rgba(28, 27, 24, 0.06)");
shadowGradient.addColorStop(1, "rgba(28, 27, 24, 0)");
shadowContext.fillStyle = shadowGradient;
shadowContext.fillRect(0, 0, 256, 256);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(6.4, 3.2),
  new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.72 })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = -1.305;
contactShadow.renderOrder = -1;
scene.add(contactShadow);

const modelRig = new THREE.Group();
scene.add(modelRig);

const modelParts = {
  screenMeshes: [],
  screenMaterials: [],
  screenHit: null
};

const heroPose = new THREE.Euler(-0.018, -0.2, 0.012);
const projectPose = new THREE.Euler(0.018, Math.PI + 0.026, -0.008);
const topPose = new THREE.Euler(1.48, 0.035, 0.035);
const projectQuaternion = new THREE.Quaternion().setFromEuler(projectPose);
const topQuaternion = new THREE.Quaternion().setFromEuler(topPose);
const workingQuaternion = new THREE.Quaternion();

const screenWidth = 2.26;
const screenHeight = 1.22;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(min, max, value) {
  const normalized = clamp((value - min) / (max - min), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutExpo(value) {
  return value >= 1 ? 1 : 1 - Math.pow(2, -10 * value);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function makeLeatherTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  context.fillStyle = "#272826";
  context.fillRect(0, 0, 320, 320);

  for (let index = 0; index < 6500; index += 1) {
    const shade = 25 + Math.floor(Math.random() * 35);
    context.fillStyle = `rgba(${shade}, ${shade + 1}, ${shade}, ${0.08 + Math.random() * 0.2})`;
    const size = Math.random() * 1.8 + 0.3;
    context.fillRect(Math.random() * 320, Math.random() * 320, size, size);
  }

  context.strokeStyle = "rgba(0, 0, 0, 0.13)";
  context.lineWidth = 0.6;
  for (let index = 0; index < 90; index += 1) {
    const x = Math.random() * 320;
    const y = Math.random() * 320;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.random() * 16 - 8, y + Math.random() * 12 - 6);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeRidgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "#131412";
  context.fillRect(0, 0, 256, 64);

  for (let x = 0; x < 256; x += 8) {
    const ridge = context.createLinearGradient(x, 0, x + 8, 0);
    ridge.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    ridge.addColorStop(0.45, "rgba(112, 111, 104, 0.26)");
    ridge.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    context.fillStyle = ridge;
    context.fillRect(x, 0, 8, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeLensTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  const base = context.createRadialGradient(320, 320, 24, 320, 320, 318);
  base.addColorStop(0, "#06131e");
  base.addColorStop(0.34, "#0a1823");
  base.addColorStop(0.74, "#04080c");
  base.addColorStop(1, "#000000");
  context.fillStyle = base;
  context.fillRect(0, 0, 640, 640);

  context.strokeStyle = "rgba(113, 155, 178, 0.16)";
  context.lineWidth = 2;
  for (let ring = 0; ring < 6; ring += 1) {
    context.beginPath();
    context.arc(320, 320, 70 + ring * 34, 0, Math.PI * 2);
    context.stroke();
  }

  const coolGlint = context.createRadialGradient(210, 185, 5, 210, 185, 220);
  coolGlint.addColorStop(0, "rgba(220, 246, 255, 0.78)");
  coolGlint.addColorStop(0.13, "rgba(123, 190, 220, 0.33)");
  coolGlint.addColorStop(0.5, "rgba(45, 91, 118, 0.09)");
  coolGlint.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = coolGlint;
  context.fillRect(0, 0, 640, 640);

  const warmGlint = context.createRadialGradient(456, 400, 2, 456, 400, 130);
  warmGlint.addColorStop(0, "rgba(255, 228, 187, 0.54)");
  warmGlint.addColorStop(0.42, "rgba(196, 130, 78, 0.12)");
  warmGlint.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = warmGlint;
  context.fillRect(0, 0, 640, 640);

  context.strokeStyle = "rgba(0, 0, 0, 0.58)";
  context.lineWidth = 14;
  context.beginPath();
  context.arc(320, 320, 286, 0, Math.PI * 2);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeWordmarkTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 540, 96);
  context.fillStyle = "rgba(238, 235, 225, 0.88)";
  context.font = "500 27px Manrope, sans-serif";
  context.textBaseline = "middle";
  context.letterSpacing = "8px";
  context.fillText("JOHN DOE", 40, 50);
  context.fillStyle = "rgba(238, 235, 225, 0.44)";
  context.fillRect(386, 36, 1, 28);
  context.font = "400 12px Manrope, sans-serif";
  context.letterSpacing = "2px";
  context.fillText("STUDIO", 420, 51);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeScreenTexture(image, index) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  context.fillStyle = "#11120f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (image) {
    const imageRatio = image.width / image.height;
    const canvasRatio = canvas.width / canvas.height;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > canvasRatio) {
      sourceWidth = image.height * canvasRatio;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width / canvasRatio;
      sourceY = (image.height - sourceHeight) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
  } else {
    const fallback = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    fallback.addColorStop(0, ["#314348", "#4c4238", "#344239"][index]);
    fallback.addColorStop(1, "#171916");
    context.fillStyle = fallback;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const vignette = context.createRadialGradient(512, 250, 100, 512, 260, 610);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.04)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const lowerShade = context.createLinearGradient(0, 405, 0, 560);
  lowerShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  lowerShade.addColorStop(1, "rgba(0, 0, 0, 0.36)");
  context.fillStyle = lowerShade;
  context.fillRect(0, 390, canvas.width, 170);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function addPart(parent, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildCameraModel(images) {
  const leatherTexture = makeLeatherTexture();
  const leather = new THREE.MeshPhongMaterial({
    color: 0x333430,
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.014,
    specular: 0x4a4a44,
    shininess: 8
  });
  const gripLeather = leather.clone();
  gripLeather.color.setHex(0x252623);
  gripLeather.shininess = 4;

  const silver = new THREE.MeshPhongMaterial({
    color: 0xb9b8b2,
    specular: 0xffffff,
    shininess: 92
  });
  const darkMetal = new THREE.MeshPhongMaterial({
    color: 0x181917,
    specular: 0xadb5b8,
    shininess: 74
  });
  const blackRubber = new THREE.MeshPhongMaterial({
    color: 0x111210,
    specular: 0x42413d,
    shininess: 12
  });
  const focusRidges = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: makeRidgeTexture(),
    specular: 0x6e6d66,
    shininess: 24
  });
  const screenFrame = new THREE.MeshPhongMaterial({
    color: 0x090a09,
    specular: 0x555b5e,
    shininess: 40
  });
  const redAccent = new THREE.MeshPhongMaterial({
    color: 0x9e3529,
    specular: 0xffffff,
    shininess: 54
  });

  const body = addPart(
    modelRig,
    new RoundedBoxGeometry(3.18, 1.86, 1.02, 7, 0.16),
    leather,
    [0, -0.02, 0]
  );
  body.castShadow = true;

  addPart(modelRig, new RoundedBoxGeometry(3.02, 0.27, 1.01, 5, 0.09), silver, [0, 0.98, -0.005]);
  addPart(modelRig, new RoundedBoxGeometry(1.02, 0.18, 0.86, 4, 0.07), darkMetal, [0.12, 1.18, -0.02]);
  addPart(modelRig, new RoundedBoxGeometry(0.86, 0.5, 0.74, 5, 0.1), silver, [0.18, 1.36, -0.09]);
  addPart(modelRig, new RoundedBoxGeometry(0.5, 0.24, 0.04, 3, 0.025), blackRubber, [0.18, 1.36, 0.285]);
  addPart(modelRig, new RoundedBoxGeometry(0.4, 0.07, 0.34, 3, 0.02), darkMetal, [0.18, 1.64, -0.1]);

  const grip = addPart(
    modelRig,
    new RoundedBoxGeometry(0.57, 1.66, 1.13, 7, 0.19),
    gripLeather,
    [1.28, -0.14, 0.12],
    [0.015, 0, -0.065]
  );
  grip.castShadow = true;

  for (let index = 0; index < 3; index += 1) {
    addPart(
      modelRig,
      new RoundedBoxGeometry(0.48, 0.11, 0.05, 3, 0.024),
      blackRubber,
      [1.34, 0.26 - index * 0.29, 0.69],
      [0.11, 0, -0.04]
    );
  }

  addPart(modelRig, new RoundedBoxGeometry(0.5, 0.17, 0.03, 3, 0.015), blackRubber, [-1.3, 0.23, 0.518]);
  addPart(modelRig, new RoundedBoxGeometry(0.34, 0.12, 0.025, 3, 0.01), silver, [-1.3, 0.23, 0.538]);
  addPart(modelRig, new THREE.CircleGeometry(0.026, 24), redAccent, [-1.48, 0.52, 0.521], [0, 0, 0]);

  const wordmarkMaterial = new THREE.MeshBasicMaterial({
    map: makeWordmarkTexture(),
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  addPart(modelRig, new THREE.PlaneGeometry(0.94, 0.168), wordmarkMaterial, [-0.95, 0.57, 0.522]);

  addPart(modelRig, new THREE.CylinderGeometry(0.73, 0.73, 0.17, 48), silver, [0, -0.02, 0.57], [Math.PI / 2, 0, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.655, 0.655, 0.14, 48), blackRubber, [0, -0.02, 0.705], [Math.PI / 2, 0, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.69, 0.69, 0.46, 48), darkMetal, [0, -0.02, 0.92], [Math.PI / 2, 0, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.717, 0.717, 0.19, 48), focusRidges, [0, -0.02, 1.19], [Math.PI / 2, 0, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.675, 0.675, 0.31, 48), darkMetal, [0, -0.02, 1.39], [Math.PI / 2, 0, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.728, 0.728, 0.14, 48), silver, [0, -0.02, 1.575], [Math.PI / 2, 0, 0]);

  const lensGlassMaterial = new THREE.MeshBasicMaterial({
    map: makeLensTexture(),
    toneMapped: false
  });
  addPart(modelRig, new THREE.CircleGeometry(0.607, 64), lensGlassMaterial, [0, -0.02, 1.648]);
  addPart(modelRig, new THREE.TorusGeometry(0.625, 0.038, 10, 64), silver, [0, -0.02, 1.65]);
  addPart(modelRig, new THREE.CircleGeometry(0.032, 20), new THREE.MeshBasicMaterial({ color: 0xf1ece0 }), [0, 0.69, 1.65]);

  addPart(modelRig, new THREE.CylinderGeometry(0.265, 0.265, 0.125, 48), silver, [-1.16, 1.19, -0.04]);
  addPart(modelRig, new THREE.CylinderGeometry(0.195, 0.195, 0.132, 36), darkMetal, [-1.16, 1.255, -0.04]);
  addPart(modelRig, new THREE.CylinderGeometry(0.24, 0.24, 0.115, 48), silver, [1.22, 1.18, 0.23]);
  addPart(modelRig, new THREE.CylinderGeometry(0.18, 0.18, 0.122, 36), blackRubber, [1.22, 1.24, 0.23]);
  addPart(modelRig, new THREE.CylinderGeometry(0.09, 0.09, 0.095, 36), silver, [1.23, 1.2, -0.25]);
  addPart(modelRig, new THREE.TorusGeometry(0.1, 0.012, 8, 36), redAccent, [1.23, 1.245, -0.25], [Math.PI / 2, 0, 0]);

  addPart(modelRig, new THREE.TorusGeometry(0.13, 0.024, 10, 32), silver, [-1.64, 0.56, -0.03], [0, Math.PI / 2, 0]);
  addPart(modelRig, new THREE.TorusGeometry(0.13, 0.024, 10, 32), silver, [1.64, 0.56, -0.03], [0, Math.PI / 2, 0]);
  addPart(modelRig, new THREE.CylinderGeometry(0.12, 0.12, 0.07, 32), darkMetal, [0, -0.965, 0]);

  addPart(
    modelRig,
    new RoundedBoxGeometry(2.78, 1.66, 0.065, 5, 0.07),
    blackRubber,
    [0, 0.04, -0.535]
  );
  addPart(
    modelRig,
    new RoundedBoxGeometry(2.5, 1.42, 0.055, 4, 0.035),
    screenFrame,
    [0, 0.07, -0.574]
  );

  PROJECTS.forEach((project, index) => {
    const texture = makeScreenTexture(images[index], index);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), material);
    screen.position.set(0, 0.07, -0.607 - index * 0.0018);
    screen.rotation.y = Math.PI;
    screen.renderOrder = 3 + index;
    modelRig.add(screen);
    modelParts.screenMeshes.push(screen);
    modelParts.screenMaterials.push(material);
  });

  const screenGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.36, 1.31),
    new THREE.MeshBasicMaterial({
      color: 0xdde9eb,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  screenGlass.position.set(0, 0.07, -0.616);
  screenGlass.rotation.y = Math.PI;
  screenGlass.renderOrder = 8;
  modelRig.add(screenGlass);

  const screenHit = new THREE.Mesh(
    new THREE.PlaneGeometry(2.55, 1.5),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  screenHit.position.set(0, 0.07, -0.623);
  screenHit.rotation.y = Math.PI;
  modelRig.add(screenHit);
  modelParts.screenHit = screenHit;

  addPart(modelRig, new RoundedBoxGeometry(0.23, 0.5, 0.16, 4, 0.04), blackRubber, [1.23, -0.48, -0.52]);
  addPart(modelRig, new RoundedBoxGeometry(0.34, 0.08, 0.03, 3, 0.01), darkMetal, [-0.93, -0.52, -0.574]);
}

function fitDistance(worldWidth) {
  const verticalFov = THREE.MathUtils.degToRad(34);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  return worldWidth / (2 * Math.tan(horizontalFov / 2));
}

function getDistances() {
  const mobile = window.innerWidth <= 900;
  return {
    hero: fitDistance(mobile ? 4.04 : 6.2),
    project: fitDistance(mobile ? 4.02 : 6.4),
    top: fitDistance(mobile ? 4.76 : 9.8)
  };
}

function updateCameraMotion(time, progress) {
  const mobile = window.innerWidth <= 900;
  const turn = smoothstep(0.055, 0.185, progress);
  const top = smoothstep(0.79, 0.915, progress);
  const topEase = easeInOutCubic(top);
  const distances = getDistances();
  let targetDistance = lerp(distances.hero, distances.project, turn);
  targetDistance = lerp(targetDistance, distances.top, topEase);

  const introEase = easeInOutCubic(state.intro);
  const distance = lerp(1.84, targetDistance, introEase);
  const float = Math.sin(time * 0.7) * 0.014 * (1 - turn) * (1 - top) * state.intro;

  if (top > 0) {
    workingQuaternion.slerpQuaternions(projectQuaternion, topQuaternion, topEase);
    modelRig.quaternion.copy(workingQuaternion);
  } else {
    modelRig.rotation.set(
      lerp(heroPose.x, projectPose.x, turn),
      lerp(heroPose.y, projectPose.y, turn),
      lerp(heroPose.z, projectPose.z, turn)
    );
  }

  modelRig.position.x = 0;
  modelRig.position.y = 0.13 + turn * 0.015 + topEase * (mobile ? 0.45 : 0.92) + float;
  modelRig.position.z = 0;

  const nextFov = lerp(43, 34, introEase);
  if (Math.abs(camera.fov - nextFov) > 0.001) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }

  camera.position.set(0, 0.15 + topEase * 0.22 + Math.sin(time * 0.55) * 0.004, distance);
  camera.lookAt(0, 0.07 + topEase * 0.2, 0);
}

function getProjectWeights(progress) {
  const first = smoothstep(0.105, 0.185, progress) * (1 - smoothstep(0.35, 0.445, progress));
  const second = smoothstep(0.35, 0.445, progress) * (1 - smoothstep(0.57, 0.66, progress));
  const third = smoothstep(0.57, 0.66, progress) * (1 - smoothstep(0.81, 0.9, progress));
  return [first, second, third];
}

function updateInterface(progress, weights) {
  const projectVisibility = Math.max(...weights);
  const contactVisibility = smoothstep(0.855, 0.94, progress);
  const heroVisibility = state.heroIntro * (1 - smoothstep(0.015, 0.085, progress));
  const projectUiVisibility = smoothstep(0.105, 0.175, progress) * (1 - smoothstep(0.79, 0.865, progress));
  const cueVisibility = state.cueIntro * (1 - smoothstep(0.015, 0.09, progress));

  dom.hero.style.opacity = heroVisibility.toFixed(3);
  dom.header.style.opacity = state.headerIntro.toFixed(3);
  dom.scrollCue.style.opacity = cueVisibility.toFixed(3);
  dom.projectUi.style.opacity = projectUiVisibility.toFixed(3);
  dom.progressRail.style.opacity = (projectVisibility * 0.92).toFixed(3);
  dom.contactUi.style.opacity = contactVisibility.toFixed(3);
  dom.contactUi.style.transform = `translateY(${(1 - contactVisibility) * 24}px)`;
  dom.projectBackgrounds.style.opacity = projectVisibility.toFixed(3);
  dom.railFill.style.height = `${clamp((progress - 0.17) / 0.64, 0, 1) * 100}%`;

  state.interactive = projectVisibility > 0.32 && progress < 0.86 && !state.blogOpen;
  dom.openStory.style.pointerEvents = state.interactive ? "auto" : "none";
  dom.backButton.style.pointerEvents = state.blogOpen ? "auto" : "none";

  weights.forEach((weight, index) => {
    dom.backgrounds[index].style.opacity = weight.toFixed(3);
    modelParts.screenMaterials[index].opacity = weight;
  });

  document.body.classList.toggle("project-mode", progress > 0.075 && progress < 0.86);
}

function setProjectCard(index, immediate = false) {
  if (index === state.activeProject) {
    return;
  }

  const project = PROJECTS[index];
  const direction = state.activeProject < 0 || index > state.activeProject ? 1 : -1;
  state.activeProject = index;
  dom.railNumbers.forEach((number, numberIndex) => {
    number.classList.toggle("is-active", numberIndex === index);
  });
  dom.nextTitle.textContent = PROJECTS[(index + 1) % PROJECTS.length].title;

  const updateText = () => {
    dom.projectTitle.textContent = project.title;
    dom.projectMeta.innerHTML = `${project.location} <span>—</span> ${project.year}`;
    dom.projectCounter.innerHTML = `${String(index + 1).padStart(2, "0")} <i>/</i> 03`;
  };

  if (immediate) {
    updateText();
    return;
  }

  gsap.killTweensOf([dom.projectTitle, dom.projectMeta, dom.projectCounter]);
  const timeline = gsap.timeline();
  timeline
    .to([dom.projectTitle, dom.projectMeta], {
      y: -14 * direction,
      opacity: 0,
      duration: 0.22,
      ease: "power2.in"
    })
    .add(updateText)
    .fromTo(
      dom.projectTitle,
      { y: 22 * direction, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.62, ease: "expo.out" }
    )
    .fromTo(
      dom.projectMeta,
      { y: 8 * direction, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.48, ease: "power2.out" },
      "-=0.42"
    )
    .fromTo(
      dom.projectCounter,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power1.out" },
      "-=0.34"
    );
}

function tick() {
  const delta = Math.min(clock.getDelta(), 0.2);
  const damping = 1 - Math.exp(-6.8 * delta);
  if (state.ready) {
    const revealElapsed = Math.max(0, (performance.now() - state.revealStarted) / 1000);
    state.intro = easeOutExpo(clamp(revealElapsed / 1.72, 0, 1));
    const textReveal = easeOutCubic(clamp((revealElapsed - 0.56) / 0.78, 0, 1));
    state.heroIntro = textReveal;
    state.headerIntro = textReveal * 0.94;
    state.cueIntro = textReveal * 0.72;
  }
  state.scroll += (state.targetScroll - state.scroll) * damping;
  if (Math.abs(state.targetScroll - state.scroll) < 0.00002) {
    state.scroll = state.targetScroll;
  }

  const progress = clamp(state.scroll, 0, 1);
  const weights = getProjectWeights(progress);
  const projectIndex = progress < 0.3975 ? 0 : progress < 0.615 ? 1 : 2;

  if (projectIndex !== state.activeProject) {
    setProjectCard(projectIndex);
  }

  updateCameraMotion(clock.elapsedTime, progress);
  updateInterface(progress, weights);
  renderer.render(scene, camera);
}

function updateScrollTarget() {
  const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  state.targetScroll = clamp(window.scrollY / maximum, 0, 1);
}

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.setSize(width, height);
  updateScrollTarget();
}

function getScreenRect() {
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const screen = modelParts.screenMeshes[0];
  const corners = [
    new THREE.Vector3(-screenWidth / 2, screenHeight / 2, 0),
    new THREE.Vector3(screenWidth / 2, screenHeight / 2, 0),
    new THREE.Vector3(screenWidth / 2, -screenHeight / 2, 0),
    new THREE.Vector3(-screenWidth / 2, -screenHeight / 2, 0)
  ].map((corner) => {
    const world = screen.localToWorld(corner);
    const projected = world.project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight
    };
  });

  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  const top = Math.min(...corners.map((corner) => corner.y));
  const bottom = Math.max(...corners.map((corner) => corner.y));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

function setBlogContent(index) {
  const project = PROJECTS[index];
  dom.blogPhoto.src = project.image;
  dom.blogPhoto.alt = project.alt;
  dom.blogPhotoCaption.textContent = project.location;
  dom.blogPhotoIndex.textContent = project.indexLabel;
  dom.blogCategory.textContent = project.category;
  dom.blogYear.textContent = project.year;
  dom.blogTitle.textContent = project.title;
  dom.blogDeck.textContent = project.deck;
  dom.blogBody.innerHTML = `
    <p>${project.paragraphs[0]}</p>
    <div class="body-index"><span>${project.bodyIndex.split(" / ")[0]}</span><span>John Doe</span></div>
    <p>${project.paragraphs[1]}</p>
    <blockquote>“${project.quote}”</blockquote>
    <p>${project.paragraphs[2]}</p>
    <div class="body-index"><span>${project.location}</span><span>${project.year}</span></div>
  `;
  dom.nextTitle.textContent = PROJECTS[(index + 1) % PROJECTS.length].title;
}

function scrollToProject(index) {
  const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = projectCenters[index];
  window.scrollTo(0, maximum * progress);
  state.targetScroll = progress;
  state.scroll = progress;
}

function openBlog(index) {
  if (state.blogOpen || state.blogBusy) {
    return;
  }

  state.blogOpen = true;
  state.blogBusy = true;
  state.blogProject = index;
  document.documentElement.classList.add("blog-open");
  setBlogContent(index);
  dom.blog.classList.add("is-open");
  dom.blog.setAttribute("aria-hidden", "false");
  dom.blogScroll.scrollTop = 0;
  gsap.set(dom.blog, { opacity: 1 });
  gsap.set(dom.blogBackdrop, { opacity: 0 });
  gsap.set(dom.blogPhotoWrap, { clearProps: "transform", opacity: 1 });
  gsap.set(dom.backButton, { opacity: 0, y: -12 });
  gsap.set(dom.blog.querySelector(".blog-article"), { opacity: 0, y: 34 });

  const source = getScreenRect();
  const target = dom.blogPhotoWrap.getBoundingClientRect();
  const scaleX = source.width / target.width;
  const scaleY = source.height / target.height;
  const translateX = source.left - target.left;
  const translateY = source.top - target.top;

  gsap.set(dom.blogPhotoWrap, {
    transformOrigin: "0 0",
    transformPerspective: 1200,
    x: translateX,
    y: translateY,
    scaleX,
    scaleY
  });

  gsap.timeline({
    onComplete: () => {
      state.blogBusy = false;
    }
  })
    .to(dom.blogBackdrop, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0)
    .to(
      dom.blogPhotoWrap,
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.16, ease: "power4.inOut" },
      0
    )
    .to(
      dom.blog.querySelector(".blog-article"),
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      0.72
    )
    .to(dom.backButton, { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" }, 0.88);
}

function closeBlog() {
  if (!state.blogOpen || state.blogBusy) {
    return;
  }

  state.blogBusy = true;
  gsap.killTweensOf([
    dom.blogBackdrop,
    dom.blogPhotoWrap,
    dom.blog.querySelector(".blog-article"),
    dom.backButton
  ]);
  dom.blogScroll.scrollTop = 0;
  const source = getScreenRect();
  const target = dom.blogPhotoWrap.getBoundingClientRect();
  const scaleX = source.width / target.width;
  const scaleY = source.height / target.height;
  const translateX = source.left - target.left;
  const translateY = source.top - target.top;

  gsap.timeline({
    onComplete: () => {
      dom.blog.classList.remove("is-open");
      dom.blog.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("blog-open");
      gsap.set(dom.blog, { opacity: 0 });
      gsap.set(dom.blogPhotoWrap, { clearProps: "transform" });
      gsap.set(dom.backButton, { opacity: 0 });
      state.blogOpen = false;
      state.blogBusy = false;
    }
  })
    .to(dom.blog.querySelector(".blog-article"), { opacity: 0, y: 24, duration: 0.3, ease: "power1.in" }, 0)
    .to(dom.backButton, { opacity: 0, duration: 0.2 }, 0)
    .to(dom.blogPhotoWrap, { rotationX: -7, duration: 0.34, ease: "power2.in" }, 0.08)
    .to(
      dom.blogPhotoWrap,
      {
        x: translateX,
        y: translateY,
        scaleX,
        scaleY,
        rotationX: 0,
        duration: 0.94,
        ease: "power4.inOut"
      },
      0.12
    )
    .to(dom.blogBackdrop, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 0.46)
    .to(dom.blog, { opacity: 0, duration: 0.32, ease: "power1.inOut" }, 0.92);
}

function switchBlogProject() {
  if (!state.blogOpen || state.blogBusy) {
    return;
  }

  const nextIndex = (state.blogProject + 1) % PROJECTS.length;
  scrollToProject(nextIndex);
  gsap.timeline({
    onComplete: () => {
      state.blogBusy = false;
    }
  })
    .to([dom.blogPhotoWrap, dom.blog.querySelector(".blog-article")], { opacity: 0, duration: 0.3, ease: "power1.in" }, 0)
    .add(() => {
      state.blogProject = nextIndex;
      setBlogContent(nextIndex);
      dom.blogScroll.scrollTop = 0;
    })
    .to([dom.blogPhotoWrap, dom.blog.querySelector(".blog-article")], { opacity: 1, duration: 0.65, ease: "power2.out" }, 0.34);
  state.blogBusy = true;
}

function handleCanvasClick(event) {
  if (!state.interactive || state.blogOpen) {
    return;
  }

  const bounds = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(modelParts.screenHit, false);

  if (intersections.length > 0) {
    openBlog(state.activeProject);
  }
}

function handlePointerMove(event) {
  if (!state.interactive || state.blogOpen) {
    dom.canvas.style.cursor = "default";
    return;
  }

  const bounds = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  dom.canvas.style.cursor = raycaster.intersectObject(modelParts.screenHit, false).length > 0 ? "pointer" : "default";
}

function startReveal() {
  state.ready = true;
  state.revealStarted = performance.now();
  dom.loader.classList.add("is-exiting");
  window.setTimeout(() => {
    dom.loader.style.display = "none";
  }, 1300);
}

async function initialise() {
  const minimumLoad = delay(360);
  const images = await Promise.all(PROJECTS.map((project) => loadImage(project.image)));
  await Promise.race([document.fonts.ready, delay(620)]);
  await minimumLoad;

  buildCameraModel(images);
  setProjectCard(0, true);
  updateScrollTarget();
  state.scroll = state.targetScroll;

  window.addEventListener("scroll", updateScrollTarget, { passive: true });
  window.addEventListener("resize", handleResize);
  dom.canvas.addEventListener("click", handleCanvasClick);
  dom.canvas.addEventListener("pointermove", handlePointerMove);
  dom.openStory.addEventListener("click", () => openBlog(state.activeProject));
  dom.backButton.addEventListener("click", closeBlog);
  dom.nextProject.addEventListener("click", switchBlogProject);

  dom.brand.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  dom.contactLink.addEventListener("click", () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });

  renderer.setAnimationLoop(tick);
  startReveal();
}

initialise();
