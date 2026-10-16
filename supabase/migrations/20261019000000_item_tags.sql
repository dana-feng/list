-- Tags on items: invite, gift or borrow (or none). One tag per item.
--
--   invite  the open invite that already exists (open_invite + invite_audience + item_invitees)
--   gift    friends can say "i'll get it" for some or all of how many are wanted. Nobody can see
--           who: not the person who asked, not other friends. Everyone sees how many are left.
--   borrow  friends who have the thing say "i have it"; the list's people see who.
--
-- open_invite stays and is kept in step with tag by a trigger, so every rule that reads it
-- (who can see an invite, who can say they're interested, the feed) keeps working as it is, and
-- an older app that only writes open_invite still does the right thing.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

create type public.item_tag as enum ('invite', 'gift', 'borrow');

alter table public.items
  add column tag public.item_tag,
  -- gift: how many are wanted. Ignored for other tags.
  add column gift_quantity integer not null default 1 check (gift_quantity between 1 and 99),
  -- the item was crossed off because its gift was fully claimed, not by a person
  add column auto_done boolean not null default false;

update public.items set tag = 'invite' where open_invite;

-- ---------------------------------------------------------------------------
-- Gift claims and "i have it"
-- ---------------------------------------------------------------------------

create table public.gift_claims (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index gift_claims_user_idx on public.gift_claims (user_id);

create table public.borrow_haves (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index borrow_haves_user_idx on public.borrow_haves (user_id);

alter table public.gift_claims enable row level security;
alter table public.borrow_haves enable row level security;

-- gift_claims: you can only ever read your own row. Nobody else's, ever, so who's getting a
-- gift can't be found out through the API either. Counts come from gift_status(); claiming
-- goes through claim_gift(), so there are no write rules here at all.
create policy "read own claims" on public.gift_claims for select to authenticated
  using (user_id = (select auth.uid()));

-- borrow_haves: whoever can see the list sees who has it. You add and remove only yourself, on
-- someone else's borrow ask that's still open.
create policy "read haves" on public.borrow_haves for select to authenticated
  using (public.can_view_list(public.list_of_item(item_id)));
create policy "say you have it" on public.borrow_haves for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_list(public.list_of_item(item_id))
    and not public.is_list_member(public.list_of_item(item_id))
    and exists (select 1 from public.items i where i.id = item_id and i.tag = 'borrow' and i.done_at is null));
create policy "take it back" on public.borrow_haves for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.gift_claims to authenticated;
grant select, insert, delete on public.borrow_haves to authenticated;

-- ---------------------------------------------------------------------------
-- Keeping tag and open_invite in step, and freezing a gift once it's claimed
-- ---------------------------------------------------------------------------

create function public.gift_claimed(p_item uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(quantity), 0)::integer from public.gift_claims where item_id = p_item;
$$;

create function public.items_tag_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  claimed integer;
begin
  if tg_op = 'INSERT' then
    if new.tag is not null then
      new.open_invite := new.tag = 'invite';
    elsif new.open_invite then
      new.tag := 'invite';
    end if;
    return new;
  end if;

  if new.tag is distinct from old.tag then
    new.open_invite := coalesce(new.tag = 'invite', false);
  elsif new.open_invite is distinct from old.open_invite then
    -- an older app turning the open invite on or off
    new.tag := case when new.open_invite then 'invite'::public.item_tag
                    when old.tag = 'invite' then null
                    else old.tag end;
  end if;

  -- once anyone has said they'll get it, it stays a gift, and how many can't go below what's claimed
  if old.tag = 'gift' then
    claimed := public.gift_claimed(old.id);
    if claimed > 0 and new.tag is distinct from 'gift' then
      raise exception 'someone''s already getting this, so it stays a gift' using errcode = 'P0001';
    end if;
    if new.gift_quantity < claimed then
      raise exception '% already claimed, so it can''t be fewer than that', claimed using errcode = 'P0001';
    end if;
    -- crossed off because it was covered, and now more are wanted: it's open again
    if old.auto_done and old.done_at is not null and new.done_at is not distinct from old.done_at
       and new.gift_quantity > claimed then
      new.done_at := null;
    end if;
  end if;

  -- no longer a borrow ask: who had it goes too
  if old.tag = 'borrow' and new.tag is distinct from 'borrow' then
    delete from public.borrow_haves where item_id = old.id;
  end if;
  return new;
end;
$$;

-- Runs before items_before_write (alphabetical), which only looks at done_at.
create trigger items_a_tag_before_write before insert or update on public.items
  for each row execute function public.items_tag_before_write();

-- The app now writes tag, and the trigger above changes open_invite to match. Triggers that only
-- run "on update of open_invite" don't see a change made that way (they go by the columns in the
-- update statement), so they also run on update of tag now.
drop trigger items_after_write on public.items;
create trigger items_after_write after insert or update of open_invite, done_at, tag on public.items
  for each row execute function public.items_after_write();
drop trigger items_invite_notify on public.items;
create trigger items_invite_notify after update of open_invite, invite_audience, done_at, tag on public.items
  for each row execute function public.items_invite_notify();

-- ---------------------------------------------------------------------------
-- Crossed off by its gift being covered
--
-- claim_gift() crosses an item off when the last one is claimed, and puts it back when a claim
-- is taken back. That isn't a person doing it, so it has no done_by, makes no "did" post and no
-- notification (any of which would say who claimed last). It sets list.auto_done for the
-- length of that one update so the triggers can tell.
-- ---------------------------------------------------------------------------

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
  -- Whoever checks it off is done_by; unchecking clears both.
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null) then
    new.done_by := coalesce(new.done_by, public.acting_user(new.list_id));
  elsif new.done_at is null then
    new.done_by := null;
  end if;
  return new;
