import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FLOOR_INFO = {
  1: { name: 'Entrance & collections', short: 'Ground', level: 'Level 1' },
  2: { name: 'Reading & meeting rooms', short: 'Upper', level: 'Level 2' }
};

const ROOMS = [
  {
    id: 'children',
    name: "Children's Section",
    shortName: "Children's",
    floor: 1,
    category: 'Collections',
    description: 'Picture books, family seating and the story rug',
    x1: -9.4, x2: -3.2, z1: 0.9, z2: 6.3,
    color: 0xd48a66,
    accent: 0xf2c7a7,
    door: { side: 'east', pos: 3.6, width: 1.6 },
    furniture: 'children',
    labelClass: 'major'
  },
  {
    id: 'books',
    name: 'Book Collection',
    shortName: 'Books',
    floor: 1,
    category: 'Collections',
    description: 'Adult fiction, non-fiction and new arrivals',
    x1: -9.4, x2: -3.2, z1: -6.3, z2: -0.6,
    color: 0xb7985b,
    accent: 0xe1c88f,
    door: { side: 'east', pos: -1.8, width: 1.7 },
    furniture: 'books',
    labelClass: 'major'
  },
  {
    id: 'toilets1',
    name: 'Toilets',
    shortName: 'Toilets',
    floor: 1,
    category: 'Amenities',
    description: 'Accessible toilets and baby-changing',
    x1: 3.2, x2: 9.4, z1: 2.8, z2: 6.3,
    color: 0x7e9eac,
    accent: 0xc0d8df,
    door: { side: 'west', pos: 4.4, width: 1.25 },
    furniture: 'toilets',
    labelClass: 'major'
  },
  {
    id: 'meetingA',
    name: 'Meeting Room A',
    shortName: 'Meeting A',
    floor: 1,
    category: 'Meeting rooms',
    description: 'Flexible meeting space for up to 10 people',
    x1: 3.2, x2: 9.4, z1: -5.6, z2: 0.4,
    color: 0x609b96,
    accent: 0xaad1c7,
    door: { side: 'west', pos: -2.2, width: 1.3 },
    furniture: 'meeting',
    labelClass: 'major'
  },
  {
    id: 'reading',
    name: 'Reading Room',
    shortName: 'Reading Room',
    floor: 2,
    category: 'Study spaces',
    description: 'Quiet reference collection and reading tables',
    x1: -9.4, x2: -3.2, z1: -6.3, z2: 1.0,
    color: 0x7d9f78,
    accent: 0xbdd3af,
    door: { side: 'east', pos: -1.8, width: 1.6 },
    furniture: 'reading',
    labelClass: 'major'
  },
  {
    id: 'study',
    name: 'Quiet Study',
    shortName: 'Quiet Study',
    floor: 2,
    category: 'Study spaces',
    description: 'Individual desks and soft seating',
    x1: -9.4, x2: -3.2, z1: 1.6, z2: 6.3,
    color: 0xc59a6a,
    accent: 0xecd1ac,
    door: { side: 'east', pos: 4.0, width: 1.5 },
    furniture: 'study',
    labelClass: 'minor'
  },
  {
    id: 'meetingB',
    name: 'Meeting Room B',
    shortName: 'Meeting B',
    floor: 2,
    category: 'Meeting rooms',
    description: 'Quiet meeting room for up to 8 people',
    x1: 3.2, x2: 9.4, z1: -5.9, z2: 0.4,
    color: 0x609b96,
    accent: 0xaad1c7,
    door: { side: 'west', pos: -2.4, width: 1.3 },
    furniture: 'meeting',
    labelClass: 'major'
  },
  {
    id: 'toilets2',
    name: 'Toilets – Level 2',
    shortName: 'Toilets',
    floor: 2,
    category: 'Amenities',
    description: 'Upper-floor accessible toilets',
    x1: 3.2, x2: 9.4, z1: 1.6, z2: 6.3,
    color: 0x7e9eac,
    accent: 0xc0d8df,
    door: { side: 'west', pos: 3.9, width: 1.25 },
    furniture: 'toilets',
    labelClass: 'minor'
  }
];

const DESTINATIONS = [
  {
    id: 'entrance', name: 'Main Entrance', shortName: 'Entrance', floor: 1,
    category: 'Start or finish', description: 'Harbour Lane entrance lobby',
    node: 'f1:entrance', kind: 'entrance'
  },
  {
    id: 'help', name: 'Help Desk', shortName: 'Help Desk', floor: 1,
    category: 'Services', description: 'Staff assistance, returns and library cards',
    node: 'f1:help', kind: 'help'
  },
  {
    id: 'children', name: "Children's Section", shortName: "Children's", floor: 1,
    category: 'Collections', description: 'Picture books, family seating and the story rug',
    node: 'f1:children', roomId: 'children', kind: 'children'
  },
  {
    id: 'books', name: 'Book Collection', shortName: 'Books', floor: 1,
    category: 'Collections', description: 'Adult fiction, non-fiction and new arrivals',
    node: 'f1:books', roomId: 'books', kind: 'books'
  },
  {
    id: 'toilets1', name: 'Toilets', shortName: 'Toilets', floor: 1,
    category: 'Amenities', description: 'Accessible toilets and baby-changing',
    node: 'f1:toilets', roomId: 'toilets1', kind: 'toilets'
  },
  {
    id: 'meetingA', name: 'Meeting Room A', shortName: 'Meeting A', floor: 1,
    category: 'Meeting rooms', description: 'Flexible meeting space for up to 10 people',
    node: 'f1:meetingA', roomId: 'meetingA', kind: 'meeting'
  },
  {
    id: 'reading', name: 'Reading Room', shortName: 'Reading Room', floor: 2,
    category: 'Study spaces', description: 'Quiet reference collection and reading tables',
    node: 'f2:reading', roomId: 'reading', kind: 'reading'
  },
  {
    id: 'study', name: 'Quiet Study', shortName: 'Quiet Study', floor: 2,
    category: 'Study spaces', description: 'Individual desks and soft seating',
    node: 'f2:study', roomId: 'study', kind: 'study'
  },
  {
    id: 'meetingB', name: 'Meeting Room B', shortName: 'Meeting B', floor: 2,
    category: 'Meeting rooms', description: 'Quiet meeting room for up to 8 people',
    node: 'f2:meetingB', roomId: 'meetingB', kind: 'meeting'
  },
  {
    id: 'toilets2', name: 'Toilets – Level 2', shortName: 'Upper toilets', floor: 2,
    category: 'Amenities', description: 'Upper-floor accessible toilets',
    node: 'f2:toilets2', roomId: 'toilets2', kind: 'toilets'
  }
];

const START_IDS = ['entrance', 'help', 'children', 'reading', 'meetingA', 'toilets1'];

const NODE_DATA = [
  ['f1:entrance', 1, 0, 6.0, 'Main entrance', 'landmark'],
  ['f1:lobby_toilets', 1, 0, 4.4, 'entrance lobby', 'corridor'],
  ['f1:lobby_children', 1, 0, 3.6, 'entrance lobby', 'corridor'],
  ['f1:lobby_help', 1, 0, 2.2, 'main lobby', 'corridor'],
  ['f1:lobby_mid', 1, 0, 0.2, 'central lobby', 'corridor'],
  ['f1:lobby_north', 1, 0, -1.8, 'collection corridor', 'corridor'],
  ['f1:core_front', 1, 0, -3.0, 'stair and lift core', 'core'],
  ['f1:stair_door', 1, 0, -3.5, 'stair doorway', 'door'],
  ['f1:stair', 1, -0.55, -4.6, 'stairs', 'stairs'],
  ['f1:lift_door', 1, 1.35, -3.5, 'lift doorway', 'door'],
  ['f1:lift', 1, 1.35, -4.6, 'lift', 'lift'],
  ['f1:help', 1, -2.1, 2.2, 'Help Desk', 'desk'],
  ['f1:children_door', 1, -3.2, 3.6, "children's doorway", 'door'],
  ['f1:children', 1, -6.3, 2.05, "Children's Section", 'room'],
  ['f1:toilets_door', 1, 3.2, 4.4, 'toilet doorway', 'door'],
  ['f1:toilets', 1, 6.2, 4.4, 'Toilets', 'room'],
  ['f1:books_door', 1, -3.2, -1.8, 'collection doorway', 'door'],
  ['f1:books', 1, -6.4, -1.35, 'Book Collection', 'room'],
  ['f1:meetingA_door', 1, 3.2, -2.2, 'meeting room doorway', 'door'],
  ['f1:meetingA', 1, 4.9, -2.2, 'Meeting Room A', 'room'],
  ['f2:stair', 2, -0.55, -4.6, 'stairs', 'stairs'],
  ['f2:stair_door', 2, 0, -3.5, 'stair doorway', 'door'],
  ['f2:core_front', 2, 0, -3.0, 'stair and lift landing', 'core'],
  ['f2:lobby_north', 2, 0, -1.8, 'upper gallery', 'corridor'],
  ['f2:lobby_study', 2, 0, 4.0, 'upper gallery', 'corridor'],
  ['f2:lobby_south', 2, 0, 5.8, 'gallery end', 'corridor'],
  ['f2:lift_door', 2, 1.35, -3.5, 'lift doorway', 'door'],
  ['f2:lift', 2, 1.35, -4.6, 'lift', 'lift'],
  ['f2:reading_door', 2, -3.2, -1.8, 'reading room doorway', 'door'],
  ['f2:reading', 2, -6.15, -2.15, 'Reading Room', 'room'],
  ['f2:meetingB_door', 2, 3.2, -2.4, 'meeting room doorway', 'door'],
  ['f2:meetingB', 2, 4.9, -2.4, 'Meeting Room B', 'room'],
  ['f2:study_door', 2, -3.2, 4.0, 'study doorway', 'door'],
  ['f2:study', 2, -6.5, 4.0, 'Quiet Study', 'room'],
  ['f2:toilets2_door', 2, 3.2, 3.9, 'toilet doorway', 'door'],
  ['f2:toilets2', 2, 6.2, 3.9, 'Toilets', 'room']
];

const NODES = Object.fromEntries(NODE_DATA.map(([id, floor, x, z, name, type]) => [
  id, { id, floor, x, z, name, type }
]));

const WALK_EDGES = [
  ['f1:entrance', 'f1:lobby_toilets'],
  ['f1:lobby_toilets', 'f1:lobby_children'],
  ['f1:lobby_children', 'f1:lobby_help'],
  ['f1:lobby_help', 'f1:lobby_mid'],
  ['f1:lobby_mid', 'f1:lobby_north'],
  ['f1:lobby_north', 'f1:core_front'],
  ['f1:core_front', 'f1:stair_door'],
  ['f1:stair_door', 'f1:stair'],
  ['f1:core_front', 'f1:lift_door'],
  ['f1:lift_door', 'f1:lift'],
  ['f1:lobby_toilets', 'f1:toilets_door'],
  ['f1:toilets_door', 'f1:toilets'],
  ['f1:lobby_children', 'f1:children_door'],
  ['f1:children_door', 'f1:children'],
  ['f1:lobby_help', 'f1:help'],
  ['f1:lobby_north', 'f1:books_door'],
  ['f1:books_door', 'f1:books'],
  ['f1:lobby_north', 'f1:meetingA_door'],
  ['f1:meetingA_door', 'f1:meetingA'],
  ['f2:stair', 'f2:stair_door'],
  ['f2:stair_door', 'f2:core_front'],
  ['f2:core_front', 'f2:lobby_north'],
  ['f2:lift', 'f2:lift_door'],
  ['f2:lift_door', 'f2:core_front'],
  ['f2:lobby_north', 'f2:lobby_study'],
  ['f2:lobby_study', 'f2:lobby_south'],
  ['f2:lobby_north', 'f2:reading_door'],
  ['f2:reading_door', 'f2:reading'],
  ['f2:lobby_north', 'f2:meetingB_door'],
  ['f2:meetingB_door', 'f2:meetingB'],
  ['f2:lobby_study', 'f2:study_door'],
  ['f2:study_door', 'f2:study'],
  ['f2:lobby_study', 'f2:toilets2_door'],
  ['f2:toilets2_door', 'f2:toilets2']
];

