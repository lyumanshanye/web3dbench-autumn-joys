import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DATASET } from './data.js';

const HOUR_MS = 60 * 60 * 1000;
const { meta } = DATASET;
const rooms = DATASET.rooms;
const roomById = new Map(rooms.map((room) => [room.id, room]));
const datasetStartMs = Date.parse(meta.start);
const datasetEndMs = Date.parse(meta.end);
const totalHours = meta.hours;
const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const kindLabels = {
  meeting: 'Meeting room',
  server: 'Server room',
  studio: 'Studio',
  office: 'Office',
  spike: 'Office',
};

const COLOR_STOPS = [
  [0, [41, 75, 92]],
  [0.14, [39, 124, 129]],
  [0.29, [43, 164, 141]],
  [0.45, [114, 187, 97]],
  [0.62, [200, 201, 86]],
  [0.8, [239, 164, 71]],
  [1, [231, 88, 97]],
];

const FLOOR_LAYOUT = [
  ['r-101', 'r-102', 'r-103', 'r-104'],
  ['r-201', 'r-202', 'r-203', 'r-204'],
  ['r-301', 'r-302', 'r-303', 'r-304'],
];
const ROOM_OFFSETS = [
  [-2.18, 1.3],
  [2.18, 1.3],
  [-2.18, -1.3],
  [2.18, -1.3],
];
const FLOOR_BASE = [0, 1.52, 3.04];

const state = {
  startIndex: 120,
  endIndex: 168,
  rangePreset: '48h',
  metric: 'total',
  floor: 'all',
  selectedRoomId: 'r-201',
  compareActive: false,
  compareRoomB: 'r-202',
  sortKey: 'total',
  sortDir: 'desc',
  chartHoverIndex: null,
  hoverRoomId: null,
};

const elements = {
  rangeDescription: document.getElementById('rangeDescription'),
  rangePresets: document.getElementById('rangePresets'),
  customRangeButton: document.getElementById('customRangeButton'),
  metricToggle: document.getElementById('metricToggle'),
  floorFilter: document.getElementById('floorFilter'),
  roomTableBody: document.getElementById('roomTableBody'),
  visibleRoomCount: document.getElementById('visibleRoomCount'),
  downloadCsvButton: document.getElementById('downloadCsvButton'),
  legendMetricLabel: document.getElementById('legendMetricLabel'),
  legendUnit: document.getElementById('legendUnit'),
  legendTicks: document.getElementById('legendTicks'),
  legendLockNote: document.getElementById('legendLockNote'),
  stage: document.getElementById('buildingStage'),
  threeMount: document.getElementById('threeMount'),
  labelMount: document.getElementById('labelMount'),
  stageTooltip: document.getElementById('stageTooltip'),
  resetViewButton: document.getElementById('resetViewButton'),
  focusPanel: document.getElementById('focusPanel'),
  selectionDot: document.getElementById('selectionDot'),
  focusRoomName: document.getElementById('focusRoomName'),
  focusRoomMeta: document.getElementById('focusRoomMeta'),
  clearSelectionButton: document.getElementById('clearSelectionButton'),
  metricTotal: document.getElementById('metricTotal'),
  metricIntensity: document.getElementById('metricIntensity'),
  metricPeak: document.getElementById('metricPeak'),
  metricPeakTime: document.getElementById('metricPeakTime'),
  metricAfterHours: document.getElementById('metricAfterHours'),
  metricAfterHoursNote: document.getElementById('metricAfterHoursNote'),
  completenessRow: document.getElementById('completenessRow'),
  completenessText: document.getElementById('completenessText'),
  completenessPercent: document.getElementById('completenessPercent'),
  insightBanner: document.getElementById('insightBanner'),
  insightTitle: document.getElementById('insightTitle'),
  insightCopy: document.getElementById('insightCopy'),
  chartTitle: document.getElementById('chartTitle'),
  chartSubtitle: document.getElementById('chartSubtitle'),
  chartWrap: document.getElementById('chartWrap'),
  energyChart: document.getElementById('energyChart'),
  chartTooltip: document.getElementById('chartTooltip'),
  chartEmpty: document.getElementById('chartEmpty'),
  chartLegend: document.getElementById('chartLegend'),
  compareButton: document.getElementById('compareButton'),
  compareControls: document.getElementById('compareControls'),
  compareRoomA: document.getElementById('compareRoomA'),
  compareRoomB: document.getElementById('compareRoomB'),
  focusFooterNote: document.getElementById('focusFooterNote'),
  customRangeDialog: document.getElementById('customRangeDialog'),
  customRangeForm: document.getElementById('customRangeForm'),
  customStart: document.getElementById('customStart'),
  customEnd: document.getElementById('customEnd'),
  customRangeError: document.getElementById('customRangeError'),
  infoDialog: document.getElementById('infoDialog'),
  datasetInfoButton: document.getElementById('datasetInfoButton'),
  helpButton: document.getElementById('helpButton'),
  toast: document.getElementById('toast'),
};

let allSummaries = new Map();
let colorDomainMax = 1;
let chartModel = null;
let toastTimer = null;
let sceneApi = null;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatHourLabel(ms) {
  const date = new Date(ms);
  return `${pad(date.getUTCHours())}:00`;
}

function formatDayHour(ms) {
  const date = new Date(ms);
  return `${dayShort[date.getUTCDay()]} ${date.getUTCDate()} ${monthShort[date.getUTCMonth()]} · ${pad(date.getUTCHours())}:00`;
}

function formatDateShort(ms) {
  const date = new Date(ms);
  return `${dayShort[date.getUTCDay()]} ${date.getUTCDate()} ${monthShort[date.getUTCMonth()]}`;
}

function formatDateTiny(ms) {
  const date = new Date(ms);
  return `${date.getUTCDate()} ${monthShort[date.getUTCMonth()]}`;
}

function formatDateTimeLocal(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:00`;
}

function parseDateTimeLocal(value) {
  const normalized = value.length === 16 ? `${value}:00Z` : `${value}Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function startMsForIndex(index) {
  return datasetStartMs + index * HOUR_MS;
}

function rangeStartMs() {
  return startMsForIndex(state.startIndex);
}

function rangeEndMs() {
  return startMsForIndex(state.endIndex);
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  if (Math.abs(value) >= 10) return value.toFixed(value % 1 === 0 ? 0 : 1);
  return value.toFixed(1);
}

function interpolateColor(value, max) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let index = 0; index < COLOR_STOPS.length - 1; index += 1) {
    if (ratio >= COLOR_STOPS[index][0] && ratio <= COLOR_STOPS[index + 1][0]) {
      lower = COLOR_STOPS[index];
      upper = COLOR_STOPS[index + 1];
      break;
    }
  }
  const span = upper[0] - lower[0] || 1;
  const local = (ratio - lower[0]) / span;
  const rgb = lower[1].map((channel, index) => Math.round(channel + (upper[1][index] - channel) * local));
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function isVisibleFloor(floor) {
  return state.floor === 'all' || Number(state.floor) === floor;
}

