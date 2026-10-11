import { commit, db, Item, newId, now, PhotoSource } from './db';
import { getList, isMember, listProgress } from './lists';
import { getProfile } from './profiles';

export const getItem = (id: string) => db.items.find((i) => i.id === id);

export function itemsForList(listId: string) {
  const items = db.items.filter((i) => i.list_id === listId).sort((a, b) => a.position - b.position);
  return {
    open: items.filter((i) => !i.done_at),
    done: items.filter((i) => i.done_at).sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1)),
  };
}

export const photosFor = (itemId: string) =>
  db.item_photos.filter((p) => p.item_id === itemId).sort((a, b) => a.position - b.position);

export const interestedPeople = (itemId: string) =>
  db.interests.filter((i) => i.item_id === itemId).map((i) => getProfile(i.user_id)!).filter(Boolean);

export const isInterested = (itemId: string) => db.interests.some((i) => i.item_id === itemId && i.user_id === db.me);

/** Your own star: only on asking items, and never on a list you're on. */
export function toggleInterest(itemId: string) {
  const item = getItem(itemId);
  if (!item || !item.asking || isMember(item.list_id)) return;
  if (isInterested(itemId)) db.interests = db.interests.filter((i) => !(i.item_id === itemId && i.user_id === db.me));
  else db.interests.push({ item_id: itemId, user_id: db.me, created_at: now() });
  commit();
}

function addEvent(kind: 'item_added' | 'asked' | 'item_done' | 'list_done', item: Item, withItem = true) {
  db.events.push({ id: newId('e'), actor_id: db.me, kind, list_id: item.list_id, item_id: withItem ? item.id : null, created_at: now() });
}

/** The paper plane. Asking again later makes a new post rather than editing the old one. */
export function toggleAsk(itemId: string) {
  const item = getItem(itemId);
  if (!item || !isMember(item.list_id)) return;
  item.asking = !item.asking;
  item.asked_at = item.asking ? now() : null;
  if (item.asking) addEvent('asked', item);
  commit();
}

/** Checking off always posts. Returns true when that finished the whole list. */
export function markDone(itemId: string) {
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  if (!item || !list || item.done_at) return false;
  item.done_at = now();
  item.done_by = db.me;
  addEvent('item_done', item);
  const { done, total } = listProgress(list.id);
  const finished = done === total;
  if (finished) {
    list.completed_at = now();
    addEvent('list_done', item, false);
  }
  commit();
  return finished;
}

export function undoDone(itemId: string) {
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  if (!item || !list) return;
  item.done_at = null;
  item.done_by = null;
  list.completed_at = null;
  db.events = db.events.filter((e) => !(e.kind === 'item_done' && e.item_id === itemId) && !(e.kind === 'list_done' && e.list_id === list.id));
  commit();
}

export type ItemInput = { list_id: string; title: string; notes: string; date: string | null; asking: boolean; photos: PhotoSource[] };

export function addItem(input: ItemInput) {
  const id = newId('item');
  const position = db.items.filter((i) => i.list_id === input.list_id).length;
  const item: Item = {
    id, list_id: input.list_id, title: input.title.trim(), notes: input.notes, date: input.date,
    asking: input.asking, asked_at: input.asking ? now() : null, done_at: null, done_by: null, position,
  };
  db.items.push(item);
  input.photos.forEach((path, i) => db.item_photos.push({ id: newId('photo'), item_id: id, path, position: i, added_by: db.me }));
  const list = getList(input.list_id);
  if (list) list.completed_at = null;
  addEvent('item_added', item);
  if (item.asking) addEvent('asked', item);
  commit();
  return id;
}

export function updateItem(itemId: string, patch: Partial<Pick<Item, 'title' | 'notes' | 'date' | 'caption'>>) {
  const item = getItem(itemId);
  if (!item) return;
  Object.assign(item, patch);
  commit();
}

export function addPhoto(itemId: string, path: PhotoSource) {
  const position = db.item_photos.filter((p) => p.item_id === itemId).length;
  db.item_photos.push({ id: newId('photo'), item_id: itemId, path, position, added_by: db.me });
  commit();
}

export function removePhoto(photoId: string) {
  db.item_photos = db.item_photos.filter((p) => p.id !== photoId);
  commit();
}
