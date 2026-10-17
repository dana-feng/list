// Live updates for the bell. While you're signed in, the app listens on Supabase's real-time
// feed for your notifications (the notifications_realtime migration puts the table on it, and
// the table's read rule means only your own rows ever arrive). A new or merged row turns the
// dot on straight away; anything else (marked read on another device, say) re-checks it.
//
// Deletes aren't listened to (realtime can't check them against the read rule), so a
// notification taken back still clears on the next refresh, at most a minute later.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { commit, db, Notification } from './db';
import { supabase } from './supabase';

let channel: RealtimeChannel | null = null;
let listeningAs = '';
const onNew = new Set<() => void>();

/** Start listening for this person's notifications (stops any earlier listener first). */
export function listenForNotifications(me: string) {
  if (channel && listeningAs === me) return;
  stopListening();
  listeningAs = me;
  channel = supabase
    .channel(`notifications:${me}`)
    .on<Notification>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${me}` },
      (change) => changed(me, change.new),
    )
    .on<Notification>(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${me}` },
      (change) => changed(me, change.new),
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // the one-minute refresh still keeps the dot roughly right; realtime reconnects on its own
        console.warn('notifications live updates', status, err?.message ?? '');
      }
    });
}

export function stopListening() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  listeningAs = '';
}

/** Called with nothing whenever a notification you haven't seen arrives (the open notifications screen reloads). */
export function onNewNotification(run: () => void): () => void {
  onNew.add(run);
  return () => onNew.delete(run);
}

function changed(me: string, row: Partial<Notification>) {
  if (db.me !== me) return;
  if (row.seen_at == null) {
    if (!db.unseenNotifications) {
      db.unseenNotifications = true;
      commit();
    }
    onNew.forEach((run) => run());
  } else {
    recheck(me);
  }
}

let checking: Promise<void> | null = null;

/** Whether anything is still unseen, for the dot. */
function recheck(me: string) {
  checking ??= (async () => {
    try {
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('seen_at', null);
      if (error || db.me !== me) return;
      const unseen = (count ?? 0) > 0;
      if (unseen !== db.unseenNotifications) {
        db.unseenNotifications = unseen;
        commit();
      }
    } finally {
      checking = null;
    }
  })();
}
