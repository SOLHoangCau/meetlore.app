import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { topicName, useApp } from '../../src/lib/store';
import { openDirections } from '../../src/lib/maps';
import { isDemo } from '../../src/lib/supabase';
import { InvitationCard, SessionCard } from '../../src/parts';
import { Banner, Btn, Card, Chip, Field, Gap, H1, H2, P, Screen, Small, Tag, Wrap } from '../../src/ui';

export default function Hub() {
  const { slug } = useLocalSearchParams<{ slug: string }>(); const { t, s, a, hubs, verified, demand } = useApp(); const r = useRouter(); const [code, setCode] = useState('');
  const h = hubs.find((x) => x.slug === slug); if (!h) return <Screen back title="404"><P>Hub</P></Screen>;
  const d = h[s.locale]; const en = s.locale === 'en'; const here = s.presence?.hub === h.slug; const items = s.knowledge.filter((k) => k.hub === h.slug && k.status === 'published'); const sessions = s.sessions.filter((x) => x.hub === h.slug); const hint = sessions.find((x) => x.role === 'recipient' && !x.checkedIn)?.code;
  return <Screen back><Tag tone={h.level === 'open' ? 'moss' : 'indigo'} label={t(h.level === 'open' ? 'open' : 'partner')} /><Gap h={8} /><H1>{d.name}</H1>{d.name.startsWith('TriGiao Hub') && <Small style={{ marginTop: 4 }}>{t('hubBrand')}</Small>}<P muted style={{ marginTop: 6 }}>{d.summary}</P><Gap h={12} /><P>{d.story}</P><Gap /><Card><Small>{t('meetPoint')}</Small><P>{d.meeting}</P>{!!d.hours && <Small style={{ marginTop: 4 }}>{t('hubHours')}: {d.hours}</Small>}{!!d.entry && <Small style={{ marginTop: 4 }}>{d.entry}</Small>}<Gap h={8} /><Btn kind="secondary" label={t('dirOpen')} onPress={() => openDirections(h.lat, h.lng, d.name, t)} /></Card>{h.status === 'preparing' ? <Banner tone="turmeric" title={t('hubPreparing')} body={t('hubPreparingB')} /> : h.agreement === false && <Banner tone="turmeric" title={t('hubPilot')} />}
    {s.email ? <>{here ? <Banner tone="moss" title={t('hereOn')}><Gap h={8} /><Btn kind="secondary" label={t('hereOff')} onPress={() => a.setPresence(null)} /></Banner> : <Btn kind="secondary" disabled={!verified || h.status === 'preparing'} label={t('imHere')} onPress={() => a.setPresence(h.slug)} />}<Gap h={8} /><Btn label={t('seeMatches')} onPress={() => r.push({ pathname: '/connect', params: { hub: h.slug } })} /></> : <Btn label={t('ctaStart')} onPress={() => r.push('/auth/sign-up')} />}<Gap />
    {verified && demand.filter((x) => x.hub === h.slug).map((x) => <InvitationCard key={x.topic} hub={x.hub} topic={x.topic} count={x.count} />)}
    {h.topics.length > 0 && <><H2 style={{ marginBottom: 8 }}>{t('topicsHere')}</H2><Wrap>{h.topics.map((x) => <Chip key={x} label={topicName(x, s.locale)} />)}</Wrap><Gap /></>}
    <H2 style={{ marginBottom: 8 }}>{t('ssHere')}</H2>{sessions.length ? sessions.map((x) => <SessionCard key={x.id} x={x} />) : <Small style={{ marginBottom: 8 }}>{t('ssNone')}</Small>}
    {verified && <><Field label={t('ssEnterCode')} hint={isDemo && hint ? t('ssDemoCode', { x: hint }) : undefined} autoCapitalize="characters" value={code} onChangeText={setCode} /><Btn kind="secondary" disabled={code.trim().length < 4} label={t('ssCheckIn')} onPress={() => { a.checkIn(code.trim().toUpperCase()); setCode(''); }} /><Gap h={8} /><Btn kind="ghost" label={t('ssOrganize')} onPress={() => r.push({ pathname: '/sessions/new', params: { hub: h.slug } })} /></>}<Gap />
    <H2 style={{ marginBottom: 8 }}>{t('knowledgeHere')}</H2>{items.map((k) => <Card key={k.id} onPress={() => r.push(`/k/${k.id}`)}><H2>{en ? k.titleEn : k.title}</H2><Small>{t('kBy', { x: k.author })}</Small></Card>)}{verified && <Btn kind="ghost" label={t('kNew')} onPress={() => r.push({ pathname: '/knowledge/new', params: { hub: h.slug } })} />}</Screen>;
}
