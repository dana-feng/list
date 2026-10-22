import { Appearance } from 'react-native';

// kept across jest.resetModules, like the real one is across launches
const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mockStore.get(k) ?? null,
    setItem: (k: string, v: string) => void mockStore.set(k, v),
  };
  return {};
});

// a fresh copy of the module, as on a new launch
// eslint-disable-next-line @typescript-eslint/no-require-imports
const load = (): typeof import('./appearance') => require('./appearance');

describe('dark mode', () => {
  beforeEach(() => {
    jest.resetModules();
    mockStore.clear();
  });

  it('is on until you turn it off', () => {
    const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    load().applyAppearance();
    expect(set).toHaveBeenLastCalledWith('dark');
  });

  it('turning it off switches the app and is remembered next time', () => {
    const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    load().setDarkMode(false);
    expect(set).toHaveBeenLastCalledWith('light');
    jest.resetModules();
    load().applyAppearance();
    expect(set).toHaveBeenLastCalledWith('light');
  });
});
