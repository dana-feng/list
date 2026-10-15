-- The reply check in the "comment" policy read event_comments from inside event_comments' own
-- policy, which Postgres rejects as infinite recursion. Do that lookup in a security definer
-- function instead, the same way is_blocked works.

-- A top-level comment on that post, so a reply to it stays one level deep.
create function public.is_thread_start(p_comment uuid, p_event uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_comments
    where id = p_comment and event_id = p_event and reply_to is null
  );
$$;

drop policy "comment" on public.event_comments;
create policy "comment" on public.event_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and not public.is_blocked(e.actor_id, (select auth.uid())))
    and (reply_to is null or public.is_thread_start(reply_to, event_id)));
