import { useQuery } from '@tanstack/react-query';
import type { Geofence } from '@tot/shared';
import { useAuthStore } from '@/lib/auth-store';
import { fetchGeofences } from './api';

export function useGeofences(trackerId: string | null) {
  const session = useAuthStore((s) => s.session);
  return useQuery<Geofence[]>({
    queryKey: ['geofences', session?.userId, trackerId],
    enabled: !!session && !!trackerId,
    queryFn: async ({ signal }) => {
      if (!session || !trackerId) throw new Error('Missing session or tracker');
      return fetchGeofences(session, trackerId, signal);
    },
    staleTime: 5 * 60_000,
  });
}
