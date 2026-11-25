// Matching hai chiều của MeetLore. Hàm thuần, không gọi mạng, chạy được ở Edge Function và ở chế độ demo.
// Nguyên tắc: không lọc theo ngôn ngữ, không chấm theo bằng cấp.
// Chỉ cần điều một bên cho đi khớp điều bên kia muốn nhận; hai bên cùng có lợi thì được xếp cao hơn.

export type LanguageLevel = 'native' | 'fluent' | 'conversational' | 'learning';
export type Depth = 'short' | 'medium' | 'deep';
export type MeetMode = 'in_person' | 'online';
export type LanguageMode = 'practice' | 'direct' | 'translate';

export type ProfileLanguage = { code: string; level: LanguageLevel; canHelpPractice?: boolean };
export type Offer = { topicId: string; domainId: string; depth: Depth };
export type Seek = { topicId?: string; domainId?: string; languageCode?: string; depth: Depth; importance: 1 | 2 | 3 };
export type Presence = {
  hubId: string;
  role: 'local' | 'traveler';
  from?: string; // YYYY-MM-DD
  to?: string;
  weekdays?: number[]; // 0 = Chủ nhật
};

export type MatchProfile = {
  id: string;
  adult: boolean;
  active: boolean;
  discoverable: boolean;
  gender?: string | null;
  meetPreference?: 'any' | 'same_gender';
  modes: MeetMode[];
  languages: ProfileLanguage[];
  offers: Offer[];
  seeks: Seek[];
  orientation: number; // 0-100, mức quan tâm tới giá trị tri thức khi đi lại
  presence: Presence[];
  blockedIds?: string[];
  pendingRequests?: number;
  lastActiveDays?: number;
};

export type MatchReason =
  | { kind: 'gives'; topicId: string; exact: boolean }
  | { kind: 'receives'; topicId: string; exact: boolean }
  | { kind: 'gives_language'; languageCode: string }
  | { kind: 'receives_language'; languageCode: string }
  | { kind: 'same_time'; days: number }
  | { kind: 'same_hub'; hubId: string };

export type Match = {
  candidateId: string;
  mode: MeetMode;
  hubId: string | null;
  score: number;
  forMe: number;
  forThem: number;
  sharedDays: number;
  languageMode: LanguageMode;
  sharedLanguages: string[];
  reasons: MatchReason[];
};

type Hit = { value: number; importance: number; reason: MatchReason | null };

const DEPTH_ORDER: Depth[] = ['short', 'medium', 'deep'];
const DAY_MS = 86_400_000;
const MAX_WINDOW_DAYS = 90;

function depthFit(a: Depth, b: Depth): number {
  return 1 - Math.abs(DEPTH_ORDER.indexOf(a) - DEPTH_ORDER.indexOf(b)) * 0.1;
}

function canTeachLanguage(person: MatchProfile, code: string): boolean {
  return person.languages.some(
    (l) => l.code === code && (l.level === 'native' || l.level === 'fluent') && l.canHelpPractice !== false,
  );
}

function seekHit(seek: Seek, provider: MatchProfile, direction: 'gives' | 'receives'): Hit {
  if (seek.languageCode) {
    const ok = canTeachLanguage(provider, seek.languageCode);
    const kind = direction === 'gives' ? 'gives_language' : 'receives_language';
    return { value: ok ? 1 : 0, importance: seek.importance, reason: ok ? { kind, languageCode: seek.languageCode } : null };
  }
  let best: Hit = { value: 0, importance: seek.importance, reason: null };
  for (const offer of provider.offers) {
    const exact = !!seek.topicId && seek.topicId === offer.topicId;
    const sameDomain = !!seek.domainId && seek.domainId === offer.domainId;
    if (!exact && !sameDomain) continue;
    const value = (exact ? 1 : 0.45) * depthFit(seek.depth, offer.depth);
    if (value > best.value) best = { value, importance: seek.importance, reason: { kind: direction, topicId: offer.topicId, exact } };
  }
  return best;
}

/** Mức `provider` đáp ứng điều `seeker` muốn nhận: một nửa cho điều quan trọng nhất, một nửa cho độ phủ. */
export function directionalScore(seeker: MatchProfile, provider: MatchProfile, direction: 'gives' | 'receives' = 'gives') {
  const hits = seeker.seeks.map((seek) => seekHit(seek, provider, direction));
  const weight = hits.reduce((s, h) => s + h.importance, 0);
  if (weight === 0) return { score: 0, reasons: [] as MatchReason[] };
  const coverage = hits.reduce((s, h) => s + h.value * h.importance, 0) / weight;
  const top = Math.max(...hits.map((h) => (h.value * h.importance) / 3));
  const reasons = hits
    .filter((h) => h.reason)
    .sort((a, b) => b.value * b.importance - a.value * a.importance)
    .map((h) => h.reason as MatchReason);
  return { score: 0.5 * top + 0.5 * coverage, reasons };
}

