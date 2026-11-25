import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const RACK_UNITS = 42;
const RACK_BUDGET = 3000;
const U_HEIGHT = 0.05;
const RACK_WIDTH = 0.7;
const RACK_DEPTH = 0.74;
const RACK_BOTTOM = 0.12;
const STORAGE_KEY = 'rackline-plan-v1';
const RACK_X = { A: -0.46, B: 0.46 };

const ICONS = {
  patch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M6.5 11v2M9 11v2M11.5 11v2M14 11v2M16.5 11v2M8 16h8"/></svg>',
  switch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M6 10h5v4H6zM13.5 10h1M16 10h1M18.5 10h1M13.5 12h1M16 12h1M18.5 12h1M13.5 14h1M16 14h1M18.5 14h1"/></svg>',
  compute: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="1.5"/><path d="M6.5 8h4v8h-4zM13.5 8h4M13.5 11h4M13.5 14h2.5"/></svg>',
  storage: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 8h18M3 12h18M3 16h18M6 6h1M6 10h1M6 14h1M6 18h1"/></svg>',
  blank: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7.5" width="18" height="9" rx="1.5"/><path d="M7 11h2M10.5 11h2M14 11h2M17.5 11h.5M8 13.5h8"/></svg>',
  plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>',
  move: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M7 7l-3 3 3 3M13 7l3 3-3 3"/></svg>',
  trash: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6.5h11M8 3.5h4M6.5 6.5l.7 10h5.6l.7-10M8.7 9v5M11.3 9v5"/></svg>',
};

const TYPES = {
  'patch-panel': {
    id: 'patch-panel', name: 'Patch panel', short: 'Patch', code: 'PP',
    height: 1, power: 0, color: '#5fe0c4', hex: 0x5fe0c4, icon: ICONS.patch,
  },
  'network-switch': {
    id: 'network-switch', name: 'Network switch', short: 'Switch', code: 'SW',
    height: 1, power: 150, color: '#72a8ff', hex: 0x72a8ff, icon: ICONS.switch,
  },
  'compute-server': {
    id: 'compute-server', name: 'Compute server', short: 'Compute', code: 'CS',
    height: 2, power: 500, color: '#ff9d59', hex: 0xff9d59, icon: ICONS.compute,
  },
  'storage-array': {
    id: 'storage-array', name: 'Storage array', short: 'Storage', code: 'SA',
    height: 4, power: 800, color: '#b195ff', hex: 0xb195ff, icon: ICONS.storage,
  },
  'blank-panel': {
    id: 'blank-panel', name: 'Blank panel', short: 'Blank', code: 'BP',
    height: 1, power: 0, color: '#7d8b98', hex: 0x7d8b98, icon: ICONS.blank,
  },
};

const TYPE_ORDER = ['patch-panel', 'network-switch', 'compute-server', 'storage-array', 'blank-panel'];

const dom = {
  catalogList: document.getElementById('catalogList'),
  catalogCount: document.getElementById('catalogCount'),
  openAddButton: document.getElementById('openAddButton'),
  exportButton: document.getElementById('exportButton'),
  resetPlanButton: document.getElementById('resetPlanButton'),
  saveState: document.getElementById('saveState'),
  summaryGrid: document.getElementById('summaryGrid'),
  rackTabA: document.getElementById('rackTabA'),
  rackTabB: document.getElementById('rackTabB'),
  unitList: document.getElementById('unitList'),
  selectionFooter: document.getElementById('selectionFooter'),
  selectionCard: document.getElementById('selectionCard'),
  selectionAccent: document.querySelector('.selection-accent'),
  selectionLocation: document.getElementById('selectionLocation'),
  selectionName: document.getElementById('selectionName'),
  selectionMeta: document.getElementById('selectionMeta'),
  selectionMoveButton: document.getElementById('selectionMoveButton'),
  selectionRemoveButton: document.getElementById('selectionRemoveButton'),
  sceneCanvas: document.getElementById('sceneCanvas'),
  sceneWrap: document.getElementById('sceneWrap'),
  resetViewButton: document.getElementById('resetViewButton'),
  viewButtons: Array.from(document.querySelectorAll('.view-button')),
  toastStack: document.getElementById('toastStack'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  equipmentModal: document.getElementById('equipmentModal'),
  modalDeviceIcon: document.getElementById('modalDeviceIcon'),
  modalEyebrow: document.getElementById('modalEyebrow'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalButton: document.getElementById('closeModalButton'),
  cancelModalButton: document.getElementById('cancelModalButton'),
  equipmentForm: document.getElementById('equipmentForm'),
  equipmentTypeSelect: document.getElementById('equipmentTypeSelect'),
  rackSelect: document.getElementById('rackSelect'),
  unitSelect: document.getElementById('unitSelect'),
  unitRangeHint: document.getElementById('unitRangeHint'),
  modalPreview: document.getElementById('modalPreview'),
  modalError: document.getElementById('modalError'),
  submitModalButton: document.getElementById('submitModalButton'),
};

const numberFormat = new Intl.NumberFormat('en-US');
const state = loadPlan();
let activeRack = 'A';
let selectedId = null;
let currentView = 'front';
let dragPayload = null;
let modalState = { mode: 'add', typeId: 'compute-server', deviceId: null, previousUnit: null };
let lastFocus = null;
let saveFeedbackTimer = null;

let scene;
let camera;
let renderer;
let controls;
let rackRoot;
let equipmentGroup;
let selectedOutline = null;
let cameraTween = null;
let resizeObserver = null;
let sceneInitialized = false;
let pointerDown = null;
let hoveredDeviceId = null;

const rackVisuals = {};
const deviceTextureCache = new Map();
const deviceMaterialCache = new Map();
const accentMaterialCache = new Map();
const unitLabelMaterials = new Map();
const clock = new THREE.Clock();

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x151d25,
  metalness: 0.72,
  roughness: 0.38,
});
const earMaterial = new THREE.MeshStandardMaterial({
  color: 0x303c46,
  metalness: 0.82,
  roughness: 0.3,
});

init();

function init() {
  buildCatalog();
  bindInterface();
  try {
    initScene();
  } catch (error) {
    console.error('Unable to initialize the 3D preview:', error);
    dom.sceneCanvas.innerHTML = '<div class="scene-fallback"><strong>3D preview unavailable</strong><span>The rack list and planning tools are still fully usable.</span></div>';
  }
  renderApp();
  savePlan();
  setCameraView('front', true);
}

/* ---------------------------------- State --------------------------------- */

function makeSamplePlan() {
  return {
    devices: [
      { id: 'sample-a-01', rack: 'A', startU: 42, type: 'patch-panel' },
      { id: 'sample-a-02', rack: 'A', startU: 41, type: 'network-switch' },
      { id: 'sample-a-03', rack: 'A', startU: 40, type: 'blank-panel' },
      { id: 'sample-a-04', rack: 'A', startU: 38, type: 'compute-server' },
      { id: 'sample-a-05', rack: 'A', startU: 34, type: 'storage-array' },
      { id: 'sample-a-06', rack: 'A', startU: 32, type: 'compute-server' },
      { id: 'sample-a-07', rack: 'A', startU: 29, type: 'patch-panel' },
      { id: 'sample-a-08', rack: 'A', startU: 28, type: 'blank-panel' },
      { id: 'sample-b-01', rack: 'B', startU: 42, type: 'patch-panel' },
      { id: 'sample-b-02', rack: 'B', startU: 41, type: 'network-switch' },
      { id: 'sample-b-03', rack: 'B', startU: 39, type: 'compute-server' },
      { id: 'sample-b-04', rack: 'B', startU: 35, type: 'storage-array' },
      { id: 'sample-b-05', rack: 'B', startU: 33, type: 'compute-server' },
      { id: 'sample-b-06', rack: 'B', startU: 28, type: 'storage-array' },
      { id: 'sample-b-07', rack: 'B', startU: 27, type: 'patch-panel' },
    ],
  };
}

