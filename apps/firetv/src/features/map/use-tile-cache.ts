import { useMemo } from 'react';
import { hasMaptilerKey } from '@/maps/cache';
import type { LatLon } from '@/maps/projection';

interface TileCacheState {
  ready: boolean;
  missingKey: boolean;
  loading: boolean;
  error: string | null;
}

export function useTileCache(petId: string | null, homeBase: LatLon | null): TileCacheState {
  return useMemo(() => {
    const hasKey = hasMaptilerKey();
    if (!hasKey) {
      return { ready: false, missingKey: true, loading: false, error: null };
    }
    if (!petId || !homeBase) {
      return { ready: false, missingKey: false, loading: false, error: null };
    }
    return { ready: true, missingKey: false, loading: false, error: null };
  }, [petId, homeBase?.lat, homeBase?.lon]);
}
