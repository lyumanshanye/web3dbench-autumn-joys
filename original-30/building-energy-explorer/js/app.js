import { ROOMS, INTERVALS, summarizeRoom, FLOOR_LABELS, TIMEZONE } from "./data.js";
import { BuildingScene } from "./scene.js";
import { renderHourlyChart, renderCompareChart } from "./charts.js";
import { colorForValue, paletteGradient, niceMaximum } from "./scale.js";

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_START_INDEX = 3 * 24;
const DEFAULT_END_INDEX = DEFAULT_START_INDEX + 23;

const state = {
  startIndex: DEFAULT_START_INDEX,
  endIndex: DEFAULT_END_INDEX,
  metric: "total",
  visibleFloors: new Set([1, 2, 3]),
  selectedRoomId: "f2-finance",
  view: "hourly",
  compareRoomId: "f3-server",
  sortKey: "total",
  sortDirection: "desc",
  summaries: new Map(),
  scaleMax: 1,
  unit: "kWh",
};

const elements = {
  rangeCopy: document.querySelector("#rangeCopy"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  floorList: document.querySelector("#floorList"),
  showAllFloors: document.querySelector("#showAllFloors"),
  metricNote: document.querySelector("#metricNote"),
  buildingStage: document.querySelector("#buildingStage"),
  roomCountLabel: document.querySelector("#roomCountLabel"),
  sceneRangeLabel: document.querySelector("#sceneRangeLabel"),
  legendTitle: document.querySelector("#legendTitle"),
  legendUnit: document.querySelector("#legendUnit"),
  legendGradient: document.querySelector("#legendGradient"),
  legendMin: document.querySelector("#legendMin"),
  legendMid: document.querySelector("#legendMid"),
  legendMax: document.querySelector("#legendMax"),
  detailCard: document.querySelector("#detailCard"),
  detailContent: document.querySelector("#detailContent"),
  roomTableBody: document.querySelector("#roomTableBody"),
  tableSummary: document.querySelector("#tableSummary"),
  exportCsv: document.querySelector("#exportCsv"),
  screenReaderStatus: document.querySelector("#screenReaderStatus"),
};

let scene = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roomById(roomId) {
  return ROOMS.find((room) => room.id === roomId) ?? null;
}

function visibleRooms() {
  return ROOMS.filter((room) => state.visibleFloors.has(room.floor));
}

function rangeLength() {
  return state.endIndex - state.startIndex + 1;
}

function rangeDays() {
  return rangeLength() / 24;
}

function dateInputForIndex(index) {
  return INTERVALS[index].timestamp.slice(0, 10);
}

function indexFromDateInput(value) {
  const start = new Date(INTERVALS[0].timestamp).getTime();
  const selected = new Date(`${value}T00:00:00.000Z`).getTime();
  return clamp(Math.round((selected - start) / HOUR_MS), 0, INTERVALS.length - 1);
}

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatTotal(value) {
  if (value >= 1000) return Math.round(value).toLocaleString("en-US");
  return formatNumber(value, value < 10 ? 2 : 1);
}

function formatIntensity(value) {
  return formatNumber(value, value < 1 ? 2 : 1);
}

function formatPeakTime(timestamp) {
  return new Date(timestamp).toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

function rangeDescription(includeYear = true) {
  const start = new Date(INTERVALS[state.startIndex].timestamp);
  const end = new Date(INTERVALS[state.endIndex].timestamp);
  const sameDay = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  if (sameDay) {
    return start.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: includeYear ? "numeric" : undefined,
      timeZone: TIMEZONE,
    });
  }
  const startLabel = start.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: TIMEZONE });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: includeYear ? "numeric" : undefined,
    timeZone: TIMEZONE,
  });
  return `${startLabel} – ${endLabel}`;
}

function rangeShortLabel() {
  const start = new Date(INTERVALS[state.startIndex].timestamp);
  const end = new Date(INTERVALS[state.endIndex].timestamp);
  const sameDay = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  if (sameDay) {
    return start.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: TIMEZONE });
  }
  return rangeDescription(false);
}

function announce(message) {
  elements.screenReaderStatus.textContent = "";
  requestAnimationFrame(() => {
    elements.screenReaderStatus.textContent = message;
  });
}

function metricValue(summary) {
  return state.metric === "intensity" ? summary.intensity : summary.total;
}

