import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PARK, EQUIPMENT_TYPES, clamp } from './data.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const COLORS = {
  path: 0xd7c7a6,
  pathAlt: 0xcab88f,
  levelPath: 0xb8c7bd,
  grass: 0x7f9d63,
  hedge: 0x3f6d42,
  wood: 0x9a6c43,
  darkWood: 0x65452f,
  metal: 0x42565b,
  cream: 0xf1e6cf,
  coral: 0xd9664a,
  amber: 0xe3ad3e,
  teal: 0x297b76,
  ink: 0x193f37,
  selection: 0xffca5a,
  danger: 0xef5f4c,
  route: 0x117d6c
};

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
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

function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(38);
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#8fab70');
  gradient.addColorStop(0.5, '#78975f');
  gradient.addColorStop(1, '#89a66c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3800; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const length = 1 + random() * 4;
    ctx.strokeStyle = random() > 0.48 ? 'rgba(49,87,45,.20)' : 'rgba(208,222,173,.14)';
    ctx.lineWidth = 0.7 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 2, y - length);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLabelSprite(text, options = {}) {
  const {
    background = '#183f36',
    color = '#fff8e7',
    border = 'rgba(255,255,255,.22)',
    scale = 1,
    maxWidth = 4.8,
    fontSize = 42
  } = options;
  const lines = String(text).split('\n');
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = lines.length > 1 ? 300 : 164;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  roundedRect(ctx, 12, 12, canvas.width - 24, canvas.height - 24, 34);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  const lineHeight = fontSize * 1.12;
  const totalHeight = lines.length * lineHeight;
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 - totalHeight / 2 + lineHeight / 2 + index * lineHeight, canvas.width - 70);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(maxWidth * scale, (maxWidth / aspect) * scale, 1);
  sprite.userData.canvasTexture = texture;
  return sprite;
}

function makeSignTexture(title, subtitle, primary = '#1d4f44', accent = '#f0bd52') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 1024, 360);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 1024, 24);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 40, 992, 300);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8e7';
  ctx.font = '800 96px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(title, 512, 148);
  ctx.fillStyle = '#f0c86e';
  ctx.font = '650 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(subtitle, 512, 252);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRestroomTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eef2e9';
  ctx.fillRect(0, 0, 1024, 400);
  ctx.fillStyle = '#2d6f86';
  ctx.fillRect(0, 0, 1024, 22);
  ctx.fillStyle = '#1c4b45';
  ctx.font = '800 72px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ACCESSIBLE', 512, 130);
  ctx.fillText('RESTROOM', 512, 216);
  ctx.fillStyle = '#336f83';
  ctx.font = '650 46px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('LEVEL ENTRY', 512, 316);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.02,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
}

function addBox(parent, width, height, depth, color, x, y, z, options = {}) {
  const material = makeMaterial(typeof color === 'number' ? color : 0xffffff, options);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, color, x, y, z, segments = 12, options = {}) {
  const material = makeMaterial(color, options);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.rotationX) mesh.rotation.x = options.rotationX;
  if (options.rotationZ) mesh.rotation.z = options.rotationZ;
  parent.add(mesh);
  return mesh;
}

function cylinderBetween(start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function disposeObject(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
}

function addFootprint(root, object, accentColor) {
  const width = object.width;
  const depth = object.depth;
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.13,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), fillMaterial);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.075;
  fill.renderOrder = 1;
  root.add(fill);

  const borderPoints = [
    new THREE.Vector3(-width / 2, 0.09, -depth / 2),
    new THREE.Vector3(width / 2, 0.09, -depth / 2),
    new THREE.Vector3(width / 2, 0.09, depth / 2),
    new THREE.Vector3(-width / 2, 0.09, depth / 2)
  ];
  const borderMaterial = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.88 });
  const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(borderPoints), borderMaterial);
  border.renderOrder = 2;
  root.add(border);

  const marker = new THREE.Group();
  marker.visible = false;
  const markerMaterial = new THREE.MeshBasicMaterial({ color: COLORS.selection, depthWrite: false });
  const cornerX = width / 2;
  const cornerZ = depth / 2;
  const arm = Math.min(1.05, Math.min(width, depth) * 0.22);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const barX = new THREE.Mesh(new THREE.BoxGeometry(arm, 0.12, 0.13), markerMaterial);
      barX.position.set(sx * (cornerX - arm / 2), 0.15, sz * cornerZ);
      const barZ = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, arm), markerMaterial);
      barZ.position.set(sx * cornerX, 0.15, sz * (cornerZ - arm / 2));
      marker.add(barX, barZ);
    }
  }
  root.add(marker);

  root.userData.footprint = {
    fill,
    border,
    marker,
    accentColor,
    fillMaterial,
    borderMaterial
  };
}

