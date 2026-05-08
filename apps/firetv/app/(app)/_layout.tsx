import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SidebarModals } from '@/components/sidebar/SidebarModals';
import { useBindLiveModeRefresh } from '@/lib/live-mode-store';

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  useBindLiveModeRefresh();

  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />;
  if (status === 'booting') return null;

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1 flex-row">
        <View style={{ width: 88 }} className="z-10">
          <Sidebar />
        </View>
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#0b0f14' },
            }}
          />
        </View>
      </View>
      <SidebarModals />
    </View>
  );
}
