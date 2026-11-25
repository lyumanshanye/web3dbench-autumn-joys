import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const stage = document.querySelector("#stage");
const mount = document.querySelector("#canvasMount");
const bootPanel = document.querySelector("#bootPanel");
const bootSizeBtn = document.querySelector("#bootSizeBtn");
const bootCloseBtn = document.querySelector("#bootCloseBtn");
const sheetScrim = document.querySelector("#sheetScrim");
const resetBtn = document.querySelector("#resetBtn");
const addBagBtn = document.querySelector("#addBagBtn");
const bagListEl = document.querySelector("#bagList");
const selectionDock = document.querySelector("#selectionDock");
const selectedSwatch = document.querySelector("#selectedSwatch");
const selectedName = document.querySelector("#selectedName");
const selectedDims = document.querySelector("#selectedDims");
const selectedStatus = document.querySelector("#selectedStatus");
const fitRing = document.querySelector("#fitRing");
const fitCount = document.querySelector("#fitCount");
const fitTotal = document.querySelector("#fitTotal");
const fitRingCaption = document.querySelector("#fitRingCaption");
const fitTitle = document.querySelector("#fitTitle");
const fitDetail = document.querySelector("#fitDetail");
const overlapCount = document.querySelector("#overlapCount");
const outsideCount = document.querySelector("#outsideCount");
const headroomValue = document.querySelector("#headroomValue");
const issueAlert = document.querySelector("#issueAlert");
const issueText = document.querySelector("#issueText");
const bagCountEl = document.querySelector("#bagCount");
const headerStatus = document.querySelector("#headerStatus");
const headerDot = document.querySelector("#headerDot");
const topbarStatus = document.querySelector(".topbar-status");
const headerDims = document.querySelector("#headerDims");
const toastEl = document.querySelector("#toast");
const dimensionInputs = {
  w: document.querySelector("#bootWidth"),
  l: document.querySelector("#bootLength"),
  h: document.querySelector("#bootHeight"),
};

const DEFAULT_BOOT = { w: 105, l: 82, h: 58 };
const BOOT_LIMITS = {
  w: [50, 220],
  l: [40, 200],
  h: [25, 120],
};
const PRESETS = {
  hatch: { w: 90, l: 72, h: 50, label: "Hatchback" },
  suv: { w: 105, l: 82, h: 58, label: "Mid SUV" },
  estate: { w: 118, l: 96, h: 55, label: "Estate" },
};
const INITIAL_BAGS = [
  {
    id: 1,
    name: "Large check-in",
    type: "hard",
    w: 68,
    d: 44,
    h: 28,
    x: -16,
    z: 11,
    bottom: 0,
    yaw: 0,
    color: "#ad5a41",
    accent: "#f2cfb4",
  },
  {
    id: 2,
    name: "Cabin case",
    type: "hard",
    w: 40,
    d: 24,
    h: 55,
    x: -30,
    z: -27,
    bottom: 0,
    yaw: 0,
    color: "#d0a341",
    accent: "#fff1bd",
  },
  {
    id: 3,
    name: "Medium case",
    type: "hard",
    w: 52,
    d: 34,
    h: 24,
    x: 35.4,
    z: -11,
    bottom: 0,
    yaw: Math.PI / 2,
    color: "#4e6a57",
    accent: "#d5e9c3",
  },
  {
    id: 4,
    name: "Canvas duffel",
    type: "soft",
    w: 48,
    d: 28,
    h: 24,
    x: -16,
    z: 11,
    bottom: 28,
    yaw: 0,
    color: "#4b7179",
    accent: "#f0d9b4",
  },
];
const EXTRA_BAGS = [
  { name: "Weekender", type: "soft", w: 46, d: 26, h: 24, color: "#8c5b6e", accent: "#f2d9df" },
  { name: "Shoe bag", type: "soft", w: 34, d: 20, h: 16, color: "#72804d", accent: "#f2e5b9" },
  { name: "Cool box", type: "hard", w: 36, d: 28, h: 26, color: "#c28a4e", accent: "#f8e3bd" },
  { name: "Camera bag", type: "soft", w: 30, d: 22, h: 18, color: "#5d657b", accent: "#d9def0" },
];

const boot = { ...DEFAULT_BOOT };
let bags = [];
let selectedId = 3;
let nextBagId = 5;
let extraBagIndex = 0;
let activeView = "iso";
let dragMode = "move";
let dragState = null;
let toastTimer = 0;
let lastStageSize = { width: 0, height: 0 };
let loadMetrics = { fit: 0, outside: 0, overlapPairs: 0, headroom: 0, maxTop: 0 };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 1, 1600);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "label-layer";
labelRenderer.domElement.style.pointerEvents = "none";
mount.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 0.72;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
controls.minDistance = 90;
controls.maxDistance = 760;

const hemisphere = new THREE.HemisphereLight(0xf2ead4, 0x14221a, 1.65);
scene.add(hemisphere);

const keyLight = new THREE.DirectionalLight(0xffedd0, 3.2);
keyLight.position.set(105, 155, 105);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -150;
keyLight.shadow.camera.right = 150;
keyLight.shadow.camera.top = 150;
keyLight.shadow.camera.bottom = -150;
keyLight.shadow.camera.near = 20;
keyLight.shadow.camera.far = 420;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.3;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9cc8bc, 1.55);
rimLight.position.set(-115, 82, -120);
scene.add(rimLight);

