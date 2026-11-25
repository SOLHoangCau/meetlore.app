-- Sổ TriGiao (Hub Knowledge), Giờ tri thức, điểm đóng góp và ưu đãi đối tác.
-- 100 điểm = 1 Giờ tri thức. Điểm không có giá trị tiền mặt, không nạp, không rút, không chuyển cho người khác.

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  kind text not null default 'knowledge_note' check (kind in ('knowledge_note','source_material','translation_review','hub_correction')),
  topic_id text references public.topics(id),
  status text not null default 'draft' check (status in ('draft','awaiting_coauthors','submitted','changes_requested','published','rejected','hidden')),
  source_locale text not null references public.languages(code),
  meetup_id uuid references public.meetups(id) on delete set null,
  community_knowledge boolean not null default false,
  community_consent_by text,
  source_note text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint community_needs_consent check (status <> 'published' or not community_knowledge or community_consent_by is not null)
);
create index knowledge_hub_idx on public.knowledge_items(hub_id, status);

create table public.knowledge_translations (
  item_id uuid not null references public.knowledge_items(id) on delete cascade,
  locale text not null references public.languages(code),
  title text not null check (char_length(title) between 3 and 140),
  body_md text not null check (char_length(body_md) between 20 and 20000),
  machine_translated boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  primary key (item_id, locale)
);

create table public.knowledge_contributors (
  item_id uuid not null references public.knowledge_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_percent smallint not null check (share_percent between 1 and 100),
  credit_name text,
  anonymous boolean not null default false,
  credit_to text not null default 'self' check (credit_to in ('self','community_fund')),
  license_version text,
  accepted_at timestamptz,
  primary key (item_id, user_id)
);

create table public.knowledge_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.knowledge_items(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('approved','changes_requested','rejected')),
  effort_hours numeric(4,2),
  accuracy smallint check (accuracy between 0 and 2),
  originality smallint check (originality between 0 and 2),
  usefulness smallint check (usefulness between 0 and 2),
  clarity smallint check (clarity between 0 and 2),
  sourcing smallint check (sourcing between 0 and 2),
  rarity text check (rarity in ('common','thin','missing')),
  provenance text check (provenance in ('secondary','firsthand','verified')),
  points_awarded int,
  note text,
  created_at timestamptz not null default now()
);

create table public.point_ledger (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  fund_hub_id uuid references public.hubs(id) on delete set null,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('knowledge_approved','clawback','reward_redeemed','reward_refund','fund_donation','admin_adjustment')),
  item_id uuid references public.knowledge_items(id) on delete set null,
  redemption_id uuid,
  available_at timestamptz not null default now(),
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (not (user_id is not null and fund_hub_id is not null))
);
create index point_ledger_user on public.point_ledger(user_id, available_at);

-- Sổ điểm chỉ ghi thêm. Ngoại lệ duy nhất: khóa ngoại tự về NULL khi tài khoản hoặc nội dung bị xóa.
create or replace function public.ledger_append_only() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and new.id = old.id and new.delta = old.delta and new.reason = old.reason and new.created_at = old.created_at
     and new.available_at = old.available_at and new.expires_at is not distinct from old.expires_at
     and (new.user_id is not distinct from old.user_id or new.user_id is null)
     and (new.fund_hub_id is not distinct from old.fund_hub_id or new.fund_hub_id is null)
     and (new.item_id is not distinct from old.item_id or new.item_id is null)
     and new.redemption_id is not distinct from old.redemption_id
  then return new; end if;
  raise exception 'point_ledger_is_append_only';
end $$;
create trigger ledger_no_update before update or delete on public.point_ledger
  for each row execute function public.ledger_append_only();

