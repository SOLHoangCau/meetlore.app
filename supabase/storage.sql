-- Chạy trên dự án Supabase thật. Ảnh xác minh nằm trong bucket riêng tư, thư mục đầu là id người dùng.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('verification','verification',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy verification_upload on storage.objects for insert to authenticated with check (bucket_id='verification' and (storage.foldername(name))[1]=auth.uid()::text);
create policy verification_staff_read on storage.objects for select to authenticated using (bucket_id='verification' and (public.has_role('admin') or public.has_role('verifier')));
