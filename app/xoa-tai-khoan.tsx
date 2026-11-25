import { useRouter } from 'expo-router';
import { useApp } from '../src/lib/store';
import { Banner, Btn, Gap, P, Screen } from '../src/ui';
import { DeleteAccount } from './me/privacy';

/** Trang web công khai cho yêu cầu xóa tài khoản (Google Play yêu cầu có đường dẫn này). */
export default function DeletePage() {
  const { t, s } = useApp(); const r = useRouter();
  return <Screen title={t('deleteAccount')}><P muted style={{ marginBottom: 12 }}>{t('delPageBody')}</P>
    {s.email ? <DeleteAccount /> : <><Banner title={t('delSignIn')} /><Btn label={t('ctaLogin')} onPress={() => r.push('/auth/sign-in')} /><Gap h={8} /><P muted>{t('delEmail')}</P></>}</Screen>;
}
