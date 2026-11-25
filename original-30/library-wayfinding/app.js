import { DirectoryScene } from "./scene.js";
import {
  DESTINATIONS,
  FLOOR_META,
  NODES,
  STARTS,
  buildDirections,
  findRoute,
  formatDistance,
  formatDuration,
} from "./data.js";

const ICONS = {
  child: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c2.8-.8 5-.4 8 1.2 3-1.6 5.2-2 8-1.2v13c-2.8-.8-5-.4-8 1.2-3-1.6-5.2-2-8-1.2v-13Z"/><path d="M12 6.7v13M7 9.1h2.2M14.8 9.1H17M7 12.2h2.2M14.8 12.2H17"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10.5h14M6.5 10.5V19M17.5 10.5V19M4 19h16M8.5 10.5V7.2A2.2 2.2 0 0 1 10.7 5h2.6a2.2 2.2 0 0 1 2.2 2.2v3.3"/><path d="M9.5 6.3h5M9.8 15.3h4.4"/></svg>',
  meeting: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h14v8H5zM8 15.5v4M16 15.5v4"/><circle cx="8.5" cy="5" r="1.7"/><circle cx="15.5" cy="5" r="1.7"/><path d="M6.8 7.5c.2-1 .9-1.5 1.7-1.5s1.5.5 1.7 1.5M13.8 7.5c.2-1 .9-1.5 1.7-1.5s1.5.5 1.7 1.5"/></svg>',
  toilet: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="4.8" r="1.7"/><circle cx="16.5" cy="4.8" r="1.7"/><path d="M7.5 7v5.2M5.4 18.5V14h4.2v4.5M7.5 12.2h-3M7.5 12.2h3M14.5 7h4l-1.1 5h-1.8l-1.1-5ZM16.5 12v6.5M15 15.5h3"/></svg>',
  reading: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.2c2.8-.6 5 .2 8.5 2.6 3.5-2.4 5.7-3.2 8.5-2.6v12.6c-2.8-.6-5 .2-8.5 2.6-3.5-2.4-5.7-3.2-8.5-2.6V6.2Z"/><path d="M12 8.8v12.6M5.8 9.3h2.1M16.1 9.3h2.1M5.8 12.2h2.1M16.1 12.2h2.1"/></svg>',
  entrance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V4.5h10.5V20M8.5 20V9.5h7V20M9 20h7M4 20h16"/><path d="M14 12.3h.01"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3.1 2"/></svg>',
  stairs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h4v-4h4v-4h4V7h4"/><path d="M16 3.5 20 7l-4 3.5"/></svg>',
  lift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h14v17H5zM9 7l1.5-2L12 7M12 17l1.5-2L15 17M9 12h6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16h.01"/><path d="M10.3 4.4 2.7 18a1.5 1.5 0 0 0 1.3 2.2h16a1.5 1.5 0 0 0 1.3-2.2L13.7 4.4a2 2 0 0 0-3.4 0Z"/></svg>',
  sameFloor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.2-8 4.2-8-4.2L12 3Z"/><path d="m4 12 8 4.2 8-4.2"/></svg>',
};

