import { GardenScene } from "./scene.js";
import { LoopAudioEngine } from "./audio.js";
import {
  DEMO_PATTERN,
  MAX_PATTERNS,
  STEP_COUNT,
  TRACK_DEFS,
  clone,
  contentKey,
  makeBlankPattern,
  makeExportPayload,
  makeId,
  parseImportPayload,
  readLibrary,
  slugify,
  writeLibrary,
} from "./patterns.js";

const REDUCED_MOTION_KEY = "loopGarden.reducedMotion.v1";

const el = (id) => document.getElementById(id);
const ui = {
  editorTitle: el("editorTitle"),
  saveState: el("saveState"),
  saveStateText: el("saveStateText"),
  saveButton: el("saveButton"),
  patternsButton: el("patternsButton"),
  patternCount: el("patternCount"),
  playButton: el("playButton"),
  playLabel: el("playLabel"),
  pauseButton: el("pauseButton"),
  stopButton: el("stopButton"),
  statusBadge: el("statusBadge"),
  statusLabel: el("statusLabel"),
  statusDetail: el("statusDetail"),
  statusNote: el("statusNote"),
  tempoValue: el("tempoValue"),
  tempoRange: el("tempoRange"),
  tempoDown: el("tempoDown"),
  tempoUp: el("tempoUp"),
  clearButton: el("clearButton"),
  demoButton: el("demoButton"),
  sequenceRuler: el("sequenceRuler"),
  trackRows: el("trackRows"),
  sequencer: el("sequencer"),
  playheadColumn: el("playheadColumn"),
  gridScroller: el("gridScroller"),
  audioPill: el("audioPill"),
  audioStateText: el("audioStateText"),
  reducedMotionToggle: el("reducedMotionToggle"),
  sceneCanvas: el("sceneCanvas"),
  sceneFallback: el("sceneFallback"),
  stagePanel: el("stagePanel"),
  stageStep: el("stageStep"),
  stageStatusText: el("stageStatusText"),
  nowPlaying: el("nowPlaying"),
  nowPulse: el("nowPulse"),
  instrumentChips: el("instrumentChips"),
  patternsDialog: el("patternsDialog"),
  closePatternsButton: el("closePatternsButton"),
  patternList: el("patternList"),
  libraryCount: el("libraryCount"),
  libraryMessage: el("libraryMessage"),
  saveFromLibraryButton: el("saveFromLibraryButton"),
  exportButton: el("exportButton"),
  importButton: el("importButton"),
  importInput: el("importInput"),
  newPatternForm: el("newPatternForm"),
  newPatternName: el("newPatternName"),
  confirmDialog: el("confirmDialog"),
  confirmTitle: el("confirmTitle"),
  confirmMessage: el("confirmMessage"),
  confirmOkButton: el("confirmOkButton"),
  confirmCancelButton: el("confirmCancelButton"),
  toastRegion: el("toastRegion"),
  playbackLive: el("playbackLive"),
};

