// Nối app với Supabase. Mọi quyền vẫn do RLS và hàm SQL quyết định; file này chỉ đọc, ghi và đổi dữ liệu sang dạng app dùng.
import type { HubSeed } from '../data/catalog';
import type { Flags, Notice, ReportItem } from './store';
import type { Conversation, Demand, KnowledgeItem, LedgerRow, Meetup, MyPartner, Offer, Person, Profile, QueueItem, Session, State, StatRow, Trip, VerificationForm, Verification, Voucher } from './store';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { forgetLocalAuth, rpc, supabase } from './supabase';
import { contentLocale, UI_LOCALES, type UiLocale } from '../i18n';
import type { Match } from '../../supabase/functions/_shared/matching';
import type { PointsInput } from '../../supabase/functions/_shared/points';

const db = () => { if (!supabase) throw new Error('demo_mode'); return supabase; };
const must = <T,>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };
const rows = async (q: PromiseLike<{ data: any; error: { message: string } | null }>): Promise<any[]> => { const r = await q; return r.error ? [] : r.data ?? []; };
export const rpcCall = <T = unknown>(name: string, args: Record<string, unknown> = {}) => rpc<T>(name, args);
export const signOut = async () => { await db().auth.signOut({ scope: 'local' }); await forgetLocalAuth(); };
const when = (v: string) => new Date(v).toISOString().slice(0, 16).replace('T', ' ');

