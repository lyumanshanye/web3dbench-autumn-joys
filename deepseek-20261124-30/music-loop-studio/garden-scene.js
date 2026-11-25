import * as THREE from "three";

const TRACK_COLORS = [0xffd26f, 0xff8c68, 0x75eea7, 0x9ab9ff];
const TRACK_NAMES = ["KICK", "SNARE", "BASS", "MELODY"];

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function makeLabel(index, name, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(5, 15, 10, 0.78)";
  roundedRect(ctx, 24, 22, 464, 84, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(214, 244, 202, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(70, 64, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#edf6df";
  ctx.font = "800 49px Helvetica, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 106, 65);

  ctx.fillStyle = color;
  ctx.font = "700 24px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(String(index + 1).padStart(2, "0"), 462, 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.94,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.45, 0.61, 1);
  sprite.position.set(0, 1.88, 0.45);
  sprite.renderOrder = 20;
  return sprite;
}

function makePedestal(color) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.94, 0.15, 32),
    new THREE.MeshStandardMaterial({ color: 0x112219, roughness: 0.74, metalness: 0.18 }),
  );
  base.position.y = -0.91;
  base.receiveShadow = true;
  group.add(base);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.71, 0.016, 6, 44),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38 }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.82;
  group.add(collar);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.055, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.828;
  group.add(glow);

  return { group, collar, glow };
}

function makeKick(color) {
  const group = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x18372a, roughness: 0.44, metalness: 0.2 });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0x24392c,
    roughness: 0.52,
    metalness: 0.08,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.2,
  });
  const accentMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });

  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 40), shellMaterial);
  shell.rotation.x = Math.PI / 2;
  shell.position.y = 0.17;
  group.add(shell);

  const head = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), headMaterial);
  head.position.set(0, 0.17, 0.236);
  group.add(head);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.024, 8, 52), accentMaterial);
  ring.position.set(0, 0.17, 0.252);
  group.add(ring);

  const hub = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
  );
  hub.position.set(0, 0.17, 0.258);
  group.add(hub);

  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.026, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xc8b58b, roughness: 0.8 }),
  );
  stick.position.set(0.43, 0.71, 0.08);
  stick.rotation.z = -0.56;
  stick.rotation.x = 0.15;
  group.add(stick);

  return { group, head, ring, hub, headMaterial, accentMaterial };
}

function makeSnare(color) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x637b6b, roughness: 0.3, metalness: 0.72 });
  const skin = new THREE.MeshStandardMaterial({
    color: 0x39291f,
    roughness: 0.62,
    metalness: 0.08,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.2,
  });
  const accent = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.62, 10), metal);
  stand.position.y = -0.43;
  group.add(stand);

  const foot = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.018, 6, 30), metal);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = -0.74;
  group.add(foot);

  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.61, 0.26, 36), metal);
  shell.position.y = 0.04;
  group.add(shell);

  const drumHead = new THREE.Mesh(new THREE.CircleGeometry(0.54, 36), skin);
  drumHead.rotation.x = -Math.PI / 2;
  drumHead.position.y = 0.177;
  group.add(drumHead);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.017, 6, 44), accent);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.19;
  group.add(rim);

  for (let lugIndex = 0; lugIndex < 6; lugIndex += 1) {
    const angle = (lugIndex / 6) * Math.PI * 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.19, 0.04), metal);
    lug.position.set(Math.cos(angle) * 0.59, 0.04, Math.sin(angle) * 0.59);
    lug.rotation.y = -angle;
    group.add(lug);
  }

  const shaker = new THREE.Group();
  const shakerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.46, 18),
    new THREE.MeshStandardMaterial({ color: 0x8d583b, roughness: 0.76 }),
  );
  shakerBody.position.y = 0.09;
  shaker.add(shakerBody);
  const shakerBand = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.012, 5, 24), accent);
  shakerBand.rotation.x = Math.PI / 2;
  shakerBand.position.y = 0.16;
  shaker.add(shakerBand);
  shaker.position.set(0.72, 0.24, 0.08);
  shaker.rotation.z = -0.32;
  group.add(shaker);

  return { group, drumHead, rim, shaker, skin, accent, shakerBand };
}

