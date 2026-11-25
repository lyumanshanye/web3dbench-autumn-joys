export const FLOOR_META = {
  ground: {
    id: "ground",
    name: "Ground floor",
    short: "G",
    levelLabel: "Level 0",
    subtitle: "Entrance, help desk & children's library",
    offsetX: -10.8,
    offsetZ: 0,
  },
  upper: {
    id: "upper",
    name: "Upper floor",
    short: "1",
    levelLabel: "Level 1",
    subtitle: "Reading room & meeting rooms",
    offsetX: 10.8,
    offsetZ: 0,
  },
};

export const DESTINATIONS = [
  {
    id: "children",
    name: "Children's Section",
    shortName: "Children's",
    floor: "ground",
    node: "g_child",
    x: -6.35,
    z: 4.55,
    description: "Picture books & story corner",
    icon: "child",
    color: "#dfb149",
    tint: "#f6e6b9",
  },
  {
    id: "help",
    name: "Help Desk",
    shortName: "Help Desk",
    floor: "ground",
    node: "g_help",
    x: 4.55,
    z: 4.4,
    description: "Library cards & visitor help",
    icon: "help",
    color: "#4d9c8b",
    tint: "#cfe9e2",
  },
  {
    id: "meeting1",
    name: "Meeting Room 1",
    shortName: "Meeting 1",
    floor: "ground",
    node: "g_meet1",
    x: -6.8,
    z: -4.15,
    description: "Ground floor · 12 seats",
    icon: "meeting",
    color: "#bf6f4f",
    tint: "#eed3c9",
  },
  {
    id: "toilets",
    name: "Toilets",
    shortName: "Toilets",
    floor: "ground",
    node: "g_toilet",
    x: 7.45,
    z: -4.3,
    description: "Including accessible facilities",
    icon: "toilet",
    color: "#579982",
    tint: "#cfe4db",
  },
  {
    id: "reading",
    name: "Reading Room",
    shortName: "Reading Room",
    floor: "upper",
    node: "u_reading",
    x: -6.8,
    z: -4.15,
    description: "Silent study & local history",
    icon: "reading",
    color: "#7e70a3",
    tint: "#ddd7e9",
  },
  {
    id: "meeting2",
    name: "Meeting Room 2",
    shortName: "Meeting 2",
    floor: "upper",
    node: "u_meeting2",
    x: 7.45,
    z: -4.2,
    description: "Upper floor · 8 seats",
    icon: "meeting",
    color: "#b8655d",
    tint: "#ebd0cc",
  },
  {
    id: "entrance",
    name: "Main Entrance",
    shortName: "Entrance",
    floor: "ground",
    node: "g_entrance",
    x: 0,
    z: 6.3,
    description: "Northbank Street doors",
    icon: "entrance",
    color: "#507e73",
    tint: "#d7e3de",
  },
];

export const STARTS = [
  { id: "entrance", label: "Main entrance", node: "g_entrance", floor: "ground" },
  { id: "help", label: "Help Desk", node: "g_help", floor: "ground" },
  { id: "children", label: "Children's Section", node: "g_child", floor: "ground" },
  { id: "meeting1", label: "Meeting Room 1", node: "g_meet1", floor: "ground" },
  { id: "toilets", label: "Toilets", node: "g_toilet", floor: "ground" },
  { id: "reading", label: "Reading Room · Upper", node: "u_reading", floor: "upper" },
  { id: "meeting2", label: "Meeting Room 2 · Upper", node: "u_meeting2", floor: "upper" },
];

