import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { HubMap } from '../../src/parts';
import { GOONG_KEY } from '../../src/lib/maps';
import { DailyFigure } from '../../src/components/DailyFigure';
import { Btn, Card, Chip, Gap, H2, P, Row, Screen, Small, Tag, Wrap } from '../../src/ui';
export default function Hubs() {
  const { t, s, hubs } = useApp(); const r = useRouter(); const [area, setArea] = useState('vn-hanoi'); const list = hubs.filter((h) => h.region === area && !h.slug.startsWith('co-so-'));
  return <Screen title={t('hubsTitle')}><DailyFigure /><Wrap style={{ marginBottom: 12 }}><Chip label={t('cHanoi')} on={area === 'vn-hanoi'} onPress={() => setArea('vn-hanoi')} /><Chip label={t('cSapa')} on={area === 'vn-laocai'} onPress={() => setArea('vn-laocai')} /></Wrap><HubMap hubs={list} onPick={(x) => r.push(`/h/${x}`)} />{!GOONG_KEY && <Small style={{ marginBottom: 12 }}>{t('mapNote')}</Small>}
    {list.map((h) => <Card key={h.slug} onPress={() => r.push(`/h/${h.slug}`)}><Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}><H2 style={{ flex: 1 }}>{h[s.locale].name}</H2><Tag tone={h.level === 'open' ? 'moss' : 'indigo'} label={t(h.level === 'open' ? 'open' : 'partner')} /></Row><Gap h={4} /><P muted>{h[s.locale].summary}</P></Card>)}
    <Btn kind="ghost" label={t('suggestHub')} onPress={() => r.push('/hub-request')} /><Btn kind="ghost" label={t('ctaPartner')} onPress={() => r.push('/partner')} /></Screen>;
}
