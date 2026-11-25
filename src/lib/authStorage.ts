// Web: phiên lưu trong localStorage qua AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
export const authStorage = { getItem: (k: string) => AsyncStorage.getItem(k), setItem: (k: string, v: string) => AsyncStorage.setItem(k, v), removeItem: (k: string) => AsyncStorage.removeItem(k) };
