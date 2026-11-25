import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROW_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SEAT_X = [-5.55, -4.7, -3.85, -2.55, -1.7, -0.85, 0.85, 1.7, 2.55, 3.85, 4.7, 5.55];
const RESERVED_IDS = new Set(['B6', 'B7', 'C3', 'D8', 'D9', 'E2', 'F6', 'G11', 'H4', 'H5']);
const LIMITED_IDS = new Set(['F3', 'F10', 'G3', 'G10']);
const STAGE_TARGET = new THREE.Vector3(0, 2.15, -9.35);

const rowZ = (rowIndex) => -1.2 + rowIndex * 1.3;
const rowBase = (rowIndex) => 0.18 + rowIndex * 0.34;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const seats = [];
const seatById = new Map();
const selectedSeats = [];

let activeSeat = null;
let hoveredSeat = null;
let cameraMode = 'overview';
let cameraTween = null;
let toastTimer = null;
let lastFocusedElement = null;
let compare = { a: null, b: null, armed: false, active: false };
let compareCameraA = null;
let compareCameraB = null;
let sceneReady = false;

for (let rowIndex = 0; rowIndex < ROW_NAMES.length; rowIndex += 1) {
  for (let seatIndex = 0; seatIndex < SEAT_X.length; seatIndex += 1) {
    const row = ROW_NAMES[rowIndex];
    const number = seatIndex + 1;
    const id = `${row}${number}`;
    const limited = LIMITED_IDS.has(id);
    const seat = {
      id,
      row,
      rowIndex,
      number,
      x: SEAT_X[seatIndex],
      z: rowZ(rowIndex),
      baseY: rowBase(rowIndex),
      price: limited ? 30 : rowIndex < 4 ? 45 : 38,
      reserved: RESERVED_IDS.has(id),
      limited,
      group: null,
      material: null,
      marker: null,
      markerMaterial: null,
      reservedMark: null,
      raycastMeshes: [],
    };
    seats.push(seat);
    seatById.set(id, seat);
  }
}

const canvas = document.querySelector('#scene');
const viewport = document.querySelector('#viewport');
const sceneLoader = document.querySelector('#sceneLoader');
const sceneTitle = document.querySelector('#sceneTitle');
const previewTop = document.querySelector('#previewTop');
const previewSeatName = document.querySelector('#previewSeatName');
const compareBanner = document.querySelector('#compareBanner');
const compareBannerText = document.querySelector('#compareBannerText');
const compareLabels = document.querySelector('#compareLabels');
const compareLabelA = document.querySelector('#compareLabelA');
const compareLabelB = document.querySelector('#compareLabelB');
const seatTooltip = document.querySelector('#seatTooltip');
const tooltipSeat = document.querySelector('#tooltipSeat');
const tooltipDetail = document.querySelector('#tooltipDetail');
const sceneToast = document.querySelector('#sceneToast');
const activeCard = document.querySelector('#activeCard');
const selectedSeatsContainer = document.querySelector('#selectedSeats');
const seatCountPill = document.querySelector('#seatCountPill');
const runningTotal = document.querySelector('#runningTotal');
const reviewButton = document.querySelector('#reviewButton');
const seatMap = document.querySelector('#seatMap');
const mapSelectedCount = document.querySelector('#mapSelectedCount');
const mapTotal = document.querySelector('#mapTotal');
const houseViewButton = document.querySelector('#houseViewButton');
const summarySeats = document.querySelector('#summarySeats');
const summarySubtotal = document.querySelector('#summarySubtotal');
const summaryTotal = document.querySelector('#summaryTotal');

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let ambientDust = null;
let seatBodyCushion = null;
let seatBodyBack = null;
let seatRaycastTargets = [];

function setupThree() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    showSceneFallback('This browser could not start the 3D view. The seat map is still available.');
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071416);
  scene.fog = new THREE.FogExp2(0x071416, 0.014);

  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 70);
  camera.position.copy(overviewPosition().position);
  camera.lookAt(overviewPosition().target);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(overviewPosition().target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 8.5;
  controls.maxDistance = 31;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = 1.43;
  controls.minAzimuthAngle = -1.05;
  controls.maxAzimuthAngle = 1.05;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.65;
  controls.update();

  compareCameraA = new THREE.PerspectiveCamera(55, 1, 0.1, 70);
  compareCameraB = new THREE.PerspectiveCamera(55, 1, 0.1, 70);

  buildLighting();
  buildHouse();
  buildStage();
  buildSeats();
  buildDust();
  resizeRenderer(true);

  sceneReady = true;
  sceneLoader.classList.add('is-hidden');
  renderer.setAnimationLoop(animate);
}

function showSceneFallback(message) {
  sceneLoader.classList.add('is-hidden');
  const fallback = document.createElement('div');
  fallback.className = 'scene-fallback';
  fallback.innerHTML = `<strong>Seat views need WebGL.</strong><span>${message}</span>`;
  viewport.appendChild(fallback);
}

function overviewPosition() {
  const narrow = window.innerWidth < 700;
  return {
    position: new THREE.Vector3(narrow ? 13.2 : 7.2, narrow ? 10.9 : 10.6, narrow ? 21.8 : 22.0),
    target: new THREE.Vector3(0, narrow ? 2.25 : 2.2, narrow ? -2.0 : -2.4),
    fov: narrow ? 51 : 43,
  };
}

function addBox(parent, width, height, depth, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.castShadow) mesh.castShadow = true;
  if (options.receiveShadow) mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, segments, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.castShadow) mesh.castShadow = true;
  if (options.receiveShadow) mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinderBetween(parent, start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.12, length, segments);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildLighting() {
  scene.add(new THREE.HemisphereLight(0xaacbc8, 0x1c100c, 0.72));
  scene.add(new THREE.AmbientLight(0x829b98, 0.26));

  const keyLight = new THREE.DirectionalLight(0xffe0b6, 1.65);
  keyLight.position.set(4.5, 12, 8);
  keyLight.target.position.set(0, 0, 0);
  keyLight.castShadow = window.innerWidth > 700;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -13;
  keyLight.shadow.camera.right = 13;
  keyLight.shadow.camera.top = 12;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const stageSpot = new THREE.SpotLight(0xffd39a, 260, 34, 0.48, 0.78, 1.55);
  stageSpot.position.set(0.8, 9.7, 1.2);
  stageSpot.target.position.set(0, 0.7, -10.5);
  stageSpot.castShadow = window.innerWidth > 700;
  stageSpot.shadow.mapSize.set(1024, 1024);
  stageSpot.shadow.bias = -0.0015;
  scene.add(stageSpot);
  scene.add(stageSpot.target);

  const stageFill = new THREE.PointLight(0xffc37a, 62, 18, 1.75);
  stageFill.position.set(0, 4.8, -12.6);
  scene.add(stageFill);

  const houseWash = new THREE.PointLight(0x9dc5be, 32, 22, 2);
  houseWash.position.set(-4, 6.6, 7);
  scene.add(houseWash);

  const rightWash = new THREE.PointLight(0xd8a466, 24, 18, 2);
  rightWash.position.set(8.4, 5.2, 1.5);
  scene.add(rightWash);
}

