import * as THREE from "three";

const canvas = document.querySelector("#product-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

const config = {
  scale: 1,
  x: 0.58,
  y: -0.02,
  rotationX: 0.025,
  rotationY: -0.3,
};

const pointer = new THREE.Vector2();
const smoothPointer = new THREE.Vector2();
const drag = {
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
  targetRotationX: 0,
  targetRotationY: 0,
  currentRotationX: 0,
  currentRotationY: 0,
  velocityX: 0,
  velocityY: 0,
};

let renderer;
let scene;
let camera;
let productRoot;
let headphone;
let haloGroup;
let productRing;
let productRingInner;
let cupGlowRings = [];
let introStart = 0;
let introEase = 0;
let scrollProgress = 0;
let cursorTargetX = 0;
let cursorTargetY = 0;
let cursorX = 0;
let cursorY = 0;
let cursorSeen = false;

const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");

document.fonts.ready.then(init).catch(init);

function init() {
  try {
    setupScene();
    layout();
    bindEvents();
    introStart = performance.now();
    renderer.render(scene, camera);
    requestAnimationFrame(() => canvas.classList.add("is-ready"));
    requestAnimationFrame(animate);
  } catch (error) {
    console.error("Unable to initialise the 3D product scene", error);
    document.body.classList.add("webgl-fallback");
  }
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1.3), 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 0, 9.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xe8efff, 0x11150b, 1.45));

  const keyLight = new THREE.DirectionalLight(0xfff4dc, 3.2);
  keyLight.position.set(4.5, 6.5, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xa5d6ff, 1.6);
  fillLight.position.set(-5, 2, 4);
  scene.add(fillLight);

  const limeLight = new THREE.PointLight(0xd0ff43, 35, 12, 2);
  limeLight.position.set(4.1, 1.7, 2.8);
  scene.add(limeLight);

  const emberLight = new THREE.PointLight(0xff572c, 29, 10, 2);
  emberLight.position.set(-4.2, -1.2, 3.2);
  scene.add(emberLight);

  createBackdrop();

  productRoot = new THREE.Group();
  productRoot.scale.setScalar(config.scale);
  productRoot.position.set(config.x, config.y, 0);
  scene.add(productRoot);

  haloGroup = createHalo();
  productRoot.add(haloGroup);

  headphone = createHeadphone();
  headphone.rotation.set(config.rotationX, config.rotationY, 0);
  productRoot.add(headphone);
}

function createBackdrop() {
  const particleCount = 110;
  const positions = new Float32Array(particleCount * 3);

  for (let index = 0; index < particleCount; index += 1) {
    const stride = index * 3;
    positions[stride] = (Math.random() - 0.5) * 11;
    positions[stride + 1] = (Math.random() - 0.5) * 7;
    positions[stride + 2] = -1.5 - Math.random() * 3.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xd0ff43,
    size: 0.022,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  particles.position.z = -1.4;
  scene.add(particles);
}

function createHalo() {
  const group = new THREE.Group();
  group.position.z = -1.15;

  const limeMaterial = new THREE.MeshBasicMaterial({
    color: 0xd0ff43,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    toneMapped: false,
  });

  productRing = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.008, 8, 260), limeMaterial);
  group.add(productRing);

  productRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(2.16, 0.0045, 6, 240),
    new THREE.MeshBasicMaterial({
      color: 0xefede4,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  group.add(productRingInner);

  const dashedPoints = [];
  const dashedRadius = 2.76;
  for (let index = 0; index <= 240; index += 1) {
    const angle = (index / 240) * Math.PI * 2;
    dashedPoints.push(new THREE.Vector3(Math.cos(angle) * dashedRadius, Math.sin(angle) * dashedRadius, 0));
  }
  const dashedGeometry = new THREE.BufferGeometry().setFromPoints(dashedPoints);
  const dashedMaterial = new THREE.LineDashedMaterial({
    color: 0xefede4,
    transparent: true,
    opacity: 0.24,
    dashSize: 0.018,
    gapSize: 0.105,
    depthWrite: false,
  });
  const dashedRing = new THREE.Line(dashedGeometry, dashedMaterial);
  dashedRing.computeLineDistances();
  group.add(dashedRing);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(index === 0 ? 0.12 : 0.045, 0.012, 0.012),
      new THREE.MeshBasicMaterial({
        color: index === 0 ? 0xff572c : 0xefede4,
        transparent: true,
        opacity: index === 0 ? 0.8 : 0.3,
        toneMapped: false,
      }),
    );
    marker.position.set(Math.cos(angle) * 2.9, Math.sin(angle) * 2.9, 0);
    marker.rotation.z = angle;
    group.add(marker);
  }

  return group;
}

