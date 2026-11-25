import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TRACK_COLORS = [0xe5764d, 0xd5a63c, 0x4aa9a5, 0xcf82a9];

const MATERIAL = (color, extra = {}) => {
  const { roughness, metalness, ...supported } = extra;
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    ...supported,
  });
};

const CYLINDER_UP = new THREE.Vector3(0, 1, 0);

function cylinderBetween(start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar( 0.5);
  mesh.quaternion.setFromUnitVectors(CYLINDER_UP, direction.normalize());
  return mesh;
}

function addLeaf(parent, position, rotation, scale, material, geometry) {
  const leaf = new THREE.Mesh(geometry, material);
  leaf.position.set(...position);
  leaf.rotation.set(...rotation);
  leaf.scale.set(...scale);
  parent.add(leaf);
  return leaf;
}

export class GardenScene {
  constructor({ canvas, reducedMotion = false }) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    this.reducedMotion = reducedMotion;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b1812, 0.011);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    this.cameraTarget = new THREE.Vector3(0, 1.1, 0);
    this.cameraDirection = new THREE.Vector3(0.86, 0.83, 1.35).normalize();
    this.baseCameraPosition = new THREE.Vector3();
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.instruments = [];
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.running = true;
    this.resizeObserver = null;
    this.animationFrame = null;
    this.leafGeometry = new THREE.SphereGeometry(0.16, 8, 6);
    this.sharedMaterials = {
      leaf: MATERIAL(0x547e48, { roughness: 0.9 }),
      leafLight: MATERIAL(0x7ca661, { roughness: 0.88 }),
      stem: MATERIAL(0x3d6a42, { roughness: 0.92 }),
      stone: MATERIAL(0x63705e, { roughness: 0.96 }),
      darkStone: MATERIAL(0x35473a, { roughness: 0.96 }),
      wood: MATERIAL(0x8e613a, { roughness: 0.82 }),
      cream: MATERIAL(0xf0dfb9, { roughness: 0.74 }),
      soil: MATERIAL(0x332a20, { roughness: 1 }),
      moss: MATERIAL(0x274731, { roughness: 0.96 }),
    };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    const gl = this.renderer.getContext();
    const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererName = rendererInfo
      ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))
      : "";
    this.softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);

    this.buildEnvironment();
    this.buildInstruments();
    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate = this.animate.bind(this);
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  buildEnvironment() {
    const hemi = new THREE.HemisphereLight(0xd8f0c4, 0x07110b, 2.1);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffe2ad, 3.2);
    key.position.set(-5.5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(768, 768);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 24;
    key.shadow.bias = -0.0006;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x84b8b1, 1.25);
    rim.position.set(6, 5, -6);
    this.scene.add(rim);

    const island = new THREE.Group();
    this.scene.add(island);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.8, 0.72, 64),
      this.sharedMaterials.soil,
    );
    soil.position.y = -0.42;
    soil.receiveShadow = true;
    island.add(soil);

    const moss = new THREE.Mesh(
      new THREE.CylinderGeometry(4.33, 4.55, 0.18, 64),
      this.sharedMaterials.moss,
    );
    moss.position.y = -0.02;
    moss.receiveShadow = true;
    island.add(moss);

    const innerMoss = new THREE.Mesh(
      new THREE.CircleGeometry(3.35, 64),
      new THREE.MeshLambertMaterial({
        color: 0x2b5237,
        transparent: true,
        opacity: 0.82,
      }),
    );
    innerMoss.rotation.x = -Math.PI / 2;
    innerMoss.position.y = 0.077;
    innerMoss.receiveShadow = true;
    island.add(innerMoss);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x64835e,
      transparent: true,
      opacity: 0.24,
    });
    [1.8, 2.7, 3.72].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.022 + index * 0.004, 96),
        ringMaterial,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.083 + index * 0.001;
      island.add(ring);
    });

    const pathMaterial = MATERIAL(0x5b6750, { roughness: 1 });
    const pathPoints = [
      [0.25, 0.11, 3.0, 0.36],
      [-0.3, 0.11, 2.15, 0.3],
      [0.42, 0.11, 1.25, 0.32],
      [-0.35, 0.11, -0.2, 0.29],
      [0.42, 0.11, -1.45, 0.31],
      [-0.18, 0.11, -2.55, 0.26],
    ];
    pathPoints.forEach(([x, y, z, radius], index) => {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.06, 0.075, 12),
        index % 2 ? pathMaterial : this.sharedMaterials.stone,
      );
      stone.position.set(x, y, z);
      stone.scale.z = 0.78;
      stone.rotation.y = index * 0.6;
      stone.receiveShadow = true;
      island.add(stone);
    });

    const pebbleGeometry = new THREE.IcosahedronGeometry(0.12, 0);
    const pebbleData = [
      [-3.7, 0.12, 1.7, 0.9],
      [-3.95, 0.09, -0.35, 0.55],
      [3.72, 0.11, 1.1, 0.7],
      [3.9, 0.08, -1.7, 0.48],
      [-1.45, 0.09, 2.85, 0.52],
      [2.2, 0.1, 2.52, 0.62],
      [2.9, 0.1, -2.65, 0.45],
      [-3.2, 0.08, -2.2, 0.54],
    ];
    pebbleData.forEach(([x, y, z, scale], index) => {
      const pebble = new THREE.Mesh(pebbleGeometry, index % 2 ? this.sharedMaterials.stone : this.sharedMaterials.darkStone);
      pebble.position.set(x, y, z);
      pebble.scale.set(scale, scale * 0.58, scale * 1.15);
      pebble.rotation.set(index, index * 1.7, 0);
      pebble.castShadow = true;
      pebble.receiveShadow = true;
      island.add(pebble);
    });

    this.buildFlowers(island);
    this.buildFerns(island);
    this.buildArch(island);
    this.buildFireflies(island);
    this.mergeStaticEnvironment(island);
  }

  buildFlowers(parent) {
    const flowerSpots = [
      [-3.58, 0.08, 2.55, 0xcf82a9, 0.8],
      [-2.85, 0.08, 3.15, 0xf0dfb9, 0.6],
      [3.35, 0.08, 2.2, 0xe5764d, 0.72],
      [2.75, 0.08, 3.15, 0xcf82a9, 0.55],
      [-3.75, 0.08, -1.55, 0xf0dfb9, 0.58],
      [3.85, 0.08, -0.1, 0x4aa9a5, 0.56],
      [1.65, 0.08, -2.95, 0xcf82a9, 0.62],
      [-1.7, 0.08, -3.0, 0xf0dfb9, 0.54],
    ];
    const petalGeometry = new THREE.SphereGeometry(0.09, 8, 6);
    const stemMaterial = this.sharedMaterials.stem;
    const petalMaterials = new Map();
    const centerMaterial = MATERIAL(0xe5b94c, { emissive: 0x3c2600, emissiveIntensity: 0.25 });
    const getPetalMaterial = (color) => {
      if (!petalMaterials.has(color)) {
        petalMaterials.set(color, MATERIAL(color, { roughness: 0.68 }));
      }
      return petalMaterials.get(color);
    };

    flowerSpots.forEach(([x, y, z, color, scale], flowerIndex) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.022, 0.52, 6),
        stemMaterial,
      );
      stem.position.y = 0.26;
      group.add(stem);
      const bloom = new THREE.Group();
      bloom.position.y = 0.53;
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8),
        centerMaterial,
      );
      bloom.add(center);
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2;
        const mesh = new THREE.Mesh(petalGeometry, getPetalMaterial(color));
        mesh.position.set(Math.cos(angle) * 0.095, 0, Math.sin(angle) * 0.095);
        mesh.scale.set(1, 0.44, 0.65);
        bloom.add(mesh);
      }
      bloom.rotation.y = flowerIndex * 0.7;
      group.add(bloom);
      parent.add(group);
    });
  }

  mergeStaticEnvironment(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map();
    const meshes = [];
    root.traverse((object) => {
      if (object.isMesh && object.material && !Array.isArray(object.material)) {
        meshes.push(object);
      }
    });

    meshes.forEach((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      const attributeKey = Object.keys(geometry.attributes).sort().join(",");
      const key = `${mesh.material.uuid}|${attributeKey}`;
      if (!buckets.has(key)) buckets.set(key, { material: mesh.material, geometries: [] });
      buckets.get(key).geometries.push(geometry);
    });

    const staticGroup = new THREE.Group();
    buckets.forEach(({ material, geometries }) => {
      const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
      if (!merged) {
        geometries.forEach((geometry) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.receiveShadow = true;
          staticGroup.add(mesh);
        });
        return;
      }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      staticGroup.add(mesh);
    });

    root.remove(this.fireflies);
    this.scene.remove(root);
    this.scene.add(staticGroup);
    staticGroup.add(this.fireflies);
  }

  buildFerns(parent) {
    const fernSpots = [
      [-4.02, 2.0, 0.8, 0.7],
      [-3.6, 3.1, 1.28, 1.7],
      [4.05, 1.75, 0.68, 2.1],
      [3.55, 3.0, 1.1, 0.2],
      [-4.0, -1.1, 0.9, 2.8],
      [4.0, -2.1, 1.05, 1.1],
      [-2.7, -3.25, 0.85, 0.5],
      [2.85, -3.15, 0.9, 2.4],
    ];

    fernSpots.forEach(([x, z, scale, rotation], fernIndex) => {
      const fern = new THREE.Group();
      fern.position.set(x, 0.06, z);
      fern.rotation.y = rotation;
      fern.scale.setScalar(scale);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.028, 1.05, 6),
        this.sharedMaterials.stem,
      );
      stem.position.y = 0.5;
      stem.rotation.z = 0.13;
      fern.add(stem);

      const leafMaterial = fernIndex % 2 ? this.sharedMaterials.leafLight : this.sharedMaterials.leaf;
      for (let leafIndex = 0; leafIndex < 7; leafIndex += 1) {
        const progress = leafIndex / 7;
        const side = leafIndex % 2 === 0 ? 1 : -1;
        addLeaf(
          fern,
          [side * (0.13 + progress * 0.25), 0.2 + progress * 0.85, 0],
          [0, 0, side * (0.72 - progress * 0.3)],
          [0.55 - progress * 0.25, 1.9 - progress * 0.55, 0.4],
          leafMaterial,
          this.leafGeometry,
        );
      }
      parent.add(fern);
    });
  }

  buildArch(parent) {
    const arch = new THREE.Group();
    arch.position.set(0, 0, -3.7);
    const wood = this.sharedMaterials.wood;
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.65, 8), wood);
    leftPost.position.set(-2.0, 0.82, 0);
    leftPost.rotation.z = -0.03;
    arch.add(leftPost);
    const rightPost = leftPost.clone();
    rightPost.position.x = 2.0;
    rightPost.rotation.z = 0.03;
    arch.add(rightPost);

    const top = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.075, 8, 48, Math.PI),
      wood,
    );
    top.position.set(0, 1.62, 0);
    arch.add(top);

    const vineMaterial = MATERIAL(0x567d49, { roughness: 0.95 });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 7) * Math.PI;
      const x = Math.cos(angle) * 2.0;
      const y = 1.62 + Math.sin(angle) * 2.0;
      const length = 0.25 + (index % 3) * 0.14;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, length, 5), vineMaterial);
      vine.position.set(x, y - length / 2, 0.01);
      arch.add(vine);
      addLeaf(
        arch,
        [x + (index % 2 ? 0.05 : -0.05), y - length, 0.03],
        [0.2, 0, index % 2 ? -0.7 : 0.7],
        [0.32, 0.85, 0.22],
        this.sharedMaterials.leafLight,
        this.leafGeometry,
      );
    }

    arch.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    parent.add(arch);
  }

  buildFireflies(parent) {
    const count = 42;
    const positions = new Float32Array(count * 3);
    this.fireflySeeds = [];
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.7 + Math.random() * 1.35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.55 + Math.random() * 2.35;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      this.fireflySeeds.push({ x, y, z, phase: Math.random() * Math.PI * 2 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xdff58c,
      size: 0.055,
      transparent: true,
      opacity: 0.78,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.fireflies = new THREE.Points(geometry, material);
    parent.add(this.fireflies);
  }

  makePulseRing(color) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.83, 0.018, 6, 72), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.09;
    ring.visible = false;
    return ring;
  }

  makeInstrumentBase(color, radius = 0.86) {
    const base = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, 0.1, 18),
      this.sharedMaterials.darkStone,
    );
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    pad.castShadow = true;
    base.add(pad);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.68, 0.12, 18),
      new THREE.MeshLambertMaterial({ color }),
    );
    inner.position.y = 0.075;
    inner.receiveShadow = true;
    base.add(inner);
    return base;
  }

  buildInstruments() {
    const positions = [
      [-2.72, 0.07, 0.55, -0.08],
      [-0.78, 0.07, -0.92, 0.06],
      [1.12, 0.07, 0.35, -0.04],
      [2.72, 0.07, -0.78, 0.07],
    ];
    const builders = [this.buildDrums, this.buildBass, this.buildKeys, this.buildBells];

    builders.forEach((builder, index) => {
      const group = new THREE.Group();
      group.position.set(positions[index][0], positions[index][1], positions[index][2]);
      group.rotation.y = positions[index][3];
      const base = this.makeInstrumentBase(TRACK_COLORS[index]);
      group.add(base);
      const instrument = builder.call(this, group, TRACK_COLORS[index]);
      const ring = this.makePulseRing(TRACK_COLORS[index]);
      group.add(ring);
      const light = new THREE.PointLight(TRACK_COLORS[index], 0.35, 3.7, 2);
      light.position.set(0, 0.82, 0.2);
      group.add(light);
      group.traverse((object) => {
        if (object.isMesh && !object.material?.transparent) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      this.scene.add(group);
      this.instruments[index] = {
        ...instrument,
        group,
        ring,
        light,
        baseY: group.position.y,
        baseRotationY: group.rotation.y,
        hitAge: 10,
        strength: 1,
        ringProgress: 1,
      };
    });
  }

  buildDrums(parent, color) {
    const shellMaterial = MATERIAL(color, { roughness: 0.64 });
    const shellDark = MATERIAL(0x8c4430, { roughness: 0.72 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.52, 24), shellMaterial);
    body.position.y = 0.42;
    parent.add(body);

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.065, 32),
      this.sharedMaterials.cream,
    );
    head.position.y = 0.7;
    parent.add(head);
    const headBaseY = head.position.y;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.035, 8, 40), shellDark);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.72;
    parent.add(rim);

    for (let lug = 0; lug < 6; lug += 1) {
      const angle = (lug / 6) * Math.PI * 2;
      const lugMesh = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), this.sharedMaterials.cream);
      lugMesh.position.set(Math.cos(angle) * 0.51, 0.48, Math.sin(angle) * 0.51);
      parent.add(lugMesh);
    }

    const legMaterial = MATERIAL(0x7b5535, { roughness: 0.84 });
    for (let leg = 0; leg < 3; leg += 1) {
      const angle = (leg / 3) * Math.PI * 2 + 0.5;
      const legMesh = cylinderBetween(
        new THREE.Vector3(Math.cos(angle) * 0.42, 0.24, Math.sin(angle) * 0.42),
        new THREE.Vector3(Math.cos(angle) * 0.5, 0.01, Math.sin(angle) *  0.5),
        0.028,
        legMaterial,
      );
      parent.add(legMesh);
    }

    const stickPivots = [];
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.32, 0.8, 0.06);
      pivot.rotation.set(0.32, 0, side * -0.86);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.017, 0.88, 8), legMaterial);
      stick.position.y = 0.39;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), this.sharedMaterials.cream);
      tip.position.y = 0.82;
      pivot.add(stick, tip);
      parent.add(pivot);
      stickPivots.push({ pivot, baseX: pivot.rotation.x, baseZ: pivot.rotation.z, side });
    });

    const mushroomGroup = new THREE.Group();
    mushroomGroup.position.set(0.6, 0.08, -0.3);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.28, 10), this.sharedMaterials.cream);
    stem.position.y = 0.14;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      MATERIAL(0xf0c56b, { roughness: 0.68 }),
    );
    cap.scale.y = 0.56;
    cap.position.y = 0.3;
    mushroomGroup.add(stem, cap);
    parent.add(mushroomGroup);

    return { type: "drums", head, headBaseY, stickPivots, cap, capBaseY: cap.position.y };
  }

  buildBass(parent, color) {
    const wood = MATERIAL(0xa96735, { roughness: 0.58 });
    const woodDark = MATERIAL(0x6e3f27, { roughness: 0.72 });
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.06;
    parent.add(bodyGroup);

    const lowerBout = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), wood);
    lowerBout.scale.set(0.78, 1.08, 0.32);
    lowerBout.position.y = 0.92;
    const upperBout = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 16), wood);
    upperBout.scale.set(0.68, 0.78, 0.29);
    upperBout.position.y = 1.5;
    bodyGroup.add(lowerBout, upperBout);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.35, 18), woodDark);
    waist.position.y = 1.23;
    waist.scale.z = 0.62;
    bodyGroup.add(waist);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.1), woodDark);
    neck.position.set(0, 2.04, 0);
    bodyGroup.add(neck);
    const fingerboard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.16, 0.035), MATERIAL(0x2f241b));
    fingerboard.position.set(0, 2.05, 0.073);
    bodyGroup.add(fingerboard);

    const scroll = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 24, Math.PI * 1.5), woodDark);
    scroll.position.set(0, 2.72, 0);
    scroll.rotation.z = 0.4;
    bodyGroup.add(scroll);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.1, 0.055), this.sharedMaterials.cream);
    bridge.position.set(0, 1.24, 0.17);
    bodyGroup.add(bridge);

    const stringMaterial = MATERIAL(0xe9d9ae, { metalness: 0.35, roughness: 0.38 });
    [-0.12, -0.04, 0.04, 0.12].forEach((x) => {
      bodyGroup.add(
        cylinderBetween(
          new THREE.Vector3(x, 0.67, 0.17),
          new THREE.Vector3(x * 0.65, 2.62, 0.06),
          0.006,
          stringMaterial,
          5,
        ),
      );
    });

    const fHoleMaterial = MATERIAL(0x3a261c);
    [-0.2, 0.2].forEach((x) => {
      const fHole = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 5, 20, Math.PI * 1.4), fHoleMaterial);
      fHole.position.set(x, 1.15, 0.18);
      fHole.rotation.z = x < 0 ? 0.8 : -0.8;
      fHole.scale.y = 1.55;
      bodyGroup.add(fHole);
    });

    const pickup = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.045, 0.04),
      MATERIAL(color, { emissive: color, emissiveIntensity: 0.18 }),
    );
    pickup.position.set(0, 0.91, 0.19);
    bodyGroup.add(pickup);

    return {
      type: "bass",
      bodyGroup,
      bodyBaseY: bodyGroup.position.y,
      pickup,
      glowMaterials: [pickup.material],
    };
  }

  buildKeys(parent, color) {
    const frame = MATERIAL(0x735338, { roughness: 0.72 });
    const metal = MATERIAL(0x54615f, { metalness: 0.32, roughness: 0.5 });
    const barGroup = new THREE.Group();
    parent.add(barGroup);

    const legs = [
      [-0.58, 0.29, -0.62],
      [0.58, 0.29, -0.62],
      [-0.58, 0.29, 0.62],
      [0.58, 0.29, 0.62],
    ];
    legs.forEach(([x, y, z]) => {
      const leg = cylinderBetween(
        new THREE.Vector3(x * 0.8, 0.02, z),
        new THREE.Vector3(x, y, z),
        0.032,
        frame,
      );
      parent.add(leg);
    });

    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 1.46), frame);
      rail.position.set(side * 0.64, 0.37, 0);
      parent.add(rail);
    });

    const bars = [];
    const barColors = [0x4aa9a5, 0x64bdba, 0x8bcac2, 0x58b2ad, 0x75c2bc, 0x43a09d];
    const noteOrder = [0, 2, 4, 5, 7, 9];
    noteOrder.forEach((note, index) => {
      const width = 1.28 - index * 0.075;
      const bar = new THREE.Mesh(
        new RoundedBoxGeometry(width, 0.09, 0.155, 2, 0.035),
        MATERIAL(barColors[index], {
          roughness: 0.48,
          metalness: 0.08,
          emissive: barColors[index],
          emissiveIntensity: 0.12,
        }),
      );
      const z = -0.63 + index * 0.252;
      const y = 0.48 + index * 0.018;
      bar.position.set(0, y, z);
      barGroup.add(bar);
      bars.push({ mesh: bar, baseY: y, baseX: bar.position.x, delay: index * 0.055 });

      const resonator = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.26, 8), metal);
      resonator.position.set(0, 0.25, z);
      parent.add(resonator);
    });

    const malletPivots = [];
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.55, 0.82, side * 0.3);
      pivot.rotation.z = side * -0.45;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.55, 6), frame);
      stick.position.y = 0.24;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), this.sharedMaterials.cream);
      head.position.y = 0.52;
      pivot.add(stick, head);
      parent.add(pivot);
      malletPivots.push({ pivot, baseZ: pivot.rotation.z, side });
    });

    return {
      type: "keys",
      bars,
      barGroup,
      malletPivots,
      glowMaterials: bars.map((bar) => bar.mesh.material),
    };
  }

  buildBells(parent, color) {
    const bellGroup = new THREE.Group();
    parent.add(bellGroup);
    const colors = [color, 0xe7b65f, 0x76b9a5];
    const heads = [];

    for (let index = 0; index < 3; index += 1) {
      const height = 0.9 + index * 0.3;
      const side = index - 1;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.08, 0.05, 0.04),
        new THREE.Vector3(side * 0.12, height * 0.42, 0.01),
        new THREE.Vector3(side * 0.27, height * 0.75, -0.02),
        new THREE.Vector3(side * 0.34, height, 0.03),
      ]);
      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.022 - index * 0.002, 6, false),
        this.sharedMaterials.stem,
      );
      bellGroup.add(stem);

      addLeaf(
        bellGroup,
        [side * 0.12, height * 0.38, 0.01],
        [0.2, index * 1.3, side * 0.8],
        [0.45, 1.35, 0.3],
        this.sharedMaterials.leafLight,
        this.leafGeometry,
      );

      const head = new THREE.Group();
      head.position.set(side * 0.34, height, 0.03);
      head.rotation.z = side * -0.11;
      const bellMaterial = MATERIAL(colors[index], {
        roughness: 0.38,
        metalness: 0.16,
        emissive: colors[index],
        emissiveIntensity: 0.16,
        side: THREE.DoubleSide,
      });
      const bell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.155, 0.27, 18, 1, true),
        bellMaterial,
      );
      bell.position.y = -0.1;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bellMaterial);
      crown.position.y = 0.045;
      const clapper = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 6),
        MATERIAL(0xe8d7a7, { metalness: 0.25, roughness: 0.35 }),
      );
      clapper.position.y = -0.2;
      head.add(bell, crown, clapper);
      bellGroup.add(head);
      heads.push({ head, baseZ: head.rotation.z, material: bellMaterial, side, phase: index });
    }

    return {
      type: "bells",
      heads,
      bellGroup,
      glowMaterials: heads.map((headItem) => headItem.material),
    };
  }

  pulse(index) {
    const instrument = this.instruments[index];
    if (!instrument) return;
    instrument.hitAge = 0;
    instrument.strength = 1;
    instrument.ringProgress = 0;
    instrument.ring.visible = true;
  }

  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
    if (!reduced) return;
    this.pointer.set(0, 0);
    this.pointerTarget.set(0, 0);
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(this.cameraTarget);
    this.instruments.forEach((instrument) => {
      instrument.group.position.y = instrument.baseY;
      instrument.group.rotation.z = 0;
      if (instrument.type === "drums") {
        instrument.head.position.y = instrument.headBaseY;
        instrument.head.scale.set(1, 1, 1);
        instrument.stickPivots.forEach(({ pivot, baseX, baseZ }) => {
          pivot.rotation.x = baseX;
          pivot.rotation.z = baseZ;
        });
      }
      if (instrument.type === "keys") {
        instrument.bars.forEach((bar) => {
          bar.mesh.position.y = bar.baseY;
          bar.mesh.rotation.x = 0;
        });
      }
      if (instrument.type === "bells") {
        instrument.heads.forEach((head) => {
          head.head.rotation.z = head.baseZ;
          head.head.rotation.y = 0;
        });
      }
    });
  }

  bindPointer() {
    this.container.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = this.container.getBoundingClientRect();
      this.pointerTarget.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    });
    this.container.addEventListener("pointerleave", () => this.pointerTarget.set(0, 0));
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatioCap = this.softwareRenderer ? 0.72 : 1.25;
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, pixelRatioCap));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.cameraTarget.y = this.camera.aspect >= 1 ? 0.45 : 1.1;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const radius = this.camera.aspect < 0.82 ? 5.1 : 4.25;
    const distance = Math.min(38, radius / Math.sin(limitingFov / 2));
    this.camera.position
      .copy(this.cameraTarget)
      .addScaledVector(this.cameraDirection, distance);
    this.baseCameraPosition.copy(this.camera.position);
    this.camera.near = 0.1;
    this.camera.far = distance * 2.8;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.cameraTarget);
  }

  animate(now) {
    if (!this.running) return;
    const delta = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.elapsed += delta;

    if (!this.reducedMotion) {
      this.pointer.lerp(this.pointerTarget, 0.045);
      const cameraOffsetX = this.pointer.x * 0.22;
      const cameraOffsetY = -this.pointer.y * 0.13;
      this.camera.position.copy(this.baseCameraPosition);
      this.camera.position.x += cameraOffsetX;
      this.camera.position.y += cameraOffsetY;
      this.camera.lookAt(this.cameraTarget);
    }

    this.instruments.forEach((instrument, index) => {
      instrument.hitAge += delta;
      const impact = Math.exp(-instrument.hitAge * 7.5);
      const idle = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.8 + index * 1.8) * 0.012;
      instrument.group.position.y = instrument.baseY + idle;
      instrument.group.rotation.y = instrument.baseRotationY;
      instrument.light.intensity = 0.18 + impact * 2.2;

      if (instrument.type === "drums") {
        const bounce = this.reducedMotion ? 0 : impact * Math.sin(instrument.hitAge * 30) * 0.025;
        instrument.head.position.y = instrument.headBaseY + Math.abs(bounce) * 0.6;
        instrument.head.scale.x = 1 + Math.abs(bounce) * 1.8;
        instrument.head.scale.z = 1 + Math.abs(bounce) * 1.8;
        instrument.cap.position.y = instrument.capBaseY + Math.abs(bounce) * 0.3;
        instrument.stickPivots.forEach(({ pivot, baseX, baseZ, side }) => {
          const strike = this.reducedMotion ? 0 : impact * Math.sin(instrument.hitAge * 25) * 0.22;
          pivot.rotation.x = baseX + strike;
          pivot.rotation.z = baseZ + side * strike * 0.35;
        });
      }

      if (instrument.type === "bass") {
        const sway = this.reducedMotion ? 0 : impact * Math.sin(instrument.hitAge * 16) * 0.055;
        instrument.group.rotation.z = sway;
        instrument.bodyGroup.position.y = instrument.bodyBaseY + (this.reducedMotion ? 0 : impact * 0.018);
        instrument.pickup.material.emissiveIntensity = 0.18 + impact * 1.45;
      }

      if (instrument.type === "keys") {
        instrument.bars.forEach((bar) => {
          const wave = Math.max(0, Math.sin((instrument.hitAge - bar.delay) * 27));
          const motion = this.reducedMotion ? 0 : wave * impact * 0.095;
          bar.mesh.position.y = bar.baseY + motion;
          bar.mesh.rotation.x = motion * 1.8;
          bar.mesh.material.emissiveIntensity = 0.12 + impact * 1.35;
        });
        instrument.malletPivots.forEach(({ pivot, baseZ, side }) => {
          const motion = this.reducedMotion ? 0 : impact * Math.sin(instrument.hitAge * 24) * 0.18;
          pivot.rotation.z = baseZ + side * motion;
        });
      }

      if (instrument.type === "bells") {
        instrument.heads.forEach((head) => {
          const sway = this.reducedMotion
            ? 0
            : impact * Math.sin(instrument.hitAge * 18 + head.phase * 1.8) * 0.2;
          head.head.rotation.z = head.baseZ + sway;
          head.head.rotation.y = sway * 1.7;
          head.head.scale.setScalar(1 + impact * 0.075);
          head.material.emissiveIntensity = 0.16 + impact * 1.6;
        });
      }

      if (instrument.ringProgress < 1) {
        instrument.ringProgress = Math.min(1, instrument.ringProgress + delta * 1.7);
        const ringScale = 0.78 + instrument.ringProgress * (this.reducedMotion ? 0.5 : 1.45);
        instrument.ring.scale.setScalar(ringScale);
        instrument.ring.material.opacity = (1 - instrument.ringProgress) * (this.reducedMotion ? 0.32 : 0.52);
        if (instrument.ringProgress >= 1) instrument.ring.visible = false;
      }
    });

    if (this.fireflies && !this.reducedMotion) {
      const position = this.fireflies.geometry.attributes.position;
      this.fireflySeeds.forEach((seed, index) => {
        position.setY(
          index,
          seed.y + Math.sin(this.elapsed * 0.6 + seed.phase) * 0.16,
        );
      });
      position.needsUpdate = true;
      this.fireflies.material.opacity = 0.66 + Math.sin(this.elapsed * 1.3) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  destroy() {
    this.running = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