function toDay(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / DAY_MS);
}

/** Số ngày cả hai cùng có mặt tại một Hub, tính từ hôm nay, tối đa 90 ngày tới. */
export function sharedDays(a: Presence, b: Presence, today: string): number {
  const start = Math.max(toDay(today), a.from ? toDay(a.from) : -Infinity, b.from ? toDay(b.from) : -Infinity);
  const end = Math.min(toDay(today) + MAX_WINDOW_DAYS, a.to ? toDay(a.to) : Infinity, b.to ? toDay(b.to) : Infinity);
  let days = 0;
  for (let day = start; day <= end; day += 1) {
    const weekday = new Date(day * DAY_MS).getUTCDay();
    if ((!a.weekdays || a.weekdays.includes(weekday)) && (!b.weekdays || b.weekdays.includes(weekday))) days += 1;
  }
  return days;
}

function bestMeeting(me: MatchProfile, other: MatchProfile, today: string) {
  let best: { hubId: string; days: number } | null = null;
  for (const mine of me.presence) {
    for (const theirs of other.presence) {
      if (mine.hubId !== theirs.hubId) continue;
      // Hai du khách vẫn có thể gặp, nhưng phải có ít nhất một ngày chung.
      const days = sharedDays(mine, theirs, today);
      if (days > 0 && (!best || days > best.days)) best = { hubId: mine.hubId, days };
    }
  }
  return best;
}

function languageInfo(me: MatchProfile, other: MatchProfile, reasons: MatchReason[]) {
  const usable = (l: ProfileLanguage) => l.level !== 'learning';
  const theirs = new Set(other.languages.filter(usable).map((l) => l.code));
  const shared = me.languages.filter((l) => usable(l) && theirs.has(l.code)).map((l) => l.code);
  const practice = reasons.some((r) => r.kind === 'gives_language' || r.kind === 'receives_language');
  const languageMode: LanguageMode = practice ? 'practice' : shared.length ? 'direct' : 'translate';
  return { sharedLanguages: shared, languageMode };
}

export function passesHardFilters(me: MatchProfile, other: MatchProfile): boolean {
  if (me.id === other.id) return false;
  if (!me.adult || !other.adult || !other.active || !other.discoverable) return false;
  if (me.blockedIds?.includes(other.id) || other.blockedIds?.includes(me.id)) return false;
  const wantsSame = me.meetPreference === 'same_gender' || other.meetPreference === 'same_gender';
  if (wantsSame && (!me.gender || !other.gender || me.gender !== other.gender)) return false;
  return true;
}

export function scorePair(me: MatchProfile, other: MatchProfile, mode: MeetMode, today: string): Match | null {
  if (!passesHardFilters(me, other)) return null;
  if (!me.modes.includes(mode) || !other.modes.includes(mode)) return null;

  const meeting = mode === 'in_person' ? bestMeeting(me, other, today) : null;
  if (mode === 'in_person' && !meeting) return null;

  const forMe = directionalScore(me, other, 'gives');
  const forThem = directionalScore(other, me, 'receives');
  const strongest = Math.max(forMe.score, forThem.score);
  if (strongest <= 0) return null;
  const base = 0.8 * strongest + 0.2 * Math.min(forMe.score, forThem.score);

  const orientationFit = 0.85 + 0.15 * (1 - Math.abs(me.orientation - other.orientation) / 100);
  const timeFit = meeting ? Math.min(1, 0.85 + 0.05 * meeting.days) : 1;
  const fairness = Math.max(0.7, 1 / (1 + (other.pendingRequests ?? 0) / 10));
  const idle = other.lastActiveDays ?? 0;
  const activity = idle <= 14 ? 1 : idle <= 60 ? 0.9 : 0.75;

  const reasons: MatchReason[] = [...forMe.reasons.slice(0, 2), ...forThem.reasons.slice(0, 2)];
  if (meeting) reasons.push({ kind: 'same_hub', hubId: meeting.hubId }, { kind: 'same_time', days: meeting.days });

  return {
    candidateId: other.id,
    mode,
    hubId: meeting?.hubId ?? null,
    score: Math.round(100 * base * orientationFit * timeFit * fairness * activity),
    forMe: Math.round(forMe.score * 100),
    forThem: Math.round(forThem.score * 100),
    sharedDays: meeting?.days ?? 0,
    ...languageInfo(me, other, reasons),
    reasons,
  };
}

export function rankMatches(
  me: MatchProfile,
  candidates: MatchProfile[],
  options: { today: string; mode?: MeetMode; hubId?: string; limit?: number; minScore?: number },
): Match[] {
  const { today, mode = 'in_person', hubId, limit = 20, minScore = 15 } = options;
  return candidates
    .map((candidate) => scorePair(me, candidate, mode, today))
    .filter((m): m is Match => !!m && m.score >= minScore && (!hubId || m.hubId === hubId))
    .sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))
    .slice(0, limit);
}
