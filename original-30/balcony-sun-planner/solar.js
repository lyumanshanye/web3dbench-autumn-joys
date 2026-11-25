const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export const SAMPLE_LOCATIONS = [
  { id: 'dubai', label: 'Dubai, UAE', latitude: 25.2048, longitude: 55.2708, utcOffset: 4 },
  { id: 'barcelona', label: 'Barcelona, Spain', latitude: 41.3874, longitude: 2.1686, utcOffset: 1 },
  { id: 'new-york', label: 'New York, USA', latitude: 40.7128, longitude: -74.006, utcOffset: -5 },
  { id: 'sydney', label: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093, utcOffset: 10 },
  { id: 'cape-town', label: 'Cape Town, South Africa', latitude: -33.9249, longitude: 18.4241, utcOffset: 2 },
  { id: 'reykjavik', label: 'Reykjavík, Iceland', latitude: 64.1466, longitude: -21.9426, utcOffset: 0 },
];

const COMPASS_NAMES = [
  'North',
  'North-east',
  'East',
  'South-east',
  'South',
  'South-west',
  'West',
  'North-west',
];

export function dayOfYear(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function getSolarDay(location, dateString) {
  const n = dayOfYear(dateString);
  const latitude = location.latitude * DEG;
  const declination = 23.44 * Math.sin((2 * Math.PI * (284 + n)) / 365) * DEG;
  const b = (2 * Math.PI * (n - 81)) / 364;
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const longitudeCorrection = 4 * (location.longitude - 15 * location.utcOffset);
  const solarNoon = 720 - equationOfTime - longitudeCorrection;
  const cosHourAngle = -Math.tan(latitude) * Math.tan(declination);
  const polarDay = cosHourAngle <= -1;
  const polarNight = cosHourAngle >= 1;
  const hourAngle = polarDay || polarNight ? Math.PI : Math.acos(Math.max(-1, Math.min(1, cosHourAngle)));
  const dayHalfLength = (hourAngle * RAD) * 4;

  return {
    dayOfYear: n,
    declination,
    equationOfTime,
    solarNoon,
    sunrise: polarDay ? 0 : polarNight ? 720 : solarNoon - dayHalfLength,
    sunset: polarDay ? 1440 : polarNight ? 720 : solarNoon + dayHalfLength,
    dayLength: polarDay ? 1440 : polarNight ? 0 : dayHalfLength * 2,
    polarDay,
    polarNight,
  };
}

export function getSolarPosition(location, dateString, minutes) {
  const day = getSolarDay(location, dateString);
  const latitude = location.latitude * DEG;
  const longitudeCorrection = 4 * (location.longitude - 15 * location.utcOffset);
  const hourAngle = (minutes + day.equationOfTime + longitudeCorrection - 720) * 0.25 * DEG;
  const sinAltitude =
    Math.sin(latitude) * Math.sin(day.declination) +
    Math.cos(latitude) * Math.cos(day.declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  let azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(day.declination) * Math.cos(latitude),
  );
  if (azimuthFromSouth < 0) azimuthFromSouth += Math.PI * 2;

  const azimuth = (azimuthFromSouth * RAD + 180) % 360;
  const altitudeDegrees = altitude * RAD;
  const azimuthRadians = azimuth * DEG;
  const horizontal = Math.cos(altitude);

  return {
    ...day,
    altitude: altitudeDegrees,
    azimuth,
    worldDirection: {
      x: Math.sin(azimuthRadians) * horizontal,
      y: Math.sin(altitude),
      z: -Math.cos(azimuthRadians) * horizontal,
    },
  };
}

export function directionInBalconySpace(worldDirection, orientation) {
  const angle = orientation * DEG;
  const rightX = Math.cos(angle);
  const rightZ = Math.sin(angle);
  const outwardX = Math.sin(angle);
  const outwardZ = -Math.cos(angle);

  return {
    x: worldDirection.x * rightX + worldDirection.z * rightZ,
    y: worldDirection.y,
    z: worldDirection.x * outwardX + worldDirection.z * outwardZ,
  };
}

export function compassName(degrees) {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return COMPASS_NAMES[index];
}

export function formatClock(minutes, withSuffix = true) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours24 = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const core = `${hours12}:${String(mins).padStart(2, '0')}`;
  return withSuffix ? `${core} ${suffix}` : core;
}
