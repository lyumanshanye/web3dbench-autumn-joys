import * as THREE from 'three';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createSurveyRig,
} from './rig.js';

const canvas = document.getElementById('viewport');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);

const rig = createSurveyRig(canvas);
rig.renderer = renderer;

const readouts = {
  yaw: document.getElementById('yaw-value'),
  pitch: document.getElementById('pitch-value'),
  eye: document.getElementById('eye-value'),
  selected: document.getElementById('selected-value'),
};
const flagElements = Object.fromEntries(
  ['forward', 'backward', 'left', 'right', 'up', 'down'].map((flag) => [
    flag,
    document.querySelector(`[data-flag="${flag}"]`),
  ])
);

const keyToFlag = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  KeyE: 'up',
  KeyQ: 'down',
};
const flags = Object.fromEntries(
  ['forward', 'backward', 'left', 'right', 'up', 'down'].map((flag) => [flag, false])
);
const heldKeys = new Set();

function formatRadians(value) {
  return `${value.toFixed(4)} rad`;
}

function refreshReadouts() {
  const state = rig.getState();
  readouts.yaw.textContent = formatRadians(state.yawAngle);
  readouts.pitch.textContent = formatRadians(state.pitchAngle);
  readouts.eye.textContent = `${state.eyeHeight.toFixed(3)} m`;
  readouts.selected.textContent = state.selectedId ?? 'none';
  for (const [flag, element] of Object.entries(flagElements)) {
    element.classList.toggle('active', state[flag]);
  }
}

function applyFlags() {
  rig.setInput(flags);
  refreshReadouts();
}

function clearKeys() {
  heldKeys.clear();
  for (const flag of Object.keys(flags)) flags[flag] = false;
  applyFlags();
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    shiftHeld = true;
    return;
  }
  const flag = keyToFlag[event.code];
  if (!flag) return;
  event.preventDefault();
  if (!heldKeys.has(event.code)) {
    heldKeys.add(event.code);
    flags[flag] = true;
    applyFlags();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    shiftHeld = false;
    return;
  }
  const flag = keyToFlag[event.code];
  if (!flag) return;
  heldKeys.delete(event.code);
  flags[flag] = [...heldKeys].some((code) => keyToFlag[code] === flag);
  applyFlags();
});

window.addEventListener('blur', clearKeys);

let shiftHeld = false;
window.addEventListener('mousemove', (event) => {
  shiftHeld = event.shiftKey;
  if (!shiftHeld) return;
  rig.look(event.movementX, event.movementY, true);
  refreshReadouts();
});

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0 || event.shiftKey) return;
  rig.pickCenter();
  refreshReadouts();
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

document.getElementById('step-button').addEventListener('click', () => {
  rig.step(1 / 60);
  refreshReadouts();
});
document.getElementById('reset-button').addEventListener('click', () => {
  clearKeys();
  rig.reset();
  refreshReadouts();
});

function resize() {
  rig.camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  rig.camera.updateProjectionMatrix();
  renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.aspectRatio = `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`;
}
window.addEventListener('resize', resize);
resize();

window.surveyRig = rig;
refreshReadouts();

function renderLoop() {
  renderer.render(rig.scene, rig.camera);
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);