const topFill = new THREE.PointLight(0xffe8b7, 1.1, 340, 2);
topFill.position.set(0, 145, 15);
scene.add(topFill);

const shadowGround = new THREE.Mesh(
  new THREE.PlaneGeometry(800, 800),
  new THREE.ShadowMaterial({ color: 0x07100a, opacity: 0.31 }),
);
shadowGround.rotation.x = -Math.PI / 2;
shadowGround.position.y = -1.25;
shadowGround.receiveShadow = true;
scene.add(shadowGround);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragPoint = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const clock = new THREE.Clock();

let bootGroup = new THREE.Group();
scene.add(bootGroup);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundMeasure(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function normalizeAngle(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function angleDegrees(angle) {
  return Math.round(THREE.MathUtils.radToDeg(normalizeAngle(angle))) % 360;
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}

function createLabel(text, className = "dim-label") {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return new CSS2DObject(element);
}

function makeLine(points, color, opacity, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: 2.6,
        gapSize: 1.8,
        depthWrite: false,
      })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

function addTick(group, point, axis, size = 2.1) {
  const offsetA = point.clone();
  const offsetB = point.clone();
  if (axis === "z") {
    offsetA.z -= size;
    offsetB.z += size;
  } else {
    offsetA.x -= size;
    offsetB.x += size;
  }
  group.add(makeLine([offsetA, offsetB], 0xd9e6c7, 0.52));
}

function addDimension(group, start, end, labelText, labelPosition, tickAxis) {
  group.add(makeLine([start, end], 0xd9e6c7, 0.64, true));
  addTick(group, start, tickAxis);
  addTick(group, end, tickAxis);
  const label = createLabel(labelText);
  label.position.copy(labelPosition);
  group.add(label);
}

function addFloorGrid(group) {
  const points = [];
  const minX = -boot.w / 2;
  const maxX = boot.w / 2;
  const minZ = -boot.l / 2;
  const maxZ = boot.l / 2;
  const y = 0.12;
  for (let x = Math.ceil(minX / 10) * 10; x <= maxX; x += 10) {
    points.push(new THREE.Vector3(x, y, minZ), new THREE.Vector3(x, y, maxZ));
  }
  for (let z = Math.ceil(minZ / 10) * 10; z <= maxZ; z += 10) {
    points.push(new THREE.Vector3(minX, y, z), new THREE.Vector3(maxX, y, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xb9cbaa,
    transparent: true,
    opacity: 0.145,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(geometry, material));
}

function addBootRim(group) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x2d4034,
    roughness: 0.58,
    metalness: 0.24,
  });
  const y = boot.h + 0.15;
  const beamX = new THREE.Mesh(new THREE.BoxGeometry(boot.w + 2.4, 1.05, 1.35), material);
  beamX.position.set(0, y, -boot.l / 2);
  group.add(beamX);
  const beamXFront = beamX.clone();
  beamXFront.position.z = boot.l / 2;
  group.add(beamXFront);
  const beamZ = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, boot.l + 2.4), material);
  beamZ.position.set(-boot.w / 2, y, 0);
  group.add(beamZ);
  const beamZRight = beamZ.clone();
  beamZRight.position.x = boot.w / 2;
  group.add(beamZRight);
}

function rebuildBoot() {
  clearGroup(bootGroup);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(boot.w, 1, boot.l),
    new THREE.MeshStandardMaterial({ color: 0x3d4d41, roughness: 0.96, metalness: 0.01 }),
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  bootGroup.add(floor);

  const innerMat = new THREE.MeshStandardMaterial({ color: 0x4b5b4d, roughness: 1 });
  const innerFloor = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1, boot.w - 2), Math.max(1, boot.l - 2)), innerMat);
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.035;
  innerFloor.receiveShadow = true;
  bootGroup.add(innerFloor);

  addFloorGrid(bootGroup);

  const floorEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(boot.w, 1, boot.l)),
    new THREE.LineBasicMaterial({ color: 0x9db091, transparent: true, opacity: 0.34 }),
  );
  floorEdge.position.y = -0.5;
  bootGroup.add(floorEdge);

  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0xc5d5c1,
    transparent: true,
    opacity: 0.037,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const sideA = new THREE.Mesh(new THREE.PlaneGeometry(boot.l, boot.h), wallMaterial);
  sideA.rotation.y = Math.PI / 2;
  sideA.position.set(-boot.w / 2, boot.h / 2, 0);
  bootGroup.add(sideA);
  const sideB = sideA.clone();
  sideB.position.x = boot.w / 2;
  bootGroup.add(sideB);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(boot.w, boot.h), wallMaterial);
  back.position.set(0, boot.h / 2, -boot.l / 2);
  bootGroup.add(back);
  const front = back.clone();
  front.position.z = boot.l / 2;
  bootGroup.add(front);

  const cageEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(boot.w, boot.h, boot.l)),
    new THREE.LineBasicMaterial({ color: 0xb5c8ab, transparent: true, opacity: 0.42 }),
  );
  cageEdges.position.y = boot.h / 2;
  bootGroup.add(cageEdges);

  addBootRim(bootGroup);

  const outside = 10.5;
  const widthZ = boot.l / 2 + outside;
  addDimension(
    bootGroup,
    new THREE.Vector3(-boot.w / 2, 1.5, widthZ),
    new THREE.Vector3(boot.w / 2, 1.5, widthZ),
    `W · ${boot.w} cm`,
    new THREE.Vector3(0, 3.2, widthZ + 4.2),
    "z",
  );

  const depthX = boot.w / 2 + outside;
  addDimension(
    bootGroup,
    new THREE.Vector3(depthX, 1.5, -boot.l / 2),
    new THREE.Vector3(depthX, 1.5, boot.l / 2),
    `L · ${boot.l} cm`,
    new THREE.Vector3(depthX + 4.5, 3.2, 0),
    "x",
  );

  const heightX = boot.w / 2 + outside;
  const heightZ = -boot.l / 2;
  addDimension(
    bootGroup,
    new THREE.Vector3(heightX, 0, heightZ),
    new THREE.Vector3(heightX, boot.h, heightZ),
    `H · ${boot.h} cm`,
    new THREE.Vector3(heightX + 4.2, boot.h / 2, heightZ),
    "x",
  );
}

