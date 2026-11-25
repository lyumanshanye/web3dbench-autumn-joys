import {
  ENTRANCES,
  EQUIPMENT_TYPES,
  TYPE_LABELS,
  activitiesForFacility,
  clampEquipmentToPark,
  clone,
  computeRoute,
  createSamplePlan,
  findFreePlacement,
  findOverlaps,
  getAllWarnings,
  getNavDocumentation,
  getNavEdges,
  getNavNodes,
  makeExportPayload,
  nextActivityId,
  nextEquipmentId,
  normalizeRotation,
  parseMinutes,
  validateActivity,
  validatePlan,
} from './model.js';
import { ParkScene } from './scene.js';

const STORAGE_KEY = 'parkwork.saved-plan.v1';
const MAX_HISTORY = 60;
const DEFAULT_UI = {
  selectedId: 'STG-01',
  routeDestinationId: 'STG-01',
  routeEntrance: 'west',
  accessMode: 'stepFree',
  snap: true,
  showGrid: false,
  showGraph: false,
  activeTab: 'inspector',
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let plan;
let ui = { ...DEFAULT_UI };
let scene = null;
let currentWarnings = [];
let currentRoute = null;
let currentOverlaps = [];
let undoStack = [];
let redoStack = [];
let dragBefore = null;
let dragId = null;
let activityEditingId = null;
let saveTimer = null;
let toastTimer = null;
let lastFocusedElement = null;
let loadingError = '';
let pendingPointerRefresh = null;

const equipmentIconPaths = {
  stage: '<path d="M3 19h18M5 19V8h14v11M8 8V5h8v3M9 12h6M12 12v4" />',
  seating: '<path d="M4 15h16M6 18v-7h12v7M8 11V8h8v3M6 18h2m8 0h2" />',
  food: '<path d="M4 10h16l-2-5H6zM5 10v9h14v-9M9 14h6" />',
  info: '<circle cx="12" cy="12" r="8" /><path d="M12 11v5m0-8v.1" />',
  aid: '<rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" />',
  water: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11zM9 15h6" />',
  barrier: '<path d="M4 17h16M6 17V7h12v10M8 10h8M8 13h8" />',
  restroom: '<circle cx="8" cy="6" r="2" /><path d="M8 8v5m0 0-2 5m2-5 2 5M16 8v8m-2 0h4M15 6h2" />',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${equipmentIconPaths[name] || equipmentIconPaths.info}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  return Number(Number(value).toFixed(2)).toString();
}

function formatDistance(value) {
  return `${Number(value).toFixed(1)} m`;
}

function modeLabel(mode) {
  return mode === 'stepFree' ? 'Step-free' : 'Pedestrian';
}

function entranceLabel(id) {
  return ENTRANCES.find((entrance) => entrance.id === id)?.name || 'Entrance';
}

function equipmentFacilities() {
  return plan.equipment.filter((item) => item.facility);
}

function schedulableFacilities() {
  return plan.equipment.filter((item) => ['stage', 'seating'].includes(item.type));
}

function getEquipment(id) {
  return plan.equipment.find((item) => item.id === id) || null;
}

function getActivity(id) {
  return plan.activities.find((item) => item.id === id) || null;
}

function normalizeUi(candidate = {}) {
  const next = { ...DEFAULT_UI, ...candidate };
  if (!plan.equipment.some((item) => item.id === next.selectedId)) {
    next.selectedId = plan.equipment[0]?.id || null;
  }
  const facilities = equipmentFacilities();
  if (!facilities.some((item) => item.id === next.routeDestinationId)) {
    next.routeDestinationId = facilities[0]?.id || null;
  }
  if (!ENTRANCES.some((entrance) => entrance.id === next.routeEntrance)) next.routeEntrance = 'west';
  if (!['stepFree', 'pedestrian'].includes(next.accessMode)) next.accessMode = 'stepFree';
  if (!['inspector', 'access', 'schedule', 'warnings'].includes(next.activeTab)) {
    next.activeTab = 'inspector';
  }
  if (next.activeTab === 'warnings' && window.innerWidth > 1080) next.activeTab = 'inspector';
  next.snap = Boolean(next.snap);
  next.showGrid = Boolean(next.showGrid);
  next.showGraph = Boolean(next.showGraph);
  return next;
}

function loadInitialPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validated = validatePlan(parsed);
      plan = validated;
      ui = normalizeUi(parsed.ui || {});
      return true;
    }
  } catch (error) {
    loadingError = `The saved plan could not be loaded: ${error.message}`;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // A failed local read should never prevent the bundled sample from loading.
    }
  }
  plan = createSamplePlan();
  ui = normalizeUi(DEFAULT_UI);
  return false;
}

function uiSnapshot() {
  return {
    selectedId: ui.selectedId,
    routeDestinationId: ui.routeDestinationId,
    routeEntrance: ui.routeEntrance,
    accessMode: ui.accessMode,
    snap: ui.snap,
    showGrid: ui.showGrid,
    showGraph: ui.showGraph,
    activeTab: ui.activeTab,
  };
}

function refreshComputedState() {
  currentOverlaps = findOverlaps(plan.equipment);
  currentRoute = computeRoute(plan.equipment, plan.park, {
    destinationId: ui.routeDestinationId,
    entranceId: ui.routeEntrance,
    mode: ui.accessMode,
  });
  currentWarnings = getAllWarnings(plan, { mode: ui.accessMode });
}

function refreshAll(options = {}) {
  refreshComputedState();
  const overlapIds = new Set(currentOverlaps.flatMap((pair) => [pair.a, pair.b]));
  if (scene) {
    if (options.scenePlan) {
      scene.setPlan(
        plan,
        plan.equipment,
        ui.selectedId,
        overlapIds,
        currentRoute,
        ui.showGrid,
        ui.showGraph,
      );
      $('#top-view-btn').classList.toggle('active', scene.currentView === 'top');
      $('#orbit-view-btn').classList.toggle('active', scene.currentView === 'orbit');
    } else {
      scene.syncEquipment(plan.equipment, ui.selectedId, overlapIds);
      scene.setRoute(currentRoute);
      scene.setGridVisible(ui.showGrid);
      scene.setGraphVisible(ui.showGraph);
    }
    scene.setSnap(ui.snap);
  }
  renderOverview();
  renderAddPalette();
  renderInspector();
  renderEquipmentList();
  renderWarnings();
  renderAccess();
  renderSchedule();
  renderTabState();
  updateUndoRedoButtons();
  if (options.scrollSelection) scrollSelectionIntoView();
}

