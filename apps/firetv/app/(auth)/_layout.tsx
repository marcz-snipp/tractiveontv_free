import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') return <Redirect href="/(app)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0b0f14' },
      }}
    />
  );
}