function buildHouse() {
  const room = new THREE.Group();
  room.name = 'Auditorium';
  scene.add(room);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 0.88, metalness: 0.02 });
  const stepMaterial = new THREE.MeshStandardMaterial({ color: 0x39251b, roughness: 0.83, metalness: 0.02 });
  const stepEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6538, roughness: 0.54, metalness: 0.35 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x18302f, roughness: 0.92, metalness: 0.01 });
  const wallPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x213b38, roughness: 0.88, metalness: 0.02 });
  const brassMaterial = new THREE.MeshStandardMaterial({ color: 0x9d7544, roughness: 0.42, metalness: 0.66 });
  const darkBrassMaterial = new THREE.MeshStandardMaterial({ color: 0x5a442d, roughness: 0.52, metalness: 0.5 });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x28302e, roughness: 0.55, metalness: 0.48 });
  const sconceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdc9e,
    emissive: 0xffa94a,
    emissiveIntensity: 2.4,
    roughness: 0.34,
  });

  addBox(room, 23.2, 0.4, 29, floorMaterial, 0, -0.68, 1.7, { receiveShadow: true });
  addBox(room, 2.1, 0.025, 21, new THREE.MeshStandardMaterial({ color: 0x3f2420, roughness: 0.96 }), 0, -0.465, 3.3);

  for (let rowIndex = 0; rowIndex < ROW_NAMES.length; rowIndex += 1) {
    const base = rowBase(rowIndex);
    const z = rowZ(rowIndex);
    const stepHeight = base + 0.6;
    addBox(room, 14.7, stepHeight, 1.35, stepMaterial, 0, (base - 0.6) / 2, z, { receiveShadow: true });
    addBox(room, 14.7, 0.045, 0.045, stepEdgeMaterial, 0, base + 0.008, z - 0.665);
    addBox(room, 13.8, 0.012, 0.7, new THREE.MeshStandardMaterial({ color: 0x4b2a25, roughness: 1 }), 0, base + 0.012, z + 0.2);
  }

  addBox(room, 0.42, 9.2, 28.7, wallMaterial, -11.3, 3.8, 1.7);
  addBox(room, 0.42, 9.2, 28.7, wallMaterial, 11.3, 3.8, 1.7);

  for (const side of [-1, 1]) {
    for (let z = -8.3; z <= 11; z += 3.1) {
      addBox(room, 0.22, 7.4, 0.34, wallPanelMaterial, side * 11.05, 3.45, z);
      addBox(room, 0.1, 6.7, 0.09, darkBrassMaterial, side * 10.91, 3.5, z);
    }

    for (const z of [-4.7, 0.6, 5.9]) {
      addCylinder(room, 0.1, 0.13, 0.38, 12, darkBrassMaterial, side * 10.82, 4.67, z, { rotation: [0, 0, Math.PI / 2] });
      const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), sconceMaterial);
      sconce.position.set(side * 10.57, 4.67, z);
      room.add(sconce);
      addCylinder(room, 0.11, 0.11, 0.04, 12, brassMaterial, side * 10.76, 4.67, z, { rotation: [0, 0, Math.PI / 2] });
    }
  }

  const supportPositions = [-3.15, 3.15];
  for (const x of supportPositions) {
    const support = new THREE.Group();
    support.position.set(x, 0.65, 2.76);
    room.add(support);

    addBox(support, 0.86, 0.36, 0.86, darkMetalMaterial, 0, 0.05, 0, { castShadow: true, receiveShadow: true });
    addBox(support, 0.68, 0.19, 0.68, brassMaterial, 0, 0.31, 0, { castShadow: true });
    addCylinder(support, 0.29, 0.36, 4.13, 14, darkBrassMaterial, 0, 2.44, 0, { castShadow: true });
    addCylinder(support, 0.35, 0.35, 0.08, 14, brassMaterial, 0, 1.35, 0, { castShadow: true });
    addCylinder(support, 0.35, 0.35, 0.08, 14, brassMaterial, 0, 3.47, 0, { castShadow: true });
    addBox(support, 0.78, 0.2, 0.78, brassMaterial, 0, 4.59, 0, { castShadow: true });
    addBox(support, 1.02, 0.16, 1.02, darkMetalMaterial, 0, 4.76, 0, { castShadow: true });
    addCylinder(support, 0.16, 0.23, 0.48, 10, brassMaterial, 0, 4.92, 0, { castShadow: true });

    const beamDirection = x < 0 ? -1 : 1;
    addBox(room, 8.25, 0.34, 0.48, darkBrassMaterial, x + beamDirection * 4.15, 5.69, 2.76, {
      castShadow: true,
    });
  }

  addBox(room, 0.32, 0.28, 11.2, darkBrassMaterial, -6.88, 5.87, 3.7, { castShadow: true });
  addBox(room, 0.32, 0.28, 11.2, darkBrassMaterial, 6.88, 5.87, 3.7, { castShadow: true });

  for (const side of [-1, 1]) {
    addBox(room, 4.25, 0.22, 11.2, darkMetalMaterial, side * 9.0, 5.72, 3.7, { castShadow: true });
    addBox(room, 4.25, 0.06, 11.24, brassMaterial, side * 9.0, 5.62, 3.7);
    for (let index = 0; index < 9; index += 1) {
      const z = -1.5 + index * 1.35;
      addBox(room, 0.04, 0.76, 0.04, brassMaterial, side * 6.72, 6.36, z);
    }
    addCylinder(room, 0.035, 0.035, 10.8, 8, brassMaterial, side * 6.72, 6.75, 3.9, { rotation: [Math.PI / 2, 0, 0] });
  }
}

