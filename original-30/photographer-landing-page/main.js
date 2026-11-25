import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

gsap.ticker.lagSmoothing(0);

const clamp = THREE.MathUtils.clamp;
const TAU = Math.PI * 2;

const dom = {
  app: document.querySelector('#app'),
  canvas: document.querySelector('#scene'),
  poster: document.querySelector('#cameraPoster'),
  loader: document.querySelector('#loader'),
  loaderCenter: document.querySelector('.loader-center'),
  spinner: document.querySelector('#spinner'),
  header: document.querySelector('#siteHeader'),
  siteHeader: document.querySelector('#siteHeader'),
  backdropStack: document.querySelector('#backdropStack'),
  stageReadout: document.querySelector('#stageReadout'),
  stageNumber: document.querySelector('#stageNumber'),
  chapterDots: document.querySelector('#chapterDots'),
  heroCopy: document.querySelector('#heroCopy'),
  projectCopy: document.querySelector('#projectCopy'),
  projectIndex: document.querySelector('#projectIndex'),
  projectCategory: document.querySelector('#projectCategory'),
  projectTitle: document.querySelector('#projectTitle'),
  projectLocation: document.querySelector('#projectLocation'),
  projectYear: document.querySelector('#projectYear'),
  contactCopy: document.querySelector('#contactCopy'),
  projectHit: document.querySelector('#projectHit'),
  scrollCue: document.querySelector('#scrollCue'),
  scrollCueText: document.querySelector('#scrollCueText'),
  viewStory: document.querySelector('#viewStory'),
  zoomPhoto: document.querySelector('#zoomPhoto'),
  blog: document.querySelector('#blog'),
  blogScroll: document.querySelector('#blogScroll'),
  blogBack: document.querySelector('#blogBack'),
  blogHero: document.querySelector('#blogHero'),
  blogImage: document.querySelector('#blogImage'),
  blogImageIndex: document.querySelector('#blogImageIndex'),
  blogCategory: document.querySelector('#blogCategory'),
  blogLocation: document.querySelector('#blogLocation'),
  blogYear: document.querySelector('#blogYear'),
  blogTitle: document.querySelector('#blogTitle'),
  blogDeck: document.querySelector('#blogDeck'),
  blogBody: document.querySelector('#blogBody'),
  blogCamera: document.querySelector('#blogCamera'),
  nextProject: document.querySelector('#nextProject')
};

const state = {
  introDone: false,
  stage: 0,
  project: 0,
  transitioning: false,
  inBlog: false,
  closingBlog: false,
  touchStartX: 0,
  touchStartY: 0
};

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

