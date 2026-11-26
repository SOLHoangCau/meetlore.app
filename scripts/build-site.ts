// Trang web meetlore.app: giới thiệu, Hub, Cộng đồng, Đối tác, Liên hệ và văn bản pháp lý, tiếng Việt và tiếng Anh.
// Trang tĩnh, sinh từ dữ liệu của app (catalog, figures, legal) nên luôn khớp với app.
// App web chạy riêng ở app.meetlore.app. Chạy: npm run build:site → thư mục site-dist/.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LEGAL, LEGAL_DRAFT, type LegalDoc } from '../src/data/legal.ts';
import { HUBS, TOPICS, type HubSeed } from '../src/data/catalog.ts';
import { FIGURES, UNDATED, FIELDS, type Figure } from '../src/data/figures.ts';

export type Lang = 'vi' | 'en';
const APP = 'https://app.meetlore.app';
const EMAIL = 'hotro@meetlore.app';
const PUBLISHER = 'Santa Claus Vietnam Fdt & Mosa Online Service Joint Stock Company';
export const DOCS: LegalDoc[] = ['terms', 'privacy', 'community', 'safety', 'points', 'content', 'delete-account', 'hub-rules'];
type Page = 'home' | 'hubs' | 'stories' | 'partners' | 'contact' | LegalDoc;

const L = {
  vi: {
    hubs: 'Hub', stories: 'Cộng đồng', partners: 'Đối tác', contact: 'Liên hệ', openApp: 'Mở app', other: 'EN', otherName: 'English',
    legal: 'Văn bản pháp lý', operator: 'Vận hành bởi Công ty CP Dịch vụ Trực tuyến Mosa, phối hợp với SantaClaus Vietnam Foundation.',
    publisher: 'Nhà phát hành trên App Store và Google Play', skip: 'Bỏ qua, đến nội dung chính', menu: 'Menu chính',
  },
  en: {
    hubs: 'Hubs', stories: 'Community', partners: 'Partners', contact: 'Contact', openApp: 'Open app', other: 'VI', otherName: 'Tiếng Việt',
    legal: 'Legal', operator: 'Operated by Mosa Online Service JSC in cooperation with SantaClaus Vietnam Foundation.',
    publisher: 'Publisher on the App Store and Google Play', skip: 'Skip to main content', menu: 'Main menu',
  },
};

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/([\w.+-]+@meetlore\.app)/g, '<a href="mailto:$1">$1</a>');

/** Chuyển cú pháp văn bản pháp lý ("### ", "- ", "1. ", "> ") thành HTML. */
export function bodyToHtml(body: string): string {
  const out: string[] = []; let list: 'ul' | 'ol' | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of body.split('\n')) {
    const x = raw.trim(); if (!x) continue;
    const ul = x.startsWith('- '); const ol = /^\d+\. /.exec(x);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { close(); out.push(`<${want}>`); list = want; }
      out.push(`<li>${inline(x.slice(ul ? 2 : ol![0].length))}</li>`); continue;
    }
    close();
    if (x.startsWith('### ')) out.push(`<h2>${inline(x.slice(4))}</h2>`);
    else if (x.startsWith('> ')) out.push(`<blockquote>${inline(x.slice(2))}</blockquote>`);
    else out.push(`<p>${inline(x)}</p>`);
  }
  close();
  return out.join('\n');
}

const SLUG: Record<Page, string> = { home: '', hubs: 'hubs', stories: 'stories', partners: 'partners', contact: 'contact', terms: 'terms', privacy: 'privacy', community: 'community', safety: 'safety', points: 'points', content: 'content', 'delete-account': 'delete-account', 'hub-rules': 'hub-rules' };
export const href = (lang: Lang, p: Page) => { const s = SLUG[p]; return lang === 'vi' ? `/${s}` : `/en/${s}`; };

