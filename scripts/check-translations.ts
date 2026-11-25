// Kiểm tra bản dịch: đủ khóa giao diện người dùng, không có khóa lạ, giữ nguyên các biến {x}.
import { readFileSync } from 'node:fs';
import { en } from '../src/i18n.ts';
const keys = readFileSync(new URL('./ui-keys.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
let bad = 0;
for (const code of ['zh-Hans', 'zh-Hant', 'ko', 'ru', 'ja', 'fr', 'de', 'es', 'pt-BR']) {
  let text = '';
  try { text = readFileSync(new URL(`../src/i18n/${code}.ts`, import.meta.url), 'utf8'); } catch { console.log(code, 'MISSING FILE'); bad++; continue; }
  const body = text.slice(text.indexOf('`') + 1, text.lastIndexOf('`'));
  const d = new Map(body.split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  const missing = keys.filter((k) => !d.has(k)); const extra = [...d.keys()].filter((k) => !(k in en));
  const vars = [...d].filter(([k, v]) => k in en && JSON.stringify(((en as any)[k].match(/\{\w+\}/g) ?? []).sort()) !== JSON.stringify((v.match(/\{\w+\}/g) ?? []).sort())).map(([k]) => k);
  const empty = [...d].filter(([, v]) => !v).map(([k]) => k);
  console.log(code, d.size, missing.length ? `missing ${missing.join(',')}` : '', extra.length ? `extra ${extra.join(',')}` : '', vars.length ? `vars ${vars.join(',')}` : '', empty.length ? `empty ${empty.join(',')}` : '');
  bad += missing.length + extra.length + vars.length + empty.length;
}
if (bad) process.exit(1);
