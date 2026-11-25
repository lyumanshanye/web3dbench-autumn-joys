import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const BED_SIZE = 220;
const BED_HALF = BED_SIZE / 2;
const BUILD_HEIGHT = 250;
const DEG = Math.PI / 180;
const BED_CONTACT_EPSILON = 0.75;

const viewport = document.querySelector('#viewport');
const fileInput = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
const fileMessage = document.querySelector('#file-message');
const sourceName = document.querySelector('#source-name');
const sourceKind = document.querySelector('#source-kind');
const sourceDetail = document.querySelector('#source-detail');
const demoButton = document.querySelector('#demo-button');
const resetButton = document.querySelector('#reset-button');
const exportButton = document.querySelector('#export-button');
const placeBedButton = document.querySelector('#place-bed');

const rotationInputs = {
  x: document.querySelector('#rot-x'),
  y: document.querySelector('#rot-y'),
  z: document.querySelector('#rot-z'),
};

const scaleInput = document.querySelector('#scale-input');
const scaleSlider = document.querySelector('#scale-slider');
const posXInput = document.querySelector('#pos-x');
const posXSlider = document.querySelector('#pos-x-slider');
const posZInput = document.querySelector('#pos-z');
const posZSlider = document.querySelector('#pos-z-slider');

const overhangInput = document.querySelector('#overhang-input');
const overhangSlider = document.querySelector('#overhang-slider');
const overhangCount = document.querySelector('#overhang-count');

const sectionEnabledInput = document.querySelector('#section-enabled');
const sectionInput = document.querySelector('#section-input');
const sectionSlider = document.querySelector('#section-slider');
const sectionStatus = document.querySelector('#section-status');
const sectionReadout = document.querySelector('#section-readout');
const sectionReadoutValue = document.querySelector('#section-readout-value');

const dimWidth = document.querySelector('#dim-width');
const dimDepth = document.querySelector('#dim-depth');
const dimHeight = document.querySelector('#dim-height');
const fitPill = document.querySelector('#fit-pill');
const fitText = document.querySelector('#fit-text');
const orientationReadout = document.querySelector('#orientation-readout');

const viewButtons = [...document.querySelectorAll('.view-button')];

const state = {
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  posX: 0,
  posZ: 0,
  originX: 0,
  originZ: 0,
  overhangThreshold: 45,
  sectionEnabled: false,
  sectionHeight: 55,
  sourceName: 'Procedural L-bracket',
  sourceKind: 'DEMO',
  activeView: 'orbit',
  transformBox: new THREE.Box3(),
};

let messageTimer = null;
let contourFrame = 0;
let sectionTop = 250;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x081019, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 3000);
camera.position.set(310, 330, 360);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 70, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 130;
controls.maxDistance = 980;
controls.minPolarAngle = 0.001;
controls.maxPolarAngle = Math.PI * 0.56;
controls.screenSpacePanning = true;
controls.zoomSpeed = 0.82;
controls.rotateSpeed = 0.66;
controls.panSpeed = 0.74;
controls.update();

const hemiLight = new THREE.HemisphereLight(0xb9dcf1, 0x0b1117, 1.65);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff2df, 3.0);
keyLight.position.set(185, 320, 165);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -190;
keyLight.shadow.camera.right = 190;
keyLight.shadow.camera.top = 250;
keyLight.shadow.camera.bottom = -130;
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 800;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.6;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x75c9e6, 1.0);
fillLight.position.set(-220, 140, -130);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff9b57, 1.15);
rimLight.position.set(80, 180, -260);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0x304252, 0.55));

const bedGroup = new THREE.Group();
scene.add(bedGroup);

const bedMaterial = new THREE.MeshStandardMaterial({
  color: 0x101b25,
  roughness: 0.62,
  metalness: 0.52,
});
const bed = new THREE.Mesh(new THREE.BoxGeometry(BED_SIZE, 5, BED_SIZE), bedMaterial);
bed.position.y = -2.5;
bed.receiveShadow = true;
bedGroup.add(bed);

