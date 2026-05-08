import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { fetchPositions } from './api';
import type { LatLon } from '@/maps/projection';
import type { SensorUsed } from '@tot/shared';

export interface PositionPointFlat {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  sensor: SensorUsed;
}

interface PositionsResult {
  points: PositionPointFlat[];
  trail: LatLon[];
}

interface RawPositionPoint {
  time?: number;
  latlong?: [number, number];
  pos_uncertainty?: number;
  sensor_used?: SensorUsed | string;
}

function flatten(rawData: unknown): PositionPointFlat[] {
  const out: PositionPointFlat[] = [];
  if (!Array.isArray(rawData)) return out;
  for (const seg of rawData) {
    if (!Array.isArray(seg)) continue;
    for (const item of seg) {
      const p = item as RawPositionPoint | null;
      if (!p || typeof p !== 'object') continue;
      const ll = p.latlong;
      if (!Array.isArray(ll) || ll.length < 2) continue;
      const lat = Number(ll[0]);
      const lon = Number(ll[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      out.push({
        lat,
        lon,
        accuracy: Number(p.pos_uncertainty ?? 0),
        timestamp: Number(p.time ?? 0),
        sensor: (p.sensor_used as SensorUsed) ?? 'GPS',
      });
    }
  }
  out.sort((a, b) => a.timestamp - b.timestamp);
  return out;
}

export function usePositions(trackerId: string | null, hours = 6) {
  const session = useAuthStore((s) => s.session);
  return useQuery<PositionsResult>({
    queryKey: ['positions', session?.userId, trackerId, hours],
    enabled: !!session && !!trackerId,
    queryFn: async ({ signal }) => {
      if (!session || !trackerId) throw new Error('Missing session or tracker');
      const now = Math.floor(Date.now() / 1000);
      const from = now - hours * 3600;
      const raw = await fetchPositions(session, trackerId, from, now, signal);
      const points = flatten(raw);
      return {
        points,
        trail: points.map((p) => ({ lat: p.lat, lon: p.lon })),
      };
    },
    staleTime: 60_000,
  });
}
