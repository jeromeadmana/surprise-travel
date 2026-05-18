import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { saveSettings, subscribeToSettings } from '../storage/firestore';
import { DEFAULT_SETTINGS, type Settings } from '../storage/types';

const SAVE_DEBOUNCE_MS = 500;

export type UseSettingsResult = {
  settings: Settings;
  loaded: boolean;
  update: (partial: Partial<Settings>) => void;
};

export function useSettings(): UseSettingsResult {
  const { uid } = useAuth();
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToSettings(uid, (s) => {
      if (s) setLocal(s);
      setLoaded(true);
    });
    return unsub;
  }, [uid]);

  const update = useCallback(
    (partial: Partial<Settings>) => {
      setLocal((prev) => {
        const next = { ...prev, ...partial };
        if (uid) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            saveSettings(uid, next).catch((e) => {
              console.error('saveSettings failed', e);
            });
          }, SAVE_DEBOUNCE_MS);
        }
        return next;
      });
    },
    [uid],
  );

  return { settings, loaded, update };
}
