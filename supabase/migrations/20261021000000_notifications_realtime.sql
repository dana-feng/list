-- Live updates for the bell: put notifications on Supabase's real-time feed so the app hears
-- about a new (or newly merged) row right away instead of on the next one-minute refresh.
--
-- Realtime checks the table's read rule for each listener before sending a change, so the
-- existing "read own notifications" rule (recipient_id = auth.uid()) is the "only your own
-- rows" rule here too: nobody hears about anyone else's notifications.
--
-- The app listens for inserts and updates only. Deletes (an unlike taking a notification back)
-- can't be checked against the read rule by realtime, so they aren't listened to; the next
-- refresh picks those up.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
