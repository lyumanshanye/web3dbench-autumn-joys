import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.querySelector("#scene");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
camera.position.set(0, 0.35, 11.4);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment(renderer);
const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.02);
scene.environment = environmentTarget.texture;
roomEnvironment.dispose?.();
pmremGenerator.dispose();

const hemiLight = new THREE.HemisphereLight(0xb6c5ff, 0x07070a, 2.1);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff8ea, 4.6);
keyLight.position.set(-4.5, 6.5, 7);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x4364ff, 4.8);
fillLight.position.set(5, 1.5, 3.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xd8ff3e, 2.2);
rimLight.position.set(-5, -0.5, -4);
scene.add(rimLight);

const underLight = new THREE.PointLight(0x3151ff, 24, 14, 2);
underLight.position.set(1.8, -3.2, 2.5);
scene.add(underLight);

const acidMaterials = [];
const accentPointLights = [];
const ACCENT_COLORS = {
  acid: { hex: 0xd8ff3e, css: "#d8ff3e", rgb: "216, 255, 62" },
  cobalt: { hex: 0x3151ff, css: "#3151ff", rgb: "49, 81, 255" },
  blaze: { hex: 0xff5a36, css: "#ff5a36", rgb: "255, 90, 54" },
};

const materials = {
  shell: new THREE.MeshPhysicalMaterial({
    color: 0x151923,
    metalness: 0.74,
    roughness: 0.23,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.4,
  }),
  shellMid: new THREE.MeshPhysicalMaterial({
    color: 0x0e1118,
    metalness: 0.45,
    roughness: 0.34,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.2,
  }),
  graphite: new THREE.MeshStandardMaterial({
    color: 0x262b35,
    metalness: 0.9,
    roughness: 0.27,
    envMapIntensity: 1.45,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0xa3abb9,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.8,
  }),
  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x4d5562,
    metalness: 1,
    roughness: 0.25,
    envMapIntensity: 1.5,
  }),
  pad: new THREE.MeshStandardMaterial({
    color: 0x1a1718,
    metalness: 0.02,
    roughness: 0.94,
  }),
  padEdge: new THREE.MeshStandardMaterial({
    color: 0x33282a,
    metalness: 0.05,
    roughness: 0.76,
  }),
  face: new THREE.MeshPhysicalMaterial({
    color: 0x101522,
    metalness: 0.66,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.55,
  }),
  lime: new THREE.MeshPhysicalMaterial({
    color: 0xd8ff3e,
    emissive: 0x526b00,
    emissiveIntensity: 0.45,
    metalness: 0.34,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
  }),
  cobalt: new THREE.MeshPhysicalMaterial({
    color: 0x213cff,
    emissive: 0x07123e,
    emissiveIntensity: 0.3,
    metalness: 0.58,
    roughness: 0.23,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
  }),
};
acidMaterials.push(materials.lime);

const headphones = new THREE.Group();
const rig = new THREE.Group();
rig.add(headphones);
scene.add(rig);

function makeCylinder(radius, depth, material, segments = 64) {
  const geometry = new THREE.CylinderGeometry(radius, radius, depth, segments, 1, false);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

function makeTorus(radius, tube, material, segments = 96, radialSegments = 12) {
  return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSegments, segments), material);
}

function drawFaceLabel() {
  const size = 1024;
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = size;
  labelCanvas.height = size;
  const ctx = labelCanvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);

  ctx.strokeStyle = "rgba(242, 240, 229, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 460, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(242, 240, 229, 0.08)";
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 404 + ring * 17, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(-Math.PI / 2);
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    ctx.strokeStyle = long ? "rgba(216, 255, 62, 0.68)" : "rgba(242, 240, 229, 0.2)";
    ctx.lineWidth = long ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -438);
    ctx.lineTo(0, long ? -420 : -428);
    ctx.stroke();
    ctx.rotate(angle);
  }
  ctx.restore();

  ctx.fillStyle = "rgba(242, 240, 229, 0.47)";
  ctx.font = "500 17px Consolas, monospace";
  ctx.letterSpacing = "5px";
  ctx.textAlign = "center";
  ctx.fillText("PLANAR VELOCITY MOTOR", 0, -103);

  ctx.fillStyle = "#f2f0e6";
  ctx.font = "900 128px Arial Black, Helvetica, Arial, sans-serif";
  ctx.letterSpacing = "-7px";
  ctx.fillText("AURA", 4, 51);

  ctx.fillStyle = "#d8ff3e";
  ctx.font = "600 23px Consolas, monospace";
  ctx.letterSpacing = "7px";
  ctx.fillText("REFERENCE / 01", 0, 118);

  ctx.fillStyle = "rgba(242, 240, 229, 0.52)";
  ctx.font = "500 15px Consolas, monospace";
  ctx.letterSpacing = "4px";
  ctx.fillText("32Ω  //  104dB", 0, 163);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

