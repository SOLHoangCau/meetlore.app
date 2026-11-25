-- Quyền truy cập. Mọi bảng đều bật RLS; bảng không có policy thì chỉ đọc được qua hàm hoặc service role.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Danh mục công khai
create policy read_languages on languages for select using (true);
create policy read_regions on regions for select using (true);
create policy read_domains on topic_domains for select using (true);
create policy read_topics on topics for select using (active);
create policy read_legal on legal_documents for select using (published_at is not null);
create policy admin_legal on legal_documents for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_languages on languages for all to authenticated using (is_admin()) with check (is_admin());
create policy read_flags on platform_flags for select using (true);
create policy admin_flags on platform_flags for update to authenticated using (is_admin()) with check (is_admin());

-- Hồ sơ
create policy profile_read on profiles for select to authenticated using (can_view_profile(id));
create policy profile_update on profiles for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and account_status in ('active','paused'));
create policy private_self on profile_private for select to authenticated using (user_id = auth.uid());
create policy roles_self on user_roles for select to authenticated using (user_id = auth.uid() or is_admin());
create policy roles_admin on user_roles for all to authenticated using (is_admin()) with check (is_admin());
create policy consents_self on consents for select to authenticated using (user_id = auth.uid());
create policy audit_admin on admin_audit_log for select to authenticated using (is_admin());

