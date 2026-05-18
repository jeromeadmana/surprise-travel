import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';

import type { Settings } from './types';

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
