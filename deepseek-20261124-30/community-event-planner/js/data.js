export const PARK = Object.freeze({
  id: 'meadowline-park',
  name: 'Meadowline Community Park',
  width: 68,
  depth: 44,
  minX: -34,
  maxX: 34,
  minZ: -22,
  maxZ: 22,
  entrances: [
    { id: 'west', name: 'West Gate', x: -34, z: 0, label: 'WEST GATE' },
    { id: 'east', name: 'East Gate', x: 34, z: 0, label: 'EAST GATE' }
  ],
  hedge: { z: 6.4, stepMinX: -19, stepMaxX: -15.2, gapMinX: 29.4, gapMaxX: 33.8 },
  paths: [
    { x: 0, z: 0, w: 68, d: 3.8, kind: 'promenade' },
    { x: -14, z: -5.5, w: 4.2, d: 11, kind: 'spur' },
    { x: 8, z: -6, w: 3.2, d: 12, kind: 'spur' },
    { x: 0, z: 3.4, w: 2.8, d: 6.8, kind: 'spur' },
    { x: -17, z: 4.5, w: 3.4, d: 9, kind: 'step-spur' },
    { x: 15, z: 4.5, w: 3.2, d: 9, kind: 'spur' },
    { x: 24, z: -5.4, w: 3.2, d: 10.8, kind: 'spur' },
    { x: 31.2, z: 3.2, w: 3, d: 6.4, kind: 'level-spur' },
    { x: 24, z: 14.8, w: 17, d: 3.2, kind: 'loop' },
    { x: 16, z: 17.8, w: 3.2, d: 7.2, kind: 'loop' },
    { x: -24, z: 14.8, w: 17, d: 3.2, kind: 'loop' }
  ],
  trees: [
    { x: -29, z: -18, r: 1.25, s: 1.0 },
    { x: -26, z: -8.5, r: 1.1, s: 0.9 },
    { x: -29.5, z: 13.5, r: 1.3, s: 1.05 },
    { x: -4, z: -19.3, r: 1.0, s: 0.85 },
    { x: 2, z: -20, r: 1.15, s: 1.0 },
    { x: 18, z: -20, r: 1.35, s: 1.1 },
    { x: 30, z: -4, r: 1.0, s: 0.9 },
    { x: 28.4, z: 13.2, r: 1.25, s: 1.0 },
    { x: -3, z: 17.4, r: 1.4, s: 1.1 },
    { x: 7, z: 18.3, r: 1.1, s: 0.9 },
    { x: 21.5, z: 17.6, r: 1.25, s: 1.0 },
    { x: -27, z: 18.6, r: 1.15, s: 0.95 },
    { x: -7, z: 14.8, r: 0.95, s: 0.8 },
    { x: 26.8, z: 4.4, r: 0.9, s: 0.8 },
    { x: -30.5, z: 4.6, r: 1.05, s: 0.9 },
    { x: -10, z: 18.4, r: 1.1, s: 0.9 }
  ]
});

export const EQUIPMENT_TYPES = Object.freeze({
  stage: {
    label: 'Stage',
    defaultName: 'Stage',
    width: 12,
    depth: 8,
    capacity: 240,
    scheduleable: true,
    facility: true,
    color: '#e1ac42'
  },
  'food-stall': {
    label: 'Food stall',
    defaultName: 'Food stall',
    width: 4,
    depth: 3,
    capacity: 0,
    scheduleable: false,
    facility: true,
    color: '#d96b4b'
  },
  seating: {
    label: 'Seating area',
    defaultName: 'Seating area',
    width: 8,
    depth: 6,
    capacity: 48,
    scheduleable: true,
    facility: true,
    color: '#4f8d76'
  },
  'info-desk': {
    label: 'Information desk',
    defaultName: 'Information desk',
    width: 4,
    depth: 2.5,
    capacity: 0,
    scheduleable: false,
    facility: true,
    color: '#3b7d86'
  },
  barrier: {
    label: 'Access barrier',
    defaultName: 'Access barrier',
    width: 4,
    depth: 1.2,
    capacity: 0,
    scheduleable: false,
    facility: false,
    color: '#d99725'
  },
  restroom: {
    label: 'Accessible restroom',
    defaultName: 'Accessible restroom',
    width: 8,
    depth: 5,
    capacity: 0,
    scheduleable: false,
    facility: true,
    fixed: true,
    color: '#4e8391'
  }
});

