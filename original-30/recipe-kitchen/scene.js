import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BOARD_Y = 0.16;
const CREAM = '#f4eddd';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.68,
    metalness: options.metalness ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    flatShading: options.flatShading ?? false
  });
}

function addMesh(parent, geometry, meshMaterial, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, radius, color, position, scale = [1, 1, 1], options = {}) {
  return addMesh(
    parent,
    new THREE.SphereGeometry(radius, options.segments ?? 20, options.segments ?? 16),
    material(color, options),
    position,
    [0, 0, 0],
    scale
  );
}

function cylinder(parent, radiusTop, radiusBottom, height, color, position, rotation = [0, 0, 0], options = {}) {
  return addMesh(
    parent,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 20),
    material(color, options),
    position,
    rotation
  );
}

function randomizer(seed) {
  let value = Math.abs(Math.sin(seed * 128.913) * 43758.5453) % 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function makeBowl(color = CREAM, contents = null, contentsColor = '#d9b66d') {
  const group = new THREE.Group();
  cylinder(group, 0.35, 0.25, 0.22, color, [0, 0.14, 0], [0, 0, 0], { roughness: 0.52, segments: 28 });
  const rim = addMesh(
    group,
    new THREE.TorusGeometry(0.35, 0.035, 8, 32),
    material(color, { roughness: 0.52 }),
    [0, 0.25, 0],
    [Math.PI / 2, 0, 0]
  );
  rim.castShadow = true;
  if (contents) {
    if (contents === 'noodles') {
      for (let index = 0; index < 6; index += 1) {
        const noodle = addMesh(
          group,
          new THREE.TorusGeometry(0.22, 0.022, 7, 24, Math.PI * (1.1 + (index % 3) * 0.2)),
          material(contentsColor, { roughness: 0.75 }),
          [Math.sin(index) * 0.045, 0.27 + index * 0.022, Math.cos(index) * 0.035],
          [Math.PI / 2 + (index % 2) * 0.18, index * 0.8, 0]
        );
        noodle.scale.set(1, 0.75, 1.1);
      }
    } else if (contents === 'mound') {
      sphere(group, 0.27, contentsColor, [0, 0.28, 0], [1.05, 0.48, 1], { roughness: 0.92 });
    } else if (contents === 'pieces') {
      const rand = randomizer(contentsColor.length + 4);
      for (let index = 0; index < 15; index += 1) {
        sphere(
          group,
          0.055,
          contentsColor,
          [(rand() - 0.5) * 0.43, 0.28 + rand() * 0.08, (rand() - 0.5) * 0.43],
          [1, 0.75, 1],
          { roughness: 0.95, segments: 10 }
        );
      }
    } else if (contents === 'leaves') {
      for (let index = 0; index < 8; index += 1) {
        sphere(
          group,
          0.11,
          contentsColor,
          [Math.cos(index * 2.3) * 0.2, 0.28 + (index % 3) * 0.045, Math.sin(index * 2.3) * 0.2],
          [1.2, 0.25, 0.65],
          { roughness: 0.9, segments: 12 }
        ).rotation.y = index * 0.7;
      }
    } else {
      cylinder(group, 0.31, 0.31, 0.035, contentsColor, [0, 0.255, 0], [0, 0, 0], { roughness: 0.9 });
    }
  }
  return group;
}

function makeLemon(color, index, withLeaves = true) {
  const group = new THREE.Group();
  const rand = randomizer(index + 11);
  sphere(group, 0.25, color, [0, 0.27, 0], [1.3, 0.85, 0.88], { roughness: 0.63 });
  sphere(group, 0.7, color, [0.29, 0.27, 0], [0.055, 0.15, 0.12], { roughness: 0.63 });
  sphere(group, 0.7, color, [-0.29, 0.27, 0], [0.055, 0.15, 0.12], { roughness: 0.63 });
  if (withLeaves) {
    const leaf = sphere(group, 0.14, '#5d8748', [0.16, 0.45, 0.03], [1.15, 0.18, 0.55], { roughness: 0.8 });
    leaf.rotation.z = -0.38;
    leaf.rotation.y = rand() * 0.3;
    const leafTwo = sphere(group, 0.11, '#6e9a54', [-0.12, 0.43, -0.05], [1.1, 0.16, 0.5], { roughness: 0.8 });
    leafTwo.rotation.z = 0.4;
    cylinder(group, 0.025, 0.035, 0.12, '#725137', [0, 0.44, 0], [0, 0, 0.1], { segments: 8 });
  }
  return group;
}

function makeTomato(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 30);
  sphere(group, 0.25, color, [0, 0.25, 0], [1, 0.9, 1], { roughness: 0.53 });
  for (let index = 0; index < 5; index += 1) {
    const leaf = sphere(
      group,
      0.11,
      '#4c7840',
      [Math.cos((index / 5) * Math.PI * 2) * 0.1, 0.43, Math.sin((index / 5) * Math.PI * 2) * 0.1],
      [0.85, 0.12, 0.32],
      { roughness: 0.85, segments: 10 }
    );
    leaf.rotation.y = (index / 5) * Math.PI * 2 + rand() * 0.15;
  }
  cylinder(group, 0.018, 0.03, 0.12, '#5a7b3d', [0, 0.49, 0], [0, 0, 0], { segments: 7 });
  return group;
}

