import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const RACK_CAPACITY = 42;
const POWER_BUDGET = 3000;
const STORAGE_KEY = "rackline-plan-v1";
const UNIT_HEIGHT = 0.19;
const RACK_BOTTOM = 0.28;
const RACK_INNER_HEIGHT = RACK_CAPACITY * UNIT_HEIGHT;
const RACK_TOP = RACK_BOTTOM + RACK_INNER_HEIGHT;
const RACK_WIDTH = 2.18;
const RACK_DEPTH = 1;
const RACK_INNER_WIDTH = 1.9;
const FRONT_Z = RACK_DEPTH / 2 + 0.012;
const REAR_Z = -RACK_DEPTH / 2 - 0.012;
const CAMERA_TARGET_Y = RACK_TOP / 2 + 0.05;

const CATALOG = [
  {
    id: "patch",
    name: "Patch panel",
    short: "PP",
    height: 1,
    power: 0,
    color: "#45d6c0",
    description: "24-port copper patch panel",
  },
  {
    id: "switch",
    name: "Network switch",
    short: "SW",
    height: 1,
    power: 150,
    color: "#65c6ff",
    description: "48-port access switch",
  },
  {
    id: "compute",
    name: "Compute server",
    short: "CS",
    height: 2,
    power: 500,
    color: "#ffc75a",
    description: "Dual-socket 2U compute node",
  },
  {
    id: "storage",
    name: "Storage array",
    short: "SA",
    height: 4,
    power: 800,
    color: "#b092ff",
    description: "24-bay storage enclosure",
  },
  {
    id: "blank",
    name: "Blank panel",
    short: "BP",
    height: 1,
    power: 0,
    color: "#8090a1",
    description: "Vented 1U blanking panel",
  },
];

const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((item) => [item.id, item]));

const RACK_META = {
  A: { id: "A", name: "Rack A", x: -1.53, color: "#6ad8f6" },
  B: { id: "B", name: "Rack B", x: 1.53, color: "#c9f36b" },
};

const SAMPLE_PLAN = {
  version: 1,
  racks: {
    A: {
      devices: [
        { id: "a-patch-01", type: "patch", start: 42 },
        { id: "a-switch-01", type: "switch", start: 41 },
        { id: "a-compute-01", type: "compute", start: 39 },
        { id: "a-compute-02", type: "compute", start: 37 },
        { id: "a-storage-01", type: "storage", start: 33 },
        { id: "a-blank-01", type: "blank", start: 27 },
      ],
    },
    B: {
      devices: [
        { id: "b-patch-01", type: "patch", start: 42 },
        { id: "b-switch-01", type: "switch", start: 41 },
        { id: "b-storage-01", type: "storage", start: 36 },
        { id: "b-compute-01", type: "compute", start: 34 },
        { id: "b-compute-02", type: "compute", start: 31 },
        { id: "b-blank-01", type: "blank", start: 30 },
      ],
    },
  },
};

const els = {
  saveState: document.getElementById("saveState"),
  exportButton: document.getElementById("exportButton"),
  resetButton: document.getElementById("resetButton"),
  sceneViewport: document.getElementById("sceneViewport"),
  sceneLoading: document.getElementById("sceneLoading"),
  viewBadge: document.getElementById("viewBadge"),
  dragReadout: document.getElementById("dragReadout"),
  rackSummaryGrid: document.getElementById("rackSummaryGrid"),
  catalogGrid: document.getElementById("catalogGrid"),
  placementForm: document.getElementById("placementForm"),
  rackTargetSwitch: document.getElementById("rackTargetSwitch"),
  startUnit: document.getElementById("startUnit"),
  addButton: document.getElementById("addButton"),
  addButtonLabel: document.getElementById("addButtonLabel"),
  selectionContent: document.getElementById("selectionContent"),
  selectionBadge: document.getElementById("selectionBadge"),
  rackListGrid: document.getElementById("rackListGrid"),
  toastRegion: document.getElementById("toastRegion"),
};

let state = loadPlan();
let selectedCatalogId = "compute";
let selectedDeviceId = "a-switch-01";
let targetRack = "A";
let currentView = "front";
let saveStatusTimer = null;

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let deviceLayer = null;
let devicePickMeshes = [];
let placementSurfaces = [];
let raycaster = null;
let pointerNdc = new THREE.Vector2();
let sceneReady = false;
let resizeObserver = null;
let animationFrame = null;
let ghost = null;
let pointerState = null;

const numberFormatter = new Intl.NumberFormat("en-US");

function cloneSamplePlan() {
  return JSON.parse(JSON.stringify(SAMPLE_PLAN));
}

function loadPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSamplePlan();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !parsed?.racks?.A || !parsed?.racks?.B) {
      return cloneSamplePlan();
    }

    const normalized = { version: 1, racks: { A: { devices: [] }, B: { devices: [] } } };
    for (const rackId of ["A", "B"]) {
      const sourceDevices = parsed.racks[rackId]?.devices;
      if (!Array.isArray(sourceDevices)) return cloneSamplePlan();
      for (const device of sourceDevices) {
        const definition = CATALOG_BY_ID[device?.type];
        if (!definition || !Number.isInteger(device.start)) return cloneSamplePlan();
        if (device.start < 1 || device.start + definition.height - 1 > RACK_CAPACITY) {
          return cloneSamplePlan();
        }
        const savedId = typeof device.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(device.id)
          ? device.id
          : makeDeviceId();
        normalized.racks[rackId].devices.push({
          id: savedId,
          type: definition.id,
          start: device.start,
        });
      }
    }

    if (!planHasValidLayout(normalized)) return cloneSamplePlan();
    sortRacks(normalized);
    return normalized;
  } catch {
    return cloneSamplePlan();
  }
}

function planHasValidLayout(plan) {
  for (const rackId of ["A", "B"]) {
    const occupied = new Map();
    for (const device of plan.racks[rackId].devices) {
      const definition = CATALOG_BY_ID[device.type];
      for (let unit = device.start; unit < device.start + definition.height; unit += 1) {
        if (occupied.has(unit)) return false;
        occupied.set(unit, device.id);
      }
    }
  }
  return true;
}

