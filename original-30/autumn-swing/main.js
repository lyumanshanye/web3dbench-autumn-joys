import * as THREE from 'three';

const canvas = document.querySelector('#scene');
const loadingScreen = document.querySelector('#loading-screen');
const exploreHint = document.querySelector('#explore-hint');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd68a62);
scene.fog = new THREE.Fog(0xe5ae7d, 24, 57);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
const cameraBase = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
let currentFov = 36;

const pointer = new THREE.Vector2();
const smoothPointer = new THREE.Vector2();
let autoWander = !reduceMotion;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(1042);

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    ...options,
  });
}

const materials = {
  wood: material(0x7b4d31),
  woodDark: material(0x533529),
  woodLight: material(0x9c6a42),
  chain: material(0x4b3730, { roughness: 0.65, metalness: 0.18 }),
  cream: material(0xe9d1aa),
  creamLight: material(0xf3dfbd),
  roof: material(0x67463a),
  rust: material(0x9f5237),
  rustDark: material(0x753a2b),
  orange: material(0xc4693a),
  orangeLight: material(0xd68a42),
  gold: material(0xd5a84e),
  goldLight: material(0xe2be6e),
  red: material(0xa74b34),
  green: material(0x6f7951),
  greenLight: material(0x8a8b58),
  teal: material(0x52756c),
  soil: material(0x795b3e),
  stone: material(0xb59a77),
};

const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffc871,
  emissive: 0xff9a3f,
  emissiveIntensity: 1.25,
  roughness: 0.45,
});

function addShadow(mesh, receive = false) {
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  return mesh;
}

function makeSky() {
  const geometry = new THREE.SphereGeometry(72, 36, 20);
  const positions = geometry.attributes.position;
  const colors = [];
  const top = new THREE.Color(0xa9574f);
  const middle = new THREE.Color(0xd98260);
  const horizon = new THREE.Color(0xf2c27f);
  const low = new THREE.Color(0xdba06d);

  for (let index = 0; index < positions.count; index += 1) {
    const height = positions.getY(index) / 72;
    const color = new THREE.Color();

    if (height < 0) {
      color.lerpColors(low, horizon, THREE.MathUtils.smoothstep(height, -0.18, 0));
    } else if (height < 0.36) {
      color.lerpColors(horizon, middle, THREE.MathUtils.smoothstep(height, 0, 0.36));
    } else {
      color.lerpColors(middle, top, THREE.MathUtils.smoothstep(height, 0.36, 0.92));
    }

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const skyMaterial = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    vertexColors: true,
    fog: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sky = new THREE.Mesh(geometry, skyMaterial);
  sky.renderOrder = -10;
  scene.add(sky);
}

makeSky();

const hemisphere = new THREE.HemisphereLight(0xffe7c0, 0x6b5137, 1.55);
scene.add(hemisphere);

const sunlight = new THREE.DirectionalLight(0xffce93, 3.05);
sunlight.position.set(12, 16, -10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -18;
sunlight.shadow.camera.right = 18;
sunlight.shadow.camera.top = 18;
sunlight.shadow.camera.bottom = -18;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 55;
sunlight.shadow.bias = -0.0003;
sunlight.shadow.normalBias = 0.025;
sunlight.target.position.set(0, 0, -2);
scene.add(sunlight, sunlight.target);

const fillLight = new THREE.DirectionalLight(0xbaccc2, 0.48);
fillLight.position.set(6, 6, 12);
scene.add(fillLight);

const sunPosition = new THREE.Vector3(14.5, 12.5, -25);
const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(2.2, 16, 10),
  new THREE.MeshBasicMaterial({ color: 0xffdda0, fog: false, toneMapped: false }),
);
sunDisc.position.copy(sunPosition);
scene.add(sunDisc);

function makeGlowTexture() {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const context = glowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 5, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 238, 185, 1)');
  gradient.addColorStop(0.16, 'rgba(255, 210, 131, .72)');
  gradient.addColorStop(0.52, 'rgba(255, 178, 94, .18)');
  gradient.addColorStop(1, 'rgba(255, 160, 75, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(glowCanvas);
}

const glowTexture = makeGlowTexture();
const sunGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffcf8a,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  }),
);
sunGlow.position.copy(sunPosition);
sunGlow.scale.set(14, 14, 1);
scene.add(sunGlow);