const MODE_EDGES = [
  { from: 'f1:stair', to: 'f2:stair', kind: 'stairs', weight: 1.9 },
  { from: 'f1:lift', to: 'f2:lift', kind: 'lift', weight: 4.5 }
];

const GRAPH = Object.fromEntries(Object.keys(NODES).map((id) => [id, []]));

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function addGraphEdge(from, to, kind, weight) {
  const a = NODES[from];
  const b = NODES[to];
  const walkDistance = distanceBetween(a, b);
  GRAPH[from].push({ from, to, kind, weight, meters: walkDistance });
  GRAPH[to].push({ from: to, to: from, kind, weight, meters: walkDistance });
}

for (const [from, to] of WALK_EDGES) {
  addGraphEdge(from, to, 'walk');
}

for (const edge of MODE_EDGES) {
  const weight = edge.weight;
  GRAPH[edge.from].push({ ...edge, meters: 5.5 });
  GRAPH[edge.to].push({ from: edge.to, to: edge.from, kind: edge.kind, weight, meters: 5.5 });
}

const state = {
  activeFloor: 1,
  startId: 'entrance',
  destinationId: 'reading',
  stepFree: false,
  liftOperational: true,
  currentRoute: null,
  currentDirections: [],
  searchOpen: false,
  selectedHover: null
};

const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map((item) => [item.id, item]));
const ROOM_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room]));

/* -------------------------------------------------------------------------- */
/* Routing                                                                    */
/* -------------------------------------------------------------------------- */

function findRoute(startId, destinationId) {
  const start = DESTINATION_BY_ID[startId];
  const destination = DESTINATION_BY_ID[destinationId];
  if (!start || !destination) return null;

  const startKey = start.node;
  const goalKey = destination.node;
  const distances = new Map(Object.keys(NODES).map((key) => [key, Infinity]));
  const previous = new Map();
  const previousEdge = new Map();
  const unvisited = new Set(Object.keys(NODES));
  distances.set(startKey, 0);

  while (unvisited.size) {
    let current = null;
    let currentDistance = Infinity;
    for (const key of unvisited) {
      if (distances.get(key) < currentDistance) {
        current = key;
        currentDistance = distances.get(key);
      }
    }
    if (!current || current === goalKey) break;
    unvisited.delete(current);

    for (const edge of GRAPH[current]) {
      if (!unvisited.has(edge.to)) continue;
      if (edge.kind === 'stairs' && state.stepFree) continue;
      if (edge.kind === 'lift' && !state.liftOperational) continue;

      const extra = edge.kind === 'walk' ? edge.meters : edge.weight;
      const nextDistance = currentDistance + extra;
      if (nextDistance < distances.get(edge.to)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, current);
        previousEdge.set(edge.to, edge);
      }
    }
  }

  if (!Number.isFinite(distances.get(goalKey))) return null;

  const nodePath = [];
  const edgePath = [];
  let cursor = goalKey;
  nodePath.unshift(NODES[cursor]);
  while (cursor !== startKey) {
    const edge = previousEdge.get(cursor);
    const prior = previous.get(cursor);
    if (!edge || !prior) return null;
    edgePath.unshift(edge);
    nodePath.unshift(NODES[prior]);
    cursor = prior;
  }

  const floors = [...new Set(nodePath.map((node) => node.floor))].sort((a, b) => a - b);
  const modes = [...new Set(edgePath.filter((edge) => edge.kind !== 'walk').map((edge) => edge.kind))];
  const meters = Math.round(edgePath.reduce((sum, edge) => sum + edge.meters, 0) * 1.18);
  let minutes = meters / 72;
  if (modes.includes('stairs')) minutes += 0.3;
  if (modes.includes('lift')) minutes += 1.1;
  minutes = Math.max(1, Math.round(minutes));

  return {
    start,
    destination,
    nodes: nodePath,
    edges: edgePath,
    floors,
    modes,
    meters,
    minutes,
    startKey,
    goalKey
  };
}

const COMPASS = [
  'north', 'north-east', 'east', 'south-east',
  'south', 'south-west', 'west', 'north-west'
];

function headingBetween(a, b) {
  const raw = Math.atan2(b.x - a.x, -(b.z - a.z)) * (180 / Math.PI);
  const deg = (raw + 360) % 360;
  const index = Math.round(deg / 45) % 8;
  return { deg, name: COMPASS[index] };
}

function turnBetween(first, second) {
  let delta = ((second.deg - first.deg + 540) % 360) - 180;
  if (delta > 26) return { direction: 'right', delta };
  if (delta < -26) return { direction: 'left', delta };
  return { direction: 'straight', delta };
}

function destinationForNode(node) {
  return DESTINATIONS.find((item) => item.node === node.id) || null;
}

const DESTINATIONS_WITHOUT_ARTICLE = new Set(['meetingA', 'meetingB', 'study']);

function destinationPhrase(destination) {
  if (!destination) return '';
  return DESTINATIONS_WITHOUT_ARTICLE.has(destination.id)
    ? destination.name
    : `the ${destination.name}`;
}

function roomPhraseForNode(node) {
  const destination = destinationForNode(node);
  return destination ? destinationPhrase(destination) : node.name;
}

function movementAreaLabel(node) {
  if (!node) return 'corridor';
  if (node.type === 'corridor') return node.name;
  if (node.type === 'core') return node.floor === 2 ? 'upper landing' : 'stair and lift core';
  if (node.type === 'stairs') return node.floor === 2 ? 'upper landing' : 'stair core';
  if (node.type === 'lift') return 'lift lobby';
  if (node.type === 'door') return 'doorway';
  if (node.floor === 2) return 'upper gallery';
  return 'main lobby';
}

function appendHelpDeskHint(sectionNodes, startDestination, destination) {
  return sectionNodes.some((node) => node.id === 'f1:lobby_help') && startDestination.id !== 'help' && destination.id !== 'help';
}

function buildFloorWalkStep(nodes, afterMode, startDestination, destination) {
  if (nodes.length < 2) return null;
  const points = nodes.map((node) => ({ x: node.x, z: node.z, node }));
  const startNode = nodes[0];
  const endNode = nodes[nodes.length - 1];
  const events = [];
  let previousHeading = headingBetween(points[0], points[1]);

  for (let index = 1; index < points.length - 1; index += 1) {
    const nextHeading = headingBetween(points[index], points[index + 1]);
    const turn = turnBetween(previousHeading, nextHeading);
    const node = points[index].node;
    const distanceFromStart = Math.hypot(points[index].x - points[0].x, points[index].z - points[0].z);
    const transitionalManeuver = afterMode && distanceFromStart < 3.2 && Math.abs(turn.delta) <= 82;
    const doorwayManeuver = node.type === 'door' && Math.abs(turn.delta) <= 80;
    if (turn.direction !== 'straight' && !transitionalManeuver && !doorwayManeuver) {
      events.push({ index, turn, heading: nextHeading, node });
    }
    previousHeading = nextHeading;
  }

  const firstHeading = headingBetween(points[0], points[events[0]?.index ?? points.length - 1]);
  const corridorNode = nodes.find((node) => node.type === 'corridor');
  const movementArea = corridorNode ? corridorNode.name : (startNode.floor === 2 ? 'upper gallery' : 'central lobby');
  let text = '';

  if (afterMode === 'stairs') {
    text = `Leave the stairwell and head <strong>${firstHeading.name}</strong> along the ${movementArea}.`;
  } else if (afterMode === 'lift') {
    text = `Exit the lift and head <strong>${firstHeading.name}</strong> along the ${movementArea}.`;
  } else if (startNode.type === 'room') {
    text = `Leave <strong>${roomPhraseForNode(startNode)}</strong> through its doorway and head <strong>${firstHeading.name}</strong>.`;
  } else if (startNode.type === 'desk') {
    text = `Leave the Help Desk and head <strong>${firstHeading.name}</strong> into the main lobby.`;
  } else if (startNode.id === 'f1:entrance') {
    text = `Head <strong>${firstHeading.name}</strong> through the entrance lobby.`;
  } else {
    text = `Head <strong>${firstHeading.name}</strong> along the ${movementAreaLabel(startNode)}.`;
  }

  if (appendHelpDeskHint(nodes, startDestination, destination)) {
    text += ' Continue past the help desk.';
  }

  if (endNode.type === 'lift') {
    const towardLift = events[0];
    if (towardLift) {
      text += ` Turn <strong>${towardLift.turn.direction}</strong> at the ${movementAreaLabel(towardLift.node)} and continue to the lift.`;
    } else {
      text += ' Continue to the lift.';
    }
  } else {
    events.slice(0, 3).forEach((event) => {
      const area = movementAreaLabel(event.node);
      if (event.node.type === 'door') {
        text += ` Pass through the ${event.node.name} and head ${event.heading.name}.`;
      } else {
        text += ` Turn <strong>${event.turn.direction}</strong> and head ${event.heading.name} along the ${area}.`;
      }
    });

    if (endNode.type === 'stairs' && destination.node !== endNode.id) {
      text += ' Continue to the stairs.';
    } else if (endNode.floor === 1 && endNode.id === 'f1:help' && destination.id === 'help') {
      text += ' The desk is directly ahead.';
    }
  }

  return {
    text,
    floor: startNode.floor,
    icon: afterMode === 'stairs' ? 'stairs' : afterMode === 'lift' ? 'lift' : null
  };
}

