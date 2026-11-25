-- Bản thử nghiệm công khai: mã mời, trần 500 người, hai cách xác minh, xóa tài khoản,
-- xử lý báo cáo, thông báo đẩy, giới hạn gửi, mã điểm danh thay đổi theo thời gian.

-- ===== Cờ và thông số =====
insert into public.platform_flags values
  ('invite_required', true, 'Đợt thử nghiệm: cần mã mời'),
  ('verification_photo', true, 'Xác minh bằng ảnh giấy tờ đã che trên máy'),
  ('verification_in_person', true, 'Xác minh bằng đối chiếu trực tiếp tại Hub'),
  ('message_translation', false, 'Dịch tin nhắn: tắt trong đợt thử nghiệm'),
  ('ai_prescreen', false, 'AI sơ duyệt hồ sơ: tắt trong đợt thử nghiệm')
on conflict (key) do update set note = excluded.note;
update public.platform_flags set enabled = true where key = 'points_redemption';
insert into public.platform_settings(key, value) values
  ('max_users', 500), ('deletion_grace_days', 7), ('verification_file_days', 30),
  ('messages_per_minute', 20), ('messages_per_day', 300), ('intents_per_day', 20), ('checkin_window_seconds', 300)
on conflict (key) do nothing;

create or replace function public.flag(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from platform_flags where key = p_key), false)
$$;
create or replace function public.public_flags() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, enabled), '{}') from platform_flags
  where key in ('invite_required','verification_photo','verification_in_person','message_translation','points_redemption')
