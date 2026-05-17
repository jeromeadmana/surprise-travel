import { DEFAULT_SETTINGS, type Settings } from '../storage/types';

export function useSettings(): Settings {
  return DEFAULT_SETTINGS;
}
