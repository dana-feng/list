import { commit, db, Item, now } from './db';
import { getList, isMember, listProgress } from './lists';
import { getProfile } from './profiles';
import { supabase } from './supabase';
import { isLocal, newId, uploadImage, write } from './sync';

export const getItem = (id: string) => db.items.find((i) => i.id === id);

export function itemsForList(listId: string) {
  const items = db.items.filter((i) => i.list_id === listId).sort((a, b) => b.created_at.localeCompare(a.created_at));
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

export const isInterested = (itemId: string) => db.interests.some((i) => i.item_id === itemId && i.user_id === db.me);

/** Your own star: only on open invites, and never on a list you're on. */
export function toggleInterest(itemId: string) {
  const item = getItem(itemId);
  if (!item || !item.open_invite || isMember(item.list_id)) return;
  if (isInterested(itemId)) {
    db.interests = db.interests.filter((i) => !(i.item_id === itemId && i.user_id === db.me));
    commit();
    write(() => supabase.from('interests').delete().eq('item_id', itemId).eq('user_id', db.me), 'that');
  } else {
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
  const { done, total } = listProgress(list.id);
  const finished = done === total;
  if (finished) list.completed_at = now();
  commit();
  const done_at = item.done_at;
  write(() => supabase.from('items').update({ done_at }).eq('id', itemId), 'that check-off');
  return finished;
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

export type ItemInput = { list_id: string; title: string; notes: string; date: string | null; open_invite: boolean; photos: string[] };

export function addItem(input: ItemInput) {
  const id = newId();
  const item: Item = {
    id, list_id: input.list_id, title: input.title.trim(), notes: input.notes, date: input.date,
    open_invite: input.open_invite, caption: null, done_at: null, done_by: null, created_at: now(),
  };
  db.items.push(item);
  const list = getList(input.list_id);
  if (list) list.completed_at = null;
  commit();
  const { caption: _c, done_at: _d, done_by: _b, created_at: _t, ...row } = item;
  write(() => supabase.from('items').insert(row), 'your thing');
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
  db.interests = db.interests.filter((i) => i.item_id !== itemId);
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
