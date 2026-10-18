import { commit, db, InviteAudience, Item, ItemTag, now, Profile } from './db';
import { followsSomeoneOn, getList, isListDone, isMember, listProgress } from './lists';
import { getProfile } from './profiles';
import { supabase } from './supabase';
import { isLocal, newId, uploadImage, write } from './sync';

export const getItem = (id: string) => db.items.find((i) => i.id === id);

/** To-dos in the order they were dragged into; anything added since then sits on top, newest first. */
export function itemsForList(listId: string) {
  const items = db.items
    .filter((i) => i.list_id === listId)
    .sort((a, b) => (a.position ?? -1) - (b.position ?? -1) || b.created_at.localeCompare(a.created_at));
  return {
    open: items.filter((i) => !i.done_at),
    done: items.filter((i) => i.done_at).sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1)),
  };
}

export const photosFor = (itemId: string) =>
  db.item_photos.filter((p) => p.item_id === itemId).sort((a, b) => a.position - b.position);

/** What to hand an <Image>: the local file while it uploads, then the signed link. */
export const photoUri = (path: string) => (isLocal(path) ? path : db.photoUrls[path]);

export const interestedPeople = (itemId: string) =>
  db.interests.filter((i) => i.item_id === itemId).map((i) => getProfile(i.user_id)!).filter(Boolean);

export const inviteeIds = (itemId: string) => db.item_invitees.filter((v) => v.item_id === itemId).map((v) => v.user_id);

/**
 * An open invite that's still open and includes you. Same rule as can_see_invite in the database.
 * On a list you can see, an item can be someone's open invite without being one for you.
 */
export function isInvitedTo(itemId: string) {
  const item = getItem(itemId);
  if (!item || !item.open_invite || item.done_at) return false;
  if (item.invite_audience === 'anyone') return true;
  if (item.invite_audience === 'followers') return followsSomeoneOn(item.list_id);
  return db.item_invitees.some((v) => v.item_id === itemId && v.user_id === db.me);
}

export const isInterested = (itemId: string) => db.interests.some((i) => i.item_id === itemId && i.user_id === db.me);

// ---------------------------------------------------------------------------
// Tags: invite, gift, borrow
// ---------------------------------------------------------------------------

/** Everything the tag on an item can be set to, in one go. */
export type TagChoice = { tag: ItemTag | null; audience: InviteAudience; invitees: string[]; quantity: number };

export const tagChoiceOf = (item: Item): TagChoice => ({
  tag: item.tag, audience: item.invite_audience, invitees: inviteeIds(item.id), quantity: item.gift_quantity,
});

export const noTag = (): TagChoice => ({ tag: null, audience: 'followers', invitees: [], quantity: 1 });

/** Changes an item's tag (and its settings) from the item screen. */
export function setTag(itemId: string, next: TagChoice) {
  const item = getItem(itemId);
  if (!item || !isMember(item.list_id)) return;
  setInvitees(itemId, next.tag === 'invite' && next.audience === 'specific' ? next.invitees : []);
  const patch = {
    tag: next.tag,
    invite_audience: next.tag === 'invite' ? next.audience : item.invite_audience,
    gift_quantity: next.tag === 'gift' ? next.quantity : item.gift_quantity,
  };
  if (patch.tag === item.tag && patch.invite_audience === item.invite_audience && patch.gift_quantity === item.gift_quantity) return;
  Object.assign(item, patch, { open_invite: patch.tag === 'invite' });
  const gift = db.gifts[itemId];
  if (patch.tag === 'gift') db.gifts[itemId] = { item_id: itemId, quantity: patch.gift_quantity, claimed: gift?.claimed ?? 0, mine: 0 };
  if (patch.tag !== 'borrow') db.borrow_haves = db.borrow_haves.filter((h) => h.item_id !== itemId);
  commit();
  write(() => supabase.from('items').update(patch).eq('id', itemId), 'the tag');
}

/** A gift's counts. `left` is how many nobody has said they'll get yet. Never who. */
export function giftOf(itemId: string) {
  const item = getItem(itemId);
  const g = db.gifts[itemId];
  const quantity = g?.quantity ?? item?.gift_quantity ?? 1;
  const claimed = g?.claimed ?? 0;
  const mine = g?.mine ?? 0;
  return { quantity, claimed, mine, left: Math.max(0, quantity - claimed) };
}

/** Someone else's gift you can still say you'll get (or have already). */
export function canClaimGift(itemId: string) {
  const item = getItem(itemId);
  if (!item || item.tag !== 'gift' || isMember(item.list_id)) return false;
  const { left, mine } = giftOf(itemId);
  if (mine) return true;
  return left > 0 && (!item.done_at || item.auto_done);
}

