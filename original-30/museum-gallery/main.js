import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const container = document.querySelector('#scene');
const hotspotsEl = document.querySelector('#hotspots');
const navEl = document.querySelector('#collectionNav');
const panel = document.querySelector('#artifactPanel');
const panelNumber = document.querySelector('#artifactNumber');
const panelKicker = document.querySelector('#artifactKicker');
const panelTitle = document.querySelector('#artifactTitle');
const panelMeta = document.querySelector('#artifactMeta');
const panelDescription = document.querySelector('#artifactDescription');
const panelAction = document.querySelector('#panelAction');
const homeButton = document.querySelector('#homeButton');

const artifacts = [
  {
    key: 'armillary',
    short: 'Armillary',
    kicker: 'Celestial instrument',
    title: ['The Armillary', 'of Alexandria'],
    meta: ['c. 150 BCE', 'Alexandria, Egypt'],
    description: 'A nested model of the heavens, its gilded rings once traced the passage of sun and stars across a vanished sky.',
    label: 'Alexandria',
  },
  {
    key: 'amphora',
    short: 'Amphora',
    kicker: 'Attic vessel',
    title: ['The Amphora', 'of Attica'],
    meta: ['c. 520 BCE', 'Athens, Greece'],
    description: 'Painted to accompany a symposium, this vessel carries the olive harvest and a procession of horsemen around its shoulder.',
    label: 'Attica',
  },
  {
    key: 'astrolabe',
    short: 'Astrolabe',
    kicker: 'Navigator’s instrument',
    title: ['The Astrolabe', 'of Baghdad'],
    meta: ['c. 980 CE', 'Baghdad, Abbasid Caliphate'],
    description: 'An instrument of navigation and prayer, engraved with a horizon for every city its maker knew.',
    label: 'Baghdad',
  },
  {
    key: 'mask',
    short: 'Mask',
    kicker: 'Funerary object',
    title: ['The Golden Mask', 'of Mycenae'],
    meta: ['c. 1300 BCE', 'Mycenae, Greece'],
    description: 'A face for eternity, pressed from a single sheet of gold and laid over a ruler of the Bronze Age.',
    label: 'Mycenae',
  },
  {
    key: 'scarab',
    short: 'Scarab',
    kicker: 'Solar amulet',
    title: ['The Winged Scarab', 'of Karnak'],
    meta: ['c. 660 BCE', 'Karnak, Egypt'],
    description: 'A solar emblem of rebirth, its wings spread to carry the morning sun over the threshold of the underworld.',
    label: 'Karnak',
  },
  {
    key: 'tablet',
    short: 'Tablet',
    kicker: 'Administrative record',
    title: ['The Tablet', 'of Ur'],
    meta: ['c. 2000 BCE', 'Ur, Mesopotamia'],
    description: 'A ledger of grain, cattle and labor, written in wedge-shaped marks when writing itself was still young.',
    label: 'Ur',
  },
];

const isMobile = () => window.innerWidth <= 700;
const renderer = new THREE.WebGLRenderer({
  antialias: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.setClearColor(0x06070a, 1);
container.appendChild(renderer.domElement);

const gl = renderer.getContext();
const rendererInfoExtension = gl.getExtension('WEBGL_debug_renderer_info');
const rendererName = rendererInfoExtension
  ? gl.getParameter(rendererInfoExtension.UNMASKED_RENDERER_WEBGL)
  : '';
const isSoftwareRenderer = /swiftshader|llvmpipe|software|softpipe|mesa offscreen/i.test(rendererName);
const usePostProcessing = !isSoftwareRenderer;
if (isSoftwareRenderer) {
  renderer.setPixelRatio(window.innerWidth <= 700 ? 0.82 : 0.8);
  renderer.toneMappingExposure = 1.14;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
scene.fog = new THREE.FogExp2(0x08080b, 0.022);

const camera = new THREE.PerspectiveCamera(
  isMobile() ? 56 : 41,
  window.innerWidth / window.innerHeight,
  0.1,
  80,
);
camera.position.set(0, 4.8, 12.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.05, -0.2);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 2.8;
controls.maxDistance = 20;
controls.minPolarAngle = 0.48;
controls.maxPolarAngle = Math.PI * 0.48;
controls.rotateSpeed = 0.48;
controls.zoomSpeed = 0.62;
controls.update();

let composer = null;
let bloom = null;
if (usePostProcessing) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment(renderer);
  const envTexture = pmrem.fromScene(environment, 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile() ? 0.32 : 0.44,
    0.78,
    0.79,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

const clock = new THREE.Clock();
const pointer = new THREE.Vector2(2, 2);
const raycaster = new THREE.Raycaster();
const pickables = [];
const hotspotButtons = [];
const selectionRings = [];
const auraSprites = [];
let liteSelectionRing = null;
let selectedIndex = 0;
let isHomeView = true;
let pointerDown = null;
let cameraTween = null;
let sceneReady = false;

const goldMaterial = new THREE.MeshStandardMaterial({
  color: 0xc49a55,
  metalness: 1,
  roughness: 0.24,
  envMapIntensity: 1.15,
});
const paleGoldMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0bd7d,
  metalness: 0.92,
  roughness: 0.21,
  envMapIntensity: 1.1,
});
const bronzeMaterial = new THREE.MeshStandardMaterial({
  color: 0x6f4727,
  metalness: 0.9,
  roughness: 0.4,
  envMapIntensity: 0.85,
});
const darkBronzeMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b2a1d,
  metalness: 0.8,
  roughness: 0.46,
  envMapIntensity: 0.75,
});
const basaltMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  metalness: 0.28,
  roughness: 0.31,
  envMapIntensity: 0.7,
});
const blackStoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x0e0f12,
  metalness: 0.12,
  roughness: 0.7,
  envMapIntensity: 0.45,
});
const lapisMaterial = new THREE.MeshStandardMaterial({
  color: 0x173b70,
  metalness: 0.6,
  roughness: 0.28,
  envMapIntensity: 0.8,
});
const carnelianMaterial = new THREE.MeshStandardMaterial({
  color: 0x8f2f1f,
  metalness: 0.3,
  roughness: 0.3,
  envMapIntensity: 0.7,
});
const emissiveGoldMaterial = new THREE.MeshStandardMaterial({
  color: 0xc49a55,
  emissive: 0x6f4415,
  emissiveIntensity: 0.32,
  metalness: 0.9,
  roughness: 0.3,
  envMapIntensity: 0.8,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeCanvasTexture(width, height, draw, options = {}) {
  const canvas = document.createElement('canvas');
  const resolutionScale = isSoftwareRenderer ? 0.2 : 1;
  canvas.width = Math.max(2, Math.round(width * resolutionScale));
  canvas.height = Math.max(2, Math.round(height * resolutionScale));
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = options.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = options.wrapT ?? THREE.ClampToEdgeWrapping;
  if (isSoftwareRenderer) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 1;
  } else {
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1]);
  texture.needsUpdate = true;
  return texture;
}

function speckle(ctx, width, height, amount, darkness = 0.16) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + n, 0, 255);
    data[i + 1] = clamp(data[i + 1] + n * 0.92, 0, 255);
    data[i + 2] = clamp(data[i + 2] + n * 0.8, 0, 255);
    if (Math.random() < darkness) {
      data[i] *= 0.94;
      data[i + 1] *= 0.94;
      data[i + 2] *= 0.94;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function makeMarbleTexture() {
  return makeCanvasTexture(768, 768, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#17181d');
    grad.addColorStop(0.42, '#222228');
    grad.addColorStop(0.7, '#121318');
    grad.addColorStop(1, '#1c1b20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 13, 0.07);
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + (Math.random() - 0.5) * 190,
        y + Math.random() * 110,
        x + (Math.random() - 0.5) * 280,
        y + Math.random() * 220,
        x + (Math.random() - 0.5) * 380,
        y + (Math.random() - 0.5) * 300,
      );
      ctx.strokeStyle = `rgba(226, 215, 194, ${0.018 + Math.random() * 0.065})`;
      ctx.lineWidth = 0.45 + Math.random() * 1.4;
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w;
      ctx.fillStyle = `rgba(255, 240, 212, ${0.012 + Math.random() * 0.022})`;
      ctx.fillRect(x, 0, 1 + Math.random() * 3, h);
    }
  }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: [3.2, 3.2] });
}

