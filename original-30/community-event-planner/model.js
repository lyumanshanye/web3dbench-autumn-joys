export const PLAN_SCHEMA = 'parkwork.plan';
export const PLAN_VERSION = 1;

export const EQUIPMENT_TYPES = {
  stage: {
    label: 'Stage',
    icon: 'stage',
    color: '#315f86',
    width: 12,
    depth: 7,
    height: 4.4,
    capacity: 250,
    facility: true,
  },
  seating: {
    label: 'Seating area',
    icon: 'seating',
    color: '#d39b3d',
    width: 10,
    depth: 6,
    height: 1.1,
    capacity: 120,
    facility: true,
  },
  foodStall: {
    label: 'Food stall',
    icon: 'food',
    color: '#c95e4b',
    width: 4,
    depth: 3,
    height: 3,
    capacity: 0,
    facility: false,
  },
  infoDesk: {
    label: 'Information desk',
    icon: 'info',
    color: '#5c8d76',
    width: 4,
    depth: 2.4,
    height: 2.8,
    capacity: 0,
    facility: true,
  },
  firstAid: {
    label: 'First aid tent',
    icon: 'aid',
    color: '#e8e2d5',
    width: 4,
    depth: 3,
    height: 2.7,
    capacity: 0,
    facility: true,
  },
  waterPoint: {
    label: 'Water point',
    icon: 'water',
    color: '#4f9eb5',
    width: 2,
    depth: 2,
    height: 1.5,
    capacity: 0,
    facility: false,
  },
  barrier: {
    label: 'Route barrier',
    icon: 'barrier',
    color: '#e17732',
    width: 3.2,
    depth: 1.1,
    height: 1.2,
    capacity: 0,
    facility: false,
  },
  restroom: {
    label: 'Accessible restroom',
    icon: 'restroom',
    color: '#4a7f99',
    width: 6,
    depth: 5,
    height: 3.1,
    capacity: 0,
    facility: true,
  },
};

export const TYPE_LABELS = Object.fromEntries(
  Object.entries(EQUIPMENT_TYPES).map(([key, value]) => [key, value.label]),
);

export const NAV_NODES = [
  { id: 'WEST_GATE', name: 'West gate', x: -32, z: 0 },
  { id: 'WEST_J', name: 'West path junction', x: -17, z: 0 },
  { id: 'CENTER', name: 'Central plaza', x: 0, z: 0 },
  { id: 'SOUTH_GATE', name: 'South gate', x: 0, z: 22 },
  { id: 'SOUTH_J', name: 'South path junction', x: 0, z: 10 },
  { id: 'NORTH_J', name: 'North path junction', x: 0, z: -8 },
  { id: 'STAGE_ACC', name: 'Stage access', x: -15, z: -8 },
  { id: 'SEAT_ACC', name: 'Seating access', x: 12, z: -8 },
  { id: 'INFO_ACC', name: 'Information access', x: -7, z: 3 },
  { id: 'STEP_W', name: 'Step approach', x: 7, z: 0 },
  { id: 'STEP_E', name: 'East steps', x: 15, z: 0 },
  { id: 'EAST_J', name: 'East path junction', x: 18, z: 0 },
  { id: 'REST_ACC', name: 'Restroom access', x: 24, z: 0 },
  { id: 'EAST_N', name: 'North-east turn', x: 18, z: -8 },
];

export const NAV_EDGES = [
  { a: 'WEST_GATE', b: 'WEST_J' },
  { a: 'WEST_J', b: 'CENTER' },
  { a: 'SOUTH_GATE', b: 'SOUTH_J' },
  { a: 'SOUTH_J', b: 'CENTER' },
  { a: 'CENTER', b: 'NORTH_J' },
  { a: 'NORTH_J', b: 'STAGE_ACC' },
  { a: 'NORTH_J', b: 'SEAT_ACC' },
  { a: 'CENTER', b: 'INFO_ACC' },
  { a: 'CENTER', b: 'STEP_W' },
  { a: 'STEP_W', b: 'STEP_E', stepOnly: true },
  { a: 'STEP_E', b: 'EAST_J' },
  { a: 'EAST_J', b: 'REST_ACC' },
  { a: 'NORTH_J', b: 'EAST_N' },
  { a: 'EAST_N', b: 'EAST_J' },
];

