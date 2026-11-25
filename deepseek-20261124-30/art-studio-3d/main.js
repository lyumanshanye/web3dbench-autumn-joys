import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const mix = (start, end, amount) => start + (end - start) * amount;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = document.querySelector('#loader');
const loaderCanvas = document.querySelector('#loader-canvas');
const loadPercent = document.querySelector('#load-percent');
const loadProgress = document.querySelector('#load-progress');

const hero = document.querySelector('#hero');
const heroCanvas = document.querySelector('#hero-canvas');
const heroTitle = document.querySelector('.hero__title');
const heroFooter = document.querySelector('.hero__footer');
const heroEyebrow = document.querySelector('.hero__eyebrow');

const manifesto = document.querySelector('.manifesto');
const manifestoOrb = document.querySelector('.manifesto__orb');
const manifestoWatermark = document.querySelector('.manifesto__watermark');

const gallery = document.querySelector('.gallery');
const galleryProgressBar = document.querySelector('#gallery-progress');
const galleryIndex = document.querySelector('#gallery-index');
const galleryName = document.querySelector('#gallery-name');
const galleryType = document.querySelector('#gallery-type');

const formScene = document.querySelector('#form-scene');
const contactForm = document.querySelector('#contact-form');
const formSubmit = document.querySelector('.form-submit');
const formNote = document.querySelector('.form-note');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');

const state = {
  scrollY: window.scrollY,
  heroProgress: 0,
  manifestoProgress: 0,
  galleryProgress: 0,
  pointerX: 0,
  pointerY: 0,
};

function updatePointer(event) {
  state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
  state.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
}

window.addEventListener('pointermove', updatePointer, { passive: true });

