import { Appearance } from 'react-native';

// kept across jest.resetModules, like the real one is across launches
const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
  const store = mockStore;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  return {};
});

describe('appearance', () => {
  beforeEach(() => jest.resetModules());

  it('switches the app and remembers the choice for next time', () => {
    const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    const { setAppearance } = require('./appearance');
    setAppearance('dark');
    expect(set).toHaveBeenLastCalledWith('dark');
    expect(localStorage.getItem('echi.appearance')).toBe('dark');
    setAppearance('system');
    expect(set).toHaveBeenLastCalledWith('unspecified');
  });

  it('puts a remembered choice back at startup, and leaves the phone in charge otherwise', () => {
    const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    localStorage.setItem('echi.appearance', 'light');
    require('./appearance').applyAppearance();
    expect(set).toHaveBeenLastCalledWith('light');
    set.mockClear();
    jest.resetModules();
    localStorage.setItem('echi.appearance', 'system');
    require('./appearance').applyAppearance();
    expect(set).not.toHaveBeenCalled();
  });
});
