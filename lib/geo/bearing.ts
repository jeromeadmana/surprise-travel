import type { Bearing, CompassDirection, DirectionFilter, LatLng } from './types';

const EARTH_RADIUS_KM = 6371;
const WEDGE_HALF_WIDTH = 22.5;

const COMPASS_CENTERS: Record<CompassDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function bearingDeg(from: LatLng, to: LatLng): Bearing {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const raw = toDegrees(Math.atan2(y, x));
  return (raw + 360) % 360;
}

// Destination point given a starting point, initial bearing (degrees),
// and great-circle distance (km).
export function destination(
  start: LatLng,
  bearing: Bearing,
  distanceKm: number,
): LatLng {
  const dR = distanceKm / EARTH_RADIUS_KM;
  const lat1 = toRadians(start.lat);
  const lng1 = toRadians(start.lng);
  const bRad = toRadians(bearing);
  const sinLat2 =
    Math.sin(lat1) * Math.cos(dR) +
    Math.cos(lat1) * Math.sin(dR) * Math.cos(bRad);
  const lat2 = Math.asin(sinLat2);
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bRad) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * sinLat2,
    );
  const lngDeg = ((toDegrees(lng2) + 540) % 360) - 180;
  return { lat: toDegrees(lat2), lng: lngDeg };
}

// Half-open wedge [center - 22.5°, center + 22.5°) so every bearing
// belongs to exactly one of the 8 compass directions.
export function isInWedge(
  bearing: Bearing,
  direction: DirectionFilter,
): boolean {
  if (direction === 'ALL') return true;
  const center = COMPASS_CENTERS[direction];
  let delta = bearing - center;
  while (delta > 180) delta -= 360;
  while (delta <= -180) delta += 360;
  return delta >= -WEDGE_HALF_WIDTH && delta < WEDGE_HALF_WIDTH;
}

export function randomBearingInWedge(
  direction: DirectionFilter,
  rng: () => number = Math.random,
): Bearing {
  if (direction === 'ALL') return rng() * 360;
  const center = COMPASS_CENTERS[direction];
  const offset = (rng() - 0.5) * (WEDGE_HALF_WIDTH * 2);
  return (center + offset + 360) % 360;
}