function savePlan() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (els.saveState) {
      clearTimeout(saveStatusTimer);
      els.saveState.classList.add("is-saving");
      els.saveState.lastElementChild.textContent = "Saving…";
      saveStatusTimer = window.setTimeout(() => {
        els.saveState.classList.remove("is-saving");
        els.saveState.lastElementChild.textContent = "Saved locally";
      }, 380);
    }
  } catch {
    showToast("Could not save", "Browser storage is unavailable. The current plan is still editable.", "error");
  }
}

function sortRacks(plan = state) {
  for (const rackId of ["A", "B"]) {
    plan.racks[rackId].devices.sort((a, b) => b.start - a.start || a.id.localeCompare(b.id));
  }
}

function makeDeviceId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDevice(deviceId) {
  if (!deviceId) return null;
  for (const rackId of ["A", "B"]) {
    const device = state.racks[rackId].devices.find((candidate) => candidate.id === deviceId);
    if (device) return { device, rackId, definition: CATALOG_BY_ID[device.type] };
  }
  return null;
}

function getRackStats(rackId) {
  const devices = state.racks[rackId].devices;
  const occupied = devices.reduce((total, device) => total + CATALOG_BY_ID[device.type].height, 0);
  const power = devices.reduce((total, device) => total + CATALOG_BY_ID[device.type].power, 0);
  return {
    occupied,
    remaining: RACK_CAPACITY - occupied,
    power,
    deviceCount: devices.length,
    overBudget: power > POWER_BUDGET,
    unitPercent: (occupied / RACK_CAPACITY) * 100,
    powerPercent: Math.min((power / POWER_BUDGET) * 100, 100),
  };
}

function getPlacementError(rackId, start, height, excludeDeviceId = null) {
  if (!RACK_META[rackId]) return "Choose a valid rack.";
  if (!Number.isInteger(start)) return "Starting unit must be a whole number.";
  if (start < 1) return "Starting unit cannot be below U1.";

  const end = start + height - 1;
  if (end > RACK_CAPACITY) {
    return `A ${height}U device starting at U${start} would extend past U${RACK_CAPACITY}.`;
  }

  for (const device of state.racks[rackId].devices) {
    if (device.id === excludeDeviceId) continue;
    const definition = CATALOG_BY_ID[device.type];
    const deviceEnd = device.start + definition.height - 1;
    if (start <= deviceEnd && end >= device.start) {
      return `U${device.start}${definition.height > 1 ? `–U${deviceEnd}` : ""} is occupied by ${definition.name.toLowerCase()}.`;
    }
  }
  return "";
}

function unitRangeLabel(start, height) {
  return height === 1 ? `U${start}` : `U${start}–U${start + height - 1}`;
}

function renderCatalog() {
  els.catalogGrid.innerHTML = CATALOG.map((item) => {
    const selected = item.id === selectedCatalogId;
    return `
      <button
        type="button"
        class="catalog-item${selected ? " is-selected" : ""}"
        data-catalog-id="${item.id}"
        style="--device-color:${item.color}"
        aria-pressed="${selected}"
        title="${item.description} · ${item.height}U · ${item.power} W"
      >
        <span class="catalog-item-top">
          <span class="device-glyph" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="catalog-check" aria-hidden="true">
            <svg viewBox="0 0 10 10"><path d="m2 5.1 1.9 1.9L8 2.8" /></svg>
          </span>
        </span>
        <span class="catalog-name">${item.name}</span>
        <span class="catalog-spec">${item.height}U · ${item.power} W</span>
      </button>
    `;
  }).join("");

  const selected = CATALOG_BY_ID[selectedCatalogId];
  els.addButtonLabel.textContent = `Place ${selected.name.toLowerCase()}`;
}