const grid = new THREE.GridHelper(BED_SIZE, 22, 0x3b5a70, 0x203441);
grid.position.y = 0.035;
grid.material.transparent = true;
grid.material.opacity = 0.58;
grid.material.depthWrite = false;
bedGroup.add(grid);

const bedPerimeterGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-BED_HALF, 0.07, -BED_HALF),
  new THREE.Vector3(BED_HALF, 0.07, -BED_HALF),
  new THREE.Vector3(BED_HALF, 0.07, BED_HALF),
  new THREE.Vector3(-BED_HALF, 0.07, BED_HALF),
]);
const bedPerimeter = new THREE.LineLoop(
  bedPerimeterGeometry,
  new THREE.LineBasicMaterial({ color: 0x67dde5, transparent: true, opacity: 0.58 }),
);
bedGroup.add(bedPerimeter);

const centerLineMaterial = new THREE.LineBasicMaterial({
  color: 0x557184,
  transparent: true,
  opacity: 0.28,
});
const centerLines = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BED_HALF + 7, 0.08, 0),
    new THREE.Vector3(BED_HALF - 7, 0.08, 0),
    new THREE.Vector3(0, 0.08, -BED_HALF + 7),
    new THREE.Vector3(0, 0.08, BED_HALF - 7),
  ]),
  centerLineMaterial,
);
bedGroup.add(centerLines);

const volumeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(BED_SIZE, BUILD_HEIGHT, BED_SIZE));
const volumeEdges = new THREE.LineSegments(
  volumeGeometry,
  new THREE.LineBasicMaterial({
    color: 0x67dde5,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }),
);
volumeEdges.position.y = BUILD_HEIGHT / 2;
scene.add(volumeEdges);

const topPerimeterPoints = [
  new THREE.Vector3(-BED_HALF, BUILD_HEIGHT, -BED_HALF),
  new THREE.Vector3(BED_HALF, BUILD_HEIGHT, -BED_HALF),
  new THREE.Vector3(BED_HALF, BUILD_HEIGHT, BED_HALF),
  new THREE.Vector3(-BED_HALF, BUILD_HEIGHT, BED_HALF),
];
const topPerimeter = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(topPerimeterPoints),
  new THREE.LineBasicMaterial({ color: 0x67dde5, transparent: true, opacity: 0.37 }),
);
scene.add(topPerimeter);

const verticalAccentMaterial = new THREE.LineBasicMaterial({
  color: 0x67dde5,
  transparent: true,
  opacity: 0.42,
});
for (const x of [-BED_HALF, BED_HALF]) {
  for (const z of [-BED_HALF, BED_HALF]) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.1, z),
        new THREE.Vector3(x, BUILD_HEIGHT, z),
      ]),
      verticalAccentMaterial,
    );
    scene.add(line);
  }
}

const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), state.sectionHeight);
const ghostPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -state.sectionHeight);

const partRoot = new THREE.Group();
scene.add(partRoot);

const partMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8ced0,
  roughness: 0.5,
  metalness: 0.26,
  clippingPlanes: [],
  clipShadows: true,
});

const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0x93b4c3,
  transparent: true,
  opacity: 0.085,
  side: THREE.DoubleSide,
  depthWrite: false,
  clippingPlanes: [ghostPlane],
  visible: false,
});

const partMesh = new THREE.Mesh(new THREE.BufferGeometry(), partMaterial);
partMesh.castShadow = true;
partMesh.receiveShadow = true;
partRoot.add(partMesh);

const ghostMesh = new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial);
ghostMesh.renderOrder = 1;
ghostMesh.visible = false;
partRoot.add(ghostMesh);

const edgeMaterial = new THREE.LineBasicMaterial({
  color: 0x1b2b36,
  transparent: true,
  opacity: 0.52,
  clippingPlanes: [],
});
const partEdges = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMaterial);
partEdges.renderOrder = 1;
partRoot.add(partEdges);

const outsideMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSectionOn: { value: 0 },
    uSectionY: { value: state.sectionHeight },
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
    varying vec3 vWorldPosition;
    uniform float uSectionOn;
    uniform float uSectionY;
    void main() {
      if (uSectionOn > 0.5 && vWorldPosition.y > uSectionY) discard;
      bool insideX = vWorldPosition.x >= -110.0 && vWorldPosition.x <= 110.0;
      bool insideZ = vWorldPosition.z >= -110.0 && vWorldPosition.z <= 110.0;
      bool insideY = vWorldPosition.y >= -0.05 && vWorldPosition.y <= 250.0;
      if (insideX && insideZ && insideY) discard;
      gl_FragColor = vec4(1.0, 0.255, 0.22, 0.62);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -3,
});
const outsideMesh = new THREE.Mesh(new THREE.BufferGeometry(), outsideMaterial);
outsideMesh.renderOrder = 3;
partRoot.add(outsideMesh);

const overhangMaterial = new THREE.MeshBasicMaterial({
  color: 0xff9b4a,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.96,
  depthWrite: false,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -5,
  clippingPlanes: [],
});
const overhangMesh = new THREE.Mesh(new THREE.BufferGeometry(), overhangMaterial);
overhangMesh.renderOrder = 4;
scene.add(overhangMesh);

const sectionPlaneGroup = new THREE.Group();
sectionPlaneGroup.visible = false;
scene.add(sectionPlaneGroup);

const sectionPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(BED_SIZE, BED_SIZE),
  new THREE.MeshBasicMaterial({
    color: 0x67dde5,
    transparent: true,
    opacity: 0.038,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
sectionPlane.rotation.x = -Math.PI / 2;
sectionPlaneGroup.add(sectionPlane);

const sectionPlaneOutline = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BED_HALF, 0, -BED_HALF),
    new THREE.Vector3(BED_HALF, 0, -BED_HALF),
    new THREE.Vector3(BED_HALF, 0, BED_HALF),
    new THREE.Vector3(-BED_HALF, 0, BED_HALF),
  ]),
  new THREE.LineBasicMaterial({
    color: 0x67dde5,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }),
);
sectionPlaneGroup.add(sectionPlaneOutline);

const contourMaterial = new THREE.LineBasicMaterial({
  color: 0x9df8fa,
  transparent: true,
  opacity: 0.98,
  depthTest: false,
  depthWrite: false,
});
const contourMesh = new THREE.LineSegments(new THREE.BufferGeometry(), contourMaterial);
contourMesh.renderOrder = 9;
scene.add(contourMesh);

function createDemoGeometry() {
  const profile = new THREE.Shape();
  profile.moveTo(0, 0);
  profile.lineTo(112, 0);
  profile.lineTo(112, 16);
  profile.lineTo(26, 16);
  profile.lineTo(26, 96);
  profile.lineTo(84, 96);
  profile.lineTo(84, 112);
  profile.lineTo(0, 112);
  profile.closePath();

  const boltHole = new THREE.Path();
  boltHole.absarc(13, 58, 7, 0, Math.PI * 2, true);
  profile.holes.push(boltHole);

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 64,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 1.1,
    bevelThickness: 1.1,
    curveSegments: 40,
  });
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, 0, -center.z);
  geometry.computeVertexNormals();
  return geometry;
}

function normalizeGeometry(geometry) {
  const normalized = geometry.clone();
  normalized.computeBoundingBox();
  const box = normalized.boundingBox;
  if (!box) {
    geometry.dispose();
    throw new Error('Geometry has no bounds');
  }
  const center = new THREE.Vector3();
  box.getCenter(center);
  normalized.translate(-center.x, -center.y, -center.z);
  normalized.computeBoundingBox();
  normalized.computeBoundingSphere();
  return normalized;
}

function geometrySize(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  return box
    ? new THREE.Vector3(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z)
    : new THREE.Vector3();
}