function buildStage() {
  const stage = new THREE.Group();
  stage.name = 'Stage';
  scene.add(stage);

  const stageWood = new THREE.MeshStandardMaterial({ color: 0x6b472c, roughness: 0.67, metalness: 0.03 });
  const stageWoodDark = new THREE.MeshStandardMaterial({ color: 0x3d2a1d, roughness: 0.76 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x102426, roughness: 0.94 });
  const backWallMaterial = new THREE.MeshStandardMaterial({ color: 0x0c2022, roughness: 0.97 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb4884e, roughness: 0.38, metalness: 0.72 });
  const brassDark = new THREE.MeshStandardMaterial({ color: 0x6f502d, roughness: 0.49, metalness: 0.58 });
  const curtainMaterial = new THREE.MeshStandardMaterial({ color: 0x521f20, roughness: 0.95 });
  const curtainLight = new THREE.MeshStandardMaterial({ color: 0x6d2928, roughness: 0.92 });
  const curtainDark = new THREE.MeshStandardMaterial({ color: 0x361517, roughness: 0.98 });
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xf2d49a });
  const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x071214, roughness: 1 });
  const propWood = new THREE.MeshStandardMaterial({ color: 0x3a2419, roughness: 0.8 });

  addBox(stage, 20.6, 0.8, 6.9, stageWoodDark, 0, 0.22, -10.4, { receiveShadow: true });
  addBox(stage, 20.1, 0.12, 6.42, stageWood, 0, 0.68, -10.4, { receiveShadow: true });
  addBox(stage, 20.5, 0.9, 0.4, brassDark, 0, 0.3, -6.91, { receiveShadow: true });
  addBox(stage, 20.5, 0.035, 0.05, brass, 0, 0.755, -6.72);

  for (let index = -5; index <= 5; index += 1) {
    addBox(stage, 0.015, 0.009, 5.9, brassDark, index * 1.75, 0.746, -10.4);
  }

  addBox(stage, 24.2, 10.8, 0.48, wallMaterial, 0, 4.9, -15.2);
  addBox(stage, 22.6, 9.2, 0.12, backWallMaterial, 0, 4.2, -14.92);

  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.15, 64), moonMaterial);
  moon.position.set(0, 5.05, -14.81);
  stage.add(moon);

  const moonRing = new THREE.Mesh(
    new THREE.RingGeometry(2.25, 2.29, 64),
    new THREE.MeshBasicMaterial({ color: 0xd7aa67, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  moonRing.position.set(0, 5.05, -14.79);
  stage.add(moonRing);

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({ color: 0xe3bb7c, transparent: true, opacity: 0.055, depthWrite: false }),
  );
  moonHalo.position.set(0, 5.05, -14.83);
  stage.add(moonHalo);

  const stars = new Float32Array(72 * 3);
  for (let index = 0; index < 72; index += 1) {
    stars[index * 3] = (Math.random() - 0.5) * 17;
    stars[index * 3 + 1] = 1.8 + Math.random() * 7.3;
    stars[index * 3 + 2] = -14.7 + Math.random() * 0.14;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starPoints = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xf4dcad, size: 0.033, transparent: true, opacity: 0.7 }),
  );
  stage.add(starPoints);

  const trunkBase = new THREE.Vector3(-1.8, 0.75, -12.9);
  const trunkTop = new THREE.Vector3(-1.66, 4.65, -12.9);
  cylinderBetween(stage, trunkBase, trunkTop, 0.15, treeMaterial, 9);
  cylinderBetween(stage, new THREE.Vector3(-1.72, 2.18, -12.88), new THREE.Vector3(-3.02, 3.35, -12.86), 0.075, treeMaterial, 8);
  cylinderBetween(stage, new THREE.Vector3(-3.02, 3.35, -12.86), new THREE.Vector3(-3.87, 4.2, -12.84), 0.04, treeMaterial, 7);
  cylinderBetween(stage, new THREE.Vector3(-3.02, 3.35, -12.86), new THREE.Vector3(-2.62, 4.45, -12.82), 0.034, treeMaterial, 7);
  cylinderBetween(stage, new THREE.Vector3(-1.7, 2.75, -12.87), new THREE.Vector3(-0.42, 4.03, -12.84), 0.07, treeMaterial, 8);
  cylinderBetween(stage, new THREE.Vector3(-0.42, 4.03, -12.84), new THREE.Vector3(0.56, 4.72, -12.82), 0.037, treeMaterial, 7);
  cylinderBetween(stage, new THREE.Vector3(-0.42, 4.03, -12.84), new THREE.Vector3(-0.16, 5.12, -12.82), 0.032, treeMaterial, 7);
  cylinderBetween(stage, new THREE.Vector3(-1.68, 3.94, -12.87), new THREE.Vector3(-1.15, 5.18, -12.83), 0.055, treeMaterial, 8);
  cylinderBetween(stage, new THREE.Vector3(-1.15, 5.18, -12.83), new THREE.Vector3(-1.54, 5.73, -12.82), 0.027, treeMaterial, 7);
  cylinderBetween(stage, new THREE.Vector3(-1.15, 5.18, -12.83), new THREE.Vector3(-0.58, 5.85, -12.82), 0.025, treeMaterial, 7);

  addBox(stage, 2.5, 0.16, 0.76, propWood, 3.1, 1.19, -10.87, { castShadow: true, receiveShadow: true });
  addBox(stage, 2.5, 0.65, 0.15, propWood, 3.1, 1.5, -10.55, { castShadow: true });
  addBox(stage, 0.16, 0.55, 0.66, propWood, 1.96, 0.91, -10.87, { castShadow: true });
  addBox(stage, 0.16, 0.55, 0.66, propWood, 4.24, 0.91, -10.87, { castShadow: true });
  addBox(stage, 2.05, 0.1, 0.58, curtainDark, 3.1, 1.31, -10.88, { castShadow: true });

  for (const side of [-1, 1]) {
    addBox(stage, 1.08, 8.45, 1.14, brassDark, side * 10.0, 4.44, -7.5, { castShadow: true });
    addBox(stage, 0.78, 7.65, 0.28, backWallMaterial, side * 9.99, 4.34, -6.9);
    addBox(stage, 0.19, 8.18, 0.22, brass, side * 9.46, 4.46, -6.94);
    addBox(stage, 1.4, 0.22, 1.34, brass, side * 10.0, 8.73, -7.5);
    addBox(stage, 1.45, 0.2, 1.4, brass, side * 10.0, 0.58, -7.5);
  }
  addBox(stage, 21.3, 0.72, 1.0, brassDark, 0, 8.75, -7.5, { castShadow: true });
  addBox(stage, 18.7, 0.22, 0.36, brass, 0, 8.43, -6.91);

  for (const side of [-1, 1]) {
    for (let fold = 0; fold < 9; fold += 1) {
      const x = side * (6.62 + fold * 0.36);
      const height = 7.55 + Math.sin(fold * 1.8) * 0.16 - fold * 0.04;
      const material = fold % 3 === 0 ? curtainLight : fold % 3 === 1 ? curtainMaterial : curtainDark;
      addBox(stage, 0.43, height, 0.42 + (fold % 2) * 0.06, material, x, 0.75 + height / 2, -8.08, {
        castShadow: fold < 3,
      });
    }
  }

  for (let fold = 0; fold < 16; fold += 1) {
    const x = -7.55 + fold * 1.0;
    addBox(stage, 1.15, 0.95 + (fold % 3) * 0.13, 0.48, fold % 2 ? curtainMaterial : curtainLight, x, 7.72, -7.87, {
      castShadow: true,
    });
  }

  addCylinder(stage, 0.035, 0.035, 1.8, 8, brassDark, 0, 7.35, -10.45);
  const practical = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe2ad, emissive: 0xffa643, emissiveIntensity: 3.2, roughness: 0.25 }),
  );
  practical.position.set(0, 6.4, -10.45);
  stage.add(practical);

  addBox(stage, 0.18, 0.18, 3.9, brassDark, -6.9, 8.05, -6.15, { rotation: [0.08, 0, 0] });
  addBox(stage, 0.18, 0.18, 3.9, brassDark, 6.9, 8.05, -6.15, { rotation: [0.08, 0, 0] });
  for (const x of [-7.6, -3.8, 0, 3.8, 7.6]) {
    const fixture = new THREE.Group();
    fixture.position.set(x, 7.86, -5.5);
    fixture.rotation.x = -0.96;
    stage.add(fixture);
    addCylinder(fixture, 0.14, 0.2, 0.46, 10, brassDark, 0, 0, 0, { rotation: [Math.PI / 2, 0, 0] });
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd190 }),
    );
    lens.position.set(0, 0, -0.24);
    lens.rotation.y = Math.PI;
    fixture.add(lens);
  }
}

