// iOS/Android: phiên lưu trong Keychain/Keystore qua SecureStore, chia nhỏ vì mỗi mục chỉ nên dưới 2 KB.
import * as SecureStore from 'expo-secure-store';
import { chunk } from './authPolicy';
const SIZE = 1800;
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const name = (key: string, part: string | number) => `${key.replace(/[^A-Za-z0-9._-]/g, '_')}.${part}`;
async function removeParts(key: string, from: number, to: number) { for (let i = from; i < to; i++) await SecureStore.deleteItemAsync(name(key, i), opts).catch(() => {}); }
export const authStorage = {
  async getItem(key: string) {
    const n = Number(await SecureStore.getItemAsync(name(key, 'n'), opts)); if (!n) return null;
    let out = ''; for (let i = 0; i < n; i++) { const p = await SecureStore.getItemAsync(name(key, i), opts); if (p == null) return null; out += p; } return out;
  },
  async setItem(key: string, value: string) {
    const old = Number(await SecureStore.getItemAsync(name(key, 'n'), opts)) || 0; const parts = chunk(value, SIZE);
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(name(key, i), parts[i], opts);
    await SecureStore.setItemAsync(name(key, 'n'), String(parts.length), opts); await removeParts(key, parts.length, old);
  },
  async removeItem(key: string) { const old = Number(await SecureStore.getItemAsync(name(key, 'n'), opts)) || 0; await SecureStore.deleteItemAsync(name(key, 'n'), opts).catch(() => {}); await removeParts(key, 0, old); },
};
