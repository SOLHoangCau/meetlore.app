-- Hub, người phụ trách, điều kiện kích hoạt, mặt có mặt do người dùng chủ động bật.
-- Không có bảng nào lưu vết GPS. Máy chủ chỉ biết Hub khi người dùng tự check-in.

create table public.hubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  region_id text not null references public.regions(id),
  level text not null default 'open' check (level in ('open','partner','beacon')),
  status text not null default 'preparing' check (status in ('draft','preparing','active','paused','retired')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  radius_m int not null default 200 check (radius_m between 150 and 2000),
  recruit_mode text not null default 'invite_code' check (recruit_mode in ('invite_code','open_review','ambassador')),
  allow_walk_together boolean not null default false,
  cover_url text,
  notify_tested_ios boolean not null default false,
  notify_tested_android boolean not null default false,
  safety_contact text,
  created_at timestamptz not null default now()
);
create index hubs_geo_idx on public.hubs(lat, lng) where status = 'active';

create table public.hub_translations (
  hub_id uuid not null references public.hubs(id) on delete cascade,
  locale text not null references public.languages(code),
  name text not null,
  summary text,
  story text,
  meeting_point text,
  conduct_rules text,
  machine_translated boolean not null default false,
  primary key (hub_id, locale)
);

create table public.hub_topics (
  hub_id uuid not null references public.hubs(id) on delete cascade,
  topic_id text not null references public.topics(id),
  primary key (hub_id, topic_id)
);

create table public.hub_partners (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  name text not null,
  partner_type text not null check (partner_type in ('heritage_manager','cafe','culture_space','homestay','university','community','authority')),
  contact_note text,
  agreement_status text not null default 'none' check (agreement_status in ('none','talking','signed','ended')),
  agreement_url text
);

create table public.hub_operators (
  hub_id uuid not null references public.hubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'operator' check (role in ('operator','ambassador','community_liaison')),
  primary key (hub_id, user_id)
);

create table public.hub_members (
  hub_id uuid not null references public.hubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','ready','removed')),
  via_invite text,
  weekdays smallint[] not null default '{0,6}',
  created_at timestamptz not null default now(),
  primary key (hub_id, user_id)
);

create table public.invites (
  code text primary key,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  max_uses int not null default 20 check (max_uses > 0),
  used_count int not null default 0,
  expires_at timestamptz
);

create table public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hub_id uuid references public.hubs(id) on delete cascade,
  destination_text text,
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on and ends_on - starts_on <= 180),
  check (hub_id is not null or destination_text is not null)
);
create index trip_plans_hub_idx on public.trip_plans(hub_id, starts_on, ends_on);

create table public.hub_checkins (
  id bigint generated always as identity primary key,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('qr','notification','manual')),
  created_at timestamptz not null default now()
);

create table public.hub_presence (
  hub_id uuid not null references public.hubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (hub_id, user_id)
);

create or replace function public.is_hub_operator(p_hub uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hub_operators where hub_id = p_hub and user_id = auth.uid() and role in ('operator','community_liaison'))
$$;

create or replace function public.set_presence(p_hub uuid, p_on boolean) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz := now() + interval '2 hours';
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from hubs where id = p_hub and status = 'active') then raise exception 'hub_not_active'; end if;
  if p_on then
    insert into hub_presence values (p_hub, auth.uid(), v_until)
      on conflict (hub_id, user_id) do update set expires_at = v_until;
    insert into hub_checkins(hub_id, user_id, source) values (p_hub, auth.uid(), 'manual');
    return v_until;
  end if;
  delete from hub_presence where hub_id = p_hub and user_id = auth.uid();
  return null;
end $$;

-- Dưới 5 người thì không trả số để không lộ một cá nhân.
create or replace function public.hub_ready_count(p_hub uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when n >= 5 then n end
  from (select count(*)::int n from hub_presence where hub_id = p_hub and expires_at > now()) s
$$;

create or replace function public.redeem_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v invites;
begin
  select * into v from invites where code = p_code for update;
  if not found or (v.expires_at is not null and v.expires_at < now()) or v.used_count >= v.max_uses then raise exception 'invite_invalid'; end if;
  insert into hub_members(hub_id, user_id, status, via_invite) values (v.hub_id, auth.uid(), 'ready', p_code)
    on conflict (hub_id, user_id) do update set status='ready', via_invite=p_code;
  update invites set used_count = used_count + 1 where code = p_code;
  return v.hub_id;
end $$;
