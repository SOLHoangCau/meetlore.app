-- Lưu hồ sơ trong một lần gọi, chạy trọn hoặc không chạy gì (sửa lỗi mất dữ liệu khi sửa hồ sơ từng bước).
-- Trước đây app ghi từng bảng riêng: một bảng lỗi là các bảng sau không được ghi, và Hub "Tôi là người bản địa tại"
-- bị chặn bởi quy tắc chỉ cho tự đăng ký Hub mở. Hàm này ghi tất cả, Hub bản địa ở trạng thái chờ duyệt.
create or replace function public.save_profile(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a jsonb := coalesce(p->'answers', '[4,4,3,3,4]'::jsonb); d text := coalesce(p->>'depth', 'medium');
begin
  if me is null then raise exception 'not_authenticated'; end if;
  update profiles set display_name = coalesce(nullif(trim(p->>'display_name'), ''), display_name),
    headline = nullif(trim(coalesce(p->>'headline', '')), '') where id = me;
  perform save_orientation((a->>0)::smallint, (a->>1)::smallint, (a->>2)::smallint, (a->>3)::smallint, (a->>4)::smallint, d);

  delete from profile_languages where user_id = me;
  insert into profile_languages(user_id, language_code, level, can_help_practice, wants_practice)
  select me, x->>'code', x->>'level', coalesce((x->>'can_help')::boolean, false),
         coalesce(p->'want_languages', '[]'::jsonb) ? (x->>'code')
  from jsonb_array_elements(coalesce(p->'languages', '[]'::jsonb)) x
  where exists (select 1 from languages l where l.code = x->>'code')
  on conflict (user_id, language_code) do nothing;

  delete from capabilities where user_id = me;
  insert into capabilities(user_id, kind, title, years_experience, credential)
  select me, x->>'kind', trim(x->>'title'), nullif(x->>'years', '')::smallint, nullif(x->>'credential', '')
  from jsonb_array_elements(coalesce(p->'capabilities', '[]'::jsonb)) x
  where char_length(trim(coalesce(x->>'title', ''))) >= 2;

  delete from offers where user_id = me;
  insert into offers(user_id, topic_id, depth)
  select me, t, d from jsonb_array_elements_text(coalesce(p->'gives', '[]'::jsonb)) t
  where exists (select 1 from topics x where x.id = t) on conflict do nothing;

  delete from seeks where user_id = me;
  insert into seeks(user_id, topic_id, depth, importance)
  select me, k, d, least(3, greatest(1, v::text::int)) from jsonb_each(coalesce(p->'wants', '{}'::jsonb)) as w(k, v)
  where exists (select 1 from topics x where x.id = k) on conflict do nothing;
  insert into seeks(user_id, language_code, depth, importance)
  select me, l, 'short', 2 from jsonb_array_elements_text(coalesce(p->'want_languages', '[]'::jsonb)) l
  where exists (select 1 from languages x where x.code = l) on conflict do nothing;

  -- Hub bản địa: thêm mới ở trạng thái chờ; bỏ chọn thì xóa nếu đang chờ, chuyển "removed" nếu đã duyệt; chọn lại thì mở lại.
  if p ? 'local_hubs' then
    delete from hub_members where user_id = me and status = 'pending'
      and not (hub_id::text in (select jsonb_array_elements_text(p->'local_hubs')));
    update hub_members set status = 'removed' where user_id = me and status = 'ready'
      and not (hub_id::text in (select jsonb_array_elements_text(p->'local_hubs')));
    insert into hub_members(hub_id, user_id, status)
    select h.id, me, 'pending' from hubs h
    where h.id::text in (select jsonb_array_elements_text(p->'local_hubs')) and h.status in ('preparing', 'active')
    on conflict (hub_id, user_id) do update set status = case when hub_members.status = 'removed' then 'pending' else hub_members.status end;
  end if;
end $$;
revoke execute on function public.save_profile(jsonb) from public, anon;
grant execute on function public.save_profile(jsonb) to authenticated;

-- Người dùng tải ảnh giấy tờ đã che lên app. Đối chiếu tại Hub không còn là lựa chọn của người dùng;
-- Admin vẫn có thể bật lại cờ này khi cần kiểm tra trực tiếp một trường hợp.
update public.platform_flags set enabled = false, note = 'Đối chiếu tại Hub: tắt; chỉ dùng khi Admin cần kiểm tra lại'
where key = 'verification_in_person';

-- Ảnh đại diện (không bắt buộc). Thư mục riêng tư: chỉ người đã đăng nhập xem được qua liên kết có hạn;
-- mỗi người chỉ ghi vào thư mục mang id của mình. profiles.avatar_url giữ đường dẫn trong bucket.
-- Bucket và quyền lưu ảnh nằm ở supabase/storage-avatars.sql (chạy sau migration).

-- Đặt hoặc gỡ ảnh của chính mình; đường dẫn phải nằm trong thư mục của mình.
create or replace function public.set_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_path is not null and split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'forbidden'; end if;
  update profiles set avatar_url = p_path where id = auth.uid();
end $$;
-- Admin gỡ ảnh vi phạm, có ghi nhật ký và báo cho người dùng.
create or replace function public.admin_clear_avatar(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'reason_required'; end if;
  update profiles set avatar_url = null where id = p_user;
  insert into admin_audit_log(actor_id, action, entity, entity_id, detail) values (auth.uid(), 'avatar.cleared', 'profiles', p_user::text, jsonb_build_object('reason', p_reason));
  insert into user_notices(user_id, kind, body) values (p_user, 'content_removed', p_reason);
end $$;
revoke execute on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;
revoke execute on function public.admin_clear_avatar(uuid, text) from public, anon;
grant execute on function public.admin_clear_avatar(uuid, text) to authenticated;

-- Tài khoản cho người duyệt của Apple và Google: không thể nhận mã email khi đăng nhập trên máy mới,
-- nên được bỏ qua bước mã thiết bị. Chỉ bật bằng SQL (người dùng không tự sửa được bảng này).
alter table public.profile_private add column if not exists review_account boolean not null default false;
create or replace function public.skip_device_code() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select review_account from profile_private where user_id = auth.uid()), false)
$$;
revoke execute on function public.skip_device_code() from public, anon;
grant execute on function public.skip_device_code() to authenticated;
