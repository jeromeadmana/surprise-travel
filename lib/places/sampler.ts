import type { Place } from './types';

export type SamplerOptions = {
  visitedIds: ReadonlySet<string>;
  noveltyMultiplier?: number;
  excludeIds?: ReadonlySet<string>;
  rng?: () => number;
};

export function sampleWithNoveltyBias<T extends Place>(
  candidates: readonly T[],
  options: SamplerOptions,
): T | null {
  const {
    visitedIds,
    noveltyMultiplier = 4,
    excludeIds,
    rng = Math.random,
  } = options;

  const pool = excludeIds
    ? candidates.filter((c) => !excludeIds.has(c.id))
    : candidates.slice();
  if (pool.length === 0) return null;

  const weights = pool.map((p) =>
    visitedIds.has(p.id) ? 1 : noveltyMultiplier,
  );
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;

  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