function buildSeats() {
  const group = new THREE.Group();
  group.name = 'Audience';
  scene.add(group);

  const cushionGeometry = new RoundedBoxGeometry(0.7, 0.16, 0.58, 2, 0.055);
  const backGeometry = new RoundedBoxGeometry(0.7, 0.7, 0.15, 2, 0.06);
  const armGeometry = new RoundedBoxGeometry(0.065, 0.3, 0.55, 2, 0.025);
  const armCapGeometry = new RoundedBoxGeometry(0.08, 0.035, 0.57, 1, 0.015);
  const pedestalGeometry = new RoundedBoxGeometry(0.44, 0.28, 0.44, 1, 0.03);
  const reservedMarkGeometry = new THREE.BoxGeometry(0.42, 0.038, 0.018);
  const markerGeometry = new THREE.RingGeometry(0.4, 0.45, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x1d0806,
    emissiveIntensity: 0.24,
    roughness: 0.57,
    metalness: 0.14,
  });
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6a40, roughness: 0.43, metalness: 0.55 });
  const pedestalMaterial = new THREE.MeshStandardMaterial({ color: 0x232d2b, roughness: 0.54, metalness: 0.43 });
  const reservedMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xd8cbb5, roughness: 0.66, metalness: 0.04 });

  seatBodyCushion = new THREE.InstancedMesh(cushionGeometry, bodyMaterial, seats.length);
  seatBodyBack = new THREE.InstancedMesh(backGeometry, bodyMaterial, seats.length);
  const arms = new THREE.InstancedMesh(armGeometry, armMaterial, seats.length * 2);
  const armCaps = new THREE.InstancedMesh(armCapGeometry, armMaterial, seats.length * 2);
  const pedestals = new THREE.InstancedMesh(pedestalGeometry, pedestalMaterial, seats.length);
  const bodyMeshes = [seatBodyCushion, seatBodyBack, arms, armCaps, pedestals];

  for (const mesh of bodyMeshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    group.add(mesh);
  }

  seatBodyCushion.userData.resolveSeat = (instanceId) => seats[instanceId];
  seatBodyBack.userData.resolveSeat = (instanceId) => seats[instanceId];
  arms.userData.resolveSeat = (instanceId) => seats[Math.floor(instanceId / 2)];
  armCaps.userData.resolveSeat = (instanceId) => seats[Math.floor(instanceId / 2)];
  pedestals.userData.resolveSeat = (instanceId) => seats[instanceId];
  seatRaycastTargets = bodyMeshes;

  const rootMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const finalMatrix = new THREE.Matrix4();
  const seatPosition = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const upAxis = new THREE.Vector3(0, 1, 0);
  const rootQuaternion = new THREE.Quaternion();

  const setComponent = (mesh, instanceIndex, localX, localY, localZ, rotationX = 0) => {
    if (rotationX) localMatrix.makeRotationX(rotationX);
    else localMatrix.identity();
    localMatrix.setPosition(localX, localY, localZ);
    finalMatrix.multiplyMatrices(rootMatrix, localMatrix);
    mesh.setMatrixAt(instanceIndex, finalMatrix);
  };

  for (let seatIndex = 0; seatIndex < seats.length; seatIndex += 1) {
    const seat = seats[seatIndex];
    seat.instanceIndex = seatIndex;
    seatPosition.set(seat.x, seat.baseY, seat.z);
    rootQuaternion.setFromAxisAngle(upAxis, Math.atan2(seat.x, 9.25 + seat.z));
    rootMatrix.compose(seatPosition, rootQuaternion, one);

    setComponent(seatBodyCushion, seatIndex, 0, 0.43, -0.02, -0.035);
    setComponent(seatBodyBack, seatIndex, 0, 0.81, 0.23, -0.12);
    setComponent(pedestals, seatIndex, 0, 0.18, 0.04);
    setComponent(arms, seatIndex * 2, -0.385, 0.58, 0.02);
    setComponent(arms, seatIndex * 2 + 1, 0.385, 0.58, 0.02);
    setComponent(armCaps, seatIndex * 2, -0.385, 0.74, 0.02);
    setComponent(armCaps, seatIndex * 2 + 1, 0.385, 0.74, 0.02);
  }

  for (const mesh of bodyMeshes) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  for (const seat of seats) {
    if (seat.reserved) {
      const reservedGroup = new THREE.Group();
      reservedGroup.position.set(seat.x, seat.baseY, seat.z);
      reservedGroup.rotation.y = Math.atan2(seat.x, 9.25 + seat.z);
      const reservedMark = new THREE.Mesh(reservedMarkGeometry, reservedMarkMaterial);
      reservedMark.position.set(0, 0.83, 0.309);
      reservedGroup.add(reservedMark);
      group.add(reservedGroup);
      seat.reservedMark = reservedMark;
    }

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8aa65,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(seat.x, seat.baseY + 0.075, seat.z);
    marker.visible = false;
    seat.marker = marker;
    seat.markerMaterial = markerMaterial;
    group.add(marker);
  }

  applyAllSeatVisuals();
}

