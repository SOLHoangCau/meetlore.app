import { Redirect, useRouter } from 'expo-router';
import { Platform, View } from 'react-native';
import { LANGUAGES } from '../src/data/catalog';
import { useApp } from '../src/lib/store';
import { isDemo } from '../src/lib/supabase';
import { c, space } from '../src/theme';
import { Btn, Card, Chip, Gap, H1, H2, P, Row, Screen, Seal, Small, Wrap } from '../src/ui';
export default function Landing() {
  const { t, s, a } = useApp(); const r = useRouter();
  if (s.email) return <Redirect href={s.onboarded || s.profile.displayName ? '/hubs' : '/onboarding/language'} />;
  const steps = [['how1', 'how1b'], ['how2', 'how2b'], ['how3', 'how3b'], ['how4', 'how4b']] as const;
  return <Screen>
    <Row style={{ justifyContent: 'space-between', marginBottom: space.xxl }}><Row><Seal size={36} /><H2>MeetLore</H2></Row><Chip label={`${LANGUAGES.find((l) => l.code === s.uiLocale)?.native ?? 'Tiếng Việt'} ▾`} onPress={() => r.push('/language')} /></Row>
    <Small style={{ color: c.son, marginBottom: space.s }}>{t('appTag')}</Small>
    <H1 style={{ fontSize: 34, lineHeight: 43 }}>{t('heroTitle')}</H1><Gap h={space.m} /><P muted>{t('heroBody')}</P><Gap h={space.xl} />
    <Btn label={t('ctaStart')} onPress={() => r.push('/auth/sign-up')} /><Gap h={space.s} />
    <Btn kind="secondary" label={t('ctaLogin')} onPress={() => r.push('/auth/sign-in')} />
    {isDemo && <><Gap h={space.s} /><Btn kind="ghost" label={t('ctaDemo')} onPress={() => { a.startDemo(); r.replace('/hubs'); }} /></>}
    <Gap h={space.xxl} />
    {steps.map(([x, y], i) => <Row key={x} style={{ alignItems: 'flex-start', marginBottom: space.l, gap: space.m }}><H2 style={{ color: c.son, width: 24 }}>{i + 1}</H2><View style={{ flex: 1 }}><P style={{ fontFamily: 'BeVietnamPro_600SemiBold' }}>{t(x)}</P><P muted>{t(y)}</P></View></Row>)}
    <Card style={{ backgroundColor: c.indigo, borderColor: c.indigo }}><H2 style={{ color: c.white }}>{t('vpTitle')}</H2><P style={{ color: c.white, marginVertical: space.s }}>{t('vpBody')}</P><Btn kind="secondary" label={t('ctaPartner')} onPress={() => r.push('/partner')} /></Card>
    <Wrap>{([['terms', 'footerTerms'], ['privacy', 'footerPrivacy'], ['safety', 'footerSafety'], ['points', 'footerPoints']] as const).map(([d, k]) => <Btn key={d} kind="ghost" label={t(k)} onPress={() => r.push(`/legal/${d}`)} />)}</Wrap>
    {Platform.OS === 'web' && <Small>© MeetLore · meetlore.app</Small>}
  </Screen>;
}
