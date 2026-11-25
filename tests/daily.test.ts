import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeWait, dayKey, dayNumber, pickDaily, shouldShowSponsor, streak, yearQuiz } from '../src/lib/daily.ts';
import { FIGURES, UNDATED, figureFor, hasFullDate } from '../src/data/figures.ts';

test('luân phiên nhà tài trợ mỗi ngày', () => {
  const list = [{ id: 'b', sort: 2 }, { id: 'a', sort: 1 }, { id: 'c', sort: 3 }];
  const days = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map((d) => pickDaily(list, d)?.id);
  assert.equal(new Set(days.slice(0, 3)).size, 3, 'ba ngày liên tiếp ba nhà tài trợ khác nhau');
  assert.equal(days[3], days[0], 'quay vòng sau ba ngày');
  assert.equal(pickDaily([], '2026-11-20'), null);
  assert.equal(pickDaily(list, '2025-12-31')?.id !== undefined, true, 'ngày trước mốc vẫn chọn được');
});
test('ảnh tĩnh tắt được ngay, ảnh động chờ tối đa 5 giây', () => {
  const cfg = { enabled: true, showSeconds: 6, animatedWaitSeconds: 9 };
  assert.equal(closeWait('static', cfg), 0);
  assert.equal(closeWait('animated', cfg), 5);
});
test('điều kiện hiện màn hình nhà tài trợ', () => {
  const base = { enabled: true, signedIn: true, onboarded: true, firstDay: '2026-11-01', lastShown: '2026-11-19', today: '2026-11-20', fromNotification: false, hasSponsor: true };
  assert.equal(shouldShowSponsor(base), true);
  assert.equal(shouldShowSponsor({ ...base, lastShown: '2026-11-20' }), false, 'mỗi ngày một lần');
  assert.equal(shouldShowSponsor({ ...base, fromNotification: true }), false, 'mở từ thông báo thì vào thẳng');
  assert.equal(shouldShowSponsor({ ...base, firstDay: '2026-11-20' }), false, 'ngày đầu dùng app không quảng cáo');
  assert.equal(shouldShowSponsor({ ...base, onboarded: false }), false);
  assert.equal(shouldShowSponsor({ ...base, enabled: false }), false);
});
test('trò đoán năm sinh', () => {
  for (const [y, seed] of [[1889, '2026-11-20'], [1701, 'x'], [1999, 'y'], [2010, 'z'], [1380, 'nguyen-trai'], [1800, 'a'], [1811, 'b']] as const) {
    const q = yearQuiz(y, seed, 2026);
    assert.equal(q.prefix + q.answer, String(y));
    assert.equal(q.options.length, 3, `ba lựa chọn cho ${y}`);
    assert.equal(new Set(q.options).size, 3);
    assert.ok(q.options.includes(q.answer));
    for (const o of q.options) { assert.match(o, /^\d\d$/); assert.ok(Number(q.prefix + o) <= 2026, 'không có năm tương lai'); }
    assert.deepEqual(yearQuiz(y, seed, 2026), q, 'cùng ngày cùng đáp án');
  }
});
test('chuỗi ngày chơi', () => {
  assert.equal(streak(['2026-11-18', '2026-11-19', '2026-11-20'], '2026-11-20'), 3);
  assert.equal(streak(['2026-11-18', '2026-11-19'], '2026-11-20'), 2, 'chưa chơi hôm nay vẫn giữ chuỗi');
  assert.equal(streak(['2026-11-17'], '2026-11-20'), 0);
  assert.equal(streak(['2026-12-31', '2027-01-01'], '2027-01-01'), 2, 'qua năm mới');
});
test('dữ liệu nhân vật hợp lệ', () => {
  assert.equal(dayNumber('2026-01-01'), 0);
  assert.match(dayKey(new Date(2026, 10, 20)), /^2026-11-20$/);
  for (const [k, f] of Object.entries(FIGURES)) {
    assert.equal(`${String(f.born.m).padStart(2, '0')}-${String(f.born.d).padStart(2, '0')}`, k, `${f.name} đúng ngày`);
    assert.ok(hasFullDate(f));
    if (f.art === 'portrait') assert.ok(f.died < 1950, `${f.name}: chân dung chỉ cho người mất trước 1950`);
    assert.ok(f.vi.hint && f.vi.fact && f.en.hint && f.en.fact && f.symbol);
    assert.ok(f.born.y >= 1000 && f.died > f.born.y);
  }
  for (const f of UNDATED) assert.ok(!hasFullDate(f));
  assert.equal(figureFor('2026-11-20').figure.id, 'hubble');
  assert.equal(figureFor('2026-11-20').birthday, true);
  assert.equal(figureFor('2026-03-03').birthday, false, 'ngày chưa có nhân vật vẫn có người để hiện');
  assert.equal(new Set([...Object.values(FIGURES), ...UNDATED].map((f) => f.id)).size, Object.keys(FIGURES).length + UNDATED.length, 'không trùng id');
});