function applySeatVisual(seat) {
  if (!seatBodyCushion || !seatBodyBack || seat.instanceIndex === undefined) return;
  const color = new THREE.Color();
  const isSelected = selectedSeats.includes(seat);
  const isActive = activeSeat === seat;
  const isHovered = hoveredSeat === seat && !seat.reserved;

  if (seat.reserved) {
    color.setHex(0x394442);
  } else if (isSelected) {
    color.setHex(0x75ad90);
  } else if (isActive) {
    color.setHex(0xdba95f);
  } else if (isHovered) {
    color.setHex(0xe28a5b);
  } else if (seat.limited) {
    color.setHex(0xb5703f);
  } else {
    color.setHex(0xaa5139);
  }

  seatBodyCushion.setColorAt(seat.instanceIndex, color);
  seatBodyBack.setColorAt(seat.instanceIndex, color);
  seatBodyCushion.instanceColor.needsUpdate = true;
  seatBodyBack.instanceColor.needsUpdate = true;

  if (seat.marker) {
    seat.marker.visible = isSelected || isActive;
    seat.markerMaterial.color.setHex(isSelected ? 0xa8d1ba : 0xe3b86e);
    seat.markerMaterial.opacity = isActive ? 0.98 : 0.8;
  }
  if (seat.reservedMark) seat.reservedMark.visible = seat.reserved;
}

function buildDust() {
  const positions = new Float32Array(190 * 3);
  for (let index = 0; index < 190; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 19;
    positions[index * 3 + 1] = 0.7 + Math.random() * 8;
    positions[index * 3 + 2] = -13 + Math.random() * 23;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf2d4a3,
    size: 0.024,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  ambientDust = new THREE.Points(geometry, material);
  scene.add(ambientDust);
}

function resizeRenderer(initial = false) {
  if (!renderer || !camera) return;
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const mobile = width < 700;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  if (cameraMode === 'overview' || cameraMode === 'compare-pick') {
    const view = overviewPosition();
    camera.fov = view.fov;
    if (initial) {
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      camera.lookAt(controls.target);
    }
  } else if (cameraMode === 'seat') {
    camera.fov = mobile ? 58 : 55;
  }
  camera.updateProjectionMatrix();

  if (compareCameraA && compareCameraB) {
    const aspect = mobile ? width / (height / 2) : width / 2 / height;
    compareCameraA.aspect = aspect;
    compareCameraB.aspect = aspect;
    compareCameraA.fov = mobile ? 57 : 55;
    compareCameraB.fov = mobile ? 57 : 55;
    compareCameraA.updateProjectionMatrix();
    compareCameraB.updateProjectionMatrix();
  }
  compareLabels.classList.toggle('is-stacked', mobile);
}

function seatEyePosition(seat) {
  return new THREE.Vector3(seat.x, seat.baseY + 1.47, seat.z - 0.38);
}

function positionSeatCamera(targetCamera, seat) {
  targetCamera.position.copy(seatEyePosition(seat));
  targetCamera.fov = window.innerWidth < 700 ? 58 : 55;
  targetCamera.aspect = camera.aspect;
  targetCamera.lookAt(STAGE_TARGET);
  targetCamera.updateProjectionMatrix();
}

function startCameraTween(position, target, mode, duration = 1050) {
  if (!camera || !controls) return;
  cameraMode = mode;
  const startTime = performance.now();
  cameraTween = {
    startTime,
    duration,
    startPosition: camera.position.clone(),
    endPosition: position.clone(),
    startTarget: controls.target.clone(),
    endTarget: target.clone(),
  };
  controls.enabled = false;
  updateOverlays();
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function updateCameraTween(now) {
  if (!cameraTween) return;
  const rawProgress = Math.min(1, (now - cameraTween.startTime) / cameraTween.duration);
  const progress = easeInOutCubic(rawProgress);
  camera.position.lerpVectors(cameraTween.startPosition, cameraTween.endPosition, progress);
  controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, progress);
  camera.lookAt(controls.target);
  if (rawProgress >= 1) {
    cameraTween = null;
    if (cameraMode === 'overview' || cameraMode === 'compare-pick') {
      controls.enabled = true;
      controls.update();
    }
  }
}

function goToEyeView(seat) {
  if (!camera || !controls) return;
  const target = STAGE_TARGET.clone();
  camera.fov = window.innerWidth < 700 ? 58 : 55;
  camera.updateProjectionMatrix();
  startCameraTween(seatEyePosition(seat), target, 'seat');
}

function goToOverview(options = {}) {
  if (options.clearCompare) clearCompare();
  if (!camera || !controls) {
    cameraMode = 'overview';
    updateOverlays();
    return;
  }
  const view = overviewPosition();
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  startCameraTween(view.position, view.target, compare.armed ? 'compare-pick' : 'overview');
}

function clearCompare() {
  compare = { a: null, b: null, armed: false, active: false };
}

function armCompare() {
  if (!activeSeat) return;
  compare.a = activeSeat;
  compare.b = null;
  compare.armed = true;
  compare.active = false;
  goToOverview();
  updateInterface();
  showToast('View A pinned. Choose a second available seat to compare.');
}

function cancelCompare() {
  const returnSeat = compare.active ? compare.b : compare.a;
  clearCompare();
  if (returnSeat) {
    activeSeat = returnSeat;
    goToEyeView(returnSeat);
  } else {
    goToOverview();
  }
  updateInterface();
}

function exitCompareToSeat() {
  const returnSeat = compare.b || compare.a || activeSeat;
  clearCompare();
  if (returnSeat) {
    activeSeat = returnSeat;
    goToEyeView(returnSeat);
  }
  updateInterface();
}

function setupCompare() {
  if (!compare.a || !compare.b) return;
  cameraMode = 'compare';
  if (controls) controls.enabled = false;
  positionSeatCamera(compareCameraA, compare.a);
  positionSeatCamera(compareCameraB, compare.b);
  const mobile = viewport.clientWidth < 700;
  const aspect = mobile ? viewport.clientWidth / (viewport.clientHeight / 2) : viewport.clientWidth / 2 / viewport.clientHeight;
  compareCameraA.aspect = aspect;
  compareCameraB.aspect = aspect;
  compareCameraA.updateProjectionMatrix();
  compareCameraB.updateProjectionMatrix();
  updateOverlays();
}

function handleSeatSelection(seat) {
  if (!seat) return;
  if (seat.reserved) {
    showToast(`${seat.row}${seat.number} is already reserved. Choose a glowing seat.`);
    return;
  }
  if (compare.armed && compare.a && seat.id === compare.a.id) {
    showToast('Choose a different seat for your second view.');
    return;
  }

  if (compare.armed && compare.a) {
    compare.b = seat;
    compare.armed = false;
    compare.active = true;
    activeSeat = seat;
    setupCompare();
    updateInterface();
    return;
  }

  activeSeat = seat;
  clearCompare();
  goToEyeView(seat);
  updateInterface();
}

function canFormSeatGroup(candidateSeats) {
  if (candidateSeats.length <= 1) return { ok: true };
  const row = candidateSeats[0].row;
  if (candidateSeats.some((seat) => seat.row !== row)) {
    return { ok: false, message: 'Adjacent seats only — choose another seat in the same row.' };
  }
  const sorted = [...candidateSeats].sort((a, b) => a.x - b.x);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].x - sorted[index - 1].x > 1.02) {
      return { ok: false, message: 'Those seats cross an aisle. Choose a seat directly next to your group.' };
    }
  }
  return { ok: true };
}

