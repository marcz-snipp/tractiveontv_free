import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';
import { TVCard, TVPressable, TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export interface GeofenceAlertBannerProps {
  petName: string;
  zoneName: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function GeofenceAlertBanner({
  petName,
  zoneName,
  onDismiss,
  autoDismissMs = 12_000,
}: GeofenceAlertBannerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const id = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(id);
  }, [autoDismissMs, onDismiss]);

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(220)}>
      <TVCard tone="raised" pad="lg" className="border-danger/60 max-w-[720px]">
        <View className="flex-row items-start gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-danger/25">
            <AlertTriangle color={tokens.colors.danger.DEFAULT} size={28} strokeWidth={2.4} />
          </View>
          <View className="flex-1">
            <TVText variant="h3" tone="danger" className="mb-1">
              {t('geofence.outOfZone', { name: petName, zone: zoneName })}
            </TVText>
            <TVPressable variant="secondary" size="md" onPress={onDismiss} hasTVPreferredFocus>
              <TVText variant="label">{t('common.ok')}</TVText>
            </TVPressable>
          </View>
        </View>
      </TVCard>
    </Animated.View>
  );
}
