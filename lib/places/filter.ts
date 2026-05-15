import { bearingDeg, distanceKm, isInWedge } from '../geo/bearing';
import type { DirectionFilter, LatLng } from '../geo/types';
import type { Place, PlaceType } from './types';

export type FilterCriteria = {
  origin: LatLng;
  minRadiusKm: number;
  maxRadiusKm: number;
  direction: DirectionFilter;
  includedTypes: PlaceType[];
  minRating: number;
  minRatingCount: number;
};

export type RankedPlace = Place & {
  distanceKm: number;
  bearing: number;
};

export function filterPlaces(
  places: readonly Place[],
  c: FilterCriteria,
): RankedPlace[] {
  const typeSet = new Set(c.includedTypes);
  const out: RankedPlace[] = [];
  for (const p of places) {
    if (p.businessStatus !== 'OPERATIONAL') continue;
    if ((p.rating ?? 0) < c.minRating) continue;
    if ((p.ratingCount ?? 0) < c.minRatingCount) continue;
    if (!p.types.some((t) => typeSet.has(t))) continue;
    const d = distanceKm(c.origin, p.location);
    if (d < c.minRadiusKm || d > c.maxRadiusKm) continue;
    const b = bearingDeg(c.origin, p.location);
    if (!isInWedge(b, c.direction)) continue;
    out.push({ ...p, distanceKm: d, bearing: b });
  }
  return out;
}
