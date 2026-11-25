import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const viewport = document.querySelector("#viewport");
const annotationLayer = document.querySelector("#annotationLayer");
const bootWidthInput = document.querySelector("#bootWidth");
const bootDepthInput = document.querySelector("#bootDepth");
const bootHeightInput = document.querySelector("#bootHeight");
const bootSizeReadout = document.querySelector("#bootSizeReadout");
const floorAreaOutput = document.querySelector("#floorArea");
const clearHeightOutput = document.querySelector("#clearHeight");
const fitBadge = document.querySelector("#fitBadge");
const fitBadgeText = document.querySelector("#fitBadgeText");
const fitSummary = document.querySelector("#fitSummary");
const fitCountOutput = document.querySelector("#fitCount");
const bagCountOutput = document.querySelector("#bagCount");
const fitTitle = document.querySelector("#fitTitle");
const fitMessage = document.querySelector("#fitMessage");
const fitMeterFill = document.querySelector("#fitMeterFill");
const summaryIcon = document.querySelector(".summary-icon");
const floorUsedOutput = document.querySelector("#floorUsed");
const bagVolumeOutput = document.querySelector("#bagVolume");
const issueCountOutput = document.querySelector("#issueCount");
const bagList = document.querySelector("#bagList");
const addBagButton = document.querySelector("#addBagBtn");
const resetLayoutButton = document.querySelector("#resetLayoutBtn");
const turnLeftButton = document.querySelector("#turnLeftBtn");
const turnRightButton = document.querySelector("#turnRightBtn");
const selectionBar = document.querySelector("#selectionBar");
const selectedSwatch = document.querySelector("#selectedSwatch");
const selectedName = document.querySelector("#selectedName");
const selectedDims = document.querySelector("#selectedDims");
const selectedPosition = document.querySelector("#selectedPosition");
const toast = document.querySelector("#toast");
const viewButtons = [...document.querySelectorAll(".view-button")];
const presetButtons = [...document.querySelectorAll(".preset-button")];
const dragHint = document.querySelector("#dragHint");

const boot = {
  width: 120,
  depth: 82,
  height: 52,
};

const initialBagSeeds = [
  {
    id: "grand-tourer",
    name: "Grand Tourer",
    type: "Check-in case",
    width: 68,
    depth: 30,
    height: 46,
    positionX: -17,
    positionZ: -25,
    rotationDeg: 0,
    color: 0xb85c3d,
    style: "roller",
  },
  {
    id: "carry-on",
    name: "Carry-on",
    type: "Cabin case",
    width: 54,
    depth: 26,
    height: 38,
    positionX: -23,
    positionZ: 20,
    rotationDeg: 0,
    color: 0xd0a13a,
    style: "roller",
  },
  {
    id: "weekender",
    name: "Weekender",
    type: "Soft duffel",
    width: 50,
    depth: 28,
    height: 26,
    positionX: 34,
    positionZ: 7,
    rotationDeg: 0,
    color: 0x5d7b83,
    style: "duffel",
  },
];

const extraBagSeeds = [
  { name: "Cabin case", type: "Cabin case", width: 40, depth: 23, height: 36, color: 0x70805f, style: "roller" },
  { name: "Camera kit", type: "Shoulder bag", width: 34, depth: 25, height: 22, color: 0xc47950, style: "duffel" },
  { name: "Kids' case", type: "Small case", width: 44, depth: 25, height: 32, color: 0x7a7089, style: "roller" },
  { name: "Bedroll", type: "Soft roll", width: 58, depth: 22, height: 20, color: 0x8b9a7b, style: "duffel" },
];

const bootPresets = {
  hatch: { width: 95, depth: 70, height: 48 },
  estate: { width: 120, depth: 82, height: 52 },
  suv: { width: 115, depth: 95, height: 60 },
};

let bags = cloneBagSeeds(initialBagSeeds);
let selectedBagId = "grand-tourer";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 1, 1600);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();
const projectedPoint = new THREE.Vector3();
const bagGroups = new Map();
const bagTags = new Map();
const dimensionTags = [];
const bootGroup = new THREE.Group();
const warningDecorGroup = new THREE.Group();
scene.add(bootGroup, warningDecorGroup);

let renderer;
let controls;
let dragState = null;
let cameraTween = null;
let toastTimer = 0;
let lastUiSignature = "";
let totalBagsAdded = 0;

function cloneBagSeeds(seeds) {
  return seeds.map((seed) => ({ ...seed }));
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function colorToCss(colorValue) {
  return `#${colorValue.toString(16).padStart(6, "0")}`;
}

function signedCentimeters(value) {
  const rounded = Math.round(value * 2) / 2;
  const sign = rounded < 0 ? "−" : "";
  const absolute = Math.abs(rounded);
  return `${sign}${Number.isInteger(absolute) ? absolute : absolute.toFixed(1)}`;
}

function shortNumber(value) {
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function setupScene() {
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    viewport.classList.add("no-webgl");
    const fallback = document.createElement("p");
    fallback.className = "webgl-fallback";
    fallback.textContent = "3D view unavailable. The fit measurements still work in the panels.";
    viewport.append(fallback);
    return false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.append(renderer.domElement);

  camera.position.set(146, 145, 190);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 14, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 105;
  controls.maxDistance = 560;
  controls.minPolarAngle = 0.16;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.72;
  controls.update();

  const hemisphereLight = new THREE.HemisphereLight(0xfff8e9, 0x708174, 2.15);
  scene.add(hemisphereLight);

  const keyLight = new THREE.DirectionalLight(0xfff1d8, 3.25);
  keyLight.position.set(130, 210, 140);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -170;
  keyLight.shadow.camera.right = 170;
  keyLight.shadow.camera.top = 170;
  keyLight.shadow.camera.bottom = -170;
  keyLight.shadow.camera.near = 20;
  keyLight.shadow.camera.far = 520;
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.normalBias = 0.7;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xa5c2c8, 1.2);
  fillLight.position.set(-155, 95, -130);
  scene.add(fillLight);

  const warmFill = new THREE.DirectionalLight(0xffcba4, 0.65);
  warmFill.position.set(-75, 45, 155);
  scene.add(warmFill);

  const groundShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.ShadowMaterial({ color: 0x324238, opacity: 0.16 }),
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = -3.7;
  groundShadow.receiveShadow = true;
  scene.add(groundShadow);

  const resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(viewport);
  resizeRenderer();
  return true;
}

function resizeRenderer() {
  if (!renderer) {
    return;
  }
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function disposeGroup(group) {
  group.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
  group.clear();
}

function makeLineMaterial(color, opacity = 1) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
  });
}

