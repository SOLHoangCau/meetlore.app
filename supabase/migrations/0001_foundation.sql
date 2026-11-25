-- MeetLore: nền tảng tài khoản, hồ sơ và khai báo của người dùng.
-- Nguyên tắc: bảng profiles chỉ chứa thông tin có thể hiện cho người khác;
-- dữ liệu riêng tư nằm ở profile_private, trip_plans, availability.

create table public.languages (
  code text primary key,
  native_name text not null,
  english_name text not null,
  ui_enabled boolean not null default false,
  legal_reviewed boolean not null default false,
  sort_order int not null default 100,
  constraint ui_requires_legal check (not ui_enabled or legal_reviewed)
);

create table public.regions (
  id text primary key,
  country_code char(2) not null,
  parent_id text references public.regions(id),
  name text not null,
  timezone text not null default 'Asia/Ho_Chi_Minh'
);

create table public.legal_documents (
  doc_key text not null check (doc_key in ('terms','privacy','community','safety','points','contributor_license','location','translation')),
  version text not null,
  locale text not null references public.languages(code),
  title text not null,
  body_md text not null,
  required boolean not null default true,
  published_at timestamptz,
  primary key (doc_key, version, locale)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 1000),
  avatar_url text,
  home_region_id text references public.regions(id),
  ui_locale text not null default 'vi' references public.languages(code),
  orientation_score smallint not null default 50 check (orientation_score between 0 and 100),
  meet_modes text[] not null default array['in_person','online']::text[],
  discoverable boolean not null default false,
  onboarding_step text not null default 'language',
  account_status text not null default 'active' check (account_status in ('active','paused','suspended','deleting')),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_year smallint check (birth_year between 1900 and 2100),
  adult_confirmed_at timestamptz,
  gender text check (gender in ('female','male','non_binary','self_described')),
  gender_self_described text check (char_length(gender_self_described) <= 40),
  meet_preference text not null default 'any' check (meet_preference in ('any','same_gender')),
  emergency_contact_note text check (char_length(emergency_contact_note) <= 200),
  phone_verified_at timestamptz,
  identity_verified_at timestamptz
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','moderator','content_reviewer','verifier')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  doc_key text not null,
  version text not null,
  locale text not null,
  granted boolean not null,
  created_at timestamptz not null default now(),
  foreign key (doc_key, version, locale) references public.legal_documents(doc_key, version, locale)
);
create index consents_user_idx on public.consents(user_id, doc_key, created_at desc);

create table public.profile_languages (
  user_id uuid not null references public.profiles(id) on delete cascade,
  language_code text not null references public.languages(code),
  level text not null check (level in ('native','fluent','conversational','learning')),
  can_help_practice boolean not null default false,
  wants_practice boolean not null default false,
  primary key (user_id, language_code)
);

-- Năng lực: học vấn, nghề, kỹ năng, sáng tạo, vai trò cộng đồng, ảnh hưởng.
-- Chỉ để giới thiệu và chọn chủ đề, không cộng điểm matching.
create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('education','occupation','skill','craft','creative_work','community_role','influence')),
  title text not null check (char_length(title) between 2 and 120),
  organization text check (char_length(organization) <= 120),
  years_experience smallint check (years_experience between 0 and 80),
  evidence_url text,
  verification text not null default 'self_declared' check (verification in ('self_declared','peer_confirmed','hub_verified')),
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index capabilities_user_idx on public.capabilities(user_id);

-- Năm câu trả lời 1-5 về mức quan tâm tới giá trị tri thức khi đi lại.
create table public.knowledge_orientation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  learn_on_trips smallint not null check (learn_on_trips between 1 and 5),
  ask_locals smallint not null check (ask_locals between 1 and 5),
  share_what_i_know smallint not null check (share_what_i_know between 1 and 5),
  write_things_down smallint not null check (write_things_down between 1 and 5),
  respect_local_rules smallint not null check (respect_local_rules between 1 and 5),
  preferred_depth text not null default 'medium' check (preferred_depth in ('short','medium','deep')),
  updated_at timestamptz not null default now()
);