function makeBass(color) {
  const group = new THREE.Group();
  const cabinetMaterial = new THREE.MeshStandardMaterial({
    color: 0x102519,
    roughness: 0.48,
    metalness: 0.2,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.025,
  });
  const coneMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d3829,
    roughness: 0.55,
    metalness: 0.24,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.16,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.38 });
  const accent = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.38, 0.58), cabinetMaterial);
  cabinet.position.y = 0.08;
  group.add(cabinet);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cabinet.geometry), edgeMaterial);
  edges.position.copy(cabinet.position);
  group.add(edges);

  const coneGroup = new THREE.Group();
  coneGroup.position.set(0, 0.17, 0.295);
  group.add(coneGroup);

  const bigCone = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.19, 0.05, 32), coneMaterial);
  bigCone.rotation.x = Math.PI / 2;
  bigCone.position.y = 0.19;
  coneGroup.add(bigCone);

  const bigRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.014, 5, 36), accent);
  bigRing.position.y = 0.19;
  coneGroup.add(bigRing);

  const smallCone = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.09, 0.045, 24), coneMaterial);
  smallCone.rotation.x = Math.PI / 2;
  smallCone.position.y = -0.27;
  coneGroup.add(smallCone);

  const smallRing = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.012, 5, 28), accent);
  smallRing.position.y = -0.27;
  coneGroup.add(smallRing);

  const port = new THREE.Mesh(new THREE.CircleGeometry(0.055, 18), accent);
  port.position.set(0.37, 0.5, 0.296);
  group.add(port);

  return { group, coneGroup, bigCone, smallCone, bigRing, smallRing, cabinetMaterial, edgeMaterial };
}

function makeMelody(color) {
  const group = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x315d43, roughness: 0.7, metalness: 0.08 });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3f63,
    roughness: 0.28,
    metalness: 0.24,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.23,
    transparent: true,
    opacity: 0.86,
  });
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xcad6ff,
    roughness: 0.2,
    metalness: 0.2,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.65,
  });
  const accent = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.84, 10), stemMaterial);
  stem.position.y = -0.15;
  stem.rotation.z = -0.08;
  group.add(stem);

  const leafGeometry = new THREE.SphereGeometry(0.18, 16, 10);
  const leafLeft = new THREE.Mesh(leafGeometry, stemMaterial);
  leafLeft.scale.set(1.4, 0.3, 0.62);
  leafLeft.position.set(-0.22, -0.05, 0);
  leafLeft.rotation.z = 0.42;
  group.add(leafLeft);

  const leafRight = new THREE.Mesh(leafGeometry, stemMaterial);
  leafRight.scale.set(1.25, 0.26, 0.56);
  leafRight.position.set(0.2, -0.32, 0.02);
  leafRight.rotation.z = -0.5;
  group.add(leafRight);

  const bloom = new THREE.Group();
  bloom.position.y = 0.74;
  group.add(bloom);

  const petals = [];
  const petalGeometry = new THREE.SphereGeometry(0.27, 20, 12);
  for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
    const angle = (petalIndex / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeometry, petalMaterial.clone());
    petal.scale.set(1.0, 0.28, 0.48);
    petal.position.set(Math.cos(angle) * 0.32, Math.sin(angle) * 0.21, Math.sin(angle) * 0.08);
    petal.rotation.z = angle + Math.PI / 2;
    petal.rotation.x = -0.35;
    petals.push(petal);
    bloom.add(petal);
  }

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), coreMaterial);
  core.scale.set(1, 1.18, 1);
  bloom.add(core);

  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.008, 5, 54), accent);
  orbit.position.y = 0.74;
  orbit.rotation.x = 1.08;
  orbit.rotation.z = 0.22;
  group.add(orbit);

  const orbitTwo = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.006, 5, 54), accent);
  orbitTwo.position.y = 0.74;
  orbitTwo.rotation.y = 0.65;
  orbitTwo.rotation.x = 0.35;
  group.add(orbitTwo);

  return { group, bloom, petals, core, coreMaterial, petalMaterial, orbit, orbitTwo };
}

function createGrass() {
  const group = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x1e4630, roughness: 0.8 });
  const tipMaterial = new THREE.MeshBasicMaterial({ color: 0x7dbb69, transparent: true, opacity: 0.3 });
  const geometry = new THREE.CylinderGeometry(0.012, 0.025, 1, 5);

  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2 + Math.sin(index * 3.2) * 0.08;
    const radius = 6.4 + ((index * 17) % 30) / 10;
    const height = 0.38 + ((index * 13) % 22) / 10;
    const stem = new THREE.Mesh(geometry, stemMaterial);
    stem.scale.y = height;
    stem.position.set(Math.cos(angle) * radius, -0.9 + height / 2, Math.sin(angle) * radius - 1.2);
    stem.rotation.z = Math.sin(index * 1.7) * 0.13;
    group.add(stem);

    if (index % 3 === 0) {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), tipMaterial);
      tip.position.set(stem.position.x, -0.9 + height, stem.position.z);
      group.add(tip);
    }
  }

  return group;
}