function queuePointerRefresh() {
  if (pendingPointerRefresh) return;
  pendingPointerRefresh = requestAnimationFrame(() => {
    pendingPointerRefresh = null;
    refreshAll();
  });
}

function renderOverview() {
  $('#park-name').textContent = plan.park.name;
  $('#park-width').textContent = formatNumber(plan.park.width);
  $('#park-depth').textContent = formatNumber(plan.park.depth);
  $('#tree-count').textContent = `${plan.park.trees?.length || 0} trees`;
}

function renderAddPalette() {
  const types = ['stage', 'seating', 'foodStall', 'infoDesk', 'firstAid', 'waterPoint', 'barrier'];
  const markup = types
    .map((type) => {
      const spec = EQUIPMENT_TYPES[type];
      return `
        <button class="add-item" type="button" data-add-type="${type}" aria-label="Add ${escapeHtml(spec.label)}">
          <span class="add-item-plus" aria-hidden="true">+</span>
          <span class="add-item-copy">
            <strong>${escapeHtml(spec.label)}</strong>
            <small>${formatNumber(spec.width)} × ${formatNumber(spec.depth)} m</small>
          </span>
        </button>
      `;
    })
    .join('');
  $('#add-equipment-grid').innerHTML = markup;
  $('#add-equipment-grid-mobile').innerHTML = markup;
}

function renderInspector() {
  const item = getEquipment(ui.selectedId);
  const empty = $('#selected-empty');
  const editor = $('#selected-editor');
  const chip = $('#selection-chip');
  const sceneLabel = $('#scene-selection-label');
  if (!item) {
    empty.hidden = false;
    editor.hidden = true;
    chip.textContent = 'Nothing selected';
    chip.classList.remove('active');
    sceneLabel.textContent = 'Nothing selected';
    return;
  }

  empty.hidden = true;
  editor.hidden = false;
  chip.textContent = item.id;
  chip.classList.add('active');
  sceneLabel.textContent = `${item.name} · ${formatNumber(item.width)} × ${formatNumber(item.depth)} m`;
  $('#selected-icon').innerHTML = icon(EQUIPMENT_TYPES[item.type]?.icon || 'info');
  $('#selected-name').textContent = item.name;
  $('#selected-id').textContent = item.id;
  $('#selected-type').textContent = TYPE_LABELS[item.type] || item.type;
  $('#selected-footprint').textContent = `${formatNumber(item.width)} × ${formatNumber(item.depth)} m`;
  $('#selected-height').textContent = `${formatNumber(item.height)} m`;
  $('#selected-capacity').textContent = item.capacity ? `${item.capacity} people` : '—';
  $('#position-x').value = formatNumber(item.x);
  $('#position-z').value = formatNumber(item.z);
  $('#rotation-input').value = formatNumber(item.rotation);

  const overlap = currentOverlaps.some((pair) => pair.a === item.id || pair.b === item.id);
  const state = $('#selected-state');
  state.className = 'state-badge';
  if (overlap) {
    state.textContent = 'Overlap';
    state.classList.add('overlap');
  } else if (item.locked) {
    state.textContent = 'Fixed asset';
    state.classList.add('locked');
  } else {
    state.textContent = 'Selected';
    state.classList.add('selected');
  }

  const transformFields = $('#transform-fields');
  transformFields.disabled = Boolean(item.locked);
  $('#rotate-left-btn').disabled = Boolean(item.locked);
  $('#rotate-right-btn').disabled = Boolean(item.locked);
  $('#duplicate-btn').disabled = Boolean(item.locked);
  $('#delete-btn').disabled = Boolean(item.locked);
  $('#delete-btn').title = item.locked
    ? 'Fixed park assets cannot be deleted'
    : 'Delete this equipment';
  const lockedNote = $('#locked-note');
  lockedNote.hidden = !item.locked;
  lockedNote.textContent = item.locked
    ? item.note || 'This item is a fixed park asset and cannot be moved, duplicated, or deleted.'
    : '';
}

function renderEquipmentList() {
  const overlapIds = new Set(currentOverlaps.flatMap((pair) => [pair.a, pair.b]));
  $('#equipment-count').textContent = plan.equipment.length;
  $('#equipment-list').innerHTML = plan.equipment
    .map((item) => {
      const selected = item.id === ui.selectedId;
      const overlap = overlapIds.has(item.id);
      const badges = [
        overlap ? '<span class="mini-badge error">Overlap</span>' : '',
        item.locked ? '<span class="mini-badge lock">Fixed</span>' : '',
      ].join('');
      return `
        <button
          class="equipment-row${selected ? ' selected' : ''}${overlap ? ' overlap' : ''}"
          type="button"
          data-select-id="${escapeHtml(item.id)}"
          aria-pressed="${selected}"
          title="Select ${escapeHtml(item.name)}"
        >
          <span class="equipment-thumb" style="--item-color:${escapeHtml(item.color || '#54766a')}">
            ${icon(EQUIPMENT_TYPES[item.type]?.icon || 'info')}
          </span>
          <span class="equipment-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(TYPE_LABELS[item.type] || item.type)} · ${formatNumber(item.width)} × ${formatNumber(item.depth)} m · ${formatNumber(item.x)}, ${formatNumber(item.z)}</small>
          </span>
          <span class="equipment-badges">${badges}</span>
        </button>
      `;
    })
    .join('');
}

function warningClass(warning) {
  return warning.severity === 'warning' || warning.kind === 'schedule' ? 'warning' : 'error';
}

function targetLabel(id) {
  const item = getEquipment(id);
  if (item) return item.name;
  const activity = getActivity(id);
  if (activity) return activity.title;
  return id;
}

