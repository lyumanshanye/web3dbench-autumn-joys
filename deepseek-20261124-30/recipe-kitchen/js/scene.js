import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const modelSwatchColors = {
  tomato: '#d95239',
  pasta: '#d9a84b',
  garlic: '#e7dcc4',
  basil: '#5d7e4c',
  cheese: '#d9b74d',
  oil: '#b7762f',
  chickpea: '#c89a58',
  tortilla: '#e4c58c',
  cabbage: '#87476f',
  lime: '#8da64c',
  yogurt: '#f3ecdf',
  spice: '#b8742f',
  salmon: '#df806e',
  bokchoy: '#8ca665',
  rice: '#e7e0cf',
  miso: '#b98950',
  butter: '#ebce79',
  scallion: '#75a659',
  sesame: '#524939',
  sweetpotato: '#d47a3d',
  coconut: '#eee5d2',
  spinach: '#47744e',
  curry: '#b74630',
  chicken: '#b87943',
  potato: '#c9a264',
  lemon: '#d9bb43',
  thyme: '#70865b',
  jar: '#c9a35b',
  beef: '#8f5138',
  cucumber: '#6c9552',
  farro: '#b59c70',
  avocado: '#6e8f4f',
  feta: '#f0eadb',
  bread: '#c99658',
  mushroom: '#a1846a',
  ricotta: '#f4eee2'
};

const materialCache = new Map();

