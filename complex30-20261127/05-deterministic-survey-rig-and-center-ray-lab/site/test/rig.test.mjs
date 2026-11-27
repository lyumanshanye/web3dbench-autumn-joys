import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurveyRig, TARGET_COLOR } from '../src/rig.js';

function close(actual, expected, tolerance = 1e-5) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function setup() {
  return createSurveyRig({});
}

test('initial hierarchy, camera, targets, and state', () => {
  const rig = setup();
  assert.equal(rig.yaw.parent, rig.scene);
  assert.equal(rig.pitch.parent, rig.yaw);
  assert.equal(rig.camera.parent, rig.pitch);
  assert.deepEqual(rig.camera.position.toArray(), [0, 1.6, 0]);
  assert.equal(rig.camera.fov, 60);
  assert.equal(rig.camera.aspect, 800 / 600);
  assert.equal(rig.camera.near, 0.1);
  assert.equal(rig.camera.far, 200);
  assert.deepEqual(rig.targets.map((target) => target.userData.id), ['A', 'B', 'C']);
  assert.deepEqual(
    rig.targets.map((target) => target.position.toArray()),
    [[0, 1.6, -6], [4, 1.6, -6], [-4, 1.6, -8]]
  );
  const state = rig.getState();
  assert.deepEqual(state.yawPosition, [0, 0, 0]);
  assert.equal(state.selectedId, null);
  assert.equal(state.eyeHeight, 1.6);
});

test('setInput replaces flags and step normalizes horizontal movement', () => {
  const rig = setup();
  rig.setInput({ forward: true, left: true, up: true });
  assert.equal(rig.getState().forward, true);
  rig.step(0.5);
  close(rig.yaw.position.x, -Math.SQRT2);
  close(rig.yaw.position.z, -Math.SQRT2);
  close(rig.camera.position.y, 2.6);
  rig.setInput({ right: true });
  const state = rig.getState();
  assert.equal(state.forward, false);
  assert.equal(state.right, true);
  rig.step(1);
  close(rig.yaw.position.x, -Math.SQRT2 + 4);
  close(rig.yaw.position.z, -Math.SQRT2);
  rig.setInput({ up: true });
  rig.step(1);
  rig.step(1);
  close(rig.camera.position.y, 4);
  rig.setInput({ down: true });
  for (let i = 0; i < 5; i += 1) rig.step(1);
  close(rig.camera.position.y, 0.5);
});

test('step validates dt before changing state', () => {
  const rig = setup();
  rig.setInput({ forward: true });
  rig.step(0.25);
  const before = rig.yaw.position.toArray();
  for (const dt of [-0.01, 1.01, NaN, Infinity, '0.1']) {
    assert.throws(() => rig.step(dt));
  }
  assert.deepEqual(rig.yaw.position.toArray(), before);
  assert.doesNotThrow(() => rig.step(0));
  assert.doesNotThrow(() => rig.step(1));
});

test('look requires shift, validates, and clamps pitch', () => {
  const rig = setup();
  rig.look(100, -50, false);
  assert.equal(rig.yaw.rotation.y, 0);
  assert.doesNotThrow(() => rig.look(NaN, Infinity, false));
  assert.equal(rig.pitch.rotation.x, 0);
  rig.look(-50, 25, true);
  close(rig.yaw.rotation.y, 0.1);
  close(rig.pitch.rotation.x, -0.05);
  rig.look(0, 1e6, true);
  close(rig.pitch.rotation.x, -Math.PI / 2);
  rig.look(0, -1e6, true);
  close(rig.pitch.rotation.x, Math.PI / 2);
  const before = [rig.yaw.rotation.y, rig.pitch.rotation.x];
  assert.throws(() => rig.look(NaN, 0, true), TypeError);
  assert.throws(() => rig.look(0, Infinity, true), TypeError);
  assert.deepEqual([rig.yaw.rotation.y, rig.pitch.rotation.x], before);
});

test('reset restores defaults, flags, selection, and colors', () => {
  const rig = setup();
  rig.setInput({ forward: true });
  rig.step(1);
  rig.look(30, 40, true);
  rig.camera.position.y = 3;
  rig.targets[0].material.color.setHex(0xff0000);
  rig.reset();
  const state = rig.getState();
  assert.deepEqual(state.yawPosition, [0, 0, 0]);
  assert.equal(state.yawAngle, 0);
  assert.equal(state.pitchAngle, 0);
  assert.equal(state.eyeHeight, 1.6);
  assert.ok(['forward', 'backward', 'left', 'right', 'up', 'down'].every((flag) => state[flag] === false));
  assert.equal(state.selectedId, null);
  assert.ok(rig.targets.every((target) => target.material.color.getHex() === TARGET_COLOR));
  assert.equal(rig.scene.getObjectByName('grid').userData.role, 'grid');
});
