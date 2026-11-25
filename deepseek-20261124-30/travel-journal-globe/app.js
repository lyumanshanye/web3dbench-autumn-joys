import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const trips = [
  {
    id: 'kyoto',
    title: 'Paper lanterns, soft rain',
    location: 'Kyoto, Japan',
    city: 'Kyoto',
    country: 'Japan',
    region: 'Asia',
    start: '2019-04-04',
    end: '2019-04-11',
    lat: 35.0116,
    lon: 135.7681,
    accent: '#e6815d',
    photo: 'assets/kyoto.jpg',
    photoAlt:
      'Spring light falling across the historic wooden lanes and temple rooftops of Kyoto, Japan.',
    excerpt:
      'Philosopher’s Path after rain, a tiny kissaten, and the hush of a temple garden.',
    diary:
      'We woke before the city and followed the Philosopher’s Path while the rain was still soft. A tiny kissaten near Nanzen-ji served the best coffee of the year, and we stayed until the temple garden was empty.',
    tags: 'spring temples walking rain coffee blossom'
  },
  {
    id: 'reykjavik',
    title: 'Wind, wool, and wide silence',
    location: 'Reykjavík, Iceland',
    city: 'Reykjavík',
    country: 'Iceland',
    region: 'Europe',
    start: '2019-09-14',
    end: '2019-09-20',
    lat: 64.1466,
    lon: -21.9426,
    accent: '#84b7b2',
    photo: 'assets/reykjavik.jpg',
    photoAlt:
      'Cool North Atlantic light over the low rooftops and harbour of Reykjavík, Iceland.',
    excerpt:
      'A red rental car, roadside sheep, and weather that changed its mind every ten minutes.',
    diary:
      'We left the city with a red rental car and no real plan beyond the next hot spring. Roadside sheep watched us pass, the weather changed every ten minutes, and the silence out west felt bigger than the sky.',
    tags: 'autumn road trip hot springs coast northern lights'
  },
  {
    id: 'new-york',
    title: 'A city that hums in layers',
    location: 'New York City, USA',
    city: 'New York',
    country: 'United States',
    region: 'North America',
    start: '2021-10-08',
    end: '2021-10-13',
    lat: 40.7128,
    lon: -74.006,
    accent: '#e1a95b',
    photo: 'assets/newyork.jpg',
    photoAlt:
      'The New York City skyline rising above the street grid at dusk, with warm window lights.',
    excerpt:
      'Bagels before dawn, gallery afternoons, and a jazz basement that refused to close.',
    diary:
      'Bagels before dawn, a gallery afternoon in Chelsea, then a jazz basement in the Village that refused to close. The city never arrived all at once; it came in layers — traffic, laughter, and warm light between the buildings.',
    tags: 'autumn city walk jazz galleries bagels'
  },
  {
    id: 'marrakech',
    title: 'Mint tea behind the medina walls',
    location: 'Marrakech, Morocco',
    city: 'Marrakech',
    country: 'Morocco',
    region: 'Africa',
    start: '2022-03-17',
    end: '2022-03-23',
    lat: 31.6295,
    lon: -7.9811,
    accent: '#d9784f',
    photo: 'assets/marrakech.jpg',
    photoAlt:
      'Warm afternoon light on the ochre walls and market lanes of Marrakech, Morocco.',
    excerpt:
      'Saffron, cedar smoke, and getting pleasantly lost in the souks before sunset.',
    diary:
      'The souks were a puzzle of saffron, cedar smoke, and blue doors. We got pleasantly lost, followed a stranger to a rooftop, and drank mint tea while the call to prayer moved across the medina below.',
    tags: 'spring souks tea markets rooftop medina'
  },
  {
    id: 'tokyo',
    title: 'Neon after the last train',
    location: 'Tokyo, Japan',
    city: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    start: '2023-05-12',
    end: '2023-05-18',
    lat: 35.6762,
    lon: 139.6503,
    accent: '#e3828d',
    photo: 'assets/tokyo.jpg',
    photoAlt:
      'Tokyo’s neon-lit streets and dense skyline glowing after dark beneath a deep blue sky.',
    excerpt:
      'Convenience-store dinners, quiet shrines at dawn, and a last train we almost missed.',
    diary:
      'We ate convenience-store dinners on a hotel windowsill and watched the trains slide between towers. By morning, the same streets were quiet enough for a shrine visit. Tokyo felt like two cities sharing one postcode.',
    tags: 'spring neon night trains food shrines city'
  },
  {
    id: 'patagonia',
    title: 'At the edge of the weather',
    location: 'Torres del Paine, Chile',
    city: 'Patagonia',
    country: 'Chile',
    region: 'South America',
    start: '2024-11-02',
    end: '2024-11-12',
    lat: -50.9423,
    lon: -73.4068,
    accent: '#a9b88c',
    photo: 'assets/patagonia.jpg',
    photoAlt:
      'Granite peaks and wind-shaped clouds above the glacial valleys of Torres del Paine, Patagonia.',
    excerpt:
      'Four seasons in one pass, a tent full of wind, and the blue hour on the towers.',
    diary:
      'The trail gave us four seasons in one pass: hail, hard sun, then a wind that rearranged the tent. We reached the lookout at blue hour and stayed long enough for the granite towers to turn pink, then grey, then disappear.',
    tags: 'autumn hiking mountains wind pumas glacier patagonia'
  }
].sort((a, b) => a.start.localeCompare(b.start));

