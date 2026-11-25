export const WAREHOUSE = {
  width: 24,
  depth: 18,
  aisleMinX: -11.55,
  aisleMaxX: 11.55,
  aisleMinZ: -8.55,
  aisleMaxZ: 8.55,
  rackMinX: -8.4,
  rackMaxX: 8.4,
  rackDepth: 1.5,
  rackHeight: 2.55,
  bayWidth: 2.4,
  bayCount: 7,
  rowZ: [-5.7, -2.2, 1.3, 4.8],
  rowLabels: ["01", "02", "03", "04"],
  packing: { x: -9.65, z: 7.58, width: 2.6, depth: 1.1, height: 0.96 },
};

export const PRODUCTS = [
  {
    id: "nb01",
    sku: "NB-01",
    name: "A5 notebook",
    qty: 3,
    row: 0,
    bay: 1,
    side: "south",
    color: "#507fbc",
  },
  {
    id: "pn02",
    sku: "PN-02",
    name: "Pen set",
    qty: 2,
    row: 1,
    bay: 5,
    side: "north",
    color: "#df8b38",
  },
  {
    id: "tp03",
    sku: "TP-03",
    name: "Packing tape",
    qty: 1,
    row: 2,
    bay: 1,
    side: "north",
    color: "#b39a65",
  },
  {
    id: "mg04",
    sku: "MG-04",
    name: "Ceramic mug",
    qty: 2,
    row: 3,
    bay: 5,
    side: "north",
    color: "#73a5a0",
  },
  {
    id: "fl05",
    sku: "FL-05",
    name: "Document folder",
    qty: 4,
    row: 1,
    bay: 0,
    side: "south",
    color: "#d4aa3d",
  },
  {
    id: "bx06",
    sku: "BX-06",
    name: "Gift box",
    qty: 1,
    row: 3,
    bay: 3,
    side: "south",
    color: "#b96d70",
  },
];

const STATIC_OBSTACLES = [
  { kind: "rack", x1: WAREHOUSE.rackMinX, x2: WAREHOUSE.rackMaxX, z1: WAREHOUSE.rowZ[0] - WAREHOUSE.rackDepth / 2, z2: WAREHOUSE.rowZ[0] + WAREHOUSE.rackDepth / 2 },
  { kind: "rack", x1: WAREHOUSE.rackMinX, x2: WAREHOUSE.rackMaxX, z1: WAREHOUSE.rowZ[1] - WAREHOUSE.rackDepth / 2, z2: WAREHOUSE.rowZ[1] + WAREHOUSE.rackDepth / 2 },
  { kind: "rack", x1: WAREHOUSE.rackMinX, x2: WAREHOUSE.rackMaxX, z1: WAREHOUSE.rowZ[2] - WAREHOUSE.rackDepth / 2, z2: WAREHOUSE.rowZ[2] + WAREHOUSE.rackDepth / 2 },
  { kind: "rack", x1: WAREHOUSE.rackMinX, x2: WAREHOUSE.rackMaxX, z1: WAREHOUSE.rowZ[3] - WAREHOUSE.rackDepth / 2, z2: WAREHOUSE.rowZ[3] + WAREHOUSE.rackDepth / 2 },
  {
    kind: "packing",
    x1: WAREHOUSE.packing.x - WAREHOUSE.packing.width / 2,
    x2: WAREHOUSE.packing.x + WAREHOUSE.packing.width / 2,
    z1: WAREHOUSE.packing.z - WAREHOUSE.packing.depth / 2,
    z2: WAREHOUSE.packing.z + WAREHOUSE.packing.depth / 2,
  },
];

