import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const metals = {
  yellow: {
    name: "18k Yellow Gold",
    shortName: "18k Yellow Gold",
    color: 0xd5ac55,
    roughness: 0.16,
    basePrice: 1480,
    note: "18k yellow gold · Warm, archival, unmistakably classic",
  },
  platinum: {
    name: "950 Platinum",
    shortName: "950 Platinum",
    color: 0xd6dce0,
    roughness: 0.1,
    basePrice: 2150,
    note: "950 platinum · Cool, dense, and naturally white",
  },
  rose: {
    name: "18k Rose Gold",
    shortName: "18k Rose Gold",
    color: 0xd69a84,
    roughness: 0.15,
    basePrice: 1560,
    note: "18k rose gold · Blush warmth with a romantic glow",
  },
};

const state = {
  metal: "yellow",
  width: 4,
  engraving: "J + M · 06.14.26",
  view: "hero",
};

const mount = document.getElementById("canvasMount");
const stageLoader = document.getElementById("stageLoader");
const widthSlider = document.getElementById("widthSlider");
const widthOutput = document.getElementById("widthOutput");
const metalNote = document.getElementById("metalNote");
const priceValue = document.getElementById("priceValue");
const stageSpec = document.getElementById("stageSpec");
const engravingInput = document.getElementById("engravingInput");
const characterCount = document.getElementById("characterCount");
const clearEngraving = document.getElementById("clearEngraving");
const engravingReadout = document.getElementById("engravingReadout");
const toast = document.getElementById("toast");
const compareDialog = document.getElementById("compareDialog");
const viewButtons = [...document.querySelectorAll("[data-view]")];
const metalButtons = [...document.querySelectorAll("[data-metal]")];
const compareButtons = [...document.querySelectorAll("[data-compare-metal]")];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute("aria-label", "Interactive 3D rendering of your wedding band");
renderer.domElement.setAttribute("role", "img");
mount.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment(renderer);
scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.035).texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

const hemisphere = new THREE.HemisphereLight(0xfff3da, 0x182a21, 1.6);
scene.add(hemisphere);

const keyLight = new THREE.DirectionalLight(0xffe7bd, 3.4);
keyLight.position.set(-3.8, 5.2, 5.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 16;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xc5e6da, 2.1);
rimLight.position.set(4.5, 2.4, -3.5);
scene.add(rimLight);

