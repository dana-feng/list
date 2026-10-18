-- "did it with": when something's crossed off, the list's people can say who they did it with.
-- Anyone can be tagged, on any item (not just open invites), as long as nobody's blocked.
--
-- Being tagged on a crossed-off item lets you see that one item (with its photos, who was
-- interested, and its "did" post, which you can like and comment on), the name of the list it's
-- on and who's on that list, even when you can't see the list. The same reach an open invite
-- gives, for as long as the item stays crossed off.
--
-- The tagged person gets a notification. They can untag themselves; the list's people can untag
-- anyone. Putting the item back (undo) takes the notification back and hides the item from them
-- again; crossing it off again brings both back. Tags are kept through that, so an accidental
-- undo doesn't lose them.

alter type public.notification_kind add value if not exists 'done_with';

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.item_companions (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index item_companions_user_idx on public.item_companions (user_id);

alter table public.item_companions enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (security definer for the same reason as can_view_list)
-- ---------------------------------------------------------------------------

-- You're tagged on this item, it's crossed off, and nobody on its list has blocked you or been
-- blocked by you.
create function public.did_it_with_me(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.item_companions c on c.item_id = i.id and c.user_id = (select auth.uid())
    where i.id = p_item
      and i.done_at is not null
      and not exists (
        select 1
        from public.list_members m
        join public.blocks b
          on (b.blocker_id = m.user_id and b.blocked_id = (select auth.uid()))
          or (b.blocked_id = m.user_id and b.blocker_id = (select auth.uid()))
        where m.list_id = i.list_id and m.status = 'joined'));
$$;

-- The list has at least one crossed-off item you're tagged on.
create function public.did_something_with_me_on_list(p_list uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    join public.item_companions c on c.item_id = i.id and c.user_id = (select auth.uid())
    where i.list_id = p_list and i.done_at is not null and public.did_it_with_me(i.id));
$$;

-- did_it_with_me for someone else, so a trigger can check a notification's recipient.
create function public.did_it_with_as(p_item uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.item_companions c on c.item_id = i.id and c.user_id = p_user
    where i.id = p_item
      and i.done_at is not null
      and not exists (
        select 1
        from public.list_members m
        join public.blocks b
          on (b.blocker_id = m.user_id and b.blocked_id = p_user)
          or (b.blocked_id = m.user_id and b.blocker_id = p_user)
        where m.list_id = i.list_id and m.status = 'joined'));
$$;

-- Photos and who's interested follow can_view_item, so this brings those along.
create or replace function public.can_view_item(p_item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_view_list(public.list_of_item(p_item))
      or public.can_see_invite(p_item)
      or public.did_it_with_me(p_item);
$$;

-- Same as before, plus being tagged, so mentions and comments on the post reach tagged people.
create or replace function public.can_view_item_as(p_item uuid, p_user uuid)
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
              where m.list_id = i.list_id and m.status = 'joined'))))
    or public.did_it_with_as(p_item, p_user);
$$;

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

-- Who did it with them: whoever can see the item, and you can always see your own tag.
create policy "read companions" on public.item_companions for select to authenticated
  using (public.can_view_item(item_id) or user_id = (select auth.uid()));

-- The list's people tag someone on a crossed-off item: not themselves, not someone on the list
-- (they're already in it), and not someone either of you has blocked.
create policy "tag companions" on public.item_companions for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and user_id <> (select auth.uid())
    and public.is_list_member(public.list_of_item(item_id))
    and exists (select 1 from public.items i where i.id = item_id and i.done_at is not null)
    and not exists (
      select 1 from public.list_members m
      where m.list_id = public.list_of_item(item_id) and m.user_id = item_companions.user_id and m.status = 'joined')
    and not public.is_blocked((select auth.uid()), user_id));

-- The list's people untag anyone; anyone untags themselves.
create policy "untag companions" on public.item_companions for delete to authenticated
  using (public.is_list_member(public.list_of_item(item_id)) or user_id = (select auth.uid()));

grant select, insert, delete on public.item_companions to authenticated;