function makeWallTexture() {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#13141a');
    grad.addColorStop(0.5, '#1b1b20');
    grad.addColorStop(1, '#0d0e13');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 10, 0.12);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(199, 184, 158, ${0.018 + Math.random() * 0.028})`;
      ctx.lineWidth = 0.7 + Math.random();
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.28, y + 18, w * 0.65, y - 28, w, y + 8);
      ctx.stroke();
    }
  }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, repeat: [3, 1.5] });
}

function makeVesselTexture() {
  return makeCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9b5a39';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 14, 0.08);

    ctx.fillStyle = '#18120f';
    ctx.fillRect(0, 0, w, 48);
    ctx.fillRect(0, 438, w, 74);
    ctx.fillRect(0, 392, w, 13);

    ctx.fillStyle = '#c78254';
    ctx.fillRect(0, 49, w, 4);
    ctx.fillRect(0, 423, w, 3);
    ctx.fillRect(0, 388, w, 2);

    ctx.fillStyle = '#17120f';
    ctx.fillRect(0, 86, w, 62);
    ctx.strokeStyle = '#c98b5f';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 92, w, 50);

    ctx.strokeStyle = '#d39a68';
    ctx.lineWidth = 3;
    for (let x = -20; x < w + 20; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 129);
      ctx.lineTo(x + 15, 105);
      ctx.lineTo(x + 30, 129);
      ctx.lineTo(x + 45, 105);
      ctx.lineTo(x + 60, 129);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(21, 15, 12, 0.9)';
    ctx.fillRect(0, 176, w, 186);
    ctx.strokeStyle = '#c18154';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 181, w - 16, 177);

    ctx.strokeStyle = 'rgba(217, 166, 112, 0.92)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let cluster = 0; cluster < 4; cluster++) {
      const cx = 150 + cluster * 252;
      for (let leaf = 0; leaf < 5; leaf++) {
        const lx = cx + leaf * 19;
        const ly = 226 + Math.sin(leaf * 1.2 + cluster) * 15;
        ctx.beginPath();
        ctx.moveTo(lx - 8, ly);
        ctx.quadraticCurveTo(lx + 2, ly - 14, lx + 12, ly);
        ctx.quadraticCurveTo(lx + 2, ly + 14, lx - 8, ly);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, ly + 1);
        ctx.lineTo(lx + 6, ly + 7);
        ctx.stroke();
      }
    }

    function horse(x, y, flip = false) {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#d29c71';
      ctx.strokeStyle = '#d29c71';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 0, 45, 22, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(32, -12);
      ctx.quadraticCurveTo(50, -52, 34, -63);
      ctx.quadraticCurveTo(24, -68, 20, -51);
      ctx.lineTo(26, -23);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, 15);
      ctx.lineTo(4, 66);
      ctx.moveTo(30, 15);
      ctx.lineTo(38, 66);
      ctx.moveTo(-19, 16);
      ctx.lineTo(-26, 61);
      ctx.moveTo(-35, 14);
      ctx.lineTo(-46, 55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-42, -7);
      ctx.quadraticCurveTo(-69, -18, -73, 12);
      ctx.stroke();
      ctx.fillStyle = '#17120f';
      ctx.beginPath();
      ctx.arc(36, -54, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    horse(205, 302);
    horse(476, 301, true);
    horse(752, 303);

    ctx.fillStyle = '#c18154';
    for (let x = 0; x < w; x += 42) {
      ctx.save();
      ctx.translate(x, 374);
      ctx.rotate(-0.5);
      ctx.fillRect(0, 0, 28, 3);
      ctx.restore();
    }

    for (let band = 0; band < 3; band++) {
      ctx.strokeStyle = `rgba(226, 178, 125, ${0.17 - band * 0.03})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = 62 + band * 9 + Math.sin(x * 0.055 + band) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, { wrapS: THREE.RepeatWrapping });
}

function makeCuneiformTexture() {
  return makeCanvasTexture(640, 820, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#b69b76');
    grad.addColorStop(0.5, '#a88d69');
    grad.addColorStop(1, '#c2a57d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 20, 0.1);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(88, 67, 43, ${0.03 + Math.random() * 0.045})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }

    function wedge(x, y, size, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(71, 54, 36, 0.72)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.52, -size * 0.16);
      ctx.lineTo(size * 0.58, 0);
      ctx.lineTo(-size * 0.52, size * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let row = 0; row < 13; row++) {
      const y = 80 + row * 51;
      let x = 55 + (row % 3) * 21;
      const count = 5 + Math.floor(Math.random() * 4);
      for (let n = 0; n < count; n++) {
        const step = 28 + Math.random() * 24;
        wedge(x, y + (Math.random() - 0.5) * 7, 17 + Math.random() * 8, -0.22 + Math.random() * 0.44);
        if (Math.random() > 0.45) {
          wedge(x + 9, y + 8, 11 + Math.random() * 5, 1.55 + Math.random() * 0.3);
        }
        x += step;
      }
      ctx.strokeStyle = 'rgba(77, 58, 38, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(35, y + 25);
      ctx.lineTo(w - 35, y + 25 + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(83, 60, 37, 0.42)';
    ctx.lineWidth = 5;
    ctx.strokeRect(23, 23, w - 46, h - 46);
    ctx.strokeStyle = 'rgba(219, 189, 145, 0.26)';
    ctx.lineWidth = 2;
    ctx.strokeRect(33, 33, w - 66, h - 66);

    ctx.fillStyle = 'rgba(110, 35, 24, 0.34)';
    ctx.beginPath();
    ctx.arc(96, 706, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 25, 17, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(96, 706, 31, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function makeAstrolabeTexture() {
  return makeCanvasTexture(640, 640, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx - 80, cy - 100, 20, cx, cy, 320);
    grad.addColorStop(0, '#d0ac6d');
    grad.addColorStop(0.48, '#9d7239');
    grad.addColorStop(0.83, '#765125');
    grad.addColorStop(1, '#493118');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 12, 0.05);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(47, 30, 13, 0.72)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const inner = i % 6 === 0 ? 257 : 270;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * 290, Math.sin(angle) * 290);
      ctx.stroke();
    }

    [78, 112, 154, 206, 248, 286].forEach((radius, index) => {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = index === 5 ? 'rgba(239, 206, 147, 0.72)' : 'rgba(53, 35, 15, 0.68)';
      ctx.lineWidth = index === 5 ? 4 : 2;
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(239, 206, 147, 0.62)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 72, Math.sin(a) * 72);
      ctx.lineTo(Math.cos(a) * 245, Math.sin(a) * 245);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(55, 36, 16, 0.68)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 205, 0.18, Math.PI * 1.62);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(242, 212, 154, 0.7)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 34; i++) {
      const a = i * 2.11;
      const r = 88 + ((i * 47) % 148);
      const s = 2.5 + (i % 4);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(246, 218, 165, 0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(240, 207, 148, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 295;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 7, 0, Math.PI * 2);
      ctx.moveTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
      ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(61, 40, 19, 0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 11; i++) {
      const a = 0.28 + i * 0.19;
      const r = 300;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}

let marbleTexture;
let wallTexture;
let vesselTexture;
let cuneiformTexture;
let astrolabeTexture;
let vesselMaterial;
let clayMaterial;
let astrolabeFaceMaterial;

function prepareFullMaterials() {
  marbleTexture = makeMarbleTexture();
  wallTexture = makeWallTexture();
  vesselTexture = makeVesselTexture();
  cuneiformTexture = makeCuneiformTexture();
  astrolabeTexture = makeAstrolabeTexture();

  vesselMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: vesselTexture,
    metalness: 0.06,
    roughness: 0.42,
    envMapIntensity: 0.55,
  });

  clayMaterial = new THREE.MeshStandardMaterial({
    color: 0xb2956f,
    map: cuneiformTexture,
    metalness: 0.04,
    roughness: 0.72,
    envMapIntensity: 0.45,
  });

  astrolabeFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: astrolabeTexture,
    metalness: 0.84,
    roughness: 0.31,
    envMapIntensity: 0.95,
  });
}

const glowTexture = makeCanvasTexture(128, 128, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.16, 'rgba(255,239,202,0.92)');
  grad.addColorStop(0.42, 'rgba(224,173,93,0.34)');
  grad.addColorStop(1, 'rgba(224,173,93,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});

const shadowTexture = makeCanvasTexture(128, 128, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.36)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
});

function addSprite(x, y, z, scale, opacity, color = 0xf0c87e) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
  return sprite;
}

