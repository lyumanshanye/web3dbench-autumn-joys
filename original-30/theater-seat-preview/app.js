import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SEATS_PER_ROW = 12;
const SEAT_SPACING = 1.18;
const ROW_GAP = 1.82;
const FIRST_ROW_Z = -4.9;
const ROW_RISE = 0.34;
const MAX_PARTY = 6;

const ROW_PRICES = [58, 56, 50, 48, 42, 40, 34, 32];
const RESERVED_IDS = new Set([
  'A4', 'A10', 'B2', 'B11', 'C6', 'D3', 'D9', 'E6', 'F2', 'F11', 'G5', 'G10', 'H4', 'H8'
]);
const LIMITED_IDS = new Set(['F1', 'F12', 'G1', 'G12', 'H1', 'H12']);

const seats = [];
const seatById = new Map();
const seatButtons = new Map();

ROWS.forEach((row, rowIndex) => {
  for (let number = 1; number <= SEATS_PER_ROW; number += 1) {
    const id = `${row}${number}`;
    const limited = LIMITED_IDS.has(id);
    const price = limited ? 26 : ROW_PRICES[rowIndex];
    const seat = {
      id,
      row,
      rowIndex,
      number,
      limited,
      reserved: RESERVED_IDS.has(id),
      price,
      x: (number - (SEATS_PER_ROW + 1) / 2) * SEAT_SPACING,
      z: FIRST_ROW_Z + rowIndex * ROW_GAP,
      floorY: 0.18 + rowIndex * ROW_RISE
    };
    seats.push(seat);
    seatById.set(id, seat);
  }
});

const sceneContainer = document.querySelector('#scene-container');
const canvas = document.querySelector('#scene-canvas');
const stageCard = document.querySelector('.stage-card');
const houseViewButton = document.querySelector('#house-view');
const seatHint = document.querySelector('#seat-hint');
const availableCount = document.querySelector('#available-count');
const previewCard = document.querySelector('#preview-card');
const previewEmpty = document.querySelector('#preview-empty');
const previewContent = document.querySelector('#preview-content');
const viewSeatBadge = document.querySelector('#view-seat-badge');
const viewSeatName = document.querySelector('#view-seat-name');
const viewSeatMeta = document.querySelector('#view-seat-meta');
const viewPrice = document.querySelector('#view-price');
const viewNote = document.querySelector('#view-note');
const compareBanner = document.querySelector('#compare-banner');
const comparePinnedLabel = document.querySelector('#compare-pinned-label');
const addSeatButton = document.querySelector('#add-seat');
const compareSeatButton = document.querySelector('#compare-seat');
const seatMapElement = document.querySelector('#seat-map');
const orderEmpty = document.querySelector('#order-empty');
const orderSeatsElement = document.querySelector('#order-seats');
const orderTotalElement = document.querySelector('#order-total');
const seatCountElement = document.querySelector('#seat-count');
const clearSeatsButton = document.querySelector('#clear-seats');
const reviewButton = document.querySelector('#review-booking');
const toastElement = document.querySelector('#toast');
const compareOverlay = document.querySelector('#compare-overlay');
const compareALabel = document.querySelector('#compare-a-label');
const compareBLabel = document.querySelector('#compare-b-label');
const exitCompareButton = document.querySelector('#exit-compare');
const sceneLoader = document.querySelector('#scene-loader');
const summaryDialog = document.querySelector('#summary-dialog');
const closeSummaryButton = document.querySelector('#close-summary');
const summaryDoneButton = document.querySelector('#summary-done');
const summaryParty = document.querySelector('#summary-party');
const summaryReference = document.querySelector('#summary-reference');
const summarySeats = document.querySelector('#summary-seats');
const summaryLines = document.querySelector('#summary-lines');
const summaryTotal = document.querySelector('#summary-total');

const selectedSeats = [];
let activeSeat = null;
let compareA = null;
let compareB = null;
let comparePending = false;
let viewMode = 'overview';
let cameraTween = null;
let toastTimer = null;
let bookingReference = null;

const clamp = THREE.MathUtils.clamp;
const easeInOut = (value) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;
const formatPrice = (value) => `$${value}`;
const isCompact = () => window.innerWidth <= 820;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initializeSeatMap();
initializeScene();
updateInterface();
requestAnimationFrame(() => sceneLoader.classList.add('is-hidden'));

function initializeSeatMap() {
  const fragment = document.createDocumentFragment();

  ROWS.forEach((row) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'seat-row';

    const leftLabel = document.createElement('span');
    leftLabel.className = 'row-label';
    leftLabel.textContent = row;

    const seatsContainer = document.createElement('div');
    seatsContainer.className = 'row-seats';

    for (let number = 1; number <= SEATS_PER_ROW; number += 1) {
      const seat = seatById.get(`${row}${number}`);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'seat-button';
      button.dataset.seatId = seat.id;
      button.addEventListener('click', () => handleSeatSelection(seat));
      seatButtons.set(seat.id, button);
      seatsContainer.append(button);
    }

    const rightLabel = leftLabel.cloneNode(true);
    rightLabel.textContent = row;
    rowElement.append(leftLabel, seatsContainer, rightLabel);
    fragment.append(rowElement);
  });

  seatMapElement.append(fragment);
}

function initializeScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = !prefersReducedMotion;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x090c10, 27, 67);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const compareCamera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 14;
  controls.maxDistance = 42;
  controls.minPolarAngle = Math.PI * 0.29;
  controls.maxPolarAngle = Math.PI * 0.505;
  controls.target.set(0, 2.4, -4.2);

  const world = buildAuditorium();
  scene.add(world.group);

  const seatVisuals = world.seatVisuals;
  const ring = world.ring;
  const particles = world.particles;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;
  let cameraAspect = 1;
  let sceneWidth = 1;
  let sceneHeight = 1;

  const state = {
    renderer,
    scene,
    camera,
    compareCamera,
    controls,
    raycaster,
    pointer,
    seatVisuals,
    ring,
    particles,
    clock: new THREE.Clock(),
    elapsed: performance.now() / 1000,
    sceneWidth,
    sceneHeight,
    cameraAspect
  };
  window.__orpheumScene = state;

  refreshSeatColors();
  fitSceneToContainer(true);
  resizeScene();
  animateScene(state, 0);

  const resizeObserver = new ResizeObserver(() => resizeScene());
  resizeObserver.observe(sceneContainer);

  function resizeScene() {
    const width = Math.max(1, sceneContainer.clientWidth);
    const height = Math.max(1, sceneContainer.clientHeight);
    sceneWidth = width;
    sceneHeight = height;
    cameraAspect = width / height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.7 : 2));
    renderer.setSize(width, height, false);

    if (viewMode === 'overview') {
      const pose = getOverviewPose(width, height);
      camera.fov = pose.fov;
      camera.aspect = cameraAspect;
      camera.updateProjectionMatrix();
      if (!cameraTween) {
        camera.position.copy(pose.position);
        controls.target.copy(pose.target);
        camera.lookAt(pose.target);
      }
    } else if (viewMode === 'compare') {
      configureCompareCameras();
    } else if (activeSeat) {
      const pose = getEyePose(activeSeat);
      camera.aspect = cameraAspect;
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      if (!cameraTween) {
        camera.position.copy(pose.position);
        camera.lookAt(pose.target);
      }
    } else {
      camera.aspect = cameraAspect;
      camera.updateProjectionMatrix();
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 8) return;

    const seat = pickSeat(event);
    if (seat) handleSeatSelection(seat);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.buttons) return;
    const seat = pickSeat(event, true);
    canvas.classList.toggle('is-picking', Boolean(seat && !seat.reserved));
  });

  canvas.addEventListener('pointerleave', () => {
    canvas.classList.remove('is-picking');
    pointerStart = null;
  });

  function pickSeat(event, hoverOnly = false) {
    const rect = canvas.getBoundingClientRect();
    const localX = (event.clientX - rect.left) / rect.width;
    const localY = (event.clientY - rect.top) / rect.height;
    if (localX < 0 || localX > 1 || localY < 0 || localY > 1) return null;

    let pointerCamera = camera;
    let ndcX = localX * 2 - 1;
    let ndcY = -(localY * 2 - 1);

    if (viewMode === 'compare') {
      const compact = isCompact();
      if (compact) {
        if (localY < 0.5) {
          pointerCamera = camera;
          ndcY = 1 - localY * 4;
        } else {
          pointerCamera = compareCamera;
          ndcY = 1 - (localY - 0.5) * 4;
        }
      } else if (localX < 0.5) {
        pointerCamera = camera;
        ndcX = localX * 4 - 1;
      } else {
        pointerCamera = compareCamera;
        ndcX = (localX - 0.5) * 4 - 1;
      }
    }

    pointer.set(ndcX, ndcY);
    raycaster.setFromCamera(pointer, pointerCamera);
    const intersections = raycaster.intersectObject(seatVisuals.hitboxes, false);
    if (!intersections.length) return null;
    const instanceId = intersections[0].instanceId;
    return seats[instanceId] || null;
  }

  function animateScene(sceneState, timestamp) {
    requestAnimationFrame((time) => animateScene(sceneState, time));
    const time = performance.now() / 1000;
    sceneState.elapsed = time;

    if (cameraTween) {
      const progress = clamp((performance.now() - cameraTween.startTime) / cameraTween.duration, 0, 1);
      const eased = easeInOut(progress);
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
      const target = new THREE.Vector3().lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      camera.lookAt(target);
      if (cameraTween.controlsTarget) controls.target.copy(target);

      if (progress >= 1) {
        const finished = cameraTween;
        cameraTween = null;
        camera.position.copy(finished.toPosition);
        camera.lookAt(finished.toTarget);
        if (finished.onComplete) finished.onComplete();
      }
    } else if (viewMode === 'overview') {
      controls.update();
    } else if (viewMode === 'preview' && activeSeat) {
      const pose = getEyePose(activeSeat);
      camera.lookAt(pose.target);
    } else if (viewMode === 'compare') {
      configureCompareCameras();
    }

    if (activeSeat && viewMode !== 'overview') {
      ring.visible = true;
      ring.position.set(activeSeat.x, activeSeat.floorY + 0.095, activeSeat.z - 0.02);
      const pulse = 1 + Math.sin(time * 2.6) * 0.055;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.58 + Math.sin(time * 2.6) * 0.13;
    } else {
      ring.visible = false;
    }

    updateParticles(time);
    renderScene();
  }

  function renderScene() {
    const width = sceneWidth;
    const height = sceneHeight;

    if (viewMode === 'compare' && compareA && compareB) {
      const compact = isCompact();
      renderer.setScissorTest(true);
      if (compact) {
        const halfHeight = Math.floor(height / 2);
        renderer.setViewport(0, halfHeight, width, height - halfHeight);
        renderer.setScissor(0, halfHeight, width, height - halfHeight);
        camera.aspect = width / (height - halfHeight);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        renderer.setViewport(0, 0, width, halfHeight);
        renderer.setScissor(0, 0, width, halfHeight);
        compareCamera.aspect = width / halfHeight;
        compareCamera.updateProjectionMatrix();
        renderer.render(scene, compareCamera);
      } else {
        const halfWidth = Math.floor(width / 2);
        renderer.setViewport(0, 0, halfWidth, height);
        renderer.setScissor(0, 0, halfWidth, height);
        camera.aspect = halfWidth / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        renderer.setViewport(halfWidth, 0, width - halfWidth, height);
        renderer.setScissor(halfWidth, 0, width - halfWidth, height);
        compareCamera.aspect = (width - halfWidth) / height;
        compareCamera.updateProjectionMatrix();
        renderer.render(scene, compareCamera);
      }
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
    } else {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setViewport(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
    }
  }

  function configureCompareCameras() {
    if (!compareA || !compareB) return;
    const poseA = getEyePose(compareA, true);
    const poseB = getEyePose(compareB, true);
    camera.position.copy(poseA.position);
    camera.fov = poseA.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(poseA.target);

    compareCamera.position.copy(poseB.position);
    compareCamera.fov = poseB.fov;
    compareCamera.updateProjectionMatrix();
    compareCamera.lookAt(poseB.target);
  }

  function fitSceneToContainer(initial = false) {
    const width = sceneContainer.clientWidth || 900;
    const height = sceneContainer.clientHeight || 700;
    const pose = getOverviewPose(width, height);
    camera.fov = pose.fov;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    controls.target.copy(pose.target);

    if (initial && !prefersReducedMotion) {
      camera.position.copy(pose.position).add(new THREE.Vector3(0.8, 1.4, 3.4));
      camera.lookAt(pose.target);
      flyTo(pose.position, pose.target, 1.2);
    } else {
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
    }
  }

  function flyTo(position, target, duration = 0.9, onComplete) {
    if (prefersReducedMotion) {
      camera.position.copy(position);
      camera.lookAt(target);
      if (viewMode === 'overview') controls.target.copy(target);
      if (onComplete) onComplete();
      return;
    }
    cameraTween = {
      startTime: performance.now(),
      duration: Math.max(1, duration * 1000),
      fromPosition: camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      controlsTarget: viewMode === 'overview',
      onComplete
    };
  }

  function updateParticles(time) {
    if (!particles) return;
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particles.userData.baseY.length; i += 1) {
      const index = i * 3;
      positions[index + 1] = particles.userData.baseY[i] + Math.sin(time * particles.userData.speed[i] + particles.userData.phase[i]) * 0.11;
      positions[index] = particles.userData.baseX[i] + Math.cos(time * 0.16 + particles.userData.phase[i]) * 0.04;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  window.__orpheum = {
    previewSeat(seatOrId) {
      const seat = typeof seatOrId === 'string' ? seatById.get(seatOrId) : seatOrId;
      if (seat) previewSeat(seat);
    },
    flyOverview() {
      goToHouseView();
    },
    getState() {
      return {
        selected: selectedSeats.map((seat) => seat.id),
        activeSeat: activeSeat?.id || null,
        viewMode,
        compareA: compareA?.id || null,
        compareB: compareB?.id || null
      };
    },
    scene: state
  };

  window.__orpheumPreview = previewSeat;
  window.__orpheumCompareFromPinned = startCompare;
  window.__orpheumExitCompare = exitCompare;
  window.__orpheumHouseView = goToHouseView;

  function getOverviewPose(width, height) {
    if (width < 620) {
      return {
        position: new THREE.Vector3(2.6, 10.8, 24.6),
        target: new THREE.Vector3(0, 2.2, -3.7),
        fov: 44
      };
    }
    return {
      position: new THREE.Vector3(2.1, 10.6, 23.5),
      target: new THREE.Vector3(0, 2.2, -4.2),
      fov: 42
    };
  }

  function getEyePose(seat, forCompare = false) {
    const compact = isCompact();
    return {
      position: new THREE.Vector3(seat.x, seat.floorY + 1.31, seat.z - 0.12),
      target: new THREE.Vector3(seat.x * 0.055, 1.86, -11.8),
      fov: forCompare ? (compact ? 56 : 49) : (compact ? 58 : 47)
    };
  }

  function previewSeat(seat) {
    if (!seat || seat.reserved) {
      if (seat?.reserved) showToast('That seat is already reserved.');
      return;
    }

    const wasOverview = viewMode === 'overview';
    viewMode = 'preview';
    controls.enabled = false;
    activeSeat = seat;
    compareA = null;
    compareB = null;
    comparePending = false;
    stageCard.classList.add('has-preview', 'is-previewing');
    stageCard.classList.remove('is-comparing');
    compareOverlay.hidden = true;

    const pose = getEyePose(seat);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    flyTo(pose.position, pose.target, wasOverview ? 1.05 : 0.72);

    updateInterface();
  }

  function startCompare(seatB) {
    if (!compareA || !seatB || seatB.reserved || seatB.id === compareA.id) return;
    cameraTween = null;
    compareB = seatB;
    activeSeat = seatB;
    comparePending = false;
    viewMode = 'compare';
    controls.enabled = false;
    stageCard.classList.add('has-preview', 'is-comparing');
    stageCard.classList.remove('is-previewing');
    compareOverlay.hidden = false;
    compareALabel.textContent = `${compareA.row}${compareA.number} · ${formatPrice(compareA.price)}${compareA.limited ? ' · Limited view' : ''}`;
    compareBLabel.textContent = `${compareB.row}${compareB.number} · ${formatPrice(compareB.price)}${compareB.limited ? ' · Limited view' : ''}`;
    configureCompareCameras();
    updateInterface();
  }

  function exitCompare() {
    if (!compareA) return;
    cameraTween = null;
    compareA = null;
    compareB = null;
    comparePending = false;
    compareOverlay.hidden = true;
    stageCard.classList.remove('is-comparing');
    if (activeSeat) {
      viewMode = 'preview';
      stageCard.classList.add('is-previewing');
      const pose = getEyePose(activeSeat);
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
    } else {
      goToHouseView();
    }
    updateInterface();
  }

  function goToHouseView() {
    compareA = null;
    compareB = null;
    comparePending = false;
    activeSeat = null;
    viewMode = 'overview';
    compareOverlay.hidden = true;
    stageCard.classList.remove('is-comparing', 'has-preview', 'is-previewing');
    controls.enabled = true;
    const pose = getOverviewPose(sceneContainer.clientWidth, sceneContainer.clientHeight);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    controls.target.copy(pose.target);
    flyTo(pose.position, pose.target, 0.95, () => {
      controls.enabled = true;
    });
    updateInterface();
  }

  houseViewButton.addEventListener('click', () => {
    if (viewMode === 'overview') {
      showToast('You’re already looking at the whole house.');
      return;
    }
    goToHouseView();
  });

  seatHint.addEventListener('click', () => {
    const recommended = seats.find((seat) => !seat.reserved && !seat.limited
      && seat.rowIndex === 4 && (seat.number === 6 || seat.number === 7))
      || seats.find((seat) => !seat.reserved && !seat.limited);
    if (recommended) previewSeat(recommended);
  });

  exitCompareButton.addEventListener('click', exitCompare);

  window.addEventListener('resize', () => {
    resizeScene();
  });

  window.__orpheum.previewSeat = (id) => {
    const seat = seatById.get(id);
    if (seat) handleSeatSelection(seat);
  };
}

function handleSeatSelection(seat) {
  if (!seat || seat.reserved) {
    showToast('That seat is already reserved.');
    return;
  }

  if (comparePending && compareA) {
    if (seat.id === compareA.id) {
      showToast('View A is pinned. Choose a different seat for the comparison.');
      return;
    }
    if (window.__orpheumCompareFromPinned) {
      window.__orpheumCompareFromPinned(seat);
    }
    return;
  }

  if (viewMode === 'compare' && compareA && seat.id === compareA.id) {
    showToast('That is your pinned View A. Choose another seat.');
    return;
  }

  if (viewMode === 'compare' && compareA) {
    if (window.__orpheumCompareFromPinned) {
      window.__orpheumCompareFromPinned(seat);
    }
    return;
  }

  if (window.__orpheumPreview) window.__orpheumPreview(seat);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    toastElement.classList.remove('is-visible');
  }, 3200);
}