const CSS = `
:root{--paper:#F5F0E6;--card:#FFFDF8;--sunk:#ECE5D6;--ink:#1B2A33;--muted:#56636A;--line:#DAD1BF;--indigo:#24426B;--indigo-soft:#E1E7EF;--son:#B23521;--son-soft:#F6E2DC;--tur:#8A6112;--tur-soft:#F4E8CC;--moss:#2F6146;--moss-soft:#DFEBE2}
[hidden]{display:none!important}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 "Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
h1,h2,h3{font-family:Lora,Georgia,"Times New Roman",serif;line-height:1.25;color:var(--ink);text-wrap:balance}
h1{font-size:clamp(30px,5.2vw,48px);margin:0 0 16px}h2{font-size:clamp(23px,3.4vw,30px);margin:0 0 12px}h3{font-size:20px;margin:0 0 6px}
p{margin:0 0 14px}a{color:var(--indigo)}a:hover{color:var(--son)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:#fff;padding:8px 12px;z-index:9}
:focus-visible{outline:3px solid var(--son);outline-offset:2px}
header.top{position:sticky;top:0;z-index:5;background:rgba(245,240,230,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
header.top .wrap{display:flex;align-items:center;gap:20px;height:64px}
.logo{display:flex;align-items:center}.logo img{height:36px;width:auto;display:block}
nav.main{display:flex;gap:4px;margin-left:auto;align-items:center}
nav.main a{text-decoration:none;color:var(--ink);padding:8px 10px;border-radius:8px;font-size:15px}
nav.main a[aria-current]{background:var(--sunk);font-weight:600}
nav.main a.lang{color:var(--muted);font-size:14px}
.btn{display:inline-block;text-decoration:none;border-radius:10px;padding:12px 20px;font-weight:600;font-size:16px;border:1.5px solid var(--indigo)}
.btn.primary{background:var(--indigo);color:#fff}.btn.primary:hover{background:#1A3352;color:#fff}
.btn.ghost{color:var(--indigo);background:transparent}.btn.ghost:hover{background:var(--indigo-soft);color:var(--indigo)}
nav.main .btn{padding:8px 14px;font-size:14px;color:#fff;margin-left:6px}
@media (max-width:720px){nav.main a:not(.btn):not(.lang){display:none}header.top .wrap{gap:8px}.logo img{height:30px}}
.mnav{display:none;gap:6px;padding:0 20px 10px;overflow-x:auto}
.mnav a{text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:14px;white-space:nowrap}
.mnav a[aria-current]{background:var(--indigo);color:#fff;border-color:var(--indigo)}
@media (max-width:720px){.mnav{display:flex}}
section{padding:56px 0}section.tight{padding:36px 0}
.hero{padding:64px 0 48px}.hero .lead{font-size:clamp(18px,2.2vw,21px);color:var(--muted);max-width:640px;margin-bottom:24px}
.hero .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:center}
@media (max-width:860px){.hero .grid{grid-template-columns:1fr}.hero .mark{display:none}}
.hero .mark img{width:100%;max-width:320px;display:block;margin:0 auto}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}
.note{font-size:14px;color:var(--muted)}
.tag{display:inline-block;font-size:13px;font-weight:600;border-radius:6px;padding:3px 9px;background:var(--tur-soft);color:var(--tur)}
.tag.moss{background:var(--moss-soft);color:var(--moss)}.tag.son{background:var(--son-soft);color:var(--son)}
.kicker{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--son);margin-bottom:8px}
.cols{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px}
.card p:last-child{margin-bottom:0}
.step .n{width:34px;height:34px;border-radius:50%;background:var(--son);color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:12px}
.band{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
ul.ticks{list-style:none;padding:0;margin:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
ul.ticks li{padding-left:30px;position:relative}
ul.ticks li::before{content:"";position:absolute;left:0;top:7px;width:16px;height:16px;border-radius:50%;background:var(--moss-soft);border:4px solid var(--moss)}
.hub h3{margin-bottom:4px}.hub .region{font-size:14px;color:var(--muted);margin-bottom:10px}
.hub dl{margin:12px 0;font-size:15px}.hub dt{font-weight:600}.hub dd{margin:0 0 8px;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}.chips span{font-size:13px;background:var(--indigo-soft);color:var(--indigo);border-radius:999px;padding:3px 10px}
.links{display:flex;flex-wrap:wrap;gap:14px;font-size:15px;font-weight:600}
.figure{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:center}
.figure img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:12px;border:1px solid var(--line);background:var(--sunk)}
@media (max-width:760px){.figure{grid-template-columns:1fr}}
.figure.noimg{grid-template-columns:1fr}
.figure .years{color:var(--muted);margin-bottom:10px}.figure q{font-family:Lora,Georgia,serif;font-style:italic;display:block;margin:12px 0 4px}
.doc{max-width:760px}.doc main{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 24px}
.doc h2{font-size:20px;margin:28px 0 8px}.doc ul,.doc ol{padding-left:22px}.doc li{margin-bottom:6px}
blockquote{margin:12px 0;padding:4px 0 4px 14px;border-left:3px solid var(--son)}
footer.foot{border-top:1px solid var(--line);margin-top:24px;padding:32px 0 40px;font-size:14px;color:var(--muted)}
footer.foot .cols{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}
footer.foot h4{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);margin:0 0 8px}
footer.foot ul{list-style:none;padding:0;margin:0}footer.foot li{margin-bottom:6px}footer.foot a{color:var(--muted)}
`;