function buildBoot() {
  disposeGroup(bootGroup);
  bootGroup.position.set(0, 0, 0);

  const halfWidth = boot.width / 2;
  const halfDepth = boot.depth / 2;

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2cdbf,
    roughness: 0.96,
    metalness: 0.01,
  });
  const floor = new THREE.Mesh(
    new RoundedBoxGeometry(boot.width, 3.2, boot.depth, 4, 2.2),
    floorMaterial,
  );
  floor.position.y = -1.6;
  floor.receiveShadow = true;
  floor.castShadow = false;
  bootGroup.add(floor);

  const floorInset = new THREE.Mesh(
    new RoundedBoxGeometry(boot.width - 5, 0.9, boot.depth - 5, 3, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xbfbcb0, roughness: 1 }),
  );
  floorInset.position.y = 0.1;
  floorInset.receiveShadow = true;
  bootGroup.add(floorInset);

  const gridVertices = [];
  const gridStep = 10;
  for (let xPosition = -Math.floor(halfWidth / gridStep) * gridStep; xPosition <= halfWidth; xPosition += gridStep) {
    gridVertices.push(xPosition, 0.57, -halfDepth + 1.5, xPosition, 0.57, halfDepth - 1.5);
  }
  for (let zPosition = -Math.floor(halfDepth / gridStep) * gridStep; zPosition <= halfDepth; zPosition += gridStep) {
    gridVertices.push(-halfWidth + 1.5, 0.57, zPosition, halfWidth - 1.5, 0.57, zPosition);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color: 0x65796c, transparent: true, opacity: 0.19, depthWrite: false }),
  );
  bootGroup.add(grid);

  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8eaa9b,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(boot.width, boot.height), wallMaterial);
  backWall.position.set(0, boot.height / 2, -halfDepth);
  bootGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(boot.depth, boot.height), wallMaterial);
  leftWall.position.set(-halfWidth, boot.height / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  bootGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(boot.depth, boot.height), wallMaterial.clone());
  rightWall.material.opacity = 0.045;
  rightWall.position.set(halfWidth, boot.height / 2, 0);
  rightWall.rotation.y = Math.PI / 2;
  bootGroup.add(rightWall);

  const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(boot.width, boot.height, boot.depth));
  const frame = new THREE.LineSegments(frameGeometry, makeLineMaterial(0x445d50, 0.43));
  frame.position.y = boot.height / 2;
  bootGroup.add(frame);

  const topRimGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfWidth, boot.height, halfDepth),
    new THREE.Vector3(halfWidth, boot.height, halfDepth),
    new THREE.Vector3(halfWidth, boot.height, -halfDepth),
    new THREE.Vector3(-halfWidth, boot.height, -halfDepth),
  ]);
  const topRim = new THREE.Line(topRimGeometry, makeLineMaterial(0xe06a40, 0.82));
  topRim.position.y = 0;
  bootGroup.add(topRim);

  const frontLipGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfWidth, 0.65, halfDepth + 0.2),
    new THREE.Vector3(halfWidth, 0.65, halfDepth + 0.2),
  ]);
  const frontLip = new THREE.Line(frontLipGeometry, makeLineMaterial(0xe06a40, 0.84));
  bootGroup.add(frontLip);

  const tickMaterial = new THREE.LineBasicMaterial({ color: 0x52675a, transparent: true, opacity: 0.58 });
  const tickVertices = [];
  for (let xPosition = -halfWidth; xPosition <= halfWidth + 0.1; xPosition += 10) {
    const tickHeight = xPosition % 50 === 0 ? 3.2 : 1.6;
    tickVertices.push(xPosition, 0.7, halfDepth + 0.2, xPosition, 0.7 + tickHeight, halfDepth + 0.2);
  }
  const tickGeometry = new THREE.BufferGeometry();
  tickGeometry.setAttribute("position", new THREE.Float32BufferAttribute(tickVertices, 3));
  bootGroup.add(new THREE.LineSegments(tickGeometry, tickMaterial));

  const hookMaterial = new THREE.MeshStandardMaterial({ color: 0x667069, roughness: 0.54, metalness: 0.55 });
  const hookGeometry = new THREE.TorusGeometry(2.2, 0.45, 6, 16, Math.PI * 1.45);
  const hookPositions = [
    [-halfWidth + 8, 1, -halfDepth + 8],
    [halfWidth - 8, 1, -halfDepth + 8],
    [-halfWidth + 8, 1, halfDepth - 8],
    [halfWidth - 8, 1, halfDepth - 8],
  ];
  hookPositions.forEach(([hookX, hookY, hookZ]) => {
    const hook = new THREE.Mesh(hookGeometry, hookMaterial);
    hook.position.set(hookX, hookY, hookZ);
    hook.rotation.x = -Math.PI / 2;
    hook.castShadow = true;
    bootGroup.add(hook);
  });

  updateDimensionTags();
}

