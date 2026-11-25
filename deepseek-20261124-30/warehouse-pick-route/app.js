import {
  PRODUCTS,
  BLOCK_SEGMENTS,
  getBinPosition,
  getBlockedSegment,
  planRoute,
} from "./route-planner.js";
import { createWarehouseWorld } from "./warehouse-scene.js";

const BASE_PICKER_SPEED = 4.35;
const PICK_DWELL = 0.82;

const dom = {
  orderPanel: document.getElementById("orderPanel"),
  routePanel: document.getElementById("routePanel"),
  viewport: document.getElementById("viewport"),
  canvas: document.getElementById("sceneCanvas"),
  pickList: document.getElementById("pickList"),
  orderUnits: document.getElementById("orderUnits"),
  orderStops: document.getElementById("orderStops"),
  pickedUnits: document.getElementById("pickedUnits"),
  readyBadge: document.getElementById("readyBadge"),
  resetOrderButton: document.getElementById("resetOrderButton"),
  sequenceList: document.getElementById("sequenceList"),
  sequenceHint: document.getElementById("sequenceHint"),
  totalDistance: document.getElementById("totalDistance"),
  routeLegs: document.getElementById("routeLegs"),
  routeMinutes: document.getElementById("routeMinutes"),
  blockSelect: document.getElementById("blockSelect"),
  blockSegmentButton: document.getElementById("blockSegmentButton"),
  activeBlocks: document.getElementById("activeBlocks"),
  routeAlert: document.getElementById("routeAlert"),
  routeAlertCopy: document.getElementById("routeAlertCopy"),
  playButton: document.getElementById("playButton"),
  restartButton: document.getElementById("restartButton"),
  playbackState: document.getElementById("playbackState"),
  playbackDetail: document.getElementById("playbackDetail"),
  routeProgress: document.getElementById("routeProgress"),
  speedSelect: document.getElementById("speedSelect"),
  playbackDock: document.getElementById("playbackDock"),
  pickerStatus: document.getElementById("pickerStatus"),
  stopLayer: document.getElementById("stopLayer"),
  routeToast: document.getElementById("routeToast"),
  viewCaption: document.getElementById("viewCaption"),
  viewButtons: [...document.querySelectorAll(".view-button")],
  mobileTabs: [...document.querySelectorAll(".mobile-tab")],
  mobileOrderCount: document.getElementById("mobileOrderCount"),
  mobileDistance: document.getElementById("mobileDistance"),
  helpButton: document.getElementById("helpButton"),
  helpDialog: document.getElementById("helpDialog"),
  helpClose: document.getElementById("helpClose"),
  loadScreen: document.getElementById("loadScreen"),
  clock: document.getElementById("clock"),
};

const state = {
  order: PRODUCTS.map((product) => ({ ...product })),
  picked: Object.fromEntries(PRODUCTS.map((product) => [product.id, 0])),
  blockedIds: [],
  activeId: null,
  plan: null,
  routeCumulative: [0],
  routeTotalDistance: 0,
  speed: 1,
  view: "overhead",
  mobilePanel: "order",
  dragId: null,
  pinEls: new Map(),
  pickerYaw: Math.PI,
  playback: {
    playing: false,
    traveled: 0,
    nextStop: 0,
    atStop: false,
    dwell: 0,
    ended: false,
  },
  toastTimer: null,
};

let world = null;
let elapsed = 0;
let lastFrame = performance.now();

function iconMarkup(name) {
  const icons = {
    drag: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/></svg>',
    up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>',
    trash: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6.5 4.5v-1h3v1M5 6.5l.5 6h5l.5-6M7 8v3M9 8v3"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8 3 3 6-6"/></svg>',
    alert: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.2v4.3M8 11.4h.01"/><path d="M7 2.5 2.2 11a1.2 1.2 0 0 0 1 1.8h9.6a1.2 1.2 0 0 0 1-1.8L9 2.5a1.2 1.2 0 0 0-2 0Z"/></svg>',
  };
  return icons[name] || "";
}

