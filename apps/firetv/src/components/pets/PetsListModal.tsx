import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { TVFocusGuide } from '@/components/tv/TVFocusGuide';
import { tokens } from '@/design/tokens';
import { iconForSpecies } from '@/lib/pet-icon';
import type { PetEntry } from '@/features/map/types';

export interface PetsListModalProps {
  pets: PetEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PetsListModal({ pets, selectedId, onSelect }: PetsListModalProps) {
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
        zIndex: 200,
      }}
    >
      <View
        className="rounded-3xl border-2 border-accent bg-bg-raised px-8 py-6"
        style={{ width: 560 }}
      >
        <TVText variant="h3" className="mb-1 text-center">
          {t('pets.title')}
        </TVText>
        <TVText variant="caption" tone="muted" className="mb-5 text-center">
          {t('pets.available', { count: pets.length })}
        </TVText>

        <TVFocusGuide trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: 14, paddingVertical: 16, paddingHorizontal: 28 }}
            showsVerticalScrollIndicator={false}
          >
            {pets.map((pet, idx) => {
              const isSelected = pet.id === selectedId;
              const Icon = iconForSpecies(pet.petType);
              return (
                <TVPressable
                  key={pet.id}
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="md"
                  onPress={() => onSelect(pet.id)}
                  hasTVPreferredFocus={isSelected || (selectedId === null && idx === 0)}
                  className="w-full justify-start px-4"
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon
                      color={tokens.colors.text.DEFAULT}
                      size={22}
                      strokeWidth={2.2}
                    />
                  </View>
                  <TVText variant="label" className="flex-1 ml-2">
                    {pet.name}
                  </TVText>
                  {isSelected ? (
                    <Check
                      color={tokens.colors.text.DEFAULT}
                      size={20}
                      strokeWidth={2.6}
                    />
                  ) : null}
                </TVPressable>
              );
            })}
          </ScrollView>
        </TVFocusGuide>
      </View>
    </View>
  );
}