function layout(lang: Lang, page: Page, title: string, description: string, content: string, wide = true): string {
  const t = L[lang]; const other: Lang = lang === 'vi' ? 'en' : 'vi';
  const cur = (p: Page) => (p === page ? ' aria-current="page"' : '');
  const main: Page[] = ['hubs', 'stories', 'partners', 'contact'];
  const navLinks = main.map((p) => `<a href="${href(lang, p)}"${cur(p)}>${t[p as 'hubs']}</a>`).join('');
  const legal = DOCS.map((d) => `<li><a href="${href(lang, d)}">${esc(LEGAL[lang][d].title)}</a></li>`).join('');
  const full = page === 'home' ? `MeetLore · ${title}` : `${title} · MeetLore`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://meetlore.app${href(lang, page)}">
<meta property="og:image" content="https://meetlore.app/assets/og.png">
<meta name="theme-color" content="#24426B">
<link rel="canonical" href="https://meetlore.app${href(lang, page)}">
<link rel="alternate" hreflang="vi" href="https://meetlore.app${href('vi', page)}">
<link rel="alternate" hreflang="en" href="https://meetlore.app${href('en', page)}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/icon-180.png">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">${t.skip}</a>
<header class="top">
<div class="wrap">
<a class="logo" href="${href(lang, 'home')}" aria-label="MeetLore"><img src="/assets/logo.svg" alt="MeetLore" width="113" height="36"></a>
<nav class="main" aria-label="${t.menu}">${navLinks}<a class="lang" href="${href(other, page)}" hreflang="${other}" lang="${other}" title="${t.otherName}">${t.other}</a><a class="btn primary" href="${APP}">${t.openApp}</a></nav>
</div>
<nav class="mnav" aria-label="${t.menu}">${main.map((p) => `<a href="${href(lang, p)}"${cur(p)}>${t[p as 'hubs']}</a>`).join('')}</nav>
</header>
<div id="main" class="${wide ? '' : 'wrap doc'}">
${content}
</div>
<footer class="foot">
<div class="wrap">
<div class="cols">
<div><img src="/assets/logo.svg" alt="" width="113" height="36" style="height:32px;width:auto;margin-bottom:10px"><p>${t.operator}</p><p>${t.publisher}: ${esc(PUBLISHER)}.</p></div>
<div><h4>MeetLore</h4><ul><li><a href="${href(lang, 'hubs')}">${t.hubs}</a></li><li><a href="${href(lang, 'stories')}">${t.stories}</a></li><li><a href="${href(lang, 'partners')}">${t.partners}</a></li><li><a href="${href(lang, 'contact')}">${t.contact}</a></li><li><a href="${APP}">${t.openApp}</a></li></ul></div>
<div><h4>${t.legal}</h4><ul>${legal}</ul></div>
</div>
<p style="margin-top:20px">© ${new Date().getFullYear()} MeetLore · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
</div>
</footer>
</body>
</html>
`;
}

// ---------- Nội dung các trang ----------

const topicName = (lang: Lang, id: string) => TOPICS.find((x) => x.id === id)?.[lang] ?? id;
const REGION: Record<string, { vi: string; en: string }> = { 'vn-hanoi': { vi: 'Hà Nội', en: 'Hanoi' }, 'vn-laocai': { vi: 'Sa Pa, Lào Cai', en: 'Sa Pa, Lao Cai' } };
const dirUrl = (h: HubSeed) => `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;

/** Thẻ Hub. Tên cơ sở chỉ hiện khi đã có văn bản đồng ý, để web không gắn tên một cơ sở chưa đồng ý vào MeetLore. */
export function hubCard(lang: Lang, h: HubSeed, full: boolean): string {
  const vi = lang === 'vi'; const x = h[lang]; const agreed = h.agreement === true;
  const status = agreed ? `<span class="tag moss">${vi ? 'Đang hoạt động' : 'Active'}</span>` : `<span class="tag">${vi ? 'Đang thử nghiệm' : 'Pilot'}</span>`;
  const place = agreed ? x.meeting : vi ? 'Điểm gặp cụ thể được báo trong app. Hub này đang chờ văn bản đồng ý chính thức của cơ sở.' : 'The exact meeting point is shown in the app. This Hub is awaiting the venue’s formal agreement.';
  const topics = full ? `<div class="chips">${h.topics.slice(0, 6).map((id) => `<span>${esc(topicName(lang, id))}</span>`).join('')}</div>` : '';
  const details = full ? `<dl><dt>${vi ? 'Điểm gặp' : 'Meeting point'}</dt><dd>${esc(place)}</dd>${x.hours ? `<dt>${vi ? 'Giờ Hub' : 'Hub hours'}</dt><dd>${esc(x.hours)}</dd>` : ''}</dl>` : '';
  return `<article class="card hub" id="${h.slug}">
${status}
<h3 style="margin-top:10px">${esc(x.name)}</h3>
<div class="region">${esc(REGION[h.region]?.[lang] ?? '')}</div>
<p>${esc(x.summary)}</p>${full && agreed ? `<p>${esc(x.story)}</p>` : ''}
${details}${topics}
<div class="links"><a href="/h/${h.slug}">${vi ? 'Xem trong app' : 'View in the app'}</a>${full ? `<a href="${dirUrl(h)}" rel="noopener">${vi ? 'Chỉ đường' : 'Directions'}</a>` : ''}</div>
</article>`;
}

function home(lang: Lang): string {
  const vi = lang === 'vi';
  const steps = vi
    ? [['Kể điều bạn có thể cho đi', 'Một nghề, một vùng đất, một ngôn ngữ, một món ăn. Rồi chọn điều bạn muốn học từ người khác.'], ['Được xác minh', 'Mọi người dùng khai thông tin thật và được Admin duyệt, sau thời gian chờ tối thiểu 24 đến 48 giờ. Không ai được duyệt tự động.'], ['Gặp nhau tại Hub', 'Hẹn ở một TriGiao Hub, nơi công cộng đã sẵn sàng đón khách. Sau buổi gặp, ghi lại điều đã học vào Sổ TriGiao.']]
    : [['Share what you can give', 'A craft, a place, a language, a dish. Then choose what you would like to learn from others.'], ['Get verified', 'Everyone gives real details and is approved by an Admin after a minimum 24 to 48-hour wait. Nobody is approved automatically.'], ['Meet at a Hub', 'Meet at a TriGiao Hub, a public place ready to welcome you. Afterwards, write down what you learned in the TriGiao Book.']];
  const safety = vi
    ? ['Gặp ở nơi công cộng, tại Hub có người phụ trách.', 'Mọi người đều được xác minh danh tính trước khi kết nối.', 'Không có giao dịch tiền giữa người dùng.', 'Vị trí GPS của bạn không rời khỏi điện thoại.', 'Báo cáo khẩn được ưu tiên xử lý trong 2 giờ, 7:00 đến 22:00.', 'Bạn có thể xóa tài khoản và dữ liệu bất cứ lúc nào.']
    : ['Meet in public, at a Hub with staff on hand.', 'Everyone is identity-verified before connecting.', 'No money changes hands between users.', 'Your GPS location never leaves your phone.', 'Urgent reports are handled within 2 hours, 7:00 to 22:00.', 'You can delete your account and data at any time.'];
  return `
<section class="hero"><div class="wrap grid">
<div>
<div class="kicker">${vi ? 'Du khách và người bản địa' : 'Travellers and locals'}</div>
<h1>${vi ? 'Gặp người bản địa ở nơi an toàn, trao nhau điều mình biết' : 'Meet locals in a safe place and trade what you know'}</h1>
<p class="lead">${vi ? 'MeetLore kết nối du khách với người sống tại chỗ qua các TriGiao Hub: quán cà phê, không gian văn hóa được chọn làm điểm gặp. Không phải hướng dẫn viên, không phải hẹn hò. Chỉ là hai người, một chỗ ngồi và một câu chuyện.' : 'MeetLore connects travellers with people who live there, through TriGiao Hubs: cafés and cultural spaces that act as meeting points. Not a tour guide, not a dating app. Just two people, a table and a story.'}</p>
<div class="actions"><a class="btn primary" href="${APP}">${vi ? 'Dùng thử trên web' : 'Try it on the web'}</a><a class="btn ghost" href="${href(lang, 'hubs')}">${vi ? 'Xem các Hub' : 'See the Hubs'}</a></div>
<p class="note">${vi ? 'Đang thử nghiệm. Ứng dụng iOS và Android sẽ có trên App Store và Google Play.' : 'In testing. The iOS and Android apps are coming to the App Store and Google Play.'}</p>
</div>
<div class="mark"><img src="/assets/mark.svg" alt="" width="320" height="320"></div>
</div></section>

<section class="band"><div class="wrap">
<div class="kicker">${vi ? 'Cách hoạt động' : 'How it works'}</div>
<h2>${vi ? 'Ba bước, không vội' : 'Three steps, no rush'}</h2>
<div class="cols" style="margin-top:20px">${steps.map(([a, b], i) => `<div class="card step"><div class="n">${i + 1}</div><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>
</div></section>

<section><div class="wrap">
<div class="kicker">TriGiao Hub</div>
<h2>${vi ? 'Nơi bắt đầu' : 'Where it starts'}</h2>
<p style="max-width:680px">${vi ? 'Đợt thử nghiệm đầu tiên ở Hà Nội và Sa Pa. Mỗi Hub gắn với tri thức của nơi đó: phố nghề, khoa cử, nhuộm chàm, ruộng bậc thang.' : 'The first pilot runs in Hanoi and Sa Pa. Each Hub is tied to local knowledge: craft streets, imperial exams, indigo dyeing, rice terraces.'}</p>
<div class="cols" style="margin-top:20px">${HUBS.slice(0, 3).map((h) => hubCard(lang, h, false)).join('')}</div>
<p style="margin-top:20px"><a href="${href(lang, 'hubs')}">${vi ? `Xem cả ${HUBS.length} Hub` : `See all ${HUBS.length} Hubs`} →</a></p>
</div></section>

<section class="band"><div class="wrap">
<div class="kicker">${vi ? 'An toàn' : 'Safety'}</div>
<h2>${vi ? 'Những điều chúng tôi cam kết' : 'What we commit to'}</h2>
<ul class="ticks" style="margin-top:20px">${safety.map((s) => `<li>${s}</li>`).join('')}</ul>
<p style="margin-top:20px"><a href="${href(lang, 'safety')}">${esc(LEGAL[lang].safety.title)}</a> · <a href="${href(lang, 'community')}">${esc(LEGAL[lang].community.title)}</a></p>
</div></section>

<section><div class="wrap cols">
<div class="card"><div class="kicker">${vi ? 'Cộng đồng' : 'Community'}</div><h3>${vi ? 'Sổ TriGiao và Giờ tri thức' : 'The TriGiao Book and Knowledge Hours'}</h3><p>${vi ? 'Điều bạn chia sẻ được ghi công, được duyệt và có thể giúp quỹ cộng đồng của Hub.' : 'What you share is credited, reviewed, and can support the Hub’s community fund.'}</p><p><a href="${href(lang, 'stories')}">${vi ? 'Tìm hiểu' : 'Learn more'} →</a></p></div>
<div class="card"><div class="kicker">${vi ? 'Đối tác' : 'Partners'}</div><h3>${vi ? 'Mở một Hub, tài trợ, hợp tác' : 'Open a Hub, sponsor, collaborate'}</h3><p>${vi ? 'Quán cà phê, nhà văn hóa, cơ sở lưu trú, CLB cộng đồng đều có thể đăng ký làm Hub. Miễn phí.' : 'Cafés, cultural houses, guesthouses and community clubs can apply to be a Hub. Free of charge.'}</p><p><a href="${href(lang, 'partners')}">${vi ? 'Xem cách tham gia' : 'See how to join'} →</a></p></div>
</div></section>`;
}

function hubs(lang: Lang): string {
  const vi = lang === 'vi';
  return `
<section class="hero" style="padding-bottom:24px"><div class="wrap">
<div class="kicker">TriGiao Hub</div>
<h1>${vi ? 'Các Hub đang thử nghiệm' : 'Hubs in the pilot'}</h1>
<p class="lead">${vi ? 'Hub là nơi công cộng nhận làm điểm gặp: có chỗ ngồi, có người phụ trách, có giờ mở cửa rõ ràng. Bạn chỉ gặp người khác tại Hub sau khi cả hai đã được xác minh và cùng đồng ý.' : 'A Hub is a public place that acts as a meeting point: seating, a person in charge and clear opening hours. You only meet someone at a Hub after you are both verified and both agree.'}</p>
</div></section>
<section class="tight" style="padding-top:0"><div class="wrap cols">${HUBS.map((h) => hubCard(lang, h, true)).join('')}</div></section>
<section class="band"><div class="wrap cols">
<div><h2>${vi ? 'Muốn có Hub ở nơi bạn sống?' : 'Want a Hub where you live?'}</h2><p>${vi ? 'Đề xuất trong app. Chúng tôi chấm theo nhu cầu, tri thức địa phương, an toàn và sự đồng ý của cộng đồng.' : 'Suggest one in the app. We score requests on demand, local knowledge, safety and community consent.'}</p><a class="btn ghost" href="${APP}/hub-request">${vi ? 'Đề xuất Hub' : 'Suggest a Hub'}</a></div>
<div><h2>${vi ? 'Bạn có một không gian?' : 'Do you run a space?'}</h2><p>${vi ? 'Quán cà phê, nhà văn hóa, cơ sở lưu trú, CLB cộng đồng có thể đăng ký. Admin đến khảo sát trước khi duyệt.' : 'Cafés, cultural houses, guesthouses and community clubs can apply. An Admin visits before approval.'}</p><a class="btn ghost" href="${href(lang, 'partners')}">${vi ? 'Đăng ký làm Hub' : 'Apply to be a Hub'}</a></div>
</div></section>`;
}

type FigLite = { key: string; name: string; y: number; m?: number; d?: number; died: number; field: string; hint: string; fact: string; q?: string; qsrc?: string; image: string; portrait: boolean };
const lite = (lang: Lang, key: string, f: Figure): FigLite => ({ key, name: f.name, y: f.born.y, m: f.born.m, d: f.born.d, died: f.died, field: FIELDS[f.field][lang], hint: f[lang].hint, fact: f[lang].fact, q: f.quote?.[lang], qsrc: f.quote?.src, image: f.image ?? `${f.id}.webp`, portrait: f.art === 'portrait' });

/** Dữ liệu cho thẻ "Nhân vật hôm nay"; trình duyệt chọn theo ngày, cùng quy tắc với app (pickFigure). */
export function figureData(lang: Lang) {
  return { dated: Object.entries(FIGURES).map(([k, f]) => lite(lang, k, f)), undated: UNDATED.map((f) => lite(lang, '', f)) };
}

function stories(lang: Lang, mediaBase: string | null): string {
  const vi = lang === 'vi';
  const data = JSON.stringify(figureData(lang)).replace(/</g, '\\u003c');
  const label = vi ? { today: 'Nhân vật hôm nay', remember: 'Nhân vật để nhớ', born: 'Sinh ngày', ai: 'Ký họa minh họa bằng AI' } : { today: 'Born on this day', remember: 'A figure to remember', born: 'Born', ai: 'AI-assisted illustrative sketch' };
  return `
<section class="hero" style="padding-bottom:24px"><div class="wrap">
<div class="kicker">${vi ? 'Cộng đồng' : 'Community'}</div>
<h1>${vi ? 'Tri thức được ghi công, không bị bán' : 'Knowledge that is credited, not sold'}</h1>
<p class="lead">${vi ? 'Mỗi buổi gặp có thể để lại một điều đáng nhớ. MeetLore giúp ghi lại, duyệt và ghi công cho người đã chia sẻ, đồng thời tôn trọng quyền của cộng đồng với tri thức của họ.' : 'Every meeting can leave something worth keeping. MeetLore helps record it, review it and credit the person who shared it, while respecting each community’s rights over its own knowledge.'}</p>
</div></section>

<section class="tight" style="padding-top:0"><div class="wrap">
<div class="card" id="figure" hidden>
<div class="figure noimg" id="fig-grid">
<div id="fig-media" hidden><img id="fig-img" alt="" width="1200" height="800" hidden><p class="note" id="fig-ai" hidden style="margin-top:6px">${label.ai}</p></div>
<div><div class="kicker" id="fig-label"></div><h2 id="fig-name"></h2><div class="years" id="fig-years"></div><p id="fig-fact"></p><q id="fig-q" hidden></q><div class="note" id="fig-src"></div>
<p style="margin-top:14px"><a href="${APP}">${vi ? 'Đoán năm sinh trong app' : 'Guess the birth year in the app'} →</a></p></div>
</div></div>
</div></section>

<section><div class="wrap cols">
<div class="card"><h3>${vi ? 'Sổ TriGiao' : 'The TriGiao Book'}</h3><p>${vi ? 'Ghi chép ngắn về một nghề, một món ăn, một lễ hội hay một câu chuyện của nơi bạn đến. Mỗi ghi chép được người duyệt kiểm tra về độ chính xác, nguồn và sự đồng ý trước khi đăng.' : 'Short notes on a craft, a dish, a festival or a story from the place you visit. Each note is checked by a reviewer for accuracy, sources and consent before it is published.'}</p></div>
<div class="card"><h3>${vi ? 'Giờ tri thức' : 'Knowledge Hours'}</h3><p>${vi ? '100 điểm bằng 1 Giờ tri thức. Điểm đo công sức tạo ra nội dung, không đo bằng cấp: một giờ của nghệ nhân bằng một giờ của giáo sư. Điểm không có giá trị tiền mặt, không nạp, không rút.' : '100 points equal 1 Knowledge Hour. Points measure the effort behind the content, not degrees: an artisan’s hour equals a professor’s. Points have no cash value and cannot be bought or withdrawn.'}</p></div>
<div class="card"><h3>${vi ? 'Quỹ cộng đồng' : 'Community funds'}</h3><p>${vi ? 'Du khách có thể tặng điểm vào quỹ cộng đồng của Hub. Tri thức của cộng đồng dân tộc có thể ghi điểm cho cả cộng đồng thay vì một người, và cộng đồng có quyền yêu cầu gỡ nội dung.' : 'Travellers can donate points to a Hub’s community fund. Knowledge from an ethnic community can be credited to the whole community rather than one person, and the community can ask for content to be removed.'}</p></div>
</div>
<div class="wrap" style="margin-top:20px"><p><a href="${href(lang, 'points')}">${esc(LEGAL[lang].points.title)}</a> · <a href="${href(lang, 'content')}">${esc(LEGAL[lang].content.title)}</a> · <a href="${href(lang, 'community')}">${esc(LEGAL[lang].community.title)}</a></p></div>
</section>
<script>
(function(){
var D=${data};var MEDIA=${JSON.stringify(mediaBase)};var L=${JSON.stringify(label)};
var now=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));
var mm=String(now.getMonth()+1).padStart(2,'0'),dd=String(now.getDate()).padStart(2,'0');
var f=null,birthday=false;for(var i=0;i<D.dated.length;i++){if(D.dated[i].key===mm+'-'+dd){f=D.dated[i];birthday=true;break;}}
if(!f){var all=D.dated.concat(D.undated);var n=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(2026,0,1))/86400000);f=all[((n%all.length)+all.length)%all.length];}
var $=function(id){return document.getElementById(id)};
$('fig-label').textContent=(birthday?L.today:L.remember)+' · '+f.field;$('fig-name').textContent=f.name;
$('fig-years').textContent=(f.d&&f.m?L.born+' '+f.d+'/'+f.m+'/':'')+f.y+' – '+f.died;$('fig-fact').textContent=f.fact;
if(f.q){$('fig-q').textContent=f.q;$('fig-q').hidden=false;$('fig-src').textContent=f.qsrc||'';}
if(MEDIA){var img=$('fig-img');img.onload=function(){img.hidden=false;$('fig-ai').hidden=false;$('fig-media').hidden=false;$('fig-grid').classList.remove('noimg');};img.onerror=function(){img.remove();};img.alt=f.name;img.src=MEDIA+f.image;}
$('figure').hidden=false;
})();
</script>`;
}

function partners(lang: Lang): string {
  const vi = lang === 'vi';
  const cards = vi
    ? [
        ['Trở thành TriGiao Hub', 'Cơ sở lưu trú, quán cà phê, hàng quán, CLB cộng đồng, nhà văn hóa. Đơn miễn phí. Admin đến khảo sát thực tế rồi mới duyệt. MeetLore không bán thứ hạng: Hub nào cũng hiện như nhau.', ['Có chỗ ngồi công cộng, giờ mở cửa rõ ràng', 'Một người phụ trách nhận việc đối chiếu giấy tờ khi cần', 'Văn bản đồng ý của cơ sở trước khi Hub chính thức hoạt động'], `${APP}/partner/apply`, 'Đăng ký trong app'],
        ['Đối tác ưu đãi', 'Cơ sở ăn uống, lưu trú, di chuyển tự tài trợ ưu đãi để đón khách. Du khách dùng điểm để nhận ưu đãi; mỗi ưu đãi dùng một lần, có hạn và được xác nhận bằng mã QR.', ['Bạn tự chọn mức và số lượng ưu đãi mỗi tháng', 'Không có thanh toán qua app', 'Bắt đầu với 3 đến 5 đối tác trong đợt thử nghiệm'], `mailto:${EMAIL}?subject=Doi%20tac%20uu%20dai`, 'Gửi email'],
        ['Nhà tài trợ', 'Một màn hình nhà tài trợ hiện tối đa một lần mỗi ngày khi mở app, có nhãn "Quảng cáo" rõ ràng và nút Đóng. Nhà tài trợ được luân phiên đều nhau.', ['Ảnh dọc 9:16, chữ và logo ở vùng giữa', 'Không nhận quảng cáo thuốc lá, rượu mạnh, cờ bạc, thuốc', 'Nhà tài trợ chịu trách nhiệm về nội dung quảng cáo'], `mailto:${EMAIL}?subject=Tai%20tro`, 'Gửi email'],
      ]
    : [
        ['Become a TriGiao Hub', 'Guesthouses, cafés, eateries, community clubs and cultural houses. Applying is free. An Admin visits in person before approval. MeetLore never sells ranking: every Hub is shown equally.', ['Public seating and clear opening hours', 'One person in charge who can check documents when needed', 'A signed venue agreement before the Hub goes live'], `${APP}/partner/apply`, 'Apply in the app'],
        ['Reward partners', 'Food, lodging and transport businesses fund their own offers to welcome guests. Travellers use points to claim them; each offer is single-use, time-limited and confirmed by QR code.', ['You set the value and number of offers each month', 'No payments through the app', 'The pilot starts with 3 to 5 partners'], `mailto:${EMAIL}?subject=Reward%20partner`, 'Email us'],
        ['Sponsors', 'One sponsor screen appears at most once a day when the app opens, clearly labelled "Advertisement" with a Close button. Sponsors rotate evenly.', ['Portrait 9:16 image, text and logo in the centre area', 'No tobacco, strong alcohol, gambling or medicine ads', 'Sponsors are responsible for their ad content'], `mailto:${EMAIL}?subject=Sponsorship`, 'Email us'],
      ];
  return `