function createHeadphone() {
  const group = new THREE.Group();

  const materials = {
    shell: new THREE.MeshPhongMaterial({
      color: 0x0e100e,
      specular: 0x686d60,
      shininess: 72,
    }),
    graphite: new THREE.MeshPhongMaterial({
      color: 0x262824,
      specular: 0x8c9084,
      shininess: 58,
    }),
    titanium: new THREE.MeshPhongMaterial({
      color: 0x9c9e98,
      specular: 0xffffff,
      shininess: 145,
    }),
    darkMetal: new THREE.MeshPhongMaterial({
      color: 0x42453f,
      specular: 0xc0c5b6,
      shininess: 104,
    }),
    fabric: new THREE.MeshLambertMaterial({ color: 0x171815 }),
    pad: new THREE.MeshLambertMaterial({ color: 0x24241f }),
    lime: new THREE.MeshPhongMaterial({
      color: 0xd0ff43,
      specular: 0xffffff,
      shininess: 90,
      emissive: 0x668400,
      emissiveIntensity: 0.72,
    }),
    ember: new THREE.MeshPhongMaterial({
      color: 0xff572c,
      specular: 0xffb89f,
      shininess: 78,
      emissive: 0x541200,
      emissiveIntensity: 0.65,
    }),
  };

  const band = createHeadband(materials);
  group.add(band);

  group.add(createEarcup(-1, materials));
  group.add(createEarcup(1, materials));
  group.add(createYoke(-1, materials));
  group.add(createYoke(1, materials));

  const leftPort = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.075, 24), materials.titanium);
  leftPort.rotation.z = Math.PI / 2;
  leftPort.position.set(-2.32, -1.29, 0);
  group.add(leftPort);

  const portInset = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 20), materials.ember);
  portInset.rotation.z = Math.PI / 2;
  portInset.position.set(-2.335, -1.29, 0);
  group.add(portInset);

  return group;
}

function createHeadband(materials) {
  const group = new THREE.Group();
  const controlPoints = [
    new THREE.Vector3(-1.55, -0.04, 0),
    new THREE.Vector3(-1.73, 0.62, 0),
    new THREE.Vector3(-1.41, 1.5, 0),
    new THREE.Vector3(-0.72, 1.97, 0),
    new THREE.Vector3(0, 2.05, 0),
    new THREE.Vector3(0.72, 1.97, 0),
    new THREE.Vector3(1.41, 1.5, 0),
    new THREE.Vector3(1.73, 0.62, 0),
    new THREE.Vector3(1.55, -0.04, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "catmullrom", 0.26);
  const samples = sampleCurve(curve, 150);

  const shellShape = createRibbonShape(samples, 0.145, -0.16);
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
    depth: 0.115,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.022,
    bevelThickness: 0.022,
    curveSegments: 1,
  });
  shellGeometry.translate(0, 0, -0.0575);
  const shell = new THREE.Mesh(shellGeometry, materials.graphite);
  group.add(shell);

  const padShape = createRibbonShape(samples, 0.012, -0.19);
  const padGeometry = new THREE.ExtrudeGeometry(padShape, {
    depth: 0.17,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.032,
    bevelThickness: 0.032,
    curveSegments: 1,
  });
  padGeometry.translate(0, 0, -0.085);
  const pad = new THREE.Mesh(padGeometry, materials.fabric);
  group.add(pad);

  const outerRailPoints = samples.map(({ point, normal }) =>
    new THREE.Vector3(point.x + normal.x * 0.163, point.y + normal.y * 0.163, 0.066),
  );
  const outerRail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerRailPoints), 220, 0.018, 7, false),
    materials.titanium,
  );
  group.add(outerRail);

  const innerRailPoints = samples.map(({ point, normal }) =>
    new THREE.Vector3(point.x - normal.x * 0.207, point.y - normal.y * 0.207, 0.078),
  );
  const innerRail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRailPoints), 220, 0.009, 6, false),
    materials.lime,
  );
  group.add(innerRail);

  const padSeamPoints = samples.map(({ point, normal }) =>
    new THREE.Vector3(point.x - normal.x * 0.024, point.y - normal.y * 0.024, 0.111),
  );
  const padSeam = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(padSeamPoints), 190, 0.0055, 5, false),
    materials.titanium,
  );
  group.add(padSeam);

  return group;
}