function setSource(geometry, name, kind, announce = false) {
  geometry.computeBoundingBox();
  const sourceCenter = geometry.boundingBox
    ? geometry.boundingBox.getCenter(new THREE.Vector3())
    : new THREE.Vector3();
  const normalized = normalizeGeometry(geometry);
  const size = geometrySize(normalized);

  if (!Number.isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) <= 0) {
    normalized.dispose();
    throw new Error('Geometry is empty or non-finite');
  }

  const previousGeometry = partMesh.geometry;
  partMesh.geometry = normalized;
  ghostMesh.geometry = normalized;
  outsideMesh.geometry = normalized;

  const previousEdges = partEdges.geometry;
  partEdges.geometry = new THREE.EdgesGeometry(normalized, 32);
  if (previousEdges !== partMesh.geometry) previousEdges.dispose();
  if (previousGeometry !== normalized) previousGeometry.dispose();

  state.originX = sourceCenter.x;
  state.originZ = sourceCenter.z;
  state.sourceName = name;
  state.sourceKind = kind;
  sourceName.textContent = name;
  sourceName.title = name;
  sourceKind.textContent = kind;
  sourceDetail.textContent = `${formatDimension(size.x)} × ${formatDimension(size.z)} × ${formatDimension(size.y)} mm`;

  resetTransforms(false);
  state.sectionHeight = Math.min(125, Math.max(10, size.y / 2));
  sectionInput.value = state.sectionHeight.toFixed(1);
  sectionSlider.value = String(state.sectionHeight);
  updateTransform();
  updateSectionVisuals();

  if (announce) {
    showMessage(`${name} loaded · ${formatDimension(size.x)} × ${formatDimension(size.z)} × ${formatDimension(size.y)} mm`, true);
  }
}

function resetTransformState() {
  state.rotation.x = 0;
  state.rotation.y = 0;
  state.rotation.z = 0;
  state.scale = 1;
  state.posX = 0;
  state.posZ = 0;
}

function resetTransforms(showFeedback = true) {
  resetTransformState();
  for (const axis of ['x', 'y', 'z']) rotationInputs[axis].value = '0';
  scaleInput.value = '1.00';
  scaleSlider.value = '1';
  posXInput.value = '0';
  posXSlider.value = '0';
  posZInput.value = '0';
  posZSlider.value = '0';
  setSectionEnabled(false, false);
  updateTransform();
  updateSectionVisuals();
  if (showFeedback) showMessage('Transforms reset to the loaded part.', true);
}

function applyRootTransform() {
  partRoot.rotation.order = 'XYZ';
  partRoot.rotation.set(
    state.rotation.x * DEG,
    state.rotation.y * DEG,
    state.rotation.z * DEG,
  );
  partRoot.scale.setScalar(state.scale);
  partRoot.position.x = state.originX + state.posX;
  partRoot.position.z = state.originZ + state.posZ;
  partRoot.updateMatrixWorld(true);
}

function placeOnBed() {
  applyRootTransform();
  const box = new THREE.Box3().setFromObject(partMesh, true);
  partRoot.position.y += -box.min.y;
  partRoot.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(partMesh, true);
}

function bakeWorldTriangles() {
  const geometry = partMesh.geometry;
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const result = new Float32Array(triangleCount * 9);
  const matrix = partMesh.matrixWorld;
  const vertex = new THREE.Vector3();
  let out = 0;

  for (let tri = 0; tri < triangleCount; tri += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = index ? index.getX(tri * 3 + corner) : tri * 3 + corner;
      vertex.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrix);
      result[out++] = vertex.x;
      result[out++] = vertex.y;
      result[out++] = vertex.z;
    }
  }

  return result;
}

