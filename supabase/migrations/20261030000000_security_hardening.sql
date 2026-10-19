-- Security hardening, from the audit:
--   1. rate limits on everything people do (comments, likes, follows, lists, items, invites, ...)
--   2. the contact matcher can't be used to look up phone numbers in bulk
--   3. caps on how many people a list or an invite can take
--   4. photo storage is tied to real items and capped, so files can't pile up outside the photo cap
--   5. gift "changed" signals go on a private channel only people who can see the gift can hear
--   6. "crossed off by" is always whoever did it; the app can't name someone else
-- (Shorter-lived photo links are an app change, in src/api/sync.ts.)

-- ---------------------------------------------------------------------------
-- 1. Rate limits
-- ---------------------------------------------------------------------------

-- One row per thing someone did that's limited. Only these functions read or write it.
create table public.rate_events (
  user_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (user_id, action, at desc);
alter table public.rate_events enable row level security;

-- Counts what the signed-in person did of `p_action` in the last minute and the last day, refuses
-- past either limit, and otherwise records this one. Nothing is limited without a signed-in person
-- (the server's own work). `p_what` is how the action reads in the message: "comments".
create function public.rate_limit(p_action text, p_what text, p_per_minute integer, p_per_day integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  minute integer;
  day integer;
begin
  if me is null then
    return;
  end if;
  -- keep the table small: a day is the longest window anything looks back over
  delete from public.rate_events where user_id = me and action = p_action and at < now() - interval '1 day';
  select count(*) filter (where at > now() - interval '1 minute'), count(*)
    into minute, day
    from public.rate_events where user_id = me and action = p_action;
  if minute >= p_per_minute then
    raise exception 'that''s a lot of % in a short time. try again in a minute.', p_what using errcode = 'P0001';
  end if;
  if day >= p_per_day then
    raise exception 'that''s as many % as you can do today. try again tomorrow.', p_what using errcode = 'P0001';
  end if;
  insert into public.rate_events (user_id, action) values (me, p_action);
end;
$$;

-- As a trigger: rate_limited('<action>', '<what>', <per minute>, <per day>).
create function public.rate_limited()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.rate_limit(tg_argv[0], tg_argv[1], tg_argv[2]::integer, tg_argv[3]::integer);
  return new;
end;
$$;

create trigger event_comments_rate before insert on public.event_comments
  for each row execute function public.rate_limited('comment', 'comments', '20', '300');
create trigger event_likes_rate before insert on public.event_likes
  for each row execute function public.rate_limited('like', 'likes', '60', '1000');
create trigger follows_rate before insert on public.follows
  for each row execute function public.rate_limited('follow', 'follows', '30', '300');
create trigger blocks_rate before insert on public.blocks
  for each row execute function public.rate_limited('block', 'blocks', '10', '50');
create trigger reports_rate before insert on public.reports
  for each row execute function public.rate_limited('report', 'reports', '3', '20');
create trigger feedback_rate before insert on public.feedback
  for each row execute function public.rate_limited('feedback', 'messages', '2', '20');
create trigger lists_rate before insert on public.lists
  for each row execute function public.rate_limited('list', 'new lists', '10', '50');
create trigger items_rate before insert on public.items
  for each row execute function public.rate_limited('item', 'new things', '30', '500');
create trigger item_photos_rate before insert on public.item_photos
  for each row execute function public.rate_limited('photo', 'photos', '30', '200');
create trigger item_invitees_rate before insert on public.item_invitees
  for each row execute function public.rate_limited('item_invite', 'invites', '30', '200');
create trigger interests_rate before insert on public.interests
  for each row execute function public.rate_limited('interest', 'stars', '30', '300');
create trigger borrow_haves_rate before insert on public.borrow_haves
  for each row execute function public.rate_limited('have', '"i have it"s', '30', '300');
create trigger item_companions_rate before insert on public.item_companions
  for each row execute function public.rate_limited('companion', 'tags', '40', '300');
create trigger gift_claims_rate before insert or update on public.gift_claims
  for each row execute function public.rate_limited('claim', 'claims', '20', '200');

-- ---------------------------------------------------------------------------
-- 2. Contact matching: a few lookups a day, not a way to test phone numbers in bulk
-- ---------------------------------------------------------------------------

create or replace function public.match_contacts(p_phones text[])
returns setof public.profiles
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.rate_limit('match_contacts', 'contact lookups', 2, 5);
  return query
    with wanted as (
      select distinct
        case when char_length(d) = 10 then '1' || d else d end as phone
      from (
        select regexp_replace(p, '\D', '', 'g') as d
        from unnest(p_phones[1:2000]) as p
      ) cleaned
      where char_length(d) >= 10
    )
    select p.*
    from wanted w
    join auth.users u on u.phone = w.phone
    join public.profiles p on p.id = u.id
    where p.id <> auth.uid()
      and not public.is_blocked(auth.uid(), p.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Caps on invites
-- ---------------------------------------------------------------------------

-- A list has at most 50 people on it or invited, and you can send 50 list invites a day. Covers
-- create_list's invites too, so starting a list with too many refuses the whole thing.
create function public.cap_list_invites()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.list_members where list_id = new.list_id) >= 50 then
    raise exception 'a list can have up to 50 people on it' using errcode = 'P0001';
  end if;
  if new.status = 'invited' then
    perform public.rate_limit('list_invite', 'invites', 20, 50);
  end if;
  return new;
end;
$$;

create trigger list_members_cap before insert on public.list_members
  for each row execute function public.cap_list_invites();

-- An open invite for specific people goes to at most 100 of them.
create function public.cap_item_invitees()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.item_invitees where item_id = new.item_id) >= 100 then
    raise exception 'an invite can go to up to 100 people' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger item_invitees_cap before insert on public.item_invitees
  for each row execute function public.cap_item_invitees();

-- ---------------------------------------------------------------------------
-- 4. Photo storage
-- ---------------------------------------------------------------------------

-- A photo upload has to be <list>/<item>/<file> for a real item on that list, the item can't have
-- more than 10 files already (the photo cap), and you can upload 200 photos a day.
create function public.photo_upload_allowed(p_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) <> 3 or parts[1] !~ uuid_re or parts[2] !~ uuid_re then
    return false;
  end if;
  if not exists (select 1 from public.items where id = parts[2]::uuid and list_id = parts[1]::uuid) then
    return false;
  end if;
  if (select count(*) from storage.objects where bucket_id = 'photos' and name like parts[1] || '/' || parts[2] || '/%') >= 10 then
    return false;
  end if;
  return (
    select count(*) from storage.objects
    where bucket_id = 'photos' and owner_id = (select auth.uid())::text and created_at > now() - interval '1 day'
  ) < 200;
end;
$$;

-- Profile photos: 10 uploads a day.
create function public.avatar_upload_allowed()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select count(*) < 10 from storage.objects
  where bucket_id = 'avatars' and owner_id = (select auth.uid())::text and created_at > now() - interval '1 day';
$$;

revoke execute on function public.photo_upload_allowed(text) from public, anon;
revoke execute on function public.avatar_upload_allowed() from public, anon;
grant execute on function public.photo_upload_allowed(text) to authenticated;
grant execute on function public.avatar_upload_allowed() to authenticated;

drop policy "add list photos" on storage.objects;
create policy "add list photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_list_member(((storage.foldername(name))[1])::uuid)
    and public.photo_upload_allowed(name));

drop policy "upload own avatar" on storage.objects;
create policy "upload own avatar" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.avatar_upload_allowed());

