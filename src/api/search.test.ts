import { db } from './db';
import { search } from './search';
import { item, list, person, signIn } from '@/test/fixtures';

beforeEach(() => signIn());

describe('search', () => {
  it('finds nothing for an empty or blank search', () => {
    list({ title: 'trips' });
    expect(search('   ')).toEqual({ people: [], lists: [], items: [] });
  });

  it('finds lists by name, ignoring case and accents', () => {
    const l = list({ title: 'Café Crawl' });
    expect(search('cafe').lists).toEqual([l]);
    expect(search('CRAWL').lists).toEqual([l]);
  });

  it('puts your lists first, then the best match', () => {
    const theirs = list({ title: 'beach trips', visibility: 'anyone' }, [person()]);
    const word = list({ title: 'road trips' });
    const start = list({ title: 'trips abroad' });
    expect(search('trips').lists).toEqual([start, word, theirs]);
  });

  it('never finds a list you can\'t open', () => {
    list({ title: 'secret trips', visibility: 'just_me' }, [person()]);
    expect(search('trips').lists).toEqual([]);
  });

  it('finds items by name before notes, and to-dos before done ones', () => {
    const l = list();
    const inNotes = item(l, { title: 'pack', notes: 'bring the tent' });
    const done = item(l, { title: 'tent pegs', done_at: '2026-10-02T00:00:00Z' });
    const named = item(l, { title: 'buy a tent' });
    expect(search('tent').items).toEqual([named, inNotes, done]);
  });

  it('finds people too, never you', () => {
    const dana = person({ username: 'dana', name: 'Dana' });
    expect(search('@dan').people).toEqual([dana]);
    expect(search('me').people).toEqual([]);
    expect(db.profiles).toHaveLength(2);
  });
});