function addStage(root, object) {
  const { width: w, depth: d } = object;
  addBox(root, w, 0.54, d, COLORS.darkWood, 0, 0.28, 0);
  addBox(root, w - 0.8, 0.18, d - 0.7, 0xb18150, 0, 0.64, 0);
  addBox(root, w * 0.88, 3.25, 0.2, 0x254d45, 0, 2.0, -d / 2 + 0.18);
  addBox(root, w * 0.92, 0.18, 0.22, COLORS.amber, 0, 0.95, -d / 2 + 0.24);
  for (const sx of [-1, 1]) {
    addBox(root, 0.16, 3.8, 0.16, COLORS.metal, sx * (w / 2 - 0.25), 1.9, d / 2 - 0.25);
    addBox(root, 0.16, 3.8, 0.16, COLORS.metal, sx * (w / 2 - 0.25), 1.9, -d / 2 + 0.25);
    addBox(root, 0.55, 0.9, 0.48, 0x293638, sx * (w / 2 - 0.8), 1.0, d / 2 - 0.6);
  }
  addBox(root, w - 0.5, 0.12, 0.12, COLORS.metal, 0, 3.72, d / 2 - 0.25);
  addBox(root, w - 0.5, 0.12, 0.12, COLORS.metal, 0, 3.72, -d / 2 + 0.25);
  for (const sx of [-1, 1]) {
    addBox(root, 0.12, 0.12, d - 0.5, COLORS.metal, sx * (w / 2 - 0.25), 3.72, 0);
  }
  addBox(root, 2.6, 0.18, 0.9, 0xb18150, 0, 0.1, d / 2 + 0.44);
  addBox(root, 2.6, 0.18, 0.9, 0xb18150, 0, -0.03, d / 2 + 1.18);

  const signTexture = makeSignTexture('MAIN STAGE', 'COMMUNITY PROGRAMME');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.58, 1.25),
    new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false })
  );
  sign.position.set(0, 2.18, -d / 2 + 0.295);
  root.add(sign);

  const label = makeLabelSprite('MAIN STAGE', { background: '#173f36', scale: 0.92, maxWidth: 5.4 });
  label.position.set(0, 4.55, 0);
  root.add(label);

  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffd477 });
  for (let i = 0; i < 6; i += 1) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lightMaterial);
    light.position.set(-w / 2 + 1.0 + i * ((w - 2) / 5), 3.68, d / 2 - 0.26);
    root.add(light);
  }
}

function addFoodStall(root, object, index = 0) {
  const { width: w, depth: d } = object;
  const accent = [COLORS.coral, 0xd18b3b, 0x3c8676][index % 3];
  addBox(root, w * 0.88, 1.62, d * 0.64, 0xf2e4c9, 0, 0.93, -d * 0.12);
  addBox(root, w * 0.9, 0.72, 0.28, COLORS.wood, 0, 0.56, d * 0.33);
  addBox(root, w * 0.95, 0.11, 0.42, 0xd7b989, 0, 0.96, d * 0.35);
  addBox(root, w + 0.4, 0.13, d * 0.82, accent, 0, 2.17, -d * 0.05);
  for (let i = 0; i < Math.max(5, Math.floor(w / 0.55)); i += 1) {
    const stripeWidth = (w + 0.14) / Math.max(5, Math.floor(w / 0.55));
    const stripe = addBox(
      root,
      stripeWidth,
      0.04,
      d * 0.82,
      i % 2 === 0 ? 0xf4d99c : 0xfbf1dd,
      -w / 2 - 0.07 + stripeWidth / 2 + i * stripeWidth,
      2.25,
      -d * 0.05,
      { castShadow: false }
    );
    stripe.material.roughness = 0.9;
  }
  addBox(root, 0.1, 1.75, 0.1, COLORS.metal, -w / 2 + 0.18, 1.12, d * 0.36);
  addBox(root, 0.1, 1.75, 0.1, COLORS.metal, w / 2 - 0.18, 1.12, d * 0.36);
  const board = addBox(root, w * 0.38, 0.58, 0.06, 0x274b43, -w * 0.22, 1.35, d / 2 + 0.02, {
    castShadow: false
  });
  board.rotation.x = -0.06;
  addBox(root, w * 0.2, 0.2, w * 0.2, 0xcfa866, w * 0.18, 1.14, d * 0.42, { castShadow: false });
  const label = makeLabelSprite(object.name.replace('Food stall · ', 'FOOD · ').toUpperCase(), {
    background: '#7d3e30',
    scale: 0.8,
    maxWidth: 3.2,
    fontSize: 40
  });
  label.position.set(0, 2.85, 0);
  root.add(label);
}

function addSeating(root, object) {
  const { width: w, depth: d } = object;
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, d * 0.92),
    new THREE.MeshStandardMaterial({ color: 0x6f8d5d, roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.105;
  rug.receiveShadow = true;
  root.add(rug);

  const rows = 4;
  const benchLength = w * 0.68;
  for (let row = 0; row < rows; row += 1) {
    const z = -d * 0.31 + row * (d * 0.62 / (rows - 1));
    addBox(root, benchLength, 0.16, 0.38, 0xa77648, 0, 0.53, z);
    addBox(root, benchLength, 0.44, 0.1, 0x93663f, 0, 0.8, z - 0.16);
    for (const sx of [-1, 1]) {
      addBox(root, 0.09, 0.46, 0.32, COLORS.metal, sx * (benchLength / 2 - 0.18), 0.25, z);
    }
  }
  for (const sx of [-1, 1]) {
    addCylinder(root, 0.05, 0.05, 1.1, COLORS.metal, sx * (w * 0.43), 0.55, d * 0.4, 8);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.4),
      new THREE.MeshBasicMaterial({ color: sx < 0 ? COLORS.amber : COLORS.coral, side: THREE.DoubleSide })
    );
    flag.position.set(sx * (w * 0.43) + 0.33 * sx, 1.0, d * 0.4);
    root.add(flag);
  }
  const label = makeLabelSprite(object.name.toUpperCase(), {
    background: '#285e51',
    scale: 0.82,
    maxWidth: 4.7,
    fontSize: 38
  });
  label.position.set(0, 1.75, 0);
  root.add(label);
}