const faceLabelTexture = drawFaceLabel();

function buildEarCup(side) {
  const cup = new THREE.Group();
  cup.position.set(side * 1.36, -0.53, 0);

  const body = makeCylinder(1.075, 0.5, materials.shell, 80);
  cup.add(body);

  const innerBevel = makeCylinder(1.02, 0.53, materials.graphite, 80);
  innerBevel.position.z = -0.02;
  innerBevel.scale.set(0.985, 0.985, 1);
  cup.add(innerBevel);

  const outerRim = makeTorus(1.066, 0.041, materials.steel, 112, 14);
  outerRim.position.z = 0.248;
  cup.add(outerRim);

  const innerRim = makeTorus(0.972, 0.014, materials.darkSteel, 112, 10);
  innerRim.position.z = 0.264;
  cup.add(innerRim);

  const face = new THREE.Mesh(new THREE.CircleGeometry(1.035, 96), materials.face);
  face.position.z = 0.255;
  cup.add(face);

  const faceAccent = makeTorus(0.755, 0.013, materials.lime, 96, 8);
  faceAccent.position.z = 0.266;
  cup.add(faceAccent);

  const hub = makeCylinder(0.355, 0.036, materials.cobalt, 56);
  hub.position.z = 0.275;
  cup.add(hub);

  const hubRing = makeTorus(0.39, 0.014, materials.steel, 64, 8);
  hubRing.position.z = 0.286;
  cup.add(hubRing);

  const hubCore = makeCylinder(0.21, 0.045, materials.graphite, 48);
  hubCore.position.z = 0.295;
  cup.add(hubCore);

  const label = new THREE.Mesh(
    new THREE.CircleGeometry(1.018, 96),
    new THREE.MeshBasicMaterial({
      map: faceLabelTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.96,
    }),
  );
  label.position.z = 0.324;
  cup.add(label);

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const screw = makeCylinder(0.035, 0.025, materials.darkSteel, 10);
    screw.position.set(Math.cos(angle) * 0.91, Math.sin(angle) * 0.91, 0.278);
    cup.add(screw);
  }

  const rearPlate = makeCylinder(0.97, 0.06, materials.shellMid, 72);
  rearPlate.position.z = -0.245;
  cup.add(rearPlate);

  const pad = makeTorus(0.79, 0.205, materials.pad, 84, 22);
  pad.position.z = -0.33;
  cup.add(pad);

  const padCrease = makeTorus(0.79, 0.012, materials.padEdge, 84, 8);
  padCrease.position.z = -0.515;
  cup.add(padCrease);

  const padInner = makeTorus(0.58, 0.095, materials.shellMid, 84, 16);
  padInner.position.z = -0.527;
  cup.add(padInner);

  const sideMarker = makeCylinder(0.148, 0.2, materials.darkSteel, 32);
  sideMarker.rotation.y = Math.PI / 2;
  sideMarker.position.set(side * 1.105, 0.29, 0);
  cup.add(sideMarker);

  const sidePin = makeCylinder(0.084, 0.218, materials.steel, 32);
  sidePin.rotation.y = Math.PI / 2;
  sidePin.position.set(side * 1.125, 0.29, 0);
  cup.add(sidePin);

  return cup;
}

headphones.add(buildEarCup(-1));
headphones.add(buildEarCup(1));