function createCloud(x, y, z, scale) {
  const cloud = new THREE.Group();
  const cloudMaterial = material(0xf4d9ba, {
    roughness: 1,
    transparent: true,
    opacity: 0.82,
    emissive: 0x6d3e31,
    emissiveIntensity: 0.16,
  });
  const lumps = [
    [-1.35, -0.1, 0, 1.05],
    [-0.4, 0.24, 0.05, 1.34],
    [0.72, 0.06, -0.04, 1.12],
    [1.52, -0.16, 0.08, 0.78],
    [0.15, -0.26, 0.46, 1.05],
  ];
  lumps.forEach(([px, py, pz, size], index) => {
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    const lump = new THREE.Mesh(geometry, cloudMaterial);
    lump.position.set(px, py, pz);
    lump.scale.y = 0.58 + index * 0.015;
    cloud.add(lump);
  });
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
}

createCloud(-12, 13.5, -27, 1.55);
createCloud(4, 16, -34, 1.15);
createCloud(18, 9.5, -30, 1.7);

function createGround() {
  const geometry = new THREE.PlaneGeometry(76, 76, 24, 24);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const distance = Math.hypot(x, z);
    const edgeWeight = THREE.MathUtils.smoothstep(distance, 5, 17);
    const undulation = Math.sin(x * 0.43 + z * 0.18) * 0.1 + Math.cos(z * 0.31) * 0.07;
    positions.setY(index, -0.05 + undulation * edgeWeight);
  }
  geometry.computeVertexNormals();

  const groundMaterial = material(0x888052, { roughness: 1 });
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);

  const clearing = new THREE.Mesh(
    new THREE.CircleGeometry(10.5, 13),
    material(0x9d945d, { roughness: 1 }),
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.rotation.z = 0.16;
  clearing.position.set(-0.1, 0.008, 0.1);
  clearing.receiveShadow = true;
  scene.add(clearing);
}

createGround();

function createPath(points, width) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.24,
  );
  const samples = 68;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index <= samples; index += 1) {
    const amount = index / samples;
    const point = curve.getPointAt(amount);
    const tangent = curve.getTangentAt(amount).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const currentWidth = width * (0.92 + Math.sin(index * 0.58) * 0.055);
    const left = point.clone().addScaledVector(side, currentWidth * 0.5);
    const right = point.clone().addScaledVector(side, -currentWidth * 0.5);
    left.y = 0.052;
    right.y = 0.052;
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(0, amount, 1, amount);

    if (index < samples) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const path = new THREE.Mesh(geometry, material(0xc7a271, { roughness: 1 }));
  path.receiveShadow = true;
  scene.add(path);
}

createPath(
  [
    [2.45, 11.5],
    [2.3, 8.1],
    [1.2, 5.6],
    [-1.35, 3.7],
    [-2.2, 1.2],
    [-1.4, -1.6],
    [-2.25, -4.7],
    [-3.75, -8.2],
  ],
  1.05,
);