function recomputeSummaries() {
  state.summaries = new Map(
    ROOMS.map((room) => [room.id, summarizeRoom(room, state.startIndex, state.endIndex)]),
  );
  const maximum = Math.max(0.01, ...ROOMS.map((room) => metricValue(state.summaries.get(room.id))));
  state.scaleMax = niceMaximum(maximum * 1.04);
  state.unit = state.metric === "intensity" ? "kWh/m²" : "kWh";
}

function ensureSelectionsVisible() {
  let clearedSelection = false;
  const selected = roomById(state.selectedRoomId);
  if (selected && !state.visibleFloors.has(selected.floor)) {
    state.selectedRoomId = null;
    clearedSelection = true;
  }

  const compareRoom = roomById(state.compareRoomId);
  if (compareRoom && !state.visibleFloors.has(compareRoom.floor)) {
    state.compareRoomId = null;
  }

  if (!state.compareRoomId && state.selectedRoomId) {
    const fallback = visibleRooms().find((room) => room.id !== state.selectedRoomId);
    state.compareRoomId = fallback?.id ?? null;
  }

  return clearedSelection;
}

function setPresetRange(days) {
  if (days === 1) {
    state.startIndex = DEFAULT_START_INDEX;
    state.endIndex = DEFAULT_END_INDEX;
  } else if (days === 3) {
    state.startIndex = 2 * 24;
    state.endIndex = 5 * 24 - 1;
  } else {
    state.startIndex = 0;
    state.endIndex = INTERVALS.length - 1;
  }
  refreshAll({ rerenderDetail: true });
  announce(`Time range changed to ${rangeDescription()}, ${rangeLength()} hourly intervals.`);
}

function applyDateRange() {
  if (!elements.startDate.value || !elements.endDate.value) return;
  let start = indexFromDateInput(elements.startDate.value);
  let end = indexFromDateInput(elements.endDate.value);
  start = Math.floor(start / 24) * 24;
  end = Math.floor(end / 24) * 24 + 23;
  if (start > end) {
    [start, end] = [Math.floor(end / 24) * 24, Math.floor(start / 24) * 24 + 23];
    elements.startDate.value = dateInputForIndex(start);
    elements.endDate.value = dateInputForIndex(end);
  }
  state.startIndex = clamp(start, 0, INTERVALS.length - 1);
  state.endIndex = clamp(end, 0, INTERVALS.length - 1);
  refreshAll({ rerenderDetail: true });
  announce(`Time range updated to ${rangeDescription()}, ${rangeLength()} hourly intervals.`);
}

function syncRangeControls() {
  elements.startDate.value = dateInputForIndex(state.startIndex);
  elements.endDate.value = dateInputForIndex(state.endIndex);
  elements.rangeCopy.textContent = `${rangeDescription()} · ${rangeLength()} intervals`;
  elements.sceneRangeLabel.textContent = rangeShortLabel();

  const dayCount = rangeDays();
  const aligned = rangeLength() % 24 === 0;
  document.querySelectorAll("[data-range-days]").forEach((button) => {
    button.classList.toggle("is-active", aligned && Number(button.dataset.rangeDays) === dayCount);
  });
}

function updateLegend() {
  const intensity = state.metric === "intensity";
  const digits = state.scaleMax < 2 ? 2 : state.scaleMax < 20 ? 1 : 0;
  elements.legendTitle.textContent = intensity ? "Energy intensity" : "Total energy";
  elements.legendUnit.textContent = state.unit;
  elements.legendGradient.style.background = paletteGradient("90deg");
  elements.legendMin.textContent = "0";
  elements.legendMid.textContent = formatNumber(state.scaleMax / 2, digits);
  elements.legendMax.textContent = formatNumber(state.scaleMax, digits);
  elements.metricNote.textContent = intensity
    ? "Total energy divided by the room's floor area (kWh/m²)."
    : "Whole-room consumption over the selected window (kWh).";
}

function floorEnergySummary(floor) {
  const rooms = ROOMS.filter((room) => room.floor === floor);
  const summaries = rooms.map((room) => state.summaries.get(room.id));
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const partial = summaries.some((summary) => summary.partial);
  return { total, partial, rooms: rooms.length };
}

function eyeIcon() {
  return `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.1 10s2.7-4.2 7.9-4.2 7.9 4.2 7.9 4.2-2.7 4.2-7.9 4.2S2.1 10 2.1 10Z" />
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  `;
}

