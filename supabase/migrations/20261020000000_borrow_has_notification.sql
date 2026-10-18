-- "funmi has some black heels you can borrow": tell the list's people when someone says they
-- have the thing a borrow ask is for. Grouped per item while unread ("funmi and arjun have…").
-- Taking it back takes the notification back. (Gift claims never notify anyone: that would say
-- who's getting it.)

alter type public.notification_kind add value if not exists 'borrow_has';

create function public.borrow_haves_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r public.borrow_haves;
  l uuid;
  m uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  l := public.list_of_item(r.item_id);
  if l is null then
    return null;
  end if;
  for m in select public.list_member_ids(l) loop
    if tg_op = 'INSERT' then
      perform public.notify(m, 'borrow_has'::text::public.notification_kind, 'has:' || r.item_id, r.user_id, l, r.item_id,
                            p_source => r.user_id::text);
    else
      perform public.unnotify(m, 'has:' || r.item_id, r.user_id::text, r.user_id);
    end if;
  end loop;
  return null;
end;
$$;

create trigger borrow_haves_notify after insert or delete on public.borrow_haves
  for each row execute function public.borrow_haves_notify();

-- and they go with the item, like an invite's do
create or replace function public.items_delete_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where item_id = old.id
    and (kind::text in ('item_invite', 'interested', 'borrow_has') or (kind = 'mention' and comment_id is null));
  return old;
end;
$$;
