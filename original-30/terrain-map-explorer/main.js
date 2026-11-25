import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewport = document.querySelector('#viewport');
const labelsLayer = document.querySelector('#labels');
const loader = document.querySelector('#loader');
const readout = document.querySelector('#readout');
const readoutValue = document.querySelector('#cursor-elevation');
const viewButtons = [...document.querySelectorAll('.view-button')];
const hint = document.querySelector('.map-hint');

const ISLAND_WIDTH = 100;
const ISLAND_DEPTH = 84;
const SEGMENTS_X = 224;
const SEGMENTS_Z = 188;
const SEA_LEVEL = 0;
const HIGHEST_METRES = 2840;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash2(x, y) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm(x, y, octaves = 5, lacunarity = 2.03, gain = 0.5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return sum / normalizer;
}

function ridgedNoise(x, y, octaves = 5) {
  let sum = 0;
  let amplitude = 0.52;
  let frequency = 1;
  let normalizer = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    const n = valueNoise(x * frequency, y * frequency);
    const ridge = 1 - Math.abs(n * 2 - 1);
    sum += ridge * ridge * amplitude;
    normalizer += amplitude;
    frequency *= 2.02;
    amplitude *= 0.51;
  }
  return sum / normalizer;
}

function gaussian(x, z, cx, cz, sx, sz, rotation = 0) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = x - cx;
  const dz = z - cz;
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  return Math.exp(-0.5 * ((rx * rx) / (sx * sx) + (rz * rz) / (sz * sz)));
}

function coastRadius(angle) {
  return (
    0.685 +
    0.038 * Math.sin(angle * 3 + 0.35) +
    0.031 * Math.sin(angle * 7 - 1.32) +
    0.019 * Math.cos(angle * 11 + 0.8) +
    0.012 * Math.sin(angle * 17 - 0.2)
  );
}

function terrainHeight(x, z) {
  const nx = x / (ISLAND_WIDTH * 0.5);
  const nz = z / (ISLAND_DEPTH * 0.5);
  const radius = Math.hypot(nx, nz);
  const angle = Math.atan2(nz, nx);
  const coast = coastRadius(angle);

  const warpX = nx + (fbm(nx * 2.2 + 8.4, nz * 2.2 - 3.1, 4) - 0.5) * 0.17;
  const warpZ = nz + (fbm(nx * 2.05 - 5.7, nz * 2.05 + 7.3, 4) - 0.5) * 0.17;

  const mainMassif =
    gaussian(warpX, warpZ, -0.105, -0.045, 0.235, 0.205, -0.24) * 1.2 +
    gaussian(warpX, warpZ, 0.16, 0.12, 0.18, 0.115, 0.65) * 0.66 +
    gaussian(warpX, warpZ, -0.255, 0.265, 0.145, 0.105, 0.25) * 0.48 +
    gaussian(warpX, warpZ, -0.02, 0.355, 0.12, 0.085, -0.1) * 0.41 +
    gaussian(warpX, warpZ, 0.315, -0.255, 0.135, 0.095, 0.7) * 0.25;

  const ridges = ridgedNoise(warpX * 4.35 + 2.4, warpZ * 4.35 - 4.1, 5);
  const foothills = fbm(warpX * 3.15 + 9.1, warpZ * 3.15 + 1.7, 5);
  const detail = fbm(nx * 12.4 - 4.2, nz * 12.4 + 3.6, 4);

  const inland = smoothstep(1.0, 0.12, radius / coast);
  const shoulder = smoothstep(0.98, 0.46, radius / coast);
  let mountain =
    mainMassif * 17.8 +
    (ridges - 0.42) * 12.4 * shoulder +
    (foothills - 0.5) * 4.8 * inland +
    (detail - 0.5) * 1.65 * inland;
  mountain = Math.max(0, mountain);

  const landHeight = 0.58 + mountain;

  const outerShelf = smoothstep(coast + 0.43, coast - 0.015, radius);
  const oceanFloor = -13.3 + 13.8 * outerShelf;
  const seabedTexture = (fbm(nx * 7.5 + 3.1, nz * 7.5 - 8.2, 4) - 0.5) * 0.8;
  const seaHeight = oceanFloor + seabedTexture * (0.5 + outerShelf * 0.6);

  const shoreBlend = smoothstep(coast + 0.085, coast - 0.045, radius);
  let height = lerp(seaHeight, landHeight, shoreBlend);

  if (radius > coast + 0.06) {
    height -= (radius - coast - 0.06) * 1.9;
  }

  return height;
}

