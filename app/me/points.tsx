import { useApp, vnd } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Btn, Card, Gap, H2, P, Row, Screen, Small, Stat } from '../../src/ui';
import { pointValueVnd } from '../../supabase/functions/_shared/points';

export default function Points() {
  const { t, s, a, balance, hubs } = useApp(); const shared = s.meetups.filter((m) => m.status === 'completed').reduce((n, m) => n + m.minutes / 60, 0);
  const home = hubs.find((h) => h.slug === (s.profile.localHubs[0] ?? s.profile.trips.find((x) => x.hub)?.hub)) ?? hubs[0]; const region = home?.wageRegion ?? 1; const value = pointValueVnd(region); const earned = s.ledger.filter((l) => l.delta > 0).reduce((n, l) => n + l.delta, 0);
  return <Screen back title={t('pTitle')}><Row><Stat value={balance.hours} label={t('pHours')} /><Stat value={balance.available} label={t('pAvail')} /></Row><Gap h={8} /><Row><Stat value={balance.pending} label={t('pPending')} /><Stat value={shared} label={t('pShared')} /></Row><Gap h={6} /><Small>{t('pSharedB')}</Small><Gap />
    <Card><H2>{t('pointValue')}</H2><P style={{ marginVertical: 8 }}>{t('pointValueB', { v: vnd(value), r: `${home?.[s.locale].name ?? ''} (${t('regionN', { n: region })})` })}</P><Small>{t('pRef')}: {vnd(earned * value)} đ</Small></Card>
    <Card><H2>{t('pHow')}</H2><P style={{ marginVertical: 8 }}>{t('pHowB')}</P><Small>{t('ssRule')}</Small><Small>{t('pNote')}</Small></Card>
    <Btn kind="secondary" disabled={balance.available < 50 || !home} label={t('pDonate')} onPress={() => a.donate(50, home.slug)} />{isDemo && balance.available === 0 && <Btn kind="ghost" label="Demo +330" onPress={a.grantDemoPoints} />}<Gap />
    <H2 style={{ marginBottom: 6 }}>{t('pHistory')}</H2>{s.ledger.length ? s.ledger.map((l) => <Row key={l.id} style={{ justifyContent: 'space-between', paddingVertical: 8 }}><Small style={{ flex: 1 }}>{l.title}</Small><P>{l.delta > 0 ? `+${l.delta}` : l.delta}</P></Row>) : <Small>{t('pEmpty')}</Small>}</Screen>;
}
