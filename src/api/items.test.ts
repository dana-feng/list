import { db } from './db';
import {
  addItem, addPhoto, canClaimGift, canSayHave, claimGift, deleteItem, didItWith, giftOf, isInvitedTo, itemsForList,
  markDone, MAX_COMPANIONS, noTag, reorderItems, setCompanions, setTag, toggleHave, toggleInterest, undoDone, untagMe,
} from './items';
import { allCalls, savedCalls } from '@/test/fake-supabase';
import { follow, gift, item, list, member, person, signIn } from '@/test/fixtures';

const DONE = '2026-10-02T00:00:00.000Z';
beforeEach(() => signIn());

describe('itemsForList', () => {
  it('puts dragged items in their order, anything newer on top, and done ones newest first', () => {
    const l = list();
    const a = item(l, { title: 'a', position: 1 });
    const b = item(l, { title: 'b', position: 0 });
    const fresh = item(l, { title: 'fresh', created_at: '2026-10-05T00:00:00Z' });
    const oldDone = item(l, { title: 'old done', done_at: '2026-10-01T00:00:00Z' });
    const newDone = item(l, { title: 'new done', done_at: '2026-10-04T00:00:00Z' });
    const { open, done } = itemsForList(l.id);
    expect(open.map((i) => i.title)).toEqual([fresh.title, b.title, a.title]);
    expect(done.map((i) => i.title)).toEqual([newDone.title, oldDone.title]);
  });
});

describe('crossing off', () => {
  it('marks it done by you and saves done_at', async () => {
    const l = list();
    const i = item(l);
    item(l);
    expect(markDone(i.id)).toBe(false);
    expect(i.done_by).toBe(db.me);
    expect(i.done_at).toBeTruthy();
    expect((await savedCalls())[0]).toMatchObject({ table: 'items', steps: [['update', { done_at: i.done_at }], ['eq', 'id', i.id]] });
  });

  it('says so when that was the last thing on the list', () => {
    const l = list();
    const i = item(l);
    expect(markDone(i.id)).toBe(true);
    expect(l.completed_at).toBeTruthy();
  });

  it('does nothing to something already done', async () => {
    const i = item(list(), { done_at: DONE });
    expect(markDone(i.id)).toBe(false);
    expect(await savedCalls()).toEqual([]);
  });

  it('undo opens the item and the list back up', () => {
    const l = list({ completed_at: DONE });
    const i = item(l, { done_at: DONE, done_by: db.me });
    undoDone(i.id);
    expect([i.done_at, i.done_by, l.completed_at]).toEqual([null, null, null]);
  });
});

describe('open invites', () => {
  const invite = (audience: 'anyone' | 'followers' | 'specific', fields = {}) => {
    const ada = person();
    const l = list({ visibility: 'anyone' }, [ada]);
    return { ada, l, i: item(l, { tag: 'invite', open_invite: true, invite_audience: audience, ...fields }) };
  };

  it('"anyone" includes you', () => {
    expect(isInvitedTo(invite('anyone').i.id)).toBe(true);
  });

  it('"followers" includes you once you follow someone on the list', () => {
    const { ada, i } = invite('followers');
    expect(isInvitedTo(i.id)).toBe(false);
    follow(db.profiles[0], ada);
    expect(isInvitedTo(i.id)).toBe(true);
  });

  it('"specific" includes only the people picked', () => {
    const { i } = invite('specific');
    expect(isInvitedTo(i.id)).toBe(false);
    db.item_invitees.push({ item_id: i.id, user_id: db.me });
    expect(isInvitedTo(i.id)).toBe(true);
  });

  it('a done or closed invite doesn\'t include anyone', () => {
    expect(isInvitedTo(invite('anyone', { done_at: DONE }).i.id)).toBe(false);
    expect(isInvitedTo(invite('anyone', { open_invite: false }).i.id)).toBe(false);
  });

  it('you can star an invite that includes you, and unstar it', async () => {
    const { i } = invite('anyone');
    toggleInterest(i.id);
    expect(db.interests).toHaveLength(1);
    toggleInterest(i.id);
    expect(db.interests).toHaveLength(0);
    const calls = await savedCalls();
    expect(calls.map((c) => c.steps[0][0])).toEqual(['insert', 'delete']);
  });

  it('you can\'t star one that doesn\'t include you, or your own', () => {
    toggleInterest(invite('specific').i.id);
    const own = item(list(), { tag: 'invite', open_invite: true, invite_audience: 'anyone' });
    toggleInterest(own.id);
    expect(db.interests).toHaveLength(0);
  });
});