function createArchitecture() {
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdedbd2,
    map: marbleTexture,
    metalness: 0.36,
    roughness: 0.23,
    clearcoat: 0.48,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.72,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 96), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.035;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x737076,
    map: wallTexture,
    metalness: 0.12,
    roughness: 0.83,
    side: THREE.BackSide,
    envMapIntensity: 0.26,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(18.2, 18.2, 15, 96, 1, true), wallMaterial);
  wall.position.y = 7.45;
  scene.add(wall);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 96),
    new THREE.MeshBasicMaterial({
      color: 0x5f4930,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.002;
  scene.add(floorGlow);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x9e7a43,
    metalness: 0.9,
    roughness: 0.33,
    emissive: 0x2a1a08,
    emissiveIntensity: 0.3,
    envMapIntensity: 0.8,
  });

  [3.25, 7.15, 11.8, 16.1].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - (index === 0 ? 0.045 : 0.025), radius + 0.035, 128),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);
  });

  const inlayMaterial = new THREE.LineBasicMaterial({
    color: 0xc7a466,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  const linePositions = [];
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const inner = 7.15;
    const outer = 16.05;
    linePositions.push(
      Math.cos(angle) * inner, 0.008, Math.sin(angle) * inner,
      Math.cos(angle) * outer, 0.008, Math.sin(angle) * outer,
    );
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  scene.add(new THREE.LineSegments(lineGeometry, inlayMaterial));

  const archPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0x16171c,
    metalness: 0.25,
    roughness: 0.48,
    envMapIntensity: 0.55,
  });
  const archTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f6d39,
    metalness: 0.86,
    roughness: 0.35,
    emissive: 0x201305,
    emissiveIntensity: 0.4,
    envMapIntensity: 0.7,
  });
  const glowSlotMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6a85e,
    transparent: true,
    opacity: 0.38,
  });

  const archCount = 12;
  for (let i = 0; i < archCount; i++) {
    const angle = (i / archCount) * Math.PI * 2 + Math.PI / 12;
    const radius = 17.45;
    const group = new THREE.Group();
    group.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    group.lookAt(0, 0, 0);

    const panelMesh = new THREE.Mesh(new THREE.BoxGeometry(2.9, 5.15, 0.22), archPanelMaterial);
    panelMesh.position.y = 2.68;
    group.add(panelMesh);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.035, 7, 48, Math.PI), archTrimMaterial);
    arch.position.y = 5.2;
    group.add(arch);

    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.92, 0.035), archTrimMaterial);
    leftTrim.position.set(-1.48, 2.68, 0.14);
    group.add(leftTrim);

    const rightTrim = leftTrim.clone();
    rightTrim.position.x = 1.48;
    group.add(rightTrim);

    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.035, 0.035), archTrimMaterial);
    baseTrim.position.set(0, 0.24, 0.14);
    group.add(baseTrim);

    if (i % 3 === 0) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.8, 0.015), glowSlotMaterial);
      slot.position.set(0, 2.55, 0.135);
      group.add(slot);
    }

    scene.add(group);
  }

  const columnMaterial = new THREE.MeshStandardMaterial({
    color: 0x24242a,
    metalness: 0.35,
    roughness: 0.3,
    envMapIntensity: 0.7,
  });
  const columnCount = 10;
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2 + Math.PI / 10;
    const radius = 15.1;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const column = new THREE.Group();
    column.position.set(x, 0, z);
    column.lookAt(0, 0, 0);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.42, 7.2, 16), columnMaterial);
    shaft.position.y = 3.6;
    column.add(shaft);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.9), archTrimMaterial);
    capital.position.y = 7.25;
    column.add(capital);

    const capitalTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.72), basaltMaterial);
    capitalTop.position.y = 7.4;
    column.add(capitalTop);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.7, 0.22, 20), basaltMaterial);
    foot.position.y = 0.11;
    column.add(foot);

    const footTrim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.025, 6, 32), archTrimMaterial);
    footTrim.rotation.x = Math.PI / 2;
    footTrim.position.y = 0.22;
    column.add(footTrim);

    scene.add(column);
  }

  const overheadRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.8, 0.035, 6, 128),
    new THREE.MeshBasicMaterial({
      color: 0xb08b50,
      transparent: true,
      opacity: 0.18,
    }),
  );
  overheadRing.rotation.x = Math.PI / 2;
  overheadRing.position.y = 9.8;
  scene.add(overheadRing);

  addSprite(0, 4.1, -14.5, 17, 0.11, 0xb78952);
  addSprite(-10.5, 3.4, -8, 10, 0.06, 0x7291b1);
}

function createLights() {
  const boost = isSoftwareRenderer ? 1.48 : 1;
  scene.add(new THREE.HemisphereLight(0xb9c7d8, 0x18110d, 0.64 * boost));
  scene.add(new THREE.AmbientLight(0x65563e, 0.21 * boost));

  const keyLight = new THREE.DirectionalLight(0xffe4b6, 2.35 * boost);
  keyLight.position.set(6, 11, 7);
  scene.add(keyLight);

  const coolFill = new THREE.DirectionalLight(0x7f9bc0, 1.05 * boost);
  coolFill.position.set(-8, 7, -9);
  scene.add(coolFill);

  const overhead = new THREE.SpotLight(0xffd59b, 100 * boost, 24, 0.52, 0.9, 1.8);
  overhead.position.set(0, 11, 2.5);
  overhead.target.position.set(0, 1.2, 0);
  scene.add(overhead);
  scene.add(overhead.target);

  const constellationPositions = [
    [-11, 6.5, -9, 20],
    [10, 5.8, -10, 18],
    [-6, 4.4, -13, 12],
    [7, 3.8, -12, 11],
  ];
  constellationPositions.forEach(([x, y, z, intensity], i) => {
    const light = new THREE.PointLight(i % 2 === 0 ? 0xffbe72 : 0x98b2d4, intensity, 11, 2);
    light.position.set(x, y, z);
    scene.add(light);
  });

  const centerLight = new THREE.PointLight(0xffc477, 24, 10, 2);
  centerLight.position.set(0, 2.8, 1.6);
  scene.add(centerLight);
}

function createDust() {
  const count = isSoftwareRenderer ? 220 : (isMobile() ? 420 : 750);
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const radius = Math.sqrt(Math.random()) * 14;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.25 + Math.random() * 9.2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    speeds[i] = 0.025 + Math.random() * 0.055;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe8c58c,
    size: isMobile() ? 0.045 : 0.038,
    map: glowTexture,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return { points, positions, speeds, count };
}

function createPedestal(x, z, options = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const scale = options.scale ?? 1;

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.79 * scale, 0.94 * scale, 0.15, 48), basaltMaterial);
  foot.position.y = 0.075;
  group.add(foot);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.69 * scale, 0.83, 48), basaltMaterial);
  plinth.position.y = 0.555;
  group.add(plinth);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.71 * scale, 0.6 * scale, 0.14, 48), blackStoneMaterial);
  cap.position.y = 1.0;
  group.add(cap);

  const trimTop = new THREE.Mesh(new THREE.TorusGeometry(0.69 * scale, 0.022, 6, 64), goldMaterial);
  trimTop.rotation.x = Math.PI / 2;
  trimTop.position.y = 1.065;
  group.add(trimTop);

  const trimBottom = new THREE.Mesh(new THREE.TorusGeometry(0.76 * scale, 0.017, 6, 64), goldMaterial);
  trimBottom.rotation.x = Math.PI / 2;
  trimBottom.position.y = 0.17;
  group.add(trimBottom);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1 * scale, 2.1 * scale),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      color: 0x000000,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xd8b06b,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.79 * scale, 0.825 * scale, 64), ringMaterial);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.018;
  group.add(selectionRing);
  selectionRings.push({ mesh: selectionRing, artifactIndex: options.artifactIndex ?? -1 });

  scene.add(group);
  return group;
}

function addSelectionAura(artifact, scale) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xe0b368,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(artifact.auraPosition);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
  auraSprites.push(sprite);
}

function tubeFromPoints(points, radius, material, tubularSegments = 40) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false), material);
}

