import type { Geofence, PositionReport } from '@tot/shared';
import type { LatLon } from './projection';

export type HomeBaseSource = 'geofence' | 'power_saving_zone' | 'centroid' | 'current';

export interface HomeBase {
  center: LatLon;
  source: HomeBaseSource;
}

function geofenceCenter(g: Geofence): LatLon | null {
  if (g.shape === 'CIRCLE') return { lat: g.center[0], lon: g.center[1] };
  if (g.shape === 'POLYGON' && g.polygon.length >= 3) {
    let lat = 0;
    let lon = 0;
    for (const [la, lo] of g.polygon) {
      lat += la;
      lon += lo;
    }
    return { lat: lat / g.polygon.length, lon: lon / g.polygon.length };
  }
  return null;
}

const HOME_NAME_RE = /(home|maison|domicile|casa|hogar|haus|huis)/i;

export function findHomeGeofenceId(geofences?: Geofence[]): string | null {
  if (!geofences || geofences.length === 0) return null;
  const named = geofences.find((g) => HOME_NAME_RE.test(g.name ?? ''));
  if (named) return named._id;
  return null;
}

export function detectHomeBase(input: {
  geofences?: Geofence[];
  positionsLast7d?: PositionReport[];
  currentPosition?: LatLon;
  powerSavingZoneCenter?: LatLon;
}): HomeBase | null {
  const namedHome = input.geofences?.find((g) => HOME_NAME_RE.test(g.name ?? ''));
  if (namedHome) {
    const center = geofenceCenter(namedHome);
    if (center) return { center, source: 'geofence' };
  }

  if (input.powerSavingZoneCenter) {
    return { center: input.powerSavingZoneCenter, source: 'power_saving_zone' };
  }

  if (input.geofences && input.geofences.length > 0) {
    for (const g of input.geofences) {
      const c = geofenceCenter(g);
      if (c) return { center: c, source: 'geofence' };
    }
  }

  if (input.positionsLast7d && input.positionsLast7d.length > 0) {
    let lat = 0;
    let lon = 0;
    let n = 0;
    for (const p of input.positionsLast7d) {
      lat += p.latlong[0];
      lon += p.latlong[1];
      n += 1;
    }
    if (n > 0) {
      return { center: { lat: lat / n, lon: lon / n }, source: 'centroid' };
    }
  }

  if (input.currentPosition) {
    return { center: input.currentPosition, source: 'current' };
  }

  return null;
}