function padIndex(index) {
  return String(index + 1).padStart(2, "0");
}

function totalUnits() {
  return state.order.reduce((sum, item) => sum + item.qty, 0);
}

function totalPicked() {
  return state.order.reduce((sum, item) => sum + Math.min(item.qty, state.picked[item.id] || 0), 0);
}

function unreachableIds() {
  return new Set((state.plan?.unreachable || []).map((item) => item.id));
}

function findItem(id) {
  return state.order.find((item) => item.id === id);
}

function showToast(message, isError = false) {
  if (!dom.routeToast) return;
  window.clearTimeout(state.toastTimer);
  dom.routeToast.textContent = message;
  dom.routeToast.classList.toggle("error", isError);
  dom.routeToast.classList.add("show");
  state.toastTimer = window.setTimeout(() => {
    dom.routeToast.classList.remove("show");
  }, 2600);
}

function buildRouteMetrics() {
  const points = state.plan?.routePoints || [];
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].z - points[i - 1].z;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dz));
  }
  state.routeCumulative = cumulative;
  state.routeTotalDistance = cumulative[cumulative.length - 1] || 0;
}

function sampleRoute(distance) {
  const points = state.plan?.routePoints || [];
  if (!points.length) {
    return { position: { x: -9.65, z: 6.22 }, tangent: { x: 0, z: -1 }, index: 0, t: 0 };
  }
  if (points.length === 1) {
    return { position: { ...points[0] }, tangent: { x: 0, z: -1 }, index: 0, t: 0 };
  }
  const target = Math.max(0, Math.min(distance, state.routeTotalDistance));
  const cumulative = state.routeCumulative;
  let segment = 1;
  while (segment < cumulative.length - 1 && cumulative[segment] < target) segment += 1;
  const start = points[segment - 1];
  const end = points[segment];
  const segmentStart = cumulative[segment - 1];
  const segmentLength = cumulative[segment] - segmentStart;
  const t = segmentLength > 0.0001 ? (target - segmentStart) / segmentLength : 0;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  return {
    position: { x: start.x + dx * t, z: start.z + dz * t },
    tangent: { x: dx / length, z: dz / length },
    index: segment,
    t,
  };
}

function resetPlayback({ update = true } = {}) {
  state.playback.playing = false;
  state.playback.traveled = 0;
  state.playback.nextStop = 0;
  state.playback.atStop = false;
  state.playback.dwell = 0;
  state.playback.ended = false;
  state.activeId = null;
  Object.keys(state.picked).forEach((id) => {
    state.picked[id] = 0;
  });
  if (update) updateUI();
}

function buildPins() {
  dom.stopLayer.innerHTML = "";
  state.pinEls.clear();
  state.order.forEach((item, index) => {
    const pin = document.createElement("div");
    pin.className = "stop-pin";
    pin.dataset.id = item.id;
    pin.innerHTML = `<span class="pin-number">${padIndex(index)}</span><span class="pin-label">${item.sku} · ${item.name}</span>`;
    dom.stopLayer.appendChild(pin);
    state.pinEls.set(item.id, pin);
  });
}

function recalculateRoute() {
  state.plan = planRoute(state.order, state.blockedIds);
  buildRouteMetrics();
  if (world) {
    world.buildRoute(state.plan);
    world.buildStopMarkers(state.plan, state.order, unreachableIds());
    world.buildBlockers(state.blockedIds);
  }
  buildPins();
  updateUI();
}

function commitChange(message, error = false) {
  resetPlayback({ update: false });
  recalculateRoute();
  showToast(message, error);
}