const elements = {
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  yearFilter: document.getElementById('yearFilter'),
  resultCount: document.getElementById('resultCount'),
  filterSummary: document.getElementById('filterSummary'),
  tripList: document.getElementById('tripList'),
  emptyState: document.getElementById('emptyState'),
  clearFilters: document.getElementById('clearFilters'),
  markerLayer: document.getElementById('markerLayer'),
  stage: document.getElementById('globeStage'),
  canvasWrap: document.getElementById('globeCanvasWrap'),
  tripDetail: document.getElementById('tripDetail'),
  globeLoading: document.getElementById('globeLoading'),
  resetView: document.getElementById('resetView'),
  zoomIn: document.getElementById('zoomIn'),
  zoomOut: document.getElementById('zoomOut'),
  mobileGestureToggle: document.getElementById('mobileGestureToggle'),
  gestureHint: document.getElementById('gestureHint'),
  toast: document.getElementById('toast')
};

const state = {
  query: '',
  year: 'all',
  activeId: null,
  filteredIds: new Set(),
  lastTrigger: null,
  lastRoute: '',
  openClusterKey: null
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const compactQuery = window.matchMedia('(max-width: 820px)');
const prefersReducedMotion = () => reducedMotionQuery.matches;

const markerButtons = new Map();
const clusterElements = new Map();
const clusterGroups = new Map();

let toastTimer = 0;
let selectionReference = null;
let globeController = null;

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
const monthShortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseIsoDate(iso) {
  return new Date(`${iso}T12:00:00Z`);
}

function getYear(trip) {
  return Number(trip.start.slice(0, 4));
}

function getMonth(trip) {
  return monthFormatter.format(parseIsoDate(trip.start)).toUpperCase();
}

function getIsoDuration(trip) {
  const start = parseIsoDate(trip.start);
  const end = parseIsoDate(trip.end);
  return Math.round((end - start) / 86400000) + 1;
}

function getDateRange(trip) {
  const start = parseIsoDate(trip.start);
  const end = parseIsoDate(trip.end);
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = monthShortFormatter.format(start);
  const endMonth = monthShortFormatter.format(end);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} — ${endDay} ${endMonth} ${endYear}`;
  }
  if (startMonth === endMonth) {
    return `${startDay}—${endDay} ${startMonth} ${startYear}`;
  }
  return `${startDay} ${startMonth} — ${endDay} ${endMonth} ${startYear}`;
}

function getShortDateRange(trip) {
  const start = parseIsoDate(trip.start);
  const end = parseIsoDate(trip.end);
  const startMonth = monthShortFormatter.format(start);
  const endMonth = monthShortFormatter.format(end);
  if (startMonth === endMonth) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${startMonth} ${start.getUTCFullYear()}`;
  }
  return `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth} ${end.getUTCFullYear()}`;
}

function getCoordinateLabel(trip) {
  const latitude = `${Math.abs(trip.lat).toFixed(4)}° ${trip.lat >= 0 ? 'N' : 'S'}`;
  const longitude = `${Math.abs(trip.lon).toFixed(4)}° ${trip.lon >= 0 ? 'E' : 'W'}`;
  return `${latitude} · ${longitude}`;
}

function getFilteredTrips() {
  const terms = normalize(state.query).trim().split(/\s+/).filter(Boolean);

  return trips.filter((trip) => {
    if (state.year !== 'all' && String(getYear(trip)) !== state.year) {
      return false;
    }
    if (!terms.length) {
      return true;
    }

    const haystack = normalize(
      [
        trip.title,
        trip.location,
        trip.city,
        trip.country,
        trip.region,
        trip.start,
        trip.end,
        getYear(trip),
        trip.excerpt,
        trip.diary,
        trip.tags
      ].join(' ')
    );

    return terms.every((term) => haystack.includes(term));
  });
}

function getSearchableSummary() {
  const counts = new Map();
  for (const trip of trips) {
    const year = String(getYear(trip));
    counts.set(year, (counts.get(year) || 0) + 1);
  }
  return counts;
}

function setupYearFilter() {
  const years = [...new Set(trips.map((trip) => String(getYear(trip))))].sort();
  const fragment = document.createDocumentFragment();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All years';
  fragment.append(allOption);

  for (const year of years) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    fragment.append(option);
  }

  elements.yearFilter.replaceChildren(fragment);
}

function renderTripList(filteredTrips) {
  const fragment = document.createDocumentFragment();

  for (const trip of filteredTrips) {
    const listItem = document.createElement('li');
    listItem.className = 'trip-item';
    listItem.setAttribute('role', 'listitem');

    const link = document.createElement('a');
    link.className = 'trip-card';
    link.href = `#/trip/${trip.id}`;
    link.dataset.tripId = trip.id;
    link.setAttribute('aria-label', `${trip.title}, ${trip.location}. ${getDateRange(trip)}. Open journal entry.`);
    link.innerHTML = `
      <span class="trip-date" aria-hidden="true">
        <time datetime="${trip.start}">
          <span class="date-month">${escapeHtml(getMonth(trip))}</span>
          <span class="date-year">${getYear(trip)}</span>
        </time>
        <span class="timeline-dot"></span>
      </span>
      <span class="trip-body">
        <span class="trip-kicker"><span class="continent-dot"></span>${escapeHtml(trip.region)} · ${escapeHtml(trip.country)}</span>
        <strong class="trip-title">${escapeHtml(trip.title)}</strong>
        <span class="trip-excerpt">${escapeHtml(trip.excerpt)}</span>
      </span>
      <span class="trip-thumb">
        <img src="${escapeHtml(trip.photo)}" alt="${escapeHtml(trip.photoAlt)}" loading="lazy" decoding="async" />
      </span>
      <span class="trip-arrow" aria-hidden="true">
        <svg viewBox="0 0 12 12"><path d="M2 6h7M6.5 2.5 10 6l-3.5 3.5"></path></svg>
      </span>
    `;

    listItem.append(link);
    fragment.append(listItem);
  }

  elements.tripList.replaceChildren(fragment);
  elements.tripList.hidden = filteredTrips.length === 0;
  elements.emptyState.hidden = filteredTrips.length !== 0;

  updateActiveStyles();
  updateFilterCopy(filteredTrips);
}