end;
$$;

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

  -- crossed off (or put back) by claim_gift: no post, and nobody to credit for finishing the list
  if tg_op = 'UPDATE' and current_setting('list.auto_done', true) = 'on' then
    perform public.refresh_list_completion(new.list_id, null);
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
    -- Checking off posts; unchecking takes the post back; checking off again brings it back.
    if new.done_at is not null and old.done_at is null then
      update public.events set retracted_at = null, actor_id = actor, created_at = now()
      where item_id = new.id and kind = 'item_done' and retracted_at is not null;
      if not found then
        insert into public.events (actor_id, kind, list_id, item_id)
        values (actor, 'item_done', new.list_id, new.id);
      end if;
    elsif new.done_at is null and old.done_at is not null then
      update public.events set retracted_at = now()
      where item_id = new.id and kind = 'item_done' and retracted_at is null;
    end if;
  end if;

  perform public.refresh_list_completion(new.list_id, actor);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- What the app calls
-- ---------------------------------------------------------------------------

-- How many each gift you can see wants, how many are claimed, and how many of those are yours.
-- Never who.
create function public.gift_status()
returns table (item_id uuid, quantity integer, claimed integer, mine integer)
language sql stable security definer set search_path = ''
as $$
  select
    i.id,
    i.gift_quantity,
    public.gift_claimed(i.id),
    coalesce((select c.quantity from public.gift_claims c where c.item_id = i.id and c.user_id = (select auth.uid())), 0)
  from public.items i
  where i.tag = 'gift' and public.can_view_list(i.list_id);
$$;

-- "i'll get it": sets how many you're getting (0 takes it back). Refuses more than are left, and
-- gifts on your own lists. Crosses the item off when the last one is claimed, and puts it back
-- when a claim is taken back, unless a person crossed it off themselves.
create function public.claim_gift(p_item uuid, p_quantity integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  i public.items;
  others integer;
  mine integer;
  total integer;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into i from public.items where id = p_item for update;
  if not found or i.tag is distinct from 'gift' or not public.can_view_list(i.list_id) then
    raise exception 'that isn''t a gift you can get' using errcode = '42501';
  end if;
  if public.is_list_member(i.list_id) then
    raise exception 'it''s on your own list' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'how many has to be 0 or more' using errcode = '22023';
  end if;

  select coalesce(sum(quantity) filter (where user_id <> me), 0), coalesce(sum(quantity) filter (where user_id = me), 0)
    into others, mine
    from public.gift_claims where item_id = p_item;

  -- crossed off by a person: you can only take yours back
  if i.done_at is not null and not i.auto_done and p_quantity > mine then
    raise exception 'that one''s already done' using errcode = 'P0001';
  end if;
  if p_quantity > i.gift_quantity - others then
    raise exception 'only % left', greatest(i.gift_quantity - others, 0) using errcode = 'P0001';
  end if;

  if p_quantity = 0 then
    delete from public.gift_claims where item_id = p_item and user_id = me;
  else
    insert into public.gift_claims (item_id, user_id, quantity) values (p_item, me, p_quantity)
    on conflict (item_id, user_id) do update set quantity = excluded.quantity;
  end if;

  total := others + p_quantity;
  perform set_config('list.auto_done', 'on', true);
  if total >= i.gift_quantity and i.done_at is null then
    update public.items set done_at = now() where id = p_item;
  elsif total < i.gift_quantity and i.done_at is not null and i.auto_done then
    update public.items set done_at = null where id = p_item;
  end if;
  perform set_config('list.auto_done', 'off', true);
end;
$$;

revoke execute on function public.gift_status() from public, anon;
revoke execute on function public.claim_gift(uuid, integer) from public, anon;
revoke execute on function public.gift_claimed(uuid) from public, anon, authenticated;
grant execute on function public.gift_status() to authenticated;
grant execute on function public.claim_gift(uuid, integer) to authenticated;
