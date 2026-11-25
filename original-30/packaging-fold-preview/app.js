import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEFAULT_STATE = Object.freeze({
  width: 160,
  depth: 110,
  height: 60,
  shopName: 'Linen & Ink',
  selectedPanel: 'front',
  colors: Object.freeze({
    front: '#e8dbc8',
    back: '#dbe5d6',
    sides: '#c99a60',
    lid: '#a75a43',
  }),
});

const LIMITS = Object.freeze({
  width: [40, 300],
  depth: [40, 300],
  height: [30, 220],
});

const PANEL_LABELS = Object.freeze({
  front: 'Front panel',
  back: 'Back panel',
  sides: 'Side panels',
  lid: 'Lid',
  bottom: 'Base panel',
});

const PANEL_SHORT = Object.freeze({
  front: 'Front',
  back: 'Back',
  sides: 'Sides',
  lid: 'Lid',
  bottom: 'Base',
});

const state = {
  width: DEFAULT_STATE.width,
  depth: DEFAULT_STATE.depth,
  height: DEFAULT_STATE.height,
  shopName: DEFAULT_STATE.shopName,
  selectedPanel: DEFAULT_STATE.selectedPanel,
  colors: { ...DEFAULT_STATE.colors },
};

const dom = {
  widthInput: document.querySelector('#widthInput'),
  depthInput: document.querySelector('#depthInput'),
  heightInput: document.querySelector('#heightInput'),
  shopNameInput: document.querySelector('#shopNameInput'),
  foldRange: document.querySelector('#foldRange'),
  foldValue: document.querySelector('#foldValue'),
  foldToggle: document.querySelector('#foldToggle'),
  foldToggleLabel: document.querySelector('#foldToggleLabel'),
  foldPercentLarge: document.querySelector('#foldPercentLarge'),
  foldCaptionLarge: document.querySelector('#foldCaptionLarge'),
  dielineViewport: document.querySelector('#dielineViewport'),
  dielineDimensions: document.querySelector('#dielineDimensions'),
  selectedPanelName: document.querySelector('#selectedPanelName'),
  previewSelectionName: document.querySelector('#previewSelectionName'),
  previewSelectionDot: document.querySelector('#previewSelectionDot'),
  headerProjectName: document.querySelector('#headerProjectName'),
  resetButton: document.querySelector('#resetButton'),
  exportButton: document.querySelector('#exportButton'),
  sceneCanvas: document.querySelector('#sceneCanvas'),
  previewViewport: document.querySelector('#previewViewport'),
  toast: document.querySelector('#toast'),
  viewButtons: [...document.querySelectorAll('.view-button')],
  colorInputs: {
    front: document.querySelector('#colorFront'),
    back: document.querySelector('#colorBack'),
    sides: document.querySelector('#colorSides'),
    lid: document.querySelector('#colorLid'),
  },
  hexOutputs: {
    front: document.querySelector('#hexFront'),
    back: document.querySelector('#hexBack'),
    sides: document.querySelector('#hexSides'),
    lid: document.querySelector('#hexLid'),
  },
  colorFields: [...document.querySelectorAll('.color-field')],
};

let currentFold = 1;
let targetFold = 1;
let foldFrameValue = -1;
let toastTimer = 0;
let lastDielineSvg = '';
let artRefreshTimer = 0;
let rebuildTimer = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = [r, g, b].map((channel) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastInk(hex) {
  return luminance(hex) > 0.36 ? '#182d25' : '#fbf6eb';
}

function getInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'FF';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'carton';
}

function getLayout() {
  const W = state.width;
  const D = state.depth;
  const H = state.height;
  const x0 = -W / 2;
  const x1 = W / 2;
  const yFront = -D / 2 - H;
  const yBotFront = -D / 2;
  const yBotBack = D / 2;
  const yBackTop = D / 2 + H;
  const yLidTop = yBackTop + D;
  const leftOuter = x0 - H;
  const rightOuter = x1 + H;
  const tuckWidth = W * 0.62;
  const tuckHeight = clamp(H * 0.32, 14, 25);
  const tuckLeft = -tuckWidth / 2;
  const tuckRight = tuckWidth / 2;
  const tuckTop = yLidTop + tuckHeight;
  const tuckCorner = Math.min(tuckHeight * 0.28, 5.2, tuckWidth * 0.05);

  return {
    W,
    D,
    H,
    x0,
    x1,
    yFront,
    yBotFront,
    yBotBack,
    yBackTop,
    yLidTop,
    leftOuter,
    rightOuter,
    tuckWidth,
    tuckHeight,
    tuckLeft,
    tuckRight,
    tuckTop,
    tuckCorner,
  };
}

function tuckPath(layout) {
  const {
    yLidTop,
    tuckLeft,
    tuckRight,
    tuckTop,
    tuckCorner: corner,
  } = layout;
  return [
    `M ${fmt(tuckLeft)} ${fmt(yLidTop)}`,
    `L ${fmt(tuckLeft)} ${fmt(tuckTop - corner)}`,
    `Q ${fmt(tuckLeft)} ${fmt(tuckTop)} ${fmt(tuckLeft + corner)} ${fmt(tuckTop)}`,
    `L ${fmt(tuckRight - corner)} ${fmt(tuckTop)}`,
    `Q ${fmt(tuckRight)} ${fmt(tuckTop)} ${fmt(tuckRight)} ${fmt(tuckTop - corner)}`,
    `L ${fmt(tuckRight)} ${fmt(yLidTop)}`,
    'Z',
  ].join(' ');
}

function cutOutlinePath(layout) {
  const {
    x0,
    x1,
    yFront,
    yBotFront,
    yBotBack,
    yBackTop,
    yLidTop,
    leftOuter,
    rightOuter,
    tuckLeft,
    tuckRight,
    tuckTop,
    tuckCorner: corner,
  } = layout;
  return [
    `M ${fmt(x0)} ${fmt(yFront)}`,
    `L ${fmt(x1)} ${fmt(yFront)}`,
    `L ${fmt(x1)} ${fmt(yBotFront)}`,
    `L ${fmt(rightOuter)} ${fmt(yBotFront)}`,
    `L ${fmt(rightOuter)} ${fmt(yBotBack)}`,
    `L ${fmt(x1)} ${fmt(yBotBack)}`,
    `L ${fmt(x1)} ${fmt(yBackTop)}`,
    `L ${fmt(x1)} ${fmt(yLidTop)}`,
    `L ${fmt(tuckRight)} ${fmt(yLidTop)}`,
    `L ${fmt(tuckRight)} ${fmt(tuckTop - corner)}`,
    `Q ${fmt(tuckRight)} ${fmt(tuckTop)} ${fmt(tuckRight - corner)} ${fmt(tuckTop)}`,
    `L ${fmt(tuckLeft + corner)} ${fmt(tuckTop)}`,
    `Q ${fmt(tuckLeft)} ${fmt(tuckTop)} ${fmt(tuckLeft)} ${fmt(tuckTop - corner)}`,
    `L ${fmt(tuckLeft)} ${fmt(yLidTop)}`,
    `L ${fmt(x0)} ${fmt(yLidTop)}`,
    `L ${fmt(x0)} ${fmt(yBackTop)}`,
    `L ${fmt(x0)} ${fmt(yBotBack)}`,
    `L ${fmt(leftOuter)} ${fmt(yBotBack)}`,
    `L ${fmt(leftOuter)} ${fmt(yBotFront)}`,
    `L ${fmt(x0)} ${fmt(yBotFront)}`,
    'Z',
  ].join(' ');
}

function fmt(value) {
  return Number(value.toFixed(3)).toString();
}