function updateRenderMetadata(box) {
  const width = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;
  const height = box.max.y - box.min.y;
  state.transformBox.copy(box);

  dimWidth.textContent = formatDimension(Math.max(0, width));
  dimDepth.textContent = formatDimension(Math.max(0, depth));
  dimHeight.textContent = formatDimension(Math.max(0, height));

  const tolerance = 0.03;
  const fits =
    box.min.x >= -BED_HALF - tolerance &&
    box.max.x <= BED_HALF + tolerance &&
    box.min.z >= -BED_HALF - tolerance &&
    box.max.z <= BED_HALF + tolerance &&
    box.min.y >= -tolerance &&
    box.max.y <= BUILD_HEIGHT + tolerance;

  fitPill.classList.toggle('is-out', !fits);
  fitText.textContent = fits ? 'FITS VOLUME' : 'OUTSIDE VOLUME';

  const rx = formatAngle(state.rotation.x);
  const ry = formatAngle(state.rotation.y);
  const rz = formatAngle(state.rotation.z);
  orientationReadout.textContent = `${state.activeView.toUpperCase()} · ${rx}° / ${ry}° / ${rz}°`;

  sectionTop = Math.max(10, Math.ceil(box.max.y));
  sectionSlider.max = String(sectionTop);
  sectionInput.max = String(sectionTop + 50);
  if (state.sectionEnabled) {
    sectionSlider.value = String(Math.min(state.sectionHeight, sectionTop));
  }
}

function formatDimension(value) {
  return (Math.round(value * 100) / 100).toFixed(1);
}

function formatAngle(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function updateOverhang(worldTriangles) {
  const positions = worldTriangles || bakeWorldTriangles();
  const flagged = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let count = 0;

  for (let i = 0; i < positions.length; i += 9) {
    a.set(positions[i], positions[i + 1], positions[i + 2]);
    b.set(positions[i + 3], positions[i + 4], positions[i + 5]);
    c.set(positions[i + 6], positions[i + 7], positions[i + 8]);

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);
    if (normal.lengthSq() < 1e-12) continue;
    normal.normalize();
    if (normal.y >= -0.0001) continue;

    const angleBelowHorizontal = Math.asin(Math.min(1, Math.max(0, -normal.y))) / DEG;
    if (angleBelowHorizontal + 1e-6 < state.overhangThreshold) continue;

    const restsOnBed = a.y <= BED_CONTACT_EPSILON && b.y <= BED_CONTACT_EPSILON && c.y <= BED_CONTACT_EPSILON;
    if (restsOnBed) continue;

    const offset = 0.09;
    for (const point of [a, b, c]) {
      flagged.push(
        point.x + normal.x * offset,
        point.y + normal.y * offset,
        point.z + normal.z * offset,
      );
    }
    count += 1;
  }

  const oldGeometry = overhangMesh.geometry;
  const geometry = new THREE.BufferGeometry();
  if (flagged.length) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(flagged, 3));
    geometry.computeBoundingSphere();
  }
  overhangMesh.geometry = geometry;
  overhangMesh.visible = flagged.length > 0;
  oldGeometry.dispose();

  overhangCount.innerHTML = `<strong>${count.toLocaleString()}</strong> faces`;
  overhangCount.classList.toggle('is-clear', count === 0);
  return count;
}

function updateTransform() {
  const box = placeOnBed();
  updateRenderMetadata(box);
  const worldTriangles = bakeWorldTriangles();
  updateOverhang(worldTriangles);
  updateSectionVisuals(worldTriangles);
  updateOutsideShader();
}

function updateOutsideShader() {
  outsideMaterial.uniforms.uSectionOn.value = state.sectionEnabled ? 1 : 0;
  outsideMaterial.uniforms.uSectionY.value = state.sectionHeight;
}

