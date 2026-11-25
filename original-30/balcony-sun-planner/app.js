import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  SAMPLE_LOCATIONS,
  compassName,
  directionInBalconySpace,
  formatClock,
  getSolarDay,
  getSolarPosition,
} from './solar.js';

const BALCONY = {
  width: 7.5,
  depth: 3.2,
  railHeight: 1.06,
  overhangY: 2.83,
  wallHeight: 3.08,
};

const PLANTER_BOUNDS = {
  minX: -3.02,
  maxX: 3.02,
  minZ: -1.03,
  maxZ: 1.15,
};

const DEFAULT_DATE = '2026-11-12';
const DEFAULT_TIME = 630;
const DEFAULT_LOCATION = 'dubai';
const DEFAULT_ORIENTATION = 180;

const PLAN_META = {
  A: {
    letter: 'A',
    name: 'Social corner',
    subtitle: 'Lounge-forward',
    positions: [
      [-2.72, -0.58],
      [-1.55, 0.61],
      [0.22, -0.93],
      [2.71, -0.55],
      [-2.55, 1.02],
      [0.92, 0.9],
    ],
  },
  B: {
    letter: 'B',
    name: 'Green retreat',
    subtitle: 'Garden-first',
    positions: [
      [-2.7, 0.76],
      [0.36, 1.01],
      [-1.2, -0.85],
      [2.68, 1.0],
      [2.2, -0.56],
      [-0.66, 0.27],
    ],
  },
};

const PLANT_DEFS = [
  {
    id: 'monstera',
    name: 'Monstera',
    kind: 'monstera',
    pot: 0xb76443,
    potAccent: 0x8e4b32,
    lightY: 1.16,
    scale: 1,
    uiColor: '#4f775b',
  },
  {
    id: 'olive',
    name: 'Olive',
    kind: 'olive',
    pot: 0xc8b79c,
    potAccent: 0xa9987c,
    lightY: 1.03,
    scale: 0.95,
    uiColor: '#6b7d4d',
  },
  {
    id: 'fern',
    name: 'Fern',
    kind: 'fern',
    pot: 0x687f72,
    potAccent: 0x4c6557,
    lightY: 0.77,
    scale: 0.9,
    uiColor: '#4f785e',
  },
  {
    id: 'citrus',
    name: 'Citrus',
    kind: 'citrus',
    pot: 0xd2c0a2,
    potAccent: 0xb5a082,
    lightY: 1.09,
    scale: 1,
    uiColor: '#3f6d4c',
  },
  {
    id: 'snake',
    name: 'Snake plant',
    kind: 'snake',
    pot: 0x9b6c55,
    potAccent: 0x7e5542,
    lightY: 0.84,
    scale: 0.92,
    uiColor: '#66805c',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    kind: 'lavender',
    pot: 0xc77a59,
    potAccent: 0x9e5c42,
    lightY: 0.77,
    scale: 0.88,
    uiColor: '#7b759b',
  },
];

const state = {
  activePlan: 'A',
  locationId: DEFAULT_LOCATION,
  date: DEFAULT_DATE,
  orientation: DEFAULT_ORIENTATION,
  minutes: DEFAULT_TIME,
  playing: false,
};

let stageReady = false;

const materialCache = new Map();
const geometryCache = new Map();
const occluderMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
});

const axisY = new THREE.Vector3(0, 1, 0);
const rayDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const scratchPoint = new THREE.Vector3();

function getMaterial(color, options = {}) {
  const key = JSON.stringify({ color, ...options });
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.83,
        metalness: options.metalness ?? 0,
        flatShading: options.flatShading ?? false,
        side: options.side ?? THREE.FrontSide,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
        alphaTest: options.alphaTest ?? 0,
      }),
    );
  }
  return materialCache.get(key);
}

function getBoxGeometry(width, height, depth) {
  const key = `box:${width}:${height}:${depth}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(width, height, depth));
  return geometryCache.get(key);
}

function getCylinderGeometry(radiusTop, radiusBottom, height, segments = 16) {
  const key = `cyl:${radiusTop}:${radiusBottom}:${height}:${segments}`;
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments));
  }
  return geometryCache.get(key);
}

function getIcosahedronGeometry(detail = 1) {
  const key = `ico:${detail}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.IcosahedronGeometry(1, detail));
  return geometryCache.get(key);
}

function addMesh(parent, geometry, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.scale) mesh.scale.set(...options.scale);
  mesh.castShadow = options.cast ?? true;
  mesh.receiveShadow = options.receive ?? true;
  parent.add(mesh);
  if (options.occluders) options.occluders.push(mesh);
  return mesh;
}

function addBox(parent, width, height, depth, material, x, y, z, options = {}) {
  return addMesh(parent, getBoxGeometry(width, height, depth), material, x, y, z, options);
}

function addCylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, options = {}) {
  return addMesh(
    parent,
    getCylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 16),
    material,
    x,
    y,
    z,
    options,
  );
}

function addCylinderBetween(parent, start, end, radius, material, occluders = null) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(getCylinderGeometry(radius, radius, length, 7), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(axisY, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (occluders) occluders.push(mesh);
  return mesh;
}

function hash(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function createSky() {
  const geometry = new THREE.SphereGeometry(55, 32, 18);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x7da6b4) },
      horizonColor: { value: new THREE.Color(0xe8ddd0) },
      lowSunColor: { value: new THREE.Color(0xf0b267) },
      sunDirection: { value: new THREE.Vector3(0, 0.5, 0.7).normalize() },
      lowSun: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 lowSunColor;
      uniform vec3 sunDirection;
      uniform float lowSun;
      varying vec3 vWorldPosition;
      void main() {
        vec3 direction = normalize(vWorldPosition);
        float heightMix = smoothstep(-0.05, 0.8, direction.y);
        vec3 color = mix(horizonColor, topColor, heightMix);
        color = mix(color, lowSunColor, lowSun * (1.0 - smoothstep(0.02, 0.5, direction.y)) * 0.78);
        float sunAmount = max(dot(direction, normalize(sunDirection)), 0.0);
        color += vec3(1.0, 0.72, 0.28) * pow(sunAmount, 360.0) * 2.3;
        color += vec3(1.0, 0.72, 0.34) * pow(sunAmount, 14.0) * 0.1;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  return sky;
}

function createSceneContext(isPlan = false) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(isPlan ? 0xdce5df : 0xb8ccca);
  if (!isPlan) scene.fog = new THREE.Fog(0xb9c9c3, 18, 48);

  const occluders = [];
  let sky = null;
  if (!isPlan) {
    sky = createSky();
    scene.add(sky);
  }

  const hemisphere = new THREE.HemisphereLight(0xdbe9e4, 0x6a5947, 0.82);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfff3dd, isPlan ? 0.25 : 0.16);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffdfad, 2.55);
  sun.castShadow = !isPlan;
  sun.shadow.mapSize.set(isPlan ? 512 : 1024, isPlan ? 512 : 1024);
  sun.shadow.camera.left = -8.3;
  sun.shadow.camera.right = 8.3;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 32;
  sun.shadow.bias = -0.00045;
  sun.shadow.normalBias = 0.018;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);

  addBalconyArchitecture(scene, occluders, isPlan);
  addFurniture(scene, occluders, isPlan);

  return { scene, sun, hemisphere, ambient, occluders, sky };
}