function loadPlan() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeSamplePlan();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.devices)) {
      return makeSamplePlan();
    }

    const accepted = [];
    const acceptedIds = new Set();
    for (let index = 0; index < parsed.devices.length; index += 1) {
      const candidate = parsed.devices[index];
      if (!candidate || !TYPES[candidate.type] || !RACK_X[candidate.rack]) continue;
      if (!Number.isInteger(candidate.startU)) continue;
      const height = TYPES[candidate.type].height;
      if (!isPlacementClear(accepted, candidate.rack, candidate.startU, height)) continue;
      const baseId = typeof candidate.id === 'string' && candidate.id ? candidate.id : `restored-${index}`;
      let id = baseId;
      let suffix = 1;
      while (acceptedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      acceptedIds.add(id);
      accepted.push({
        id,
        rack: candidate.rack,
        startU: candidate.startU,
        type: candidate.type,
      });
    }

    if (parsed.devices.length > 0 && accepted.length === 0) return makeSamplePlan();
    return { devices: accepted };
  } catch (error) {
    return makeSamplePlan();
  }
}

function savePlan() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, devices: state.devices }));
    setSaveFeedback('Saved locally', false);
  } catch (error) {
    setSaveFeedback('Session only', false);
  }
}

function setSaveFeedback(message, saving) {
  const label = dom.saveState.querySelector('span');
  if (label) label.textContent = message;
  dom.saveState.classList.toggle('is-saving', Boolean(saving));
  if (saveFeedbackTimer) window.clearTimeout(saveFeedbackTimer);
  if (saving) {
    saveFeedbackTimer = window.setTimeout(() => {
      dom.saveState.classList.remove('is-saving');
    }, 500);
  }
}

function flashSaving() {
  setSaveFeedback('Saving locally', true);
  window.setTimeout(() => setSaveFeedback('Saved locally', false), 280);
}

function findDevice(id) {
  return state.devices.find((device) => device.id === id) || null;
}

function typeFor(device) {
  return TYPES[device.type];
}

function deviceSpan(device) {
  const height = typeFor(device).height;
  return height === 1 ? `U${device.startU}` : `U${device.startU}–${device.startU + height - 1}`;
}

function rackStats(rack, devices = state.devices) {
  const rackDevices = devices.filter((device) => device.rack === rack);
  const occupied = rackDevices.reduce((sum, device) => sum + typeFor(device).height, 0);
  const power = rackDevices.reduce((sum, device) => sum + typeFor(device).power, 0);
  return {
    occupied,
    remaining: RACK_UNITS - occupied,
    power,
    overBudget: power > RACK_BUDGET,
    ratio: power / RACK_BUDGET,
  };
}

function isPlacementClear(devices, rack, startU, height, ignoreId = null) {
  if (!Number.isInteger(startU) || startU < 1 || startU + height - 1 > RACK_UNITS) return false;
  const occupied = new Set();
  for (const device of devices) {
    if (device.rack !== rack || device.id === ignoreId) continue;
    const deviceHeight = typeFor(device).height;
    for (let unit = device.startU; unit < device.startU + deviceHeight; unit += 1) {
      occupied.add(unit);
    }
  }
  for (let unit = startU; unit < startU + height; unit += 1) {
    if (occupied.has(unit)) return false;
  }
  return true;
}

function validatePlacement(rack, startU, height, ignoreId = null) {
  if (!RACK_X[rack]) return { valid: false, reason: 'Choose a valid rack.' };
  if (!Number.isInteger(startU) || startU < 1) {
    return { valid: false, reason: 'The starting unit must be between U1 and U42.' };
  }
  if (startU + height - 1 > RACK_UNITS) {
    return {
      valid: false,
      reason: `A ${height}U device cannot start at U${startU}; it would extend past U42.`,
    };
  }

  const occupied = new Map();
  for (const device of state.devices) {
    if (device.rack !== rack || device.id === ignoreId) continue;
    const deviceHeight = typeFor(device).height;
    for (let unit = device.startU; unit < device.startU + deviceHeight; unit += 1) {
      occupied.set(unit, device);
    }
  }

  for (let unit = startU; unit < startU + height; unit += 1) {
    if (occupied.has(unit)) {
      const blocker = occupied.get(unit);
      return {
        valid: false,
        reason: `That footprint overlaps ${typeFor(blocker).name} at U${unit} in Rack ${rack}.`,
      };
    }
  }
  return { valid: true, reason: '' };
}

function nextDeviceId() {
  const token = Math.random().toString(36).slice(2, 7);
  return `device-${Date.now().toString(36)}-${token}`;
}

function projectedStats(rack, typeId, startU, ignoreId = null) {
  const type = TYPES[typeId];
  const devices = state.devices.filter((device) => device.id !== ignoreId);
  devices.push({ id: '__projection__', rack, startU, type: typeId });
  return rackStats(rack, devices);
}

function addDevice(typeId, rack, startU) {
  const type = TYPES[typeId];
  if (!type) return { ok: false, error: 'Unknown equipment type.' };
  const check = validatePlacement(rack, startU, type.height);
  if (!check.valid) return { ok: false, error: check.reason };

  const device = { id: nextDeviceId(), rack, startU, type: typeId };
  state.devices.push(device);
  selectedId = device.id;
  activeRack = rack;
  flashSaving();
  savePlan();
  renderApp({ revealSelection: true });
  return { ok: true, device, stats: rackStats(rack), type };
}

function moveDevice(id, rack, startU) {
  const device = findDevice(id);
  if (!device) return { ok: false, error: 'That device is no longer in the plan.' };
  const type = typeFor(device);
  const check = validatePlacement(rack, startU, type.height, id);
  if (!check.valid) return { ok: false, error: check.reason };
  if (device.rack === rack && device.startU === startU) {
    return { ok: true, device, unchanged: true, stats: rackStats(rack), type };
  }

  device.rack = rack;
  device.startU = startU;
  selectedId = id;
  activeRack = rack;
  flashSaving();
  savePlan();
  renderApp({ revealSelection: true });
  return { ok: true, device, stats: rackStats(rack), type };
}

function removeDevice(id) {
  const index = state.devices.findIndex((device) => device.id === id);
  if (index < 0) return null;
  const [removed] = state.devices.splice(index, 1);
  if (selectedId === id) selectedId = null;
  flashSaving();
  savePlan();
  renderApp();
  return removed;
}

/* ---------------------------------- UI ----------------------------------- */

function buildCatalog() {
  dom.catalogList.innerHTML = TYPE_ORDER.map((typeId) => {
    const type = TYPES[typeId];
    return `
      <div class="catalog-item" draggable="true" data-type="${type.id}" style="--device-color:${type.color}">
        <div class="catalog-icon" aria-hidden="true">${type.icon}</div>
        <div class="catalog-copy">
          <strong>${type.name}</strong>
          <span>${type.height}U · ${numberFormat.format(type.power)} W</span>
        </div>
        <button class="catalog-add" type="button" data-add-type="${type.id}" aria-label="Add ${type.name}" title="Add ${type.name}">
          ${ICONS.plus}
        </button>
      </div>
    `;
  }).join('');
  dom.catalogCount.textContent = `${TYPE_ORDER.length} types`;
}

