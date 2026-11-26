// "Nhân vật hôm nay" ở đầu Trang chủ: ba số hai chữ số trôi lững lờ trên ảnh nhân vật, người dùng chạm số đúng với năm sinh.
// Thẻ thấp (ảnh 3:2) để người dùng vẫn thấy Hub bên dưới. Chỉ là trò chơi cho vui: không cộng điểm đổi ưu đãi. Kết quả lưu trên máy.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, Text, View } from 'react-native';
import { FIELDS, hasFullDate, pickFigure, type Figure } from '../data/figures';
import { BUNDLED, loadFigures } from '../lib/figureSource';
import { dayKey, streak, yearQuiz } from '../lib/daily';
import { mediaUrl } from '../lib/sponsors';
import { useApp } from '../lib/store';
import { c, f, space } from '../theme';
import { Card, Gap, H2, P, Row, Small, Tag } from '../ui';

const KEY = 'trigiao.daily.v1';
const ART_BG = '#ECE5D6';
const SIZE = 56; // đường kính bong bóng số, đủ lớn để chạm
const TOP = 44; // chừa chỗ cho nhãn "Đoán năm sinh"
type Saved = { plays: Record<string, { pick: string; right: boolean }>; folded: string | null };
const rand = (a: number, b: number) => a + Math.random() * Math.max(0, b - a);

