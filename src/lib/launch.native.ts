// Lần mở app này đến từ thông báo hoặc liên kết hay không. Nếu có, bỏ qua màn hình nhà tài trợ để người dùng vào thẳng nội dung.
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

export async function openedDirectly(): Promise<boolean> {
  const [n, url] = await Promise.all([Notifications.getLastNotificationResponseAsync().catch(() => null), Linking.getInitialURL().catch(() => null)]);
  if (n) return true;
  if (!url) return false;
  const path = Linking.parse(url).path ?? '';
  return !!path && !['', 'hubs', '/'].includes(path);
}
