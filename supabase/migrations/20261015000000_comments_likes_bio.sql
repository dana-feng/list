-- Likes and comments on feed posts, and a short bio on profiles.
--
-- A post is an events row, so likes and comments point at events.id. Anyone who can see a post
-- can like it and comment on it: the rules below reuse the feed's own rule by checking that the
-- post is visible to you.
--
-- Unchecking an item (or reopening a finished list) used to delete its "done" post, which would
-- now also delete everyone's likes and comments on it. Instead the post is taken back
-- (retracted_at is set) and hidden, and checking it off again brings the same post back.

-- ---------------------------------------------------------------------------
-- Bio
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column bio text not null default '' check (char_length(bio) <= 150);

-- ---------------------------------------------------------------------------
-- Taken-back posts
-- ---------------------------------------------------------------------------

alter table public.events add column retracted_at timestamptz;

create or replace function public.refresh_list_completion(p_list uuid, p_actor uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  open_count integer;
  total_count integer;
  was_complete boolean;
begin
  select count(*) filter (where done_at is null), count(*)
    into open_count, total_count
    from public.items where list_id = p_list;
  select completed_at is not null into was_complete from public.lists where id = p_list;

  if total_count > 0 and open_count = 0 and not was_complete then
    update public.lists set completed_at = now() where id = p_list;
    if p_actor is not null then
      -- finishing it again brings back the old post, likes and comments included
      update public.events set retracted_at = null, actor_id = p_actor, created_at = now()
      where list_id = p_list and kind = 'list_done' and retracted_at is not null;
      if not found then
        insert into public.events (actor_id, kind, list_id) values (p_actor, 'list_done', p_list);
      end if;
    end if;
  elsif (open_count > 0 or total_count = 0) and was_complete then
    update public.lists set completed_at = null where id = p_list;
    update public.events set retracted_at = now()
    where list_id = p_list and kind = 'list_done' and retracted_at is null;
  end if;
end;
$$;

create or replace function public.items_after_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := public.acting_user(new.list_id);
begin
  if actor is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.events (actor_id, kind, list_id, item_id)
    values (actor, 'item_added', new.list_id, new.id);
    if new.open_invite and new.done_at is null then
      insert into public.events (actor_id, kind, list_id, item_id)
      values (actor, 'open_invite', new.list_id, new.id);
    end if;
    if new.done_at is not null then
      insert into public.events (actor_id, kind, list_id, item_id)
      values (actor, 'item_done', new.list_id, new.id);
    end if;
  else
    -- Turning on an open invite later = a new post.
    if new.open_invite and not old.open_invite and new.done_at is null then
      insert into public.events (actor_id, kind, list_id, item_id)
      values (actor, 'open_invite', new.list_id, new.id);
    end if;
    -- Checking off posts; unchecking takes the post back; checking off again brings it back.
    if new.done_at is not null and old.done_at is null then
      update public.events set retracted_at = null, actor_id = actor, created_at = now()
      where item_id = new.id and kind = 'item_done' and retracted_at is not null;
      if not found then
        insert into public.events (actor_id, kind, list_id, item_id)
        values (actor, 'item_done', new.list_id, new.id);
      end if;
    elsif new.done_at is null and old.done_at is not null then
      update public.events set retracted_at = now()
      where item_id = new.id and kind = 'item_done' and retracted_at is null;
    end if;
  end if;

  perform public.refresh_list_completion(new.list_id, actor);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Feed rule: hide taken-back posts, and always show you your own lists' posts
-- ---------------------------------------------------------------------------

-- "did" and "finished" posts belong to everyone on the list, so people on the list see them
-- even when they don't follow whoever checked it off (that's what puts them on your profile).
drop policy "read feed" on public.events;
create policy "read feed" on public.events for select to authenticated
  using (
    retracted_at is null
    and (
      actor_id = (select auth.uid())
      or public.is_list_member(list_id)
      or exists (select 1 from public.follows f
                 where f.follower_id = (select auth.uid()) and f.followee_id = actor_id)
    )
    and case
          when kind = 'open_invite' and item_id is not null then
            public.is_list_member(list_id)
            or public.can_see_invite(item_id)
            or (public.can_view_list(list_id) and public.in_invite_audience(item_id))
          else public.can_view_list(list_id)
        end);

-- ---------------------------------------------------------------------------
-- Likes and comments
-- ---------------------------------------------------------------------------

create table public.event_likes (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_likes_user_idx on public.event_likes (user_id);

create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- tags are saved as <@id|username>, the same as item notes
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index event_comments_event_idx on public.event_comments (event_id, created_at);
create index event_comments_author_idx on public.event_comments (author_id);

alter table public.event_likes enable row level security;
alter table public.event_comments enable row level security;

-- The events subquery runs under "read feed", so "the post exists" means "you can see the post".
create policy "read likes" on public.event_likes for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "like" on public.event_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id));
create policy "unlike" on public.event_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "read comments" on public.event_comments for select to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id)
    and not public.is_blocked(author_id, (select auth.uid())));
create policy "comment" on public.event_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and not public.is_blocked(e.actor_id, (select auth.uid()))));
-- Your own comments, and any comment on your own post.
create policy "delete comments" on public.event_comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.events e where e.id = event_id and e.actor_id = (select auth.uid())));

grant select, insert, delete on public.event_likes to authenticated;
grant select, insert, delete on public.event_comments to authenticated;
