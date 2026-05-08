import '@/lib/i18n';
import '../global.css';

import { useEffect } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/lib/auth-store';
import { useBootstrapSession } from '@/features/auth/use-bootstrap-session';

void SplashScreen.preventAutoHideAsync();

function Bootstrap() {
  useBootstrapSession();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== 'booting') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" hidden />
      <Bootstrap />
    </AppProviders>
  );
}
