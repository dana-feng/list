-- Profile photo uploads were refused: Storage reads the new file back after inserting it,
-- so the uploader also needs read access. Avatars are public anyway (anyone can open them
-- by link), so signed-in people may read them.
create policy "view avatars" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
