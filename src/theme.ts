import { Platform } from 'react-native';
export const c = {
  paper: '#F5F0E6', surface: '#FFFDF8', sunk: '#ECE5D6', ink: '#1B2A33', muted: '#56636A', line: '#DAD1BF',
  indigo: '#24426B', indigoSoft: '#E1E7EF', son: '#B23521', sonSoft: '#F6E2DC', turmeric: '#8A6112', turmericSoft: '#F4E8CC', moss: '#2F6146', mossSoft: '#DFEBE2', white: '#FFFFFF',
};
// Trên web, thêm phông hệ thống để chữ Hán, Hàn, Nhật, Kirin không rơi về phông có chân. Trên điện thoại, hệ điều hành tự thay phông cho ký tự thiếu.
const web = (name: string, rest: string) => (Platform.OS === 'web' ? `${name}, ${rest}` : name);
const SANS = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "PingFang SC", "Hiragino Sans", "Malgun Gothic", sans-serif';
export const f = { serif: web('Lora_600SemiBold', 'Georgia, "Noto Serif", serif'), serifBold: web('Lora_700Bold', 'Georgia, "Noto Serif", serif'), body: web('BeVietnamPro_400Regular', SANS), medium: web('BeVietnamPro_500Medium', SANS), bold: web('BeVietnamPro_600SemiBold', SANS) };
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
