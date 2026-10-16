// The notifications screen. The database writes the rows (see the notifications migration);
// this loads a page of them, marks them read, and turns each into a sentence.
import { commit, db, Notification, Profile } from './db';
import { getItem } from './items';
import { getList } from './lists';
import { getProfile } from './profiles';
import { supabase } from './supabase';

const PAGE = 60;

/** Newest first. `null` when they couldn't be loaded. */
export async function loadNotifications(): Promise<Notification[] | null> {
  const { data, error } = await supabase.from('notifications').select('*').order('updated_at', { ascending: false }).limit(PAGE);
  if (error) {
    console.warn("couldn't load notifications", error.message);
    return null;
  }
  return data ?? [];
}

/** Everything on the screen is now seen (the dot goes) and read (new events start new rows). */
export async function markNotificationsRead() {
  db.unseenNotifications = false;
  commit();
  const { error } = await supabase.rpc('mark_notifications_read');
  if (error) console.warn("couldn't mark notifications read", error.message);
}

/** A run of words; `strong` ones are names and titles, drawn in medium weight. */
export type Part = { text: string; strong?: boolean };

export type NotificationView = {
  people: Profile[];
  parts: Part[];
  /** a comment's words, under the sentence */
  quote?: string;
  /** where a tap goes */
  href: string | null;
};

const s = (text: string): Part => ({ text, strong: true });
const p = (text: string): Part => ({ text });

/** "jo", "jo and tochi", "jo, tochi and 2 others" */
function who(people: Profile[]): Part[] {
  const named = people.map((x) => (x.id === db.me ? 'you' : x.name));
  if (named.length <= 1) return [s(named[0] ?? 'someone')];
  if (named.length === 2) return [s(`${named[0]} and ${named[1]}`)];
  const rest = named.length - 2;
  return [s(`${named[0]}, ${named[1]}`), p(` and ${rest} ${rest === 1 ? 'other' : 'others'}`)];
}

export function describeNotification(n: Notification): NotificationView {
  const people = n.actor_ids.map((id) => getProfile(id)).filter((x): x is Profile => !!x);
  const item = n.item_id ? getItem(n.item_id) : undefined;
  const list = n.list_id ? getList(n.list_id) : undefined;
  const thing = item?.title ?? list?.title ?? 'a post';
  const listName = list?.title ?? 'a list';
  const href = item ? `/item/${item.id}` : list ? `/list/${list.id}` : null;
  const many = n.count > 1;
  const by = who(people);
  const quote = n.body ? `“${n.body}”` : undefined;

  switch (n.kind) {
    case 'list_invite':
      return { people, href, parts: [...by, p(' invited you to the list '), s(listName)] };
    case 'viewer_added':
      return { people, href, parts: [...by, p(' shared '), s(listName), p(' with you')] };
    case 'item_invite':
      return { people, href, parts: [...by, p(' invited you to '), s(thing)] };
    case 'invite_accepted':
      return { people, href, parts: [...by, p(' joined '), s(listName)] };
    case 'mention':
      return { people, href, quote, parts: [...by, p(' tagged you on '), s(thing)] };
    case 'comment':
      return { people, href, quote, parts: [...by, p(' commented on '), s(thing)] };
    case 'reply':
      return { people, href, quote, parts: [...by, p(' replied to you on '), s(thing)] };
    case 'like':
      return { people, href, parts: [...by, p(' liked '), s(thing)] };
    case 'interested':
      return { people, href, parts: [...by, p(people.length > 1 ? ' are interested in ' : ' is interested in '), s(thing)] };
    case 'item_added':
      return many
        ? { people, href: list ? `/list/${list.id}` : href, parts: [...by, p(` added ${n.count} things to `), s(listName)] }
        : { people, href, parts: [...by, p(' added '), s(thing), p(' to '), s(listName)] };
    case 'item_done':
      return many
        ? { people, href: list ? `/list/${list.id}` : href, parts: [...by, p(` crossed off ${n.count} things on `), s(listName)] }
        : { people, href, parts: [...by, p(' crossed off '), s(thing)] };
    case 'borrow_has':
      return { people, href, parts: [...by, p(people.length > 1 ? ' have ' : ' has '), s(thing), p(' you can borrow')] };
    case 'list_done':
      return { people, href: list ? `/list/${list.id}` : href, parts: [s(listName), p(' is finished')] };
  }
}