function makeProtein(ingredient, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 38);
  const lower = addMesh(
    group,
    new RoundedBoxGeometry(0.92, 0.17, 0.48, 3, 0.07),
    material(ingredient.color, { roughness: 0.58 }),
    [0, 0.17, 0],
    [0, -0.14, -0.04]
  );
  lower.scale.z = 1;
  const upper = addMesh(
    group,
    new RoundedBoxGeometry(0.82, 0.16, 0.42, 3, 0.07),
    material(ingredient.color, { roughness: 0.58 }),
    [0.03, 0.31, -0.025],
    [0.02, 0.19 + rand() * 0.1, 0.025]
  );
  if (ingredient.name.toLowerCase().includes('salmon')) {
    for (let index = 0; index < 4; index += 1) {
      addMesh(
        group,
        new THREE.BoxGeometry(0.035, 0.012, 0.31),
        material('#f4d8bc', { roughness: 0.75 }),
        [-0.27 + index * 0.17, 0.397, 0],
        [0, 0.19, 0]
      );
    }
  } else if (ingredient.name.toLowerCase().includes('beef')) {
    for (let index = 0; index < 3; index += 1) {
      addMesh(
        group,
        new THREE.BoxGeometry(0.62, 0.012, 0.04),
        material('#6d372c', { roughness: 0.65 }),
        [0.04, 0.4, -0.1 + index * 0.1],
        [0, 0.2, 0]
      );
    }
  } else if (ingredient.name.toLowerCase().includes('chicken')) {
    sphere(group, 0.15, '#e6b17f', [0.35, 0.2, 0.08], [0.8, 0.32, 0.55], { roughness: 0.65 });
  }
  return group;
}

function makeGarlic(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 45);
  sphere(group, 0.19, color, [0, 0.22, 0], [1, 1.15, 0.92], { roughness: 0.82 });
  for (let index = 0; index < 3; index += 1) {
    sphere(
      group,
      0.1,
      color,
      [Math.cos((index / 3) * Math.PI * 2) * 0.14, 0.14, Math.sin((index / 3) * Math.PI * 2) * 0.12],
      [0.75, 1.5, 0.7],
      { roughness: 0.82, segments: 12 }
    ).rotation.z = Math.cos(index) * 0.25 + rand() * 0.05;
  }
  addMesh(
    group,
    new THREE.ConeGeometry(0.04, 0.16, 8),
    material('#c9bd9e', { roughness: 0.9 }),
    [0, 0.46, 0],
    [0, 0, 0.08]
  );
  return group;
}

function makeHerb(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 58);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const stem = cylinder(
      group,
      0.012,
      0.014,
      0.44 + rand() * 0.16,
      '#597343',
      [Math.cos(angle) * 0.07, 0.26, Math.sin(angle) * 0.06],
      [Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12],
      { roughness: 0.9, segments: 6 }
    );
    stem.castShadow = true;
    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const leaf = sphere(
        group,
        0.075,
        index % 3 === 0 ? '#71954e' : color,
        [Math.cos(angle) * (0.11 + leafIndex * 0.03), 0.33 + leafIndex * 0.11, Math.sin(angle) * (0.1 + leafIndex * 0.025)],
        [1.25, 0.21, 0.5],
        { roughness: 0.9, segments: 10 }
      );
      leaf.rotation.y = angle + leafIndex * 0.65;
      leaf.rotation.z = 0.2 - leafIndex * 0.12;
    }
  }
  addMesh(group, new THREE.TorusGeometry(0.115, 0.018, 6, 20), material('#ba9257'), [0, 0.14, 0], [Math.PI / 2, 0, 0]);
  return group;
}

function makeBottle(color, index) {
  const group = new THREE.Group();
  const glass = material(color, { roughness: 0.26, transparent: true, opacity: 0.88 });
  cylinder(group, 0.145, 0.16, 0.53, color, [0, 0.29, 0], [0, 0, 0], { roughness: 0.3, transparent: true, opacity: 0.9, segments: 24 });
  cylinder(group, 0.055, 0.09, 0.16, color, [0, 0.63, 0], [0, 0, 0], { roughness: 0.3, transparent: true, opacity: 0.9, segments: 18 });
  cylinder(group, 0.065, 0.065, 0.08, '#634b32', [0, 0.75, 0], [0, 0, 0], { roughness: 0.9, segments: 16 });
  addMesh(
    group,
    new THREE.CylinderGeometry(0.148, 0.148, 0.19, 24, 1, true),
    material('#f1e5c8', { roughness: 0.9, side: THREE.DoubleSide }),
    [0, 0.32, 0]
  );
  addMesh(group, new THREE.TorusGeometry(0.152, 0.012, 6, 24), material('#69513a'), [0, 0.23, 0], [Math.PI / 2, 0, 0]);
  addMesh(group, new THREE.TorusGeometry(0.152, 0.012, 6, 24), material('#69513a'), [0, 0.42, 0], [Math.PI / 2, 0, 0]);
  void glass;
  void index;
  return group;
}

function makeLong(ingredient, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 66);
  for (let index = 0; index < 7; index += 1) {
    const x = (index - 3) * 0.072;
    const length = 0.68 + rand() * 0.18;
    const stalk = cylinder(
      group,
      0.026,
      0.033,
      length,
      ingredient.color,
      [x, 0.3, (rand() - 0.5) * 0.08],
      [0.12, 0, (index - 3) * 0.035],
      { roughness: 0.78, segments: 8 }
    );
    stalk.rotation.x = 0.16;
    addMesh(
      group,
      new THREE.ConeGeometry(0.04, 0.18, 8),
      material(ingredient.name.toLowerCase().includes('celery') ? '#88a56b' : ingredient.color, { roughness: 0.8 }),
      [x, 0.71, 0.05],
      [0.16, 0, (index - 3) * 0.035]
    );
  }
  addMesh(group, new THREE.TorusGeometry(0.23, 0.025, 6, 24), material('#d2b07a'), [0, 0.18, 0.02], [Math.PI / 2, 0.1, 0]);
  return group;
}

