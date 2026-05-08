import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { LucideProps } from 'lucide-react-native';
import { TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';
import { cn } from '@/lib/cn';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SidebarItemProps {
  icon: ComponentType<LucideProps>;
  label: string;
  onPress: () => void;
  active?: boolean;
  hasTVPreferredFocus?: boolean;
  tone?: 'default' | 'live' | 'danger';
  badgeText?: string;
  disabled?: boolean;
  iconSpin?: boolean;
  renderIcon?: (state: { color: string; focused: boolean; active: boolean }) => ReactNode;
}

export function SidebarItem({
  icon: Icon,
  label,
  onPress,
  active = false,
  hasTVPreferredFocus = false,
  tone = 'default',
  badgeText,
  disabled = false,
  iconSpin = false,
  renderIcon,
}: SidebarItemProps) {
  const [focused, setFocused] = useState(false);
  // `expanded` se replie automatiquement après 4s de focus continu pour ne pas masquer
  // la page courante. Le focus reste matérialisé par la bordure accent.
  const [expanded, setExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthAnim = useSharedValue(64);
  const scaleAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);

  useEffect(() => {
    if (iconSpin) {
      rotateAnim.value = 0;
      rotateAnim.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotateAnim);
      rotateAnim.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    }
  }, [iconSpin, rotateAnim]);

  useEffect(() => {
    widthAnim.value = withSpring(expanded ? 220 : 64, { damping: 18, stiffness: 200 });
  }, [expanded, widthAnim]);

  useEffect(
    () => () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    },
    [],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    setExpanded(true);
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
      collapseTimerRef.current = null;
    }, 4000);
    scaleAnim.value = withSequence(
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
  }, [scaleAnim]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setExpanded(false);
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    scaleAnim.value = withSpring(1, { damping: 14, stiffness: 200 });
  }, [scaleAnim]);

  const containerStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const iconColor =
    tone === 'live'
      ? tokens.colors.live.DEFAULT
      : tone === 'danger'
        ? focused
          ? tokens.colors.danger.DEFAULT
          : tokens.colors.danger.DEFAULT
        : focused || active
          ? tokens.colors.accent.strong
          : tokens.colors.text.muted;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      style={containerStyle}
      className={cn(
        'h-14 flex-row items-center gap-4 rounded-2xl border-2 pl-3 overflow-hidden',
        focused
          ? tone === 'danger'
            ? 'border-danger bg-bg-raised'
            : 'border-accent bg-bg-raised'
          : active
            ? 'border-accent/60 bg-accent/10'
            : 'border-transparent bg-transparent',
      )}
    >
      <View className="w-10 items-center justify-center">
        {renderIcon ? (
          renderIcon({ color: iconColor, focused, active })
        ) : (
          <Animated.View style={iconStyle}>
            <Icon color={iconColor} size={28} strokeWidth={2.2} />
          </Animated.View>
        )}
      </View>
      {expanded ? (
        <TVText
          variant="label"
          tone={tone === 'danger' ? 'danger' : focused || active ? 'accent' : 'default'}
        >
          {label}
        </TVText>
      ) : null}
      {badgeText && !expanded ? (
        <View className="absolute -top-1 right-2 rounded-full bg-live px-1.5 min-w-[16px] items-center justify-center">
          <TVText variant="micro" tone="default" className="text-[10px] leading-tight">
            {badgeText}
          </TVText>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