function makeFabricTexture(hex) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = 1;
  for (let i = -128; i < 256; i += 5) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.035)";
  for (let i = 0; i < 256; i += 6) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.6, 2.6);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeBagMaterial(bag) {
  if (bag.type === "soft") {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: makeFabricTexture(bag.color),
      roughness: 0.83,
      metalness: 0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.9,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: bag.color,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.42,
    clearcoatRoughness: 0.38,
  });
}

function addBagHardware(group, bag, bodyMaterial, darkMaterial, accentMaterial) {
  const frontZ = bag.d / 2;
  const panelWidth = Math.max(4, bag.w - 8);
  const panelHeight = Math.max(4, bag.h - 8);
  const panel = new THREE.Mesh(
    new RoundedBoxGeometry(panelWidth, panelHeight, 0.9, 2, Math.min(panelWidth, panelHeight) * 0.07),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(bag.color).offsetHSL(0, -0.02, 0.075),
      roughness: bag.type === "soft" ? 0.9 : 0.46,
      metalness: 0,
      clearcoat: bag.type === "soft" ? 0 : 0.28,
      clearcoatRoughness: 0.5,
    }),
  );
  panel.position.set(0, bag.h / 2, frontZ + 0.12);
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);

  if (bag.type === "hard") {
    const ribMaterial = new THREE.MeshStandardMaterial({
      color: 0x17221b,
      transparent: true,
      opacity: 0.21,
      roughness: 0.55,
    });
    for (let i = 0; i < 3; i += 1) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(3, panelWidth - 6), 0.6, 0.34),
        ribMaterial,
      );
      rib.position.set(0, bag.h * (0.38 + i * 0.13), frontZ + 0.68);
      group.add(rib);
    }
  } else {
    const zip = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(4, panelWidth - 4), 0.55, 0.36),
      darkMaterial,
    );
    zip.position.set(0, bag.h * 0.56, frontZ + 0.68);
    group.add(zip);
    const pull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.5), accentMaterial);
    pull.position.set(panelWidth * 0.22, bag.h * 0.52, frontZ + 0.73);
    group.add(pull);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, Math.max(3, bag.h - 1), 0.55),
        darkMaterial,
      );
      strap.position.set(side * panelWidth * 0.3, bag.h / 2, frontZ + 0.64);
      group.add(strap);
    }
  }

  const handleWidth = Math.min(18, Math.max(8, bag.w * 0.34));
  const handle = new THREE.Mesh(
    new RoundedBoxGeometry(handleWidth, 1.25, 2.6, 1, 0.5),
    darkMaterial,
  );
  handle.position.set(0, bag.h - 0.1, 0);
  handle.castShadow = true;
  group.add(handle);

  const patch = new THREE.Mesh(new THREE.BoxGeometry(4.7, 2.6, 0.25), accentMaterial);
  patch.position.set(-bag.w * 0.27, bag.h * 0.62, frontZ + 0.74);
  group.add(patch);

  if (bag.type === "hard") {
    const footMaterial = new THREE.MeshStandardMaterial({ color: 0x1a211d, roughness: 0.65 });
    for (const x of [-bag.w * 0.34, bag.w * 0.34]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.3, 12), footMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 1.45, -bag.d * 0.24);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  bodyMaterial.needsUpdate = true;
}

