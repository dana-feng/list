-- Direct replies to comments.
--
-- Threads are one level deep: a reply points at a top-level comment on the same post, and replying
-- to a reply points at that reply's parent. Deleting a comment takes its replies with it.

alter table public.event_comments
  add column reply_to uuid references public.event_comments (id) on delete cascade;
create index event_comments_reply_to_idx on public.event_comments (reply_to);

drop policy "comment" on public.event_comments;
create policy "comment" on public.event_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and not public.is_blocked(e.actor_id, (select auth.uid())))
    and (
      reply_to is null
      or exists (
        select 1 from public.event_comments parent
        where parent.id = reply_to and parent.event_id = event_comments.event_id and parent.reply_to is null)));
