-- create_list takes an optional id so the app can show the new list right away,
-- before the database answers.

drop function public.create_list(text, public.list_visibility, uuid[], uuid[]);

create function public.create_list(
  p_title text,
  p_visibility public.list_visibility default 'followers',
  p_viewers uuid[] default '{}',
  p_invites uuid[] default '{}',
  p_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  insert into public.lists (id, title, visibility) values (new_id, p_title, p_visibility);

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

revoke execute on function public.create_list(text, public.list_visibility, uuid[], uuid[], uuid) from public, anon;
grant execute on function public.create_list(text, public.list_visibility, uuid[], uuid[], uuid) to authenticated;