function nameFontSize(width, height, name = state.shopName) {
  const length = Math.max(5, name.trim().length || 5);
  return Math.min(height * 0.265, (width * 0.74) / (length * 0.54));
}

function starMarkup(cx, cy, radius, fill, opacity = 1) {
  const r1 = radius;
  const r2 = radius * 0.28;
  return `<path d="M ${fmt(cx)} ${fmt(cy - r1)} L ${fmt(cx + r2)} ${fmt(cy - r2)} L ${fmt(cx + r1)} ${fmt(cy)} L ${fmt(cx + r2)} ${fmt(cy + r2)} L ${fmt(cx)} ${fmt(cy + r1)} L ${fmt(cx - r2)} ${fmt(cy + r2)} L ${fmt(cx - r1)} ${fmt(cy)} L ${fmt(cx - r2)} ${fmt(cy - r2)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

function svgPanelArt(panel, width, height, color) {
  const fg = contrastInk(color);
  const name = state.shopName.trim() || 'Your shop';
  const initials = getInitials(name);
  const sans = "Avenir Next, Segoe UI, Helvetica, Arial, sans-serif";
  const serif = "Georgia, Times New Roman, serif";
  const margin = Math.min(width, height) * 0.055;
  const border = `<rect x="${fmt(margin)}" y="${fmt(margin)}" width="${fmt(width - margin * 2)}" height="${fmt(height - margin * 2)}" rx="${fmt(Math.min(width, height) * 0.025)}" fill="none" stroke="${fg}" stroke-width="${fmt(Math.max(0.18, Math.min(width, height) * 0.004))}" opacity="0.19"/>`;

  if (panel === 'front') {
    const fs = nameFontSize(width, height, name);
    return `<g>
      ${border}
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.29)}" text-anchor="middle" fill="${fg}" opacity="0.68" font-family="${sans}" font-size="${fmt(height * 0.057)}" font-weight="700" letter-spacing="${fmt(height * 0.012)}">PAPER GOODS · EST. 2024</text>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.585)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(fs)}" font-style="italic" letter-spacing="${fmt(-fs * 0.023)}">${escapeXml(name)}</text>
      <path d="M ${fmt(width * 0.4)} ${fmt(height * 0.71)} H ${fmt(width * 0.47)} L ${fmt(width * 0.5)} ${fmt(height * 0.735)} L ${fmt(width * 0.53)} ${fmt(height * 0.71)} H ${fmt(width * 0.6)}" fill="none" stroke="${fg}" stroke-width="${fmt(Math.max(0.2, height * 0.005))}" opacity="0.58"/>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.85)}" text-anchor="middle" fill="${fg}" opacity="0.7" font-family="${sans}" font-size="${fmt(height * 0.049)}" font-weight="650" letter-spacing="${fmt(height * 0.012)}">MADE FOR SMALL MOMENTS</text>
    </g>`;
  }

  if (panel === 'back') {
    const fs = nameFontSize(width, height, name);
    return `<g>
      ${border}
      <circle cx="${fmt(width / 2)}" cy="${fmt(height * 0.34)}" r="${fmt(height * 0.19)}" fill="none" stroke="${fg}" stroke-width="${fmt(Math.max(0.22, height * 0.005))}" opacity="0.58"/>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.37)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(height * 0.145)}" font-style="italic">${escapeXml(initials)}</text>
      ${starMarkup(width / 2, height * 0.16, height * 0.035, fg, 0.55)}
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.68)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(fs * 0.86)}" font-style="italic" letter-spacing="${fmt(-fs * 0.02)}">${escapeXml(name)}</text>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.84)}" text-anchor="middle" fill="${fg}" opacity="0.68" font-family="${sans}" font-size="${fmt(height * 0.047)}" font-weight="700" letter-spacing="${fmt(height * 0.016)}">PACKAGED WITH CARE</text>
    </g>`;
  }

  if (panel === 'sides') {
    const fs = Math.min(height * 0.205, (width * 0.57) / (Math.max(5, name.length) * 0.54));
    return `<g>
      ${border}
      <circle cx="${fmt(width * 0.145)}" cy="${fmt(height * 0.5)}" r="${fmt(height * 0.2)}" fill="none" stroke="${fg}" stroke-width="${fmt(Math.max(0.22, height * 0.006))}" opacity="0.58"/>
      <text x="${fmt(width * 0.145)}" y="${fmt(height * 0.54)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(height * 0.145)}" font-style="italic">${escapeXml(initials)}</text>
      <text x="${fmt(width * 0.58)}" y="${fmt(height * 0.43)}" text-anchor="middle" fill="${fg}" opacity="0.6" font-family="${sans}" font-size="${fmt(height * 0.048)}" font-weight="750" letter-spacing="${fmt(height * 0.018)}">STATIONERY</text>
      <text x="${fmt(width * 0.58)}" y="${fmt(height * 0.62)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(fs)}" font-style="italic" letter-spacing="${fmt(-fs * 0.02)}">${escapeXml(name)}</text>
      <text x="${fmt(width * 0.58)}" y="${fmt(height * 0.78)}" text-anchor="middle" fill="${fg}" opacity="0.62" font-family="${sans}" font-size="${fmt(height * 0.045)}" font-weight="700" letter-spacing="${fmt(height * 0.012)}">SMALL-BATCH GOODS</text>
    </g>`;
  }

  if (panel === 'lid') {
    const fs = nameFontSize(width, height, name);
    return `<g>
      ${border}
      ${starMarkup(width / 2, height * 0.235, height * 0.04, fg, 0.62)}
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.34)}" text-anchor="middle" fill="${fg}" opacity="0.64" font-family="${sans}" font-size="${fmt(height * 0.045)}" font-weight="750" letter-spacing="${fmt(height * 0.014)}">OPEN SLOWLY</text>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.57)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(fs)}" font-style="italic" letter-spacing="${fmt(-fs * 0.024)}">${escapeXml(name)}</text>
      <path d="M ${fmt(width * 0.37)} ${fmt(height * 0.68)} H ${fmt(width * 0.63)}" stroke="${fg}" stroke-width="${fmt(Math.max(0.18, height * 0.0035))}" opacity="0.38"/>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.79)}" text-anchor="middle" fill="${fg}" opacity="0.68" font-family="${sans}" font-size="${fmt(height * 0.043)}" font-weight="700" letter-spacing="${fmt(height * 0.016)}">TUCK-LID CARTON</text>
    </g>`;
  }

  if (panel === 'tuck') {
    return `<g>
      <path d="M ${fmt(width * 0.44)} ${fmt(height * 0.5)} H ${fmt(width * 0.455)} L ${fmt(width * 0.5)} ${fmt(height * 0.32)} L ${fmt(width * 0.545)} ${fmt(height * 0.5)} H ${fmt(width * 0.56)}" fill="none" stroke="${fg}" stroke-width="${fmt(Math.max(0.22, height * 0.02))}" opacity="0.56"/>
      <text x="${fmt(width / 2)}" y="${fmt(height * 0.67)}" text-anchor="middle" fill="${fg}" font-family="${serif}" font-size="${fmt(Math.min(height * 0.28, width * 0.12))}" font-style="italic">${escapeXml(initials)}</text>
    </g>`;
  }

  return '';
}

function dimensionMarkup(layout) {
  const { W, D, H, x0, x1, yFront, yBotFront, yBotBack, leftOuter, rightOuter } = layout;
  const stroke = '#88928b';
  const text = '#6f7972';

  const widthY = yFront - 13;
  const heightX = leftOuter - 12;
  const depthX = rightOuter + 12;
  const heightMid = (yFront + yBotFront) / 2;
  const depthMid = (yBotFront + yBotBack) / 2;

  return `<g id="dimension-layer" pointer-events="none" aria-hidden="true">
    <g stroke="${stroke}" stroke-width="0.36" fill="none" opacity="0.82">
      <path d="M ${fmt(x0)} ${fmt(yFront - 2.5)} V ${fmt(widthY - 3.1)} M ${fmt(x1)} ${fmt(yFront - 2.5)} V ${fmt(widthY - 3.1)}"/>
      <path d="M ${fmt(x0)} ${fmt(widthY)} H ${fmt(x1)} M ${fmt(x0)} ${fmt(widthY - 2.1)} V ${fmt(widthY + 2.1)} M ${fmt(x1)} ${fmt(widthY - 2.1)} V ${fmt(widthY + 2.1)}"/>
      <path d="M ${fmt(leftOuter - 2.5)} ${fmt(yFront)} H ${fmt(heightX - 3.1)} M ${fmt(leftOuter - 2.5)} ${fmt(yBotFront)} H ${fmt(heightX - 3.1)}"/>
      <path d="M ${fmt(heightX)} ${fmt(yFront)} V ${fmt(yBotFront)} M ${fmt(heightX - 2.1)} ${fmt(yFront)} H ${fmt(heightX + 2.1)} M ${fmt(heightX - 2.1)} ${fmt(yBotFront)} H ${fmt(heightX + 2.1)}"/>
      <path d="M ${fmt(rightOuter + 2.5)} ${fmt(yBotFront)} H ${fmt(depthX + 3.1)} M ${fmt(rightOuter + 2.5)} ${fmt(yBotBack)} H ${fmt(depthX + 3.1)}"/>
      <path d="M ${fmt(depthX)} ${fmt(yBotFront)} V ${fmt(yBotBack)} M ${fmt(depthX - 2.1)} ${fmt(yBotFront)} H ${fmt(depthX + 2.1)} M ${fmt(depthX - 2.1)} ${fmt(yBotBack)} H ${fmt(depthX + 2.1)}"/>
    </g>
    <g fill="${text}" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="4.15" font-weight="700" letter-spacing="0.12">
      <text x="${fmt((x0 + x1) / 2)}" y="${fmt(widthY - 3.4)}" text-anchor="middle">W ${fmt(W)} mm</text>
      <text transform="translate(${fmt(heightX - 3.4)} ${fmt(heightMid)}) rotate(-90)" text-anchor="middle">H ${fmt(H)} mm</text>
      <text transform="translate(${fmt(depthX + 3.4)} ${fmt(depthMid)}) rotate(-90)" text-anchor="middle">D ${fmt(D)} mm</text>
    </g>
  </g>`;
}

function buildDielineSVG(exportMode = false) {
  const L = getLayout();
  const {
    W,
    D,
    H,
    x0,
    x1,
    yFront,
    yBotFront,
    yBotBack,
    yBackTop,
    yLidTop,
    leftOuter,
    rightOuter,
    tuckWidth,
    tuckHeight,
    tuckLeft,
    tuckTop,
  } = L;

  const marginX = 23;
  const viewMinX = leftOuter - marginX;
  const viewMaxX = rightOuter + marginX;
  const viewMinY = yFront - 33;
  const viewMaxY = tuckTop + 27;
  const viewW = viewMaxX - viewMinX;
  const viewH = viewMaxY - viewMinY;
  const selected = exportMode ? null : state.selectedPanel;
  const tuck = tuckPath(L);
  const cut = cutOutlinePath(L);
  const fgFront = contrastInk(state.colors.front);
  const fgBack = contrastInk(state.colors.back);
  const fgSides = contrastInk(state.colors.sides);
  const fgLid = contrastInk(state.colors.lid);
  const title = `${state.shopName.trim() || 'Untitled shop'} — tuck-lid carton`;
  const border = '#1b342b';
  const accent = '#d97857';
  const footerNote = viewW < 230
    ? 'ZERO THICKNESS · NO BLEED'
    : 'ZERO MATERIAL THICKNESS · NO BLEED OR TOLERANCE APPLIED';

  const classes = (panel) => `panel-group${selected === panel ? ' is-selected' : ''}`;
  const ring = (x, y, w, h, radius = 0) => `<rect class="selection-ring" x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" ${radius ? `rx="${fmt(radius)}"` : ''} fill="none" stroke="${accent}" stroke-width="1.1" pointer-events="none"/>`;

  const rectPanel = (panel, x, y, w, h, clipId) => `
    <g class="${classes(panel)}" data-panel="${panel}" role="button" tabindex="0" aria-label="Select ${PANEL_LABELS[panel]}">
      <g clip-path="url(#${clipId})">
        <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${state.colors[panel]}"/>
        <g transform="translate(${fmt(x)} ${fmt(y)})">${svgPanelArt(panel, w, h, state.colors[panel])}</g>
      </g>
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="transparent"/>
      ${ring(x, y, w, h, Math.min(w, h) * 0.02)}
      <text class="panel-label" x="${fmt(x + 3.2)}" y="${fmt(y + h - 3.1)}" fill="${contrastInk(state.colors[panel])}" opacity="0.44" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.3" font-weight="750" letter-spacing="0.42">${PANEL_SHORT[panel].toUpperCase()}</text>
    </g>`;

  const sidePanel = (panel, x, y, w, h, clipId, sideName) => `
    <g class="${classes(panel)}" data-panel="${panel}" role="button" tabindex="0" aria-label="Select ${PANEL_LABELS[panel]}">
      <g clip-path="url(#${clipId})">
        <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${state.colors.sides}"/>
        <g transform="translate(${fmt(x + w / 2)} ${fmt(y + h / 2)}) rotate(-90) translate(${fmt(-D / 2)} ${fmt(-H / 2)})">
          ${svgPanelArt('sides', D, H, state.colors.sides)}
        </g>
      </g>
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="transparent"/>
      ${ring(x, y, w, h, 1.5)}
      <text class="panel-label" transform="translate(${fmt(x + w - 3.1)} ${fmt(y + h - 3.1)}) rotate(-90)" text-anchor="end" fill="${fgSides}" opacity="0.43" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.2" font-weight="750" letter-spacing="0.36">${sideName.toUpperCase()}</text>
    </g>`;

  const artwork = `
    <g id="artwork-layer">
      ${rectPanel('front', x0, yFront, W, H, 'clip-front')}
      ${rectPanel('back', x0, yBotBack, W, H, 'clip-back')}
      ${sidePanel('sides', leftOuter, yBotFront, H, D, 'clip-left', 'left side')}
      ${sidePanel('sides', x1, yBotFront, H, D, 'clip-right', 'right side')}
      ${rectPanel('lid', x0, yBackTop, W, D, 'clip-lid')}
      <g class="${classes('lid')}" data-panel="lid" role="button" tabindex="0" aria-label="Select lid tuck flap">
        <g clip-path="url(#clip-tuck)">
          <rect x="${fmt(tuckLeft)}" y="${fmt(yLidTop)}" width="${fmt(tuckWidth)}" height="${fmt(tuckHeight)}" fill="${state.colors.lid}"/>
          <g transform="translate(${fmt(tuckLeft)} ${fmt(yLidTop)})">${svgPanelArt('tuck', tuckWidth, tuckHeight, state.colors.lid)}</g>
        </g>
        <path d="${tuck}" fill="transparent"/>
        <path class="selection-ring" d="${tuck}" fill="none" stroke="${accent}" stroke-width="1.1" pointer-events="none"/>
        <text class="panel-label" x="${fmt(tuckLeft + 2)}" y="${fmt(yLidTop + tuckHeight - 2.2)}" fill="${fgLid}" opacity="0.4" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="1.95" font-weight="750" letter-spacing="0.28">TUCK</text>
      </g>
      <g pointer-events="none">
        <rect x="${fmt(x0)}" y="${fmt(yBotFront)}" width="${fmt(W)}" height="${fmt(D)}" fill="#d9cdba"/>
        <text x="${fmt(0)}" y="${fmt(yBotFront + D * 0.5 - 1)}" text-anchor="middle" fill="#655f55" opacity="0.38" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.55" font-weight="750" letter-spacing="0.55">FOLDLINE / ZERO-THICKNESS PROOF</text>
        <text x="${fmt(0)}" y="${fmt(yBotFront + D * 0.5 + 4.1)}" text-anchor="middle" fill="#655f55" opacity="0.27" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.1" font-weight="600" letter-spacing="0.38">BASE · NOT PRINTED</text>
      </g>
    </g>`;

  const cutLayer = `<g id="cut-lines" pointer-events="none" fill="none" stroke="${border}" stroke-width="0.72" stroke-linejoin="round" stroke-linecap="round"><path d="${cut}"/></g>`;

  const foldLayer = `<g id="fold-lines" pointer-events="none" fill="none" stroke="${accent}" stroke-width="0.64" stroke-linecap="round" stroke-dasharray="3.1 2.2">
    <path d="M ${fmt(x0)} ${fmt(yBotFront)} H ${fmt(x1)}"/>
    <path d="M ${fmt(x0)} ${fmt(yBotBack)} H ${fmt(x1)}"/>
    <path d="M ${fmt(x0)} ${fmt(yBotFront)} V ${fmt(yBotBack)}"/>
    <path d="M ${fmt(x1)} ${fmt(yBotFront)} V ${fmt(yBotBack)}"/>
    <path d="M ${fmt(x0)} ${fmt(yBackTop)} H ${fmt(x1)}"/>
    <path d="M ${fmt(tuckLeft)} ${fmt(yLidTop)} H ${fmt(tuckWidth)}"/>
  </g>`;

  const headerText = `
    <g pointer-events="none">
      <text x="${fmt(viewMinX + 2)}" y="${fmt(viewMinY + 7)}" fill="${border}" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="4.1" font-weight="800" letter-spacing="0.38">TUCK-LID CARTON / FLAT PROOF</text>
      <text x="${fmt(viewMaxX - 2)}" y="${fmt(viewMinY + 7)}" text-anchor="end" fill="#737d76" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="3.65" font-weight="650" letter-spacing="0.18">${fmt(W)} × ${fmt(D)} × ${fmt(H)} mm</text>
      <path d="M ${fmt(viewMinX + 2)} ${fmt(viewMaxY - 8.1)} H ${fmt(viewMinX + 10)}" fill="none" stroke="${border}" stroke-width="0.72"/>
      <text x="${fmt(viewMinX + 11.8)}" y="${fmt(viewMaxY - 7)}" fill="#727b75" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.8" font-weight="750" letter-spacing="0.2">CUT</text>
      <path d="M ${fmt(viewMinX + 23)} ${fmt(viewMaxY - 8.1)} H ${fmt(viewMinX + 31)}" fill="none" stroke="${accent}" stroke-width="0.64" stroke-dasharray="2.4 1.6"/>
      <text x="${fmt(viewMinX + 32.8)}" y="${fmt(viewMaxY - 7)}" fill="#727b75" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.8" font-weight="750" letter-spacing="0.2">FOLD</text>
      <text x="${fmt((viewMinX + viewMaxX) / 2 + 13)}" y="${fmt(viewMaxY - 7)}" text-anchor="middle" fill="#7d857f" font-family="Avenir Next, Segoe UI, Helvetica, Arial, sans-serif" font-size="2.95" font-weight="600" letter-spacing="0.1">${footerNote}</text>
      <text x="${fmt(viewMaxX - 2)}" y="${fmt(viewMaxY - 7)}" text-anchor="end" fill="#7d857f" font-family="Georgia, Times New Roman, serif" font-size="3.25" font-style="italic">${escapeXml(state.shopName.trim() || 'Your shop')}</text>
    </g>`;

  const bg = exportMode ? `<rect x="${fmt(viewMinX)}" y="${fmt(viewMinY)}" width="${fmt(viewW)}" height="${fmt(viewH)}" fill="#fbf8f0"/>` : '';
  const metadata = exportMode
    ? `<metadata>{"design":"tuck-lid carton","width_mm":${W},"depth_mm":${D},"height_mm":${H},"material_thickness_mm":0,"bleed":"not included","tolerances":"not included"}</metadata><title>${escapeXml(title)}</title><desc>Dimensioned flat carton proof with separate cut, fold, and artwork layers.</desc>`
    : `<title>${escapeXml(title)}</title><desc>Interactive flat carton proof. Select a panel to link it with the 3D preview.</desc>`;
  const sizeAttributes = exportMode ? ` width="${fmt(viewW)}mm" height="${fmt(viewH)}mm"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(viewMinX)} ${fmt(viewMinY)} ${fmt(viewW)} ${fmt(viewH)}"${sizeAttributes} class="dieline-art" preserveAspectRatio="xMidYMid meet" style="background:transparent">
    ${metadata}
    <defs>
      <clipPath id="clip-front"><rect x="${fmt(x0)}" y="${fmt(yFront)}" width="${fmt(W)}" height="${fmt(H)}"/></clipPath>
      <clipPath id="clip-back"><rect x="${fmt(x0)}" y="${fmt(yBotBack)}" width="${fmt(W)}" height="${fmt(H)}"/></clipPath>
      <clipPath id="clip-left"><rect x="${fmt(leftOuter)}" y="${fmt(yBotFront)}" width="${fmt(H)}" height="${fmt(D)}"/></clipPath>
      <clipPath id="clip-right"><rect x="${fmt(x1)}" y="${fmt(yBotFront)}" width="${fmt(H)}" height="${fmt(D)}"/></clipPath>
      <clipPath id="clip-lid"><rect x="${fmt(x0)}" y="${fmt(yBackTop)}" width="${fmt(W)}" height="${fmt(D)}"/></clipPath>
      <clipPath id="clip-tuck"><path d="${tuck}"/></clipPath>
    </defs>
    <style>
      .dieline-art .panel-group { cursor: pointer; }
      .dieline-art .panel-group:focus { outline: none; }
      .dieline-art .selection-ring { opacity: 0; transition: opacity 140ms ease; }
      .dieline-art .panel-group:hover .selection-ring { opacity: 0.42; }
      .dieline-art .panel-group.is-selected .selection-ring { opacity: 1; }
      .dieline-art .panel-label { user-select: none; pointer-events: none; }
    </style>
    ${bg}
    ${artwork}
    ${cutLayer}
    ${foldLayer}
    ${dimensionMarkup(L)}
    ${headerText}
  </svg>`;
}

