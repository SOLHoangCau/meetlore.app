import { useFonts } from 'expo-font';
import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro';
import { Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../src/lib/nearby';
import { StoreProvider, useApp } from '../src/lib/store';
import { SponsorGate } from '../src/components/SponsorGate';
import { AppGuard } from '../src/components/AppGuard';
import { c } from '../src/theme';

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
