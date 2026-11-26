\set ON_ERROR_STOP on
create schema t;
grant usage on schema t to authenticated, anon, service_role;
create table t.results(n serial, name text); grant all on t.results to authenticated, anon, service_role; grant all on sequence t.results_n_seq to authenticated, anon, service_role;
create function t.ok(c boolean, name text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FAILED: %', name; end if; insert into t.results(name) values (name); end $$;
create function t.fails(q text, expected text, name text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm like '%'||expected||'%' then insert into t.results(name) values (name); return; end if;
    raise exception 'FAILED: % (got %)', name, sqlerrm; end;
  raise exception 'FAILED: % (no error)', name;
end $$;
grant execute on all functions in schema t to authenticated, anon, service_role;
create function t.u(i int) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid $$;
grant execute on function t.u(int) to authenticated, anon, service_role;
create procedure t.as_user(i int) language plpgsql as $$ begin perform set_config('request.jwt.sub', t.u(i)::text, false); execute 'set role authenticated'; end $$;
grant execute on procedure t.as_user(int) to authenticated, anon;

insert into auth.users(id,email_confirmed_at) select t.u(i), case when i=13 then null else now() end from generate_series(1,20) i;
insert into user_roles values (t.u(9),'admin'), (t.u(10),'content_reviewer');
insert into legal_documents values ('terms','1','vi','Điều khoản','Nội dung',true,now());
update profile_private set adult_confirmed_at=now(), birth_year=1995;
update profile_private set identity_verified_at=now() where user_id not in (t.u(11),t.u(12),t.u(13));
update profiles set discoverable=true, display_name='U' where id<>t.u(20) and id not in (t.u(11),t.u(12),t.u(13));

-- Mọi bảng public đều phải bật RLS
select t.ok(not exists(select 1 from pg_tables where schemaname='public' and not rowsecurity), 'mọi bảng bật RLS');

-- Điểm: SQL khớp với TypeScript
select t.ok(public.calc_knowledge_points(v->>'kind',(v->>'effort')::numeric,(v->'r'->>0)::int,(v->'r'->>1)::int,(v->'r'->>2)::int,(v->'r'->>3)::int,(v->'r'->>4)::int,v->>'rarity',v->>'prov') is not distinct from (v->>'points')::int, 'vector: '||(v->>'name'))
from jsonb_array_elements(:'vectors'::jsonb) v;

-- Tuổi và dữ liệu riêng
call t.as_user(1);
select t.fails($$select complete_basics('Bé', (current_date - interval '17 years')::date,'VN','Hà Nội')$$,'must_be_18','từ chối dưới 18');
select t.fails($$select complete_basics('Minh An','1998-05-20','','')$$,'home_required','phải khai quốc gia và tỉnh thành');
select complete_basics('Minh An','1998-05-20','VN','Hà Nội','Hoàn Kiếm');
select t.ok((select birth_year from profile_private where user_id=t.u(1))=1998,'chỉ lưu năm sinh');
select record_consent('terms','1','vi',true);
select t.ok((select count(*) from consents)=1,'lưu đồng ý');
select t.fails($$update profiles set account_status='active', orientation_score=100 where id=t.u(1)$$,'permission denied','không tự sửa cột quản trị');
insert into trip_plans(user_id,destination_text,starts_on,ends_on) values (t.u(1),'Hà Nội','2026-12-01','2026-12-05');
select t.ok(save_orientation(5::smallint,5::smallint,3::smallint,3::smallint,4::smallint,'deep')=75,'điểm định hướng');
reset role; call t.as_user(2);
select t.ok((select count(*) from profile_private)=1,'chỉ thấy dữ liệu riêng của mình');
select t.ok((select count(*) from trip_plans)=0,'không thấy kế hoạch người khác');
select t.ok((select count(*) from profiles where id=t.u(20))=0,'không thấy hồ sơ chưa công khai');
select t.fails($$select audit('x','y','z')$$,'permission denied','không tự ghi nhật ký');

-- Hub và kích hoạt
reset role;
create temp table h as select id from hubs where slug='van-mieu'; grant select on h to authenticated, anon;
set role anon; select t.ok((select count(*) from hubs where status='preparing')>=1 and not exists(select 1 from hubs where status='draft'),'khách thấy Hub đang chuẩn bị, không thấy bản nháp'); reset role;
call t.as_user(9);
select t.fails($$update hubs set status='active' where id=(select id from h)$$,'hub_not_ready','chặn kích hoạt khi chưa đủ điều kiện');
reset role;
insert into hub_operators select id,t.u(8) from h;
insert into hub_members(hub_id,user_id,status) select id,t.u(i),'ready' from h, generate_series(1,12) i;
update hubs set notify_tested_ios=true,notify_tested_android=true,safety_contact='x' where id=(select id from h);
insert into knowledge_items(hub_id,status,source_locale,published_at) select id,'published','vi',now() from h, generate_series(1,5);
call t.as_user(9); update hubs set status='active' where id=(select id from h); reset role;
set role anon; select t.ok((select count(*) from hubs where status='active')=1,'khách thấy Hub đang hoạt động'); reset role;

-- Có mặt: ẩn khi dưới 5
do $$ begin for i in 1..4 loop perform set_config('request.jwt.sub',t.u(i)::text,false); perform set_presence((select id from h),true); end loop; end $$;
select t.ok(hub_ready_count((select id from h)) is null,'ẩn số người khi dưới 5');
select set_config('request.jwt.sub',t.u(5)::text,false); select set_presence((select id from h),true);
select t.ok(hub_ready_count((select id from h))=5,'hiện số người từ 5');
call t.as_user(2); select t.ok((select count(*) from hub_presence)=1,'không đọc được ai đang có mặt'); reset role;

-- Kết nối hai bên đồng ý
call t.as_user(1);
select set_config('t.intent', send_match_intent(t.u(2),(select id from h),'in_person','{"kind":"test"}')::text,false);
select t.fails(format($$select respond_match_intent(%L,true)$$,current_setting('t.intent')),'intent_not_found','người gửi không tự chấp nhận');
reset role; call t.as_user(2);
select set_config('t.conv', respond_match_intent(current_setting('t.intent')::uuid,true)::text,false);
insert into messages(conversation_id,sender_id,body) values (current_setting('t.conv')::uuid,t.u(2),'Xin chào');
reset role; call t.as_user(3);
select t.ok((select count(*) from messages)=0,'người ngoài không đọc được tin nhắn');
select t.fails(format($$insert into messages(conversation_id,sender_id,body) values (%L,%L,'x')$$,current_setting('t.conv'),t.u(3)),'row-level security','người ngoài không gửi được tin');
reset role; call t.as_user(1);
select t.ok((select count(*) from messages)=1,'thành viên đọc được');
select set_config('t.meet',propose_meetup(current_setting('t.conv')::uuid,(select id from h),now()-interval '1 hour',60,'Cổng chính')::text,false);
select t.fails(format($$select propose_meetup(%L,null,now(),60,'x')$$,current_setting('t.conv')),'first_meeting_at_hub','buổi gặp phải ở Hub');
reset role; call t.as_user(2);
select t.ok(confirm_meetup(current_setting('t.meet')::uuid,'agreed')='agreed','cả hai đồng ý lịch');
select confirm_meetup(current_setting('t.meet')::uuid,'happened');
reset role; call t.as_user(1);
select t.ok(confirm_meetup(current_setting('t.meet')::uuid,'happened')='completed','cả hai xác nhận đã gặp');
select submit_reference(current_setting('t.meet')::uuid,true,true,true,'Rất hay');
reset role; call t.as_user(2);
select t.ok((select count(*) from peer_references)=0,'nhận xét ẩn cho tới khi cả hai viết');
select submit_reference(current_setting('t.meet')::uuid,false,true,false,'Không thoải mái');
select t.ok((select count(*) from peer_references)=2,'hiện sau khi cả hai viết');
select t.ok((select hours_shared from reputation(t.u(1)))=1.0,'giờ đã chia sẻ thuộc uy tín');
select t.ok((select coalesce(sum(delta),0) from point_ledger)=0,'gặp mặt không sinh điểm');
insert into blocks values (t.u(2),t.u(1));
select t.fails(format($$insert into messages(conversation_id,sender_id,body) values (%L,%L,'x')$$,current_setting('t.conv'),t.u(2)),'row-level security','đã chặn thì không nhắn được');
reset role; call t.as_user(1);
select t.ok((select count(*) from profiles where id=t.u(2))=0,'người bị chặn không thấy hồ sơ');
select t.fails($$select send_match_intent(t.u(2),null,'online','{}')$$,'receiver_unavailable','không gửi lời mời khi bị chặn');
reset role;
select t.ok((select count(*) from reports where urgent)=1,'nhận xét không an toàn tạo báo cáo khẩn');

-- Tri thức và điểm
call t.as_user(3);
select set_config('t.k',submit_knowledge((select id from h),'knowledge_note','confucian-exam','vi','Bia tiến sĩ','Nội dung đủ dài để gửi duyệt ở đây.',array[t.u(4)])::text,false);
select t.ok((select status from knowledge_items where id=current_setting('t.k')::uuid)='awaiting_coauthors','chờ đồng tác giả');
reset role; call t.as_user(10);
select t.fails(format($$select review_knowledge(%L,'approved',1,2,2,2,2,2,'common','firsthand')$$,current_setting('t.k')),'item_not_reviewable','chưa đủ đồng ý thì chưa duyệt');
reset role; call t.as_user(4);
select t.ok(accept_coauthorship(current_setting('t.k')::uuid)='submitted','đồng tác giả đồng ý');
select t.fails(format($$select review_knowledge(%L,'approved',1,2,2,2,2,2,'common','firsthand')$$,current_setting('t.k')),'forbidden','người thường không duyệt');
reset role; call t.as_user(10);
select t.ok(review_knowledge(current_setting('t.k')::uuid,'approved',2,2,2,2,2,1,'thin','firsthand')=330,'duyệt và ghi điểm');
reset role; call t.as_user(3);
select t.ok((select delta from point_ledger)=165,'chia đều đồng tác giả');
select t.ok((select available from point_balance())=0 and (select pending from point_balance())=165,'điểm chờ 30 ngày');
select t.fails($$select point_balance(t.u(4))$$,'forbidden','không xem số dư người khác');
reset role;
select t.fails($$update point_ledger set delta=9999$$,'append_only','sổ điểm chỉ ghi thêm');
select t.fails($$delete from point_ledger$$,'append_only','sổ điểm không xóa được');
insert into point_ledger(user_id,delta,reason,available_at,expires_at) values (t.u(3),200,'admin_adjustment',now()-interval '1 day',now()+interval '1 year'),(t.u(3),500,'admin_adjustment',now()-interval '3 years',now()-interval '1 year');
insert into reward_partners(id,name,category,agreement_status,active,owner_id,wage_region) values (t.u(50),'Quán thử','food','signed',true,t.u(7),1);
insert into reward_partner_staff values (t.u(50),t.u(7));
insert into reward_offers(id,partner_id,title_vi,title_en,discount_percent,max_discount_vnd,min_points,active) values (t.u(51),t.u(50),'Giảm 5%','5% off',5,200000,1,true);
select t.ok(point_value_vnd(1)=1442 and point_value_vnd(2)=1284 and point_value_vnd(3)=1131 and point_value_vnd(4)=1007,'giá trị điểm theo vùng');
call t.as_user(3);
select t.ok((select available from point_balance())=200,'điểm hết hạn không dùng được');
select t.fails($$select claim_reward(t.u(51))$$,'budget_exhausted','chưa có ngân sách thì chưa nhận ưu đãi');
reset role; call t.as_user(7);
select t.fails($$select set_partner_budget(t.u(50),date_trunc('month',now())::date,6000000)$$,'budget_above_cap','tháng đầu không vượt mức trần');
select set_partner_budget(t.u(50),date_trunc('month',now())::date,1000000);
select t.fails($$select claim_reward(t.u(51))$$,'own_venue','chủ cơ sở không đổi tại cơ sở mình');
reset role; call t.as_user(3);
select t.fails($$select set_partner_budget(t.u(50),date_trunc('month',now())::date,1000)$$,'forbidden','người ngoài không đặt ngân sách');
select set_config('t.code',claim_reward(t.u(51)),false);
reset role; call t.as_user(7);
select t.ok((select points from quote_voucher(current_setting('t.code'),200000))=7,'hóa đơn 200.000 giảm 5% cần 7 điểm');
reset role; call t.as_user(3);
select t.ok((select points from confirm_voucher(current_setting('t.code')))=7,'khách xác nhận đổi');
select t.ok((select available from point_balance())=193,'trừ điểm khách');
select t.fails(format($$select confirm_voucher(%L)$$,current_setting('t.code')),'code_not_usable','mã chỉ dùng một lần');
select t.fails($$select donate_points((select id from h),999)$$,'insufficient_points','không tặng quá số dư');
reset role;
select t.ok((select delta from point_ledger where user_id=t.u(7) and reason='redemption_received')=3,'chủ cơ sở nhận một nửa làm tròn xuống');
select t.ok((select delta from point_ledger where app_fund and reason='fund_inflow')=4,'quỹ app nhận phần còn lại');
select t.ok((select discount_vnd=10000 and bill_vnd=200000 and reference_vnd=7*1442 from metric_events where event_type='reward_redeemed'),'thống kê đổi ưu đãi');
call t.as_user(7); select t.ok((select pending from point_balance())=3,'điểm chủ cơ sở chờ 30 ngày');
select t.ok((select used_vnd=10000 and revenue_vnd=200000 from partner_summary(t.u(50))),'cơ sở xem ngân sách đã dùng');
reset role; call t.as_user(9);
select t.ok((select balance=4 and month_limit=2 from app_fund_status()),'quỹ chi tối đa 50% phần nhận');
select t.fails($$select fund_reward(t.u(5),3,'Đại sứ Hub')$$,'fund_limit','không chi quá hạn mức quỹ');
select fund_reward(t.u(5),2,'Đại sứ Hub');
reset role; call t.as_user(5);
select t.fails($$select fund_reward(t.u(5),1,'Tự thưởng')$$,'forbidden','người thường không chi quỹ');
reset role;

-- Buổi chia sẻ
call t.as_user(4);
select t.fails($$select create_sharing_session((select id from hubs where slug='sa-pa'),'programming','Lập trình cơ bản',now(),120)$$,'hub_not_active','Hub phải hoạt động');
select set_config('t.s',create_sharing_session((select id from h),'programming','Lập trình cơ bản',now(),120)::text,false);
select set_config('t.c',session_code(current_setting('t.s')::uuid),false);
select t.fails(format($$select session_check_in(%L)$$,current_setting('t.c')),'host_cannot_attend','người chia sẻ không tự điểm danh');
reset role;
do $$ begin for i in 15..17 loop perform set_config('request.jwt.sub',t.u(i)::text,false); perform session_check_in(current_setting('t.c')); end loop; end $$;
do $$ begin perform set_config('request.jwt.sub',t.u(18)::text,false); perform session_check_in(current_setting('t.c')); perform set_config('request.jwt.sub',t.u(19)::text,false); perform session_check_in(current_setting('t.c')); perform set_config('request.jwt.sub',t.u(6)::text,false); perform session_check_in(current_setting('t.c')); end $$;
call t.as_user(4); select end_sharing_session(current_setting('t.s')::uuid,120,'Giới thiệu biến và vòng lặp');
select t.fails(format($$select confirm_session_by_hub(%L,120,true)$$,current_setting('t.s')),'cannot_confirm_own','không tự xác nhận');
reset role; call t.as_user(15);
select t.fails(format($$select confirm_session_by_hub(%L,120,true)$$,current_setting('t.s')),'forbidden','người tham dự không dùng quyền quản lý');
reset role; call t.as_user(8);
select t.ok(confirm_session_by_hub(current_setting('t.s')::uuid,120,true)=600,'6 người 2 giờ được 600 điểm');
reset role;
select t.ok((select confirmed_people=6 and equivalent_hours=6 from sharing_sessions where id=current_setting('t.s')::uuid),'6 giờ chuyên gia tương đương');
select t.ok((select reference_vnd=865386 and conservative_vnd=288462 from metric_events where event_type='session_confirmed'),'lưu riêng giá trị tham chiếu và thận trọng');
-- Xác nhận bởi người nhận, tranh chấp
call t.as_user(4); select set_config('t.s2',create_sharing_session((select id from h),'programming','Buổi hai',now(),60)::text,false); select set_config('t.c2',session_code(current_setting('t.s2')::uuid),false); reset role;
do $$ begin for i in 15..16 loop perform set_config('request.jwt.sub',t.u(i)::text,false); perform session_check_in(current_setting('t.c2')); end loop; end $$;
call t.as_user(4); select end_sharing_session(current_setting('t.s2')::uuid,60,'Ôn tập'); select t.fails(format($$select finalize_session_by_recipients(%L)$$,current_setting('t.s2')),'confirmation_window_open','chờ người nhận xác nhận'); reset role;
call t.as_user(15); select confirm_session_as_attendee(current_setting('t.s2')::uuid,true,true); reset role;
call t.as_user(16); select confirm_session_as_attendee(current_setting('t.s2')::uuid,true,true); select t.ok(finalize_session_by_recipients(current_setting('t.s2')::uuid)=100,'2 người 1 giờ được 100 điểm'); reset role;
call t.as_user(4); select set_config('t.s3',create_sharing_session((select id from h),'programming','Buổi ba',now(),60)::text,false); select set_config('t.c3',session_code(current_setting('t.s3')::uuid),false); reset role;
do $$ begin for i in 15..16 loop perform set_config('request.jwt.sub',t.u(i)::text,false); perform session_check_in(current_setting('t.c3')); end loop; end $$;
call t.as_user(4); select end_sharing_session(current_setting('t.s3')::uuid,60,'x'); reset role;
call t.as_user(15); select confirm_session_as_attendee(current_setting('t.s3')::uuid,false,true); reset role;
call t.as_user(16); select confirm_session_as_attendee(current_setting('t.s3')::uuid,false,false); select finalize_session_by_recipients(current_setting('t.s3')::uuid); reset role;
select t.ok((select status from sharing_sessions where id=current_setting('t.s3')::uuid)='disputed','đa số báo sai thì chuyển tranh chấp');
call t.as_user(9); select t.ok(admin_resolve_session(current_setting('t.s3')::uuid,false)=0,'Admin xử lý tranh chấp'); reset role;
-- người lặp lại tối đa 2 lần trong 30 ngày
call t.as_user(4); select set_config('t.s4',create_sharing_session((select id from h),'programming','Buổi bốn',now(),60)::text,false); select set_config('t.c4',session_code(current_setting('t.s4')::uuid),false); reset role;
do $$ begin for i in 15..17 loop perform set_config('request.jwt.sub',t.u(i)::text,false); perform session_check_in(current_setting('t.c4')); end loop; end $$;
call t.as_user(4); select end_sharing_session(current_setting('t.s4')::uuid,60,'x'); reset role; call t.as_user(8); select confirm_session_by_hub(current_setting('t.s4')::uuid,60,true); reset role;
select t.ok((select confirmed_people from sharing_sessions where id=current_setting('t.s4')::uuid)=1,'người tham dự lặp lại không được tính thêm');
-- Lời mời theo chuyên môn: dưới 5 ẩn số, từ 5 hiện số
insert into offers(user_id,topic_id) values (t.u(4),'data');
insert into seeks(user_id,topic_id) select t.u(i),'data' from generate_series(1,2) i;
call t.as_user(4); select t.ok((select local_count is null and has_demand from expertise_demand() where topic_id='data')=true,'dưới 5 người không hiện số'); reset role;
delete from blocks; insert into seeks(user_id,topic_id) select t.u(i),'data' from generate_series(3,3) i union all select t.u(i),'data' from generate_series(5,8) i;
call t.as_user(4); select t.ok((select local_count>=5 from expertise_demand() where topic_id='data'),'từ 5 người hiện số'); select respond_sharing_invitation((select id from h),'data','never'); select t.ok(not exists(select 1 from expertise_demand() where topic_id='data'),'không nhắc lại khi đã chọn'); reset role;
-- Thống kê
call t.as_user(2); select t.fails($$select count(*) from metric_events where id<0 or true having count(*)<0 or 1/count(*)=1$$,'division','người thường không có số liệu thống kê'); select t.ok((select count(*) from skroi_monthly_stats(current_date,current_date))=0,'người thường không xem SKROI'); reset role;
call t.as_user(9);
insert into hub_cost_entries(hub_id,month,category,amount_vnd) values ((select id from h),date_trunc('month',now())::date,'operations',2500000);
select t.ok((select cost_vnd=2500000 and sessions>=3 and discount_vnd>=0 from skroi_monthly_stats(current_date,current_date,(select id from h))),'tổng hợp thống kê SKROI');
select t.ok(exists(select 1 from public_impact_stats(current_date,current_date)),'báo cáo công khai có nhóm đủ lớn');
reset role;
call t.as_user(2); select t.ok((select max_v.value from (select value from platform_settings where key='max_nearby_alerts_per_day') max_v)=1,'giới hạn thông báo đọc được từ cấu hình'); reset role;
reset role; call t.as_user(10);
select hide_knowledge(current_setting('t.k')::uuid,'vi phạm');
reset role;
select t.ok((select sum(delta) from point_ledger where item_id=current_setting('t.k')::uuid)=0,'gỡ bài thì thu hồi điểm');
delete from auth.users where id=t.u(4);
select t.ok((select count(*) from point_ledger where user_id is null and item_id=current_setting('t.k')::uuid)>0,'xóa tài khoản không làm hỏng sổ điểm');

-- Xác minh người dùng: AI bước 1, Admin bước 2
insert into user_roles values (t.u(14),'verifier');
call t.as_user(11);
select t.fails($$update profiles set discoverable=true where id=t.u(11)$$,'verification_required','chưa duyệt thì không hiện hồ sơ');
select t.fails($$select send_match_intent(t.u(3),null,'online','{}')$$,'verification_required','chưa duyệt thì không gửi lời kết nối');
select t.fails($$select submit_knowledge((select id from h),'knowledge_note',null,'vi','Tiêu đề','Nội dung đủ dài để thử nghiệm.')$$,'verification_required','chưa duyệt thì không đóng góp');
select t.fails($$select submit_verification('Nguyễn Văn A','VN','+84900000011','Hà Nội','national_id','VN','1234','a/doc.jpg','a/selfie.jpg','[]'::jsonb)$$,'helper_required','bắt buộc có người trợ giúp');
select t.fails($$select submit_verification('Nguyễn Văn A','VN','+84900000011','Hà Nội','national_id','VN','1234','a/doc.jpg','a/selfie.jpg','[{"name":"Mẹ","relation":"family","phone":"+84900000011","informed":true}]'::jsonb)$$,'helper_phone_same','số người trợ giúp phải khác số của mình');
select t.fails($$select submit_verification('Nguyễn Văn A','VN','0900','Hà Nội','national_id','VN','1234','a/doc.jpg','a/selfie.jpg','[{"name":"Mẹ","relation":"family","phone":"+84900000099","informed":true}]'::jsonb)$$,'invalid_phone','số điện thoại phải đúng định dạng');
select set_config('t.v',submit_verification('Nguyễn Văn A','VN','+84900000011','Hà Nội','national_id','VN','1234','a/doc.jpg','a/selfie.jpg','[{"name":"Trần Thị B","relation":"family","phone":"+84900000099","informed":true}]'::jsonb)::text,false);
select t.ok((select status from identity_verifications where id=current_setting('t.v')::uuid)='ai_review','đơn vào bước AI');
select t.ok((select count(*) from emergency_contacts)=1,'người dùng xem được người trợ giúp của mình');
select t.fails(format($$select record_ai_review(%L,'low',5,'[]','ok','m')$$,current_setting('t.v')),'permission denied','người dùng không tự ghi kết quả AI');
reset role; call t.as_user(2);
select t.ok((select count(*) from emergency_contacts)=0 and (select count(*) from identity_verifications)=0,'người khác không thấy hồ sơ xác minh');
reset role; set role service_role;
select record_ai_review(current_setting('t.v')::uuid,'low',8,'[]','Khớp thông tin','test-model');
reset role; call t.as_user(14);
select t.ok((select status from identity_verifications where id=current_setting('t.v')::uuid)='awaiting_admin','AI xong thì chờ Admin');
select t.ok((select count(*) from verification_queue())=1,'có trong hàng đợi');
select t.ok((select extract(epoch from review_opens_at-submitted_at)/3600 from identity_verifications where id=current_setting('t.v')::uuid)=24,'rủi ro thấp chờ tối thiểu 24 giờ');
select t.fails(format($$select admin_review_verification(%L,'approved','ok')$$,current_setting('t.v')),'review_window_not_open','chưa đủ 24 giờ thì chưa duyệt');
reset role;
update identity_verifications set review_opens_at=now()-interval '1 hour', review_due_at=now()-interval '1 minute' where id=current_setting('t.v')::uuid;
call t.as_user(14);
select t.ok((select overdue from verification_queue() limit 1),'đánh dấu quá hạn 48 giờ');
select admin_review_verification(current_setting('t.v')::uuid,'approved','Khớp giấy tờ');
reset role;
select t.ok((select identity_verified_at is not null from profile_private where user_id=t.u(11)),'duyệt xong được xác minh');
select t.ok((select discoverable from profiles where id=t.u(11)),'duyệt xong hồ sơ được hiện');
call t.as_user(12);
select set_config('t.v2',submit_verification('Lê C','VN','+84900000012','Huế','passport','VN','9999','c/doc.jpg','c/selfie.jpg','[{"name":"Lê D","relation":"friend","phone":"+84900000098","informed":true}]'::jsonb)::text,false);
reset role; set role service_role; select record_ai_review(current_setting('t.v2')::uuid,'high',90,'[{"code":"doc_mismatch"}]','Nghi ngờ','m'); reset role;
reset role; select t.ok((select extract(epoch from review_opens_at-submitted_at)/3600 from identity_verifications where id=current_setting('t.v2')::uuid)=48,'rủi ro cao chờ tối thiểu 48 giờ');
update identity_verifications set review_opens_at=now()-interval '1 hour' where id=current_setting('t.v2')::uuid;
call t.as_user(9);
select t.fails(format($$select admin_review_verification(%L,'approved')$$,current_setting('t.v2')),'reason_required','rủi ro cao phải ghi lý do khi duyệt');
select admin_review_verification(current_setting('t.v2')::uuid,'rejected','Giấy tờ không khớp');
select t.ok(reveal_emergency_contacts(t.u(11),'Sự cố khẩn cấp tại Hub') is not null,'Admin xem người trợ giúp khi có sự cố');
select t.fails($$select reveal_emergency_contacts(t.u(11),'x')$$,'reason_required','phải ghi lý do');
reset role;
select t.ok((select count(*) from admin_audit_log where action='emergency_contact.revealed')=1,'ghi nhật ký khi xem người trợ giúp');
call t.as_user(3);
select t.fails($$select reveal_emergency_contacts(t.u(11),'Tò mò muốn xem')$$,'forbidden','người thường không xem người trợ giúp');
reset role;

-- Xác thực bằng email, không có SMS do app trả
call t.as_user(13);
select t.fails($$select submit_verification('Võ E','VN','+84900000013','Huế','national_id','VN','1111','e/doc.jpg','e/selfie.jpg','[{"name":"Võ F","relation":"family","phone":"+84900000097","informed":true}]'::jsonb)$$,'email_not_confirmed','phải xác thực email trước');
select t.fails($$select start_user_paid_sms('+84900000013')$$,'feature_disabled','SMS do người dùng trả đang tắt');
reset role;
update auth.users set email_confirmed_at=now() where id=t.u(13);
select t.ok((select email_confirmed_at is not null from profile_private where user_id=t.u(13)),'đồng bộ trạng thái email');
update platform_flags set enabled=true where key='user_paid_sms_verification';
call t.as_user(13);
select set_config('t.sms',start_user_paid_sms('+84900000013'),false);
select t.fails(format($$select confirm_user_sms('+84900000013',%L)$$,current_setting('t.sms')),'permission denied','người dùng không tự xác nhận SMS');
reset role; set role service_role;
select t.ok(confirm_user_sms('+84900000099',current_setting('t.sms')) is false,'sai số gửi thì không xác nhận');
select t.ok(confirm_user_sms('+84900000013',current_setting('t.sms')),'số đúng thì xác nhận');
reset role;

-- Cơ sở đăng ký làm Hub
call t.as_user(6);
insert into hub_applications(id,applicant_id,venue_type,venue_name,address,region_id,lat,lng,contact_name,contact_phone,authority_role,topic_ids,has_public_seating,open_to_non_guests,accepts_rules,wants_reward_partner)
values (t.u(60),t.u(6),'cafe','Quán Sách Nhỏ','12 phố Thử, Hà Nội','vn-hanoi',21.0289,105.8360,'Chủ quán','0900000000','owner',array['coffee','storytelling'],true,false,true,true);
select t.fails($$select submit_hub_application(t.u(60))$$,'public_space_required','phải mở cho người không phải khách lưu trú');
update hub_applications set open_to_non_guests=true where id=t.u(60);
select t.fails($$select submit_hub_application(t.u(60))$$,'registration_required','quán cần mã đăng ký kinh doanh');
update hub_applications set registration_no='0101234567' where id=t.u(60);
select t.ok(submit_hub_application(t.u(60))='submitted','gửi đơn thành công');
select t.ok((select count(*) from hub_applications where id=t.u(60) and status='submitted')=1,'chủ đơn xem được đơn');
update hub_applications set venue_name='Sửa sau khi gửi' where id=t.u(60);
select t.ok((select venue_name from hub_applications where id=t.u(60))='Quán Sách Nhỏ','không sửa đơn đã gửi');
select t.fails($$select review_hub_application(t.u(60),'approved',null,'quan-sach','vn-hanoi')$$,'forbidden','chủ đơn không tự duyệt');
reset role; call t.as_user(5);
select t.ok((select count(*) from hub_applications)=0,'người khác không thấy đơn');
reset role; call t.as_user(9);
select t.ok((select count(*) from application_nearby_hubs(t.u(60)))=1,'phát hiện Hub gần trùng');
select t.fails($$select review_hub_application(t.u(60),'approved',null,'quan-sach','vn-hanoi')$$,'site_check_required','phải kiểm tra thực tế trước khi duyệt');
select review_hub_application(t.u(60),'site_check','Hẹn khảo sát');
select set_config('t.vh',review_hub_application(t.u(60),'approved','Đạt','quan-sach','vn-hanoi',150)::text,false);
reset role;
select t.ok((select status='preparing' and venue_type='cafe' and level='partner' from hubs where id=current_setting('t.vh')::uuid),'tạo Hub đối tác ở trạng thái chuẩn bị');
select t.ok(exists(select 1 from hub_operators where hub_id=current_setting('t.vh')::uuid and user_id=t.u(6)),'chủ cơ sở thành người phụ trách');
select t.ok(exists(select 1 from reward_partners where name='Quán Sách Nhỏ' and not active),'đối tác ưu đãi chưa tự bật');
insert into hub_members(hub_id,user_id,status) select current_setting('t.vh')::uuid,t.u(i),'ready' from generate_series(1,3) i, generate_series(1,1);
update hubs set notify_tested_ios=true,notify_tested_android=true,safety_contact='x' where id=current_setting('t.vh')::uuid;
call t.as_user(6);
update hubs set radius_m=160 where id=current_setting('t.vh')::uuid;
select t.ok((select radius_m from hubs where id=current_setting('t.vh')::uuid)=160,'người phụ trách sửa được Hub của mình');
select t.fails(format($$update hubs set status='active' where id=%L$$,current_setting('t.vh')),'admin_required','người phụ trách không tự kích hoạt');
reset role;

-- Mở rộng
create temp table c as select id from hub_candidates where name='Đại Nội Huế'; grant select on c to authenticated;
call t.as_user(2);
select t.ok((select count(*) from hub_candidates)=0,'người thường không xem ứng viên Hub');
reset role; call t.as_user(9);
select t.fails($$select convert_candidate((select id from c),'dai-noi','vn-hanoi',200,'vi','Đại Nội')$$,'gates_not_passed','chưa qua cổng thì chưa mở Hub');
update hub_candidates set demand=5,knowledge=5,local_supply=4,meet_safety=4,partner_access=3,feasibility=3,gate_legal=true,gate_community=true,gate_safety=true,lat=16.47,lng=107.58 where id=(select id from c);
select t.ok((select priority_score from hub_candidates where id=(select id from c))=85,'điểm ưu tiên khớp TypeScript');
select t.ok(convert_candidate((select id from c),'dai-noi','vn-hanoi',200,'vi','Đại Nội') is not null,'tạo Hub từ ứng viên');
reset role;

-- Bổ sung cho app
call t.as_user(5); select set_config('t.s5',create_sharing_session((select id from hubs where slug='van-mieu'),'programming','Buổi năm',now(),60)::text,false);
select t.ok(length(session_code(current_setting('t.s5')::uuid))=6,'người chia sẻ lấy được mã điểm danh');
reset role; call t.as_user(2);
select t.fails($$select checkin_code from sharing_sessions limit 1$$,'permission denied','không đọc được mã điểm danh từ bảng');
select t.fails($$select session_code(current_setting('t.s5')::uuid)$$,'forbidden','người khác không lấy được mã điểm danh');
select t.fails($$select set_alert_limit(2)$$,'forbidden','người thường không đổi giới hạn thông báo');
select t.ok(alert_limit()=1,'giới hạn thông báo mặc định là 1');
reset role; call t.as_user(9); select set_alert_limit(2);
select t.ok(alert_limit()=2,'Admin đổi giới hạn thông báo lên 2');
select set_alert_limit(1); reset role;

-- ===== Bản thử nghiệm công khai =====
reset role; call t.as_user(15);
select t.fails($$select submit_verification2('in_person','Nguyễn Văn Mười','VN','+84900000011','Hà Nội','national_id','VN','1234',null,null,'[{"name":"Trần Thị A","relation":"family","phone":"+84900000012","informed":true}]')$$,'access_code_required','cần mã mời trước khi xác minh');
select t.fails($$select redeem_access_code('KHONGCO1')$$,'invalid_code','mã sai bị từ chối');
select t.fails($$select create_access_codes(2)$$,'forbidden','người thường không tạo mã mời');
reset role; call t.as_user(9);
select set_config('t.code',(select c from create_access_codes(1,1,'thử') c limit 1),false);
reset role; call t.as_user(15);
select t.ok(redeem_access_code(current_setting('t.code')),'dùng mã mời');
reset role; call t.as_user(12);
select t.fails($$select redeem_access_code(current_setting('t.code'))$$,'invalid_code','mã một lần không dùng lại được');
reset role; call t.as_user(15);
select t.fails($$select submit_verification2('photo','Nguyễn Văn Mười','VN','+84900000011','Hà Nội','national_id','VN','1234','khac/a.jpg','khac/b.jpg','[{"name":"Trần Thị A","relation":"family","phone":"+84900000012","informed":true}]')$$,'files_required','ảnh phải nằm trong thư mục của chính mình');
select t.fails($$select submit_verification2('in_person','Nguyễn Văn Mười','VN','+84900000011','Hà Nội','national_id','VN','1234',null,null,'[]'::jsonb)$$,'method_disabled','đối chiếu tại Hub mặc định tắt');
reset role; update platform_flags set enabled=true where key='verification_in_person'; call t.as_user(15);
select set_config('t.ip',(submit_verification2('in_person','Nguyễn Văn Mười','VN','+84900000011','Hà Nội','national_id','VN','1234',null,null,'[{"name":"Trần Thị A","relation":"family","phone":"+84900000012","informed":true}]')->>'code'),false);
select t.ok(length(current_setting('t.ip'))=6 and (select status from identity_verifications where user_id=t.u(15))='awaiting_in_person','chọn đối chiếu tại Hub nhận mã');
select t.ok((select doc_image_path from identity_verifications where user_id=t.u(15)) is null,'đối chiếu tại Hub không lưu ảnh');
reset role; call t.as_user(2);
select t.fails($$select verify_in_person(current_setting('t.ip'),(select id from h),'national_id','1234',true,true)$$,'forbidden','người thường không đối chiếu được');
reset role; call t.as_user(8);
select t.ok(verify_in_person(current_setting('t.ip'),(select id from h),'national_id','1234',true,true)='checked','người phụ trách Hub đối chiếu');
reset role; call t.as_user(9);
select t.ok((select status from identity_verifications where user_id=t.u(15))='awaiting_admin','sau đối chiếu chờ Admin duyệt');
select t.ok((select count(*) from verification_queue2() where user_id=t.u(15))=1,'hồ sơ vào hàng chờ duyệt');
select set_verification_risk((select id from identity_verifications where user_id=t.u(15)),'low');
select t.ok((select review_opens_at-submitted_at from identity_verifications where user_id=t.u(15))=interval '24 hours','hạ rủi ro thấp còn chờ 24 giờ');
select t.fails($$select admin_review_verification((select id from identity_verifications where user_id=t.u(15)),'approved')$$,'review_window_not_open','vẫn phải đợi đủ thời gian tối thiểu');
-- Xóa tài khoản
reset role; call t.as_user(12);
select t.ok(request_account_deletion() > now(),'gửi yêu cầu xóa tài khoản');
select t.ok((select account_status from profiles where id=t.u(12))='deleting','tài khoản bị ẩn ngay');
select cancel_account_deletion();
select t.ok((select account_status from profiles where id=t.u(12))='active','hủy yêu cầu trong thời gian chờ');
-- Báo cáo và xử lý
reset role; call t.as_user(3);
insert into reports(reporter_id,target_user_id,category,body,urgent) values (t.u(3),t.u(6),'harassment','Nhắn tin quấy rối',true);
reset role;
select t.ok(exists(select 1 from notification_outbox where user_id=t.u(9) and kind='urgent_report'),'báo cáo khẩn báo cho Admin');
call t.as_user(5);
select t.ok((select count(*) from report_queue())=0,'người thường không xem hàng báo cáo');
reset role; call t.as_user(9);
select t.fails($$select resolve_report((select id from reports where target_user_id=t.u(6) and status='open' limit 1),'suspend','x')$$,'reason_required','phải ghi lý do');
select resolve_report((select id from reports where target_user_id=t.u(6) and status='open' limit 1),'suspend','Quấy rối nhiều lần',7);
select t.ok(not is_verified(t.u(6)),'tài khoản bị khóa mất quyền kết nối');
select restore_user(t.u(6),'Đã xác minh lại');
select t.ok(is_verified(t.u(6)),'mở khóa trả lại quyền');
reset role; call t.as_user(6);
select t.ok((select count(*) from user_notices)=2,'người bị xử lý nhận thông báo');
select t.fails($$select save_push_token('abc','ios')$$,'bad_token','chỉ nhận mã thông báo hợp lệ');
select save_push_token('ExpoPushToken[abc123]','ios');
reset role;
select t.ok((select count(*) from pending_push() where kind='notice')>=1,'hàng chờ có thông báo đẩy');
call t.as_user(2);
select t.fails($$select pending_push()$$,'permission denied','người dùng không đọc hàng chờ thông báo');
select t.fails($$select set_flag('verification_photo',false)$$,'forbidden','người thường không đổi cờ');
reset role;
-- Nhà tài trợ
call t.as_user(2);
select t.fails($$select save_sponsor(null,'Quán A','static','https://x.vn/a.webp',null,null,current_date,null,true,0)$$,'forbidden','người thường không thêm nhà tài trợ');
select t.fails($$select set_sponsor_timing(6,4)$$,'forbidden','người thường không đổi thời gian');
reset role; call t.as_user(9);
select save_sponsor(null,'Nhà tài trợ A','static','https://x.vn/a.webp',null,'https://a.vn',current_date,null,true,1);
select save_sponsor(null,'Nhà tài trợ B','static','https://x.vn/b.webp',null,null,current_date,null,true,2);
select save_sponsor(null,'Nhà tài trợ cũ','static','https://x.vn/c.webp',null,null,current_date-30,current_date-1,true,3);
select save_sponsor(null,'Nhà tài trợ tạm dừng','static','https://x.vn/d.webp',null,null,current_date,null,false,4);
select t.fails($$select save_sponsor(null,'Sai link','static','http://x.vn/a.webp',null,null,current_date,null,true,0)$$,'sponsors_image_vi_check','chỉ nhận ảnh https');
select t.fails($$select set_sponsor_timing(6,6)$$,'wait_over_legal_limit','không cho chờ tắt quá 5 giây');
select set_sponsor_timing(7,5);
select t.ok((sponsor_config()->>'show_seconds')::int=7,'Admin đổi thời gian hiện');
select t.ok((select count(*) from sponsors)=4,'Admin thấy mọi nhà tài trợ');
reset role; call t.as_user(2);
select t.ok((select count(*) from sponsors)=2,'người dùng chỉ thấy nhà tài trợ đang chạy');
select t.ok((sponsor_config()->>'enabled')::boolean,'người dùng đọc được cấu hình');
select t.ok((public_flags()->>'sponsor_screen')::boolean,'cờ nhà tài trợ có trong danh sách công khai');
reset role;
-- Nhân vật hôm nay
select t.ok((select count(*) from daily_figures where active)=43,'seed có 43 nhân vật');
select t.ok((select count(*) from daily_figures where date like '12-%' and active)=31,'đủ 31 ngày tháng 12');
select t.ok((select id from daily_figures where date='12-25')='newton','25/12 là Newton');
select t.ok(not (public_flags()->>'daily_figure')::boolean,'cờ nhân vật hôm nay mặc định tắt');
select t.ok((select name from hub_translations t join hubs h on h.id=t.hub_id where h.slug='ho-guom' and t.locale='vi')='TriGiao Hub – Hồ Hoàn Kiếm','tên Hub mới');
set role anon;
select t.ok((select count(*) from daily_figures)=43,'khách chưa đăng nhập đọc được nhân vật');
select t.fails($$insert into daily_figures(id,name,born_year,died_year,field,art,vi_hint,vi_fact,en_hint,en_fact) values ('x1','X',1900,1950,'math','symbol','a','b','c','d')$$,'row-level security','khách không ghi được');
reset role; call t.as_user(2);
select t.fails($$select import_daily_figures('[]'::jsonb)$$,'forbidden','người thường không nhập CSV');
update daily_figures set name='Sửa' where id='newton';
select t.ok((select name from daily_figures where id='newton')='Isaac Newton','người thường không sửa được nhân vật');
reset role; call t.as_user(9);
select t.ok(import_daily_figures('[{"id":"newton","date":"12-25","name":"Isaac Newton","born_year":1642,"born_month":12,"born_day":25,"died_year":1727,"field":"physics","art":"portrait","vi_hint":"a","vi_fact":"b","en_hint":"c","en_fact":"d","active":true,"symbol":"s"},{"id":"test-new","date":"12-24","name":"Người thử","born_year":1900,"born_month":12,"born_day":24,"died_year":1980,"field":"math","art":"symbol","vi_hint":"a","vi_fact":"b","en_hint":"c","en_fact":"d","active":true,"symbol":"s"}]'::jsonb)=2,'admin nhập 2 dòng');
select t.ok((select vi_hint from daily_figures where id='newton')='a','dòng cũ được cập nhật theo id');
select t.ok((select id from daily_figures where date='12-24' and active)='test-new' and not (select active from daily_figures where id='joule'),'nhân vật cũ cùng ngày tự tắt');
select t.fails($$select import_daily_figures('[{"id":"bad","name":"B","born_year":1900,"died_year":1800,"field":"math","art":"symbol","vi_hint":"a","vi_fact":"b","en_hint":"c","en_fact":"d"}]'::jsonb)$$,'daily_figures_check','từ chối năm mất trước năm sinh');
select set_flag('daily_figure',true);
select t.ok((public_flags()->>'daily_figure')::boolean,'admin bật cờ nhân vật hôm nay');
reset role;
-- Lưu hồ sơ một lần (0014)
reset role; call t.as_user(3);
select save_profile(jsonb_build_object('display_name','Lan','headline','Thợ nhuộm chàm','answers','[5,4,3,2,1]'::jsonb,'depth','deep',
  'languages','[{"code":"vi","level":"native","can_help":true},{"code":"xx","level":"fluent"}]'::jsonb,
  'capabilities','[{"kind":"craft","title":"Nhuộm chàm","years":"12","credential":"artisan"},{"kind":"skill","title":"x"}]'::jsonb,
  'gives',(select jsonb_agg(id) from (select id from topics order by id limit 2) z),
  'wants',(select jsonb_object_agg(id,3) from (select id from topics order by id desc limit 1) z),
  'want_languages','["en"]'::jsonb,
  'local_hubs',(select jsonb_agg(id::text) from hubs where slug in ('ho-guom','cat-cat'))));
select t.ok((select headline from profiles where id=t.u(3))='Thợ nhuộm chàm','lưu câu giới thiệu');
select t.ok((select count(*) from profile_languages where user_id=t.u(3))=1,'bỏ qua mã ngôn ngữ không có');
select t.ok((select count(*) from capabilities where user_id=t.u(3))=1 and (select credential from capabilities where user_id=t.u(3))='artisan','lưu năng lực hợp lệ');
select t.ok((select count(*) from offers where user_id=t.u(3))=2,'lưu điều cho đi');
select t.ok((select count(*) from seeks where user_id=t.u(3))=2,'lưu điều muốn nhận và ngôn ngữ muốn luyện');
select t.ok((select count(*) from hub_members m join hubs h on h.id=m.hub_id where m.user_id=t.u(3) and h.slug in ('ho-guom','cat-cat') and m.status in ('pending','ready'))=2,'Hub bản địa được ghi, kể cả Hub cần mã mời');
select save_profile(jsonb_build_object('display_name','Lan','local_hubs',(select jsonb_agg(id::text) from hubs where slug='cat-cat')));
select t.ok((select count(*) from hub_members m join hubs h on h.id=m.hub_id where m.user_id=t.u(3) and h.slug='ho-guom' and m.status<>'removed')=0 and (select count(*) from hub_members m join hubs h on h.id=m.hub_id where m.user_id=t.u(3) and h.slug='cat-cat' and m.status<>'removed')=1,'bỏ chọn Hub thì yêu cầu bị gỡ');
select t.ok((select count(*) from offers where user_id=t.u(3))=0,'lưu lại thay thế toàn bộ danh sách');
reset role; set role anon;
select t.fails($$select save_profile('{}'::jsonb)$$,'permission denied','khách không gọi được save_profile');
reset role;
-- Ảnh đại diện
reset role; call t.as_user(3);
select set_avatar(t.u(3)::text||'/a.jpg');
select t.ok((select avatar_url from profiles where id=t.u(3))=t.u(3)::text||'/a.jpg','đặt ảnh đại diện của mình');
select t.fails($$select set_avatar(t.u(4)::text||'/a.jpg')$$,'forbidden','không đặt ảnh trong thư mục người khác');
select t.fails($$select admin_clear_avatar(t.u(3),'ảnh không phù hợp')$$,'forbidden','người thường không gỡ ảnh người khác');
reset role; call t.as_user(9);
select admin_clear_avatar(t.u(3),'ảnh không phù hợp');
reset role;
select t.ok((select avatar_url from profiles where id=t.u(3)) is null and exists(select 1 from user_notices where user_id=t.u(3) and kind='content_removed'),'Admin gỡ ảnh và báo cho người dùng');
reset role;
-- Tài khoản người duyệt
reset role; call t.as_user(3);
select t.ok(not skip_device_code(),'người thường vẫn cần mã thiết bị');
reset role; update profile_private set review_account=true where user_id=t.u(3); call t.as_user(3);
select t.ok(skip_device_code(),'tài khoản người duyệt bỏ qua mã thiết bị');
update profile_private set review_account=false where user_id=t.u(3);
reset role;
select t.ok((select review_account from profile_private where user_id=t.u(3)),'người dùng không tự đổi được cờ người duyệt');
-- Lưu người trợ giúp ở bước 9
reset role; call t.as_user(3);
select save_helpers('[{"name":"Hồng Vân","relation":"partner","phone":"+84963168102","informed":true},{"name":"x","phone":"123","informed":true}]'::jsonb);
reset role;
select t.ok((select count(*) from emergency_contacts where user_id=t.u(3))=1,'lưu người trợ giúp hợp lệ, bỏ dòng sai');
\pset format unaligned
\pset tuples_only on
select 'PASSED '||count(*)||' database checks' from t.results;