function isAdjacentToSelection(seat) {
  if (!selectedSeats.length) return true;
  if (selectedSeats.length >= MAX_PARTY) return false;
  if (selectedSeats.some((selected) => selected.row !== seat.row)) return false;
  const numbers = selectedSeats.map((selected) => selected.number).sort((a, b) => a - b);
  if (numbers.includes(seat.number)) return false;
  return seat.number === numbers[0] - 1 || seat.number === numbers[numbers.length - 1] + 1;
}

function addSeat(seat) {
  if (!seat || seat.reserved) return;
  if (selectedSeats.length >= MAX_PARTY) {
    showToast(`Parties are limited to ${MAX_PARTY} seats.`);
    return;
  }
  if (!isAdjacentToSelection(seat)) {
    const first = selectedSeats[0];
    showToast(`Seats must stay together. Choose a seat beside ${first.row}${first.number}.`);
    return;
  }
  if (selectedSeats.some((selected) => selected.id === seat.id)) return;

  selectedSeats.push(seat);
  selectedSeats.sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number);
  bookingReference = null;
  refreshSeatColors();
  updateInterface();
  const message = selectedSeats.length === 1
    ? `${seat.row}${seat.number} added. Choose the seat beside it to keep your party together.`
    : `${seat.row}${seat.number} added. ${selectedSeats.length} seats together.`;
  showToast(message);
}