export function createGardenScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07110c, 0.037);

  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
  camera.position.set(0, 1.75, 7.8);
  camera.lookAt(0, 0.24, 0);

  const world = new THREE.Group();
  world.position.y = -0.1;
  scene.add(world);

  const hemi = new THREE.HemisphereLight(0xd7f4b7, 0x07110c, 0.72);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff2c7, 2.1);
  keyLight.position.set(-4, 7, 6);
  scene.add(keyLight);

  const greenLight = new THREE.PointLight(0x7dff9f, 11, 12, 2);
  greenLight.position.set(-3.2, 1.6, 3.8);
  scene.add(greenLight);

  const blueLight = new THREE.PointLight(0x718dff, 9, 12, 2);
  blueLight.position.set(3.4, 2.2, 3.1);
  scene.add(blueLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8.5, 72),
    new THREE.MeshStandardMaterial({ color: 0x0b1b12, roughness: 0.82, metalness: 0.12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.01;
  ground.receiveShadow = true;
  world.add(ground);

  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(3.75, 3.79, 84),
    new THREE.MeshBasicMaterial({ color: 0x86ab68, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
  );
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.y = -0.995;
  world.add(groundRing);

  const polarGrid = new THREE.PolarGridHelper(7.8, 16, 5, 72, 0x2e5c3b, 0x17321f);
  polarGrid.material.transparent = true;
  polarGrid.material.opacity = 0.24;
  polarGrid.position.y = -0.985;
  world.add(polarGrid);

  world.add(createGrass());

  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 15;
    positions[index * 3 + 1] = Math.random() * 4.2 - 0.6;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 7 - 0.5;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xb5dda4,
      size: 0.026,
      transparent: true,
      opacity: 0.54,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  world.add(particles);

  const instrumentX = [-4.45, -1.5, 1.5, 4.45];
  const instrumentZ = [0.18, -0.32, 0.34, -0.24];
  const builders = [makeKick, makeSnare, makeBass, makeMelody];
  const instruments = [];

  for (let index = 0; index < 4; index += 1) {
    const color = TRACK_COLORS[index];
    const root = new THREE.Group();
    root.position.set(instrumentX[index], 0, instrumentZ[index]);
    world.add(root);

    const pedestal = makePedestal(color);
    root.add(pedestal.group);

    const built = builders[index](color);
    root.add(built.group);

    const label = makeLabel(index, TRACK_NAMES[index], `#${color.toString(16).padStart(6, "0")}`);
    root.add(label);

    const baseY = root.position.y;
    const instrument = {
      root,
      built,
      pedestal,
      label,
      baseY,
      pulse: 0,
      seed: index * 1.73 + 0.4,
      color,
    };
    instruments.push(instrument);
  }

  const center = new THREE.Group();
  center.position.set(0, -0.93, -0.1);
  world.add(center);

  const centerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.93, 0.012, 6, 64),
    new THREE.MeshBasicMaterial({ color: 0xb7dc8b, transparent: true, opacity: 0.14 }),
  );
  centerRing.rotation.x = Math.PI / 2;
  center.add(centerRing);

  const centerOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xd9ff75 }),
  );
  centerOrb.position.y = 0.08;
  center.add(centerOrb);

  let reducedMotion = false;
  let playing = false;
  let width = 1;
  let height = 1;
  let pointerX = 0;
  let pointerY = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 520 ? 36 : 32;
    camera.position.z = width < 520 ? 8.6 : 7.8;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function onPointerMove(event) {
    if (reducedMotion) return;
    const rect = container.getBoundingClientRect();
    pointerTargetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.22;
    pointerTargetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.14;
  }

  function onPointerLeave() {
    pointerTargetX = 0;
    pointerTargetY = 0;
  }

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });

  function pulse(index) {
    const instrument = instruments[index];
    if (instrument) instrument.pulse = 1;
  }

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    if (reducedMotion) {
      pointerTargetX = 0;
      pointerTargetY = 0;
      pointerX = 0;
      pointerY = 0;
      camera.position.x = 0;
      camera.position.y = 1.75;
      camera.lookAt(0, 0.24, 0);
    }
  }

  function setPlaying(value) {
    playing = Boolean(value);
  }

  function update(delta, elapsed) {
    const safeDelta = Math.min(delta, 0.05);
    const motionScale = reducedMotion ? 0.08 : 1;

    pointerX += (pointerTargetX - pointerX) * Math.min(1, safeDelta * 4);
    pointerY += (pointerTargetY - pointerY) * Math.min(1, safeDelta * 4);
    if (!reducedMotion) {
      camera.position.x += (pointerX - camera.position.x) * 0.045;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -0.24, 0.24);
      camera.position.y = 1.75 + pointerY * 0.24;
      camera.lookAt(0, 0.24, 0);
    }

    const breathe = Math.sin(elapsed * 0.62) * 0.5 + 0.5;
    greenLight.intensity = 9.5 + breathe * 2.2 + (playing ? 1.4 : 0);
    blueLight.intensity = 8 + (1 - breathe) * 2.1 + (playing ? 1.1 : 0);

    particles.rotation.y = elapsed * (reducedMotion ? 0.004 : 0.012);
    centerRing.rotation.z = elapsed * (reducedMotion ? 0.03 : 0.14);
    centerOrb.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.1 * motionScale);
    centerOrb.material.opacity = 0.7;

    instruments.forEach((instrument, index) => {
      instrument.pulse = Math.max(0, instrument.pulse - safeDelta * 5.2);
      const p = instrument.pulse;
      const easedPulse = p * p;
      const float = Math.sin(elapsed * 1.15 + instrument.seed) * 0.022 * motionScale;
      const baseScale = 1 + easedPulse * 0.055 * motionScale;

      instrument.root.position.y = instrument.baseY + float + easedPulse * 0.13 * motionScale;
      instrument.root.rotation.y = Math.sin(elapsed * 0.42 + instrument.seed) * 0.016 * motionScale;
      instrument.root.scale.setScalar(baseScale);
      instrument.pedestal.collar.material.opacity = 0.28 + easedPulse * 0.62;
      instrument.pedestal.glow.material.opacity = 0.04 + easedPulse * 0.19;
      instrument.label.material.opacity = 0.82 + easedPulse * 0.18;

      if (index === 0) {
        instrument.built.head.scale.setScalar(1 + easedPulse * 0.16 * motionScale);
        instrument.built.ring.scale.setScalar(1 + easedPulse * 0.22 * motionScale);
        instrument.built.ring.material.opacity = 0.46 + easedPulse * 0.5;
        instrument.built.headMaterial.emissiveIntensity = 0.2 + easedPulse * 2.6;
        instrument.built.hub.scale.setScalar(1 + easedPulse * 0.65 * motionScale);
      }

      if (index === 1) {
        instrument.root.rotation.z = Math.sin(elapsed * 3.2 + instrument.seed) * 0.045 * easedPulse * motionScale;
        instrument.built.drumHead.scale.setScalar(1 + easedPulse * 0.08 * motionScale);
        instrument.built.rim.material.opacity = 0.48 + easedPulse * 0.48;
        instrument.built.shaker.rotation.z = -0.32 + Math.sin(elapsed * 21) * 0.16 * easedPulse * motionScale;
        instrument.built.skin.emissiveIntensity = 0.2 + easedPulse * 2.1;
      }

      if (index === 2) {
        instrument.built.coneGroup.position.z = 0.295 + easedPulse * 0.035 * motionScale;
        instrument.built.bigCone.scale.setScalar(1 + easedPulse * 0.12 * motionScale);
        instrument.built.bigRing.scale.setScalar(1 + easedPulse * 0.24 * motionScale);
        instrument.built.smallCone.scale.setScalar(1 + easedPulse * 0.16 * motionScale);
        instrument.built.cabinetMaterial.emissiveIntensity = 0.025 + easedPulse * 0.72;
        instrument.built.edgeMaterial.opacity = 0.3 + easedPulse * 0.58;
      }

      if (index === 3) {
        instrument.built.bloom.rotation.y = elapsed * 0.24 * motionScale + easedPulse * 0.42;
        instrument.built.bloom.rotation.z = Math.sin(elapsed * 0.8) * 0.035 * motionScale;
        instrument.built.core.scale.setScalar(1 + easedPulse * 0.36 * motionScale);
        instrument.built.core.rotation.x = elapsed * 0.35;
        instrument.built.core.rotation.y = elapsed * 0.48;
        instrument.built.coreMaterial.emissiveIntensity = 0.55 + easedPulse * 3.4;
        instrument.built.orbit.scale.setScalar(1 + easedPulse * 0.34 * motionScale);
        instrument.built.orbit.rotation.z = 0.22 + elapsed * (reducedMotion ? 0.01 : 0.22);
        instrument.built.orbitTwo.rotation.y = 0.65 - elapsed * (reducedMotion ? 0.01 : 0.17);

        instrument.built.petals.forEach((petal, petalIndex) => {
          const angle = (petalIndex / 5) * Math.PI * 2;
          const spread = 0.32 + easedPulse * 0.1 * motionScale;
          petal.position.x = Math.cos(angle) * spread;
          petal.position.y = Math.sin(angle) * (0.21 + easedPulse * 0.08 * motionScale);
          const material = petal.material;
          material.emissiveIntensity = 0.2 + easedPulse * 1.5;
        });
      }
    });

    renderer.render(scene, camera);
  }

  function dispose() {
    resizeObserver.disconnect();
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
    renderer.dispose();
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
    if (renderer.domElement.parentNode) renderer.domElement.remove();
  }

  return {
    pulse,
    setReducedMotion,
    setPlaying,
    update,
    dispose,
  };
}