describe('gifts', () => {
  const theirList = () => list({ visibility: 'anyone' }, [person()]);

  it('counts what\'s left without saying who', () => {
    const g = gift(theirList(), 3, 1);
    expect(giftOf(g.id)).toEqual({ quantity: 3, claimed: 1, mine: 0, left: 2 });
  });

  it('you can claim a friend\'s gift with some left, never your own', () => {
    expect(canClaimGift(gift(theirList(), 2).id)).toBe(true);
    expect(canClaimGift(gift(list(), 2).id)).toBe(false);
  });

  it('a fully claimed gift can\'t be claimed, unless some of the claims are yours', () => {
    expect(canClaimGift(gift(theirList(), 1, 1).id)).toBe(false);
    expect(canClaimGift(gift(theirList(), 1, 0, 1).id)).toBe(true);
  });

  it('claiming is capped at what\'s left, and saved through claim_gift', async () => {
    const g = gift(theirList(), 3, 2);
    claimGift(g.id, 5);
    expect(giftOf(g.id)).toMatchObject({ mine: 1, claimed: 3, left: 0 });
    expect((await savedCalls())[0]).toMatchObject({ rpc: 'claim_gift', args: { p_item: g.id, p_quantity: 1 } });
  });

  it('0 takes your claim back', () => {
    const g = gift(theirList(), 2, 0, 2);
    claimGift(g.id, 0);
    expect(giftOf(g.id)).toMatchObject({ mine: 0, claimed: 0, left: 2 });
  });
});

describe('borrowing', () => {
  it('"i have it" works on someone else\'s open borrow ask, and toggles back', () => {
    const b = item(list({ visibility: 'anyone' }, [person()]), { tag: 'borrow' });
    expect(canSayHave(b.id)).toBe(true);
    toggleHave(b.id);
    expect(db.borrow_haves.map((h) => h.user_id)).toEqual([db.me]);
    toggleHave(b.id);
    expect(db.borrow_haves).toEqual([]);
  });

  it('not on your own, or once it\'s done', () => {
    expect(canSayHave(item(list(), { tag: 'borrow' }).id)).toBe(false);
    expect(canSayHave(item(list({}, [person()]), { tag: 'borrow', done_at: DONE }).id)).toBe(false);
  });
});

describe('setTag', () => {
  it('turning an item into a gift sets how many and keeps open_invite off', async () => {
    const i = item(list());
    setTag(i.id, { ...noTag(), tag: 'gift', quantity: 4 });
    expect(i).toMatchObject({ tag: 'gift', gift_quantity: 4, open_invite: false });
    expect(db.gifts[i.id]).toMatchObject({ quantity: 4, mine: 0 });
    expect((await savedCalls())[0]).toMatchObject({ table: 'items', steps: [['update', { tag: 'gift', gift_quantity: 4 }], ['eq', 'id', i.id]] });
  });

  it('an invite for specific people saves who they are first', async () => {
    const i = item(list());
    setTag(i.id, { tag: 'invite', audience: 'specific', invitees: ['u1', 'u2'], quantity: 1 });
    expect(i.open_invite).toBe(true);
    const calls = await savedCalls();
    expect(calls.map((c) => c.table)).toEqual(['item_invitees', 'items']);
  });

  it('taking a borrow tag off clears who said they have it', () => {
    const i = item(list(), { tag: 'borrow' });
    db.borrow_haves.push({ item_id: i.id, user_id: 'x', created_at: DONE });
    setTag(i.id, noTag());
    expect(db.borrow_haves).toEqual([]);
  });

  it('only the list\'s owners can change it', async () => {
    const i = item(list({}, [person()]));
    setTag(i.id, { ...noTag(), tag: 'gift' });
    expect(i.tag).toBeNull();
    expect(await savedCalls()).toEqual([]);
  });
});

