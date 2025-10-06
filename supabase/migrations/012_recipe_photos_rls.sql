-- Enable RLS on storage.objects table (should already be enabled)
alter table storage.objects enable row level security;

-- Allow authenticated users to upload their own recipe photos
create policy "Users can upload their own recipe photos"
on storage.objects for insert
with check (
  bucket_id = 'recipe-photos'
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to view recipe photos
create policy "Users can view recipe photos"
on storage.objects for select
using (
  bucket_id = 'recipe-photos'
  and auth.role() = 'authenticated'
);

-- Allow users to update their own recipe photos
create policy "Users can update their own recipe photos"
on storage.objects for update
using (
  bucket_id = 'recipe-photos'
  and auth.role() = 'authenticated'
);

-- Allow users to delete their own recipe photos
create policy "Users can delete their own recipe photos"
on storage.objects for delete
using (
  bucket_id = 'recipe-photos'
  and auth.role() = 'authenticated'
);