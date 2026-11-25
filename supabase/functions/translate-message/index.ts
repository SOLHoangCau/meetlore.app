// Dịch tin nhắn khi người dùng bấm, lưu lại bản dịch để không trả phí hai lần. Dùng Azure Translator; đổi nhà cung cấp tại hàm translate.
import { createClient } from 'npm:@supabase/supabase-js@2';
const url = Deno.env.get('SUPABASE_URL')!;
async function translate(text: string, to: string) {
  const res = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(to)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'Ocp-Apim-Subscription-Key': Deno.env.get('TRANSLATOR_KEY')!, 'Ocp-Apim-Subscription-Region': Deno.env.get('TRANSLATOR_REGION')! }, body: JSON.stringify([{ text }]) });
  if (!res.ok) throw new Error('translate_failed');
  return (await res.json())[0].translations[0].text as string;
}
Deno.serve(async (req) => {
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { messageId, locale } = await req.json();
  const { data: m } = await user.from('messages').select('id,body').eq('id', messageId).single(); // RLS bảo đảm là thành viên cuộc trò chuyện
  if (!m) return Response.json({ error: 'not_found' }, { status: 404 });
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cached } = await db.from('message_translations').select('body').eq('message_id', messageId).eq('locale', locale).maybeSingle();
  if (cached) return Response.json({ body: cached.body, cached: true });
  const body = await translate(m.body, locale);
  await db.from('message_translations').insert({ message_id: messageId, locale, body, provider: 'azure' });
  return Response.json({ body, cached: false });
});
