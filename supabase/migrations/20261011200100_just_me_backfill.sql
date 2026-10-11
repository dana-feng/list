-- Lists set to "specific people" with nobody picked were the old way of saying "just me".
update public.lists l
set visibility = 'just_me'
where l.visibility = 'specific'
  and not exists (select 1 from public.list_viewers v where v.list_id = l.id);
