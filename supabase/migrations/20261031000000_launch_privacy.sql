-- Before going public:
--   1. you can only read the profiles of people you're connected to, so nobody can download the
--      whole directory; strangers are found through search and by username, both rate limited
--   2. deleting your account takes the lists only you own with it (and the app removes your files)
--   3. reports reach the team: each one is copied to the feedback sheet

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------

-- Everyone the signed-in person has a reason to see: you; people you follow and who follow you;
-- people on lists you're on or can see, and whoever posted, commented or liked there; people who
-- starred, said they have, were invited to or are getting (when it isn't a surprise) things on your
-- lists; people tagged on things you can see, and the owners of things you were tagged on or
-- invited to; open invites to anyone; and whoever is in your notifications. Never anyone blocked.
create function public.connected_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  with me as (select auth.uid() as id),
  my_lists as (select m.list_id as id from public.list_members m, me where m.user_id = me.id),
  seen_lists as (select l.id from public.lists l where public.can_view_list(l.id)),
  ids as (
    select me.id as uid from me
    union select f.followee_id from public.follows f, me where f.follower_id = me.id
    union select f.follower_id from public.follows f, me where f.followee_id = me.id
    union select m.user_id from public.list_members m where m.list_id in (select id from my_lists) or m.list_id in (select id from seen_lists)
    union select e.actor_id from public.events e where e.list_id in (select id from seen_lists)
    union select c.author_id from public.event_comments c join public.events e on e.id = c.event_id where e.list_id in (select id from seen_lists)
    union select k.user_id from public.event_likes k join public.events e on e.id = k.event_id where e.list_id in (select id from seen_lists)
    union select i.user_id from public.interests i join public.items t on t.id = i.item_id where t.list_id in (select id from my_lists)
    union select b.user_id from public.borrow_haves b join public.items t on t.id = b.item_id where t.list_id in (select id from my_lists)
    union select v.user_id from public.item_invitees v join public.items t on t.id = v.item_id where t.list_id in (select id from my_lists)
    union select g.user_id from public.gift_claims g join public.items t on t.id = g.item_id
      where t.list_id in (select id from my_lists) and t.gift_surprise is false
    union select c.user_id from public.item_companions c join public.items t on t.id = c.item_id where t.list_id in (select id from seen_lists)
    union select m.user_id from public.item_companions c join public.items t on t.id = c.item_id
      join public.list_members m on m.list_id = t.list_id, me where c.user_id = me.id
    union select m.user_id from public.item_invitees v join public.items t on t.id = v.item_id
      join public.list_members m on m.list_id = t.list_id, me where v.user_id = me.id
    union select m.user_id from public.items t join public.list_members m on m.list_id = t.list_id
      where t.open_invite and t.invite_audience = 'anyone' and t.done_at is null
    union select unnest(n.actor_ids) from public.notifications n, me where n.recipient_id = me.id
  )
  select uid from ids where uid is not null and not public.is_blocked((select auth.uid()), uid);
$$;

revoke execute on function public.connected_ids() from public, anon;
grant execute on function public.connected_ids() to authenticated;

drop policy "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (id in (select public.connected_ids()));

-- Finding people you aren't connected to yet. Each is rate limited, so none of them can be used to
-- page through everyone.

-- By the start of their username or name, 2 characters at least, 20 at a time.
create function public.search_profiles(p_query text)
returns setof public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  q text := lower(regexp_replace(btrim(coalesce(p_query, '')), '^@', ''));
begin
  if char_length(q) < 2 then
    return;
  end if;
  perform public.rate_limit('search_profiles', 'searches', 40, 1000);
  return query
    select p.* from public.profiles p
    where p.id <> auth.uid()
      and (p.username like q || '%' or lower(p.name) like q || '%')
      and not public.is_blocked(auth.uid(), p.id)
    order by p.username
    limit 20;
end;
$$;

-- Exactly one username: a profile link someone shared.
create function public.profile_by_username(p_username text)
returns setof public.profiles
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.rate_limit('profile_by_username', 'profile lookups', 60, 1000);
  return query
    select p.* from public.profiles p
    where p.username = lower(btrim(coalesce(p_username, '')))
      and not public.is_blocked(auth.uid(), p.id);
end;
$$;

-- People whose ids you already have (a stranger's followers), up to 100 at a time.
create function public.profiles_by_ids(p_ids uuid[])
returns setof public.profiles
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.rate_limit('profiles_by_ids', 'profile lookups', 20, 300);
  return query
    select p.* from public.profiles p
    where p.id = any (p_ids[1:100])
      and not public.is_blocked(auth.uid(), p.id);
end;
$$;

revoke execute on function public.search_profiles(text) from public, anon;
revoke execute on function public.profile_by_username(text) from public, anon;
revoke execute on function public.profiles_by_ids(uuid[]) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.profile_by_username(text) to authenticated;
grant execute on function public.profiles_by_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Deleting your account
-- ---------------------------------------------------------------------------

-- Lists nobody else has joined go too: they'd be left with no owner, still visible to whoever
-- they were shared with. Lists you share stay with the others. (The app removes your profile
-- photo files and those lists' photo files first; files can't be removed from here.)
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  delete from public.lists l
  where exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id = me and m.status = 'joined')
    and not exists (select 1 from public.list_members m where m.list_id = l.id and m.user_id <> me and m.status = 'joined');
  delete from auth.users where id = me;
end;
$$;

-- Removing your own profile photo files (taking a photo off, or deleting your account). There
-- was no rule for this, so removed photos stayed in storage.
create policy "remove own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- 3. Reports reach the team
-- ---------------------------------------------------------------------------

-- The same sheet as feedback (feedback_sheet_url / feedback_sheet_secret in Vault), as a row of
-- kind "report": why, who or what it's about, and the words that were reported. Until the
-- secrets exist, reports are still saved; they just aren't copied.
create function public.reports_to_sheet()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  url text;
  secret text;
  reporter public.profiles;
  about public.profiles;
  what text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'feedback_sheet_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feedback_sheet_secret';
  if url is null or secret is null then
    return new;
  end if;

  select * into reporter from public.profiles where id = new.reporter_id;
  select * into about from public.profiles where id = new.profile_id;
  what := concat_ws(' · ',
    'reason: ' || nullif(new.reason, ''),
    'about @' || about.username,
    case when new.comment_id is not null then 'a comment'
         when new.item_id is not null then 'an item (' || new.item_id || ')'
         when new.list_id is not null then 'a list (' || new.list_id || ')'
         else 'a profile' end,
    'said: ' || nullif(new.content, ''));

  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'secret', secret,
      'id', new.id,
      'sent', to_char(new.created_at at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI'),
      'kind', 'report',
      'message', what,
      'username', coalesce(reporter.username, ''),
      'name', coalesce(reporter.name, ''),
      'email', '',
      'app_version', '',
      'platform', ''
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

revoke execute on function public.reports_to_sheet() from public, anon, authenticated;

create trigger reports_to_sheet after insert on public.reports
  for each row execute function public.reports_to_sheet();