const warmFill = new THREE.PointLight(0xffc873, 18, 14, 2);
warmFill.position.set(-3.2, -1.5, 4);
scene.add(warmFill);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 9),
  new THREE.ShadowMaterial({ color: 0x07110b, opacity: 0.34 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -1.55;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const ringRig = new THREE.Group();
ringRig.position.y = 0.04;
ringRig.rotation.set(-0.37, 0.1, 0.015);
scene.add(ringRig);

const bandMaterial = new THREE.MeshPhysicalMaterial({
  color: metals.yellow.color,
  metalness: 1,
  roughness: metals.yellow.roughness,
  envMapIntensity: 1.55,
  clearcoat: 0.48,
  clearcoatRoughness: 0.12,
});

const engravingMaterial = new THREE.MeshStandardMaterial({
  color: 0x27231b,
  metalness: 0.58,
  roughness: 0.38,
  emissive: 0x17130d,
  emissiveIntensity: 0.18,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});

let font = null;
let bandDepth = 0;
let innerRadius = 1.03;
let geometryTween = null;
let metalTween = null;
let cameraTween = null;
let currentView = "hero";
let exporting = false;
let toastTimer = 0;
let ringTilt = -0.37;
let ringTiltTarget = -0.37;
let ringYaw = 0.1;
let ringYawTarget = 0.1;

const bandMesh = new THREE.Mesh(createBandGeometry(state.width).geometry, bandMaterial);
bandMesh.castShadow = true;
bandMesh.receiveShadow = true;
ringRig.add(bandMesh);

const engravingGroup = new THREE.Group();
ringRig.add(engravingGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 2.15;
controls.maxDistance = 8.8;
controls.minPolarAngle = 0.22;
controls.maxPolarAngle = 2.52;
controls.zoomSpeed = 0.75;
controls.rotateSpeed = 0.65;
controls.target.set(0, 0, 0);
controls.addEventListener("start", () => {
  cameraTween = null;
  controls.enabled = true;
});

camera.position.set(0.12, 0.92, 6.0);
controls.update();

const views = {
  hero: {
    position: new THREE.Vector3(0.12, 0.92, 6.0),
    target: new THREE.Vector3(0, 0, 0),
  },
  front: {
    position: new THREE.Vector3(0, 0.18, 6.3),
    target: new THREE.Vector3(0, 0, 0),
  },
  inside: {
    position: new THREE.Vector3(0.02, 0.82, 3.25),
    target: new THREE.Vector3(0, -0.16, -0.62),
  },
};

function createBandGeometry(width) {
  const outerRadius = 1.29;
  innerRadius = 1.01;
  bandDepth = 0.12 + (width - 2) * 0.077;

  const profile = new THREE.Shape();
  profile.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const opening = new THREE.Path();
  opening.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  profile.holes.push(opening);

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: bandDepth,
    curveSegments: 96,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.027,
    bevelSize: 0.014,
    bevelSegments: 5,
  });

  geometry.translate(0, 0, -bandDepth / 2);
  geometry.computeVertexNormals();

  return { geometry, depth: bandDepth };
}

function rebuildBandGeometry() {
  const next = createBandGeometry(state.width);
  bandMesh.geometry.dispose();
  bandMesh.geometry = next.geometry;
  rebuildEngraving();
  geometryTween = { start: performance.now(), duration: 520 };
}

function clearEngravingMesh() {
  while (engravingGroup.children.length) {
    const child = engravingGroup.children.pop();
    child.geometry?.dispose();
  }
}

function rebuildEngraving() {
  clearEngravingMesh();
  const rawText = state.engraving.trim().replace(/\s+/g, " ").toUpperCase();

  if (!font || !rawText) {
    return;
  }

  const geometry = new TextGeometry(rawText, {
    font,
    size: 0.092,
    height: 0.008,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0008,
    bevelSegments: 1,
  });

  geometry.computeBoundingBox();
  let bounds = geometry.boundingBox;
  const availableArc = 2.02;
  const textWidth = bounds.max.x - bounds.min.x;
  const fitScale = Math.min(1, availableArc / textWidth, (bandDepth * 0.63) / (bounds.max.y - bounds.min.y));
  geometry.scale(fitScale, fitScale, 1);
  geometry.computeBoundingBox();
  bounds = geometry.boundingBox;
  geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, 0);

  const positions = geometry.attributes.position;
  const arcRadius = innerRadius - 0.012;

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index);
    const localY = positions.getY(index);
    const localZ = positions.getZ(index);
    const angle = -Math.PI / 2 + localX / arcRadius;
    const radius = innerRadius - 0.004 - localZ * 0.72;
    positions.setX(index, radius * Math.cos(angle));
    positions.setY(index, radius * Math.sin(angle));
    positions.setZ(index, localY);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const textMesh = new THREE.Mesh(geometry, engravingMaterial);
  textMesh.renderOrder = 3;
  textMesh.castShadow = false;
  engravingGroup.add(textMesh);
}

function formatPrice() {
  const metal = metals[state.metal];
  const price = metal.basePrice + (state.width - 4) * 120;
  return `$${price.toLocaleString("en-US")}`;
}

function updateSpecification() {
  const metal = metals[state.metal];
  stageSpec.textContent = `${metal.shortName} · ${state.width} mm`;
  metalNote.textContent = metal.note;
  priceValue.textContent = formatPrice();
  widthOutput.innerHTML = `${state.width}.0 <small>mm</small>`;
  characterCount.textContent = `${state.engraving.length} / 24`;
  engravingReadout.textContent = state.engraving.trim() || "No engraving yet";
  clearEngraving.classList.toggle("is-hidden", !state.engraving.length);
}