/** Một số trôi chậm trong "làn" riêng của nó để ba số không chồng lên nhau. Khi đã chọn hoặc máy bật giảm chuyển động thì đứng yên. */
function Bubble({ i, w, h, label, still, tone, onPress, a11y }: { i: number; w: number; h: number; label: string; still: boolean; tone: 'plain' | 'right' | 'wrong'; onPress: () => void; a11y: string }) {
  const lane = w / 3; const minX = i * lane + 4; const maxX = (i + 1) * lane - SIZE - 4; const minY = TOP; const maxY = h - SIZE - 8;
  const rest = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const pos = useRef(new Animated.ValueXY(rest)).current;
  useEffect(() => {
    if (!w) return;
    if (still) { Animated.timing(pos, { toValue: rest, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(); return; }
    let alive = true;
    const go = () => { if (!alive) return; Animated.timing(pos, { toValue: { x: rand(minX, maxX), y: rand(minY, maxY) }, duration: rand(2600, 4800), easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => finished && go()); };
    go(); return () => { alive = false; pos.stopAnimation(); };
  }, [w, h, still]);
  const bg = tone === 'right' ? c.moss : tone === 'wrong' ? c.son : 'rgba(255,253,248,0.95)'; const fg = tone === 'plain' ? c.ink : c.white;
  return <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: pos.getTranslateTransform() }}>
    <Pressable onPress={onPress} disabled={still} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: bg, borderWidth: 1, borderColor: tone === 'plain' ? c.line : bg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
      <Text style={{ fontFamily: f.serifBold, fontSize: 22, color: fg }}>{label}</Text>
    </Pressable>
  </Animated.View>;
}

function bornDay(fig: Figure, ui: string): string {
  const { m, d } = fig.born; if (!m || !d) return '';
  try { return new Date(2000, m - 1, d).toLocaleDateString(ui, { day: 'numeric', month: 'long' }); } catch { return `${d}/${m}`; }
}

export function DailyFigure() {
  const { t, s } = useApp(); const today = dayKey();
  const [set, setSet] = useState(BUNDLED); useEffect(() => { loadFigures().then(setSet).catch(() => {}); }, []);
  const { figure: fig, birthday } = useMemo(() => pickFigure(today, set.dated, set.undated), [today, set]);
  const quiz = useMemo(() => yearQuiz(fig.born.y, today), [fig, today]);
  const [saved, setSaved] = useState<Saved>({ plays: {}, folded: null }); const [loaded, setLoaded] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 }); const [reduce, setReduce] = useState(false); const [bad, setBad] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((r) => { if (r) setSaved(JSON.parse(r)); }).catch(() => {}).finally(() => setLoaded(true)); AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);
  const store = (x: Saved) => { setSaved(x); AsyncStorage.setItem(KEY, JSON.stringify(x)).catch(() => {}); };
  if (!loaded || !s.flags.daily_figure) return null;

  const lang = s.locale; const txt = fig[lang]; const play = saved.plays[today]; const run = streak(Object.keys(saved.plays), today);
  const pick = (o: string) => { if (play) return; store({ ...saved, plays: { ...saved.plays, [today]: { pick: o, right: o === quiz.answer } } }); };
  const fold = (on: boolean) => store({ ...saved, folded: on ? today : null });
  if (saved.folded === today) return <Card onPress={() => fold(false)}><Row style={{ justifyContent: 'space-between' }}><Small>{t('dfTitle')}</Small><Small style={{ color: c.son }}>{fig.name} ›</Small></Row></Card>;

  const url = mediaUrl(`figures/${fig.image ?? `${fig.id}.webp`}`);
  const initials = fig.name.split(/\s+/).filter((w) => /^[A-ZÀ-Ỹ]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
  const sub = hasFullDate(fig) ? t('dfBorn', { d: bornDay(fig, s.uiLocale) }) : t('dfNoDate');
  return <Card>
    <Row style={{ justifyContent: 'space-between', marginBottom: space.s }}>
      <Small style={{ color: c.son, fontFamily: f.medium }}>{birthday ? t('dfTitle') : t('dfRevisit')}</Small>
      <Row style={{ gap: space.s }}>{run > 1 && <Tag tone="turmeric" label={t('dfStreak', { n: run })} />}
        <Pressable onPress={() => fold(true)} accessibilityRole="button" hitSlop={10}><Small style={{ color: c.indigo, fontFamily: f.medium }}>{t('dfFold')}</Small></Pressable></Row>
    </Row>
    <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ width: '100%', aspectRatio: 3 / 2, borderRadius: 12, overflow: 'hidden', backgroundColor: ART_BG }}>
      {url && !bad ? <Image source={{ uri: url }} onError={() => setBad(true)} accessibilityLabel={fig.name} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: f.serifBold, fontSize: 64, color: c.indigo, opacity: 0.85 }}>{initials}</Text></View>}
      <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,253,248,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontFamily: f.medium, fontSize: 13, color: c.ink }}>{t('dfGuess')}: <Text style={{ fontFamily: f.serifBold, fontSize: 15 }}>{quiz.prefix}{play ? <Text style={{ color: c.moss }}>{quiz.answer}</Text> : '__'}</Text></Text></View>
      {box.w > 0 && quiz.options.map((o, i) => <Bubble key={o} i={i} w={box.w} h={box.h} label={o} still={!!play || reduce} onPress={() => pick(o)} a11y={`${quiz.prefix}${o}`}
        tone={play && o === quiz.answer ? 'right' : play?.pick === o ? 'wrong' : 'plain'} />)}
    </View>
    {url && !bad ? <Text style={{ fontFamily: f.body, fontSize: 11, color: c.muted, textAlign: 'right', marginTop: 4 }}>{t('dfAiArt')}</Text> : <Gap h={space.s} />}
    <H2>{fig.name}</H2>
    <Small>{FIELDS[fig.field]?.[lang] ?? fig.field} · {sub}</Small>
    {!play && <P muted numberOfLines={2} style={{ marginTop: 4 }}>{txt.hint}</P>}
    {!!play && <>
      <Gap h={space.s} />
      <P style={{ fontFamily: f.medium, color: play.right ? c.moss : c.son }}>{play.right ? t('dfRight') : t('dfWrong', { y: fig.born.y })} <Text style={{ color: c.muted, fontFamily: f.body }}>({fig.born.y}–{fig.died})</Text></P>
      <Gap h={4} />
      <P>{txt.fact}</P>
      {!!fig.quote && <View style={{ borderLeftWidth: 3, borderLeftColor: c.turmeric, paddingLeft: space.m, marginTop: space.s }}>
        {fig.quote.orig !== fig.quote[lang] && <P style={{ fontStyle: 'italic' }}>“{fig.quote.orig}”</P>}
        <P muted={fig.quote.orig !== fig.quote[lang]}>“{fig.quote[lang]}”</P>
        <Small>{fig.quote.src}</Small>
      </View>}
      <Gap h={4} />
      <Small>{t('dfDone')}</Small>
    </>}
  </Card>;
}
