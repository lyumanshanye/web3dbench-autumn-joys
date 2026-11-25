export const MARBLE_RADIUS = 0.285;
export const DEFAULT_SETTINGS = Object.freeze({ impulse: 5.4, rampAngle: 16 });

export const LIMITS = Object.freeze({
  impulse: { min: 2.8, max: 8.2, step: 0.1 },
  rampAngle: { min: -6, max: 26, step: 1 },
});

export const TABLE = Object.freeze({
  center: { x: 0, y: -0.35, z: 0.25 },
  size: { x: 18.2, y: 0.7, z: 22.2 },
});

export const START = Object.freeze({
  gate: { x: 0, y: 4.05, z: -8.55 },
  spawn: { x: 0, y: 4.36, z: -8.43 },
  platform: { x: 0, y: 4.05, z: -8.34, width: 1.62, depth: 1.28 },
});

export const KICKER = Object.freeze({
  pivot: { x: 0, y: 1.1, z: 1.3 },
  length: 1.66,
  width: 1.34,
});

export const BASIN = Object.freeze({
  center: { x: 0, y: 0.06, z: 8.85 },
  floorTop: 0.16,
  floorRadius: 1.34,
  outerRadius: 1.56,
  wallHeight: 0.44,
  entry: { x: 0, y: 0.42, z: 7.58 },
  entryAngle: Math.atan2(7.58 - 8.85, 0),
  successRadius: 0.85,
});

export const GAP = Object.freeze({
  center: { x: 0, y: 0.012, z: 4.03 },
  size: { x: 3.7, z: 2.65 },
});

const START_PATH = [
  { x: 0, y: 4.05, z: -8.9 },
  { x: 0, y: 4.05, z: -7.82 },
];

const DESCENT_PATH = [
  { x: 0, y: 3.73, z: -6.48 },
  { x: 0, y: 3.1, z: -4.98 },
  { x: 0, y: 2.31, z: -3.18 },
  { x: 0, y: 1.7, z: -1.48 },
  { x: 0, y: 1.31, z: 0.13 },
  { x: 0, y: 1.1, z: 1.3 },
];

const LANDING_PATH = [
  { x: 0, y: 0.8, z: 5.05 },
  { x: 0, y: 0.69, z: 6.02 },
  { x: 0, y: 0.59, z: 6.76 },
  { x: 0, y: 0.49, z: 7.29 },
  { x: 0, y: 0.42, z: 7.58 },
];

export const TRACK_COLORS = [
  0xff665a,
  0xffc54a,
  0x44d6bd,
  0x9a89ff,
  0x54a7ff,
  0xff8a4c,
  0x50d7a7,
];

export const RAIL_COLORS = [
  0x74322e,
  0x7e5a1f,
  0x1f665e,
  0x4f438f,
  0x28527d,
  0x7d4026,
  0x1f6752,
];

export function getKickerEnd(angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  return {
    x: KICKER.pivot.x + Math.sin(0.035) * Math.cos(angle) * KICKER.length,
    y: KICKER.pivot.y + Math.sin(angle) * KICKER.length,
    z: KICKER.pivot.z + Math.cos(angle) * KICKER.length,
  };
}

function makeSegment(a, b, width, colorIndex, options = {}) {
  return {
    a: { ...a },
    b: { ...b },
    width,
    colorIndex,
    color: TRACK_COLORS[colorIndex % TRACK_COLORS.length],
    railColor: RAIL_COLORS[colorIndex % RAIL_COLORS.length],
    railHeight: options.railHeight ?? 0.34,
    railThickness: options.railThickness ?? 0.11,
    rails: options.rails !== false,
    thickness: options.thickness ?? 0.2,
    stage: options.stage ?? 'course',
    points: options.points ?? false,
  };
}

export function buildCourseLayout(rampAngle = DEFAULT_SETTINGS.rampAngle) {
  const segments = [];
  segments.push(makeSegment(START_PATH[0], START_PATH[1], START.platform.width, 0, {
    stage: 'start', railHeight: 0.38,
  }));

  const descent = [START_PATH[1], ...DESCENT_PATH];
  for (let i = 1; i < descent.length; i++) {
    segments.push(makeSegment(descent[i - 1], descent[i], 1.34, i, {
      stage: 'descent',
      railHeight: 0.34,
    }));
  }

  segments.push(makeSegment(KICKER.pivot, getKickerEnd(rampAngle), KICKER.width, 1, {
    stage: 'kicker',
    railHeight: 0.23,
    railThickness: 0.09,
  }));

  for (let i = 1; i < LANDING_PATH.length; i++) {
    segments.push(makeSegment(LANDING_PATH[i - 1], LANDING_PATH[i], i === 1 ? 1.62 : 1.34, i + 1, {
      stage: i === 1 ? 'landing' : 'curve',
      railHeight: i === 1 ? 0.38 : 0.34,
    }));
  }

  return {
    segments,
    rampAngle,
    kickerEnd: getKickerEnd(rampAngle),
    startPath: START_PATH,
    descentPath: DESCENT_PATH,
    landingPath: LANDING_PATH,
  };
}

export function supportPoints() {
  return [
    { x: 0, y: 3.78, z: -6.55, radius: 0.11 },
    { x: 0, y: 2.55, z: -3.78, radius: 0.12 },
    { x: 0, y: 1.62, z: -1.18, radius: 0.12 },
    { x: 0, y: 1.08, z: 1.25, radius: 0.11 },
    { x: 0, y: 0.68, z: 5.62, radius: 0.1 },
    { x: 0, y: 0.52, z: 7.16, radius: 0.09 },
  ];
}