function buildTerrain() {
  const geometry = new THREE.PlaneGeometry(
    ISLAND_WIDTH,
    ISLAND_DEPTH,
    SEGMENTS_X,
    SEGMENTS_Z
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const vertexCount = positions.count;
  const heights = new Float32Array(vertexCount);
  let maxHeight = -Infinity;
  let minHeight = Infinity;

  for (let i = 0; i < vertexCount; i += 1) {
    const height = terrainHeight(positions.getX(i), positions.getZ(i));
    positions.setY(i, height);
    heights[i] = height;
    maxHeight = Math.max(maxHeight, height);
    minHeight = Math.min(minHeight, height);
  }

  const colors = new Float32Array(vertexCount * 3);
  const deepWater = new THREE.Color(0x315d62);
  const shallowWater = new THREE.Color(0x6f9990);
  const seaGlass = new THREE.Color(0xbea985);
  const sand = new THREE.Color(0xd7c79a);
  const plain = new THREE.Color(0xbcba8d);
  const meadow = new THREE.Color(0x899d73);
  const forest = new THREE.Color(0x5d7861);
  const heath = new THREE.Color(0x6e8468);
  const rock = new THREE.Color(0x8a7e6e);
  const highRock = new THREE.Color(0xb4a994);
  const snow = new THREE.Color(0xf0ede2);
  const colour = new THREE.Color();
  const rowWidth = SEGMENTS_X + 1;
  const maxRange = Math.max(1, maxHeight);

  for (let i = 0; i < vertexCount; i += 1) {
    const height = heights[i];
    const ix = i % rowWidth;
    const iz = Math.floor(i / rowWidth);
    const left = heights[iz * rowWidth + Math.max(0, ix - 1)];
    const right = heights[iz * rowWidth + Math.min(SEGMENTS_X, ix + 1)];
    const back = heights[Math.max(0, iz - 1) * rowWidth + ix];
    const front = heights[Math.min(SEGMENTS_Z, iz + 1) * rowWidth + ix];
    const slope = Math.hypot(right - left, front - back) / 0.9;
    const cavity = Math.max(0, (left + right + back + front) * 0.25 - height);

    if (height < 0) {
      const depth = clamp((height + 13.5) / 13.5, 0, 1);
      colour.copy(deepWater).lerp(shallowWater, depth);
      colour.lerp(seaGlass, smoothstep(0.72, 1, depth) * 0.42);
    } else {
      const altitude = clamp(height / maxRange, 0, 1);
      colour.copy(sand);
      colour.lerp(plain, smoothstep(0.025, 0.12, altitude));
      colour.lerp(meadow, smoothstep(0.1, 0.28, altitude));
      colour.lerp(forest, smoothstep(0.25, 0.49, altitude));
      colour.lerp(heath, smoothstep(0.46, 0.64, altitude));
      colour.lerp(rock, smoothstep(0.61, 0.77, altitude));
      colour.lerp(highRock, smoothstep(0.75, 0.87, altitude));
      colour.lerp(snow, smoothstep(0.88, 0.95, altitude));

      if (slope > 0.7) {
        colour.lerp(rock, clamp((slope - 0.7) * 0.075, 0, 0.22));
      }
    }

    const textureNoise = fbm(positions.getX(i) * 0.16, positions.getZ(i) * 0.16, 3) - 0.5;
    colour.offsetHSL(textureNoise * 0.008, textureNoise * 0.035, textureNoise * 0.035);
    colour.multiplyScalar(1 - clamp(cavity * 0.06, 0, 0.115));

    colors[i * 3] = colour.r;
    colors[i * 3 + 1] = colour.g;
    colors[i * 3 + 2] = colour.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const contourInterval = maxHeight * (100 / HIGHEST_METRES);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    flatShading: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uContourInterval = { value: contourInterval };
    shader.vertexShader = `varying vec3 vTopoWorld;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vTopoWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = `
      varying vec3 vTopoWorld;
      uniform float uContourInterval;

      float contourLine(float value) {
        float antiAlias = max(fwidth(value), 0.0001);
        float distanceToLine = abs(fract(value + 0.5) - 0.5);
        return 1.0 - smoothstep(antiAlias * 0.65, antiAlias * 1.55, distanceToLine);
      }
    ` + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float topoHeight = vTopoWorld.y;
      if (topoHeight > 0.16) {
        float minorScale = topoHeight / uContourInterval;
        float majorScale = topoHeight / (uContourInterval * 5.0);
        float minorLine = contourLine(minorScale);
        float majorLine = contourLine(majorScale);
        vec3 contourInk = vec3(0.052, 0.072, 0.058);
        diffuseColor.rgb = mix(diffuseColor.rgb, contourInk, minorLine * 0.26);
        diffuseColor.rgb = mix(diffuseColor.rgb, contourInk, majorLine * 0.27);
        float graticule = contourLine(topoHeight / (uContourInterval * 25.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.21, 0.14), graticule * 0.06);
      } else {
        float seaScale = topoHeight / 1.38;
        float seaLine = contourLine(seaScale);
        float seaMajor = contourLine(topoHeight / 6.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.89, 0.84), seaLine * 0.23);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.79, 0.92, 0.87), seaMajor * 0.26);
      }`
    );
  };
  material.customProgramCacheKey = () => `verdant-terrain-${contourInterval.toFixed(3)}`;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Isla Verdant terrain';

  return { mesh, geometry, heights, maxHeight, minHeight, contourInterval };
}