function canAddSeat(seat) {
  if (!seat || seat.reserved) return { ok: false, message: 'That seat is unavailable.' };
  if (selectedSeats.includes(seat)) return { ok: true };
  return canFormSeatGroup([...selectedSeats, seat]);
}

function toggleBookingSeat(seat) {
  if (!seat) return;
  if (seat.reserved) return;
  const existingIndex = selectedSeats.findIndex((item) => item.id === seat.id);
  if (existingIndex >= 0) {
    selectedSeats.splice(existingIndex, 1);
  } else {
    const check = canAddSeat(seat);
    if (!check.ok) {
      showToast(check.message);
      return;
    }
    selectedSeats.push(seat);
    selectedSeats.sort((a, b) => a.rowIndex - b.rowIndex || a.x - b.x);
    showToast(`${seat.row}${seat.number} added. ${money.format(bookingTotal())} total.`);
  }
  updateInterface();
}

function removeSeat(seatId) {
  const index = selectedSeats.findIndex((seat) => seat.id === seatId);
  if (index >= 0) {
    selectedSeats.splice(index, 1);
    updateInterface();
  }
}

function bookingTotal() {
  return selectedSeats.reduce((total, seat) => total + seat.price, 0);
}

function updateInterface() {
  applyAllSeatVisuals();
  renderActiveCard();
  renderSelectedSeats();
  updateBookingSummaryState();
  refreshSeatMap();
  updateOverlays();
}

function applyAllSeatVisuals() {
  for (const seat of seats) applySeatVisual(seat);
}

function renderActiveCard() {
  if (compare.active && compare.a && compare.b) {
    const seatA = compare.a;
    const seatB = compare.b;
    const canBookB = canAddSeat(seatB);
    const bIsSelected = selectedSeats.includes(seatB);
    activeCard.innerHTML = `
      <div class="compare-active-card">
        <span class="eyebrow light">View comparison</span>
        <h3>Two views, side by side.</h3>
        <p>You are seeing the stage from both seats at eye level. Compare the framing, then add either option to your booking.</p>
        <div class="compare-seat-lines">
          <div class="compare-seat-line">
            <span>A</span>
            <div><strong>Row ${seatA.row} · Seat ${seatA.number}</strong><small>${seatA.limited ? 'Limited view' : sightlineLabel(seatA)}</small></div>
            <div class="compare-price"><b>${money.format(seatA.price)}</b><button type="button" data-action="toggle-compare-a" aria-label="${selectedSeats.includes(seatA) ? 'Remove view A from booking' : 'Add view A to booking'}">${selectedSeats.includes(seatA) ? '✓' : '+'}</button></div>
          </div>
          <div class="compare-seat-line">
            <span>B</span>
            <div><strong>Row ${seatB.row} · Seat ${seatB.number}</strong><small>${seatB.limited ? 'Limited view' : sightlineLabel(seatB)}</small></div>
            <div class="compare-price"><b>${money.format(seatB.price)}</b><button type="button" data-action="toggle-compare-b" aria-label="${bIsSelected ? 'Remove view B from booking' : 'Add view B to booking'}">${bIsSelected ? '✓' : '+'}</button></div>
          </div>
        </div>
        <div class="card-actions">
          <button class="card-primary ${bIsSelected ? 'is-added' : ''}" type="button" data-action="toggle-seat" ${!bIsSelected && !canBookB.ok ? 'disabled' : ''}>
            ${bIsSelected ? 'Remove view B from booking' : canBookB.ok ? `Add view B · ${money.format(seatB.price)}` : 'Choose an adjacent seat'}
          </button>
          <button class="card-secondary" type="button" data-action="exit-compare">Exit comparison</button>
        </div>
        <div class="card-hint"><i></i>Use + to add either view. Adjacent-seat rules still apply.</div>
      </div>
    `;
    return;
  }

  if (compare.armed && compare.a) {
    activeCard.innerHTML = `
      <div class="compare-pick-card">
        <span class="eyebrow light">Compare views</span>
        <h3>Now choose a second seat.</h3>
        <p>Select any other available seat in the house. We will show both sightlines side by side.</p>
        <div class="pinned-seat">
          <span class="pinned-letter">A</span>
          <div><small>View A pinned</small><strong>Row ${compare.a.row} · Seat ${compare.a.number}</strong></div>
        </div>
        <button class="card-secondary" type="button" data-action="cancel-compare">Cancel comparison</button>
      </div>
    `;
    return;
  }

  if (activeSeat) {
    const isBooked = selectedSeats.includes(activeSeat);
    const addCheck = canAddSeat(activeSeat);
    const price = money.format(activeSeat.price);
    activeCard.innerHTML = `
      <div class="seat-card">
        <div class="seat-card__top">
          <div>
            <span class="eyebrow light">View from row ${activeSeat.row}</span>
            <h3>Seat ${activeSeat.number}</h3>
          </div>
          <div class="seat-price"><strong>${price}</strong><span>per seat</span></div>
        </div>
        <div class="sightline ${activeSeat.limited ? 'is-limited' : ''}">
          ${eyeIcon()}
          <span>${activeSeat.limited ? 'Limited view · balcony support nearby' : `${sightlineLabel(activeSeat)} · clear stage sightline`}</span>
        </div>
        <p>${seatDescription(activeSeat)}</p>
        <div class="card-actions">
          <button class="card-primary ${isBooked ? 'is-added' : ''}" type="button" data-action="toggle-seat" ${!isBooked && !addCheck.ok ? 'disabled' : ''}>
            ${isBooked ? 'Remove from booking' : addCheck.ok ? `Add seat · ${price}` : 'Choose an adjacent seat'}
          </button>
          <button class="card-secondary" type="button" data-action="arm-compare">
            ${compareIcon()} Compare
          </button>
        </div>
        <div class="card-hint"><i></i>${isBooked ? 'This seat is in your booking.' : addCheck.ok ? 'Add adjacent seats together for a group.' : addCheck.message}</div>
      </div>
    `;
    return;
  }

  activeCard.innerHTML = `
    <div class="empty-card">
      <div class="empty-orbit" aria-hidden="true">${eyeIcon()}</div>
      <span class="eyebrow">Start here</span>
      <h3>Find your view.</h3>
      <p>Select any glowing seat in the 3D house or open the seating plan to see the stage from that exact place.</p>
      <div class="empty-steps">
        <span class="empty-step"><span>1</span>Pick a seat</span>
        <span class="empty-step"><span>2</span>See the stage</span>
        <span class="empty-step"><span>3</span>Add to booking</span>
      </div>
    </div>
  `;
}