const nodeById = Object.fromEntries(NAV_NODES.map((node) => [node.id, node]));

export const ENTRANCES = [
  { id: 'west', name: 'West gate', nodeId: 'WEST_GATE' },
  { id: 'south', name: 'South gate', nodeId: 'SOUTH_GATE' },
];

const TREES = [
  { x: -27, z: -15, scale: 1.1 },
  { x: -24, z: 12, scale: 0.9 },
  { x: -12, z: 16, scale: 1.15 },
  { x: 9, z: 16, scale: 0.95 },
  { x: 23, z: 14, scale: 1.2 },
  { x: 28, z: -13, scale: 0.9 },
  { x: 8, z: -18, scale: 1.05 },
  { x: -29, z: 7, scale: 0.82 },
  { x: 28, z: 8, scale: 1.05 },
  { x: 15, z: 8, scale: 0.75 },
  { x: -16, z: 8, scale: 0.88 },
];

function equipment({
  id,
  type,
  name,
  x,
  z,
  rotation = 0,
  capacity,
  locked = false,
  note = '',
}) {
  const spec = EQUIPMENT_TYPES[type];
  return {
    id,
    type,
    name,
    x,
    z,
    rotation,
    width: spec.width,
    depth: spec.depth,
    height: spec.height,
    color: spec.color,
    capacity: capacity ?? spec.capacity,
    facility: spec.facility,
    locked,
    note,
  };
}

export function createSamplePlan() {
  return {
    schema: PLAN_SCHEMA,
    version: PLAN_VERSION,
    park: {
      name: 'Riverbend Community Park',
      width: 64,
      depth: 44,
      description: 'A compact neighborhood park with two gates and a fixed walking network.',
      trees: TREES.map((tree, index) => ({ id: `TREE-${index + 1}`, ...tree })),
      pathNote: 'Walking routes use a fixed path graph with a stepped east shortcut.',
    },
    equipment: [
      equipment({
        id: 'STG-01',
        type: 'stage',
        name: 'Main community stage',
        x: -15,
        z: -14,
        capacity: 250,
      }),
      equipment({
        id: 'SEAT-01',
        type: 'seating',
        name: 'Lawn seating area',
        x: 12,
        z: -13,
        capacity: 120,
      }),
      equipment({
        id: 'FOOD-01',
        type: 'foodStall',
        name: 'Meadow kitchen',
        x: -4,
        z: -3,
      }),
      equipment({
        id: 'FOOD-02',
        type: 'foodStall',
        name: 'Orchard coffee cart',
        x: 22,
        z: 4,
      }),
      equipment({
        id: 'FOOD-03',
        type: 'foodStall',
        name: 'North snack stall',
        x: -20,
        z: -4,
      }),
      equipment({
        id: 'INFO-01',
        type: 'infoDesk',
        name: 'Welcome information desk',
        x: -7,
        z: 5.5,
      }),
      equipment({
        id: 'REST-01',
        type: 'restroom',
        name: 'Accessible restroom',
        x: 27.5,
        z: 0,
        locked: true,
        note: 'Fixed park asset. Step-free access is modeled; compliance is not assessed.',
      }),
      equipment({
        id: 'BARRIER-01',
        type: 'barrier',
        name: 'Maintenance barrier (demo)',
        x: 18,
        z: -4,
        rotation: 90,
        note: 'Sample edit: this barrier closes the step-free east detour.',
      }),
    ],
    activities: [
      {
        id: 'ACT-01',
        title: 'Morning soundcheck',
        facilityId: 'STG-01',
        start: '09:00',
        end: '10:00',
        attendance: 40,
      },
      {
        id: 'ACT-02',
        title: 'Opening welcome',
        facilityId: 'STG-01',
        start: '10:00',
        end: '10:45',
        attendance: 180,
      },
      {
        id: 'ACT-03',
        title: 'Garden storytelling',
        facilityId: 'SEAT-01',
        start: '10:15',
        end: '11:15',
        attendance: 60,
      },
      {
        id: 'ACT-04',
        title: 'Community band set',
        facilityId: 'STG-01',
        start: '10:45',
        end: '11:45',
        attendance: 265,
      },
    ],
  };
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRotation(value) {
  return ((Number(value) % 360) + 360) % 360;
}

export function footprintExtents(item) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const halfWidth = item.width / 2;
  const halfDepth = item.depth / 2;
  return {
    x: Math.abs(Math.cos(rad)) * halfWidth + Math.abs(Math.sin(rad)) * halfDepth,
    z: Math.abs(Math.sin(rad)) * halfWidth + Math.abs(Math.cos(rad)) * halfDepth,
  };
}