create table public.topic_domains (
  id text primary key,
  sort_order int not null default 100,
  name_vi text not null,
  name_en text not null
);
create table public.topics (
  id text primary key,
  domain_id text not null references public.topic_domains(id),
  name_vi text not null,
  name_en text not null,
  sensitive boolean not null default false,
  active boolean not null default true
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null references public.topics(id),
  depth text not null default 'medium' check (depth in ('short','medium','deep')),
  formats text[] not null default array['conversation']::text[]
    check (formats <@ array['conversation','language_practice','demonstration','co_writing','walk_together','online_call']::text[]),
  note text check (char_length(note) <= 300),
  unique (user_id, topic_id)
);
create table public.seeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text references public.topics(id),
  language_code text references public.languages(code),
  depth text not null default 'medium' check (depth in ('short','medium','deep')),
  importance smallint not null default 2 check (importance between 1 and 3),
  note text check (char_length(note) <= 300),
  check ((topic_id is null) <> (language_code is null))
);
create unique index seeks_unique_topic on public.seeks(user_id, topic_id) where topic_id is not null;
create unique index seeks_unique_language on public.seeks(user_id, language_code) where language_code is not null;

create table public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nearby_enabled boolean not null default false,
  quiet_start time not null default '21:00',
  quiet_end time not null default '08:00',
  muted_hub_ids uuid[] not null default '{}',
  messages_enabled boolean not null default true
);
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.profile_private(user_id) values (new.id);
  insert into public.notification_prefs(user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_role(p_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = p_role)
$$;
create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.has_role('admin') $$;

-- Người dùng chỉ được kết nối, đóng góp, đăng ký Hub sau khi Admin đã duyệt danh tính.
create or replace function public.is_verified(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profile_private pp join profiles p on p.id = pp.user_id
    where pp.user_id = p_user and pp.adult_confirmed_at is not null and pp.identity_verified_at is not null and p.account_status = 'active')
$$;

create or replace function public.audit(p_action text, p_entity text, p_id text, p_detail jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into admin_audit_log(actor_id, action, entity, entity_id, detail) values (auth.uid(), p_action, p_entity, p_id, p_detail)
$$;

-- Nhận ngày sinh đầy đủ để kiểm tra 18 tuổi ở máy chủ, nhưng chỉ lưu năm sinh.
create or replace function public.complete_basics(
  p_display_name text, p_birth_date date, p_home_region text default null,
  p_gender text default null, p_gender_text text default null, p_meet_preference text default 'any'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_birth_date > (current_date - interval '18 years')::date then raise exception 'must_be_18'; end if;
  if char_length(trim(p_display_name)) < 2 then raise exception 'name_too_short'; end if;
  if p_meet_preference = 'same_gender' and p_gender is null then raise exception 'gender_required_for_preference'; end if;
  update profiles set display_name = trim(p_display_name), home_region_id = p_home_region where id = auth.uid();
  update profile_private set birth_year = extract(year from p_birth_date)::smallint, adult_confirmed_at = now(),
    gender = p_gender, gender_self_described = p_gender_text, meet_preference = p_meet_preference
  where user_id = auth.uid();
end $$;

create or replace function public.record_consent(p_doc text, p_version text, p_locale text, p_granted boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into consents(user_id, doc_key, version, locale, granted) values (auth.uid(), p_doc, p_version, p_locale, p_granted);
end $$;

create or replace function public.save_orientation(a smallint, b smallint, c smallint, d smallint, e smallint, p_depth text)
returns smallint language plpgsql security definer set search_path = public as $$
declare v_score smallint := round((a+b+c+d+e-5)::numeric / 20 * 100);
begin
  insert into knowledge_orientation values (auth.uid(), a,b,c,d,e,p_depth, now())
  on conflict (user_id) do update set learn_on_trips=a, ask_locals=b, share_what_i_know=c, write_things_down=d, respect_local_rules=e, preferred_depth=p_depth, updated_at=now();
  update profiles set orientation_score = v_score where id = auth.uid();
  return v_score;
end $$;

create or replace function public.request_account_deletion() returns void
language sql security definer set search_path = public as $$
  update profiles set account_status='deleting', discoverable=false where id = auth.uid()
$$;