function buildDirections(route) {
  if (!route) return [];
  if (route.nodes.length === 1) {
    return [{
      text: `You're already at <strong>${destinationPhrase(route.destination)}</strong>.`,
      floor: route.destination.floor,
      icon: 'arrive'
    }];
  }

  const steps = [{
    text: route.start.id === 'entrance'
      ? 'Start at the <strong>Main Entrance</strong>.'
      : `Start at <strong>${destinationPhrase(route.start)}</strong>.`,
    floor: route.start.floor,
    icon: 'start'
  }];

  let section = [route.nodes[0]];
  let afterMode = null;

  for (const edge of route.edges) {
    if (edge.kind === 'walk') {
      section.push(NODES[edge.to]);
      continue;
    }

    const walkStep = buildFloorWalkStep(section, afterMode, route.start, route.destination);
    if (walkStep) steps.push(walkStep);

    const fromNode = NODES[edge.from];
    const toNode = NODES[edge.to];
    const directionWord = toNode.floor > fromNode.floor ? 'up' : 'down';
    const isStairs = edge.kind === 'stairs';
    steps.push({
      text: isStairs
        ? `Take the <strong>stairs ${directionWord}</strong> to <strong>Level ${toNode.floor}</strong>.`
        : `Take the <strong>lift ${directionWord}</strong> to <strong>Level ${toNode.floor}</strong>.`,
      floor: fromNode.floor,
      targetFloor: toNode.floor,
      icon: edge.kind,
      transition: true
    });
    section = [toNode];
    afterMode = edge.kind;
  }

  const finalWalkStep = buildFloorWalkStep(section, afterMode, route.start, route.destination);
  if (finalWalkStep) steps.push(finalWalkStep);

  if (route.destination.kind === 'entrance') {
    steps.push({
      text: 'You have arrived back at the <strong>Main Entrance</strong>.',
      floor: route.destination.floor,
      icon: 'arrive'
    });
  } else if (route.destination.roomId) {
    steps.push({
      text: `Enter <strong>${destinationPhrase(route.destination)}</strong> through its doorway and you've arrived.`,
      floor: route.destination.floor,
      icon: 'arrive'
    });
  } else {
    steps.push({
      text: `Arrive at the <strong>${route.destination.name}</strong>.`,
      floor: route.destination.floor,
      icon: 'arrive'
    });
  }

  return steps;
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                 */
/* -------------------------------------------------------------------------- */

const el = {
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  searchResults: document.getElementById('searchResults'),
  startSelect: document.getElementById('startSelect'),
  stepFreeToggle: document.getElementById('stepFreeToggle'),
  accessCard: document.querySelector('.access-card'),
  routePanel: document.getElementById('routePanel'),
  levelKicker: document.getElementById('levelKicker'),
  levelName: document.getElementById('levelName'),
  floorButtons: [...document.querySelectorAll('.floor-button')],
  routeContinues: document.getElementById('routeContinues'),
  routeContinuesText: document.getElementById('routeContinuesText'),
  routeContinuesButton: document.getElementById('routeContinuesButton'),
  staffButton: document.getElementById('staffButton'),
  staffModal: document.getElementById('staffModal'),
  staffClose: document.getElementById('staffClose'),
  staffDone: document.getElementById('staffDone'),
  liftOutageToggle: document.getElementById('liftOutageToggle'),
  modalLiftState: document.getElementById('modalLiftState'),
  modalStatusDot: document.getElementById('modalStatusDot'),
  staffNote: document.getElementById('staffNote'),
  liftStatus: document.getElementById('liftStatus'),
  liftStatusText: document.getElementById('liftStatusText'),
  mapToast: document.getElementById('mapToast'),
  mapHint: document.getElementById('mapHint'),
  sceneLoading: document.getElementById('sceneLoading'),
  resetView: document.getElementById('resetView'),
  sidebarScroll: document.querySelector('.sidebar-scroll'),
  staffStatusRow: document.querySelector('.staff-status-row'),
  compassNeedle: document.getElementById('compassNeedle')
};

const ICONS = {
  entrance: '<svg viewBox="0 0 24 24"><path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4H17v16"/><path d="M3.5 20h17M9.5 20v-6h4v6M9 9h1.5M13.5 9H15"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.2a2.4 2.4 0 1 1 3.7 2c-.9.6-1.4 1-1.4 2.1"/><path d="M12 16.8h.01"/></svg>',
  children: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M8.4 9.4h.01M15.6 9.4h.01M8.6 14c.8.9 1.9 1.4 3.4 1.4s2.6-.5 3.4-1.4"/></svg>',
  books: '<svg viewBox="0 0 24 24"><path d="M4 5.3c2.5-.7 5 .1 7 1.8v12c-2-1.7-4.5-2.5-7-1.8v-12ZM20 5.3c-2.5-.7-5 .1-7 1.8v12c2-1.7 4.5-2.5 7-1.8v-12Z"/></svg>',
  toilets: '<svg viewBox="0 0 24 24"><circle cx="8" cy="4.8" r="1.7"/><path d="M6 8h4l1 5H5l1-5ZM8 13v6M6 19h4M16 4.8a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4ZM16 8v5h2.5l-1 6M14 8h4"/></svg>',
  meeting: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M8 16v3M16 16v3M4 10h16"/></svg>',
  reading: '<svg viewBox="0 0 24 24"><path d="M4 6.2c2.4-.8 4.9-.1 6.8 1.6v10.5c-1.9-1.7-4.4-2.4-6.8-1.6V6.2ZM20 6.2c-2.4-.8-4.9-.1-6.8 1.6v10.5c1.9-1.7 4.4-2.4 6.8-1.6V6.2Z"/><path d="M7 9.2h1.6M15.4 9.2H17"/></svg>',
  study: '<svg viewBox="0 0 24 24"><path d="M4 18h16M6 18V9h12v9M9 9V5.5h6V9M8.5 12h1M14.5 12h1"/></svg>',
  stairs: '<svg viewBox="0 0 24 24"><path d="M3.5 19.5h4v-4h4v-4h4v-4h5"/><path d="m17.5 4.5 3 3-3 3"/></svg>',
  lift: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M12 3.5v17M8 11.2l1-1.3 1 1.3M14 7.8l1 1.3 1-1.3"/></svg>',
  start: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/></svg>',
  arrive: '<svg viewBox="0 0 24 24"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>'
};

function iconForKind(kind) {
  return ICONS[kind] || ICONS.books;
}

function populateStartSelect() {
  el.startSelect.innerHTML = START_IDS.map((id) => {
    const item = DESTINATION_BY_ID[id];
    return `<option value="${id}"${id === state.startId ? ' selected' : ''}>${item.name} · Level ${item.floor}</option>`;
  }).join('');
}

function normalizeSearch(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchResults(query) {
  const normalized = normalizeSearch(query);
  if (!normalized) return DESTINATIONS;
  const words = normalized.split(' ');
  return DESTINATIONS.filter((item) => {
    const haystack = normalizeSearch(`${item.name} ${item.category} ${item.description}`);
    return words.every((word) => haystack.includes(word));
  });
}

function renderSearchResults(query = '') {
  const results = getSearchResults(query);
  el.searchClear.hidden = !query;
  if (!state.searchOpen) {
    el.searchResults.hidden = true;
    return;
  }

  if (!results.length) {
    el.searchResults.innerHTML = '<div class="search-empty">No matching room found.<br>Try “reading”, “toilets” or “meeting”.</div>';
  } else {
    el.searchResults.innerHTML = results.map((item) => `
      <button class="search-result" type="button" role="option" data-destination="${item.id}">
        <span class="result-icon">${iconForKind(item.kind)}</span>
        <span class="result-copy">
          <strong>${item.name}</strong>
          <small>${item.category} · ${item.description}</small>
        </span>
        <span class="result-level">L${item.floor}</span>
      </button>
    `).join('');
  }
  el.searchResults.hidden = false;
}

function closeSearch() {
  state.searchOpen = false;
  el.searchResults.hidden = true;
}

function setSearchOpen(open) {
  state.searchOpen = open;
  renderSearchResults(el.searchInput.value);
}

function selectDestination(id, options = {}) {
  const destination = DESTINATION_BY_ID[id];
  if (!destination) return;
  state.destinationId = id;
  closeSearch();
  el.searchInput.value = '';
  el.searchClear.hidden = true;

  if (options.focusFloor) {
    state.activeFloor = destination.floor;
  }

  updateRoute({ announce: true, source: 'destination' });
  if (window.innerWidth <= 780) {
    el.sidebarScroll.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function setStepFree(enabled, options = {}) {
  state.stepFree = Boolean(enabled);
  el.stepFreeToggle.checked = state.stepFree;
  el.accessCard.classList.toggle('is-on', state.stepFree);
  updateRoute({ announce: Boolean(options.announce), source: 'accessibility' });
}

function renderRoutePanel() {
  const destination = state.destinationId ? DESTINATION_BY_ID[state.destinationId] : null;
  if (!destination) {
    el.routePanel.innerHTML = `
      <div class="empty-route">
        Choose a destination to see a route from your starting point.
      </div>
    `;
    return;
  }

  const route = state.currentRoute;
  if (!route) {
    const crossFloor = DESTINATION_BY_ID[state.startId].floor !== destination.floor;
    const liftProblem = state.stepFree && !state.liftOperational && crossFloor;
    if (liftProblem) {
      el.routePanel.innerHTML = `
        <div class="no-route-card">
          <span class="no-route-icon">
            <svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M12 3.5v17M8 11.2l1-1.3 1 1.3M14 7.8l1 1.3 1-1.3M4 4l16 16"/></svg>
          </span>
          <h2>No step-free route</h2>
          <p>The lift is currently out of service, so a step-free route to <strong>${destination.name}</strong> is not available. Ask library staff for assistance.</p>
          <div class="no-route-actions">
            <button class="primary-small" type="button" data-action="show-stairs">Show stair route</button>
            <button class="secondary-small" type="button" data-action="focus-start">Change start</button>
          </div>
        </div>
      `;
    } else {
      el.routePanel.innerHTML = `
        <div class="no-route-card">
          <h2>Route unavailable</h2>
          <p>We could not find a route between these two points. Please ask at the help desk.</p>
        </div>
      `;
    }
    return;
  }

  const directions = state.currentDirections;
  const modeLabel = route.modes.includes('lift')
    ? 'Step-free · lift'
    : route.modes.includes('stairs')
      ? 'Via stairs'
      : 'Same-floor route';
  const modeClass = route.modes.includes('lift') ? 'lift' : route.modes.includes('stairs') ? 'stairs' : 'same-floor';
  const modeIcon = route.modes.includes('lift') ? ICONS.lift : route.modes.includes('stairs') ? ICONS.stairs : ICONS.entrance;
  const floorsLabel = route.floors.length > 1 ? `${route.floors.length} floors` : `Level ${route.destination.floor}`;

  const directionSteps = directions.map((step, index) => {
    const icon = step.icon && ['stairs', 'lift'].includes(step.icon) ? iconForKind(step.icon) : index + 1;
    return `
      <li class="direction-step${step.transition ? ' is-transition' : ''}">
        <span class="step-number">${icon}</span>
        <span class="step-copy">${step.text}<span class="step-floor">L${step.floor}</span></span>
      </li>
    `;
  }).join('');

  el.routePanel.innerHTML = `
    <div class="route-card">
      <div class="route-head">
        <div class="route-title-wrap">
          <div class="route-type">Your route</div>
          <h2>${destination.name}</h2>
          <p class="route-from">From ${route.start.name} · Level ${route.start.floor}</p>
        </div>
        <button class="clear-route" type="button" data-action="clear" aria-label="Clear route">
          <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>
        </button>
      </div>
      <div class="route-meta">
        <span class="meta-pill">${route.minutes} min</span>
        <span class="meta-pill">${route.meters} m</span>
        <span class="meta-pill">${floorsLabel}</span>
        <span class="meta-pill route-mode ${modeClass}">${modeIcon}${modeLabel}</span>
      </div>
      <div class="directions-head">
        <span>Directions</span>
        <span class="directions-count">${directions.length} steps</span>
      </div>
      <ol class="directions">${directionSteps}</ol>
    </div>
  `;
}

function updateFloorChrome() {
  const info = FLOOR_INFO[state.activeFloor];
  el.levelKicker.textContent = info.level;
  el.levelName.textContent = info.name;
  el.floorButtons.forEach((button) => {
    const active = Number(button.dataset.floor) === state.activeFloor;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (!state.currentRoute) {
    el.routeContinues.hidden = true;
    return;
  }

  const route = state.currentRoute;
  const otherFloor = route.floors.find((floor) => floor !== state.activeFloor);
  if (!otherFloor) {
    el.routeContinues.hidden = true;
    return;
  }

  el.routeContinues.hidden = false;
  if (state.activeFloor < otherFloor) {
    el.routeContinuesText.textContent = 'Route continues on the upper level';
  } else {
    el.routeContinuesText.textContent = 'Route starts on the ground level';
  }
  el.routeContinuesButton.textContent = `View Level ${otherFloor}`;
  el.routeContinuesButton.dataset.targetFloor = String(otherFloor);
}

function updateFloorRouteDots() {
  const routeFloors = new Set(state.currentRoute ? state.currentRoute.floors : []);
  el.floorButtons.forEach((button) => {
    const dot = button.querySelector('.floor-route-dot');
    dot.hidden = !routeFloors.has(Number(button.dataset.floor));
  });
}

function setActiveFloor(floor, options = {}) {
  const next = Number(floor);
  if (!FLOOR_INFO[next] || state.activeFloor === next) {
    updateFloorChrome();
    return;
  }
  state.activeFloor = next;
  if (window.sceneApi) window.sceneApi.showFloor(next);
  updateFloorChrome();
  if (options.announce) showToast(`Viewing ${FLOOR_INFO[next].level}`, 1700);
}

let toastTimer = null;
function showToast(message, duration = 2600) {
  window.clearTimeout(toastTimer);
  el.mapToast.textContent = message;
  el.mapToast.hidden = false;
  toastTimer = window.setTimeout(() => {
    el.mapToast.hidden = true;
  }, duration);
}

function updateLiftChrome() {
  const out = !state.liftOperational;
  el.liftStatus.classList.toggle('is-out', out);
  el.liftStatusText.textContent = out ? 'Lift out of service' : 'Lift in service';
  el.modalLiftState.textContent = out ? 'Out of service' : 'Operational';
  el.staffStatusRow.classList.toggle('is-out', out);
  el.liftOutageToggle.checked = out;
  el.staffNote.textContent = out
    ? 'Stair routes remain available. Visitors requesting step-free access between floors will be told that no route is currently available.'
    : 'Visitors will still be offered the shortest stair route when step-free access is not requested.';
}

function updateRoute(options = {}) {
  const destination = state.destinationId ? DESTINATION_BY_ID[state.destinationId] : null;
  if (!destination) {
    state.currentRoute = null;
    state.currentDirections = [];
    renderRoutePanel();
    updateFloorRouteDots();
    updateFloorChrome();
    if (window.sceneApi) {
      window.sceneApi.clearRoute();
      window.sceneApi.setSelection({ startId: state.startId, destinationId: null });
    }
    return;
  }

  const route = findRoute(state.startId, state.destinationId);
  state.currentRoute = route;
  state.currentDirections = route ? buildDirections(route) : [];
  renderRoutePanel();
  updateFloorRouteDots();

  if (route) {
    if (!route.floors.includes(state.activeFloor)) {
      state.activeFloor = route.floors[0];
      if (window.sceneApi) window.sceneApi.showFloor(state.activeFloor);
    }
    if (window.sceneApi) window.sceneApi.setRoute(route, state.currentDirections);
    if (options.announce) {
      if (route.modes.includes('lift')) {
        showToast(`Step-free route ready · lift to Level ${route.destination.floor}`, 2500);
      } else if (route.modes.includes('stairs')) {
        showToast(`Route ready · stairs to Level ${route.destination.floor}`, 2300);
      } else {
        showToast('Route ready', 1800);
      }
    }
  } else {
    if (window.sceneApi) window.sceneApi.setRoute(null, []);
    if (options.announce) {
      if (state.stepFree && !state.liftOperational) {
        showToast('No step-free route is available while the lift is out of service.', 3400);
      } else {
        showToast('No route is currently available.', 2800);
      }
    }
  }

  updateFloorChrome();
  if (window.sceneApi) {
    window.sceneApi.setSelection({
      startId: state.startId,
      destinationId: state.destinationId,
      startFloor: DESTINATION_BY_ID[state.startId].floor,
      destinationFloor: destination.floor
    });
  }
}

function setLiftOperational(operational, options = {}) {
  const changed = state.liftOperational !== operational;
  state.liftOperational = operational;
  updateLiftChrome();
  if (!changed) return;

  updateRoute({
    announce: false,
    source: 'lift'
  });

  if (options.announce !== false) {
    if (!operational) {
      if (state.stepFree && state.startId !== state.destinationId) {
        showToast('Lift out of service. Step-free routes have been updated.', 3400);
      } else {
        showToast('Lift marked out of service. Routes updated.', 3000);
      }
    } else {
      showToast('Lift is back in service. Step-free routes restored.', 3000);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Three.js building model                                                    */
/* -------------------------------------------------------------------------- */

const sceneMount = document.getElementById('sceneMount');
const labelMount = document.getElementById('labelMount');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x09242a, 34, 66);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Interactive 3D floor plan. Drag to rotate and tap a room to select it.');
renderer.domElement.setAttribute('role', 'img');
sceneMount.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelMount.appendChild(labelRenderer.domElement);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 140);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minDistance = 20;
controls.maxDistance = 48;
controls.minPolarAngle = 0.52;
controls.maxPolarAngle = Math.PI * 0.465;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.65;
controls.target.set(0, 0.15, 0);

const CAMERA_DIRECTION = new THREE.Vector3(0.78, 1.03, 1.0).normalize();
let defaultCameraPosition = new THREE.Vector3();
let cameraTween = null;

function calculateDefaultCamera() {
  const aspect = Math.max(0.65, camera.aspect || 1);
  const mobile = window.innerWidth <= 780;
  const fitFactor = mobile ? 43.5 : 39;
  const distance = THREE.MathUtils.clamp(fitFactor / aspect, mobile ? 32 : 29, 50);
  return CAMERA_DIRECTION.clone().multiplyScalar(distance).add(new THREE.Vector3(0, 0.35, 0.1));
}

function applyCameraDefaults(animate = false) {
  defaultCameraPosition = calculateDefaultCamera();
  if (animate) {
    cameraTween = {
      started: performance.now(),
      duration: 620,
      fromPosition: camera.position.clone(),
      toPosition: defaultCameraPosition.clone(),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0.15, 0)
    };
  } else {
    camera.position.copy(defaultCameraPosition);
    controls.target.set(0, 0.15, 0);
    camera.lookAt(controls.target);
    controls.update();
  }
}

/* Lighting */

const hemisphere = new THREE.HemisphereLight(0xfff0d6, 0x163e42, 2.05);
scene.add(hemisphere);

const keyLight = new THREE.DirectionalLight(0xffdfb3, 3.1);
keyLight.position.set(12, 18, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -16;
keyLight.shadow.camera.right = 16;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 55;
keyLight.shadow.bias = -0.00045;
keyLight.shadow.radius = 5;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x79b9bb, 1.55);
fillLight.position.set(-13, 9, -12);
scene.add(fillLight);

const warmRim = new THREE.PointLight(0xffb76a, 14, 30, 2);
warmRim.position.set(2, 8, -13);
scene.add(warmRim);

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 10, 256, 256, 250);
  gradient.addColorStop(0, 'rgba(75, 144, 135, 0.36)');
  gradient.addColorStop(0.42, 'rgba(37, 103, 101, 0.19)');
  gradient.addColorStop(1, 'rgba(10, 42, 47, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const glowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(51, 37),
  new THREE.MeshBasicMaterial({
    map: makeGlowTexture(),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
glowPlane.rotation.x = -Math.PI / 2;
glowPlane.position.y = -0.35;
scene.add(glowPlane);

const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 32),
  new THREE.ShadowMaterial({ color: 0x001013, opacity: 0.3 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = -0.27;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

/* Materials */

const MATERIALS = {
  base: new THREE.MeshStandardMaterial({ color: 0xe4dac7, roughness: 0.91, metalness: 0.01 }),
  plinth: new THREE.MeshStandardMaterial({ color: 0x18393b, roughness: 0.82 }),
  corridor: new THREE.MeshStandardMaterial({ color: 0xece4d5, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf2eadc, roughness: 0.82 }),
  wallCap: new THREE.MeshStandardMaterial({ color: 0xfff8eb, roughness: 0.76 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x815d3f, roughness: 0.74 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xac7c4e, roughness: 0.72 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4b3a2d, roughness: 0.76 }),
  door: new THREE.MeshStandardMaterial({ color: 0x9a693d, roughness: 0.7 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9ba6a2, roughness: 0.35, metalness: 0.72 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x314d4e, roughness: 0.38, metalness: 0.58 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9ed1d1, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false }),
  white: new THREE.MeshStandardMaterial({ color: 0xf6f3e9, roughness: 0.65 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x163f43, roughness: 0.35, metalness: 0.25 }),
  terracotta: new THREE.MeshStandardMaterial({ color: 0xbb6b4b, roughness: 0.8 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4d7e5e, roughness: 0.85 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x74a374, roughness: 0.86 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xf0eee5, roughness: 0.42 }),
  fabricTeal: new THREE.MeshStandardMaterial({ color: 0x487f7b, roughness: 0.95 }),
  fabricGold: new THREE.MeshStandardMaterial({ color: 0xb98955, roughness: 0.95 }),
  fabricCoral: new THREE.MeshStandardMaterial({ color: 0xc8795d, roughness: 0.96 }),
  fabricBlue: new THREE.MeshStandardMaterial({ color: 0x6c8d9b, roughness: 0.94 })
};

const BOOK_MATERIALS = [
  new THREE.MeshStandardMaterial({ color: 0xa84f3f, roughness: 0.83 }),
  new THREE.MeshStandardMaterial({ color: 0xd29a4c, roughness: 0.83 }),
  new THREE.MeshStandardMaterial({ color: 0x4d7f78, roughness: 0.83 }),
  new THREE.MeshStandardMaterial({ color: 0x476179, roughness: 0.83 }),
  new THREE.MeshStandardMaterial({ color: 0x8f6f4a, roughness: 0.83 }),
  new THREE.MeshStandardMaterial({ color: 0xc7b57c, roughness: 0.83 })
];

const FLOOR_TOP = 0.16;
const PAD_Y = 0.19;
const ROUTE_Y = 0.63;
const WALL_HEIGHT = 0.72;
const WALL_THICKNESS = 0.12;

const building = new THREE.Group();
building.position.y = -0.04;
scene.add(building);

const floorGroups = {};
const floorVisuals = {};
const pickablesByFloor = { 1: [], 2: [] };
const labelsByFloor = { 1: [], 2: [] };
const roomMaterials = {};
const roomLabelButtons = new Map();
const routeGroups = { 1: null, 2: null };
const routeBeads = [];
const routeTransitions = [];
const markerGroups = { 1: null, 2: null };
const markerRings = [];

function markShadows(object, receive = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = receive;
    }
  });
  return object;
}

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function roundedBox(width, height, depth, radius, material, x = 0, y = 0, z = 0) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function addRug(parent, x, z, width, depth, color, rotation = 0) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.98 });
  const rug = roundedBox(width, 0.025, depth, 0.08, material, x, PAD_Y + 0.027, z);
  rug.rotation.y = rotation;
  rug.receiveShadow = true;
  parent.add(rug);
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.14, depth - 0.14),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26 })
  );
  border.rotation.x = -Math.PI / 2;
  border.rotation.z = rotation;
  border.position.set(x, PAD_Y + 0.045, z);
  parent.add(border);
}