function makeSeasoning(color, index) {
  const group = new THREE.Group();
  const bowlColor = index % 2 === 0 ? '#e7ddc8' : '#cdb18b';
  cylinder(group, 0.28, 0.22, 0.12, bowlColor, [0, 0.12, 0], [0, 0, 0], { roughness: 0.62, segments: 24 });
  cylinder(group, 0.235, 0.235, 0.022, color, [0, 0.185, 0], [0, 0, 0], { roughness: 0.96 });
  addMesh(group, new THREE.TorusGeometry(0.28, 0.025, 6, 26), material(bowlColor), [0, 0.18, 0], [Math.PI / 2, 0, 0]);
  const rand = randomizer(30 + index);
  for (let index = 0; index < 11; index += 1) {
    sphere(
      group,
      0.015,
      color === '#f4eee0' ? '#d8d0bd' : color,
      [(rand() - 0.5) * 0.35, 0.205, (rand() - 0.5) * 0.35],
      [1, 0.55, 1],
      { segments: 7, roughness: 1 }
    );
  }
  return group;
}

function makeMushroom(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 72);
  for (let index = 0; index < 4; index += 1) {
    const x = [-0.22, 0.1, 0.26, -0.02][index];
    const z = [0.04, -0.08, 0.1, 0.18][index];
    const height = 0.23 + rand() * 0.12;
    cylinder(group, 0.06, 0.075, height, '#ead6b8', [x, 0.17 + height / 2, z], [0, 0, (rand() - 0.5) * 0.2], { roughness: 0.9, segments: 10 });
    sphere(
      group,
      0.17,
      index % 2 === 0 ? color : '#ab7b54',
      [x, 0.3 + height, z],
      [1.15, 0.48, 1.05],
      { roughness: 0.72, segments: 16 }
    );
  }
  return group;
}

function makeJar(color, index) {
  const group = new THREE.Group();
  cylinder(group, 0.21, 0.22, 0.48, '#b4b39a', [0, 0.28, 0], [0, 0, 0], { roughness: 0.3, transparent: true, opacity: 0.74, segments: 24 });
  cylinder(group, 0.18, 0.19, 0.34, color, [0, 0.26, 0], [0, 0, 0], { roughness: 0.9, segments: 24 });
  addMesh(
    group,
    new THREE.CylinderGeometry(0.205, 0.205, 0.16, 24, 1, true),
    material('#f4e7c9', { side: THREE.DoubleSide, roughness: 0.92 }),
    [0, 0.28, 0]
  );
  cylinder(group, 0.22, 0.22, 0.07, index % 2 === 0 ? '#a65d42' : '#627c72', [0, 0.55, 0], [0, 0, 0], { roughness: 0.55, segments: 24 });
  return group;
}

function makeButter(color, index) {
  const group = new THREE.Group();
  addMesh(group, new RoundedBoxGeometry(0.62, 0.1, 0.48, 2, 0.025), material('#eee2c7', { roughness: 0.92 }), [0, 0.16, 0], [0, 0.05, 0]);
  addMesh(group, new RoundedBoxGeometry(0.52, 0.18, 0.37, 3, 0.035), material(color, { roughness: 0.56 }), [0.02, 0.29, 0], [0, -0.08, 0]);
  addMesh(group, new THREE.BoxGeometry(0.53, 0.035, 0.12), material('#f7f0df', { roughness: 0.8 }), [0.02, 0.31, 0.02], [0, -0.08, 0]);
  void index;
  return group;
}

function makeScallion(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 84);
  for (let index = 0; index < 6; index += 1) {
    const x = (index - 2.5) * 0.055;
    cylinder(group, 0.023, 0.028, 0.5, '#e7e0c8', [x, 0.3, 0], [0.08, 0, (index - 2.5) * 0.045], { roughness: 0.86, segments: 8 });
    cylinder(group, 0.019, 0.025, 0.36, color, [x + 0.02, 0.71, 0.04], [0.15, 0, (index - 2.5) * 0.075], { roughness: 0.82, segments: 8 });
    sphere(group, 0.045, '#6c9b50', [x + 0.04, 0.88 + rand() * 0.04, 0.07], [0.7, 1.45, 0.6], { roughness: 0.9, segments: 9 });
  }
  addMesh(group, new THREE.TorusGeometry(0.15, 0.022, 6, 22), material('#c9aa76'), [0, 0.37, 0.01], [Math.PI / 2, 0, 0]);
  return group;
}

function makeNoodles(color, index) {
  return makeBowl(index % 2 === 0 ? '#ece2c9' : '#d8c9a9', 'noodles', color);
}

function makeSeed(color, index) {
  const group = makeBowl('#e7ddc8', null);
  const rand = randomizer(index + 95);
  for (let index = 0; index < 18; index += 1) {
    sphere(
      group,
      0.018,
      color,
      [(rand() - 0.5) * 0.36, 0.28 + rand() * 0.03, (rand() - 0.5) * 0.36],
      [1.5, 0.55, 0.75],
      { roughness: 0.85, segments: 7 }
    );
  }
  return group;
}