function drawLoaderFace(context, letter, faceIndex, size) {
  const backgrounds = ['#f1eee6', '#d9ff43', '#ff5d3a', '#f1eee6', '#7f70ff', '#d9ff43'];
  const foregrounds = ['#0a0a09', '#0a0a09', '#f1eee6', '#0a0a09', '#f1eee6', '#0a0a09'];
  const background = backgrounds[faceIndex];
  const foreground = foregrounds[faceIndex];

  context.clearRect(0, 0, size, size);
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = foreground;
  context.globalAlpha = 0.22;
  context.lineWidth = Math.max(1, size * 0.006);
  context.strokeRect(size * 0.055, size * 0.055, size * 0.89, size * 0.89);
  context.globalAlpha = 1;

  context.fillStyle = foreground;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${Math.round(size * 0.69)}px Arial, Helvetica, sans-serif`;
  context.fillText(letter, size * 0.5, size * 0.51);

  context.globalAlpha = 0.55;
  context.font = `600 ${Math.round(size * 0.035)}px Arial, Helvetica, sans-serif`;
  context.letterSpacing = `${size * 0.012}px`;
  context.fillText('NORB / STUDIO', size * 0.5, size * 0.91);
  context.globalAlpha = 1;
}

function initLoader() {
  const startedAt = performance.now();
  let progressTimer = 0;
  let cubeFrame = 0;
  let renderer = null;
  let animationGroup = null;
  let faceStates = [];
  let lastCycle = -1;
  let stopped = false;

  const updateProgress = (now) => {
    const elapsed = now - startedAt;
    const progress = reducedMotion ? 100 : clamp((elapsed / 1450) * 100, 0, 100);
    loadPercent.textContent = String(Math.round(progress)).padStart(2, '0');
    loadProgress.style.width = `${progress}%`;
    if (progress >= 100) {
      window.clearInterval(progressTimer);
    }
  };
  progressTimer = window.setInterval(() => updateProgress(performance.now()), 40);
  updateProgress(performance.now());

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: loaderCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 30);
    camera.position.set(0, 0, 5.1);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const warmLight = new THREE.PointLight(0xff8158, 45, 18, 2);
    warmLight.position.set(3, 2, 4);
    scene.add(warmLight);
    const coolLight = new THREE.PointLight(0x8276ff, 35, 18, 2);
    coolLight.position.set(-4, -2, 3);
    scene.add(coolLight);

    animationGroup = new THREE.Group();
    scene.add(animationGroup);

    const faceSize = 320;
    const phrase = 'NORBSTUDIO';
    faceStates = Array.from({ length: 6 }, (_, faceIndex) => {
      const canvas = document.createElement('canvas');
      canvas.width = faceSize;
      canvas.height = faceSize;
      const context = canvas.getContext('2d');
      drawLoaderFace(context, phrase[faceIndex], faceIndex, faceSize);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return { canvas, context, texture, faceIndex };
    });

    const cubeMaterials = faceStates.map(
      (face) =>
        new THREE.MeshStandardMaterial({
          map: face.texture,
          roughness: 0.42,
          metalness: 0.05,
        }),
    );

    const cubeGeometry = new THREE.BoxGeometry(1.44, 1.44, 1.44);
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
    animationGroup.add(cube);

    const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
    const edges = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.55 }),
    );
    edges.scale.setScalar(1.002);
    cube.add(edges);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0xf1eee6,
      transparent: true,
      opacity: 0.15,
    });
    const outerRing = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 128 }, (_, index) => {
          const angle = (index / 128) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * 2.05, Math.sin(angle) * 2.05, 0);
        }),
      ),
      ringMaterial,
    );
    outerRing.rotation.x = 1.05;
    outerRing.rotation.y = 0.35;
    scene.add(outerRing);

    const acidRing = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 128 }, (_, index) => {
          const angle = (index / 128) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * 1.88, Math.sin(angle) * 1.88, 0);
        }),
      ),
      new THREE.LineBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.2 }),
    );
    acidRing.rotation.x = -0.78;
    acidRing.rotation.y = -0.48;
    scene.add(acidRing);

    const clock = new THREE.Clock();
    const renderCube = () => {
      if (stopped) return;
      const elapsed = clock.getElapsedTime();
      const cycle = Math.floor(elapsed / 0.16);

      if (cycle !== lastCycle) {
        lastCycle = cycle;
        faceStates.forEach((face) => {
          const nextLetter = phrase[(cycle + face.faceIndex * 2) % phrase.length];
          drawLoaderFace(face.context, nextLetter, face.faceIndex, faceSize);
          face.texture.needsUpdate = true;
        });
      }

      animationGroup.rotation.x = elapsed * 0.58;
      animationGroup.rotation.y = elapsed * 0.82;
      animationGroup.rotation.z = elapsed * 0.18;
      animationGroup.position.y = Math.sin(elapsed * 1.15) * 0.055;
      outerRing.rotation.z = elapsed * 0.12;
      acidRing.rotation.z = -elapsed * 0.17;
      renderer.render(scene, camera);
      cubeFrame = requestAnimationFrame(renderCube);
    };
    renderCube();

    const resizeLoader = () => {
      if (!renderer) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resizeLoader, { passive: true });
  } catch (error) {
    console.warn('Loader 3D scene unavailable:', error);
    if (loaderCanvas) loaderCanvas.style.display = 'none';
  }

  window.setTimeout(() => {
    stopped = true;
    window.clearInterval(progressTimer);
    cancelAnimationFrame(cubeFrame);
    if (loader) loader.style.pointerEvents = 'none';
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
    if (loaderCanvas) loaderCanvas.style.display = 'none';
  }, 2800);
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.88)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.09)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function initHero() {
  if (!hero || !heroCanvas) {
    return { render: () => {}, resize: () => {} };
  }

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: heroCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 6.5);

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.032).texture;
    scene.environment = environmentMap;
    pmremGenerator.dispose();

    const hemisphereLight = new THREE.HemisphereLight(0xfff3df, 0x160b08, 1.1);
    scene.add(hemisphereLight);

    const warmLight = new THREE.PointLight(0xff7548, 95, 20, 2);
    warmLight.position.set(4.5, 2.8, 4.2);
    scene.add(warmLight);

    const coolLight = new THREE.PointLight(0x6f68ff, 75, 22, 2);
    coolLight.position.set(-4.4, 0.2, 3.6);
    scene.add(coolLight);

    const acidLight = new THREE.PointLight(0xd9ff43, 45, 14, 2);
    acidLight.position.set(2.4, -2.8, 3);
    scene.add(acidLight);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: 0xff5a32,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(4.7, 4.7, 1);
    glow.position.z = -0.8;
    sculpture.add(glow);

    const isNarrow = window.innerWidth < 900;
    const sphereSegments = isNarrow ? 42 : 62;
    const coreGeometry = new THREE.SphereGeometry(1.06, sphereSegments, sphereSegments);
    const basePositions = Float32Array.from(coreGeometry.attributes.position.array);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff5c35,
      emissive: 0x220600,
      emissiveIntensity: 0.24,
      metalness: 0.54,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.055,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [120, 760],
      envMapIntensity: 1.45,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    sculpture.add(core);

    const knotMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd9ff43,
      emissive: 0x192200,
      emissiveIntensity: 0.5,
      metalness: 0.48,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.14,
      iridescence: 0.65,
      iridescenceIOR: 1.4,
      envMapIntensity: 1.5,
    });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.17, 0.074, 280, 20, 2, 3), knotMaterial);
    knot.rotation.set(0.65, -0.2, 0.35);
    sculpture.add(knot);

    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf7f3e8,
      metalness: 1,
      roughness: 0.045,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.8,
    });

    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.68, 0.012, 8, 240),
      new THREE.MeshBasicMaterial({ color: 0xf1eee6, transparent: true, opacity: 0.38 }),
    );
    haloRing.rotation.set(1.05, 0.12, -0.32);
    sculpture.add(haloRing);

    const acidRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.92, 0.007, 6, 220),
      new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.34 }),
    );
    acidRing.rotation.set(0.3, 1.18, 0.42);
    sculpture.add(acidRing);

    const chromeOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 48), chromeMaterial);
    chromeOrb.position.set(-1.45, 1.05, 0.56);
    sculpture.add(chromeOrb);

    const satellites = [];
    const satelliteMaterials = {
      chrome: chromeMaterial,
      acid: new THREE.MeshPhysicalMaterial({
        color: 0xd9ff43,
        metalness: 0.32,
        roughness: 0.22,
        clearcoat: 0.65,
        envMapIntensity: 1.2,
      }),
      coral: new THREE.MeshPhysicalMaterial({
        color: 0xff5d3a,
        metalness: 0.42,
        roughness: 0.19,
        clearcoat: 0.7,
        envMapIntensity: 1.3,
      }),
      violet: new THREE.MeshPhysicalMaterial({
        color: 0x7f70ff,
        metalness: 0.6,
        roughness: 0.16,
        clearcoat: 0.75,
        envMapIntensity: 1.4,
      }),
    };

    const satelliteGeometry = {
      octa: new THREE.OctahedronGeometry(0.14, 0),
      sphere: new THREE.SphereGeometry(0.115, 30, 30),
      torus: new THREE.TorusGeometry(0.16, 0.045, 12, 36),
      tetra: new THREE.TetrahedronGeometry(0.14, 0),
      cylinder: new THREE.CylinderGeometry(0.09, 0.14, 0.24, 8),
    };

    const addSatellite = (geometry, material, radius, speed, phase, verticalOffset, verticalRange) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.orbit = { radius, speed, phase, verticalOffset, verticalRange };
      sculpture.add(mesh);
      satellites.push(mesh);
    };

    addSatellite(satelliteGeometry.octa, satelliteMaterials.acid, 1.85, 0.35, 0.4, 0.95, 0.3);
    addSatellite(satelliteGeometry.torus, satelliteMaterials.violet, 1.7, -0.28, 2.2, -0.9, 0.34);
    addSatellite(satelliteGeometry.sphere, satelliteMaterials.chrome, 2.15, 0.21, 4.1, 0.1, 0.45);
    addSatellite(satelliteGeometry.tetra, satelliteMaterials.coral, 1.55, 0.4, 5.4, -0.35, 0.42);
    addSatellite(satelliteGeometry.cylinder, satelliteMaterials.acid, 2.0, -0.24, 1.2, 1.3, 0.25);
    addSatellite(satelliteGeometry.sphere, satelliteMaterials.violet, 1.8, 0.31, 3.3, -1.25, 0.28);
    addSatellite(satelliteGeometry.octa, satelliteMaterials.coral, 2.23, -0.18, 0.7, 0.55, 0.46);

    const wireCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.56, 1),
      new THREE.MeshBasicMaterial({
        color: 0xf1eee6,
        wireframe: true,
        transparent: true,
        opacity: 0.045,
      }),
    );
    sculpture.add(wireCage);

    const particleCount = window.innerWidth < 900 ? 150 : 320;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.6 + Math.random() * 4.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.8;
      particlePositions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xf1eee6,
        size: 0.015,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(particles);

    let composer = null;
    if (window.innerWidth >= 760 && !reducedMotion) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.62, 0.92);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    let baseX = 1.65;
    let baseY = 0.18;
    let baseScale = 1;
    let impulse = 0;
    let morphFrame = 0;
    let smoothedPointerX = 0;
    let smoothedPointerY = 0;
    const clock = new THREE.Clock();

    const resize = () => {
      const width = hero.clientWidth || window.innerWidth;
      const height = hero.clientHeight || window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 900 ? 1.65 : 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (composer) {
        composer.setSize(width, height);
      }

      if (width < 900) {
        baseX = 0.04;
        baseY = 0.4;
        baseScale = 0.67;
      } else if (width < 1180) {
        baseX = 1.35;
        baseY = 0.2;
        baseScale = 0.9;
      } else {
        baseX = 1.65;
        baseY = 0.18;
        baseScale = 1;
      }
      sculpture.scale.setScalar(baseScale);
    };

    const render = () => {
      if (state.heroProgress > 1.15) return;
      const elapsed = clock.getElapsedTime();
      smoothedPointerX = mix(smoothedPointerX, state.pointerX, 0.045);
      smoothedPointerY = mix(smoothedPointerY, state.pointerY, 0.045);
      impulse *= 0.952;

      const position = coreGeometry.attributes.position;
      for (let index = 0; index < position.count; index += 1) {
        const offset = index * 3;
        const baseXValue = basePositions[offset];
        const baseYValue = basePositions[offset + 1];
        const baseZValue = basePositions[offset + 2];
        const wave =
          Math.sin(baseXValue * 4.3 + elapsed * 1.05) * Math.sin(baseYValue * 3.6 - elapsed * 0.76) * 0.05 +
          Math.sin(baseZValue * 5.2 + elapsed * 0.83) * 0.026 +
          Math.sin((baseXValue + baseYValue + baseZValue) * 2.2 - elapsed * 0.52) * 0.015;
        const reactive = Math.sin((baseXValue - baseYValue) * 5.8 + elapsed * 2.4) * impulse * 0.055;
        const scale = 1 + wave + reactive;
        position.setXYZ(index, baseXValue * scale, baseYValue * scale, baseZValue * scale);
      }
      position.needsUpdate = true;
      morphFrame += 1;
      if (morphFrame % 2 === 0) coreGeometry.computeVertexNormals();

      sculpture.position.x = baseX + smoothedPointerX * 0.17;
      sculpture.position.y = baseY - smoothedPointerY * 0.12 + Math.sin(elapsed * 0.62) * 0.045;
      sculpture.position.z = Math.sin(elapsed * 0.38) * 0.09;
      sculpture.rotation.y = elapsed * 0.11 + smoothedPointerX * 0.16;
      sculpture.rotation.x = smoothedPointerY * 0.07;
      sculpture.rotation.z = Math.sin(elapsed * 0.3) * 0.035 + impulse * 0.05;

      core.rotation.y = -elapsed * 0.12;
      knot.rotation.x = 0.65 + elapsed * 0.19;
      knot.rotation.y = -0.2 + elapsed * 0.13;
      knot.rotation.z = 0.35 + elapsed * 0.07;
      haloRing.rotation.z = -0.32 + elapsed * 0.16;
      acidRing.rotation.y = 1.18 - elapsed * 0.11;
      wireCage.rotation.y = elapsed * 0.045;
      wireCage.rotation.x = elapsed * 0.028;
      chromeOrb.position.y = 1.05 + Math.sin(elapsed * 1.1 + 0.4) * 0.07;
      particles.rotation.y = elapsed * 0.018;
      particles.rotation.z = elapsed * 0.009;

      satellites.forEach((satellite, index) => {
        const orbit = satellite.userData.orbit;
        const angle = orbit.phase + elapsed * orbit.speed;
        satellite.position.set(
          Math.cos(angle) * orbit.radius,
          orbit.verticalOffset + Math.sin(angle * 1.45 + index) * orbit.verticalRange,
          Math.sin(angle) * orbit.radius * 0.56,
        );
        satellite.rotation.x = elapsed * 0.52 + index;
        satellite.rotation.y = elapsed * 0.41 + index * 0.6;
        satellite.rotation.z = angle * 0.7;
      });

      if (state.heroProgress < 1.05) {
        if (composer) composer.render();
        else renderer.render(scene, camera);
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener(
      'pointerdown',
      (event) => {
        if (state.heroProgress > 0.9) return;
        if (event.target.closest('a, button, input, select, textarea, label')) return;
        impulse = 1;
      },
      { passive: true },
    );

    return { render, resize };
  } catch (error) {
    console.warn('Hero 3D scene unavailable:', error);
    heroCanvas.style.display = 'none';
    return { render: () => {}, resize: () => {} };
  }
}

function seededRandom(seed) {
  let stateValue = seed >>> 0;
  return () => {
    stateValue += 0x6d2b79f5;
    let value = stateValue;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const artworks = [
  {
    title: 'Soft Machine',
    medium: 'Digital sculpture · 2026',
    palette: ['#ff5d3a', '#290a05', '#d9ff43', '#f1eee6'],
    motif: 'orb',
  },
  {
    title: 'Liquid Archive',
    medium: 'Motion study · 2025',
    palette: ['#7f70ff', '#07061a', '#ff5d3a', '#f1eee6'],
    motif: 'ribbon',
  },
  {
    title: 'Chromatic Drift',
    medium: 'Spatial identity · 2025',
    palette: ['#d9ff43', '#101403', '#ff5d3a', '#0a0a09'],
    motif: 'grid',
  },
  {
    title: 'After Gravity',
    medium: 'Film / installation · 2024',
    palette: ['#f1eee6', '#12110f', '#ff5d3a', '#7f70ff'],
    motif: 'arch',
  },
  {
    title: 'Synthetic Bloom',
    medium: 'Generative object · 2026',
    palette: ['#ff9a76', '#260b04', '#d9ff43', '#090909'],
    motif: 'orb',
  },
  {
    title: 'Nocturne 04',
    medium: 'Campaign world · 2024',
    palette: ['#3f8cff', '#030a20', '#f1eee6', '#d9ff43'],
    motif: 'ribbon',
  },
  {
    title: 'Velvet Static',
    medium: 'Motion system · 2025',
    palette: ['#ffc4ef', '#1d0918', '#7f70ff', '#ff5d3a'],
    motif: 'grid',
  },
  {
    title: 'Second Nature',
    medium: 'Digital ecosystem · 2023',
    palette: ['#bffc70', '#0a1505', '#0a0a09', '#f1eee6'],
    motif: 'arch',
  },
  {
    title: 'Impossible Garden',
    medium: 'Interactive space · 2026',
    palette: ['#ff5d3a', '#f1eee6', '#0a0a09', '#7f70ff'],
    motif: 'orb',
  },
  {
    title: 'Signal / Noise',
    medium: 'Visual identity · 2024',
    palette: ['#9d8cff', '#06050e', '#d9ff43', '#f1eee6'],
    motif: 'ribbon',
  },
];

function drawArtwork(index, artwork) {
  const width = 512;
  const height = 640;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const random = seededRandom(91 + index * 137);
  const palette = artwork.palette;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, palette[1]);
  background.addColorStop(0.55, palette[0]);
  background.addColorStop(1, palette[1]);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalCompositeOperation = 'screen';
  for (let glowIndex = 0; glowIndex < 4; glowIndex += 1) {
    const glowX = width * (0.08 + random() * 0.84);
    const glowY = height * (0.08 + random() * 0.72);
    const glowRadius = width * (0.16 + random() * 0.32);
    const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
    glow.addColorStop(0, `${palette[(glowIndex % 2) + 2]}bb`);
    glow.addColorStop(0.55, `${palette[(glowIndex % 2) + 2]}36`);
    glow.addColorStop(1, `${palette[(glowIndex % 2) + 2]}00`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }
  context.globalCompositeOperation = 'source-over';

  context.save();
  context.translate(width * 0.5, height * 0.43);
  context.rotate((random() - 0.5) * 0.7);

  if (artwork.motif === 'orb') {
    const orbRadius = width * (0.23 + random() * 0.08);
    const orb = context.createRadialGradient(-orbRadius * 0.34, -orbRadius * 0.4, orbRadius * 0.03, 0, 0, orbRadius);
    orb.addColorStop(0, '#ffffff');
    orb.addColorStop(0.08, palette[3]);
    orb.addColorStop(0.34, palette[2]);
    orb.addColorStop(0.68, palette[1]);
    orb.addColorStop(1, '#050505');
    context.fillStyle = orb;
    context.beginPath();
    context.arc(0, 0, orbRadius, 0, Math.PI * 2);
    context.fill();

    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      context.save();
      context.rotate(ringIndex * 0.72 + random() * 0.3);
      context.scale(1, 0.31 + ringIndex * 0.08);
      context.strokeStyle = ringIndex === 1 ? palette[2] : `${palette[3]}bb`;
      context.lineWidth = 2 + ringIndex * 1.5;
      context.beginPath();
      context.arc(0, 0, orbRadius * (1.2 + ringIndex * 0.21), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  } else if (artwork.motif === 'ribbon') {
    for (let ribbonIndex = 0; ribbonIndex < 4; ribbonIndex += 1) {
      const ribbonWidth = width * (0.23 + ribbonIndex * 0.035);
      const ribbonHeight = height * (0.45 + random() * 0.18);
      const gradient = context.createLinearGradient(-ribbonWidth, 0, ribbonWidth, ribbonHeight);
      gradient.addColorStop(0, palette[(ribbonIndex + 1) % 4]);
      gradient.addColorStop(0.55, palette[2]);
      gradient.addColorStop(1, palette[3]);
      context.strokeStyle = gradient;
      context.lineWidth = 13 + ribbonIndex * 6;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-ribbonWidth, ribbonHeight * 0.42);
      context.bezierCurveTo(-ribbonWidth * 0.2, -ribbonHeight * 0.7, ribbonWidth * 0.38, ribbonHeight * 0.9, ribbonWidth, -ribbonHeight * 0.25);
      context.stroke();
    }

    context.globalAlpha = 0.55;
    for (let lineIndex = 0; lineIndex < 32; lineIndex += 1) {
      const lineX = (random() - 0.5) * width * 1.1;
      const lineY = (random() - 0.5) * height * 0.8;
      context.strokeStyle = lineIndex % 4 === 0 ? palette[2] : `${palette[3]}ab`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(lineX, lineY);
      context.lineTo(lineX + 20 + random() * 80, lineY + (random() - 0.5) * 40);
      context.stroke();
    }
    context.globalAlpha = 1;
  } else if (artwork.motif === 'grid') {
    const cellSize = 56;
    for (let row = -4; row <= 4; row += 1) {
      for (let column = -4; column <= 4; column += 1) {
        const distance = Math.sqrt(row * row + column * column);
        if (distance > 4.2) continue;
        const dotRadius = 5 + Math.max(0, 18 - distance * 3.4);
        context.fillStyle = distance < 2 ? palette[2] : `${palette[3]}${distance < 3.2 ? 'cc' : '66'}`;
        context.beginPath();
        context.arc(column * cellSize, row * cellSize, dotRadius, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.strokeStyle = `${palette[3]}73`;
    context.lineWidth = 1;
    context.strokeRect(-width * 0.32, -height * 0.31, width * 0.64, height * 0.62);
  } else {
    context.lineCap = 'butt';
    for (let archIndex = 0; archIndex < 7; archIndex += 1) {
      context.strokeStyle = archIndex % 3 === 0 ? palette[2] : `${palette[3]}b8`;
      context.lineWidth = 10 + archIndex * 2.4;
      context.beginPath();
      context.arc(0, height * 0.1, width * (0.12 + archIndex * 0.048), Math.PI, Math.PI * 2);
      context.stroke();
    }
    const blockSize = width * 0.2;
    context.fillStyle = palette[2];
    context.fillRect(-blockSize * 0.5, height * 0.09, blockSize, blockSize * 1.7);
    context.fillStyle = palette[1];
    context.beginPath();
    context.arc(0, height * 0.09 + blockSize * 0.88, blockSize * 0.26, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.globalCompositeOperation = 'source-over';
  for (let speckIndex = 0; speckIndex < 500; speckIndex += 1) {
    context.fillStyle = speckIndex % 3 === 0 ? `${palette[3]}55` : 'rgba(255,255,255,0.18)';
    context.fillRect(random() * width, random() * height, 1.1, 1.1);
  }

  const footerGradient = context.createLinearGradient(0, height - 190, 0, height);
  footerGradient.addColorStop(0, 'rgba(5,5,5,0)');
  footerGradient.addColorStop(1, 'rgba(5,5,5,0.86)');
  context.fillStyle = footerGradient;
  context.fillRect(0, height - 190, width, 190);

  context.strokeStyle = 'rgba(241,238,230,0.25)';
  context.lineWidth = 1;
  context.strokeRect(22, 22, width - 44, height - 44);

  context.fillStyle = '#f1eee6';
  context.font = '600 9px Arial, Helvetica, sans-serif';
  context.textAlign = 'left';
  context.fillText('NORB STUDIO / OBJECT ARCHIVE', 38, 48);
  context.textAlign = 'right';
  context.fillText(String(index + 1).padStart(2, '0'), width - 38, 48);

  context.textAlign = 'left';
  context.font = '700 29px Arial, Helvetica, sans-serif';
  context.fillText(artwork.title.toUpperCase(), 38, height - 69);
  context.fillStyle = 'rgba(241,238,230,0.64)';
  context.font = '500 9px Arial, Helvetica, sans-serif';
  context.fillText(artwork.medium.toUpperCase(), 38, height - 48);

  return canvas;
}

function initHelix() {
  const canvas = document.querySelector('#helix-canvas');
  if (!gallery || !canvas) {
    return { render: () => {}, resize: () => {} };
  }

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080808, 0.028);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 11.8);

    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    const axisMaterial = new THREE.MeshBasicMaterial({
      color: 0xf1eee6,
      transparent: true,
      opacity: 0.12,
    });
    const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 9.4, 6), axisMaterial);
    scene.add(axis);

    const cardGroups = [];
    const cardWidth = 1.64;
    const cardHeight = 2.1;
    const cardCount = artworks.length;
    const angleStep = (Math.PI * 2 * 1.28) / cardCount;
    const radius = 2.62;
    const ySpacing = 0.69;
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    artworks.forEach((artwork, index) => {
      const cardGroup = new THREE.Group();
      const angle = index * angleStep - Math.PI * 0.18;
      cardGroup.position.set(
        Math.sin(angle) * radius,
        (index - (cardCount - 1) / 2) * ySpacing,
        Math.cos(angle) * radius,
      );

      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(cardWidth + 0.07, cardHeight + 0.07),
        new THREE.MeshBasicMaterial({ color: 0x090909, toneMapped: false }),
      );
      frame.position.z = -0.012;

      const artCanvas = drawArtwork(index, artwork);
      const texture = new THREE.CanvasTexture(artCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(cardWidth, cardHeight),
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
      art.position.z = 0.004;

      const outlinePoints = [
        new THREE.Vector3(-cardWidth / 2, -cardHeight / 2, 0.014),
        new THREE.Vector3(cardWidth / 2, -cardHeight / 2, 0.014),
        new THREE.Vector3(cardWidth / 2, cardHeight / 2, 0.014),
        new THREE.Vector3(-cardWidth / 2, cardHeight / 2, 0.014),
      ];
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(outlinePoints),
        new THREE.LineBasicMaterial({ color: 0xf1eee6, transparent: true, opacity: 0.26 }),
      );

      cardGroup.add(frame, art, outline);
      cardGroup.userData = { index, baseScale: 1, angle };
      helixGroup.add(cardGroup);
      cardGroups.push(cardGroup);
    });

    for (let ringIndex = 0; ringIndex < 5; ringIndex += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.0045, 5, 160),
        new THREE.MeshBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: 0.12 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = (ringIndex - 2) * 1.5;
      helixGroup.add(ring);
    }

    const dustCount = window.innerWidth < 900 ? 70 : 140;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 2.8 + Math.random() * 3.2;
      dustPositions[index * 3] = Math.cos(angle) * distance;
      dustPositions[index * 3 + 1] = (Math.random() - 0.5) * 8;
      dustPositions[index * 3 + 2] = Math.sin(angle) * distance;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0xd9ff43,
        size: 0.018,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    scene.add(dust);

    let dragging = false;
    let lastPointerX = 0;
    let dragOffset = 0;
    let dragVelocity = 0;
    let activeIndex = -1;
    let lastActiveIndex = -1;
    let galleryInView = true;
    let angleSmoothing = 0;

    const setActive = (index) => {
      if (index === activeIndex) return;
      activeIndex = index;
      if (index !== lastActiveIndex) {
        lastActiveIndex = index;
        const artwork = artworks[index];
        galleryIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cardCount).padStart(2, '0')}`;
        galleryName.textContent = artwork.title;
        galleryType.textContent = artwork.medium;
      }
    };

    const updateActiveIndex = () => {
      let closestIndex = 0;
      let closestDistance = Infinity;
      cardGroups.forEach((cardGroup, index) => {
        const worldAngle = cardGroup.userData.angle + helixGroup.rotation.y;
        const normalizedAngle = Math.atan2(Math.sin(worldAngle), Math.cos(worldAngle));
        const distance = Math.abs(normalizedAngle);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActive(closestIndex);
    };

    const resize = () => {
      const width = canvas.clientWidth || gallery.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 900 ? 1.6 : 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      if (width < 900) {
        camera.position.z = 13.8;
        helixGroup.scale.setScalar(0.84);
      } else if (width < 1200) {
        camera.position.z = 12.7;
        helixGroup.scale.setScalar(0.93);
      } else {
        camera.position.z = 11.8;
        helixGroup.scale.setScalar(1);
      }
      camera.updateProjectionMatrix();
    };

    const startDrag = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      lastPointerX = event.clientX;
      dragVelocity = 0;
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      dragOffset += deltaX * 0.0062;
      dragVelocity = deltaX * 0.00026;
    };

    const endDrag = () => {
      dragging = false;
    };

    canvas.addEventListener('pointerdown', startDrag);
    canvas.addEventListener('pointermove', moveDrag);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', (event) => {
      if (!event.buttons) endDrag();
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          galleryInView = entry.isIntersecting;
        });
      },
      { rootMargin: '180px 0px' },
    );
    observer.observe(gallery);

    const clock = new THREE.Clock();
    const render = () => {
      if (!galleryInView) return;
      const elapsed = clock.getElapsedTime();
      if (!dragging) {
        dragOffset += dragVelocity;
        dragVelocity *= 0.91;
      }

      const targetRotation = state.galleryProgress * Math.PI * 2.35 + dragOffset;
      angleSmoothing = mix(angleSmoothing, targetRotation, 0.085);
      helixGroup.rotation.y = angleSmoothing;
      helixGroup.rotation.z = Math.sin(elapsed * 0.22) * 0.017;
      helixGroup.position.y = Math.sin(elapsed * 0.38) * 0.055;
      helixGroup.updateMatrixWorld(true);

      cardGroups.forEach((cardGroup) => {
        cardGroup.lookAt(camera.position);
      });

      updateActiveIndex();
      cardGroups.forEach((cardGroup, index) => {
        const targetScale = index === activeIndex ? 1.045 : 0.992;
        const nextScale = mix(cardGroup.scale.x, targetScale, 0.075);
        cardGroup.scale.setScalar(nextScale);
      });

      dust.rotation.y = elapsed * 0.03;
      dust.rotation.z = elapsed * 0.012;
      renderer.render(scene, camera);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    return { render, resize };
  } catch (error) {
    console.warn('Helix gallery 3D scene unavailable:', error);
    canvas.style.display = 'none';
    return { render: () => {}, resize: () => {} };
  }
}