function pseudoRandom(seed) {
  const x = Math.sin(seed * 91.733 + 17.13) * 43758.5453;
  return x - Math.floor(x);
}

function addBookshelf(parent, x, z, width, depth, rotation = 0, height = 0.92, seed = 1) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  group.rotation.y = rotation;

  const back = box(width, height, 0.06, MATERIALS.woodDark, 0, height / 2, -depth / 2 + 0.03);
  group.add(back);
  const left = box(0.055, height, depth, MATERIALS.wood, -width / 2 + 0.028, height / 2, 0);
  const right = box(0.055, height, depth, MATERIALS.wood, width / 2 - 0.028, height / 2, 0);
  group.add(left, right);

  const levels = 3;
  for (let level = 0; level < levels; level += 1) {
    const shelfY = 0.22 + level * 0.24;
    group.add(box(width - 0.06, 0.035, depth - 0.02, MATERIALS.wood, 0, shelfY, 0));
    const bookCount = 5;
    let cursor = -width / 2 + 0.13;
    for (let index = 0; index < bookCount; index += 1) {
      const random = pseudoRandom(seed * 19 + level * 11 + index);
      const bookWidth = 0.075 + random * 0.055;
      const bookHeight = 0.13 + pseudoRandom(seed * 5 + level * 7 + index) * 0.06;
      if (cursor + bookWidth > width / 2 - 0.08) break;
      const book = box(
        bookWidth,
        bookHeight,
        0.16 + random * 0.055,
        BOOK_MATERIALS[Math.floor(random * BOOK_MATERIALS.length)],
        cursor + bookWidth / 2,
        shelfY + 0.02 + bookHeight / 2,
        0.005
      );
      group.add(book);
      cursor += bookWidth + 0.025;
    }
  }

  markShadows(group);
  parent.add(group);
  return group;
}

