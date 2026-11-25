import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const STEPS = [
  {
    nav: "Deflate",
    navSub: "Release the air",
    eyebrow: "Start here",
    title: "Let the air out",
    icon: "icon-deflate",
    instruction:
      "Remove the valve cap and press the valve core to release all the air. A flat tube is easier to work with.",
    note: "Catch the valve cap in your parts tray. It is small enough to vanish under a workbench.",
    pressure: "0 psi",
    pressureHint: "Flat and ready to work",
    pressureFill: 0,
    status: "Air released",
    captionKicker: "WHEEL SYSTEM",
    captionTitle: "Tube seated inside tire",
    captionBody: "The cutaway shows the tube resting inside the tire casing, above the rim bed.",
  },
  {
    nav: "Unseat",
    navSub: "Free one bead",
    eyebrow: "Access the tube",
    title: "Unseat one bead",
    icon: "icon-lever",
    instruction:
      "Slide a tire lever under one bead. Hook it to a spoke, then ease that side of the tire over the rim.",
    note: "Work one side only. The second bead can stay seated until the tube is out.",
    pressure: "0 psi",
    pressureHint: "Keep the tube flat",
    pressureFill: 0,
    status: "Bead unseated",
    captionKicker: "BEAD & RIM",
    captionTitle: "One bead has left the rim",
    captionBody: "The bead is the tire edge that snaps into the rim. Only one side needs to come off.",
  },
  {
    nav: "Remove",
    navSub: "Lift out tube",
    eyebrow: "Free the tube",
    title: "Ease out the tube",
    icon: "icon-remove",
    instruction:
      "Push the valve through the rim, then lift the tube out opposite the valve and work carefully around the wheel.",
    note: "Keep the valve with the tube. Check the inside of the tire before you refit anything.",
    pressure: "0 psi",
    pressureHint: "Tube free, no pressure",
    pressureFill: 0,
    status: "Tube removed",
    captionKicker: "INNER TUBE",
    captionTitle: "Tube lifted clear of the wheel",
    captionBody: "The tube comes out valve-last so the stem does not snag on the rim.",
  },
  {
    nav: "Find leak",
    navSub: "Locate puncture",
    eyebrow: "Diagnose the leak",
    title: "Find the puncture",
    icon: "icon-locate",
    instruction:
      "Add a little air and trace the tube with your ear, fingertips, or soapy water. Mark the leak as soon as you find it.",
    note: "Check the tire casing at the same clock position for the object that caused the puncture.",
    pressure: "20 psi",
    pressureHint: "Just enough to reveal the leak",
    pressureFill: 30,
    status: "Puncture found",
    captionKicker: "PUNCTURE CHECK",
    captionTitle: "Leak located and marked",
    captionBody: "Bubbles or a hiss reveal the puncture. Mark it before the tube dries.",
  },
  {
    nav: "Patch",
    navSub: "Apply repair",
    eyebrow: "Make it hold",
    title: "Patch the puncture",
    icon: "icon-patch",
    instruction:
      "Roughen the area, apply a thin layer of cement, let it turn tacky, press the patch on, and hold it firmly.",
    note: "Do not touch the sticky side of the patch or rush the cement. A dry bond will lift later.",
    pressure: "0 psi",
    pressureHint: "Patch bonds best on a flat tube",
    pressureFill: 0,
    status: "Patch applied",
    captionKicker: "TUBE REPAIR",
    captionTitle: "Patch pressed onto the tube",
    captionBody: "A clean, tacky surface makes the patch bond. Hold it firmly before reinstalling.",
  },
  {
    nav: "Refit",
    navSub: "Seat & inflate",
    eyebrow: "Finish the repair",
    title: "Refit and inflate",
    icon: "icon-refit",
    instruction:
      "Tuck the tube in, seat both tire beads evenly, then inflate in small steps and check the bead line all the way around.",
    note: "A bulging or uneven bead line means the tube is pinched. Stop and reset it before adding more air.",
    pressure: "45 psi",
    pressureHint: "Check the bead line before adding more",
    pressureFill: 62,
    status: "Wheel reassembled",
    captionKicker: "READY TO RIDE",
    captionTitle: "Bead reseated, wheel ready",
    captionBody: "Both bead lines sit evenly above the rim. Inflate slowly and recheck.",
  },
];

const PART_TASKS = [
  {
    part: "tube",
    prompt: "Find the inner tube",
    copy: "Tap the soft ring that holds the air. Look through the cutaway in the tire.",
    guidance: "The tube is the warm orange ring resting inside the tire casing.",
  },
  {
    part: "rim",
    prompt: "Find the rim",
    copy: "Tap the metal hoop that the tire bead seats against.",
    guidance: "Look for the silver band between the spokes and the tire.",
  },
  {
    part: "valve",
    prompt: "Find the valve",
    copy: "Tap the small stem where air enters and leaves the tube.",
    guidance: "The valve is the slim metal stem near the lower edge of the wheel.",
  },
];

const ORDER_IDS = ["deflate", "unseat", "remove", "locate", "patch", "refit"];
const ORDER_LABELS = {
  deflate: "Deflate the tube",
  unseat: "Unseat one tire bead",
  remove: "Ease out the inner tube",
  locate: "Locate the puncture",
  patch: "Patch the puncture",
  refit: "Refit and inflate",
};
const PART_NAMES = {
  tire: "tire",
  tube: "inner tube",
  rim: "rim",
  spoke: "spoke",
  hub: "hub",
  valve: "valve",
};
const PART_NOTES = {
  tire: "Tire — the outer rubber that meets the road.",
  tube: "Inner tube — holds the air inside the tire.",
  rim: "Rim — the metal hoop the tire bead seats against.",
  spoke: "Spokes — carry load from the hub to the rim.",
  hub: "Hub — the axle and bearing centre.",
  valve: "Valve — lets air in and out of the tube.",
};

const appShell = document.querySelector(".app-shell");
const lessonCard = document.querySelector("#lessonCard");
const practicePanel = document.querySelector("#practicePanel");
const practiceBody = document.querySelector("#practiceBody");
const practiceButton = document.querySelector("#practiceButton");
const practiceClose = document.querySelector("#practiceClose");
const stepKicker = document.querySelector("#stepKicker");
const stepIconUse = document.querySelector("#stepIcon use");
const stepNumber = document.querySelector("#stepNumber");
const stepBadge = document.querySelector(".step-badge");
const stepEyebrow = document.querySelector("#stepEyebrow");
const stepTitle = document.querySelector("#stepTitle");
const stepInstruction = document.querySelector("#stepInstruction");
const benchNote = document.querySelector("#benchNote");
const pressureValue = document.querySelector("#pressureValue");
const pressureHint = document.querySelector("#pressureHint");
const pressureFill = document.querySelector("#pressureFill");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const nextLabel = document.querySelector("#nextLabel");
const replayButton = document.querySelector("#replayButton");
const railTrack = document.querySelector("#railTrack");
const railProgress = document.querySelector("#railProgress");
const labelsButton = document.querySelector("#labelsButton");
const resetViewButton = document.querySelector("#resetViewButton");
const pauseButton = document.querySelector("#pauseButton");
const pauseLabel = pauseButton.querySelector(".utility-label");
const mount = document.querySelector("#sceneMount");
const canvasWrap = document.querySelector("#canvasWrap");
const modelStatus = document.querySelector("#modelStatus");
const modelStatusText = document.querySelector("#modelStatusText");
const captionKicker = document.querySelector("#captionKicker");
const captionTitle = document.querySelector("#captionTitle");
const captionBody = document.querySelector("#captionBody");
const rotateHint = document.querySelector("#rotateHint");
const toastElement = document.querySelector("#toast");

