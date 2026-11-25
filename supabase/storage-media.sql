-- Ảnh công khai: chân dung, biểu tượng "Nhân vật hôm nay" (figures/<id>.webp) và ảnh nhà tài trợ (sponsors/...). Không bao giờ chứa ảnh giấy tờ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('media','media',true,1048576,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy media_admin_write on storage.objects for insert to authenticated with check (bucket_id='media' and public.has_role('admin'));
create policy media_admin_update on storage.objects for update to authenticated using (bucket_id='media' and public.has_role('admin'));
create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id='media' and public.has_role('admin'));
