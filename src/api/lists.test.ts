import { db } from './db';
import {
  canLeaveList, canViewList, cancelInvite, createList, isListDone, leaveList, listPeople, listProgress, listsForProfile,
  progressLabel, renameList, respondInvite, visibilityLabel,
} from './lists';
import { savedCalls } from '@/test/fake-supabase';
import { follow, item, list, member, person, signIn } from '@/test/fixtures';

beforeEach(() => signIn());

describe('canViewList: the same rule as can_view_list in the database', () => {
  it('lets anyone on the list see it, invited or joined', () => {
    const ada = person();
    const l = list({ visibility: 'just_me' }, [ada]);
    expect(canViewList(l.id)).toBe(false);
    member(l, db.me, 'invited');
    expect(canViewList(l.id)).toBe(true);
  });

  it('"anyone" is everyone', () => {
    const l = list({ visibility: 'anyone' }, [person()]);
    expect(canViewList(l.id)).toBe(true);
  });

  it('"followers" means you follow someone who has joined it', () => {
    const ada = person();
    const l = list({ visibility: 'followers' }, [ada]);
    expect(canViewList(l.id)).toBe(false);
    follow(db.profiles[0], ada);
    expect(canViewList(l.id)).toBe(true);
  });

  it('"followers" doesn\'t count someone who is only invited', () => {
    const ada = person();
    const bo = person();
    const l = list({ visibility: 'followers' }, [ada]);
    member(l, bo.id, 'invited');
    follow(db.profiles[0], bo);
    expect(canViewList(l.id)).toBe(false);
  });

  it('"specific" is only the people picked', () => {
    const l = list({ visibility: 'specific' }, [person()]);
    expect(canViewList(l.id)).toBe(false);
    db.list_viewers.push({ list_id: l.id, user_id: db.me });
    expect(canViewList(l.id)).toBe(true);
  });

  it('owners-only lists are hidden from everyone else', () => {
    const ada = person();
    const l = list({ visibility: 'just_me' }, [ada]);
    follow(db.profiles[0], ada);
    expect(canViewList(l.id)).toBe(false);
  });

  it('a list that isn\'t here can\'t be seen', () => {
    expect(canViewList('nope')).toBe(false);
  });
});

describe('progress', () => {
  it('counts what\'s crossed off', () => {
    const l = list();
    item(l, { done_at: '2026-10-02T00:00:00Z' });
    item(l);
    expect(listProgress(l.id)).toEqual({ done: 1, total: 2 });
    expect(progressLabel(l.id)).toBe('1/2 done');
    expect(isListDone(l.id)).toBe(false);
  });

  it('a list is done once everything on it is, and an empty list never is', () => {
    const l = list();
    expect(isListDone(l.id)).toBe(false);
    item(l, { done_at: '2026-10-02T00:00:00Z' });
    expect(isListDone(l.id)).toBe(true);
    expect(progressLabel(l.id)).toBe('');
  });
});

describe('visibilityLabel', () => {
  it('names the choice, says "you" for a list that\'s yours alone, and counts people for "specific"', () => {
    expect(visibilityLabel(list({ visibility: 'followers' }))).toBe('followers');
    const solo = list({ visibility: 'just_me' });
    expect(visibilityLabel(solo)).toBe('you');
    member(solo, person().id, 'invited');
    expect(visibilityLabel(solo)).toBe('owners');
    const l = list({ visibility: 'specific' });
    db.list_viewers.push({ list_id: l.id, user_id: 'a' }, { list_id: l.id, user_id: 'b' });
    expect(visibilityLabel(l)).toBe('2 people');
  });
});

describe('listPeople', () => {
  it('is the joined owners in the order they joined, invites kept apart', () => {
    const ada = person();
    const bo = person();
    const l = list({}, [ada]);
    db.list_members.push({ list_id: l.id, user_id: db.me, status: 'joined', invited_by: null, created_at: '2026-10-05T00:00:00Z' });
    member(l, bo.id, 'invited');
    expect(listPeople(l.id).map((p) => p.id)).toEqual([ada.id, db.me]);
    expect(listPeople(l.id, 'invited').map((p) => p.id)).toEqual([bo.id]);
  });
});

