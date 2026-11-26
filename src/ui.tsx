import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { c, f, space } from './theme';
import { useApp } from './lib/store';

const ICONS: Record<string, string> = {
  hub: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  connect: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M16.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M2.5 20c.6-3.6 2.7-5.5 5.5-5.5s4.9 1.9 5.5 5.5 M15 14.7c3.3-.5 5.7 1.3 6.5 5.3',
  chat: 'M4 5h16v11H9l-5 4V5Z', journey: 'M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16', book: 'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5V4Z M19 4h-4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4V4Z',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 21c.8-4 3.6-6 7.5-6s6.7 2 7.5 6', back: 'M15 5l-7 7 7 7', chev: 'M9 5l7 7-7 7', check: 'M5 12.5l4.5 4.5L19 7', shield: 'M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3Z',
};
export function Icon({ name, size = 22, color = c.ink }: { name: keyof typeof ICONS | string; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d={ICONS[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
const SEAL_A = 'M554.9 386.7A190 190 0 1 1 460.4 328.3';
const SEAL_B = 'M469.1 637.3A190 190 0 1 1 563.6 695.7';
export function Seal({ size = 40 }: { size?: number }) {
  // Logo "Ấn giao": hai vòng lồng nhau, xem assets/logo/logo-1-an-giao.svg
  return <Svg width={size} height={size} viewBox="0 0 1024 1024"><Rect width="1024" height="1024" rx="224" fill={c.son} /><Path d={SEAL_A} fill="none" stroke={c.paper} strokeWidth="56" /><Path d={SEAL_B} fill="none" stroke={c.paper} strokeWidth="56" /><Circle cx="512" cy="512" r="30" fill="#E3AE45" /></Svg>;
}
export const H1 = ({ children, style }: any) => <Text accessibilityRole="header" style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: any) => <Text accessibilityRole="header" style={[s.h2, style]}>{children}</Text>;
export const P = ({ children, style, muted }: any) => <Text style={[s.p, muted && { color: c.muted }, style]}>{children}</Text>;
export const Small = ({ children, style }: any) => <Text style={[s.small, style]}>{children}</Text>;

export function Screen({ title, back, children, footer, wide, noPad }: { title?: string; back?: boolean; children: ReactNode; footer?: ReactNode; wide?: boolean; noPad?: boolean }) {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { t, s: state, a } = useApp();
  const known: Record<string, Parameters<typeof t>[0]> = { budget_exhausted: 'rwOut', insufficient_points: 'rwLow', verification_required: 'vLocked', budget_above_cap: 'pdOver' };
  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 8, paddingBottom: (footer ? 24 : insets.bottom + 32), alignItems: 'center' }}>
        <View style={[s.col, wide && { maxWidth: 960 }, !noPad && { paddingHorizontal: space.l }]}>
          {back && <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/hubs')} style={s.back}><Icon name="back" /><Text style={s.backText}>{t('back')}</Text></Pressable>}
          {title && <H1 style={{ marginBottom: space.m }}>{title}</H1>}
          {!!state.lastError && <Banner tone="son" title={known[state.lastError] ? t(known[state.lastError]) : t('errGeneric', { x: state.lastError })}><Btn kind="ghost" label={t('errClose')} onPress={a.clearError} /></Banner>}
          {children}
        </View>
      </ScrollView>
      {footer && <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}><View style={s.col}>{footer}</View></View>}
    </KeyboardAvoidingView>
  );
}
export function Btn({ label, onPress, kind = 'primary', disabled, style }: { label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; style?: ViewStyle }) {
  const k = { primary: [c.indigo, c.white, c.indigo], secondary: [c.surface, c.ink, c.line], ghost: ['transparent', c.indigo, 'transparent'], danger: [c.son, c.white, c.son] }[kind];
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.btn, { backgroundColor: k[0], borderColor: k[2] }, disabled && { opacity: 0.45 }, pressed && { opacity: 0.8 }, style]}><Text style={[s.btnT, { color: k[1] }]}>{label}</Text></Pressable>;
}
export const Card = ({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) => onPress
  ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: c.sunk }, style]}>{children}</Pressable> : <View style={[s.card, style]}>{children}</View>;
