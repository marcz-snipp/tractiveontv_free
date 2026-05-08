import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { TVText } from './TVText';
import { cn } from '@/lib/cn';
import { tokens } from '@/design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TVCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  hasTVPreferredFocus?: boolean;
  className?: string;
}

export function TVCheckbox({
  checked,
  onChange,
  label,
  hint,
  hasTVPreferredFocus,
  className,
}: TVCheckboxProps) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    scale.value = withSpring(1.04, { damping: 14, stiffness: 200 });
    glow.value = withTiming(1, { duration: tokens.durations.base });
  }, [glow, scale]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    glow.value = withTiming(0, { duration: tokens.durations.base });
  }, [glow, scale]);

  const handlePress = useCallback(() => onChange(!checked), [checked, onChange]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: tokens.colors.focus.DEFAULT,
    shadowOpacity: glow.value * 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: glow.value * 6,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={animatedStyle}
      className={cn(
        'flex-row items-start gap-4 rounded-xl border-2 p-4 bg-surface',
        focused ? 'border-focus' : 'border-border',
        className,
      )}
    >
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-md border-2 mt-1',
          checked ? 'bg-accent border-accent' : 'bg-bg-raised border-border-strong',
        )}
      >
        {checked ? <Check color={tokens.colors.text.inverse} size={20} strokeWidth={3} /> : null}
      </View>
      <View className="flex-1">
        <TVText variant="label">{label}</TVText>
        {hint ? (
          <TVText variant="caption" tone="muted" className="mt-1">
            {hint}
          </TVText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