function renderPickList() {
  const scrollTop = dom.pickList.scrollTop;
  const unreachable = unreachableIds();
  const picked = state.picked;
  dom.pickList.innerHTML = state.order.map((item, index) => {
    const position = getBinPosition(item);
    const aisleText = position.aisle === "Front" || position.aisle === "Rear" ? `${position.aisle.toUpperCase()} AISLE` : `AISLE ${position.aisle}`;
    const itemPicked = Math.min(item.qty, picked[item.id] || 0);
    const complete = itemPicked >= item.qty;
    const classes = [
      "pick-row",
      complete ? "is-picked" : "",
      state.activeId === item.id ? "is-picking" : "",
      unreachable.has(item.id) ? "is-unreachable" : "",
    ].filter(Boolean).join(" ");
    const check = complete
      ? `${iconMarkup("check")}<span>${itemPicked}/${item.qty}</span>`
      : `<span>${itemPicked}/${item.qty}</span>`;
    return `
      <div class="${classes}" data-id="${item.id}" draggable="true" aria-label="Stop ${index + 1}: ${item.name}">
        <button class="drag-handle" type="button" aria-label="Drag to reorder ${item.name}" tabindex="-1">${iconMarkup("drag")}</button>
        <span class="stop-number">${padIndex(index)}</span>
        <div class="item-main">
          <div class="item-topline">
            <span class="item-sku">${item.sku}</span>
            <span class="item-name">${item.name}</span>
          </div>
          <div class="item-bin">
            <b>${position.binCode}</b>
            <span>·</span>
            <span>${aisleText}</span>
            <span class="pick-check ${unreachable.has(item.id) ? "is-error" : ""}">${unreachable.has(item.id) ? iconMarkup("alert") + "BLOCKED" : check}</span>
          </div>
        </div>
        <div class="qty-control" aria-label="Quantity for ${item.name}">
          <button type="button" data-action="decrease" aria-label="Decrease quantity" ${item.qty <= 1 ? "disabled" : ""}>−</button>
          <span>${item.qty}</span>
          <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="row-actions">
          <span>${item.side === "south" ? "FRONT FACE" : "REAR FACE"} · ${aisleText}</span>
          <span class="row-moves">
            <button class="move-button" type="button" data-action="move-up" aria-label="Move stop up" ${index === 0 ? "disabled" : ""}>${iconMarkup("up")}</button>
            <button class="move-button" type="button" data-action="move-down" aria-label="Move stop down" ${index === state.order.length - 1 ? "disabled" : ""}>${iconMarkup("down")}</button>
            <button class="remove-button" type="button" data-action="remove" aria-label="Remove ${item.name}">${iconMarkup("trash")}</button>
          </span>
        </div>
      </div>
    `;
  }).join("");
  dom.pickList.scrollTop = scrollTop;
}

function renderSequence() {
  const unreachable = unreachableIds();
  dom.sequenceList.innerHTML = state.order.map((item, index) => {
    const positions = getBinPosition(item);
    const itemPicked = Math.min(item.qty, state.picked[item.id] || 0);
    const complete = itemPicked >= item.qty;
    const isUnreachable = unreachable.has(item.id);
    return `
      <div class="sequence-item ${complete ? "done" : ""} ${isUnreachable ? "unreachable" : ""} ${state.activeId === item.id ? "active" : ""}">
        <span class="sequence-index">${padIndex(index)}</span>
        <span class="sequence-name">
          <strong>${item.sku} · ${item.name}</strong>
          <span>${positions.binCode} · ${positions.aisle === "Front" || positions.aisle === "Rear" ? positions.aisle.toUpperCase() : `AISLE ${positions.aisle}`}</span>
        </span>
        <span class="sequence-qty">${itemPicked}/${item.qty} u</span>
      </div>
    `;
  }).join("");
}