function addInfoDesk(root, object) {
  const { width: w, depth: d } = object;
  addBox(root, w * 0.92, 1.05, d * 0.48, COLORS.teal, 0, 0.53, 0);
  addBox(root, w * 0.98, 0.08, d * 0.6, 0xe7d5ae, 0, 1.1, 0);
  addBox(root, w * 0.36, 0.52, 0.07, 0x1e5f5b, 0, 0.58, d * 0.25, { castShadow: false });
  for (const sx of [-1, 1]) {
    addBox(root, 0.09, 2.15, 0.09, COLORS.metal, sx * w * 0.34, 1.08, -d * 0.2);
  }
  addBox(root, w * 0.76, 0.1, d * 0.16, COLORS.amber, 0, 2.14, -d * 0.2);
  const sign = makeLabelSprite('INFORMATION', { background: '#245c61', maxWidth: 3.3, scale: 0.78 });
  sign.position.set(0, 2.56, 0);
  root.add(sign);
}

function addRestroom(root, object) {
  const { width: w, depth: d } = object;
  addBox(root, w, 2.9, d, 0xdce4da, 0, 1.45, 0);
  addBox(root, w + 0.32, 0.22, d + 0.32, 0x435e5c, 0, 2.97, 0);
  addBox(root, w, 1.9, 0.08, 0xc7d3c9, 0, 1.0, d / 2 + 0.045, { castShadow: false });
  for (const sx of [-1, 1]) {
    addBox(root, w * 0.3, 1.8, 0.08, 0x3f6972, sx * w * 0.22, 1.02, d / 2 + 0.09, { castShadow: false });
    addBox(root, 0.1, 0.1, 0.1, 0xd9b347, sx * w * 0.22 + 0.3 * sx, 1.0, d / 2 + 0.15, { castShadow: false });
  }
  const signTexture = makeRestroomTexture();
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.55, 1.1),
    new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false })
  );
  sign.position.set(0, 2.18, d / 2 + 0.1);
  root.add(sign);
  addBox(root, 0.7, 0.36, 0.12, 0xf1f0e7, 0, 2.65, d / 2 + 0.12, { castShadow: false });
  const label = makeLabelSprite('ACCESSIBLE RESTROOM', {
    background: '#365f68',
    scale: 0.92,
    maxWidth: 5.4
  });
  label.position.set(0, 3.85, 0);
  root.add(label);
}

function addBarrier(root, object) {
  const { width: w, depth: d } = object;
  addBox(root, w, 0.45, d * 0.68, 0xdda62e, 0, 0.5, 0);
  for (let i = 0; i < Math.max(4, Math.floor(w / 0.65)); i += 1) {
    const stripeWidth = w / Math.max(4, Math.floor(w / 0.65));
    addBox(
      root,
      stripeWidth * 0.48,
      0.47,
      d * 0.68 + 0.01,
      0x2e3b3b,
      -w / 2 + stripeWidth / 2 + i * stripeWidth,
      0.51,
      0,
      { castShadow: false }
    );
  }
  for (const sx of [-1, 1]) {
    addBox(root, 0.12, 1.0, 0.12, COLORS.metal, sx * (w / 2 - 0.12), 0.5, 0);
    addCylinder(root, 0.08, 0.34, 0.65, 0xe36b48, sx * (w / 2 + 0.28), 0.33, 0, 12);
    addBox(root, 0.18, 0.18, 0.18, 0xf7eee2, sx * (w / 2 + 0.28), 0.35, 0, { castShadow: false });
  }
  const label = makeLabelSprite('ACCESS BARRIER', {
    background: '#724b21',
    scale: 0.72,
    maxWidth: 3.4,
    fontSize: 40
  });
  label.position.set(0, 1.55, 0);
  root.add(label);
}

function buildEquipmentGroup(object, index) {
  const group = new THREE.Group();
  group.name = object.id;
  group.userData.equipmentId = object.id;
  group.position.set(object.x, 0, object.z);
  group.rotation.y = (object.rotation * Math.PI) / 180;

  const accent = new THREE.Color(EQUIPMENT_TYPES[object.type]?.color || '#e0a43d').getHex();
  addFootprint(group, object, accent);

  switch (object.type) {
    case 'stage':
      addStage(group, object);
      break;
    case 'food-stall':
      addFoodStall(group, object, index);
      break;
    case 'seating':
      addSeating(group, object);
      break;
    case 'info-desk':
      addInfoDesk(group, object);
      break;
    case 'restroom':
      addRestroom(group, object);
      break;
    case 'barrier':
      addBarrier(group, object);
      break;
    default:
      addBox(group, object.width, 1, object.depth, accent, 0, 0.5, 0);
  }

  group.traverse((child) => {
    child.userData.equipmentId = object.id;
    if (child.isMesh) {
      child.castShadow = child.castShadow ?? true;
    }
  });
  return group;
}

