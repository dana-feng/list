import { commit, db, List, newId, now, Visibility } from './db';
import { getProfile, isFollowing } from './profiles';

export const getList = (id: string) => db.lists.find((l) => l.id === id);

export const membership = (listId: string, userId = db.me) =>
  db.list_members.find((m) => m.list_id === listId && m.user_id === userId);

export const isMember = (listId: string, userId = db.me) => membership(listId, userId)?.status === 'joined';

export const listPeople = (listId: string, status: 'joined' | 'invited' = 'joined') =>
  db.list_members.filter((m) => m.list_id === listId && m.status === status).map((m) => getProfile(m.user_id)!).filter(Boolean);

/** Same rule as the can_view_list(list_id) database function. */
export function canViewList(listId: string, userId = db.me) {
  const list = getList(listId);
  if (!list) return false;
  if (membership(listId, userId)) return true;
  if (list.visibility === 'anyone') return true;
  if (list.visibility === 'followers') return isFollowing(list.owner_id, userId);
  return db.list_viewers.some((v) => v.list_id === listId && v.user_id === userId);
}

export function listProgress(listId: string) {
  const items = db.items.filter((i) => i.list_id === listId);
  return { done: items.filter((i) => i.done_at).length, total: items.length };
}

export function progressLabel(listId: string) {
  const { done, total } = listProgress(listId);
  return total > 0 && done === total ? 'all done' : `${done}/${total} done`;
}

export function visibilityLabel(list: List) {
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
    .sort((a, b) => Number(b.invited) - Number(a.invited));
}

export const myLists = () => listsForProfile(db.me).filter((r) => !r.invited).map((r) => r.list);

export const listsDoneCount = (userId: string) =>
  listsForProfile(userId).filter((r) => !r.invited && r.list.completed_at).length;

export function invitedBy(listId: string) {
  const list = getList(listId);
  return list ? getProfile(list.owner_id) : undefined;
}

export function respondInvite(listId: string, join: boolean) {
  const m = membership(listId);
  if (!m || m.status !== 'invited') return;
  if (join) m.status = 'joined';
  else db.list_members = db.list_members.filter((x) => x !== m);
  commit();
}

export function createList(input: { title: string; visibility: Visibility; viewers: string[]; invites: string[] }) {
  const id = newId('list');
  db.lists.push({ id, owner_id: db.me, title: input.title.trim(), visibility: input.visibility, completed_at: null, created_at: now() });
  db.list_members.push({ list_id: id, user_id: db.me, role: 'owner', status: 'joined' });
  input.invites.forEach((user_id) => db.list_members.push({ list_id: id, user_id, role: 'member', status: 'invited' }));
  if (input.visibility === 'specific') input.viewers.forEach((user_id) => db.list_viewers.push({ list_id: id, user_id }));
  // the database trigger would write this
  db.events.push({ id: newId('e'), actor_id: db.me, kind: 'list_created', list_id: id, item_id: null, created_at: now() });
  commit();
  return id;
}

export function setVisibility(listId: string, visibility: Visibility) {
  const list = getList(listId);
  if (!list) return;
  list.visibility = visibility;
  commit();
}

export const viewerIds = (listId: string) => db.list_viewers.filter((v) => v.list_id === listId).map((v) => v.user_id);

export function setViewers(listId: string, userIds: string[]) {
  db.list_viewers = db.list_viewers.filter((v) => v.list_id !== listId).concat(userIds.map((user_id) => ({ list_id: listId, user_id })));
  commit();
}

export function inviteMembers(listId: string, userIds: string[]) {
  userIds.filter((u) => !membership(listId, u)).forEach((user_id) => db.list_members.push({ list_id: listId, user_id, role: 'member', status: 'invited' }));
  commit();
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
