-- Live updates for an open list, item or comment thread.
--
-- The app listens while one of those screens is open and reloads as soon as something on it
-- changes, instead of on the next one-minute refresh. It never uses what arrives as data, only
-- as a nudge to reload, so the tables' read rules stay the only thing deciding what you see.
--
-- 1. These tables go on Supabase's real-time feed. Realtime checks each table's read rule before
--    sending an insert or update to a listener, so you only hear about rows you could read
--    anyway. Deletes can't be checked that way: they arrive with just the row's key, which the app
--    matches against what it already has.
--
-- 2. Gift claims are never readable by anyone but the claimer, so they can't go on the feed.
--    Instead, any claim being made, changed or taken back sends an empty "changed" message on the
--    public topic gift:<item id>. It says nothing about who or how many; the app answers it by
--    reloading the counts it's allowed to see (gift_status).

do $$
declare
  t text;
begin
  foreach t in array array['lists', 'items', 'item_photos', 'interests', 'borrow_haves', 'event_comments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

create function public.gift_claims_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'gift:' || coalesce(new.item_id, old.item_id)::text, false);
  return null;
end;
$$;

revoke execute on function public.gift_claims_changed() from public, anon, authenticated;

create trigger gift_claims_live after insert or update or delete on public.gift_claims
  for each row execute function public.gift_claims_changed();
