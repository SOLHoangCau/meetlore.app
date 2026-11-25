// Nhà tài trợ: đọc, lưu và cấu hình thời gian. Bản demo lưu trên máy, bản thật đọc bảng `sponsors` (RLS chỉ trả về nhà tài trợ đang chạy).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SponsorCfg } from './daily';
import { isDemo, rpc, supabase } from './supabase';

export type Sponsor = { id: string; name: string; kind: 'static' | 'animated'; imageVi: string | null; imageEn: string | null; link: string | null; startsOn: string; endsOn: string | null; active: boolean; sort: number };
export const DEFAULT_CFG: SponsorCfg = { enabled: true, showSeconds: 6, animatedWaitSeconds: 4 };
const DEMO_KEY = 'trigiao.demo.sponsors.v1';
const DEMO: Sponsor[] = [
  { id: 'demo-a', name: 'Nhà tài trợ mẫu A', kind: 'static', imageVi: null, imageEn: null, link: null, startsOn: '2026-01-01', endsOn: null, active: true, sort: 1 },
  { id: 'demo-b', name: 'Nhà tài trợ mẫu B', kind: 'static', imageVi: null, imageEn: null, link: null, startsOn: '2026-01-01', endsOn: null, active: true, sort: 2 },
];

/** Ảnh công khai trong bucket `media` của Supabase, ví dụ `figures/11-20.webp`. Bản demo không có ảnh. */
export function mediaUrl(path: string): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return isDemo || !base ? null : `${base.replace(/\/$/, '')}/storage/v1/object/public/media/${path}`;
}

const running = (x: Sponsor, today: string) => x.active && x.startsOn <= today && (!x.endsOn || x.endsOn >= today);

async function demoList(): Promise<{ cfg: SponsorCfg; list: Sponsor[] }> {
  try { const raw = await AsyncStorage.getItem(DEMO_KEY); if (raw) return JSON.parse(raw); } catch { /* dùng mặc định */ }
  return { cfg: DEFAULT_CFG, list: DEMO };
}
async function demoSave(v: { cfg: SponsorCfg; list: Sponsor[] }) { await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(v)).catch(() => {}); }

/** Mọi nhà tài trợ người này được xem. Admin thấy cả nhà tài trợ đã dừng; `forToday` lọc còn những nhà tài trợ đang chạy. */
export async function loadSponsors(today: string, forToday = true): Promise<{ cfg: SponsorCfg; list: Sponsor[] }> {
  let out: { cfg: SponsorCfg; list: Sponsor[] };
  if (isDemo || !supabase) out = await demoList();
  else {
    const [cfgRaw, res] = await Promise.all([rpc<{ enabled: boolean; show_seconds: number; animated_wait_seconds: number }>('sponsor_config').catch(() => null), supabase.from('sponsors').select('*').order('sort')]);
    const cfg: SponsorCfg = cfgRaw ? { enabled: !!cfgRaw.enabled, showSeconds: cfgRaw.show_seconds, animatedWaitSeconds: cfgRaw.animated_wait_seconds } : { ...DEFAULT_CFG, enabled: false };
    const list: Sponsor[] = (res.data ?? []).map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, imageVi: r.image_vi, imageEn: r.image_en, link: r.link_url, startsOn: r.starts_on, endsOn: r.ends_on, active: r.active, sort: r.sort }));
    out = { cfg, list };
  }
  return forToday ? { ...out, list: out.list.filter((x) => running(x, today)) } : out;
}

export async function saveSponsor(x: Sponsor | Omit<Sponsor, 'id'>): Promise<void> {
  if (isDemo) {
    const v = await demoList(); const id = 'id' in x ? x.id : `demo-${Date.now()}`;
    const list = v.list.some((s) => s.id === id) ? v.list.map((s) => s.id === id ? { ...(x as Sponsor), id } : s) : [...v.list, { ...(x as Sponsor), id }];
    return demoSave({ ...v, list });
  }
  await rpc('save_sponsor', { p_id: 'id' in x ? x.id : null, p_name: x.name, p_kind: x.kind, p_image_vi: x.imageVi, p_image_en: x.imageEn || null, p_link: x.link || null, p_starts: x.startsOn, p_ends: x.endsOn || null, p_active: x.active, p_sort: x.sort });
}

export async function saveTiming(cfg: SponsorCfg, enabled: boolean): Promise<void> {
  if (isDemo) { const v = await demoList(); return demoSave({ ...v, cfg: { ...cfg, enabled } }); }
  await rpc('set_sponsor_timing', { p_show: cfg.showSeconds, p_animated_wait: cfg.animatedWaitSeconds });
  await rpc('set_flag', { p_key: 'sponsor_screen', p_on: enabled });
}
