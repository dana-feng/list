import { useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import { commit, db, now, Profile } from './db';
import { supabase } from './supabase';
import { newId, uploadImage, write } from './sync';

/** Your profile. Blank during sign-up, before the profile step saves it. */
export const me = (): Profile =>
  db.profiles.find((p) => p.id === db.me) ?? { id: db.me, username: '', name: '', profile_photo: null, bio: '', created_at: '' };
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

// ---------------------------------------------------------------------------
// People you aren't connected to yet
// ---------------------------------------------------------------------------
// The database only hands over the profiles of people you're connected to (see connected_ids in
// the launch_privacy migration). Anyone else comes from search, a username or a list of ids, each
// rate limited. Whoever turns up that way is kept here so a reload doesn't drop them.

const found = new Map<string, Profile>();

/** Adds profiles that came from a lookup to what's on the phone, and keeps them across reloads. */
function remember(people: Profile[] | null | undefined) {
  if (!people?.length) return;
  let changed = false;
  for (const p of people) {
    found.set(p.id, p);
    const i = db.profiles.findIndex((x) => x.id === p.id);
    if (i < 0) db.profiles.push(p);
    else db.profiles[i] = p;
    changed = true;
  }
  if (changed) commit();
}

/** What a reload should keep besides what the database sent: people found by a lookup. */
export const foundProfiles = (): Profile[] => [...found.values()];

/** Forget lookups, at sign-out. */
export const forgetFound = () => found.clear();

/** Searches everyone by the start of their username or name (2 characters at least). Results land in db.profiles. */
export async function findPeople(q: string) {
  const s = q.trim().toLowerCase().replace(/^@/, '');
  if (s.length < 2) return;
  const { data, error } = await supabase.rpc('search_profiles', { p_query: s });
  if (!error) remember(data as Profile[]);
}

/** While a search box has `q` in it, also searches everyone, a moment after typing stops. */
export function useFindPeople(q: string) {
  useEffect(() => {
    const t = setTimeout(() => findPeople(q), 300);
    return () => clearTimeout(t);
  }, [q]);
}

/** Looks up one username (a shared profile link). */
export async function findByUsername(username: string) {
  if (getProfileByUsername(username)) return;
  const { data, error } = await supabase.rpc('profile_by_username', { p_username: username });
  if (!error) remember(data as Profile[]);
}

/** Looks up people whose ids are already here without their profiles (a stranger's followers). */
export async function findByIds(ids: string[]) {
  const missing = [...new Set(ids)].filter((id) => !getProfile(id)).slice(0, 100);
  if (!missing.length) return;
  const { data, error } = await supabase.rpc('profiles_by_ids', { p_ids: missing });
  if (!error) remember(data as Profile[]);
}

/** Who's on the phone matching the start of a name or username. findPeople() fills in the rest. */
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
  remember(data as Profile[]);
  return (data ?? []) as Profile[];
}

/** Longest bio the database takes. */
export const BIO_MAX = 150;

/** Creates your profile (sign-up) or updates it (settings). */
export function saveProfile(patch: { name: string; username: string; bio?: string }) {
  const existing = myRow();
  const row: { id: string; name: string; username: string; bio?: string } = { id: db.me, name: patch.name.trim(), username: patch.username.trim().toLowerCase() };
  // sign-up doesn't ask for a bio, so leave whatever is saved alone unless one is given
  if (patch.bio !== undefined) row.bio = patch.bio.replace(/\s+/g, ' ').trim().slice(0, BIO_MAX);
  if (existing) Object.assign(existing, row);
  else db.profiles.push({ bio: '', ...row, profile_photo: null, created_at: now() });
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

/** Takes your profile photo off, back to your initial, and removes the file. */
export function removeProfilePhoto() {
  const person = myRow();
  if (!person?.profile_photo) return;
  // the file's path inside the avatars bucket, from its public URL; nothing to remove if it never finished uploading
  const path = person.profile_photo.split('/avatars/')[1];
  person.profile_photo = null;
  commit();
  return write(async () => {
    const res = await supabase.from('profiles').update({ profile_photo: null }).eq('id', db.me);
    if (res.error || !path) return res;
    return supabase.storage.from('avatars').remove([decodeURIComponent(path)]);
  }, 'your photo');
}
