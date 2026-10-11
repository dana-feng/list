// Moves data between the local copy (db.ts) and Supabase.
//
// Reads: refresh() reloads every table. Each table's rules in the database only return
// rows the signed-in person may see, so "select everything" is the right query here.
// Writes: the api/ files change the local copy first so the screen updates instantly,
// then queue the database call with write(). After each write we refresh, which picks up
// what the database's triggers did (feed posts, list completion) and undoes the local
// change if the write was refused.
import { Alert, AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Session, User } from '@supabase/supabase-js';
import { commit, db, emptyTables } from './db';
import { supabase } from './supabase';

export const newId = () => randomUUID();

const FEED_LIMIT = 300;
const PHOTO_URL_SECONDS = 60 * 60 * 24 * 7;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

let inFlight: Promise<void> | null = null;
let again = false;

/** Reload everything you can see. Calls made while one is running are merged into one more run. */
export function refresh(): Promise<void> {
  if (!db.me) return Promise.resolve();
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    try {
      do {
        again = false;
        await load();
      } while (again);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function load() {
  const [profiles, follows, lists, members, viewers, items, photos, interests, events] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('follows').select('*'),
    supabase.from('lists').select('*'),
    supabase.from('list_members').select('*'),
    supabase.from('list_viewers').select('*'),
    supabase.from('items').select('*'),
    supabase.from('item_photos').select('*'),
    supabase.from('interests').select('*'),
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(FEED_LIMIT),
  ]);
  const failed = [profiles, follows, lists, members, viewers, items, photos, interests, events].find((r) => r.error);
  if (failed?.error) {
    console.warn('refresh failed', failed.error.message);
    return;
  }

  db.profiles = profiles.data ?? [];
  db.follows = follows.data ?? [];
  db.lists = lists.data ?? [];
  db.list_members = members.data ?? [];
  db.list_viewers = viewers.data ?? [];
  db.items = items.data ?? [];
  db.item_photos = photos.data ?? [];
  db.interests = interests.data ?? [];
  db.events = events.data ?? [];

  await signPhotoUrls();
  if (db.status === 'needsProfile' || db.status === 'ready') {
    db.status = db.profiles.some((p) => p.id === db.me) ? 'ready' : 'needsProfile';
  }
  commit();
}

/** Photos live in a private bucket, so each one needs a signed link to display. */
async function signPhotoUrls() {
  const missing = db.item_photos.map((p) => p.path).filter((path) => !isLocal(path) && !db.photoUrls[path]);
  if (!missing.length) return;
  const { data, error } = await supabase.storage.from('photos').createSignedUrls(missing, PHOTO_URL_SECONDS);
  if (error || !data) return;
  for (const row of data) if (row.path && row.signedUrl) db.photoUrls[row.path] = row.signedUrl;
}

export const isLocal = (path: string) => /^(file|ph|assets-library|content|blob|data):/.test(path);

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

type Result = { error: { message: string } | null };
let queue: Promise<unknown> = Promise.resolve();

/** Runs database writes one at a time, in the order they were made, then refreshes. */
export function write(run: () => PromiseLike<Result> | Promise<Result>, what = 'that'): Promise<boolean> {
  const next = queue.then(async () => {
    let ok = true;
    try {
      const { error } = await run();
      if (error) {
        ok = false;
        console.warn(`couldn't save ${what}`, error.message);
        Alert.alert(`Couldn't save ${what}`, error.message);
      }
    } catch (e) {
      ok = false;
      Alert.alert(`Couldn't save ${what}`, e instanceof Error ? e.message : String(e));
    }
    await refresh();
    return ok;
  });
  queue = next.catch(() => undefined);
  return next;
}

/** Uploads a picked photo (a local file uri) and returns once it's stored. */
export async function uploadImage(bucket: 'photos' | 'avatars', path: string, uri: string): Promise<Result> {
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  return { error };
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/** v0: there are no texts yet, so everyone's code is 000000. */
export const SHARED_CODE = '000000';

/** Signs in with a 10-digit US number, creating the account the first time. Returns an error message or null. */
export async function signInWithCode(digits: string, code: string): Promise<string | null> {
  if (code !== SHARED_CODE) return "That code didn't work.";
  const phone = `+1${digits}`;
  // The code doubles as the account's password until real texts are turned on.
  const signIn = await supabase.auth.signInWithPassword({ phone, password: code });
  let session = signIn.data.session;
  if (!session) {
    const signUp = await supabase.auth.signUp({ phone, password: code });
    if (signUp.error) return signUp.error.message;
    session = signUp.data.session;
    if (!session) return 'Phone sign-in needs "Confirm phone" turned off in Supabase for now.';
  }
  await startSession(session);
  return null;
}

async function startSession(session: Session | null) {
  const user: User | undefined = session?.user;
  if (!user) {
    Object.assign(db, { status: 'signedOut', me: '', phone: '' }, emptyTables());
    commit();
    return;
  }
  if (db.me === user.id && db.status !== 'loading' && db.status !== 'signedOut') return;
  db.me = user.id;
  db.phone = user.phone ?? '';
  db.status = 'needsProfile';
  await refresh();
}

let started = false;

/** Call once at launch: restores a saved sign-in and keeps the local copy fresh. */
export function startSync() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => startSession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') startSession(null);
    else if (event === 'SIGNED_IN') startSession(session);
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') refresh();
  });
  setInterval(() => {
    if (AppState.currentState === 'active') refresh();
  }, 60_000);
}

export async function signOut() {
  await supabase.auth.signOut();
  await startSession(null);
}

export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.rpc('delete_account');
  if (error) return error.message;
  await signOut();
  return null;
}
