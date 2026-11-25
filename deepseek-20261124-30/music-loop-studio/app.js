import { createGardenScene } from "./garden-scene.js";

const STEP_COUNT = 16;
const TEMPO_MIN = 60;
const TEMPO_MAX = 180;
const STORAGE_KEY = "loop-garden:patterns:v1";
const MOTION_KEY = "loop-garden:reduced-motion:v1";
const EXPORT_SCHEMA = "loop-garden/pattern";
const EXPORT_VERSION = 1;

const TRACK_DEFS = [
  { id: "kick", displayName: "Kick", label: "KICK", kind: "PERCUSSION · LOW", color: "#ffd26f" },
  { id: "snare", displayName: "Snare", label: "SNARE", kind: "PERCUSSION · SNAP", color: "#ff8c68" },
  { id: "bass", displayName: "Bass", label: "BASS", kind: "SYNTH · SUB", color: "#75eea7" },
  { id: "melody", displayName: "Melody", label: "MELODY", kind: "SYNTH · GLASS", color: "#9ab9ff" },
];

const BASS_NOTES = [55, 55, 65.41, 55, 43.65, 55, 65.41, 55, 49, 55, 73.42, 55, 55, 65.41, 73.42, 55];
const MELODY_NOTES = [440, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440, 523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 493.88];

const dom = {
  headerPatternName: document.getElementById("headerPatternName"),
  headerSaveState: document.getElementById("headerSaveState"),
  headerSaveText: document.getElementById("headerSaveText"),
  reducedMotionToggle: document.getElementById("reducedMotionToggle"),
  stageCard: document.querySelector(".stage-card"),
  stageCanvas: document.getElementById("stageCanvas"),
  stageStepValue: document.getElementById("stageStepValue"),
  playbackStatus: document.getElementById("playbackStatus"),
  playbackDetail: document.getElementById("playbackDetail"),
  instrumentReadoutText: document.getElementById("instrumentReadoutText"),
  canvasHint: document.getElementById("canvasHint"),
  instrumentLegend: document.getElementById("instrumentLegend"),
  audioState: document.getElementById("audioState"),
  playButton: document.getElementById("playButton"),
  pauseButton: document.getElementById("pauseButton"),
  stopButton: document.getElementById("stopButton"),
  resumeAudioButton: document.getElementById("resumeAudioButton"),
  tempoRange: document.getElementById("tempoRange"),
  tempoValue: document.getElementById("tempoValue"),
  tempoDown: document.getElementById("tempoDown"),
  tempoUp: document.getElementById("tempoUp"),
  currentTempoLabel: document.getElementById("currentTempoLabel"),
  clearButton: document.getElementById("clearButton"),
  demoButton: document.getElementById("demoButton"),
  transportTimeLabel: document.getElementById("transportTimeLabel"),
  sequencerGrid: document.getElementById("sequencerGrid"),
  gridScroll: document.getElementById("gridScroll"),
  stepNumbers: document.getElementById("stepNumbers"),
  trackRows: document.getElementById("trackRows"),
  stepFacet: document.getElementById("stepFacet"),
  footerStatus: document.getElementById("footerStatus"),
  patternCount: document.getElementById("patternCount"),
  patternList: document.getElementById("patternList"),
  libraryEmpty: document.getElementById("libraryEmpty"),
  librarySaveStatus: document.getElementById("librarySaveStatus"),
  librarySaveText: document.getElementById("librarySaveText"),
  saveNowButton: document.getElementById("saveNowButton"),
  saveAsButton: document.getElementById("saveAsButton"),
  exportButton: document.getElementById("exportButton"),
  importButton: document.getElementById("importButton"),
  importFile: document.getElementById("importFile"),
  toastRegion: document.getElementById("toastRegion"),
  announcer: document.getElementById("announcer"),
  confirmDialog: document.getElementById("confirmDialog"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmAccept: document.getElementById("confirmAccept"),
  nameDialog: document.getElementById("nameDialog"),
  nameForm: document.getElementById("nameForm"),
  nameTitle: document.getElementById("nameTitle"),
  nameKicker: document.querySelector("#nameDialog .dialog-kicker"),
  nameAccept: document.getElementById("nameAccept"),
  patternNameInput: document.getElementById("patternNameInput"),
  nameError: document.getElementById("nameError"),
};

function makeSteps(indexes) {
  return Array.from({ length: STEP_COUNT }, (_, index) => indexes.includes(index));
}

function makeTracks(stepIndexes, volumes = [88, 76, 82, 70]) {
  return TRACK_DEFS.map((track, index) => ({
    steps: makeSteps(stepIndexes[index]),
    volume: volumes[index],
    mute: false,
    solo: false,
  }));
}

const DEMO_PATTERN = {
  name: "Fern Stomp",
  bpm: 104,
  tracks: makeTracks(
    [
      [0, 4, 8, 11, 14],
      [4, 12, 15],
      [0, 2, 6, 8, 12, 14],
      [0, 3, 6, 8, 11, 13],
    ],
    [88, 76, 82, 70],
  ),
};

const PRESET_PATTERNS = [
  {
    id: "fern-stomp",
    name: "Fern Stomp",
    bpm: 104,
    tracks: makeTracks(
      [
        [0, 4, 8, 11, 14],
        [4, 12, 15],
        [0, 2, 6, 8, 12, 14],
        [0, 3, 6, 8, 11, 13],
      ],
      [88, 76, 82, 70],
    ),
  },
  {
    id: "moss-circuit",
    name: "Moss Circuit",
    bpm: 118,
    tracks: makeTracks(
      [
        [0, 4, 7, 9, 12],
        [4, 9, 12, 15],
        [0, 3, 6, 7, 10, 13, 14],
        [2, 5, 7, 10, 13, 15],
      ],
      [82, 70, 86, 64],
    ),
  },
  {
    id: "night-orchard",
    name: "Night Orchard",
    bpm: 86,
    tracks: makeTracks(
      [
        [0, 6, 8, 14],
        [4, 12, 15],
        [0, 3, 6, 8, 11, 14],
        [0, 2, 5, 8, 10, 13],
      ],
      [92, 68, 78, 76],
    ),
  },
];

const state = {
  current: clonePattern(DEMO_PATTERN),
  library: [],
  activeId: null,
  dirty: false,
  autoSaveTimer: null,
  reducedMotion: false,
  storageAvailable: true,
  hasPlayed: false,
  playbackMode: "stopped",
  currentStep: 0,
  pausedAtStep: 0,
  lastHits: [],
  lastRenderedStep: -1,
};

const audio = {
  context: null,
  master: null,
  compressor: null,
  trackGains: [],
  delayInput: null,
  delayWet: null,
  noiseBuffer: null,
  schedulerId: null,
  nextNoteTime: 0,
  nextStepIndex: 0,
  visualQueue: [],
  voices: new Set(),
  starting: false,
};

let scene = null;
let padElements = [];
let rowElements = [];
let numberElements = [];
let confirmResolver = null;
let nameDialogResolver = null;
let toastSequence = 0;
let lastFrame = performance.now();

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clonePattern(pattern) {
  return {
    name: pattern.name,
    bpm: pattern.bpm,
    tracks: pattern.tracks.map((track) => ({
      steps: Array.from(track.steps, Boolean),
      volume: track.volume,
      mute: Boolean(track.mute),
      solo: Boolean(track.solo),
    })),
  };
}

function pad2(number) {
  return String(number).padStart(2, "0");
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

function sanitizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function anySolo() {
  return state.current.tracks.some((track) => track.solo);
}

function isTrackSounding(index) {
  const track = state.current.tracks[index];
  if (!track || track.volume <= 0 || track.mute) return false;
  return !anySolo() || track.solo;
}

function noteCount(track) {
  return track.steps.reduce((count, active) => count + (active ? 1 : 0), 0);
}

function announce(message) {
  dom.announcer.textContent = "";
  window.setTimeout(() => {
    dom.announcer.textContent = message;
  }, 20);
}

function showToast(message, type = "info", duration = 3600) {
  const toast = document.createElement("div");
  toast.className = `toast is-${type}`;
  toast.dataset.toastId = String(++toastSequence);
  toast.textContent = message;
  dom.toastRegion.appendChild(toast);
  while (dom.toastRegion.children.length > 3) {
    dom.toastRegion.firstElementChild.remove();
  }
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(4px)";
    toast.style.transition = "opacity 160ms ease, transform 160ms ease";
    window.setTimeout(() => toast.remove(), 180);
  }, duration);
}

