import test from "node:test";
import assert from "node:assert/strict";
import {
  createLcg,
  frameForTime,
  generateBolt,
  parseSeed,
} from "../src/storm.js";

test("LCG follows the 32-bit unsigned recurrence", () => {
  const random = createLcg(123456789);
  assert.equal(random.next(), 920370032 / 4294967296);
  assert.equal(random.next(), 3761641487 / 4294967296);
  const maximum = createLcg(4294967295);
  assert.equal(maximum.next(), 1012239698 / 4294967296);
});

test("midpoint displacement produces 17 ordered points", () => {
  const a = generateBolt(42);
  const b = generateBolt(42);
  const c = generateBolt(43);
  assert.deepEqual(a.mainPoints, b.mainPoints);
  assert.notDeepEqual(a.mainPoints, c.mainPoints);
  assert.equal(a.mainPoints.length, 17);
  assert.deepEqual(a.mainPoints[0], { x: 0, y: 30, z: 0 });
  assert.deepEqual(a.mainPoints[16], { x: 0, y: 0, z: 0 });
  assert.equal(a.mainSegments.length, 16);
  assert.equal(a.branchASegments.length, 2);
  assert.equal(a.branchBSegments.length, 2);
  assert.equal(16 + 2 + 2, 20);
  a.mainPoints.forEach((point) => assert.equal(point.z, 0));
});

test("branches and crackles use their specified points", () => {
  const bolt = generateBolt(10);
  const point4 = bolt.mainPoints[4];
  const point8 = bolt.mainPoints[8];
  assert.deepEqual(bolt.branchA, [
    point4,
    { x: point4.x - 3, y: point4.y - 4, z: point4.z + 3 },
    { x: point4.x - 6, y: point4.y - 8, z: point4.z + 2 },
  ]);
  assert.deepEqual(bolt.branchB, [
    point8,
    { x: point8.x + 2.5, y: point8.y - 3, z: point8.z - 3 },
    { x: point8.x + 5, y: point8.y - 6, z: point8.z - 2 },
  ]);
  assert.equal(bolt.crackles.length, 12);
  assert.deepEqual(bolt.crackles[0].a, { x: 2, y: 0.02, z: 0 });
  assert.deepEqual(bolt.crackles[1].b, { x: 6, y: 0.02, z: 0 });
  const secondMidpoint = bolt.crackles[3].a;
  assert.ok(Math.abs(Math.hypot(secondMidpoint.x, secondMidpoint.z) - 4) < 1e-12);
  assert.ok(Math.abs(Math.atan2(secondMidpoint.z, secondMidpoint.x) - (Math.PI / 3 - 0.12)) < 1e-12);
});

test("timeline reveals, impacts, fades, and clamps", () => {
  assert.equal(frameForTime(0).drawRangeCount, 0);
  assert.equal(frameForTime(200).drawRangeCount, 20);
  assert.equal(frameForTime(400).drawRangeCount, 40);
  assert.equal(frameForTime(400).crackleCount, 12);
  assert.ok(Math.abs(frameForTime(600).impactScale - 8) < 1e-12);
  assert.equal(frameForTime(600).opacity, 1);
  assert.ok(Math.abs(frameForTime(700).opacity - 0.5) < 1e-12);
  const final = frameForTime(5000);
  assert.deepEqual(
    {
      phase: final.phase,
      drawRangeCount: final.drawRangeCount,
      opacity: final.opacity,
      impactScale: final.impactScale,
      crackleCount: final.crackleCount,
    },
    {
      phase: "idle",
      drawRangeCount: 0,
      opacity: 1,
      impactScale: 0,
      crackleCount: 0,
    },
  );
});

test("seed parser accepts exact unsigned 32-bit integers only", () => {
  assert.equal(parseSeed("0"), 0);
  assert.equal(parseSeed("4294967295"), 4294967295);
  assert.equal(parseSeed(" 42 "), 42);
  for (const value of ["", "-1", "4294967296", "1.5", "abc", "01", "+1", "1e3"]) {
    assert.equal(parseSeed(value), null, value);
  }
});
