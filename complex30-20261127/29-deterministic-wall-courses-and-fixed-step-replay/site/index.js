/* eslint-disable complexity */
import * as ml5 from 'ml5';
import * as THREE from 'three';
import updatePoses from './threeJs/updatePoses';
import SingleHole from './Walls/singleHole';

const DEFAULT_SEED = 193;
const LEVEL_LENGTH = 1000;
const INITIAL_WALL_COUNT = 10;
const WALL_SPACING = 100;
const FLOOR_LENGTH = 1000;
const PAUSE_KEY = 32;

// Gameplay state
let keyboard = {};
let pauseConsumed = false;
let modelLoaded = false;

let player = { height: 1.8, speed: -0.5 };

// Deterministic course state
let manualMode = false;
let courseRandom = createSeededRandom(DEFAULT_SEED);
let wallsPath = [];
let wallsPool = [];
let cameraSpeed = .25;
let cameraNoSpeed = 0;
let wallCount = 1;
let wallsPassed = 0;
let level = 0;
let floor;

// Webcam
let video = document.createElement('video');
let vidDiv = document.getElementById('video');

video.setAttribute('width', 200);
video.setAttribute('height', 200);
video.autoplay = true;

// Scene and camera are created up front so the debug API can work without a pose model
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 10, -35);
camera.rotation.y = Math.PI;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

let light = new THREE.PointLight(0xffffff);

let geometry = new THREE.SphereGeometry(4.5);
let material = new THREE.MeshPhongMaterial({ color: '0x2194ce' });
let head = new THREE.Mesh(geometry, material);
head.position.y += 10;

scene.add(light, head);

// Deterministic course generation
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Consumes exactly three draws: magnitude, sign, width
function nextWall() {
  const magnitude = Math.floor(courseRandom() * 20) + 1;
  const holeX = magnitude * (courseRandom() < 0.5 ? -1 : 1);
  const holeWidth = Math.ceil(courseRandom() * 5) + 10;
  let widthDraws = 0;
  const widthRandom = () => {
    widthDraws++;
    return widthDraws > 1 ? 0 : (holeWidth - 10) / 5;
  };
  const newWall = new SingleHole(holeX, widthRandom, 20);
  newWall.holeX = holeX;
  newWall.holeWidth = holeWidth;
  return newWall;
}

function addWall(newWall, z) {
  newWall.fetchWall().forEach(piece => {
    piece.position.z += z;
    scene.add(piece);
  });
  wallsPath.push(newWall);
}

function createWalls(num, startZ) {
  for (let i = 0; i < num; i++) {
    addWall(nextWall(), startZ + i * WALL_SPACING);
  }
}

function moreWalls(num) {
  let lastWallDistance =
    wallsPath[wallsPath.length - 1].col1.position.z + WALL_SPACING;
  for (let i = 0; i < num; i++) {
    const newWall = nextWall();
    wallsPool.push(newWall);

    newWall.fetchWall().forEach(piece => {
      piece.position.z = lastWallDistance;
      scene.add(piece);
    });
    lastWallDistance += WALL_SPACING;
  }

  wallsPath = [...wallsPath, ...wallsPool];
  wallsPool.length = 0;

  cameraSpeed += 0.2;
}

let startFloor = 500;

function createFloor() {
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, FLOOR_LENGTH, 100, 100),
    new THREE.MeshBasicMaterial({ color: 0x38761d, wireframe: true })
  );
  floor.position.z += startFloor;
  floor.rotation.x -= Math.PI / 2;

  scene.add(floor);
  startFloor += FLOOR_LENGTH;
}

// Course reset
function removeWall(wall) {
  wall.fetchWall().forEach(piece => {
    scene.remove(piece);
    if (piece.geometry) piece.geometry.dispose();
  });
}

function removeCourse() {
  wallsPath.forEach(removeWall);
  wallsPool.forEach(removeWall);
  wallsPath = [];
  wallsPool = [];

  if (floor) {
    scene.remove(floor);
    floor.geometry.dispose();
    floor.material.dispose();
    floor = undefined;
  }
}

function resetCourse(seed = DEFAULT_SEED) {
  manualMode = true;

  removeCourse();

  courseRandom = createSeededRandom(seed);

  startFloor = 500;
  createFloor();
  createWalls(INITIAL_WALL_COUNT, 0);

  camera.position.set(0, 10, -35);
  camera.rotation.y = Math.PI;
  head.position.set(0, 10, 0);
  cameraSpeed = 0.25;
  cameraNoSpeed = 0;
  pauseConsumed = false;
  wallCount = 1;
  wallsPassed = 0;
  level = 0;
}

// Render Loop
const changeXYPosition = (obj, shape) => {
  obj.changeX = obj.x - obj.lastXPosition;
  obj.changeY = obj.y - obj.lastYPosition;

  shape.position.x -= obj.changeX * 0.2;
  camera.position.x -= obj.changeX * 0.2;
  shape.position.y += -(obj.changeY * 0.2);
  obj.lastXPosition = obj.x;
  obj.lastYPosition = obj.y;
};

const generatePath = () => {
  createFloor();
  moreWalls(10);
};

const nextLevel = () => {
  level++;
  wallCount = 0;
  wallsPath = wallsPath.slice(10);
};

function checkForCollision() {
  if (camera.position.z <= 0) {
    wallsPath[0].checkCollision(head);
  }

  if (camera.position.z + 10 >= wallCount * 100 + level * 1000) {
    if (wallCount === 10) {
      wallsPath[0].checkCollision(head);
    } else {
      wallsPath[wallCount].checkCollision(head);
    }
  }
}