function sightlineLabel(seat) {
  if (seat.limited) return 'Limited view';
  if (seat.rowIndex < 4) return 'Premium sightline';
  if (seat.rowIndex < 6) return 'Great sightline';
  return 'Clear sightline';
}

function seatDescription(seat) {
  if (seat.limited) {
    return 'A balcony support sits near this sightline. The stage is visible, but the upstage left corner may be obscured from this angle.';
  }
  const rowText = seat.rowIndex < 4 ? 'Close to the stage with a gently elevated view.' : seat.rowIndex < 7 ? 'A comfortable mid-house view with the full proscenium in frame.' : 'A raised rear view with a clear, complete picture of the stage.';
  return `${rowText} Seat ${seat.number} looks straight toward center stage from the ${seat.number < 4 ? 'left' : seat.number > 9 ? 'right' : 'center'} section.`;
}

function eyeIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.2 10s2.8-5 7.8-5 7.8 5 7.8 5-2.8 5-7.8 5-7.8-5-7.8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg>';
}

function compareIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3.5" width="6.2" height="13" rx="1.2"/><rect x="11.3" y="3.5" width="6.2" height="13" rx="1.2"/></svg>';
}

function renderSelectedSeats() {
  if (selectedSeats.length === 0) {
    selectedSeatsContainer.innerHTML = '<div class="empty-selection">Choose a seat to begin — adjacent seats can be added together.</div>';
  } else {
    selectedSeatsContainer.innerHTML = `<div class="selected-list">${selectedSeats.map((seat) => `
      <div class="selected-chip">
        <span><strong>${seat.row}${seat.number}</strong><small>${money.format(seat.price)}</small></span>
        <button type="button" data-remove-seat="${seat.id}" aria-label="Remove row ${seat.row} seat ${seat.number}">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9"/></svg>
        </button>
      </div>
    `).join('')}</div>`;
  }
  seatCountPill.textContent = String(selectedSeats.length);
  runningTotal.textContent = money.format(bookingTotal());
  reviewButton.disabled = selectedSeats.length === 0;
}

function updateBookingSummaryState() {
  const total = bookingTotal();
  mapSelectedCount.textContent = `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'}`;
  mapTotal.textContent = money.format(total);
  summarySubtotal.textContent = money.format(total);
  summaryTotal.textContent = money.format(total);
}

function updateOverlays() {
  const isOverview = cameraMode === 'overview' || cameraMode === 'compare-pick';
  const isCompare = compare.active && compare.a && compare.b;
  sceneTitle.classList.toggle('is-hidden', !isOverview);
  previewTop.hidden = cameraMode !== 'seat';
  if (activeSeat) previewSeatName.textContent = `Row ${activeSeat.row} · Seat ${activeSeat.number}`;
  compareBanner.hidden = !(compare.armed && !compare.active);
  if (compare.armed && compare.a) {
    compareBannerText.textContent = `View A pinned — choose a second seat to compare`;
  }
  compareLabels.hidden = !isCompare;
  if (isCompare) {
    compareLabelA.textContent = `Row ${compare.a.row} · Seat ${compare.a.number}`;
    compareLabelB.textContent = `Row ${compare.b.row} · Seat ${compare.b.number}`;
  }
  houseViewButton.classList.toggle('is-active', isOverview && !compare.armed);
}

function buildSeatMap() {
  seatMap.innerHTML = '';
  for (let rowIndex = 0; rowIndex < ROW_NAMES.length; rowIndex += 1) {
    const rowElement = document.createElement('div');
    rowElement.className = 'seat-row';

    const labelLeft = document.createElement('span');
    labelLeft.className = 'row-label';
    labelLeft.textContent = ROW_NAMES[rowIndex];
    rowElement.appendChild(labelLeft);

    const seatsElement = document.createElement('div');
    seatsElement.className = 'seat-row__seats';
    for (let number = 1; number <= 12; number += 1) {
      const seat = seatById.get(`${ROW_NAMES[rowIndex]}${number}`);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'seat-btn';
      button.dataset.seatId = seat.id;
      button.textContent = String(number);
      button.setAttribute('aria-label', seatAriaLabel(seat));
      button.title = `${seat.id} · ${money.format(seat.price)} · ${seat.reserved ? 'Reserved' : seat.limited ? 'Limited view' : 'Available'}`;
      if (seat.reserved) button.disabled = true;
      seatsElement.appendChild(button);
    }
    rowElement.appendChild(seatsElement);

    const labelRight = document.createElement('span');
    labelRight.className = 'row-label';
    labelRight.textContent = ROW_NAMES[rowIndex];
    rowElement.appendChild(labelRight);
    seatMap.appendChild(rowElement);
  }
  refreshSeatMap();
}

function seatAriaLabel(seat) {
  const availability = seat.reserved ? 'reserved' : seat.limited ? 'available, limited view' : 'available';
  return `Row ${seat.row}, seat ${seat.number}, ${money.format(seat.price)}, ${availability}`;
}

function refreshSeatMap() {
  for (const button of seatMap.querySelectorAll('.seat-btn')) {
    const seat = seatById.get(button.dataset.seatId);
    if (!seat) continue;
    button.classList.toggle('is-selected', selectedSeats.includes(seat));
    button.classList.toggle('is-active', activeSeat === seat);
    button.classList.toggle('is-limited', seat.limited);
    button.setAttribute('aria-pressed', selectedSeats.includes(seat) ? 'true' : 'false');
    button.setAttribute('aria-label', seatAriaLabel(seat));
  }
}

function selectSeatFromMap(seatId) {
  const seat = seatById.get(seatId);
  if (!seat) return;
  if (seat.reserved) {
    showToast(`Row ${seat.row} seat ${seat.number} is reserved.`);
    return;
  }
  closeModal('seatMapModal');
  handleSeatSelection(seat);
}

function renderSummary() {
  summarySeats.innerHTML = selectedSeats.map((seat) => `
    <div class="summary-seat-row">
      <span><svg viewBox="0 0 14 14" aria-hidden="true"><path d="m2.5 7.2 2.9 2.9 6.1-6"/></svg></span>
      <div><strong>Row ${seat.row} · Seat ${seat.number}</strong><small>${seat.limited ? 'Limited view' : seat.rowIndex < 4 ? 'Premium' : 'Standard'}</small></div>
      <b>${money.format(seat.price)}</b>
    </div>
  `).join('');
  updateBookingSummaryState();
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  if (id === 'summaryModal') renderSummary();
  modal.hidden = false;
  const focusTarget = modal.querySelector('button:not([disabled]), [tabindex="0"]');
  window.setTimeout(() => focusTarget?.focus(), 30);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = true;
  lastFocusedElement?.focus?.();
}

function closeAnyModal() {
  const openModalElement = document.querySelector('.modal-backdrop:not([hidden])');
  if (!openModalElement) return false;
  closeModal(openModalElement.id);
  return true;
}