function cylinderBetween(start, end, radius, meshMaterial, segments = 7) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius * 0.86, radius, length, segments, 1);
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createSwingSet() {
  const swingSet = new THREE.Group();
  const topY = 4.42;
  const halfWidth = 3.65;
  const topBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, halfWidth * 2 + 0.8, 8),
    materials.wood,
  );
  topBeam.rotation.z = Math.PI / 2;
  topBeam.position.y = topY;
  addShadow(topBeam);
  swingSet.add(topBeam);

  [-1, 1].forEach((sideSign) => {
    const x = sideSign * halfWidth;
    const top = new THREE.Vector3(x, topY - 0.04, 0);
    const frontFoot = new THREE.Vector3(x, 0.05, 1.92);
    const backFoot = new THREE.Vector3(x, 0.05, -1.92);
    const frontLeg = cylinderBetween(frontFoot, top, 0.19, materials.wood, 8);
    const backLeg = cylinderBetween(backFoot, top, 0.19, materials.wood, 8);
    addShadow(frontLeg);
    addShadow(backLeg);
    swingSet.add(frontLeg, backLeg);

    const braceStart = new THREE.Vector3(x, 1.38, -1.15);
    const braceEnd = new THREE.Vector3(x, 1.38, 1.15);
    const brace = cylinderBetween(braceStart, braceEnd, 0.09, materials.woodDark, 6);
    addShadow(brace);
    swingSet.add(brace);

    [frontFoot, backFoot].forEach((foot) => {
      const footing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.38, 0.18, 7),
        materials.woodDark,
      );
      footing.position.set(foot.x, 0.09, foot.z);
      footing.receiveShadow = true;
      swingSet.add(footing);
    });

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.12, 8),
      materials.woodDark,
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(x, topY, 0);
    swingSet.add(cap);
  });

  const swingData = [];
  const swingSeats = [
    { x: -1.72, color: 0xc76047, phase: 0.7, speed: 0.78, amplitude: 0.19 },
    { x: 1.72, color: 0x52766e, phase: 3.45, speed: 0.72, amplitude: 0.165 },
  ];

  swingSeats.forEach((data, swingIndex) => {
    const pivot = new THREE.Group();
    pivot.position.set(data.x, topY - 0.2, 0);
    swingSet.add(pivot);

    [-1, 1].forEach((chainSide) => {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 2.18, 5),
        materials.chain,
      );
      chain.position.set(chainSide * 0.5, -1.06, 0);
      addShadow(chain);
      pivot.add(chain);

      const connector = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.023, 4, 8),
        materials.chain,
      );
      connector.position.set(data.x > 0 ? chainSide * 0.5 : chainSide * 0.5, -0.04, 0);
      connector.rotation.x = Math.PI / 2;
      pivot.add(connector);
    });

    const seatGroup = new THREE.Group();
    seatGroup.position.y = -2.22;
    pivot.add(seatGroup);

    const seatMaterial = material(data.color, { roughness: 0.72 });
    for (let slatIndex = 0; slatIndex < 5; slatIndex += 1) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.205, 0.09, 0.38),
        seatMaterial,
      );
      slat.position.x = (slatIndex - 2) * 0.225;
      addShadow(slat);
      seatGroup.add(slat);
    }

    [-1, 1].forEach((boltSide) => {
      const bolt = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 6, 4),
        materials.woodDark,
      );
      bolt.position.set(boltSide * 0.51, 0.05, 0);
      seatGroup.add(bolt);
    });

    swingData.push({
      pivot,
      seatGroup,
      phase: data.phase,
      speed: data.speed,
      amplitude: data.amplitude,
      offset: swingIndex * 0.02,
    });
  });

  swingSet.position.set(0, 0, -0.35);
  scene.add(swingSet);
  return swingData;
}

const swingData = createSwingSet();

function createPumpkin(x, z, scale, rotation = 0) {
  const pumpkin = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 9, 6),
    material(0xc46132, { roughness: 0.86 }),
  );
  body.scale.set(1, 0.72, 1);
  body.position.y = 0.29;
  body.rotation.y = rotation;
  addShadow(body, true);
  pumpkin.add(body);

  for (let rib = 0; rib < 5; rib += 1) {
    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.018, 3, 8, Math.PI * 1.4),
      materials.rustDark,
    );
    ridge.position.y = 0.3;
    ridge.rotation.set(Math.PI / 2, 0.3, (rib / 5) * Math.PI);
    ridge.scale.set(1, 1, 0.73);
    pumpkin.add(ridge);
  }

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 0.24, 5),
    materials.green,
  );
  stem.position.y = 0.62;
  stem.rotation.z = -0.18;
  pumpkin.add(stem);

  pumpkin.position.set(x, 0.02, z);
  pumpkin.scale.setScalar(scale);
  pumpkin.rotation.y = rotation;
  scene.add(pumpkin);
}

createPumpkin(-3.55, 1.18, 1.05, 0.2);
createPumpkin(-3.05, 1.48, 0.72, -0.35);
createPumpkin(3.75, 1.02, 0.92, -0.5);
createPumpkin(4.18, 1.35, 0.58, 0.4);
createPumpkin(-6.3, -4.72, 0.8, 0.8);

function createShrub(x, z, scale, color) {
  const shrub = new THREE.Group();
  const shrubMaterial = material(color, { roughness: 1 });
  const clusters = [
    [0, 0.28, 0, 0.48],
    [0.36, 0.23, 0.08, 0.35],
    [-0.35, 0.2, -0.05, 0.32],
  ];
  clusters.forEach(([px, py, pz, size], index) => {
    const cluster = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), shrubMaterial);
    cluster.position.set(px, py, pz);
    cluster.scale.y = 0.82 + index * 0.05;
    addShadow(cluster);
    shrub.add(cluster);
  });
  shrub.position.set(x, 0.04, z);
  shrub.scale.setScalar(scale);
  scene.add(shrub);
}

