import * as THREE from "three";
import { OrbitControls } from "../vendor/three/examples/jsm/controls/OrbitControls.js";
import {
  frameForTime,
  generateBolt,
  isActivePhase,
  parseSeed,
} from "./storm.js";

const canvas = document.querySelector("#scene");
const seedInput = document.querySelector("#seed-input");
const message = document.querySelector("#seed-message");
const phaseLabel = document.querySelector("#phase");
const timeLabel = document.querySelector("#time");
const seedDisplay = document.querySelector("#seed-display");
const statusDot = document.querySelector("#status-dot");
const readouts = {
  segments: document.querySelector("#readout-segments"),
  range: document.querySelector("#readout-range"),
  opacity: document.querySelector("#readout-opacity"),
  crackles: document.querySelector("#readout-crackles"),
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(800, 600, false);
renderer.setClearColor(0x030609, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x030609, 58, 110);

const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 500);
camera.position.set(0, 18, 55);
camera.lookAt(0, 12, 0);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 12, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 15;
controls.maxDistance = 130;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

const grid = new THREE.GridHelper(40, 40, 0x47656c, 0x1d3037);
grid.material.transparent = true;
grid.material.opacity = 0.76;
grid.material.depthWrite = false;
scene.add(grid);

const horizon = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0.006, -20),
    new THREE.Vector3(20, 0.006, -20),
    new THREE.Vector3(20, 0.006, -20),
    new THREE.Vector3(20, 0.006, 20),
    new THREE.Vector3(20, 0.006, 20),
    new THREE.Vector3(-20, 0.006, 20),
    new THREE.Vector3(-20, 0.006, 20),
    new THREE.Vector3(-20, 0.006, -20),
  ]),
  new THREE.LineBasicMaterial({ color: 0x3a5960, transparent: true, opacity: 0.8 }),
);
scene.add(horizon);

const boltMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  depthWrite: false,
});
const branchMaterial = new THREE.LineBasicMaterial({
  color: 0x5feaff,
  transparent: true,
  opacity: 1,
  depthWrite: false,
});
const crackleMaterial = new THREE.LineBasicMaterial({
  color: 0x5feaff,
  transparent: true,
  opacity: 1,
  depthWrite: false,
});
const impactMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  depthWrite: false,
});
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0x8ff7ff,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const boltGroup = new THREE.Group();
const mainBolt = createLineSegments(16, boltMaterial);
const branchA = createLineSegments(2, branchMaterial);
const branchB = createLineSegments(2, branchMaterial);
const crackles = createLineSegments(12, crackleMaterial);
const impactSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), impactMaterial);
const halo = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.8, 32), haloMaterial);

impactSphere.position.set(0, 0, 0);
halo.rotation.x = -Math.PI / 2;
halo.position.y = 0.03;
boltGroup.add(mainBolt, branchA, branchB);
scene.add(boltGroup, crackles, impactSphere, halo);

let bolt = null;
let time = 0;
let phase = "idle";
let currentSeed = 0;
let currentFrame = frameForTime(Infinity);
let renderedFrame = currentFrame;

