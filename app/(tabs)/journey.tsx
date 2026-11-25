import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useApp, type Trip } from '../../src/lib/store';
import { SessionCard } from '../../src/parts';
import { Btn, Card, Gap, H2, LinkRow, P, Screen, Small, Tag } from '../../src/ui';

/** Nhật ký riêng của người dùng. Chỉ dựng từ kế hoạch và hoạt động đã có, không lưu vết GPS. */
export default function Journey() {
  const { t, s, hubs } = useApp(); const r = useRouter(); const today = new Date().toISOString().slice(0, 10); const name = (slug: string | null) => hubs.find((h) => h.slug === slug)?.[s.locale].name;
  const trip = (x: Trip, i: number) => <Card key={`${x.city}${x.from}${i}`} onPress={x.hub ? () => r.push(`/h/${x.hub}`) : undefined}><H2>{x.city}{x.country ? `, ${x.country}` : ''}</H2><Small>{x.from} → {x.to}</Small>{!!x.purpose && <P muted>{x.purpose}</P>}<Gap h={6} /><Tag tone={x.hub ? 'indigo' : 'plain'} label={name(x.hub) ?? t('jNoHub')} /></Card>;
  const mine = s.sessions.filter((x) => x.role !== 'viewer'); const day = (w: string) => w.slice(0, 10);
  const meetup = (m: (typeof s.meetups)[number]) => <LinkRow key={m.id} label={`${t('meetTitle')} · ${name(m.hub) ?? ''}`} sub={m.when} onPress={() => r.push(`/meetups/${m.id}`)} />;
  const section = (title: string, items: ReactNode[]) => <><H2 style={{ marginBottom: 8 }}>{title}</H2>{items.length ? items : <Small style={{ marginBottom: 8 }}>{t('jNone')}</Small>}<Gap /></>;
  const open = s.meetups.filter((m) => m.status !== 'completed');
  return <Screen title={t('jTitle')}><P muted style={{ marginBottom: 12 }}>{t('jBody')}</P><Btn label={t('jAdd')} onPress={() => r.push('/journey/new')} /><Gap />
    {section(t('jNow'), [...s.profile.trips.filter((x) => x.from <= today && x.to >= today).map(trip), ...mine.filter((x) => x.status === 'scheduled' && day(x.when) === today).map((x) => <SessionCard key={x.id} x={x} />), ...open.filter((m) => day(m.when) === today).map(meetup)])}
    {section(t('jUpcoming'), [...s.profile.trips.filter((x) => x.from > today).sort((a, b) => a.from.localeCompare(b.from)).map(trip), ...mine.filter((x) => x.status === 'scheduled' && day(x.when) > today).map((x) => <SessionCard key={x.id} x={x} />), ...open.filter((m) => day(m.when) > today).map(meetup)])}
    {section(t('jHome'), s.profile.localHubs.map((h) => <LinkRow key={h} label={name(h) ?? h} onPress={() => r.push(`/h/${h}`)} />))}
    {section(t('jPast'), [...s.profile.trips.filter((x) => x.to < today).map(trip), ...mine.filter((x) => x.status !== 'scheduled').map((x) => <SessionCard key={x.id} x={x} />), ...s.meetups.filter((m) => m.status === 'completed').map(meetup)])}
    <H2 style={{ marginBottom: 4 }}>{t('jLearned')}</H2><LinkRow label={t('kTitle')} sub={t('kMine') + `: ${s.knowledge.filter((k) => k.mine).length}`} onPress={() => r.push('/knowledge')} /><LinkRow label={t('myPoints')} onPress={() => r.push('/me/points')} /></Screen>;
}
