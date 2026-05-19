import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import {
  type PlaceRef,
  recordSave as fsRecordSave,
  recordVisit as fsRecordVisit,
  removeSave as fsRemoveSave,
  removeVisit as fsRemoveVisit,
  subscribeToKnownPlaces,
} from '../storage/firestore';
import type { KnownPlace } from '../storage/types';

export type UseKnownPlacesResult = {
  all: KnownPlace[];
  visited: KnownPlace[];
  saved: KnownPlace[];
  visitedIds: Set<string>;
  savedIds: Set<string>;
  knownIds: Set<string>;
  loaded: boolean;
  recordVisit: (place: PlaceRef) => Promise<void>;
  removeVisit: (placeId: string) => Promise<void>;
  recordSave: (place: PlaceRef) => Promise<void>;
  removeSave: (placeId: string) => Promise<void>;
};

const NOOP = async () => {};

export function useKnownPlaces(): UseKnownPlacesResult {
  const { uid } = useAuth();
  const [all, setAll] = useState<KnownPlace[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeToKnownPlaces(uid, (places) => {
      setAll(places);
      setLoaded(true);
    });
  }, [uid]);

  const { visited, saved, visitedIds, savedIds, knownIds } = useMemo(() => {
    const v: KnownPlace[] = [];
    const s: KnownPlace[] = [];
    const vIds = new Set<string>();
    const sIds = new Set<string>();
    for (const p of all) {
      if (p.visitedAt) {
        v.push(p);
        vIds.add(p.placeId);
      }
      if (p.savedAt) {
        s.push(p);
        sIds.add(p.placeId);
      }
    }
    v.sort((a, b) => (b.visitedAt ?? 0) - (a.visitedAt ?? 0));
    s.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    const k = new Set<string>([...vIds, ...sIds]);
    return { visited: v, saved: s, visitedIds: vIds, savedIds: sIds, knownIds: k };
  }, [all]);

  const recordVisit = useCallback(
    (place: PlaceRef) => (uid ? fsRecordVisit(uid, place) : NOOP()),
    [uid],
  );
  const removeVisit = useCallback(
    (placeId: string) => (uid ? fsRemoveVisit(uid, placeId) : NOOP()),
    [uid],
  );
  const recordSave = useCallback(
    (place: PlaceRef) => (uid ? fsRecordSave(uid, place) : NOOP()),
    [uid],
  );
  const removeSave = useCallback(
    (placeId: string) => (uid ? fsRemoveSave(uid, placeId) : NOOP()),
    [uid],
  );

  return {
    all,
    visited,
    saved,
    visitedIds,
    savedIds,
    knownIds,
    loaded,
    recordVisit,
    removeVisit,
    recordSave,
    removeSave,
  };
}