let toastTimer = 0;
let currentStep = 0;
let labelsEnabled = true;
let paused = false;
let showTime = 0;
let lastFrameTime = performance.now();
let activePracticeMode = false;
let resizeQueued = false;

const practice = {
  open: false,
  phase: "identify",
  partIndex: 0,
  answerGiven: false,
  feedback: null,
  feedbackType: "",
  partMistakes: 0,
  order: [],
  shuffledOrder: [],
  orderResult: null,
  orderAttempts: 0,
  orderMistakes: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function angleDistance(a, b) {
  const full = Math.PI * 2;
  return Math.abs((((a - b) % full) + full + full / 2) % full - full / 2);
}

function shuffle(values) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }
  return list;
}

function makeShuffledOrder() {
  let order = shuffle(ORDER_IDS);
  if (order.every((id, index) => id === ORDER_IDS[index])) order = shuffle(ORDER_IDS);
  return order;
}

function showToast(message, duration = 2600) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toastElement.classList.remove("is-visible"), duration);
}

/* --------------------------------------------------------------------------
   Wheel model
   -------------------------------------------------------------------------- */

const WHEEL_RADIUS = 2.61;
const TIRE_MAJOR = 2.18;
const TIRE_TUBE = 0.43;
const CUT_GAP = 1.13;
const CUT_CENTER = 0.72;
const TIRE_ARC = Math.PI * 2 - CUT_GAP;
const TIRE_START = CUT_CENTER + CUT_GAP / 2;
const TUBE_MAJOR = 1.92;
const TUBE_RADIUS = 0.185;
const VALVE_ANGLE = 5.33;
const PUNCTURE_ANGLE = 2.28;

