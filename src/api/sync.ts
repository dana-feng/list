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
import { commit, db, emptyTables, GiftStatus } from './db';
import { listenForNotifications, stopListening } from './live';
import { forgetPushToken } from './push';
import { supabase } from './supabase';

export const newId = () => randomUUID();

const FEED_LIMIT = 300;
const PHOTO_URL_SECONDS = 60 * 60 * 24 * 7;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

let inFlight: Promise<void> | null = null;
let again = false;
// Writes still on their way to the database, and a count of every local change made so far.
// A reload that overlaps either one would put back rows from before the change, so it's dropped.
let pending = 0;
let changes = 0;

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
  const seen = changes;
  const who = db.me;
  const [profiles, follows, lists, members, viewers, items, photos, invitees, interests, haves, companions, gifts, events, likes, comments, blocked, unseen] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('follows').select('*'),
    supabase.from('lists').select('*'),
    supabase.from('list_members').select('*'),
    supabase.from('list_viewers').select('*'),
    supabase.from('items').select('*'),
    supabase.from('item_photos').select('*'),
    supabase.from('item_invitees').select('*'),
    supabase.from('interests').select('*'),
    supabase.from('borrow_haves').select('*'),
    supabase.from('item_companions').select('*'),
    supabase.rpc('gift_status'),
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(FEED_LIMIT),
    // Only rows on posts you can see come back; trimmed to the loaded posts below.
    supabase.from('event_likes').select('*'),
    supabase.from('event_comments').select('*').order('created_at', { ascending: true }),
    supabase.rpc('blocked_profiles'),
    // just whether there's anything new, for the dot on the bell
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('seen_at', null),
  ]);
  // blocked accounts and the bell's dot are nice-to-haves here: if those lookups fail, load everything else anyway
  const failed = [profiles, follows, lists, members, viewers, items, photos, invitees, interests, haves, companions, gifts, events, likes, comments].find((r) => r.error);
  if (failed?.error) {
    console.warn('refresh failed', failed.error.message);
    return;
  }
  // Signed out (or into another account) while this was loading.
  if (db.me !== who) return;
  // Something changed locally while this was loading, so these rows are already out of date.
  // Every write refreshes once it lands; if none is left, go round again now.
  if (pending > 0 || changes !== seen) {
    if (pending === 0) again = true;
    return;
  }

  db.profiles = profiles.data ?? [];
  db.follows = follows.data ?? [];
  db.lists = lists.data ?? [];
  db.list_members = members.data ?? [];
  db.list_viewers = viewers.data ?? [];
  db.items = items.data ?? [];
  db.item_photos = photos.data ?? [];
  db.item_invitees = invitees.data ?? [];
  db.interests = interests.data ?? [];
  db.borrow_haves = haves.data ?? [];
  db.item_companions = companions.data ?? [];
  db.gifts = Object.fromEntries(((gifts.data ?? []) as GiftStatus[]).map((g) => [g.item_id, g]));
  db.events = events.data ?? [];
  const loaded = new Set(db.events.map((e) => e.id));
  db.event_likes = (likes.data ?? []).filter((l) => loaded.has(l.event_id));
  db.event_comments = (comments.data ?? []).filter((c) => loaded.has(c.event_id));
  if (blocked.error) console.warn('blocked_profiles failed', blocked.error.message);
  else db.blocked = blocked.data ?? [];
  if (unseen.error) console.warn('notifications count failed', unseen.error.message);
  else db.unseenNotifications = (unseen.count ?? 0) > 0;

  await signPhotoUrls();
  if (db.me !== who) return;
  // This is the only place that decides between ready and needsProfile: only once your
  // profile row has actually been looked up.
  db.status = db.profiles.some((p) => p.id === db.me) ? 'ready' : 'needsProfile';
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
  pending++;
  changes++;
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
    } finally {
      pending--;
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
  // Every photo gets a new path, so this is always a plain upload. (upsert would also need
  // read + update permission on the file, which the storage rules don't give.)
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg' });
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
    stopListening();
    Object.assign(db, { status: 'signedOut', me: '', phone: '' }, emptyTables());
    commit();
    return;
  }
  if (db.me === user.id && db.status !== 'loading' && db.status !== 'signedOut') return;
  db.me = user.id;
  db.phone = user.phone ?? '';
  listenForNotifications(user.id);
  // Don't guess needsProfile here. At launch that would hide the splash and redirect an
  // already-onboarded person to the profile step before their profile had loaded.
  // Status stays as it is (loading at launch, signedOut mid sign-in) until refresh() decides.
  await refresh();
  if (db.me !== user.id || db.status === 'ready' || db.status === 'needsProfile') return;
  // The full reload failed (e.g. offline). Check just your profile so we don't get stuck.
  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (db.me !== user.id) return;
  // If even that fails, assume you're onboarded: the next successful refresh corrects it, and
  // sending an existing account to the profile step is the worse mistake.
  db.status = error || data ? 'ready' : 'needsProfile';
  commit();
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
  // while still signed in, so this phone stops getting the account's pushes
  await forgetPushToken();
  await supabase.auth.signOut();
  await startSession(null);
}

export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.rpc('delete_account');
  if (error) return error.message;
  await signOut();
  return null;
}
