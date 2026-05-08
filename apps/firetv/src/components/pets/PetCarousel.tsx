import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TVText } from '@/components/tv';
import { TVFocusGuide } from '@/components/tv/TVFocusGuide';
import { tokens } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { PetAvatar } from '@/components/pets/PetAvatar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PetCardEntry {
  id: string;
  name: string;
  avatarResourceId?: string | null;
  online: boolean;
  petType?: string | null;
}

interface PetCardProps {
  pet: PetCardEntry;
  selected: boolean;
  onSelect: () => void;
  hasTVPreferredFocus?: boolean;
}

function PetCard({
  pet,
  selected,
  onSelect,
  hasTVPreferredFocus,
}: PetCardProps) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    scale.value = withSequence(
      withSpring(tokens.focus.pulseHigh, { damping: 14, stiffness: 200 }),
      withRepeat(
        withTiming(tokens.focus.pulseLow, {
          duration: tokens.focus.pulseDuration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );
    glow.value = withTiming(1, { duration: tokens.durations.base });
  }, [glow, scale]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    glow.value = withTiming(0, { duration: tokens.durations.base });
  }, [glow, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: tokens.colors.focus.DEFAULT,
    shadowOpacity: glow.value * 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: glow.value * 6,
  }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={animatedStyle}
      className={cn(
        'flex-row items-center gap-3 rounded-full border-2 pl-2 pr-5 py-2 bg-surface',
        focused
          ? 'border-focus'
          : selected
            ? 'border-accent'
            : 'border-border',
      )}
    >
      <View
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full overflow-hidden',
          selected ? 'bg-accent/30' : 'bg-bg-raised',
        )}
      >
        <PetAvatar
          avatarResourceId={pet.avatarResourceId}
          species={pet.petType}
          size={36}
          iconColor={selected ? tokens.colors.accent.strong : tokens.colors.text.muted}
        />
      </View>
      <TVText variant="label" tone={selected ? 'default' : 'muted'}>
        {pet.name}
      </TVText>
      {pet.online ? <View className="h-2.5 w-2.5 rounded-full bg-success" /> : null}
    </AnimatedPressable>
  );
}

export interface PetCarouselProps {
  pets: PetCardEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  preferredFocusFirst?: boolean;
}

export function PetCarousel({
  pets,
  selectedId,
  onSelect,
  preferredFocusFirst = false,
}: PetCarouselProps) {
  if (pets.length === 0) return null;
  return (
    <TVFocusGuide trapFocusLeft trapFocusRight>
      <View className="flex-row items-center gap-2">
        {pets.map((pet, idx) => (
          <PetCard
            key={pet.id}
            pet={pet}
            selected={pet.id === selectedId}
            onSelect={() => onSelect(pet.id)}
            hasTVPreferredFocus={preferredFocusFirst && idx === 0}
          />
        ))}
      </View>
    </TVFocusGuide>
  );
}
