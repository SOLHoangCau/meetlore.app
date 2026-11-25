import { useState } from 'react';
import { useApp } from '../../src/lib/store';
import { Banner, Btn, Check, Chip, Field, Gap, Screen, Small, Wrap } from '../../src/ui';

/** Người phụ trách Hub hoặc người duyệt đối chiếu giấy tờ tận mắt. Không chụp, không lưu ảnh. */
export default function InPerson() {
  const { t, s, a, hubs, can } = useApp(); const mine = can('verifier') ? hubs : hubs.filter((h) => s.operatorHubs.includes(h.slug));
  const [x, set] = useState({ code: '', hub: mine[0]?.slug ?? '', doc: 'national_id', last4: '', name: false, face: false }); const [res, setRes] = useState('');
  if (!mine.length) return <Screen back title={t('ipTitle')}><Banner tone="turmeric" title={t('ipNoRight')} /></Screen>;
  return <Screen back title={t('ipTitle')}><Banner title={t('ipRule')} />
    <Field label={t('ipCode')} autoCapitalize="characters" value={x.code} onChangeText={(v) => set({ ...x, code: v })} />
    <Small style={{ marginBottom: 6 }}>{t('kHub')}</Small><Wrap style={{ marginBottom: 12 }}>{mine.map((h) => <Chip key={h.slug} label={h[s.locale].name} on={x.hub === h.slug} onPress={() => set({ ...x, hub: h.slug })} />)}</Wrap>
    <Wrap style={{ marginBottom: 12 }}><Chip label={t('docId')} on={x.doc === 'national_id'} onPress={() => set({ ...x, doc: 'national_id' })} /><Chip label={t('docPassport')} on={x.doc === 'passport'} onPress={() => set({ ...x, doc: 'passport' })} /></Wrap>
    <Field label={t('docLast4')} maxLength={4} autoCapitalize="characters" value={x.last4} onChangeText={(v) => set({ ...x, last4: v })} />
    <Check label={t('ipName')} on={x.name} onPress={() => set({ ...x, name: !x.name })} /><Check label={t('ipFace')} on={x.face} onPress={() => set({ ...x, face: !x.face })} />
    {!!res && <Banner tone={res === 'checked' ? 'moss' : 'son'} title={res === 'checked' ? t('ipOk') : res === 'mismatch' ? t('ipMismatch') : t('ipNotFound')} />}
    <Gap h={8} /><Btn disabled={x.code.trim().length < 6 || x.last4.trim().length !== 4} label={t('ipSubmit')} onPress={async () => { try { setRes(await a.verifyInPerson(x.code, x.hub, x.doc, x.last4, x.name, x.face)); set({ ...x, code: '', last4: '', name: false, face: false }); } catch (e: any) { setRes(e.message); } }} /></Screen>;
}