export const BLOCK_SEGMENTS = [
  {
    id: "a-center",
    label: "Aisle A · center",
    short: "A-C",
    aisle: "Aisle A",
    rect: { x1: -1.35, x2: 1.35, z1: -4.92, z2: -2.98 },
    detour: true,
  },
  {
    id: "a-west",
    label: "Aisle A · near NB-01",
    short: "A-W",
    aisle: "Aisle A",
    rect: { x1: -6.1, x2: -3.8, z1: -4.92, z2: -2.98 },
  },
  {
    id: "b-center",
    label: "Aisle B · center",
    short: "B-C",
    aisle: "Aisle B",
    rect: { x1: -1.35, x2: 1.35, z1: -1.42, z2: 0.52 },
    detour: true,
  },
  {
    id: "b-west",
    label: "Aisle B · near FL-05",
    short: "B-W",
    aisle: "Aisle B",
    rect: { x1: -8.35, x2: -6.15, z1: -1.42, z2: 0.52 },
  },
  {
    id: "b-center-east",
    label: "Aisle B · near TP-03",
    short: "B-E",
    aisle: "Aisle B",
    rect: { x1: -5.9, x2: -3.7, z1: -1.42, z2: 0.52 },
  },
  {
    id: "c-center",
    label: "Aisle C · center",
    short: "C-C",
    aisle: "Aisle C",
    rect: { x1: -1.35, x2: 1.35, z1: 2.02, z2: 4.08 },
    detour: true,
  },
  {
    id: "c-east",
    label: "Aisle C · near MG-04",
    short: "C-E",
    aisle: "Aisle C",
    rect: { x1: 3.45, x2: 6.15, z1: 2.02, z2: 4.08 },
  },
  {
    id: "front-gift",
    label: "Front aisle · near BX-06",
    short: "F-E",
    aisle: "Front aisle",
    rect: { x1: -1.35, x2: 1.35, z1: 5.58, z2: 7.05 },
  },
  {
    id: "west-link",
    label: "West cross-aisle · center",
    short: "W-C",
    aisle: "West cross-aisle",
    rect: { x1: -11.5, x2: -9.55, z1: -1.65, z2: 1.4 },
    detour: true,
  },
];

const PICKER_RADIUS = 0.27;
const CELL_SIZE = 0.2;
const EPS = 0.0001;
const SQRT2 = Math.SQRT2;

export const PACKING_POINT = { x: WAREHOUSE.packing.x, z: WAREHOUSE.packing.z - 1.36 };

export function getRowAisle(row, side) {
  const labels = [
    { south: "A", north: "Rear" },
    { south: "B", north: "A" },
    { south: "C", north: "B" },
    { south: "Front", north: "C" },
  ];
  return labels[row][side];
}

export function getBinPosition(product) {
  const z = WAREHOUSE.rowZ[product.row];
  const x = WAREHOUSE.rackMinX + WAREHOUSE.bayWidth / 2 + product.bay * WAREHOUSE.bayWidth;
  const faceOffset = WAREHOUSE.rackDepth / 2 + 0.59;
  return {
    x,
    z: z + (product.side === "south" ? faceOffset : -faceOffset),
    rackZ: z,
    faceZ: z + (product.side === "south" ? WAREHOUSE.rackDepth / 2 + 0.015 : -WAREHOUSE.rackDepth / 2 - 0.015),
    facing: product.side === "south" ? -1 : 1,
    binCode: `R${WAREHOUSE.rowLabels[product.row]}-B${String(product.bay + 1).padStart(2, "0")}`,
    aisle: getRowAisle(product.row, product.side),
  };
}

export function getBlockedSegment(id) {
  return BLOCK_SEGMENTS.find((segment) => segment.id === id) || null;
}

export function getExpandedRect(rect, radius = PICKER_RADIUS) {
  return {
    x1: rect.x1 - radius,
    x2: rect.x2 + radius,
    z1: rect.z1 - radius,
    z2: rect.z2 + radius,
  };
}

export function getBlockObstacles(blockedIds) {
  return blockedIds.map((id) => {
    const segment = getBlockedSegment(id);
    return segment ? { ...segment.rect, kind: "block", id, segment } : null;
  }).filter(Boolean);
}

function pointInRect(x, z, rect, inset = 0) {
  return x >= rect.x1 + inset && x <= rect.x2 - inset && z >= rect.z1 + inset && z <= rect.z2 - inset;
}

function isPointClear(x, z, obstacles) {
  return !obstacles.some((obstacle) => pointInRect(x, z, getExpandedRect(obstacle)));
}

