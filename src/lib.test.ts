import { dayParts, longDay, monthDay, monthYear, names, parseDay, shortDay, timeAgo, toDay } from './lib';
import { me } from './api/profiles';
import { person, signIn } from './test/fixtures';

describe('days', () => {
  it('reads YYYY-MM-DD as a local day, not UTC', () => {
    const d = parseDay('2026-10-17');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 17]);
  });

  it('round-trips through toDay', () => {
    expect(toDay(parseDay('2026-01-05'))).toBe('2026-01-05');
  });

  it('formats days the way the app shows them', () => {
    expect(longDay('2026-10-17')).toBe('sat, oct 17');
    expect(shortDay('2026-10-17')).toBe('sat 10/17');
    expect(dayParts('2026-10-17')).toEqual({ weekday: 'SAT', day: '17' });
    expect(monthYear(parseDay('2026-10-17'))).toBe('oct 2026');
    expect(monthDay(new Date(2026, 9, 3, 12).toISOString())).toBe('oct 3');
  });
});

describe('timeAgo', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('never says less than a minute', () => {
    expect(timeAgo(ago(0))).toBe('1m');
  });

  it('steps from minutes to hours to days', () => {
    expect(timeAgo(ago(59 * 60_000))).toBe('59m');
    expect(timeAgo(ago(3 * 3_600_000))).toBe('3h');
    expect(timeAgo(ago(2 * 86_400_000))).toBe('2d');
  });
});

describe('names', () => {
  it('says "you" for whoever is signed in and joins with +', () => {
    signIn();
    const ada = person({ name: 'adanna' });
    expect(names([me(), ada])).toBe('you + adanna');
  });
});
