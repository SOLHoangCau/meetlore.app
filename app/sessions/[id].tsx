import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { approxVnd, topicName, useApp } from '../../src/lib/store';
import { isDemo, rpc } from '../../src/lib/supabase';
import { Banner, Btn, Card, Check, Field, Gap, H1, P, Screen, Small, Tag } from '../../src/ui';
import { sessionValue } from '../../supabase/functions/_shared/points';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { t, s, a, hubs } = useApp(); const x = s.sessions.find((y) => y.id === id); const [f, set] = useState({ minutes: '', summary: '', time: true, content: true }); const [live, setLive] = useState<string | null>(null);
  const showCode = !!x && x.status === 'scheduled' && (x.role === 'host' || s.operatorHubs.includes(x.hub) || s.isAdmin);
  useEffect(() => { if (isDemo || !showCode || !x) return; const load = () => rpc<string>('session_code', { p_id: x.id }).then(setLive).catch(() => {}); load(); const tm = setInterval(load, 30000); return () => clearInterval(tm); }, [showCode, x?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!x) return <Screen back title="404"><P>—</P></Screen>;
  const hub = hubs.find((h) => h.slug === x.hub); const host = x.role === 'host'; const minutes = x.actualMinutes ?? x.minutes; const people = x.people ?? x.attendees; const v = sessionValue(people, minutes, hub?.wageRegion ?? 1); const actual = Number(f.minutes || x.minutes);
  const manager = isDemo || s.isAdmin || s.operatorHubs.includes(x.hub); const canHub = manager && (isDemo || !host);
  return <Screen back><Small>{hub?.[s.locale].name} · {topicName(x.topic, s.locale)}</Small><Gap h={6} /><H1>{x.title}</H1><Small style={{ marginVertical: 6 }}>{t('ssHost', { x: x.hostName })} · {x.when} · {minutes}′</Small><Banner title={t('ssFree')} />
    {!!x.code && x.status === 'scheduled' && (host || manager) && x.role !== 'recipient' && <Card><Tag tone="son" label={t('ssCode', { x: live ?? x.code })} />{!isDemo && <Small style={{ marginTop: 4 }}>{t('ssCodeRotate')}</Small>}<Gap h={8} /><P>{t('ssAttend', { n: x.attendees })}</P>{isDemo && host && <><Gap h={8} /><Btn kind="secondary" label={t('ssDemoAttend')} onPress={() => a.demoAttend(x.id)} /></>}</Card>}
    {host && x.status === 'scheduled' && <><Field label={t('ssActual')} keyboardType="number-pad" value={f.minutes} placeholder={String(x.minutes)} onChangeText={(m) => set({ ...f, minutes: m })} /><Field label={t('ssSummary')} multiline value={f.summary} onChangeText={(m) => set({ ...f, summary: m })} /><Btn label={t('ssEnd')} disabled={f.summary.trim().length < 3 || !(actual >= 15 && actual <= 240)} onPress={() => a.endSession(x.id, actual, f.summary.trim())} /></>}
    {x.status === 'ended' && <><Banner tone="turmeric" title={t('ssWait')} body={x.summary} />{canHub && <><Btn label={t('ssByHub')} onPress={() => a.confirmHosted(x.id, 'hub')} /><Gap h={8} /></>}{(host || s.isAdmin) && <Btn kind="secondary" label={t('ssByPeople')} onPress={() => a.confirmHosted(x.id, 'people')} />}</>}
    {x.role === 'recipient' && !x.checkedIn && x.status === 'scheduled' && <Small>{t('ssEnterCode')}{isDemo && x.code ? ` · ${t('ssDemoCode', { x: x.code })}` : ''}</Small>}
    {x.role === 'recipient' && x.checkedIn && !x.attendeeConfirmed && (isDemo || x.status === 'ended') && <Card><Tag tone="moss" label={t('ssCheckedIn')} /><Gap h={6} /><Check label={t('ssTimeOk')} on={f.time} onPress={() => set({ ...f, time: !f.time })} /><Check label={t('ssContentOk')} on={f.content} onPress={() => set({ ...f, content: !f.content })} /><Btn label={t('ssConfirm')} onPress={() => a.confirmAttendance(x.id, f.time, f.content)} /></Card>}
    {x.status === 'confirmed' && <Banner tone="moss" title={t('ssDone')} body={host ? t('ssGave', { h: v.equivalentHours, v: approxVnd(v.referenceVnd) }) : t('ssGot', { h: v.perRecipientHours, v: approxVnd(v.perRecipientVnd) })}>{host && x.points !== undefined && <Small style={{ marginTop: 4 }}>{t('ssEarned', { p: x.points })}</Small>}</Banner>}
  </Screen>;
}
