// Bản web: trình duyệt không báo được khi trang đóng. Chỉ lấy vị trí khi người dùng bấm.
import * as Location from 'expo-location';
export type GeoHub = { id: string; name: string; lat: number; lng: number; radius: number };
export async function currentPosition() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) return null;
  const l = await Location.getCurrentPositionAsync({});
  return { lat: l.coords.latitude, lng: l.coords.longitude };
}
export async function enableHubAlerts(_hubs: GeoHub[]) { return false; }
export async function disableHubAlerts() {}
export async function setDailyAlertLimit(_n: number) {}
