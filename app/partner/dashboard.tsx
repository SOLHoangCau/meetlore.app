import { useState } from 'react';
import { useApp, vnd } from '../../src/lib/store';
import { Banner, Btn, Card, Field, Gap, H2, Row, Screen, Small, Stat } from '../../src/ui';

export default function Dashboard() {
  const { t, s, a } = useApp(); const m = s.myPartner; const [budget, setBudget] = useState(m ? String(m.budget) : ''); const [code, setCode] = useState(''); const [bill, setBill] = useState('');
  if (!m) return <Screen back title={t('pdTitle')}><Banner tone="turmeric" title={t('pdNone')} /></Screen>;
  const n = Number(budget); const over = n > m.cap;
  return <Screen back title={m.name}><Row><Stat value={vnd(m.used)} label={t('pdUsed')} /><Stat value={vnd(Math.max(0, m.budget - m.used))} label={t('pdRemain')} /></Row><Gap h={8} /><Row><Stat value={vnd(m.revenue)} label={t('pdRevenue')} /><Stat value={m.points} label={t('pdPoints')} /></Row><Gap />
    <Card><H2 style={{ marginBottom: 8 }}>{t('pdBudget')}</H2><Field label={t('pdCap', { v: vnd(m.cap) })} hint={t('pdCapB')} keyboardType="number-pad" value={budget} onChangeText={setBudget} error={over ? t('pdOver') : undefined} /><Btn disabled={over || !(n >= 0) || budget === ''} label={t('pdSave')} onPress={() => a.setBudget(n)} /></Card>
    <Card><H2 style={{ marginBottom: 8 }}>{t('pdRedeem')}</H2><Field label={t('pdCode')} autoCapitalize="characters" value={code} onChangeText={setCode} /><Field label={t('pdBill')} keyboardType="number-pad" value={bill} onChangeText={setBill} /><Btn disabled={code.trim().length < 4 || !(Number(bill) > 0)} label={t('rwQuote')} onPress={() => { a.quote(code.trim().toUpperCase(), Number(bill)); setCode(''); setBill(''); }} /><Small style={{ marginTop: 6 }}>{t('rwShow')}</Small></Card></Screen>;
}
