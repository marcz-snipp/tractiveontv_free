import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { TVScreen, TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') return <Redirect href="/(app)" />;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />;

  return (
    <TVScreen className="items-center justify-center">
      <View className="items-center gap-6">
        <ActivityIndicator size="large" color={tokens.colors.accent.DEFAULT} />
        <TVText variant="caption" tone="muted">
          TOT
        </TVText>
      </View>
    </TVScreen>
  );
}
