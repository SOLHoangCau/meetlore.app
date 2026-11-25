// Nguồn dữ liệu "Nhân vật hôm nay": bảng daily_figures trên Supabase, lưu bản sao trên máy, nếu không có thì dùng dữ liệu đi kèm app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIGURES, UNDATED, type Figure } from '../data/figures';
import { rowsToFigures, FIGURE_COLUMNS } from './figuresCsv';
import { supabase } from './supabase';

export type FigureSet = { dated: Record<string, Figure>; undated: Figure[]; source: 'remote' | 'cache' | 'bundled' };
const CACHE = 'meetlore.figures.v1';
const MAX_AGE = 12 * 3600_000;
export const BUNDLED: FigureSet = { dated: FIGURES, undated: UNDATED, source: 'bundled' };

/** Chuyển bản ghi từ bảng (đã lọc active) thành bộ nhân vật; bỏ qua dòng lỗi. */
export function fromDbRows(rows: Record<string, unknown>[]): Omit<FigureSet, 'source'> | null {
  const table = [[...FIGURE_COLUMNS], ...rows.map((r) => FIGURE_COLUMNS.map((c) => r[c] == null ? '' : String(r[c])))];
  const { items } = rowsToFigures(table); const dated: Record<string, Figure> = {}; const undated: Figure[] = [];
  for (const x of items) if (x.active) { if (x.key) dated[x.key] = x.figure; else undated.push(x.figure); }
  return items.length ? { dated, undated } : null;
}

export async function loadFigures(): Promise<FigureSet> {
  let cached: (Omit<FigureSet, 'source'> & { at: number }) | null = null;
  try { const v = await AsyncStorage.getItem(CACHE); if (v) cached = JSON.parse(v); } catch { /* bỏ qua */ }
  if (!supabase) return BUNDLED;
  if (cached && Date.now() - cached.at < MAX_AGE) return { dated: cached.dated, undated: cached.undated, source: 'cache' };
  try {
    const { data, error } = await supabase.from('daily_figures').select(FIGURE_COLUMNS.join(',')).eq('active', true).limit(1000);
    if (error) throw error;
    const set = fromDbRows((data ?? []) as unknown as Record<string, unknown>[]);
    if (set) { AsyncStorage.setItem(CACHE, JSON.stringify({ ...set, at: Date.now() })).catch(() => {}); return { ...set, source: 'remote' }; }
  } catch { /* mạng lỗi: dùng bản sao */ }
  return cached ? { dated: cached.dated, undated: cached.undated, source: 'cache' } : BUNDLED;
}
