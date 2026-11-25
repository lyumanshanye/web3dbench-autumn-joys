import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const ROOM_WIDTH = 6;
const ROOM_DEPTH = 4;
const HALF_ROOM_WIDTH = ROOM_WIDTH / 2;
const HALF_ROOM_DEPTH = ROOM_DEPTH / 2;
const GRID_STEP = 0.25;
const QUARTER_TURN = Math.PI / 2;
const STORAGE_KEY = "roomcraft-layout-v1";
const COLLISION_GAP = 0.04;

const COLORS = [
  { name: "Walnut", hex: "#7f5137" },
  { name: "Clay", hex: "#b96950" },
  { name: "Sage", hex: "#71816b" },
  { name: "Linen", hex: "#d6c3a7" },
  { name: "Marine", hex: "#35535e" },
  { name: "Graphite", hex: "#383d3a" },
];

const FURNITURE_TYPES = {
  sofa: {
    label: "Sofa",
    width: 2.28,
    depth: 0.94,
    defaultColor: "#b96950",
    preferred: [0.35, -1.4],
    addRotation: 0,
  },
  coffeeTable: {
    label: "Coffee table",
    width: 1.36,
    depth: 0.74,
    defaultColor: "#7f5137",
    preferred: [0.4, -0.15],
    addRotation: 0,
  },
  armchair: {
    label: "Armchair",
    width: 0.96,
    depth: 0.94,
    defaultColor: "#71816b",
    preferred: [2.05, 0.62],
    addRotation: -QUARTER_TURN,
  },
  floorLamp: {
    label: "Floor lamp",
    width: 0.5,
    depth: 0.5,
    defaultColor: "#d6c3a7",
    preferred: [-2.2, -1.3],
    addRotation: 0,
  },
};

const INITIAL_LAYOUT = [
  { type: "sofa", x: 0.55, z: -1.42, rotation: 0, color: "#b96950" },
  { type: "coffeeTable", x: 0.55, z: -0.17, rotation: 0, color: "#7f5137" },
  { type: "armchair", x: 2.1, z: 0.64, rotation: -QUARTER_TURN, color: "#71816b" },
  { type: "floorLamp", x: -2.18, z: -1.3, rotation: 0, color: "#d6c3a7" },
];

const PALETTE_ICONS = {
  sofa: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 15.5v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4" />
      <path d="M5 14.5a2.5 2.5 0 0 1 2.5 2.5v4h17v-4a2.5 2.5 0 0 1 5 0v6H3v-6A2.5 2.5 0 0 1 5 14.5Z" />
      <path d="M8 21v3M24 21v3M11 12.5h10" />
    </svg>`,
  coffeeTable: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 12.5h24v4H4v-4ZM7 16.5v9M25 16.5v9M10 9.5h12v3H10v-3Z" />
      <path d="M12 21.5h8" />
    </svg>`,
  armchair: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 13V8.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V13" />
      <path d="M8.5 12.5A2.5 2.5 0 0 1 11 15v2h10v-2a2.5 2.5 0 0 1 5 0v7.5H6v-7.5a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="M9 22.5v3M23 22.5v3M10.5 19h11" />
    </svg>`,
  floorLamp: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 8.5h8l3 8H9l3-8ZM16 16.5v9M11 27h10" />
      <path d="M13 12h6" />
    </svg>`,
};

const stage = document.querySelector("#stage");
const canvas = document.querySelector("#scene");
const palette = document.querySelector("#palette");
const snapToggle = document.querySelector("#snapToggle");
const pieceCount = document.querySelector("#pieceCount");
const saveState = document.querySelector("#saveState");
const saveButton = document.querySelector("#saveButton");
const restoreButton = document.querySelector("#restoreButton");
const resetButton = document.querySelector("#resetButton");
const perspectiveViewButton = document.querySelector("#perspectiveView");
const topViewButton = document.querySelector("#topView");
const sceneLabel = document.querySelector("#sceneLabel");
const selectionPanel = document.querySelector("#selectionPanel");
const selectedName = document.querySelector("#selectedName");
const rotateButton = document.querySelector("#rotateButton");
const deleteButton = document.querySelector("#deleteButton");
const swatches = document.querySelector("#swatches");
const colorName = document.querySelector("#colorName");
const positionLabel = document.querySelector("#positionLabel");
const rotationLabel = document.querySelector("#rotationLabel");
const hintText = document.querySelector("#hintText");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");

let idCounter = 0;
let toastTimer = 0;
let conflictTimer = 0;
let hasOrbited = false;
let firstResize = true;
let dragState = null;
let blankDown = null;
let pendingPick = null;
let viewTransition = null;
let viewMode = "perspective";
let selectedId = null;
let currentConflictText = "";

const items = [];
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const floorPoint = new THREE.Vector3();
const tempVector = new THREE.Vector3();