function isInsideExclusion(object, exclusions) {
  let node = object;
  while (node) {
    if (exclusions.includes(node)) return true;
    node = node.parent;
  }
  return false;
}

function mergeMeshesByMaterial(root, exclusions = []) {
  root.updateWorldMatrix(true, true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const removals = [];

  root.traverse((object) => {
    if (!object.isMesh || Array.isArray(object.material) || isInsideExclusion(object, exclusions)) return;
    let geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    Object.keys(geometry.attributes).forEach((name) => {
      if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    });
    if (!geometry.attributes.uv) {
      const count = geometry.attributes.position.count;
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    const relativeMatrix = new THREE.Matrix4().multiplyMatrices(rootInverse, object.matrixWorld);
    geometry.applyMatrix4(relativeMatrix);
    if (!buckets.has(object.material)) buckets.set(object.material, []);
    buckets.get(object.material).push(geometry);
    removals.push(object);
  });

  removals.forEach((mesh) => mesh.parent?.remove(mesh));
  buckets.forEach((geometries, material) => {
    if (!geometries.length) return;
    const merged = mergeGeometries(geometries, false);
    if (merged) root.add(new THREE.Mesh(merged, material));
  });
}

function createArmillary() {
  const root = new THREE.Group();
  root.position.set(0, 2.3, 0);
  root.scale.setScalar(1.18);

  const axisMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d4328,
    metalness: 0.9,
    roughness: 0.34,
    envMapIntensity: 0.8,
  });

  const rings = [];
  const ringDefs = [
    { radius: 1.0, tube: 0.027, rotation: [0, 0, 0] },
    { radius: 1.06, tube: 0.022, rotation: [Math.PI / 2, 0, 0] },
    { radius: 1.12, tube: 0.018, rotation: [0, Math.PI / 2, 0] },
    { radius: 1.24, tube: 0.019, rotation: [0.3, 0.16, 0.42] },
  ];

  ringDefs.forEach((def, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius, def.tube, 8, 96),
      index === 3 ? paleGoldMaterial : goldMaterial,
    );
    ring.rotation.set(...def.rotation);
    root.add(ring);
    rings.push(ring);
  });

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.072, 8, 96),
    new THREE.MeshStandardMaterial({
      color: 0x8e682f,
      metalness: 0.9,
      roughness: 0.3,
      emissive: 0x2a1705,
      emissiveIntensity: 0.25,
      envMapIntensity: 0.9,
    }),
  );
  band.rotation.set(0.5, 0.2, 0.15);
  root.add(band);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 22),
    new THREE.MeshStandardMaterial({
      color: 0x3d2a16,
      metalness: 0.94,
      roughness: 0.27,
      emissive: 0x2b1607,
      emissiveIntensity: 0.38,
      envMapIntensity: 1,
    }),
  );
  root.add(core);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2a6 }),
  );
  root.add(sun);

  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffcd7b,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sunGlow.scale.set(1.05, 1.05, 1);
  root.add(sunGlow);

  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.65, 8), axisMaterial);
  axis.rotation.z = Math.PI / 2;
  axis.rotation.y = 0.5;
  root.add(axis);

  const beadGeometry = new THREE.SphereGeometry(0.037, 10, 8);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const bead = new THREE.Mesh(beadGeometry, i % 3 === 0 ? paleGoldMaterial : bronzeMaterial);
    bead.position.set(Math.cos(angle) * 1.24, Math.sin(angle) * 0.55, Math.sin(angle) * 0.86);
    root.add(bead);
  }

  const suspensionMaterial = new THREE.LineBasicMaterial({
    color: 0x9d8153,
    transparent: true,
    opacity: 0.28,
  });
  const suspensionPoints = [
    [0, 1.34, 0, 0, 6.8, 0],
    [0.9, 0.94, 0.2, 3.3, 7.3, 0.8],
    [-0.86, 0.89, -0.2, -3.1, 7.2, -0.6],
  ];
  suspensionPoints.forEach((p) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([p[0], p[1], p[2], p[3], p[4], p[5]], 3));
    root.add(new THREE.Line(geometry, suspensionMaterial));
  });

  scene.add(root);
  addSelectionAura({
    auraPosition: new THREE.Vector3(0, 2.55, -0.4),
  }, 4.4);

  return { group: root, rings, band, focusY: 2.3 };
}

function createAmphora() {
  const profile = [
    new THREE.Vector2(0.31, 0.0),
    new THREE.Vector2(0.34, 0.035),
    new THREE.Vector2(0.28, 0.08),
    new THREE.Vector2(0.37, 0.14),
    new THREE.Vector2(0.51, 0.3),
    new THREE.Vector2(0.64, 0.52),
    new THREE.Vector2(0.68, 0.76),
    new THREE.Vector2(0.63, 1.02),
    new THREE.Vector2(0.5, 1.22),
    new THREE.Vector2(0.36, 1.38),
    new THREE.Vector2(0.3, 1.52),
    new THREE.Vector2(0.3, 1.66),
    new THREE.Vector2(0.37, 1.7),
    new THREE.Vector2(0.4, 1.73),
  ];
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), vesselMaterial);
  const root = new THREE.Group();
  root.add(vessel);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.035, 48), darkBronzeMaterial);
  foot.position.y = 0.014;
  root.add(foot);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 7, 64), vesselMaterial);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.725;
  root.add(lip);

  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.6, 1.02, 0),
      new THREE.Vector3(side * 0.72, 1.22, 0),
      new THREE.Vector3(side * 0.61, 1.45, 0),
      new THREE.Vector3(side * 0.4, 1.61, 0),
      new THREE.Vector3(side * 0.35, 1.68, 0),
    ]);
    const handle = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.045, 8, false), vesselMaterial);
    root.add(handle);
  });

  root.position.set(-4.76, 1.08, -2.12);
  root.rotation.y = 0.16;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 1.96 };
}

function createAstrolabe() {
  const root = new THREE.Group();
  const stand = new THREE.Group();
  stand.position.y = 0.0;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.4, 0.09, 32), darkBronzeMaterial);
  base.position.y = 0.04;
  stand.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.05, 12), goldMaterial);
  post.position.set(0, 0.57, -0.09);
  stand.add(post);

  const arm = tubeFromPoints([
    new THREE.Vector3(0, 1.08, -0.09),
    new THREE.Vector3(0, 1.27, -0.02),
    new THREE.Vector3(0, 1.34, 0.07),
  ], 0.03, goldMaterial, 20);
  stand.add(arm);
  root.add(stand);

  const disk = new THREE.Group();
  disk.position.y = 1.27;

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c753d,
    metalness: 0.88,
    roughness: 0.32,
    envMapIntensity: 0.9,
  });
  const diskBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.67, 0.67, 0.075, 64),
    [sideMaterial, astrolabeFaceMaterial, astrolabeFaceMaterial],
  );
  diskBody.rotation.x = Math.PI / 2;
  disk.add(diskBody);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.028, 7, 80), goldMaterial);
  disk.add(rim);

  const pointerPivot = new THREE.Group();
  pointerPivot.position.z = 0.052;
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.53, 0.018), paleGoldMaterial);
  pointer.position.y = 0.245;
  pointerPivot.add(pointer);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.15, 0.018), bronzeMaterial);
  counter.position.y = -0.1;
  pointerPivot.add(counter);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), paleGoldMaterial);
  pointerPivot.add(pivot);
  disk.add(pointerPivot);

  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 7, 32), goldMaterial);
  topRing.position.y = 0.79;
  disk.add(topRing);

  const smallRings = new THREE.Group();
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.012, 6, 54), bronzeMaterial);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.01, 6, 54), bronzeMaterial);
  ringA.rotation.z = 0.15;
  ringB.rotation.z = -0.8;
  smallRings.position.z = 0.055;
  smallRings.add(ringA, ringB);
  disk.add(smallRings);

  root.add(disk);
  root.position.set(-2.82, 1.08, -4.44);
  root.rotation.y = -0.12;
  mergeMeshesByMaterial(root, [pointerPivot, smallRings]);
  scene.add(root);
  return { group: root, focusY: 2.38, pointerPivot, smallRings };
}

