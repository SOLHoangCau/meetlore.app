import { useLocalSearchParams } from 'expo-router';
import { topicName, useApp } from '../../src/lib/store';
import { Gap, H1, P, Screen, Small } from '../../src/ui';
export default function K() { const { id } = useLocalSearchParams<{ id: string }>(); const { t, s, hubs } = useApp(); const k = s.knowledge.find((x) => x.id === id); if (!k) return <Screen back title="404"><P>—</P></Screen>; const en = s.locale === 'en';
  return <Screen back><Small>{hubs.find((h) => h.slug === k.hub)?.[s.locale].name} · {topicName(k.topic, s.locale)}</Small><Gap h={6} /><H1>{en ? k.titleEn : k.title}</H1><Small style={{ marginVertical: 8 }}>{t('kBy', { x: k.author })}</Small><P>{en ? k.bodyEn : k.body}</P></Screen>; }