function renderBlocks() {
  const active = new Set(state.blockedIds);
  dom.blockSelect.innerHTML = BLOCK_SEGMENTS.map((segment) => `
    <option value="${segment.id}" ${active.has(segment.id) ? "disabled" : ""}>${segment.label}</option>
  `).join("");
  dom.blockSegmentButton.disabled = state.blockedIds.length >= BLOCK_SEGMENTS.length;

  if (!state.blockedIds.length) {
    dom.activeBlocks.innerHTML = '<span class="no-blocks">No blocked segments</span>';
  } else {
    dom.activeBlocks.innerHTML = state.blockedIds.map((id) => {
      const segment = getBlockedSegment(id);
      return `<span class="blocked-chip">${segment.short} · ${segment.aisle}<button type="button" data-unblock="${id}" aria-label="Remove ${segment.label} block">×</button></span>`;
    }).join("");
  }
}

function updatePins() {
  state.order.forEach((item) => {
    const pin = state.pinEls.get(item.id);
    if (!pin) return;
    const position = getBinPosition(item);
    const projected = world.projectPoint(position.x, 2.78, position.z);
    pin.classList.toggle("visible", projected.visible);
    pin.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -100%)`;
  });
}

function updateLiveProgressUI() {
  const pb = state.playback;
  const total = state.routeTotalDistance;
  dom.routeProgress.style.width = `${total ? Math.min(100, (pb.traveled / total) * 100) : 0}%`;
  if (pb.playing && !pb.atStop) {
    const stops = state.plan?.stops || [];
    const next = stops[pb.nextStop];
    dom.playbackState.textContent = next ? `Walking to ${next.sku}` : "Returning to packing";
    dom.playbackDetail.textContent = `${pb.traveled.toFixed(1)} m · ${Math.round((pb.traveled / Math.max(1, total)) * 100)}% complete`;
  }
}

function updatePlaybackUI() {
  const reachable = Boolean(state.plan?.reachable);
  const stops = state.plan?.stops || [];
  const unreachable = state.plan?.unreachable || [];
  const pb = state.playback;
  dom.playbackDock.classList.toggle("is-playing", pb.playing);
  dom.playbackDock.classList.toggle("is-blocked", !reachable);
  dom.playButton.disabled = !reachable || !state.order.length;
  dom.playButton.setAttribute("aria-label", pb.playing ? "Pause route" : "Play route");
  dom.routeProgress.style.width = `${state.routeTotalDistance ? Math.min(100, (pb.traveled / state.routeTotalDistance) * 100) : 0}%`;

  if (!reachable) {
    dom.playbackState.textContent = "Route needs attention";
    dom.playbackDetail.textContent = `${unreachable.length} unreachable ${unreachable.length === 1 ? "item" : "items"} · resolve to dispatch`;
  } else if (!state.order.length) {
    dom.playbackState.textContent = "Pick list is empty";
    dom.playbackDetail.textContent = "Add or reset stops to build a route";
  } else if (pb.atStop && stops[pb.nextStop]) {
    const stop = stops[pb.nextStop];
    dom.playbackState.textContent = `Picking ${stop.sku}`;
    dom.playbackDetail.textContent = `${stop.qty} ${stop.qty === 1 ? "unit" : "units"} · stop ${pb.nextStop + 1} of ${stops.length}`;
  } else if (pb.playing) {
    const next = stops[pb.nextStop];
    dom.playbackState.textContent = next ? `Walking to ${next.sku}` : "Returning to packing";
    dom.playbackDetail.textContent = `${pb.traveled.toFixed(1)} m · ${Math.round((pb.traveled / Math.max(1, state.routeTotalDistance)) * 100)}% complete`;
  } else if (pb.ended) {
    dom.playbackState.textContent = "Route complete";
    dom.playbackDetail.textContent = `${totalPicked()}/${totalUnits()} units picked · ready to hand off`;
  } else if (pb.traveled > 0.1) {
    dom.playbackState.textContent = "Playback paused";
    dom.playbackDetail.textContent = `${pb.traveled.toFixed(1)} m into ${state.routeTotalDistance.toFixed(1)} m route`;
  } else {
    dom.playbackState.textContent = "Ready at packing";
    dom.playbackDetail.textContent = `Route preview · ${stops.length} ${stops.length === 1 ? "stop" : "stops"}`;
  }

  let pickerText = "Maya R. · idle at packing";
  if (pb.atStop && stops[pb.nextStop]) pickerText = `Maya R. · picking ${stops[pb.nextStop].sku}`;
  else if (pb.playing) pickerText = `Maya R. · en route to ${stops[pb.nextStop]?.sku || "packing"}`;
  else if (pb.ended) pickerText = "Maya R. · order at packing";
  else if (pb.traveled > 0.1) pickerText = "Maya R. · playback paused";
  const statusStrong = dom.pickerStatus.querySelector("strong");
  if (statusStrong) statusStrong.textContent = pickerText;
}

function updateUI() {
  const units = totalUnits();
  const picked = totalPicked();
  const unreachable = unreachableIds();
  const reachableStops = state.plan?.stops?.length || 0;
  const hasUnreachable = unreachable.size > 0;
  const allPicked = units > 0 && picked >= units && state.playback.ended;

  dom.orderUnits.textContent = units;
  dom.orderStops.textContent = state.order.length;
  dom.pickedUnits.textContent = picked;
  dom.mobileOrderCount.textContent = state.order.length;
  dom.totalDistance.textContent = state.plan ? state.plan.totalDistance.toFixed(1) : "—";
  dom.mobileDistance.textContent = state.plan ? `${state.plan.totalDistance.toFixed(0)} m` : "—";
  dom.routeLegs.textContent = `${Math.max(0, reachableStops + (reachableStops ? 1 : 0))} legs`;
  const minutes = state.plan ? Math.max(1, Math.round(state.plan.totalDistance / 1.2 / 60 + reachableStops * 0.18)) : 0;
  dom.routeMinutes.textContent = `~${minutes} min`;
  dom.sequenceHint.textContent = hasUnreachable
    ? `${unreachable.size} unreachable · ${reachableStops} served`
    : `Packing → ${reachableStops} bins → Packing`;

  dom.readyBadge.classList.toggle("blocked", hasUnreachable);
  dom.readyBadge.innerHTML = hasUnreachable ? "<i></i> Blocked" : allPicked ? "<i></i> Complete" : "<i></i> Ready";

  renderPickList();
  renderSequence();
  renderBlocks();

  dom.routeAlert.hidden = !hasUnreachable;
  if (hasUnreachable) {
    const names = state.plan.unreachable.map((item) => `${item.sku} ${item.name}`).join(", ");
    dom.routeAlertCopy.textContent = `${names}. Route start is locked until the blocked pick face is cleared.`;
  }

  state.pinEls.forEach((pin, id) => {
    const item = findItem(id);
    if (!item) return;
    pin.classList.toggle("is-unreachable", unreachable.has(id));
    pin.classList.toggle("is-picked", (state.picked[id] || 0) >= item.qty);
    pin.classList.toggle("is-active", state.activeId === id);
  });

  if (world) {
    world.setStopVisuals(state.order, state.picked, state.activeId, unreachable);
    world.setHighlightVisuals(state.picked, state.activeId, unreachable);
  }
  updatePlaybackUI();
}

function updatePlayback(dt) {
  const pb = state.playback;
  if (!pb.playing || !state.plan?.reachable) return;
  const stops = state.plan.stops;
  const total = state.routeTotalDistance;

  if (pb.atStop) {
    pb.dwell -= dt;
    if (pb.dwell <= 0) {
      const stop = stops[pb.nextStop];
      if (stop) {
        state.picked[stop.id] = stop.qty;
      }
      state.activeId = null;
      pb.atStop = false;
      pb.nextStop += 1;
      updateUI();
    }
    return;
  }

  const advance = BASE_PICKER_SPEED * state.speed * dt;
  const nextStop = stops[pb.nextStop];
  if (nextStop && pb.traveled + advance >= nextStop.distance) {
    pb.traveled = nextStop.distance;
    pb.atStop = true;
    pb.dwell = PICK_DWELL;
    state.activeId = nextStop.id;
    updateUI();
    return;
  }

  pb.traveled = Math.min(total, pb.traveled + advance);
  if (pb.traveled >= total - 0.0001) {
    pb.traveled = total;
    pb.playing = false;
    pb.ended = true;
    state.activeId = null;
    updateUI();
    showToast("Route complete — order is ready to hand off");
  }
}

function animate(now) {
  const dt = Math.min(1, Math.max(0.001, (now - lastFrame) / 1000));
  lastFrame = now;
  elapsed += dt;

  updatePlayback(dt);
  updateLiveProgressUI();
  const sample = sampleRoute(state.playback.traveled);
  const pb = state.playback;
  let targetYaw = state.pickerYaw;
  if (pb.atStop) {
    const stop = state.plan?.stops?.[pb.nextStop];
    if (stop) targetYaw = stop.facing > 0 ? 0 : Math.PI;
  } else if (pb.playing) {
    targetYaw = Math.atan2(sample.tangent.x, sample.tangent.z);
  }
  state.pickerYaw = targetYaw;

  if (world) {
    const walking = pb.playing && !pb.atStop && !pb.ended;
    world.updatePickerPose(sample.position, targetYaw, walking, pb.atStop, dt, elapsed);
    world.updateCamera(dt, targetYaw, walking);
    world.animateDetails(elapsed);
    updatePins();
    world.render();
  }
  requestAnimationFrame(animate);
}

function consumeAction(action, item) {
  if (!item) return;
  if (action === "increase") {
    item.qty = Math.min(99, item.qty + 1);
    commitChange(`${item.sku} quantity set to ${item.qty} — playback reset`);
  } else if (action === "decrease") {
    item.qty = Math.max(1, item.qty - 1);
    commitChange(`${item.sku} quantity set to ${item.qty} — playback reset`);
  } else if (action === "remove") {
    state.order = state.order.filter((entry) => entry.id !== item.id);
    delete state.picked[item.id];
    commitChange(`${item.sku} removed — route rebuilt`);
  } else if (action === "move-up" || action === "move-down") {
    const index = state.order.findIndex((entry) => entry.id === item.id);
    const destination = action === "move-up" ? index - 1 : index + 1;
    if (destination < 0 || destination >= state.order.length) return;
    const [moved] = state.order.splice(index, 1);
    state.order.splice(destination, 0, moved);
    commitChange(`${item.sku} moved to stop ${destination + 1} — playback reset`);
  }
}

function setView(view) {
  state.view = view;
  if (world) world.setView(view);
  dom.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  const caption = dom.viewCaption.querySelector("strong");
  if (caption) caption.textContent = view === "follow" ? "Following Maya" : "Overhead planning";
}

function setMobilePanel(panel) {
  state.mobilePanel = panel;
  dom.orderPanel.classList.toggle("mobile-active", panel === "order");
  dom.routePanel.classList.toggle("mobile-active", panel === "route");
  dom.mobileTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.panel === panel);
  });
}

function setClock() {
  const now = new Date();
  dom.clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function bindEvents() {
  dom.pickList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const row = actionButton.closest(".pick-row");
    if (!row) return;
    consumeAction(actionButton.dataset.action, findItem(row.dataset.id));
  });

  dom.pickList.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".pick-row");
    if (!row) return;
    state.dragId = row.dataset.id;
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragId);
  });

  dom.pickList.addEventListener("dragover", (event) => {
    const row = event.target.closest(".pick-row");
    if (!row || row.dataset.id === state.dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dom.pickList.querySelectorAll(".pick-row.drag-over").forEach((entry) => entry.classList.remove("drag-over"));
    row.classList.add("drag-over");
  });

  dom.pickList.addEventListener("dragleave", (event) => {
    const row = event.target.closest(".pick-row");
    if (row) row.classList.remove("drag-over");
  });

  dom.pickList.addEventListener("drop", (event) => {
    event.preventDefault();
    const row = event.target.closest(".pick-row");
    if (!row || !state.dragId) return;
    const targetId = row.dataset.id;
    const fromIndex = state.order.findIndex((item) => item.id === state.dragId);
    const toIndex = state.order.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [moved] = state.order.splice(fromIndex, 1);
    state.order.splice(toIndex, 0, moved);
    const movedSku = moved.sku;
    state.dragId = null;
    commitChange(`${movedSku} moved to stop ${toIndex + 1} — playback reset`);
  });

  dom.pickList.addEventListener("dragend", () => {
    state.dragId = null;
    dom.pickList.querySelectorAll(".pick-row").forEach((row) => {
      row.classList.remove("is-dragging", "drag-over");
    });
  });

  dom.playButton.addEventListener("click", () => {
    if (!state.plan?.reachable || !state.order.length) {
      showToast("Clear the blocked pick face before starting playback", true);
      return;
    }
    const pb = state.playback;
    if (pb.ended) {
      resetPlayback({ update: false });
      buildRouteMetrics();
    }
    pb.playing = !pb.playing;
    updatePlaybackUI();
  });

  dom.restartButton.addEventListener("click", () => {
    resetPlayback();
    buildRouteMetrics();
    updateUI();
    showToast("Playback restarted at packing");
  });

  dom.speedSelect.addEventListener("change", () => {
    state.speed = Number(dom.speedSelect.value) || 1;
  });

  dom.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  dom.mobileTabs.forEach((tab) => {
    tab.addEventListener("click", () => setMobilePanel(tab.dataset.panel));
  });

  dom.blockSegmentButton.addEventListener("click", () => {
    const id = dom.blockSelect.value;
    if (!id || state.blockedIds.includes(id)) return;
    state.blockedIds.push(id);
    const segment = getBlockedSegment(id);
    resetPlayback({ update: false });
    recalculateRoute();
    const blockedText = state.plan.unreachable.length
      ? `${segment.label} blocked — ${state.plan.unreachable.length} item unreachable`
      : `${segment.label} blocked — route recalculated`;
    showToast(blockedText, state.plan.unreachable.length > 0);
  });

  dom.activeBlocks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-unblock]");
    if (!button) return;
    const id = button.dataset.unblock;
    state.blockedIds = state.blockedIds.filter((entry) => entry !== id);
    resetPlayback({ update: false });
    recalculateRoute();
    showToast("Aisle block cleared — route recalculated");
  });

  dom.resetOrderButton.addEventListener("click", () => {
    state.order = PRODUCTS.map((product) => ({ ...product }));
    state.picked = Object.fromEntries(PRODUCTS.map((product) => [product.id, 0]));
    resetPlayback({ update: false });
    recalculateRoute();
    showToast("Order quantities and stop order restored");
  });

  dom.helpButton.addEventListener("click", () => {
    dom.helpDialog.hidden = false;
  });
  dom.helpClose.addEventListener("click", () => {
    dom.helpDialog.hidden = true;
  });
  dom.helpDialog.addEventListener("click", (event) => {
    if (event.target === dom.helpDialog) dom.helpDialog.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dom.helpDialog.hidden = true;
  });

  const resizeObserver = new ResizeObserver(() => {
    if (world) world.setSceneSize();
  });
  resizeObserver.observe(dom.viewport);
}

function init() {
  try {
    world = createWarehouseWorld(dom.canvas, dom.viewport);
  } catch (error) {
    dom.loadScreen.classList.add("error");
    dom.loadScreen.innerHTML = `<p style="max-width:320px;text-align:center;line-height:1.6">The 3D view could not start in this browser.<br>${String(error.message || error)}</p>`;
    throw error;
  }

  setMobilePanel("order");
  setClock();
  window.setInterval(setClock, 30000);
  bindEvents();
  recalculateRoute();
  setView("overhead");
  requestAnimationFrame(animate);
  window.setTimeout(() => {
    dom.loadScreen.classList.add("hidden");
  }, 260);
}

init();
