import { View } from 'react-native';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  MapPin,
  Radio,
  Satellite,
  Wifi,
} from 'lucide-react-native';
import { TVText } from '@/components/tv';
import { dayjs } from '@/lib/dayjs';
import { tokens } from '@/design/tokens';
import { useLiveModeStore } from '@/lib/live-mode-store';
import { LOW_BATTERY_THRESHOLD, type TrackerSnapshot } from '@tot/shared';

export interface CompactPetCardProps {
  snapshot: TrackerSnapshot;
}

function formatLat(lat: number): string {
  const hemi = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(5)}° ${hemi}`;
}

function formatLon(lon: number): string {
  const hemi = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lon).toFixed(5)}° ${hemi}`;
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CompactPetCard({ snapshot }: CompactPetCardProps) {
  const pos = snapshot.position;
  const fetchedAt = pos?.time ?? snapshot.lastSeenAt;
  const dateLabel = fetchedAt ? dayjs(fetchedAt).format('D MMM YYYY · HH:mm:ss') : '—';
  const liveStatus = useLiveModeStore((s) => s.status);
  const liveRemaining = useLiveModeStore((s) => s.remainingSec);
  const showLive = liveStatus === 'active' && liveRemaining != null;

  const inWifi =
    snapshot.inPowerSavingZone || pos?.sensor === 'KNOWN_WIFI' || pos?.sensor === 'WIFI';
  const SignalIcon = inWifi ? Wifi : Satellite;
  const signalColor = inWifi ? tokens.colors.info.DEFAULT : tokens.colors.accent.strong;

  const battery = snapshot.battery;
  const batteryLow = battery ? battery.level < LOW_BATTERY_THRESHOLD : false;
  const BatteryIcon = battery?.charging
    ? BatteryCharging
    : batteryLow
      ? BatteryWarning
      : Battery;
  const batteryColor = battery?.charging
    ? tokens.colors.success.DEFAULT
    : batteryLow
      ? tokens.colors.danger.DEFAULT
      : tokens.colors.text.muted;
  const batteryTone: 'success' | 'danger' | 'muted' = battery?.charging
    ? 'success'
    : batteryLow
      ? 'danger'
      : 'muted';

  return (
    <View
      className="rounded-2xl border border-border-strong bg-bg-sunken/85 px-5 py-3 flex-row items-center gap-3"
      style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
    >
      <View className="items-center gap-2">
        <MapPin color={tokens.colors.accent.strong} size={20} strokeWidth={2.4} />
        <SignalIcon color={signalColor} size={20} strokeWidth={2.4} />
      </View>
      <View>
        <TVText variant="label" className="font-mono">
          {pos ? `${formatLat(pos.lat)}, ${formatLon(pos.lon)}` : 'Position inconnue'}
        </TVText>
        <View className="flex-row items-center justify-between gap-3">
          <TVText variant="caption" tone="muted">
            {dateLabel}
          </TVText>
          {battery ? (
            <View className="flex-row items-center gap-1.5">
              <BatteryIcon color={batteryColor} size={16} strokeWidth={2.4} />
              <TVText variant="caption" tone={batteryTone} className="font-mono">
                {battery.level}%
              </TVText>
            </View>
          ) : null}
        </View>
      </View>
      {showLive ? (
        <View
          className="ml-2 flex-row items-center gap-1.5 rounded-full bg-live/20 border border-live px-2.5 py-1"
        >
          <Radio color={tokens.colors.live.DEFAULT} size={14} strokeWidth={2.6} />
          <TVText variant="caption" tone="live" className="font-mono font-semibold">
            {formatRemaining(liveRemaining)}
          </TVText>
        </View>
      ) : null}
    </View>
  );
}
