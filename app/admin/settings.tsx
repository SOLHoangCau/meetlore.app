import { useApp, vnd } from '../../src/lib/store';
import { Card, Check, Chip, Gap, H2, Row, Screen, Small, Wrap } from '../../src/ui';
import { expertHourVnd, pointValueVnd, type WageRegion } from '../../supabase/functions/_shared/points';

export default function Settings() {
  const { t, s, a } = useApp();
  return <Screen back title={t('adSettings')}><Card><H2 style={{ marginBottom: 8 }}>{t('flagsTitle')}</H2>{(['invite_required', 'verification_photo', 'verification_in_person', 'points_redemption', 'message_translation', 'daily_figure'] as const).map((k) => <Check key={k} label={t(`flag_${k}` as any)} on={s.flags[k]} onPress={() => a.setFlag(k, !s.flags[k])} />)}<Small>{t('flagsNote')}</Small></Card>
    <Card><H2 style={{ marginBottom: 8 }}>{t('adAlerts')}</H2><Wrap>{[1, 2, 3].map((n) => <Chip key={n} label={String(n)} on={s.maxAlerts === n} onPress={() => a.setMaxAlerts(n)} />)}</Wrap></Card>
    <Card><H2 style={{ marginBottom: 8 }}>{t('adValues')}</H2>{([1, 2, 3, 4] as WageRegion[]).map((r) => <Row key={r} style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Small>{t('regionN', { n: r })}</Small><Small>{t('adExpertH')}: {vnd(expertHourVnd(r))} đ · {t('adPoint')}: {vnd(pointValueVnd(r))} đ</Small></Row>)}<Gap h={4} /></Card></Screen>;
}
