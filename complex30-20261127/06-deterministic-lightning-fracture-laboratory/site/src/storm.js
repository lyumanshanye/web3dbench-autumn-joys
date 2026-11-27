const MAX_SEED = 4294967295;
const ROOT_START = Object.freeze({ x: 0, y: 30, z: 0 });
const ROOT_END = Object.freeze({ x: 0, y: 0, z: 0 });

function clonePoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}

function offsetPoint(point, offset) {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createLcg(seed) {
  let state = seed >>> 0;

  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    },
  };
}

function displace(a, b, random, displacement) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const nx = -dy / length;
  const ny = dx / length;
  const push = (random.next() - 0.5) * displacement;

  return {
    x: (a.x + b.x) / 2 + nx * push,
    y: (a.y + b.y) / 2 + ny * push,
    z: 0,
  };
}

function midpointPath(random) {
  let points = [clonePoint(ROOT_START), clonePoint(ROOT_END)];
  let displacement = 6;

  for (let depth = 0; depth < 4; depth += 1) {
    const next = [];

    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      next.push(a, displace(a, b, random, displacement));
    }

    next.push(points[points.length - 1]);
    points = next;
    displacement /= 2;
  }

  return points;
}

function polylineSegments(points) {
  const segments = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      a: clonePoint(points[index]),
      b: clonePoint(points[index + 1]),
    });
  }

  return segments;
}

function crackleSegments() {
  const segments = [];

  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const midAngle = angle + (index % 2 === 0 ? 0.12 : -0.12);
    const inner = { x: 2 * Math.cos(angle), y: 0.02, z: 2 * Math.sin(angle) };
    const mid = { x: 4 * Math.cos(midAngle), y: 0.02, z: 4 * Math.sin(midAngle) };
    const outer = { x: 6 * Math.cos(angle), y: 0.02, z: 6 * Math.sin(angle) };

    segments.push({ a: inner, b: mid }, { a: mid, b: outer });
  }

  return segments;
}

export function generateBolt(seed) {
  const random = createLcg(seed);
  const mainPoints = midpointPath(random);
  const point4 = mainPoints[4];
  const point8 = mainPoints[8];

  const branchA = [
    clonePoint(point4),
    offsetPoint(point4, { x: -3, y: -4, z: 3 }),
    offsetPoint(point4, { x: -6, y: -8, z: 2 }),
  ];
  const branchB = [
    clonePoint(point8),
    offsetPoint(point8, { x: 2.5, y: -3, z: -3 }),
    offsetPoint(point8, { x: 5, y: -6, z: -2 }),
  ];

  return {
    seed,
    mainPoints,
    branchA,
    branchB,
    mainSegments: polylineSegments(mainPoints),
    branchASegments: polylineSegments(branchA),
    branchBSegments: polylineSegments(branchB),
    crackles: crackleSegments(),
  };
}

export function simulationState({
  seed,
  bolt,
  time,
  phase,
  drawRangeCount,
  opacity,
  impactScale,
  crackleCount,
}) {
  return {
    seed,
    mainPoints: bolt ? bolt.mainPoints.map(clonePoint) : [],
    segmentCount: bolt ? 20 : 0,
    drawRangeCount,
    opacity,
    time,
    phase,
    impactScale,
    crackleCount,
  };
}

export function isActivePhase(value) {
  return value === "drawing" || value === "impact" || value === "fading";
}

export function phaseForTime(value) {
  if (value < 400) return "drawing";
  if (value < 600) return "impact";
  if (value < 800) return "fading";
  return "idle";
}

export function frameForTime(time) {
  const clampedTime = Math.max(0, time);

  if (clampedTime >= 800) {
    return {
      time: 800,
      phase: "idle",
      drawRangeCount: 0,
      opacity: 1,
      impactScale: 0,
      crackleCount: 0,
      boltVisible: false,
      cracklesVisible: false,
      sphereVisible: false,
    };
  }

  const drawn = Math.floor(20 * clamp(clampedTime / 400, 0, 1));
  const fractionalDraw = clampedTime >= 400 ? 40 : 2 * drawn;
  const impactScale =
    clampedTime > 400 ? 8 * Math.sin((Math.PI * (clampedTime - 400)) / 400) : 0;
  const opacity = clampedTime > 600 ? 1 - (clampedTime - 600) / 200 : 1;

  return {
    time: clampedTime,
    phase: phaseForTime(clampedTime),
    drawRangeCount: fractionalDraw,
    opacity,
    impactScale,
    crackleCount: clampedTime >= 400 ? 12 : 0,
    boltVisible: true,
    cracklesVisible: clampedTime >= 400,
    sphereVisible: clampedTime >= 400,
  };
}

export function parseSeed(value) {
  const text = String(value).trim();

  if (!/^(0|[1-9][0-9]*)$/.test(text)) return null;
  const seed = Number(text);

  return Number.isSafeInteger(seed) && seed >= 0 && seed <= MAX_SEED ? seed : null;
}

export { MAX_SEED };
