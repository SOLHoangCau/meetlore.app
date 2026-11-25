import { useRouter } from 'expo-router';
import { useApp } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { LinkRow, Screen, Small, Tag } from '../../src/ui';

/** Mỗi Admin chỉ thấy phần việc theo vai trò: toàn quyền, duyệt hồ sơ, xử lý báo cáo và nội dung. */
export default function Admin() {
  const { t, s, queue, can } = useApp(); const r = useRouter(); const v = queue.length + (isDemo && s.verification?.status === 'awaiting_admin' ? 1 : 0);
  const rows: [string, string, number, string][] = [
    [t('adVerify'), '/admin/verifications', v, 'verifier'], [t('ipTitle'), '/admin/in-person', 0, 'verifier'],
    [t('adReports'), '/admin/reports', s.reports.length, 'moderator'], [t('adReview'), '/admin/review', s.knowledge.filter((k) => k.status === 'submitted').length, 'content_reviewer'],
    [t('adApps'), '/admin/applications', s.applications.filter((a) => ['submitted', 'site_check'].includes(a.status)).length, 'admin'], [t('adHubs'), '/admin/hubs', 0, 'admin'],
    [t('codesTitle'), '/admin/codes', 0, 'admin'], [t('adExpand'), '/admin/expansion', 0, 'admin'], [t('adStats'), '/admin/stats', 0, 'admin'], [t('adFund'), '/admin/fund', 0, 'admin'], [t('adSponsors'), '/admin/sponsors', 0, 'admin'], [t('adFigures'), '/admin/figures', 0, 'admin'], [t('adSettings'), '/admin/settings', 0, 'admin'],
  ];
  return <Screen back title={t('adTitle')}><Small style={{ marginBottom: 8 }}>{t('adRoles', { x: s.roles.join(', ') || '—' })}</Small>
    {rows.filter((x) => can(x[3])).map(([l, h, n]) => <LinkRow key={h} label={l} onPress={() => r.push(h as never)} right={n ? <Tag tone="son" label={String(n)} /> : undefined} />)}</Screen>;
}