-- ---------------------------------------------------------------------------
-- 5. Gift "changed" signals, privately
-- ---------------------------------------------------------------------------

-- Whether you can see the item a gift:<item id> topic is about. Anything else: no.
create function public.can_hear_topic(p_topic text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  item_id text := substring(p_topic from '^gift:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
begin
  if item_id is null then
    return false;
  end if;
  return exists (select 1 from public.items i where i.id = item_id::uuid and public.can_view_list(i.list_id));
end;
$$;

revoke execute on function public.can_hear_topic(text) from public, anon;
grant execute on function public.can_hear_topic(text) to authenticated;

-- Listening is allowed for people who can see the gift; there's no insert rule, so no app can send
-- on these topics, only the database.
create policy "hear gift changes" on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.can_hear_topic(realtime.topic()));

create or replace function public.gift_claims_changed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'gift:' || coalesce(new.item_id, old.item_id)::text, true);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. "Crossed off by" is whoever did it
-- ---------------------------------------------------------------------------

-- The same as before, except done_by comes from who's signed in, never from what the app sends,
-- and once something is crossed off nobody can change who did it.
create or replace function public.items_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('list.auto_done', true) = 'on' then
    new.auto_done := new.done_at is not null;
    new.done_by := null;
    return new;
  end if;
  -- a person checking it off or putting it back takes over from the automatic check-off
  if tg_op = 'UPDATE' and new.done_at is distinct from old.done_at then
    new.auto_done := false;
  end if;
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null) then
    new.done_by := coalesce(auth.uid(), public.acting_user(new.list_id));
  elsif new.done_at is null then
    new.done_by := null;
  else
    new.done_by := old.done_by;
  end if;
  return new;
end;
$$;

revoke execute on function public.rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.rate_limited() from public, anon, authenticated;
revoke execute on function public.cap_list_invites() from public, anon, authenticated;
revoke execute on function public.cap_item_invitees() from public, anon, authenticated;
