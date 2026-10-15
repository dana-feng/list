-- Things on a list can be put in an order by hand (hold a row and drag it).
-- position is null until someone reorders the list; things added after that are null
-- again and sit on top, newest first, until the next reorder.

alter table public.items add column position integer;

-- Saves a whole list's order in one go: p_ids is the to-do things, top to bottom.
-- Runs as the caller, so the "edit items" rule still decides who may do this.
create function public.reorder_items(p_list_id uuid, p_ids uuid[])
returns void
language sql set search_path = ''
as $$
  update public.items i
     set position = o.ord - 1
    from unnest(p_ids) with ordinality as o (id, ord)
   where i.id = o.id and i.list_id = p_list_id;
$$;

revoke execute on function public.reorder_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_items(uuid, uuid[]) to authenticated;
