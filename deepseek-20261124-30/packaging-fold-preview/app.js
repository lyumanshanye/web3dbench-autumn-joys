import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const STARTER = {
  dimensions: { w: 110, d: 65, h: 80 },
  shopName: 'PAPER & PINE',
  colors: {
    front: '#c95f46',
    back: '#23463d',
    sides: '#e6c56e',
    lid: '#f0e6d2'
  },
  fold: 64
};

const SAMPLE = {
  dimensions: { w: 96, d: 58, h: 112 },
  shopName: 'NORTH & FOLD',
  colors: {
    front: '#365f78',
    back: '#d4774f',
    sides: '#e8d7ac',
    lid: '#f3eee3'
  },
  fold: 72
};

const state = {
  dimensions: { ...STARTER.dimensions },
  shopName: STARTER.shopName,
  colors: { ...STARTER.colors },
  selected: 'front',
  fold: STARTER.fold,
  foldTarget: STARTER.fold
};

const CATEGORY_LABELS = {
  front: 'Front',
  back: 'Back',
  sides: 'Sides',
  lid: 'Lid'
};

const PANEL_INFO = {
  front: { name: 'Front panel', category: 'front', dimension: 'w', description: 'exterior print' },
  back: { name: 'Back panel', category: 'back', dimension: 'w', description: 'exterior print' },
  left: { name: 'Left side panel', category: 'sides', dimension: 'd', description: 'exterior print' },
  right: { name: 'Right side panel', category: 'sides', dimension: 'd', description: 'exterior print' },
  lid: { name: 'Lid panel', category: 'lid', dimension: 'lid', description: 'top print' }
};

const dom = {
  width: document.getElementById('dimWidth'),
  depth: document.getElementById('dimDepth'),
  height: document.getElementById('dimHeight'),
  shopName: document.getElementById('shopName'),
  foldRange: document.getElementById('foldRange'),
  foldReadout: document.getElementById('foldReadout'),
  floatFold: document.getElementById('floatFold'),
  floatFoldSub: document.getElementById('floatFoldSub'),
  playFold: document.getElementById('playFold'),
  activeCategory: document.getElementById('activeCategory'),
  dielineMount: document.getElementById('dielineMount'),
  dielineSize: document.getElementById('dielineSize'),
  selectionSwatch: document.getElementById('selectionSwatch'),
  selectionName: document.getElementById('selectionName'),
  selectionDimensions: document.getElementById('selectionDimensions'),
  selectedBadge: document.getElementById('selectedBadge'),
  specWidth: document.getElementById('specWidth'),
  specDepth: document.getElementById('specDepth'),
  specHeight: document.getElementById('specHeight'),
  resetCamera: document.getElementById('resetCamera'),
  viewerStage: document.getElementById('viewerStage'),
  threeCanvas: document.getElementById('threeCanvas'),
  exportSvg: document.getElementById('exportSvg'),
  sampleDesign: document.getElementById('sampleDesign'),
  resetDesign: document.getElementById('resetDesign'),
  toast: document.getElementById('toast')
};

const colorInputs = {
  front: document.getElementById('colorFront'),
  back: document.getElementById('colorBack'),
  sides: document.getElementById('colorSides'),
  lid: document.getElementById('colorLid')
};

const swatches = [...document.querySelectorAll('.swatch')];

let dimensionTimer = 0;
let visualTimer = 0;
let toastTimer = 0;
let foldAnimation = null;
let introPlayed = false;
let model = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function segment(value, start, end) {
  return clamp((value - start) / (end - start), 0, 1);
}

function fixed(value, places = 2) {
  return Number(value).toFixed(places).replace(/\.?0+$/, '');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function shopLabel() {
  const value = state.shopName.trim();
  return (value || 'YOUR SHOP').toUpperCase();
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((character) => character + character).join('')
    : clean;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a, b, amount) {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  return rgbToHex(
    lerp(first.r, second.r, amount),
    lerp(first.g, second.g, amount),
    lerp(first.b, second.b, amount)
  );
}

function contrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? '#1d2b26' : '#fff8ec';
}

function metrics() {
  const { w, d, h } = state.dimensions;
  const glue = clamp(w * 0.1, 10, 16);
  const tuck = clamp(d * 0.27, 13, 20);
  const x0 = 0;
  const x1 = glue;
  const x2 = x1 + d;
  const x3 = x2 + w;
  const x4 = x3 + d;
  const x5 = x4 + w;
  return {
    w, d, h, glue, tuck,
    x0, x1, x2, x3, x4, x5,
    yTop: 0,
    yBottom: h,
    yLid: -d,
    yTuck: -d - tuck,
    yBase: h + d,
    yBaseTuck: h + d + tuck,
    totalWidth: x5,
    totalHeight: h + 2 * d + 2 * tuck
  };
}

function panelSpecs(m = metrics()) {
  return [
    { id: 'glue', select: 'left', category: 'sides', artKind: 'glue', x: m.x0, y: m.yTop, w: m.x1 - m.x0, h: m.h },
    { id: 'left', select: 'left', category: 'sides', artKind: 'side', x: m.x1, y: m.yTop, w: m.d, h: m.h },
    { id: 'front', select: 'front', category: 'front', artKind: 'front', x: m.x2, y: m.yTop, w: m.w, h: m.h },
    { id: 'right', select: 'right', category: 'sides', artKind: 'side', x: m.x3, y: m.yTop, w: m.d, h: m.h },
    { id: 'back', select: 'back', category: 'back', artKind: 'back', x: m.x4, y: m.yTop, w: m.w, h: m.h },
    { id: 'lid', select: 'lid', category: 'lid', artKind: 'lid', x: m.x4, y: m.yLid, w: m.w, h: m.d },
    { id: 'tuck', select: 'lid', category: 'lid', artKind: 'tuck', x: m.x4, y: m.yTuck, w: m.w, h: m.tuck },
    { id: 'base', select: 'front', category: 'sides', artKind: 'base', x: m.x2, y: m.h, w: m.w, h: m.d },
    { id: 'baseTuck', select: 'front', category: 'sides', artKind: 'baseTuck', x: m.x2, y: m.yBase, w: m.w, h: m.tuck }
  ];
}

function fitTextAttrs(text, fontSize, maxWidth) {
  const estimated = text.length * fontSize * 0.62;
  if (estimated <= maxWidth) return '';
  return `textLength="${fixed(maxWidth)}" lengthAdjust="spacingAndGlyphs"`;
}

