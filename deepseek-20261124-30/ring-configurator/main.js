import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const METALS = {
  yellow: {
    name: '18k Yellow Gold',
    shortName: 'Yellow gold',
    color: '#cfa65d',
    roughness: 0.17,
    clearcoat: 0.32,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.55,
    engraving: '#5b4224'
  },
  platinum: {
    name: 'PT950 Platinum',
    shortName: 'Platinum',
    color: '#d5d8d6',
    roughness: 0.2,
    clearcoat: 0.22,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.72,
    engraving: '#504f4b'
  },
  rose: {
    name: '18k Rose Gold',
    shortName: 'Rose gold',
    color: '#c99079',
    roughness: 0.18,
    clearcoat: 0.3,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.58,
    engraving: '#5b3629'
  }
};

const DEFAULTS = {
  metal: 'yellow',
  width: 4.5,
  engraving: 'To have & to hold'
};

const state = {
  metal: DEFAULTS.metal,
  width: DEFAULTS.width,
  engraving: DEFAULTS.engraving,
  view: 'profile'
};

const canvas = document.querySelector('#ringCanvas');
const stage = document.querySelector('#canvasStage');
const viewer = document.querySelector('.viewer');
const metalName = document.querySelector('#metalName');
const metalSpec = document.querySelector('#metalSpec');
const widthSpec = document.querySelector('#widthSpec');
const widthInput = document.querySelector('#widthRange');
const widthValue = document.querySelector('#widthValue');
const engravingInput = document.querySelector('#engravingInput');
const characterCount = document.querySelector('#characterCount');
const arcPath = document.querySelector('#arcText textPath');
const engravingCard = document.querySelector('#engravingCard');
const downloadButton = document.querySelector('#downloadButton');
const resetButton = document.querySelector('#resetButton');
const dragHint = document.querySelector('#dragHint');
const toast = document.querySelector('#toast');
const toastText = document.querySelector('#toastText');
const viewTabs = [...document.querySelectorAll('[data-view]')];
const metalButtons = [...document.querySelectorAll('[data-metal]')];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer = 0;
let renderer;
let scene;
let camera;
let controls;
let ringGroup;
let ringMesh;
let engravingMesh;
let metalMaterial;
let engravingTexture;
let engravingCanvas;
let engravingContext;
let currentWidthScale = 1;
let targetWidthScale = 1;
let viewTween = null;
let introStartedAt = 0;
let lastInteraction = 0;
let activeFrame = 0;
let hasRendered = false;

const cameraViews = {
  profile: {
    position: new THREE.Vector3(0.48, 1.28, 5.9),
    target: new THREE.Vector3(0, 0, 0)
  },
  inside: {
    position: new THREE.Vector3(0.14, 2.35, 5.15),
    target: new THREE.Vector3(0, -0.06, 0)
  }
};

function widthToScale(mm) {
  return 0.82 + ((mm - 2) / 6) * 2.18;
}

function setProgress(value = state.width) {
  const progress = ((value - 2) / 6) * 100;
  widthInput.style.setProperty('--progress', `${progress}%`);
}

function formatWidth(value) {
  return `${Number(value).toFixed(1)} mm`;
}

function updateCount() {
  const length = [...engravingInput.value].length;
  characterCount.textContent = `${length} / 28`;
}

