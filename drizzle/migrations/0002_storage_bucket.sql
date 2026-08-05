insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true)
on conflict (id) do nothing;

create policy "owner can manage own artwork images"
on storage.objects for all
using (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text);
