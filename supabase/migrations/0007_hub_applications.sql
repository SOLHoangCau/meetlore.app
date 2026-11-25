-- Cơ sở lưu trú, quán cà phê, hàng quán, câu lạc bộ cộng đồng, nhà văn hóa đăng ký trở thành Hub.
-- Đăng ký miễn phí. Không có chỗ để trả tiền lấy thứ hạng hay lấy gợi ý.

alter table public.hubs add column venue_type text not null default 'public_space'
  check (venue_type in ('public_space','heritage','lodging','cafe','eatery','community_club','culture_house'));
update public.hubs set venue_type = 'heritage' where slug in ('van-mieu');

create table public.hub_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  venue_type text not null check (venue_type in ('lodging','cafe','eatery','community_club','culture_house')),
  venue_name text not null check (char_length(venue_name) between 2 and 120),
  description text check (char_length(description) <= 1000),
  address text not null check (char_length(address) between 5 and 240),
  region_id text references public.regions(id),
  region_text text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  legal_name text,
  registration_no text,
  authority_role text not null check (authority_role in ('owner','manager','authorized','club_lead','institution_staff')),
  proof_paths text[] not null default '{}',
  photo_paths text[] not null default '{}',
  open_hours text,
  capacity smallint check (capacity between 1 and 5000),
  languages text[] not null default '{}',
  topic_ids text[] not null default '{}',
  hosting_idea text check (char_length(hosting_idea) <= 600),
  has_public_seating boolean not null default false,
  open_to_non_guests boolean not null default false,
  no_purchase_required boolean not null default false,
  staff_on_site boolean not null default false,
  accepts_rules boolean not null default false,
  wants_reward_partner boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','needs_info','site_check','approved','rejected')),
  reviewer_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  hub_id uuid references public.hubs(id) on delete set null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index hub_applications_status on public.hub_applications(status, submitted_at);
alter table public.hub_applications enable row level security;

create policy ha_owner_read on hub_applications for select to authenticated using (applicant_id = auth.uid() or is_admin());
create policy ha_owner_insert on hub_applications for insert to authenticated with check (applicant_id = auth.uid() and status = 'draft');
create policy ha_owner_edit on hub_applications for update to authenticated
  using (applicant_id = auth.uid() and status in ('draft','needs_info'))
  with check (applicant_id = auth.uid() and status in ('draft','needs_info'));

create or replace function public.distance_m(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(power(sin(radians(b_lat-a_lat)/2),2) + cos(radians(a_lat))*cos(radians(b_lat))*power(sin(radians(b_lng-a_lng)/2),2)))
$$;

create or replace function public.submit_hub_application(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare a hub_applications;
begin
  select * into a from hub_applications where id = p_id and applicant_id = auth.uid() for update;
  if not found or a.status not in ('draft','needs_info') then raise exception 'application_not_editable'; end if;
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  if not a.accepts_rules then raise exception 'rules_required'; end if;
  if not a.has_public_seating or not a.open_to_non_guests then raise exception 'public_space_required'; end if;
  if a.lat is null or a.lng is null then raise exception 'location_required'; end if;
  if a.venue_type in ('lodging','cafe','eatery') and coalesce(a.registration_no,'') = '' then raise exception 'registration_required'; end if;
  update hub_applications set status='submitted', submitted_at=now() where id=p_id;
  return 'submitted';
end $$;

-- Hub đang có trong bán kính 300 m, để Admin tránh mở chồng lấn.
create or replace function public.application_nearby_hubs(p_id uuid)
returns table(hub_id uuid, slug text, distance_meters int)
language sql stable security definer set search_path = public as $$
  select h.id, h.slug, round(distance_m(a.lat,a.lng,h.lat,h.lng))::int
  from hub_applications a join hubs h on h.status <> 'retired'
  where a.id = p_id and has_role('admin') and distance_m(a.lat,a.lng,h.lat,h.lng) <= 300
  order by 3
$$;

create or replace function public.review_hub_application(p_id uuid, p_decision text, p_note text default null,
  p_slug text default null, p_region text default null, p_radius int default 150)
returns uuid language plpgsql security definer set search_path = public as $$
declare a hub_applications; v_hub uuid; v_partner_type text;
begin
  if not has_role('admin') then raise exception 'forbidden'; end if;
  select * into a from hub_applications where id=p_id for update;
  if not found or a.status not in ('submitted','site_check','needs_info') then raise exception 'application_not_reviewable'; end if;
  if a.applicant_id = auth.uid() then raise exception 'cannot_review_own'; end if;
  if p_decision in ('needs_info','site_check','rejected') then
    update hub_applications set status=p_decision, reviewer_note=p_note, reviewed_by=auth.uid() where id=p_id;
  elsif p_decision = 'approved' then
    if a.status <> 'site_check' then raise exception 'site_check_required'; end if;
    insert into hubs(slug,region_id,level,status,lat,lng,radius_m,venue_type)
      values (p_slug,coalesce(p_region,a.region_id),'partner','preparing',a.lat,a.lng,p_radius,a.venue_type) returning id into v_hub;
    insert into hub_translations(hub_id,locale,name,summary,meeting_point) values (v_hub,'vi',a.venue_name,a.description,a.address);
    insert into hub_operators(hub_id,user_id,role) values (v_hub,a.applicant_id,'operator');
    insert into hub_topics select v_hub, t from unnest(a.topic_ids) t where exists (select 1 from topics where id=t);
    v_partner_type := case a.venue_type when 'lodging' then 'homestay' when 'cafe' then 'cafe' when 'eatery' then 'cafe' when 'community_club' then 'community' else 'culture_space' end;
    insert into hub_partners(hub_id,name,partner_type,agreement_status) values (v_hub,coalesce(a.legal_name,a.venue_name),v_partner_type,'talking');
    if a.wants_reward_partner and a.venue_type in ('lodging','cafe','eatery') then
      insert into reward_partners(name,category,region_id,agreement_status,active)
        values (a.venue_name, case a.venue_type when 'lodging' then 'lodging' else 'food' end, coalesce(p_region,a.region_id),'talking',false);
    end if;
    update hub_applications set status='approved', reviewer_note=p_note, reviewed_by=auth.uid(), hub_id=v_hub where id=p_id;
  else raise exception 'bad_decision'; end if;
  perform audit('hub_application.'||p_decision,'hub_applications',p_id::text,jsonb_build_object('hub',v_hub));
  return v_hub;
end $$;

-- Chỉ Admin được chuyển Hub sang trạng thái hoạt động; người phụ trách cơ sở không tự kích hoạt.
create or replace function public.enforce_hub_activation() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb; k text;
begin
  if new.status='active' and old.status is distinct from 'active' then
    if auth.uid() is not null and not has_role('admin') then raise exception 'admin_required'; end if;
    v := hub_activation_status(new.id);
    for k in select jsonb_object_keys(v) loop
      if not (v->>k)::boolean then raise exception 'hub_not_ready: %', k; end if;
    end loop;
  end if;
  return new;
end $$;

revoke all on function public.distance_m(double precision,double precision,double precision,double precision) from public, anon;
do $$ declare f text; begin
  foreach f in array array['submit_hub_application(uuid)','application_nearby_hubs(uuid)','review_hub_application(uuid,text,text,text,text,int)','enforce_hub_activation()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
