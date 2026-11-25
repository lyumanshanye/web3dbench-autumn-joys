import * as THREE from 'three';

const body = document.body;
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loaderBar');
const loaderCount = document.getElementById('loaderCount');
const siteNav = document.getElementById('siteNav');
const helix = document.getElementById('helix');
const work = document.querySelector('.work');
const orbitAngle = document.getElementById('orbitAngle');
const galleryProgress = document.getElementById('galleryProgress');
const contactForm = document.getElementById('contactForm');
const formScene = document.querySelector('.form-scene');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

body.classList.add('is-loading');

/* Loader: deliberately short so the hero is fully present at first capture. */
let loaderStart = performance.now();
const loaderDuration = reduceMotion ? 350 : 1320;
let loaderFinished = false;

function finishLoader() {
  if (loaderFinished) return;
  loaderFinished = true;
  loaderBar.style.width = '100%';
  loaderCount.textContent = '100';
  window.setTimeout(() => {
    preloader.classList.add('is-done');
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
  }, reduceMotion ? 40 : 120);
  window.setTimeout(() => {
    preloader.style.display = 'none';
  }, reduceMotion ? 200 : 1120);
}

function updateLoader(now) {
  if (loaderFinished) return;
  const progress = Math.min((now - loaderStart) / loaderDuration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const value = Math.round(eased * 100);
  loaderBar.style.width = `${value}%`;
  loaderCount.textContent = String(value).padStart(2, '0');
  if (progress >= 1) {
    finishLoader();
  } else {
    requestAnimationFrame(updateLoader);
  }
}
requestAnimationFrame(updateLoader);
window.addEventListener('load', () => window.setTimeout(finishLoader, 700), { once: true });

/* Navigation + scroll response */
let lastScroll = -1;
function onScroll() {
  const y = window.scrollY || window.pageYOffset;
  if (y !== lastScroll) {
    siteNav.classList.toggle('is-scrolled', y > 36);
    lastScroll = y;
  }
  updateGallery();
}
window.addEventListener('scroll', onScroll, { passive: true });

/* Gallery helix: rotated directly by page scroll. */
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function updateGallery() {
  if (!work || !helix) return;
  const rect = work.getBoundingClientRect();
  const scrollRange = Math.max(1, work.offsetHeight - window.innerHeight);
  const progress = clamp01(-rect.top / scrollRange);
  const angle = progress * 440;
  helix.style.setProperty('--helix-rotation', `${angle.toFixed(2)}deg`);
  orbitAngle.textContent = `${String(Math.round(angle) % 360).padStart(3, '0')}°`;
  galleryProgress.style.width = `${(progress * 100).toFixed(2)}%`;
}

/* Editorial reveals */
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

/* Custom cursor */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const finePointer = window.matchMedia('(pointer: fine)');
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let ringX = cursorX;
let ringY = cursorY;
let cursorVisible = false;

if (finePointer.matches) {
  window.addEventListener('pointermove', (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (!cursorVisible) {
      cursorVisible = true;
      body.classList.add('has-cursor');
    }
    cursorDot.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
    const active = Boolean(event.target.closest('a, button, input, select, textarea, .field, .art-card'));
    body.classList.toggle('cursor-active', active);
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    cursorVisible = false;
    body.classList.remove('has-cursor');
  });

  function animateCursor() {
    ringX += (cursorX - ringX) * 0.16;
    ringY += (cursorY - ringY) * 0.16;
    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
}

/* Contact form: tactile tilt and local demo acknowledgement. */
if (formScene && contactForm) {
  formScene.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reduceMotion) return;
    const rect = formScene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    contactForm.style.setProperty('--tilt-y', `${(x * 4.2).toFixed(2)}deg`);
    contactForm.style.setProperty('--tilt-x', `${(-y * 3.2).toFixed(2)}deg`);
  });

  formScene.addEventListener('pointerleave', () => {
    contactForm.style.setProperty('--tilt-y', '0deg');
    contactForm.style.setProperty('--tilt-x', '0deg');
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = contactForm.querySelector('.submit-btn');
    const label = button.querySelector('span:first-child');
    if (button.classList.contains('is-sent')) return;
    button.classList.add('is-sent');
    label.textContent = 'Transmission received';
    window.setTimeout(() => {
      button.classList.remove('is-sent');
      label.textContent = 'Send transmission';
      contactForm.reset();
    }, 4200);
  });
}

