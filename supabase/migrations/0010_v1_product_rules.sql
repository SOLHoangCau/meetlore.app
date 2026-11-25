-- Quy tắc sản phẩm V1: chờ theo rủi ro, buổi chia sẻ, giá trị tham chiếu, ưu đãi tuần hoàn, quỹ app, thống kê SKROI.

-- ===== Tham số =====
delete from public.platform_settings where key in ('verification_min_hours','verification_max_hours');
insert into public.platform_settings values
  ('verification_min_hours_low',24),('verification_min_hours_elevated',48),('verification_review_sla_hours',24),
  ('max_nearby_alerts_per_day',1),('partner_budget_percent',5),('first_month_budget_max_vnd',5000000),
  ('fund_monthly_spend_percent',50),('session_point_cap',600),('monthly_point_cap',1200);

create or replace function public.setting(p_key text) returns int
language sql stable security definer set search_path = public as $$ select value from platform_settings where key = p_key $$;

-- ===== Khai báo mở rộng =====
alter table public.profile_private add column home_country char(2), add column home_province text, add column home_ward text;
alter table public.capabilities add column credential text check (credential in ('bachelor','master','doctor','skilled_worker','artisan','other'));
alter table public.trip_plans add column country_code char(2), add column city text, add column purpose text;

drop function public.complete_basics(text, date, text, text, text, text);
create function public.complete_basics(p_display_name text, p_birth_date date, p_home_country text, p_home_province text,
  p_home_ward text default null, p_gender text default null, p_gender_text text default null, p_meet_preference text default 'any')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_birth_date > (current_date - interval '18 years')::date then raise exception 'must_be_18'; end if;
  if char_length(trim(p_display_name)) < 2 then raise exception 'name_too_short'; end if;
  if coalesce(p_home_country,'') !~ '^[A-Za-z]{2}$' or coalesce(trim(p_home_province),'') = '' then raise exception 'home_required'; end if;
  if p_meet_preference = 'same_gender' and p_gender is null then raise exception 'gender_required_for_preference'; end if;
  update profiles set display_name = trim(p_display_name) where id = auth.uid();
  update profile_private set birth_year = extract(year from p_birth_date)::smallint, adult_confirmed_at = now(),
    home_country = upper(p_home_country), home_province = trim(p_home_province), home_ward = nullif(trim(p_home_ward),''),
    gender = p_gender, gender_self_described = p_gender_text, meet_preference = p_meet_preference
  where user_id = auth.uid();
end $$;

-- ===== Xác minh: thời gian tối thiểu theo mức rủi ro =====
create or replace function public.submit_verification(p_name text, p_nationality text, p_phone text, p_city text,
  p_doc_type text, p_doc_country text, p_doc_last4 text, p_doc_path text, p_selfie_path text, p_helpers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; h jsonb; v_wait int := setting('verification_min_hours_elevated'); v_sla int := setting('verification_review_sla_hours'); v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profile_private where user_id=auth.uid() and adult_confirmed_at is not null) then raise exception 'adult_required'; end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
  if coalesce(p_doc_path,'') not like '%/%' or coalesce(p_selfie_path,'') not like '%/%' then raise exception 'files_required'; end if;
  if jsonb_typeof(p_helpers) <> 'array' or jsonb_array_length(p_helpers) < 1 then raise exception 'helper_required'; end if;
  if jsonb_array_length(p_helpers) > 3 then raise exception 'too_many_helpers'; end if;
  for h in select * from jsonb_array_elements(p_helpers) loop
    if h->>'phone' = p_phone then raise exception 'helper_phone_same'; end if;
    if coalesce((h->>'informed')::boolean,false) is not true then raise exception 'helper_not_informed'; end if;
  end loop;
  if exists (select 1 from identity_verifications where user_id=auth.uid() and status='approved') then raise exception 'already_verified'; end if;
  delete from emergency_contacts where user_id=auth.uid();
  insert into emergency_contacts(user_id,full_name,relation,phone_e164,email,language_code,informed_confirmed_at)
    select auth.uid(), x->>'name', x->>'relation', x->>'phone', x->>'email', x->>'language', v_now from jsonb_array_elements(p_helpers) x;
  insert into identity_verifications(user_id,legal_full_name,nationality,phone_e164,current_city,doc_type,doc_country,doc_last4,doc_image_path,selfie_path,submitted_at,review_opens_at,review_due_at)
    values (auth.uid(),trim(p_name),upper(p_nationality),p_phone,p_city,p_doc_type,upper(p_doc_country),p_doc_last4,p_doc_path,p_selfie_path,v_now,v_now+make_interval(hours=>v_wait),v_now+make_interval(hours=>v_wait+v_sla))
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.record_ai_review(p_id uuid, p_risk text, p_score int, p_flags jsonb, p_summary text, p_model text)
returns void language plpgsql security definer set search_path = public as $$
declare v_wait int := case when p_risk='low' then setting('verification_min_hours_low') else setting('verification_min_hours_elevated') end;
begin
  update identity_verifications set status='awaiting_admin', ai_risk=p_risk, ai_score=p_score, ai_flags=coalesce(p_flags,'[]'), ai_summary=p_summary, ai_model=p_model, ai_reviewed_at=now(),
    review_opens_at=submitted_at+make_interval(hours=>v_wait), review_due_at=submitted_at+make_interval(hours=>v_wait+setting('verification_review_sla_hours'))
    where id=p_id and status='ai_review';
  if not found then raise exception 'not_in_ai_review'; end if;
end $$;