export function clampEquipmentToPark(item, park, margin = 0.5) {
  const extents = footprintExtents(item);
  const maxX = Math.max(0, park.width / 2 - extents.x - margin);
  const maxZ = Math.max(0, park.depth / 2 - extents.z - margin);
  item.x = clamp(Number(item.x) || 0, -maxX, maxX);
  item.z = clamp(Number(item.z) || 0, -maxZ, maxZ);
  item.rotation = normalizeRotation(item.rotation);
  return item;
}

export function isInsidePark(item, park, margin = 0.01) {
  const extents = footprintExtents(item);
  return (
    item.x - extents.x >= -park.width / 2 - margin &&
    item.x + extents.x <= park.width / 2 + margin &&
    item.z - extents.z >= -park.depth / 2 - margin &&
    item.z + extents.z <= park.depth / 2 + margin
  );
}

function projectionRadius(item, axisX, axisZ) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const ux = { x: Math.cos(rad), z: -Math.sin(rad) };
  const uz = { x: Math.sin(rad), z: Math.cos(rad) };
  return (
    (item.width / 2) * Math.abs(ux.x * axisX + ux.z * axisZ) +
    (item.depth / 2) * Math.abs(uz.x * axisX + uz.z * axisZ)
  );
}

// Separating axis theorem for two rotated footprint rectangles.
export function footprintsOverlap(a, b, padding = 0) {
  const radA = (normalizeRotation(a.rotation) * Math.PI) / 180;
  const radB = (normalizeRotation(b.rotation) * Math.PI) / 180;
  const axes = [
    { x: Math.cos(radA), z: -Math.sin(radA) },
    { x: Math.sin(radA), z: Math.cos(radA) },
    { x: Math.cos(radB), z: -Math.sin(radB) },
    { x: Math.sin(radB), z: Math.cos(radB) },
  ];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const axis of axes) {
    const distance = Math.abs(dx * axis.x + dz * axis.z);
    const radiusA = projectionRadius(a, axis.x, axis.z);
    const radiusB = projectionRadius(b, axis.x, axis.z);
    if (distance >= radiusA + radiusB + padding) return false;
  }
  return true;
}

export function findOverlaps(equipment) {
  const pairs = [];
  for (let i = 0; i < equipment.length; i += 1) {
    for (let j = i + 1; j < equipment.length; j += 1) {
      if (footprintsOverlap(equipment[i], equipment[j], 0.01)) {
        pairs.push({ a: equipment[i].id, b: equipment[j].id });
      }
    }
  }
  return pairs;
}

function segmentIntersectsItem(x1, z1, x2, z2, item, padding = 0) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toLocal = (x, z) => {
    const dx = x - item.x;
    const dz = z - item.z;
    return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
  };
  const p1 = toLocal(x1, z1);
  const p2 = toLocal(x2, z2);
  const minX = -item.width / 2 - padding;
  const maxX = item.width / 2 + padding;
  const minZ = -item.depth / 2 - padding;
  const maxZ = item.depth / 2 + padding;
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  let tMin = 0;
  let tMax = 1;

  const clip = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const t = q / p;
    if (p < 0) tMin = Math.max(tMin, t);
    else tMax = Math.min(tMax, t);
    return tMin <= tMax;
  };

  if (!clip(-dx, p1.x - minX)) return false;
  if (!clip(dx, maxX - p1.x)) return false;
  if (!clip(-dz, p1.z - minZ)) return false;
  if (!clip(dz, maxZ - p1.z)) return false;
  return tMin <= tMax;
}

