import * as THREE from 'three';

const trips = [
  {
    id: 'kyoto',
    number: '01',
    title: 'Kyoto in the rain',
    city: 'Kyoto',
    country: 'Japan',
    continent: 'Asia',
    lat: 35.0116,
    lng: 135.7681,
    year: '2025',
    start: '2025-03-24',
    end: '2025-03-29',
    dateLabel: '24–29 March 2025',
    shortDate: '24–29 Mar 2025',
    cardNote: 'Rain, cedar smoke, and one perfect bowl of udon.',
    entry: 'The rain arrived before I did, turning the stone lanes of Gion into dark mirrors. I spent the morning under the eaves of a tiny kissaten, listening to cups settle and watching umbrellas drift uphill. On the last night the clouds broke just long enough to turn the river silver.',
    image: './assets/kyoto.jpg',
    alt: 'A narrow traditional street in Kyoto, Japan, after rain.',
    caption: 'Gion, after the rain · Kyoto, Japan'
  },
  {
    id: 'lisbon',
    number: '02',
    title: 'Lisbon, uphill',
    city: 'Lisbon',
    country: 'Portugal',
    continent: 'Europe',
    lat: 38.7223,
    lng: -9.1393,
    year: '2025',
    start: '2025-04-18',
    end: '2025-04-23',
    dateLabel: '18–23 April 2025',
    shortDate: '18–23 Apr 2025',
    cardNote: 'Tram bells, tiled walls, and apricot rooftops.',
    entry: 'Lisbon is a city built on staircases. I followed the tram lines until they became alleys, then followed the smell of charcoal and salt down to the water. At Miradouro da Graça, the rooftops went apricot at seven and nobody seemed in a hurry to leave.',
    image: './assets/lisbon.jpg',
    alt: 'Pastel buildings and a yellow tram on a narrow Lisbon street.',
    caption: 'Alfama from the tram line · Lisbon, Portugal'
  },
  {
    id: 'banff',
    number: '03',
    title: 'The lake before wind',
    city: 'Banff',
    country: 'Canada',
    continent: 'North America',
    lat: 51.1784,
    lng: -115.5708,
    year: '2024',
    start: '2024-09-02',
    end: '2024-09-07',
    dateLabel: '2–7 September 2024',
    shortDate: '2–7 Sep 2024',
    cardNote: 'A still lake holding the whole mountain upside down.',
    entry: 'We woke before the sun and drove through a corridor of larch and granite. The lake was impossibly still, holding the whole mountain upside down. By afternoon the wind had arrived, and the water turned from turquoise to a hard, bright blue.',
    image: './assets/banff.jpg',
    alt: 'A turquoise mountain lake beneath snow-dusted peaks in Banff, Canada.',
    caption: 'Moraine Lake at first light · Banff, Canada'
  },
  {
    id: 'marrakech',
    number: '04',
    title: 'Mint tea in the medina',
    city: 'Marrakech',
    country: 'Morocco',
    continent: 'Africa',
    lat: 31.6295,
    lng: -7.9811,
    year: '2024',
    start: '2024-05-12',
    end: '2024-05-17',
    dateLabel: '12–17 May 2024',
    shortDate: '12–17 May 2024',
    cardNote: 'Mint tea, spice smoke, and a maze of clay walls.',
    entry: 'The medina rearranged my sense of direction every hour. I drank mint tea on a rooftop while the call to prayer moved across the city in waves. In the evening, the square filled with smoke, drums, and the clatter of small glasses.',
    image: './assets/marrakech.jpg',
    alt: 'Warm clay walls and an arched passage in the Marrakech medina.',
    caption: 'The medina at golden hour · Marrakech, Morocco'
  },
  {
    id: 'sydney',
    number: '05',
    title: 'Harbour, late light',
    city: 'Sydney',
    country: 'Australia',
    continent: 'Oceania',
    lat: -33.8688,
    lng: 151.2093,
    year: '2024',
    start: '2024-01-10',
    end: '2024-01-17',
    dateLabel: '10–17 January 2024',
    shortDate: '10–17 Jan 2024',
    cardNote: 'Harbour light, ferry wakes, and fish and chips.',
    entry: 'The harbour did that thing where the water looks lacquered and the ferries seem to float above it. I walked from the Opera House to the far side of the bridge, then ate fish and chips while the light went pink. It was a city showing off, gently.',
    image: './assets/sydney.jpg',
    alt: 'Sydney Opera House and the harbour under a pale evening sky.',
    caption: 'Sydney Harbour at dusk · Sydney, Australia'
  },
  {
    id: 'patagonia',
    number: '06',
    title: 'At the edge of the wind',
    city: 'Patagonia',
    country: 'Chile',
    continent: 'South America',
    lat: -50.9423,
    lng: -73.4068,
    year: '2023',
    start: '2023-11-06',
    end: '2023-11-14',
    dateLabel: '6–14 November 2023',
    shortDate: '6–14 Nov 2023',
    cardNote: 'Wind-flattened grass beneath the granite towers.',
    entry: 'Wind owns Patagonia. It combed the grass flat, pushed ripples across the lake, and made every layer of clothing feel necessary. We hiked for six hours to see the towers flush pink at sunset. The silence afterward was the loudest thing I have ever heard.',
    image: './assets/patagonia.jpg',
    alt: 'Granite peaks above a cold lake in Torres del Paine, Patagonia.',
    caption: 'Torres del Paine at sunset · Patagonian Chile'
  }
];

