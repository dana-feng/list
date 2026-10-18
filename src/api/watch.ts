// Live updates for whatever's open: a list, an item, a post's comments. While the screen is up it
// listens on Supabase's real-time feed for changes to the rows it shows and reloads straight
// away, instead of waiting for the one-minute refresh. What arrives is only a nudge; the reload
// is what fills the screen, so the database's read rules still decide what you see.
// (The live_lists_items_comments migration puts these tables on the feed.)
import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from './db';
import { supabase } from './supabase';
import { refresh } from './sync';

export type Watch =
  /**
   * Inserts and updates to `table` matching `filter` ("list_id=eq.<id>"). Deletes can't be
   * filtered and arrive with only the row's key, so `deleted` says whether one is ours.
   */
  | { table: string; filter: string; deleted?: (old: Record<string, unknown>) => boolean }
  /** An empty "changed" message on a public topic, like gift:<item id>. */
  | { topic: string };

/** How long to wait after a change for any others that come with it, so a burst reloads once. */
const SETTLE_MS = 400;

/**
 * Keeps the screen live while it's mounted. `name` must be unique to what's watched
 * ("list:<id>"); `watches` is read once per name. Pass `enabled: false` to not listen at all.
 */
export function useLive(name: string, watches: Watch[], enabled = true) {
  // what to watch is fixed by `name`; keep the latest list for when the listener is (re)made
  const latest = useRef(watches);
  useEffect(() => {
    latest.current = watches;
  });

  useEffect(() => {
    if (!enabled || !db.me) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const nudge = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, SETTLE_MS);
    };

    const channels: RealtimeChannel[] = [];
    const changes = supabase.channel(`live:${name}`);
    let listening = false;
    for (const w of latest.current) {
      if ('topic' in w) {
        channels.push(supabase.channel(w.topic).on('broadcast', { event: 'changed' }, nudge).subscribe());
        continue;
      }
      listening = true;
      changes
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: w.table, filter: w.filter }, nudge)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: w.table, filter: w.filter }, nudge);
      const { deleted } = w;
      if (deleted) {
        changes.on('postgres_changes', { event: 'DELETE', schema: 'public', table: w.table }, (change) => {
          if (deleted(change.old as Record<string, unknown>)) nudge();
        });
      }
    }
    if (listening) channels.push(changes.subscribe());

    return () => {
      if (timer) clearTimeout(timer);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [name, enabled]);
}