function addBalconyArchitecture(scene, occluders, isPlan) {
  const halfWidth = BALCONY.width / 2;
  const halfDepth = BALCONY.depth / 2;

  addBox(scene, 7.85, 0.18, 3.55, getMaterial(0x8b765f), 0, -0.11, 0, {
    cast: false,
    receive: true,
  });

  const plankColors = [0xa47b57, 0xad835d, 0x9b7150, 0xb08760, 0xa57b58, 0x9d734f, 0xac815b, 0xa67c55, 0x9e7552];
  const plankDepth = BALCONY.depth / 9 - 0.008;
  for (let index = 0; index < 9; index += 1) {
    const z = -halfDepth + (index + 0.5) * (BALCONY.depth / 9);
    addBox(scene, BALCONY.width - 0.04, 0.045, plankDepth, getMaterial(plankColors[index]), 0, 0.014, z, {
      cast: false,
      receive: true,
    });
  }

  const groutMaterial = getMaterial(0x745f4a, { roughness: 0.94 });
  for (let index = 1; index < 9; index += 1) {
    const z = -halfDepth + index * (BALCONY.depth / 9);
    addBox(scene, BALCONY.width, 0.01, 0.012, groutMaterial, 0, 0.041, z, {
      cast: false,
      receive: true,
    });
  }

  const plaster = getMaterial(0xd9d0c1, { roughness: 0.92 });
  const wallShade = getMaterial(0xcfc4b1, { roughness: 0.95 });
  const capMaterial = getMaterial(0xe2d9ca, { roughness: 0.9 });

  addBox(scene, BALCONY.width + 0.18, BALCONY.wallHeight, 0.18, plaster, 0, BALCONY.wallHeight / 2, -halfDepth - 0.09, {
    occluders,
  });
  addBox(scene, BALCONY.width + 0.3, 0.1, 0.28, capMaterial, 0, BALCONY.wallHeight + 0.04, -halfDepth - 0.08, {
    occluders,
  });

  addBox(scene, 0.18, BALCONY.wallHeight, BALCONY.depth + 0.18, wallShade, -halfWidth - 0.09, BALCONY.wallHeight / 2, 0, {
    occluders,
  });
  addBox(scene, 0.1, 0.12, BALCONY.depth + 0.36, capMaterial, -halfWidth - 0.09, BALCONY.wallHeight + 0.04, 0, {
    occluders,
  });

  const grooveMaterial = getMaterial(0xbaa991, { roughness: 0.94 });
  for (let index = 0; index < 4; index += 1) {
    addBox(scene, 0.012, 1.25, 0.022, grooveMaterial, -halfWidth + 0.008, 1.15, -1.05 + index * 0.7, {
      cast: false,
      receive: true,
    });
  }

  const overhang = getMaterial(0xded6c8, { roughness: 0.9 });
  const overhangEdge = getMaterial(0xc8bead, { roughness: 0.93 });
  addBox(scene, BALCONY.width + 0.42, 0.17, BALCONY.depth + 0.58, overhang, 0, BALCONY.overhangY, 0.1, {
    occluders,
  });
  addBox(scene, BALCONY.width + 0.42, 0.13, 0.12, overhangEdge, 0, BALCONY.overhangY - 0.11, halfDepth + 0.34, {
    occluders,
  });
  addBox(scene, 0.12, 0.13, BALCONY.depth + 0.42, overhangEdge, halfWidth + 0.27, BALCONY.overhangY - 0.11, 0.08, {
    occluders,
  });

  const metal = getMaterial(0x26312e, { roughness: 0.48, metalness: 0.42 });
  const glass = getMaterial(0x9ebfc1, {
    roughness: 0.12,
    metalness: 0.02,
    transparent: true,
    opacity: 0.18,
  });

  addBox(scene, BALCONY.width - 0.1, 0.075, 0.075, metal, 0, BALCONY.railHeight, halfDepth + 0.02, {
    occluders,
  });
  addBox(scene, BALCONY.width - 0.1, 0.035, 0.05, metal, 0, 0.18, halfDepth + 0.02, {
    occluders,
  });
  addBox(scene, BALCONY.depth - 0.08, 0.075, 0.075, metal, halfWidth + 0.02, BALCONY.railHeight, 0, {
    occluders,
  });
  addBox(scene, BALCONY.depth - 0.08, 0.035, 0.05, metal, halfWidth + 0.02, 0.18, 0, {
    occluders,
  });

  addBox(scene, BALCONY.width - 0.28, 0.77, 0.018, glass, 0, 0.61, halfDepth + 0.02, {
    cast: false,
    receive: false,
  });
  addBox(scene, 0.018, 0.77, BALCONY.depth - 0.25, glass, halfWidth + 0.02, 0.61, 0, {
    cast: false,
    receive: false,
  });

  const barHeight = BALCONY.railHeight - 0.25;
  for (let x = -halfWidth + 0.22; x < halfWidth - 0.08; x += 0.27) {
    addBox(scene, 0.022, barHeight, 0.022, metal, x, 0.2 + barHeight / 2, halfDepth + 0.02, {
      occluders,
    });
  }
  for (let z = -halfDepth + 0.22; z < halfDepth - 0.08; z += 0.27) {
    addBox(scene, 0.022, barHeight, 0.022, metal, halfWidth + 0.02, 0.2 + barHeight / 2, z, {
      occluders,
    });
  }

  for (let x = -halfWidth + 0.15; x <= halfWidth - 0.1; x += 1.2) {
    addBox(scene, 0.055, BALCONY.railHeight, 0.055, metal, x, BALCONY.railHeight / 2, halfDepth + 0.02, {
      occluders,
    });
  }
  for (let z = -halfDepth + 0.14; z <= halfDepth - 0.1; z += 1.12) {
    addBox(scene, 0.055, BALCONY.railHeight, 0.055, metal, halfWidth + 0.02, BALCONY.railHeight / 2, z, {
      occluders,
    });
  }

  const frameDark = getMaterial(0x35403b, { roughness: 0.62, metalness: 0.18 });
  const doorGlass = getMaterial(0x557679, {
    roughness: 0.15,
    metalness: 0.12,
    transparent: true,
    opacity: 0.42,
  });
  addBox(scene, 3.7, 2.34, 0.035, frameDark, 0.45, 1.18, -halfDepth + 0.015, { cast: false });
  addBox(scene, 3.54, 2.18, 0.025, doorGlass, 0.45, 1.18, -halfDepth + 0.045, {
    cast: false,
    receive: false,
  });
  addBox(scene, 0.045, 2.22, 0.03, frameDark, 0.45, 1.18, -halfDepth + 0.06, { cast: false });
  addBox(scene, 3.58, 0.035, 0.03, frameDark, 0.45, 2.29, -halfDepth + 0.06, { cast: false });
  addBox(scene, 0.018, 0.52, 0.045, getMaterial(0xbaa26d, { metalness: 0.35, roughness: 0.4 }), 0.34, 1.08, -halfDepth + 0.08, {
    cast: false,
  });

  if (!isPlan) {
    const lightMaterial = getMaterial(0xffd998, {
      emissive: 0xffb946,
      emissiveIntensity: 1.4,
      roughness: 0.45,
    });
    for (const x of [-2.25, 0, 2.25]) {
      addCylinder(scene, 0.055, 0.055, 0.015, lightMaterial, x, BALCONY.overhangY - 0.095, 0.35, {
        cast: false,
        receive: false,
        segments: 18,
      });
    }
  }
}

