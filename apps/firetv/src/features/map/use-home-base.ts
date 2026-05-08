import { useMemo } from 'react';
import type { Geofence, PositionReport } from '@tot/shared';
import type { LatLon } from '@/maps/projection';
import { detectHomeBase, type HomeBase } from '@/maps/home-base';

export function useHomeBase(input: {
  petHomeLocation?: LatLon | null;
  geofences?: Geofence[];
  history?: LatLon[];
  currentPosition?: LatLon | null;
}): HomeBase | null {
  const petHomeKey = input.petHomeLocation
    ? `${input.petHomeLocation.lat},${input.petHomeLocation.lon}`
    : null;
  const currentKey = input.currentPosition
    ? `${input.currentPosition.lat.toFixed(4)},${input.currentPosition.lon.toFixed(4)}`
    : null;

  return useMemo(() => {
    if (input.petHomeLocation) {
      return { center: input.petHomeLocation, source: 'geofence' };
    }
    const positionsLast7d: PositionReport[] = (input.history ?? []).map((p) => ({
      _id: '',
      _type: 'device_pos_report',
      _version: '',
      time: 0,
      latlong: [p.lat, p.lon],
      sensor_used: 'GPS',
    }));
    return detectHomeBase({
      geofences: input.geofences,
      positionsLast7d,
      currentPosition: input.currentPosition ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petHomeKey, input.geofences, input.history, currentKey]);
}
