import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Battery, BatteryCharging, BatteryLow } from 'lucide-react-native';
import { TVCard, TVText } from '@/components/tv';
import { StatusBadge } from './StatusBadge';
import { dayjs } from '@/lib/dayjs';
import { tokens } from '@/design/tokens';
import type { SensorUsed, TrackerDisplayStatus, TrackerSnapshot } from '@tot/shared';

export interface StatusPanelProps {
  snapshot: TrackerSnapshot;
  statuses: TrackerDisplayStatus[];
}

function batteryIcon(level: number, charging: boolean) {
  const size = 22;
  const stroke = 2.2;
  if (charging) return <BatteryCharging color={tokens.colors.success.DEFAULT} size={size} strokeWidth={stroke} />;
  if (level < 20) return <BatteryLow color={tokens.colors.warning.DEFAULT} size={size} strokeWidth={stroke} />;
  return <Battery color={tokens.colors.text.DEFAULT} size={size} strokeWidth={stroke} />;
}

export function StatusPanel({ snapshot, statuses }: StatusPanelProps) {
  const { t } = useTranslation();
  const lastSeen = snapshot.lastSeenAt ? dayjs(snapshot.lastSeenAt).fromNow() : '—';
  const sensorLabel = snapshot.position
    ? t(`map.sensor.${snapshot.position.sensor as SensorUsed}` as const, {
        defaultValue: snapshot.position.sensor,
      })
    : null;

  return (
    <TVCard tone="surface" pad="md" className="flex-row items-center gap-5">
      <View className="flex-row items-baseline gap-3">
        <TVText variant="h3">{snapshot.petName}</TVText>
        <TVText variant="caption" tone="muted">
          {snapshot.trackerId}
        </TVText>
      </View>

      <View className="h-10 w-px bg-border-strong" />

      {snapshot.battery ? (
        <View className="flex-row items-center gap-2">
          {batteryIcon(snapshot.battery.level, snapshot.battery.charging)}
          <TVText variant="label">{snapshot.battery.level}%</TVText>
        </View>
      ) : null}

      {sensorLabel ? (
        <TVText variant="caption" tone="muted">
          {sensorLabel}
        </TVText>
      ) : null}

      <TVText variant="caption" tone="muted">
        {t('map.lastSeen', { time: lastSeen })}
      </TVText>

      {statuses.length > 0 ? (
        <View className="flex-row items-center gap-2 ml-2">
          {statuses.slice(0, 4).map((s) => (
            <StatusBadge key={s} status={s} label={t(`status.${s}` as const)} compact />
          ))}
        </View>
      ) : null}
    </TVCard>
  );
}