$$;
create or replace function public.set_flag(p_key text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update platform_flags set enabled = p_on where key = p_key;
  if not found then raise exception 'unknown_flag'; end if;
  perform audit('settings.flag', 'platform_flags', p_key, jsonb_build_object('enabled', p_on));
end $$;

-- ===== Mã mời và trần người dùng =====
create table public.access_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,16}$'),
  max_uses int not null default 1 check (max_uses between 1 and 500),
  used_count int not null default 0,
  note text check (char_length(note) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;
create policy ac_admin on public.access_codes for select to authenticated using (is_admin());
alter table public.profile_private add column access_code text, add column access_granted_at timestamptz;

create or replace function public.beta_capacity() returns table(used int, max_users int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from profile_private pp join profiles p on p.id = pp.user_id
          where pp.access_granted_at is not null and p.account_status <> 'deleting'
            and not exists (select 1 from user_roles r where r.user_id = pp.user_id)),
         setting('max_users')::int
$$;
create or replace function public.has_access(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select not flag('invite_required')
      or exists (select 1 from profile_private where user_id = p_user and access_granted_at is not null)
      or exists (select 1 from user_roles where user_id = p_user)
$$;
create or replace function public.redeem_access_code(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v access_codes; c record;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profile_private where user_id = auth.uid() and access_granted_at is not null) then return true; end if;
  select * into c from beta_capacity();
  if c.used >= c.max_users then raise exception 'beta_full'; end if;
  select * into v from access_codes where code = upper(trim(p_code)) for update;
  if not found or (v.expires_at is not null and v.expires_at < now()) or v.used_count >= v.max_uses then raise exception 'invalid_code'; end if;
  update access_codes set used_count = used_count + 1 where code = v.code;
  update profile_private set access_code = v.code, access_granted_at = now() where user_id = auth.uid();
  return true;
end $$;
create or replace function public.create_access_codes(p_count int, p_uses int default 1, p_note text default null) returns setof text
language plpgsql security definer set search_path = public as $$
declare i int; v text;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_count not between 1 and 200 then raise exception 'bad_count'; end if;
  for i in 1..p_count loop
    v := upper(translate(substr(md5(gen_random_uuid()::text), 1, 8), '01', '23'));
    insert into access_codes(code, max_uses, note, created_by) values (v, p_uses, p_note, auth.uid()) on conflict do nothing;
    return next v;
  end loop;
  perform audit('access_codes.created', 'access_codes', p_count::text, jsonb_build_object('uses', p_uses, 'note', p_note));
end $$;

-- ===== Xác minh: ảnh đã che hoặc đối chiếu tại Hub =====
alter table public.identity_verifications
  add column method text not null default 'photo' check (method in ('photo','in_person')),
  add column in_person_code text unique,
  add column in_person_by uuid references public.profiles(id) on delete set null,
  add column in_person_hub uuid references public.hubs(id) on delete set null,
  add column in_person_at timestamptz,
  add column risk_set_by uuid references public.profiles(id) on delete set null;
alter table public.identity_verifications drop constraint identity_verifications_status_check;
alter table public.identity_verifications add constraint identity_verifications_status_check
  check (status in ('ai_review','awaiting_in_person','awaiting_admin','needs_info','approved','rejected'));
drop index if exists public.one_open_verification;
create unique index one_open_verification on public.identity_verifications(user_id) where status in ('ai_review','awaiting_in_person','awaiting_admin');

create table public.verification_views (
  id bigint generated always as identity primary key,
  verification_id uuid not null references public.identity_verifications(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);
alter table public.verification_views enable row level security;
create policy vv_admin on public.verification_views for select to authenticated using (is_admin());

create or replace function public.submit_verification2(p_method text, p_name text, p_nationality text, p_phone text, p_city text,
  p_doc_type text, p_doc_country text, p_doc_last4 text, p_doc_path text, p_selfie_path text, p_helpers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; h jsonb; v_now timestamptz := now(); v_wait int := setting('verification_min_hours_elevated');
  v_sla int := setting('verification_review_sla_hours'); v_code text; v_status text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not has_access() then raise exception 'access_code_required'; end if;
  if not exists (select 1 from profile_private where user_id = auth.uid() and adult_confirmed_at is not null) then raise exception 'adult_required'; end if;
  if p_method = 'photo' then
    if not flag('verification_photo') then raise exception 'method_disabled'; end if;
    if coalesce(p_doc_path,'') not like auth.uid()::text || '/%' or coalesce(p_selfie_path,'') not like auth.uid()::text || '/%' then raise exception 'files_required'; end if;
  elsif p_method = 'in_person' then
    if not flag('verification_in_person') then raise exception 'method_disabled'; end if;
    p_doc_path := null; p_selfie_path := null;
  else raise exception 'bad_method'; end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
  if jsonb_typeof(p_helpers) <> 'array' or jsonb_array_length(p_helpers) < 1 then raise exception 'helper_required'; end if;
  if jsonb_array_length(p_helpers) > 3 then raise exception 'too_many_helpers'; end if;
  for h in select * from jsonb_array_elements(p_helpers) loop
    if h->>'phone' = p_phone then raise exception 'helper_phone_same'; end if;
    if coalesce((h->>'informed')::boolean, false) is not true then raise exception 'helper_not_informed'; end if;
  end loop;
  if exists (select 1 from identity_verifications where user_id = auth.uid() and status = 'approved') then raise exception 'already_verified'; end if;
  update identity_verifications set status = 'rejected', admin_note = 'replaced_by_new_submission'
    where user_id = auth.uid() and status in ('needs_info');
  delete from emergency_contacts where user_id = auth.uid();
  insert into emergency_contacts(user_id, full_name, relation, phone_e164, email, language_code, informed_confirmed_at)
    select auth.uid(), x->>'name', x->>'relation', x->>'phone', x->>'email', x->>'language', v_now from jsonb_array_elements(p_helpers) x;
  v_status := case when p_method = 'in_person' then 'awaiting_in_person' when flag('ai_prescreen') then 'ai_review' else 'awaiting_admin' end;
  if p_method = 'in_person' then v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6)); end if;
  insert into identity_verifications(user_id, method, status, legal_full_name, nationality, phone_e164, current_city, doc_type, doc_country, doc_last4,
      doc_image_path, selfie_path, submitted_at, review_opens_at, review_due_at, ai_risk, in_person_code)
    values (auth.uid(), p_method, v_status, trim(p_name), upper(p_nationality), p_phone, p_city, p_doc_type, upper(p_doc_country), p_doc_last4,
      p_doc_path, p_selfie_path, v_now, v_now + make_interval(hours => v_wait), v_now + make_interval(hours => v_wait + v_sla), 'medium', v_code)
    returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', v_status, 'code', v_code);
end $$;

-- Người phụ trách Hub, người duyệt hồ sơ hoặc Admin đối chiếu giấy tờ trực tiếp. Không lưu ảnh.
create or replace function public.verify_in_person(p_code text, p_hub uuid, p_doc_type text, p_last4 text, p_name_matches boolean, p_face_matches boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v identity_verifications;
begin
  if not (is_admin() or has_role('verifier') or is_hub_operator(p_hub)) then raise exception 'forbidden'; end if;
  select * into v from identity_verifications where in_person_code = upper(trim(p_code)) and status = 'awaiting_in_person' for update;
  if not found then raise exception 'code_not_found'; end if;
  if v.user_id = auth.uid() then raise exception 'cannot_review_own'; end if;
  if not (p_name_matches and p_face_matches) or v.doc_type <> p_doc_type or upper(v.doc_last4) <> upper(trim(p_last4)) then
    update identity_verifications set status = 'needs_info', admin_note = 'in_person_mismatch', in_person_by = auth.uid(), in_person_hub = p_hub, in_person_at = now() where id = v.id;
    perform audit('verification.in_person_mismatch', 'identity_verifications', v.id::text, '{}');
    return 'mismatch';
  end if;
  update identity_verifications set status = 'awaiting_admin', in_person_by = auth.uid(), in_person_hub = p_hub, in_person_at = now(), in_person_code = null where id = v.id;
  perform audit('verification.in_person_checked', 'identity_verifications', v.id::text, jsonb_build_object('hub', p_hub));
  return 'checked';
end $$;

-- Không có AI sơ duyệt: mặc định chờ 48 giờ; người duyệt có thể hạ xuống rủi ro thấp (24 giờ) và việc này được ghi lại.
create or replace function public.set_verification_risk(p_id uuid, p_risk text) returns void
language plpgsql security definer set search_path = public as $$
declare v_wait int := case when p_risk = 'low' then setting('verification_min_hours_low') else setting('verification_min_hours_elevated') end;
begin
  if not (is_admin() or has_role('verifier')) then raise exception 'forbidden'; end if;
  if p_risk not in ('low','medium','high') then raise exception 'bad_risk'; end if;
  update identity_verifications set ai_risk = p_risk, risk_set_by = auth.uid(),
    review_opens_at = submitted_at + make_interval(hours => v_wait),
    review_due_at = submitted_at + make_interval(hours => v_wait + setting('verification_review_sla_hours'))
  where id = p_id and status = 'awaiting_admin' and user_id <> auth.uid();
  if not found then raise exception 'not_awaiting_admin'; end if;
  perform audit('verification.risk', 'identity_verifications', p_id::text, jsonb_build_object('risk', p_risk));
end $$;

create or replace function public.log_verification_view(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_role('verifier')) then raise exception 'forbidden'; end if;
  insert into verification_views(verification_id, viewer_id) values (p_id, auth.uid());
end $$;

create or replace function public.verification_queue2()
returns table(id uuid, user_id uuid, method text, legal_full_name text, nationality text, doc_type text, doc_last4 text, current_city text,
  risk text, doc_image_path text, selfie_path text, in_person_at timestamptz, submitted_at timestamptz, review_opens_at timestamptz,
  review_due_at timestamptz, can_approve boolean, overdue boolean)
language sql stable security definer set search_path = public as $$
  select v.id, v.user_id, v.method, v.legal_full_name, v.nationality::text, v.doc_type, v.doc_last4, v.current_city, v.ai_risk,
    case when v.files_deleted_at is null then v.doc_image_path end, case when v.files_deleted_at is null then v.selfie_path end,
    v.in_person_at, v.submitted_at, v.review_opens_at, v.review_due_at, now() >= v.review_opens_at, now() > v.review_due_at
  from identity_verifications v
  where v.status = 'awaiting_admin' and v.user_id <> auth.uid() and (is_admin() or has_role('verifier'))
  order by case v.ai_risk when 'high' then 0 when 'medium' then 1 else 2 end, v.review_due_at
$$;
-- Hồ sơ đã có quyết định quá thời hạn: trả về đường dẫn ảnh để dịch vụ máy chủ xóa.
create or replace function public.verification_files_due() returns table(id uuid, doc_image_path text, selfie_path text)
language sql stable security definer set search_path = public as $$
  select id, doc_image_path, selfie_path from identity_verifications
  where files_deleted_at is null and (doc_image_path is not null or selfie_path is not null)
    and status in ('approved','rejected') and admin_reviewed_at < now() - make_interval(days => setting('verification_file_days')::int)
$$;
create or replace function public.mark_verification_files_deleted(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update identity_verifications set files_deleted_at = now(), doc_image_path = null, selfie_path = null where id = p_id
$$;

-- ===== Xóa tài khoản =====
alter table public.profiles add column deletion_requested_at timestamptz, add column suspended_until timestamptz;
drop function if exists public.request_account_deletion();
create or replace function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update profiles set account_status = 'deleting', discoverable = false, deletion_requested_at = v_at where id = auth.uid();
  update match_intents set status = 'withdrawn' where sender_id = auth.uid() and status = 'pending';
  update match_intents set status = 'declined' where receiver_id = auth.uid() and status = 'pending';
  update meetups set status = 'cancelled' where status in ('proposed','agreed') and starts_at > now()
    and conversation_id in (select conversation_id from conversation_members where user_id = auth.uid());
  update reward_redemptions set status = 'cancelled' where user_id = auth.uid() and status = 'issued';
  update sharing_sessions set status = 'cancelled' where host_id = auth.uid() and status = 'scheduled';
  delete from hub_presence where user_id = auth.uid();
  delete from push_tokens where user_id = auth.uid();
  return v_at + make_interval(days => setting('deletion_grace_days')::int);
end $$;
create or replace function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set account_status = 'active', deletion_requested_at = null
    where id = auth.uid() and account_status = 'deleting'
      and deletion_requested_at > now() - make_interval(days => setting('deletion_grace_days')::int);
  if not found then raise exception 'cannot_cancel'; end if;
  update profiles set discoverable = is_verified(auth.uid()) where id = auth.uid();
end $$;
-- Gọi từ dịch vụ máy chủ ngay trước khi xóa người dùng khỏi hệ thống đăng nhập.
create or replace function public.prepare_account_purge(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_user and account_status = 'deleting'
                 and deletion_requested_at <= now() - make_interval(days => setting('deletion_grace_days')::int)) then
    raise exception 'not_due';
  end if;
  update knowledge_items k set status = 'hidden' where k.created_by = p_user
    and not exists (select 1 from knowledge_contributors c where c.item_id = k.id and c.user_id <> p_user);
  delete from knowledge_items where created_by = p_user and status in ('draft','awaiting_coauthors','submitted','changes_requested');
  update knowledge_contributors set credit_name = 'Người đóng góp đã rời đi', anonymous = true where user_id = p_user;
  delete from emergency_contacts where user_id = p_user;
  perform audit('account.purged', 'profiles', p_user::text, '{}');
end $$;
create or replace function public.accounts_due_for_purge() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where account_status = 'deleting'
    and deletion_requested_at <= now() - make_interval(days => setting('deletion_grace_days')::int)
$$;

-- ===== Báo cáo và xử lý vi phạm =====
create table public.user_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('warning','suspension','restored','content_removed')),
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.user_notices enable row level security;
create policy un_self on public.user_notices for select to authenticated using (user_id = auth.uid());
create policy un_read on public.user_notices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.report_queue()
returns table(id uuid, category text, body text, urgent boolean, status text, created_at timestamptz, reporter_id uuid,
  target_user_id uuid, target_name text, target_message_id uuid, message_body text, target_knowledge_id uuid, hub_id uuid, prior_reports int)
language sql stable security definer set search_path = public as $$
  select r.id, r.category, r.body, r.urgent, r.status, r.created_at, r.reporter_id, r.target_user_id, p.display_name, r.target_message_id,
    m.body, r.target_knowledge_id, r.hub_id,
    (select count(*)::int from reports o where o.target_user_id = r.target_user_id and o.id <> r.id)
  from reports r left join profiles p on p.id = r.target_user_id left join messages m on m.id = r.target_message_id
  where (is_admin() or has_role('moderator')) and r.status in ('open','reviewing')
  order by r.urgent desc, r.created_at
$$;
create or replace function public.resolve_report(p_id uuid, p_action text, p_note text, p_days int default null) returns void
language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  if not (is_admin() or has_role('moderator')) then raise exception 'forbidden'; end if;
  if char_length(coalesce(trim(p_note), '')) < 5 then raise exception 'reason_required'; end if;
  select * into r from reports where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if r.target_user_id = auth.uid() then raise exception 'cannot_review_own'; end if;
  if p_action = 'warn' then
    if r.target_user_id is null then raise exception 'no_target'; end if;
    insert into user_notices(user_id, kind, body) values (r.target_user_id, 'warning', p_note);
  elsif p_action = 'suspend' then
    if r.target_user_id is null then raise exception 'no_target'; end if;
    update profiles set account_status = 'suspended', discoverable = false,
      suspended_until = case when p_days is null then null else now() + make_interval(days => p_days) end
      where id = r.target_user_id and account_status <> 'deleting';
    update match_intents set status = 'withdrawn' where sender_id = r.target_user_id and status = 'pending';
    delete from hub_presence where user_id = r.target_user_id;
    insert into user_notices(user_id, kind, body) values (r.target_user_id, 'suspension', p_note);
  elsif p_action = 'hide_message' then
    update messages set hidden_at = now() where id = r.target_message_id;
  elsif p_action = 'hide_knowledge' then
    update knowledge_items set status = 'hidden' where id = r.target_knowledge_id;
  elsif p_action <> 'dismiss' then raise exception 'bad_action'; end if;
  update reports set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
    resolution = p_action || ': ' || p_note where id = p_id;
  perform audit('report.' || p_action, 'reports', p_id::text, jsonb_build_object('target', r.target_user_id, 'days', p_days));
end $$;
create or replace function public.restore_user(p_user uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set account_status = 'active', suspended_until = null where id = p_user and account_status = 'suspended';
  if not found then raise exception 'not_suspended'; end if;
  update profiles set discoverable = is_verified(p_user) where id = p_user;
  insert into user_notices(user_id, kind, body) values (p_user, 'restored', p_note);
  perform audit('account.restored', 'profiles', p_user::text, jsonb_build_object('note', p_note));
end $$;
-- Hết hạn khóa tạm: dịch vụ máy chủ gọi định kỳ.
create or replace function public.lift_expired_suspensions() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update profiles set account_status = 'active', suspended_until = null
    where account_status = 'suspended' and suspended_until is not null and suspended_until < now();
  get diagnostics n = row_count;
  update profiles set discoverable = is_verified(id) where account_status = 'active' and not discoverable
    and id in (select user_id from identity_verifications where status = 'approved');
  return n;
end $$;

-- ===== Giới hạn gửi để chống spam =====
create or replace function public.rate_limit_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= setting('messages_per_minute')
     or (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 day') >= setting('messages_per_day') then
    raise exception 'rate_limited';
  end if;
  return new;
end $$;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.rate_limit_messages();
create or replace function public.rate_limit_intents() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from match_intents where sender_id = new.sender_id and created_at > now() - interval '1 day') >= setting('intents_per_day') then
    raise exception 'rate_limited';
  end if;
  return new;
end $$;
create trigger intents_rate_limit before insert on public.match_intents for each row execute function public.rate_limit_intents();

-- ===== Thông báo đẩy: hàng chờ, nội dung chung, không chứa tin nhắn =====
create table public.notification_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message','intent','verification','urgent_report','notice','session')),
  ref text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0
);
create index outbox_unsent_idx on public.notification_outbox(created_at) where sent_at is null;
alter table public.notification_outbox enable row level security;

create or replace function public.enqueue_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'messages' then
    insert into notification_outbox(user_id, kind, ref)
      select m.user_id, 'message', new.conversation_id::text from conversation_members m
      join notification_prefs n on n.user_id = m.user_id and n.messages_enabled
      where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id
        and not exists (select 1 from notification_outbox o where o.user_id = m.user_id and o.kind = 'message'
                        and o.ref = new.conversation_id::text and o.created_at > now() - interval '5 minutes');
  elsif tg_table_name = 'match_intents' then
    insert into notification_outbox(user_id, kind, ref) values (new.receiver_id, 'intent', new.id::text);
  elsif tg_table_name = 'identity_verifications' then
    if new.status is distinct from old.status and new.status in ('approved','rejected','needs_info') then
      insert into notification_outbox(user_id, kind, ref) values (new.user_id, 'verification', new.status);
    end if;
  elsif tg_table_name = 'reports' then
    if new.urgent then
      insert into notification_outbox(user_id, kind, ref)
        select distinct user_id, 'urgent_report', new.id::text from user_roles where role in ('admin','moderator');
    end if;
  elsif tg_table_name = 'user_notices' then
    insert into notification_outbox(user_id, kind, ref) values (new.user_id, 'notice', new.kind);
  end if;
  return new;
end $$;
create trigger notify_message after insert on public.messages for each row execute function public.enqueue_notifications();
create trigger notify_intent after insert on public.match_intents for each row execute function public.enqueue_notifications();
create trigger notify_verification after update on public.identity_verifications for each row execute function public.enqueue_notifications();
create trigger notify_report after insert on public.reports for each row execute function public.enqueue_notifications();
create trigger notify_notice after insert on public.user_notices for each row execute function public.enqueue_notifications();

create or replace function public.save_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'bad_token'; end if;
  insert into push_tokens(token, user_id, platform) values (p_token, auth.uid(), p_platform)
    on conflict (token) do update set user_id = auth.uid(), platform = p_platform, updated_at = now();
end $$;
create or replace function public.pending_push(p_limit int default 200)
returns table(id bigint, kind text, ref text, locale text, attempts int, tokens text[])
language sql stable security definer set search_path = public as $$
  select o.id, o.kind, o.ref, p.ui_locale, o.attempts, array_agg(t.token)
  from notification_outbox o join profiles p on p.id = o.user_id join push_tokens t on t.user_id = o.user_id
  where o.sent_at is null and o.attempts < 3 and p.account_status in ('active','suspended')
  group by o.id, o.kind, o.ref, p.ui_locale, o.attempts order by o.id limit p_limit
$$;

-- ===== Mã điểm danh đổi 5 phút một lần =====
create or replace function public.rotating_code(p_secret text, p_slot bigint) returns text
language sql immutable as $$ select upper(substr(md5(p_secret || ':' || p_slot::text), 1, 6)) $$;
create or replace function public.session_code(p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare v sharing_sessions;
begin
  select * into v from sharing_sessions where id = p_id;
  if v.id is null then raise exception 'not_found'; end if;
  if not (v.host_id = auth.uid() or is_hub_operator(v.hub_id) or is_admin()) then raise exception 'forbidden'; end if;
  return rotating_code(v.checkin_code, floor(extract(epoch from now()) / setting('checkin_window_seconds'))::bigint);
end $$;
create or replace function public.session_check_in(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions; v_slot bigint := floor(extract(epoch from now()) / setting('checkin_window_seconds'))::bigint; c text := upper(trim(p_code));
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  select * into s from sharing_sessions x where x.status = 'scheduled'
    and x.starts_at between now() - interval '6 hours' and now() + interval '2 hours'
    and c in (rotating_code(x.checkin_code, v_slot), rotating_code(x.checkin_code, v_slot - 1))
  limit 1;
  if not found then raise exception 'session_not_open'; end if;
  if s.host_id = auth.uid() then raise exception 'host_cannot_attend'; end if;
  if are_blocked(auth.uid(), s.host_id) then raise exception 'blocked'; end if;
  insert into session_attendees(session_id, user_id) values (s.id, auth.uid()) on conflict do nothing;
  return s.id;
end $$;

-- ===== Hub: giờ mở, địa điểm, văn bản đồng ý =====
alter table public.hubs add column venue_name text, add column address text, add column agreement_signed_at timestamptz,
  add column ticket_required boolean not null default false;
alter table public.hub_translations add column open_hours text, add column entry_note text;
create or replace function public.update_hub_info(p_hub uuid, p_lat double precision, p_lng double precision, p_radius int,
  p_venue text, p_address text, p_hours_vi text, p_hours_en text, p_agreement boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update hubs set lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng), radius_m = coalesce(p_radius, radius_m),
    venue_name = coalesce(p_venue, venue_name), address = coalesce(p_address, address),
    agreement_signed_at = case when p_agreement is null then agreement_signed_at when p_agreement then coalesce(agreement_signed_at, now()) else null end
    where id = p_hub;
  if not found then raise exception 'not_found'; end if;
  if p_hours_vi is not null then update hub_translations set open_hours = p_hours_vi where hub_id = p_hub and locale = 'vi'; end if;
  if p_hours_en is not null then update hub_translations set open_hours = p_hours_en where hub_id = p_hub and locale = 'en'; end if;
  perform audit('hub.updated', 'hubs', p_hub::text, jsonb_build_object('lat', p_lat, 'lng', p_lng, 'agreement', p_agreement));
end $$;

-- ===== Tài khoản quản trị: chỉ chạy bằng quyền máy chủ (SQL Editor) =====
create or replace function public.bootstrap_admin(p_email text, p_roles text[], p_name text) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare v uuid; r text;
begin
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if v is null then raise exception 'user_not_found: đăng ký tài khoản bằng email này trước'; end if;
  update profiles set display_name = p_name, discoverable = false where id = v;
  update profile_private set access_granted_at = coalesce(access_granted_at, now()) where user_id = v;
  delete from user_roles where user_id = v;
  foreach r in array p_roles loop insert into user_roles(user_id, role) values (v, r); end loop;
  insert into admin_audit_log(actor_id, action, entity, entity_id, detail) values (null, 'admin.bootstrap', 'profiles', v::text, jsonb_build_object('roles', p_roles));
  return v;
end $$;
create or replace function public.my_roles() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(role order by role), '{}') from user_roles where user_id = auth.uid()
$$;

-- ===== Quyền gọi hàm =====
do $$ declare f text; begin
  foreach f in array array[
    'flag(text)', 'public_flags()', 'set_flag(text,boolean)', 'beta_capacity()', 'has_access(uuid)', 'redeem_access_code(text)',
    'create_access_codes(int,int,text)', 'submit_verification2(text,text,text,text,text,text,text,text,text,text,jsonb)',
    'verify_in_person(text,uuid,text,text,boolean,boolean)', 'set_verification_risk(uuid,text)', 'log_verification_view(uuid)',
    'verification_queue2()', 'request_account_deletion()', 'cancel_account_deletion()', 'report_queue()', 'resolve_report(uuid,text,text,int)',
    'restore_user(uuid,text)', 'save_push_token(text,text)', 'session_code(uuid)', 'session_check_in(text)', 'update_hub_info(uuid,double precision,double precision,int,text,text,text,text,boolean)',
    'my_roles()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  foreach f in array array['verification_files_due()', 'mark_verification_files_deleted(uuid)', 'prepare_account_purge(uuid)', 'accounts_due_for_purge()',
    'lift_expired_suspensions()', 'pending_push(int)', 'bootstrap_admin(text,text[],text)', 'rate_limit_messages()', 'rate_limit_intents()', 'enqueue_notifications()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant execute on function public.rotating_code(text, bigint) to authenticated, service_role;
grant select, insert, update, delete on public.access_codes, public.verification_views, public.user_notices, public.notification_outbox to service_role;
grant select on public.access_codes, public.verification_views to authenticated;
grant select, update on public.user_notices to authenticated;

-- ===== Hub đang chuẩn bị vẫn hiện để người dùng chọn và đăng ký làm người bản địa =====
-- Thông báo gần Hub chỉ dành cho Hub đang hoạt động (app tự lọc theo status).
drop policy if exists hubs_public on public.hubs;
create policy hubs_public on public.hubs for select using (status in ('preparing','active'));
drop policy if exists hubtr_public on public.hub_translations;
create policy hubtr_public on public.hub_translations for select using (exists(select 1 from hubs h where h.id = hub_id and h.status in ('preparing','active')));
drop policy if exists hubtopic_public on public.hub_topics;
create policy hubtopic_public on public.hub_topics for select using (exists(select 1 from hubs h where h.id = hub_id and h.status in ('preparing','active')));
