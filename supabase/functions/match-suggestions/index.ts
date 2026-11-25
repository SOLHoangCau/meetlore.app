// Trả gợi ý cho người đang đăng nhập. Kế hoạch, lịch và giới tính chỉ đọc ở đây, không trả về client.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rankMatches, type MatchProfile, type MeetMode } from '../_shared/matching.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return Response.json({ error: 'not_authenticated' }, { status: 401 });
  const { data: verified } = await userClient.rpc('is_verified', { p_user: user.id });
  // Chưa duyệt: chỉ trả số người phù hợp, không trả tên hay hồ sơ.

  const { mode = 'in_person', hubId } = await req.json().catch(() => ({})) as { mode?: MeetMode; hubId?: string };
  const db = createClient(url, service);
  const { data: rows, error } = await db.from('profiles')
    .select('id,display_name,headline,orientation_score,meet_modes,last_active_at,profile_private!inner(gender,meet_preference,adult_confirmed_at,identity_verified_at,email_confirmed_at),profile_languages(language_code,level,can_help_practice),offers(topic_id,depth,topics(domain_id)),seeks(topic_id,language_code,depth,importance,topics(domain_id)),trip_plans(hub_id,starts_on,ends_on),hub_members(hub_id,status,weekdays)')
    .eq('account_status', 'active').limit(2000);
  if (error) return Response.json({ error: 'load_failed' }, { status: 500 });
  const { data: blocks } = await db.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  const { data: pending } = await db.from('match_intents').select('receiver_id').eq('status', 'pending');
  const pendingBy = new Map<string, number>();
  for (const p of pending ?? []) pendingBy.set(p.receiver_id, (pendingBy.get(p.receiver_id) ?? 0) + 1);

  // deno-lint-ignore no-explicit-any
  const toProfile = (r: any): MatchProfile => ({
    id: r.id, adult: !!r.profile_private.adult_confirmed_at,
    active: !!r.profile_private.identity_verified_at && !!r.profile_private.email_confirmed_at, discoverable: true,
    gender: r.profile_private.gender, meetPreference: r.profile_private.meet_preference, modes: r.meet_modes, orientation: r.orientation_score,
    // deno-lint-ignore no-explicit-any
    languages: r.profile_languages.map((l: any) => ({ code: l.language_code, level: l.level, canHelpPractice: l.can_help_practice })),
    // deno-lint-ignore no-explicit-any
    offers: r.offers.map((o: any) => ({ topicId: o.topic_id, domainId: o.topics.domain_id, depth: o.depth })),
    // deno-lint-ignore no-explicit-any
    seeks: r.seeks.map((s: any) => ({ topicId: s.topic_id ?? undefined, domainId: s.topics?.domain_id, languageCode: s.language_code ?? undefined, depth: s.depth, importance: s.importance })),
    presence: [
      // deno-lint-ignore no-explicit-any
      ...r.trip_plans.filter((t: any) => t.hub_id).map((t: any) => ({ hubId: t.hub_id, role: 'traveler' as const, from: t.starts_on, to: t.ends_on })),
      // deno-lint-ignore no-explicit-any
      ...r.hub_members.filter((m: any) => m.status === 'ready').map((m: any) => ({ hubId: m.hub_id, role: 'local' as const, weekdays: m.weekdays })),
    ],
    pendingRequests: pendingBy.get(r.id) ?? 0,
    lastActiveDays: Math.floor((Date.now() - Date.parse(r.last_active_at)) / 86_400_000),
  });
  const all = (rows ?? []).map(toProfile);
  const me = all.find((p) => p.id === user.id);
  if (!me) return Response.json({ error: 'profile_missing' }, { status: 404 });
  me.blockedIds = (blocks ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
  const others = all.filter((p) => p.active);
  const matches = rankMatches(me, others, { today: new Date().toISOString().slice(0, 10), mode, hubId });
  if (!verified) return Response.json({ count: matches.length, matches: [] });
  const cards = new Map((rows ?? []).map((r) => [r.id, { name: r.display_name, headline: r.headline }]));
  return Response.json({ matches: matches.map((m) => ({ ...m, person: cards.get(m.candidateId) })) });
});
