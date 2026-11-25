import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { confirmDeviceCode, confirmEmailCode, isDemo, resendEmailCode, sendDeviceCode } from '../../src/lib/supabase';
import { Banner, Btn, Field, P, Screen, Small } from '../../src/ui';
export default function Verify() {
  const { t, a } = useApp(); const r = useRouter(); const { email = '', code: invite = '', mode } = useLocalSearchParams<{ email: string; code?: string; mode?: string }>(); const device = mode === 'device'; const [code, setC] = useState(''); const [err, setErr] = useState('');
  const go = async () => { if (!/^\d{6}$/.test(code)) return setErr(t('errCode')); try { if (device) { await confirmDeviceCode(email, code); await a.signIn(email); return void r.replace('/'); } await confirmEmailCode(email, code); await a.signIn(email); if (invite) await a.redeemCode(invite).catch(() => {}); r.replace('/onboarding/language'); } catch (e: any) { setErr(e.message); } };
  return <Screen back title={t('verifyEmail')}><P muted style={{ marginBottom: 16 }}>{t(device ? 'deviceCodeB' : 'verifyEmailB', { x: email })}</P><Field label={t('code')} value={code} onChangeText={setC} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />{isDemo && <Small style={{ marginBottom: 12 }}>{t('demoNote')} 123456</Small>}{!!err && <Banner tone="son" title={err} />}<Btn label={t('next')} onPress={go} /><Btn kind="ghost" label={t('resend')} onPress={() => (device ? sendDeviceCode(email) : resendEmailCode(email)).catch((e: any) => setErr(e.message))} />{!isDemo && !device && <><Small style={{ marginTop: 16 }}>{t('verifyLinkB')}</Small><Btn kind="secondary" label={t('verifyLink')} onPress={() => r.replace('/auth/sign-in')} /></>}</Screen>;
}