/** "i'll get it": how many you're getting. 0 takes it back. */
export function claimGift(itemId: string, quantity: number) {
  const item = getItem(itemId);
  if (!item || item.tag !== 'gift' || isMember(item.list_id)) return;
  const { quantity: wanted, claimed, mine } = giftOf(itemId);
  const n = Math.max(0, Math.min(quantity, wanted - claimed + mine));
  if (n === mine) return;
  db.gifts[itemId] = { item_id: itemId, quantity: wanted, claimed: claimed - mine + n, mine: n };
  commit();
  write(() => supabase.rpc('claim_gift', { p_item: itemId, p_quantity: n }), n ? 'that' : 'that undo');
}

/** Who said they have the thing a borrow ask is for, newest first. */
export const havesFor = (itemId: string): Profile[] =>
  db.borrow_haves
    .filter((h) => h.item_id === itemId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((h) => getProfile(h.user_id))
    .filter((p): p is Profile => !!p);

export const iHaveIt = (itemId: string) => db.borrow_haves.some((h) => h.item_id === itemId && h.user_id === db.me);

/** Someone else's borrow ask that's still open. */
export function canSayHave(itemId: string) {
  const item = getItem(itemId);
  return !!item && item.tag === 'borrow' && !item.done_at && !isMember(item.list_id);
}

/** "i have it", or taking it back. */
export function toggleHave(itemId: string) {
  if (iHaveIt(itemId)) {
    db.borrow_haves = db.borrow_haves.filter((h) => !(h.item_id === itemId && h.user_id === db.me));
    commit();
    write(() => supabase.from('borrow_haves').delete().eq('item_id', itemId).eq('user_id', db.me), 'that');
  } else {
    if (!canSayHave(itemId)) return;
    db.borrow_haves.push({ item_id: itemId, user_id: db.me, created_at: now() });
    commit();
    write(() => supabase.from('borrow_haves').insert({ item_id: itemId, user_id: db.me }), 'that');
  }
}

/** Your own star: only on open invites, and never on a list you're on. */
export function toggleInterest(itemId: string) {
  const item = getItem(itemId);
  if (!item || isMember(item.list_id)) return;
  if (isInterested(itemId)) {
    db.interests = db.interests.filter((i) => !(i.item_id === itemId && i.user_id === db.me));
    commit();
    write(() => supabase.from('interests').delete().eq('item_id', itemId).eq('user_id', db.me), 'that');
  } else {
    if (!isInvitedTo(itemId)) return;
    db.interests.push({ item_id: itemId, user_id: db.me, created_at: now() });
    commit();
    write(() => supabase.from('interests').insert({ item_id: itemId, user_id: db.me }), 'your star');
  }
}

/** The paper plane. Turning it on later makes a new feed post (the database does that). */
export function toggleOpenInvite(itemId: string) {
  const item = getItem(itemId);
  if (!item || !isMember(item.list_id)) return;
  item.open_invite = !item.open_invite;
  commit();
  const open_invite = item.open_invite;
  write(() => supabase.from('items').update({ open_invite }).eq('id', itemId), 'the open invite');
}

/** Checking off always posts (the database writes the post). Returns true when that finished the whole list. */
export function markDone(itemId: string) {
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  if (!item || !list || item.done_at) return false;
  item.done_at = now();
  item.done_by = db.me;
  const finished = isListDone(list.id);
  if (finished) list.completed_at = now();
  commit();
  const done_at = item.done_at;
  write(() => supabase.from('items').update({ done_at }).eq('id', itemId), 'that check-off');
  return finished;
}

/** Saves the order of a list's to-dos after one is dragged. `ids` is all of them, top to bottom. */
export function reorderItems(listId: string, ids: string[]) {
  if (!isMember(listId)) return;
  ids.forEach((id, position) => {
    const item = getItem(id);
    if (item && item.list_id === listId) item.position = position;
  });
  commit();
  write(() => supabase.rpc('reorder_items', { p_list_id: listId, p_ids: ids }), 'the new order');
}

export function undoDone(itemId: string) {
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  if (!item || !list) return;
  item.done_at = null;
  item.done_by = null;
  list.completed_at = null;
  commit();
  write(() => supabase.from('items').update({ done_at: null }).eq('id', itemId), 'that undo');
}

/** Changes who the people picked for an invite are. Queued ahead of whatever turns the invite on. */
function setInvitees(itemId: string, userIds: string[]) {
  const before = inviteeIds(itemId);
  const added = userIds.filter((u) => !before.includes(u));
  const removed = before.filter((u) => !userIds.includes(u));
  if (!added.length && !removed.length) return;
  db.item_invitees = db.item_invitees.filter((v) => v.item_id !== itemId).concat(userIds.map((user_id) => ({ item_id: itemId, user_id })));
  commit();
  if (removed.length) write(() => supabase.from('item_invitees').delete().eq('item_id', itemId).in('user_id', removed), "who's invited");
  if (added.length) write(() => supabase.from('item_invitees').insert(added.map((user_id) => ({ item_id: itemId, user_id }))), "who's invited");
}

export type ItemInput = { list_id: string; title: string; notes: string; date: string | null; photos: string[]; tag: TagChoice };

export function addItem(input: ItemInput) {
  const id = newId();
  const { tag } = input;
  const item: Item = {
    id, list_id: input.list_id, title: input.title.trim(), notes: input.notes, date: input.date,
    tag: tag.tag, open_invite: tag.tag === 'invite', invite_audience: tag.audience, gift_quantity: tag.quantity, auto_done: false,
    caption: null, done_at: null, done_by: null, position: null, created_at: now(),
  };
  if (tag.tag === 'gift') db.gifts[id] = { item_id: id, quantity: tag.quantity, claimed: 0, mine: 0 };
  db.items.push(item);
  const list = getList(input.list_id);
  if (list) list.completed_at = null;
  commit();
  const { caption: _c, done_at: _d, done_by: _b, position: _p, created_at: _t, auto_done: _a, open_invite: _o, ...row } = item;
  write(() => supabase.from('items').insert(row), 'your thing');
  if (tag.tag === 'invite' && tag.audience === 'specific') setInvitees(id, tag.invitees);
  input.photos.forEach((uri) => addPhoto(id, uri));
  return id;
}

export function updateItem(itemId: string, patch: Partial<Pick<Item, 'title' | 'notes' | 'date' | 'caption'>>) {
  const item = getItem(itemId);
  if (!item) return;
  Object.assign(item, patch);
  commit();
  write(() => supabase.from('items').update(patch).eq('id', itemId), 'your changes');
}

/** Takes a thing off its list for good, along with its photos, stars and feed posts. */
export function deleteItem(itemId: string) {
  const item = getItem(itemId);
  if (!item || !isMember(item.list_id)) return;
  // photos still uploading are queued ahead of this, so they'll be at their storage path by the time it runs
  const paths = photosFor(itemId).map((p) => (isLocal(p.path) ? `${item.list_id}/${itemId}/${p.id}.jpg` : p.path));
  db.items = db.items.filter((i) => i.id !== itemId);
  db.item_photos = db.item_photos.filter((p) => p.item_id !== itemId);
  db.item_invitees = db.item_invitees.filter((v) => v.item_id !== itemId);
  db.interests = db.interests.filter((i) => i.item_id !== itemId);
  db.borrow_haves = db.borrow_haves.filter((h) => h.item_id !== itemId);
  delete db.gifts[itemId];
  db.events = db.events.filter((e) => e.item_id !== itemId);
  const list = getList(item.list_id);
  if (list) {
    // same rule as the database: a list is finished when it has things and none are open
    const { done, total } = listProgress(list.id);
    if (total === 0 || done < total) list.completed_at = null;
    else list.completed_at ??= now();
  }
  commit();
  write(async () => {
    const res = await supabase.from('items').delete().eq('id', itemId);
    if (!res.error && paths.length) await supabase.storage.from('photos').remove(paths);
    return res;
  }, 'that');
}

/** Adds a picked photo (local file uri): shows it right away, uploads it, then saves the row. */
export function addPhoto(itemId: string, uri: string) {
  const item = getItem(itemId);
  if (!item) return;
  const id = newId();
  const position = db.item_photos.filter((p) => p.item_id === itemId).length;
  db.item_photos.push({ id, item_id: itemId, path: uri, position, added_by: db.me, created_at: now() });
  commit();
  const path = `${item.list_id}/${itemId}/${id}.jpg`;
  write(async () => {
    const up = await uploadImage('photos', path, uri);
    if (up.error) return up;
    db.photoUrls[path] = uri; // keep showing the local copy until the signed link loads
    return supabase.from('item_photos').insert({ id, item_id: itemId, path, position, added_by: db.me });
  }, 'that photo');
}

export function removePhoto(photoId: string) {
  const photo = db.item_photos.find((p) => p.id === photoId);
  if (!photo) return;
  db.item_photos = db.item_photos.filter((p) => p.id !== photoId);
  commit();
  write(async () => {
    const res = await supabase.from('item_photos').delete().eq('id', photoId);
    if (!res.error && !isLocal(photo.path)) await supabase.storage.from('photos').remove([photo.path]);
    return res;
  }, 'that');
}
