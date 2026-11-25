// Cách tính Giờ tri thức và điểm đóng góp. File này không phụ thuộc gì để app,
// Edge Function và test dùng chung. Công thức SQL tương ứng: calc_knowledge_points.

export const POINTS_PER_KNOWLEDGE_HOUR = 100;
export const MAX_POINTS_PER_ITEM = 600;
export const MAX_POINTS_PER_MONTH = 1200;
export const SESSION_POINT_CAP = 600;
export const PENDING_DAYS = 30;
export const EXPIRY_MONTHS = 24;

export type ContributionKind = 'knowledge_note' | 'source_material' | 'translation_review' | 'hub_correction';
export type Rarity = 'common' | 'thin' | 'missing';
export type Provenance = 'secondary' | 'firsthand' | 'verified';

export const EFFORT_BANDS = [0.25, 0.5, 1, 2, 4] as const;
export type EffortHours = (typeof EFFORT_BANDS)[number];

export const MAX_EFFORT_BY_KIND: Record<ContributionKind, EffortHours> = {
  knowledge_note: 4,
  source_material: 2,
  translation_review: 1,
  hub_correction: 0.5,
};

export const RARITY_FACTOR: Record<Rarity, number> = { common: 1, thin: 1.2, missing: 1.5 };
export const PROVENANCE_FACTOR: Record<Provenance, number> = { secondary: 1, firsthand: 1.1, verified: 1.25 };

export type Rubric = {
  accuracy: number;
  originality: number;
  usefulness: number;
  clarity: number;
  sourcing: number;
};

export type PointsInput = {
  kind: ContributionKind;
  effortHours: EffortHours;
  rubric: Rubric;
  rarity: Rarity;
  provenance: Provenance;
};

export type PointsResult =
  | { approved: false; reason: 'accuracy' | 'sourcing' | 'low_quality'; total: number }
  | { approved: true; total: number; quality: number; points: number; knowledgeHours: number };

export function qualityFactor(total: number): number {
  if (total >= 10) return 1.5;
  if (total >= 9) return 1.25;
  if (total >= 7) return 1;
  return 0.75;
}

export function calcPoints(input: PointsInput): PointsResult {
  const r = input.rubric;
  for (const value of Object.values(r)) {
    if (!Number.isInteger(value) || value < 0 || value > 2) throw new RangeError('Mỗi tiêu chí chấm từ 0 đến 2');
  }
  if (!EFFORT_BANDS.includes(input.effortHours)) throw new RangeError('Số giờ không thuộc các mức cho phép');
  const total = r.accuracy + r.originality + r.usefulness + r.clarity + r.sourcing;
  if (r.accuracy === 0) return { approved: false, reason: 'accuracy', total };
  if (r.sourcing === 0) return { approved: false, reason: 'sourcing', total };
  if (total < 5) return { approved: false, reason: 'low_quality', total };

  const effort = Math.min(input.effortHours, MAX_EFFORT_BY_KIND[input.kind]);
  const quality = qualityFactor(total);
  const raw = POINTS_PER_KNOWLEDGE_HOUR * effort * quality * RARITY_FACTOR[input.rarity] * PROVENANCE_FACTOR[input.provenance];
  // Làm tròn trên số nguyên phần vạn để tránh sai số dấu phẩy động, khớp với SQL numeric.
  const points = Math.min(MAX_POINTS_PER_ITEM, Math.round(Math.round(raw * 10000) / 10000));
  return { approved: true, total, quality, points, knowledgeHours: points / POINTS_PER_KNOWLEDGE_HOUR };
}

/** Chia điểm cho đồng tác giả theo phần trăm; tổng các phần luôn bằng `points`. */
export function splitPoints(points: number, shares: { id: string; percent: number }[]): { id: string; points: number }[] {
  const sum = shares.reduce((s, x) => s + x.percent, 0);
  if (shares.length === 0 || sum !== 100) throw new RangeError('Tổng phần chia phải bằng 100');
  const rows = shares.map((x, index) => {
    const exact = (points * x.percent) / 100;
    return { id: x.id, index, points: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = points - rows.reduce((s, x) => s + x.points, 0);
  for (const row of [...rows].sort((a, b) => b.rest - a.rest || a.index - b.index)) {
    if (left <= 0) break;
    row.points += 1;
    left -= 1;
  }
  return rows.map(({ id, points: value }) => ({ id, points: value }));
}

export function applyMonthlyCap(points: number, alreadyThisMonth: number): number {
  return Math.max(0, Math.min(points, MAX_POINTS_PER_MONTH - alreadyThisMonth));
}

// ===== Buổi chia sẻ và giá trị tham chiếu (khớp bảng value_parameters) =====
export type WageRegion = 1 | 2 | 3 | 4;
export const VALUE_PARAMETERS = {
  expertMonthlyVnd: 30_000_000, workDays: 26, workHours: 8,
  wage: { 1: 25_500, 2: 22_700, 3: 20_000, 4: 17_800 } as Record<WageRegion, number>,
};
const rawExpertHour = (region: WageRegion) =>
  (VALUE_PARAMETERS.expertMonthlyVnd / VALUE_PARAMETERS.workDays / VALUE_PARAMETERS.workHours) * (VALUE_PARAMETERS.wage[region] / VALUE_PARAMETERS.wage[1]);
export const expertHourVnd = (region: WageRegion) => Math.round(rawExpertHour(region));
export const pointValueVnd = (region: WageRegion) => Math.round(rawExpertHour(region) / POINTS_PER_KNOWLEDGE_HOUR);

export function sessionValue(people: number, minutes: number, region: WageRegion) {
  if (!Number.isInteger(people) || people < 0 || minutes <= 0) throw new RangeError('Số người hoặc số phút không hợp lệ');
  const hours = minutes / 60;
  const equivalentHours = Math.round(hours * people * 50) / 100;
  const hourValue = expertHourVnd(region);
  return {
    equivalentHours,
    points: Math.min(SESSION_POINT_CAP, Math.round(50 * people * hours)),
    referenceVnd: Math.round(equivalentHours * hourValue),
    conservativeVnd: Math.round(hours * hourValue),
    perRecipientHours: hours / 2,
    perRecipientVnd: Math.round((hours / 2) * hourValue),
  };
}

export function voucherQuote(billVnd: number, percent: number, maxDiscountVnd: number | null, region: WageRegion) {
  if (billVnd <= 0 || percent <= 0) throw new RangeError('Hóa đơn hoặc mức giảm không hợp lệ');
  let discountVnd = Math.floor((billVnd * percent) / 100);
  if (maxDiscountVnd !== null) discountVnd = Math.min(discountVnd, maxDiscountVnd);
  const points = Math.ceil(discountVnd / pointValueVnd(region));
  const ownerPoints = Math.floor(points / 2);
  return { discountVnd, points, ownerPoints, fundPoints: points - ownerPoints };
}

export const partnerBudgetCap = (previousRevenueVnd: number, firstMonthMaxVnd = 5_000_000, percent = 5) =>
  previousRevenueVnd > 0 ? Math.floor((previousRevenueVnd * percent) / 100) : firstMonthMaxVnd;
