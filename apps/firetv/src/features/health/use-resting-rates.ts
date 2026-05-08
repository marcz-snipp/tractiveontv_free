import { useQuery } from '@tanstack/react-query';
import type { BiometricDayOverview } from '@tot/shared';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { dayjs } from '@/lib/dayjs';
import { fetchRestingHeartRate, fetchRestingRespiratoryRate } from './api';

const STALE_MS = 30 * 60_000;

export interface RestingRates {
  heartRate: BiometricDayOverview | null;
  respiratoryRate: BiometricDayOverview | null;
}

export function useRestingRates(petId: string | null) {
  const session = useAuthStore((s) => s.session);
  const date = dayjs().format('YYYY-MM-DD');

  return useQuery<RestingRates, Error>({
    queryKey: ['resting-rates', session?.userId, petId, date],
    enabled: !!session && !!petId,
    queryFn: async ({ signal }) => {
      if (!session || !petId) throw new Error('Missing session or petId');
      // Fetch les 2 en parallèle ; on tolère qu'un seul échoue (404 = pas de données pour cette date).
      const [hrRes, rrRes] = await Promise.allSettled([
        fetchRestingHeartRate(session, petId, date, signal),
        fetchRestingRespiratoryRate(session, petId, date, signal),
      ]);
      return {
        heartRate: hrRes.status === 'fulfilled' ? hrRes.value : null,
        respiratoryRate: rrRes.status === 'fulfilled' ? rrRes.value : null,
      };
    },
    staleTime: STALE_MS,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) return false;
      }
      return failureCount < 2;
    },
  });
}