function seededRandomFactory(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeCanvasTexture(width, height, draw) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const context = textureCanvas.getContext("2d");
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createFloorTexture() {
  const random = seededRandomFactory(29);
  const texture = makeCanvasTexture(1024, 640, (context, width, height) => {
    context.fillStyle = "#cbb38f";
    context.fillRect(0, 0, width, height);
    const rows = 8;
    const rowHeight = height / rows;

    for (let row = 0; row < rows; row += 1) {
      const y = row * rowHeight;
      const tone = 188 + Math.floor(random() * 24);
      context.fillStyle = `rgb(${tone + 17}, ${tone - 4}, ${tone - 37})`;
      context.fillRect(0, y + 1, width, rowHeight - 2);
      context.strokeStyle = "rgba(84, 56, 34, 0.23)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();

      for (let grain = 0; grain < 6; grain += 1) {
        const grainY = y + 8 + random() * (rowHeight - 16);
        const amplitude = 1.5 + random() * 4;
        context.beginPath();
        context.strokeStyle = `rgba(100, 70, 43, ${0.025 + random() * 0.055})`;
        context.lineWidth = 0.7 + random() * 1.4;
        for (let x = 0; x <= width; x += 12) {
          const offset = Math.sin(x * 0.013 + grain * 1.7) * amplitude;
          if (x === 0) context.moveTo(x, grainY + offset);
          else context.lineTo(x, grainY + offset);
        }
        context.stroke();
      }

      const seamX = 130 + random() * (width - 260);
      context.strokeStyle = "rgba(79, 54, 34, 0.2)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(seamX, y + 1);
      context.lineTo(seamX, y + rowHeight - 1);
      context.stroke();
    }

    const glow = context.createRadialGradient(width * 0.7, height * 0.35, 0, width * 0.7, height * 0.35, width * 0.7);
    glow.addColorStop(0, "rgba(255, 244, 217, 0.25)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

function createTableTexture() {
  const random = seededRandomFactory(64);
  return makeCanvasTexture(512, 256, (context, width, height) => {
    context.fillStyle = "#ded3c0";
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 26; index += 1) {
      const y = random() * height;
      context.beginPath();
      context.strokeStyle = `rgba(93, 62, 37, ${0.025 + random() * 0.07})`;
      context.lineWidth = 0.5 + random() * 1.4;
      for (let x = 0; x <= width; x += 8) {
        const offset = Math.sin(x * 0.025 + index) * (1 + random() * 2);
        if (x === 0) context.moveTo(x, y + offset);
        else context.lineTo(x, y + offset);
      }
      context.stroke();
    }
  });
}

function createRugTexture() {
  return makeCanvasTexture(768, 512, (context, width, height) => {
    context.fillStyle = "#d9d1c1";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(104, 104, 89, 0.32)";
    context.lineWidth = 4;
    context.strokeRect(20, 20, width - 40, height - 40);
    context.strokeStyle = "rgba(174, 116, 76, 0.3)";
    context.lineWidth = 2;
    context.strokeRect(33, 33, width - 66, height - 66);

    context.strokeStyle = "rgba(127, 118, 99, 0.12)";
    context.lineWidth = 1;
    for (let x = 58; x < width - 40; x += 22) {
      context.beginPath();
      context.moveTo(x, 42);
      context.lineTo(x, height - 42);
      context.stroke();
    }
    for (let y = 54; y < height - 36; y += 20) {
      context.beginPath();
      context.moveTo(42, y);
      context.lineTo(width - 42, y);
      context.stroke();
    }

    context.fillStyle = "rgba(108, 121, 103, 0.16)";
    context.beginPath();
    context.arc(width * 0.5, height * 0.49, 96, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(160, 108, 73, 0.23)";
    context.lineWidth = 18;
    context.beginPath();
    context.arc(width * 0.5, height * 0.49, 128, 0, Math.PI * 2);
    context.stroke();
  });
}

function createArtTexture(variant) {
  return makeCanvasTexture(480, 600, (context, width, height) => {
    const palette = variant === 0
      ? ["#ece3d6", "#b66c51", "#586b59", "#d0a04d"]
      : ["#e8e2d6", "#354f59", "#c8b598", "#a8644a"];
    context.fillStyle = palette[0];
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette[1];
    if (variant === 0) {
      context.beginPath();
      context.arc(width * 0.42, height * 0.34, width * 0.26, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette[2];
      context.fillRect(width * 0.16, height * 0.57, width * 0.68, height * 0.24);
      context.fillStyle = palette[3];
      context.beginPath();
      context.arc(width * 0.73, height * 0.62, width * 0.12, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(width * 0.18, height * 0.15, width * 0.26, height * 0.7);
      context.fillStyle = palette[2];
      context.beginPath();
      context.moveTo(width * 0.5, height * 0.2);
      context.lineTo(width * 0.82, height * 0.73);
      context.lineTo(width * 0.39, height * 0.73);
      context.closePath();
      context.fill();
      context.fillStyle = palette[3];
      context.fillRect(width * 0.52, height * 0.57, width * 0.27, height * 0.13);
    }
  });
}

function createFabricBump() {
  const texture = makeCanvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#8a8a8a";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(255,255,255,0.23)";
    context.lineWidth = 1;
    for (let value = 0; value < width; value += 4) {
      context.beginPath();
      context.moveTo(value, 0);
      context.lineTo(value, height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, value);
      context.lineTo(width, value);
      context.stroke();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return texture;
}

const floorTexture = createFloorTexture();
const tableTexture = createTableTexture();
const rugTexture = createRugTexture();
const fabricBump = createFabricBump();
const artTextures = [createArtTexture(0), createArtTexture(1)];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e5dc);
scene.fog = new THREE.Fog(0xe9e5dc, 24, 48);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
camera.position.set(9, 7.5, 10.5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 4.5;
controls.maxDistance = 38;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
controls.zoomToCursor = true;
controls.target.set(0, 0.4, 0);
configureControls("perspective");

const hemisphereLight = new THREE.HemisphereLight(0xeaf4ff, 0xdbcbb2, 1.7);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff2dc, 2.55);
sunLight.position.set(5.2, 9.2, 6.4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -7;
sunLight.shadow.camera.right = 7;
sunLight.shadow.camera.top = 7;
sunLight.shadow.camera.bottom = -7;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 28;
sunLight.shadow.bias = -0.00025;
sunLight.shadow.normalBias = 0.025;
scene.add(sunLight);
scene.add(sunLight.target);

const fillLight = new THREE.DirectionalLight(0xbfd3dd, 0.58);
fillLight.position.set(-5, 4.5, -4);
scene.add(fillLight);

const materialLibrary = {
  wall: new THREE.MeshStandardMaterial({ color: 0xf3eee5, roughness: 0.94 }),
  wallAccent: new THREE.MeshStandardMaterial({ color: 0xe8e1d5, roughness: 0.96 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.76 }),
  floorSide: new THREE.MeshStandardMaterial({ color: 0x8e6d4e, roughness: 0.8 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x583c2b, roughness: 0.63 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb58a4d, roughness: 0.32, metalness: 0.58 }),
  blackMetal: new THREE.MeshStandardMaterial({ color: 0x2e302d, roughness: 0.42, metalness: 0.36 }),
  creamCeramic: new THREE.MeshStandardMaterial({ color: 0xe7dfd0, roughness: 0.38 }),
};
const sharedMaterials = new Set(Object.values(materialLibrary));
const roomShell = new THREE.Group();
scene.add(roomShell);

function disposeFurnitureGroup(group) {
  group.traverse((object) => {
    if (!object.isMesh) return;
    if (object.geometry) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material && !sharedMaterials.has(material)) material.dispose();
    });
  });
}

function addGroundAndRoom() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 48),
    new THREE.MeshStandardMaterial({ color: 0xe9e5dc, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.24;
  ground.receiveShadow = true;
  scene.add(ground);

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH + 0.28, 0.18, ROOM_DEPTH + 0.28),
    new THREE.MeshStandardMaterial({ color: 0xd4c8b5, roughness: 0.88 }),
  );
  plinth.position.y = -0.19;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  scene.add(plinth);

  const floorBase = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH + 0.05, 0.16, ROOM_DEPTH + 0.05),
    materialLibrary.floorSide,
  );
  floorBase.position.y = -0.08;
  floorBase.castShadow = true;
  floorBase.receiveShadow = true;
  scene.add(floorBase);

  const floorTopMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTexture,
    roughness: 0.7,
  });
  const floorTop = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH), floorTopMaterial);
  floorTop.rotation.x = -Math.PI / 2;
  floorTop.position.y = 0.002;
  floorTop.receiveShadow = true;
  scene.add(floorTop);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, 2.72), materialLibrary.wall);
  backWall.position.set(0, 1.36, -HALF_ROOM_DEPTH);
  backWall.receiveShadow = true;
  roomShell.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, 2.72), materialLibrary.wallAccent);
  leftWall.rotation.y = QUARTER_TURN;
  leftWall.position.set(-HALF_ROOM_WIDTH, 1.36, 0);
  leftWall.receiveShadow = true;
  roomShell.add(leftWall);

  const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, 0.11, 0.045), materialLibrary.trim);
  backBaseboard.position.set(0, 0.055, -HALF_ROOM_DEPTH + 0.026);
  backBaseboard.castShadow = true;
  roomShell.add(backBaseboard);

  const leftBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, ROOM_DEPTH), materialLibrary.trim);
  leftBaseboard.position.set(-HALF_ROOM_WIDTH + 0.026, 0.055, 0);
  leftBaseboard.castShadow = true;
  roomShell.add(leftBaseboard);

  const backCrown = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, 0.055, 0.075), materialLibrary.trim);
  backCrown.position.set(0, 2.69, -HALF_ROOM_DEPTH + 0.03);
  roomShell.add(backCrown);

  const leftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, ROOM_DEPTH), materialLibrary.trim);
  leftCrown.position.set(-HALF_ROOM_WIDTH + 0.03, 2.69, 0);
  roomShell.add(leftCrown);

  addWindow(roomShell);
  addWallArt(roomShell);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.72, 2.43),
    new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.62, 0.018, -0.02);
  rug.receiveShadow = true;
  scene.add(rug);

  const rugBorder = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.86, 0, -1.215),
      new THREE.Vector3(1.86, 0, -1.215),
      new THREE.Vector3(1.86, 0, 1.215),
      new THREE.Vector3(-1.86, 0, 1.215),
    ]),
    new THREE.LineBasicMaterial({ color: 0x9e927e, transparent: true, opacity: 0.34 }),
  );
  rugBorder.position.set(0.62, 0.023, -0.02);
  scene.add(rugBorder);
}