function syncFloorControls() {
  const floorOrder = [3, 2, 1];
  elements.floorList.innerHTML = floorOrder.map((floor) => {
    const visible = state.visibleFloors.has(floor);
    const summary = floorEnergySummary(floor);
    const isolated = state.visibleFloors.size === 1 && visible;
    return `
      <div class="floor-row ${visible ? "" : "is-hidden"} ${isolated ? "is-isolated" : ""}" data-floor="${floor}">
        <button type="button" class="eye-button" aria-label="${visible ? "Hide" : "Show"} ${FLOOR_LABELS[floor]}" aria-pressed="${visible}">
          ${eyeIcon()}
        </button>
        <span class="floor-index">0${floor}</span>
        <div class="floor-copy">
          <strong>${FLOOR_LABELS[floor]}</strong>
          <small>${summary.rooms} rooms · ${summary.partial ? "~" : ""}${formatTotal(summary.total)} kWh</small>
        </div>
        <button type="button" class="solo-button" ${isolated ? "disabled" : ""} title="Show only ${FLOOR_LABELS[floor]}">${isolated ? "Solo" : "Isolate"}</button>
      </div>
    `;
  }).join("");
}

function toggleFloor(floor) {
  if (state.visibleFloors.has(floor)) {
    state.visibleFloors.delete(floor);
  } else {
    state.visibleFloors.add(floor);
  }
  const cleared = ensureSelectionsVisible();
  refreshAll({ rerenderDetail: true });
  const room = roomById(state.selectedRoomId);
  if (cleared) {
    announce(`Floor ${floor} hidden. Its room selection was cleared.`);
  } else if (room?.floor === floor) {
    announce(`${room.name} selected on floor ${floor}.`);
  } else {
    announce(`${state.visibleFloors.size} floors visible.`);
  }
}

function isolateFloor(floor) {
  state.visibleFloors = new Set([floor]);
  const cleared = ensureSelectionsVisible();
  refreshAll({ rerenderDetail: true });
  announce(cleared
    ? `Showing only floor ${floor}. The previous room selection was cleared.`
    : `Showing only floor ${floor}.`);
}

function showAllFloors() {
  state.visibleFloors = new Set([1, 2, 3]);
  refreshAll({ rerenderDetail: true });
  announce("All floors visible.");
}

function setMetric(metric) {
  if (metric === state.metric) return;
  state.metric = metric;
  refreshAll({ rerenderDetail: true });
  announce(`Rooms colored by ${metric === "intensity" ? "energy intensity in kilowatt-hours per square metre" : "total energy in kilowatt-hours"}.`);
}