function bindInterface() {
  dom.openAddButton.addEventListener('click', () => openAddModal());
  dom.exportButton.addEventListener('click', exportCsv);
  dom.resetPlanButton.addEventListener('click', resetPlan);
  dom.selectionMoveButton.addEventListener('click', () => {
    const device = findDevice(selectedId);
    if (device) openMoveModal(device);
  });
  dom.selectionRemoveButton.addEventListener('click', () => {
    if (selectedId) removeDeviceWithToast(selectedId);
  });

  dom.viewButtons.forEach((button) => {
    button.addEventListener('click', () => setCameraView(button.dataset.view));
  });
  dom.resetViewButton.addEventListener('click', () => setCameraView(currentView, false, true));

  dom.catalogList.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-type]');
    if (addButton) {
      openAddModal({ typeId: addButton.dataset.addType });
      return;
    }
    const item = event.target.closest('.catalog-item');
    if (item) openAddModal({ typeId: item.dataset.type });
  });
  dom.catalogList.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.catalog-item');
    if (!item) return;
    dragPayload = { kind: 'catalog', typeId: item.dataset.type };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', `catalog:${item.dataset.type}`);
  });
  dom.catalogList.addEventListener('dragend', finishDrag);

  dom.summaryGrid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-rack]');
    if (!card) return;
    setActiveRack(card.dataset.rack);
  });

  [dom.rackTabA, dom.rackTabB].forEach((tab) => {
    tab.addEventListener('click', () => setActiveRack(tab.dataset.rack));
    tab.addEventListener('dragover', (event) => {
      if (!dragPayload || dragPayload.kind !== 'device') return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      tab.classList.add('is-drop-target');
    });
    tab.addEventListener('dragleave', () => tab.classList.remove('is-drop-target'));
    tab.addEventListener('drop', (event) => {
      if (!dragPayload || dragPayload.kind !== 'device') return;
      event.preventDefault();
      tab.classList.remove('is-drop-target');
      const device = findDevice(dragPayload.id);
      finishDrag();
      if (device) {
        const result = moveDevice(device.id, tab.dataset.rack, device.startU);
        announceMoveResult(result, device);
      }
    });
  });

  dom.unitList.addEventListener('click', onUnitListClick);
  dom.unitList.addEventListener('dblclick', onUnitListDoubleClick);
  dom.unitList.addEventListener('keydown', onUnitListKeyDown);
  dom.unitList.addEventListener('dragstart', onUnitDragStart);
  dom.unitList.addEventListener('dragend', finishDrag);
  dom.unitList.addEventListener('dragover', onUnitDragOver);
  dom.unitList.addEventListener('dragleave', onUnitDragLeave);
  dom.unitList.addEventListener('drop', onUnitDrop);

  dom.equipmentTypeSelect.addEventListener('change', () => refreshModalOptions());
  dom.rackSelect.addEventListener('change', () => refreshModalOptions());
  dom.unitSelect.addEventListener('change', updateModalPreview);
  dom.equipmentForm.addEventListener('submit', submitModal);
  dom.closeModalButton.addEventListener('click', closeModal);
  dom.cancelModalButton.addEventListener('click', closeModal);
  dom.modalBackdrop.addEventListener('mousedown', (event) => {
    if (event.target === dom.modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!dom.modalBackdrop.hidden) {
        closeModal();
      } else if (selectedId) {
        clearSelection();
      }
      return;
    }
    if (dom.modalBackdrop.hidden && selectedId && event.target === document.body) {
      if (event.key.toLowerCase() === 'm') {
        const device = findDevice(selectedId);
        if (device) openMoveModal(device);
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeDeviceWithToast(selectedId);
      }
    }
  });
}

function renderApp({ revealSelection = false } = {}) {
  renderSummaries();
  renderUnitMap();
  rebuildEquipmentScene();
  renderSelection();
  if (revealSelection && selectedId) revealSelectedRow();
}

