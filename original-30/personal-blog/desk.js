import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.querySelector("#desk-canvas");
const frame = document.querySelector("#scene-frame");
const lightButton = document.querySelector("#scene-light");
const lightState = document.querySelector("#light-state");
const sceneStatus = document.querySelector("#scene-status");

if (!canvas || !frame || !lightButton) {
  throw new Error("Desk scene markup is missing.");
}

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reducedMotionQuery.matches;
let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
} catch {
  frame.classList.add("no-webgl");
}

if (renderer) {
  initDesk();
}

function initDesk() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const clock = new THREE.Clock();
  const lookTarget = new THREE.Vector3(0, 0.84, 0.05);

  const cameraState = {
    currentAzimuth: 0,
    targetAzimuth: 0,
    radius: 7.5,
    height: 3.35,
  };

  const materials = {
    wood: new THREE.MeshStandardMaterial({ color: 0x8d5f45, roughness: 0.72, metalness: 0.02 }),
    woodEdge: new THREE.MeshStandardMaterial({ color: 0x744a35, roughness: 0.82 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xddd0bc, roughness: 0.98 }),
    wallShadow: new THREE.MeshStandardMaterial({ color: 0xcabba4, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf0e7d4, roughness: 0.95 }),
    paperShadow: new THREE.MeshStandardMaterial({ color: 0xd8cbb5, roughness: 1 }),
    ink: new THREE.MeshStandardMaterial({ color: 0x302b25, roughness: 0.92 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x30477d, roughness: 0.75 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x516da8, roughness: 0.8 }),
    rust: new THREE.MeshStandardMaterial({ color: 0xb85f43, roughness: 0.82 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe8dcc5, roughness: 0.93 }),
    sage: new THREE.MeshStandardMaterial({ color: 0x617253, roughness: 0.88 }),
    sageLight: new THREE.MeshStandardMaterial({ color: 0x849274, roughness: 0.9 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0x9f5a41, roughness: 0.9 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x4c453d, roughness: 0.44, metalness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb99759, roughness: 0.4, metalness: 0.5 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x2f2017, roughness: 0.35 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe2b45f, roughness: 0.58 }),
  };

  // Room and light

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), materials.wall);
  wall.position.set(0, 2.15, -2.15);
  wall.receiveShadow = true;
  scene.add(wall);

  const shadowBand = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.15), materials.wallShadow);
  shadowBand.position.set(0, 0.3, -2.14);
  shadowBand.receiveShadow = true;
  scene.add(shadowBand);

  const hemi = new THREE.HemisphereLight(0xfff3dd, 0x5a4a3b, 1.3);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffefd6, 0.38);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffefd1, 2.25);
  keyLight.position.set(3.4, 5.4, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -4.4;
  keyLight.shadow.camera.right = 4.4;
  keyLight.shadow.camera.top = 4.4;
  keyLight.shadow.camera.bottom = -2.8;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 15;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xbfd0dc, 0.55);
  rimLight.position.set(-3, 3, -3);
  scene.add(rimLight);

  // Desk

  const desk = new THREE.Mesh(new RoundedBoxGeometry(6.15, 0.3, 3.18, 4, 0.07), materials.wood);
  desk.position.set(0, -0.15, 0.15);
  desk.receiveShadow = true;
  desk.castShadow = true;
  scene.add(desk);

  const deskEdge = new THREE.Mesh(new RoundedBoxGeometry(6.18, 0.12, 0.12, 3, 0.035), materials.woodEdge);
  deskEdge.position.set(0, -0.28, 1.71);
  deskEdge.castShadow = true;
  scene.add(deskEdge);

  const deskMat = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.026, 1.75, 4, 0.045), materials.paperShadow);
  deskMat.position.set(-0.08, 0.014, 0.58);
  deskMat.rotation.y = -0.018;
  deskMat.receiveShadow = true;
  scene.add(deskMat);

  // Framed city print

  const printGroup = new THREE.Group();
  printGroup.position.set(-1.18, 2.22, -2.115);
  scene.add(printGroup);

  const printBacking = createRoundedBox(1.48, 1.12, 0.06, 0.025, materials.paper, 3);
  printBacking.castShadow = true;
  printGroup.add(printBacking);

  const printPaper = createRoundedBox(1.25, 0.9, 0.025, 0.012, materials.paper, 2);
  printPaper.position.z = 0.045;
  printGroup.add(printPaper);

  const printSky = new THREE.Mesh(
    new THREE.PlaneGeometry(1.07, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x314c7e, roughness: 0.9 }),
  );
  printSky.position.z = 0.061;
  printGroup.add(printSky);

  const printSun = new THREE.Mesh(new THREE.CircleGeometry(0.14, 28), materials.gold);
  printSun.position.set(0.28, 0.17, 0.068);
  printGroup.add(printSun);

  const buildingMaterials = [materials.cream, materials.blue, materials.rust, materials.sage];
  [-0.38, -0.17, 0.06, 0.3].forEach((x, index) => {
    const height = [0.24, 0.35, 0.2, 0.29][index];
    const building = createBox([0.16, height, 0.012], buildingMaterials[index]);
    building.position.set(x, -0.36 + height / 2, 0.069);
    printGroup.add(building);
  });

  // Books

  const books = new THREE.Group();
  books.position.set(-2.08, 0, -0.48);
  books.rotation.y = 0.07;
  scene.add(books);

  [
    { size: [1.22, 0.13, 0.84], y: 0.085, color: materials.navy, angle: 0.05 },
    { size: [1.12, 0.12, 0.78], y: 0.21, color: materials.rust, angle: -0.035 },
    { size: [0.98, 0.11, 0.72], y: 0.325, color: materials.cream, angle: 0.018 },
  ].forEach((book) => {
    const mesh = createRoundedBox(book.size[0], book.size[1], book.size[2], 0.024, book.color, 3);
    mesh.position.y = book.y;
    mesh.rotation.y = book.angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    books.add(mesh);

    const pages = createRoundedBox(book.size[0] - 0.08, 0.035, book.size[2] - 0.06, 0.01, materials.paper, 2);
    pages.position.set(0.025, book.y + book.size[1] / 2 + 0.012, 0);
    pages.rotation.y = book.angle;
    pages.castShadow = true;
    books.add(pages);
  });

  const bookmark = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.38), materials.rust);
  bookmark.position.set(0.24, 0.395, 0.08);
  bookmark.rotation.y = 0.1;
  books.add(bookmark);

  // Open notebook

  const notebook = new THREE.Group();
  notebook.position.set(-0.27, 0, 0.55);
  notebook.rotation.y = -0.065;
  scene.add(notebook);

  const notebookCover = createRoundedBox(2.82, 0.055, 1.1, 0.04, materials.navy, 4);
  notebookCover.position.y = 0.055;
  notebookCover.castShadow = true;
  notebookCover.receiveShadow = true;
  notebook.add(notebookCover);

  const leftPage = createRoundedBox(1.36, 0.028, 1.01, 0.018, materials.paper, 3);
  leftPage.position.set(-0.68, 0.095, 0);
  leftPage.rotation.z = 0.012;
  leftPage.castShadow = true;
  leftPage.receiveShadow = true;
  notebook.add(leftPage);

  const rightPage = createRoundedBox(1.36, 0.028, 1.01, 0.018, materials.paper, 3);
  rightPage.position.set(0.68, 0.095, 0);
  rightPage.rotation.z = -0.012;
  rightPage.castShadow = true;
  rightPage.receiveShadow = true;
  notebook.add(rightPage);

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.04, 16), materials.navy);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, 0.1, 0);
  notebook.add(spine);

  const lineMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8172, roughness: 1 });
  [-0.32, -0.2, -0.08, 0.04, 0.16, 0.28].forEach((z, index) => {
    const width = index === 5 ? 0.73 : 0.92 - (index % 3) * 0.06;
    const leftLine = createBox([width, 0.003, 0.009], lineMaterial);
    leftLine.position.set(-0.68 + (index % 2) * 0.02, 0.113, z);
    notebook.add(leftLine);

    const rightLine = createBox([width - 0.08, 0.003, 0.009], lineMaterial);
    rightLine.position.set(0.68 - (index % 2) * 0.02, 0.113, z);
    notebook.add(rightLine);
  });

  const redNote = createBox([0.57, 0.004, 0.014], materials.rust);
  redNote.position.set(-0.6, 0.116, -0.08);
  notebook.add(redNote);

  const pen = cylinderBetween(
    new THREE.Vector3(0.05, 0.045, 0.35),
    new THREE.Vector3(0.88, 0.045, 0.68),
    0.024,
    materials.ink,
  );
  notebook.add(pen);

  const penClip = cylinderBetween(
    new THREE.Vector3(0.67, 0.05, 0.603),
    new THREE.Vector3(0.83, 0.05, 0.66),
    0.009,
    materials.brass,
  );
  notebook.add(penClip);

  // Paper city

  const city = new THREE.Group();
  city.position.set(0.42, 0.018, -1.0);
  city.rotation.y = -0.025;
  city.userData.interaction = "city";
  scene.add(city);

  const cityBase = createRoundedBox(2.0, 0.045, 0.94, 0.025, materials.cream, 3);
  cityBase.position.y = 0.025;
  cityBase.receiveShadow = true;
  city.add(cityBase);

  const gridMaterial = new THREE.MeshStandardMaterial({ color: 0xb8ab96, roughness: 1 });
  for (let i = -2; i <= 2; i += 1) {
    const vertical = createBox([0.006, 0.003, 0.86], gridMaterial);
    vertical.position.set(i * 0.36, 0.051, 0);
    city.add(vertical);
  }
  for (let i = -1; i <= 1; i += 1) {
    const horizontal = createBox([1.9, 0.003, 0.006], gridMaterial);
    horizontal.position.set(0, 0.051, i * 0.28);
    city.add(horizontal);
  }

  const cityWindowMaterial = new THREE.MeshStandardMaterial({
    color: 0x514a40,
    emissive: 0xe8a743,
    emissiveIntensity: 0.02,
    roughness: 0.82,
  });
  const cityBuildings = [];

  [
    { x: -0.67, z: 0.12, w: 0.28, d: 0.27, h: 0.3, material: materials.blue },
    { x: -0.32, z: -0.08, w: 0.33, d: 0.25, h: 0.43, material: materials.rust },
    { x: 0.1, z: 0.11, w: 0.26, d: 0.29, h: 0.25, material: materials.sage },
    { x: 0.47, z: -0.04, w: 0.3, d: 0.24, h: 0.5, material: materials.cream },
    { x: 0.79, z: 0.17, w: 0.23, d: 0.25, h: 0.34, material: materials.navy },
  ].forEach((building) => {
    const mesh = createRoundedBox(building.w, building.h, building.d, 0.012, building.material, 2);
    mesh.position.set(building.x, 0.055 + building.h / 2, building.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    city.add(mesh);
    cityBuildings.push(mesh);

    const windowGrid = createBox([0.055, 0.075, 0.006], cityWindowMaterial);
    windowGrid.position.set(building.x, 0.055 + building.h * 0.58, building.z + building.d / 2 + 0.004);
    city.add(windowGrid);

    const lowerWindow = createBox([0.045, 0.06, 0.006], cityWindowMaterial);
    lowerWindow.position.set(building.x, 0.055 + building.h * 0.32, building.z + building.d / 2 + 0.004);
    city.add(lowerWindow);
  });

  const cityTreeStem = cylinderBetween(
    new THREE.Vector3(0.87, 0.08, 0.25),
    new THREE.Vector3(0.87, 0.29, 0.25),
    0.012,
    materials.woodEdge,
  );
  city.add(cityTreeStem);
  const cityTree = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), materials.sageLight);
  cityTree.position.set(0.87, 0.34, 0.25);
  cityTree.castShadow = true;
  city.add(cityTree);

  // Lamp

  const lamp = new THREE.Group();
  lamp.position.set(2.02, 0, -0.55);
  lamp.userData.interaction = "lamp";
  scene.add(lamp);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.39, 0.075, 32), materials.metal);
  lampBase.position.y = 0.05;
  lampBase.castShadow = true;
  lamp.add(lampBase);

  const lampStem = cylinderBetween(
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(0, 1.46, 0),
    0.027,
    materials.metal,
  );
  lampStem.castShadow = true;
  lamp.add(lampStem);

  const upperJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), materials.metal);
  upperJoint.position.set(0, 1.47, 0);
  upperJoint.castShadow = true;
  lamp.add(upperJoint);

  const lampArm = cylinderBetween(
    new THREE.Vector3(0, 1.48, 0),
    new THREE.Vector3(-0.66, 1.82, 0.12),
    0.029,
    materials.metal,
  );
  lampArm.castShadow = true;
  lamp.add(lampArm);

  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb99770,
    roughness: 0.62,
    metalness: 0.18,
    emissive: 0x9b5d23,
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
  });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.43, 0.38, 32, 1, true), shadeMaterial);
  shade.position.set(-0.7, 1.68, 0.13);
  shade.rotation.z = -0.08;
  shade.castShadow = true;
  lamp.add(shade);

  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff1c7,
    emissive: 0xffc06b,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 12), bulbMaterial);
  bulb.position.set(-0.7, 1.53, 0.13);
  lamp.add(bulb);

  const shadeGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.375, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc97f, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  shadeGlow.position.set(-0.7, 1.492, 0.13);
  shadeGlow.rotation.x = Math.PI / 2;
  shadeGlow.rotation.z = -0.08;
  lamp.add(shadeGlow);

  const lampLight = new THREE.PointLight(0xffbd73, 19, 6.8, 2);
  lampLight.position.set(-0.7, 1.48, 0.13);
  lamp.add(lampLight);

  // Mug

  const mug = new THREE.Group();
  mug.position.set(1.48, 0, 0.69);
  mug.rotation.y = -0.14;
  mug.userData.interaction = "mug";
  scene.add(mug);

  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.385, 0.028, 32), materials.cream);
  saucer.position.y = 0.03;
  saucer.receiveShadow = true;
  mug.add(saucer);

  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.285, 0.41, 32), materials.paper);
  mugBody.position.y = 0.245;
  mugBody.castShadow = true;
  mugBody.receiveShadow = true;
  mug.add(mugBody);

  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.235, 32), materials.coffee);
  coffee.position.y = 0.452;
  coffee.rotation.x = -Math.PI / 2;
  mug.add(coffee);

  const mugRim = new THREE.Mesh(new THREE.TorusGeometry(0.252, 0.012, 8, 32), materials.cream);
  mugRim.position.y = 0.452;
  mugRim.rotation.x = Math.PI / 2;
  mug.add(mugRim);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.036, 10, 24, Math.PI * 1.42), materials.paper);
  handle.position.set(0.275, 0.265, 0);
  handle.rotation.z = -0.18;
  handle.castShadow = true;
  mug.add(handle);

  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 0.46, 0);
  mug.add(steamGroup);
  const steamTubes = [];

  [-0.08, 0.015, 0.11].forEach((x, index) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, 0),
      new THREE.Vector3(x - 0.08, 0.18, index % 2 ? 0.025 : -0.025),
      new THREE.Vector3(x + 0.075, 0.4, index % 2 ? -0.01 : 0.02),
      new THREE.Vector3(x - 0.025, 0.61 + index * 0.05, 0),
    ]);
    const material = new THREE.MeshBasicMaterial({
      color: 0xf7ead5,
      transparent: true,
      opacity: 0.22 - index * 0.025,
      depthWrite: false,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 5, false), material);
    tube.userData.baseY = index * 0.02;
    steamTubes.push(tube);
    steamGroup.add(tube);
  });

  // Plant

  const plant = new THREE.Group();
  plant.position.set(-2.42, 0, 0.66);
  scene.add(plant);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.3, 0.4, 24), materials.terracotta);
  pot.position.y = 0.2;
  pot.castShadow = true;
  pot.receiveShadow = true;
  plant.add(pot);

  const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 24), materials.terracotta);
  potRim.position.y = 0.4;
  potRim.rotation.x = Math.PI / 2;
  plant.add(potRim);

  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24), materials.soil);
  soil.position.y = 0.405;
  soil.rotation.x = -Math.PI / 2;
  plant.add(soil);

  const leafPositions = [
    [-0.23, 0.77, 0.04, -0.35, 0.1],
    [-0.08, 0.92, -0.1, -0.1, -0.3],
    [0.16, 0.83, 0.08, 0.4, 0.2],
    [0.27, 0.65, -0.02, 0.62, -0.1],
    [-0.02, 0.67, 0.2, 0.1, 0.75],
    [0.07, 1.03, 0.03, 0.18, -0.1],
  ];

  leafPositions.forEach(([x, y, z, rotZ, rotX], index) => {
    const stem = cylinderBetween(
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(x * 0.55, y - 0.07, z * 0.55),
      0.012,
      materials.sage,
    );
    plant.add(stem);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 7),
      index % 3 === 0 ? materials.sageLight : materials.sage,
    );
    leaf.scale.set(1, 0.3, 1.42);
    leaf.position.set(x, y, z);
    leaf.rotation.z = rotZ;
    leaf.rotation.x = rotX;
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    plant.add(leaf);
  });

  // A small stack of cards on the right

  const cards = new THREE.Group();
  cards.position.set(2.3, 0, 0.55);
  cards.rotation.y = -0.16;
  scene.add(cards);

  [
    { color: materials.blue, y: 0.035, angle: 0.15 },
    { color: materials.rust, y: 0.075, angle: -0.08 },
    { color: materials.paper, y: 0.115, angle: 0.03 },
  ].forEach((card) => {
    const mesh = createRoundedBox(0.92, 0.035, 0.62, 0.018, card.color, 2);
    mesh.position.y = card.y;
    mesh.rotation.y = card.angle;
    mesh.castShadow = true;
    cards.add(mesh);
  });

  // Scene interaction state

  let lampOn = true;
  let cityLit = false;
  let steamBoost = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactiveRoots = [lamp, city, mug];

  function setLamp(on, announce = true) {
    lampOn = on;
    lightButton.setAttribute("aria-pressed", String(on));
    lightState.textContent = on ? "on" : "off";
    lampLight.intensity = on ? 19 : 0;
    bulbMaterial.emissiveIntensity = on ? 1.3 : 0.05;
    shadeMaterial.emissiveIntensity = on ? 0.22 : 0;
    shadeGlow.material.opacity = on ? 0.4 : 0.03;

    if (announce) {
      sceneStatus.textContent = `Desk lamp ${on ? "on" : "off"}.`;
    }
    render();
  }

  function setCityLit(lit, announce = true) {
    cityLit = lit;
    cityWindowMaterial.color.set(lit ? 0xffd27d : 0x514a40);
    cityWindowMaterial.emissiveIntensity = lit ? 1.45 : 0.02;
    if (announce) {
      sceneStatus.textContent = lit ? "The tiny city lights are on." : "The tiny city lights are off.";
    }
    render();
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function interactionAt(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactiveRoots, true);
    if (!hits.length) return null;

    let node = hits[0].object;
    while (node && !node.userData.interaction) {
      node = node.parent;
    }
    return node?.userData.interaction ?? null;
  }

  function activateInteraction(kind) {
    if (kind === "lamp") setLamp(!lampOn);
    if (kind === "city") setCityLit(!cityLit);
    if (kind === "mug") {
      steamBoost = 1.8;
      sceneStatus.textContent = "Steam curls from the mug.";
    }
  }

  function clampAzimuth(value) {
    return THREE.MathUtils.clamp(value, -0.44, 0.44);
  }

  let pointerDown = false;
  let pointerMoved = false;
  let startX = 0;
  let lastX = 0;
  let activePointerId = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerDown = true;
    pointerMoved = false;
    startX = event.clientX;
    lastX = event.clientX;
    activePointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerDown) {
      const kind = interactionAt(event);
      canvas.style.cursor = kind ? "pointer" : "grab";
      return;
    }

    const delta = event.clientX - lastX;
    if (Math.abs(event.clientX - startX) > 3) pointerMoved = true;
    if (!pointerMoved) return;

    cameraState.targetAzimuth = clampAzimuth(cameraState.targetAzimuth - delta * 0.0045);
    lastX = event.clientX;

    if (reducedMotion) {
      cameraState.currentAzimuth = cameraState.targetAzimuth;
      updateCamera();
      render();
    }
  });

  function finishPointer(event, shouldActivate) {
    if (!pointerDown) return;
    pointerDown = false;
    canvas.classList.remove("is-dragging");

    if (activePointerId !== null && canvas.hasPointerCapture?.(activePointerId)) {
      canvas.releasePointerCapture(activePointerId);
    }
    activePointerId = null;

    if (shouldActivate && !pointerMoved) {
      activateInteraction(interactionAt(event));
    }
    canvas.style.cursor = "grab";
  }

  canvas.addEventListener("pointerup", (event) => finishPointer(event, true));
  canvas.addEventListener("pointercancel", (event) => finishPointer(event, false));
  canvas.addEventListener("pointerleave", () => {
    if (!pointerDown) canvas.style.cursor = "grab";
  });

  canvas.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? 1 : -1;
      cameraState.targetAzimuth = clampAzimuth(cameraState.targetAzimuth + direction * 0.1);
      if (reducedMotion) {
        cameraState.currentAzimuth = cameraState.targetAzimuth;
        updateCamera();
        render();
      }
      event.preventDefault();
      return;
    }

    if (key === "l" || event.key === "Enter" || event.key === " ") {
      setLamp(!lampOn);
      event.preventDefault();
      return;
    }

    if (key === "r" || event.key === "Home") {
      cameraState.targetAzimuth = 0;
      if (reducedMotion) {
        cameraState.currentAzimuth = 0;
        updateCamera();
        render();
      }
      event.preventDefault();
    }
  });

  lightButton.addEventListener("click", () => setLamp(!lampOn));

  reducedMotionQuery.addEventListener?.("change", (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      cameraState.currentAzimuth = cameraState.targetAzimuth;
      updateCamera();
      steamTubes.forEach((tube) => {
        tube.position.y = tube.userData.baseY;
        tube.material.opacity = 0.16;
      });
      render();
    }
  });

  function updateCamera() {
    const azimuth = cameraState.currentAzimuth;
    camera.position.set(
      Math.sin(azimuth) * cameraState.radius,
      cameraState.height,
      Math.cos(azimuth) * cameraState.radius,
    );
    camera.lookAt(lookTarget);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 430 ? 34 : 32;
    camera.updateProjectionMatrix();
    updateCamera();
    render();
  }

  function animate() {
    if (document.hidden) {
      window.requestAnimationFrame(animate);
      return;
    }

    const elapsed = clock.getElapsedTime();
    cameraState.currentAzimuth += (cameraState.targetAzimuth - cameraState.currentAzimuth) * 0.09;
    updateCamera();

    steamTubes.forEach((tube, index) => {
      tube.position.y = tube.userData.baseY + Math.sin(elapsed * 0.95 + index * 1.8) * 0.035;
      const boost = steamBoost > 0 ? 0.12 : 0;
      tube.material.opacity = 0.17 + index * 0.018 + Math.sin(elapsed * 1.2 + index) * 0.035 + boost;
    });

    if (steamBoost > 0) steamBoost = Math.max(0, steamBoost - 0.016);
    render();
    window.requestAnimationFrame(animate);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(frame);
  resize();
  setLamp(true, false);

  window.requestAnimationFrame(() => {
    frame.classList.add("is-ready");
    if (!reducedMotion) {
      window.requestAnimationFrame(animate);
    } else {
      render();
    }
  });
}

function createBox(size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createRoundedBox(width, height, depth, radius, material, segments = 3) {
  return new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, segments, radius),
    material,
  );
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 10, 1, false),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}
