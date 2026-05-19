const ROAD_CIRCUITY = 1.4;
const AVG_KMH = 40;
const MIN_MINUTES = 5;

export function estimateDriveMinutes(distanceKm: number): number {
  const raw = (distanceKm * ROAD_CIRCUITY * 60) / AVG_KMH;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(MIN_MINUTES, rounded);
}