function createSweptBand(curve, width, depth, segments = 96, zOffset = 0) {
  const positions = [];
  const indices = [];
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();

    const corners = [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [halfWidth, halfDepth],
      [-halfWidth, halfDepth],
    ];

    for (const [offset, z] of corners) {
      positions.push(
        point.x + normal.x * offset,
        point.y + normal.y * offset,
        point.z + z + zOffset,
      );
    }
  }

  for (let i = 0; i < segments; i += 1) {
    const base = i * 4;
    const next = (i + 1) * 4;
    for (let side = 0; side < 4; side += 1) {
      const a = base + side;
      const b = base + ((side + 1) % 4);
      const c = next + side;
      const d = next + ((side + 1) % 4);
      indices.push(a, b, c, b, d, c);
    }
  }

  indices.push(0, 2, 1, 0, 3, 2);
  const end = segments * 4;
  indices.push(end, end + 1, end + 2, end, end + 2, end + 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

const bandCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-1.27, 1.27, 0),
    new THREE.Vector3(-1.29, 1.78, 0),
    new THREE.Vector3(-1.08, 2.35, 0),
    new THREE.Vector3(-0.62, 2.69, 0),
    new THREE.Vector3(0, 2.8, 0),
    new THREE.Vector3(0.62, 2.69, 0),
    new THREE.Vector3(1.08, 2.35, 0),
    new THREE.Vector3(1.29, 1.78, 0),
    new THREE.Vector3(1.27, 1.27, 0),
  ],
  false,
  "catmullrom",
  0.35,
);

const outerBand = new THREE.Mesh(
  createSweptBand(bandCurve, 0.35, 0.16, 120),
  new THREE.MeshPhysicalMaterial({
    color: 0x1b202b,
    metalness: 0.8,
    roughness: 0.24,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
  }),
);
headphones.add(outerBand);

const accentStripe = new THREE.Mesh(
  createSweptBand(bandCurve, 0.044, 0.009, 120, 0.085),
  materials.lime,
);
headphones.add(accentStripe);

const padCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-1.06, 1.56, -0.005),
    new THREE.Vector3(-1.07, 1.94, -0.005),
    new THREE.Vector3(-0.77, 2.38, -0.005),
    new THREE.Vector3(-0.35, 2.59, -0.005),
    new THREE.Vector3(0, 2.63, -0.005),
    new THREE.Vector3(0.35, 2.59, -0.005),
    new THREE.Vector3(0.77, 2.38, -0.005),
    new THREE.Vector3(1.07, 1.94, -0.005),
    new THREE.Vector3(1.06, 1.56, -0.005),
  ],
  false,
  "catmullrom",
  0.35,
);

const headbandPad = new THREE.Mesh(
  createSweptBand(padCurve, 0.31, 0.215, 120),
  materials.pad,
);
headbandPad.position.z = -0.07;
headphones.add(headbandPad);

function addYoke(side) {
  const yokeGroup = new THREE.Group();
  const zPositions = [0.105, -0.085];

  zPositions.forEach((z, index) => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(side * 1.245, 1.35, z),
        new THREE.Vector3(side * 1.55, 1.17, z),
        new THREE.Vector3(side * 1.91, 0.84, z),
        new THREE.Vector3(side * 2.22, 0.31, z),
        new THREE.Vector3(side * 2.38, -0.22, z),
      ],
      false,
      "catmullrom",
      0.35,
    );
    const arm = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, index === 0 ? 0.04 : 0.032, 10, false),
      index === 0 ? materials.steel : materials.darkSteel,
    );
    yokeGroup.add(arm);
  });

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.21, 0.29),
    materials.graphite,
  );
  cap.position.set(side * 1.245, 1.35, 0);
  cap.rotation.z = side * -0.08;
  yokeGroup.add(cap);

  const topPin = makeCylinder(0.067, 0.29, materials.steel, 24);
  topPin.rotation.y = Math.PI / 2;
  topPin.position.set(side * 1.245, 1.35, 0);
  yokeGroup.add(topPin);

  const pivot = makeCylinder(0.158, 0.21, materials.graphite, 32);
  pivot.rotation.y = Math.PI / 2;
  pivot.position.set(side * 2.38, -0.22, 0);
  yokeGroup.add(pivot);

  const pivotCap = makeCylinder(0.102, 0.23, materials.darkSteel, 32);
  pivotCap.rotation.y = Math.PI / 2;
  pivotCap.position.set(side * 2.39, -0.22, 0);
  yokeGroup.add(pivotCap);

  const pivotRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.012, 8, 40),
    materials.lime,
  );
  pivotRing.rotation.y = Math.PI / 2;
  pivotRing.position.set(side * 2.505, -0.22, 0);
  yokeGroup.add(pivotRing);

  headphones.add(yokeGroup);
}

