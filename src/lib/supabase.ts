import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isDemo = !url || !key;
export const supabase = isDemo ? null : createClient(url!, key!, { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

/** Gọi một hàm RPC đã có trong supabase/migrations. Lỗi trả về mã nghiệp vụ như `verification_required`. */
export async function rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('demo_mode');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
// Thời điểm xác thực gần nhất, dùng cho giới hạn 180 ngày. Thiết bị đã nhập mã email một lần được ghi nhớ.
const LAST_AUTH = 'meetlore.auth.last';
const deviceKey = (userId: string) => `meetlore.device.${userId}`;
export const markAuthenticated = () => authStorage.setItem(LAST_AUTH, String(Date.now()));
export async function lastAuthenticatedAt() { const v = await authStorage.getItem(LAST_AUTH); return v ? Number(v) : null; }
export async function hasSession() { if (!supabase) return false; const { data } = await supabase.auth.getSession(); return !!data.session; }
async function trustThisDevice() { if (!supabase) return; const { data } = await supabase.auth.getUser(); if (data.user) await authStorage.setItem(deviceKey(data.user.id), '1'); await markAuthenticated(); }
export async function forgetLocalAuth() { await authStorage.removeItem(LAST_AUTH); }

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}
export async function confirmEmailCode(email: string, token: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
  await trustThisDevice();
}
export async function resendEmailCode(email: string) {
  if (supabase) await supabase.auth.resend({ type: 'signup', email });
}
/** Đăng nhập bằng mật khẩu. Trên thiết bị mới, trả về 'device_code' và gửi mã 6 số tới email. */
export async function signInWithEmail(email: string, password: string): Promise<'ok' | 'device_code'> {
  if (!supabase) return 'ok';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (await authStorage.getItem(deviceKey(data.user.id))) { await markAuthenticated(); return 'ok'; }
  await supabase.auth.signOut({ scope: 'local' });
  await sendDeviceCode(email);
  return 'device_code';
}
export async function sendDeviceCode(email: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}
export async function confirmDeviceCode(email: string, token: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  await trustThisDevice();
}
/** Đặt lại mật khẩu bằng mã 6 số gửi qua email. */
export async function sendPasswordReset(email: string) {
  if (supabase) await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://meetlore.app/auth/forgot' });
}
export async function resetPasswordWithCode(email: string, token: string, password: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
  const { error: e2 } = await supabase.auth.updateUser({ password });
  if (e2) throw e2;
  await trustThisDevice();
}
