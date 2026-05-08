import { Link, Stack } from 'expo-router';
import { TVPressable, TVScreen, TVText } from '@/components/tv';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <TVScreen className="items-center justify-center">
        <TVText variant="hero" className="mb-4">
          404
        </TVText>
        <TVText variant="body-lg" tone="muted" className="mb-8">
          Cet écran n&apos;existe pas.
        </TVText>
        <Link href="/" asChild>
          <TVPressable variant="primary" size="lg" onPress={() => undefined} hasTVPreferredFocus>
            <TVText variant="label" tone="inverse">
              Retour
            </TVText>
          </TVPressable>
        </Link>
      </TVScreen>
    </>
  );
}
