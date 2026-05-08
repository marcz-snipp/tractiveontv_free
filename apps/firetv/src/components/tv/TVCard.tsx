import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { tokens } from '@/design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const cardStyles = cva('rounded-2xl border', {
  variants: {
    tone: {
      surface: 'bg-surface border-border',
      raised: 'bg-bg-raised border-border-strong',
      ghost: 'bg-transparent border-border',
      accent: 'bg-accent-soft border-accent',
    },
    pad: {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    },
    focused: {
      true: 'border-focus',
      false: '',
    },
  },
  defaultVariants: { tone: 'surface', pad: 'md', focused: false },
});

interface BaseProps extends VariantProps<typeof cardStyles> {
  className?: string;
  children?: ReactNode;
}

export interface TVCardProps extends Omit<ViewProps, 'children' | 'style'>, BaseProps {
  onPress?: undefined;
}

export interface TVCardPressableProps extends BaseProps {
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

export function TVCard({ tone, pad, className, children, ...rest }: TVCardProps) {
  return (
    <View className={cn(cardStyles({ tone, pad, focused: false }), className)} {...rest}>
      {children}
    </View>
  );
}

export function TVCardPressable({
  onPress,
  tone,
  pad,
  className,
  children,
  hasTVPreferredFocus,
}: TVCardPressableProps) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    scale.value = withSequence(
      withSpring(tokens.focus.pulseHigh, { damping: 14, stiffness: 180 }),
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
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: glow.value * 10,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={animatedStyle}
      className={cn(cardStyles({ tone, pad, focused }), className)}
    >
      {children}
    </AnimatedPressable>
  );
}