function addRoundedBox(parent, width, height, depth, xPosition, yPosition, zPosition, material, radius = 1, segments = 3) {
  const safeRadius = Math.max(0.15, Math.min(radius, width / 2 - 0.01, height / 2 - 0.01, depth / 2 - 0.01));
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, segments, safeRadius),
    material,
  );
  mesh.position.set(xPosition, yPosition, zPosition);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBagObject(bag) {
  const root = new THREE.Group();
  root.name = `bag-${bag.id}`;
  root.userData.bagId = bag.id;

  const shellColor = new THREE.Color(bag.color);
  const trimColor = shellColor.clone().multiplyScalar(0.69);
  const lightColor = shellColor.clone().lerp(new THREE.Color(0xfff7e8), 0.18);
  const shellMaterial = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.72, metalness: 0.02 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.67, metalness: 0.04 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: lightColor, roughness: 0.7, metalness: 0.02 });
  const hardwareMaterial = new THREE.MeshStandardMaterial({ color: 0x252a26, roughness: 0.74, metalness: 0.08 });
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2320, roughness: 0.84 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x8d9088, roughness: 0.38, metalness: 0.68 });

  const width = bag.width;
  const depth = bag.depth;
  const height = bag.height;

  if (bag.style === "duffel") {
    const bottom = 1.7;
    const bodyHeight = height - 3.4;
    const bodyWidth = width * 0.98;
    const bodyDepth = depth * 0.95;
    const bodyRadius = Math.min(6.5, bodyHeight * 0.24, bodyWidth * 0.09);
    const bodyCenterY = bottom + bodyHeight / 2;

    addRoundedBox(root, bodyWidth, bodyHeight, bodyDepth, 0, bodyCenterY, 0, shellMaterial, bodyRadius, 4);

    [-0.25, 0.25].forEach((fraction) => {
      addRoundedBox(
        root,
        Math.max(2.7, bodyWidth * 0.055),
        bodyHeight + 1.2,
        bodyDepth + 0.9,
        bodyWidth * fraction,
        bodyCenterY,
        0,
        trimMaterial,
        0.8,
        3,
      );
    });

    addRoundedBox(
      root,
      bodyWidth * 0.52,
      1,
      0.8,
      0,
      bottom + bodyHeight * 0.63,
      bodyDepth / 2 + 0.65,
      hardwareMaterial,
      0.4,
      2,
    );

    addRoundedBox(
      root,
      bodyWidth * 0.34,
      2.2,
      4.2,
      0,
      height - 1.25,
      0,
      hardwareMaterial,
      1,
      3,
    );

    const footGeometry = new THREE.CylinderGeometry(1.7, 1.7, 1.2, 10);
    [-1, 1].forEach((xSign) => {
      [-1, 1].forEach((zSign) => {
        const foot = new THREE.Mesh(footGeometry, wheelMaterial);
        foot.position.set(xSign * (bodyWidth / 2 - 5), 0.6, zSign * (bodyDepth / 2 - 5));
        foot.castShadow = true;
        root.add(foot);
      });
    });
  } else {
    const wheelRadius = Math.min(3, height * 0.07);
    const bodyBottom = wheelRadius * 1.85;
    const bodyTop = height - 2.6;
    const bodyHeight = Math.max(10, bodyTop - bodyBottom);
    const bodyWidth = width * 0.97;
    const bodyDepth = depth * 0.95;
    const bodyCenterY = bodyBottom + bodyHeight / 2;

    addRoundedBox(root, bodyWidth, bodyHeight, bodyDepth, 0, bodyCenterY, 0, shellMaterial, 3.8, 4);

    addRoundedBox(
      root,
      bodyWidth * 0.67,
      bodyHeight * 0.32,
      1.15,
      0,
      bodyBottom + bodyHeight * 0.54,
      bodyDepth / 2 + 0.25,
      panelMaterial,
      1.1,
      3,
    );

    addRoundedBox(
      root,
      bodyWidth * 0.74,
      0.55,
      0.72,
      0,
      bodyBottom + bodyHeight * 0.79,
      bodyDepth / 2 + 0.75,
      hardwareMaterial,
      0.25,
      2,
    );

    [-1, 1].forEach((xSign) => {
      addRoundedBox(
        root,
        1.1,
        bodyHeight * 0.54,
        1.2,
        xSign * (bodyWidth / 2 + 0.1),
        bodyCenterY + 1,
        0,
        trimMaterial,
        0.45,
        2,
      );
    });

    addRoundedBox(
      root,
      bodyWidth * 0.3,
      2.4,
      4.1,
      0,
      height - 1.2,
      0,
      hardwareMaterial,
      1.15,
      3,
    );

    addRoundedBox(
      root,
      bodyWidth * 0.16,
      0.7,
      0.45,
      0,
      bodyBottom + bodyHeight * 0.29,
      bodyDepth / 2 + 0.8,
      metalMaterial,
      0.22,
      2,
    );

    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 2.3, 12);
    wheelGeometry.rotateZ(Math.PI / 2);
    [-1, 1].forEach((xSign) => {
      [-1, 1].forEach((zSign) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(
          xSign * (bodyWidth / 2 - wheelRadius * 0.8),
          wheelRadius,
          zSign * (bodyDepth / 2 - wheelRadius * 0.8),
        );
        wheel.castShadow = true;
        root.add(wheel);
      });
    });
  }

  const selectionOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 2.2, height + 2.2, depth + 2.2), 28),
    new THREE.LineBasicMaterial({
      color: 0xf4a56f,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false,
    }),
  );
  selectionOutline.position.y = height / 2;
  selectionOutline.renderOrder = 8;
  selectionOutline.visible = false;
  selectionOutline.raycast = () => {};
  root.add(selectionOutline);
  root.userData.selectionOutline = selectionOutline;

  const warningGroup = new THREE.Group();
  warningGroup.visible = false;
  warningGroup.renderOrder = 7;

  const warningColor = 0xc83f31;
  const footprintMaterial = new THREE.MeshBasicMaterial({
    color: warningColor,
    transparent: true,
    opacity: 0.13,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  });
  const footprint = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.4, depth + 1.4), footprintMaterial);
  footprint.rotation.x = -Math.PI / 2;
  footprint.position.y = 0.9;
  footprint.raycast = () => {};
  warningGroup.add(footprint);

  const warningBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 1.4, height + 1.4, depth + 1.4)),
    new THREE.LineBasicMaterial({
      color: warningColor,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    }),
  );
  warningBox.position.y = height / 2;
  warningBox.raycast = () => {};
  warningGroup.add(warningBox);
  root.add(warningGroup);
  root.userData.warningGroup = warningGroup;

  root.traverse((child) => {
    if (child.isMesh) {
      child.userData.bagId = bag.id;
    }
  });
  warningGroup.traverse((child) => {
    child.raycast = () => {};
  });

  root.position.set(bag.positionX, 0, bag.positionZ);
  root.rotation.y = -degreesToRadians(bag.rotationDeg);
  return root;
}

