// Đăng ký bản dịch giao diện cho 9 ngôn ngữ ngoài tiếng Việt và tiếng Anh.
// Mỗi tệp là danh sách "khóa=bản dịch". Khóa nào thiếu sẽ hiện tiếng Anh. Bản dịch máy có hỗ trợ, chờ người bản ngữ rà soát.
import { registerLocale, type Dict, type Key, type UiLocale } from '../i18n';
import de from '../i18n/de';
import es from '../i18n/es';
import fr from '../i18n/fr';
import ja from '../i18n/ja';
import ko from '../i18n/ko';
import ptBR from '../i18n/pt-BR';
import ru from '../i18n/ru';
import zhHans from '../i18n/zh-Hans';
import zhHant from '../i18n/zh-Hant';

export function parseDict(text: string): Dict {
  const d: Dict = {};
  for (const line of text.split('\n')) { const i = line.indexOf('='); if (i > 0) d[line.slice(0, i).trim() as Key] = line.slice(i + 1).trim(); }
  return d;
}
const ALL: [UiLocale, string][] = [['zh-Hans', zhHans], ['zh-Hant', zhHant], ['ko', ko], ['ru', ru], ['ja', ja], ['fr', fr], ['de', de], ['es', es], ['pt-BR', ptBR]];
for (const [code, text] of ALL) registerLocale(code, parseDict(text));