function createBagObject(bag) {
  const group = new THREE.Group();
  group.userData.bagId = bag.id;
  group.position.set(bag.x, bag.bottom, bag.z);
  group.rotation.y = bag.yaw;

  const bodyMaterial = makeBagMaterial(bag);
  const radius = Math.min(bag.w, bag.d, bag.h) * 0.09;
  const bodyGeometry = new RoundedBoxGeometry(bag.w, bag.h, bag.d, 3, radius);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = bag.h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.bagId = bag.id;
  group.add(body);

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2621, roughness: 0.63, metalness: 0.08 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: bag.accent, roughness: 0.62, metalness: 0 });
  addBagHardware(group, bag, bodyMaterial, darkMaterial, accentMaterial);

  const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(bag.w + 0.7, bag.h + 0.7, bag.d + 0.7), 25);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x172019,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edge.position.y = bag.h / 2;
  group.add(edge);

  const labelEl = document.createElement("div");
  labelEl.className = "bag-label";
  const labelStrong = document.createElement("strong");
  labelStrong.textContent = bag.name;
  const labelSpan = document.createElement("span");
  labelSpan.textContent = `${bag.w} × ${bag.d} × ${bag.h} cm`;
  labelEl.append(labelStrong, labelSpan);
  const labelObj = new CSS2DObject(labelEl);
  labelObj.position.set(0, bag.h + 6, 0);
  labelObj.visible = false;
  group.add(labelObj);

  const issueEl = document.createElement("div");
  issueEl.className = "bag-issue-label";
  issueEl.textContent = "!";
  const issueObj = new CSS2DObject(issueEl);
  issueObj.position.set(bag.w * 0.38, bag.h + 3.4, bag.d * 0.12);
  issueObj.visible = false;
  group.add(issueObj);

  group.traverse((object) => {
    if (object.isMesh) object.userData.bagId = bag.id;
  });

  bag.group = group;
  bag.body = body;
  bag.bodyMaterial = bodyMaterial;
  bag.edge = edge;
  bag.labelObj = labelObj;
  bag.labelSpan = labelSpan;
  bag.issueObj = issueObj;
  scene.add(group);
}

function addSceneBag(definition) {
  const bag = {
    ...definition,
    yaw: definition.yaw ?? 0,
    bottom: definition.bottom ?? 0,
    overlap: false,
    outside: false,
    outsideReasons: [],
    group: null,
  };
  bags.push(bag);
  createBagObject(bag);
  return bag;
}

function removeSceneBag(bag) {
  scene.remove(bag.group);
  disposeObject(bag.group);
}

function boundsForBag(bag) {
  const cos = Math.cos(bag.yaw);
  const sin = Math.sin(bag.yaw);
  const halfW = bag.w / 2;
  const halfD = bag.d / 2;
  const extentX = Math.abs(cos) * halfW + Math.abs(sin) * halfD;
  const extentZ = Math.abs(sin) * halfW + Math.abs(cos) * halfD;
  return {
    minX: bag.x - extentX,
    maxX: bag.x + extentX,
    minZ: bag.z - extentZ,
    maxZ: bag.z + extentZ,
    bottom: bag.bottom,
    top: bag.bottom + bag.h,
  };
}

function bagIsWithinBoot(bag) {
  const b = boundsForBag(bag);
  const tol = 0.25;
  return (
    b.minX >= -boot.w / 2 - tol &&
    b.maxX <= boot.w / 2 + tol &&
    b.minZ >= -boot.l / 2 - tol &&
    b.maxZ <= boot.l / 2 + tol &&
    b.bottom >= -tol &&
    b.top <= boot.h + tol
  );
}

function outsideReasonsForBag(bag) {
  const b = boundsForBag(bag);
  const reasons = [];
  const tol = 0.25;
  if (b.minX < -boot.w / 2 - tol) reasons.push("left wall");
  if (b.maxX > boot.w / 2 + tol) reasons.push("right wall");
  if (b.minZ < -boot.l / 2 - tol) reasons.push("back wall");
  if (b.maxZ > boot.l / 2 + tol) reasons.push("tailgate");
  if (b.bottom < -tol) reasons.push("below floor");
  if (b.top > boot.h + tol) reasons.push("height limit");
  return reasons;
}

function bagsOverlap(a, b) {
  const aTop = a.bottom + a.h;
  const bTop = b.bottom + b.h;
  if (a.bottom >= bTop - 0.2 || b.bottom >= aTop - 0.2) return false;

  const axesA = [
    [Math.cos(a.yaw), -Math.sin(a.yaw)],
    [Math.sin(a.yaw), Math.cos(a.yaw)],
  ];
  const axesB = [
    [Math.cos(b.yaw), -Math.sin(b.yaw)],
    [Math.sin(b.yaw), Math.cos(b.yaw)],
  ];
  const axes = [...axesA, ...axesB];
  const deltaX = b.x - a.x;
  const deltaZ = b.z - a.z;

  for (const [axisX, axisZ] of axes) {
    const distance = Math.abs(deltaX * axisX + deltaZ * axisZ);
    const radiusA =
      (a.w / 2) * Math.abs(axesA[0][0] * axisX + axesA[0][1] * axisZ) +
      (a.d / 2) * Math.abs(axesA[1][0] * axisX + axesA[1][1] * axisZ);
    const radiusB =
      (b.w / 2) * Math.abs(axesB[0][0] * axisX + axesB[0][1] * axisZ) +
      (b.d / 2) * Math.abs(axesB[1][0] * axisX + axesB[1][1] * axisZ);
    if (distance > radiusA + radiusB - 0.2) return false;
  }
  return true;
}