describe('did it with', () => {
  it('tags people on something crossed off, leaving out you and the list\'s owners', () => {
    const ada = person();
    const bo = person();
    const l = list();
    member(l, ada.id);
    const i = item(l, { done_at: DONE });
    setCompanions(i.id, [db.me, ada.id, bo.id, bo.id]);
    expect(db.item_companions.map((c) => c.user_id)).toEqual([bo.id]);
    expect(didItWith(i.id, bo.id)).toBe(true);
  });

  it('caps how many can be tagged', () => {
    const i = item(list(), { done_at: DONE });
    setCompanions(i.id, Array.from({ length: MAX_COMPANIONS + 5 }, (_, n) => `u${n}`));
    expect(db.item_companions).toHaveLength(MAX_COMPANIONS);
  });

  it('only once it\'s done', () => {
    const i = item(list());
    setCompanions(i.id, ['u1']);
    expect(db.item_companions).toEqual([]);
  });

  it('untagging yourself from a list you can\'t otherwise see drops it from here', () => {
    const l = list({ visibility: 'just_me' }, [person()]);
    const i = item(l, { done_at: DONE });
    db.item_companions.push({ item_id: i.id, user_id: db.me, added_by: null, created_at: DONE });
    untagMe(i.id);
    expect(db.items.find((x) => x.id === i.id)).toBeUndefined();
  });
});

describe('adding, reordering, deleting', () => {
  it('adds a trimmed item, reopens a finished list, and saves only real columns', async () => {
    const l = list({ completed_at: DONE });
    const id = addItem({ list_id: l.id, title: '  hike ', notes: '', date: null, photos: [], tag: noTag() });
    expect(db.items.find((i) => i.id === id)?.title).toBe('hike');
    expect(l.completed_at).toBeNull();
    const [call] = await savedCalls();
    const row = call.steps[0][1] as Record<string, unknown>;
    expect(call.table).toBe('items');
    expect(row).not.toHaveProperty('done_at');
    expect(row).not.toHaveProperty('open_invite');
  });

  it('reorders by saving the whole order in one call', async () => {
    const l = list();
    const [a, b] = [item(l), item(l)];
    reorderItems(l.id, [b.id, a.id]);
    expect([b.position, a.position]).toEqual([0, 1]);
    expect((await savedCalls())[0]).toMatchObject({ rpc: 'reorder_items', args: { p_list_id: l.id, p_ids: [b.id, a.id] } });
  });

  it('deleting takes its photos and feed posts too, and marks the list done if only done things are left', async () => {
    const l = list();
    const gone = item(l);
    item(l, { done_at: DONE });
    db.item_photos.push({ id: 'p1', item_id: gone.id, path: `${l.id}/${gone.id}/p1.jpg`, position: 0, added_by: db.me, created_at: DONE });
    db.events.push({ id: 'e1', actor_id: db.me, kind: 'item_added', list_id: l.id, item_id: gone.id, created_at: DONE });
    deleteItem(gone.id);
    expect(db.item_photos).toEqual([]);
    expect(db.events).toEqual([]);
    expect(l.completed_at).toBeTruthy();
    await savedCalls();
    expect(allCalls().map((c) => c.table ?? c.bucket)).toEqual(['items', 'photos']);
  });

  it('a new photo shows straight away at the end, then uploads', async () => {
    const i = item(list());
    addPhoto(i.id, 'file:///a.jpg');
    addPhoto(i.id, 'file:///b.jpg');
    expect(db.item_photos.map((p) => [p.path, p.position])).toEqual([['file:///a.jpg', 0], ['file:///b.jpg', 1]]);
    const calls = await savedCalls();
    expect(calls.every((c) => c.table === 'item_photos')).toBe(true);
  });
});
