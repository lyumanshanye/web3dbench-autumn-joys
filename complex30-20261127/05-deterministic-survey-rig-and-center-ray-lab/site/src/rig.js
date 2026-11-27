import * as THREE from 'three';

export const TARGET_DEFS = [
  { id: 'A', position: [0, 1.6, -6] },
  { id: 'B', position: [4, 1.6, -6] },
  { id: 'C', position: [-4, 1.6, -8] },
];
export const TARGET_COLOR = 0x3388ff;
export const SELECTED_COLOR = 0xffcc00;
export const EYE_MIN = 0.5;
export const EYE_MAX = 4;
export const INITIAL_EYE_HEIGHT = 1.6;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const EPSILON = 1e-5;

const FLAGS = ['forward', 'backward', 'left', 'right', 'up', 'down'];

function finiteOrThrow(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

export function createSurveyRig(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111820);

  const camera = new THREE.PerspectiveCamera(
    60,
    CANVAS_WIDTH / CANVAS_HEIGHT,
    0.1,
    200
  );

  const yaw = new THREE.Object3D();
  yaw.name = 'yaw';
  const pitch = new THREE.Object3D();
  pitch.name = 'pitch';
  yaw.add(pitch);
  pitch.add(camera);
  scene.add(yaw);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: 0x29333d, side: THREE.DoubleSide })
  );
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.userData.role = 'ground';
  scene.add(ground);

  const grid = new THREE.GridHelper(40, 40, 0x6f8294, 0x3b4855);
  grid.name = 'grid';
  grid.userData.role = 'grid';
  scene.add(grid);

  const targets = TARGET_DEFS.map(({ id, position }) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: TARGET_COLOR })
    );
    mesh.name = `target-${id}`;
    mesh.userData.id = id;
    mesh.userData.role = 'target';
    mesh.position.fromArray(position);
    scene.add(mesh);
    return mesh;
  });

  yaw.position.set(0, 0, 0);
  yaw.rotation.set(0, 0, 0);
  pitch.position.set(0, 0, 0);
  pitch.rotation.set(0, 0, 0);
  camera.position.set(0, INITIAL_EYE_HEIGHT, 0);
  camera.quaternion.identity();
  camera.updateMatrixWorld(true);

  const input = Object.fromEntries(FLAGS.map((flag) => [flag, false]));
  let selectedId = null;
  const raycaster = new THREE.Raycaster();
  const ndcCenter = new THREE.Vector2(0, 0);

  function setMaterialColor(mesh, color) {
    mesh.material.color.setHex(color);
  }

  function getState() {
    return {
      yawPosition: [yaw.position.x, yaw.position.y, yaw.position.z],
      yawAngle: yaw.rotation.y,
      pitchAngle: pitch.rotation.x,
      eyeHeight: camera.position.y,
      forward: input.forward,
      backward: input.backward,
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      selectedId,
    };
  }

  function setInput(state) {
    const source = state !== null && typeof state === 'object' ? state : {};
    for (const flag of FLAGS) input[flag] = source[flag] === true;
  }

  function step(dt) {
    finiteOrThrow(dt, 'dt');
    if (dt < 0 || dt > 1) {
      throw new RangeError('dt must be in the range [0, 1]');
    }

    const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const z = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
    const length = Math.hypot(x, z);
    const scale = length > 1 ? 1 / length : 1;

    if (x !== 0 || z !== 0) {
      yaw.translateX(4 * x * scale * dt);
      yaw.translateZ(4 * z * scale * dt);
    }

    const vertical = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    if (vertical !== 0) {
      const clamped = THREE.MathUtils.clamp(
        camera.position.y + 2 * vertical * dt,
        EYE_MIN,
        EYE_MAX
      );
      camera.position.y = clamped;
    }
    yaw.updateMatrixWorld(true);
  }

  function look(dx, dy, shiftHeld) {
    if (shiftHeld) {
      finiteOrThrow(dx, 'dx');
      finiteOrThrow(dy, 'dy');
    } else {
      return;
    }

    yaw.rotation.y -= dx * 0.002;
    pitch.rotation.x = THREE.MathUtils.clamp(
      pitch.rotation.x - dy * 0.002,
      -Math.PI / 2,
      Math.PI / 2
    );
    yaw.updateMatrixWorld(true);
  }

  function pickCenter() {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(ndcCenter, camera);
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;

    const hit = hits[0];
    selectedId = hit.object.userData.id;
    for (const target of targets) {
      setMaterialColor(
        target,
        target.userData.id === selectedId ? SELECTED_COLOR : TARGET_COLOR
      );
    }

    return {
      id: selectedId,
      point: [hit.point.x, hit.point.y, hit.point.z],
      distance: hit.distance,
    };
  }

  function reset() {
    scene.updateMatrixWorld(true);
    for (const flag of FLAGS) input[flag] = false;
    selectedId = null;

    yaw.position.set(0, 0, 0);
    yaw.rotation.set(0, 0, 0);
    pitch.position.set(0, 0, 0);
    pitch.rotation.set(0, 0, 0);
    camera.position.set(0, INITIAL_EYE_HEIGHT, 0);
    camera.quaternion.identity();

    for (const target of targets) {
      target.position.fromArray(
        TARGET_DEFS.find((def) => def.id === target.userData.id).position
      );
      target.rotation.set(0, 0, 0);
      target.scale.set(1, 1, 1);
      setMaterialColor(target, TARGET_COLOR);
    }
    yaw.updateMatrixWorld(true);
  }

  return {
    scene,
    camera,
    renderer: null,
    yaw,
    pitch,
    targets,
    setInput,
    step,
    look,
    pickCenter,
    reset,
    getState,
  };
}
