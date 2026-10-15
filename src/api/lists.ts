import { commit, db, List, now, Visibility } from './db';
import { getProfile, isFollowing } from './profiles';
import { supabase } from './supabase';
import { isLocal, newId, write } from './sync';

export const getList = (id: string) => db.lists.find((l) => l.id === id);

export const membership = (listId: string, userId = db.me) =>
  db.list_members.find((m) => m.list_id === listId && m.user_id === userId);

export const isMember = (listId: string, userId = db.me) => membership(listId, userId)?.status === 'joined';

export const listPeople = (listId: string, status: 'joined' | 'invited' = 'joined') =>
  db.list_members
    .filter((m) => m.list_id === listId && m.status === status)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => getProfile(m.user_id)!)
    .filter(Boolean);

/** You follow someone who's on the list: what "followers" means for a list and for an open invite. */
export const followsSomeoneOn = (listId: string) =>
  db.list_members.some((m) => m.list_id === listId && m.status === 'joined' && isFollowing(m.user_id));

/**
 * Whether you can see the whole list. Same rule as can_view_list in the database.
 * Having the list locally isn't enough: an open invite that includes you also brings its
 * list's name and people along, without the rest of what's on it.
 */
export function canViewList(listId: string) {
  const list = getList(listId);
  if (!list) return false;
  if (membership(listId)) return true;
  if (list.visibility === 'anyone') return true;
  if (list.visibility === 'followers') return followsSomeoneOn(listId);
  if (list.visibility === 'specific') return db.list_viewers.some((v) => v.list_id === listId && v.user_id === db.me);
  return false;
}

export function listProgress(listId: string) {
  const items = db.items.filter((i) => i.list_id === listId);
  return { done: items.filter((i) => i.done_at).length, total: items.length };
}

/** Finished = it has things on it and every one is crossed off. Same rule the database uses for completed_at. */
export function isListDone(listId: string) {
  const { done, total } = listProgress(listId);
  return total > 0 && done === total;
}

/** "2/5 done" for a folder's tab. Nothing once the list is finished: the tab stays blank. */
export function progressLabel(listId: string) {
  const { done, total } = listProgress(listId);
  return total > 0 && done === total ? '' : `${done}/${total} done`;
}

export function visibilityLabel(list: List) {
  if (list.visibility === 'just_me') return 'owners';
  if (list.visibility !== 'specific') return list.visibility;
  const n = db.list_viewers.filter((v) => v.list_id === list.id).length;
  return `${n} ${n === 1 ? 'person' : 'people'}`;
}

/** Lists on someone's profile: the ones they're on that you're allowed to see. Your own invites come first. */
export function listsForProfile(userId: string) {
  const rows = db.list_members.filter((m) => m.user_id === userId && (m.status === 'joined' || userId === db.me));
  return rows
    .filter((m) => canViewList(m.list_id))
    .map((m) => ({ list: getList(m.list_id)!, invited: m.status === 'invited' }))
    .sort((a, b) => Number(b.invited) - Number(a.invited) || b.list.created_at.localeCompare(a.list.created_at));
}

export const myLists = () => listsForProfile(db.me).filter((r) => !r.invited).map((r) => r.list);

export const listsDoneCount = (userId: string) =>
  listsForProfile(userId).filter((r) => !r.invited && r.list.completed_at).length;

/** Who invited you to a list. */
export function invitedBy(listId: string) {
  const by = membership(listId)?.invited_by;
  return by ? getProfile(by) : undefined;
}

export function respondInvite(listId: string, join: boolean) {
  const m = membership(listId);
  if (!m || m.status !== 'invited') return;
  if (join) {
    m.status = 'joined';
    commit();
    write(() => supabase.from('list_members').update({ status: 'joined' }).eq('list_id', listId).eq('user_id', db.me), 'joining');
  } else {
    db.list_members = db.list_members.filter((x) => x !== m);
    commit();
    write(() => supabase.from('list_members').delete().eq('list_id', listId).eq('user_id', db.me), 'that');
  }
}

/** Someone else has joined, so you can leave without the list going with you. */
export const canLeaveList = (listId: string) =>
  isMember(listId) && db.list_members.some((m) => m.list_id === listId && m.status === 'joined' && m.user_id !== db.me);

/** Takes you off a list's owners. The others keep it. */
export function leaveList(listId: string) {
  if (!canLeaveList(listId)) return;
  db.list_members = db.list_members.filter((m) => !(m.list_id === listId && m.user_id === db.me));
  commit();
  write(() => supabase.from('list_members').delete().eq('list_id', listId).eq('user_id', db.me), 'leaving');
}

/** Takes back an invite that hasn't been accepted yet. Anyone on the list can. */
export function cancelInvite(listId: string, userId: string) {
  const m = membership(listId, userId);
  if (!m || m.status !== 'invited' || !isMember(listId)) return;
  db.list_members = db.list_members.filter((x) => x !== m);
  commit();
  write(() => supabase.from('list_members').delete().eq('list_id', listId).eq('user_id', userId).eq('status', 'invited'), 'that');
}