function grain(ctx, width, height, amount = 0.055) {
  const tile = document.createElement('canvas');
  tile.width = 180;
  tile.height = 180;
  const tileCtx = tile.getContext('2d');
  const pixels = tileCtx.createImageData(tile.width, tile.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = Math.random() * 255;
    pixels.data[i] = value;
    pixels.data[i + 1] = value;
    pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  tileCtx.putImageData(pixels, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function vignette(ctx, width, height, strength = 0.48) {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.2,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.73
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.58, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function ridge(ctx, width, height, points, base, fill) {
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.lineTo(width, points[points.length - 1][1]);
  ctx.lineTo(width, height);
  ctx.lineTo(0, base);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawAlpine(ctx, width, height) {
  const rng = mulberry32(92);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0b171e');
  sky.addColorStop(0.32, '#354d56');
  sky.addColorStop(0.56, '#879a9d');
  sky.addColorStop(0.73, '#d6d0c1');
  sky.addColorStop(1, '#b3aca0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.64, height * 0.5, 0, width * 0.64, height * 0.5, width * 0.33);
  glow.addColorStop(0, 'rgba(255,246,221,0.72)');
  glow.addColorStop(0.24, 'rgba(255,239,205,0.32)');
  glow.addColorStop(1, 'rgba(255,239,205,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 14; i += 1) {
    const y = 120 + rng() * 380;
    const cloud = ctx.createLinearGradient(width * 0.1, y, width * 0.9, y);
    cloud.addColorStop(0, 'rgba(235,238,231,0)');
    cloud.addColorStop(0.48, 'rgba(235,238,231,0.7)');
    cloud.addColorStop(1, 'rgba(235,238,231,0)');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(width * (0.22 + rng() * 0.56), y, 160 + rng() * 280, 8 + rng() * 23, -0.08, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  const far = [
    [0, 610], [120, 540], [210, 575], [325, 452], [415, 540], [525, 420],
    [640, 535], [750, 380], [865, 505], [980, 444], [1110, 545], [1210, 465], [1320, 530], [1400, 490]
  ];
  ridge(ctx, width, height, far, 700, 'rgba(91,112,117,0.68)');

  const mid = [
    [0, 716], [105, 640], [215, 689], [330, 520], [425, 630], [535, 485],
    [645, 615], [760, 445], [865, 595], [985, 505], [1090, 645], [1210, 540],
    [1310, 637], [1400, 575]
  ];
  ridge(ctx, width, height, mid, 800, '#2c3d42');

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#d8d9cf';
  ctx.beginPath();
  ctx.moveTo(760, 445);
  ctx.lineTo(812, 535);
  ctx.lineTo(782, 518);
  ctx.lineTo(755, 560);
  ctx.lineTo(725, 512);
  ctx.lineTo(700, 530);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(330, 520);
  ctx.lineTo(375, 592);
  ctx.lineTo(348, 575);
  ctx.lineTo(325, 607);
  ctx.lineTo(304, 570);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const near = [
    [0, 830], [95, 752], [185, 793], [285, 690], [390, 762], [505, 704],
    [615, 780], [725, 698], [840, 775], [960, 715], [1085, 788], [1185, 728],
    [1300, 800], [1400, 744]
  ];
  ridge(ctx, width, height, near, 920, '#111a1c');

  const water = ctx.createLinearGradient(0, 720, 0, height);
  water.addColorStop(0, 'rgba(121,144,144,0.5)');
  water.addColorStop(0.42, 'rgba(48,70,72,0.78)');
  water.addColorStop(1, '#10191b');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, 725);
  ctx.bezierCurveTo(340, 690, 900, 705, width, 735);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#d5d7ce';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 80; i += 1) {
    const y = 745 + rng() * 235;
    const x = rng() * width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18 + rng() * 120, y + (rng() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.restore();

  const fog = ctx.createLinearGradient(0, 470, 0, 700);
  fog.addColorStop(0, 'rgba(216,220,211,0)');
  fog.addColorStop(0.5, 'rgba(216,220,211,0.3)');
  fog.addColorStop(1, 'rgba(216,220,211,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 450, width, 280);

  ctx.save();
  ctx.fillStyle = '#0b1011';
  const px = 738;
  const py = 712;
  ctx.beginPath();
  ctx.arc(px, py - 20, 5, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#0b1011';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py - 14);
  ctx.lineTo(px, py + 12);
  ctx.moveTo(px, py + 12);
  ctx.lineTo(px - 8, py + 32);
  ctx.moveTo(px, py + 12);
  ctx.lineTo(px + 8, py + 32);
  ctx.moveTo(px - 5, py - 6);
  ctx.lineTo(px - 16, py + 9);
  ctx.moveTo(px + 5, py - 6);
  ctx.lineTo(px + 16, py + 8);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#d9dcd3';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i += 1) {
    const x = 470 + i * 17 + rng() * 8;
    const y = 265 + rng() * 40;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 3);
    ctx.quadraticCurveTo(x - 3, y - 3, x + 2, y + 1);
    ctx.quadraticCurveTo(x + 7, y - 3, x + 12, y + 2);
    ctx.stroke();
  }
  ctx.restore();

  vignette(ctx, width, height, 0.58);
  grain(ctx, width, height, 0.06);
}

function drawDesert(ctx, width, height) {
  const rng = mulberry32(8);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#172536');
  sky.addColorStop(0.32, '#544b59');
  sky.addColorStop(0.55, '#b46f58');
  sky.addColorStop(0.73, '#e7a469');
  sky.addColorStop(1, '#f2ce8b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const sunX = width * 0.73;
  const sunY = height * 0.55;
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 280);
  halo.addColorStop(0, 'rgba(255,224,162,0.72)');
  halo.addColorStop(0.14, 'rgba(255,203,126,0.32)');
  halo.addColorStop(1, 'rgba(255,196,122,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f8dfaa';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 53, 0, TAU);
  ctx.fill();

  function dune(points, fill) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, points[0][1]);
    ctx.bezierCurveTo(points[1][0], points[1][1], points[2][0], points[2][1], points[3][0], points[3][1]);
    ctx.bezierCurveTo(points[4][0], points[4][1], points[5][0], points[5][1], width, points[6][1]);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  dune([[0, 690], [250, 620], [450, 610], [610, 656], [880, 586], [1130, 648], 1400, 606], '#9d573f');
  dune([[0, 785], [260, 696], [510, 704], [660, 752], [900, 665], [1120, 746], 1400, 700], '#b96942');
  dune([[0, 910], [190, 790], [420, 776], [610, 834], [860, 728], [1130, 826], 1400, 778], '#7d412f');

  ctx.save();
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffc887';
  ctx.beginPath();
  ctx.moveTo(0, 786);
  ctx.bezierCurveTo(260, 697, 510, 705, 660, 753);
  ctx.bezierCurveTo(900, 666, 1120, 747, 1400, 701);
  ctx.stroke();
  ctx.restore();

  const foreground = ctx.createLinearGradient(0, 790, 0, height);
  foreground.addColorStop(0, 'rgba(67,34,29,0)');
  foreground.addColorStop(1, '#3a2221');
  ctx.fillStyle = foreground;
  ctx.fillRect(0, 760, width, 240);

  const figureX = width * 0.43;
  const figureY = height * 0.665;
  ctx.save();
  ctx.fillStyle = '#2b1a19';
  ctx.beginPath();
  ctx.arc(figureX, figureY - 56, 8, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2b1a19';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(figureX, figureY - 47);
  ctx.lineTo(figureX - 3, figureY);
  ctx.moveTo(figureX - 3, figureY);
  ctx.lineTo(figureX - 17, figureY + 38);
  ctx.moveTo(figureX - 3, figureY);
  ctx.lineTo(figureX + 12, figureY + 37);
  ctx.moveTo(figureX - 1, figureY - 34);
  ctx.lineTo(figureX - 18, figureY - 13);
  ctx.moveTo(figureX + 1, figureY - 34);
  ctx.lineTo(figureX + 16, figureY - 17);
  ctx.stroke();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(figureX + 40, figureY + 42, 60, 5, -0.12, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.46;
  ctx.strokeStyle = '#3a2727';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i += 1) {
    const x = 300 + i * 23 + rng() * 10;
    const y = 260 + rng() * 70;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.quadraticCurveTo(x, y - 7, x + 9, y);
    ctx.stroke();
  }
  ctx.restore();

  vignette(ctx, width, height, 0.44);
  grain(ctx, width, height, 0.052);
}

function drawAtlantic(ctx, width, height) {
  const rng = mulberry32(19);
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
  sky.addColorStop(0, '#9da9a9');
  sky.addColorStop(0.65, '#d7d8d2');
  sky.addColorStop(1, '#e8e3d8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const light = ctx.createRadialGradient(width * 0.7, height * 0.35, 0, width * 0.7, height * 0.35, 380);
  light.addColorStop(0, 'rgba(255,249,230,0.52)');
  light.addColorStop(1, 'rgba(255,249,230,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  const sea = ctx.createLinearGradient(0, 470, 0, height);
  sea.addColorStop(0, '#7e9393');
  sea.addColorStop(0.33, '#3e6266');
  sea.addColorStop(0.7, '#1d3b40');
  sea.addColorStop(1, '#112428');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 468, width, height - 468);

  ctx.save();
  ctx.fillStyle = 'rgba(230,230,220,0.33)';
  ctx.fillRect(0, 455, width, 22);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#f0efe7';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 160; i += 1) {
    const y = 510 + rng() * 410;
    const depth = (y - 470) / 430;
    const x = rng() * width;
    const len = 20 + rng() * 155 * depth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.45, y - 2 - rng() * 4, x + len, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#1b282a';
  ctx.beginPath();
  ctx.moveTo(width, 370);
  ctx.lineTo(width - 110, 422);
  ctx.lineTo(width - 155, 485);
  ctx.lineTo(width - 255, 540);
  ctx.lineTo(width - 300, 650);
  ctx.lineTo(width, 695);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#d8d5c9';
  ctx.fillRect(width - 196, 335, 28, 100);
  ctx.fillStyle = '#30393a';
  ctx.beginPath();
  ctx.moveTo(width - 205, 335);
  ctx.lineTo(width - 180, 309);
  ctx.lineTo(width - 154, 335);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a95638';
  ctx.fillRect(width - 196, 361, 28, 16);
  ctx.restore();

  ctx.fillStyle = '#0c1517';
  ctx.beginPath();
  ctx.moveTo(0, 620);
  ctx.lineTo(155, 585);
  ctx.lineTo(268, 635);
  ctx.lineTo(330, 760);
  ctx.lineTo(285, 930);
  ctx.lineTo(0, 1000);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0a1214';
  ctx.beginPath();
  ctx.moveTo(0, 870);
  ctx.lineTo(115, 820);
  ctx.lineTo(250, 875);
  ctx.lineTo(370, 940);
  ctx.lineTo(420, 1000);
  ctx.lineTo(0, 1000);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#d9dbd3';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i += 1) {
    const x = 240 + rng() * 940;
    const y = 560 + rng() * 80;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 35, y - 3, x + 80, y + 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = '#394244';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i += 1) {
    const x = 520 + i * 19;
    const y = 260 + rng() * 55;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.quadraticCurveTo(x, y - 6, x + 9, y);
    ctx.stroke();
  }
  ctx.restore();

  vignette(ctx, width, height, 0.46);
  grain(ctx, width, height, 0.055);
}

function drawCity(ctx, width, height) {
  const rng = mulberry32(35);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#071017');
  sky.addColorStop(0.48, '#14232c');
  sky.addColorStop(1, '#111417');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const cyanGlow = ctx.createRadialGradient(width * 0.18, height * 0.46, 0, width * 0.18, height * 0.46, 390);
  cyanGlow.addColorStop(0, 'rgba(72,154,164,0.35)');
  cyanGlow.addColorStop(1, 'rgba(72,154,164,0)');
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(0, 0, width, height);

  const redGlow = ctx.createRadialGradient(width * 0.79, height * 0.47, 0, width * 0.79, height * 0.47, 320);
  redGlow.addColorStop(0, 'rgba(189,67,44,0.3)');
  redGlow.addColorStop(1, 'rgba(189,67,44,0)');
  ctx.fillStyle = redGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#0b1218';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, height);
  ctx.lineTo(360, height);
  ctx.lineTo(410, 190);
  ctx.lineTo(260, 110);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0a1016';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width, height);
  ctx.lineTo(1040, height);
  ctx.lineTo(980, 150);
  ctx.lineTo(1160, 82);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fill();

  const skyline = [
    [300, 330], [390, 365], [455, 300], [550, 345], [650, 285], [760, 330],
    [860, 270], [960, 340], [1090, 315], [1170, 390], [1260, 350], [1400, 380]
  ];
  ctx.fillStyle = '#121c23';
  ctx.beginPath();
  ctx.moveTo(250, height);
  ctx.lineTo(250, 390);
  for (const [x, y] of skyline) {
    ctx.lineTo(x, y);
    ctx.lineTo(x + 34, y);
  }
  ctx.lineTo(width, 390);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  for (let row = 0; row < 14; row += 1) {
    for (let col = 0; col < 34; col += 1) {
      if (rng() > 0.35) continue;
      const x = 290 + col * 31;
      const y = 315 + row * 28;
      if (x > 1100) continue;
      const warm = rng() > 0.45;
      ctx.fillStyle = warm ? 'rgba(218,164,91,0.5)' : 'rgba(128,172,178,0.36)';
      ctx.fillRect(x, y, 7 + rng() * 4, 10 + rng() * 4);
    }
  }
  ctx.restore();

  const street = ctx.createLinearGradient(0, 570, 0, height);
  street.addColorStop(0, '#172027');
  street.addColorStop(0.5, '#0d1217');
  street.addColorStop(1, '#070a0d');
  ctx.fillStyle = street;
  ctx.beginPath();
  ctx.moveTo(500, 580);
  ctx.lineTo(930, 580);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(210,198,172,0.13)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = 70 + i * 160;
    ctx.beginPath();
    ctx.moveTo(700 + (x - 700) * 0.1, 585);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.restore();

  function neonSign(x, y, w, h, color, text) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 32;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.font = '600 24px Manrope, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  neonSign(155, 395, 170, 54, '#b34b35', 'NIGHT');
  neonSign(1050, 410, 160, 55, '#79b9c2', 'HOTEL');
  neonSign(1044, 500, 112, 38, '#cf9151', 'OPEN');

  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 90; i += 1) {
    const x = 170 + rng() * 1080;
    const y = 560 + rng() * 420;
    const len = 20 + rng() * 140;
    const grad = ctx.createLinearGradient(x, y, x, y + len);
    grad.addColorStop(0, rng() > 0.5 ? '#b34b35' : '#79b9c2');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, 2 + rng() * 7, len);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#080b0d';
  const px = 520;
  const py = 695;
  ctx.beginPath();
  ctx.arc(px, py + 6, 8, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#080b0d';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py + 15);
  ctx.lineTo(px - 2, py + 82);
  ctx.moveTo(px - 2, py + 82);
  ctx.lineTo(px - 18, py + 144);
  ctx.moveTo(px - 2, py + 82);
  ctx.lineTo(px + 19, py + 142);
  ctx.stroke();
  ctx.fillStyle = '#090c0e';
  ctx.beginPath();
  ctx.moveTo(px - 90, py + 8);
  ctx.quadraticCurveTo(px, py - 88, px + 88, py + 8);
  ctx.lineTo(px + 41, py + 12);
  ctx.quadraticCurveTo(px, py - 31, px - 42, py + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#090c0e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px, py + 30);
  ctx.lineTo(px + 57, py - 20);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#b9c9cc';
  ctx.lineWidth = 1;
  for (let i = 0; i < 180; i += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const len = 8 + rng() * 26;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + len);
    ctx.stroke();
  }
  ctx.restore();

  vignette(ctx, width, height, 0.68);
  grain(ctx, width, height, 0.065);
}

function createProjectImage(drawer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 714;
  const ctx = canvas.getContext('2d', { alpha: false });
  drawer(ctx, canvas.width, canvas.height);
  return {
    canvas,
    url: canvas.toDataURL('image/webp', 0.86)
  };
}

const projects = [
  {
    index: '01',
    title: 'Alpine Silence',
    category: 'Landscape',
    location: 'Lofoten, Norway',
    year: '2024',
    camera: 'Leica SL2 — 50mm Summilux',
    draw: drawAlpine,
    deck: 'At sixty-eight degrees north, the world edits itself down to weather, rock and one unbroken line of light.',
    body: [
      ['p', 'The forecast changed four times before breakfast. By the time we reached the ridge, the wind had erased every trace of the path and the mountains had become suggestions of themselves — a darker grey moving behind a lighter one.'],
      ['p', 'I worked slowly, waiting for the landscape to reveal its structure. The photograph is not about the peak. It is about the pause before the cloud lifts, when the eye has nothing to hold on to but scale.'],
      ['h2', 'Walking into weather'],
      ['p', 'For three days the light never repeated itself. It arrived from the sea, crossed the water in long silver sheets, then disappeared behind the headland. There was no horizon to compose against, only a negotiation between near black and almost white.'],
      ['quote', 'A landscape photograph is often a record of patience, not a record of place.'],
      ['p', 'This frame was made at the end of the second day. The figure in the lower third is not staged; it is my guide, returning along the ridge to check the route. I kept the shutter open for a fraction longer than usual, enough for the weather to soften the edges of the rock.']
    ]
  },
  {
    index: '02',
    title: 'Amber Meridian',
    category: 'Travel',
    location: 'Namib Desert, Namibia',
    year: '2023',
    camera: 'Hasselblad 907X — 45mm',
    draw: drawDesert,
    deck: 'A study of heat, distance and the geometry of a landscape that seems to have been drawn rather than formed.',
    body: [
      ['p', 'The desert teaches subtraction. There are no secondary details to hide behind, no foliage to soften a line. Every image begins with the decision of where the earth should meet the sky.'],
      ['p', 'We drove before sunrise, following a salt road north until the dunes opened out on both sides. The air was still cool enough to hear the sand move against the tyres.'],
      ['h2', 'The hour between colours'],
      ['p', 'At first light the dunes are almost monochrome. Then the sun clears the horizon and the whole basin turns amber, then copper, then a red so saturated it feels artificial in the file. I resisted correcting it. The photograph should carry the temperature of the place.'],
      ['quote', 'The scale is impossible to photograph. You can only photograph your own smallness inside it.'],
      ['p', 'The lone walker was crossing toward a water station two valleys away. I made three frames. In the final one, the figure is almost swallowed by the shadow of the dune — exactly as the desert intended.']
    ]
  },
  {
    index: '03',
    title: 'Salt & Silence',
    category: 'Coastal',
    location: 'County Clare, Ireland',
    year: '2025',
    camera: 'Sony A1 — 70–200mm',
    draw: drawAtlantic,
    deck: 'The Atlantic keeps its own time. This series is an attempt to listen to the long interval between one wave and the next.',
    body: [
      ['p', 'The west coast of Ireland is a place of interruptions: a field, a cliff, a wall, then the ocean. The weather arrives without an introduction and leaves without an apology.'],
      ['p', 'I returned to the same headland for five mornings. Each day the sea looked completely different; each day the lighthouse held its position like a patient mark in the margin of the landscape.'],
      ['h2', 'A slow exposure of place'],
      ['p', 'Long exposures can flatten the drama of water, but they also reveal its direction. The sea becomes a field of pale lines, the rocks become fixed punctuation. The photograph starts to feel less like a wave and more like a memory of one.'],
      ['quote', 'The coast is not a boundary. It is a conversation that never quite finishes.'],
      ['p', 'The final print keeps a little grain in the sky. I wanted the image to feel handled, imperfect, closer to the salt that covered the lens by the end of the morning.']
    ]
  },
  {
    index: '04',
    title: 'After Hours',
    category: 'Documentary',
    location: 'Tokyo, Japan',
    year: '2022',
    camera: 'Fujifilm X-Pro3 — 35mm',
    draw: drawCity,
    deck: 'A rain-soaked walk through the city after midnight, when neon becomes architecture and every street is a stage.',
    body: [
      ['p', 'The city changes after the last train. Storefronts become stages, wet asphalt becomes a second skyline, and the people still walking seem to carry the whole night on their shoulders.'],
      ['p', 'I left the tripod at the hotel and worked with one small camera, often at waist level. The rain made the crowd move faster, but the photographs needed to stay slow.'],
      ['h2', 'Neon as weather'],
      ['p', 'The colours in this series are not an effect. They are the actual temperature of the street: a red sign bleeding into a puddle, a blue window climbing the side of a building, the amber interior of a late-night counter.'],
      ['quote', 'At midnight, the city stops being a map and becomes a collection of small rooms full of light.'],
      ['p', 'This frame was made beneath an umbrella, halfway between two crossings. The figure is moving toward the warm side of the street. I waited until the red reflection reached their feet before pressing the shutter.']
    ]
  }
];

function isSoftwareContext(gl) {
  try {
    if (!gl) return true;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const label = debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return /swiftshader|llvmpipe|software|basic render/i.test(String(label));
  } catch (error) {
    return false;
  }
}

let LOW_POWER = false;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance'
  });
} catch (error) {
  dom.loader.innerHTML = '<div class="loader-center"><p style="font:11px Manrope,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#fff">WebGL is required to view this site.</p></div>';
  throw error;
}

LOW_POWER = isSoftwareContext(renderer.getContext());
document.body.classList.toggle('low-power', LOW_POWER);

function renderPixelRatio() {
  if (!LOW_POWER) return Math.min(window.devicePixelRatio || 1, 2);
  return window.innerWidth < 720 ? 0.72 : 0.5;
}

renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !LOW_POWER;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.06, 3.35);
camera.lookAt(0, 0.02, 0);

if (!LOW_POWER) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const roomEnvironment = new RoomEnvironment(renderer);
  const environmentTarget = pmrem.fromScene(roomEnvironment, 0.035);
  scene.environment = environmentTarget.texture;
  roomEnvironment.dispose?.();
}

const hemi = new THREE.HemisphereLight(0xfff9ed, 0x30322f, 2.2);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff3df, 5.2);
key.position.set(-4.8, 7.8, 6.4);
key.castShadow = !LOW_POWER;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 1;
key.shadow.camera.far = 22;
key.shadow.camera.left = -7;
key.shadow.camera.right = 7;
key.shadow.camera.top = 7;
key.shadow.camera.bottom = -7;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.018;
scene.add(key);

const rim = new THREE.DirectionalLight(0xbfd4da, 3.1);
rim.position.set(4.5, 3.8, -5.6);
scene.add(rim);

const fill = new THREE.PointLight(0xffe3c2, 9, 18, 2);
fill.position.set(4.6, 0.8, 4.2);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 26),
  new THREE.ShadowMaterial({ color: 0x1a1712, opacity: 0.18 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.12;
floor.receiveShadow = true;
scene.add(floor);

const rig = new THREE.Group();
rig.position.y = 0.04;
scene.add(rig);

const cameraObject = new THREE.Group();
rig.add(cameraObject);

function makeNoiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(256, 256);
  const rng = mulberry32(7);
  for (let i = 0; i < data.data.length; i += 4) {
    const shade = 72 + rng() * 94;
    data.data[i] = shade;
    data.data[i + 1] = shade;
    data.data[i + 2] = shade;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return texture;
}

function makeRidgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#17191a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width; x += 8) {
    ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.075)' : 'rgba(0,0,0,0.34)';
    ctx.fillRect(x, 0, 2, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
}

function makeLabelTexture(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(227,226,217,0.9)';
  ctx.font = '600 39px Manrope, Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText(title, 8, 70);
  ctx.fillStyle = 'rgba(205,204,194,0.58)';
  ctx.font = '400 20px Manrope, Arial, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText(subtitle, 10, 118);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeScreenGlareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 344;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 512, 344);
  gradient.addColorStop(0, 'rgba(255,255,255,0.19)');
  gradient.addColorStop(0.24, 'rgba(255,255,255,0.03)');
  gradient.addColorStop(0.56, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.055)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 344);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const noiseTexture = makeNoiseTexture();

function makeMatcap(inner, middle, outer, highlight = 'rgba(255,255,255,0.9)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 256);
  const sphere = ctx.createRadialGradient(98, 78, 2, 128, 128, 126);
  sphere.addColorStop(0, inner);
  sphere.addColorStop(0.34, middle);
  sphere.addColorStop(0.78, outer);
  sphere.addColorStop(1, '#000');
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, TAU);
  ctx.fill();
  const shine = ctx.createRadialGradient(85, 55, 0, 85, 55, 48);
  shine.addColorStop(0, highlight);
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, 256, 256);
  const rim = ctx.createLinearGradient(0, 256, 256, 0);
  rim.addColorStop(0, 'rgba(190,215,218,0.2)');
  rim.addColorStop(0.5, 'rgba(255,255,255,0)');
  rim.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, TAU);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const matcapDark = makeMatcap('#7b7d7a', '#363939', '#0a0b0c', 'rgba(255,255,255,0.32)');
