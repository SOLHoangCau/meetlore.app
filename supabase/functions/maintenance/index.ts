// Chạy định kỳ (mỗi giờ) bằng Supabase Cron: xóa ảnh xác minh quá hạn, xóa tài khoản hết thời gian chờ, mở khóa tạm hết hạn.
import { createClient } from 'npm:@supabase/supabase-js@2';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const report = { filesDeleted: 0, accountsDeleted: 0, suspensionsLifted: 0, errors: [] as string[] };

  const { data: files } = await db.rpc('verification_files_due');
  for (const v of (files ?? []) as { id: string; doc_image_path: string | null; selfie_path: string | null }[]) {
    const paths = [v.doc_image_path, v.selfie_path].filter(Boolean) as string[];
    const { error } = paths.length ? await db.storage.from('verification').remove(paths) : { error: null };
    if (error) { report.errors.push(`files:${v.id}`); continue; }
    await db.rpc('mark_verification_files_deleted', { p_id: v.id });
    report.filesDeleted++;
  }

  // Hồ sơ kẹt ở bước AI quá 15 phút (webhook lỗi, AI không trả lời): gọi lại hàm sơ duyệt.
  // Hàm luôn chuyển hồ sơ sang Admin, kể cả khi AI không chạy được (chỉ dùng luật cố định).
  const { data: stuck } = await db.from('identity_verifications').select('id').eq('status', 'ai_review').lt('submitted_at', new Date(Date.now() - 15 * 60000).toISOString()).limit(20);
  for (const v of stuck ?? []) {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-profile-ai`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-secret': Deno.env.get('WEBHOOK_SECRET') ?? '', authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }, body: JSON.stringify({ record: { id: v.id } }) }).catch(() => null);
    if (!r?.ok) report.errors.push(`ai_retry:${v.id}`);
  }

  const { data: due } = await db.rpc('accounts_due_for_purge');
  for (const id of (due ?? []) as string[]) {
    const prep = await db.rpc('prepare_account_purge', { p_user: id });
    if (prep.error) { report.errors.push(`prepare:${id}`); continue; }
    const { data: objects } = await db.storage.from('verification').list(id);
    if (objects?.length) await db.storage.from('verification').remove(objects.map((o) => `${id}/${o.name}`));
    const { data: photos } = await db.storage.from('avatars').list(id);
    if (photos?.length) await db.storage.from('avatars').remove(photos.map((o) => `${id}/${o.name}`));
    const del = await db.auth.admin.deleteUser(id);
    if (del.error) { report.errors.push(`delete:${id}`); continue; }
    report.accountsDeleted++;
  }

  const { data: lifted } = await db.rpc('lift_expired_suspensions');
  report.suspensionsLifted = (lifted as number) ?? 0;
  return Response.json(report);
});
