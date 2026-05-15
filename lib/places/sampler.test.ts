import type { Place } from './types';
import { sampleWithNoveltyBias } from './sampler';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function mkPlace(id: string): Place {
  return {
    id,
    name: id,
    location: { lat: 0, lng: 0 },
    types: ['cafe'],
    businessStatus: 'OPERATIONAL',
  };
}

describe('sampleWithNoveltyBias', () => {
  it('returns null for empty candidates', () => {
    expect(
      sampleWithNoveltyBias([], { visitedIds: new Set() }),
    ).toBeNull();
  });

  it('returns the only candidate when there is one', () => {
    const p = mkPlace('only');
    expect(
      sampleWithNoveltyBias([p], { visitedIds: new Set() }),
    ).toBe(p);
  });

  it('excludes ids passed in excludeIds', () => {
    const a = mkPlace('a');
    const b = mkPlace('b');
    const result = sampleWithNoveltyBias([a, b], {
      visitedIds: new Set(),
      excludeIds: new Set(['a']),
      rng: () => 0.0,
    });
    expect(result?.id).toBe('b');
  });

  it('returns null when every candidate is excluded', () => {
    const a = mkPlace('a');
    const b = mkPlace('b');
    expect(
      sampleWithNoveltyBias([a, b], {
        visitedIds: new Set(),
        excludeIds: new Set(['a', 'b']),
      }),
    ).toBeNull();
  });

  it('with 50/50 visited/unvisited and multiplier 4, picks unvisited ~80% of the time', () => {
    const rng = mulberry32(42);
    const candidates: Place[] = [];
    const visitedIds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const id = `p${i}`;
      candidates.push(mkPlace(id));
      if (i < 5) visitedIds.add(id);
    }

    let unvisitedHits = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const pick = sampleWithNoveltyBias(candidates, {
        visitedIds,
        noveltyMultiplier: 4,
        rng,
      });
      if (pick && !visitedIds.has(pick.id)) unvisitedHits++;
    }

    const ratio = unvisitedHits / trials;
    // Expected: 5 * 4 / (5 * 4 + 5 * 1) = 0.8
    expect(ratio).toBeGreaterThan(0.77);
    expect(ratio).toBeLessThan(0.83);
  });

  it('with multiplier 1, picks visited and unvisited at equal rates', () => {
    const rng = mulberry32(7);
    const candidates: Place[] = [];
    const visitedIds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const id = `p${i}`;
      candidates.push(mkPlace(id));
      if (i < 5) visitedIds.add(id);
    }

    let unvisitedHits = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const pick = sampleWithNoveltyBias(candidates, {
        visitedIds,
        noveltyMultiplier: 1,
        rng,
      });
      if (pick && !visitedIds.has(pick.id)) unvisitedHits++;
    }

    expect(unvisitedHits / trials).toBeGreaterThan(0.46);
    expect(unvisitedHits / trials).toBeLessThan(0.54);
  });

  it('is deterministic given the same seeded rng', () => {
    const candidates = [mkPlace('a'), mkPlace('b'), mkPlace('c')];
    const visitedIds = new Set<string>(['a']);
    const seq1: string[] = [];
    const seq2: string[] = [];
    const rng1 = mulberry32(123);
    const rng2 = mulberry32(123);
    for (let i = 0; i < 20; i++) {
      seq1.push(
        sampleWithNoveltyBias(candidates, { visitedIds, rng: rng1 })!.id,
      );
      seq2.push(
        sampleWithNoveltyBias(candidates, { visitedIds, rng: rng2 })!.id,
      );
    }
    expect(seq1).toEqual(seq2);
  });
});
