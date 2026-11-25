// Hàm thuần cho màn hình nhà tài trợ và "Nhân vật hôm nay". Không phụ thuộc React để kiểm thử được bằng node.

/** Ngày theo giờ máy người dùng, dạng YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Số ngày tính từ 2026-01-01, dùng để luân phiên. Không phụ thuộc múi giờ vì đọc từ chuỗi ngày. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
}
/** Chọn phần tử theo ngày: mỗi ngày một nhà tài trợ, lần lượt theo thứ tự. Danh sách rỗng trả về null. */
export function pickDaily<T extends { id: string; sort?: number }>(list: T[], key: string): T | null {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));
  const n = dayNumber(key);
  return sorted[((n % sorted.length) + sorted.length) % sorted.length];
}

export type SponsorCfg = { enabled: boolean; showSeconds: number; animatedWaitSeconds: number };
/** Thời gian chờ nút tắt. Ảnh tĩnh: 0 giây. Ảnh động, video: tối đa 5 giây (Nghị định 342/2025/NĐ-CP, Điều 17). */
export function closeWait(kind: 'static' | 'animated', cfg: SponsorCfg): number {
  return kind === 'static' ? 0 : Math.min(5, Math.max(0, cfg.animatedWaitSeconds));
}
/** Có hiện màn hình nhà tài trợ hay không. */
export function shouldShowSponsor(x: { enabled: boolean; signedIn: boolean; onboarded: boolean; firstDay: string | null; lastShown: string | null; today: string; fromNotification: boolean; hasSponsor: boolean }): boolean {
  if (!x.enabled || !x.hasSponsor || !x.signedIn || !x.onboarded || x.fromNotification) return false;
  if (!x.firstDay || x.firstDay === x.today) return false; // ngày đầu dùng app: không quảng cáo
  return x.lastShown !== x.today;
}

/** Bộ sinh số giả ngẫu nhiên cố định theo chuỗi, để mọi người cùng thấy một bộ đáp án trong ngày. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
export type YearQuiz = { prefix: string; options: string[]; answer: string };
/**
 * Trò đoán năm sinh: hiện các chữ số đầu (ví dụ "18"), người dùng chọn hai số cuối trong 3 lựa chọn (ví dụ 12, 34, 89).
 * Hai lựa chọn sai lấy ngẫu nhiên trong 00–99, cách đáp án và cách nhau ít nhất 5, không vượt quá năm hiện tại.
 */
export function yearQuiz(year: number, seed: string, nowYear = new Date().getFullYear()): YearQuiz {
  const s = String(year); const prefix = s.slice(0, -2); const answer = s.slice(-2);
  const base = Number(prefix) * 100; const max = Math.min(99, nowYear - base);
  const rnd = seeded(`${seed}|${year}`); const picks: number[] = [Number(answer)];
  let guard = 0;
  while (picks.length < 3 && guard++ < 500) {
    const v = Math.floor(rnd() * (max + 1)); const gap = guard > 300 ? 1 : 5;
    if (picks.every((x) => Math.abs(x - v) >= gap)) picks.push(v);
  }
  const options = picks.map((v) => String(v).padStart(2, '0'));
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { prefix, options, answer };
}

/** Chuỗi ngày chơi liên tiếp, tính tới hôm nay hoặc hôm qua. */
export function streak(days: string[], today: string): number {
  const set = new Set(days); let n = 0; let d = dayNumber(today);
  if (!set.has(today)) d -= 1;
  const toKey = (x: number) => { const t = new Date(Date.UTC(2026, 0, 1) + x * 86400000); return t.toISOString().slice(0, 10); };
  while (set.has(toKey(d))) { n++; d--; }
  return n;
}