function pointInsideItem(x, z, item, padding = 0) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const dx = x - item.x;
  const dz = z - item.z;
  const localX = dx * Math.cos(rad) - dz * Math.sin(rad);
  const localZ = dx * Math.sin(rad) + dz * Math.cos(rad);
  return (
    Math.abs(localX) <= item.width / 2 + padding &&
    Math.abs(localZ) <= item.depth / 2 + padding
  );
}

export function closestPointOnFootprint(x, z, item) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - item.x;
  const dz = z - item.z;
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const clampedX = clamp(localX, -item.width / 2, item.width / 2);
  const clampedZ = clamp(localZ, -item.depth / 2, item.depth / 2);
  let edgeX = clampedX;
  let edgeZ = clampedZ;
  if (Math.abs(clampedX) < item.width / 2 - 1e-6 && Math.abs(clampedZ) < item.depth / 2 - 1e-6) {
    const options = [
      { distance: Math.abs(item.width / 2 - clampedX), x: item.width / 2, z: clampedZ },
      { distance: Math.abs(item.width / 2 + clampedX), x: -item.width / 2, z: clampedZ },
      { distance: Math.abs(item.depth / 2 - clampedZ), x: clampedX, z: item.depth / 2 },
      { distance: Math.abs(item.depth / 2 + clampedZ), x: clampedX, z: -item.depth / 2 },
    ].sort((a, b) => a.distance - b.distance);
    edgeX = options[0].x;
    edgeZ = options[0].z;
  }
  return {
    x: item.x + edgeX * cos + edgeZ * sin,
    z: item.z - edgeX * sin + edgeZ * cos,
  };
}

export function distance(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

export function edgeLength(edge) {
  const a = nodeById[edge.a];
  const b = nodeById[edge.b];
  return distance(a.x, a.z, b.x, b.z);
}

function itemBlocksSegment(edge, item, padding = 0.35) {
  const a = nodeById[edge.a];
  const b = nodeById[edge.b];
  return segmentIntersectsItem(a.x, a.z, b.x, b.z, item, padding);
}

function buildBaseGraph(equipment, mode) {
  const graph = new Map(NAV_NODES.map((node) => [node.id, new Map()]));
  const blockers = new Map();
  NAV_EDGES.forEach((edge, index) => {
    if (mode === 'stepFree' && edge.stepOnly) return;
    const a = nodeById[edge.a];
    const b = nodeById[edge.b];
    const blockingItems = equipment.filter(
      (item) => !item.locked || item.type !== 'restroom',
    ).filter((item) => itemBlocksSegment(edge, item));
    if (blockingItems.length > 0) {
      blockers.set(`${edge.a}-${edge.b}`, blockingItems.map((item) => item.id));
      return;
    }
    const weight = distance(a.x, a.z, b.x, b.z);
    graph.get(edge.a).set(edge.b, { weight, edgeIndex: index });
    graph.get(edge.b).set(edge.a, { weight, edgeIndex: index });
  });
  return { graph, blockers };
}

function dijkstra(graph, startId) {
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(graph.keys());
  graph.forEach((_, id) => distances.set(id, Infinity));
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current = null;
    let best = Infinity;
    unvisited.forEach((id) => {
      const candidate = distances.get(id);
      if (candidate < best) {
        best = candidate;
        current = id;
      }
    });
    if (current === null || best === Infinity) break;
    unvisited.delete(current);
    graph.get(current).forEach((edge, neighbor) => {
      if (!unvisited.has(neighbor)) return;
      const candidate = best + edge.weight;
      if (candidate < distances.get(neighbor)) {
        distances.set(neighbor, candidate);
        previous.set(neighbor, current);
      }
    });
  }

  return { distances, previous };
}

function reconstruct(previous, startId, endId) {
  const ids = [];
  let cursor = endId;
  ids.push(cursor);
  while (cursor !== startId) {
    cursor = previous.get(cursor);
    if (!cursor) return null;
    ids.push(cursor);
  }
  return ids.reverse();
}

