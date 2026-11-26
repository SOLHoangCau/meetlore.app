import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../../src/lib/store';
import { Avatar, Banner, Btn, Gap, H2, LinkRow, P, Row, Screen, Small, Stat, Tag } from '../../src/ui';
import { c } from '../../src/theme';

export default function Me() {
  const { t, s, a, balance, verified, can } = useApp(); const r = useRouter();
  const links: [string, string][] = [[t('helpTitle'), '/help'], [t('vTitle'), '/verification'], [t('editProfile'), '/onboarding/basics'], [t('myPoints'), '/me/points'], [t('rewards'), '/me/rewards'], [t('kTitle'), '/knowledge'], [t('helpers'), '/onboarding/helper'], [t('privacy'), '/me/privacy'], [t('myVenue'), '/partner/status'], ...(s.myPartner ? [[t('pdTitle'), '/partner/dashboard'] as [string, string]] : []), [t('sLanguage'), '/language'], [t('legalDocs'), '/legal/terms'], ...(s.operatorHubs.length || can('verifier') ? [[t('ipTitle'), '/admin/in-person'] as [string, string]] : []), ...(s.isAdmin ? [[t('adminArea'), '/admin'] as [string, string]] : [])];
  const [busy, setBusy] = useState(false); const [avErr, setAvErr] = useState('');
  const run = async (uri: string | null) => { setBusy(true); setAvErr(''); try { await a.setAvatar(uri); } catch (e: any) { setAvErr(t('errGeneric', { x: e?.message ?? '' })); } setBusy(false); };
  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9, exif: false });
    if (!res.canceled) await run(res.assets[0].uri);
  };
  return <Screen title={t('meTitle')}><Row style={{ alignItems: 'center', gap: 14 }}><Pressable accessibilityRole="button" accessibilityLabel={s.profile.avatar ? t('avatarChange') : t('avatarAdd')} onPress={pickAvatar} disabled={busy}><Avatar uri={s.profile.avatar} name={s.profile.displayName} size={68} /></Pressable><View style={{ flex: 1, alignItems: 'flex-start' }}><H2>{s.profile.displayName}</H2><Gap h={4} /><Tag tone={verified ? 'moss' : 'turmeric'} label={verified ? t('vOkT') : t('vWaitT')} /></View></Row>
    <Row style={{ gap: 16, marginTop: 6 }}><Pressable onPress={pickAvatar} disabled={busy} hitSlop={8}><Small style={{ color: c.indigo }}>{busy ? t('saving') : s.profile.avatar ? t('avatarChange') : t('avatarAdd')}</Small></Pressable>{!!s.profile.avatar && !busy && <Pressable onPress={() => run(null)} hitSlop={8}><Small style={{ color: c.son }}>{t('avatarRemove')}</Small></Pressable>}</Row>
    {!s.profile.avatar && <Small style={{ marginTop: 4 }}>{t('avatarRule')}</Small>}
    {!!avErr && <Small style={{ color: c.son, marginTop: 4 }}>{avErr}</Small>}
    <P muted style={{ marginTop: 8 }}>{s.profile.headline}</P><Gap h={12} />
    {s.deletionAt && <Banner tone="son" title={t('delPendingT')} body={t('delPendingB', { d: new Date(s.deletionAt + 7 * 86400000).toLocaleDateString(s.uiLocale) })}><Gap h={8} /><Btn kind="secondary" label={t('delCancel')} onPress={() => a.cancelDeletion().catch(() => {})} /></Banner>}
    {s.notices.filter((n) => !n.read).map((n) => <Banner key={n.id} tone={n.kind === 'restored' ? 'moss' : 'son'} title={t(`notice_${n.kind}` as any)} body={n.body}><Gap h={6} /><Btn kind="ghost" label={t('noticeRead')} onPress={() => a.readNotice(n.id)} /></Banner>)}
    {!verified && !s.verification && <Banner tone="turmeric" title={t('vFinish')}><Gap h={6} /><Btn kind="secondary" label={t('vFinish')} onPress={() => r.push('/onboarding/background')} /></Banner>}
    <Row><Stat value={balance.hours.toLocaleString(s.locale)} label={t('pHours')} /><Stat value={balance.available} label={t('pAvail')} /></Row><Gap />
    {links.map(([l, h]) => <LinkRow key={h} label={l} onPress={() => r.push(h as never)} />)}<Gap /><Btn kind="secondary" label={t('signOut')} onPress={() => { a.signOut(); r.replace('/'); }} /></Screen>;
}