export const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.s }, style]}>{children}</View>;
export const Wrap = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }, style]}>{children}</View>;
export const Gap = ({ h = space.l }: { h?: number }) => <View style={{ height: h }} />;
export function Chip({ label, on, onPress, tone }: { label: string; on?: boolean; onPress?: () => void; tone?: 'son' | 'indigo' }) {
  const body = <Text style={[s.chipT, on && { color: c.white }]}>{label}</Text>; const bg = on ? (tone === 'son' ? c.son : c.indigo) : c.surface; const st = [s.chip, { backgroundColor: bg, borderColor: on ? bg : c.line }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} style={st}>{body}</Pressable> : <View style={st}>{body}</View>;
}
/** Ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên. */
export function Avatar({ uri, name, size = 44 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
  return uri ? <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.sunk }} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.indigoSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: f.serifBold, fontSize: size * 0.38, color: c.indigo }}>{initials}</Text></View>;
}
export function Tag({ label, tone = 'indigo' }: { label: string; tone?: 'indigo' | 'son' | 'moss' | 'turmeric' | 'plain' }) {
  const m = { indigo: [c.indigoSoft, c.indigo], son: [c.sonSoft, c.son], moss: [c.mossSoft, c.moss], turmeric: [c.turmericSoft, c.turmeric], plain: [c.sunk, c.muted] }[tone];
  return <View style={[s.tag, { backgroundColor: m[0] }]}><Text style={[s.tagT, { color: m[1] }]}>{label}</Text></View>;
}
export function Field({ label, hint, error, ...p }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return <View style={{ marginBottom: space.m }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...p} style={[s.input, p.multiline && { minHeight: 96, textAlignVertical: 'top' }, !!error && { borderColor: c.son }]} />{hint && <Small style={{ marginTop: 4 }}>{hint}</Small>}{error && <Text style={s.err}>{error}</Text>}</View>;
}
export function Check({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={s.check}><View style={[s.box, on && { backgroundColor: c.indigo, borderColor: c.indigo }]}>{on && <Icon name="check" size={15} color={c.white} />}</View><Text style={[s.p, { flex: 1 }]}>{label}</Text></Pressable>;
}
export function LinkRow({ label, sub, onPress, right }: { label: string; sub?: string; onPress: () => void; right?: ReactNode }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [s.link, pressed && { backgroundColor: c.sunk }]}><View style={{ flex: 1 }}><Text style={s.linkT}>{label}</Text>{sub && <Small>{sub}</Small>}</View>{right}<Icon name="chev" size={18} color={c.muted} /></Pressable>;
}
export function Banner({ title, body, tone = 'indigo', children }: { title: string; body?: string; tone?: 'indigo' | 'son' | 'moss' | 'turmeric'; children?: ReactNode }) {
  const m = { indigo: [c.indigoSoft, c.indigo], son: [c.sonSoft, c.son], moss: [c.mossSoft, c.moss], turmeric: [c.turmericSoft, c.turmeric] }[tone];
  return <View style={[s.banner, { backgroundColor: m[0] }]}><Text style={[s.bannerT, { color: m[1] }]}>{title}</Text>{body && <P style={{ marginTop: 4 }}>{body}</P>}{children}</View>;
}
export function Stat({ value, label }: { value: string | number; label: string }) { return <View style={s.stat}><Text style={[s.statV, String(value).length > 7 && { fontSize: 17, lineHeight: 30 }]}>{value}</Text><Small>{label}</Small></View>; }
export function Scale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return <View style={{ marginBottom: space.l }}><P style={{ marginBottom: 8 }}>{label}</P><Row>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${label}: ${n}`} accessibilityState={{ selected: value === n }} onPress={() => onChange(n)} style={[s.dot, value === n && { backgroundColor: c.indigo, borderColor: c.indigo }]}><Text style={[s.dotT, value === n && { color: c.white }]}>{n}</Text></Pressable>)}</Row></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.paper }, col: { width: '100%', maxWidth: 560 }, back: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 2, alignSelf: 'flex-start' }, backText: { fontFamily: f.medium, color: c.ink, fontSize: 15 },
  h1: { fontFamily: f.serif, fontSize: 27, lineHeight: 35, color: c.ink }, h2: { fontFamily: f.serif, fontSize: 19, lineHeight: 26, color: c.ink }, p: { fontFamily: f.body, fontSize: 15, lineHeight: 23, color: c.ink }, small: { fontFamily: f.body, fontSize: 13, lineHeight: 19, color: c.muted },
  footer: { backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.line, paddingTop: 12, paddingHorizontal: 16, alignItems: 'center' },
  btn: { minHeight: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, btnT: { fontFamily: f.bold, fontSize: 15 },
  card: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line, padding: space.l, marginBottom: space.m },
  chip: { minHeight: 40, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' }, chipT: { fontFamily: f.medium, fontSize: 14, color: c.ink }, tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }, tagT: { fontFamily: f.medium, fontSize: 12.5 },
  label: { fontFamily: f.medium, fontSize: 14, color: c.ink, marginBottom: 6 }, input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, paddingHorizontal: 12, paddingVertical: 10, fontFamily: f.body, fontSize: 16, color: c.ink }, err: { color: c.son, fontFamily: f.medium, fontSize: 13, marginTop: 4 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, minHeight: 44 }, box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: c.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, marginTop: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 54, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: c.line }, linkT: { fontFamily: f.medium, fontSize: 15, color: c.ink },
  banner: { borderRadius: 12, padding: space.l, marginBottom: space.m }, bannerT: { fontFamily: f.bold, fontSize: 15 }, stat: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12 }, statV: { fontFamily: f.serif, fontSize: 24, color: c.ink },
  dot: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, dotT: { fontFamily: f.medium, fontSize: 15, color: c.ink },
});
