import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { LEGAL, LEGAL_DRAFT, LEGAL_REFERENCE_NOTE, type LegalDoc } from '../../src/data/legal';
import { useApp } from '../../src/lib/store';
import { c } from '../../src/theme';
import { Gap, H2, P, Row, Screen, Small, Tag } from '../../src/ui';

/** Hiển thị văn bản pháp lý. Ngôn ngữ ngoài tiếng Việt dùng bản tiếng Anh, có ghi chú bản dịch chỉ để tham khảo. */
export default function Legal() {
  const { s } = useApp(); const { doc } = useLocalSearchParams<{ doc: string }>(); const d = LEGAL[s.locale][doc as LegalDoc] ?? LEGAL[s.locale].terms;
  const lines = d.body.split('\n').filter((x) => x.trim());
  return <Screen back title={d.title}><Tag tone="turmeric" label={LEGAL_DRAFT[s.locale]} />{!['vi', 'en'].includes(s.uiLocale) && <Small style={{ marginTop: 6 }}>{LEGAL_REFERENCE_NOTE}</Small>}<Gap h={12} />
    {lines.map((x, i) => {
      if (x.startsWith('### ')) return <H2 key={i} style={{ marginTop: 10, marginBottom: 6 }}>{x.slice(4)}</H2>;
      if (x.startsWith('> ')) return <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: c.son, paddingLeft: 10, marginBottom: 10 }}><P>{x.slice(2)}</P></View>;
      const b = /^(- |\d+\. )/.exec(x);
      if (b) return <Row key={i} style={{ alignItems: 'flex-start', gap: 8, marginBottom: 6 }}><P style={{ width: 22 }}>{b[1].startsWith('-') ? '•' : b[1].trim()}</P><P style={{ flex: 1 }}>{x.slice(b[1].length)}</P></Row>;
      return <P key={i} style={{ marginBottom: 10 }}>{x}</P>;
    })}</Screen>;
}
