import { useRouter } from 'expo-router';
import { useApp } from '../../src/lib/store';
import { APP_STATUS } from '../../src/parts';
import { Banner, Btn, Card, Gap, H2, Screen, Small, Tag } from '../../src/ui';
export default function Status() { const { t, s } = useApp(); const r = useRouter();
  return <Screen back title={t('vsTitle')}>{s.applications.length ? s.applications.map((a) => <Card key={a.id}><H2>{a.venueName}</H2><Small style={{ marginVertical: 4 }}>{a.address}</Small><Tag tone={APP_STATUS[a.status][1]} label={t(APP_STATUS[a.status][0])} /></Card>) : <Banner title={t('vsNone')} />}{s.myPartner && <><Btn label={t('pdOpen')} onPress={() => r.push('/partner/dashboard')} /><Gap h={8} /></>}<Btn kind={s.myPartner ? 'secondary' : 'primary'} label={t('vpApply')} onPress={() => r.push('/partner/apply')} /></Screen>; }
