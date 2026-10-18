import { db, EventKind, FeedEvent } from './db';
import { activityFor, asks, feedAll, inviteHosts, isAskFor } from './feed';
import { follow, gift, item, list, member, person, signIn } from '@/test/fixtures';

let n = 0;
const post = (actor: string, kind: EventKind, listId: string, itemId: string | null = null, created_at = `2026-10-0${++n % 9 + 1}T00:00:00Z`): FeedEvent => {
  const e = { id: `e${n}`, actor_id: actor, kind, list_id: listId, item_id: itemId, created_at };
  db.events.push(e);
  return e;
};

beforeEach(() => signIn());

describe('feedAll', () => {
  it('shows posts from people you follow, newest first', () => {
    const ada = person();
    follow(db.profiles[0], ada);
    const l = list({ visibility: 'anyone' }, [ada]);
    const older = post(ada.id, 'list_created', l.id, null, '2026-10-01T00:00:00Z');
    const newer = post(ada.id, 'item_added', l.id, item(l).id, '2026-10-03T00:00:00Z');
    expect(feedAll().map((e) => e.id)).toEqual([newer.id, older.id]);
  });

  it('leaves out your own posts, open invites, and people you don\'t follow', () => {
    const ada = person();
    const stranger = person();
    follow(db.profiles[0], ada);
    const l = list({ visibility: 'anyone' }, [ada]);
    post(db.me, 'item_added', l.id);
    post(ada.id, 'open_invite', l.id, item(l).id);
    post(stranger.id, 'item_added', l.id);
    expect(feedAll()).toEqual([]);
  });

  it('includes something a stranger did with you', () => {
    const stranger = person();
    const l = list({ visibility: 'anyone' }, [stranger]);
    const i = item(l, { done_at: '2026-10-02T00:00:00Z' });
    db.item_companions.push({ item_id: i.id, user_id: db.me, added_by: stranger.id, created_at: '2026-10-02T00:00:00Z' });
    const e = post(stranger.id, 'item_done', l.id, i.id);
    expect(feedAll().map((x) => x.id)).toEqual([e.id]);
  });

  it('stops at the limit', () => {
    const ada = person();
    follow(db.profiles[0], ada);
    const l = list({ visibility: 'anyone' }, [ada]);
    for (let k = 0; k < 5; k++) post(ada.id, 'item_added', l.id);
    expect(feedAll(3)).toHaveLength(3);
  });
});

describe('activityFor', () => {
  it('is what they did, plus "did" and "finished" on lists they\'re on', () => {
    const ada = person();
    const bo = person();
    const shared = list({ visibility: 'anyone' }, [ada, bo]);
    const theirs = post(ada.id, 'item_added', shared.id);
    const crossedByBo = post(bo.id, 'item_done', shared.id);
    post(bo.id, 'item_added', shared.id);
    expect(activityFor(ada.id).map((e) => e.id).sort()).toEqual([theirs.id, crossedByBo.id].sort());
  });
});

describe('asks', () => {
  it('a friend\'s open invite that includes you, soonest first', () => {
    const ada = person();
    follow(db.profiles[0], ada);
    const l = list({ visibility: 'followers' }, [ada]);
    const later = item(l, { tag: 'invite', open_invite: true, invite_audience: 'followers', date: '2026-11-01' });
    const sooner = item(l, { tag: 'invite', open_invite: true, invite_audience: 'followers', date: '2026-10-20' });
    const undated = item(l, { tag: 'borrow' });
    expect(asks().map((a) => a.item.id)).toEqual([sooner.id, later.id, undated.id]);
    expect(asks(['borrow']).map((a) => a.item.id)).toEqual([undated.id]);
  });

  it('never your own lists on Home, and never untagged things', () => {
    const l = list();
    item(l, { tag: 'borrow' });
    item(list({ visibility: 'anyone' }, [person()]));
    expect(asks()).toEqual([]);
  });

  it('a gift drops out once it\'s fully claimed, unless you\'re getting some', () => {
    const l = list({ visibility: 'anyone' }, [person()]);
    expect(isAskFor(gift(l, 1, 1))).toBe(false);
    expect(isAskFor(gift(l, 1, 0, 1))).toBe(true);
    expect(isAskFor(gift(l, 2, 1))).toBe(true);
  });
});

describe('inviteHosts', () => {
  it('is whoever last turned the invite on', () => {
    const ada = person();
    const bo = person();
    const l = list({ visibility: 'anyone' }, [ada, bo]);
    const i = item(l, { tag: 'invite', open_invite: true });
    post(ada.id, 'open_invite', l.id, i.id, '2026-10-01T00:00:00Z');
    post(bo.id, 'open_invite', l.id, i.id, '2026-10-04T00:00:00Z');
    expect(inviteHosts(i).map((p) => p.id)).toEqual([bo.id]);
  });

  it('falls back to the list\'s people when that post isn\'t visible', () => {
    const ada = person();
    const bo = person();
    const l = list({ visibility: 'anyone' }, [ada]);
    member(l, bo.id);
    const i = item(l, { tag: 'invite', open_invite: true });
    expect(inviteHosts(i).map((p) => p.id)).toEqual([ada.id, bo.id]);
  });
});
