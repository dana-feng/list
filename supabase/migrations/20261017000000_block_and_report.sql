-- Blocking and reporting, from the app (App Store guideline 1.2: people need a way to block
-- abusive users and report objectionable content).
--
-- blocks and reports already exist. This adds:
--   - blocked_profiles(), so you can see and unblock the people you've blocked. Their profiles
--     stay hidden everywhere else ("read profiles" hides both sides of a block).
--   - reports on comments, plus a copy of what was reported, so it can still be reviewed after
--     it's deleted. A post is an item or list showing up in the feed, so reporting a post
--     reports that item (with its photos) or list.

-- ---------------------------------------------------------------------------
-- Blocked accounts
-- ---------------------------------------------------------------------------

-- Newest first.
create function public.blocked_profiles()
returns setof public.profiles
language sql stable security definer set search_path = ''
as $$
  select p.*
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

revoke execute on function public.blocked_profiles() from public, anon;
grant execute on function public.blocked_profiles() to authenticated;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

alter table public.reports
  add column comment_id uuid references public.event_comments (id) on delete set null,
  -- the words that were reported (a comment, a list or item title), kept for review
  add column content text not null default '' check (char_length(content) <= 2000);

-- The old rule ("points at something") also ran when what it pointed at was deleted and the
-- column went null, which stopped accounts, lists and comments that had been reported from
-- being deleted. It's checked when a report is made instead (below).
alter table public.reports drop constraint reports_check;

create index reports_created_idx on public.reports (created_at desc);

drop policy "report" on public.reports;
create policy "report" on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (profile_id is not null or list_id is not null or item_id is not null or comment_id is not null));
