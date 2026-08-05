-- public: true is intentional (deliberate scope decision, not an oversight): images are
-- practically unguessable via UUID object paths, and a public bucket avoids needing
-- signed-URL machinery for next/image. Writes remain owner-scoped via the RLS policy below.
insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true)
on conflict (id) do nothing;

create policy "owner can manage own artwork images"
on storage.objects for all
using (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text);