function makeRoundedRect(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createRod(start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function makeLabel(text, tone = "metal", options = {}) {
  const element = document.createElement("div");
  element.className = `part-label tone-${tone}${options.callout ? " callout" : ""}`;
  const dot = document.createElement("span");
  dot.className = "label-dot";
  const textNode = document.createElement("span");
  textNode.className = "label-text";
  textNode.textContent = text;
  element.append(dot, textNode);
  const label = new CSS2DObject(element);
  label.element = element;
  return label;
}

function addLabel(parent, position, text, tone, options = {}) {
  const label = makeLabel(text, tone, options);
  label.center.set(0.05, 0.5);
  label.position.copy(position);
  parent.add(label);
  return label;
}

function setPart(object, part) {
  object.traverse((child) => {
    if (child.isMesh) child.userData.part = part;
  });
  return object;
}

function buildWheel() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(0.25, 0.4, 11.1);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    mount.innerHTML = '<p class="webgl-fallback">This browser could not start the 3D view. The lesson instructions are still available on the left.</p>';
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D wheel. Drag to rotate and scroll to zoom.");
  mount.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  mount.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 8.1;
  controls.maxDistance = 14.5;
  controls.minPolarAngle = Math.PI / 2 - 0.5;
  controls.maxPolarAngle = Math.PI / 2 + 0.5;
  controls.minAzimuthAngle = -1.15;
  controls.maxAzimuthAngle = 1.15;
  controls.target.set(0, 0, 0);
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.035).texture;

  const hemi = new THREE.HemisphereLight(0xfffdf5, 0x9ab2aa, 1.7);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xfff8e9, 3.1);
  keyLight.position.set(-4.5, 5.5, 7.5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xb9dfd6, 1.55);
  rimLight.position.set(5, -2, 3);
  scene.add(rimLight);
  const warmRim = new THREE.DirectionalLight(0xffd6b8, 0.9);
  warmRim.position.set(5, 4, -4);
  scene.add(warmRim);

  const product = new THREE.Group();
  product.rotation.set(0.025, -0.07, 0);
  scene.add(product);

  const wheelGroup = new THREE.Group();
  product.add(wheelGroup);

  const tubeGroup = new THREE.Group();
  product.add(tubeGroup);

  const wheelMaterials = new Set();
  const track = (material) => {
    wheelMaterials.add(material);
    return material;
  };

  const matTire = track(
    new THREE.MeshStandardMaterial({ color: 0x27302e, roughness: 0.79, metalness: 0.03 }),
  );
  const matTread = track(
    new THREE.MeshStandardMaterial({ color: 0x171e1c, roughness: 0.92, metalness: 0.01 }),
  );
  const matSidewall = track(
    new THREE.MeshStandardMaterial({ color: 0x59615e, roughness: 0.73, metalness: 0.02 }),
  );
  const matRim = track(
    new THREE.MeshStandardMaterial({ color: 0xc7cdc8, roughness: 0.27, metalness: 0.78 }),
  );
  const matRimDark = track(
    new THREE.MeshStandardMaterial({ color: 0x8e9993, roughness: 0.39, metalness: 0.62 }),
  );
  const matSpoke = track(
    new THREE.MeshStandardMaterial({ color: 0xd9ddda, roughness: 0.24, metalness: 0.85 }),
  );
  const matHub = track(
    new THREE.MeshStandardMaterial({ color: 0x24534d, roughness: 0.43, metalness: 0.34 }),
  );
  const matHubMetal = track(
    new THREE.MeshStandardMaterial({ color: 0xbcc5c0, roughness: 0.25, metalness: 0.82 }),
  );
  const matCutEdge = track(
    new THREE.MeshStandardMaterial({
      color: 0xe9784a,
      emissive: 0x4b1607,
      emissiveIntensity: 0.24,
      roughness: 0.53,
      metalness: 0.04,
    }),
  );
  const matBead = track(
    new THREE.MeshStandardMaterial({
      color: 0xf08356,
      emissive: 0x55200e,
      emissiveIntensity: 0.26,
      roughness: 0.48,
      metalness: 0.06,
    }),
  );
  const matLever = track(
    new THREE.MeshStandardMaterial({ color: 0xf0a03f, roughness: 0.42, metalness: 0.08 }),
  );
  const matValveCap = new THREE.MeshStandardMaterial({
    color: 0x21302c,
    roughness: 0.6,
    metalness: 0.18,
    transparent: true,
  });
  const matValveMetal = new THREE.MeshStandardMaterial({
    color: 0xd3d8d4,
    roughness: 0.26,
    metalness: 0.82,
  });
  const matValveDark = new THREE.MeshStandardMaterial({
    color: 0x88938d,
    roughness: 0.42,
    metalness: 0.64,
  });
  const matTube = new THREE.MeshStandardMaterial({
    color: 0xd86e46,
    roughness: 0.57,
    metalness: 0.03,
  });
  const matPatchEdge = new THREE.MeshStandardMaterial({
    color: 0xf1a15f,
    roughness: 0.52,
    metalness: 0.04,
  });
  const matPatch = new THREE.MeshStandardMaterial({
    color: 0x183b36,
    roughness: 0.58,
    metalness: 0.12,
  });
  const matPatchMark = new THREE.MeshStandardMaterial({
    color: 0xf8f3df,
    roughness: 0.5,
    metalness: 0.02,
  });
  const matPuncture = new THREE.MeshStandardMaterial({
    color: 0xff9a5f,
    emissive: 0xa33612,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    transparent: true,
    opacity: 1,
  });
  const matBubble = new THREE.MeshPhysicalMaterial({
    color: 0xdff4ef,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.35,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const matAirPuff = matBubble.clone();
  matAirPuff.opacity = 0.42;

  // Tire casing with a deliberate educational cutaway.
  const tireGeometry = new THREE.TorusGeometry(TIRE_MAJOR, TIRE_TUBE, 28, 210, TIRE_ARC);
  const tireShell = new THREE.Mesh(tireGeometry, matTire);
  tireShell.rotation.z = TIRE_START;
  setPart(tireShell, "tire");
  wheelGroup.add(tireShell);

  const sidewallGeometry = new THREE.TorusGeometry(2.02, 0.014, 6, 190, TIRE_ARC);
  for (const z of [-0.405, 0.405]) {
    const sidewall = new THREE.Mesh(sidewallGeometry, matSidewall);
    sidewall.position.z = z;
    sidewall.rotation.z = TIRE_START;
    setPart(sidewall, "tire");
    wheelGroup.add(sidewall);
  }

  const treadGeometry = new THREE.BoxGeometry(0.22, 0.075, 0.35);
  for (let index = 0; index < 58; index += 1) {
    const angle = (index / 58) * Math.PI * 2;
    if (angleDistance(angle, CUT_CENTER) < CUT_GAP / 2 + 0.02) continue;
    const tread = new THREE.Mesh(treadGeometry, matTread);
    tread.position.set(Math.cos(angle) * 2.585, Math.sin(angle) * 2.585, 0);
    tread.rotation.z = angle + Math.PI / 2;
    tread.scale.x = index % 2 === 0 ? 1 : 0.78;
    setPart(tread, "tire");
    wheelGroup.add(tread);
  }

  for (const capAngle of [TIRE_START, TIRE_START + TIRE_ARC]) {
    const capGroup = new THREE.Group();
    capGroup.position.set(Math.cos(capAngle) * TIRE_MAJOR, Math.sin(capAngle) * TIRE_MAJOR, 0);
    const tangent = new THREE.Vector3(-Math.sin(capAngle), Math.cos(capAngle), 0).normalize();
    capGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(TIRE_TUBE * 0.98, 30),
      track(new THREE.MeshStandardMaterial({ color: 0x111715, roughness: 0.93, side: THREE.DoubleSide })),
    );
    capGroup.add(cap);

    const cutRing = new THREE.Mesh(new THREE.RingGeometry(TIRE_TUBE * 0.82, TIRE_TUBE, 30), matCutEdge);
    cutRing.position.z = 0.003;
    capGroup.add(cutRing);
    setPart(capGroup, "tire");
    wheelGroup.add(capGroup);
  }

  // Rim bed, lips, spokes and hub.
  const rimBand = new THREE.Mesh(
    new THREE.CylinderGeometry(1.66, 1.66, 0.22, 128, 1, true),
    track(new THREE.MeshStandardMaterial({
      color: 0xb7bfba,
      roughness: 0.32,
      metalness: 0.7,
      side: THREE.DoubleSide,
    })),
  );
  rimBand.rotation.x = Math.PI / 2;
  setPart(rimBand, "rim");
  wheelGroup.add(rimBand);

  for (const z of [-0.12, 0.12]) {
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.043, 10, 128), matRim);
    rimLip.position.z = z;
    setPart(rimLip, "rim");
    wheelGroup.add(rimLip);
  }

  const rimInner = new THREE.Mesh(new THREE.TorusGeometry(1.615, 0.026, 8, 128), matRimDark);
  setPart(rimInner, "rim");
  wheelGroup.add(rimInner);

  const spokeCount = 28;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (index / spokeCount) * Math.PI * 2;
    const side = index % 2 === 0 ? 1 : -1;
    const hubAngle = angle + side * 0.075;
    const start = new THREE.Vector3(Math.cos(hubAngle) * 0.31, Math.sin(hubAngle) * 0.31, side * 0.1);
    const end = new THREE.Vector3(Math.cos(angle) * 1.575, Math.sin(angle) * 1.575, side * 0.055);
    const spoke = createRod(start, end, 0.0085, matSpoke, 7);
    setPart(spoke, "spoke");
    wheelGroup.add(spoke);

    const nipple = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.055, 7), matRimDark);
    nipple.position.copy(end);
    nipple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
    setPart(nipple, "spoke");
    wheelGroup.add(nipple);
  }

  const hubBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.46, 34), matHub);
  hubBody.rotation.x = Math.PI / 2;
  setPart(hubBody, "hub");
  wheelGroup.add(hubBody);

  for (const z of [-0.235, 0.235]) {
    const flange = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.044, 10, 36), matHubMetal);
    flange.position.z = z;
    setPart(flange, "hub");
    wheelGroup.add(flange);
  }

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.92, 20), matHubMetal);
  axle.rotation.x = Math.PI / 2;
  setPart(axle, "hub");
  wheelGroup.add(axle);

  const hubEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 20), matRimDark);
  hubEnd.rotation.x = Math.PI / 2;
  hubEnd.position.z = 0.47;
  setPart(hubEnd, "hub");
  wheelGroup.add(hubEnd);

  // Inner tube, valve and its small click proxy.
  const tubeMesh = new THREE.Mesh(new THREE.TorusGeometry(TUBE_MAJOR, TUBE_RADIUS, 16, 190), matTube);
  setPart(tubeMesh, "tube");
  tubeGroup.add(tubeMesh);

  const tubePickMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const tubePickProxy = new THREE.Mesh(
    new THREE.TorusGeometry(TUBE_MAJOR, TUBE_RADIUS * 1.34, 8, 100),
    tubePickMaterial,
  );
  setPart(tubePickProxy, "tube");
  tubeGroup.add(tubePickProxy);

  const valveDirection = new THREE.Vector3(Math.cos(VALVE_ANGLE), Math.sin(VALVE_ANGLE), 0);
  const valveOuter = valveDirection.clone().multiplyScalar(1.98);
  const valveInner = valveDirection.clone().multiplyScalar(1.33);
  const valveMid = valveOuter.clone().add(valveInner).multiplyScalar(0.5);

  const valveStem = createRod(valveOuter, valveInner, 0.038, matValveMetal, 10);
  setPart(valveStem, "valve");
  tubeGroup.add(valveStem);

  const valveNut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 12), matValveDark);
  valveNut.position.copy(valveDirection.clone().multiplyScalar(1.79));
  valveNut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), valveDirection);
  setPart(valveNut, "valve");
  tubeGroup.add(valveNut);

  const valveCapGroup = new THREE.Group();
  valveCapGroup.position.copy(valveInner);
  const valveCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.12, 12), matValveCap);
  valveCap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), valveDirection);
  setPart(valveCap, "valve");
  valveCapGroup.add(valveCap);
  tubeGroup.add(valveCapGroup);

  const valveProxy = createRod(valveOuter, valveInner, 0.14, tubePickMaterial, 8);
  setPart(valveProxy, "valve");
  tubeGroup.add(valveProxy);

  // Bead highlight and lever, both shown while the bead is being released.
  const beadGroup = new THREE.Group();
  const beadArcAngle = 5.21;
  const beadArc = new THREE.Mesh(new THREE.TorusGeometry(1.79, 0.025, 8, 44, 1.08), matBead);
  beadArc.rotation.z = beadArcAngle;
  beadGroup.add(beadArc);
  beadGroup.position.z = 0.37;
  beadGroup.userData.part = "tire";
  wheelGroup.add(beadGroup);

  const beadLabelPosition = new THREE.Vector3(
    Math.cos(beadArcAngle + 0.5) * 1.84,
    Math.sin(beadArcAngle + 0.5) * 1.84,
    0.44,
  );
  const beadLabel = addLabel(beadGroup, beadLabelPosition, "Tire bead", "accent");

  const leverGroup = new THREE.Group();
  leverGroup.rotation.z = 5.28;
  leverGroup.position.z = 0.48;
  const leverHandle = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.78, 4, 10), matLever);
  leverHandle.rotation.z = Math.PI / 2;
  leverHandle.position.x = 2.22;
  leverGroup.add(leverHandle);
  const leverTip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.035), matRimDark);
  leverTip.position.set(1.82, 0, -0.01);
  leverGroup.add(leverTip);
  leverGroup.scale.setScalar(0.001);
  wheelGroup.add(leverGroup);

  // Labels are nudged outward so text does not cover the parts they identify.
  const tireLabel = addLabel(
    wheelGroup,
    new THREE.Vector3(Math.cos(2.55) * 2.37, Math.sin(2.55) * 2.37, 0.44),
    "Tire",
    "tire",
  );
  const rimLabel = addLabel(
    wheelGroup,
    new THREE.Vector3(Math.cos(3.69) * 1.7, Math.sin(3.69) * 1.7, 0.2),
    "Rim",
    "metal",
  );
  const spokeLabel = addLabel(
    wheelGroup,
    new THREE.Vector3(Math.cos(2.95) * 1.08, Math.sin(2.95) * 1.08, 0.12),
    "Spokes",
    "metal",
  );
  const hubLabel = addLabel(wheelGroup, new THREE.Vector3(0.13, 0.33, 0.5), "Hub", "metal");
  const valveLabel = addLabel(
    tubeGroup,
    valveMid.clone().setZ(0.2),
    "Valve",
    "metal",
  );
  const tubeLabel = addLabel(
    tubeGroup,
    new THREE.Vector3(Math.cos(CUT_CENTER) * 1.94, Math.sin(CUT_CENTER) * 1.94, 0.28),
    "Inner tube",
    "tube",
    { callout: true },
  );

  // Puncture marker, soap bubbles and patch all move with the tube.
  const puncturePoint = new THREE.Vector3(
    Math.cos(PUNCTURE_ANGLE) * TUBE_MAJOR,
    Math.sin(PUNCTURE_ANGLE) * TUBE_MAJOR,
    TUBE_RADIUS + 0.01,
  );

  const punctureGroup = new THREE.Group();
  punctureGroup.position.copy(puncturePoint);
  const punctureRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 8, 34), matPuncture);
  punctureGroup.add(punctureRing);
  const punctureDot = new THREE.Mesh(new THREE.CircleGeometry(0.032, 18), matPuncture);
  punctureDot.position.z = 0.002;
  punctureGroup.add(punctureDot);
  tubeGroup.add(punctureGroup);

  const punctureLabel = addLabel(
    tubeGroup,
    puncturePoint.clone().add(new THREE.Vector3(0.02, 0.22, 0.02)),
    "Puncture",
    "accent",
    { callout: true },
  );

  const bubbleGroup = new THREE.Group();
  bubbleGroup.position.copy(puncturePoint);
  const bubbles = [];
  for (let index = 0; index < 11; index += 1) {
    const angle = (index / 11) * Math.PI * 2;
    const radius = 0.08 + (index % 3) * 0.035;
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.018 + (index % 2) * 0.008, 10, 8), matBubble);
    bubble.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.04 + (index % 4) * 0.026);
    bubble.userData.base = bubble.position.clone();
    bubble.userData.phase = index / 11;
    bubbles.push(bubble);
    bubbleGroup.add(bubble);
  }
  tubeGroup.add(bubbleGroup);

  const patchGroup = new THREE.Group();
  patchGroup.position.copy(puncturePoint).setZ(TUBE_RADIUS + 0.025);
  const patchEdge = new THREE.Mesh(new THREE.ShapeGeometry(makeRoundedRect(0.39, 0.27, 0.075), 8), matPatchEdge);
  patchGroup.add(patchEdge);
  const patchFace = new THREE.Mesh(new THREE.ShapeGeometry(makeRoundedRect(0.31, 0.2, 0.055), 8), matPatch);
  patchFace.position.z = 0.004;
  patchGroup.add(patchFace);
  const checkStartA = new THREE.Vector3(-0.075, 0.005, 0.009);
  const checkMid = new THREE.Vector3(-0.014, -0.055, 0.009);
  const checkEnd = new THREE.Vector3(0.09, 0.06, 0.009);
  const checkA = createRod(checkStartA, checkMid, 0.008, matPatchMark, 6);
  const checkB = createRod(checkMid, checkEnd, 0.008, matPatchMark, 6);
  patchGroup.add(checkA, checkB);
  patchGroup.scale.setScalar(0.001);
  tubeGroup.add(patchGroup);

  const patchLabel = addLabel(
    tubeGroup,
    puncturePoint.clone().add(new THREE.Vector3(0.03, -0.2, 0.03)),
    "Patch",
    "accent",
  );

  // A few translucent air puffs make deflation readable without relying on text.
  const airGroup = new THREE.Group();
  airGroup.position.copy(valveInner).setZ(0.05);
  const airPuffs = [];
  for (let index = 0; index < 9; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.018 + (index % 3) * 0.008, 8, 6), matAirPuff);
    puff.userData.phase = index / 9;
    puff.userData.spread = 0.62 + (index % 4) * 0.16;
    airPuffs.push(puff);
    airGroup.add(puff);
  }
  tubeGroup.add(airGroup);

  const labels = {
    tire: tireLabel,
    rim: rimLabel,
    spoke: spokeLabel,
    hub: hubLabel,
    valve: valveLabel,
    tube: tubeLabel,
    bead: beadLabel,
    puncture: punctureLabel,
    patch: patchLabel,
  };

  function resize() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resizeQueued = false;
  }

  resize();
  const resizeObserver = new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(resize);
  });
  resizeObserver.observe(mount);

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    product,
    wheelGroup,
    tubeGroup,
    wheelMaterials,
    labels,
    beadGroup,
    leverGroup,
    punctureGroup,
    punctureLabel,
    bubbleGroup,
    bubbles,
    patchGroup,
    patchLabel,
    valveCapGroup,
    valveInner,
    valveDirection,
    airGroup,
    airPuffs,
    puncturePoint,
    matValveCap,
    matPuncture,
    matBubble,
    matAirPuff,
  };
}