-- ===== Hub: có mặt cần tài khoản đã xác minh; vùng lương =====
alter table public.hubs add column wage_region smallint not null default 1 check (wage_region between 1 and 4);
create or replace function public.set_presence(p_hub uuid, p_on boolean) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz := now() + interval '2 hours';
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  if not exists (select 1 from hubs where id = p_hub and status = 'active') then raise exception 'hub_not_active'; end if;
  if p_on then
    insert into hub_presence values (p_hub, auth.uid(), v_until) on conflict (hub_id, user_id) do update set expires_at = v_until;
    insert into hub_checkins(hub_id, user_id, source) values (p_hub, auth.uid(), 'manual');
    return v_until;
  end if;
  delete from hub_presence where hub_id = p_hub and user_id = auth.uid();
  return null;
end $$;

-- ===== Giá trị tham chiếu =====
create table public.value_parameters (
  version int generated always as identity primary key,
  effective_from date not null,
  expert_monthly_vnd int not null,
  work_days smallint not null default 26,
  work_hours smallint not null default 8,
  points_per_hour smallint not null default 100,
  wage_region_1 int not null, wage_region_2 int not null, wage_region_3 int not null, wage_region_4 int not null,
  source text not null
);
insert into public.value_parameters(effective_from,expert_monthly_vnd,wage_region_1,wage_region_2,wage_region_3,wage_region_4,source)
  values ('2026-07-01',30000000,25500,22700,20000,17800,'Thông tư 7/2026/TT-BNV mức 4; Nghị định 293/2025/NĐ-CP');

create or replace function public.current_value_version() returns int
language sql stable security definer set search_path = public as $$ select max(version) from value_parameters where effective_from <= current_date $$;

create or replace function public.expert_hour_vnd(p_region int, p_version int default null) returns int
language sql stable security definer set search_path = public as $$
  select round(expert_monthly_vnd::numeric / work_days / work_hours
    * (case p_region when 1 then wage_region_1 when 2 then wage_region_2 when 3 then wage_region_3 else wage_region_4 end)::numeric / wage_region_1)::int
  from value_parameters where version = coalesce(p_version, current_value_version())
$$;
create or replace function public.point_value_vnd(p_region int, p_version int default null) returns int
language sql stable security definer set search_path = public as $$
  select round(expert_monthly_vnd::numeric / work_days / work_hours
    * (case p_region when 1 then wage_region_1 when 2 then wage_region_2 when 3 then wage_region_3 else wage_region_4 end)::numeric / wage_region_1 / points_per_hour)::int
  from value_parameters where version = coalesce(p_version, current_value_version())
$$;

-- ===== Sổ điểm: thêm nguồn và quỹ app =====
alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in
  ('knowledge_approved','session_shared','clawback','reward_redeemed','reward_refund','redemption_received','fund_donation','fund_inflow','fund_reward','admin_adjustment'));
alter table public.point_ledger add column app_fund boolean not null default false, add column session_id uuid;
alter table public.point_ledger add constraint ledger_one_owner check (num_nonnulls(user_id, fund_hub_id) + (app_fund::int) <= 1);

create or replace function public.ledger_append_only() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and new.id = old.id and new.delta = old.delta and new.reason = old.reason and new.created_at = old.created_at
     and new.available_at = old.available_at and new.expires_at is not distinct from old.expires_at and new.app_fund = old.app_fund
     and (new.user_id is not distinct from old.user_id or new.user_id is null)
     and (new.fund_hub_id is not distinct from old.fund_hub_id or new.fund_hub_id is null)
     and (new.item_id is not distinct from old.item_id or new.item_id is null)
     and (new.session_id is not distinct from old.session_id or new.session_id is null)
     and new.redemption_id is not distinct from old.redemption_id
  then return new; end if;
  raise exception 'point_ledger_is_append_only';
end $$;

create or replace function public.month_earned(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta),0)::int from point_ledger where user_id=p_user and reason in ('knowledge_approved','session_shared') and delta>0 and created_at>=date_trunc('month',now())
$$;

-- ===== Thống kê gốc =====
create table public.metric_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_type text not null,
  hub_id uuid references public.hubs(id) on delete set null,
  wage_region smallint,
  value_version int references public.value_parameters(version),
  people int not null default 0,
  minutes int not null default 0,
  points int not null default 0,
  reference_vnd bigint not null default 0,
  conservative_vnd bigint not null default 0,
  bill_vnd bigint not null default 0,
  discount_vnd bigint not null default 0,
  source_id text,
  detail jsonb not null default '{}'
);
create index metric_events_time on public.metric_events(occurred_at, hub_id, event_type);