function removeSeat(seatId) {
  const index = selectedSeats.findIndex((seat) => seat.id === seatId);
  if (index === -1) return;
  const [removed] = selectedSeats.splice(index, 1);
  bookingReference = null;
  refreshSeatColors();
  updateInterface();
  showToast(`${removed.row}${removed.number} removed from your order.`);
}

addSeatButton.addEventListener('click', () => {
  if (activeSeat) addSeat(activeSeat);
});

compareSeatButton.addEventListener('click', () => {
  if (viewMode === 'compare') {
    if (window.__orpheumExitCompare) window.__orpheumExitCompare();
    return;
  }

  if (comparePending) {
    compareA = null;
    compareB = null;
    comparePending = false;
    updateInterface();
    showToast('View comparison cancelled.');
    return;
  }

  if (!activeSeat) return;
  compareA = activeSeat;
  compareB = null;
  comparePending = true;
  updateInterface();
  showToast('View A pinned. Choose a second open seat to compare.');
});

clearSeatsButton.addEventListener('click', () => {
  if (!selectedSeats.length) return;
  selectedSeats.length = 0;
  bookingReference = null;
  refreshSeatColors();
  updateInterface();
  showToast('Your seat selection has been cleared.');
});

orderSeatsElement.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-seat]');
  if (button) removeSeat(button.dataset.removeSeat);
});

reviewButton.addEventListener('click', () => {
  if (!selectedSeats.length) return;
  openBookingSummary();
});

closeSummaryButton.addEventListener('click', () => summaryDialog.close());
summaryDoneButton.addEventListener('click', () => summaryDialog.close());
summaryDialog.addEventListener('click', (event) => {
  if (event.target === summaryDialog) summaryDialog.close();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || summaryDialog.open) return;
  if (viewMode === 'compare' && window.__orpheumExitCompare) {
    window.__orpheumExitCompare();
  } else if (comparePending) {
    comparePending = false;
    compareA = null;
    updateInterface();
  }
});