function addWindow(parent) {
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9dbe1,
    roughness: 0.13,
    metalness: 0.02,
    transparent: true,
    opacity: 0.88,
    emissive: 0xb9d2da,
    emissiveIntensity: 0.16,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.18), glassMaterial);
  glass.position.set(-1.28, 1.6, -HALF_ROOM_DEPTH + 0.008);
  parent.add(glass);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.62 });
  const vertical = new THREE.BoxGeometry(0.055, 1.3, 0.055);
  const horizontal = new THREE.BoxGeometry(1.84, 0.055, 0.055);
  const framePieces = [
    { geometry: vertical, x: -2.18, y: 1.6 },
    { geometry: vertical, x: -0.38, y: 1.6 },
    { geometry: vertical, x: -1.28, y: 1.6 },
    { geometry: horizontal, x: -1.28, y: 0.94 },
    { geometry: horizontal, x: -1.28, y: 2.26 },
    { geometry: horizontal, x: -1.28, y: 1.6 },
  ];
  framePieces.forEach((piece) => {
    const mesh = new THREE.Mesh(piece.geometry, frameMaterial);
    mesh.position.set(piece.x, piece.y, -HALF_ROOM_DEPTH + 0.035);
    mesh.castShadow = true;
    parent.add(mesh);
  });

  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.055, 0.16), frameMaterial);
  sill.position.set(-1.28, 0.91, -HALF_ROOM_DEPTH + 0.055);
  sill.castShadow = true;
  parent.add(sill);
}

function addWallArt(parent) {
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.29, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x6b4b37, roughness: 0.52 }),
  );
  frame.position.set(1.35, 1.57, -HALF_ROOM_DEPTH + 0.035);
  frame.castShadow = true;
  parent.add(frame);

  const artwork = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 1.15),
    new THREE.MeshStandardMaterial({ map: artTextures[0], roughness: 0.82 }),
  );
  artwork.position.set(1.35, 1.57, -HALF_ROOM_DEPTH + 0.06);
  parent.add(artwork);

  const smallFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.8, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x3c4c47, roughness: 0.58 }),
  );
  smallFrame.position.set(2.18, 1.35, -HALF_ROOM_DEPTH + 0.038);
  smallFrame.castShadow = true;
  parent.add(smallFrame);

  const smallArtwork = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.7),
    new THREE.MeshStandardMaterial({ map: artTextures[1], roughness: 0.82 }),
  );
  smallArtwork.position.set(2.18, 1.35, -HALF_ROOM_DEPTH + 0.062);
  parent.add(smallArtwork);
}

function createGrid() {
  const positions = [];
  for (let x = -HALF_ROOM_WIDTH + GRID_STEP; x < HALF_ROOM_WIDTH; x += GRID_STEP) {
    positions.push(x, 0, -HALF_ROOM_DEPTH, x, 0, HALF_ROOM_DEPTH);
  }
  for (let z = -HALF_ROOM_DEPTH + GRID_STEP; z < HALF_ROOM_DEPTH; z += GRID_STEP) {
    positions.push(-HALF_ROOM_WIDTH, 0, z, HALF_ROOM_WIDTH, 0, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const grid = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x5d6c60,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  grid.position.y = 0.031;
  grid.renderOrder = 1;
  scene.add(grid);
  return grid;
}

function roundedBox(width, height, depth, radius, material, segments = 4) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function standardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...options });
}

