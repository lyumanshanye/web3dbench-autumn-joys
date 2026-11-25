import {
  PARK,
  EQUIPMENT_TYPES,
  createSamplePlan,
  clone,
  createId,
  equipmentDefaults,
  formatDimensions,
  formatMeters,
  confineToPark,
  isOutsidePark,
  overlapPairs,
  objectHalfExtents,
  normalizeRotation,
  round,
  minutesFromTime,
  parsePlanFile,
  itemLabel,
  isFacility,
  isScheduleable
} from './data.js';
import { computeRoute, NAVIGATION_MODEL } from './routing.js';
import { ParkScene } from './scene.js';

const STORAGE_KEY = 'meadowline-festival-plan-v1';
const MAX_HISTORY = 60;

const dom = {
  workspace: document.getElementById('workspace'),
  sceneMount: document.getElementById('sceneMount'),
  equipmentList: document.getElementById('equipmentList'),
  equipmentCount: document.getElementById('equipmentCount'),
  inspectorContent: document.getElementById('inspectorContent'),
  selectionModeBadge: document.getElementById('selectionModeBadge'),
  routeStartSelect: document.getElementById('routeStartSelect'),
  routeResult: document.getElementById('routeResult'),
  issuesList: document.getElementById('issuesList'),
  issuesCount: document.getElementById('issuesCount'),
  scheduleList: document.getElementById('scheduleList'),
  scheduleCount: document.getElementById('scheduleCount'),
  scheduleWarningCount: document.getElementById('scheduleWarningCount'),
  savedStatus: document.getElementById('savedStatus'),
  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  zoomSelectionBtn: document.getElementById('zoomSelectionBtn'),
  snapBtn: document.getElementById('snapBtn'),
  sceneIssuesBtn: document.getElementById('sceneIssuesBtn'),
  sceneIssuesText: document.getElementById('sceneIssuesText'),
  mobileIssueCount: document.getElementById('mobileIssueCount'),
  sceneModeLabel: document.getElementById('sceneModeLabel'),
  orbitViewBtn: document.getElementById('orbitViewBtn'),
  topViewBtn: document.getElementById('topViewBtn'),
  activityDialog: document.getElementById('activityDialog'),
  activityForm: document.getElementById('activityForm'),
  activityDialogTitle: document.getElementById('activityDialogTitle'),
  activityError: document.getElementById('activityError'),
  activityId: document.getElementById('activityId'),
  activityTitle: document.getElementById('activityTitle'),
  activityFacility: document.getElementById('activityFacility'),
  activityStart: document.getElementById('activityStart'),
  activityEnd: document.getElementById('activityEnd'),
  activityAttendance: document.getElementById('activityAttendance'),
  activityCapacityHint: document.getElementById('activityCapacityHint'),
  formOverlapHint: document.getElementById('formOverlapHint'),
  deleteFacilityDialog: document.getElementById('deleteFacilityDialog'),
  deleteFacilityMessage: document.getElementById('deleteFacilityMessage'),
  resetDialog: document.getElementById('resetDialog'),
  importErrorDialog: document.getElementById('importErrorDialog'),
  importErrorList: document.getElementById('importErrorList'),
  walkingModelDialog: document.getElementById('walkingModelDialog'),
  importInput: document.getElementById('importInput'),
  toast: document.getElementById('toast'),
  printSummaryContent: document.getElementById('printSummaryContent')
};

const initialPlan = loadInitialPlan();
const initialSelection = resolveInitialSelection(initialPlan);
const state = {
  equipment: clone(initialPlan.equipment),
  activities: clone(initialPlan.activities),
  selectionId: initialSelection,
  routeConfig: {
    start: initialPlan.routeConfig?.start || 'west',
    mode: initialPlan.routeConfig?.mode || 'pedestrian',
    targetId: initialSelection
  },
  route: null,
  overlapIds: new Set()
};

let historyPast = [];
let historyFuture = [];
let dragSnapshot = null;
let draggedObjectId = null;
let activityEditingId = null;
let deleteTargetId = null;
let cameraMode = 'orbit';
let snapEnabled = true;
let warnings = [];
let scheduleIssues = [];
let toastTimer = null;
let lastSavedAt = initialPlan.savedAt ? new Date(initialPlan.savedAt) : null;
let scene = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function findEquipment(id) {
  return state.equipment.find((object) => object.id === id) || null;
}

function firstFacilityId() {
  return state.equipment.find((object) => isFacility(object))?.id || null;
}

function resolveInitialSelection(plan) {
  const target = plan.equipment.find((object) => object.id === plan.routeConfig?.targetId);
  if (target && isFacility(target)) return target.id;
  return (
    plan.equipment.find((object) => object.type === 'stage' && isFacility(object))?.id ||
    plan.equipment.find((object) => isFacility(object))?.id ||
    null
  );
}

function loadInitialPlan() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createSamplePlan();
    const parsed = JSON.parse(stored);
    const validation = validatePlan(parsed);
    if (validation.errors.length) {
      console.warn('Stored plan could not be loaded:', validation.errors);
      return createSamplePlan();
    }
    return validation.plan;
  } catch (error) {
    console.warn('Stored plan could not be read:', error);
    return createSamplePlan();
  }
}

