import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { FIGURES, UNDATED, type Figure } from '../../src/data/figures';
import { loadFigures } from '../../src/lib/figureSource';
import { figuresToCsv, parseCsv, rowsToFigures, toDbRow, type CsvIssue, type ParsedFigure } from '../../src/lib/figuresCsv';
import * as live from '../../src/lib/live';
import { useApp } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Banner, Btn, Card, Check, Field, Gap, H2, P, Screen, Small, Wrap } from '../../src/ui';

/** Sắp xếp để tệp bắt đầu từ 01/12, rồi các tháng sau, rồi nhân vật chưa rõ ngày sinh. */
const order = (k: string | null) => k == null ? 'zz' : k >= '12' ? k : 'z' + k;
const asList = (dated: Record<string, Figure>, undated: Figure[]) =>
  [...Object.entries(dated).map(([key, figure]) => ({ key, figure })), ...undated.map((figure) => ({ key: null, figure }))].sort((a, b) => order(a.key).localeCompare(order(b.key)));

function download(name: string, text: string) {
  if (Platform.OS === 'web') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } else Share.share({ message: text, title: name }).catch(() => {});
}
function pickFile(onText: (t: string) => void) {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.csv,text/csv';
  input.onchange = () => { const f = input.files?.[0]; if (f) f.text().then(onText); }; input.click();
}

export default function AdminFigures() {
  const { t, s, a } = useApp();
  const [text, setText] = useState(''); const [items, setItems] = useState<ParsedFigure[] | null>(null); const [issues, setIssues] = useState<CsvIssue[]>([]);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ tone: 'moss' | 'son'; text: string } | null>(null);
  const check = (raw = text) => { const r = rowsToFigures(parseCsv(raw)); setItems(r.items); setIssues(r.issues); setMsg(null); };
  const issueText = (x: CsvIssue) => t(x.kind === 'missing' ? 'figErrMissing' : x.kind === 'duplicate' ? 'figErrDuplicate' : 'figErrInvalid', { r: x.row, c: x.col });
  const exportNow = async () => { const set = await loadFigures(); download('meetlore-nhan-vat.csv', figuresToCsv(asList(set.dated, set.undated))); };
  const importNow = async () => {
    if (!items?.length || issues.length) return; setBusy(true);
    try {
      if (!isDemo) await live.rpcCall('import_daily_figures', { p_rows: items.map(toDbRow) });
      setMsg({ tone: 'moss', text: t('figCsvDone', { n: items.length }) }); setItems(null); setText('');
    } catch (e: any) { setMsg({ tone: 'son', text: e.message }); } finally { setBusy(false); }
  };
  return <Screen back title={t('adFigures')}>
    <Card><Check label={t('flag_daily_figure')} on={s.flags.daily_figure} onPress={() => a.setFlag('daily_figure', !s.flags.daily_figure)} /><Small>{t('figFlagB')}</Small></Card>
    <Card><H2 style={{ marginBottom: 6 }}>{t('figCsvTitle')}</H2><P muted style={{ marginBottom: 10 }}>{t('figCsvB')}</P>
      <Wrap><Btn kind="secondary" label={t('figCsvTemplate')} onPress={() => download('meetlore-nhan-vat-mau.csv', figuresToCsv(asList(FIGURES, UNDATED)))} /><Btn kind="ghost" label={t('figCsvExport')} onPress={exportNow} /></Wrap>
      <Gap h={8} />
      {Platform.OS === 'web' && <><Btn kind="secondary" label={t('figCsvPick')} onPress={() => pickFile((x) => { setText(x); check(x); })} /><Gap h={8} /></>}
      <Field label={t('figCsvPaste')} multiline value={text} onChangeText={(x) => { setText(x); setItems(null); }} autoCapitalize="none" autoCorrect={false} />
      <Btn kind="secondary" disabled={!text.trim()} label={t('figCsvCheck')} onPress={() => check()} />
      {items && <><Gap h={8} />{issues.length ? <Banner tone="son" title={t('figCsvBad', { n: issues.length })}>{issues.slice(0, 20).map((x, i) => <Small key={i}>{issueText(x)}</Small>)}</Banner>
        : <Banner tone="moss" title={t('figCsvOk', { n: items.length })}><Small>{items.slice(0, 5).map((x) => `${x.key ?? '—'} ${x.figure.name}`).join(' · ')}{items.length > 5 ? ' …' : ''}</Small></Banner>}
        <Gap h={8} /><Btn disabled={busy || !!issues.length || !items.length} label={t('figCsvImport', { n: items.length })} onPress={importNow} /></>}
      {msg && <><Gap h={8} /><Banner tone={msg.tone} title={msg.text} /></>}
    </Card>
    <Card><H2 style={{ marginBottom: 6 }}>{t('figImagesT')}</H2><Small>{t('figImagesB')}</Small></Card>
  </Screen>;
}