function selectRoom(roomId, { source = "model", scrollTable = false } = {}) {
  if (!roomId) {
    state.selectedRoomId = null;
    scene?.setSelected(null);
    renderDetail();
    renderTable();
    announce("Room selection cleared.");
    return;
  }
  const room = roomById(roomId);
  if (!room || !state.visibleFloors.has(room.floor)) return;
  state.selectedRoomId = roomId;
  if (state.compareRoomId === roomId) {
    state.compareRoomId = visibleRooms().find((candidate) => candidate.id !== roomId)?.id ?? null;
  }
  scene?.setSelected(roomId);
  renderDetail();
  renderTable();
  if (scrollTable) {
    const row = elements.roomTableBody.querySelector(`[data-room-id="${roomId}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  announce(`${room.name}, floor ${room.floor}, selected${source === "table" ? " from the room table" : ""}.`);
}

function metricMetricLabel(partial) {
  if (state.metric === "intensity") return partial ? "Partial intensity" : "Intensity";
  return partial ? "Partial total" : "Total";
}

function roomAvatarColor(summary) {
  return colorForValue(metricValue(summary), state.scaleMax);
}

function completenessMarkup(summary) {
  if (summary.partial) {
    return `
      <div class="completeness-banner is-partial">
        <span class="completeness-icon">!</span>
        <span><strong>Partial interval.</strong> ${summary.available} of ${summary.expected} readings available. Missing readings are excluded from the total.</span>
      </div>
    `;
  }
  return `
    <div class="completeness-banner">
      <span class="completeness-icon">✓</span>
      <span><strong>Complete interval.</strong> ${summary.available} of ${summary.expected} hourly readings available.</span>
    </div>
  `;
}

function detailHeaderMarkup(summary) {
  const { room } = summary;
  const intensity = state.metric === "intensity";
  const metric = intensity ? metricValue(summary) : summary.total;
  const metricDigits = intensity ? formatIntensity(metric) : formatTotal(metric);
  const peak = summary.peak;
  const peakTime = peak ? formatPeakTime(peak.timestamp) : "No reading";
  const peakHour = peak ? new Date(peak.timestamp).getUTCHours() : 12;
  const afterHours = peak && (peakHour < 6 || peakHour >= 20);

  return `
    <header class="detail-header">
      <div class="room-avatar" style="background:${roomAvatarColor(summary)}">F${room.floor}</div>
      <div class="detail-title-block">
        <div class="detail-meta">
          <span>Floor ${room.floor}</span><span class="dot"></span>
          <span>${room.area} m²</span><span class="dot"></span>
          <span>${room.id}</span>
        </div>
        <h2>${room.name}</h2>
        <p class="detail-description">${room.description}</p>
      </div>
      <button type="button" class="clear-button" data-clear-selection aria-label="Clear room selection">×</button>
    </header>
    <div class="detail-metrics">
      <div class="detail-metric">
        <span>${metricMetricLabel(summary.partial)}</span>
        <strong>${metricDigits}</strong>
        <small>${state.unit} · ${summary.available}/${summary.expected} readings</small>
      </div>
      <div class="detail-metric">
        <span>Intensity</span>
        <strong>${formatIntensity(summary.intensity)}</strong>
        <small>kWh/m² · ${room.area} m²</small>
      </div>
      <div class="detail-metric">
        <span>Peak hour</span>
        <strong>${peak ? formatNumber(peak.kwh, 2) : "—"}</strong>
        <small>${peakTime}${afterHours ? " · after hours" : ""}</small>
      </div>
    </div>
    ${completenessMarkup(summary)}
    <div class="detail-tabs" role="tablist" aria-label="Room analysis view">
      <button type="button" class="detail-tab ${state.view === "hourly" ? "is-active" : ""}" data-view="hourly" role="tab" aria-selected="${state.view === "hourly"}">Hourly profile</button>
      <button type="button" class="detail-tab ${state.view === "compare" ? "is-active" : ""}" data-view="compare" role="tab" aria-selected="${state.view === "compare"}">Compare rooms</button>
    </div>
  `;
}

function roomOptions(selectedId) {
  return visibleRooms().map((room) => `
    <option value="${room.id}" ${room.id === selectedId ? "selected" : ""}>${room.name} · F${room.floor}</option>
  `).join("");
}

function ensureCompareRoom() {
  const candidates = visibleRooms();
  if (!candidates.length) {
    state.compareRoomId = null;
    return;
  }
  if (!candidates.some((room) => room.id === state.compareRoomId) || state.compareRoomId === state.selectedRoomId) {
    state.compareRoomId = candidates.find((room) => room.id !== state.selectedRoomId)?.id ?? candidates[0].id;
  }
}

function comparePanelMarkup(summary) {
  ensureCompareRoom();
  const compareSummary = state.summaries.get(state.compareRoomId);
  return `
    <div class="chart-panel">
      <div class="compare-pickers">
        <label class="compare-picker">
          <span><i class="series-key a"></i>Room A</span>
          <select data-compare-slot="a" aria-label="First comparison room">${roomOptions(state.selectedRoomId)}</select>
        </label>
        <span class="compare-versus">VS</span>
        <label class="compare-picker">
          <span><i class="series-key b"></i>Room B</span>
          <select data-compare-slot="b" aria-label="Second comparison room">${roomOptions(state.compareRoomId)}</select>
        </label>
      </div>
      <div class="chart-canvas" id="selectedChart"></div>
      <div class="compare-summary">
        <span><strong>A</strong> ${formatTotal(summary.total)} kWh${summary.partial ? ` · ${summary.available}/${summary.expected}` : ""}</span>
        <span><strong>B</strong> ${compareSummary ? `${formatTotal(compareSummary.total)} kWh${compareSummary.partial ? ` · ${compareSummary.available}/${compareSummary.expected}` : ""}` : "No room"}</span>
      </div>
    </div>
  `;
}

function hourlyPanelMarkup(summary) {
  return `
    <div class="chart-panel">
      <div class="chart-title-row">
        <strong>Hourly energy · kWh</strong>
        <span>${rangeShortLabel()} · ${summary.available}/${summary.expected} readings</span>
      </div>
      <div class="chart-canvas" id="selectedChart"></div>
    </div>
  `;
}

function renderDetail() {
  const summary = state.summaries.get(state.selectedRoomId);
  if (!summary) {
    elements.detailContent.innerHTML = `
      <div class="detail-empty">
        <div>
          <div class="empty-orbit" aria-hidden="true"></div>
          <h2>No room selected</h2>
          <p>Pick a room in the 3D cutaway or choose a row in the room table to inspect its hourly readings.</p>
        </div>
      </div>
    `;
    return;
  }

  elements.detailContent.innerHTML = `
    ${detailHeaderMarkup(summary)}
    ${state.view === "compare" ? comparePanelMarkup(summary) : hourlyPanelMarkup(summary)}
  `;

  const chartContainer = elements.detailContent.querySelector("#selectedChart");
  if (!chartContainer) return;
  if (state.view === "compare") {
    const first = state.summaries.get(state.selectedRoomId);
    const second = state.summaries.get(state.compareRoomId);
    renderCompareChart(chartContainer, [first, second], { unit: "kWh" });
  } else {
    renderHourlyChart(chartContainer, summary, { unit: "kWh" });
  }
}

function sortedVisibleSummaries() {
  const summaries = visibleRooms().map((room) => state.summaries.get(room.id));
  const direction = state.sortDirection === "asc" ? 1 : -1;
  return summaries.sort((a, b) => {
    let valueA;
    let valueB;
    switch (state.sortKey) {
      case "name":
        valueA = a.room.name.toLowerCase();
        valueB = b.room.name.toLowerCase();
        break;
      case "floor":
        valueA = a.room.floor;
        valueB = b.room.floor;
        break;
      case "area":
        valueA = a.room.area;
        valueB = b.room.area;
        break;
      case "intensity":
        valueA = a.intensity;
        valueB = b.intensity;
        break;
      case "completeness":
        valueA = a.completeness;
        valueB = b.completeness;
        break;
      case "total":
      default:
        valueA = a.total;
        valueB = b.total;
        break;
    }
    if (typeof valueA === "string") return valueA.localeCompare(valueB) * direction;
    return (valueA - valueB) * direction;
  });
}

function syncSortHeaders() {
  document.querySelectorAll("[data-sort]").forEach((button) => {
    const active = button.dataset.sort === state.sortKey;
    button.classList.toggle("is-sorted", active);
    const arrow = button.querySelector("span");
    arrow.textContent = active ? (state.sortDirection === "asc" ? "↑" : "↓") : "↕";
    const header = button.closest("th");
    if (header) {
      header.setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
    }
  });
}

function renderTable() {
  const summaries = sortedVisibleSummaries();
  elements.tableSummary.textContent = `${summaries.length} room${summaries.length === 1 ? "" : "s"} · ${rangeLength()} intervals · ${state.unit}`;

  if (!summaries.length) {
    elements.roomTableBody.innerHTML = `<tr><td colspan="6" style="padding:30px 16px;color:#849bac;text-align:center;">No rooms are visible. Show a floor to restore the table.</td></tr>`;
    syncSortHeaders();
    return;
  }

  elements.roomTableBody.innerHTML = summaries.map((summary) => {
    const { room } = summary;
    const selected = room.id === state.selectedRoomId;
    const color = colorForValue(metricValue(summary), state.scaleMax);
    return `
      <tr data-room-id="${room.id}" class="${selected ? "is-selected" : ""}" tabindex="0" aria-selected="${selected}" aria-label="${room.name}, floor ${room.floor}, ${formatTotal(summary.total)} kilowatt-hours, ${summary.available} of ${summary.expected} readings">
        <td>
          <div class="room-name-cell">
            <span class="room-color-chip" style="background:${color}"></span>
            <div class="room-name-copy">
              <strong>${room.name}</strong>
              <small>${room.id}</small>
            </div>
          </div>
        </td>
        <td class="mono-cell">F0${room.floor}</td>
        <td class="mono-cell">${room.area} m²</td>
        <td class="energy-cell">
          <strong>${formatTotal(summary.total)}</strong> <small>kWh${summary.partial ? " · partial" : ""}</small>
        </td>
        <td class="energy-cell">
          <strong>${formatIntensity(summary.intensity)}</strong> <small>kWh/m²</small>
        </td>
        <td>
          <span class="status-pill ${summary.partial ? "is-partial" : ""}">${summary.partial ? "Partial" : "Complete"} · ${summary.available}/${summary.expected}</span>
        </td>
      </tr>
    `;
  }).join("");
  syncSortHeaders();
}

function updateVisibleCount() {
  const count = visibleRooms().length;
  elements.roomCountLabel.textContent = `${count} room${count === 1 ? "" : "s"} visible`;
}

function refreshAll({ rerenderDetail: shouldRenderDetail = true } = {}) {
  ensureSelectionsVisible();
  recomputeSummaries();
  syncRangeControls();
  syncFloorControls();
  updateLegend();
  updateVisibleCount();
  scene?.setData({
    summaries: state.summaries,
    maxValue: state.scaleMax,
    metric: state.metric,
    unit: state.unit,
  });
  scene?.setVisibleFloors(state.visibleFloors);
  scene?.setSelected(state.selectedRoomId);
  if (shouldRenderDetail) renderDetail();
  renderTable();
  document.querySelectorAll("[data-metric]").forEach((button) => {
    const active = button.dataset.metric === state.metric;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active);
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadCsv() {
  const summaries = sortedVisibleSummaries();
  const start = INTERVALS[state.startIndex].timestamp;
  const end = INTERVALS[state.endIndex].timestamp;
  const headers = [
    "dataset_label",
    "room_id",
    "room_name",
    "floor",
    "floor_area_m2",
    "range_start_utc",
    "range_end_utc",
    "total_energy_kwh",
    "energy_intensity_kwh_per_m2",
    "readings_available",
    "readings_expected",
    "completeness_percent",
    "missing_readings",
    "data_status",
  ];
  const rows = summaries.map((summary) => [
    "Sample data",
    summary.room.id,
    summary.room.name,
    summary.room.floor,
    summary.room.area,
    start,
    end,
    summary.total.toFixed(3),
    summary.intensity.toFixed(4),
    summary.available,
    summary.expected,
    (summary.completeness * 100).toFixed(1),
    summary.missing,
    summary.partial ? "Partial" : "Complete",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sample-room-summaries_${start.slice(0, 10)}_${end.slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = `CSV exported · ${rows.length} room summaries · units and completeness included`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
  announce(`CSV downloaded with ${rows.length} room summaries.`);
}

function attachEvents() {
  document.querySelectorAll("[data-range-days]").forEach((button) => {
    button.addEventListener("click", () => setPresetRange(Number(button.dataset.rangeDays)));
  });
  elements.startDate.addEventListener("change", applyDateRange);
  elements.endDate.addEventListener("change", applyDateRange);

  document.querySelectorAll("[data-metric]").forEach((button) => {
    button.addEventListener("click", () => setMetric(button.dataset.metric));
  });

  elements.floorList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-floor]");
    if (!row) return;
    const floor = Number(row.dataset.floor);
    if (event.target.closest(".eye-button")) toggleFloor(floor);
    if (event.target.closest(".solo-button") && !event.target.closest(".solo-button").disabled) isolateFloor(floor);
  });
  elements.showAllFloors.addEventListener("click", showAllFloors);

  elements.detailCard.addEventListener("click", (event) => {
    if (event.target.closest("[data-clear-selection]")) {
      selectRoom(null);
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      renderDetail();
      announce(state.view === "compare" ? "Comparison view opened." : "Hourly profile view opened.");
    }
  });

  elements.detailCard.addEventListener("change", (event) => {
    const select = event.target.closest("[data-compare-slot]");
    if (!select) return;
    if (select.dataset.compareSlot === "a") {
      selectRoom(select.value);
    } else {
      state.compareRoomId = select.value;
      renderDetail();
      announce(`Second comparison room set to ${roomById(select.value)?.name ?? "none"}.`);
    }
  });

  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = key === "name" || key === "floor" ? "asc" : "desc";
      }
      renderTable();
    });
  });

  elements.roomTableBody.addEventListener("click", (event) => {
    const row = event.target.closest("[data-room-id]");
    if (row) selectRoom(row.dataset.roomId, { source: "table", scrollTable: true });
  });
  elements.roomTableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-room-id]");
    if (!row) return;
    event.preventDefault();
    selectRoom(row.dataset.roomId, { source: "table", scrollTable: true });
  });

  elements.exportCsv.addEventListener("click", downloadCsv);
}

function initScene() {
  try {
    scene = new BuildingScene(elements.buildingStage, {
      rooms: ROOMS,
      onRoomSelect: (roomId) => selectRoom(roomId, { source: "model", scrollTable: true }),
    });
  } catch (error) {
    console.error("Unable to initialise the 3D building.", error);
    const message = document.createElement("div");
    message.className = "scene-error";
    message.innerHTML = "<strong>3D view unavailable</strong><span>The room table and charts still use the bundled sample data.</span>";
    elements.buildingStage.appendChild(message);
  }
}

function init() {
  initScene();
  attachEvents();
  refreshAll({ rerenderDetail: true });
  announce("Sample energy dashboard loaded. Thursday November 6 is selected and the Finance Office overnight peak is highlighted.");
}

init();
