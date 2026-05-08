import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  BatteryCharging,
  BatteryWarning,
  Home,
  MapPin,
  Radio,
  RotateCw,
  Wifi,
  WifiOff,
  type LucideProps,
} from 'lucide-react-native';
import { TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';
import type { TrackerDisplayStatus } from '@tot/shared';

interface BadgeMeta {
  icon: ComponentType<LucideProps>;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'live' | 'muted';
}

const META: Record<TrackerDisplayStatus, BadgeMeta> = {
  online: { icon: Wifi, tone: 'success' },
  offline: { icon: WifiOff, tone: 'muted' },
  gps_fix: { icon: MapPin, tone: 'info' },
  last_known_wifi_cell: { icon: Radio, tone: 'muted' },
  power_saving_zone: { icon: Home, tone: 'info' },
  charging: { icon: BatteryCharging, tone: 'success' },
  live_active: { icon: Radio, tone: 'live' },
  live_reconnecting: { icon: RotateCw, tone: 'warning' },
  low_battery: { icon: BatteryWarning, tone: 'warning' },
};

const TONE_BG: Record<BadgeMeta['tone'], string> = {
  success: 'bg-success/15 border border-success/40',
  warning: 'bg-warning/15 border border-warning/40',
  danger: 'bg-danger/15 border border-danger/40',
  info: 'bg-info/15 border border-info/40',
  live: 'bg-live/20 border border-live/50',
  muted: 'bg-surface border border-border',
};

const TONE_COLOR: Record<BadgeMeta['tone'], string> = {
  success: tokens.colors.success.DEFAULT,
  warning: tokens.colors.warning.DEFAULT,
  danger: tokens.colors.danger.DEFAULT,
  info: tokens.colors.info.DEFAULT,
  live: tokens.colors.live.DEFAULT,
  muted: tokens.colors.text.muted,
};

export interface StatusBadgeProps {
  status: TrackerDisplayStatus;
  label: string;
  compact?: boolean;
}

export function StatusBadge({ status, label, compact = false }: StatusBadgeProps) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <View
      className={`flex-row items-center gap-2 rounded-full px-3 py-2 ${TONE_BG[meta.tone]}`}
    >
      <Icon color={TONE_COLOR[meta.tone]} size={compact ? 18 : 22} strokeWidth={2.4} />
      {!compact ? (
        <TVText variant="caption" className="text-text">
          {label}
        </TVText>
      ) : null}
    </View>
  );
}