function findCoastPoint(angle, targetHeight = 0.24) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let previousRadius = 0.4;
  let previousHeight = terrainHeight(
    cos * previousRadius * ISLAND_WIDTH * 0.5,
    sin * previousRadius * ISLAND_DEPTH * 0.5
  );
  let result = null;

  for (let radius = 0.41; radius < 1.02; radius += 0.005) {
    const height = terrainHeight(
      cos * radius * ISLAND_WIDTH * 0.5,
      sin * radius * ISLAND_DEPTH * 0.5
    );
    if (previousHeight >= targetHeight && height < targetHeight) {
      const mix = (targetHeight - previousHeight) / (height - previousHeight);
      const coast = lerp(previousRadius, radius, mix);
      result = new THREE.Vector3(
        cos * coast * ISLAND_WIDTH * 0.5,
        0.23,
        sin * coast * ISLAND_DEPTH * 0.5
      );
    }
    previousRadius = radius;
    previousHeight = height;
  }

  return result;
}

function buildCoastline() {
  const points = [];
  const segments = 260;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const point = findCoastPoint(angle);
    if (point) points.push(point);
  }

  points.push(points[0].clone());
  const outerCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const outerGeometry = new THREE.TubeGeometry(outerCurve, 280, 0.085, 3, true);
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0xece3c9,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const outerLine = new THREE.Mesh(outerGeometry, outerMaterial);
  outerLine.renderOrder = 3;

  const innerPoints = points.map((point) => point.clone().multiplyScalar(0.991));
  innerPoints.forEach((point) => {
    point.y = 0.3;
  });
  const innerCurve = new THREE.CatmullRomCurve3(innerPoints, true, 'centripetal');
  const innerGeometry = new THREE.TubeGeometry(innerCurve, 280, 0.032, 3, true);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0x365e5e,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const innerLine = new THREE.Mesh(innerGeometry, innerMaterial);
  innerLine.renderOrder = 3;

  return { outerLine, innerLine, points };
}