function evaluateLoad() {
  const overlapPairs = [];
  bags.forEach((bag) => {
    bag.outsideReasons = outsideReasonsForBag(bag);
    bag.outside = bag.outsideReasons.length > 0;
    bag.overlap = false;
  });

  for (let i = 0; i < bags.length; i += 1) {
    for (let j = i + 1; j < bags.length; j += 1) {
      if (bagsOverlap(bags[i], bags[j])) {
        bags[i].overlap = true;
        bags[j].overlap = true;
        overlapPairs.push([bags[i], bags[j]]);
      }
    }
  }

  const outside = bags.filter((bag) => bag.outside).length;
  const fit = bags.filter((bag) => !bag.outside && !bag.overlap).length;
  const maxTop = bags.reduce((max, bag) => Math.max(max, bag.bottom + bag.h), 0);
  const headroom = boot.h - maxTop;
  loadMetrics = { fit, outside, overlapPairs: overlapPairs.length, headroom, maxTop };
  return { outside, fit, overlapPairs, headroom, maxTop };
}

function syncBagVisuals() {
  bags.forEach((bag) => {
    const isSelected = bag.id === selectedId;
    const hasIssue = bag.outside || bag.overlap;
    bag.group.position.set(bag.x, bag.bottom, bag.z);
    bag.group.rotation.y = bag.yaw;
    bag.edge.material.color.setHex(hasIssue ? 0xff7862 : isSelected ? 0xf1b56f : 0x172019);
    bag.edge.material.opacity = hasIssue ? 0.98 : isSelected ? 0.86 : 0.24;
    bag.bodyMaterial.emissive.setHex(hasIssue ? 0x761f18 : isSelected ? 0x7e4d19 : 0x000000);
    bag.bodyMaterial.emissiveIntensity = hasIssue ? 0.13 : isSelected ? 0.06 : 0;
    bag.labelObj.visible = isSelected;
    bag.issueObj.visible = hasIssue && !isSelected;
    const status = hasIssue ? (bag.outside && bag.overlap ? "Overlap + outside" : bag.outside ? "Outside" : "Overlapping") : "Fits";
    bag.labelSpan.textContent = `${bag.w} × ${bag.d} × ${bag.h} cm · ${status}`;
  });
}

function createBagRow(bag) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "bag-row";
  row.dataset.bagId = String(bag.id);
  row.setAttribute("aria-label", `Select ${bag.name}`);

  const swatch = document.createElement("span");
  swatch.className = "bag-swatch";
  swatch.style.setProperty("--swatch", bag.color);

  const copy = document.createElement("span");
  copy.className = "bag-copy";
  const name = document.createElement("strong");
  name.textContent = bag.name;
  const dimensions = document.createElement("small");
  dimensions.textContent = `${bag.w} × ${bag.d} × ${bag.h} cm`;
  copy.append(name, dimensions);

  const state = document.createElement("span");
  state.className = "bag-state";
  state.textContent = "Fits";

  row.append(swatch, copy, state);
  row.addEventListener("click", () => selectBag(bag.id));
  bagListEl.appendChild(row);
  bag.row = row;
  bag.rowState = state;
}

function rebuildBagList() {
  bagListEl.replaceChildren();
  bags.forEach(createBagRow);
}

function updateBagRows() {
  bags.forEach((bag) => {
    if (!bag.row) return;
    const hasIssue = bag.outside || bag.overlap;
    const status = hasIssue
      ? bag.outside && bag.overlap
        ? "2 issues"
        : bag.outside
          ? "Outside"
          : "Overlap"
      : "Fits";
    bag.row.classList.toggle("is-selected", bag.id === selectedId);
    bag.row.classList.toggle("has-issues", hasIssue);
    bag.row.setAttribute("aria-pressed", String(bag.id === selectedId));
    bag.rowState.textContent = status;
    bag.rowState.classList.toggle("is-bad", hasIssue);
  });
}

function updateSelectionDock() {
  const selected = bags.find((bag) => bag.id === selectedId);
  if (!selected) {
    selectionDock.hidden = true;
    return;
  }
  selectionDock.hidden = false;
  selectedSwatch.style.background = selected.color;
  selectedName.textContent = selected.name;
  selectedDims.textContent = `${selected.w} × ${selected.d} × ${selected.h} cm · ${angleDegrees(selected.yaw)}°`;
  const hasIssue = selected.outside || selected.overlap;
  selectedStatus.textContent = hasIssue
    ? selected.outside && selected.overlap
      ? "2 issues"
      : selected.outside
        ? "Outside"
        : "Overlap"
    : "Fits";
  selectedStatus.classList.toggle("is-bad", hasIssue);
}