describe('listsForProfile', () => {
  it('shows only lists you can see, your own invites first', () => {
    const ada = person();
    list({ title: 'mine', created_at: '2026-10-03T00:00:00Z' });
    const invite = list({ title: 'invite', created_at: '2026-10-01T00:00:00Z' }, [ada]);
    member(invite, db.me, 'invited');
    list({ title: 'hidden', visibility: 'just_me' }, [ada]);
    expect(listsForProfile(db.me).map((r) => r.list.title)).toEqual(['invite', 'mine']);
  });

  it('never shows someone else\'s invites', () => {
    const ada = person();
    const l = list({ visibility: 'anyone' });
    member(l, ada.id, 'invited');
    expect(listsForProfile(ada.id)).toEqual([]);
  });
});

describe('invites and leaving', () => {
  it('joining turns the invite into a membership and saves it', async () => {
    const ada = person();
    const l = list({}, [ada]);
    member(l, db.me, 'invited');
    respondInvite(l.id, true);
    expect(listPeople(l.id).map((p) => p.id)).toContain(db.me);
    const [call] = await savedCalls();
    expect(call).toMatchObject({ table: 'list_members', steps: [['update', { status: 'joined' }], ['eq', 'list_id', l.id], ['eq', 'user_id', db.me]] });
  });

  it('saying no removes the invite', async () => {
    const l = list({}, [person()]);
    member(l, db.me, 'invited');
    respondInvite(l.id, false);
    expect(db.list_members.some((m) => m.list_id === l.id && m.user_id === db.me)).toBe(false);
    expect((await savedCalls())[0]).toMatchObject({ table: 'list_members', steps: [['delete'], ['eq', 'list_id', l.id], ['eq', 'user_id', db.me]] });
  });

  it('you can\'t leave a list you\'d be the last owner of', async () => {
    const l = list();
    expect(canLeaveList(l.id)).toBe(false);
    leaveList(l.id);
    expect(listPeople(l.id)).toHaveLength(1);
    expect(await savedCalls()).toEqual([]);
  });

  it('you can leave once someone else has joined', () => {
    const ada = person();
    const l = list({}, [ada]);
    member(l, db.me);
    expect(canLeaveList(l.id)).toBe(true);
    leaveList(l.id);
    expect(listPeople(l.id).map((p) => p.id)).toEqual([ada.id]);
  });

  it('only owners can take back an invite, and only one that\'s still pending', () => {
    const ada = person();
    const theirs = list({}, [person()]);
    member(theirs, ada.id, 'invited');
    cancelInvite(theirs.id, ada.id);
    expect(db.list_members.some((m) => m.list_id === theirs.id && m.user_id === ada.id)).toBe(true);

    const mine = list();
    member(mine, ada.id, 'invited');
    cancelInvite(mine.id, ada.id);
    expect(db.list_members.some((m) => m.list_id === mine.id && m.user_id === ada.id)).toBe(false);
  });
});

describe('createList and renameList', () => {
  it('creates the list with you joined and your invites pending, through create_list', async () => {
    const ada = person();
    const id = createList({ title: '  trips  ', visibility: 'specific', viewers: ['v1'], invites: [ada.id] });
    expect(db.lists.find((l) => l.id === id)).toMatchObject({ title: 'trips', visibility: 'specific' });
    expect(db.list_members.filter((m) => m.list_id === id).map((m) => [m.user_id, m.status])).toEqual([[db.me, 'joined'], [ada.id, 'invited']]);
    expect(db.list_viewers).toEqual([{ list_id: id, user_id: 'v1' }]);
    expect((await savedCalls())[0]).toMatchObject({ rpc: 'create_list', args: { p_title: 'trips', p_id: id, p_invites: [ada.id] } });
  });

  it('renaming trims, and ignores blank or unchanged names', async () => {
    const l = list({ title: 'old' });
    renameList(l.id, '   ');
    renameList(l.id, 'old');
    expect(await savedCalls()).toEqual([]);
    renameList(l.id, ' new ');
    expect(l.title).toBe('new');
    expect((await savedCalls())[0]).toMatchObject({ table: 'lists', steps: [['update', { title: 'new' }], ['eq', 'id', l.id]] });
  });
});
