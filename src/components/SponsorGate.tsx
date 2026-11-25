// Màn hình nhà tài trợ: lần mở app đầu tiên trong ngày, sau khi app đã tải xong.
// Ảnh tĩnh có nút Đóng ngay từ giây đầu; ảnh động chờ tối đa 5 giây (Nghị định 342/2025/NĐ-CP, Điều 17).
// Không hiện: ngày đầu dùng app, khi chưa xong hồ sơ, khi mở từ thông báo hoặc liên kết, khi ảnh chưa tải kịp.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { closeWait, dayKey, pickDaily, shouldShowSponsor, type SponsorCfg } from '../lib/daily';
import { openedDirectly } from '../lib/launch';
import { useApp } from '../lib/store';
import { loadSponsors, type Sponsor } from '../lib/sponsors';
import { c, f, space } from '../theme';

const KEY = 'trigiao.sponsor.v1';
type Seen = { firstDay: string | null; lastShown: string | null };

export function SponsorGate() {
  const { s } = useApp();
  const [show, setShow] = useState<{ sp: Sponsor; img: string | null; cfg: SponsorCfg } | null>(null);
  const checked = useRef(false);
  const signedIn = !!s.email; const onboarded = s.onboarded || !!s.profile.displayName;

  useEffect(() => {
    if (checked.current || !signedIn) return; checked.current = true;
    (async () => {
      const today = dayKey();
      const seen: Seen = await AsyncStorage.getItem(KEY).then((r) => r ? JSON.parse(r) : { firstDay: null, lastShown: null }).catch(() => ({ firstDay: null, lastShown: null }));
      if (!seen.firstDay) await AsyncStorage.setItem(KEY, JSON.stringify({ ...seen, firstDay: today })).catch(() => {});
      const [{ cfg, list }, direct] = await Promise.all([loadSponsors(today).catch(() => ({ cfg: { enabled: false, showSeconds: 0, animatedWaitSeconds: 0 }, list: [] as Sponsor[] })), openedDirectly().catch(() => true)]);
      const sp = pickDaily(list, today);
      if (!sp || !shouldShowSponsor({ enabled: cfg.enabled, signedIn, onboarded, firstDay: seen.firstDay, lastShown: seen.lastShown, today, fromNotification: direct, hasSponsor: true })) return;
      const img = (s.locale === 'vi' ? sp.imageVi : sp.imageEn || sp.imageVi) ?? null;
      // Chỉ hiện khi ảnh tải xong trong 1,5 giây; không bắt người dùng chờ mạng chậm.
      if (img) { const ok = await Promise.race([Image.prefetch(img).catch(() => false), new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]); if (!ok) return; }
      await AsyncStorage.setItem(KEY, JSON.stringify({ firstDay: seen.firstDay ?? today, lastShown: today })).catch(() => {});
      setShow({ sp, img, cfg });
    })();
  }, [signedIn, onboarded, s.locale]);

  if (!show) return null;
  return <SponsorScreen sp={show.sp} img={show.img} cfg={show.cfg} onDone={() => setShow(null)} />;
}

/** Giao diện màn hình nhà tài trợ, dùng cho cả lúc mở app và trang xem thử của Admin. */
export function SponsorScreen({ sp, img, cfg, onDone }: { sp: Sponsor; img: string | null; cfg: SponsorCfg; onDone: () => void }) {
  const { t } = useApp(); const inset = useSafeAreaInsets(); const [left, setLeft] = useState(cfg.showSeconds);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000); return () => clearTimeout(id);
  }, [left]);
  const wait = closeWait(sp.kind, cfg); const elapsed = cfg.showSeconds - left; const canClose = elapsed >= wait;
  const open = () => { if (sp.link) Linking.openURL(sp.link).catch(() => {}); onDone(); };
  return <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.ink, zIndex: 100 }}>
    <Pressable accessibilityRole={sp.link ? 'link' : undefined} accessibilityLabel={sp.link ? t('spOpen') : sp.name} onPress={sp.link ? open : undefined} style={{ flex: 1 }}>
      {img ? <Image source={{ uri: img }} resizeMode="contain" style={{ flex: 1 }} accessibilityLabel={sp.name} />
        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, backgroundColor: c.indigo }}>
          <Text style={{ fontFamily: f.serifBold, fontSize: 30, color: c.white, textAlign: 'center' }}>{sp.name}</Text>
          <Text style={{ fontFamily: f.body, fontSize: 15, color: c.white, opacity: 0.8, marginTop: space.m, textAlign: 'center' }}>{t('spPlaceholder')}</Text></View>}
    </Pressable>
    <View style={{ position: 'absolute', top: inset.top + space.m, left: space.l, right: space.l, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.s }}>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: f.medium, fontSize: 12, color: c.white, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>{t('spLabel')} · {t('spAd')} · {sp.name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('spClose')} disabled={!canClose} onPress={onDone} hitSlop={12}
        style={{ backgroundColor: 'rgba(0,0,0,0.55)', minWidth: 44, height: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: f.medium, fontSize: 14, color: c.white }}>{canClose ? `${t('spClose')} ✕` : t('spCloseIn', { n: wait - elapsed })}</Text></Pressable>
    </View>
    <Text style={{ position: 'absolute', bottom: inset.bottom + space.l, alignSelf: 'center', fontFamily: f.body, fontSize: 13, color: c.white, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>{t('spEnterIn', { n: left })}</Text>
  </View>;
}
