import { apiFetch } from '@/lib/api-client';
import type { AuthSession, BiometricDayOverview, HealthOverview } from '@tot/shared';

export function fetchHealthOverview(
  session: AuthSession,
  petId: string,
  signal?: AbortSignal,
) {
  return apiFetch<HealthOverview>(`/api/pet/${petId}/health/overview`, {
    method: 'GET',
    session,
    signal,
  });
}

export function fetchRestingHeartRate(
  session: AuthSession,
  petId: string,
  date: string,
  signal?: AbortSignal,
) {
  return apiFetch<BiometricDayOverview>(
    `/api/pet/${petId}/resting-heart-rate?date=${encodeURIComponent(date)}`,
    { method: 'GET', session, signal },
  );
}

export function fetchRestingRespiratoryRate(
  session: AuthSession,
  petId: string,
  date: string,
  signal?: AbortSignal,
) {
  return apiFetch<BiometricDayOverview>(
    `/api/pet/${petId}/resting-respiratory-rate?date=${encodeURIComponent(date)}`,
    { method: 'GET', session, signal },
  );
}
