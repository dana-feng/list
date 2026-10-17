-- Push notifications, read off the notifications table.
--
-- Nothing about what a notification *is* changes: the triggers in the notifications migration
-- still write every row. This adds:
--   - push_tokens: the phones each person gets pushes on (saved through save_push_token)
--   - a trigger on notifications that, when a row is added or merged into, asks the `push`
--     Edge Function to send it (through pg_net, so it happens after the write commits and a
--     failed or slow push can never fail the like / comment / invite that caused it)
--   - claim_push(), which the function calls to decide what buzzes and to get what it needs to
--     write the message. Deciding here keeps it in one transaction with the throttle check.
--
-- What buzzes (push_rule):
--   now        invites, sharing, tags, comments, replies, someone joined, interested,
--              "has one you can borrow", a list finished
--   throttled  likes and things crossed off: at most one push every 30 minutes per person
--              (the row keeps merging, so the next push says "jo, tochi and 3 others liked…")
--   never      things added to a list (still in the bell, never a push)
-- Quiet hours, 10pm to 8am on the phone's own clock: the push still arrives, but passive
-- (no sound, doesn't light up the screen; it waits in Notification Center).
--
-- Turning it on needs two secrets in Vault (until they're there, the trigger does nothing):
--   push_function_url  https://<project ref>.supabase.co/functions/v1/push
--   push_secret        any long random string; the same value goes in the function's
--                      PUSH_SECRET secret, so only this database can make it send

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Phones
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  -- an Expo push token: ExponentPushToken[…]
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  -- the phone's time zone, for quiet hours
  time_zone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- You can see your own phones. Saving and forgetting go through the two functions below, since
-- a phone that signs into another account has to move its token over.
create policy "read own push tokens" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.push_tokens to authenticated;

-- Called at launch once you're signed in and have said yes to notifications. A phone belongs
-- to whoever signed in on it last.
create function public.save_push_token(p_token text, p_platform text, p_time_zone text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  zone text := coalesce(p_time_zone, 'America/New_York');
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- an unknown zone name falls back to New York rather than failing
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = zone) then
    zone := 'America/New_York';
  end if;
  insert into public.push_tokens (token, user_id, platform, time_zone)
  values (p_token, me, p_platform, zone)
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    time_zone = excluded.time_zone,
    updated_at = now();
end;
$$;

-- Called on sign-out, so the phone stops getting the account's pushes.
create function public.forget_push_token(p_token text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = (select auth.uid());
$$;

revoke execute on function public.save_push_token(text, text, text) from public, anon;
revoke execute on function public.forget_push_token(text) from public, anon;
grant execute on function public.save_push_token(text, text, text) to authenticated;
grant execute on function public.forget_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What buzzes
-- ---------------------------------------------------------------------------

-- when this row last went out as a push (for the 30-minute throttle)
alter table public.notifications add column pushed_at timestamptz;

create function public.push_rule(p_kind public.notification_kind)
returns text
language sql immutable set search_path = ''
as $$
  select case p_kind::text
    when 'item_added' then 'never'
    when 'like' then 'throttled'
    when 'item_done' then 'throttled'
    else 'now'
  end;
$$;

create function public.in_quiet_hours(p_time_zone text, p_at timestamptz default now())
returns boolean
language sql stable set search_path = ''
as $$
  select extract(hour from (p_at at time zone p_time_zone)) >= 22
      or extract(hour from (p_at at time zone p_time_zone)) < 8;
$$;

-- What the push function sends for one notification, or null when it shouldn't buzz. Marks the
-- row as pushed, so two calls for the same moment don't both send.
create function public.claim_push(p_notification uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  n public.notifications;
  rule text;
begin
  -- locked, so a second call for the same row waits and then sees pushed_at
  select * into n from public.notifications where id = p_notification for update;
  if not found or n.seen_at is not null or n.read_at is not null then
    return null;
  end if;

  rule := public.push_rule(n.kind);
  if rule = 'never' then
    return null;
  end if;
  -- already sent for this exact version of the row
  if n.pushed_at is not null and n.pushed_at >= n.updated_at then
    return null;
  end if;
  if rule = 'throttled' and exists (
    select 1 from public.notifications
    where recipient_id = n.recipient_id
      and public.push_rule(kind) = 'throttled'
      and pushed_at > now() - interval '30 minutes'
  ) then
    return null;
  end if;
  if not exists (select 1 from public.push_tokens where user_id = n.recipient_id) then
    return null;
  end if;

  update public.notifications set pushed_at = now() where id = n.id;

  return jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'count', n.count,
    'body', n.body,
    'list_id', n.list_id,
    'item_id', n.item_id,
    -- names in the order of actor_ids (newest first), up to 2: the message says "and N others" past that
    'actors', coalesce((
      select jsonb_agg(p.name order by a.ord)
      from unnest(n.actor_ids) with ordinality as a (id, ord)
      join public.profiles p on p.id = a.id
      where a.ord <= 2), '[]'::jsonb),
    'actor_count', coalesce(array_length(n.actor_ids, 1), 0),
    'list_title', (select title from public.lists where id = n.list_id),
    'item_title', (select title from public.items where id = n.item_id),
    'tokens', (
      select jsonb_agg(jsonb_build_object(
        'token', t.token,
        'platform', t.platform,
        'quiet', public.in_quiet_hours(t.time_zone)))
      from public.push_tokens t
      where t.user_id = n.recipient_id)
  );
end;
$$;

-- The push function drops phones Expo says are gone (the app was deleted, say).
create function public.drop_push_tokens(p_tokens text[])
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_tokens where token = any (p_tokens);
$$;

revoke execute on function public.push_rule(public.notification_kind) from public, anon, authenticated;
revoke execute on function public.in_quiet_hours(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_push(uuid) from public, anon, authenticated;
revoke execute on function public.drop_push_tokens(text[]) from public, anon, authenticated;
grant execute on function public.claim_push(uuid) to service_role;
grant execute on function public.drop_push_tokens(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- Asking the function to send
-- ---------------------------------------------------------------------------

create function public.notifications_push()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  fn_url text;
  secret text;
begin
  -- skip the round trip when it can't buzz anyway
  if public.push_rule(new.kind) = 'never'
     or not exists (select 1 from public.push_tokens where user_id = new.recipient_id) then
    return null;
  end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret';
  if fn_url is null or secret is null then
    return null;
  end if;
  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  -- a push is never worth failing the like / comment / invite over
  raise warning 'push not requested for notification %: %', new.id, sqlerrm;
  return null;
end;
$$;

-- New rows, and merges into an open row (notify() bumps updated_at). Opening the list and
-- taking one back don't touch updated_at, so they never push.
create trigger notifications_push after insert or update of updated_at on public.notifications
  for each row when (new.read_at is null and new.seen_at is null)
  execute function public.notifications_push();