function renderRackSummaries() {
  els.rackSummaryGrid.innerHTML = Object.values(RACK_META).map((rack) => {
    const stats = getRackStats(rack.id);
    const overBy = stats.power - POWER_BUDGET;
    const budgetText = stats.overBudget
      ? `<span class="budget-chip is-over"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.4 9 8.4H1z" /><path d="M5 3.7v2.1M5 7.1v.1" /></svg>Over by ${numberFormatter.format(overBy)} W</span>`
      : `<span class="budget-chip"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="m2 5.2 1.9 1.9L8 2.9" /></svg>Budget 3,000 W</span>`;

    return `
      <article class="rack-summary${stats.overBudget ? " is-over" : ""}" style="--rack-color:${rack.color}" aria-label="${rack.name}: ${stats.occupied} of 42 units occupied, ${numberFormatter.format(stats.power)} watts">
        <div class="rack-id" aria-hidden="true">
          <span>${rack.id}</span>
          <small>42U</small>
        </div>
        <div class="rack-stats">
          <div class="rack-stats-head">
            <strong>${rack.name}</strong>
            ${budgetText}
          </div>
          <div class="metric-row">
            <div class="metric"><span>Occupied U</span><strong>${stats.occupied} / 42</strong></div>
            <div class="metric"><span>Remaining</span><strong>${stats.remaining} U</strong></div>
            <div class="metric metric-power"><span>Est. power</span><strong>${numberFormatter.format(stats.power)} W</strong></div>
          </div>
          <div class="meter-stack" aria-hidden="true">
            <div class="meter"><i style="width:${stats.unitPercent}%"></i></div>
            <div class="meter meter-power"><i style="width:${stats.powerPercent}%"></i></div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderSelection() {
  const match = getDevice(selectedDeviceId);
  if (!match) {
    selectedDeviceId = null;
    els.selectionBadge.textContent = "None";
    els.selectionBadge.classList.remove("has-selection");
    els.selectionBadge.style.removeProperty("--device-color");
    els.selectionContent.innerHTML = `
      <div class="selection-empty">
        <svg viewBox="0 0 22 22" aria-hidden="true"><path d="M4 4h14v14H4z" /><path d="M7.5 8h7M7.5 11h7M7.5 14h4" /></svg>
        <p>Select a device in the rack, scene, or unit map. Its position and controls will appear here.</p>
      </div>
    `;
    return;
  }

  const { device, rackId, definition } = match;
  const range = unitRangeLabel(device.start, definition.height);
  const rack = RACK_META[rackId];
  els.selectionBadge.textContent = `${rack.name} · ${range}`;
  els.selectionBadge.classList.add("has-selection");
  els.selectionBadge.style.setProperty("--device-color", definition.color);

  els.selectionContent.innerHTML = `
    <article class="selected-card" style="--device-color:${definition.color}">
      <div class="selected-top">
        <span class="selected-type-icon" aria-hidden="true">${definition.short}</span>
        <span class="selected-copy">
          <strong>${definition.name}</strong>
          <span>${rack.name} · ${range} · ${definition.height}U</span>
        </span>
        <button class="icon-button remove-button" type="button" data-action="remove-selected" title="Remove selected device" aria-label="Remove ${definition.name}">
          <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M4 5.5h10M7 5.5V3.8h4v1.7M5.5 5.5l.7 8.4h5.6l.7-8.4M7.7 8v3.7M10.3 8v3.7" /></svg>
        </button>
      </div>
      <div class="selected-specs">
        <div class="spec-box"><span>Position</span><strong>${rack.name} · ${range}</strong></div>
        <div class="spec-box"><span>Height</span><strong>${definition.height}U</strong></div>
        <div class="spec-box"><span>Power</span><strong>${numberFormatter.format(definition.power)} W</strong></div>
      </div>
      <div class="move-form">
        <label class="field">
          <span class="field-label">Move to rack</span>
          <span class="compact-switch" role="group" aria-label="Move to rack">
            <button type="button" data-move-rack="A" class="${rackId === "A" ? "is-active" : ""}" aria-pressed="${rackId === "A"}">A</button>
            <button type="button" data-move-rack="B" class="${rackId === "B" ? "is-active" : ""}" aria-pressed="${rackId === "B"}">B</button>
          </span>
        </label>
        <label class="field" for="moveStartUnit">
          <span class="field-label">Start unit</span>
          <span class="unit-field"><span>U</span><input id="moveStartUnit" type="number" inputmode="numeric" min="1" max="42" step="1" value="${device.start}" /></span>
        </label>
        <button class="button" type="button" data-action="move-selected">Move</button>
      </div>
    </article>
  `;
}

function renderRackMaps(options = {}) {
  const scrollPositions = captureMapScrollPositions();
  els.rackListGrid.innerHTML = Object.values(RACK_META).map((rack) => {
    const devices = state.racks[rack.id].devices;
    const byUnit = new Map();
    for (const device of devices) {
      const definition = CATALOG_BY_ID[device.type];
      for (let unit = device.start; unit < device.start + definition.height; unit += 1) {
        byUnit.set(unit, { device, definition });
      }
    }

    const rows = [];
    for (let unit = RACK_CAPACITY; unit >= 1; unit -= 1) {
      const occupied = byUnit.get(unit);
      if (occupied) {
        const { device, definition } = occupied;
        const topUnit = device.start + definition.height - 1;
        const selected = device.id === selectedDeviceId;
        const classes = [
          "unit-row",
          "has-device",
          unit === topUnit ? "device-start" : "",
          selected ? "is-selected" : "",
        ].filter(Boolean).join(" ");
        rows.push(`
          <button
            type="button"
            class="${classes}"
            data-rack="${rack.id}"
            data-unit="${unit}"
            data-device="${device.id}"
            style="--device-color:${definition.color}"
            aria-label="${rack.name}, U${unit}, ${definition.name}, ${selected ? "selected" : "select device"}"
          >
            <span class="u-num">${unit}</span>
            <span class="u-content">${unit === topUnit ? definition.name : ""}</span>
          </button>
        `);
      } else {
        rows.push(`
          <button
            type="button"
            class="unit-row"
            data-rack="${rack.id}"
            data-unit="${unit}"
            aria-label="${rack.name}, U${unit}, free. Place ${CATALOG_BY_ID[selectedCatalogId].name} here"
          >
            <span class="u-num">${unit}</span>
            <span class="u-content"></span>
          </button>
        `);
      }
    }

    return `
      <section class="rack-column" aria-label="${rack.name} unit map" style="--rack-color:${rack.color}">
        <div class="rack-column-head">
          <strong>${rack.name.toUpperCase()}</strong>
          <span>${getRackStats(rack.id).occupied}U USED</span>
        </div>
        <div class="unit-row-list" data-rack-list="${rack.id}" role="list">${rows.join("")}</div>
      </section>
    `;
  }).join("");

  restoreMapScrollPositions(scrollPositions);
  if (options.scrollToSelection) scrollListToSelection();
}

function captureMapScrollPositions() {
  const positions = {};
  els.rackListGrid.querySelectorAll("[data-rack-list]").forEach((list) => {
    positions[list.dataset.rackList] = list.scrollTop;
  });
  return positions;
}

function restoreMapScrollPositions(positions) {
  els.rackListGrid.querySelectorAll("[data-rack-list]").forEach((list) => {
    if (Number.isFinite(positions[list.dataset.rackList])) {
      list.scrollTop = positions[list.dataset.rackList];
    }
  });
}

function syncListSelection(scrollToSelection = false) {
  els.rackListGrid.querySelectorAll(".unit-row").forEach((row) => {
    const selected = Boolean(selectedDeviceId) && row.dataset.device === selectedDeviceId;
    row.classList.toggle("is-selected", selected);
    if (row.dataset.device) {
      const match = getDevice(row.dataset.device);
      if (match) {
        const prefix = `${RACK_META[match.rackId].name}, U${row.dataset.unit}, ${match.definition.name}`;
        row.setAttribute("aria-label", `${prefix}, ${selected ? "selected" : "select device"}`);
      }
    }
  });
  if (scrollToSelection) scrollListToSelection();
}

function scrollListToSelection() {
  if (!selectedDeviceId) return;
  const row = els.rackListGrid.querySelector(`.unit-row[data-device="${cssEscape(selectedDeviceId)}"]`);
  if (!row) return;
  const list = row.closest("[data-rack-list]");
  if (!list) return;
  const rowRect = row.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const rowTop = rowRect.top - listRect.top + list.scrollTop;
  const target = rowTop - list.clientHeight / 2 + row.offsetHeight / 2;
  list.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function renderAll(options = {}) {
  if (selectedDeviceId && !getDevice(selectedDeviceId)) selectedDeviceId = null;
  renderRackSummaries();
  renderRackMaps({ scrollToSelection: options.scrollToSelection === true });
  renderSelection();
  rebuildDeviceScene();
  syncSceneSelection();
}

function selectDevice(deviceId, options = {}) {
  if (!getDevice(deviceId)) return;
  selectedDeviceId = deviceId;
  renderSelection();
  syncListSelection(options.scroll !== false);
  syncSceneSelection();
}

function clearSelection() {
  selectedDeviceId = null;
  renderSelection();
  syncListSelection(false);
  syncSceneSelection();
}

function placeEquipment(typeId, rackId, start) {
  const definition = CATALOG_BY_ID[typeId];
  if (!definition) return false;
  const error = getPlacementError(rackId, start, definition.height);
  if (error) {
    showToast("Placement blocked", error, "error");
    return false;
  }

  const device = { id: makeDeviceId(), type: typeId, start };
  state.racks[rackId].devices.push(device);
  sortRacks();
  selectedDeviceId = device.id;
  targetRack = rackId;
  els.startUnit.value = start;
  updateTargetRackUI();
  savePlan();
  renderAll({ scrollToSelection: true });

  const stats = getRackStats(rackId);
  if (stats.overBudget) {
    showToast(
      "Power budget exceeded",
      `${definition.name} placed in ${RACK_META[rackId].name} at ${unitRangeLabel(start, definition.height)}. Rack draw is now ${numberFormatter.format(stats.power)} W.`,
      "warning"
    );
  } else {
    showToast(
      "Equipment placed",
      `${definition.name} added to ${RACK_META[rackId].name} at ${unitRangeLabel(start, definition.height)}.`,
      "success"
    );
  }
  return true;
}

function moveDevice(deviceId, nextRackId, nextStart) {
  const match = getDevice(deviceId);
  if (!match) return false;
  const { device, definition } = match;
  const error = getPlacementError(nextRackId, nextStart, definition.height, deviceId);
  if (error) {
    showToast("Move blocked", `${error} Previous arrangement was kept.`, "error");
    return false;
  }

  if (match.rackId === nextRackId && device.start === nextStart) return true;

  for (const rackId of ["A", "B"]) {
    state.racks[rackId].devices = state.racks[rackId].devices.filter((candidate) => candidate.id !== deviceId);
  }
  device.start = nextStart;
  state.racks[nextRackId].devices.push(device);
  sortRacks();
  savePlan();
  renderAll({ scrollToSelection: true });

  const stats = getRackStats(nextRackId);
  if (stats.overBudget) {
    showToast(
      "Moved — over power budget",
      `${definition.name} is now in ${RACK_META[nextRackId].name} at ${unitRangeLabel(nextStart, definition.height)}. Rack draw is ${numberFormatter.format(stats.power)} W.`,
      "warning"
    );
  } else {
    showToast(
      "Equipment moved",
      `${definition.name} placed in ${RACK_META[nextRackId].name} at ${unitRangeLabel(nextStart, definition.height)}.`,
      "success"
    );
  }
  return true;
}

function removeSelectedDevice() {
  const match = getDevice(selectedDeviceId);
  if (!match) return;
  const { device, rackId, definition } = match;
  state.racks[rackId].devices = state.racks[rackId].devices.filter((candidate) => candidate.id !== device.id);
  selectedDeviceId = null;
  savePlan();
  renderAll();
  showToast("Device removed", `${definition.name} was removed from ${RACK_META[rackId].name}.`, "success");
}

function updateTargetRackUI() {
  els.rackTargetSwitch.querySelectorAll("[data-rack-target]").forEach((button) => {
    const active = button.dataset.rackTarget === targetRack;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateCatalogSelection(typeId) {
  selectedCatalogId = typeId;
  renderCatalog();
}

function exportCsv() {
  const rows = [["Rack", "Starting Unit", "Device Type", "Height (U)", "Power (W)"]];
  for (const rackId of ["A", "B"]) {
    const devices = [...state.racks[rackId].devices].sort((a, b) => b.start - a.start);
    for (const device of devices) {
      const definition = CATALOG_BY_ID[device.type];
      rows.push([RACK_META[rackId].name, device.start, definition.name, definition.height, definition.power]);
    }
  }

  const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `rackline-inventory-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  showToast("CSV exported", `${rows.length - 1} inventory rows saved for both racks.`, "success");
}

function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function showToast(title, message, tone = "success") {
  if (!els.toastRegion) return;
  const toast = document.createElement("div");
  toast.className = `toast${tone === "error" ? " is-error" : tone === "warning" ? " is-warning" : ""}`;
  const icon = tone === "error"
    ? '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3 3 9" /></svg>'
    : tone === "warning"
      ? '<svg viewBox="0 0 12 12"><path d="M6 2 10.5 10h-9z" /><path d="M6 4.7v2.4M6 8.7v.1" /></svg>'
      : '<svg viewBox="0 0 12 12"><path d="m2.3 6.2 2.3 2.3 5-5" /></svg>';
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span class="toast-copy"><strong>${escapeHtml(title)}</strong>${escapeHtml(message)}</span>
  `;
  els.toastRegion.appendChild(toast);
  while (els.toastRegion.children.length > 3) els.toastRegion.firstElementChild.remove();
  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 200);
  }, 3600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindUiEvents() {
  els.catalogGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-catalog-id]");
    if (!button) return;
    updateCatalogSelection(button.dataset.catalogId);
  });

  els.rackTargetSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rack-target]");
    if (!button) return;
    targetRack = button.dataset.rackTarget;
    updateTargetRackUI();
  });

  els.placementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const start = Number(els.startUnit.value);
    if (!Number.isInteger(start)) {
      showToast("Invalid starting unit", "Enter a whole number from 1 to 42.", "error");
      els.startUnit.focus();
      return;
    }
    placeEquipment(selectedCatalogId, targetRack, start);
  });

  els.selectionContent.addEventListener("click", (event) => {
    const rackButton = event.target.closest("[data-move-rack]");
    if (rackButton) {
      const group = rackButton.closest(".compact-switch");
      group.querySelectorAll("[data-move-rack]").forEach((button) => {
        const active = button === rackButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    if (actionButton.dataset.action === "remove-selected") {
      removeSelectedDevice();
      return;
    }
    if (actionButton.dataset.action === "move-selected") {
      const rackButton = els.selectionContent.querySelector("[data-move-rack].is-active");
      const startInput = document.getElementById("moveStartUnit");
      const nextRackId = rackButton?.dataset.moveRack || targetRack;
      const nextStart = Number(startInput?.value);
      if (!Number.isInteger(nextStart)) {
        showToast("Invalid starting unit", "Enter a whole number from 1 to 42.", "error");
        startInput?.focus();
        return;
      }
      moveDevice(selectedDeviceId, nextRackId, nextStart);
    }
  });

  els.rackListGrid.addEventListener("click", (event) => {
    const row = event.target.closest(".unit-row");
    if (!row) return;
    if (row.dataset.device) {
      selectDevice(row.dataset.device, { scroll: false });
      return;
    }

    const rackId = row.dataset.rack;
    const unit = Number.parseInt(row.dataset.unit, 10);
    targetRack = rackId;
    els.startUnit.value = unit;
    updateTargetRackUI();
    placeEquipment(selectedCatalogId, rackId, unit);
  });

  els.exportButton.addEventListener("click", exportCsv);

  els.resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset both racks to the sample installation? This will replace the saved plan.");
    if (!confirmed) return;
    state = cloneSamplePlan();
    selectedDeviceId = null;
    targetRack = "A";
    els.startUnit.value = 20;
    updateTargetRackUI();
    savePlan();
    renderAll();
    showToast("Sample restored", "Both racks have been reset to the original planning layout.", "success");
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.addEventListener("keydown", (event) => {
    const tagName = event.target?.tagName?.toLowerCase();
    const isTyping = tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;
    if (!isTyping && selectedDeviceId && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      removeSelectedDevice();
    }
    if (!isTyping && event.key === "Escape") clearSelection();
  });
}

function setView(view) {
  currentView = view === "rear" ? "rear" : "front";
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (els.viewBadge) {
    els.viewBadge.innerHTML = `<span>${currentView.toUpperCase()}</span><small>42U · 2 RACKS</small>`;
  }
  if (sceneReady) fitCameraToView();
}

function initScene() {
  try {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070b11, 17, 34);

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Interactive front and rear 3D view of two 42-unit server racks");
    renderer.domElement.setAttribute("role", "img");
    els.sceneViewport.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    deviceLayer = new THREE.Group();
    scene.add(deviceLayer);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 24;
    controls.minPolarAngle = 1.15;
    controls.maxPolarAngle = 1.98;
    controls.zoomSpeed = 0.65;
    controls.rotateSpeed = 0.48;

    buildEnvironment();
    buildRackFrames();
    sceneReady = true;
    rebuildDeviceScene();
    bindScenePointerEvents();
    resizeScene();

    resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(els.sceneViewport);

    setView(currentView);
    els.sceneLoading.classList.add("is-hidden");
    animateScene();
  } catch (error) {
    console.error(error);
    els.sceneLoading.innerHTML = "<span>3D view unavailable</span>";
    showToast("3D view unavailable", "The unit maps and all planning controls remain available.", "error");
  }
}

function buildEnvironment() {
  const hemisphere = new THREE.HemisphereLight(0xc4e8ff, 0x080b0f, 1.55);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xf7fbff, 2.7);
  keyLight.position.set(4.5, 10, 9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -2;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x57bfff, 1.55);
  rimLight.position.set(-5, 6, -8);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x78a6ff, 12, 18, 2);
  fillLight.position.set(0, 3.7, 7.5);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 72),
    new THREE.MeshStandardMaterial({ color: 0x060a0f, roughness: 0.96, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.015;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(30, 45, 0x274158, 0x152331);
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.34;
  scene.add(grid);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 9.8),
    new THREE.MeshBasicMaterial({ color: 0x173447, transparent: true, opacity: 0.12, depthWrite: false })
  );
  glow.position.set(0, 4.35, -1.05);
  scene.add(glow);
}

function buildRackFrames() {
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x25313e, metalness: 0.86, roughness: 0.29 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111923, metalness: 0.78, roughness: 0.36 });
  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x070c12, metalness: 0.45, roughness: 0.58 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x344150, metalness: 0.92, roughness: 0.25 });
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });

  for (const rack of Object.values(RACK_META)) {
    const group = new THREE.Group();
    group.position.x = rack.x;
    scene.add(group);

    const accent = new THREE.MeshStandardMaterial({
      color: rack.color,
      emissive: rack.color,
      emissiveIntensity: 0.24,
      metalness: 0.62,
      roughness: 0.32,
    });

    addBox(group, RACK_WIDTH, 0.12, RACK_DEPTH, 0, 0.08, 0, darkMetal);
    addBox(group, RACK_WIDTH - 0.16, 0.062, RACK_DEPTH - 0.04, 0, RACK_TOP + 0.04, 0, metalMaterial);
    addBox(group, RACK_WIDTH - 0.24, 0.018, 0.028, 0, RACK_TOP + 0.006, RACK_DEPTH / 2 + 0.003, accent);

    for (const side of [-1, 1]) {
      addBox(group, 0.06, RACK_INNER_HEIGHT + 0.15, 0.06, side * (RACK_WIDTH / 2 - 0.035), RACK_BOTTOM + RACK_INNER_HEIGHT / 2, RACK_DEPTH / 2 - 0.035, metalMaterial);
      addBox(group, 0.06, RACK_INNER_HEIGHT + 0.15, 0.06, side * (RACK_WIDTH / 2 - 0.035), RACK_BOTTOM + RACK_INNER_HEIGHT / 2, -RACK_DEPTH / 2 + 0.035, metalMaterial);
      addBox(group, 0.021, RACK_INNER_HEIGHT, RACK_DEPTH - 0.15, side * (RACK_WIDTH / 2 - 0.012), RACK_BOTTOM + RACK_INNER_HEIGHT / 2, 0, blackMaterial);
      addBox(group, 0.052, RACK_INNER_HEIGHT, 0.085, side * (RACK_INNER_WIDTH / 2 + 0.026), RACK_BOTTOM + RACK_INNER_HEIGHT / 2, RACK_DEPTH / 2 - 0.085, railMaterial);
      addBox(group, 0.052, RACK_INNER_HEIGHT, 0.085, side * (RACK_INNER_WIDTH / 2 + 0.026), RACK_BOTTOM + RACK_INNER_HEIGHT / 2, -RACK_DEPTH / 2 + 0.085, railMaterial);
    }

    addBox(group, RACK_WIDTH - 0.12, 0.066, 0.09, 0, RACK_BOTTOM - 0.026, RACK_DEPTH / 2 - 0.06, metalMaterial);
    addBox(group, RACK_WIDTH - 0.12, 0.066, 0.09, 0, RACK_BOTTOM - 0.026, -RACK_DEPTH / 2 + 0.06, metalMaterial);

    for (const footX of [-0.82, 0.82]) {
      for (const footZ of [-0.32, 0.32]) {
        addBox(group, 0.17, 0.045, 0.19, footX, 0.024, footZ, blackMaterial);
      }
    }

    const stripTexture = makeUnitStripTexture(rack);
    const stripMaterial = new THREE.MeshBasicMaterial({ map: stripTexture, transparent: true, side: THREE.FrontSide });
    const sideSign = rack.id === "A" ? -1 : 1;
    const stripX = sideSign * (RACK_WIDTH / 2 + 0.235);

    const frontStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.46, RACK_INNER_HEIGHT), stripMaterial);
    frontStrip.position.set(stripX, RACK_BOTTOM + RACK_INNER_HEIGHT / 2, RACK_DEPTH / 2 + 0.006);
    group.add(frontStrip);

    const rearStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.46, RACK_INNER_HEIGHT), stripMaterial);
    rearStrip.position.set(stripX, RACK_BOTTOM + RACK_INNER_HEIGHT / 2, -RACK_DEPTH / 2 - 0.006);
    rearStrip.rotation.y = Math.PI;
    group.add(rearStrip);

    const nameTexture = makeRackNameTexture(rack);
    const nameMaterial = new THREE.MeshBasicMaterial({ map: nameTexture, transparent: true, side: THREE.FrontSide });
    const frontName = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.335), nameMaterial);
    frontName.position.set(0, RACK_TOP + 0.33, RACK_DEPTH / 2 + 0.02);
    group.add(frontName);
    const rearName = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.335), nameMaterial);
    rearName.position.set(0, RACK_TOP + 0.33, -RACK_DEPTH / 2 - 0.02);
    rearName.rotation.y = Math.PI;
    group.add(rearName);

    const frontHit = new THREE.Mesh(new THREE.PlaneGeometry(RACK_INNER_WIDTH + 0.12, RACK_INNER_HEIGHT), hitMaterial.clone());
    frontHit.position.set(0, RACK_BOTTOM + RACK_INNER_HEIGHT / 2, FRONT_Z);
    frontHit.userData = { rackId: rack.id, surface: "front" };
    group.add(frontHit);
    placementSurfaces.push(frontHit);

    const rearHit = new THREE.Mesh(new THREE.PlaneGeometry(RACK_INNER_WIDTH + 0.12, RACK_INNER_HEIGHT), hitMaterial.clone());
    rearHit.position.set(0, RACK_BOTTOM + RACK_INNER_HEIGHT / 2, REAR_Z);
    rearHit.rotation.y = Math.PI;
    rearHit.userData = { rackId: rack.id, surface: "rear" };
    group.add(rearHit);
    placementSurfaces.push(rearHit);
  }
}

function addBox(parent, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeUnitStripTexture(rack) {
  const cellHeight = 50;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = RACK_CAPACITY * cellHeight;
  const ctx = canvas.getContext("2d");
  const accent = rack.color;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let unit = RACK_CAPACITY; unit >= 1; unit -= 1) {
    const row = RACK_CAPACITY - unit;
    const y = row * cellHeight;
    ctx.fillStyle = row % 2 === 0 ? "rgba(9,15,23,0.96)" : "rgba(16,26,38,0.96)";
    ctx.fillRect(0, y, canvas.width, cellHeight);
    ctx.fillStyle = "rgba(80,105,128,0.22)";
    ctx.fillRect(0, y, canvas.width, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(0, y + 9, 3, cellHeight - 18);
    ctx.fillStyle = unit % 5 === 0 ? accent : "#8d9baa";
    ctx.font = `${unit % 5 === 0 ? "700" : "550"} 31px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`U${unit}`, 67, y + cellHeight / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function makeRackNameTexture(rack) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = rack.color;
  ctx.font = "700 48px ui-monospace, monospace";
  ctx.fillText(rack.name.toUpperCase(), 256, 46);
  ctx.fillStyle = "rgba(180,196,211,0.68)";
  ctx.font = "500 20px ui-monospace, monospace";
  ctx.fillText("42U  /  EQUIPMENT", 256, 91);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function rebuildDeviceScene() {
  if (!sceneReady || !deviceLayer) return;
  for (const child of [...deviceLayer.children]) {
    deviceLayer.remove(child);
    disposeObject(child);
  }
  devicePickMeshes = [];

  for (const rackId of ["A", "B"]) {
    for (const device of state.racks[rackId].devices) {
      const group = makeDeviceGroup(device, rackId);
      deviceLayer.add(group);
    }
  }
  syncSceneSelection();
}

function makeDeviceGroup(device, rackId) {
  const definition = CATALOG_BY_ID[device.type];
  const height = definition.height * UNIT_HEIGHT - 0.022;
  const width = RACK_INNER_WIDTH - 0.035;
  const depth = 0.72;
  const centerY = RACK_BOTTOM + (device.start - 1 + definition.height / 2) * UNIT_HEIGHT;
  const group = new THREE.Group();
  group.position.set(RACK_META[rackId].x, centerY, 0.045);
  group.userData = { deviceId: device.id, rackId, start: device.start, height: definition.height };

  const bodyColor = new THREE.Color(definition.color).multiplyScalar(0.19);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.74,
    roughness: 0.34,
  });
  const faceColor = new THREE.Color(definition.color).multiplyScalar(0.48);
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: faceColor,
    emissive: new THREE.Color(definition.color).multiplyScalar(0.06),
    metalness: 0.5,
    roughness: 0.38,
  });
  const rearMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor.clone().multiplyScalar(1.22),
    metalness: 0.68,
    roughness: 0.42,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.018, height - 0.018), faceMaterial);
  frontFace.position.z = depth / 2 + 0.002;
  group.add(frontFace);

  const rearFace = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.018, height - 0.018), rearMaterial);
  rearFace.position.z = -depth / 2 - 0.002;
  rearFace.rotation.y = Math.PI;
  group.add(rearFace);

  addDeviceEdge(group, width, height, depth, definition.color);
  addDeviceDetails(group, definition, width, height, depth);
  addDeviceLabel(group, device, definition, width, height, depth, false);
  addDeviceLabel(group, device, definition, width, height, depth, true);

  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xd8ff84,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
  });
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.028, height + 0.028, depth + 0.028)),
    outlineMaterial
  );
  outline.visible = false;
  group.add(outline);
  group.userData.outline = outline;

  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.02, height + 0.02, depth + 0.07),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  pick.userData = { deviceId: device.id, rackId };
  group.add(pick);
  devicePickMeshes.push(pick);

  return group;
}