function segmentClear(a, b, obstacles) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const steps = Math.max(2, Math.ceil(length / 0.075));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!isPointClear(a.x + dx * t, a.z + dz * t, obstacles)) return false;
  }
  return true;
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(node, priority) {
    const item = { node, priority };
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.items[parent].priority <= this.items[current].priority) break;
      [this.items[parent], this.items[current]] = [this.items[current], this.items[parent]];
      current = parent;
    }
  }

  sinkDown(index) {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;
      if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === current) break;
      [this.items[smallest], this.items[current]] = [this.items[current], this.items[smallest]];
      current = smallest;
    }
  }
}

class NavGrid {
  constructor(obstacles) {
    this.obstacles = obstacles;
    this.minX = WAREHOUSE.aisleMinX;
    this.maxX = WAREHOUSE.aisleMaxX;
    this.minZ = WAREHOUSE.aisleMinZ;
    this.maxZ = WAREHOUSE.aisleMaxZ;
    this.cols = Math.floor((this.maxX - this.minX) / CELL_SIZE) + 1;
    this.rows = Math.floor((this.maxZ - this.minZ) / CELL_SIZE) + 1;
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.build();
  }

  build() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const x = this.minX + col * CELL_SIZE;
        const z = this.minZ + row * CELL_SIZE;
        this.blocked[row * this.cols + col] = isPointClear(x, z, this.obstacles) ? 0 : 1;
      }
    }
  }

  toIndex(col, row) {
    return row * this.cols + col;
  }

  toCell(index) {
    const row = Math.floor(index / this.cols);
    const col = index - row * this.cols;
    return {
      col,
      row,
      x: this.minX + col * CELL_SIZE,
      z: this.minZ + row * CELL_SIZE,
    };
  }

  nearestFree(point, maxRadius = 14) {
    const baseCol = Math.round((point.x - this.minX) / CELL_SIZE);
    const baseRow = Math.round((point.z - this.minZ) / CELL_SIZE);
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      let best = null;
      let bestDistance = Infinity;
      for (let dz = -radius; dz <= radius; dz += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
          const col = baseCol + dx;
          const row = baseRow + dz;
          if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
          if (this.blocked[this.toIndex(col, row)]) continue;
          const x = this.minX + col * CELL_SIZE;
          const z = this.minZ + row * CELL_SIZE;
          const distance = (x - point.x) ** 2 + (z - point.z) ** 2;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = { col, row, x, z };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  findPath(start, goal) {
    if (!isPointClear(goal.x, goal.z, this.obstacles)) return null;
    if (!isPointClear(start.x, start.z, this.obstacles)) return null;

    const startCell = this.nearestFree(start);
    const goalCell = this.nearestFree(goal);
    if (!startCell || !goalCell) return null;

    const startIndex = this.toIndex(startCell.col, startCell.row);
    const goalIndex = this.toIndex(goalCell.col, goalCell.row);
    const total = this.cols * this.rows;
    const gScore = new Float64Array(total);
    gScore.fill(Infinity);
    const previous = new Int32Array(total);
    previous.fill(-1);
    const closed = new Uint8Array(total);
    const heap = new MinHeap();

    const heuristic = (index) => {
      const cell = this.toCell(index);
      const dx = Math.abs(cell.col - goalCell.col);
      const dz = Math.abs(cell.row - goalCell.row);
      return (Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz)) * CELL_SIZE;
    };

    gScore[startIndex] = 0;
    heap.push(startIndex, heuristic(startIndex));

    let found = false;
    while (heap.items.length) {
      const entry = heap.pop();
      if (!entry) break;
      const current = entry.node;
      if (closed[current]) continue;
      if (current === goalIndex) {
        found = true;
        break;
      }
      closed[current] = 1;
      const cell = this.toCell(current);
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dz) continue;
          const col = cell.col + dx;
          const row = cell.row + dz;
          if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
          const next = this.toIndex(col, row);
          if (this.blocked[next] || closed[next]) continue;
          if (dx && dz) {
            const sideA = this.blocked[this.toIndex(cell.col + dx, cell.row)];
            const sideB = this.blocked[this.toIndex(cell.col, cell.row + dz)];
            if (sideA || sideB) continue;
          }
          const step = dx && dz ? SQRT2 * CELL_SIZE : CELL_SIZE;
          const tentative = gScore[current] + step;
          if (tentative + EPS < gScore[next]) {
            gScore[next] = tentative;
            previous[next] = current;
            heap.push(next, tentative + heuristic(next));
          }
        }
      }
    }

    if (!found) return null;

    const cells = [];
    let cursor = goalIndex;
    while (cursor !== -1) {
      cells.push(this.toCell(cursor));
      if (cursor === startIndex) break;
      cursor = previous[cursor];
    }
    cells.reverse();

    const raw = [{ x: start.x, z: start.z }];
    cells.forEach((cell) => raw.push({ x: cell.x, z: cell.z }));
    raw.push({ x: goal.x, z: goal.z });

    return simplifyPath(raw, this.obstacles);
  }
}