export async function saveBasics(p: Profile, birth: string) {
  await rpc('complete_basics', { p_display_name: p.displayName, p_birth_date: birth, p_home_country: p.homeCountry, p_home_province: p.homeProvince, p_home_ward: p.homeWard || null, p_gender: p.gender, p_meet_preference: p.meetSame ? 'same_gender' : 'any' });
}
export async function pushProfile(p: Profile, hubId: (s: string | null) => string | null) {
  const c = db(); const { data: { session } } = await c.auth.getSession(); if (!session) throw new Error('not_authenticated'); const id = session.user.id;
  // Một lần gọi, chạy trọn hoặc không (migration 0014). Hub bản địa ghi ở trạng thái chờ duyệt.
  await rpc('save_profile', { p: {
    display_name: p.displayName, headline: p.headline, answers: p.answers, depth: p.depth,
    languages: p.languages.map((l) => ({ code: l.code, level: l.level, can_help: l.canHelpPractice })),
    capabilities: p.capabilities.map((x) => ({ kind: x.kind, title: x.title, years: x.years ?? '', credential: x.credential ?? '' })),
    gives: p.gives, wants: p.wants, want_languages: p.wantLanguages,
    local_hubs: p.localHubs.map((slug) => hubId(slug)).filter(Boolean),
  } });
  for (const t of p.trips.filter((x) => !x.id)) await addTrip(id, t, hubId(t.hub));
}
/** Ảnh đại diện: thu về 512 px, JPEG, lưu ở avatars/<id>/; ảnh cũ bị xóa. */
export async function uploadAvatar(uri: string) {
  const c = db(); const { data: { session } } = await c.auth.getSession(); if (!session) throw new Error('not_authenticated'); const id = session.user.id;
  const small = await manipulateAsync(uri, [{ resize: { width: 512, height: 512 } }], { compress: 0.8, format: SaveFormat.JPEG });
  const blob = await (await fetch(small.uri)).blob(); const path = `${id}/${Date.now()}.jpg`;
  must(await c.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true }));
  const old = must(await c.from('profiles').select('avatar_url').eq('id', id).maybeSingle()) as { avatar_url: string | null } | null;
  await rpc('set_avatar', { p_path: path });
  if (old?.avatar_url && old.avatar_url !== path) await c.storage.from('avatars').remove([old.avatar_url]);
}
export async function removeAvatar() {
  const c = db(); const { data: { session } } = await c.auth.getSession(); if (!session) throw new Error('not_authenticated');
  const old = must(await c.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle()) as { avatar_url: string | null } | null;
  await rpc('set_avatar', { p_path: null });
  if (old?.avatar_url) await c.storage.from('avatars').remove([old.avatar_url]);
}
/** Liên kết có hạn 1 ngày cho các ảnh đại diện; ảnh nào lỗi thì bỏ qua. */
async function avatarUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter((x): x is string => !!x))]; if (!list.length) return {};
  const { data } = await db().storage.from('avatars').createSignedUrls(list, 86400);
  return Object.fromEntries((data ?? []).filter((x) => x.signedUrl && x.path).map((x) => [x.path as string, x.signedUrl as string]));
}
export async function addTrip(userId: string, t: Trip, hubId: string | null) {
  must(await db().from('trip_plans').insert({ user_id: userId, hub_id: hubId, destination_text: t.city, country_code: t.country, city: t.city, purpose: t.purpose || null, starts_on: t.from, ends_on: t.to }));
}
async function upload(userId: string, name: string, uri?: string) {
  if (!uri) throw new Error('files_required');
  const blob = await (await fetch(uri)).blob(); const path = `${userId}/${name}-${Date.now()}.jpg`;
  must(await db().storage.from('verification').upload(path, blob, { contentType: blob.type || 'image/jpeg' }));
  return path;
}
export async function submitVerification(userId: string, p: Profile, f: VerificationForm) {
  const photo = f.method === 'photo';
  const [doc, selfie] = photo ? await Promise.all([upload(userId, 'document', f.docUri), upload(userId, 'portrait', f.selfieUri)]) : [null, null];
  await rpc('submit_verification2', { p_method: f.method, p_name: f.legalName, p_nationality: f.nationality, p_phone: f.phone, p_city: f.city, p_doc_type: f.docType, p_doc_country: f.docCountry, p_doc_last4: f.docLast4, p_doc_path: doc, p_selfie_path: selfie, p_helpers: p.helpers });
}
/** Ảnh xác minh chỉ mở qua liên kết hết hạn sau 5 phút, và mỗi lần mở được ghi lại. */
export async function viewVerificationFile(id: string, path: string) {
  await rpc('log_verification_view', { p_id: id });
  const r = await db().storage.from('verification').createSignedUrl(path, 300);
  if (r.error || !r.data) throw new Error('file_unavailable');
  return r.data.signedUrl;
}
export const setUiLocale = async (me: string, code: string) => { must(await db().from('profiles').update({ ui_locale: code }).eq('id', me)); };
export const readNotice = async (id: string) => { must(await db().from('user_notices').update({ read_at: new Date().toISOString() }).eq('id', id)); };
export const block = async (me: string, other: string) => { must(await db().from('blocks').insert({ blocker_id: me, blocked_id: other })); };
export const sendMessage = async (me: string, conversation: string, body: string) => { must(await db().from('messages').insert({ conversation_id: conversation, sender_id: me, body })); };
export const report = async (me: string, category: string, body: string, urgent: boolean, target?: string) => { must(await db().from('reports').insert({ reporter_id: me, category, body, urgent, target_user_id: target ?? null })); };
export const requestHub = async (me: string, place: string, role: string, host: boolean) => { must(await db().from('hub_requests').insert({ user_id: me, place_text: place, role, willing_to_host: host })); };
export const addCost = async (hub: string | null, amount: number) => { must(await db().from('hub_cost_entries').insert({ hub_id: hub, month: `${new Date().toISOString().slice(0, 7)}-01`, category: 'operations', amount_vnd: amount })); };
export async function reviewKnowledge(id: string, input: PointsInput | null) {
  if (!input) return rpc('review_knowledge', { p_item: id, p_decision: 'rejected' });
  const r = input.rubric;
  return rpc('review_knowledge', { p_item: id, p_decision: 'approved', p_effort: input.effortHours, a: r.accuracy, o: r.originality, u: r.usefulness, c: r.clarity, s: r.sourcing, p_rarity: input.rarity, p_prov: input.provenance });
}
export async function submitApplication(me: string, x: Record<string, any>) {
  const c = db();
  const row = must(await c.from('hub_applications').insert({ applicant_id: me, venue_type: x.venueType, venue_name: x.venueName, description: x.description, address: x.address, lat: x.lat, lng: x.lng, contact_name: x.contactName, contact_phone: x.contactPhone, legal_name: x.legalName || null, registration_no: x.registrationNo || null, authority_role: x.authority, open_hours: x.hours, hosting_idea: x.idea, has_public_seating: x.seat, open_to_non_guests: x.open, no_purchase_required: x.noBuy, staff_on_site: x.staff, accepts_rules: x.rules, wants_reward_partner: x.reward }).select('id').single()) as { id: string };
  await rpc('submit_hub_application', { p_id: row.id });
}
export async function loadStats(slugOf: (id: string | null) => string): Promise<StatRow[]> {
  const to = new Date(); const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  const data = await rpc<any[]>('skroi_monthly_stats', { p_from: from.toISOString().slice(0, 10), p_to: to.toISOString().slice(0, 10) });
  return data.map((r) => ({ month: r.month.slice(0, 7), hub: r.hub_slug ?? slugOf(r.hub_id), region: r.wage_region, cost: +r.cost_vnd, sessions: r.sessions, minutes: +r.session_minutes, people: +r.session_people, equivalentHours: +r.equivalent_hours, knowledge: r.knowledge_approved, points: +r.points_issued, redeemed: +r.points_redeemed, bill: +r.bill_vnd, discount: +r.discount_vnd, reference: +r.reference_vnd, conservative: +r.conservative_vnd, outcomes: r.outcome_responses }));
}