function addDeviceEdge(group, width, height, depth, color) {
  const edgeMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.008, depth + 0.006), edgeMaterial);
  top.position.y = height / 2 - 0.004;
  group.add(top);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, 0.008, depth + 0.006), edgeMaterial);
  bottom.position.y = -height / 2 + 0.004;
  group.add(bottom);
}

function addDeviceDetails(group, definition, width, height, depth) {
  const frontZ = depth / 2 + 0.008;
  const rearZ = -depth / 2 - 0.008;
  const detailMaterial = new THREE.MeshBasicMaterial({ color: definition.color, transparent: true, opacity: 0.62 });
  const darkDetail = new THREE.MeshBasicMaterial({ color: 0x04080d, transparent: true, opacity: 0.72 });
  const ledMaterial = new THREE.MeshBasicMaterial({ color: definition.id === "storage" ? 0x8ef7b0 : 0x72f4ff });

  if (definition.id === "patch" || definition.id === "switch") {
    const columns = definition.id === "switch" ? 10 : 8;
    const rows = 2;
    const portWidth = 0.069;
    const portHeight = Math.min(0.033, height * 0.18);
    const startX = 0.015;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = startX + column * 0.082;
        const y = (row - (rows - 1) / 2) * Math.min(0.052, height * 0.3);
        const port = new THREE.Mesh(new THREE.PlaneGeometry(portWidth, portHeight), darkDetail);
        port.position.set(x, y, frontZ);
        group.add(port);
      }
    }
  } else if (definition.id === "compute") {
    for (let index = 0; index < 7; index += 1) {
      const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.34, Math.max(0.008, height * 0.022)), darkDetail);
      vent.position.set(0.43, -height * 0.28 + index * Math.min(0.018, height * 0.042), frontZ);
      group.add(vent);
    }
    for (let index = 0; index < 3; index += 1) {
      const bay = new THREE.Mesh(new THREE.PlaneGeometry(0.095, Math.max(0.02, height * 0.075)), detailMaterial);
      bay.position.set(0.01 + index * 0.115, 0.025, frontZ);
      group.add(bay);
    }
  } else if (definition.id === "storage") {
    for (let column = 0; column < 8; column += 1) {
      for (let row = 0; row < 2; row += 1) {
        const bay = new THREE.Mesh(new THREE.PlaneGeometry(0.105, Math.max(0.032, height * 0.13)), darkDetail);
        bay.position.set(-0.08 + column * 0.112, (row - 0.5) * height * 0.25, frontZ);
        group.add(bay);
        const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.011, Math.max(0.016, height * 0.055)), detailMaterial);
        tab.position.set(bay.position.x - 0.035, bay.position.y, frontZ + 0.001);
        group.add(tab);
      }
    }
  } else {
    for (let index = 0; index < 10; index += 1) {
      const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.035, Math.max(0.012, height * 0.34)), darkDetail);
      vent.position.set(-0.1 + index * 0.088, 0, frontZ);
      group.add(vent);
    }
  }

  const led = new THREE.Mesh(new THREE.CircleGeometry(Math.min(0.014, height * 0.11), 12), ledMaterial);
  led.position.set(width / 2 - 0.11, height * 0.23, frontZ + 0.001);
  group.add(led);

  for (let index = 0; index < 9; index += 1) {
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.006), darkDetail);
    vent.position.set(0.08, -height * 0.33 + index * Math.min(0.014, height * 0.045), rearZ);
    vent.rotation.y = Math.PI;
    group.add(vent);
  }
}

