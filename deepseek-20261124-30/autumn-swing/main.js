import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const canvas = document.querySelector('#scene');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});

renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe2aa75, 24, 59);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
const world = new THREE.Group();
scene.add(world);

const cameraState = {
  base: new THREE.Vector3(9.4, 5.25, 15.8),
  target: new THREE.Vector3(-0.25, 2.55, -0.9),
  pointer: new THREE.Vector2(),
  pointerTarget: new THREE.Vector2(),
};

const clock = new THREE.Clock();
let elapsed = 0;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const chance = mulberry32(90210);
const rand = (min, max) => min + (max - min) * chance();
const pick = (items) => items[Math.floor(chance() * items.length)];

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function terrainHeight(x, z) {
  const radius = Math.hypot(x, z * 0.78);
  const rise = smoothstep(8.5, 20, radius);
  const rolling =
    Math.sin(x * 0.27) * Math.cos(z * 0.22) * 0.46 +
    Math.sin((x - z) * 0.16) * 0.38 +
    Math.cos((x + z) * 0.105) * 0.25;
  return rise * rolling + Math.max(0, radius - 26) * 0.035;
}

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.93,
    metalness: 0,
    flatShading: true,
    ...options,
  });
}

const colors = {
  ground: 0x97894d,
  path: 0xd8b17d,
  pathEdge: 0x8b7553,
  darkWood: 0x503327,
  swingWood: 0x8b4b32,
  swingAccent: 0xb86942,
  rope: 0xdcc091,
  seat: 0xb97b45,
  trim: 0x695044,
  creamWall: 0xe8cfa0,
  sageWall: 0xb2ad83,
  roseWall: 0xd9b18e,
  roof: 0x814231,
  roofDark: 0x68352b,
  roofMoss: 0x6f6947,
  stone: 0x776c5d,
  window: 0xffc56a,
  pumpkin: 0xc9682f,
  pumpkinLight: 0xe08a3b,
  pumpkinStem: 0x596139,
  metal: 0x4b3e35,
};

const materials = {
  ground: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  }),
  path: standard(colors.path, { roughness: 1 }),
  pathEdge: standard(colors.pathEdge, { roughness: 1 }),
  darkWood: standard(colors.darkWood),
  swingWood: standard(colors.swingWood),
  swingAccent: standard(colors.swingAccent),
  rope: standard(colors.rope, { roughness: 1 }),
  seat: standard(colors.seat),
  trim: standard(colors.trim),
  creamWall: standard(colors.creamWall),
  sageWall: standard(colors.sageWall),
  roseWall: standard(colors.roseWall),
  roof: standard(colors.roof),
  roofDark: standard(colors.roofDark),
  roofMoss: standard(colors.roofMoss),
  stone: standard(colors.stone),
  window: standard(colors.window, {
    emissive: 0xffad45,
    emissiveIntensity: 0.85,
    roughness: 0.48,
  }),
  pumpkin: standard(colors.pumpkin),
  pumpkinLight: standard(colors.pumpkinLight),
  pumpkinStem: standard(colors.pumpkinStem),
  metal: standard(colors.metal, { roughness: 0.55, metalness: 0.3 }),
};

const foliageMaterials = [
  0xc75327,
  0xe18431,
  0xedaa47,
  0xa83e26,
  0xd66d2d,
  0xf0bc5a,
  0x9b6a32,
].map((color) => standard(color, { roughness: 0.96 }));

const bushMaterials = [0x998134, 0xb47437, 0x776b3d, 0xc9833a].map((color) =>
  standard(color, { roughness: 1 })
);

function addBox(parent, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinderBetween(parent, start, end, radius, material, segments = 6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius * 0.9, radius, length, segments);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildLighting() {
  const hemisphere = new THREE.HemisphereLight(0xffdfb2, 0x50452f, 1.6);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xf4c58e, 0.21);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffc27b, 3.05);
  sun.position.set(-8.5, 14.5, 9.5);
  sun.castShadow = true;
  const shadowSize = Math.min(window.innerWidth, window.innerHeight) < 620 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 42;
  sun.shadow.bias = -0.00055;
  sun.shadow.normalBias = 0.025;
  sun.target.position.set(0, 0, -1.2);
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(0xb9c9bd, 0.4);
  rim.position.set(10, 5, -12);
  scene.add(rim);
}