function addChair(parent, x, z, rotation = 0, material = MATERIALS.fabricTeal, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  group.add(box(0.42, 0.07, 0.42, material, 0, 0.36, 0));
  group.add(box(0.42, 0.52, 0.07, material, 0, 0.59, -0.18));
  const legPositions = [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]];
  for (const [legX, legZ] of legPositions) {
    group.add(box(0.035, 0.35, 0.035, MATERIALS.darkMetal, legX, 0.18, legZ));
  }
  markShadows(group);
  parent.add(group);
  return group;
}

function addStool(parent, x, z, material = MATERIALS.fabricGold) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 18), material));
  group.children[0].position.y = 0.45;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 10), MATERIALS.darkMetal);
  stem.position.y = 0.24;
  group.add(stem);
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), MATERIALS.darkMetal));
  group.children[2].position.y = 0.025;
  markShadows(group);
  parent.add(group);
}

function addRoundTable(parent, x, z, radius = 0.62, material = MATERIALS.woodLight) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.075, 28), material);
  top.position.y = 0.7;
  group.add(top);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.65, 10), MATERIALS.darkMetal);
  stem.position.y = 0.37;
  group.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.43, radius * 0.48, 0.055, 20), MATERIALS.darkMetal);
  base.position.y = 0.045;
  group.add(base);
  markShadows(group);
  parent.add(group);
  return group;
}

function addMeetingFurniture(parent, room) {
  const centerX = room.x1 + (room.x2 - room.x1) * 0.64;
  const centerZ = room.z1 + (room.z2 - room.z1) * 0.52;
  const top = roundedBox(2.45, 0.11, 1.1, 0.07, MATERIALS.woodLight, centerX, PAD_Y + 0.7, centerZ);
  parent.add(top);
  for (const offsetX of [-0.9, 0, 0.9]) {
    parent.add(box(0.06, 0.68, 0.06, MATERIALS.darkMetal, centerX + offsetX, PAD_Y + 0.36, centerZ - 0.42));
    parent.add(box(0.06, 0.68, 0.06, MATERIALS.darkMetal, centerX + offsetX, PAD_Y + 0.36, centerZ + 0.42));
  }
  for (const offsetX of [-0.75, 0, 0.75]) {
    addChair(parent, centerX + offsetX, centerZ - 0.92, 0, MATERIALS.fabricGold, 0.92);
    addChair(parent, centerX + offsetX, centerZ + 0.92, Math.PI, MATERIALS.fabricGold, 0.92);
  }
  const screen = box(1.55, 0.83, 0.055, MATERIALS.screen, centerX, PAD_Y + 0.83, room.z1 + 0.2);
  screen.castShadow = true;
  parent.add(screen);
  parent.add(box(1.67, 1.0, 0.075, MATERIALS.darkMetal, centerX, PAD_Y + 0.45, room.z1 + 0.15));
  addPlant(parent, room.x2 - 0.65, room.z2 - 0.75, 0.65);
}

function addReadingFurniture(parent, room) {
  addRug(parent, room.x1 + 2.95, room.z1 + 2.6, 4.2, 3.0, 0x6c8b68, 0);
  addRoundTable(parent, room.x1 + 2.15, room.z1 + 2.3, 0.63, MATERIALS.woodLight);
  addRoundTable(parent, room.x1 + 4.25, room.z1 + 3.3, 0.56, MATERIALS.woodLight);
  addChair(parent, room.x1 + 1.25, room.z1 + 2.3, Math.PI / 2, MATERIALS.fabricTeal, 0.85);
  addChair(parent, room.x1 + 3.05, room.z1 + 2.3, -Math.PI / 2, MATERIALS.fabricTeal, 0.85);
  addChair(parent, room.x1 + 4.25, room.z1 + 2.32, 0, MATERIALS.fabricCoral, 0.85);
  addChair(parent, room.x1 + 4.25, room.z1 + 4.28, Math.PI, MATERIALS.fabricCoral, 0.85);
  addBookshelf(parent, room.x1 + 2.5, room.z1 + 0.4, 3.7, 0.55, 0, 1.05, 7);
  addBookshelf(parent, room.x2 - 0.5, room.z1 + 2.2, 0.5, 3.0, Math.PI / 2, 1.02, 9);
  addPlant(parent, room.x1 + 0.6, room.z2 - 0.75, 0.8);
  const armchair = new THREE.Group();
  armchair.position.set(room.x1 + 1.1, PAD_Y, room.z2 - 0.75);
  armchair.rotation.y = Math.PI * 0.34;
  armchair.add(box(0.8, 0.18, 0.74, MATERIALS.fabricCoral, 0, 0.35, 0));
  armchair.add(box(0.8, 0.62, 0.16, MATERIALS.fabricCoral, 0, 0.6, -0.3));
  armchair.add(box(0.15, 0.45, 0.72, MATERIALS.fabricCoral, -0.36, 0.47, 0));
  armchair.add(box(0.15, 0.45, 0.72, MATERIALS.fabricCoral, 0.36, 0.47, 0));
  markShadows(armchair);
  parent.add(armchair);
}

function addChildrenFurniture(parent, room) {
  addRug(parent, room.x1 + 3.3, room.z1 + 2.7, 4.0, 3.0, 0xefb794, 0.04);
  addBookshelf(parent, room.x1 + 2.9, room.z1 + 0.4, 3.9, 0.55, 0, 0.72, 2);
  addBookshelf(parent, room.x1 + 0.45, room.z1 + 2.5, 2.8, 0.5, Math.PI / 2, 0.64, 3);
  const beanbagMaterial = new THREE.MeshStandardMaterial({ color: 0xe0a16f, roughness: 0.98 });
  const beanbag = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), beanbagMaterial);
  beanbag.scale.set(1.2, 0.6, 1);
  beanbag.position.set(room.x1 + 2.2, PAD_Y + 0.26, room.z2 - 1.2);
  beanbag.castShadow = true;
  parent.add(beanbag);
  const beanbag2 = beanbag.clone();
  beanbag2.material = new THREE.MeshStandardMaterial({ color: 0x6da39c, roughness: 0.98 });
  beanbag2.position.set(room.x1 + 3.8, PAD_Y + 0.26, room.z2 - 1.05);
  parent.add(beanbag2);
  const playTable = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 20), MATERIALS.woodLight);
  playTable.position.set(room.x1 + 3.3, PAD_Y + 0.42, room.z1 + 2.65);
  playTable.castShadow = true;
  parent.add(playTable);
  for (let index = 0; index < 4; index += 1) {
    const block = box(0.22, 0.22, 0.22, BOOK_MATERIALS[index], room.x1 + 2.8 + index * 0.35, PAD_Y + 0.65, room.z1 + 2.4);
    block.rotation.y = index * 0.45;
    parent.add(block);
  }
  addPlant(parent, room.x1 + 0.55, room.z2 - 0.65, 0.72);
}

function addBooksFurniture(parent, room) {
  addBookshelf(parent, room.x1 + 2.7, room.z1 + 1.0, 4.6, 0.58, 0, 1.08, 12);
  addBookshelf(parent, room.x1 + 2.7, room.z1 + 2.55, 4.6, 0.58, 0, 1.08, 14);
  addBookshelf(parent, room.x1 + 2.7, room.z1 + 4.15, 4.6, 0.58, 0, 1.08, 16);
  addBookshelf(parent, room.x1 + 0.48, room.z1 + 3.45, 3.25, 0.55, Math.PI / 2, 1.04, 18);
  addPlant(parent, room.x1 + 0.55, room.z2 - 0.75, 0.8);
  addStool(parent, room.x1 + 4.8, room.z2 - 0.9);
}

function addStudyFurniture(parent, room) {
  addRug(parent, room.x1 + 3.2, room.z1 + 2.7, 4.3, 3.4, 0xcaa77e, 0);
  for (let index = 0; index < 3; index += 1) {
    const z = room.z1 + 1.2 + index * 1.35;
    parent.add(roundedBox(1.6, 0.08, 0.62, 0.04, MATERIALS.woodLight, room.x1 + 1.25, PAD_Y + 0.72, z));
    parent.add(box(0.07, 0.68, 0.1, MATERIALS.darkMetal, room.x1 + 0.62, PAD_Y + 0.37, z));
    parent.add(box(0.07, 0.68, 0.1, MATERIALS.darkMetal, room.x1 + 1.88, PAD_Y + 0.37, z));
    parent.add(box(0.75, 0.48, 0.055, MATERIALS.screen, room.x1 + 1.25, PAD_Y + 1.03, z - 0.17));
    addChair(parent, room.x1 + 2.35, z, Math.PI / 2, MATERIALS.fabricBlue, 0.78);
  }
  addBookshelf(parent, room.x1 + 2.6, room.z1 + 0.42, 4.4, 0.55, 0, 0.92, 21);
  const lounge = new THREE.Group();
  lounge.position.set(room.x1 + 3.8, PAD_Y, room.z2 - 1.15);
  lounge.rotation.y = -0.5;
  lounge.add(box(1.45, 0.18, 0.7, MATERIALS.fabricGold, 0, 0.35, 0));
  lounge.add(box(1.45, 0.55, 0.16, MATERIALS.fabricGold, 0, 0.56, -0.31));
  markShadows(lounge);
  parent.add(lounge);
  addPlant(parent, room.x2 - 0.65, room.z2 - 0.75, 0.78);
}