function addCylinder(group, radiusTop, radiusBottom, height, material, x, y, z, radialSegments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function buildSofa(color) {
  const group = new THREE.Group();
  const fabric = standardMaterial(color, { roughness: 0.96, bumpMap: fabricBump, bumpScale: 0.008 });
  const fabricShade = standardMaterial(new THREE.Color(color).multiplyScalar(0.84), { roughness: 0.96 });
  const wood = standardMaterial(0x5a3e2b, { roughness: 0.58 });
  const pillowWarm = standardMaterial(0xd0a154, { roughness: 0.95 });
  const pillowDark = standardMaterial(0x3e5557, { roughness: 0.95 });

  const base = roundedBox(2.1, 0.27, 0.79, 0.07, fabric);
  base.position.y = 0.29;
  group.add(base);

  const back = roundedBox(2.06, 0.68, 0.19, 0.07, fabric);
  back.position.set(0, 0.58, -0.33);
  group.add(back);

  const leftArm = roundedBox(0.18, 0.53, 0.86, 0.075, fabric);
  leftArm.position.set(-1.04, 0.48, 0.005);
  group.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 1.04;
  group.add(rightArm);

  for (const x of [-0.5, 0.5]) {
    const cushion = roundedBox(0.96, 0.16, 0.62, 0.075, fabricShade);
    cushion.position.set(x, 0.5, 0.08);
    group.add(cushion);

    const backCushion = roundedBox(0.92, 0.46, 0.16, 0.07, fabric);
    backCushion.position.set(x, 0.66, -0.21);
    backCushion.rotation.x = -0.06;
    group.add(backCushion);
  }

  const warmPillow = roundedBox(0.36, 0.36, 0.13, 0.065, pillowWarm);
  warmPillow.position.set(-0.72, 0.72, -0.03);
  warmPillow.rotation.set(-0.12, 0.18, 0.12);
  group.add(warmPillow);

  const darkPillow = roundedBox(0.32, 0.34, 0.12, 0.06, pillowDark);
  darkPillow.position.set(0.73, 0.72, -0.03);
  darkPillow.rotation.set(-0.1, -0.2, -0.1);
  group.add(darkPillow);

  for (const x of [-0.91, 0.91]) {
    for (const z of [-0.27, 0.27]) {
      addCylinder(group, 0.025, 0.034, 0.15, wood, x, 0.075, z, 12);
    }
  }

  return { group, colorMaterial: fabric, width: FURNITURE_TYPES.sofa.width, depth: FURNITURE_TYPES.sofa.depth };
}

function buildCoffeeTable(color) {
  const group = new THREE.Group();
  const topMaterial = standardMaterial(color, { map: tableTexture, roughness: 0.55 });
  const wood = standardMaterial(0x69472f, { roughness: 0.58 });
  const metal = standardMaterial(0x353734, { roughness: 0.36, metalness: 0.38 });
  const bookRed = standardMaterial(0x9b5d48, { roughness: 0.78 });
  const bookBlue = standardMaterial(0x476a72, { roughness: 0.78 });
  const ceramic = materialLibrary.creamCeramic;

  const top = roundedBox(1.3, 0.085, 0.68, 0.035, topMaterial, 3);
  top.position.y = 0.42;
  group.add(top);

  const shelf = roundedBox(1.1, 0.045, 0.5, 0.025, wood, 3);
  shelf.position.y = 0.16;
  group.add(shelf);

  for (const x of [-0.54, 0.54]) {
    for (const z of [-0.23, 0.23]) {
      addCylinder(group, 0.022, 0.03, 0.4, metal, x, 0.2, z, 12);
    }
  }

  const bookOne = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.23), bookRed);
  bookOne.position.set(-0.29, 0.48, 0.05);
  bookOne.rotation.y = -0.13;
  bookOne.castShadow = true;
  group.add(bookOne);

  const bookTwo = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.028, 0.2), bookBlue);
  bookTwo.position.set(-0.28, 0.512, 0.04);
  bookTwo.rotation.y = 0.08;
  bookTwo.castShadow = true;
  group.add(bookTwo);

  const vase = addCylinder(group, 0.05, 0.075, 0.18, ceramic, 0.34, 0.56, -0.03, 22);
  vase.castShadow = true;
  addCylinder(group, 0.012, 0.012, 0.24, wood, 0.34, 0.77, -0.03, 8);

  return {
    group,
    colorMaterial: topMaterial,
    width: FURNITURE_TYPES.coffeeTable.width,
    depth: FURNITURE_TYPES.coffeeTable.depth,
  };
}

function buildArmchair(color) {
  const group = new THREE.Group();
  const fabric = standardMaterial(color, { roughness: 0.98, bumpMap: fabricBump, bumpScale: 0.009 });
  const fabricShade = standardMaterial(new THREE.Color(color).multiplyScalar(0.86), { roughness: 0.98 });
  const wood = standardMaterial(0x60422f, { roughness: 0.58 });

  const base = roundedBox(0.88, 0.27, 0.76, 0.075, fabric);
  base.position.y = 0.31;
  group.add(base);

  const back = roundedBox(0.82, 0.7, 0.2, 0.08, fabric);
  back.position.set(0, 0.61, -0.31);
  back.rotation.x = -0.05;
  group.add(back);

  const leftArm = roundedBox(0.13, 0.46, 0.76, 0.06, fabric);
  leftArm.position.set(-0.42, 0.55, 0.015);
  group.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.42;
  group.add(rightArm);

  const seat = roundedBox(0.7, 0.15, 0.58, 0.07, fabricShade);
  seat.position.set(0, 0.51, 0.09);
  group.add(seat);

  const backCushion = roundedBox(0.68, 0.43, 0.15, 0.065, fabric);
  backCushion.position.set(0, 0.68, -0.18);
  backCushion.rotation.x = -0.08;
  group.add(backCushion);

  for (const x of [-0.31, 0.31]) {
    for (const z of [-0.25, 0.25]) {
      addCylinder(group, 0.027, 0.04, 0.2, wood, x, 0.1, z, 12);
    }
  }

  return { group, colorMaterial: fabric, width: FURNITURE_TYPES.armchair.width, depth: FURNITURE_TYPES.armchair.depth };
}

function buildFloorLamp(color) {
  const group = new THREE.Group();
  const shadeMaterial = standardMaterial(color, {
    roughness: 0.9,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const brass = materialLibrary.brass;
  const dark = materialLibrary.blackMetal;

  addCylinder(group, 0.18, 0.2, 0.035, dark, 0, 0.028, 0, 32);
  addCylinder(group, 0.022, 0.026, 1.48, brass, 0, 0.79, 0, 16);
  addCylinder(group, 0.042, 0.032, 0.06, brass, 0, 1.53, 0, 16);

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.245, 0.32, 32, 1, true), shadeMaterial);
  shade.position.y = 1.66;
  shade.castShadow = true;
  shade.receiveShadow = true;
  group.add(shade);

  const shadeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.018, 32), brass);
  shadeTop.position.y = 1.825;
  shadeTop.castShadow = true;
  group.add(shadeTop);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe5b1 }),
  );
  bulb.position.y = 1.55;
  group.add(bulb);

  const light = new THREE.PointLight(0xffd6a0, 0.52, 3.2, 2);
  light.position.y = 1.55;
  group.add(light);

  return {
    group,
    colorMaterial: shadeMaterial,
    width: FURNITURE_TYPES.floorLamp.width,
    depth: FURNITURE_TYPES.floorLamp.depth,
  };
}

