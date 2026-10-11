import { db, FeedEvent, Item, List } from './db';
import { canViewList, getList, isMember } from './lists';
import { isFollowing } from './profiles';

/** All: posts from you and people you follow, on lists you can see, newest first. */
export function feedAll(limit = 20): FeedEvent[] {
  return db.events
    .filter((e) => (e.actor_id === db.me || isFollowing(e.actor_id)) && canViewList(e.list_id))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

/** Open Invite: things people are asking about, on lists you can see but aren't on, soonest first. */
export function openInvites(): { item: Item; list: List }[] {
  return db.items
    .filter((i) => i.asking && !i.done_at && canViewList(i.list_id) && !isMember(i.list_id))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((item) => ({ item, list: getList(item.list_id)! }));
}