trips.sort((a, b) => b.start.localeCompare(a.start));
trips.forEach((trip, index) => {
  trip.number = String(index + 1).padStart(2, '0');
});

const tripById = new Map(trips.map((trip) => [trip.id, trip]));

const refs = {
  workspace: document.getElementById('workspace'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  yearFilter: document.getElementById('yearFilter'),
  resultsCopy: document.getElementById('resultsCopy'),
  resultCount: document.getElementById('resultCount'),
  filterLabel: document.getElementById('filterLabel'),
  tripList: document.getElementById('tripList'),
  emptyState: document.getElementById('emptyState'),
  clearFilters: document.getElementById('clearFilters'),
  viewButtons: [...document.querySelectorAll('[data-view]')],
  tripDetail: document.getElementById('tripDetail'),
  detailNumber: document.getElementById('detailNumber'),
  detailImage: document.getElementById('detailImage'),
  detailCaption: document.getElementById('detailCaption'),
  detailYear: document.getElementById('detailYear'),
  detailLocation: document.getElementById('detailLocation'),
  detailTitle: document.getElementById('detailTitle'),
  detailDate: document.getElementById('detailDate'),
  detailEntry: document.getElementById('detailEntry'),
  detailCoords: document.getElementById('detailCoords'),
  detailContinent: document.getElementById('detailContinent'),
  closeDetail: document.getElementById('closeDetail'),
  shareTrip: document.getElementById('shareTrip'),
  globeStage: document.getElementById('globeStage'),
  globeCanvas: document.getElementById('globeCanvas'),
  markerLayer: document.getElementById('markerLayer'),
  globeStatus: document.getElementById('globeStatus'),
  globeEmptyNote: document.getElementById('globeEmptyNote'),
  resetView: document.getElementById('resetView'),
  clusterPopover: document.getElementById('clusterPopover'),
  clusterList: document.getElementById('clusterList'),
  toast: document.getElementById('toast')
};

const state = {
  query: '',
  year: 'all',
  view: 'index',
  filtered: [...trips],
  activeTripId: null
};

const markerElements = new Map();
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionQuery.matches;
let toastTimer = 0;

function normalize(value) {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesFilters(trip) {
  if (state.year !== 'all' && trip.year !== state.year) return false;
  if (!state.query) return true;
  const haystack = normalize([
    trip.title,
    trip.city,
    trip.country,
    trip.continent,
    trip.cardNote,
    trip.entry,
    trip.dateLabel,
    trip.year
  ].join(' '));
  return haystack.includes(normalize(state.query));
}

function createTripCard(trip) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'trip-card';
  card.dataset.tripId = trip.id;
  card.setAttribute('aria-label', `Open ${trip.title}, ${trip.city}, ${trip.country}, ${trip.dateLabel}`);
  if (state.activeTripId === trip.id) {
    card.classList.add('is-selected');
    card.setAttribute('aria-current', 'true');
  }

  const thumb = document.createElement('span');
  thumb.className = 'card-thumb';
  const image = document.createElement('img');
  image.src = trip.image;
  image.alt = trip.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  thumb.append(image);

  const body = document.createElement('span');
  body.className = 'card-body';

  const topLine = document.createElement('span');
  topLine.className = 'card-topline';
  const city = document.createElement('strong');
  city.className = 'card-city';
  city.textContent = trip.city;
  const country = document.createElement('span');
  country.className = 'card-country';
  country.textContent = trip.country;
  topLine.append(city, country);

  const meta = document.createElement('span');
  meta.className = 'card-meta';
  const date = document.createElement('span');
  date.textContent = trip.shortDate;
  const dot = document.createElement('span');
  dot.className = 'meta-dot';
  dot.setAttribute('aria-hidden', 'true');
  const continent = document.createElement('span');
  continent.textContent = trip.continent;
  meta.append(date, dot, continent);

  const note = document.createElement('span');
  note.className = 'card-note';
  note.textContent = trip.cardNote;

  body.append(topLine, meta, note);

  const index = document.createElement('span');
  index.className = 'card-index';
  index.textContent = trip.number;

  const year = document.createElement('span');
  year.className = 'card-year';
  year.textContent = trip.year;

  card.append(thumb, body, index, year);
  card.addEventListener('click', () => openTrip(trip.id));
  return card;
}

function renderList() {
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((trip) => fragment.append(createTripCard(trip)));
  refs.tripList.replaceChildren(fragment);
  refs.tripList.hidden = state.filtered.length === 0;
  refs.emptyState.hidden = state.filtered.length !== 0;
  refs.resultCount.textContent = String(state.filtered.length);
  refs.filterLabel.textContent = state.year === 'all' ? 'all years' : state.year;
  refs.clearSearch.hidden = !state.query;
  refs.tripList.classList.toggle('is-timeline', state.view === 'timeline');
}

function renderViewButtons() {
  refs.viewButtons.forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function applyFilters() {
  state.filtered = trips.filter(matchesFilters);
  if (state.activeTripId && !state.filtered.some((trip) => trip.id === state.activeTripId)) {
    closeTrip({ updateHistory: false, restoreFocus: false });
    if (window.location.hash) {
      history.replaceState({ trip: null }, '', `${window.location.pathname}${window.location.search}`);
    }
  }
  renderList();
  updateGlobeAvailability();
  syncMarkerSelection();
}

function updateGlobeAvailability() {
  const count = state.filtered.length;
  refs.globeEmptyNote.hidden = count !== 0;
  if (state.activeTripId) {
    const active = tripById.get(state.activeTripId);
    refs.globeStatus.textContent = active
      ? `focus · ${active.city}`
      : `${count} ${count === 1 ? 'pin' : 'pins'} · world view`;
  } else {
    refs.globeStatus.textContent = `${count} ${count === 1 ? 'pin' : 'pins'} · world view`;
  }
  state.filtered.forEach((trip) => {
    const marker = markerElements.get(trip.id);
    if (marker) marker.dataset.filtered = 'true';
  });
  trips.forEach((trip) => {
    const marker = markerElements.get(trip.id);
    if (marker && !state.filtered.some((item) => item.id === trip.id)) {
      marker.dataset.filtered = 'false';
    }
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  refs.toast.textContent = message;
  refs.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 2400);
}

function updateDetail(trip) {
  refs.detailNumber.textContent = `Trip ${trip.number} / 06`;
  refs.detailImage.src = trip.image;
  refs.detailImage.alt = trip.alt;
  refs.detailCaption.textContent = trip.caption;
  refs.detailYear.textContent = trip.year;
  refs.detailLocation.textContent = `${trip.city} · ${trip.country}`;
  refs.detailTitle.textContent = trip.title;
  refs.detailDate.textContent = trip.dateLabel;
  refs.detailEntry.textContent = trip.entry;
  refs.detailCoords.textContent = `${Math.abs(trip.lat).toFixed(3)}° ${trip.lat >= 0 ? 'N' : 'S'} · ${Math.abs(trip.lng).toFixed(3)}° ${trip.lng >= 0 ? 'E' : 'W'}`;
  refs.detailContinent.textContent = trip.continent;
}

function syncMarkerSelection() {
  markerElements.forEach((marker, id) => {
    marker.classList.toggle('is-selected', id === state.activeTripId);
  });
}

function openTrip(id, options = {}) {
  const trip = tripById.get(id);
  if (!trip) return;

  state.activeTripId = id;
  updateDetail(trip);
  refs.tripDetail.hidden = false;
  refs.workspace.classList.add('has-detail');
  refs.globeStatus.textContent = `focus · ${trip.city}`;
  syncMarkerSelection();
  closeClusterPopover();

  refs.tripList.querySelectorAll('.trip-card').forEach((card) => {
    const selected = card.dataset.tripId === id;
    card.classList.toggle('is-selected', selected);
    if (selected) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });

  if (options.updateHistory !== false) {
    const nextHash = `#trip=${encodeURIComponent(id)}`;
    if (window.location.hash !== nextHash) {
      history.pushState({ trip: id }, '', nextHash);
    }
  }

  if (tripGlobeReady) {
    setCameraGoal(trip.lng, trip.lat, 3.18);
  }

  if (options.focusDetail) {
    refs.detailTitle.tabIndex = -1;
    refs.detailTitle.focus({ preventScroll: true });
  } else if (options.restoreFocus !== false) {
    if (window.innerWidth <= 1180) {
      const scrollBehavior = reducedMotion ? 'auto' : 'smooth';
      window.setTimeout(() => refs.tripDetail.scrollIntoView({ block: 'start', behavior: scrollBehavior }), 40);
    } else {
      const card = refs.tripList.querySelector(`[data-trip-id="${id}"]`);
      if (card) card.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }
}

function closeTrip(options = {}) {
  if (!state.activeTripId && refs.tripDetail.hidden) return;
  const closedTripId = state.activeTripId;
  state.activeTripId = null;
  refs.tripDetail.hidden = true;
  refs.workspace.classList.remove('has-detail');
  syncMarkerSelection();
  updateGlobeAvailability();
  closeClusterPopover();

  refs.tripList.querySelectorAll('.trip-card').forEach((card) => {
    card.classList.remove('is-selected');
    card.removeAttribute('aria-current');
  });

  if (options.updateHistory !== false) {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    history.pushState({ trip: null }, '', cleanUrl);
  }

  if (tripGlobeReady) {
    setCameraGoal(INITIAL_LON, INITIAL_LAT, INITIAL_DISTANCE);
  }

  if (options.restoreFocus && closedTripId) {
    const card = refs.tripList.querySelector(`[data-trip-id="${closedTripId}"]`);
    if (card) card.focus({ preventScroll: true });
  }
}

function parseTripIdFromLocation() {
  const hash = window.location.hash.replace(/^#/, '');
  const parameters = new URLSearchParams(hash);
  return parameters.get('trip');
}

function syncFromLocation() {
  const id = parseTripIdFromLocation();
  if (id && tripById.has(id)) {
    openTrip(id, { updateHistory: false, restoreFocus: false });
  } else {
    closeTrip({ updateHistory: false, restoreFocus: false });
  }
}

function setupFilters() {
  refs.searchInput.addEventListener('input', () => {
    state.query = refs.searchInput.value.trim();
    applyFilters();
  });

  refs.clearSearch.addEventListener('click', () => {
    refs.searchInput.value = '';
    state.query = '';
    refs.searchInput.focus();
    applyFilters();
  });

  refs.yearFilter.addEventListener('change', () => {
    state.year = refs.yearFilter.value;
    applyFilters();
  });

  refs.clearFilters.addEventListener('click', () => {
    refs.searchInput.value = '';
    refs.yearFilter.value = 'all';
    state.query = '';
    state.year = 'all';
    applyFilters();
    refs.searchInput.focus();
  });

  refs.viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      renderViewButtons();
      refs.tripList.classList.toggle('is-timeline', state.view === 'timeline');
    });
  });

  refs.closeDetail.addEventListener('click', () => closeTrip({ restoreFocus: true }));
  refs.shareTrip.addEventListener('click', shareCurrentTrip);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Copy failed');
}

async function shareCurrentTrip() {
  if (!state.activeTripId) return;
  const url = new URL(window.location.href);
  url.hash = `trip=${encodeURIComponent(state.activeTripId)}`;
  try {
    await copyText(url.toString());
    showToast('Trip link copied');
  } catch {
    showToast('Copy the URL from your address bar');
  }
}

let scene;
let camera;
let renderer;
let globe;
let globeGroup;
let atmosphere;
let clusterElement;
let clusterGroupSignature = '';
let currentClusterTrips = [];
let tripGlobeReady = false;
let resizeObserver;
let pointerState = null;

const INITIAL_LON = 55;
const INITIAL_LAT = 17;
const INITIAL_DISTANCE = 3.42;
const cameraState = {
  lon: INITIAL_LON,
  lat: INITIAL_LAT,
  distance: INITIAL_DISTANCE,
  targetLon: INITIAL_LON,
  targetLat: INITIAL_LAT,
  targetDistance: INITIAL_DISTANCE
};

function degrees(value) {
  return value * Math.PI / 180;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function shortestAngle(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function latLngToVector(lat, lng, radius = 1.012) {
  const latitude = degrees(lat);
  const longitude = degrees(lng);
  return new THREE.Vector3(
    Math.cos(latitude) * Math.sin(longitude) * radius,
    Math.sin(latitude) * radius,
    Math.cos(latitude) * Math.cos(longitude) * radius
  );
}

function setCameraGoal(lon, lat, distance) {
  cameraState.targetLon = cameraState.lon + shortestAngle(cameraState.lon, lon);
  cameraState.targetLat = clamp(lat, -72, 72);
  cameraState.targetDistance = clamp(distance, 3.1, 6.1);
  if (reducedMotion) {
    cameraState.lon = cameraState.targetLon;
    cameraState.lat = cameraState.targetLat;
    cameraState.distance = cameraState.targetDistance;
  }
}

function createGlobeTexture(geojson) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  const ocean = context.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#0a1c26');
  ocean.addColorStop(0.48, '#081a23');
  ocean.addColorStop(1, '#06151e');
  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.52, height * 0.42, 20, width * 0.52, height * 0.42, width * 0.6);
  glow.addColorStop(0, 'rgba(38, 88, 83, 0.22)');
  glow.addColorStop(0.55, 'rgba(20, 55, 59, 0.08)');
  glow.addColorStop(1, 'rgba(4, 15, 22, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(143, 188, 171, 0.095)';
  context.lineWidth = 1;
  for (let longitude = -180; longitude <= 180; longitude += 30) {
    const x = ((longitude + 180) / 360) * width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = ((90 - latitude) / 180) * height;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = 'rgba(177, 211, 193, 0.17)';
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();

  const landGradient = context.createLinearGradient(0, 0, 0, height);
  landGradient.addColorStop(0, '#45655b');
  landGradient.addColorStop(0.35, '#385c51');
  landGradient.addColorStop(0.67, '#31544b');
  landGradient.addColorStop(1, '#294a43');

  function drawRing(ring, closePath) {
    ring.forEach((coordinate, index) => {
      const x = ((coordinate[0] + 180) / 360) * width;
      const y = ((90 - coordinate[1]) / 180) * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    if (closePath) context.closePath();
  }

  function drawGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === 'Polygon') {
      context.beginPath();
      geometry.coordinates.forEach((ring) => drawRing(ring, true));
      context.fill('evenodd');
      context.stroke();
    } else if (geometry.type === 'MultiPolygon') {
      context.beginPath();
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => drawRing(ring, true));
      });
      context.fill('evenodd');
      context.stroke();
    }
  }

  context.save();
  context.fillStyle = landGradient;
  context.strokeStyle = 'rgba(132, 171, 150, 0.7)';
  context.lineWidth = 1.15;
  context.lineJoin = 'round';
  context.shadowColor = 'rgba(91, 148, 124, 0.42)';
  context.shadowBlur = 8;
  geojson.features.forEach((feature) => drawGeometry(feature.geometry));
  context.restore();

  let seed = 2917;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  for (let index = 0; index < 2200; index += 1) {
    context.fillStyle = `rgba(164, 201, 185, ${0.015 + random() * 0.035})`;
    context.fillRect(random() * width, random() * height, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createStarField() {
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  let seed = 8751;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  for (let index = 0; index < 520; index += 1) {
    const radius = 6 + random() * 9;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xb7d3c5,
    size: 0.017,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  return new THREE.Points(starGeometry, starMaterial);
}

function createOrbitRing(radius, color, opacity, tiltX, tiltZ) {
  const points = [];
  for (let index = 0; index <= 180; index += 1) {
    const angle = (index / 180) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const ring = new THREE.LineLoop(geometry, material);
  ring.rotation.x = tiltX;
  ring.rotation.z = tiltZ;
  return ring;
}

function createMarkers() {
  trips.forEach((trip) => {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'globe-marker';
    marker.dataset.tripId = trip.id;
    marker.dataset.filtered = 'true';
    marker.tabIndex = -1;
    marker.setAttribute('aria-label', `Open ${trip.city}, ${trip.country} — ${trip.dateLabel}`);

    const dot = document.createElement('span');
    dot.className = 'marker-dot';
    dot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'marker-label';
    label.innerHTML = `<b>${trip.number}</b><span>${trip.city}</span>`;

    marker.append(dot, label);
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      openTrip(trip.id);
    });
    marker.addEventListener('pointerdown', (event) => event.stopPropagation());
    refs.markerLayer.append(marker);
    markerElements.set(trip.id, marker);
  });

  clusterElement = document.createElement('button');
  clusterElement.type = 'button';
  clusterElement.className = 'marker-cluster';
  clusterElement.tabIndex = -1;
  clusterElement.setAttribute('aria-label', 'Open nearby trip pins');
  clusterElement.setAttribute('aria-expanded', 'false');
  clusterElement.innerHTML = '<span class="cluster-core"></span><span class="cluster-label"></span>';
  clusterElement.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!currentClusterTrips.length) return;
    if (refs.clusterPopover.hidden) openClusterPopover();
    else closeClusterPopover();
  });
  clusterElement.addEventListener('pointerdown', (event) => event.stopPropagation());
  refs.markerLayer.append(clusterElement);
}