function flowerMark(cx, cy, radius, color, opacity = 1, strokeWidth = 0.55) {
  const k = radius * 0.29;
  const path = [
    `M ${fixed(cx)} ${fixed(cy - radius)}`,
    `C ${fixed(cx + k)} ${fixed(cy - radius * 0.34)} ${fixed(cx + radius * 0.34)} ${fixed(cy - k)} ${fixed(cx + radius)} ${fixed(cy)}`,
    `C ${fixed(cx + radius * 0.34)} ${fixed(cy + k)} ${fixed(cx + k)} ${fixed(cy + radius * 0.34)} ${fixed(cx)} ${fixed(cy + radius)}`,
    `C ${fixed(cx - k)} ${fixed(cy + radius * 0.34)} ${fixed(cx - radius * 0.34)} ${fixed(cy + k)} ${fixed(cx - radius)} ${fixed(cy)}`,
    `C ${fixed(cx - radius * 0.34)} ${fixed(cy - k)} ${fixed(cx - k)} ${fixed(cy - radius * 0.34)} ${fixed(cx)} ${fixed(cy - radius)}`,
    'Z'
  ].join(' ');
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/><circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${fixed(radius * 0.13)}" fill="${color}" opacity="${opacity}"/>`;
}

function artworkMarkup(spec) {
  const bg = state.colors[spec.category];
  const fg = contrastColor(bg);
  const width = spec.w;
  const height = spec.h;
  const min = Math.min(width, height);
  const margin = Math.max(2.5, min * 0.055);
  const name = escapeXml(shopLabel());
  const nameSize = clamp(height * 0.108, 3.9, 11.5);
  const subtitleSize = clamp(height * 0.035, 2.1, 3.9);
  const microSize = clamp(min * 0.041, 1.9, 3.3);
  const soft = mixHex(bg, fg, 0.14);
  const strong = mixHex(bg, fg, 0.32);
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  const base = `<rect width="${fixed(width)}" height="${fixed(height)}" fill="${bg}"/>`;

  if (spec.artKind === 'front') {
    const markY = height * 0.315;
    const markR = Math.min(width * 0.072, height * 0.12);
    const nameY = height * 0.575;
    const nameAttrs = fitTextAttrs(name, nameSize, innerW * 0.9);
    return `${base}
      <rect x="${fixed(margin)}" y="${fixed(margin)}" width="${fixed(innerW)}" height="${fixed(innerH)}" fill="none" stroke="${fg}" stroke-width="0.42" opacity="0.55"/>
      <rect x="${fixed(margin + 1.5)}" y="${fixed(margin + 1.5)}" width="${fixed(innerW - 3)}" height="${fixed(innerH - 3)}" fill="none" stroke="${fg}" stroke-width="0.26" opacity="0.22"/>
      <g opacity="0.9">${flowerMark(width / 2, markY, markR, fg, 0.9, 0.48)}<circle cx="${fixed(width / 2)}" cy="${fixed(markY)}" r="${fixed(markR * 1.45)}" fill="none" stroke="${fg}" stroke-width="0.3" opacity="0.5"/></g>
      <text x="${fixed(width / 2)}" y="${fixed(nameY)}" text-anchor="middle" fill="${fg}" font-family="Georgia, 'Times New Roman', serif" font-size="${fixed(nameSize)}" letter-spacing="0.45" ${nameAttrs}>${name}</text>
      <text x="${fixed(width / 2)}" y="${fixed(nameY + subtitleSize * 1.65)}" text-anchor="middle" fill="${fg}" opacity="0.72" font-size="${fixed(subtitleSize)}" font-weight="700" letter-spacing="0.72">STATIONERY &amp; SMALL GOODS</text>
      <line x1="${fixed(width * 0.34)}" y1="${fixed(height * 0.72)}" x2="${fixed(width * 0.66)}" y2="${fixed(height * 0.72)}" stroke="${fg}" stroke-width="0.3" opacity="0.5"/>
      <text x="${fixed(margin + 1.5)}" y="${fixed(height - margin - 1.2)}" fill="${fg}" opacity="0.62" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="0.8">FRONT / 01</text>
      <text x="${fixed(width - margin - 1.5)}" y="${fixed(height - margin - 1.2)}" text-anchor="end" fill="${fg}" opacity="0.62" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="0.8">EST. 2024</text>`;
  }

  if (spec.artKind === 'back') {
    const nameAttrs = fitTextAttrs(name, nameSize, innerW * 0.9);
    return `${base}
      <rect x="${fixed(margin)}" y="${fixed(margin)}" width="${fixed(innerW)}" height="${fixed(innerH)}" fill="none" stroke="${fg}" stroke-width="0.42" opacity="0.5"/>
      <circle cx="${fixed(width / 2)}" cy="${fixed(height * 0.35)}" r="${fixed(min * 0.092)}" fill="none" stroke="${fg}" stroke-width="0.45" opacity="0.65"/>
      ${flowerMark(width / 2, height * 0.35, min * 0.058, fg, 0.78, 0.38)}
      <text x="${fixed(width / 2)}" y="${fixed(height * 0.58)}" text-anchor="middle" fill="${fg}" font-family="Georgia, 'Times New Roman', serif" font-size="${fixed(nameSize * 0.9)}" letter-spacing="0.4" ${nameAttrs}>${name}</text>
      <text x="${fixed(width / 2)}" y="${fixed(height * 0.665)}" text-anchor="middle" fill="${fg}" opacity="0.7" font-size="${fixed(subtitleSize)}" font-weight="700" letter-spacing="0.8">DESIGNED TO BE KEPT</text>
      <line x1="${fixed(width * 0.2)}" y1="${fixed(height * 0.77)}" x2="${fixed(width * 0.8)}" y2="${fixed(height * 0.77)}" stroke="${fg}" stroke-width="0.28" opacity="0.34"/>
      <text x="${fixed(width / 2)}" y="${fixed(height - margin - 1.2)}" text-anchor="middle" fill="${fg}" opacity="0.58" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="1">BACK / 02</text>`;
  }

  if (spec.artKind === 'side') {
    const sideName = shopLabel();
    const sideSize = clamp(width * 0.16, 3.2, 6.6);
    const sideAttrs = fitTextAttrs(sideName, sideSize, innerH * 0.86);
    return `${base}
      <rect x="${fixed(margin)}" y="${fixed(margin)}" width="${fixed(innerW)}" height="${fixed(innerH)}" fill="none" stroke="${fg}" stroke-width="0.38" opacity="0.42"/>
      <circle cx="${fixed(width / 2)}" cy="${fixed(height * 0.145)}" r="${fixed(min * 0.11)}" fill="none" stroke="${fg}" stroke-width="0.36" opacity="0.55"/>
      ${flowerMark(width / 2, height * 0.145, min * 0.064, fg, 0.8, 0.32)}
      <g transform="translate(${fixed(width / 2)} ${fixed(height * 0.535)}) rotate(-90)">
        <text x="0" y="${fixed(sideSize * 0.34)}" text-anchor="middle" fill="${fg}" font-family="Georgia, 'Times New Roman', serif" font-size="${fixed(sideSize)}" letter-spacing="0.42" ${sideAttrs}>${escapeXml(sideName)}</text>
      </g>
      <text x="${fixed(width / 2)}" y="${fixed(height - margin - 1.1)}" text-anchor="middle" fill="${fg}" opacity="0.6" font-size="${fixed(microSize * 0.86)}" font-weight="700" letter-spacing="0.7">SIDE</text>`;
  }

  if (spec.artKind === 'lid') {
    const sealR = Math.min(width, height) * 0.245;
    const lidNameSize = clamp(height * 0.12, 3.2, 8.1);
    const lidNameAttrs = fitTextAttrs(name, lidNameSize, innerW * 0.74);
    return `${base}
      <g transform="rotate(180 ${fixed(width / 2)} ${fixed(height / 2)})">
        <rect x="${fixed(margin)}" y="${fixed(margin)}" width="${fixed(innerW)}" height="${fixed(innerH)}" fill="none" stroke="${fg}" stroke-width="0.38" opacity="0.4"/>
        <text x="${fixed(width / 2)}" y="${fixed(margin + lidNameSize + 0.4)}" text-anchor="middle" fill="${fg}" font-family="Georgia, 'Times New Roman', serif" font-size="${fixed(lidNameSize)}" letter-spacing="0.5" ${lidNameAttrs}>${name}</text>
        <circle cx="${fixed(width / 2)}" cy="${fixed(height * 0.55)}" r="${fixed(sealR)}" fill="none" stroke="${fg}" stroke-width="0.4" opacity="0.58"/>
        <circle cx="${fixed(width / 2)}" cy="${fixed(height * 0.55)}" r="${fixed(sealR * 0.74)}" fill="none" stroke="${fg}" stroke-width="0.26" opacity="0.3" stroke-dasharray="1.3 1.3"/>
        ${flowerMark(width / 2, height * 0.55, sealR * 0.42, fg, 0.8, 0.35)}
        <text x="${fixed(width / 2)}" y="${fixed(height * 0.87)}" text-anchor="middle" fill="${fg}" opacity="0.7" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="1.2">OPEN HERE / LIFT LID</text>
      </g>`;
  }

  if (spec.artKind === 'tuck') {
    return `${base}
      <rect x="${fixed(margin)}" y="${fixed(margin * 0.65)}" width="${fixed(innerW)}" height="${fixed(height - margin * 1.3)}" fill="none" stroke="${fg}" stroke-width="0.3" stroke-dasharray="2 1.6" opacity="0.42"/>
      <text x="${fixed(width / 2)}" y="${fixed(height * 0.59)}" text-anchor="middle" fill="${fg}" opacity="0.64" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="1.5">TUCK IN</text>`;
  }

  if (spec.artKind === 'glue') {
    return `<rect width="${fixed(width)}" height="${fixed(height)}" fill="${mixHex(bg, '#ffffff', 0.22)}"/>
      <line x1="${fixed(width * 0.5)}" y1="${fixed(margin)}" x2="${fixed(width * 0.5)}" y2="${fixed(height - margin)}" stroke="${fg}" stroke-width="0.3" stroke-dasharray="1.2 1.2" opacity="0.34"/>
      <g transform="translate(${fixed(width * 0.5)} ${fixed(height * 0.5)}) rotate(-90)">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" fill="${fg}" opacity="0.55" font-size="${fixed(clamp(width * 0.24, 2, 3.7))}" font-weight="700" letter-spacing="0.9">GLUE</text>
      </g>`;
  }

  if (spec.artKind === 'base') {
    return `${base}
      <rect x="${fixed(margin)}" y="${fixed(margin)}" width="${fixed(innerW)}" height="${fixed(innerH)}" fill="none" stroke="${fg}" stroke-width="0.28" stroke-dasharray="1.5 1.5" opacity="0.36"/>
      <path d="M ${fixed(width * 0.34)} ${fixed(height * 0.5)} H ${fixed(width * 0.66)}" stroke="${fg}" stroke-width="0.28" opacity="0.3"/>
      <text x="${fixed(width / 2)}" y="${fixed(height * 0.47)}" text-anchor="middle" fill="${fg}" opacity="0.58" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="1.2">BASE LOCK</text>
      <text x="${fixed(width / 2)}" y="${fixed(height * 0.57)}" text-anchor="middle" fill="${fg}" opacity="0.42" font-size="${fixed(microSize * 0.82)}" font-weight="700" letter-spacing="0.8">TUCK BOTTOM</text>`;
  }

  return `${base}
    <rect x="${fixed(margin)}" y="${fixed(margin * 0.65)}" width="${fixed(innerW)}" height="${fixed(height - margin * 1.3)}" fill="none" stroke="${fg}" stroke-width="0.26" stroke-dasharray="1.5 1.5" opacity="0.3"/>
    <text x="${fixed(width / 2)}" y="${fixed(height * 0.58)}" text-anchor="middle" fill="${fg}" opacity="0.48" font-size="${fixed(microSize)}" font-weight="700" letter-spacing="1.2">BASE TUCK</text>`;
}