export function createList(input: { title: string; visibility: Visibility; viewers: string[]; invites: string[] }) {
  const id = newId();
  const title = input.title.trim();
  const created_at = now();
  db.lists.push({ id, title, visibility: input.visibility, completed_at: null, created_at });
  db.list_members.push({ list_id: id, user_id: db.me, status: 'joined', invited_by: null, created_at });
  input.invites.forEach((user_id) => db.list_members.push({ list_id: id, user_id, status: 'invited', invited_by: db.me, created_at }));
  if (input.visibility === 'specific') input.viewers.forEach((user_id) => db.list_viewers.push({ list_id: id, user_id }));
  commit();
  write(
    () => supabase.rpc('create_list', { p_title: title, p_visibility: input.visibility, p_viewers: input.viewers, p_invites: input.invites, p_id: id }),
    'your list',
  );
  return id;
}

export function renameList(listId: string, title: string) {
  const list = getList(listId);
  title = title.trim();
  if (!list || !title || title === list.title) return;
  list.title = title;
  commit();
  write(() => supabase.from('lists').update({ title }).eq('id', listId), 'the new name');
}

export function setVisibility(listId: string, visibility: Visibility) {
  const list = getList(listId);
  if (!list) return;
  list.visibility = visibility;
  commit();
  write(() => supabase.from('lists').update({ visibility }).eq('id', listId), 'who can see it');
}

export const viewerIds = (listId: string) => db.list_viewers.filter((v) => v.list_id === listId).map((v) => v.user_id);

export function setViewers(listId: string, userIds: string[]) {
  const before = viewerIds(listId);
  const added = userIds.filter((u) => !before.includes(u));
  const removed = before.filter((u) => !userIds.includes(u));
  db.list_viewers = db.list_viewers.filter((v) => v.list_id !== listId).concat(userIds.map((user_id) => ({ list_id: listId, user_id })));
  commit();
  if (removed.length) write(() => supabase.from('list_viewers').delete().eq('list_id', listId).in('user_id', removed), 'who can see it');
  if (added.length) write(() => supabase.from('list_viewers').insert(added.map((user_id) => ({ list_id: listId, user_id }))), 'who can see it');
}

export function inviteMembers(listId: string, userIds: string[]) {
  const fresh = userIds.filter((u) => !membership(listId, u));
  if (!fresh.length) return;
  const created_at = now();
  fresh.forEach((user_id) => db.list_members.push({ list_id: listId, user_id, status: 'invited', invited_by: db.me, created_at }));
  commit();
  write(
    () => supabase.from('list_members').insert(fresh.map((user_id) => ({ list_id: listId, user_id, status: 'invited', invited_by: db.me }))),
    'those invites',
  );
}

/** Deletes a list for everyone on it, along with its items, photos and feed posts. */
export function deleteList(listId: string) {
  if (!getList(listId) || !isMember(listId)) return;
  const itemIds = db.items.filter((i) => i.list_id === listId).map((i) => i.id);
  // photos still uploading are queued ahead of this, so they'll be at their storage path by the time it runs
  const paths = db.item_photos
    .filter((p) => itemIds.includes(p.item_id))
    .map((p) => (isLocal(p.path) ? `${listId}/${p.item_id}/${p.id}.jpg` : p.path));
  db.lists = db.lists.filter((l) => l.id !== listId);
  db.list_members = db.list_members.filter((m) => m.list_id !== listId);
  db.list_viewers = db.list_viewers.filter((v) => v.list_id !== listId);
  db.items = db.items.filter((i) => i.list_id !== listId);
  db.item_photos = db.item_photos.filter((p) => !itemIds.includes(p.item_id));
  db.item_invitees = db.item_invitees.filter((v) => !itemIds.includes(v.item_id));
  db.interests = db.interests.filter((i) => !itemIds.includes(i.item_id));
  db.events = db.events.filter((e) => e.list_id !== listId);
  commit();
  write(async () => {
    // photos go first: the storage rules only let people on the list remove them, and once the list is gone nobody is
    if (paths.length) {
      const files = await supabase.storage.from('photos').remove(paths);
      if (files.error) return files;
    }
    return supabase.from('lists').delete().eq('id', listId);
  }, 'that');
}

// Draft for list/new, so the people pickers can edit it before the list exists.
export const emptyDraft = () => ({ title: '', visibility: 'followers' as Visibility, viewers: [] as string[], invites: [] as string[] });
export let listDraft = emptyDraft();

export function updateDraft(patch: Partial<ReturnType<typeof emptyDraft>>) {
  listDraft = { ...listDraft, ...patch };
  commit();
}

export function resetDraft() {
  listDraft = emptyDraft();
  commit();
}