function readReducedPreference() {
  try {
    const saved = localStorage.getItem(REDUCED_MOTION_KEY);
    if (saved === "true") return true;
    if (saved === "false") return false;
  } catch {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

const loaded = readLibrary();
const activeStored = loaded.library.patterns.find(
  (pattern) => pattern.id === loaded.library.activePatternId,
);

const state = {
  library: loaded.library,
  current: clone(activeStored || loaded.library.patterns[0]),
  transport: { phase: "stopped", position: 0, reason: null },
  displayStep: 0,
  reducedMotion: readReducedPreference(),
  renamingId: null,
  storageError: false,
  audioContextState: "idle",
  audioError: false,
  stepButtons: [],
  stepNumbers: [],
  muteButtons: [],
  soloButtons: [],
  volumeInputs: [],
  volumeOutputs: [],
  trackRows: [],
  chips: [],
  flashTimers: new Map(),
};

state.current.id = activeStored?.id || state.current.id || makeId();
state.library.activePatternId = state.current.id;

let gardenScene = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addIcon(node, iconId) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${iconId}`);
  svg.append(use);
  node.append(svg);
  return svg;
}

function getStoredPattern(id = state.current.id) {
  return state.library.patterns.find((pattern) => pattern.id === id);
}

function updateRangeFill(input, value, min = 0, max = 1) {
  const percentage = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-fill", `${Math.max(0, Math.min(100, percentage))}%`);
}

function updatePatternTitle() {
  ui.editorTitle.textContent = state.current.name;
  document.title = `Loop Garden · ${state.current.name}`;
}

function stepButtonLabel(track, step) {
  return `${track.name}, step ${step + 1}: ${track.steps[step] ? "on" : "off"}`;
}

function refreshStepButton(trackIndex, step) {
  const button = state.stepButtons[trackIndex]?.[step];
  if (!button) return;
  const track = state.current.tracks[trackIndex];
  button.setAttribute("aria-pressed", String(track.steps[step]));
  button.setAttribute("aria-label", stepButtonLabel(track, step));
}

function buildSequencer() {
  ui.sequenceRuler.replaceChildren();
  ui.trackRows.replaceChildren();

  const corner = element("div", "ruler-corner", "TRACK");
  corner.append(element("span", "", "STEP"));
  ui.sequenceRuler.append(corner);

  state.stepNumbers = [];
  for (let step = 0; step < STEP_COUNT; step += 1) {
    const number = element("div", "step-number", String(step + 1).padStart(2, "0"));
    number.classList.toggle("is-quarter", (step + 1) % 4 === 0);
    ui.sequenceRuler.append(number);
    state.stepNumbers.push(number);
  }

  state.stepButtons = [];
  state.muteButtons = [];
  state.soloButtons = [];
  state.volumeInputs = [];
  state.volumeOutputs = [];
  state.trackRows = [];

  state.current.tracks.forEach((track, trackIndex) => {
    const trackDefinition = TRACK_DEFS[trackIndex];
    const row = element("div", "track-row");
    row.dataset.track = String(trackIndex);
    row.style.setProperty("--track-color", trackDefinition.color);
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `${track.name} track`);

    const meta = element("div", "track-meta");
    const nameRow = element("div", "track-name-row");
    nameRow.append(element("span", "track-dot"), element("span", "track-name", track.name));

    const controls = element("div", "track-controls");
    const volumeLabel = element("label", "track-volume");
    volumeLabel.title = `${track.name} volume`;
    const volumeSr = element("span", "sr-only", `${track.name} volume`);
    const volumeInput = document.createElement("input");
    volumeInput.type = "range";
    volumeInput.min = "0";
    volumeInput.max = "1";
    volumeInput.step = "0.01";
    volumeInput.value = String(track.volume);
    volumeInput.dataset.track = String(trackIndex);
    volumeInput.setAttribute("aria-label", `${track.name} volume`);
    volumeInput.setAttribute("aria-valuetext", `${Math.round(track.volume * 100)} percent`);
    updateRangeFill(volumeInput, track.volume);
    const volumeOutput = element("span", "volume-output", String(Math.round(track.volume * 100)));
    volumeLabel.append(volumeSr, volumeInput, volumeOutput);

    const muteButton = element("button", "mini-toggle", "M");
    muteButton.type = "button";
    muteButton.dataset.action = "mute";
    muteButton.dataset.track = String(trackIndex);
    muteButton.setAttribute("aria-pressed", String(track.muted));
    muteButton.setAttribute("aria-label", `Mute ${track.name}`);
    muteButton.title = `Mute ${track.name}`;

    const soloButton = element("button", "mini-toggle", "S");
    soloButton.type = "button";
    soloButton.dataset.action = "solo";
    soloButton.dataset.track = String(trackIndex);
    soloButton.setAttribute("aria-pressed", String(track.solo));
    soloButton.setAttribute("aria-label", `Solo ${track.name}`);
    soloButton.title = `Solo ${track.name}`;

    controls.append(volumeLabel, muteButton, soloButton);
    meta.append(nameRow, controls);
    row.append(meta);

    const buttons = [];
    for (let step = 0; step < STEP_COUNT; step += 1) {
      const button = element("button", "step-button");
      button.type = "button";
      button.dataset.track = String(trackIndex);
      button.dataset.step = String(step);
      button.classList.toggle("is-quarter", (step + 1) % 4 === 0);
      button.setAttribute("aria-pressed", String(track.steps[step]));
      button.setAttribute("aria-label", stepButtonLabel(track, step));
      button.title = `${track.name} · step ${step + 1}`;
      row.append(button);
      buttons.push(button);
    }

    state.trackRows.push(row);
    state.stepButtons.push(buttons);
    state.muteButtons.push(muteButton);
    state.soloButtons.push(soloButton);
    state.volumeInputs.push(volumeInput);
    state.volumeOutputs.push(volumeOutput);
    ui.trackRows.append(row);
  });

  refreshAudibleVisuals();
}

function buildInstrumentChips() {
  ui.instrumentChips.replaceChildren();
  state.chips = state.current.tracks.map((track, index) => {
    const chip = element("span", "instrument-chip");
    chip.style.setProperty("--chip-color", TRACK_DEFS[index].color);
    chip.append(element("span", "instrument-chip-dot"), document.createTextNode(track.name));
    ui.instrumentChips.append(chip);
    return chip;
  });
  refreshAudibleVisuals();
}

function updateTempoUi() {
  const bpm = state.current.bpm;
  ui.tempoValue.textContent = String(bpm);
  ui.tempoRange.value = String(bpm);
  ui.tempoRange.setAttribute("aria-valuetext", `${bpm} beats per minute`);
  updateRangeFill(ui.tempoRange, bpm, 50, 200);
  updateStatusDetail();
}

function refreshAudibleVisuals() {
  const anySolo = state.current.tracks.some((track) => track.solo);
  state.current.tracks.forEach((track, index) => {
    const silenced = track.muted || (anySolo && !track.solo);
    state.trackRows[index]?.classList.toggle("is-silenced", silenced);
    state.chips[index]?.classList.toggle("is-silenced", silenced);
    state.muteButtons[index]?.setAttribute("aria-pressed", String(track.muted));
    state.soloButtons[index]?.setAttribute("aria-pressed", String(track.solo));
    state.muteButtons[index]?.setAttribute("aria-label", `${track.muted ? "Unmute" : "Mute"} ${track.name}`);
    state.soloButtons[index]?.setAttribute("aria-label", `${track.solo ? "Unsolo" : "Solo"} ${track.name}`);
  });
}

function renderEditorFromPattern() {
  updatePatternTitle();
  buildSequencer();
  buildInstrumentChips();
  updateTempoUi();
  state.displayStep = 0;
  setPlayhead(0, false);
  updatePatternCount();
  updateSaveState();
}

function updatePatternCount() {
  ui.patternCount.textContent = String(state.library.patterns.length);
  ui.libraryCount.textContent = `${state.library.patterns.length} of ${MAX_PATTERNS}`;
}

function isDirty() {
  const stored = getStoredPattern();
  if (!stored) return true;
  return contentKey(stored) !== contentKey(state.current);
}

function updateSaveState() {
  const dirty = isDirty();
  if (state.storageError) {
    ui.saveState.dataset.state = "error";
    ui.saveStateText.textContent = "Local save unavailable";
    return;
  }
  ui.saveState.dataset.state = dirty ? "dirty" : "saved";
  ui.saveStateText.textContent = dirty ? "Unsaved changes" : "Saved locally";
}

function persistLibrary({ quiet = false } = {}) {
  try {
    writeLibrary(state.library);
    state.storageError = false;
    updateSaveState();
    return true;
  } catch {
    state.storageError = true;
    updateSaveState();
    if (!quiet) {
      showToast("Local storage is unavailable. Your current edits are still in memory.", "error");
    }
    return false;
  }
}

function markDirty() {
  updateSaveState();
}

function saveCurrent({ quiet = false } = {}) {
  const existingIndex = state.library.patterns.findIndex(
    (pattern) => pattern.id === state.current.id,
  );

  if (existingIndex === -1 && state.library.patterns.length >= MAX_PATTERNS) {
    showToast(`The library is full (${MAX_PATTERNS} patterns). Delete one first.`, "error");
    return false;
  }

  const snapshot = clone(state.current);
  snapshot.updatedAt = Date.now();
  if (existingIndex === -1) {
    state.library.patterns.push(snapshot);
  } else {
    state.library.patterns[existingIndex] = snapshot;
  }
  state.library.activePatternId = snapshot.id;
  const saved = persistLibrary({ quiet });
  updatePatternCount();
  if (ui.patternsDialog.open) renderPatternLibrary();
  if (saved && !quiet) showToast(`Saved “${state.current.name}” on this device.`);
  if (!saved && !quiet) updateSaveState();
  return saved;
}

function updateStatusDetail() {
  const step = state.displayStep + 1;
  ui.statusDetail.textContent = `Step ${step} of ${STEP_COUNT} · ${state.current.bpm} BPM`;
  ui.stageStep.textContent = String(step).padStart(2, "0");
}

function setPlayhead(step, keepInView = true) {
  const nextStep = Math.max(0, Math.min(STEP_COUNT - 1, step));
  state.stepNumbers[state.displayStep]?.classList.remove("is-playhead");
  state.stepButtons.forEach((row) => row[state.displayStep]?.classList.remove("is-playhead"));

  state.displayStep = nextStep;
  state.stepNumbers[nextStep]?.classList.add("is-playhead");
  state.stepButtons.forEach((row) => row[nextStep]?.classList.add("is-playhead"));
  updateStatusDetail();
  positionPlayheadOverlay();

  if (keepInView && state.transport.phase === "playing") {
    keepPlayheadVisible();
  }
}

function positionPlayheadOverlay() {
  requestAnimationFrame(() => {
    const number = state.stepNumbers[state.displayStep];
    if (!number) return;
    const sequenceRect = ui.sequencer.getBoundingClientRect();
    const numberRect = number.getBoundingClientRect();
    if (numberRect.width < 1 || sequenceRect.width < 1) return;
    ui.playheadColumn.style.left = `${numberRect.left - sequenceRect.left}px`;
    ui.playheadColumn.style.width = `${numberRect.width}px`;
  });
}

function keepPlayheadVisible() {
  const number = state.stepNumbers[state.displayStep];
  if (!number || ui.gridScroller.scrollWidth <= ui.gridScroller.clientWidth + 4) return;
  const scrollerRect = ui.gridScroller.getBoundingClientRect();
  const numberRect = number.getBoundingClientRect();
  const stickyLeft = scrollerRect.left + Math.min(150, ui.gridScroller.clientWidth * 0.42);
  const rightEdge = scrollerRect.right - 18;
  if (numberRect.left < stickyLeft || numberRect.right > rightEdge) {
    const target = ui.gridScroller.scrollLeft + numberRect.left - (stickyLeft + 14);
    ui.gridScroller.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }
}

function flashElement(node, className, duration = 210) {
  if (!node) return;
  const previous = state.flashTimers.get(node);
  if (previous) clearTimeout(previous);
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  const timer = setTimeout(() => {
    node.classList.remove(className);
    state.flashTimers.delete(node);
  }, duration);
  state.flashTimers.set(node, timer);
}

function clearFlashFeedback() {
  for (const timer of state.flashTimers.values()) clearTimeout(timer);
  state.flashTimers.clear();
  document.querySelectorAll(".is-hit, .is-sounding").forEach((node) => {
    node.classList.remove("is-hit", "is-sounding");
  });
}

function flashAudibleTracks(audibleTracks, step) {
  audibleTracks.forEach((trackIndex) => {
    flashElement(state.stepButtons[trackIndex]?.[step], "is-hit", 190);
    flashElement(state.chips[trackIndex], "is-sounding", 230);
    gardenScene?.pulse(trackIndex);
  });
}

function handleStep(step, audibleTracks) {
  setPlayhead(step);
  const names = audibleTracks.map((index) => state.current.tracks[index].name);
  const soundingText = names.length ? names.join(" + ") : "A quiet step";
  ui.nowPlaying.textContent = soundingText;
  ui.statusNote.textContent = names.length ? `Now: ${soundingText}` : "Following the audio clock";
  ui.stageStatusText.textContent = `Playing · Step ${step + 1} of ${STEP_COUNT}`;

  if (names.length) {
    const color = TRACK_DEFS[audibleTracks[0]].color;
    ui.nowPulse.style.background = color;
    ui.nowPulse.style.boxShadow = `0 0 0 5px color-mix(in srgb, ${color} 14%, transparent)`;
  } else {
    ui.nowPulse.style.background = "rgba(244, 239, 223, 0.44)";
    ui.nowPulse.style.boxShadow = "0 0 0 5px rgba(244, 239, 223, 0.04)";
  }

  flashAudibleTracks(audibleTracks, step);
  if (step % 4 === 0) {
    ui.playbackLive.textContent = names.length
      ? `Beat ${step / 4 + 1} of 4. Now sounding: ${soundingText}.`
      : `Beat ${step / 4 + 1} of 4. Rest.`;
  }
}

function updateAudioStatus() {
  const contextState = state.audioContextState;
  if (state.audioError) {
    ui.audioPill.dataset.state = "suspended";
    ui.audioStateText.textContent = "Audio needs a resume tap";
    return;
  }
  if (contextState === "running") {
    ui.audioPill.dataset.state = state.transport.phase === "playing" ? "running" : "ready";
    ui.audioStateText.textContent = state.transport.phase === "playing" ? "Audio live" : "Audio ready";
    return;
  }
  if (contextState === "suspended" || contextState === "interrupted") {
    ui.audioPill.dataset.state = "suspended";
    ui.audioStateText.textContent = "Audio suspended";
    return;
  }
  if (contextState === "closed") {
    ui.audioPill.dataset.state = "error";
    ui.audioStateText.textContent = "Audio closed";
    return;
  }
  ui.audioPill.dataset.state = "idle";
  ui.audioStateText.textContent = "Audio starts on Play";
}

function syncTransportUi() {
  const { phase, position, reason } = state.transport;
  const playing = phase === "playing";
  const paused = phase === "paused";

  ui.playButton.disabled = playing;
  ui.pauseButton.disabled = !playing;
  ui.stopButton.disabled = phase === "stopped";
  ui.playLabel.textContent = paused ? "Resume" : "Play";
  ui.playButton.setAttribute("aria-label", paused ? "Resume playback" : "Play pattern");
  ui.stagePanel.classList.toggle("is-playing", playing);
  ui.sequencer.classList.toggle("is-playing", playing);
  ui.statusBadge.dataset.state = phase;

  if (playing) {
    ui.statusLabel.textContent = "Playing";
    ui.statusNote.textContent = "Following the audio clock";
    ui.stageStatusText.textContent = `Playing · Step ${position + 1} of ${STEP_COUNT}`;
  } else if (paused) {
    if (reason === "background") {
      ui.statusLabel.textContent = "Paused in background";
      ui.statusNote.textContent = "Press Resume to continue from this step.";
      ui.nowPlaying.textContent = `Held at step ${position + 1}`;
    } else if (reason === "suspended") {
      ui.statusLabel.textContent = "Audio suspended";
      ui.statusBadge.dataset.state = "suspended";
      ui.statusNote.textContent = "Press Resume to re-enable audio at this step.";
      ui.nowPlaying.textContent = `Audio paused at step ${position + 1}`;
    } else if (reason === "error") {
      ui.statusLabel.textContent = "Audio paused";
      ui.statusNote.textContent = "Press Resume to try enabling audio again.";
      ui.nowPlaying.textContent = `Held at step ${position + 1}`;
    } else {
      ui.statusLabel.textContent = "Paused";
      ui.statusNote.textContent = "Position held. Press Resume to continue.";
      ui.nowPlaying.textContent = `Held at step ${position + 1}`;
    }
    ui.stageStatusText.textContent = `Paused · Step ${position + 1} of ${STEP_COUNT}`;
  } else {
    ui.statusLabel.textContent = "Stopped";
    ui.statusNote.textContent = "Press play to wake the garden.";
    ui.stageStatusText.textContent = `Stopped · Step 1 of ${STEP_COUNT}`;
    ui.nowPlaying.textContent = "Waiting for play";
    if (ui.gridScroller.scrollLeft > 0) {
      ui.gridScroller.scrollTo({ left: 0, behavior: "auto" });
    }
    clearFlashFeedback();
  }

  setPlayhead(position, playing);
  updateAudioStatus();
}

function handleTransportState(nextState) {
  state.transport = nextState;
  syncTransportUi();
  if (nextState.phase === "playing") {
    ui.playbackLive.textContent = `Playing ${state.current.name} at ${state.current.bpm} beats per minute.`;
  } else if (nextState.phase === "paused") {
    const reasonText =
      nextState.reason === "background"
        ? "Paused because the page was hidden."
        : nextState.reason === "suspended"
          ? "Audio was suspended by the browser."
          : "Playback paused.";
    ui.playbackLive.textContent = `${reasonText} Held at step ${nextState.position + 1}. Press Resume to continue.`;
  } else {
    ui.playbackLive.textContent = `Playback stopped at step 1 of ${STEP_COUNT}.`;
  }
}

const audio = new LoopAudioEngine({
  getPattern: () => state.current,
  onStep: handleStep,
  onStateChange: handleTransportState,
  onAudioState: ({ state: contextState }) => {
    state.audioContextState = contextState;
    if (contextState === "running") state.audioError = false;
    updateAudioStatus();
  },
  onError: (message) => {
    state.audioError = true;
    updateAudioStatus();
    showToast(message, "error");
  },
});

function showToast(message, kind = "success") {
  const toast = element("div", "toast", message);
  toast.dataset.kind = kind;
  ui.toastRegion.append(toast);
  while (ui.toastRegion.children.length > 3) {
    ui.toastRegion.firstElementChild?.remove();
  }
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 220);
  }, kind === "error" ? 4600 : 3000);
}

function confirmAction({ title, message, confirmLabel = "Continue", danger = true }) {
  return new Promise((resolve) => {
    ui.confirmTitle.textContent = title;
    ui.confirmMessage.textContent = message;
    ui.confirmOkButton.textContent = confirmLabel;
    ui.confirmOkButton.classList.toggle("button-danger", danger);
    ui.confirmOkButton.classList.toggle("button-dark", !danger);
    ui.confirmDialog.returnValue = "";

    const onClose = () => {
      ui.confirmDialog.removeEventListener("close", onClose);
      resolve(ui.confirmDialog.returnValue === "confirm");
    };
    ui.confirmDialog.addEventListener("close", onClose);
    if (!ui.confirmDialog.open) ui.confirmDialog.showModal();
    requestAnimationFrame(() => ui.confirmCancelButton.focus());
  });
}

function stopAndResetVisuals() {
  audio.stop();
  clearFlashFeedback();
}

async function loadPatternById(id) {
  if (id === state.current.id) {
    ui.patternsDialog.close();
    return;
  }
  if (isDirty()) {
    const proceed = await confirmAction({
      title: "Switch patterns?",
      message: "The current pattern has unsaved changes. Switching now will discard them.",
      confirmLabel: "Discard & switch",
    });
    if (!proceed) return;
  }

  const target = getStoredPattern(id);
  if (!target) {
    showLibraryMessage("That pattern is no longer in the library. Your current pattern is unchanged.");
    renderPatternLibrary();
    return;
  }

  stopAndResetVisuals();
  state.current = clone(target);
  state.library.activePatternId = target.id;
  state.renamingId = null;
  persistLibrary({ quiet: true });
  renderEditorFromPattern();
  syncTransportUi();
  ui.patternsDialog.close();
  showToast(`Opened “${target.name}”.`);
}

async function clearPattern() {
  if (!state.current.tracks.some((track) => track.steps.some(Boolean))) {
    stopAndResetVisuals();
    showToast("This pattern is already clear.");
    return;
  }

  const proceed = await confirmAction({
    title: "Clear all steps?",
    message: isDirty()
      ? `All notes in “${state.current.name}” will be removed. Your unsaved changes can’t be recovered after saving.`
      : `All notes in “${state.current.name}” will be removed. The saved pattern is replaced when you choose Save.`,
    confirmLabel: "Clear steps",
  });
  if (!proceed) return;

  stopAndResetVisuals();
  state.current.tracks.forEach((track) => {
    track.steps.fill(false);
  });
  state.stepButtons.flat().forEach((_, index) => {
    refreshStepButton(Math.floor(index / STEP_COUNT), index % STEP_COUNT);
  });
  setPlayhead(0, false);
  markDirty();
  showToast("Steps cleared. Save to keep the empty pattern.");
}

function demoIsLoaded() {
  return (
    state.current.bpm === DEMO_PATTERN.bpm &&
    JSON.stringify(state.current.tracks) === JSON.stringify(DEMO_PATTERN.tracks)
  );
}

async function restoreDemo() {
  if (demoIsLoaded() && !isDirty()) {
    showToast("The Morning Dew demo is already loaded.");
    return;
  }
  const proceed = await confirmAction({
    title: "Restore the demo pattern?",
    message: `This will replace the steps, tempo and mixer settings in “${state.current.name}” with the original Morning Dew demo.`,
    confirmLabel: "Restore demo",
  });
  if (!proceed) return;

  stopAndResetVisuals();
  state.current.bpm = DEMO_PATTERN.bpm;
  state.current.tracks = clone(DEMO_PATTERN.tracks);
  renderEditorFromPattern();
  syncTransportUi();
  markDirty();
  showToast("Morning Dew restored.");
}

function setTempo(nextBpm) {
  const bpm = Math.max(50, Math.min(200, Math.round(Number(nextBpm))));
  if (!Number.isFinite(bpm) || bpm === state.current.bpm) return;
  state.current.bpm = bpm;
  updateTempoUi();
  audio.setBpm(bpm);
  markDirty();
}

function toggleTrackFlag(trackIndex, flag) {
  const track = state.current.tracks[trackIndex];
  track[flag] = !track[flag];
  refreshAudibleVisuals();
  audio.updateMix();
  markDirty();
}

function isTrackAudibleNow(trackIndex) {
  const anySolo = state.current.tracks.some((track) => track.solo);
  const track = state.current.tracks[trackIndex];
  return !track.muted && (!anySolo || track.solo) && track.volume > 0.001;
}

function previewStep(trackIndex, step) {
  if (!isTrackAudibleNow(trackIndex)) return;
  flashElement(state.stepButtons[trackIndex]?.[step], "is-hit", 190);
  flashElement(state.chips[trackIndex], "is-sounding", 230);
  gardenScene?.pulse(trackIndex);
  ui.nowPlaying.textContent = `Preview · ${state.current.tracks[trackIndex].name}`;
  audio.preview(trackIndex, step);
}

function toggleStep(trackIndex, step) {
  const track = state.current.tracks[trackIndex];
  track.steps[step] = !track.steps[step];
  refreshStepButton(trackIndex, step);
  markDirty();
  if (track.steps[step] && audio.phase !== "playing") {
    previewStep(trackIndex, step);
  }
}

function moveStepFocus(trackIndex, step, key) {
  let nextTrack = trackIndex;
  let nextStep = step;
  if (key === "ArrowLeft") {
    if (step > 0) nextStep -= 1;
    else if (trackIndex > 0) {
      nextTrack -= 1;
      nextStep = STEP_COUNT - 1;
    }
  }
  if (key === "ArrowRight") {
    if (step < STEP_COUNT - 1) nextStep += 1;
    else if (trackIndex < state.current.tracks.length - 1) {
      nextTrack += 1;
      nextStep = 0;
    }
  }
  if (key === "ArrowUp") nextTrack = Math.max(0, trackIndex - 1);
  if (key === "ArrowDown") nextTrack = Math.min(state.current.tracks.length - 1, trackIndex + 1);
  if (key === "Home") nextStep = 0;
  if (key === "End") nextStep = STEP_COUNT - 1;

  const target = state.stepButtons[nextTrack]?.[nextStep];
  if (target) {
    target.focus({ preventScroll: false });
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function showLibraryMessage(message, kind = "error") {
  ui.libraryMessage.hidden = false;
  ui.libraryMessage.dataset.kind = kind;
  ui.libraryMessage.textContent = message;
}

function clearLibraryMessage() {
  ui.libraryMessage.hidden = true;
  ui.libraryMessage.textContent = "";
  ui.libraryMessage.removeAttribute("data-kind");
}

function patternNoteCount(pattern) {
  return pattern.tracks.reduce(
    (total, track) => total + track.steps.filter(Boolean).length,
    0,
  );
}

function renderPatternLibrary() {
  ui.patternList.replaceChildren();
  updatePatternCount();

  state.library.patterns.forEach((pattern, index) => {
    const row = element("div", "pattern-row");
    row.dataset.patternId = pattern.id;
    row.classList.toggle("is-active", pattern.id === state.current.id);

    if (state.renamingId === pattern.id) {
      const form = element("form", "rename-form");
      form.dataset.patternId = pattern.id;
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 40;
      input.value = pattern.name;
      input.setAttribute("aria-label", `New name for ${pattern.name}`);
      const save = element("button", "button button-dark button-small", "Save");
      save.type = "submit";
      const cancel = element("button", "button button-quiet button-small", "Cancel");
      cancel.type = "button";
      cancel.dataset.action = "cancel-rename";
      form.append(input, save, cancel);
      row.append(form);
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    } else {
      const select = element("button", "pattern-select");
      select.type = "button";
      select.dataset.action = "load";
      select.dataset.patternId = pattern.id;
      select.setAttribute("aria-label", `Open pattern ${pattern.name}`);
      const number = element("span", "pattern-index", String(index + 1).padStart(2, "0"));
      const info = element("span", "pattern-info");
      info.append(
        element("span", "pattern-name", pattern.name),
        element(
          "span",
          "pattern-meta",
          `${pattern.bpm} BPM · ${patternNoteCount(pattern)} notes · 16 steps`,
        ),
      );
      select.append(number, info);
      if (pattern.id === state.current.id) {
        select.append(element("span", "pattern-current", isDirty() ? "Current · edited" : "Current"));
      }

      const actions = element("div", "pattern-actions");
      const rename = element("button", "pattern-action");
      rename.type = "button";
      rename.dataset.action = "rename";
      rename.dataset.patternId = pattern.id;
      rename.setAttribute("aria-label", `Rename ${pattern.name}`);
      rename.title = `Rename ${pattern.name}`;
      addIcon(rename, "icon-pencil");

      const remove = element("button", "pattern-action danger");
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.dataset.patternId = pattern.id;
      remove.setAttribute("aria-label", `Delete ${pattern.name}`);
      remove.title = `Delete ${pattern.name}`;
      remove.disabled = state.library.patterns.length <= 1;
      addIcon(remove, "icon-trash");
      actions.append(rename, remove);
      row.append(select, actions);
    }
    ui.patternList.append(row);
  });
}

async function deletePatternById(id) {
  if (state.library.patterns.length <= 1) {
    showLibraryMessage("Keep at least one pattern in the library.");
    return;
  }
  const target = getStoredPattern(id);
  if (!target) return;
  const deletingActive = id === state.current.id;
  const proceed = await confirmAction({
    title: `Delete “${target.name}”?`,
    message:
      deletingActive && isDirty()
        ? "This pattern has unsaved changes. Deleting it removes the saved copy and opens another pattern."
        : "This removes the saved pattern from this browser. Exported JSON copies are unaffected.",
    confirmLabel: "Delete pattern",
  });
  if (!proceed) return;

  const index = state.library.patterns.findIndex((pattern) => pattern.id === id);
  state.library.patterns.splice(index, 1);
  state.renamingId = null;

  if (deletingActive) {
    stopAndResetVisuals();
    const fallback =
      state.library.patterns[Math.max(0, index - 1)] || state.library.patterns[0];
    state.current = clone(fallback);
    state.library.activePatternId = fallback.id;
    renderEditorFromPattern();
    syncTransportUi();
  }

  persistLibrary({ quiet: true });
  renderPatternLibrary();
  clearLibraryMessage();
  showToast(`Deleted “${target.name}”.`);
}

async function renamePatternById(id, nextName) {
  const name = nextName.trim();
  if (!name) {
    showLibraryMessage("A pattern name cannot be empty.");
    return;
  }
  if (name.length > 40) {
    showLibraryMessage("Use 40 characters or fewer for a pattern name.");
    return;
  }
  const stored = state.library.patterns.find((pattern) => pattern.id === id);
  if (!stored) return;

  stored.name = name;
  stored.updatedAt = Date.now();
  if (id === state.current.id) state.current.name = name;
  state.renamingId = null;
  clearLibraryMessage();
  persistLibrary({ quiet: true });
  updatePatternTitle();
  renderPatternLibrary();
  updateSaveState();
}

async function createNewPattern(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    showLibraryMessage("Give the new pattern a name.");
    return;
  }
  if (trimmed.length > 40) {
    showLibraryMessage("Use 40 characters or fewer for a pattern name.");
    return;
  }
  if (state.library.patterns.length >= MAX_PATTERNS) {
    showLibraryMessage(`The library is full (${MAX_PATTERNS}). Delete a pattern before creating another.`);
    return;
  }
  if (isDirty()) {
    const proceed = await confirmAction({
      title: "Discard current edits?",
      message: "Creating a blank pattern will discard the unsaved changes in the current pattern.",
      confirmLabel: "Create & discard",
    });
    if (!proceed) return;
  }

  const blank = makeBlankPattern(trimmed, state.current);
  state.library.patterns.push(blank);
  state.library.activePatternId = blank.id;
  stopAndResetVisuals();
  state.current = clone(blank);
  state.renamingId = null;
  persistLibrary({ quiet: true });
  renderEditorFromPattern();
  syncTransportUi();
  ui.newPatternName.value = "";
  clearLibraryMessage();
  ui.patternsDialog.close();
  showToast(`Created “${trimmed}”.`);
}

async function importPatternFile(file) {
  clearLibraryMessage();
  if (!file) return;
  if (file.size > 1_000_000) {
    showLibraryMessage("That file is too large to be a Loop Garden pattern. Your current work is unchanged.");
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    showLibraryMessage("The file could not be read. Your current pattern is unchanged.");
    return;
  }

  const result = parseImportPayload(text);
  if (!result.ok) {
    showLibraryMessage(`Import failed: ${result.error} Your current pattern is unchanged.`);
    showToast("Pattern import failed. Your work was not changed.", "error");
    return;
  }
  if (state.library.patterns.length >= MAX_PATTERNS) {
    showLibraryMessage(`The library is full (${MAX_PATTERNS}). Delete a pattern before importing.`);
    return;
  }

  if (isDirty()) {
    const proceed = await confirmAction({
      title: "Load imported pattern?",
      message: "The current pattern has unsaved changes. Loading this valid import will discard them.",
      confirmLabel: "Import & discard",
    });
    if (!proceed) return;
  }

  const imported = result.pattern;
  state.library.patterns.push(imported);
  state.library.activePatternId = imported.id;
  stopAndResetVisuals();
  state.current = clone(imported);
  state.renamingId = null;
  persistLibrary({ quiet: true });
  renderEditorFromPattern();
  syncTransportUi();
  ui.patternsDialog.close();
  showToast(`Imported “${imported.name}” as a new saved pattern.`);
}

function exportCurrentPattern() {
  const payload = makeExportPayload(state.current);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.current.name)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Exported “${state.current.name}” as version 1 JSON.`);
}

