-- Notifications: the bell on Home and the list behind it.
--
-- One new table, written only by triggers on tables that already exist (nothing in the app's
-- write paths changes). Each kind of notification has a group_key: while a row with that key is
-- still unread, the next matching event merges into it ("tochi, dana and 2 others liked…")
-- instead of adding a row. Once you've opened the list, the next event starts a fresh row.
--
-- Rules for every kind:
--   - never notify the person who did it, and never across a block
--   - only notify someone who can open the thing it points at
--   - undoing the thing (unlike, take back an invite, delete a comment…) takes the notification
--     back too, as long as it hasn't been read

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create type public.notification_kind as enum (
  'list_invite',     -- someone invited you onto a list
  'viewer_added',    -- someone shared a "specific people" list with you
  'item_invite',     -- someone picked you for an open invite
  'invite_accepted', -- someone you invited joined the list
  'mention',         -- someone tagged you in a comment or an item's notes
  'comment',         -- a comment on your post
  'reply',           -- a reply to your comment
  'like',            -- a like on your post
  'interested',      -- someone's interested in an open invite on your list
  'item_added',      -- someone added things to a list you're on
  'item_done',       -- someone crossed things off a list you're on
  'list_done'        -- a list you're on is finished
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  group_key text not null,
  -- what a tap opens: the item if there is one, else the list
  list_id uuid references public.lists (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  event_id uuid references public.events (id) on delete cascade,
  comment_id uuid references public.event_comments (id) on delete cascade,
  -- who did it, newest first (the row shows up to 3 faces and "and 2 others")
  actor_ids uuid[] not null default '{}',
  -- how many times it happened: likes, things added, things crossed off
  count integer not null default 1 check (count >= 1),
  -- the words of a comment, reply or tag, with tags as @username
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the list was opened after this row last changed: no dot
  seen_at timestamptz,
  -- the row is closed to merging; the next event starts a new one
  read_at timestamptz
);

-- At most one open row per group, so new events merge into it.
create unique index notifications_open_group on public.notifications (recipient_id, group_key) where read_at is null;
create index notifications_inbox_idx on public.notifications (recipient_id, updated_at desc);
create index notifications_unseen_idx on public.notifications (recipient_id) where seen_at is null;
create index notifications_item_idx on public.notifications (item_id);

alter table public.notifications enable row level security;

-- Only your own. There are no insert/update/delete rules: rows are written by the triggers
-- below, and marked read through mark_notifications_read().
create policy "read own notifications" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

grant select on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Visibility as someone else. Same rules as can_view_list / in_invite_audience, but for a
-- given person instead of whoever is signed in, so a trigger can check the recipient.
-- ---------------------------------------------------------------------------

create function public.can_view_list_as(p_list uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    exists (select 1 from public.list_members where list_id = p_list and user_id = p_user)
    or exists (
      select 1 from public.lists l
      where l.id = p_list
        and (
          l.visibility = 'anyone'
          or (l.visibility = 'followers' and exists (
                select 1
                from public.list_members m
                join public.follows f on f.followee_id = m.user_id
                where m.list_id = l.id and m.status = 'joined' and f.follower_id = p_user))
          or (l.visibility = 'specific' and exists (
                select 1 from public.list_viewers v where v.list_id = l.id and v.user_id = p_user))
        )
        and not exists (
          select 1
          from public.list_members m
          join public.blocks b
            on (b.blocker_id = m.user_id and b.blocked_id = p_user)
            or (b.blocked_id = m.user_id and b.blocker_id = p_user)
          where m.list_id = l.id and m.status = 'joined'));
$$;

-- The item's list, or the item itself when it's an open invite that includes them.
create function public.can_view_item_as(p_item uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item
      and (
        public.can_view_list_as(i.list_id, p_user)
        or (i.open_invite and i.done_at is null and (
              i.invite_audience = 'anyone'
              or (i.invite_audience = 'followers' and exists (
                    select 1
                    from public.list_members m
                    join public.follows f on f.followee_id = m.user_id
                    where m.list_id = i.list_id and m.status = 'joined' and f.follower_id = p_user))
              or (i.invite_audience = 'specific' and exists (
                    select 1 from public.item_invitees v where v.item_id = i.id and v.user_id = p_user)))
            and not exists (
              select 1
              from public.list_members m
              join public.blocks b
                on (b.blocker_id = m.user_id and b.blocked_id = p_user)
                or (b.blocked_id = m.user_id and b.blocker_id = p_user)
              where m.list_id = i.list_id and m.status = 'joined'))));
$$;

-- ---------------------------------------------------------------------------
-- Writing and taking back
-- ---------------------------------------------------------------------------

-- Adds a notification, or merges it into the open row with the same group_key.
create function public.notify(
  p_recipient uuid,
  p_kind public.notification_kind,
  p_group text,
  p_actor uuid,
  p_list uuid default null,
  p_item uuid default null,
  p_event uuid default null,
  p_comment uuid default null,
  p_body text default ''
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_recipient is null or p_actor is null or p_recipient = p_actor then
    return;
  end if;
  if public.is_blocked(p_recipient, p_actor) then
    return;
  end if;
  insert into public.notifications as n
    (recipient_id, kind, group_key, list_id, item_id, event_id, comment_id, actor_ids, body)
  values
    (p_recipient, p_kind, p_group, p_list, p_item, p_event, p_comment, array[p_actor], coalesce(p_body, ''))
  on conflict (recipient_id, group_key) where read_at is null do update set
    actor_ids = array_prepend(p_actor, array_remove(n.actor_ids, p_actor)),
    count = n.count + 1,
    item_id = coalesce(excluded.item_id, n.item_id),
    event_id = coalesce(excluded.event_id, n.event_id),
    comment_id = coalesce(excluded.comment_id, n.comment_id),
    body = case when excluded.body <> '' then excluded.body else n.body end,
    updated_at = now(),
    seen_at = null;
end;
$$;

-- Takes one event back out of an open row: one fewer, and (when each event is a different
-- person, like likes) that person's face goes too. The row goes once nothing is left in it.
create function public.unnotify(p_recipient uuid, p_group text, p_actor uuid, p_drop_actor boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where recipient_id = p_recipient and group_key = p_group and read_at is null and count <= 1;
  update public.notifications
  set count = count - 1,
      actor_ids = case when p_drop_actor then array_remove(actor_ids, p_actor) else actor_ids end
  where recipient_id = p_recipient and group_key = p_group and read_at is null;
end;
$$;

-- Everyone joined on a list.
create function public.list_member_ids(p_list uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select user_id from public.list_members where list_id = p_list and status = 'joined';
$$;

-- Who's tagged in some text: tags are saved as <@id|username>.
create function public.tagged_ids(p_text text)
returns uuid[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(distinct m[1]::uuid), '{}')
  from regexp_matches(coalesce(p_text, ''), '<@([0-9a-fA-F-]{36})\|[^>]*>', 'g') as m;
$$;

-- Tags turned back into @username, for showing a comment's words in a notification.
create function public.plain_tags(p_text text)
returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(coalesce(p_text, ''), '<@[0-9a-fA-F-]{36}\|([^>]*)>', '@\1', 'g');
$$;

-- ---------------------------------------------------------------------------
-- Invites and sharing
-- ---------------------------------------------------------------------------

create function public.list_members_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'invited' then
      perform public.notify(new.user_id, 'list_invite', 'list_invite:' || new.list_id,
                            coalesce(new.invited_by, auth.uid()), new.list_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'invited' and new.status = 'joined' then
      perform public.notify(new.invited_by, 'invite_accepted', 'accepted:' || new.list_id || ':' || new.user_id,
                            new.user_id, new.list_id);
    end if;
  elsif tg_op = 'DELETE' then
    -- an invite taken back (or turned down) takes its notification with it
    if old.status = 'invited' then
      delete from public.notifications
      where recipient_id = old.user_id and kind = 'list_invite' and list_id = old.list_id and read_at is null;
    end if;
  end if;
  return null;
end;
$$;

create trigger list_members_notify after insert or update of status or delete on public.list_members
  for each row execute function public.list_members_notify();

create function public.list_viewers_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- only when it actually lets them in (the list is "specific people" and they're not on it)
    if exists (select 1 from public.lists where id = new.list_id and visibility = 'specific')
       and not exists (select 1 from public.list_members where list_id = new.list_id and user_id = new.user_id) then
      perform public.notify(new.user_id, 'viewer_added', 'viewer:' || new.list_id,
                            public.acting_user(new.list_id), new.list_id);
    end if;
  else
    delete from public.notifications
    where recipient_id = old.user_id and kind = 'viewer_added' and list_id = old.list_id and read_at is null;
  end if;
  return null;
end;
$$;

create trigger list_viewers_notify after insert or delete on public.list_viewers
  for each row execute function public.list_viewers_notify();

-- Open invites notify the people picked for them ("specific people"). Followers / anyone
-- invites go to the invites tab on Home instead; pinging every follower would be too much.
create function public.item_invitees_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  i public.items;
begin
  if tg_op = 'INSERT' then
    select * into i from public.items where id = new.item_id;
    if i.open_invite and i.done_at is null and i.invite_audience = 'specific' then
      perform public.notify(new.user_id, 'item_invite', 'item_invite:' || i.id,
                            public.acting_user(i.list_id), i.list_id, i.id);
    end if;
  else
    delete from public.notifications
    where recipient_id = old.user_id and kind = 'item_invite' and item_id = old.item_id and read_at is null;
  end if;
  return null;
end;
$$;

create trigger item_invitees_notify after insert or delete on public.item_invitees
  for each row execute function public.item_invitees_notify();

-- Turning an invite on (with people already picked) notifies them; turning it off, finishing
-- the item or switching away from "specific people" takes those notifications back.
create function public.items_invite_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  was_on boolean := old.open_invite and old.done_at is null and old.invite_audience = 'specific';
  is_on boolean := new.open_invite and new.done_at is null and new.invite_audience = 'specific';
  actor uuid := public.acting_user(new.list_id);
  u uuid;
begin
  if is_on and not was_on then
    for u in select user_id from public.item_invitees where item_id = new.id loop
      perform public.notify(u, 'item_invite', 'item_invite:' || new.id, actor, new.list_id, new.id);
    end loop;
  elsif was_on and not is_on then
    delete from public.notifications where kind = 'item_invite' and item_id = new.id and read_at is null;
  end if;
  return null;
end;
$$;

create trigger items_invite_notify after update of open_invite, invite_audience, done_at on public.items
  for each row execute function public.items_invite_notify();

-- ---------------------------------------------------------------------------
-- Interested
-- ---------------------------------------------------------------------------

create function public.interests_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r public.interests;
  l uuid;
  m uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  l := public.list_of_item(r.item_id);
  for m in select public.list_member_ids(l) loop
    if tg_op = 'INSERT' then
      perform public.notify(m, 'interested', 'interested:' || r.item_id, r.user_id, l, r.item_id);
    else
      perform public.unnotify(m, 'interested:' || r.item_id, r.user_id);
    end if;
  end loop;
  return null;
end;
$$;

create trigger interests_notify after insert or delete on public.interests
  for each row execute function public.interests_notify();

-- ---------------------------------------------------------------------------
-- Activity on lists you're on (from the feed's own posts)
-- ---------------------------------------------------------------------------

-- "added" and "did" group per person per list ("maya added 4 things to fall weekends");
-- "finished" is one per list.
create function public.event_group(e public.events)
returns text
language sql immutable set search_path = ''
as $$
  select case e.kind
    when 'item_added' then 'item_added:' || e.list_id || ':' || e.actor_id
    when 'item_done' then 'item_done:' || e.list_id || ':' || e.actor_id
    when 'list_done' then 'list_done:' || e.list_id
  end;
$$;

create function public.events_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  posted boolean;
  unposted boolean;
  e public.events;
  m uuid;
begin
  if tg_op = 'INSERT' then
    posted := new.retracted_at is null;
  elsif tg_op = 'UPDATE' then
    posted := old.retracted_at is not null and new.retracted_at is null;
    unposted := old.retracted_at is null and new.retracted_at is not null;
  else
    unposted := old.retracted_at is null;
  end if;

  if tg_op = 'DELETE' then e := old; else e := new; end if;
  if e.kind not in ('item_added', 'item_done', 'list_done') then
    return null;
  end if;
  if posted then
    for m in select public.list_member_ids(e.list_id) loop
      perform public.notify(m, e.kind::text::public.notification_kind, public.event_group(e), e.actor_id, e.list_id, e.item_id);
    end loop;
  elsif unposted then
    -- (an update can change who it's by, so take back the old one)
    for m in select public.list_member_ids(old.list_id) loop
      perform public.unnotify(m, public.event_group(old), old.actor_id, false);
    end loop;
  end if;
  return null;
end;
$$;

create trigger events_notify after insert or update of retracted_at or delete on public.events
  for each row execute function public.events_notify();

-- ---------------------------------------------------------------------------
-- Likes, comments, replies and tags
-- ---------------------------------------------------------------------------

create function public.event_likes_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r public.event_likes;
  e public.events;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  select * into e from public.events where id = r.event_id;
  if not found then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.notify(e.actor_id, 'like', 'like:' || e.id, r.user_id, e.list_id, e.item_id, e.id);
  else
    perform public.unnotify(e.actor_id, 'like:' || e.id, r.user_id);
  end if;
  return null;
end;
$$;

create trigger event_likes_notify after insert or delete on public.event_likes
  for each row execute function public.event_likes_notify();

-- One event, one notification per person: tagged in a comment on your own post is just the tag.
create function public.event_comments_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e public.events;
  tagged uuid[];
  m uuid;
  parent_author uuid;
  words text;
begin
  if tg_op = 'UPDATE' then
    -- delete_comment blanks a comment that has replies instead of deleting it
    if new.deleted_at is not null and old.deleted_at is null then
      delete from public.notifications where comment_id = new.id;
    end if;
    return null;
  end if;

  select * into e from public.events where id = new.event_id;
  if not found then
    return null;
  end if;
  tagged := public.tagged_ids(new.body);
  words := left(public.plain_tags(new.body), 300);

  foreach m in array tagged loop
    if public.can_view_list_as(e.list_id, m) or (e.item_id is not null and public.can_view_item_as(e.item_id, m)) then
      perform public.notify(m, 'mention', 'mention:' || new.id || ':' || m, new.author_id,
                            e.list_id, e.item_id, e.id, new.id, words);
    end if;
  end loop;

  if new.reply_to is null then
    if not (e.actor_id = any (tagged)) then
      perform public.notify(e.actor_id, 'comment', 'comment:' || new.id, new.author_id,
                            e.list_id, e.item_id, e.id, new.id, words);
    end if;
  else
    select author_id into parent_author from public.event_comments where id = new.reply_to;
    if parent_author is not null and not (parent_author = any (tagged)) then
      perform public.notify(parent_author, 'reply', 'reply:' || new.id, new.author_id,
                            e.list_id, e.item_id, e.id, new.id, words);
    end if;
  end if;
  return null;
end;
$$;

create trigger event_comments_notify after insert or update of deleted_at on public.event_comments
  for each row execute function public.event_comments_notify();

-- Tags added to an item's notes (only the new ones, so editing the notes again doesn't re-ping).
create function public.items_tags_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  before uuid[] := case when tg_op = 'UPDATE' then public.tagged_ids(old.notes) else '{}' end;
  m uuid;
begin
  foreach m in array public.tagged_ids(new.notes) loop
    if not (m = any (before)) and public.can_view_item_as(new.id, m) then
      perform public.notify(m, 'mention', 'mention:item:' || new.id || ':' || m,
                            public.acting_user(new.list_id), new.list_id, new.id);
    end if;
  end loop;
  return null;
end;
$$;

create trigger items_tags_notify after insert or update of notes on public.items
  for each row execute function public.items_tags_notify();

-- Rows about one item (an invite, interest in it, a tag in its notes) go with it. Grouped rows
-- that merely point at the latest item ("added 4 things") keep pointing at the list instead.
-- Before delete, so the item_id is still there to match on.
create function public.items_delete_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where item_id = old.id and (kind in ('item_invite', 'interested') or (kind = 'mention' and comment_id is null));
  return old;
end;
$$;

create trigger items_delete_notifications before delete on public.items
  for each row execute function public.items_delete_notifications();

-- ---------------------------------------------------------------------------
-- What the app calls
-- ---------------------------------------------------------------------------

-- Opening the notifications list: everything there is now seen (no dot) and read (the next
-- event starts a new row instead of merging into one you've already looked at).
create function public.mark_notifications_read()
returns void
language sql security definer set search_path = ''
as $$
  update public.notifications
  set seen_at = coalesce(seen_at, now()), read_at = coalesce(read_at, now())
  where recipient_id = (select auth.uid()) and (seen_at is null or read_at is null);
$$;

revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- The helpers are for triggers only.
revoke execute on function public.notify(uuid, public.notification_kind, text, uuid, uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.unnotify(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.can_view_list_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_view_item_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.list_member_ids(uuid) from public, anon, authenticated;