const world = buildWheel();

const DEFAULT_POSE = {
  wheelX: 0,
  wheelOpacity: 1,
  tubeX: 0,
  tubeY: 0,
  tubeZ: 0,
  tubeScale: 1,
  tubeRotation: 0,
  beadOut: 0,
  lever: 0,
  puncture: 0,
  bubbles: 0,
  patch: 0,
  valveCap: 0,
  air: 0,
};

const currentPose = { ...DEFAULT_POSE };
const targetPose = { ...DEFAULT_POSE };

function isNarrowStage() {
  return mount.clientWidth > 0 && mount.clientWidth < 560;
}

function poseForStep(index) {
  const narrow = isNarrowStage();
  const pose = { ...DEFAULT_POSE };
  if (index === 0) {
    pose.tubeScale = 0.97;
    pose.valveCap = 1;
    pose.air = 1;
  } else if (index === 1) {
    pose.tubeScale = 0.965;
    pose.beadOut = 1;
    pose.lever = 1;
    pose.valveCap = 1;
    pose.air = 0.7;
  } else if (index === 2) {
    pose.wheelX = narrow ? -0.72 : -0.9;
    pose.wheelOpacity = 0.82;
    pose.tubeX = narrow ? 1.02 : 1.43;
    pose.tubeY = -0.14;
    pose.tubeZ = 0.25;
    pose.tubeScale = narrow ? 0.56 : 0.68;
    pose.tubeRotation = -0.2;
    pose.beadOut = 1;
  } else if (index === 3 || index === 4) {
    pose.wheelX = narrow ? -1.05 : -1.45;
    pose.wheelOpacity = index === 3 ? 0.24 : 0.18;
    pose.tubeX = narrow ? 0.74 : 1.0;
    pose.tubeY = 0.02;
    pose.tubeZ = 0.38;
    pose.tubeScale = narrow ? 0.8 : 0.98;
    pose.tubeRotation = 0.1;
    pose.puncture = index === 3 ? 1 : 0;
    pose.bubbles = index === 3 ? 1 : 0.12;
    pose.patch = index === 4 ? 1 : 0;
  } else if (index === 5) {
    pose.patch = 1;
  }
  return pose;
}

