-- Deleting comments, take two.
--
-- Only the person who wrote a comment can delete it (it used to be the post's owner too).
-- A comment with replies isn't removed: it's blanked and marked deleted, so the replies stay
-- with a "comment deleted" in its place. Once its last reply is gone, the placeholder goes too.
-- People can still reply in that thread (by replying to one of its replies).

alter table public.event_comments add column deleted_at timestamptz;

-- a deleted comment keeps no words
alter table public.event_comments drop constraint event_comments_body_check;
alter table public.event_comments add constraint event_comments_body_check
  check (case when deleted_at is null then char_length(btrim(body)) between 1 and 1000 else body = '' end);

drop policy "delete comments" on public.event_comments;
create policy "delete comments" on public.event_comments for delete to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null);

-- What the app calls to delete a comment, so the blanking and the tidying up happen together.
create function public.delete_comment(p_comment uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.event_comments;
begin
  select * into c from public.event_comments where id = p_comment;
  if not found or c.deleted_at is not null then
    return;
  end if;
  if c.author_id is distinct from (select auth.uid()) then
    raise exception 'you can only delete your own comments' using errcode = '42501';
  end if;

  if exists (select 1 from public.event_comments where reply_to = c.id) then
    update public.event_comments set deleted_at = now(), body = '' where id = c.id;
  else
    delete from public.event_comments where id = c.id;
    -- that was the last reply under a deleted comment: the placeholder goes too
    if c.reply_to is not null then
      delete from public.event_comments p
      where p.id = c.reply_to and p.deleted_at is not null
        and not exists (select 1 from public.event_comments r where r.reply_to = p.id);
    end if;
  end if;
end;
$$;

revoke execute on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;
