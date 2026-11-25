import { useState } from 'react';
import { useApp, vnd, type Voucher } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Banner, Btn, Card, Field, Gap, H2, P, Screen, Small, Stat, Tag } from '../../src/ui';

function Code({ v }: { v: Voucher }) {
  const { t, s, a, balance } = useApp(); const [bill, setBill] = useState(''); const o = s.offers.find((x) => x.id === v.offerId); const short = (v.points ?? 0) > balance.available;
  return <Card><Small>{o?.partner}</Small><Tag tone="son" label={t('rwCode', { x: v.code })} /><Gap h={6} />
    {v.status === 'issued' && <><Small>{t('rwShow')}</Small>{isDemo && <><Gap h={8} /><Field label={t('rwBill')} keyboardType="number-pad" value={bill} onChangeText={setBill} /><Btn kind="secondary" disabled={!(Number(bill) > 0)} label={t('rwQuote')} onPress={() => a.quote(v.code, Number(bill))} /></>}</>}
    {v.status === 'quoted' && <><P>{t('rwQuoted', { d: vnd(v.discount ?? 0), p: v.points ?? 0 })}</P><Small>{t('rwSplit', { o: v.owner ?? 0, f: v.fund ?? 0 })}</Small><Gap h={8} /><Btn disabled={short} label={short ? t('rwLow') : t('rwConfirm')} onPress={() => a.confirmVoucher(v.code)} /></>}
    {v.status === 'used' && <Banner tone="moss" title={t('rwUsed', { d: vnd(v.discount ?? 0), p: v.points ?? 0 })} body={t('rwSplit', { o: v.owner ?? 0, f: v.fund ?? 0 })} />}</Card>;
}
export default function Rewards() {
  const { t, s, a, balance, verified } = useApp(); const open = s.offers.filter((x) => x.budget > x.used);
  return <Screen back title={t('rwTitle')}><Stat value={balance.available} label={t('pAvail')} /><Gap />
    {s.vouchers.length > 0 && <><H2 style={{ marginBottom: 8 }}>{t('rwMine')}</H2>{s.vouchers.map((v) => <Code key={v.id} v={v} />)}<Gap h={8} /></>}
    {open.map((x) => <Card key={x.id}><Small>{x.partner}</Small><H2 style={{ marginVertical: 4 }}>{s.locale === 'en' ? x.en : x.vi}</H2><Small style={{ marginBottom: 10 }}>{t('rwPercent', { n: x.percent })}{x.max ? ` · ${t('rwMax', { v: vnd(x.max) })}` : ''} · {t('regionN', { n: x.region })}</Small><Btn disabled={!verified || balance.available < 1} label={balance.available < 1 ? t('rwLow') : t('rwClaim')} onPress={() => a.claimOffer(x.id)} /></Card>)}</Screen>;
}