function renderDieline() {
  const markup = buildDielineSVG(false);
  if (markup === lastDielineSvg) return;
  lastDielineSvg = markup;
  dom.dielineViewport.innerHTML = markup;
  updateDielineSelectionDOM();
}

function updateDielineSelectionDOM() {
  dom.dielineViewport.querySelectorAll('[data-panel]').forEach((element) => {
    const selected = element.dataset.panel === state.selectedPanel;
    element.classList.toggle('is-selected', selected);
    element.setAttribute('aria-pressed', String(selected));
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('is-visible'), 2400);
}

function updateStaticLabels() {
  const dimsText = `${fmt(state.width)} × ${fmt(state.depth)} × ${fmt(state.height)} mm`;
  dom.dielineDimensions.textContent = dimsText;
  dom.headerProjectName.textContent = state.shopName.trim() || 'Untitled carton';
  dom.selectedPanelName.textContent = PANEL_LABELS[state.selectedPanel];
  dom.previewSelectionName.textContent = PANEL_SHORT[state.selectedPanel];
  dom.previewSelectionDot.style.background = state.colors[state.selectedPanel];
  dom.colorFields.forEach((field) => field.classList.toggle('is-active', field.dataset.panel === state.selectedPanel));
  const order = ['front', 'back', 'sides', 'lid'];
  const index = order.indexOf(state.selectedPanel) + 1;
  const count = document.querySelector('.selection-count');
  if (count) count.textContent = `${String(index).padStart(2, '0')} / 04`;
}

function setSelectedPanel(panel) {
  if (!PANEL_LABELS[panel] || panel === 'bottom' || state.selectedPanel === panel) {
    updateStaticLabels();
    return;
  }
  state.selectedPanel = panel;
  updateDielineSelectionDOM();
  updateStaticLabels();
  updateSelectionMaterials();
}

function updateSelectionMaterials() {
  if (!sceneReady) return;
  const accent = new THREE.Color('#e48a66');
  const base = new THREE.Color('#f7efdf');
  Object.entries(panelRefs).forEach(([panel, ref]) => {
    const selected = panel === state.selectedPanel || (state.selectedPanel === 'lid' && panel === 'tuck');
    ref.lineMaterial.color.copy(selected ? accent : base);
    ref.lineMaterial.opacity = selected ? 0.95 : 0.3;
    ref.lineMaterial.needsUpdate = true;
  });
}

function updateFoldUI() {
  const percent = Math.round(currentFold * 100);
  dom.foldRange.value = String(percent);
  dom.foldValue.textContent = currentFold <= 0.005 ? 'Flat' : currentFold >= 0.995 ? 'Closed' : `${percent}% folded`;
  dom.foldPercentLarge.textContent = `${percent}%`;
  dom.foldCaptionLarge.textContent = currentFold <= 0.005 ? 'flat' : currentFold >= 0.995 ? 'closed' : 'in motion';
  dom.foldToggleLabel.textContent = targetFold > 0.5 ? 'Unfold carton' : 'Close carton';
  dom.foldToggle.setAttribute('aria-label', targetFold > 0.5 ? 'Animate carton to flat layout' : 'Animate carton to closed form');
}

function setFoldTarget(value, animate = true) {
  targetFold = clamp(value, 0, 1);
  if (!animate) {
    currentFold = targetFold;
    applyFoldTransforms();
    updateShadow();
    updateFoldUI();
    fitCameraToModel();
    return;
  }
  updateFoldUI();
}

// ---------- Canvas artwork ----------

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fitCanvasFont(ctx, text, maxWidth, startSize, minSize, fontStyle) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = fontStyle(size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawTrackedText(ctx, text, cx, cy, size, tracking, weight, family, fill, alpha = 1) {
  const characters = [...text.toUpperCase()];
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  const widths = characters.map((character) => ctx.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, characters.length - 1);
  let x = cx - total / 2;
  characters.forEach((character, index) => {
    ctx.fillText(character, x, cy);
    x += widths[index] + tracking;
  });
  ctx.restore();
}

function drawCanvasArt(ctx, width, height, panel, color) {
  const fg = contrastInk(color);
  const name = state.shopName.trim() || 'Your shop';
  const initials = getInitials(name);
  const sans = '"Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';
  const random = mulberry32(hashString(`${panel}-${color}-${name}`));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(255,255,255,0.075)');
  wash.addColorStop(0.55, 'rgba(255,255,255,0)');
  wash.addColorStop(1, 'rgba(0,0,0,0.035)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = fg;
  for (let i = 0; i < 180; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const length = 0.3 + random() * Math.max(0.7, Math.min(width, height) * 0.003);
    ctx.globalAlpha = 0.018 + random() * 0.026;
    ctx.fillRect(x, y, length, 0.55);
  }
  ctx.restore();

  const margin = Math.min(width, height) * 0.055;
  const radius = Math.min(width, height) * 0.025;
  ctx.save();
  ctx.strokeStyle = fg;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = Math.max(1, Math.min(width, height) * 0.004);
  ctx.beginPath();
  ctx.roundRect(margin, margin, width - margin * 2, height - margin * 2, radius);
  ctx.stroke();
  ctx.restore();

  function rule(x1, x2, y, alpha = 0.5, lineWidth = Math.max(1, height * 0.004)) {
    ctx.save();
    ctx.strokeStyle = fg;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  function diamond(cx, cy, size, alpha = 0.6) {
    ctx.save();
    ctx.fillStyle = fg;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.28, cy - size * 0.28);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + size * 0.28, cy + size * 0.28);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.28, cy + size * 0.28);
    ctx.lineTo(cx - size, cy);
    ctx.lineTo(cx - size * 0.28, cy - size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (panel === 'front') {
    drawTrackedText(ctx, 'PAPER GOODS · EST. 2024', width / 2, height * 0.29, height * 0.057, height * 0.012, 750, sans, fg, 0.7);
    const startSize = height * 0.27;
    const size = fitCanvasFont(ctx, name, width * 0.76, startSize, height * 0.07, (s) => `italic ${s}px ${serif}`);
    ctx.save();
    ctx.font = `italic ${size}px ${serif}`;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, width / 2, height * 0.585);
    ctx.restore();
    const middleY = height * 0.71;
    const gap = height * 0.045;
    ctx.save();
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.56;
    ctx.lineWidth = Math.max(1, height * 0.005);
    ctx.beginPath();
    ctx.moveTo(width * 0.4, middleY);
    ctx.lineTo(width * 0.5 - gap, middleY);
    ctx.moveTo(width * 0.5 + gap, middleY);
    ctx.lineTo(width * 0.6, middleY);
    ctx.stroke();
    ctx.restore();
    diamond(width / 2, middleY, height * 0.022, 0.6);
    drawTrackedText(ctx, 'MADE FOR SMALL MOMENTS', width / 2, height * 0.85, height * 0.049, height * 0.012, 700, sans, fg, 0.72);
  } else if (panel === 'back') {
    ctx.save();
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.58;
    ctx.lineWidth = Math.max(1.2, height * 0.005);
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.34, height * 0.19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${height * 0.145}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, width / 2, height * 0.37);
    ctx.restore();
    diamond(width / 2, height * 0.16, height * 0.035, 0.55);
    const size = fitCanvasFont(ctx, name, width * 0.75, height * 0.235, height * 0.065, (s) => `italic ${s}px ${serif}`);
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${size}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, width / 2, height * 0.68);
    ctx.restore();
    drawTrackedText(ctx, 'PACKAGED WITH CARE', width / 2, height * 0.84, height * 0.047, height * 0.016, 750, sans, fg, 0.7);
  } else if (panel === 'sides') {
    const sealX = width * 0.145;
    const sealY = height * 0.5;
    ctx.save();
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.58;
    ctx.lineWidth = Math.max(1.2, height * 0.006);
    ctx.beginPath();
    ctx.arc(sealX, sealY, height * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${height * 0.145}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, sealX, sealY + height * 0.015);
    ctx.restore();
    const textX = width * 0.58;
    drawTrackedText(ctx, 'STATIONERY', textX, height * 0.43, height * 0.048, height * 0.018, 750, sans, fg, 0.62);
    const size = fitCanvasFont(ctx, name, width * 0.52, height * 0.205, height * 0.06, (s) => `italic ${s}px ${serif}`);
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${size}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, textX, height * 0.61);
    ctx.restore();
    drawTrackedText(ctx, 'SMALL-BATCH GOODS', textX, height * 0.79, height * 0.045, height * 0.012, 700, sans, fg, 0.65);
  } else if (panel === 'lid') {
    diamond(width / 2, height * 0.235, height * 0.04, 0.62);
    drawTrackedText(ctx, 'OPEN SLOWLY', width / 2, height * 0.34, height * 0.045, height * 0.014, 750, sans, fg, 0.65);
    const size = fitCanvasFont(ctx, name, width * 0.75, height * 0.22, height * 0.06, (s) => `italic ${s}px ${serif}`);
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${size}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, width / 2, height * 0.57);
    ctx.restore();
    rule(width * 0.37, width * 0.63, height * 0.68, 0.38, Math.max(1, height * 0.0035));
    drawTrackedText(ctx, 'TUCK-LID CARTON', width / 2, height * 0.79, height * 0.043, height * 0.016, 700, sans, fg, 0.7);
  } else if (panel === 'tuck') {
    diamond(width / 2, height * 0.35, height * 0.16, 0.55);
    ctx.save();
    ctx.fillStyle = fg;
    ctx.font = `italic ${Math.min(height * 0.28, width * 0.12)}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, width / 2, height * 0.69);
    ctx.restore();
  } else if (panel === 'bottom') {
    drawTrackedText(ctx, 'FOLDLINE', width / 2, height * 0.47, height * 0.085, height * 0.025, 800, sans, fg, 0.22);
    drawTrackedText(ctx, 'BASE PANEL · ZERO-THICKNESS PROOF', width / 2, height * 0.57, height * 0.035, height * 0.009, 650, sans, fg, 0.2);
  }
}

function createPanelTexture(panel, widthMm, heightMm, color) {
  const maxPixels = 920;
  let width = maxPixels;
  let height = Math.round(maxPixels * (heightMm / widthMm));
  if (height > maxPixels) {
    height = maxPixels;
    width = Math.round(maxPixels * (widthMm / heightMm));
  }
  width = Math.max(320, width);
  height = Math.max(190, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawCanvasArt(ctx, width, height, panel, color);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  texture.needsUpdate = true;
  return texture;
}

// ---------- Three.js scene ----------

let scene;
let camera;
let renderer;
let controls;
let cartonRoot;
let shadowMesh;
let sceneReady = false;
let pickMeshes = [];
let panelRefs = {};
let panelPivots = {};
let raycaster;
let pointer;
let pointerDownPosition = null;
let cameraView = 'iso';
let lastFitFold = -1;
let lastFrameTime = performance.now();
let resizeObserver;

const defaultCameraDirection = new THREE.Vector3(1.18, 0.72, 1.5).normalize();

function initScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: dom.sceneCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(33, 1, 2, 5000);
  camera.up.set(0, 1, 0);

  controls = new OrbitControls(camera, dom.sceneCanvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.minDistance = 90;
  controls.maxDistance = 2300;

  const hemi = new THREE.HemisphereLight(0xfff5e4, 0x17372d, 1.8);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff0d7, 2.7);
  key.position.set(260, 430, 340);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbad7c8, 1.2);
  fill.position.set(-330, 180, -170);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffcda8, 1.05);
  rim.position.set(90, 230, -350);
  scene.add(rim);

  shadowMesh = createContactShadow();
  scene.add(shadowMesh);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  dom.sceneCanvas.addEventListener('pointerdown', onPointerDown);
  dom.sceneCanvas.addEventListener('pointerup', onPointerUp);
  dom.sceneCanvas.addEventListener('pointerleave', () => {
    pointerDownPosition = null;
  });

  resizeObserver = new ResizeObserver(onViewportResize);
  resizeObserver.observe(dom.previewViewport);
  onViewportResize();

  sceneReady = true;
  rebuildCarton();
  resetCameraView();
  requestAnimationFrame(animationLoop);
}

function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 256, 15, 256, 256, 245);
  gradient.addColorStop(0, 'rgba(0, 18, 12, 0.38)');
  gradient.addColorStop(0.38, 'rgba(0, 18, 12, 0.21)');
  gradient.addColorStop(0.72, 'rgba(0, 18, 12, 0.065)');
  gradient.addColorStop(1, 'rgba(0, 18, 12, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.55;
  mesh.renderOrder = -1;
  return mesh;
}

function makeQuadGeometry(x0, x1, y0, y1, normalSign, uvMode) {
  const positions = new Float32Array([
    x0, y0, 0,
    x1, y0, 0,
    x1, y1, 0,
    x0, y1, 0,
  ]);
  const uvs = new Float32Array(8);
  const corners = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  corners.forEach(([x, y], index) => {
    const [u, v] = uvMode(x, y, x0, x1, y0, y1);
    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
  });
  const indices = normalSign > 0
    ? new Uint16Array([0, 1, 2, 0, 2, 3])
    : new Uint16Array([0, 2, 1, 0, 3, 2]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function panelTextureSpec() {
  const L = getLayout();
  return {
    front: { width: L.W, height: L.H, color: state.colors.front },
    back: { width: L.W, height: L.H, color: state.colors.back },
    sides: { width: L.D, height: L.H, color: state.colors.sides },
    lid: { width: L.W, height: L.D, color: state.colors.lid },
    tuck: { width: L.tuckWidth, height: L.tuckHeight, color: state.colors.lid },
    bottom: { width: L.W, height: L.D, color: '#d9cdba' },
  };
}

function createPanelRefs() {
  panelRefs = {};
  const specs = panelTextureSpec();
  Object.entries(specs).forEach(([panel, spec]) => {
    const texture = createPanelTexture(panel, spec.width, spec.height, spec.color);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf7efdf,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    panelRefs[panel] = { texture, material, lineMaterial };
  });
  updateSelectionMaterials();
}

function createLineLoop(x0, x1, y0, y1, material, z = 0) {
  const points = [
    new THREE.Vector3(x0, y0, z),
    new THREE.Vector3(x1, y0, z),
    new THREE.Vector3(x1, y1, z),
    new THREE.Vector3(x0, y1, z),
    new THREE.Vector3(x0, y0, z),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 3;
  return line;
}

function addPanelPair(parent, logicalPanel, x0, x1, y0, y1, options) {
  const ref = panelRefs[logicalPanel];
  const { flatUv, outsideUv, pickable = true, zOffset = 0 } = options;
  const frontGeometry = makeQuadGeometry(x0, x1, y0, y1, 1, flatUv);
  const backGeometry = makeQuadGeometry(x0, x1, y0, y1, -1, outsideUv);
  const frontMesh = new THREE.Mesh(frontGeometry, ref.material);
  const backMesh = new THREE.Mesh(backGeometry, ref.material);
  frontMesh.position.z = 0.055 + zOffset;
  backMesh.position.z = -0.055 + zOffset;
  frontMesh.renderOrder = 2;
  backMesh.renderOrder = 2;
  frontMesh.userData.logicalPanel = options.selectAs || logicalPanel;
  backMesh.userData.logicalPanel = options.selectAs || logicalPanel;
  parent.add(frontMesh, backMesh);
  if (pickable) pickMeshes.push(frontMesh, backMesh);
  parent.add(createLineLoop(x0, x1, y0, y1, ref.lineMaterial, zOffset + 0.115));
  parent.add(createLineLoop(x0, x1, y0, y1, ref.lineMaterial, zOffset - 0.115));
  return { frontMesh, backMesh };
}

function uvFrontFlat(x, y, x0, x1, y0, y1) {
  return [(x - x0) / (x1 - x0), (y - y0) / (y1 - y0)];
}

function uvFrontOutside(x, y, x0, x1, y0, y1) {
  return [(x - x0) / (x1 - x0), 1 - (y - y0) / (y1 - y0)];
}

function uvBackOutside(x, y, x0, x1, y0, y1) {
  return [1 - (x - x0) / (x1 - x0), (y - y0) / (y1 - y0)];
}

function uvSideFlat(x, y, x0, x1, y0, y1) {
  return [1 - (y - y0) / (y1 - y0), (x - x0) / (x1 - x0)];
}

function uvSideLeftOutside(x, y, x0, x1, y0, y1) {
  return [1 - (y - y0) / (y1 - y0), 1 - (x - x0) / (x1 - x0)];
}

function uvSideRightOutside(x, y, x0, x1, y0, y1) {
  return [(y - y0) / (y1 - y0), (x - x0) / (x1 - x0)];
}

function addHingeSegment(parent, startX, startY, endX, endY, z = 0) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(startX, startY, z),
    new THREE.Vector3(endX, endY, z),
  ]);
  const material = new THREE.LineDashedMaterial({
    color: 0xe18b69,
    transparent: true,
    opacity: 0.8,
    dashSize: 2.1,
    gapSize: 1.45,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.renderOrder = 4;
  parent.add(line);
  return line;
}

function rebuildCarton() {
  if (!sceneReady) return;
  if (cartonRoot) {
    scene.remove(cartonRoot);
    disposeObjectTree(cartonRoot);
  }
  pickMeshes = [];
  panelPivots = {};
  panelRefs = {};

  createPanelRefs();
  const L = getLayout();
  cartonRoot = new THREE.Group();
  cartonRoot.rotation.x = -Math.PI / 2;
  scene.add(cartonRoot);

  addPanelPair(
    cartonRoot,
    'bottom',
    L.x0,
    L.x1,
    L.yBotFront,
    L.yBotBack,
    { flatUv: uvFrontFlat, outsideUv: uvFrontFlat, pickable: false },
  );

  const frontPivot = new THREE.Group();
  frontPivot.position.set(0, L.yBotFront, 0);
  cartonRoot.add(frontPivot);
  addPanelPair(frontPivot, 'front', L.x0, L.x1, -L.H, 0, {
    flatUv: uvFrontFlat,
    outsideUv: uvFrontOutside,
  });

  const backPivot = new THREE.Group();
  backPivot.position.set(0, L.yBotBack, 0);
  cartonRoot.add(backPivot);
  addPanelPair(backPivot, 'back', L.x0, L.x1, 0, L.H, {
    flatUv: uvFrontFlat,
    outsideUv: uvBackOutside,
  });

  const leftPivot = new THREE.Group();
  leftPivot.position.set(L.x0, 0, 0);
  cartonRoot.add(leftPivot);
  addPanelPair(leftPivot, 'sides', -L.H, 0, L.yBotFront, L.yBotBack, {
    flatUv: uvSideFlat,
    outsideUv: uvSideLeftOutside,
  });

  const rightPivot = new THREE.Group();
  rightPivot.position.set(L.x1, 0, 0);
  cartonRoot.add(rightPivot);
  addPanelPair(rightPivot, 'sides', 0, L.H, L.yBotFront, L.yBotBack, {
    flatUv: uvSideFlat,
    outsideUv: uvSideRightOutside,
  });

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, L.H, 0);
  backPivot.add(lidPivot);
  addPanelPair(lidPivot, 'lid', L.x0, L.x1, 0, L.D, {
    flatUv: uvFrontFlat,
    outsideUv: uvFrontOutside,
  });

  const tuckPivot = new THREE.Group();
  tuckPivot.position.set(0, L.D, 0);
  lidPivot.add(tuckPivot);
  addPanelPair(tuckPivot, 'tuck', L.tuckLeft, L.tuckRight, 0, L.tuckHeight, {
    flatUv: uvFrontFlat,
    outsideUv: uvFrontOutside,
    selectAs: 'lid',
    zOffset: -0.16,
  });

  addHingeSegment(cartonRoot, L.x0, L.yBotFront, L.x1, L.yBotFront, 0.12);
  addHingeSegment(cartonRoot, L.x0, L.yBotBack, L.x1, L.yBotBack, 0.12);
  addHingeSegment(cartonRoot, L.x0, L.yBotFront, L.x0, L.yBotBack, 0.12);
  addHingeSegment(cartonRoot, L.x1, L.yBotFront, L.x1, L.yBotBack, 0.12);
  addHingeSegment(backPivot, L.x0, L.H, L.x1, L.H, 0.12);
  addHingeSegment(lidPivot, L.tuckLeft, L.D, L.tuckRight, L.D, 0.12);

  panelPivots = { front: frontPivot, back: backPivot, left: leftPivot, right: rightPivot, lid: lidPivot, tuck: tuckPivot };

  applyFoldTransforms();
  updateShadow();
  updateSelectionMaterials();
  fitCameraToModel(true);
  lastDielineSvg = '';
  renderDieline();
  updateStaticLabels();
}

function disposeObjectTree(root) {
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];
    materials.forEach((material) => {
      if (material.map) textures.add(material.map);
      material.dispose();
    });
  });
  textures.forEach((texture) => texture.dispose());
}

function applyFoldTransforms() {
  if (!panelPivots.front) return;
  const fold = currentFold;
  const angle = fold * Math.PI * 0.5;
  panelPivots.front.rotation.x = -angle;
  panelPivots.back.rotation.x = angle;
  panelPivots.left.rotation.y = angle;
  panelPivots.right.rotation.y = -angle;
  panelPivots.lid.rotation.x = angle;
  panelPivots.tuck.rotation.x = angle;
}

function updateShadow() {
  if (!shadowMesh) return;
  const L = getLayout();
  const closedWidth = L.W * 1.55;
  const flatWidth = (L.W + L.H * 2) * 1.08;
  const closedDepth = L.D * 1.55;
  const flatDepth = (L.D * 2 + L.H * 2 + L.tuckHeight) * 1.02;
  const ease = smoothstep(0, 1, currentFold);
  shadowMesh.scale.set(lerp(flatWidth, closedWidth, ease), lerp(flatDepth, closedDepth, ease), 1);
  shadowMesh.position.z = lerp(-((L.yFront + L.tuckTop) / 2), 0, ease);
  shadowMesh.material.opacity = lerp(0.42, 0.76, ease);
}

function fitCameraToModel(force = false) {
  if (!camera || !controls) return;
  if (!force && Math.abs(currentFold - lastFitFold) < 0.0015) return;
  lastFitFold = currentFold;
  const L = getLayout();
  const ease = smoothstep(0, 1, currentFold);
  const flatCenterZ = -((L.yFront + L.tuckTop) / 2);
  const target = new THREE.Vector3(
    0,
    lerp(0, L.H * 0.42, ease),
    lerp(flatCenterZ, 0, ease),
  );

  const flatRadius = Math.hypot(L.W + L.H * 2, L.D * 2 + L.H * 2 + L.tuckHeight) * 0.5;
  const closedRadius = Math.hypot(L.W, L.D, L.H) * 0.5;
  const radius = lerp(flatRadius, closedRadius, ease) * 1.06;
  const aspect = Math.max(0.32, dom.previewViewport.clientWidth / Math.max(1, dom.previewViewport.clientHeight));
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = Math.max(
    (radius / Math.tan(vFov / 2)),
    (radius / Math.tan(hFov / 2)),
  ) * 1.08 + 12;

  controls.minDistance = Math.max(35, distance * 0.14);
  controls.maxDistance = Math.max(2800, distance * 2.6);
  const direction = camera.position.distanceTo(controls.target) > 0.001
    ? camera.position.clone().sub(controls.target).normalize()
    : defaultCameraDirection.clone();
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.near = Math.max(1, distance * 0.015);
  camera.far = Math.max(2000, distance * 8);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  controls.update();
}

function resetCameraView(view = 'iso') {
  if (!camera || !controls) return;
  cameraView = view;
  const directions = {
    iso: defaultCameraDirection,
    top: new THREE.Vector3(0.001, 1, 0.13).normalize(),
    front: new THREE.Vector3(0.02, 0.28, 1).normalize(),
  };
  const direction = directions[view] || defaultCameraDirection;
  const currentTarget = controls.target.clone();
  const L = getLayout();
  const ease = smoothstep(0, 1, currentFold);
  const target = new THREE.Vector3(
    0,
    lerp(0, L.H * 0.42, ease),
    lerp(-((L.yFront + L.tuckTop) / 2), 0, ease),
  );
  const distance = camera.position.distanceTo(currentTarget) || 400;
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  controls.update();
  lastFitFold = currentFold;
  fitCameraToModel(true);
  dom.viewButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
}

function onViewportResize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, dom.previewViewport.clientWidth);
  const height = Math.max(1, dom.previewViewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (sceneReady) fitCameraToModel(true);
}

function updatePointer(event) {
  const rect = dom.sceneCanvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(event) {
  pointerDownPosition = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!pointerDownPosition) return;
  const distance = Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y);
  pointerDownPosition = null;
  if (distance > 6) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(pickMeshes, false);
  if (intersections.length) {
    const panel = intersections[0].object.userData.logicalPanel;
    if (panel) setSelectedPanel(panel);
  }
}

function animationLoop(now) {
  requestAnimationFrame(animationLoop);
  const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  if (Math.abs(currentFold - targetFold) > 0.0001) {
    const damp = 1 - Math.exp(-dt * 7.5);
    currentFold += (targetFold - currentFold) * damp;
    if (Math.abs(targetFold - currentFold) < 0.0008) currentFold = targetFold;
    applyFoldTransforms();
    updateShadow();
    fitCameraToModel();
    updateFoldUI();
  }
  if (foldFrameValue !== Math.round(currentFold * 1000)) {
    foldFrameValue = Math.round(currentFold * 1000);
  }
  controls.update();
  renderer.render(scene, camera);
}

function refreshArtwork() {
  if (sceneReady) {
    const specs = panelTextureSpec();
    Object.entries(specs).forEach(([panel, spec]) => {
      const ref = panelRefs[panel];
      if (!ref) return;
      const nextTexture = createPanelTexture(panel, spec.width, spec.height, spec.color);
      const previousTexture = ref.texture;
      ref.texture = nextTexture;
      ref.material.map = nextTexture;
      ref.material.needsUpdate = true;
      if (previousTexture) previousTexture.dispose();
    });
  }
  lastDielineSvg = '';
  renderDieline();
  updateStaticLabels();
}

// ---------- UI wiring ----------

function scheduleArtworkRefresh() {
  window.clearTimeout(artRefreshTimer);
  artRefreshTimer = window.setTimeout(refreshArtwork, 75);
}

function scheduleCartonRebuild() {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(() => {
    lastDielineSvg = '';
    rebuildCarton();
    updateStaticLabels();
  }, 120);
}

function bindDimensionInput(input, key, min, max) {
  const commit = () => {
    const value = clamp(Number(input.value) || state[key], min, max);
    state[key] = Math.round(value);
    input.value = String(state[key]);
    scheduleCartonRebuild();
  };
  input.addEventListener('input', () => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    state[key] = Math.round(clamp(parsed, min, max));
    scheduleCartonRebuild();
  });
  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);
}

function updateColorOutputs() {
  Object.entries(state.colors).forEach(([panel, color]) => {
    dom.hexOutputs[panel].textContent = color.toUpperCase();
    dom.colorInputs[panel].value = color;
  });
  updateStaticLabels();
}

function resetSample() {
  window.clearTimeout(rebuildTimer);
  window.clearTimeout(artRefreshTimer);
  Object.assign(state, {
    width: DEFAULT_STATE.width,
    depth: DEFAULT_STATE.depth,
    height: DEFAULT_STATE.height,
    shopName: DEFAULT_STATE.shopName,
    selectedPanel: DEFAULT_STATE.selectedPanel,
    colors: { ...DEFAULT_STATE.colors },
  });
  dom.widthInput.value = String(state.width);
  dom.depthInput.value = String(state.depth);
  dom.heightInput.value = String(state.height);
  dom.shopNameInput.value = state.shopName;
  updateColorOutputs();
  targetFold = 1;
  currentFold = 1;
  lastFitFold = -1;
  rebuildCarton();
  updateFoldUI();
  resetCameraView('iso');
  showToast('Sample design restored');
}

function exportSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${buildDielineSVG(true)}`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(state.shopName)}-tuck-lid-proof.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  showToast('Dimensioned SVG proof exported');
}