function buildTrail(peak) {
  const controlPoints = [
    [0.49, 0.36],
    [0.39, 0.31],
    [0.35, 0.2],
    [0.24, 0.15],
    [0.2, 0.035],
    [0.105, -0.005],
    [0.03, -0.02],
    [-0.025, -0.04],
  ].map(
    ([x, z]) =>
      new THREE.Vector3(
        x * ISLAND_WIDTH * 0.5,
        0,
        z * ISLAND_DEPTH * 0.5
      )
  );

  const summit = new THREE.Vector3(peak.x, 0, peak.z);
  controlPoints[controlPoints.length - 1].copy(summit);
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.35);
  const samples = curve.getPoints(130);
  samples.forEach((point) => {
    point.y = terrainHeight(point.x, point.z) + 0.28;
  });

  const geometry = new THREE.BufferGeometry().setFromPoints(samples);
  const material = new THREE.LineDashedMaterial({
    color: 0xa55135,
    dashSize: 1.15,
    gapSize: 0.82,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.renderOrder = 4;

  const trailhead = samples[0].clone();
  trailhead.y = Math.max(0.45, terrainHeight(trailhead.x, trailhead.z) + 0.45);
  const markerGeometry = new THREE.TorusGeometry(0.72, 0.11, 5, 28);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xb25e3e,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.rotation.x = Math.PI / 2;
  marker.position.copy(trailhead);
  marker.renderOrder = 4;

  return { line, marker };
}

function buildSummitMarker(peak) {
  const group = new THREE.Group();
  group.position.set(peak.x, peak.y + 0.15, peak.z);

  const ringGeometry = new THREE.RingGeometry(0.78, 0.9, 36);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x2a3e39,
    transparent: true,
    opacity: 0.64,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  const dotGeometry = new THREE.CircleGeometry(0.17, 16);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xa95135,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.1;
  group.add(dot);

  return group;
}

function buildSea() {
  const geometry = new THREE.PlaneGeometry(980, 980, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4b8182,
    roughness: 0.3,
    metalness: 0.02,
    transparent: true,
    opacity: 0.69,
    depthWrite: false,
  });

  const timeUniform = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeaTime = timeUniform;
    shader.vertexShader = `uniform float uSeaTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float swellA = sin(position.x * 0.155 + uSeaTime * 0.32) * cos(position.z * 0.125 - uSeaTime * 0.18);
      float swellB = sin((position.x - position.z) * 0.29 - uSeaTime * 0.24);
      transformed.y += (swellA + swellB * 0.28) * 0.075;`
    );
  };
  material.customProgramCacheKey = () => 'verdant-sea-v1';

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = SEA_LEVEL;
  mesh.renderOrder = 2;
  return { mesh, material, timeUniform };
}

function buildIslets() {
  const group = new THREE.Group();
  const isletMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d9577,
    roughness: 1,
    flatShading: true,
  });
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x777867,
    roughness: 1,
    flatShading: true,
  });

  const isletData = [
    [-52, 20, 2.8, 1.5, 3.2],
    [49, -28, 2.3, 1.1, 2.7],
    [-43, -33, 1.6, 0.8, 2],
  ];

  isletData.forEach(([x, z, sx, sy, sz], index) => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, index === 2 ? rockMaterial : isletMaterial);
    mesh.position.set(x, -0.2, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(0.2 * index, 0.8 * index, 0.1 * index);
    group.add(mesh);
  });

  return group;
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd7e1da, 230, 510);

const camera = new THREE.PerspectiveCamera(37, window.innerWidth / window.innerHeight, 0.5, 900);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.7 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.domElement.tabIndex = -1;
viewport.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

const terrainData = buildTerrain();
world.add(terrainData.mesh);

let peak = { x: 0, y: 0, z: 0 };
const positionAttribute = terrainData.geometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i += 1) {
  const y = positionAttribute.getY(i);
  if (y > peak.y) {
    peak = {
      x: positionAttribute.getX(i),
      y,
      z: positionAttribute.getZ(i),
    };
  }
}

const summitMarker = buildSummitMarker(peak);
world.add(summitMarker);

const coastline = buildCoastline();
world.add(coastline.outerLine, coastline.innerLine);

const trail = buildTrail(peak);
world.add(trail.line, trail.marker);

const sea = buildSea();
scene.add(sea.mesh);

const islets = buildIslets();
scene.add(islets);

const hemisphereLight = new THREE.HemisphereLight(0xfff5df, 0x315957, 1.72);
scene.add(hemisphereLight);

const sun = new THREE.DirectionalLight(0xffefcb, 2.36);
sun.position.set(-54, 77, 39);
scene.add(sun);