create table public.reward_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('food','lodging','transport','culture')),
  region_id text references public.regions(id),
  agreement_status text not null default 'talking' check (agreement_status in ('talking','signed','ended')),
  active boolean not null default false
);
create table public.reward_partner_staff (
  partner_id uuid not null references public.reward_partners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (partner_id, user_id)
);
create table public.reward_offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.reward_partners(id) on delete cascade,
  title_vi text not null,
  title_en text not null,
  terms_vi text,
  terms_en text,
  point_cost int not null check (point_cost > 0),
  monthly_quota int not null default 20 check (monthly_quota > 0),
  valid_days int not null default 30 check (valid_days between 1 and 180),
  active boolean not null default false
);
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.reward_offers(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  status text not null default 'issued' check (status in ('issued','used','expired','cancelled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null
);

create table public.platform_flags (
  key text primary key,
  enabled boolean not null default false,
  note text
);
insert into public.platform_flags values
  ('points_redemption', true, 'Theo quyết định v0.1 mục 5: điểm đổi ưu đãi do đối tác tài trợ'),
  ('expert_hours_redemption', false, 'Ngoài phạm vi v0.1: Giờ tri thức chỉ để hiển thị, chưa đổi lấy buổi học'),
  ('walk_together', false, 'Ngoài phạm vi v0.1: không có mục dẫn tham quan');

-- Bản SQL của calcPoints. Kiểm tra chéo bằng supabase/tests/points-vectors.json.
create or replace function public.calc_knowledge_points(p_kind text, p_effort numeric, a int, o int, u int, c int, s int, p_rarity text, p_prov text)
returns int language plpgsql immutable as $$
declare v_total int := a+o+u+c+s; v_max numeric; v_q numeric; v_r numeric; v_p numeric;
begin
  if p_effort not in (0.25,0.5,1,2,4) then raise exception 'invalid_effort'; end if;
  if a = 0 or s = 0 or v_total < 5 then return null; end if;
  v_max := case p_kind when 'knowledge_note' then 4 when 'source_material' then 2 when 'translation_review' then 1 when 'hub_correction' then 0.5 end;
  v_q := case when v_total >= 10 then 1.5 when v_total >= 9 then 1.25 when v_total >= 7 then 1 else 0.75 end;
  v_r := case p_rarity when 'common' then 1 when 'thin' then 1.2 when 'missing' then 1.5 end;
  v_p := case p_prov when 'secondary' then 1 when 'firsthand' then 1.1 when 'verified' then 1.25 end;
  return least(600, round(100 * least(p_effort, v_max) * v_q * v_r * v_p));
end $$;

-- Mỗi khoản trừ chỉ dùng điểm đã đủ 30 ngày và còn hạn tại thời điểm trừ, ưu tiên khoản sắp hết hạn.
-- Thu hồi một bài trừ thẳng vào chính điểm của bài đó, kể cả khi điểm còn đang chờ.
create or replace function public.point_balance(p_user uuid default auth.uid())
returns table(available int, pending int, knowledge_hours numeric, earned_total int)
language plpgsql stable security definer set search_path = public as $$
declare
  e point_ledger[]; bal int[]; s record; v_left int; v_use int; i int; v_debt int := 0;
  v_avail int := 0; v_pending int := 0; v_earned int := 0;
begin
  if p_user <> auth.uid() and not has_role('admin') then raise exception 'forbidden'; end if;
  select coalesce(array_agg(l order by l.expires_at nulls last, l.id), '{}') into e from point_ledger l where l.user_id = p_user and l.delta > 0;
  select coalesce(array_agg(l.delta order by l.expires_at nulls last, l.id), '{}') into bal from point_ledger l where l.user_id = p_user and l.delta > 0;
  for s in select * from point_ledger l where l.user_id = p_user and l.delta < 0 order by l.created_at, l.id loop
    v_left := -s.delta;
    for i in 1 .. coalesce(array_length(e,1),0) loop
      exit when v_left = 0;
      if s.reason = 'clawback' and e[i].item_id is not distinct from s.item_id then
        v_use := least(v_left, bal[i]); bal[i] := bal[i] - v_use; v_left := v_left - v_use;
      end if;
    end loop;
    for i in 1 .. coalesce(array_length(e,1),0) loop
      exit when v_left = 0;
      if e[i].available_at <= s.created_at and (e[i].expires_at is null or e[i].expires_at > s.created_at) then
        v_use := least(v_left, bal[i]); bal[i] := bal[i] - v_use; v_left := v_left - v_use;
      end if;
    end loop;
    v_debt := v_debt + v_left;
  end loop;
  for i in 1 .. coalesce(array_length(e,1),0) loop
    v_earned := v_earned + bal[i];
    if e[i].available_at > now() then v_pending := v_pending + bal[i];
    elsif e[i].expires_at is null or e[i].expires_at > now() then v_avail := v_avail + bal[i]; end if;
  end loop;
  return query select greatest(v_avail - v_debt, 0), v_pending, round(greatest(v_earned,0) / 100.0, 2), v_earned;
end $$;

create or replace function public.submit_knowledge(p_hub uuid, p_kind text, p_topic text, p_locale text, p_title text, p_body text,
  p_coauthors uuid[] default '{}', p_community boolean default false, p_consent_by text default null, p_source text default null, p_license text default '1')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_n int := 1 + coalesce(array_length(p_coauthors,1),0); v_share int := floor(100 / v_n); v_u uuid; v_first boolean := true;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  insert into knowledge_items(hub_id, kind, topic_id, status, source_locale, community_knowledge, community_consent_by, source_note, created_by)
    values (p_hub, p_kind, p_topic, case when v_n > 1 then 'awaiting_coauthors' else 'submitted' end, p_locale, p_community, p_consent_by, p_source, auth.uid()) returning id into v_id;
  insert into knowledge_translations(item_id, locale, title, body_md) values (v_id, p_locale, p_title, p_body);
  insert into knowledge_contributors(item_id, user_id, share_percent, license_version, accepted_at, credit_to)
    values (v_id, auth.uid(), 100 - v_share * (v_n - 1), p_license, now(), case when p_community then 'community_fund' else 'self' end);
  foreach v_u in array p_coauthors loop
    if are_blocked(auth.uid(), v_u) then raise exception 'blocked'; end if;
    insert into knowledge_contributors(item_id, user_id, share_percent) values (v_id, v_u, v_share);
  end loop;
  return v_id;
end $$;

create or replace function public.accept_coauthorship(p_item uuid, p_license text default '1') returns text
language plpgsql security definer set search_path = public as $$
begin
  update knowledge_contributors set accepted_at = now(), license_version = p_license where item_id = p_item and user_id = auth.uid();
  if not found then raise exception 'not_contributor'; end if;
  update knowledge_items set status = 'submitted' where id = p_item and status = 'awaiting_coauthors'
    and not exists (select 1 from knowledge_contributors where item_id = p_item and accepted_at is null);
  return (select status from knowledge_items where id = p_item);
end $$;

create or replace function public.review_knowledge(p_item uuid, p_decision text, p_effort numeric default null,
  a int default null, o int default null, u int default null, c int default null, s int default null,
  p_rarity text default null, p_prov text default null, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v knowledge_items; v_points int := 0; r record; v_rest int; v_part int; v_month int; v_given int := 0; v_n int; v_i int := 0;
begin
  if not (has_role('admin') or has_role('content_reviewer')) then raise exception 'forbidden'; end if;
  select * into v from knowledge_items where id = p_item for update;
  if not found or v.status not in ('submitted','changes_requested') then raise exception 'item_not_reviewable'; end if;
  if exists (select 1 from knowledge_contributors where item_id = p_item and user_id = auth.uid()) then raise exception 'cannot_review_own'; end if;
  if p_decision = 'approved' then
    if exists (select 1 from knowledge_contributors where item_id = p_item and accepted_at is null) then raise exception 'coauthor_pending'; end if;
    v_points := calc_knowledge_points(v.kind, p_effort, a,o,u,c,s, p_rarity, p_prov);
    if v_points is null then raise exception 'quality_below_threshold'; end if;
    update knowledge_items set status='published', published_at=now() where id = p_item;
    select count(*) into v_n from knowledge_contributors where item_id = p_item;
    v_rest := v_points;
    for r in select * from knowledge_contributors where item_id = p_item order by share_percent desc, user_id loop
      v_i := v_i + 1;
      v_part := case when v_i = v_n then v_rest else floor(v_points * r.share_percent / 100.0)::int end;
      v_rest := v_rest - v_part;
      if r.credit_to = 'community_fund' then
        if v_part > 0 then insert into point_ledger(fund_hub_id, delta, reason, item_id) values (v.hub_id, v_part, 'knowledge_approved', p_item); end if;
      else
        select coalesce(sum(delta),0) into v_month from point_ledger
          where user_id = r.user_id and reason in ('knowledge_approved','session_shared') and delta > 0 and created_at >= date_trunc('month', now());
        v_part := greatest(0, least(v_part, coalesce((select value from platform_settings where key='monthly_point_cap'),1200) - v_month));
        if v_part > 0 then
          insert into point_ledger(user_id, delta, reason, item_id, available_at, expires_at)
            values (r.user_id, v_part, 'knowledge_approved', p_item, now() + interval '30 days', now() + interval '30 days' + interval '24 months');
        end if;
      end if;
      v_given := v_given + v_part;
    end loop;
  elsif p_decision = 'changes_requested' then update knowledge_items set status='changes_requested' where id=p_item;
  elsif p_decision = 'rejected' then update knowledge_items set status='rejected' where id=p_item;
  else raise exception 'bad_decision'; end if;
  insert into knowledge_reviews(item_id, reviewer_id, decision, effort_hours, accuracy, originality, usefulness, clarity, sourcing, rarity, provenance, points_awarded, note)
    values (p_item, auth.uid(), p_decision, p_effort, a,o,u,c,s, p_rarity, p_prov, v_given, p_note);
  perform audit('knowledge.'||p_decision, 'knowledge_items', p_item::text, jsonb_build_object('points', v_given));
  return v_given;
end $$;

create or replace function public.hide_knowledge(p_item uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_taken int;
begin
  if not (has_role('admin') or has_role('content_reviewer')) then raise exception 'forbidden'; end if;
  update knowledge_items set status='hidden' where id=p_item;
  for r in select user_id, sum(delta)::int amount from point_ledger where item_id=p_item and user_id is not null group by user_id having sum(delta) > 0 loop
    insert into point_ledger(user_id, delta, reason, item_id, note) values (r.user_id, -r.amount, 'clawback', p_item, p_reason);
  end loop;
  perform audit('knowledge.hidden','knowledge_items',p_item::text, jsonb_build_object('reason',p_reason));
end $$;

create or replace function public.donate_points(p_hub uuid, p_points int) returns void
language plpgsql security definer set search_path = public as $$
declare v_avail int;
begin
  if p_points <= 0 then raise exception 'bad_amount'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select available into v_avail from point_balance(auth.uid());
  if v_avail < p_points then raise exception 'insufficient_points'; end if;
  insert into point_ledger(user_id, delta, reason) values (auth.uid(), -p_points, 'fund_donation');
  insert into point_ledger(fund_hub_id, delta, reason) values (p_hub, p_points, 'fund_donation');
end $$;

create or replace function public.redeem_reward(p_offer uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v reward_offers; v_avail int; v_used int; v_id uuid; v_code text;
begin
  if not coalesce((select enabled from platform_flags where key='points_redemption'), false) then raise exception 'redemption_disabled'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select o.* into v from reward_offers o join reward_partners p on p.id=o.partner_id
    where o.id=p_offer and o.active and p.active and p.agreement_status='signed' for update of o;
  if not found then raise exception 'offer_unavailable'; end if;
  select count(*) into v_used from reward_redemptions where offer_id=p_offer and issued_at >= date_trunc('month',now()) and status <> 'cancelled';
  if v_used >= v.monthly_quota then raise exception 'quota_reached'; end if;
  select available into v_avail from point_balance(auth.uid());
  if v_avail < v.point_cost then raise exception 'insufficient_points'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into reward_redemptions(offer_id,user_id,code,expires_at) values (p_offer,auth.uid(),v_code,now()+make_interval(days=>v.valid_days)) returning id into v_id;
  insert into point_ledger(user_id,delta,reason,redemption_id) values (auth.uid(),-v.point_cost,'reward_redeemed',v_id);
  return v_code;
end $$;

create or replace function public.confirm_redemption(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare v reward_redemptions;
begin
  select r.* into v from reward_redemptions r join reward_offers o on o.id=r.offer_id
    join reward_partner_staff s on s.partner_id=o.partner_id and s.user_id=auth.uid()
    where r.code=p_code for update of r;
  if not found then raise exception 'code_not_found'; end if;
  if v.status<>'issued' or v.expires_at<now() then raise exception 'code_not_usable'; end if;
  update reward_redemptions set status='used',used_at=now(),confirmed_by=auth.uid() where id=v.id;
end $$;

-- Điều kiện kích hoạt Hub.
create or replace function public.hub_activation_status(p_hub uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'operator', (select count(*) from hub_operators where hub_id=p_hub) >= 1,
    'locals', (select count(*) from hub_members where hub_id=p_hub and status='ready') >= 10,
    'knowledge', (select count(*) from knowledge_items where hub_id=p_hub and status='published') >= 5,
    'notify_ios', h.notify_tested_ios, 'notify_android', h.notify_tested_android,
    'safety_contact', h.safety_contact is not null
  ) from hubs h where h.id=p_hub
$$;

create or replace function public.enforce_hub_activation() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb; k text;
begin
  if new.status='active' and old.status is distinct from 'active' then
    v := hub_activation_status(new.id);
    for k in select jsonb_object_keys(v) loop
      if not (v->>k)::boolean then raise exception 'hub_not_ready: %', k; end if;
    end loop;
  end if;
  return new;
end $$;
create trigger hub_activation_guard before update of status on public.hubs for each row execute function public.enforce_hub_activation();
