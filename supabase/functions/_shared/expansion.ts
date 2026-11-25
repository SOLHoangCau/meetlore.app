// Chấm điểm địa điểm ứng viên để mở Hub mới. Công thức SQL tương ứng: cột hub_candidates.priority_score.
export type CandidateScores = {
  demand: number; // lượng khách, tín hiệu trong app
  knowledge: number; // độ giàu tri thức, di sản, nghề, ngôn ngữ
  localSupply: number; // sinh viên, nghệ nhân, câu lạc bộ, người sẵn sàng tham gia
  meetSafety: number; // nơi công cộng, ánh sáng, chỗ ngồi, y tế, đi lại
  partnerAccess: number; // có đơn vị quản lý hoặc đối tác dễ tiếp cận
  feasibility: number; // sóng, chi phí, đường đi, độ khó vận hành
};

export type CandidateGates = { legal: boolean; community: boolean; safety: boolean };

export const EXPANSION_WEIGHTS: Record<keyof CandidateScores, number> = {
  demand: 25, knowledge: 20, localSupply: 20, meetSafety: 15, partnerAccess: 10, feasibility: 10,
};

export function priorityScore(s: CandidateScores): number {
  let total = 0;
  for (const key of Object.keys(EXPANSION_WEIGHTS) as (keyof CandidateScores)[]) {
    if (s[key] < 0 || s[key] > 5) throw new RangeError('Điểm từ 0 đến 5');
    total += (s[key] * EXPANSION_WEIGHTS[key]) / 5;
  }
  return Math.round(total * 10) / 10;
}

export function canOpenHub(g: CandidateGates, score: number): boolean {
  return g.legal && g.community && g.safety && score >= 60;
}
