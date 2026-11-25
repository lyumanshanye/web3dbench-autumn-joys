import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.querySelector('#canvas-wrap');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9eee5');
scene.fog = new THREE.Fog('#e9eee5', 14, 29);
const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
const initialPosition = new THREE.Vector3(3.5, 2.2, 11.5);
camera.position.copy(initialPosition);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
container.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'A colorful folded paper pinwheel on a wooden stick. Drag to rotate the view.');
renderer.domElement.setAttribute('role', 'img');
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, .55, 0);
orbit.enableDamping = true;
orbit.enableZoom = false;
orbit.enablePan = false;
orbit.minPolarAngle = Math.PI * .3;
orbit.maxPolarAngle = Math.PI * .58;
orbit.minAzimuthAngle = -.9;
orbit.maxAzimuthAngle = .9;
orbit.update();
scene.add(new THREE.HemisphereLight('#fff8df', '#9aa98c', 2.6));
const sun = new THREE.DirectionalLight('#fff5dc', 4.2);
sun.position.set(-4, 7, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -5 });
sun.shadow.normalBias = .03;
sun.shadow.bias = -.0002;
sun.shadow.radius = 5;
scene.add(sun);
const fill = new THREE.DirectionalLight('#eff7ff', 1);
fill.position.set(5, 1, 1);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#e9eee5', roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.11;
floor.receiveShadow = true;
scene.add(floor);
// A subtle raised paper disc grounds the handmade object.
const base = new THREE.Mesh(new THREE.CylinderGeometry(.88, .93, .11, 80), new THREE.MeshStandardMaterial({ color: '#e1d7bd', roughness: .9 }));
base.position.y = -2.04;
base.castShadow = true;
base.receiveShadow = true;
scene.add(base);
const baseTop = new THREE.Mesh(new THREE.CylinderGeometry(.79, .79, .018, 80), new THREE.MeshStandardMaterial({ color: '#eee5cf', roughness: 1 }));
baseTop.position.y = -1.978;
baseTop.receiveShadow = true;
scene.add(baseTop);
const wood = new THREE.MeshStandardMaterial({ color: '#b99561', roughness: .88 });
const stick = new THREE.Mesh(new THREE.CylinderGeometry(.047, .06, 3.65, 16), wood);
stick.position.set(0, -.2, -.18);
stick.castShadow = true;
scene.add(stick);
const woodHighlight = new THREE.Mesh(new THREE.CylinderGeometry(.011, .014, 3.56, 8), new THREE.MeshStandardMaterial({ color: '#dfc398' }));
woodHighlight.position.set(-.025, -.2, -.135);
scene.add(woodHighlight);

// Each blade is a curved triangular sheet, with a returning folded corner.
const rotor = new THREE.Group();
rotor.position.set(0, 1.28, 0);
rotor.rotation.z = -.19;
scene.add(rotor);
const colors = ['#ef754a', '#efb744', '#a9beb0', '#f1b29a'];
const blades = [];
function sheetGeometry() {
  const positions = [], uv = [], indices = [];
  const n = 28;
  for (let row = 0; row <= n; row++) {
    const s = row / n;
    for (let col = 0; col <= n; col++) {
      const t = col / n;
      // The outer edge stays flat, while the inside edge lifts into a soft fold.
      const x = s * THREE.MathUtils.lerp(-1.32, 1.39, t);
      const y = s * 1.4;
      const z = .25 * (1 - s) + Math.sin(s * Math.PI) * (.58 * (1 - t) - .09 * t);
      positions.push(x, y, z);
      uv.push(t, s);
      if (row < n && col < n) {
        const a = row * (n + 1) + col, b = a + n + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const paperCanvas = document.createElement('canvas');
paperCanvas.width = paperCanvas.height = 128;
const ctx = paperCanvas.getContext('2d');
ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, 128, 128);
for (let i = 0; i < 3000; i++) {
  const v = 184 + Math.random() * 50;
  ctx.fillStyle = `rgb(${v},${v},${v})`;
  ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
}
const paperTexture = new THREE.CanvasTexture(paperCanvas);
paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
paperTexture.repeat.set(3, 3);
const geometry = sheetGeometry();
for (let i = 0; i < 4; i++) {
  const group = new THREE.Group();
  group.rotation.z = i * Math.PI / 2;
  const material = new THREE.MeshStandardMaterial({ color: colors[i], roughness: .83, side: THREE.DoubleSide, bumpMap: paperTexture, bumpScale: .012 });
  const blade = new THREE.Mesh(geometry, material);
  blade.castShadow = true;
  blade.receiveShadow = true;
  group.add(blade);
  // The cut edge returning to the center gives each sail a visible folded underside.
  const foldGeo = new THREE.BufferGeometry();
  foldGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .265, 1.39, 1.4, 0, 1.32, .07, .1], 3));
  foldGeo.computeVertexNormals();
  const foldMaterial = material.clone();
  foldMaterial.color.multiplyScalar(.83);
  const fold = new THREE.Mesh(foldGeo, foldMaterial);
  fold.castShadow = true;
  fold.receiveShadow = true;
  group.add(fold);
  const crease = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, .272), new THREE.Vector3(1.39, 1.4, .007)]), new THREE.LineBasicMaterial({ color: new THREE.Color(colors[i]).multiplyScalar(.8), transparent: true, opacity: .32 }));
  group.add(crease);
  rotor.add(group);
  blades.push({ material, foldMaterial, crease });
}
const washer = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .055, 40), new THREE.MeshStandardMaterial({ color: '#d4a760', metalness: .5, roughness: .48 }));
washer.rotation.x = Math.PI / 2;
washer.position.z = .315;
rotor.add(washer);
const pin = new THREE.Mesh(new THREE.SphereGeometry(.084, 32, 20), new THREE.MeshStandardMaterial({ color: '#fcf0d0', metalness: .55, roughness: .24 }));
pin.scale.z = .6;
pin.position.z = .365;
rotor.add(pin);

