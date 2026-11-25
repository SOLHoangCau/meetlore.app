import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Chip, Field, Row, Screen, Small, Wrap } from '../../src/ui';

export default function NewTrip() {
  const { t, s, a, hubs } = useApp(); const r = useRouter(); const [x, set] = useState({ hub: null as string | null, country: 'VN', city: '', from: '', to: '', purpose: '' }); const [err, setErr] = useState('');
  const d = /^\d{4}-\d{2}-\d{2}$/;
  const save = () => { if (!/^[A-Z]{2}$/.test(x.country) || x.city.trim().length < 2) return setErr(t('errHome')); if (!d.test(x.from) || !d.test(x.to) || x.to < x.from) return setErr(t('errDate')); a.addTrip({ ...x, city: x.city.trim() }); r.back(); };
  return <Screen back title={t('jAdd')}><Row><View style={{ flex: 1 }}><Field label={t('jCountry')} value={x.country} maxLength={2} autoCapitalize="characters" onChangeText={(v) => set({ ...x, country: v.toUpperCase() })} /></View><View style={{ flex: 2 }}><Field label={t('jCity')} value={x.city} onChangeText={(v) => set({ ...x, city: v })} /></View></Row>
    <Row><View style={{ flex: 1 }}><Field label={t('from')} placeholder="2026-12-20" value={x.from} onChangeText={(v) => set({ ...x, from: v })} /></View><View style={{ flex: 1 }}><Field label={t('to')} placeholder="2026-12-24" value={x.to} onChangeText={(v) => set({ ...x, to: v })} /></View></Row>
    <Field label={`${t('jPurpose')} (${t('optional')})`} value={x.purpose} onChangeText={(v) => set({ ...x, purpose: v })} /><Small style={{ marginBottom: 6 }}>{t('jHubOpt')}</Small><Wrap style={{ marginBottom: 16 }}>{hubs.map((h) => <Chip key={h.slug} label={h[s.locale].name} on={x.hub === h.slug} onPress={() => set({ ...x, hub: x.hub === h.slug ? null : h.slug })} />)}</Wrap>{!!err && <Banner tone="son" title={err} />}<Btn label={t('jAdd')} onPress={save} /></Screen>;
}