function svgArtworkGroup(spec) {
  return `<g transform="translate(${fixed(spec.x)} ${fixed(spec.y)})">${artworkMarkup(spec)}</g>`;
}

function cutPath(m) {
  return [
    `M ${fixed(m.x1)} ${fixed(m.yTop)}`,
    `L ${fixed(m.x4)} ${fixed(m.yTop)}`,
    `L ${fixed(m.x4)} ${fixed(m.yLid)}`,
    `L ${fixed(m.x4)} ${fixed(m.yTuck)}`,
    `L ${fixed(m.x5)} ${fixed(m.yTuck)}`,
    `L ${fixed(m.x5)} ${fixed(m.yTop)}`,
    `L ${fixed(m.x5)} ${fixed(m.yBottom)}`,
    `L ${fixed(m.x3)} ${fixed(m.yBottom)}`,
    `L ${fixed(m.x3)} ${fixed(m.yBaseTuck)}`,
    `L ${fixed(m.x2)} ${fixed(m.yBaseTuck)}`,
    `L ${fixed(m.x2)} ${fixed(m.yBottom)}`,
    `L ${fixed(m.x0)} ${fixed(m.yBottom)}`,
    `L ${fixed(m.x0)} ${fixed(m.yTop)}`,
    'Z'
  ].join(' ');
}

