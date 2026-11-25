-- Lời kết nối hai bên đồng ý, trò chuyện, gặp mặt, nhận xét, chặn và báo cáo.

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.are_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() in (a, b) and exists (select 1 from blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;

create or replace function public.can_view_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_id = auth.uid() or public.has_role('admin') or public.has_role('moderator') or exists (
    select 1 from profiles p where p.id = p_id and p.account_status = 'active' and p.discoverable
      and not public.are_blocked(p_id, auth.uid()))
$$;

create table public.match_intents (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  hub_id uuid references public.hubs(id) on delete set null,
  mode text not null default 'in_person' check (mode in ('in_person','online')),
  reason jsonb not null default '{}',
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index match_intents_one_pending on public.match_intents(sender_id, receiver_id) where status = 'pending';
create index match_intents_receiver on public.match_intents(receiver_id, status);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid unique references public.match_intents(id) on delete set null,
  hub_id uuid references public.hubs(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  auto_translate boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user on public.conversation_members(user_id);

create or replace function public.is_member(p_conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = p_conv and user_id = auth.uid())
$$;
create or replace function public.other_member(p_conv uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from conversation_members where conversation_id = p_conv and user_id <> auth.uid() limit 1
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  source_locale text,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

create table public.message_translations (
  message_id uuid not null references public.messages(id) on delete cascade,
  locale text not null,
  body text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, locale)
);

create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  hub_id uuid references public.hubs(id) on delete set null,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes between 15 and 240),
  place_note text check (char_length(place_note) <= 200),
  status text not null default 'proposed' check (status in ('proposed','agreed','completed','cancelled')),
  created_at timestamptz not null default now()
);
create table public.meetup_confirmations (
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage text not null check (stage in ('agreed','happened')),
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id, stage)
);