function addFurniture(scene, occluders, isPlan) {
  const rug = getMaterial(0xd0bea1, { roughness: 0.97 });
  const rugBorder = getMaterial(0xab9475, { roughness: 0.98 });
  addBox(scene, 3.15, 0.022, 1.96, rug, 1.56, 0.06, 0.08, { cast: false, receive: true });
  addBox(scene, 2.93, 0.008, 0.026, rugBorder, 1.56, 0.076, 0.88, { cast: false, receive: true });
  addBox(scene, 2.93, 0.008, 0.026, rugBorder, 1.56, 0.076, -0.72, { cast: false, receive: true });
  addBox(scene, 0.026, 0.008, 1.58, rugBorder, 0.11, 0.076, 0.08, { cast: false, receive: true });
  addBox(scene, 0.026, 0.008, 1.58, rugBorder, 3.01, 0.076, 0.08, { cast: false, receive: true });

  const benchWood = getMaterial(0x7d5c42, { roughness: 0.78 });
  const cushion = getMaterial(0xdfd2bb, { roughness: 0.94 });
  const cushionWarm = getMaterial(0xc77750, { roughness: 0.94 });
  addBox(scene, 1.9, 0.31, 0.62, benchWood, 2.03, 0.26, -1.17, { occluders });
  addBox(scene, 1.78, 0.12, 0.53, cushion, 2.03, 0.47, -1.17, { occluders });
  addBox(scene, 0.72, 0.4, 0.11, cushion, 1.64, 0.71, -1.43, { occluders, rotation: [0.12, 0, 0] });
  addBox(scene, 0.72, 0.4, 0.11, cushion, 2.43, 0.71, -1.43, { occluders, rotation: [0.12, 0, 0] });
  addBox(scene, 0.4, 0.38, 0.1, cushionWarm, 1.95, 0.68, -1.34, {
    occluders,
    rotation: [0.18, -0.08, 0.08],
  });
  addBox(scene, 0.1, 0.56, 0.1, benchWood, 1.24, 0.12, -1.17, { occluders });
  addBox(scene, 0.1, 0.56, 0.1, benchWood, 2.82, 0.12, -1.17, { occluders });

  const tableWood = getMaterial(0x84634a, { roughness: 0.68 });
  const tableDark = getMaterial(0x554439, { roughness: 0.67, metalness: 0.08 });
  addCylinder(scene, 0.5, 0.5, 0.055, tableWood, 1.52, 0.47, 0.2, {
    occluders,
    segments: 28,
  });
  addCylinder(scene, 0.055, 0.065, 0.38, tableDark, 1.52, 0.27, 0.2, {
    occluders,
    segments: 12,
  });
  addCylinder(scene, 0.24, 0.28, 0.035, tableDark, 1.52, 0.1, 0.2, {
    occluders,
    segments: 18,
  });

  const ceramic = getMaterial(0xd8c7a6, { roughness: 0.72 });
  const ceramicDark = getMaterial(0x706b5d, { roughness: 0.68 });
  addCylinder(scene, 0.11, 0.17, 0.26, ceramic, 1.36, 0.63, 0.16, {
    occluders,
    segments: 14,
  });
  addCylinder(scene, 0.04, 0.07, 0.31, ceramicDark, 1.72, 0.65, 0.3, {
    occluders,
    segments: 12,
  });
  const dryStem = getMaterial(0x8f7b54, { roughness: 0.9 });
  for (let index = 0; index < 5; index += 1) {
    const angle = index * 1.7;
    const start = new THREE.Vector3(1.72, 0.77, 0.3);
    const end = new THREE.Vector3(1.72 + Math.cos(angle) * 0.12, 1.16 + hash(index, 4) * 0.17, 0.3 + Math.sin(angle) * 0.1);
    addCylinderBetween(scene, start, end, 0.007, dryStem);
  }

  const stool = getMaterial(0xb2a180, { roughness: 0.88 });
  const stoolTop = getMaterial(0x8d7d64, { roughness: 0.9 });
  addCylinder(scene, 0.28, 0.32, 0.38, stool, 2.9, 0.19, 0.53, {
    occluders,
    segments: 18,
  });
  addCylinder(scene, 0.3, 0.3, 0.04, stoolTop, 2.9, 0.4, 0.53, {
    occluders,
    segments: 18,
  });

  if (!isPlan) {
    addCylinder(scene, 0.075, 0.09, 0.16, ceramicDark, 1.63, 0.59, 0.08, {
      cast: false,
      receive: false,
      segments: 10,
    });
    const flame = getMaterial(0xffd59b, {
      emissive: 0xff9f30,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    });
    addCylinder(scene, 0.026, 0.018, 0.07, flame, 1.63, 0.71, 0.08, {
      cast: false,
      receive: false,
      segments: 8,
    });
  }
}

function createLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.12, 0.08, 0.23, 0.3, 0.15, 0.52);
  shape.quadraticCurveTo(0.08, 0.65, 0, 0.73);
  shape.quadraticCurveTo(-0.08, 0.65, -0.15, 0.52);
  shape.bezierCurveTo(-0.23, 0.3, -0.12, 0.08, 0, 0);
  return new THREE.ShapeGeometry(shape, 8);
}