const matcapGrip = makeMatcap('#454644', '#171919', '#030404', 'rgba(255,255,255,0.16)');
const matcapMid = makeMatcap('#a0a19c', '#4e5150', '#111314', 'rgba(255,255,255,0.5)');
const matcapChrome = makeMatcap('#ffffff', '#c7c8c2', '#50524f', 'rgba(255,255,255,1)');
const matcapDarkMetal = makeMatcap('#8a8c89', '#303334', '#050606', 'rgba(255,255,255,0.64)');
const matcapGlass = makeMatcap('#5f939e', '#132d35', '#010405', 'rgba(230,252,255,0.9)');

function surfaceMaterial({ color, roughness, metalness = 0.1, bump = false, bumpScale = 0.01, shininess, specular }) {
  if (LOW_POWER) {
    const matcap = metalness > 0.6
      ? (color < 0x202020 ? matcapDarkMetal : matcapChrome)
      : (roughness > 0.84 ? matcapGrip : (color > 0x141516 ? matcapMid : matcapDark));
    return new THREE.MeshMatcapMaterial({ matcap, color: 0xffffff });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    bumpMap: bump ? noiseTexture : null,
    bumpScale: bump ? bumpScale : 0,
    envMapIntensity: metalness > 0.5 ? 1.35 : 0.62
  });
}