function buildGround() {
  const geometry = new THREE.PlaneGeometry(90, 90, 38, 38);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colorArray = new Float32Array(position.count * 3);
  const baseColor = new THREE.Color(colors.ground);
  const workingColor = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));

    const variation = Math.sin(x * 0.93 + z * 0.31) * 0.035;
    const variation2 = Math.cos(z * 0.72 - x * 0.18) * 0.022;
    workingColor
      .copy(baseColor)
      .offsetHSL(variation2, variation * 0.8, variation + variation2);
    colorArray[i * 3] = workingColor.r;
    colorArray[i * 3 + 1] = workingColor.g;
    colorArray[i * 3 + 2] = workingColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  geometry.computeVertexNormals();

  const ground = new THREE.Mesh(geometry, materials.ground);
  ground.receiveShadow = true;
  world.add(ground);

  const patches = [
    [-4.8, 1.0, 2.2, 1.15, 0x8b7f44],
    [3.2, 5.2, 1.5, 0.8, 0xa29451],
    [-2.4, -5.7, 1.9, 0.9, 0x8d8246],
    [7.4, -1.5, 1.6, 0.85, 0x948746],
  ];

  for (const [x, z, sx, sz, color] of patches) {
    const patchMaterial = standard(color, { roughness: 1 });
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 9), patchMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = rand(0, TAU);
    patch.scale.set(sx, sz, 1);
    patch.position.set(x, terrainHeight(x, z) + 0.012, z);
    patch.receiveShadow = true;
    world.add(patch);
  }
}

function buildPath() {
  const points = [
    new THREE.Vector3(7.8, 0, 10.8),
    new THREE.Vector3(6.5, 0, 7.8),
    new THREE.Vector3(5.0, 0, 5.0),
    new THREE.Vector3(4.05, 0, 2.25),
    new THREE.Vector3(3.9, 0, -0.5),
    new THREE.Vector3(4.55, 0, -3.15),
    new THREE.Vector3(5.0, 0, -6.15),
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.36);
  const segments = 90;
  const positions = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const halfWidth = (1.15 + Math.sin(t * 9.5) * 0.08) / 2;
    const left = point.clone().addScaledVector(side, halfWidth);
    const right = point.clone().addScaledVector(side, -halfWidth);

    positions.push(
      left.x,
      terrainHeight(left.x, left.z) + 0.045,
      left.z,
      right.x,
      terrainHeight(right.x, right.z) + 0.045,
      right.z
    );
    uvs.push(0, t * 6, 1, t * 6);

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const path = new THREE.Mesh(geometry, materials.path);
  path.receiveShadow = true;
  world.add(path);

  const stoneGeometry = new THREE.DodecahedronGeometry(0.17, 0);
  const stones = new THREE.InstancedMesh(stoneGeometry, materials.pathEdge, 30);
  const dummy = new THREE.Object3D();
  let stoneIndex = 0;

  for (let i = 0; i < 15; i += 1) {
    const t = 0.08 + i * 0.058;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (const direction of [-1, 1]) {
      const offset = 0.74 + rand(-0.03, 0.08);
      const x = point.x + side.x * offset * direction;
      const z = point.z + side.z * offset * direction;
      dummy.position.set(x, terrainHeight(x, z) + 0.08, z);
      dummy.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      dummy.scale.set(rand(0.7, 1.15), rand(0.32, 0.6), rand(0.8, 1.3));
      dummy.updateMatrix();
      stones.setMatrixAt(stoneIndex, dummy.matrix);
      stoneIndex += 1;
    }
  }

  stones.castShadow = true;
  stones.receiveShadow = true;
  world.add(stones);
}

function buildHill(x, z, sx, sy, sz, color) {
  const material = standard(color, { roughness: 1 });
  const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material);
  hill.position.set(x, -1.6, z);
  hill.scale.set(sx, sy, sz);
  hill.rotation.y = rand(0, TAU);
  hill.receiveShadow = true;
  world.add(hill);
}

function buildDistantLandscape() {
  buildHill(-17, -25, 12, 4.8, 8, 0x747a51);
  buildHill(7, -29, 18, 5.8, 10, 0x8b764b);
  buildHill(25, -24, 12, 4.2, 8, 0x6d714b);

  const farTreeMaterial = standard(0x81733f, { roughness: 1 });
  const farTrunkMaterial = standard(0x584536, { roughness: 1 });

  for (let i = 0; i < 9; i += 1) {
    const x = -21 + i * 5.2 + rand(-1.1, 1.1);
    const z = -20 - rand(0, 5);
    const scale = rand(0.8, 1.45);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 2.2 * scale, 5),
      farTrunkMaterial
    );
    trunk.position.set(x, terrainHeight(x, z) + 1.1 * scale, z);
    world.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15 * scale, 0),
      farTreeMaterial
    );
    crown.position.set(x, terrainHeight(x, z) + 2.8 * scale, z);
    crown.scale.set(1.15, 1.35, 1);
    world.add(crown);
  }
}