function showToast(message) {
  sceneToast.textContent = message;
  sceneToast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => sceneToast.classList.remove('is-visible'), 3400);
}

function raycasterSeatFromEvent(event) {
  if (!renderer || !camera) return null;
  if (cameraMode !== 'overview' && cameraMode !== 'compare-pick') return null;
  const rect = canvas.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(seatRaycastTargets, false);
  if (!intersections.length) return null;
  const intersection = intersections[0];
  return intersection.object.userData.resolveSeat?.(intersection.instanceId) || null;
}

function setHoveredSeat(seat) {
  if (hoveredSeat === seat) return;
  const previous = hoveredSeat;
  hoveredSeat = seat;
  if (previous) applySeatVisual(previous);
  if (seat) applySeatVisual(seat);
}

function handlePointerMove(event) {
  if (event.pointerType === 'touch') {
    setHoveredSeat(null);
    return;
  }
  const seat = raycasterSeatFromEvent(event);
  setHoveredSeat(seat);
  canvas.classList.toggle('is-pointing', Boolean(seat && !seat.reserved));
  canvas.classList.toggle('is-reserved', Boolean(seat && seat.reserved));
  if (!seat) {
    seatTooltip.hidden = true;
    return;
  }
  const rect = viewport.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const relativeY = event.clientY - rect.top;
  const flipX = relativeX > rect.width - 165;
  seatTooltip.hidden = false;
  seatTooltip.style.left = `${relativeX}px`;
  seatTooltip.style.top = `${relativeY}px`;
  seatTooltip.style.transform = flipX ? 'translate(calc(-100% - 12px), 15px)' : 'translate(15px, 15px)';
  tooltipSeat.textContent = `Row ${seat.row} · Seat ${seat.number}`;
  tooltipDetail.textContent = seat.reserved
    ? 'Reserved'
    : `${money.format(seat.price)} · ${seat.limited ? 'Limited view' : 'Available'}`;
}

let pointerDown = null;
function handlePointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
}

function handlePointerUp(event) {
  if (!pointerDown || pointerDown.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance > 7) return;
  const seat = raycasterSeatFromEvent(event);
  if (seat) {
    if (event.pointerType === 'touch') setHoveredSeat(null);
    handleSeatSelection(seat);
  }
}

function animate(now) {
  if (!renderer || !scene || !camera) return;
  if (cameraTween) updateCameraTween(now);
  else if (controls?.enabled) controls.update();

  if (ambientDust) {
    ambientDust.rotation.y = Math.sin(now * 0.000035) * 0.018;
    ambientDust.position.y = Math.sin(now * 0.00012) * 0.035;
  }

  for (const seat of seats) {
    if (seat.marker?.visible) {
      const pulse = 1 + Math.sin(now * 0.0035 + seat.number * 0.4) * 0.035;
      seat.marker.scale.setScalar(pulse);
    }
  }

  if (compare.active && compare.a && compare.b) {
    renderCompareScene();
  } else {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, viewport.clientWidth, viewport.clientHeight);
    renderer.render(scene, camera);
  }
}

function renderCompareScene() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const mobile = width < 700;
  renderer.setScissorTest(true);
  if (mobile) {
    const half = Math.floor(height / 2);
    renderer.setViewport(0, half, width, height - half);
    renderer.setScissor(0, half, width, height - half);
    renderer.render(scene, compareCameraA);
    renderer.setViewport(0, 0, width, half);
    renderer.setScissor(0, 0, width, half);
    renderer.render(scene, compareCameraB);
  } else {
    const half = Math.floor(width / 2);
    renderer.setViewport(0, 0, half, height);
    renderer.setScissor(0, 0, half, height);
    renderer.render(scene, compareCameraA);
    renderer.setViewport(half, 0, width - half, height);
    renderer.setScissor(half, 0, width - half, height);
    renderer.render(scene, compareCameraB);
  }
  renderer.setScissorTest(false);
}

function showHouseOverview() {
  if (compare.active || compare.armed) clearCompare();
  goToOverview();
  updateInterface();
}

function handleActiveCardClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'toggle-seat' && activeSeat) toggleBookingSeat(activeSeat);
  if (action === 'toggle-compare-a' && compare.a) toggleBookingSeat(compare.a);
  if (action === 'toggle-compare-b' && compare.b) toggleBookingSeat(compare.b);
  if (action === 'arm-compare') armCompare();
  if (action === 'cancel-compare') cancelCompare();
  if (action === 'exit-compare') exitCompareToSeat();
}

function attachEvents() {
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', () => {
    setHoveredSeat(null);
    seatTooltip.hidden = true;
    canvas.classList.remove('is-pointing', 'is-reserved');
  });
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', () => { pointerDown = null; });

  activeCard.addEventListener('click', handleActiveCardClick);
  selectedSeatsContainer.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-remove-seat]');
    if (button) removeSeat(button.dataset.removeSeat);
  });

  seatMap.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-seat-id]');
    if (button) selectSeatFromMap(button.dataset.seatId);
  });

  document.querySelector('#openMapButton').addEventListener('click', () => openModal('seatMapModal'));
  document.querySelector('#sceneMapButton').addEventListener('click', () => openModal('seatMapModal'));
  document.querySelector('#guideButton').addEventListener('click', () => openModal('seatMapModal'));
  document.querySelector('#previewBackButton').addEventListener('click', showHouseOverview);
  document.querySelector('#houseViewButton').addEventListener('click', showHouseOverview);
  document.querySelector('#resetViewButton').addEventListener('click', () => {
    if (compare.active || compare.armed) clearCompare();
    goToOverview();
    updateInterface();
  });
  document.querySelector('#cancelCompareTop').addEventListener('click', cancelCompare);
  reviewButton.addEventListener('click', () => {
    if (selectedSeats.length > 0) openModal('summaryModal');
  });
  document.querySelector('#summaryDoneButton').addEventListener('click', () => closeModal('summaryModal'));

  for (const closeButton of document.querySelectorAll('[data-close]')) {
    closeButton.addEventListener('click', () => closeModal(closeButton.dataset.close));
  }
  for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (closeAnyModal()) return;
      if (compare.armed) {
        cancelCompare();
      } else if (cameraMode === 'seat') {
        showHouseOverview();
      }
    }
  });

  window.addEventListener('resize', () => resizeRenderer(false));
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => resizeRenderer(false));
    observer.observe(viewport);
  }
}

function initialize() {
  buildSeatMap();
  renderActiveCard();
  renderSelectedSeats();
  updateBookingSummaryState();
  attachEvents();
  updateOverlays();
  setupThree();
  if (!sceneReady && sceneLoader) {
    window.setTimeout(() => sceneLoader.classList.add('is-hidden'), 1200);
  }
}

initialize();
