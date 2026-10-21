import 'expo-sqlite/localStorage/install';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/** Light or dark mode: follow the phone, or pick one for the app. Kept on this phone. */
export type AppearanceChoice = 'system' | 'light' | 'dark';

export const APPEARANCE_CHOICES: { value: AppearanceChoice; label: string }[] = [
  { value: 'system', label: 'match phone' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
];

const KEY = 'echi.appearance';
const listeners = new Set<() => void>();

function read(): AppearanceChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let choice = read();

// useColorScheme everywhere follows this, so the whole app flips at once
const apply = () => Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);

/** Pick light, dark or "match phone", remember it, and switch the app over. */
export function setAppearance(next: AppearanceChoice) {
  choice = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // still switches for now, just won't be remembered
  }
  apply();
  listeners.forEach((l) => l());
}

/** The current choice, re-rendering when it changes. */
export function useAppearance() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => choice,
  );
}

/** Put the remembered choice in place. Once, at startup. */
export function applyAppearance() {
  if (choice !== 'system') apply();
}