function buildTree({ x, z, scale = 1, tone = 0, rotation = 0 }) {
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z), z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  world.add(group);

  const trunkMaterial = standard(tone % 2 ? 0x5b3d2c : 0x67442f, { roughness: 1 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.34, 2.65, 6),
    trunkMaterial
  );
  trunk.position.y = 1.325;
  trunk.rotation.z = rand(-0.025, 0.025);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  addCylinderBetween(
    group,
    new THREE.Vector3(0, 1.75, 0),
    new THREE.Vector3(-0.58, 2.65, 0.1),
    0.105,
    trunkMaterial,
    5
  );
  addCylinderBetween(
    group,
    new THREE.Vector3(0.02, 1.9, 0),
    new THREE.Vector3(0.55, 2.75, -0.16),
    0.09,
    trunkMaterial,
    5
  );

  const clusterCount = 11;
  for (let i = 0; i < clusterCount; i += 1) {
    const angle = (i / clusterCount) * TAU + rand(-0.34, 0.34);
    const radius = i < 3 ? rand(0, 0.38) : rand(0.52, 1.38);
    const baseScale = i < 3 ? rand(0.9, 1.23) : rand(0.58, 0.92);
    const leafMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(baseScale, 0),
      pick(foliageMaterials)
    );
    leafMesh.position.set(
      Math.cos(angle) * radius,
      2.84 + rand(0, 1.62) + (i < 3 ? 0.36 : 0),
      Math.sin(angle) * radius * 0.72
    );
    leafMesh.scale.set(rand(0.88, 1.22), rand(0.82, 1.2), rand(0.85, 1.24));
    leafMesh.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    group.add(leafMesh);
  }

  return group;
}

function buildSwingSet() {
  const swingSet = new THREE.Group();
  swingSet.position.set(-0.55, 0, 0.75);
  world.add(swingSet);

  const topY = 4.36;
  const halfWidth = 2.7;
  const frontZ = 1.02;
  const backZ = -1.02;

  for (const sideX of [-halfWidth, halfWidth]) {
    for (const sideZ of [frontZ, backZ]) {
      addCylinderBetween(
        swingSet,
        new THREE.Vector3(sideX, 0.16, sideZ),
        new THREE.Vector3(sideX, topY, 0),
        0.145,
        materials.swingWood,
        6
      );
      addBox(swingSet, 0.48, 0.13, 0.58, materials.darkWood, sideX, 0.09, sideZ);
    }

    const brace = addCylinderBetween(
      swingSet,
      new THREE.Vector3(sideX, 1.02, backZ * 0.69),
      new THREE.Vector3(sideX, 1.02, frontZ * 0.69),
      0.09,
      materials.swingAccent,
      5
    );
    brace.castShadow = true;

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.15, 6),
      materials.metal
    );
    collar.position.set(sideX, topY - 0.02, 0);
    collar.rotation.z = Math.PI / 2;
    collar.castShadow = true;
    swingSet.add(collar);
  }

  addCylinderBetween(
    swingSet,
    new THREE.Vector3(-halfWidth - 0.17, topY, 0),
    new THREE.Vector3(halfWidth + 0.17, topY, 0),
    0.19,
    materials.swingWood,
    7
  );

  const capGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.055, 7);
  for (const sideX of [-halfWidth - 0.175, halfWidth + 0.175]) {
    const cap = new THREE.Mesh(capGeometry, materials.darkWood);
    cap.position.set(sideX, topY, 0);
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    swingSet.add(cap);
  }

  const swingPivots = [];
  const ropeLength = 2.55;

  for (const [index, x] of [-1.22, 1.22].entries()) {
    const pivot = new THREE.Group();
    pivot.position.set(x, topY, 0);
    swingSet.add(pivot);
    swingPivots.push(pivot);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.034, 4, 9),
      materials.metal
    );
    ring.rotation.y = Math.PI / 2;
    ring.castShadow = true;
    swingSet.add(ring);
    ring.position.set(x, topY, 0);

    for (const ropeX of [-0.34, 0.34]) {
      addCylinderBetween(
        pivot,
        new THREE.Vector3(ropeX, -0.03, 0),
        new THREE.Vector3(ropeX, -ropeLength, 0),
        0.026,
        materials.rope,
        5
      );
    }

    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(0.87, 0.12, 0.39, 2, 0.045),
      materials.seat
    );
    seat.position.set(0, -ropeLength - 0.05, 0.015);
    seat.castShadow = true;
    seat.receiveShadow = true;
    pivot.add(seat);

    for (const xOffset of [-0.34, 0.34]) {
      const knot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.045, 0.14, 5),
        materials.darkWood
      );
      knot.position.set(xOffset, -ropeLength + 0.01, 0);
      pivot.add(knot);
    }

    if (index === 1) {
      addChildToSwing(pivot, ropeLength);
    }
  }

  return swingPivots;
}

