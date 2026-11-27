export const ENEMY_FOOTPRINT_RADIUS = 0.75;
export const SPAWN_MARGIN = 0.75;
export const MIN_SPAWN_SEPARATION = 1.5;
export const WORLD_HALF_EXTENT = 49.25;
export const ANGLE_STEPS = 32;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clonePoint(point, label) {
  if (!Array.isArray(point) || point.length !== 2 || !isFiniteNumber(point[0]) || !isFiniteNumber(point[1])) {
    throw new RangeError(`${label} must be a finite [x, z] pair`);
  }

  return [point[0], point[1]];
}

function cloneObstacle(obstacle, index) {
  if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle)) {
    throw new RangeError(`obstacles[${index}] must be an object`);
  }

  const min = clonePoint(obstacle.min, `obstacles[${index}].min`);
  const max = clonePoint(obstacle.max, `obstacles[${index}].max`);

  if (min[0] > max[0] || min[1] > max[1]) {
    throw new RangeError(`obstacles[${index}] bounds must be ordered`);
  }

  return {
    id: obstacle.id,
    min,
    max
  };
}

export function validateSpawnRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new RangeError('request must be an object');
  }

  if (!Number.isInteger(request.count) || request.count < 0 || request.count > 16) {
    throw new RangeError('count must be an integer from 0 through 16');
  }

  if (!Number.isInteger(request.minDistance) || !Number.isInteger(request.maxDistance)) {
    throw new RangeError('minDistance and maxDistance must be integers');
  }

  if (request.minDistance < 0 || request.maxDistance < request.minDistance || request.maxDistance > 100) {
    throw new RangeError('distances must satisfy 0 <= minDistance <= maxDistance <= 100');
  }

  const player = clonePoint(request.player, 'player');

  if (!Array.isArray(request.obstacles)) {
    throw new RangeError('obstacles must be an array');
  }

  const obstacles = request.obstacles.map(cloneObstacle);

  if (!Array.isArray(request.occupied)) {
    throw new RangeError('occupied must be an array');
  }

  const occupied = request.occupied.map((point, index) => clonePoint(point, `occupied[${index}]`));

  return {
    count: request.count,
    minDistance: request.minDistance,
    maxDistance: request.maxDistance,
    player,
    obstacles,
    occupied
  };
}

function distanceSquared2D(x, z, point) {
  const dx = x - point[0];
  const dz = z - point[1];
  return dx * dx + dz * dz;
}

function isInsideExpandedObstacle(x, z, obstacle) {
  return x >= obstacle.min[0] - SPAWN_MARGIN &&
    x <= obstacle.max[0] + SPAWN_MARGIN &&
    z >= obstacle.min[1] - SPAWN_MARGIN &&
    z <= obstacle.max[1] + SPAWN_MARGIN;
}

export function planSpawn(request) {
  const validated = validateSpawnRequest(request);
  const positions = [];
  const planned = [];
  const occupied = validated.occupied.map((point) => [point[0], point[1]]);
  const minSeparationSquared = MIN_SPAWN_SEPARATION * MIN_SPAWN_SEPARATION;
  let missing = 0;

  for (let enemyIndex = 0; enemyIndex < validated.count; enemyIndex++) {
    let selected = null;

    for (let radius = validated.maxDistance; radius >= validated.minDistance; radius--) {
      for (let angleIndex = 0; angleIndex < ANGLE_STEPS; angleIndex++) {
        const angle = (2 * Math.PI * angleIndex) / ANGLE_STEPS;
        const x = validated.player[0] + radius * Math.sin(angle);
        const z = validated.player[1] + radius * Math.cos(angle);

        if (Math.abs(x) > WORLD_HALF_EXTENT || Math.abs(z) > WORLD_HALF_EXTENT) {
          continue;
        }

        if (validated.obstacles.some((obstacle) => isInsideExpandedObstacle(x, z, obstacle))) {
          continue;
        }

        if (occupied.some((point) => distanceSquared2D(x, z, point) < minSeparationSquared)) {
          continue;
        }

        if (planned.some((point) => distanceSquared2D(x, z, point) < minSeparationSquared)) {
          continue;
        }

        selected = [x, z];
        break;
      }

      if (selected) {
        break;
      }
    }

    if (!selected) {
      missing++;
      continue;
    }

    positions.push([selected[0], 0.5, selected[1]]);
    planned.push(selected);
  }

  return { positions, missing };
}

export class SpawnPlanner {
  plan(request) {
    return planSpawn(request);
  }
}