function warningsMarkup() {
  if (currentWarnings.length === 0) {
    return `
      <div class="warning-empty">
        <strong>No unresolved warnings.</strong><br />
        Footprints are clear and the modeled facilities are reachable in this access mode.
      </div>
    `;
  }
  return currentWarnings
    .map((warning) => {
      const chips = [...new Set(warning.targetIds)]
        .map(
          (id) =>
            `<button type="button" class="target-chip" data-warning-id="${escapeHtml(warning.id)}" data-warning-target="${escapeHtml(id)}">${escapeHtml(targetLabel(id))}</button>`,
        )
        .join('');
      return `
        <article class="warning-item ${warningClass(warning)}">
          <button type="button" class="warning-main" data-warning-id="${escapeHtml(warning.id)}">
            <span class="warning-icon" aria-hidden="true">!</span>
            <span class="warning-copy">
              <strong>${escapeHtml(warning.title)}</strong>
              <small>${escapeHtml(warning.detail)}</small>
            </span>
          </button>
          <div class="warning-targets">${chips}</div>
        </article>
      `;
    })
    .join('');
}

function renderWarnings() {
  const markup = warningsMarkup();
  $('#warnings-list').innerHTML = markup;
  $('#warnings-list-mobile').innerHTML = markup;
  $('#warning-count').textContent = currentWarnings.length;
  $('#warning-count-mobile').textContent = currentWarnings.length;
  $('#mobile-warning-count').textContent = currentWarnings.length;
}

function routeBlockerChips(route) {
  if (!route?.blockers?.length) return '';
  return [...new Set(route.blockers)]
    .map((id) => {
      const item = getEquipment(id);
      return `<button type="button" class="target-chip" data-select-id="${escapeHtml(id)}">Locate ${escapeHtml(item?.name || id)}</button>`;
    })
    .join('');
}

function renderRouteResult() {
  const result = $('#route-result');
  if (!ui.routeDestinationId) {
    result.className = 'route-result no-route';
    result.innerHTML = `
      <div class="route-result-top">
        <div><div class="route-result-label">Walking distance</div><div class="route-distance">Choose a facility</div><div class="route-meta">Select a destination to test access from either entrance.</div></div>
        <span class="route-status-dot" aria-hidden="true"></span>
      </div>
    `;
    return;
  }
  if (!currentRoute?.found) {
    result.className = 'route-result no-route';
    result.innerHTML = `
      <div class="route-result-top">
        <div>
          <div class="route-result-label">${escapeHtml(modeLabel(ui.accessMode))} route</div>
          <div class="route-distance">No route</div>
          <div class="route-meta">${escapeHtml(entranceLabel(ui.routeEntrance))} → ${escapeHtml(getEquipment(ui.routeDestinationId)?.name || 'destination')}</div>
        </div>
        <span class="route-status-dot" aria-hidden="true"></span>
      </div>
      <p class="route-reason">${escapeHtml(currentRoute?.reason || 'No route exists in this access mode.')}</p>
      <div class="warning-targets" style="padding-left:0;padding-bottom:0">${routeBlockerChips(currentRoute)}</div>
    `;
    return;
  }
  const destination = getEquipment(ui.routeDestinationId);
  result.className = 'route-result';
  result.innerHTML = `
    <div class="route-result-top">
      <div>
        <div class="route-result-label">${escapeHtml(modeLabel(ui.accessMode))} walking distance</div>
        <div class="route-distance">${formatDistance(currentRoute.distance)}</div>
        <div class="route-meta">${escapeHtml(entranceLabel(ui.routeEntrance))} → ${escapeHtml(destination?.name || 'destination')} · ${currentRoute.points.length - 1} path segments</div>
      </div>
      <span class="route-status-dot" aria-hidden="true"></span>
    </div>
  `;
}

function populateRouteDestinations() {
  const select = $('#route-destination');
  const facilities = equipmentFacilities();
  select.innerHTML = facilities.length
    ? facilities
        .map(
          (item) =>
            `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.locked ? ' (fixed)' : ''}</option>`,
        )
        .join('')
    : '<option value="">No facilities available</option>';
  select.value = ui.routeDestinationId || facilities[0]?.id || '';
}

function renderAccess() {
  populateRouteDestinations();
  $('#route-entrance').value = ui.routeEntrance;
  $$('input[name="access-mode"]').forEach((input) => {
    input.checked = input.value === ui.accessMode;
  });
  $('#show-graph-toggle').checked = ui.showGraph;
  $('#nav-documentation').textContent = getNavDocumentation();
  renderRouteResult();
}

function scheduleWarningSets() {
  const conflictActivities = new Set();
  const capacityActivities = new Set();
  for (const warning of currentWarnings) {
    if (warning.kind !== 'schedule') continue;
    const activityIds = warning.targetIds.filter((id) => Boolean(getActivity(id)));
    if (warning.id.startsWith('booking-')) activityIds.forEach((id) => conflictActivities.add(id));
    if (warning.id.startsWith('capacity-')) activityIds.forEach((id) => capacityActivities.add(id));
  }
  return { conflictActivities, capacityActivities };
}