function createLineSegments(count, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3),
  );

  const line = new THREE.LineSegments(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

function fillSegments(line, segments) {
  const position = line.geometry.attributes.position;

  segments.forEach((segment, index) => {
    position.setXYZ(index * 2, segment.a.x, segment.a.y, segment.a.z);
    position.setXYZ(index * 2 + 1, segment.b.x, segment.b.y, segment.b.z);
  });

  position.needsUpdate = true;
  line.geometry.setDrawRange(0, 0);
}

function fillGeometry() {
  fillSegments(mainBolt, bolt.mainSegments);
  fillSegments(branchA, bolt.branchASegments);
  fillSegments(branchB, bolt.branchBSegments);
  fillSegments(crackles, bolt.crackles);
}

function removeEffects() {
  boltGroup.visible = false;
  crackles.visible = false;
  impactSphere.visible = false;
  halo.visible = false;
  mainBolt.geometry.setDrawRange(0, 0);
  branchA.geometry.setDrawRange(0, 0);
  branchB.geometry.setDrawRange(0, 0);
  crackles.geometry.setDrawRange(0, 0);
  impactSphere.scale.setScalar(0);
  halo.scale.setScalar(0.001);
  renderedFrame = frameForTime(Infinity);
}

function applyFrame(frame) {
  const drawnSegments = frame.drawRangeCount / 2;
  const mainCount = frame.time < 400
    ? Math.min(16, Math.floor(drawnSegments))
    : 16;
  const branchCount = frame.time < 400
    ? Math.min(4, Math.max(0, Math.floor(drawnSegments) - 16))
    : 4;

  mainBolt.geometry.setDrawRange(0, mainCount * 2);
  branchA.geometry.setDrawRange(0, Math.min(branchCount, 2) * 2);
  branchB.geometry.setDrawRange(0, Math.max(0, Math.min(branchCount - 2, 2)) * 2);
  crackles.geometry.setDrawRange(0, frame.crackleCount);
  boltGroup.visible = frame.boltVisible;
  crackles.visible = frame.cracklesVisible;
  impactSphere.visible = frame.sphereVisible;
  halo.visible = frame.sphereVisible;

  boltMaterial.opacity = frame.opacity;
  branchMaterial.opacity = frame.opacity;
  crackleMaterial.opacity = frame.opacity;
  impactMaterial.opacity = frame.opacity;
  haloMaterial.opacity = 0.7 * frame.opacity;
  impactMaterial.transparent = frame.opacity < 1;
  impactSphere.scale.setScalar(frame.impactScale);
  halo.scale.setScalar(Math.max(0.001, frame.impactScale));

  renderedFrame = frame;
}

function setMessage(text, kind = "error") {
  message.textContent = text;
  message.classList.toggle("is-success", kind === "success" && Boolean(text));
  seedInput.classList.toggle("is-invalid", kind === "error" && Boolean(text));
}

function readValidSeed() {
  const seed = parseSeed(seedInput.value);

  if (seed === null) {
    setMessage("Invalid seed");
    return null;
  }

  seedInput.value = String(seed);
  return seed;
}

function clearMessage() {
  setMessage("");
}

function paintState() {
  phaseLabel.textContent = phase.toUpperCase();
  timeLabel.textContent = `${String(Math.round(time)).padStart(4, "0")} ms`;
  seedDisplay.textContent = `SEED ${String(currentSeed).padStart(10, "0")}`;
  statusDot.classList.toggle("is-active", isActivePhase(phase));
  readouts.segments.textContent = String(bolt ? 20 : 0).padStart(2, "0");
  readouts.range.textContent = String(currentFrame.drawRangeCount).padStart(2, "0");
  readouts.opacity.textContent = currentFrame.opacity.toFixed(2);
  readouts.crackles.textContent = String(currentFrame.crackleCount).padStart(2, "0");
}

function generate(seed) {
  removeEffects();
  bolt = generateBolt(seed);
  currentSeed = seed;
  fillGeometry();
  time = 0;
  phase = "idle";
  currentFrame = frameForTime(Infinity);
  paintState();
  return getState();
}

function strike(seed) {
  generate(seed);
  time = 0;
  phase = "drawing";
  currentFrame = frameForTime(0);
  applyFrame(currentFrame);
  paintState();
  return getState();
}

function step(milliseconds) {
  const amount = Number(milliseconds);

  if (!Number.isFinite(amount) || !isActivePhase(phase)) return getState();

  time = Math.min(800, time + Math.max(0, amount));
  currentFrame = frameForTime(time);
  phase = currentFrame.phase;

  if (phase === "idle") {
    removeEffects();
  } else {
    applyFrame(currentFrame);
  }

  paintState();
  return getState();
}

function reset() {
  removeEffects();
  bolt = null;
  time = 0;
  phase = "idle";
  currentSeed = 0;
  currentFrame = frameForTime(Infinity);
  seedInput.value = "0";
  clearMessage();
  paintState();
  return getState();
}

function getState() {
  return {
    seed: currentSeed,
    mainPoints: bolt ? bolt.mainPoints.map(({ x, y, z }) => ({ x, y, z })) : [],
    segmentCount: bolt ? 20 : 0,
    drawRangeCount: renderedFrame.drawRangeCount,
    opacity: renderedFrame.opacity,
    time,
    phase,
    impactScale: renderedFrame.impactScale,
    crackleCount: renderedFrame.crackleCount,
  };
}

function onGenerate() {
  const seed = readValidSeed();
  if (seed === null) return;
  clearMessage();
  generate(seed);
  setMessage(`Generated seed ${seed}`, "success");
}

function onStrike() {
  const seed = readValidSeed();
  if (seed === null) return;
  clearMessage();
  strike(seed);
  setMessage(`Strike armed · seed ${seed}`, "success");
}

document.querySelector("#generate-button").addEventListener("click", onGenerate);
document.querySelector("#strike-button").addEventListener("click", onStrike);
document.querySelector("#step-button").addEventListener("click", () => {
  clearMessage();
  step(200);
});
document.querySelector("#reset-button").addEventListener("click", reset);
seedInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") onStrike();
});
seedInput.addEventListener("input", () => {
  if (message.textContent === "Invalid seed") clearMessage();
});

window.stormLab = {
  generate,
  strike,
  step,
  reset,
  getState,
};

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

reset();
animate();