function validatePlan(rawPlan) {
  let plan;
  try {
    plan = parsePlanFile(rawPlan);
  } catch (error) {
    return { errors: [error.message], plan: null };
  }

  const errors = [];
  const equipmentIds = new Set();
  const normalizedEquipment = [];

  if (plan.equipment.length === 0) {
    errors.push('The plan must contain at least one piece of equipment.');
  }

  plan.equipment.forEach((rawObject, index) => {
    const label = `Equipment ${index + 1}${rawObject?.id ? ` (${String(rawObject.id)})` : ''}`;
    if (!rawObject || typeof rawObject !== 'object') {
      errors.push(`${label} is not an object.`);
      return;
    }
    if (typeof rawObject.id !== 'string' || !rawObject.id.trim()) {
      errors.push(`${label} needs a non-empty string id.`);
      return;
    }
    if (equipmentIds.has(rawObject.id)) {
      errors.push(`Equipment id “${rawObject.id}” is duplicated.`);
      return;
    }
    equipmentIds.add(rawObject.id);

    if (!EQUIPMENT_TYPES[rawObject.type]) {
      errors.push(`${label} has unknown type “${String(rawObject.type)}”.`);
      return;
    }
    if (typeof rawObject.name !== 'string' || !rawObject.name.trim()) {
      errors.push(`${label} needs a name.`);
    }
    const numericFields = ['x', 'z', 'rotation', 'width', 'depth', 'capacity'];
    for (const field of numericFields) {
      if (!Number.isFinite(Number(rawObject[field]))) {
        errors.push(`${label} has an invalid ${field} value.`);
      }
    }
    if (Number(rawObject.width) <= 0 || Number(rawObject.depth) <= 0) {
      errors.push(`${label} must have positive width and depth.`);
    }
    if (Number(rawObject.capacity) < 0) {
      errors.push(`${label} cannot have negative capacity.`);
    }
    if (rawObject.fixed !== undefined && typeof rawObject.fixed !== 'boolean') {
      errors.push(`${label} has an invalid fixed flag.`);
    }

    const normalized = {
      id: rawObject.id,
      type: rawObject.type,
      name: String(rawObject.name || itemLabel(rawObject)).trim(),
      x: Number(rawObject.x),
      z: Number(rawObject.z),
      rotation: round(normalizeRotation(rawObject.rotation), 1),
      width: Number(rawObject.width),
      depth: Number(rawObject.depth),
      capacity: Math.max(0, Math.round(Number(rawObject.capacity) || 0)),
      fixed: Boolean(rawObject.fixed)
    };
    if (isOutsidePark(normalized)) {
      errors.push(`${label} extends outside the park boundary.`);
    }
    if (rawObject.type === 'restroom' && !normalized.fixed) {
      errors.push(`${label} is a fixed accessible restroom and must be marked fixed.`);
    }
    normalizedEquipment.push(normalized);
  });

  if (!normalizedEquipment.some((object) => object.type === 'restroom')) {
    errors.push('The complete plan must include the fixed accessible restroom.');
  }

  const equipmentById = new Map(normalizedEquipment.map((object) => [object.id, object]));
  const activityIds = new Set();
  const normalizedActivities = [];
  plan.activities.forEach((rawActivity, index) => {
    const label = `Activity ${index + 1}${rawActivity?.title ? ` (“${String(rawActivity.title)}”)` : ''}`;
    if (!rawActivity || typeof rawActivity !== 'object') {
      errors.push(`${label} is not an object.`);
      return;
    }
    if (typeof rawActivity.id !== 'string' || !rawActivity.id.trim()) {
      errors.push(`${label} needs a non-empty string id.`);
      return;
    }
    if (activityIds.has(rawActivity.id)) {
      errors.push(`Activity id “${rawActivity.id}” is duplicated.`);
      return;
    }
    activityIds.add(rawActivity.id);
    if (typeof rawActivity.title !== 'string' || !rawActivity.title.trim()) {
      errors.push(`${label} needs a title.`);
    }
    const facility = equipmentById.get(rawActivity.facilityId);
    if (!facility) {
      errors.push(`${label} refers to a facility that does not exist.`);
    } else if (!isScheduleable(facility)) {
      errors.push(`${label} is assigned to a facility that cannot host activities.`);
    }
    const startMinutes = minutesFromTime(rawActivity.start);
    const endMinutes = minutesFromTime(rawActivity.end);
    if (startMinutes === null) errors.push(`${label} has an invalid start time.`);
    if (endMinutes === null) errors.push(`${label} has an invalid end time.`);
    if (startMinutes !== null && endMinutes !== null) {
      if (endMinutes < startMinutes) errors.push(`${label} ends before it starts.`);
      if (endMinutes === startMinutes) errors.push(`${label} must end after it starts.`);
    }
    const attendance = Number(rawActivity.attendance);
    if (!Number.isInteger(attendance) || attendance < 0) {
      errors.push(`${label} needs a whole-number attendance of zero or more.`);
    }
    normalizedActivities.push({
      id: rawActivity.id,
      title: String(rawActivity.title || '').trim(),
      facilityId: String(rawActivity.facilityId || ''),
      start: String(rawActivity.start || ''),
      end: String(rawActivity.end || ''),
      attendance
    });
  });

  let routeConfig = {
    start: 'west',
    mode: 'pedestrian',
    targetId: null
  };
  if (plan.routeConfig && typeof plan.routeConfig === 'object') {
    if (!PARK.entrances.some((entrance) => entrance.id === plan.routeConfig.start)) {
      errors.push('Route start must be either the west or east entrance.');
    }
    if (!['pedestrian', 'step-free'].includes(plan.routeConfig.mode)) {
      errors.push('Route mode must be pedestrian or step-free.');
    }
    const target = plan.routeConfig.targetId ? equipmentById.get(plan.routeConfig.targetId) : null;
    if (plan.routeConfig.targetId && !target) {
      errors.push('The saved route target does not exist in the plan.');
    } else if (target && !isFacility(target)) {
      errors.push('The saved route target is not a facility.');
    }
    routeConfig = {
      start: ['west', 'east'].includes(plan.routeConfig.start) ? plan.routeConfig.start : 'west',
      mode: ['pedestrian', 'step-free'].includes(plan.routeConfig.mode) ? plan.routeConfig.mode : 'pedestrian',
      targetId: target?.id || null
    };
  }

  if (errors.length) return { errors, plan: null };
  return {
    errors: [],
    plan: {
      schema: 'meadowline-festival-plan',
      version: 1,
      parkId: PARK.id,
      savedAt: plan.savedAt,
      equipment: normalizedEquipment,
      activities: normalizedActivities,
      routeConfig
    }
  };
}

function snapshotPlan() {
  return {
    equipment: clone(state.equipment),
    activities: clone(state.activities),
    selectionId: state.selectionId
  };
}

function pushHistoryEntry(snapshot, label) {
  historyPast.push({ ...snapshot, label });
  if (historyPast.length > MAX_HISTORY) historyPast.shift();
  historyFuture = [];
  updateHistoryButtons();
}

function commitPlanEdit(label, mutator) {
  const before = snapshotPlan();
  mutator();
  pushHistoryEntry(before, label);
  refreshPlanUI({ save: true });
}

function undo() {
  const entry = historyPast.pop();
  if (!entry) return;
  historyFuture.push({ ...snapshotPlan(), label: entry.label });
  state.equipment = clone(entry.equipment);
  state.activities = clone(entry.activities);
  state.selectionId = state.equipment.some((object) => object.id === entry.selectionId)
    ? entry.selectionId
    : firstFacilityId();
  state.routeConfig.targetId = state.selectionId;
  refreshPlanUI({ save: true });
  toast(`${entry.label} undone`);
}

function redo() {
  const entry = historyFuture.pop();
  if (!entry) return;
  historyPast.push({ ...snapshotPlan(), label: entry.label });
  state.equipment = clone(entry.equipment);
  state.activities = clone(entry.activities);
  state.selectionId = state.equipment.some((object) => object.id === entry.selectionId)
    ? entry.selectionId
    : firstFacilityId();
  state.routeConfig.targetId = state.selectionId;
  refreshPlanUI({ save: true });
  toast(`${entry.label} redone`);
}

function updateHistoryButtons() {
  dom.undoBtn.disabled = historyPast.length === 0;
  dom.redoBtn.disabled = historyFuture.length === 0;
  dom.undoBtn.title = historyPast.length
    ? `Undo ${historyPast[historyPast.length - 1].label} (Ctrl+Z)`
    : 'Nothing to undo';
  dom.redoBtn.title = historyFuture.length
    ? `Redo ${historyFuture[historyFuture.length - 1].label} (Ctrl+Shift+Z)`
    : 'Nothing to redo';
}

function refreshPlanUI({ save = false } = {}) {
  syncRouteControls();
  if (state.selectionId && !findEquipment(state.selectionId)) {
    state.selectionId = firstFacilityId();
  }
  const pairs = overlapPairs(state.equipment);
  state.overlapIds = new Set(pairs.flatMap(([a, b]) => [a.id, b.id]));
  state.routeConfig.targetId = state.selectionId;

  scene?.renderEquipment(state.equipment, state.selectionId, state.overlapIds);
  recomputeRoute();
  scheduleIssues = computeScheduleIssues();
  warnings = collectWarnings(pairs);
  renderEquipmentList();
  renderInspector();
  renderRoutePanel();
  renderSchedule();
  renderIssues();
  updateCounts();
  updateHistoryButtons();
  if (save) savePlan();
}

