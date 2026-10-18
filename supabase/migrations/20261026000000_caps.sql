-- Caps on how big things can get. The app (src/limits.ts) stops you before these; this is for
-- anything that skips it. Titles, names, bios and comments were already capped when their tables
-- were made.
--
--   item notes        6000 characters as saved. The app stops typing at 2000; saved notes run
--                     longer because each @tag is stored with its id (~40 extra characters).
--   done caption      280 characters
--   report reason     500 characters
--   items per list    200
--   photos per item   10
--   lists per person  100 (lists you're on, counted when you start a new one)

alter table public.items
  add constraint items_notes_length check (char_length(notes) <= 6000),
  add constraint items_caption_length check (caption is null or char_length(caption) <= 280);

alter table public.reports
  add constraint reports_reason_length check (char_length(reason) <= 500);

-- Counts are checked before each insert. Two inserts at the same moment could both squeeze in
-- past a cap by one; that's fine for limits this size.

create function public.cap_items_per_list()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.items where list_id = new.list_id) >= 200 then
    raise exception 'lists hold up to 200 items' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger items_cap before insert on public.items
  for each row execute function public.cap_items_per_list();

create function public.cap_photos_per_item()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.item_photos where item_id = new.item_id) >= 10 then
    raise exception 'an item holds up to 10 photos' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger item_photos_cap before insert on public.item_photos
  for each row execute function public.cap_photos_per_item();

-- Lists are only made through create_list(), which runs as the person starting one, so
-- auth.uid() is them.
create function public.cap_lists_per_person()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.list_members where user_id = (select auth.uid()) and status = 'joined') >= 100 then
    raise exception 'you can be on up to 100 lists' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger lists_cap before insert on public.lists
  for each row execute function public.cap_lists_per_person();

revoke execute on function public.cap_items_per_list() from public, anon, authenticated;
revoke execute on function public.cap_photos_per_item() from public, anon, authenticated;
revoke execute on function public.cap_lists_per_person() from public, anon, authenticated;
