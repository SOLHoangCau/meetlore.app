import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bodyToHtml, buildSite, hubCard, figureData, href } from '../scripts/build-site.ts';
import { HUBS } from '../src/data/catalog.ts';

test('chuyển cú pháp văn bản pháp lý sang HTML và thoát ký tự', () => {
  const h = bodyToHtml('### Mục <1>\n- a\n- b\n1. x\n> cam kết\nLiên hệ hotro@meetlore.app');
  assert.match(h, /<h2>Mục &lt;1&gt;<\/h2>/);
  assert.match(h, /<ul>\n<li>a<\/li>\n<li>b<\/li>\n<\/ul>\n<ol>\n<li>x<\/li>\n<\/ol>/);
  assert.match(h, /<blockquote>cam kết<\/blockquote>/);
  assert.match(h, /<a href="mailto:hotro@meetlore.app">/);
});

test('đường dẫn tiếng Việt ở gốc, tiếng Anh dưới /en/', () => {
  assert.equal(href('vi', 'home'), '/'); assert.equal(href('en', 'home'), '/en/');
  assert.equal(href('vi', 'privacy'), '/privacy'); assert.equal(href('en', 'partners'), '/en/partners');
});

test('Hub chưa có văn bản đồng ý không lộ tên cơ sở', () => {
  for (const h of HUBS.filter((x) => !x.agreement)) {
    const html = hubCard('vi', h, true);
    if (h.venue) assert.ok(!html.includes(h.venue), `${h.slug} lộ tên ${h.venue}`);
    assert.match(html, /Đang thử nghiệm/);
  }
  const ok = { ...HUBS[0], agreement: true };
  assert.match(hubCard('vi', ok, true), /Đang hoạt động/);
  assert.ok(hubCard('vi', ok, true).includes(ok.vi.meeting));
});

test('dữ liệu nhân vật cho web có đủ ngày sinh và tên ảnh', () => {
  const d = figureData('en');
  assert.ok(d.dated.length >= 40);
  const newton = d.dated.find((f) => f.key === '12-25')!;
  assert.equal(newton.name, 'Isaac Newton'); assert.equal(newton.image, 'newton.webp'); assert.equal(newton.field, 'Physics');
});

test('sinh đủ trang hai thứ tiếng, chuyển hướng và tệp xác minh app', () => {
  const dir = mkdtempSync(join(tmpdir(), 'site-'));
  buildSite(dir, { mediaBase: 'https://x.supabase.co/storage/v1/object/public/media/figures/' });
  for (const f of ['index.html', 'en/index.html', 'hubs/index.html', 'en/stories/index.html', 'partners/index.html', 'privacy/index.html', 'en/privacy/index.html', 'contact/index.html', 'delete-account/index.html', '404.html', 'sitemap.xml', '_redirects', '_headers', '.well-known/apple-app-site-association', '.well-known/assetlinks.json', 'assets/logo.svg', 'assets/og.png'])
    assert.ok(existsSync(join(dir, f)), f);
  const redirects = readFileSync(join(dir, '_redirects'), 'utf8');
  assert.match(redirects, /^\/h\/\* https:\/\/app\.meetlore\.app\/h\/:splat 302$/m);
  assert.match(redirects, /^\/auth\/\* https:\/\/app\.meetlore\.app\/auth\/:splat 302$/m);
  const privacy = readFileSync(join(dir, 'privacy/index.html'), 'utf8');
  assert.match(privacy, /<html lang="vi">/); assert.match(privacy, /Resend/); assert.doesNotMatch(privacy, /Vercel/);
  assert.match(readFileSync(join(dir, 'en/stories/index.html'), 'utf8'), /x\.supabase\.co/);
  assert.match(readFileSync(join(dir, '.well-known/apple-app-site-association'), 'utf8'), /MF396VKW87\.app\.meetlore/);
});