function addChildToSwing(pivot, ropeLength) {
  const child = new THREE.Group();
  child.position.set(0, -ropeLength + 0.09, 0.05);
  pivot.add(child);

  const coatMaterial = standard(0xb4522f);
  const scarfMaterial = standard(0xe2a14a);
  const skinMaterial = standard(0xd69a72);
  const hairMaterial = standard(0x4d352a);
  const trouserMaterial = standard(0x59483d);
  const shoeMaterial = standard(0x3d3028);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.55, 6), coatMaterial);
  torso.position.y = 0.3;
  torso.castShadow = true;
  child.add(torso);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.205, 1), skinMaterial);
  head.position.set(0, 0.75, 0.025);
  head.scale.set(0.94, 1.04, 0.9);
  head.castShadow = true;
  child.add(head);

  const hat = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 8, 4, 0, TAU, 0, Math.PI / 2),
    hairMaterial
  );
  hat.position.set(0, 0.84, 0);
  hat.castShadow = true;
  child.add(hat);

  const hatBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.224, 0.224, 0.065, 8),
    scarfMaterial
  );
  hatBand.position.set(0, 0.835, 0);
  child.add(hatBand);

  const pompom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.058, 0), scarfMaterial);
  pompom.position.set(0, 1.015, 0);
  pompom.castShadow = true;
  child.add(pompom);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 4, 9), scarfMaterial);
  scarf.position.set(0, 0.53, 0);
  scarf.rotation.x = Math.PI / 2;
  scarf.castShadow = true;
  child.add(scarf);

  const scarfTail = addBox(child, 0.11, 0.34, 0.035, scarfMaterial, 0.16, 0.38, -0.13);
  scarfTail.rotation.z = -0.24;
  scarfTail.rotation.x = -0.15;

  for (const armX of [-1, 1]) {
    addCylinderBetween(
      child,
      new THREE.Vector3(armX * 0.18, 0.47, 0.03),
      new THREE.Vector3(armX * 0.34, 0.04, 0.02),
      0.055,
      coatMaterial,
      5
    );
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.058, 0), skinMaterial);
    hand.position.set(armX * 0.34, 0.01, 0.02);
    hand.castShadow = true;
    child.add(hand);
  }

  for (const legX of [-0.11, 0.11]) {
    addCylinderBetween(
      child,
      new THREE.Vector3(legX, 0.06, 0.02),
      new THREE.Vector3(legX * 1.25, -0.4, 0.13),
      0.058,
      trouserMaterial,
      5
    );
    addBox(child, 0.13, 0.09, 0.23, shoeMaterial, legX * 1.25, -0.44, 0.19);
  }
}

function addWindow(parent, x, y, z, rotationY = 0, width = 0.78, height = 0.84) {
  const windowGroup = new THREE.Group();
  windowGroup.position.set(x, y, z);
  windowGroup.rotation.y = rotationY;
  parent.add(windowGroup);

  const frame = addBox(windowGroup, width, height, 0.08, materials.trim, 0, 0, 0);
  frame.castShadow = true;

  const pane = addBox(
    windowGroup,
    width - 0.15,
    height - 0.15,
    0.095,
    materials.window,
    0,
    0,
    0.008
  );
  pane.castShadow = false;

  addBox(windowGroup, 0.055, height - 0.15, 0.025, materials.trim, 0, 0, 0.061);
  addBox(windowGroup, width - 0.15, 0.055, 0.025, materials.trim, 0, 0, 0.061);

  const sill = addBox(windowGroup, width + 0.14, 0.08, 0.2, materials.darkWood, 0, -height / 2 - 0.02, 0.045);
  sill.castShadow = true;

  return windowGroup;
}

