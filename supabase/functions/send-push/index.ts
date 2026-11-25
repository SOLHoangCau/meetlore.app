// Chạy mỗi phút: gửi thông báo đẩy qua Expo. Nội dung chỉ là câu chung, không chứa tin nhắn, tên hay vị trí.
import { createClient } from 'npm:@supabase/supabase-js@2';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const TEXT: Record<string, Record<string, [string, string]>> = {
  vi: { message: ['Tin nhắn mới', 'Bạn có tin nhắn mới trên MeetLore.'], intent: ['Lời kết nối mới', 'Có người muốn kết nối với bạn.'],
    verification: ['Hồ sơ xác minh', 'Hồ sơ của bạn đã có kết quả.'], urgent_report: ['Báo cáo khẩn', 'Có báo cáo khẩn cần xử lý.'],
    notice: ['Thông báo từ MeetLore', 'Bạn có thông báo mới về tài khoản.'], session: ['Buổi chia sẻ', 'Có cập nhật về buổi chia sẻ.'] },
  en: { message: ['New message', 'You have a new message on MeetLore.'], intent: ['New connection request', 'Someone would like to connect with you.'],
    verification: ['Verification', 'Your verification has a result.'], urgent_report: ['Urgent report', 'An urgent report needs attention.'],
    notice: ['Notice from MeetLore', 'You have a new account notice.'], session: ['Sharing session', 'There is an update about a sharing session.'] },
};
const ROUTE: Record<string, (ref: string | null) => string> = {
  message: (ref) => `/messages/${ref}`, intent: () => '/connect', verification: () => '/verification',
  urgent_report: () => '/admin/reports', notice: () => '/me', session: () => '/journey',
};

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const { data } = await db.rpc('pending_push', { p_limit: 200 });
  const rows = (data ?? []) as { id: number; kind: string; ref: string | null; locale: string; attempts: number; tokens: string[] }[];
  if (!rows.length) return Response.json({ sent: 0 });
  const messages = rows.flatMap((r) => {
    const [title, body] = (TEXT[r.locale] ?? TEXT.en)[r.kind];
    return r.tokens.map((to) => ({ to, title, body, sound: 'default', data: { url: ROUTE[r.kind]?.(r.ref) ?? '/' } }));
  });
  let ok = true;
  for (let i = 0; i < messages.length; i += 100) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!res.ok) ok = false;
  }
  const ids = rows.map((r) => r.id);
  if (ok) await db.from('notification_outbox').update({ sent_at: new Date().toISOString() }).in('id', ids);
  else for (const r of rows) await db.from('notification_outbox').update({ attempts: r.attempts + 1 }).eq('id', r.id);
  return Response.json({ sent: ok ? messages.length : 0 });
});
