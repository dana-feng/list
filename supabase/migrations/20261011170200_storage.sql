-- Photo storage.
--   photos  (private): photos/<list id>/<item id>/<file>  - same visibility as the list
--   avatars (public):  avatars/<user id>/<file>           - profile photos, anyone can view

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "view list photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_view_list(((storage.foldername(name))[1])::uuid));
create policy "add list photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_list_member(((storage.foldername(name))[1])::uuid));
create policy "delete list photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_list_member(((storage.foldername(name))[1])::uuid));

create policy "upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
