import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { colorForValue } from "./scale.js";

const FLOOR_HEIGHT = 2.24;
const ROOM_WIDTH = 3.24;
const ROOM_DEPTH = 2.28;
const ROOM_HEIGHT = 0.5;
const ROOM_POSITIONS = [
  { x: -1.76, z: -1.32 },
  { x: 1.76, z: -1.32 },
  { x: -1.76, z: 1.34 },
  { x: 1.76, z: 1.34 },
];

function makeStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 64, 64);
  context.strokeStyle = "rgba(255, 255, 255, 0.72)";
  context.lineWidth = 5;
  for (let offset = -64; offset < 128; offset += 18) {
    context.beginPath();
    context.moveTo(offset, 64);
    context.lineTo(offset + 64, 0);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class BuildingScene {
  constructor(container, { onRoomSelect, rooms = [] } = {}) {
    this.container = container;
    this.onRoomSelect = onRoomSelect;
    this.roomObjects = new Map();
    this.floorGroups = new Map();
    this.selectedRoomId = null;
    this.hoveredRoomId = null;
    this.summaries = new Map();
    this.maxValue = 1;
    this.metric = "total";
    this.unit = "kWh";
    this.stripeTexture = makeStripeTexture();
    this.setRooms(rooms);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0c1420, 0.018);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(8.8, 8.7, 11.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D cutaway of a three-floor office building");
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "scene-label-layer";
    container.appendChild(this.labelRenderer.domElement);

    this.tooltip = document.createElement("div");
    this.tooltip.className = "scene-tooltip";
    container.appendChild(this.tooltip);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 3.1, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 11.5;
    this.controls.maxDistance = 24;
    this.controls.minPolarAngle = Math.PI * 0.27;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minAzimuthAngle = Math.PI * 0.08;
    this.controls.maxAzimuthAngle = Math.PI * 0.45;
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDown = null;
    this.animationFrame = 0;

    this.addEnvironment();
    this.addBuilding();
    this.addInteractions();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  addEnvironment() {
    const hemisphere = new THREE.HemisphereLight(0xbcd8e0, 0x09111c, 1.7);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffe7c2, 3.1);
    key.position.set(4, 13, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0008;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x49b7ca, 1.5);
    rim.position.set(-9, 6, -6);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 72),
      new THREE.MeshStandardMaterial({ color: 0x0d1723, roughness: 0.94, metalness: 0.04 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.23;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.4, 7.44, 80),
      new THREE.MeshBasicMaterial({ color: 0x315067, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.215;
    this.scene.add(ring);

    const grid = new THREE.GridHelper(18, 36, 0x21364a, 0x172535);
    grid.position.y = -0.21;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    this.scene.add(grid);

    for (const [index, color] of [0xf2c45b, 0x45c8b1].entries()) {
      const light = new THREE.PointLight(color, 10, 11, 2);
      light.position.set(index === 0 ? -5 : 5.5, 1.1, index === 0 ? 3 : -3);
      this.scene.add(light);
    }
  }

  addBuilding() {
    this.building = new THREE.Group();
    this.building.position.y = 0;
    this.scene.add(this.building);

    const slabMaterial = new THREE.MeshStandardMaterial({ color: 0x263445, roughness: 0.7, metalness: 0.2 });
    const slabEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x567087, transparent: true, opacity: 0.78 });
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b2a3d,
      roughness: 0.76,
      metalness: 0.14,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const wallEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x4c657b, transparent: true, opacity: 0.48 });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x1e2c3c, roughness: 0.55, metalness: 0.42 });

    for (let floor = 1; floor <= 3; floor += 1) {
      const baseY = (floor - 1) * FLOOR_HEIGHT;
      const floorGroup = new THREE.Group();
      floorGroup.userData.floor = floor;
      this.floorGroups.set(floor, floorGroup);
      this.building.add(floorGroup);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(7.55, 0.16, 5.92), slabMaterial);
      slab.position.y = baseY - 0.03;
      slab.castShadow = true;
      slab.receiveShadow = true;
      floorGroup.add(slab);

      const slabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), slabEdgeMaterial);
      slabEdges.position.copy(slab.position);
      floorGroup.add(slabEdges);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.55, FLOOR_HEIGHT - 0.22, 0.07), wallMaterial);
      backWall.position.set(0, baseY + (FLOOR_HEIGHT - 0.22) / 2, -2.94);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      floorGroup.add(backWall);

      const backWallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(backWall.geometry), wallEdgeMaterial);
      backWallEdges.position.copy(backWall.position);
      floorGroup.add(backWallEdges);

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.07, FLOOR_HEIGHT - 0.22, 5.88), wallMaterial);
      leftWall.position.set(-3.74, baseY + (FLOOR_HEIGHT - 0.22) / 2, 0);
      leftWall.castShadow = true;
      floorGroup.add(leftWall);

      const leftWallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(leftWall.geometry), wallEdgeMaterial);
      leftWallEdges.position.copy(leftWall.position);
      floorGroup.add(leftWallEdges);

      const floorLabel = document.createElement("div");
      floorLabel.className = "scene-floor-label";
      floorLabel.innerHTML = `<span>L0${floor}</span><small>${floor === 1 ? "GROUND" : floor === 2 ? "SECOND" : "THIRD"}</small>`;
      const floorLabelObject = new CSS2DObject(floorLabel);
      floorLabelObject.position.set(-4.18, baseY + 1.2, 2.65);
      floorGroup.add(floorLabelObject);

      const core = new THREE.Mesh(new THREE.BoxGeometry(0.58, FLOOR_HEIGHT - 0.22, 0.58), coreMaterial);
      core.position.set(-2.95, baseY + (FLOOR_HEIGHT - 0.22) / 2, -2.56);
      core.castShadow = true;
      core.receiveShadow = true;
      floorGroup.add(core);

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(3.02, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x7692a4, transparent: true, opacity: 0.7 }),
      );
      rail.position.set(1.66, baseY + 1.58, 2.63);
      floorGroup.add(rail);

      this.addFloorRooms(floor, baseY, floorGroup);
    }

    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.8, 0.08), wallEdgeMaterial);
    mast.position.set(-3.75, 3.35, 2.94);
    this.building.add(mast);
  }

  addFloorRooms(floor, baseY, floorGroup) {
    const floorRooms = this.roomDefinitions?.[floor] ?? [];
    for (let index = 0; index < floorRooms.length; index += 1) {
      const room = floorRooms[index];
      const position = ROOM_POSITIONS[index];
      const material = new THREE.MeshStandardMaterial({
        color: 0x286b78,
        roughness: 0.5,
        metalness: 0.16,
        emissive: new THREE.Color(0x071017),
        emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH), material);
      mesh.position.set(position.x, baseY + ROOM_HEIGHT / 2 + 0.04, position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.roomId = room.id;
      floorGroup.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0xd9eff2, transparent: true, opacity: 0.2 }),
      );
      edges.position.copy(mesh.position);
      floorGroup.add(edges);

      const hatch = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH - 0.06, ROOM_DEPTH - 0.06),
        new THREE.MeshBasicMaterial({
          map: this.stripeTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      hatch.rotation.x = -Math.PI / 2;
      hatch.position.set(position.x, baseY + ROOM_HEIGHT + 0.055, position.z);
      hatch.visible = false;
      hatch.userData.isHatch = true;
      floorGroup.add(hatch);

      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH + 0.22, ROOM_DEPTH + 0.22),
        new THREE.MeshBasicMaterial({
          color: 0xfff4d8,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(position.x, baseY + ROOM_HEIGHT + 0.07, position.z);
      halo.visible = false;
      floorGroup.add(halo);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(ROOM_WIDTH + 0.05, ROOM_HEIGHT + 0.05, ROOM_DEPTH + 0.05)),
        new THREE.LineBasicMaterial({ color: 0xfff8e9, transparent: true, opacity: 1 }),
      );
      outline.position.copy(mesh.position);
      outline.visible = false;
      floorGroup.add(outline);

      const tag = document.createElement("div");
      tag.className = "scene-room-label";
      tag.innerHTML = `<strong>${room.shortName}</strong><span>—</span>`;
      const tagObject = new CSS2DObject(tag);
      tagObject.position.set(position.x, baseY + 1.08, position.z + 0.1);
      tagObject.visible = false;
      floorGroup.add(tagObject);

      this.roomObjects.set(room.id, {
        room,
        floor,
        mesh,
        edges,
        hatch,
        halo,
        outline,
        tag,
        tagObject,
        tagValue: tag.querySelector("span"),
      });
    }
  }

  setRooms(rooms) {
    this.roomDefinitions = { 1: [], 2: [], 3: [] };
    for (const room of rooms) {
      this.roomDefinitions[room.floor].push(room);
    }
    for (const floor of [1, 2, 3]) {
      this.roomDefinitions[floor].sort((a, b) => rooms.indexOf(a) - rooms.indexOf(b));
    }
  }

  addInteractions() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointerup", (event) => {
      if (!this.pointerDown) return;
      const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
      this.pointerDown = null;
      if (moved > 6) return;
      const roomId = this.pickRoom(event);
      if (roomId) this.onRoomSelect?.(roomId);
    });
    canvas.addEventListener("pointermove", (event) => this.handleHover(event));
    canvas.addEventListener("pointerleave", () => this.clearHover());
    canvas.addEventListener("pointercancel", () => this.clearHover());
  }

  setPointer(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  pickRoom(event) {
    this.setPointer(event);
    const visibleMeshes = [...this.roomObjects.values()]
      .filter((object) => this.floorGroups.get(object.floor)?.visible)
      .map((object) => object.mesh);
    const hit = this.raycaster.intersectObjects(visibleMeshes, false)[0];
    return hit?.object.userData.roomId ?? null;
  }

  handleHover(event) {
    if (event.buttons) {
      this.clearHover();
      return;
    }
    const roomId = this.pickRoom(event);
    if (roomId !== this.hoveredRoomId) {
      this.hoveredRoomId = roomId;
      this.updateLabels();
    }
    if (!roomId) {
      this.clearHover();
      return;
    }
    const object = this.roomObjects.get(roomId);
    const summary = this.summaries.get(roomId);
    const bounds = this.container.getBoundingClientRect();
    const x = Math.min(bounds.width - 170, Math.max(12, event.clientX - bounds.left + 16));
    const y = Math.min(bounds.height - 90, Math.max(12, event.clientY - bounds.top + 16));
    this.tooltip.style.transform = `translate(${x}px, ${y}px)`;
    this.tooltip.classList.add("is-visible");
    this.tooltip.innerHTML = `
      <span class="tooltip-kicker">F0${object.floor} · ${object.room.area} m²</span>
      <strong>${object.room.name}</strong>
      <span>${this.formatValue(summary)}${summary?.partial ? ` · ${summary.available}/${summary.expected} readings` : ""}</span>
    `;
  }

  clearHover() {
    this.hoveredRoomId = null;
    this.tooltip.classList.remove("is-visible");
    if (this.roomObjects.size) this.updateLabels();
  }

  setData({ summaries, maxValue, metric, unit }) {
    this.summaries = summaries;
    this.maxValue = maxValue;
    this.metric = metric;
    this.unit = unit;
    for (const [roomId, object] of this.roomObjects) {
      const summary = summaries.get(roomId);
      const value = metric === "intensity" ? summary?.intensity ?? 0 : summary?.total ?? 0;
      const color = new THREE.Color(colorForValue(value, maxValue));
      object.mesh.material.color.copy(color);
      object.mesh.material.emissive.copy(color).multiplyScalar(0.11);
      object.mesh.material.emissiveIntensity = 0.6;
      object.edges.material.opacity = summary?.partial ? 0.46 : 0.2;
      object.hatch.visible = Boolean(summary?.partial);
      object.tagValue.textContent = this.formatValue(summary);
      object.mesh.userData.value = value;
    }
    this.updateLabels();
  }

  formatValue(summary) {
    if (!summary) return "No readings";
    const value = this.metric === "intensity" ? summary.intensity : summary.total;
    const digits = this.metric === "intensity" ? value.toFixed(2) : Math.round(value).toLocaleString("en-US");
    return `${digits} ${this.unit}`;
  }

  setSelected(roomId) {
    this.selectedRoomId = roomId;
    for (const [id, object] of this.roomObjects) {
      const selected = id === roomId;
      object.outline.visible = selected;
      object.halo.visible = selected;
      object.mesh.scale.setScalar(selected ? 1.018 : 1);
      object.edges.material.opacity = selected ? 0.8 : object.hatch.visible ? 0.46 : 0.2;
    }
    this.updateLabels();
  }

  setVisibleFloors(visibleFloors) {
    for (const [floor, group] of this.floorGroups) {
      group.visible = visibleFloors.has(floor);
    }
    this.updateLabels();
  }

  updateLabels() {
    for (const [roomId, object] of this.roomObjects) {
      const visible = this.floorGroups.get(object.floor)?.visible;
      const show = visible && (roomId === this.selectedRoomId || roomId === this.hoveredRoomId);
      object.tagObject.visible = Boolean(show);
      object.tag.classList.toggle("is-selected", roomId === this.selectedRoomId);
    }
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.fov = width < 620 ? 39 : 34;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.controls.target.set(0, width < 620 ? 3.35 : 3.1, 0);
  }

  animate() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