function dimensionLines(m) {
  const widthY = m.yBaseTuck + 15;
  const depthY = m.yBaseTuck + 29;
  const heightX = -25;
  const widthLabel = `${fixed(state.dimensions.w)} mm`;
  const depthLabel = `${fixed(state.dimensions.d)} mm`;
  const heightLabel = `${fixed(state.dimensions.h)} mm`;
  return `
    <g id="dimensions" class="dimension-group">
      <path class="dim-extension" d="M ${fixed(m.x2)} ${fixed(m.yBottom + 2)} V ${fixed(widthY + 3)} M ${fixed(m.x3)} ${fixed(m.yBottom + 2)} V ${fixed(widthY + 3)}"/>
      <path class="dim-line" d="M ${fixed(m.x2)} ${fixed(widthY)} H ${fixed(m.x3)} M ${fixed(m.x2)} ${fixed(widthY - 2.4)} V ${fixed(widthY + 2.4)} M ${fixed(m.x3)} ${fixed(widthY - 2.4)} V ${fixed(widthY + 2.4)}"/>
      <text class="dim-text" x="${fixed((m.x2 + m.x3) / 2)}" y="${fixed(widthY + 6.8)}">W ${widthLabel}</text>

      <path class="dim-extension" d="M ${fixed(m.x1)} ${fixed(m.yBottom + 2)} V ${fixed(depthY + 3)} M ${fixed(m.x2)} ${fixed(m.yBottom + 2)} V ${fixed(depthY + 3)}"/>
      <path class="dim-line" d="M ${fixed(m.x1)} ${fixed(depthY)} H ${fixed(m.x2)} M ${fixed(m.x1)} ${fixed(depthY - 2.4)} V ${fixed(depthY + 2.4)} M ${fixed(m.x2)} ${fixed(depthY - 2.4)} V ${fixed(depthY + 2.4)}"/>
      <text class="dim-text" x="${fixed((m.x1 + m.x2) / 2)}" y="${fixed(depthY + 6.8)}">D ${depthLabel}</text>

      <path class="dim-extension" d="M ${fixed(m.x0)} ${fixed(m.yTop)} H ${fixed(heightX - 3)} M ${fixed(m.x0)} ${fixed(m.yBottom)} H ${fixed(heightX - 3)}"/>
      <path class="dim-line" d="M ${fixed(heightX)} ${fixed(m.yTop)} V ${fixed(m.yBottom)} M ${fixed(heightX - 2.4)} ${fixed(m.yTop)} H ${fixed(heightX + 2.4)} M ${fixed(heightX - 2.4)} ${fixed(m.yBottom)} H ${fixed(heightX + 2.4)}"/>
      <text class="dim-text vertical" transform="translate(${fixed(heightX - 6)} ${fixed((m.yTop + m.yBottom) / 2)}) rotate(-90)">H ${heightLabel}</text>

      <text class="micro-text" x="${fixed(m.x0)}" y="${fixed(m.yTuck - 9)}">FOLD / FORM — TUCK-TOP CARTON</text>
      <text class="micro-text" x="${fixed(m.x5)}" y="${fixed(m.yBaseTuck + 41)}" text-anchor="end">FLAT PROOF / 0 MM BOARD / NOT FOR PRODUCTION</text>
    </g>`;
}

function dielineStyles() {
  return `
    <style>
      .cut-line{fill:none;stroke:#25332e;stroke-width:.85;stroke-linecap:round;stroke-linejoin:round}
      .fold-line{fill:none;stroke:#c75f43;stroke-width:.7;stroke-dasharray:2.8 2.1;stroke-linecap:butt}
      .dim-line,.dim-extension{fill:none;stroke:rgba(29,43,38,.46);stroke-width:.45}
      .dim-extension{stroke-dasharray:1.2 1.5;opacity:.72}
      .dim-text{fill:#24322d;font-family:'Avenir Next',Avenir,'Segoe UI',Helvetica,Arial,sans-serif;font-size:5.4px;font-weight:700;letter-spacing:.08em;text-anchor:middle;paint-order:stroke;stroke:#f7f1e6;stroke-width:1.8;stroke-linejoin:round}
      .dim-text.vertical{dominant-baseline:middle}
      .micro-text{fill:rgba(29,43,38,.52);font-family:'Avenir Next',Avenir,'Segoe UI',Helvetica,Arial,sans-serif;font-size:3.2px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
      .selection-ring{fill:none;stroke:#c75f43;stroke-width:1.35;stroke-dasharray:2 2;pointer-events:none}
      .selection-label-bg{fill:#c75f43}
      .selection-label-text{fill:#fff8ee;font-family:'Avenir Next',Avenir,'Segoe UI',Helvetica,Arial,sans-serif;font-size:4.3px;font-weight:700;letter-spacing:.1em;text-anchor:middle;text-transform:uppercase}
      .panel-hit{fill:transparent;cursor:pointer;pointer-events:all}
      .panel-hit:focus{outline:none}
    </style>`;
}

