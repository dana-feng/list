-- An open invite gets its own audience, separate from who can see the list:
-- followers, specific people, or anyone.
--
-- Being in an invite's audience lets you see that one item (with its photos and who's down),
-- the name of the list it's on and who's on that list, even when you can't see the list.
-- You don't see the list's other items. That access lasts while the invite is open: once the
-- item is done or the invite is turned off, it goes back to the list's own rule.

create type public.invite_audience as enum ('followers', 'specific', 'anyone');

-- Only means something while open_invite is on.
alter table public.items
  add column invite_audience public.invite_audience not null default 'followers';

-- Only used when items.invite_audience = 'specific'.
create table public.item_invitees (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (item_id, user_id)
);
create index item_invitees_user_idx on public.item_invitees (user_id);

-- Until now an open invite went to everyone who could see its list. Keep it that way for the
-- ones that already exist. ("just me" lists had nobody to invite, so: specific people, none picked.)
update public.items i
set invite_audience = (case l.visibility::text
                         when 'anyone' then 'anyone'
                         when 'followers' then 'followers'
                         else 'specific'
                       end)::public.invite_audience
from public.lists l
where l.id = i.list_id and i.open_invite;

insert into public.item_invitees (item_id, user_id)
select i.id, v.user_id
from public.items i
join public.lists l on l.id = i.list_id and l.visibility = 'specific'
join public.list_viewers v on v.list_id = l.id
where i.open_invite
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helpers (security definer for the same reason as can_view_list)
-- ---------------------------------------------------------------------------

-- Whether the item's invite audience includes you, whatever state the invite is in.
-- "followers" means the same as it does for a list: you follow someone on it.
create function public.in_invite_audience(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item
      and (
        i.invite_audience = 'anyone'
        or (i.invite_audience = 'followers' and exists (
              select 1
              from public.list_members m
              join public.follows f on f.followee_id = m.user_id
              where m.list_id = i.list_id and m.status = 'joined'
                and f.follower_id = (select auth.uid())))
        or (i.invite_audience = 'specific' and exists (
              select 1 from public.item_invitees v
              where v.item_id = i.id and v.user_id = (select auth.uid())))
      )
      and not exists (
        select 1
        from public.list_members m
        join public.blocks b
          on (b.blocker_id = m.user_id and b.blocked_id = (select auth.uid()))
          or (b.blocked_id = m.user_id and b.blocker_id = (select auth.uid()))
        where m.list_id = i.list_id and m.status = 'joined')
  );
$$;

-- The invite is open right now and you're in its audience.
create function public.can_see_invite(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item and i.open_invite and i.done_at is null
  ) and public.in_invite_audience(p_item);
$$;

-- The list has at least one open invite you can see.
create function public.has_invite_on_list(p_list uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.list_id = p_list and i.open_invite and i.done_at is null
      and public.in_invite_audience(i.id)
  );
$$;

create function public.can_view_item(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_view_list(public.list_of_item(p_item)) or public.can_see_invite(p_item);
$$;

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

alter table public.item_invitees enable row level security;

-- item_invitees: the chosen people, managed by anyone on the list. You can see your own row.
create policy "read invitees" on public.item_invitees for select to authenticated
  using (public.is_list_member(public.list_of_item(item_id)) or user_id = (select auth.uid()));
create policy "add invitees" on public.item_invitees for insert to authenticated
  with check (public.is_list_member(public.list_of_item(item_id)));
create policy "remove invitees" on public.item_invitees for delete to authenticated
  using (public.is_list_member(public.list_of_item(item_id)));

-- lists and who's on them: also readable when you're invited to something on the list.
drop policy "read lists" on public.lists;
create policy "read lists" on public.lists for select to authenticated
  using (public.can_view_list(id) or public.has_invite_on_list(id));

drop policy "read members" on public.list_members;
create policy "read members" on public.list_members for select to authenticated
  using (public.can_view_list(list_id) or public.has_invite_on_list(list_id));

-- items: everything on a list you can see, plus open invites that include you.
drop policy "read items" on public.items;
create policy "read items" on public.items for select to authenticated
  using (
    public.can_view_list(list_id)
    or (open_invite and done_at is null and public.in_invite_audience(id)));

drop policy "read photos" on public.item_photos;
create policy "read photos" on public.item_photos for select to authenticated
  using (public.can_view_item(item_id));

drop policy "read stars" on public.interests;
create policy "read stars" on public.interests for select to authenticated
  using (public.can_view_item(item_id));

-- Saying you're down: only for an open invite that includes you, and never on a list you're on.
drop policy "star" on public.interests;
create policy "star" on public.interests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_see_invite(item_id)
    and not public.is_list_member(public.list_of_item(item_id)));

-- Feed: an open-invite post follows the invite's audience, not the list's. People on the list
-- always see it; so do people who can see the list and were in the audience, after it closes.
drop policy "read feed" on public.events;
create policy "read feed" on public.events for select to authenticated
  using (
    (
      actor_id = (select auth.uid())
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

-- Photo files of an open invite that includes you: photos/<list id>/<item id>/<file>.
create policy "view invite photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_see_invite(((storage.foldername(name))[2])::uuid));

-- New tables don't get these by default on every project, so say it outright.
grant select, insert, delete on public.item_invitees to authenticated;
