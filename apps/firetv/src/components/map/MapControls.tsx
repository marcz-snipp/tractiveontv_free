import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { History, Radio, RefreshCw, Square } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { TVFocusGuide } from '@/components/tv/TVFocusGuide';
import { tokens } from '@/design/tokens';

export interface MapControlsProps {
  liveActive: boolean;
  liveAvailable: boolean;
  liveRemainingSec: number | null;
  onRefresh: () => void;
  onToggleLive: () => void;
  onHistory: () => void;
  refreshing?: boolean;
  liveBusy?: boolean;
}

export function MapControls({
  liveActive,
  liveAvailable,
  liveRemainingSec,
  onRefresh,
  onToggleLive,
  onHistory,
  refreshing = false,
  liveBusy = false,
}: MapControlsProps) {
  const { t } = useTranslation();
  return (
    <TVFocusGuide trapFocusLeft trapFocusRight>
      <View className="flex-row gap-2">
        <TVPressable variant="secondary" size="md" onPress={onRefresh} disabled={refreshing}>
          <RefreshCw color={tokens.colors.text.DEFAULT} size={20} strokeWidth={2.4} />
          <TVText variant="label">{t('map.refresh')}</TVText>
        </TVPressable>

        <TVPressable
          variant={liveActive ? 'live' : 'primary'}
          size="md"
          onPress={onToggleLive}
          disabled={!liveAvailable || liveBusy}
        >
          {liveActive ? (
            <Square color={tokens.colors.text.DEFAULT} size={20} strokeWidth={2.6} />
          ) : (
            <Radio color={tokens.colors.text.inverse} size={20} strokeWidth={2.4} />
          )}
          <TVText variant="label" tone={liveActive ? 'default' : 'inverse'}>
            {liveActive
              ? t('map.liveActive', { remaining: liveRemainingSec ?? 0 })
              : t('map.live')}
          </TVText>
        </TVPressable>

        <TVPressable variant="secondary" size="md" onPress={onHistory}>
          <History color={tokens.colors.text.DEFAULT} size={20} strokeWidth={2.4} />
          <TVText variant="label">{t('map.history')}</TVText>
        </TVPressable>
      </View>
    </TVFocusGuide>
  );
}