function openBookingSummary() {
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  if (!bookingReference) {
    bookingReference = `ORP-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  summaryParty.textContent = `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'}`;
  summaryReference.textContent = bookingReference;
  summarySeats.replaceChildren();
  summaryLines.replaceChildren();

  const seatFragment = document.createDocumentFragment();
  const lineFragment = document.createDocumentFragment();
  selectedSeats.forEach((seat) => {
    const seatChip = document.createElement('span');
    seatChip.className = 'summary-seat';
    seatChip.textContent = `${seat.row}${seat.number}${seat.limited ? ' · limited view' : ''}`;
    seatFragment.append(seatChip);

    const line = document.createElement('div');
    line.className = 'summary-line';
    const label = document.createElement('span');
    label.textContent = `Orchestra · Row ${seat.row}, Seat ${seat.number}${seat.limited ? ' (limited view)' : ''}`;
    const price = document.createElement('strong');
    price.textContent = formatPrice(seat.price);
    line.append(label, price);
    lineFragment.append(line);
  });

  summarySeats.append(seatFragment);
  summaryLines.append(lineFragment);
  summaryTotal.textContent = formatPrice(total);
  summaryDialog.showModal();
}

function updateInterface() {
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const available = seats.filter((seat) => !seat.reserved).length;
  availableCount.textContent = `${available} seats open`;

  if (activeSeat) {
    previewEmpty.hidden = true;
    previewContent.hidden = false;
    viewSeatBadge.textContent = activeSeat.id;
    viewSeatName.textContent = `Orchestra · Row ${activeSeat.row}`;
    viewSeatMeta.textContent = `Seat ${activeSeat.number} · ${activeSeat.limited ? 'Limited sightline' : 'Clear sightline'}`;
    viewSeatMeta.classList.toggle('is-limited', activeSeat.limited);
    viewPrice.textContent = formatPrice(activeSeat.price);

    const alreadySelected = selectedSeats.some((seat) => seat.id === activeSeat.id);
    const adjacent = isAdjacentToSelection(activeSeat);
    const selectionFull = selectedSeats.length >= MAX_PARTY;
    let note;
    if (activeSeat.limited) {
      note = 'A balcony support frames this sightline. The reduced price reflects the partial view.';
    } else if (activeSeat.number <= 3) {
      note = 'A clear side-angle view. The full stage stays in frame.';
    } else if (activeSeat.number >= 10) {
      note = 'A clear side-angle view with the house-left side of the stage in close reach.';
    } else {
      note = 'A clear, centered view of the stage and the full company.';
    }
    if (!alreadySelected && !adjacent && selectedSeats.length) {
      note = `To keep your party together, add a seat beside ${selectedSeats[0].row}${selectedSeats[0].number}.`;
    }
    if (!alreadySelected && selectionFull) {
      note = `Your party is at the ${MAX_PARTY}-seat maximum.`;
    }
    viewNote.textContent = note;

    addSeatButton.disabled = alreadySelected || !adjacent || selectionFull || viewMode === 'compare' && activeSeat.id === compareA?.id;
    addSeatButton.textContent = alreadySelected
      ? 'Seat selected'
      : selectionFull
        ? 'Party full'
        : !adjacent && selectedSeats.length
          ? 'Not adjacent'
          : 'Add seat';

    compareBanner.hidden = !comparePending;
    if (comparePending && compareA) {
      comparePinnedLabel.textContent = `Row ${compareA.row} · Seat ${compareA.number}`;
    }

    compareSeatButton.classList.toggle('is-pinned', comparePending || viewMode === 'compare');
    if (viewMode === 'compare') {
      compareSeatButton.lastChild.textContent = ' Exit compare';
    } else if (comparePending) {
      compareSeatButton.lastChild.textContent = ' Cancel compare';
    } else {
      compareSeatButton.lastChild.textContent = ' Compare view';
    }
  } else {
    previewEmpty.hidden = false;
    previewContent.hidden = true;
    compareBanner.hidden = true;
  }

  orderEmpty.hidden = selectedSeats.length > 0;
  orderSeatsElement.hidden = selectedSeats.length === 0;
  orderSeatsElement.replaceChildren();
  if (selectedSeats.length) {
    const fragment = document.createDocumentFragment();
    selectedSeats.forEach((seat) => {
      const chip = document.createElement('span');
      chip.className = 'order-chip';
      const dot = document.createElement('i');
      const label = document.createElement('span');
      label.textContent = `${seat.row}${seat.number}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.removeSeat = seat.id;
      remove.setAttribute('aria-label', `Remove row ${seat.row}, seat ${seat.number}`);
      remove.textContent = '×';
      chip.append(dot, label, remove);
      fragment.append(chip);
    });
    orderSeatsElement.append(fragment);
  }

  seatCountElement.textContent = `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'}`;
  orderTotalElement.textContent = formatPrice(total);
  reviewButton.disabled = selectedSeats.length === 0;
  clearSeatsButton.hidden = selectedSeats.length === 0;

  seats.forEach((seat) => {
    const button = seatButtons.get(seat.id);
    const selected = selectedSeats.some((item) => item.id === seat.id);
    button.disabled = seat.reserved;
    button.classList.toggle('is-selected', selected);
    button.classList.toggle('is-limited', seat.limited && !selected);
    button.setAttribute('aria-pressed', String(selected));
    const status = seat.reserved
      ? 'reserved and unavailable'
      : selected
        ? 'selected'
        : seat.limited
          ? 'open, limited view'
          : 'open';
    button.setAttribute('aria-label', `Row ${seat.row}, seat ${seat.number}, ${formatPrice(seat.price)}, ${status}`);
    button.title = `${seat.row}${seat.number} · ${formatPrice(seat.price)} · ${status}`;
  });

  refreshSeatColors();
}

function refreshSeatColors() {
  const state = window.__orpheumScene;
  if (!state) return;

  const openColor = new THREE.Color(0x3d7176);
  const selectedColor = new THREE.Color(0xe0b26a);
  const limitedColor = new THREE.Color(0x795737);
  const reservedColor = new THREE.Color(0x2c2f32);
  const color = new THREE.Color();

  seats.forEach((seat, index) => {
    const selected = selectedSeats.some((item) => item.id === seat.id);
    if (selected) color.copy(selectedColor);
    else if (seat.reserved) color.copy(reservedColor);
    else if (seat.limited) color.copy(limitedColor);
    else color.copy(openColor);

    if (!seat.reserved && !selected) {
      const rowLight = (seat.rowIndex % 3) * 0.012;
      color.offsetHSL(0, -0.015, rowLight);
    }

    state.seatVisuals.cushions.setColorAt(index, color);
    state.seatVisuals.backs.setColorAt(index, color);
  });

  state.seatVisuals.cushions.instanceColor.needsUpdate = true;
  state.seatVisuals.backs.instanceColor.needsUpdate = true;
}

function buildAuditorium() {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xb98f55, roughness: 0.32, metalness: 0.72 });
  const darkGoldMaterial = new THREE.MeshStandardMaterial({ color: 0x76512f, roughness: 0.48, metalness: 0.5 });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 0.36, metalness: 0.62 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x261b20, roughness: 0.9, metalness: 0.04 });
  const carpetMaterial = new THREE.MeshStandardMaterial({ color: 0x561f28, roughness: 0.98, metalness: 0 });
  const rowMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.76, metalness: 0.12 });
  const chairEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xa37a46, roughness: 0.37, metalness: 0.55 });

  const woodTexture = createWoodTexture();
  const woodMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    color: 0xe9c79e,
    roughness: 0.68,
    metalness: 0.03
  });
  const stageWoodMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    color: 0xcaa87d,
    roughness: 0.64,
    metalness: 0.04
  });

  const hemi = new THREE.HemisphereLight(0x9db3c2, 0x1a0c0c, 1.55);
  sceneLighting(group, hemi);

  const keyLight = new THREE.DirectionalLight(0xffddb3, 2.75);
  keyLight.position.set(7, 14, 11);
  keyLight.target.position.set(0, 1, -4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -14;
  keyLight.shadow.camera.right = 14;
  keyLight.shadow.camera.top = 18;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 45;
  keyLight.shadow.bias = -0.0008;
  group.add(keyLight, keyLight.target);

  const coolFill = new THREE.DirectionalLight(0x769caf, 0.68);
  coolFill.position.set(-9, 8, 13);
  group.add(coolFill);

  const stageSpot = new THREE.SpotLight(0xffc27b, 430, 34, 0.49, 0.66, 1.25);
  stageSpot.position.set(0, 9.7, -6.6);
  stageSpot.target.position.set(0, 1.1, -11.1);
  group.add(stageSpot, stageSpot.target);

  const stageGlow = new THREE.PointLight(0xffa767, 34, 13, 2);
  stageGlow.position.set(0, 3.5, -11);
  group.add(stageGlow);

  const sideGlow = new THREE.PointLight(0x6c98ae, 13, 23, 2);
  sideGlow.position.set(-8.5, 4.5, 2.5);
  group.add(sideGlow);

  // Auditorium floor and aisle carpet.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 50),
    new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.96, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.18, -1);
  ground.receiveShadow = true;
  group.add(ground);

  addBox(group, 1.4, 0.1, 25.8, carpetMaterial, -8.35, 0.02, 1.6, { receive: true });
  addBox(group, 1.4, 0.1, 25.8, carpetMaterial, 8.35, 0.02, 1.6, { receive: true });
  addBox(group, 17.2, 0.08, 0.16, darkGoldMaterial, 0, 0.06, 8.85, {});

  // Raked rows, each with a stepped lip and gold nosing.
  const hitboxGeometry = new THREE.BoxGeometry(0.98, 1.1, 0.94);
  const hitboxMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

  ROWS.forEach((row, rowIndex) => {
    const rowZ = FIRST_ROW_Z + rowIndex * ROW_GAP;
    const rowFloor = 0.18 + rowIndex * ROW_RISE;
    const rowHeight = rowFloor + 0.16;
    addBox(group, 17.1, rowHeight, 1.78, rowMaterial, 0, rowHeight / 2 - 0.08, rowZ, { receive: true });
    addBox(group, 17.14, 0.035, 0.08, darkGoldMaterial, 0, rowHeight + 0.03, rowZ - 0.89, {});
  });

  const cushionGeometry = new RoundedBoxGeometry(0.91, 0.18, 0.7, 1, 0.055);
  const backGeometry = new RoundedBoxGeometry(0.91, 0.89, 0.16, 1, 0.055);
  const armGeometry = new THREE.BoxGeometry(0.095, 0.09, 0.63);
  const stemGeometry = new THREE.CylinderGeometry(0.065, 0.1, 0.4, 8);
  const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0.03 });
  const backMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.025 });

  const cushions = new THREE.InstancedMesh(cushionGeometry, cushionMaterial, seats.length);
  const backs = new THREE.InstancedMesh(backGeometry, backMaterial, seats.length);
  const arms = new THREE.InstancedMesh(armGeometry, chairEdgeMaterial, seats.length * 2);
  const stems = new THREE.InstancedMesh(stemGeometry, darkMetalMaterial, seats.length);
  const hitboxes = new THREE.InstancedMesh(hitboxGeometry, hitboxMaterial, seats.length);
  [cushions, backs, arms, stems, hitboxes].forEach((mesh) => {
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.frustumCulled = false;
  });
  cushions.castShadow = true;
  cushions.receiveShadow = true;
  backs.castShadow = true;
  backs.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const partMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();

  seats.forEach((seat, index) => {
    const seatMatrix = new THREE.Matrix4().makeTranslation(seat.x, seat.floorY, seat.z);

    position.set(0, 0.42, -0.03);
    quaternion.identity();
    partMatrix.compose(position, quaternion, scale);
    matrix.multiplyMatrices(seatMatrix, partMatrix);
    cushions.setMatrixAt(index, matrix);

    position.set(0, 0.89, 0.3);
    euler.set(0.11, 0, 0);
    quaternion.setFromEuler(euler);
    partMatrix.compose(position, quaternion, scale);
    matrix.multiplyMatrices(seatMatrix, partMatrix);
    backs.setMatrixAt(index, matrix);

    for (let side = 0; side < 2; side += 1) {
      const armIndex = index * 2 + side;
      position.set(side === 0 ? -0.5 : 0.5, 0.61, 0.02);
      quaternion.identity();
      partMatrix.compose(position, quaternion, scale);
      matrix.multiplyMatrices(seatMatrix, partMatrix);
      arms.setMatrixAt(armIndex, matrix);
    }

    position.set(0, 0.2, 0);
    quaternion.identity();
    partMatrix.compose(position, quaternion, scale);
    matrix.multiplyMatrices(seatMatrix, partMatrix);
    stems.setMatrixAt(index, matrix);

    position.set(0, 0.72, 0.04);
    partMatrix.compose(position, quaternion, scale);
    matrix.multiplyMatrices(seatMatrix, partMatrix);
    hitboxes.setMatrixAt(index, matrix);
  });

  cushions.instanceMatrix.needsUpdate = true;
  backs.instanceMatrix.needsUpdate = true;
  arms.instanceMatrix.needsUpdate = true;
  stems.instanceMatrix.needsUpdate = true;
  hitboxes.instanceMatrix.needsUpdate = true;
  hitboxes.userData.seatIds = seats.map((seat) => seat.id);

  group.add(cushions, backs, arms, stems, hitboxes);

  // Walls and proscenium.
  addBox(group, 0.42, 9.4, 27.5, wallMaterial, -11.45, 4.6, -0.8, { receive: true });
  addBox(group, 0.42, 9.4, 27.5, wallMaterial, 11.45, 4.6, -0.8, { receive: true });
  addBox(group, 18.6, 0.38, 0.65, darkMaterial(), 0, 7.72, -9.45, {});
  addBox(group, 0.8, 8.2, 1.2, darkMaterial(), -9.3, 4.05, -9.5, {});
  addBox(group, 0.8, 8.2, 1.2, darkMaterial(), 9.3, 4.05, -9.5, {});
  addBox(group, 0.14, 7.7, 0.1, goldMaterial, -8.87, 3.95, -8.88, {});
  addBox(group, 0.14, 7.7, 0.1, goldMaterial, 8.87, 3.95, -8.88, {});

  buildStage(group, { woodMaterial: stageWoodMaterial, goldMaterial, darkGoldMaterial, darkMetalMaterial, wallMaterial });
  buildBalcony(group, { goldMaterial, darkGoldMaterial, wallMaterial, carpetMaterial, rowMaterial });
  const particles = buildParticles(group);
  const ring = buildRing(group);

  return {
    group,
    seatVisuals: { cushions, backs, arms, stems, hitboxes },
    ring,
    particles
  };

  function sceneLighting(parent, light) {
    parent.add(light);
  }

  function darkMaterial() {
    return new THREE.MeshStandardMaterial({ color: 0x171619, roughness: 0.75, metalness: 0.28 });
  }
}