function makeCheese(color, index) {
  const group = new THREE.Group();
  const wedge = addMesh(
    group,
    new THREE.CylinderGeometry(0.42, 0.42, 0.34, 3, 1),
    material(color, { roughness: 0.7 }),
    [0, 0.26, 0],
    [0, 0.35, 0.22]
  );
  wedge.rotation.x = Math.PI / 2;
  for (let index = 0; index < 4; index += 1) {
    sphere(group, 0.045, '#cfb86c', [(index - 1.5) * 0.1, 0.25 + (index % 2) * 0.08, 0.16], [1, 0.45, 1], { segments: 9 });
  }
  return group;
}

function makeCan(color, index) {
  const group = new THREE.Group();
  cylinder(group, 0.24, 0.24, 0.5, '#d2d0c8', [0, 0.29, 0], [0, 0, 0], { roughness: 0.35, metalness: 0.55, segments: 28 });
  cylinder(group, 0.243, 0.243, 0.32, color, [0, 0.29, 0], [0, 0, 0], { roughness: 0.72, segments: 28 });
  addMesh(group, new THREE.CylinderGeometry(0.243, 0.243, 0.1, 28, 1, true), material('#f1e6cd', { side: THREE.DoubleSide }), [0, 0.29, 0]);
  addMesh(group, new THREE.TorusGeometry(0.235, 0.018, 6, 28), material('#9f9c94', { metalness: 0.5, roughness: 0.35 }), [0, 0.54, 0], [Math.PI / 2, 0, 0]);
  void index;
  return group;
}

function makePotato(color, index) {
  const group = new THREE.Group();
  const positions = [
    [-0.2, 0.18, 0.04, 0.9],
    [0.16, 0.17, 0.07, 0.8],
    [0.02, 0.31, -0.12, 0.85],
    [0.24, 0.27, -0.16, 0.65]
  ];
  positions.forEach(([x, y, z, scale], itemIndex) => {
    sphere(group, 0.2, itemIndex % 2 ? '#b68b58' : color, [x, y, z], [1.25 * scale, 0.82 * scale, 1 * scale], { roughness: 0.95, segments: 16 });
  });
  void index;
  return group;
}

function makeRice(color, index) {
  const group = makeBowl(index % 2 ? '#dfd3ba' : '#eee5d1', 'mound', color);
  const rand = randomizer(index + 104);
  for (let index = 0; index < 12; index += 1) {
    sphere(
      group,
      0.018,
      '#f7f0df',
      [(rand() - 0.5) * 0.46, 0.37 + rand() * 0.05, (rand() - 0.5) * 0.42],
      [1.9, 0.6, 0.65],
      { roughness: 0.92, segments: 6 }
    );
  }
  return group;
}

function makeChickpeas(color, index) {
  const group = makeBowl('#e7dfcc', 'pieces', color);
  void index;
  return group;
}

function makeOnion(color, index) {
  const group = new THREE.Group();
  sphere(group, 0.27, color, [0, 0.27, 0], [1, 0.88, 1], { roughness: 0.68, segments: 22 });
  for (let index = 0; index < 4; index += 1) {
    const line = addMesh(
      group,
      new THREE.TorusGeometry(0.23 - index * 0.014, 0.008, 5, 20, Math.PI),
      material(index % 2 ? '#b48e43' : '#bb8741', { roughness: 0.8 }),
      [0, 0.28, 0],
      [Math.PI / 2, 0, index * 1.4]
    );
    line.scale.y = 1.2;
  }
  addMesh(group, new THREE.ConeGeometry(0.045, 0.16, 8), material('#71804b'), [0, 0.52, 0], [0, 0, -0.1]);
  cylinder(group, 0.02, 0.03, 0.09, '#a88858', [0.01, 0.04, 0], [0, 0, 0.1], { segments: 7 });
  void index;
  return group;
}

function makeGinger(color, index) {
  const group = new THREE.Group();
  const pieces = [
    [-0.16, 0.2, 0.02, 1.1, 0.7],
    [0.1, 0.22, -0.03, 1.3, 0.8],
    [0.05, 0.35, 0.05, 0.85, 0.62]
  ];
  pieces.forEach(([x, y, z, sx, sy], pieceIndex) => {
    const piece = sphere(group, 0.16, pieceIndex === 1 ? '#c99759' : color, [x, y, z], [sx, sy, 0.72], { roughness: 0.96, segments: 14 });
    piece.rotation.z = pieceIndex * 0.5 - 0.4;
  });
  void index;
  return group;
}

function makeSpinach(color, index) {
  const group = makeBowl('#dfd4bd', 'leaves', color);
  void index;
  return group;
}

function makeBokChoy(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 119);
  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * 0.2;
    const z = (index % 2) * 0.12;
    cylinder(group, 0.06, 0.1, 0.35, '#e9e4cd', [x, 0.2, z], [0.1, 0, (index - 1) * 0.16], { roughness: 0.82, segments: 10 });
    const leaf = sphere(group, 0.19, index === 1 ? color : '#668f4b', [x + 0.02, 0.5, z - 0.02], [0.72, 1.35, 0.55], { roughness: 0.88, segments: 14 });
    leaf.rotation.z = (index - 1) * 0.25 + rand() * 0.08;
  }
  return group;
}

