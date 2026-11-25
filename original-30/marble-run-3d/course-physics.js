import * as CANNON from 'cannon-es';
import {
  MARBLE_RADIUS,
  START,
  BASIN,
  KICKER,
  buildCourseLayout,
} from './course-data.js';

const WORLD_GRAVITY = -15.5;

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function quaternionFromBasis(xAxis, yAxis, zAxis) {
  const m00 = xAxis.x, m01 = yAxis.x, m02 = zAxis.x;
  const m10 = xAxis.y, m11 = yAxis.y, m12 = zAxis.y;
  const m20 = xAxis.z, m21 = yAxis.z, m22 = zAxis.z;
  const trace = m00 + m11 + m22;
  let x;
  let y;
  let z;
  let w;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }

  return { x, y, z, w };
}

export function segmentFrame(segment) {
  const direction = normalize({
    x: segment.b.x - segment.a.x,
    y: segment.b.y - segment.a.y,
    z: segment.b.z - segment.a.z,
  });
  const side = normalize(cross({ x: 0, y: 1, z: 0 }, direction));
  const normal = normalize(cross(direction, side));
  const midpoint = {
    x: (segment.a.x + segment.b.x) / 2,
    y: (segment.a.y + segment.b.y) / 2,
    z: (segment.a.z + segment.b.z) / 2,
  };
  const length = Math.hypot(
    segment.b.x - segment.a.x,
    segment.b.y - segment.a.y,
    segment.b.z - segment.a.z,
  );

  return {
    direction,
    side,
    normal,
    midpoint,
    length,
    quaternion: quaternionFromBasis(side, normal, direction),
  };
}

function applyBodyTransform(body, position, quaternion) {
  body.position.set(position.x, position.y, position.z);
  body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
}

function addBoxBody(world, material, position, halfExtents, quaternion) {
  const body = new CANNON.Body({
    mass: 0,
    material,
    shape: new CANNON.Box(new CANNON.Vec3(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    )),
  });
  applyBodyTransform(body, position, quaternion);
  world.addBody(body);
  return body;
}

