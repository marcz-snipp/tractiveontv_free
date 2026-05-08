export type TrackerDisplayStatus =
  | 'online'
  | 'offline'
  | 'gps_fix'
  | 'last_known_wifi_cell'
  | 'power_saving_zone'
  | 'charging'
  | 'live_active'
  | 'live_reconnecting'
  | 'low_battery';

export interface TrackerSnapshot {
  trackerId: string;
  trackableObjectId: string;
  petName: string;
  position: {
    lat: number;
    lon: number;
    accuracy: number;
    sensor: string;
    time: number;
  } | null;
  battery: {
    level: number;
    charging: boolean;
  } | null;
  lastSeenAt: number | null;
  inPowerSavingZone: boolean;
  liveActive: boolean;
  liveReconnecting: boolean;
}