const BUILDERS = {
  sofa: buildSofa,
  coffeeTable: buildCoffeeTable,
  armchair: buildArmchair,
  floorLamp: buildFloorLamp,
};

function createFootprintMarker(fillColor, lineColor) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.ignorePick = true;

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: fillColor,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.041;
  fill.renderOrder = 3;
  group.add(fill);

  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]),
    new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  border.position.y = 0.048;
  border.renderOrder = 4;
  group.add(border);

  scene.add(group);
  return { group, fill, border };
}

const selectionMarker = createFootprintMarker(0xe0a33a, 0xe5a32f);
const conflictMarker = createFootprintMarker(0xb84f3d, 0xc24c38);
conflictMarker.fill.material.opacity = 0.24;
const selectionBounds = new THREE.Box3();
const selectionOutline = new THREE.Box3Helper(selectionBounds, 0xe0a33a);
selectionOutline.visible = false;
selectionOutline.userData.ignorePick = true;
selectionOutline.material.transparent = true;
selectionOutline.material.opacity = 0.62;
selectionOutline.material.depthWrite = false;
scene.add(selectionOutline);

addGroundAndRoom();
const snapGrid = createGrid();

function normalizeRotation(rotation) {
  return ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function footprintFor(type, rotation) {
  const config = FURNITURE_TYPES[type];
  const quarterIndex = Math.round(normalizeRotation(rotation) / QUARTER_TURN) % 4;
  const swapped = quarterIndex % 2 === 1;
  return {
    width: swapped ? config.depth : config.width,
    depth: swapped ? config.width : config.depth,
  };
}

function validatePlacement(type, x, z, rotation, ignoreId = null) {
  const footprint = footprintFor(type, rotation);
  const epsilon = 0.01;
  if (
    x - footprint.width / 2 < -HALF_ROOM_WIDTH + epsilon ||
    x + footprint.width / 2 > HALF_ROOM_WIDTH - epsilon ||
    z - footprint.depth / 2 < -HALF_ROOM_DEPTH + epsilon ||
    z + footprint.depth / 2 > HALF_ROOM_DEPTH - epsilon
  ) {
    return {
      valid: false,
      reason: "Keep the whole footprint inside the room.",
      footprint,
    };
  }

  for (const other of items) {
    if (other.id === ignoreId) continue;
    const otherFootprint = footprintFor(other.type, other.rotation);
    const overlapsX = Math.abs(x - other.x) < (footprint.width + otherFootprint.width) / 2 + COLLISION_GAP;
    const overlapsZ = Math.abs(z - other.z) < (footprint.depth + otherFootprint.depth) / 2 + COLLISION_GAP;
    if (overlapsX && overlapsZ) {
      return {
        valid: false,
        reason: `That spot overlaps the ${FURNITURE_TYPES[other.type].label.toLowerCase()}.`,
        footprint,
        conflictId: other.id,
      };
    }
  }

  return { valid: true, footprint };
}

function createFurniture(type, options) {
  const config = FURNITURE_TYPES[type];
  if (!config) return null;
  const built = BUILDERS[type](options.color);
  const id = `piece-${++idCounter}`;
  const item = {
    id,
    type,
    x: options.x,
    z: options.z,
    rotation: normalizeRotation(options.rotation ?? 0),
    color: options.color || config.defaultColor,
    group: built.group,
    colorMaterial: built.colorMaterial,
    width: built.width,
    depth: built.depth,
  };

  built.group.userData.furnitureId = id;
  built.group.position.set(item.x, 0, item.z);
  built.group.rotation.y = item.rotation;
  scene.add(built.group);
  items.push(item);
  return item;
}

function setItemColor(item, hex) {
  item.color = hex;
  item.colorMaterial.color.set(hex);
  if (item.type === "floorLamp") {
    item.colorMaterial.emissive.set(hex).multiplyScalar(0.09);
  }
  updateSelectionPanel();
}

function getSelectedItem() {
  return items.find((item) => item.id === selectedId) || null;
}

function updateSelectionMarker() {
  const item = getSelectedItem();
  if (!item) {
    selectionMarker.group.visible = false;
    selectionOutline.visible = false;
    return;
  }
  const footprint = footprintFor(item.type, item.rotation);
  selectionMarker.group.visible = true;
  selectionMarker.group.position.set(item.x, 0, item.z);
  selectionMarker.group.rotation.y = item.rotation;
  selectionMarker.group.scale.set(footprint.width + 0.055, 1, footprint.depth + 0.055);
  item.group.updateWorldMatrix(true, true);
  selectionBounds.setFromObject(item.group);
  selectionOutline.visible = true;
  selectionOutline.updateMatrixWorld(true);
}

function updateSelectionPanel() {
  const item = getSelectedItem();
  if (!item) {
    selectionPanel.hidden = true;
    hintText.textContent = "Drag to orbit · scroll to zoom";
    updateSelectionMarker();
    return;
  }

  selectionPanel.hidden = false;
  selectedName.textContent = FURNITURE_TYPES[item.type].label;
  positionLabel.textContent = `X ${formatNumber(item.x)} · Z ${formatNumber(item.z)}`;
  rotationLabel.textContent = `${Math.round(normalizeRotation(item.rotation) / QUARTER_TURN) * 90}°`;

  const color = COLORS.find((entry) => entry.hex.toLowerCase() === item.color.toLowerCase());
  colorName.textContent = color ? color.name : "Custom";
  [...swatches.children].forEach((swatch) => {
    const active = swatch.dataset.color.toLowerCase() === item.color.toLowerCase();
    swatch.classList.toggle("is-active", active);
    swatch.setAttribute("aria-pressed", String(active));
  });
  updateSelectionMarker();
}

function formatNumber(value) {
  const normalized = Math.abs(value) < 0.001 ? 0 : value;
  return `${normalized < 0 ? "−" : ""}${Math.abs(normalized).toFixed(2)}`;
}

function selectItem(item, announce = false) {
  selectedId = item.id;
  updateSelectionPanel();
  hintText.textContent = "Drag furniture to move · R to rotate · Del to remove";
  if (announce) showToast(`${FURNITURE_TYPES[item.type].label} selected.`);
}

function deselectItem() {
  selectedId = null;
  updateSelectionPanel();
}

function updateCounts() {
  pieceCount.textContent = `${items.length} ${items.length === 1 ? "piece" : "pieces"}`;
}

function markDirty(text = "Unsaved changes") {
  saveState.textContent = text;
  saveState.classList.add("is-dirty");
}

function markSaved(text) {
  saveState.textContent = text;
  saveState.classList.remove("is-dirty");
}

function showToast(message, isError = false, duration = 2200) {
  window.clearTimeout(toastTimer);
  toastText.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  if (duration > 0) {
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), duration);
  }
}