createShrub(-5.2, -4.85, 1.1, 0x74794e);
createShrub(-4.45, -4.85, 0.82, 0x9a733e);
createShrub(4.6, -4.9, 1.14, 0x858052);
createShrub(5.4, -4.85, 0.8, 0xa86b3b);
createShrub(-4.65, 2.5, 0.78, 0x737c4f);
createShrub(5.2, 2.0, 0.72, 0x8c7d47);

function createTree(x, z, scale, palette) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.3, 3.25, 7),
    materials.woodDark,
  );
  trunk.position.y = 1.6;
  addShadow(trunk);
  tree.add(trunk);

  const branchA = cylinderBetween(
    new THREE.Vector3(0, 1.75, 0),
    new THREE.Vector3(-0.72, 2.92, 0.12),
    0.1,
    materials.woodDark,
    6,
  );
  const branchB = cylinderBetween(
    new THREE.Vector3(0, 2.1, 0),
    new THREE.Vector3(0.64, 3.22, -0.08),
    0.09,
    materials.woodDark,
    6,
  );
  addShadow(branchA);
  addShadow(branchB);
  tree.add(branchA, branchB);

  const canopyLayout = [
    [-0.7, 3.72, 0.06, 1.2, 0],
    [0.42, 3.95, -0.12, 1.34, 1],
    [1.16, 3.45, 0.1, 1.02, 2],
    [-1.28, 3.26, -0.18, 0.82, 1],
    [0.02, 4.62, 0.04, 1.05, 2],
  ];

  canopyLayout.forEach(([px, py, pz, size, colorIndex], index) => {
    const canopyMaterial = material(palette[colorIndex % palette.length]);
    const canopy = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      canopyMaterial,
    );
    canopy.position.set(px, py, pz);
    canopy.rotation.set(index * 0.21, index * 0.53, index * 0.15);
    canopy.scale.set(1.04, 0.92, 1);
    canopy.userData.baseY = canopy.position.y;
    canopy.userData.phase = random() * Math.PI * 2;
    addShadow(canopy);
    tree.add(canopy);
  });

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 8),
    materials.soil,
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.025;
  dirt.receiveShadow = true;
  tree.add(dirt);

  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  tree.rotation.y = random() * Math.PI * 2;
  scene.add(tree);
  return tree;
}

createTree(-8.9, -1.9, 1.42, [0xb85b36, 0xd07a3e, 0xa94b33]);
createTree(9.1, -1.1, 1.32, [0xd1973f, 0xb76534, 0xe0ae55]);
createTree(-4.65, -7.5, 0.92, [0xc77639, 0xa34c31, 0xd59a43]);
createTree(5.7, -8.3, 1.04, [0xc98c3a, 0xb25435, 0xdeaa50]);
createTree(-13.2, -9.8, 1.1, [0x9f4e34, 0xcd783d, 0xba6336]);
createTree(13.6, -10.8, 1.18, [0xc28539, 0xa74e32, 0xd4a04d]);

function createGableRoof(width, depth, height, roofMaterial) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const vertices = new Float32Array([
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    0, height, halfDepth,
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    0, height, -halfDepth,
  ]);
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, roofMaterial);
}