function buildDielineSVG({ interactive = false, exportMode = false } = {}) {
  const m = metrics();
  const specs = panelSpecs(m);
  const selectedSpec = specs.find((spec) => spec.id === state.selected);
  const viewMinX = -39;
  const viewMaxX = m.x5 + 13;
  const viewMinY = m.yTuck - 18;
  const viewMaxY = m.yBaseTuck + 45;
  const viewWidth = viewMaxX - viewMinX;
  const viewHeight = viewMaxY - viewMinY;
  const prefix = exportMode ? 'proof' : 'ui';

  const artwork = specs.map((spec) => svgArtworkGroup(spec)).join('');
  const foldMarks = `
    <g id="fold-marks">
      <path class="fold-line" d="M ${fixed(m.x1)} ${fixed(m.yTop)} V ${fixed(m.yBottom)}"/>
      <path class="fold-line" d="M ${fixed(m.x2)} ${fixed(m.yTop)} V ${fixed(m.yBottom)}"/>
      <path class="fold-line" d="M ${fixed(m.x3)} ${fixed(m.yTop)} V ${fixed(m.yBottom)}"/>
      <path class="fold-line" d="M ${fixed(m.x4)} ${fixed(m.yTop)} V ${fixed(m.yBottom)}"/>
      <path class="fold-line" d="M ${fixed(m.x4)} ${fixed(m.yTop)} H ${fixed(m.x5)}"/>
      <path class="fold-line" d="M ${fixed(m.x4)} ${fixed(m.yLid)} H ${fixed(m.x5)}"/>
      <path class="fold-line" d="M ${fixed(m.x2)} ${fixed(m.yBottom)} H ${fixed(m.x3)}"/>
      <path class="fold-line" d="M ${fixed(m.x2)} ${fixed(m.yBase)} H ${fixed(m.x3)}"/>
    </g>`;

  let selection = '';
  if (interactive && selectedSpec) {
    const pad = 1.1;
    const width = Math.max(16, Math.min(selectedSpec.w * 0.62, 38));
    selection = `
      <g class="selection-overlay" aria-hidden="true">
        <rect class="selection-ring" x="${fixed(selectedSpec.x + pad)}" y="${fixed(selectedSpec.y + pad)}" width="${fixed(Math.max(0.1, selectedSpec.w - pad * 2))}" height="${fixed(Math.max(0.1, selectedSpec.h - pad * 2))}" rx="0.7"/>
        <rect class="selection-label-bg" x="${fixed(selectedSpec.x + 2.2)}" y="${fixed(selectedSpec.y + 2.2)}" width="${fixed(width)}" height="6.2" rx="1"/>
        <text class="selection-label-text" x="${fixed(selectedSpec.x + 2.2 + width / 2)}" y="${fixed(selectedSpec.y + 6.35)}">SELECTED</text>
      </g>`;
  }

  const hitAreas = interactive
    ? specs.map((spec) => `<rect class="panel-hit" data-panel="${spec.select}" x="${fixed(spec.x)}" y="${fixed(spec.y)}" width="${fixed(spec.w)}" height="${fixed(spec.h)}" tabindex="0" role="button" aria-label="Select ${escapeXml(PANEL_INFO[spec.select].name)}"/>`).join('')
    : '';

  const accessibility = interactive
    ? `role="img" aria-label="Dimensioned flat dieline. Select a panel to match it in the 3D preview."`
    : `role="img" aria-labelledby="${prefix}-title ${prefix}-desc"`;

  const title = `<title id="${prefix}-title">${escapeXml(shopLabel())} tuck-top carton flat proof</title>
    <desc id="${prefix}-desc">Dimensioned flat carton layout in millimetres with separate cut and fold markings and printed artwork on the front, back, sides, and lid. Zero material thickness.</desc>`;

  return `<svg class="dieline-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${fixed(viewMinX)} ${fixed(viewMinY)} ${fixed(viewWidth)} ${fixed(viewHeight)}" preserveAspectRatio="xMidYMid meet" ${accessibility} ${exportMode ? `width="${fixed(viewWidth)}mm" height="${fixed(viewHeight)}mm"` : ''}>
    ${title}
    ${dielineStyles()}
    <rect x="${fixed(viewMinX)}" y="${fixed(viewMinY)}" width="${fixed(viewWidth)}" height="${fixed(viewHeight)}" fill="${exportMode ? '#fffdf8' : 'transparent'}"/>
    <g id="artwork">${artwork}</g>
    ${foldMarks}
    <g id="cut-marks"><path class="cut-line" d="${cutPath(m)}"/></g>
    ${dimensionLines(m)}
    ${selection}
    ${hitAreas}
  </svg>`;
}

function renderDieline() {
  dom.dielineMount.innerHTML = buildDielineSVG({ interactive: true });
  updateMetaUI();
}

function setFoldUI(value) {
  const rounded = Math.round(value);
  dom.foldRange.value = String(rounded);
  dom.foldRange.style.setProperty('--fill', `${rounded}%`);
  dom.foldReadout.textContent = `${rounded}%`;
  dom.floatFold.textContent = String(rounded);
  dom.floatFoldSub.textContent = `${rounded}% FOLDED`;
}

function updateMetaUI() {
  const m = metrics();
  const info = PANEL_INFO[state.selected];
  const categoryColor = state.colors[info.category];
  const dimension = info.dimension === 'lid'
    ? `${fixed(state.dimensions.w)} × ${fixed(state.dimensions.d)} mm`
    : info.dimension === 'd'
      ? `${fixed(state.dimensions.d)} × ${fixed(state.dimensions.h)} mm`
      : `${fixed(state.dimensions.w)} × ${fixed(state.dimensions.h)} mm`;

  dom.dielineSize.textContent = `${fixed(state.dimensions.w)} × ${fixed(state.dimensions.d)} × ${fixed(state.dimensions.h)} mm`;
  dom.selectionSwatch.style.setProperty('--selection-color', categoryColor);
  dom.selectionName.textContent = info.name;
  dom.selectionDimensions.textContent = `${dimension} / ${info.description}`;
  dom.activeCategory.textContent = CATEGORY_LABELS[info.category].toUpperCase();
  dom.selectedBadge.innerHTML = `<span></span>${escapeXml(info.name.replace(' panel', ''))} selected`;
  dom.specWidth.textContent = fixed(state.dimensions.w);
  dom.specDepth.textContent = fixed(state.dimensions.d);
  dom.specHeight.textContent = fixed(state.dimensions.h);

  swatches.forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.category === info.category);
  });

  Object.entries(colorInputs).forEach(([category, input]) => {
    input.value = state.colors[category];
    const swatch = swatches.find((item) => item.dataset.category === category);
    const dot = swatch?.querySelector('.swatch-dot');
    const hex = document.querySelector(`[data-hex-for="${category}"]`);
    if (dot) dot.style.background = state.colors[category];
    if (hex) hex.textContent = state.colors[category].toUpperCase();
  });

  dom.dielineMount.querySelectorAll('[data-panel]').forEach((area) => {
    if (area.dataset.panel === state.selected) {
      area.setAttribute('aria-pressed', 'true');
    } else {
      area.removeAttribute('aria-pressed');
    }
  });
}

function selectPanel(panelId) {
  if (!PANEL_INFO[panelId] || state.selected === panelId) {
    updateMetaUI();
    applySelectionToModel();
    return;
  }
  state.selected = panelId;
  renderDieline();
  applySelectionToModel();
}

function firstPanelForCategory(category) {
  return category === 'sides' ? 'left' : category;
}

function queueVisualUpdate({ rebuildDieline = true, rebuildTextures = true } = {}) {
  clearTimeout(visualTimer);
  visualTimer = window.setTimeout(() => {
    if (rebuildDieline) renderDieline();
    if (rebuildTextures && model) refreshTextures();
  }, 45);
}

function queueDimensionUpdate() {
  clearTimeout(dimensionTimer);
  dimensionTimer = window.setTimeout(() => {
    if (model) rebuildModel();
    renderDieline();
    fitCameraToCarton();
  }, 70);
}

function readDimension(input, key) {
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 20 || value > 420) return;
  state.dimensions[key] = Math.round(value);
  queueDimensionUpdate();
}

function normalizeDimensionInput(input, key, min, max) {
  const value = Number(input.value);
  const next = Number.isFinite(value) ? clamp(Math.round(value), min, max) : state.dimensions[key];
  input.value = String(next);
  state.dimensions[key] = next;
  if (model) rebuildModel();
  renderDieline();
  fitCameraToCarton();
}

function updateFoldTarget(value) {
  foldAnimation = null;
  state.fold = clamp(value, 0, 100);
  state.foldTarget = state.fold;
  setFoldUI(state.fold);
  setPlayState(false);
  applyFold(state.fold);
}