function syncRouteControls() {
  if (!dom.routeStartSelect) return;
  dom.routeStartSelect.value = state.routeConfig.start;
  document.querySelectorAll('input[name="accessMode"]').forEach((input) => {
    input.checked = input.value === state.routeConfig.mode;
  });
}

function refreshSelectionUI({ save = true, zoom = false } = {}) {
  state.routeConfig.targetId = state.selectionId;
  scene?.setSelected(state.selectionId);
  scheduleIssues = computeScheduleIssues();
  recomputeRoute();
  warnings = collectWarnings(overlapPairs(state.equipment));
  renderEquipmentList();
  renderInspector();
  renderRoutePanel();
  renderIssues();
  updateCounts();
  if (zoom && state.selectionId) {
    const object = findEquipment(state.selectionId);
    if (object) scene?.zoomToObject(object);
  }
  if (save) savePlan();
}

function selectObject(id, { zoom = false, fromWarning = false } = {}) {
  if (id && !findEquipment(id)) return;
  state.selectionId = id;
  refreshSelectionUI({ save: true, zoom });
  if (fromWarning && window.matchMedia('(max-width: 1120px)').matches) {
    switchMobilePanel('equipment');
    requestAnimationFrame(() => document.getElementById('inspectorTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

function recomputeRoute() {
  state.routeConfig.targetId = state.selectionId;
  state.route = computeRoute({
    equipment: state.equipment,
    start: state.routeConfig.start,
    mode: state.routeConfig.mode,
    targetId: state.routeConfig.targetId
  });
  scene?.setRoute(state.route);
}

function renderEquipmentList() {
  dom.equipmentCount.textContent = String(state.equipment.length);
  if (!state.equipment.length) {
    dom.equipmentList.innerHTML = '<div class="empty-state">No equipment placed yet. Add an item from the library.</div>';
    return;
  }
  dom.equipmentList.innerHTML = state.equipment
    .map((object) => {
      const type = EQUIPMENT_TYPES[object.type];
      const selected = object.id === state.selectionId;
      const overlap = state.overlapIds.has(object.id);
      const badges = [
        overlap ? '<span class="mini-badge overlap">Overlap</span>' : '',
        object.fixed ? '<span class="mini-badge fixed">Fixed</span>' : ''
      ]
        .filter(Boolean)
        .join('');
      return `
        <button
          type="button"
          class="equipment-row${selected ? ' is-selected' : ''}${overlap ? ' has-overlap' : ''}"
          role="option"
          aria-selected="${selected}"
          data-equipment-id="${escapeHtml(object.id)}"
          aria-label="${escapeHtml(`${object.name}, ${itemLabel(object)}, ${formatDimensions(object)}${overlap ? ', footprint overlap' : ''}${object.fixed ? ', fixed facility' : ''}`)}"
          style="--row-color:${escapeHtml(type?.color || '#3e7e68')}"
        >
          <span class="equipment-swatch" aria-hidden="true">${escapeHtml(typeAbbreviation(object.type))}</span>
          <span class="equipment-main">
            <span class="equipment-name">${escapeHtml(object.name)}${selected ? ' · Selected' : ''}</span>
            <span class="equipment-subline">${escapeHtml(itemLabel(object))} · ${escapeHtml(formatDimensions(object))}</span>
          </span>
          <span class="equipment-badges">${badges || '<span class="mini-badge">Ready</span>'}</span>
        </button>
      `;
    })
    .join('');
}

function typeAbbreviation(type) {
  return (
    {
      stage: 'ST',
      'food-stall': 'FD',
      seating: 'SE',
      'info-desk': 'IN',
      barrier: '!',
      restroom: 'WC'
    }[type] || 'EQ'
  );
}

function renderInspector() {
  const object = findEquipment(state.selectionId);
  dom.selectionModeBadge.hidden = !object;
  dom.zoomSelectionBtn.disabled = !object;
  if (!object) {
    dom.inspectorContent.innerHTML = `
      <div class="inspector-empty">
        <strong>Select equipment to edit it</strong>
        <span>Choose an item in the list or on the 3D site. Drag to move, or use position and rotation fields for exact placement.</span>
      </div>
    `;
    return;
  }
  const overlapping = state.overlapIds.has(object.id);
  const fixed = Boolean(object.fixed);
  dom.inspectorContent.innerHTML = `
    <div class="selected-summary">
      <div>
        <h3>${escapeHtml(object.name)}</h3>
        <p>${escapeHtml(itemLabel(object))}${fixed ? ' · fixed park facility' : ''}${isScheduleable(object) ? ` · capacity ${object.capacity}` : ''}</p>
      </div>
      <span class="dimension-chip">${escapeHtml(formatDimensions(object))}</span>
    </div>
    ${overlapping ? '<p class="form-hint warning"><strong>Footprint overlap:</strong> this object intersects another placed footprint. Move it before treating the layout as resolved.</p>' : ''}
    <div class="numeric-grid">
      <label class="field">Position X (m)
        <input type="number" inputmode="decimal" step="0.1" data-property="x" value="${object.x.toFixed(1)}" ${fixed ? 'disabled' : ''} />
      </label>
      <label class="field">Position Z (m)
        <input type="number" inputmode="decimal" step="0.1" data-property="z" value="${object.z.toFixed(1)}" ${fixed ? 'disabled' : ''} />
      </label>
      <label class="field rotation-field">Rotation (degrees)
        <span class="rotation-control">
          <button class="rotate-button" type="button" data-rotate="-15" aria-label="Rotate ${escapeHtml(object.name)} 15 degrees counter-clockwise" ${fixed ? 'disabled' : ''}>−15°</button>
          <input type="number" inputmode="numeric" step="1" data-property="rotation" value="${object.rotation.toFixed(1)}" ${fixed ? 'disabled' : ''} />
          <button class="rotate-button" type="button" data-rotate="15" aria-label="Rotate ${escapeHtml(object.name)} 15 degrees clockwise" ${fixed ? 'disabled' : ''}>+15°</button>
        </span>
      </label>
    </div>
    ${
      fixed
        ? `<div class="fixed-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" /></svg><span>This accessible restroom is part of the fixed park and cannot be moved or deleted. It can still be used as a route destination.</span></div>`
        : `<div class="property-actions">
            <button type="button" data-action="duplicate" aria-label="Duplicate ${escapeHtml(object.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M5 16H4V4h12v1" /></svg><span>Duplicate</span></button>
            <button type="button" data-action="rotate90" aria-label="Rotate ${escapeHtml(object.name)} 90 degrees"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16v12H4zM12 12v4M9 13l3-3 3 3" /></svg><span>Rotate 90°</span></button>
            <button class="delete-object-button" type="button" data-action="delete" aria-label="Delete ${escapeHtml(object.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg><span>Delete</span></button>
          </div>`
    }
  `;
}

function updateInspectorLivePositions(object) {
  const xInput = dom.inspectorContent.querySelector('[data-property="x"]');
  const zInput = dom.inspectorContent.querySelector('[data-property="z"]');
  const rotationInput = dom.inspectorContent.querySelector('[data-property="rotation"]');
  if (xInput && document.activeElement !== xInput) xInput.value = Number(object.x).toFixed(1);
  if (zInput && document.activeElement !== zInput) zInput.value = Number(object.z).toFixed(1);
  if (rotationInput && document.activeElement !== rotationInput) rotationInput.value = Number(object.rotation).toFixed(1);
}

function beginObjectDrag(id) {
  draggedObjectId = id;
  dragSnapshot = snapshotPlan();
}

function moveObjectDuringDrag(id, x, z) {
  const object = findEquipment(id);
  if (!object || object.fixed) return null;
  const confined = confineToPark({ ...object, x, z });
  object.x = confined.x;
  object.z = confined.z;
  state.overlapIds = new Set(overlapPairs(state.equipment).flatMap(([a, b]) => [a.id, b.id]));
  scene?.setOverlapIds(state.overlapIds);
  updateInspectorLivePositions(object);
  return { x: object.x, z: object.z };
}

function finishObjectDrag(id, moved) {
  if (moved && dragSnapshot) {
    pushHistoryEntry(dragSnapshot, `Move ${findEquipment(id)?.name || 'equipment'}`);
    refreshPlanUI({ save: true });
  }
  dragSnapshot = null;
  draggedObjectId = null;
}

function findOpenPosition(type) {
  const definition = equipmentDefaults(type);
  const width = definition.width;
  const depth = definition.depth;
  const candidates = [];
  for (let z = -18; z <= 18; z += 2) {
    for (let x = -30; x <= 30; x += 2) {
      candidates.push({ x, z, distance: Math.hypot(x - 0, z - 3) });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates) {
    const test = { x: candidate.x, z: candidate.z, width, depth, rotation: 0 };
    if (isOutsidePark(test)) continue;
    if (state.equipment.some((object) => objectsIntersect(test, object))) continue;
    const half = Math.max(width, depth) / 2;
    if (PARK.trees.some((tree) => Math.hypot(candidate.x - tree.x, candidate.z - tree.z) < tree.r + half + 0.5)) {
      continue;
    }
    return { x: candidate.x, z: candidate.z };
  }
  return { x: 0, z: 3 };
}

function objectsIntersect(a, b) {
  return overlapPairs([
    { id: 'candidate', name: 'candidate', type: 'food-stall', capacity: 0, ...a },
    b
  ]).length > 0;
}

function nextEquipmentName(type) {
  const definition = equipmentDefaults(type);
  const count = state.equipment.filter((object) => object.type === type).length;
  return count === 0 ? definition.defaultName : `${definition.defaultName} ${count + 1}`;
}

function addEquipment(type) {
  const definition = equipmentDefaults(type);
  if (!definition || type === 'restroom') return;
  const position = findOpenPosition(type);
  const object = {
    id: createId('eq'),
    type,
    name: nextEquipmentName(type),
    x: position.x,
    z: position.z,
    rotation: 0,
    width: definition.width,
    depth: definition.depth,
    capacity: definition.capacity,
    fixed: Boolean(definition.fixed)
  };
  commitPlanEdit(`Add ${object.name}`, () => {
    state.equipment.push(object);
    state.selectionId = object.id;
    state.routeConfig.targetId = object.id;
  });
  toast(`${object.name} added and selected.`);
}

function duplicateSelected() {
  const source = findEquipment(state.selectionId);
  if (!source || source.fixed) return;
  const position = findOpenPosition(source.type);
  const copy = {
    ...clone(source),
    id: createId('eq'),
    name: `${source.name} copy`,
    x: position.x,
    z: position.z
  };
  commitPlanEdit(`Duplicate ${source.name}`, () => {
    state.equipment.push(copy);
    state.selectionId = copy.id;
    state.routeConfig.targetId = copy.id;
  });
  toast(`${copy.name} added and selected.`);
}

function rotateSelected(degrees) {
  const object = findEquipment(state.selectionId);
  if (!object || object.fixed) return;
  const rotation = normalizeRotation(object.rotation + degrees);
  const confined = confineToPark({ ...object, rotation });
  commitPlanEdit(`Rotate ${object.name}`, () => {
    object.rotation = confined.rotation;
    object.x = confined.x;
    object.z = confined.z;
  });
}

function updateNumericProperty(property, rawValue) {
  const object = findEquipment(state.selectionId);
  if (!object || object.fixed) return;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    renderInspector();
    return;
  }
  if (property === 'rotation') {
    const confined = confineToPark({ ...object, rotation: normalizeRotation(value) });
    commitPlanEdit(`Change rotation of ${object.name}`, () => {
      object.rotation = confined.rotation;
      object.x = confined.x;
      object.z = confined.z;
    });
    return;
  }
  const candidate = { ...object, [property]: value };
  const confined = confineToPark(candidate);
  if (Math.abs(confined.x - object.x) > 0.001 || Math.abs(confined.z - object.z) > 0.001) {
    toast('Position adjusted so the full footprint stays inside the park.');
  }
  commitPlanEdit(`Move ${object.name}`, () => {
    object.x = confined.x;
    object.z = confined.z;
  });
}

function requestDeleteSelected() {
  const object = findEquipment(state.selectionId);
  if (!object) return;
  if (object.fixed) {
    toast('The accessible restroom is fixed and cannot be deleted.', { warning: true });
    return;
  }
  const bookings = state.activities.filter((activity) => activity.facilityId === object.id);
  if (bookings.length) {
    deleteTargetId = object.id;
    dom.deleteFacilityMessage.innerHTML = `<strong>${escapeHtml(object.name)}</strong> has ${bookings.length} booking${bookings.length === 1 ? '' : 's'} in the schedule. If you delete it, those activities must be removed too.`;
    dom.deleteFacilityDialog.showModal();
    return;
  }
  removeEquipmentById(object.id, false);
}

function removeEquipmentById(id, removeBookings) {
  const object = findEquipment(id);
  if (!object) return;
  let removedBookings = 0;
  commitPlanEdit(`Delete ${object.name}`, () => {
    if (removeBookings) {
      const before = state.activities.length;
      state.activities = state.activities.filter((activity) => activity.facilityId !== id);
      removedBookings = before - state.activities.length;
    } else {
      state.activities = state.activities.filter((activity) => activity.facilityId !== id);
    }
    state.equipment = state.equipment.filter((item) => item.id !== id);
    state.selectionId = firstFacilityId();
    state.routeConfig.targetId = state.selectionId;
  });
  toast(
    removedBookings
      ? `${object.name} deleted; ${removedBookings} booking${removedBookings === 1 ? '' : 's'} removed.`
      : `${object.name} deleted.`
  );
}

function confirmDeleteFacility() {
  if (!deleteTargetId) return;
  const id = deleteTargetId;
  deleteTargetId = null;
  dom.deleteFacilityDialog.close();
  removeEquipmentById(id, true);
}

function computeScheduleIssues() {
  const issues = [];
  const activities = [...state.activities].sort((a, b) => (minutesFromTime(a.start) || 0) - (minutesFromTime(b.start) || 0));
  const facilities = new Map(state.equipment.map((object) => [object.id, object]));
  for (let i = 0; i < activities.length; i += 1) {
    const activity = activities[i];
    const facility = facilities.get(activity.facilityId);
    if (!facility) continue;
    if (facility.capacity > 0 && activity.attendance > facility.capacity) {
      issues.push({
        key: `capacity-${activity.id}`,
        kind: 'capacity',
        title: 'Attendance exceeds capacity',
        detail: `${activity.title} expects ${activity.attendance}; ${facility.name} holds ${facility.capacity}.`,
        objectIds: [facility.id],
        activityIds: [activity.id]
      });
    }
    for (let j = i + 1; j < activities.length; j += 1) {
      const other = activities[j];
      if (other.facilityId !== activity.facilityId) continue;
      const startA = minutesFromTime(activity.start);
      const endA = minutesFromTime(activity.end);
      const startB = minutesFromTime(other.start);
      const endB = minutesFromTime(other.end);
      if ([startA, endA, startB, endB].some((value) => value === null)) continue;
      if (startA < endB && startB < endA) {
        issues.push({
          key: `overlap-${activity.id}-${other.id}`,
          kind: 'schedule-overlap',
          title: 'Overlapping facility bookings',
          detail: `${activity.title} (${activity.start}–${activity.end}) overlaps ${other.title} (${other.start}–${other.end}) at ${facility.name}.`,
          objectIds: [facility.id],
          activityIds: [activity.id, other.id]
        });
      }
    }
  }
  return issues;
}

function collectWarnings(pairs = overlapPairs(state.equipment)) {
  const issues = [];
  if (state.route?.status === 'no-route' && state.route.targetId) {
    issues.push({
      key: `route-${state.route.targetId}-${state.route.startId}-${state.route.mode}`,
      kind: 'route',
      title: 'No walking route',
      detail: state.route.reason,
      objectIds: [state.route.targetId]
    });
  }
  for (const [a, b] of pairs) {
    issues.push({
      key: `overlap-${a.id}-${b.id}`,
      kind: 'overlap',
      title: 'Equipment footprint overlap',
      detail: `${a.name} intersects ${b.name}. Separate their footprint outlines.`,
      objectIds: [a.id, b.id]
    });
  }
  issues.push(...scheduleIssues);
  return issues;
}

function renderRoutePanel() {
  const route = state.route;
  const selected = findEquipment(state.selectionId);
  const stepFree = state.routeConfig.mode === 'step-free';
  if (!selected) {
    dom.routeResult.innerHTML = `
      <div class="route-empty">
        <span class="route-result-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        <div class="route-result-copy"><strong>Select a facility</strong><p>Choose a stage, seating area, information desk, food stall, or the accessible restroom to calculate a route.</p></div>
      </div>
    `;
    return;
  }
  if (!route || route.status !== 'ok') {
    const reason = route?.reason || 'No route could be calculated for this selection.';
    dom.routeResult.innerHTML = `
      <div class="route-no-route" role="alert">
        <span class="route-result-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 17h.01M4 20 12 4l8 16H4Z" /></svg></span>
        <div class="route-result-copy">
          <strong>No route to ${escapeHtml(selected.name)}</strong>
          <p>${escapeHtml(reason)}</p>
          <div class="shortcut-state ${stepFree ? 'unavailable' : 'available'}"><span class="dot"></span>${stepFree ? 'Step-free mode · stepped shortcut unavailable' : 'Pedestrian mode · stepped shortcut available'}</div>
        </div>
      </div>
    `;
    return;
  }
  dom.routeResult.innerHTML = `
    <div class="route-success" role="status">
      <div class="route-result-copy">
        <div class="route-status-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>Route available</div>
        <div class="route-destination">${escapeHtml(route.entranceName)} → ${escapeHtml(route.targetName)}</div>
        <div class="route-reason">${escapeHtml(route.reason)}</div>
        <div class="shortcut-state ${stepFree ? 'unavailable' : 'available'}"><span class="dot"></span>${stepFree ? 'Step-free · stepped shortcut removed' : 'Pedestrian · stepped shortcut permitted'}</div>
      </div>
      <div class="route-distance">${route.distance.toFixed(1)} m<small>walking</small></div>
    </div>
  `;
  updateCounts();
}

function renderIssues() {
  const count = warnings.length;
  dom.issuesCount.textContent = String(count);
  dom.mobileIssueCount.textContent = String(count);
  dom.sceneIssuesText.textContent = count ? `${count} warning${count === 1 ? '' : 's'}` : 'No warnings';
  dom.sceneIssuesBtn.classList.toggle('no-warnings', count === 0);
  if (!count) {
    dom.issuesList.innerHTML = `
      <div class="issues-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg><span>No unresolved placement, route, or schedule warnings.</span></div>
    `;
    updateCounts();
    return;
  }
  const typeIcon = { route: 'R', overlap: '!', capacity: 'C', 'schedule-overlap': 'S' };
  dom.issuesList.innerHTML = warnings
    .map(
      (warning, index) => `
        <button type="button" class="issue-row" data-warning-index="${index}" aria-label="${escapeHtml(`${warning.title}. ${warning.detail}. Select related object.`)}">
          <span class="issue-type-icon" aria-hidden="true">${typeIcon[warning.kind] || '!'}</span>
          <span class="issue-copy"><strong>${escapeHtml(warning.title)}</strong><span>${escapeHtml(warning.detail)}</span></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      `
    )
    .join('');
  updateCounts();
}

function updateCounts() {
  const count = warnings.length;
  dom.sceneIssuesText.textContent = count ? `${count} warning${count === 1 ? '' : 's'}` : 'No warnings';
  dom.sceneIssuesBtn.setAttribute(
    'aria-label',
    count
      ? `Open plan warnings. ${count} unresolved warning${count === 1 ? '' : 's'}.`
      : 'Open plan warnings. No unresolved warnings.'
  );
  dom.mobileIssueCount.textContent = String(count);
  dom.issuesCount.textContent = String(count);
  dom.sceneIssuesBtn.classList.toggle('no-warnings', count === 0);
}

function renderSchedule() {
  const facilities = new Map(state.equipment.map((object) => [object.id, object]));
  const sorted = [...state.activities].sort((a, b) => (minutesFromTime(a.start) || 0) - (minutesFromTime(b.start) || 0));
  dom.scheduleCount.textContent = `${sorted.length} activit${sorted.length === 1 ? 'y' : 'ies'}`;
  dom.scheduleWarningCount.textContent = `${scheduleIssues.length} scheduling issue${scheduleIssues.length === 1 ? '' : 's'}`;

  if (!sorted.length) {
    dom.scheduleList.innerHTML = '<div class="empty-state">No activities booked. Add one to the stage or a seating area.</div>';
    return;
  }
  const flaggedActivities = new Map();
  for (const issue of scheduleIssues) {
    for (const activityId of issue.activityIds || []) {
      const set = flaggedActivities.get(activityId) || new Set();
      set.add(issue.kind);
      flaggedActivities.set(activityId, set);
    }
  }
  dom.scheduleList.innerHTML = sorted
    .map((activity) => {
      const facility = facilities.get(activity.facilityId);
      const flags = flaggedActivities.get(activity.id) || new Set();
      const overlap = flags.has('schedule-overlap');
      const capacity = flags.has('capacity');
      const facilityColor = facility ? EQUIPMENT_TYPES[facility.type]?.color || '#247e73' : '#247e73';
      return `
        <button
          type="button"
          class="schedule-row${overlap || capacity ? ' has-warning' : ''}"
          data-activity-id="${escapeHtml(activity.id)}"
          aria-label="${escapeHtml(`Edit ${activity.title}, ${activity.start} to ${activity.end}, ${facility?.name || 'unknown facility'}, ${activity.attendance} expected${overlap ? ', overlapping booking' : ''}${capacity ? ', over capacity' : ''}`)}"
          style="--facility-color:${escapeHtml(facilityColor)}"
        >
          <span class="schedule-time">${escapeHtml(activity.start)}<span>to ${escapeHtml(activity.end)}</span></span>
          <span class="schedule-copy"><strong>${escapeHtml(activity.title)}</strong><span>${escapeHtml(facility?.name || 'Missing facility')} · ${activity.attendance} expected</span></span>
          <span class="schedule-flags">
            ${overlap ? '<span class="schedule-flag">Overlap</span>' : ''}
            ${capacity ? '<span class="schedule-flag capacity">Over cap.</span>' : ''}
            ${!overlap && !capacity ? '<span class="schedule-flag touch">Edit</span>' : ''}
          </span>
        </button>
      `;
    })
    .join('');
}

function openActivityDialog(activityId = null) {
  const scheduleable = state.equipment.filter((object) => isScheduleable(object));
  if (!scheduleable.length) {
    toast('Add a stage or seating area before booking an activity.', { warning: true });
    return;
  }
  const activity = activityId ? state.activities.find((item) => item.id === activityId) : null;
  activityEditingId = activity?.id || null;
  dom.activityDialogTitle.textContent = activity ? 'Edit activity' : 'Add activity';
  dom.activityError.hidden = true;
  dom.activityId.value = activity?.id || '';
  dom.activityFacility.innerHTML = scheduleable
    .map((object) => `<option value="${escapeHtml(object.id)}">${escapeHtml(object.name)} · capacity ${object.capacity}</option>`)
    .join('');

  let defaultFacility = scheduleable.find((object) => object.id === state.selectionId) || scheduleable[0];
  let defaultStart = '10:00';
  let defaultEnd = '11:00';
  if (!activity && state.activities.length) {
    const latest = [...state.activities].sort((a, b) => (minutesFromTime(b.end) || 0) - (minutesFromTime(a.end) || 0))[0];
    const latestEnd = minutesFromTime(latest.end);
    if (latestEnd !== null && latestEnd + 60 <= 22 * 60) {
      defaultStart = minutesToTime(latestEnd + 15);
      defaultEnd = minutesToTime(latestEnd + 75);
    }
  }
  dom.activityTitle.value = activity?.title || '';
  dom.activityFacility.value = activity?.facilityId && scheduleable.some((object) => object.id === activity.facilityId)
    ? activity.facilityId
    : defaultFacility.id;
  dom.activityStart.value = activity?.start || defaultStart;
  dom.activityEnd.value = activity?.end || defaultEnd;
  dom.activityAttendance.value = activity?.attendance ?? Math.min(40, defaultFacility.capacity || 40);
  updateActivityHints();
  dom.activityDialog.showModal();
  requestAnimationFrame(() => dom.activityTitle.focus());
}

function minutesToTime(totalMinutes) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function updateActivityHints() {
  const facility = findEquipment(dom.activityFacility.value);
  const attendance = Number(dom.activityAttendance.value);
  const capacity = facility?.capacity || 0;
  dom.activityCapacityHint.textContent = facility
    ? `Assigned capacity: ${capacity} people.${Number.isFinite(attendance) && attendance > capacity ? ` Expected attendance is ${attendance - capacity} over capacity.` : ''}`
    : 'Choose a stage or seating area.';

  const start = minutesFromTime(dom.activityStart.value);
  const end = minutesFromTime(dom.activityEnd.value);
  const hints = [];
  if (start !== null && end !== null && end <= start) {
    hints.push('End time must be after the start time.');
  } else if (facility && start !== null && end !== null) {
    const conflict = state.activities.find((activity) => {
      if (activity.id === activityEditingId || activity.facilityId !== facility.id) return false;
      const otherStart = minutesFromTime(activity.start);
      const otherEnd = minutesFromTime(activity.end);
      return otherStart !== null && otherEnd !== null && start < otherEnd && otherStart < end;
    });
    if (conflict) hints.push(`Warns: overlaps “${conflict.title}” (${conflict.start}–${conflict.end}) at the same facility.`);
  }
  if (Number.isFinite(attendance) && attendance > capacity) {
    hints.push(`Warns: expected attendance exceeds capacity by ${attendance - capacity}.`);
  }
  dom.formOverlapHint.textContent = hints.join(' ');
  dom.formOverlapHint.classList.toggle('warning', hints.length > 0);
}

function submitActivity(event) {
  event.preventDefault();
  const title = dom.activityTitle.value.trim();
  const facility = findEquipment(dom.activityFacility.value);
  const start = dom.activityStart.value;
  const end = dom.activityEnd.value;
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  const attendance = Number(dom.activityAttendance.value);
  const errors = [];
  if (!title) errors.push('Enter an activity title.');
  if (!facility || !isScheduleable(facility)) errors.push('Choose a stage or seating area.');
  if (startMinutes === null || endMinutes === null) errors.push('Enter valid start and end times.');
  if (startMinutes !== null && endMinutes !== null && endMinutes < startMinutes) {
    errors.push('End time cannot be before the start time.');
  } else if (startMinutes !== null && endMinutes !== null && endMinutes === startMinutes) {
    errors.push('End time must be after the start time.');
  }
  if (!Number.isInteger(attendance) || attendance < 0) {
    errors.push('Expected attendance must be a whole number of zero or more.');
  }
  if (errors.length) {
    dom.activityError.textContent = errors.join(' ');
    dom.activityError.hidden = false;
    return;
  }

  const isEdit = Boolean(activityEditingId);
  const activity = {
    id: activityEditingId || createId('act'),
    title,
    facilityId: facility.id,
    start,
    end,
    attendance
  };
  commitPlanEdit(isEdit ? 'Update activity' : 'Add activity', () => {
    if (isEdit) {
      const index = state.activities.findIndex((item) => item.id === activityEditingId);
      if (index >= 0) state.activities[index] = activity;
    } else {
      state.activities.push(activity);
    }
    state.selectionId = facility.id;
    state.routeConfig.targetId = facility.id;
  });
  dom.activityDialog.close();
  const warned = scheduleIssues.some((issue) => issue.activityIds?.includes(activity.id));
  toast(warned ? 'Activity saved with scheduling warnings. Review the plan warnings.' : `“${title}” saved.`, {
    warning: warned
  });
}

function addBlockedRouteDemo() {
  const target = findEquipment(state.selectionId);
  if (!target || !isFacility(target)) {
    toast('Select a facility first, then add the blocked-route demo.', { warning: true });
    return;
  }
  const extents = objectHalfExtents(target);
  const barrierDefinition = equipmentDefaults('barrier');
  const baseName = `Blocked-route demo · ${target.name}`;
  const barriers = [
    {
      suffix: 'north',
      x: target.x,
      z: target.z - extents.z - 0.6,
      width: extents.x * 2 + 2.4,
      depth: barrierDefinition.depth
    },
    {
      suffix: 'south',
      x: target.x,
      z: target.z + extents.z + 0.6,
      width: extents.x * 2 + 2.4,
      depth: barrierDefinition.depth
    },
    {
      suffix: 'west',
      x: target.x - extents.x - 0.6,
      z: target.z,
      width: barrierDefinition.depth,
      depth: extents.z * 2
    },
    {
      suffix: 'east',
      x: target.x + extents.x + 0.6,
      z: target.z,
      width: barrierDefinition.depth,
      depth: extents.z * 2
    }
  ].map((barrier) =>
    confineToPark({
      id: createId('eq-demo'),
      type: 'barrier',
      name: `${baseName} · ${barrier.suffix}`,
      x: barrier.x,
      z: barrier.z,
      rotation: 0,
      width: barrier.width,
      depth: barrier.depth,
      capacity: 0,
      fixed: false
    })
  );
  commitPlanEdit('Add blocked-route demo barriers', () => {
    state.equipment.push(...barriers);
    state.selectionId = target.id;
    state.routeConfig.targetId = target.id;
  });
  if (state.route?.status === 'no-route') {
    toast('Demo barriers added. The blocked route warning is now shown in Plan warnings.', { warning: true });
  } else {
    toast('Demo barriers added. Review the route and placement warnings.', { warning: true });
  }
}

function savePlan({ manual = false } = {}) {
  try {
    const plan = serializePlan();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    lastSavedAt = new Date();
    updateSavedStatus();
    if (manual) toast('Plan saved in this browser.');
    return true;
  } catch (error) {
    console.error(error);
    toast('Could not save the plan in this browser. Export a JSON copy instead.', { warning: true });
    return false;
  }
}

function serializePlan() {
  return {
    schema: 'meadowline-festival-plan',
    version: 1,
    parkId: PARK.id,
    savedAt: new Date().toISOString(),
    equipment: clone(state.equipment),
    activities: clone(state.activities),
    routeConfig: {
      start: state.routeConfig.start,
      mode: state.routeConfig.mode,
      targetId: findEquipment(state.routeConfig.targetId) && isFacility(findEquipment(state.routeConfig.targetId))
        ? state.routeConfig.targetId
        : null
    },
    routeSnapshot: state.route
      ? {
          status: state.route.status,
          distance: state.route.distance,
          startId: state.route.startId,
          mode: state.route.mode,
          targetId: state.route.targetId,
          reason: state.route.reason,
          path: state.route.path
        }
      : null
  };
}

function updateSavedStatus() {
  if (!lastSavedAt) {
    dom.savedStatus.textContent = 'Not saved yet';
    return;
  }
  dom.savedStatus.textContent = `Saved locally · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function exportPlan() {
  savePlan();
  const plan = serializePlan();
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `meadowline-festival-plan-${date}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Plan exported as JSON.');
}

async function importPlanFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error('The file is not valid JSON.');
    }
    const validation = validatePlan(parsed);
    if (validation.errors.length) {
      showImportErrors(validation.errors);
      return;
    }
    const before = snapshotPlan();
    const imported = validation.plan;
    state.equipment = clone(imported.equipment);
    state.activities = clone(imported.activities);
    state.routeConfig = {
      start: imported.routeConfig.start,
      mode: imported.routeConfig.mode,
      targetId: resolveInitialSelection(imported)
    };
    state.selectionId = state.routeConfig.targetId;
    pushHistoryEntry(before, 'Import plan');
    refreshPlanUI({ save: true });
    setCameraMode(cameraMode);
    toast(`Plan imported: ${state.equipment.length} equipment items and ${state.activities.length} activities.`);
  } catch (error) {
    showImportErrors([error.message || 'The plan could not be imported.']);
  } finally {
    dom.importInput.value = '';
  }
}

function showImportErrors(errors) {
  dom.importErrorList.innerHTML = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('');
  if (!dom.importErrorDialog.open) dom.importErrorDialog.showModal();
}

function resetToSample() {
  const plan = createSamplePlan();
  state.equipment = clone(plan.equipment);
  state.activities = clone(plan.activities);
  state.routeConfig = { ...plan.routeConfig };
  state.selectionId = resolveInitialSelection(plan);
  historyPast = [];
  historyFuture = [];
  dragSnapshot = null;
  scene?.resetCamera();
  setCameraMode('orbit');
  refreshPlanUI({ save: true });
  dom.resetDialog.close();
  toast('Sample park restored.');
}

function setCameraMode(mode) {
  cameraMode = mode === 'top' ? 'top' : 'orbit';
  scene?.setCameraMode(cameraMode);
  dom.orbitViewBtn.classList.toggle('active', cameraMode === 'orbit');
  dom.topViewBtn.classList.toggle('active', cameraMode === 'top');
  dom.orbitViewBtn.setAttribute('aria-pressed', String(cameraMode === 'orbit'));
  dom.topViewBtn.setAttribute('aria-pressed', String(cameraMode === 'top'));
  dom.sceneModeLabel.textContent = cameraMode === 'top' ? 'Top-down view' : 'Orbit view';
}

function setSnap(enabled) {
  snapEnabled = Boolean(enabled);
  scene?.setSnap(snapEnabled);
  dom.snapBtn.classList.toggle('active', snapEnabled);
  dom.snapBtn.setAttribute('aria-pressed', String(snapEnabled));
  toast(snapEnabled ? 'Grid snapping on: dragged objects snap to 1 m.' : 'Grid snapping off.');
}

function switchMobilePanel(panel) {
  const allowed = ['equipment', 'access', 'schedule', 'issues'];
  if (!allowed.includes(panel)) return;
  dom.workspace.dataset.mobilePanel = panel;
  document.querySelectorAll('[data-mobile-tab]').forEach((button) => {
    const active = button.dataset.mobileTab === panel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function focusWarning(index) {
  const warning = warnings[index];
  if (!warning) return;
  const objectId = warning.objectIds.find((id) => findEquipment(id)) || null;
  if (objectId) selectObject(objectId, { zoom: true, fromWarning: true });
}

function renderPrintSummary() {
  const route = state.route;
  const selected = findEquipment(state.selectionId);
  const equipmentRows = state.equipment
    .map(
      (object) => `
        <tr>
          <td>${escapeHtml(object.id)}</td>
          <td>${escapeHtml(object.name)}</td>
          <td>${escapeHtml(itemLabel(object))}</td>
          <td>${object.x.toFixed(1)}, ${object.z.toFixed(1)}</td>
          <td>${object.rotation.toFixed(1)}°</td>
          <td>${escapeHtml(formatDimensions(object))}</td>
          <td>${object.fixed ? 'Fixed' : 'Movable'}</td>
        </tr>
      `
    )
    .join('');
  const activityRows = [...state.activities]
    .sort((a, b) => (minutesFromTime(a.start) || 0) - (minutesFromTime(b.start) || 0))
    .map((activity) => {
      const facility = findEquipment(activity.facilityId);
      return `
        <tr>
          <td>${escapeHtml(activity.start)}–${escapeHtml(activity.end)}</td>
          <td>${escapeHtml(activity.title)}</td>
          <td>${escapeHtml(facility?.name || 'Missing facility')}</td>
          <td>${activity.attendance}</td>
          <td>${facility?.capacity ?? '—'}</td>
        </tr>
      `;
    })
    .join('');
  const warningRows = warnings.length
    ? warnings
        .map(
          (warning) =>
            `<li class="print-warning"><strong>${escapeHtml(warning.title)}:</strong> ${escapeHtml(warning.detail)}</li>`
        )
        .join('')
    : '<li>No unresolved warnings.</li>';
  const routeText = route
    ? route.status === 'ok'
      ? `${route.entranceName} to ${route.targetName} · ${route.distance.toFixed(1)} m · ${route.mode}`
      : `No route to ${route.targetName || selected?.name || 'selected facility'} · ${route.reason}`
    : 'No facility selected.';
  dom.printSummaryContent.innerHTML = `
    <h1>Meadowline Community Park — festival plan summary</h1>
    <p class="print-meta">Printed ${escapeHtml(new Date().toLocaleString())} · Plan ${escapeHtml(new Date(lastSavedAt || Date.now()).toLocaleString())}</p>
    <h2>Site layout</h2>
    <p>${PARK.name} · ${PARK.width} × ${PARK.depth} m · two entrances (West Gate and East Gate) · fixed paths, trees, stepped shortcut, level-access gap, and accessible restroom.</p>
    <p><strong>Selected facility:</strong> ${escapeHtml(selected?.name || 'None')}</p>
    <p><strong>Walking route:</strong> ${escapeHtml(routeText)}</p>
    <p><strong>Walking model:</strong> ${NAVIGATION_MODEL.gridSize} m grid, ${NAVIGATION_MODEL.algorithm}, ${NAVIGATION_MODEL.clearance} m clearance. Stepped shortcut ${route?.mode === 'step-free' ? 'unavailable' : 'available'} in the current mode.</p>
    <h2>Equipment</h2>
    <table>
      <thead><tr><th>Identifier</th><th>Name</th><th>Type</th><th>X, Z (m)</th><th>Rotation</th><th>Footprint</th><th>Placement</th></tr></thead>
      <tbody>${equipmentRows || '<tr><td colspan="7">No equipment.</td></tr>'}</tbody>
    </table>
    <h2>Schedule</h2>
    <table>
      <thead><tr><th>Time</th><th>Activity</th><th>Facility</th><th>Attendance</th><th>Capacity</th></tr></thead>
      <tbody>${activityRows || '<tr><td colspan="5">No activities.</td></tr>'}</tbody>
    </table>
    <h2>Unresolved warnings</h2>
    <ul>${warningRows}</ul>
    <p class="print-disclaimer">Planning demonstration only. This summary and its simplified walking model are not a certified safety assessment and do not establish accessibility compliance.</p>
  `;
}

function printPlan() {
  renderPrintSummary();
  window.print();
}

function toast(message, { warning = false, duration = 3400 } = {}) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.toggle('warning', warning);
  dom.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('visible'), duration);
}

function isTypingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function bindEvents() {
  document.querySelectorAll('[data-add-type]').forEach((button) => {
    button.addEventListener('click', () => addEquipment(button.dataset.addType));
  });

  dom.equipmentList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-equipment-id]');
    if (row) selectObject(row.dataset.equipmentId);
  });

  dom.inspectorContent.addEventListener('change', (event) => {
    const input = event.target.closest('[data-property]');
    if (!input) return;
    updateNumericProperty(input.dataset.property, input.value);
  });

  dom.inspectorContent.addEventListener('click', (event) => {
    const rotate = event.target.closest('[data-rotate]');
    if (rotate) {
      rotateSelected(Number(rotate.dataset.rotate));
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'duplicate') duplicateSelected();
    if (action === 'rotate90') rotateSelected(90);
    if (action === 'delete') requestDeleteSelected();
  });

  dom.routeStartSelect.addEventListener('change', () => {
    state.routeConfig.start = dom.routeStartSelect.value;
    recomputeRoute();
    warnings = collectWarnings();
    renderRoutePanel();
    renderIssues();
    savePlan();
  });

  document.querySelectorAll('input[name="accessMode"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      state.routeConfig.mode = input.value;
      recomputeRoute();
      warnings = collectWarnings();
      renderRoutePanel();
      renderIssues();
      savePlan();
    });
  });

  document.getElementById('demoBlockBtn').addEventListener('click', addBlockedRouteDemo);
  dom.issuesList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-warning-index]');
    if (row) focusWarning(Number(row.dataset.warningIndex));
  });

  document.getElementById('addActivityBtn').addEventListener('click', () => openActivityDialog());
  dom.scheduleList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-activity-id]');
    if (row) openActivityDialog(row.dataset.activityId);
  });
  dom.activityForm.addEventListener('submit', submitActivity);
  dom.activityForm.addEventListener('input', updateActivityHints);
  dom.activityForm.addEventListener('change', updateActivityHints);
  document.getElementById('closeActivityBtn').addEventListener('click', () => dom.activityDialog.close());
  document.getElementById('cancelActivityBtn').addEventListener('click', () => dom.activityDialog.close());
  document.getElementById('cancelDeleteFacilityBtn').addEventListener('click', () => {
    deleteTargetId = null;
    dom.deleteFacilityDialog.close();
  });
  document.getElementById('confirmDeleteFacilityBtn').addEventListener('click', confirmDeleteFacility);

  document.getElementById('resetBtn').addEventListener('click', () => dom.resetDialog.showModal());
  document.getElementById('cancelResetBtn').addEventListener('click', () => dom.resetDialog.close());
  document.getElementById('confirmResetBtn').addEventListener('click', resetToSample);

  document.getElementById('saveBtn').addEventListener('click', () => savePlan({ manual: true }));
  document.getElementById('exportBtn').addEventListener('click', exportPlan);
  document.getElementById('importBtn').addEventListener('click', () => {
    dom.importInput.value = '';
    dom.importInput.click();
  });
  dom.importInput.addEventListener('change', () => importPlanFile(dom.importInput.files?.[0]));
  document.getElementById('closeImportErrorBtn').addEventListener('click', () => dom.importErrorDialog.close());
  document.getElementById('printBtn').addEventListener('click', printPlan);

  dom.undoBtn.addEventListener('click', undo);
  dom.redoBtn.addEventListener('click', redo);

  dom.orbitViewBtn.addEventListener('click', () => setCameraMode('orbit'));
  dom.topViewBtn.addEventListener('click', () => setCameraMode('top'));
  dom.zoomSelectionBtn.addEventListener('click', () => {
    const object = findEquipment(state.selectionId);
    if (object) scene?.zoomToObject(object);
  });
  document.getElementById('resetCameraBtn').addEventListener('click', () => scene?.resetCamera());
  dom.snapBtn.addEventListener('click', () => setSnap(!snapEnabled));

  document.getElementById('modelInfoBtn').addEventListener('click', () => dom.walkingModelDialog.showModal());
  document.getElementById('closeWalkingModelBtn').addEventListener('click', () => dom.walkingModelDialog.close());
  document.getElementById('dismissWalkingModelBtn').addEventListener('click', () => dom.walkingModelDialog.close());

  dom.sceneIssuesBtn.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 1120px)').matches) {
      switchMobilePanel('issues');
      requestAnimationFrame(() => document.getElementById('issuesPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      document.getElementById('issuesPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  document.querySelectorAll('[data-mobile-tab]').forEach((button) => {
    button.addEventListener('click', () => switchMobilePanel(button.dataset.mobileTab));
  });

  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectionId) {
      event.preventDefault();
      requestDeleteSelected();
    }
  });
}

function initialize() {
  scene = new ParkScene(dom.sceneMount, {
    onSelect: (id) => selectObject(id),
    onDragStart: beginObjectDrag,
    onDragMove: moveObjectDuringDrag,
    onDragEnd: finishObjectDrag
  });
  scene.setSnap(snapEnabled);
  scene.setCameraMode(cameraMode);
  dom.routeStartSelect.value = state.routeConfig.start;
  const modeInput = document.querySelector(`input[name="accessMode"][value="${state.routeConfig.mode}"]`);
  if (modeInput) modeInput.checked = true;
  bindEvents();
  refreshPlanUI({ save: false });
  updateSavedStatus();
  savePlan();
  setCameraMode('orbit');
  if (warnings.length) {
    dom.sceneIssuesBtn.setAttribute('aria-label', `Open plan warnings. ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
  }
}

initialize();
