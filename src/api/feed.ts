import { db, FeedEvent, Item, ItemTag, List, Profile } from './db';
import { canClaimGift, isInvitedTo } from './items';
import { getList, isMember, listPeople } from './lists';
import { getProfile, isFollowing } from './profiles';

/**
 * All: posts from people you follow, newest first. Never your own, and never open invites:
 * those live under Open Invite. The database already left out lists you can't see.
 */
export function feedAll(limit = 20): FeedEvent[] {
  return db.events
    .filter((e) => e.kind !== 'open_invite' && e.actor_id !== db.me && isFollowing(e.actor_id) && getList(e.list_id))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

/**
 * Someone's posts, for the activity tab on their profile: what they started and added, plus
 * every "did" and "finished" on lists they're on, since those belong to everyone on the list.
 * Only what you're allowed to see comes back from the database in the first place.
 */
export function activityFor(userId: string, limit = 50): FeedEvent[] {
  const shared = (e: FeedEvent) => (e.kind === 'item_done' || e.kind === 'list_done') && isMember(e.list_id, userId);
  return db.events
    .filter((e) => e.kind !== 'open_invite' && getList(e.list_id) && (e.actor_id === userId || shared(e)))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export type Ask = { item: Item; list: List };

/**
 * Whether an item is an ask you'd see: tagged and still open. An invite only counts for people in
 * its audience (to everyone else it's just a thing on the list). A gift drops out once nobody else
 * is needed, unless you're one of the people getting it. People on the list always see their own.
 */
export function isAskFor(item: Item, viewer = db.me) {
  if (!item.tag || !getList(item.list_id)) return false;
  if (isMember(item.list_id, viewer)) return !item.done_at;
  if (viewer !== db.me) return false;
  if (item.tag === 'invite') return isInvitedTo(item.id);
  if (item.tag === 'gift') return canClaimGift(item.id);
  return !item.done_at;
}

const byDate = (a: Ask, b: Ask) => (a.item.date ?? '9999').localeCompare(b.item.date ?? '9999');

/** Home's asks tab: what your people want company for, as gifts, or to borrow, on lists you aren't on. Soonest first. */
export function asks(only: ItemTag[] = []): Ask[] {
  return db.items
    .filter((i) => !isMember(i.list_id) && isAskFor(i) && (!only.length || only.includes(i.tag!)))
    .map((item) => ({ item, list: getList(item.list_id)! }))
    .sort(byDate);
}

/** The asks tab on a profile: theirs (on lists they're on) that you'd see. Yours, on your own profile. */
export function asksOf(userId: string, only: ItemTag[] = []): Ask[] {
  return db.items
    .filter((i) => isMember(i.list_id, userId) && (userId === db.me ? isAskFor(i) : !isMember(i.list_id) && isAskFor(i)) && (!only.length || only.includes(i.tag!)))
    .map((item) => ({ item, list: getList(item.list_id)! }))
    .sort(byDate);
}

/** Who put an open invite out: whoever last turned it on, or the list's people if that isn't visible to you. */
export function inviteHosts(item: Item): Profile[] {
  const latest = db.events
    .filter((e) => e.kind === 'open_invite' && e.item_id === item.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const host = latest ? getProfile(latest.actor_id) : undefined;
  return host ? [host] : listPeople(item.list_id);
}