const rimLight = new THREE.DirectionalLight(0xacd2cd, 0.72);
rimLight.position.set(58, 31, -58);
scene.add(rimLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.72;
controls.minDistance = 52;
controls.maxDistance = 440;
controls.minPolarAngle = 0.16;
controls.maxPolarAngle = 1.39;
controls.target.set(0, 7.6, 0);

let currentView = 'overview';
let transition = null;
let introFinished = false;
let lastPointerDown = 0;

function responsiveScale() {
  if (window.innerWidth <= 680) return 1.8;
  if (window.innerWidth / window.innerHeight < 1.05) return 1.58;
  return 0.9;
}

function presetFor(name) {
  const scale = responsiveScale();
  let position;
  let target;

  if (name === 'coast') {
    target = new THREE.Vector3(8, 2.8, 8);
    position = new THREE.Vector3(81, 25, 70).sub(target).multiplyScalar(scale).add(target);
    if (scale > 1.4) {
      position.y += 7 * (scale - 1);
    }
  } else if (name === 'summit') {
    target = new THREE.Vector3(peak.x * 0.72, peak.y * 0.53, peak.z * 0.72);
    position = new THREE.Vector3(42, 43, 43).sub(target).multiplyScalar(Math.min(scale, 1.52)).add(target);
  } else {
    target = new THREE.Vector3(0, 7.6, 0);
    position = new THREE.Vector3(83, 68, 101).sub(target).multiplyScalar(scale).add(target);
    if (scale > 1.4) {
      position.y += 14 * (scale - 1);
    }
  }

  return { position, target };
}

function setActiveView(name) {
  currentView = name;
  viewButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === name);
  });
}

function flyTo(name, duration = 1500) {
  const preset = presetFor(name);
  setActiveView(name);
  transition = {
    start: performance.now(),
    duration: reduceMotion ? 1 : duration,
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: preset.position,
    endTarget: preset.target,
  };
  controls.enabled = false;
}

viewButtons.forEach((button) => {
  button.addEventListener('click', () => flyTo(button.dataset.view));
});

function dismissHint() {
  hint.style.opacity = '0';
  hint.style.transform = window.innerWidth <= 900 ? 'translateY(5px)' : 'translateX(-50%) translateY(5px)';
}

renderer.domElement.addEventListener('pointerdown', () => {
  lastPointerDown = performance.now();
  transition = null;
  controls.enabled = true;
  dismissHint();
});

renderer.domElement.addEventListener('wheel', dismissHint, { passive: true });

const markers = [];
function createLabel({ title, detail, position, featured = false, minor = false, view = 'summit' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `map-label${featured ? ' is-featured' : ''}${minor ? ' is-minor' : ''}`;
  button.setAttribute('aria-label', `${title}, ${detail}`);
  button.innerHTML = `<span class="label-text"><span class="label-title">${title}</span><span class="label-detail">${detail}</span></span>`;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const savedScale = responsiveScale();
    const markerTarget = position.clone();
    markerTarget.y = Math.max(2, markerTarget.y * 0.65);
    const offset = new THREE.Vector3(34, 30, 38).multiplyScalar(savedScale);
    transition = {
      start: performance.now(),
      duration: reduceMotion ? 1 : 1350,
      startPosition: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPosition: markerTarget.clone().add(offset),
      endTarget: markerTarget,
    };
    controls.enabled = false;
    lastPointerDown = performance.now();
    setActiveView(view);
  });
  labelsLayer.appendChild(button);
  markers.push({ element: button, position: position.clone() });
}

const summitLabelPosition = new THREE.Vector3(peak.x, peak.y + 1.4, peak.z);
createLabel({
  title: 'Mont Aurelia',
  detail: `Summit · ${HIGHEST_METRES.toLocaleString()} m`,
  position: summitLabelPosition,
  featured: true,
  view: 'summit',
});

const secondPeakX = 11;
const secondPeakZ = 8;
const secondPeakY = terrainHeight(secondPeakX, secondPeakZ);
createLabel({
  title: 'Kestrel Ridge',
  detail: `${Math.round((secondPeakY / terrainData.maxHeight) * HIGHEST_METRES).toLocaleString()} m · Eastern escarpment`,
  position: new THREE.Vector3(secondPeakX, secondPeakY + 1, secondPeakZ),
  view: 'summit',
});

const valleyX = 12;
const valleyZ = 16;
const valleyY = terrainHeight(valleyX, valleyZ);
createLabel({
  title: 'Cypress Vale',
  detail: `Sheltered valley · ${Math.round((valleyY / terrainData.maxHeight) * HIGHEST_METRES).toLocaleString()} m`,
  position: new THREE.Vector3(valleyX, valleyY + 0.8, valleyZ),
  minor: true,
  view: 'overview',
});

