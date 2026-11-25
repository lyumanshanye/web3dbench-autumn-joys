import { colorForValue, niceMaximum } from "./scale.js";

const WIDTH = 560;
const HEIGHT = 280;
const MARGIN = { top: 25, right: 15, bottom: 36, left: 52 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timeLabel(timestamp, includeDate = false) {
  const date = new Date(timestamp);
  if (includeDate) {
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", timeZone: "UTC" });
  }
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}

function fullLabel(timestamp) {
  return new Date(timestamp).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatEnergy(value, digits = 1) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function ensureTooltip(container) {
  let tooltip = container.querySelector(".chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    container.appendChild(tooltip);
  }
  return tooltip;
}

function attachmentTooltip(container, payload) {
  const tooltip = ensureTooltip(container);
  const hide = () => tooltip.classList.remove("is-visible");
  container.addEventListener("pointerleave", hide);
  container.addEventListener("pointermove", (event) => {
    const target = event.target.closest?.("[data-chart-index]");
    if (!target) {
      hide();
      return;
    }
    const index = Number(target.dataset.chartIndex);
    const series = target.dataset.series;
    const entry = series ? payload.series?.[series]?.[index] : payload.entries?.[index];
    if (!entry) {
      hide();
      return;
    }
    const bounds = container.getBoundingClientRect();
    const x = Math.min(bounds.width - 175, Math.max(8, event.clientX - bounds.left + 14));
    const y = Math.min(bounds.height - 80, Math.max(8, event.clientY - bounds.top + 12));
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
    tooltip.classList.add("is-visible");

    if (payload.combined) {
      const a = entry.a?.kwh;
      const b = entry.b?.kwh;
      tooltip.innerHTML = `
        <span>${escapeHtml(fullLabel(entry.timestamp))}</span>
        <strong><i class="tooltip-series a"></i>${escapeHtml(payload.names.a)}</strong>
        <b>${a === null ? "Missing" : `${formatEnergy(a, 2)} kWh`}</b>
        <strong><i class="tooltip-series b"></i>${escapeHtml(payload.names.b)}</strong>
        <b>${b === null ? "Missing" : `${formatEnergy(b, 2)} kWh`}</b>
      `;
    } else if (series) {
      const item = entry;
      tooltip.innerHTML = item.kwh === null
        ? `<span>${escapeHtml(fullLabel(item.timestamp))}</span><strong>${escapeHtml(payload.names[series])}</strong><em>Missing reading</em>`
        : `<span>${escapeHtml(fullLabel(item.timestamp))}</span><strong>${escapeHtml(payload.names[series])}</strong><b>${formatEnergy(item.kwh, 2)} kWh</b>`;
    } else {
      tooltip.innerHTML = entry.kwh === null
        ? `<span>${escapeHtml(fullLabel(entry.timestamp))}</span><strong>Missing reading</strong><em>Not counted in total</em>`
        : `<span>${escapeHtml(fullLabel(entry.timestamp))}</span><strong>${formatEnergy(entry.kwh, 2)} kWh</strong><em>${escapeHtml(payload.roomName)}</em>`;
    }
  });
}

function axisDates(entries) {
  if (entries.length <= 1) return [];
  const first = new Date(entries[0].timestamp);
  const last = new Date(entries[entries.length - 1].timestamp);
  const sameDay = first.toISOString().slice(0, 10) === last.toISOString().slice(0, 10);
  if (sameDay) {
    return [0, 6, 12, 18, entries.length - 1].filter((index, position, list) => list.indexOf(index) === position);
  }
  const markers = [];
  let lastDay = "";
  entries.forEach((entry, index) => {
    const day = entry.timestamp.slice(0, 10);
    if (day !== lastDay && (lastDay === "" || index < entries.length - 4)) {
      markers.push(index);
      lastDay = day;
    }
  });
  return markers;
}

function xTickLabel(entries, index, multiDay) {
  if (!entries.length) return "";
  if (multiDay) return timeLabel(entries[index].timestamp, true);
  return timeLabel(entries[index].timestamp);
}

function gridMarkup(maxValue, plotHeight, unit) {
  const lines = [0, 0.25, 0.5, 0.75, 1];
  return lines.map((ratio) => {
    const y = MARGIN.top + PLOT_HEIGHT - ratio * plotHeight;
    const value = maxValue * ratio;
    const digits = maxValue < 2 ? 2 : maxValue < 20 ? 1 : 0;
    return `
      <line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${y}" y2="${y}" class="chart-grid-line ${ratio === 0 ? "is-base" : ""}" />
      <text x="${MARGIN.left - 9}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${formatEnergy(value, digits)}</text>
    `;
  }).join("") + `<text x="${MARGIN.left}" y="12" class="chart-unit-label">${escapeHtml(unit)}</text>`;
}

function dateMarkup(entries, xForIndex, multiDay) {
  const markers = axisDates(entries);
  return markers.map((index) => {
    const x = xForIndex(index);
    const anchor = index === 0 ? "start" : index === entries.length - 1 ? "end" : "middle";
    return `
      <line x1="${x}" x2="${x}" y1="${MARGIN.top}" y2="${MARGIN.top + PLOT_HEIGHT}" class="chart-day-line" />
      <text x="${x}" y="${HEIGHT - 11}" text-anchor="${anchor}" class="chart-axis-label">${escapeHtml(xTickLabel(entries, index, multiDay))}</text>
    `;
  }).join("");
}

function peakMarkup(entry, xForIndex, yForValue, peakIndex, multiDay) {
  if (!entry || entry.kwh === null) return "";
  const x = xForIndex(peakIndex);
  const y = yForValue(entry.kwh);
  return `
    <line x1="${x}" x2="${x}" y1="${MARGIN.top}" y2="${y - 6}" class="chart-peak-line" />
    <circle cx="${x}" cy="${y}" r="4" class="chart-peak-dot" />
    <g class="chart-peak-label">
      <rect x="${Math.min(WIDTH - 155, x + 9)}" y="${Math.max(MARGIN.top, y - 24)}" width="137" height="24" rx="5" />
      <text x="${Math.min(WIDTH - 145, x + 18)}" y="${Math.max(MARGIN.top + 16, y - 8)}">${escapeHtml(multiDay ? timeLabel(entry.timestamp, true) : timeLabel(entry.timestamp))} · ${formatEnergy(entry.kwh, 2)} kWh</text>
    </g>
  `;
}

export function renderHourlyChart(container, summary, { unit = "kWh" } = {}) {
  const entries = summary?.readings ?? [];
  if (!entries.length) {
    container.innerHTML = '<div class="chart-empty">No intervals in this range.</div>';
    return;
  }

  const availableValues = entries.filter((entry) => entry.kwh !== null).map((entry) => entry.kwh);
  const rawMax = Math.max(0.05, ...availableValues);
  const maxValue = niceMaximum(rawMax * 1.1);
  const plotHeight = PLOT_HEIGHT;
  const step = PLOT_WIDTH / entries.length;
  const barWidth = Math.max(1.4, step * 0.68);
  const xForIndex = (index) => MARGIN.left + step * (index + 0.5);
  const yForValue = (value) => MARGIN.top + PLOT_HEIGHT - (value / maxValue) * plotHeight;
  const multiDay = new Date(entries[0].timestamp).toISOString().slice(0, 10) !== new Date(entries.at(-1).timestamp).toISOString().slice(0, 10);
  const peakIndex = summary?.peak ? entries.findIndex((entry) => entry.timestamp === summary.peak.timestamp) : -1;

  const bars = entries.map((entry, index) => {
    const x = xForIndex(index);
    if (entry.kwh === null) {
      return `
        <rect x="${x - barWidth / 2}" y="${MARGIN.top}" width="${barWidth}" height="${PLOT_HEIGHT}" class="chart-missing-col" />
        <line x1="${x}" x2="${x}" y1="${MARGIN.top + PLOT_HEIGHT * 0.35}" y2="${MARGIN.top + PLOT_HEIGHT * 0.65}" class="chart-missing-mark" />
      `;
    }
    const y = yForValue(entry.kwh);
    const height = Math.max(1, MARGIN.top + PLOT_HEIGHT - y);
    return `<rect x="${x - barWidth / 2}" y="${y}" width="${barWidth}" height="${height}" rx="${Math.min(2, barWidth / 4)}" fill="${colorForValue(entry.kwh, maxValue)}" class="chart-bar" />`;
  }).join("");

  const hits = entries.map((entry, index) => {
    const x = MARGIN.left + step * index;
    return `<rect x="${x}" y="${MARGIN.top}" width="${Math.max(step, 1)}" height="${PLOT_HEIGHT}" data-chart-index="${index}" class="chart-hit" />`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="energy-chart" role="img" aria-label="Hourly energy chart for ${escapeHtml(summary.room.name)}">
      <defs>
        <pattern id="missingHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(250, 211, 123, 0.62)" stroke-width="2" />
        </pattern>
      </defs>
      ${gridMarkup(maxValue, plotHeight, unit)}
      ${dateMarkup(entries, xForIndex, multiDay)}
      ${bars}
      ${peakMarkup(summary.peak, xForIndex, yForValue, peakIndex, multiDay)}
      <line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${MARGIN.top + PLOT_HEIGHT}" y2="${MARGIN.top + PLOT_HEIGHT}" class="chart-baseline" />
      ${hits}
    </svg>
  `;
  attachmentTooltip(container, { entries, roomName: summary.room.name });
}

function linePath(series, xForIndex, yForValue) {
  let path = "";
  let penDown = false;
  series.forEach((entry, index) => {
    if (entry.kwh === null) {
      penDown = false;
      return;
    }
    const x = xForIndex(index);
    const y = yForValue(entry.kwh);
    path += `${penDown ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
    penDown = true;
  });
  return path.trim();
}

export function renderCompareChart(container, summaries, { unit = "kWh" } = {}) {
  const first = summaries[0];
  const second = summaries[1];
  if (!first || !second) {
    container.innerHTML = '<div class="chart-empty">Choose two rooms to compare.</div>';
    return;
  }

  const entries = first.readings.map((reading, index) => ({ timestamp: reading.timestamp, index }));
  const values = [
    ...first.readings.map((entry) => entry.kwh),
    ...second.readings.map((entry) => entry.kwh),
  ].filter((value) => value !== null);
  const maxValue = niceMaximum(Math.max(0.05, ...values) * 1.08);
  const step = PLOT_WIDTH / entries.length;
  const xForIndex = (index) => MARGIN.left + step * (index + 0.5);
  const yForValue = (value) => MARGIN.top + PLOT_HEIGHT - (value / maxValue) * PLOT_HEIGHT;
  const multiDay = new Date(entries[0].timestamp).toISOString().slice(0, 10) !== new Date(entries.at(-1).timestamp).toISOString().slice(0, 10);
  const paths = [linePath(first.readings, xForIndex, yForValue), linePath(second.readings, xForIndex, yForValue)];
  const series = [first.readings, second.readings];

  const points = series.map((roomSeries, seriesIndex) => roomSeries.map((entry, index) => {
    if (entry.kwh === null) {
      return `<rect x="${xForIndex(index) - 2}" y="${MARGIN.top + PLOT_HEIGHT - 12}" width="4" height="12" class="chart-missing-mark series-${seriesIndex + 1}" />`;
    }
    return `<circle cx="${xForIndex(index)}" cy="${yForValue(entry.kwh)}" r="2.4" class="chart-series-dot series-${seriesIndex + 1}" />`;
  }).join("")).join("");

  const hits = entries.map((entry, index) => {
    const x = MARGIN.left + step * index;
    return `<rect x="${x}" y="${MARGIN.top}" width="${Math.max(step, 1)}" height="${PLOT_HEIGHT}" data-chart-index="${index}" class="chart-hit" />`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="energy-chart compare-chart" role="img" aria-label="Shared hourly chart comparing ${escapeHtml(first.room.name)} and ${escapeHtml(second.room.name)}">
      <defs>
        <linearGradient id="seriesAFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f1c45d" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#f1c45d" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="seriesBFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4fd4bb" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#4fd4bb" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridMarkup(maxValue, PLOT_HEIGHT, unit)}
      ${dateMarkup(entries, xForIndex, multiDay)}
      <path d="${paths[0]}" class="chart-series-line series-1" />
      <path d="${paths[1]}" class="chart-series-line series-2" />
      ${points}
      <line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${MARGIN.top + PLOT_HEIGHT}" y2="${MARGIN.top + PLOT_HEIGHT}" class="chart-baseline" />
      ${hits}
    </svg>
  `;
  attachmentTooltip(container, {
    combined: true,
    entries: entries.map((entry, index) => ({
      timestamp: entry.timestamp,
      a: first.readings[index],
      b: second.readings[index],
    })),
    names: { a: first.room.name, b: second.room.name },
  });
}