export const SAMPLE_EQUIPMENT = Object.freeze([
  {
    id: 'eq-stage-main',
    type: 'stage',
    name: 'Main stage',
    x: -14,
    z: -15,
    rotation: 0,
    width: 12,
    depth: 8,
    capacity: 240,
    fixed: false
  },
  {
    id: 'eq-food-1',
    type: 'food-stall',
    name: 'Food stall · Meadow',
    x: 2,
    z: -14.5,
    rotation: 0,
    width: 4,
    depth: 3,
    capacity: 0,
    fixed: false
  },
  {
    id: 'eq-food-2',
    type: 'food-stall',
    name: 'Food stall · Orchard',
    x: 7,
    z: -14.5,
    rotation: 0,
    width: 4,
    depth: 3,
    capacity: 0,
    fixed: false
  },
  {
    id: 'eq-food-3',
    type: 'food-stall',
    name: 'Food stall · Spice',
    x: 12,
    z: -14.5,
    rotation: 0,
    width: 4,
    depth: 3,
    capacity: 0,
    fixed: false
  },
  {
    id: 'eq-seat-west',
    type: 'seating',
    name: 'West seating lawn',
    x: -17,
    z: 10.2,
    rotation: 0,
    width: 8,
    depth: 5.6,
    capacity: 48,
    fixed: false
  },
  {
    id: 'eq-seat-east',
    type: 'seating',
    name: 'East seating lawn',
    x: 15,
    z: 10.3,
    rotation: 0,
    width: 10,
    depth: 6,
    capacity: 80,
    fixed: false
  },
  {
    id: 'eq-info-desk',
    type: 'info-desk',
    name: 'Welcome information desk',
    x: 0,
    z: 8.6,
    rotation: 0,
    width: 4,
    depth: 2.5,
    capacity: 0,
    fixed: false
  },
  {
    id: 'eq-restroom-main',
    type: 'restroom',
    name: 'Accessible restroom',
    x: 24,
    z: -13,
    rotation: 0,
    width: 8,
    depth: 5,
    capacity: 0,
    fixed: true
  }
]);

export const SAMPLE_ACTIVITIES = Object.freeze([
  {
    id: 'act-welcome',
    title: 'Opening ceremony',
    facilityId: 'eq-stage-main',
    start: '10:00',
    end: '10:30',
    attendance: 160
  },
  {
    id: 'act-workshop',
    title: 'Seed-bomb workshop',
    facilityId: 'eq-seat-west',
    start: '10:30',
    end: '11:15',
    attendance: 32
  },
  {
    id: 'act-band',
    title: 'Meadowline community band',
    facilityId: 'eq-stage-main',
    start: '11:00',
    end: '12:00',
    attendance: 260
  },
  {
    id: 'act-lunch',
    title: 'Long-table lunch',
    facilityId: 'eq-seat-east',
    start: '12:15',
    end: '13:15',
    attendance: 64
  },
  {
    id: 'act-story',
    title: 'Neighbourhood story circle',
    facilityId: 'eq-seat-west',
    start: '12:30',
    end: '13:00',
    attendance: 36
  },
  {
    id: 'act-closing',
    title: 'Sunset closing set',
    facilityId: 'eq-stage-main',
    start: '14:00',
    end: '15:00',
    attendance: 210
  }
]);

export const ROUTE_DEFAULTS = Object.freeze({
  start: 'west',
  mode: 'pedestrian',
  targetId: 'eq-stage-main'
});

export function equipmentDefaults(type) {
  return EQUIPMENT_TYPES[type] || EQUIPMENT_TYPES['food-stall'];
}

export function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRotation(rotation) {
  const value = Number(rotation) || 0;
  return ((value % 360) + 360) % 360;
}