const bayPoint = findCoastPoint(0.59, 0.3) || new THREE.Vector3(31, 0.25, 28);
createLabel({
  title: 'Lantern Bay',
  detail: 'Harbour · anchorage 8 fathoms',
  position: bayPoint.clone().add(new THREE.Vector3(0, 0.8, 0)),
  view: 'coast',
});

const northPoint = findCoastPoint(-2.18, 0.22) || new THREE.Vector3(-39, 0.2, -19);
createLabel({
  title: 'The North Sound',
  detail: 'Cold current · shoaling shelf',
  position: northPoint.clone().add(new THREE.Vector3(-1, 0.5, -1)),
  minor: true,
  view: 'coast',
});

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let pointerClient = { x: 0, y: 0 };
let pointerInside = false;
let lastHoverSample = 0;

function updateCursorReadout(event) {
  const now = performance.now();
  if (now - lastHoverSample < 68) return;
  lastHoverSample = now;
  pointerClient = { x: event.clientX, y: event.clientY };
  pointerNdc.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObject(terrainData.mesh, false);
  if (!hits.length) {
    readout.classList.remove('is-visible');
    return;
  }

  const height = hits[0].point.y;
  const metres = Math.round((height / terrainData.maxHeight) * HIGHEST_METRES);
  if (height < -0.35) {
    const depth = Math.abs(Math.round((height / terrainData.maxHeight) * HIGHEST_METRES));
    readoutValue.textContent = `−${depth.toLocaleString()} m`;
  } else {
    readoutValue.textContent = `${Math.max(0, metres).toLocaleString()} m`;
  }
  readout.classList.add('is-visible');
}

if (!isCoarsePointer) {
  renderer.domElement.addEventListener('pointermove', (event) => {
    pointerInside = true;
    updateCursorReadout(event);
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    pointerInside = false;
    readout.classList.remove('is-visible');
  });
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const temp = new THREE.Vector3();

  markers.forEach((marker) => {
    temp.copy(marker.position).project(camera);
    const visible = temp.z > -1 && temp.z < 1 && temp.x > -1.15 && temp.x < 1.15 && temp.y > -1.1 && temp.y < 1.1;
    marker.element.classList.toggle('is-visible', visible);
    if (!visible) return;

    const x = (temp.x * 0.5 + 0.5) * width;
    const y = (-temp.y * 0.5 + 0.5) * height;
    const alignLeft = x > width * 0.64;
    marker.element.classList.toggle('is-left', alignLeft);
    const xShift = alignLeft ? '-100%' : '0';
    marker.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${xShift}, -50%)`;
  });
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.7 : 2));
  renderer.setSize(width, height);
}

window.addEventListener('resize', onResize);

const introPreset = presetFor('overview');
const introScale = window.innerWidth <= 680 ? 1.075 : 1.14;
camera.position
  .copy(introPreset.position)
  .sub(introPreset.target)
  .multiplyScalar(introScale)
  .add(introPreset.target);
camera.position.y += introScale > 1 ? 8 : 6;
controls.target.copy(introPreset.target);
camera.lookAt(controls.target);
controls.update();

window.setTimeout(() => {
  transition = {
    start: performance.now(),
    duration: reduceMotion ? 1 : 1650,
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPosition: introPreset.position,
    endTarget: introPreset.target,
  };
  controls.enabled = false;
  document.body.classList.add('is-ready');
  introFinished = true;
}, reduceMotion ? 0 : 110);

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  sea.timeUniform.value = elapsed;

  if (transition) {
    const raw = clamp((performance.now() - transition.start) / transition.duration, 0, 1);
    const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    camera.position.lerpVectors(transition.startPosition, transition.endPosition, eased);
    controls.target.lerpVectors(transition.startTarget, transition.endTarget, eased);
    camera.lookAt(controls.target);
    if (raw >= 1) {
      transition = null;
      controls.enabled = true;
      controls.update();
    }
  } else {
    controls.enabled = true;
    controls.update();
  }

  if (!introFinished && elapsed > 0.4) {
    document.body.classList.add('is-ready');
    introFinished = true;
  }

  updateLabels();
  renderer.render(scene, camera);
}

animate();
