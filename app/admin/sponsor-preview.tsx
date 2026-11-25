import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SponsorScreen } from '../../src/components/SponsorGate';
import { dayKey } from '../../src/lib/daily';
import { loadSponsors, type Sponsor } from '../../src/lib/sponsors';
import type { SponsorCfg } from '../../src/lib/daily';
import { useApp } from '../../src/lib/store';
import { c } from '../../src/theme';

/** Admin xem thử đúng màn hình người dùng sẽ thấy, kể cả đếm ngược và nút Đóng. */
export default function SponsorPreview() {
  const { s } = useApp(); const r = useRouter(); const { id } = useLocalSearchParams<{ id: string }>();
  const [x, setX] = useState<{ sp: Sponsor; cfg: SponsorCfg } | null>(null);
  useEffect(() => { loadSponsors(dayKey(), false).then(({ cfg, list }) => { const sp = list.find((y) => y.id === id); if (sp) setX({ sp, cfg }); else r.back(); }).catch(() => r.back()); }, [id]);
  const done = () => (r.canGoBack() ? r.back() : r.replace('/admin/sponsors'));
  return <View style={{ flex: 1, backgroundColor: c.ink }}>{x && <SponsorScreen sp={x.sp} cfg={x.cfg} img={(s.locale === 'vi' ? x.sp.imageVi : x.sp.imageEn || x.sp.imageVi) || null} onDone={done} />}</View>;
}
