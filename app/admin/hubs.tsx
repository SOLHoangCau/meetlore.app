import { useState } from 'react';
import { View } from 'react-native';
import { currentPosition } from '../../src/lib/nearby';
import { useApp } from '../../src/lib/store';
import type { HubSeed } from '../../src/data/catalog';
import { Banner, Btn, Card, Check, Field, Gap, H2, Row, Screen, Small, Tag } from '../../src/ui';

function HubEdit({ h }: { h: HubSeed }) {
  const { t, s, a } = useApp(); const [open, setOpen] = useState(false); const [x, set] = useState({ lat: String(h.lat), lng: String(h.lng), radius: String(h.radius), hoursVi: h.vi.hours ?? '', hoursEn: h.en.hours ?? '', agreement: !!h.agreement }); const [msg, setMsg] = useState('');
  return <Card><Row style={{ justifyContent: 'space-between' }}><H2 style={{ flex: 1 }}>{h[s.locale].name}</H2><Tag tone={h.agreement ? 'moss' : 'son'} label={t(h.agreement ? 'hubAgreeYes' : 'hubAgreeNo')} /></Row>
    <Small>{h.venue ?? ''} · {h.radius} m · {h.lat.toFixed(5)}, {h.lng.toFixed(5)}</Small>
    {!open ? <Btn kind="ghost" label={t('hubEdit')} onPress={() => setOpen(true)} /> : <><Gap h={8} />
      <Btn kind="secondary" label={t('hubHere')} onPress={async () => { const p = await currentPosition(); if (p) { set({ ...x, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }); setMsg(t('hubGot')); } else setMsg(t('hubNoLoc')); }} />{!!msg && <Small>{msg}</Small>}<Gap h={8} />
      <Row><View style={{ flex: 1 }}><Field label="Lat" value={x.lat} onChangeText={(v) => set({ ...x, lat: v })} /></View><View style={{ flex: 1 }}><Field label="Lng" value={x.lng} onChangeText={(v) => set({ ...x, lng: v })} /></View></Row>
      <Field label={t('hubRadius')} keyboardType="number-pad" value={x.radius} onChangeText={(v) => set({ ...x, radius: v })} />
      <Field label={t('hubHoursVi')} value={x.hoursVi} onChangeText={(v) => set({ ...x, hoursVi: v })} /><Field label={t('hubHoursEn')} value={x.hoursEn} onChangeText={(v) => set({ ...x, hoursEn: v })} />
      <Check label={t('hubAgreeCheck')} on={x.agreement} onPress={() => set({ ...x, agreement: !x.agreement })} />
      <Btn disabled={!(Number(x.radius) >= 150 && Number(x.radius) <= 2000) || isNaN(Number(x.lat)) || isNaN(Number(x.lng))} label={t('hubSave')} onPress={() => { a.updateHub(h.slug, { lat: Number(x.lat), lng: Number(x.lng), radius: Number(x.radius), hoursVi: x.hoursVi, hoursEn: x.hoursEn, agreement: x.agreement }); setOpen(false); }} /></>}</Card>;
}
export default function Hubs() {
  const { t, hubs } = useApp();
  return <Screen back title={t('adHubs')}><Banner tone="turmeric" title={t('hubAgreeRule')} />{hubs.map((h) => <HubEdit key={h.slug} h={h} />)}</Screen>;
}
