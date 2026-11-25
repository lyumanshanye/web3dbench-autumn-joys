export const STEP_COUNT = 16;
export const TRACK_COUNT = 4;
export const MAX_PATTERNS = 12;
export const STORAGE_KEY = "loopGarden.library.v1";

export const TRACK_DEFS = [
  { name: "Moss Drums", color: "#e5764d" },
  { name: "Root Bass", color: "#d5a63c" },
  { name: "Leaf Keys", color: "#4aa9a5" },
  { name: "Petal Bells", color: "#cf82a9" },
];

const PATTERN_FORMAT = "loop-garden-pattern";
const PATTERN_VERSION = 1;

const stepsFrom = (...indexes) => {
  const steps = Array(STEP_COUNT).fill(false);
  indexes.forEach((index) => {
    steps[index] = true;
  });
  return steps;
};

const makeTracks = (patterns, volumes = [0.86, 0.8, 0.72, 0.62]) =>
  TRACK_DEFS.map((track, index) => ({
    name: track.name,
    volume: volumes[index],
    muted: false,
    solo: false,
    steps: stepsFrom(...patterns[index]),
  }));

export const DEMO_PATTERN = {
  name: "Morning Dew",
  bpm: 104,
  stepCount: STEP_COUNT,
  tracks: makeTracks([
    [0, 2, 4, 6, 8, 10, 12, 14],
    [0, 3, 6, 8, 11, 14],
    [0, 4, 7, 10, 12, 15],
    [2, 5, 9, 13, 15],
  ]),
};

const SEED_PATTERNS = [
  {
    id: "seed-morning-dew",
    ...clone(DEMO_PATTERN),
    updatedAt: 1735689600000,
  },
  {
    id: "seed-moonlit-moss",
    name: "Moonlit Moss",
    bpm: 86,
    stepCount: STEP_COUNT,
    tracks: makeTracks(
      [
        [0, 4, 8, 12],
        [0, 6, 8, 14],
        [2, 7, 10],
        [1, 5, 9, 11, 15],
      ],
      [0.72, 0.84, 0.58, 0.7],
    ),
    updatedAt: 1735689600000,
  },
  {
    id: "seed-petal-parade",
    name: "Petal Parade",
    bpm: 124,
    stepCount: STEP_COUNT,
    tracks: makeTracks(
      [
        [0, 2, 4, 6, 8, 10, 12, 14, 15],
        [0, 2, 5, 7, 8, 10, 13, 15],
        [0, 3, 4, 7, 8, 11, 12, 15],
        [1, 5, 6, 9, 13, 14],
      ],
      [0.82, 0.76, 0.68, 0.74],
    ),
    updatedAt: 1735689600000,
  },
];

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pattern-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function contentKey(pattern) {
  return JSON.stringify({
    name: pattern.name,
    bpm: pattern.bpm,
    stepCount: pattern.stepCount,
    tracks: pattern.tracks.map((track) => ({
      name: track.name,
      volume: track.volume,
      muted: track.muted,
      solo: track.solo,
      steps: track.steps,
    })),
  });
}

export function makeBlankPattern(name, source = DEMO_PATTERN) {
  return {
    id: makeId(),
    name,
    bpm: source.bpm,
    stepCount: STEP_COUNT,
    tracks: source.tracks.map((track) => ({
      name: track.name,
      volume: track.volume,
      muted: false,
      solo: false,
      steps: Array(STEP_COUNT).fill(false),
    })),
    updatedAt: Date.now(),
  };
}

export function createSeedLibrary() {
  return {
    version: 1,
    activePatternId: SEED_PATTERNS[0].id,
    patterns: clone(SEED_PATTERNS),
  };
}

function validateTracks(tracks) {
  if (!Array.isArray(tracks)) {
    return "The pattern needs a tracks array.";
  }
  if (tracks.length !== TRACK_COUNT) {
    return `Expected ${TRACK_COUNT} tracks, found ${tracks.length}.`;
  }

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
    const track = tracks[trackIndex];
    const label = `Track ${trackIndex + 1}`;
    if (!track || typeof track !== "object" || Array.isArray(track)) {
      return `${label} must be an object.`;
    }
    if (typeof track.name !== "string" || track.name.trim().length === 0) {
      return `${label} needs a name.`;
    }
    if (track.name.trim().length > 40) {
      return `${label} name must be 40 characters or fewer.`;
    }
    if (
      typeof track.volume !== "number" ||
      !Number.isFinite(track.volume) ||
      track.volume < 0 ||
      track.volume > 1
    ) {
      return `${label} volume must be a number from 0 to 1.`;
    }
    if (typeof track.muted !== "boolean") {
      return `${label} muted must be true or false.`;
    }
    if (typeof track.solo !== "boolean") {
      return `${label} solo must be true or false.`;
    }
    if (!Array.isArray(track.steps)) {
      return `${label} needs a steps array.`;
    }
    if (track.steps.length !== STEP_COUNT) {
      return `${label} has ${track.steps.length} steps; exactly ${STEP_COUNT} are required.`;
    }
    for (let stepIndex = 0; stepIndex < track.steps.length; stepIndex += 1) {
      if (typeof track.steps[stepIndex] !== "boolean") {
        return `${label}, step ${stepIndex + 1} must be true or false.`;
      }
    }
  }

  return null;
}

