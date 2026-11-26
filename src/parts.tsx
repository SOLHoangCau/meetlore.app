import { useRouter } from 'expo-router';
import { Linking, Share, View } from 'react-native';
import { HUBS, LANGUAGES, type HubSeed } from './data/catalog';
import { LiveMap } from './components/LiveMap';
import { GOONG_KEY } from './lib/maps';
import { topicName, useApp, type Session } from './lib/store';
import { c, space } from './theme';
import { Avatar, Banner, Btn, Card, Gap, H2, P, Row, Small, Tag, Wrap } from './ui';
import type { Match, MatchReason } from '../supabase/functions/_shared/matching';

export const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.native ?? code;
export function VerifiedGate({ children }: { children: any }) {
  const { t, s, verified } = useApp(); const r = useRouter();
  if (verified) return children;
  const started = !!s.verification;
  return <Banner tone="turmeric" title={t('vLocked')} body={t('vLockedB')}>{s.previewCount != null && <P style={{ marginTop: 8 }}>{t('previewCount', { n: s.previewCount })}</P>}<Gap h={8} /><Btn kind="secondary" label={started ? t('vSee') : t('vFinish')} onPress={() => r.push(started ? '/verification' : '/onboarding/background')} /></Banner>;
}
/** Bản đồ Goong khi có EXPO_PUBLIC_GOONG_MAPTILES_KEY; nếu không, dùng sơ đồ vẽ tay. */
export function HubMap(p: { hubs: HubSeed[]; onPick: (slug: string) => void }) {
  const { s } = useApp();
  return GOONG_KEY ? <LiveMap hubs={p.hubs} label={(h) => h[s.locale].name} onPick={p.onPick} /> : <SchematicMap {...p} />;
}
function SchematicMap({ hubs, onPick }: { hubs: HubSeed[]; onPick: (slug: string) => void }) {
  const lats = hubs.map((h) => h.lat), lngs = hubs.map((h) => h.lng); const pad = 0.0001; const x0 = Math.min(...lngs) - pad, x1 = Math.max(...lngs) + pad, y0 = Math.min(...lats) - pad, y1 = Math.max(...lats) + pad; const { s } = useApp();
  return <View style={{ height: 190, backgroundColor: c.indigoSoft, borderRadius: 12, overflow: 'hidden', marginBottom: space.s, borderWidth: 1, borderColor: c.line }}>
    {[28, 62, 96, 130, 164].map((y) => <View key={y} style={{ position: 'absolute', left: -20, right: -20, top: y, height: 1, backgroundColor: c.white, opacity: 0.7, transform: [{ rotate: '-4deg' }] }} />)}
    {hubs.map((h) => <Row key={h.slug} style={{ position: 'absolute', left: `${10 + ((h.lng - x0) / (x1 - x0)) * 52}%`, top: `${74 - ((h.lat - y0) / (y1 - y0)) * 60}%`, gap: 4 }}>
      <View accessible accessibilityRole="button" accessibilityLabel={h[s.locale].name} onTouchEnd={() => onPick(h.slug)} {...({ onClick: () => onPick(h.slug) } as any)} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.son, borderWidth: 2, borderColor: c.white }} /><Small style={{ color: c.ink, fontFamily: 'BeVietnamPro_500Medium' }}>{h[s.locale].name}</Small></Row>)}
  </View>;
}
export function reasonText(reason: MatchReason, app: ReturnType<typeof useApp>) {
  const { t, s, hubs } = app;
  switch (reason.kind) {
    case 'gives': return t('rGives', { x: topicName(reason.topicId, s.locale) });
    case 'receives': return t('rReceives', { x: topicName(reason.topicId, s.locale) });
    case 'gives_language': return t('rGivesL', { x: langName(reason.languageCode) });
    case 'receives_language': return t('rRecvL', { x: langName(reason.languageCode) });
    case 'same_hub': return t('rHub', { x: hubs.find((h) => h.slug === reason.hubId)?.[s.locale].name ?? '' });
    case 'same_time': return t('rTime', { n: reason.days });
  }
}
export const LM = { practice: ['lmPractice', 'son'], direct: ['lmDirect', 'moss'], translate: ['lmTranslate', 'indigo'] } as const;
export function MatchCard({ m }: { m: Match }) {
  const app = useApp(); const { t, s, a } = app; const r = useRouter(); const p = app.people.find((x) => x.id === m.candidateId); if (!p) return null; const conv = s.conversations.find((c2) => c2.personId === p.id); const sent = s.sentIntents.includes(p.id); const lm = LM[m.languageMode];
  return <Card onPress={() => r.push(`/people/${p.id}`)}><Row style={{ alignItems: 'center', gap: 12, marginBottom: 4 }}><Avatar uri={p.avatar} name={p.name} /><View style={{ flex: 1, alignItems: 'flex-start' }}><H2>{p.name}</H2><Tag tone={lm[1]} label={t(lm[0])} /></View></Row><P muted>{s.locale === 'en' ? p.headlineEn : p.headline}</P><Gap h={8} />{m.reasons.slice(0, 3).map((x, i) => <Small key={i} style={{ color: c.ink }}>• {reasonText(x, app)}</Small>)}<Gap h={12} />{conv ? <Btn kind="secondary" label={t('openChat')} onPress={() => r.push(`/messages/${conv.id}`)} /> : <Btn disabled={sent} label={sent ? t('sent') : t('connect')} onPress={() => a.sendIntent(p.id, m.hubId)} />}</Card>;
}
export function SafetyPanel({ plan }: { plan?: string }) {
  const { t, s } = useApp(); const helper = s.profile.helpers[0];
  return <Card style={{ borderColor: c.son }}><H2 style={{ marginBottom: 8 }}>{t('safetyTitle')}</H2><Wrap>{([['113', 'callPolice'], ['115', 'callAmb'], ['114', 'callFire']] as const).map(([n, k]) => <Btn key={n} kind="danger" label={t(k)} onPress={() => Linking.openURL(`tel:${n}`)} />)}</Wrap><Gap h={8} />{helper && <Btn kind="secondary" label={t('callHelper', { x: helper.name })} onPress={() => Linking.openURL(`tel:${helper.phone}`)} />}{plan && <><Gap h={8} /><Btn kind="secondary" label={t('sharePlan')} onPress={() => Share.share({ message: plan })} /></>}</Card>;
}
export function InvitationCard({ hub, topic, count }: { hub: string; topic: string; count: number | null }) {
  const { t, s, a, hubs } = useApp(); const r = useRouter(); const name = topicName(topic, s.locale); const place = hubs.find((h) => h.slug === hub)?.[s.locale].name ?? '';
  return <Card style={{ borderColor: c.son }}><Small style={{ color: c.son }}>{t('invTitle')} · {place}</Small><H2 style={{ marginVertical: 4 }}>{count ? t('invCount', { n: count, topic: name }) : t('invSome', { topic: name })}</H2><P muted>{t('invQ')}</P><Gap h={10} /><Btn label={t('invYes')} onPress={() => { a.answerInvitation(hub, topic, 'willing'); r.push({ pathname: '/sessions/new', params: { hub, topic } }); }} /><Gap h={8} /><Row><Btn style={{ flex: 1 }} kind="secondary" label={t('invLater')} onPress={() => a.answerInvitation(hub, topic, 'later')} /><Btn style={{ flex: 1 }} kind="ghost" label={t('invNever')} onPress={() => a.answerInvitation(hub, topic, 'never')} /></Row></Card>;
}
export function SessionCard({ x }: { x: Session }) {
  const { t, s, hubs } = useApp(); const r = useRouter(); const st = { scheduled: ['ssPlanned', 'indigo'], ended: ['ssEnded', 'turmeric'], confirmed: ['ssDone', 'moss'], disputed: ['ssDisputed', 'son'] } as const; const [k, tone] = st[x.status];
  return <Card onPress={() => r.push(`/sessions/${x.id}`)}><Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}><H2 style={{ flex: 1 }}>{x.title}</H2><Tag tone={tone} label={t(k)} /></Row><Small>{hubs.find((h) => h.slug === x.hub)?.[s.locale].name} · {x.when} · {x.minutes}′</Small><Small>{t('ssHost', { x: x.hostName })}</Small></Card>;
}
export const hubBySlug = (slug: string, extra: HubSeed[] = []) => [...HUBS, ...extra].find((h) => h.slug === slug);
export const APP_STATUS: Record<string, any> = { submitted: ['asSubmitted', 'indigo'], site_check: ['asSite', 'turmeric'], needs_info: ['asInfo', 'turmeric'], approved: ['asApproved', 'moss'], rejected: ['asRejected', 'son'] };
