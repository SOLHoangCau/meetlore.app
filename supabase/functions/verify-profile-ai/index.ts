// Bước 1: luật cố định và AI đọc hồ sơ, rồi chuyển Admin. Gọi từ Database Webhook khi có identity_verifications mới.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AI_REVIEW_INSTRUCTIONS, combineReview, parseAiReview, ruleChecks, type AiReview } from '../_shared/verification.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const model = Deno.env.get('AI_REVIEW_MODEL') ?? 'claude-haiku-5-5';
const secret = Deno.env.get('WEBHOOK_SECRET');
function encodeBase64(bytes: Uint8Array) { let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(out); }
const includeImages = Deno.env.get('AI_REVIEW_INCLUDE_IMAGES') !== 'false';

async function image(path: string | null) {
  if (!path || !includeImages) return null;
  const { data } = await db.storage.from('verification').download(path);
  if (!data) return null;
  return { type: 'image', source: { type: 'base64', media_type: data.type || 'image/jpeg', data: encodeBase64(new Uint8Array(await data.arrayBuffer())) } };
}
async function askAi(application: unknown, docPath: string | null, selfiePath: string | null): Promise<AiReview | null> {
  const key = Deno.env.get('ANTHROPIC_API_KEY'); if (!key) return null;
  const images = (await Promise.all([image(docPath), image(selfiePath)])).filter(Boolean);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 800, system: AI_REVIEW_INSTRUCTIONS,
      tools: [{ name: 'report_review', description: 'Báo cáo kết quả sàng lọc', input_schema: { type: 'object', required: ['risk', 'score', 'summary', 'flags'], properties: { risk: { enum: ['low', 'medium', 'high'] }, score: { type: 'integer', minimum: 0, maximum: 100 }, summary: { type: 'string' }, flags: { type: 'array', items: { type: 'object', required: ['code'], properties: { code: { type: 'string' }, detail: { type: 'string' } } } } } } }],
      tool_choice: { type: 'tool', name: 'report_review' },
      messages: [{ role: 'user', content: [...images, { type: 'text', text: `<application>${JSON.stringify(application)}</application>` }] }] }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  return parseAiReview(body.content?.find((c: any) => c.type === 'tool_use')?.input);
}

Deno.serve(async (req) => {
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });
  const { record } = await req.json();
  const { data: v } = await db.from('identity_verifications').select('*').eq('id', record.id).eq('status', 'ai_review').single();
  if (!v) return Response.json({ skipped: true });
  const [{ data: priv }, { data: prof }, { data: helpers }] = await Promise.all([
    db.from('profile_private').select('birth_year').eq('user_id', v.user_id).single(),
    db.from('profiles').select('display_name,headline,bio').eq('id', v.user_id).single(),
    db.from('emergency_contacts').select('full_name,relation,phone_e164,informed_confirmed_at').eq('user_id', v.user_id),
  ]);
  const input = { legalName: v.legal_full_name, displayName: prof?.display_name, headline: prof?.headline, bio: prof?.bio, birthYear: priv?.birth_year ?? null, nationality: v.nationality, phone: v.phone_e164, currentCity: v.current_city, docType: v.doc_type, docCountry: v.doc_country, docLast4: v.doc_last4, hasDocImage: !!v.doc_image_path, hasSelfie: !!v.selfie_path,
    helpers: (helpers ?? []).map((h) => ({ name: h.full_name, relation: h.relation, phone: h.phone_e164, informed: !!h.informed_confirmed_at })) };
  const rules = ruleChecks(input, new Date().getUTCFullYear());
  const ai = await askAi({ ...input, phone: undefined, helpers: input.helpers.map((h) => ({ name: h.name, relation: h.relation })) }, v.doc_image_path, v.selfie_path).catch(() => null);
  const result = combineReview(rules, ai);
  const { error } = await db.rpc('record_ai_review', { p_id: v.id, p_risk: result.risk, p_score: result.score, p_flags: result.flags, p_summary: result.summary, p_model: ai ? model : 'rules_only' });
  return error ? Response.json({ error: 'save_failed' }, { status: 500 }) : Response.json({ ok: true, risk: result.risk });
});