function setSaveState(kind, headerText, libraryText = headerText) {
  dom.headerSaveState.className = `save-state is-${kind}`;
  dom.librarySaveStatus.className = `library-save-status is-${kind}`;
  dom.headerSaveText.textContent = headerText;
  dom.librarySaveText.textContent = libraryText;
}

function buildSequencer() {
  dom.stepNumbers.replaceChildren();
  numberElements = [];
  for (let step = 0; step < STEP_COUNT; step += 1) {
    const number = document.createElement("div");
    number.className = `step-number${step % 4 === 0 ? " is-beat" : ""}`;
    number.textContent = pad2(step + 1);
    number.setAttribute("role", "columnheader");
    number.setAttribute("aria-label", `Step ${step + 1}`);
    dom.stepNumbers.appendChild(number);
    numberElements.push(number);
  }

  dom.trackRows.replaceChildren();
  padElements = [];
  rowElements = [];

  TRACK_DEFS.forEach((definition, trackIndex) => {
    const row = document.createElement("div");
    row.className = "track-row";
    row.style.setProperty("--track-color", definition.color);
    row.setAttribute("role", "row");

    const meta = document.createElement("div");
    meta.className = "track-meta";
    meta.setAttribute("role", "rowheader");
    meta.innerHTML = `
      <div class="track-id">
        <span class="track-index">${pad2(trackIndex + 1)}</span>
        <span class="track-name">${definition.label}</span>
        <span class="track-kind">${definition.kind}</span>
      </div>
      <div class="track-toggles">
        <button class="track-toggle mute-toggle" type="button" aria-pressed="false" aria-label="Mute ${definition.displayName}" title="Mute ${definition.displayName}">M</button>
        <button class="track-toggle solo-toggle" type="button" aria-pressed="false" aria-label="Solo ${definition.displayName}" title="Solo ${definition.displayName}">S</button>
      </div>
      <div class="track-volume-row">
        <span class="volume-label">VOL</span>
        <input class="volume-range" type="range" min="0" max="100" step="1" value="80" aria-label="${definition.displayName} volume" />
        <span class="volume-value">80</span>
      </div>
    `;

    const muteButton = meta.querySelector(".mute-toggle");
    const soloButton = meta.querySelector(".solo-toggle");
    const volumeRange = meta.querySelector(".volume-range");
    const volumeValue = meta.querySelector(".volume-value");

    muteButton.addEventListener("click", () => {
      state.current.tracks[trackIndex].mute = !state.current.tracks[trackIndex].mute;
      updateTrackUI();
      syncTrackGains();
      markEdited();
    });

    soloButton.addEventListener("click", () => {
      state.current.tracks[trackIndex].solo = !state.current.tracks[trackIndex].solo;
      updateTrackUI();
      syncTrackGains();
      markEdited();
    });

    volumeRange.addEventListener("input", () => {
      state.current.tracks[trackIndex].volume = Number(volumeRange.value);
      volumeRange.style.setProperty("--volume-progress", `${volumeRange.value}%`);
      volumeValue.textContent = volumeRange.value;
      meta.classList.toggle("is-muted", !isTrackSounding(trackIndex));
      syncTrackGains();
      markEdited();
    });

    const lane = document.createElement("div");
    lane.className = "pad-lane";
    lane.setAttribute("role", "presentation");

    const playhead = document.createElement("div");
    playhead.className = "lane-playhead";
    playhead.setAttribute("aria-hidden", "true");
    lane.appendChild(playhead);

    const trackPads = [];
    for (let step = 0; step < STEP_COUNT; step += 1) {
      const cell = document.createElement("div");
      cell.className = "pad-cell";
      cell.setAttribute("role", "gridcell");

      const pad = document.createElement("button");
      pad.className = "pad";
      pad.type = "button";
      pad.dataset.track = String(trackIndex);
      pad.dataset.step = String(step);
      pad.setAttribute("aria-pressed", "false");
      pad.setAttribute("aria-label", `${definition.displayName} step ${step + 1}, off`);
      pad.tabIndex = trackIndex === 0 && step === 0 ? 0 : -1;
      pad.addEventListener("click", () => toggleStep(trackIndex, step));
      pad.addEventListener("focus", () => setRovingPad(trackIndex, step));
      pad.addEventListener("keydown", handlePadNavigation);

      cell.appendChild(pad);
      lane.appendChild(cell);
      trackPads.push(pad);
    }

    row.appendChild(meta);
    row.appendChild(lane);
    dom.trackRows.appendChild(row);
    rowElements.push({ row, meta, muteButton, soloButton, volumeRange, volumeValue, playhead, lane });
    padElements.push(trackPads);
  });
}

function setRovingPad(trackIndex, step) {
  padElements.forEach((trackPads) => trackPads.forEach((pad) => {
    pad.tabIndex = -1;
  }));
  if (padElements[trackIndex]?.[step]) padElements[trackIndex][step].tabIndex = 0;
}

function handlePadNavigation(event) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const trackIndex = Number(event.currentTarget.dataset.track);
  const step = Number(event.currentTarget.dataset.step);
  let nextTrack = trackIndex;
  let nextStep = step;

  if (event.key === "ArrowLeft") nextStep = Math.max(0, step - 1);
  if (event.key === "ArrowRight") nextStep = Math.min(STEP_COUNT - 1, step + 1);
  if (event.key === "ArrowUp") nextTrack = Math.max(0, trackIndex - 1);
  if (event.key === "ArrowDown") nextTrack = Math.min(TRACK_DEFS.length - 1, trackIndex + 1);
  if (event.key === "Home") nextStep = 0;
  if (event.key === "End") nextStep = STEP_COUNT - 1;

  padElements[nextTrack]?.[nextStep]?.focus({ preventScroll: false });
}

function updatePad(trackIndex, step) {
  const pad = padElements[trackIndex]?.[step];
  if (!pad) return;
  const active = state.current.tracks[trackIndex].steps[step];
  const definition = TRACK_DEFS[trackIndex];
  pad.setAttribute("aria-pressed", String(active));
  pad.setAttribute("aria-label", `${definition.displayName} step ${step + 1}, ${active ? "on" : "off"}`);
}

function updateAllPads() {
  for (let trackIndex = 0; trackIndex < TRACK_DEFS.length; trackIndex += 1) {
    for (let step = 0; step < STEP_COUNT; step += 1) updatePad(trackIndex, step);
  }
}

function updateTrackUI() {
  const soloActive = anySolo();
  state.current.tracks.forEach((track, trackIndex) => {
    const elements = rowElements[trackIndex];
    if (!elements) return;
    const audible = !track.mute && (!soloActive || track.solo) && track.volume > 0;
    elements.muteButton.setAttribute("aria-pressed", String(track.mute));
    elements.soloButton.setAttribute("aria-pressed", String(track.solo));
    elements.volumeRange.value = String(track.volume);
    elements.volumeRange.style.setProperty("--volume-progress", `${track.volume}%`);
    elements.volumeValue.textContent = String(track.volume);
    elements.meta.classList.toggle("is-muted", !audible);
    elements.meta.setAttribute("aria-label", `${TRACK_DEFS[trackIndex].displayName}, volume ${track.volume}${track.mute ? ", muted" : ""}${track.solo ? ", soloed" : ""}`);
  });
}