/* Three.js hero sculpture */
function initHero() {
  const canvas = document.getElementById('hero-canvas');
  const hero = document.getElementById('home');
  if (!canvas || !hero) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (error) {
    canvas.style.display = 'none';
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.026);

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  camera.position.set(0, 0, 10.8);

  function makeStudioEnvironment() {
    const faceColors = [
      ['#f4f1e8', '#aeb96e'],
      ['#ff6047', '#2b100b'],
      ['#f9f7ed', '#d4d0c4'],
      ['#0b0b0c', '#24250f'],
      ['#8ea4ff', '#d7dcef'],
      ['#caff3d', '#4b6900']
    ];
    const faces = faceColors.map(([start, end], index) => {
      const size = 64;
      const face = document.createElement('canvas');
      face.width = size;
      face.height = size;
      const ctx = face.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.26)';
      ctx.fillRect(8, 9 + index * 2, 34, 6);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(size - 22, 0, 5, size);
      return face;
    });
    const texture = new THREE.CubeTexture(faces);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  scene.environment = makeStudioEnvironment();

  const ambient = new THREE.AmbientLight(0xf5f2e9, 0.45);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xfff4df, 5.5);
  keyLight.position.set(4, 6, 7);
  scene.add(keyLight);
  const limeLight = new THREE.PointLight(0xcaff3d, 28, 16, 1.8);
  limeLight.position.set(-4.5, 1.4, 4.8);
  scene.add(limeLight);
  const coralLight = new THREE.PointLight(0xff6047, 24, 14, 1.8);
  coralLight.position.set(4.6, -3.2, 3.2);
  scene.add(coralLight);

  const world = new THREE.Group();
  scene.add(world);

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xe4e4df,
    metalness: 0.97,
    roughness: 0.11,
    envMapIntensity: 2.1,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08
  });
  const limeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcaff3d,
    metalness: 0.55,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.5
  });
  const coralMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff6047,
    metalness: 0.25,
    roughness: 0.26,
    clearcoat: 0.8,
    envMapIntensity: 1.2
  });
  const blueMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8199ff,
    metalness: 0.72,
    roughness: 0.16,
    clearcoat: 0.8,
    envMapIntensity: 1.5
  });
  const pearlMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0ece2,
    metalness: 0.35,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.2
  });

  const mainGroup = new THREE.Group();
  world.add(mainGroup);

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.22, 0.38, 160, 24, 2, 3), limeMaterial);
  knot.rotation.set(0.4, 0.1, -0.26);
  knot.userData.interactive = true;
  knot.userData.baseScale = 1;
  knot.userData.hover = 0;
  mainGroup.add(knot);

  const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.024, 10, 160), pearlMaterial);
  orbitRing.rotation.set(1.16, 0.12, 0.3);
  mainGroup.add(orbitRing);

  const coralRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.045, 12, 140), coralMaterial);
  coralRing.rotation.set(0.36, 1.02, -0.24);
  mainGroup.add(coralRing);

  const chromeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.57, 36, 36), chrome);
  chromeSphere.position.set(-2.1, 1.28, -0.8);
  chromeSphere.userData.interactive = true;
  chromeSphere.userData.baseScale = 1;
  chromeSphere.userData.hover = 0;
  mainGroup.add(chromeSphere);

  const blueSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 3), blueMaterial);
  blueSphere.position.set(2.35, -1.56, -0.95);
  blueSphere.userData.interactive = true;
  blueSphere.userData.baseScale = 1;
  blueSphere.userData.hover = 0;
  mainGroup.add(blueSphere);

  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.25, 2),
    new THREE.MeshBasicMaterial({
      color: 0xeeeae0,
      wireframe: true,
      transparent: true,
      opacity: 0.055,
      depthWrite: false
    })
  );
  halo.rotation.set(0.2, 0.3, 0);
  mainGroup.add(halo);

  const fragmentSpecs = [
    { geo: new THREE.TetrahedronGeometry(0.28, 0), mat: coralMaterial, pos: [-2.8, -1.5, 0.55], speed: 1.1, amp: 0.16 },
    { geo: new THREE.OctahedronGeometry(0.22, 0), mat: pearlMaterial, pos: [2.9, 1.72, 0.2], speed: 0.8, amp: 0.19 },
    { geo: new THREE.TorusGeometry(0.25, 0.075, 12, 32), mat: blueMaterial, pos: [-1.45, 2.5, -0.5], speed: 1.3, amp: 0.13 },
    { geo: new THREE.BoxGeometry(0.3, 0.3, 0.3), mat: limeMaterial, pos: [1.35, 2.62, -0.9], speed: 0.95, amp: 0.15 },
    { geo: new THREE.DodecahedronGeometry(0.2, 0), mat: chrome, pos: [-3.36, 0.35, -0.9], speed: 1.05, amp: 0.22 },
    { geo: new THREE.IcosahedronGeometry(0.18, 0), mat: coralMaterial, pos: [3.45, -0.55, -0.6], speed: 1.42, amp: 0.14 },
    { geo: new THREE.TetrahedronGeometry(0.18, 0), mat: pearlMaterial, pos: [-0.45, -2.7, 0.15], speed: 0.84, amp: 0.17 },
    { geo: new THREE.SphereGeometry(0.1, 20, 20), mat: limeMaterial, pos: [1.76, 0.05, 1.1], speed: 1.55, amp: 0.2 }
  ];

  const fragments = fragmentSpecs.map((spec, index) => {
    const mesh = new THREE.Mesh(spec.geo, spec.mat);
    mesh.position.set(...spec.pos);
    mesh.rotation.set(index * 0.4, index * 0.7, index * 0.3);
    mesh.userData.interactive = true;
    mesh.userData.baseScale = 1;
    mesh.userData.hover = 0;
    mesh.userData.basePosition = mesh.position.clone();
    mesh.userData.phase = index * 0.8;
    mesh.userData.speed = spec.speed;
    mesh.userData.amp = spec.amp;
    world.add(mesh);
    return mesh;
  });

  const particleCount = window.innerWidth < 700 ? 180 : 360;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 5 + Math.random() * 11;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi) - 4;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xdcd8cc,
    size: 0.023,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: 0xcaff3d,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.012, 8, 120), pulseMaterial);
  pulseRing.rotation.x = Math.PI / 2.25;
  mainGroup.add(pulseRing);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-5, -5);
  const interactiveObjects = [knot, chromeSphere, blueSphere, ...fragments];
  let hoveredObject = null;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerCurrentX = 0;
  let pointerCurrentY = 0;
  let pulse = 0;
  let colorIndex = 0;
  const palette = [0xcaff3d, 0xff6047, 0x8ea4ff, 0xf0ece2, 0xb69bff];
  let heroVisible = true;
  let layoutScale = 1;

  function setSize() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const mobile = width < 700;
    layoutScale = mobile ? 0.83 : width < 1100 ? 0.93 : 1;
    camera.aspect = width / height;
    camera.fov = mobile ? 48 : 39;
    camera.updateProjectionMatrix();
    world.position.set(mobile ? 0 : 2.95, mobile ? 1.55 : 0.08, 0);
    world.scale.setScalar(layoutScale);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.65 : 1.8));
    renderer.setSize(width, height, false);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerTargetX = pointer.x;
    pointerTargetY = pointer.y;
  }

  function handleMove(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactiveObjects, false);
    hoveredObject = hits.length ? hits[0].object : null;
    canvas.style.cursor = hoveredObject ? 'pointer' : '';
  }

  function mutate() {
    pulse = 1;
    colorIndex = (colorIndex + 1) % palette.length;
    limeMaterial.color.setHex(palette[colorIndex]);
    pulseRing.rotation.z = Math.random() * Math.PI;
    fragments.forEach((fragment, index) => {
      const base = fragment.userData.basePosition;
      fragment.position.x = base.x + (Math.random() - 0.5) * 0.7;
      fragment.position.y = base.y + (Math.random() - 0.5) * 0.55;
      if (index % 2 === 0) fragment.rotation.x += 0.8;
    });
  }

  canvas.addEventListener('pointermove', handleMove, { passive: true });
  canvas.addEventListener('pointerleave', () => {
    pointer.set(-5, -5);
    hoveredObject = null;
    canvas.style.cursor = '';
  });
  canvas.addEventListener('pointerdown', mutate);

  const heroObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0.02 })
    : null;
  if (heroObserver) heroObserver.observe(hero);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(setSize, 80);
  });

  setSize();

  const clock = new THREE.Clock();
  let elapsed = 0;
  const motionScale = reduceMotion ? 0.15 : 1;

  function animate() {
    requestAnimationFrame(animate);
    if (!heroVisible) return;

    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta * motionScale;

    pointerCurrentX += (pointerTargetX - pointerCurrentX) * 0.045;
    pointerCurrentY += (pointerTargetY - pointerCurrentY) * 0.045;

    camera.position.x = pointerCurrentX * 0.34;
    camera.position.y = pointerCurrentY * 0.22;
    camera.lookAt(0, 0, 0);

    world.rotation.y = pointerCurrentX * 0.16 + Math.sin(elapsed * 0.22) * 0.07;
    world.rotation.x = -pointerCurrentY * 0.12 + Math.cos(elapsed * 0.17) * 0.03;

    knot.rotation.x = 0.4 + elapsed * 0.11;
    knot.rotation.y = 0.1 - elapsed * 0.07;
    knot.rotation.z = -0.26 + Math.sin(elapsed * 0.34) * 0.16;
    mainGroup.rotation.y = Math.sin(elapsed * 0.18) * 0.11;

    orbitRing.rotation.z = 0.3 + elapsed * 0.055;
    orbitRing.rotation.y = 0.12 + Math.sin(elapsed * 0.22) * 0.09;
    coralRing.rotation.x = 0.36 - elapsed * 0.08;
    coralRing.rotation.y = 1.02 + elapsed * 0.045;
    halo.rotation.y = 0.3 - elapsed * 0.025;
    halo.rotation.z = Math.sin(elapsed * 0.13) * 0.08;

    chromeSphere.position.y = 1.28 + Math.sin(elapsed * 0.7) * 0.13;
    blueSphere.position.y = -1.56 + Math.cos(elapsed * 0.64) * 0.15;
    blueSphere.rotation.x = elapsed * 0.22;
    blueSphere.rotation.y = elapsed * 0.3;

    fragments.forEach((fragment) => {
      const data = fragment.userData;
      const base = data.basePosition;
      const wave = elapsed * data.speed + data.phase;
      fragment.position.y = base.y + Math.sin(wave) * data.amp;
      fragment.position.x = base.x + Math.cos(wave * 0.62) * data.amp * 0.44;
      fragment.rotation.x += delta * 0.2;
      fragment.rotation.y += delta * 0.25;
      const target = fragment === hoveredObject ? 1.55 : 1;
      data.hover += (target - data.hover) * 0.12;
      fragment.scale.setScalar(data.hover);
    });

    const knotHoverTarget = knot === hoveredObject ? 1.055 : 1;
    knot.userData.hover += (knotHoverTarget - knot.userData.hover) * 0.09;
    knot.scale.setScalar(knot.userData.hover + pulse * 0.045);

    const chromeHoverTarget = chromeSphere === hoveredObject ? 1.18 : 1;
    chromeSphere.userData.hover += (chromeHoverTarget - chromeSphere.userData.hover) * 0.1;
    chromeSphere.scale.setScalar(chromeSphere.userData.hover);

    const blueHoverTarget = blueSphere === hoveredObject ? 1.22 : 1;
    blueSphere.userData.hover += (blueHoverTarget - blueSphere.userData.hover) * 0.1;
    blueSphere.scale.setScalar(blueSphere.userData.hover);

    pulse *= 0.94;
    pulseMaterial.opacity = pulse * 0.72;
    pulseRing.scale.setScalar(1 + (1 - pulse) * 2.2);
    pulseRing.rotation.z += delta * 0.08;

    particles.rotation.y = elapsed * 0.008;
    particles.rotation.x = Math.sin(elapsed * 0.05) * 0.035;

    renderer.render(scene, camera);
  }

  animate();
}

requestAnimationFrame(() => {
  requestAnimationFrame(initHero);
});
onScroll();
updateGallery();

/* Keep the gallery's CSS variables accurate after font/layout shifts. */
window.addEventListener('load', () => {
  updateGallery();
});