function createMask() {
  const root = new THREE.Group();

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.35, 0.11), blackStoneMaterial);
  plaque.position.y = 0.98;
  plaque.position.z = -0.23;
  root.add(plaque);

  const plaqueFrameMaterial = goldMaterial;
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.035), plaqueFrameMaterial);
  frameTop.position.set(0, 1.66, -0.16);
  root.add(frameTop);
  const frameBottom = frameTop.clone();
  frameBottom.position.y = 0.3;
  root.add(frameBottom);
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.38, 0.035), plaqueFrameMaterial);
  frameLeft.position.set(-0.43, 0.98, -0.16);
  root.add(frameLeft);
  const frameRight = frameLeft.clone();
  frameRight.position.x = 0.43;
  root.add(frameRight);

  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a75b,
    metalness: 1,
    roughness: 0.24,
    emissive: 0x241505,
    emissiveIntensity: 0.18,
    envMapIntensity: 1.15,
  });

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.39, 40, 28), faceMaterial);
  face.scale.set(1.0, 1.3, 0.43);
  face.position.set(0, 1.06, 0.01);
  root.add(face);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 20), faceMaterial);
  jaw.scale.set(0.86, 1.02, 0.37);
  jaw.position.set(0, 0.79, 0.05);
  root.add(jaw);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 5), faceMaterial);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI;
  nose.position.set(0, 1.02, 0.2);
  root.add(nose);

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x17110c,
    metalness: 0.35,
    roughness: 0.24,
    envMapIntensity: 0.4,
  });
  [-1, 1].forEach((side) => {
    const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.014, 6, 26), goldMaterial);
    eyeRing.scale.set(1.1, 0.54, 1);
    eyeRing.position.set(side * 0.145, 1.13, 0.19);
    root.add(eyeRing);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.057, 16, 12), eyeMaterial);
    eye.scale.set(1.2, 0.56, 0.22);
    eye.position.set(side * 0.145, 1.13, 0.196);
    root.add(eye);

    const brow = tubeFromPoints([
      new THREE.Vector3(side * 0.075, 1.225, 0.16),
      new THREE.Vector3(side * 0.16, 1.255, 0.19),
      new THREE.Vector3(side * 0.245, 1.22, 0.145),
    ], 0.013, goldMaterial, 16);
    root.add(brow);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), faceMaterial);
    ear.scale.set(0.34, 1.0, 0.3);
    ear.position.set(side * 0.39, 1.04, 0.01);
    root.add(ear);
  });

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.028), darkBronzeMaterial);
  mouth.position.set(0, 0.84, 0.235);
  root.add(mouth);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), faceMaterial);
  chin.scale.set(1.1, 0.7, 0.3);
  chin.position.set(0, 0.72, 0.13);
  root.add(chin);

  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.026, 7, 48, Math.PI), paleGoldMaterial);
  crown.position.set(0, 1.34, 0.04);
  crown.rotation.z = Math.PI;
  root.add(crown);

  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), carnelianMaterial);
  crownGem.position.set(0, 1.47, 0.1);
  root.add(crownGem);

  root.position.set(0, 1.08, -5.27);
  root.rotation.y = 0.04;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.16 };
}

function createWingShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.05, 0.3);
  shape.bezierCurveTo(0.2, 0.6, 0.56, 0.54, 0.86, 0.25);
  shape.bezierCurveTo(0.98, 0.06, 0.86, -0.23, 0.6, -0.38);
  shape.bezierCurveTo(0.39, -0.49, 0.16, -0.3, 0.07, -0.17);
  shape.closePath();
  return shape;
}

function createScarab() {
  const root = new THREE.Group();

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.62, 0.12), blackStoneMaterial);
  plaque.position.set(0, 1.03, -0.19);
  root.add(plaque);

  const frameMat = goldMaterial;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.025, 0.035), frameMat);
  top.position.set(0, 1.85, -0.12);
  root.add(top);
  const bottom = top.clone();
  bottom.position.y = 0.21;
  root.add(bottom);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.66, 0.035), frameMat);
  left.position.set(-0.91, 1.03, -0.12);
  root.add(left);
  const right = left.clone();
  right.position.x = 0.91;
  root.add(right);

  const wingGeometry = new THREE.ExtrudeGeometry(createWingShape(), {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  wingGeometry.center();

  const wings = new THREE.Group();
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(wingGeometry, paleGoldMaterial);
    wing.scale.set(side, 1, 1);
    wing.position.set(side * 0.55, 1.13, 0.02);
    wings.add(wing);

    for (let i = 0; i < 3; i++) {
      const featherMaterial = i === 1 ? lapisMaterial : (i === 2 ? carnelianMaterial : goldMaterial);
      const feather = tubeFromPoints([
        new THREE.Vector3(side * 0.25, 1.32 - i * 0.11, 0.07),
        new THREE.Vector3(side * 0.58, 1.31 - i * 0.15, 0.09),
        new THREE.Vector3(side * 0.86, 1.2 - i * 0.16, 0.07),
      ], 0.016, featherMaterial, 24);
      root.add(feather);
    }
  });
  root.add(wings);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), lapisMaterial);
  abdomen.scale.set(0.82, 1.55, 0.52);
  abdomen.position.set(0, 1.02, 0.07);
  root.add(abdomen);

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), goldMaterial);
  thorax.scale.set(1.05, 0.72, 0.55);
  thorax.position.set(0, 1.32, 0.08);
  root.add(thorax);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), lapisMaterial);
  head.scale.set(1, 0.72, 0.6);
  head.position.set(0, 1.5, 0.09);
  root.add(head);

  [-1, 1].forEach((side) => {
    const antenna = tubeFromPoints([
      new THREE.Vector3(side * 0.07, 1.55, 0.12),
      new THREE.Vector3(side * 0.16, 1.62, 0.16),
      new THREE.Vector3(side * 0.12, 1.7, 0.2),
    ], 0.011, goldMaterial, 14);
    root.add(antenna);

    for (let leg = 0; leg < 3; leg++) {
      const y = 1.31 - leg * 0.18;
      const limb = tubeFromPoints([
        new THREE.Vector3(side * 0.2, y, 0.02),
        new THREE.Vector3(side * 0.44, y + 0.08, 0.01),
        new THREE.Vector3(side * 0.62, y - 0.06, -0.01),
      ], 0.022, bronzeMaterial, 18);
      root.add(limb);
    }
  });

  const sunDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.035, 24), carnelianMaterial);
  sunDisk.rotation.x = Math.PI / 2;
  sunDisk.position.set(0, 1.69, 0.1);
  root.add(sunDisk);

  root.position.set(2.83, 1.08, -4.44);
  root.rotation.y = -0.05;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.16 };
}

function createTablet() {
  const root = new THREE.Group();

  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x17171b,
    metalness: 0.56,
    roughness: 0.36,
    envMapIntensity: 0.7,
  });

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.5), standMaterial);
  stand.position.set(0, 0.16, 0);
  root.add(stand);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.05, 0.08), goldMaterial);
  lip.position.set(0, 0.25, 0.215);
  root.add(lip);

  const support = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.11, 0.32), standMaterial);
  support.position.set(0, 0.35, -0.06);
  support.rotation.x = -0.16;
  root.add(support);

  const shape = new THREE.Shape();
  const w = 0.86;
  const h = 1.28;
  const r = 0.11;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const tablet = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.018,
      bevelSegments: 3,
      curveSegments: 10,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xa98d68,
      metalness: 0.02,
      roughness: 0.76,
      envMapIntensity: 0.36,
    }),
  );
  tablet.position.set(0, 1.2, -0.05);
  tablet.rotation.x = -0.1;
  root.add(tablet);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), clayMaterial);
  face.position.set(0, 1.2, 0.062);
  face.rotation.x = -0.1;
  root.add(face);

  root.position.set(4.77, 1.08, -2.12);
  root.rotation.y = -0.1;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.12 };
}