function addToiletFurniture(parent, room) {
  const stallMaterial = new THREE.MeshStandardMaterial({ color: 0xc4d3d4, roughness: 0.6 });
  for (let index = 0; index < 3; index += 1) {
    const z = room.z1 + 1.05 + index * 1.05;
    parent.add(box(1.8, 1.15, 0.06, stallMaterial, room.x1 + 2.45, PAD_Y + 0.58, z));
    parent.add(box(0.06, 1.15, 0.78, stallMaterial, room.x1 + 1.56, PAD_Y + 0.58, z + 0.4));
    parent.add(box(1.8, 0.06, 0.78, stallMaterial, room.x1 + 2.45, PAD_Y + 1.16, z + 0.4));
    const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.2, 0.42, 14), MATERIALS.ceramic);
    toilet.position.set(room.x1 + 2.7, PAD_Y + 0.23, z + 0.32);
    toilet.castShadow = true;
    parent.add(toilet);
  }
  for (let index = 0; index < 2; index += 1) {
    const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.21, 0.12, 18), MATERIALS.ceramic);
    sink.position.set(room.x1 + 3.45 + index * 1.2, PAD_Y + 0.82, room.z2 - 0.38);
    sink.castShadow = true;
    parent.add(sink);
    parent.add(box(0.08, 0.78, 0.08, MATERIALS.metal, room.x1 + 3.45 + index * 1.2, PAD_Y + 0.4, room.z2 - 0.38));
  }
  parent.add(box(3.2, 0.055, 0.48, MATERIALS.white, room.x1 + 3.9, PAD_Y + 0.67, room.z2 - 0.38));
}

function addPlant(parent, x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  group.scale.setScalar(scale);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.34, 16), MATERIALS.terracotta);
  pot.position.y = 0.17;
  pot.castShadow = true;
  group.add(pot);
  for (let index = 0; index < 5; index += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 7),
      index % 2 ? MATERIALS.leaf : MATERIALS.leafLight
    );
    const angle = (index / 5) * Math.PI * 2;
    leaf.scale.set(0.46, 1.1, 0.3);
    leaf.position.set(Math.cos(angle) * 0.2, 0.56 + (index % 2) * 0.09, Math.sin(angle) * 0.2);
    leaf.rotation.z = Math.cos(angle) * 0.55;
    leaf.rotation.x = Math.sin(angle) * 0.55;
    leaf.castShadow = true;
    group.add(leaf);
  }
  parent.add(group);
}

function addBench(parent, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, PAD_Y, z);
  group.rotation.y = rotation;
  group.add(box(1.7, 0.12, 0.48, MATERIALS.woodLight, 0, 0.42, 0));
  group.add(box(1.7, 0.42, 0.09, MATERIALS.wood, 0, 0.64, -0.2));
  group.add(box(0.08, 0.4, 0.4, MATERIALS.darkMetal, -0.62, 0.2, 0));
  group.add(box(0.08, 0.4, 0.4, MATERIALS.darkMetal, 0.62, 0.2, 0));
  markShadows(group);
  parent.add(group);
}

function addHelpDesk(parent) {
  const group = new THREE.Group();
  group.position.set(0, PAD_Y, 0);
  const deskFront = roundedBox(2.4, 0.95, 0.55, 0.05, MATERIALS.woodLight, -1.62, 0.49, 3.02);
  const deskSide = roundedBox(0.55, 0.95, 2.1, 0.05, MATERIALS.woodLight, -2.54, 0.49, 2.26);
  deskFront.castShadow = true;
  deskSide.castShadow = true;
  group.add(deskFront, deskSide);
  group.add(box(2.35, 0.06, 0.62, MATERIALS.white, -1.62, 1.0, 3.02));
  group.add(box(0.62, 0.06, 1.85, MATERIALS.white, -2.54, 1.0, 2.24));
  const monitor = box(0.52, 0.34, 0.045, MATERIALS.screen, -1.85, 1.28, 2.78);
  monitor.rotation.y = -0.2;
  group.add(monitor);
  group.add(box(0.08, 0.25, 0.08, MATERIALS.darkMetal, -1.85, 1.07, 2.82));
  const stack = [];
  for (let index = 0; index < 4; index += 1) {
    stack.push(box(0.46, 0.055, 0.28, BOOK_MATERIALS[index + 1], -0.9, 1.04 + index * 0.052, 2.98));
  }
  group.add(...stack);
  markShadows(group);
  parent.add(group);

  const hit = box(3.1, 1.25, 2.7, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), -1.65, 0.65, 2.6);
  hit.userData.destination = 'help';
  parent.add(hit);
  pickablesByFloor[1].push(hit);
}

function addEntranceDetails(parent) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x263f3d, roughness: 0.95 });
  const matMesh = roundedBox(2.6, 0.025, 1.2, 0.1, mat, 0, PAD_Y + 0.026, 5.85);
  matMesh.receiveShadow = true;
  parent.add(matMesh);
  const stripe = box(2.2, 0.012, 0.06, new THREE.MeshStandardMaterial({ color: 0xd4b887, roughness: 0.6 }), 0, PAD_Y + 0.044, 5.85);
  parent.add(stripe);
  addPlant(parent, -2.55, 6.15, 0.82);
  addPlant(parent, 2.55, 6.15, 0.82);
  addBench(parent, 2.5, 1.1, Math.PI * 0.5);
  addBench(parent, -2.45, 0.3, -Math.PI * 0.5);

  const wayfinding = new THREE.Group();
  wayfinding.position.set(2.05, PAD_Y, 5.15);
  wayfinding.add(box(0.08, 1.32, 0.08, MATERIALS.darkMetal, 0, 0.66, 0));
  const sign = box(1.25, 0.72, 0.055, MATERIALS.screen, 0, 1.4, 0);
  sign.rotation.y = 0.1;
  wayfinding.add(sign);
  wayfinding.add(box(0.75, 0.045, 0.058, MATERIALS.fabricGold, -0.1, 1.56, 0.04));
  wayfinding.add(box(0.55, 0.045, 0.058, MATERIALS.fabricTeal, -0.2, 1.43, 0.04));
  wayfinding.add(box(0.45, 0.045, 0.058, MATERIALS.fabricCoral, -0.25, 1.3, 0.04));
  markShadows(wayfinding);
  parent.add(wayfinding);
}

function addCorridorDetails(parent, floor) {
  if (floor === 1) {
    addPlant(parent, 2.45, -0.55, 0.72);
    addPlant(parent, -2.45, -4.3, 0.7);
  } else {
    addBench(parent, 2.6, 0.8, Math.PI * 0.5);
    addPlant(parent, -2.45, 1.4, 0.72);
    addPlant(parent, 2.45, 5.2, 0.8);
    addRug(parent, 0, 4.8, 3.7, 2.2, 0xbd9f74, 0);
  }
}

function createLabel(text, className, onClick) {
  const element = document.createElement(onClick ? 'button' : 'div');
  if (onClick) element.type = 'button';
  element.className = `room-label ${className}`;
  element.innerHTML = text;
  if (onClick) {
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    element.addEventListener('pointerdown', (event) => event.stopPropagation());
  }
  const label = new CSS2DObject(element);
  return label;
}

function addRoomLabel(parent, floor, room) {
  const destination = DESTINATIONS.find((item) => item.roomId === room.id);
  if (!destination) return;
  const content = `
    <span class="label-icon">${iconForKind(destination.kind)}</span>
    <span>${room.shortName}</span>
    <span class="label-meta">L${room.floor}</span>
  `;
  const label = createLabel(content, room.labelClass || '', () => selectDestination(destination.id));
  label.position.set(
    room.x1 + (room.x2 - room.x1) / 2,
    1.12,
    room.z1 + (room.z2 - room.z1) / 2
  );
  parent.add(label);
  labelsByFloor[floor].push(label);
  roomLabelButtons.set(destination.id, label.element);
}

function addLandmarkLabel(parent, floor, text, x, z, className, destinationId = null, y = 1.08) {
  const label = createLabel(text, className, destinationId ? () => selectDestination(destinationId) : null);
  label.position.set(x, y, z);
  parent.add(label);
  labelsByFloor[floor].push(label);
  if (destinationId) roomLabelButtons.set(destinationId, label.element);
}

function buildWallsForRoom(parent, room) {
  const left = room.x1;
  const right = room.x2;
  const north = room.z1;
  const south = room.z2;
  const door = room.door;
  const segments = [];

  function split(axis, fixed, from, to, side, doorInfo) {
    if (!doorInfo || doorInfo.side !== side) {
      segments.push({ axis, fixed, from, to });
      return;
    }
    const half = doorInfo.width / 2;
    if (doorInfo.pos - half > from + 0.04) {
      segments.push({ axis, fixed, from, to: doorInfo.pos - half });
    }
    if (doorInfo.pos + half < to - 0.04) {
      segments.push({ axis, fixed, from: doorInfo.pos + half, to });
    }
  }

  split('x', north, left, right, 'north', door);
  split('x', south, left, right, 'south', door);
  split('z', left, north, south, 'west', door);
  split('z', right, north, south, 'east', door);

  for (const segment of segments) {
    const length = Math.abs(segment.to - segment.from);
    if (length < 0.08) continue;
    let wall;
    if (segment.axis === 'x') {
      wall = box(length, WALL_HEIGHT, WALL_THICKNESS, MATERIALS.wall, (segment.from + segment.to) / 2, FLOOR_TOP + WALL_HEIGHT / 2, segment.fixed);
    } else {
      wall = box(WALL_THICKNESS, WALL_HEIGHT, length, MATERIALS.wall, segment.fixed, FLOOR_TOP + WALL_HEIGHT / 2, (segment.from + segment.to) / 2);
    }
    wall.castShadow = true;
    wall.receiveShadow = true;
    parent.add(wall);

    let cap;
    if (segment.axis === 'x') {
      cap = box(length, 0.035, WALL_THICKNESS + 0.02, MATERIALS.wallCap, (segment.from + segment.to) / 2, FLOOR_TOP + WALL_HEIGHT + 0.018, segment.fixed);
    } else {
      cap = box(WALL_THICKNESS + 0.02, 0.035, length, MATERIALS.wallCap, segment.fixed, FLOOR_TOP + WALL_HEIGHT + 0.018, (segment.from + segment.to) / 2);
    }
    cap.castShadow = true;
    parent.add(cap);
  }

  if (door) {
    const half = door.width / 2;
    const frameHeight = WALL_HEIGHT + 0.16;
    if (door.side === 'east' || door.side === 'west') {
      const x = door.side === 'east' ? right : left;
      for (const offset of [-half, half]) {
        const post = box(0.14, frameHeight, 0.14, MATERIALS.door, x, FLOOR_TOP + frameHeight / 2, door.pos + offset);
        post.castShadow = true;
        parent.add(post);
      }
      const lintel = box(0.14, 0.18, door.width + 0.28, MATERIALS.door, x, FLOOR_TOP + WALL_HEIGHT + 0.05, door.pos);
      lintel.castShadow = true;
      parent.add(lintel);
      parent.add(box(0.28, 0.022, door.width, new THREE.MeshStandardMaterial({ color: room.accent, roughness: 0.8 }), x, PAD_Y + 0.048, door.pos));
    } else {
      const z = door.side === 'north' ? north : south;
      for (const offset of [-half, half]) {
        const post = box(0.14, frameHeight, 0.14, MATERIALS.door, door.pos + offset, FLOOR_TOP + frameHeight / 2, z);
        post.castShadow = true;
        parent.add(post);
      }
      const lintel = box(door.width + 0.28, 0.18, 0.14, MATERIALS.door, door.pos, FLOOR_TOP + WALL_HEIGHT + 0.05, z);
      lintel.castShadow = true;
      parent.add(lintel);
      parent.add(box(door.width, 0.022, 0.28, new THREE.MeshStandardMaterial({ color: room.accent, roughness: 0.8 }), door.pos, PAD_Y + 0.048, z));
    }
  }
}