function getVisibleRooms() {
  return rooms.filter((room) => isVisibleFloor(room.floor));
}

function summarizeRoom(room) {
  let total = 0;
  let available = 0;
  let missing = 0;
  let afterHoursEnergy = 0;
  let peak = -Infinity;
  let peakIndex = null;
  let minimum = Infinity;
  const missingIndices = [];

  for (let index = state.startIndex; index < state.endIndex; index += 1) {
    const value = room.readings[index];
    if (value === null) {
      missing += 1;
      missingIndices.push(index);
      continue;
    }
    available += 1;
    total += value;
    minimum = Math.min(minimum, value);
    if (value > peak) {
      peak = value;
      peakIndex = index;
    }
    const date = new Date(startMsForIndex(index));
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const occupied = day >= 1 && day <= 5 && hour >= 8 && hour < 18;
    if (!occupied) afterHoursEnergy += value;
  }

  const expected = state.endIndex - state.startIndex;
  const intensity = total / room.areaM2;
  const completeness = expected > 0 ? (available / expected) * 100 : 0;
  const afterHoursShare = total > 0 ? (afterHoursEnergy / total) * 100 : 0;
  return {
    room,
    total,
    intensity,
    available,
    missing,
    expected,
    completeness,
    partial: missing > 0,
    afterHoursEnergy,
    afterHoursShare,
    peak,
    peakIndex,
    min: minimum === Infinity ? 0 : minimum,
    missingIndices,
  };
}

function refreshSummaries() {
  allSummaries = new Map(rooms.map((room) => [room.id, summarizeRoom(room)]));
  const metricValues = rooms.map((room) => {
    const summary = allSummaries.get(room.id);
    return state.metric === 'total' ? summary.total : summary.intensity;
  });
  colorDomainMax = Math.max(1, ...metricValues);
}

function getSelectedSummary() {
  return state.selectedRoomId ? allSummaries.get(state.selectedRoomId) : null;
}

function getMetricValue(summary) {
  return state.metric === 'total' ? summary.total : summary.intensity;
}

function metricUnit() {
  return state.metric === 'total' ? 'kWh' : 'kWh/m²';
}

function metricLabel() {
  return state.metric === 'total' ? 'Total energy' : 'Energy intensity';
}

function sortedVisibleSummaries() {
  const summaries = getVisibleRooms().map((room) => allSummaries.get(room.id));
  const direction = state.sortDir === 'asc' ? 1 : -1;
  const key = state.sortKey;
  return summaries.sort((a, b) => {
    let left;
    let right;
    if (key === 'name') {
      left = a.room.name.toLowerCase();
      right = b.room.name.toLowerCase();
    } else if (key === 'floor') {
      left = a.room.floor;
      right = b.room.floor;
    } else if (key === 'area') {
      left = a.room.areaM2;
      right = b.room.areaM2;
    } else if (key === 'total') {
      left = a.total;
      right = b.total;
    } else if (key === 'intensity') {
      left = a.intensity;
      right = b.intensity;
    } else if (key === 'afterHours') {
      left = a.afterHoursShare;
      right = b.afterHoursShare;
    } else if (key === 'completeness') {
      left = a.completeness;
      right = b.completeness;
    } else {
      left = a.room.name;
      right = b.room.name;
    }
    if (typeof left === 'string') return left.localeCompare(right) * direction;
    if (left === right) return a.room.id.localeCompare(b.room.id) * direction;
    return (left - right) * direction;
  });
}

function updateRangeDescription() {
  const hours = state.endIndex - state.startIndex;
  const start = formatDayHour(rangeStartMs());
  const end = formatDayHour(rangeEndMs() - HOUR_MS);
  const presetText = state.rangePreset === '24h'
    ? 'Last 24 hours'
    : state.rangePreset === '48h'
      ? 'Last 48 hours'
      : state.rangePreset === '7d'
        ? 'Full sample week'
        : 'Custom range';
  elements.rangeDescription.textContent = `${presetText} · ${start} → ${end} UTC · ${hours} intervals`;
}

function updateRangeButtons() {
  elements.rangePresets.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.range === state.rangePreset);
  });
  elements.customRangeButton.classList.toggle('is-active', state.rangePreset === 'custom');
}

function updateMetricButtons() {
  elements.metricToggle.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.metric === state.metric);
    button.setAttribute('aria-pressed', button.dataset.metric === state.metric ? 'true' : 'false');
  });
}