function makeTortilla(color, index) {
  const group = new THREE.Group();
  for (let index = 0; index < 7; index += 1) {
    const tortilla = cylinder(
      group,
      0.33,
      0.33,
      0.028,
      index % 3 === 0 ? '#d8ad68' : color,
      [(index % 3 - 1) * 0.018, 0.075 + index * 0.035, (index % 2) * 0.018],
      [0, (index % 2) * 0.08, 0],
      { roughness: 0.96, segments: 28 }
    );
    tortilla.scale.z = 0.97;
  }
  return group;
}

function makeCorn(color, index) {
  const group = new THREE.Group();
  const cob = cylinder(group, 0.115, 0.135, 0.7, color, [0, 0.29, 0], [0, 0, Math.PI / 2], { roughness: 0.67, segments: 18 });
  cob.rotation.z = Math.PI / 2;
  cob.rotation.x = 0.14;
  for (let index = 0; index < 6; index += 1) {
    const husk = sphere(
      group,
      0.22,
      index % 2 ? '#6f9147' : '#7d9b51',
      [-0.22 + index * 0.01, 0.26, (index - 2.5) * 0.055],
      [0.9, 0.38, 0.15],
      { roughness: 0.9, segments: 12 }
    );
    husk.rotation.z = 0.07 * (index - 2.5);
  }
  for (let index = 0; index < 8; index += 1) {
    sphere(group, 0.023, '#f0cd56', [0.2 * Math.cos(index * 1.9), 0.29 + 0.08 * Math.sin(index * 1.3), 0.1 * Math.sin(index * 1.9)], [0.75, 0.75, 0.75], { segments: 7 });
  }
  void index;
  return group;
}

function makeZucchini(color, index) {
  const group = new THREE.Group();
  const zucchini = cylinder(group, 0.12, 0.13, 0.72, color, [0, 0.22, 0], [0, 0, Math.PI / 2], { roughness: 0.7, segments: 16 });
  zucchini.rotation.x = 0.12;
  addMesh(group, new THREE.ConeGeometry(0.12, 0.16, 12), material('#72964f'), [0.43, 0.22, 0], [0, 0, -Math.PI / 2]);
  addMesh(group, new THREE.ConeGeometry(0.105, 0.14, 12), material('#547b3d'), [-0.42, 0.22, 0], [0, 0, Math.PI / 2]);
  for (let index = 0; index < 3; index += 1) {
    addMesh(group, new THREE.BoxGeometry(0.55, 0.012, 0.025), material('#4f713a'), [-0.02, 0.32 + index * 0.02, -0.08 + index * 0.08], [0, 0, 0]);
  }
  void index;
  return group;
}

function makeBeans(color, index) {
  const group = makeBowl('#ded3bd', 'pieces', color);
  void index;
  return group;
}

function makeFeta(color, index) {
  const group = new THREE.Group();
  const positions = [
    [-0.18, 0.16, 0.04],
    [0.08, 0.16, 0.03],
    [-0.05, 0.3, -0.06],
    [0.22, 0.27, -0.1]
  ];
  positions.forEach(([x, y, z], itemIndex) => {
    addMesh(
      group,
      new RoundedBoxGeometry(0.24, 0.2, 0.23, 2, 0.025),
      material(itemIndex === 2 ? '#e1d6ba' : color, { roughness: 0.88 }),
      [x, y, z],
      [0.08 * (itemIndex % 2), itemIndex * 0.2, 0.03]
    );
  });
  void index;
  return group;
}

function makeCarrot(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 139);
  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * 0.17;
    addMesh(
      group,
      new THREE.ConeGeometry(0.09, 0.58, 10),
      material(index % 2 ? '#cf762d' : color, { roughness: 0.82 }),
      [x, 0.3, (index % 2) * 0.08],
      [Math.PI, 0, (index - 1) * 0.16]
    );
    for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
      const leaf = sphere(
        group,
        0.08,
        '#64884a',
        [x + Math.cos(leafIndex * 2.1) * 0.06, 0.63 + rand() * 0.04, 0.04 + Math.sin(leafIndex * 2.1) * 0.05],
        [0.35, 1.2, 0.35],
        { roughness: 0.9, segments: 9 }
      );
      leaf.rotation.z = (leafIndex - 1) * 0.4;
    }
  }
  return group;
}

function makeCarton(color, index) {
  const group = new THREE.Group();
  addMesh(group, new RoundedBoxGeometry(0.48, 0.62, 0.3, 3, 0.045), material(color, { roughness: 0.8 }), [0, 0.34, 0], [0, 0.02, 0]);
  addMesh(group, new THREE.BoxGeometry(0.35, 0.12, 0.21), material('#e8d8b8', { roughness: 0.8 }), [0, 0.69, 0], [0, 0, 0.03]);
  addMesh(group, new THREE.BoxGeometry(0.34, 0.16, 0.015), material('#f5ecd8', { roughness: 0.9 }), [0, 0.37, 0.16], [0, 0, 0]);
  addMesh(group, new THREE.BoxGeometry(0.2, 0.04, 0.02), material('#788a65', { roughness: 0.9 }), [0, 0.38, 0.17], [0, 0, 0]);
  void index;
  return group;
}