function buildStage(parent, materials) {
  const { woodMaterial, goldMaterial, darkGoldMaterial, darkMetalMaterial, wallMaterial } = materials;

  // Raised stage and proscenium lip.
  addBox(parent, 18.8, 0.86, 5.75, woodMaterial, 0, 0.43, -11.25, { receive: true, cast: true });
  addBox(parent, 18.9, 0.1, 0.22, goldMaterial, 0, 0.92, -8.32, {});
  addBox(parent, 18.3, 0.5, 0.35, darkGoldMaterial, 0, 0.45, -8.1, {});

  // Stage apron.
  addBox(parent, 19.6, 0.16, 0.95, new THREE.MeshStandardMaterial({ color: 0x3b211d, roughness: 0.72 }), 0, 0.08, -8.08, { receive: true });

  const velvetTexture = createVelvetTexture();
  const velvetMaterial = new THREE.MeshStandardMaterial({
    map: velvetTexture,
    color: 0xb95662,
    roughness: 0.94,
    metalness: 0.01
  });
  const velvetDarkMaterial = new THREE.MeshStandardMaterial({
    map: velvetTexture,
    color: 0x6f2630,
    roughness: 0.96,
    metalness: 0.01
  });

  // Back curtain.
  addBox(parent, 18.2, 7.2, 0.22, velvetDarkMaterial, 0, 4.25, -13.7, {});
  const curtainInstancedMaterial = new THREE.MeshStandardMaterial({
    map: velvetTexture,
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.01
  });
  const backStripGeometry = new THREE.BoxGeometry(0.38, 6.98, 0.22);
  const backStrips = new THREE.InstancedMesh(backStripGeometry, curtainInstancedMaterial, 18);
  for (let i = 0; i < 18; i += 1) {
    const x = -8.3 + i * 0.975;
    const strip = new THREE.Object3D();
    strip.position.set(x, 4.25, -13.54);
    strip.scale.y = 1 + (i % 3) * 0.009;
    strip.updateMatrix();
    backStrips.setMatrixAt(i, strip.matrix);
    backStrips.setColorAt(i, new THREE.Color(i % 2 === 0 ? 0xad515c : 0x853541));
  }
  backStrips.instanceMatrix.needsUpdate = true;
  backStrips.instanceColor.needsUpdate = true;
  parent.add(backStrips);

  // Side curtains, gathered in heavy folds.
  const sideFolds = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.2, 0.22, 7.05, 7),
    curtainInstancedMaterial,
    12
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i += 1) {
      const index = side === -1 ? i : i + 6;
      const curtain = new THREE.Object3D();
      curtain.position.set(side * (8.15 + i * 0.19), 4.05, -9.65 + (i % 2) * 0.08);
      curtain.updateMatrix();
      sideFolds.setMatrixAt(index, curtain.matrix);
      sideFolds.setColorAt(index, new THREE.Color(i % 2 === 0 ? 0xa94d59 : 0x6f2b35));
    }
  }
  sideFolds.instanceMatrix.needsUpdate = true;
  sideFolds.instanceColor.needsUpdate = true;
  parent.add(sideFolds);

  // Valance and its small gold fringe.
  addBox(parent, 18.45, 1.18, 0.65, velvetMaterial, 0, 7.18, -9.5, { cast: true });
  addBox(parent, 18.5, 0.08, 0.68, goldMaterial, 0, 6.59, -9.47, {});
  const fringeGeometry = new THREE.CylinderGeometry(0.018, 0.026, 0.28, 6);
  const fringe = new THREE.InstancedMesh(fringeGeometry, goldMaterial, 58);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 58; i += 1) {
    dummy.position.set(-8.9 + i * (17.8 / 57), 6.4, -9.42);
    dummy.updateMatrix();
    fringe.setMatrixAt(i, dummy.matrix);
  }
  fringe.instanceMatrix.needsUpdate = true;
  parent.add(fringe);

  // A moonlit set: arch, disc and a small raised platform.
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.09, 8, 58, Math.PI), goldMaterial);
  arch.position.set(0, 4.3, -13.32);
  parent.add(arch);
  addBox(parent, 0.18, 4.35, 0.16, goldMaterial, -3.65, 2.15, -13.32, {});
  addBox(parent, 0.18, 4.35, 0.16, goldMaterial, 3.65, 2.15, -13.32, {});

  const moonGlowTexture = createGlowTexture();
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: moonGlowTexture,
    color: 0xffd59a,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  moonGlow.position.set(0, 5.15, -13.18);
  moonGlow.scale.set(7.8, 7.8, 1);
  parent.add(moonGlow);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 48),
    new THREE.MeshBasicMaterial({ color: 0xf0d4a5 })
  );
  moon.position.set(0, 5.15, -13.16);
  parent.add(moon);

  addBox(parent, 5.8, 0.32, 3.0, new THREE.MeshStandardMaterial({ color: 0x35251d, roughness: 0.8 }), 0, 1.04, -11.2, { receive: true, cast: true });
  addBox(parent, 5.0, 0.08, 2.35, new THREE.MeshStandardMaterial({ color: 0x6e4a31, roughness: 0.7 }), 0, 1.23, -11.3, { receive: true });

  buildPiano(parent, -4.9, 1.0, -10.8, darkMetalMaterial, goldMaterial);
  buildChair(parent, 3.9, 1.03, -10.9, woodMaterial, new THREE.MeshStandardMaterial({ color: 0x55302a, roughness: 0.85 }));

  // Footlights.
  const bulbGeometry = new THREE.SphereGeometry(0.075, 8, 8);
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffd38e });
  const bulbs = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, 16);
  for (let i = 0; i < 16; i += 1) {
    dummy.position.set(-7.7 + i * (15.4 / 15), 1.0, -8.55);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  }
  bulbs.instanceMatrix.needsUpdate = true;
  parent.add(bulbs);

  // Low pallet steps on the house-right side.
  for (let i = 0; i < 3; i += 1) {
    addBox(parent, 2.3 - i * 0.25, 0.18 + i * 0.18, 0.5, wallMaterial, 7.3, 0.14 + i * 0.09, -7.65 + i * 0.44, { receive: true });
  }
}

