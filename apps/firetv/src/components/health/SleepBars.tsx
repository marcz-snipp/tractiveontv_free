import { View } from 'react-native';
import { TVText } from '@/components/tv';
import { formatMinutes } from './format';

export interface SleepRow {
  label: string;
  minutes: number;
  tone?: 'default' | 'muted';
}

export interface SleepBarsProps {
  rows: SleepRow[];
}

export function SleepBars({ rows }: SleepBarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <View className="gap-3">
      {rows.map((row) => {
        const w = Math.max(0, Math.min(1, row.minutes / max));
        return (
          <View key={row.label} className="gap-1">
            <View className="flex-row items-baseline justify-between">
              <TVText variant="caption" tone={row.tone === 'muted' ? 'muted' : 'default'}>
                {row.label}
              </TVText>
              <TVText variant="body" tone="default">
                {formatMinutes(row.minutes)}
              </TVText>
            </View>
            <View className="h-1.5 rounded-full bg-border overflow-hidden">
              <View
                className="h-full rounded-full bg-accent"
                style={{ width: `${w * 100}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