function updateTempoUI() {
  const bpm = state.current.bpm;
  dom.tempoRange.value = String(bpm);
  dom.tempoValue.textContent = String(bpm);
  dom.currentTempoLabel.textContent = `${bpm} BPM`;
  dom.tempoRange.style.setProperty("--tempo-progress", `${((bpm - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN)) * 100}%`);
  dom.tempoRange.setAttribute("aria-valuetext", `${bpm} beats per minute`);
}

function renderPattern({ updatePads = true } = {}) {
  dom.headerPatternName.textContent = state.current.name;
  document.title = `${state.current.name} · Loop Garden`;
  updateTempoUI();
  if (updatePads) updateAllPads();
  updateTrackUI();
  syncTrackGains();
  dom.saveNowButton.textContent = state.activeId ? "Save now" : "Save as…";
}

function setCurrentStep(step, { force = false, updateStatus = true } = {}) {
  const normalized = ((step % STEP_COUNT) + STEP_COUNT) % STEP_COUNT;
  state.currentStep = normalized;
  if (normalized === state.lastRenderedStep && !force) {
    if (updateStatus) updatePlaybackStatus(state.lastHits);
    return;
  }

  for (let trackIndex = 0; trackIndex < TRACK_DEFS.length; trackIndex += 1) {
    const elements = rowElements[trackIndex];
    if (!elements) continue;
    elements.playhead.style.setProperty("--playhead-step", String(normalized));
    for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex += 1) {
      padElements[trackIndex][stepIndex].classList.toggle("is-current", stepIndex === normalized);
    }
  }
  numberElements.forEach((number, index) => number.classList.toggle("is-current", index === normalized));

  state.lastRenderedStep = normalized;
  dom.stageStepValue.textContent = pad2(normalized + 1);
  dom.transportTimeLabel.textContent = `${normalized + 1} / 16`;
  if (updateStatus) updatePlaybackStatus(state.lastHits);
}

function updatePlaybackStatus(hits = []) {
  state.lastHits = hits;
  const mode = state.playbackMode;
  const stepLabel = pad2(state.currentStep + 1);
  let status = `Ready at step ${stepLabel}`;
  let detail = "Audio begins only when you press Play.";
  let footer = "Audio standing by";
  let audioLabel = audio.context ? "AUDIO READY" : "AUDIO OFF";
  let audioClass = "";

  if (mode === "playing") {
    audioLabel = "AUDIO LIVE";
    audioClass = "is-live";
    status = `Playing at step ${stepLabel}`;
    footer = `Playing · ${state.current.bpm} BPM`;
    if (hits.length > 0) {
      const names = hits.map((index) => TRACK_DEFS[index].displayName);
      detail = `${state.current.bpm} BPM · ${names.join(" + ")} sounding`;
    } else {
      detail = `${state.current.bpm} BPM · space between notes`;
    }
  } else if (mode === "paused") {
    audioLabel = "AUDIO PAUSED";
    audioClass = "is-suspended";
    status = `Paused at step ${stepLabel}`;
    detail = "Position held. Play or Resume audio continues from here.";
    footer = "Audio paused";
  } else if (mode === "suspended") {
    audioLabel = "AUDIO SUSPENDED";
    audioClass = "is-suspended";
    status = `Audio suspended at step ${stepLabel}`;
    detail = "The browser paused the clock. Use Resume audio to continue.";
    footer = "Explicit resume required";
  } else if (state.hasPlayed) {
    status = `Stopped at step ${stepLabel}`;
    detail = "Playhead returned to the first step.";
    footer = "Stopped · ready to play";
  }

  dom.playbackStatus.textContent = status;
  dom.playbackDetail.textContent = detail;
  dom.footerStatus.textContent = footer;
  dom.audioState.textContent = audioLabel;
  dom.audioState.className = `audio-state${audioClass ? ` ${audioClass}` : ""}`;
}

function updateTransportUI({ announceState = false } = {}) {
  const mode = state.playbackMode;
  const playing = mode === "playing";
  dom.stageCard.classList.toggle("is-performing", playing);
  dom.playButton.classList.toggle("is-playing", playing);
  dom.pauseButton.disabled = !playing;
  dom.pauseButton.classList.toggle("is-active", mode === "paused");
  dom.stopButton.classList.toggle("is-active", mode === "stopped" && state.hasPlayed);
  dom.resumeAudioButton.hidden = mode !== "suspended";

  const playLabel = dom.playButton.querySelector(".play-label");
  const playSub = dom.playButton.querySelector(".play-sub");
  if (playing) {
    playLabel.textContent = "LIVE";
    playSub.textContent = "in the garden";
    dom.playButton.setAttribute("aria-label", "Pattern is playing");
  } else if (mode === "paused") {
    playLabel.textContent = "RESUME";
    playSub.textContent = `from step ${pad2(state.pausedAtStep + 1)}`;
    dom.playButton.setAttribute("aria-label", "Resume playback from the held position");
  } else if (mode === "suspended") {
    playLabel.textContent = "RESUME";
    playSub.textContent = "wake the audio";
    dom.playButton.setAttribute("aria-label", "Resume audio and continue playback");
  } else {
    playLabel.textContent = "PLAY";
    playSub.textContent = "start audio";
    dom.playButton.setAttribute("aria-label", "Play pattern");
  }

  if (scene) scene.setPlaying(playing);
  updatePlaybackStatus(state.lastHits);
  if (!playbackHasHits()) dom.instrumentReadoutText.textContent = "All players resting";

  if (announceState) {
    if (mode === "playing") announce(`Playing from step ${state.currentStep + 1} at ${state.current.bpm} beats per minute.`);
    if (mode === "paused") announce(`Paused at step ${state.currentStep + 1}.`);
    if (mode === "stopped") announce("Stopped. Playhead returned to step 1.");
    if (mode === "suspended") announce("Audio suspended. Use the resume audio button to continue.");
  }
}

function playbackHasHits() {
  return state.playbackMode === "playing" && state.lastHits.length > 0;
}

function flashHit(trackIndex, step) {
  const pad = padElements[trackIndex]?.[step];
  const legend = dom.instrumentLegend.querySelector(`[data-instrument="${trackIndex}"]`);
  [pad, legend].filter(Boolean).forEach((element) => {
    const token = (Number(element.dataset.hitToken) || 0) + 1;
    element.dataset.hitToken = String(token);
    element.classList.add("is-hit");
    window.setTimeout(() => {
      if (Number(element.dataset.hitToken) === token) element.classList.remove("is-hit");
    }, 165);
  });
  if (scene) scene.pulse(trackIndex);
}

function applyStepHits(step, hits) {
  setCurrentStep(step);
  state.lastHits = hits;
  hits.forEach((trackIndex) => flashHit(trackIndex, step));
  if (hits.length > 0) {
    dom.instrumentReadoutText.textContent = hits.map((index) => TRACK_DEFS[index].displayName).join(" + ") + " sounding";
  } else {
    dom.instrumentReadoutText.textContent = "Space · no sounding note";
  }
  updatePlaybackStatus(hits);
}

function processVisualQueue() {
  if (!audio.context || state.playbackMode !== "playing") return;
  const now = audio.context.currentTime;
  while (audio.visualQueue.length > 0 && audio.visualQueue[0].time <= now + 0.004) {
    const event = audio.visualQueue.shift();
    const hits = event.tracks.filter((trackIndex) => isTrackSounding(trackIndex));
    applyStepHits(event.step, hits);
  }
}