function selectMetal(metalKey) {
  if (!metals[metalKey]) {
    return;
  }

  const previousColor = bandMaterial.color.clone();
  const previousRoughness = bandMaterial.roughness;
  state.metal = metalKey;
  const metal = metals[metalKey];

  metalButtons.forEach((button) => {
    const isSelected = button.dataset.metal === metalKey;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });

  metalTween = {
    start: performance.now(),
    duration: 620,
    fromColor: previousColor,
    toColor: new THREE.Color(metal.color),
    fromRoughness: previousRoughness,
    toRoughness: metal.roughness,
  };

  updateSpecification();
}

function setWidth(nextWidth) {
  state.width = Math.max(2, Math.min(6, Number(nextWidth)));
  widthSlider.value = String(state.width);
  const fill = ((state.width - 2) / 4) * 100;
  widthSlider.style.setProperty("--fill", `${fill}%`);
  rebuildBandGeometry();
  updateSpecification();
}

function setEngraving(nextValue) {
  state.engraving = nextValue.slice(0, 24);
  rebuildEngraving();
  updateSpecification();
}

function setView(viewName, instant = false) {
  const nextView = views[viewName];
  if (!nextView) {
    return;
  }

  currentView = viewName;
  state.view = viewName;
  ringTiltTarget = viewName === "inside" ? 1.36 : -0.37;
  ringYawTarget = viewName === "inside" ? 0 : 0.1;
  viewButtons.forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (instant || reducedMotion) {
    camera.position.copy(nextView.position);
    controls.target.copy(nextView.target);
    controls.update();
    return;
  }

  controls.enabled = false;
  cameraTween = {
    start: performance.now(),
    duration: 940,
    fromPosition: camera.position.clone(),
    toPosition: nextView.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: nextView.target.clone(),
  };
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function updateCameraTween(now) {
  if (!cameraTween) {
    return;
  }

  const progress = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
  const eased = easeInOutCubic(progress);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  controls.update();

  if (progress >= 1) {
    cameraTween = null;
    controls.enabled = true;
  }
}

function updateMetalTween(now) {
  if (!metalTween) {
    return;
  }

  const progress = Math.min((now - metalTween.start) / metalTween.duration, 1);
  const eased = easeInOutCubic(progress);
  bandMaterial.color.lerpColors(metalTween.fromColor, metalTween.toColor, eased);
  bandMaterial.roughness = THREE.MathUtils.lerp(metalTween.fromRoughness, metalTween.toRoughness, eased);

  if (progress >= 1) {
    bandMaterial.color.copy(metalTween.toColor);
    bandMaterial.roughness = metalTween.toRoughness;
    metalTween = null;
  }
}

function updateGeometryTween(now) {
  if (!geometryTween) {
    ringRig.scale.setScalar(1);
    return;
  }

  const progress = Math.min((now - geometryTween.start) / geometryTween.duration, 1);
  const pulse = Math.sin(progress * Math.PI) * 0.015;
  ringRig.scale.setScalar(1 + pulse);

  if (progress >= 1) {
    geometryTween = null;
    ringRig.scale.setScalar(1);
  }
}

function showToast() {
  window.clearTimeout(toastTimer);
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2900);
}