do $$ declare t text; begin
  foreach t in array array['profile_languages','capabilities','offers','seeks'] loop
    execute format('create policy %1$s_read on %1$I for select to authenticated using (can_view_profile(user_id))', t);
    execute format('create policy %1$s_write on %1$I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
  foreach t in array array['knowledge_orientation','notification_prefs','push_tokens','trip_plans'] loop
    execute format('create policy %1$s_self on %1$I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Hub
create policy hubs_public on hubs for select using (status='active');
create policy hubs_staff_read on hubs for select to authenticated using (is_admin() or is_hub_operator(id));
create policy hubs_admin_insert on hubs for insert to authenticated with check (is_admin());
create policy hubs_staff_update on hubs for update to authenticated using (is_admin() or is_hub_operator(id)) with check (is_admin() or is_hub_operator(id));
create policy hubs_admin_delete on hubs for delete to authenticated using (is_admin());
create policy hubtr_public on hub_translations for select using (exists(select 1 from hubs h where h.id=hub_id and h.status='active'));
create policy hubtr_staff on hub_translations for all to authenticated using (is_admin() or is_hub_operator(hub_id)) with check (is_admin() or is_hub_operator(hub_id));
create policy hubtopic_public on hub_topics for select using (exists(select 1 from hubs h where h.id=hub_id and h.status='active'));
create policy hubtopic_staff on hub_topics for all to authenticated using (is_admin() or is_hub_operator(hub_id)) with check (is_admin() or is_hub_operator(hub_id));
create policy hubpartner_staff on hub_partners for all to authenticated using (is_admin() or is_hub_operator(hub_id)) with check (is_admin() or is_hub_operator(hub_id));
create policy hubop_read on hub_operators for select to authenticated using (user_id=auth.uid() or is_admin() or is_hub_operator(hub_id));
create policy hubop_admin on hub_operators for all to authenticated using (is_admin()) with check (is_admin());
create policy hubmember_self on hub_members for select to authenticated using (user_id=auth.uid() or is_admin() or is_hub_operator(hub_id));
create policy hubmember_apply on hub_members for insert to authenticated with check (user_id=auth.uid() and status='pending'
  and exists(select 1 from hubs h where h.id=hub_id and h.recruit_mode='open_review'));
create policy hubmember_staff on hub_members for update to authenticated using (is_admin() or is_hub_operator(hub_id)) with check (is_admin() or is_hub_operator(hub_id));
create policy invite_staff on invites for all to authenticated using (is_admin() or is_hub_operator(hub_id)) with check (is_admin() or is_hub_operator(hub_id));
create policy checkin_self on hub_checkins for select to authenticated using (user_id=auth.uid());
create policy presence_self on hub_presence for select to authenticated using (user_id=auth.uid());

-- Kết nối
create policy blocks_self on blocks for all to authenticated using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
create policy intent_parties on match_intents for select to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy intent_withdraw on match_intents for update to authenticated using (sender_id=auth.uid() and status='pending') with check (sender_id=auth.uid() and status='withdrawn');
create policy conv_member on conversations for select to authenticated using (is_member(id));
create policy convm_read on conversation_members for select to authenticated using (is_member(conversation_id));
create policy convm_update on conversation_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy msg_read on messages for select to authenticated using (is_member(conversation_id) and hidden_at is null);
create policy msg_mod on messages for select to authenticated using (has_role('moderator') and exists(select 1 from reports r where r.target_message_id=messages.id));
create policy msg_send on messages for insert to authenticated with check (
  sender_id=auth.uid() and is_verified(auth.uid()) and is_member(conversation_id) and not are_blocked(auth.uid(), other_member(conversation_id)));
create policy msgtr_read on message_translations for select to authenticated using (exists(select 1 from messages m where m.id=message_id and is_member(m.conversation_id)));
create policy meetup_read on meetups for select to authenticated using (is_member(conversation_id));
create policy meetupc_read on meetup_confirmations for select to authenticated using (exists(select 1 from meetups m where m.id=meetup_id and is_member(m.conversation_id)));
create policy ref_read on peer_references for select to authenticated using (author_id=auth.uid() or ((subject_id=auth.uid() or can_view_profile(subject_id)) and reference_visible(meetup_id, subject_id, created_at)));
create policy report_create on reports for insert to authenticated with check (reporter_id=auth.uid());
create policy report_self on reports for select to authenticated using (reporter_id=auth.uid() or has_role('moderator') or is_admin());
create policy report_mod on reports for update to authenticated using (has_role('moderator') or is_admin()) with check (has_role('moderator') or is_admin());

-- Tri thức
create or replace function public.is_contributor(p_item uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from knowledge_contributors where item_id=p_item and user_id=auth.uid()) $$;
create policy ki_public on knowledge_items for select using (status='published');
create policy ki_own on knowledge_items for select to authenticated using (is_contributor(id) or is_admin() or has_role('content_reviewer'));
create policy kt_public on knowledge_translations for select using (exists(select 1 from knowledge_items k where k.id=item_id and k.status='published'));
create policy kt_own on knowledge_translations for select to authenticated using (is_contributor(item_id) or is_admin() or has_role('content_reviewer'));
create policy kt_edit on knowledge_translations for update to authenticated using (is_contributor(item_id) and exists(select 1 from knowledge_items k where k.id=item_id and k.status in ('draft','changes_requested','awaiting_coauthors')));
create policy kc_public on knowledge_contributors for select using (not anonymous and exists(select 1 from knowledge_items k where k.id=item_id and k.status='published'));
create policy kc_own on knowledge_contributors for select to authenticated using (is_contributor(item_id) or is_admin() or has_role('content_reviewer'));
create policy kr_read on knowledge_reviews for select to authenticated using (is_contributor(item_id) or is_admin() or has_role('content_reviewer'));
create policy ledger_self on point_ledger for select to authenticated using (user_id=auth.uid() or is_admin());
create policy rp_read on reward_partners for select to authenticated using (active or is_admin());
create policy rp_admin on reward_partners for all to authenticated using (is_admin()) with check (is_admin());
create policy rps_admin on reward_partner_staff for all to authenticated using (is_admin()) with check (is_admin());
create policy ro_read on reward_offers for select to authenticated using (active or is_admin());
create policy ro_admin on reward_offers for all to authenticated using (is_admin()) with check (is_admin());
create policy rr_self on reward_redemptions for select to authenticated using (user_id=auth.uid() or is_admin());

-- Mở rộng: chỉ Admin
create policy ec_admin on expansion_countries for all to authenticated using (is_admin()) with check (is_admin());
create policy d_admin on destinations for all to authenticated using (is_admin()) with check (is_admin());
create policy d_read on destinations for select to authenticated using (true);
create policy hc_admin on hub_candidates for all to authenticated using (is_admin()) with check (is_admin());
create policy hr_create on hub_requests for insert to authenticated with check (user_id=auth.uid());
create policy hr_self on hub_requests for select to authenticated using (user_id=auth.uid());

-- Các cột quản trị của hồ sơ không để người dùng tự sửa.
revoke update on profiles from authenticated;
grant update (display_name, headline, bio, avatar_url, home_region_id, ui_locale, meet_modes, discoverable, onboarding_step, last_active_at) on profiles to authenticated;

-- Hàm chỉ chạy cho người đã đăng nhập, trừ các hàm đọc công khai.
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
grant execute on function public.hub_ready_count(uuid) to anon;
revoke execute on function public.audit(text, text, text, jsonb) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