addYoke(-1);
addYoke(1);

const halo = new THREE.Group();
halo.position.set(0, 0.15, -1.1);
rig.add(halo);

const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0xd8ff3e,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
  toneMapped: false,
});
const haloRing = new THREE.Mesh(new THREE.TorusGeometry(2.74, 0.0065, 6, 220), haloMaterial);
haloRing.scale.y = 1.06;
halo.add(haloRing);

const outerHaloMaterial = new THREE.MeshBasicMaterial({
  color: 0x6e88ff,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  toneMapped: false,
});
const outerHaloRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.98, 0.0035, 5, 220),
  outerHaloMaterial,
);
outerHaloRing.scale.y = 1.06;
halo.add(outerHaloRing);

function createTickRing(radius, count, material) {
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const longTick = i % 6 === 0;
    const inner = radius + (longTick ? 0.04 : 0.065);
    const outer = radius + 0.11;
    positions.push(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      0,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
      0,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, material);
}

const tickMaterial = new THREE.LineBasicMaterial({
  color: 0xcbd3dd,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});
const tickRing = createTickRing(2.88, 72, tickMaterial);
tickRing.scale.y = 1.06;
halo.add(tickRing);

const marker = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.032, 0),
  new THREE.MeshBasicMaterial({ color: 0xd8ff3e, toneMapped: false }),
);
marker.position.set(2.77, 0.58, 0);
halo.add(marker);

const haloGroupMaterials = [haloMaterial, outerHaloMaterial, tickMaterial];

function addDust() {
  const count = 150;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const acid = new THREE.Color(0xd8ff3e);
  const blue = new THREE.Color(0x6078ff);
  const pale = new THREE.Color(0xd9dfef);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = -2 - Math.random() * 6;
    const color = Math.random() > 0.82 ? acid : Math.random() > 0.25 ? blue : pale;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(geometry, material);
  scene.add(dust);
  return dust;
}

const dust = addDust();

function addGlowLight() {
  const light = new THREE.PointLight(0xd8ff3e, 18, 11, 2);
  light.position.set(-2.6, -1.4, 1.7);
  scene.add(light);
  accentPointLights.push(light);
}

addGlowLight();

const pointer = {
  down: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  dragY: 0,
  dragX: 0,
  parallaxX: 0,
  parallaxY: 0,
  velocityX: 0,
  velocityY: 0,
};

function onPointerDown(event) {
  pointer.down = true;
  pointer.startX = event.clientX;
  pointer.startY = event.clientY;
  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  pointer.parallaxX = (event.clientX / window.innerWidth - 0.5) * 0.11;
  pointer.parallaxY = (event.clientY / window.innerHeight - 0.5) * 0.07;

  if (!pointer.down) return;

  const dx = event.clientX - pointer.lastX;
  const dy = event.clientY - pointer.lastY;
  pointer.lastX = event.clientX;
  pointer.lastY = event.clientY;
  pointer.velocityX = dx * 0.0038;
  pointer.velocityY = dy * 0.0026;
  pointer.dragY += pointer.velocityX;
  pointer.dragX += pointer.velocityY;
  pointer.dragX = THREE.MathUtils.clamp(pointer.dragX, -0.34, 0.34);
}

