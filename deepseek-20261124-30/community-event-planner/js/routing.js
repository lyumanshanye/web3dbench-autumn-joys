import { PARK, isFacility } from './data.js';

const GRID_SIZE = 1;
const PERSON_CLEARANCE = 0.45;
const COLUMNS = Math.round((PARK.maxX - PARK.minX) / GRID_SIZE);
const ROWS = Math.round((PARK.maxZ - PARK.minZ) / GRID_SIZE);

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(value, priority) {
    const item = { value, priority };
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return first.value;
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
      if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) {
        smallest = left;
      }
      if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) {
        smallest = right;
      }
      if (smallest === current) break;
      [this.items[smallest], this.items[current]] = [this.items[current], this.items[smallest]];
      current = smallest;
    }
  }

  get length() {
    return this.items.length;
  }
}

function cellCenter(index) {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    x: PARK.minX + (col + 0.5) * GRID_SIZE,
    z: PARK.minZ + (row + 0.5) * GRID_SIZE
  };
}

function cellIndex(col, row) {
  return row * COLUMNS + col;
}

function nearestCell(x, z) {
  const col = Math.max(0, Math.min(COLUMNS - 1, Math.floor((x - PARK.minX) / GRID_SIZE)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor((z - PARK.minZ) / GRID_SIZE)));
  return cellIndex(col, row);
}

function localCoordinates(object, x, z) {
  const angle = (object.rotation * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = x - object.x;
  const dz = z - object.z;
  return {
    x: dx * c - dz * s,
    z: dx * s + dz * c
  };
}

function hitsEquipment(object, x, z, clearance = PERSON_CLEARANCE) {
  const local = localCoordinates(object, x, z);
  return (
    Math.abs(local.x) <= object.width / 2 + clearance &&
    Math.abs(local.z) <= object.depth / 2 + clearance
  );
}

function inStepShortcut(x, z) {
  const hedge = PARK.hedge;
  return x >= hedge.stepMinX && x <= hedge.stepMaxX && Math.abs(z - hedge.z) <= 1.15;
}

function inLevelGap(x, z) {
  const hedge = PARK.hedge;
  return x >= hedge.gapMinX && x <= hedge.gapMaxX && Math.abs(z - hedge.z) <= 1.25;
}

function buildBlockedGrid(equipment, mode) {
  const blocked = new Uint8Array(COLUMNS * ROWS);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const index = cellIndex(col, row);
      const { x, z } = cellCenter(index);

      for (const tree of PARK.trees) {
        const dx = x - tree.x;
        const dz = z - tree.z;
        if (Math.hypot(dx, dz) < tree.r + PERSON_CLEARANCE) {
          blocked[index] = 1;
          break;
        }
      }
      if (blocked[index]) continue;

      if (Math.abs(z - PARK.hedge.z) <= 1.0) {
        const stepAllowed = mode === 'pedestrian' && inStepShortcut(x, z);
        const gapAllowed = inLevelGap(x, z);
        if (!stepAllowed && !gapAllowed) blocked[index] = 1;
      }
      if (blocked[index]) continue;

      for (const object of equipment) {
        if (hitsEquipment(object, x, z)) {
          blocked[index] = 1;
          break;
        }
      }
    }
  }

  return blocked;
}

function walkableNearest(blocked, x, z, radius = 5) {
  const centerIndex = nearestCell(x, z);
  if (!blocked[centerIndex]) {
    const point = cellCenter(centerIndex);
    return { index: centerIndex, ...point };
  }

  const center = cellCenter(centerIndex);
  const centerCol = centerIndex % COLUMNS;
  const centerRow = Math.floor(centerIndex / COLUMNS);
  let best = null;
  for (let row = Math.max(0, centerRow - radius); row <= Math.min(ROWS - 1, centerRow + radius); row += 1) {
    for (let col = Math.max(0, centerCol - radius); col <= Math.min(COLUMNS - 1, centerCol + radius); col += 1) {
      const index = cellIndex(col, row);
      if (blocked[index]) continue;
      const point = cellCenter(index);
      const distance = Math.hypot(point.x - center.x, point.z - center.z);
      if (!best || distance < best.distance) best = { index, ...point, distance };
    }
  }
  return best;
}

function goalCells(blocked, target) {
  const margin = 1.35;
  const goals = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const index = cellIndex(col, row);
      if (blocked[index]) continue;
      const { x, z } = cellCenter(index);
      if (
        Math.abs(x - target.x) <= target.width / 2 + margin &&
        Math.abs(z - target.z) <= target.depth / 2 + margin
      ) {
        if (!hitsEquipment(target, x, z, 0.35)) {
          goals.push({ index, x, z });
        }
      }
    }
  }
  return goals;
}

function reconstructPath(cameFrom, goalIndex) {
  const path = [];
  let current = goalIndex;
  while (current !== -1) {
    path.push(cellCenter(current));
    current = cameFrom[current];
  }
  return path.reverse();
}