function tweenFold(target, duration = 1150) {
  foldAnimation = {
    from: state.fold,
    to: clamp(target, 0, 100),
    start: performance.now(),
    duration
  };
  state.foldTarget = target;
  setPlayState(true);
}

function toggleFoldAnimation() {
  if (foldAnimation) {
    foldAnimation = null;
    state.foldTarget = state.fold;
    setPlayState(false);
    return;
  }
  const target = state.fold > 49 ? 0 : 100;
  tweenFold(target);
}

function setPlayState(isPlaying) {
  dom.playFold.classList.toggle('playing', isPlaying);
  dom.playFold.setAttribute('aria-label', isPlaying ? 'Stop fold animation' : 'Animate carton closed');
  dom.playFold.title = isPlaying ? 'Stop fold animation' : 'Animate fold';
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('show'), 2400);
}

/* ------------------------- Three.js preview ------------------------- */

let renderer;
let scene;
let camera;
let controls;
let textureGeneration = 0;
let maxAnisotropy = 1;
let lastStageAspect = 1;
let autoFrame = true;

function panelMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
}

function insideMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#ece5d7',
    roughness: 0.96,
    metalness: 0,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2
  });
}

function addPanel(parent, options) {
  const { width, height, position, select, category, artKind, id } = options;
  const geometry = new THREE.PlaneGeometry(width, height);
  const mat = panelMaterial(state.colors[category]);
  const innerMat = insideMaterial();
  const outer = new THREE.Mesh(geometry, mat);
  outer.position.copy(position);
  outer.userData.select = select;
  outer.userData.panelId = id;
  outer.userData.isPanelFace = true;

  const inner = new THREE.Mesh(geometry, innerMat);
  inner.position.copy(position);
  inner.position.z -= 0.045;
  inner.rotation.y = Math.PI;
  inner.userData.select = select;
  inner.userData.panelId = id;
  inner.userData.isPanelFace = true;

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x31403a,
    transparent: true,
    opacity: 0.26,
    depthWrite: false
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat);
  edges.position.copy(position);
  edges.position.z += 0.055;

  parent.add(inner, outer, edges);

  return {
    id,
    select,
    category,
    artKind,
    width,
    height,
    geometry,
    outer,
    inner,
    mat,
    innerMat,
    edges,
    edgeMat,
    disposed: false
  };
}

function disposeModel() {
  if (!model) return;
  scene.remove(model.root);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  model.root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      const entries = Array.isArray(object.material) ? object.material : [object.material];
      entries.forEach((material) => {
        materials.add(material);
        if (material.map) textures.add(material.map);
      });
    }
  });
  model.panels.forEach((record) => {
    record.disposed = true;
    if (record.mat.map) textures.add(record.mat.map);
    record.mat.dispose();
    record.innerMat.dispose();
    record.edgeMat.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  model = null;
}

function rebuildModel() {
  if (!scene) return;
  disposeModel();

  const m = metrics();
  const root = new THREE.Group();
  const panels = [];
  const pickMeshes = [];
  const innerMeshes = [];

  const rightSideHinge = new THREE.Group();
  rightSideHinge.position.set(m.w / 2, 0, 0);
  root.add(rightSideHinge);
  const rightPanel = addPanel(rightSideHinge, {
    id: 'right', select: 'right', category: 'sides', artKind: 'side',
    width: m.d, height: m.h, position: new THREE.Vector3(m.d / 2, 0, 0)
  });
  panels.push(rightPanel);
  pickMeshes.push(rightPanel.outer, rightPanel.inner);

  const backHinge = new THREE.Group();
  backHinge.position.set(m.d, 0, 0);
  rightSideHinge.add(backHinge);
  const backPanel = addPanel(backHinge, {
    id: 'back', select: 'back', category: 'back', artKind: 'back',
    width: m.w, height: m.h, position: new THREE.Vector3(m.w / 2, 0, 0)
  });
  panels.push(backPanel);
  pickMeshes.push(backPanel.outer, backPanel.inner);

  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, m.h / 2, 0);
  backHinge.add(lidHinge);
  const lidPanel = addPanel(lidHinge, {
    id: 'lid', select: 'lid', category: 'lid', artKind: 'lid',
    width: m.w, height: m.d, position: new THREE.Vector3(m.w / 2, m.d / 2, 0)
  });
  panels.push(lidPanel);
  pickMeshes.push(lidPanel.outer, lidPanel.inner);

  const tuckHinge = new THREE.Group();
  tuckHinge.position.set(0, m.d, 0);
  lidHinge.add(tuckHinge);
  const tuckPanel = addPanel(tuckHinge, {
    id: 'tuck', select: 'lid', category: 'lid', artKind: 'tuck',
    width: m.w, height: m.tuck, position: new THREE.Vector3(m.w / 2, m.tuck / 2, 0)
  });
  panels.push(tuckPanel);
  pickMeshes.push(tuckPanel.outer, tuckPanel.inner);

  const leftSideHinge = new THREE.Group();
  leftSideHinge.position.set(-m.w / 2, 0, 0);
  root.add(leftSideHinge);
  const leftPanel = addPanel(leftSideHinge, {
    id: 'left', select: 'left', category: 'sides', artKind: 'side',
    width: m.d, height: m.h, position: new THREE.Vector3(-m.d / 2, 0, 0)
  });
  panels.push(leftPanel);
  pickMeshes.push(leftPanel.outer, leftPanel.inner);

  const glueHinge = new THREE.Group();
  glueHinge.position.set(-m.d, 0, 0);
  leftSideHinge.add(glueHinge);
  const gluePanel = addPanel(glueHinge, {
    id: 'glue', select: 'left', category: 'sides', artKind: 'glue',
    width: m.glue, height: m.h, position: new THREE.Vector3(-m.glue / 2, 0, 0)
  });
  panels.push(gluePanel);
  pickMeshes.push(gluePanel.outer, gluePanel.inner);

  const frontPanel = addPanel(root, {
    id: 'front', select: 'front', category: 'front', artKind: 'front',
    width: m.w, height: m.h, position: new THREE.Vector3(0, 0, 0)
  });
  panels.push(frontPanel);
  pickMeshes.push(frontPanel.outer, frontPanel.inner);

  const baseHinge = new THREE.Group();
  baseHinge.position.set(0, -m.h / 2, 0);
  root.add(baseHinge);
  const basePanel = addPanel(baseHinge, {
    id: 'base', select: 'front', category: 'sides', artKind: 'base',
    width: m.w, height: m.d, position: new THREE.Vector3(0, -m.d / 2, 0)
  });
  panels.push(basePanel);
  pickMeshes.push(basePanel.outer, basePanel.inner);

  const baseTuckHinge = new THREE.Group();
  baseTuckHinge.position.set(0, -m.d, 0);
  baseHinge.add(baseTuckHinge);
  const baseTuckPanel = addPanel(baseTuckHinge, {
    id: 'baseTuck', select: 'front', category: 'sides', artKind: 'baseTuck',
    width: m.w, height: m.tuck, position: new THREE.Vector3(0, -m.tuck / 2, 0)
  });
  panels.push(baseTuckPanel);
  pickMeshes.push(baseTuckPanel.outer, baseTuckPanel.inner);

  scene.add(root);
  model = {
    root,
    panels,
    pickMeshes,
    innerMeshes,
    rightSideHinge,
    backHinge,
    lidHinge,
    tuckHinge,
    leftSideHinge,
    glueHinge,
    baseHinge,
    baseTuckHinge,
    dimensions: { ...state.dimensions, ...m }
  };

  applyFold(state.fold);
  applySelectionToModel();
  refreshTextures();
}

