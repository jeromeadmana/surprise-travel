import { useCallback, useState } from 'react';

import type { LatLng } from '../geo/types';
import { filterPlaces, type RankedPlace } from '../places/filter';
import { getPlacesClient } from '../places/google';
import { sampleWithNoveltyBias } from '../places/sampler';
import type { Settings } from '../storage/types';

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
        const home = settings.homeLocation ?? origin;
        const radiusMeters = Math.max(1, settings.maxRadiusKm) * 1000;
        const client = getPlacesClient();
        const raw = await client.searchNearby({
          center: home,
          radiusMeters,
          includedTypes: settings.includedTypes,
        });
        const candidates = filterPlaces(raw, {
          origin: home,
          minRadiusKm: settings.minRadiusKm,
          maxRadiusKm: settings.maxRadiusKm,
          direction: settings.direction,
          includedTypes: settings.includedTypes,
          minRating: settings.minRating,
          minRatingCount: settings.minRatingCount,
        });
        if (candidates.length === 0) {
          setState({ kind: 'empty' });
          return;
        }
        const picked = sampleWithNoveltyBias(candidates, {
          visitedIds: new Set(),
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
    [origin, settings],
  );

  const surprise = useCallback(() => roll(), [roll]);
  const again = useCallback(() => {
    if (state.kind === 'success') return roll(state.place.id);
    return roll();
  }, [roll, state]);
  const dismiss = useCallback(() => setState({ kind: 'idle' }), []);

  return { state, surprise, again, dismiss };
}