function simplifyPath(path) {
  if (path.length < 3) return path;
  const simplified = [path[0]];
  for (let i = 1; i < path.length - 1; i += 1) {
    const previous = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const firstDirection = {
      x: Math.sign(Math.round(current.x - previous.x)),
      z: Math.sign(Math.round(current.z - previous.z))
    };
    const secondDirection = {
      x: Math.sign(Math.round(next.x - current.x)),
      z: Math.sign(Math.round(next.z - current.z))
    };
    if (firstDirection.x !== secondDirection.x || firstDirection.z !== secondDirection.z) {
      simplified.push(current);
    }
  }
  simplified.push(path[path.length - 1]);
  return simplified;
}

function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  }
  return total;
}

function astar(blocked, start, goals) {
  const goalSet = new Set(goals.map((goal) => goal.index));
  const goalByIndex = new Map(goals.map((goal) => [goal.index, goal]));
  const cameFrom = new Int32Array(COLUMNS * ROWS).fill(-1);
  const gScore = new Float32Array(COLUMNS * ROWS).fill(Infinity);
  const closed = new Uint8Array(COLUMNS * ROWS);
  const open = new MinHeap();

  gScore[start.index] = 0;
  open.push(start.index, 0);

  const neighbours = [
    [-1, 0, 1],
    [1, 0, 1],
    [0, -1, 1],
    [0, 1, 1]
  ];

  while (open.length) {
    const current = open.pop();
    if (closed[current]) continue;
    if (goalSet.has(current)) {
      return {
        path: reconstructPath(cameFrom, current),
        goal: goalByIndex.get(current)
      };
    }
    closed[current] = 1;

    const col = current % COLUMNS;
    const row = Math.floor(current / COLUMNS);
    for (const [dc, dr, cost] of neighbours) {
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (nextCol < 0 || nextCol >= COLUMNS || nextRow < 0 || nextRow >= ROWS) continue;
      const next = cellIndex(nextCol, nextRow);
      if (blocked[next] || closed[next]) continue;
      const tentative = gScore[current] + cost;
      if (tentative >= gScore[next]) continue;
      cameFrom[next] = current;
      gScore[next] = tentative;
      open.push(next, tentative);
    }
  }

  return null;
}

export function computeRoute({ equipment, start = 'west', mode = 'pedestrian', targetId }) {
  const target = equipment.find((object) => object.id === targetId);
  const entrance = PARK.entrances.find((item) => item.id === start) || PARK.entrances[0];
  const baseResult = {
    status: 'no-route',
    distance: null,
    path: [],
    startId: entrance.id,
    entranceName: entrance.name,
    mode,
    targetId: targetId || null,
    targetName: target?.name || 'No facility selected',
    reason: '',
    usedShortcut: false
  };

  if (!target) {
    return { ...baseResult, reason: 'Select a facility to calculate a walking route.' };
  }
  if (!isFacility(target)) {
    return { ...baseResult, reason: 'Access barriers are obstacles, not destinations. Select a facility.' };
  }

  const blocked = buildBlockedGrid(equipment, mode);
  const startCell = walkableNearest(blocked, entrance.x + Math.sign(entrance.x) * -1.5, entrance.z, 6);
  if (!startCell) {
    return { ...baseResult, reason: `${entrance.name} is blocked by placed equipment or site obstacles.` };
  }

  const goals = goalCells(blocked, target)
    .map((goal) => ({
      ...goal,
      approach: Math.abs(goal.x - startCell.x) + Math.abs(goal.z - startCell.z)
    }))
    .sort((a, b) => a.approach - b.approach)
    .slice(0, 80);

  if (!goals.length) {
    return {
      ...baseResult,
      reason: `${target.name} is fully enclosed. There is no walkable edge to approach.`
    };
  }

  const search = astar(blocked, startCell, goals);
  if (!search) {
    const modeText = mode === 'step-free' ? 'step-free' : 'pedestrian';
    return {
      ...baseResult,
      reason: `No ${modeText} route from ${entrance.name} to ${target.name}. Equipment or fixed obstacles block every approach.`
    };
  }

  const entrancePoint = { x: entrance.x + Math.sign(entrance.x) * -0.7, z: entrance.z };
  const rawPath = [entrancePoint, ...search.path];
  const path = simplifyPath(rawPath);
  const distance = pathLength(rawPath);
  const usedShortcut = rawPath.some((point) => inStepShortcut(point.x, point.z));
  const accessLabel = mode === 'step-free' ? 'step-free' : 'pedestrian';

  return {
    ...baseResult,
    status: 'ok',
    distance,
    path,
    goal: { x: search.goal.x, z: search.goal.z },
    usedShortcut,
    reason: `${accessLabel} route via ${usedShortcut ? 'the stepped shortcut' : 'level site paths'}`
  };
}

export const NAVIGATION_MODEL = Object.freeze({
  gridSize: GRID_SIZE,
  clearance: PERSON_CLEARANCE,
  columns: COLUMNS,
  rows: ROWS,
  algorithm: '4-direction A*',
  pedestrianShortcut: true,
  stepFreeShortcut: false
});
