import { useState } from 'react';
import { useApp, type ReportItem } from '../../src/lib/store';
import { Banner, Btn, Card, Field, Gap, H2, P, Row, Screen, Small, Tag, Wrap } from '../../src/ui';

const CAT: Record<string, string> = { harassment: 'cHarass', unsafe_meeting: 'cUnsafe', paid_service: 'cPaid', fake_profile: 'cFake', minor: 'cMinor', other: 'cOther' };
function Item({ x }: { x: ReportItem }) {
  const { t, a } = useApp(); const [note, setNote] = useState(''); const [days, setDays] = useState('7'); const ok = note.trim().length >= 5;
  return <Card style={x.urgent ? { borderColor: '#B23521' } : undefined}><Row style={{ justifyContent: 'space-between' }}><H2>{t((CAT[x.category] ?? 'cOther') as any)}</H2>{x.urgent && <Tag tone="son" label={t('repUrgentShort')} />}</Row>
    <Small>{new Date(x.at).toLocaleString()}{x.targetName ? ` · ${t('repTarget', { x: x.targetName })}` : ''}{x.prior ? ` · ${t('repPrior', { n: x.prior })}` : ''}</Small>
    {!!x.body && <P style={{ marginVertical: 6 }}>{x.body}</P>}
    {!!x.messageBody && <Banner title={t('repMsg')} body={x.messageBody} />}
    <Field label={t('adNote')} value={note} onChangeText={setNote} />
    <Wrap><Btn kind="ghost" disabled={!ok} label={t('modDismiss')} onPress={() => a.resolveReport(x.id, 'dismiss', note)} /><Btn kind="secondary" disabled={!ok || !x.targetUserId} label={t('modWarn')} onPress={() => a.resolveReport(x.id, 'warn', note)} />
      {!!x.messageBody && <Btn kind="secondary" disabled={!ok} label={t('modHideMsg')} onPress={() => a.resolveReport(x.id, 'hide_message', note)} />}
      {!!x.knowledgeId && <Btn kind="secondary" disabled={!ok} label={t('modHideK')} onPress={() => a.resolveReport(x.id, 'hide_knowledge', note)} />}</Wrap>
    <Gap h={6} /><Field label={t('modDays')} keyboardType="number-pad" value={days} onChangeText={setDays} />
    <Btn kind="danger" disabled={!ok || !x.targetUserId} label={Number(days) > 0 ? t('modSuspend', { n: Number(days) }) : t('modBan')} onPress={() => a.resolveReport(x.id, 'suspend', note, Number(days) > 0 ? Number(days) : undefined)} />
    {!ok && <Small style={{ marginTop: 6 }}>{t('adNeedNote')}</Small>}</Card>;
}
export default function Reports() {
  const { t, s } = useApp();
  return <Screen back title={t('adReports')}><Small style={{ marginBottom: 8 }}>{t('modRule')}</Small>{s.reports.length ? [...s.reports].sort((a, b) => +b.urgent - +a.urgent || a.at - b.at).map((x) => <Item key={x.id} x={x} />) : <Banner title={t('adEmpty')} />}</Screen>;
}