export const NODES = {
  g_entrance: { id: "g_entrance", floor: "ground", x: 0, z: 6.3, name: "Main entrance", y: 0.16 },
  g_foyer: { id: "g_foyer", floor: "ground", x: 0, z: 4.15, name: "Entrance foyer", y: 0.16 },
  g_lobby: { id: "g_lobby", floor: "ground", x: 0, z: 0.15, name: "Main corridor", y: 0.16 },
  g_helpOpen: { id: "g_helpOpen", floor: "ground", x: 2.15, z: 4.15, name: "Help desk opening", y: 0.16 },
  g_help: { id: "g_help", floor: "ground", x: 4.55, z: 4.4, name: "Help Desk", y: 0.16 },
  g_corrWest: { id: "g_corrWest", floor: "ground", x: -6.35, z: 0.12, name: "West corridor", y: 0.16 },
  g_childDoor: { id: "g_childDoor", floor: "ground", x: -6.15, z: 1.34, name: "Children's doorway", y: 0.16 },
  g_child: { id: "g_child", floor: "ground", x: -6.35, z: 4.55, name: "Children's Section", y: 0.16 },
  g_meetDoor: { id: "g_meetDoor", floor: "ground", x: -6.55, z: -1.32, name: "Meeting Room 1 doorway", y: 0.16 },
  g_meet1: { id: "g_meet1", floor: "ground", x: -6.8, z: -4.15, name: "Meeting Room 1", y: 0.16 },
  g_stairDoor: { id: "g_stairDoor", floor: "ground", x: -2.15, z: -1.35, name: "Stair doorway", y: 0.16 },
  g_stairFoot: { id: "g_stairFoot", floor: "ground", x: -2.15, z: -2.35, name: "Stair foot", y: 0.16 },
  g_stairTop: { id: "g_stairTop", floor: "ground", x: -2.15, z: -5.25, name: "Stair top", y: 1.4 },
  g_liftDoor: { id: "g_liftDoor", floor: "ground", x: 1.4, z: -1.35, name: "Lift lobby", y: 0.16 },
  g_lift: { id: "g_lift", floor: "ground", x: 1.4, z: -2.95, name: "Lift", y: 0.16 },
  g_corrEast: { id: "g_corrEast", floor: "ground", x: 7.25, z: 0.12, name: "East corridor", y: 0.16 },
  g_toiletDoor: { id: "g_toiletDoor", floor: "ground", x: 7.25, z: -1.32, name: "Toilet doorway", y: 0.16 },
  g_toilet: { id: "g_toilet", floor: "ground", x: 7.45, z: -4.3, name: "Toilets", y: 0.16 },

  u_stairTop: { id: "u_stairTop", floor: "upper", x: -2.15, z: -5.25, name: "Upper stair landing", y: 1.4 },
  u_stairLanding: { id: "u_stairLanding", floor: "upper", x: -2.15, z: -1.35, name: "Upper stair gate", y: 0.16 },
  u_lift: { id: "u_lift", floor: "upper", x: 1.4, z: -2.95, name: "Upper lift", y: 0.16 },
  u_liftDoor: { id: "u_liftDoor", floor: "upper", x: 1.4, z: -1.35, name: "Upper lift lobby", y: 0.16 },
  u_lobby: { id: "u_lobby", floor: "upper", x: 0, z: 0.15, name: "Upper gallery", y: 0.16 },
  u_corrWest: { id: "u_corrWest", floor: "upper", x: -6.35, z: 0.12, name: "West gallery", y: 0.16 },
  u_readDoor: { id: "u_readDoor", floor: "upper", x: -6.55, z: -1.32, name: "Reading Room doorway", y: 0.16 },
  u_reading: { id: "u_reading", floor: "upper", x: -6.8, z: -4.15, name: "Reading Room", y: 0.16 },
  u_corrEast: { id: "u_corrEast", floor: "upper", x: 7.25, z: 0.12, name: "East gallery", y: 0.16 },
  u_meet2Door: { id: "u_meet2Door", floor: "upper", x: 7.25, z: -1.32, name: "Meeting Room 2 doorway", y: 0.16 },
  u_meeting2: { id: "u_meeting2", floor: "upper", x: 7.45, z: -4.2, name: "Meeting Room 2", y: 0.16 },
};

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const EDGE_DEFINITIONS = [
  ["g_entrance", "g_foyer", { kind: "walk" }],
  ["g_foyer", "g_lobby", { kind: "walk" }],
  ["g_foyer", "g_helpOpen", { kind: "walk" }],
  ["g_helpOpen", "g_help", { kind: "walk" }],
  ["g_lobby", "g_corrWest", { kind: "walk" }],
  ["g_lobby", "g_stairDoor", { kind: "walk" }],
  ["g_stairDoor", "g_stairFoot", { kind: "walk" }],
  ["g_stairFoot", "g_stairTop", { kind: "walk" }],
  ["g_lobby", "g_liftDoor", { kind: "walk" }],
  ["g_liftDoor", "g_lift", { kind: "walk" }],
  ["g_lobby", "g_corrEast", { kind: "walk" }],
  ["g_corrWest", "g_childDoor", { kind: "walk" }],
  ["g_childDoor", "g_child", { kind: "walk" }],
  ["g_corrWest", "g_meetDoor", { kind: "walk" }],
  ["g_meetDoor", "g_meet1", { kind: "walk" }],
  ["g_corrEast", "g_toiletDoor", { kind: "walk" }],
  ["g_toiletDoor", "g_toilet", { kind: "walk" }],
  ["u_stairTop", "u_stairLanding", { kind: "walk" }],
  ["u_stairLanding", "u_lobby", { kind: "walk" }],
  ["u_lobby", "u_corrWest", { kind: "walk" }],
  ["u_corrWest", "u_readDoor", { kind: "walk" }],
  ["u_readDoor", "u_reading", { kind: "walk" }],
  ["u_lobby", "u_liftDoor", { kind: "walk" }],
  ["u_liftDoor", "u_lift", { kind: "walk" }],
  ["u_lobby", "u_corrEast", { kind: "walk" }],
  ["u_corrEast", "u_meet2Door", { kind: "walk" }],
  ["u_meet2Door", "u_meeting2", { kind: "walk" }],
  ["g_stairTop", "u_stairTop", { kind: "stairs", cost: 6 }],
  ["g_lift", "u_lift", { kind: "lift", cost: 18 }],
].map(([from, to, meta]) => ({
  from,
  to,
  kind: meta.kind,
  cost: meta.cost || distance2d(NODES[from], NODES[to]),
}));