function bindUI() {
  bindDimensionInput(dom.widthInput, 'width', ...LIMITS.width);
  bindDimensionInput(dom.depthInput, 'depth', ...LIMITS.depth);
  bindDimensionInput(dom.heightInput, 'height', ...LIMITS.height);

  dom.shopNameInput.addEventListener('input', () => {
    state.shopName = dom.shopNameInput.value;
    updateStaticLabels();
    scheduleArtworkRefresh();
  });
  dom.shopNameInput.addEventListener('change', () => {
    const normalized = dom.shopNameInput.value.trim() || DEFAULT_STATE.shopName;
    state.shopName = normalized;
    dom.shopNameInput.value = normalized;
    scheduleArtworkRefresh();
  });

  Object.entries(dom.colorInputs).forEach(([panel, input]) => {
    const field = input.closest('.color-field');
    field?.addEventListener('click', () => setSelectedPanel(panel));
    input.addEventListener('input', () => {
      state.colors[panel] = input.value;
      dom.hexOutputs[panel].textContent = input.value.toUpperCase();
      setSelectedPanel(panel);
      updateStaticLabels();
      scheduleArtworkRefresh();
    });
  });

  dom.foldRange.addEventListener('input', () => {
    setFoldTarget(Number(dom.foldRange.value) / 100, false);
  });

  dom.foldToggle.addEventListener('click', () => {
    setFoldTarget(targetFold > 0.5 ? 0 : 1, true);
  });

  dom.resetButton.addEventListener('click', resetSample);
  dom.exportButton.addEventListener('click', exportSvg);

  dom.dielineViewport.addEventListener('click', (event) => {
    const panelElement = event.target.closest('[data-panel]');
    if (panelElement) setSelectedPanel(panelElement.dataset.panel);
  });
  dom.dielineViewport.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const panelElement = event.target.closest('[data-panel]');
    if (!panelElement) return;
    event.preventDefault();
    setSelectedPanel(panelElement.dataset.panel);
  });

  dom.viewButtons.forEach((button) => {
    button.addEventListener('click', () => resetCameraView(button.dataset.view));
  });
}

function init() {
  dom.widthInput.value = String(state.width);
  dom.depthInput.value = String(state.depth);
  dom.heightInput.value = String(state.height);
  dom.shopNameInput.value = state.shopName;
  updateColorOutputs();
  bindUI();
  renderDieline();
  updateStaticLabels();
  updateFoldUI();
  try {
    initScene();
  } catch (error) {
    console.error('Unable to initialise 3D preview', error);
    const fallback = document.createElement('div');
    fallback.className = 'webgl-fallback';
    fallback.textContent = 'The 3D preview requires WebGL. The dimensioned dieline and SVG export remain available.';
    dom.previewViewport.appendChild(fallback);
  }
}

init();
