import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { isDemo, signUpWithEmail } from '../../src/lib/supabase';
import { Banner, Btn, Check, Field, Gap, Screen } from '../../src/ui';
export default function SignUp() {
  const { t, a } = useApp(); const r = useRouter(); const [email, setE] = useState(''); const [pw, setP] = useState(''); const [ag, setA] = useState([false, false, false]); const [code, setCode] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t('errEmail')); if (pw.length < 10) return setErr(t('errPass')); if (ag.includes(false)) return setErr(t('errAgree'));
    try { await signUpWithEmail(email.trim(), pw); r.push({ pathname: '/auth/verify', params: { email: email.trim(), code: code.trim().toUpperCase() } }); } catch (e: any) { setErr(e.message); }
  };
  void a;
  return <Screen back title={t('signUp')}>
    <Field label={t('email')} value={email} onChangeText={setE} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
    <Field label={t('password')} hint={t('passwordHint')} value={pw} onChangeText={setP} secureTextEntry autoComplete="new-password" textContentType="newPassword" passwordRules="minlength: 10;" />
    {!isDemo && <Field label={`${t('accessCode')} (${t('accessLater')})`} value={code} onChangeText={setCode} autoCapitalize="characters" />}
    {(['agree18', 'agreeTerms', 'agreePrivacy'] as const).map((k, i) => <Check key={k} label={t(k)} on={ag[i]} onPress={() => setA(ag.map((x, j) => j === i ? !x : x))} />)}
    <Btn kind="ghost" label={t('readDocs')} onPress={() => r.push('/legal/terms')} />
    {!!err && <Banner tone="son" title={err} />}<Gap h={8} /><Btn label={t('signUp')} onPress={go} /><Btn kind="ghost" label={t('haveAccount')} onPress={() => r.replace('/auth/sign-in')} />
  </Screen>;
}
