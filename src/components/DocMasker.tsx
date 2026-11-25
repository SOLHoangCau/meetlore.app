// Che vùng nhạy cảm của giấy tờ ngay trên máy, trước khi tải lên. Dùng khối đặc, không làm mờ.
// Vùng bắt buộc theo mẫu từng loại giấy tờ; người dùng chạm vào ảnh để che thêm, chạm vào khối mình thêm để bỏ.
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useApp } from '../lib/store';
import { c } from '../theme';
import { Btn, Gap, Small } from '../ui';

export type Box = { x: number; y: number; w: number; h: number };
// Tọa độ tương đối (0..1) trên ảnh đã căn sát mép giấy tờ. Giữ lại ảnh mặt, họ tên, năm sinh và 4 số cuối.
export const TEMPLATES: Record<'national_id' | 'passport', Box[]> = {
  national_id: [
    { x: 0.30, y: 0.30, w: 0.42, h: 0.14 }, // phần đầu số giấy tờ, chừa 4 số cuối
    { x: 0.76, y: 0.00, w: 0.24, h: 0.34 }, // mã QR
    { x: 0.28, y: 0.62, w: 0.72, h: 0.38 }, // quê quán, nơi thường trú, ngày hết hạn
  ],
  passport: [
    { x: 0.00, y: 0.76, w: 1.00, h: 0.24 }, // dòng mã máy đọc (MRZ)
    { x: 0.62, y: 0.06, w: 0.38, h: 0.14 }, // số hộ chiếu ở góc trên
    { x: 0.30, y: 0.52, w: 0.70, h: 0.22 }, // nơi sinh, số định danh, cơ quan cấp
  ],
};

async function maskOnWeb(uri: string, boxes: Box[]): Promise<string> {
  const doc = (globalThis as any).document; const img = new (globalThis as any).Image(); img.crossOrigin = 'anonymous';
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = uri; });
  const canvas = doc.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const g = canvas.getContext('2d'); g.drawImage(img, 0, 0); g.fillStyle = '#000';
  for (const b of boxes) g.fillRect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
  // Vẽ lại lên canvas mới nên ảnh xuất ra không còn thông tin vị trí, thời gian chụp.
  const blob: Blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
  return URL.createObjectURL(blob);
}

export function DocMasker({ uri, docType, onDone, onCancel }: { uri: string; docType: 'national_id' | 'passport'; onDone: (masked: string) => void; onCancel: () => void }) {
  const { t } = useApp(); const shot = useRef<any>(null); const [ratio, setRatio] = useState(1.58); const [width, setWidth] = useState(0); const [extra, setExtra] = useState<Box[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { Image.getSize(uri, (w, h) => setRatio(w / h), () => {}); }, [uri]);
  const required = TEMPLATES[docType]; const height = width / ratio;
  const tap = (e: any) => { const { locationX, locationY } = e.nativeEvent; if (!width) return; const w = 0.22, h = 0.1; setExtra([...extra, { x: Math.max(0, Math.min(1 - w, locationX / width - w / 2)), y: Math.max(0, Math.min(1 - h, locationY / height - h / 2)), w, h }]); };
  const done = async () => {
    setBusy(true);
    try { onDone(Platform.OS === 'web' ? await maskOnWeb(uri, [...required, ...extra]) : await captureRef(shot, { format: 'jpg', quality: 0.85, result: 'tmpfile' })); }
    finally { setBusy(false); }
  };
  const block = (b: Box, i: number, removable: boolean) => <Pressable key={`${removable ? 'e' : 'r'}${i}`} disabled={!removable} onPress={() => setExtra(extra.filter((_, j) => j !== i))} style={{ position: 'absolute', left: b.x * width, top: b.y * height, width: b.w * width, height: b.h * height, backgroundColor: '#000' }} accessibilityLabel={removable ? t('maskRemove') : t('maskRequired')} />;
  return <View>
    <Small style={{ marginBottom: 8 }}>{t('maskHelp')}</Small>
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      <Pressable onPress={tap}>
        <View ref={shot} collapsable={false} style={{ width, height, backgroundColor: c.line, overflow: 'hidden' }}>
          {!!width && <Image source={{ uri }} style={{ width, height }} resizeMode="stretch" />}
          {required.map((b, i) => block(b, i, false))}{extra.map((b, i) => block(b, i, true))}
        </View>
      </Pressable>
    </View>
    <Gap h={8} /><Small>{t('maskKeep')}</Small><Gap h={8} />
    <Btn label={busy ? t('maskWorking') : t('maskDone')} disabled={busy || !width} onPress={done} /><Gap h={6} /><Btn kind="ghost" label={t('maskRetake')} onPress={onCancel} />
  </View>;
}
