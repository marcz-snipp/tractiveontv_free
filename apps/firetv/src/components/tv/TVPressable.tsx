import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
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

const buttonStyles = cva(
  'flex-row items-center justify-center rounded-2xl border-2 overflow-hidden',
  {
    variants: {
      variant: {
        primary: 'bg-accent border-accent',
        secondary: 'bg-surface border-border',
        ghost: 'bg-transparent border-transparent',
        destructive: 'bg-danger border-danger',
        live: 'bg-live border-live',
      },
      size: {
        sm: 'h-12 px-4 gap-2',
        md: 'h-14 px-6 gap-3',
        lg: 'h-16 px-8 gap-3',
        xl: 'h-20 px-10 gap-4',
      },
      focused: {
        true: 'border-accent bg-accent/10',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'primary', focused: true, className: 'border-accent-strong bg-accent' },
      { variant: 'destructive', focused: true, className: 'border-accent bg-danger' },
      { variant: 'live', focused: true, className: 'border-accent bg-live' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', focused: false },
  },
);

export type TVPressableVariant = NonNullable<VariantProps<typeof buttonStyles>['variant']>;
export type TVPressableSize = NonNullable<VariantProps<typeof buttonStyles>['size']>;

export interface TVPressableState {
  focused: boolean;
  pressed: boolean;
}

export interface TVPressableProps
  extends Omit<PressableProps, 'children' | 'onPress' | 'style'>,
    VariantProps<typeof buttonStyles> {
  onPress: () => void;
  children: ReactNode | ((state: TVPressableState) => ReactNode);
  className?: string;
  focusedClassName?: string;
  hasTVPreferredFocus?: boolean;
}

export function TVPressable({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  className,
  focusedClassName,
  hasTVPreferredFocus,
  ...rest
}: TVPressableProps) {
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const startPulse = useCallback(() => {
    scale.value = withSequence(
      withSpring(tokens.focus.pulseHigh, { damping: 12, stiffness: 180 }),
      withRepeat(
        withTiming(tokens.focus.pulseLow, {
          duration: tokens.focus.pulseDuration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );
  }, [scale]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    startPulse();
  }, [startPulse]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
  }, [scale]);

  const handlePressIn = useCallback(() => {
    setPressed(true);
    scale.value = withTiming(tokens.focus.scalePress, { duration: tokens.durations.fast });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    if (focused) startPulse();
    else scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [focused, scale, startPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={animatedStyle}
      className={cn(
        buttonStyles({ variant, size, focused }),
        className,
        focused && focusedClassName,
      )}
    >
      {typeof children === 'function' ? children({ focused, pressed }) : children}
    </AnimatedPressable>
  );
}