function createPlanter(index) {
  const definition = PLANT_DEFS[index];
  const group = new THREE.Group();
  group.userData.index = index;
  group.userData.name = definition.name;
  group.userData.lightY = definition.lightY;

  const scale = definition.scale;
  const potHeight = 0.34 * scale;
  const potRadius = 0.255 * scale;
  const potMaterial = getMaterial(definition.pot, { roughness: 0.88 });
  const potAccentMaterial = getMaterial(definition.potAccent, { roughness: 0.9 });
  const soilMaterial = getMaterial(0x3b3027, { roughness: 1 });

  addCylinder(group, potRadius * 0.88, potRadius * 0.72, potHeight, potMaterial, 0, potHeight / 2 + 0.01, 0, {
    segments: 20,
  });
  addCylinder(group, potRadius, potRadius * 0.96, potHeight * 0.17, potAccentMaterial, 0, potHeight * 0.92, 0, {
    segments: 20,
  });
  addCylinder(group, potRadius * 0.87, potRadius * 0.87, 0.025, soilMaterial, 0, potHeight - 0.015, 0, {
    segments: 18,
  });

  const plant = new THREE.Group();
  plant.position.y = potHeight + 0.005;
  group.add(plant);
  buildPlant(definition.kind, plant);

  const hitArea = new THREE.Mesh(
    getCylinderGeometry(0.39 * scale, 0.39 * scale, Math.max(1.25, definition.lightY + 0.38), 8),
    occluderMaterial,
  );
  hitArea.position.y = Math.max(0.68, definition.lightY * 0.58);
  hitArea.userData.planterIndex = index;
  hitArea.castShadow = false;
  hitArea.receiveShadow = false;
  group.add(hitArea);
  group.userData.hitArea = hitArea;

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf4bd58, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(potRadius + 0.035, 0.014, 6, 34), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  ring.castShadow = false;
  ring.receiveShadow = false;
  group.add(ring);
  group.userData.ring = ring;

  group.traverse((object) => {
    if (object.isMesh && object !== hitArea && object !== ring) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return group;
}

function buildPlant(kind, plant) {
  if (kind === 'monstera') buildMonstera(plant);
  if (kind === 'olive') buildOlive(plant);
  if (kind === 'fern') buildFern(plant);
  if (kind === 'citrus') buildCitrus(plant);
  if (kind === 'snake') buildSnakePlant(plant);
  if (kind === 'lavender') buildLavender(plant);
}

function buildMonstera(plant) {
  const stemMaterial = getMaterial(0x47674a, { roughness: 0.82 });
  const leafMaterial = getMaterial(0x2f573d, {
    roughness: 0.73,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const leafGeometry = geometryCache.get('leaf') ?? createLeafGeometry();
  geometryCache.set('leaf', leafGeometry);

  for (let index = 0; index < 7; index += 1) {
    const angle = index * 2.399 + 0.4;
    const reach = 0.1 + hash(index, 1) * 0.17;
    const height = 0.47 + hash(index, 2) * 0.46;
    const start = new THREE.Vector3(0, 0.02, 0);
    const end = new THREE.Vector3(Math.cos(angle) * reach, height, Math.sin(angle) * reach);
    addCylinderBetween(plant, start, end, 0.014, stemMaterial);
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    const leafScale = 0.93 + hash(index, 3) * 0.38;
    leaf.scale.set(leafScale, leafScale * (0.92 + hash(index, 4) * 0.25), leafScale);
    leaf.position.copy(end);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = angle + Math.PI / 2;
    leaf.rotation.x = 0.26 + hash(index, 5) * 0.28;
    leaf.rotation.z = (hash(index, 6) - 0.5) * 0.3;
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    plant.add(leaf);
  }
}

function buildOlive(plant) {
  const bark = getMaterial(0x725f4b, { roughness: 0.94 });
  const leaf = getMaterial(0x637653, { roughness: 0.9, flatShading: true });
  addCylinderBetween(plant, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, 0.77, 0), 0.032, bark);

  for (let index = 0; index < 9; index += 1) {
    const angle = index * 2.4 + 0.8;
    const branchHeight = 0.45 + hash(index, 2) * 0.28;
    const branchLength = 0.12 + hash(index, 3) * 0.23;
    const start = new THREE.Vector3(0, branchHeight, 0);
    const end = new THREE.Vector3(
      Math.cos(angle) * branchLength,
      branchHeight + 0.15 + hash(index, 4) * 0.22,
      Math.sin(angle) * branchLength,
    );
    addCylinderBetween(plant, start, end, 0.011, bark);
    const cluster = new THREE.Mesh(getIcosahedronGeometry(1), leaf);
    cluster.position.copy(end);
    cluster.scale.set(0.13 + hash(index, 5) * 0.09, 0.11 + hash(index, 6) * 0.08, 0.13 + hash(index, 7) * 0.08);
    cluster.rotation.set(hash(index, 8) * 2, hash(index, 9) * 2, hash(index, 10) * 2);
    cluster.castShadow = true;
    cluster.receiveShadow = true;
    plant.add(cluster);
  }
}

function buildFern(plant) {
  const fernMaterial = getMaterial(0x47745a, {
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const fernLightMaterial = getMaterial(0x5a8965, {
    roughness: 0.84,
    side: THREE.DoubleSide,
  });
  const leafGeometry = geometryCache.get('leaf') ?? createLeafGeometry();
  geometryCache.set('leaf', leafGeometry);

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeometry, index % 2 ? fernMaterial : fernLightMaterial);
    leaf.position.set(Math.cos(angle) * 0.035, 0.07 + hash(index, 1) * 0.08, Math.sin(angle) * 0.035);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = angle + Math.PI / 2;
    leaf.rotation.x = 0.52 + hash(index, 2) * 0.44;
    leaf.rotation.z = (hash(index, 3) - 0.5) * 0.35;
    leaf.scale.set(0.38 + hash(index, 4) * 0.12, 0.72 + hash(index, 5) * 0.36, 0.38);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    plant.add(leaf);
  }
}

function buildCitrus(plant) {
  const bark = getMaterial(0x775d43, { roughness: 0.93 });
  const leafDark = getMaterial(0x315b40, { roughness: 0.79, flatShading: true });
  const leafMid = getMaterial(0x3e6a49, { roughness: 0.8, flatShading: true });
  const fruit = getMaterial(0xe59132, { roughness: 0.61, emissive: 0x6f2c00, emissiveIntensity: 0.06 });
  addCylinderBetween(plant, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.76, 0), 0.037, bark);

  const clusters = [
    [0, 0.81, 0, 0.3],
    [0.16, 0.99, 0.04, 0.25],
    [-0.16, 0.92, 0.08, 0.24],
    [0.03, 1.08, -0.08, 0.22],
    [0.04, 0.86, 0.2, 0.2],
  ];
  clusters.forEach(([x, y, z, size], index) => {
    addCylinderBetween(
      plant,
      new THREE.Vector3(0.01, 0.58 + index * 0.04, 0),
      new THREE.Vector3(x, y, z),
      0.01,
      bark,
    );
    const cluster = new THREE.Mesh(getIcosahedronGeometry(1), index % 2 ? leafDark : leafMid);
    cluster.position.set(x, y, z);
    cluster.scale.set(size, size * 0.88, size);
    cluster.rotation.set(index * 0.8, index * 1.1, index * 0.4);
    cluster.castShadow = true;
    cluster.receiveShadow = true;
    plant.add(cluster);
  });

  const fruits = [
    [0.21, 0.87, 0.17],
    [-0.12, 1.05, 0.19],
    [0.08, 1.15, -0.02],
    [0.27, 0.96, -0.02],
    [-0.2, 0.86, 0.16],
  ];
  fruits.forEach(([x, y, z], index) => {
    const orange = new THREE.Mesh(getIcosahedronGeometry(2), fruit);
    orange.position.set(x, y, z);
    orange.scale.setScalar(0.055 + (index % 2) * 0.008);
    orange.castShadow = true;
    orange.receiveShadow = true;
    plant.add(orange);
  });
}

function buildSnakePlant(plant) {
  const dark = getMaterial(0x355b43, { roughness: 0.82, flatShading: true });
  const light = getMaterial(0x557b5a, { roughness: 0.84, flatShading: true });
  const edge = getMaterial(0x87a16f, { roughness: 0.9, flatShading: true });
  for (let index = 0; index < 12; index += 1) {
    const angle = index * 2.28;
    const radius = 0.035 + hash(index, 1) * 0.12;
    const height = 0.48 + hash(index, 2) * 0.61;
    const blade = new THREE.Mesh(
      getCylinderGeometry(0.004, 0.072, height, 4, 1),
      index % 3 === 0 ? edge : index % 2 ? light : dark,
    );
    blade.position.set(Math.cos(angle) * radius, height / 2 + 0.02, Math.sin(angle) * radius);
    blade.rotation.set(
      (hash(index, 3) - 0.5) * 0.18,
      angle,
      (hash(index, 4) - 0.5) * 0.22,
    );
    blade.scale.z = 0.38;
    blade.castShadow = true;
    blade.receiveShadow = true;
    plant.add(blade);
  }
}

function buildLavender(plant) {
  const stem = getMaterial(0x6d8057, { roughness: 0.9 });
  const flower = getMaterial(0x796e9f, { roughness: 0.82, flatShading: true });
  const flowerLight = getMaterial(0x9685b6, { roughness: 0.84, flatShading: true });
  for (let index = 0; index < 14; index += 1) {
    const angle = index * 2.61;
    const radius = 0.025 + hash(index, 1) * 0.1;
    const height = 0.46 + hash(index, 2) * 0.35;
    const base = new THREE.Vector3(Math.cos(angle) * radius * 0.35, 0, Math.sin(angle) * radius * 0.35);
    const top = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    );
    addCylinderBetween(plant, base, top, 0.0055, stem);
    const head = new THREE.Mesh(getCylinderGeometry(0.008, 0.034, 0.17, 6), index % 2 ? flower : flowerLight);
    head.position.copy(top).add(new THREE.Vector3(0, 0.055, 0));
    head.rotation.z = (hash(index, 3) - 0.5) * 0.22;
    head.castShadow = true;
    head.receiveShadow = true;
    plant.add(head);
  }
}

function setPlanterStatus(planter, shaded) {
  planter.userData.shaded = shaded;
  if (planter.userData.ring) planter.userData.ring.material.color.set(shaded ? 0x7e969c : 0xf5bd55);
}

function getLocation() {
  return SAMPLE_LOCATIONS.find((location) => location.id === state.locationId) ?? SAMPLE_LOCATIONS[0];
}

function locationCoordinate(value, positive, negative) {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

function utcLabel(offset) {
  const sign = offset >= 0 ? '+' : '−';
  return `UTC${sign}${String(Math.abs(offset)).padStart(2, '0')}:00`;
}

function compassAbbreviation(degrees) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

function createPlan(meta) {
  return {
    ...meta,
    planters: PLANT_DEFS.map((definition, index) => ({
      index,
      position: new THREE.Vector3(meta.positions[index][0], 0, meta.positions[index][1]),
      userData: { lightY: definition.lightY, name: definition.name },
    })),
    sunState: [],
    sunVector: new THREE.Vector3(0, 0.65, 0.7).normalize(),
    dragIndex: null,
    dragOffset: new THREE.Vector2(),
  };
}

const plans = {
  A: createPlan(PLAN_META.A),
  B: createPlan(PLAN_META.B),
};

const mainContext = createSceneContext(false);
const mainPlanters = PLANT_DEFS.map((_, index) => {
  const planter = createPlanter(index);
  const [x, z] = PLAN_META.A.positions[index];
  planter.position.set(x, 0, z);
  mainContext.scene.add(planter);
  return planter;
});

const stageCanvas = document.querySelector('#scene-canvas');
const stageRenderer = createRenderer(stageCanvas, 1.6);
const stageCamera = new THREE.PerspectiveCamera(37, 1, 0.1, 110);
stageCamera.position.set(8.2, 6.25, 9.7);
const orbitControls = new OrbitControls(stageCamera, stageCanvas);
orbitControls.target.set(-0.15, 0.82, -0.05);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.065;
orbitControls.enablePan = false;
orbitControls.minDistance = 7.5;
orbitControls.maxDistance = 22;
orbitControls.minPolarAngle = 0.22;
orbitControls.maxPolarAngle = 1.43;
orbitControls.zoomSpeed = 0.72;
orbitControls.rotateSpeed = 0.55;
orbitControls.update();
orbitControls.addEventListener('change', () => stageRenderer.render(mainContext.scene, stageCamera));

const planViews = {
  A: createPlanView('A'),
  B: createPlanView('B'),
};

function createRenderer(canvas, pixelRatioCap, antialias = true) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  return renderer;
}

function createPlanView(planKey) {
  const canvas = document.querySelector(`#plan-canvas-${planKey.toLowerCase()}`);
  const context = canvas.getContext('2d');
  const view = { canvas, context, width: 0, height: 0, dpr: 1 };

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.width = width;
    view.height = height;
    view.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (stageReady) drawPlanView(planKey);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  return { ...view, resize };
}

function getPlanMetrics(view) {
  const sidePadding = 10;
  const verticalPadding = 7;
  const scale = Math.min(
    (view.width - sidePadding * 2) / 8.1,
    (view.height - verticalPadding * 2) / 3.9,
  );
  return { scale: Math.max(1, scale), cx: view.width / 2, cy: view.height / 2 };
}

function planScreenPoint(view, x, z, metrics = getPlanMetrics(view)) {
  return { x: metrics.cx + x * metrics.scale, y: metrics.cy + z * metrics.scale };
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawPlanView(planKey) {
  const view = planViews[planKey];
  const plan = plans[planKey];
  if (!view || !view.context) return;
  if (view.width < 2 || view.height < 2) return;

  const context = view.context;
  const { width, height, dpr } = view;
  const metrics = getPlanMetrics(view);
  const sun = plan.sunVector;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const backdrop = context.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, '#e2e9e2');
  backdrop.addColorStop(1, '#d0ded7');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  const floorTopLeft = planScreenPoint(view, -BALCONY.width / 2, -BALCONY.depth / 2, metrics);
  const floorSize = { width: BALCONY.width * metrics.scale, height: BALCONY.depth * metrics.scale };
  context.save();
  roundedRectPath(context, floorTopLeft.x, floorTopLeft.y, floorSize.width, floorSize.height, 4);
  context.clip();

  const floorGradient = context.createLinearGradient(floorTopLeft.x, floorTopLeft.y, floorTopLeft.x, floorTopLeft.y + floorSize.height);
  floorGradient.addColorStop(0, '#b78b64');
  floorGradient.addColorStop(1, '#9f7452');
  context.fillStyle = floorGradient;
  context.fillRect(floorTopLeft.x, floorTopLeft.y, floorSize.width, floorSize.height);

  context.strokeStyle = 'rgba(74, 54, 39, 0.22)';
  context.lineWidth = 0.7;
  for (let index = 1; index < 9; index += 1) {
    const z = -BALCONY.depth / 2 + index * (BALCONY.depth / 9);
    const start = planScreenPoint(view, -BALCONY.width / 2, z, metrics);
    const end = planScreenPoint(view, BALCONY.width / 2, z, metrics);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  if (sun.y > 0.025) {
    const corners = [
      [-BALCONY.width / 2 - 0.21, -BALCONY.depth / 2 - 0.19],
      [BALCONY.width / 2 + 0.21, -BALCONY.depth / 2 - 0.19],
      [BALCONY.width / 2 + 0.21, BALCONY.depth / 2 + 0.39],
      [-BALCONY.width / 2 - 0.21, BALCONY.depth / 2 + 0.39],
    ];
    const projection = BALCONY.overhangY / sun.y;
    context.beginPath();
    corners.forEach(([x, z], index) => {
      const point = planScreenPoint(view, x - sun.x * projection, z - sun.z * projection, metrics);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fillStyle = 'rgba(35, 50, 44, 0.13)';
    context.fill();
  }

  const rug = planScreenPoint(view, 0.02, -0.9, metrics);
  context.fillStyle = '#d2c2a6';
  context.fillRect(rug.x, rug.y, 3.08 * metrics.scale, 1.96 * metrics.scale);
  context.strokeStyle = 'rgba(116, 91, 62, 0.32)';
  context.lineWidth = 0.7;
  context.strokeRect(rug.x + 2, rug.y + 2, 3.08 * metrics.scale - 4, 1.96 * metrics.scale - 4);

  const bench = planScreenPoint(view, 2.03 - 0.95, -1.48, metrics);
  roundedRectPath(context, bench.x, bench.y, 1.9 * metrics.scale, 0.62 * metrics.scale, 2);
  context.fillStyle = '#73543d';
  context.fill();
  const cushion = planScreenPoint(view, 2.03 - 0.89, -1.44, metrics);
  roundedRectPath(context, cushion.x, cushion.y, 1.78 * metrics.scale, 0.54 * metrics.scale, 2);
  context.fillStyle = '#e0d3bd';
  context.fill();

  const table = planScreenPoint(view, 1.52, 0.2, metrics);
  context.beginPath();
  context.arc(table.x, table.y, Math.max(5, 0.5 * metrics.scale), 0, Math.PI * 2);
  context.fillStyle = '#8c694c';
  context.fill();
  context.strokeStyle = 'rgba(255, 248, 234, 0.45)';
  context.lineWidth = 0.8;
  context.stroke();

  const stool = planScreenPoint(view, 2.9, 0.53, metrics);
  context.beginPath();
  context.arc(stool.x, stool.y, Math.max(4, 0.29 * metrics.scale), 0, Math.PI * 2);
  context.fillStyle = '#a99877';
  context.fill();

  context.restore();

  context.fillStyle = '#c8bba7';
  const backWall = planScreenPoint(view, -BALCONY.width / 2, -BALCONY.depth / 2 - 0.18, metrics);
  context.fillRect(backWall.x, backWall.y, BALCONY.width * metrics.scale, 0.18 * metrics.scale);
  const sideWall = planScreenPoint(view, -BALCONY.width / 2 - 0.18, -BALCONY.depth / 2, metrics);
  context.fillRect(sideWall.x, sideWall.y, 0.18 * metrics.scale, BALCONY.depth * metrics.scale);

  const railStart = planScreenPoint(view, -BALCONY.width / 2, BALCONY.depth / 2 + 0.02, metrics);
  const railEnd = planScreenPoint(view, BALCONY.width / 2, BALCONY.depth / 2 + 0.02, metrics);
  context.strokeStyle = 'rgba(35, 47, 43, 0.82)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(railStart.x, railStart.y);
  context.lineTo(railEnd.x, railEnd.y);
  context.stroke();
  context.lineWidth = 0.55;
  for (let x = -BALCONY.width / 2 + 0.22; x < BALCONY.width / 2; x += 0.27) {
    const point = planScreenPoint(view, x, BALCONY.depth / 2 + 0.02, metrics);
    context.beginPath();
    context.moveTo(point.x, point.y - 3);
    context.lineTo(point.x, point.y + 1);
    context.stroke();
  }
  const sideRailStart = planScreenPoint(view, BALCONY.width / 2 + 0.02, -BALCONY.depth / 2, metrics);
  const sideRailEnd = planScreenPoint(view, BALCONY.width / 2 + 0.02, BALCONY.depth / 2, metrics);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(sideRailStart.x, sideRailStart.y);
  context.lineTo(sideRailEnd.x, sideRailEnd.y);
  context.stroke();

  plan.planters.forEach((planter, index) => {
    const point = planScreenPoint(view, planter.position.x, planter.position.z, metrics);
    const radius = Math.max(5.4, metrics.scale * 0.28);
    const shaded = !plan.sunState[index];
    if (sun.y > 0.02) {
      const shadowOffset = Math.max(1.2, metrics.scale * 0.13);
      context.beginPath();
      context.arc(point.x - sun.x * shadowOffset, point.y - sun.z * shadowOffset, radius * 0.9, 0, Math.PI * 2);
      context.fillStyle = 'rgba(37, 48, 43, 0.16)';
      context.fill();
    }
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = `#${PLANT_DEFS[index].pot.toString(16).padStart(6, '0')}`;
    context.fill();

    const foliage = PLANT_DEFS[index].uiColor;
    context.fillStyle = foliage;
    for (let leafIndex = 0; leafIndex < 5; leafIndex += 1) {
      const angle = leafIndex * 2.399 + index * 0.7;
      const leafRadius = radius * (0.35 + (leafIndex % 2) * 0.12);
      context.beginPath();
      context.arc(
        point.x + Math.cos(angle) * radius * 0.34,
        point.y + Math.sin(angle) * radius * 0.34,
        leafRadius,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.strokeStyle = shaded ? '#6e858c' : '#f6c45c';
    context.lineWidth = 2.1;
    context.stroke();

    context.fillStyle = 'rgba(255, 253, 248, 0.92)';
    context.font = `700 ${Math.max(5.5, radius * 0.7)}px "Avenir Next", Avenir, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(index + 1), point.x, point.y + 0.3);
  });

  if (sun.y > -0.05) {
    const horizontalLength = Math.hypot(sun.x, sun.z) || 1;
    const origin = { x: 15, y: 15 };
    const direction = { x: sun.x / horizontalLength, y: sun.z / horizontalLength };
    context.strokeStyle = 'rgba(164, 94, 22, 0.76)';
    context.fillStyle = '#e7a23a';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(origin.x, origin.y, 3.2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(origin.x + direction.x * 5, origin.y + direction.y * 5);
    context.lineTo(origin.x + direction.x * 18, origin.y + direction.y * 18);
    context.stroke();
    context.beginPath();
    context.moveTo(origin.x + direction.x * 18, origin.y + direction.y * 18);
    context.lineTo(origin.x + direction.x * 14 - direction.y * 2.5, origin.y + direction.y * 14 + direction.x * 2.5);
    context.lineTo(origin.x + direction.x * 14 + direction.y * 2.5, origin.y + direction.y * 14 - direction.x * 2.5);
    context.closePath();
    context.fill();
  }
}

const ui = {
  locationSelect: document.querySelector('#location-select'),
  locationMeta: document.querySelector('#location-meta'),
  dateInput: document.querySelector('#date-input'),
  dateWeekday: document.querySelector('#date-weekday'),
  dateDay: document.querySelector('#date-day'),
  dateMonth: document.querySelector('#date-month'),
  orientationRange: document.querySelector('#orientation-range'),
  orientationOutput: document.querySelector('#orientation-output'),
  orientationDirection: document.querySelector('#orientation-direction'),
  compassDial: document.querySelector('#compass-dial'),
  compassNeedle: document.querySelector('#compass-needle'),
  sunriseValue: document.querySelector('#sunrise-value'),
  noonValue: document.querySelector('#noon-value'),
  sunsetValue: document.querySelector('#sunset-value'),
  timeRange: document.querySelector('#time-range'),
  timeValue: document.querySelector('#time-value'),
  sunPhase: document.querySelector('#sun-phase'),
  timelineSunrise: document.querySelector('#timeline-sunrise'),
  timelineSunset: document.querySelector('#timeline-sunset'),
  compareTime: document.querySelector('#compare-time'),
  sunAltitude: document.querySelector('#sun-altitude'),
  sunAzimuth: document.querySelector('#sun-azimuth'),
  sunPillIcon: document.querySelector('#sun-pill-icon'),
  activePlanKicker: document.querySelector('#active-plan-kicker'),
  activePlanName: document.querySelector('#active-plan-name'),
  activePlanSummary: document.querySelector('#active-plan-summary'),
  playButton: document.querySelector('#play-button'),
  stageFacing: document.querySelector('#stage-facing'),
  stageNorthNeedle: document.querySelector('#stage-north-needle'),
  planNorthA: document.querySelector('#plan-north-a'),
  planNorthB: document.querySelector('#plan-north-b'),
  planCountA: document.querySelector('#plan-count-a'),
  planCountB: document.querySelector('#plan-count-b'),
  planNoteA: document.querySelector('#plan-note-a'),
  planNoteB: document.querySelector('#plan-note-b'),
  statusGridA: document.querySelector('#status-grid-a'),
  statusGridB: document.querySelector('#status-grid-b'),
  modelModal: document.querySelector('#model-modal'),
  modelButton: document.querySelector('#model-button'),
  resetButton: document.querySelector('#reset-button'),
  toast: document.querySelector('#toast'),
  loadingCover: document.querySelector('#loading-cover'),
};

function populateLocations() {
  ui.locationSelect.innerHTML = SAMPLE_LOCATIONS.map(
    (location) => `<option value="${location.id}">${location.label}</option>`,
  ).join('');
  ui.locationSelect.value = state.locationId;
}

function populateStatusGrids() {
  [ui.statusGridA, ui.statusGridB].forEach((grid) => {
    grid.innerHTML = PLANT_DEFS.map(
      (plant) => `
        <span class="plant-status" data-plant="${plant.id}">
          <i style="background:${plant.uiColor}"></i>
          <span>${plant.name}</span>
        </span>
      `,
    ).join('');
  });
}

function updateDateUI() {
  const date = new Date(`${state.date}T12:00:00Z`);
  ui.dateWeekday.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .toUpperCase();
  ui.dateDay.textContent = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' }).format(date);
  ui.dateMonth.textContent = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
    .format(date)
    .toUpperCase();
  ui.dateInput.value = state.date;
}

function updateLocationUI() {
  const location = getLocation();
  ui.locationMeta.textContent = `${locationCoordinate(location.latitude, 'N', 'S')} · ${locationCoordinate(
    location.longitude,
    'E',
    'W',
  )} · ${utcLabel(location.utcOffset)}`;
}

function updateOrientationUI() {
  const orientation = Math.round(state.orientation) % 360;
  const compass = compassName(orientation);
  const shortCompass = compassAbbreviation(orientation);
  ui.orientationOutput.textContent = `${compass} · ${orientation}°`;
  ui.orientationDirection.textContent = compass;
  ui.orientationRange.value = String(orientation);
  ui.orientationRange.style.setProperty('--fill', `${(orientation / 359) * 100}%`);
  ui.compassNeedle.style.transform = `rotate(${orientation}deg)`;
  ui.compassDial.setAttribute('aria-valuenow', String(orientation));
  ui.compassDial.setAttribute('aria-valuetext', `${compass} facing, ${orientation} degrees`);
  ui.stageFacing.textContent = shortCompass;
  ui.stageNorthNeedle.style.transform = `translateX(-50%) rotate(${-orientation}deg)`;
  ui.planNorthA.style.setProperty('--north-rotation', `${180 + orientation}deg`);
  ui.planNorthB.style.setProperty('--north-rotation', `${180 + orientation}deg`);
  document.querySelectorAll('[data-orientation]').forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.orientation) === orientation);
  });
}

function updateTimeUI(solar) {
  const noDaylight = solar.dayLength <= 0;
  const rangeMin = noDaylight ? 0 : Math.max(0, Math.ceil(solar.sunrise + 1));
  const rangeMax = noDaylight ? 1439 : Math.min(1439, Math.floor(solar.sunset - 1));
  ui.timeRange.min = String(rangeMin);
  ui.timeRange.max = String(Math.max(rangeMin + 1, rangeMax));
  ui.timeRange.disabled = noDaylight;
  ui.timeRange.value = String(Math.round(state.minutes));
  const progress = ((state.minutes - rangeMin) / Math.max(1, rangeMax - rangeMin)) * 100;
  ui.timeRange.style.setProperty('--fill', `${Math.max(0, Math.min(100, progress))}%`);
  ui.timeValue.textContent = formatClock(state.minutes);
  ui.compareTime.textContent = formatClock(state.minutes);
  ui.timelineSunrise.textContent = noDaylight ? 'No sunrise' : solar.polarDay ? 'Sun up all day' : `Sunrise ${formatClock(solar.sunrise)}`;
  ui.timelineSunset.textContent = noDaylight ? 'Polar night' : solar.polarDay ? 'Sunset —' : `Sunset ${formatClock(solar.sunset)}`;
  ui.sunriseValue.textContent = noDaylight ? '—' : solar.polarDay ? 'All day' : formatClock(solar.sunrise);
  ui.sunsetValue.textContent = noDaylight ? '—' : solar.polarDay ? 'All day' : formatClock(solar.sunset);
  ui.noonValue.textContent = formatClock(solar.solarNoon);

  if (state.minutes < solar.sunrise + 75) ui.sunPhase.textContent = 'First light';
  else if (state.minutes < solar.solarNoon - 150) ui.sunPhase.textContent = 'Morning light';
  else if (state.minutes < solar.solarNoon - 35) ui.sunPhase.textContent = 'High morning';
  else if (state.minutes <= solar.solarNoon + 35) ui.sunPhase.textContent = 'Peak daylight';
  else if (state.minutes < solar.sunset - 120) ui.sunPhase.textContent = 'Afternoon light';
  else if (state.minutes < solar.sunset - 20) ui.sunPhase.textContent = 'Late sun';
  else ui.sunPhase.textContent = 'Golden hour';
}

function updateSunUI(position) {
  const altitude = Math.max(0, Math.round(position.altitude));
  ui.sunAltitude.textContent = `${altitude}°`;
  ui.sunAzimuth.textContent = `${compassAbbreviation(position.azimuth)} · ${Math.round(position.azimuth)}°`;
  const warmth = Math.max(0, 1 - altitude / 32);
  ui.sunPillIcon.style.background = warmth > 0.55 ? '#ef8c39' : '#efb54c';
  ui.sunPillIcon.style.boxShadow = `0 0 0 3px rgba(239, 169, 63, ${0.14 + warmth * 0.12}), 0 0 14px rgba(255, 214, 132, ${0.45 + warmth * 0.3})`;
}

function updateSolarLighting(context, sunVector, position, isPlan) {
  const altitude = Math.max(-8, position.altitude);
  const horizontalStrength = Math.max(0, Math.sin(THREE.MathUtils.degToRad(Math.max(0, position.altitude))));
  const sunPosition = new THREE.Vector3(sunVector.x, Math.max(0.015, sunVector.y), sunVector.z).multiplyScalar(17);
  context.sun.position.copy(sunPosition);
  context.sun.target.position.set(0, 0, 0);
  context.sun.color.setHSL(0.105 - Math.min(0.035, altitude / 2200), 0.72, 0.72 + horizontalStrength * 0.13);
  context.sun.intensity = altitude > 0 ? 1.55 + horizontalStrength * 1.25 : 0;
  context.hemisphere.intensity = (isPlan ? 0.68 : 0.55) + horizontalStrength * 0.36;
  context.ambient.intensity = (isPlan ? 0.23 : 0.15) + horizontalStrength * 0.09;

  if (context.sky) {
    context.sky.material.uniforms.sunDirection.value.set(sunVector.x, sunVector.y, sunVector.z).normalize();
    context.sky.material.uniforms.lowSun.value = THREE.MathUtils.clamp(1 - horizontalStrength * 1.8, 0, 1);
  }
}

function planterIsShaded(context, planter, sunVector) {
  if (sunVector.y <= 0.015) return true;
  rayDirection.set(sunVector.x, sunVector.y, sunVector.z).normalize();
  scratchPoint.copy(planter.position).add(new THREE.Vector3(0, planter.userData.lightY, 0));
  raycaster.set(scratchPoint, rayDirection);
  raycaster.near = 0.05;
  raycaster.far = 18;
  return raycaster.intersectObjects(context.occluders, false).length > 0;
}

function analyzePlan(plan) {
  plan.sunState = plan.planters.map((planter) => {
    const shaded = planterIsShaded(mainContext, planter, mainContext.sunDirection);
    setPlanterStatus(planter, shaded);
    return !shaded;
  });
  updatePlanCard(plan);
}

function updatePlanCard(plan) {
  const planKey = plan.letter;
  const sunCount = plan.sunState.filter(Boolean).length;
  const statusGrid = planKey === 'A' ? ui.statusGridA : ui.statusGridB;
  statusGrid.querySelectorAll('.plant-status').forEach((status, index) => {
    status.classList.toggle('is-shaded', !plan.sunState[index]);
  });
  const countElement = planKey === 'A' ? ui.planCountA : ui.planCountB;
  const noteElement = planKey === 'A' ? ui.planNoteA : ui.planNoteB;
  countElement.textContent = String(sunCount);
  if (sunCount === 0) noteElement.textContent = 'Fully shaded';
  else if (sunCount === 6) noteElement.textContent = 'Every planter lit';
  else {
    const brightest = PLANT_DEFS.find((_, index) => plan.sunState[index]);
    noteElement.textContent = `${brightest.name} takes the light`;
  }
  if (state.activePlan === planKey) updateStagePlanCopy();
}

function updateStagePlanCopy() {
  const plan = plans[state.activePlan];
  const sunCount = plan.sunState.filter(Boolean).length;
  const shadedNames = PLANT_DEFS.filter((_, index) => !plan.sunState[index]).map((plant) => plant.name);
  ui.activePlanKicker.textContent = `Arrangement ${state.activePlan}`;
  ui.activePlanName.textContent = plan.name;
  if (sunCount === 6) {
    ui.activePlanSummary.textContent = 'All six planters catch direct sun right now.';
  } else if (sunCount === 0) {
    ui.activePlanSummary.textContent = 'All six planters are shaded right now.';
  } else {
    const shadedCopy = shadedNames.length > 2 ? `${shadedNames.slice(0, 2).join(', ')} +${shadedNames.length - 2}` : shadedNames.join(' and ');
    ui.activePlanSummary.textContent = `${sunCount} of 6 in direct sun · ${shadedCopy} shaded`;
  }

  mainPlanters.forEach((planter, index) => {
    const shaded = !plan.sunState[index];
    setPlanterStatus(planter, shaded);
  });
}

function syncMainPlanters() {
  const plan = plans[state.activePlan];
  mainPlanters.forEach((mainPlanter, index) => {
    mainPlanter.position.copy(plan.planters[index].position);
  });
}

function setActivePlan(planKey) {
  if (!plans[planKey]) return;
  state.activePlan = planKey;
  document.querySelectorAll('[data-plan]').forEach((element) => {
    const isActive = element.dataset.plan === planKey;
    element.classList.toggle('is-active', isActive);
    if (element.getAttribute('role') === 'tab') {
      element.setAttribute('aria-selected', String(isActive));
    }
  });
  syncMainPlanters();
  markShadowsDirty();
  updateStagePlanCopy();
  stageRenderer.render(mainContext.scene, stageCamera);
}

function updateAll() {
  const location = getLocation();
  const solarDay = getSolarDay(location, state.date);
  if (solarDay.dayLength <= 0) {
    state.minutes = solarDay.solarNoon;
  } else {
    const minimum = Math.max(0, Math.ceil(solarDay.sunrise + 1));
    const maximum = Math.min(1439, Math.floor(solarDay.sunset - 1));
    if (maximum > minimum && (state.minutes < minimum || state.minutes > maximum)) {
      state.minutes = Math.min(maximum, Math.max(minimum, solarDay.solarNoon));
    }
  }
  const solarPosition = getSolarPosition(location, state.date, state.minutes);
  const localDirection = directionInBalconySpace(solarPosition.worldDirection, state.orientation);
  const localVector = new THREE.Vector3(localDirection.x, localDirection.y, localDirection.z).normalize();

  mainContext.sunDirection = localVector;
  plans.A.sunVector.copy(localVector);
  plans.B.sunVector.copy(localVector);

  updateSolarLighting(mainContext, localVector, solarPosition, false);
  markShadowsDirty();
  updateSunUI(solarPosition);
  updateTimeUI(solarDay);
  updateOrientationUI();
  mainContext.scene.updateMatrixWorld(true);
  analyzePlan(plans.A);
  analyzePlan(plans.B);
  updateStagePlanCopy();
  updatePlanViews();
  stageRenderer.render(mainContext.scene, stageCamera);
}

function markShadowsDirty() {
  stageRenderer.shadowMap.needsUpdate = true;
}

function updatePlanViews() {
  for (const planKey of ['A', 'B']) {
    drawPlanView(planKey);
  }
}

function resizeStage() {
  const width = Math.max(1, stageCanvas.clientWidth);
  const height = Math.max(1, stageCanvas.clientHeight);
  stageRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  stageRenderer.setSize(width, height, false);
  stageCamera.aspect = width / height;
  stageCamera.updateProjectionMatrix();
  if (stageReady) stageRenderer.render(mainContext.scene, stageCamera);
}

function setOrientation(value) {
  const normalized = ((Math.round(Number(value)) % 360) + 360) % 360;
  state.orientation = normalized;
  updateAll();
}

function setTime(value) {
  const min = Number(ui.timeRange.min);
  const max = Number(ui.timeRange.max);
  state.minutes = Math.max(min, Math.min(max, Number(value)));
  updateAll();
}

function pointToOrientation(event) {
  const rect = ui.compassDial.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

function bindCompassDial() {
  let dragging = false;
  ui.compassDial.addEventListener('pointerdown', (event) => {
    dragging = true;
    ui.compassDial.setPointerCapture(event.pointerId);
    setOrientation(pointToOrientation(event));
  });
  ui.compassDial.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    setOrientation(pointToOrientation(event));
  });
  ui.compassDial.addEventListener('pointerup', (event) => {
    dragging = false;
    if (ui.compassDial.hasPointerCapture(event.pointerId)) ui.compassDial.releasePointerCapture(event.pointerId);
  });
  ui.compassDial.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setOrientation(state.orientation + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setOrientation(state.orientation - 1);
  });
}

function bindPlanDrag(planKey) {
  const plan = plans[planKey];
  const canvas = planViews[planKey].canvas;
  const card = canvas.closest('.plan-card');

  const pointerToPlan = (event) => {
    const view = planViews[planKey];
    const rect = canvas.getBoundingClientRect();
    const metrics = getPlanMetrics(view);
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    return {
      px,
      py,
      x: (px - metrics.cx) / metrics.scale,
      z: (py - metrics.cy) / metrics.scale,
      metrics,
    };
  };

  card.addEventListener('click', (event) => {
    if (!event.target.closest('.plan-canvas-shell') || event.type === 'click') {
      setActivePlan(planKey);
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    setActivePlan(planKey);
    const pointer = pointerToPlan(event);
    let planterIndex = null;
    let nearest = Infinity;
    plan.planters.forEach((planter, index) => {
      const point = planScreenPoint(planViews[planKey], planter.position.x, planter.position.z, pointer.metrics);
      const distance = Math.hypot(pointer.px - point.x, pointer.py - point.y);
      if (distance < 17 && distance < nearest) {
        nearest = distance;
        planterIndex = index;
      }
    });
    if (planterIndex === null) return;
    plan.dragIndex = planterIndex;
    plan.dragOffset.set(
      plan.planters[planterIndex].position.x - pointer.x,
      plan.planters[planterIndex].position.z - pointer.z,
    );
    canvas.setPointerCapture(event.pointerId);
    canvas.parentElement.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (event) => {
    if (plan.dragIndex === null) return;
    const pointer = pointerToPlan(event);
    const planter = plan.planters[plan.dragIndex];
    planter.position.x = THREE.MathUtils.clamp(
      pointer.x + plan.dragOffset.x,
      PLANTER_BOUNDS.minX,
      PLANTER_BOUNDS.maxX,
    );
    planter.position.z = THREE.MathUtils.clamp(
      pointer.z + plan.dragOffset.y,
      PLANTER_BOUNDS.minZ,
      PLANTER_BOUNDS.maxZ,
    );
    if (state.activePlan === planKey) {
      mainPlanters[plan.dragIndex].position.copy(planter.position);
    }
    markShadowsDirty();
    analyzePlan(plan);
    updateStagePlanCopy();
    drawPlanView(planKey);
    stageRenderer.render(mainContext.scene, stageCamera);
  });

  const release = (event) => {
    if (plan.dragIndex === null) return;
    plan.dragIndex = null;
    canvas.parentElement.style.cursor = '';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
}

function resetScene() {
  state.locationId = DEFAULT_LOCATION;
  state.date = DEFAULT_DATE;
  state.orientation = DEFAULT_ORIENTATION;
  state.minutes = DEFAULT_TIME;
  state.activePlan = 'A';
  state.playing = false;
  ui.locationSelect.value = state.locationId;
  updateLocationUI();
  updateDateUI();
  for (const planKey of ['A', 'B']) {
    const plan = plans[planKey];
    plan.positions.forEach(([x, z], index) => plan.planters[index].position.set(x, 0, z));
  }
  syncMainPlanters();
  setActivePlan('A');
  updateAll();
  updatePlayButton();
  showToast('Plans reset');
}

let toastTimer = 0;
function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('is-visible'), 1900);
}

function updatePlayButton() {
  ui.playButton.classList.toggle('is-playing', state.playing);
  ui.playButton.setAttribute('aria-label', state.playing ? 'Pause daylight animation' : 'Play through daylight');
}

function togglePlaying() {
  state.playing = !state.playing;
  updatePlayButton();
  if (state.playing) {
    const max = Number(ui.timeRange.max);
    if (state.minutes >= max - 2) state.minutes = Number(ui.timeRange.min);
  }
}

function bindUI() {
  populateLocations();
  populateStatusGrids();
  updateDateUI();
  ui.locationSelect.addEventListener('change', () => {
    state.locationId = ui.locationSelect.value;
    updateLocationUI();
    updateAll();
  });
  ui.dateInput.addEventListener('change', () => {
    if (!ui.dateInput.value) return;
    state.date = ui.dateInput.value;
    updateDateUI();
    updateAll();
  });
  ui.orientationRange.addEventListener('input', () => setOrientation(ui.orientationRange.value));
  document.querySelectorAll('[data-orientation]').forEach((button) => {
    button.addEventListener('click', () => setOrientation(button.dataset.orientation));
  });
  ui.timeRange.addEventListener('input', () => setTime(ui.timeRange.value));
  ui.playButton.addEventListener('click', togglePlaying);
  document.querySelectorAll('.plan-tab').forEach((tab) => {
    tab.addEventListener('click', () => setActivePlan(tab.dataset.plan));
  });
  document.querySelectorAll('.plan-card').forEach((card) => {
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActivePlan(card.dataset.plan);
      }
    });
  });
  bindCompassDial();
  bindPlanDrag('A');
  bindPlanDrag('B');
  ui.resetButton.addEventListener('click', resetScene);

  const openModal = () => {
    ui.modelModal.hidden = false;
    ui.modelModal.querySelector('.modal-close').focus();
  };
  const closeModal = () => {
    ui.modelModal.hidden = true;
    ui.modelButton.focus();
  };
  ui.modelButton.addEventListener('click', openModal);
  ui.modelModal.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ui.modelModal.hidden) closeModal();
    if (event.key === ' ' && event.target === document.body) {
      event.preventDefault();
      togglePlaying();
    }
  });

  const stageObserver = new ResizeObserver(resizeStage);
  stageObserver.observe(stageCanvas);
}

let previousFrame = performance.now();
let playAccumulator = 0;

function frame(now) {
  const delta = Math.min(0.08, (now - previousFrame) / 1000);
  previousFrame = now;
  if (state.playing) {
    playAccumulator += delta;
    if (playAccumulator > 0.085) {
      playAccumulator = 0;
      const max = Number(ui.timeRange.max);
      state.minutes = Math.min(max, state.minutes + 1.25);
      if (state.minutes >= max) {
        state.minutes = max;
        state.playing = false;
        updatePlayButton();
      }
      updateAll();
    }
  }
  orbitControls.update();
  requestAnimationFrame(frame);
}

populateLocations();
bindUI();
populateStatusGrids();
updateLocationUI();
updateDateUI();
setActivePlan('A');
resizeStage();
updateAll();
stageReady = true;
window.setTimeout(() => {
  ui.loadingCover.classList.add('is-hidden');
  document.body.classList.remove('is-loading');
}, 550);
requestAnimationFrame(frame);
