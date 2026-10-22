import 'expo-sqlite/localStorage/install';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/** echi is dark unless you turn dark mode off in settings. Kept on this phone. */
const KEY = 'echi.appearance';
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) !== 'light';
  } catch {
    return true;
  }
}

let dark = read();

// useColorScheme everywhere follows this, so the whole app flips at once
const apply = () => Appearance.setColorScheme(dark ? 'dark' : 'light');

/** Turn dark mode on or off, remember it, and switch the app over. */
export function setDarkMode(on: boolean) {
  dark = on;
  try {
    localStorage.setItem(KEY, on ? 'dark' : 'light');
  } catch {
    // still switches for now, just won't be remembered
  }
  apply();
  listeners.forEach((l) => l());
}

/** Whether dark mode is on, re-rendering when it changes. */
export function useDarkMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => dark,
  );
}

/** Put the remembered setting (dark, unless you've turned it off) in place. Once, at startup. */
export function applyAppearance() {
  apply();
}
