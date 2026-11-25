import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Banner, Btn, Field, Gap, Row, Screen, Stat } from '../../src/ui';

export default function Fund() {
  const { t, s, a } = useApp(); const [x, set] = useState({ user: '', points: '', task: '' }); const f = s.fund; const limit = Math.floor(f.monthIn * 0.5); const n = Number(x.points); const ok = n > 0 && n <= f.balance && f.monthOut + n <= limit && x.task.trim().length > 2 && (isDemo || x.user.trim().length > 8);
  return <Screen back title={t('adFund')}><Banner title={t('adFundB')} /><Row><Stat value={f.balance} label={t('adFundBal')} /><Stat value={limit} label={t('adFundLimit')} /></Row><Gap h={8} /><Row><Stat value={f.monthIn} label={t('adFundIn')} /><Stat value={f.monthOut} label={t('adFundOut')} /></Row><Gap />
    {!isDemo && <Field label={t('adFundUser')} autoCapitalize="none" value={x.user} onChangeText={(v) => set({ ...x, user: v })} />}<Field label={t('adFundTask')} value={x.task} onChangeText={(v) => set({ ...x, task: v })} /><Field label={t('adFundPts')} keyboardType="number-pad" value={x.points} onChangeText={(v) => set({ ...x, points: v })} /><Btn disabled={!ok} label={t('adFundSend')} onPress={() => { a.fundReward(n, x.user.trim(), x.task.trim()); set({ user: '', points: '', task: '' }); }} /></Screen>;
}
