import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { signInWithEmail } from '../../src/lib/supabase';
import { Banner, Btn, Field, Screen } from '../../src/ui';
export default function SignIn() {
  const { t, a } = useApp(); const r = useRouter(); const { expired } = useLocalSearchParams<{ expired?: string }>(); const [email, setE] = useState(''); const [pw, setP] = useState(''); const [err, setErr] = useState('');
  const go = async () => { if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t('errEmail')); try { const res = await signInWithEmail(email.trim(), pw); if (res === 'device_code') return void r.push({ pathname: '/auth/verify', params: { email: email.trim(), mode: 'device' } }); await a.signIn(email.trim()); r.replace('/'); } catch (e: any) { setErr(e.message); } };
  return <Screen back title={t('signIn')}>{expired === '1' && <Banner tone="indigo" title={t('sessionExpired')} />}<Field label={t('email')} value={email} onChangeText={setE} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" /><Field label={t('password')} value={pw} onChangeText={setP} secureTextEntry autoComplete="current-password" textContentType="password" />{!!err && <Banner tone="son" title={err} />}<Btn label={t('signIn')} onPress={go} /><Btn kind="ghost" label={t('forgot')} onPress={() => r.push('/auth/forgot')} /><Btn kind="ghost" label={t('noAccount')} onPress={() => r.replace('/auth/sign-up')} /></Screen>;
}