function setPose(pose) {
  Object.assign(targetPose, DEFAULT_POSE, pose);
}

function applyStepPose(index) {
  setPose(poseForStep(index));
}

function applyPracticePose() {
  if (!practice.open) return;
  const pose = { ...DEFAULT_POSE };
  if (practice.phase === "identify") {
    pose.tubeScale = 1.015;
    pose.tubeZ = 0.06;
    pose.wheelOpacity = 1;
    pose.patch = 0.5;
  } else if (practice.phase === "order") {
    pose.patch = 0.75;
  }
  setPose(pose);
}

/* --------------------------------------------------------------------------
   Labels and lesson UI
   -------------------------------------------------------------------------- */

function setLabelState(label, state) {
  if (!label?.element) return;
  label.element.classList.toggle("is-hidden", state === "hidden");
  label.element.classList.toggle("is-muted", state === "muted");
}

function syncLabelsControl() {
  const forcedHidden = practice.open && practice.phase === "identify";
  labelsButton.disabled = forcedHidden;
  labelsButton.setAttribute("aria-pressed", String(!forcedHidden && labelsEnabled));
  const label = labelsButton.querySelector("span");
  if (label) label.textContent = forcedHidden ? "Labels hidden" : labelsEnabled ? "Labels on" : "Labels off";
}

function updateLabels() {
  if (!world) return;
  const labels = world.labels;
  const hidden = "hidden";
  const visible = "visible";
  const muted = "muted";
  syncLabelsControl();

  if (!labelsEnabled) {
    Object.values(labels).forEach((label) => setLabelState(label, hidden));
    return;
  }

  if (practice.open) {
    if (practice.phase === "identify") {
      Object.values(labels).forEach((label) => setLabelState(label, hidden));
    } else {
      Object.entries(labels).forEach(([key, label]) => {
        setLabelState(label, key === "puncture" || key === "patch" || key === "bead" ? muted : visible);
      });
    }
    return;
  }

  const states = {
    tire: visible,
    rim: visible,
    spoke: visible,
    hub: visible,
    valve: visible,
    tube: visible,
    bead: hidden,
    puncture: hidden,
    patch: hidden,
  };

  if (currentStep === 1) {
    Object.assign(states, {
      tire: muted,
      rim: visible,
      spoke: muted,
      hub: muted,
      valve: visible,
      tube: muted,
      bead: visible,
    });
  } else if (currentStep === 2) {
    Object.assign(states, {
      tire: muted,
      rim: muted,
      spoke: muted,
      hub: muted,
      valve: visible,
      tube: visible,
      bead: muted,
      patch: muted,
    });
  } else if (currentStep === 3) {
    Object.assign(states, {
      tire: hidden,
      rim: hidden,
      spoke: hidden,
      hub: hidden,
      valve: muted,
      tube: muted,
      puncture: visible,
      patch: muted,
    });
  } else if (currentStep === 4) {
    Object.assign(states, {
      tire: hidden,
      rim: hidden,
      spoke: hidden,
      hub: hidden,
      valve: muted,
      tube: muted,
      puncture: muted,
      patch: visible,
    });
  } else if (currentStep === 5) {
    Object.assign(states, {
      patch: muted,
    });
  }

  Object.entries(states).forEach(([key, state]) => setLabelState(labels[key], state));
}

