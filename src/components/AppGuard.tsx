// Giữ phiên đăng nhập an toàn: hết hạn sau 180 ngày không xác thực lại, và khóa sinh trắc học nếu người dùng bật.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { sessionExpired, shouldRelock } from '../lib/authPolicy';
import { authenticate, loadLock, lockEnabled, lockSupportedPlatform } from '../lib/lock';
import { useApp } from '../lib/store';
import { hasSession, isDemo, lastAuthenticatedAt, markAuthenticated } from '../lib/supabase';
import { c, space } from '../theme';
import { Btn, Gap, H1, Seal } from '../ui';

export function AppGuard() {
  const { t, s, a } = useApp(); const r = useRouter();
  const [locked, setLocked] = useState(false); const bgAt = useRef<number | null>(null); const signedIn = !!s.email && !isDemo;

  const checkAge = useCallback(async () => {
    if (isDemo || !(await hasSession())) return false;
    const at = await lastAuthenticatedAt();
    if (at == null) { await markAuthenticated(); return false; } // phiên có từ trước bản cập nhật này
    if (!sessionExpired(at, Date.now())) return false;
    a.signOut(); r.replace({ pathname: '/auth/sign-in', params: { expired: '1' } }); return true;
  }, [a, r]);

  const unlock = useCallback(async () => {
    const ok = await authenticate(t('lockPrompt'), t('cancel')).catch(() => false);
    if (ok) { await markAuthenticated(); setLocked(false); }
  }, [t]);

  // Mở app lần đầu: kiểm tra hạn phiên, rồi khóa nếu người dùng đã bật.
  useEffect(() => { if (!signedIn) return; (async () => { if (await checkAge()) return; if (await loadLock()) setLocked(true); })(); }, [signedIn, checkAge]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'background') { bgAt.current = Date.now(); return; }
      if (st !== 'active' || !signedIn) return;
      if (await checkAge()) return;
      if (lockSupportedPlatform && shouldRelock(lockEnabled(), bgAt.current, Date.now())) setLocked(true);
      bgAt.current = null;
    });
    return () => sub.remove();
  }, [signedIn, checkAge]);

  useEffect(() => { if (locked) unlock(); }, [locked, unlock]);
  if (!locked || !signedIn) return null;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', padding: space.xl }]} accessibilityViewIsModal>
    <Seal size={64} /><Gap h={16} /><H1 style={{ textAlign: 'center' }}>{t('lockTitle')}</H1><Gap h={24} />
    <View style={{ alignSelf: 'stretch' }}><Btn label={t('lockUnlock')} onPress={unlock} /><Gap h={8} /><Btn kind="ghost" label={t('signOut')} onPress={() => { setLocked(false); a.signOut(); r.replace('/'); }} /></View>
  </View>;
}