function buildPiano(parent, x, y, z, darkMetal, gold) {
  const piano = new THREE.Group();
  piano.position.set(x, y, z);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.42, 1.12, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x171311, roughness: 0.28, metalness: 0.3 }));
  body.position.y = 0.36;
  body.castShadow = true;
  piano.add(body);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(2.18, 0.08, 1.08, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x271c18, roughness: 0.34, metalness: 0.26 }));
  lid.position.set(-0.04, 0.62, 0);
  lid.rotation.z = -0.06;
  piano.add(lid);

  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 0.2), new THREE.MeshStandardMaterial({ color: 0xe3d6bf, roughness: 0.6 }));
  keys.position.set(0.15, 0.42, -0.59);
  piano.add(keys);

  for (const legX of [-0.8, 0.8]) {
    for (const legZ of [-0.37, 0.37]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 7), darkMetal);
      leg.position.set(legX, 0.05, legZ);
      piano.add(leg);
    }
  }

  const string = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.012, 0.012), gold);
  string.position.set(0, 0.48, 0.51);
  piano.add(string);
  parent.add(piano);
}

function buildChair(parent, x, y, z, woodMaterial, fabricMaterial) {
  const chair = new THREE.Group();
  chair.position.set(x, y, z);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.13, 0.68, 2, 0.04), fabricMaterial);
  seat.position.y = 0.47;
  chair.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.72, 0.12, 2, 0.04), fabricMaterial);
  back.position.set(0, 0.84, 0.29);
  back.rotation.x = 0.09;
  chair.add(back);
  for (const legX of [-0.28, 0.28]) {
    for (const legZ of [-0.24, 0.24]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.06), woodMaterial);
      leg.position.set(legX, 0.2, legZ);
      chair.add(leg);
    }
  }
  parent.add(chair);
}