function buildRail() {
  railTrack.innerHTML = "";
  STEPS.forEach((step, index) => {
    const button = document.createElement("button");
    button.className = "rail-step";
    button.type = "button";
    button.dataset.step = String(index);
    button.setAttribute("aria-label", `Step ${index + 1}: ${step.title}`);
    button.innerHTML = `
      <span class="rail-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="rail-copy">
        <span class="rail-title">${step.nav}</span>
        <span class="rail-sub">${step.navSub}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      if (practice.open) closePractice();
      goToStep(index);
    });
    railTrack.appendChild(button);
  });
}

function updateRail() {
  railTrack.querySelectorAll(".rail-step").forEach((button, index) => {
    button.classList.toggle("is-current", index === currentStep);
    button.classList.toggle("is-complete", index < currentStep);
    if (index === currentStep) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  railProgress.textContent = `${currentStep + 1} of ${STEPS.length}`;
}

function updateLessonUI() {
  const step = STEPS[currentStep];
  stepKicker.textContent = `Step ${String(currentStep + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`;
  stepNumber.textContent = String(currentStep + 1).padStart(2, "0");
  stepBadge.dataset.number = String(currentStep + 1).padStart(2, "0");
  stepIconUse.setAttribute("href", `#${step.icon}`);
  stepEyebrow.textContent = step.eyebrow;
  stepTitle.textContent = step.title;
  stepInstruction.textContent = step.instruction;
  benchNote.textContent = step.note;
  pressureValue.textContent = step.pressure;
  pressureHint.textContent = step.pressureHint;
  pressureFill.style.width = `${step.pressureFill}%`;
  prevButton.disabled = currentStep === 0;
  nextLabel.textContent = currentStep === STEPS.length - 1 ? "Start practice" : "Next step";
  captionKicker.textContent = step.captionKicker;
  captionTitle.textContent = step.captionTitle;
  captionBody.textContent = step.captionBody;
  modelStatusText.textContent = step.status;
  modelStatus.classList.toggle("is-complete", currentStep === STEPS.length - 1);
  updateRail();
}

function goToStep(index) {
  currentStep = clamp(index, 0, STEPS.length - 1);
  updateLessonUI();
  applyStepPose(currentStep);
  updateLabels();
  if (currentStep === 0) showTime = 0;
}

function replayCurrentStep() {
  const replayPose = poseForStep(currentStep);
  const previousPose = currentStep > 0 ? poseForStep(currentStep - 1) : { ...DEFAULT_POSE, tubeScale: 1 };
  setPose(previousPose);
  window.setTimeout(() => {
    if (!practice.open) setPose(replayPose);
  }, 300);
  showToast(`Replaying: ${STEPS[currentStep].title}`);
}

/* --------------------------------------------------------------------------
   Practice round
   -------------------------------------------------------------------------- */

function makePracticeProgress(doneCount, activeCount) {
  let markup = '<div class="practice-progress" aria-label="Practice progress">';
  for (let index = 0; index < 4; index += 1) {
    const className = index < doneCount ? "is-done" : index === activeCount ? "is-active" : "";
    markup += `<i class="${className}"></i>`;
  }
  return `${markup}</div>`;
}

function feedbackMarkup() {
  if (!practice.feedback) return "";
  return `<div class="practice-feedback ${practice.feedbackType}" role="status">${practice.feedback}</div>`;
}

function renderIdentify() {
  const task = PART_TASKS[practice.partIndex];
  const isLast = practice.partIndex === PART_TASKS.length - 1;
  practiceBody.innerHTML = `
    ${makePracticeProgress(practice.partIndex, 0)}
    <p class="practice-eyebrow">Part check &middot; ${practice.partIndex + 1} of ${PART_TASKS.length}</p>
    <h2 class="practice-prompt">${task.prompt}</h2>
    <p class="practice-copy">${task.copy}</p>
    <div class="part-target">
      <div class="target-reticle" aria-hidden="true"><i></i></div>
      <div>
        <strong>Tap the part in the 3D model</strong>
        <span>${practice.answerGiven ? task.guidance : "Labels are hidden for this round. Drag to rotate if you need a better look."}</span>
      </div>
    </div>
    ${feedbackMarkup()}
    ${
      practice.answerGiven
        ? `<button class="practice-next" type="button" data-action="next-part">${isLast ? "Start step ordering" : "Next part"} &rarr;</button>`
        : ""
    }
  `;

  captionKicker.textContent = `PART CHECK ${practice.partIndex + 1} OF ${PART_TASKS.length}`;
  captionTitle.textContent = task.prompt;
  captionBody.textContent = "Tap the part directly in the 3D model. Labels are hidden for this round.";
  modelStatusText.textContent = `Practice: find the ${PART_NAMES[task.part]}`;
  modelStatus.classList.remove("is-complete");
}

function orderItemMarkup(id) {
  const pickIndex = practice.order.indexOf(id);
  const isPicked = pickIndex >= 0;
  let resultClass = "";
  if (practice.orderResult) {
    const correctIndex = ORDER_IDS.indexOf(id);
    const pickedIndex = practice.order.indexOf(id);
    resultClass = practice.orderResult[pickedIndex] ? "is-correct" : "is-wrong";
  }
  return `
    <button
      class="sequence-item${isPicked ? " is-picked" : ""}${resultClass ? ` ${resultClass}` : ""}"
      type="button"
      data-action="pick"
      data-id="${id}"
      ${isPicked || practice.orderResult ? "disabled" : ""}
    >
      <span class="sequence-index">${isPicked ? pickIndex + 1 : "&bull;"}</span>
      <span class="sequence-text">${ORDER_LABELS[id]}</span>
    </button>
  `;
}

function renderOrder() {
  const picksMarkup = practice.order.length
    ? practice.order.map((_, index) => `<span class="pick-number">${index + 1}</span>`).join("")
    : '<span class="pick-placeholder">Your sequence will appear here.</span>';

  let orderFeedback = "";
  let actionMarkup = "";
  if (practice.orderResult) {
    const firstWrong = practice.orderResult.findIndex((isCorrect) => !isCorrect);
    if (firstWrong >= 0) {
      practice.feedback = `Position ${firstWrong + 1} is out of order. Think about what must happen before the tube can come free, then try again.`;
      practice.feedbackType = "error";
    }
    orderFeedback = feedbackMarkup();
    actionMarkup = '<button class="practice-retry" type="button" data-action="retry-order">Try another order</button>';
  } else {
    actionMarkup = `
      <button class="practice-submit" type="button" data-action="submit-order" ${practice.order.length === ORDER_IDS.length ? "" : "disabled"}>
        Check my sequence
      </button>
    `;
  }

  practiceBody.innerHTML = `
    ${makePracticeProgress(3, 3)}
    <p class="practice-eyebrow">Sequence check &middot; 1 of 1</p>
    <h2 class="practice-prompt">Put the repair in order</h2>
    <p class="practice-copy">Tap the cards from first to last. You can retry as many times as you like.</p>
    <div class="sequence-heading">
      <p class="sequence-instruction">Tap to add to your sequence</p>
      ${practice.order.length && !practice.orderResult ? '<button class="clear-order" type="button" data-action="clear-order">Clear</button>' : ""}
    </div>
    <div class="sequence-picks">${picksMarkup}</div>
    <div class="sequence-list">${practice.shuffledOrder.map(orderItemMarkup).join("")}</div>
    ${orderFeedback}
    ${actionMarkup}
  `;

  captionKicker.textContent = "SEQUENCE CHECK";
  captionTitle.textContent = "Build the repair sequence";
  captionBody.textContent = "Use the cards to put the six repair steps in order.";
  modelStatusText.textContent = practice.orderResult ? "Practice: review the order" : "Practice: order the steps";
}

function renderSuccess() {
  practiceBody.innerHTML = `
    ${makePracticeProgress(4, -1)}
    <div class="practice-success">
      <div class="success-burst" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5" /></svg>
      </div>
      <h2>Wheel sorted.</h2>
      <p>You found the right parts and rebuilt the repair sequence. That is a bench-ready puncture repair.</p>
      <div class="success-score">
        <span>${PART_TASKS.length}/${PART_TASKS.length} parts</span>
        <span>${practice.orderAttempts} order ${practice.orderAttempts === 1 ? "try" : "tries"}</span>
        <span>${practice.partMistakes + practice.orderMistakes} misses</span>
      </div>
      <div class="success-actions">
        <button type="button" data-action="restart-practice">Run it again</button>
        <button type="button" data-action="back-to-lesson">Back to lesson</button>
      </div>
    </div>
  `;
  captionKicker.textContent = "PRACTICE COMPLETE";
  captionTitle.textContent = "Bench-ready repair";
  captionBody.textContent = "Parts identified and sequence complete. Revisit any lesson step whenever you need.";
  modelStatusText.textContent = "Practice complete";
  modelStatus.classList.add("is-complete");
}

function renderPractice() {
  if (!practice.open) return;
  if (practice.phase === "identify") renderIdentify();
  else if (practice.phase === "order") renderOrder();
  else renderSuccess();
  updateLabels();
  applyPracticePose();
}

function resetPracticeState() {
  practice.phase = "identify";
  practice.partIndex = 0;
  practice.answerGiven = false;
  practice.feedback = null;
  practice.feedbackType = "";
  practice.partMistakes = 0;
  practice.order = [];
  practice.shuffledOrder = makeShuffledOrder();
  practice.orderResult = null;
  practice.orderAttempts = 0;
  practice.orderMistakes = 0;
}

function openPractice() {
  activePracticeMode = true;
  practice.open = true;
  resetPracticeState();
  practiceButton.setAttribute("aria-pressed", "true");
  practiceButton.querySelector("span").textContent = "Exit practice";
  lessonCard.hidden = true;
  practicePanel.hidden = false;
  appShell.classList.add("practice-open");
  renderPractice();
}

function closePractice() {
  activePracticeMode = false;
  practice.open = false;
  practiceButton.setAttribute("aria-pressed", "false");
  practiceButton.querySelector("span").textContent = "Practice round";
  lessonCard.hidden = false;
  practicePanel.hidden = true;
  appShell.classList.remove("practice-open");
  applyStepPose(currentStep);
  updateLessonUI();
  updateLabels();
}

function handlePartPick(part) {
  if (!part) return;
  if (!practice.open || practice.phase !== "identify" || practice.answerGiven) {
    showToast(PART_NOTES[part] || "Drag to rotate the wheel, or scroll to zoom.");
    return;
  }

  const task = PART_TASKS[practice.partIndex];
  if (part === task.part) {
    practice.answerGiven = true;
    practice.feedback = `Correct. That is the ${PART_NAMES[task.part]}. ${task.guidance}`;
    practice.feedbackType = "success";
  } else {
    practice.partMistakes += 1;
    practice.feedback = `Not quite — that is the ${PART_NAMES[part]}. Look again for the ${PART_NAMES[task.part]}. No penalty, try once more.`;
    practice.feedbackType = "error";
  }
  renderIdentify();
}

function pickOrderStep(id) {
  if (practice.orderResult || practice.order.includes(id)) return;
  practice.order.push(id);
  renderOrder();
}

function submitOrder() {
  if (practice.order.length !== ORDER_IDS.length) return;
  practice.orderAttempts += 1;
  practice.orderResult = practice.order.map((id, index) => id === ORDER_IDS[index]);
  if (practice.orderResult.every(Boolean)) {
    practice.phase = "success";
    renderSuccess();
    updateLabels();
    applyPracticePose();
    return;
  }
  practice.orderMistakes += 1;
  renderOrder();
}

function retryOrder() {
  practice.order = [];
  practice.orderResult = null;
  practice.feedback = null;
  practice.feedbackType = "";
  practice.shuffledOrder = makeShuffledOrder();
  renderOrder();
}

practiceBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "next-part") {
    practice.partIndex += 1;
    practice.answerGiven = false;
    practice.feedback = null;
    practice.feedbackType = "";
    if (practice.partIndex >= PART_TASKS.length) {
      practice.phase = "order";
      practice.order = [];
      practice.orderResult = null;
      practice.shuffledOrder = makeShuffledOrder();
      renderPractice();
      applyPracticePose();
    } else {
      renderIdentify();
      applyPracticePose();
      updateLabels();
    }
  } else if (action === "pick") {
    pickOrderStep(button.dataset.id);
  } else if (action === "clear-order") {
    practice.order = [];
    renderOrder();
  } else if (action === "submit-order") {
    submitOrder();
  } else if (action === "retry-order") {
    retryOrder();
    applyPracticePose();
  } else if (action === "restart-practice") {
    resetPracticeState();
    renderPractice();
    applyPracticePose();
  } else if (action === "back-to-lesson") {
    closePractice();
  }
});

/* --------------------------------------------------------------------------
   Interaction and animation
   -------------------------------------------------------------------------- */

let pointerStart = null;
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function partFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.part) return current.userData.part;
    current = current.parent;
  }
  return null;
}