function applyFold(foldValue) {
  if (!model) return;
  const bodyT = easeInOutCubic(segment(foldValue, 0, 72));
  const lidT = easeInOutCubic(segment(foldValue, 46, 100));
  const glueT = easeInOutCubic(segment(foldValue, 60, 100));
  const baseT = easeInOutCubic(segment(foldValue, 50, 100));
  const tuckT = easeInOutCubic(segment(foldValue, 76, 100));
  const baseTuckT = easeInOutCubic(segment(foldValue, 79, 100));

  model.rightSideHinge.rotation.y = 90 * DEG * bodyT;
  model.backHinge.rotation.y = 90 * DEG * bodyT;
  model.leftSideHinge.rotation.y = -90 * DEG * bodyT;
  model.glueHinge.rotation.y = -95 * DEG * glueT;
  model.lidHinge.rotation.x = -90 * DEG * lidT;
  model.tuckHinge.rotation.x = (-90 * DEG - 7 * DEG) * tuckT;
  model.baseHinge.rotation.x = 90 * DEG * baseT;
  model.baseTuckHinge.rotation.x = (90 * DEG + 7 * DEG) * baseTuckT;

  const m = model.dimensions;
  const flatCenter = (m.w - m.glue) / 2;
  model.root.position.x = -(1 - bodyT) * flatCenter;
  model.root.position.z = bodyT * m.d / 2;
}

function applySelectionToModel() {
  if (!model) return;
  model.panels.forEach((record) => {
    const isSelected = record.select === state.selected;
    const edgeColor = isSelected ? 0xc75f43 : 0x31403a;
    record.edgeMat.color.setHex(edgeColor);
    record.edgeMat.opacity = isSelected ? 0.96 : 0.26;
    record.mat.emissive.setHex(isSelected ? 0xc75f43 : 0x000000);
    record.mat.emissiveIntensity = isSelected ? 0.16 : 0;
    record.mat.needsUpdate = true;
  });
}

function standaloneTextureSVG(record) {
  const specs = panelSpecs();
  const spec = specs.find((item) => item.id === record.id) || {
    category: record.category,
    artKind: record.artKind,
    w: record.width,
    h: record.height
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fixed(record.width)} ${fixed(record.height)}" preserveAspectRatio="none">${artworkMarkup(spec)}</svg>`;
}

function refreshTextures() {
  if (!model) return;
  textureGeneration += 1;
  model.panels.forEach((record) => makePanelTexture(record));
}

function makePanelTexture(record) {
  const generation = textureGeneration;
  const svg = standaloneTextureSVG(record);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  image.decoding = 'async';

  const maxSide = 900;
  const aspect = record.width / record.height;
  let canvasWidth;
  let canvasHeight;
  if (aspect >= 1) {
    canvasWidth = maxSide;
    canvasHeight = Math.max(96, Math.round(maxSide / aspect));
  } else {
    canvasHeight = maxSide;
    canvasWidth = Math.max(96, Math.round(maxSide * aspect));
  }

  image.onload = () => {
    if (!model || record.disposed || generation !== textureGeneration) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.needsUpdate = true;
    const previous = record.mat.map;
    record.mat.map = texture;
    record.mat.color.set(0xffffff);
    record.mat.needsUpdate = true;
    if (previous) previous.dispose();
  };

  image.onerror = () => {
    if (!model || record.disposed) return;
    record.mat.color.set(state.colors[record.category]);
    record.mat.needsUpdate = true;
  };

  image.src = url;
}

function frameCurrentModel({ resetDirection = false, padding = 1.16 } = {}) {
  if (!camera || !controls || !renderer || !model) return;
  const box = new THREE.Box3().setFromObject(model.root);
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const aspect = Math.max(0.1, dom.viewerStage.clientWidth / Math.max(1, dom.viewerStage.clientHeight));
  const direction = resetDirection
    ? new THREE.Vector3(0.72, 0.49, 1).normalize()
    : camera.position.clone().sub(controls.target).normalize();

  const viewForward = direction.clone().multiplyScalar(-1);
  const right = new THREE.Vector3().crossVectors(viewForward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, viewForward).normalize();
  const corner = new THREE.Vector3();
  let halfWidth = 0;
  let halfHeight = 0;
  let halfDepth = 0;

  for (let x = 0; x < 2; x += 1) {
    for (let y = 0; y < 2; y += 1) {
      for (let z = 0; z < 2; z += 1) {
        corner.set(
          x ? box.max.x : box.min.x,
          y ? box.max.y : box.min.y,
          z ? box.max.z : box.min.z
        ).sub(center);
        halfWidth = Math.max(halfWidth, Math.abs(corner.dot(right)));
        halfHeight = Math.max(halfHeight, Math.abs(corner.dot(up)));
        halfDepth = Math.max(halfDepth, Math.abs(corner.dot(direction)));
      }
    }
  }

  const tan = Math.tan(camera.fov * DEG / 2);
  const fitHeight = (halfHeight + size.length() * 0.004) / tan;
  const fitWidth = (halfWidth + size.length() * 0.004) / (tan * aspect);
  const distance = Math.max(fitHeight, fitWidth) * padding + halfDepth;
  const safeDistance = Math.max(18, distance);

  controls.target.copy(center);
  camera.position.copy(center).add(direction.multiplyScalar(safeDistance));
  camera.near = Math.max(0.4, safeDistance / 180);
  camera.far = safeDistance * 14;
  camera.updateProjectionMatrix();
  controls.update();
}

function fitCameraToCarton() {
  if (!camera || !controls || !renderer) return;
  frameCurrentModel({ resetDirection: true });
}