function createBagTag(bag) {
  const tag = document.createElement("div");
  tag.className = "bag-tag";
  tag.style.setProperty("--tag-color", colorToCss(bag.color));
  tag.innerHTML = `
    <span class="bag-tag-dot"></span>
    <span class="bag-tag-name">${bag.name}</span>
    <span class="bag-tag-status">Fits</span>
  `;
  annotationLayer.append(tag);
  bagTags.set(bag.id, tag);
}

function createDimensionTags() {
  ["W", "D", "H"].forEach((axis) => {
    const tag = document.createElement("div");
    tag.className = "dimension-tag";
    tag.innerHTML = `<b>${axis}</b><span data-dimension-value>${axis === "H" ? boot.height : axis === "W" ? boot.width : boot.depth} cm</span>`;
    annotationLayer.append(tag);
    dimensionTags.push({ axis, element: tag, valueElement: tag.querySelector("[data-dimension-value]") });
  });
}

function updateDimensionTags() {
  if (dimensionTags.length === 0) {
    return;
  }
  dimensionTags.forEach((tag) => {
    const value = tag.axis === "W" ? boot.width : tag.axis === "D" ? boot.depth : boot.height;
    tag.valueElement.textContent = `${value} cm`;
  });
}

function rebuildAllBagObjects() {
  bagGroups.forEach((group) => {
    scene.remove(group);
    disposeGroup(group);
  });
  bagGroups.clear();
  bagTags.forEach((tag) => tag.remove());
  bagTags.clear();

  bags.forEach((bag) => {
    const group = createBagObject(bag);
    scene.add(group);
    bagGroups.set(bag.id, group);
    createBagTag(bag);
  });
}

function addBagObject(bag) {
  const group = createBagObject(bag);
  scene.add(group);
  bagGroups.set(bag.id, group);
  createBagTag(bag);
}

function removeBagObject(bagId) {
  const group = bagGroups.get(bagId);
  if (group) {
    scene.remove(group);
    disposeGroup(group);
    bagGroups.delete(bagId);
  }
  const tag = bagTags.get(bagId);
  if (tag) {
    tag.remove();
    bagTags.delete(bagId);
  }
}

function getBagBounds(bag) {
  const rotated = bag.rotationDeg % 180 !== 0;
  const footprintWidth = rotated ? bag.depth : bag.width;
  const footprintDepth = rotated ? bag.width : bag.depth;
  return {
    left: bag.positionX - footprintWidth / 2,
    right: bag.positionX + footprintWidth / 2,
    back: bag.positionZ - footprintDepth / 2,
    front: bag.positionZ + footprintDepth / 2,
    top: bag.height,
    footprintWidth,
    footprintDepth,
  };
}

