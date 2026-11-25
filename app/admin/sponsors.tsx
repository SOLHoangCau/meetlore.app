import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { dayKey, pickDaily, type SponsorCfg } from '../../src/lib/daily';
import { DEFAULT_CFG, loadSponsors, saveSponsor, saveTiming, type Sponsor } from '../../src/lib/sponsors';
import { useApp } from '../../src/lib/store';
import { isDemo } from '../../src/lib/supabase';
import { Banner, Btn, Card, Check, Chip, Field, Gap, H2, P, Row, Screen, Small, Tag, Wrap } from '../../src/ui';

/** Admin quản lý nhà tài trợ: mỗi ngày hiện một nhà tài trợ đang chạy, lần lượt theo thứ tự. */
const blank = (): Omit<Sponsor, 'id'> => ({ name: '', kind: 'static', imageVi: '', imageEn: '', link: '', startsOn: dayKey(), endsOn: null, active: true, sort: 0 });
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const https = (v: string | null) => !v || /^https:\/\/\S+$/.test(v);

export default function Sponsors() {
  const { t } = useApp(); const r = useRouter(); const today = dayKey();
  const [cfg, setCfg] = useState<SponsorCfg>(DEFAULT_CFG); const [list, setList] = useState<Sponsor[]>([]);
  const [edit, setEdit] = useState<Sponsor | Omit<Sponsor, 'id'> | null>(null); const [msg, setMsg] = useState('');
  const reload = () => loadSponsors(today, false).then((x) => { setCfg(x.cfg); setList(x.list); }).catch((e) => setMsg(e.message));
  useEffect(() => { reload(); }, []);
  const running = list.filter((x) => x.active && x.startsOn <= today && (!x.endsOn || x.endsOn >= today));
  const todays = pickDaily(running, today);
  const valid = (x: Omit<Sponsor, 'id'>) => x.name.trim().length >= 2 && (isDemo ? https(x.imageVi) : !!x.imageVi && https(x.imageVi)) && https(x.imageEn) && https(x.link) && isDate(x.startsOn) && (!x.endsOn || (isDate(x.endsOn) && x.endsOn >= x.startsOn));
  const save = async () => { if (!edit) return; if (!valid(edit)) { setMsg(t('spBad')); return; } try { await saveSponsor(edit); setEdit(null); setMsg(t('spSaved')); reload(); } catch (e: any) { setMsg(e.message); } };
  const set = (k: keyof Sponsor, v: unknown) => setEdit((o) => o ? { ...o, [k]: v } as any : o);

  return <Screen back title={t('adSponsors')}>
    <Banner title={t('spRule')} />
    <Card><H2 style={{ marginBottom: 8 }}>{t('spSetup')}</H2>
      <Check label={t('spOn')} on={cfg.enabled} onPress={() => setCfg({ ...cfg, enabled: !cfg.enabled })} />
      <Small>{t('spShow')}</Small><Wrap>{[5, 6, 7, 8].map((n) => <Chip key={n} label={`${n}`} on={cfg.showSeconds === n} onPress={() => setCfg({ ...cfg, showSeconds: n })} />)}</Wrap>
      <Small>{t('spWait')}</Small><Wrap>{[0, 1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`${n}`} on={cfg.animatedWaitSeconds === n} onPress={() => setCfg({ ...cfg, animatedWaitSeconds: n })} />)}</Wrap>
      <Btn kind="secondary" label={t('save')} onPress={() => saveTiming(cfg, cfg.enabled).then(() => setMsg(t('spSaved'))).catch((e) => setMsg(e.message))} />
    </Card>
    <P style={{ marginBottom: 8 }}>{todays ? t('spToday', { x: todays.name }) : t('spNone')}</P>
    {!!msg && <Small style={{ marginBottom: 8 }}>{msg}</Small>}
    {list.map((x) => { const on = running.some((y) => y.id === x.id); return <Card key={x.id}>
      <Row style={{ justifyContent: 'space-between' }}><H2 style={{ flex: 1 }}>{x.sort}. {x.name}</H2><Tag tone={on ? 'moss' : 'plain'} label={on ? t('spActive') : t('spPaused')} /></Row>
      <Small>{x.kind === 'static' ? t('spKindStatic') : t('spKindAnimated')} · {x.startsOn} → {x.endsOn ?? '…'}</Small>
      <Wrap><Btn kind="ghost" label={t('hubEdit')} onPress={() => setEdit(x)} /><Btn kind="ghost" label={t('spPreview')} onPress={() => r.push({ pathname: '/admin/sponsor-preview', params: { id: x.id } } as never)} />
        <Btn kind="ghost" label={x.active ? t('spPause') : t('spResume')} onPress={() => saveSponsor({ ...x, active: !x.active }).then(reload).catch((e) => setMsg(e.message))} /></Wrap>
    </Card>; })}
    {!edit && <Btn label={t('spAdd')} onPress={() => setEdit({ ...blank(), sort: list.length + 1 })} />}
    {!!edit && <Card><H2 style={{ marginBottom: 8 }}>{'id' in edit ? edit.name : t('spAdd')}</H2>
      <Field label={t('spName')} value={edit.name} onChangeText={(v) => set('name', v)} />
      <Wrap><Chip label={t('spKindStatic')} on={edit.kind === 'static'} onPress={() => set('kind', 'static')} /><Chip label={t('spKindAnimated')} on={edit.kind === 'animated'} onPress={() => set('kind', 'animated')} /></Wrap><Gap h={8} />
      <Field label={t('spImgVi')} autoCapitalize="none" value={edit.imageVi ?? ''} onChangeText={(v) => set('imageVi', v.trim())} />
      <Field label={t('spImgEn')} autoCapitalize="none" value={edit.imageEn ?? ''} onChangeText={(v) => set('imageEn', v.trim())} />
      <Field label={t('spLink')} autoCapitalize="none" value={edit.link ?? ''} onChangeText={(v) => set('link', v.trim())} />
      <Field label={t('spStart')} value={edit.startsOn} onChangeText={(v) => set('startsOn', v.trim())} />
      <Field label={t('spEnd')} value={edit.endsOn ?? ''} onChangeText={(v) => set('endsOn', v.trim() || null)} />
      <Field label={t('spOrder')} keyboardType="number-pad" value={String(edit.sort)} onChangeText={(v) => set('sort', Number(v) || 0)} />
      <Small style={{ marginBottom: 8 }}>{t('spImgHelp')}</Small>
      <Row style={{ gap: 8 }}><Btn label={t('save')} onPress={save} /><Btn kind="ghost" label={t('cancel')} onPress={() => setEdit(null)} /></Row>
    </Card>}
  </Screen>;
}
