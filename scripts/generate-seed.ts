import { writeFileSync } from 'node:fs';
import { CANDIDATES, COUNTRIES, DESTINATIONS, DOMAINS, HUBS, LANGUAGES, TOPICS } from '../src/data/catalog.ts';
import { FIGURES, UNDATED } from '../src/data/figures.ts';
import { figuresToCsv, FIGURE_COLUMNS, figureToRow } from '../src/lib/figuresCsv.ts';
const q = (v: unknown): string => v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
const arr = (v: readonly string[]) => `array[${v.map(q).join(',')}]::text[]`;
const out: string[] = ['-- Sinh tự động từ src/data/catalog.ts. Không sửa tay.', 'begin;'];
LANGUAGES.forEach((l, i) => out.push(`insert into languages(code,native_name,english_name,ui_enabled,legal_reviewed,sort_order) values (${q(l.code)},${q(l.native)},${q(l.english)},${l.code === 'vi'},${l.code === 'vi'},${i}) on conflict (code) do nothing;`));
out.push(`insert into languages(code,native_name,english_name,sort_order) values ('ms','Bahasa Melayu','Malay',90),('hi','हिन्दी','Hindi',91) on conflict do nothing;`);
out.push(`insert into regions(id,country_code,name) values ('vn-hanoi','VN','Hà Nội'),('vn-laocai','VN','Lào Cai') on conflict do nothing;`);
DOMAINS.forEach((d, i) => out.push(`insert into topic_domains values (${q(d.id)},${i},${q(d.vi)},${q(d.en)}) on conflict do nothing;`));
TOPICS.forEach((t) => out.push(`insert into topics(id,domain_id,name_vi,name_en) values (${q(t.id)},${q(t.domain)},${q(t.vi)},${q(t.en)}) on conflict do nothing;`));
for (const h of HUBS) {
  out.push(`insert into hubs(slug,region_id,level,status,wage_region,lat,lng,radius_m,venue_name,ticket_required) values (${q(h.slug)},${q(h.region)},${q(h.level)},'preparing',${h.wageRegion},${h.lat},${h.lng},${h.radius},${q(h.venue)},${h.ticket ? 'true' : 'false'}) on conflict (slug) do nothing;`);
  for (const loc of ['vi', 'en'] as const) out.push(`insert into hub_translations(hub_id,locale,name,summary,story,meeting_point,open_hours,entry_note) select id,${q(loc)},${q(h[loc].name)},${q(h[loc].summary)},${q(h[loc].story)},${q(h[loc].meeting)},${q(h[loc].hours)},${q(h[loc].entry)} from hubs where slug=${q(h.slug)} on conflict do nothing;`);
  for (const t of h.topics) out.push(`insert into hub_topics select id,${q(t)} from hubs where slug=${q(h.slug)} on conflict do nothing;`);
}
for (const c of COUNTRIES) out.push(`insert into expansion_countries(code,name_vi,name_en,wave,intl_arrivals_m,arrivals_year,arrivals_source,primary_languages) values (${q(c[0])},${q(c[1])},${q(c[2])},${c[3]},${q(c[4])},${q(c[5])},${q(c[6])},${arr(c[7])}) on conflict do nothing;`);
for (const d of DESTINATIONS) out.push(`insert into destinations(id,country_code,name,lat,lng,wave,thesis,total_visitors_m,intl_visitors_m,metric_period) values (${q(d[0])},${q(d[1])},${q(d[2])},${d[3]},${d[4]},${d[5]},${q(d[6])},${q(d[7])},${q(d[8])},${q(d[9])}) on conflict do nothing;`);
for (const c of CANDIDATES) out.push(`insert into hub_candidates(destination_id,name,category,proposed_level) values (${q(c[0])},${q(c[1])},${q(c[2])},${q(c[3])}) on conflict do nothing;`);
// Nhân vật hôm nay: bắt đầu từ 01/12, rồi đến các ngày tháng 11 (dùng cho năm sau) và nhân vật chưa rõ ngày sinh.
const keys = Object.keys(FIGURES).sort((a, b) => (a < '12' ? 'z' + a : a).localeCompare(b < '12' ? 'z' + b : b));
const figs = [...keys.map((k) => ({ key: k, figure: FIGURES[k] })), ...UNDATED.map((f) => ({ key: null, figure: f }))];
const ints = new Set(['born_year', 'born_month', 'born_day', 'died_year']);
for (const x of figs) {
  const r = figureToRow(x.key, x.figure);
  const vals = FIGURE_COLUMNS.map((c) => c === 'active' ? 'true' : r[c] === '' && c !== 'symbol' ? 'null' : ints.has(c) ? r[c] : q(r[c]));
  out.push(`insert into daily_figures(${FIGURE_COLUMNS.join(',')}) values (${vals.join(',')}) on conflict (id) do nothing;`);
}
out.push('commit;');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n') + '\n');
writeFileSync(new URL('../supabase/daily-figures.csv', import.meta.url), figuresToCsv(figs));
