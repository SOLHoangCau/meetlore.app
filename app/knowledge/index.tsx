import { useRouter } from 'expo-router';
import { topicName, useApp, type KnowledgeItem } from '../../src/lib/store';
import { Btn, Card, Gap, H2, P, Row, Screen, Small, Tag } from '../../src/ui';

export default function Knowledge() {
  const { t, s, hubs, verified } = useApp(); const r = useRouter(); const en = s.locale === 'en';
  const pub = s.knowledge.filter((k) => k.status === 'published' && !k.mine); const mine = s.knowledge.filter((k) => k.mine);
  const item = (k: KnowledgeItem) => <Card key={k.id} onPress={() => r.push(`/k/${k.id}`)}>
    <Small>{hubs.find((h) => h.slug === k.hub)?.[s.locale].name} · {topicName(k.topic, s.locale)}</Small>
    <H2 style={{ marginVertical: 4 }}>{en ? k.titleEn : k.title}</H2>
    <Row style={{ justifyContent: 'space-between' }}><Small>{t('kBy', { x: k.author })}</Small>{k.mine && <Tag tone={k.status === 'published' ? 'moss' : 'turmeric'} label={t(k.status === 'published' ? 'stPublished' : k.status === 'rejected' ? 'stRejected' : 'stSubmitted')} />}</Row>
  </Card>;
  return <Screen back title={t('kTitle')}><P muted style={{ marginBottom: 12 }}>{t('kBody')}</P><Btn label={t('kNew')} disabled={!verified} onPress={() => r.push('/knowledge/new')} /><Gap />
    {mine.length > 0 && <><H2 style={{ marginBottom: 8 }}>{t('kMine')}</H2>{mine.map(item)}<Gap h={8} /></>}{pub.map(item)}</Screen>;
}
