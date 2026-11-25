import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIGURES, UNDATED, pickFigure } from '../src/data/figures.ts';
import { figuresToCsv, parseCsv, rowsToFigures } from '../src/lib/figuresCsv.ts';

test('dữ liệu đi kèm đủ 01/12–31/12 và ngày sinh khớp khóa', () => {
  for (let d = 1; d <= 31; d++) assert.ok(FIGURES[`12-${String(d).padStart(2, '0')}`], `thiếu 12-${d}`);
  for (const [k, f] of Object.entries(FIGURES)) assert.equal(k, `${String(f.born.m).padStart(2, '0')}-${String(f.born.d).padStart(2, '0')}`, f.id);
  assert.equal(FIGURES['12-25'].id, 'newton'); assert.match(FIGURES['12-25'].note ?? '', /Julius/);
});
test('CSV xuất ra rồi đọc lại giữ nguyên nội dung', () => {
  const list = [...Object.entries(FIGURES).map(([key, figure]) => ({ key, figure })), ...UNDATED.map((figure) => ({ key: null, figure }))];
  const { items, issues } = rowsToFigures(parseCsv(figuresToCsv(list)));
  assert.deepEqual(issues, []); assert.equal(items.length, list.length);
  for (const x of items) assert.deepEqual(x.figure, x.key ? FIGURES[x.key] : UNDATED.find((f) => f.id === x.figure.id));
});
test('tệp mẫu supabase/daily-figures.csv hợp lệ và bắt đầu từ 01/12', () => {
  const t = parseCsv(readFileSync(new URL('../supabase/daily-figures.csv', import.meta.url), 'utf8'));
  assert.equal(t[1][0], '12-01'); assert.deepEqual(rowsToFigures(t).issues, []);
});
test('CSV có ngoặc kép, dấu phẩy và xuống dòng trong ô', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, ""y""","dòng 1\ndòng 2"\n'), [['a', 'b'], ['x, "y"', 'dòng 1\ndòng 2']]);
});
test('báo lỗi đúng dòng và cột', () => {
  const head = 'date,id,name,born_year,born_month,born_day,died_year,field,art,vi_hint,vi_fact,en_hint,en_fact,active';
  const ok = '12-05,abc,Tên A,1900,12,5,1950,math,symbol,a,b,c,d,true';
  const csv = [head, ok, '12-05,abd,Tên B,1901,12,5,1960,math,symbol,a,b,c,d,true', '13-01,abc,Tên C,1900,,,1950,magic,photo,a,b,c,,1', '02-30,x-y,Tên D,1900,,,1950,math,symbol,a,b,c,d,false'].join('\n');
  const { items, issues } = rowsToFigures(parseCsv(csv));
  assert.equal(items.length, 1);
  assert.deepEqual(issues.map((i) => `${i.row}:${i.col}:${i.kind}`), ['3:date:duplicate', '4:date:invalid', '4:id:duplicate', '4:field:invalid', '4:art:invalid', '4:en_fact:missing', '5:date:invalid']);
  assert.deepEqual(rowsToFigures(parseCsv('id,name\nx,y')).issues.map((i) => i.col), ['date', 'born_year', 'field', 'art', 'vi_hint', 'vi_fact', 'en_hint', 'en_fact']);
});
test('dòng tắt không chiếm ngày, ngày chưa có nhân vật thì luân phiên', () => {
  const r = pickFigure('2027-03-15', { '12-01': FIGURES['12-01'] }, UNDATED);
  assert.equal(r.birthday, false); assert.ok(['lobachevsky', 'nguyen-trai'].includes(r.figure.id));
});