function updateActiveStyles() {
  for (const card of elements.tripList.querySelectorAll('.trip-card')) {
    const isActive = card.dataset.tripId === state.activeId;
    card.classList.toggle('is-active', isActive);
    if (isActive) {
      card.setAttribute('aria-current', 'true');
    } else {
      card.removeAttribute('aria-current');
    }
  }

  for (const [tripId, button] of markerButtons) {
    button.classList.toggle('is-active', tripId === state.activeId);
  }
}

function updateFilterCopy(filteredTrips) {
  const count = filteredTrips.length;
  const journeyWord = count === 1 ? 'journey' : 'journeys';
  elements.resultCount.textContent = `${count} ${journeyWord}`;

  const years = [...new Set(filteredTrips.map((trip) => getYear(trip)))];
  let summary = 'All years';
  if (state.year !== 'all') {
    summary = `${state.year} · ${count} ${count === 1 ? 'note' : 'notes'}`;
  } else if (state.query.trim()) {
    summary = years.length === 1 ? `${years[0]} · ${count} found` : `${count} found`;
  } else {
    summary = `2019—2024 · ${count} notes`;
  }
  elements.filterSummary.textContent = summary;
  elements.clearSearch.hidden = state.query.length === 0;

  const continentCount = new Set(filteredTrips.map((trip) => trip.region)).size;
  const legend = document.querySelector('.map-legend');
  if (legend) {
    legend.innerHTML = `<span aria-hidden="true"></span>${count} ${count === 1 ? 'pin' : 'pins'} · ${continentCount} ${continentCount === 1 ? 'continent' : 'continents'}`;
  }
}

function markFilteredTrips(filteredTrips) {
  state.filteredIds = new Set(filteredTrips.map((trip) => trip.id));
}

function applyFilters({ urlMode = 'replace' } = {}) {
  const filteredTrips = getFilteredTrips();
  markFilteredTrips(filteredTrips);

  if (state.activeId && !state.filteredIds.has(state.activeId)) {
    clearActiveTrip({ restoreFocus: false });
  }

  renderTripList(filteredTrips);

  if (urlMode) {
    writeUrl(urlMode);
  }

  const count = filteredTrips.length;
  elements.resultCount.textContent = `${count} ${count === 1 ? 'journey' : 'journeys'}`;
}

function clearActiveTrip({ restoreFocus = false } = {}) {
  const trigger = state.lastTrigger;
  state.activeId = null;
  state.lastTrigger = null;
  elements.tripDetail.hidden = true;
  elements.tripDetail.replaceChildren();
  elements.stage.classList.remove('has-detail');
  updateActiveStyles();
  if (selectionReference) {
    selectionReference.visible = false;
  }
  if (restoreFocus && trigger && document.contains(trigger)) {
    trigger.focus({ preventScroll: true });
  }
}

function renderTripDetail(trip) {
  const index = String(trips.findIndex((item) => item.id === trip.id) + 1).padStart(2, '0');
  const duration = getIsoDuration(trip);

  elements.tripDetail.innerHTML = `
    <div class="detail-photo">
      <img src="${escapeHtml(trip.photo)}" alt="${escapeHtml(trip.photoAlt)}" decoding="async" />
      <span class="detail-photo-tag">${escapeHtml(getCoordinateLabel(trip))}</span>
    </div>
    <div class="detail-copy">
      <p class="detail-kicker">Note ${index} · ${escapeHtml(trip.region)} · ${escapeHtml(getDateRange(trip))}</p>
      <h3>${escapeHtml(trip.title)}</h3>
      <p class="detail-place">${escapeHtml(trip.location)}<span aria-hidden="true"></span>${duration} days</p>
      <p class="detail-note">${escapeHtml(trip.diary)}</p>
      <div class="detail-actions">
        <button class="share-trip" type="button">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.5 7.2 10.5 4.4M5.5 8.8l5 2.8"></path>
            <circle cx="3.3" cy="8" r="1.7"></circle>
            <circle cx="12.3" cy="3.4" r="1.7"></circle>
            <circle cx="12.3" cy="12.6" r="1.7"></circle>
          </svg>
          Share trip
        </button>
        <span class="detail-coords">${getCoordinateLabel(trip)}</span>
      </div>
    </div>
    <button class="detail-close" type="button" aria-label="Close journal entry">
      <svg viewBox="0 0 14 14" aria-hidden="true"><path d="m3 3 8 8M11 3l-8 8"></path></svg>
    </button>
  `;

  elements.tripDetail.hidden = false;
  elements.stage.classList.add('has-detail');
  elements.tripDetail.querySelector('.share-trip').addEventListener('click', shareActiveTrip);
  elements.tripDetail.querySelector('.detail-close').addEventListener('click', () => {
    clearActiveTrip({ restoreFocus: true });
    writeUrl('push');
    announce('Journal entry closed.');
  });
}