function addDeviceLabel(group, device, definition, width, height, depth, rear) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(4,8,13,0.72)";
  ctx.fillRect(0, 8, canvas.width, 48);
  ctx.fillStyle = definition.color;
  ctx.font = "700 30px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(definition.short, 12, 33);
  ctx.fillStyle = "rgba(235,242,248,0.76)";
  ctx.font = "500 24px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(definition.height === 1 ? `U${device.start}` : `${definition.height}U`, 244, 33);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide });
  const labelHeight = Math.min(Math.max(height * 0.46, 0.061), 0.145);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, labelHeight), material);
  plane.position.set(-width / 2 + 0.47, height * 0.03, rear ? -depth / 2 - 0.012 : depth / 2 + 0.012);
  if (rear) plane.rotation.y = Math.PI;
  group.add(plane);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.map) material.map.dispose();
        material.dispose();
      }
    }
  });
}

function syncSceneSelection() {
  if (!deviceLayer) return;
  for (const group of deviceLayer.children) {
    if (group.userData.outline) {
      group.userData.outline.visible = group.userData.deviceId === selectedDeviceId;
    }
  }
}

function bindScenePointerEvents() {
  els.sceneViewport.addEventListener("pointerdown", onScenePointerDown, true);
  renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());
}

function onScenePointerDown(event) {
  if (!sceneReady || event.button !== 0) return;
  if (event.target !== renderer.domElement) return;
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const deviceHits = raycaster.intersectObjects(devicePickMeshes, false);

  pointerState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    hitDevice: deviceHits.length > 0,
    deviceId: deviceHits[0]?.object?.userData?.deviceId || null,
    grabOffset: 0,
    dragActive: false,
  };

  if (deviceHits.length) {
    event.preventDefault();
    event.stopPropagation();
    const hit = deviceHits[0];
    const match = getDevice(hit.object.userData.deviceId);
    selectDevice(hit.object.userData.deviceId, { scroll: true });
    if (match) {
      const hoverUnit = unitFromWorldY(hit.point.y);
      pointerState.grabOffset = THREE.MathUtils.clamp(hoverUnit - match.device.start, 0, match.definition.height - 1);
    }
    controls.enabled = false;
    renderer.domElement.classList.add("is-dragging");
    try {
      renderer.domElement.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; the window listeners still finish the gesture.
    }
  }

  window.addEventListener("pointermove", onScenePointerMove, { passive: false });
  window.addEventListener("pointerup", onScenePointerUp, { once: true });
  window.addEventListener("pointercancel", onScenePointerCancel, { once: true });
}

