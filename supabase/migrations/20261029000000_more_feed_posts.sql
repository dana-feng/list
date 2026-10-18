-- More feed posts: photos added, someone joining a list, and an item being tagged or given a date.
--
--   photos_added  "dana added 3 photos to hike". One post per person per item: more photos within
--                 30 minutes bring the same post back to the top instead of adding another. No post
--                 while the item's own "added" post is under 30 minutes old (that post already
--                 shows its photos).
--   list_joined   "bo joined trips", when an invite to own a list is accepted.
--   item_tagged   "dana wants a lamp" / "wants company for" / "wants to borrow", when an item that's
--                 already there becomes a gift, an invite or a borrow ask.
--   item_dated    "dana set a date for hike", when an item that's already there gets a (new) date.
--                 Tag and date changes within 15 minutes of the last one merge the same way.
--
-- Who can read them is the existing "read feed" rule: these fall under its "can see the list"
-- case. None of them notify anyone (events_notify only acts on item_added, item_done and
-- list_done).

alter type public.event_kind add value if not exists 'photos_added';
alter type public.event_kind add value if not exists 'list_joined';
alter type public.event_kind add value if not exists 'item_tagged';
alter type public.event_kind add value if not exists 'item_dated';

-- A post by `p_actor` of `p_kind` about this item: brought back to the top if they made one in the
-- last `p_within`, otherwise a new one.
create function public.post_or_bump(p_actor uuid, p_kind text, p_list uuid, p_item uuid, p_within interval)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.events set created_at = now()
  where actor_id = p_actor and kind = p_kind::public.event_kind and item_id is not distinct from p_item
    and list_id = p_list and retracted_at is null and created_at > now() - p_within;
  if not found then
    insert into public.events (actor_id, kind, list_id, item_id)
    values (p_actor, p_kind::public.event_kind, p_list, p_item);
  end if;
end;
$$;

revoke execute on function public.post_or_bump(uuid, text, uuid, uuid, interval) from public, anon, authenticated;

-- photos_added
create function public.item_photos_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  i public.items;
  actor uuid;
begin
  select * into i from public.items where id = new.item_id;
  if not found then
    return null;
  end if;
  actor := coalesce(new.added_by, public.acting_user(i.list_id));
  if actor is null then
    return null;
  end if;
  -- just added the item with its photos: its "added" post already shows them
  if exists (
    select 1 from public.events
    where item_id = i.id and kind = 'item_added' and actor_id = actor and created_at > now() - interval '30 minutes'
  ) then
    return null;
  end if;
  perform public.post_or_bump(actor, 'photos_added', i.list_id, i.id, interval '30 minutes');
  return null;
end;
$$;

create trigger item_photos_post after insert on public.item_photos
  for each row execute function public.item_photos_post();

-- list_joined
create function public.list_members_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'invited' and new.status = 'joined' then
    insert into public.events (actor_id, kind, list_id) values (new.user_id, 'list_joined', new.list_id);
  end if;
  return null;
end;
$$;

create trigger list_members_post after update of status on public.list_members
  for each row execute function public.list_members_post();

-- item_tagged, item_dated
create function public.items_tag_date_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := public.acting_user(new.list_id);
begin
  if actor is null or new.done_at is not null then
    return null;
  end if;
  if new.tag is not null and new.tag is distinct from old.tag then
    perform public.post_or_bump(actor, 'item_tagged', new.list_id, new.id, interval '15 minutes');
  end if;
  if new.date is not null and new.date is distinct from old.date then
    perform public.post_or_bump(actor, 'item_dated', new.list_id, new.id, interval '15 minutes');
  end if;
  return null;
end;
$$;

create trigger items_tag_date_post after update of tag, date on public.items
  for each row execute function public.items_tag_date_post();

revoke execute on function public.item_photos_post() from public, anon, authenticated;
revoke execute on function public.list_members_post() from public, anon, authenticated;
revoke execute on function public.items_tag_date_post() from public, anon, authenticated;
