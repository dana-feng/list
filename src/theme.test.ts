import { colors, folderColor, gridCovers, SCHEMES, swatchPair } from './theme';

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

describe('gridCovers', () => {
  const neighbours = (i: number) => (i % 2 ? [i - 1, i - 2, i - 3] : [i - 2, i - 1]).filter((j) => j >= 0);

  it('never puts the same cover beside, above or diagonal to another, in either mode', () => {
    for (const scheme of [SCHEMES.light, SCHEMES.dark]) {
      for (let n = 1; n <= 30; n++) {
        const folders = Array.from({ length: n }, (_, i) => ({ id: `l${n}-${i}`, on: folderColor(`l${n}-${i}`, scheme) }));
        const covers = gridCovers(folders);
        covers.forEach((c, i) => {
          for (const j of neighbours(i)) expect(c.fill).not.toBe(covers[j].fill);
        });
      }
    }
  });

  it("never gives a folder a cover in its own color when there's another way", () => {
    const on = [colors.bark, colors.olive, colors.burntOrange, colors.sun, colors.bark, colors.olive];
    const covers = gridCovers(on.map((c, i) => ({ id: `f${i}`, on: c })));
    covers.forEach((c, i) => expect(c.fill).not.toBe(on[i]));
  });

  it('still picks covers that suit the folder when it can', () => {
    const [only] = gridCovers([{ id: 'x', on: colors.sage }]);
    expect([colors.bark, colors.burntOrange]).toContain(only.fill);
  });
});

it('works out covers for a long profile quickly, even when a block of folders is all one color', () => {
  const folders = Array.from({ length: 400 }, (_, i) => ({ id: `big-${i}`, on: i < 4 ? colors.bark : folderColor(`big-${i}`, SCHEMES.light) }));
  const t = Date.now();
  const covers = gridCovers(folders);
  expect(Date.now() - t).toBeLessThan(500);
  expect(covers).toHaveLength(400);
});
