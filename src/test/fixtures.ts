// Builds the local copy (db.ts) for a test: who's signed in, and the people, lists and items around
// them. Each helper fills in sensible defaults, so a test only spells out what it's about.
import { db, emptyTables, Item, List, ListMember, Profile } from '@/api/db';

const T0 = '2026-10-01T12:00:00.000Z';
let n = 0;
const next = (prefix: string) => `${prefix}${++n}`;

/** Empties every table and signs in as a fresh person, who is returned. */
export function signIn(fields: Partial<Profile> = {}): Profile {
  Object.assign(db, emptyTables());
  db.status = 'ready';
  const me = person({ username: 'me', name: 'Me', ...fields });
  db.me = me.id;
  return me;
}

export function person(fields: Partial<Profile> = {}): Profile {
  const id = fields.id ?? next('user-');
  const p: Profile = { id, username: id.replace(/[^a-z0-9]/g, ''), name: id, profile_photo: null, bio: '', created_at: T0, ...fields };
  db.profiles.push(p);
  return p;
}

export function follow(follower: Profile, followee: Profile) {
  db.follows.push({ follower_id: follower.id, followee_id: followee.id, created_at: T0 });
}

/** A list with `owners` joined (the signed-in person by default). */
export function list(fields: Partial<List> = {}, owners: Profile[] | 'me' = 'me'): List {
  const l: List = { id: next('list-'), title: 'a list', visibility: 'followers', completed_at: null, created_at: T0, ...fields };
  db.lists.push(l);
  const ids = owners === 'me' ? [db.me] : owners.map((o) => o.id);
  ids.forEach((user_id) => member(l, user_id));
  return l;
}

export function member(l: List, user_id: string, status: ListMember['status'] = 'joined') {
  db.list_members.push({ list_id: l.id, user_id, status, invited_by: null, created_at: T0 });
}

export function item(l: List, fields: Partial<Item> = {}): Item {
  const i: Item = {
    id: next('item-'), list_id: l.id, title: 'an item', notes: '', date: null, tag: null, open_invite: false,
    invite_audience: 'followers', gift_quantity: 1, auto_done: false, caption: null, done_at: null, done_by: null,
    position: null, created_at: T0, ...fields,
  };
  db.items.push(i);
  return i;
}

/** A gift on someone else's list: `quantity` wanted, `claimed` by others, `mine` by you. */
export function gift(l: List, quantity: number, claimed = 0, mine = 0, fields: Partial<Item> = {}): Item {
  const i = item(l, { tag: 'gift', gift_quantity: quantity, ...fields });
  db.gifts[i.id] = { item_id: i.id, quantity, claimed: claimed + mine, mine };
  return i;
}