function populateActivityFacilities() {
  const select = $('#activity-facility');
  const editingActivity = activityEditingId ? getActivity(activityEditingId) : null;
  const current = editingActivity?.facilityId || select.value;
  const facilities = schedulableFacilities();
  select.innerHTML = facilities.length
    ? facilities.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${item.capacity} capacity</option>`).join('')
    : '<option value="">Add a stage or seating area first</option>';
  if (current && facilities.some((item) => item.id === current)) select.value = current;
  else if (facilities.length) select.value = facilities[0].id;
}

function renderSchedule() {
  populateActivityFacilities();
  const { conflictActivities, capacityActivities } = scheduleWarningSets();
  const conflictCount = currentWarnings.filter((warning) => warning.id.startsWith('booking-')).length;
  const capacityCount = currentWarnings.filter((warning) => warning.id.startsWith('capacity-')).length;
  const bookedFacilities = new Set(plan.activities.map((activity) => activity.facilityId)).size;
  $('#schedule-summary').innerHTML = `
    <div class="summary-pill"><span>Activities</span><strong>${plan.activities.length}</strong></div>
    <div class="summary-pill"><span>Booked spaces</span><strong>${bookedFacilities}</strong></div>
    <div class="summary-pill"><span>Conflicts</span><strong>${conflictCount}</strong></div>
    <div class="summary-pill"><span>Capacity flags</span><strong>${capacityCount}</strong></div>
  `;

  const sorted = [...plan.activities].sort((a, b) => {
    const aStart = parseMinutes(a.start) ?? 0;
    const bStart = parseMinutes(b.start) ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    return a.facilityId.localeCompare(b.facilityId);
  });
  const list = $('#activity-list');
  if (sorted.length === 0) {
    list.innerHTML = '<div class="warning-empty">No activities yet. Add one to begin the festival schedule.</div>';
    return;
  }
  list.innerHTML = sorted
    .map((activity) => {
      const facility = getEquipment(activity.facilityId);
      const conflict = conflictActivities.has(activity.id);
      const capacity = capacityActivities.has(activity.id);
      return `
        <article class="activity-card${conflict ? ' conflict' : capacity ? ' capacity' : ''}">
          <div class="activity-main">
            <div class="activity-top">
              <span class="activity-time">${escapeHtml(activity.start)}–${escapeHtml(activity.end)}</span>
              <div class="activity-copy">
                <strong>${escapeHtml(activity.title)}</strong>
                <small>${escapeHtml(facility?.name || 'Missing facility')} · ${activity.attendance} expected · ${facility?.capacity || 0} capacity</small>
              </div>
            </div>
            <div class="activity-flags">
              ${conflict ? '<span class="activity-flag">Overlapping booking</span>' : ''}
              ${capacity ? '<span class="activity-flag capacity">Over capacity</span>' : ''}
            </div>
          </div>
          <div class="activity-actions">
            <button type="button" data-edit-activity="${escapeHtml(activity.id)}">Edit</button>
            <button type="button" class="remove-activity" data-delete-activity="${escapeHtml(activity.id)}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderTabState() {
  const tabs = ['inspector', 'access', 'schedule', 'warnings'];
  for (const tab of tabs) {
    const button = $(`#tab-button-${tab}`);
    const panel = $(`#tab-${tab}`);
    const active = ui.activeTab === tab;
    if (button) {
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    }
    if (panel) panel.hidden = !active;
  }
}

function activateTab(tab, options = {}) {
  if (!['inspector', 'access', 'schedule', 'warnings'].includes(tab)) return;
  if (tab === 'warnings' && window.innerWidth > 1080) tab = 'inspector';
  ui.activeTab = tab;
  renderTabState();
  if (options.focus) $(`#tab-button-${tab}`)?.focus();
  queueSave();
}

