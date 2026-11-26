import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HUBS, TOPICS, type HubSeed } from '../data/catalog';
import { DEMO_DEMAND, DEMO_KNOWLEDGE, DEMO_OFFERS, DEMO_QUEUE, PEOPLE, type DemoPerson } from '../data/demo';
import { contentLocale, translate, UI_LOCALES, type Key, type Locale, type UiLocale } from '../i18n';
const LOCALE_KEY = 'meetlore.locale.v1';
import './locales';
import { rankMatches, type Match, type MatchProfile, type MeetMode, type Depth, type LanguageLevel } from '../../supabase/functions/_shared/matching';
import { calcPoints, MAX_POINTS_PER_MONTH, partnerBudgetCap, pointValueVnd, sessionValue, voucherQuote, type PointsInput, type WageRegion } from '../../supabase/functions/_shared/points';
import { canSubmit, combineReview, reviewWindow, ruleChecks, type VerificationInput } from '../../supabase/functions/_shared/verification';
import { setDailyAlertLimit } from './nearby';
import { registerPush } from './push';
import { isDemo } from './supabase';
import * as live from './live';

export type Lang = { code: string; level: LanguageLevel; canHelpPractice: boolean };
export type Helper = { name: string; relation: string; phone: string; email?: string; informed: boolean };
export type Trip = { id?: string; hub: string | null; country: string; city: string; from: string; to: string; purpose: string };
export type Profile = {
  displayName: string; birthYear: number | null; homeCountry: string; homeProvince: string; homeWard: string; gender: string | null; meetSame: boolean; headline: string;
  capabilities: { kind: string; title: string; years?: number; credential?: string }[]; languages: Lang[]; answers: number[]; depth: Depth;
  gives: string[]; wants: Record<string, 1 | 3>; wantLanguages: string[]; localHubs: string[]; trips: Trip[]; helpers: Helper[];
  /** Liên kết có hạn tới ảnh đại diện, hoặc null. */
  avatar?: string | null;
};
export type Verification = { id?: string; method?: 'photo' | 'in_person'; inPersonCode?: string | null; status: 'ai_review' | 'awaiting_in_person' | 'awaiting_admin' | 'approved' | 'rejected' | 'needs_info'; legalName: string; city: string; docType: string; submittedAt: number; risk: 'low' | 'medium' | 'high'; score: number; summary: string; flags: string[]; note?: string };
export type Conversation = { id: string; personId: string; hub: string | null; messages: { id: string; from: 'me' | 'them'; text: string; translated?: string }[] };
export type Meetup = { id: string; conversationId: string; hub: string; when: string; note: string; status: 'proposed' | 'agreed' | 'completed'; minutes: number; reviewed?: boolean };
export type KnowledgeItem = { id: string; hub: string; topic: string; author: string; mine?: boolean; status: string; title: string; titleEn: string; body: string; bodyEn: string; community?: boolean; consentBy?: string; source?: string };
export type LedgerRow = { id: string; delta: number; reason: string; at: number; availableAt: number; title?: string };
export type VenueApp = Record<string, any> & { id: string; status: string; venueName: string };
export type Session = { id: string; hub: string; topic: string; title: string; when: string; minutes: number; role: 'host' | 'recipient' | 'viewer'; hostName: string; status: 'scheduled' | 'ended' | 'confirmed' | 'disputed'; code?: string; attendees: number; checkedIn?: boolean; attendeeConfirmed?: boolean; actualMinutes?: number; summary?: string; people?: number; points?: number };
export type Offer = { id: string; partner: string; vi: string; en: string; percent: number; max: number | null; region: WageRegion; budget: number; used: number };
export type Voucher = { id: string; offerId: string; code: string; status: 'issued' | 'quoted' | 'used'; bill?: number; discount?: number; points?: number; owner?: number; fund?: number };
export type MyPartner = { id: string; name: string; region: WageRegion; budget: number; used: number; revenue: number; cap: number; points: number };
export type Metric = { at: number; type: string; hub: string | null; people: number; minutes: number; points: number; ref: number; cons: number; bill: number; discount: number };
export type Cost = { hub: string; month: string; amount: number };
export type StatRow = { month: string; hub: string; region: number; cost: number; sessions: number; minutes: number; people: number; equivalentHours: number; knowledge: number; points: number; redeemed: number; bill: number; discount: number; reference: number; conservative: number; outcomes: number };
export type QueueItem = { id: string; name: string; city: string; doc: string; risk: 'low' | 'medium' | 'high'; score: number; summary: string; flags: string[]; submittedAt: number; method?: 'photo' | 'in_person'; last4?: string; docPath?: string | null; selfiePath?: string | null; inPersonAt?: number | null };
export type ReportItem = { id: string; category: string; body: string; urgent: boolean; at: number; targetUserId?: string | null; targetName?: string | null; messageBody?: string | null; knowledgeId?: string | null; prior?: number; status?: string };
export type Notice = { id: string; kind: string; body: string; at: number; read: boolean };
export type Flags = { invite_required: boolean; verification_photo: boolean; verification_in_person: boolean; points_redemption: boolean; message_translation: boolean; daily_figure: boolean };
export type Demand = { hub: string; topic: string; count: number | null };
export type Person = DemoPerson;