function openTrip(tripId, { push = true, trigger = null, animate = true } = {}) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return false;
  }
  if (!state.filteredIds.has(trip.id)) {
    return false;
  }

  closeClusterPanel();
  state.activeId = trip.id;
  state.lastTrigger = trigger;
  renderTripDetail(trip);
  updateActiveStyles();

  if (push) {
    writeUrl('push');
  }

  focusGlobeOnTrip(trip, animate);

  if (compactQuery.matches && trigger && elements.tripList.contains(trigger)) {
    scrollStageIntoView();
  } else {
    scrollActiveCardIntoView(trip.id);
  }

  announce(`Opened ${trip.title}, ${trip.location}.`);
  return true;
}

function scrollStageIntoView() {
  const stageTop = elements.stage.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: Math.max(0, stageTop - 8),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
  });
}

function scrollActiveCardIntoView(tripId) {
  const card = elements.tripList.querySelector(`[data-trip-id="${tripId}"]`);
  if (card && elements.tripList.scrollHeight > elements.tripList.clientHeight) {
    card.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }
}

function shareActiveTrip() {
  const trip = trips.find((item) => item.id === state.activeId);
  if (!trip) {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = `/trip/${trip.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url.href);
      showToast('Trip link copied to the clipboard');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url.href;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      showToast(copied ? 'Trip link copied to the clipboard' : url.href);
    }
  };

  if (navigator.share && compactQuery.matches) {
    navigator
      .share({
        title: `${trip.title} — Meridian`,
        text: `A field note from ${trip.location}.`,
        url: url.href
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          copyLink();
        }
      });
  } else {
    copyLink();
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2600);
}

function announce(message) {
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.textContent = message;
  document.body.append(status);
  window.setTimeout(() => status.remove(), 1200);
}

function formatRoute() {
  const path = state.activeId ? `/trip/${state.activeId}` : '/';
  const params = new URLSearchParams();
  if (state.year !== 'all') {
    params.set('year', state.year);
  }
  if (state.query.trim()) {
    params.set('q', state.query.trim());
  }
  const query = params.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

function writeUrl(mode = 'replace') {
  const hash = formatRoute();
  if (window.location.hash === hash) {
    state.lastRoute = hash;
    return;
  }

  const method = mode === 'push' ? 'pushState' : 'replaceState';
  window.history[method]({ route: hash }, '', hash);
  state.lastRoute = hash;
}

function parseRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  if (raw !== '/' && !raw.startsWith('/')) {
    return null;
  }

  const [path, queryString = ''] = raw.split('?');
  const params = new URLSearchParams(queryString);
  const match = path.match(/^\/trip\/([\w-]+)$/);
  const yearParam = params.get('year');
  const validYear = [...new Set(trips.map((trip) => String(getYear(trip))))].includes(yearParam);

  return {
    tripId: match ? match[1] : null,
    year: validYear ? yearParam : 'all',
    query: params.get('q') || ''
  };
}

function syncInterfaceFromState() {
  elements.searchInput.value = state.query;
  elements.yearFilter.value = state.year;
}

function handleRouteChange({ initial = false } = {}) {
  if (window.location.hash && !window.location.hash.startsWith('#/')) {
    return;
  }

  const currentHash = window.location.hash || '#/';
  if (!initial && currentHash === state.lastRoute) {
    return;
  }

  const route = parseRoute();
  if (!route) {
    return;
  }

  state.year = route.year;
  state.query = route.query;
  syncInterfaceFromState();

  const filteredTrips = getFilteredTrips();
  markFilteredTrips(filteredTrips);

  const routeTrip = route.tripId ? trips.find((trip) => trip.id === route.tripId) : null;
  const routeTripVisible = Boolean(routeTrip && state.filteredIds.has(routeTrip.id));

  if (routeTripVisible) {
    state.activeId = routeTrip.id;
    state.lastTrigger = null;
    renderTripDetail(routeTrip);
    focusGlobeOnTrip(routeTrip, !initial);
  } else {
    clearActiveTrip({ restoreFocus: false });
    if (!initial) {
      focusGlobeOnTrip(null, true);
    }
  }

  renderTripList(filteredTrips);
  updateActiveStyles();
  state.lastRoute = currentHash;

  if (routeTripVisible) {
    scrollActiveCardIntoView(routeTrip.id);
  }

  if (route.tripId && !routeTripVisible) {
    writeUrl('replace');
  }
}

function setupFilters() {
  elements.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    applyFilters({ urlMode: 'replace' });
  });

  elements.yearFilter.addEventListener('change', (event) => {
    state.year = event.target.value;
    applyFilters({ urlMode: 'replace' });
  });

  elements.clearSearch.addEventListener('click', () => {
    state.query = '';
    elements.searchInput.value = '';
    applyFilters({ urlMode: 'replace' });
    elements.searchInput.focus();
  });

  elements.clearFilters.addEventListener('click', () => {
    state.query = '';
    state.year = 'all';
    syncInterfaceFromState();
    applyFilters({ urlMode: 'replace' });
    elements.searchInput.focus();
  });
}

function setupListEvents() {
  elements.tripList.addEventListener('click', (event) => {
    const card = event.target.closest('.trip-card');
    if (!card) {
      return;
    }
    event.preventDefault();
    openTrip(card.dataset.tripId, { push: true, trigger: card, animate: true });
  });
}

function latLonToVector3(lat, lon, radius = 1) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude),
    -radius * Math.cos(latitude) * Math.sin(longitude)
  );
}

function cameraPositionFor(lat, lon, distance) {
  return latLonToVector3(lat, lon, distance);
}

function initGlobe() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (error) {
    elements.globeLoading.innerHTML = '<span>Map unavailable — browse the journal notes instead.</span>';
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  elements.canvasWrap.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 80);
  const initialPosition = cameraPositionFor(18, 58, 3.55);
  camera.position.copy(initialPosition);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.52;
  controls.zoomSpeed = 0.65;
  controls.minDistance = 1.36;
  controls.maxDistance = 5.2;
  controls.update();

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const globeMaterial = new THREE.MeshPhongMaterial({
    color: 0x6d908d,
    specular: 0x8eb8bd,
    shininess: 11,
    bumpScale: 0.008
  });

  const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), globeMaterial);
  globeMesh.renderOrder = 1;
  globeGroup.add(globeMesh);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    'assets/earth-blue-marble.jpg',
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      globeMaterial.map = texture;
      globeMaterial.color.set(0xc9d8d2);
      globeMaterial.needsUpdate = true;
    },
    undefined,
    () => {
      globeMaterial.color.set(0x355b5b);
    }
  );

  textureLoader.load(
    'assets/earth-topology.png',
    (texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      globeMaterial.bumpMap = texture;
      globeMaterial.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.085, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x65c9ca) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(glowColor, 1.0) * clamp(intensity, 0.0, 1.0) * 0.8;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  atmosphere.renderOrder = 0;
  globeGroup.add(atmosphere);

  addGraticule(globeGroup);
  addStarField(scene);

  const hemiLight = new THREE.HemisphereLight(0xa7d6d2, 0x07191b, 1.25);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.15);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x5ba7ad, 0.55);
  scene.add(fillLight);

  selectionReference = createSelectionReference(scene);

  const clock = new THREE.Clock();
  const markerState = new Map();
  let cameraAnimation = null;
  let width = 1;
  let height = 1;
  let gestureEnabled = false;

  function resize() {
    width = Math.max(1, elements.canvasWrap.clientWidth);
    height = Math.max(1, elements.canvasWrap.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updatePointerMode() {
    if (compactQuery.matches) {
      controls.enabled = gestureEnabled;
      renderer.domElement.style.touchAction = gestureEnabled ? 'none' : 'pan-y';
      elements.mobileGestureToggle.setAttribute('aria-pressed', gestureEnabled ? 'true' : 'false');
      elements.mobileGestureToggle.querySelector('span').textContent = gestureEnabled
        ? 'Scroll page'
        : 'Touch to explore';
      elements.gestureHint.innerHTML = gestureEnabled
        ? '<span class="drag-glyph" aria-hidden="true">↔</span> Drag to turn <span aria-hidden="true">·</span> pinch to zoom'
        : '<span class="drag-glyph" aria-hidden="true">↕</span> Scroll to continue reading';
    } else {
      controls.enabled = true;
      renderer.domElement.style.touchAction = 'none';
      elements.gestureHint.innerHTML =
        '<span class="drag-glyph" aria-hidden="true">↔</span> Drag to turn <span aria-hidden="true">·</span> scroll to zoom';
    }
  }

  function animateCameraTo(targetPosition, duration = 920) {
    if (prefersReducedMotion() || duration === 0) {
      camera.position.copy(targetPosition);
      camera.lookAt(0, 0, 0);
      cameraAnimation = null;
      controls.update();
      return;
    }

    cameraAnimation = {
      from: camera.position.clone(),
      to: targetPosition.clone(),
      start: performance.now(),
      duration
    };
  }

  function focusOnTrip(trip, animate = true) {
    closeClusterPanel();
    const target = latLonToVector3(trip.lat, trip.lon, 1).normalize().multiplyScalar(2.02);
    animateCameraTo(target, animate ? 980 : 0);
  }

  function resetCamera(animate = true) {
    closeClusterPanel();
    animateCameraTo(initialPosition, animate ? 820 : 0);
  }

  function zoomBy(multiplier) {
    const currentDistance = camera.position.length();
    const targetDistance = THREE.MathUtils.clamp(currentDistance * multiplier, controls.minDistance, controls.maxDistance);
    const target = camera.position.clone().normalize().multiplyScalar(targetDistance);
    closeClusterPanel();
    animateCameraTo(target, 460);
  }

  function updateCameraAnimation(now) {
    if (!cameraAnimation) {
      return;
    }

    const elapsed = now - cameraAnimation.start;
    const t = Math.min(1, elapsed / cameraAnimation.duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(cameraAnimation.from, cameraAnimation.to, eased);
    camera.lookAt(0, 0, 0);

    if (t >= 1) {
      cameraAnimation = null;
    }
  }

  function updateSelectionReference(now) {
    if (!selectionReference || !state.activeId) {
      if (selectionReference) {
        selectionReference.visible = false;
      }
      return;
    }

    const trip = trips.find((item) => item.id === state.activeId);
    if (!trip || !state.filteredIds.has(trip.id)) {
      selectionReference.visible = false;
      return;
    }

    const normal = latLonToVector3(trip.lat, trip.lon, 1).normalize();
    const camDirection = camera.position.clone().normalize();
    const onNearSide = normal.dot(camDirection) > 1 / camera.position.length() + 0.01;

    selectionReference.visible = onNearSide;
    if (!onNearSide) {
      return;
    }

    const point = normal.clone().multiplyScalar(1.012);
    selectionReference.position.copy(point);
    selectionReference.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const pulse = prefersReducedMotion() ? 1 : 1 + Math.sin(now * 0.0042) * 0.09;
    selectionReference.userData.ring.scale.setScalar(pulse);
    selectionReference.userData.glow.scale.setScalar(0.17 * pulse);
  }

  function updateMarkers(now) {
    const cameraDirection = camera.position.clone().normalize();
    const horizon = 1 / camera.position.length() + 0.009;
    const entries = [];

    for (const trip of trips) {
      const button = markerButtons.get(trip.id);
      if (!button) {
        continue;
      }

      if (!state.filteredIds.has(trip.id)) {
        button.hidden = true;
        button.classList.remove('is-visible');
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
        continue;
      }

      button.hidden = false;
      const normal = latLonToVector3(trip.lat, trip.lon, 1).normalize();
      const isNear = normal.dot(cameraDirection) > horizon;

      if (!isNear) {
        button.classList.remove('is-visible');
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
        entries.push({ trip, button, isNear: false });
        continue;
      }

      const worldPoint = normal.clone().multiplyScalar(1.012);
      const projected = worldPoint.clone().project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      entries.push({ trip, button, isNear: true, x, y });

      if (y < -30 || y > height + 30 || x < -80 || x > width + 80) {
        button.classList.remove('is-visible');
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
        continue;
      }

      button.style.setProperty('--marker-x', `${x.toFixed(1)}px`);
      button.style.setProperty('--marker-y', `${y.toFixed(1)}px`);
      button.classList.add('is-visible');
      button.tabIndex = 0;
      button.removeAttribute('aria-hidden');
    }

    layoutMarkerClusters(entries, now);
    updateSelectionReference(now);
  }

  function layoutMarkerClusters(entries, now) {
    const visible = entries.filter((entry) => entry.isNear && !entry.button.hidden);
    const distance = camera.position.length();
    const threshold = 27 + Math.max(0, distance - 2.35) * 11.5;

    const parent = visible.map((_, index) => index);
    const find = (index) => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) {
        parent[rootB] = rootA;
      }
    };

    for (let a = 0; a < visible.length; a += 1) {
      for (let b = a + 1; b < visible.length; b += 1) {
        const dx = visible[a].x - visible[b].x;
        const dy = visible[a].y - visible[b].y;
        if (Math.hypot(dx, dy) < threshold) {
          union(a, b);
        }
      }
    }

    const groupsByRoot = new Map();
    for (let index = 0; index < visible.length; index += 1) {
      const root = find(index);
      if (!groupsByRoot.has(root)) {
        groupsByRoot.set(root, []);
      }
      groupsByRoot.get(root).push(visible[index]);
    }

    const groupedTripIds = new Set();
    const groups = [...groupsByRoot.values()].filter((group) => group.length > 1);
    const neededKeys = new Set();

    for (const group of groups) {
      const key = group.map((entry) => entry.trip.id).sort().join('|');
      neededKeys.add(key);
      const groupTrips = group.map((entry) => entry.trip);
      for (const entry of group) {
        groupedTripIds.add(entry.trip.id);
      }

      const centerX = group.reduce((sum, entry) => sum + entry.x, 0) / group.length;
      const centerY = group.reduce((sum, entry) => sum + entry.y, 0) / group.length;
      const keyParts = [...new Set(groupTrips.map((trip) => trip.country))];
      const regionParts = [...new Set(groupTrips.map((trip) => trip.region))];
      const placeLabel = keyParts.length === 1 ? keyParts[0] : regionParts.join(' / ');

      let cluster = clusterElements.get(key);
      if (!cluster) {
        cluster = createClusterElement(key);
        clusterElements.set(key, cluster);
        elements.markerLayer.append(cluster);
      }

      clusterGroups.set(key, groupTrips);
      cluster.style.setProperty('--cluster-x', `${centerX.toFixed(1)}px`);
      cluster.style.setProperty('--cluster-y', `${centerY.toFixed(1)}px`);
      cluster.hidden = false;
      cluster.classList.add('is-visible');
      cluster.tabIndex = 0;
      cluster.removeAttribute('aria-hidden');
      cluster.setAttribute(
        'aria-label',
        `${groupTrips.length} nearby trips in ${placeLabel}. Show each place.`
      );
      cluster.querySelector('.cluster-count').textContent = String(groupTrips.length);
      cluster.querySelector('.cluster-label').textContent = placeLabel;

      if (state.activeId && groupTrips.some((trip) => trip.id === state.activeId)) {
        cluster.classList.add('has-active');
      } else {
        cluster.classList.remove('has-active');
      }

      if (state.openClusterKey === key) {
        positionClusterPanel(centerX, centerY);
      }
    }

    for (const [key, cluster] of clusterElements) {
      if (!neededKeys.has(key)) {
        cluster.hidden = true;
        cluster.classList.remove('is-visible');
        cluster.tabIndex = -1;
        cluster.setAttribute('aria-hidden', 'true');
        if (state.openClusterKey === key) {
          closeClusterPanel();
        }
      }
    }

    for (const entry of entries) {
      if (!entry.isNear) {
        continue;
      }
      if (groupedTripIds.has(entry.trip.id)) {
        entry.button.classList.remove('is-visible');
        entry.button.tabIndex = -1;
        entry.button.setAttribute('aria-hidden', 'true');
      }
    }

    if (state.openClusterKey && !neededKeys.has(state.openClusterKey)) {
      closeClusterPanel();
    }
  }

  function animate(now) {
    updateCameraAnimation(now);
    controls.update();

    sunLight.position.copy(camera.position).add(new THREE.Vector3(0.4, 0.7, 0.2));
    fillLight.position.copy(camera.position).add(new THREE.Vector3(-1.8, -0.4, -1.2));

    updateMarkers(now);
    selectionReference.userData.ring.rotation.z = now * 0.00028;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function resetViewFromControl() {
    resetCamera(true);
    showToast('Returned to the full globe');
  }

  elements.zoomIn.addEventListener('click', () => zoomBy(0.78));
  elements.zoomOut.addEventListener('click', () => zoomBy(1.28));
  elements.resetView.addEventListener('click', resetViewFromControl);
  elements.mobileGestureToggle.addEventListener('click', () => {
    gestureEnabled = !gestureEnabled;
    updatePointerMode();
    if (gestureEnabled) {
      showToast('Globe gestures on — tap “Scroll page” to exit');
    }
  });

  controls.addEventListener('start', () => {
    cameraAnimation = null;
    closeClusterPanel();
  });

  renderer.domElement.addEventListener('pointerdown', () => closeClusterPanel());

  renderer.domElement.addEventListener(
    'wheel',
    (event) => {
      if (!compactQuery.matches || gestureEnabled) {
        return;
      }
      event.preventDefault();
      const modeMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
      window.scrollBy({ top: event.deltaY * modeMultiplier, left: 0, behavior: 'auto' });
    },
    { passive: false }
  );

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(elements.canvasWrap);
  compactQuery.addEventListener('change', updatePointerMode);

  resize();
  updatePointerMode();
  requestAnimationFrame(animate);

  window.setTimeout(() => {
    elements.canvasWrap.classList.add('is-ready');
    elements.globeLoading.classList.add('is-hidden');
  }, 350);

  return {
    focusOnTrip,
    resetCamera,
    zoomBy,
    getCamera: () => camera,
    getControls: () => controls,
    closeClusterPanel
  };
}

function createSelectionReference(scene) {
  const group = new THREE.Group();
  group.visible = false;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff9b72,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.047, 48), ringMaterial);
  group.add(ring);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffe2c6,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  group.add(core);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  const context = glowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255, 196, 146, 0.9)');
  gradient.addColorStop(0.35, 'rgba(232, 118, 83, 0.3)');
  gradient.addColorStop(1, 'rgba(232, 118, 83, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  glow.scale.setScalar(0.17);
  glow.position.z = 0.002;
  group.add(glow);

  group.userData.ring = ring;
  group.userData.glow = glow;
  group.renderOrder = 4;
  scene.add(group);
  return group;
}

function addGraticule(group) {
  const material = new THREE.LineBasicMaterial({
    color: 0xa3d4cd,
    transparent: true,
    opacity: 0.09,
    depthWrite: false
  });

  for (const latitude of [-60, -30, 0, 30, 60]) {
    const points = [];
    const lat = THREE.MathUtils.degToRad(latitude);
    const radius = Math.cos(lat) * 1.003;
    const y = Math.sin(lat) * 1.003;
    for (let step = 0; step <= 128; step += 1) {
      const angle = (step / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(radius * Math.cos(angle), y, -radius * Math.sin(angle)));
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
    line.renderOrder = 0;
    group.add(line);
  }

  for (let longitude = 0; longitude < 360; longitude += 45) {
    const points = [];
    for (let step = 0; step <= 96; step += 1) {
      const latitude = -90 + (step / 96) * 180;
      points.push(latLonToVector3(latitude, longitude, 1.003));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    line.renderOrder = 0;
    group.add(line);
  }
}

function addStarField(scene) {
  const count = 520;
  const positions = new Float32Array(count * 3);
  const random = mulberry32(8128);

  for (let index = 0; index < count; index += 1) {
    const radius = 5 + random() * 10;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xfff4dc,
    size: 0.017,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    sizeAttenuation: true
  });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function focusGlobeOnTrip(trip, animate = true) {
  if (!globeController) {
    return;
  }
  if (trip) {
    globeController.focusOnTrip(trip, animate);
  } else {
    globeController.resetCamera(animate);
  }
}

function setupMarkers() {
  for (const trip of trips) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.dataset.tripId = trip.id;
    button.style.setProperty('--trip-accent', trip.accent);
    button.setAttribute('aria-label', `${trip.title}, ${trip.location}. Open journal entry.`);
    button.innerHTML = `
      <span class="marker-pin" aria-hidden="true"></span>
      <span class="marker-label">${escapeHtml(trip.city)}</span>
    `;
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');
    button.addEventListener('click', () => {
      openTrip(trip.id, { push: true, trigger: button, animate: true });
    });
    elements.markerLayer.append(button);
    markerButtons.set(trip.id, button);
  }
}

function createClusterElement(key) {
  const cluster = document.createElement('button');
  cluster.type = 'button';
  cluster.className = 'marker-cluster';
  cluster.dataset.clusterKey = key;
  cluster.setAttribute('aria-expanded', 'false');
  cluster.setAttribute('aria-controls', 'nearbyPanel');
  cluster.innerHTML = `
    <span class="cluster-count" aria-hidden="true">2</span>
    <span class="cluster-label"></span>
  `;
  cluster.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCluster(key);
  });
  return cluster;
}

let clusterPanelElement = null;

function ensureClusterPanel() {
  if (clusterPanelElement) {
    return clusterPanelElement;
  }

  clusterPanelElement = document.createElement('div');
  clusterPanelElement.id = 'nearbyPanel';
  clusterPanelElement.className = 'cluster-panel';
  clusterPanelElement.setAttribute('role', 'group');
  clusterPanelElement.setAttribute('aria-label', 'Nearby trips');
  elements.markerLayer.append(clusterPanelElement);
  return clusterPanelElement;
}

function toggleCluster(key) {
  if (state.openClusterKey === key) {
    closeClusterPanel();
    return;
  }

  const groupTrips = clusterGroups.get(key);
  if (!groupTrips) {
    return;
  }

  closeClusterPanel();
  state.openClusterKey = key;
  const panel = ensureClusterPanel();
  const cluster = clusterElements.get(key);
  if (cluster) {
    cluster.setAttribute('aria-expanded', 'true');
    panel.style.setProperty('--cluster-x', cluster.style.getPropertyValue('--cluster-x'));
    panel.style.setProperty('--cluster-y', cluster.style.getPropertyValue('--cluster-y'));
  }

  panel.innerHTML = `
    <p class="cluster-panel-heading">${groupTrips.length} nearby field notes</p>
    ${groupTrips
      .map(
        (trip) => `
          <button class="cluster-option" type="button" data-trip-id="${trip.id}" style="--trip-accent:${trip.accent}" aria-label="Open ${escapeHtml(trip.title)} in ${escapeHtml(trip.location)}">
            <span class="cluster-swatch" aria-hidden="true"></span>
            <span class="cluster-option-copy">
              <strong>${escapeHtml(trip.title)}</strong>
              <span>${escapeHtml(trip.city)} · ${escapeHtml(getShortDateRange(trip))}</span>
            </span>
          </button>
        `
      )
      .join('')}
  `;
  panel.classList.add('is-open');
  positionClusterPanelFromElement(cluster);

  panel.querySelectorAll('.cluster-option').forEach((option) => {
    option.addEventListener('click', () => {
      openTrip(option.dataset.tripId, { push: true, trigger: cluster, animate: true });
    });
  });

  window.requestAnimationFrame(() => {
    const firstOption = panel.querySelector('.cluster-option');
    if (firstOption) {
      firstOption.focus({ preventScroll: true });
    }
  });
}

function positionClusterPanel(x, y) {
  if (!clusterPanelElement) {
    return;
  }
  const layerWidth = elements.markerLayer.clientWidth;
  const panelWidth = Math.min(245, Math.max(1, layerWidth - 24));
  const safeX = THREE.MathUtils.clamp(x, panelWidth / 2 + 8, layerWidth - panelWidth / 2 - 8);
  clusterPanelElement.style.setProperty('--cluster-x', `${safeX.toFixed(1)}px`);
  clusterPanelElement.style.setProperty('--cluster-y', `${y.toFixed(1)}px`);
  clusterPanelElement.classList.toggle('is-below', y < 215);
}

function positionClusterPanelFromElement(cluster) {
  if (!cluster) {
    return;
  }
  const x = Number.parseFloat(cluster.style.getPropertyValue('--cluster-x'));
  const y = Number.parseFloat(cluster.style.getPropertyValue('--cluster-y'));
  positionClusterPanel(x, y);
}

function closeClusterPanel() {
  if (state.openClusterKey) {
    const cluster = clusterElements.get(state.openClusterKey);
    if (cluster) {
      cluster.setAttribute('aria-expanded', 'false');
    }
  }
  state.openClusterKey = null;
  if (clusterPanelElement) {
    clusterPanelElement.classList.remove('is-open');
  }
}

function setupGlobalKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.openClusterKey) {
        closeClusterPanel();
        return;
      }
      if (state.activeId) {
        clearActiveTrip({ restoreFocus: true });
        writeUrl('push');
        announce('Journal entry closed.');
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!state.openClusterKey) {
      return;
    }
    if (event.target.closest('.cluster-panel, .marker-cluster')) {
      return;
    }
    closeClusterPanel();
  });
}

function setupHeaderLink() {
  const link = document.querySelector('.header-link');
  if (!link) {
    return;
  }
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('journal').scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
  });
}

function initialize() {
  setupYearFilter();
  setupFilters();
  setupListEvents();
  setupMarkers();
  setupGlobalKeyboard();
  setupHeaderLink();

  state.filteredIds = new Set(trips.map((trip) => trip.id));
  syncInterfaceFromState();
  renderTripList(trips);

  globeController = initGlobe();
  handleRouteChange({ initial: true });

  window.addEventListener('popstate', () => handleRouteChange());
  window.addEventListener('hashchange', () => handleRouteChange());
}

initialize();
