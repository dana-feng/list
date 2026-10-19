import { db, Profile } from './db';
import { findByIds, findByUsername, findPeople, forgetFound, foundProfiles, searchPeople } from './profiles';
import { allCalls, replyNext } from '@/test/fake-supabase';
import { person, signIn } from '@/test/fixtures';

const stranger = (fields: Partial<Profile> = {}): Profile => ({
  id: 'stranger-1', username: 'dana.f', name: 'Dana', profile_photo: null, bio: '', created_at: '2026-10-01T00:00:00Z', ...fields,
});

beforeEach(() => {
  signIn();
  forgetFound();
});

describe('finding people you aren\'t connected to', () => {
  it('searches the server and keeps who it finds', async () => {
    replyNext({ data: [stranger()] });
    await findPeople('@Dan');
    expect(allCalls()[0]).toMatchObject({ rpc: 'search_profiles', args: { p_query: 'dan' } });
    expect(searchPeople('dan').map((p) => p.id)).toEqual(['stranger-1']);
    expect(foundProfiles().map((p) => p.id)).toEqual(['stranger-1']);
  });

  it('doesn\'t ask the server about a single letter', async () => {
    await findPeople('d');
    expect(allCalls()).toEqual([]);
  });

  it('looks up a username only when it isn\'t already here', async () => {
    person({ username: 'known' });
    await findByUsername('known');
    expect(allCalls()).toEqual([]);
    replyNext({ data: [stranger()] });
    await findByUsername('dana.f');
    expect(allCalls()[0]).toMatchObject({ rpc: 'profile_by_username', args: { p_username: 'dana.f' } });
    expect(db.profiles.some((p) => p.username === 'dana.f')).toBe(true);
  });

  it('asks only for the ids that are missing, at most 100', async () => {
    const known = person();
    await findByIds([known.id]);
    expect(allCalls()).toEqual([]);
    await findByIds([known.id, ...Array.from({ length: 150 }, (_, i) => `u${i}`)]);
    const args = allCalls()[0].args as { p_ids: string[] };
    expect(args.p_ids).toHaveLength(100);
    expect(args.p_ids).not.toContain(known.id);
  });

  it('forgets them at sign-out', async () => {
    replyNext({ data: [stranger()] });
    await findPeople('dana');
    forgetFound();
    expect(foundProfiles()).toEqual([]);
  });
});