function toPerson(p: any, avatars: Record<string, string> = {}): Person {
  return { id: p.id, name: p.display_name, avatar: p.avatar_url ? avatars[p.avatar_url] : undefined, headline: p.headline ?? '', headlineEn: p.headline ?? '', background: (p.capabilities ?? []).filter((c: any) => c.visible).map((c: any) => c.title), languages: (p.profile_languages ?? []).map((l: any) => ({ code: l.language_code, level: l.level, canHelpPractice: l.can_help_practice })), gives: (p.offers ?? []).map((o: any) => o.topic_id), wants: (p.seeks ?? []).filter((x: any) => x.topic_id).map((x: any) => x.topic_id), wantsLanguages: (p.seeks ?? []).filter((x: any) => x.language_code).map((x: any) => x.language_code), depth: 'medium', orientation: p.orientation_score ?? 50, gender: '', presence: [] };
}

/** Chỉ đọc hội thoại, dùng để cập nhật tin nhắn thường xuyên mà không tính lại gợi ý kết nối. */
export async function pullConversations(me: string, slug: (id: string | null) => string | null, ids?: string[]): Promise<Conversation[]> {
  const c = db(); const convIds = ids ?? (await rows(c.from('conversation_members').select('conversation_id').eq('user_id', me))).map((m) => m.conversation_id);
  if (!convIds.length) return [];
  const conv = await rows(c.from('conversations').select('id,hub_id,conversation_members(user_id),messages(id,sender_id,body,created_at)').in('id', convIds));
  return conv.map((x) => ({ id: x.id, hub: slug(x.hub_id), personId: x.conversation_members.find((m: any) => m.user_id !== me)?.user_id ?? '', messages: [...x.messages].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((m: any) => ({ id: m.id, from: m.sender_id === me ? 'me' : 'them', text: m.body })) }));
}
export async function translateMessage(messageId: string, locale: string) {
  const r = await db().functions.invoke('translate-message', { body: { messageId, locale } });
  if (r.error || !r.data?.body) throw new Error('translate_failed');
  return r.data.body as string;
}
export const setDiscoverable = async (me: string, on: boolean) => { must(await db().from('profiles').update({ discoverable: on }).eq('id', me)); };

