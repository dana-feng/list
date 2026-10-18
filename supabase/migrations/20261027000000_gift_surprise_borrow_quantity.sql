-- Gifts: a surprise setting, a list of who's getting it, and a notification when someone claims.
-- Borrow asks: how many are wanted, and how many each person has.
--
--   gift_surprise  on (the default, and how every gift worked until now): nobody sees who's
--                  getting it, not the list's people and not other friends. Each claim shows as
--                  "someone", except your own. Off: everyone who can see the list sees who.
--                  Once anyone has claimed, it can't be turned off (they claimed it as a secret).
--   gift_claim     the list's people hear when someone says they'll get it: "someone is getting
--                  plant stand", or with the name when it isn't a surprise. On a surprise the
--                  row never holds who (no face, and its source ids are random, not user ids).
--   gift_quantity  now also how many a borrow ask wants ("borrow · 4 folding chairs"), and
--                  borrow_haves.quantity how many each person has.

alter type public.notification_kind add value if not exists 'gift_claim';

alter table public.items add column gift_surprise boolean not null default true;
comment on column public.items.gift_quantity is 'how many are wanted, for a gift or a borrow ask';

-- what a claim's notification is filed under instead of who made it
alter table public.gift_claims add column notice_id uuid not null default gen_random_uuid();

alter table public.borrow_haves add column quantity integer not null default 1 check (quantity between 1 and 99);

-- ---------------------------------------------------------------------------
-- Surprise can't be turned off once someone's claimed
-- ---------------------------------------------------------------------------

create function public.items_gift_surprise_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.gift_surprise and not new.gift_surprise and public.gift_claimed(old.id) > 0 then
    raise exception 'someone''s already getting this as a surprise, so it stays one' using errcode = 'P0001';
  end if;
  -- turned on: whatever names the list's people were already told go from their notifications
  if new.gift_surprise and not old.gift_surprise then
    update public.notifications set actor_ids = '{}' where item_id = new.id and kind::text = 'gift_claim';
  end if;
  return new;
end;
$$;

create trigger items_gift_surprise_before_write before update of gift_surprise on public.items
  for each row execute function public.items_gift_surprise_before_write();

-- ---------------------------------------------------------------------------
-- Who's getting it
-- ---------------------------------------------------------------------------

-- Every claim on a gift you can see, oldest first. user_id is only filled in when it isn't a
-- surprise, or when it's yours.
create function public.gift_claimers()
returns table (item_id uuid, user_id uuid, quantity integer, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select
    c.item_id,
    case when not i.gift_surprise or c.user_id = (select auth.uid()) then c.user_id end,
    c.quantity,
    c.created_at
  from public.gift_claims c
  join public.items i on i.id = c.item_id
  where i.tag = 'gift' and public.can_view_list(i.list_id)
  order by c.created_at;
$$;

revoke execute on function public.gift_claimers() from public, anon;
grant execute on function public.gift_claimers() to authenticated;

-- ---------------------------------------------------------------------------
-- Notifying the list's people
-- ---------------------------------------------------------------------------

-- One row per gift while unread: "someone is getting…", "3 people are getting…". Like notify(),
-- but on a surprise nothing in the row says who.
create function public.gift_claims_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r public.gift_claims;
  i public.items;
  m uuid;
  src text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  select * into i from public.items where id = r.item_id;
  if not found then
    return null;
  end if;
  src := r.notice_id::text;

  for m in select public.list_member_ids(i.list_id) loop
    if m = r.user_id or public.is_blocked(m, r.user_id) then
      continue;
    end if;
    if tg_op = 'INSERT' then
      insert into public.notifications as n
        (recipient_id, kind, group_key, list_id, item_id, actor_ids, source_ids)
      values
        (m, 'gift_claim'::text::public.notification_kind, 'gift:' || i.id, i.list_id, i.id,
         case when i.gift_surprise then '{}'::uuid[] else array[r.user_id] end, array[src])
      on conflict (recipient_id, group_key) where read_at is null do update set
        actor_ids = case when i.gift_surprise then '{}'::uuid[]
                         else (array_prepend(r.user_id, array_remove(n.actor_ids, r.user_id)))[1:12] end,
        source_ids = array_append(array_remove(n.source_ids, src), src),
        count = cardinality(array_append(array_remove(n.source_ids, src), src)),
        updated_at = now(),
        seen_at = null;
    else
      perform public.unnotify(m, 'gift:' || i.id, src, r.user_id);
    end if;
  end loop;
  return null;
end;
$$;

-- changing how many you're getting isn't news; saying you will, or taking it back, is
create trigger gift_claims_notify after insert or delete on public.gift_claims
  for each row execute function public.gift_claims_notify();

-- and they go with the item, like an invite's do
create or replace function public.items_delete_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where item_id = old.id
    and (kind::text in ('item_invite', 'interested', 'borrow_has', 'done_with', 'gift_claim') or (kind = 'mention' and comment_id is null));
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Borrow: how many you have
-- ---------------------------------------------------------------------------

-- no more than the ask wants
drop policy "say you have it" on public.borrow_haves;
create policy "say you have it" on public.borrow_haves for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_list(public.list_of_item(item_id))
    and not public.is_list_member(public.list_of_item(item_id))
    and exists (select 1 from public.items i where i.id = item_id and i.tag = 'borrow' and i.done_at is null
                and quantity <= i.gift_quantity));
create policy "change how many you have" on public.borrow_haves for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.tag = 'borrow' and i.done_at is null
                and quantity <= i.gift_quantity));

grant update (quantity) on public.borrow_haves to authenticated;
