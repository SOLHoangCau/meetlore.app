import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunk, LOCK_AFTER_MS, MAX_SESSION_DAYS, sessionExpired, shouldRelock } from '../src/lib/authPolicy.ts';
const DAY = 86_400_000; const t0 = Date.UTC(2026, 11, 1);

test('phiên còn hạn trước 180 ngày, hết hạn từ ngày thứ 180', () => {
  assert.equal(MAX_SESSION_DAYS, 180);
  assert.equal(sessionExpired(t0, t0 + 179 * DAY), false);
  assert.equal(sessionExpired(t0, t0 + 180 * DAY - 1), false);
  assert.equal(sessionExpired(t0, t0 + 180 * DAY), true);
  assert.equal(sessionExpired(null, t0 + 999 * DAY), false);
});
test('chỉ khóa lại khi đã bật và ở nền từ 5 phút', () => {
  assert.equal(shouldRelock(true, t0, t0 + LOCK_AFTER_MS - 1), false);
  assert.equal(shouldRelock(true, t0, t0 + LOCK_AFTER_MS), true);
  assert.equal(shouldRelock(false, t0, t0 + 10 * LOCK_AFTER_MS), false);
  assert.equal(shouldRelock(true, null, t0), false);
});
test('chia phiên thành phần nhỏ rồi ghép lại đúng', () => {
  const s = 'x'.repeat(4000) + 'ếẫ';
  const parts = chunk(s, 1800);
  assert.equal(parts.length, 3); assert.ok(parts.every((p) => p.length <= 1800)); assert.equal(parts.join(''), s);
  assert.deepEqual(chunk('', 1800), ['']);
});
