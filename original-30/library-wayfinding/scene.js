import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DESTINATIONS, FLOOR_META, NODES } from "./data.js";

const DESTINATION_BY_ID = new Map(DESTINATIONS.map((destination) => [destination.id, destination]));
const CAMERA_OFFSET = new THREE.Vector3(31, 34, 31);
const MATERIAL_COLORS = {
  wall: 0xeee1ca,
  wallInner: 0xf5ead8,
  wallTop: 0xc9b99e,
  plinth: 0x1d3c34,
  plinthTrim: 0xa77a37,
  wood: 0x8d6c48,
  woodLight: 0xba9465,
  woodDark: 0x533f2d,
  metal: 0x6d796f,
  brass: 0xc69b4a,
  dark: 0x203c35,
  paper: 0xf4e9d5,
  cream: 0xfff8e9,
  glass: 0x82b5aa,
  route: 0xf06a45,
  routeCasing: 0xfff1d6,
  start: 0x56c3a3,
};

const BOOK_COLORS = [0xb8583d, 0x3e7969, 0xd2a548, 0x49647f, 0x7a5d8e, 0xc68149, 0x6e8a4d, 0x9c4a4a];

const GROUND_SURFACES = [
  { x1: -10.05, z1: -6.85, x2: 10.05, z2: 7.18, color: 0xe6dcc8, kind: "base" },
  { x1: -10.05, z1: -1.25, x2: 10.05, z2: 1.25, color: 0xe1d7c4, kind: "corridor" },
  { x1: -2.18, z1: 1.25, x2: 2.18, z2: 7.18, color: 0xe9dfcc, kind: "corridor", destId: "entrance" },
  { x1: -10.05, z1: 1.25, x2: -2.18, z2: 7.18, color: 0xead6a1, roomId: "children", destId: "children" },
  { x1: 2.18, z1: 2.42, x2: 7.4, z2: 7.18, color: 0xcbdcd6, roomId: "help", destId: "help" },
  { x1: 7.4, z1: 2.42, x2: 10.05, z2: 7.18, color: 0xddd2be, roomId: "staff" },
  { x1: 2.18, z1: 1.25, x2: 7.4, z2: 2.42, color: 0xe4d9c5, kind: "corridor" },
  { x1: -10.05, z1: -6.85, x2: -4.18, z2: -1.25, color: 0xdfbeb4, roomId: "meeting1", destId: "meeting1" },
  { x1: 4.18, z1: -6.85, x2: 10.05, z2: -1.25, color: 0xc9ddd5, roomId: "toilets", destId: "toilets" },
  { x1: -4.18, z1: -6.85, x2: 4.18, z2: -1.25, color: 0xcfc9bb, kind: "core" },
];

const UPPER_SURFACES = [
  { x1: -10.05, z1: -6.85, x2: 10.05, z2: 7.18, color: 0xe6dcc8, kind: "base" },
  { x1: -10.05, z1: -1.25, x2: 10.05, z2: 1.25, color: 0xe0d6c4, kind: "corridor" },
  { x1: -2.18, z1: 1.25, x2: 2.18, z2: 7.18, color: 0xe8deca, kind: "corridor" },
  { x1: -10.05, z1: -6.85, x2: -4.18, z2: -1.25, color: 0xd6cfe2, roomId: "reading", destId: "reading" },
  { x1: 4.18, z1: -6.85, x2: 10.05, z2: -1.25, color: 0xe1c5c0, roomId: "meeting2", destId: "meeting2" },
  { x1: -10.05, z1: 1.25, x2: -2.18, z2: 7.18, color: 0xdcd5c4, roomId: "lounge" },
  { x1: 2.18, z1: 1.25, x2: 7.35, z2: 7.18, color: 0xd4ddd3, roomId: "study" },
  { x1: 7.35, z1: 2.42, x2: 10.05, z2: 7.18, color: 0xe1d8c8, roomId: "archive" },
  { x1: 7.35, z1: 1.25, x2: 10.05, z2: 2.42, color: 0xe4d9c5, kind: "corridor" },
  { x1: -4.18, z1: -6.85, x2: 4.18, z2: -1.25, color: 0xcec8bb, kind: "core" },
];

function createCanvasTexture(size, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createGrainTexture() {
  const texture = createCanvasTexture(192, (context, size) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 1350; index += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const alpha = 0.025 + Math.random() * 0.06;
      context.fillStyle = `rgba(111, 91, 63, ${alpha})`;
      context.fillRect(x, y, Math.random() * 1.5 + 0.5, Math.random() * 1.5 + 0.5);
    }
  });
  texture.repeat.set(4.5, 3.2);
  return texture;
}

function createWoodTexture() {
  const texture = createCanvasTexture(256, (context, size) => {
    context.fillStyle = "#927049";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 48; index += 1) {
      const y = Math.random() * size;
      context.strokeStyle = `rgba(${50 + Math.random() * 35}, ${32 + Math.random() * 25}, ${20 + Math.random() * 16}, ${0.06 + Math.random() * 0.13})`;
      context.lineWidth = 0.5 + Math.random() * 1.2;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(size * 0.28, y + Math.random() * 8 - 4, size * 0.65, y + Math.random() * 8 - 4, size, y + Math.random() * 4 - 2);
      context.stroke();
    }
  });
  texture.repeat.set(2, 2);
  return texture;
}

export class DirectoryScene {
  constructor(container, { onSelect, onHover } = {}) {
    this.container = container;
    this.onSelect = onSelect || (() => {});
    this.onHover = onHover || (() => {});
    this.floorGroups = {};
    this.destinationVisuals = new Map();
    this.pickables = [];
    this.routeGroups = {};
    this.hoveredId = null;
    this.selectedId = null;
    this.activeFloor = "overview";
    this.randomSeed = 9182;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.viewTarget = new THREE.Vector3(0, 0.45, 0);
    this.goalTarget = new THREE.Vector3(0, 0.45, 0);
    this.currentZoom = 1;
    this.goalZoom = 1;
    this.baseViewHeight = 46;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 260);
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(this.viewTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "scene-labels";
    Object.assign(this.labelRenderer.domElement.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      overflow: "hidden",
    });
    container.appendChild(this.labelRenderer.domElement);

