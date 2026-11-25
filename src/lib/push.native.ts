// Đăng ký thông báo đẩy. Chỉ gọi khi người dùng bật trong app. Mã thiết bị được lưu qua hàm save_push_token.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { rpc } from './supabase';

export async function registerPush() {
  if (!Device.isDevice) throw new Error('push_needs_device');
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) throw new Error('push_denied');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'MeetLore', importance: Notifications.AndroidImportance.DEFAULT });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await rpc('save_push_token', { p_token: data, p_platform: Platform.OS });
  return data;
}