const bodyMaterial = surfaceMaterial({ color: 0x131516, roughness: 0.7, metalness: 0.16, bump: true, bumpScale: 0.012 });
const gripMaterial = surfaceMaterial({ color: 0x0d0f10, roughness: 0.9, metalness: 0.08, bump: true, bumpScale: 0.02 });
const graphiteMaterial = surfaceMaterial({ color: 0x171a1b, roughness: 0.4, metalness: 0.38 });
const chromeMaterial = surfaceMaterial({ color: 0x9b9c97, roughness: 0.22, metalness: 0.95, specular: 0xf4f3ed, shininess: 170 });
const darkMetalMaterial = surfaceMaterial({ color: 0x080a0b, roughness: 0.24, metalness: 0.78, specular: 0x8c8e8d, shininess: 105 });
const grooveMaterial = surfaceMaterial({ color: 0x060708, roughness: 0.96, metalness: 0.02 });
const glassMaterial = LOW_POWER
  ? new THREE.MeshMatcapMaterial({ matcap: matcapGlass, color: 0xffffff })
  : new THREE.MeshPhysicalMaterial({
      color: 0x061018,
      roughness: 0.035,
      metalness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.72,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [100, 540],
      envMapIntensity: 2.1
    });

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function roundedBox(width, height, depth, segments, radius) {
  return LOW_POWER
    ? new THREE.BoxGeometry(width, height, depth)
    : new RoundedBoxGeometry(width, height, depth, segments, radius);
}

function cylinderZ(radius, depth, material, segments = 64, openEnded = false) {
  const detail = LOW_POWER ? Math.min(segments, 20) : segments;
  return mesh(
    new THREE.CylinderGeometry(radius, radius, depth, detail, 1, openEnded),
    material,
    [0, 0, 0],
    [Math.PI / 2, 0, 0]
  );
}

// Main body and the subtle leather grain.
const body = mesh(roundedBox(3.16, 1.92, 1.08, 6, 0.17), bodyMaterial);
cameraObject.add(body);

const frontPlate = mesh(roundedBox(2.82, 1.52, 0.08, 5, 0.095), graphiteMaterial, [0, 0.01, 0.555]);
cameraObject.add(frontPlate);

const grip = mesh(roundedBox(0.42, 1.64, 0.88, 5, 0.16), gripMaterial, [1.49, -0.02, 0.12]);
cameraObject.add(grip);

if (!LOW_POWER) {
  for (let i = 0; i < 18; i += 1) {
    const groove = mesh(
      new THREE.BoxGeometry(0.012, 1.25, 0.035),
      grooveMaterial,
      [1.704, -0.02, 0.42 - i * 0.048]
    );
    groove.rotation.z = 0.015;
    cameraObject.add(groove);
  }
}

const bottomPlate = mesh(roundedBox(1.25, 0.07, 0.7, 4, 0.03), chromeMaterial, [0, -0.995, 0.05]);
cameraObject.add(bottomPlate);

const topHump = mesh(roundedBox(1.34, 0.32, 0.79, 5, 0.09), bodyMaterial, [-0.12, 1.075, 0.05]);
cameraObject.add(topHump);

const prism = mesh(roundedBox(0.61, 0.2, 0.58, 4, 0.06), graphiteMaterial, [-0.12, 1.255, 0.08]);
cameraObject.add(prism);

const viewfinder = mesh(new THREE.BoxGeometry(0.29, 0.11, 0.07), glassMaterial, [-0.12, 1.265, 0.385]);
cameraObject.add(viewfinder);

const hotShoe = mesh(new THREE.BoxGeometry(0.54, 0.055, 0.43), chromeMaterial, [0.37, 1.28, 0.03]);
cameraObject.add(hotShoe);

for (const x of [-0.2, 0.2]) {
  cameraObject.add(mesh(new THREE.BoxGeometry(0.035, 0.09, 0.5), darkMetalMaterial, [0.37 + x, 1.33, 0.03]));
}