function computeSectionContour(worldTriangles) {
  const segments = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const height = state.sectionHeight;
  const eps = 0.0002;
  const points = [];
  const edges = [];

  function addIntersection(p1, p2) {
    const d1 = p1.y - height;
    const d2 = p2.y - height;
    if (Math.abs(d1) < eps) {
      points.push(p1.clone());
    } else if (Math.abs(d2) < eps) {
      points.push(p2.clone());
    } else if (d1 * d2 < 0) {
      const t = d1 / (d1 - d2);
      points.push(p1.clone().lerp(p2, t));
    }
  }

  for (let i = 0; i < worldTriangles.length; i += 9) {
    a.set(worldTriangles[i], worldTriangles[i + 1], worldTriangles[i + 2]);
    b.set(worldTriangles[i + 3], worldTriangles[i + 4], worldTriangles[i + 5]);
    c.set(worldTriangles[i + 6], worldTriangles[i + 7], worldTriangles[i + 8]);

    const minY = Math.min(a.y, b.y, c.y);
    const maxY = Math.max(a.y, b.y, c.y);
    if (height < minY - eps || height > maxY + eps) continue;

    points.length = 0;
    edges.length = 0;
    edges.push([a, b], [b, c], [c, a]);
    for (const [p1, p2] of edges) addIntersection(p1, p2);

    if (points.length < 2) continue;
    if (points.length > 2) {
      const unique = [];
      for (const point of points) {
        if (!unique.some((other) => point.distanceToSquared(other) < 1e-8)) unique.push(point);
      }
      points.length = 0;
      points.push(...unique);
    }
    if (points.length === 2) {
      segments.push(
        points[0].x,
        points[0].y + 0.025,
        points[0].z,
        points[1].x,
        points[1].y + 0.025,
        points[1].z,
      );
    }
  }

  return new Float32Array(segments);
}

function scheduleContourUpdate() {
  if (contourFrame) return;
  contourFrame = requestAnimationFrame(() => {
    contourFrame = 0;
    const worldTriangles = bakeWorldTriangles();
    updateSectionVisuals(worldTriangles);
  });
}

function updateSectionVisuals(worldTriangles) {
  clipPlane.constant = state.sectionHeight;
  ghostPlane.constant = -state.sectionHeight;
  sectionPlaneGroup.position.y = state.sectionHeight;

  const active = state.sectionEnabled;
  sectionPlaneGroup.visible = active;
  ghostMesh.visible = active;
  contourMesh.visible = active;

  clipPlane.constant = state.sectionHeight;
  partMaterial.clippingPlanes = active ? [clipPlane] : [];
  partMaterial.needsUpdate = true;
  edgeMaterial.clippingPlanes = active ? [clipPlane] : [];
  edgeMaterial.needsUpdate = true;
  overhangMaterial.clippingPlanes = active ? [clipPlane] : [];
  overhangMaterial.needsUpdate = true;
  updateOutsideShader();

  const positions = worldTriangles || bakeWorldTriangles();
  const oldGeometry = contourMesh.geometry;
  if (active) {
    const contour = computeSectionContour(positions);
    const newGeometry = new THREE.BufferGeometry();
    if (contour.length) newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(contour, 3));
    contourMesh.geometry = newGeometry;
    newGeometry.computeBoundingSphere();
  } else {
    contourMesh.geometry = new THREE.BufferGeometry();
  }
  oldGeometry.dispose();
}

function setSectionEnabled(enabled, update = true) {
  state.sectionEnabled = Boolean(enabled);
  sectionEnabledInput.checked = state.sectionEnabled;
  sectionStatus.classList.toggle('is-active', state.sectionEnabled);
  sectionStatus.lastChild.textContent = state.sectionEnabled ? 'Section view is active' : 'Section view is off';
  sectionReadout.hidden = !state.sectionEnabled;
  sectionReadoutValue.textContent = state.sectionHeight.toFixed(1);
  if (update) {
    updateSectionVisuals();
    updateOutsideShader();
  }
}

function setSectionHeight(value) {
  const clamped = Math.min(sectionTop, Math.max(0, Number(value)));
  if (!Number.isFinite(clamped)) return;
  state.sectionHeight = clamped;
  sectionInput.value = clamped.toFixed(1);
  sectionSlider.value = String(clamped);
  sectionReadoutValue.textContent = clamped.toFixed(1);
  scheduleContourUpdate();
}

function currentScaleSafe(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return state.scale;
  return Math.min(5, Math.max(0.1, numeric));
}

function currentPositionSafe(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(250, Math.max(-250, numeric));
}