function buildHouse({
  x,
  z,
  rotation = 0,
  scale = 1,
  wallMaterial,
  roofMaterial,
  width = 3.35,
  depth = 2.9,
  wallHeight = 2.28,
  doorOffset = 0,
  windowOffset = 0.98,
  smoke = false,
}) {
  const house = new THREE.Group();
  house.position.set(x, terrainHeight(x, z) + 0.01, z);
  house.rotation.y = rotation;
  house.scale.setScalar(scale);
  world.add(house);

  const foundationHeight = 0.2;
  addBox(
    house,
    width + 0.12,
    foundationHeight,
    depth + 0.12,
    materials.stone,
    0,
    foundationHeight / 2,
    0
  );

  addBox(
    house,
    width,
    wallHeight,
    depth,
    wallMaterial,
    0,
    foundationHeight + wallHeight / 2,
    0
  );

  addBox(
    house,
    width + 0.05,
    0.075,
    depth + 0.05,
    materials.trim,
    0,
    foundationHeight + wallHeight - 0.04,
    0
  );

  for (const trimX of [-width / 2 + 0.04, width / 2 - 0.04]) {
    addBox(
      house,
      0.075,
      wallHeight,
      0.075,
      materials.trim,
      trimX,
      foundationHeight + wallHeight / 2,
      depth / 2 + 0.02
    );
  }

  const roofWidth = width * 1.18;
  const roofDepth = depth * 1.16;
  const roofHeight = 1.22;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-roofWidth / 2, 0);
  roofShape.lineTo(roofWidth / 2, 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.closePath();

  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
    depth: roofDepth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  roofGeometry.translate(0, 0, -roofDepth / 2);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = foundationHeight + wallHeight;
  roof.castShadow = true;
  roof.receiveShadow = true;
  house.add(roof);

  addBox(
    house,
    roofWidth + 0.05,
    0.075,
    roofDepth + 0.05,
    materials.darkWood,
    0,
    foundationHeight + wallHeight + 0.015,
    0
  );

  const frontZ = depth / 2 + 0.055;
  addWindow(house, -windowOffset, 1.6, frontZ);
  addWindow(house, windowOffset, 1.6, frontZ);
  addWindow(house, width / 2 + 0.045, 1.62, 0.25, Math.PI / 2, 0.7, 0.8);

  const doorGroup = new THREE.Group();
  doorGroup.position.set(doorOffset, 0, frontZ);
  house.add(doorGroup);

  addBox(doorGroup, 0.82, 1.36, 0.09, materials.trim, 0, 0.88, 0);
  const door = addBox(doorGroup, 0.68, 1.2, 0.1, materials.darkWood, 0, 0.81, 0.012);
  door.castShadow = true;
  addBox(doorGroup, 0.48, 0.5, 0.025, materials.trim, 0, 1.04, 0.065);
  const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.038, 0), materials.swingAccent);
  knob.position.set(0.22, 0.77, 0.08);
  doorGroup.add(knob);
  addBox(doorGroup, 1.02, 0.13, 0.5, materials.stone, 0, 0.09, 0.2);

  const awning = addBox(
    house,
    1.38,
    0.11,
    0.68,
    roofMaterial,
    doorOffset,
    1.78,
    frontZ + 0.23
  );
  awning.rotation.x = -0.08;

  const chimneyWidth = 0.4;
  const chimneyX = -width * 0.31;
  addBox(
    house,
    chimneyWidth,
    1.34,
    chimneyWidth,
    materials.stone,
    chimneyX,
    foundationHeight + wallHeight + 0.8,
    -0.46
  );
  addBox(
    house,
    chimneyWidth + 0.12,
    0.09,
    chimneyWidth + 0.12,
    materials.darkWood,
    chimneyX,
    foundationHeight + wallHeight + 1.48,
    -0.46
  );

  if (smoke) {
    buildSmoke(
      house,
      chimneyX,
      foundationHeight + wallHeight + 1.57,
      -0.46
    );
  }

  return house;
}

const smokePuffs = [];

function buildSmoke(parent, x, y, z) {
  const puffGeometry = new THREE.IcosahedronGeometry(1, 0);

  for (let i = 0; i < 6; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xf3dac0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: true,
    });
    const puff = new THREE.Mesh(puffGeometry, material);
    puff.position.set(x, y, z);
    parent.add(puff);
    smokePuffs.push({
      mesh: puff,
      origin: new THREE.Vector3(x, y, z),
      phase: i / 6,
      speed: 0.085 + i * 0.003,
      drift: rand(-0.2, 0.2),
    });
  }
}

function buildPicketFence() {
  const fence = new THREE.Group();
  fence.position.set(-1.8, 0, -4.1);
  fence.rotation.y = 0.015;
  world.add(fence);

  const fenceWidth = 8.8;
  const railMaterial = standard(0xc3a579, { roughness: 1 });
  const postMaterial = standard(0xa9835e, { roughness: 1 });

  addBox(fence, fenceWidth, 0.095, 0.11, railMaterial, 0, 0.3, 0);
  addBox(fence, fenceWidth, 0.095, 0.11, railMaterial, 0, 0.62, 0);

  for (let i = 0; i <= Math.floor(fenceWidth / 0.44); i += 1) {
    const x = -fenceWidth / 2 + i * 0.44;
    const height = 0.78 + Math.sin(i * 2.7) * 0.015;
    addBox(fence, 0.085, height, 0.075, railMaterial, x, height / 2, 0);
  }

  for (let i = 0; i <= 5; i += 1) {
    const x = -fenceWidth / 2 + (i / 5) * fenceWidth;
    addBox(fence, 0.15, 0.9, 0.16, postMaterial, x, 0.45, 0.01);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 4), postMaterial);
    cap.position.set(x, 0.975, 0.01);
    cap.rotation.y = Math.PI / 4;
    cap.castShadow = true;
    fence.add(cap);
  }
}

