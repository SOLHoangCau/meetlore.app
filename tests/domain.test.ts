import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyMonthlyCap, calcPoints, partnerBudgetCap, pointValueVnd, sessionValue, splitPoints, voucherQuote, type EffortHours, type ContributionKind, type Provenance, type Rarity } from '../supabase/functions/_shared/points.ts';
import { rankMatches, scorePair, sharedDays, type MatchProfile } from '../supabase/functions/_shared/matching.ts';
import { canOpenHub, priorityScore } from '../supabase/functions/_shared/expansion.ts';

const vectors = JSON.parse(readFileSync(new URL('../supabase/tests/points-vectors.json', import.meta.url), 'utf8'));
for (const v of vectors) {
  test(`điểm: ${v.name}`, () => {
    const [accuracy, originality, usefulness, clarity, sourcing] = v.r;
    const result = calcPoints({ kind: v.kind as ContributionKind, effortHours: v.effort as EffortHours, rubric: { accuracy, originality, usefulness, clarity, sourcing }, rarity: v.rarity as Rarity, provenance: v.prov as Provenance });
    assert.equal(result.approved ? result.points : null, v.points);
  });
}

test('chia điểm luôn đủ tổng', () => {
  const rows = splitPoints(101, [{ id: 'a', percent: 50 }, { id: 'b', percent: 50 }]);
  assert.equal(rows[0].points + rows[1].points, 101);
  assert.deepEqual(rows.map((r) => r.points), [51, 50]);
  assert.throws(() => splitPoints(10, [{ id: 'a', percent: 60 }]));
});

test('trần tháng', () => { assert.equal(applyMonthlyCap(300, 1100), 100); assert.equal(applyMonthlyCap(300, 1300), 0); });

const base = (over: Partial<MatchProfile>): MatchProfile => ({
  id: 'x', adult: true, active: true, discoverable: true, modes: ['in_person', 'online'], languages: [], offers: [], seeks: [], orientation: 70,
  presence: [{ hubId: 'van-mieu', role: 'local', weekdays: [0, 6] }], ...over,
});
const today = '2026-12-01';
const traveler = base({
  id: 'mina', languages: [{ code: 'ko', level: 'native' }, { code: 'en', level: 'fluent' }],
  offers: [{ topicId: 'ceramics', domainId: 'craft', depth: 'medium' }],
  seeks: [{ topicId: 'confucian-exam', domainId: 'history', depth: 'medium', importance: 3 }],
  presence: [{ hubId: 'van-mieu', role: 'traveler', from: '2026-12-04', to: '2026-12-08' }],
});
const student = base({
  id: 'lan', languages: [{ code: 'vi', level: 'native' }, { code: 'ko', level: 'learning' }],
  offers: [{ topicId: 'confucian-exam', domainId: 'history', depth: 'medium' }],
  seeks: [{ languageCode: 'ko', depth: 'short', importance: 3 }],
});

test('không có ngôn ngữ chung vẫn được gợi ý và gắn nhãn luyện ngôn ngữ', () => {
  const m = scorePair(traveler, student, 'in_person', today);
  assert.ok(m); assert.equal(m.languageMode, 'practice'); assert.equal(m.hubId, 'van-mieu'); assert.equal(m.sharedDays, 2);
});
test('nhãn hỗ trợ dịch khi không có ngôn ngữ chung và không ai luyện', () => {
  const a = base({ ...traveler, id: 'a', languages: [{ code: 'ru', level: 'native' }], seeks: traveler.seeks, offers: [{ topicId: 'weaving', domainId: 'craft', depth: 'deep' }] });
  const b = base({ ...student, id: 'b', languages: [{ code: 'hmn', level: 'native' }], seeks: [{ domainId: 'craft', depth: 'deep', importance: 2 }] });
  assert.equal(scorePair(a, b, 'in_person', today)?.languageMode, 'translate');
});
test('chỉ cần du khách cho đi khớp điều người bản địa muốn nhận', () => {
  const giver = { ...traveler, seeks: [], offers: [{ topicId: 'programming', domainId: 'technology', depth: 'medium' as const }] };
  const local = base({ id: 'local', seeks: [{ topicId: 'programming', domainId: 'technology', depth: 'medium', importance: 3 }] });
  assert.ok(scorePair(giver, local, 'in_person', today));
  assert.equal(scorePair({ ...giver, offers: [] }, local, 'in_person', today), null);
});
test('hai bên cùng có lợi được xếp cao hơn', () => {
  const giver = { ...traveler, id: 'g', seeks: [], offers: [{ topicId: 'programming', domainId: 'technology', depth: 'medium' as const }] };
  const local = base({ id: 'one', seeks: [{ topicId: 'programming', domainId: 'technology', depth: 'medium', importance: 3 }] });
  const mutual = { ...local, id: 'two', offers: [{ topicId: 'han-nom', domainId: 'language', depth: 'medium' as const }] };
  const me = { ...giver, seeks: [{ topicId: 'han-nom', domainId: 'language', depth: 'medium' as const, importance: 3 as const }] };
  assert.equal(rankMatches(me, [local, mutual], { today })[0].candidateId, 'two');
});
test('chặn, dưới 18, không trùng ngày đều bị loại', () => {
  assert.equal(scorePair({ ...traveler, blockedIds: ['lan'] }, student, 'in_person', today), null);
  assert.equal(scorePair(traveler, { ...student, blockedIds: ['mina'] }, 'in_person', today), null);
  assert.equal(scorePair(traveler, { ...student, adult: false }, 'in_person', today), null);
  assert.equal(scorePair({ ...traveler, presence: [{ hubId: 'van-mieu', role: 'traveler', from: '2026-12-07', to: '2026-12-11' }] }, { ...student, presence: [{ hubId: 'van-mieu', role: 'local', weekdays: [1] }] }, 'in_person', '2026-12-08'), null);
});
test('trực tuyến không cần trùng nơi', () => {
  const m = scorePair({ ...traveler, presence: [] }, { ...student, presence: [] }, 'online', today);
  assert.equal(m?.mode, 'online'); assert.equal(m?.hubId, null);
});
test('ưu tiên cùng giới tính do người dùng chọn', () => {
  const me = { ...traveler, meetPreference: 'same_gender' as const, gender: 'female' };
  assert.equal(scorePair(me, student, 'in_person', today), null);
  assert.ok(scorePair(me, { ...student, gender: 'female' }, 'in_person', today));
});
test('người đang nhận quá nhiều lời mời bị giảm thứ hạng', () => {
  const busy = { ...student, id: 'busy', pendingRequests: 30 };
  assert.deepEqual(rankMatches(traveler, [busy, { ...student, id: 'free' }], { today }).map((m) => m.candidateId), ['free', 'busy']);
});
test('đếm ngày chung', () => { assert.equal(sharedDays({ hubId: 'h', role: 'traveler', from: '2026-12-04', to: '2026-12-08' }, { hubId: 'h', role: 'local' }, today), 5); });
test('điểm mở Hub', () => {
  const s = priorityScore({ demand: 5, knowledge: 5, localSupply: 4, meetSafety: 4, partnerAccess: 3, feasibility: 3 });
  assert.equal(s, 85); assert.equal(canOpenHub({ legal: true, community: true, safety: true }, s), true);
  assert.equal(canOpenHub({ legal: true, community: false, safety: true }, 99), false);
});