function updateFitPanel() {
  const total = bags.length;
  const pct = total > 0 ? Math.round((loadMetrics.fit / total) * 100) : 0;
  const hasIssues = loadMetrics.outside > 0 || loadMetrics.overlapPairs > 0;
  const ringColor = hasIssues ? "#c75043" : "#668a5b";

  fitRing.style.setProperty("--pct", String(pct));
  fitRing.style.setProperty("--ring", ringColor);
  fitRingCaption.textContent = total === 1 ? "bag fit" : "bags fit";
  fitRing.setAttribute("aria-label", `${loadMetrics.fit} of ${total} ${total === 1 ? "bag" : "bags"} fit`);
  fitCount.textContent = String(loadMetrics.fit);
  fitTotal.textContent = String(total);
  overlapCount.textContent = String(loadMetrics.overlapPairs);
  outsideCount.textContent = String(loadMetrics.outside);
  bagCountEl.textContent = `${total} ${total === 1 ? "bag" : "bags"}`;

  overlapCount.classList.toggle("is-bad", loadMetrics.overlapPairs > 0);
  outsideCount.classList.toggle("is-bad", loadMetrics.outside > 0);

  const headroomRounded = Math.round(loadMetrics.headroom * 10) / 10;
  const headroomBad = headroomRounded < 0;
  headroomValue.textContent = total === 0 ? "—" : headroomBad ? `−${roundMeasure(Math.abs(headroomRounded))} cm` : `${roundMeasure(headroomRounded)} cm`;
  headroomValue.classList.toggle("is-bad", headroomBad);

  if (total === 0) {
    fitTitle.textContent = "Empty boot";
    fitDetail.textContent = "Add a bag to begin the fit check.";
  } else if (!hasIssues) {
    fitTitle.textContent = "Clear to close";
    fitDetail.textContent = loadMetrics.fit === 1 ? "The bag sits inside the load space." : "Every bag sits inside the load space.";
  } else if (loadMetrics.outside > 0) {
    fitTitle.textContent = "Boot won’t close";
    fitDetail.textContent = "A bag is breaking the boot outline.";
  } else {
    fitTitle.textContent = "Not quite yet";
    fitDetail.textContent = "Separate the overlapping bags.";
  }

  if (hasIssues) {
    const parts = [];
    if (loadMetrics.overlapPairs > 0) {
      parts.push(`${loadMetrics.overlapPairs} overlapping ${loadMetrics.overlapPairs === 1 ? "pair" : "pairs"}`);
    }
    if (loadMetrics.outside > 0) {
      parts.push(`${loadMetrics.outside} ${loadMetrics.outside === 1 ? "bag" : "bags"} outside the load space`);
    }
    issueText.textContent = `Check the red bags: ${parts.join(" and ")}.`;
    issueAlert.hidden = false;
  } else {
    issueAlert.hidden = true;
  }

  topbarStatus.classList.toggle("has-issues", hasIssues);
  headerStatus.textContent = hasIssues ? "Check the load" : total === 0 ? "Empty boot" : "Clear to close";
  headerDot.setAttribute("aria-label", hasIssues ? "Load has issues" : "Load is clear");
}

function updateAllUI() {
  evaluateLoad();
  syncBagVisuals();
  updateBagRows();
  updateSelectionDock();
  updateFitPanel();
  headerDims.textContent = `${boot.w} × ${boot.l} × ${boot.h} cm`;
}

function selectBag(id) {
  if (!bags.some((bag) => bag.id === id)) return;
  selectedId = id;
  updateAllUI();
}

function rotateSelected(radians) {
  const bag = bags.find((item) => item.id === selectedId);
  if (!bag) return;
  bag.yaw = normalizeAngle(bag.yaw + radians);
  updateAllUI();
}

function liftSelected(amount) {
  const bag = bags.find((item) => item.id === selectedId);
  if (!bag) return;
  bag.bottom = clamp(Math.round(bag.bottom + amount), 0, boot.h * 2);
  updateAllUI();
}

function removeSelected() {
  const index = bags.findIndex((bag) => bag.id === selectedId);
  if (index < 0) return;
  const [removed] = bags.splice(index, 1);
  removeSceneBag(removed);
  if (bags.length) {
    selectedId = bags[Math.min(index, bags.length - 1)].id;
  } else {
    selectedId = null;
  }
  rebuildBagList();
  updateAllUI();
  showToast(`${removed.name} removed`);
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  boot.w = preset.w;
  boot.l = preset.l;
  boot.h = preset.h;
  dimensionInputs.w.value = String(boot.w);
  dimensionInputs.l.value = String(boot.l);
  dimensionInputs.h.value = String(boot.h);
  syncPresetButtons();
  rebuildBoot();
  updateAllUI();
  applyView(activeView);
  showToast(`${preset.label} dimensions applied`);
}

function syncPresetButtons() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    const preset = PRESETS[button.dataset.preset];
    button.classList.toggle("is-active", preset && preset.w === boot.w && preset.l === boot.l && preset.h === boot.h);
  });
}

function applyBootInput(input, finalize) {
  const key = input === dimensionInputs.w ? "w" : input === dimensionInputs.l ? "l" : "h";
  const [min, max] = BOOT_LIMITS[key];
  const numeric = Number.parseFloat(input.value);
  if (!Number.isFinite(numeric)) {
    if (finalize) input.value = String(boot[key]);
    return;
  }
  const next = clamp(Math.round(numeric), min, max);
  boot[key] = next;
  input.value = String(next);
  syncPresetButtons();
  rebuildBoot();
  updateAllUI();
  if (finalize) applyView(activeView);
}