export type State = {
  locale: Locale; uiLocale: UiLocale; roles: string[]; flags: Flags; hasAccess: boolean; capacity: { used: number; max: number }; notices: Notice[]; deletionAt: number | null; previewCount: number | null; pushOn: boolean; safetyAck: boolean;
  userId: string | null; email: string | null; onboarded: boolean; isAdmin: boolean; profile: Profile; verification: Verification | null;
  sentIntents: string[]; incoming: { intentId?: string; personId: string; hub: string | null }[]; declined: string[]; blocked: string[]; conversations: Conversation[]; meetups: Meetup[]; knowledge: KnowledgeItem[]; ledger: LedgerRow[];
  presence: { hub: string; until: number } | null; applications: VenueApp[]; queueDone: Record<string, string>; clockHours: number; reports: ReportItem[]; hubRequests: { place: string; role: string; host: boolean }[];
  alertsOn: boolean; allowTranslate: boolean; extraHubs: HubSeed[]; hidden: boolean; sessions: Session[]; invitationAnswers: Record<string, string>; vouchers: Voucher[]; offers: Offer[]; myPartner: MyPartner | null; fund: { balance: number; monthIn: number; monthOut: number };
  metrics: Metric[]; costs: Cost[]; maxAlerts: number; operatorHubs: string[]; hubEdits: Record<string, { lat?: number; lng?: number; radius?: number; hoursVi?: string; hoursEn?: string; agreement?: boolean }>; people: Person[]; remoteHubs: HubSeed[]; remoteMatches: Match[]; remoteDemand: Demand[]; remoteQueue: QueueItem[]; remoteBalance: { available: number; pending: number; hours: number } | null; lastError: string | null;
};
const emptyProfile: Profile = { displayName: '', birthYear: null, homeCountry: 'VN', homeProvince: '', homeWard: '', gender: null, meetSame: false, headline: '', capabilities: [], languages: [{ code: 'vi', level: 'native', canHelpPractice: true }], answers: [4, 4, 3, 3, 4], depth: 'medium', gives: [], wants: {}, wantLanguages: [], localHubs: [], trips: [], helpers: [] };
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const demoSessions: Session[] = [{ id: 's-demo', hub: 'ho-guom', topic: 'old-quarter-history', title: 'Đọc kiến trúc nhà ống', when: `${inDays(0)} 09:00`, minutes: 120, role: 'recipient', hostName: 'Hoàng Nam', status: 'scheduled', code: 'NHAONG26', attendees: 5 }];
const demoMetrics: Metric[] = [
  { at: Date.now() - 12 * 86400000, type: 'session_confirmed', hub: 'van-mieu', people: 6, minutes: 120, points: 600, ref: 865386, cons: 288462, bill: 0, discount: 0 },
  { at: Date.now() - 9 * 86400000, type: 'session_confirmed', hub: 'sa-pa', people: 4, minutes: 90, points: 300, ref: 339366, cons: 169683, bill: 0, discount: 0 },
  { at: Date.now() - 5 * 86400000, type: 'reward_redeemed', hub: 'ho-guom', people: 1, minutes: 0, points: 7, ref: 10094, cons: 10000, bill: 200000, discount: 10000 },
];
const initial: State = { locale: 'vi', uiLocale: 'vi', roles: isDemo ? ['admin'] : [], flags: { invite_required: !isDemo, verification_photo: true, verification_in_person: false, points_redemption: true, message_translation: false, daily_figure: isDemo }, hasAccess: isDemo, capacity: { used: 0, max: 500 }, notices: [], deletionAt: null, previewCount: null, pushOn: false, safetyAck: false, userId: null, email: null, onboarded: false, isAdmin: isDemo, profile: emptyProfile, verification: null, sentIntents: [], incoming: PEOPLE.filter((p) => p.invitesMe).map((p) => ({ personId: p.id, hub: p.presence[0]?.hub ?? null })), declined: [], blocked: [], conversations: [], meetups: [], knowledge: DEMO_KNOWLEDGE as KnowledgeItem[], ledger: [], presence: null, applications: [], queueDone: {}, clockHours: 0, reports: [], hubRequests: [], alertsOn: false, allowTranslate: false, extraHubs: [], hidden: false, sessions: demoSessions, invitationAnswers: {}, vouchers: [], offers: DEMO_OFFERS.map((o) => ({ ...o, used: 0 })), myPartner: null, fund: { balance: 0, monthIn: 0, monthOut: 0 }, metrics: demoMetrics, costs: [], maxAlerts: 1, operatorHubs: [], hubEdits: {}, people: PEOPLE, remoteHubs: [], remoteMatches: [], remoteDemand: [], remoteQueue: [], remoteBalance: null, lastError: null };
const KEY = 'trigiao.demo.v4';
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
export const orientationScore = (a: number[]) => Math.round(((a.reduce((s, x) => s + x, 0) - 5) / 20) * 100);
export const topicName = (id: string, l: Locale) => { const t = TOPICS.find((x) => x.id === id); return t ? t[l] : id; };
export const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');
export const approxVnd = (n: number) => vnd(Math.round(n / 1000) * 1000);
const domainOf = (id: string) => TOPICS.find((t) => t.id === id)?.domain ?? 'other';
export const monthKey = (at: number | Date = Date.now()) => new Date(at).toISOString().slice(0, 7);