function renderSummaries() {
  const statsA = rackStats('A');
  const statsB = rackStats('B');
  const cards = [
    { rack: 'A', stats: statsA },
    { rack: 'B', stats: statsB },
  ];

  dom.summaryGrid.innerHTML = cards.map(({ rack, stats }) => {
    const width = Math.min(100, stats.ratio * 100);
    const classes = [
      'summary-card',
      activeRack === rack ? 'is-active' : '',
      stats.overBudget ? 'is-over' : '',
      !stats.overBudget && stats.ratio >= 0.85 ? 'is-warm' : '',
    ].filter(Boolean).join(' ');
    return `
      <button class="${classes}" type="button" data-rack="${rack}" aria-label="Show Rack ${rack} unit map">
        <div class="summary-topline">
          <span class="summary-rack-name">Rack ${rack}</span>
          <span class="summary-total">42U</span>
        </div>
        <div class="summary-power-row">
          <strong class="summary-power">${numberFormat.format(stats.power)} W</strong>
          <span class="summary-budget">/ 3,000 W</span>
        </div>
        <div class="power-track" aria-hidden="true"><span class="power-fill" style="width:${width}%"></span></div>
        <div class="summary-metrics">
          <span class="metric-occupied">${stats.occupied} occupied</span>
          <span class="metric-free">${stats.remaining} free</span>
          <span class="warning-pill" ${stats.overBudget ? '' : 'hidden'}>Over budget</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderUnitMap() {
  const stats = rackStats(activeRack);
  dom.unitList.setAttribute('aria-label', `Rack ${activeRack} unit list, ${stats.occupied} units occupied, ${stats.remaining} units free`);
  dom.rackTabA.classList.toggle('is-active', activeRack === 'A');
  dom.rackTabB.classList.toggle('is-active', activeRack === 'B');
  dom.rackTabA.setAttribute('aria-selected', String(activeRack === 'A'));
  dom.rackTabB.setAttribute('aria-selected', String(activeRack === 'B'));

  const grid = document.createElement('div');
  grid.className = 'rack-grid';

  for (let unit = RACK_UNITS; unit >= 1; unit -= 1) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'unit-slot';
    slot.style.gridRow = String(RACK_UNITS - unit + 1);
    slot.dataset.unit = String(unit);
    slot.setAttribute('aria-label', `U${unit}, free. Add equipment here.`);
    slot.innerHTML = `<span>U${unit}</span><i class="slot-dot" aria-hidden="true"></i>`;
    grid.appendChild(slot);
  }

  const rackDevices = state.devices
    .filter((device) => device.rack === activeRack)
    .sort((a, b) => b.startU - a.startU);

  rackDevices.forEach((device) => {
    const type = typeFor(device);
    const row = document.createElement('div');
    row.className = `device-row span-${type.height}${device.id === selectedId ? ' is-selected' : ''}`;
    row.style.gridRow = `${RACK_UNITS - device.startU + 1} / span ${type.height}`;
    row.style.setProperty('--device-color', type.color);
    row.dataset.deviceId = device.id;
    row.draggable = true;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-pressed', String(device.id === selectedId));
    row.setAttribute('aria-label', `${type.name}, Rack ${device.rack}, ${deviceSpan(device)}, ${type.height}U, ${numberFormat.format(type.power)} watts. Double click to move.`);
    row.innerHTML = `
      <span class="device-grip" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="device-copy">
        <strong>${type.name}</strong>
        <span class="device-unit">${deviceSpan(device)}</span>
      </span>
      <span class="device-meta">${type.height}U</span>
      <span class="device-power">${numberFormat.format(type.power)} W</span>
      <button class="device-move" type="button" data-move-id="${device.id}" aria-label="Move ${type.name}" title="Move ${type.name}">
        ${ICONS.move}
      </button>
      <button class="device-remove" type="button" data-remove-id="${device.id}" aria-label="Remove ${type.name}" title="Remove ${type.name}">
        ${ICONS.trash}
      </button>
    `;
    grid.appendChild(row);
  });

  dom.unitList.replaceChildren(grid);
}

function renderSelection() {
  const device = selectedId ? findDevice(selectedId) : null;
  if (!device) {
    dom.selectionCard.hidden = true;
    dom.selectionCard.style.removeProperty('--device-color');
    dom.selectionFooter.textContent = 'No device selected';
    return;
  }

  const type = typeFor(device);
  dom.selectionCard.hidden = false;
  dom.selectionCard.style.setProperty('--device-color', type.color);
  dom.selectionAccent.style.background = type.color;
  dom.selectionLocation.textContent = `Rack ${device.rack} · ${deviceSpan(device)}`;
  dom.selectionName.textContent = type.name;
  dom.selectionMeta.textContent = `${type.height}U · ${numberFormat.format(type.power)} W`;
  dom.selectionFooter.textContent = `${type.name} · Rack ${device.rack} · ${deviceSpan(device)}`;
}

function revealSelectedRow() {
  window.requestAnimationFrame(() => {
    const row = dom.unitList.querySelector(`[data-device-id="${cssEscape(selectedId)}"]`);
    if (!row) return;
    const target = Math.max(0, row.offsetTop - (dom.unitList.clientHeight - row.offsetHeight) / 2);
    dom.unitList.scrollTo({ top: target, behavior: 'smooth' });
  });
}

function setActiveRack(rack) {
  if (!RACK_X[rack] || activeRack === rack) return;
  activeRack = rack;
  renderSummaries();
  renderUnitMap();
  renderSelection();
  const row = selectedId ? dom.unitList.querySelector(`[data-device-id="${cssEscape(selectedId)}"]`) : null;
  if (row) revealSelectedRow();
}

function selectDevice(id, { reveal = true } = {}) {
  const device = findDevice(id);
  if (!device) return;
  const rackChanged = activeRack !== device.rack;
  selectedId = id;
  activeRack = device.rack;
  renderSummaries();
  if (rackChanged) {
    renderUnitMap();
  } else {
    updateSelectedRows();
  }
  rebuildEquipmentScene();
  renderSelection();
  if (reveal) revealSelectedRow();
}

function clearSelection() {
  if (!selectedId) return;
  selectedId = null;
  updateSelectedRows();
  rebuildEquipmentScene();
  renderSelection();
}

function updateSelectedRows() {
  dom.unitList.querySelectorAll('.device-row').forEach((row) => {
    const isSelected = row.dataset.deviceId === selectedId;
    row.classList.toggle('is-selected', isSelected);
    row.setAttribute('aria-pressed', String(isSelected));
  });
}

function onUnitListClick(event) {
  const removeButton = event.target.closest('[data-remove-id]');
  if (removeButton) {
    event.stopPropagation();
    removeDeviceWithToast(removeButton.dataset.removeId);
    return;
  }

  const moveButton = event.target.closest('[data-move-id]');
  if (moveButton) {
    event.stopPropagation();
    const device = findDevice(moveButton.dataset.moveId);
    if (device) openMoveModal(device);
    return;
  }

  const row = event.target.closest('.device-row');
  if (row) {
    selectDevice(row.dataset.deviceId);
    return;
  }

  const slot = event.target.closest('.unit-slot');
  if (slot) {
    openAddModal({ rack: activeRack, unit: Number(slot.dataset.unit) });
  }
}

function onUnitListDoubleClick(event) {
  const row = event.target.closest('.device-row');
  if (!row) return;
  const device = findDevice(row.dataset.deviceId);
  if (device) openMoveModal(device);
}

function onUnitListKeyDown(event) {
  const row = event.target.closest('.device-row');
  if (!row) return;
  const device = findDevice(row.dataset.deviceId);
  if (!device) return;

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectDevice(device.id);
  } else if (event.key.toLowerCase() === 'm') {
    event.preventDefault();
    openMoveModal(device);
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    removeDeviceWithToast(device.id);
  }
}

function onUnitDragStart(event) {
  const row = event.target.closest('.device-row');
  if (!row || event.target.closest('.device-remove')) {
    event.preventDefault();
    return;
  }
  const device = findDevice(row.dataset.deviceId);
  if (!device) return;
  dragPayload = { kind: 'device', id: device.id };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', `device:${device.id}`);
  selectedId = device.id;
  updateSelectedRows();
  row.classList.add('is-dragging');
  dom.unitList.classList.add('is-dragging');
  clearDropTargets();
  renderSelection();
  rebuildEquipmentScene();
}

function onUnitDragOver(event) {
  if (!dragPayload) return;
  const slot = event.target.closest('.unit-slot');
  if (!slot) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = dragPayload.kind === 'device' ? 'move' : 'copy';
  if (!slot.classList.contains('is-drop-target')) {
    clearDropTargets();
    slot.classList.add('is-drop-target');
    if (dragPayload.kind === 'device') {
      const device = findDevice(dragPayload.id);
      if (device) {
        const type = typeFor(device);
        const down = Number(slot.dataset.unit);
        const valid = validatePlacement(activeRack, down, type.height, device.id).valid;
        if (!valid) slot.classList.add('is-blocked');
      }
    }
  }
}

function onUnitDragLeave(event) {
  const slot = event.target.closest('.unit-slot');
  if (slot && !slot.contains(event.relatedTarget)) slot.classList.remove('is-drop-target', 'is-blocked');
}

function onUnitDrop(event) {
  if (!dragPayload) return;
  const slot = event.target.closest('.unit-slot');
  if (!slot) return;
  event.preventDefault();
  const payload = dragPayload;
  const startU = Number(slot.dataset.unit);
  finishDrag();
  clearDropTargets();

  if (payload.kind === 'catalog') {
    const result = addDevice(payload.typeId, activeRack, startU);
    if (!result.ok) {
      showToast('Placement blocked', result.error, 'error');
      return;
    }
    announcePlacementResult(result, 'added');
  } else if (payload.kind === 'device') {
    const device = findDevice(payload.id);
    if (!device) return;
    const result = moveDevice(payload.id, activeRack, startU);
    announceMoveResult(result, device);
  }
}

function finishDrag() {
  dragPayload = null;
  dom.unitList.classList.remove('is-dragging');
  document.querySelectorAll('.is-drop-target, .is-blocked, .is-dragging').forEach((node) => {
    node.classList.remove('is-drop-target', 'is-blocked', 'is-dragging');
  });
  dom.rackTabA.classList.remove('is-drop-target');
  dom.rackTabB.classList.remove('is-drop-target');
}

function clearDropTargets() {
  document.querySelectorAll('.unit-slot.is-drop-target, .unit-slot.is-blocked').forEach((node) => {
    node.classList.remove('is-drop-target', 'is-blocked');
  });
}

function removeDeviceWithToast(id) {
  const device = findDevice(id);
  if (!device) return;
  const type = typeFor(device);
  const location = `Rack ${device.rack} · ${deviceSpan(device)}`;
  const removed = removeDevice(id);
  if (removed) {
    showToast('Device removed', `${type.name} was removed from ${location}.`, 'success');
  }
}

function announcePlacementResult(result, action = 'placed') {
  if (!result.ok) return;
  const location = `Rack ${result.device.rack} · ${deviceSpan(result.device)}`;
  const budgetNote = result.stats.overBudget
    ? ` Power is now ${numberFormat.format(result.stats.power)} W, over the 3,000 W budget.`
    : ` Rack load is ${numberFormat.format(result.stats.power)} W.`;
  showToast(
    action === 'added' ? 'Equipment added' : 'Equipment placed',
    `${result.type.name} ${action} at ${location}.${budgetNote}`,
    result.stats.overBudget ? 'error' : 'success',
  );
}

function announceMoveResult(result, fallbackDevice) {
  if (!result || !result.ok) {
    if (result && result.error) showToast('Move blocked', result.error, 'error');
    return;
  }
  if (result.unchanged) {
    showToast('No change', `${result.type.name} is already at that position.`, 'success');
    return;
  }
  const location = `Rack ${result.device.rack} · ${deviceSpan(result.device)}`;
  const budgetNote = result.stats.overBudget
    ? ` Rack ${result.device.rack} is over its 3,000 W budget at ${numberFormat.format(result.stats.power)} W.`
    : '';
  showToast('Device moved', `${result.type.name} moved to ${location}.${budgetNote}`, result.stats.overBudget ? 'error' : 'success');
  if (fallbackDevice && fallbackDevice.id !== selectedId) selectedId = fallbackDevice.id;
}

/* -------------------------------- Modal --------------------------------- */

function openAddModal({ typeId = 'compute-server', rack = activeRack, unit = null } = {}) {
  if (dom.modalBackdrop.hidden) lastFocus = document.activeElement;
  modalState = { mode: 'add', typeId, deviceId: null, previousUnit: unit };
  dom.modalEyebrow.textContent = 'Place equipment';
  dom.modalTitle.textContent = 'Add equipment';
  dom.submitModalButton.textContent = 'Place in rack';
  dom.equipmentTypeSelect.disabled = false;
  dom.equipmentTypeSelect.value = typeId;
  dom.rackSelect.value = rack;
  fillEquipmentTypeOptions();
  dom.equipmentTypeSelect.value = typeId;
  syncModalIcon();
  refreshModalOptions(unit);
  showModal();
}

function openMoveModal(device) {
  if (!device) return;
  if (dom.modalBackdrop.hidden) lastFocus = document.activeElement;
  modalState = { mode: 'move', typeId: device.type, deviceId: device.id, previousUnit: device.startU };
  dom.modalEyebrow.textContent = 'Reposition device';
  dom.modalTitle.textContent = 'Move equipment';
  dom.submitModalButton.textContent = 'Save position';
  fillEquipmentTypeOptions();
  dom.equipmentTypeSelect.value = device.type;
  dom.equipmentTypeSelect.disabled = true;
  dom.rackSelect.value = device.rack;
  syncModalIcon();
  refreshModalOptions(device.startU);
  showModal();
}

function fillEquipmentTypeOptions() {
  if (dom.equipmentTypeSelect.options.length === TYPE_ORDER.length) return;
  dom.equipmentTypeSelect.innerHTML = TYPE_ORDER.map((typeId) => {
    const type = TYPES[typeId];
    return `<option value="${typeId}">${type.name} · ${type.height}U · ${numberFormat.format(type.power)} W</option>`;
  }).join('');
}

function showModal() {
  dom.modalBackdrop.hidden = false;
  dom.modalError.hidden = true;
  window.requestAnimationFrame(() => {
    dom.equipmentTypeSelect.focus();
  });
}

function closeModal() {
  if (dom.modalBackdrop.hidden) return;
  dom.modalBackdrop.hidden = true;
  dom.modalError.hidden = true;
  if (lastFocus && typeof lastFocus.focus === 'function') {
    lastFocus.focus({ preventScroll: true });
  }
}

function syncModalIcon() {
  const type = TYPES[dom.equipmentTypeSelect.value] || TYPES['compute-server'];
  dom.modalDeviceIcon.style.setProperty('--device-color', type.color);
  dom.modalDeviceIcon.innerHTML = type.icon;
}

function refreshModalOptions(preferredUnit = null) {
  const type = TYPES[dom.equipmentTypeSelect.value];
  const rack = dom.rackSelect.value;
  const ignoreId = modalState.mode === 'move' ? modalState.deviceId : null;
  const maxStart = RACK_UNITS - type.height + 1;
  const choices = [];

  for (let unit = maxStart; unit >= 1; unit -= 1) {
    if (validatePlacement(rack, unit, type.height, ignoreId).valid) choices.push(unit);
  }

  const priorValue = preferredUnit ?? Number(dom.unitSelect.value);
  dom.unitSelect.innerHTML = choices.length
    ? choices.map((unit) => {
      const end = unit + type.height - 1;
      const range = type.height === 1 ? `U${unit}` : `U${unit}–${end}`;
      return `<option value="${unit}">${range}</option>`;
    }).join('')
    : '<option value="">No consecutive free space</option>';

  if (choices.includes(priorValue)) {
    dom.unitSelect.value = String(priorValue);
  } else if (choices.includes(modalState.previousUnit)) {
    dom.unitSelect.value = String(modalState.previousUnit);
  } else if (choices.length) {
    dom.unitSelect.value = String(choices[0]);
  }

  dom.unitSelect.disabled = choices.length === 0;
  dom.submitModalButton.disabled = choices.length === 0;
  dom.unitRangeHint.textContent = `(${type.height}U footprint, must end by U42)`;
  syncModalIcon();
  dom.modalError.hidden = true;
  updateModalPreview();
}

function updateModalPreview() {
  const type = TYPES[dom.equipmentTypeSelect.value];
  const rack = dom.rackSelect.value;
  const startU = Number(dom.unitSelect.value);
  if (!startU) {
    dom.modalPreview.innerHTML = `<span>No valid consecutive units are available in Rack ${rack}.</span>`;
    return;
  }
  const ignoreId = modalState.mode === 'move' ? modalState.deviceId : null;
  const stats = projectedStats(rack, type.id, startU, ignoreId);
  const end = startU + type.height - 1;
  const range = type.height === 1 ? `U${startU}` : `U${startU}–${end}`;
  const budgetText = stats.overBudget
    ? `<span class="preview-warning">Projected ${numberFormat.format(stats.power)} W · over budget</span>`
    : `<span>Projected ${numberFormat.format(stats.power)} W · ${stats.remaining}U free</span>`;
  dom.modalPreview.innerHTML = `<span><strong>Rack ${rack} · ${range}</strong> · ${type.height}U · ${numberFormat.format(type.power)} W</span>${budgetText}`;
}

function submitModal(event) {
  event.preventDefault();
  const typeId = dom.equipmentTypeSelect.value;
  const rack = dom.rackSelect.value;
  const startU = Number(dom.unitSelect.value);
  const type = TYPES[typeId];

  dom.modalError.hidden = true;
  if (!startU) {
    showModalError(`There are no consecutive free units for a ${type.height}U device in Rack ${rack}.`);
    return;
  }
  const ignoreId = modalState.mode === 'move' ? modalState.deviceId : null;
  const check = validatePlacement(rack, startU, type.height, ignoreId);
  if (!check.valid) {
    showModalError(check.reason);
    return;
  }

  const result = modalState.mode === 'move'
    ? moveDevice(modalState.deviceId, rack, startU)
    : addDevice(typeId, rack, startU);

  if (!result.ok) {
    showModalError(result.error || 'That placement is not available.');
    return;
  }

  closeModal();
  if (modalState.mode === 'move') {
    announceMoveResult(result, result.device);
  } else {
    announcePlacementResult(result, 'added');
  }
}

function showModalError(message) {
  dom.modalError.textContent = message;
  dom.modalError.hidden = false;
}

/* -------------------------------- Toasts -------------------------------- */

function showToast(title, detail, kind = 'info', duration = 4200) {
  const toast = document.createElement('div');
  toast.className = `toast${kind === 'error' ? ' is-error' : kind === 'success' ? ' is-success' : ''}`;
  const icon = kind === 'error' ? '!' : kind === 'success' ? '✓' : '+';
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span class="toast-copy"><strong></strong><span></span></span>
  `;
  toast.querySelector('strong').textContent = title;
  toast.querySelector('.toast-copy span').textContent = detail;
  dom.toastStack.appendChild(toast);
  while (dom.toastStack.children.length > 4) {
    dom.toastStack.firstElementChild.remove();
  }
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(4px)';
    toast.style.transition = 'opacity 160ms ease, transform 160ms ease';
    window.setTimeout(() => toast.remove(), 180);
  }, duration);
}