export function objectHalfExtents(object) {
  const angle = (normalizeRotation(object.rotation) * Math.PI) / 180;
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return {
    x: (object.width * c + object.depth * s) / 2,
    z: (object.width * s + object.depth * c) / 2
  };
}

export function objectCorners(object) {
  const angle = (normalizeRotation(object.rotation) * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const hw = object.width / 2;
  const hd = object.depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd]
  ].map(([x, z]) => ({
    x: object.x + x * c + z * s,
    z: object.z - x * s + z * c
  }));
}

export function isOutsidePark(object, margin = 0.05) {
  return objectCorners(object).some(
    (point) =>
      point.x < PARK.minX + margin ||
      point.x > PARK.maxX - margin ||
      point.z < PARK.minZ + margin ||
      point.z > PARK.maxZ - margin
  );
}

export function confineToPark(object) {
  const extents = objectHalfExtents(object);
  return {
    ...object,
    x: round(clamp(Number(object.x) || 0, PARK.minX + extents.x + 0.08, PARK.maxX - extents.x - 0.08), 2),
    z: round(clamp(Number(object.z) || 0, PARK.minZ + extents.z + 0.08, PARK.maxZ - extents.z - 0.08), 2),
    rotation: round(normalizeRotation(object.rotation), 1)
  };
}

function axesFor(object) {
  const angle = (normalizeRotation(object.rotation) * Math.PI) / 180;
  return [
    { x: Math.cos(angle), z: -Math.sin(angle) },
    { x: Math.sin(angle), z: Math.cos(angle) }
  ];
}

function projectCorners(corners, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of corners) {
    const projected = point.x * axis.x + point.z * axis.z;
    min = Math.min(min, projected);
    max = Math.max(max, projected);
  }
  return { min, max };
}

export function objectsOverlap(a, b, tolerance = 0.05) {
  const cornersA = objectCorners(a);
  const cornersB = objectCorners(b);
  const axes = [...axesFor(a), ...axesFor(b)];
  for (const axis of axes) {
    const projectionA = projectCorners(cornersA, axis);
    const projectionB = projectCorners(cornersB, axis);
    if (projectionA.max <= projectionB.min + tolerance || projectionB.max <= projectionA.min + tolerance) {
      return false;
    }
  }
  return true;
}

export function overlapPairs(equipment) {
  const pairs = [];
  for (let i = 0; i < equipment.length; i += 1) {
    for (let j = i + 1; j < equipment.length; j += 1) {
      if (objectsOverlap(equipment[i], equipment[j])) {
        pairs.push([equipment[i], equipment[j]]);
      }
    }
  }
  return pairs;
}

export function formatMeters(value, places = 1) {
  return `${Number(value).toFixed(places)} m`;
}

export function formatDimensions(object) {
  return `${round(object.width, 1)} × ${round(object.depth, 1)} m`;
}

export function minutesFromTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function createSamplePlan() {
  return {
    schema: 'meadowline-festival-plan',
    version: 1,
    parkId: PARK.id,
    equipment: clone(SAMPLE_EQUIPMENT),
    activities: clone(SAMPLE_ACTIVITIES),
    routeConfig: clone(ROUTE_DEFAULTS)
  };
}

export function parsePlanFile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The file must contain a JSON object.');
  }
  if (value.schema !== 'meadowline-festival-plan') {
    throw new Error('This is not a Meadowline festival plan.');
  }
  if (value.version !== 1) {
    throw new Error(`Unsupported plan version: ${String(value.version)}.`);
  }
  if (value.parkId !== PARK.id) {
    throw new Error('The plan was created for a different park.');
  }
  if (!Array.isArray(value.equipment)) {
    throw new Error('The plan is missing its equipment array.');
  }
  if (!Array.isArray(value.activities)) {
    throw new Error('The plan is missing its activities array.');
  }
  return clone(value);
}

export function itemLabel(item) {
  return EQUIPMENT_TYPES[item.type]?.label || item.type;
}

export function isFacility(item) {
  return Boolean(item && EQUIPMENT_TYPES[item.type]?.facility);
}

export function isScheduleable(item) {
  return Boolean(item && EQUIPMENT_TYPES[item.type]?.scheduleable);
}