export function validatePatternObject(pattern) {
  if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) {
    return "The pattern field must be an object.";
  }
  if (typeof pattern.name !== "string" || pattern.name.trim().length === 0) {
    return "The pattern needs a name.";
  }
  if (pattern.name.trim().length > 40) {
    return "The pattern name must be 40 characters or fewer.";
  }
  if (
    typeof pattern.bpm !== "number" ||
    !Number.isFinite(pattern.bpm) ||
    !Number.isInteger(pattern.bpm) ||
    pattern.bpm < 50 ||
    pattern.bpm > 200
  ) {
    return "Tempo must be a whole number from 50 to 200 BPM.";
  }
  if (pattern.stepCount !== STEP_COUNT) {
    return `This pattern has ${String(pattern.stepCount)} steps; Loop Garden requires ${STEP_COUNT}.`;
  }
  return validateTracks(pattern.tracks);
}

export function normalizePattern(pattern) {
  return {
    id: pattern.id || makeId(),
    name: pattern.name.trim(),
    bpm: pattern.bpm,
    stepCount: STEP_COUNT,
    tracks: pattern.tracks.map((track) => ({
      name: track.name.trim(),
      volume: track.volume,
      muted: track.muted,
      solo: track.solo,
      steps: [...track.steps],
    })),
    updatedAt: typeof pattern.updatedAt === "number" ? pattern.updatedAt : Date.now(),
  };
}

export function parseImportPayload(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "The JSON root must be an object." };
  }
  if (payload.format !== PATTERN_FORMAT) {
    return { ok: false, error: `Expected format \"${PATTERN_FORMAT}\".` };
  }
  if (payload.version !== PATTERN_VERSION) {
    return {
      ok: false,
      error: `Unsupported version ${String(payload.version)}. This app reads version ${PATTERN_VERSION}.`,
    };
  }

  const error = validatePatternObject(payload.pattern);
  if (error) return { ok: false, error };

  return {
    ok: true,
    pattern: normalizePattern({ ...payload.pattern, id: makeId(), updatedAt: Date.now() }),
  };
}

export function makeExportPayload(pattern) {
  return {
    format: PATTERN_FORMAT,
    version: PATTERN_VERSION,
    exportedAt: new Date().toISOString(),
    pattern: {
      name: pattern.name,
      bpm: pattern.bpm,
      stepCount: STEP_COUNT,
      tracks: pattern.tracks.map((track) => ({
        name: track.name,
        volume: track.volume,
        muted: track.muted,
        solo: track.solo,
        steps: [...track.steps],
      })),
    },
  };
}

export function readLibrary(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { library: createSeedLibrary(), fresh: true };

    const stored = JSON.parse(raw);
    if (
      !stored ||
      stored.version !== 1 ||
      !Array.isArray(stored.patterns) ||
      stored.patterns.length === 0 ||
      stored.patterns.some((pattern) => Boolean(validatePatternObject(pattern)))
    ) {
      return { library: createSeedLibrary(), fresh: true };
    }

    const patterns = stored.patterns.slice(0, MAX_PATTERNS).map(normalizePattern);
    const activePatternId = patterns.some((pattern) => pattern.id === stored.activePatternId)
      ? stored.activePatternId
      : patterns[0].id;
    return { library: { version: 1, activePatternId, patterns }, fresh: false };
  } catch {
    return { library: createSeedLibrary(), fresh: true };
  }
}

export function writeLibrary(library, storage = globalThis.localStorage) {
  const payload = {
    version: 1,
    activePatternId: library.activePatternId,
    patterns: library.patterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      bpm: pattern.bpm,
      stepCount: STEP_COUNT,
      tracks: pattern.tracks,
      updatedAt: pattern.updatedAt,
    })),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "loop-garden-pattern"
  );
}