function toMatch(p: Profile, id: string, blocked: string[]): MatchProfile {
  return {
    id, adult: true, active: true, discoverable: true, gender: p.gender, meetPreference: p.meetSame ? 'same_gender' : 'any', modes: ['in_person', 'online'], languages: p.languages,
    offers: p.gives.map((t) => ({ topicId: t, domainId: domainOf(t), depth: p.depth })),
    seeks: [...Object.entries(p.wants).map(([t, imp]) => ({ topicId: t, domainId: domainOf(t), depth: p.depth, importance: imp })), ...p.wantLanguages.map((c) => ({ languageCode: c, depth: 'short' as Depth, importance: 2 as const }))],
    orientation: orientationScore(p.answers), blockedIds: blocked,
    presence: [...p.localHubs.map((h) => ({ hubId: h, role: 'local' as const })), ...p.trips.filter((t) => t.hub).map((t) => ({ hubId: t.hub as string, role: 'traveler' as const, from: t.from, to: t.to }))],
  };
}
function personMatch(x: Person): MatchProfile {
  return { id: x.id, adult: true, active: true, discoverable: true, gender: x.gender, modes: ['in_person', 'online'], languages: x.languages, orientation: x.orientation,
    offers: x.gives.map((t) => ({ topicId: t, domainId: domainOf(t), depth: x.depth })),
    seeks: [...x.wants.map((t) => ({ topicId: t, domainId: domainOf(t), depth: x.depth, importance: 2 as const })), ...(x.wantsLanguages ?? []).map((c) => ({ languageCode: c, depth: 'short' as Depth, importance: 2 as const }))],
    presence: x.presence.map((p) => ({ hubId: p.hub, role: p.role, from: p.from, to: p.to, weekdays: p.weekdays })) };
}
export type VerificationForm = { method: 'photo' | 'in_person'; legalName: string; nationality: string; phone: string; city: string; docType: 'national_id' | 'passport' | ''; docCountry: string; docLast4: string; hasDoc: boolean; hasSelfie: boolean; docUri?: string; selfieUri?: string };
export function verificationInput(p: Profile, v: VerificationForm): VerificationInput {
  return { legalName: v.legalName, displayName: p.displayName, birthYear: p.birthYear, nationality: v.nationality.toUpperCase(), phone: v.phone, currentCity: v.city, docType: v.docType, docCountry: v.docCountry.toUpperCase(), docLast4: v.docLast4, hasDocImage: v.hasDoc, hasSelfie: v.hasSelfie, helpers: p.helpers, headline: p.headline };
}

