import { apiFetch } from '@/lib/api-client';
import type {
  AuthSession,
  BulkRequest,
  BulkResponse,
  Geofence,
  TrackerCommandState,
} from '@tot/shared';

interface TrackersBundle {
  trackers: BulkResponse;
  pets: BulkResponse;
}

export function fetchTrackersBundle(session: AuthSession, signal?: AbortSignal) {
  return apiFetch<TrackersBundle>('/api/trackers', { method: 'GET', session, signal });
}

export function fetchBulk(session: AuthSession, refs: BulkRequest, signal?: AbortSignal) {
  return apiFetch<BulkResponse>('/api/bulk', {
    method: 'POST',
    body: refs,
    session,
    signal,
  });
}

export function fetchPositions(
  session: AuthSession,
  trackerId: string,
  fromSec: number,
  toSec: number,
  signal?: AbortSignal,
) {
  return apiFetch<unknown>(
    `/api/tracker/${trackerId}/positions?from=${fromSec}&to=${toSec}`,
    { method: 'GET', session, signal },
  );
}

export function fetchGeofences(session: AuthSession, trackerId: string, signal?: AbortSignal) {
  return apiFetch<Geofence[]>(`/api/tracker/${trackerId}/geofences`, {
    method: 'GET',
    session,
    signal,
  });
}

export function setLiveTracking(
  session: AuthSession,
  trackerId: string,
  action: 'on' | 'off',
) {
  return apiFetch<{ action: 'on' | 'off'; trackerId: string; state: TrackerCommandState | null }>(
    `/api/tracker/${trackerId}/command/live_tracking/${action}`,
    { method: 'POST', session },
  );
}