function addStairs(parent) {
  const group = new THREE.Group();
  const stairMat = new THREE.MeshStandardMaterial({ color: 0xc8b995, roughness: 0.86 });
  const stepCount = 9;
  for (let index = 0; index < stepCount; index += 1) {
    const ascent = index * 0.08;
    const step = box(1.55, 0.13 + ascent * 0.72, 0.29, stairMat, -0.95, PAD_Y + (0.13 + ascent * 0.72) / 2, -3.72 - index * 0.255);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }
  group.add(box(0.055, 0.95, 2.55, MATERIALS.darkMetal, -1.74, PAD_Y + 0.48, -4.75));
  group.add(box(0.055, 0.95, 2.55, MATERIALS.darkMetal, -0.16, PAD_Y + 0.48, -4.75));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(2.1, 0.035, 0.035, MATERIALS.metal, -0.95, PAD_Y + 0.95, -3.55 - index * 0.77));
  }
  markShadows(group);
  parent.add(group);
}

function addLift(parent) {
  const group = new THREE.Group();
  const centerX = 1.28;
  const centerZ = -4.65;
  group.add(roundedBox(1.56, 1.78, 1.54, 0.03, MATERIALS.glass, centerX, PAD_Y + 0.89, centerZ));
  for (const x of [centerX - 0.78, centerX + 0.78]) {
    for (const z of [centerZ - 0.77, centerZ + 0.77]) {
      group.add(box(0.065, 1.9, 0.065, MATERIALS.darkMetal, x, PAD_Y + 0.95, z));
    }
  }
  for (const y of [PAD_Y + 0.18, PAD_Y + 1.63, PAD_Y + 1.8]) {
    group.add(box(1.63, 0.055, 0.055, MATERIALS.darkMetal, centerX, y, centerZ + 0.77));
    group.add(box(0.055, 0.055, 1.6, MATERIALS.darkMetal, centerX - 0.78, y, centerZ));
    group.add(box(0.055, 0.055, 1.6, MATERIALS.darkMetal, centerX + 0.78, y, centerZ));
  }
  const doors = new THREE.Group();
  doors.position.set(centerX, PAD_Y + 0.92, centerZ + 0.785);
  const doorLeft = box(0.65, 1.48, 0.06, MATERIALS.metal, -0.325, 0, 0);
  const doorRight = box(0.65, 1.48, 0.06, MATERIALS.metal, 0.325, 0, 0);
  doors.add(doorLeft, doorRight);
  group.add(doors);
  const callPanel = box(0.25, 0.4, 0.055, MATERIALS.screen, centerX + 1.0, PAD_Y + 0.82, centerZ + 0.72);
  group.add(callPanel);
  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x7fe1b2, emissive: 0x3fae7a, emissiveIntensity: 1.4 })
  );
  indicator.position.set(centerX + 1.0, PAD_Y + 0.92, centerZ + 0.75);
  group.add(indicator);
  markShadows(group);
  parent.add(group);
}

function buildFloor(floor) {
  const group = new THREE.Group();
  group.visible = floor === state.activeFloor;
  building.add(group);
  floorGroups[floor] = group;
  floorVisuals[floor] = { rooms: {}, pickables: pickablesByFloor[floor] };

  const plinth = roundedBox(20.55, 0.14, 14.75, 0.12, MATERIALS.plinth, 0, -0.19, 0);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const slab = roundedBox(20.3, 0.32, 14.5, 0.16, MATERIALS.base, 0, 0, 0);
  slab.receiveShadow = true;
  slab.castShadow = true;
  group.add(slab);

  const corridor = roundedBox(6.2, 0.035, 12.45, 0.08, MATERIALS.corridor, 0, FLOOR_TOP + 0.018, 0.15);
  corridor.receiveShadow = true;
  group.add(corridor);

  for (const room of ROOMS.filter((item) => item.floor === floor)) {
    const width = room.x2 - room.x1 - 0.2;
    const depth = room.z2 - room.z1 - 0.2;
    const centerX = room.x1 + (room.x2 - room.x1) / 2;
    const centerZ = room.z1 + (room.z2 - room.z1) / 2;
    const material = new THREE.MeshStandardMaterial({
      color: room.color,
      roughness: 0.9,
      metalness: 0.01,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    roomMaterials[room.id] = material;
    const pad = roundedBox(width, 0.075, depth, 0.07, material, centerX, PAD_Y + 0.015, centerZ);
    pad.receiveShadow = true;
    pad.userData.destination = room.id;
    pad.userData.roomId = room.id;
    group.add(pad);
    pickablesByFloor[floor].push(pad);
    floorVisuals[floor].rooms[room.id] = pad;

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.08, depth)),
      new THREE.LineBasicMaterial({ color: 0x5e594d, transparent: true, opacity: 0.17 })
    );
    outline.position.set(centerX, PAD_Y + 0.015, centerZ);
    group.add(outline);

    buildWallsForRoom(group, room);
    addRoomLabel(group, floor, room);

    switch (room.furniture) {
      case 'children':
        addChildrenFurniture(group, room);
        break;
      case 'books':
        addBooksFurniture(group, room);
        break;
      case 'meeting':
        addMeetingFurniture(group, room);
        break;
      case 'toilets':
        addToiletFurniture(group, room);
        break;
      case 'reading':
        addReadingFurniture(group, room);
        break;
      case 'study':
        addStudyFurniture(group, room);
        break;
      default:
        break;
    }
  }

  if (floor === 1) {
    addHelpDesk(group);
    addEntranceDetails(group);
    addLandmarkLabel(group, 1, `${iconForKind('entrance')}<span>Entrance</span>`, 0, 6.75, 'entrance-label', 'entrance', 1.3);
    addLandmarkLabel(group, 1, `${iconForKind('help')}<span>Help Desk</span>`, -2.1, 2.2, 'major', 'help', 1.31);
  } else {
    addLandmarkLabel(group, 2, `${iconForKind('start')}<span>Upper gallery</span>`, 0, 5.0, 'core-label', null, 1.3);
  }

  addStairs(group);
  addLift(group);
  addLandmarkLabel(group, floor, `${iconForKind('stairs')}<span>Stairs</span>`, -0.72, -4.8, 'core-label', null, 2.02);
  addLandmarkLabel(group, floor, `${iconForKind('lift')}<span>Lift</span>`, 1.28, -4.55, 'core-label', null, 2.18);
  addCorridorDetails(group, floor);

  const markerGroup = new THREE.Group();
  group.add(markerGroup);
  markerGroups[floor] = markerGroup;

  labelsByFloor[floor].forEach((label) => {
    label.visible = floor === state.activeFloor;
  });

  return group;
}

/* Selection markers */

function createRingMarker(color, kind) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.1,
    transparent: true,
    opacity: 0.94
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.045, 8, 42), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = ROUTE_Y + 0.02;
  group.add(ring);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = ROUTE_Y + 0.001;
  group.add(inner);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.085, 0.8, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })
  );
  beam.position.y = ROUTE_Y + 0.4;
  group.add(beam);

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(kind === 'destination' ? 0.14 : 0.1, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.32 })
  );
  diamond.position.y = ROUTE_Y + 0.88;
  group.add(diamond);
  group.userData.ring = ring;
  group.userData.diamond = diamond;
  group.userData.baseY = ROUTE_Y;
  return group;
}

function rebuildSelectionMarkers() {
  for (const floor of [1, 2]) {
    const layer = markerGroups[floor];
    if (!layer) continue;
    while (layer.children.length) {
      layer.remove(layer.children[0]);
    }
  }
  markerRings.length = 0;

  const start = DESTINATION_BY_ID[state.startId];
  const destination = state.destinationId ? DESTINATION_BY_ID[state.destinationId] : null;
  const addMarker = (destinationItem, kind) => {
    if (!destinationItem) return;
    const node = NODES[destinationItem.node];
    if (!node || !markerGroups[node.floor]) return;
    const marker = createRingMarker(kind === 'start' ? 0x62d3c7 : 0xffa55c, kind);
    marker.position.set(node.x, 0, node.z);
    marker.userData.kind = kind;
    markerGroups[node.floor].add(marker);
    markerRings.push(marker);
  };

  if (start) addMarker(start, 'start');
  if (destination && (!start || destination.id !== start.id)) addMarker(destination, 'destination');
  updateRoomHighlights();
}

function updateRoomHighlights() {
  const destination = state.destinationId ? DESTINATION_BY_ID[state.destinationId] : null;
  const start = DESTINATION_BY_ID[state.startId];
  for (const room of ROOMS) {
    const material = roomMaterials[room.id];
    if (!material) continue;
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
    if (destination && destination.roomId === room.id) {
      material.emissive.setHex(0xa55d1e);
      material.emissiveIntensity = 0.22;
    } else if (start && start.roomId === room.id) {
      material.emissive.setHex(0x2d7c70);
      material.emissiveIntensity = 0.16;
    }
  }

  roomLabelButtons.forEach((element, id) => {
    element.classList.toggle('is-destination', Boolean(destination && destination.id === id));
    element.classList.toggle('is-start', Boolean(start && start.id === id && (!destination || destination.id !== id)));
  });
}

/* Route visualization */

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}

function addCylinderBetween(group, from, to, radius, material) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 0.01) return;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 9, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = false;
  group.add(mesh);
}

function makeRouteMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xffbd62,
    emissive: 0xff8f28,
    emissiveIntensity: 1.9,
    roughness: 0.36,
    metalness: 0.08
  });
}

function makeRouteGlowMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffb04d,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function distanceAlongPoints(points, distance) {
  let remaining = distance;
  for (let index = 0; index < points.length - 1; index += 1) {
    const segment = points[index + 1].clone().sub(points[index]);
    const length = segment.length();
    if (remaining <= length) {
      return points[index].clone().add(segment.multiplyScalar(remaining / Math.max(length, 0.001)));
    }
    remaining -= length;
  }
  return points[points.length - 1].clone();
}

function totalPolylineLength(points) {
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    total += points[index].distanceTo(points[index + 1]);
  }
  return total;
}

function createRouteForFloor(floor, routeNodes) {
  if (!routeNodes.length) return null;
  const group = new THREE.Group();
  floorGroups[floor].add(group);

  const points = routeNodes.map((node) => new THREE.Vector3(node.x, ROUTE_Y, node.z));
  if (points.length === 1) {
    points.push(points[0].clone().add(new THREE.Vector3(0.02, 0, 0.02)));
  }

  const glowMaterial = makeRouteGlowMaterial();
  const coreMaterial = makeRouteMaterial();
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe0a2,
    emissive: 0xff9d38,
    emissiveIntensity: 1.55,
    roughness: 0.4
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    addCylinderBetween(group, points[index], points[index + 1], 0.13, glowMaterial);
    addCylinderBetween(group, points[index], points[index + 1], 0.055, coreMaterial);
  }

  for (const point of points) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), jointMaterial);
    joint.position.copy(point);
    group.add(joint);
  }

  const totalLength = totalPolylineLength(points);
  const beadCount = totalLength > 8 ? 3 : 2;
  for (let index = 0; index < beadCount; index += 1) {
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff3cd })
    );
    bead.position.copy(points[0]);
    group.add(bead);
    routeBeads.push({
      mesh: bead,
      points,
      totalLength,
      offset: index / beadCount,
      floor
    });
  }

  const startDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.31, 30),
    new THREE.MeshBasicMaterial({ color: 0xffc76f, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  );
  startDisc.rotation.x = -Math.PI / 2;
  startDisc.position.copy(points[0]).setY(ROUTE_Y - 0.02);
  group.add(startDisc);

  return group;
}

