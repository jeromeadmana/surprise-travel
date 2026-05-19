import { getApp } from '@react-native-firebase/app';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';

import type { LatLng } from '../geo/types';
import type { KnownPlace, Settings } from './types';

const SETTINGS_DOC_ID = 'current';

function settingsDocRef(uid: string) {
  return doc(
    getFirestore(getApp()),
    'users',
    uid,
    'settings',
    SETTINGS_DOC_ID,
  );
}

export function subscribeToSettings(
  uid: string,
  callback: (settings: Settings | null) => void,
): () => void {
  return onSnapshot(settingsDocRef(uid), (snap) => {
    const data = snap.data();
    callback((data as Settings | undefined) ?? null);
  });
}

export async function saveSettings(
  uid: string,
  settings: Settings,
): Promise<void> {
  await setDoc(settingsDocRef(uid), settings, { merge: true });
}

const PLACES_COLLECTION = 'places';

function placesCollectionRef(uid: string) {
  return collection(getFirestore(getApp()), 'users', uid, PLACES_COLLECTION);
}

function placeDocRef(uid: string, placeId: string) {
  return doc(
    getFirestore(getApp()),
    'users',
    uid,
    PLACES_COLLECTION,
    placeId,
  );
}

export type PlaceRef = {
  placeId: string;
  name: string;
  location: LatLng;
};

export function subscribeToKnownPlaces(
  uid: string,
  callback: (places: KnownPlace[]) => void,
): () => void {
  return onSnapshot(placesCollectionRef(uid), (snap) => {
    const places: KnownPlace[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data) places.push(data as KnownPlace);
    });
    callback(places);
  });
}

export async function recordVisit(uid: string, place: PlaceRef): Promise<void> {
  await setDoc(
    placeDocRef(uid, place.placeId),
    {
      placeId: place.placeId,
      name: place.name,
      location: place.location,
      visitedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function removeVisit(uid: string, placeId: string): Promise<void> {
  await setDoc(
    placeDocRef(uid, placeId),
    { visitedAt: null },
    { merge: true },
  );
}

export async function recordSave(uid: string, place: PlaceRef): Promise<void> {
  await setDoc(
    placeDocRef(uid, place.placeId),
    {
      placeId: place.placeId,
      name: place.name,
      location: place.location,
      savedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function removeSave(uid: string, placeId: string): Promise<void> {
  await setDoc(
    placeDocRef(uid, placeId),
    { savedAt: null },
    { merge: true },
  );
}
