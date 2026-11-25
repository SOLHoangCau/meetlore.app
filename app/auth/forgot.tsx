import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { isDemo, resetPasswordWithCode, sendPasswordReset } from '../../src/lib/supabase';
import { Banner, Btn, Field, P, Screen, Small } from '../../src/ui';

/** Đặt lại mật khẩu bằng mã 6 số gửi qua email, ngay trong app. */
export default function Forgot() {
  const { t, a } = useApp(); const r = useRouter();
  const [e, setE] = useState(''); const [done, setD] = useState(false); const [code, setC] = useState(''); const [pw, setP] = useState(''); const [err, setErr] = useState('');
  const send = async () => { if (!/^\S+@\S+\.\S+$/.test(e)) return setErr(t('errEmail')); setErr(''); await sendPasswordReset(e.trim()).catch(() => {}); setD(true); };
  const save = async () => {
    if (!/^\d{6}$/.test(code)) return setErr(t('errCode')); if (pw.length < 10) return setErr(t('errPass'));
    try { await resetPasswordWithCode(e.trim(), code, pw); await a.signIn(e.trim()); r.replace('/'); } catch (x: any) { setErr(x.message); }
  };
  return <Screen back title={t('forgotTitle')}>
    <P muted style={{ marginBottom: 16 }}>{t('forgotBody')}</P>
    <Field label={t('email')} value={e} onChangeText={setE} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" editable={!done} />
    {!done ? <Btn label={t('sendLink')} onPress={send} /> : <>
      <Banner tone="moss" title={t('forgotDone')} />
      <Field label={t('code')} value={code} onChangeText={setC} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" />
      <Field label={t('newPassword')} hint={t('passwordHint')} value={pw} onChangeText={setP} secureTextEntry autoComplete="new-password" textContentType="newPassword" passwordRules="minlength: 10;" />
      {isDemo && <Small style={{ marginBottom: 12 }}>{t('demoNote')}</Small>}
      <Btn label={t('resetSave')} onPress={save} /><Btn kind="ghost" label={t('resend')} onPress={send} />
    </>}
    {!!err && <Banner tone="son" title={err} />}
  </Screen>;
}