function buildBalcony(parent, materials) {
  const { goldMaterial, darkGoldMaterial, wallMaterial, carpetMaterial, rowMaterial } = materials;

  // A shallow rear balcony edge and its visible circular supports.
  addBox(parent, 21.4, 0.38, 0.82, darkGoldMaterial, 0, 5.98, 3.08, { cast: true });
  addBox(parent, 21.0, 0.35, 0.22, goldMaterial, 0, 5.92, 3.12, {});
  addBox(parent, 20.6, 0.16, 1.08, carpetMaterial, 0, 5.7, 3.55, { receive: true });

  const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2929, roughness: 0.66, metalness: 0.22 });
  for (const x of [-7.35, 7.35]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.9, 12), supportMaterial);
    column.position.set(x, 2.95, 3.08);
    column.castShadow = true;
    parent.add(column);

    addBox(parent, 0.9, 0.3, 0.9, darkGoldMaterial, x, 0.15, 3.08, { cast: true });
    addBox(parent, 0.72, 0.24, 0.72, goldMaterial, x, 5.82, 3.08, { cast: true });
    addBox(parent, 0.44, 0.11, 0.44, goldMaterial, x, 3.74, 3.08, {});
    addBox(parent, 0.44, 0.11, 0.44, goldMaterial, x, 1.52, 3.08, {});
  }

  // Balcony rail posts.
  const postGeometry = new THREE.CylinderGeometry(0.035, 0.04, 0.74, 7);
  const posts = new THREE.InstancedMesh(postGeometry, goldMaterial, 42);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 42; i += 1) {
    dummy.position.set(-10.1 + i * (20.2 / 41), 6.55, 3.08);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  parent.add(posts);
  addBox(parent, 20.8, 0.07, 0.1, goldMaterial, 0, 6.93, 3.08, {});
  addBox(parent, 20.8, 0.055, 0.07, goldMaterial, 0, 6.18, 3.08, {});
}

function buildRing(parent) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.68, 44),
    new THREE.MeshBasicMaterial({
      color: 0xffd28a,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  parent.add(ring);
  return ring;
}

function buildParticles(parent) {
  const count = 150;
  const positions = new Float32Array(count * 3);
  const baseY = new Float32Array(count);
  const baseX = new Float32Array(count);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * 18;
    const y = 0.7 + Math.random() * 7.2;
    const z = -12.8 + Math.random() * 21;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    baseX[i] = x;
    baseY[i] = y;
    speed[i] = 0.18 + Math.random() * 0.32;
    phase[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffddae,
    size: 0.038,
    transparent: true,
    opacity: 0.31,
    depthWrite: false,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(geometry, material);
  particles.userData = { baseX, baseY, speed, phase };
  parent.add(particles);
  return particles;
}

function createWoodTexture() {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 256;
  canvasTexture.height = 256;
  const context = canvasTexture.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#49301e');
  gradient.addColorStop(0.22, '#5a3a23');
  gradient.addColorStop(0.52, '#4b2f1c');
  gradient.addColorStop(0.78, '#624026');
  gradient.addColorStop(1, '#452b1a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 65; i += 1) {
    const y = Math.random() * 256;
    const opacity = 0.025 + Math.random() * 0.11;
    context.strokeStyle = `rgba(235, 190, 135, ${opacity})`;
    context.lineWidth = 0.4 + Math.random() * 1.4;
    context.beginPath();
    context.moveTo(-10, y);
    context.bezierCurveTo(70, y + Math.random() * 6 - 3, 160, y + Math.random() * 8 - 4, 270, y + Math.random() * 5 - 2.5);
    context.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    const x = Math.random() * 256;
    const gradient2 = context.createRadialGradient(x, 128, 1, x, 128, 16 + Math.random() * 20);
    gradient2.addColorStop(0, 'rgba(24, 12, 6, 0.23)');
    gradient2.addColorStop(1, 'rgba(24, 12, 6, 0)');
    context.fillStyle = gradient2;
    context.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createVelvetTexture() {
  const velvetCanvas = document.createElement('canvas');
  velvetCanvas.width = 256;
  velvetCanvas.height = 128;
  const context = velvetCanvas.getContext('2d');
  for (let x = 0; x < 256; x += 1) {
    const wave = (Math.sin((x / 256) * Math.PI * 18) + 1) * 0.5;
    const lightness = 30 + wave * 24 + Math.random() * 4;
    context.fillStyle = `hsl(354 42% ${lightness}%)`;
    context.fillRect(x, 0, 1, 128);
  }
  const texture = new THREE.CanvasTexture(velvetCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGlowTexture() {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 239, 205, 0.95)');
  gradient.addColorStop(0.2, 'rgba(255, 220, 165, 0.45)');
  gradient.addColorStop(0.55, 'rgba(255, 190, 120, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 175, 100, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(parent, width, height, depth, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
  mesh.castShadow = Boolean(options.cast);
  mesh.receiveShadow = Boolean(options.receive);
  parent.add(mesh);
  return mesh;
}