function buildLampPost() {
  const lamp = new THREE.Group();
  const x = 3.48;
  const z = -3.18;
  lamp.position.set(x, terrainHeight(x, z), z);
  world.add(lamp);

  const postMaterial = standard(0x5c4031, { roughness: 0.8, metalness: 0.15 });
  const metalMaterial = standard(0x473b34, { roughness: 0.6, metalness: 0.25 });
  const glowMaterial = standard(0xffd18a, {
    emissive: 0xff9f3f,
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });

  addCylinderBetween(
    lamp,
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 2.05, 0),
    0.065,
    postMaterial,
    6
  );
  addBox(lamp, 0.34, 0.07, 0.34, metalMaterial, 0, 0.09, 0);
  addBox(lamp, 0.34, 0.42, 0.34, glowMaterial, 0, 2.23, 0).castShadow = false;
  addBox(lamp, 0.43, 0.08, 0.43, metalMaterial, 0, 2.02, 0);
  addBox(lamp, 0.43, 0.08, 0.43, metalMaterial, 0, 2.45, 0);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.24, 4), metalMaterial);
  cap.position.y = 2.6;
  cap.rotation.y = Math.PI / 4;
  cap.castShadow = true;
  lamp.add(cap);

  const light = new THREE.PointLight(0xffb35d, 1.4, 6.5, 2);
  light.position.set(0, 2.25, 0);
  lamp.add(light);
}

function buildMailbox() {
  const mailbox = new THREE.Group();
  const x = 6.08;
  const z = -4.75;
  mailbox.position.set(x, terrainHeight(x, z), z);
  mailbox.rotation.y = -0.08;
  world.add(mailbox);

  addCylinderBetween(
    mailbox,
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1.1, 0),
    0.055,
    materials.darkWood,
    5
  );
  addBox(mailbox, 0.34, 0.28, 0.61, standard(0x9f4e35), 0, 1.22, 0);

  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.61, 6, 1, false, 0, Math.PI),
    standard(0xb45a3a)
  );
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.set(0, 1.37, 0);
  lid.castShadow = true;
  mailbox.add(lid);

  const flagPole = addBox(mailbox, 0.025, 0.3, 0.025, materials.metal, 0.2, 1.43, 0.03);
  flagPole.rotation.z = -0.03;
  addBox(mailbox, 0.16, 0.1, 0.02, standard(0xe4a14c), 0.29, 1.53, 0.03);
}

function buildPumpkin(x, z, scale = 1, light = false) {
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z), z);
  group.rotation.y = rand(0, TAU);
  world.add(group);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 5),
    light ? materials.pumpkinLight : materials.pumpkin
  );
  body.scale.set(scale, scale * 0.74, scale);
  body.position.y = scale * 0.34;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045 * scale, 0.065 * scale, 0.24 * scale, 5),
    materials.pumpkinStem
  );
  stem.position.y = scale * 0.73;
  stem.rotation.z = rand(-0.14, 0.14);
  stem.castShadow = true;
  group.add(stem);
}

function buildBush(x, z, scale, materialIndex = 0) {
  const bush = new THREE.Group();
  bush.position.set(x, terrainHeight(x, z), z);
  world.add(bush);

  for (let i = 0; i < 4; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(rand(0.32, 0.48) * scale, 0),
      bushMaterials[(materialIndex + i) % bushMaterials.length]
    );
    leaf.position.set(rand(-0.42, 0.42) * scale, rand(0.24, 0.43) * scale, rand(-0.27, 0.27) * scale);
    leaf.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    bush.add(leaf);
  }
}

function makeLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.28);
  shape.lineTo(0.12, 0.14);
  shape.lineTo(0.16, -0.02);
  shape.lineTo(0.08, -0.16);
  shape.lineTo(0, -0.28);
  shape.lineTo(-0.08, -0.16);
  shape.lineTo(-0.16, -0.02);
  shape.lineTo(-0.12, 0.14);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function buildLeaves() {
  const leafGeometry = makeLeafGeometry();
  const flatLeafGeometry = leafGeometry.clone();
  flatLeafGeometry.rotateX(-Math.PI / 2);
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const leafColors = [
    0xb94726,
    0xd46b28,
    0xe38c32,
    0xeeaf4a,
    0x9b3e23,
    0xc15a2b,
    0xe3a846,
  ];

  const groundLeafCount = 185;
  const groundLeaves = new THREE.InstancedMesh(flatLeafGeometry, leafMaterial, groundLeafCount);
  const dummy = new THREE.Object3D();
  const anchors = [
    [-6.6, -0.4],
    [7.7, -2.0],
    [-5.2, -6.3],
    [1.1, -13.2],
    [-0.55, 0.75],
    [-2.4, 2.4],
    [5.2, 2.5],
  ];

  for (let i = 0; i < groundLeafCount; i += 1) {
    const useAnchor = i < 132;
    let x;
    let z;

    if (useAnchor) {
      const [anchorX, anchorZ] = anchors[i % anchors.length];
      const angle = rand(0, TAU);
      const radius = Math.sqrt(chance()) * rand(1.2, 4.1);
      x = anchorX + Math.cos(angle) * radius;
      z = anchorZ + Math.sin(angle) * radius * 0.78;
    } else {
      x = rand(-8.5, 9.5);
      z = rand(-7.5, 8.5);
    }

    dummy.position.set(x, terrainHeight(x, z) + 0.035, z);
    dummy.rotation.set(rand(-0.08, 0.08), rand(0, TAU), rand(-0.08, 0.08));
    const leafScale = rand(0.26, 0.62);
    dummy.scale.set(leafScale * rand(0.82, 1.2), 1, leafScale);
    dummy.updateMatrix();
    groundLeaves.setMatrixAt(i, dummy.matrix);
    groundLeaves.setColorAt(i, new THREE.Color(leafColors[i % leafColors.length]));
  }

  groundLeaves.receiveShadow = true;
  groundLeaves.instanceMatrix.needsUpdate = true;
  groundLeaves.instanceColor.needsUpdate = true;
  world.add(groundLeaves);

  const fallingCount = 44;
  const fallingLeaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, fallingCount);
  fallingLeaves.frustumCulled = false;
  fallingLeaves.castShadow = false;
  fallingLeaves.receiveShadow = false;
  const fallingStates = [];

  for (let i = 0; i < fallingCount; i += 1) {
    const anchor = pick(anchors.slice(0, 5));
    const state = {
      x: anchor[0] + rand(-3.4, 3.4),
      z: anchor[1] + rand(-2.8, 2.8),
      y: rand(0.5, 5.8),
      fallSpeed: rand(0.18, 0.38),
      sway: rand(0.35, 0.85),
      swaySpeed: rand(0.45, 1.1),
      phase: rand(0, TAU),
      spin: rand(-1.4, 1.4),
      rotation: new THREE.Vector3(rand(0, TAU), rand(0, TAU), rand(0, TAU)),
      scale: rand(0.23, 0.48),
    };
    fallingStates.push(state);
    fallingLeaves.setColorAt(i, new THREE.Color(leafColors[(i + 2) % leafColors.length]));
  }

  fallingLeaves.instanceColor.needsUpdate = true;
  world.add(fallingLeaves);

  return { fallingLeaves, fallingStates, dummy };
}

function buildBirds() {
  const birds = new THREE.Group();
  world.add(birds);
  const material = new THREE.LineBasicMaterial({
    color: 0x5c4c42,
    transparent: true,
    opacity: 0.46,
    fog: false,
  });

  const positions = [
    [-0.42, 0, 0.04, 0, 0.14, 0, 0.42, 0, 0.04],
    [-0.3, 0, 0, 0, 0.1, 0, 0.3, 0, 0],
  ];

  for (let i = 0; i < 4; i += 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions[i % 2], 3));
    const bird = new THREE.Line(geometry, material);
    bird.position.set(rand(-8, 8), rand(6.2, 8.7), rand(-18, -12));
    bird.scale.setScalar(rand(0.75, 1.35));
    birds.add(bird);
  }

  return birds;
}

function buildDetails() {
  buildPicketFence();
  buildLampPost();
  buildMailbox();

  buildPumpkin(2.5, 1.85, 0.82, false);
  buildPumpkin(3.05, 1.7, 0.52, true);
  buildPumpkin(-2.4, -3.44, 0.68, false);
  buildPumpkin(6.02, -6.18, 0.9, true);
  buildPumpkin(6.75, -6.32, 0.58, false);

  buildBush(-7.1, -5.35, 1.05, 0);
  buildBush(7.25, -6.4, 0.92, 1);
  buildBush(2.0, -6.95, 0.75, 2);
  buildBush(-3.1, 1.5, 0.66, 3);
}

function buildNeighborhood() {
  buildGround();
  buildDistantLandscape();
  buildPath();

  buildTree({ x: -6.55, z: -0.35, scale: 1.42, tone: 0, rotation: 0.45 });
  buildTree({ x: 7.75, z: -2.05, scale: 1.2, tone: 1, rotation: -0.3 });
  buildTree({ x: -5.2, z: -6.3, scale: 0.96, tone: 0, rotation: 1.2 });
  buildTree({ x: 1.15, z: -13.1, scale: 0.98, tone: 1, rotation: -1.0 });

  buildHouse({
    x: 5.05,
    z: -8.05,
    rotation: -0.08,
    scale: 1.08,
    wallMaterial: materials.creamWall,
    roofMaterial: materials.roof,
    doorOffset: 0.05,
    smoke: true,
  });

  buildHouse({
    x: -5.72,
    z: -9.55,
    rotation: 0.16,
    scale: 0.88,
    wallMaterial: materials.sageWall,
    roofMaterial: materials.roofMoss,
    width: 3.1,
    depth: 2.7,
    wallHeight: 2.14,
    doorOffset: -0.22,
    smoke: true,
  });

  buildHouse({
    x: 0.5,
    z: -15.3,
    rotation: -0.24,
    scale: 0.68,
    wallMaterial: materials.roseWall,
    roofMaterial: materials.roofDark,
    width: 3.15,
    depth: 2.65,
    wallHeight: 2.08,
    doorOffset: 0.18,
    smoke: false,
  });

  buildDetails();
  const pivots = buildSwingSet();
  const leaves = buildLeaves();
  const birds = buildBirds();

  return { pivots, leaves, birds };
}

function configureCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;

  if (aspect < 0.72) {
    camera.fov = 44;
    cameraState.base.set(11.2, 6.7, 24.6);
    cameraState.target.set(-0.25, 2.5, -0.7);
  } else if (aspect < 1.2) {
    camera.fov = 42;
    cameraState.base.set(10.2, 5.85, 19.8);
    cameraState.target.set(-0.25, 2.55, -0.8);
  } else {
    camera.fov = 40;
    cameraState.base.set(9.4, 5.25, 15.8);
    cameraState.target.set(-0.25, 2.55, -0.9);
  }

  camera.position.copy(cameraState.base);
  camera.lookAt(cameraState.target);
  camera.updateProjectionMatrix();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  configureCamera();
}

buildLighting();
const neighborhood = buildNeighborhood();
resize();
window.addEventListener('resize', resize);

if (!prefersReducedMotion) {
  window.addEventListener('pointermove', (event) => {
    cameraState.pointerTarget.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * 2 - 1
    );
  });

  window.addEventListener('pointerleave', () => {
    cameraState.pointerTarget.set(0, 0);
  });
}

const lightState = {
  ambientSway: 0,
};

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += prefersReducedMotion ? 0 : delta;
  const time = elapsed;

  cameraState.pointer.lerp(cameraState.pointerTarget, 0.045);
  const parallaxStrength = window.innerWidth / window.innerHeight < 0.72 ? 0.24 : 0.48;
  const driftX = Math.sin(time * 0.13) * 0.035;
  const driftY = Math.cos(time * 0.17) * 0.022;

  camera.position.set(
    cameraState.base.x + cameraState.pointer.x * parallaxStrength + driftX,
    cameraState.base.y - cameraState.pointer.y * parallaxStrength * 0.46 + driftY,
    cameraState.base.z
  );
  camera.lookAt(
    cameraState.target.x + cameraState.pointer.x * 0.12,
    cameraState.target.y + cameraState.pointer.y * 0.08,
    cameraState.target.z
  );

  const [leftSwing, rightSwing] = neighborhood.pivots;
  if (prefersReducedMotion) {
    leftSwing.rotation.x = -0.08;
    rightSwing.rotation.x = 0.1;
  } else {
    leftSwing.rotation.x = Math.sin(time * 0.77 + 0.3) * 0.2 - 0.05;
    rightSwing.rotation.x = Math.sin(time * 0.68 + 1.15) * 0.17 + 0.07;
  }

  const { fallingLeaves, fallingStates, dummy } = neighborhood.leaves;
  for (let i = 0; i < fallingStates.length; i += 1) {
    const leaf = fallingStates[i];
    if (!prefersReducedMotion) {
      leaf.y -= leaf.fallSpeed * delta;
      leaf.rotation.x += leaf.spin * delta * 0.7;
      leaf.rotation.y += leaf.spin * delta;
      leaf.rotation.z += leaf.spin * delta * 0.55;
      if (leaf.y < 0.12) {
        leaf.y = rand(4.6, 6.4);
        leaf.x = rand(-9.5, 9.5);
        leaf.z = rand(-7.5, 6.5);
      }
    }

    dummy.position.set(
      leaf.x + Math.sin(time * leaf.swaySpeed + leaf.phase) * leaf.sway,
      leaf.y + Math.cos(time * 0.47 + leaf.phase) * 0.1,
      leaf.z + Math.cos(time * leaf.swaySpeed * 0.63 + leaf.phase) * 0.22
    );
    dummy.rotation.set(leaf.rotation.x, leaf.rotation.y, leaf.rotation.z);
    dummy.scale.setScalar(leaf.scale);
    dummy.updateMatrix();
    fallingLeaves.setMatrixAt(i, dummy.matrix);
  }
  fallingLeaves.instanceMatrix.needsUpdate = true;

  for (const puff of smokePuffs) {
    const life = (time * puff.speed + puff.phase) % 1;
    puff.mesh.position.set(
      puff.origin.x + Math.sin(time * 0.3 + puff.phase * 8) * 0.12 + life * puff.drift,
      puff.origin.y + life * 2.3,
      puff.origin.z + Math.cos(time * 0.22 + puff.phase * 9) * 0.1
    );
    const scale = 0.14 + life * 0.44;
    puff.mesh.scale.setScalar(scale);
    puff.mesh.rotation.set(time * 0.08 + puff.phase, time * 0.11, 0);
    puff.mesh.material.opacity = Math.sin(life * Math.PI) * 0.175;
  }

  neighborhood.birds.position.x = Math.sin(time * 0.045) * 0.45;
  neighborhood.birds.position.y = Math.cos(time * 0.12) * 0.08;

  lightState.ambientSway = time;
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