function sampleCurve(curve, count) {
  const samples = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    samples.push({
      point,
      normal: new THREE.Vector2(-tangent.y, tangent.x).normalize(),
    });
  }
  return samples;
}

function createRibbonShape(samples, outerOffset, innerOffset) {
  const outer = samples.map(({ point, normal }) => new THREE.Vector2(
    point.x + normal.x * outerOffset,
    point.y + normal.y * outerOffset,
  ));
  const inner = samples.map(({ point, normal }) => new THREE.Vector2(
    point.x + normal.x * innerOffset,
    point.y + normal.y * innerOffset,
  ));

  const shape = new THREE.Shape();
  shape.moveTo(outer[0].x, outer[0].y);
  for (let index = 1; index < outer.length; index += 1) {
    shape.lineTo(outer[index].x, outer[index].y);
  }
  for (let index = inner.length - 1; index >= 0; index -= 1) {
    shape.lineTo(inner[index].x, inner[index].y);
  }
  shape.closePath();
  return shape;
}

function createEarcup(side, materials) {
  const group = new THREE.Group();
  group.position.set(side * 1.55, -0.88, 0);
  group.rotation.y = side * -0.025;

  const backCushion = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.155, 28, 100), materials.pad);
  backCushion.position.z = -0.36;
  group.add(backCushion);

  const cushionCore = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.15, 96), materials.fabric);
  cushionCore.rotation.x = Math.PI / 2;
  cushionCore.position.z = -0.36;
  group.add(cushionCore);

  const cushionSeam = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.011, 7, 100), materials.graphite);
  cushionSeam.position.z = -0.215;
  group.add(cushionSeam);

  const outerShell = new THREE.Mesh(new THREE.CylinderGeometry(0.955, 0.94, 0.48, 100), materials.shell);
  outerShell.rotation.x = Math.PI / 2;
  outerShell.position.z = -0.02;
  group.add(outerShell);

  const rearRing = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.035, 12, 100), materials.darkMetal);
  rearRing.position.z = -0.24;
  group.add(rearRing);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.057, 18, 110), materials.titanium);
  rim.position.z = 0.235;
  group.add(rim);

  const facePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.845, 0.855, 0.105, 100), materials.shell);
  facePlate.rotation.x = Math.PI / 2;
  facePlate.position.z = 0.255;
  group.add(facePlate);

  const emberRing = new THREE.Mesh(new THREE.TorusGeometry(0.845, 0.009, 7, 110), materials.ember);
  emberRing.position.z = 0.314;
  group.add(emberRing);

  const grille = new THREE.Mesh(
    new THREE.CircleGeometry(0.635, 128),
    new THREE.MeshPhongMaterial({
      map: makeGrilleTexture(),
      color: 0xffffff,
      specular: 0x8b9380,
      shininess: 52,
    }),
  );
  grille.position.z = 0.316;
  group.add(grille);

  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.705, 0.0145, 8, 128), materials.lime);
  glowRing.position.z = 0.326;
  group.add(glowRing);
  cupGlowRings.push(glowRing);

  const innerMetalRing = new THREE.Mesh(new THREE.TorusGeometry(0.615, 0.016, 8, 128), materials.darkMetal);
  innerMetalRing.position.z = 0.33;
  group.add(innerMetalRing);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.41, 0.41),
    new THREE.MeshBasicMaterial({
      map: makeBadgeTexture(side === 1 ? "01" : "A"),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  badge.position.z = 0.335;
  group.add(badge);

  const hingePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.16, 0.22, 28), materials.darkMetal);
  hingePlate.rotation.x = Math.PI / 2;
  hingePlate.position.set(side * 0.06, 0.93, 0);
  group.add(hingePlate);

  const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.26, 20), materials.titanium);
  hingePin.rotation.x = Math.PI / 2;
  hingePin.position.set(side * 0.06, 0.93, 0.02);
  group.add(hingePin);

  const sideTick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.022), materials.ember);
  sideTick.position.set(side * 0.72, -0.57, 0.332);
  sideTick.rotation.z = side * 0.34;
  group.add(sideTick);

  return group;
}