function initThree() {
  if (!window.WebGLRenderingContext) throw new Error('WebGL not available');
  renderer = new THREE.WebGLRenderer({
    canvas: dom.threeCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 1, 5000);
  controls = new OrbitControls(camera, dom.threeCanvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minPolarAngle = 0.16;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.minDistance = 18;
  controls.maxDistance = 2200;
  controls.zoomSpeed = 0.75;
  controls.rotateSpeed = 0.72;
  controls.target.set(0, 0, 0);
  controls.addEventListener('start', () => { autoFrame = false; });

  const hemisphere = new THREE.HemisphereLight(0xfff8e9, 0x4b5a50, 2.35);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xfff4dc, 2.5);
  key.position.set(260, 420, 360);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc7d7ce, 1.25);
  fill.position.set(-340, 150, 240);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff8ec, 1.5);
  rim.position.set(100, 160, -340);
  scene.add(rim);

  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  resizeRenderer();
  rebuildModel();
  fitCameraToCarton();

  const resizeObserver = new ResizeObserver(() => {
    resizeRenderer();
    if (Math.abs(lastStageAspect - camera.aspect) > 0.18) fitCameraToCarton();
  });
  resizeObserver.observe(dom.viewerStage);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;

  dom.threeCanvas.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  dom.threeCanvas.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dragDistance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (dragDistance > 6 || !model) return;

    const rect = dom.threeCanvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(model.pickMeshes, false);
    if (hits.length) {
      const next = hits[0].object.userData.select;
      if (next) selectPanel(next);
    }
  });

  const clock = new THREE.Clock();

  function animate(now) {
    requestAnimationFrame(animate);
    clock.getDelta();

    if (foldAnimation) {
      const elapsed = now - foldAnimation.start;
      const progress = clamp(elapsed / foldAnimation.duration, 0, 1);
      const eased = easeInOutCubic(progress);
      state.fold = lerp(foldAnimation.from, foldAnimation.to, eased);
      state.foldTarget = foldAnimation.to;
      setFoldUI(state.fold);
      if (progress >= 1) {
        state.fold = foldAnimation.to;
        foldAnimation = null;
        setFoldUI(state.fold);
        setPlayState(false);
      }
    }

    applyFold(state.fold);
    if (autoFrame) frameCurrentModel();
    controls.update();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  if (!introPlayed) {
    introPlayed = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      state.fold = STARTER.fold;
      setFoldUI(state.fold);
    } else {
      state.fold = 0;
      setFoldUI(state.fold);
      window.setTimeout(() => tweenFold(STARTER.fold, 1350), 180);
    }
  }
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = Math.max(1, dom.viewerStage.clientWidth);
  const height = Math.max(1, dom.viewerStage.clientHeight);
  renderer.setSize(width, height, false);
  lastStageAspect = camera.aspect;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

/* --------------------------- Bind + export --------------------------- */

function syncControls() {
  dom.width.value = String(state.dimensions.w);
  dom.depth.value = String(state.dimensions.d);
  dom.height.value = String(state.dimensions.h);
  dom.shopName.value = state.shopName;
  setFoldUI(state.fold);
  updateMetaUI();
}

function applyPreset(preset, message) {
  state.dimensions = { ...preset.dimensions };
  state.shopName = preset.shopName;
  state.colors = { ...preset.colors };
  state.selected = 'front';
  state.fold = Math.min(preset.fold, 58);
  state.foldTarget = preset.fold;
  foldAnimation = null;
  setPlayState(false);
  syncControls();
  if (model) rebuildModel();
  renderDieline();
  autoFrame = true;
  fitCameraToCarton();
  tweenFold(preset.fold, 1200);
  if (message) showToast(message);
}

function exportProof() {
  const markup = buildDielineSVG({ interactive: false, exportMode: true });
  const documentMarkup = `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
  const blob = new Blob([documentMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const slug = shopLabel().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'carton';
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}-${state.dimensions.w}x${state.dimensions.d}x${state.dimensions.h}mm-flat-proof.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('Dimensioned SVG proof exported');
}

dom.dielineMount.addEventListener('click', (event) => {
  const hit = event.target.closest('[data-panel]');
  if (hit) selectPanel(hit.dataset.panel);
});

dom.dielineMount.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const hit = event.target.closest('[data-panel]');
  if (!hit) return;
  event.preventDefault();
  selectPanel(hit.dataset.panel);
});

dom.width.addEventListener('input', () => readDimension(dom.width, 'w'));
dom.depth.addEventListener('input', () => readDimension(dom.depth, 'd'));
dom.height.addEventListener('input', () => readDimension(dom.height, 'h'));
dom.width.addEventListener('change', () => normalizeDimensionInput(dom.width, 'w', 40, 320));
dom.depth.addEventListener('change', () => normalizeDimensionInput(dom.depth, 'd', 35, 260));
dom.height.addEventListener('change', () => normalizeDimensionInput(dom.height, 'h', 35, 360));

dom.shopName.addEventListener('input', () => {
  state.shopName = dom.shopName.value;
  queueVisualUpdate({ rebuildDieline: true, rebuildTextures: true });
});

Object.entries(colorInputs).forEach(([category, input]) => {
  input.addEventListener('input', () => {
    state.colors[category] = input.value;
    const activePanel = firstPanelForCategory(category);
    if (PANEL_INFO[state.selected].category === category) {
      updateMetaUI();
    } else {
      state.selected = activePanel;
      renderDieline();
      applySelectionToModel();
    }
    queueVisualUpdate({ rebuildDieline: true, rebuildTextures: true });
  });
});

swatches.forEach((swatch) => {
  swatch.addEventListener('pointerdown', () => {
    const category = swatch.dataset.category;
    const panel = firstPanelForCategory(category);
    if (state.selected !== panel) {
      state.selected = panel;
      renderDieline();
      applySelectionToModel();
    }
  });
});

dom.foldRange.addEventListener('input', () => {
  updateFoldTarget(Number(dom.foldRange.value));
});

dom.playFold.addEventListener('click', toggleFoldAnimation);

dom.sampleDesign.addEventListener('click', () => {
  const alternate = state.shopName === SAMPLE.shopName ? STARTER : SAMPLE;
  applyPreset(alternate, alternate === SAMPLE ? 'Sample design loaded' : 'Starter design loaded');
});

dom.resetDesign.addEventListener('click', () => {
  applyPreset(STARTER, 'Design reset');
});

dom.exportSvg.addEventListener('click', exportProof);

dom.resetCamera.addEventListener('click', () => {
  autoFrame = true;
  fitCameraToCarton();
  showToast('Camera reset');
});

window.addEventListener('resize', () => {
  if (renderer) {
    resizeRenderer();
    fitCameraToCarton();
  }
});

syncControls();
renderDieline();
setFoldUI(state.fold);

try {
  initThree();
} catch (error) {
  console.error('3D preview unavailable:', error);
  dom.viewerStage.insertAdjacentHTML('beforeend', '<div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;font-size:11px;color:#5d6761;z-index:4">3D preview needs WebGL. The flat proof and SVG export still work.</div>');
}