function createHouse({ x, z, width = 4.4, depth = 3.5, height = 2.75, rotation = 0, bodyColor, roofColor, scale = 1 }) {
  const house = new THREE.Group();
  const bodyMaterial = material(bodyColor, { roughness: 0.98 });
  const roofMaterial = material(roofColor, { roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMaterial);
  body.position.y = height / 2;
  addShadow(body, true);
  house.add(body);

  const roof = createGableRoof(width + 0.5, depth + 0.52, 1.65, roofMaterial);
  roof.position.y = height;
  addShadow(roof, true);
  house.add(roof);

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 1.24, 0.38),
    materials.rustDark,
  );
  chimney.position.set(-width * 0.27, height + 1.1, -depth * 0.16);
  addShadow(chimney);
  house.add(chimney);

  const chimneyCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.12, 0.48),
    materials.stone,
  );
  chimneyCap.position.set(chimney.position.x, height + 1.75, chimney.position.z);
  house.add(chimneyCap);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 1.23, 0.09),
    materials.rust,
  );
  door.position.set(0, 0.63, depth / 2 + 0.055);
  house.add(door);

  const doorKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 4),
    materials.goldLight,
  );
  doorKnob.position.set(0.2, 0.65, depth / 2 + 0.115);
  house.add(doorKnob);

  const step = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.16, 0.44),
    materials.stone,
  );
  step.position.set(0, 0.08, depth / 2 + 0.3);
  step.receiveShadow = true;
  house.add(step);

  [-1, 1].forEach((side) => {
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 1.03, 0.075),
      materials.creamLight,
    );
    windowFrame.position.set(side * width * 0.27, height * 0.61, depth / 2 + 0.06);
    house.add(windowFrame);

    const windowPane = new THREE.Mesh(
      new THREE.BoxGeometry(0.73, 0.82, 0.085),
      windowMaterial,
    );
    windowPane.position.set(side * width * 0.27, height * 0.61, depth / 2 + 0.105);
    house.add(windowPane);

    const verticalBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.84, 0.035),
      materials.creamLight,
    );
    verticalBar.position.set(side * width * 0.27, height * 0.61, depth / 2 + 0.158);
    house.add(verticalBar);

    const horizontalBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.045, 0.035),
      materials.creamLight,
    );
    horizontalBar.position.set(side * width * 0.27, height * 0.61, depth / 2 + 0.158);
    house.add(horizontalBar);

    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.95, 0.07),
      materials.rust,
    );
    shutter.position.set(side * width * 0.27 + side * 0.59, height * 0.61, depth / 2 + 0.06);
    house.add(shutter);
  });

  const atticFrame = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 10),
    materials.creamLight,
  );
  atticFrame.position.set(0, height + 0.73, depth / 2 + 0.006);
  house.add(atticFrame);

  const atticWindow = new THREE.Mesh(
    new THREE.CircleGeometry(0.23, 10),
    windowMaterial,
  );
  atticWindow.position.set(0, height + 0.73, depth / 2 + 0.012);
  house.add(atticWindow);

  house.position.set(x, 0, z);
  house.rotation.y = rotation;
  house.scale.setScalar(scale);
  scene.add(house);
  return house;
}

createHouse({
  x: -7.85,
  z: -9.15,
  width: 4.35,
  depth: 3.5,
  height: 2.72,
  rotation: 0.12,
  bodyColor: 0xe2c191,
  roofColor: 0x684038,
  scale: 0.94,
});

createHouse({
  x: 7.85,
  z: -8.6,
  width: 4.75,
  depth: 3.7,
  height: 2.92,
  rotation: -0.18,
  bodyColor: 0xd6ae83,
  roofColor: 0x824b37,
  scale: 1.02,
});

createHouse({
  x: 0.8,
  z: -15.5,
  width: 4.1,
  depth: 3.35,
  height: 2.6,
  rotation: 0.03,
  bodyColor: 0xcba47e,
  roofColor: 0x72443a,
  scale: 0.82,
});

function createFence(startX, endX, z) {
  const fence = new THREE.Group();
  const length = Math.abs(endX - startX);
  const center = (startX + endX) / 2;

  [0.37, 0.59].forEach((height) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.065, 0.11),
      materials.cream,
    );
    rail.position.set(center, height, z);
    fence.add(rail);
  });

  const picketCount = Math.max(2, Math.round(length / 0.44));
  for (let index = 0; index <= picketCount; index += 1) {
    const picket = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.78, 0.12),
      materials.cream,
    );
    picket.position.set(
      Math.min(startX, endX) + (index / picketCount) * length,
      0.39,
      z,
    );
    fence.add(picket);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.115, 0.19, 4),
      materials.cream,
    );
    tip.rotation.y = Math.PI / 4;
    tip.position.set(picket.position.x, 0.86, z);
    fence.add(tip);
  }

  scene.add(fence);
}

createFence(-9.8, -4.05, -5.4);
createFence(4.05, 9.8, -5.4);

