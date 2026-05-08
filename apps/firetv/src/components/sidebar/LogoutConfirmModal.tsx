import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { TVFocusGuide } from '@/components/tv/TVFocusGuide';
import { tokens } from '@/design/tokens';

export interface LogoutConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  willExit?: boolean;
}

export function LogoutConfirmModal({ onConfirm, onCancel, willExit }: LogoutConfirmModalProps) {
  const { t } = useTranslation();
  const keys = willExit
    ? { confirm: 'auth.logout.exit.confirm', hint: 'auth.logout.exit.confirmHint', submit: 'auth.logout.exit.submit' }
    : { confirm: 'auth.logout.confirm', hint: 'auth.logout.confirmHint', submit: 'auth.logout.submit' };
  return (
    <View
      className="absolute items-center justify-center"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11,15,20,0.85)',
        zIndex: 200,
      }}
    >
      <View
        className="rounded-3xl border-2 border-danger bg-bg-raised p-12 items-center"
        style={{ width: 560 }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-full bg-danger/20 mb-6">
          <LogOut color={tokens.colors.danger.DEFAULT} size={40} strokeWidth={2.4} />
        </View>
        <TVText variant="h2" tone="danger" className="mb-3 text-center">
          {t(keys.confirm)}
        </TVText>
        <TVText variant="body" tone="muted" className="mb-8 text-center">
          {t(keys.hint)}
        </TVText>
        <TVFocusGuide trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
          <View className="flex-row gap-3">
            <TVPressable
              variant="secondary"
              size="lg"
              onPress={onCancel}
              hasTVPreferredFocus
            >
              <TVText variant="label">{t('common.cancel')}</TVText>
            </TVPressable>
            <TVPressable variant="destructive" size="lg" onPress={onConfirm}>
              <LogOut color={tokens.colors.text.DEFAULT} size={20} strokeWidth={2.4} />
              <TVText variant="label">{t(keys.submit)}</TVText>
            </TVPressable>
          </View>
        </TVFocusGuide>
      </View>
    </View>
  );
}