-- At most 20 people on one item, so a tag can't be used to ping a crowd.
create function public.item_companions_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.item_companions where item_id = new.item_id) >= 20 then
    raise exception 'that''s as many people as one thing can have' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger item_companions_limit before insert on public.item_companions
  for each row execute function public.item_companions_limit();

-- Lists and who's on them: also readable when you're tagged on something on the list.
drop policy "read lists" on public.lists;
create policy "read lists" on public.lists for select to authenticated
  using (public.can_view_list(id) or public.has_invite_on_list(id) or public.did_something_with_me_on_list(id));

drop policy "read members" on public.list_members;
create policy "read members" on public.list_members for select to authenticated
  using (public.can_view_list(list_id) or public.has_invite_on_list(list_id) or public.did_something_with_me_on_list(list_id));

-- Items: plus crossed-off ones you're tagged on.
drop policy "read items" on public.items;
create policy "read items" on public.items for select to authenticated
  using (
    public.can_view_list(list_id)
    or (open_invite and done_at is null and public.in_invite_audience(id))
    or (done_at is not null and public.did_it_with_me(id)));

-- Feed: plus the "did" post of something you're tagged on, whoever crossed it off.
drop policy "read feed" on public.events;
create policy "read feed" on public.events for select to authenticated
  using (
    retracted_at is null
    and (
      (
        (
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
            end
      )
      or (kind = 'item_done' and item_id is not null and public.did_it_with_me(item_id))
    ));

-- Photo files of something you're tagged on: photos/<list id>/<item id>/<file>.
create policy "view done-with photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.did_it_with_me(((storage.foldername(name))[2])::uuid));

-- ---------------------------------------------------------------------------
-- Notifications: "dana did apple picking with you"
-- ---------------------------------------------------------------------------

-- Tagged on something already crossed off: tell them. Untagged: take it back.
create function public.item_companions_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  i public.items;
begin
  if tg_op = 'INSERT' then
    select * into i from public.items where id = new.item_id;
    if found and i.done_at is not null then
      perform public.notify(new.user_id, 'done_with'::text::public.notification_kind, 'with:' || new.item_id,
                            new.added_by, i.list_id, i.id);
    end if;
  else
    -- one tag per person per item, so the row's only source is the group itself (notify()'s default)
    perform public.unnotify(old.user_id, 'with:' || old.item_id, 'with:' || old.item_id);
  end if;
  return null;
end;
$$;

create trigger item_companions_notify after insert or delete on public.item_companions
  for each row execute function public.item_companions_notify();

-- Undo takes everyone's notification back; crossing it off again tells them again. Not when a
-- gift crosses itself off (that would say who claimed last).
create function public.items_companions_done_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c public.item_companions;
  actor uuid;
begin
  if current_setting('list.auto_done', true) = 'on' then
    return null;
  end if;
  if new.done_at is null and old.done_at is not null then
    for c in select * from public.item_companions where item_id = new.id loop
      delete from public.notifications
      where recipient_id = c.user_id and group_key = 'with:' || new.id and read_at is null;
    end loop;
  elsif new.done_at is not null and old.done_at is null then
    actor := public.acting_user(new.list_id);
    for c in select * from public.item_companions where item_id = new.id loop
      perform public.notify(c.user_id, 'done_with'::text::public.notification_kind, 'with:' || new.id,
                            actor, new.list_id, new.id);
    end loop;
  end if;
  return null;
end;
$$;

create trigger items_companions_done_notify after update of done_at on public.items
  for each row execute function public.items_companions_done_notify();

-- and they go with the item, like an invite's do
create or replace function public.items_delete_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where item_id = old.id
    and (kind::text in ('item_invite', 'interested', 'borrow_has', 'done_with') or (kind = 'mention' and comment_id is null));
  return old;
end;
$$;

revoke execute on function public.did_it_with_as(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.did_it_with_me(uuid) from public, anon;
revoke execute on function public.did_something_with_me_on_list(uuid) from public, anon;
grant execute on function public.did_it_with_me(uuid) to authenticated;
grant execute on function public.did_something_with_me_on_list(uuid) to authenticated;
