const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const DATASET_START = new Date(Date.UTC(2025, 10, 3, 0, 0, 0));
export const DATASET_DAYS = 7;
export const INTERVAL_HOURS = 24;
export const TIMEZONE = "UTC";

export const INTERVALS = Array.from({ length: DATASET_DAYS * INTERVAL_HOURS }, (_, index) => {
  const date = new Date(DATASET_START.getTime() + index * HOUR_MS);
  return {
    index,
    timestamp: date.toISOString(),
    dayIndex: Math.floor(index / 24),
    dayOfWeek: date.getUTCDay(),
    hour: date.getUTCHours(),
  };
});

export const DATASET_END = new Date(INTERVALS[INTERVALS.length - 1].timestamp);

const ROOM_DEFINITIONS = [
  {
    id: "f1-reception",
    name: "Reception",
    shortName: "Reception",
    floor: 1,
    area: 42,
    profile: "reception",
    description: "Front-of-house lighting and comfort loads",
  },
  {
    id: "f1-studio",
    name: "Creative Studio",
    shortName: "Studio",
    floor: 1,
    area: 68,
    profile: "studio",
    description: "Production desks, monitors and ventilation",
  },
  {
    id: "f1-cafe",
    name: "Cafe + Bar",
    shortName: "Cafe",
    floor: 1,
    area: 34,
    profile: "cafe",
    description: "Kitchen equipment and dining-area loads",
  },
  {
    id: "f1-it-storage",
    name: "IT Store",
    shortName: "IT Store",
    floor: 1,
    area: 14,
    profile: "it-storage",
    description: "Network rack and standby equipment",
  },
  {
    id: "f2-meeting-a",
    name: "Meeting Room A",
    shortName: "Meeting A",
    floor: 2,
    area: 26,
    profile: "meeting-a",
    description: "Bookable meeting room with display and AV",
  },
  {
    id: "f2-meeting-b",
    name: "Meeting Room B",
    shortName: "Meeting B",
    floor: 2,
    area: 22,
    profile: "meeting-b",
    description: "Small meeting room with video conferencing",
  },
  {
    id: "f2-open-office",
    name: "Open Office",
    shortName: "Open Office",
    floor: 2,
    area: 96,
    profile: "open-office",
    description: "Main workstation floor and task lighting",
  },
  {
    id: "f2-finance",
    name: "Finance Office",
    shortName: "Finance",
    floor: 2,
    area: 54,
    profile: "finance",
    description: "Workstations, printer and local cooling",
  },
  {
    id: "f3-design-lab",
    name: "Design Lab",
    shortName: "Design Lab",
    floor: 3,
    area: 72,
    profile: "design-lab",
    description: "Workstations and high-resolution displays",
  },
  {
    id: "f3-meeting-c",
    name: "Meeting Room C",
    shortName: "Meeting C",
    floor: 3,
    area: 24,
    profile: "meeting-c",
    description: "Workshop space with flexible AV",
  },
  {
    id: "f3-server",
    name: "Server Room",
    shortName: "Server",
    floor: 3,
    area: 18,
    profile: "server",
    description: "Compute rack and dedicated cooling",
  },
  {
    id: "f3-quiet-office",
    name: "Quiet Office",
    shortName: "Quiet Office",
    floor: 3,
    area: 48,
    profile: "quiet-office",
    description: "Focus rooms and a shared print corner",
  },
];

