-- Màn hình nhà tài trợ khi mở app lần đầu trong ngày, luân phiên giữa các nhà tài trợ đang chạy.
-- Nghị định 342/2025/NĐ-CP, Điều 17 (hiệu lực 15/02/2026): quảng cáo ảnh tĩnh phải tắt được ngay,
-- quảng cáo ảnh động hoặc video chờ tắt tối đa 5 giây. App chỉ hiện sau khi đã tải xong (chính sách Google Play).

insert into public.platform_flags values ('sponsor_screen', true, 'Màn hình nhà tài trợ, lần mở app đầu tiên trong ngày')
on conflict (key) do update set note = excluded.note;
insert into public.platform_settings(key, value) values ('sponsor_show_seconds', 6), ('sponsor_animated_wait_seconds', 4)
on conflict (key) do nothing;

create or replace function public.public_flags() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, enabled), '{}') from platform_flags
  where key in ('invite_required','verification_photo','verification_in_person','message_translation','points_redemption','sponsor_screen')
$$;

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  kind text not null default 'static' check (kind in ('static', 'animated')),
  image_vi text not null check (image_vi ~ '^https://'),
  image_en text check (image_en ~ '^https://'),
  link_url text check (link_url ~ '^https://'),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
alter table public.sponsors enable row level security;
create policy sponsors_read on public.sponsors for select to authenticated
  using ((active and starts_on <= current_date and (ends_on is null or ends_on >= current_date)) or is_admin());
grant select on public.sponsors to authenticated;
grant select, insert, update, delete on public.sponsors to service_role;

-- Cấu hình hiện cho app. Ảnh tĩnh luôn có nút tắt ngay; ảnh động chờ tối đa 5 giây.
create or replace function public.sponsor_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('enabled', flag('sponsor_screen'),
    'show_seconds', setting('sponsor_show_seconds'),
    'animated_wait_seconds', least(setting('sponsor_animated_wait_seconds'), 5))
$$;

create or replace function public.set_sponsor_timing(p_show int, p_animated_wait int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_show not between 3 and 10 then raise exception 'show_seconds_range'; end if;
  if p_animated_wait not between 0 and 5 then raise exception 'wait_over_legal_limit'; end if;
  update platform_settings set value = p_show where key = 'sponsor_show_seconds';
  update platform_settings set value = p_animated_wait where key = 'sponsor_animated_wait_seconds';
  perform audit('sponsor.timing', 'platform_settings', 'sponsor', jsonb_build_object('show', p_show, 'animated_wait', p_animated_wait));
end $$;

create or replace function public.save_sponsor(p_id uuid, p_name text, p_kind text, p_image_vi text, p_image_en text,
  p_link text, p_starts date, p_ends date, p_active boolean, p_sort int) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_id is null then
    insert into sponsors(name, kind, image_vi, image_en, link_url, starts_on, ends_on, active, sort)
    values (trim(p_name), p_kind, p_image_vi, nullif(p_image_en, ''), nullif(p_link, ''), coalesce(p_starts, current_date), p_ends, coalesce(p_active, true), coalesce(p_sort, 0))
    returning id into v;
  else
    update sponsors set name = trim(p_name), kind = p_kind, image_vi = p_image_vi, image_en = nullif(p_image_en, ''), link_url = nullif(p_link, ''),
      starts_on = coalesce(p_starts, starts_on), ends_on = p_ends, active = coalesce(p_active, active), sort = coalesce(p_sort, sort)
    where id = p_id returning id into v;
    if v is null then raise exception 'not_found'; end if;
  end if;
  perform audit('sponsor.save', 'sponsors', v::text, jsonb_build_object('name', p_name, 'active', p_active, 'starts', p_starts, 'ends', p_ends));
  return v;
end $$;

revoke all on function public.sponsor_config() from public, anon;
revoke all on function public.set_sponsor_timing(int, int) from public, anon;
revoke all on function public.save_sponsor(uuid, text, text, text, text, text, date, date, boolean, int) from public, anon;
grant execute on function public.sponsor_config(), public.set_sponsor_timing(int, int),
  public.save_sponsor(uuid, text, text, text, text, text, date, date, boolean, int) to authenticated, service_role;