function drawExportBackground(context, width, height) {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#30453a");
  background.addColorStop(0.5, "#1b2a23");
  background.addColorStop(1, "#111d17");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width * 0.42);
  glow.addColorStop(0, "rgba(170, 184, 156, 0.27)");
  glow.addColorStop(0.48, "rgba(180, 158, 108, 0.07)");
  glow.addColorStop(1, "rgba(10, 18, 13, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const archWidth = 710;
  const archHeight = 910;
  const archX = (width - archWidth) / 2;
  const archTop = 120;
  context.beginPath();
  context.moveTo(archX, archTop + archHeight);
  context.lineTo(archX, archTop + archWidth / 2);
  context.bezierCurveTo(archX, archTop + archWidth * 0.18, archX + archWidth * 0.18, archTop, archX + archWidth / 2, archTop);
  context.bezierCurveTo(archX + archWidth * 0.82, archTop, archX + archWidth, archTop + archWidth * 0.18, archX + archWidth, archTop + archWidth / 2);
  context.lineTo(archX + archWidth, archTop + archHeight);
  context.closePath();
  const archFill = context.createLinearGradient(0, archTop, 0, archTop + archHeight);
  archFill.addColorStop(0, "rgba(255, 248, 234, 0.095)");
  archFill.addColorStop(1, "rgba(255, 248, 234, 0.012)");
  context.fillStyle = archFill;
  context.fill();
  context.strokeStyle = "rgba(244, 236, 221, 0.14)";
  context.lineWidth = 2;
  context.stroke();

  context.strokeStyle = "rgba(244, 236, 221, 0.1)";
  context.lineWidth = 1;
  context.strokeRect(38, 38, width - 76, height - 76);
}