function onPointerUp(event) {
  pointer.down = false;
  canvas.releasePointerCapture?.(event.pointerId);
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
window.addEventListener("pointermove", (event) => {
  if (pointer.down) return;
  pointer.parallaxX = (event.clientX / window.innerWidth - 0.5) * 0.11;
  pointer.parallaxY = (event.clientY / window.innerHeight - 0.5) * 0.07;
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.color;
    const color = ACCENT_COLORS[name];
    if (!color) return;

    document.documentElement.style.setProperty("--acid", color.css);
    document.documentElement.style.setProperty("--acid-rgb", color.rgb);

    acidMaterials.forEach((material) => {
      material.color.setHex(color.hex);
      material.emissive.setHex(color.hex);
      material.emissiveIntensity = 0.24;
    });
    haloMaterial.color.setHex(color.hex);
    marker.material.color.setHex(color.hex);
    accentPointLights.forEach((light) => light.color.setHex(color.hex));
    rimLight.color.setHex(color.hex);

    document.querySelectorAll(".swatch").forEach((swatch) => {
      swatch.classList.toggle("is-active", swatch === button);
    });
  });
});

let layout = {
  mobile: false,
  tablet: false,
};

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const mobile = width <= 720;
  const tablet = width > 720 && width <= 1080;
  layout = { mobile, tablet };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 2.2 : 2));
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.fov = 32;

  if (mobile) {
    camera.position.set(0, 0.35, 11.2);
    camera.lookAt(0, 0.35, 0);
    rig.position.set(0, -0.64, 0);
    rig.scale.setScalar(0.56);
    halo.position.set(0, 0.24, -1.35);
    halo.scale.set(0.94, 0.94, 0.94);
  } else if (tablet) {
    camera.position.set(0, 0.35, 11.2);
    camera.lookAt(0, 0.35, 0);
    rig.position.set(1.2, -0.22, 0);
    rig.scale.setScalar(0.74);
    halo.position.set(0, 0.15, -1.1);
    halo.scale.set(1, 1, 1);
  } else {
    camera.position.set(0, 0.35, 11.4);
    camera.lookAt(0, 0.35, 0);
    rig.position.set(2.05, -0.16, 0);
    rig.scale.setScalar(1);
    halo.position.set(0, 0.15, -1.1);
    halo.scale.set(1, 1, 1);
  }

  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
const startedAt = performance.now();
const baseRotationX = 0.02;
const baseRotationY = -0.19;
const baseRotationZ = -0.015;

if (new URLSearchParams(window.location.search).has("debug")) {
  window.__AURA_DEBUG__ = { THREE, scene, camera, rig, headphones, halo, renderer };
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const introProgress = prefersReducedMotion
    ? 1
    : THREE.MathUtils.clamp((performance.now() - startedAt - 150) / 1500, 0, 1);
  const easedIntro = 1 - Math.pow(1 - introProgress, 3);

  pointer.velocityX *= 0.92;
  pointer.velocityY *= 0.92;
  pointer.dragY += pointer.velocityX * (prefersReducedMotion ? 0 : 1);
  pointer.dragX += pointer.velocityY * (prefersReducedMotion ? 0 : 1);
  pointer.dragX = THREE.MathUtils.clamp(pointer.dragX, -0.34, 0.34);

  const idleY = Math.sin(elapsed * 0.36) * 0.045;
  const idleX = Math.sin(elapsed * 0.55) * 0.018;
  const idleZ = Math.sin(elapsed * 0.28) * 0.012;
  const introY = (1 - easedIntro) * -0.48;
  const introLift = (1 - easedIntro) * -0.28;

  headphones.rotation.y =
    baseRotationY + idleY + pointer.dragY + pointer.parallaxX * 0.75 + introY;
  headphones.rotation.x =
    baseRotationX + idleX + pointer.dragX + pointer.parallaxY * 0.55;
  headphones.rotation.z = baseRotationZ + idleZ;
  headphones.position.y = Math.sin(elapsed * 0.72) * 0.035 + introLift;

  halo.rotation.z = elapsed * 0.018;
  outerHaloRing.rotation.z = -elapsed * 0.012;
  marker.rotation.y = elapsed * 0.75;
  marker.rotation.x = elapsed * 0.36;

  dust.rotation.z = elapsed * 0.004;
  dust.position.y = Math.sin(elapsed * 0.12) * 0.1;
  underLight.intensity = 22 + Math.sin(elapsed * 0.8) * 5;

  renderer.render(scene, camera);
}

animate();