function addFenceRun(root, x1, z1, x2, z2, skipStart = false, skipEnd = false) {
  const distance = Math.hypot(x2 - x1, z2 - z1);
  const posts = Math.max(1, Math.round(distance / 2.4));
  const postMaterial = COLORS.darkWood;
  const positions = [];
  for (let i = 0; i <= posts; i += 1) {
    const t = i / posts;
    const x = x1 + (x2 - x1) * t;
    const z = z1 + (z2 - z1) * t;
    positions.push({ x, z });
    if ((i === 0 && skipStart) || (i === posts && skipEnd)) continue;
    addBox(root, 0.18, 1.05, 0.18, postMaterial, x, 0.52, z);
  }
  for (let i = 0; i < positions.length - 1; i += 1) {
    const a = positions[i];
    const b = positions[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const horizontal = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    for (const y of [0.38, 0.78]) {
      addBox(
        root,
        horizontal ? length : 0.08,
        0.08,
        horizontal ? 0.08 : length,
        postMaterial,
        (a.x + b.x) / 2,
        y,
        (a.z + b.z) / 2,
        { castShadow: false }
      );
    }
  }
}

function addTree(root, tree, index) {
  const group = new THREE.Group();
  group.position.set(tree.x, 0, tree.z);
  group.scale.setScalar(tree.s);
  addCylinder(group, 0.24, 0.36, 2.45, 0x72533a, 0, 1.22, 0, 7);
  const random = seededRandom(index * 157 + 9);
  const canopyColors = [0x477444, 0x527f49, 0x3d6940, 0x62884c];
  for (let i = 0; i < 3; i += 1) {
    const radius = tree.r * (0.8 + random() * 0.23);
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      makeMaterial(canopyColors[(index + i) % canopyColors.length], { roughness: 0.95 })
    );
    canopy.position.set((random() - 0.5) * 0.8, 2.5 + i * 0.45 + random() * 0.25, (random() - 0.5) * 0.7);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(tree.r * 1.25, 20),
    new THREE.MeshBasicMaterial({ color: 0x385836, transparent: true, opacity: 0.2, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.11;
  group.add(shadow);
  root.add(group);
}

function addGate(root, entrance) {
  const side = Math.sign(entrance.x);
  const group = new THREE.Group();
  group.position.set(entrance.x, 0, entrance.z);
  addBox(group, 0.36, 3.8, 0.36, COLORS.darkWood, 0, 1.9, -2.8);
  addBox(group, 0.36, 3.8, 0.36, COLORS.darkWood, 0, 1.9, 2.8);
  addBox(group, 0.46, 0.45, 6.0, COLORS.darkWood, 0, 3.8, 0);
  const label = makeLabelSprite(entrance.label, {
    background: '#1b493e',
    color: '#fff4d5',
    border: 'rgba(244,196,91,.7)',
    scale: 0.92,
    maxWidth: 4.6,
    fontSize: 48
  });
  label.position.set(0, 4.65, 0);
  group.add(label);
  const triangleColors = [COLORS.amber, COLORS.coral, COLORS.teal, 0xf3e5c5];
  for (let i = 0; i < 8; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const z = -2.55 + i * 0.7;
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([
        -0.3, 3.62, z,
        0.3, 3.62, z,
        0, 3.23, z
      ], 3)
    );
    geometry.computeVertexNormals();
    const flag = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: triangleColors[i % triangleColors.length], side: THREE.DoubleSide })
    );
    if (side > 0) flag.rotation.y = Math.PI;
    group.add(flag);
  }
  root.add(group);
}