const liteGold = new THREE.MeshLambertMaterial({
  color: 0xcda45d,
  emissive: 0x3a220a,
  emissiveIntensity: 0.42,
});
const liteBrightGold = new THREE.MeshLambertMaterial({
  color: 0xe4c17c,
  emissive: 0x4a2a0a,
  emissiveIntensity: 0.5,
});
const liteBronze = new THREE.MeshLambertMaterial({
  color: 0x80552f,
  emissive: 0x1f1105,
  emissiveIntensity: 0.35,
});
const liteStone = new THREE.MeshLambertMaterial({ color: 0x26262d });
const liteBlackStone = new THREE.MeshLambertMaterial({ color: 0x111116 });
const liteTerracotta = new THREE.MeshLambertMaterial({
  color: 0xa96543,
  emissive: 0x1d0d06,
  emissiveIntensity: 0.25,
});
const liteLapis = new THREE.MeshLambertMaterial({
  color: 0x1d467e,
  emissive: 0x040b16,
  emissiveIntensity: 0.3,
});
const liteClay = new THREE.MeshLambertMaterial({ color: 0xb79a73 });
function createLiteArchitecture() {
  const architecture = new THREE.Group();
  const wallMaterial = new THREE.MeshLambertMaterial({
    color: 0x0c0d12,
    side: THREE.BackSide,
  });

  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 48), liteStone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.035;
  architecture.add(floor);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(18.2, 18.2, 15, 32, 1, true), wallMaterial);
  wall.position.y = 7.45;
  architecture.add(wall);

  [3.25, 7.15, 11.8, 16.1].forEach((radius) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.035, radius + 0.025, 48), liteGold);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    architecture.add(ring);
  });

  const columnCount = 8;
  const columnGeometry = new THREE.CylinderGeometry(0.3, 0.42, 7.2, 8);
  const capitalGeometry = new THREE.BoxGeometry(1.0, 0.18, 0.84);
  const panelGeometry = new THREE.BoxGeometry(2.9, 5.15, 0.22);
  const archGeometry = new THREE.TorusGeometry(1.55, 0.04, 4, 18, Math.PI);
  const origin = new THREE.Vector3();

  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2 + Math.PI / 8;
    const x = Math.sin(angle) * 15.1;
    const z = Math.cos(angle) * 15.1;

    const column = new THREE.Mesh(columnGeometry, liteStone);
    column.position.set(x, 3.6, z);
    architecture.add(column);

    const capital = new THREE.Mesh(capitalGeometry, liteGold);
    capital.position.set(x, 7.28, z);
    architecture.add(capital);

    const panel = new THREE.Mesh(panelGeometry, liteBlackStone);
    panel.position.set(Math.sin(angle) * 17.25, 2.68, Math.cos(angle) * 17.25);
    panel.lookAt(origin.set(0, 2.68, 0));
    architecture.add(panel);

    const arch = new THREE.Mesh(archGeometry, liteGold);
    arch.position.set(Math.sin(angle) * 17.25, 5.2, Math.cos(angle) * 17.25);
    arch.lookAt(origin.set(0, 5.2, 0));
    architecture.add(arch);
  }

  const overheadRing = new THREE.Mesh(new THREE.TorusGeometry(8.8, 0.035, 4, 64), liteGold);
  overheadRing.rotation.x = Math.PI / 2;
  overheadRing.position.y = 9.8;
  architecture.add(overheadRing);

  mergeMeshesByMaterial(architecture);
  scene.add(architecture);
}

function createLiteLights() {
  scene.add(new THREE.HemisphereLight(0xc7d1dc, 0x1a120d, 1.05));
  scene.add(new THREE.AmbientLight(0x8b7659, 0.42));

  const key = new THREE.DirectionalLight(0xffdda7, 2.7);
  key.position.set(5, 11, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8aa4c7, 1.2);
  fill.position.set(-8, 7, -9);
  scene.add(fill);

  const center = new THREE.PointLight(0xffbe72, 38, 13, 2);
  center.position.set(0, 3.2, 1.8);
  scene.add(center);
}

function createLitePedestals() {
  const positions = [
    [-4.76, -2.12, 0.94],
    [-2.82, -4.44, 0.94],
    [0, -5.27, 1.06],
    [2.83, -4.44, 0.94],
    [4.77, -2.12, 0.94],
    [0, 0, 1.22],
  ];
  const pedestals = new THREE.Group();
  const baseGeometry = new THREE.CylinderGeometry(0.79, 0.94, 0.15, 18);
  const plinthGeometry = new THREE.CylinderGeometry(0.55, 0.69, 0.83, 18);
  const capGeometry = new THREE.CylinderGeometry(0.71, 0.6, 0.14, 18);
  const trimGeometry = new THREE.TorusGeometry(0.69, 0.02, 4, 20);

  positions.forEach(([x, z, scale]) => {
    const base = new THREE.Mesh(baseGeometry, liteStone);
    base.position.set(x, 0.075, z);
    base.scale.set(scale, 1, scale);
    pedestals.add(base);

    const plinth = new THREE.Mesh(plinthGeometry, liteStone);
    plinth.position.set(x, 0.555, z);
    plinth.scale.set(scale, 1, scale);
    pedestals.add(plinth);

    const cap = new THREE.Mesh(capGeometry, liteBlackStone);
    cap.position.set(x, 1.0, z);
    cap.scale.set(scale, 1, scale);
    pedestals.add(cap);

    const trim = new THREE.Mesh(trimGeometry, liteGold);
    trim.rotation.x = Math.PI / 2;
    trim.position.set(x, 1.065, z);
    trim.scale.set(scale, scale, 1);
    pedestals.add(trim);
  });

  mergeMeshesByMaterial(pedestals);
  scene.add(pedestals);

  const ringMaterial = new THREE.MeshLambertMaterial({
    color: 0xe0b66f,
    emissive: 0x6f4715,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
  });
  liteSelectionRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.85, 40), ringMaterial);
  liteSelectionRing.rotation.x = -Math.PI / 2;
  liteSelectionRing.position.y = 0.02;
  liteSelectionRing.scale.setScalar(1.3);
  scene.add(liteSelectionRing);
}

function createLiteArmillary() {
  const root = new THREE.Group();
  root.position.set(0, 2.3, 0);
  root.scale.setScalar(1.18);
  const rings = [];
  const ringDefinitions = [
    [1.0, 0.03, [0, 0, 0]],
    [1.06, 0.025, [Math.PI / 2, 0, 0]],
    [1.12, 0.022, [0, Math.PI / 2, 0]],
    [1.24, 0.022, [0.3, 0.16, 0.42]],
  ];
  ringDefinitions.forEach(([radius, tube, rotation], index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 5, 56),
      index === 3 ? liteBrightGold : liteGold,
    );
    ring.rotation.set(...rotation);
    root.add(ring);
    rings.push(ring);
  });

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.065, 5, 56), liteBronze);
  band.rotation.set(0.5, 0.2, 0.15);
  root.add(band);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 14), liteBronze);
  root.add(core);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), liteBrightGold);
  root.add(sun);

  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.65, 6), liteBronze);
  axis.rotation.z = Math.PI / 2;
  axis.rotation.y = 0.5;
  root.add(axis);

  mergeMeshesByMaterial(root, [...rings, band]);
  scene.add(root);
  return { group: root, rings, band, focusY: 2.3 };
}

function createLiteAmphora() {
  const profile = [
    new THREE.Vector2(0.31, 0.0),
    new THREE.Vector2(0.34, 0.035),
    new THREE.Vector2(0.28, 0.08),
    new THREE.Vector2(0.37, 0.14),
    new THREE.Vector2(0.51, 0.3),
    new THREE.Vector2(0.64, 0.52),
    new THREE.Vector2(0.68, 0.76),
    new THREE.Vector2(0.63, 1.02),
    new THREE.Vector2(0.5, 1.22),
    new THREE.Vector2(0.36, 1.38),
    new THREE.Vector2(0.3, 1.52),
    new THREE.Vector2(0.3, 1.66),
    new THREE.Vector2(0.37, 1.7),
    new THREE.Vector2(0.4, 1.73),
  ];
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), liteTerracotta));

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.035, 28), liteBronze);
  foot.position.y = 0.014;
  root.add(foot);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.026, 5, 36), liteTerracotta);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.725;
  root.add(lip);

  [-1, 1].forEach((side) => {
    const handle = tubeFromPoints([
      new THREE.Vector3(side * 0.6, 1.02, 0),
      new THREE.Vector3(side * 0.72, 1.24, 0),
      new THREE.Vector3(side * 0.6, 1.46, 0),
      new THREE.Vector3(side * 0.35, 1.68, 0),
    ], 0.045, liteTerracotta, 20);
    root.add(handle);
  });

  root.position.set(-4.76, 1.08, -2.12);
  root.rotation.y = 0.16;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 1.96 };
}