function evaluateLayout(forceUiUpdate = false) {
  bags.forEach((bag) => {
    bag.bounds = getBagBounds(bag);
    bag.issues = [];
    bag.overlaps = [];
    bag.isOutside =
      bag.bounds.left < -boot.width / 2 - 0.25 ||
      bag.bounds.right > boot.width / 2 + 0.25 ||
      bag.bounds.back < -boot.depth / 2 - 0.25 ||
      bag.bounds.front > boot.depth / 2 + 0.25;
    bag.isTooTall = bag.height > boot.height + 0.25;
    if (bag.isOutside) {
      bag.issues.push("outside");
    }
    if (bag.isTooTall) {
      bag.issues.push("tall");
    }
  });

  for (let firstIndex = 0; firstIndex < bags.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < bags.length; secondIndex += 1) {
      const firstBag = bags[firstIndex];
      const secondBag = bags[secondIndex];
      const overlapWidth =
        Math.min(firstBag.bounds.right, secondBag.bounds.right) -
        Math.max(firstBag.bounds.left, secondBag.bounds.left);
      const overlapDepth =
        Math.min(firstBag.bounds.front, secondBag.bounds.front) -
        Math.max(firstBag.bounds.back, secondBag.bounds.back);
      if (overlapWidth > 0.25 && overlapDepth > 0.25) {
        firstBag.overlaps.push(secondBag.name);
        secondBag.overlaps.push(firstBag.name);
        if (!firstBag.issues.includes("overlap")) {
          firstBag.issues.push("overlap");
        }
        if (!secondBag.issues.includes("overlap")) {
          secondBag.issues.push("overlap");
        }
      }
    }
  }

  bags.forEach((bag) => {
    bag.fits = bag.issues.length === 0;
    if (bag.fits) {
      bag.statusLabel = "Fits";
      bag.chipLabel = "Fits";
    } else if (bag.isOutside && bag.isTooTall) {
      bag.statusLabel = "Outside + tall";
      bag.chipLabel = "2 issues";
    } else if (bag.isOutside) {
      bag.statusLabel = "Outside boot";
      bag.chipLabel = "Outside";
    } else if (bag.isTooTall) {
      bag.statusLabel = "Too tall";
      bag.chipLabel = "Too tall";
    } else {
      bag.statusLabel = "Overlap";
      bag.chipLabel = "Overlap";
    }

    const group = bagGroups.get(bag.id);
    if (group) {
      group.userData.warningGroup.visible = !bag.fits;
      group.userData.selectionOutline.visible = bag.id === selectedBagId;
    }

    const tag = bagTags.get(bag.id);
    if (tag) {
      tag.classList.toggle("is-selected", bag.id === selectedBagId);
      tag.classList.toggle("is-issue", !bag.fits);
      tag.querySelector(".bag-tag-status").textContent = bag.fits ? "Fits" : bag.chipLabel;
    }
  });

  updateSelectionUi();
  updateMetrics();

  const signature = bags
    .map((bag) => `${bag.id}:${bag.issues.join(",")}:${bag.statusLabel}`)
    .join("|");

  if (forceUiUpdate || signature !== lastUiSignature) {
    lastUiSignature = signature;
    renderSummary();
    renderBagList();
    updateFitBadge();
  }
}

function updateFitBadge() {
  const fittingCount = bags.filter((bag) => bag.fits).length;
  const issueCount = bags.length - fittingCount;
  fitBadge.classList.toggle("is-clear", issueCount === 0 && bags.length > 0);
  fitBadge.classList.toggle("is-issue", issueCount > 0 || bags.length === 0);
  fitBadgeText.textContent = issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : bags.length === 0 ? "No bags" : "All clear";
  fitBadge.querySelector(".fit-badge-icon").innerHTML =
    issueCount > 0
      ? '<svg viewBox="0 0 20 20" fill="none"><path d="M10 5.2v5.9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14.8" r="1.1" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none"><path d="m5 10.5 3.1 3L15 6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>';
}

function renderSummary() {
  const fittingCount = bags.filter((bag) => bag.fits).length;
  const issueCount = bags.length - fittingCount;
  const allClear = issueCount === 0 && bags.length > 0;
  fitSummary.classList.toggle("is-clear", allClear);
  fitSummary.classList.toggle("is-issue", !allClear);
  fitCountOutput.textContent = `${fittingCount}`;
  bagCountOutput.textContent = `${bags.length}`;
  fitMeterFill.style.width = bags.length === 0 ? "0%" : `${(fittingCount / bags.length) * 100}%`;

  if (bags.length === 0) {
    fitTitle.textContent = "No bags in the boot.";
    fitMessage.textContent = "Add a case to start planning the pack.";
  } else if (allClear) {
    fitTitle.textContent = "The boot will close.";
    fitMessage.textContent = "Every bag clears the walls, floor and ceiling.";
  } else {
    fitTitle.textContent = issueCount === 1 ? "One bag needs a move." : `${issueCount} bags need a move.`;
    const hasOutside = bags.some((bag) => bag.isOutside);
    const hasOverlap = bags.some((bag) => bag.overlaps.length > 0);
    const hasTall = bags.some((bag) => bag.isTooTall);
    if (hasOutside) {
      fitMessage.textContent = "Bring every flagged case back inside the clear zone.";
    } else if (hasOverlap) {
      fitMessage.textContent = "Separate the overlapping cases before closing the hatch.";
    } else if (hasTall) {
      fitMessage.textContent = "A case is taller than the available clear height.";
    } else {
      fitMessage.textContent = "Move the flagged case to clear the fit check.";
    }
  }

  summaryIcon.innerHTML = allClear
    ? '<svg viewBox="0 0 24 24" fill="none"><path d="m6 12.4 3.8 3.7L18.5 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.3" fill="currentColor"/></svg>';
}

function renderBagList() {
  if (bags.length === 0) {
    bagList.innerHTML = `
      <div class="empty-pack-list">
        <span>No bags yet</span>
        <small>Use “Add bag” to build the load.</small>
      </div>
    `;
    return;
  }

  bagList.innerHTML = bags
    .map(
      (bag) => `
        <div class="bag-item${bag.id === selectedBagId ? " is-selected" : ""}${bag.fits ? "" : " is-issue"}" data-id="${bag.id}" role="button" tabindex="0" aria-pressed="${bag.id === selectedBagId}" aria-label="Select ${bag.name}, ${bag.statusLabel}">
          <span class="bag-swatch" style="--bag-color:${colorToCss(bag.color)}" aria-hidden="true"></span>
          <div class="bag-copy">
            <span class="bag-name">${bag.name}</span>
            <span class="bag-type">${bag.type} · ${bag.width} × ${bag.depth} × ${bag.height} cm</span>
          </div>
          <span class="status-chip ${bag.fits ? "fits" : "issue"}">${bag.chipLabel}</span>
          <button class="bag-delete" type="button" aria-label="Remove ${bag.name}" title="Remove ${bag.name}">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.2 5.2h9.6M6.2 5.2V3.5h3.6v1.7M5 6.7l.5 6h5l.5-6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `,
    )
    .join("");

  bagList.querySelectorAll(".bag-item").forEach((item) => {
    const bagId = item.dataset.id;
    item.addEventListener("click", (event) => {
      if (event.target.closest(".bag-delete")) {
        return;
      }
      selectBag(bagId);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectBag(bagId);
      }
    });
    item.querySelector(".bag-delete").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteBag(bagId);
    });
  });
}