function computeCameraPose(view) {
  const aspect = Math.max(0.35, camera.aspect || 1);
  const radius = Math.sqrt(boot.w * boot.w + boot.l * boot.l + boot.h * boot.h) / 2 + 4;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const fitPadding = isMobileLayout() ? 1.27 : 1.13;
  const distance = (radius / Math.sin(limitingFov / 2)) * fitPadding;

  if (view === "top") {
    return {
      position: new THREE.Vector3(0, distance, 0.01),
      target: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 0, -1),
    };
  }

  const direction = new THREE.Vector3(0.94, 0.7, 1.12).normalize();
  const target = new THREE.Vector3(0, boot.h * 0.16, 0);
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    up: new THREE.Vector3(0, 1, 0),
  };
}

function applyView(view) {
  activeView = view;
  const pose = computeCameraPose(view);
  camera.up.copy(pose.up);
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  controls.update();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
}

function resizeScene() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  if (!width || !height) return;
  const changed = width !== lastStageSize.width || height !== lastStageSize.height;
  lastStageSize = { width, height };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (changed) applyView(activeView);
}

function createPositionCandidate(template, x, z, yaw, bottom) {
  return {
    ...template,
    x,
    z,
    yaw,
    bottom,
  };
}

function findBagPlacement(template) {
  const margin = 1.5;
  const yaws = [0, Math.PI / 2];

  for (const yaw of yaws) {
    const temp = createPositionCandidate(template, 0, 0, yaw, 0);
    const bounds = boundsForBag(temp);
    const halfX = (bounds.maxX - bounds.minX) / 2;
    const halfZ = (bounds.maxZ - bounds.minZ) / 2;
    const minX = -boot.w / 2 + halfX + margin;
    const maxX = boot.w / 2 - halfX - margin;
    const minZ = -boot.l / 2 + halfZ + margin;
    const maxZ = boot.l / 2 - halfZ - margin;
    if (minX > maxX || minZ > maxZ) continue;

    for (let z = minZ; z <= maxZ; z += 2) {
      for (let x = minX; x <= maxX; x += 2) {
        const candidate = createPositionCandidate(template, x, z, yaw, 0);
        if (!bagIsWithinBoot(candidate)) continue;
        if (bags.every((bag) => !bagsOverlap(candidate, bag))) {
          return candidate;
        }
      }
    }
  }

  const stacks = [...bags].sort((a, b) => a.bottom + a.h - (b.bottom + b.h));
  for (const base of stacks) {
    const bottom = base.bottom + base.h;
    if (bottom + template.h > boot.h) continue;
    const candidate = createPositionCandidate(template, base.x, base.z, base.yaw, bottom);
    if (bagIsWithinBoot(candidate) && bags.every((bag) => !bagsOverlap(candidate, bag))) {
      return candidate;
    }
  }

  return createPositionCandidate(template, 0, 0, 0, 0);
}

function addBag() {
  if (bags.length >= 10) {
    showToast("The manifest is full — remove a bag first");
    return;
  }
  const template = EXTRA_BAGS[extraBagIndex % EXTRA_BAGS.length];
  extraBagIndex += 1;
  const similar = bags.filter((bag) => bag.name.startsWith(template.name)).length;
  const placement = findBagPlacement(template);
  const newBag = addSceneBag({
    id: nextBagId,
    ...placement,
    name: similar > 0 ? `${template.name} ${similar + 1}` : template.name,
  });
  nextBagId += 1;
  selectedId = newBag.id;
  rebuildBagList();
  updateAllUI();
  showToast(`${newBag.name} added`);
}

function resetLoad() {
  bags.forEach(removeSceneBag);
  bags = [];
  nextBagId = 5;
  extraBagIndex = 0;
  INITIAL_BAGS.forEach((definition) => addSceneBag(definition));
  selectedId = 3;
  rebuildBagList();
  updateAllUI();
  showToast("Starting load restored");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 1900);
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickBag(event) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const roots = bags.map((bag) => bag.group);
  const hits = raycaster.intersectObjects(roots, true);
  for (const hit of hits) {
    let object = hit.object;
    while (object && object.userData.bagId === undefined) object = object.parent;
    if (object && object.userData.bagId !== undefined) {
      return bags.find((bag) => bag.id === object.userData.bagId) || null;
    }
  }
  return null;
}

function floorPointAt(event, height) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  dragPlane.setFromNormalAndCoplanarPoint(upVector, new THREE.Vector3(0, height, 0));
  return raycaster.ray.intersectPlane(dragPlane, dragPoint);
}

function onPointerDown(event) {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  const bag = pickBag(event);
  if (!bag) return;

  selectBag(bag.id);
  const point = floorPointAt(event, bag.bottom);
  const mode = event.shiftKey ? "lift" : dragMode;
  dragState = {
    bag,
    mode,
    pointerId: event.pointerId,
    startClientY: event.clientY,
    startBottom: bag.bottom,
    offsetX: point ? bag.x - point.x : 0,
    offsetZ: point ? bag.z - point.z : 0,
  };
  controls.enabled = false;
  renderer.domElement.classList.add("is-dragging");
  event.preventDefault();
  event.stopImmediatePropagation();
}