function scrollSelectionIntoView() {
  if (!ui.selectedId) return;
  requestAnimationFrame(() => {
    const row = $$('.equipment-row').find((candidate) => candidate.dataset.selectId === ui.selectedId);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function selectObject(id, options = {}) {
  const item = id ? getEquipment(id) : null;
  const nextId = item ? item.id : null;
  ui.selectedId = nextId;
  if (nextId === null) ui.routeDestinationId = null;
  else if (item?.facility || options.routeDestination) ui.routeDestinationId = nextId;
  if (options.switchTab) activateTab(options.switchTab);
  refreshAll({ scrollSelection: options.scroll !== false });
  queueSave();
  if (options.fromScene) activateTab('inspector');
}

function updateUndoRedoButtons() {
  $('#undo-btn').disabled = undoStack.length === 0;
  $('#redo-btn').disabled = redoStack.length === 0;
}

function recordEquipmentHistory(before) {
  if (JSON.stringify(before) === JSON.stringify(plan.equipment)) return false;
  undoStack.push(before);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
  queueSave();
  return true;
}

function undo() {
  if (undoStack.length === 0) return;
  const current = clone(plan.equipment);
  plan.equipment = undoStack.pop();
  redoStack.push(current);
  if (!getEquipment(ui.selectedId)) ui.selectedId = plan.equipment[0]?.id || null;
  if (!getEquipment(ui.routeDestinationId)?.facility) {
    ui.routeDestinationId = equipmentFacilities()[0]?.id || null;
  }
  refreshAll({ scrollSelection: true });
  queueSave();
  showToast('Equipment edit undone. Camera position was left unchanged.', 'success');
}

function redo() {
  if (redoStack.length === 0) return;
  const current = clone(plan.equipment);
  plan.equipment = redoStack.pop();
  undoStack.push(current);
  if (!getEquipment(ui.selectedId)) ui.selectedId = plan.equipment[0]?.id || null;
  if (!getEquipment(ui.routeDestinationId)?.facility) {
    ui.routeDestinationId = equipmentFacilities()[0]?.id || null;
  }
  refreshAll({ scrollSelection: true });
  queueSave();
  showToast('Equipment edit reapplied. Camera position was left unchanged.', 'success');
}

function addEquipment(type) {
  const spec = EQUIPMENT_TYPES[type];
  if (!spec) return;
  const before = clone(plan.equipment);
  const selected = getEquipment(ui.selectedId);
  const preferred = selected ? { x: selected.x + 4, z: selected.z + 4 } : { x: 0, z: 5 };
  const position = findFreePlacement(type, plan.equipment, plan.park, preferred);
  const item = {
    id: nextEquipmentId(type, plan.equipment),
    type,
    name: `${spec.label} ${nextEquipmentId(type, plan.equipment).split('-').at(-1)}`,
    x: position.x,
    z: position.z,
    rotation: 0,
    width: spec.width,
    depth: spec.depth,
    height: spec.height,
    color: spec.color,
    capacity: spec.capacity,
    facility: spec.facility,
    locked: false,
    note: '',
  };
  clampEquipmentToPark(item, plan.park);
  plan.equipment.push(item);
  ui.selectedId = item.id;
  if (item.facility) ui.routeDestinationId = item.id;
  recordEquipmentHistory(before);
  activateTab('inspector');
  refreshAll({ scrollSelection: true });
  showToast(`${item.name} added in a clear grid space.`, 'success');
}

function duplicateEquipment() {
  const source = getEquipment(ui.selectedId);
  if (!source || source.locked) return;
  const before = clone(plan.equipment);
  const position = findFreePlacement(source.type, plan.equipment, plan.park, {
    x: source.x + 3,
    z: source.z + 3,
  });
  const duplicate = {
    ...clone(source),
    id: nextEquipmentId(source.type, plan.equipment),
    name: `${source.name} copy`,
    x: position.x,
    z: position.z,
    locked: false,
    note: '',
  };
  clampEquipmentToPark(duplicate, plan.park);
  plan.equipment.push(duplicate);
  ui.selectedId = duplicate.id;
  if (duplicate.facility) ui.routeDestinationId = duplicate.id;
  recordEquipmentHistory(before);
  refreshAll({ scrollSelection: true });
  showToast(`${duplicate.name} created.`, 'success');
}

function removeEquipmentNow(id, removeBookings) {
  const item = getEquipment(id);
  if (!item || item.locked) return;
  const before = clone(plan.equipment);
  const removedBookings = removeBookings
    ? plan.activities.filter((activity) => activity.facilityId === id).length
    : 0;
  plan.equipment = plan.equipment.filter((candidate) => candidate.id !== id);
  if (removeBookings) {
    plan.activities = plan.activities.filter((activity) => activity.facilityId !== id);
  }
  if (activityEditingId && !getActivity(activityEditingId)) closeActivityEditor();
  if (ui.selectedId === id) ui.selectedId = plan.equipment[0]?.id || null;
  if (ui.routeDestinationId === id) ui.routeDestinationId = equipmentFacilities()[0]?.id || null;
  recordEquipmentHistory(before);
  refreshAll({ scrollSelection: true });
  showToast(
    `${item.name} deleted${removedBookings ? ` and ${removedBookings} booking${removedBookings === 1 ? '' : 's'} removed` : ''}.`,
    'success',
  );
}

function attemptDeleteEquipment() {
  const item = getEquipment(ui.selectedId);
  if (!item) return;
  if (item.locked) {
    showToast('The accessible restroom is a fixed park asset and cannot be deleted.', 'error');
    return;
  }
  const bookings = activitiesForFacility(plan.activities, item.id);
  if (bookings.length === 0) {
    removeEquipmentNow(item.id, false);
    return;
  }
  const bookingList = bookings
    .map(
      (activity) =>
        `<li>${escapeHtml(activity.title)} · ${escapeHtml(activity.start)}–${escapeHtml(activity.end)}</li>`,
    )
    .join('');
  showModal({
    title: 'Remove a booked facility?',
    body: `
      <p><strong>${escapeHtml(item.name)}</strong> has ${bookings.length} scheduled booking${bookings.length === 1 ? '' : 's'}. A facility cannot be deleted while the schedule still references it.</p>
      <ul>${bookingList}</ul>
      <p>Cancel to keep the facility, or explicitly remove the facility and its bookings.</p>
    `,
    actions: [
      { label: 'Cancel deletion', kind: 'secondary' },
      {
        label: `Remove facility & ${bookings.length} booking${bookings.length === 1 ? '' : 's'}`,
        kind: 'danger',
        onClick: () => removeEquipmentNow(item.id, true),
      },
    ],
  });
}

function rotateSelected(delta) {
  const item = getEquipment(ui.selectedId);
  if (!item || item.locked) return;
  const before = clone(plan.equipment);
  item.rotation = normalizeRotation(item.rotation + delta);
  clampEquipmentToPark(item, plan.park);
  recordEquipmentHistory(before);
  refreshAll();
}

function applyNumericTransform(field, value) {
  const item = getEquipment(ui.selectedId);
  if (!item || item.locked) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    refreshAll();
    showToast('Enter a finite number for position or rotation.', 'error');
    return;
  }
  const before = clone(plan.equipment);
  if (field === 'x') item.x = numeric;
  if (field === 'z') item.z = numeric;
  if (field === 'rotation') item.rotation = normalizeRotation(numeric);
  const oldX = item.x;
  const oldZ = item.z;
  clampEquipmentToPark(item, plan.park);
  const clamped = Math.abs(oldX - item.x) > 0.001 || Math.abs(oldZ - item.z) > 0.001;
  recordEquipmentHistory(before);
  refreshAll();
  if (clamped) showToast('Position clamped so the full footprint stays inside the park.', 'error');
}

function onDragStart(id) {
  dragId = id;
  dragBefore = clone(plan.equipment);
}

function onDragPosition(id, x, z) {
  const item = getEquipment(id);
  if (!item || item.locked) return;
  let nextX = x;
  let nextZ = z;
  if (ui.snap) {
    nextX = Math.round(nextX);
    nextZ = Math.round(nextZ);
  } else {
    nextX = Math.round(nextX * 100) / 100;
    nextZ = Math.round(nextZ * 100) / 100;
  }
  item.x = nextX;
  item.z = nextZ;
  clampEquipmentToPark(item, plan.park);
  queuePointerRefresh();
}

function onDragEnd(id, moved) {
  if (id !== dragId) return;
  if (moved && dragBefore) {
    const changed = recordEquipmentHistory(dragBefore);
    if (changed) queueSave();
  }
  dragBefore = null;
  dragId = null;
  refreshAll({ scrollSelection: true });
}

function openActivityEditor(activity = null) {
  const facilities = schedulableFacilities();
  if (facilities.length === 0) {
    showToast('Add a stage or seating area before scheduling activities.', 'error');
    return;
  }
  activityEditingId = activity?.id || null;
  $('#activity-form-title').textContent = activity ? 'Edit activity' : 'Add activity';
  $('#save-activity-btn').textContent = activity ? 'Update activity' : 'Add to schedule';
  $('#activity-title').value = activity?.title || '';
  populateActivityFacilities();
  $('#activity-facility').value = activity?.facilityId || facilities[0].id;
  $('#activity-start').value = activity?.start || '12:00';
  $('#activity-end').value = activity?.end || '13:00';
  $('#activity-attendance').value = activity?.attendance ?? 50;
  $('#activity-form-error').hidden = true;
  $('#activity-form').hidden = false;
  activateTab('schedule');
  requestAnimationFrame(() => $('#activity-title').focus());
}

function closeActivityEditor() {
  activityEditingId = null;
  $('#activity-form').hidden = true;
  $('#activity-form-error').hidden = true;
  $('#activity-form').reset();
  $('#activity-title').value = '';
  $('#activity-attendance').value = 50;
  $('#activity-start').value = '12:00';
  $('#activity-end').value = '13:00';
}

function saveActivityFromForm(event) {
  event.preventDefault();
  const facilities = schedulableFacilities();
  if (facilities.length === 0) {
    showActivityError(['Add a stage or seating area before scheduling activities.']);
    return;
  }
  const activity = {
    id: activityEditingId || nextActivityId(plan.activities),
    title: $('#activity-title').value.trim(),
    facilityId: $('#activity-facility').value,
    start: $('#activity-start').value,
    end: $('#activity-end').value,
    attendance: Number($('#activity-attendance').value),
  };
  const errors = validateActivity(activity, plan.equipment);
  if (errors.length > 0) {
    showActivityError(errors);
    return;
  }
  const facility = getEquipment(activity.facilityId);
  if (activityEditingId) {
    plan.activities = plan.activities.map((existing) => (existing.id === activityEditingId ? activity : existing));
  } else {
    plan.activities.push(activity);
  }
  const editing = Boolean(activityEditingId);
  closeActivityEditor();
  refreshAll();
  queueSave();
  showToast(
    `${editing ? 'Updated' : 'Added'} ${activity.title} at ${facility?.name || 'the facility'}.`,
    'success',
  );
}

function showActivityError(errors) {
  const element = $('#activity-form-error');
  element.innerHTML = `<strong>Check the activity:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
  element.hidden = false;
}

function deleteActivity(id) {
  const activity = getActivity(id);
  if (!activity) return;
  plan.activities = plan.activities.filter((candidate) => candidate.id !== id);
  if (activityEditingId === id) closeActivityEditor();
  refreshAll();
  queueSave();
  showToast(`${activity.title} removed from the schedule.`, 'success');
}

function locateWarning(warningId, targetId = null) {
  const warning = currentWarnings.find((candidate) => candidate.id === warningId);
  if (!warning) return;
  const fallbackTarget = warning.kind === 'route'
    ? [...warning.targetIds].reverse().find((id) => getEquipment(id)?.facility) || warning.targetIds[0]
    : warning.targetIds[0];
  let target = targetId || fallbackTarget;
  const activity = getActivity(target);
  if (activity) target = activity.facilityId;
  const item = getEquipment(target);
  if (!item) return;
  selectObject(item.id, {
    routeDestination: item.facility,
    switchTab: warning.kind === 'route' ? 'access' : warning.kind === 'schedule' ? 'schedule' : 'inspector',
    scroll: true,
  });
}

function showModal({ title, body, actions = [] }) {
  const root = $('#modal-root');
  lastFocusedElement = document.activeElement;
  root.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${escapeHtml(title)}</h2>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">
        ${actions
          .map(
            (action, index) =>
              `<button type="button" class="${action.kind || 'secondary'}-button" data-modal-action="${index}">${escapeHtml(action.label)}</button>`,
          )
          .join('')}
      </div>
    </div>
  `;
  root.hidden = false;
  const buttons = $$('[data-modal-action]', root);
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const action = actions[index];
      closeModal(true);
      action.onClick?.();
    });
  });
  const cancelAction = actions.findIndex((action) => !action.onClick);
  requestAnimationFrame(() => buttons[cancelAction >= 0 ? cancelAction : 0]?.focus());
  root.onkeydown = handleModalKeydown;
  root.onclick = (event) => {
    if (event.target === root) closeModal();
  };
}

