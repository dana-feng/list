// Following, profiles, likes, comments, blocking and reporting.
import { db, EventComment } from './db';
import { followCounts, followersOf, saveProfile, searchPeople, toggleFollow, usernameAvailable } from './profiles';
import { addComment, canDeleteComment, commentCount, deleteComment, likers, threadsFor, toggleLike } from './reactions';
import { block, isBlocked, report, unblock } from './safety';
import { savedCalls } from '@/test/fake-supabase';
import { follow, person, signIn } from '@/test/fixtures';

beforeEach(() => signIn());

describe('following', () => {
  it('follows and unfollows, never yourself', async () => {
    const ada = person();
    toggleFollow(ada.id);
    expect(followCounts(ada.id).followers).toBe(1);
    toggleFollow(ada.id);
    expect(followCounts(ada.id).followers).toBe(0);
    toggleFollow(db.me);
    expect((await savedCalls()).map((c) => [c.table, c.steps[0][0]])).toEqual([['follows', 'insert'], ['follows', 'delete']]);
  });

  it('lists followers newest first', () => {
    const [a, b] = [person(), person()];
    db.follows.push({ follower_id: a.id, followee_id: db.me, created_at: '2026-10-01T00:00:00Z' });
    db.follows.push({ follower_id: b.id, followee_id: db.me, created_at: '2026-10-03T00:00:00Z' });
    expect(followersOf(db.me).map((p) => p.id)).toEqual([b.id, a.id]);
  });
});

describe('profiles', () => {
  it('finds people by the start of their name or username, never you', () => {
    person({ username: 'dana.f', name: 'Dana' });
    person({ username: 'bo', name: 'Bo Dan' });
    expect(searchPeople('@dan').map((p) => p.username)).toEqual(['dana.f']);
    expect(searchPeople('me')).toEqual([]);
    expect(searchPeople('  ')).toEqual([]);
  });

  it('a username has to be 3-20 of a-z 0-9 . _ and not taken', () => {
    person({ username: 'taken' });
    expect(usernameAvailable('ok_name')).toBe(true);
    expect(usernameAvailable('ab')).toBe(false);
    expect(usernameAvailable('has space')).toBe(false);
    expect(usernameAvailable('Taken')).toBe(false);
    expect(usernameAvailable('me')).toBe(false);
  });

  it('saving tidies the name, username and bio', async () => {
    await saveProfile({ name: ' Dana ', username: ' Dana.F ', bio: `  hi\n\nthere ${'x'.repeat(200)}` });
    const [call] = await savedCalls();
    const row = call.steps[0][1] as { name: string; username: string; bio: string };
    expect([row.name, row.username]).toEqual(['Dana', 'dana.f']);
    expect(row.bio.startsWith('hi there x')).toBe(true);
    expect(row.bio).toHaveLength(150);
  });
});

describe('likes', () => {
  it('toggles, and lists you first among who liked it', () => {
    const ada = person();
    db.event_likes.push({ event_id: 'e1', user_id: ada.id, created_at: '2026-10-05T00:00:00Z' });
    toggleLike('e1');
    expect(likers('e1').map((p) => p.id)).toEqual([db.me, ada.id]);
    toggleLike('e1');
    expect(likers('e1').map((p) => p.id)).toEqual([ada.id]);
  });
});

describe('comments', () => {
  const comment = (fields: Partial<EventComment>): EventComment => {
    const c: EventComment = { id: 'c', event_id: 'e1', author_id: db.me, body: 'hi', created_at: '2026-10-01T00:00:00Z', reply_to: null, deleted_at: null, ...fields };
    db.event_comments.push(c);
    return c;
  };

  it('posts trimmed text, and nothing for an empty box', () => {
    expect(addComment('e1', '   ')).toBe(false);
    expect(addComment('e1', ' nice ')).toBe(true);
    expect(db.event_comments.map((c) => c.body)).toEqual(['nice']);
  });

  it('a reply to a reply joins the top-level thread', () => {
    const top = comment({ id: 'top' });
    const reply = comment({ id: 'r1', reply_to: top.id, created_at: '2026-10-02T00:00:00Z' });
    addComment('e1', 'me too', reply);
    expect(threadsFor('e1')).toHaveLength(1);
    expect(threadsFor('e1')[0].replies.map((r) => r.body)).toEqual(['hi', 'me too']);
  });

  it('deleting one with replies keeps a blank placeholder that doesn\'t count', () => {
    const top = comment({ id: 'top' });
    comment({ id: 'r1', reply_to: top.id, author_id: 'someone' });
    deleteComment(top.id);
    expect(db.event_comments.find((c) => c.id === top.id)).toMatchObject({ body: '' });
    expect(commentCount('e1')).toBe(1);
    expect(canDeleteComment(db.event_comments.find((c) => c.id === top.id)!)).toBe(false);
  });

  it('deleting the last reply under a deleted comment takes the placeholder too', () => {
    comment({ id: 'top', body: '', deleted_at: '2026-10-02T00:00:00Z', author_id: 'someone' });
    comment({ id: 'r1', reply_to: 'top' });
    deleteComment('r1');
    expect(db.event_comments).toEqual([]);
  });

  it('only your own can be deleted', () => {
    expect(canDeleteComment(comment({ id: 'theirs', author_id: 'someone' }))).toBe(false);
    expect(canDeleteComment(comment({ id: 'mine' }))).toBe(true);
  });
});

describe('blocking and reporting', () => {
  it('blocking hides them and ends follows both ways', async () => {
    const ada = person();
    follow(db.profiles[0], ada);
    follow(ada, db.profiles[0]);
    block(ada);
    expect(isBlocked(ada.id)).toBe(true);
    expect(db.profiles.some((p) => p.id === ada.id)).toBe(false);
    expect(db.follows).toEqual([]);
    expect((await savedCalls())[0]).toMatchObject({ table: 'blocks', steps: [['insert', { blocker_id: db.me, blocked_id: ada.id }]] });
  });

  it('you can\'t block yourself', () => {
    block(db.profiles[0]);
    expect(db.blocked).toEqual([]);
  });

  it('unblocking brings them back but not the follows', () => {
    const ada = person();
    follow(db.profiles[0], ada);
    block(ada);
    unblock(ada.id);
    expect(db.profiles.some((p) => p.id === ada.id)).toBe(true);
    expect(db.follows).toEqual([]);
  });

  it('a report keeps at most 2000 characters of what was said', async () => {
    report({ comment_id: 'c1', content: 'x'.repeat(3000) }, 'spam');
    const row = (await savedCalls())[0].steps[0][1] as { content: string; reason: string };
    expect(row.reason).toBe('spam');
    expect(row.content).toHaveLength(2000);
  });
});
