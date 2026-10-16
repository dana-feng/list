// Blocking and reporting. Someone you block disappears from everything you see (the database
// hides their profile, lists, posts and comments), and you from theirs; you stop following
// each other. Reports go to a table only the team can read.
import { commit, db, Profile } from './db';
import { getProfile } from './profiles';
import { supabase } from './supabase';
import { write } from './sync';

export const isBlocked = (userId: string) => db.blocked.some((p) => p.id === userId);
export const blockedByUsername = (username: string) => db.blocked.find((p) => p.username === username);

export function block(person: Profile) {
  if (person.id === db.me || isBlocked(person.id)) return;
  db.blocked.unshift(person);
  db.profiles = db.profiles.filter((p) => p.id !== person.id);
  db.follows = db.follows.filter((f) => !(
    (f.follower_id === db.me && f.followee_id === person.id) || (f.follower_id === person.id && f.followee_id === db.me)));
  commit();
  write(() => supabase.from('blocks').insert({ blocker_id: db.me, blocked_id: person.id }), 'that block');
}

/** They come back once the refresh after this lands. Follows don't: those were removed for good. */
export function unblock(userId: string) {
  const person = db.blocked.find((p) => p.id === userId);
  if (!person) return;
  db.blocked = db.blocked.filter((p) => p.id !== userId);
  if (!getProfile(userId)) db.profiles.push(person);
  commit();
  write(() => supabase.from('blocks').delete().eq('blocker_id', db.me).eq('blocked_id', userId), 'that unblock');
}

/** Why, in the order the report sheet lists them. The key is what's saved. */
export const REPORT_REASONS = [
  { key: 'spam', label: 'spam' },
  { key: 'harassment', label: 'harassment or hate' },
  { key: 'inappropriate', label: 'inappropriate content' },
  { key: 'other', label: 'something else' },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['key'];

/**
 * What's being reported. `profile_id` is whoever's responsible (the person, the comment's author,
 * whoever added the item or made the list), so reports about one person can be found together;
 * it's left out when that isn't known.
 * `content` is a copy of the words, kept in case they're deleted before anyone looks.
 */
export type ReportTarget = {
  profile_id?: string;
  list_id?: string;
  item_id?: string;
  comment_id?: string;
  content?: string;
};

export function report(target: ReportTarget, reason: ReportReason) {
  return write(
    () => supabase.from('reports').insert({ reporter_id: db.me, reason, ...target, content: (target.content ?? '').slice(0, 2000) }),
    'your report',
  );
}