function handleModalKeydown(event) {
  const root = $('#modal-root');
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root).filter(
    (element) => !element.disabled,
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeModal(restoreFocus = true) {
  const root = $('#modal-root');
  root.hidden = true;
  root.innerHTML = '';
  root.onkeydown = null;
  root.onclick = null;
  if (restoreFocus) lastFocusedElement?.focus?.();
}

function showToast(message, type = '') {
  const region = $('#toast-region');
  region.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  region.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.remove();
  }, 4200);
}

function queueSave() {
  const status = $('#save-status');
  status.textContent = 'Saving locally…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 320);
}

function saveNow(options = {}) {
  clearTimeout(saveTimer);
  try {
    const payload = makeExportPayload(plan, uiSnapshot());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const time = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    $('#save-status').textContent = `Saved locally · ${time}`;
    if (options.announce) showToast('Plan saved in this browser.', 'success');
    return true;
  } catch (error) {
    $('#save-status').textContent = 'Local save unavailable';
    if (options.announce) showToast(`Could not save locally: ${error.message}`, 'error');
    return false;
  }
}

function exportPlan() {
  saveNow();
  const payload = makeExportPayload(plan, uiSnapshot());
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = plan.park.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  anchor.href = url;
  anchor.download = `${safeName || 'parkwork-plan'}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Plan exported as JSON.', 'success');
}

async function importPlanFile(file) {
  if (!file) return;
  let validated;
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
    validated = validatePlan(parsed);
  } catch (error) {
    showToast(`Import rejected. Existing work was kept. ${error.message}`, 'error');
    return;
  }
  const importedUiCandidate = { ...DEFAULT_UI, ...(parsed.ui || {}) };
  plan = validated;
  ui = normalizeUi(importedUiCandidate);
  undoStack = [];
  redoStack = [];
  closeActivityEditor();
  refreshAll({ scenePlan: true, scrollSelection: true });
  saveNow();
  activateTab(ui.activeTab);
  showToast(
    `Imported ${plan.equipment.length} objects and ${plan.activities.length} activities. Route results were recomputed.`,
    'success',
  );
}

function resetToSample() {
  showModal({
    title: 'Reset to the bundled sample?',
    body: `<p>This replaces the current layout, equipment identifiers, schedule, and camera framing with the bundled Riverbend Community Park sample.</p><p><strong>This action cannot be undone.</strong> Export the current plan first if you want to keep it.</p>`,
    actions: [
      { label: 'Cancel', kind: 'secondary' },
      {
        label: 'Reset sample',
        kind: 'danger',
        onClick: () => {
          plan = createSamplePlan();
          ui = normalizeUi(DEFAULT_UI);
          undoStack = [];
          redoStack = [];
          closeActivityEditor();
          refreshAll({ scenePlan: true, scrollSelection: true });
          saveNow();
          activateTab('inspector');
          showToast('Bundled sample restored.', 'success');
        },
      },
    ],
  });
}

function openEquipmentTypeOptions() {
  const input = $('#import-file');
  input.value = '';
  input.click();
}

function printSummary() {
  renderPrintContent();
  const summary = $('#print-summary');
  summary.setAttribute('aria-hidden', 'false');
  const cleanup = () => {
    summary.setAttribute('aria-hidden', 'true');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 40);
}

function footprintPolygon(item) {
  const rad = (normalizeRotation(item.rotation) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = item.width / 2;
  const hd = item.depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([lx, lz]) => [item.x + lx * cos + lz * sin, item.z - lx * sin + lz * cos]);
}

function printLayoutSvg() {
  const width = plan.park.width;
  const depth = plan.park.depth;
  const nodes = Object.fromEntries(getNavNodes().map((node) => [node.id, node]));
  const paths = getNavEdges()
    .map((edge) => {
      const a = nodes[edge.a];
      const b = nodes[edge.b];
      return `<line x1="${a.x + width / 2}" y1="${a.z + depth / 2}" x2="${b.x + width / 2}" y2="${b.z + depth / 2}" stroke="${edge.stepOnly ? '#c2782d' : '#b5a77f'}" stroke-width="${edge.stepOnly ? 0.7 : 1.7}" ${edge.stepOnly ? 'stroke-dasharray="1 1"' : ''} />`;
    })
    .join('');
  const trees = (plan.park.trees || [])
    .map((tree) => `<circle cx="${tree.x + width / 2}" cy="${tree.z + depth / 2}" r="0.9" fill="#78976e" />`)
    .join('');
  const equipment = plan.equipment
    .map((item) => {
      const points = footprintPolygon(item)
        .map(([x, z]) => `${x + width / 2},${z + depth / 2}`)
        .join(' ');
      const textX = item.x + width / 2;
      const textY = item.z + depth / 2;
      return `<g><polygon points="${points}" fill="${escapeHtml(item.color)}" fill-opacity="0.72" stroke="#263f36" stroke-width="0.22" /><text x="${textX}" y="${textY}" font-size="1.05" text-anchor="middle" dominant-baseline="middle" fill="#10251f">${escapeHtml(item.id)}</text></g>`;
    })
    .join('');
  const entrances = ENTRANCES.map((entrance) => {
    const node = nodes[entrance.nodeId];
    return `<g><circle cx="${node.x + width / 2}" cy="${node.z + depth / 2}" r="1.1" fill="#145f56" /><text x="${node.x + width / 2}" y="${node.z + depth / 2 + 2.6}" font-size="1.1" text-anchor="middle" fill="#145f56">${escapeHtml(entrance.name)}</text></g>`;
  }).join('');
  return `
    <svg class="print-diagram" viewBox="-5 -5 ${width + 10} ${depth + 10}" role="img" aria-label="Plan diagram of ${escapeHtml(plan.park.name)}">
      <rect x="0" y="0" width="${width}" height="${depth}" fill="#dce8cd" stroke="#546d5c" stroke-width="0.5" />
      ${paths}
      ${trees}
      ${entrances}
      ${equipment}
    </svg>
  `;
}

function renderPrintContent() {
  const generated = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const equipmentRows = plan.equipment
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(TYPE_LABELS[item.type] || item.type)}</td>
          <td>${formatNumber(item.x)}, ${formatNumber(item.z)}</td>
          <td>${formatNumber(item.rotation)}°</td>
          <td>${formatNumber(item.width)} × ${formatNumber(item.depth)} m</td>
          <td>${item.locked ? 'Fixed asset' : 'Editable equipment'}</td>
        </tr>
      `,
    )
    .join('');
  const activityRows = plan.activities.length
    ? [...plan.activities]
        .sort((a, b) => (parseMinutes(a.start) || 0) - (parseMinutes(b.start) || 0))
        .map((activity) => {
          const facility = getEquipment(activity.facilityId);
          return `
            <tr>
              <td>${escapeHtml(activity.start)}–${escapeHtml(activity.end)}</td>
              <td>${escapeHtml(activity.title)}</td>
              <td>${escapeHtml(facility?.name || activity.facilityId)}</td>
              <td>${activity.attendance} expected / ${facility?.capacity || 0} capacity</td>
            </tr>
          `;
        })
        .join('')
    : '<tr><td colspan="4">No activities scheduled.</td></tr>';
  const warningItems = currentWarnings.length
    ? currentWarnings
        .map((warning) => `<li><strong>${escapeHtml(warning.title)}.</strong> ${escapeHtml(warning.detail)}</li>`)
        .join('')
    : '<li>No unresolved planning warnings at the time of printing.</li>';
  const routeText = currentRoute?.found
    ? `${entranceLabel(ui.routeEntrance)} to ${getEquipment(ui.routeDestinationId)?.name || 'selected facility'}: ${formatDistance(currentRoute.distance)} (${modeLabel(ui.accessMode)}).`
    : `No ${modeLabel(ui.accessMode).toLowerCase()} route from ${entranceLabel(ui.routeEntrance)} to the selected facility.`;
  $('#print-content').innerHTML = `
    <h1>${escapeHtml(plan.park.name)} — festival plan summary</h1>
    <div class="print-meta">
      <span>Planning demonstration</span>
      <span>Generated ${escapeHtml(generated)}</span>
      <span>Park footprint ${formatNumber(plan.park.width)} m × ${formatNumber(plan.park.depth)} m</span>
      <span>Two entrances · ${plan.park.trees?.length || 0} trees · accessible restroom</span>
    </div>
    <div class="print-warning"><strong>Not a certified safety or accessibility assessment.</strong> Routes and capacities are simplified planning checks.</div>
    <h2>Layout</h2>
    ${printLayoutSvg()}
    <p>${escapeHtml(routeText)} ${escapeHtml(getNavDocumentation())}. The stepped shortcut is unavailable in step-free mode.</p>
    <h2>Equipment</h2>
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>X, Z (m)</th><th>Rotation</th><th>Footprint</th><th>Status</th></tr></thead>
      <tbody>${equipmentRows}</tbody>
    </table>
    <h2>Schedule</h2>
    <table>
      <thead><tr><th>Time</th><th>Activity</th><th>Facility</th><th>Attendance / capacity</th></tr></thead>
      <tbody>${activityRows}</tbody>
    </table>
    <h2>Unresolved warnings (${currentWarnings.length})</h2>
    <ul class="print-warning-list">${warningItems}</ul>
    <div class="print-footer">
      Parkwork planning demonstration · Local browser save · Export JSON for portability. Review all plans with qualified event and accessibility professionals.
    </div>
  `;
}