function openClusterPopover() {
  const markerX = Number(clusterElement.dataset.x || 0);
  const markerY = Number(clusterElement.dataset.y || 0);
  const width = refs.globeStage.clientWidth;
  const height = refs.globeStage.clientHeight;
  const popoverWidth = 220;
  const estimatedHeight = 56 + currentClusterTrips.length * 49;
  const left = clamp(markerX - popoverWidth / 2, 10, width - popoverWidth - 10);
  let top = markerY + 34;
  let side = 'below';
  if (top + estimatedHeight > height - 12) {
    top = Math.max(12, markerY - estimatedHeight - 32);
    side = 'above';
  }

  refs.clusterPopover.dataset.side = side;
  refs.clusterPopover.style.left = `${left}px`;
  refs.clusterPopover.style.top = `${top}px`;
  refs.clusterPopover.hidden = false;

  const fragment = document.createDocumentFragment();
  currentClusterTrips.forEach((trip) => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'cluster-choice';
    choice.innerHTML = `
      <img src="${trip.image}" alt="">
      <span>${trip.city}<small>${trip.country} · ${trip.shortDate}</small></span>
      <b>${trip.number}</b>
    `;
    choice.addEventListener('click', () => openTrip(trip.id, { focusDetail: true }));
    fragment.append(choice);
  });
  refs.clusterList.replaceChildren(fragment);
  clusterElement.setAttribute('aria-expanded', 'true');
  const firstChoice = refs.clusterList.querySelector('button');
  if (firstChoice) firstChoice.focus({ preventScroll: true });
}

