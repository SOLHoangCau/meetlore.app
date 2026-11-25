// Đọc/ghi CSV "Nhân vật hôm nay". Cùng tên cột với bảng public.daily_figures để nhập thẳng bằng Supabase Table Editor.
import { FIELDS, type FieldKey, type Figure } from '../data/figures.ts';

export const FIGURE_COLUMNS = ['date', 'id', 'name', 'born_year', 'born_month', 'born_day', 'died_year', 'field', 'art', 'image',
  'vi_hint', 'vi_fact', 'en_hint', 'en_fact', 'quote_orig', 'quote_vi', 'quote_en', 'quote_src', 'active', 'symbol', 'note'] as const;
export type FigureRow = Record<(typeof FIGURE_COLUMNS)[number], string>;
export type CsvIssue = { row: number; col: string; kind: 'missing' | 'invalid' | 'duplicate' };
export type ParsedFigure = { key: string | null; figure: Figure; active: boolean };

/** CSV theo RFC 4180: dấu phẩy, ngoặc kép bao giá trị, "" là một dấu ngoặc kép, xuống dòng trong ngoặc. Bỏ BOM của Excel. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, ''); const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
const esc = (v: string) => /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
export const toCsv = (rows: string[][]) => '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';

export function figureToRow(key: string | null, f: Figure, active = true): FigureRow {
  return { date: key ?? '', id: f.id, name: f.name, born_year: String(f.born.y), born_month: f.born.m ? String(f.born.m) : '', born_day: f.born.d ? String(f.born.d) : '',
    died_year: String(f.died), field: f.field, art: f.art, image: f.image ?? `${f.id}.webp`, vi_hint: f.vi.hint, vi_fact: f.vi.fact, en_hint: f.en.hint, en_fact: f.en.fact,
    quote_orig: f.quote?.orig ?? '', quote_vi: f.quote?.vi ?? '', quote_en: f.quote?.en ?? '', quote_src: f.quote?.src ?? '', active: active ? 'true' : 'false', symbol: f.symbol, note: f.note ?? '' };
}
export const figuresToCsv = (list: { key: string | null; figure: Figure; active?: boolean }[]) =>
  toCsv([[...FIGURE_COLUMNS], ...list.map((x) => { const r = figureToRow(x.key, x.figure, x.active ?? true); return FIGURE_COLUMNS.map((c) => r[c]); })]);

const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const int = (v: string) => /^-?\d+$/.test(v.trim()) ? Number(v.trim()) : NaN;
const truthy = (v: string) => !/^(false|0|no|không|khong)$/i.test(v.trim());

/** Kiểm tra và chuyển các dòng CSV thành nhân vật. Dòng đầu là tiêu đề; số dòng báo lỗi tính như trong Excel (tiêu đề là dòng 1). */
export function rowsToFigures(table: string[][]): { items: ParsedFigure[]; issues: CsvIssue[] } {
  const issues: CsvIssue[] = []; const items: ParsedFigure[] = [];
  const head = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  for (const c of ['date', 'id', 'name', 'born_year', 'field', 'art', 'vi_hint', 'vi_fact', 'en_hint', 'en_fact'] as const) if (!head.includes(c)) issues.push({ row: 1, col: c, kind: 'missing' });
  if (issues.length) return { items, issues };
  const ids = new Set<string>(); const dates = new Set<string>();
  table.slice(1).forEach((cells, i) => {
    const n = i + 2; const r = Object.fromEntries(FIGURE_COLUMNS.map((c) => [c, (cells[head.indexOf(c)] ?? '').trim()])) as FigureRow;
    const bad = (col: string, kind: CsvIssue['kind'] = 'invalid') => { issues.push({ row: n, col, kind }); };
    const before = issues.length;
    let key: string | null = null;
    if (r.date) { const m = /^(\d{1,2})-(\d{1,2})$/.exec(r.date); if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] < 1 || +m[2] > DAYS[+m[1] - 1]) bad('date'); else key = `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
    if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(r.id)) bad('id'); else if (ids.has(r.id)) bad('id', 'duplicate'); else ids.add(r.id);
    if (r.name.length < 2) bad('name', 'missing');
    const y = int(r.born_year), m = r.born_month ? int(r.born_month) : undefined, d = r.born_day ? int(r.born_day) : undefined, died = int(r.died_year);
    if (!(y > -3000 && y < 2100)) bad('born_year');
    if (m !== undefined && !(m >= 1 && m <= 12)) bad('born_month');
    if (d !== undefined && !(d >= 1 && d <= 31 && m !== undefined)) bad('born_day');
    if (!(died >= y && died < 2100)) bad('died_year');
    if (!(r.field in FIELDS)) bad('field');
    if (r.art !== 'portrait' && r.art !== 'symbol') bad('art');
    if (r.image && !/^[A-Za-z0-9._-]+\.(webp|png|jpe?g)$/.test(r.image)) bad('image');
    for (const c of ['vi_hint', 'vi_fact', 'en_hint', 'en_fact'] as const) if (!r[c]) bad(c, 'missing');
    const quote = [r.quote_orig, r.quote_vi, r.quote_en, r.quote_src]; if (quote.some(Boolean) && !quote.every(Boolean)) bad('quote_src', 'missing');
    const active = r.active === '' || truthy(r.active);
    if (key && m !== undefined && d !== undefined && key !== `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`) bad('date');
    if (key && active) { if (dates.has(key)) bad('date', 'duplicate'); else dates.add(key); }
    if (issues.length > before) return;
    items.push({ key, active, figure: { id: r.id, name: r.name, born: { y, ...(m ? { m } : {}), ...(d ? { d } : {}) }, died, field: r.field as FieldKey, art: r.art as Figure['art'],
      vi: { hint: r.vi_hint, fact: r.vi_fact }, en: { hint: r.en_hint, fact: r.en_fact }, symbol: r.symbol, ...(r.note ? { note: r.note } : {}),
      ...(r.image && r.image !== `${r.id}.webp` ? { image: r.image } : {}),
      ...(r.quote_orig ? { quote: { orig: r.quote_orig, vi: r.quote_vi, en: r.quote_en, src: r.quote_src } } : {}) } });
  });
  return { items, issues };
}

/** Bản ghi gửi lên hàm import_daily_figures (khớp cột bảng). */
export const toDbRow = (x: ParsedFigure) => { const r = figureToRow(x.key, x.figure, x.active); return { ...r, date: x.key, born_year: x.figure.born.y, born_month: x.figure.born.m ?? null, born_day: x.figure.born.d ?? null, died_year: x.figure.died, active: x.active, quote_orig: r.quote_orig || null, quote_vi: r.quote_vi || null, quote_en: r.quote_en || null, quote_src: r.quote_src || null, note: r.note || null }; };
