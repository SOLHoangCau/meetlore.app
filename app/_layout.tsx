import { useFonts } from 'expo-font';
import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro';
import { Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/lib/nearby';
import { StoreProvider, useApp } from '../src/lib/store';
import { SponsorGate } from '../src/components/SponsorGate';
import { AppGuard } from '../src/components/AppGuard';
import { c } from '../src/theme';

// Trình duyệt trên điện thoại: 100% chiều cao tính cả phần nằm dưới thanh công cụ của trình duyệt, nên nút cuối trang bị che.
// Dùng chiều cao vùng nhìn thấy (dvh) để nút "Tiếp tục" và thanh tab luôn hiện.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('meetlore-vh')) {
  const st = document.createElement('style'); st.id = 'meetlore-vh';
  st.textContent = 'html,body,#root{height:100%;height:100dvh;}body{overflow:hidden;}';
  document.head.appendChild(st);
}

function Gate() {
  const { ready } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.paper }} />;
  return <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }} /><SponsorGate /><AppGuard /></View>;
}
export default function Root() {
  const [loaded] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, Lora_600SemiBold, Lora_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.paper }} />;
  return <SafeAreaProvider><StoreProvider><StatusBar style="dark" /><Gate /></StoreProvider></SafeAreaProvider>;
}