function pickAt(clientX, clientY) {
  if (!world) return null;
  const rect = world.renderer.domElement.getBoundingClientRect();
  pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, world.camera);
  const intersections = raycaster.intersectObjects([world.wheelGroup, world.tubeGroup], true);
  for (const intersection of intersections) {
    const part = partFromObject(intersection.object);
    if (part) return part;
  }
  return null;
}

if (world) {
  const canvas = world.renderer.domElement;
  canvas.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    const elapsed = performance.now() - pointerStart.time;
    pointerStart = null;
    if (distance > 7 || elapsed > 850) return;
    const part = pickAt(event.clientX, event.clientY);
    if (part) handlePartPick(part);
  });
  canvas.addEventListener("pointercancel", () => {
    pointerStart = null;
  });
  canvas.addEventListener("pointermove", () => {
    rotateHint.classList.add("is-hidden");
  }, { once: true });
}

function updatePose(delta, time) {
  if (!world) return;
  const ease = 1 - Math.exp(-delta * 7.4);

  currentPose.wheelX += (targetPose.wheelX - currentPose.wheelX) * ease;
  currentPose.wheelOpacity += (targetPose.wheelOpacity - currentPose.wheelOpacity) * ease;
  currentPose.tubeX += (targetPose.tubeX - currentPose.tubeX) * ease;
  currentPose.tubeY += (targetPose.tubeY - currentPose.tubeY) * ease;
  currentPose.tubeZ += (targetPose.tubeZ - currentPose.tubeZ) * ease;
  currentPose.tubeScale += (targetPose.tubeScale - currentPose.tubeScale) * ease;
  currentPose.tubeRotation += (targetPose.tubeRotation - currentPose.tubeRotation) * ease;
  currentPose.beadOut += (targetPose.beadOut - currentPose.beadOut) * ease;
  currentPose.lever += (targetPose.lever - currentPose.lever) * ease;
  currentPose.puncture += (targetPose.puncture - currentPose.puncture) * ease;
  currentPose.bubbles += (targetPose.bubbles - currentPose.bubbles) * ease;
  currentPose.patch += (targetPose.patch - currentPose.patch) * ease;
  currentPose.valveCap += (targetPose.valveCap - currentPose.valveCap) * ease;
  currentPose.air += (targetPose.air - currentPose.air) * ease;

  world.wheelGroup.position.x = currentPose.wheelX;
  world.tubeGroup.position.set(currentPose.tubeX, currentPose.tubeY, currentPose.tubeZ);
  world.tubeGroup.scale.setScalar(currentPose.tubeScale);
  world.tubeGroup.rotation.z = currentPose.tubeRotation;

  const wheelOpacity = clamp(currentPose.wheelOpacity, 0.05, 1);
  world.wheelMaterials.forEach((material) => {
    const isOpaque = wheelOpacity > 0.995;
    if (material.transparent === isOpaque) material.transparent = !isOpaque;
    material.opacity = wheelOpacity;
    material.depthWrite = isOpaque;
  });

  world.beadGroup.scale.setScalar(1 + currentPose.beadOut * 0.046);
  world.beadGroup.position.z = 0.37 + currentPose.beadOut * 0.22;
  world.beadGroup.visible = currentPose.beadOut > 0.01;

  world.leverGroup.visible = currentPose.lever > 0.01;
  world.leverGroup.scale.setScalar(Math.max(0.001, currentPose.lever));
  world.leverGroup.rotation.z = 5.28 + Math.sin(time * 1.6) * 0.012;

  const valveTravel = world.valveDirection.clone().multiplyScalar(currentPose.valveCap * 0.46);
  world.valveCapGroup.position.copy(world.valveInner).add(valveTravel);
  world.matValveCap.opacity = 1 - clamp(currentPose.valveCap * 0.92, 0, 1);
  world.matValveCap.visible = currentPose.valveCap < 0.985;

  world.punctureGroup.visible = currentPose.puncture > 0.015;
  world.punctureGroup.scale.setScalar(
    Math.max(0.001, currentPose.puncture * (0.94 + Math.sin(time * 3.2) * 0.1)),
  );
  world.matPuncture.opacity = clamp(currentPose.puncture, 0, 1);

  world.bubbleGroup.visible = currentPose.bubbles > 0.02;
  const bubbleOpacity = clamp(currentPose.bubbles, 0, 1);
  world.matBubble.opacity = 0.55 * bubbleOpacity;
  world.bubbles.forEach((bubble) => {
    const phase = (time * 0.22 + bubble.userData.phase) % 1;
    bubble.position.x = bubble.userData.base.x;
    bubble.position.y = bubble.userData.base.y + phase * 0.27;
    bubble.position.z = bubble.userData.base.z;
    const scale = 0.7 + phase * 0.33;
    bubble.scale.setScalar(scale);
  });

  world.patchGroup.visible = currentPose.patch > 0.012;
  const patchPulse = currentPose.patch < 0.999 ? 0.94 + Math.sin(time * 7) * 0.06 : 1;
  world.patchGroup.scale.setScalar(Math.max(0.001, currentPose.patch * patchPulse));

  world.airGroup.visible = currentPose.air > 0.02;
  world.matAirPuff.opacity = 0.4 * clamp(currentPose.air, 0, 1);
  world.airPuffs.forEach((puff) => {
    const phase = (time * 0.42 + puff.userData.phase) % 1;
    const radial = puff.userData.spread * phase;
    puff.position.set(
      world.valveDirection.x * radial + Math.sin(phase * Math.PI * 2 + puff.userData.phase * 8) * 0.04,
      world.valveDirection.y * radial + Math.cos(phase * Math.PI * 2 + puff.userData.phase * 8) * 0.04,
      phase * 0.12,
    );
    puff.scale.setScalar(0.7 + phase * 0.65);
  });
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  if (!paused) showTime += delta;

  if (world) {
    if (!paused) world.product.rotation.y = -0.055 + Math.sin(showTime * 0.48) * 0.055;
    updatePose(delta, showTime);
    world.controls.update();
    world.renderer.render(world.scene, world.camera);
    world.labelRenderer.render(world.scene, world.camera);
  }
}