<section class="hero" style="padding-bottom:24px"><div class="wrap">
<div class="kicker">${vi ? 'Đối tác' : 'Partners'}</div>
<h1>${vi ? 'Cùng mở những nơi gặp gỡ tử tế' : 'Help open good places to meet'}</h1>
<p class="lead">${vi ? 'MeetLore do Công ty CP Dịch vụ Trực tuyến Mosa vận hành, phối hợp với SantaClaus Vietnam Foundation. Chúng tôi tìm những người muốn giữ cho việc gặp gỡ giữa du khách và người bản địa an toàn, công bằng và có ích cho nơi đó.' : 'MeetLore is operated by Mosa Online Service JSC in cooperation with SantaClaus Vietnam Foundation. We are looking for people who want meetings between travellers and locals to be safe, fair and good for the place.'}</p>
</div></section>
<section class="tight" style="padding-top:0"><div class="wrap cols">
${cards.map(([title, body, items, link, cta]) => `<div class="card"><h3>${title}</h3><p>${body}</p><ul>${(items as string[]).map((i) => `<li>${i}</li>`).join('')}</ul><a class="btn ghost" href="${link}">${cta}</a></div>`).join('')}
</div></section>
<section class="band"><div class="wrap">
<h2>${vi ? 'Cộng đồng địa phương và nhà trường' : 'Local communities and schools'}</h2>
<p style="max-width:720px">${vi ? 'Với các bản làng như Cát Cát, Tả Van, chúng tôi chỉ mở Hub khi có sự đồng ý của cộng đồng, có người kết nối tại chỗ và có quỹ cộng đồng. Trường đại học, CLB sinh viên có thể giới thiệu người bản địa từ 18 tuổi tham gia, theo quy tắc an toàn chung.' : 'In villages such as Cat Cat and Ta Van, we only open a Hub with the community’s consent, a local connector and a community fund. Universities and student clubs can introduce locals aged 18 and over, under the same safety rules.'}</p>
<p>${vi ? 'Liên hệ hợp tác' : 'Partnership enquiries'}: <a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${href(lang, 'hub-rules')}">${esc(LEGAL[lang]['hub-rules'].title)}</a></p>
</div></section>`;
}

function contact(lang: Lang): string {
  const vi = lang === 'vi';
  return [
    `<p>${vi ? 'Mọi câu hỏi về tài khoản, an toàn, dữ liệu cá nhân hoặc hợp tác Hub, vui lòng gửi email:' : 'For questions about your account, safety, personal data or Hub partnerships, please email:'}</p>`,
    `<p><strong><a href="mailto:${EMAIL}">${EMAIL}</a></strong></p>`,
    `<p>${vi ? 'Chúng tôi trả lời trong vòng 3 ngày làm việc. Việc khẩn cấp về an toàn khi đang gặp mặt: hãy gọi 113 (công an) hoặc 115 (cấp cứu) trước, rồi báo cho chúng tôi trong app tại mục Báo cáo.' : 'We reply within 3 working days. For an urgent safety issue during a meeting, call 113 (police) or 115 (ambulance) in Vietnam first, then tell us in the app under Report.'}</p>`,
    `<h2>${vi ? 'Đơn vị vận hành' : 'Operator'}</h2>`,
    `<p>${vi ? 'Công ty Cổ phần Dịch vụ Trực tuyến Mosa, mã số thuế 0107945928, Số 28C phố Vạn Bảo, phường Ngọc Hà, TP Hà Nội, phối hợp với SantaClaus Vietnam Foundation.' : 'Mosa Online Service Joint Stock Company, tax code 0107945928, 28C Van Bao Street, Ngoc Ha Ward, Hanoi, in cooperation with SantaClaus Vietnam Foundation.'}</p>`,
    `<p>${L[lang].publisher}: ${esc(PUBLISHER)}.</p>`,
    `<h2>${vi ? 'Xóa tài khoản và dữ liệu' : 'Delete your account and data'}</h2>`,
    `<p>${vi ? 'Trong app: Tôi → Quyền riêng tư → Xóa tài khoản. Hướng dẫn đầy đủ' : 'In the app: Me → Privacy → Delete account. Full instructions'}: <a href="${href(lang, 'delete-account')}">${esc(LEGAL[lang]['delete-account'].title)}</a>.</p>`,
  ].join('\n');
}

const docPage = (title: string, inner: string, note?: string) => `<main style="margin:32px 0"><h1 style="font-size:clamp(28px,4.5vw,38px)">${esc(title)}</h1>${note ? `<p><span class="tag">${esc(note)}</span></p>` : ''}${inner}</main>`;

// Đường dẫn của app được chuyển sang app.meetlore.app. Trên điện thoại đã cài app, /h, /k, /invite mở thẳng app trước khi tới đây.
export const REDIRECTS = `# Cloudflare Pages: chuyển các đường dẫn của app sang app.meetlore.app
/legal/:doc /:doc 301
/xoa-tai-khoan /delete-account 301
/en/legal/:doc /en/:doc 301
/h/* ${APP}/h/:splat 302
/k/* ${APP}/k/:splat 302
/invite/* ${APP}/invite/:splat 302
/auth/* ${APP}/auth/:splat 302
/partner ${APP}/partner 302
/partner/* ${APP}/partner/:splat 302
/hub-request ${APP}/hub-request 302
/help ${APP}/help 302
/report ${APP}/report 302
/admin ${APP}/admin 302
/admin/* ${APP}/admin/:splat 302
`;

export function buildSite(out: string, opts: { mediaBase?: string | null } = {}): string[] {
  const files: string[] = []; const root = resolve(import.meta.dirname, '..');
  const put = (rel: string, body: string) => { const f = join(out, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, body); files.push(rel); };
  const media = opts.mediaBase ?? null;
  for (const lang of ['vi', 'en'] as Lang[]) {
    const vi = lang === 'vi'; const base = vi ? '' : 'en/';
    put(`${base}index.html`, layout(lang, 'home', vi ? 'Gặp người bản địa, trao nhau tri thức' : 'Meet locals, trade knowledge', vi ? 'MeetLore kết nối du khách với người bản địa tại các TriGiao Hub ở Hà Nội và Sa Pa: gặp ở nơi an toàn, trao nhau điều mình biết.' : 'MeetLore connects travellers with locals at TriGiao Hubs in Hanoi and Sa Pa: meet somewhere safe and trade what you know.', home(lang)));
    put(`${base}hubs/index.html`, layout(lang, 'hubs', vi ? 'Các Hub' : 'Hubs', vi ? 'Các TriGiao Hub đang thử nghiệm ở Hà Nội và Sa Pa.' : 'TriGiao Hubs in the Hanoi and Sa Pa pilot.', hubs(lang)));
    put(`${base}stories/index.html`, layout(lang, 'stories', vi ? 'Cộng đồng' : 'Community', vi ? 'Sổ TriGiao, Giờ tri thức, quỹ cộng đồng và nhân vật hôm nay.' : 'The TriGiao Book, Knowledge Hours, community funds and a figure for today.', stories(lang, media)));
    put(`${base}partners/index.html`, layout(lang, 'partners', vi ? 'Đối tác' : 'Partners', vi ? 'Mở một TriGiao Hub, làm đối tác ưu đãi hoặc nhà tài trợ của MeetLore.' : 'Open a TriGiao Hub, become a reward partner or a MeetLore sponsor.', partners(lang)));
    put(`${base}contact/index.html`, layout(lang, 'contact', L[lang].contact, vi ? 'Liên hệ MeetLore và thông tin đơn vị vận hành.' : 'Contact MeetLore and operator details.', docPage(L[lang].contact, contact(lang)), false));
    for (const d of DOCS) put(`${base}${d}/index.html`, layout(lang, d, LEGAL[lang][d].title, LEGAL[lang][d].title, docPage(LEGAL[lang][d].title, bodyToHtml(LEGAL[lang][d].body), LEGAL_DRAFT[lang]), false));
  }
  put('_redirects', REDIRECTS);
  put('404.html', layout('vi', 'home', 'Không tìm thấy trang', 'Không tìm thấy trang', `<section class="hero"><div class="wrap"><h1>Không tìm thấy trang · Page not found</h1><p class="lead">Trang này không có hoặc đã chuyển chỗ.</p><div class="actions"><a class="btn primary" href="/">Trang chủ</a><a class="btn ghost" href="/en/">Home (English)</a></div></div></section>`));
  put('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://meetlore.app/sitemap.xml\n');
  const pages: Page[] = ['home', 'hubs', 'stories', 'partners', 'contact', ...DOCS];
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.flatMap((p) => (['vi', 'en'] as Lang[]).map((l) => `<url><loc>https://meetlore.app${href(l, p)}</loc></url>`)).join('\n')}\n</urlset>\n`);
  // Tệp xác minh liên kết app phải nằm ở meetlore.app.
  cpSync(join(root, 'public', '.well-known'), join(out, '.well-known'), { recursive: true }); files.push('.well-known/');
  cpSync(join(root, 'public', '_headers'), join(out, '_headers')); files.push('_headers');
  mkdirSync(join(out, 'assets'), { recursive: true });
  cpSync(join(root, 'assets', 'logo', 'logo-1-ngang.svg'), join(out, 'assets', 'logo.svg'));
  cpSync(join(root, 'assets', 'logo', 'logo-1-an-giao.svg'), join(out, 'assets', 'mark.svg'));
  cpSync(join(root, 'assets', 'favicon.png'), join(out, 'assets', 'favicon.png'));
  for (const [src, dst] of [['site/icon-180.png', 'icon-180.png'], ['site/og.png', 'og.png']]) if (existsSync(join(root, 'assets', src))) cpSync(join(root, 'assets', src), join(out, 'assets', dst));
  files.push('assets/');
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const out = resolve(import.meta.dirname, '..', 'site-dist');
  rmSync(out, { recursive: true, force: true });
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const files = buildSite(out, { mediaBase: url ? `${url}/storage/v1/object/public/media/figures/` : null });
  console.log(`Đã tạo ${files.length} mục trong site-dist/${url ? '' : ' (chưa có EXPO_PUBLIC_SUPABASE_URL nên trang Cộng đồng không hiện ảnh nhân vật)'}`);
}