function updateMetrics() {
  let clippedFloorArea = 0;
  let totalVolume = 0;
  bags.forEach((bag) => {
    const clippedWidth = Math.max(
      0,
      Math.min(bag.bounds.right, boot.width / 2) - Math.max(bag.bounds.left, -boot.width / 2),
    );
    const clippedDepth = Math.max(
      0,
      Math.min(bag.bounds.front, boot.depth / 2) - Math.max(bag.bounds.back, -boot.depth / 2),
    );
    clippedFloorArea += clippedWidth * clippedDepth;
    totalVolume += bag.width * bag.depth * bag.height;
  });

  const floorPercentage = Math.round((clippedFloorArea / (boot.width * boot.depth)) * 100);
  floorUsedOutput.textContent = `${clamp(floorPercentage, 0, 100)}%`;
  bagVolumeOutput.textContent = `${Math.round(totalVolume / 1000)} L`;
  issueCountOutput.textContent = `${bags.filter((bag) => !bag.fits).length}`;
}

function updateSelectionUi() {
  const selectedBag = bags.find((bag) => bag.id === selectedBagId) || null;
  selectionBar.classList.toggle("is-empty", !selectedBag);
  viewport.classList.toggle("has-selection", Boolean(selectedBag));
  turnLeftButton.disabled = !selectedBag;
  turnRightButton.disabled = !selectedBag;

  if (!selectedBag) {
    selectedSwatch.style.backgroundColor = "#c9c3b6";
    selectedName.textContent = "Select a bag";
    selectedDims.textContent = "—";
    selectedPosition.textContent = "Click a bag or pack-list row";
    return;
  }

  selectedSwatch.style.backgroundColor = colorToCss(selectedBag.color);
  selectedName.textContent = selectedBag.name;
  selectedDims.textContent = `${selectedBag.width} × ${selectedBag.depth} × ${selectedBag.height} cm`;
  selectedPosition.textContent = `X ${signedCentimeters(selectedBag.positionX)} · Z ${signedCentimeters(selectedBag.positionZ)}`;
}

function selectBag(bagId) {
  if (!bags.some((bag) => bag.id === bagId)) {
    return;
  }
  selectedBagId = bagId;
  evaluateLayout(true);
  cancelCameraTween();
}

function updateBagTransform(bag) {
  const group = bagGroups.get(bag.id);
  if (!group) {
    return;
  }
  group.position.x = bag.positionX;
  group.position.z = bag.positionZ;
  group.rotation.y = -degreesToRadians(bag.rotationDeg);
}

function rotateSelected(direction) {
  const selectedBag = bags.find((bag) => bag.id === selectedBagId);
  if (!selectedBag) {
    return;
  }
  selectedBag.rotationDeg = (selectedBag.rotationDeg + direction * 90 + 360) % 360;
  updateBagTransform(selectedBag);
  evaluateLayout(true);
}

function nudgeSelected(deltaX, deltaZ) {
  const selectedBag = bags.find((bag) => bag.id === selectedBagId);
  if (!selectedBag) {
    return;
  }
  selectedBag.positionX = Math.round((selectedBag.positionX + deltaX) * 2) / 2;
  selectedBag.positionZ = Math.round((selectedBag.positionZ + deltaZ) * 2) / 2;
  updateBagTransform(selectedBag);
  evaluateLayout();
}

function findFreePosition(width, depth) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const margin = 1.2;
  const minimumX = -boot.width / 2 + halfWidth + margin;
  const maximumX = boot.width / 2 - halfWidth - margin;
  const minimumZ = -boot.depth / 2 + halfDepth + margin;
  const maximumZ = boot.depth / 2 - halfDepth - margin;

  if (minimumX > maximumX || minimumZ > maximumZ) {
    return null;
  }

  for (let zPosition = minimumZ; zPosition <= maximumZ + 0.01; zPosition += 2.5) {
    for (let xPosition = minimumX; xPosition <= maximumX + 0.01; xPosition += 2.5) {
      const candidate = {
        left: xPosition - halfWidth,
        right: xPosition + halfWidth,
        back: zPosition - halfDepth,
        front: zPosition + halfDepth,
      };
      const hasOverlap = bags.some((bag) => {
        const overlapWidth = Math.min(candidate.right, bag.bounds.right) - Math.max(candidate.left, bag.bounds.left);
        const overlapDepth = Math.min(candidate.front, bag.bounds.front) - Math.max(candidate.back, bag.bounds.back);
        return overlapWidth > -margin && overlapDepth > -margin;
      });
      if (!hasOverlap) {
        return { positionX: xPosition, positionZ: zPosition };
      }
    }
  }
  return null;
}

