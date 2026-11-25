import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authenticate, loadLock, lockAvailable, lockSupportedPlatform, onLockChange, setLock } from '../../src/lib/lock';
import { disableHubAlerts } from '../../src/lib/nearby';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Check, Field, Gap, H2, LinkRow, P, Screen, Small } from '../../src/ui';

export function DeleteAccount() {
  const { t, s, a } = useApp(); const r = useRouter(); const [open, setOpen] = useState(false); const [typed, setTyped] = useState(''); const [err, setErr] = useState('');
  const ok = !!s.email && typed.trim().toLowerCase() === s.email.toLowerCase();
  if (!open) return <Btn kind="danger" label={t('deleteAccount')} onPress={() => setOpen(true)} />;
  return <Banner tone="son" title={t('delConfirmT')} body={t('delConfirmB')}><Gap h={8} /><Field label={t('delTypeEmail')} autoCapitalize="none" value={typed} onChangeText={setTyped} />{!!err && <Small>{err}</Small>}
    <Btn kind="danger" disabled={!ok} label={t('delFinal')} onPress={async () => { try { await a.deleteAccount(); r.replace('/'); } catch (e: any) { setErr(e.message); } }} /><Gap h={6} /><Btn kind="ghost" label={t('cancel')} onPress={() => setOpen(false)} /></Banner>;
}
function LockOption() {
  const { t } = useApp(); const [on, setOn] = useState(false); const [msg, setMsg] = useState('');
  useEffect(() => { loadLock().then(setOn); return onLockChange(setOn); }, []);
  const toggle = async () => {
    setMsg('');
    if (on) return setLock(false);
    if (!(await lockAvailable())) return setMsg(t('lockNone'));
    if (await authenticate(t('lockPrompt'), t('cancel')).catch(() => false)) await setLock(true);
  };
  return <><Check label={t('lockOpt')} on={on} onPress={toggle} /><Small style={{ marginTop: -6, marginBottom: 10 }}>{msg || t('lockOptB')}</Small></>;
}
export default function Privacy() {
  const { t, s, a } = useApp(); const r = useRouter();
  return <Screen back title={t('privacy')}>
    <Check label={t('pause')} on={s.hidden} onPress={() => a.setHidden(!s.hidden)} />
    {s.flags.message_translation && <Check label={t('allowTranslate')} on={s.allowTranslate} onPress={() => a.patch({ allowTranslate: !s.allowTranslate })} />}
    <Check label={t('allowNotify')} on={s.alertsOn} onPress={() => { if (s.alertsOn) disableHubAlerts(); a.patch({ alertsOn: false }); }} />
    {Platform.OS !== 'web' && <Check label={t('pushOpt')} on={s.pushOn} onPress={() => a.enablePush(!s.pushOn)} />}
    {lockSupportedPlatform && !!s.email && <LockOption />}
    <Gap />{(['privacy', 'terms', 'safety', 'community', 'points', 'content', 'delete-account'] as const).map((x) => <LinkRow key={x} label={t(`doc_${x.replace('-', '_')}` as any)} onPress={() => r.push(`/legal/${x}`)} />)}
    <Gap /><H2 style={{ marginBottom: 6 }}>{t('myData')}</H2><P muted style={{ marginBottom: 12 }}>{t('myDataB')}</P><DeleteAccount /></Screen>;
}
