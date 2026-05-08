import { useEffect, useRef, useState } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';
import distance from '@turf/distance';
import type { Geofence } from '@tot/shared';

interface CurrentPosition {
  lat: number;
  lon: number;
}

export interface GeofenceAlert {
  geofenceId: string;
  geofenceName: string;
  detectedAt: number;
}

interface InsideMap {
  [geofenceId: string]: boolean;
}

function isInsideGeofence(g: Geofence, pos: CurrentPosition): boolean {
  if (g.shape === 'CIRCLE') {
    const km = distance(
      turfPoint([pos.lon, pos.lat]),
      turfPoint([g.center[1], g.center[0]]),
      { units: 'kilometers' },
    );
    return km * 1000 <= g.radius;
  }
  if (g.shape === 'POLYGON' && g.polygon.length >= 3) {
    const ring = g.polygon.map(([lat, lon]) => [lon, lat]);
    if (
      ring[0]?.[0] !== ring[ring.length - 1]?.[0] ||
      ring[0]?.[1] !== ring[ring.length - 1]?.[1]
    ) {
      ring.push(ring[0]!);
    }
    const poly = turfPolygon([ring]);
    return booleanPointInPolygon(turfPoint([pos.lon, pos.lat]), poly);
  }
  return false;
}

export function useGeofenceAlert(
  position: CurrentPosition | null,
  geofences: Geofence[] | undefined,
): GeofenceAlert | null {
  const [alert, setAlert] = useState<GeofenceAlert | null>(null);
  const prevInsideRef = useRef<InsideMap>({});

  useEffect(() => {
    if (!position || !geofences || geofences.length === 0) return;
    const next: InsideMap = {};
    let alertCandidate: GeofenceAlert | null = null;
    for (const g of geofences) {
      if (!g.active) continue;
      const inside = isInsideGeofence(g, position);
      next[g._id] = inside;
      const wasInside = prevInsideRef.current[g._id];
      if (wasInside === true && inside === false) {
        alertCandidate = { geofenceId: g._id, geofenceName: g.name, detectedAt: Date.now() };
      }
    }
    prevInsideRef.current = next;
    if (alertCandidate) setAlert(alertCandidate);
  }, [position, geofences]);

  return alert;
}