const ADJACENCY = new Map(Object.keys(NODES).map((id) => [id, []]));

for (const edge of EDGE_DEFINITIONS) {
  const forward = { ...edge, from: edge.from, to: edge.to };
  const reverse = { ...edge, from: edge.to, to: edge.from };
  ADJACENCY.get(edge.from).push(forward);
  ADJACENCY.get(edge.to).push(reverse);
}

export function findRoute(startNodeId, endNodeId, { stepFree = false, liftOut = false } = {}) {
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(Object.keys(NODES));

  for (const id of unvisited) distances.set(id, Number.POSITIVE_INFINITY);
  distances.set(startNodeId, 0);

  while (unvisited.size) {
    let current = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const id of unvisited) {
      const value = distances.get(id);
      if (value < currentDistance) {
        current = id;
        currentDistance = value;
      }
    }
    if (!current || currentDistance === Number.POSITIVE_INFINITY) break;
    unvisited.delete(current);
    if (current === endNodeId) break;

    for (const edge of ADJACENCY.get(current)) {
      if (edge.kind === "stairs" && stepFree) continue;
      if (edge.kind === "lift" && liftOut) continue;
      if (!unvisited.has(edge.to)) continue;
      const nextDistance = currentDistance + edge.cost;
      if (nextDistance < distances.get(edge.to)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, { from: current, edge });
      }
    }
  }

  if (startNodeId !== endNodeId && !previous.has(endNodeId)) return null;

  const nodeIds = [endNodeId];
  const edges = [];
  let cursor = endNodeId;
  while (cursor !== startNodeId) {
    const step = previous.get(cursor);
    if (!step) return null;
    edges.unshift(step.edge);
    nodeIds.unshift(step.from);
    cursor = step.from;
  }

  let physicalDistance = 0;
  for (const edge of edges) {
    const from = NODES[edge.from];
    const to = NODES[edge.to];
    physicalDistance += distance2d(from, to);
    if (edge.kind === "stairs") physicalDistance += 4;
    if (edge.kind === "lift") physicalDistance += 2;
  }

  return {
    nodes: nodeIds,
    edges,
    weight: distances.get(endNodeId),
    distance: physicalDistance * 1.55,
    transition: edges.find((edge) => edge.kind === "stairs" || edge.kind === "lift") || null,
  };
}

const DIRECTION_STRUCTURAL_NODES = new Set([
  "g_childDoor",
  "g_meetDoor",
  "g_toiletDoor",
  "u_readDoor",
  "u_meet2Door",
  "g_stairDoor",
  "g_stairFoot",
  "g_stairTop",
  "g_liftDoor",
  "g_lift",
  "u_stairTop",
  "u_stairLanding",
  "u_liftDoor",
  "u_lift",
]);

function vectorBetween(a, b) {
  return { x: b.x - a.x, z: b.z - a.z, length: Math.hypot(b.x - a.x, b.z - a.z) };
}

function headingWord(vector) {
  if (Math.abs(vector.x) >= Math.abs(vector.z)) return vector.x >= 0 ? "east" : "west";
  return vector.z >= 0 ? "north" : "south";
}

function startDetail(start, route) {
  if (start.node === "g_entrance") {
    return "Walk through the main doors into the entrance foyer.";
  }
  if (start.floor === "upper") {
    return `Leave ${start.label.replace(" · Upper", "")} and make your way to the upper-floor lift or stairs.`;
  }
  return `Leave ${start.label} and make your way back to the main corridor.`;
}