function addBag() {
  const seed = extraBagSeeds[totalBagsAdded % extraBagSeeds.length];
  totalBagsAdded += 1;
  const id = `added-bag-${Date.now()}-${totalBagsAdded}`;
  const freePosition = findFreePosition(seed.width, seed.depth);
  const bag = {
    ...seed,
    id,
    name: seed.name,
    positionX: freePosition ? freePosition.positionX : boot.width / 2 + seed.width / 2 + 16,
    positionZ: freePosition ? freePosition.positionZ : 0,
    rotationDeg: 0,
  };
  bags.push(bag);
  selectedBagId = id;
  addBagObject(bag);
  evaluateLayout(true);
  showToast(freePosition ? `${bag.name} added — one clear spot found.` : `${bag.name} staged outside the boot.`);
}

function deleteBag(bagId) {
  const bagIndex = bags.findIndex((bag) => bag.id === bagId);
  if (bagIndex === -1) {
    return;
  }
  const removedBag = bags[bagIndex];
  bags.splice(bagIndex, 1);
  removeBagObject(bagId);
  if (selectedBagId === bagId) {
    selectedBagId = bags[0]?.id || null;
  }
  evaluateLayout(true);
  showToast(`${removedBag.name} removed.`);
}

function resetLayout() {
  bags.forEach((bag) => removeBagObject(bag.id));
  bags = cloneBagSeeds(initialBagSeeds);
  selectedBagId = bags[0].id;
  totalBagsAdded = 0;
  rebuildAllBagObjects();
  evaluateLayout(true);
  showToast("Pack list reset to the starting layout.");
}

function setBootSize(width, depth, height) {
  boot.width = width;
  boot.depth = depth;
  boot.height = height;
  bootWidthInput.value = `${width}`;
  bootDepthInput.value = `${depth}`;
  bootHeightInput.value = `${height}`;
  buildBoot();
  updateBootMetrics();
  evaluateLayout(true);
}

function updateBootMetrics() {
  bootSizeReadout.textContent = `${boot.width} × ${boot.depth} × ${boot.height} cm`;
  floorAreaOutput.textContent = `${(boot.width * boot.depth / 10000).toFixed(2)} m²`;
  clearHeightOutput.textContent = `${boot.height} cm`;
  updateDimensionTags();

  presetButtons.forEach((button) => {
    const preset = bootPresets[button.dataset.preset];
    button.classList.toggle(
      "is-active",
      preset.width === boot.width && preset.depth === boot.depth && preset.height === boot.height,
    );
  });
}

function readBootInputs() {
  const width = Number.parseFloat(bootWidthInput.value);
  const depth = Number.parseFloat(bootDepthInput.value);
  const height = Number.parseFloat(bootHeightInput.value);
  const nextWidth = Number.isFinite(width) ? clamp(width, 40, 240) : boot.width;
  const nextDepth = Number.isFinite(depth) ? clamp(depth, 40, 200) : boot.depth;
  const nextHeight = Number.isFinite(height) ? clamp(height, 25, 140) : boot.height;
  setBootSize(nextWidth, nextDepth, nextHeight);
}

