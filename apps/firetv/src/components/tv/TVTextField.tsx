import { useCallback, useState, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TVText } from './TVText';
import { cn } from '@/lib/cn';
import { tokens } from '@/design/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface TVTextFieldProps
  extends Omit<TextInputProps, 'style' | 'onFocus' | 'onBlur' | 'placeholderTextColor'> {
  label: string;
  error?: string;
  hint?: string;
  hasTVPreferredFocus?: boolean;
  inputRef?: Ref<TextInput>;
  className?: string;
}

export function TVTextField({
  label,
  error,
  hint,
  hasTVPreferredFocus,
  inputRef,
  className,
  onSubmitEditing,
  ...inputProps
}: TVTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    scale.value = withSpring(1.02, { damping: 14, stiffness: 200 });
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
    shadowOpacity: glow.value * 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: glow.value * 6,
  }));

  return (
    <View className={cn('w-full', className)}>
      <TVText variant="micro" className="mb-2">
        {label}
      </TVText>
      <AnimatedTextInput
        ref={inputRef}
        {...inputProps}
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={handleBlur}
        hasTVPreferredFocus={hasTVPreferredFocus}
        placeholderTextColor={tokens.colors.text.subtle}
        selectionColor={tokens.colors.accent.DEFAULT}
        style={animatedStyle}
        className={cn(
          'h-16 rounded-xl border-2 px-5 text-body text-text bg-bg-raised',
          focused ? 'border-focus' : error ? 'border-danger' : 'border-border-strong',
        )}
      />
      {error ? (
        <TVText variant="caption" tone="danger" className="mt-2">
          {error}
        </TVText>
      ) : hint ? (
        <TVText variant="caption" tone="muted" className="mt-2">
          {hint}
        </TVText>
      ) : null}
    </View>
  );
}
