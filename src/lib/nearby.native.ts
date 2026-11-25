import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
export type GeoHub = { id: string; name: string; lat: number; lng: number; radius: number };
const TASK = 'trigiao-hub-geofence';
const HUBS_KEY = 'trigiao.geo.hubs';
const SENT_KEY = 'trigiao.geo.sent.v2';
const LIMIT_KEY = 'trigiao.geo.max_per_day';
const IOS_REGION_LIMIT = 20;

TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(TASK, async ({ data, error }) => {
  if (error || !data?.region?.identifier || data.eventType !== Location.GeofencingEventType.Enter) return;
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 8) return;
  const today = new Date().toISOString().slice(0, 10);
  const id = data.region.identifier;
  const limit = Number((await AsyncStorage.getItem(LIMIT_KEY)) ?? 1) || 1;
  const stored = JSON.parse((await AsyncStorage.getItem(SENT_KEY)) ?? '{}') as { day?: string; ids?: string[] };
  const sent = stored.day === today ? stored.ids ?? [] : [];
  if (sent.includes(id) || sent.length >= limit) return;
  const hubs = JSON.parse((await AsyncStorage.getItem(HUBS_KEY)) ?? '[]') as GeoHub[];
  const hub = hubs.find((h) => h.id === id);
  await Notifications.scheduleNotificationAsync({ content: { title: 'Bạn đang ở gần một Hub', body: `${hub?.name ?? 'MeetLore'}: xem ai muốn trao đổi hôm nay.`, data: { url: `/h/${id}` } }, trigger: null });
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify({ day: today, ids: [...sent, id] }));
});

export async function currentPosition() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) return null;
  const l = await Location.getCurrentPositionAsync({});
  return { lat: l.coords.latitude, lng: l.coords.longitude };
}
export const setDailyAlertLimit = (n: number) => AsyncStorage.setItem(LIMIT_KEY, String(n));
export async function enableHubAlerts(hubs: GeoHub[]) {
  const notify = await Notifications.requestPermissionsAsync();
  if (!notify.granted) return false;
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return false;
  const chosen = hubs.slice(0, IOS_REGION_LIMIT);
  await AsyncStorage.setItem(HUBS_KEY, JSON.stringify(chosen));
  await Location.startGeofencingAsync(TASK, chosen.map((h) => ({ identifier: h.id, latitude: h.lat, longitude: h.lng, radius: Math.max(150, h.radius), notifyOnEnter: true, notifyOnExit: false })));
  return true;
}
export async function disableHubAlerts() { if (await Location.hasStartedGeofencingAsync(TASK)) await Location.stopGeofencingAsync(TASK); }