const state = {
  destinationId: "children",
  startId: "entrance",
  stepFree: false,
  liftOut: false,
  activeFloor: "overview",
  query: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  startSelect: document.querySelector("#startSelect"),
  destinationCount: document.querySelector("#destinationCount"),
  destinationList: document.querySelector("#destinationList"),
  scene: document.querySelector("#scene"),
  sceneLevelTitle: document.querySelector("#sceneLevelTitle"),
  sceneLevelSub: document.querySelector("#sceneLevelSub"),
  sceneHint: document.querySelector("#sceneHint"),
  routeLevelPill: document.querySelector("#routeLevelPill"),
  routeLevelText: document.querySelector("#routeLevelText"),
  routePanelTitle: document.querySelector("#routePanelTitle"),
  clearRoute: document.querySelector("#clearRoute"),
  routeContent: document.querySelector("#routeContent"),
  routeEmpty: document.querySelector("#routeEmpty"),
  summaryDestination: document.querySelector("#summaryDestination"),
  summaryFloor: document.querySelector("#summaryFloor"),
  routeChips: document.querySelector("#routeChips"),
  stepfreeToggle: document.querySelector("#stepfreeToggle"),
  routeDistance: document.querySelector("#routeDistance"),
  directionsList: document.querySelector("#directionsList"),
  routeNotice: document.querySelector("#routeNotice"),
  startFromHere: document.querySelector("#startFromHere"),
  serviceStrip: document.querySelector("#serviceStrip"),
  serviceStripText: document.querySelector("#serviceStripText"),
  serviceStripButton: document.querySelector("#serviceStripButton"),
  staffButton: document.querySelector("#staffButton"),
  staffModal: document.querySelector("#staffModal"),
  closeStaffModal: document.querySelector("#closeStaffModal"),
  staffDone: document.querySelector("#staffDone"),
  liftStatusCard: document.querySelector("#liftStatusCard"),
  liftModalStatus: document.querySelector("#liftModalStatus"),
  liftModalDescription: document.querySelector("#liftModalDescription"),
  liftStatusBadge: document.querySelector("#liftStatusBadge"),
  liftServiceToggle: document.querySelector("#liftServiceToggle"),
  systemPill: document.querySelector("#systemPill"),
  systemText: document.querySelector("#systemText"),
  toast: document.querySelector("#toast"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomOut: document.querySelector("#zoomOut"),
  resetView: document.querySelector("#resetView"),
};

let directoryScene = null;
let toastTimer = null;
let currentRoute = null;

function icon(name) {
  return ICONS[name] || ICONS.sameFloor;
}

function destinationById(id) {
  return DESTINATIONS.find((destination) => destination.id === id) || null;
}

function startById(id) {
  return STARTS.find((start) => start.id === id) || STARTS[0];
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
}

function renderStartOptions() {
  elements.startSelect.innerHTML = STARTS.map(
    (start) => `<option value="${start.id}">${start.label}</option>`,
  ).join("");
  elements.startSelect.value = state.startId;
}

function renderDestinations() {
  elements.destinationList.innerHTML = DESTINATIONS.map((destination) => {
    const floor = FLOOR_META[destination.floor];
    return `
      <button class="destination-card" type="button" role="listitem" data-destination="${destination.id}" aria-label="${destination.name}, ${floor.name}">
        <span class="destination-icon" style="--icon-bg:${destination.tint};color:${destination.color}">${icon(destination.icon)}</span>
        <span class="destination-text">
          <strong>${destination.name}</strong>
          <span>${destination.description}</span>
        </span>
        <span class="floor-tag">${floor.short}</span>
      </button>`;
  }).join("");

  const empty = document.createElement("p");
  empty.className = "no-results";
  empty.id = "noResults";
  empty.hidden = true;
  empty.textContent = "No matching destinations. Try “room”, “toilet” or “desk”.";
  elements.destinationList.appendChild(empty);

  for (const button of elements.destinationList.querySelectorAll("[data-destination]")) {
    button.addEventListener("click", () => selectDestination(button.dataset.destination));
  }
  updateSelectedDestinationCards();
}

function updateSelectedDestinationCards() {
  for (const button of elements.destinationList.querySelectorAll("[data-destination]")) {
    const selected = button.dataset.destination === state.destinationId;
    button.classList.toggle("is-selected", selected);
    if (selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
}

function filterDestinations() {
  const query = state.query.trim().toLowerCase();
  let visible = 0;
  for (const button of elements.destinationList.querySelectorAll("[data-destination]")) {
    const destination = destinationById(button.dataset.destination);
    const haystack = `${destination.name} ${destination.description} ${FLOOR_META[destination.floor].name}`.toLowerCase();
    const show = !query || haystack.includes(query);
    button.hidden = !show;
    if (show) visible += 1;
  }
  const noResults = document.querySelector("#noResults");
  if (noResults) noResults.hidden = visible > 0;
  elements.destinationCount.textContent = visible === 1 ? "1 place" : `${visible} places`;
}

function visibleDestinationIds() {
  return [...elements.destinationList.querySelectorAll("[data-destination]:not([hidden])")].map(
    (button) => button.dataset.destination,
  );
}

function setActiveFloor(floorId, { animate = true } = {}) {
  state.activeFloor = floorId;
  for (const button of document.querySelectorAll("[data-floor]")) {
    button.setAttribute("aria-pressed", String(button.dataset.floor === floorId));
  }
  if (floorId === "overview") {
    elements.sceneLevelTitle.textContent = "Both floors";
    elements.sceneLevelSub.textContent = "Ground left · upper right";
  } else {
    const meta = FLOOR_META[floorId];
    elements.sceneLevelTitle.textContent = meta.name;
    elements.sceneLevelSub.textContent = meta.subtitle;
  }
  directoryScene?.setFloor(floorId, animate);
  updateRouteLevelPill();
}

function floorsInRoute(route) {
  return new Set((route?.nodes || []).map((nodeId) => NODES[nodeId].floor));
}

function updateRouteLevelPill() {
  const destination = destinationById(state.destinationId);
  if (!destination) {
    elements.routeLevelPill.hidden = true;
    return;
  }

  elements.routeLevelPill.hidden = false;
  elements.routeLevelPill.classList.remove("is-warning");

  if (!currentRoute) {
    elements.routeLevelText.textContent = state.liftOut && state.stepFree
      ? "No step-free route to the upper floor"
      : "No route available on this level";
    elements.routeLevelPill.classList.add("is-warning");
    return;
  }

  const floors = floorsInRoute(currentRoute);
  const transition = currentRoute.transition;
  const transitionLabel = transition?.kind === "lift" ? "lift" : transition?.kind === "stairs" ? "stairs" : "walking";
  if (floors.size > 1) {
    if (state.activeFloor === "overview") {
      elements.routeLevelText.textContent = `2-floor route · use the ${transitionLabel}`;
    } else if (state.activeFloor === "ground") {
      elements.routeLevelText.textContent = `Route starts here · continues on ${FLOOR_META.upper.name}`;
    } else {
      elements.routeLevelText.textContent = `Route arrives here · from ${FLOOR_META.ground.name}`;
    }
  } else if (state.activeFloor === "overview" || state.activeFloor === destination.floor) {
    elements.routeLevelText.textContent = `Route on ${FLOOR_META[destination.floor].name.toLowerCase()}`;
  } else {
    elements.routeLevelText.textContent = `Destination is on ${FLOOR_META[destination.floor].name}`;
    elements.routeLevelPill.classList.add("is-warning");
  }
}

function chip(label, iconName, warning = false) {
  return `<span class="route-chip${warning ? " is-warning" : ""}">${icon(iconName)}${label}</span>`;
}

function renderRouteChips(destination, route, directions) {
  const chips = [];
  if (!route) {
    chips.push(chip("Step-free blocked", "warning", true));
    if (state.liftOut) chips.push(chip("Lift unavailable", "lift", true));
  } else {
    chips.push(chip(state.stepFree ? "Step-free" : "Standard route", state.stepFree ? "check" : "clock"));
    if (route.transition?.kind === "lift") chips.push(chip("Lift between floors", "lift"));
    else if (route.transition?.kind === "stairs") chips.push(chip("Stairs between floors", "stairs"));
    else chips.push(chip("No level change", "sameFloor"));
    if (state.liftOut) chips.push(chip("Lift out of service", "warning", true));
    if (directions.length > 0 && route.nodes.length === 1) chips.push(chip("You're already here", "sameFloor"));
  }
  elements.routeChips.innerHTML = chips.join("");
}

function renderDirections(directions, route) {
  if (!route) {
    elements.directionsList.innerHTML = `
      <li class="direction-step is-level-change">
        <span class="step-number">!</span>
        <div class="direction-copy">
          <strong>This route needs the lift</strong>
          <span>Turn off step-free routing to use the stairs, or ask staff for an alternative.</span>
        </div>
      </li>`;
    return;
  }

  elements.directionsList.innerHTML = directions.map((step, index) => {
    const classes = [
      "direction-step",
      step.kind === "level" ? "is-level-change" : "",
      step.kind === "final" ? "is-final" : "",
    ].filter(Boolean).join(" ");
    const number = step.kind === "final" ? "✓" : index + 1;
    return `
      <li class="${classes}">
        <span class="step-number">${number}</span>
        <div class="direction-copy">
          <strong>${step.title}</strong>
          <span>${step.detail}</span>
        </div>
      </li>`;
  }).join("");
}

function renderEmptyRoute() {
  elements.routePanelTitle.textContent = "Plan your visit";
  elements.clearRoute.hidden = true;
  elements.routeContent.hidden = true;
  elements.routeEmpty.hidden = false;
  elements.routeLevelPill.hidden = true;
  elements.sceneHint.classList.remove("is-hidden");
  elements.directionsList.innerHTML = "";
  elements.routeNotice.hidden = true;
}

function updateRoute({ autoFocus = false } = {}) {
  const destination = destinationById(state.destinationId);
  const start = startById(state.startId);
  if (!destination) {
    currentRoute = null;
    directoryScene?.drawRoute(null);
    directoryScene?.setSelectedDestination(null);
    renderEmptyRoute();
    updateSelectedDestinationCards();
    return;
  }

  currentRoute = findRoute(start.node, destination.node, {
    stepFree: state.stepFree,
    liftOut: state.liftOut,
  });
  const directions = buildDirections(currentRoute, start, destination, { stepFree: state.stepFree });

  elements.routePanelTitle.textContent = destination.name;
  elements.clearRoute.hidden = false;
  elements.routeContent.hidden = false;
  elements.routeEmpty.hidden = true;
  elements.sceneHint.classList.add("is-hidden");
  elements.summaryDestination.textContent = destination.name;
  elements.summaryFloor.textContent = currentRoute
    ? `${FLOOR_META[destination.floor].name} · ${formatDuration(currentRoute.distance)}`
    : `${FLOOR_META[destination.floor].name} · route unavailable`;
  elements.routeDistance.textContent = currentRoute ? formatDistance(currentRoute.distance) : "—";
  elements.stepfreeToggle.setAttribute("aria-checked", String(state.stepFree));
  elements.startFromHere.querySelector("span").textContent = `Start another route from ${destination.shortName}`;

  renderRouteChips(destination, currentRoute, directions);
  renderDirections(directions, currentRoute);

  if (!currentRoute) {
    const liftMessage = state.liftOut && state.stepFree
      ? "The passenger lift is out of service, so there is no step-free route to an upper-floor destination. Turn off step-free routing to use the stairs, or ask a staff member for help."
      : "A route could not be calculated between these points. Try another starting point or ask staff for assistance.";
    elements.routeNotice.innerHTML = `<strong>No step-free route available.</strong> ${liftMessage}`;
    elements.routeNotice.hidden = false;
  } else if (state.stepFree && currentRoute.transition?.kind === "lift" && state.liftOut) {
    elements.routeNotice.textContent = "The lift is currently marked out of service.";
    elements.routeNotice.hidden = false;
  } else {
    elements.routeNotice.hidden = true;
    elements.routeNotice.textContent = "";
  }

  directoryScene?.drawRoute(currentRoute, { stepFree: state.stepFree, destinationId: destination.id });
  directoryScene?.setSelectedDestination(destination.id);
  updateSelectedDestinationCards();

  if (autoFocus) {
    const floors = floorsInRoute(currentRoute);
    if (floors.size > 1) setActiveFloor("overview");
    else setActiveFloor(destination.floor);
  } else {
    updateRouteLevelPill();
  }
}

function selectDestination(destinationId, { autoFocus = true } = {}) {
  if (!destinationById(destinationId)) return;
  state.destinationId = destinationId;
  state.query = "";
  elements.searchInput.value = "";
  filterDestinations();
  updateRoute({ autoFocus });
}

function clearDestination({ focusScene = true } = {}) {
  state.destinationId = null;
  currentRoute = null;
  updateSelectedDestinationCards();
  directoryScene?.drawRoute(null);
  directoryScene?.setSelectedDestination(null);
  renderEmptyRoute();
  if (focusScene) showToast("Route cleared. Choose a destination when you're ready.");
}

function setStart(startId, { toast = false } = {}) {
  if (!startById(startId)) return;
  state.startId = startId;
  elements.startSelect.value = startId;
  if (state.destinationId) updateRoute();
  if (toast) showToast(`Starting from ${startById(startId).label.replace(" · Upper", "")}.`);
}

function syncLiftUi() {
  elements.stepfreeToggle.setAttribute("aria-checked", String(state.stepFree));
  elements.liftServiceToggle.setAttribute("aria-checked", String(state.liftOut));
  elements.liftServiceToggle.setAttribute("aria-label", state.liftOut ? "Return lift to service" : "Take lift out of service");
  elements.liftStatusCard.classList.toggle("is-offline", state.liftOut);
  elements.liftModalStatus.textContent = state.liftOut ? "Out of service" : "In service";
  elements.liftModalDescription.textContent = state.liftOut
    ? "Upper-floor step-free routing is paused until service resumes."
    : "Step-free routes between floors are available.";
  elements.liftStatusBadge.textContent = state.liftOut ? "Offline" : "Normal";
  elements.serviceStrip.classList.toggle("is-offline", state.liftOut);
  elements.serviceStripText.textContent = state.liftOut ? "Lift out of service" : "Lift service normal";
  elements.systemPill.classList.toggle("is-offline", state.liftOut);
  elements.systemText.textContent = state.liftOut ? "Lift out of service" : "Directory online";
}

function setStepFree(enabled) {
  state.stepFree = enabled;
  elements.stepfreeToggle.setAttribute("aria-checked", String(enabled));
  if (state.destinationId) updateRoute();
  showToast(enabled
    ? "Step-free routing is on. Routes will use the lift and avoid stairs."
    : "Shortest walking route selected. Stairs may be used between floors.");
}

function setLiftOut(outOfService) {
  state.liftOut = outOfService;
  syncLiftUi();
  if (state.destinationId) updateRoute();
  showToast(outOfService
    ? "Lift marked out of service. Upper-floor step-free routes are now unavailable."
    : "Lift returned to service. Step-free routes are available again.");
}

function openStaffModal() {
  elements.staffModal.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elements.closeStaffModal.focus(), 30);
}

function closeStaffModal() {
  elements.staffModal.hidden = true;
  document.body.style.overflow = "";
  elements.staffButton.focus();
}

function wireEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    filterDestinations();
  });
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = visibleDestinationIds()[0];
      if (first) selectDestination(first);
    }
    if (event.key === "Escape" && elements.searchInput.value) {
      elements.searchInput.value = "";
      state.query = "";
      filterDestinations();
    }
  });
  elements.startSelect.addEventListener("change", () => setStart(elements.startSelect.value));

  for (const button of document.querySelectorAll("[data-floor]")) {
    button.addEventListener("click", () => setActiveFloor(button.dataset.floor));
  }
  for (const button of document.querySelectorAll("[data-suggest]")) {
    button.addEventListener("click", () => selectDestination(button.dataset.suggest));
  }

  elements.clearRoute.addEventListener("click", () => clearDestination());
  elements.stepfreeToggle.addEventListener("click", () => setStepFree(!state.stepFree));
  elements.liftServiceToggle.addEventListener("click", () => setLiftOut(!state.liftOut));
  elements.staffButton.addEventListener("click", openStaffModal);
  elements.serviceStripButton.addEventListener("click", openStaffModal);
  elements.closeStaffModal.addEventListener("click", closeStaffModal);
  elements.staffDone.addEventListener("click", closeStaffModal);
  elements.staffModal.addEventListener("click", (event) => {
    if (event.target === elements.staffModal) closeStaffModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.staffModal.hidden) closeStaffModal();
  });

  elements.startFromHere.addEventListener("click", () => {
    const destination = destinationById(state.destinationId);
    if (!destination) return;
    const matchingStart = STARTS.find((start) => start.id === destination.id);
    if (!matchingStart) {
      showToast("This room is not a saved starting point. Please choose one from the start menu.");
      return;
    }
    state.startId = matchingStart.id;
    elements.startSelect.value = matchingStart.id;
    clearDestination({ focusScene: false });
    showToast(`Starting point set to ${matchingStart.label.replace(" · Upper", "")}. Choose where to go next.`);
  });

  elements.zoomIn.addEventListener("click", () => directoryScene?.zoomBy(1.16));
  elements.zoomOut.addEventListener("click", () => directoryScene?.zoomBy(1 / 1.16));
  elements.resetView.addEventListener("click", () => {
    directoryScene?.resetView();
    setActiveFloor("overview");
  });
}

function initializeScene() {
  try {
    directoryScene = new DirectoryScene(elements.scene, {
      onSelect: (destinationId) => selectDestination(destinationId),
      onHover: () => {},
    });
    directoryScene.setSelectedDestination(state.destinationId);
    updateRoute({ autoFocus: false });
    setActiveFloor("overview", { animate: false });
  } catch (error) {
    console.error("Unable to initialize the 3D directory", error);
    elements.scene.innerHTML = `
      <div style="height:100%;display:grid;place-items:center;padding:30px;text-align:center;color:#e9e1d1;">
        <div>
          <strong style="display:block;font-family:Georgia,serif;font-size:24px;margin-bottom:8px;">3D view unavailable</strong>
          <span style="font-size:12px;line-height:1.5;">Use the destination list and direction panel, which remain fully operational.</span>
        </div>
      </div>`;
  }
}

renderStartOptions();
renderDestinations();
filterDestinations();
wireEvents();
syncLiftUi();
initializeScene();
