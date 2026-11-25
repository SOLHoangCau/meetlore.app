import { useState } from 'react';
import { Image } from 'react-native';
import { reviewWindow, useApp, type QueueItem } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Banner, Btn, Card, Field, Gap, H2, P, Row, Screen, Small, Tag, Wrap } from '../../src/ui';

const tone: any = { low: 'moss', medium: 'turmeric', high: 'son' }; const order: any = { high: 0, medium: 1, low: 2 };
function Files({ q }: { q: QueueItem }) {
  const { t, a } = useApp(); const [urls, setUrls] = useState<string[]>([]); const [err, setErr] = useState('');
  if (q.method === 'in_person') return <Small style={{ marginBottom: 8 }}>{t('ipDone')}</Small>;
  if (isDemo) return <Small style={{ marginBottom: 8 }}>{t('filesDemo')}</Small>;
  if (!q.docPath) return <Small style={{ marginBottom: 8 }}>{t('filesGone')}</Small>;
  return <>{urls.length ? urls.map((u) => <Image key={u} source={{ uri: u }} style={{ width: '100%', aspectRatio: 1.5, marginBottom: 8, borderRadius: 8 }} resizeMode="contain" />)
    : <Btn kind="secondary" label={t('filesView')} onPress={async () => { try { setUrls(await Promise.all([q.docPath, q.selfiePath].filter(Boolean).map((p) => a.viewFile(q.id, p as string)))); } catch (e: any) { setErr(e.message); } }} />}
    <Small style={{ marginVertical: 6 }}>{t('filesLogged')}</Small>{!!err && <Small>{err}</Small>}</>;
}
export default function V() {
  const { t, s, a, queue, now } = useApp(); const [notes, setN] = useState<Record<string, string>>({});
  const mine: QueueItem[] = isDemo && s.verification?.status === 'awaiting_admin' ? [{ id: 'me', name: s.verification.legalName, city: s.verification.city, doc: s.verification.docType, risk: s.verification.risk, score: s.verification.score, summary: s.verification.summary, flags: s.verification.flags, submittedAt: s.verification.submittedAt, method: s.verification.method }] : [];
  const list = [...mine, ...queue].sort((x, y) => order[x.risk] - order[y.risk]);
  const decide = (id: string, d: 'approved' | 'rejected' | 'needs_info') => { if (id === 'me') a.reviewMine(d, notes[id]); else a.reviewQueue(id, d, notes[id]); };
  return <Screen back title={t('adVerify')}>{isDemo && <Btn kind="secondary" label={t('adFast')} onPress={a.skipClock} />}<Gap h={12} />{!list.length && <Banner title={t('adEmpty')} />}
    {list.map((q) => { const w = reviewWindow(new Date(q.submittedAt), q.risk); const wait = Math.ceil((+w.opensAt - now) / 3600000); const over = now > +w.dueAt; const note = (notes[q.id] ?? '').trim();
      return <Card key={q.id}><Row style={{ justifyContent: 'space-between' }}><H2 style={{ flex: 1 }}>{q.name}</H2><Tag tone={tone[q.risk]} label={t('adRisk', { x: t(q.risk === 'low' ? 'riskLow' : q.risk === 'high' ? 'riskHigh' : 'riskMedium') })} /></Row>
        <Small>{q.city} · {t(q.doc === 'passport' ? 'docPassport' : 'docId')}{q.last4 ? ` · …${q.last4}` : ''} · {t(q.method === 'in_person' ? 'vmHub' : 'vmPhoto')}</Small>
        {!!q.summary && <P style={{ marginVertical: 8 }}>{q.summary}</P>}<Gap h={6} /><Files q={q} />
        <Wrap style={{ marginBottom: 8 }}>{q.flags.map((f) => <Tag key={f} tone="plain" label={f} />)}{over && <Tag tone="son" label={t('adOver')} />}</Wrap>
        {!isDemo && q.risk !== 'low' && <><Btn kind="ghost" label={t('riskSetLow')} onPress={() => a.setRisk(q.id, 'low')} /><Small style={{ marginBottom: 6 }}>{t('riskSetLowB')}</Small></>}
        <Field label={t('adNote')} value={notes[q.id] ?? ''} onChangeText={(x) => setN({ ...notes, [q.id]: x })} />
        <Btn disabled={wait > 0 || (q.risk === 'high' && !note)} label={wait > 0 ? t('adWait', { n: wait }) : t('adApprove')} onPress={() => decide(q.id, 'approved')} /><Gap h={8} />
        <Row><Btn style={{ flex: 1 }} kind="secondary" disabled={!note} label={t('adInfo')} onPress={() => decide(q.id, 'needs_info')} /><Btn style={{ flex: 1 }} kind="danger" disabled={!note} label={t('adReject')} onPress={() => decide(q.id, 'rejected')} /></Row>
        {!note && <Small style={{ marginTop: 6 }}>{t('adNeedNote')}</Small>}</Card>; })}</Screen>;
}