function makeBroccoli(color, index) {
  const group = new THREE.Group();
  const rand = randomizer(index + 150);
  cylinder(group, 0.06, 0.09, 0.37, '#78955e', [0, 0.23, 0], [0, 0, 0.08], { roughness: 0.9, segments: 10 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    sphere(
      group,
      0.13,
      index % 3 === 0 ? '#648d4e' : color,
      [Math.cos(angle) * (0.1 + rand() * 0.08), 0.48 + rand() * 0.13, Math.sin(angle) * (0.1 + rand() * 0.08)],
      [1, 0.85, 1],
      { roughness: 0.94, segments: 11, flatShading: true }
    );
  }
  return group;
}

function makeIngredientModel(ingredient, index) {
  switch (ingredient.shape) {
    case 'lemon':
      return makeLemon(ingredient.color, index);
    case 'lime':
      return makeLemon(ingredient.color, index, false);
    case 'tomato':
      return makeTomato(ingredient.color, index);
    case 'protein':
      return makeProtein(ingredient, index);
    case 'garlic':
      return makeGarlic(ingredient.color, index);
    case 'herb':
      return makeHerb(ingredient.color, index);
    case 'bottle':
      return makeBottle(ingredient.color, index);
    case 'long':
      return makeLong(ingredient, index);
    case 'seasoning':
      return makeSeasoning(ingredient.color, index);
    case 'mushroom':
      return makeMushroom(ingredient.color, index);
    case 'jar':
      return makeJar(ingredient.color, index);
    case 'butter':
      return makeButter(ingredient.color, index);
    case 'scallion':
      return makeScallion(ingredient.color, index);
    case 'noodles':
      return makeNoodles(ingredient.color, index);
    case 'seed':
      return makeSeed(ingredient.color, index);
    case 'cheese':
      return makeCheese(ingredient.color, index);
    case 'can':
      return makeCan(ingredient.color, index);
    case 'potato':
      return makePotato(ingredient.color, index);
    case 'rice':
      return makeRice(ingredient.color, index);
    case 'chickpea':
      return makeChickpeas(ingredient.color, index);
    case 'onion':
      return makeOnion(ingredient.color, index);
    case 'ginger':
      return makeGinger(ingredient.color, index);
    case 'spinach':
      return makeSpinach(ingredient.color, index);
    case 'bokchoy':
      return makeBokChoy(ingredient.color, index);
    case 'tortilla':
      return makeTortilla(ingredient.color, index);
    case 'corn':
      return makeCorn(ingredient.color, index);
    case 'zucchini':
      return makeZucchini(ingredient.color, index);
    case 'beans':
      return makeBeans(ingredient.color, index);
    case 'feta':
      return makeFeta(ingredient.color, index);
    case 'carrot':
      return makeCarrot(ingredient.color, index);
    case 'carton':
      return makeCarton(ingredient.color, index);
    case 'broccoli':
      return makeBroccoli(ingredient.color, index);
    default: {
      const group = new THREE.Group();
      sphere(group, 0.27, ingredient.color, [0, 0.26, 0], [1, 0.9, 1], { roughness: 0.67 });
      return group;
    }
  }
}

function getRows(count) {
  if (count <= 4) return [count];
  if (count <= 6) return [Math.ceil(count / 2), Math.floor(count / 2)];
  if (count === 7) return [4, 3];
  if (count <= 8) return [4, 4];
  return [Math.ceil(count / 2), Math.floor(count / 2)];
}

function createItem(recipe, ingredient, index, isNarrow) {
  const root = new THREE.Group();
  const plate = addMesh(
    root,
    new THREE.CylinderGeometry(0.55, 0.58, 0.045, 30),
    material(index % 2 === 0 ? '#f5eddd' : '#eadfca', { roughness: 0.62 }),
    [0, 0.023, 0]
  );
  plate.scale.z = 0.92;
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: recipe.accent,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = addMesh(root, new THREE.RingGeometry(0.47, 0.535, 48), ringMaterial, [0, 0.058, 0], [-Math.PI / 2, 0, 0]);
  ring.castShadow = false;
  ring.receiveShadow = false;
  ring.visible = false;
  const visual = makeIngredientModel(ingredient, index);
  visual.position.y = 0.06;
  visual.rotation.y = (index % 3 - 1) * 0.14;
  visual.scale.setScalar(isNarrow ? 1.06 : 1);
  root.add(visual);
  root.userData.ingredientId = ingredient.id;
  return { root, visual, plate, ring, ringMaterial, ingredient };
}

export class KitchenCounter {
  constructor(canvas, container, onSelect) {
    this.canvas = canvas;
    this.container = container;
    this.onSelect = onSelect;
    this.items = [];
    this.selectedId = null;
    this.hoveredId = null;
    this.recipe = null;
    this.spawnTimes = new Map();
    this.pointer = new THREE.Vector2();
    this.pointerDown = null;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.isNarrow = false;
    this.currentAccent = '#c9892d';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e8dcc9');
    this.scene.fog = new THREE.Fog('#e8dcc9', 22, 40);

    this.camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 80);
    this.camera.position.set(8.7, 8.6, 9.6);
    this.camera.lookAt(0, 0.25, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.25, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.7;
    this.controls.maxPolarAngle = 1.34;
    this.controls.minAzimuthAngle = -0.78;
    this.controls.maxAzimuthAngle = 0.78;
    this.controls.minZoom = 0.92;
    this.controls.maxZoom = 1.3;
    this.controls.update();

    this.ingredientRoot = new THREE.Group();
    this.scene.add(this.ingredientRoot);
    this.buildCounter();
    this.bindEvents();
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.animate();
  }

  buildCounter() {
    const room = new THREE.Group();
    this.scene.add(room);

    const wall = addMesh(
      room,
      new THREE.BoxGeometry(18, 7, 0.3),
      material('#ded1bd', { roughness: 0.94 }),
      [0, 3.25, -3.1]
    );
    wall.castShadow = false;

    const tileMaterial = material('#d3c5b0', { roughness: 0.85 });
    for (let index = -6; index <= 6; index += 1) {
      addMesh(room, new THREE.BoxGeometry(0.025, 4.8, 0.025), tileMaterial, [index * 1.42, 2.7, -2.93]).castShadow = false;
    }
    for (let index = 0; index < 4; index += 1) {
      addMesh(room, new THREE.BoxGeometry(18, 0.022, 0.022), tileMaterial, [0, 0.75 + index * 1.22, -2.93]).castShadow = false;
    }

    const counter = addMesh(
      room,
      new RoundedBoxGeometry(17, 0.5, 6.8, 5, 0.16),
      material('#9e6b49', { roughness: 0.73 }),
      [0, -0.23, 0.4]
    );
    counter.castShadow = false;
    addMesh(
      room,
      new RoundedBoxGeometry(17.1, 0.32, 0.34, 4, 0.08),
      material('#b77c55', { roughness: 0.7 }),
      [0, 0.04, 3.72]
    ).castShadow = false;

    const board = addMesh(
      room,
      new RoundedBoxGeometry(12.1, 0.16, 4.6, 4, 0.18),
      material('#c99b6f', { roughness: 0.76 }),
      [0, 0.08, 0.14]
    );
    board.castShadow = false;
    addMesh(
      room,
      new RoundedBoxGeometry(11.5, 0.012, 4.0, 3, 0.1),
      material('#d8ae82', { roughness: 0.82 }),
      [0, 0.168, 0.14]
    ).castShadow = false;

    this.buildBackdropProps(room);

    const hemi = new THREE.HemisphereLight('#fff4dc', '#594a3f', 2.2);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff2d6', 3.15);
    key.position.set(4.5, 9.5, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 28;
    key.shadow.bias = -0.0004;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#e0e9e0', 1.25);
    rim.position.set(-8, 5, -4);
    this.scene.add(rim);
    const fill = new THREE.PointLight('#ffd9a1', 9, 18, 1.6);
    fill.position.set(-2, 4.2, 4.5);
    this.scene.add(fill);
  }

  buildBackdropProps(parent) {
    const herbPot = new THREE.Group();
    cylinder(herbPot, 0.32, 0.24, 0.42, '#b36d4d', [0, 0.21, 0], [0, 0, 0], { roughness: 0.85, segments: 20 });
    addMesh(herbPot, new THREE.TorusGeometry(0.31, 0.032, 6, 22), material('#c17b59'), [0, 0.42, 0], [Math.PI / 2, 0, 0]);
    for (let index = 0; index < 8; index += 1) {
      const leaf = sphere(
        herbPot,
        0.13,
        index % 2 ? '#63834c' : '#74935b',
        [Math.cos(index * 2.4) * 0.18, 0.58 + (index % 3) * 0.09, Math.sin(index * 2.4) * 0.17],
        [0.7, 1.4, 0.5],
        { roughness: 0.92, segments: 12 }
      );
      leaf.rotation.z = 0.4 * Math.cos(index * 1.7);
    }
    herbPot.position.set(-5.1, 0, -2.45);
    parent.add(herbPot);

    const utensilCrock = new THREE.Group();
    cylinder(utensilCrock, 0.3, 0.24, 0.5, '#d1b287', [0, 0.25, 0], [0, 0, 0], { roughness: 0.85, segments: 20 });
    addMesh(utensilCrock, new THREE.TorusGeometry(0.3, 0.025, 6, 22), material('#b69166'), [0, 0.49, 0], [Math.PI / 2, 0, 0]);
    for (let index = 0; index < 3; index += 1) {
      const utensil = cylinder(utensilCrock, 0.017, 0.017, 0.9, '#8a6747', [(index - 1) * 0.08, 0.75, 0], [0.12 * (index - 1), 0, 0.09 * (index - 1)], { roughness: 0.9, segments: 6 });
      utensil.rotation.z = 0.08 * (index - 1);
    }
    utensilCrock.position.set(5.0, 0, -2.5);
    parent.add(utensilCrock);

    const bowlStack = new THREE.Group();
    cylinder(bowlStack, 0.48, 0.34, 0.2, '#d8cdb8', [0, 0.1, 0], [0, 0, 0], { roughness: 0.58, segments: 28 });
    cylinder(bowlStack, 0.38, 0.27, 0.18, '#b65f46', [0.03, 0.28, 0.02], [0, 0.2, 0], { roughness: 0.58, segments: 28 });
    bowlStack.position.set(4.6, 0, 1.85);
    bowlStack.scale.setScalar(0.85);
    parent.add(bowlStack);

    const towel = addMesh(
      parent,
      new RoundedBoxGeometry(1.2, 0.045, 0.55, 3, 0.04),
      material('#d9c7a7', { roughness: 1 }),
      [-4.45, 0.18, 2.05],
      [0, 0.22, 0]
    );
    towel.castShadow = true;
    for (let index = 0; index < 3; index += 1) {
      addMesh(
        parent,
        new THREE.BoxGeometry(1.18, 0.012, 0.035),
        material('#b99e78', { roughness: 1 }),
        [-4.45, 0.208, 1.87 + index * 0.18],
        [0, 0.22, 0]
      );
    }
  }

  bindEvents() {
    this.handleResize = () => this.resize();
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerDown = (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY };
    };
    this.handlePointerUp = (event) => {
      if (!this.pointerDown) return;
      const distance = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
      this.pointerDown = null;
      if (distance > 7) return;
      const ingredientId = this.pickIngredient(event);
      if (ingredientId) {
        this.setSelectedIngredient(ingredientId);
        if (this.onSelect) this.onSelect(ingredientId);
      }
    };
    this.handlePointerLeave = () => {
      this.hoveredId = null;
      this.canvas.style.cursor = 'grab';
    };
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    window.addEventListener('resize', this.handleResize);
  }

  onPointerMove(event) {
    const ingredientId = this.pickIngredient(event);
    if (ingredientId !== this.hoveredId) {
      this.hoveredId = ingredientId;
      this.canvas.style.cursor = ingredientId ? 'pointer' : this.controls.enabled ? 'grab' : 'default';
    }
  }

  pickIngredient(event) {
    if (!this.items.length) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = raycaster.intersectObjects(this.ingredientRoot.children, true);
    for (const intersection of intersections) {
      let object = intersection.object;
      while (object && !object.userData.ingredientId) object = object.parent;
      if (object && object.userData.ingredientId) return object.userData.ingredientId;
    }
    return null;
  }

  setRecipe(recipe) {
    const isNewRecipe = !this.recipe || this.recipe.id !== recipe.id;
    this.recipe = recipe;
    this.currentAccent = recipe.accent;
    this.items.forEach((item) => {
      item.ringMaterial.color.set(recipe.accent);
    });
    if (!isNewRecipe) {
      this.updateSelectionState();
      return;
    }

    this.ingredientRoot.clear();
    this.items = [];
    this.spawnTimes.clear();
    const ingredients = recipe.ingredients;
    const rows = getRows(ingredients.length);
    const rowCount = rows.length;
    const zPositions = rowCount === 1 ? [0.35] : [-0.82, 1.17];
    let itemIndex = 0;
    rows.forEach((rowCountForRow, rowIndex) => {
      const spacing = rowCountForRow >= 5 ? 1.92 : rowCountForRow === 4 ? 2.18 : 2.12;
      const startX = ((rowCountForRow - 1) * spacing) / 2;
      for (let column = 0; column < rowCountForRow; column += 1) {
        const ingredient = ingredients[itemIndex];
        const item = createItem(recipe, ingredient, itemIndex, this.isNarrow);
        const jitter = Math.sin(itemIndex * 13.7) * 0.06;
        item.root.position.set(startX - column * spacing + jitter, BOARD_Y, zPositions[rowIndex] + Math.cos(itemIndex * 8.3) * 0.045);
        item.baseY = BOARD_Y;
        item.baseRotation = item.visual.rotation.y;
        item.spawnAt = this.elapsed + itemIndex * 0.045;
        item.visual.position.y = 2.25;
        item.visual.scale.multiplyScalar(0.62);
        item.ring.visible = false;
        this.ingredientRoot.add(item.root);
        this.items.push(item);
        itemIndex += 1;
      }
    });

    if (!this.items.some((item) => item.ingredient.id === this.selectedId)) {
      this.selectedId = ingredients[0]?.id ?? null;
    }
    this.updateSelectionState();
  }

  setSelectedIngredient(ingredientId) {
    this.selectedId = ingredientId;
    this.updateSelectionState();
  }

  updateSelectionState() {
    this.items.forEach((item) => {
      item.ring.visible = item.ingredient.id === this.selectedId;
    });
  }

  resize() {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const aspect = width / height;
    this.isNarrow = width < 700;
    const desiredWidth = this.isNarrow ? 10.1 : 14.3;
    const desiredHeight = this.isNarrow ? 7.1 : 5.9;
    const viewWidth = Math.max(desiredWidth, desiredHeight * aspect);
    const halfWidth = viewWidth / 2;
    const halfHeight = halfWidth / aspect;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.controls.enabled = !this.isNarrow;
    this.controls.enableZoom = !this.isNarrow;
    this.canvas.style.cursor = this.isNarrow ? 'default' : 'grab';
    if (this.isNarrow) {
      this.controls.reset();
      this.controls.target.set(0, 0.25, 0);
      this.camera.position.set(8.7, 8.6, 9.6);
      this.camera.lookAt(0, 0.25, 0);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += delta;
    const elapsed = this.elapsed;
    this.items.forEach((item, index) => {
      const isSelected = item.ingredient.id === this.selectedId;
      const isHovered = item.ingredient.id === this.hoveredId;
      const hasLanded = elapsed >= item.spawnAt;
      const liftTarget = isSelected ? 0.16 : isHovered ? 0.08 : 0;
      const desiredY = hasLanded ? 0.06 + liftTarget + (isSelected ? Math.sin(elapsed * 2.1 + index) * 0.018 : 0) : 2.25;
      const targetScale = hasLanded ? (isSelected ? 1.1 : isHovered ? 1.055 : 1) * (this.isNarrow ? 1.06 : 1) : 0.62;
      const rotationTarget = hasLanded
        ? item.baseRotation + (isSelected ? Math.sin(elapsed * 0.55 + index) * 0.14 : 0)
        : item.baseRotation + index;
      const ease = hasLanded ? Math.min(1, delta * 9) : 1;
      item.visual.position.y += (desiredY - item.visual.position.y) * ease;
      const currentScale = item.visual.scale.x;
      const nextScale = currentScale + (targetScale - currentScale) * ease;
      item.visual.scale.setScalar(nextScale);
      item.visual.rotation.y += (rotationTarget - item.visual.rotation.y) * Math.min(1, delta * 6);
      item.ring.scale.setScalar(isSelected ? 1 + Math.sin(elapsed * 2.4) * 0.025 : 1);
    });
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
