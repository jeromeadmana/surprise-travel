import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '../geo/types';

export type LocationStatus = 'requesting' | 'granted' | 'denied' | 'error';

export type LocationState = {
  position: LatLng | null;
  status: LocationStatus;
  error: string | null;
};

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    position: null,
    status: 'requesting',
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState({ position: null, status: 'denied', error: null });
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setState({
          position: { lat: loc.coords.latitude, lng: loc.coords.longitude },
          status: 'granted',
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({ position: null, status: 'error', error: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
