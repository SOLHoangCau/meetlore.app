-- Dữ liệu để chọn và mở Hub mới ở Việt Nam, Đông Nam Á, châu Á.

create table public.expansion_countries (
  code char(2) primary key,
  name_vi text not null,
  name_en text not null,
  wave smallint not null check (wave between 1 and 5),
  intl_arrivals_m numeric(6,1),
  arrivals_year smallint,
  arrivals_source text,
  primary_languages text[] not null default '{}',
  needs_local_entity text not null default 'unknown' check (needs_local_entity in ('unknown','no','yes')),
  data_law_review text not null default 'not_started' check (data_law_review in ('not_started','in_progress','cleared','blocked')),
  guide_rule_review text not null default 'not_started' check (guide_rule_review in ('not_started','in_progress','cleared','blocked')),
  travel_safety_status text not null default 'review' check (travel_safety_status in ('review','ok','hold')),
  note text
);

create table public.destinations (
  id text primary key,
  country_code char(2) not null references public.expansion_countries(code),
  name text not null,
  admin_area text,
  lat double precision,
  lng double precision,
  wave smallint not null check (wave between 1 and 5),
  thesis text,
  total_visitors_m numeric(6,1),
  intl_visitors_m numeric(6,1),
  metric_period text,
  metric_source text,
  universities_count int,
  language_clubs_count int,
  craft_villages_count int,
  connectivity text check (connectivity in ('good','mixed','weak')),
  seasonality jsonb not null default '{}'
);

create table public.hub_candidates (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null references public.destinations(id) on delete cascade,
  name text not null,
  category text not null check (category in ('heritage','museum','village','market','university','library','park','cafe_culture','craft_workshop','community_house','transport_node')),
  lat double precision,
  lng double precision,
  proposed_level text not null default 'open' check (proposed_level in ('open','partner','beacon')),
  manager_name text,
  manager_contact text,
  stage text not null default 'idea' check (stage in ('idea','desk_review','field_review','partner_talks','approved','rejected','converted')),
  demand smallint check (demand between 0 and 5),
  knowledge smallint check (knowledge between 0 and 5),
  local_supply smallint check (local_supply between 0 and 5),
  meet_safety smallint check (meet_safety between 0 and 5),
  partner_access smallint check (partner_access between 0 and 5),
  feasibility smallint check (feasibility between 0 and 5),
  priority_score numeric(5,1) generated always as (
    (demand*25 + knowledge*20 + local_supply*20 + meet_safety*15 + partner_access*10 + feasibility*10) / 5.0
  ) stored,
  gate_legal boolean not null default false,
  gate_community boolean not null default false,
  gate_safety boolean not null default false,
  evidence jsonb not null default '[]',
  converted_hub_id uuid references public.hubs(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (destination_id, name)
);

-- Người dùng đề nghị mở Hub: tín hiệu nhu cầu từ chính cộng đồng.
create table public.hub_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_id text references public.destinations(id) on delete set null,
  place_text text not null check (char_length(place_text) between 2 and 120),
  role text not null check (role in ('local','traveler')),
  topic_id text references public.topics(id),
  willing_to_host boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tổng hợp cho Admin; ẩn nhóm dưới 5 người.
create or replace function public.expansion_demand()
returns table(place text, destination_id text, locals int, travelers int, hosts int)
language sql stable security definer set search_path = public as $$
  select lower(trim(place_text)), max(destination_id),
    count(distinct user_id) filter (where role='local')::int,
    count(distinct user_id) filter (where role='traveler')::int,
    count(distinct user_id) filter (where willing_to_host)::int
  from hub_requests where public.has_role('admin')
  group by 1 having count(distinct user_id) >= 5 order by 3 desc, 4 desc
$$;

create or replace function public.convert_candidate(p_candidate uuid, p_slug text, p_region text, p_radius int, p_locale text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c hub_candidates; v_hub uuid;
begin
  if not has_role('admin') then raise exception 'forbidden'; end if;
  select * into c from hub_candidates where id=p_candidate for update;
  if not found then raise exception 'candidate_not_found'; end if;
  if not (c.gate_legal and c.gate_community and c.gate_safety) then raise exception 'gates_not_passed'; end if;
  if coalesce(c.priority_score,0) < 60 then raise exception 'score_below_threshold'; end if;
  if c.lat is null or c.lng is null then raise exception 'location_required'; end if;
  insert into hubs(slug,region_id,level,status,lat,lng,radius_m) values (p_slug,p_region,c.proposed_level,'preparing',c.lat,c.lng,p_radius) returning id into v_hub;
  insert into hub_translations(hub_id,locale,name) values (v_hub,p_locale,p_name);
  update hub_candidates set stage='converted', converted_hub_id=v_hub, updated_at=now() where id=p_candidate;
  perform audit('hub.created_from_candidate','hubs',v_hub::text,jsonb_build_object('candidate',p_candidate));
  return v_hub;
end $$;
