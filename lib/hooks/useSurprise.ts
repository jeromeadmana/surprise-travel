import { useCallback, useState } from 'react';

import { destination, randomBearingInWedge } from '../geo/bearing';
import type { LatLng } from '../geo/types';
import { filterPlaces, type RankedPlace } from '../places/filter';
import { getPlacesClient } from '../places/google';
import { sampleWithNoveltyBias } from '../places/sampler';
import type { Settings } from '../storage/types';
import { useKnownPlaces } from './useKnownPlaces';

const JITTER_SEARCH_RADIUS_KM = 20;

export type SurpriseState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; place: RankedPlace }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export type UseSurpriseArgs = {
  origin: LatLng | null;
  settings: Settings;
};

export function useSurprise({ origin, settings }: UseSurpriseArgs) {
  const [state, setState] = useState<SurpriseState>({ kind: 'idle' });
  const { knownIds } = useKnownPlaces();
  const {
    homeLocation,
    direction,
    minRadiusKm,
    maxRadiusKm,
    includedTypes,
    minRating,
    minRatingCount,
  } = settings;

  const roll = useCallback(
    async (excludeId?: string) => {
      if (!origin) {
        setState({
          kind: 'error',
          message: 'No location yet — try again in a moment.',
        });
        return;
      }
      setState({ kind: 'loading' });
      try {
        const home = homeLocation ?? origin;
        const bearing = randomBearingInWedge(direction);
        const jitterDistance =
          minRadiusKm + Math.random() * Math.max(0, maxRadiusKm - minRadiusKm);
        const searchCenter = destination(home, bearing, jitterDistance);
        const radiusMeters = JITTER_SEARCH_RADIUS_KM * 1000;
        const client = getPlacesClient();
        const raw = await client.searchNearby({
          center: searchCenter,
          radiusMeters,
          includedTypes,
        });
        const candidates = filterPlaces(raw, {
          origin: home,
          minRadiusKm,
          maxRadiusKm,
          direction,
          includedTypes,
          minRating,
          minRatingCount,
        });
        if (candidates.length === 0) {
          setState({ kind: 'empty' });
          return;
        }
        const picked = sampleWithNoveltyBias(candidates, {
          visitedIds: knownIds,
          excludeIds: excludeId ? new Set([excludeId]) : undefined,
        });
        if (!picked) {
          setState({ kind: 'empty' });
          return;
        }
        setState({ kind: 'success', place: picked });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState({ kind: 'error', message: msg });
      }
    },
    [
      origin,
      homeLocation,
      direction,
      minRadiusKm,
      maxRadiusKm,
      includedTypes,
      minRating,
      minRatingCount,
      knownIds,
    ],
  );

  const surprise = useCallback(() => roll(), [roll]);
  const again = useCallback(() => {
    if (state.kind === 'success') return roll(state.place.id);
    return roll();
  }, [roll, state]);
  const dismiss = useCallback(() => setState({ kind: 'idle' }), []);

  return { state, surprise, again, dismiss };
}