function initAudioGraph() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser does not support Web Audio.");
  audio.context = new AudioContextClass({ latencyHint: "interactive" });
  const context = audio.context;

  audio.compressor = context.createDynamicsCompressor();
  audio.compressor.threshold.setValueAtTime(-18, context.currentTime);
  audio.compressor.knee.setValueAtTime(18, context.currentTime);
  audio.compressor.ratio.setValueAtTime(5, context.currentTime);
  audio.compressor.attack.setValueAtTime(0.004, context.currentTime);
  audio.compressor.release.setValueAtTime(0.18, context.currentTime);

  audio.master = context.createGain();
  audio.master.gain.value = 0.78;
  audio.master.connect(audio.compressor);
  audio.compressor.connect(context.destination);

  audio.trackGains = TRACK_DEFS.map(() => {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(audio.master);
    return gain;
  });

  audio.delayInput = context.createGain();
  const delay = context.createDelay(0.5);
  delay.delayTime.value = 0.285;
  const feedback = context.createGain();
  feedback.gain.value = 0.18;
  audio.delayWet = context.createGain();
  audio.delayWet.gain.value = 0.15;
  audio.delayInput.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(audio.delayWet);
  audio.delayWet.connect(audio.master);

  audio.noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.4), context.sampleRate);
  const data = audio.noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const envelope = 1 - index / data.length;
    data[index] = (Math.random() * 2 - 1) * envelope;
  }

  syncTrackGains();
  context.addEventListener("statechange", handleAudioStateChange);
  updateTransportUI();
}

async function ensureAudioReady() {
  if (!audio.context) initAudioGraph();
  if (audio.context.state === "suspended" || audio.context.state === "interrupted") {
    await audio.context.resume();
  }
  if (audio.context.state !== "running") {
    throw new Error("Audio is suspended. Use Resume audio to try again.");
  }
  return audio.context;
}

function handleAudioStateChange() {
  if (!audio.context) return;
  if (audio.context.state === "suspended" && state.playbackMode === "playing") {
    suspendPlayback("browser", { quiet: true });
  }
  updateTransportUI();
}

function syncTrackGains() {
  if (!audio.context) return;
  const now = audio.context.currentTime;
  state.current.tracks.forEach((track, index) => {
    const gain = audio.trackGains[index];
    if (!gain) return;
    const audible = !track.mute && (!anySolo() || track.solo);
    const value = audible ? Math.pow(track.volume / 100, 1.15) * 0.9 : 0;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(value, now, 0.012);
  });
}

function stepDuration() {
  return 60 / state.current.bpm / 4;
}

function startScheduler() {
  stopScheduler();
  const scheduleAhead = () => {
    if (state.playbackMode !== "playing" || !audio.context || audio.context.state !== "running") return;
    while (audio.nextNoteTime < audio.context.currentTime + 0.12) {
      scheduleStepAt(audio.nextStepIndex, audio.nextNoteTime);
      audio.nextNoteTime += stepDuration();
      audio.nextStepIndex = (audio.nextStepIndex + 1) % STEP_COUNT;
    }
  };
  scheduleAhead();
  audio.schedulerId = window.setInterval(scheduleAhead, 25);
}

function stopScheduler() {
  if (audio.schedulerId !== null) {
    window.clearInterval(audio.schedulerId);
    audio.schedulerId = null;
  }
}

function scheduleStepAt(step, time) {
  const hits = [];
  for (let trackIndex = 0; trackIndex < TRACK_DEFS.length; trackIndex += 1) {
    if (!state.current.tracks[trackIndex].steps[step] || !isTrackSounding(trackIndex)) continue;
    hits.push(trackIndex);
    triggerTrack(trackIndex, step, time);
  }
  audio.visualQueue.push({ step, time, tracks: hits });
}

function triggerTrack(trackIndex, step, time) {
  if (trackIndex === 0) triggerKick(time);
  if (trackIndex === 1) triggerSnare(time);
  if (trackIndex === 2) triggerBass(BASS_NOTES[step], time);
  if (trackIndex === 3) triggerMelody(MELODY_NOTES[step], time);
}

function registerVoice(nodes, sources, output, endsAt) {
  const voice = { nodes, sources, output, endsAt };
  audio.voices.add(voice);
  if (!audio.context) return voice;
  const cleanupDelay = Math.max(250, (endsAt - audio.context.currentTime + 0.4) * 1000);
  window.setTimeout(() => {
    if (audio.voices.delete(voice)) disconnectVoiceNodes(voice);
  }, cleanupDelay);
  return voice;
}

function disconnectVoiceNodes(voice) {
  voice.nodes.forEach((node) => {
    try {
      node.disconnect();
    } catch {
      // A node may already be disconnected after a hard stop.
    }
  });
}

function triggerKick(time) {
  const context = audio.context;
  const oscillator = context.createOscillator();
  const output = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(158, time);
  oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.16);
  output.gain.setValueAtTime(0.0001, time);
  output.gain.linearRampToValueAtTime(0.9, time + 0.005);
  output.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
  oscillator.connect(output);
  output.connect(audio.trackGains[0]);
  oscillator.start(time);
  oscillator.stop(time + 0.37);
  registerVoice([oscillator, output], [oscillator], output, time + 0.37);
}

function triggerSnare(time) {
  const context = audio.context;
  const output = context.createGain();
  const noise = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const body = context.createOscillator();
  const bodyGain = context.createGain();

  noise.buffer = audio.noiseBuffer;
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(1350, time);
  output.gain.setValueAtTime(0.0001, time);
  output.gain.linearRampToValueAtTime(0.42, time + 0.004);
  output.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);

  body.type = "triangle";
  body.frequency.setValueAtTime(182, time);
  body.frequency.exponentialRampToValueAtTime(118, time + 0.1);
  bodyGain.gain.setValueAtTime(0.3, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

  noise.connect(highpass);
  highpass.connect(output);
  body.connect(bodyGain);
  bodyGain.connect(output);
  output.connect(audio.trackGains[1]);
  noise.start(time);
  noise.stop(time + 0.22);
  body.start(time);
  body.stop(time + 0.14);
  registerVoice([noise, highpass, body, bodyGain, output], [noise, body], output, time + 0.25);
}

function triggerBass(frequency, time) {
  const context = audio.context;
  const output = context.createGain();
  const filter = context.createBiquadFilter();
  const saw = context.createOscillator();
  const sub = context.createOscillator();
  const sawGain = context.createGain();
  const subGain = context.createGain();

  filter.type = "lowpass";
  filter.Q.setValueAtTime(5.5, time);
  filter.frequency.setValueAtTime(760, time);
  filter.frequency.exponentialRampToValueAtTime(185, time + 0.22);
  output.gain.setValueAtTime(0.0001, time);
  output.gain.linearRampToValueAtTime(0.4, time + 0.006);
  output.gain.exponentialRampToValueAtTime(0.0001, time + 0.31);

  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(frequency, time);
  sub.type = "sine";
  sub.frequency.setValueAtTime(frequency / 2, time);
  sawGain.gain.value = 0.32;
  subGain.gain.value = 0.55;

  saw.connect(sawGain);
  sub.connect(subGain);
  sawGain.connect(filter);
  subGain.connect(filter);
  filter.connect(output);
  output.connect(audio.trackGains[2]);
  saw.start(time);
  sub.start(time);
  saw.stop(time + 0.34);
  sub.stop(time + 0.34);
  registerVoice([saw, sub, sawGain, subGain, filter, output], [saw, sub], output, time + 0.36);
}

