-- Feed events, list completion, and the functions the app calls.

-- ---------------------------------------------------------------------------
-- Functions the app calls (supabase.rpc)
-- ---------------------------------------------------------------------------

-- Creates a list with you on it as joined, plus its viewers and invites, in one step,
-- so a list never exists with nobody on it.
create function public.create_list(
  p_title text,
  p_visibility public.list_visibility default 'followers',
  p_viewers uuid[] default '{}',
  p_invites uuid[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  insert into public.lists (title, visibility) values (p_title, p_visibility)
  returning id into new_id;

  insert into public.list_members (list_id, user_id, status) values (new_id, me, 'joined');

  if p_visibility = 'specific' then
    insert into public.list_viewers (list_id, user_id)
    select new_id, v from unnest(p_viewers) as v
    where v <> me
    on conflict do nothing;
  end if;

  insert into public.list_members (list_id, user_id, status, invited_by)
  select new_id, u, 'invited', me from unnest(p_invites) as u
  where u <> me and not public.is_blocked(me, u)
  on conflict do nothing;

  insert into public.events (actor_id, kind, list_id) values (me, 'list_created', new_id);

  return new_id;
end;
$$;

-- Live check for the username field in sign-up and settings.
create function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select lower(p_username) ~ '^[a-z0-9._]{3,20}$'
     and not exists (
       select 1 from public.profiles
       where username = lower(p_username) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- Find your people: which of these phone numbers have accounts. Returns profiles only,
-- never anyone's number. US numbers without a country code get a leading 1.
create function public.match_contacts(p_phones text[])
returns setof public.profiles
language sql stable security definer set search_path = ''
as $$
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
$$;

-- Delete account (Apple requires it). Removes the sign-in and, through cascades, everything
-- that belongs to it; lists left with nobody on them are cleaned up by the trigger below.
create function public.delete_account()
returns void
language sql security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Triggers: feed events and list completion
-- ---------------------------------------------------------------------------

-- Who did it: the signed-in person, or for writes made in the dashboard, the first
-- person on the list.
create function public.acting_user(p_list uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    auth.uid(),
    (select user_id from public.list_members
     where list_id = p_list and status = 'joined'
     order by created_at limit 1));
$$;

create function public.refresh_list_completion(p_list uuid, p_actor uuid)
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
      insert into public.events (actor_id, kind, list_id) values (p_actor, 'list_done', p_list);
    end if;
  elsif (open_count > 0 or total_count = 0) and was_complete then
    update public.lists set completed_at = null where id = p_list;
    delete from public.events where list_id = p_list and kind = 'list_done';
  end if;
end;
$$;

create function public.items_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Whoever checks it off is done_by; unchecking clears both.
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null) then
    new.done_by := coalesce(new.done_by, public.acting_user(new.list_id));
  elsif new.done_at is null then
    new.done_by := null;
  end if;
  return new;
end;
$$;

create function public.items_after_write()
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
    -- Added and asked at the same time = one post.
    insert into public.events (actor_id, kind, list_id, item_id)
    values (actor, case when new.open_invite then 'open_invite' else 'item_added' end::public.event_kind,
            new.list_id, new.id);
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
    -- Checking off always posts; unchecking takes the post back.
    if new.done_at is not null and old.done_at is null then
      insert into public.events (actor_id, kind, list_id, item_id)
      values (actor, 'item_done', new.list_id, new.id);
    elsif new.done_at is null and old.done_at is not null then
      delete from public.events where item_id = new.id and kind = 'item_done';
    end if;
  end if;

  perform public.refresh_list_completion(new.list_id, actor);
  return null;
end;
$$;

create function public.items_after_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.refresh_list_completion(old.list_id, public.acting_user(old.list_id));
  return null;
end;
$$;

create trigger items_before_write before insert or update on public.items
  for each row execute function public.items_before_write();
create trigger items_after_write after insert or update of open_invite, done_at on public.items
  for each row execute function public.items_after_write();
create trigger items_after_delete after delete on public.items
  for each row execute function public.items_after_delete();

-- A list with nobody joined left on it is deleted.
create function public.list_members_after_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.list_members where list_id = old.list_id and status = 'joined') then
    delete from public.lists where id = old.list_id;
  end if;
  return null;
end;
$$;

create trigger list_members_after_delete after delete on public.list_members
  for each row execute function public.list_members_after_delete();

-- Blocking someone also removes follows in both directions.
create function public.blocks_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- Only the app's signed-in role may call these.
revoke execute on function public.create_list(text, public.list_visibility, uuid[], uuid[]) from public, anon;
revoke execute on function public.match_contacts(text[]) from public, anon;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.create_list(text, public.list_visibility, uuid[], uuid[]) to authenticated;
grant execute on function public.match_contacts(text[]) to authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