function setCameraView(view) {
  if (!scene) return;
  scene.setView(view);
  $('#top-view-btn').classList.toggle('active', view === 'top');
  $('#orbit-view-btn').classList.toggle('active', view === 'orbit');
}

function focusSelection() {
  if (!scene) return;
  if (!ui.selectedId) {
    showToast('Select equipment before using zoom-to-selection.', 'error');
    return;
  }
  scene.focusSelection(ui.selectedId);
}

function toggleOtherEntrance() {
  ui.routeEntrance = ui.routeEntrance === 'west' ? 'south' : 'west';
  refreshAll();
  queueSave();
}

function bindEvents() {
  $('#undo-btn').addEventListener('click', undo);
  $('#redo-btn').addEventListener('click', redo);
  $('#export-btn').addEventListener('click', exportPlan);
  $('#import-btn').addEventListener('click', openEquipmentTypeOptions);
  $('#import-file').addEventListener('change', (event) => importPlanFile(event.target.files?.[0]));
  $('#print-btn').addEventListener('click', printSummary);
  $('#reset-btn').addEventListener('click', resetToSample);

  $$('.panel-tab').forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });

  $('#snap-toggle').addEventListener('change', (event) => {
    ui.snap = event.target.checked;
    scene?.setSnap(ui.snap);
    queueSave();
  });
  $('#grid-toggle').addEventListener('change', (event) => {
    ui.showGrid = event.target.checked;
    scene?.setGridVisible(ui.showGrid);
    queueSave();
  });
  $('#show-graph-toggle').addEventListener('change', (event) => {
    ui.showGraph = event.target.checked;
    scene?.setGraphVisible(ui.showGraph);
    queueSave();
  });

  $('#top-view-btn').addEventListener('click', () => setCameraView('top'));
  $('#orbit-view-btn').addEventListener('click', () => setCameraView('orbit'));
  $('#focus-btn').addEventListener('click', focusSelection);
  $('#reset-camera-btn').addEventListener('click', () => {
    scene?.resetCamera();
    $('#top-view-btn').classList.remove('active');
    $('#orbit-view-btn').classList.add('active');
    showToast('Camera reset. Equipment edits are unchanged.');
  });

  $('#rotate-left-btn').addEventListener('click', () => rotateSelected(-15));
  $('#rotate-right-btn').addEventListener('click', () => rotateSelected(15));
  $('#duplicate-btn').addEventListener('click', duplicateEquipment);
  $('#delete-btn').addEventListener('click', attemptDeleteEquipment);
  $('#position-x').addEventListener('change', (event) => applyNumericTransform('x', event.target.value));
  $('#position-z').addEventListener('change', (event) => applyNumericTransform('z', event.target.value));
  $('#rotation-input').addEventListener('change', (event) => applyNumericTransform('rotation', event.target.value));

  $('#route-destination').addEventListener('change', (event) => {
    const item = getEquipment(event.target.value);
    ui.routeDestinationId = item?.id || null;
    if (item) ui.selectedId = item.id;
    refreshAll({ scrollSelection: true });
    queueSave();
  });
  $('#route-entrance').addEventListener('change', (event) => {
    ui.routeEntrance = event.target.value;
    refreshAll();
    queueSave();
  });
  $$('input[name="access-mode"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      ui.accessMode = event.target.value;
      refreshAll();
      queueSave();
    });
  });
  $('#focus-route-destination').addEventListener('click', focusSelection);
  $('#choose-other-entrance').addEventListener('click', toggleOtherEntrance);

  $('#new-activity-btn').addEventListener('click', () => openActivityEditor());
  $('#cancel-activity-btn').addEventListener('click', closeActivityEditor);
  $('#activity-form').addEventListener('submit', saveActivityFromForm);

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-type]');
    if (addButton) {
      addEquipment(addButton.dataset.addType);
      return;
    }
    const warningTarget = event.target.closest('[data-warning-target]');
    if (warningTarget) {
      locateWarning(warningTarget.dataset.warningId, warningTarget.dataset.warningTarget);
      return;
    }
    const warningButton = event.target.closest('[data-warning-id]');
    if (warningButton) {
      locateWarning(warningButton.dataset.warningId);
      return;
    }
    const selectButton = event.target.closest('[data-select-id]');
    if (selectButton) {
      const item = getEquipment(selectButton.dataset.selectId);
      selectObject(selectButton.dataset.selectId, {
        routeDestination: Boolean(item?.facility),
        switchTab: null,
        scroll: true,
      });
      return;
    }
    const editButton = event.target.closest('[data-edit-activity]');
    if (editButton) {
      const activity = getActivity(editButton.dataset.editActivity);
      if (activity) openActivityEditor(activity);
      return;
    }
    const deleteButton = event.target.closest('[data-delete-activity]');
    if (deleteButton) {
      deleteActivity(deleteButton.dataset.deleteActivity);
    }
  });

  document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName?.toLowerCase();
    const typing = ['input', 'select', 'textarea'].includes(tag) || event.target.isContentEditable;
    if (event.key === 'Escape' && !$('#modal-root').hidden) {
      closeModal();
      return;
    }
    if (!$('#modal-root').hidden) return;
    if (typing) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && ui.selectedId) {
      event.preventDefault();
      attemptDeleteEquipment();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (saveTimer) saveNow();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080 && ui.activeTab === 'warnings') {
      ui.activeTab = 'inspector';
      renderTabState();
    }
  });
}

