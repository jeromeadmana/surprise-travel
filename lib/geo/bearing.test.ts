import { bearingDeg, distanceKm, isInWedge } from './bearing';
import type { CompassDirection, LatLng } from './types';

const NAGA: LatLng = { lat: 13.6218, lng: 123.1948 };

describe('distanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(distanceKm(NAGA, NAGA)).toBe(0);
  });

  it('is symmetric', () => {
    const other: LatLng = { lat: 14.0, lng: 123.5 };
    expect(distanceKm(NAGA, other)).toBeCloseTo(distanceKm(other, NAGA), 6);
  });

  it('approximates ~111km per degree of latitude', () => {
    const a: LatLng = { lat: 0, lng: 0 };
    const b: LatLng = { lat: 1, lng: 0 };
    expect(distanceKm(a, b)).toBeCloseTo(111.19, 0);
  });
});

describe('bearingDeg', () => {
  it('returns 0° due north', () => {
    expect(bearingDeg(NAGA, { lat: NAGA.lat + 0.1, lng: NAGA.lng })).toBeCloseTo(0, 1);
  });

  it('returns ~90° due east', () => {
    expect(bearingDeg(NAGA, { lat: NAGA.lat, lng: NAGA.lng + 0.1 })).toBeCloseTo(90, 1);
  });

  it('returns ~180° due south', () => {
    expect(bearingDeg(NAGA, { lat: NAGA.lat - 0.1, lng: NAGA.lng })).toBeCloseTo(180, 1);
  });

  it('returns ~270° due west', () => {
    expect(bearingDeg(NAGA, { lat: NAGA.lat, lng: NAGA.lng - 0.1 })).toBeCloseTo(270, 1);
  });

  it('always returns a value in [0, 360)', () => {
    const result = bearingDeg(NAGA, { lat: NAGA.lat - 0.1, lng: NAGA.lng - 0.1 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(360);
  });
});

describe('isInWedge', () => {
  it('returns true for any bearing when direction is ALL', () => {
    for (const b of [0, 45, 90, 135, 180, 225, 270, 315, 359.99]) {
      expect(isInWedge(b, 'ALL')).toBe(true);
    }
  });

  it('places each compass center in its own wedge', () => {
    const cases: Array<[number, CompassDirection]> = [
      [0, 'N'],
      [45, 'NE'],
      [90, 'E'],
      [135, 'SE'],
      [180, 'S'],
      [225, 'SW'],
      [270, 'W'],
      [315, 'NW'],
    ];
    for (const [bearing, dir] of cases) {
      expect(isInWedge(bearing, dir)).toBe(true);
    }
  });

  it('handles the N seam: bearings near 360° belong to N', () => {
    expect(isInWedge(337.5, 'N')).toBe(true);
    expect(isInWedge(350, 'N')).toBe(true);
    expect(isInWedge(359.99, 'N')).toBe(true);
    expect(isInWedge(0, 'N')).toBe(true);
    expect(isInWedge(22, 'N')).toBe(true);
  });

  it('boundary is half-open: 22.5° belongs to NE not N (no double counting)', () => {
    expect(isInWedge(22.5, 'N')).toBe(false);
    expect(isInWedge(22.5, 'NE')).toBe(true);
    expect(isInWedge(337.5, 'NW')).toBe(false);
    expect(isInWedge(337.5, 'N')).toBe(true);
  });

  it('rejects bearings far from the chosen direction', () => {
    expect(isInWedge(90, 'N')).toBe(false);
    expect(isInWedge(180, 'N')).toBe(false);
    expect(isInWedge(270, 'N')).toBe(false);
    expect(isInWedge(0, 'S')).toBe(false);
  });

  it('every bearing belongs to exactly one of the 8 wedges', () => {
    const dirs: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let b = 0; b < 360; b += 0.5) {
      const matches = dirs.filter((d) => isInWedge(b, d));
      expect(matches).toHaveLength(1);
    }
  });
});
