import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Settings } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { PetCarousel, type PetCardEntry } from '@/components/pets/PetCarousel';
import { tokens } from '@/design/tokens';

export interface MapHeaderProps {
  pets: PetCardEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMenu: () => void;
  preferredFocusFirst?: boolean;
}

export function MapHeader({ pets, selectedId, onSelect, onMenu, preferredFocusFirst }: MapHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between gap-6">
      <View className="flex-row items-center gap-6">
        <TVText variant="micro" tone="accent">
          {t('app.name')}
        </TVText>
        <PetCarousel
          pets={pets}
          selectedId={selectedId}
          onSelect={onSelect}
          preferredFocusFirst={preferredFocusFirst}
        />
      </View>
      <TVPressable variant="ghost" size="sm" onPress={onMenu}>
        <Settings color={tokens.colors.text.DEFAULT} size={22} strokeWidth={2.2} />
      </TVPressable>
    </View>
  );
}