function openPatternLibrary() {
  state.renamingId = null;
  clearLibraryMessage();
  renderPatternLibrary();
  if (!ui.patternsDialog.open) ui.patternsDialog.showModal();
}

function applyReducedMotion(reduced, announce = false) {
  state.reducedMotion = reduced;
  ui.reducedMotionToggle.checked = reduced;
  document.body.classList.toggle("reduce-motion", reduced);
  gardenScene?.setReducedMotion(reduced);
  try {
    localStorage.setItem(REDUCED_MOTION_KEY, String(reduced));
  } catch {
    if (announce) showToast("Motion preference could not be stored for the next visit.", "error");
  }
  if (announce) {
    showToast(reduced ? "Calm motion enabled." : "Full garden motion enabled.");
  }
}

function setupEvents() {
  ui.playButton.addEventListener("click", () => {
    state.audioError = false;
    updateAudioStatus();
    audio.play();
  });
  ui.pauseButton.addEventListener("click", () => audio.pause("user"));
  ui.stopButton.addEventListener("click", () => {
    stopAndResetVisuals();
    syncTransportUi();
  });
  ui.clearButton.addEventListener("click", clearPattern);
  ui.demoButton.addEventListener("click", restoreDemo);
  ui.saveButton.addEventListener("click", () => saveCurrent());

  ui.tempoRange.addEventListener("input", (event) => setTempo(event.target.value));
  ui.tempoDown.addEventListener("click", () => setTempo(state.current.bpm - 1));
  ui.tempoUp.addEventListener("click", () => setTempo(state.current.bpm + 1));

  ui.trackRows.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (actionButton) {
      const trackIndex = Number(actionButton.dataset.track);
      toggleTrackFlag(trackIndex, actionButton.dataset.action);
      return;
    }
    const step = event.target.closest(".step-button");
    if (!step) return;
    toggleStep(Number(step.dataset.track), Number(step.dataset.step));
  });

  ui.trackRows.addEventListener("input", (event) => {
    const input = event.target.closest(".track-volume input[type='range']");
    if (!input) return;
    const trackIndex = Number(input.dataset.track);
    const volume = Math.max(0, Math.min(1, Number(input.value)));
    state.current.tracks[trackIndex].volume = volume;
    state.volumeOutputs[trackIndex].textContent = String(Math.round(volume * 100));
    input.setAttribute("aria-valuetext", `${Math.round(volume * 100)} percent`);
    updateRangeFill(input, volume);
    audio.updateMix();
    markDirty();
  });

  ui.trackRows.addEventListener("keydown", (event) => {
    const step = event.target.closest(".step-button");
    if (!step) return;
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    moveStepFocus(Number(step.dataset.track), Number(step.dataset.step), event.key);
  });

  ui.reducedMotionToggle.addEventListener("change", (event) => {
    applyReducedMotion(event.target.checked, true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    if (ui.patternsDialog.open || ui.confirmDialog.open) return;
    if (event.target.closest("button, input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    if (audio.phase === "playing") audio.pause("user");
    else {
      state.audioError = false;
      updateAudioStatus();
      audio.play();
    }
  });

  ui.patternsButton.addEventListener("click", openPatternLibrary);
  ui.closePatternsButton.addEventListener("click", () => ui.patternsDialog.close());
  ui.patternsDialog.addEventListener("click", (event) => {
    if (event.target === ui.patternsDialog) ui.patternsDialog.close();
  });

  ui.saveFromLibraryButton.addEventListener("click", () => {
    if (saveCurrent({ quiet: true })) {
      showLibraryMessage(`Saved “${state.current.name}” to this browser.`, "success");
      showToast(`Saved “${state.current.name}”.`);
    }
  });
  ui.exportButton.addEventListener("click", exportCurrentPattern);
  ui.importButton.addEventListener("click", () => ui.importInput.click());
  ui.importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    await importPatternFile(file);
    event.target.value = "";
  });

  ui.patternList.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const patternId = action.dataset.patternId;
    if (action.dataset.action === "load") loadPatternById(patternId);
    if (action.dataset.action === "rename") {
      state.renamingId = patternId;
      renderPatternLibrary();
    }
    if (action.dataset.action === "cancel-rename") {
      state.renamingId = null;
      clearLibraryMessage();
      renderPatternLibrary();
    }
    if (action.dataset.action === "delete") deletePatternById(patternId);
  });

  ui.patternList.addEventListener("submit", (event) => {
    const form = event.target.closest(".rename-form");
    if (!form) return;
    event.preventDefault();
    renamePatternById(form.dataset.patternId, form.querySelector("input").value);
  });

  ui.patternList.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !renameFormFor(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    state.renamingId = null;
    renderPatternLibrary();
  });

  ui.newPatternForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createNewPattern(ui.newPatternName.value);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && audio.phase === "playing") {
      audio.pause("background");
    }
  });

  window.addEventListener("resize", positionPlayheadOverlay, { passive: true });
  window.addEventListener("pagehide", () => audio.shutdown());
  window.addEventListener("beforeunload", () => audio.shutdown());
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    state.audioContextState = audio.ctx?.state || "idle";
    state.audioError = false;
    syncTransportUi();
  });
}

function renameFormFor(target) {
  return target?.closest?.(".rename-form");
}

function initializeScene() {
  try {
    gardenScene = new GardenScene({
      canvas: ui.sceneCanvas,
      reducedMotion: state.reducedMotion,
    });
  } catch (error) {
    console.error(error);
    ui.sceneCanvas.hidden = true;
    ui.sceneFallback.hidden = false;
  }
}

function initialize() {
  document.body.classList.toggle("reduce-motion", state.reducedMotion);
  ui.reducedMotionToggle.checked = state.reducedMotion;
  renderEditorFromPattern();
  initializeScene();
  setupEvents();
  state.audioContextState = "idle";
  updateAudioStatus();
  updateSaveState();
  syncTransportUi();

  if (loaded.fresh) {
    persistLibrary({ quiet: true });
  }
}

initialize();