create or replace function public.log_metric(p_type text, p_hub uuid, p_people int default 0, p_minutes int default 0, p_points int default 0,
  p_ref bigint default 0, p_cons bigint default 0, p_bill bigint default 0, p_discount bigint default 0, p_source text default null, p_detail jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into metric_events(event_type,hub_id,wage_region,value_version,people,minutes,points,reference_vnd,conservative_vnd,bill_vnd,discount_vnd,source_id,detail)
  values (p_type,p_hub,(select wage_region from hubs where id=p_hub),current_value_version(),p_people,p_minutes,p_points,p_ref,p_cons,p_bill,p_discount,p_source,p_detail)
$$;

create or replace function public.track_activity() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name='match_intents' then
    if tg_op='INSERT' then perform log_metric('connection_requested',new.hub_id,1,p_source=>new.id::text);
    elsif new.status='accepted' and old.status<>'accepted' then perform log_metric('connection_accepted',new.hub_id,2,p_source=>new.id::text); end if;
  elsif tg_table_name='meetups' then
    if new.status='completed' and old.status<>'completed' then perform log_metric('meetup_completed',new.hub_id,2,new.duration_minutes,p_source=>new.id::text); end if;
  elsif tg_table_name='knowledge_reviews' then
    if new.decision='approved' then
      perform log_metric('knowledge_approved',(select hub_id from knowledge_items where id=new.item_id),1,0,coalesce(new.points_awarded,0),
        coalesce(new.points_awarded,0)*point_value_vnd(coalesce((select h.wage_region from knowledge_items k join hubs h on h.id=k.hub_id where k.id=new.item_id),1)),0,p_source=>new.item_id::text);
    end if;
  end if;
  return new;
end $$;
create trigger metric_intent after insert or update of status on public.match_intents for each row execute function public.track_activity();
create trigger metric_meetup after update of status on public.meetups for each row execute function public.track_activity();
create trigger metric_review after insert on public.knowledge_reviews for each row execute function public.track_activity();

-- ===== Lời mời chia sẻ theo chuyên môn =====
create table public.sharing_invitation_responses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  topic_id text not null references public.topics(id),
  response text not null check (response in ('willing','later','never')),
  updated_at timestamptz not null default now(),
  primary key (user_id, hub_id, topic_id)
);

-- Dưới 5 người thì local_count để trống, app hiển thị "vài người".
create or replace function public.expertise_demand()
returns table(hub_id uuid, topic_id text, local_count int, has_demand boolean)
language sql stable security definer set search_path = public as $$
  select m.hub_id, o.topic_id, case when count(distinct m.user_id) >= 5 then count(distinct m.user_id)::int end, true
  from offers o
  join seeks s on s.topic_id = o.topic_id and s.user_id <> o.user_id
  join hub_members m on m.user_id = s.user_id and m.status='ready'
  join hubs h on h.id = m.hub_id and h.status='active'
  join profiles p on p.id = s.user_id and p.discoverable and p.account_status='active'
  where o.user_id = auth.uid() and is_verified(auth.uid())
    and not are_blocked(auth.uid(), s.user_id)
    and not exists (select 1 from sharing_invitation_responses r where r.user_id=auth.uid() and r.hub_id=m.hub_id and r.topic_id=o.topic_id and r.response='never')
  group by m.hub_id, o.topic_id
$$;