/* --------------------------------------------------------------------------
   UI events
   -------------------------------------------------------------------------- */

prevButton.addEventListener("click", () => goToStep(currentStep - 1));
nextButton.addEventListener("click", () => {
  if (currentStep === STEPS.length - 1) openPractice();
  else goToStep(currentStep + 1);
});
replayButton.addEventListener("click", replayCurrentStep);
practiceButton.addEventListener("click", () => {
  if (practice.open) closePractice();
  else openPractice();
});
practiceClose.addEventListener("click", closePractice);

labelsButton.addEventListener("click", () => {
  labelsEnabled = !labelsEnabled;
  updateLabels();
});

resetViewButton.addEventListener("click", () => {
  if (!world) return;
  world.controls.reset();
  world.camera.position.set(0.25, 0.4, 11.1);
  world.controls.target.set(0, 0, 0);
  world.controls.update();
  showToast("View reset to the front of the wheel.");
});

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.setAttribute("aria-pressed", String(paused));
  pauseLabel.textContent = paused ? "Resume" : "Pause";
  pauseButton.setAttribute("aria-label", paused ? "Resume model motion" : "Pause model motion");
  showToast(paused ? "Motion paused. You can still drag to rotate the wheel." : "Motion resumed.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && practice.open) {
    closePractice();
    return;
  }
  if (practice.open || event.target instanceof HTMLButtonElement) return;
  if (event.key === "ArrowRight") {
    if (currentStep === STEPS.length - 1) openPractice();
    else goToStep(currentStep + 1);
  } else if (event.key === "ArrowLeft") {
    goToStep(currentStep - 1);
  }
});

window.addEventListener("resize", () => {
  if (!world) return;
  window.clearTimeout(window.__spokeResizeTimer);
  window.__spokeResizeTimer = window.setTimeout(() => {
    if (!practice.open) applyStepPose(currentStep);
    else applyPracticePose();
  }, 120);
});

buildRail();
updateLessonUI();
applyStepPose(0);
updateLabels();
requestAnimationFrame(animate);
