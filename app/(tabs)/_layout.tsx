import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/lib/store';
import { c, f } from '../../src/theme';
import { Icon } from '../../src/ui';
export default function TabsLayout() {
  const { t, s } = useApp(); const insets = useSafeAreaInsets();
  if (!s.email) return <Redirect href="/" />;
  const icon = (name: string) => ({ color }: { color: unknown }) => <Icon name={name} color={String(color)} />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.son, tabBarInactiveTintColor: c.muted, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 64 + insets.bottom, paddingBottom: insets.bottom + 8, paddingTop: 6 }, tabBarLabelStyle: { fontFamily: f.medium, fontSize: 11 }, sceneStyle: { backgroundColor: c.paper } }}>
    <Tabs.Screen name="hubs" options={{ title: t('tabHubs'), tabBarIcon: icon('hub') }} />
    <Tabs.Screen name="connect" options={{ title: t('tabConnect'), tabBarIcon: icon('connect') }} />
    <Tabs.Screen name="journey" options={{ title: t('tabJourney'), tabBarIcon: icon('journey') }} />
    <Tabs.Screen name="messages" options={{ title: t('tabMessages'), tabBarIcon: icon('chat') }} />
    <Tabs.Screen name="me" options={{ title: t('tabMe'), tabBarIcon: icon('me') }} />
  </Tabs>;
}