function updateFloorButtons() {
  elements.floorFilter.querySelectorAll('button').forEach((button) => {
    const active = button.dataset.floor === state.floor;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function renderLegend() {
  elements.legendMetricLabel.textContent = metricLabel();
  elements.legendUnit.textContent = metricUnit();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = colorDomainMax * fraction;
    return state.metric === 'total'
      ? formatCompactNumber(value)
      : (value >= 10 ? value.toFixed(0) : value.toFixed(1));
  });
  elements.legendTicks.innerHTML = ticks.map((tick) => `<span>${tick}</span>`).join('');
  elements.legendLockNote.textContent = `Range fixed across all ${rooms.length} rooms`;
}

function renderTable() {
  const summaries = sortedVisibleSummaries();
  const partialCount = summaries.filter((summary) => summary.partial).length;
  elements.visibleRoomCount.textContent = `${summaries.length} room${summaries.length === 1 ? '' : 's'} shown${partialCount ? ` · ${partialCount} partial` : ''}`;
  elements.roomTableBody.innerHTML = summaries.map((summary) => {
    const room = summary.room;
    const color = interpolateColor(getMetricValue(summary), colorDomainMax);
    const selected = room.id === state.selectedRoomId;
    const partialMark = summary.partial ? '<span class="partial-mark">partial</span>' : '';
    const readingClass = summary.partial ? 'reading-status is-partial' : 'reading-status';
    const completeness = Math.max(2, Math.min(100, summary.completeness));
    return `
      <tr data-room-id="${room.id}" class="${selected ? 'is-selected' : ''}" tabindex="0" aria-selected="${selected}">
        <td>
          <span class="room-cell">
            <i class="room-swatch" style="background:${color};color:${color}"></i>
            <span><strong>${room.name}</strong> <small>${room.id}</small></span>
          </span>
        </td>
        <td class="number-cell">${pad(room.floor)}</td>
        <td class="number-cell">${room.areaM2} m²</td>
        <td class="number-cell energy-cell">${formatNumber(summary.total, 1)}${partialMark}</td>
        <td class="number-cell">${formatNumber(summary.intensity, 2)}</td>
        <td class="number-cell">${formatNumber(summary.afterHoursShare, 0)}%</td>
        <td class="completeness-cell">
          <span class="${readingClass}">
            ${summary.available}/${summary.expected}
            <span class="mini-track"><i style="width:${completeness}%"></i></span>
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (!summaries.length) {
    elements.roomTableBody.innerHTML = '<tr><td colspan="7" class="empty-table">No rooms on this floor.</td></tr>';
  }

  const headers = document.querySelectorAll('thead th');
  headers.forEach((header) => {
    const button = header.querySelector('.sort-button');
    if (!button) return;
    if (button.dataset.sort === state.sortKey) {
      header.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
    } else {
      header.setAttribute('aria-sort', 'none');
    }
  });
}

function missingRunText(summary) {
  if (!summary.missingIndices.length) return '';
  const first = summary.missingIndices[0];
  const last = summary.missingIndices[summary.missingIndices.length - 1];
  const contiguous = summary.missingIndices.length === last - first + 1;
  if (contiguous) {
    return `${summary.missing} readings missing (${formatDayHour(startMsForIndex(first))} → ${formatHourLabel(startMsForIndex(last) + HOUR_MS)}) · totals are partial.`;
  }
  return `${summary.missing} of ${summary.expected} readings missing · totals are partial.`;
}

function overnightBaseline(summary) {
  if (summary.peakIndex === null) return 0;
  const peakHour = new Date(startMsForIndex(summary.peakIndex)).getUTCHours();
  const values = [];
  for (let index = state.startIndex; index < state.endIndex; index += 1) {
    const date = new Date(startMsForIndex(index));
    const value = summary.room.readings[index];
    if (value !== null && Math.abs(date.getUTCHours() - peakHour) <= 2 && index !== summary.peakIndex) {
      values.push(value);
    }
  }
  values.sort((a, b) => a - b);
  if (!values.length) return 0;
  return values[Math.floor(values.length / 2)];
}

function renderFocus() {
  const summary = getSelectedSummary();
  const compareAvailable = Boolean(summary);
  elements.focusPanel.classList.toggle('is-empty', !summary);
  elements.clearSelectionButton.disabled = !summary;
  elements.compareButton.disabled = !summary;

  if (!summary) {
    elements.selectionDot.style.background = 'var(--subtle)';
    elements.selectionDot.style.boxShadow = 'none';
    elements.focusRoomName.textContent = 'No room selected';
    elements.focusRoomMeta.textContent = 'Choose a room in the model or table';
    elements.metricTotal.textContent = '—';
    elements.metricIntensity.textContent = '—';
    elements.metricPeak.textContent = '—';
    elements.metricPeakTime.textContent = '—';
    elements.metricAfterHours.textContent = '—';
    elements.metricAfterHoursNote.textContent = 'select a room';
    elements.completenessRow.classList.remove('is-partial');
    elements.completenessText.textContent = 'Select a room to view data coverage';
    elements.completenessPercent.textContent = '—';
    elements.insightBanner.classList.add('is-neutral');
    elements.insightTitle.textContent = 'Awaiting a selection';
    elements.insightCopy.textContent = 'The model and table are still showing the selected interval.';
    elements.chartEmpty.classList.add('is-visible');
    elements.chartTitle.textContent = 'Hourly energy';
    elements.chartSubtitle.textContent = 'kWh per interval · choose a room';
    state.compareActive = false;
    elements.compareButton.setAttribute('aria-pressed', 'false');
    elements.compareButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V9M12 17V4M19 17v-6"></path><path d="M3 19.5h18"></path></svg> Compare';
    elements.compareControls.hidden = true;
    elements.chartLegend.innerHTML = '';
    elements.focusFooterNote.textContent = 'Peak and totals use only available readings.';
    return;
  }

  const room = summary.room;
  const roomColor = interpolateColor(getMetricValue(summary), colorDomainMax);
  elements.selectionDot.style.background = roomColor;
  elements.selectionDot.style.boxShadow = `0 0 8px ${roomColor}`;
  elements.focusRoomName.textContent = room.name;
  elements.focusRoomMeta.textContent = `Floor ${pad(room.floor)} · ${room.areaM2} m² · ${kindLabels[room.kind] || 'Room'} · ${room.id}`;
  elements.metricTotal.textContent = formatNumber(summary.total, 1);
  elements.metricIntensity.textContent = formatNumber(summary.intensity, 2);
  elements.metricPeak.textContent = summary.peakIndex === null ? '—' : formatNumber(summary.peak, 1);
  elements.metricPeakTime.textContent = summary.peakIndex === null ? '—' : formatDayHour(startMsForIndex(summary.peakIndex));
  elements.metricAfterHours.textContent = formatNumber(summary.afterHoursShare, 0);
  elements.metricAfterHoursNote.textContent = `${formatNumber(summary.afterHoursEnergy, 1)} kWh outside 08–18 weekdays`;
  elements.completenessRow.classList.toggle('is-partial', summary.partial);
  elements.completenessText.textContent = summary.partial
    ? `${summary.available} of ${summary.expected} readings available · partial`
    : `${summary.available} of ${summary.expected} readings available`;
  elements.completenessPercent.textContent = `${formatNumber(summary.completeness, 0)}%`;

  elements.insightBanner.classList.remove('is-neutral');
  if (summary.partial) {
    elements.insightTitle.textContent = 'Incomplete readings';
    elements.insightCopy.textContent = missingRunText(summary);
  } else if (room.id === 'r-201' && summary.peak > 6) {
    const baseline = overnightBaseline(summary);
    const ratio = baseline > 0 ? Math.round(summary.peak / baseline) : null;
    elements.insightTitle.textContent = 'Overnight spike detected';
    elements.insightCopy.textContent = `${formatNumber(summary.peak, 1)} kWh at ${formatDayHour(startMsForIndex(summary.peakIndex))}${ratio ? ` · ${ratio}× the room's overnight baseline` : ''}.`;
  } else {
    elements.insightBanner.classList.add('is-neutral');
    if (room.kind === 'server') {
      elements.insightTitle.textContent = 'Always-on load';
      elements.insightCopy.textContent = `Continuous baseline · minimum ${formatNumber(summary.min, 2)} kWh in this interval.`;
    } else if (room.kind === 'meeting') {
      elements.insightTitle.textContent = 'Meeting-day profile';
      elements.insightCopy.textContent = `Peak ${formatNumber(summary.peak, 1)} kWh · ${formatDayHour(startMsForIndex(summary.peakIndex))}.`;
    } else if (room.kind === 'studio') {
      elements.insightTitle.textContent = 'Daytime-led load';
      elements.insightCopy.textContent = `${formatNumber(summary.afterHoursShare, 0)}% of available load falls outside weekday hours.`;
    } else {
      elements.insightTitle.textContent = 'Unusual use check';
      elements.insightCopy.textContent = `Peak ${formatNumber(summary.peak, 1)} kWh · ${formatDayHour(startMsForIndex(summary.peakIndex))}.`;
    }
  }

  elements.chartEmpty.classList.remove('is-visible');
  elements.chartTitle.textContent = state.compareActive ? 'Compare hourly energy' : 'Hourly energy';
  elements.chartSubtitle.textContent = `kWh per hour · ${state.compareActive ? 'shared comparison' : 'hourly'} scale · UTC`;
  elements.compareButton.setAttribute('aria-pressed', state.compareActive ? 'true' : 'false');
  elements.compareButton.innerHTML = state.compareActive
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V9M12 17V4M19 17v-6"></path><path d="M3 19.5h18"></path></svg> Done'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V9M12 17V4M19 17v-6"></path><path d="M3 19.5h18"></path></svg> Compare';
  elements.compareControls.hidden = !state.compareActive;
  elements.compareButton.disabled = !compareAvailable;
  elements.focusFooterNote.textContent = summary.partial
    ? `${summary.available} readings used; missing values are excluded.`
    : 'Peak and totals use only available readings.';
}

function populateCompareOptions() {
  const visible = getVisibleRooms();
  let comparisonRoom = roomById.get(state.compareRoomB);
  if (!comparisonRoom || !isVisibleFloor(comparisonRoom.floor) || comparisonRoom.id === state.selectedRoomId) {
    comparisonRoom = visible.find((room) => room.id !== state.selectedRoomId) || visible[0] || null;
    if (comparisonRoom) state.compareRoomB = comparisonRoom.id;
  }
  const options = visible.map((room) => `<option value="${room.id}">${room.name} · F${pad(room.floor)}</option>`).join('');
  elements.compareRoomA.innerHTML = options;
  elements.compareRoomB.innerHTML = options;
  if (state.selectedRoomId) elements.compareRoomA.value = state.selectedRoomId;
  if (comparisonRoom) elements.compareRoomB.value = comparisonRoom.id;
}

function updateCompareControls() {
  if (!state.compareActive) {
    elements.compareControls.hidden = true;
    return;
  }
  elements.compareControls.hidden = false;
  populateCompareOptions();
}

function updateFocusSelectionState() {
  elements.focusPanel.classList.toggle('is-empty', !getSelectedSummary());
}

function renderAll() {
  refreshSummaries();
  updateRangeDescription();
  updateRangeButtons();
  updateMetricButtons();
  updateFloorButtons();
  renderLegend();
  renderTable();
  renderFocus();
  updateCompareControls();
  renderChart();
  if (sceneApi) sceneApi.refresh();
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(151, 202, 207, 0.09)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let step = 0; step <= 4; step += 1) {
    const y = Math.round(14 + ((height - 36) / 4) * step) + 0.5;
    ctx.beginPath();
    ctx.moveTo(38, y);
    ctx.lineTo(width - 7, y);
    ctx.stroke();
  }
}

function niceChartMax(max) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const rawStep = (max * 1.12) / 4;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / power;
  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 1.5) niceFraction = 1.5;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 3) niceFraction = 3;
  else if (fraction <= 4) niceFraction = 4;
  else if (fraction <= 5) niceFraction = 5;
  else if (fraction <= 8) niceFraction = 8;
  else niceFraction = 10;
  return niceFraction * power * 4;
}

function getChartSeries(summary) {
  if (!summary) return [];
  const points = [];
  for (let index = state.startIndex; index < state.endIndex; index += 1) {
    points.push({
      index,
      value: summary.room.readings[index],
      time: startMsForIndex(index),
    });
  }
  return points;
}

function strokeSeries(ctx, points, xFor, yFor, color, withFill) {
  let segment = [];
  const flush = () => {
    if (segment.length > 1) {
      ctx.beginPath();
      segment.forEach((point, index) => {
        if (index === 0) ctx.moveTo(xFor(point), yFor(point.value));
        else ctx.lineTo(xFor(point), yFor(point.value));
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (segment.length === 1) {
      ctx.beginPath();
      ctx.arc(xFor(segment[0]), yFor(segment[0].value), 1.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    segment = [];
  };

  if (withFill) {
    const segments = [];
    let current = [];
    points.forEach((point) => {
      if (point.value === null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push(point);
      }
    });
    if (current.length) segments.push(current);
    segments.forEach((part) => {
      if (part.length < 2) return;
      const gradient = ctx.createLinearGradient(0, 14, 0, ctx.canvas.height);
      gradient.addColorStop(0, `${color}44`);
      gradient.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.moveTo(xFor(part[0]), yFor(0));
      part.forEach((point) => ctx.lineTo(xFor(point), yFor(point.value)));
      ctx.lineTo(xFor(part[part.length - 1]), yFor(0));
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }

  points.forEach((point) => {
    if (point.value === null) flush();
    else segment.push(point);
  });
  flush();
}

function drawMissingBands(ctx, points, xFor, plot) {
  if (!points.some((point) => point.value === null)) return;
  const step = points.length > 1 ? (plot.right - plot.left) / (points.length - 1) : 4;
  let start = null;
  const drawBand = (from, to) => {
    const left = Math.max(plot.left, from - Math.max(1.5, step / 2));
    const width = Math.max(2, Math.min(plot.right, to + Math.max(1.5, step / 2)) - left);
    ctx.fillStyle = 'rgba(255, 190, 104, 0.08)';
    ctx.fillRect(left, plot.top, width, plot.bottom - plot.top);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, plot.bottom - 7, width, 7);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 190, 104, 0.5)';
    ctx.lineWidth = 1;
    for (let x = left - 8; x < left + width + 8; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, plot.bottom);
      ctx.lineTo(x + 7, plot.bottom - 7);
      ctx.stroke();
    }
    ctx.restore();
  };

  points.forEach((point, index) => {
    if (point.value === null && start === null) start = index;
    if ((point.value !== null || index === points.length - 1) && start !== null) {
      const end = point.value === null ? index : index - 1;
      drawBand(xFor(points[start]), xFor(points[end]));
      start = null;
    }
  });
}

function renderChart() {
  const canvas = elements.energyChart;
  const wrap = elements.chartWrap;
  const width = Math.max(1, wrap.clientWidth);
  const height = Math.max(1, wrap.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const selected = getSelectedSummary();
  if (!selected) {
    chartModel = null;
    elements.chartLegend.innerHTML = '';
    return;
  }

  const comparison = state.compareActive ? allSummaries.get(state.compareRoomB) : null;
  const seriesA = getChartSeries(selected);
  const seriesB = comparison ? getChartSeries(comparison) : [];
  const plot = { left: 38, right: width - 8, top: 14, bottom: height - 22 };
  if (plot.bottom <= plot.top + 20) return;

  const maxValue = Math.max(
    ...seriesA.map((point) => point.value || 0),
    ...seriesB.map((point) => point.value || 0),
    0.001,
  );
  const chartMax = niceChartMax(maxValue);
  const xForValue = (point) => {
    if (seriesA.length <= 1) return (plot.left + plot.right) / 2;
    const index = point.index - state.startIndex;
    return plot.left + (index / (seriesA.length - 1)) * (plot.right - plot.left);
  };
  const yFor = (value) => plot.bottom - (Math.max(0, value) / chartMax) * (plot.bottom - plot.top);

  drawGrid(ctx, width, height);

  ctx.font = '7px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = 'rgba(129, 153, 158, 0.72)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let step = 0; step <= 4; step += 1) {
    const value = chartMax - (chartMax / 4) * step;
    const y = 14 + ((height - 36) / 4) * step;
    ctx.fillText(formatCompactNumber(value), 32, y);
  }

  const labelStepHours = seriesA.length <= 18 ? 3 : seriesA.length <= 36 ? 6 : seriesA.length <= 72 ? 12 : 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  seriesA.forEach((point, index) => {
    const date = new Date(point.time);
    const isFirst = index === 0;
    const isLast = index === seriesA.length - 1;
    const hour = date.getUTCHours();
    if (isFirst || isLast || hour % labelStepHours === 0) {
      if (!isFirst && !isLast && index < 4) return;
      const label = labelStepHours >= 24 ? formatDateTiny(point.time) : `${dayShort[date.getUTCDay()]} ${pad(hour)}h`;
      ctx.fillStyle = 'rgba(129, 153, 158, 0.66)';
      ctx.fillText(label, xForValue(point), plot.bottom + 7);
    }
  });

  drawMissingBands(ctx, seriesA, xForValue, plot);
  if (seriesB.length) drawMissingBands(ctx, seriesB, xForValue, plot);

  if (state.compareActive && comparison) {
    strokeSeries(ctx, seriesB, xForValue, yFor, '#ffbe68', false);
    strokeSeries(ctx, seriesA, xForValue, yFor, '#64dfca', false);
  } else {
    strokeSeries(ctx, seriesA, xForValue, yFor, '#64dfca', true);
  }

  if (state.chartHoverIndex !== null) {
    const point = seriesA[state.chartHoverIndex];
    if (point) {
      const x = xForValue(point);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(236, 247, 245, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
      ctx.stroke();
      ctx.restore();
      [seriesA, seriesB].forEach((series, seriesIndex) => {
        const value = series[state.chartHoverIndex]?.value;
        if (value === null || value === undefined) return;
        ctx.beginPath();
        ctx.arc(x, yFor(value), 3, 0, Math.PI * 2);
        ctx.fillStyle = seriesIndex === 0 ? '#64dfca' : '#ffbe68';
        ctx.fill();
        ctx.strokeStyle = '#08151a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }

  const peakPoint = seriesA
    .filter((point) => point.value !== null)
    .reduce((best, point) => (best === null || point.value > best.value ? point : best), null);
  const isSpike = selected.room.id === 'r-201' && peakPoint && peakPoint.value > 6;
  if (!state.compareActive && peakPoint && isSpike) {
    const x = xForValue(peakPoint);
    const y = yFor(peakPoint.value);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255, 190, 104, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffbe68';
    ctx.fill();
    ctx.strokeStyle = '#0a171d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  chartModel = {
    points: seriesA,
    plot,
    width,
    height,
    xForValue,
    seriesA,
    seriesB,
    comparison,
    selected,
  };

  if (state.compareActive && comparison) {
    elements.chartLegend.innerHTML = `
      <span class="legend-item"><i class="legend-line legend-line--a"></i><span>A · ${selected.room.name}</span></span>
      <span class="legend-item"><i class="legend-line legend-line--b"></i><span>B · ${comparison.room.name}</span></span>
      ${(selected.partial || comparison.partial) ? '<span class="legend-item"><i class="legend-line legend-line--gap"></i><span>Missing readings</span></span>' : ''}
    `;
  } else {
    elements.chartLegend.innerHTML = `
      <span class="legend-item"><i class="legend-line legend-line--a"></i><span>${selected.room.name}</span></span>
      ${selected.partial
        ? '<span class="legend-item"><i class="legend-line legend-line--gap"></i><span>Missing readings</span></span>'
        : `<span class="legend-item"><i class="legend-data-dot"></i><span>${selected.available} of ${selected.expected} readings</span></span>`}
    `;
  }
}

function pointChartTooltip(event) {
  if (!chartModel) return;
  const rect = elements.chartWrap.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const relative = (x - chartModel.plot.left) / (chartModel.plot.right - chartModel.plot.left);
  const index = Math.max(0, Math.min(chartModel.seriesA.length - 1, Math.round(relative * (chartModel.seriesA.length - 1))));
  state.chartHoverIndex = index;
  const point = chartModel.seriesA[index];
  if (!point) return;
  const a = chartModel.seriesA[index];
  const b = chartModel.seriesB[index];
  let html = `<strong>${formatDayHour(point.time)}</strong>`;
  html += a.value === null
    ? '<span class="missing-value">A · Missing reading</span>'
    : `<span>A · ${formatNumber(a.value, 2)} kWh</span>`;
  if (state.compareActive && b) {
    html += b.value === null
      ? '<br><span class="missing-value">B · Missing reading</span>'
      : `<br><span>B · ${formatNumber(b.value, 2)} kWh</span>`;
  }
  elements.chartTooltip.innerHTML = html;
  const tooltipWidth = 132;
  const left = Math.min(rect.width - tooltipWidth - 5, Math.max(4, x + 12));
  const top = Math.min(rect.height - 55, Math.max(4, y - 33));
  elements.chartTooltip.style.left = `${left}px`;
  elements.chartTooltip.style.top = `${top}px`;
  elements.chartTooltip.classList.add('is-visible');
  renderChart();
}

function clearChartTooltip() {
  if (state.chartHoverIndex === null) return;
  state.chartHoverIndex = null;
  elements.chartTooltip.classList.remove('is-visible');
  renderChart();
}

function selectRoom(roomId, options = {}) {
  const room = roomById.get(roomId);
  if (!room) return;
  if (!isVisibleFloor(room.floor)) {
    state.floor = 'all';
    updateFloorButtons();
  }
  state.selectedRoomId = room.id;
  if (state.compareActive) {
    if (state.compareRoomB === room.id) {
      const replacement = getVisibleRooms().find((candidate) => candidate.id !== room.id);
      if (replacement) state.compareRoomB = replacement.id;
    }
  }
  renderAll();
  if (options.scrollTable) {
    requestAnimationFrame(() => {
      document.querySelector(`tr[data-room-id="${room.id}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}

function clearSelection(showMessage = false) {
  state.selectedRoomId = null;
  state.compareActive = false;
  state.chartHoverIndex = null;
  elements.chartTooltip.classList.remove('is-visible');
  renderAll();
  if (showMessage) showToast('Selection cleared because its floor is hidden.');
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

function setRange(startIndex, endIndex, preset) {
  state.startIndex = startIndex;
  state.endIndex = endIndex;
  state.rangePreset = preset;
  state.chartHoverIndex = null;
  elements.chartTooltip.classList.remove('is-visible');
  if (state.selectedRoomId) {
    const room = roomById.get(state.selectedRoomId);
    if (room && !isVisibleFloor(room.floor)) clearSelection(false);
  }
  renderAll();
}

function setupEventListeners() {
  elements.rangePresets.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-range]');
    if (!button) return;
    if (button.dataset.range === '24h') setRange(totalHours - 24, totalHours, '24h');
    else if (button.dataset.range === '48h') setRange(totalHours - 48, totalHours, '48h');
    else setRange(0, totalHours, '7d');
  });

  elements.metricToggle.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-metric]');
    if (!button || button.dataset.metric === state.metric) return;
    state.metric = button.dataset.metric;
    renderAll();
  });

  elements.floorFilter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-floor]');
    if (!button || button.dataset.floor === state.floor) return;
    state.floor = button.dataset.floor;
    elements.stageTooltip.classList.remove('is-visible');
    updateFloorButtons();
    if (state.selectedRoomId) {
      const selected = roomById.get(state.selectedRoomId);
      if (selected && !isVisibleFloor(selected.floor)) {
        state.selectedRoomId = null;
        state.compareActive = false;
        showToast('Selected room is on a hidden floor · selection cleared.');
      }
    }
    if (state.compareActive) {
      const comparison = roomById.get(state.compareRoomB);
      if (comparison && !isVisibleFloor(comparison.floor)) {
        state.compareActive = false;
        showToast('Comparison ended because one room is on a hidden floor.');
      }
    }
    renderAll();
    if (sceneApi) sceneApi.applyFloorVisibility();
  });

  elements.roomTableBody.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-room-id]');
    if (!row) return;
    selectRoom(row.dataset.roomId, { scrollTable: true });
  });

  elements.roomTableBody.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-room-id]');
    if (!row) return;
    event.preventDefault();
    selectRoom(row.dataset.roomId, { scrollTable: true });
  });

  document.querySelectorAll('.sort-button').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = key === 'name' ? 'asc' : 'desc';
      }
      renderTable();
    });
  });

  elements.clearSelectionButton.addEventListener('click', () => clearSelection(false));

  elements.compareButton.addEventListener('click', () => {
    if (!state.selectedRoomId) return;
    state.compareActive = !state.compareActive;
    if (state.compareActive) {
      const comparison = roomById.get(state.compareRoomB);
      if (!comparison || comparison.id === state.selectedRoomId || !isVisibleFloor(comparison.floor)) {
        const replacement = getVisibleRooms().find((room) => room.id !== state.selectedRoomId);
        if (replacement) state.compareRoomB = replacement.id;
      }
    }
    renderFocus();
    updateCompareControls();
    renderChart();
  });

  elements.compareRoomA.addEventListener('change', () => {
    selectRoom(elements.compareRoomA.value);
  });

  elements.compareRoomB.addEventListener('change', () => {
    if (elements.compareRoomB.value === state.selectedRoomId) {
      showToast('Choose a different room for comparison.');
      populateCompareOptions();
      return;
    }
    state.compareRoomB = elements.compareRoomB.value;
    renderChart();
  });

  elements.downloadCsvButton.addEventListener('click', downloadCsv);

  elements.resetViewButton.addEventListener('click', () => {
    if (sceneApi) sceneApi.resetCamera();
  });

  elements.datasetInfoButton.addEventListener('click', () => elements.infoDialog.showModal());
  elements.helpButton.addEventListener('click', () => elements.infoDialog.showModal());

  elements.chartWrap.addEventListener('pointermove', pointChartTooltip);
  elements.chartWrap.addEventListener('pointerleave', clearChartTooltip);

  elements.customRangeButton.addEventListener('click', () => {
    elements.customStart.min = formatDateTimeLocal(datasetStartMs);
    elements.customStart.max = formatDateTimeLocal(datasetEndMs - HOUR_MS);
    elements.customEnd.min = formatDateTimeLocal(datasetStartMs + HOUR_MS);
    elements.customEnd.max = formatDateTimeLocal(datasetEndMs);
    elements.customStart.value = formatDateTimeLocal(rangeStartMs());
    elements.customEnd.value = formatDateTimeLocal(rangeEndMs());
    elements.customRangeError.textContent = '';
    elements.customRangeDialog.showModal();
  });

  elements.customRangeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.submitter?.value === 'cancel') {
      elements.customRangeDialog.close();
      return;
    }
    const start = parseDateTimeLocal(elements.customStart.value);
    const end = parseDateTimeLocal(elements.customEnd.value);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      elements.customRangeError.textContent = 'Enter a valid start and end time.';
      return;
    }
    if (start < datasetStartMs || end > datasetEndMs) {
      elements.customRangeError.textContent = 'The range must stay within the sample week.';
      return;
    }
    if (end <= start) {
      elements.customRangeError.textContent = 'The end must be after the start.';
      return;
    }
    const startIndex = Math.round((start - datasetStartMs) / HOUR_MS);
    const endIndex = Math.round((end - datasetStartMs) / HOUR_MS);
    if (endIndex - startIndex < 2) {
      elements.customRangeError.textContent = 'Choose at least two hourly intervals.';
      return;
    }
    elements.customRangeDialog.close();
    setRange(startIndex, endIndex, 'custom');
    showToast(`Custom range applied · ${endIndex - startIndex} intervals.`);
  });

  window.addEventListener('resize', () => {
    if (sceneApi) sceneApi.resize();
    renderChart();
  });
}