function drawEngraving() {
  if (!engravingContext || !engravingTexture) return;

  const text = state.engraving.trim();
  const width = engravingCanvas.width;
  const height = engravingCanvas.height;
  const ctx = engravingContext;

  ctx.clearRect(0, 0, width, height);

  if (!text) {
    engravingTexture.needsUpdate = true;
    if (engravingMesh) engravingMesh.visible = false;
    return;
  }

  if (engravingMesh) engravingMesh.visible = true;

  let fontSize = 105;
  let tracking = 8;
  let metrics;

  const measure = () => {
    ctx.font = `italic ${fontSize}px "Aurel Serif", "Times New Roman", serif`;
    const chars = [...text];
    const widths = chars.map((char) => ctx.measureText(char).width);
    const total = widths.reduce((sum, item) => sum + item, 0) + tracking * Math.max(0, chars.length - 1);
    return { chars, widths, total };
  };

  metrics = measure();
  while (metrics.total > width * 0.82 && fontSize > 34) {
    fontSize -= 2;
    tracking = Math.max(2, tracking - 0.15);
    metrics = measure();
  }

  const centerX = width / 2;
  const baseline = height * 0.64;
  let cursorX = centerX - metrics.total / 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic ${fontSize}px "Aurel Serif", "Times New Roman", serif`;

  ctx.fillStyle = 'rgba(255, 249, 233, 0.42)';
  metrics.chars.forEach((char, index) => {
    ctx.fillText(char, cursorX + 1.5, baseline + 2.5);
    cursorX += metrics.widths[index] + tracking;
  });

  cursorX = centerX - metrics.total / 2;
  ctx.fillStyle = METALS[state.metal].engraving;
  metrics.chars.forEach((char, index) => {
    ctx.fillText(char, cursorX, baseline);
    cursorX += metrics.widths[index] + tracking;
  });

  engravingTexture.needsUpdate = true;
}

function setMetal(metalKey, announce = false) {
  const metal = METALS[metalKey];
  if (!metal) return;

  state.metal = metalKey;

  metalButtons.forEach((button) => {
    const isActive = button.dataset.metal === metalKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-checked', String(isActive));
  });

  metalName.textContent = metal.name;
  metalSpec.textContent = metal.name;

  if (metalMaterial) {
    metalMaterial.color.set(metal.color);
    metalMaterial.roughness = metal.roughness;
    metalMaterial.clearcoat = metal.clearcoat;
    metalMaterial.clearcoatRoughness = metal.clearcoatRoughness;
    metalMaterial.envMapIntensity = metal.envMapIntensity;
    metalMaterial.needsUpdate = true;
  }

  drawEngraving();

  if (announce) {
    showToast(`${metal.shortName} selected`);
  }
}

function setWidth(value, announce = false) {
  state.width = Number(value);
  widthInput.value = String(state.width);
  widthValue.textContent = formatWidth(state.width);
  widthSpec.textContent = `${formatWidth(state.width)} width`;
  setProgress(state.width);
  targetWidthScale = widthToScale(state.width);

  if (announce) {
    showToast(`Width set to ${formatWidth(state.width)}`);
  }
}

function setEngraving(value) {
  state.engraving = value;
  engravingInput.value = value;
  updateCount();
  arcPath.textContent = value.trim() || 'Your inscription';
  drawEngraving();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastText.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2300);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function beginViewTransition(name) {
  const view = cameraViews[name];
  if (!view || !camera) return;

  viewTween = {
    start: performance.now(),
    duration: reducedMotion ? 1 : 950,
    fromPosition: camera.position.clone(),
    toPosition: view.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: view.target.clone()
  };

  if (controls) controls.enabled = false;
}

function setView(name, announce = false) {
  if (!cameraViews[name]) return;

  state.view = name;
  viewTabs.forEach((tab) => {
    const isActive = tab.dataset.view === name;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  beginViewTransition(name);

  if (announce) {
    showToast(name === 'inside' ? 'Inside engraving view' : 'Profile view');
  }
}

function createRingScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.copy(cameraViews.profile.position);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment(renderer);
  const environmentTexture = pmremGenerator.fromScene(environment, 0.035).texture;
  scene.environment = environmentTexture;

  environment.dispose();
  pmremGenerator.dispose();

  const hemisphere = new THREE.HemisphereLight(0xfff8ea, 0x7d6b53, 1.8);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xfff1d9, 3.4);
  keyLight.position.set(-4.5, 5.5, 7);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdce8f5, 1.65);
  fillLight.position.set(5.5, 1.5, 4.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffdfad, 2.15);
  rimLight.position.set(1.5, 3.5, -6);
  scene.add(rimLight);

  ringGroup = new THREE.Group();
  ringGroup.rotation.set(0.04, -0.16, -0.07);
  scene.add(ringGroup);

  const ringRadius = 1.24;
  const tubeRadius = 0.148;
  const ringGeometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 64, 320);
  ringGeometry.computeVertexNormals();

  metalMaterial = new THREE.MeshPhysicalMaterial({
    color: METALS[state.metal].color,
    metalness: 1,
    roughness: METALS[state.metal].roughness,
    clearcoat: METALS[state.metal].clearcoat,
    clearcoatRoughness: METALS[state.metal].clearcoatRoughness,
    envMapIntensity: METALS[state.metal].envMapIntensity
  });

  ringMesh = new THREE.Mesh(ringGeometry, metalMaterial);
  ringGroup.add(ringMesh);

  engravingCanvas = document.createElement('canvas');
  engravingCanvas.width = 2048;
  engravingCanvas.height = 256;
  engravingContext = engravingCanvas.getContext('2d');

  engravingTexture = new THREE.CanvasTexture(engravingCanvas);
  engravingTexture.colorSpace = THREE.SRGBColorSpace;
  engravingTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  engravingTexture.minFilter = THREE.LinearMipmapLinearFilter;
  engravingTexture.magFilter = THREE.LinearFilter;
  engravingTexture.generateMipmaps = true;

  const innerRadius = ringRadius - tubeRadius;
  const engravingArc = 1.54;
  const engravingGeometry = new THREE.CylinderGeometry(
    innerRadius - 0.002,
    innerRadius - 0.002,
    0.168,
    128,
    1,
    true,
    -engravingArc / 2,
    engravingArc
  );
  engravingGeometry.rotateX(Math.PI / 2);

  const engravingMaterial = new THREE.MeshBasicMaterial({
    map: engravingTexture,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    alphaTest: 0.02
  });

  engravingMesh = new THREE.Mesh(engravingGeometry, engravingMaterial);
  engravingMesh.renderOrder = 4;
  ringGroup.add(engravingMesh);

  drawEngraving();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => drawEngraving());
  }

  currentWidthScale = widthToScale(state.width);
  targetWidthScale = currentWidthScale;
  ringMesh.scale.z = currentWidthScale;
  engravingMesh.scale.z = currentWidthScale;

  controls = new OrbitControls(camera, canvas);
  controls.target.copy(cameraViews.profile.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.48;
  controls.minPolarAngle = Math.PI * 0.3;
  controls.maxPolarAngle = Math.PI * 0.58;
  controls.minAzimuthAngle = -Math.PI * 0.22;
  controls.maxAzimuthAngle = Math.PI * 0.22;
  controls.update();

  controls.addEventListener('start', () => {
    viewTween = null;
    controls.enabled = true;
    dragHint.style.opacity = '0';
  });

  controls.addEventListener('end', () => {
    lastInteraction = performance.now();
    window.setTimeout(() => {
      if (performance.now() - lastInteraction > 500) {
        dragHint.style.opacity = '';
      }
    }, 700);
  });

  resizeScene();

  const resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(stage);
  window.addEventListener('resize', resizeScene);

  introStartedAt = performance.now();
  ringGroup.scale.setScalar(reducedMotion ? 1 : 0.91);

  renderer.setAnimationLoop(renderFrame);
}

function resizeScene() {
  if (!renderer || !camera) return;

  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function renderFrame(time) {
  activeFrame = time;

  const elapsed = Math.max(0, (time - introStartedAt) / 1000);
  const intro = reducedMotion ? 1 : easeInOutCubic(Math.min(1, elapsed / 1.25));
  const introScale = 0.91 + intro * 0.09;
  ringGroup.scale.setScalar(introScale);

  if (!reducedMotion) {
    const idle = time * 0.001;
    ringGroup.rotation.x = 0.04 + Math.sin(idle * 0.38) * 0.023;
    ringGroup.rotation.y = -0.16 + Math.sin(idle * 0.31) * 0.048;
    ringGroup.rotation.z = -0.07 + Math.sin(idle * 0.24) * 0.018;
    ringGroup.position.y = Math.sin(idle * 0.55) * 0.018;
  }

  currentWidthScale += (targetWidthScale - currentWidthScale) * 0.095;
  ringMesh.scale.z = currentWidthScale;
  engravingMesh.scale.z = currentWidthScale;

  if (viewTween) {
    const progress = Math.min(1, (performance.now() - viewTween.start) / viewTween.duration);
    const eased = easeInOutCubic(progress);
    camera.position.lerpVectors(viewTween.fromPosition, viewTween.toPosition, eased);
    controls.target.lerpVectors(viewTween.fromTarget, viewTween.toTarget, eased);
    camera.lookAt(controls.target);

    if (progress >= 1) {
      camera.position.copy(viewTween.toPosition);
      controls.target.copy(viewTween.toTarget);
      viewTween = null;
      controls.enabled = true;
      controls.update();
    }
  } else {
    controls.update();
  }

  renderer.render(scene, camera);

  if (!hasRendered) {
    hasRendered = true;
    canvas.classList.add('ready');
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function downloadDesign() {
  if (!renderer || downloadButton.classList.contains('is-exporting')) return;

  downloadButton.classList.add('is-exporting');
  downloadButton.querySelector('span').textContent = 'Preparing image';
  let restoreExportState = null;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    drawEngraving();

    const width = 1600;
    const height = 1200;

    const savedPixelRatio = renderer.getPixelRatio();
    const savedGroupRotation = ringGroup.rotation.clone();
    const savedGroupScale = ringGroup.scale.clone();
    const savedGroupY = ringGroup.position.y;
    const savedWidthScale = currentWidthScale;

    restoreExportState = () => {
      ringGroup.rotation.copy(savedGroupRotation);
      ringGroup.scale.copy(savedGroupScale);
      ringGroup.position.y = savedGroupY;
      currentWidthScale = savedWidthScale;
      renderer.setPixelRatio(savedPixelRatio);
      resizeScene();
      renderer.render(scene, camera);
    };

    currentWidthScale = targetWidthScale;
    ringMesh.scale.z = targetWidthScale;
    engravingMesh.scale.z = targetWidthScale;
    ringGroup.scale.setScalar(1);
    ringGroup.rotation.set(0.04, -0.16, -0.07);
    ringGroup.position.y = 0;

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const ctx = output.getContext('2d');

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#f8f4ed');
    background.addColorStop(0.48, '#eee8de');
    background.addColorStop(1, '#ded5c8');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.52, height * 0.45, 20, width * 0.52, height * 0.45, width * 0.42);
    glow.addColorStop(0, 'rgba(255, 253, 247, 0.92)');
    glow.addColorStop(0.66, 'rgba(255, 251, 243, 0.12)');
    glow.addColorStop(1, 'rgba(165, 145, 115, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(74, 62, 43, 0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.42, width * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.42, width * 0.43, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.27)';
    ctx.stroke();

    const shadow = ctx.createRadialGradient(width * 0.52, height * 0.73, 12, width * 0.52, height * 0.73, width * 0.22);
    shadow.addColorStop(0, 'rgba(62, 47, 28, 0.17)');
    shadow.addColorStop(0.45, 'rgba(62, 47, 28, 0.05)');
    shadow.addColorStop(1, 'rgba(62, 47, 28, 0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(width * 0.22, height * 0.65, width * 0.6, height * 0.17);

    const source = renderer.domElement;
    ctx.drawImage(source, 0, 0, width, height);

    ctx.strokeStyle = 'rgba(45, 40, 32, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(34.5, 34.5, width - 69, height - 69);

    ctx.fillStyle = '#1e1d1a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 36px "Aurel Serif", "Times New Roman", serif';
    ctx.fillText('AUREL', 68, 92);
    ctx.font = '500 11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(55, 51, 44, 0.68)';
    ctx.letterSpacing = '4px';
    ctx.fillText('ATELIER · NEW YORK', 69, 114);

    ctx.textAlign = 'right';
    ctx.font = '500 10px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(55, 51, 44, 0.58)';
    ctx.fillText('WEDDING BAND · NO. 03', width - 68, 91);
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), width - 68, 111);

    const meta = METALS[state.metal];
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(55, 51, 44, 0.66)';
    ctx.font = '500 10px "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('YOUR DESIGN', 68, height - 158);

    ctx.fillStyle = '#1e1d1a';
    ctx.font = '400 36px "Aurel Serif", "Times New Roman", serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(meta.name, 68, height - 116);

    ctx.fillStyle = 'rgba(55, 51, 44, 0.64)';
    ctx.font = '500 10px "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '2.5px';
    ctx.fillText(`${formatWidth(state.width)}  /  COMFORT-FIT INTERIOR  /  HAND-FINISHED`, 68, height - 91);

    const inscription = state.engraving.trim();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(55, 51, 44, 0.6)';
    ctx.font = '500 9px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('INSIDE ENGRAVING', width - 68, height - 158);
    ctx.fillStyle = '#745a39';
    ctx.font = 'italic 24px "Aurel Serif", "Times New Roman", serif';
    ctx.fillText(inscription ? `“${inscription}”` : 'No inscription', width - 68, height - 116);

    ctx.strokeStyle = 'rgba(55, 51, 44, 0.2)';
    ctx.beginPath();
    ctx.moveTo(68, height - 70);
    ctx.lineTo(width - 68, height - 70);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(55, 51, 44, 0.52)';
    ctx.font = 'italic 14px "Aurel Serif", "Times New Roman", serif';
    ctx.letterSpacing = '0px';
    ctx.fillText('Made to be worn, and kept, forever.', 68, height - 46);

    ctx.textAlign = 'right';
    ctx.font = '500 8px "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '2.4px';
    ctx.fillText('AUREL ATELIER.COM', width - 68, height - 46);

    const dataUrl = output.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `aurel-wedding-band-${state.metal}-${formatWidth(state.width).replace(' ', '')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast('Your design has been saved');
  } catch (error) {
    console.error('Unable to export design:', error);
    showToast('Unable to save. Please try again.');
  } finally {
    if (restoreExportState) restoreExportState();
    downloadButton.classList.remove('is-exporting');
    downloadButton.querySelector('span').textContent = 'Download your design';
  }
}

function resetDesign() {
  setMetal(DEFAULTS.metal);
  setWidth(DEFAULTS.width);
  setEngraving(DEFAULTS.engraving);
  setView('profile');
  showToast('Design reset to the original');
}

metalButtons.forEach((button) => {
  button.addEventListener('click', () => setMetal(button.dataset.metal));
});

widthInput.addEventListener('input', (event) => {
  setWidth(event.target.value);
});

engravingInput.addEventListener('input', (event) => {
  setEngraving(event.target.value);
});

viewTabs.forEach((tab) => {
  tab.addEventListener('click', () => setView(tab.dataset.view));
});

downloadButton.addEventListener('click', downloadDesign);
resetButton.addEventListener('click', resetDesign);

setWidth(DEFAULTS.width);
setEngraving(DEFAULTS.engraving);
updateCount();
setProgress();
try {
  createRingScene();
} catch (error) {
  console.error('WebGL preview unavailable:', error);
  document.body.classList.add('no-webgl');
  canvas.classList.remove('ready');
  showToast('Static preview shown');
}

window.addEventListener('pagehide', () => {
  if (renderer) {
    renderer.setAnimationLoop(null);
    renderer.dispose();
  }
});