function createYoke(side, materials) {
  const group = new THREE.Group();
  const x = side * 1.55;

  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.088, 0.38, 20), materials.titanium);
  hanger.position.set(x, 0.27, 0);
  group.add(hanger);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.095, 24), materials.graphite);
  collar.position.set(x, 0.12, 0);
  group.add(collar);

  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 32), materials.darkMetal);
  pivot.rotation.x = Math.PI / 2;
  pivot.position.set(x, 0.04, 0);
  group.add(pivot);

  const pivotCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.27, 24), materials.titanium);
  pivotCap.rotation.x = Math.PI / 2;
  pivotCap.position.set(x, 0.04, 0.01);
  group.add(pivotCap);

  const pivotAccent = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.009, 6, 48), materials.lime);
  pivotAccent.position.set(x, 0.04, 0.138);
  group.add(pivotAccent);

  return group;
}

function makeGrilleTexture() {
  const size = 1024;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  const center = size / 2;

  context.fillStyle = "#060706";
  context.fillRect(0, 0, size, size);

  const wash = context.createRadialGradient(center, center, 20, center, center, center);
  wash.addColorStop(0, "rgba(72, 77, 61, 0.42)");
  wash.addColorStop(0.5, "rgba(32, 35, 27, 0.34)");
  wash.addColorStop(1, "rgba(4, 5, 4, 0.9)");
  context.fillStyle = wash;
  context.fillRect(0, 0, size, size);

  context.save();
  context.translate(center, center);

  for (let radius = 34; radius < 500; radius += 18) {
    context.beginPath();
    context.strokeStyle = `rgba(183, 195, 155, ${0.08 + (radius / 500) * 0.12})`;
    context.lineWidth = 1.1;
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = 0; index < 84; index += 1) {
    const angle = (index / 84) * Math.PI * 2;
    context.beginPath();
    context.strokeStyle = "rgba(185, 196, 157, 0.11)";
    context.lineWidth = 1;
    context.moveTo(Math.cos(angle) * 28, Math.sin(angle) * 28);
    context.lineTo(Math.cos(angle) * 500, Math.sin(angle) * 500);
    context.stroke();
  }

  for (let radius = 34; radius < 492; radius += 15) {
    const count = Math.max(8, Math.round(radius / 5.2));
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + radius * 0.023;
      const dotRadius = 1.35 + (radius / 500) * 1.8;
      context.beginPath();
      context.fillStyle = `rgba(207, 218, 178, ${0.16 + (radius / 500) * 0.25})`;
      context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, dotRadius, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function makeBadgeTexture(label) {
  const size = 512;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.strokeStyle = "rgba(208, 255, 67, 0.72)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(size / 2, size / 2, 226, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#efede4";
  context.font = "700 25px Arial, sans-serif";
  context.letterSpacing = "7px";
  context.fillText("AURAL", size / 2, 174);

  context.fillStyle = "#d0ff43";
  context.font = "700 142px Arial, sans-serif";
  context.fillText(label, size / 2, 274);

  context.fillStyle = "rgba(239, 237, 228, 0.58)";
  context.font = "400 18px Arial, sans-serif";
  context.fillText("REFERENCE", size / 2, 354);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function layout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  if (aspect < 0.78) {
    config.scale = THREE.MathUtils.clamp(width / 840, 0.43, 0.58);
    config.x = 0;
    config.y = 0.84;
    config.rotationX = 0.018;
    config.rotationY = -0.245;
  } else if (aspect < 1.15) {
    config.scale = THREE.MathUtils.clamp(width / 1080, 0.68, 0.94);
    config.x = 0.16;
    config.y = 0.2;
    config.rotationX = 0.02;
    config.rotationY = -0.27;
  } else {
    const widthScale = THREE.MathUtils.clamp(width / 1440, 0.84, 1.25);
    const heightScale = THREE.MathUtils.clamp(height / 900, 0.82, 1.08);
    config.scale = widthScale * heightScale * 0.96;
    config.x = width > 1700 ? 0.8 : 0.58;
    config.y = -0.04;
    config.rotationX = 0.025;
    config.rotationY = -0.3;
  }

  productRoot.scale.setScalar(config.scale);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1.3), 1.6));
}

function bindEvents() {
  window.addEventListener("resize", layout, { passive: true });
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("dragstart", (event) => event.preventDefault());

  if (!coarsePointer) {
    window.addEventListener("pointermove", updateCursor, { passive: true });
    animateCursor();
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", () => {
      document.body.classList.remove("is-dragging");
      drag.active = false;
    });
  });
}