function addDial(x, z, radius, height, material) {
  const dial = mesh(new THREE.CylinderGeometry(radius, radius * 1.035, height, LOW_POWER ? 18 : 48), material, [x, 1.29 + height / 2, z]);
  cameraObject.add(dial);
  const top = mesh(new THREE.CylinderGeometry(radius * 0.87, radius * 0.87, 0.014, LOW_POWER ? 18 : 48), graphiteMaterial, [x, 1.305 + height, z]);
  cameraObject.add(top);
  const marker = mesh(new THREE.BoxGeometry(0.035, 0.018, radius * 0.78), chromeMaterial, [x, 1.316 + height, z]);
  marker.rotation.y = 0.3;
  cameraObject.add(marker);
  if (!LOW_POWER) {
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * TAU;
      const rib = mesh(
        new THREE.BoxGeometry(0.015, height * 0.72, 0.035),
        darkMetalMaterial,
        [x + Math.cos(angle) * radius, 1.295 + height / 2, z + Math.sin(angle) * radius],
        [0, -angle, 0]
      );
      cameraObject.add(rib);
    }
  }
}

addDial(0.98, 0.15, 0.27, 0.13, graphiteMaterial);
addDial(-1.12, 0.08, 0.225, 0.11, graphiteMaterial);

const shutter = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.088, LOW_POWER ? 16 : 32), chromeMaterial, [0.98, 1.35, -0.27]);
cameraObject.add(shutter);
const shutterCap = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.015, LOW_POWER ? 16 : 32), darkMetalMaterial, [0.98, 1.397, -0.27]);
cameraObject.add(shutterCap);

const powerSwitch = mesh(roundedBox(0.28, 0.05, 0.11, 3, 0.02), chromeMaterial, [0.75, 1.26, -0.39]);
cameraObject.add(powerSwitch);

const strapLugLeft = mesh(new THREE.TorusGeometry(0.105, 0.027, LOW_POWER ? 4 : 10, LOW_POWER ? 10 : 24), chromeMaterial, [-1.64, 0.6, 0], [0, Math.PI / 2, 0]);
cameraObject.add(strapLugLeft);
const strapLugRight = mesh(new THREE.TorusGeometry(0.105, 0.027, LOW_POWER ? 4 : 10, LOW_POWER ? 10 : 24), chromeMaterial, [1.64, 0.6, 0], [0, Math.PI / 2, 0]);
cameraObject.add(strapLugRight);

const brandLabel = mesh(
  new THREE.PlaneGeometry(1.04, 0.26),
  new THREE.MeshBasicMaterial({ map: makeLabelTexture('JOHN DOE', 'PROFESSIONAL IMAGING'), transparent: true, depthWrite: false }),
  [-0.87, 0.58, 0.601]
);
brandLabel.castShadow = false;
cameraObject.add(brandLabel);

const modelLabel = mesh(
  new THREE.PlaneGeometry(0.58, 0.15),
  new THREE.MeshBasicMaterial({ map: makeLabelTexture('JD—1', '35MM FORMAT'), transparent: true, depthWrite: false }),
  [0.88, 0.61, 0.601]
);
modelLabel.castShadow = false;
cameraObject.add(modelLabel);

// Lens barrel and rings.
const lensGroup = new THREE.Group();
cameraObject.add(lensGroup);

const mount = cylinderZ(0.93, 0.1, chromeMaterial, 72);
mount.position.z = 0.6;
lensGroup.add(mount);

const mountInner = cylinderZ(0.84, 0.075, darkMetalMaterial, 72);
mountInner.position.z = 0.66;
lensGroup.add(mountInner);

const barrel = cylinderZ(0.79, 0.34, bodyMaterial, 72);
barrel.position.z = 0.83;
lensGroup.add(barrel);

const ridgeMaterial = surfaceMaterial({
  color: 0x252728,
  roughness: 0.55,
  metalness: 0.32
});
const focusRing = cylinderZ(0.832, 0.25, ridgeMaterial, 72, true);
focusRing.position.z = 1.055;
lensGroup.add(focusRing);

const silverRing = cylinderZ(0.91, 0.09, chromeMaterial, 72, true);
silverRing.position.z = 1.21;
lensGroup.add(silverRing);

const frontRim = cylinderZ(0.875, 0.085, darkMetalMaterial, 72, true);
frontRim.position.z = 1.29;
lensGroup.add(frontRim);

const innerLip = cylinderZ(0.72, 0.045, chromeMaterial, 72, true);
innerLip.position.z = 1.34;
lensGroup.add(innerLip);

const apertureRing = mesh(new THREE.RingGeometry(0.54, 0.71, LOW_POWER ? 24 : 72), darkMetalMaterial, [0, 0, 1.35]);
lensGroup.add(apertureRing);

const glass = mesh(new THREE.CircleGeometry(0.555, LOW_POWER ? 24 : 72), glassMaterial, [0, 0, 1.355]);
glass.castShadow = false;
lensGroup.add(glass);

for (const radius of [0.25, 0.38, 0.49]) {
  const ring = mesh(
    new THREE.RingGeometry(radius, radius + 0.007, LOW_POWER ? 24 : 72),
    new THREE.MeshBasicMaterial({ color: 0x8aa1a4, transparent: true, opacity: radius === 0.25 ? 0.18 : 0.1, depthWrite: false }),
    [0, 0, 1.36]
  );
  ring.castShadow = false;
  lensGroup.add(ring);
}

const reflection = mesh(
  new THREE.CircleGeometry(0.14, LOW_POWER ? 20 : 32),
  new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.47, depthWrite: false }),
  [-0.18, 0.19, 1.365],
  [0, 0, -0.55]
);
reflection.scale.set(1, 0.28, 1);
reflection.castShadow = false;
lensGroup.add(reflection);

const reflection2 = mesh(
  new THREE.CircleGeometry(0.045, LOW_POWER ? 16 : 24),
  new THREE.MeshBasicMaterial({ color: 0x5f8d99, transparent: true, opacity: 0.52, depthWrite: false }),
  [0.24, -0.17, 1.366],
  [0, 0, -0.55]
);
reflection2.scale.set(1, 0.4, 1);
reflection2.castShadow = false;
lensGroup.add(reflection2);

const lensText = LOW_POWER ? null : mesh(
  new THREE.PlaneGeometry(1.53, 1.53),
  new THREE.MeshBasicMaterial({ map: (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = 'rgba(214,213,204,0.6)';
    ctx.font = '500 24px Manrope, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(512, 512);
    const text = 'JOHN DOE OPTICS  ·  50 MM  1:1.4  ·  ∞  0.45 M  ·  ';
    const chars = text.split('');
    const radius = 430;
    const angleStep = TAU / chars.length;
    chars.forEach((char, i) => {
      ctx.save();
      ctx.rotate(i * angleStep);
      ctx.translate(0, -radius);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
    ctx.restore();
    return new THREE.CanvasTexture(canvas);
  })(), transparent: true, depthWrite: false }),
  [0, 0, 1.367]
);
if (lensText) {
  lensText.castShadow = false;
  lensGroup.add(lensText);
}

// Rear display: this surface becomes the project frame after the 180° turn.
const rearBezel = mesh(roundedBox(2.37, 1.66, 0.1, 5, 0.075), graphiteMaterial, [0, 0.01, -0.57]);
cameraObject.add(rearBezel);

const screenGlareTexture = makeScreenGlareTexture();
const screenA = new THREE.Mesh(
  new THREE.PlaneGeometry(2.17, 1.47),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, toneMapped: false })
);
screenA.position.set(0, 0.01, -0.624);
screenA.rotation.y = Math.PI;
screenA.renderOrder = 2;
cameraObject.add(screenA);

const screenB = new THREE.Mesh(
  new THREE.PlaneGeometry(2.17, 1.47),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
);
screenB.position.set(0, 0.01, -0.625);
screenB.rotation.y = Math.PI;
screenB.renderOrder = 3;
cameraObject.add(screenB);

const screenGlare = new THREE.Mesh(
  new THREE.PlaneGeometry(2.17, 1.47),
  new THREE.MeshBasicMaterial({ map: screenGlareTexture, transparent: true, opacity: 0.85, depthWrite: false })
);
screenGlare.position.set(0, 0.01, -0.631);
screenGlare.rotation.y = Math.PI;
screenGlare.renderOrder = 4;
cameraObject.add(screenGlare);

