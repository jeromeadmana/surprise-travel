import type { LatLng } from '../geo/types';
import { filterPlaces, type FilterCriteria } from './filter';
import type { Place } from './types';

const NAGA: LatLng = { lat: 13.6218, lng: 123.1948 };

const basePlace: Omit<Place, 'id' | 'location'> = {
  name: 'Test',
  types: ['cafe'],
  rating: 4.5,
  ratingCount: 100,
  businessStatus: 'OPERATIONAL',
};

const baseCriteria: FilterCriteria = {
  origin: NAGA,
  minRadiusKm: 10,
  maxRadiusKm: 60,
  direction: 'ALL',
  includedTypes: ['cafe', 'restaurant'],
  minRating: 4.0,
  minRatingCount: 10,
};

function placeAt(id: string, lat: number, lng: number, overrides: Partial<Place> = {}): Place {
  return { ...basePlace, id, location: { lat, lng }, ...overrides };
}

describe('filterPlaces', () => {
  it('keeps a place that satisfies every criterion', () => {
    const p = placeAt('a', NAGA.lat + 0.2, NAGA.lng); // ~22 km north
    const result = filterPlaces([p], baseCriteria);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].distanceKm).toBeGreaterThan(10);
    expect(result[0].distanceKm).toBeLessThan(60);
  });

  it('rejects places closer than minRadiusKm', () => {
    const p = placeAt('too-close', NAGA.lat + 0.01, NAGA.lng); // ~1.1 km
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('rejects places farther than maxRadiusKm', () => {
    const p = placeAt('too-far', NAGA.lat + 1.0, NAGA.lng); // ~111 km
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('rejects places with no matching type', () => {
    const p = placeAt('wrong-type', NAGA.lat + 0.2, NAGA.lng, { types: ['bar'] });
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('rejects places below minRating', () => {
    const p = placeAt('low-rating', NAGA.lat + 0.2, NAGA.lng, { rating: 3.5 });
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('rejects places below minRatingCount', () => {
    const p = placeAt('few-reviews', NAGA.lat + 0.2, NAGA.lng, { ratingCount: 5 });
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('rejects places that are not OPERATIONAL', () => {
    const closed = placeAt('closed-perm', NAGA.lat + 0.2, NAGA.lng, {
      businessStatus: 'CLOSED_PERMANENTLY',
    });
    const temp = placeAt('closed-temp', NAGA.lat + 0.2, NAGA.lng, {
      businessStatus: 'CLOSED_TEMPORARILY',
    });
    expect(filterPlaces([closed, temp], baseCriteria)).toHaveLength(0);
  });

  it('rejects places outside the direction wedge', () => {
    const south = placeAt('south', NAGA.lat - 0.2, NAGA.lng);
    const north = placeAt('north', NAGA.lat + 0.2, NAGA.lng);
    const result = filterPlaces([south, north], { ...baseCriteria, direction: 'N' });
    expect(result.map((p) => p.id)).toEqual(['north']);
  });

  it('accepts undefined rating/ratingCount as zero (so they fail thresholds)', () => {
    const p = placeAt('no-rating', NAGA.lat + 0.2, NAGA.lng, {
      rating: undefined,
      ratingCount: undefined,
    });
    expect(filterPlaces([p], baseCriteria)).toHaveLength(0);
  });

  it('returns ranked places with distance and bearing populated', () => {
    const p = placeAt('a', NAGA.lat + 0.2, NAGA.lng);
    const [result] = filterPlaces([p], baseCriteria);
    expect(typeof result.distanceKm).toBe('number');
    expect(typeof result.bearing).toBe('number');
    expect(result.bearing).toBeCloseTo(0, 1);
  });
});
