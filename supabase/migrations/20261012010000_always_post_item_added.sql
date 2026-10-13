-- Adding an item always posts "added an item", even when it's added with its open invite on.
--
-- Before, that case made a single open-invite post. But an invite now has its own audience, so
-- people who can see the list and aren't invited would hear nothing about the new item. The feed
-- shows the "added" post (to whoever can see the list); the invite itself shows under Open Invites
-- (to whoever is invited). The open_invite event is still recorded when an invite goes out.

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

-- Items that were added with their invite on only got the invite post. Give them the "added"
-- post they would have had, by the same person at the time the item was made.
insert into public.events (actor_id, kind, list_id, item_id, created_at)
select distinct on (i.id) e.actor_id, 'item_added', i.list_id, i.id, i.created_at
from public.items i
join public.events e on e.item_id = i.id and e.kind = 'open_invite'
where not exists (select 1 from public.events a where a.item_id = i.id and a.kind = 'item_added')
order by i.id, e.created_at;