function simplifyPath(points, obstacles) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let chosen = anchor + 1;
    for (let probe = points.length - 1; probe > anchor + 1; probe -= 1) {
      if (segmentClear(points[anchor], points[probe], obstacles)) {
        chosen = probe;
        break;
      }
    }
    result.push(points[chosen]);
    anchor = chosen;
  }
  return result;
}

function pathDistance(points) {
  let distance = 0;
  for (let i = 1; i < points.length; i += 1) {
    distance += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return distance;
}

export function planRoute(items, blockedIds = []) {
  const blockObstacles = getBlockObstacles(blockedIds);
  const obstacles = [...STATIC_OBSTACLES, ...blockObstacles];
  const nav = new NavGrid(obstacles);
  const blockedSet = new Set(blockedIds);
  const unreachable = [];
  const stops = [];
  const routePoints = [{ x: PACKING_POINT.x, z: PACKING_POINT.z }];
  const stopDistances = [];
  const legDistances = [];
  let current = { ...PACKING_POINT };
  let totalDistance = 0;

  items.forEach((item) => {
    const position = getBinPosition(item);
    const target = { x: position.x, z: position.z };
    const inBlockedSegment = blockObstacles.some((obstacle) => pointInRect(target.x, target.z, getExpandedRect(obstacle)));
    const inRack = STATIC_OBSTACLES.some((obstacle) => pointInRect(target.x, target.z, getExpandedRect(obstacle)));
    let leg = null;

    if (!inBlockedSegment && !inRack) {
      leg = nav.findPath(current, target);
    }

    if (!leg) {
      unreachable.push({
        id: item.id,
        sku: item.sku,
        name: item.name,
        reason: inBlockedSegment ? "Pick face is inside a blocked aisle segment" : "No walkable path to the pick face",
      });
      return;
    }

    for (let i = 1; i < leg.length; i += 1) routePoints.push({ x: leg[i].x, z: leg[i].z });

    const legDistance = pathDistance(leg);
    totalDistance += legDistance;
    legDistances.push({ id: item.id, distance: legDistance });
    stopDistances.push(totalDistance);
    stops.push({
      id: item.id,
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      point: target,
      facing: position.facing,
      position,
      distance: totalDistance,
      routeIndex: routePoints.length - 1,
    });
    current = target;
  });

  if (stops.length || routePoints.length > 1) {
    const returnLeg = nav.findPath(current, PACKING_POINT);
    if (returnLeg) {
      for (let i = 1; i < returnLeg.length; i += 1) routePoints.push({ x: returnLeg[i].x, z: returnLeg[i].z });
      const returnDistance = pathDistance(returnLeg);
      totalDistance += returnDistance;
      legDistances.push({ id: "return", distance: returnDistance });
    }
  }

  return {
    routePoints,
    stops,
    stopDistances,
    legDistances,
    totalDistance,
    unreachable,
    blockedIds: [...blockedSet],
    reachable: unreachable.length === 0 && stops.length === items.length,
  };
}