const rearBrand = mesh(
  new THREE.PlaneGeometry(0.83, 0.17),
  new THREE.MeshBasicMaterial({ map: makeLabelTexture('JOHN DOE', 'DIGITAL CAMERA'), transparent: true, depthWrite: false }),
  [-0.5, -0.88, -0.627],
  [0, Math.PI, 0]
);
rearBrand.castShadow = false;
cameraObject.add(rearBrand);

for (let i = 0; i < 3; i += 1) {
  const button = mesh(
    new THREE.CylinderGeometry(0.075 - i * 0.009, 0.075 - i * 0.009, 0.045, LOW_POWER ? 14 : 32),
    chromeMaterial,
    [0.92 - i * 0.19, -0.87, -0.63],
    [Math.PI / 2, 0, 0]
  );
  cameraObject.add(button);
}

const backDial = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, LOW_POWER ? 18 : 48), graphiteMaterial, [0.92, 0.64, -0.635], [Math.PI / 2, 0, 0]);
cameraObject.add(backDial);
const backDialMark = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.012), chromeMaterial, [0.92, 0.78, -0.672], [0, 0, -0.45]);
cameraObject.add(backDialMark);

let activeScreen = screenA;
let activeProject = 0;

function projectDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const targetFraction = window.innerWidth < 720 ? 0.68 : 0.38;
  return clamp(2.17 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * aspect * targetFraction), 4.8, 12.6);
}

function heroDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const targetFraction = window.innerWidth < 720 ? 0.84 : 0.48;
  return clamp(3.16 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * aspect * targetFraction), 5.4, 13.4);
}

function contactDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const targetFraction = window.innerWidth < 720 ? 0.8 : 0.54;
  return clamp(3.2 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * aspect * targetFraction), 5.2, 13.2);
}

function blogHeroHeight() {
  return window.innerWidth < 900
    ? Math.max(window.innerHeight * 0.57, 360)
    : Math.max(window.innerHeight * 0.7, 460);
}

// Project imagery is generated lazily so the opening scene never waits on it.
let backdropLayers = [];
let assetsPreparing = false;
let assetsQueued = false;
const contactBackdrop = dom.backdropStack.querySelector('.backdrop-contact');

