import { useRouter } from 'expo-router';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Gap, H2, LinkRow, P, Row, Screen, Small, Stat, Tag } from '../../src/ui';

export default function Me() {
  const { t, s, a, balance, verified, can } = useApp(); const r = useRouter();
  const links: [string, string][] = [[t('helpTitle'), '/help'], [t('vTitle'), '/verification'], [t('editProfile'), '/onboarding/basics'], [t('myPoints'), '/me/points'], [t('rewards'), '/me/rewards'], [t('kTitle'), '/knowledge'], [t('helpers'), '/onboarding/helper'], [t('privacy'), '/me/privacy'], [t('myVenue'), '/partner/status'], ...(s.myPartner ? [[t('pdTitle'), '/partner/dashboard'] as [string, string]] : []), [t('sLanguage'), '/language'], [t('legalDocs'), '/legal/terms'], ...(s.operatorHubs.length || can('verifier') ? [[t('ipTitle'), '/admin/in-person'] as [string, string]] : []), ...(s.isAdmin ? [[t('adminArea'), '/admin'] as [string, string]] : [])];
  return <Screen title={t('meTitle')}><Row style={{ justifyContent: 'space-between' }}><H2>{s.profile.displayName}</H2><Tag tone={verified ? 'moss' : 'turmeric'} label={verified ? t('vOkT') : t('vWaitT')} /></Row><P muted>{s.profile.headline}</P><Gap h={12} />
    {s.deletionAt && <Banner tone="son" title={t('delPendingT')} body={t('delPendingB', { d: new Date(s.deletionAt + 7 * 86400000).toLocaleDateString(s.uiLocale) })}><Gap h={8} /><Btn kind="secondary" label={t('delCancel')} onPress={() => a.cancelDeletion().catch(() => {})} /></Banner>}
    {s.notices.filter((n) => !n.read).map((n) => <Banner key={n.id} tone={n.kind === 'restored' ? 'moss' : 'son'} title={t(`notice_${n.kind}` as any)} body={n.body}><Gap h={6} /><Btn kind="ghost" label={t('noticeRead')} onPress={() => a.readNotice(n.id)} /></Banner>)}
    {!verified && !s.verification && <Banner tone="turmeric" title={t('vFinish')}><Gap h={6} /><Btn kind="secondary" label={t('vFinish')} onPress={() => r.push('/onboarding/background')} /></Banner>}
    <Row><Stat value={balance.hours.toLocaleString(s.locale)} label={t('pHours')} /><Stat value={balance.available} label={t('pAvail')} /></Row><Gap />
    {links.map(([l, h]) => <LinkRow key={h} label={l} onPress={() => r.push(h as never)} />)}<Gap /><Btn kind="secondary" label={t('signOut')} onPress={() => { a.signOut(); r.replace('/'); }} /></Screen>;
}
