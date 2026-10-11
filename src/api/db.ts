// In-memory stand-in for the Supabase tables in the build plan. Shapes match the
// nine tables so the api/ files can swap to supabase-js without touching screens.
import { useSyncExternalStore } from 'react';
import { seed } from './seed';

export type Visibility = 'anyone' | 'followers' | 'specific';
export type EventKind = 'list_created' | 'item_added' | 'asked' | 'item_done' | 'list_done';

export type Profile = {
  id: string;
  username: string;
  name: string;
  avatar_path: string | null;
  // mock only: placeholder avatar colors, and padding so counts match the canvas
  tint: { bg: string; fg: string };
  base_followers?: number;
  base_following?: number;
};
export type Follow = { follower_id: string; followee_id: string; created_at: string };
export type List = { id: string; owner_id: string; title: string; visibility: Visibility; completed_at: string | null; created_at: string };
export type ListMember = { list_id: string; user_id: string; role: 'owner' | 'member'; status: 'invited' | 'joined' };
export type ListViewer = { list_id: string; user_id: string };
export type Item = {
  id: string;
  list_id: string;
  title: string;
  notes: string;
  date: string | null; // YYYY-MM-DD
  asking: boolean;
  asked_at: string | null;
  done_at: string | null;
  done_by: string | null;
  position: number;
  caption?: string; // not in the plan's items table yet, see README
};
export type PhotoSource = string | number | null; // uri, bundled asset, or placeholder
export type ItemPhoto = { id: string; item_id: string; path: PhotoSource; position: number; added_by: string };
export type Interest = { item_id: string; user_id: string; created_at: string };
export type FeedEvent = { id: string; actor_id: string; kind: EventKind; list_id: string; item_id: string | null; created_at: string };

export type Db = {
  me: string;
  signedIn: boolean;
  phone: string;
  profiles: Profile[];
  follows: Follow[];
  lists: List[];
  list_members: ListMember[];
  list_viewers: ListViewer[];
  items: Item[];
  item_photos: ItemPhoto[];
  interests: Interest[];
  events: FeedEvent[];
  // mock only: phone numbers "in your contacts" that match_contacts would return
  contacts: string[];
};

export const db: Db = seed();

let version = 0;
const listeners = new Set<() => void>();

export function commit() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Re-renders the caller whenever any table changes. */
export function useDb() {
  useSyncExternalStore(subscribe, () => version, () => version);
  return db;
}

let counter = 0;
export function newId(prefix: string) {
  counter++;
  return `${prefix}_${Date.now().toString(36)}${counter}`;
}

export const now = () => new Date().toISOString();
