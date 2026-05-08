import {
  LOW_BATTERY_THRESHOLD,
  OFFLINE_THRESHOLD_MS,
  type TrackerDisplayStatus,
  type TrackerSnapshot,
} from '@tot/shared';
import type { TrackerComposite } from './types';

export function buildSnapshot(c: TrackerComposite): TrackerSnapshot {
  const pos = c.data.position;
  const hw = c.data.hardware;
  return {
    trackerId: c.pet.trackerId,
    trackableObjectId: c.pet.id,
    petName: c.pet.name,
    position: pos
      ? {
          lat: pos.latlong[0],
          lon: pos.latlong[1],
          accuracy: pos.pos_uncertainty ?? 0,
          sensor: pos.sensor_used,
          time: pos.time * 1000,
        }
      : null,
    battery: hw
      ? {
          level: hw.battery_level,
          charging: hw.charging_state === 'CHARGING',
        }
      : null,
    lastSeenAt: pos ? pos.time * 1000 : hw ? hw.time * 1000 : null,
    inPowerSavingZone: Boolean(hw?.power_saving_zone_id) || Boolean(pos?.power_saving_zone_id),
    liveActive: Boolean(c.data.liveCommand?.active),
    liveReconnecting: Boolean(c.data.liveCommand?.reconnecting),
  };
}

export function computeStatuses(snapshot: TrackerSnapshot): TrackerDisplayStatus[] {
  const out: TrackerDisplayStatus[] = [];
  const now = Date.now();
  const lastSeen = snapshot.lastSeenAt;

  if (lastSeen && now - lastSeen < OFFLINE_THRESHOLD_MS) {
    out.push('online');
  } else {
    out.push('offline');
  }

  if (snapshot.position) {
    if (snapshot.position.sensor === 'GPS') out.push('gps_fix');
    else if (
      snapshot.position.sensor === 'WIFI' ||
      snapshot.position.sensor === 'CELLULAR' ||
      snapshot.position.sensor === 'KNOWN_WIFI'
    ) {
      out.push('last_known_wifi_cell');
    }
  }

  if (snapshot.inPowerSavingZone) out.push('power_saving_zone');
  if (snapshot.battery?.charging) out.push('charging');
  if (snapshot.liveActive) out.push('live_active');
  else if (snapshot.liveReconnecting) out.push('live_reconnecting');
  if (snapshot.battery && snapshot.battery.level < LOW_BATTERY_THRESHOLD) {
    out.push('low_battery');
  }

  return out;
}
