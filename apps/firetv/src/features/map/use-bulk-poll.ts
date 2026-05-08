import { useQuery } from '@tanstack/react-query';
import {
  POLL_BACKOFF_MAX_MS,
  POLL_INTERVAL_LIVE_MS,
  POLL_INTERVAL_STANDARD_MS,
  commandStateId,
  type BulkRequest,
  type BulkResponse,
  type HardwareReport,
  type PositionReport,
  type TrackerCommandState,
} from '@tot/shared';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { fetchBulk } from './api';
import type { TrackerLiveData } from './types';

function buildRefs(trackerId: string): BulkRequest {
  const idUpper = trackerId.toUpperCase();
  return [
    { _type: 'device_pos_report', _id: idUpper },
    { _type: 'device_hw_report', _id: idUpper },
    { _type: 'tracker_command_state', _id: commandStateId(trackerId, 'live_tracking') },
  ];
}

function parseBulk(rows: BulkResponse): TrackerLiveData {
  let position: PositionReport | null = null;
  let hardware: HardwareReport | null = null;
  let liveCommand: TrackerCommandState | null = null;
  for (const row of rows) {
    if (row._type === 'device_pos_report') position = row as unknown as PositionReport;
    else if (row._type === 'device_hw_report') hardware = row as unknown as HardwareReport;
    else if (row._type === 'tracker_command_state')
      liveCommand = row as unknown as TrackerCommandState;
  }
  return { position, hardware, liveCommand };
}

export function useBulkPoll(trackerId: string | null, liveActive: boolean) {
  const session = useAuthStore((s) => s.session);
  return useQuery<TrackerLiveData, Error>({
    queryKey: ['bulk', session?.userId, trackerId],
    enabled: !!session && !!trackerId,
    queryFn: async ({ signal }) => {
      if (!session || !trackerId) throw new Error('Missing session or tracker');
      const rows = await fetchBulk(session, buildRefs(trackerId), signal);
      return parseBulk(rows);
    },
    refetchInterval: (query) => {
      const base = liveActive ? POLL_INTERVAL_LIVE_MS : POLL_INTERVAL_STANDARD_MS;
      const error = query.state.error;
      if (!(error instanceof ApiError) || !error.isRateLimited) return base;
      const failures = Math.max(query.state.fetchFailureCount, 1);
      return Math.min(base * 2 ** failures, POLL_BACKOFF_MAX_MS);
    },
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  });
}