function resetPlan() {
  state.devices = makeSamplePlan().devices;
  selectedId = null;
  activeRack = 'A';
  finishDrag();
  flashSaving();
  savePlan();
  renderApp();
  showToast('Sample restored', 'The two-rack example installation has been reloaded.', 'success');
}

/* --------------------------------- CSV ---------------------------------- */

function exportCsv() {
  const rows = [...state.devices].sort((a, b) => {
    if (a.rack !== b.rack) return a.rack.localeCompare(b.rack);
    return b.startU - a.startU;
  });
  const lines = [['Rack', 'Starting Unit', 'Device Type', 'Height', 'Power']];
  rows.forEach((device) => {
    const type = typeFor(device);
    lines.push([
      `Rack ${device.rack}`,
      String(device.startU),
      type.name,
      `${type.height}U`,
      `${type.power} W`,
    ]);
  });

  const csv = lines.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `rack-inventory-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('CSV exported', `${rows.length} devices written to rack-inventory-${date}.csv.`, 'success');
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/* -------------------------------- Scene --------------------------------- */

function initScene() {
  if (!dom.sceneCanvas) return;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  dom.sceneCanvas.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090e14, 0.045);

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 8;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 2.34;
  controls.target.set(0, 1.16, 0);
  camera.position.set(0, 1.48, 4.95);
  camera.lookAt(controls.target);

  addSceneLighting();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 72),
    new THREE.MeshStandardMaterial({ color: 0x0a1016, roughness: 0.92, metalness: 0.18 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(6, 48, 0x2d4354, 0x1b2b37);
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  grid.material.depthWrite = false;
  scene.add(grid);

  rackRoot = new THREE.Group();
  rackRoot.add(createRack('A', RACK_X.A));
  rackRoot.add(createRack('B', RACK_X.B));
  scene.add(rackRoot);

  equipmentGroup = new THREE.Group();
  scene.add(equipmentGroup);

  resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(dom.sceneWrap);
  resizeScene();

  renderer.domElement.addEventListener('pointerdown', onScenePointerDown);
  renderer.domElement.addEventListener('pointerup', onScenePointerUp);
  renderer.domElement.addEventListener('pointermove', onScenePointerMove);
  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredDeviceId = null;
    renderer.domElement.style.cursor = '';
  });

  sceneInitialized = true;
  renderer.setAnimationLoop(animateScene);
}

function addSceneLighting() {
  const hemi = new THREE.HemisphereLight(0xa9cde8, 0x080d12, 1.25);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe3c4, 2.7);
  key.position.set(3.2, 4.8, 4.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.5;
  key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -1;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6ea8d7, 1.55);
  rim.position.set(-3.5, 2.8, -3.8);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffb15c, 7, 5, 2);
  fill.position.set(0.8, 1.1, 2.6);
  scene.add(fill);
}

function createRack(label, x) {
  const group = new THREE.Group();
  group.position.x = x;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x26323c,
    metalness: 0.84,
    roughness: 0.28,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x10171d,
    metalness: 0.62,
    roughness: 0.45,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: label === 'A' ? 0xffb15c : 0x62d9c4,
    emissive: label === 'A' ? 0x4b2305 : 0x073c36,
    emissiveIntensity: 0.45,
    metalness: 0.55,
    roughness: 0.3,
  });

  const plinth = box(RACK_WIDTH + 0.04, 0.055, RACK_DEPTH + 0.04, edgeMaterial);
  plinth.position.y = 0.027;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const bottomBeam = box(RACK_WIDTH, 0.035, RACK_DEPTH, frameMaterial);
  bottomBeam.position.y = RACK_BOTTOM;
  bottomBeam.castShadow = true;
  group.add(bottomBeam);

  const topBeam = box(RACK_WIDTH, 0.04, RACK_DEPTH, frameMaterial);
  topBeam.position.y = RACK_BOTTOM + RACK_UNITS * U_HEIGHT + 0.02;
  topBeam.castShadow = true;
  group.add(topBeam);

  const postHeight = RACK_UNITS * U_HEIGHT + 0.02;
  const postY = RACK_BOTTOM + postHeight / 2;
  const postX = RACK_WIDTH / 2 - 0.027;
  const postZ = RACK_DEPTH / 2 - 0.027;

  [-1, 1].forEach((side) => {
    [-1, 1].forEach((face) => {
      const post = box(0.038, postHeight, 0.038, frameMaterial);
      post.position.set(side * postX, postY, face * postZ);
      post.castShadow = true;
      group.add(post);
    });
    const sideRail = box(0.022, postHeight - 0.04, 0.022, edgeMaterial);
    sideRail.position.set(side * (postX + 0.001), postY, 0);
    group.add(sideRail);
  });

  const frontTop = box(RACK_WIDTH - 0.04, 0.018, 0.025, frameMaterial);
  frontTop.position.set(0, RACK_BOTTOM + RACK_UNITS * U_HEIGHT + 0.005, RACK_DEPTH / 2 - 0.018);
  group.add(frontTop);

  const rearTop = frontTop.clone();
  rearTop.position.z = -(RACK_DEPTH / 2 - 0.018);
  group.add(rearTop);

  [-1, 1].forEach((side) => {
    const frontAccent = box(0.01, RACK_UNITS * U_HEIGHT, 0.012, accentMaterial);
    frontAccent.position.set(side * (RACK_WIDTH / 2 - 0.014), RACK_BOTTOM + (RACK_UNITS * U_HEIGHT) / 2, RACK_DEPTH / 2 + 0.004);
    group.add(frontAccent);

    const rearAccent = frontAccent.clone();
    rearAccent.position.z = -(RACK_DEPTH / 2 + 0.004);
    group.add(rearAccent);
  });

  const perforatedMaterial = new THREE.MeshBasicMaterial({
    map: createPerforatedTexture(),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rearShroud = new THREE.Mesh(new THREE.PlaneGeometry(RACK_WIDTH - 0.11, RACK_UNITS * U_HEIGHT - 0.03), perforatedMaterial);
  rearShroud.position.set(0, RACK_BOTTOM + (RACK_UNITS * U_HEIGHT) / 2, -RACK_DEPTH / 2 + 0.015);
  rearShroud.renderOrder = -1;
  group.add(rearShroud);

  const frontLabels = new THREE.Group();
  const rearLabels = new THREE.Group();
  for (let unit = 1; unit <= RACK_UNITS; unit += 1) {
    const y = RACK_BOTTOM + (unit - 0.5) * U_HEIGHT;
    const frontSprite = new THREE.Sprite(getUnitLabelMaterial(unit));
    frontSprite.scale.set(0.135, 0.048, 1);
    frontSprite.position.set(-(RACK_WIDTH / 2 - 0.039), y, RACK_DEPTH / 2 + 0.017);
    frontSprite.renderOrder = 3;
    frontLabels.add(frontSprite);

    const rearSprite = new THREE.Sprite(getUnitLabelMaterial(unit));
    rearSprite.scale.set(0.135, 0.048, 1);
    rearSprite.position.set(RACK_WIDTH / 2 - 0.039, y, -(RACK_DEPTH / 2 + 0.017));
    rearSprite.renderOrder = 3;
    rearLabels.add(rearSprite);
  }
  group.add(frontLabels, rearLabels);

  const sign = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createRackSignTexture(label),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  sign.scale.set(0.58, 0.142, 1);
  sign.position.set(0, RACK_BOTTOM + RACK_UNITS * U_HEIGHT + 0.147, 0);
  sign.renderOrder = 8;
  group.add(sign);

  rackVisuals[label] = { group, frontLabels, rearLabels };
  return group;
}

function box(width, height, depth, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function createPerforatedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#101820');
  gradient.addColorStop(0.5, '#0b1218');
  gradient.addColorStop(1, '#0d151c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(120, 151, 174, 0.10)';
  for (let y = 8; y < canvas.height; y += 11) {
    for (let x = 7; x < canvas.width; x += 11) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(160, 190, 211, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function getUnitLabelMaterial(unit) {
  if (unitLabelMaterials.has(unit)) return unitLabelMaterials.get(unit);
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  const accent = unit % 5 === 0;
  roundRect(ctx, 2, 3, 188, 42, 9);
  ctx.fillStyle = accent ? 'rgba(43, 31, 17, 0.96)' : 'rgba(14, 20, 27, 0.95)';
  ctx.fill();
  ctx.strokeStyle = accent ? 'rgba(255, 177, 92, 0.54)' : 'rgba(150, 177, 197, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '700 42px "SFMono-Regular", "Cascadia Code", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent ? '#ffc780' : '#d2dbe3';
  ctx.fillText(`U${unit}`, 91, 25);
  ctx.fillStyle = accent ? '#ffb15c' : 'rgba(111, 145, 168, 0.72)';
  ctx.fillRect(169, 14, 6, 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.96,
  });
  unitLabelMaterials.set(unit, material);
  return material;
}

function createRackSignTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const accent = label === 'A' ? '#ffb15c' : '#62d9c4';
  roundRect(ctx, 3, 10, 506, 108, 22);
  ctx.fillStyle = 'rgba(12, 18, 24, 0.96)';
  ctx.fill();
  ctx.strokeStyle = label === 'A' ? 'rgba(255, 177, 92, 0.45)' : 'rgba(98, 217, 196, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(43, 64, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eef4f7';
  ctx.font = '650 38px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`RACK ${label}`, 74, 63);
  ctx.fillStyle = 'rgba(164, 184, 200, 0.72)';
  ctx.font = '500 22px "SFMono-Regular", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('42U', 470, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function rebuildEquipmentScene() {
  if (!sceneInitialized || !equipmentGroup) return;
  selectedOutline = null;
  for (const child of [...equipmentGroup.children]) {
    equipmentGroup.remove(child);
    disposeObject(child);
  }

  state.devices
    .slice()
    .sort((a, b) => a.rack.localeCompare(b.rack) || a.startU - b.startU)
    .forEach((device) => {
      equipmentGroup.add(createDeviceMesh(device));
    });
}

function createDeviceMesh(device) {
  const type = typeFor(device);
  const panelWidth = RACK_WIDTH - 0.145;
  const panelHeight = type.height * U_HEIGHT - 0.006;
  const centerY = RACK_BOTTOM + (device.startU - 1) * U_HEIGHT + (type.height * U_HEIGHT) / 2;
  const group = new THREE.Group();
  group.position.set(RACK_X[device.rack], centerY, 0);
  group.userData.deviceId = device.id;

  const body = box(panelWidth + 0.012, panelHeight, 0.55, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const materials = getDeviceMaterials(type);
  const frontFace = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth, panelHeight * 0.92),
    materials.front,
  );
  frontFace.position.z = 0.276;
  frontFace.userData.deviceId = device.id;
  group.add(frontFace);

  const rearFace = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth, panelHeight * 0.92),
    materials.rear,
  );
  rearFace.position.z = -0.276;
  rearFace.rotation.y = Math.PI;
  rearFace.userData.deviceId = device.id;
  group.add(rearFace);

  [-1, 1].forEach((side) => {
    const ear = box(0.025, panelHeight, 0.018, earMaterial);
    ear.position.set(side * (panelWidth / 2 + 0.011), 0, 0.278);
    ear.userData.deviceId = device.id;
    group.add(ear);

    const accent = box(0.009, panelHeight * 0.82, 0.006, getAccentMaterial(type));
    accent.position.set(side * (panelWidth / 2 - 0.022), 0, 0.283);
    group.add(accent);
  });

  if (device.id === selectedId) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(panelWidth + 0.05, panelHeight + 0.012, 0.58)),
      new THREE.LineBasicMaterial({ color: 0xffd09a, transparent: true, opacity: 0.92 }),
    );
    edges.renderOrder = 5;
    edges.raycast = () => {};
    group.add(edges);
    selectedOutline = edges;
  }

  group.traverse((object) => {
    if (object.isMesh) object.userData.deviceId = device.id;
  });
  return group;
}

function getDeviceTextures(type) {
  if (deviceTextureCache.has(type.id)) return deviceTextureCache.get(type.id);
  const front = createDeviceFaceTexture(type, false);
  const rear = createDeviceFaceTexture(type, true);
  const textures = { front, rear };
  deviceTextureCache.set(type.id, textures);
  return textures;
}

function getDeviceMaterials(type) {
  if (deviceMaterialCache.has(type.id)) return deviceMaterialCache.get(type.id);
  const textures = getDeviceTextures(type);
  const materials = {
    front: new THREE.MeshBasicMaterial({ map: textures.front, toneMapped: false }),
    rear: new THREE.MeshBasicMaterial({ map: textures.rear, toneMapped: false }),
  };
  deviceMaterialCache.set(type.id, materials);
  return materials;
}

function getAccentMaterial(type) {
  if (accentMaterialCache.has(type.id)) return accentMaterialCache.get(type.id);
  const material = new THREE.MeshBasicMaterial({ color: type.hex });
  accentMaterialCache.set(type.id, material);
  return material;
}

function createDeviceFaceTexture(type, rear) {
  const panelWidth = RACK_WIDTH - 0.145;
  const panelHeight = type.height * U_HEIGHT - 0.006;
  const width = 1024;
  const height = Math.max(96, Math.round(width * (panelHeight / panelWidth)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const color = type.color;

  ctx.fillStyle = rear ? '#0b1117' : '#121a22';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rgba(color, rear ? 0.14 : 0.24));
  gradient.addColorStop(0.5, rgba(color, 0.025));
  gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = rgba(color, 0.86);
  ctx.fillRect(0, 0, 14, height);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(0, 2, width, 2);
  ctx.fillRect(0, height - 3, width, 2);
  ctx.strokeStyle = 'rgba(180, 203, 219, 0.16)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  if (!rear) {
    drawFrontPanel(ctx, type, width, height);
  } else {
    drawRearPanel(ctx, type, width, height);
  }

  drawScrew(ctx, 26, height / 2, type.height);
  drawScrew(ctx, width - 26, height / 2, type.height);

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.max(18, Math.min(28, height * 0.15))}px "SFMono-Regular", monospace`;
  ctx.fillStyle = rgba(color, rear ? 0.5 : 0.65);
  ctx.fillText(rear ? `${type.code} · REAR` : type.code, width - 58, height * 0.25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function drawFrontPanel(ctx, type, width, height) {
  const color = type.color;
  const centerY = height / 2;

  if (type.id === 'patch-panel') {
    const columns = 12;
    const rows = 2;
    const portW = 54;
    const portH = Math.max(13, (height - 36) / 2 - 6);
    const gap = 8;
    const totalW = columns * portW + (columns - 1) * gap;
    const startX = (width - totalW) / 2 - 28;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x = startX + col * (portW + gap);
        const y = 13 + row * (portH + 8);
        roundRect(ctx, x, y, portW, portH, 4);
        ctx.fillStyle = '#060a0e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(195, 216, 229, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(95, 224, 196, 0.2)';
        ctx.fillRect(x + 7, y + portH - 5, portW - 14, 2);
      }
    }
  } else if (type.id === 'network-switch') {
    const columns = 12;
    const portW = 49;
    const gap = 7;
    const totalW = columns * portW + (columns - 1) * gap;
    const startX = (width - totalW) / 2 - 28;
    const portH = Math.max(20, height * 0.38);
    const y = centerY - portH / 2;
    for (let col = 0; col < columns; col += 1) {
      const x = startX + col * (portW + gap);
      roundRect(ctx, x, y, portW, portH, 4);
      ctx.fillStyle = '#05090c';
      ctx.fill();
      ctx.strokeStyle = 'rgba(130, 178, 224, 0.36)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(114, 168, 255, 0.42)';
      ctx.fillRect(x + 8, y + 5, 7, 3);
      ctx.fillStyle = 'rgba(110, 226, 178, 0.55)';
      ctx.fillRect(x + 8, y + portH - 8, 3, 3);
    }
  } else if (type.id === 'compute-server') {
    const bayW = 72;
    const bayH = Math.max(32, (height - 52) / 2);
    const startX = 62;
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = startX + col * (bayW + 10);
        const y = 18 + row * (bayH + 9);
        roundRect(ctx, x, y, bayW, bayH, 5);
        ctx.fillStyle = '#0a1015';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 157, 89, 0.3)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 157, 89, 0.24)';
        ctx.fillRect(x + 8, y + 7, bayW - 16, 3);
      }
    }
    const ventX = 390;
    for (let i = 0; i < 26; i += 1) {
      ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 157, 89, 0.25)' : 'rgba(173, 199, 216, 0.12)';
      ctx.fillRect(ventX + i * 18, 20, 4, height - 40);
    }
  } else if (type.id === 'storage-array') {
    const columns = 6;
    const rows = 2;
    const bayW = 92;
    const bayH = Math.max(48, (height - 64) / 2 - 8);
    const gap = 10;
    const totalW = columns * bayW + (columns - 1) * gap;
    const startX = 62;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x = startX + col * (bayW + gap);
        const y = 20 + row * (bayH + 12);
        roundRect(ctx, x, y, bayW, bayH, 6);
        ctx.fillStyle = '#090e13';
        ctx.fill();
        ctx.strokeStyle = 'rgba(177, 149, 255, 0.3)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = 'rgba(177, 149, 255, 0.18)';
        ctx.fillRect(x + 10, y + 10, bayW - 20, 5);
        ctx.fillStyle = 'rgba(109, 226, 179, 0.72)';
        ctx.beginPath();
        ctx.arc(x + bayW - 14, y + bayH - 11, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(177, 149, 255, 0.22)';
    for (let i = 0; i < 4; i += 1) ctx.fillRect(700 + i * 24, 18, 7, height - 36);
  } else {
    const inset = 66;
    roundRect(ctx, inset, 17, width - inset * 2, height - 34, 6);
    ctx.fillStyle = 'rgba(8, 12, 16, 0.48)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(153, 174, 190, 0.13)';
    ctx.stroke();
    for (let i = 0; i < 20; i += 1) {
      ctx.fillStyle = i % 5 === 0 ? 'rgba(125, 139, 152, 0.32)' : 'rgba(125, 139, 152, 0.14)';
      ctx.fillRect(96 + i * 40, 30, 5, height - 60);
    }
  }

  ctx.fillStyle = rgba(color, 0.8);
  ctx.beginPath();
  ctx.arc(53, height - 13, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRearPanel(ctx, type, width, height) {
  const color = type.color;
  if (type.id === 'patch-panel') {
    ctx.fillStyle = 'rgba(95, 224, 196, 0.09)';
    ctx.fillRect(70, 18, width - 170, height - 36);
    ctx.strokeStyle = 'rgba(95, 224, 196, 0.25)';
    ctx.strokeRect(70, 18, width - 170, height - 36);
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = `rgba(${80 + i * 7}, ${224 - i * 6}, 196, 0.18)`;
      ctx.fillRect(92 + i * 62, 28, 4, height - 56);
    }
  } else {
    const psuY = type.height === 1 ? 11 : 18;
    const psuH = type.height === 1 ? height - 22 : height * 0.48;
    [0, 1].forEach((index) => {
      const x = 62 + index * (type.height === 1 ? 180 : 170);
      roundRect(ctx, x, psuY, 144, psuH, 5);
      ctx.fillStyle = 'rgba(5, 9, 12, 0.65)';
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.22);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(157, 184, 201, 0.2)';
      ctx.beginPath();
      ctx.arc(x + 42, psuY + psuH / 2, Math.min(psuH, 46) * 0.27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 42, psuY + psuH / 2, Math.min(psuH, 46) * 0.14, 0, Math.PI * 2);
      ctx.stroke();
    });

    const ventStart = type.height === 1 ? 450 : 420;
    for (let i = 0; i < 25; i += 1) {
      ctx.fillStyle = i % 5 === 0 ? rgba(color, 0.22) : 'rgba(157, 182, 199, 0.10)';
      ctx.fillRect(ventStart + i * 20, 18, 5, height - 36);
    }

    if (type.height > 1) {
      const lowerY = height * 0.56;
      for (let row = 0; row < 4; row += 1) {
        ctx.fillStyle = 'rgba(157, 182, 199, 0.08)';
        ctx.fillRect(430, lowerY + row * 14, 460, 3);
      }
    }
  }

  ctx.fillStyle = rgba(color, 0.8);
  ctx.beginPath();
  ctx.arc(width - 56, height - 13, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawScrew(ctx, x, y, units) {
  ctx.strokeStyle = 'rgba(196, 213, 225, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, units > 1 ? 5 : 4, 0, Math.PI * 2);
  ctx.stroke();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
}

function animateScene() {
  const elapsed = clock.getElapsedTime();
  if (cameraTween) {
    const progress = Math.min(1, (performance.now() - cameraTween.start) / cameraTween.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
    camera.lookAt(controls.target);
    if (progress >= 1) {
      cameraTween = null;
      controls.enabled = true;
      controls.update();
    }
  } else {
    controls.update();
  }

  if (selectedOutline) {
    selectedOutline.material.opacity = 0.58 + Math.sin(elapsed * 3.2) * 0.24;
  }

  const frontVisible = camera.position.z >= 0;
  Object.values(rackVisuals).forEach((visual) => {
    visual.frontLabels.visible = frontVisible;
    visual.rearLabels.visible = !frontVisible;
  });

  renderer.render(scene, camera);
}

function resizeScene() {
  if (!renderer || !camera || !dom.sceneWrap) return;
  const width = dom.sceneWrap.clientWidth;
  const height = dom.sceneWrap.clientHeight;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function setCameraView(view, immediate = false, resetOnly = false) {
  if (!sceneInitialized) return;
  currentView = resetOnly ? currentView : view;
  const targetPosition = new THREE.Vector3(0, 1.48, currentView === 'front' ? 4.95 : -4.95);
  const targetLook = new THREE.Vector3(0, 1.16, 0);

  dom.viewButtons.forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (immediate) {
    cameraTween = null;
    controls.enabled = true;
    camera.position.copy(targetPosition);
    controls.target.copy(targetLook);
    camera.lookAt(targetLook);
    controls.update();
    return;
  }

  controls.enabled = false;
  cameraTween = {
    fromPosition: camera.position.clone(),
    toPosition: targetPosition,
    fromTarget: controls.target.clone(),
    toTarget: targetLook,
    start: performance.now(),
    duration: 620,
  };
}

function onScenePointerDown(event) {
  if (event.button !== 0) return;
  pointerDown = { x: event.clientX, y: event.clientY };
}

function onScenePointerUp(event) {
  if (!pointerDown) return;
  const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 6) return;
  const hit = pickDevice(event);
  if (hit) {
    selectDevice(hit);
  } else {
    clearSelection();
  }
}

function onScenePointerMove(event) {
  if (pointerDown) return;
  const hit = pickDevice(event);
  if (hit !== hoveredDeviceId) {
    hoveredDeviceId = hit;
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
  }
}

function pickDevice(event) {
  if (!renderer || !camera || !equipmentGroup) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.015;
  raycaster.params.Points.threshold = 0.015;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(equipmentGroup.children, true);
  for (const hit of hits) {
    let object = hit.object;
    while (object) {
      if (object.userData.deviceId) return object.userData.deviceId;
      object = object.parent;
    }
  }
  return null;
}

/* --------------------------------- Utils -------------------------------- */

function rgba(hex, alpha) {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value, 16);
  const red = (int >> 16) & 255;
  const green = (int >> 8) & 255;
  const blue = int & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
