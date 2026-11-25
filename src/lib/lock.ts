// Tùy chọn khóa app bằng Face ID, vân tay hoặc mã máy. Chỉ có trên iOS/Android.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
const KEY = 'meetlore.lock.v1';
let enabled = false; const subs = new Set<(on: boolean) => void>();
export const lockSupportedPlatform = Platform.OS !== 'web';
export const loadLock = async () => { if (!lockSupportedPlatform) return false; enabled = (await AsyncStorage.getItem(KEY).catch(() => null)) === '1'; subs.forEach((f) => f(enabled)); return enabled; };
export const lockEnabled = () => enabled;
export const onLockChange = (f: (on: boolean) => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Thiết bị có Face ID, vân tay hoặc mã khóa màn hình hay không. */
export const lockAvailable = async () => lockSupportedPlatform && (await LocalAuthentication.getEnrolledLevelAsync()) > LocalAuthentication.SecurityLevel.NONE;
/** Hỏi Face ID/vân tay; nếu không được thì hệ điều hành cho nhập mã máy. */
export const authenticate = async (prompt: string, cancel: string) => { const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: cancel, disableDeviceFallback: false }); return r.success; };
export const setLock = async (on: boolean) => { enabled = on; await AsyncStorage.setItem(KEY, on ? '1' : '0'); subs.forEach((f) => f(on)); };
