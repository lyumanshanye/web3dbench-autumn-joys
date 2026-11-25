export const ENERGY_PALETTE = [
  { stop: 0, color: "#286b78" },
  { stop: 0.36, color: "#2fb79b" },
  { stop: 0.67, color: "#e7c35a" },
  { stop: 1, color: "#ed7351" },
];

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function colorForRatio(ratio) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  let left = ENERGY_PALETTE[0];
  let right = ENERGY_PALETTE[ENERGY_PALETTE.length - 1];

  for (let index = 0; index < ENERGY_PALETTE.length - 1; index += 1) {
    if (clamped >= ENERGY_PALETTE[index].stop && clamped <= ENERGY_PALETTE[index + 1].stop) {
      left = ENERGY_PALETTE[index];
      right = ENERGY_PALETTE[index + 1];
      break;
    }
  }

  const span = right.stop - left.stop || 1;
  const position = (clamped - left.stop) / span;
  const start = hexToRgb(left.color);
  const end = hexToRgb(right.color);
  const channels = start.map((channel, index) => Math.round(channel + (end[index] - channel) * position));
  return `rgb(${channels.join(", ")})`;
}

export function colorForValue(value, maxValue) {
  return colorForRatio(maxValue > 0 ? value / maxValue : 0);
}

export function paletteGradient(direction = "90deg") {
  const stops = ENERGY_PALETTE.map((entry) => `${entry.color} ${Math.round(entry.stop * 100)}%`).join(", ");
  return `linear-gradient(${direction}, ${stops})`;
}

export function niceMaximum(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 1.5 ? 1.5 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