// One former gameplay iteration: movement, generation, counters, level transitions
const update = function(frameDriven) {
  if (manualMode && frameDriven) return;

  checkForCollision();

  camera.position.z += cameraSpeed;
  head.position.z += cameraSpeed;

  //Makes more walls when close to the end of current path
  if (camera.position.z > startFloor - 800) {
    generatePath();
  }

  //Keeps count of current wall position
  if (camera.position.z / 100 - level * 10 > wallCount) {
    wallCount++;
    wallsPassed++;
  }

  //Updates current level and normalizes wall position
  if (camera.position.z > LEVEL_LENGTH * (level + 1)) {
    console.log('NEXT LEVEL!!!');
    nextLevel();
  }

  // A key move left
  if (keyboard[65]) {
    camera.position.x -=
      Math.sin(camera.rotation.y - Math.PI / 2) * player.speed;
    camera.position.z -=
      Math.cos(camera.rotation.y - Math.PI / 2) * player.speed;
  }

  // D key move right
  if (keyboard[68]) {
    camera.position.x +=
      Math.sin(camera.rotation.y - Math.PI / 2) * player.speed;
    camera.position.z +=
      Math.cos(camera.rotation.y - Math.PI / 2) * player.speed;
  }

  // W key move forwad
  if (keyboard[87]) {
    camera.position.x += Math.sin(camera.rotation.y) * player.speed;
    camera.position.z += Math.cos(camera.rotation.y) * player.speed;
  }

  // S Key move backwards
  if (keyboard[83]) {
    camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
    camera.position.z -= Math.cos(camera.rotation.y) * player.speed;
  }

  // Left Arrow rotate left
  if (keyboard[37]) {
    camera.rotation.y += Math.PI * 0.01;
  }
  // Right Arrow rotate right
  if (keyboard[39]) {
    camera.rotation.y -= Math.PI * 0.01;
  }

  // Space toggles pause / resume once per press (not gated on the pose model)
  if (!keyboard[PAUSE_KEY]) {
    pauseConsumed = false;
  } else if (!pauseConsumed) {
    pauseConsumed = true;
    [cameraSpeed, cameraNoSpeed] = [cameraNoSpeed, cameraSpeed];
  }
};

let bodyParts = {
  nose: { lastXPosition: 100, lastYPosition: 100, changeX: 1, changeY: 1 },
  leftShoulder: {
    lastXPosition: 100,
    lastYPosition: 100,
    changeX: 1,
    changeY: 1,
  },
  leftElbow: { lastXPosition: 100, lastYPosition: 100, changeX: 1, changeY: 1 },
  leftWrist: { lastXPosition: 100, lastYPosition: 100, changeX: 1, changeY: 1 },
  body: { lastXPosition: 100, lastYPosition: 100, changeX: 1, changeY: 1 },
};

// Build the initial course
resetCourse();
manualMode = false;

const init = function() {
  requestAnimationFrame(init);

  update(true);

  renderer.render(scene, camera);
};

// Debug / replay API, available immediately and independent of webcam and poseNet
function getCourse() {
  return wallsPath.map((wall, index) => ({
    index,
    z: wall.col1.position.z,
    holeX: wall.holeX,
    holeWidth: wall.holeWidth,
  }));
}

function getState() {
  return {
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    head: { x: head.position.x, y: head.position.y, z: head.position.z },
    cameraSpeed,
    wallCount,
    wallsPassed,
    level,
    manualMode,
  };
}

function setManualMode(enabled) {
  manualMode = !!enabled;
}

function step(count) {
  if (!Number.isInteger(count) || count < 1 || count > 10000) {
    throw new RangeError('step(count) requires an integer from 1 through 10000');
  }
  for (let i = 0; i < count; i++) {
    update(false);
  }
  renderer.render(scene, camera);
}

window.runnerDebug = {
  resetCourse,
  getCourse,
  getState,
  setManualMode,
  step,
};

// Webcam pose input (optional; gameplay and the debug API work without it)
navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then(function(stream) {
    video.srcObject = stream;
  })
  .catch(function(err) {
    console.log('An error occurred! ' + err);
  });

let options = {
  flipHorizontal: true,
  minConfidence: 0.5,
};

let poseNet = null;
try {
  poseNet = ml5.poseNet(video, options, modelReady);
} catch (err) {
  console.log('poseNet unavailable: ' + err);
}

function modelReady() {
  modelLoaded = true;
  console.log('model Loaded');
}

if (poseNet) {
  poseNet.on('pose', function(results) {
    let poses = results;
    updatePoses(poses, bodyParts);

    if (bodyParts.nose.x && bodyParts.nose.y) {
      changeXYPosition(bodyParts.nose, head);
    }
  });
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
});

function keyDown(event) {
  keyboard[event.keyCode] = true;
}

function keyUp(event) {
  keyboard[event.keyCode] = false;
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
init();

document.body.onkeyup = function(e) {
  if (modelLoaded) {
    if (e.keyCode === 13) {
      window.location = './camtest/camtest.html';
    }

    if (e.keyCode === 32) {
      document.getElementById('menu').style.display = 'none';
    }
  }

  if (keyboard[27]) {
    window.location = './index.html';
  }

  if (keyboard[18]) {
    window.confirm(
      `Level: ${level} Wall Count: ${wallCount +
        level * 10} Distance: ${Math.floor(camera.position.z) + 35}`
    );
  }
};