function hash01(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function jitter(roomId, hourIndex, spread = 0.12) {
  const seed = roomId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + hourIndex * 37;
  return 1 - spread + hash01(seed) * spread * 2;
}

function bell(hour, center, width) {
  return Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
}

function isWeekday(dayOfWeek) {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function meetingSchedule(roomId, dayIndex, hour) {
  const schedules = {
    "f2-meeting-a": [
      [9, 10, 14],
      [10, 11, 15],
      [9, 10, 11, 14],
      [10, 11, 15, 16],
      [9, 10],
    ],
    "f2-meeting-b": [
      [11, 12, 15],
      [9, 10, 16],
      [10, 11],
      [9, 10, 14, 15],
      [11, 12],
    ],
    "f3-meeting-c": [
      [10, 11, 14, 15],
      [13, 14],
      [9, 10, 15],
      [10, 11, 13],
      [14, 15],
    ],
  };
  return schedules[roomId]?.[dayIndex % 5]?.includes(hour) ?? false;
}

function baseLoad(profile, interval, roomId) {
  const { hour, dayOfWeek, dayIndex, index } = interval;
  const weekday = isWeekday(dayOfWeek);
  const noise = jitter(roomId, index);
  let kwh = 0.08;

  switch (profile) {
    case "reception":
      kwh = weekday && hour >= 6 && hour < 20
        ? 0.9 + bell(hour, 9, 3.5) * 0.75 + bell(hour, 15, 2.2) * 0.35
        : 0.2 + (weekday && hour < 22 ? 0.08 : 0);
      break;
    case "studio":
      kwh = weekday && hour >= 8 && hour < 19
        ? 1.55 + bell(hour, 10.5, 2.2) * 0.8 + bell(hour, 16, 1.6) * 0.45
        : 0.15;
      break;
    case "cafe":
      kwh = weekday && hour >= 6 && hour < 16
        ? 1.4 + bell(hour, 8, 1.2) * 1.25 + bell(hour, 12.5, 1.5) * 0.95
        : weekday && hour >= 16 && hour < 19
          ? 0.48
          : 0.2;
      break;
    case "it-storage":
      kwh = 0.55 + Math.sin(((hour - 2) / 24) * Math.PI * 2) * 0.06;
      break;
    case "meeting-a":
      kwh = weekday && meetingSchedule(roomId, dayIndex, hour)
        ? 1.2 + bell(hour, 10, 2.8) * 1.05
        : 0.1;
      break;
    case "meeting-b":
      kwh = weekday && meetingSchedule(roomId, dayIndex, hour)
        ? 0.85 + bell(hour, 11, 2.5) * 0.75
        : 0.08;
      break;
    case "open-office":
      kwh = weekday && hour >= 7 && hour < 19
        ? 2.5 + bell(hour, 10.5, 3.6) * 1.15 + bell(hour, 15.5, 2.2) * 0.55
        : weekday && hour >= 19 && hour < 21
          ? 0.65
          : 0.24;
      break;
    case "finance": {
      const anomaly = dayIndex === 3 && hour >= 2 && hour <= 4;
      if (anomaly) {
        kwh = [6.7, 7.55, 6.95][hour - 2];
      } else {
        kwh = weekday && hour >= 8 && hour < 18
          ? 0.88 + bell(hour, 11, 3.5) * 0.5 + bell(hour, 15.5, 2.1) * 0.38
          : 0.15;
      }
      break;
    }
    case "design-lab":
      kwh = weekday && hour >= 9 && hour < 18
        ? 1.7 + bell(hour, 11, 2.4) * 0.75 + bell(hour, 15.5, 1.8) * 0.5
        : 0.14;
      break;
    case "meeting-c":
      kwh = weekday && meetingSchedule(roomId, dayIndex, hour)
        ? 0.74 + bell(hour, 12, 2.8) * 0.55
        : 0.07;
      break;
    case "server":
      kwh = 4.8 + Math.sin(((hour - 4) / 24) * Math.PI * 2) * 0.32 + bell(hour, 14, 4.5) * 0.45;
      break;
    case "quiet-office":
      kwh = weekday && hour >= 8 && hour < 18
        ? 1.0 + bell(hour, 11, 3) * 0.42 + bell(hour, 15.5, 1.7) * 0.28
        : 0.12;
      break;
    default:
      kwh = 0.2;
  }

  return Number(Math.max(0, kwh * noise).toFixed(3));
}

function isMissing(roomId, interval) {
  return roomId === "f3-quiet-office" && interval.dayIndex === 3 && interval.hour >= 12 && interval.hour <= 14;
}

export const ROOMS = ROOM_DEFINITIONS.map((room) => ({
  ...room,
  readings: INTERVALS.map((interval) => ({
    timestamp: interval.timestamp,
    kwh: isMissing(room.id, interval) ? null : Math.max(0, Number(baseLoad(room.profile, interval, room.id))),
  })),
}));

export const SAMPLE_DATA = {
  label: "Sample data",
  name: "Northstar sample office",
  description: "Deterministic synthetic energy data for a three-floor office. Not connected to a building-management service.",
  start: DATASET_START.toISOString(),
  end: DATASET_END.toISOString(),
  timezone: TIMEZONE,
  intervalMinutes: 60,
  intervalCount: INTERVALS.length,
  rooms: ROOMS,
};

export const FLOOR_LABELS = {
  1: "Ground floor",
  2: "Second floor",
  3: "Third floor",
};

export function readingsInRange(room, startIndex, endIndex) {
  return room.readings.slice(startIndex, endIndex + 1);
}

export function summarizeRoom(room, startIndex, endIndex) {
  const readings = readingsInRange(room, startIndex, endIndex);
  const available = readings.filter((reading) => reading.kwh !== null);
  const missing = readings.length - available.length;
  const total = available.reduce((sum, reading) => sum + reading.kwh, 0);
  const peak = available.reduce(
    (result, reading) => {
      if (!result || reading.kwh > result.kwh) {
        return reading;
      }
      return result;
    },
    null,
  );

  return {
    room,
    readings,
    total,
    intensity: room.area > 0 ? total / room.area : 0,
    average: available.length ? total / available.length : 0,
    available: available.length,
    expected: readings.length,
    missing,
    completeness: readings.length ? available.length / readings.length : 0,
    partial: missing > 0,
    peak,
  };
}