function triggerMelody(frequency, time) {
  const context = audio.context;
  const output = context.createGain();
  const triangle = context.createOscillator();
  const shimmer = context.createOscillator();
  const triangleGain = context.createGain();
  const shimmerGain = context.createGain();
  const delaySend = context.createGain();

  output.gain.setValueAtTime(0.0001, time);
  output.gain.linearRampToValueAtTime(0.22, time + 0.007);
  output.gain.exponentialRampToValueAtTime(0.0001, time + 0.62);

  triangle.type = "triangle";
  triangle.frequency.setValueAtTime(frequency, time);
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(frequency * 2.01, time);
  triangleGain.gain.value = 0.55;
  shimmerGain.gain.value = 0.14;
  delaySend.gain.value = 0.24;

  triangle.connect(triangleGain);
  shimmer.connect(shimmerGain);
  triangleGain.connect(output);
  shimmerGain.connect(output);
  output.connect(audio.trackGains[3]);
  output.connect(delaySend);
  delaySend.connect(audio.delayInput);
  triangle.start(time);
  shimmer.start(time);
  triangle.stop(time + 0.65);
  shimmer.stop(time + 0.65);
  registerVoice(
    [triangle, shimmer, triangleGain, shimmerGain, delaySend, output],
    [triangle, shimmer],
    output,
    time + 0.68,
  );
}

function stopAllVoices() {
  if (!audio.context) return;
  const now = audio.context.currentTime;
  if (audio.delayWet) {
    audio.delayWet.gain.cancelScheduledValues(now);
    audio.delayWet.gain.setTargetAtTime(0.0001, now, 0.012);
  }
  audio.voices.forEach((voice) => {
    try {
      const gain = voice.output?.gain;
      if (gain) {
        const currentValue = Math.max(0.0001, gain.value);
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(currentValue, now);
        gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      }
    } catch {
      // Ignore disconnected automation.
    }
    voice.sources.forEach((source) => {
      try {
        source.stop(now + 0.025);
      } catch {
        // Already stopped.
      }
    });
    window.setTimeout(() => disconnectVoiceNodes(voice), 60);
  });
  audio.voices.clear();
}

function startPlayback() {
  if (state.playbackMode === "playing" || audio.starting) return;
  audio.starting = true;
  const resumeStep = state.playbackMode === "stopped" ? 0 : state.pausedAtStep;
  state.playbackMode = "playing";
  updateTransportUI();

  ensureAudioReady()
    .then((context) => {
      if (state.playbackMode !== "playing") return;
      stopScheduler();
      audio.visualQueue.length = 0;
      state.currentStep = resumeStep;
      state.pausedAtStep = resumeStep;
      state.lastHits = [];
      state.hasPlayed = true;
      audio.nextStepIndex = resumeStep;
      audio.nextNoteTime = context.currentTime + 0.055;
      setCurrentStep(resumeStep, { force: true });
      syncTrackGains();
      if (audio.delayWet) audio.delayWet.gain.setTargetAtTime(0.15, context.currentTime, 0.01);
      startScheduler();
      updateTransportUI({ announceState: true });
    })
    .catch((error) => {
      stopScheduler();
      audio.visualQueue.length = 0;
      stopAllVoices();
      state.playbackMode = "suspended";
      state.pausedAtStep = resumeStep;
      updateTransportUI({ announceState: true });
      showToast(error?.message || "Audio could not start. Use Resume audio to try again.", "error", 5200);
    })
    .finally(() => {
      audio.starting = false;
    });
}

function pausePlayback() {
  if (state.playbackMode !== "playing") return;
  const holdStep = state.currentStep;
  stopScheduler();
  audio.visualQueue.length = 0;
  stopAllVoices();
  state.playbackMode = "paused";
  state.pausedAtStep = holdStep;
  state.lastHits = [];
  state.hasPlayed = true;
  setCurrentStep(holdStep, { force: true });
  updateTransportUI({ announceState: true });
  dom.instrumentReadoutText.textContent = "Paused · all players resting";
}

function suspendPlayback(reason = "browser", { quiet = false } = {}) {
  if (state.playbackMode !== "playing") {
    updateTransportUI();
    return;
  }
  const holdStep = state.currentStep;
  stopScheduler();
  audio.visualQueue.length = 0;
  stopAllVoices();
  state.playbackMode = "suspended";
  state.pausedAtStep = holdStep;
  state.lastHits = [];
  state.hasPlayed = true;
  setCurrentStep(holdStep, { force: true });
  updateTransportUI();
  dom.instrumentReadoutText.textContent = "Audio suspended · all players resting";
  if (audio.context?.state === "running") {
    audio.context.suspend().catch(() => {});
  }
  if (!quiet) {
    const suffix = reason === "background" ? "Playback paused because the page went to the background." : "The audio clock was suspended.";
    showToast(`${suffix} Use Resume audio when you are ready.`, "error", 5600);
    announce("Audio suspended. Use the resume audio button to continue.");
  }
}

function stopPlayback({ silent = false } = {}) {
  stopScheduler();
  audio.visualQueue.length = 0;
  stopAllVoices();
  state.playbackMode = "stopped";
  state.currentStep = 0;
  state.pausedAtStep = 0;
  state.lastHits = [];
  setCurrentStep(0, { force: true });
  updateTransportUI({ announceState: !silent });
  dom.instrumentReadoutText.textContent = "All players resting";
}

function previewTrack(trackIndex, step) {
  if (!audio.context || audio.context.state !== "running" || !isTrackSounding(trackIndex)) return;
  triggerTrack(trackIndex, step, audio.context.currentTime + 0.008);
}

function toggleStep(trackIndex, step) {
  const active = !state.current.tracks[trackIndex].steps[step];
  state.current.tracks[trackIndex].steps[step] = active;
  updatePad(trackIndex, step);
  markEdited();
  if (active && audio.context?.state === "running" && isTrackSounding(trackIndex)) {
    previewTrack(trackIndex, step);
    flashHit(trackIndex, step);
  }
}

function setTempo(value, { mark = true } = {}) {
  const nextTempo = clamp(Math.round(Number(value)), TEMPO_MIN, TEMPO_MAX);
  if (!Number.isFinite(nextTempo)) return;
  if (state.current.bpm === nextTempo) {
    updateTempoUI();
    return;
  }
  state.current.bpm = nextTempo;
  updateTempoUI();
  updatePlaybackStatus(state.lastHits);
  if (mark) markEdited();
}

function markEdited() {
  state.dirty = true;
  if (state.autoSaveTimer !== null) window.clearTimeout(state.autoSaveTimer);
  if (!state.activeId) {
    setSaveState("dirty", "Unsaved pattern", "This loop is not on the shelf yet");
    return;
  }
  setSaveState("dirty", "Unsaved changes", "Saving changes…");
  state.autoSaveTimer = window.setTimeout(() => {
    state.autoSaveTimer = null;
    saveActivePattern({ quiet: true });
  }, 520);
}

