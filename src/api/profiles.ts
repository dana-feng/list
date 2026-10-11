import { commit, db, now, Profile } from './db';

export const me = () => db.profiles.find((p) => p.id === db.me)!;
export const getProfile = (id: string) => db.profiles.find((p) => p.id === id);
export const getProfileByUsername = (username: string) => db.profiles.find((p) => p.username === username);

export const isFollowing = (followee: string, follower = db.me) =>
  db.follows.some((f) => f.follower_id === follower && f.followee_id === followee);

export function toggleFollow(userId: string) {
  if (userId === db.me) return;
  if (isFollowing(userId)) db.follows = db.follows.filter((f) => !(f.follower_id === db.me && f.followee_id === userId));
  else db.follows.push({ follower_id: db.me, followee_id: userId, created_at: now() });
  commit();
}

export function followCounts(userId: string) {
  const p = getProfile(userId);
  return {
    followers: (p?.base_followers ?? 0) + db.follows.filter((f) => f.followee_id === userId).length,
    following: (p?.base_following ?? 0) + db.follows.filter((f) => f.follower_id === userId).length,
  };
}

/** People who follow you, for the "who can see it" and "who's on it" pickers. */
export const myFollowers = () =>
  db.follows.filter((f) => f.followee_id === db.me).map((f) => getProfile(f.follower_id)!).filter(Boolean);

export function searchPeople(q: string): Profile[] {
  const s = q.trim().toLowerCase().replace(/^@/, '');
  if (!s) return [];
  return db.profiles.filter((p) => p.id !== db.me && (p.name.toLowerCase().startsWith(s) || p.username.toLowerCase().startsWith(s)));
}

/** Stand-in for the username_available(text) database function. */
export function usernameAvailable(username: string) {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(u)) return false;
  return !db.profiles.some((p) => p.username === u && p.id !== db.me);
}

/** Stand-in for match_contacts(phones text[]). */
export const matchContacts = () => db.contacts.map((id) => getProfile(id)!).filter(Boolean);

export function updateProfile(patch: Partial<Pick<Profile, 'name' | 'username' | 'avatar_path'>>) {
  Object.assign(me(), patch);
  commit();
}

export function signIn() {
  db.signedIn = true;
  commit();
}

export function signOut() {
  db.signedIn = false;
  commit();
}
