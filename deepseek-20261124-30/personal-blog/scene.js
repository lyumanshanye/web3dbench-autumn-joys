import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const stage = document.querySelector("#desk-stage");
const canvas = document.querySelector("#desk-canvas");
const pauseButton = document.querySelector('[data-desk="pause"]');
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (stage && canvas) {
  try {
    initDesk();
  } catch (error) {
    stage.classList.remove("is-ready");
    stage.setAttribute("aria-label", "A still illustration of a desk. The interactive view is unavailable in this browser.");
    console.warn("The 3D desk could not start:", error);
  }
}

function initDesk() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 80);
  camera.position.set(7.6, 6.1, 8.6);
  camera.lookAt(0, -0.1, 0);

  const desk = new THREE.Group();
  desk.rotation.y = -0.04;
  scene.add(desk);

  const palette = {
    wood: 0xa56f4d,
    woodDark: 0x7d5037,
    woodEdge: 0x8d5c40,
    paper: 0xeee5d2,
    paperShade: 0xd8ccb5,
    ink: 0x2b2a24,
    green: 0x46604b,
    greenLight: 0x6f8260,
    terracotta: 0xb75c3e,
    clay: 0xca8d68,
    brass: 0xc19a55,
    cream: 0xe8ddc8,
    coffee: 0x3b2418,
    lavender: 0xa69aae
  };

  function matte(color, roughness = 0.9, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function roundedBox(width, height, depth, radius, material) {
    return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
  }

  function addMesh(parent, geometry, material, position, rotation) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  }

  // Floor and soft contact shadow
  const floor = addMesh(
    scene,
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({ color: 0x493a28, opacity: 0.2 }),
    [0, -2.18, 0],
    [-Math.PI / 2, 0, 0]
  );
  floor.receiveShadow = true;

  // Table
  const tabletop = roundedBox(6.05, 0.22, 3.55, 0.08, matte(palette.wood, 0.82));
  tabletop.position.y = 0;
  desk.add(tabletop);

  const tableEdge = roundedBox(6.06, 0.05, 3.56, 0.025, matte(palette.woodEdge, 0.9));
  tableEdge.position.y = -0.11;
  desk.add(tableEdge);

  const legMaterial = matte(palette.woodDark, 0.88);
  const legGeometry = new RoundedBoxGeometry(0.18, 2.0, 0.18, 3, 0.035);
  [-2.63, 2.63].forEach((x) => {
    [-1.43, 1.43].forEach((z) => {
      addMesh(desk, legGeometry, legMaterial, [x, -1.08, z]);
    });
  });

  const braceMaterial = matte(palette.woodDark, 0.9);
  addMesh(desk, new THREE.BoxGeometry(5.18, 0.09, 0.1), braceMaterial, [0, -1.18, -1.42]);
  addMesh(desk, new THREE.BoxGeometry(5.18, 0.09, 0.1), braceMaterial, [0, -1.18, 1.42]);

  // Open notebook
  const notebook = new THREE.Group();
  notebook.position.set(-0.52, 0.125, 0.28);
  notebook.rotation.y = -0.1;
  desk.add(notebook);

  const cover = roundedBox(3.0, 0.055, 1.38, 0.035, matte(0x8e4634, 0.9));
  cover.position.y = 0.01;
  notebook.add(cover);

  const pageMaterial = matte(palette.paper, 0.96);
  const leftPage = roundedBox(1.4, 0.035, 1.28, 0.025, pageMaterial);
  leftPage.position.set(-0.7, 0.06, 0);
  notebook.add(leftPage);

  const rightPage = roundedBox(1.4, 0.035, 1.28, 0.025, pageMaterial);
  rightPage.position.set(0.7, 0.062, 0);
  rightPage.rotation.z = -0.008;
  notebook.add(rightPage);

  const pageFold = addMesh(
    notebook,
    new THREE.BoxGeometry(0.035, 0.018, 1.28),
    matte(palette.paperShade, 0.95),
    [0, 0.087, 0]
  );
  pageFold.receiveShadow = true;

  const ruleMaterial = new THREE.MeshBasicMaterial({ color: 0x9b9384, transparent: true, opacity: 0.5 });
  const ruleGeometry = new THREE.BoxGeometry(0.92, 0.003, 0.012);
  [-0.68, 0.68].forEach((pageX) => {
    for (let line = 0; line < 7; line += 1) {
      const rule = new THREE.Mesh(ruleGeometry, ruleMaterial);
      rule.position.set(pageX, 0.087, -0.39 + line * 0.13);
      notebook.add(rule);
    }
  });

  // A small sketch on the right-hand page
  const sketchMaterial = new THREE.MeshBasicMaterial({ color: 0x644739, transparent: true, opacity: 0.72 });
  const sketch = new THREE.Group();
  sketch.position.set(0.69, 0.091, 0.08);
  notebook.add(sketch);
  const sketchRing = addMesh(sketch, new THREE.TorusGeometry(0.14, 0.007, 8, 30), sketchMaterial, [0, 0, 0], [Math.PI / 2, 0, 0]);
  sketchRing.scale.y = 0.7;
  addMesh(sketch, new THREE.BoxGeometry(0.32, 0.004, 0.008), sketchMaterial, [0.02, 0, 0.23], [0, -0.28, 0]);
  addMesh(sketch, new THREE.BoxGeometry(0.23, 0.004, 0.008), sketchMaterial, [-0.02, 0, -0.25], [0, 0.22, 0]);

  // Pencil
  const pencil = new THREE.Group();
  pencil.position.set(0.56, 0.17, 0.96);
  pencil.rotation.y = 0.28;
  desk.add(pencil);
  const pencilBody = addMesh(
    pencil,
    new THREE.CylinderGeometry(0.03, 0.03, 0.88, 12),
    matte(0xc59b48, 0.75),
    [0, 0, 0],
    [0, 0, Math.PI / 2]
  );
  const pencilTip = addMesh(
    pencil,
    new THREE.ConeGeometry(0.03, 0.13, 12),
    matte(0xd7b98d, 0.9),
    [0.505, 0, 0],
    [0, 0, -Math.PI / 2]
  );
  pencilBody.castShadow = true;
  pencilTip.castShadow = true;

  // Coffee cup and saucer
  const coffee = new THREE.Group();
  coffee.position.set(1.42, 0.12, -0.48);
  desk.add(coffee);

  const saucer = addMesh(
    coffee,
    new THREE.CylinderGeometry(0.46, 0.42, 0.035, 40),
    matte(palette.cream, 0.82),
    [0, 0.02, 0]
  );
  saucer.castShadow = true;

  const cupBody = addMesh(
    coffee,
    new THREE.CylinderGeometry(0.285, 0.245, 0.48, 40, 1, false),
    matte(palette.cream, 0.84),
    [0, 0.28, 0]
  );
  cupBody.castShadow = true;

  addMesh(
    coffee,
    new THREE.TorusGeometry(0.17, 0.043, 12, 32),
    matte(palette.cream, 0.84),
    [0.29, 0.31, 0],
    [0, 0, -0.08]
  );

  addMesh(
    coffee,
    new THREE.CircleGeometry(0.26, 40),
    new THREE.MeshStandardMaterial({ color: palette.coffee, roughness: 0.45 }),
    [0, 0.525, 0],
    [-Math.PI / 2, 0, 0]
  );

  const coffeeHighlight = addMesh(
    coffee,
    new THREE.RingGeometry(0.18, 0.235, 40),
    new THREE.MeshBasicMaterial({ color: 0x6f4430, transparent: true, opacity: 0.4 }),
    [0, 0.529, 0],
    [-Math.PI / 2, 0, 0]
  );
  coffeeHighlight.renderOrder = 1;

  // Steam
  const steam = new THREE.Group();
  steam.position.set(0, 0, 0);
  coffee.add(steam);
  const steamMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff7e8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  });
  const steamPieces = [];

  [
    { x: -0.11, z: 0.01, offset: 0 },
    { x: 0.03, z: -0.03, offset: 0.7 },
    { x: 0.15, z: 0.02, offset: 1.3 }
  ].forEach((piece, index) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(piece.x, 0.58, piece.z),
      new THREE.Vector3(piece.x - 0.05, 0.72, piece.z + 0.02),
      new THREE.Vector3(piece.x + 0.05, 0.86, piece.z - 0.02),
      new THREE.Vector3(piece.x - 0.02, 1.02 + index * 0.03, piece.z + 0.01)
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.009, 6, false), steamMaterial);
    tube.userData.baseY = 0;
    tube.userData.offset = piece.offset;
    steam.add(tube);
    steamPieces.push(tube);
  });

  // Potted plant
  const plant = new THREE.Group();
  plant.position.set(-2.05, 0.11, -0.9);
  desk.add(plant);

  const pot = addMesh(
    plant,
    new THREE.CylinderGeometry(0.32, 0.25, 0.46, 32),
    matte(palette.terracotta, 0.92),
    [0, 0.24, 0]
  );
  pot.castShadow = true;

  addMesh(
    plant,
    new THREE.TorusGeometry(0.315, 0.025, 8, 32),
    matte(0xa64b34, 0.9),
    [0, 0.465, 0],
    [Math.PI / 2, 0, 0]
  );

  addMesh(
    plant,
    new THREE.CylinderGeometry(0.026, 0.035, 0.82, 8),
    matte(0x4c5e3e, 0.9),
    [0, 0.84, 0]
  );

  const leafMaterial = matte(palette.green, 0.86);
  const leafGeometry = new THREE.SphereGeometry(0.13, 12, 8);
  const leaves = [];
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2 + 0.3;
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.scale.set(0.44, 1.65, 0.24);
    leaf.position.set(Math.cos(angle) * 0.13, 1.04 + (index % 3) * 0.14, Math.sin(angle) * 0.13);
    leaf.rotation.y = -angle;
    leaf.rotation.z = Math.cos(angle) * 0.72;
    leaf.rotation.x = Math.sin(angle) * 0.5;
    leaf.userData.baseZ = leaf.rotation.z;
    leaf.userData.phase = index * 0.78;
    leaf.castShadow = true;
    plant.add(leaf);
    leaves.push(leaf);
  }

  // Books
  const books = new THREE.Group();
  books.position.set(-1.86, 0.11, 1.15);
  books.rotation.y = 0.09;
  desk.add(books);

  const bookData = [
    { width: 1.15, height: 0.09, depth: 0.78, color: 0x7b8a74, y: 0.045, turn: -0.04 },
    { width: 1.03, height: 0.08, depth: 0.73, color: 0xc09455, y: 0.13, turn: 0.07 },
    { width: 0.9, height: 0.075, depth: 0.67, color: 0x9b6658, y: 0.208, turn: -0.02 }
  ];

  bookData.forEach((book) => {
    const mesh = roundedBox(book.width, book.height, book.depth, 0.018, matte(book.color, 0.9));
    mesh.position.y = book.y;
    mesh.rotation.y = book.turn;
    mesh.castShadow = true;
    books.add(mesh);

    const pageBlock = roundedBox(book.width - 0.08, book.height * 0.68, book.depth - 0.06, 0.01, matte(palette.paperShade, 0.95));
    pageBlock.position.set(0.02, book.y + 0.006, 0);
    pageBlock.rotation.y = book.turn;
    books.add(pageBlock);
  });

  // Lamp
  const lamp = new THREE.Group();
  lamp.position.set(2.04, 0.11, 0.85);
  desk.add(lamp);

  addMesh(
    lamp,
    new THREE.CylinderGeometry(0.28, 0.31, 0.06, 32),
    matte(0x343b32, 0.7, 0.08),
    [0, 0.03, 0]
  );

  addMesh(
    lamp,
    new THREE.CylinderGeometry(0.028, 0.035, 1.38, 12),
    matte(0x343b32, 0.72, 0.1),
    [0, 0.74, 0]
  );

  const arm = addMesh(
    lamp,
    new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10),
    matte(0x343b32, 0.72, 0.1),
    [-0.23, 1.43, 0],
    [0, 0, Math.PI / 2]
  );
  arm.rotation.z = Math.PI / 2;

  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: palette.green,
    roughness: 0.74,
    metalness: 0.04,
    side: THREE.DoubleSide
  });
  const shade = addMesh(
    lamp,
    new THREE.CylinderGeometry(0.18, 0.43, 0.36, 36, 1, true),
    shadeMaterial,
    [-0.42, 1.36, 0]
  );
  shade.castShadow = true;

  addMesh(
    lamp,
    new THREE.CircleGeometry(0.415, 36),
    new THREE.MeshBasicMaterial({ color: 0xffe2b0, side: THREE.DoubleSide }),
    [-0.42, 1.18, 0],
    [Math.PI / 2, 0, 0]
  );

  const lampLight = new THREE.PointLight(0xffca87, 3.4, 5, 2);
  lampLight.position.set(-0.42, 1.12, 0);
  lamp.add(lampLight);

  // Tiny loose postcard
  const card = roundedBox(0.62, 0.018, 0.42, 0.01, matte(0xe7cfaa, 0.95));
  card.position.set(0.98, 0.135, 0.82);
  card.rotation.y = -0.3;
  desk.add(card);
  addMesh(
    desk,
    new THREE.TorusGeometry(0.08, 0.006, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0x8f4939, transparent: true, opacity: 0.7 }),
    [0.98, 0.15, 0.82],
    [Math.PI / 2, 0, 0]
  );

  // Lighting
  const hemisphere = new THREE.HemisphereLight(0xfff4de, 0x63533f, 1.45);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xfff1d5, 2.65);
  keyLight.position.set(5.4, 8.5, 6.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1536, 1536);
  keyLight.shadow.camera.left = -5.2;
  keyLight.shadow.camera.right = 5.2;
  keyLight.shadow.camera.top = 5.5;
  keyLight.shadow.camera.bottom = -4.5;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xcdd9dd, 0.72);
  fillLight.position.set(-6, 4, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffd7a1, 0.58);
  rimLight.position.set(2, 2.5, -7);
  scene.add(rimLight);

  scene.traverse((object) => {
    if (object.isMesh && object !== floor) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  steamPieces.forEach((piece) => {
    piece.castShadow = false;
    piece.receiveShadow = false;
  });
  coffeeHighlight.castShadow = false;
  coffeeHighlight.receiveShadow = false;

  // View state
  let targetRotation = -0.04;
  let currentRotation = -0.04;
  let dragging = false;
  let lastPointerX = 0;
  let userInteracted = false;
  let paused = reduceMotionQuery.matches;
  let elapsed = 0;
  const clock = new THREE.Clock();
  let resizeObserver;

  function setPaused(nextPaused) {
    paused = nextPaused;
    if (pauseButton) {
      pauseButton.setAttribute("aria-pressed", String(paused));
      const label = paused ? "Resume ambient desk motion" : "Pause ambient desk motion";
      pauseButton.setAttribute("aria-label", label);
      pauseButton.title = label;
    }
  }

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const aspect = width / height;
    const viewSize = aspect < 1.23 ? 6.35 : 5.95;

    renderer.setSize(width, height, false);
    camera.left = -(viewSize * aspect) / 2;
    camera.right = (viewSize * aspect) / 2;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function turnBy(amount) {
    userInteracted = true;
    targetRotation = THREE.MathUtils.clamp(targetRotation + amount, -0.88, 0.72);
  }

  function resetView() {
    userInteracted = true;
    targetRotation = -0.04;
  }

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragging = true;
    userInteracted = true;
    lastPointerX = event.clientX;
    stage.classList.add("is-dragging");
    if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const delta = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    targetRotation = THREE.MathUtils.clamp(targetRotation + delta * 0.007, -0.88, 0.72);
  });

  function stopDragging(event) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (event && stage.releasePointerCapture && stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  }

  stage.addEventListener("pointerup", stopDragging);
  stage.addEventListener("pointercancel", stopDragging);
  stage.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && dragging) stopDragging(event);
  });

  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      turnBy(-0.22);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      turnBy(0.22);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetView();
    }
  });

  document.querySelectorAll("[data-desk]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.desk;
      if (action === "left") turnBy(-0.25);
      if (action === "right") turnBy(0.25);
      if (action === "reset") resetView();
      if (action === "pause") setPaused(!paused);
    });
  });

  reduceMotionQuery.addEventListener("change", (event) => {
    setPaused(event.matches);
    if (event.matches) {
      userInteracted = true;
      targetRotation = -0.04;
    }
  });

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden || stage.offsetParent === null) return;

    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;

    if (!paused) {
      if (!userInteracted && !dragging) {
        targetRotation = -0.04 + Math.sin(elapsed * 0.22) * 0.065;
      }

      steamPieces.forEach((piece) => {
        piece.position.y = 0.008 * Math.sin(elapsed * 0.9 + piece.userData.offset);
        piece.position.x = 0.006 * Math.sin(elapsed * 0.55 + piece.userData.offset);
      });

      leaves.forEach((leaf) => {
        leaf.rotation.z = leaf.userData.baseZ + Math.sin(elapsed * 0.44 + leaf.userData.phase) * 0.025;
      });

      lampLight.intensity = 3.4 + Math.sin(elapsed * 0.8) * 0.08;
    }

    currentRotation += (targetRotation - currentRotation) * Math.min(1, delta * 8.5);
    desk.rotation.y = currentRotation;
    renderer.render(scene, camera);
  }

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
  } else {
    window.addEventListener("resize", resize);
  }

  setPaused(reduceMotionQuery.matches);
  resize();
  stage.classList.add("is-ready");
  animate();
}