function drawExportTypography(context, width, height) {
  const metal = metals[state.metal];
  const engraving = state.engraving.trim().toUpperCase();

  context.fillStyle = "#faf6ee";
  context.font = '400 56px "Times New Roman", Times, serif';
  context.fillText("VOW.", 82, 116);
  context.fillStyle = "rgba(246, 239, 226, 0.54)";
  context.font = '600 12px "Helvetica Neue", Arial, sans-serif';
  context.fillText("THE WEDDING BAND ATELIER", 84, 145);

  context.textAlign = "right";
  context.fillStyle = "rgba(246, 239, 226, 0.56)";
  context.fillText("MADE TO BE WORN, FOREVER", width - 82, 110);
  context.textAlign = "left";

  context.strokeStyle = "rgba(246, 239, 226, 0.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(82, height - 172);
  context.lineTo(width - 82, height - 172);
  context.stroke();

  context.fillStyle = "#faf6ee";
  context.font = '400 35px "Times New Roman", Times, serif';
  context.fillText("The Signature Band", 82, height - 112);
  context.fillStyle = "rgba(246, 239, 226, 0.62)";
  context.font = '600 12px "Helvetica Neue", Arial, sans-serif';
  context.fillText(`${metal.name.toUpperCase()}  ·  ${state.width} MM  ·  COMFORT FIT`, 84, height - 82);

  context.textAlign = "right";
  context.fillStyle = "rgba(246, 239, 226, 0.47)";
  context.font = '600 11px "Helvetica Neue", Arial, sans-serif';
  context.fillText("ENGRAVED INSIDE", width - 82, height - 116);
  context.fillStyle = "#ead6aa";
  context.font = '400 23px "Times New Roman", Times, serif';
  context.fillText(engraving || "No engraving", width - 82, height - 86);
  context.textAlign = "left";
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

async function downloadDesign() {
  if (exporting) {
    return;
  }

  exporting = true;
  const previousPosition = camera.position.clone();
  const previousTarget = controls.target.clone();
  const previousAspect = camera.aspect;
  const previousPixelRatio = renderer.getPixelRatio();
  const previousSize = new THREE.Vector2();
  const previousRingRotation = ringRig.rotation.clone();
  const previousRingPosition = ringRig.position.clone();
  const previousTilt = ringTilt;
  const previousYaw = ringYaw;
  renderer.getSize(previousSize);

  try {
    const width = 1800;
    const height = 1200;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.copy(views.hero.position);
    controls.target.copy(views.hero.target);
    ringTilt = -0.37;
    ringTiltTarget = -0.37;
    ringYaw = 0.1;
    ringYawTarget = 0.1;
    ringRig.rotation.set(-0.37, 0.1, 0.015);
    ringRig.position.y = 0.04;
    camera.updateProjectionMatrix();
    controls.update();
    renderer.render(scene, camera);

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    drawExportBackground(context, width, height);
    context.drawImage(renderer.domElement, 0, 0, width, height);
    drawExportTypography(context, width, height);

    const blob = await canvasToBlob(output);
    if (!blob) {
      throw new Error("The image could not be created.");
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `VOW-signature-band-${state.metal}-${state.width}mm.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
    showToast();
  } catch (error) {
    console.error(error);
  } finally {
    renderer.setPixelRatio(previousPixelRatio);
    renderer.setSize(previousSize.x, previousSize.y, false);
    camera.aspect = previousAspect;
    camera.position.copy(previousPosition);
    controls.target.copy(previousTarget);
    ringTilt = previousTilt;
    ringTiltTarget = currentView === "inside" ? 1.36 : -0.37;
    ringYaw = previousYaw;
    ringYawTarget = currentView === "inside" ? 0 : 0.1;
    ringRig.rotation.copy(previousRingRotation);
    ringRig.position.copy(previousRingPosition);
    camera.updateProjectionMatrix();
    controls.update();
    renderer.render(scene, camera);
    exporting = false;
  }
}

metalButtons.forEach((button) => {
  button.addEventListener("click", () => selectMetal(button.dataset.metal));
});

compareButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectMetal(button.dataset.compareMetal);
    compareDialog.close();
    setView("hero");
  });
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

widthSlider.addEventListener("input", (event) => setWidth(event.target.value));

engravingInput.addEventListener("input", (event) => {
  setEngraving(event.target.value);
});

engravingInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    engravingInput.blur();
    setView("inside");
  }
});

clearEngraving.addEventListener("click", () => {
  engravingInput.value = "";
  setEngraving("");
  engravingInput.focus();
});

document.getElementById("insideButton").addEventListener("click", () => setView("inside"));
document.getElementById("engravingReadoutButton").addEventListener("click", () => setView("inside"));
document.getElementById("downloadMain").addEventListener("click", downloadDesign);
document.getElementById("downloadTop").addEventListener("click", downloadDesign);

document.getElementById("compareButton").addEventListener("click", () => {
  if (typeof compareDialog.showModal === "function") {
    compareDialog.showModal();
  } else {
    compareDialog.setAttribute("open", "");
  }
});

document.getElementById("closeCompare").addEventListener("click", () => compareDialog.close());

compareDialog.addEventListener("click", (event) => {
  if (event.target === compareDialog) {
    compareDialog.close();
  }
});

const resizeObserver = new ResizeObserver(() => {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(mount);

const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  const now = performance.now();

  if (!reducedMotion) {
    ringTilt += (ringTiltTarget - ringTilt) * 0.058;
    ringYaw += (ringYawTarget - ringYaw) * 0.058;
    ringRig.position.y = 0.04 + Math.sin(elapsed * 0.72) * 0.018;
    ringRig.rotation.x = ringTilt + Math.sin(elapsed * 0.38) * 0.012;
    ringRig.rotation.y = ringYaw + Math.sin(elapsed * 0.46) * 0.024;
    ringRig.rotation.z = 0.015 + Math.sin(elapsed * 0.29) * 0.008;
  }

  updateCameraTween(now);
  updateMetalTween(now);
  updateGeometryTween(now);
  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    renderer.domElement.style.opacity = "1";
    window.setTimeout(() => stageLoader.classList.add("is-loaded"), 720);
  }
}

renderer.domElement.style.opacity = "0";
renderer.domElement.style.transition = "opacity 700ms ease";

new FontLoader().load(
  "./node_modules/three/examples/fonts/optimer_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    rebuildEngraving();
  },
  undefined,
  (error) => {
    console.error("Unable to load engraving font", error);
  },
);

updateSpecification();
widthSlider.style.setProperty("--fill", "50%");
viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.classList.contains("active"))));
animate();