function currentRotationSafe(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(360, Math.max(-360, numeric));
}

function updateRotationFromInputs() {
  for (const axis of ['x', 'y', 'z']) {
    state.rotation[axis] = currentRotationSafe(rotationInputs[axis].value);
    rotationInputs[axis].value = formatAngle(state.rotation[axis]);
  }
  updateTransform();
}

for (const axis of ['x', 'y', 'z']) {
  rotationInputs[axis].addEventListener('input', updateRotationFromInputs);
}

for (const button of document.querySelectorAll('[data-rot-axis]')) {
  button.addEventListener('click', () => {
    const axis = button.dataset.rotAxis;
    const direction = Number(button.dataset.rotDirection);
    let next = state.rotation[axis] + direction * 90;
    next = ((next + 180) % 360 + 360) % 360 - 180;
    state.rotation[axis] = next;
    rotationInputs[axis].value = formatAngle(next);
    updateTransform();
  });
}

scaleInput.addEventListener('input', () => {
  state.scale = currentScaleSafe(scaleInput.value);
  scaleSlider.value = String(state.scale);
  updateTransform();
});

scaleSlider.addEventListener('input', () => {
  state.scale = currentScaleSafe(scaleSlider.value);
  scaleInput.value = state.scale.toFixed(2);
  updateTransform();
});

function updatePositionFromInput(axis, value) {
  const position = currentPositionSafe(value);
  if (axis === 'x') {
    state.posX = position;
    posXInput.value = String(position);
    posXSlider.value = String(position);
  } else {
    state.posZ = position;
    posZInput.value = String(position);
    posZSlider.value = String(position);
  }
  updateTransform();
}

posXInput.addEventListener('input', () => updatePositionFromInput('x', posXInput.value));
posZInput.addEventListener('input', () => updatePositionFromInput('z', posZInput.value));
posXSlider.addEventListener('input', () => updatePositionFromInput('x', posXSlider.value));
posZSlider.addEventListener('input', () => updatePositionFromInput('z', posZSlider.value));

overhangInput.addEventListener('input', () => {
  const value = Math.min(90, Math.max(0, Number(overhangInput.value)));
  if (!Number.isFinite(value)) return;
  state.overhangThreshold = value;
  overhangSlider.value = String(value);
  updateOverhang();
});

overhangSlider.addEventListener('input', () => {
  state.overhangThreshold = Number(overhangSlider.value);
  overhangInput.value = String(state.overhangThreshold);
  updateOverhang();
});

sectionEnabledInput.addEventListener('change', () => setSectionEnabled(sectionEnabledInput.checked));
sectionInput.addEventListener('input', () => setSectionHeight(sectionInput.value));
sectionSlider.addEventListener('input', () => setSectionHeight(sectionSlider.value));

placeBedButton.addEventListener('click', () => {
  const box = placeOnBed();
  updateRenderMetadata(box);
  updateOverhang();
  updateSectionVisuals();
  updateOutsideShader();
  showMessage('Lowest point placed at bed height.', true);
});

resetButton.addEventListener('click', () => resetTransforms(true));
demoButton.addEventListener('click', () => {
  loadDemoPart(true);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  fileInput.value = '';
});

dropZone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
});

