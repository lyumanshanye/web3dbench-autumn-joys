import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const labelsLayer = document.querySelector("#mapLabels");
const readout = document.querySelector("#readout");
const readoutCoords = document.querySelector("#readoutCoords");
const readoutElev = document.querySelector("#readoutElev");
const compassRose = document.querySelector("#compassRose");
const resetButton = document.querySelector("#resetView");
const rotateButton = document.querySelector("#toggleRotate");
const contourButton = document.querySelector("#toggleContours");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const WORLD_SIZE = 184;
const TERRAIN_SEGMENTS = 196;
const ELEVATION_SCALE = 200;
const SEA_LEVEL = 0;
const INK = new THREE.Color("#173c38");
const PAPER = new THREE.Color("#e7e5da");

const PEAKS = [
  { name: "Veyra Peak", x: -5.2, z: -4.4, amp: 10.8, sx: 9.9, sy: 7.2, rotation: -0.28, major: true },
  { name: "Morrow Horn", x: 10.2, z: 0.2, amp: 7.3, sx: 7.2, sy: 5.6, rotation: 0.54, major: true },
  { name: "The Sentinel", x: -13.4, z: 7.8, amp: 5.7, sx: 6.7, sy: 4.9, rotation: -0.74, major: false }
];

const LAKE = { x: 4.2, z: 9.2, radius: 3.5 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function smoothstep(min, max, value) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise2(x, y) {
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
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

function fbm(x, y, octaves = 5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += noise2(x * frequency, y * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2.04;
  }
  return value / total;
}

function distanceToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

function heightAt(x, z) {
  const u = x / 41;
  const v = z / 34.5;
  const radius = Math.hypot(u, v);
  const theta = Math.atan2(v, u);
  const coastNoise = (noise2(u * 3.2 + 15.4, v * 3.2 - 7.1) - 0.5) * 0.072;
  const coast =
    0.918 +
    Math.sin(theta * 3 + 0.9) * 0.082 +
    Math.sin(theta * 6 - 1.45) * 0.047 +
    Math.sin(theta * 11 + 0.25) * 0.025 +
    coastNoise;
  const shoreDistance = coast - radius;
  const landMask = smoothstep(0, 0.155, shoreDistance);

  if (shoreDistance < 0) {
    const depth = smoothstep(0, 0.62, -shoreDistance);
    const seafloor = 1.2 + fbm(u * 3.1 - 8.2, v * 3.1 + 4.7, 3) * 3.4;
    const broadBasin = (noise2(u * 1.2 + 3.3, v * 1.2 + 9.1) - 0.5) * 2.4;
    return -depth * (seafloor + broadBasin);
  }

  const lowRelief = 0.48 + fbm(u * 4.1 + 2.1, v * 4.1 - 3.7, 4) * 1.65;
  const fineRelief = fbm(u * 11.5 + 9.2, v * 11.5 + 2.4, 2) * 0.44;
  const ridgeNoise = 1 - Math.abs(fbm(u * 2.15 + 7.3, v * 2.15 + 4.2, 3) * 2 - 1);
  const ridges = Math.pow(ridgeNoise, 2.8) * 1.45;

  let elevation = landMask * (lowRelief + fineRelief + ridges);

  for (const peak of PEAKS) {
    const dx = x - peak.x;
    const dz = z - peak.z;
    const cos = Math.cos(peak.rotation);
    const sin = Math.sin(peak.rotation);
    const rx = dx * cos + dz * sin;
    const rz = -dx * sin + dz * cos;
    const shape = Math.exp(-(rx * rx / (2 * peak.sx * peak.sx) + rz * rz / (2 * peak.sy * peak.sy)));
    elevation += peak.amp * shape * landMask;
  }

  const westValley = distanceToSegment(x, z, -10.5, 17.5, 2.4, 1.4);
  const southValley = distanceToSegment(x, z, -2.5, 3.2, 15.5, 23);
  elevation -= Math.exp(-Math.pow(westValley / 4.2, 2)) * 1.03 * landMask;
  elevation -= Math.exp(-Math.pow(southValley / 3.0, 2)) * 0.68 * landMask;

  const lakeDistance = Math.hypot(x - LAKE.x, z - LAKE.z);
  elevation -= Math.exp(-Math.pow(lakeDistance / 4.1, 2) * 1.8) * 3.05 * landMask;

  return Math.max(0, elevation);
}

const terrainHeights = new Float32Array((TERRAIN_SEGMENTS + 1) * (TERRAIN_SEGMENTS + 1));
const terrainStep = WORLD_SIZE / TERRAIN_SEGMENTS;

for (let iz = 0; iz <= TERRAIN_SEGMENTS; iz += 1) {
  for (let ix = 0; ix <= TERRAIN_SEGMENTS; ix += 1) {
    const x = -WORLD_SIZE / 2 + ix * terrainStep;
    const z = -WORLD_SIZE / 2 + iz * terrainStep;
    terrainHeights[iz * (TERRAIN_SEGMENTS + 1) + ix] = heightAt(x, z);
  }
}

function sampleHeight(x, z) {
  const gridX = clamp((x + WORLD_SIZE / 2) / terrainStep, 0, TERRAIN_SEGMENTS);
  const gridZ = clamp((z + WORLD_SIZE / 2) / terrainStep, 0, TERRAIN_SEGMENTS);
  const ix = Math.min(Math.floor(gridX), TERRAIN_SEGMENTS - 1);
  const iz = Math.min(Math.floor(gridZ), TERRAIN_SEGMENTS - 1);
  const tx = gridX - ix;
  const tz = gridZ - iz;
  const row = TERRAIN_SEGMENTS + 1;
  const a = terrainHeights[iz * row + ix];
  const b = terrainHeights[iz * row + ix + 1];
  const c = terrainHeights[(iz + 1) * row + ix];
  const d = terrainHeights[(iz + 1) * row + ix + 1];
  return mix(mix(a, b, tx), mix(c, d, tx), tz);
}

const colorStops = [
  [0, new THREE.Color("#dfd2aa")],
  [1.1, new THREE.Color("#d1ceab")],
  [2.5, new THREE.Color("#b4c4a1")],
  [4.8, new THREE.Color("#91ab8c")],
  [7.3, new THREE.Color("#718d73")],
  [9.8, new THREE.Color("#828576")],
  [12.0, new THREE.Color("#b9ad94")],
  [14.2, new THREE.Color("#e7e0d0")]
];

const seaShallow = new THREE.Color("#91c1bc");
const seaDeep = new THREE.Color("#4f7b7d");
const scratchColor = new THREE.Color();

function colorForHeight(height, x, z) {
  if (height < 0) {
    const t = clamp(-height / 7.5, 0, 1);
    return scratchColor.copy(seaShallow).lerp(seaDeep, t);
  }
  let lower = colorStops[0];
  let upper = colorStops[colorStops.length - 1];
  for (let i = 0; i < colorStops.length - 1; i += 1) {
    if (height >= colorStops[i][0] && height <= colorStops[i + 1][0]) {
      lower = colorStops[i];
      upper = colorStops[i + 1];
      break;
    }
  }
  const range = upper[0] - lower[0] || 1;
  const t = clamp((height - lower[0]) / range, 0, 1);
  const grain = (noise2(x * 1.13 + 31, z * 1.13 - 17) - 0.5) * 0.055;
  return scratchColor.copy(lower[1]).lerp(upper[1], t).offsetHSL(0, grain * 0.22, grain);
}

function buildTerrain() {
  const vertexCount = (TERRAIN_SEGMENTS + 1) ** 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(TERRAIN_SEGMENTS * TERRAIN_SEGMENTS * 6);
  let vertexOffset = 0;
  let indexOffset = 0;

  for (let iz = 0; iz <= TERRAIN_SEGMENTS; iz += 1) {
    for (let ix = 0; ix <= TERRAIN_SEGMENTS; ix += 1) {
      const x = -WORLD_SIZE / 2 + ix * terrainStep;
      const z = -WORLD_SIZE / 2 + iz * terrainStep;
      const height = terrainHeights[iz * (TERRAIN_SEGMENTS + 1) + ix];
      positions[vertexOffset] = x;
      positions[vertexOffset + 1] = height;
      positions[vertexOffset + 2] = z;
      const color = colorForHeight(height, x, z);
      colors[vertexOffset] = color.r;
      colors[vertexOffset + 1] = color.g;
      colors[vertexOffset + 2] = color.b;
      vertexOffset += 3;
    }
  }

  const row = TERRAIN_SEGMENTS + 1;
  for (let iz = 0; iz < TERRAIN_SEGMENTS; iz += 1) {
    for (let ix = 0; ix < TERRAIN_SEGMENTS; ix += 1) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices[indexOffset] = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.91,
    metalness: 0.015,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = "Aurelia terrain";
  return mesh;
}

function buildContourGeometry() {
  const sets = {
    landMinor: [],
    landMajor: [],
    seaMinor: [],
    seaMajor: [],
    coast: []
  };
  const row = TERRAIN_SEGMENTS + 1;
  const step = terrainStep;
  const minLevel = -5.5;
  const maxLevel = 15;
  const levelStep = 0.5;
  const levelCount = Math.round((maxLevel - minLevel) / levelStep) + 1;
  const crossX = new Float32Array(4);
  const crossZ = new Float32Array(4);

  for (let iz = 0; iz < TERRAIN_SEGMENTS; iz += 1) {
    const z0 = -WORLD_SIZE / 2 + iz * step;
    const z1 = z0 + step;
    for (let ix = 0; ix < TERRAIN_SEGMENTS; ix += 1) {
      const x0 = -WORLD_SIZE / 2 + ix * step;
      const x1 = x0 + step;
      const h0 = terrainHeights[iz * row + ix];
      const h1 = terrainHeights[iz * row + ix + 1];
      const h2 = terrainHeights[(iz + 1) * row + ix + 1];
      const h3 = terrainHeights[(iz + 1) * row + ix];
      const cellMin = Math.min(h0, h1, h2, h3);
      const cellMax = Math.max(h0, h1, h2, h3);
      if (cellMax < minLevel || cellMin > maxLevel) continue;

      const firstLevel = clamp(Math.ceil((cellMin - minLevel) / levelStep), 0, levelCount - 1);
      const lastLevel = clamp(Math.floor((cellMax - minLevel) / levelStep), 0, levelCount - 1);

      for (let levelIndex = firstLevel; levelIndex <= lastLevel; levelIndex += 1) {
        const level = minLevel + levelIndex * levelStep;
        if (level <= cellMin + 1e-5 || level >= cellMax - 1e-5) continue;
        const major = Math.abs(level / 2.5 - Math.round(level / 2.5)) < 1e-5;
        let target;
        if (Math.abs(level) < 0.01) target = sets.coast;
        else if (level < 0) target = major ? sets.seaMajor : sets.seaMinor;
        else target = major ? sets.landMajor : sets.landMinor;
        let count = 0;

        if ((h0 < level && h1 >= level) || (h1 < level && h0 >= level)) {
          const t = (level - h0) / (h1 - h0);
          crossX[count] = mix(x0, x1, t);
          crossZ[count] = z0;
          count += 1;
        }
        if ((h1 < level && h2 >= level) || (h2 < level && h1 >= level)) {
          const t = (level - h1) / (h2 - h1);
          crossX[count] = x1;
          crossZ[count] = mix(z0, z1, t);
          count += 1;
        }
        if ((h2 < level && h3 >= level) || (h3 < level && h2 >= level)) {
          const t = (level - h2) / (h3 - h2);
          crossX[count] = mix(x1, x0, t);
          crossZ[count] = z1;
          count += 1;
        }
        if ((h3 < level && h0 >= level) || (h0 < level && h3 >= level)) {
          const t = (level - h3) / (h0 - h3);
          crossX[count] = x0;
          crossZ[count] = mix(z1, z0, t);
          count += 1;
        }

        if (count === 2) {
          target.push(crossX[0], level + 0.028, crossZ[0], crossX[1], level + 0.028, crossZ[1]);
        } else if (count === 4) {
          target.push(crossX[0], level + 0.028, crossZ[0], crossX[1], level + 0.028, crossZ[1]);
          target.push(crossX[2], level + 0.028, crossZ[2], crossX[3], level + 0.028, crossZ[3]);
        }
      }
    }
  }

  const group = new THREE.Group();
  group.name = "Contour lines";
  const definitions = [
    [sets.landMinor, "#1d413d", 0.26, 2],
    [sets.landMajor, "#1d413d", 0.55, 2],
    [sets.seaMinor, "#3f7d7e", 0.2, 2],
    [sets.seaMajor, "#3f7d7e", 0.36, 2],
    [sets.coast, "#153f3b", 0.92, 5]
  ];

  for (const [positions, color, opacity, renderOrder] of definitions) {
    if (!positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.renderOrder = renderOrder;
    group.add(lines);
  }

  group.userData.majorMaterials = group.children
    .filter((child, index) => index === 1 || index === 3 || index === 4)
    .map((child) => child.material);
  group.userData.allMaterials = group.children.map((child) => child.material);
  return group;
}

function buildWater() {
  const geometry = new THREE.PlaneGeometry(760, 760, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#618f91") },
      uShallow: { value: new THREE.Color("#8ebfbb") },
      uFog: { value: new THREE.Color("#e7e5da") },
      uSun: { value: new THREE.Vector3(-0.42, 0.82, 0.38).normalize() }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFog;
      uniform vec3 uSun;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDirection, vec3(0.0, 1.0, 0.0)), 0.0), 2.2);
        float rippleA = sin(vWorldPosition.x * 0.16 + uTime * 0.32) * sin(vWorldPosition.z * 0.19 - uTime * 0.24);
        float rippleB = sin((vWorldPosition.x + vWorldPosition.z) * 0.075 - uTime * 0.16);
        float glint = smoothstep(0.72, 1.0, rippleA * 0.55 + rippleB * 0.45 + 0.5);
        vec3 color = mix(uDeep, uShallow, 0.26 + fresnel * 0.6 + glint * 0.06);
        float distanceToCamera = length(cameraPosition - vWorldPosition);
        float fog = smoothstep(125.0, 335.0, distanceToCamera);
        color = mix(color, uFog, fog);
        float alpha = mix(0.67, 0.96, fog);
        alpha += glint * 0.025;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = SEA_LEVEL + 0.012;
  mesh.renderOrder = 4;
  mesh.name = "Aurelia sea";
  return mesh;
}

function buildSeafloor() {
  const geometry = new THREE.PlaneGeometry(760, 760);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: "#4e787a",
    roughness: 1,
    metalness: 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -12.8;
  mesh.receiveShadow = true;
  return mesh;
}

function buildLake() {
  const centerHeight = sampleHeight(LAKE.x, LAKE.z);
  let rimHeight = Infinity;
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2;
    rimHeight = Math.min(rimHeight, sampleHeight(LAKE.x + Math.cos(angle) * 4.55, LAKE.z + Math.sin(angle) * 4.55));
  }
  const waterLevel = mix(centerHeight, rimHeight, 0.63);
  const shape = new THREE.Shape();
  const points = [];
  for (let i = 0; i < 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2;
    const radius = 4.65 * (1 + Math.sin(angle * 5 + 1.1) * 0.12 + Math.sin(angle * 9 - 0.4) * 0.045);
    points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  shape.setFromPoints(points);
  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: "#79b8b6",
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.87,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(LAKE.x, waterLevel + 0.04, LAKE.z);
  mesh.renderOrder = 3;
  mesh.name = "Mirror Tarn";
  return { mesh, waterLevel };
}

function buildSurveyRoute() {
  const coords = [
    [-21.5, 22.4],
    [-17.8, 19.2],
    [-13.4, 17.3],
    [-9.2, 12.1],
    [-7.6, 6.8],
    [-5.2, -4.4]
  ];
  const curvePoints = coords.map(([x, z]) => new THREE.Vector3(x, sampleHeight(x, z) + 0.19, z));
  const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.36);
  const divisions = 150;
  const positions = [];
  for (let i = 0; i <= divisions; i += 1) {
    const point = curve.getPoint(i / divisions);
    point.y = sampleHeight(point.x, point.z) + 0.22;
    positions.push(point.x, point.y, point.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineDashedMaterial({
    color: "#a85438",
    transparent: true,
    opacity: 0.84,
    dashSize: 0.82,
    gapSize: 0.56,
    depthWrite: false,
    toneMapped: false
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.renderOrder = 3;

  const markerGroup = new THREE.Group();
  [0, 0.52, 1].forEach((t) => {
    const point = curve.getPoint(t);
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.44, 0.59, 24),
      new THREE.MeshBasicMaterial({
        color: "#a85438",
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(point.x, sampleHeight(point.x, point.z) + 0.29, point.z);
    marker.renderOrder = 4;
    markerGroup.add(marker);
  });
  return { line, markerGroup };
}

const scene = new THREE.Scene();
scene.background = PAPER;
scene.fog = new THREE.Fog(PAPER, 145, 360);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.5, 640);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 44;
controls.maxDistance = 290;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI * 0.485;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 0.78;
controls.autoRotateSpeed = 0.42;

const desktopViewDirection = new THREE.Vector3(0.69, 0.83, 0.72).normalize();
const mobileViewDirection = new THREE.Vector3(0.69, 2.35, 0.72).normalize();
const overviewTarget = new THREE.Vector3(-1.2, 2.4, 0);
let viewAnimation = null;

function currentViewDirection() {
  return window.innerWidth / window.innerHeight < 0.72 ? mobileViewDirection : desktopViewDirection;
}

function responsiveView() {
  const aspect = window.innerWidth / window.innerHeight;
  let fov = 33;
  let distance = 120;
  if (aspect < 0.72) {
    fov = 48;
    distance = 202;
  } else if (aspect < 1.05) {
    fov = 38;
    distance = 146;
  } else if (aspect < 1.32) {
    fov = 35;
    distance = 124;
  }
  return { fov, distance };
}

function snapToOverview() {
  const { fov, distance } = responsiveView();
  camera.fov = fov;
  camera.updateProjectionMatrix();
  controls.target.copy(overviewTarget);
  camera.position.copy(overviewTarget).addScaledVector(currentViewDirection(), distance);
  camera.lookAt(controls.target);
  controls.update();
}

function animateView(target, distance, duration = 900) {
  if (reducedMotion) {
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(currentViewDirection(), distance);
    controls.update();
    return;
  }
  const startTarget = controls.target.clone();
  const startPosition = camera.position.clone();
  const endPosition = target.clone().addScaledVector(currentViewDirection(), distance);
  viewAnimation = {
    startTime: performance.now(),
    duration,
    startTarget,
    endTarget: target.clone(),
    startPosition,
    endPosition
  };
}

function updateViewAnimation(now) {
  if (!viewAnimation) return;
  const progress = clamp((now - viewAnimation.startTime) / viewAnimation.duration, 0, 1);
  const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  controls.target.lerpVectors(viewAnimation.startTarget, viewAnimation.endTarget, eased);
  camera.position.lerpVectors(viewAnimation.startPosition, viewAnimation.endPosition, eased);
  if (progress >= 1) {
    viewAnimation = null;
  }
}

const terrain = buildTerrain();
scene.add(terrain);
scene.add(buildSeafloor());

const water = buildWater();
scene.add(water);

const contours = buildContourGeometry();
scene.add(contours);

const lake = buildLake();
scene.add(lake.mesh);

const survey = buildSurveyRoute();
scene.add(survey.line, survey.markerGroup);

const hemisphere = new THREE.HemisphereLight("#fff7e1", "#536e66", 1.55);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight("#fff1d4", 2.45);
sun.position.set(-52, 92, 42);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
sun.shadow.camera.near = 15;
sun.shadow.camera.far = 190;
sun.shadow.bias = -0.0007;
sun.shadow.normalBias = 0.035;
scene.add(sun);

const fill = new THREE.DirectionalLight("#b9d7d1", 0.42);
fill.position.set(54, 36, -60);
scene.add(fill);

snapToOverview();

const labels = [];
const labelDefinitions = [
  ...PEAKS.map((peak) => ({
    ...peak,
    altitude: sampleHeight(peak.x, peak.z) * ELEVATION_SCALE,
    kind: "peak"
  })),
  {
    name: "Halcyon Vale",
    x: -10.1,
    z: 15.7,
    altitude: sampleHeight(-10.1, 15.7) * ELEVATION_SCALE,
    kind: "valley",
    major: false
  },
  {
    name: "Mirror Tarn",
    x: LAKE.x,
    z: LAKE.z,
    altitude: lake.waterLevel * ELEVATION_SCALE,
    kind: "lake",
    major: false
  }
];

function buildLabels() {
  for (const item of labelDefinitions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-label${item.major ? "" : " is-minor"}${item.kind === "valley" || item.kind === "lake" ? " is-valley" : ""}`;
    button.setAttribute("aria-label", `Focus on ${item.name}`);
    button.innerHTML = `
      <span class="label-pin"></span>
      <span class="label-copy"><b>${item.name}</b><small>${Math.round(item.altitude / 10) * 10} m</small></span>
    `;
    const anchorY = item.kind === "lake" ? lake.waterLevel + 0.12 : sampleHeight(item.x, item.z) + 0.42;
    const anchor = new THREE.Vector3(item.x, anchorY, item.z);
    button.addEventListener("click", () => {
      const targetHeight = item.kind === "lake" ? lake.waterLevel : sampleHeight(item.x, item.z) * 0.62;
      const target = new THREE.Vector3(item.x, targetHeight, item.z);
      const distance = item.major ? (window.innerWidth < 700 ? 68 : 48) : window.innerWidth < 700 ? 78 : 62;
      animateView(target, distance);
    });
    labelsLayer.append(button);
    labels.push({ element: button, anchor });
  }
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  for (const label of labels) {
    const projected = label.anchor.clone().project(camera);
    const visible = projected.z > -1 && projected.z < 1;
    label.element.style.display = visible ? "" : "none";
    if (!visible) continue;
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    label.element.style.left = `${x.toFixed(1)}px`;
    label.element.style.top = `${y.toFixed(1)}px`;
  }
}

function buildProfile() {
  const svg = document.querySelector("#profileChart");
  const ns = "http://www.w3.org/2000/svg";
  const width = 280;
  const baseline = 59;
  const samples = 110;
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = mix(-42, 42, i / samples);
    const h = sampleHeight(x, 2.2);
    const px = (i / samples) * width;
    const py = baseline - Math.max(h, 0) * 3.18;
    points.push([px, py]);
  }

  const defs = document.createElementNS(ns, "defs");
  const gradient = document.createElementNS(ns, "linearGradient");
  gradient.setAttribute("id", "profileFill");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");
  const stop1 = document.createElementNS(ns, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#728d74");
  stop1.setAttribute("stop-opacity", "0.32");
  const stop2 = document.createElementNS(ns, "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#dfd2aa");
  stop2.setAttribute("stop-opacity", "0.1");
  gradient.append(stop1, stop2);
  defs.append(gradient);
  svg.append(defs);

  for (let i = 1; i < 3; i += 1) {
    const grid = document.createElementNS(ns, "line");
    grid.setAttribute("x1", "0");
    grid.setAttribute("x2", String(width));
    grid.setAttribute("y1", String(baseline - i * 15));
    grid.setAttribute("y2", String(baseline - i * 15));
    grid.setAttribute("stroke", "rgba(23,60,56,0.09)");
    grid.setAttribute("stroke-width", "0.65");
    grid.setAttribute("stroke-dasharray", "1 3");
    svg.append(grid);
  }

  const area = document.createElementNS(ns, "path");
  const areaData = [`M 0 ${baseline}`, ...points.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`), `L ${width} ${baseline}`, "Z"].join(" ");
  area.setAttribute("d", areaData);
  area.setAttribute("fill", "url(#profileFill)");
  svg.append(area);

  const line = document.createElementNS(ns, "path");
  line.setAttribute("d", points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#315c56");
  line.setAttribute("stroke-width", "1.05");
  line.setAttribute("stroke-linejoin", "round");
  svg.append(line);

  const highest = points.reduce((best, point) => (point[1] < best[1] ? point : best), points[0]);
  const peak = document.createElementNS(ns, "circle");
  peak.setAttribute("cx", highest[0].toFixed(2));
  peak.setAttribute("cy", highest[1].toFixed(2));
  peak.setAttribute("r", "1.8");
  peak.setAttribute("fill", "#a85438");
  svg.append(peak);
}

function formatCoordinate(point) {
  const latMinutes = 12 + (-point.z / 9.5);
  const lonMinutes = 4 + point.x / 9.5;
  return `${Math.floor(latMinutes)}°${(latMinutes % 1 * 60).toFixed(0).padStart(2, "0")}′N  ${Math.floor(lonMinutes)}°${(lonMinutes % 1 * 60).toFixed(0).padStart(2, "0")}′E`;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerInside = false;
let pointerDirty = false;

renderer.domElement.addEventListener("pointermove", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pointerInside = true;
  pointerDirty = true;
});

renderer.domElement.addEventListener("pointerleave", () => {
  pointerInside = false;
  readout.classList.remove("is-active");
  readoutCoords.textContent = "DRAG TO EXPLORE";
  readoutElev.textContent = "AURELIA · RELIEF MODEL";
});

function updateMonumentReadout() {
  if (!pointerInside || !pointerDirty) return;
  pointerDirty = false;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(terrain, false)[0];
  if (!hit) {
    readout.classList.remove("is-active");
    readoutCoords.textContent = "OPEN WATER";
    readoutElev.textContent = "AURELIA · RELIEF MODEL";
    return;
  }
  const elevation = hit.point.y * ELEVATION_SCALE;
  readout.classList.add("is-active");
  readoutCoords.textContent = formatCoordinate(hit.point);
  if (elevation < 10) {
    readoutElev.textContent = "COASTAL WATERS";
  } else {
    readoutElev.textContent = `${Math.round(elevation / 10) * 10} M ABOVE SEA`;
  }
}

resetButton.addEventListener("click", () => {
  animateView(overviewTarget, responsiveView().distance, 850);
});

rotateButton.addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
  rotateButton.classList.toggle("is-active", controls.autoRotate);
  rotateButton.setAttribute("aria-pressed", String(controls.autoRotate));
});

contourButton.addEventListener("click", () => {
  contours.visible = !contours.visible;
  survey.line.visible = contours.visible;
  survey.markerGroup.visible = contours.visible;
  contourButton.classList.toggle("is-active", contours.visible);
  contourButton.setAttribute("aria-pressed", String(contours.visible));
});

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  const { fov } = responsiveView();
  camera.fov = fov;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
});

buildLabels();
buildProfile();

const clock = new THREE.Clock();

function render(now) {
  requestAnimationFrame(render);
  const elapsed = clock.getElapsedTime();
  updateViewAnimation(now);
  controls.update();
  updateMonumentReadout();
  water.material.uniforms.uTime.value = elapsed;
  updateLabels();

  const azimuth = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle());
  compassRose.style.transform = `rotate(${(-azimuth).toFixed(2)}deg)`;
  renderer.render(scene, camera);
}

requestAnimationFrame(() => {
  render(performance.now());
  window.setTimeout(() => loading.classList.add("is-hidden"), 80);
});