function closeClusterPopover(restoreFocus = false) {
  if (refs.clusterPopover.hidden) return;
  refs.clusterPopover.hidden = true;
  if (clusterElement) {
    clusterElement.setAttribute('aria-expanded', 'false');
    if (restoreFocus) clusterElement.focus({ preventScroll: true });
  }
}

function updateMarkers() {
  if (!tripGlobeReady) return;
  const width = refs.globeStage.clientWidth;
  const height = refs.globeStage.clientHeight;
  const cameraDirection = camera.position.clone().normalize();
  const visible = [];
  const visibleIds = new Set(state.filtered.map((trip) => trip.id));

  markerElements.forEach((marker, id) => {
    const trip = tripById.get(id);
    const isFiltered = visibleIds.has(id);
    const worldPoint = latLngToVector(trip.lat, trip.lng, 1.014);
    const facing = worldPoint.clone().normalize().dot(cameraDirection);
    const projected = worldPoint.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    const isVisible = isFiltered && facing > 0.105 && x > -30 && x < width + 30 && y > -30 && y < height + 30;

    marker.classList.toggle('is-visible', isVisible);
    marker.classList.toggle('align-left', x > width * 0.66);
    marker.tabIndex = isVisible ? 0 : -1;
    marker.setAttribute('aria-hidden', String(!isVisible));
    marker.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

    if (isVisible) {
      visible.push({ trip, marker, x, y });
    }
  });

  const selected = visible.find((item) => item.trip.id === state.activeTripId);
  const clusterCandidates = visible.filter((item) => item.trip.id !== state.activeTripId);
  const groups = [];
  clusterCandidates.forEach((item) => {
    let group = groups.find((candidate) => {
      const reference = candidate[0];
      return Math.hypot(reference.x - item.x, reference.y - item.y) < 62;
    });
    if (!group) {
      group = [];
      groups.push(group);
    }
    group.push(item);
  });

  const clusteredIds = new Set();
  groups.filter((group) => group.length > 1).forEach((group) => {
    group.forEach((item) => clusteredIds.add(item.trip.id));
  });

  visible.forEach((item) => {
    const shouldHide = clusteredIds.has(item.trip.id);
    item.marker.classList.toggle('is-visible', !shouldHide);
    item.marker.tabIndex = shouldHide ? -1 : 0;
    item.marker.setAttribute('aria-hidden', String(shouldHide));
  });

  const clusters = groups.filter((group) => group.length > 1);
  if (clusters.length) {
    const lead = clusters[0];
    const averageX = lead.reduce((sum, item) => sum + item.x, 0) / lead.length;
    const averageY = lead.reduce((sum, item) => sum + item.y, 0) / lead.length;
    currentClusterTrips = lead.map((item) => item.trip);
    const signature = currentClusterTrips.map((trip) => trip.id).join('|');
    if (signature !== clusterGroupSignature) {
      clusterGroupSignature = signature;
      closeClusterPopover();
      clusterElement.querySelector('.cluster-core').textContent = String(currentClusterTrips.length);
      clusterElement.querySelector('.cluster-label').textContent = `${currentClusterTrips.length} pins`;
      clusterElement.setAttribute(
        'aria-label',
        `${currentClusterTrips.length} nearby trips: ${currentClusterTrips.map((trip) => trip.city).join(', ')}`
      );
    }
    clusterElement.dataset.x = String(averageX);
    clusterElement.dataset.y = String(averageY);
    clusterElement.style.transform = `translate(${averageX}px, ${averageY}px) translate(-50%, -50%)`;
    clusterElement.classList.add('is-visible');
    clusterElement.tabIndex = 0;
  } else {
    currentClusterTrips = [];
    clusterGroupSignature = '';
    clusterElement.classList.remove('is-visible');
    clusterElement.tabIndex = -1;
    closeClusterPopover();
  }

  if (selected) {
    selected.marker.classList.add('is-visible');
    selected.marker.tabIndex = 0;
    selected.marker.setAttribute('aria-hidden', 'false');
  }
}