function useActions(s: State, set: (f: (x: State) => State) => void, refresh: () => Promise<void>) {
  const patch = (x: Partial<State>) => set((o) => ({ ...o, ...x }));
  const now = () => Date.now() + s.clockHours * 3600000;
  const fail = (e: unknown) => patch({ lastError: e instanceof Error ? e.message : String(e) });
  const remote = (fn: () => Promise<unknown>) => { fn().then(refresh).catch(fail); };
  const syncMessages = () => live.pullConversations(s.userId as string, (id) => s.remoteHubs.find((h) => h.id === id)?.slug ?? null).then((conversations) => patch({ conversations }));
  const hubRegion = (slug: string): WageRegion => ([...HUBS, ...s.extraHubs, ...s.remoteHubs].find((h) => h.slug === slug)?.wageRegion ?? 1);
  const metric = (m: Omit<Metric, 'at'>) => (o: State): State => ({ ...o, metrics: [{ ...m, at: Date.now() }, ...o.metrics] });
  const makeConversation = (o: State, personId: string, hub: string | null): State => {
    if (o.conversations.some((c) => c.personId === personId)) return o;
    const name = o.people.find((p) => p.id === personId)?.name ?? '';
    const c: Conversation = { id: uid(), personId, hub, messages: [{ id: uid(), from: 'them', text: `Chào bạn, mình là ${name}. Rất vui được kết nối.`, translated: `Hello, I am ${name}. Glad to connect.` }] };
    return { ...o, conversations: [c, ...o.conversations], incoming: o.incoming.filter((i) => i.personId !== personId) };
  };
  return {
    patch, refresh,
    clearError: () => patch({ lastError: null }),
    setProfile: (x: Partial<Profile>) => set((o) => ({ ...o, profile: { ...o.profile, ...x } })),
    signIn: async (email: string) => { patch({ email }); if (!isDemo) await refresh().catch(fail); },
    signOut: () => { if (!isDemo) live.signOut().catch(() => {}); set(() => ({ ...initial, uiLocale: s.uiLocale, locale: s.locale })); },
    saveBasics: async (birth: string) => {
      const p = s.profile; patch({ profile: { ...p, birthYear: birth ? Number(birth.slice(0, 4)) : p.birthYear } });
      if (!isDemo && birth) await live.saveBasics(p, birth);
    },
    syncMessages: () => { if (!isDemo && s.userId) syncMessages().catch(() => {}); },
    setHidden: (hidden: boolean) => { patch({ hidden }); if (!isDemo && s.userId) live.setDiscoverable(s.userId, !hidden).catch(fail); },
    translate: async (cid: string, messageId: string) => { const text = await live.translateMessage(messageId, s.locale); set((o) => ({ ...o, conversations: o.conversations.map((c) => c.id === cid ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, translated: text } : m) } : c) })); },
    setLanguage: (code: UiLocale) => { patch({ uiLocale: code, locale: contentLocale(code) }); AsyncStorage.setItem(LOCALE_KEY, code).catch(() => {}); if (!isDemo && s.userId) live.setUiLocale(s.userId, code).catch(() => {}); },
    redeemCode: async (code: string) => { if (isDemo) { patch({ hasAccess: true }); return; } await live.rpcCall('redeem_access_code', { p_code: code.trim().toUpperCase() }); await refresh(); },
    createCodes: async (n: number, uses: number, note: string): Promise<string[]> => isDemo ? Array.from({ length: n }, () => uid().toUpperCase()) : live.rpcCall<string[]>('create_access_codes', { p_count: n, p_uses: uses, p_note: note || null }),
    verifyInPerson: async (code: string, hub: string, docType: string, last4: string, nameOk: boolean, faceOk: boolean): Promise<string> => {
      if (isDemo) { const v = s.verification; const ok = !!v && v.inPersonCode === code.trim().toUpperCase() && nameOk && faceOk; if (ok) set((o) => o.verification ? { ...o, verification: { ...o.verification, status: 'awaiting_admin', inPersonCode: null } } : o); return ok ? 'checked' : 'code_not_found'; }
      return live.rpcCall<string>('verify_in_person', { p_code: code.trim().toUpperCase(), p_hub: hubId(hub), p_doc_type: docType, p_last4: last4.trim(), p_name_matches: nameOk, p_face_matches: faceOk });
    },
    setRisk: (id: string, risk: 'low' | 'medium' | 'high') => isDemo ? undefined : remote(() => live.rpcCall('set_verification_risk', { p_id: id, p_risk: risk })),
    viewFile: (id: string, path: string): Promise<string> => live.viewVerificationFile(id, path),
    resolveReport: (id: string, action: string, note: string, days?: number) => isDemo ? set((o) => ({ ...o, reports: o.reports.filter((x) => x.id !== id) })) : remote(() => live.rpcCall('resolve_report', { p_id: id, p_action: action, p_note: note, p_days: days ?? null })),
    restoreUser: (userId: string, note: string) => isDemo ? undefined : remote(() => live.rpcCall('restore_user', { p_user: userId, p_note: note })),
    setFlag: (key: keyof Flags, on: boolean) => { set((o) => ({ ...o, flags: { ...o.flags, [key]: on } })); if (!isDemo) remote(() => live.rpcCall('set_flag', { p_key: key, p_on: on })); },
    deleteAccount: async () => { if (!isDemo) await live.rpcCall('request_account_deletion'); if (!isDemo) await live.signOut().catch(() => {}); set(() => ({ ...initial, uiLocale: s.uiLocale, locale: s.locale })); if (isDemo) AsyncStorage.removeItem(KEY).catch(() => {}); },
    cancelDeletion: async () => { await live.rpcCall('cancel_account_deletion'); await refresh(); },
    enablePush: async (on: boolean) => { patch({ pushOn: on }); if (on && !isDemo && s.userId) await registerPush().catch(() => patch({ pushOn: false })); },
    readNotice: (id: string) => { set((o) => ({ ...o, notices: o.notices.map((n) => n.id === id ? { ...n, read: true } : n) })); if (!isDemo) live.readNotice(id).catch(() => {}); },
    updateHub: (slug: string, x: { lat?: number; lng?: number; radius?: number; hoursVi?: string; hoursEn?: string; agreement?: boolean }) => {
      if (!isDemo) return remote(() => live.rpcCall('update_hub_info', { p_hub: hubId(slug), p_lat: x.lat ?? null, p_lng: x.lng ?? null, p_radius: x.radius ?? null, p_venue: null, p_address: null, p_hours_vi: x.hoursVi ?? null, p_hours_en: x.hoursEn ?? null, p_agreement: x.agreement ?? null }));
      set((o) => ({ ...o, hubEdits: { ...o.hubEdits, [slug]: { ...(o.hubEdits[slug] ?? {}), ...x } } }));
    },
    saveProfile: () => { if (!isDemo) remote(() => live.pushProfile(s.profile, hubId)); },
    /** Lưu hồ sơ ngay và chờ kết quả, dùng cho nút Tiếp ở từng bước. Lỗi được ném ra để màn hình hiện. */
    /** Tải ảnh đại diện (đã cắt vuông ở máy), hoặc gỡ khi uri là null. */
    setAvatar: async (uri: string | null) => { if (isDemo) { patch({ profile: { ...s.profile, avatar: uri } }); return; } if (uri) await live.uploadAvatar(uri); else await live.removeAvatar(); await refresh(); },
    saveProfileNow: async (extra?: Partial<Profile>) => { if (isDemo) return; await live.pushProfile({ ...s.profile, ...extra }, hubId); await refresh(); },
    startDemo: () => set((o) => ({ ...o, email: 'demo@meetlore.app', onboarded: true, profile: { ...emptyProfile, displayName: 'Minh An', birthYear: 1996, homeProvince: 'Hà Nội', homeWard: 'Hoàn Kiếm', headline: 'Thiết kế sản phẩm, thích chữ cổ và cà phê', capabilities: [{ kind: 'occupation', title: 'Lập trình viên', years: 6, credential: 'master' }], languages: [{ code: 'vi', level: 'native', canHelpPractice: true }, { code: 'en', level: 'fluent', canHelpPractice: true }, { code: 'ko', level: 'learning', canHelpPractice: false }], gives: ['programming', 'marketing', 'design', 'photography', 'vietnamese-language'], wants: { 'han-nom': 3, 'indigo-dyeing': 3, ceramics: 1 }, wantLanguages: ['ko'], localHubs: ['van-mieu', 'ho-guom'], trips: [{ hub: 'cat-cat', country: 'VN', city: 'Sa Pa', from: inDays(3), to: inDays(8), purpose: 'Tìm hiểu nghề nhuộm chàm' }, { hub: null, country: 'VN', city: 'Huế', from: inDays(30), to: inDays(34), purpose: 'Học về di sản' }], helpers: [{ name: 'Trần Thị Bình', relation: 'family', phone: '+84900000099', informed: true }] }, verification: { status: 'approved', legalName: 'Nguyễn Minh An', city: 'Hà Nội', docType: 'national_id', submittedAt: Date.now() - 86400000 * 2, risk: 'low', score: 6, summary: 'Thông tin đầy đủ.', flags: [] } })),
    /** Gửi hồ sơ xác minh và chờ máy chủ trả lời. Lỗi máy chủ được ném ra để màn hình hiện. */
    submitVerification: async (input: VerificationInput, form?: VerificationForm) => {
      const rules = ruleChecks(input, new Date().getFullYear());
      if (!canSubmit(rules)) return rules;
      if (!isDemo && form) { await live.pushProfile(s.profile, hubId); await live.submitVerification(s.userId as string, s.profile, form); patch({ onboarded: true }); await refresh(); return []; }
      const inPerson = form?.method === 'in_person';
      const r = combineReview(rules, { risk: 'low', score: 10, summary: 'Thông tin khai báo đầy đủ, chưa thấy mâu thuẫn (AI mô phỏng trong bản demo).', flags: [] });
      set((o) => ({ ...o, onboarded: true, verification: { status: inPerson ? 'awaiting_in_person' : 'awaiting_admin', method: inPerson ? 'in_person' : 'photo', inPersonCode: inPerson ? uid().slice(0, 6).toUpperCase() : null, legalName: input.legalName, city: input.currentCity, docType: input.docType, submittedAt: now(), risk: r.risk, score: r.score, summary: r.summary, flags: r.flags.map((f) => f.code) } }));
      return [];
    },
    reviewMine: (status: Verification['status'], note?: string) => set((o) => o.verification ? { ...o, verification: { ...o.verification, status, note } } : o),
    reviewQueue: (id: string, d: 'approved' | 'rejected' | 'needs_info', note?: string) => isDemo ? set((o) => ({ ...o, queueDone: { ...o.queueDone, [id]: d } })) : remote(() => live.rpcCall('admin_review_verification', { p_id: id, p_decision: d, p_note: note ?? null })),
    skipClock: () => set((o) => ({ ...o, clockHours: o.clockHours + 24 })),
    sendIntent: (id: string, hub: string | null) => {
      if (!isDemo) return remote(() => live.rpcCall('send_match_intent', { p_receiver: id, p_hub: hubId(hub), p_mode: hub ? 'in_person' : 'online', p_reason: {} }));
      set((o) => ({ ...o, sentIntents: [...o.sentIntents, id] })); setTimeout(() => set((o) => makeConversation(o, id, hub)), 900);
    },
    accept: (id: string, hub: string | null) => { const i = s.incoming.find((x) => x.personId === id); if (!isDemo && i?.intentId) return remote(() => live.rpcCall('respond_match_intent', { p_intent: i.intentId, p_accept: true })); set((o) => makeConversation({ ...o, sentIntents: [...o.sentIntents, id] }, id, hub)); },
    decline: (id: string) => { const i = s.incoming.find((x) => x.personId === id); if (!isDemo && i?.intentId) return remote(() => live.rpcCall('respond_match_intent', { p_intent: i.intentId, p_accept: false })); set((o) => ({ ...o, declined: [...o.declined, id] })); },
    block: (id: string) => { if (!isDemo) return remote(() => live.block(s.userId as string, id)); set((o) => ({ ...o, blocked: [...o.blocked, id], conversations: o.conversations.filter((c) => c.personId !== id) })); },
    sendMessage: (cid: string, text: string) => {
      if (!isDemo) { live.sendMessage(s.userId as string, cid, text).then(syncMessages).catch(fail); return; }
      set((o) => ({ ...o, conversations: o.conversations.map((c) => c.id === cid ? { ...c, messages: [...c.messages, { id: uid(), from: 'me', text }] } : c) }));
      setTimeout(() => set((o) => ({ ...o, conversations: o.conversations.map((c) => c.id === cid ? { ...c, messages: [...c.messages, { id: uid(), from: 'them', text: 'Hay quá. Mình hẹn gặp ở Hub nhé?', translated: 'Great. Shall we meet at the Hub?' }] } : c) })), 900);
    },
    propose: (conversationId: string, hub: string, when: string, note: string) => {
      const id = uid(); if (!isDemo) { remote(() => live.rpcCall('propose_meetup', { p_conv: conversationId, p_hub: hubId(hub), p_starts: new Date(when.replace(' ', 'T')).toISOString(), p_minutes: 60, p_note: note })); return null; }
      set((o) => ({ ...o, meetups: [...o.meetups, { id, conversationId, hub, when, note, status: 'agreed', minutes: 60 }] })); return id;
    },
    completeMeetup: (id: string) => { if (!isDemo) return remote(() => live.rpcCall('confirm_meetup', { p_meetup: id, p_stage: 'happened' })); set((o) => { const m = o.meetups.find((x) => x.id === id); return metric({ type: 'meetup_completed', hub: m?.hub ?? null, people: 2, minutes: m?.minutes ?? 60, points: 0, ref: 0, cons: 0, bill: 0, discount: 0 })({ ...o, meetups: o.meetups.map((x) => x.id === id ? { ...x, status: 'completed' } : x) }); }); },
    reviewMeetup: (id: string, safe: boolean, learned = true, again = true, body = '') => { if (!isDemo) return remote(() => live.rpcCall('submit_reference', { p_meetup: id, p_safe: safe, p_learned: learned, p_again: again, p_body: body })); set((o) => ({ ...o, meetups: o.meetups.map((m) => m.id === id ? { ...m, reviewed: true } : m), reports: safe ? o.reports : [...o.reports, { id: uid(), category: 'unsafe_meeting', body: 'Từ nhận xét sau buổi gặp', urgent: true, at: Date.now() }] })); },
    setPresence: (hub: string | null) => { if (!isDemo) { const h = hub ?? s.presence?.hub; if (h) remote(() => live.rpcCall('set_presence', { p_hub: hubId(h), p_on: !!hub })); } patch({ presence: hub ? { hub, until: Date.now() + 7200000 } : null }); },
    addKnowledge: (x: Omit<KnowledgeItem, 'id' | 'status' | 'mine' | 'author' | 'titleEn' | 'bodyEn'>) => { if (!isDemo) return remote(() => live.rpcCall('submit_knowledge', { p_hub: hubId(x.hub), p_kind: 'knowledge_note', p_topic: x.topic, p_locale: s.locale, p_title: x.title, p_body: x.body, p_community: !!x.community, p_consent_by: x.consentBy || null, p_source: x.source || null })); set((o) => ({ ...o, knowledge: [{ ...x, id: uid(), status: 'submitted', mine: true, author: o.profile.displayName, titleEn: x.title, bodyEn: x.body }, ...o.knowledge] })); },
    reviewKnowledge: (id: string, input: PointsInput | null) => {
      if (!isDemo) return remote(() => live.reviewKnowledge(id, input));
      set((o) => {
        const item = o.knowledge.find((k) => k.id === id); if (!item) return o;
        if (!input) return { ...o, knowledge: o.knowledge.map((k) => k.id === id ? { ...k, status: 'rejected' } : k) };
        const r = calcPoints(input); if (!r.approved) return o;
        let ledger = o.ledger;
        if (item.mine) { const month = o.ledger.filter((l) => ['knowledge_approved', 'session_shared'].includes(l.reason) && monthKey(l.at) === monthKey()).reduce((n, l) => n + l.delta, 0); const pts = Math.max(0, Math.min(r.points, MAX_POINTS_PER_MONTH - month)); if (pts > 0) ledger = [{ id: uid(), delta: pts, reason: 'knowledge_approved', at: Date.now(), availableAt: Date.now() + 30 * 86400000, title: item.title }, ...ledger]; }
        return metric({ type: 'knowledge_approved', hub: item.hub, people: 1, minutes: 0, points: r.points, ref: r.points * pointValueVnd(hubRegion(item.hub)), cons: 0, bill: 0, discount: 0 })({ ...o, ledger, knowledge: o.knowledge.map((k) => k.id === id ? { ...k, status: 'published' } : k) });
      });
    },
    grantDemoPoints: () => set((o) => ({ ...o, ledger: [{ id: uid(), delta: 330, reason: 'knowledge_approved', at: Date.now() - 40 * 86400000, availableAt: Date.now() - 10 * 86400000, title: 'Ghi chép mẫu' }, ...o.ledger] })),
    donate: (n: number, hub: string) => { if (!isDemo) return remote(() => live.rpcCall('donate_points', { p_hub: hubId(hub), p_points: n })); set((o) => ({ ...o, ledger: [{ id: uid(), delta: -n, reason: 'fund_donation', at: Date.now(), availableAt: Date.now(), title: 'Quỹ cộng đồng Hub' }, ...o.ledger] })); },
    report: (category: string, body: string, urgent: boolean, target?: string) => { if (!isDemo) return remote(() => live.report(s.userId as string, category, body, urgent, target)); set((o) => ({ ...o, reports: [...o.reports, { id: uid(), category, body, urgent, at: Date.now() }] })); },
    requestHub: (place: string, role: string, host: boolean) => { if (!isDemo) return remote(() => live.requestHub(s.userId as string, place, role, host)); set((o) => ({ ...o, hubRequests: [...o.hubRequests, { place, role, host }] })); },
    addTrip: (t: Trip) => { if (!isDemo) return remote(() => live.addTrip(s.userId as string, t, hubId(t.hub))); set((o) => ({ ...o, profile: { ...o.profile, trips: [...o.profile.trips, t] } })); },
    answerInvitation: (hub: string, topic: string, response: string) => { if (!isDemo) remote(() => live.rpcCall('respond_sharing_invitation', { p_hub: hubId(hub), p_topic: topic, p_response: response })); set((o) => ({ ...o, invitationAnswers: { ...o.invitationAnswers, [`${hub}|${topic}`]: response } })); },
    createSession: async (x: { hub: string; topic: string; title: string; when: string; minutes: number }) => {
      if (!isDemo) { const id = await live.rpcCall<string>('create_sharing_session', { p_hub: hubId(x.hub), p_topic: x.topic, p_title: x.title, p_starts: new Date(x.when.replace(' ', 'T')).toISOString(), p_minutes: x.minutes }); await refresh(); return id; }
      const id = uid(); set((o) => ({ ...o, sessions: [{ ...x, id, role: 'host', hostName: o.profile.displayName, status: 'scheduled', code: uid().slice(0, 8).toUpperCase(), attendees: 0 }, ...o.sessions] })); return id;
    },
    demoAttend: (id: string) => set((o) => ({ ...o, sessions: o.sessions.map((x) => x.id === id ? { ...x, attendees: 6 } : x) })),
    checkIn: (code: string) => { if (!isDemo) return remote(() => live.rpcCall('session_check_in', { p_code: code })); set((o) => ({ ...o, sessions: o.sessions.map((x) => x.code === code.trim().toUpperCase() ? { ...x, checkedIn: true, attendees: x.attendees + 1 } : x) })); },
    endSession: (id: string, minutes: number, summary: string) => { if (!isDemo) return remote(() => live.rpcCall('end_sharing_session', { p_id: id, p_minutes: minutes, p_summary: summary })); set((o) => ({ ...o, sessions: o.sessions.map((x) => x.id === id ? { ...x, status: 'ended', actualMinutes: minutes, summary } : x) })); },
    confirmHosted: (id: string, via: 'hub' | 'people') => {
      if (!isDemo) return remote(() => via === 'hub' ? live.rpcCall('confirm_session_by_hub', { p_id: id, p_minutes: s.sessions.find((x) => x.id === id)?.actualMinutes ?? 60, p_content_ok: true }) : live.rpcCall('finalize_session_by_recipients', { p_id: id }));
      set((o) => { const x = o.sessions.find((y) => y.id === id); if (!x || x.status !== 'ended') return o; const minutes = x.actualMinutes ?? x.minutes; const region = hubRegion(x.hub); const v = sessionValue(x.attendees, minutes, region); const month = o.ledger.filter((l) => ['knowledge_approved', 'session_shared'].includes(l.reason) && monthKey(l.at) === monthKey()).reduce((n, l) => n + l.delta, 0); const pts = Math.max(0, Math.min(v.points, MAX_POINTS_PER_MONTH - month)); return metric({ type: 'session_confirmed', hub: x.hub, people: x.attendees, minutes, points: pts, ref: v.referenceVnd, cons: v.conservativeVnd, bill: 0, discount: 0 })({ ...o, sessions: o.sessions.map((y) => y.id === id ? { ...y, status: 'confirmed', people: x.attendees, points: pts } : y), ledger: pts ? [{ id: uid(), delta: pts, reason: 'session_shared', at: Date.now(), availableAt: Date.now() + 30 * 86400000, title: x.title }, ...o.ledger] : o.ledger }); });
    },
    confirmAttendance: (id: string, timeOk: boolean, contentOk: boolean) => { if (!isDemo) return remote(() => live.rpcCall('confirm_session_as_attendee', { p_id: id, p_time_ok: timeOk, p_content_ok: contentOk })); set((o) => ({ ...o, sessions: o.sessions.map((x) => x.id === id ? { ...x, attendeeConfirmed: true, status: 'confirmed', actualMinutes: x.actualMinutes ?? x.minutes, people: x.attendees } : x) })); },
    claimOffer: (offerId: string) => { if (!isDemo) return remote(() => live.rpcCall('claim_reward', { p_offer: offerId })); set((o) => ({ ...o, vouchers: [{ id: uid(), offerId, code: uid().toUpperCase(), status: 'issued' }, ...o.vouchers] })); },
    quote: (code: string, bill: number) => { if (!isDemo) return remote(() => live.rpcCall('quote_voucher', { p_code: code, p_bill: bill })); set((o) => { const v = o.vouchers.find((x) => x.code === code); const f = o.offers.find((x) => x.id === v?.offerId); if (!v || !f) return o; const q = voucherQuote(bill, f.percent, f.max, f.region); return { ...o, vouchers: o.vouchers.map((x) => x.code === code ? { ...x, status: 'quoted', bill, discount: q.discountVnd, points: q.points, owner: q.ownerPoints, fund: q.fundPoints } : x) }; }); },
    confirmVoucher: (code: string) => { if (!isDemo) return remote(() => live.rpcCall('confirm_voucher', { p_code: code })); set((o) => { const v = o.vouchers.find((x) => x.code === code); const f = o.offers.find((x) => x.id === v?.offerId); if (!v || !f || v.status !== 'quoted') return o; return metric({ type: 'reward_redeemed', hub: null, people: 1, minutes: 0, points: v.points ?? 0, ref: (v.points ?? 0) * pointValueVnd(f.region), cons: v.discount ?? 0, bill: v.bill ?? 0, discount: v.discount ?? 0 })({ ...o, vouchers: o.vouchers.map((x) => x.code === code ? { ...x, status: 'used' } : x), offers: o.offers.map((x) => x.id === f.id ? { ...x, used: x.used + (v.discount ?? 0) } : x), ledger: [{ id: uid(), delta: -(v.points ?? 0), reason: 'reward_redeemed', at: Date.now(), availableAt: Date.now(), title: f.partner }, ...o.ledger], fund: { ...o.fund, balance: o.fund.balance + (v.fund ?? 0), monthIn: o.fund.monthIn + (v.fund ?? 0) } }); }); },
    setBudget: (amount: number) => { const m = s.myPartner; if (!m) return; if (!isDemo) return remote(() => live.rpcCall('set_partner_budget', { p_partner: m.id, p_month: `${monthKey()}-01`, p_amount: amount })); set((o) => o.myPartner ? { ...o, myPartner: { ...o.myPartner, budget: amount } } : o); },
    fundReward: (points: number, userId: string, task: string) => isDemo ? set((o) => ({ ...o, fund: { ...o.fund, balance: o.fund.balance - points, monthOut: o.fund.monthOut + points } })) : remote(() => live.rpcCall('fund_reward', { p_user: userId, p_points: points, p_task: task })),
    setMaxAlerts: (n: number) => { setDailyAlertLimit(n).catch(() => {}); if (!isDemo) remote(() => live.rpcCall('set_alert_limit', { p_value: n })); patch({ maxAlerts: n }); },
    addCost: (hub: string, amount: number) => { if (!isDemo) return remote(() => live.addCost(hubId(hub), amount)); set((o) => ({ ...o, costs: [...o.costs, { hub, month: monthKey(), amount }] })); },
    loadStats: async (): Promise<StatRow[]> => {
      if (!isDemo) return live.loadStats(slugOf);
      const rows = new Map<string, StatRow>();
      const row = (m: string, hub: string) => { const k = `${m}|${hub}`; if (!rows.has(k)) rows.set(k, { month: m, hub, region: hubRegion(hub), cost: 0, sessions: 0, minutes: 0, people: 0, equivalentHours: 0, knowledge: 0, points: 0, redeemed: 0, bill: 0, discount: 0, reference: 0, conservative: 0, outcomes: 0 }); return rows.get(k) as StatRow; };
      for (const e of s.metrics) { const r = row(monthKey(e.at), e.hub ?? 'app'); if (e.type === 'session_confirmed') { r.sessions += 1; r.minutes += e.minutes; r.people += e.people; r.equivalentHours += (e.minutes / 60) * e.people / 2; r.points += e.points; r.reference += e.ref; r.conservative += e.cons; } if (e.type === 'knowledge_approved') { r.knowledge += 1; r.points += e.points; r.reference += e.ref; } if (e.type === 'reward_redeemed') { r.redeemed += e.points; r.bill += e.bill; r.discount += e.discount; } }
      for (const c of s.costs) row(c.month, c.hub).cost += c.amount;
      return [...rows.values()].sort((a, b) => (a.month + a.hub).localeCompare(b.month + b.hub));
    },
    submitApplication: (x: Omit<VenueApp, 'id' | 'status'>) => { if (!isDemo) return remote(() => live.submitApplication(s.userId as string, x)); set((o) => ({ ...o, applications: [{ ...x, id: uid(), status: 'submitted' } as VenueApp, ...o.applications] })); },
    reviewApplication: (id: string, status: string) => {
      if (!isDemo) { const x = s.applications.find((y) => y.id === id); return remote(() => live.rpcCall('review_hub_application', { p_id: id, p_decision: status, p_slug: status === 'approved' ? `co-so-${id.slice(0, 8)}` : null, p_region: status === 'approved' ? x?.regionId ?? 'vn-hanoi' : null })); }
      set((o) => {
        const x = o.applications.find((y) => y.id === id); if (!x) return o; const approved = status === 'approved';
        const extra = approved ? [...o.extraHubs, { slug: `co-so-${id}`, region: 'vn-hanoi', level: 'partner' as const, wageRegion: 1 as const, lat: x.lat ?? 21.03, lng: x.lng ?? 105.84, radius: 150, vi: { name: x.venueName, summary: x.description ?? '', story: x.idea ?? '', meeting: x.address }, en: { name: x.venueName, summary: x.description ?? '', story: x.idea ?? '', meeting: x.address }, topics: [] }] : o.extraHubs;
        return { ...o, extraHubs: extra, myPartner: approved && x.reward ? { id: `p-${id}`, name: x.venueName, region: 1, budget: 0, used: 0, revenue: 0, cap: partnerBudgetCap(0), points: 0 } : o.myPartner, applications: o.applications.map((y) => y.id === id ? { ...y, status } : y) };
      });
    },
  };
  function hubId(slug: string | null | undefined) { if (!slug) return null; return s.remoteHubs.find((h) => h.slug === slug)?.id ?? null; }
  function slugOf(id: string | null) { return s.remoteHubs.find((h) => h.id === id)?.slug ?? 'app'; }
}
type Ctx = { s: State; ready: boolean; t: (k: Key, v?: Record<string, string | number>) => string; can: (role: string) => boolean; a: ReturnType<typeof useActions>; now: number; hubs: HubSeed[]; people: Person[]; verified: boolean; matches: (mode: MeetMode, hub?: string) => Match[]; demand: Demand[]; balance: { available: number; pending: number; hours: number }; queue: QueueItem[] };
const C = createContext<Ctx | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial); const [ready, setReady] = useState(false); const loaded = useRef(false);
  const set = useCallback((f: (x: State) => State) => setS(f), []);
  const refresh = useCallback(async () => { if (isDemo) return; const next = await live.pull(); setS((o) => ({ ...o, ...next })); }, []);
  useEffect(() => {
    if (isDemo) { AsyncStorage.getItem(KEY).then((v) => { if (v) setS({ ...initial, ...JSON.parse(v), lastError: null }); }).catch(() => {}).finally(() => { loaded.current = true; setReady(true); }); return; }
    setS((o) => ({ ...o, knowledge: [], sessions: [], offers: [], people: [], incoming: [], metrics: [] }));
    AsyncStorage.getItem(LOCALE_KEY).then((v) => { if (v && (UI_LOCALES as string[]).includes(v)) setS((o) => (o.userId ? o : { ...o, uiLocale: v as UiLocale, locale: contentLocale(v as UiLocale) })); }).catch(() => {});
    refresh().catch(() => {}).finally(() => { loaded.current = true; setReady(true); });
  }, [refresh]);
  useEffect(() => { if (isDemo && loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {}); }, [s]);
  const a = useActions(s, set, refresh);
  const sync = useRef(a.syncMessages); sync.current = a.syncMessages;
  useEffect(() => { if (isDemo || !s.userId) return; const id = setInterval(() => sync.current(), 20000); return () => clearInterval(id); }, [s.userId]);
  const value = useMemo<Ctx>(() => {
    const now = Date.now() + s.clockHours * 3600000;
    const me = toMatch(s.profile, 'me', s.blocked);
    const peopleMatches = s.people.filter((p) => !s.blocked.includes(p.id)).map(personMatch);
    let available = 0, pending = 0, earned = 0;
    for (const l of s.ledger.filter((x) => x.delta > 0)) { earned += l.delta; if (l.availableAt > now) pending += l.delta; else available += l.delta; }
    available += s.ledger.filter((x) => x.delta < 0).reduce((n, x) => n + x.delta, 0);
    const local: Demand[] = DEMO_DEMAND.filter((d) => s.profile.gives.includes(d.topic)).map((d) => ({ hub: d.hub, topic: d.topic, count: d.count >= 5 ? d.count : null }));
    const demoQueue: QueueItem[] = DEMO_QUEUE.filter((q) => !s.queueDone[q.id]).map((q) => ({ id: q.id, name: q.name, city: q.city, doc: q.doc, risk: q.risk as QueueItem['risk'], score: q.score, summary: q.summary, flags: q.flags, submittedAt: Date.now() - q.hoursAgo * 3600000 }));
    return { s, ready, a, now, t: (k, v) => translate(s.uiLocale, k, v), can: (role: string) => s.roles.includes('admin') || s.roles.includes(role), hubs: isDemo ? [...HUBS, ...s.extraHubs].map((h) => { const e = s.hubEdits[h.slug]; return e ? { ...h, lat: e.lat ?? h.lat, lng: e.lng ?? h.lng, radius: e.radius ?? h.radius, agreement: e.agreement ?? h.agreement, vi: { ...h.vi, hours: e.hoursVi ?? h.vi.hours }, en: { ...h.en, hours: e.hoursEn ?? h.en.hours } } : h; }) : s.remoteHubs, people: s.people, verified: s.verification?.status === 'approved',
      matches: (mode, hub) => isDemo ? rankMatches(me, peopleMatches, { today: today(), mode, hubId: hub, minScore: 10 }) : s.remoteMatches.filter((m) => m.mode === mode && (!hub || m.hubId === hub)),
      demand: (isDemo ? local : s.remoteDemand).filter((d) => !['never', 'later', 'willing'].includes(s.invitationAnswers[`${d.hub}|${d.topic}`] ?? '')),
      balance: s.remoteBalance ?? { available: Math.max(0, available), pending, hours: earned / 100 }, queue: isDemo ? demoQueue : s.remoteQueue };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, ready]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useApp() { const v = useContext(C); if (!v) throw new Error('StoreProvider missing'); return v; }
export { reviewWindow };
