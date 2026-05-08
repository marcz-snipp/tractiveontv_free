import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { tokens } from '@/design/tokens';
import { PetAvatar } from '@/components/pets/PetAvatar';

export interface CatPinProps {
  size?: number;
  color?: string;
  pulse?: boolean;
  species?: string | null;
  avatarResourceId?: string | null;
}

export function CatPin({
  size = 56,
  color = tokens.colors.accent.DEFAULT,
  pulse = false,
  species,
  avatarResourceId,
}: CatPinProps) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (!pulse) {
      ringScale.value = 1;
      ringOpacity.value = 0;
      return;
    }
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.4, { duration: 1400 }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 0 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [pulse, ringOpacity, ringScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const innerSize = size - 6;
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
            ringStyle,
          ]}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <PetAvatar
          avatarResourceId={avatarResourceId}
          species={species}
          size={innerSize}
          iconColor={tokens.colors.text.inverse}
          iconStrokeWidth={2.4}
        />
      </View>
    </Animated.View>
  );
}