function createLiteAstrolabe() {
  const root = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.4, 0.09, 20), liteBronze);
  base.position.y = 0.04;
  root.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 1.15, 8), liteGold);
  post.position.set(0, 0.6, -0.09);
  root.add(post);

  const disk = new THREE.Group();
  disk.position.y = 1.27;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.075, 40), liteGold);
  body.rotation.x = Math.PI / 2;
  disk.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.03, 5, 48), liteBrightGold);
  disk.add(rim);

  const pointerPivot = new THREE.Group();
  pointerPivot.position.z = 0.052;
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 0.02), liteBrightGold);
  pointer.position.y = 0.25;
  pointerPivot.add(pointer);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), liteBrightGold);
  pointerPivot.add(pivot);
  disk.add(pointerPivot);

  const smallRings = new THREE.Group();
  const rete = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.015, 5, 36), liteBronze);
  rete.rotation.z = 0.2;
  rete.position.z = 0.055;
  smallRings.add(rete);
  disk.add(smallRings);

  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 5, 24), liteGold);
  topRing.position.y = 0.8;
  disk.add(topRing);
  root.add(disk);

  root.position.set(-2.82, 1.08, -4.44);
  root.rotation.y = -0.12;
  mergeMeshesByMaterial(root, [pointerPivot, smallRings]);
  scene.add(root);
  return { group: root, focusY: 2.38, pointerPivot, smallRings };
}

function createLiteMask() {
  const root = new THREE.Group();
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.35, 0.11), liteBlackStone);
  plaque.position.set(0, 0.98, -0.23);
  root.add(plaque);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.39, 24, 16), liteGold);
  face.scale.set(1, 1.3, 0.43);
  face.position.set(0, 1.06, 0.01);
  root.add(face);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), liteGold);
  jaw.scale.set(0.86, 1.02, 0.37);
  jaw.position.set(0, 0.79, 0.05);
  root.add(jaw);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 5), liteGold);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI;
  nose.position.set(0, 1.02, 0.2);
  root.add(nose);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), liteBlackStone);
    eye.scale.set(1.2, 0.56, 0.22);
    eye.position.set(side * 0.145, 1.13, 0.21);
    root.add(eye);
  });

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.026), liteBronze);
  mouth.position.set(0, 0.84, 0.245);
  root.add(mouth);

  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 5, 32, Math.PI), liteBrightGold);
  crown.position.set(0, 1.34, 0.04);
  crown.rotation.z = Math.PI;
  root.add(crown);

  root.position.set(0, 1.08, -5.27);
  root.rotation.y = 0.04;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.16 };
}

function createLiteScarab() {
  const root = new THREE.Group();
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.62, 0.12), liteBlackStone);
  plaque.position.set(0, 1.03, -0.19);
  root.add(plaque);

  const wingGeometry = new THREE.ExtrudeGeometry(createWingShape(), {
    depth: 0.055,
    bevelEnabled: false,
    curveSegments: 5,
  });
  wingGeometry.center();
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(wingGeometry, liteBrightGold);
    wing.scale.set(side, 1, 1);
    wing.position.set(side * 0.55, 1.13, 0.02);
    root.add(wing);
  });

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), liteLapis);
  abdomen.scale.set(0.82, 1.55, 0.52);
  abdomen.position.set(0, 1.02, 0.07);
  root.add(abdomen);

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), liteGold);
  thorax.scale.set(1.05, 0.72, 0.55);
  thorax.position.set(0, 1.32, 0.08);
  root.add(thorax);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), liteLapis);
  head.scale.set(1, 0.72, 0.6);
  head.position.set(0, 1.5, 0.09);
  root.add(head);

  const sunDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 16), liteTerracotta);
  sunDisk.rotation.x = Math.PI / 2;
  sunDisk.position.set(0, 1.69, 0.1);
  root.add(sunDisk);

  root.position.set(2.83, 1.08, -4.44);
  root.rotation.y = -0.05;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.16 };
}

function createLiteTablet() {
  const root = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.5), liteBlackStone);
  stand.position.set(0, 0.16, 0);
  root.add(stand);

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.3, 0.12), liteClay);
  tablet.position.set(0, 1.2, -0.03);
  tablet.rotation.x = -0.1;
  root.add(tablet);

  const markGeometry = new THREE.BoxGeometry(0.045, 0.012, 0.006);
  for (let row = 0; row < 8; row++) {
    const y = 0.73 + row * 0.14;
    for (let col = 0; col < 6; col++) {
      const x = -0.3 + col * 0.12 + (row % 2) * 0.025;
      const mark = new THREE.Mesh(markGeometry, liteBronze);
      mark.position.set(x, y, 0.039);
      mark.rotation.x = -0.1;
      root.add(mark);
    }
  }

  root.position.set(4.77, 1.08, -2.12);
  root.rotation.y = -0.1;
  mergeMeshesByMaterial(root);
  scene.add(root);
  return { group: root, focusY: 2.12 };
}

function buildSoftwareExhibition() {
  createLiteArchitecture();
  createLiteLights();
  const positions = [
    [-4.76, -2.12],
    [-2.82, -4.44],
    [0, -5.27],
    [2.83, -4.44],
    [4.77, -2.12],
  ];
  createLitePedestals();
  return {
    centralDais: null,
    models: [
      createLiteArmillary(),
      createLiteAmphora(),
      createLiteAstrolabe(),
      createLiteMask(),
      createLiteScarab(),
      createLiteTablet(),
    ],
  };
}

let dust = null;
let centralDais = null;
let builtModels;

if (isSoftwareRenderer) {
  const softwareExhibition = buildSoftwareExhibition();
  builtModels = softwareExhibition.models;
  centralDais = softwareExhibition.centralDais;
} else {
  prepareFullMaterials();
  dust = createDust();
  createArchitecture();
  createLights();

  const pedestalPositions = [
    [-4.76, -2.12],
    [-2.82, -4.44],
    [0, -5.27],
    [2.83, -4.44],
    [4.77, -2.12],
  ];
  pedestalPositions.forEach(([x, z], index) => {
    createPedestal(x, z, { scale: index === 2 ? 1.06 : 0.94, artifactIndex: index + 1 });
  });

  centralDais = createPedestal(0, 0, { scale: 1.22, artifactIndex: 0 });

  const modelFactories = [
    createArmillary,
    createAmphora,
    createAstrolabe,
    createMask,
    createScarab,
    createTablet,
  ];

  builtModels = modelFactories.map((factory) => factory());
}

builtModels.forEach((model, index) => {
  model.group.traverse((child) => {
    if (!child.isMesh) return;
    child.userData.artifactIndex = index;
    pickables.push(child);
  });

  const data = artifacts[index];
  const labelPosition = new THREE.Vector3();
  if (index === 0) {
    labelPosition.set(0, 4.08, 0);
  } else {
    labelPosition.set(
      model.group.position.x,
      3.06,
      model.group.position.z,
    );
  }
  data.labelPosition = labelPosition;
  data.focusY = model.focusY;
  data.group = model.group;
});

function createInterface() {
  artifacts.forEach((artifact, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-item';
    button.setAttribute('aria-label', `View ${artifact.title.join(' ')}`);
    button.innerHTML = `<span class="nav-index">0${index + 1}</span><span class="nav-name">${artifact.short}</span>`;
    button.addEventListener('click', () => selectArtifact(index));
    navEl.appendChild(button);

    const hotspot = document.createElement('button');
    hotspot.type = 'button';
    hotspot.className = 'hotspot';
    hotspot.innerHTML = `<span class="hotspot-dot"></span><span class="hotspot-name">${artifact.label}</span>`;
    hotspot.addEventListener('click', () => selectArtifact(index));
    hotspotsEl.appendChild(hotspot);
    hotspotButtons.push(hotspot);
  });
}

function setPanel(index) {
  const data = artifacts[index];
  panelNumber.innerHTML = `0${index + 1} <span>/ 06</span>`;
  panelKicker.textContent = data.kicker;
  panelTitle.innerHTML = isMobile() ? data.title.join(' ') : data.title.join('<br /> ');
  panelMeta.innerHTML = data.meta.map((item) => `<span>${item}</span>`).join('');
  panelDescription.textContent = data.description;
  panelAction.classList.toggle('is-hidden', index === 0);
}

