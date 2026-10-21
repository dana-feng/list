import { colors, SCHEMES, swatchPair } from './theme';

describe('folder covers', () => {
  const ids = Array.from({ length: 40 }, (_, i) => `list-${i}-${i * 7919}`);

  it('every folder color, in both modes, gets placeholders that go with it and never its own color', () => {
    for (const scheme of [SCHEMES.light, SCHEMES.dark]) {
      for (const fill of scheme.folders) {
        const grounds = new Set<string>(ids.map((id) => swatchPair(id, fill).fill));
        expect(grounds.has(fill)).toBe(false);
        expect(grounds.size).toBeGreaterThan(1);
      }
    }
  });

  it('a sage folder only gets bark or burnt orange covers', () => {
    const grounds = new Set<string>(ids.map((id) => swatchPair(id, colors.sage).fill));
    expect([...grounds].sort()).toEqual([colors.bark, colors.burntOrange].sort());
  });

  it('is the same every time for the same list', () => {
    expect(swatchPair('abc', colors.paper)).toBe(swatchPair('abc', colors.paper));
  });
});