function saveActivePattern({ quiet = false } = {}) {
  if (!state.activeId) return false;
  if (state.autoSaveTimer !== null) {
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
  const saved = state.library.find((pattern) => pattern.id === state.activeId);
  if (!saved) {
    state.activeId = null;
    setSaveState("dirty", "Unsaved pattern", "This loop is not on the shelf yet");
    return false;
  }
  saved.name = state.current.name;
  saved.bpm = state.current.bpm;
  saved.tracks = clonePattern(state.current).tracks;
  saved.updatedAt = new Date().toISOString();
  const persisted = persistState();
  if (!persisted) {
    setSaveState("error", "Could not save", "Local storage is unavailable");
    if (!quiet) showToast("Could not save locally. The current pattern is still open in memory.", "error");
    return false;
  }
  state.dirty = false;
  setSaveState("saved", "Saved locally", "All changes saved");
  renderLibrary();
  if (!quiet) {
    showToast(`Saved “${saved.name}” locally.`, "success");
    announce(`Pattern saved locally as ${saved.name}.`);
  }
  return true;
}

function persistState() {
  if (!state.storageAvailable) return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeId: state.activeId,
        patterns: state.library,
        savedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch (error) {
    console.warn("Loop Garden could not write local storage.", error);
    state.storageAvailable = false;
    return false;
  }
}

function makeSeedLibrary() {
  const now = Date.now();
  return PRESET_PATTERNS.map((preset, index) => ({
    id: preset.id,
    name: preset.name,
    bpm: preset.bpm,
    tracks: clonePattern(preset).tracks,
    updatedAt: new Date(now - index * 60_000).toISOString(),
  }));
}

function normalizeStoredTrack(track, index) {
  if (!track || !Array.isArray(track.steps) || track.steps.length !== STEP_COUNT) return null;
  if (track.steps.some((value) => !(value === true || value === false || value === 1 || value === 0))) return null;
  if (!Number.isFinite(track.volume) || track.volume < 0 || track.volume > 100) return null;
  if (typeof track.mute !== "boolean" || typeof track.solo !== "boolean") return null;
  return {
    steps: track.steps.map((value) => value === true || value === 1),
    volume: Math.round(track.volume),
    mute: track.mute,
    solo: track.solo,
  };
}

function normalizeStoredPattern(item) {
  if (!item || typeof item !== "object") return null;
  const name = sanitizeName(item.name);
  if (!name || !Number.isFinite(item.bpm) || item.bpm < TEMPO_MIN || item.bpm > TEMPO_MAX) return null;
  if (!Array.isArray(item.tracks) || item.tracks.length !== TRACK_DEFS.length) return null;
  const tracks = item.tracks.map(normalizeStoredTrack);
  if (tracks.some((track) => track === null)) return null;
  return {
    id: typeof item.id === "string" && item.id ? item.id : `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    bpm: Math.round(item.bpm),
    tracks,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
  };
}

function loadStoredState() {
  let stored = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (error) {
    console.warn("Loop Garden could not read local storage.", error);
    state.storageAvailable = false;
  }

  if (stored && stored.version === 1 && Array.isArray(stored.patterns)) {
    if (stored.patterns.length === 0) {
      state.library = [];
      state.activeId = null;
      state.current = clonePattern(DEMO_PATTERN);
      setSaveState("dirty", "Unsaved demo", "No patterns on the shelf yet");
      return;
    }
    const patterns = stored.patterns.map(normalizeStoredPattern).filter(Boolean);
    if (patterns.length > 0) {
      state.library = patterns;
      state.activeId = patterns.some((pattern) => pattern.id === stored.activeId) ? stored.activeId : patterns[0].id;
      const active = patterns.find((pattern) => pattern.id === state.activeId);
      state.current = clonePattern(active);
      setSaveState("saved", "Saved locally", "Last saved pattern restored");
      return;
    }
  }

  state.library = makeSeedLibrary();
  state.activeId = state.library[0].id;
  state.current = clonePattern(state.library[0]);
  if (state.storageAvailable) persistState();
  setSaveState("saved", "Saved locally", "Starter patterns are ready");
}

function renderLibrary() {
  dom.patternList.replaceChildren();
  dom.patternCount.textContent = `${state.library.length} SAVED`;
  dom.libraryEmpty.hidden = state.library.length !== 0;

  state.library
    .slice()
    .sort((a, b) => {
      if (a.id === state.activeId) return -1;
      if (b.id === state.activeId) return 1;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    })
    .forEach((pattern) => {
      const row = document.createElement("div");
      row.className = `pattern-row${pattern.id === state.activeId ? " is-active" : ""}`;

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "pattern-load";
      loadButton.setAttribute("aria-label", `Load pattern ${pattern.name}`);
      loadButton.innerHTML = `
        <span class="pattern-led" aria-hidden="true"></span>
        <span class="pattern-name-group">
          <span class="pattern-name"></span>
          <span class="pattern-meta"></span>
        </span>
      `;
      loadButton.querySelector(".pattern-name").textContent = pattern.name;
      const totalNotes = pattern.tracks.reduce((count, track) => count + noteCount(track), 0);
      loadButton.querySelector(".pattern-meta").textContent =
        pattern.id === state.activeId ? `ACTIVE · ${pattern.bpm} BPM` : `${pattern.bpm} BPM · ${totalNotes} NOTES`;
      loadButton.addEventListener("click", () => loadPattern(pattern.id));

      const actions = document.createElement("div");
      actions.className = "pattern-actions";

      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.className = "icon-button";
      renameButton.textContent = "✎";
      renameButton.setAttribute("aria-label", `Rename ${pattern.name}`);
      renameButton.title = "Rename pattern";
      renameButton.addEventListener("click", () => renamePattern(pattern.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button delete-button";
      deleteButton.textContent = "×";
      deleteButton.setAttribute("aria-label", `Delete ${pattern.name}`);
      deleteButton.title = "Delete pattern";
      deleteButton.addEventListener("click", () => deletePattern(pattern.id));

      actions.append(renameButton, deleteButton);
      row.append(loadButton, actions);
      dom.patternList.appendChild(row);
    });
}

async function loadPattern(id) {
  const pattern = state.library.find((item) => item.id === id);
  if (!pattern) return;
  if (state.autoSaveTimer !== null) {
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
    if (state.activeId) saveActivePattern({ quiet: true });
  }

  if (!state.activeId && patternHasContent() && !patternEqualsDemo()) {
    const shouldLoad = await askConfirm({
      title: "Load another pattern?",
      message: "The current unsaved loop will be replaced. Your saved patterns stay on the shelf.",
      acceptText: "Load pattern",
    });
    if (!shouldLoad) return;
  }

  if (state.playbackMode !== "stopped") stopPlayback({ silent: true });
  state.current = clonePattern(pattern);
  state.activeId = pattern.id;
  state.dirty = false;
  persistState();
  renderPattern();
  renderLibrary();
  setSaveState("saved", "Saved locally", "All changes saved");
  setCurrentStep(0, { force: true });
  dom.instrumentReadoutText.textContent = "All players resting";
  showToast(`Loaded “${pattern.name}”.`, "success");
  announce(`Loaded pattern ${pattern.name} at ${pattern.bpm} beats per minute.`);
}

async function saveAsNew() {
  if (state.autoSaveTimer !== null) {
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
  const suggested = state.activeId ? sanitizeName(`${state.current.name} copy`) : state.current.name;
  const name = await askName({
    title: "Save as a new pattern",
    kicker: "PATTERN SHELF",
    acceptText: "Save pattern",
    initial: suggested,
  });
  if (!name) return;

  const pattern = {
    id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    bpm: state.current.bpm,
    tracks: clonePattern(state.current).tracks,
    updatedAt: new Date().toISOString(),
  };
  state.current.name = name;
  state.library.push(pattern);
  state.activeId = pattern.id;
  state.dirty = false;
  if (!persistState()) {
    setSaveState("error", "Could not save", "Local storage is unavailable");
    showToast("The pattern is open in memory but could not be written to local storage.", "error", 5600);
    return;
  }
  renderPattern();
  renderLibrary();
  setSaveState("saved", "Saved locally", "All changes saved");
  showToast(`Saved new pattern “${name}”.`, "success");
  announce(`Saved new pattern ${name}.`);
}

async function renamePattern(id) {
  const pattern = state.library.find((item) => item.id === id);
  if (!pattern) return;
  const name = await askName({
    title: "Rename pattern",
    kicker: "PATTERN SHELF",
    acceptText: "Rename",
    initial: pattern.name,
  });
  if (!name || name === pattern.name) return;
  pattern.name = name;
  pattern.updatedAt = new Date().toISOString();
  if (state.activeId === id) {
    state.current.name = name;
    saveActivePattern({ quiet: true });
  } else {
    persistState();
  }
  renderPattern({ updatePads: false });
  renderLibrary();
  showToast(`Renamed to “${name}”.`, "success");
  announce(`Pattern renamed to ${name}.`);
}

async function deletePattern(id) {
  const pattern = state.library.find((item) => item.id === id);
  if (!pattern) return;
  const confirmed = await askConfirm({
    title: `Delete “${pattern.name}”?`,
    message: "This removes the pattern from this browser. If it is currently loaded, the loop will stay open as an unsaved pattern.",
    acceptText: "Delete pattern",
    danger: true,
  });
  if (!confirmed) return;

  state.library = state.library.filter((item) => item.id !== id);
  if (state.activeId === id) {
    state.activeId = null;
    state.dirty = true;
    if (state.autoSaveTimer !== null) {
      window.clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = null;
    }
  }
  persistState();
  renderLibrary();
  renderPattern({ updatePads: false });
  if (!state.activeId) setSaveState("dirty", "Unsaved pattern", "Deleted from the shelf");
  showToast(`Deleted “${pattern.name}” from this browser.`, "info");
  announce(`Deleted pattern ${pattern.name}.`);
}

async function saveNow() {
  if (state.activeId) {
    saveActivePattern();
  } else {
    await saveAsNew();
  }
}

function patternHasContent() {
  return state.current.tracks.some((track) => track.steps.some(Boolean));
}

function patternEqualsDemo() {
  const compare = (pattern) =>
    JSON.stringify({
      bpm: pattern.bpm,
      tracks: pattern.tracks.map((track) => ({
        steps: track.steps,
        volume: track.volume,
        mute: track.mute,
        solo: track.solo,
      })),
    });
  return compare(state.current) === compare(DEMO_PATTERN);
}

async function clearPattern() {
  if (patternHasContent()) {
    const confirmed = await askConfirm({
      title: "Clear all sixteen steps?",
      message: `This will remove every note from “${state.current.name}”. Volume, mute, and solo settings will stay in place.`,
      acceptText: "Clear pattern",
      danger: true,
    });
    if (!confirmed) return;
  }
  if (state.playbackMode !== "stopped") stopPlayback({ silent: true });
  state.current.tracks.forEach((track) => {
    track.steps = Array.from({ length: STEP_COUNT }, () => false);
  });
  updateAllPads();
  markEdited();
  dom.instrumentReadoutText.textContent = "Pattern cleared · all players resting";
  showToast("Pattern cleared. The step grid is ready for something new.", "info");
  announce("Pattern cleared. All steps are off.");
}

async function restoreDemoPattern() {
  if (patternEqualsDemo() && state.current.name === "Fern Stomp") {
    showToast("The Fern Stomp demo is already in the grid.", "info");
    return;
  }
  const confirmed = await askConfirm({
    title: "Bring back the demo?",
    message: "This replaces the current pattern with the original four-track Fern Stomp demo. Saved patterns are not changed.",
    acceptText: "Restore demo",
  });
  if (!confirmed) return;

  if (state.autoSaveTimer !== null) {
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
  if (state.playbackMode !== "stopped") stopPlayback({ silent: true });
  state.current = clonePattern(DEMO_PATTERN);
  state.activeId = null;
  state.dirty = true;
  renderPattern();
  renderLibrary();
  setSaveState("dirty", "Demo loaded · unsaved", "Save it to add it to the shelf");
  setCurrentStep(0, { force: true });
  dom.instrumentReadoutText.textContent = "Demo restored · all players resting";
  showToast("Fern Stomp demo restored. Save it if you want to keep this copy.", "success");
  announce("Demo restored at 104 beats per minute.");
}

function validateImportedData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The file must contain a JSON object.");
  }
  if (data.schema !== EXPORT_SCHEMA) {
    throw new Error(`Expected schema “${EXPORT_SCHEMA}”.`);
  }
  if (data.version !== EXPORT_VERSION) {
    throw new Error(`Unsupported version. This studio imports version ${EXPORT_VERSION}.`);
  }
  if (!Number.isFinite(data.bpm) || data.bpm < TEMPO_MIN || data.bpm > TEMPO_MAX) {
    throw new Error(`Tempo must be between ${TEMPO_MIN} and ${TEMPO_MAX} BPM.`);
  }
  if (data.stepCount !== STEP_COUNT) {
    throw new Error(`Step count must be exactly ${STEP_COUNT}.`);
  }
  if (!Array.isArray(data.tracks) || data.tracks.length !== TRACK_DEFS.length) {
    throw new Error(`The pattern must contain exactly ${TRACK_DEFS.length} tracks.`);
  }

  if (typeof data.name !== "string") throw new Error("The pattern name must be text.");
  const name = sanitizeName(data.name);
  if (data.name.trim().length > 32) throw new Error("The pattern name must be 32 characters or fewer.");
  if (!name) throw new Error("The pattern needs a name between 1 and 32 characters.");

  const tracks = data.tracks.map((track, trackIndex) => {
    const definition = TRACK_DEFS[trackIndex];
    if (!track || typeof track !== "object") {
      throw new Error(`Track ${trackIndex + 1} is missing.`);
    }
    if (track.id !== undefined && track.id !== definition.id) {
      throw new Error(`Track ${trackIndex + 1} must have id “${definition.id}”.`);
    }
    if (!Array.isArray(track.steps) || track.steps.length !== STEP_COUNT) {
      throw new Error(`Track ${trackIndex + 1} (${definition.displayName}) must contain exactly ${STEP_COUNT} steps.`);
    }
    const steps = track.steps.map((value, stepIndex) => {
      if (value === true || value === 1) return true;
      if (value === false || value === 0) return false;
      throw new Error(`Track ${trackIndex + 1}, step ${stepIndex + 1} must be on or off.`);
    });
    if (!Number.isFinite(track.volume) || track.volume < 0 || track.volume > 100) {
      throw new Error(`Track ${trackIndex + 1} volume must be between 0 and 100.`);
    }
    if (typeof track.mute !== "boolean" || typeof track.solo !== "boolean") {
      throw new Error(`Track ${trackIndex + 1} mute and solo values must be true or false.`);
    }
    return {
      steps,
      volume: Math.round(track.volume),
      mute: track.mute,
      solo: track.solo,
    };
  });

  return { name, bpm: Math.round(data.bpm), tracks };
}

async function importPatternFile(file) {
  if (!file) return;
  let imported;
  try {
    const raw = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("The file is not valid JSON.");
    }
    imported = validateImportedData(parsed);
  } catch (error) {
    const message = `Import failed — ${error.message.replace(/[.!?]+$/, "")}. Your current pattern was kept.`;
    showToast(message, "error", 7000);
    announce(message);
    return;
  } finally {
    dom.importFile.value = "";
  }

  if (state.autoSaveTimer !== null) {
    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
  if (state.playbackMode !== "stopped") stopPlayback({ silent: true });
  state.current = clonePattern(imported);
  const pattern = {
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: imported.name,
    bpm: imported.bpm,
    tracks: clonePattern(imported).tracks,
    updatedAt: new Date().toISOString(),
  };
  state.library.push(pattern);
  state.activeId = pattern.id;
  state.dirty = false;
  renderPattern();
  renderLibrary();
  setCurrentStep(0, { force: true });
  if (!persistState()) {
    setSaveState("error", "Imported · not stored", "Local storage is unavailable");
  } else {
    setSaveState("saved", "Saved locally", "Imported pattern saved");
  }
  dom.instrumentReadoutText.textContent = "Imported pattern · all players resting";
  showToast(`Imported “${imported.name}” with ${STEP_COUNT} steps per track.`, "success", 5200);
  announce(`Imported and validated pattern ${imported.name}.`);
}

function exportPattern() {
  const payload = {
    schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
    name: state.current.name,
    bpm: state.current.bpm,
    stepCount: STEP_COUNT,
    exportedAt: new Date().toISOString(),
    tracks: TRACK_DEFS.map((definition, index) => ({
      id: definition.id,
      name: definition.displayName,
      steps: state.current.tracks[index].steps.map((active) => (active ? 1 : 0)),
      volume: state.current.tracks[index].volume,
      mute: state.current.tracks[index].mute,
      solo: state.current.tracks[index].solo,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename = state.current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "loop-garden-pattern";
  anchor.href = url;
  anchor.download = `${filename}.loop-garden.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Pattern exported as versioned Loop Garden JSON.", "success");
  announce("Versioned pattern JSON exported.");
}

function askConfirm({ title, message, acceptText = "Continue", danger = false }) {
  if (confirmResolver) {
    confirmResolver(false);
    confirmResolver = null;
  }
  if (dom.confirmDialog.open) dom.confirmDialog.close();
  dom.confirmTitle.textContent = title;
  dom.confirmMessage.textContent = message;
  dom.confirmAccept.textContent = acceptText;
  dom.confirmAccept.className = `dialog-button ${danger ? "danger" : "accent"}`;
  dom.confirmDialog.returnValue = "cancel";
  dom.confirmDialog.showModal();
  window.setTimeout(() => {
    const target = danger ? dom.confirmDialog.querySelector('[value="cancel"]') : dom.confirmAccept;
    target?.focus();
  }, 20);
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function askName({ title, kicker = "PATTERN SHELF", acceptText = "Save pattern", initial = "" }) {
  if (nameDialogResolver) {
    nameDialogResolver(null);
    nameDialogResolver = null;
  }
  if (dom.nameDialog.open) dom.nameDialog.close();
  dom.nameTitle.textContent = title;
  dom.nameKicker.textContent = kicker;
  dom.nameAccept.textContent = acceptText;
  dom.patternNameInput.value = initial;
  dom.nameError.textContent = "";
  dom.nameDialog.returnValue = "cancel";
  dom.nameDialog.showModal();
  window.setTimeout(() => {
    dom.patternNameInput.focus();
    dom.patternNameInput.select();
  }, 20);
  return new Promise((resolve) => {
    nameDialogResolver = resolve;
  });
}

function handleConfirmClose() {
  if (!confirmResolver) return;
  const accepted = dom.confirmDialog.returnValue === "confirm";
  confirmResolver(accepted);
  confirmResolver = null;
}

function handleNameClose() {
  if (!nameDialogResolver) return;
  const accepted = dom.nameDialog.returnValue === "save";
  const value = accepted ? sanitizeName(dom.patternNameInput.value) : null;
  nameDialogResolver(value || null);
  nameDialogResolver = null;
}

function setupDialogs() {
  dom.confirmDialog.addEventListener("close", handleConfirmClose);
  dom.nameDialog.addEventListener("close", handleNameClose);
  dom.nameForm.addEventListener("submit", (event) => {
    if (event.submitter?.value !== "save") return;
    const value = sanitizeName(dom.patternNameInput.value);
    if (!value) {
      event.preventDefault();
      dom.nameError.textContent = "Please enter a pattern name.";
      dom.patternNameInput.focus();
      return;
    }
    dom.patternNameInput.value = value;
    dom.nameError.textContent = "";
  });
}

function applyReducedMotion(value, { persist = true } = {}) {
  state.reducedMotion = Boolean(value);
  document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
  dom.reducedMotionToggle.setAttribute("aria-checked", String(state.reducedMotion));
  if (scene) scene.setReducedMotion(state.reducedMotion);
  if (persist) {
    try {
      window.localStorage.setItem(MOTION_KEY, String(state.reducedMotion));
    } catch {
      // The main save indicator already reports storage problems.
    }
  }
}

function initReducedMotion() {
  let initial = false;
  try {
    const stored = window.localStorage.getItem(MOTION_KEY);
    if (stored === "true" || stored === "false") {
      initial = stored === "true";
    } else {
      initial = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    }
  } catch {
    initial = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }
  applyReducedMotion(initial, { persist: false });
}

function setupEvents() {
  dom.playButton.addEventListener("click", () => {
    if (state.playbackMode === "playing") {
      announce("The pattern is already playing.");
      return;
    }
    startPlayback();
  });
  dom.pauseButton.addEventListener("click", pausePlayback);
  dom.stopButton.addEventListener("click", () => {
    if (state.playbackMode === "stopped") {
      announce("Playback is already stopped at step 1.");
      return;
    }
    stopPlayback();
  });
  dom.resumeAudioButton.addEventListener("click", startPlayback);

  dom.tempoRange.addEventListener("input", () => setTempo(dom.tempoRange.value));
  dom.tempoDown.addEventListener("click", () => setTempo(state.current.bpm - 1));
  dom.tempoUp.addEventListener("click", () => setTempo(state.current.bpm + 1));

  dom.clearButton.addEventListener("click", clearPattern);
  dom.demoButton.addEventListener("click", restoreDemoPattern);
  dom.saveNowButton.addEventListener("click", saveNow);
  dom.saveAsButton.addEventListener("click", saveAsNew);
  dom.exportButton.addEventListener("click", exportPattern);
  dom.importButton.addEventListener("click", () => dom.importFile.click());
  dom.importFile.addEventListener("change", () => importPatternFile(dom.importFile.files?.[0]));
  dom.reducedMotionToggle.addEventListener("click", () => {
    applyReducedMotion(!state.reducedMotion);
    announce(state.reducedMotion ? "Reduced motion enabled." : "Reduced motion disabled.");
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    const tag = event.target?.tagName;
    const interactive = ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(tag);
    const dialogOpen = document.querySelector("dialog[open]");
    if (interactive || dialogOpen) return;
    event.preventDefault();
    if (state.playbackMode === "playing") pausePlayback();
    else startPlayback();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.playbackMode === "playing") {
      suspendPlayback("background", { quiet: true });
    } else if (document.visibilityState === "visible" && state.playbackMode === "suspended") {
      updateTransportUI();
    }
  });

  window.addEventListener("pagehide", () => {
    if (state.playbackMode === "playing") suspendPlayback("background", { quiet: true });
    else {
      stopScheduler();
      audio.visualQueue.length = 0;
      stopAllVoices();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopScheduler();
    stopAllVoices();
  });
}

function setupScene() {
  try {
    scene = createGardenScene(dom.stageCanvas);
    scene.setReducedMotion(state.reducedMotion);
    scene.setPlaying(state.playbackMode === "playing");
  } catch (error) {
    console.warn("Loop Garden 3D scene could not start.", error);
    const fallback = document.createElement("div");
    fallback.className = "stage-fallback";
    fallback.textContent = "3D view unavailable — the step grid is still fully playable.";
    dom.stageCanvas.appendChild(fallback);
  }
}

function animate(now) {
  const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  processVisualQueue();
  if (scene) scene.update(delta, now / 1000);
  window.requestAnimationFrame(animate);
}

function init() {
  buildSequencer();
  setupDialogs();
  initReducedMotion();
  setupEvents();
  loadStoredState();
  renderPattern();
  renderLibrary();
  updateTransportUI();
  setCurrentStep(0, { force: true });
  setupScene();
  window.requestAnimationFrame(animate);
  if (!state.storageAvailable) {
    setSaveState("error", "Storage unavailable", "Patterns will not survive a refresh");
  }
}

init();