-- Nhận xét ẩn cho đến khi cả hai đã viết, hoặc sau 14 ngày.
create table public.peer_references (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  felt_safe boolean not null,
  learned_something boolean not null,
  would_meet_again boolean not null,
  body text check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (meetup_id, author_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_message_id uuid references public.messages(id) on delete set null,
  target_knowledge_id uuid,
  hub_id uuid references public.hubs(id) on delete set null,
  category text not null check (category in ('harassment','unsafe_meeting','solicitation','paid_service','fake_profile','minor','misinformation','culture_misuse','other')),
  body text check (char_length(body) <= 2000),
  urgent boolean not null default false,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution text,
  created_at timestamptz not null default now()
);

create or replace function public.send_match_intent(p_receiver uuid, p_hub uuid, p_mode text, p_reason jsonb, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id uuid; v_reverse uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if not is_verified(v_me) then raise exception 'verification_required'; end if;
  if not is_verified(p_receiver) or not exists (select 1 from profiles where id = p_receiver and discoverable)
    then raise exception 'receiver_unavailable'; end if;
  if are_blocked(v_me, p_receiver) then raise exception 'receiver_unavailable'; end if;
  if (select count(*) from match_intents where sender_id = v_me and created_at > now() - interval '1 day') >= 20 then raise exception 'daily_limit'; end if;
  select id into v_reverse from match_intents where sender_id = p_receiver and receiver_id = v_me and status = 'pending';
  if v_reverse is not null then perform respond_match_intent(v_reverse, true); return v_reverse; end if;
  insert into match_intents(sender_id, receiver_id, hub_id, mode, reason, note) values (v_me, p_receiver, p_hub, p_mode, coalesce(p_reason,'{}'), p_note) returning id into v_id;
  return v_id;
end $$;

create or replace function public.respond_match_intent(p_intent uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v match_intents; v_conv uuid;
begin
  select * into v from match_intents where id = p_intent and receiver_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'intent_not_found'; end if;
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  update match_intents set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = p_intent;
  if not p_accept then return null; end if;
  if are_blocked(v.sender_id, v.receiver_id) then raise exception 'receiver_unavailable'; end if;
  insert into conversations(intent_id, hub_id) values (p_intent, v.hub_id) returning id into v_conv;
  insert into conversation_members(conversation_id, user_id) values (v_conv, v.sender_id), (v_conv, v.receiver_id);
  return v_conv;
end $$;

create or replace function public.propose_meetup(p_conv uuid, p_hub uuid, p_starts timestamptz, p_minutes int, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_member(p_conv) then raise exception 'not_member'; end if;
  if not is_verified(auth.uid()) then raise exception 'verification_required'; end if;
  if are_blocked(auth.uid(), other_member(p_conv)) then raise exception 'blocked'; end if;
  if p_hub is null then raise exception 'first_meeting_at_hub'; end if;
  if not exists (select 1 from hubs where id = p_hub and status = 'active') then raise exception 'hub_not_active'; end if;
  insert into meetups(conversation_id, hub_id, proposed_by, starts_at, duration_minutes, place_note)
    values (p_conv, p_hub, auth.uid(), p_starts, p_minutes, p_note) returning id into v_id;
  insert into meetup_confirmations values (v_id, auth.uid(), 'agreed');
  return v_id;
end $$;

create or replace function public.confirm_meetup(p_meetup uuid, p_stage text) returns text
language plpgsql security definer set search_path = public as $$
declare v meetups; v_count int;
begin
  select * into v from meetups where id = p_meetup for update;
  if not found or not is_member(v.conversation_id) then raise exception 'not_member'; end if;
  if p_stage = 'happened' and v.status <> 'agreed' then raise exception 'not_agreed'; end if;
  if p_stage = 'happened' and v.starts_at > now() then raise exception 'not_started'; end if;
  insert into meetup_confirmations values (p_meetup, auth.uid(), p_stage) on conflict do nothing;
  select count(*) into v_count from meetup_confirmations where meetup_id = p_meetup and stage = p_stage;
  if v_count = 2 then
    update meetups set status = case p_stage when 'agreed' then 'agreed' else 'completed' end where id = p_meetup returning status into v.status;
  end if;
  return v.status;
end $$;

create or replace function public.submit_reference(p_meetup uuid, p_safe boolean, p_learned boolean, p_again boolean, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v meetups; v_subject uuid;
begin
  select * into v from meetups where id = p_meetup and status = 'completed';
  if not found or not is_member(v.conversation_id) then raise exception 'meetup_not_completed'; end if;
  v_subject := other_member(v.conversation_id);
  insert into peer_references(meetup_id, author_id, subject_id, felt_safe, learned_something, would_meet_again, body)
    values (p_meetup, auth.uid(), v_subject, p_safe, p_learned, p_again, p_body);
  if not p_safe then
    insert into reports(reporter_id, target_user_id, hub_id, category, body, urgent)
      values (auth.uid(), v_subject, v.hub_id, 'unsafe_meeting', 'Tự động tạo từ nhận xét sau buổi gặp', true);
  end if;
end $$;

create or replace function public.reference_visible(p_meetup uuid, p_subject uuid, p_created timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select p_created < now() - interval '14 days'
    or exists (select 1 from peer_references o where o.meetup_id = p_meetup and o.author_id = p_subject)
$$;

-- Uy tín: không đổi được thành ưu đãi. "Giờ đã chia sẻ" chỉ tính buổi gặp hai bên cùng xác nhận.
create or replace function public.reputation(p_user uuid) returns table(meetups_completed int, hours_shared numeric, learned_yes int, safe_yes int, references_count int)
language sql stable security definer set search_path = public as $$
  with m as (
    select me.id, me.duration_minutes from meetups me join conversation_members c on c.conversation_id = me.conversation_id
    where c.user_id = p_user and me.status = 'completed'
  ), r as (
    select pr.* from peer_references pr where pr.subject_id = p_user
      and (pr.created_at < now() - interval '14 days'
        or exists (select 1 from peer_references o where o.meetup_id = pr.meetup_id and o.author_id = p_user))
  )
  select (select count(*)::int from m), (select round(coalesce(sum(duration_minutes),0)/60.0,1) from m),
         (select count(*)::int from r where learned_something), (select count(*)::int from r where felt_safe), (select count(*)::int from r)
$$;