function initScene() {
  try {
    scene = new ParkScene($('#scene-container'), {
      onSelect: (id) => selectObject(id, { fromScene: true, scroll: true }),
      onDragStart,
      onDragPosition,
      onDragEnd,
    });
    scene.setSnap(ui.snap);
    refreshAll({ scenePlan: true });
  } catch (error) {
    $('#scene-container').innerHTML = `
      <div style="height:100%;display:grid;place-items:center;padding:30px;text-align:center;background:#d7e4df;color:#26463b">
        <div><strong>The 3D site could not start.</strong><br /><span style="font-size:12px">${escapeHtml(error.message)}</span></div>
      </div>
    `;
    refreshAll();
    showToast(`3D renderer unavailable: ${error.message}`, 'error');
  }
}

function init() {
  const loaded = loadInitialPlan();
  bindEvents();
  initScene();
  $('#grid-toggle').checked = ui.showGrid;
  $('#snap-toggle').checked = ui.snap;
  $('#show-graph-toggle').checked = ui.showGraph;
  activateTab(ui.activeTab);
  $('#orbit-view-btn').classList.add('active');
  if (loadingError) showToast(loadingError, 'error');
  else if (loaded) $('#save-status').textContent = 'Saved plan loaded';
  else queueSave();
}

init();
