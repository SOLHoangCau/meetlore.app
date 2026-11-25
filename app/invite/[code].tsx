import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Screen } from '../../src/ui';
export default function Invite() { const { code } = useLocalSearchParams<{ code: string }>(); const { t } = useApp(); const r = useRouter(); return <Screen back title={t('invites')}><Banner title={code ?? ''} /><Btn label={t('ctaStart')} onPress={() => r.push('/auth/sign-up')} /></Screen>; }