function onPointerMove(event) {
  if (!dragState) {
    if (event.target !== renderer.domElement) {
      renderer.domElement.style.cursor = "grab";
      return;
    }
    const hoverBag = pickBag(event);
    renderer.domElement.style.cursor = hoverBag ? (dragMode === "lift" ? "ns-resize" : "grab") : "grab";
    return;
  }

  const { bag, mode } = dragState;
  if (mode === "lift") {
    const delta = (dragState.startClientY - event.clientY) * 0.55;
    bag.bottom = clamp(Math.round((dragState.startBottom + delta) * 2) / 2, 0, boot.h * 2);
  } else {
    const point = floorPointAt(event, bag.bottom);
    if (point) {
      const limitX = Math.max(boot.w, bag.w) * 1.12;
      const limitZ = Math.max(boot.l, bag.d) * 1.12;
      bag.x = clamp(point.x + dragState.offsetX, -limitX, limitX);
      bag.z = clamp(point.z + dragState.offsetZ, -limitZ, limitZ);
    }
  }
  event.preventDefault();
  updateAllUI();
}

function endDrag(event) {
  if (!dragState) return;
  if (event && event.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;
  dragState = null;
  controls.enabled = true;
  renderer.domElement.classList.remove("is-dragging");
}

function openBootSheet() {
  if (!isMobileLayout()) return;
  bootPanel.classList.add("is-open");
  sheetScrim.classList.add("is-visible");
  bootPanel.setAttribute("role", "dialog");
  bootPanel.setAttribute("aria-modal", "true");
  bootSizeBtn.setAttribute("aria-expanded", "true");
  window.setTimeout(() => bootCloseBtn.focus(), 80);
}

function closeBootSheet() {
  const wasOpen = bootPanel.classList.contains("is-open");
  bootPanel.classList.remove("is-open");
  sheetScrim.classList.remove("is-visible");
  bootPanel.removeAttribute("role");
  bootPanel.removeAttribute("aria-modal");
  bootSizeBtn.setAttribute("aria-expanded", "false");
  if (wasOpen && isMobileLayout()) bootSizeBtn.focus();
}

function handleKeyboard(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === "Escape") {
    closeBootSheet();
    return;
  }
  if (bootPanel.classList.contains("is-open")) return;
  const bag = bags.find((item) => item.id === selectedId);
  if (!bag) return;
  const step = event.altKey ? 5 : 2;
  let handled = true;
  switch (event.key.toLowerCase()) {
    case "q":
      rotateSelected(-Math.PI / 12);
      break;
    case "e":
      rotateSelected(Math.PI / 12);
      break;
    case "r":
      rotateSelected(Math.PI / 2);
      break;
    case "arrowleft":
      bag.x -= step;
      break;
    case "arrowright":
      bag.x += step;
      break;
    case "arrowup":
      bag.z -= step;
      break;
    case "arrowdown":
      bag.z += step;
      break;
    case "pageup":
      bag.bottom = clamp(bag.bottom + 5, 0, boot.h * 2);
      break;
    case "pagedown":
      bag.bottom = clamp(bag.bottom - 5, 0, boot.h * 2);
      break;
    case "delete":
    case "backspace":
      removeSelected();
      break;
    default:
      handled = false;
  }
  if (handled) {
    event.preventDefault();
    updateAllUI();
  }
}

function onSelectionAction(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "rotate-left") rotateSelected(-Math.PI / 12);
  if (action === "rotate-right") rotateSelected(Math.PI / 12);
  if (action === "turn") rotateSelected(Math.PI / 2);
  if (action === "raise") liftSelected(5);
  if (action === "lower") liftSelected(-5);
  if (action === "remove") removeSelected();
}

function onSelectionMode(event) {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  dragMode = button.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach((modeButton) => {
    modeButton.classList.toggle("is-active", modeButton.dataset.mode === dragMode);
  });
  renderer.domElement.style.cursor = dragMode === "lift" ? "ns-resize" : "grab";
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  controls.update(delta);
  labelRenderer.render(scene, camera);
  renderer.render(scene, camera);
}

INITIAL_BAGS.forEach((definition) => addSceneBag(definition));
rebuildBagList();
rebuildBoot();
resizeScene();
applyView("iso");
updateAllUI();

const resizeObserver = new ResizeObserver(() => resizeScene());
resizeObserver.observe(mount);

renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
renderer.domElement.addEventListener("pointerleave", () => {
  if (!dragState) renderer.domElement.style.cursor = "grab";
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});
Object.values(dimensionInputs).forEach((input) => {
  input.addEventListener("change", () => applyBootInput(input, true));
});
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => applyView(button.dataset.view));
});
document.querySelector("#viewResetBtn").addEventListener("click", () => applyView(activeView));
document.querySelector(".selection-actions").addEventListener("click", (event) => {
  if (event.target.closest("[data-mode]")) onSelectionMode(event);
  else onSelectionAction(event);
});
resetBtn.addEventListener("click", resetLoad);
addBagBtn.addEventListener("click", addBag);
bootSizeBtn.addEventListener("click", openBootSheet);
bootCloseBtn.addEventListener("click", closeBootSheet);
sheetScrim.addEventListener("click", closeBootSheet);
window.addEventListener("keydown", handleKeyboard);
window.addEventListener("resize", () => {
  if (!isMobileLayout()) closeBootSheet();
});

animate();