function buildTurnSteps(points, destination, { afterTransition = false, beforeTransition = false } = {}) {
  const walkPoints = points.filter((node) => !DIRECTION_STRUCTURAL_NODES.has(node.id));
  const steps = [];
  if (walkPoints.length < 2) return steps;

  const firstVector = vectorBetween(walkPoints[0], walkPoints[1]);
  if (afterTransition && firstVector.length > 1.1) {
    const onUpperFloor = walkPoints[0].floor === "upper";
    steps.push({
      title: onUpperFloor
        ? `Follow the gallery ${headingWord(firstVector)}`
        : `Continue ${headingWord(firstVector)} through the foyer`,
      detail: `From the level change, keep heading toward ${destination.shortName}.`,
      kind: "walk",
    });
  }

  let turns = 0;
  for (let index = 1; index < walkPoints.length - 1 && turns < 3; index += 1) {
    const previous = walkPoints[index - 1];
    const current = walkPoints[index];
    const next = walkPoints[index + 1];
    const incoming = vectorBetween(previous, current);
    const outgoing = vectorBetween(current, next);
    if (incoming.length < 0.7 || outgoing.length < 0.7) continue;

    const incomingUnit = { x: incoming.x / incoming.length, z: incoming.z / incoming.length };
    const outgoingUnit = { x: outgoing.x / outgoing.length, z: outgoing.z / outgoing.length };
    const dot = Math.max(-1, Math.min(1, incomingUnit.x * outgoingUnit.x + incomingUnit.z * outgoingUnit.z));
    const angle = Math.acos(dot);
    if (angle < 0.5) continue;

    const cross = incomingUnit.x * outgoingUnit.z - incomingUnit.z * outgoingUnit.x;
    const side = cross < 0 ? "right" : "left";
    const nearDestination = !beforeTransition && index === walkPoints.length - 2;
    if (nearDestination) {
      const doorwayDetail = destination.id === "entrance"
        ? "Continue through the foyer to the main doors."
        : destination.id === "help"
          ? "The help desk counter is ahead on your right."
          : `Follow the signs and go through the marked doorway into ${destination.name}.`;
      steps.push({
        title: `Turn ${side} toward ${destination.shortName}`,
        detail: doorwayDetail,
        kind: "walk",
      });
    } else {
      steps.push({
        title: `Turn ${side}`,
        detail: `Follow the corridor ${headingWord(outgoing)} past the marked rooms.`,
        kind: "walk",
      });
    }
    turns += 1;
  }

  if (!steps.length && !afterTransition) {
    steps.push({
      title: "Continue straight ahead",
      detail: `Keep following the walkway toward ${destination.shortName}.`,
      kind: "walk",
    });
  }
  return steps;
}

export function buildDirections(route, start, destination, { stepFree = false } = {}) {
  if (start.node === destination.node) {
    return [
      {
        title: `You're already at ${destination.name}`,
        detail: "Choose a different destination for directions, or pick another starting point.",
        kind: "final",
      },
    ];
  }
  if (!route) return [];

  const nodes = route.nodes.map((id) => NODES[id]);
  const steps = [
    {
      title: `Start at ${start.label.replace(" · Upper", "")}`,
      detail: startDetail(start, route),
      kind: "start",
    },
  ];

  if (route.transition) {
    const transitionIndex = route.edges.findIndex((edge) => edge.kind === route.transition.kind);
    const before = nodes.slice(0, transitionIndex + 1);
    const after = nodes.slice(transitionIndex + 1);
    const goingUp = NODES[route.transition.to].floor === "upper";
    steps.push(...buildTurnSteps(before, destination, { beforeTransition: true }));
    if (route.transition.kind === "lift") {
      steps.push({
        title: `Take the lift ${goingUp ? "up" : "down"} to ${goingUp ? "the upper floor" : "the ground floor"}`,
        detail: stepFree
          ? `Press the accessible call button; the lift opens directly onto the ${goingUp ? "gallery" : "main corridor"}.`
          : "The lift is at the rear-centre of the building, just off the main corridor.",
        kind: "level",
      });
    } else {
      steps.push({
        title: `Take the stairs ${goingUp ? "up" : "down"} to ${goingUp ? "the upper floor" : "the ground floor"}`,
        detail: "Use the stairwell at the rear-centre of the building. Handrails are fitted on both sides.",
        kind: "level",
      });
    }
    steps.push(...buildTurnSteps(after, destination, { afterTransition: true }));
  } else {
    steps.push(...buildTurnSteps(nodes, destination));
  }

  steps.push({
    title: `Arrive at ${destination.name}`,
    detail: destination.id === "entrance"
      ? "You're at the main entrance on Northbank Street."
      : destination.id === "help"
        ? "A staff member at the counter can help with cards, directions and accessibility requests."
        : `Go through the final doorway; ${destination.name} is now in front of you.`,
    kind: "final",
  });

  return steps;
}

export function formatDistance(distance) {
  if (!distance || distance < 4) return "You're here";
  const rounded = Math.max(5, Math.round(distance / 5) * 5);
  return `≈ ${rounded} m`;
}

export function formatDuration(distance) {
  if (!distance || distance < 4) return "At destination";
  const minutes = Math.max(1, Math.ceil(distance / 48));
  return `${minutes} min walk`;
}
