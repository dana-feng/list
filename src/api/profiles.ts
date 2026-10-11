import * as Contacts from 'expo-contacts';
import { commit, db, now, Profile } from './db';
import { supabase } from './supabase';
import { newId, uploadImage, write } from './sync';

/** Your profile. Blank during sign-up, before the profile step saves it. */
export const me = (): Profile =>
  db.profiles.find((p) => p.id === db.me) ?? { id: db.me, username: '', name: '', profile_photo: null, created_at: '' };
const myRow = () => db.profiles.find((p) => p.id === db.me);
export const getProfile = (id: string) => db.profiles.find((p) => p.id === id);
export const getProfileByUsername = (username: string) => db.profiles.find((p) => p.username === username);

export const isFollowing = (followee: string, follower = db.me) =>
  db.follows.some((f) => f.follower_id === follower && f.followee_id === followee);

export function toggleFollow(userId: string) {
  if (userId === db.me) return;
  if (isFollowing(userId)) {
    db.follows = db.follows.filter((f) => !(f.follower_id === db.me && f.followee_id === userId));
    commit();
    write(() => supabase.from('follows').delete().eq('follower_id', db.me).eq('followee_id', userId), 'that unfollow');
  } else {
    db.follows.push({ follower_id: db.me, followee_id: userId, created_at: now() });
    commit();
    write(() => supabase.from('follows').insert({ follower_id: db.me, followee_id: userId }), 'that follow');
  }
}

export function followCounts(userId: string) {
  return {
    followers: db.follows.filter((f) => f.followee_id === userId).length,
    following: db.follows.filter((f) => f.follower_id === userId).length,
  };
}

/** Newest first. */
const byNewest = (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at);
export const followersOf = (userId: string) =>
  db.follows.filter((f) => f.followee_id === userId).sort(byNewest).map((f) => getProfile(f.follower_id)!).filter(Boolean);
export const followingOf = (userId: string) =>
  db.follows.filter((f) => f.follower_id === userId).sort(byNewest).map((f) => getProfile(f.followee_id)!).filter(Boolean);

/** People who follow you, for the "who can see it" and "who's on it" pickers. */
export const myFollowers = () =>
  db.follows.filter((f) => f.followee_id === db.me).map((f) => getProfile(f.follower_id)!).filter(Boolean);

export function searchPeople(q: string): Profile[] {
  const s = q.trim().toLowerCase().replace(/^@/, '');
  if (!s) return [];
  return db.profiles.filter((p) => p.id !== db.me && (p.name.toLowerCase().startsWith(s) || p.username.toLowerCase().startsWith(s)));
}

/** Quick local check for the live message; the database's unique rule is the real guard. */
export function usernameAvailable(username: string) {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(u)) return false;
  return !db.profiles.some((p) => p.username === u && p.id !== db.me);
}

/** Find your people: asks for contacts, then returns the profiles whose numbers match. */
export async function matchContacts(): Promise<Profile[]> {
  const { granted } = await Contacts.requestPermissionsAsync();
  if (!granted) return [];
  const contacts = await Contacts.Contact.getAllDetails([Contacts.ContactField.PHONES]);
  const phones = contacts.flatMap((c) => (c.phones ?? []).map((p) => p.number ?? '')).filter(Boolean);
  if (!phones.length) return [];
  const { data, error } = await supabase.rpc('match_contacts', { p_phones: phones });
  if (error) {
    console.warn('match_contacts failed', error.message);
    return [];
  }
  return (data ?? []) as Profile[];
}

/** Creates your profile (sign-up) or updates it (settings). */
export function saveProfile(patch: { name: string; username: string }) {
  const existing = myRow();
  const row = { id: db.me, name: patch.name.trim(), username: patch.username.trim().toLowerCase() };
  if (existing) Object.assign(existing, row);
  else db.profiles.push({ ...row, profile_photo: null, created_at: now() });
  commit();
  return write(() => supabase.from('profiles').upsert(row), 'your profile');
}

/** Uploads a new profile photo and points your profile at it. Needs the profile row to exist. */
export function setProfilePhoto(uri: string) {
  const person = myRow();
  if (person) {
    person.profile_photo = uri; // show the picked photo right away
    commit();
  }
  const path = `${db.me}/${newId()}.jpg`;
  return write(async () => {
    const up = await uploadImage('avatars', path, uri);
    if (up.error) return up;
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    return supabase.from('profiles').update({ profile_photo: url }).eq('id', db.me);
  }, 'your photo');
}