function updateScrollProgress() {
  scrollProgress = THREE.MathUtils.clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 1);
}

function onPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  drag.active = true;
  drag.pointerId = event.pointerId;
  drag.x = event.clientX;
  drag.y = event.clientY;
  drag.velocityX = 0;
  drag.velocityY = 0;
  document.body.classList.add("is-dragging");
  if (canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture can fail when the browser has already cancelled the gesture.
    }
  }
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (event.clientY / window.innerHeight) * 2 - 1;

  if (!drag.active || event.pointerId !== drag.pointerId) return;

  const deltaX = event.clientX - drag.x;
  const deltaY = event.clientY - drag.y;
  drag.x = event.clientX;
  drag.y = event.clientY;
  drag.targetRotationY += deltaX * 0.008;
  drag.targetRotationX = THREE.MathUtils.clamp(drag.targetRotationX + deltaY * 0.0045, -0.34, 0.34);
  drag.velocityX = deltaX * 0.00085;
  drag.velocityY = deltaY * 0.0004;
}

function onPointerUp(event) {
  if (event.pointerId !== drag.pointerId) return;
  drag.active = false;
  drag.pointerId = null;
  document.body.classList.remove("is-dragging");
}

function updateCursor(event) {
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  if (!cursorSeen) {
    cursorX = cursorTargetX;
    cursorY = cursorTargetY;
    cursorSeen = true;
    document.body.classList.add("has-pointer");
  }
  cursorDot.style.transform = `translate3d(${cursorTargetX}px, ${cursorTargetY}px, 0) translate(-50%, -50%)`;
}

function animateCursor() {
  if (!coarsePointer) {
    cursorX += (cursorTargetX - cursorX) * 0.16;
    cursorY += (cursorTargetY - cursorY) * 0.16;
    cursorRing.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  }
}

function animate(time) {
  const elapsed = time * 0.001;
  const delta = Math.min(clockDelta(), 0.05);

  introEase = reduceMotion ? 1 : THREE.MathUtils.clamp((performance.now() - introStart) / 1900, 0, 1);
  const easedIntro = 1 - Math.pow(1 - introEase, 4);

  smoothPointer.x += (pointer.x - smoothPointer.x) * 0.045;
  smoothPointer.y += (pointer.y - smoothPointer.y) * 0.045;

  if (!drag.active) {
    drag.targetRotationY += drag.velocityX;
    drag.targetRotationX = THREE.MathUtils.clamp(drag.targetRotationX + drag.velocityY, -0.34, 0.34);
    drag.velocityX *= 0.93;
    drag.velocityY *= 0.9;
  }

  drag.currentRotationY += (drag.targetRotationY - drag.currentRotationY) * 0.075;
  drag.currentRotationX += (drag.targetRotationX - drag.currentRotationX) * 0.075;

  const idleTurn = reduceMotion ? 0 : Math.sin(elapsed * 0.3) * 0.042;
  const idleTilt = reduceMotion ? 0 : Math.sin(elapsed * 0.42 + 1.2) * 0.012;
  const introTurn = (1 - easedIntro) * -0.72;

  headphone.rotation.y = config.rotationY + drag.currentRotationY + smoothPointer.x * 0.055 + idleTurn + introTurn;
  headphone.rotation.x = config.rotationX + drag.currentRotationX - smoothPointer.y * 0.028 + idleTilt;
  headphone.rotation.z = reduceMotion ? 0 : Math.sin(elapsed * 0.22) * 0.008;
  headphone.position.y = (reduceMotion ? 0 : Math.sin(elapsed * 0.78) * 0.027) + (1 - easedIntro) * -0.46;

  productRoot.position.x = config.x - scrollProgress * 0.34;
  productRoot.position.y = config.y + scrollProgress * 0.16;
  productRoot.scale.setScalar(config.scale * (0.91 + easedIntro * 0.09));

  haloGroup.rotation.z = elapsed * 0.022;
  productRingInner.rotation.z = -elapsed * 0.035;
  productRing.material.opacity = 0.29 + Math.sin(elapsed * 0.75) * 0.08;
  productRingInner.material.opacity = 0.17 + Math.sin(elapsed * 0.6 + 1.3) * 0.045;
  cupGlowRings.forEach((ring, index) => {
    ring.material.emissiveIntensity = 0.62 + Math.sin(elapsed * 1.05 + index * Math.PI) * 0.16;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = new THREE.Clock();
function clockDelta() {
  return clock.getDelta();
}