function material(color, options = {}) {
  const key = `${color}-${options.roughness ?? 0.72}-${options.metalness ?? 0}-${options.transparent ?? false}-${options.opacity ?? 1}-${options.side ?? THREE.FrontSide}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide
    }));
  }
  return materialCache.get(key);
}

function roundedBox(width, height, depth, radius, color, options = {}) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 4, radius);
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function mesh(geometry, color, options = {}) {
  const output = new THREE.Mesh(geometry, material(color, options));
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function place(object, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  object.position.set(x, y, z);
  object.rotation.set(rx, ry, rz);
  return object;
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const leafGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.42, -0.16, 0.34, 0.3, 0, 0.5);
  shape.bezierCurveTo(-0.34, 0.3, -0.42, -0.16, 0, -0.5);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.012
  });
  geometry.center();
  return geometry;
})();

function leaf(color, scale = 1, rx = -Math.PI / 2, ry = 0, rz = 0) {
  const output = mesh(leafGeometry, color, { roughness: 0.66 });
  output.scale.setScalar(scale);
  output.rotation.set(rx, ry, rz);
  return output;
}

function ceramicPlate(color = '#f7eee1', radius = 0.55) {
  const group = new THREE.Group();
  group.add(place(mesh(new THREE.CylinderGeometry(radius, radius * 0.93, 0.055, 36), color, { roughness: 0.5 }), 0, 0.028, 0));
  group.add(place(mesh(new THREE.TorusGeometry(radius * 0.72, 0.012, 8, 36), '#ded0bd'), 0, 0.061, 0, Math.PI / 2));
  return group;
}

function prepBowl(color = '#f7eee1', radius = 0.45) {
  const group = new THREE.Group();
  group.add(place(mesh(new THREE.CylinderGeometry(radius, radius * 0.78, 0.22, 32), color, { roughness: 0.5 }), 0, 0.11, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(radius * 0.85, radius * 0.72, 0.02, 32), '#e7d8c3'), 0, 0.222, 0));
  group.add(place(mesh(new THREE.TorusGeometry(radius * 0.88, 0.013, 8, 32), '#d9c8b1'), 0, 0.224, 0, Math.PI / 2));
  return group;
}

function scatter(group, { count, color, radius = 0.3, y = 0.24, size = 0.05, seed = 5, squash = 0.6 }) {
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const instanced = new THREE.InstancedMesh(geometry, material(color, { roughness: 0.78 }), count);
  const random = seededRandom(seed);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    const scale = size * (0.72 + random() * 0.55);
    dummy.position.set(Math.cos(angle) * distance, y + random() * 0.055, Math.sin(angle) * distance);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(scale * (0.8 + random() * 0.7), scale * squash, scale);
    dummy.updateMatrix();
    instanced.setMatrixAt(index, dummy.matrix);
  }
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  group.add(instanced);
}

function createTomato() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f2e7d8', 0.56));
  const random = seededRandom(11);
  const positions = [
    [-0.22, 0.13, -0.14, 0.29],
    [0.18, 0.14, 0.09, 0.3],
    [0.08, 0.14, -0.3, 0.24],
    [-0.08, 0.14, 0.3, 0.25]
  ];
  positions.forEach(([x, y, z, radius], index) => {
    const tomato = mesh(new THREE.SphereGeometry(radius, 20, 14), index % 2 ? '#e45d3c' : '#d94c31', { roughness: 0.58 });
    tomato.scale.y = 0.88;
    place(tomato, x, y + 0.09, z, 0, random() * 2, 0);
    group.add(tomato);
    for (let leafIndex = 0; leafIndex < 5; leafIndex += 1) {
      const angle = (leafIndex / 5) * Math.PI * 2;
      const calyx = leaf('#69804c', 0.11, -Math.PI / 2 + 0.18, angle, 0);
      calyx.position.set(x + Math.cos(angle) * 0.06, y + radius * 0.96 + 0.08, z + Math.sin(angle) * 0.06);
      group.add(calyx);
    }
  });
  return group;
}

function createPasta() {
  const group = new THREE.Group();
  group.add(prepBowl('#eee2d1'));
  scatter(group, { count: 48, color: '#dfb45f', radius: 0.26, y: 0.245, size: 0.075, seed: 4, squash: 0.43 });
  for (let index = 0; index < 3; index += 1) {
    const twirl = mesh(new THREE.TorusKnotGeometry(0.14, 0.035, 45, 7, 2, 3), '#e8c26e', { roughness: 0.65 });
    place(twirl, -0.12 + index * 0.13, 0.35 + index * 0.025, 0.02, 1.2, index * 0.8, 0.25);
    twirl.scale.set(1.1, 0.55, 1);
    group.add(twirl);
  }
  return group;
}

function createGarlic() {
  const group = new THREE.Group();
  const random = seededRandom(18);
  for (let index = 0; index < 3; index += 1) {
    const bulb = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.19, 20, 16), '#eee4d1', { roughness: 0.7 });
    body.scale.set(0.9, 1.2, 0.78);
    bulb.add(place(body, 0, 0.2, 0));
    bulb.add(place(mesh(new THREE.ConeGeometry(0.035, 0.14, 8), '#d8c8aa'), 0, 0.44, 0, 0, 0, 0.2));
    for (let line = 0; line < 3; line += 1) {
      const crease = mesh(new THREE.CapsuleGeometry(0.008, 0.18, 3, 6), '#d7c9b2');
      place(crease, -0.09 + line * 0.09, 0.2, 0.075, 0.1, 0, 0.14 - line * 0.14);
      crease.castShadow = false;
      bulb.add(crease);
    }
    place(bulb, -0.27 + index * 0.27, 0, -0.08 + random() * 0.16, 0, random() * 2, 0);
    group.add(bulb);
  }
  return group;
}

function createBasil() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f3e9da', 0.54));
  const random = seededRandom(8);
  for (let index = 0; index < 11; index += 1) {
    const angle = (index / 11) * Math.PI * 2 + random() * 0.45;
    const distance = 0.1 + random() * 0.3;
    const leafMesh = leaf(index % 3 ? '#587b46' : '#71905a', 0.36 + random() * 0.15, -Math.PI / 2 + (random() - 0.5) * 0.4, angle, 0);
    leafMesh.position.set(Math.cos(angle) * distance, 0.09 + random() * 0.11, Math.sin(angle) * distance);
    group.add(leafMesh);
  }
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.48, 6), '#45633b');
  place(stem, 0, 0.24, 0, 0, 0, 0.35);
  group.add(stem);
  return group;
}

function createCheese() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f5ecdf', 0.55));
  const wedge = mesh(new THREE.CylinderGeometry(0.46, 0.55, 0.34, 3), '#d9b446', { roughness: 0.6 });
  place(wedge, 0, 0.26, 0, 0, 0.24, 0);
  group.add(wedge);
  const holes = [
    [-0.1, 0.44, 0.14, 0.055],
    [0.17, 0.44, 0.05, 0.038],
    [0.02, 0.44, -0.16, 0.045]
  ];
  holes.forEach(([x, y, z, size]) => {
    group.add(place(mesh(new THREE.SphereGeometry(size, 10, 8), '#b9912d'), x, y, z));
  });
  const shaver = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 20), '#c9c4b8', { metalness: 0.55, roughness: 0.3 });
  place(shaver, 0.33, 0.1, 0.22, 0, 0.2, 0.1);
  group.add(shaver);
  return group;
}

function createOil(ingredient) {
  const group = new THREE.Group();
  const oilColor = ingredient.oilColor || '#a96a2e';
  const bottle = mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.52, 20), oilColor, { roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.86 });
  group.add(place(bottle, 0, 0.29, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.17, 20), oilColor, { roughness: 0.3, transparent: true, opacity: 0.82 }), 0, 0.63, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), '#2d2a25'), 0, 0.745, 0));
  const label = mesh(new THREE.CylinderGeometry(0.193, 0.21, 0.19, 20, 1, true, -0.9, 1.8), '#f0e4cf', { roughness: 0.8, side: THREE.DoubleSide });
  place(label, 0, 0.3, 0);
  group.add(label);
  group.add(place(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 20), '#79512d'), 0, 0.17, 0));
  return group;
}

function createChickpeas() {
  const group = new THREE.Group();
  group.add(prepBowl('#ece2d2', 0.47));
  const random = seededRandom(19);
  for (let index = 0; index < 22; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 0.29;
    const pea = mesh(new THREE.SphereGeometry(0.075, 10, 8), index % 4 === 0 ? '#d9ad67' : '#c89a57', { roughness: 0.78 });
    pea.scale.set(1, 0.85, 0.92);
    place(pea, Math.cos(angle) * distance, 0.28 + random() * 0.07, Math.sin(angle) * distance, random() * 2, random() * 2, random() * 2);
    group.add(pea);
  }
  return group;
}

function createTortillas() {
  const group = new THREE.Group();
  const random = seededRandom(23);
  for (let index = 0; index < 5; index += 1) {
    const tortilla = roundedBox(0.88, 0.035, 0.78, 0.06, index % 2 ? '#e7ca92' : '#dfbf85', { roughness: 0.74 });
    place(tortilla, (random() - 0.5) * 0.06, 0.07 + index * 0.037, (random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.2, (random() - 0.5) * 0.07);
    group.add(tortilla);
  }
  const cloth = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.025, 32), '#e3d8c4');
  place(cloth, 0, 0.02, 0);
  group.add(cloth);
  return group;
}

function createCabbage() {
  const group = new THREE.Group();
  const outer = mesh(new THREE.SphereGeometry(0.38, 24, 18), '#7d4268', { roughness: 0.8 });
  outer.scale.set(1, 0.92, 1);
  place(outer, 0, 0.38, 0);
  group.add(outer);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const outerLeaf = leaf(index % 2 ? '#8e5379' : '#6e365e', 0.31, -Math.PI / 2 + 0.2, angle, 0);
    outerLeaf.position.set(Math.cos(angle) * 0.28, 0.22 + index * 0.015, Math.sin(angle) * 0.28);
    group.add(outerLeaf);
  }
  const cut = mesh(new THREE.CircleGeometry(0.29, 24), '#e3cfd8');
  place(cut, 0, 0.61, 0, -Math.PI / 2, 0, 0.2);
  group.add(cut);
  for (let index = 0; index < 4; index += 1) {
    const vein = mesh(new THREE.BoxGeometry(0.018, 0.006, 0.24), '#b789a4');
    place(vein, -0.15 + index * 0.1, 0.617, 0, 0, 0.45 - index * 0.2, 0);
    group.add(vein);
  }
  return group;
}

function citrus(ingredient) {
  const group = new THREE.Group();
  const color = ingredient.model === 'lime' ? '#8ca349' : '#d7ba42';
  const random = seededRandom(ingredient.model === 'lime' ? 31 : 32);
  for (let index = 0; index < 2; index += 1) {
    const fruit = mesh(new THREE.SphereGeometry(0.25, 22, 16), color, { roughness: 0.66 });
    fruit.scale.set(1.25, 0.88, 0.9);
    place(fruit, -0.15 + index * 0.28, 0.23 + (index % 2) * 0.04, -0.08 + index * 0.13, random() * 0.4, random() * 2, 0.12);
    group.add(fruit);
    const nub = mesh(new THREE.SphereGeometry(0.028, 8, 6), '#789044');
    place(nub, -0.15 + index * 0.28 + (index ? 0.33 : -0.33), 0.23 + (index % 2) * 0.04, -0.02 + index * 0.13, 0, 0, 0);
    group.add(nub);
  }
  const leafMesh = leaf('#5a7b45', 0.22, -Math.PI / 2 + 0.35, 0.4, 0.2);
  leafMesh.position.set(0.03, 0.47, -0.06);
  group.add(leafMesh);
  return group;
}

function createYogurt() {
  const group = new THREE.Group();
  group.add(place(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.36, 26), '#f2eadc', { roughness: 0.48 }), 0, 0.2, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.055, 26), '#dce7df', { roughness: 0.42 }), 0, 0.4, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.291, 0.291, 0.075, 26, 1, true), '#6a876c', { side: THREE.DoubleSide }), 0, 0.22, 0));
  const spoon = mesh(new THREE.CapsuleGeometry(0.026, 0.35, 4, 8), '#b8b3a7', { metalness: 0.6, roughness: 0.3 });
  place(spoon, 0.25, 0.3, 0.19, 0.2, 0.1, 1.1);
  group.add(spoon);
  return group;
}

function createSpice(ingredient) {
  const group = new THREE.Group();
  const color = ingredient.spiceColor || '#b8742f';
  group.add(place(mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.33, 20), color, { roughness: 0.8 }), 0, 0.2, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), '#e8ddc9', { roughness: 0.55 }), 0, 0.39, 0));
  for (let index = 0; index < 7; index += 1) {
    const fleck = mesh(new THREE.SphereGeometry(0.022, 6, 5), '#8f5424');
    place(fleck, Math.cos(index) * 0.1, 0.425, Math.sin(index * 1.7) * 0.1);
    group.add(fleck);
  }
  return group;
}

function createJar(ingredient) {
  const group = new THREE.Group();
  const color = ingredient.jarColor || '#c9a35b';
  group.add(place(mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.42, 24), color, { roughness: 0.55 }), 0, 0.23, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 24), '#383832', { roughness: 0.55, metalness: 0.2 }), 0, 0.48, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.15, 24, 1, true), '#efe3cd', { side: THREE.DoubleSide }), 0, 0.24, 0));
  group.add(place(mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 24), '#ddd0ba'), 0, 0.442, 0, Math.PI / 2));
  return group;
}

function createSalmon() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f3e8da', 0.56));
  for (let index = 0; index < 2; index += 1) {
    const fillet = roundedBox(0.7, 0.19, 0.4, 0.08, index ? '#e68a7b' : '#de7b6c', { roughness: 0.62 });
    place(fillet, -0.14 + index * 0.27, 0.22, -0.1 + index * 0.16, 0.04, -0.4 + index * 0.8, 0.02);
    group.add(fillet);
    for (let stripe = 0; stripe < 3; stripe += 1) {
      const line = mesh(new THREE.BoxGeometry(0.04, 0.015, 0.34), '#f2c4b8');
      place(line, -0.36 + stripe * 0.21 + index * 0.27, 0.318, -0.08 + index * 0.16, 0.04, -0.4 + index * 0.8, 0);
      group.add(line);
    }
  }
  return group;
}

function createBokChoy() {
  const group = new THREE.Group();
  const random = seededRandom(39);
  for (let index = 0; index < 2; index += 1) {
    const head = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.32, 14), '#d9dfbc', { roughness: 0.7 });
    place(base, 0, 0.17, 0);
    head.add(base);
    for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
      const angle = (leafIndex / 4) * Math.PI * 2;
      const stem = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.35, 8), '#dbe3c4');
      place(stem, Math.cos(angle) * 0.1, 0.38, Math.sin(angle) * 0.1, Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
      head.add(stem);
      const greenLeaf = leaf(leafIndex % 2 ? '#557b49' : '#688b57', 0.33, -0.48 + random() * 0.2, angle, 0);
      greenLeaf.position.set(Math.cos(angle) * 0.18, 0.58 + random() * 0.11, Math.sin(angle) * 0.18);
      head.add(greenLeaf);
    }
    place(head, -0.18 + index * 0.38, 0, -0.04 + index * 0.16, 0, random() * 2, 0);
    group.add(head);
  }
  return group;
}

function createRice() {
  const group = new THREE.Group();
  group.add(prepBowl('#f1e8d9', 0.47));
  scatter(group, { count: 80, color: '#ece6d8', radius: 0.3, y: 0.24, size: 0.035, seed: 9, squash: 0.56 });
  scatter(group, { count: 20, color: '#d9d0bc', radius: 0.28, y: 0.3, size: 0.025, seed: 10, squash: 0.5 });
  return group;
}

function createButter() {
  const group = new THREE.Group();
  const paper = roundedBox(0.78, 0.025, 0.55, 0.02, '#eadfc9', { roughness: 0.9 });
  place(paper, 0, 0.025, 0, 0, 0.15, 0);
  group.add(paper);
  const block = roundedBox(0.58, 0.3, 0.38, 0.05, '#edd078', { roughness: 0.44 });
  place(block, 0, 0.2, 0, 0, 0.15, 0);
  group.add(block);
  group.add(place(mesh(new THREE.BoxGeometry(0.44, 0.005, 0.015), '#c6a74e'), 0, 0.353, 0.03, 0, 0.15, 0));
  return group;
}

function createScallions() {
  const group = new THREE.Group();
  const random = seededRandom(43);
  for (let index = 0; index < 5; index += 1) {
    const stalk = mesh(new THREE.CylinderGeometry(0.025, 0.033, 0.74, 8), '#e6e4ce', { roughness: 0.72 });
    place(stalk, -0.26 + index * 0.13, 0.37, (random() - 0.5) * 0.2, (random() - 0.5) * 0.13, random() * 0.8, 1.45 + (random() - 0.5) * 0.1);
    group.add(stalk);
    const greenTip = mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.27, 8), index % 2 ? '#5b8c47' : '#6b9c56', { roughness: 0.7 });
    place(greenTip, -0.26 + index * 0.13 + 0.31, 0.54, (random() - 0.5) * 0.2, 0, random() * 0.8, 1.45);
    group.add(greenTip);
  }
  const band = mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 24), '#b39a71');
  place(band, 0.02, 0.36, 0, Math.PI / 2, 0, 0.25);
  group.add(band);
  return group;
}

function createSesame() {
  const group = new THREE.Group();
  group.add(prepBowl('#eee5d7', 0.32));
  scatter(group, { count: 55, color: '#5d5140', radius: 0.2, y: 0.24, size: 0.023, seed: 55, squash: 0.38 });
  return group;
}

function createSweetPotato() {
  const group = new THREE.Group();
  const random = seededRandom(47);
  for (let index = 0; index < 2; index += 1) {
    const potato = mesh(new THREE.CapsuleGeometry(0.2, 0.48, 6, 14), index ? '#d8763b' : '#d47b41', { roughness: 0.76 });
    potato.scale.set(0.9, 1, 0.85);
    place(potato, -0.15 + index * 0.36, 0.25, -0.1 + index * 0.23, 0, 0.1 + random() * 0.4, Math.PI / 2 + (random() - 0.5) * 0.5);
    group.add(potato);
    for (let spot = 0; spot < 3; spot += 1) {
      const mark = mesh(new THREE.SphereGeometry(0.018, 6, 5), '#b55e30');
      place(mark, -0.25 + index * 0.36 + spot * 0.17, 0.37, -0.1 + index * 0.23 + (random() - 0.5) * 0.1);
      group.add(mark);
    }
  }
  return group;
}

function createCoconut() {
  const group = new THREE.Group();
  group.add(place(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.55, 24), '#ddd7c8', { roughness: 0.32, metalness: 0.55 }), 0, 0.29, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.38, 24, 1, true), '#e9dfc9', { side: THREE.DoubleSide }), 0, 0.29, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.025, 24), '#a7a196', { roughness: 0.3, metalness: 0.7 }), 0, 0.57, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 24), '#a7a196', { roughness: 0.3, metalness: 0.7 }), 0, 0.018, 0));
  const band = mesh(new THREE.CylinderGeometry(0.257, 0.257, 0.09, 24, 1, true), '#677a5f', { side: THREE.DoubleSide });
  place(band, 0, 0.34, 0);
  group.add(band);
  return group;
}

function createSpinach() {
  const group = new THREE.Group();
  group.add(prepBowl('#ebe2d4', 0.48));
  const random = seededRandom(51);
  for (let index = 0; index < 13; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = random() * 0.3;
    const spinachLeaf = leaf(index % 3 ? '#47734d' : '#5f865b', 0.35 + random() * 0.2, -Math.PI / 2 + (random() - 0.5) * 0.55, angle, (random() - 0.5) * 0.35);
    spinachLeaf.position.set(Math.cos(angle) * distance, 0.26 + random() * 0.15, Math.sin(angle) * distance);
    group.add(spinachLeaf);
  }
  return group;
}

function createChicken() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f2e7d8', 0.57));
  const random = seededRandom(57);
  for (let index = 0; index < 2; index += 1) {
    const piece = roundedBox(0.56, 0.2, 0.4, 0.1, index ? '#b8753d' : '#c48347', { roughness: 0.64 });
    place(piece, -0.16 + index * 0.32, 0.24, -0.12 + index * 0.2, 0.04, -0.52 + index * 0.9, 0.02);
    group.add(piece);
    const skin = roundedBox(0.48, 0.055, 0.33, 0.04, '#d29455', { roughness: 0.55 });
    place(skin, -0.16 + index * 0.32, 0.36, -0.12 + index * 0.2, 0.04, -0.52 + index * 0.9, 0.02);
    group.add(skin);
    for (let herb = 0; herb < 2; herb += 1) {
      const sprig = mesh(new THREE.CapsuleGeometry(0.008, 0.11, 2, 5), '#5d7047');
      place(sprig, -0.22 + index * 0.32 + random() * 0.3, 0.41, -0.08 + index * 0.2, 0.2, random(), 1.2);
      group.add(sprig);
    }
  }
  return group;
}

function createPotatoes() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f3e8da', 0.56));
  const random = seededRandom(61);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + random() * 0.4;
    const distance = 0.1 + random() * 0.22;
    const potato = mesh(new THREE.SphereGeometry(0.15, 14, 11), index % 3 ? '#c9a05d' : '#b78c50', { roughness: 0.82 });
    potato.scale.set(1.2, 0.82, 1);
    place(potato, Math.cos(angle) * distance, 0.15 + random() * 0.12, Math.sin(angle) * distance, 0, random() * 2, random());
    group.add(potato);
  }
  return group;
}

function createThyme() {
  const group = new THREE.Group();
  const random = seededRandom(67);
  for (let stemIndex = 0; stemIndex < 5; stemIndex += 1) {
    const angle = (stemIndex / 5) * Math.PI * 2;
    const stem = new THREE.Group();
    const line = mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.6, 5), '#6d7542');
    place(line, 0, 0.3, 0, 0, 0, 0.85);
    stem.add(line);
    for (let leafIndex = 0; leafIndex < 6; leafIndex += 1) {
      const tiny = leaf(leafIndex % 2 ? '#708554' : '#82986b', 0.095, -Math.PI / 2 + 0.2, random() * Math.PI, 0);
      tiny.position.set(-0.18 + leafIndex * 0.06, 0.13 + leafIndex * 0.075, 0);
      stem.add(tiny);
    }
    place(stem, Math.cos(angle) * 0.2, 0.04, Math.sin(angle) * 0.2, 0, angle, 0);
    group.add(stem);
  }
  return group;
}

function createBeef() {
  const group = new THREE.Group();
  group.add(prepBowl('#eee3d3', 0.48));
  const random = seededRandom(71);
  for (let index = 0; index < 18; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 0.27;
    const chunk = roundedBox(0.1 + random() * 0.08, 0.07 + random() * 0.04, 0.08 + random() * 0.06, 0.025, index % 4 ? '#8c4d34' : '#a55a3c', { roughness: 0.82 });
    place(chunk, Math.cos(angle) * distance, 0.27 + random() * 0.09, Math.sin(angle) * distance, random() * 1.5, random() * 2, random() * 1.5);
    group.add(chunk);
  }
  return group;
}

function createCucumber() {
  const group = new THREE.Group();
  const random = seededRandom(73);
  for (let index = 0; index < 2; index += 1) {
    const cuke = mesh(new THREE.CapsuleGeometry(0.12, 0.46, 5, 12), index ? '#6a9251' : '#759e59', { roughness: 0.68 });
    place(cuke, -0.14 + index * 0.25, 0.15, -0.05 + index * 0.14, Math.PI / 2, 0.1 + random(), 0);
    group.add(cuke);
  }
  for (let index = 0; index < 3; index += 1) {
    const slice = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 18), '#a9c37e', { roughness: 0.66 });
    place(slice, 0.16 + index * 0.11, 0.06 + index * 0.035, 0.22 + index * 0.04, 0, 0, 0.1);
    group.add(slice);
    group.add(place(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.037, 16), '#d5e0aa'), 0.16 + index * 0.11, 0.079 + index * 0.035, 0.22 + index * 0.04, 0, 0, 0.1));
  }
  return group;
}

function createFarro() {
  const group = new THREE.Group();
  group.add(prepBowl('#eee2d2', 0.47));
  scatter(group, { count: 62, color: '#b39b70', radius: 0.29, y: 0.24, size: 0.042, seed: 77, squash: 0.55 });
  scatter(group, { count: 22, color: '#89724f', radius: 0.27, y: 0.29, size: 0.03, seed: 78, squash: 0.52 });
  return group;
}

function createAvocado() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f3e8d9', 0.54));
  for (let index = 0; index < 2; index += 1) {
    const half = new THREE.Group();
    const skin = mesh(new THREE.SphereGeometry(0.28, 22, 16), '#4c703c', { roughness: 0.8 });
    skin.scale.set(1, 0.76, 0.62);
    half.add(place(skin, 0, 0.18, 0));
    const flesh = mesh(new THREE.CylinderGeometry(0.205, 0.22, 0.02, 20), '#b8cd72', { roughness: 0.7 });
    half.add(place(flesh, 0, 0.36, 0));
    const inner = mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.022, 20), '#d8dfa0', { roughness: 0.65 });
    half.add(place(inner, 0, 0.374, 0));
    const pit = mesh(new THREE.SphereGeometry(0.07, 12, 10), '#86603c', { roughness: 0.85 });
    half.add(place(pit, 0.03, 0.42, 0));
    place(half, -0.18 + index * 0.36, 0, -0.12 + index * 0.2, 0, index * 1.5, 0.05);
    group.add(half);
  }
  return group;
}

function createFeta() {
  const group = new THREE.Group();
  group.add(ceramicPlate('#f3e9dc', 0.5));
  const random = seededRandom(83);
  for (let index = 0; index < 5; index += 1) {
    const cube = roundedBox(0.18 + random() * 0.08, 0.14 + random() * 0.06, 0.16 + random() * 0.07, 0.02, index % 3 ? '#f3ecdf' : '#e9e0d0', { roughness: 0.85 });
    place(cube, (random() - 0.5) * 0.42, 0.13 + random() * 0.15, (random() - 0.5) * 0.3, random() * 0.3, random() * 2, random() * 0.3);
    group.add(cube);
  }
  return group;
}

function createBread() {
  const group = new THREE.Group();
  const random = seededRandom(89);
  for (let index = 0; index < 3; index += 1) {
    const crust = roundedBox(0.68, 0.13, 0.62, 0.06, '#b97f43', { roughness: 0.82 });
    place(crust, -0.1 + index * 0.12, 0.1 + index * 0.13, 0.02, 0, -0.35 + index * 0.35, 0.02);
    group.add(crust);
    const crumb = roundedBox(0.58, 0.07, 0.52, 0.03, '#efdab2', { roughness: 0.8 });
    place(crumb, -0.1 + index * 0.12, 0.15 + index * 0.13, 0.02, 0, -0.35 + index * 0.35, 0.02);
    group.add(crumb);
    for (let score = 0; score < 3; score += 1) {
      const line = mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), '#d1ae76');
      place(line, -0.1 + index * 0.12, 0.188 + index * 0.13, -0.14 + score * 0.13, 0, -0.35 + index * 0.35, -0.2);
      group.add(line);
    }
    if (index === 2) {
      const herb = mesh(new THREE.CapsuleGeometry(0.007, 0.09, 2, 5), '#64804b');
      place(herb, 0.14, 0.43, 0.12, 0.4, random(), 1);
      group.add(herb);
    }
  }
  return group;
}

function createMushroom() {
  const group = new THREE.Group();
  const random = seededRandom(97);
  for (let index = 0; index < 4; index += 1) {
    const stem = mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.22, 10), '#e4d8c1', { roughness: 0.8 });
    place(stem, -0.28 + index * 0.18, 0.12, 0.08 - index * 0.06, (random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2);
    group.add(stem);
    const cap = mesh(new THREE.SphereGeometry(0.16, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), index % 2 ? '#9e8065' : '#8a6d54', { roughness: 0.78 });
    cap.scale.set(1, 0.55, 1);
    place(cap, -0.28 + index * 0.18, 0.24, 0.08 - index * 0.06, (random() - 0.5) * 0.25, random() * 2, (random() - 0.5) * 0.25);
    group.add(cap);
    for (let line = 0; line < 3; line += 1) {
      const gill = mesh(new THREE.BoxGeometry(0.012, 0.01, 0.18), '#d6c3a8');
      place(gill, -0.28 + index * 0.18 + (line - 1) * 0.05, 0.237, 0.08 - index * 0.06, 0, random(), 0);
      group.add(gill);
    }
  }
  return group;
}

function createRicotta() {
  const group = new THREE.Group();
  group.add(place(mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.34, 24), '#f4eee1', { roughness: 0.55 }), 0, 0.19, 0));
  group.add(place(mesh(new THREE.CylinderGeometry(0.292, 0.292, 0.055, 24), '#d8ceba', { roughness: 0.55 }), 0, 0.38, 0));
  const stripe = mesh(new THREE.CylinderGeometry(0.292, 0.292, 0.08, 24, 1, true), '#9e9b69', { side: THREE.DoubleSide });
  place(stripe, 0, 0.22, 0);
  group.add(stripe);
  return group;
}

function createMiso() {
  const group = new THREE.Group();
  group.add(createJar({ jarColor: '#b9854c' }));
  return group;
}

function createCurry() {
  const group = new THREE.Group();
  group.add(createJar({ jarColor: '#b6402b' }));
  return group;
}

function createModel(ingredient) {
  switch (ingredient.model) {
    case 'tomato': return createTomato();
    case 'pasta': return createPasta();
    case 'garlic': return createGarlic();
    case 'basil': return createBasil();
    case 'cheese': return createCheese();
    case 'oil': return createOil(ingredient);
    case 'chickpea': return createChickpeas();
    case 'tortilla': return createTortillas();
    case 'cabbage': return createCabbage();
    case 'lime':
    case 'lemon': return citrus(ingredient);
    case 'yogurt': return createYogurt();
    case 'spice': return createSpice(ingredient);
    case 'jar': return createJar(ingredient);
    case 'salmon': return createSalmon();
    case 'bokchoy': return createBokChoy();
    case 'rice': return createRice();
    case 'miso': return createMiso();
    case 'butter': return createButter();
    case 'scallion': return createScallions();
    case 'sesame': return createSesame();
    case 'sweetpotato': return createSweetPotato();
    case 'coconut': return createCoconut();
    case 'spinach': return createSpinach();
    case 'curry': return createCurry();
    case 'chicken': return createChicken();
    case 'potato': return createPotatoes();
    case 'thyme': return createThyme();
    case 'beef': return createBeef();
    case 'cucumber': return createCucumber();
    case 'farro': return createFarro();
    case 'avocado': return createAvocado();
    case 'feta': return createFeta();
    case 'bread': return createBread();
    case 'mushroom': return createMushroom();
    case 'ricotta': return createRicotta();
    default: return createSpice(ingredient);
  }
}

function getLayout(count) {
  if (count <= 5) {
    const spacing = 1.4;
    return Array.from({ length: count }, (_, index) => ({
      x: (index - (count - 1) / 2) * spacing,
      z: index % 2 ? 0.38 : -0.3,
      rotation: (index % 2 ? 1 : -1) * 0.13
    }));
  }
  if (count === 6) {
    return [
      { x: -1.85, z: -0.62, rotation: -0.12 },
      { x: 0, z: -0.68, rotation: 0.08 },
      { x: 1.85, z: -0.58, rotation: 0.14 },
      { x: -1.55, z: 0.72, rotation: 0.07 },
      { x: 0.1, z: 0.75, rotation: -0.15 },
      { x: 1.7, z: 0.67, rotation: 0.1 }
    ];
  }
  return [
    { x: -2.34, z: -0.67, rotation: -0.1 },
    { x: -0.78, z: -0.72, rotation: 0.08 },
    { x: 0.78, z: -0.69, rotation: -0.12 },
    { x: 2.33, z: -0.58, rotation: 0.1 },
    { x: -1.58, z: 0.73, rotation: 0.06 },
    { x: 0.05, z: 0.78, rotation: -0.13 },
    { x: 1.66, z: 0.71, rotation: 0.08 }
  ];
}

function disposeGroup(group) {
  group.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
  });
  group.clear();
}

export class KitchenScene {
  constructor(container, onIngredientSelect) {
    this.container = container;
    this.onIngredientSelect = onIngredientSelect;
    this.items = new Map();
    this.selectedId = null;
    this.recipe = null;
    this.failed = false;
    this.destroyed = false;
    this.mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      this.failed = true;
      container.classList.add('is-unavailable');
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
    this.camera.position.set(6.7, 7.1, 9.7);
    this.camera.lookAt(0, 0.35, 0);

    this.ingredientGroup = new THREE.Group();
    this.scene.add(this.ingredientGroup);

    this.addEnvironment();
    this.addLights();
    this.addInteraction();
    this.addControls();
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.animationTime = 0;
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  addEnvironment() {
    const wall = mesh(new THREE.PlaneGeometry(18, 10), '#eadfce', { roughness: 1 });
    wall.receiveShadow = true;
    place(wall, 0, 3.4, -3.1);
    this.scene.add(wall);

    const backsplash = mesh(new THREE.PlaneGeometry(9.5, 2.2), '#e5d7c3', { roughness: 0.86 });
    backsplash.receiveShadow = true;
    place(backsplash, 0, 1.38, -2.88);
    this.scene.add(backsplash);

    for (let index = 0; index < 8; index += 1) {
      const seam = mesh(new THREE.BoxGeometry(0.008, 2.15, 0.008), '#ccbca7');
      place(seam, -3.35 + index * 0.95, 1.38, -2.86);
      seam.castShadow = false;
      this.scene.add(seam);
    }

    const counter = roundedBox(8.7, 0.58, 5.5, 0.16, '#dfd0bb', { roughness: 0.72 });
    place(counter, 0, -0.31, 0);
    counter.receiveShadow = true;
    this.scene.add(counter);

    const countertop = roundedBox(8.82, 0.14, 5.6, 0.07, '#eee2d0', { roughness: 0.55 });
    place(countertop, 0, 0.01, 0);
    countertop.receiveShadow = true;
    this.scene.add(countertop);

    const board = roundedBox(7.15, 0.15, 3.72, 0.11, '#bc8254', { roughness: 0.66 });
    place(board, 0, 0.105, -0.05);
    board.receiveShadow = true;
    this.scene.add(board);

    for (let index = 0; index < 7; index += 1) {
      const grain = mesh(new THREE.BoxGeometry(6.75, 0.004, 0.009), index % 2 ? '#a66f45' : '#cd9667', { roughness: 0.85 });
      place(grain, 0, 0.184, -1.55 + index * 0.51, 0, (index % 3 - 1) * 0.01, 0);
      grain.castShadow = false;
      this.scene.add(grain);
    }

    const handle = mesh(new THREE.TorusGeometry(0.15, 0.035, 10, 28), '#9e673e', { roughness: 0.7 });
    place(handle, 2.85, 0.1, 1.2, Math.PI / 2, 0, 0);
    this.scene.add(handle);

    const towel = roundedBox(2.5, 0.025, 0.9, 0.04, '#e9dfcd', { roughness: 0.94 });
    place(towel, -2.25, 0.245, 1.82, 0, 0.06, 0);
    towel.receiveShadow = true;
    this.scene.add(towel);

    for (let index = 0; index < 5; index += 1) {
      const stripe = mesh(new THREE.BoxGeometry(2.28, 0.005, 0.045), '#c9bda8');
      place(stripe, -2.25, 0.26, 1.52 + index * 0.15, 0, 0.06, 0);
      stripe.castShadow = false;
      this.scene.add(stripe);
    }

    const saltCellar = new THREE.Group();
    saltCellar.add(place(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.25, 20), '#e7d9c4', { roughness: 0.6 }), 0, 0.13, 0));
    saltCellar.add(place(mesh(new THREE.SphereGeometry(0.16, 16, 10), '#f2ece0', { roughness: 0.8 }), 0, 0.28, 0));
    place(saltCellar, 3.3, 0.17, -1.78, 0, 0.2, 0);
    this.scene.add(saltCellar);
  }

  addLights() {
    const hemisphere = new THREE.HemisphereLight('#fff7e9', '#86715b', 1.25);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight('#fff4dd', 3.1);
    key.position.set(-4.2, 8.6, 6.1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.018;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight('#ffd9b2', 1.0);
    fill.position.set(5, 3, 4.5);
    this.scene.add(fill);

    const rim = new THREE.PointLight('#f8d9a5', 8, 10, 2);
    rim.position.set(-3, 3.3, -1.5);
    this.scene.add(rim);

    const windowGlow = new THREE.DirectionalLight('#fff9ed', 1.2);
    windowGlow.position.set(2, 5, -3);
    this.scene.add(windowGlow);
  }

  addControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.enablePan = false;
    this.controls.enableZoom = !this.mobile;
    this.controls.enableRotate = !this.mobile;
    this.controls.enabled = !this.mobile;
    this.controls.minPolarAngle = 0.78;
    this.controls.maxPolarAngle = 1.25;
    this.controls.minAzimuthAngle = -0.48;
    this.controls.maxAzimuthAngle = 0.42;
    this.controls.target.set(0, 0.42, 0);
    this.controls.update();
  }

  addInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerStart = null;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', (event) => {
      if (!this.pointerStart) return;
      const moved = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
      this.pointerStart = null;
      if (moved > 7) return;
      const ingredientId = this.pick(event);
      if (ingredientId) this.onIngredientSelect?.(ingredientId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const ingredientId = this.pick(event);
      canvas.style.cursor = ingredientId ? 'pointer' : (this.mobile ? 'default' : 'grab');
    });
    canvas.addEventListener('pointerleave', () => {
      canvas.style.cursor = this.mobile ? 'default' : 'grab';
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.ingredientGroup.children, true);
    if (!intersects.length) return null;
    let object = intersects[0].object;
    while (object && !object.userData.ingredientId) object = object.parent;
    return object?.userData.ingredientId || null;
  }

  setRecipe(recipe) {
    if (this.failed || this.destroyed) return;
    this.recipe = recipe;
    this.selectedId = null;
    this.items.clear();
    disposeGroup(this.ingredientGroup);

    const layout = getLayout(recipe.ingredients.length);
    recipe.ingredients.forEach((ingredient, index) => {
      const item = new THREE.Group();
      const model = createModel(ingredient);
      item.add(model);
      item.userData.ingredientId = ingredient.id;
      item.position.set(layout[index].x, 0.19, layout[index].z);
      item.rotation.y = layout[index].rotation;
      item.userData.baseY = 0.19;
      item.userData.targetY = 0.19;
      item.traverse((object) => {
        if (object.isMesh) {
          object.userData.ingredientId = ingredient.id;
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(recipe.accent),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.53, 40), ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      ring.userData.ingredientId = ingredient.id;
      item.add(ring);

      this.ingredientGroup.add(item);
      this.items.set(ingredient.id, { group: item, ring, ringMaterial, phase: index * 0.93 });
    });
  }

  setSelected(ingredientId) {
    this.selectedId = ingredientId;
    for (const [id, item] of this.items) {
      const isSelected = id === ingredientId;
      item.group.userData.targetY = item.group.userData.baseY + (isSelected ? 0.09 : 0);
      item.ringMaterial.opacity = isSelected ? 0.75 : 0;
    }
  }

  resize() {
    if (this.failed || this.destroyed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewHeight = aspect < 1.25 ? 6.7 : 6.15;
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  tick(time) {
    if (this.failed || this.destroyed) return;
    const seconds = time / 1000;
    this.animationTime = seconds;

    for (const item of this.items.values()) {
      const group = item.group;
      group.position.y += (group.userData.targetY - group.position.y) * 0.12;
      if (group.userData.ingredientId === this.selectedId) {
        item.ring.rotation.z = seconds * 0.55;
        item.ring.scale.setScalar(1 + Math.sin(seconds * 2.3) * 0.035);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.destroyed = true;
    if (this.failed) return;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer.dispose();
  }
}
