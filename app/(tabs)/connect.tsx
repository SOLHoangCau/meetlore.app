import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { InvitationCard, MatchCard, VerifiedGate } from '../../src/parts';
import { Banner, Btn, Card, Chip, Gap, H2, P, Row, Screen, Wrap } from '../../src/ui';
export default function Connect() {
  const { t, s, a, matches, hubs, people, demand } = useApp(); const r = useRouter(); const { hub } = useLocalSearchParams<{ hub?: string }>(); const [mode, setMode] = useState<'in_person' | 'online'>('in_person'); const invites = s.incoming.map((i) => people.find((p) => p.id === i.personId)).filter((p): p is NonNullable<typeof p> => !!p && !s.declined.includes(p.id) && !s.blocked.includes(p.id) && !s.conversations.some((c) => c.personId === p.id));
  const list = matches(mode, mode === 'in_person' ? hub : undefined).filter((m) => !invites.some((p) => p.id === m.candidateId) && !s.declined.includes(m.candidateId));
  return <Screen title={t('connectTitle')}><VerifiedGate>
    {demand.filter((d) => !hub || d.hub === hub).map((d) => <InvitationCard key={`${d.hub}|${d.topic}`} hub={d.hub} topic={d.topic} count={d.count} />)}
    {invites.length > 0 && <><H2 style={{ marginBottom: 8 }}>{t('invites')}</H2>{invites.map((p) => <Card key={p.id}><H2>{p.name}</H2><P muted>{s.locale === 'en' ? p.headlineEn : p.headline}</P><Gap h={10} /><Row><Btn style={{ flex: 1 }} label={t('accept')} onPress={() => a.accept(p.id, s.incoming.find((i) => i.personId === p.id)?.hub ?? null)} /><Btn style={{ flex: 1 }} kind="secondary" label={t('decline')} onPress={() => a.decline(p.id)} /></Row></Card>)}<Gap h={8} /></>}
    <Wrap style={{ marginBottom: 12 }}><Chip label={t('inPerson')} on={mode === 'in_person'} onPress={() => setMode('in_person')} /><Chip label={t('online')} on={mode === 'online'} onPress={() => setMode('online')} />{hub && <Chip label={`${hubs.find((h) => h.slug === hub)?.[s.locale].name} ×`} on onPress={() => r.setParams({ hub: undefined })} />}</Wrap>
    {list.length ? list.map((m) => <MatchCard key={m.candidateId} m={m} />) : <Banner title={t('noMatch')} body={t('noMatchB')} />}
  </VerifiedGate></Screen>;
}
