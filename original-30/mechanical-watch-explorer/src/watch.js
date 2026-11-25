import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvasTexture(size, draw, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function makeLeatherTexture(renderer) {
  return canvasTexture(1024, (ctx, size) => {
    const random = seededRandom(71);
    ctx.fillStyle = '#111916';
    ctx.fillRect(0, 0, size, size);

    const gradient = ctx.createRadialGradient(size * 0.5, size * 0.45, 10, size * 0.5, size * 0.5, size * 0.7);
    gradient.addColorStop(0, 'rgba(75, 93, 79, 0.24)');
    gradient.addColorStop(0.55, 'rgba(29, 43, 35, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 27000; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = 0.25 + random() * 1.4;
      const alpha = 0.015 + random() * 0.035;
      ctx.fillStyle = random() > 0.48 ? `rgba(177, 193, 171, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }

    for (let i = 0; i < 180; i += 1) {
      const x = random() * size;
      const y = random() * size;
      ctx.strokeStyle = `rgba(4, 8, 6, ${0.035 + random() * 0.05})`;
      ctx.lineWidth = 0.5 + random() * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + random() * 36 - 18, y + random() * 22 - 11, x + random() * 44 - 22, y + random() * 40 - 20);
      ctx.stroke();
    }
  }, renderer);
}

function makeWoodTexture(renderer) {
  const texture = canvasTexture(1024, (ctx, size) => {
    const random = seededRandom(19);
    const base = ctx.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, '#1a120f');
    base.addColorStop(0.45, '#211712');
    base.addColorStop(1, '#100c0b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let line = 0; line < 150; line += 1) {
      const y = (line / 150) * size + random() * 12;
      const amplitude = 9 + random() * 35;
      const frequency = 0.007 + random() * 0.014;
      const phase = random() * TAU;
      ctx.beginPath();
      for (let x = -10; x <= size + 10; x += 8) {
        const wave = Math.sin(x * frequency + phase) * amplitude + Math.sin(x * 0.002 + phase * 0.7) * 18;
        if (x === -10) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.strokeStyle = random() > 0.52
        ? `rgba(93, 60, 39, ${0.035 + random() * 0.06})`
        : `rgba(0, 0, 0, ${0.06 + random() * 0.08})`;
      ctx.lineWidth = 0.4 + random() * 2.4;
      ctx.stroke();
    }

    for (let i = 0; i < 5000; i += 1) {
      ctx.fillStyle = `rgba(129, 93, 62, ${random() * 0.018})`;
      ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 0.5 + random());
    }
  }, renderer);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.8, 2.8);
  return texture;
}

function makePerlageTexture(renderer) {
  return canvasTexture(1024, (ctx, size) => {
    const random = seededRandom(83);
    ctx.fillStyle = '#292c29';
    ctx.fillRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(size * 0.44, size * 0.4, size * 0.05, size * 0.5, size * 0.5, size * 0.64);
    glow.addColorStop(0, 'rgba(126, 123, 108, 0.19)');
    glow.addColorStop(0.65, 'rgba(19, 22, 20, 0.06)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    const step = 44;
    for (let y = -step; y < size + step; y += step * 0.7) {
      for (let x = -step; x < size + step; x += step) {
        const cx = x + ((Math.round(y / (step * 0.7)) % 2) * step) / 2 + random() * 4;
        const cy = y + random() * 4;
        const radius = 14 + random() * 8;
        for (let ring = 0; ring < 3; ring += 1) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius - ring * 3.6, 0, TAU);
          ctx.strokeStyle = ring === 0 ? 'rgba(195, 188, 164, 0.13)' : 'rgba(8, 10, 9, 0.16)';
          ctx.lineWidth = 1.15;
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < 10000; i += 1) {
      ctx.fillStyle = `rgba(255, 248, 221, ${random() * 0.016})`;
      ctx.fillRect(random() * size, random() * size, 1, 1);
    }
  }, renderer);
}

function makeTextTexture(text, subtext, renderer, options = {}) {
  const width = options.width ?? 768;
  const height = options.height ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = options.color ?? 'rgba(232, 207, 157, 0.95)';
  ctx.font = `${options.weight ?? 500} ${options.fontSize ?? 48}px ${options.font ?? 'Helvetica, Arial, sans-serif'}`;
  if (options.letterSpacing) ctx.letterSpacing = options.letterSpacing;
  ctx.fillText(text, width / 2, subtext ? height * 0.4 : height * 0.5);

  if (subtext) {
    ctx.fillStyle = options.subColor ?? 'rgba(214, 200, 172, 0.62)';
    ctx.font = `400 ${options.subSize ?? 18}px ${options.font ?? 'Helvetica, Arial, sans-serif'}`;
    if (options.subSpacing) ctx.letterSpacing = options.subSpacing;
    ctx.fillText(subtext, width / 2, height * 0.64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeRadialShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 256, 12, 256, 256, 250);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.43)');
  gradient.addColorStop(0.66, 'rgba(0, 0, 0, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

function circleShape(radius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, TAU, false);
  return shape;
}

function circleHole(radius) {
  const path = new THREE.Path();
  path.absarc(0, 0, radius, 0, TAU, true);
  return path;
}

function annulusGeometry(outerRadius, innerRadius, depth, bevel = 0.012) {
  const shape = circleShape(outerRadius);
  shape.holes.push(circleHole(innerRadius));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel * 0.7,
    curveSegments: 72,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createGear({
  teeth = 32,
  radius = 0.5,
  thickness = 0.055,
  material,
  hubMaterial,
  spokes = 5,
  spokeRatio = 0.5,
  axle = 0.038,
}) {
  const group = new THREE.Group();
  const toothHeight = Math.min(radius * 0.1, 0.055);
  const rootRadius = radius - toothHeight;
  const shape = new THREE.Shape();
  const segments = teeth * 4;

  for (let index = 0; index <= segments; index += 1) {
    const phase = index % 4;
    const angle = (index / segments) * TAU;
    const toothRadius = phase === 1 || phase === 2 ? radius : rootRadius;
    const x = Math.cos(angle) * toothRadius;
    const y = Math.sin(angle) * toothRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  shape.holes.push(circleHole(axle));

  if (spokes > 0) {
    const orbit = radius * spokeRatio;
    const holeRadius = Math.min(radius * 0.17, orbit * 0.48);
    for (let index = 0; index < spokes; index += 1) {
      const angle = (index / spokes) * TAU + Math.PI / spokes;
      shape.holes.push(circleHoleAt(Math.cos(angle) * orbit, Math.sin(angle) * orbit, holeRadius));
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.006,
    bevelThickness: 0.004,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -thickness / 2);
  const wheel = new THREE.Mesh(geometry, material);
  wheel.castShadow = true;
  wheel.receiveShadow = true;
  wheel.userData.part = 'Gear train';
  group.add(wheel);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(axle * 1.65, axle * 1.95, thickness + 0.045, 20),
    hubMaterial ?? material,
  );
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  group.add(hub);

  return group;
}

function circleHoleAt(x, y, radius) {
  const path = new THREE.Path();
  path.absarc(x, y, radius, 0, TAU, true);
  return path;
}

function createSmoothPlate(points, holes, depth, material) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'centripetal',
    0.4,
  );
  const sampled = curve.getPoints(90);
  const shape = new THREE.Shape();
  sampled.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  });
  shape.closePath();
  holes.forEach(({ x, y, radius }) => shape.holes.push(circleHoleAt(x, y, radius)));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.016,
    bevelThickness: 0.012,
    curveSegments: 20,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createScrew(radius, height, material) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, height, 24), material);
  head.rotation.x = Math.PI / 2;
  head.castShadow = true;
  group.add(head);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 1.3, radius * 0.18, height * 0.42),
    new THREE.MeshPhongMaterial({ color: 0x181c19, specular: 0x222222, shininess: 20 }),
  );
  slot.position.z = height * 0.38;
  group.add(slot);
  return group;
}

function createJewel(radius, material, settingMaterial) {
  const group = new THREE.Group();
  const setting = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.17, radius * 0.28, 10, 28), settingMaterial);
  group.add(setting);
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, radius * 0.65, 24), material);
  jewel.rotation.x = Math.PI / 2;
  jewel.position.z = radius * 0.15;
  group.add(jewel);
  return group;
}

function createHand(length, width, tail, material, luminousMaterial) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.46, -tail);
  shape.lineTo(0, length);
  shape.lineTo(width * 0.46, -tail);
  shape.lineTo(0, -tail * 0.38);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });
  geometry.translate(0, 0, -0.0175);
  const hand = new THREE.Mesh(geometry, material);
  hand.castShadow = true;
  group.add(hand);

  if (luminousMaterial) {
    const lumeLength = length * 0.51;
    const lume = new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, lumeLength, 0.006), luminousMaterial);
    lume.position.y = length * 0.24;
    lume.position.z = 0.023;
    group.add(lume);
  }
  return group;
}

function createHairspring(material) {
  const points = [];
  const turns = 8.5;
  const startRadius = 0.03;
  const endRadius = 0.38;
  for (let index = 0; index <= 520; index += 1) {
    const progress = index / 520;
    const angle = progress * TAU * turns;
    const radius = startRadius + (endRadius - startRadius) * progress;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 560, 0.0055, 4, false), material);
}

function createLug() {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(0.42, 0.88, 0.18), {
    depth: 0.19,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -0.095);
  return geometry;
}

function buildDesk(scene, renderer, performanceMode) {
  const desk = new THREE.Group();
  const wood = makeWoodTexture(renderer);
  const deskMaterial = performanceMode
    ? new THREE.MeshBasicMaterial({ map: wood, color: 0x9d7e62, transparent: true })
    : new THREE.MeshStandardMaterial({ map: wood, color: 0x9d7e62, roughness: 0.68, metalness: 0.2 });
  const deskPlane = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), deskMaterial);
  deskPlane.rotation.x = -Math.PI / 2;
  deskPlane.position.y = -1.34;
  deskPlane.receiveShadow = true;
  desk.add(deskPlane);

  const leatherTexture = makeLeatherTexture(renderer);
  const leather = new THREE.Mesh(
    new THREE.CircleGeometry(6.7, 128),
    performanceMode
      ? new THREE.MeshBasicMaterial({ map: leatherTexture, color: 0x526353, transparent: true })
      : new THREE.MeshStandardMaterial({
          map: leatherTexture,
          color: 0x526353,
          roughness: 0.92,
          metalness: 0.02,
          envMapIntensity: 0.45,
        }),
  );
  leather.rotation.x = -Math.PI / 2;
  leather.position.y = -1.31;
  leather.receiveShadow = true;
  desk.add(leather);

  const stitchMaterial = performanceMode
    ? new THREE.MeshPhongMaterial({ color: 0x8f794f, specular: 0x3e3424, shininess: 24 })
    : new THREE.MeshStandardMaterial({ color: 0x8f794f, roughness: 0.7, metalness: 0.28 });
  const stitchGeometry = new THREE.BoxGeometry(0.055, 0.012, 0.012);
  const stitchCount = 184;
  const stitchPieces = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < stitchCount; index += 1) {
    const angle = (index / stitchCount) * TAU;
    position.set(Math.cos(angle) * 6.28, -1.295, Math.sin(angle) * 6.28);
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    matrix.compose(position, quaternion, scale);
    const piece = stitchGeometry.clone();
    piece.applyMatrix4(matrix);
    stitchPieces.push(piece);
  }
  const stitches = new THREE.Mesh(mergeGeometries(stitchPieces, false), stitchMaterial);
  stitches.receiveShadow = true;
  desk.add(stitches);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(6.31, 0.018, 8, 210),
    performanceMode
      ? new THREE.MeshPhongMaterial({ color: 0x6f5b3b, specular: 0x5d4a2d, shininess: 36 })
      : new THREE.MeshStandardMaterial({ color: 0x6f5b3b, roughness: 0.5, metalness: 0.45 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.3;
  desk.add(rim);

  const shadowTexture = makeRadialShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 7.7),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.35, -1.285, 0.2);
  shadow.scale.set(0.96, 0.83, 1);
  desk.add(shadow);

  const engraving = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 0.26),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('ATELIER 07', 'GENÈVE · SWISS MADE', renderer, {
        width: 768,
        height: 160,
        fontSize: 39,
        subSize: 14,
        letterSpacing: '9px',
        subSpacing: '5px',
        color: 'rgba(181, 153, 100, 0.54)',
        subColor: 'rgba(159, 139, 103, 0.40)',
      }),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  engraving.rotation.x = -Math.PI / 2;
  engraving.rotation.z = Math.PI;
  engraving.position.set(-0.4, -1.292, 4.1);
  desk.add(engraving);

  scene.add(desk);
  return desk;
}

function solidTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 2, 2);
  return new THREE.CanvasTexture(canvas);
}

function simpleLambert(props) {
  const { specular = 0xc8c2ae, shininess = 52, ...rest } = props;
  return new THREE.MeshPhongMaterial({ ...rest, specular, shininess });
}

function createMaterials(renderer, performanceMode) {
  if (performanceMode) {
    return {
      steel: simpleLambert({ color: 0xd8dad7, specular: 0xffffff, shininess: 115 }),
      steelDark: simpleLambert({ color: 0x5d625f, specular: 0xc0c6c2, shininess: 65 }),
      movement: simpleLambert({ color: 0x74786f, specular: 0x9fa49c, shininess: 34 }),
      movementDark: simpleLambert({ color: 0x272b28, specular: 0x666d68, shininess: 24 }),
      gold: simpleLambert({ color: 0xd8b46f, specular: 0xffefc0, shininess: 95 }),
      goldDark: simpleLambert({ color: 0x9b773f, specular: 0xe0c184, shininess: 58 }),
      brass: simpleLambert({ color: 0xbd9255, specular: 0xf5d79d, shininess: 62 }),
      dial: simpleLambert({ color: 0x102b29, specular: 0x7eaaa2, shininess: 80 }),
      dialDark: simpleLambert({ color: 0x081716, specular: 0x3c6760, shininess: 48 }),
      ruby: simpleLambert({
        color: 0x9d1239,
        emissive: 0x2a0009,
        emissiveIntensity: 0.45,
        specular: 0xff8bad,
        shininess: 120,
      }),
      sapphire: new THREE.MeshBasicMaterial({
        map: solidTexture(),
        color: 0xa7d7df,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
      lume: simpleLambert({
        color: 0xe8e1c4,
        emissive: 0xa8b58a,
        emissiveIntensity: 0.24,
        specular: 0xd9d6bb,
        shininess: 12,
      }),
      spring: simpleLambert({ color: 0xc9b88f, specular: 0xffefce, shininess: 58 }),
      perlage: new THREE.MeshBasicMaterial({
        map: makePerlageTexture(renderer),
        color: 0xbab9ad,
        transparent: true,
      }),
    };
  }

  return {
    steel: new THREE.MeshStandardMaterial({
      color: 0xd4d5d2,
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 1.6,
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: 0x5d625f,
      metalness: 0.97,
      roughness: 0.28,
      envMapIntensity: 1.25,
    }),
    movement: new THREE.MeshStandardMaterial({
      color: 0x74786f,
      metalness: 0.9,
      roughness: 0.3,
      envMapIntensity: 1.18,
    }),
    movementDark: new THREE.MeshStandardMaterial({
      color: 0x272b28,
      metalness: 0.82,
      roughness: 0.37,
      envMapIntensity: 0.9,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xd3ae6b,
      metalness: 1,
      roughness: 0.19,
      envMapIntensity: 1.55,
    }),
    goldDark: new THREE.MeshStandardMaterial({
      color: 0x8d6a35,
      metalness: 1,
      roughness: 0.28,
      envMapIntensity: 1.25,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb48a4d,
      metalness: 0.92,
      roughness: 0.3,
      envMapIntensity: 1.3,
    }),
    dial: new THREE.MeshStandardMaterial({
      color: 0x0f2927,
      metalness: 0.72,
      roughness: 0.24,
      envMapIntensity: 1.15,
    }),
    dialDark: new THREE.MeshStandardMaterial({
      color: 0x081716,
      metalness: 0.58,
      roughness: 0.34,
      envMapIntensity: 0.85,
    }),
    ruby: new THREE.MeshStandardMaterial({
      color: 0x9d1239,
      emissive: 0x240008,
      emissiveIntensity: 0.32,
      metalness: 0.05,
      roughness: 0.07,
      envMapIntensity: 2.1,
    }),
    sapphire: new THREE.MeshStandardMaterial({
      color: 0x93c8d0,
      metalness: 0,
      roughness: 0.025,
      transparent: true,
      opacity: 0.2,
      envMapIntensity: 2.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    lume: new THREE.MeshStandardMaterial({
      color: 0xe8e1c4,
      emissive: 0xa8b58a,
      emissiveIntensity: 0.23,
      roughness: 0.58,
      metalness: 0,
    }),
    spring: new THREE.MeshStandardMaterial({
      color: 0xc9b88f,
      metalness: 0.92,
      roughness: 0.27,
      envMapIntensity: 1.4,
    }),
    perlage: new THREE.MeshStandardMaterial({
      map: makePerlageTexture(renderer),
      color: 0xa4a397,
      metalness: 0.78,
      roughness: 0.32,
      envMapIntensity: 1,
    }),
  };
}

export function createWatch(scene, renderer, options = {}) {
  const performanceMode = Boolean(options.performance);
  const materials = createMaterials(renderer, performanceMode);
  const desk = buildDesk(scene, renderer, performanceMode);
  const root = new THREE.Group();
  root.name = 'Atelier 07 calibre';
  root.rotation.x = -0.79;
  root.rotation.z = -0.055;
  root.position.set(1.15, 0.17, 0);
  scene.add(root);

  const assembly = new THREE.Group();
  root.add(assembly);

  const layers = {
    caseback: new THREE.Group(),
    caseBody: new THREE.Group(),
    movement: new THREE.Group(),
    train: new THREE.Group(),
    bridges: new THREE.Group(),
    dial: new THREE.Group(),
    hands: new THREE.Group(),
    crystal: new THREE.Group(),
  };

  const layerSpec = {
    caseback: { base: -0.34, explode: 0.02 },
    caseBody: { base: 0, explode: 0.42 },
    movement: { base: -0.13, explode: 0.7 },
    train: { base: 0.015, explode: 0.88 },
    bridges: { base: 0.105, explode: 1.03 },
    dial: { base: 0.285, explode: 1.48 },
    hands: { base: 0.37, explode: 1.77 },
    crystal: { base: 0.5, explode: 2.05 },
  };

  Object.entries(layers).forEach(([name, group]) => {
    group.position.z = layerSpec[name].base;
    group.userData.baseZ = layerSpec[name].base;
    group.userData.explodeZ = layerSpec[name].explode;
    assembly.add(group);
  });

  // Display back
  const backRing = new THREE.Mesh(annulusGeometry(2.13, 1.76, 0.1), materials.steelDark);
  backRing.castShadow = true;
  layers.caseback.add(backRing);
  const backGlass = new THREE.Mesh(new THREE.CircleGeometry(1.74, 96), materials.sapphire);
  backGlass.position.z = 0.015;
  layers.caseback.add(backGlass);
  const backText = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.3),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('AN–07', '18 JEWELS · 5Hz', renderer, {
        width: 768,
        height: 220,
        fontSize: 58,
        subSize: 17,
        letterSpacing: '8px',
        subSpacing: '5px',
        color: 'rgba(189, 172, 133, 0.55)',
        subColor: 'rgba(177, 162, 125, 0.38)',
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  backText.position.set(0, -0.87, 0.052);
  layers.caseback.add(backText);

  // Main case profile
  const caseProfile = [
    [1.77, -0.33],
    [2.04, -0.35],
    [2.19, -0.27],
    [2.27, -0.1],
    [2.25, 0.08],
    [2.17, 0.21],
    [1.82, 0.27],
    [1.76, 0.18],
    [1.75, -0.3],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const caseGeometry = new THREE.LatheGeometry(caseProfile, 128);
  caseGeometry.rotateX(Math.PI / 2);
  const caseBand = new THREE.Mesh(caseGeometry, materials.steel);
  caseBand.castShadow = true;
  caseBand.receiveShadow = true;
  caseBand.userData.part = 'Polished steel case';
  layers.caseBody.add(caseBand);

  const bezel = new THREE.Mesh(annulusGeometry(2.29, 1.81, 0.12, 0.018), materials.steel);
  bezel.position.z = 0.255;
  bezel.castShadow = true;
  bezel.userData.part = 'Beveled bezel';
  layers.caseBody.add(bezel);

  const thinGoldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.805, 0.012, 8, 128),
    materials.gold,
  );
  thinGoldRing.position.z = 0.322;
  layers.caseBody.add(thinGoldRing);

  const outerGoldRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.283, 0.008, 6, 128),
    materials.goldDark,
  );
  outerGoldRing.position.z = 0.32;
  layers.caseBody.add(outerGoldRing);

  const knurlMaterial = materials.steel;
  const knurlGeometry = new THREE.BoxGeometry(0.055, 0.06, 0.28);
  const knurlCount = 108;
  const knurlPieces = [];
  const knurlMatrix = new THREE.Matrix4();
  const knurlQuaternion = new THREE.Quaternion();
  const knurlPosition = new THREE.Vector3();
  for (let index = 0; index < knurlCount; index += 1) {
    const angle = (index / knurlCount) * TAU;
    knurlPosition.set(Math.cos(angle) * 2.275, Math.sin(angle) * 2.275, 0.045);
    knurlQuaternion.setFromEuler(new THREE.Euler(0, 0, angle));
    knurlMatrix.compose(knurlPosition, knurlQuaternion, new THREE.Vector3(1, 1, 1));
    const piece = knurlGeometry.clone();
    piece.applyMatrix4(knurlMatrix);
    knurlPieces.push(piece);
  }
  const knurls = new THREE.Mesh(mergeGeometries(knurlPieces, false), knurlMaterial);
  knurls.castShadow = true;
  layers.caseBody.add(knurls);

  // Lugs and spring bars
  const lugGeometry = createLug();
  const lugPositions = [
    [-1.58, 1.86, 0.14, -0.2],
    [1.58, 1.86, -0.1, 0.2],
    [-1.58, -1.86, -0.14, 0.2],
    [1.58, -1.86, 0.1, -0.2],
  ];
  lugPositions.forEach(([x, y, angle, tilt]) => {
    const lug = new THREE.Mesh(lugGeometry, materials.steel);
    lug.position.set(x, y, 0);
    lug.rotation.z = angle;
    lug.rotation.y = tilt;
    lug.castShadow = true;
    layers.caseBody.add(lug);
  });

  [-1, 1].forEach((side) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 2.65, 16), materials.steelDark);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, side * 2.13, -0.03);
    bar.castShadow = true;
    layers.caseBody.add(bar);
  });

  // Crown and cabochon
  const crown = new THREE.Group();
  const crownBody = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.31, 32), materials.gold);
  crownBody.rotation.z = Math.PI / 2;
  crownBody.castShadow = true;
  crownBody.userData.part = 'Fluted crown';
  crown.add(crownBody);

  const crownStem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 20), materials.steelDark);
  crownStem.rotation.z = Math.PI / 2;
  crownStem.position.x = -0.25;
  crown.add(crownStem);

  for (let index = 0; index < 28; index += 1) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.018, 0.028), materials.goldDark);
    const angle = (index / 28) * TAU;
    ridge.position.set(0, Math.cos(angle) * 0.222, Math.sin(angle) * 0.222);
    ridge.rotation.x = angle;
    crown.add(ridge);
  }

  const cabochon = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 16), materials.dial);
  cabochon.scale.set(0.7, 1, 1);
  cabochon.position.x = 0.17;
  crown.add(cabochon);
  crown.position.set(2.42, 0, 0.02);
  layers.caseBody.add(crown);

  // Main plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.66, 0.09, 96), materials.perlage);
  plate.rotation.x = Math.PI / 2;
  plate.position.z = 0.005;
  plate.receiveShadow = true;
  plate.castShadow = true;
  plate.userData.part = 'Perlage main plate';
  layers.movement.add(plate);

  const plateRim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.025, 8, 128), materials.goldDark);
  plateRim.position.z = 0.055;
  layers.movement.add(plateRim);

  const serialPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.15),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('N° 07 / 50', 'HAND FINISHED', renderer, {
        width: 640,
        height: 180,
        fontSize: 46,
        subSize: 16,
        letterSpacing: '5px',
        subSpacing: '4px',
        color: 'rgba(204, 186, 142, 0.6)',
        subColor: 'rgba(204, 186, 142, 0.35)',
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  serialPlate.position.set(0, 0.63, 0.057);
  layers.movement.add(serialPlate);

  // Gear train
  const barrel = createGear({
    teeth: 48,
    radius: 0.64,
    thickness: 0.055,
    material: materials.brass,
    hubMaterial: materials.goldDark,
    spokes: 6,
    spokeRatio: 0.52,
    axle: 0.07,
  });
  barrel.position.set(-0.58, -0.31, 0.12);
  barrel.userData.part = 'Mainspring barrel';
  layers.train.add(barrel);

  const barrelSpring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.018, 8, 96),
    materials.spring,
  );
  barrelSpring.position.set(-0.58, -0.31, 0.167);
  layers.train.add(barrelSpring);

  const centerWheel = createGear({
    teeth: 36,
    radius: 0.4,
    thickness: 0.05,
    material: materials.gold,
    hubMaterial: materials.goldDark,
    spokes: 5,
    spokeRatio: 0.5,
    axle: 0.045,
  });
  centerWheel.position.set(0.29, 0.47, 0.14);
  layers.train.add(centerWheel);

  const thirdWheel = createGear({
    teeth: 30,
    radius: 0.3,
    thickness: 0.045,
    material: materials.steel,
    spokes: 5,
    axle: 0.035,
  });
  thirdWheel.position.set(0.93, 0.16, 0.17);
  layers.train.add(thirdWheel);

  const fourthWheel = createGear({
    teeth: 24,
    radius: 0.235,
    thickness: 0.042,
    material: materials.gold,
    spokes: 4,
    axle: 0.03,
  });
  fourthWheel.position.set(0.7, -0.47, 0.19);
  layers.train.add(fourthWheel);

  const escapeWheel = createGear({
    teeth: 18,
    radius: 0.17,
    thickness: 0.038,
    material: materials.steel,
    spokes: 4,
    axle: 0.025,
  });
  escapeWheel.position.set(0.98, -0.58, 0.21);
  layers.train.add(escapeWheel);

  const windingWheel = createGear({
    teeth: 40,
    radius: 0.44,
    thickness: 0.052,
    material: materials.brass,
    hubMaterial: materials.goldDark,
    spokes: 5,
    axle: 0.05,
  });
  windingWheel.position.set(-0.73, 0.8, 0.12);
  layers.train.add(windingWheel);

  const ratchetWheel = createGear({
    teeth: 34,
    radius: 0.3,
    thickness: 0.046,
    material: materials.steel,
    spokes: 5,
    axle: 0.04,
  });
  ratchetWheel.position.set(-1.05, 1.01, 0.14);
  layers.train.add(ratchetWheel);

  // Balance wheel and hairspring
  const balance = new THREE.Group();
  balance.position.set(0.36, -0.88, 0.25);
  balance.userData.part = 'Free-sprung balance';
  const balanceRim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.052, 12, 72), materials.gold);
  balanceRim.castShadow = true;
  balance.add(balanceRim);
  const balanceInner = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.015, 8, 64), materials.goldDark);
  balanceInner.position.z = 0.015;
  balance.add(balanceInner);
  for (let index = 0; index < 3; index += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.027, 0.035), materials.gold);
    spoke.rotation.z = (index / 3) * Math.PI;
    balance.add(spoke);
  }
  const balanceStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 20), materials.steel);
  balanceStaff.rotation.x = Math.PI / 2;
  balance.add(balanceStaff);
  const hairspring = createHairspring(materials.spring);
  hairspring.position.z = 0.065;
  hairspring.userData.part = 'Hairspring';
  balance.add(hairspring);
  layers.train.add(balance);

  const palletFork = new THREE.Group();
  const palletBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.035), materials.steel);
  palletBar.position.x = -0.11;
  palletFork.add(palletBar);
  const palletJewelA = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.035, 0.055), materials.ruby);
  palletJewelA.position.set(-0.27, 0.065, 0);
  palletJewelA.rotation.z = 0.45;
  palletFork.add(palletJewelA);
  const palletJewelB = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.035, 0.055), materials.ruby);
  palletJewelB.position.set(-0.27, -0.065, 0);
  palletJewelB.rotation.z = -0.45;
  palletFork.add(palletJewelB);
  palletFork.position.set(0.73, -0.68, 0.24);
  layers.train.add(palletFork);

  // Bridges and cocks
  const trainBridge = createSmoothPlate(
    [
      [-0.12, 0.98],
      [0.52, 1.07],
      [1.19, 0.73],
      [1.3, 0.35],
      [1.08, 0.17],
      [0.6, 0.27],
      [0.37, 0.53],
      [0.05, 0.6],
      [-0.2, 0.79],
    ],
    [
      { x: 0.24, y: 0.73, radius: 0.08 },
      { x: 0.93, y: 0.43, radius: 0.06 },
    ],
    0.07,
    materials.steel,
  );
  trainBridge.position.z = 0.29;
  trainBridge.userData.part = 'Train bridge';
  layers.bridges.add(trainBridge);

  const barrelBridge = createSmoothPlate(
    [
      [-1.31, 0.42],
      [-1.12, 0.96],
      [-0.7, 1.13],
      [-0.28, 0.96],
      [-0.23, 0.63],
      [-0.52, 0.48],
      [-0.87, 0.58],
      [-1.17, 0.35],
    ],
    [
      { x: -0.73, y: 0.81, radius: 0.085 },
      { x: -1.04, y: 0.95, radius: 0.05 },
    ],
    0.07,
    materials.goldDark,
  );
  barrelBridge.position.z = 0.28;
  barrelBridge.userData.part = 'Barrel bridge';
  layers.bridges.add(barrelBridge);

  const balanceCock = createSmoothPlate(
    [
      [-0.22, -0.63],
      [-0.04, -0.58],
      [0.23, -0.64],
      [0.34, -0.83],
      [0.24, -1.01],
      [-0.05, -1.05],
      [-0.3, -0.91],
    ],
    [
      { x: 0.04, y: -0.82, radius: 0.052 },
      { x: -0.14, y: -0.72, radius: 0.035 },
    ],
    0.065,
    materials.steel,
  );
  balanceCock.position.z = 0.31;
  balanceCock.userData.part = 'Balance cock';
  layers.bridges.add(balanceCock);

  const lowerBridge = createSmoothPlate(
    [
      [0.38, -0.23],
      [0.7, -0.03],
      [1.15, -0.14],
      [1.27, -0.42],
      [1.02, -0.68],
      [0.65, -0.66],
      [0.42, -0.48],
    ],
    [
      { x: 0.73, y: -0.43, radius: 0.062 },
      { x: 1.02, y: -0.53, radius: 0.045 },
    ],
    0.06,
    materials.goldDark,
  );
  lowerBridge.position.z = 0.27;
  lowerBridge.userData.part = 'Escapement bridge';
  layers.bridges.add(lowerBridge);

  // Jewel settings and screws
  const jewelPositions = [
    [0.29, 0.47, 0.345],
    [0.93, 0.16, 0.345],
    [-0.58, -0.31, 0.35],
    [0.04, -0.82, 0.36],
    [0.73, -0.43, 0.325],
    [0.98, -0.58, 0.34],
  ];
  jewelPositions.forEach(([x, y, z], index) => {
    const jewel = createJewel(index === 2 ? 0.072 : 0.055, materials.ruby, materials.gold);
    jewel.position.set(x, y, z);
    jewel.userData.part = 'Ruby jewel bearing';
    layers.bridges.add(jewel);
  });

  const screwPositions = [
    [-0.37, 0.98, 0.335],
    [0.9, 0.8, 0.335],
    [1.16, 0.27, 0.335],
    [-1.22, 0.65, 0.33],
    [-0.2, -0.64, 0.35],
    [1.2, -0.42, 0.325],
  ];
  const screwGeometry = createScrew(0.055, 0.05, materials.steel);
  screwPositions.forEach(([x, y, z]) => {
    const screw = screwGeometry.clone();
    screw.position.set(x, y, z);
    layers.bridges.add(screw);
  });

  // Openworked dial
  const dialRing = new THREE.Mesh(annulusGeometry(1.81, 1.23, 0.07, 0.009), materials.dial);
  dialRing.position.z = 0.005;
  dialRing.castShadow = true;
  dialRing.userData.part = 'Openworked dial';
  layers.dial.add(dialRing);

  const chapterRing = new THREE.Mesh(annulusGeometry(1.82, 1.68, 0.012, 0.004), materials.dialDark);
  chapterRing.position.z = 0.051;
  layers.dial.add(chapterRing);

  const dialInnerGold = new THREE.Mesh(new THREE.TorusGeometry(1.238, 0.012, 8, 128), materials.gold);
  dialInnerGold.position.z = 0.055;
  layers.dial.add(dialInnerGold);

  const minuteTickGeometry = new THREE.BoxGeometry(0.018, 0.075, 0.025);
  const tickPieces = [];
  const tickMatrix = new THREE.Matrix4();
  const tickQuaternion = new THREE.Quaternion();
  const tickPosition = new THREE.Vector3();
  for (let index = 0; index < 60; index += 1) {
    const angle = (index / 60) * TAU;
    const radius = 1.735;
    tickPosition.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0.07);
    tickQuaternion.setFromEuler(new THREE.Euler(0, 0, -angle));
    const scale = index % 5 === 0 ? new THREE.Vector3(1.15, 1.4, 1) : new THREE.Vector3(0.8, 0.7, 1);
    tickMatrix.compose(tickPosition, tickQuaternion, scale);
    const piece = minuteTickGeometry.clone();
    piece.applyMatrix4(tickMatrix);
    tickPieces.push(piece);
  }
  const minuteTicks = new THREE.Mesh(mergeGeometries(tickPieces, false), materials.steel);
  minuteTicks.castShadow = true;
  layers.dial.add(minuteTicks);

  const markerMaterial = materials.gold;
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU;
    const isCardinal = index % 3 === 0;
    const geometry = new THREE.BoxGeometry(isCardinal ? 0.055 : 0.036, isCardinal ? 0.22 : 0.15, 0.055);
    const marker = new THREE.Mesh(geometry, markerMaterial);
    const radius = isCardinal ? 1.52 : 1.54;
    marker.position.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0.078);
    marker.rotation.z = -angle;
    marker.castShadow = true;
    marker.userData.part = 'Applied hour marker';
    layers.dial.add(marker);
  }

  const brandMark = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 0.55),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('ATELIER 07', 'GENÈVE  ·  AUTOMATIQUE', renderer, {
        width: 1024,
        height: 256,
        fontSize: 66,
        subSize: 20,
        letterSpacing: '14px',
        subSpacing: '7px',
        font: 'Georgia, serif',
        weight: 400,
        color: 'rgba(233, 207, 154, 0.94)',
        subColor: 'rgba(218, 201, 168, 0.61)',
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  brandMark.position.set(0, 1.04, 0.092);
  layers.dial.add(brandMark);

  const reserveText = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.18),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('72H', 'POWER RESERVE', renderer, {
        width: 640,
        height: 190,
        fontSize: 55,
        subSize: 16,
        letterSpacing: '5px',
        subSpacing: '3px',
        color: 'rgba(222, 202, 160, 0.67)',
        subColor: 'rgba(205, 192, 164, 0.4)',
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  reserveText.position.set(0, -1.05, 0.094);
  layers.dial.add(reserveText);

  // Hands
  const hourHand = createHand(1.03, 0.11, 0.22, materials.gold, materials.lume);
  hourHand.position.z = 0.02;
  hourHand.userData.part = 'Hour hand';
  const minuteHand = createHand(1.46, 0.078, 0.27, materials.gold, materials.lume);
  minuteHand.position.z = 0.075;
  minuteHand.userData.part = 'Minute hand';
  const secondHand = new THREE.Group();
  const secondNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.54, 0.014), materials.steel);
  secondNeedle.position.y = 0.54;
  secondNeedle.castShadow = true;
  secondHand.add(secondNeedle);
  const secondTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.26, 0.018), materials.ruby);
  secondTip.position.y = 1.16;
  secondHand.add(secondTip);
  const secondWeight = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), materials.ruby);
  secondWeight.rotation.x = Math.PI / 2;
  secondWeight.position.y = -0.38;
  secondHand.add(secondWeight);
  secondHand.position.z = 0.115;
  secondHand.userData.part = 'Sweeping seconds';
  layers.hands.add(hourHand, minuteHand, secondHand);

  const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.085, 32), materials.gold);
  centerCap.rotation.x = Math.PI / 2;
  centerCap.position.z = 0.155;
  centerCap.castShadow = true;
  layers.hands.add(centerCap);
  const centerJewel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), materials.ruby);
  centerJewel.rotation.x = Math.PI / 2;
  centerJewel.position.z = 0.204;
  layers.hands.add(centerJewel);

  // Domed sapphire crystal
  const crystalProfile = [];
  for (let index = 0; index <= 18; index += 1) {
    const progress = index / 18;
    const radius = 1.81 * progress;
    const height = 0.185 * (1 - progress * progress);
    crystalProfile.push(new THREE.Vector2(radius, height));
  }
  const crystalGeometry = new THREE.LatheGeometry(crystalProfile, 128);
  crystalGeometry.rotateX(Math.PI / 2);
  const crystal = new THREE.Mesh(crystalGeometry, materials.sapphire);
  crystal.castShadow = false;
  crystal.renderOrder = 4;
  crystal.userData.part = 'Domed sapphire crystal';
  layers.crystal.add(crystal);

  const crystalEdge = new THREE.Mesh(
    new THREE.TorusGeometry(1.807, 0.006, 6, 128),
    materials.sapphire,
  );
  crystalEdge.position.z = 0.005;
  layers.crystal.add(crystalEdge);

  // Internal glow, only noticeable in dark points.
  const movementGlow = new THREE.PointLight(0xf0bd6f, 0.75, 3.8, 2);
  movementGlow.position.set(0.15, -0.2, 0.35);
  layers.train.add(movementGlow);

  const anchors = {
    balance: new THREE.Vector3(0.36, -0.88, 0.47),
    barrel: new THREE.Vector3(-0.58, -0.31, 0.4),
    crown: new THREE.Vector3(2.6, 0, 0.17),
  };

  const gearAnimations = [
    { object: barrel, speed: 0.28 },
    { object: centerWheel, speed: -0.82 },
    { object: thirdWheel, speed: 1.56 },
    { object: fourthWheel, speed: -2.45 },
    { object: escapeWheel, speed: 5.25 },
    { object: windingWheel, speed: -0.22 },
    { object: ratchetWheel, speed: 0.36 },
  ];

  let currentExplode = 0;
  let targetExplode = 0;
  let speedScale = 1;
  const touchableParts = [];
  assembly.traverse((object) => {
    if (object.isMesh && object.userData.part) touchableParts.push(object);
  });

  function setExplode(value) {
    targetExplode = THREE.MathUtils.clamp(value, 0, 1);
  }

  function setSlowMotion(enabled) {
    speedScale = enabled ? 0.22 : 1;
  }

  function update(elapsed, delta) {
    currentExplode += (targetExplode - currentExplode) * Math.min(1, delta * 4.8);
    const eased = currentExplode * currentExplode * (3 - 2 * currentExplode);

    Object.entries(layers).forEach(([name, group]) => {
      const spec = layerSpec[name];
      group.position.z = spec.base + spec.explode * eased;
    });

    const motion = elapsed * speedScale;
    gearAnimations.forEach(({ object, speed }) => {
      object.rotation.z = motion * speed;
    });

    balance.rotation.z = Math.sin(motion * 7.4) * 0.34;
    hairspring.rotation.z = Math.sin(motion * 7.4) * 0.12;
    palletFork.rotation.z = Math.sin(motion * 7.4 + 0.7) * 0.16;

    const seconds = 10 * 3600 + 10 * 60 + elapsed;
    const minutes = 10 + (elapsed / 60);
    const hours = 10 + minutes / 60;
    hourHand.rotation.z = -(hours / 12) * TAU;
    minuteHand.rotation.z = -(minutes / 60) * TAU;
    secondHand.rotation.z = -(seconds / 60) * TAU;
  }

  return {
    root,
    desk,
    layers,
    anchors,
    touchableParts,
    setExplode,
    setSlowMotion,
    update,
    get explode() {
      return currentExplode;
    },
  };
}
