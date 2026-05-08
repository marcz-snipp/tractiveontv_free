import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export interface ActivityRingProps {
  active: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export function ActivityRing({
  active,
  goal,
  size = 168,
  strokeWidth = 14,
}: ActivityRingProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = Math.max(0, Math.min(1, active / safeGoal));
  const pct = Math.round(ratio * 100);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tokens.colors.border.strong}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tokens.colors.accent.DEFAULT}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <TVText variant="h3" tone="accent">
          {pct}%
        </TVText>
      </View>
    </View>
  );
}