function hideToast() {
  window.clearTimeout(toastTimer);
  toast.classList.remove("is-visible");
}

function setConflictFeedback(reason, candidate) {
  stage.classList.add("is-conflict");
  conflictMarker.group.visible = true;
  conflictMarker.group.position.set(candidate.x, 0, candidate.z);
  conflictMarker.group.rotation.y = candidate.rotation;
  conflictMarker.group.scale.set(candidate.footprint.width + 0.06, 1, candidate.footprint.depth + 0.06);
  if (reason !== currentConflictText) {
    currentConflictText = reason;
    showToast(reason, true, 0);
  }
}

function clearConflictFeedback(delay = 0) {
  window.clearTimeout(conflictTimer);
  const clear = () => {
    stage.classList.remove("is-conflict");
    conflictMarker.group.visible = false;
    currentConflictText = "";
    hideToast();
  };
  if (delay > 0) conflictTimer = window.setTimeout(clear, delay);
  else clear();
}

function scheduleConflictClear(delay = 1400) {
  window.clearTimeout(conflictTimer);
  conflictTimer = window.setTimeout(() => {
    stage.classList.remove("is-conflict");
    conflictMarker.group.visible = false;
    currentConflictText = "";
    if (toast.classList.contains("is-error")) hideToast();
  }, delay);
}

function rotateSelected() {
  const item = getSelectedItem();
  if (!item) return;
  const candidateRotation = normalizeRotation(item.rotation + QUARTER_TURN);
  const result = validatePlacement(item.type, item.x, item.z, candidateRotation, item.id);
  if (!result.valid) {
    setConflictFeedback(result.reason, {
      x: item.x,
      z: item.z,
      rotation: candidateRotation,
      footprint: result.footprint,
    });
    selectionPanel.classList.remove("is-invalid");
    void selectionPanel.offsetWidth;
    selectionPanel.classList.add("is-invalid");
    scheduleConflictClear(1800);
    return;
  }

  item.rotation = candidateRotation;
  item.group.rotation.y = candidateRotation;
  clearConflictFeedback();
  updateSelectionPanel();
  markDirty();
  showToast(`${FURNITURE_TYPES[item.type].label} rotated 90°.`, false, 1300);
}

function deleteSelected() {
  const item = getSelectedItem();
  if (!item) return;
  const label = FURNITURE_TYPES[item.type].label;
  scene.remove(item.group);
  disposeFurnitureGroup(item.group);
  const index = items.indexOf(item);
  if (index >= 0) items.splice(index, 1);
  selectedId = null;
  clearConflictFeedback();
  updateSelectionPanel();
  updateCounts();
  markDirty();
  showToast(`${label} removed.`);
}

function findOpenPlacement(type) {
  const config = FURNITURE_TYPES[type];
  const rotation = config.addRotation;
  const candidates = [];
  const step = GRID_STEP;
  const [preferredX, preferredZ] = config.preferred;

  for (let z = -HALF_ROOM_DEPTH + step; z <= HALF_ROOM_DEPTH - step; z += step) {
    for (let x = -HALF_ROOM_WIDTH + step; x <= HALF_ROOM_WIDTH - step; x += step) {
      candidates.push({ x, z });
    }
  }
  candidates.sort((a, b) => {
    const distanceA = (a.x - preferredX) ** 2 + (a.z - preferredZ) ** 2;
    const distanceB = (b.x - preferredX) ** 2 + (b.z - preferredZ) ** 2;
    return distanceA - distanceB;
  });

  const preferredResult = validatePlacement(type, preferredX, preferredZ, rotation);
  if (preferredResult.valid) return { x: preferredX, z: preferredZ, rotation };

  for (const candidate of candidates) {
    if (validatePlacement(type, candidate.x, candidate.z, rotation).valid) {
      return { ...candidate, rotation };
    }
  }
  return null;
}

function addFurniture(type) {
  const config = FURNITURE_TYPES[type];
  if (!config) return;
  const placement = findOpenPlacement(type);
  if (!placement) {
    showToast(`No open space left for another ${config.label.toLowerCase()}.`, true, 2600);
    return;
  }
  const item = createFurniture(type, {
    ...placement,
    color: config.defaultColor,
  });
  selectItem(item);
  updateCounts();
  markDirty();
  showToast(`${config.label} added. Drag to arrange it.`, false, 1800);
}

function clearItems() {
  for (const item of items) {
    scene.remove(item.group);
    disposeFurnitureGroup(item.group);
  }
  items.length = 0;
  selectedId = null;
  updateSelectionPanel();
  updateCounts();
}

function createInitialLayout() {
  for (const entry of INITIAL_LAYOUT) {
    createFurniture(entry.type, entry);
  }
  selectedId = null;
  updateSelectionPanel();
  updateCounts();
}

function resetLayout() {
  clearConflictFeedback();
  clearItems();
  createInitialLayout();
  snapToggle.checked = true;
  snapGrid.visible = true;
  markSaved("Initial layout");
  showToast("Initial living room restored. Saved snapshots are unchanged.", false, 2800);
}

function serializeLayout() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    snap: snapToggle.checked,
    items: items.map((item) => ({
      type: item.type,
      x: Number(item.x.toFixed(3)),
      z: Number(item.z.toFixed(3)),
      rotation: Number(item.rotation.toFixed(4)),
      color: item.color,
    })),
  };
}

function saveLayout() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeLayout()));
    const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
    markSaved(`Saved ${time}`);
    showToast("Layout saved in this browser.");
  } catch (error) {
    console.error(error);
    showToast("This browser could not save the layout.", true, 2800);
  }
}

