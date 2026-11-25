// Quy tắc phiên đăng nhập. Hàm thuần để kiểm thử được.
export const MAX_SESSION_DAYS = 180;
export const LOCK_AFTER_MS = 5 * 60_000;
const DAY = 86_400_000;

/** Phiên hết hạn khi đã đủ 180 ngày kể từ lần xác thực gần nhất (mật khẩu, mã email hoặc mở khóa sinh trắc học). */
export const sessionExpired = (lastAuthAt: number | null, now: number, days = MAX_SESSION_DAYS) => lastAuthAt != null && now - lastAuthAt >= days * DAY;

/** Khóa lại khi người dùng đã bật khóa và app ở nền từ 5 phút trở lên. */
export const shouldRelock = (enabled: boolean, backgroundAt: number | null, now: number, after = LOCK_AFTER_MS) => enabled && backgroundAt != null && now - backgroundAt >= after;

/** Chia chuỗi thành các phần không quá `size` ký tự (SecureStore giới hạn khoảng 2 KB mỗi mục). */
export const chunk = (value: string, size: number) => { const out: string[] = []; for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size)); return out.length ? out : ['']; };