function createLampPost() {
  const lamp = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.12, 3.35, 7),
    materials.woodDark,
  );
  post.position.y = 1.68;
  addShadow(post);
  lamp.add(post);

  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.25, 0.24, 7),
    materials.woodDark,
  );
  foot.position.y = 0.12;
  addShadow(foot);
  lamp.add(foot);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.07, 0.07),
    materials.woodDark,
  );
  arm.position.set(0.27, 3.22, 0);
  lamp.add(arm);

  const lantern = new THREE.Group();
  lantern.position.set(0.57, 3.04, 0);
  const lanternLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.4, 0.32),
    new THREE.MeshStandardMaterial({
      color: 0xffd48b,
      emissive: 0xffa84c,
      emissiveIntensity: 2.1,
      transparent: true,
      opacity: 0.9,
      roughness: 0.5,
    }),
  );
  lantern.add(lanternLight);

  const lanternTop = new THREE.Mesh(
    new THREE.ConeGeometry(0.29, 0.23, 4),
    materials.woodDark,
  );
  lanternTop.rotation.y = Math.PI / 4;
  lanternTop.position.y = 0.31;
  lantern.add(lanternTop);

  const lanternBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.08, 0.4),
    materials.woodDark,
  );
  lanternBase.position.y = -0.25;
  lantern.add(lanternBase);
  lamp.add(lantern);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffbd68,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.set(0.57, 3.04, 0);
  glow.scale.set(2.1, 2.1, 1);
  lamp.add(glow);

  const pointLight = new THREE.PointLight(0xffb15d, 7, 8, 2);
  pointLight.position.set(0.57, 3.04, 0);
  lamp.add(pointLight);

  lamp.position.set(5.45, 0, 3.65);
  lamp.rotation.y = -0.75;
  scene.add(lamp);
  return pointLight;
}

const lampLight = createLampPost();

function createLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.15);
  shape.bezierCurveTo(0.14, -0.08, 0.15, 0.06, 0, 0.2);
  shape.bezierCurveTo(-0.15, 0.06, -0.14, -0.08, 0, -0.15);
  return new THREE.ShapeGeometry(shape, 3);
}

const leafGeometry = createLeafGeometry();
const leafColors = [0xc45c3e, 0xdf9844, 0xa74731, 0xe1b95f];

function createGroundLeaves() {
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const count = 230;
  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const radius = 2.4 + Math.sqrt(random()) * 12.2;
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * radius * 1.1;
    const z = Math.sin(angle) * radius * 0.65 - 0.4;
    dummy.position.set(x, 0.072 + random() * 0.02, z);
    dummy.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.15, 0, random() * Math.PI * 2);
    const size = 0.72 + random() * 1.25;
    dummy.scale.set(size, size, size);
    dummy.updateMatrix();
    leaves.setMatrixAt(index, dummy.matrix);
    color.setHex(leafColors[Math.floor(random() * leafColors.length)]);
    leaves.setColorAt(index, color);
  }

  leaves.instanceMatrix.needsUpdate = true;
  leaves.instanceColor.needsUpdate = true;
  leaves.receiveShadow = true;
  scene.add(leaves);
}

createGroundLeaves();

const floatingLeaves = [];

function createFloatingLeaves() {
  const floatingMaterials = leafColors.map((color) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    side: THREE.DoubleSide,
    flatShading: true,
  }));

  for (let index = 0; index < 34; index += 1) {
    const leaf = new THREE.Mesh(
      leafGeometry,
      floatingMaterials[index % floatingMaterials.length],
    );
    const startY = 2.4 + random() * 7.8;
    leaf.position.set(-9 + random() * 18, startY, -7 + random() * 16);
    leaf.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    leaf.scale.setScalar(0.75 + random() * 0.95);
    leaf.userData = {
      speed: 0.22 + random() * 0.3,
      sway: 0.25 + random() * 0.5,
      phase: random() * Math.PI * 2,
      spin: (random() - 0.5) * 1.7,
      startX: leaf.position.x,
    };
    floatingLeaves.push(leaf);
    scene.add(leaf);
  }
}

createFloatingLeaves();

function createHills() {
  const hillMaterial = material(0x916046, { roughness: 1 });
  const hillPositions = [
    [-22, -31, 13, 4.2, 8],
    [3, -35, 16, 5.4, 9],
    [24, -30, 14, 4.8, 8],
  ];
  hillPositions.forEach(([x, z, sx, sy, sz]) => {
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), hillMaterial);
    hill.position.set(x, -0.7, z);
    hill.scale.set(sx, sy, sz);
    hill.rotation.y = random() * Math.PI;
    scene.add(hill);
  });
}

createHills();

