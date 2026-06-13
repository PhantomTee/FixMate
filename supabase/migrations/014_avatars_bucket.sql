insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_upload"  on storage.objects;
drop policy if exists "avatars_read"    on storage.objects;
drop policy if exists "avatars_update"  on storage.objects;

create policy "avatars_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');