export class ParkScene {
  constructor(mount, callbacks = {}) {
    this.mount = mount;
    this.callbacks = callbacks;
    this.equipment = [];
    this.equipmentRoots = new Map();
    this.equipmentById = new Map();
    this.selectedId = null;
    this.overlapIds = new Set();
    this.snap = true;
    this.cameraMode = 'orbit';
    this.cameraTween = null;
    this.routeBeads = [];
    this.routeSegments = [];
    this.dragging = null;
    this.activePointers = new Set();

    this.scene = new THREE.Scene();
    this.perspectiveCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 260);
    this.perspectiveCamera.position.set(48, 43, 54);
    this.perspectiveCamera.lookAt(-1, 0, -2);
    this.orthoCamera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 200);
    this.orthoCamera.position.set(0, 80, 0);
    this.orthoCamera.up.set(0, 0, -1);
    this.orthoCamera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Editable 3D map of Meadowline Community Park. Select equipment, drag to move, or use the equipment list.'
    );
    this.renderer.domElement.tabIndex = 0;
    this.mount.appendChild(this.renderer.domElement);

    this.orbitControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    this.orbitControls.target.set(-1, 0, -2);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.075;
    this.orbitControls.minDistance = 8;
    this.orbitControls.maxDistance = 220;
    this.orbitControls.maxPolarAngle = Math.PI * 0.48;
    this.orbitControls.update();

    this.topControls = new OrbitControls(this.orthoCamera, this.renderer.domElement);
    this.topControls.target.set(0, 0, 0);
    this.topControls.enableDamping = true;
    this.topControls.dampingFactor = 0.09;
    this.topControls.enableRotate = false;
    this.topControls.screenSpacePanning = true;
    this.topControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.topControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.topControls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.topControls.touches.ONE = THREE.TOUCH.PAN;
    this.topControls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.topControls.enabled = false;

    this.grassTexture = makeGrassTexture();
    this.parkRoot = new THREE.Group();
    this.equipmentRoot = new THREE.Group();
    this.routeRoot = new THREE.Group();
    this.scene.add(this.parkRoot, this.equipmentRoot, this.routeRoot);
    this.buildEnvironment();
    this.buildPark();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragPoint = new THREE.Vector3();

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.resize();
    this.frameOrbitCamera(false);
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  get activeCamera() {
    return this.cameraMode === 'top' ? this.orthoCamera : this.perspectiveCamera;
  }

  buildEnvironment() {
    const hemisphere = new THREE.HemisphereLight(0xd8f1ee, 0x52623e, 1.55);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff0d3, 2.35);
    sun.position.set(-26, 48, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb9dcd6, 0.45);
    fill.position.set(30, 20, -24);
    this.scene.add(fill);

    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 100),
      new THREE.MeshStandardMaterial({ color: 0x68805a, roughness: 1 })
    );
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.18;
    outside.receiveShadow = true;
    this.parkRoot.add(outside);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(PARK.width, PARK.depth),
      new THREE.MeshStandardMaterial({ map: this.grassTexture, color: 0xffffff, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.parkRoot.add(ground);

    addBox(this.parkRoot, PARK.width + 0.5, 0.18, 0.35, 0x3b5844, 0, -0.02, PARK.minZ);
    addBox(this.parkRoot, PARK.width + 0.5, 0.18, 0.35, 0x3b5844, 0, -0.02, PARK.maxZ);
    addBox(this.parkRoot, 0.35, 0.18, PARK.depth + 0.5, 0x3b5844, PARK.minX, -0.02, 0);
    addBox(this.parkRoot, 0.35, 0.18, PARK.depth + 0.5, 0x3b5844, PARK.maxX, -0.02, 0);

    this.addGrid();
  }

  addGrid() {
    const points = [];
    for (let x = -34; x <= 34; x += 2) {
      points.push(new THREE.Vector3(x, 0.105, -22), new THREE.Vector3(x, 0.105, 22));
    }
    for (let z = -22; z <= 22; z += 2) {
      points.push(new THREE.Vector3(-34, 0.105, z), new THREE.Vector3(34, 0.105, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xf1f0d9, transparent: true, opacity: 0.095 });
    const grid = new THREE.LineSegments(geometry, material);
    grid.renderOrder = 1;
    this.parkRoot.add(grid);
  }

  buildPark() {
    for (const path of PARK.paths) {
      let color = COLORS.path;
      if (path.kind === 'promenade') color = COLORS.pathAlt;
      if (path.kind === 'level-spur' || path.kind === 'step-spur') color = COLORS.levelPath;
      const mesh = addBox(this.parkRoot, path.w, 0.06, path.d, color, path.x, 0.04, path.z, {
        roughness: 1,
        castShadow: false,
        receiveShadow: true
      });
      mesh.receiveShadow = true;
    }
    for (let x = -31; x <= 31; x += 3.2) {
      addBox(this.parkRoot, 1.3, 0.025, 0.08, 0xb8a783, x, 0.085, 0, { castShadow: false });
    }

    const hedgeSegments = [
      [PARK.minX, PARK.hedge.stepMinX],
      [PARK.hedge.stepMaxX, PARK.hedge.gapMinX],
      [PARK.hedge.gapMaxX, PARK.maxX]
    ];
    for (const [start, end] of hedgeSegments) {
      const width = end - start;
      if (width <= 0) continue;
      addBox(this.parkRoot, width, 0.88, 0.9, COLORS.hedge, (start + end) / 2, 0.48, PARK.hedge.z, {
        roughness: 1
      });
      addBox(this.parkRoot, width, 0.18, 1.0, 0x527b4a, (start + end) / 2, 0.96, PARK.hedge.z, {
        castShadow: false
      });
      const shrubCount = Math.floor(width / 1.15);
      const shrubMaterial = makeMaterial(0x5f8752, { roughness: 1 });
      for (let i = 0; i < shrubCount; i += 1) {
        const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + (i % 3) * 0.05, 1), shrubMaterial);
        shrub.position.set(start + 0.55 + i * 1.15, 1.05, PARK.hedge.z + (i % 2 ? 0.08 : -0.08));
        shrub.castShadow = true;
        this.parkRoot.add(shrub);
      }
    }

    const stepX = (PARK.hedge.stepMinX + PARK.hedge.stepMaxX) / 2;
    for (let i = 0; i < 5; i += 1) {
      addBox(this.parkRoot, 3.7, 0.12 + i * 0.025, 0.34, i % 2 ? 0xc2ad86 : 0xd1bc94, stepX, 0.1 + i * 0.025, PARK.hedge.z - 0.68 + i * 0.34, {
        castShadow: true,
        receiveShadow: true
      });
    }
    addCylinder(this.parkRoot, 0.055, 0.055, 1.65, COLORS.metal, PARK.hedge.stepMinX + 0.1, 0.83, PARK.hedge.z, 8);
    addCylinder(this.parkRoot, 0.055, 0.055, 1.65, COLORS.metal, PARK.hedge.stepMaxX - 0.1, 0.83, PARK.hedge.z, 8);
    const stepLabel = makeLabelSprite('STEP SHORTCUT\nPedestrian only', {
      background: '#745124',
      scale: 0.66,
      maxWidth: 3.6,
      fontSize: 38
    });
    stepLabel.position.set(stepX, 1.75, PARK.hedge.z);
    this.parkRoot.add(stepLabel);

    addBox(this.parkRoot, 4.1, 0.08, 2.2, 0xc8d0c8, 31.5, 0.1, PARK.hedge.z, { castShadow: false, receiveShadow: true });
    addBox(this.parkRoot, 3.7, 0.025, 0.35, 0xe2bd4c, 31.5, 0.15, PARK.hedge.z - 0.82, { castShadow: false });
    const levelLabel = makeLabelSprite('LEVEL ACCESS', {
      background: '#256461',
      scale: 0.62,
      maxWidth: 3.3,
      fontSize: 36
    });
    levelLabel.position.set(31.5, 1.45, PARK.hedge.z);
    this.parkRoot.add(levelLabel);

    addFenceRun(this.parkRoot, PARK.minX, PARK.minZ, PARK.maxX, PARK.minZ);
    addFenceRun(this.parkRoot, PARK.minX, PARK.maxZ, PARK.maxX, PARK.maxZ);
    addFenceRun(this.parkRoot, PARK.minX, PARK.minZ, PARK.minX, -2.65, false, true);
    addFenceRun(this.parkRoot, PARK.minX, 2.65, PARK.minX, PARK.maxZ, true, false);
    addFenceRun(this.parkRoot, PARK.maxX, PARK.minZ, PARK.maxX, -2.65, false, true);
    addFenceRun(this.parkRoot, PARK.maxX, 2.65, PARK.maxX, PARK.maxZ, true, false);

    for (const entrance of PARK.entrances) addGate(this.parkRoot, entrance);
    PARK.trees.forEach((tree, index) => addTree(this.parkRoot, tree, index));

    const westWelcome = makeLabelSprite('FESTIVAL PROMENADE', {
      background: '#5e5436',
      scale: 0.62,
      maxWidth: 4.2,
      fontSize: 36
    });
    westWelcome.position.set(-24, 1.1, 0);
    this.parkRoot.add(westWelcome);
    const eastWelcome = makeLabelSprite('GARDEN LOOP', {
      background: '#5e5436',
      scale: 0.55,
      maxWidth: 3.2,
      fontSize: 34
    });
    eastWelcome.position.set(24, 1.05, 0);
    this.parkRoot.add(eastWelcome);
  }

  renderEquipment(equipment, selectedId = this.selectedId, overlapIds = this.overlapIds) {
    for (const root of this.equipmentRoots.values()) {
      this.equipmentRoot.remove(root);
      disposeObject(root);
    }
    this.equipmentRoots.clear();
    this.equipment = equipment;
    this.equipmentById = new Map(equipment.map((object) => [object.id, object]));
    this.selectedId = selectedId;
    this.overlapIds = overlapIds instanceof Set ? overlapIds : new Set(overlapIds || []);
    equipment.forEach((object, index) => {
      const root = buildEquipmentGroup(object, index);
      this.equipmentRoot.add(root);
      this.equipmentRoots.set(object.id, root);
    });
    this.updateFootprintStates();
  }

  updateFootprintStates() {
    for (const [id, root] of this.equipmentRoots) {
      const footprint = root.userData.footprint;
      if (!footprint) continue;
      const selected = id === this.selectedId;
      const overlapping = this.overlapIds.has(id);
      footprint.marker.visible = selected;
      if (overlapping) {
        footprint.fillMaterial.color.setHex(COLORS.danger);
        footprint.fillMaterial.opacity = selected ? 0.3 : 0.24;
        footprint.borderMaterial.color.setHex(COLORS.danger);
      } else if (selected) {
        footprint.fillMaterial.color.setHex(COLORS.selection);
        footprint.fillMaterial.opacity = 0.22;
        footprint.borderMaterial.color.setHex(COLORS.selection);
      } else {
        footprint.fillMaterial.color.setHex(footprint.accentColor);
        footprint.fillMaterial.opacity = 0.11;
        footprint.borderMaterial.color.setHex(footprint.accentColor);
      }
    }
  }

  setSelected(id) {
    this.selectedId = id;
    this.updateFootprintStates();
  }

  setOverlapIds(ids) {
    this.overlapIds = ids instanceof Set ? ids : new Set(ids || []);
    this.updateFootprintStates();
  }

  setSnap(enabled) {
    this.snap = Boolean(enabled);
  }

  updateObjectTransform(id, object) {
    const root = this.equipmentRoots.get(id);
    const stored = this.equipmentById.get(id);
    if (stored) Object.assign(stored, object);
    if (!root) return;
    root.position.set(object.x ?? root.position.x, 0, object.z ?? root.position.z);
    root.rotation.y = ((object.rotation ?? stored?.rotation ?? 0) * Math.PI) / 180;
  }

  setRoute(route) {
    this.clearRoute();
    if (!route) return;
    const target = route.targetId ? this.equipmentById.get(route.targetId) : null;
    if (route.status !== 'ok' || !route.path?.length) {
      if (target) {
        const material = new THREE.MeshBasicMaterial({ color: COLORS.danger, transparent: true, opacity: 0.9 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(1.2, Math.min(target.width, target.depth) * 0.46), 0.12, 8, 40), material);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(target.x, 0.32, target.z);
        ring.userData.pulseNoRoute = true;
        this.routeRoot.add(ring);
      }
      return;
    }

    const points = route.path.map((point) => new THREE.Vector3(point.x, 0.34, point.z));
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.route,
      roughness: 0.55,
      emissive: 0x0b453b,
      emissiveIntensity: 0.5
    });
    this.routeSegments = [];
    for (let i = 1; i < points.length; i += 1) {
      const start = points[i - 1];
      const end = points[i];
      const segment = cylinderBetween(start, end, 0.13, material, 8);
      segment.castShadow = false;
      segment.renderOrder = 3;
      this.routeRoot.add(segment);
      this.routeSegments.push({ start: start.clone(), end: end.clone(), length: start.distanceTo(end) });
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), material);
      joint.position.copy(end);
      joint.renderOrder = 3;
      this.routeRoot.add(joint);
    }

    const startRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.12, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xf4d067, roughness: 0.5, emissive: 0x5e4308, emissiveIntensity: 0.25 })
    );
    startRing.rotation.x = Math.PI / 2;
    startRing.position.copy(points[0]);
    this.routeRoot.add(startRing);

    const endRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.12, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x187f6e, roughness: 0.5, emissive: 0x0b453b, emissiveIntensity: 0.35 })
    );
    endRing.rotation.x = Math.PI / 2;
    endRing.position.copy(points[points.length - 1]);
    this.routeRoot.add(endRing);

    const beadMaterial = new THREE.MeshBasicMaterial({ color: 0xf7e7ae });
    this.routeBeads = [];
    const total = this.routeSegments.reduce((sum, segment) => sum + segment.length, 0);
    for (let i = 0; i < 4; i += 1) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), beadMaterial);
      bead.userData.offset = (i / 4) * total;
      bead.renderOrder = 4;
      this.routeRoot.add(bead);
      this.routeBeads.push(bead);
    }
    this.routeTotalLength = total;

    if (target) {
      const distanceLabel = makeLabelSprite(`${Number(route.distance).toFixed(1)} m · ${route.mode === 'step-free' ? 'STEP-FREE' : 'WALKING'}`, {
        background: '#155e54',
        color: '#fff9e7',
        border: 'rgba(245,212,112,.72)',
        scale: 0.66,
        maxWidth: 3.8,
        fontSize: 38
      });
      distanceLabel.position.set(target.x, 4.35, target.z + 0.5);
      this.routeRoot.add(distanceLabel);
    }
  }

  clearRoute() {
    for (const child of [...this.routeRoot.children]) {
      this.routeRoot.remove(child);
      disposeObject(child);
    }
    this.routeBeads = [];
    this.routeSegments = [];
  }

  setCameraMode(mode) {
    if (mode !== 'top' && mode !== 'orbit') return;
    this.cameraMode = mode;
    this.cameraTween = null;
    if (mode === 'top') {
      this.orbitControls.enabled = false;
      this.topControls.enabled = true;
      this.topControls.update();
    } else {
      this.topControls.enabled = false;
      this.orbitControls.enabled = true;
      this.orbitControls.update();
    }
  }

  resetCamera() {
    if (this.cameraMode === 'top') {
      this.tweenCamera(this.orthoCamera, this.topControls, new THREE.Vector3(0, 80, 0), new THREE.Vector3(0, 0, 0), 1);
    } else {
      this.frameOrbitCamera(true);
    }
  }

  frameOrbitCamera(animate = true) {
    const target = new THREE.Vector3(-1, 0, -2);
    const aspect = Math.max(0.45, this.perspectiveCamera.aspect || 1);
    const verticalFov = THREE.MathUtils.degToRad(this.perspectiveCamera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const widthDistance = (PARK.width + 8) / (2 * Math.tan(horizontalFov / 2));
    const depthDistance = (PARK.depth + 10) / (2 * Math.tan(verticalFov / 2));
    const distance = Math.max(76, widthDistance * 1.05, depthDistance * 1.12);
    const direction = new THREE.Vector3(52, 46, 58).normalize();
    const position = target.clone().add(direction.multiplyScalar(distance));
    if (animate) {
      this.tweenCamera(this.perspectiveCamera, this.orbitControls, position, target);
    } else {
      this.perspectiveCamera.position.copy(position);
      this.orbitControls.target.copy(target);
      this.orbitControls.update();
    }
  }

  zoomToObject(object) {
    if (!object) return;
    const targetY = object.type === 'stage' ? 1.8 : 1.1;
    if (this.cameraMode === 'top') {
      this.tweenCamera(
        this.orthoCamera,
        this.topControls,
        new THREE.Vector3(object.x, 80, object.z),
        new THREE.Vector3(object.x, 0, object.z),
        Math.max(this.orthoCamera.zoom, 2.05)
      );
      return;
    }
    const target = new THREE.Vector3(object.x, targetY, object.z);
    const direction = new THREE.Vector3().subVectors(this.perspectiveCamera.position, this.orbitControls.target).normalize();
    const desiredDistance = object.type === 'stage' ? 24 : 17;
    const position = target.clone().add(direction.multiplyScalar(desiredDistance));
    position.y = Math.max(11, position.y);
    this.tweenCamera(this.perspectiveCamera, this.orbitControls, position, target);
  }

  tweenCamera(camera, controls, toPosition, toTarget, toZoom = null) {
    this.cameraTween = {
      camera,
      controls,
      fromPosition: camera.position.clone(),
      toPosition: toPosition.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
      fromZoom: camera.zoom,
      toZoom: toZoom ?? camera.zoom,
      start: performance.now(),
      duration: 500
    };
  }

  resize() {
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();
    const frustumHeight = Math.max(58, 74 / aspect);
    this.orthoCamera.left = (-frustumHeight * aspect) / 2;
    this.orthoCamera.right = (frustumHeight * aspect) / 2;
    this.orthoCamera.top = frustumHeight / 2;
    this.orthoCamera.bottom = -frustumHeight / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  bindEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event), true);
    canvas.addEventListener('pointermove', (event) => this.updateCursor(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', (event) => this.onPointerUp(event));
    window.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', () => {
      this.cameraTween = null;
    });
  }

  setPointerFromEvent(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pickEquipment(event) {
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.activeCamera);
    const intersections = this.raycaster.intersectObjects(this.equipmentRoot.children, true);
    for (const intersection of intersections) {
      let node = intersection.object;
      while (node && !node.userData.equipmentId) node = node.parent;
      if (node?.userData.equipmentId) return node.userData.equipmentId;
    }
    return null;
  }

  updateCursor(event) {
    if (this.dragging) {
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const id = this.pickEquipment(event);
    this.renderer.domElement.style.cursor = id ? 'grab' : '';
  }

  onPointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    this.activePointers.add(event.pointerId);
    if (this.activePointers.size > 1) return;
    const id = this.pickEquipment(event);
    if (!id) return;
    const object = this.equipmentById.get(id);
    this.callbacks.onSelect?.(id);
    if (!object || object.fixed) return;

    event.preventDefault();
    event.stopPropagation();
    const point = new THREE.Vector3();
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.activeCamera);
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, point)) return;

    this.dragging = {
      id,
      startX: object.x,
      startZ: object.z,
      offsetX: object.x - point.x,
      offsetZ: object.z - point.z,
      moved: false,
      pointerId: event.pointerId
    };
    this.orbitControls.enabled = false;
    this.topControls.enabled = false;
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    document.body.classList.add('is-dragging');
    this.callbacks.onDragStart?.(id);
  }

  onPointerMove(event) {
    if (!this.dragging || event.pointerId !== this.dragging.pointerId) return;
    event.preventDefault();
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.activeCamera);
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPoint)) return;
    let x = this.dragPoint.x + this.dragging.offsetX;
    let z = this.dragPoint.z + this.dragging.offsetZ;
    if (this.snap) {
      x = Math.round(x);
      z = Math.round(z);
    }
    const result = this.callbacks.onDragMove?.(this.dragging.id, x, z);
    if (!result) return;
    const root = this.equipmentRoots.get(this.dragging.id);
    if (root) root.position.set(result.x, 0, result.z);
    if (Math.hypot(result.x - this.dragging.startX, result.z - this.dragging.startZ) > 0.02) {
      this.dragging.moved = true;
    }
  }

  onPointerUp(event) {
    this.activePointers.delete(event.pointerId);
    if (!this.dragging || event.pointerId !== this.dragging.pointerId) return;
    const drag = this.dragging;
    this.dragging = null;
    document.body.classList.remove('is-dragging');
    this.renderer.domElement.releasePointerCapture?.(event.pointerId);
    this.orbitControls.enabled = this.cameraMode !== 'top';
    this.topControls.enabled = this.cameraMode === 'top';
    this.callbacks.onDragEnd?.(drag.id, drag.moved);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.cameraTween) {
      const elapsed = performance.now() - this.cameraTween.start;
      const raw = Math.min(1, elapsed / this.cameraTween.duration);
      const t = 1 - (1 - raw) ** 3;
      const tween = this.cameraTween;
      tween.camera.position.lerpVectors(tween.fromPosition, tween.toPosition, t);
      tween.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t);
      tween.camera.zoom = THREE.MathUtils.lerp(tween.fromZoom, tween.toZoom, t);
      tween.camera.updateProjectionMatrix();
      tween.controls.update();
      if (raw >= 1) this.cameraTween = null;
    } else {
      if (this.orbitControls.enabled) this.orbitControls.update();
      if (this.topControls.enabled) this.topControls.update();
    }

    if (this.routeBeads.length && this.routeSegments.length) {
      this.routeClock = (this.routeClock || 0) + delta;
      const offsetBase = (this.routeClock * 4.2) % Math.max(1, this.routeTotalLength);
      for (const bead of this.routeBeads) {
        let distance = (offsetBase + bead.userData.offset) % Math.max(1, this.routeTotalLength);
        for (const segment of this.routeSegments) {
          if (distance <= segment.length) {
            const t = segment.length ? distance / segment.length : 0;
            bead.position.lerpVectors(segment.start, segment.end, t);
            break;
          }
          distance -= segment.length;
        }
      }
    }

    const noRouteRing = this.routeRoot.children.find((child) => child.userData.pulseNoRoute);
    if (noRouteRing) {
      const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08;
      noRouteRing.scale.setScalar(pulse);
    }

    this.renderer.render(this.scene, this.activeCamera);
  }
}