import { canSubmit, combineReview, parseAiReview, reviewWindow, ruleChecks, type VerificationInput } from '../supabase/functions/_shared/verification.ts';
const app: VerificationInput = { legalName: 'Nguyễn Văn An', birthYear: 1998, nationality: 'VN', phone: '+84900000011', currentCity: 'Hà Nội', docType: 'national_id', docCountry: 'VN', docLast4: '1234', hasDocImage: true, hasSelfie: true, helpers: [{ name: 'Trần Thị Bình', relation: 'family', phone: '+84900000099', informed: true }] };
test('hồ sơ đầy đủ được gửi', () => { const f = ruleChecks(app, 2026); assert.equal(canSubmit(f), true); assert.equal(f.length, 0); });
test('thiếu người trợ giúp hoặc dưới 18 thì không gửi được', () => {
  assert.equal(canSubmit(ruleChecks({ ...app, helpers: [] }, 2026)), false);
  assert.equal(canSubmit(ruleChecks({ ...app, birthYear: 2010 }, 2026)), false);
  assert.equal(canSubmit(ruleChecks({ ...app, helpers: [{ ...app.helpers[0], phone: app.phone }] }, 2026)), false);
});
test('rao dịch vụ trong hồ sơ là rủi ro cao', () => { const r = combineReview(ruleChecks({ ...app, bio: 'Dẫn tour 200k/giờ, liên hệ zalo' }, 2026), { risk: 'low', score: 5, summary: 'ok', flags: [] }); assert.equal(r.risk, 'high'); assert.ok(r.score >= 70); });
test('AI lỗi vẫn chuyển Admin ở mức trung bình', () => { const r = combineReview([], parseAiReview({ risk: 'approve' })); assert.equal(r.risk, 'medium'); assert.ok(r.flags.some((f) => f.code === 'ai_unavailable')); });
test('thời gian chờ theo rủi ro', () => {
  assert.equal(reviewWindow(new Date('2026-12-01T00:00:00Z'), 'low').opensAt.toISOString(), '2026-12-02T00:00:00.000Z');
  assert.equal(reviewWindow(new Date('2026-12-01T00:00:00Z'), 'high').opensAt.toISOString(), '2026-12-03T00:00:00.000Z');
  assert.equal(reviewWindow(new Date('2026-12-01T00:00:00Z'), 'medium').dueAt.toISOString(), '2026-12-04T00:00:00.000Z');
});

test('giá trị 1 điểm theo vùng', () => { assert.deepEqual([1, 2, 3, 4].map((r) => pointValueVnd(r as 1 | 2 | 3 | 4)), [1442, 1284, 1131, 1007]); });
test('buổi chia sẻ 6 người 2 giờ', () => {
  const v = sessionValue(6, 120, 1);
  assert.deepEqual([v.equivalentHours, v.points, v.referenceVnd, v.conservativeVnd, v.perRecipientHours], [6, 600, 865386, 288462, 1]);
  assert.equal(sessionValue(12, 120, 1).points, 600); assert.equal(sessionValue(1, 60, 1).points, 50);
});
test('đổi ưu đãi: 7 điểm chia cho cơ sở và quỹ', () => { assert.deepEqual(voucherQuote(200000, 5, null, 1), { discountVnd: 10000, points: 7, ownerPoints: 3, fundPoints: 4 }); });
test('trần ngân sách cơ sở', () => { assert.equal(partnerBudgetCap(10_000_000), 500_000); assert.equal(partnerBudgetCap(0), 5_000_000); });