function onScenePointerMove(event) {
  if (!pointerState || event.pointerId !== pointerState.pointerId) return;
  const distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
  if (distance > 4) pointerState.moved = true;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;

  if (!pointerState.hitDevice || !pointerState.moved) return;
  event.preventDefault();
  if (!pointerState.dragActive) beginDrag(event);
  if (pointerState.dragActive) updateDrag(event);
}

function beginDrag(event) {
  const match = getDevice(pointerState.deviceId);
  if (!match) return;
  pointerState.dragActive = true;
  const height = match.definition.height * UNIT_HEIGHT - 0.022;
  const material = new THREE.MeshBasicMaterial({
    color: 0xc9f36b,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xc9f36b, transparent: true, opacity: 0.9 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edgeMaterial);
  mesh.add(edges);
  mesh.scale.set(RACK_INNER_WIDTH - 0.035, height, 0.75);
  scene.add(mesh);
  ghost = { mesh, material, edgeMaterial };
  els.dragReadout.hidden = false;
}

function updateDrag(event) {
  if (!ghost || !pointerState) return;
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(placementSurfaces, false);
  const match = getDevice(pointerState.deviceId);
  if (!hits.length || !match) {
    pointerState.dragTarget = null;
    ghost.mesh.visible = false;
    ghost.material.opacity = 0.04;
    els.dragReadout.textContent = "Move over a rack interior";
    els.dragReadout.className = "drag-readout is-invalid";
    positionDragReadout(event);
    return;
  }

  const hit = hits[0];
  ghost.mesh.visible = true;
  const rackId = hit.object.userData.rackId;
  const hoverUnit = unitFromWorldY(hit.point.y);
  const maxStart = RACK_CAPACITY - match.definition.height + 1;
  const start = THREE.MathUtils.clamp(hoverUnit - pointerState.grabOffset, 1, maxStart);
  pointerState.dragTarget = { rackId, start };

  const error = getPlacementError(rackId, start, match.definition.height, match.device.id);
  const height = match.definition.height * UNIT_HEIGHT - 0.022;
  const centerY = RACK_BOTTOM + (start - 1 + match.definition.height / 2) * UNIT_HEIGHT;
  ghost.mesh.position.set(RACK_META[rackId].x, centerY, 0.045);
  ghost.mesh.scale.set(RACK_INNER_WIDTH - 0.035, height, 0.75);
  const color = error ? 0xff6779 : 0xc9f36b;
  ghost.material.color.setHex(color);
  ghost.edgeMaterial.color.setHex(color);
  ghost.material.opacity = 0.15;

  els.dragReadout.textContent = error
    ? `${RACK_META[rackId].name} · ${unitRangeLabel(start, match.definition.height)} · blocked`
    : `${RACK_META[rackId].name} · ${unitRangeLabel(start, match.definition.height)} · release to move`;
  els.dragReadout.className = `drag-readout ${error ? "is-invalid" : "is-valid"}`;
  positionDragReadout(event);
}

function positionDragReadout(event) {
  const rect = els.sceneViewport.getBoundingClientRect();
  els.dragReadout.style.left = `${event.clientX - rect.left}px`;
  els.dragReadout.style.top = `${event.clientY - rect.top}px`;
}

function onScenePointerUp(event) {
  if (!pointerState || event.pointerId !== pointerState.pointerId) return;
  const snapshot = pointerState;
  const target = snapshot.dragTarget;
  const wasDrag = snapshot.dragActive;

  cleanupScenePointer();

  if (wasDrag) {
    if (target) moveDevice(snapshot.deviceId, target.rackId, target.start);
    return;
  }

  if (!snapshot.moved && !snapshot.hitDevice) {
    const placement = placementAtEvent(event);
    if (placement) {
      targetRack = placement.rackId;
      els.startUnit.value = placement.unit;
      updateTargetRackUI();
      placeEquipment(selectedCatalogId, placement.rackId, placement.unit);
    }
  }
}

function onScenePointerCancel() {
  cleanupScenePointer();
}

function cleanupScenePointer() {
  window.removeEventListener("pointermove", onScenePointerMove);
  window.removeEventListener("pointerup", onScenePointerUp);
  window.removeEventListener("pointercancel", onScenePointerCancel);
  if (renderer?.domElement) renderer.domElement.classList.remove("is-dragging");
  if (controls) controls.enabled = true;
  if (ghost) {
    scene.remove(ghost.mesh);
    disposeObject(ghost.mesh);
    ghost = null;
  }
  els.dragReadout.hidden = true;
  els.dragReadout.className = "drag-readout";
  pointerState = null;
}

function placementAtEvent(event) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(placementSurfaces, false);
  if (!hits.length) return null;
  const hit = hits[0];
  return { rackId: hit.object.userData.rackId, unit: unitFromWorldY(hit.point.y) };
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function unitFromWorldY(worldY) {
  return THREE.MathUtils.clamp(Math.floor((worldY - RACK_BOTTOM) / UNIT_HEIGHT) + 1, 1, RACK_CAPACITY);
}

function resizeScene() {
  if (!renderer || !camera) return;
  const rect = els.sceneViewport.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  fitCameraToView();
}

function fitCameraToView() {
  if (!camera || !renderer) return;
  const width = Math.max(1, els.sceneViewport.clientWidth);
  const height = Math.max(1, els.sceneViewport.clientHeight);
  const aspect = width / height;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const fitHeightDistance = 9.35 / (2 * Math.tan(verticalFov / 2));
  const fitWidthDistance = 6.75 / (2 * Math.tan(verticalFov / 2) * aspect);
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.04;
  const z = currentView === "rear" ? -distance : distance;
  camera.position.set(0, CAMERA_TARGET_Y, z);
  camera.lookAt(0, CAMERA_TARGET_Y, 0);
  if (controls) {
    controls.target.set(0, CAMERA_TARGET_Y, 0);
    controls.update();
  }
}

function animateScene() {
  animationFrame = requestAnimationFrame(animateScene);
  if (!renderer || !scene || !camera) return;
  controls.update();
  renderer.render(scene, camera);
}

function init() {
  bindUiEvents();
  updateTargetRackUI();
  renderCatalog();
  renderRackSummaries();
  renderRackMaps();
  renderSelection();
  initScene();
  savePlan();
}

init();
