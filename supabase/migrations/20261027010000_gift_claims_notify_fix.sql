-- Fixes gift_claims_notify from …_gift_surprise_borrow_quantity.sql, which was written against the
-- notifications table as the repo's migration files describe it (source_ids, unnotify(recipient,
-- group, source, actor)). The hosted project has the earlier shape: no source_ids, a plain count,
-- and unnotify(recipient, group, actor, drop_actor). Saying you'll get a gift, or taking it back,
-- failed there. This version only uses columns both shapes have, and doesn't call unnotify.

create or replace function public.gift_claims_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r public.gift_claims;
  i public.items;
  m uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  select * into i from public.items where id = r.item_id;
  if not found then
    return null;
  end if;

  for m in select public.list_member_ids(i.list_id) loop
    if m = r.user_id or public.is_blocked(m, r.user_id) then
      continue;
    end if;
    if tg_op = 'INSERT' then
      insert into public.notifications as n
        (recipient_id, kind, group_key, list_id, item_id, actor_ids)
      values
        (m, 'gift_claim'::text::public.notification_kind, 'gift:' || i.id, i.list_id, i.id,
         case when i.gift_surprise then '{}'::uuid[] else array[r.user_id] end)
      on conflict (recipient_id, group_key) where read_at is null do update set
        actor_ids = case when i.gift_surprise then '{}'::uuid[]
                         else (array_prepend(r.user_id, array_remove(n.actor_ids, r.user_id)))[1:12] end,
        count = n.count + 1,
        updated_at = now(),
        seen_at = null;
    else
      -- taken back: one fewer in the unread row, or the row goes when it was the only one
      delete from public.notifications
      where recipient_id = m and group_key = 'gift:' || i.id and read_at is null and count <= 1;
      update public.notifications
      set count = count - 1, actor_ids = array_remove(actor_ids, r.user_id)
      where recipient_id = m and group_key = 'gift:' || i.id and read_at is null;
    end if;
  end loop;
  return null;
end;
$$;

-- the API's list of functions: pick up gift_claimers()
notify pgrst, 'reload schema';
