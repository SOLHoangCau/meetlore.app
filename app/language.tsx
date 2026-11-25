import { useRouter } from 'expo-router';
import { LANGUAGES } from '../src/data/catalog';
import { UI_LOCALES } from '../src/i18n';
import { useApp } from '../src/lib/store';
import { c } from '../src/theme';
import { Card, P, Row, Screen, Small, Tag } from '../src/ui';

export default function Language() {
  const { t, s, a } = useApp(); const r = useRouter();
  return <Screen back title={t('sLanguage')}><Small style={{ marginBottom: 12 }}>{t('langNote')}</Small>
    {UI_LOCALES.map((code) => { const l = LANGUAGES.find((x) => x.code === code); return <Card key={code} onPress={() => { a.setLanguage(code); r.back(); }} style={s.uiLocale === code ? { borderColor: c.indigo, borderWidth: 2 } : undefined}>
      <Row style={{ justifyContent: 'space-between' }}><P>{l?.native ?? code}</P>{!['vi', 'en'].includes(code) && <Tag tone="plain" label={t('langReview')} />}</Row></Card>; })}</Screen>;
}