function createTransitionVisual(fromNode, toNode, kind) {
  const floor = fromNode.floor;
  const group = floorGroups[floor];
  if (!group) return;

  const upward = toNode.floor > fromNode.floor;
  const color = kind === 'lift' ? 0x6fd0cb : 0xffb85f;
  const transitionGroup = new THREE.Group();
  transitionGroup.position.set(fromNode.x, 0, fromNode.z);

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.65, 8), material);
  beam.position.y = ROUTE_Y + 0.82;
  transitionGroup.add(beam);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.36, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.35 })
  );
  arrow.position.y = ROUTE_Y + 1.75;
  if (!upward) arrow.rotation.z = Math.PI;
  transitionGroup.add(arrow);

  const pulse = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.035, 8, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
  );
  pulse.rotation.x = Math.PI / 2;
  pulse.position.y = ROUTE_Y + 0.01;
  transitionGroup.add(pulse);

  group.add(transitionGroup);
  routeTransitions.push({ group: transitionGroup, arrow, pulse, upward, kind });
}

function setRouteVisual(route) {
  for (const floor of [1, 2]) {
    if (routeGroups[floor]) {
      routeGroups[floor].parent?.remove(routeGroups[floor]);
      disposeGroup(routeGroups[floor]);
      routeGroups[floor] = null;
    }
  }
  routeBeads.length = 0;
  routeTransitions.length = 0;

  if (!route) return;

  const byFloor = { 1: [], 2: [] };
  for (const node of route.nodes) {
    byFloor[node.floor].push(node);
  }

  routeGroups[1] = createRouteForFloor(1, byFloor[1]);
  routeGroups[2] = createRouteForFloor(2, byFloor[2]);

  for (let index = 0; index < route.edges.length; index += 1) {
    const edge = route.edges[index];
    if (edge.kind === 'walk') continue;
    createTransitionVisual(NODES[edge.from], NODES[edge.to], edge.kind);
  }
}

function updateFloorVisibility() {
  for (const floor of [1, 2]) {
    const active = floor === state.activeFloor;
    if (floorGroups[floor]) floorGroups[floor].visible = active;
    labelsByFloor[floor].forEach((label) => {
      label.visible = active;
    });
  }
}

/* Raycast selection */

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let pointerDownPosition = null;
let lastHover = null;

function roomFromHit(object) {
  let cursor = object;
  while (cursor) {
    if (cursor.userData?.destination) return cursor.userData.destination;
    cursor = cursor.parent;
  }
  return null;
}

function pickDestination(clientX, clientY) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
  pointerNdc.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(pickablesByFloor[state.activeFloor], false);
  if (!hits.length) return null;
  return roomFromHit(hits[0].object);
}

function updateHover(clientX, clientY) {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const destinationId = pickDestination(clientX, clientY);
  if (destinationId === lastHover) return;
  if (lastHover && roomMaterials[lastHover] && lastHover !== state.destinationId && lastHover !== state.startId) {
    roomMaterials[lastHover].emissiveIntensity = 0;
  }
  lastHover = destinationId;
  if (lastHover) {
    renderer.domElement.style.cursor = 'pointer';
    if (lastHover !== state.destinationId && lastHover !== state.startId && roomMaterials[lastHover]) {
      roomMaterials[lastHover].emissive.setHex(0x8a5a2d);
      roomMaterials[lastHover].emissiveIntensity = 0.12;
    }
  } else {
    renderer.domElement.style.cursor = 'grab';
  }
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDownPosition = { x: event.clientX, y: event.clientY, time: performance.now() };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDownPosition) return;
  const moved = Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y);
  const elapsed = performance.now() - pointerDownPosition.time;
  pointerDownPosition = null;
  if (moved > 7 || elapsed > 700) return;
  const destinationId = pickDestination(event.clientX, event.clientY);
  if (destinationId) selectDestination(destinationId);
});

renderer.domElement.addEventListener('pointermove', (event) => {
  updateHover(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('pointerleave', () => {
  if (lastHover && roomMaterials[lastHover] && lastHover !== state.destinationId && lastHover !== state.startId) {
    roomMaterials[lastHover].emissiveIntensity = 0;
  }
  lastHover = null;
  renderer.domElement.style.cursor = 'grab';
});

/* Animation */

const clock = new THREE.Clock();
const compassOrigin = new THREE.Vector3(0, 0, 0);
const compassNorth = new THREE.Vector3(0, 0, -1);
let lastCompassAngle = null;

function updateCompass() {
  if (!el.compassNeedle) return;
  const origin = compassOrigin.clone().project(camera);
  const north = compassNorth.clone().project(camera);
  const dx = north.x - origin.x;
  const dy = north.y - origin.y;
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  if (lastCompassAngle === null || Math.abs(angle - lastCompassAngle) > 0.25) {
    el.compassNeedle.style.transform = `rotate(${angle}deg)`;
    lastCompassAngle = angle;
  }
}

function animateMarkers(time) {
  const pulse = 1 + Math.sin(time * 3.2) * 0.13;
  for (const marker of markerRings) {
    const ring = marker.userData.ring;
    const diamond = marker.userData.diamond;
    if (ring) ring.scale.setScalar(pulse);
    if (diamond) {
      diamond.rotation.y = time * 0.9;
      diamond.position.y = ROUTE_Y + 0.88 + Math.sin(time * 2.7) * 0.045;
    }
  }

  for (const transition of routeTransitions) {
    transition.arrow.position.y = ROUTE_Y + 1.75 + Math.sin(time * 2.8) * 0.035;
    transition.pulse.scale.setScalar(1 + Math.sin(time * 2.4) * 0.06);
  }
}

function animateBeads(time) {
  for (const bead of routeBeads) {
    if (!bead.mesh.parent?.visible) continue;
    const progress = ((time * 0.16 + bead.offset) % 1);
    const point = distanceAlongPoints(bead.points, bead.totalLength * progress);
    bead.mesh.position.copy(point);
    const scale = 0.84 + Math.sin(progress * Math.PI) * 0.35;
    bead.mesh.scale.setScalar(scale);
  }
}

function tick() {
  requestAnimationFrame(tick);
  const time = clock.getElapsedTime();

  if (cameraTween) {
    const progress = Math.min(1, (performance.now() - cameraTween.started) / cameraTween.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
    if (progress >= 1) cameraTween = null;
  }

  controls.update();
  updateCompass();
  animateMarkers(time);
  animateBeads(time);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function resizeScene() {
  const width = Math.max(1, sceneMount.clientWidth);
  const height = Math.max(1, sceneMount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  labelRenderer.setSize(width, height);
  if (!cameraTween) {
    const currentDistance = camera.position.distanceTo(controls.target);
    const wanted = calculateDefaultCamera();
    const wantedDistance = wanted.distanceTo(new THREE.Vector3(0, 0.35, 0));
    if (Math.abs(currentDistance - wantedDistance) > 3.5) {
      camera.position.copy(wanted);
      controls.target.set(0, 0.15, 0);
      controls.update();
    }
  }
}

window.addEventListener('resize', resizeScene);

const sceneApi = {
  showFloor(floor) {
    state.activeFloor = floor;
    updateFloorVisibility();
  },
  setRoute(route) {
    setRouteVisual(route);
    rebuildSelectionMarkers();
  },
  clearRoute() {
    setRouteVisual(null);
    rebuildSelectionMarkers();
  },
  setSelection(selection) {
    if (selection.destinationId !== undefined) {
      state.destinationId = selection.destinationId;
    }
    if (selection.startId) state.startId = selection.startId;
    rebuildSelectionMarkers();
  },
  resetCamera() {
    applyCameraDefaults(true);
  }
};
window.sceneApi = sceneApi;

/* -------------------------------------------------------------------------- */
/* Initialisation and events                                                  */
/* -------------------------------------------------------------------------- */

populateStartSelect();
buildFloor(1);
buildFloor(2);
updateFloorVisibility();
updateLiftChrome();
applyCameraDefaults(false);
resizeScene();
updateRoute();
updateFloorChrome();
tick();

window.setTimeout(() => {
  el.sceneLoading.classList.add('is-hidden');
}, 450);

el.searchInput.addEventListener('input', () => {
  setSearchOpen(true);
});
el.searchInput.addEventListener('focus', () => {
  setSearchOpen(true);
});
el.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSearch();
    el.searchInput.blur();
  }
  if (event.key === 'Enter') {
    const first = el.searchResults.querySelector('[data-destination]');
    if (first) selectDestination(first.dataset.destination);
  }
});

el.searchClear.addEventListener('click', () => {
  el.searchInput.value = '';
  el.searchClear.hidden = true;
  renderSearchResults('');
  el.searchInput.focus();
});

el.searchResults.addEventListener('click', (event) => {
  const button = event.target.closest('[data-destination]');
  if (!button) return;
  selectDestination(button.dataset.destination);
});

document.addEventListener('pointerdown', (event) => {
  if (!state.searchOpen) return;
  if (el.searchInput.contains(event.target) || el.searchResults.contains(event.target)) return;
  closeSearch();
});

el.startSelect.addEventListener('change', () => {
  state.startId = el.startSelect.value;
  updateRoute({ announce: true, source: 'start' });
});

el.stepFreeToggle.addEventListener('change', () => {
  setStepFree(el.stepFreeToggle.checked, { announce: true });
});

el.routePanel.addEventListener('click', (event) => {
  const clear = event.target.closest('[data-action="clear"]');
  if (clear) {
    state.destinationId = null;
    updateRoute();
    return;
  }

  const stairs = event.target.closest('[data-action="show-stairs"]');
  if (stairs) {
    setStepFree(false, { announce: false });
    showToast('Showing the stair route instead.', 2200);
    return;
  }

  const focusStart = event.target.closest('[data-action="focus-start"]');
  if (focusStart) {
    el.startSelect.focus();
  }
});

el.floorButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveFloor(Number(button.dataset.floor), { announce: true });
  });
});

el.routeContinuesButton.addEventListener('click', () => {
  const floor = Number(el.routeContinuesButton.dataset.targetFloor);
  if (floor) setActiveFloor(floor, { announce: true });
});

el.resetView.addEventListener('click', () => {
  sceneApi.resetCamera();
  showToast('Map view reset', 1500);
});

function openStaffModal() {
  el.staffModal.hidden = false;
  updateLiftChrome();
  window.setTimeout(() => el.staffClose.focus(), 40);
}

function closeStaffModal() {
  el.staffModal.hidden = true;
  el.staffButton.focus();
}

el.staffButton.addEventListener('click', openStaffModal);
el.staffClose.addEventListener('click', closeStaffModal);
el.staffDone.addEventListener('click', closeStaffModal);
el.staffModal.addEventListener('click', (event) => {
  if (event.target === el.staffModal) closeStaffModal();
});
el.liftOutageToggle.addEventListener('change', () => {
  setLiftOperational(!el.liftOutageToggle.checked, { announce: true });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !el.staffModal.hidden) closeStaffModal();
});
