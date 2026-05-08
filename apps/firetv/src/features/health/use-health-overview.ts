import { useQuery } from '@tanstack/react-query';
import type { HealthOverview } from '@tot/shared';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { fetchHealthOverview } from './api';

const REFETCH_MS = 5 * 60_000;
const STALE_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 5 * 60_000;

export function useHealthOverview(petId: string | null) {
  const session = useAuthStore((s) => s.session);
  return useQuery<HealthOverview, Error>({
    queryKey: ['health', session?.userId, petId],
    enabled: !!session && !!petId,
    queryFn: async ({ signal }) => {
      if (!session || !petId) throw new Error('Missing session or petId');
      return fetchHealthOverview(session, petId, signal);
    },
    refetchInterval: (query) => {
      const error = query.state.error;
      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) return false;
        if (error.isRateLimited) {
          const failures = Math.max(query.state.fetchFailureCount, 1);
          return Math.min(REFETCH_MS * 2 ** failures, BACKOFF_MAX_MS);
        }
      }
      return REFETCH_MS;
    },
    refetchIntervalInBackground: false,
    staleTime: STALE_MS,
    retry: (failureCount, error) => {
      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) return false;
      }
      return failureCount < 2;
    },
  });
}
