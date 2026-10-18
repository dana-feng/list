-- Push notifications open the post (the comments sheet) for likes, comments, replies, tags in a
-- comment, "did", "added" and "did it with you", like tapping the row in the bell now does.
-- claim_push() also sends the post's id: the row's own event, or for "did" / "added" / "did it
-- with you" the item's newest post of that kind that's still up.

create or replace function public.claim_push(p_notification uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  n public.notifications;
  rule text;
begin
  -- locked, so a second call for the same row waits and then sees pushed_at
  select * into n from public.notifications where id = p_notification for update;
  if not found or n.seen_at is not null or n.read_at is not null then
    return null;
  end if;

  rule := public.push_rule(n.kind);
  if rule = 'never' then
    return null;
  end if;
  -- already sent for this exact version of the row
  if n.pushed_at is not null and n.pushed_at >= n.updated_at then
    return null;
  end if;
  if rule = 'throttled' and exists (
    select 1 from public.notifications
    where recipient_id = n.recipient_id
      and public.push_rule(kind) = 'throttled'
      and pushed_at > now() - interval '30 minutes'
  ) then
    return null;
  end if;
  if not exists (select 1 from public.push_tokens where user_id = n.recipient_id) then
    return null;
  end if;

  update public.notifications set pushed_at = now() where id = n.id;

  return jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'count', n.count,
    'body', n.body,
    'list_id', n.list_id,
    'item_id', n.item_id,
    'event_id', coalesce(n.event_id, (
      select e.id from public.events e
      where e.item_id = n.item_id and e.retracted_at is null
        and e.kind::text = case n.kind::text when 'item_added' then 'item_added' when 'item_done' then 'item_done' when 'done_with' then 'item_done' end
      order by e.created_at desc limit 1)),
    -- names in the order of actor_ids (newest first), up to 2: the message says "and N others" past that
    'actors', coalesce((
      select jsonb_agg(p.name order by a.ord)
      from unnest(n.actor_ids) with ordinality as a (id, ord)
      join public.profiles p on p.id = a.id
      where a.ord <= 2), '[]'::jsonb),
    'actor_count', coalesce(array_length(n.actor_ids, 1), 0),
    'list_title', (select title from public.lists where id = n.list_id),
    'item_title', (select title from public.items where id = n.item_id),
    'tokens', (
      select jsonb_agg(jsonb_build_object(
        'token', t.token,
        'platform', t.platform,
        'quiet', public.in_quiet_hours(t.time_zone)))
      from public.push_tokens t
      where t.user_id = n.recipient_id)
  );
end;
$$;