function normalizeBootInputs() {
  bootWidthInput.value = `${boot.width}`;
  bootDepthInput.value = `${boot.depth}`;
  bootHeightInput.value = `${boot.height}`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function setCameraView(viewName, immediate = false) {
  const isTopView = viewName === "top";
  const destinationPosition = isTopView
    ? new THREE.Vector3(0.1, Math.max(245, boot.width * 2.05), boot.depth * 0.72)
    : new THREE.Vector3(
        Math.max(126, boot.width * 1.12),
        Math.max(124, boot.height * 2.55),
        Math.max(158, boot.depth * 2.02),
      );
  const destinationTarget = isTopView
    ? new THREE.Vector3(0, 0, 0)
    : new THREE.Vector3(0, boot.height * 0.27, 0);

  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  if (immediate || !controls) {
    camera.position.copy(destinationPosition);
    controls?.target.copy(destinationTarget);
    controls?.update();
    return;
  }

  controls.enabled = false;
  cameraTween = {
    startTime: performance.now(),
    duration: 680,
    fromPosition: camera.position.clone(),
    toPosition: destinationPosition,
    fromTarget: controls.target.clone(),
    toTarget: destinationTarget,
  };
}

function cancelCameraTween() {
  if (!cameraTween) {
    return;
  }
  cameraTween = null;
  if (controls) {
    controls.enabled = true;
  }
}

function updateCameraTween(now) {
  if (!cameraTween) {
    return;
  }
  const progress = clamp((now - cameraTween.startTime) / cameraTween.duration, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  camera.lookAt(controls.target);
  if (progress >= 1) {
    cameraTween = null;
    controls.enabled = true;
    controls.update();
  }
}

function updatePointerCoordinates(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getBagHit(event) {
  if (!renderer) {
    return null;
  }
  updatePointerCoordinates(event);
  raycaster.setFromCamera(pointer, camera);
  const objectsToTest = [...bagGroups.values()];
  const intersections = raycaster.intersectObjects(objectsToTest, true);
  const hit = intersections.find((intersection) => intersection.object.isMesh && intersection.object.userData.bagId);
  return hit ? hit.object.userData.bagId : null;
}

function getFloorIntersection(event) {
  updatePointerCoordinates(event);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(floorPlane, dragPoint);
}

function onPointerDown(event) {
  if (event.button !== 0 && event.pointerType === "mouse") {
    return;
  }
  const hitBagId = getBagHit(event);
  if (!hitBagId) {
    cancelCameraTween();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  cancelCameraTween();
  const hitPoint = getFloorIntersection(event);
  if (!hitPoint) {
    return;
  }
  const bag = bags.find((entry) => entry.id === hitBagId);
  if (!bag) {
    return;
  }

  selectedBagId = bag.id;
  evaluateLayout(true);
  dragState = {
    bagId: bag.id,
    offsetX: bag.positionX - hitPoint.x,
    offsetZ: bag.positionZ - hitPoint.z,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    moved: false,
  };
  controls.enabled = false;
  viewport.classList.add("is-dragging");
  renderer.domElement.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (dragState) {
    event.preventDefault();
    event.stopPropagation();
    const distance = Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY);
    if (distance > 2) {
      dragState.moved = true;
    }
    if (!dragState.moved) {
      return;
    }
    const hitPoint = getFloorIntersection(event);
    if (!hitPoint) {
      return;
    }
    const bag = bags.find((entry) => entry.id === dragState.bagId);
    if (!bag) {
      return;
    }
    bag.positionX = Math.round((hitPoint.x + dragState.offsetX) * 2) / 2;
    bag.positionZ = Math.round((hitPoint.z + dragState.offsetZ) * 2) / 2;
    updateBagTransform(bag);
    evaluateLayout();
    return;
  }

  if (!renderer || !controls.enabled) {
    return;
  }
  const hitBagId = getBagHit(event);
  viewport.classList.toggle("is-hovering-bag", Boolean(hitBagId));
}

function endDrag(event) {
  if (!dragState) {
    return;
  }
  const pointerId = dragState.pointerId;
  dragState = null;
  controls.enabled = true;
  viewport.classList.remove("is-dragging");
  if (renderer.domElement.hasPointerCapture(pointerId)) {
    renderer.domElement.releasePointerCapture(pointerId);
  }
  evaluateLayout(true);
  if (event) {
    event.stopPropagation();
  }
}

function onPointerLeave() {
  if (!dragState) {
    viewport.classList.remove("is-hovering-bag");
  }
}

function onKeyDown(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
    return;
  }
  if (!selectedBagId) {
    return;
  }
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    rotateSelected(event.shiftKey ? -1 : 1);
    return;
  }
  if (event.key === "Escape") {
    selectedBagId = null;
    evaluateLayout(true);
    return;
  }
  const step = event.shiftKey ? 5 : 1;
  const movementByKey = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  if (movementByKey[event.key]) {
    event.preventDefault();
    nudgeSelected(...movementByKey[event.key]);
  }
}

function updateAnnotations() {
  if (!renderer) {
    return;
  }
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  const dimensionPositions = {
    W: new THREE.Vector3(0, 1.6, boot.depth / 2 + 9),
    D: new THREE.Vector3(boot.width / 2 + 9, 1.6, 0),
    H: new THREE.Vector3(boot.width / 2 - 2, boot.height / 2, -boot.depth / 2 - 7),
  };

  dimensionTags.forEach((tag) => {
    const worldPosition = dimensionPositions[tag.axis];
    projectAnnotation(tag.element, worldPosition, width, height);
  });

  bags.forEach((bag) => {
    const tag = bagTags.get(bag.id);
    if (!tag) {
      return;
    }
    const worldPosition = new THREE.Vector3(
      bag.positionX,
      bag.height + (bag.id === selectedBagId ? 11 : 8),
      bag.positionZ,
    );
    projectAnnotation(tag, worldPosition, width, height);
  });
}

function projectAnnotation(element, worldPosition, width, height) {
  projectedPoint.copy(worldPosition).project(camera);
  const isVisible = projectedPoint.z > -1 && projectedPoint.z < 1;
  const screenX = (projectedPoint.x * 0.5 + 0.5) * width;
  const screenY = (-projectedPoint.y * 0.5 + 0.5) * height;
  const withinBounds = screenX > -80 && screenX < width + 80 && screenY > -30 && screenY < height + 45;
  element.classList.toggle("is-visible", isVisible && withinBounds);
  element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`;
}

function animate(now) {
  updateCameraTween(now);
  controls?.update();
  updateAnnotations();
  if (renderer) {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

function wireEvents() {
  const canvas = renderer?.domElement;
  if (canvas) {
    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("pointermove", onPointerMove, true);
    canvas.addEventListener("pointerup", endDrag, true);
    canvas.addEventListener("pointercancel", endDrag, true);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", (event) => {
      const hitBagId = getBagHit(event);
      if (!hitBagId) {
        return;
      }
      event.preventDefault();
      selectedBagId = hitBagId;
      rotateSelected(1);
    });
  }

  [bootWidthInput, bootDepthInput, bootHeightInput].forEach((input) => {
    input.addEventListener("input", readBootInputs);
    input.addEventListener("change", normalizeBootInputs);
    input.addEventListener("blur", normalizeBootInputs);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        normalizeBootInputs();
        input.blur();
      }
    });
  });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = bootPresets[button.dataset.preset];
      setBootSize(preset.width, preset.depth, preset.height);
      showToast(`${button.querySelector("span").textContent} boot selected.`);
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setCameraView(button.dataset.view));
  });

  turnLeftButton.addEventListener("click", () => rotateSelected(-1));
  turnRightButton.addEventListener("click", () => rotateSelected(1));
  addBagButton.addEventListener("click", addBag);
  resetLayoutButton.addEventListener("click", resetLayout);
  window.addEventListener("keydown", onKeyDown);
}

function initialize() {
  createDimensionTags();
  const sceneReady = setupScene();
  buildBoot();
  rebuildAllBagObjects();
  updateBootMetrics();
  evaluateLayout(true);
  setCameraView("perspective", true);
  if (sceneReady) {
    wireEvents();
  } else {
    wireEvents();
    viewport.classList.add("no-webgl");
  }
  requestAnimationFrame(animate);
}

initialize();
