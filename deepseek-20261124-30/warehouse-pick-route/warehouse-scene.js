import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import {
  WAREHOUSE,
  PRODUCTS,
  BLOCK_SEGMENTS,
  PACKING_POINT,
  getBinPosition,
  getBlockedSegment,
} from "./route-planner.js";

const YAW_EPSILON = 0.0001;
const ROUTE_Y = 0.145;
const STOP_Y = 0.092;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(canvas, anisotropy = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function makeLabelTexture(main, sub, accent = "#ef6a3a", selected = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = selected ? 176 : 128;
  const ctx = canvas.getContext("2d");
  const height = canvas.height;
  ctx.fillStyle = selected ? "#f8f5ec" : "#1a3037";
  roundedRect(ctx, 2, 2, 508, height - 4, 18);
  ctx.fill();
  ctx.strokeStyle = selected ? "#d0c8b7" : "rgba(255,255,255,.18)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = accent;
  roundedRect(ctx, 0, 0, selected ? 17 : 13, height, 8);
  ctx.fill();
  if (selected) {
    ctx.fillStyle = "#172b32";
    ctx.font = "800 65px ui-monospace, monospace";
    ctx.fillText(main, 42, 77);
    ctx.fillStyle = "#6e7978";
    ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText(sub.toUpperCase(), 43, 125);
    ctx.fillStyle = accent;
    ctx.font = "800 24px ui-monospace, monospace";
    ctx.fillText("PICK", 512 - 92, 54);
    ctx.beginPath();
    ctx.arc(512 - 37, 46, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#edf3f1";
    ctx.font = "700 51px ui-monospace, monospace";
    ctx.fillText(main, 37, 79);
    ctx.fillStyle = "#8ca7aa";
    ctx.font = "600 25px system-ui, sans-serif";
    ctx.fillText(sub.toUpperCase(), 39, 111);
  }
  return makeCanvasTexture(canvas, 8);
}

function makeFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const random = seededRandom(1193);
  ctx.fillStyle = "#d8d5cc";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i += 1) {
    const shade = Math.floor(190 + random() * 45);
    const alpha = 0.02 + random() * 0.065;
    ctx.fillStyle = `rgba(${shade},${shade},${shade - 4},${alpha})`;
    const size = random() > 0.94 ? 2 : 1;
    ctx.fillRect(random() * 512, random() * 512, size, size);
  }
  for (let i = 0; i < 9; i += 1) {
    ctx.strokeStyle = `rgba(95,102,99,${0.03 + random() * 0.035})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    let x = random() * 512;
    let y = random() * 512;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j += 1) {
      x += (random() - 0.5) * 55;
      y += (random() - 0.5) * 55;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(100,105,101,.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();
  const texture = makeCanvasTexture(canvas, 8);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 5);
  return texture;
}

function makeHazardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ef6a3a";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#21333a";
  for (let x = -128; x < 384; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 32, 128);
    ctx.lineTo(x + 96, 0);
    ctx.lineTo(x + 64, 0);
    ctx.closePath();
    ctx.fill();
  }
  const texture = makeCanvasTexture(canvas, 8);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeFloorDecal(title, subtitle, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.color || "rgba(43,63,67,.70)";
  ctx.font = "800 150px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, 512, 170);
  ctx.fillStyle = options.subColor || "rgba(47,68,72,.48)";
  ctx.font = "700 42px ui-monospace, monospace";
  ctx.letterSpacing = "8px";
  ctx.fillText(subtitle, 512, 240);
  const texture = makeCanvasTexture(canvas, 8);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: options.opacity ?? 0.88,
    side: THREE.DoubleSide,
  });
  const width = options.width || 7.2;
  const height = width * 0.3125;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = options.rotation || 0;
  mesh.position.set(options.x || 0, 0.078, options.z || 0);
  mesh.renderOrder = 2;
  return mesh;
}

function makeSpriteLabel(text, background = "#d5512b", color = "#fff8ef") {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 116;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  roundedRect(ctx, 3, 3, 414, 110, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.36)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "800 46px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 210, 61);
  const texture = makeCanvasTexture(canvas, 8);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.5, 0.415, 1);
  return sprite;
}

function addBox(parent, material, size, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;
  parent.add(mesh);
  return mesh;
}

function createProductModel(product) {
  const group = new THREE.Group();
  const accent = new THREE.MeshStandardMaterial({ color: product.color, roughness: 0.55, metalness: 0.08 });
  const accentDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(product.color).multiplyScalar(0.7),
    roughness: 0.62,
  });
  const cream = new THREE.MeshStandardMaterial({ color: "#e9dfcb", roughness: 0.72 });
  const paper = new THREE.MeshStandardMaterial({ color: "#f6f0df", roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: "#24363c", roughness: 0.5 });

  if (product.id === "nb01") {
    for (let i = 0; i < 3; i += 1) {
      const notebook = addBox(group, i === 2 ? accent : accentDark, [0.58, 0.075, 0.41], [0, 0.04 + i * 0.078, 0], {
        rotationY: -0.08 + i * 0.04,
      });
      notebook.castShadow = true;
      addBox(group, paper, [0.54, 0.061, 0.38], [0.005, 0.043 + i * 0.078, 0], {
        rotationY: -0.08 + i * 0.04,
        castShadow: false,
      });
      notebook.position.x = -0.007;
    }
    addBox(group, cream, [0.08, 0.012, 0.14], [0.2, 0.285, 0.02], { castShadow: false });
  } else if (product.id === "pn02") {
    for (let i = 0; i < 2; i += 1) {
      const box = addBox(group, i ? accentDark : dark, [0.59, 0.13, 0.3], [0, 0.075 + i * 0.14, 0]);
      addBox(group, cream, [0.18, 0.015, 0.11], [-0.12, 0.145 + i * 0.14, 0.02], { castShadow: false });
      addBox(group, accent, [0.07, 0.05, 0.12], [0.12, 0.16 + i * 0.14, 0.02], { castShadow: false });
      box.rotation.y = i ? 0.05 : -0.04;
    }
  } else if (product.id === "tp03") {
    for (let i = 0; i < 3; i += 1) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.075, 28), i === 2 ? accent : cream);
      roll.rotation.x = Math.PI / 2;
      roll.position.set(i === 1 ? 0.29 : 0, 0.2 + (i === 2 ? 0.15 : 0), i === 0 ? -0.12 : 0.08);
      roll.castShadow = true;
      group.add(roll);
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.018, 8, 24), dark);
      hole.rotation.x = Math.PI / 2;
      hole.position.copy(roll.position);
      hole.position.z += 0.044;
      group.add(hole);
    }
  } else if (product.id === "mg04") {
    const colors = ["#e4dac6", product.color];
    colors.forEach((color, index) => {
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.14, 0.22, 28),
        new THREE.MeshStandardMaterial({ color, roughness: 0.34 }),
      );
      mug.position.set(index ? 0.22 : -0.18, 0.19, index ? 0.02 : -0.03);
      mug.castShadow = true;
      group.add(mug);
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.025, 8, 20, Math.PI * 1.55),
        mug.material,
      );
      handle.rotation.x = Math.PI / 2;
      handle.rotation.z = -0.7;
      handle.position.copy(mug.position);
      handle.position.x += index ? 0.15 : 0.15;
      group.add(handle);
    });
  } else if (product.id === "fl05") {
    for (let i = 0; i < 4; i += 1) {
      const folder = addBox(group, i % 2 ? accent : accentDark, [0.49, 0.045, 0.33], [-0.05 + i * 0.06, 0.04 + i * 0.052, 0], {
        rotationY: -0.06 + i * 0.025,
      });
      folder.rotation.z = i === 3 ? 0.06 : 0;
    }
    addBox(group, cream, [0.18, 0.012, 0.08], [0.08, 0.275, 0.03], { castShadow: false });
  } else if (product.id === "bx06") {
    addBox(group, accentDark, [0.58, 0.4, 0.44], [0, 0.21, 0]);
    addBox(group, cream, [0.07, 0.415, 0.455], [0, 0.215, 0], { castShadow: false });
    addBox(group, cream, [0.59, 0.415, 0.065], [0, 0.215, 0], { castShadow: false });
    const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.07, 0.018, 35, 6, 2, 3), cream);
    bow.position.set(0, 0.45, 0);
    bow.scale.set(1.4, 0.55, 1);
    group.add(bow);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function createPicker() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: "#b97e5d", roughness: 0.78 });
  const shirt = new THREE.MeshStandardMaterial({ color: "#e7e2d6", roughness: 0.78 });
  const vest = new THREE.MeshStandardMaterial({ color: "#f0b745", roughness: 0.62, emissive: "#3c2805", emissiveIntensity: 0.12 });
  const pants = new THREE.MeshStandardMaterial({ color: "#263c45", roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: "#14272e", roughness: 0.5 });
  const orange = new THREE.MeshStandardMaterial({ color: "#ef6a3a", roughness: 0.58 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.48, 6, 12), shirt);
  torso.position.y = 1.13;
  torso.scale.set(1.05, 1, 0.72);
  group.add(torso);

  const vestShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.255, 0.42, 6, 12), vest);
  vestShell.position.set(0, 1.14, -0.005);
  vestShell.scale.set(1.05, 1, 0.76);
  group.add(vestShell);
  addBox(group, vest, [0.55, 0.055, 0.4], [0, 1.0, 0], { castShadow: false });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 24, 18), skin);
  head.position.y = 1.68;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.181, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), orange);
  cap.position.y = 1.73;
  group.add(cap);
  const brim = addBox(group, orange, [0.23, 0.035, 0.16], [0, 1.73, 0.14]);
  brim.rotation.x = -0.1;
  addBox(group, dark, [0.19, 0.055, 0.08], [0, 1.64, 0.143], { castShadow: false });

  const legPivots = [];
  [-0.12, 0.12].forEach((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.67, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.46, 4, 8), pants);
    leg.position.y = -0.27;
    pivot.add(leg);
    const shoe = addBox(pivot, dark, [0.16, 0.12, 0.28], [0, -0.56, 0.045]);
    shoe.castShadow = true;
    group.add(pivot);
    legPivots.push(pivot);
  });

  const armPivots = [];
  [-0.28, 0.28].forEach((x, index) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.36, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.42, 4, 8), skin);
    arm.position.y = -0.24;
    pivot.add(arm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 8), shirt);
    cuff.position.y = -0.01;
    pivot.add(cuff);
    group.add(pivot);
    armPivots.push(pivot);
    if (index === 1) {
      const scanner = addBox(pivot, dark, [0.12, 0.17, 0.07], [0, -0.51, 0.03]);
      scanner.rotation.x = 0.18;
      addBox(pivot, new THREE.MeshStandardMaterial({ color: "#39d6dc", emissive: "#1ec8c8", emissiveIntensity: 1.8 }), [0.07, 0.045, 0.01], [0, -0.48, 0.069], { castShadow: false });
    }
  });

  const tote = new THREE.Group();
  tote.position.set(0.41, 0.88, 0.08);
  const toteBody = addBox(tote, new THREE.MeshStandardMaterial({ color: "#237d78", roughness: 0.68 }), [0.34, 0.24, 0.27], [0, 0, 0]);
  const toteRim = addBox(tote, dark, [0.36, 0.035, 0.29], [0, 0.13, 0]);
  tote.rotation.z = -0.06;
  group.add(tote);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 28),
    new THREE.MeshBasicMaterial({ color: "#17292d", transparent: true, opacity: 0.2, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  group.add(shadow);

  group.traverse((child) => {
    if (child.isMesh && child !== shadow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  group.userData = {
    legPivots,
    armPivots,
    torso,
    vestShell,
    tote,
    toteRim,
    shadow,
  };
  return group;
}

export function createWarehouseWorld(canvas, viewport) {
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#cbd5d1");
  scene.fog = new THREE.Fog("#cbd5d1", 52, 92);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minDistance = 18;
  controls.maxDistance = 72;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI * 0.465;
  controls.target.set(0, 0.3, 0.25);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const floorTexture = makeFloorTexture();
  floorTexture.anisotropy = anisotropy;
  const hazardTexture = makeHazardTexture();
  hazardTexture.anisotropy = anisotropy;

  const materials = {
    floor: new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.92, metalness: 0 }),
    outside: new THREE.MeshStandardMaterial({ color: "#aebbb5", roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: "#35474d", metalness: 0.54, roughness: 0.42 }),
    steelLight: new THREE.MeshStandardMaterial({ color: "#536a70", metalness: 0.42, roughness: 0.48 }),
    beam: new THREE.MeshStandardMaterial({ color: "#d18d3a", metalness: 0.35, roughness: 0.5 }),
    shelf: new THREE.MeshStandardMaterial({ color: "#8b8373", roughness: 0.8 }),
    shelfEdge: new THREE.MeshStandardMaterial({ color: "#c5b99f", roughness: 0.74 }),
    cardboard: new THREE.MeshStandardMaterial({ color: "#b9986a", roughness: 0.9 }),
    cardboardLight: new THREE.MeshStandardMaterial({ color: "#cbb18a", roughness: 0.88 }),
    tote: new THREE.MeshStandardMaterial({ color: "#56757a", roughness: 0.64 }),
    toteBlue: new THREE.MeshStandardMaterial({ color: "#426a7e", roughness: 0.62 }),
    safety: new THREE.MeshStandardMaterial({ color: "#e4b23f", roughness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: "#172a30", roughness: 0.62 }),
    white: new THREE.MeshStandardMaterial({ color: "#ece7d9", roughness: 0.72 }),
    orange: new THREE.MeshStandardMaterial({ color: "#ef6a3a", roughness: 0.55 }),
  };

  scene.add(new THREE.HemisphereLight("#f4f7f1", "#657a78", 1.55));
  const keyLight = new THREE.DirectionalLight("#fff3dc", 3.1);
  keyLight.position.set(-13, 28, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 65;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.03;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight("#d6eff2", 1.15);
  fillLight.position.set(16, 13, -14);
  scene.add(fillLight);
  const warmFill = new THREE.DirectionalLight("#ffc58c", 0.55);
  warmFill.position.set(-12, 7, -10);
  scene.add(warmFill);

  const outside = new THREE.Mesh(new THREE.PlaneGeometry(80, 64), materials.outside);
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.075;
  outside.receiveShadow = true;
  scene.add(outside);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 18), materials.floor);
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  const curbMaterial = new THREE.MeshStandardMaterial({ color: "#c2c3b9", roughness: 0.8 });
  addBox(scene, curbMaterial, [24.08, 0.16, 0.18], [0, 0.06, -8.95], { castShadow: false });
  addBox(scene, curbMaterial, [24.08, 0.16, 0.18], [0, 0.06, 8.95], { castShadow: false });
  addBox(scene, curbMaterial, [0.18, 0.16, 18.08], [-11.95, 0.06, 0], { castShadow: false });
  addBox(scene, curbMaterial, [0.18, 0.16, 18.08], [11.95, 0.06, 0], { castShadow: false });

  const perimeterPosts = [
    [-11.9, -8.9],
    [11.9, -8.9],
    [-11.9, 8.9],
    [11.9, 8.9],
  ];
  perimeterPosts.forEach(([x, z]) => {
    addBox(scene, materials.steelLight, [0.18, 4.5, 0.18], [x, 2.25, z]);
  });
  addBox(scene, materials.steelLight, [23.98, 0.16, 0.16], [0, 4.46, -8.9], { castShadow: false });
  addBox(scene, materials.steelLight, [23.98, 0.16, 0.16], [0, 4.46, 8.9], { castShadow: false });
  addBox(scene, materials.steelLight, [0.16, 0.16, 17.98], [-11.9, 4.46, 0], { castShadow: false });
  addBox(scene, materials.steelLight, [0.16, 0.16, 17.98], [11.9, 4.46, 0], { castShadow: false });

  const safetyMat = new THREE.MeshBasicMaterial({ color: "#d4a63f", transparent: true, opacity: 0.7, depthWrite: false });
  addBox(scene, safetyMat, [17.0, 0.014, 0.055], [0, 0.072, -6.51], { castShadow: false, receiveShadow: false });
  addBox(scene, safetyMat, [17.0, 0.014, 0.055], [0, 0.072, 5.61], { castShadow: false, receiveShadow: false });

  const aisleData = [
    { z: -7.6, title: "REAR CROSS", sub: "AISLE" },
    { z: -3.95, title: "AISLE A", sub: "PICK FACE" },
    { z: -0.45, title: "AISLE B", sub: "PICK FACE" },
    { z: 3.05, title: "AISLE C", sub: "PICK FACE" },
    { z: 6.35, title: "FRONT CROSS", sub: "PACKING ACCESS" },
  ];
  aisleData.forEach((aisle, index) => {
    const decal = makeFloorDecal(aisle.title, aisle.sub, {
      x: index === 4 ? 2.8 : -1.5,
      z: aisle.z,
      width: index === 0 || index === 4 ? 6.1 : 5.5,
      opacity: index === 4 ? 0.55 : 0.64,
    });
    scene.add(decal);
  });
  scene.add(makeFloorDecal("PACK", "OUTBOUND", { x: -7.0, z: 7.7, width: 3.3, color: "rgba(30,49,54,.82)", subColor: "rgba(30,49,54,.58)", opacity: 0.82 }));

  const crossWest = makeFloorDecal("WEST", "CROSS AISLE", {
    x: -10.55,
    z: 1.2,
    width: 3.4,
    opacity: 0.44,
    rotation: Math.PI / 2,
  });
  scene.add(crossWest);
  const crossEast = makeFloorDecal("EAST", "CROSS AISLE", {
    x: 10.55,
    z: -1.2,
    width: 3.4,
    opacity: 0.44,
    rotation: Math.PI / 2,
  });
  scene.add(crossEast);

  const rackGroup = new THREE.Group();
  scene.add(rackGroup);
  const labelMeshes = [];
  const binHighlights = new Map();
  const productModels = new Map();
  const binLabelLookup = new Map();
  PRODUCTS.forEach((product) => {
    binLabelLookup.set(`${product.row}-${product.bay}-${product.side}`, product);
  });

  const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const toteMatrix = new THREE.Matrix4();
  const toteQuaternion = new THREE.Quaternion();
  const toteScale = new THREE.Vector3();
  const totePosition = new THREE.Vector3();
  const totes = [];
  const random = seededRandom(9081);

  WAREHOUSE.rowZ.forEach((rowZ, rowIndex) => {
    const rowGroup = new THREE.Group();
    rackGroup.add(rowGroup);
    const postXs = [];
    for (let bay = 0; bay <= WAREHOUSE.bayCount; bay += 1) {
      postXs.push(WAREHOUSE.rackMinX + bay * WAREHOUSE.bayWidth);
    }
    postXs.forEach((x) => {
      [-1, 1].forEach((side) => {
        addBox(rowGroup, materials.steel, [0.095, WAREHOUSE.rackHeight, 0.095], [x, WAREHOUSE.rackHeight / 2, rowZ + side * (WAREHOUSE.rackDepth / 2)]);
        addBox(rowGroup, materials.steel, [0.24, 0.07, 0.24], [x, 0.04, rowZ + side * (WAREHOUSE.rackDepth / 2)], { castShadow: false });
      });
    });

    const shelfLevels = [0.18, 0.92, 1.66];
    shelfLevels.forEach((level, shelfIndex) => {
      addBox(rowGroup, materials.beam, [17.04, 0.105, 0.105], [0, level, rowZ - WAREHOUSE.rackDepth / 2]);
      addBox(rowGroup, materials.beam, [17.04, 0.105, 0.105], [0, level, rowZ + WAREHOUSE.rackDepth / 2]);
      if (shelfIndex < 2) {
        addBox(rowGroup, materials.shelf, [16.96, 0.055, 1.28], [0, level + 0.07, rowZ], { castShadow: false });
      }
    });
    addBox(rowGroup, materials.beam, [17.04, 0.1, 0.1], [0, 2.48, rowZ - WAREHOUSE.rackDepth / 2]);
    addBox(rowGroup, materials.beam, [17.04, 0.1, 0.1], [0, 2.48, rowZ + WAREHOUSE.rackDepth / 2]);

    for (let bay = 0; bay < WAREHOUSE.bayCount; bay += 1) {
      const bayCenter = WAREHOUSE.rackMinX + WAREHOUSE.bayWidth / 2 + bay * WAREHOUSE.bayWidth;
      for (let shelf = 0; shelf < 3; shelf += 1) {
        const shelfY = shelfLevels[shelf] + 0.1;
        const isSelectedSouth = binLabelLookup.has(`${rowIndex}-${bay}-south`);
        const isSelectedNorth = binLabelLookup.has(`${rowIndex}-${bay}-north`);
        if (shelf === 2) continue;
        const toteCount = 2;
        for (let t = 0; t < toteCount; t += 1) {
          if ((t === 0 && isSelectedSouth) || (t === 1 && isSelectedNorth)) continue;
          const width = 0.72 + random() * 0.18;
          const height = 0.36 + random() * 0.14;
          const depth = 0.78 + random() * 0.12;
          totePosition.set(bayCenter + (t ? 0.48 : -0.45), shelfY + height / 2, rowZ + (t ? 0.16 : -0.15));
          toteQuaternion.setFromEuler(new THREE.Euler(0, (random() - 0.5) * 0.08, 0));
          toteScale.set(width, height, depth);
          toteMatrix.compose(totePosition, toteQuaternion, toteScale);
          totes.push({ matrix: toteMatrix.clone(), color: random() > 0.48 ? "#b89464" : "#c8aa7c", row: rowIndex, bay, t });
        }
      }
    }

    for (let bay = 0; bay < WAREHOUSE.bayCount; bay += 1) {
      const bayCenter = WAREHOUSE.rackMinX + WAREHOUSE.bayWidth / 2 + bay * WAREHOUSE.bayWidth;
      const binCode = `R${WAREHOUSE.rowLabels[rowIndex]}-B${String(bay + 1).padStart(2, "0")}`;
      ["south", "north"].forEach((side) => {
        const product = binLabelLookup.get(`${rowIndex}-${bay}-${side}`);
        const faceSign = side === "south" ? 1 : -1;
        const selected = Boolean(product);
        const texture = makeLabelTexture(
          selected ? product.sku : binCode,
          selected ? `${product.name} · ${binCode}` : side === "south" ? "PICK FACE" : "REAR FACE",
          selected ? product.color : "#ef6a3a",
          selected,
        );
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide });
        const width = selected ? 1.18 : 0.72;
        const height = selected ? 0.405 : 0.18;
        const label = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
        label.position.set(bayCenter, selected ? 1.39 : 1.34, rowZ + faceSign * (WAREHOUSE.rackDepth / 2 + 0.06));
        if (side === "north") label.rotation.y = Math.PI;
        label.renderOrder = 3;
        rowGroup.add(label);
        labelMeshes.push(label);

        if (selected) {
          const position = getBinPosition(product);
          const frameMaterial = new THREE.MeshStandardMaterial({
            color: product.color,
            emissive: product.color,
            emissiveIntensity: 0.38,
            roughness: 0.45,
          });
          const frameGroup = new THREE.Group();
          frameGroup.position.set(bayCenter, 1.39, rowZ + faceSign * (WAREHOUSE.rackDepth / 2 + 0.04));
          const frameWidth = 2.08;
          const frameHeight = 0.55;
          addBox(frameGroup, frameMaterial, [frameWidth, 0.032, 0.032], [0, frameHeight / 2, 0], { castShadow: false, receiveShadow: false });
          addBox(frameGroup, frameMaterial, [frameWidth, 0.032, 0.032], [0, -frameHeight / 2, 0], { castShadow: false, receiveShadow: false });
          addBox(frameGroup, frameMaterial, [0.032, frameHeight, 0.032], [-frameWidth / 2, 0, 0], { castShadow: false, receiveShadow: false });
          addBox(frameGroup, frameMaterial, [0.032, frameHeight, 0.032], [frameWidth / 2, 0, 0], { castShadow: false, receiveShadow: false });
          if (side === "north") frameGroup.rotation.y = Math.PI;
          rowGroup.add(frameGroup);

          const beaconMaterial = new THREE.MeshBasicMaterial({ color: product.color, transparent: true, opacity: 0.85 });
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), beaconMaterial);
          beacon.position.set(bayCenter + 0.93, 1.58, rowZ + faceSign * (WAREHOUSE.rackDepth / 2 + 0.08));
          rowGroup.add(beacon);

          const productGroup = createProductModel(product);
          productGroup.position.set(
            bayCenter,
            1.75,
            rowZ + faceSign * (WAREHOUSE.rackDepth / 2 - 0.32),
          );
          if (side === "north") productGroup.rotation.y = Math.PI;
          rowGroup.add(productGroup);
          productModels.set(product.id, productGroup);

          binHighlights.set(product.id, {
            frameMaterial,
            beaconMaterial,
            beacon,
            labelMaterial: material,
            productGroup,
            baseColor: new THREE.Color(product.color),
          });
        }
      });
    }
  });

  const toteMesh = new THREE.InstancedMesh(
    unitBoxGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 }),
    totes.length,
  );
  totes.forEach((tote, index) => {
    toteMesh.setMatrixAt(index, tote.matrix);
    toteMesh.setColorAt(index, new THREE.Color(tote.color));
  });
  toteMesh.castShadow = true;
  toteMesh.receiveShadow = true;
  toteMesh.instanceMatrix.needsUpdate = true;
  if (toteMesh.instanceColor) toteMesh.instanceColor.needsUpdate = true;
  rackGroup.add(toteMesh);

  const packingGroup = new THREE.Group();
  packingGroup.position.set(WAREHOUSE.packing.x, 0, WAREHOUSE.packing.z);
  scene.add(packingGroup);
  const tableTop = addBox(packingGroup, materials.dark, [2.65, 0.12, 1.12], [0, 0.93, 0.05]);
  const tableEdge = addBox(packingGroup, materials.orange, [2.68, 0.04, 0.06], [0, 0.9, 0.63], { castShadow: false });
  [[-1.18, -0.4], [1.18, -0.4], [-1.18, 0.5], [1.18, 0.5]].forEach(([x, z]) => {
    addBox(packingGroup, materials.steel, [0.07, 0.9, 0.07], [x, 0.45, z]);
  });
  const monitorPivot = new THREE.Group();
  monitorPivot.position.set(-0.55, 1.02, -0.1);
  monitorPivot.rotation.y = 0.1;
  packingGroup.add(monitorPivot);
  addBox(monitorPivot, materials.dark, [0.16, 0.06, 0.16], [0, 0.02, 0]);
  addBox(monitorPivot, materials.dark, [0.08, 0.35, 0.08], [0, 0.21, 0]);
  const screenMaterial = new THREE.MeshStandardMaterial({ color: "#103b43", emissive: "#1fb8c2", emissiveIntensity: 0.85, roughness: 0.3 });
  const screen = addBox(monitorPivot, screenMaterial, [0.8, 0.48, 0.055], [0, 0.56, 0.02]);
  screen.rotation.x = -0.1;
  addBox(packingGroup, materials.cardboardLight, [0.62, 0.26, 0.44], [0.72, 1.13, 0.04]);
  addBox(packingGroup, materials.cardboard, [0.5, 0.22, 0.4], [0.18, 1.11, 0.03], { rotationY: 0.12 });
  addBox(packingGroup, new THREE.MeshStandardMaterial({ color: "#2b716c", roughness: 0.6 }), [0.52, 0.21, 0.38], [0.72, 1.36, 0.04], { rotationY: -0.08 });
  const packingSign = makeSpriteLabel("PACKING", "#163039", "#9ce4de");
  packingSign.scale.set(1.9, 0.525, 1);
  packingSign.position.set(0, 2.15, 0.8);
  packingGroup.add(packingSign);
  const packingLight = new THREE.PointLight("#ffbf78", 0.7, 5, 2);
  packingLight.position.set(0, 2.1, 0.4);
  packingGroup.add(packingLight);

  const startRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.59, 34),
    new THREE.MeshBasicMaterial({ color: "#f0c052", transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }),
  );
  startRing.rotation.x = -Math.PI / 2;
  startRing.position.set(PACKING_POINT.x, STOP_Y, PACKING_POINT.z);
  scene.add(startRing);

  const picker = createPicker();
  picker.position.set(PACKING_POINT.x, 0.075, PACKING_POINT.z);
  picker.rotation.y = Math.PI;
  scene.add(picker);

  const routeGroup = new THREE.Group();
  scene.add(routeGroup);
  const stopMarkerGroup = new THREE.Group();
  scene.add(stopMarkerGroup);
  const blockGroup = new THREE.Group();
  scene.add(blockGroup);
  const stopMarkers = new Map();

  let currentView = "overhead";
  let routePoints = [];
  let routeMaterials = [];
  let savedOverhead = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  };
  const cameraLook = new THREE.Vector3(0, 0.3, 0.25);
  const desiredPosition = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const forwardVector = new THREE.Vector3();
  let followInitialized = false;
  let highlightClock = 0;

  function getOverheadFraming() {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    const aspect = width / height;
    const fitScale = Math.max(1, 0.91 / aspect);
    const distance = 45 * fitScale;
    const direction = new THREE.Vector3(-0.255, 0.69, 0.69).normalize();
    const target = new THREE.Vector3(0, 0.28, 0.35);
    return {
      position: target.clone().addScaledVector(direction, distance),
      target,
    };
  }

  function setSceneSize() {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    routeMaterials.forEach((material) => {
      material.resolution.set(width, height);
    });
    if (currentView === "overhead" && !controls.enabled) {
      const framing = getOverheadFraming();
      camera.position.copy(framing.position);
      controls.target.copy(framing.target);
    }
  }

  function setView(view, immediate = false) {
    if (currentView === view && !immediate) return;
    if (view === "follow") {
      if (currentView === "overhead") {
        savedOverhead.position.copy(camera.position);
        savedOverhead.target.copy(controls.target);
      }
      currentView = "follow";
      controls.enabled = false;
      followInitialized = false;
    } else {
      currentView = "overhead";
      controls.enabled = true;
      if (immediate || savedOverhead.position.lengthSq() === 0) {
        const framing = getOverheadFraming();
        camera.position.copy(framing.position);
        controls.target.copy(framing.target);
      } else {
        camera.position.copy(savedOverhead.position);
        controls.target.copy(savedOverhead.target);
      }
      cameraLook.copy(controls.target);
      camera.lookAt(controls.target);
      controls.update();
    }
  }

  function updateCamera(dt, pickerYaw, moving) {
    if (currentView === "follow") {
      forwardVector.set(Math.sin(pickerYaw), 0, Math.cos(pickerYaw)).normalize();
      const distance = viewport.clientWidth < 600 ? 5.8 : 6.6;
      const height = viewport.clientWidth < 600 ? 4.1 : 4.7;
      desiredPosition.copy(picker.position).addScaledVector(forwardVector, -distance);
      desiredPosition.y = height;
      desiredLook.copy(picker.position).addScaledVector(forwardVector, 4.1);
      desiredLook.y = 1.12;
      if (!followInitialized) {
        camera.position.copy(desiredPosition);
        cameraLook.copy(desiredLook);
        followInitialized = true;
      } else {
        const positionLerp = 1 - Math.exp(-(moving ? 4.2 : 3.2) * dt);
        const lookLerp = 1 - Math.exp(-5 * dt);
        camera.position.lerp(desiredPosition, positionLerp);
        cameraLook.lerp(desiredLook, lookLerp);
      }
      camera.lookAt(cameraLook);
    } else {
      controls.update();
    }
  }

  function clearRoute() {
    while (routeGroup.children.length) {
      const child = routeGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    routeMaterials = [];
  }

  function makeRouteLine(points, color, linewidth, opacity) {
    const geometry = new LineGeometry();
    const positions = [];
    points.forEach((point) => positions.push(point.x, ROUTE_Y, point.z));
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color,
      linewidth,
      transparent: opacity < 1,
      opacity,
      depthWrite: false,
      dashed: false,
    });
    material.resolution.set(Math.max(1, viewport.clientWidth), Math.max(1, viewport.clientHeight));
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.renderOrder = 4;
    routeMaterials.push(material);
    return line;
  }

  function buildRoute(plan) {
    clearRoute();
    routePoints = plan.routePoints.map((point) => ({ x: point.x, z: point.z }));
    if (routePoints.length < 2) return;

    const glow = makeRouteLine(routePoints, "#48e0dc", 11, 0.18);
    glow.renderOrder = 4;
    routeGroup.add(glow);
    const core = makeRouteLine(routePoints, "#22c8cc", 4.2, 0.98);
    core.renderOrder = 5;
    routeGroup.add(core);
    const center = makeRouteLine(routePoints, "#eafdf6", 1.15, 0.8);
    center.renderOrder = 6;
    routeGroup.add(center);

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: "#c8fff7", transparent: true, opacity: 0.75, depthWrite: false });
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.14);
    arrowShape.lineTo(0.13, -0.08);
    arrowShape.lineTo(0.038, -0.045);
    arrowShape.lineTo(0, -0.11);
    arrowShape.lineTo(-0.038, -0.045);
    arrowShape.lineTo(-0.13, -0.08);
    arrowShape.closePath();
    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    let distanceAccumulator = 0;
    for (let i = 1; i < routePoints.length; i += 1) {
      const start = routePoints[i - 1];
      const end = routePoints[i];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);
      let cursor = distanceAccumulator % 3.1;
      if (cursor === 0) cursor = 1.4;
      while (cursor < length) {
        if ((distanceAccumulator + cursor) % 6.2 > 1.1) {
          const t = cursor / length;
          const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
          arrow.rotation.x = -Math.PI / 2;
          arrow.rotation.z = yaw + Math.PI;
          arrow.position.set(start.x + dx * t, ROUTE_Y + 0.006, start.z + dz * t);
          arrow.scale.setScalar(0.7);
          arrow.renderOrder = 6;
          routeGroup.add(arrow);
        }
        cursor += 2.8;
      }
      distanceAccumulator += length;
    }
  }

  function buildStopMarkers(plan, order, unreachableIds) {
    stopMarkers.forEach((marker) => {
      marker.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    while (stopMarkerGroup.children.length) stopMarkerGroup.remove(stopMarkerGroup.children[0]);
    stopMarkers.clear();

    order.forEach((item) => {
      const position = getBinPosition(item);
      const unreachable = unreachableIds.has(item.id);
      const color = unreachable ? "#d45542" : "#ef6a3a";
      const group = new THREE.Group();
      group.position.set(position.x, STOP_Y, position.z);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 30), ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      const discMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.31, 30), discMaterial);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.002;
      group.add(disc);
      stopMarkerGroup.add(group);
      stopMarkers.set(item.id, { group, ring, ringMaterial, discMaterial, baseOpacity: 0.9 });
    });
  }

  function setStopVisuals(order, picked, activeId, unreachableIds) {
    order.forEach((item) => {
      const marker = stopMarkers.get(item.id);
      if (!marker) return;
      const isActive = activeId === item.id;
      const isPicked = (picked[item.id] || 0) >= item.qty && item.qty > 0;
      const isUnreachable = unreachableIds.has(item.id);
      if (isUnreachable) {
        marker.ringMaterial.color.set("#d45542");
        marker.discMaterial.color.set("#d45542");
      } else if (isPicked) {
        marker.ringMaterial.color.set("#3aa987");
        marker.discMaterial.color.set("#3aa987");
      } else if (isActive) {
        marker.ringMaterial.color.set("#ffd37a");
        marker.discMaterial.color.set("#ffd37a");
      } else {
        marker.ringMaterial.color.set("#ef6a3a");
        marker.discMaterial.color.set("#ef6a3a");
      }
      marker.ringMaterial.opacity = isUnreachable ? 0.8 : 0.92;
    });
  }

  function setHighlightVisuals(picked, activeId, unreachableIds) {
    binHighlights.forEach((highlight, id) => {
      const product = PRODUCTS.find((item) => item.id === id);
      const isActive = id === activeId;
      const isPicked = product && (picked[id] || 0) >= product.qty;
      const isUnreachable = unreachableIds.has(id);
      const color = isUnreachable ? new THREE.Color("#d45542") : isPicked ? new THREE.Color("#3aa987") : isActive ? new THREE.Color("#ffcf72") : highlight.baseColor;
      highlight.frameMaterial.color.copy(color);
      highlight.frameMaterial.emissive.copy(color);
      highlight.beaconMaterial.color.copy(color);
      highlight.frameMaterial.emissiveIntensity = isActive ? 1.4 : isPicked ? 0.65 : 0.35;
      highlight.beaconMaterial.opacity = isActive ? 1 : 0.78;
    });
  }

  function buildBlockers(blockedIds) {
    while (blockGroup.children.length) {
      const child = blockGroup.children.pop();
      child.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        }
      });
    }

    blockedIds.forEach((id) => {
      const segment = getBlockedSegment(id);
      if (!segment) return;
      const { rect } = segment;
      const width = rect.x2 - rect.x1;
      const depth = rect.z2 - rect.z1;
      const cx = (rect.x1 + rect.x2) / 2;
      const cz = (rect.z1 + rect.z2) / 2;
      const group = new THREE.Group();
      group.position.set(cx, 0, cz);
      blockGroup.add(group);

      const stripe = hazardTexture.clone();
      stripe.needsUpdate = true;
      stripe.wrapS = THREE.RepeatWrapping;
      stripe.wrapT = THREE.RepeatWrapping;
      stripe.repeat.set(Math.max(1, width / 1.6), Math.max(1, depth / 1.1));
      const floorPatch = new THREE.Mesh(
        new THREE.PlaneGeometry(width, depth),
        new THREE.MeshBasicMaterial({ map: stripe, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }),
      );
      floorPatch.rotation.x = -Math.PI / 2;
      floorPatch.position.y = 0.086;
      floorPatch.renderOrder = 3;
      group.add(floorPatch);

      const barrier = makeSpriteLabel("BLOCKED", "#d34e34", "#fff5ed");
      barrier.scale.set(1.55, 0.43, 1);
      barrier.position.set(0, 1.25, 0);
      group.add(barrier);

      const coneMaterial = new THREE.MeshStandardMaterial({ color: "#e95936", roughness: 0.66 });
      const bandMaterial = new THREE.MeshStandardMaterial({ color: "#f3e5ca", roughness: 0.78 });
      const conePositions = width >= depth
        ? [[-width / 2 + 0.18, -depth / 2 + 0.17], [width / 2 - 0.18, -depth / 2 + 0.17], [-width / 2 + 0.18, depth / 2 - 0.17], [width / 2 - 0.18, depth / 2 - 0.17]]
        : [[-width / 2 + 0.17, -depth / 2 + 0.18], [width / 2 - 0.17, -depth / 2 + 0.18], [-width / 2 + 0.17, depth / 2 - 0.18], [width / 2 - 0.17, depth / 2 - 0.18]];
      conePositions.forEach(([x, z]) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.33, 12), coneMaterial);
        cone.position.set(x, 0.17, z);
        cone.castShadow = true;
        group.add(cone);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.087, 0.055, 12), bandMaterial);
        band.position.set(x, 0.16, z);
        group.add(band);
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.24), coneMaterial);
        base.position.set(x, 0.015, z);
        group.add(base);
      });

      if (width >= depth) {
        addBox(group, materials.dark, [Math.max(0.65, width - 0.5), 0.055, 0.055], [0, 0.66, 0], { castShadow: false });
        [-width / 2 + 0.18, width / 2 - 0.18].forEach((x) => {
          addBox(group, materials.dark, [0.05, 0.64, 0.05], [x, 0.34, 0], { castShadow: false });
        });
      } else {
        addBox(group, materials.dark, [0.055, 0.055, Math.max(0.65, depth - 0.5)], [0, 0.66, 0], { castShadow: false });
        [-depth / 2 + 0.18, depth / 2 - 0.18].forEach((z) => {
          addBox(group, materials.dark, [0.05, 0.64, 0.05], [0, 0.34, z], { castShadow: false });
        });
      }
    });
  }

  function updatePickerPose(position, yaw, walking, picking, dt, time) {
    picker.position.set(position.x, 0.075, position.z);
    let delta = yaw - picker.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    picker.rotation.y += delta * Math.min(1, dt * 8.5);

    const { legPivots, armPivots, torso, shadow, tote } = picker.userData;
    const speedFactor = walking ? 1 : 0;
    const stride = Math.sin(time * 9.2);
    legPivots[0].rotation.x = stride * 0.58 * speedFactor;
    legPivots[1].rotation.x = -stride * 0.58 * speedFactor;
    if (picking) {
      armPivots[1].rotation.x = -1.25 + Math.sin(time * 7) * 0.08;
      armPivots[0].rotation.x = -0.25;
      armPivots[1].rotation.z = 0.14;
      torso.rotation.z = Math.sin(time * 4) * 0.025;
      tote.position.y = 0.88 + Math.sin(time * 3) * 0.015;
    } else {
      armPivots[0].rotation.x = -stride * 0.45 * speedFactor;
      armPivots[1].rotation.x = stride * 0.45 * speedFactor;
      armPivots[0].rotation.z = 0;
      armPivots[1].rotation.z = 0;
      torso.rotation.z = 0;
      tote.position.y = 0.88;
    }
    const bob = walking ? Math.abs(Math.sin(time * 9.2)) * 0.035 : Math.sin(time * 1.8) * 0.006;
    picker.position.y = 0.075 + bob;
    shadow.scale.setScalar(1 - bob * 2.5);
    shadow.material.opacity = 0.2 - bob * 0.7;
  }

  function animateDetails(time) {
    highlightClock = time;
    binHighlights.forEach((highlight) => {
      if (highlight.beaconMaterial.opacity > 0.9) {
        const scale = 1 + Math.sin(time * 5.5) * 0.35;
        highlight.beacon.scale.setScalar(scale);
      } else {
        highlight.beacon.scale.setScalar(1);
      }
    });
    stopMarkers.forEach((marker) => {
      const isActive = marker.ringMaterial.color.getHexString() === "ffd37a";
      if (isActive) {
        const pulse = 1 + Math.sin(time * 6) * 0.16;
        marker.ring.scale.setScalar(pulse);
      } else {
        marker.ring.scale.setScalar(1);
      }
    });
  }

  function projectPoint(x, y, z) {
    const vector = new THREE.Vector3(x, y, z).project(camera);
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const visible = vector.z < 1 && vector.x > -1.15 && vector.x < 1.15 && vector.y > -1.15 && vector.y < 1.15;
    return {
      x: (vector.x * 0.5 + 0.5) * width,
      y: (-vector.y * 0.5 + 0.5) * height,
      visible,
    };
  }

  setSceneSize();
  const initial = getOverheadFraming();
  camera.position.copy(initial.position);
  controls.target.copy(initial.target);
  cameraLook.copy(controls.target);
  camera.lookAt(controls.target);
  controls.update();

  return {
    scene,
    camera,
    renderer,
    controls,
    picker,
    setSceneSize,
    setView,
    updateCamera,
    buildRoute,
    buildStopMarkers,
    setStopVisuals,
    setHighlightVisuals,
    buildBlockers,
    updatePickerPose,
    animateDetails,
    projectPoint,
    getView: () => currentView,
    render: () => renderer.render(scene, camera),
  };
}
