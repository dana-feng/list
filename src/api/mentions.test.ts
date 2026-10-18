import { db } from './db';
import { peopleToTag, tagBeingTyped, tagsToIds, tagsToNames, textParts } from './mentions';
import { follow, list, member, person, signIn } from '@/test/fixtures';

// Saved tags only match real ids, so these people get uuid-shaped ones.
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeEach(() => signIn({ id: ID(1), username: 'me' }));

describe('saving and showing tags', () => {
  it('turns @username into a saved tag and back', () => {
    const dana = person({ id: ID(2), username: 'dana', name: 'Dana' });
    const saved = tagsToIds('lunch with @dana!');
    expect(saved).toBe(`lunch with <@${dana.id}|dana>!`);
    expect(tagsToNames(saved)).toEqual({ text: 'lunch with @dana!', unfound: {} });
  });

  it('a trailing dot ends the sentence, not the username', () => {
    person({ id: ID(2), username: 'dana' });
    expect(tagsToIds('ask @dana.')).toBe(`ask <@${ID(2)}|dana>.`);
  });

  it('leaves emails and unknown names alone', () => {
    person({ id: ID(2), username: 'dana' });
    expect(tagsToIds('mail me@dana.com or @nobody')).toBe('mail me@dana.com or @nobody');
  });

  it('follows someone through a username change', () => {
    const p = person({ id: ID(2), username: 'dana' });
    const saved = tagsToIds('hi @dana');
    p.username = 'dana.f';
    expect(tagsToNames(saved).text).toBe('hi @dana.f');
  });

  it('keeps the saved username for someone who can\'t be found, and saves it back the same', () => {
    const saved = `hi <@${ID(9)}|ghost>`;
    const { text, unfound } = tagsToNames(saved);
    expect(text).toBe('hi @ghost');
    expect(tagsToIds(text, unfound)).toBe(saved);
  });

  it('cuts saved text into plain parts and tappable people', () => {
    const dana = person({ id: ID(2), username: 'dana' });
    expect(textParts(`with <@${dana.id}|dana> and <@${ID(9)}|ghost>`)).toEqual([
      { text: 'with ' }, { text: '@dana', person: dana }, { text: ' and ' }, { text: '@ghost' },
    ]);
  });
});

describe('while typing', () => {
  it('finds the tag just before the cursor', () => {
    expect(tagBeingTyped('hey @da', 7)).toEqual({ start: 4, query: 'da' });
    expect(tagBeingTyped('hey @', 5)).toEqual({ start: 4, query: '' });
    expect(tagBeingTyped('mail a@b', 8)).toBeNull();
  });

  it('offers you and the list\'s people first, then people you follow, never strangers', () => {
    const onList = person({ id: ID(2), username: 'dan', name: 'Dan' });
    const friend = person({ id: ID(3), username: 'dana', name: 'Dana' });
    person({ id: ID(4), username: 'danny', name: 'Danny' });
    const l = list();
    member(l, onList.id);
    follow(db.profiles[0], friend);
    expect(peopleToTag('dan', l.id).map((p) => p.username)).toEqual(['dan', 'dana']);
  });
});