function updateSelectionUI(index) {
  document.querySelectorAll('.nav-item').forEach((item, itemIndex) => {
    item.classList.toggle('is-active', itemIndex === index);
    item.setAttribute('aria-current', itemIndex === index ? 'true' : 'false');
  });
  hotspotButtons.forEach((button, buttonIndex) => {
    button.classList.toggle('is-selected', buttonIndex === index);
    button.classList.toggle('is-dimmed', index !== 0 && buttonIndex !== index);
  });
  setPanel(index);
}

function getHomeView() {
  if (isMobile()) {
    return {
      position: new THREE.Vector3(0, 4.45, 15.25),
      target: new THREE.Vector3(0, 2.0, -0.6),
      fov: 60,
    };
  }
  return {
    position: new THREE.Vector3(0, 4.85, 12.7),
    target: new THREE.Vector3(0, 2.02, -0.2),
    fov: 41,
  };
}

function getFocusView(index) {
  const data = artifacts[index];
  if (index === 0) {
    return {
      position: new THREE.Vector3(0, 3.65, isMobile() ? 8.4 : 7.4),
      target: new THREE.Vector3(0, 2.3, 0),
      fov: isMobile() ? 54 : 38,
    };
  }
  const mobile = isMobile();
  const pos = data.group.position;
  return {
    position: new THREE.Vector3(
      pos.x * 1.04 + (pos.x > 0 ? 0.08 : -0.08),
      data.focusY + (mobile ? 0.7 : 0.95),
      pos.z + (mobile ? 4.8 : 4.35),
    ),
    target: new THREE.Vector3(pos.x, data.focusY - 0.05, pos.z),
    fov: mobile ? 51 : 37,
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateCameraTo(view, duration = 1250) {
  cameraTween = {
    start: performance.now(),
    duration,
    fromPosition: camera.position.clone(),
    toPosition: view.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: view.target.clone(),
    fromFov: camera.fov,
    toFov: view.fov,
  };
  controls.enabled = false;
}

function selectArtifact(index) {
  if (index < 0 || index >= artifacts.length) return;
  selectedIndex = index;
  isHomeView = index === 0;
  updateSelectionUI(index);
  if (index === 0) {
    animateCameraTo(getHomeView(), 1350);
  } else {
    animateCameraTo(getFocusView(index), 1250);
  }
}

function goHome() {
  selectedIndex = 0;
  isHomeView = true;
  updateSelectionUI(0);
  animateCameraTo(getHomeView(), 1350);
}

panelAction.addEventListener('click', goHome);
homeButton.addEventListener('click', goHome);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goHome();
  } else if (event.key === 'ArrowRight') {
    selectArtifact((selectedIndex + 1) % artifacts.length);
  } else if (event.key === 'ArrowLeft') {
    selectArtifact((selectedIndex - 1 + artifacts.length) % artifacts.length);
  }
});

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function findArtifactAtPointer() {
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(pickables, false);
  if (!intersections.length) return -1;
  return intersections[0].object.userData.artifactIndex ?? -1;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
  };
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;
  updatePointer(event);
  const index = findArtifactAtPointer();
  renderer.domElement.style.cursor = index >= 0 ? 'pointer' : 'grab';
});

renderer.domElement.addEventListener('pointerleave', () => {
  renderer.domElement.style.cursor = 'grab';
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  const distance = Math.hypot(dx, dy);
  const elapsed = performance.now() - pointerDown.time;
  pointerDown = null;
  if (distance > 7 || elapsed > 900) return;
  updatePointer(event);
  const index = findArtifactAtPointer();
  if (index >= 0) selectArtifact(index);
});

function updateHotspots() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const vector = new THREE.Vector3();
  const show = isHomeView && !cameraTween;
  hotspotButtons.forEach((button, index) => {
    if (!show || index === 0) {
      button.classList.remove('is-visible');
      return;
    }
    vector.copy(artifacts[index].labelPosition).project(camera);
    const visible = vector.z > -1 && vector.z < 1 && vector.x > -1.08 && vector.x < 1.08;
    if (!visible) {
      button.classList.remove('is-visible');
      return;
    }
    const x = (vector.x * 0.5 + 0.5) * width;
    const y = (-vector.y * 0.5 + 0.5) * height;
    button.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    button.classList.add('is-visible');
  });
}

function updateCameraTween(now) {
  if (!cameraTween) return;
  const progress = clamp((now - cameraTween.start) / cameraTween.duration, 0, 1);
  const eased = easeInOutCubic(progress);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  const target = new THREE.Vector3().lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  camera.fov = THREE.MathUtils.lerp(cameraTween.fromFov, cameraTween.toFov, eased);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  if (progress >= 1) {
    controls.target.copy(cameraTween.toTarget);
    cameraTween = null;
    controls.enabled = true;
    controls.update();
  }
}

function updateAnimation(elapsed, delta) {
  const models = builtModels;
  models[0].group.rotation.y = elapsed * 0.052;
  models[0].rings[0].rotation.z = elapsed * 0.07;
  models[0].rings[1].rotation.y = elapsed * 0.04;
  models[0].rings[2].rotation.x = -elapsed * 0.035;
  models[0].rings[3].rotation.z = 0.42 + Math.sin(elapsed * 0.18) * 0.08;
  models[0].band.rotation.y = 0.2 + elapsed * 0.028;

  for (let i = 1; i < models.length; i++) {
    const model = models[i];
    const baseRotation = [0, 0.16, -0.12, 0.04, -0.05, -0.1][i];
    model.group.rotation.y = baseRotation + Math.sin(elapsed * 0.22 + i * 1.7) * 0.075;
    model.group.position.y = 1.08 + Math.sin(elapsed * 0.55 + i) * 0.012;
  }

  models[2].pointerPivot.rotation.z = elapsed * 0.13;
  models[2].smallRings.rotation.z = -elapsed * 0.055;

  if (dust) {
    dust.points.rotation.y = elapsed * 0.006;
    for (let i = 0; i < dust.count; i++) {
      dust.positions[i * 3 + 1] += dust.speeds[i] * delta * 0.42;
      if (dust.positions[i * 3 + 1] > 9.4) {
        dust.positions[i * 3 + 1] = 0.25;
      }
    }
    dust.points.geometry.attributes.position.needsUpdate = true;
  }

  if (liteSelectionRing) {
    const data = artifacts[selectedIndex];
    const pulse = 0.72 + Math.sin(elapsed * 2.1) * 0.1;
    liteSelectionRing.material.opacity += (pulse - liteSelectionRing.material.opacity) * 0.08;
    liteSelectionRing.position.x = data.group.position.x;
    liteSelectionRing.position.z = data.group.position.z;
    liteSelectionRing.scale.setScalar(selectedIndex === 0 ? 1.3 : 1.0);
  } else {
    selectionRings.forEach((ring) => {
      const target = ring.artifactIndex === selectedIndex ? 0.7 + Math.sin(elapsed * 2.1) * 0.1 : 0.12;
      ring.mesh.material.opacity += (target - ring.mesh.material.opacity) * 0.08;
    });
  }

  auraSprites.forEach((sprite, index) => {
    const active = index === selectedIndex;
    const target = active ? 0.16 + Math.sin(elapsed * 1.4) * 0.025 : 0;
    sprite.material.opacity += (target - sprite.material.opacity) * 0.06;
  });

  if (selectedIndex === 0 && centralDais) {
    centralDais.rotation.y = Math.sin(elapsed * 0.13) * 0.008;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updateCameraTween(now);
  if (!cameraTween) controls.update();

  updateAnimation(elapsed, delta);
  updateHotspots();

  if (composer) composer.render();
  else renderer.render(scene, camera);
  if (!sceneReady) {
    sceneReady = true;
    window.setTimeout(() => {
      document.body.classList.add('is-ready');
    }, 80);
  }
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 1.8));
  renderer.setSize(width, height);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
  }
  camera.aspect = width / height;
  if (!isHomeView) {
    const view = getFocusView(selectedIndex);
    camera.fov = view.fov;
  } else {
    camera.fov = getHomeView().fov;
  }
  camera.updateProjectionMatrix();
  setPanel(selectedIndex);
}

window.addEventListener('resize', onResize);

createInterface();
updateSelectionUI(0);
setPanel(0);
const initialView = getHomeView();
camera.position.copy(initialView.position);
camera.fov = initialView.fov;
camera.updateProjectionMatrix();
controls.target.copy(initialView.target);
controls.update();
renderer.domElement.style.cursor = 'grab';
animate(performance.now());
