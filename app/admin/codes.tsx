import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Card, Field, Gap, H2, P, Row, Screen, Small, Stat } from '../../src/ui';

export default function Codes() {
  const { t, s, a } = useApp(); const [n, setN] = useState('10'); const [uses, setU] = useState('1'); const [note, setNote] = useState(''); const [codes, setCodes] = useState<string[]>([]); const [err, setErr] = useState('');
  return <Screen back title={t('codesTitle')}><Row><Stat value={s.capacity.used} label={t('codesUsed')} /><Stat value={s.capacity.max} label={t('codesMax')} /></Row><Gap />
    <Banner title={t('codesRule')} />
    <Field label={t('codesCount')} keyboardType="number-pad" value={n} onChangeText={setN} /><Field label={t('codesUses')} keyboardType="number-pad" value={uses} onChangeText={setU} /><Field label={t('codesNote')} value={note} onChangeText={setNote} />
    {!!err && <Small>{err}</Small>}
    <Btn disabled={!(Number(n) >= 1 && Number(n) <= 200 && Number(uses) >= 1)} label={t('codesMake')} onPress={async () => { try { setCodes(await a.createCodes(Number(n), Number(uses), note)); } catch (e: any) { setErr(e.message); } }} />
    {codes.length > 0 && <Card><H2 style={{ marginBottom: 8 }}>{t('codesNew')}</H2>{codes.map((c) => <P key={c} selectable>{c}</P>)}<Gap h={8} /><Btn kind="secondary" label={t('codesShare')} onPress={() => Platform.OS === 'web' ? (globalThis as any).navigator?.clipboard?.writeText(codes.join('\n')) : Share.share({ message: codes.join('\n') })} /></Card>}</Screen>;
}