dropZone.addEventListener('dragleave', (event) => {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragging');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
  const file = event.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

async function handleFile(file) {
  const name = file.name || 'Untitled.stl';
  if (!/\.stl$/i.test(name) && file.type !== 'model/stl' && file.type !== 'application/sla') {
    showMessage('That file is not an STL. The current part is unchanged.', false);
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    if (!buffer || buffer.byteLength < 15) throw new Error('File is too short');
    const loader = new STLLoader();
    const geometry = loader.parse(buffer);
    const position = geometry.getAttribute('position');
    if (!position || position.count < 9 || position.count % 3 !== 0) {
      geometry.dispose();
      throw new Error('No triangles found');
    }

    let finite = true;
    for (let i = 0; i < position.count * 3; i += 1) {
      if (!Number.isFinite(position.array[i])) {
        finite = false;
        break;
      }
    }
    if (!finite) {
      geometry.dispose();
      throw new Error('Non-finite coordinates');
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) {
      geometry.dispose();
      throw new Error('No bounds');
    }
    const dims = box.getSize(new THREE.Vector3());
    if (Math.max(dims.x, dims.y, dims.z) < 1e-5) {
      geometry.dispose();
      throw new Error('Zero-size geometry');
    }

    const cleanName = name.replace(/\.stl$/i, '');
    setSource(geometry, cleanName, 'STL', true);
    geometry.dispose();
  } catch (error) {
    showMessage('Could not read that STL. The current part is unchanged.', false);
  }
}

function showMessage(text, success = false) {
  fileMessage.textContent = text;
  fileMessage.classList.toggle('is-success', success);
  fileMessage.classList.add('is-visible');
  if (messageTimer) window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    fileMessage.classList.remove('is-visible');
  }, 5200);
}

function loadDemoPart(announce = false) {
  try {
    const geometry = createDemoGeometry();
    setSource(geometry, 'Procedural L-bracket', 'DEMO', announce);
    geometry.dispose();
  } catch (error) {
    showMessage('The demo part could not be created.', false);
  }
}

exportButton.addEventListener('click', () => {
  try {
    partMesh.updateMatrixWorld(true);
    const exporter = new STLExporter();
    const data = exporter.parse(partMesh, { binary: true });
    let blob;
    if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: 'model/stl' });
    } else if (ArrayBuffer.isView(data)) {
      const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      blob = new Blob([bytes], { type: 'model/stl' });
    } else {
      blob = new Blob([data], { type: 'text/plain' });
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const base = state.sourceName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'part';
    anchor.href = url;
    anchor.download = `${base}-benchfit.stl`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage('STL exported with the current scale, rotation, and placement baked in.', true);
  } catch (error) {
    showMessage('The STL could not be exported.', false);
  }
});

function setView(view) {
  state.activeView = view;
  for (const button of viewButtons) {
    button.classList.toggle('is-active', button.dataset.view === view);
  }

  camera.up.set(0, 1, 0);
  let position;
  let target;

  if (view === 'front') {
    position = new THREE.Vector3(0, 125, 600);
    target = new THREE.Vector3(0, 125, 0);
  } else if (view === 'side') {
    position = new THREE.Vector3(600, 125, 0);
    target = new THREE.Vector3(0, 125, 0);
  } else if (view === 'top') {
    camera.up.set(0, 0, -1);
    position = new THREE.Vector3(0, 680, 0.001);
    target = new THREE.Vector3(0, 0, 0);
  } else {
    position = new THREE.Vector3(380, 410, 440);
    target = new THREE.Vector3(0, 88, 0);
  }

  camera.position.copy(position);
  controls.target.copy(target);
  camera.lookAt(target);
  controls.update();
  updateOrientationLabel();
}

function updateOrientationLabel() {
  const rx = formatAngle(state.rotation.x);
  const ry = formatAngle(state.rotation.y);
  const rz = formatAngle(state.rotation.z);
  orientationReadout.textContent = `${state.activeView.toUpperCase()} · ${rx}° / ${ry}° / ${rz}°`;
}

for (const button of viewButtons) {
  button.addEventListener('click', () => setView(button.dataset.view));
}

controls.addEventListener('start', () => {
  if (state.activeView !== 'orbit') {
    state.activeView = 'orbit';
    for (const button of viewButtons) {
      button.classList.toggle('is-active', button.dataset.view === 'orbit');
    }
    updateOrientationLabel();
  }
});

function resizeRenderer() {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(viewport);
resizeRenderer();

function animate() {
  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

try {
  loadDemoPart(false);
  setView('orbit');
} catch (error) {
  showMessage('The built-in demo could not be created.', false);
}

window.__benchfit = {
  state,
  partMesh,
  partRoot,
  camera,
  controls,
  placeOnBed,
  updateTransform,
  setView,
};
