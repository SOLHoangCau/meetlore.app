-- Xác thực tài khoản bằng email. MeetLore không trả phí SMS.
-- Số điện thoại vẫn được khai để phục vụ an toàn nhưng không gửi OTP.
-- Tùy chọn về sau: người dùng tự nhắn tin từ máy của họ, cước do người dùng trả.

insert into public.platform_flags values ('user_paid_sms_verification', false, 'Người dùng tự gửi SMS, nhà mạng tính cước cho người dùng. Không có SMS do app trả');
alter table public.profile_private add column email_confirmed_at timestamptz,
  add column phone_verification_method text check (phone_verification_method in ('user_sent_sms'));

create or replace function public.sync_email_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update profile_private set email_confirmed_at = new.email_confirmed_at where user_id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_email_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_confirmed();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.profile_private(user_id, email_confirmed_at) values (new.id, new.email_confirmed_at);
  insert into public.notification_prefs(user_id) values (new.id);
  return new;
end $$;

create or replace function public.is_verified(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile_private pp join profiles p on p.id = pp.user_id
    where pp.user_id = p_user and pp.email_confirmed_at is not null and pp.adult_confirmed_at is not null
      and pp.identity_verified_at is not null and p.account_status = 'active')
$$;

create or replace function public.guard_verification_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profile_private where user_id = new.user_id and email_confirmed_at is not null) then raise exception 'email_not_confirmed'; end if;
  return new;
end $$;
create trigger verification_needs_email before insert on public.identity_verifications
  for each row execute function public.guard_verification_email();

create table public.phone_sms_challenges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null,
  phone_e164 text not null,
  expires_at timestamptz not null
);
alter table public.phone_sms_challenges enable row level security;

create or replace function public.start_user_paid_sms(p_phone text) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
begin
  if not coalesce((select enabled from platform_flags where key='user_paid_sms_verification'),false) then raise exception 'feature_disabled'; end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
  insert into phone_sms_challenges values (auth.uid(), v_code, p_phone, now()+interval '15 minutes')
    on conflict (user_id) do update set code=v_code, phone_e164=p_phone, expires_at=now()+interval '15 minutes';
  return v_code;
end $$;

-- Webhook nhận SMS đến gọi bằng service role, đối chiếu số gửi và mã.
create or replace function public.confirm_user_sms(p_from text, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  delete from phone_sms_challenges where phone_e164=p_from and code=upper(trim(p_code)) and expires_at>now() returning user_id into v;
  if v is null then return false; end if;
  update profile_private set phone_verified_at=now(), phone_verification_method='user_sent_sms' where user_id=v;
  return true;
end $$;

revoke all on function public.sync_email_confirmed() from public, anon, authenticated;
revoke all on function public.guard_verification_email() from public, anon, authenticated;
revoke all on function public.start_user_paid_sms(text) from public, anon; grant execute on function public.start_user_paid_sms(text) to authenticated, service_role;
revoke all on function public.confirm_user_sms(text,text) from public, anon, authenticated; grant execute on function public.confirm_user_sms(text,text) to service_role;
