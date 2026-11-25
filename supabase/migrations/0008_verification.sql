-- Xác minh người dùng hai bước: AI đọc trước, Admin quyết định trong khung 24-48 giờ sau đăng ký.
-- AI chỉ gắn mức rủi ro và lý do. AI không bao giờ tự duyệt hay tự từ chối.

create table public.platform_settings (key text primary key, value int not null);
insert into public.platform_settings values ('verification_min_hours',24),('verification_max_hours',48);
alter table public.platform_settings enable row level security;
create policy ps_read on platform_settings for select to authenticated using (true);
create policy ps_admin on platform_settings for update to authenticated using (is_admin()) with check (is_admin());

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  relation text not null check (relation in ('family','partner','friend','colleague','travel_agency','embassy','other')),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  language_code text,
  informed_confirmed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index emergency_contacts_user on public.emergency_contacts(user_id);
alter table public.emergency_contacts enable row level security;
create policy ec_self_read on emergency_contacts for select to authenticated using (user_id = auth.uid());

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'ai_review' check (status in ('ai_review','awaiting_admin','needs_info','approved','rejected')),
  legal_full_name text not null check (char_length(legal_full_name) between 2 and 120),
  nationality char(2) not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  current_city text not null,
  doc_type text not null check (doc_type in ('national_id','passport')),
  doc_country char(2) not null,
  doc_last4 text not null check (doc_last4 ~ '^[A-Za-z0-9]{4}$'),
  doc_image_path text,
  selfie_path text,
  submitted_at timestamptz not null default now(),
  review_opens_at timestamptz not null,
  review_due_at timestamptz not null,
  ai_risk text check (ai_risk in ('low','medium','high')),
  ai_score smallint check (ai_score between 0 and 100),
  ai_flags jsonb not null default '[]',
  ai_summary text,
  ai_model text,
  ai_reviewed_at timestamptz,
  admin_id uuid references public.profiles(id) on delete set null,
  admin_note text,
  admin_reviewed_at timestamptz,
  files_deleted_at timestamptz
);
create unique index one_open_verification on public.identity_verifications(user_id) where status in ('ai_review','awaiting_admin');
create index verification_queue_idx on public.identity_verifications(status, review_due_at);
alter table public.identity_verifications enable row level security;
create policy iv_self on identity_verifications for select to authenticated using (user_id = auth.uid() or has_role('admin') or has_role('verifier'));

create or replace function public.guard_discoverable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.discoverable and not exists (select 1 from profile_private where user_id = new.id and identity_verified_at is not null and adult_confirmed_at is not null)
    then raise exception 'verification_required'; end if;
  return new;
end $$;
create trigger profiles_discoverable_guard before insert or update of discoverable on public.profiles
  for each row execute function public.guard_discoverable();

create or replace function public.submit_verification(p_name text, p_nationality text, p_phone text, p_city text,
  p_doc_type text, p_doc_country text, p_doc_last4 text, p_doc_path text, p_selfie_path text, p_helpers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; h jsonb; v_min int; v_max int; v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profile_private where user_id=auth.uid() and adult_confirmed_at is not null) then raise exception 'adult_required'; end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
  if coalesce(p_doc_path,'')='' or coalesce(p_selfie_path,'')='' then raise exception 'files_required'; end if;
  if p_doc_path not like '%/%' or p_selfie_path not like '%/%' then raise exception 'files_required'; end if;
  if jsonb_typeof(p_helpers) <> 'array' or jsonb_array_length(p_helpers) < 1 then raise exception 'helper_required'; end if;
  if jsonb_array_length(p_helpers) > 3 then raise exception 'too_many_helpers'; end if;
  for h in select * from jsonb_array_elements(p_helpers) loop
    if h->>'phone' = p_phone then raise exception 'helper_phone_same'; end if;
    if coalesce((h->>'informed')::boolean,false) is not true then raise exception 'helper_not_informed'; end if;
  end loop;
  if exists (select 1 from identity_verifications where user_id=auth.uid() and status='approved') then raise exception 'already_verified'; end if;
  select value into v_min from platform_settings where key='verification_min_hours';
  select value into v_max from platform_settings where key='verification_max_hours';
  delete from emergency_contacts where user_id=auth.uid();
  insert into emergency_contacts(user_id,full_name,relation,phone_e164,email,language_code,informed_confirmed_at)
    select auth.uid(), x->>'name', x->>'relation', x->>'phone', x->>'email', x->>'language', v_now from jsonb_array_elements(p_helpers) x;
  insert into identity_verifications(user_id,legal_full_name,nationality,phone_e164,current_city,doc_type,doc_country,doc_last4,doc_image_path,selfie_path,submitted_at,review_opens_at,review_due_at)
    values (auth.uid(),trim(p_name),upper(p_nationality),p_phone,p_city,p_doc_type,upper(p_doc_country),p_doc_last4,p_doc_path,p_selfie_path,v_now,v_now+make_interval(hours=>v_min),v_now+make_interval(hours=>v_max))
    returning id into v_id;
  return v_id;
