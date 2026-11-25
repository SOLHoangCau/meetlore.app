import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useApp } from '../src/lib/store';
import { SafetyPanel } from '../src/parts';
import { Btn, Card, Gap, H2, P, Screen, Small } from '../src/ui';

/** Nút "Cần giúp đỡ": số khẩn cấp trước, rồi địa chỉ Hub và báo cáo khẩn cho Admin. */
export default function Help() {
  const { hub } = useLocalSearchParams<{ hub?: string }>(); const { t, s, hubs } = useApp(); const r = useRouter(); const h = hubs.find((x) => x.slug === hub);
  const plan = h ? `${h[s.locale].name}: ${h[s.locale].meeting}` : undefined;
  return <Screen back title={t('helpTitle')}><P muted style={{ marginBottom: 12 }}>{t('helpBody')}</P><SafetyPanel plan={plan} />
    {h && <Card><Small>{t('meetPoint')}</Small><H2>{h[s.locale].name}</H2><P>{h[s.locale].meeting}</P><Gap h={8} /><Btn kind="secondary" label={t('helpMap')} onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lng}#map=18/${h.lat}/${h.lng}`)} /></Card>}
    <Btn kind="danger" label={t('helpReport')} onPress={() => r.push({ pathname: '/report', params: { urgent: '1' } })} /><Gap h={8} /><Small>{t('helpHours')}</Small></Screen>;
}