function restoreLayout() {
  let stored;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      showToast("No saved layout found yet. Use Save first.", true, 2600);
      return;
    }
    stored = JSON.parse(raw);
  } catch (error) {
    console.error(error);
    showToast("The saved layout could not be read.", true, 2600);
    return;
  }

  if (!stored || !Array.isArray(stored.items)) {
    showToast("The saved layout is not valid.", true, 2600);
    return;
  }

  clearConflictFeedback();
  clearItems();

  let restoredCount = 0;
  for (const entry of stored.items) {
    if (!FURNITURE_TYPES[entry.type]) continue;
    const x = Number(entry.x);
    const z = Number(entry.z);
    const rotation = normalizeRotation(Number(entry.rotation) || 0);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    if (!validatePlacement(entry.type, x, z, rotation).valid) continue;
    createFurniture(entry.type, {
      x,
      z,
      rotation,
      color: /^#[0-9a-f]{6}$/i.test(entry.color) ? entry.color : FURNITURE_TYPES[entry.type].defaultColor,
    });
    restoredCount += 1;
  }

  snapToggle.checked = Boolean(stored.snap);
  snapGrid.visible = snapToggle.checked;
  updateCounts();
  markSaved("Saved layout restored");
  showToast(restoredCount ? `Saved layout restored with ${restoredCount} ${restoredCount === 1 ? "piece" : "pieces"}.` : "Saved layout restored.", false, 2500);
}

function configureControls(mode) {
  if (mode === "top") {
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  } else {
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  }
}

function perspectivePose() {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const distance = THREE.MathUtils.clamp(3.95 / Math.sin(limitingFov / 2), 9.8, 27);
  const target = new THREE.Vector3(0, 0.42, 0);
  const direction = new THREE.Vector3(1, 0.78, 1.12).normalize();
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    up: new THREE.Vector3(0, 1, 0),
  };
}

function topPose() {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const verticalDistance = 2.42 / Math.tan(verticalFov / 2);
  const horizontalDistance = 3.38 / (Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.2));
  const distance = Math.max(verticalDistance, horizontalDistance) + 0.65;
  return {
    position: new THREE.Vector3(0, distance, 0.0001),
    target: new THREE.Vector3(0, 0, -0.02),
    up: new THREE.Vector3(0, 1, 0),
  };
}

function applyPose(pose) {
  camera.up.copy(pose.up);
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  controls.update();
}

function animateToPose(pose, duration = 620) {
  viewTransition = {
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosition: pose.position.clone(),
    toTarget: pose.target.clone(),
    up: pose.up.clone(),
    start: performance.now(),
    duration,
  };
  camera.up.copy(pose.up);
  controls.enabled = false;
}

function updateViewTransition(time) {
  if (!viewTransition) return;
  const elapsed = (time - viewTransition.start) / viewTransition.duration;
  const t = Math.min(1, Math.max(0, elapsed));
  const eased = 1 - (1 - t) ** 3;
  camera.position.lerpVectors(viewTransition.fromPosition, viewTransition.toPosition, eased);
  controls.target.lerpVectors(viewTransition.fromTarget, viewTransition.toTarget, eased);
  camera.lookAt(controls.target);
  if (t >= 1) {
    const completedMode = viewMode;
    viewTransition = null;
    controls.enabled = !dragState;
    configureControls(completedMode);
  }
}

function setViewMode(mode) {
  if (mode === viewMode || viewTransition) return;
  viewMode = mode;
  const isTop = mode === "top";
  perspectiveViewButton.classList.toggle("is-active", !isTop);
  topViewButton.classList.toggle("is-active", isTop);
  perspectiveViewButton.setAttribute("aria-pressed", String(!isTop));
  topViewButton.setAttribute("aria-pressed", String(isTop));
  sceneLabel.textContent = isTop ? "Floor plan view" : "Perspective view";
  hintText.textContent = isTop ? "Drag to pan · scroll to zoom" : "Drag to orbit · scroll to zoom";
  roomShell.visible = !isTop;
  hasOrbited = false;
  animateToPose(isTop ? topPose() : perspectivePose());
}

function updatePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function isIgnoredObject(object) {
  let current = object;
  while (current) {
    if (current.userData.ignorePick) return true;
    current = current.parent;
  }
  return false;
}

function findFurnitureRoot(object) {
  let current = object;
  while (current) {
    if (current.userData.furnitureId) {
      return items.find((item) => item.id === current.userData.furnitureId) || null;
    }
    current = current.parent;
  }
  return null;
}

function pickAt(clientX, clientY) {
  updatePointer(clientX, clientY);
  const intersections = raycaster.intersectObjects(scene.children, true);
  for (const intersection of intersections) {
    if (isIgnoredObject(intersection.object)) continue;
    const item = findFurnitureRoot(intersection.object);
    if (item) return { item, point: intersection.point.clone() };
  }
  return null;
}

function pointOnFloor(clientX, clientY) {
  updatePointer(clientX, clientY);
  const hit = raycaster.ray.intersectPlane(floorPlane, floorPoint);
  return hit ? floorPoint.clone() : null;
}

function handlePointerDownCapture(event) {
  pendingPick = null;
  if (event.button !== 0 && event.pointerType === "mouse") return;
  if (!event.isPrimary || dragState || viewTransition) return;
  const picked = pickAt(event.clientX, event.clientY);
  if (picked) {
    pendingPick = picked;
    controls.enabled = false;
  }
}

function handlePointerDown(event) {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  if (!event.isPrimary || dragState || viewTransition) return;

  const picked = pendingPick || pickAt(event.clientX, event.clientY);
  pendingPick = null;

  if (picked) {
    event.preventDefault();
    controls.enabled = false;
    canvas.style.cursor = "grabbing";
    selectItem(picked.item);
    clearConflictFeedback();
    const hitPoint = pointOnFloor(event.clientX, event.clientY) || new THREE.Vector3(picked.item.x, 0, picked.item.z);
    dragState = {
      pointerId: event.pointerId,
      item: picked.item,
      offsetX: hitPoint.x - picked.item.x,
      offsetZ: hitPoint.z - picked.item.z,
      startX: picked.item.x,
      startZ: picked.item.z,
      lastValidX: picked.item.x,
      lastValidZ: picked.item.z,
      candidateInvalid: false,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
    return;
  }

  blankDown = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    moved: false,
  };
}