export function createPhysicsWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, WORLD_GRAVITY, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 14;
  world.solver.tolerance = 0.001;
  world.defaultContactMaterial.friction = 0.2;
  world.defaultContactMaterial.restitution = 0.15;

  const materials = {
    marble: new CANNON.Material('marble'),
    track: new CANNON.Material('track'),
    rail: new CANNON.Material('rail'),
    basin: new CANNON.Material('basin'),
  };

  world.addContactMaterial(new CANNON.ContactMaterial(materials.marble, materials.track, {
    friction: 0.15,
    restitution: 0.18,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 4,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(materials.marble, materials.rail, {
    friction: 0.06,
    restitution: 0.38,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 4,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(materials.marble, materials.basin, {
    friction: 0.48,
    restitution: 0.12,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 4,
  }));

  return { world, materials };
}

export function addSegmentBodies(world, materials, segment) {
  const frame = segmentFrame(segment);
  const bodies = [];
  const deckPosition = {
    x: frame.midpoint.x - frame.normal.x * segment.thickness * 0.5,
    y: frame.midpoint.y - frame.normal.y * segment.thickness * 0.5,
    z: frame.midpoint.z - frame.normal.z * segment.thickness * 0.5,
  };
  const length = frame.length + 0.075;
  const deck = addBoxBody(
    world,
    materials.track,
    deckPosition,
    { x: segment.width * 0.5, y: segment.thickness * 0.5, z: length * 0.5 },
    frame.quaternion,
  );
  bodies.push(deck);

  if (segment.rails) {
    for (const sideSign of [-1, 1]) {
      const lateral = segment.width * 0.5 - segment.railThickness * 0.5;
      const railPosition = {
        x: frame.midpoint.x + frame.side.x * lateral * sideSign + frame.normal.x * segment.railHeight * 0.5,
        y: frame.midpoint.y + frame.side.y * lateral * sideSign + frame.normal.y * segment.railHeight * 0.5,
        z: frame.midpoint.z + frame.side.z * lateral * sideSign + frame.normal.z * segment.railHeight * 0.5,
      };
      const rail = addBoxBody(
        world,
        materials.rail,
        railPosition,
        {
          x: segment.railThickness * 0.5,
          y: segment.railHeight * 0.5,
          z: length * 0.5,
        },
        frame.quaternion,
      );
      bodies.push(rail);
    }
  }

  bodies.forEach((body) => {
    body.userData = { kind: 'track', stage: segment.stage };
  });
  return bodies;
}

export function addCourseBodies(world, materials, layout) {
  const bodies = [];
  layout.segments.forEach((segment) => {
    bodies.push(...addSegmentBodies(world, materials, segment));
  });
  bodies.push(...addBasinBodies(world, materials));
  return bodies;
}

export function addBasinBodies(world, materials) {
  const bodies = [];
  const floor = new CANNON.Body({
    mass: 0,
    material: materials.basin,
    shape: new CANNON.Cylinder(BASIN.floorRadius, BASIN.floorRadius, 0.2, 32),
  });
  floor.position.set(BASIN.center.x, BASIN.floorTop - 0.1, BASIN.center.z);
  world.addBody(floor);
  floor.userData = { kind: 'basin' };
  bodies.push(floor);

  const panelCount = 24;
  const panelLength = (Math.PI * 2 * BASIN.outerRadius / panelCount) * 1.12;
  for (let i = 0; i < panelCount; i++) {
    const angle = (i / panelCount) * Math.PI * 2;
    let angleDelta = Math.atan2(
      Math.sin(angle - BASIN.entryAngle),
      Math.cos(angle - BASIN.entryAngle),
    );
    if (Math.abs(angleDelta) < 0.47) continue;

    const position = {
      x: BASIN.center.x + Math.cos(angle) * BASIN.outerRadius,
      y: BASIN.floorTop + BASIN.wallHeight * 0.5,
      z: BASIN.center.z + Math.sin(angle) * BASIN.outerRadius,
    };
    const tangent = { x: -Math.sin(angle), y: 0, z: Math.cos(angle) };
    const radial = { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
    const up = { x: 0, y: 1, z: 0 };
    const q = quaternionFromBasis(tangent, up, radial);
    const wall = addBoxBody(
      world,
      materials.basin,
      position,
      { x: panelLength * 0.5, y: BASIN.wallHeight * 0.5, z: 0.075 },
      q,
    );
    wall.userData = { kind: 'basin' };
    bodies.push(wall);
  }

  return bodies;
}

export function createMarbleBody(materials) {
  const body = new CANNON.Body({
    mass: 1,
    material: materials.marble,
    shape: new CANNON.Sphere(MARBLE_RADIUS),
    position: new CANNON.Vec3(START.spawn.x, START.spawn.y, START.spawn.z),
    linearDamping: 0.006,
    angularDamping: 0.035,
  });
  body.allowSleep = false;
  body.userData = { kind: 'marble' };
  return body;
}

export function resetMarble(body) {
  body.position.set(START.spawn.x, START.spawn.y, START.spawn.z);
  body.previousPosition.copy(body.position);
  body.interpolatedPosition.copy(body.position);
  body.quaternion.set(0, 0, 0, 1);
  body.previousQuaternion.copy(body.quaternion);
  body.interpolatedQuaternion.copy(body.quaternion);
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.force.setZero();
  body.torque.setZero();
  body.wakeUp();
}

export function launchMarble(body, impulse) {
  resetMarble(body);
  const direction = new CANNON.Vec3(0, -0.045, 1);
  direction.normalize();
  body.applyImpulse(
    new CANNON.Vec3(direction.x * impulse, direction.y * impulse, direction.z * impulse),
    new CANNON.Vec3(0, 0, 0),
  );
}

export function buildSimulation(rampAngle) {
  const { world, materials } = createPhysicsWorld();
  const layout = buildCourseLayout(rampAngle);
  addCourseBodies(world, materials, layout);
  const marble = createMarbleBody(materials);
  world.addBody(marble);
  return { world, materials, layout, marble };
}

export function kickerSegment(layout) {
  return layout.segments.find((segment) => segment.stage === 'kicker');
}

export { KICKER };
