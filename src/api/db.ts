// Local copy of the Supabase tables the signed-in person is allowed to see.
// sync.ts fills it from the database (the database's own rules decide what comes back),
// and the other api/ files read it synchronously so screens stay simple.
import { useSyncExternalStore } from 'react';

export type Visibility = 'anyone' | 'followers' | 'specific' | 'just_me';
export type EventKind = 'list_created' | 'item_added' | 'open_invite' | 'item_done' | 'list_done';

export type Profile = { id: string; username: string; name: string; profile_photo: string | null; created_at: string };
export type Follow = { follower_id: string; followee_id: string; created_at: string };
export type List = { id: string; title: string; visibility: Visibility; completed_at: string | null; created_at: string };
export type ListMember = { list_id: string; user_id: string; status: 'invited' | 'joined'; invited_by: string | null; created_at: string };
export type ListViewer = { list_id: string; user_id: string };
export type Item = {
  id: string;
  list_id: string;
  title: string;
  notes: string;
  date: string | null; // YYYY-MM-DD
  open_invite: boolean;
  caption: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
};
/** path is a storage path in the photos bucket, or a local file uri while it's uploading. */
export type ItemPhoto = { id: string; item_id: string; path: string; position: number; added_by: string | null; created_at: string };
export type Interest = { item_id: string; user_id: string; created_at: string };
export type FeedEvent = { id: string; actor_id: string; kind: EventKind; list_id: string; item_id: string | null; created_at: string };

/** loading: checking for a saved sign-in · signedOut · needsProfile: signed in, no profile row yet · ready */
export type Status = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

export type Db = {
  status: Status;
  me: string;
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
  /** storage path -> signed url for photos in the private bucket */
  photoUrls: Record<string, string>;
};

export const emptyTables = () => ({
  profiles: [] as Profile[],
  follows: [] as Follow[],
  lists: [] as List[],
  list_members: [] as ListMember[],
  list_viewers: [] as ListViewer[],
  items: [] as Item[],
  item_photos: [] as ItemPhoto[],
  interests: [] as Interest[],
  events: [] as FeedEvent[],
  photoUrls: {} as Record<string, string>,
});

export const db: Db = { status: 'loading', me: '', phone: '', ...emptyTables() };

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

export const now = () => new Date().toISOString();