end $$;

-- Chỉ Edge Function dùng service role được ghi kết quả AI.
create or replace function public.record_ai_review(p_id uuid, p_risk text, p_score int, p_flags jsonb, p_summary text, p_model text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update identity_verifications set status='awaiting_admin', ai_risk=p_risk, ai_score=p_score, ai_flags=coalesce(p_flags,'[]'), ai_summary=p_summary, ai_model=p_model, ai_reviewed_at=now()
    where id=p_id and status='ai_review';
  if not found then raise exception 'not_in_ai_review'; end if;
end $$;

create or replace function public.verification_queue()
returns table(id uuid, user_id uuid, legal_full_name text, nationality text, doc_type text, doc_last4 text, current_city text,
  ai_risk text, ai_score int, ai_flags jsonb, ai_summary text, submitted_at timestamptz, review_opens_at timestamptz, review_due_at timestamptz, can_approve boolean, overdue boolean)
language sql stable security definer set search_path = public as $$
  select v.id,v.user_id,v.legal_full_name,v.nationality::text,v.doc_type,v.doc_last4,v.current_city,v.ai_risk,v.ai_score::int,v.ai_flags,v.ai_summary,v.submitted_at,v.review_opens_at,v.review_due_at,
    now() >= v.review_opens_at, now() > v.review_due_at
  from identity_verifications v
  where v.status='awaiting_admin' and (has_role('admin') or has_role('verifier'))
  order by case v.ai_risk when 'high' then 0 when 'medium' then 1 else 2 end, v.review_due_at
$$;

create or replace function public.admin_review_verification(p_id uuid, p_decision text, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v identity_verifications;
begin
  if not (has_role('admin') or has_role('verifier')) then raise exception 'forbidden'; end if;
  select * into v from identity_verifications where id=p_id for update;
  if not found or v.status <> 'awaiting_admin' then raise exception 'not_awaiting_admin'; end if;
  if v.user_id = auth.uid() then raise exception 'cannot_review_own'; end if;
  if p_decision='approved' then
    if now() < v.review_opens_at then raise exception 'review_window_not_open'; end if;
    if v.ai_risk = 'high' and coalesce(trim(p_note),'') = '' then raise exception 'reason_required'; end if;
    update profile_private set identity_verified_at=now() where user_id=v.user_id;
    update profiles set discoverable=true where id=v.user_id and account_status='active';
  elsif p_decision='rejected' then
    if coalesce(trim(p_note),'')='' then raise exception 'reason_required'; end if;
    update profile_private set identity_verified_at=null where user_id=v.user_id;
    update profiles set discoverable=false where id=v.user_id;
  elsif p_decision='needs_info' then
    if coalesce(trim(p_note),'')='' then raise exception 'reason_required'; end if;
  else raise exception 'bad_decision'; end if;
  update identity_verifications set status=p_decision, admin_id=auth.uid(), admin_note=p_note, admin_reviewed_at=now() where id=p_id;
  perform audit('verification.'||p_decision,'identity_verifications',p_id::text,jsonb_build_object('ai_risk',v.ai_risk));
  return p_decision;
end $$;

-- Xem người trợ giúp chỉ khi có sự cố, luôn ghi lý do và người xem.
create or replace function public.reveal_emergency_contacts(p_user uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not (has_role('admin') or has_role('moderator')) then raise exception 'forbidden'; end if;
  if char_length(coalesce(trim(p_reason),'')) < 10 then raise exception 'reason_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',full_name,'relation',relation,'phone',phone_e164,'email',email,'language',language_code)),'[]') into v from emergency_contacts where user_id=p_user;
  perform audit('emergency_contact.revealed','profiles',p_user::text,jsonb_build_object('reason',p_reason));
  return v;
end $$;

do $$ declare f text; begin
  foreach f in array array['guard_discoverable()','submit_verification(text,text,text,text,text,text,text,text,text,jsonb)','verification_queue()','admin_review_verification(uuid,text,text)','reveal_emergency_contacts(uuid,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
revoke all on function public.record_ai_review(uuid,text,int,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.record_ai_review(uuid,text,int,jsonb,text,text) to service_role;