function handlePointerMove(event) {
  if (dragState && event.pointerId === dragState.pointerId) {
    event.preventDefault();
    const item = dragState.item;
    const hit = pointOnFloor(event.clientX, event.clientY);
    if (!hit) return;
    let nextX = hit.x - dragState.offsetX;
    let nextZ = hit.z - dragState.offsetZ;
    if (snapToggle.checked) {
      nextX = Math.round(nextX / GRID_STEP) * GRID_STEP;
      nextZ = Math.round(nextZ / GRID_STEP) * GRID_STEP;
    }
    nextX = Math.max(-HALF_ROOM_WIDTH, Math.min(HALF_ROOM_WIDTH, nextX));
    nextZ = Math.max(-HALF_ROOM_DEPTH, Math.min(HALF_ROOM_DEPTH, nextZ));

    const result = validatePlacement(item.type, nextX, nextZ, item.rotation, item.id);
    if (result.valid) {
      const changed = Math.abs(nextX - item.x) > 0.0001 || Math.abs(nextZ - item.z) > 0.0001;
      item.x = nextX;
      item.z = nextZ;
      item.group.position.set(nextX, 0, nextZ);
      dragState.lastValidX = nextX;
      dragState.lastValidZ = nextZ;
      dragState.candidateInvalid = false;
      if (changed) {
        dragState.moved = true;
        markDirty();
        updateSelectionPanel();
      }
      if (currentConflictText) clearConflictFeedback();
    } else {
      dragState.candidateInvalid = true;
      setConflictFeedback(result.reason, {
        x: nextX,
        z: nextZ,
        rotation: item.rotation,
        footprint: result.footprint,
      });
    }
    return;
  }

  if (blankDown && event.pointerId === blankDown.pointerId) {
    if (Math.hypot(event.clientX - blankDown.x, event.clientY - blankDown.y) > 5) {
      blankDown.moved = true;
    }
  }

  if (event.pointerType === "mouse" && !viewTransition) {
    const hovered = pickAt(event.clientX, event.clientY);
    canvas.style.cursor = hovered ? "grab" : "default";
  }
}

function finishDrag(event, cancelled = false) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const item = dragState.item;
  const hadConflict = dragState.candidateInvalid;
  const moved = dragState.moved;

  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  canvas.style.cursor = "grab";
  dragState = null;
  controls.enabled = !viewTransition;
  configureControls(viewMode);

  if (hadConflict && !cancelled) {
    showToast("Placement conflict — the last valid position was kept.", true, 1800);
    scheduleConflictClear(1500);
  } else {
    clearConflictFeedback();
  }

  if (moved && !hadConflict) {
    markDirty();
    updateSelectionPanel();
    showToast(`${FURNITURE_TYPES[item.type].label} moved.`, false, 1100);
  } else if (moved && hadConflict) {
    markDirty();
    updateSelectionPanel();
  }
}

function handlePointerUp(event) {
  if (dragState) {
    finishDrag(event, false);
    return;
  }
  if (blankDown && event.pointerId === blankDown.pointerId) {
    const wasClick = !blankDown.moved;
    blankDown = null;
    if (wasClick) deselectItem();
  }
}

function handlePointerCancel(event) {
  if (dragState) finishDrag(event, true);
  blankDown = null;
  controls.enabled = !viewTransition;
}

function handleResize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  if (firstResize) {
    firstResize = false;
    applyPose(viewMode === "top" ? topPose() : perspectivePose());
  } else if (viewMode === "top" && !viewTransition && !dragState && !hasOrbited) {
    applyPose(topPose());
  } else if (!hasOrbited && !viewTransition && !dragState) {
    applyPose(perspectivePose());
  }
}

function animate(time) {
  requestAnimationFrame(animate);
  updateViewTransition(time);
  if (!viewTransition) controls.update();

  const selected = getSelectedItem();
  if (selected) {
    const pulse = 0.82 + Math.sin(time * 0.0045) * 0.1;
    selectionMarker.border.material.opacity = pulse;
    selectionMarker.fill.material.opacity = 0.1 + Math.sin(time * 0.0045) * 0.025;
    selectionOutline.material.opacity = 0.48 + Math.sin(time * 0.0045) * 0.13;
  }

  renderer.render(scene, camera);
}

function buildPalette() {
  for (const [type, config] of Object.entries(FURNITURE_TYPES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "furniture-card";
    button.dataset.type = type;
    button.innerHTML = `
      <span class="card-icon">${PALETTE_ICONS[type]}</span>
      <span class="card-copy"><strong>${config.label}</strong><small>${config.width.toFixed(2)} × ${config.depth.toFixed(2)} m</small></span>
      <span class="add-badge" aria-hidden="true">+</span>
    `;
    button.setAttribute("aria-label", `Add ${config.label.toLowerCase()}`);
    button.addEventListener("click", () => addFurniture(type));
    palette.appendChild(button);
  }
}

function buildSwatches() {
  for (const color of COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.color = color.hex;
    button.style.setProperty("--swatch-color", color.hex);
    button.title = color.name;
    button.setAttribute("aria-label", `${color.name} finish`);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const item = getSelectedItem();
      if (!item) return;
      setItemColor(item, color.hex);
      markDirty();
      showToast(`${FURNITURE_TYPES[item.type].label} finished in ${color.name.toLowerCase()}.`, false, 1300);
    });
    swatches.appendChild(button);
  }
}

function bindEvents() {
  canvas.addEventListener("pointerdown", handlePointerDownCapture, true);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerCancel);
  canvas.addEventListener("pointerleave", () => {
    if (!dragState) canvas.style.cursor = "default";
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  snapToggle.addEventListener("change", () => {
    snapGrid.visible = snapToggle.checked;
    markDirty();
    showToast(snapToggle.checked ? "Grid snapping enabled." : "Grid snapping disabled.", false, 1200);
  });

  saveButton.addEventListener("click", saveLayout);
  restoreButton.addEventListener("click", restoreLayout);
  resetButton.addEventListener("click", resetLayout);
  rotateButton.addEventListener("click", rotateSelected);
  deleteButton.addEventListener("click", deleteSelected);
  perspectiveViewButton.addEventListener("click", () => setViewMode("perspective"));
  topViewButton.addEventListener("click", () => setViewMode("top"));

  controls.addEventListener("start", () => {
    if (!viewTransition) hasOrbited = true;
  });

  document.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    const editing = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveLayout();
      return;
    }
    if (editing) return;
    if (event.key.toLowerCase() === "g") {
      snapToggle.checked = !snapToggle.checked;
      snapGrid.visible = snapToggle.checked;
      markDirty();
      showToast(snapToggle.checked ? "Grid snapping enabled." : "Grid snapping disabled.", false, 1200);
    } else if (event.key.toLowerCase() === "r" && getSelectedItem()) {
      rotateSelected();
    } else if ((event.key === "Delete" || event.key === "Backspace") && getSelectedItem()) {
      event.preventDefault();
      deleteSelected();
    } else if (event.key === "Escape") {
      deselectItem();
    }
  });

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(stage);
  window.addEventListener("resize", handleResize);
}

buildPalette();
buildSwatches();
bindEvents();
createInitialLayout();
markSaved("Initial layout");
handleResize();
requestAnimationFrame(animate);