// Quiet paper-like leaves and curved wind marks add scale without obscuring the wheel.
function leaf(x, z, angle, scale, color) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.quadraticCurveTo(.32, .18, .65, 0); shape.quadraticCurveTo(.32, -.18, 0, 0);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 1 }));
  mesh.rotation.set(-Math.PI / 2, 0, angle);
  mesh.position.set(x, -2.04, z);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  scene.add(mesh);
}
leaf(-1.1, .18, -.4, .62, '#cfb782');
leaf(1.05, -.15, 2.5, .5, '#c1cba9');
function windMark(x, y, z, length) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, z), new THREE.Vector3(x + length * .4, y + .04, z), new THREE.Vector3(x + length, y + .13, z)]);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .008, 5, false), new THREE.MeshBasicMaterial({ color: '#c3cdb8', transparent: true, opacity: .6 }));
  scene.add(mesh);
}
windMark(-2.3, .65, -.8, .72);
windMark(-2.45, .43, -.8, .45);
windMark(1.7, 2.5, -1, .48);

let speed = 3.2;
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
const pauseButton = document.querySelector('#pause');
function updateStatus() {
  pauseButton.setAttribute('aria-pressed', String(paused));
  document.querySelector('#pause-text').textContent = paused ? 'Let it spin' : 'Pause the moment';
  document.querySelector('#pause-icon').textContent = paused ? '▷' : 'Ⅱ';
  document.querySelector('#status').textContent = paused ? 'A lovely moment of stillness' : speed === 0 ? 'Waiting for a little breeze' : 'Spinning, without a care';
  document.querySelector('#status-dot').style.background = paused || !speed ? '#c4bba0' : '#8ea27f';
}
pauseButton.addEventListener('click', () => { paused = !paused; updateStatus(); });
const slider = document.querySelector('#wind-speed');
slider.addEventListener('input', () => {
  speed = Number(slider.value);
  document.querySelector('#speed-output').textContent = speed.toFixed(1);
  slider.style.background = `linear-gradient(to right,#db8c63 ${speed * 10}%,#e8e7dc ${speed * 10}%)`;
  document.querySelector('#breeze-label').textContent = speed === 0 ? 'Perfectly still' : speed < 2 ? 'Just a whisper' : speed < 5 ? 'A gentle breeze' : speed < 8 ? 'A playful little gust' : 'A wonderfully wild wind';
  updateStatus();
});
const colorInputs = [...document.querySelectorAll('input[type=color]')];
function setColor(index, color) {
  blades[index].material.color.set(color);
  blades[index].foldMaterial.color.set(color).multiplyScalar(.83);
  blades[index].crease.material.color.set(color).multiplyScalar(.8);
  colorInputs[index].value = color;
  colorInputs[index].parentElement.style.setProperty('--swatch', color);
}
const paletteButtons = [...document.querySelectorAll('.palette')];
function selectPalette(index) {
  paletteButtons.forEach((button, i) => { button.classList.toggle('selected', i === index); button.setAttribute('aria-pressed', String(i === index)); });
}
colorInputs.forEach((input, i) => input.addEventListener('input', () => { setColor(i, input.value); selectPalette(-1); }));
const palettes = [colors, ['#538d9c', '#a9ced0', '#e4dabf', '#8aab9a'], ['#ab6685', '#d6a1b0', '#8f9d76', '#e1c79c']];
paletteButtons.forEach((button, index) => button.addEventListener('click', () => { palettes[index].forEach((color, i) => setColor(i, color)); selectPalette(index); }));
document.querySelector('#reset-view').addEventListener('click', () => { camera.position.copy(initialPosition); orbit.target.set(0, .55, 0); orbit.update(); });
media.addEventListener('change', e => { if (e.matches) { paused = true; updateStatus(); } });
function resize() {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = width / height < .9 ? 43 : 34;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container);
resize();
updateStatus();
let last = performance.now();
renderer.setAnimationLoop(time => {
  const delta = Math.min((time - last) / 1000, .05); last = time;
  if (!paused) rotor.rotation.z -= delta * speed * .35;
  orbit.update();
  renderer.render(scene, camera);
});
