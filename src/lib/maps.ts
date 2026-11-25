// Bản đồ Goong (nền MapLibre) và nút chỉ đường. Không cần khóa API cho chỉ đường: mở Google Maps hoặc Apple Maps.
import { Alert, Linking, Platform } from 'react-native';
import type { HubSeed } from '../data/catalog';

/** Maptiles key của Goong. Nhập trong biến môi trường EAS/Cloudflare, không đưa vào mã nguồn. */
export const GOONG_KEY = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY ?? '';
export const goongStyle = (key = GOONG_KEY) => `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(key)}`;

/** Khung bao các Hub [tây, nam, đông, bắc], nới thêm để điểm không sát mép. */
export function hubBounds(hubs: Pick<HubSeed, 'lat' | 'lng'>[], pad = 0.004): [number, number, number, number] {
  const lats = hubs.map((h) => h.lat), lngs = hubs.map((h) => h.lng);
  return [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad];
}
export const googleDirections = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const appleDirections = (lat: number, lng: number, label: string) => `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`;

/** iPhone: hỏi mở Apple Maps hay Google Maps. Android và web: mở Google Maps. */
export function openDirections(lat: number, lng: number, label: string, t: (k: any) => string) {
  if (Platform.OS !== 'ios') return void Linking.openURL(googleDirections(lat, lng)).catch(() => {});
  Alert.alert(t('dirTitle'), label, [
    { text: 'Apple Maps', onPress: () => Linking.openURL(appleDirections(lat, lng, label)).catch(() => {}) },
    { text: 'Google Maps', onPress: () => Linking.openURL(googleDirections(lat, lng)).catch(() => {}) },
    { text: t('cancel'), style: 'cancel' },
  ]);
}