function createGrassTufts() {
  const tuftMaterial = material(0x6f7548);
  const tuftGeometry = new THREE.ConeGeometry(0.06, 0.36, 3);
  const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, 95);
  const dummy = new THREE.Object3D();

  for (let index = 0; index < 95; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (5.6 + random() * 6.3);
    const z = -4.4 + random() * 12;
    dummy.position.set(x, 0.16, z);
    dummy.rotation.set((random() - 0.5) * 0.22, random() * Math.PI, (random() - 0.5) * 0.24);
    dummy.scale.set(0.75 + random() * 0.9, 0.8 + random() * 1.1, 0.75 + random() * 0.9);
    dummy.updateMatrix();
    tufts.setMatrixAt(index, dummy.matrix);
  }

  tufts.instanceMatrix.needsUpdate = true;
  tufts.castShadow = true;
  scene.add(tufts);
}

createGrassTufts();

function layoutCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 0.78) {
    cameraBase.set(9.9, 7.1, 17.7);
    cameraTarget.set(0, 2.55, -0.9);
    currentFov = 45;
  } else if (aspect < 1.15) {
    cameraBase.set(8.9, 5.9, 15.5);
    cameraTarget.set(0, 2.35, -0.9);
    currentFov = 40;
  } else {
    cameraBase.set(8.45, 5.25, 13.7);
    cameraTarget.set(0, 2.18, -0.9);
    currentFov = 36;
  }
  camera.fov = currentFov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.position.copy(cameraBase);
  lookTarget.copy(cameraTarget);
  camera.lookAt(lookTarget);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  layoutCamera();
}

layoutCamera();
window.addEventListener('resize', resize);

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener('pointerleave', () => {
  pointer.set(0, 0);
});

exploreHint.addEventListener('click', () => {
  autoWander = !autoWander;
  exploreHint.setAttribute(
    'aria-label',
    autoWander ? 'Pause the gentle camera movement' : 'Resume the gentle camera movement',
  );
  exploreHint.querySelector('span:nth-child(2)').textContent = autoWander
    ? 'Move to wander'
    : 'Camera at rest';
});

const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;

  smoothPointer.lerp(pointer, 0.035);
  const drift = autoWander && !reduceMotion ? 1 : 0;
  const driftX = Math.sin(elapsed * 0.115) * 0.2 * drift;
  const driftY = Math.cos(elapsed * 0.14) * 0.1 * drift;
  const driftZ = Math.cos(elapsed * 0.095) * 0.16 * drift;

  camera.position.set(
    cameraBase.x + driftX + smoothPointer.x * 0.72,
    cameraBase.y + driftY - smoothPointer.y * 0.34,
    cameraBase.z + driftZ,
  );
  lookTarget.set(
    cameraTarget.x + smoothPointer.x * 0.1,
    cameraTarget.y + smoothPointer.y * 0.045,
    cameraTarget.z,
  );
  camera.lookAt(lookTarget);

  swingData.forEach((swing) => {
    const motion = reduceMotion ? 0.36 : 1;
    swing.pivot.rotation.x =
      Math.sin(elapsed * swing.speed + swing.phase) * swing.amplitude * motion;
    swing.pivot.rotation.z = Math.sin(elapsed * swing.speed * 0.37 + swing.phase) * 0.012 * motion;
    swing.seatGroup.rotation.x = -swing.pivot.rotation.x * 0.53;
  });

  floatingLeaves.forEach((leaf) => {
    leaf.position.y -= leaf.userData.speed * delta * (reduceMotion ? 0.25 : 1);
    leaf.position.x =
      leaf.userData.startX + Math.sin(elapsed * 0.7 + leaf.userData.phase) * leaf.userData.sway;
    leaf.rotation.x += leaf.userData.spin * delta * 0.45;
    leaf.rotation.z += leaf.userData.spin * delta * 0.65;

    if (leaf.position.y < 0.15) {
      leaf.position.y = 7.8 + random() * 3.3;
      leaf.userData.startX = -9 + random() * 18;
      leaf.position.x = leaf.userData.startX;
    }
  });

  lampLight.intensity = 6.8 + Math.sin(elapsed * 1.9) * 0.28 + Math.sin(elapsed * 4.7) * 0.12;
  sunGlow.material.opacity = 0.86 + Math.sin(elapsed * 0.33) * 0.04;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    renderer.shadowMap.autoUpdate = false;
    requestAnimationFrame(() => {
      loadingScreen.classList.add('is-hidden');
    });
  }
}

animate();
