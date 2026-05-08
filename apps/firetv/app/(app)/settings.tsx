import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Languages, Volume2, VolumeX } from 'lucide-react-native';
import { TVCard, TVPressable, TVScreen, TVText } from '@/components/tv';
import { TVFocusColumn } from '@/components/tv/TVFocusRow';
import { changeLocale } from '@/lib/i18n';
import { prefs } from '@/lib/storage';
import { tokens } from '@/design/tokens';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@tot/shared';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  'fr-FR': 'Français',
  'en-US': 'English',
  'es-ES': 'Español',
  'it-IT': 'Italiano',
  'de-DE': 'Deutsch',
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const [locale, setLocale] = useState<SupportedLocale>(
    () => (i18n.language as SupportedLocale) ?? 'fr-FR',
  );
  const [sound, setSound] = useState<boolean>(() => prefs.getGeofenceSound());

  const onPickLocale = async (next: SupportedLocale) => {
    setLocale(next);
    await changeLocale(next);
  };

  const onToggleSound = () => {
    const next = !sound;
    setSound(next);
    prefs.setGeofenceSound(next);
  };

  return (
    <TVScreen fullBleed className="px-12 pt-10 pb-10">
      <TVText variant="h1" className="mb-6">
        {t('settings.title')}
      </TVText>

      <View className="flex-1 flex-row gap-6 items-stretch">
        <TVCard tone="raised" pad="lg" className="flex-1">
          <View className="flex-row items-center gap-3 mb-6">
            <Languages color={tokens.colors.accent.strong} size={26} strokeWidth={2.2} />
            <TVText variant="h3">{t('settings.language')}</TVText>
          </View>
          <TVFocusColumn gap="sm">
            {SUPPORTED_LOCALES.map((l, idx) => (
              <TVPressable
                key={l}
                variant={l === locale ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => onPickLocale(l)}
                hasTVPreferredFocus={idx === 0}
              >
                {({ focused }) => (
                  <TVText
                    variant="label"
                    tone={focused ? 'default' : l === locale ? 'inverse' : 'default'}
                  >
                    {LOCALE_LABELS[l]}
                  </TVText>
                )}
              </TVPressable>
            ))}
          </TVFocusColumn>
        </TVCard>

        <TVCard tone="raised" pad="lg" className="flex-1">
          <View className="flex-row items-center gap-3 mb-6">
            {sound ? (
              <Volume2 color={tokens.colors.accent.strong} size={26} strokeWidth={2.2} />
            ) : (
              <VolumeX color={tokens.colors.text.muted} size={26} strokeWidth={2.2} />
            )}
            <TVText variant="h3">{t('settings.zoneSound.title')}</TVText>
          </View>
          <TVText variant="body" tone="muted" className="mb-6">
            {t('settings.zoneSound.description')}
          </TVText>
          <TVPressable
            variant={sound ? 'primary' : 'secondary'}
            size="md"
            onPress={onToggleSound}
          >
            {({ focused }) => (
              <TVText
                variant="label"
                tone={focused ? 'default' : sound ? 'inverse' : 'default'}
              >
                {sound ? t('common.yes') : t('common.no')}
              </TVText>
            )}
          </TVPressable>
        </TVCard>
      </View>
    </TVScreen>
  );
}
