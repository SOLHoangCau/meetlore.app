import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { topicName, useApp } from '../../src/lib/store';
import { VerifiedGate } from '../../src/parts';
import { Banner, Btn, Chip, Field, Gap, Screen, Small, Wrap } from '../../src/ui';

export default function NewSession() {
  const q = useLocalSearchParams<{ hub?: string; topic?: string }>(); const { t, s, a, hubs } = useApp(); const r = useRouter();
  const topics = [...new Set([...(q.topic ? [q.topic] : []), ...s.profile.gives])];
  const [x, set] = useState({ hub: q.hub ?? hubs[0]?.slug ?? '', topic: q.topic ?? topics[0] ?? '', title: '', when: '', minutes: '120' }); const [err, setErr] = useState('');
  const save = async () => { const m = Number(x.minutes); if (x.title.trim().length < 3 || !x.hub || !x.topic || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(x.when) || !(m >= 15 && m <= 240)) return setErr(t('ssBadInput')); try { const id = await a.createSession({ hub: x.hub, topic: x.topic, title: x.title.trim(), when: x.when, minutes: m }); r.replace(`/sessions/${id}`); } catch (e: any) { setErr(e.message); } };
  return <Screen back title={t('ssNew')}><VerifiedGate><Banner title={t('ssFree')} /><Small style={{ marginBottom: 6 }}>{t('kHub')}</Small><Wrap style={{ marginBottom: 12 }}>{hubs.map((h) => <Chip key={h.slug} label={h[s.locale].name} on={x.hub === h.slug} onPress={() => set({ ...x, hub: h.slug })} />)}</Wrap><Small style={{ marginBottom: 6 }}>{t('ssTopic')}</Small><Wrap style={{ marginBottom: 12 }}>{topics.map((id) => <Chip key={id} label={topicName(id, s.locale)} on={x.topic === id} onPress={() => set({ ...x, topic: id })} />)}</Wrap>
    <Field label={t('ssTitle')} value={x.title} onChangeText={(v) => set({ ...x, title: v })} /><Field label={t('ssWhen')} placeholder="2026-12-20 09:30" value={x.when} onChangeText={(v) => set({ ...x, when: v })} /><Field label={t('ssMinutes')} keyboardType="number-pad" value={x.minutes} onChangeText={(v) => set({ ...x, minutes: v })} /><Small>{t('ssRule')}</Small><Gap h={12} />{!!err && <Banner tone="son" title={err} />}<Btn label={t('ssCreate')} onPress={save} /></VerifiedGate></Screen>;
}
