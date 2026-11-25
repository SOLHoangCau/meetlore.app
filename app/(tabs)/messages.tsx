import { useRouter } from 'expo-router';
import { useApp } from '../../src/lib/store';
import { VerifiedGate } from '../../src/parts';
import { Banner, LinkRow, Screen } from '../../src/ui';
export default function Messages() { const { t, s, people } = useApp(); const r = useRouter();
  return <Screen title={t('msgTitle')}><VerifiedGate>{s.conversations.length ? s.conversations.map((c) => <LinkRow key={c.id} label={people.find((p) => p.id === c.personId)?.name ?? ''} sub={c.messages.at(-1)?.text} onPress={() => r.push(`/messages/${c.id}`)} />) : <Banner title={t('noMsg')} />}</VerifiedGate></Screen>; }