    this.createMaterials();
    this.setupLights();
    this.buildStage();
    this.buildFloor("ground");
    this.buildFloor("upper");
    this.buildUtilityLabels();
    this.bindPointerEvents();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setFloor("overview", false);
    this.renderer.setAnimationLoop(() => this.animate());
  }

  random() {
    this.randomSeed = (this.randomSeed * 16807) % 2147483647;
    return (this.randomSeed - 1) / 2147483646;
  }

  createMaterials() {
    this.textures = {
      grain: createGrainTexture(),
      wood: createWoodTexture(),
    };

    const standard = (color, options = {}) => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.02,
      ...options,
    });

    this.materials = {
      wall: standard(MATERIAL_COLORS.wall, { roughness: 0.9 }),
      wallInner: standard(MATERIAL_COLORS.wallInner, { roughness: 0.9 }),
      wallTop: standard(MATERIAL_COLORS.wallTop, { roughness: 0.85 }),
      plinth: standard(MATERIAL_COLORS.plinth, { roughness: 0.74 }),
      plinthTrim: standard(MATERIAL_COLORS.plinthTrim, { roughness: 0.5, metalness: 0.2 }),
      wood: standard(MATERIAL_COLORS.wood, { map: this.textures.wood, roughness: 0.7 }),
      woodLight: standard(MATERIAL_COLORS.woodLight, { map: this.textures.wood, roughness: 0.72 }),
      woodDark: standard(MATERIAL_COLORS.woodDark, { roughness: 0.78 }),
      metal: standard(MATERIAL_COLORS.metal, { roughness: 0.3, metalness: 0.72 }),
      brass: standard(MATERIAL_COLORS.brass, { roughness: 0.3, metalness: 0.65 }),
      dark: standard(MATERIAL_COLORS.dark, { roughness: 0.7 }),
      paper: standard(MATERIAL_COLORS.paper, { roughness: 0.95 }),
      cream: standard(MATERIAL_COLORS.cream, { roughness: 0.9 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: MATERIAL_COLORS.glass,
        transparent: true,
        opacity: 0.25,
        roughness: 0.08,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      route: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.route, toneMapped: false }),
      routeCasing: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.routeCasing, transparent: true, opacity: 0.9, toneMapped: false }),
      start: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.start, toneMapped: false }),
    };

    this.bookMaterials = BOOK_COLORS.map((color) => standard(color, { roughness: 0.9 }));
    this.chairMaterials = [0x486d63, 0xb96548, 0xd0a64e, 0x59718a].map((color) => standard(color, { roughness: 0.9 }));
  }

  setupLights() {
    const hemisphere = new THREE.HemisphereLight(0xfff5de, 0x163b33, 2.25);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xfff1d5, 3.4);
    sun.position.set(-18, 31, 24);
    sun.castShadow = false;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb7d8cf, 1.45);
    fill.position.set(23, 19, -21);
    this.scene.add(fill);

    const glow = new THREE.PointLight(0xe7b85d, 9, 28, 1.8);
    glow.position.set(0, 8, 3);
    this.scene.add(glow);
  }

  buildStage() {
    const floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(94, 68),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.2 }),
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.y = -0.67;
    this.scene.add(floorShadow);

    const stageDisc = new THREE.Mesh(
      new THREE.CircleGeometry(31, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a241f, transparent: true, opacity: 0.26, depthWrite: false }),
    );
    stageDisc.rotation.x = -Math.PI / 2;
    stageDisc.position.set(0, -0.64, 0);
    this.scene.add(stageDisc);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(22.5, 22.72, 96),
      new THREE.MeshBasicMaterial({ color: 0xd4ac5b, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, -0.62, 0);
    this.scene.add(ring);
  }

  buildFloor(floorId) {
    const meta = FLOOR_META[floorId];
    const group = new THREE.Group();
    group.name = `${floorId}-floor`;
    group.position.set(meta.offsetX, 0, meta.offsetZ);
    group.userData.floorId = floorId;
    this.scene.add(group);
    this.floorGroups[floorId] = group;

    this.buildFloorBase(group);
    this.buildFloorSurfaces(group, floorId);
    this.buildWalls(group, floorId);
    this.buildFloorDetails(group, floorId);
    this.buildFurniture(group, floorId);
    this.buildDestinationMarkers(group, floorId);
    this.mergeStaticMeshes(group);
  }

  buildFloorBase(group) {
    this.addBox(group, 21.2, 0.38, 15.2, 0, -0.29, 0, this.materials.plinth);
    this.addBox(group, 20.84, 0.16, 14.84, 0, -0.06, 0, this.materials.wallInner, { castShadow: false });
    this.addBox(group, 21.0, 0.045, 15.0, 0, -0.2, 0, this.materials.plinthTrim, { castShadow: false });
    this.addBox(group, 20.62, 0.12, 14.62, 0, 0.01, 0, this.materials.paper, { castShadow: false });
  }

  buildFloorSurfaces(group, floorId) {
    const surfaces = floorId === "ground" ? GROUND_SURFACES : UPPER_SURFACES;
    for (const surface of surfaces) {
      const width = surface.x2 - surface.x1;
      const depth = surface.z2 - surface.z1;
      const x = (surface.x1 + surface.x2) / 2;
      const z = (surface.z1 + surface.z2) / 2;
      const material = new THREE.MeshStandardMaterial({
        color: surface.color,
        map: this.textures.grain,
        roughness: surface.kind === "corridor" ? 0.88 : 0.94,
        metalness: 0,
        emissive: new THREE.Color(surface.color),
        emissiveIntensity: 0,
      });
      const mesh = this.addBox(group, width, 0.065, depth, x, 0.075, z, material, { castShadow: false, receiveShadow: true });
      if (surface.destId) {
        mesh.userData.destinationId = surface.destId;
        mesh.userData.floorId = floorId;
        this.pickables.push(mesh);
        const existing = this.destinationVisuals.get(surface.destId);
        if (!existing || surface.roomId) {
          this.destinationVisuals.set(surface.destId, { ...(existing || {}), roomMaterial: material, roomMesh: mesh });
        }
      }
      if (surface.kind === "corridor") {
        this.addBox(group, width - 0.35, 0.013, Math.min(1.25, depth * 0.5), x, 0.112, z, this.materials.wallInner, { castShadow: false, receiveShadow: false });
      }
    }

    const corridorInlay = new THREE.MeshBasicMaterial({ color: 0xc6a45e, transparent: true, opacity: 0.38, depthWrite: false });
    this.addBox(group, 18.8, 0.018, 0.055, 0, 0.13, 0.96, corridorInlay, { castShadow: false, receiveShadow: false });
    this.addBox(group, 18.8, 0.018, 0.055, 0, 0.13, -0.96, corridorInlay, { castShadow: false, receiveShadow: false });

    if (floorId === "ground") {
      this.addRug(group, -6.35, 4.55, 3.4, 2.8, 0xd9b66c, true);
      this.addRug(group, -7.7, -4.2, 3.0, 2.25, 0xc98e7d, false);
    } else {
      this.addRug(group, 7.5, -4.15, 2.8, 2.2, 0xbe655e, false);
      this.addRug(group, -7.5, -4.15, 3.1, 2.3, 0x9483b1, false);
    }
  }

  addRug(group, x, z, width, depth, color, round = false) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    if (round) {
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, 0.035, 40), material);
      rug.position.set(x, 0.15, z);
      rug.receiveShadow = true;
      group.add(rug);
    } else {
      this.addBox(group, width, 0.035, depth, x, 0.15, z, material, { castShadow: false, receiveShadow: true });
    }
  }

  buildWalls(group, floorId) {
    const wallHeight = 0.92;
    const outside = this.materials.wall;
    const inner = this.materials.wallInner;

    this.addWall(group, -10.13, -6.88, 10.13, -6.88, wallHeight, 0.14, outside);
    this.addWall(group, -10.13, -6.88, -10.13, 7.18, wallHeight, 0.14, outside);
    this.addWall(group, 10.13, -6.88, 10.13, 7.18, wallHeight, 0.14, outside);
    this.addWall(group, -10.13, 7.17, -2.2, 7.17, wallHeight, 0.14, outside);
    this.addWall(group, 2.2, 7.17, 10.13, 7.17, wallHeight, 0.14, outside);

    this.buildEntrance(group);

    if (floorId === "ground") {
      this.addWall(group, -10.05, 1.25, -6.95, 1.25, 0.78, 0.11, inner);
      this.addWall(group, -5.45, 1.25, -2.2, 1.25, 0.78, 0.11, inner);
      this.addWall(group, -2.2, 1.25, -2.2, 7.17, 0.78, 0.11, inner);
      this.addDoorway(group, -6.2, 1.25, 1.5, 0.86, "x");

      this.addWall(group, -10.05, -1.25, -7.15, -1.25, 0.8, 0.11, inner);
      this.addWall(group, -5.95, -1.25, -4.18, -1.25, 0.8, 0.11, inner);
      this.addWall(group, -4.18, -6.88, -4.18, -1.25, 0.8, 0.11, inner);
      this.addDoorway(group, -6.55, -1.25, 1.2, 0.88, "x");

      this.addWall(group, 4.18, -6.88, 4.18, -1.25, 0.8, 0.11, inner);
      this.addWall(group, 4.18, -1.25, 6.58, -1.25, 0.8, 0.11, inner);
      this.addWall(group, 7.92, -1.25, 10.05, -1.25, 0.8, 0.11, inner);
      this.addDoorway(group, 7.25, -1.25, 1.34, 0.88, "x");

      this.addWall(group, 7.4, 2.42, 10.05, 2.42, 0.65, 0.1, inner);
      this.addArcade(group, 2.2, 2.75, 7.17, 4.8, 0.88);
    } else {
      this.addWall(group, -10.05, -1.25, -7.15, -1.25, 0.8, 0.11, inner);
      this.addWall(group, -5.95, -1.25, -4.18, -1.25, 0.8, 0.11, inner);
      this.addWall(group, -4.18, -6.88, -4.18, -1.25, 0.8, 0.11, inner);
      this.addDoorway(group, -6.55, -1.25, 1.2, 0.88, "x");

      this.addWall(group, 4.18, -6.88, 4.18, -1.25, 0.8, 0.11, inner);
      this.addWall(group, 4.18, -1.25, 6.58, -1.25, 0.8, 0.11, inner);
      this.addWall(group, 7.92, -1.25, 10.05, -1.25, 0.8, 0.11, inner);
      this.addDoorway(group, 7.25, -1.25, 1.34, 0.88, "x");

      this.addWall(group, -2.2, 1.25, -2.2, 7.17, 0.7, 0.1, inner);
      this.addWall(group, -7.9, 1.25, -2.2, 1.25, 0.7, 0.1, inner);
      this.addDoorway(group, -8.45, 1.25, 1.1, 0.78, "x");
      this.addWall(group, 7.35, 2.42, 10.05, 2.42, 0.65, 0.1, inner);
      this.addArcade(group, 2.2, 2.75, 7.17, 4.8, 0.88);
    }

    this.buildStairRail(group, floorId);
    this.buildLiftShaft(group, floorId);
  }

  addWall(group, x1, z1, x2, z2, height, thickness, material) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const wall = this.addBox(group, length, height, thickness, (x1 + x2) / 2, height / 2 + 0.06, (z1 + z2) / 2, material);
    wall.rotation.y = -angle;
    const top = this.addBox(group, length, 0.045, thickness + 0.025, 0, height + 0.07, 0, this.materials.wallTop, { castShadow: false });
    top.position.copy(wall.position);
    top.rotation.y = -angle;
  }

  addDoorway(group, x, z, width, height, axis = "x") {
    const frame = this.materials.brass;
    if (axis === "x") {
      this.addBox(group, 0.11, height, 0.19, x - width / 2, height / 2 + 0.07, z, frame);
      this.addBox(group, 0.11, height, 0.19, x + width / 2, height / 2 + 0.07, z, frame);
      this.addBox(group, width + 0.11, 0.1, 0.19, x, height + 0.08, z, frame);
      this.addBox(group, width, 0.025, 0.55, x, 0.13, z, this.materials.wallTop, { castShadow: false, receiveShadow: false });
    } else {
      this.addBox(group, 0.19, height, 0.11, x, height / 2 + 0.07, z - width / 2, frame);
      this.addBox(group, 0.19, height, 0.11, x, height / 2 + 0.07, z + width / 2, frame);
      this.addBox(group, 0.19, 0.1, width + 0.11, x, height + 0.08, z, frame);
    }
  }

  addArcade(group, x, z1, z2, openingZ, height) {
    this.addBox(group, 0.13, height, 0.16, x, height / 2 + 0.07, z1, this.materials.brass);
    this.addBox(group, 0.13, height, 0.16, x, height / 2 + 0.07, openingZ - 1.15, this.materials.brass);
    this.addBox(group, 0.13, height, 0.16, x, height / 2 + 0.07, openingZ + 1.15, this.materials.brass);
    this.addBox(group, 0.13, height, 0.16, x, height / 2 + 0.07, z2, this.materials.brass);
    this.addBox(group, 0.13, 0.1, z2 - z1, x, height + 0.08, (z1 + z2) / 2, this.materials.brass);
  }

  buildEntrance(group) {
    this.addBox(group, 4.2, 0.035, 1.15, 0, 0.12, 6.55, this.materials.dark, { castShadow: false, receiveShadow: false });
    for (const x of [-2.1, -0.72, 0.72, 2.1]) {
      this.addBox(group, 0.07, 1.25, 0.09, x, 0.69, 7.12, this.materials.brass);
    }
    const glassLeft = this.addBox(group, 1.32, 1.05, 0.025, -1.41, 0.59, 7.12, this.materials.glass, { castShadow: false, receiveShadow: false });
    const glassRight = this.addBox(group, 1.32, 1.05, 0.025, 1.41, 0.59, 7.12, this.materials.glass, { castShadow: false, receiveShadow: false });
    glassLeft.renderOrder = 2;
    glassRight.renderOrder = 2;
    this.addBox(group, 4.5, 0.11, 1.1, 0, 1.42, 7.42, this.materials.brass);
    this.addBox(group, 4.15, 0.05, 0.88, 0, 1.48, 7.42, this.materials.dark, { castShadow: false });
    this.addBox(group, 0.08, 1.42, 0.08, -2.08, 0.75, 7.88, this.materials.brass);
    this.addBox(group, 0.08, 1.42, 0.08, 2.08, 0.75, 7.88, this.materials.brass);
  }

  buildStairRail(group, floorId) {
    this.addBox(group, 2.45, 0.035, 3.25, -2.15, 0.14, -3.55, this.materials.dark, { castShadow: false, receiveShadow: false });
    const steps = 12;
    for (let index = 0; index < steps; index += 1) {
      const height = 0.11 + index * 0.105;
      const z = -2.05 - index * 0.25;
      this.addBox(group, 2.08, height, 0.29, -2.15, height / 2 + 0.1, z, index % 2 === 0 ? this.materials.woodLight : this.materials.wood, { castShadow: true });
    }
    this.addBox(group, 2.08, 0.08, 0.54, -2.15, 1.39, -5.02, this.materials.woodDark);

    for (const x of [-3.18, -1.12]) {
      this.addCylinderBetween(
        group,
        new THREE.Vector3(x, 0.66, -1.85),
        new THREE.Vector3(x, 1.83, -4.83),
        0.035,
        this.materials.brass,
      );
      for (const z of [-1.85, -2.6, -3.35, -4.1, -4.83]) {
        const topY = 0.68 + ((-z - 1.85) / 2.98) * 1.16;
        this.addBox(group, 0.035, 0.6, 0.035, x, topY - 0.3, z, this.materials.brass, { castShadow: false });
      }
    }

    const downArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.42, 3),
      new THREE.MeshBasicMaterial({ color: 0xe8c572, toneMapped: false }),
    );
    downArrow.position.set(-2.15, 1.6, -3.4);
    downArrow.rotation.x = Math.PI / 2;
    group.add(downArrow);
  }

  buildLiftShaft(group, floorId) {
    const x = 1.4;
    const z = -3.0;
    this.addBox(group, 2.5, 0.04, 2.95, x, 0.14, z, this.materials.dark, { castShadow: false, receiveShadow: false });
    this.addBox(group, 2.34, 0.07, 2.78, x, 0.17, z, this.materials.woodLight, { castShadow: false });
    for (const cornerX of [x - 1.13, x + 1.13]) {
      for (const cornerZ of [z - 1.34, z + 1.34]) {
        this.addBox(group, 0.075, 1.95, 0.075, cornerX, 1.12, cornerZ, this.materials.brass);
      }
    }
    const back = this.addBox(group, 2.28, 1.82, 0.035, x, 1.09, z - 1.3, this.materials.glass, { castShadow: false, receiveShadow: false });
    const left = this.addBox(group, 0.035, 1.82, 2.58, x - 1.1, 1.09, z, this.materials.glass, { castShadow: false, receiveShadow: false });
    const right = this.addBox(group, 0.035, 1.82, 2.58, x + 1.1, 1.09, z, this.materials.glass, { castShadow: false, receiveShadow: false });
    back.renderOrder = 2;
    left.renderOrder = 2;
    right.renderOrder = 2;
    this.addBox(group, 0.78, 1.42, 0.045, x - 0.4, 0.91, z + 1.36, this.materials.metal);
    this.addBox(group, 0.78, 1.42, 0.045, x + 0.4, 0.91, z + 1.36, this.materials.metal);
    this.addBox(group, 1.68, 0.09, 0.07, x, 1.66, z + 1.37, this.materials.brass);
    this.addBox(group, 0.12, 0.28, 0.06, x + 1.56, 0.95, z + 1.39, this.materials.dark);
  }

  buildFloorDetails(group, floorId) {
    const signMaterial = new THREE.MeshBasicMaterial({ color: 0x254a40, toneMapped: false });
    if (floorId === "ground") {
      this.addBox(group, 0.9, 0.42, 0.04, -2.15, 1.22, -1.31, signMaterial, { castShadow: false });
    } else {
      this.addBox(group, 0.9, 0.42, 0.04, -2.15, 1.22, -1.31, signMaterial, { castShadow: false });
    }
  }

  buildFurniture(group, floorId) {
    if (floorId === "ground") {
      this.buildChildrensFurniture(group);
      this.buildHelpDesk(group);
      this.buildMeetingRoom(group, -8.25, -4.22, 2.7, 1.32, 1);
      this.buildToilets(group);
      this.buildEntranceFurniture(group);
    } else {
      this.buildReadingRoom(group);
      this.buildMeetingRoom(group, 8.3, -4.23, 2.5, 1.2, 2);
      this.buildLounge(group);
      this.buildStudyArea(group);
    }
  }

  buildChildrensFurniture(group) {
    this.addBookshelf(group, -9.45, 3.15, 2.45, 0.5, Math.PI / 2, 1.28);
    this.addBookshelf(group, -9.45, 5.62, 1.85, 0.5, Math.PI / 2, 1.12);
    this.addBookshelf(group, -7.15, 6.67, 3.3, 0.46, 0, 0.98);
    this.addReadingTable(group, -8.05, 4.95, 1.8, 0.78, 2, 0);
    this.addReadingTable(group, -3.8, 5.42, 1.35, 0.7, 1, Math.PI / 2);
    this.addBeanBag(group, -4.25, 3.05, 0xbc6b4e);
    this.addBeanBag(group, -4.95, 2.35, 0x4c8374);
    this.addPlant(group, -3.2, 6.5, 0.65);
    this.addLowShelf(group, -2.75, 3.6, 0.42, 1.5, Math.PI / 2, 0xd0a74e);
    const stars = [0xe1b14c, 0xd97151, 0x4e8e80];
    for (let index = 0; index < 5; index += 1) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.012, 20), new THREE.MeshStandardMaterial({ color: stars[index % 3], roughness: 1 }));
      disc.position.set(-8.6 + index * 0.63, 0.19, 3.68 + (index % 2) * 0.42);
      group.add(disc);
    }
  }

  buildHelpDesk(group) {
    this.addBox(group, 3.5, 0.78, 0.74, 4.55, 0.47, 5.32, this.materials.wood);
    this.addBox(group, 3.66, 0.09, 0.9, 4.55, 0.9, 5.32, this.materials.woodLight);
    this.addBox(group, 0.72, 0.78, 1.55, 6.08, 0.47, 4.65, this.materials.wood);
    this.addBox(group, 0.85, 0.09, 1.7, 6.08, 0.9, 4.65, this.materials.woodLight);
    for (const x of [3.65, 5.35]) {
      this.addBox(group, 0.48, 0.36, 0.06, x, 1.15, 5.45, this.materials.dark);
      this.addBox(group, 0.44, 0.28, 0.035, x, 1.16, 5.41, new THREE.MeshBasicMaterial({ color: 0x9fc9bf, toneMapped: false }), { castShadow: false });
      this.addBox(group, 0.08, 0.18, 0.08, x, 0.98, 5.45, this.materials.metal, { castShadow: false });
    }
    this.addOfficeChair(group, 4.55, 6.12, Math.PI);
    this.addOfficeChair(group, 5.5, 4.25, -Math.PI / 2);
    this.addPlant(group, 7.0, 6.65, 0.8);
    this.addBookshelf(group, 9.2, 5.3, 2.15, 0.48, Math.PI / 2, 1.2);
    this.addLowShelf(group, 8.0, 7.0, 1.45, 0.44, 0, 0xe6d7bb);
  }

  buildMeetingRoom(group, x, z, tableWidth, tableDepth, chairs) {
    this.addBox(group, tableWidth, 0.12, tableDepth, x, 0.74, z, this.materials.wood);
    for (const offsetX of [-tableWidth / 2 + 0.23, tableWidth / 2 - 0.23]) {
      for (const offsetZ of [-tableDepth / 2 + 0.19, tableDepth / 2 - 0.19]) {
        this.addBox(group, 0.08, 0.7, 0.08, x + offsetX, 0.39, z + offsetZ, this.materials.woodDark);
      }
    }
    if (chairs >= 6) {
      for (const offset of [-0.75, 0, 0.75]) {
        this.addChair(group, x + offset, z - tableDepth / 2 - 0.44, 0, 1);
        this.addChair(group, x + offset, z + tableDepth / 2 + 0.44, Math.PI, 2);
      }
    } else {
      for (const offset of [-0.55, 0.55]) {
        this.addChair(group, x + offset, z - tableDepth / 2 - 0.44, 0, 1);
        this.addChair(group, x + offset, z + tableDepth / 2 + 0.44, Math.PI, 2);
      }
      this.addChair(group, x - tableWidth / 2 - 0.44, z, Math.PI / 2, 3);
    }
    this.addBox(group, 1.3, 0.76, 0.05, x, 1.05, z - tableDepth - 1.38, this.materials.dark, { castShadow: false });
    this.addBox(group, 1.18, 0.64, 0.025, x, 1.06, z - tableDepth - 1.35, new THREE.MeshBasicMaterial({ color: 0xcfe1d8, toneMapped: false }), { castShadow: false });
    this.addPlant(group, x + tableWidth / 2 + 0.9, z + 1.1, 0.6);
  }

  buildToilets(group) {
    this.addBox(group, 2.9, 0.02, 2.0, 7.25, 0.16, -5.55, this.materials.wallInner, { castShadow: false, receiveShadow: false });
    for (let index = 0; index < 3; index += 1) {
      const x = 5.75 + index * 1.22;
      this.addBox(group, 0.07, 1.0, 1.62, x + 0.58, 0.62, -5.38, this.materials.wallInner);
      const toilet = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.32, 16), this.materials.cream);
      toilet.position.set(x, 0.33, -5.55);
      toilet.castShadow = true;
      group.add(toilet);
      const tank = this.addBox(group, 0.5, 0.56, 0.2, x, 0.53, -6.25, this.materials.cream);
      tank.castShadow = true;
    }
    for (let index = 0; index < 3; index += 1) {
      const sinkX = 5.8 + index * 1.25;
      const basin = this.addBox(group, 0.54, 0.12, 0.4, sinkX, 0.76, -2.35, this.materials.cream);
      basin.castShadow = true;
      this.addBox(group, 0.06, 0.52, 0.06, sinkX, 0.44, -2.35, this.materials.metal, { castShadow: false });
    }
    const mirror = this.addBox(group, 3.8, 0.75, 0.035, 7.15, 1.15, -2.12, this.materials.glass, { castShadow: false, receiveShadow: false });
    mirror.renderOrder = 2;
  }

  buildEntranceFurniture(group) {
    this.addBench(group, -1.7, 2.45, Math.PI / 2);
    this.addBench(group, 1.7, 2.45, -Math.PI / 2);
    this.addPlant(group, -1.75, 6.75, 0.62);
    this.addPlant(group, 1.75, 6.75, 0.62);
    this.addBox(group, 0.78, 0.8, 0.48, 0, 0.58, 2.8, this.materials.woodDark);
    this.addBox(group, 0.64, 0.62, 0.035, 0, 0.63, 2.55, new THREE.MeshBasicMaterial({ color: 0xeee5d3, toneMapped: false }), { castShadow: false });
  }

  buildReadingRoom(group) {
    this.addBookshelf(group, -9.48, -3.55, 3.1, 0.5, Math.PI / 2, 1.45);
    this.addBookshelf(group, -9.48, -5.9, 1.65, 0.5, Math.PI / 2, 1.3);
    this.addBookshelf(group, -7.55, -6.58, 3.5, 0.47, 0, 1.28);
    this.addReadingTable(group, -8.3, -4.35, 2.8, 0.82, 4, 0);
    this.addReadingTable(group, -8.2, -2.45, 2.35, 0.76, 3, 0);
    this.addLoungeChair(group, -5.25, -5.45, Math.PI * 0.16, 0x8f7fa9);
    this.addLoungeChair(group, -5.05, -4.35, -Math.PI * 0.1, 0x4e7d70);
    this.addPlant(group, -4.85, -6.28, 0.72);
    this.addBox(group, 1.3, 0.75, 0.05, -6.4, 1.12, -6.58, this.materials.dark, { castShadow: false });
  }

  buildLounge(group) {
    this.addRug(group, -6.3, 4.45, 3.45, 2.4, 0xbfa87e, false);
    this.addSofa(group, -7.15, 5.52, 0, 0x4e7168);
    this.addSofa(group, -5.05, 3.28, Math.PI, 0xa66d54);
    this.addReadingTable(group, -6.15, 4.32, 1.65, 0.72, 2, 0);
    this.addBookshelf(group, -9.45, 3.8, 2.75, 0.48, Math.PI / 2, 1.35);
    this.addPlant(group, -3.05, 6.45, 0.75);
    this.addPlant(group, -8.85, 6.45, 0.6);
  }

  buildStudyArea(group) {
    this.addReadingTable(group, 4.5, 4.8, 2.45, 0.78, 3, 0);
    this.addReadingTable(group, 8.35, 5.65, 1.8, 0.72, 2, Math.PI / 2);
    this.addBookshelf(group, 9.55, 4.5, 2.2, 0.48, Math.PI / 2, 1.28);
    this.addBookshelf(group, 5.15, 6.7, 2.4, 0.47, 0, 1.05);
    this.addPlant(group, 8.8, 6.45, 0.65);
    this.addPlant(group, 3.2, 6.55, 0.55);
  }

  addBookshelf(group, x, z, width, depth, rotationY, height) {
    const shelf = new THREE.Group();
    shelf.position.set(x, 0, z);
    shelf.rotation.y = rotationY;
    group.add(shelf);
    this.addBox(shelf, width, 0.11, depth, 0, 0.11, 0, this.materials.woodDark);
    this.addBox(shelf, width, height, 0.08, 0, height / 2 + 0.14, -depth / 2 + 0.04, this.materials.woodDark);
    this.addBox(shelf, 0.08, height, depth, -width / 2 + 0.04, height / 2 + 0.14, 0, this.materials.woodDark);
    this.addBox(shelf, 0.08, height, depth, width / 2 - 0.04, height / 2 + 0.14, 0, this.materials.woodDark);
    const levels = Math.max(2, Math.floor(height / 0.36));
    for (let level = 0; level <= levels; level += 1) {
      const shelfY = 0.18 + (level / levels) * (height - 0.08);
      this.addBox(shelf, width - 0.12, 0.055, depth - 0.03, 0, shelfY, 0, this.materials.woodLight, { castShadow: false });
      if (level === levels) continue;
      let cursor = -width / 2 + 0.14;
      while (cursor < width / 2 - 0.17) {
        const bookWidth = 0.055 + this.random() * 0.055;
        const bookHeight = 0.17 + this.random() * 0.12;
        const material = this.bookMaterials[Math.floor(this.random() * this.bookMaterials.length)];
        this.addBox(shelf, bookWidth, bookHeight, depth * 0.58, cursor + bookWidth / 2, shelfY + bookHeight / 2 + 0.035, 0.015, material, { castShadow: false });
        cursor += bookWidth + 0.025 + this.random() * 0.03;
      }
    }
  }

  addLowShelf(group, x, z, width, depth, rotationY, color) {
    const shelf = new THREE.Group();
    shelf.position.set(x, 0, z);
    shelf.rotation.y = rotationY;
    group.add(shelf);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
    this.addBox(shelf, width, 0.48, depth, 0, 0.32, 0, material);
    this.addBox(shelf, width + 0.08, 0.06, depth + 0.08, 0, 0.59, 0, this.materials.woodLight);
    for (let index = 0; index < 5; index += 1) {
      this.addBox(shelf, width / 6, 0.17, depth * 0.52, -width / 2 + 0.18 + index * (width / 5.15), 0.42, 0, this.bookMaterials[index % this.bookMaterials.length], { castShadow: false });
    }
  }

  addReadingTable(group, x, z, width, depth, chairCount, rotationY) {
    const table = new THREE.Group();
    table.position.set(x, 0, z);
    table.rotation.y = rotationY;
    group.add(table);
    this.addBox(table, width, 0.105, depth, 0, 0.73, 0, this.materials.woodLight);
    for (const offsetX of [-width / 2 + 0.2, width / 2 - 0.2]) {
      for (const offsetZ of [-depth / 2 + 0.16, depth / 2 - 0.16]) {
        this.addBox(table, 0.065, 0.68, 0.065, offsetX, 0.38, offsetZ, this.materials.woodDark);
      }
    }
    if (chairCount >= 2) {
      this.addChair(table, -width * 0.24, -depth / 2 - 0.38, 0, 1);
      this.addChair(table, width * 0.24, depth / 2 + 0.38, Math.PI, 2);
    }
    if (chairCount >= 3) this.addChair(table, width / 2 + 0.4, 0, -Math.PI / 2, 3);
    if (chairCount >= 4) this.addChair(table, -width / 2 - 0.4, 0, Math.PI / 2, 0);
    for (const offsetX of [-width * 0.26, width * 0.27]) {
      this.addBox(table, 0.35, 0.025, 0.24, offsetX, 0.795, -0.02, this.materials.paper, { castShadow: false });
    }
  }

  addChair(parent, x, z, rotationY, colorIndex = 0) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotationY;
    parent.add(chair);
    const material = this.chairMaterials[colorIndex % this.chairMaterials.length];
    this.addBox(chair, 0.42, 0.075, 0.42, 0, 0.47, 0, material);
    this.addBox(chair, 0.42, 0.46, 0.065, 0, 0.7, -0.2, material);
    for (const offsetX of [-0.16, 0.16]) {
      for (const offsetZ of [-0.16, 0.16]) {
        this.addBox(chair, 0.04, 0.45, 0.04, offsetX, 0.25, offsetZ, this.materials.metal, { castShadow: false });
      }
    }
  }

  addOfficeChair(parent, x, z, rotationY) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotationY;
    parent.add(chair);
    this.addBox(chair, 0.47, 0.09, 0.45, 0, 0.51, 0, this.materials.dark);
    this.addBox(chair, 0.45, 0.52, 0.08, 0, 0.78, -0.21, this.materials.dark);
    this.addBox(chair, 0.06, 0.4, 0.06, 0, 0.27, 0, this.materials.metal, { castShadow: false });
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      this.addBox(chair, 0.32, 0.035, 0.04, Math.cos(angle) * 0.15, 0.08, Math.sin(angle) * 0.15, this.materials.metal, { castShadow: false });
    }
  }

  addLoungeChair(group, x, z, rotationY, color) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = rotationY;
    group.add(chair);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.98 });
    this.addBox(chair, 0.9, 0.22, 0.78, 0, 0.38, 0, material);
    const back = this.addBox(chair, 0.92, 0.58, 0.18, 0, 0.69, -0.34, material);
    back.rotation.x = -0.12;
    this.addBox(chair, 0.15, 0.42, 0.78, -0.46, 0.52, 0, material);
    this.addBox(chair, 0.15, 0.42, 0.78, 0.46, 0.52, 0, material);
    for (const offsetX of [-0.34, 0.34]) {
      for (const offsetZ of [-0.26, 0.26]) {
        this.addBox(chair, 0.055, 0.3, 0.055, offsetX, 0.22, offsetZ, this.materials.woodDark, { castShadow: false });
      }
    }
  }

  addSofa(group, x, z, rotationY, color) {
    const sofa = new THREE.Group();
    sofa.position.set(x, 0, z);
    sofa.rotation.y = rotationY;
    group.add(sofa);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.98 });
    this.addBox(sofa, 2.1, 0.38, 0.78, 0, 0.4, 0, material);
    this.addBox(sofa, 2.1, 0.55, 0.18, 0, 0.72, -0.32, material);
    this.addBox(sofa, 0.18, 0.58, 0.78, -1.02, 0.56, 0, material);
    this.addBox(sofa, 0.18, 0.58, 0.78, 1.02, 0.56, 0, material);
    for (const offset of [-0.52, 0.52]) {
      this.addBox(sofa, 0.9, 0.15, 0.64, offset, 0.62, 0.01, material);
    }
  }

  addBench(group, x, z, rotationY) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotationY;
    group.add(bench);
    this.addBox(bench, 1.75, 0.1, 0.44, 0, 0.42, 0, this.materials.woodLight);
    this.addBox(bench, 1.75, 0.38, 0.07, 0, 0.64, -0.2, this.materials.woodLight);
    this.addBox(bench, 0.08, 0.4, 0.34, -0.7, 0.22, 0, this.materials.metal, { castShadow: false });
    this.addBox(bench, 0.08, 0.4, 0.34, 0.7, 0.22, 0, this.materials.metal, { castShadow: false });
  }

  addBeanBag(group, x, z, color) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 2), material);
    bag.position.set(x, 0.45, z);
    bag.scale.set(1, 0.78, 1);
    bag.castShadow = true;
    bag.receiveShadow = true;
    group.add(bag);
  }

  addPlant(group, x, z, scale = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.22 * scale, 0.42 * scale, 16), this.materials.woodLight);
    pot.position.set(x, 0.28 * scale, z);
    pot.castShadow = true;
    group.add(pot);
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3c7359, roughness: 1 });
    for (let index = 0; index < 4; index += 1) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * scale, 1), leafMaterial);
      const angle = (index / 4) * Math.PI * 2 + 0.4;
      leaf.position.set(x + Math.cos(angle) * 0.19 * scale, (0.75 + (index % 2) * 0.22) * scale, z + Math.sin(angle) * 0.19 * scale);
      leaf.scale.set(0.8, 1.25, 0.8);
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  addBox(parent, width, height, depth, x, y, z, material, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    if (options.rotationY) mesh.rotation.y = options.rotationY;
    parent.add(mesh);
    return mesh;
  }

  addCylinderBetween(parent, start, end, radius, material) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
    cylinder.position.copy(start).add(end).multiplyScalar(0.5);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    cylinder.castShadow = true;
    parent.add(cylinder);
    return cylinder;
  }

  addLabel(parent, text, position, className = "scene-label") {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = text;
    const label = new CSS2DObject(element);
    label.position.copy(position);
    label.center.set(0.5, 0.5);
    parent.add(label);
    return { element, label };
  }

  buildDestinationMarkers(group, floorId) {
    for (const destination of DESTINATIONS.filter((item) => item.floor === floorId)) {
      const marker = new THREE.Group();
      marker.userData.noMerge = true;
      marker.position.set(destination.x, 0, destination.z);
      group.add(marker);

      const ringMaterial = new THREE.MeshBasicMaterial({ color: destination.color, transparent: true, opacity: 0.82, side: THREE.DoubleSide, toneMapped: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.51, 36), ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.18;
      marker.add(ring);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.57, 0.61, 36),
        new THREE.MeshBasicMaterial({ color: destination.color, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.175;
      marker.add(halo);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.46, 8), this.materials.brass);
      stem.position.y = 0.43;
      marker.add(stem);
      const orbMaterial = new THREE.MeshStandardMaterial({ color: destination.color, emissive: destination.color, emissiveIntensity: 1.2, roughness: 0.34, metalness: 0.1 });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), orbMaterial);
      orb.position.y = 0.74;
      orb.castShadow = true;
      marker.add(orb);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 10, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.y = 0.48;
      hit.userData.destinationId = destination.id;
      hit.userData.floorId = floorId;
      marker.add(hit);
      this.pickables.push(hit);

      const labelOffset = destination.id === "entrance"
        ? new THREE.Vector3(-1.65, 1.62, 0.2)
        : destination.id === "help"
          ? new THREE.Vector3(1.2, 1.34, -0.15)
          : new THREE.Vector3(0, 1.16, 0);
      const label = this.addLabel(marker, destination.shortName, labelOffset, "scene-label is-destination");
      const visual = this.destinationVisuals.get(destination.id) || {};
      this.destinationVisuals.set(destination.id, {
        ...visual,
        marker,
        ring,
        halo,
        orb,
        orbMaterial,
        ringMaterial,
        hit,
        label: label.element,
        baseY: 0,
      });
    }
  }

  mergeStaticMeshes(group) {
    group.updateMatrixWorld(true);
    const inverseFloorMatrix = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
    const originals = [];

    group.traverse((object) => {
      if (!object.isMesh || object.isInstancedMesh) return;
      if (object.material?.transparent) return;
      if (object.userData.destinationId || object.userData.noMerge) return;
      let parent = object.parent;
      let skip = false;
      while (parent && parent !== group) {
        if (parent.userData.noMerge) {
          skip = true;
          break;
        }
        parent = parent.parent;
      }
      if (skip) return;

      const material = object.material;
      const key = `${material.uuid}|${object.renderOrder}`;
      const relativeMatrix = new THREE.Matrix4().multiplyMatrices(inverseFloorMatrix, object.matrixWorld);
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(relativeMatrix);
      const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
      if (normalized !== geometry) geometry.dispose();

      if (!buckets.has(key)) {
        buckets.set(key, { material, renderOrder: object.renderOrder, geometries: [] });
      }
      buckets.get(key).geometries.push(normalized);
      originals.push(object);
    });

    for (const bucket of buckets.values()) {
      if (!bucket.geometries.length) continue;
      const merged = mergeGeometries(bucket.geometries, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, bucket.material);
        mesh.renderOrder = bucket.renderOrder;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        group.add(mesh);
      }
      for (const geometry of bucket.geometries) geometry.dispose();
    }

    for (const original of originals) {
      original.parent?.remove(original);
      original.geometry?.dispose();
    }
  }

  addMinorLabel(group, text, x, z, y = 1.18) {
    this.addLabel(group, text, new THREE.Vector3(x, y, z), "scene-label is-minor");
  }

  buildUtilityLabels() {
    for (const [floorId, group] of Object.entries(this.floorGroups)) {
      this.addLabel(group, "Stairs", new THREE.Vector3(-2.15, 2.0, -3.75), "scene-label is-utility");
      this.addLabel(group, "Lift", new THREE.Vector3(1.4, 2.12, -3.0), "scene-label is-utility");
      if (floorId === "upper") {
        this.addMinorLabel(group, "Quiet Lounge", -6.4, 4.65);
        this.addMinorLabel(group, "Study Tables", 5.0, 4.75);
      }
    }
  }

  bindPointerEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    canvas.addEventListener("pointerleave", () => this.setHovered(null));
    canvas.addEventListener("click", (event) => {
      const destinationId = this.pickDestination(event);
      if (destinationId) this.onSelect(destinationId);
    });
  }

  updatePointer(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  }

  pickDestination(event) {
    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visiblePickables = this.pickables.filter((object) => {
      const floorId = object.userData.floorId;
      return !floorId || this.floorGroups[floorId]?.visible;
    });
    const hits = this.raycaster.intersectObjects(visiblePickables, false);
    for (const hit of hits) {
      let object = hit.object;
      while (object && !object.userData.destinationId) object = object.parent;
      if (object?.userData.destinationId) return object.userData.destinationId;
    }
    return null;
  }

  handlePointerMove(event) {
    const destinationId = this.pickDestination(event);
    this.renderer.domElement.style.cursor = destinationId ? "pointer" : "default";
    if (destinationId !== this.hoveredId) this.setHovered(destinationId);
  }

  setHovered(destinationId) {
    this.hoveredId = destinationId;
    this.onHover(destinationId);
    this.refreshDestinationStyle(destinationId);
  }

  setSelectedDestination(destinationId) {
    const previous = this.selectedId;
    this.selectedId = destinationId;
    this.refreshDestinationStyle(previous);
  }

  refreshDestinationStyle() {
    for (const [id, visual] of this.destinationVisuals) {
      const selected = id === this.selectedId;
      const hovered = id === this.hoveredId;
      if (visual.roomMaterial) {
        visual.roomMaterial.emissive.set(selected ? DESTINATION_BY_ID.get(id).color : DESTINATION_BY_ID.get(id).color);
        visual.roomMaterial.emissiveIntensity = selected ? 0.18 : hovered ? 0.1 : 0;
      }
      if (visual.ringMaterial) {
        visual.ringMaterial.opacity = selected ? 1 : 0.82;
        visual.ringMaterial.color.set(selected ? 0xffffff : DESTINATION_BY_ID.get(id).color);
      }
      if (visual.orbMaterial) {
        visual.orbMaterial.emissiveIntensity = selected ? 2.4 : hovered ? 1.7 : 1.2;
      }
      if (visual.marker) {
        const scale = selected ? 1.24 : hovered ? 1.1 : 1;
        visual.marker.scale.setScalar(scale);
      }
      if (visual.label) {
        visual.label.classList.toggle("is-selected", selected);
      }
    }
  }

  drawRoute(route, { stepFree = false, destinationId = null } = {}) {
    this.clearRoute();
    if (!route || route.nodes.length < 1) return;

    const nodeList = route.nodes.map((id) => NODES[id]);
    const runs = [];
    let currentRun = [];
    for (const node of nodeList) {
      if (!currentRun.length || currentRun[0].floor === node.floor) {
        currentRun.push(node);
      } else {
        runs.push(currentRun);
        currentRun = [node];
      }
    }
    if (currentRun.length) runs.push(currentRun);

    for (const run of runs) {
      if (run.length < 1) continue;
      const floorId = run[0].floor;
      const routeGroup = new THREE.Group();
      routeGroup.name = `${floorId}-route`;
      routeGroup.renderOrder = 6;
      this.floorGroups[floorId].add(routeGroup);
      this.routeGroups[floorId] = routeGroup;

      if (run.length === 1) {
        this.addRouteJoint(routeGroup, run[0], 0.2);
        continue;
      }

      for (let index = 0; index < run.length - 1; index += 1) {
        const startNode = run[index];
        const endNode = run[index + 1];
        const start = new THREE.Vector3(startNode.x, (startNode.y || 0.16) + 0.055, startNode.z);
        const end = new THREE.Vector3(endNode.x, (endNode.y || 0.16) + 0.055, endNode.z);
        if (start.distanceToSquared(end) < 0.0001) continue;
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, length, 10), this.materials.routeCasing);
        casing.position.copy(start).add(end).multiplyScalar(0.5);
        casing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        casing.renderOrder = 7;
        routeGroup.add(casing);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, length, 10), this.materials.route);
        line.position.copy(casing.position);
        line.quaternion.copy(casing.quaternion);
        line.renderOrder = 8;
        routeGroup.add(line);
      }

      for (let index = 1; index < run.length - 1; index += 1) {
        this.addRouteJoint(routeGroup, run[index], 0.13);
      }
      this.addStartMarker(routeGroup, run[0]);
      const destinationNode = run[run.length - 1];
      if (destinationId && destinationNode.name === DESTINATION_BY_ID.get(destinationId)?.name) {
        this.addRouteJoint(routeGroup, destinationNode, 0.22);
      }
    }

    const anyGroup = Object.values(this.routeGroups)[0];
    if (anyGroup) {
      for (const group of Object.values(this.floorGroups)) {
        group.traverse((object) => {
          if (object.isCSS2DObject && this.routeGroups[group.userData.floorId]) {
            object.visible = group.visible;
          }
        });
      }
    }
  }

  addRouteJoint(group, node, radius) {
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 10),
      this.materials.route,
    );
    joint.position.set(node.x, (node.y || 0.16) + 0.055, node.z);
    joint.renderOrder = 8;
    group.add(joint);
  }

  addStartMarker(group, node) {
    const start = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.055, 28), this.materials.start);
    start.position.set(node.x, (node.y || 0.16) + 0.03, node.z);
    start.renderOrder = 8;
    group.add(start);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.33, 0.41, 32),
      new THREE.MeshBasicMaterial({ color: 0xb8f1de, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(node.x, (node.y || 0.16) + 0.04, node.z);
    ring.renderOrder = 8;
    group.add(ring);
  }

  clearRoute() {
    for (const [floorId, group] of Object.entries(this.routeGroups)) {
      if (!group) continue;
      this.floorGroups[floorId].remove(group);
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      delete this.routeGroups[floorId];
    }
  }

  setFloor(floorId, animate = true) {
    this.activeFloor = floorId;
    const showGround = floorId === "overview" || floorId === "ground";
    const showUpper = floorId === "overview" || floorId === "upper";
    this.floorGroups.ground.visible = showGround;
    this.floorGroups.upper.visible = showUpper;
    this.updateLabelVisibility();

    if (floorId === "overview") {
      this.goalTarget.set(0, 0.45, 0);
      this.goalZoom = 1;
    } else {
      const meta = FLOOR_META[floorId];
      this.goalTarget.set(meta.offsetX, 0.35, 0);
      this.goalZoom = 1.52;
    }
    if (!animate) {
      this.viewTarget.copy(this.goalTarget);
      this.currentZoom = this.goalZoom;
      this.updateCameraPosition();
    }
  }

  updateLabelVisibility() {
    for (const [floorId, group] of Object.entries(this.floorGroups)) {
      group.traverse((object) => {
        if (object.isCSS2DObject) object.visible = group.visible;
      });
    }
  }

  zoomBy(factor) {
    this.goalZoom = THREE.MathUtils.clamp(this.goalZoom * factor, 0.78, 2.2);
  }

  resetView() {
    this.setFloor("overview");
  }

  updateCameraPosition() {
    this.camera.position.copy(this.viewTarget).add(CAMERA_OFFSET);
    this.camera.lookAt(this.viewTarget);
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const requiredViewWidth = width < 600 ? 52 : 42;
    this.baseViewHeight = Math.max(32, requiredViewWidth / aspect);
    this.camera.left = (-this.baseViewHeight * aspect) / 2;
    this.camera.right = (this.baseViewHeight * aspect) / 2;
    this.camera.top = this.baseViewHeight / 2;
    this.camera.bottom = -this.baseViewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
  }

  animate() {
    const delta = Math.min(0.05, this.clock.getDelta());
    const ease = 1 - Math.pow(0.0008, delta);
    this.viewTarget.lerp(this.goalTarget, ease);
    this.currentZoom += (this.goalZoom - this.currentZoom) * ease;
    this.updateCameraPosition();

    const time = performance.now() * 0.001;
    for (const [id, visual] of this.destinationVisuals) {
      if (!visual.marker) continue;
      const selected = id === this.selectedId;
      const hovered = id === this.hoveredId;
      const pulse = 1 + Math.sin(time * (selected ? 3.4 : 2.1) + id.length) * (selected ? 0.055 : 0.026);
      const baseScale = selected ? 1.24 : hovered ? 1.1 : 1;
      visual.marker.scale.setScalar(baseScale * pulse);
      visual.halo.material.opacity = (selected ? 0.34 : 0.2) + Math.sin(time * 2.2) * 0.045;
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
