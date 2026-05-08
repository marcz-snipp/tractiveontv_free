import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Home } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export interface PSZBlockedBannerProps {
  petName: string;
  onDismiss: () => void;
}

export function PSZBlockedBanner({ petName, onDismiss }: PSZBlockedBannerProps) {
  const { t } = useTranslation();
  return (
    <View
      className="absolute items-center justify-center"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11,15,20,0.85)',
        zIndex: 100,
      }}
    >
      <View
        className="rounded-3xl border-2 border-warning bg-bg-raised p-12 items-center"
        style={{ width: 640 }}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-warning/20 mb-6">
          <Home color={tokens.colors.warning.DEFAULT} size={48} strokeWidth={2.4} />
        </View>
        <TVText variant="h2" tone="warning" className="mb-3 text-center">
          {t('status.power_saving_zone')}
        </TVText>
        <TVText variant="body" tone="muted" className="mb-8 text-center">
          {t('map.liveBlockedPSZ', { name: petName })}
        </TVText>
        <TVPressable variant="primary" size="lg" onPress={onDismiss} hasTVPreferredFocus>
          <TVText variant="label">
            {t('common.ok')}
          </TVText>
        </TVPressable>
      </View>
    </View>
  );
}