function ensureProjectAsset(index) {
  const project = projects[index];
  if (!project.image) {
    project.image = createProjectImage(project.draw);
    project.texture = new THREE.CanvasTexture(project.image.canvas);
    project.texture.colorSpace = THREE.SRGBColorSpace;
    project.texture.minFilter = THREE.LinearMipmapLinearFilter;
    project.texture.magFilter = THREE.LinearFilter;
    project.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  if (!backdropLayers.length) buildProjectBackdrops();
  if (index === 0 && activeScreen === screenA && !screenA.material.map) {
    screenA.material.map = project.texture;
    screenA.material.needsUpdate = true;
  }
  return project;
}

function buildProjectBackdrops() {
  if (backdropLayers.length) return;
  backdropLayers = projects.map((project, index) => {
    const layer = document.createElement('div');
    layer.className = 'backdrop';
    layer.dataset.backdrop = String(index);
    if (project.image) layer.style.backgroundImage = `url("${project.image.url}")`;
    dom.backdropStack.insertBefore(layer, contactBackdrop);
    return layer;
  });
}

function prepareAllAssets() {
  if (assetsPreparing || projects.every((project) => project.image)) return;
  assetsPreparing = true;
  let index = 0;
  const next = () => {
    while (index < projects.length && projects[index].image) index += 1;
    if (index >= projects.length) {
      assetsPreparing = false;
      buildProjectBackdrops();
      return;
    }
    ensureProjectAsset(index);
    if (backdropLayers[index]) backdropLayers[index].style.backgroundImage = `url("${projects[index].image.url}")`;
    index += 1;
    window.setTimeout(next, 80);
  };
  window.setTimeout(next, 30);
}

function setBackdrops(index, duration = 1.15) {
  if (!backdropLayers.length) buildProjectBackdrops();
  backdropLayers.forEach((layer, i) => {
    gsap.to(layer, {
      opacity: i === index ? 1 : 0,
      duration,
      ease: 'power2.inOut',
      overwrite: true
    });
    if (i === index) {
      gsap.fromTo(layer, { scale: 1.19 }, { scale: 1.15, duration: 1.8, ease: 'power3.out', overwrite: 'auto' });
    }
  });
  gsap.to(contactBackdrop, { opacity: 0, duration, ease: 'power2.inOut', overwrite: true });
}

function clearBackdrops(duration = 1.05) {
  backdropLayers.forEach((layer) => {
    gsap.to(layer, { opacity: 0, duration, ease: 'power2.inOut', overwrite: true });
  });
  gsap.to(contactBackdrop, { opacity: 0, duration, ease: 'power2.inOut', overwrite: true });
}

function setProjectData(index) {
  const project = projects[index];
  dom.projectIndex.textContent = project.index;
  dom.projectCategory.textContent = project.category;
  dom.projectTitle.textContent = project.title;
  dom.projectLocation.textContent = project.location;
  dom.projectYear.textContent = project.year;
}

function crossfadeScreen(index) {
  if (activeProject === index && state.introDone) return;
  const incoming = activeScreen === screenA ? screenB : screenA;
  const outgoing = activeScreen;
  incoming.material.map = projects[index].texture;
  incoming.material.needsUpdate = true;
  incoming.material.opacity = 0;
  incoming.renderOrder = 3;
  outgoing.renderOrder = 2;
  gsap.to(incoming.material, { opacity: 1, duration: 1.05, ease: 'power2.inOut', overwrite: true });
  gsap.to(outgoing.material, { opacity: 0, duration: 1.05, ease: 'power2.inOut', overwrite: true, onComplete: () => {
    if (activeScreen !== outgoing) outgoing.material.map = projects[index].texture;
  }});
  activeScreen = incoming;
  activeProject = index;
}

function animateProjectCopyIn(delay = 0) {
  dom.projectCopy.setAttribute('aria-hidden', 'false');
  gsap.killTweensOf(dom.projectCopy);
  gsap.fromTo(
    dom.projectCopy,
    { autoAlpha: 0, y: 25 },
    { autoAlpha: 1, y: 0, duration: 0.9, delay, ease: 'power3.out' }
  );
}

function animateProjectCopyOut() {
  gsap.killTweensOf(dom.projectCopy);
  gsap.to(dom.projectCopy, {
    autoAlpha: 0,
    y: 18,
    duration: 0.42,
    ease: 'power2.in',
    onComplete: () => dom.projectCopy.setAttribute('aria-hidden', 'true')
  });
}

function showProject(index, { first = false, direction = 1 } = {}) {
  const previous = state.project;
  state.project = index;
  ensureProjectAsset(index);
  setBackdrops(index, first ? 1.35 : 1.15);
  crossfadeScreen(index);

  if (first) {
    setProjectData(index);
    animateProjectCopyIn(0.62);
    return;
  }

  setProjectData(index);
  gsap.killTweensOf(dom.projectCopy);
  gsap.fromTo(
    dom.projectCopy,
    { autoAlpha: 0, y: 16 * direction },
    { autoAlpha: 1, y: 0, duration: 0.72, ease: 'power3.out', overwrite: true }
  );
  dom.projectCopy.setAttribute('aria-hidden', 'false');

  if (previous !== index) {
    gsap.fromTo(
      dom.projectHit,
      { opacity: 0.4 },
      { opacity: 1, duration: 0.8, ease: 'power2.out', overwrite: true }
    );
  }
}

function setChrome(theme) {
  document.body.classList.toggle('is-project', theme === 'project');
  document.body.classList.toggle('is-contact', theme === 'contact');
}

function updateStageReadout() {
  dom.stageNumber.textContent = String(state.stage + 1).padStart(2, '0');
  [...dom.chapterDots.children].forEach((dot, i) => {
    dot.classList.toggle('is-active', i === state.stage);
    dot.setAttribute('aria-current', i === state.stage ? 'step' : 'false');
  });
  dom.scrollCueText.textContent = state.stage === 0 ? 'Scroll to explore' : state.stage < 5 ? 'Scroll — next frame' : '';
  gsap.to(dom.scrollCue, { autoAlpha: state.stage === 5 ? 0 : 1, duration: 0.4, overwrite: true });
}

function hideHero() {
  dom.heroCopy.setAttribute('aria-hidden', 'true');
  gsap.to(dom.heroCopy, { autoAlpha: 0, y: -20, duration: 0.55, ease: 'power2.in' });
}

function showHero() {
  dom.heroCopy.setAttribute('aria-hidden', 'false');
  gsap.fromTo(dom.heroCopy, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' });
}

function enterProjects() {
  setChrome('project');
  hideHero();
  gsap.to(dom.contactCopy, { autoAlpha: 0, y: 18, duration: 0.35, ease: 'power2.in' });
  dom.contactCopy.setAttribute('aria-hidden', 'true');

  gsap.to(cameraObject.rotation, { y: Math.PI, duration: 1.55, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.rotation, { x: 0, duration: 1.25, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.position, { y: 0.04, duration: 1.15, ease: 'power3.inOut', overwrite: true });
  gsap.to(camera.position, { z: projectDistance(), y: 0.06, duration: 1.5, ease: 'power3.inOut', overwrite: true });
  showProject(0, { first: true });
}

function enterContact() {
  setChrome('contact');
  animateProjectCopyOut();
  gsap.to(camera.position, { z: contactDistance(), y: 0.15, duration: 1.6, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.rotation, { x: 1.22, duration: 1.55, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.position, { y: 1.0, duration: 1.35, ease: 'power3.inOut', overwrite: true });
  gsap.to(cameraObject.rotation, { y: Math.PI, duration: 1.1, ease: 'power3.inOut', overwrite: true });
  gsap.to(contactBackdrop, { opacity: 1, duration: 1.35, ease: 'power2.inOut', overwrite: true });
  backdropLayers.forEach((layer) => gsap.to(layer, { opacity: 0, duration: 1.1, ease: 'power2.inOut', overwrite: true }));
  dom.contactCopy.setAttribute('aria-hidden', 'false');
  gsap.fromTo(dom.contactCopy, { autoAlpha: 0, y: 35 }, { autoAlpha: 1, y: 0, duration: 1.0, delay: 0.55, ease: 'power3.out' });
  dom.projectHit.classList.remove('is-clickable');
  dom.projectHit.tabIndex = -1;
  dom.scrollCueText.textContent = '';
  gsap.to(dom.scrollCue, { autoAlpha: 0, duration: 0.4, overwrite: true });
}

function returnToHero() {
  setChrome('none');
  animateProjectCopyOut();
  gsap.to(dom.contactCopy, { autoAlpha: 0, y: 20, duration: 0.4, ease: 'power2.in' });
  dom.contactCopy.setAttribute('aria-hidden', 'true');
  clearBackdrops();
  gsap.to(cameraObject.rotation, { y: 0, duration: 1.4, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.rotation, { x: 0, duration: 1.25, ease: 'power3.inOut', overwrite: true });
  gsap.to(rig.position, { y: 0.04, duration: 1.25, ease: 'power3.inOut', overwrite: true });
  gsap.to(camera.position, { z: heroDistance(), y: 0.06, duration: 1.45, ease: 'power3.inOut', overwrite: true });
  showHero();
  gsap.to(contactBackdrop, { opacity: 0, duration: 1.0, ease: 'power2.inOut', overwrite: true });
  dom.projectHit.classList.remove('is-clickable');
  dom.projectHit.tabIndex = -1;
}

function goToStage(target) {
  if (!state.introDone || state.inBlog || state.transitioning) return;
  const next = clamp(target, 0, 5);
  if (next === state.stage) return;

  state.transitioning = true;
  const previous = state.stage;
  state.stage = next;
  updateStageReadout();

  if (next === 0) {
    returnToHero();
  } else if (next === 5) {
    enterContact();
  } else if (previous === 0 || previous === 5) {
    enterProjects();
    if (next > 1) {
      gsap.delayedCall(0.28, () => showProject(next - 1));
    }
  } else {
    showProject(next - 1, { direction: next > previous ? 1 : -1 });
  }

  const hold = previous === 0 || next === 5 || previous === 5 ? 1.65 : 1.15;
  const unlockStage = () => {
    state.transitioning = false;
    updateProjectHitState();
  };
  gsap.delayedCall(hold, unlockStage);
  window.setTimeout(unlockStage, (hold + 0.35) * 1000);
}

function updateProjectHitState() {
  const isProject = state.stage >= 1 && state.stage <= 4;
  const active = isProject && state.introDone && !state.inBlog;
  dom.projectHit.classList.toggle('is-clickable', active);
  dom.projectHit.tabIndex = active ? 0 : -1;
  if (!active) {
    dom.projectHit.style.opacity = '0';
  } else {
    dom.projectHit.style.opacity = '1';
  }
}

function screenRect() {
  const corners = [
    new THREE.Vector3(-1.085, 0.735, 0),
    new THREE.Vector3(1.085, 0.735, 0),
    new THREE.Vector3(1.085, -0.735, 0),
    new THREE.Vector3(-1.085, -0.735, 0)
  ];
  camera.updateMatrixWorld();
  activeScreen.updateMatrixWorld();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    const world = corner.applyMatrix4(activeScreen.matrixWorld).project(camera);
    const x = (world.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-world.y * 0.5 + 0.5) * window.innerHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
    right: maxX,
    bottom: maxY
  };
}

function positionProjectHit() {
  if (state.stage < 1 || state.stage > 4 || state.inBlog || !state.introDone) return;
  const rect = screenRect();
  const pad = 2;
  dom.projectHit.style.left = `${rect.left - pad}px`;
  dom.projectHit.style.top = `${rect.top - pad}px`;
  dom.projectHit.style.width = `${rect.width + pad * 2}px`;
  dom.projectHit.style.height = `${rect.height + pad * 2}px`;
}

function populateBlog(index) {
  const project = ensureProjectAsset(index);
  dom.blogImage.src = project.image.url;
  dom.blogImage.alt = `${project.title} — ${project.location}`;
  dom.blogImageIndex.textContent = `${project.index} / 04`;
  dom.blogCategory.textContent = project.category;
  dom.blogLocation.textContent = project.location;
  dom.blogYear.textContent = project.year;
  dom.blogTitle.textContent = project.title;
  dom.blogDeck.textContent = project.deck;
  dom.blogCamera.textContent = project.camera;
  dom.blogBody.innerHTML = project.body.map(([type, text]) => {
    if (type === 'h2') return `<h2>${text}</h2>`;
    if (type === 'quote') return `<blockquote>“${text}”</blockquote>`;
    return `<p>${text}</p>`;
  }).join('');
  dom.nextProject.innerHTML = index < projects.length - 1
    ? 'Continue the journey <span>→</span>'
    : 'Contact the studio <span>→</span>';
}

function openBlog() {
  if (state.stage < 1 || state.stage > 4 || state.inBlog || state.transitioning) return;
  state.inBlog = true;
  state.closingBlog = false;
  state.transitioning = true;
  updateProjectHitState();
  populateBlog(state.project);

  const rect = screenRect();
  const project = projects[state.project];
  dom.zoomPhoto.style.backgroundImage = `url("${project.image.url}")`;
  dom.zoomPhoto.style.display = 'block';
  gsap.set(dom.zoomPhoto, {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: 5,
    rotationX: 0,
    scale: 1,
    transformPerspective: 1200,
    transformOrigin: '50% 50%',
    opacity: 1
  });

  dom.blog.classList.add('is-open');
  dom.blog.setAttribute('aria-hidden', 'false');
  dom.blog.scrollTop = 0;
  gsap.set(dom.blog, { opacity: 0, rotationX: 0, transformPerspective: 1200, transformOrigin: '50% 0%' });
  document.body.classList.add('blog-open');

  gsap.to([dom.siteHeader, dom.stageReadout, dom.chapterDots, dom.scrollCue, dom.projectCopy], {
    autoAlpha: 0,
    duration: 0.45,
    ease: 'power2.out',
    overwrite: true
  });

  gsap.to(camera.position, {
    z: Math.max(2.4, projectDistance() - 1.45),
    duration: 1.25,
    ease: 'power3.inOut',
    overwrite: true
  });

  gsap.to(dom.zoomPhoto, {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: blogHeroHeight(),
    borderRadius: 0,
    duration: 1.12,
    ease: 'power4.inOut'
  });

  gsap.to(dom.blog, {
    opacity: 1,
    duration: 0.75,
    delay: 0.36,
    ease: 'power2.out'
  });

  let opened = false;
  const finishOpen = () => {
    if (opened) return;
    opened = true;
    dom.zoomPhoto.style.display = 'none';
    gsap.set(dom.blog, { opacity: 1 });
    state.transitioning = false;
  };
  gsap.delayedCall(1.22, finishOpen);
  window.setTimeout(finishOpen, 1800);
}

function resetWorldUI() {
  dom.projectCopy.setAttribute('aria-hidden', 'false');
  dom.projectHit.classList.add('is-clickable');
  dom.projectHit.tabIndex = 0;
  gsap.set([dom.siteHeader, dom.stageReadout, dom.chapterDots, dom.scrollCue, dom.projectCopy], {
    autoAlpha: 1,
    y: 0
  });
  gsap.to(camera.position, {
    z: projectDistance(),
    y: 0.06,
    duration: 1.2,
    ease: 'power3.inOut',
    overwrite: true
  });
}

function closeBlog(advance = false) {
  if (!state.inBlog || state.closingBlog) return;
  state.closingBlog = true;

  const rect = screenRect();
  const project = projects[state.project];
  const heroHeight = blogHeroHeight();
  dom.zoomPhoto.style.backgroundImage = `url("${project.image.url}")`;
  dom.zoomPhoto.style.display = 'block';
  gsap.set(dom.zoomPhoto, {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: heroHeight,
    borderRadius: 0,
    rotationX: 8,
    scale: 1,
    transformPerspective: 1200,
    transformOrigin: '50% 0%',
    opacity: 1
  });

  gsap.to(dom.blog, {
    opacity: 0,
    rotationX: -5,
    duration: 0.7,
    ease: 'power2.inOut',
    onComplete: () => {
      dom.blog.classList.remove('is-open');
      dom.blog.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('blog-open');
      dom.blog.scrollTop = 0;
      gsap.set(dom.blog, { rotationX: 0 });
    }
  });

  gsap.to(camera.position, {
    z: projectDistance(),
    y: 0.06,
    duration: 1.15,
    ease: 'power3.inOut',
    overwrite: true
  });

  let finished = false;
  const finishClose = () => {
    if (finished) return;
    finished = true;
    dom.zoomPhoto.style.display = 'none';
    dom.blog.classList.remove('is-open');
    dom.blog.setAttribute('aria-hidden', 'true');
    gsap.set(dom.blog, { opacity: 0, rotationX: 0 });
    document.body.classList.remove('blog-open');
    dom.blog.scrollTop = 0;
    state.inBlog = false;
    state.closingBlog = false;
    state.transitioning = false;
    resetWorldUI();
    if (advance) {
      if (state.stage < 4) {
        state.transitioning = false;
        goToStage(state.stage + 1);
      } else {
        state.transitioning = false;
        goToStage(5);
      }
    }
  };

  gsap.to(dom.zoomPhoto, {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: 5,
    rotationX: 0,
    duration: 1.08,
    delay: 0.14,
    ease: 'power3.inOut',
    onComplete: finishClose
  });
  window.setTimeout(finishClose, 1800);
}

// Build chapter navigation.
const chapterNames = ['Portrait', 'Alpine Silence', 'Amber Meridian', 'Salt & Silence', 'After Hours', 'Contact'];
chapterNames.forEach((name, index) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'chapter-dot';
  dot.setAttribute('aria-label', `${String(index + 1).padStart(2, '0')} — ${name}`);
  dot.addEventListener('click', () => goToStage(index));
  dom.chapterDots.appendChild(dot);
});

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  if (!state.introDone) return;
  if (state.stage === 0) {
    gsap.to(camera.position, { z: heroDistance(), duration: 0.7, ease: 'power2.out', overwrite: true });
  } else if (state.stage >= 1 && state.stage <= 4) {
    gsap.to(camera.position, { z: projectDistance(), duration: 0.7, ease: 'power2.out', overwrite: true });
  } else if (state.stage === 5) {
    gsap.to(camera.position, { z: contactDistance(), duration: 0.7, ease: 'power2.out', overwrite: true });
  }
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

window.addEventListener('wheel', (event) => {
  if (!state.introDone || state.inBlog) return;
  event.preventDefault();
  if (state.transitioning) return;
  if (Math.abs(event.deltaY) < 12) return;
  if (event.deltaY > 0) {
    goToStage(state.stage + 1);
  } else {
    goToStage(state.stage - 1);
  }
}, { passive: false });

window.addEventListener('touchstart', (event) => {
  if (state.inBlog || !state.introDone) return;
  const touch = event.changedTouches[0];
  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
}, { passive: true });

window.addEventListener('touchend', (event) => {
  if (state.inBlog || !state.introDone || state.transitioning) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - state.touchStartX;
  const dy = touch.clientY - state.touchStartY;
  if (Math.abs(dy) < 42 || Math.abs(dy) < Math.abs(dx)) return;
  if (dy < 0) {
    goToStage(state.stage + 1);
  } else {
    goToStage(state.stage - 1);
  }
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (state.inBlog) {
    if (event.key === 'Escape') closeBlog();
    return;
  }
  if (!state.introDone) return;
  if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    goToStage(state.stage + 1);
  } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    goToStage(state.stage - 1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    goToStage(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    goToStage(5);
  }
});

document.querySelectorAll('[data-stage]').forEach((element) => {
  element.addEventListener('click', (event) => {
    event.preventDefault();
    const target = Number(element.dataset.stage);
    if (state.stage === target && target === 0) return;
    goToStage(target);
  });
});

dom.projectHit.addEventListener('click', openBlog);
dom.viewStory.addEventListener('click', openBlog);
dom.blogBack.addEventListener('click', () => closeBlog(false));
dom.nextProject.addEventListener('click', () => closeBlog(true));

// Intro reveal.
async function boot() {
  let introFinalized = false;
  const finishIntro = () => {
    if (introFinalized) return;
    introFinalized = true;
    gsap.set(dom.heroCopy, { autoAlpha: 1, y: 0 });
    gsap.set([dom.header, dom.stageReadout, dom.chapterDots, dom.scrollCue], { autoAlpha: 1, y: 0 });
    dom.loader.style.display = 'none';
    state.introDone = true;
    updateStageReadout();
    updateProjectHitState();
    if (!assetsQueued) {
      assetsQueued = true;
      const queueAssets = () => prepareAllAssets();
      gsap.delayedCall(5, queueAssets);
      window.setTimeout(queueAssets, 5400);
    }
  };
  const revealDelay = LOW_POWER ? 1.1 : 1.7;
  gsap.delayedCall(revealDelay, finishIntro);
  window.setTimeout(finishIntro, revealDelay * 1000 + 450);

  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 380))
    ]);
  } catch (error) {
    // Fonts are local; this is only a defensive fallback.
  }

  await new Promise((resolve) => setTimeout(resolve, 420));

  gsap.set(dom.loader, { scale: 1, opacity: 1, transformOrigin: '50% 50%' });
  gsap.to(dom.spinner, { opacity: 0, duration: 0.3, ease: 'power2.out' });
  gsap.to(dom.loaderCenter, { scale: 0, duration: 0.5, ease: 'back.in(2.1)' });

  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!LOW_POWER) {
    gsap.to(dom.loader, {
      opacity: 0,
      duration: 0.82,
      ease: 'power2.inOut'
    });

    gsap.to(camera.position, {
      z: heroDistance(),
      duration: 1.55,
      ease: 'power3.inOut'
    });
    gsap.to(camera, {
      fov: 36,
      duration: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => camera.updateProjectionMatrix()
    });
    gsap.fromTo(rig.scale, { x: 0.96, y: 0.96, z: 0.96 }, { x: 1, y: 1, z: 1, duration: 1.55, ease: 'power3.out' });
  }


}

let firstFrame = true;
function render() {
  requestAnimationFrame(render);
  positionProjectHit();
  camera.lookAt(0, state.stage === 5 ? 0.1 : 0.02, 0);
  renderer.render(scene, camera);
  if (firstFrame) {
    dom.poster?.classList.add('is-hidden');
    firstFrame = false;
  }
}

boot();
requestAnimationFrame(render);

if (LOW_POWER) {
  camera.position.z = heroDistance();
}