function downloadCsv() {
  const summaries = sortedVisibleSummaries();
  const startIso = new Date(rangeStartMs()).toISOString();
  const endIso = new Date(rangeEndMs()).toISOString();
  const headers = [
    'dataset',
    'is_sample',
    'room_id',
    'room_name',
    'floor',
    'floor_area_m2',
    'range_start_utc',
    'range_end_utc',
    'interval_hours',
    'expected_readings',
    'available_readings',
    'completeness_percent',
    'total_energy_kwh',
    'energy_per_m2_kwh_per_m2',
    'after_hours_energy_kwh',
    'after_hours_share_percent',
    'is_partial',
  ];
  const rows = summaries.map((summary) => [
    meta.title,
    'true',
    summary.room.id,
    summary.room.name,
    summary.room.floor,
    summary.room.areaM2,
    startIso,
    endIso,
    meta.intervalHours,
    summary.expected,
    summary.available,
    summary.completeness.toFixed(1),
    summary.total.toFixed(3),
    summary.intensity.toFixed(3),
    summary.afterHoursEnergy.toFixed(3),
    summary.afterHoursShare.toFixed(1),
    summary.partial ? 'true' : 'false',
  ]);
  const escape = (value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date(rangeStartMs()).toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `northstar-sample-room-summaries-${date}-${state.endIndex - state.startIndex}h.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast(`CSV downloaded · ${summaries.length} room summaries with completeness.`);
}

function buildScene() {
  const mount = elements.threeMount;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-renderer';
  elements.labelMount.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = 1.46;
  controls.target.set(0, 2.16, 0);

  scene.add(new THREE.HemisphereLight(0xd8f7ff, 0x071014, 1.65));
  const keyLight = new THREE.DirectionalLight(0xfff1d5, 2.15);
  keyLight.position.set(5.8, 8.5, 7.2);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8bd8f2, 1.25);
  fillLight.position.set(-7, 4.2, 3.2);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x5be2cf, 0.72);
  rimLight.position.set(2, 2.5, -8);
  scene.add(rimLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 64),
    new THREE.MeshBasicMaterial({ color: 0x07161c, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.16;
  scene.add(ground);

  const grid = new THREE.GridHelper(25, 25, 0x266267, 0x102b32);
  grid.position.y = -0.145;
  grid.material.transparent = true;
  grid.material.opacity = 0.38;
  grid.material.depthWrite = false;
  scene.add(grid);

  const building = new THREE.Group();
  building.position.y = 0.02;
  scene.add(building);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 4.5),
    new THREE.MeshBasicMaterial({
      color: 0x12313a,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  backWall.position.set(0, 2.16, -2.88);
  building.add(backWall);

  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b2028,
    metalness: 0.35,
    roughness: 0.66,
    transparent: true,
    opacity: 0.9,
  });
  const slabEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x5d9ca0, transparent: true, opacity: 0.28 });
  const slabGeometry = new THREE.BoxGeometry(9.1, 0.09, 5.62);
  const slabEdges = new THREE.EdgesGeometry(slabGeometry);

  const floorGroups = new Map();
  const floorTags = [];
  FLOOR_BASE.forEach((base, floorIndex) => {
    const floorGroup = new THREE.Group();
    floorGroup.position.y = base;
    building.add(floorGroup);
    floorGroups.set(floorIndex + 1, floorGroup);

    const slab = new THREE.Mesh(slabGeometry, slabMaterial);
    slab.position.y = -0.045;
    floorGroup.add(slab);
    const slabOutline = new THREE.LineSegments(slabEdges, slabEdgeMaterial);
    slabOutline.position.y = -0.045;
    floorGroup.add(slabOutline);

    const floorTag = document.createElement('div');
    floorTag.className = 'floor-label';
    floorTag.textContent = `LEVEL 0${floorIndex + 1}`;
    const floorTagObject = new CSS2DObject(floorTag);
    floorTagObject.position.set(-4.78, 0.72, 2.35);
    floorGroup.add(floorTagObject);
    floorTags.push(floorTagObject);
  });

  const columnMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d4a53,
    metalness: 0.6,
    roughness: 0.44,
    transparent: true,
    opacity: 0.7,
  });
  [-4.46, 4.46].forEach((x) => {
    [-2.78, 2.78].forEach((z) => {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.075, 4.24, 0.075), columnMaterial);
      column.position.set(x, 2.06, z);
      building.add(column);
    });
  });

  const topFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(9.1, 0.04, 5.62)),
    new THREE.LineBasicMaterial({ color: 0x5d9ca0, transparent: true, opacity: 0.16 }),
  );
  topFrame.position.y = 4.12;
  building.add(topFrame);

  const roomGeometry = new RoundedBoxGeometry(3.9, 1.02, 2.3, 3, 0.055);
  const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.9, 1.02, 2.3));
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xffbe68,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });

  const hatchCanvas = document.createElement('canvas');
  hatchCanvas.width = 96;
  hatchCanvas.height = 96;
  const hatchContext = hatchCanvas.getContext('2d');
  hatchContext.clearRect(0, 0, 96, 96);
  hatchContext.strokeStyle = 'rgba(255, 242, 217, 0.72)';
  hatchContext.lineWidth = 7;
  for (let offset = -96; offset < 192; offset += 27) {
    hatchContext.beginPath();
    hatchContext.moveTo(offset, 96);
    hatchContext.lineTo(offset + 96, 0);
    hatchContext.stroke();
  }
  const hatchTexture = new THREE.CanvasTexture(hatchCanvas);
  hatchTexture.wrapS = THREE.RepeatWrapping;
  hatchTexture.wrapT = THREE.RepeatWrapping;
  hatchTexture.repeat.set(2.2, 1.2);
  hatchTexture.colorSpace = THREE.SRGBColorSpace;
  const hatchMaterial = new THREE.MeshBasicMaterial({
    map: hatchTexture,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const visuals = new Map();
  const roomMeshes = [];

  FLOOR_LAYOUT.forEach((floorRooms, floorIndex) => {
    floorRooms.forEach((roomId, roomIndex) => {
      const room = roomById.get(roomId);
      const [x, z] = ROOM_OFFSETS[roomIndex];
      const material = new THREE.MeshStandardMaterial({
        color: 0x2b6070,
        metalness: 0.18,
        roughness: 0.53,
        transparent: true,
        opacity: 0.94,
        emissive: 0x102c34,
        emissiveIntensity: 0.18,
      });
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xcdf7ef,
        transparent: true,
        opacity: 0.3,
      });
      const mesh = new THREE.Mesh(roomGeometry, material);
      mesh.position.set(x, 0.56, z);
      mesh.userData.roomId = roomId;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      floorGroups.get(floorIndex + 1).add(mesh);

      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.scale.setScalar(1.008);
      mesh.add(edges);

      const roomHatchMaterial = hatchMaterial.clone();
      const hatch = new THREE.Mesh(roomGeometry, roomHatchMaterial);
      hatch.scale.setScalar(1.012);
      hatch.visible = false;
      hatch.renderOrder = 2;
      mesh.add(hatch);

      const outline = new THREE.LineSegments(edgeGeometry, outlineMaterial);
      outline.scale.setScalar(1.055);
      outline.visible = false;
      outline.renderOrder = 4;
      mesh.add(outline);

      const labelElement = document.createElement('div');
      labelElement.className = 'room-label';
      labelElement.textContent = room.shortName;
      const labelObject = new CSS2DObject(labelElement);
      labelObject.position.set(0, 0.7, 1.22);
      mesh.add(labelObject);

      visuals.set(roomId, {
        mesh,
        material,
        edgeMaterial,
        hatch,
        outline,
        labelElement,
        labelObject,
        floor: room.floor,
      });
      roomMeshes.push(mesh);
    });
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pressPoint = null;

  const resize = () => {
    const width = Math.max(1, elements.stage.clientWidth);
    const height = Math.max(1, elements.stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width / height < 1.05 ? 39 : 34;
    camera.updateProjectionMatrix();
    floorTags.forEach((tag) => {
      tag.position.x = width < 600 ? -3.15 : -4.78;
    });
  };

  const resetCamera = () => {
    const aspect = elements.stage.clientWidth / Math.max(1, elements.stage.clientHeight);
    camera.position.set(aspect < 1.05 ? 6.9 : 7.35, aspect < 1.05 ? 5.8 : 5.95, aspect < 1.05 ? 9.7 : 8.8);
    controls.target.set(0, 2.16, 0);
    controls.update();
  };

  const applyFloorVisibility = () => {
    floorGroups.forEach((group, floor) => {
      const visible = state.floor === 'all' || Number(state.floor) === floor;
      group.visible = visible;
      floorTags[floor - 1].visible = visible;
      visuals.forEach((visual) => {
        if (visual.floor === floor) visual.labelObject.visible = visible;
      });
    });
  };

  const refresh = () => {
    const selectedId = state.selectedRoomId;
    visuals.forEach((visual, id) => {
      const summary = allSummaries.get(id);
      const color = interpolateColor(getMetricValue(summary), colorDomainMax);
      const selected = id === selectedId;
      const dimmed = Boolean(selectedId) && !selected;
      visual.material.color.set(color);
      visual.material.emissive.set(color);
      visual.material.emissiveIntensity = selected ? 0.25 : 0.13;
      visual.material.opacity = dimmed ? 0.28 : 0.95;
      visual.edgeMaterial.color.set(selected ? 0xffdfad : 0xcdf7ef);
      visual.edgeMaterial.opacity = dimmed ? 0.09 : (selected ? 0.7 : 0.28);
      visual.hatch.visible = summary.partial;
      visual.hatch.material.opacity = dimmed ? 0.16 : 0.45;
      visual.outline.visible = selected;
      visual.labelElement.classList.toggle('is-selected', selected);
      visual.labelElement.classList.toggle('is-dimmed', dimmed);
      visual.labelObject.renderOrder = selected ? 20 : 0;
    });
    applyFloorVisibility();
  };

  const updatePointer = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const intersectRoom = (event) => {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(roomMeshes.filter((mesh) => mesh.parent.visible), false);
    return intersections[0]?.object || null;
  };

  const showHover = (mesh, event) => {
    if (!mesh) {
      elements.stageTooltip.classList.remove('is-visible');
      renderer.domElement.style.cursor = '';
      state.hoverRoomId = null;
      return;
    }
    const roomId = mesh.userData.roomId;
    if (state.hoverRoomId !== roomId) state.hoverRoomId = roomId;
    const summary = allSummaries.get(roomId);
    const suffix = summary.partial ? ' · partial' : '';
    const value = state.metric === 'total' ? summary.total : summary.intensity;
    const digits = state.metric === 'total' ? 1 : 2;
    elements.stageTooltip.innerHTML = `<strong>${summary.room.name}</strong><span>Floor ${pad(summary.room.floor)} · ${formatNumber(value, digits)} ${metricUnit()}${suffix}</span><small>Click to inspect</small>`;
    const rect = elements.stage.getBoundingClientRect();
    const left = Math.min(rect.width - 205, Math.max(6, event.clientX - rect.left));
    const top = Math.min(rect.height - 60, Math.max(35, event.clientY - rect.top));
    elements.stageTooltip.style.left = `${left}px`;
    elements.stageTooltip.style.top = `${top}px`;
    elements.stageTooltip.classList.add('is-visible');
    renderer.domElement.style.cursor = 'pointer';
  };

  renderer.domElement.addEventListener('pointermove', (event) => {
    showHover(intersectRoom(event), event);
  });
  renderer.domElement.addEventListener('pointerleave', () => showHover(null));
  renderer.domElement.addEventListener('pointerdown', (event) => {
    pressPoint = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!pressPoint) return;
    const distance = Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y);
    pressPoint = null;
    if (distance > 5) return;
    const mesh = intersectRoom(event);
    if (mesh) selectRoom(mesh.userData.roomId, { scrollTable: true });
  });

  resize();
  resetCamera();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(elements.stage);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    const selected = state.selectedRoomId ? visuals.get(state.selectedRoomId) : null;
    if (selected?.outline.visible) {
      selected.outline.material.opacity = 0.76 + Math.sin(performance.now() * 0.004) * 0.16;
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  animate();

  return {
    refresh,
    resize,
    resetCamera,
    applyFloorVisibility,
  };
}

function init() {
  setupEventListeners();
  sceneApi = buildScene();
  refreshSummaries();
  renderAll();
}

init();