create or replace function public.respond_sharing_invitation(p_hub uuid, p_topic text, p_response text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  insert into sharing_invitation_responses values (auth.uid(),p_hub,p_topic,p_response,now())
    on conflict (user_id,hub_id,topic_id) do update set response=p_response, updated_at=now();
  perform log_metric('sharing_invitation_'||p_response,p_hub,1,p_detail=>jsonb_build_object('topic',p_topic));
end $$;

-- ===== Buổi chia sẻ =====
create table public.sharing_sessions (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null references public.topics(id),
  title text not null check (char_length(title) between 3 and 140),
  summary text check (char_length(summary) <= 2000),
  starts_at timestamptz not null,
  planned_minutes int not null check (planned_minutes between 15 and 240),
  actual_minutes int check (actual_minutes between 15 and 240),
  status text not null default 'scheduled' check (status in ('scheduled','ended','confirmed','disputed','rejected','cancelled')),
  checkin_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  confirmed_people int, confirmed_minutes int, equivalent_hours numeric(6,2), points_awarded int,
  confirmed_via text check (confirmed_via in ('hub_manager','recipients','admin')),
  confirmed_by uuid references public.profiles(id) on delete set null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index sharing_sessions_hub on public.sharing_sessions(hub_id, starts_at);
create table public.session_attendees (
  session_id uuid not null references public.sharing_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  time_ok boolean, content_ok boolean, confirmed_at timestamptz, counted boolean not null default false,
  primary key (session_id, user_id)
);
alter table public.point_ledger add constraint ledger_session_fk foreign key (session_id) references public.sharing_sessions(id) on delete set null;

create or replace function public.create_sharing_session(p_hub uuid, p_topic text, p_title text, p_starts timestamptz, p_minutes int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  if not exists (select 1 from hubs where id=p_hub and status='active') then raise exception 'hub_not_active'; end if;
  insert into sharing_sessions(hub_id,host_id,topic_id,title,starts_at,planned_minutes) values (p_hub,auth.uid(),p_topic,trim(p_title),p_starts,p_minutes) returning id into v;
  perform log_metric('session_created',p_hub,0,p_minutes,p_source=>v::text);
  return v;
end $$;

create or replace function public.session_check_in(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions;
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  select * into s from sharing_sessions where checkin_code=upper(trim(p_code));
  if not found or s.status <> 'scheduled' then raise exception 'session_not_open'; end if;
  if s.host_id=auth.uid() then raise exception 'host_cannot_attend'; end if;
  if are_blocked(auth.uid(), s.host_id) then raise exception 'blocked'; end if;
  insert into session_attendees(session_id,user_id) values (s.id,auth.uid()) on conflict do nothing;
  return s.id;
end $$;

create or replace function public.end_sharing_session(p_id uuid, p_minutes int, p_summary text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sharing_sessions set status='ended', actual_minutes=p_minutes, summary=p_summary, ended_at=now()
    where id=p_id and host_id=auth.uid() and status='scheduled';
  if not found then raise exception 'session_not_found'; end if;
end $$;

create or replace function public.confirm_session_as_attendee(p_id uuid, p_time_ok boolean, p_content_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sharing_sessions where id=p_id and status='ended') then raise exception 'session_not_ended'; end if;
  update session_attendees set time_ok=p_time_ok, content_ok=p_content_ok, confirmed_at=now() where session_id=p_id and user_id=auth.uid();
  if not found then raise exception 'not_attendee'; end if;
end $$;

-- Người cùng tham dự buổi của một người chia sẻ quá 2 lần trong 30 ngày thì không được tính tiếp.
create or replace function public.award_session(p_id uuid, p_minutes int, p_via text) returns int
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions; v_n int; v_points int; v_eq numeric; v_hour int; v_room int; v_given int; v_region int;
begin
  select * into s from sharing_sessions where id=p_id for update;
  update session_attendees a set counted = (
      case when p_via='hub_manager' then true else coalesce(a.time_ok and a.content_ok,false) end)
    and (select count(*) from session_attendees o join sharing_sessions x on x.id=o.session_id
         where o.user_id=a.user_id and x.host_id=s.host_id and x.id<>s.id and o.counted and x.status='confirmed' and x.ended_at>now()-interval '30 days') < 2
    where a.session_id=p_id;
  select count(*) into v_n from session_attendees where session_id=p_id and counted;
  if v_n=0 then raise exception 'no_confirmed_attendees'; end if;
  select wage_region into v_region from hubs where id=s.hub_id;
  v_eq := round(p_minutes/60.0*v_n/2,2);
  v_points := least(setting('session_point_cap'), round(50*v_n*p_minutes/60.0)::int);
  v_room := greatest(0,setting('monthly_point_cap')-month_earned(s.host_id));
  v_given := least(v_points,v_room);
  if v_given>0 then
    insert into point_ledger(user_id,delta,reason,session_id,available_at,expires_at)
      values (s.host_id,v_given,'session_shared',p_id,now()+interval '30 days',now()+interval '30 days'+interval '24 months');
  end if;
  update sharing_sessions set status='confirmed',confirmed_people=v_n,confirmed_minutes=p_minutes,equivalent_hours=v_eq,points_awarded=v_given,confirmed_via=p_via,confirmed_by=auth.uid() where id=p_id;
  v_hour := expert_hour_vnd(v_region);
  perform log_metric('session_confirmed',s.hub_id,v_n,p_minutes,v_given,round(v_eq*v_hour)::bigint,round(p_minutes/60.0*v_hour)::bigint,p_source=>p_id::text,p_detail=>jsonb_build_object('via',p_via,'topic',s.topic_id));
  return v_given;
end $$;

create or replace function public.confirm_session_by_hub(p_id uuid, p_minutes int, p_content_ok boolean, p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions;
begin
  select * into s from sharing_sessions where id=p_id;
  if not found or s.status<>'ended' then raise exception 'session_not_ended'; end if;
  if s.host_id=auth.uid() then raise exception 'cannot_confirm_own'; end if;
  if not (is_hub_operator(s.hub_id) or is_admin()) then raise exception 'forbidden'; end if;
  if not p_content_ok then update sharing_sessions set status='disputed',summary=coalesce(p_note,summary) where id=p_id; return 0; end if;
  return award_session(p_id,least(p_minutes,s.actual_minutes),'hub_manager');
end $$;

create or replace function public.finalize_session_by_recipients(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions; v_all int; v_answered int; v_good int; v_bad int;
begin
  select * into s from sharing_sessions where id=p_id;
  if not found or s.status<>'ended' then raise exception 'session_not_ended'; end if;
  if not (s.host_id=auth.uid() or is_admin() or exists(select 1 from session_attendees where session_id=p_id and user_id=auth.uid())) then raise exception 'forbidden'; end if;
  select count(*), count(confirmed_at), count(*) filter (where time_ok and content_ok), count(*) filter (where confirmed_at is not null and not (time_ok and content_ok))
    into v_all,v_answered,v_good,v_bad from session_attendees where session_id=p_id;
  if v_answered<v_all and s.ended_at>now()-interval '48 hours' then raise exception 'confirmation_window_open'; end if;
  if v_bad>v_good then update sharing_sessions set status='disputed' where id=p_id; return 0; end if;
  return award_session(p_id,s.actual_minutes,'recipients');
end $$;

create or replace function public.admin_resolve_session(p_id uuid, p_approve boolean, p_minutes int default null) returns int
language plpgsql security definer set search_path = public as $$
declare s sharing_sessions;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into s from sharing_sessions where id=p_id and status='disputed';
  if not found then raise exception 'session_not_disputed'; end if;
  perform audit('session.resolved','sharing_sessions',p_id::text,jsonb_build_object('approve',p_approve));
  if not p_approve then update sharing_sessions set status='rejected' where id=p_id; return 0; end if;
  return award_session(p_id,coalesce(p_minutes,s.actual_minutes),'admin');
end $$;

-- ===== Ưu đãi của cơ sở =====
alter table public.reward_partners add column owner_id uuid references public.profiles(id) on delete set null,
  add column hub_id uuid references public.hubs(id) on delete set null, add column wage_region smallint not null default 1 check (wage_region between 1 and 4);
alter table public.reward_offers alter column point_cost drop not null;
alter table public.reward_offers add column discount_percent smallint check (discount_percent between 1 and 50),
  add column max_discount_vnd int check (max_discount_vnd > 0), add column min_points int not null default 1 check (min_points > 0);
alter table public.reward_redemptions drop constraint reward_redemptions_status_check;
alter table public.reward_redemptions add constraint reward_redemptions_status_check check (status in ('issued','quoted','used','expired','cancelled'));
alter table public.reward_redemptions add column bill_vnd bigint, add column discount_vnd bigint, add column points_spent int, add column owner_points int, add column fund_points int, add column value_version int references public.value_parameters(version), add column quoted_by uuid references public.profiles(id) on delete set null;

create table public.reward_partner_budgets (
  partner_id uuid not null references public.reward_partners(id) on delete cascade,
  month date not null check (extract(day from month)=1),
  amount_vnd bigint not null check (amount_vnd >= 0),
  updated_at timestamptz not null default now(),
  primary key (partner_id, month)
);

create or replace function public.is_partner_staff(p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from reward_partner_staff where partner_id=p_partner and user_id=auth.uid())
    or exists(select 1 from reward_partners where id=p_partner and owner_id=auth.uid())
$$;
create or replace function public.partner_revenue(p_partner uuid, p_month date) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(r.bill_vnd),0)::bigint from reward_redemptions r join reward_offers o on o.id=r.offer_id
  where o.partner_id=p_partner and r.status='used' and r.used_at>=p_month and r.used_at<(p_month+interval '1 month')
$$;
create or replace function public.partner_budget_used(p_partner uuid, p_month date) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(r.discount_vnd),0)::bigint from reward_redemptions r join reward_offers o on o.id=r.offer_id
  where o.partner_id=p_partner and r.status='used' and r.used_at>=p_month and r.used_at<(p_month+interval '1 month')
$$;
create or replace function public.partner_budget_cap(p_partner uuid, p_month date) returns bigint
language sql stable security definer set search_path = public as $$
  select case when rev>0 then floor(rev*setting('partner_budget_percent')/100.0)::bigint else setting('first_month_budget_max_vnd')::bigint end
  from (select partner_revenue(p_partner,(p_month-interval '1 month')::date) rev) x
$$;
create or replace function public.set_partner_budget(p_partner uuid, p_month date, p_amount bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_month date := date_trunc('month',p_month)::date; v_cap bigint;
begin
  if not (is_partner_staff(p_partner) or is_admin()) then raise exception 'forbidden'; end if;
  if v_month < date_trunc('month',now())::date then raise exception 'month_passed'; end if;
  v_cap := partner_budget_cap(p_partner,v_month);
  if p_amount>v_cap then raise exception 'budget_above_cap'; end if;
  insert into reward_partner_budgets values (p_partner,v_month,p_amount,now())
    on conflict (partner_id,month) do update set amount_vnd=p_amount, updated_at=now();
  return v_cap;
end $$;
create or replace function public.partner_summary(p_partner uuid)
returns table(month date, budget_vnd bigint, used_vnd bigint, cap_vnd bigint, revenue_vnd bigint, redemptions int)
language plpgsql stable security definer set search_path = public as $$
declare v_month date := date_trunc('month',now())::date;
begin
  if not (is_partner_staff(p_partner) or is_admin()) then raise exception 'forbidden'; end if;
  return query select v_month, coalesce((select amount_vnd from reward_partner_budgets b where b.partner_id=p_partner and b.month=v_month),0)::bigint,
    partner_budget_used(p_partner,v_month), partner_budget_cap(p_partner,v_month), partner_revenue(p_partner,v_month),
    (select count(*)::int from reward_redemptions r join reward_offers o on o.id=r.offer_id where o.partner_id=p_partner and r.status='used' and r.used_at>=v_month);
end $$;

drop function public.redeem_reward(uuid);
drop function public.confirm_redemption(text);

create or replace function public.claim_reward(p_offer uuid) returns text
language plpgsql security definer set search_path = public as $$
declare o reward_offers; p reward_partners; v_month date := date_trunc('month',now())::date; v_code text; v_budget bigint;
begin
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  if not coalesce((select enabled from platform_flags where key='points_redemption'),false) then raise exception 'redemption_disabled'; end if;
  select * into o from reward_offers where id=p_offer and active;
  select * into p from reward_partners where id=o.partner_id and active and agreement_status='signed';
  if o.id is null or p.id is null then raise exception 'offer_unavailable'; end if;
  if p.owner_id=auth.uid() or is_partner_staff(p.id) then raise exception 'own_venue'; end if;
  select amount_vnd into v_budget from reward_partner_budgets where partner_id=p.id and month=v_month;
  if coalesce(v_budget,0)<=partner_budget_used(p.id,v_month) then raise exception 'budget_exhausted'; end if;
  if (select available from point_balance(auth.uid()))<o.min_points then raise exception 'insufficient_points'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into reward_redemptions(offer_id,user_id,code,expires_at) values (p_offer,auth.uid(),v_code,now()+make_interval(days=>o.valid_days));
  return v_code;
end $$;

-- Nhân viên nhập hóa đơn, khách xác nhận trên máy của mình.
create or replace function public.quote_voucher(p_code text, p_bill bigint)
returns table(discount_vnd bigint, points int) language plpgsql security definer set search_path = public as $$
declare r reward_redemptions; o reward_offers; p reward_partners; v_disc bigint; v_points int;
begin
  select * into r from reward_redemptions x where x.code=upper(trim(p_code)) for update;
  if not found then raise exception 'code_not_found'; end if;
  select * into o from reward_offers where id=r.offer_id; select * into p from reward_partners where id=o.partner_id;
  if not is_partner_staff(p.id) then raise exception 'code_not_found'; end if;
  if r.status not in ('issued','quoted') or r.expires_at<now() then raise exception 'code_not_usable'; end if;
  if p_bill<=0 then raise exception 'bad_bill'; end if;
  v_disc := floor(p_bill*o.discount_percent/100.0)::bigint;
  if o.max_discount_vnd is not null then v_disc := least(v_disc,o.max_discount_vnd); end if;
  v_points := ceil(v_disc::numeric/point_value_vnd(p.wage_region))::int;
  update reward_redemptions x set status='quoted',bill_vnd=p_bill,discount_vnd=v_disc,points_spent=v_points,value_version=current_value_version(),quoted_by=auth.uid() where x.id=r.id;
  return query select v_disc,v_points;
end $$;

create or replace function public.confirm_voucher(p_code text) returns table(discount_vnd bigint, points int)
language plpgsql security definer set search_path = public as $$
declare r reward_redemptions; o reward_offers; p reward_partners; v_owner int; v_fund int;
begin
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into r from reward_redemptions x where x.code=upper(trim(p_code)) and x.user_id=auth.uid() for update;
  if not found or r.status<>'quoted' or r.expires_at<now() then raise exception 'code_not_usable'; end if;
  select * into o from reward_offers where id=r.offer_id; select * into p from reward_partners where id=o.partner_id;
  if p.owner_id is null then raise exception 'partner_owner_missing'; end if;
  if (select available from point_balance(auth.uid()))<r.points_spent then raise exception 'insufficient_points'; end if;
  v_owner := floor(r.points_spent/2.0)::int; v_fund := r.points_spent-v_owner;
  insert into point_ledger(user_id,delta,reason,redemption_id) values (auth.uid(),-r.points_spent,'reward_redeemed',r.id);
  if v_owner>0 then insert into point_ledger(user_id,delta,reason,redemption_id,available_at,expires_at) values (p.owner_id,v_owner,'redemption_received',r.id,now()+interval '30 days',now()+interval '30 days'+interval '24 months'); end if;
  insert into point_ledger(app_fund,delta,reason,redemption_id,expires_at) values (true,v_fund,'fund_inflow',r.id,now()+interval '24 months');
  update reward_redemptions x set status='used',used_at=now(),owner_points=v_owner,fund_points=v_fund,confirmed_by=r.quoted_by where x.id=r.id;
  perform log_metric('reward_redeemed',p.hub_id,1,0,r.points_spent,r.points_spent*point_value_vnd(p.wage_region)::bigint,r.discount_vnd,r.bill_vnd,r.discount_vnd,r.id::text);
  return query select r.discount_vnd,r.points_spent;
end $$;

-- ===== Quỹ app =====
create or replace function public.app_fund_status() returns table(balance int, month_in int, month_out int, month_limit int)
language plpgsql stable security definer set search_path = public as $$
declare v_in int; v_out int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select coalesce(sum(delta) filter (where delta>0),0), coalesce(-sum(delta) filter (where delta<0),0) into v_in,v_out from point_ledger where app_fund and created_at>=date_trunc('month',now());
  return query select greatest(0,(select coalesce(sum(delta) filter (where delta<0 or expires_at is null or expires_at>now()),0)::int from point_ledger where app_fund)),v_in,v_out,floor(v_in*setting('fund_monthly_spend_percent')/100.0)::int;
end $$;
create or replace function public.fund_reward(p_user uuid, p_points int, p_task text, p_hub uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_points<=0 or coalesce(trim(p_task),'')='' then raise exception 'bad_reward'; end if;
  if not is_verified(p_user) then raise exception 'verification_required'; end if;
  perform pg_advisory_xact_lock(hashtext('app_fund'));
  select * into f from app_fund_status();
  if p_points>f.balance or f.month_out+p_points>f.month_limit then raise exception 'fund_limit'; end if;
  insert into point_ledger(app_fund,delta,reason,note) values (true,-p_points,'fund_reward',p_task);
  insert into point_ledger(user_id,delta,reason,note,available_at,expires_at) values (p_user,p_points,'fund_reward',p_task,now()+interval '30 days',now()+interval '30 days'+interval '24 months');
  perform log_metric('fund_reward',p_hub,1,0,p_points,p_detail=>jsonb_build_object('task',p_task));
  perform audit('fund.reward','profiles',p_user::text,jsonb_build_object('points',p_points,'task',p_task));
end $$;

-- ===== Dữ liệu cho SKROI =====
create table public.hub_cost_entries (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid references public.hubs(id) on delete set null,
  month date not null check (extract(day from month)=1),
  category text not null check (category in ('setup','operations','staff','event','app_allocation','other')),
  amount_vnd bigint not null check (amount_vnd >= 0),
  note text, evidence_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.contribution_hours (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid references public.hubs(id) on delete set null,
  month date not null check (extract(day from month)=1),
  role text not null check (role in ('volunteer','hub_operator','community_liaison','translator','other')),
  hours numeric(8,2) not null check (hours >= 0),
  note text
);
create table public.outcome_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hub_id uuid references public.hubs(id) on delete set null,
  session_id uuid references public.sharing_sessions(id) on delete set null,
  wave smallint not null check (wave in (3,6)),
  used_skill boolean, study_opportunity boolean, work_opportunity boolean, income_change boolean,
  would_have_learned smallint check (would_have_learned between 1 and 5),
  other_sources boolean, note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, session_id, wave)
);

create or replace function public.skroi_monthly_stats(p_from date, p_to date, p_hub uuid default null)
returns table(month date, hub_id uuid, hub_slug text, wage_region smallint, cost_vnd bigint, contribution_hours numeric, connections int, connections_accepted int, meetups int,
  sessions int, session_minutes bigint, session_people bigint, equivalent_hours numeric, knowledge_approved int, points_issued bigint, points_redeemed bigint,
  bill_vnd bigint, discount_vnd bigint, reference_vnd bigint, conservative_vnd bigint, outcome_responses int)
language sql stable security definer set search_path = public as $$
  with m as (select date_trunc('month',g)::date mon from generate_series(date_trunc('month',p_from::timestamptz),date_trunc('month',p_to::timestamptz),interval '1 month') g),
  h as (select id,slug,wage_region from hubs where p_hub is null or id=p_hub)
  select m.mon,h.id,h.slug,h.wage_region,
    coalesce((select sum(c.amount_vnd) from hub_cost_entries c where c.hub_id=h.id and c.month=m.mon),0)::bigint,
    coalesce((select sum(c.hours) from contribution_hours c where c.hub_id=h.id and c.month=m.mon),0),
    e.requested,e.accepted,e.met,e.sess,e.mins,e.people,round(e.eq,2),e.know,e.issued,e.redeemed,e.bill,e.disc,e.ref,e.cons,
    (select count(*)::int from outcome_surveys o where o.hub_id=h.id and date_trunc('month',o.created_at)=m.mon)
  from m cross join h cross join lateral (
    select count(*) filter (where event_type='connection_requested')::int requested, count(*) filter (where event_type='connection_accepted')::int accepted,
      count(*) filter (where event_type='meetup_completed')::int met, count(*) filter (where event_type='session_confirmed')::int sess,
      coalesce(sum(minutes) filter (where event_type='session_confirmed'),0)::bigint mins, coalesce(sum(people) filter (where event_type='session_confirmed'),0)::bigint people,
      coalesce(sum(minutes/60.0*people/2) filter (where event_type='session_confirmed'),0) eq, count(*) filter (where event_type='knowledge_approved')::int know,
      coalesce(sum(points) filter (where event_type in ('session_confirmed','knowledge_approved','fund_reward')),0)::bigint issued, coalesce(sum(points) filter (where event_type='reward_redeemed'),0)::bigint redeemed,
      coalesce(sum(metric_events.bill_vnd),0)::bigint bill, coalesce(sum(metric_events.discount_vnd),0)::bigint disc,
      coalesce(sum(metric_events.reference_vnd) filter (where event_type<>'reward_redeemed'),0)::bigint ref, coalesce(sum(metric_events.conservative_vnd) filter (where event_type='session_confirmed'),0)::bigint cons
    from metric_events where metric_events.hub_id=h.id and date_trunc('month',occurred_at)=m.mon) e
  where is_admin()
  order by 1,3
$$;

-- Số liệu cho đối tác hoặc công bố: ẩn nhóm dưới 5 người.
create or replace function public.public_impact_stats(p_from date, p_to date)
returns table(month date, hub_slug text, sessions int, people int, equivalent_hours numeric)
language sql stable security definer set search_path = public as $$
  select s.month,s.hub_slug,s.sessions,s.session_people::int,s.equivalent_hours from skroi_monthly_stats(p_from,p_to) s where s.session_people>=5
$$;

-- Nhu cầu mở Hub: cả đề nghị trực tiếp và chuyến đi tới nơi chưa có Hub.
create or replace function public.expansion_demand()
returns table(place text, destination_id text, locals int, travelers int, hosts int)
language sql stable security definer set search_path = public as $$
  with x as (
    select lower(trim(place_text)) p,destination_id d,user_id u,role r,willing_to_host w from hub_requests
    union all select lower(trim(coalesce(city,destination_text))),null,user_id,'traveler',false from trip_plans where hub_id is null and coalesce(city,destination_text) is not null)
  select p,max(d),count(distinct u) filter (where r='local')::int,count(distinct u) filter (where r='traveler')::int,count(distinct u) filter (where w)::int
  from x where has_role('admin') group by p having count(distinct u)>=5 order by 3 desc,4 desc
$$;

-- Duyệt cơ sở: gán vùng lương và chủ cơ sở cho đối tác ưu đãi.
drop function public.review_hub_application(uuid,text,text,text,text,int);
create function public.review_hub_application(p_id uuid, p_decision text, p_note text default null,
  p_slug text default null, p_region text default null, p_radius int default 150, p_wage_region int default 1)
returns uuid language plpgsql security definer set search_path = public as $$
declare a hub_applications; v_hub uuid; v_partner uuid; v_type text;
begin
  if not has_role('admin') then raise exception 'forbidden'; end if;
  select * into a from hub_applications where id=p_id for update;
  if not found or a.status not in ('submitted','site_check','needs_info') then raise exception 'application_not_reviewable'; end if;
  if a.applicant_id=auth.uid() then raise exception 'cannot_review_own'; end if;
  if p_decision in ('needs_info','site_check','rejected') then
    update hub_applications set status=p_decision,reviewer_note=p_note,reviewed_by=auth.uid() where id=p_id;
  elsif p_decision='approved' then
    if a.status<>'site_check' then raise exception 'site_check_required'; end if;
    insert into hubs(slug,region_id,level,status,lat,lng,radius_m,venue_type,wage_region) values (p_slug,coalesce(p_region,a.region_id),'partner','preparing',a.lat,a.lng,p_radius,a.venue_type,p_wage_region) returning id into v_hub;
    insert into hub_translations(hub_id,locale,name,summary,meeting_point) values (v_hub,'vi',a.venue_name,a.description,a.address);
    insert into hub_operators(hub_id,user_id,role) values (v_hub,a.applicant_id,'operator');
    insert into hub_topics select v_hub,t from unnest(a.topic_ids) t where exists(select 1 from topics where id=t);
    v_type := case a.venue_type when 'lodging' then 'homestay' when 'community_club' then 'community' when 'culture_house' then 'culture_space' else 'cafe' end;
    insert into hub_partners(hub_id,name,partner_type,agreement_status) values (v_hub,coalesce(a.legal_name,a.venue_name),v_type,'talking');
    if a.wants_reward_partner and a.venue_type in ('lodging','cafe','eatery') then
      insert into reward_partners(name,category,region_id,agreement_status,active,owner_id,hub_id,wage_region)
        values (a.venue_name,case a.venue_type when 'lodging' then 'lodging' else 'food' end,coalesce(p_region,a.region_id),'talking',false,a.applicant_id,v_hub,p_wage_region) returning id into v_partner;
      insert into reward_partner_staff values (v_partner,a.applicant_id);
    end if;
    update hub_applications set status='approved',reviewer_note=p_note,reviewed_by=auth.uid(),hub_id=v_hub where id=p_id;
  else raise exception 'bad_decision'; end if;
  perform audit('hub_application.'||p_decision,'hub_applications',p_id::text,jsonb_build_object('hub',v_hub));
  return v_hub;
end $$;

-- ===== Quyền =====
do $$ declare t text; begin
  foreach t in array array['value_parameters','metric_events','sharing_invitation_responses','sharing_sessions','session_attendees','reward_partner_budgets','hub_cost_entries','contribution_hours','outcome_surveys'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
create policy vp_read on value_parameters for select using (true);
create policy vp_admin on value_parameters for all to authenticated using (is_admin()) with check (is_admin());
create policy me_admin on metric_events for select to authenticated using (is_admin());
create policy sir_self on sharing_invitation_responses for select to authenticated using (user_id=auth.uid());
create policy ss_read on sharing_sessions for select to authenticated using (status<>'cancelled' or host_id=auth.uid());
create policy sa_read on session_attendees for select to authenticated using (user_id=auth.uid() or exists(select 1 from sharing_sessions s where s.id=session_id and (s.host_id=auth.uid() or is_hub_operator(s.hub_id) or is_admin())));
create policy rpb_read on reward_partner_budgets for select to authenticated using (is_partner_staff(partner_id) or is_admin());
create policy hce_admin on hub_cost_entries for all to authenticated using (is_admin()) with check (is_admin());
create policy ch_admin on contribution_hours for all to authenticated using (is_admin()) with check (is_admin());
create policy os_create on outcome_surveys for insert to authenticated with check (user_id=auth.uid());
create policy os_read on outcome_surveys for select to authenticated using (user_id=auth.uid() or is_admin());
create policy rp_staff on reward_partners for select to authenticated using (is_partner_staff(id));
create policy ro_staff on reward_offers for all to authenticated using (is_partner_staff(partner_id)) with check (is_partner_staff(partner_id));

do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
grant execute on function public.hub_ready_count(uuid) to anon;
grant execute on function public.point_value_vnd(int,int), public.expert_hour_vnd(int,int), public.current_value_version() to anon;
do $$ declare f text; begin
  foreach f in array array['audit(text,text,text,jsonb)','handle_new_user()','log_metric(text,uuid,int,int,int,bigint,bigint,bigint,bigint,text,jsonb)','track_activity()','award_session(uuid,int,text)','guard_verification_email()','sync_email_confirmed()','record_ai_review(uuid,text,int,jsonb,text,text)','confirm_user_sms(text,text)'] loop
    execute format('revoke execute on function public.%s from authenticated', f);
  end loop;
end $$;

-- ===== Bổ sung cho app =====
-- Mã điểm danh không được lộ qua việc đọc bảng: chỉ người chia sẻ, người vận hành Hub và Admin lấy được.
revoke select on public.sharing_sessions from authenticated;
grant select (id,hub_id,host_id,topic_id,title,summary,starts_at,planned_minutes,actual_minutes,status,confirmed_people,confirmed_minutes,equivalent_hours,points_awarded,confirmed_via,confirmed_by,ended_at,created_at) on public.sharing_sessions to authenticated;
create or replace function public.session_code(p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare v sharing_sessions;
begin
  select * into v from sharing_sessions where id=p_id;
  if v.id is null then raise exception 'not_found'; end if;
  if not (v.host_id=auth.uid() or is_hub_operator(v.hub_id) or is_admin()) then raise exception 'forbidden'; end if;
  return v.checkin_code;
end $$;
-- Ưu đãi hết ngân sách tháng bị ẩn, nhưng không tiết lộ ngân sách của cơ sở.
create or replace function public.open_reward_offers() returns setof uuid
language sql stable security definer set search_path = public as $$
  select o.id from reward_offers o join reward_partners p on p.id=o.partner_id
  where o.active and p.active and p.agreement_status='signed'
    and coalesce((select amount_vnd from reward_partner_budgets b where b.partner_id=p.id and b.month=date_trunc('month',now())::date),0)
        > partner_budget_used(p.id,date_trunc('month',now())::date)
$$;
create or replace function public.alert_limit() returns int
language sql stable security definer set search_path = public as $$ select setting('max_nearby_alerts_per_day')::int $$;
create or replace function public.set_alert_limit(p_value int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_value not between 1 and 5 then raise exception 'bad_value'; end if;
  update platform_settings set value=p_value where key='max_nearby_alerts_per_day';
  perform audit('settings.alert_limit','platform_settings','max_nearby_alerts_per_day',jsonb_build_object('value',p_value));
end $$;
revoke all on function public.session_code(uuid), public.open_reward_offers(), public.alert_limit(), public.set_alert_limit(int) from public, anon;
grant execute on function public.session_code(uuid), public.open_reward_offers(), public.alert_limit(), public.set_alert_limit(int) to authenticated, service_role;