function initInterface() {
  menuToggle?.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  if (manifesto) revealObserver.observe(manifesto);

  const resetFormTilt = () => {
    const isNarrow = window.innerWidth <= 900;
    formScene.style.setProperty('--rotate-x', isNarrow ? '1deg' : '2.5deg');
    formScene.style.setProperty('--rotate-y', isNarrow ? '0deg' : '-5.5deg');
  };

  formScene?.addEventListener('pointermove', (event) => {
    if (window.innerWidth <= 900) return;
    const bounds = formScene.getBoundingClientRect();
    const relativeX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const relativeY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    formScene.style.setProperty('--rotate-x', `${2.5 - (relativeY - 0.5) * 3.4}deg`);
    formScene.style.setProperty('--rotate-y', `${-5.5 + (relativeX - 0.5) * 5.2}deg`);
  });
  formScene?.addEventListener('pointerleave', resetFormTilt);
  window.addEventListener('resize', resetFormTilt, { passive: true });

  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    contactForm.classList.add('is-sent');
    formSubmit.querySelector('span').textContent = 'Signal received';
    formSubmit.querySelector('i').textContent = '✓';
    formNote.textContent = 'Transmission logged. We answer within two working days.';
  });
}

function updateScrollState() {
  state.scrollY = window.scrollY;
  state.heroProgress = clamp(state.scrollY / Math.max(window.innerHeight, 1), 0, 1.4);

  if (heroCanvas) {
    const canvasShift = Math.min(state.scrollY, window.innerHeight) * 0.15;
    heroCanvas.style.transform = `translate3d(0, ${canvasShift}px, 0)`;
    heroCanvas.style.opacity = String(clamp(1 - state.heroProgress * 0.28, 0.62, 1));
  }
  if (heroTitle) {
    heroTitle.style.transform = `translate3d(0, ${Math.min(state.scrollY, window.innerHeight) * -0.13}px, 0)`;
  }
  if (heroFooter) {
    heroFooter.style.opacity = String(clamp(1 - state.heroProgress * 2.8, 0, 1));
  }
  if (heroEyebrow) {
    heroEyebrow.style.opacity = String(clamp(1 - state.heroProgress * 2.1, 0, 1));
  }

  if (manifesto) {
    const manifestoBounds = manifesto.getBoundingClientRect();
    const manifestoDistance = Math.max(manifesto.offsetHeight - window.innerHeight, 1);
    state.manifestoProgress = clamp(-manifestoBounds.top / manifestoDistance, 0, 1);
    if (manifestoOrb) {
      manifestoOrb.style.transform = `translate3d(0, ${state.manifestoProgress * -11}vh, 0) rotate(${state.manifestoProgress * 30}deg)`;
    }
    if (manifestoWatermark) {
      manifestoWatermark.style.transform = `translate3d(${state.manifestoProgress * -5}vw, ${state.manifestoProgress * -2}vh, 0) rotate(${state.manifestoProgress * -6}deg)`;
    }
  }

  if (gallery) {
    const galleryBounds = gallery.getBoundingClientRect();
    const galleryDistance = Math.max(gallery.offsetHeight - window.innerHeight, 1);
    state.galleryProgress = clamp(-galleryBounds.top / galleryDistance, 0, 1);
    if (galleryProgressBar) {
      galleryProgressBar.style.transform = `scaleX(${Math.max(0.02, state.galleryProgress)})`;
    }
  }
}

function start() {
  initLoader();
  const heroScene = initHero();
  const helixScene = initHelix();
  initInterface();

  let lastTime = 0;
  const tick = (now) => {
    updateScrollState();
    if (now - lastTime > 16 || reducedMotion) {
      heroScene.render(now);
      helixScene.render(now);
      lastTime = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
