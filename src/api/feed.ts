import { db, FeedEvent, Item, List } from './db';
import { isInvitedTo } from './items';
import { getList, isMember } from './lists';
import { isFollowing } from './profiles';

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

/** Open Invite: open invites that include you, on lists you aren't on, soonest first. */
export function openInvites(): { item: Item; list: List }[] {
  return db.items
    .filter((i) => isInvitedTo(i.id) && getList(i.list_id) && !isMember(i.list_id))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((item) => ({ item, list: getList(item.list_id)! }));
}