/** Đọc toàn bộ dữ liệu người dùng cần để hiển thị. Lỗi ở một phần không làm hỏng phần khác. */
export async function pull(): Promise<Partial<State>> {
  const c = db();
  const hubRows = await rows(c.from('hubs').select('id,slug,region_id,level,wage_region,lat,lng,radius_m,status,venue_name,ticket_required,agreement_signed_at,hub_translations(locale,name,summary,story,meeting_point,open_hours,entry_note),hub_topics(topic_id)'));
  const flagsRaw = await rpc<Record<string, boolean>>('public_flags').catch(() => ({} as Record<string, boolean>));
  const remoteHubs: HubSeed[] = hubRows.map((h) => { const tr = (l: string) => { const x = h.hub_translations.find((t: any) => t.locale === l) ?? h.hub_translations[0] ?? {}; return { name: x.name ?? h.slug, summary: x.summary ?? '', story: x.story ?? '', meeting: x.meeting_point ?? '', hours: x.open_hours ?? undefined, entry: x.entry_note ?? undefined }; }; return { status: h.status, venue: h.venue_name ?? undefined, ticket: h.ticket_required, agreement: !!h.agreement_signed_at, id: h.id, slug: h.slug, region: h.region_id, level: h.level === 'open' ? 'open' : 'partner', wageRegion: h.wage_region, lat: h.lat, lng: h.lng, radius: h.radius_m, vi: tr('vi'), en: tr('en'), topics: h.hub_topics.map((t: any) => t.topic_id) }; });
  const slug = (id: string | null) => remoteHubs.find((h) => h.id === id)?.slug ?? null;
  const knowledgeRows = await rows(c.from('knowledge_items').select('id,hub_id,topic_id,status,created_by,knowledge_translations(locale,title,body_md),knowledge_contributors(user_id,credit_name,anonymous,profiles(display_name))').order('created_at', { ascending: false }).limit(200));
  const { data: { session } } = await c.auth.getSession();
  const me = session?.user.id ?? null;
  const toKnowledge = (k: any): KnowledgeItem => { const t = k.knowledge_translations[0] ?? {}; const en = k.knowledge_translations.find((x: any) => x.locale === 'en') ?? t; const a = k.knowledge_contributors?.[0]; return { id: k.id, hub: slug(k.hub_id) ?? '', topic: k.topic_id ?? '', author: a?.anonymous ? 'Ẩn danh' : a?.credit_name ?? a?.profiles?.display_name ?? '', mine: k.created_by === me, status: k.status, title: t.title ?? '', titleEn: en.title ?? '', body: t.body_md ?? '', bodyEn: en.body_md ?? '' }; };
  const flags: Flags = { invite_required: !!flagsRaw.invite_required, verification_photo: flagsRaw.verification_photo !== false, verification_in_person: flagsRaw.verification_in_person !== false, points_redemption: !!flagsRaw.points_redemption, message_translation: !!flagsRaw.message_translation, daily_figure: flagsRaw.daily_figure === true };
  const base: Partial<State> = { remoteHubs, flags, knowledge: knowledgeRows.map(toKnowledge) };
  if (!me) return { ...base, userId: null, email: null };

  const [profile, priv, roles, verification, languages, caps, offers, seeks, orientation, trips, members, helpers] = await Promise.all([
    c.from('profiles').select('display_name,headline,avatar_url,onboarding_step,discoverable,ui_locale,account_status,deletion_requested_at').eq('id', me).maybeSingle(), c.from('profile_private').select('birth_year,home_country,home_province,home_ward,gender,meet_preference,access_granted_at').eq('user_id', me).maybeSingle(), rows(c.from('user_roles').select('role').eq('user_id', me)),
    c.from('identity_verifications').select('*').eq('user_id', me).order('submitted_at', { ascending: false }).limit(1).maybeSingle(), rows(c.from('profile_languages').select('*').eq('user_id', me)), rows(c.from('capabilities').select('*').eq('user_id', me)), rows(c.from('offers').select('*').eq('user_id', me)), rows(c.from('seeks').select('*').eq('user_id', me)),
    c.from('knowledge_orientation').select('*').eq('user_id', me).maybeSingle(), rows(c.from('trip_plans').select('*').eq('user_id', me)), rows(c.from('hub_members').select('hub_id,status').eq('user_id', me).neq('status', 'removed')), rows(c.from('emergency_contacts').select('*').eq('user_id', me)),
  ]);
  const p = profile.data, q = priv.data, o = orientation.data;
  const prof: Profile = { displayName: p?.display_name ?? '', birthYear: q?.birth_year ?? null, homeCountry: q?.home_country ?? 'VN', homeProvince: q?.home_province ?? '', homeWard: q?.home_ward ?? '', gender: q?.gender ?? null, meetSame: q?.meet_preference === 'same_gender', headline: p?.headline ?? '', capabilities: caps.map((x) => ({ kind: x.kind, title: x.title, years: x.years_experience ?? undefined, credential: x.credential ?? undefined })), languages: languages.map((l) => ({ code: l.language_code, level: l.level, canHelpPractice: l.can_help_practice })), answers: o ? [o.learn_on_trips, o.ask_locals, o.share_what_i_know, o.write_things_down, o.respect_local_rules] : [4, 4, 3, 3, 4], depth: o?.preferred_depth ?? 'medium', gives: offers.map((x) => x.topic_id), wants: Object.fromEntries(seeks.filter((x) => x.topic_id).map((x) => [x.topic_id, x.importance >= 3 ? 3 : 1])), wantLanguages: seeks.filter((x) => x.language_code).map((x) => x.language_code), localHubs: members.map((m) => slug(m.hub_id)).filter(Boolean) as string[], trips: trips.map((t) => ({ id: t.id, hub: slug(t.hub_id), country: t.country_code ?? '', city: t.city ?? t.destination_text ?? '', from: t.starts_on, to: t.ends_on, purpose: t.purpose ?? '' })), helpers: helpers.map((h) => ({ name: h.full_name, relation: h.relation, phone: h.phone_e164, email: h.email ?? undefined, informed: true })) };
  if (!prof.languages.length) prof.languages = [{ code: 'vi', level: 'native', canHelpPractice: true }];
  const v = verification.data;
  const ver: Verification | null = v ? { id: v.id, method: v.method, inPersonCode: v.in_person_code, status: v.status, legalName: v.legal_full_name, city: v.current_city, docType: v.doc_type, submittedAt: Date.parse(v.submitted_at), risk: v.ai_risk ?? 'medium', score: v.ai_score ?? 0, summary: v.ai_summary ?? '', flags: (v.ai_flags ?? []).map((f: any) => f.code), note: v.admin_note ?? undefined } : null;
  const roleNames = roles.map((r) => r.role as string); const isAdmin = roleNames.length > 0;
  const [noticeRows, capacity] = await Promise.all([rows(c.from('user_notices').select('id,kind,body,created_at,read_at').order('created_at', { ascending: false }).limit(20)), rpc<any[]>('beta_capacity').catch(() => [])]);
  const notices: Notice[] = noticeRows.map((n) => ({ id: n.id, kind: n.kind, body: n.body, at: Date.parse(n.created_at), read: !!n.read_at }));

  const [intents, memberships, ledger, balance, sessions, attendance, offerRows, vouchers, demand, alertLimit, partner, openOffers, operators] = await Promise.all([
    rows(c.from('match_intents').select('id,sender_id,receiver_id,hub_id,status').eq('status', 'pending')), rows(c.from('conversation_members').select('conversation_id').eq('user_id', me)), rows(c.from('point_ledger').select('id,delta,reason,created_at,available_at,note').eq('user_id', me).order('id', { ascending: false }).limit(100)), rpc<any[]>('point_balance', { p_user: me }).catch(() => []),
    rows(c.from('sharing_sessions').select('id,hub_id,host_id,topic_id,title,summary,starts_at,planned_minutes,actual_minutes,status,confirmed_people,confirmed_minutes,points_awarded,profiles!sharing_sessions_host_id_fkey(display_name),session_attendees(count)').order('starts_at', { ascending: false }).limit(100)), rows(c.from('session_attendees').select('session_id,confirmed_at').eq('user_id', me)), rows(c.from('reward_offers').select('*,reward_partners(id,name,wage_region)').eq('active', true)), rows(c.from('reward_redemptions').select('*').eq('user_id', me).order('issued_at', { ascending: false })), rpc<any[]>('expertise_demand').catch(() => []), rpc<number>('alert_limit').catch(() => 1), c.from('reward_partners').select('id,name,wage_region').eq('owner_id', me).maybeSingle(), rpc<string[]>('open_reward_offers').catch(() => [] as string[]), rows(c.from('hub_operators').select('hub_id').eq('user_id', me)),
  ]);
  const convIds = memberships.map((m) => m.conversation_id);
  const conversations = await pullConversations(me, slug, convIds);
  const meet = convIds.length ? await rows(c.from('meetups').select('*').in('conversation_id', convIds)) : [];
  const meetups: Meetup[] = meet.map((m) => ({ id: m.id, conversationId: m.conversation_id, hub: slug(m.hub_id) ?? '', when: when(m.starts_at), note: m.place_note ?? '', status: m.status === 'cancelled' ? 'proposed' : m.status, minutes: m.duration_minutes }));
  const ledgerRows: LedgerRow[] = ledger.map((l) => ({ id: String(l.id), delta: l.delta, reason: l.reason, at: Date.parse(l.created_at), availableAt: Date.parse(l.available_at), title: l.note ?? l.reason }));
  const mine = new Map(attendance.map((a) => [a.session_id, a]));
  const operatorIds = new Set(operators.map((x) => x.hub_id));
  const codes = Object.fromEntries(await Promise.all(sessions.filter((x) => x.status === 'scheduled' && (x.host_id === me || operatorIds.has(x.hub_id))).map(async (x) => [x.id, await rpc<string>('session_code', { p_id: x.id }).catch(() => undefined)])));
  const sessionRows: Session[] = sessions.map((x) => ({ id: x.id, hub: slug(x.hub_id) ?? '', topic: x.topic_id, title: x.title, when: when(x.starts_at), minutes: x.planned_minutes, role: x.host_id === me ? 'host' : mine.has(x.id) ? 'recipient' : 'viewer', hostName: x.profiles?.display_name ?? '', status: x.status === 'rejected' || x.status === 'cancelled' ? 'disputed' : x.status, code: codes[x.id], attendees: x.session_attendees?.[0]?.count ?? 0, checkedIn: mine.has(x.id), attendeeConfirmed: !!mine.get(x.id)?.confirmed_at, actualMinutes: x.confirmed_minutes ?? x.actual_minutes ?? undefined, summary: x.summary ?? undefined, people: x.confirmed_people ?? undefined, points: x.points_awarded ?? undefined }));
  const offersOut: Offer[] = offerRows.map((x) => ({ id: x.id, partner: x.reward_partners?.name ?? '', vi: x.title_vi, en: x.title_en, percent: x.discount_percent ?? 0, max: x.max_discount_vnd, region: x.reward_partners?.wage_region ?? 1, budget: openOffers.includes(x.id) ? 1 : 0, used: 0 }));
  const vouchersOut: Voucher[] = vouchers.map((x) => ({ id: x.id, offerId: x.offer_id, code: x.code, status: x.status, bill: x.bill_vnd ?? undefined, discount: x.discount_vnd ?? undefined, points: x.points_spent ?? undefined, owner: x.owner_points ?? undefined, fund: x.fund_points ?? undefined }));
  const remoteDemand: Demand[] = demand.map((d) => ({ hub: slug(d.hub_id) ?? '', topic: d.topic_id, count: d.local_count }));
  let myPartner: MyPartner | null = null;
  if (partner.data) { const sum = (await rpc<any[]>('partner_summary', { p_partner: partner.data.id }).catch(() => []))[0]; myPartner = { id: partner.data.id, name: partner.data.name, region: partner.data.wage_region, budget: +(sum?.budget_vnd ?? 0), used: +(sum?.used_vnd ?? 0), revenue: +(sum?.revenue_vnd ?? 0), cap: +(sum?.cap_vnd ?? 0), points: ledger.filter((l) => l.reason === 'redemption_received').reduce((n, l) => n + l.delta, 0) }; }

  let remoteMatches: Match[] = []; let matchPeople: any[] = [];
  let previewCount: number | null = null;
  if (ver && ver.status !== 'approved' && ver.status !== 'rejected') previewCount = await c.functions.invoke('match-suggestions', { body: { mode: 'in_person' } }).then((r) => (typeof r.data?.count === 'number' ? r.data.count : null)).catch(() => null);
  if (ver?.status === 'approved') {
    const load = async (mode: string) => { const r = await c.functions.invoke('match-suggestions', { body: { mode } }); return (r.data?.matches ?? []) as (Match & { hubId: string | null })[]; };
    const [a, b] = await Promise.all([load('in_person').catch(() => []), load('online').catch(() => [])]);
    remoteMatches = [...a, ...b].map((m) => ({ ...m, hubId: slug(m.hubId), reasons: m.reasons.map((r) => r.kind === 'same_hub' ? { ...r, hubId: slug(r.hubId) ?? '' } : r) }));
  }
  const ids = [...new Set([...remoteMatches.map((m) => m.candidateId), ...intents.flatMap((i) => [i.sender_id, i.receiver_id]), ...conversations.map((x) => x.personId)])].filter((x) => x && x !== me);
  if (ids.length) matchPeople = await rows(c.from('profiles').select('id,display_name,headline,avatar_url,orientation_score,profile_languages(*),offers(topic_id),seeks(topic_id,language_code),capabilities(title,visible)').in('id', ids));

  const avatars = await avatarUrls([p?.avatar_url, ...matchPeople.map((x) => x.avatar_url)]).catch(() => ({} as Record<string, string>));
  prof.avatar = p?.avatar_url ? avatars[p.avatar_url] ?? null : null;
  const admin: Partial<State> = {};
  if (isAdmin) {
    const [queue, apps, fund, reports] = await Promise.all([rpc<any[]>('verification_queue2').catch(() => []), rows(c.from('hub_applications').select('*').order('created_at', { ascending: false })), rpc<any[]>('app_fund_status').catch(() => []), rpc<any[]>('report_queue').catch(() => [])]);
    admin.reports = reports.map((x): ReportItem => ({ id: x.id, category: x.category, body: x.body ?? '', urgent: x.urgent, at: Date.parse(x.created_at), targetUserId: x.target_user_id, targetName: x.target_name, messageBody: x.message_body, knowledgeId: x.target_knowledge_id, prior: x.prior_reports, status: x.status }));
    admin.remoteQueue = queue.map((x): QueueItem => ({ id: x.id, name: x.legal_full_name, city: x.current_city, doc: x.doc_type, risk: x.risk ?? 'medium', score: 0, summary: '', flags: [], submittedAt: Date.parse(x.submitted_at), method: x.method, last4: x.doc_last4, docPath: x.doc_image_path, selfiePath: x.selfie_path, inPersonAt: x.in_person_at ? Date.parse(x.in_person_at) : null }));
    admin.applications = apps.map((x) => ({ id: x.id, status: x.status, venueName: x.venue_name, address: x.address, registrationNo: x.registration_no, idea: x.hosting_idea, regionId: x.region_id }));
    if (fund[0]) admin.fund = { balance: fund[0].balance, monthIn: fund[0].month_in, monthOut: fund[0].month_out };
  } else admin.applications = await rows(c.from('hub_applications').select('id,status,venue_name,address').eq('applicant_id', me)).then((x) => x.map((y) => ({ id: y.id, status: y.status, venueName: y.venue_name, address: y.address })));
  const b = balance[0];
  const savedUi = p && UI_LOCALES.includes(p.ui_locale) ? (p.ui_locale as UiLocale) : null;
  return { ...base, ...admin, ...(savedUi ? { uiLocale: savedUi, locale: contentLocale(savedUi) } : {}), userId: me, email: session?.user.email ?? null, onboarded: !!ver, isAdmin, roles: roleNames, notices, previewCount, hasAccess: !flags.invite_required || !!q?.access_granted_at || isAdmin, capacity: capacity[0] ? { used: capacity[0].used, max: capacity[0].max_users } : { used: 0, max: 500 }, deletionAt: p?.deletion_requested_at ? Date.parse(p.deletion_requested_at) : null, ...(p?.ui_locale ? { uiLocale: p.ui_locale, locale: p.ui_locale === 'vi' ? 'vi' : 'en' } : {}), hidden: ver?.status === 'approved' ? p?.discoverable === false : false, profile: prof, verification: ver, incoming: intents.filter((i) => i.receiver_id === me).map((i) => ({ intentId: i.id, personId: i.sender_id, hub: slug(i.hub_id) })), sentIntents: intents.filter((i) => i.sender_id === me).map((i) => i.receiver_id), conversations, meetups, ledger: ledgerRows, sessions: sessionRows, offers: offersOut, vouchers: vouchersOut, remoteDemand, myPartner, maxAlerts: alertLimit, operatorHubs: operators.map((x) => slug(x.hub_id)).filter(Boolean) as string[], people: matchPeople.map((x) => toPerson(x, avatars)), remoteMatches, remoteBalance: b ? { available: b.available, pending: b.pending, hours: +b.knowledge_hours } : null };
}