function updateCamera() {
  const ease = reducedMotion ? 1 : 0.075;
  cameraState.lon += (cameraState.targetLon - cameraState.lon) * ease;
  cameraState.lat += (cameraState.targetLat - cameraState.lat) * ease;
  cameraState.distance += (cameraState.targetDistance - cameraState.distance) * ease;

  const longitude = degrees(cameraState.lon);
  const latitude = degrees(cameraState.lat);
  camera.position.set(
    cameraState.distance * Math.cos(latitude) * Math.sin(longitude),
    cameraState.distance * Math.sin(latitude),
    cameraState.distance * Math.cos(latitude) * Math.cos(longitude)
  );
  camera.lookAt(0, 0, 0);
}

function resizeGlobe() {
  if (!renderer || !camera) return;
  const width = refs.globeStage.clientWidth;
  const height = refs.globeStage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = width / height;
  const fitHeightFraction = Math.min(0.85, camera.aspect * 0.9);
  camera.fov = 2 * Math.atan(1 / (INITIAL_DISTANCE * fitHeightFraction)) * 180 / Math.PI;
  camera.updateProjectionMatrix();
}

function animate() {
  updateCamera();
  updateMarkers();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

async function initGlobe() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  refs.globeCanvas.append(renderer.domElement);

  globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const ambient = new THREE.AmbientLight(0xcfe3d6, 2.25);
  const keyLight = new THREE.DirectionalLight(0xfff4dc, 2.8);
  keyLight.position.set(-2.6, 2.1, 3.4);
  const rimLight = new THREE.DirectionalLight(0x3c8b84, 2.4);
  rimLight.position.set(2.8, -1.2, -2.4);
  scene.add(ambient, keyLight, rimLight);

  const sphereGeometry = new THREE.SphereGeometry(1, 96, 64);
  const globeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
    emissive: 0x071817,
    emissiveIntensity: 0.55
  });
  globe = new THREE.Mesh(sphereGeometry, globeMaterial);
  globe.rotation.y = -Math.PI / 2;
  globeGroup.add(globe);

  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - abs(dot(vNormal, viewDirection)), 3.3);
        gl_FragColor = vec4(0.36, 0.73, 0.66, rim * 0.42);
      }
    `
  });
  atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.085, 64, 48), atmosphereMaterial);
  globeGroup.add(atmosphere);
  globeGroup.add(createOrbitRing(1.34, 0x92b7a7, 0.22, Math.PI / 2, 0));
  globeGroup.add(createOrbitRing(1.46, 0xde7752, 0.16, Math.PI / 2.55, 0.52));
  scene.add(createStarField());

  createMarkers();
  resizeGlobe();
  tripGlobeReady = true;
  updateGlobeAvailability();
  syncMarkerSelection();
  if (state.activeTripId) {
    const activeTrip = tripById.get(state.activeTripId);
    if (activeTrip) {
      setCameraGoal(activeTrip.lng, activeTrip.lat, 3.18);
      cameraState.lon = cameraState.targetLon;
      cameraState.lat = cameraState.targetLat;
      cameraState.distance = cameraState.targetDistance;
    }
  }
  updateCamera();
  renderer.render(scene, camera);
  animate();

  resizeObserver = new ResizeObserver(resizeGlobe);
  resizeObserver.observe(refs.globeStage);

  try {
    const response = await fetch('./assets/world-countries.geojson');
    if (!response.ok) throw new Error('World data unavailable');
    const geojson = await response.json();
    globeMaterial.map = createGlobeTexture(geojson);
    globeMaterial.needsUpdate = true;
  } catch {
    const fallback = document.createElement('canvas');
    fallback.width = 512;
    fallback.height = 256;
    const context = fallback.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#183b3a');
    gradient.addColorStop(1, '#0b2028');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
    const texture = new THREE.CanvasTexture(fallback);
    texture.colorSpace = THREE.SRGBColorSpace;
    globeMaterial.map = texture;
    globeMaterial.needsUpdate = true;
  }
}

function setupGlobeInteraction() {
  const stage = refs.globeStage;

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    closeClusterPopover();
    refs.globeStage.classList.add('is-dragging');
    pointerState = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType
    };
    if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const deltaX = event.clientX - pointerState.x;
    const deltaY = event.clientY - pointerState.y;
    pointerState.x = event.clientX;
    pointerState.y = event.clientY;
    cameraState.lon -= deltaX * 0.13;
    if (pointerState.pointerType !== 'touch') {
      cameraState.lat = clamp(cameraState.lat + deltaY * 0.11, -72, 72);
    }
    cameraState.targetLon = cameraState.lon;
    cameraState.targetLat = cameraState.lat;
  });

  function endPointer(event) {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    pointerState = null;
    refs.globeStage.classList.remove('is-dragging');
    if (stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener('wheel', (event) => {
    if (window.innerWidth <= 980) return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    cameraState.targetDistance = clamp(cameraState.targetDistance + direction * 0.24, 3.1, 6.1);
    if (reducedMotion) cameraState.distance = cameraState.targetDistance;
  }, { passive: false });

  stage.addEventListener('dblclick', (event) => {
    if (event.target.closest('button')) return;
    cameraState.targetDistance = clamp(cameraState.targetDistance - 0.35, 3.1, 6.1);
    if (reducedMotion) cameraState.distance = cameraState.targetDistance;
  });

  refs.resetView.addEventListener('click', () => {
    setCameraGoal(INITIAL_LON, INITIAL_LAT, INITIAL_DISTANCE);
    closeClusterPopover();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeClusterPopover(true);
    if (event.target.matches('input, select, textarea')) return;
    if (event.key === '+' || event.key === '=') {
      cameraState.targetDistance = clamp(cameraState.targetDistance - 0.25, 3.1, 6.1);
    } else if (event.key === '-' || event.key === '_') {
      cameraState.targetDistance = clamp(cameraState.targetDistance + 0.25, 3.1, 6.1);
    } else if (event.key.toLowerCase() === 'r') {
      setCameraGoal(INITIAL_LON, INITIAL_LAT, INITIAL_DISTANCE);
    }
  });

  reducedMotionQuery.addEventListener('change', (event) => {
    reducedMotion = event.matches;
  });
}

setupFilters();
renderViewButtons();
renderList();
setupGlobeInteraction();
syncFromLocation();
initGlobe();
window.addEventListener('popstate', syncFromLocation);
window.addEventListener('hashchange', syncFromLocation);
