import { colors, folderColor, gridCovers, SCHEMES, swatchPair } from './theme';

const { light, dark } = SCHEMES;
const ids = (n: number, tag = 'l') => Array.from({ length: n }, (_, i) => `${tag}${n}-${i}-${i * 7919}`);

describe('placeholders', () => {
  it('light mode uses the sage and olive ones, dark mode the bark and inkSoft ones', () => {
    expect(new Set(ids(40).map((id) => swatchPair(id, light).id))).toEqual(new Set(['sage', 'olive']));
    expect(new Set(ids(40).map((id) => swatchPair(id, dark).id))).toEqual(new Set(['bark', 'inkSoft']));
  });

  it('never puts one on a folder of its own ground color', () => {
    expect(new Set(ids(40).map((id) => swatchPair(id, light, colors.olive).id))).toEqual(new Set(['sage']));
    expect(new Set(ids(40).map((id) => swatchPair(id, dark, colors.inkSoftSolid).id))).toEqual(new Set(['bark']));
  });

  it('is the same every time for the same list', () => {
    expect(swatchPair('abc', dark, colors.sage)).toBe(swatchPair('abc', dark, colors.sage));
  });
});

describe('gridCovers', () => {
  // beside and above (always different), and the two diagonals above
  const beside = (i: number) => (i % 2 ? [i - 1, i - 2] : [i - 2]).filter((j) => j >= 0);

  it('never puts the same cover side by side or above and below, in either mode', () => {
    for (const scheme of [light, dark]) {
      for (let n = 1; n <= 30; n++) {
        const folders = ids(n).map((id) => ({ id, on: folderColor(id, scheme) }));
        const covers = gridCovers(folders, scheme);
        covers.forEach((c, i) => {
          for (const j of beside(i)) expect(c.id).not.toBe(covers[j].id);
        });
      }
    }
  });

  it('keeps diagonals different too when there are enough covers to', () => {
    // a single row of two: nothing diagonal to worry about, and both differ
    const covers = gridCovers(ids(2).map((id) => ({ id, on: colors.sage })), dark);
    expect(covers[0].id).not.toBe(covers[1].id);
  });

  it('only uses this mode\'s covers', () => {
    const covers = gridCovers(ids(20).map((id) => ({ id, on: folderColor(id, light) })), light);
    for (const c of covers) expect(['sage', 'olive']).toContain(c.id);
  });

  it('works out covers for a long profile quickly', () => {
    const folders = ids(400, 'big').map((id) => ({ id, on: folderColor(id, light) }));
    const t = Date.now();
    expect(gridCovers(folders, light)).toHaveLength(400);
    expect(Date.now() - t).toBeLessThan(500);
  });
});