function addVirtualDestination(graph, target, equipment, destinationId) {
  const startCandidates = NAV_NODES.filter((node) => {
    const ownItem = equipment.find((item) => item.id === destinationId);
    return !ownItem || !pointInsideItem(node.x, node.z, ownItem, 0.4);
  })
    .map((node) => ({
      node,
      distance: distance(node.x, node.z, target.x, target.z),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  let best = null;
  for (const candidate of startCandidates) {
    const blockerItems = equipment.filter(
      (item) =>
        item.id !== destinationId &&
        segmentIntersectsItem(
          candidate.node.x,
          candidate.node.z,
          target.x,
          target.z,
          item,
          0.3,
        ),
    );
    if (blockerItems.length > 0) continue;
    const connectorDistance = distance(
      candidate.node.x,
      candidate.node.z,
      target.x,
      target.z,
    );
    if (!best || connectorDistance < best.distance) {
      best = { ...candidate, distance: connectorDistance };
    }
  }
  if (!best) return null;

  const virtualId = '__destination__';
  graph.set(virtualId, new Map());
  graph.get(virtualId).set(best.node.id, { weight: best.distance, edgeIndex: -1 });
  graph.get(best.node.id).set(virtualId, { weight: best.distance, edgeIndex: -1 });
  return { virtualId, fromNode: best.node.id };
}

export function computeRoute(equipment, park, options = {}) {
  const entranceId = options.entranceId || 'west';
  const mode = options.mode || 'stepFree';
  const destinationId = options.destinationId;
  const entrance = ENTRANCES.find((entry) => entry.id === entranceId) || ENTRANCES[0];
  const destination = equipment.find((item) => item.id === destinationId);
  if (!destination) {
    return {
      found: false,
      distance: 0,
      points: [],
      blockers: [],
      reason: 'Choose a facility to route to.',
      entrance,
      mode,
      destinationId,
    };
  }

  const startNode = nodeById[entrance.nodeId];
  const startBlocker = equipment.find((item) =>
    pointInsideItem(startNode.x, startNode.z, item, 0.15),
  );
  if (startBlocker) {
    return {
      found: false,
      distance: 0,
      points: [],
      blockers: [startBlocker.id],
      reason: `${startBlocker.name} blocks the ${entrance.name} starting point.`,
      entrance,
      mode,
      destinationId,
    };
  }

  const target = closestPointOnFootprint(startNode.x, startNode.z, destination);
  const { graph, blockers: edgeBlockers } = buildBaseGraph(equipment, mode);
  const virtual = addVirtualDestination(graph, target, equipment, destinationId);
  if (!virtual) {
    const allBlockerIds = [...new Set([...edgeBlockers.values()].flat())];
    return {
      found: false,
      distance: 0,
      points: [],
      blockers: allBlockerIds,
      reason: 'The final approach to this facility is blocked.',
      entrance,
      mode,
      destinationId,
    };
  }

  const { distances, previous } = dijkstra(graph, entrance.nodeId);
  const total = distances.get(virtual.virtualId);
  if (!Number.isFinite(total)) {
    const allBlockerIds = [...new Set([...edgeBlockers.values()].flat())];
    const blockerNames = allBlockerIds
      .map((id) => equipment.find((item) => item.id === id)?.name)
      .filter(Boolean);
    return {
      found: false,
      distance: 0,
      points: [],
      blockers: allBlockerIds,
      reason:
        (mode === 'stepFree'
          ? 'No continuous step-free path exists. A stepped shortcut cannot be used in this mode.'
          : 'No continuous walking path exists.') +
        (blockerNames.length ? ` Blocked by ${blockerNames.join(', ')}.` : ''),
      entrance,
      mode,
      destinationId,
    };
  }

  const nodePath = reconstruct(previous, entrance.nodeId, virtual.virtualId);
  if (!nodePath) {
    return {
      found: false,
      distance: 0,
      points: [],
      blockers: [],
      reason: 'No route could be reconstructed.',
      entrance,
      mode,
      destinationId,
    };
  }

  const points = nodePath.map((id, index) => {
    if (id === virtual.virtualId) return { ...target };
    const node = nodeById[id];
    if (index === nodePath.length - 1) {
      return { x: target.x, z: target.z };
    }
    return { x: node.x, z: node.z };
  });

  return {
    found: true,
    distance: total,
    points,
    blockers: [],
    reason: '',
    entrance,
    mode,
    destinationId,
  };
}

export function parseMinutes(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatMinutes(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function activitiesForFacility(activities, facilityId) {
  return activities
    .filter((activity) => activity.facilityId === facilityId)
    .sort((a, b) => (parseMinutes(a.start) || 0) - (parseMinutes(b.start) || 0));
}

export function validateActivity(activity, equipment) {
  const errors = [];
  if (!activity.title || !activity.title.trim()) errors.push('Give the activity a title.');
  const facility = equipment.find((item) => item.id === activity.facilityId);
  if (!facility) errors.push('Choose a valid stage or seating area.');
  else if (!['stage', 'seating'].includes(facility.type)) {
    errors.push('Activities can only be assigned to a stage or seating area.');
  }
  const start = parseMinutes(activity.start);
  const end = parseMinutes(activity.end);
  if (start === null) errors.push('Enter a valid start time.');
  if (end === null) errors.push('Enter a valid end time.');
  if (start !== null && end !== null && end < start) {
    errors.push('End time cannot be before start time.');
  }
  const attendance = Number(activity.attendance);
  if (!Number.isInteger(attendance) || attendance < 0) {
    errors.push('Expected attendance must be a whole number of 0 or more.');
  }
  return errors;
}

export function findScheduleConflicts(activities, equipment) {
  const warnings = [];
  for (const facility of equipment.filter((item) => ['stage', 'seating'].includes(item.type))) {
    const bookings = activitiesForFacility(activities, facility.id);
    for (let i = 0; i < bookings.length; i += 1) {
      const current = bookings[i];
      const start = parseMinutes(current.start);
      const end = parseMinutes(current.end);
      if (start !== null && end !== null && Number(current.attendance) > facility.capacity) {
        warnings.push({
          id: `capacity-${current.id}`,
          kind: 'schedule',
          severity: 'warning',
          title: `Attendance exceeds ${facility.name} capacity`,
          detail: `${current.title} expects ${current.attendance}; capacity is ${facility.capacity}.`,
          targetIds: [facility.id, current.id],
        });
      }
      for (let j = i + 1; j < bookings.length; j += 1) {
        const other = bookings[j];
        const otherStart = parseMinutes(other.start);
        const otherEnd = parseMinutes(other.end);
        if (start === null || end === null || otherStart === null || otherEnd === null) continue;
        if (start < otherEnd && otherStart < end) {
          warnings.push({
            id: `booking-${current.id}-${other.id}`,
            kind: 'schedule',
            severity: 'error',
            title: `Overlapping bookings at ${facility.name}`,
            detail: `${current.title} (${current.start}–${current.end}) overlaps ${other.title} (${other.start}–${other.end}).`,
            targetIds: [facility.id, current.id, other.id],
          });
        }
      }
    }
  }
  return warnings;
}

export function getAllWarnings(plan, options = {}) {
  const mode = options.mode || 'stepFree';
  const warnings = [];
  const overlaps = findOverlaps(plan.equipment);
  for (const pair of overlaps) {
    const a = plan.equipment.find((item) => item.id === pair.a);
    const b = plan.equipment.find((item) => item.id === pair.b);
    if (!a || !b) continue;
    warnings.push({
      id: `overlap-${a.id}-${b.id}`,
      kind: 'placement',
      severity: 'error',
      title: 'Overlapping equipment footprints',
      detail: `${a.name} overlaps ${b.name}. Move one object to clear the footprint.`,
      targetIds: [a.id, b.id],
    });
  }

  const facilities = plan.equipment.filter((item) => item.facility);
  for (const facility of facilities) {
    for (const entrance of ENTRANCES) {
      const route = computeRoute(plan.equipment, plan.park, {
        destinationId: facility.id,
        entranceId: entrance.id,
        mode,
      });
      if (!route.found) {
        const blockerNames = route.blockers
          .map((id) => plan.equipment.find((item) => item.id === id)?.name)
          .filter(Boolean);
        warnings.push({
          id: `route-${mode}-${entrance.id}-${facility.id}`,
          kind: 'route',
          severity: 'error',
          title: `No ${mode === 'stepFree' ? 'step-free' : 'pedestrian'} route from ${entrance.name} to ${facility.name}`,
          detail: blockerNames.length ? `Path blocked by ${blockerNames.join(', ')}.` : route.reason,
          targetIds: [...route.blockers, facility.id],
        });
      }
    }
  }

  warnings.push(...findScheduleConflicts(plan.activities, plan.equipment));
  return warnings;
}

export function findFreePlacement(type, equipment, park, preferred = null) {
  const spec = EQUIPMENT_TYPES[type];
  if (!spec) throw new Error(`Unknown equipment type: ${type}`);
  const center = preferred || { x: 0, z: 5 };
  const candidates = [{ x: center.x, z: center.z }];
  for (let ring = 1; ring <= 18; ring += 1) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      candidates.push({
        x: center.x + Math.cos(angle) * ring * 2,
        z: center.z + Math.sin(angle) * ring * 2,
      });
    }
  }

  for (const candidate of candidates) {
    const item = {
      type,
      x: candidate.x,
      z: candidate.z,
      rotation: 0,
      width: spec.width,
      depth: spec.depth,
    };
    clampEquipmentToPark(item, park);
    if (!isInsidePark(item, park)) continue;
    if (equipment.some((existing) => footprintsOverlap(item, existing, 0.4))) continue;
    return { x: item.x, z: item.z };
  }
  return { x: clamp(center.x, -park.width / 2 + spec.width / 2, park.width / 2 - spec.width / 2), z: 0 };
}

export function nextEquipmentId(type, equipment) {
  const prefixes = {
    stage: 'STG',
    seating: 'SEAT',
    foodStall: 'FOOD',
    infoDesk: 'INFO',
    firstAid: 'AID',
    waterPoint: 'WATER',
    barrier: 'BARRIER',
    restroom: 'REST',
  };
  const prefix = prefixes[type] || 'EQ';
  let index = 1;
  while (equipment.some((item) => item.id === `${prefix}-${String(index).padStart(2, '0')}`)) {
    index += 1;
  }
  return `${prefix}-${String(index).padStart(2, '0')}`;
}

export function nextActivityId(activities) {
  let index = 1;
  while (activities.some((item) => item.id === `ACT-${String(index).padStart(2, '0')}`)) {
    index += 1;
  }
  return `ACT-${String(index).padStart(2, '0')}`;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

export function validatePlan(raw) {
  let payload = raw;
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error('The selected file is not valid JSON.');
    }
  }
  requireObject(payload, 'Plan');
  if (payload.schema !== PLAN_SCHEMA) throw new Error('Unsupported plan schema.');
  requireObject(payload.park, 'Park');
  const width = Number(payload.park.width);
  const depth = Number(payload.park.depth);
  if (!Number.isFinite(width) || !Number.isFinite(depth) || width < 10 || depth < 10) {
    throw new Error('Park dimensions must be at least 10 m on each side.');
  }
  if (!Array.isArray(payload.equipment)) throw new Error('Equipment must be an array.');
  if (!Array.isArray(payload.activities)) throw new Error('Activities must be an array.');
  if (!payload.park.name || typeof payload.park.name !== 'string') {
    throw new Error('Park name is required.');
  }

  const ids = new Set();
  const normalizedEquipment = payload.equipment.map((rawItem, index) => {
    requireObject(rawItem, `Equipment item ${index + 1}`);
    if (typeof rawItem.id !== 'string' || !rawItem.id.trim()) {
      throw new Error(`Equipment item ${index + 1} is missing an identifier.`);
    }
    if (ids.has(rawItem.id)) throw new Error(`Duplicate equipment identifier: ${rawItem.id}.`);
    ids.add(rawItem.id);
    if (typeof rawItem.type !== 'string' || !EQUIPMENT_TYPES[rawItem.type]) {
      throw new Error(`Equipment ${rawItem.id} has an unsupported type.`);
    }
    if (typeof rawItem.name !== 'string' || !rawItem.name.trim()) {
      throw new Error(`Equipment ${rawItem.id} needs a name.`);
    }
    const x = Number(rawItem.x);
    const z = Number(rawItem.z);
    const rotation = Number(rawItem.rotation);
    const itemWidth = Number(rawItem.width);
    const itemDepth = Number(rawItem.depth);
    const itemHeight = Number(rawItem.height);
    if (![x, z, rotation, itemWidth, itemDepth, itemHeight].every(Number.isFinite)) {
      throw new Error(`Equipment ${rawItem.id} has invalid numeric geometry.`);
    }
    if (itemWidth <= 0 || itemDepth <= 0 || itemHeight <= 0) {
      throw new Error(`Equipment ${rawItem.id} dimensions must be positive.`);
    }
    const item = {
      ...rawItem,
      x,
      z,
      rotation: normalizeRotation(rotation),
      width: itemWidth,
      depth: itemDepth,
      height: itemHeight,
      capacity: Number.isFinite(Number(rawItem.capacity)) ? Number(rawItem.capacity) : 0,
      facility: Boolean(rawItem.facility ?? EQUIPMENT_TYPES[rawItem.type].facility),
      locked: Boolean(rawItem.locked),
    };
    if (!isInsidePark(item, { width, depth })) {
      throw new Error(`Equipment ${rawItem.id} falls outside the park boundary.`);
    }
    return item;
  });

  const activityIds = new Set();
  const normalizedActivities = payload.activities.map((rawActivity, index) => {
    requireObject(rawActivity, `Activity ${index + 1}`);
    if (typeof rawActivity.id !== 'string' || !rawActivity.id.trim()) {
      throw new Error(`Activity ${index + 1} is missing an identifier.`);
    }
    if (activityIds.has(rawActivity.id)) {
      throw new Error(`Duplicate activity identifier: ${rawActivity.id}.`);
    }
    activityIds.add(rawActivity.id);
    const facility = normalizedEquipment.find((item) => item.id === rawActivity.facilityId);
    if (!facility) throw new Error(`Activity ${rawActivity.id} refers to a missing facility.`);
    if (!['stage', 'seating'].includes(facility.type)) {
      throw new Error(`Activity ${rawActivity.id} must use a stage or seating area.`);
    }
    const start = parseMinutes(rawActivity.start);
    const end = parseMinutes(rawActivity.end);
    if (start === null || end === null) {
      throw new Error(`Activity ${rawActivity.id} has an invalid time.`);
    }
    if (end < start) {
      throw new Error(`Activity ${rawActivity.id} ends before it starts.`);
    }
    const attendance = Number(rawActivity.attendance);
    if (!Number.isInteger(attendance) || attendance < 0) {
      throw new Error(`Activity ${rawActivity.id} has invalid attendance.`);
    }
    return {
      id: rawActivity.id,
      title: String(rawActivity.title || '').trim(),
      facilityId: rawActivity.facilityId,
      start: rawActivity.start,
      end: rawActivity.end,
      attendance,
    };
  });

  if (normalizedActivities.some((activity) => !activity.title)) {
    throw new Error('Every activity needs a title.');
  }

  return {
    schema: PLAN_SCHEMA,
    version: PLAN_VERSION,
    park: {
      ...payload.park,
      width,
      depth,
      trees: Array.isArray(payload.park.trees) ? payload.park.trees : [],
    },
    equipment: normalizedEquipment,
    activities: normalizedActivities,
  };
}

export function makeExportPayload(plan, ui = {}) {
  return {
    schema: PLAN_SCHEMA,
    version: PLAN_VERSION,
    exportedAt: new Date().toISOString(),
    park: clone(plan.park),
    equipment: clone(plan.equipment),
    activities: clone(plan.activities),
    ui: clone(ui),
  };
}

export function getNavDocumentation() {
  return `${NAV_NODES.length} fixed nodes · ${NAV_EDGES.length} edges · 0.35 m edge clearance`;
}

export function getNavNodes() {
  return NAV_NODES.map((node) => ({ ...node }));
}

export function getNavEdges() {
  return NAV_EDGES.map((edge) => ({ ...edge }));
}

export function nodePosition(id) {
  return nodeById[id] ? { ...nodeById[id] } : null;
}
