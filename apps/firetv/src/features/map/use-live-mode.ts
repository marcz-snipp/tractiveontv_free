import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LIVE_MAX_DURATION_MS, LIVE_COMMAND_RECHECK_MS } from '@tot/shared';
import { useAuthStore } from '@/lib/auth-store';
import { setLiveTracking } from './api';
import type { TrackerLiveData } from './types';

export type LiveStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'blocked_psz'
  | 'error';

export interface LiveModeApi {
  status: LiveStatus;
  remainingSec: number | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  busy: boolean;
}

export function useLiveMode(trackerId: string | null): LiveModeApi {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<LiveStatus>('idle');
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recheckRef.current) {
      clearInterval(recheckRef.current);
      recheckRef.current = null;
    }
  }, []);

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!session || !trackerId) throw new Error('No session');
      return setLiveTracking(session, trackerId, 'off');
    },
  });

  const stop = useCallback(() => {
    if (status === 'idle') return;
    setStatus('stopping');
    clearTimers();
    startedAtRef.current = null;
    setRemainingSec(null);
    stopMutation.mutate(undefined, {
      onSettled: () => {
        setStatus('idle');
        if (trackerId && session) {
          void queryClient.invalidateQueries({ queryKey: ['bulk', session.userId, trackerId] });
        }
      },
    });
  }, [clearTimers, queryClient, session, status, stopMutation, trackerId]);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!session || !trackerId) throw new Error('No session');
      return setLiveTracking(session, trackerId, 'on');
    },
    onSuccess: (data) => {
      const isActive = Boolean(data.state?.active);
      if (!isActive) {
        if (!session || !trackerId) {
          setStatus('error');
          return;
        }
        const cached = queryClient.getQueryData<TrackerLiveData>([
          'bulk',
          session.userId,
          trackerId,
        ]);
        const inPSZ =
          Boolean(cached?.hardware?.power_saving_zone_id) ||
          Boolean(cached?.position?.power_saving_zone_id);
        setStatus(inPSZ ? 'blocked_psz' : 'error');
        return;
      }
      startedAtRef.current = Date.now();
      setStatus('active');
      setRemainingSec(Math.floor(LIVE_MAX_DURATION_MS / 1000));

      tickRef.current = setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsed = Date.now() - startedAtRef.current;
        const remain = Math.max(0, Math.floor((LIVE_MAX_DURATION_MS - elapsed) / 1000));
        setRemainingSec(remain);
        if (remain <= 0) stop();
      }, 1000);

      recheckRef.current = setInterval(() => {
        if (trackerId && session) {
          void queryClient.invalidateQueries({ queryKey: ['bulk', session.userId, trackerId] });
        }
      }, LIVE_COMMAND_RECHECK_MS);
    },
    onError: () => setStatus('error'),
  });

  const start = useCallback(() => {
    if (!session || !trackerId) return;
    if (status === 'active' || status === 'starting') return;
    setStatus('starting');
    startMutation.mutate();
  }, [session, startMutation, status, trackerId]);

  const reset = useCallback(() => {
    clearTimers();
    startedAtRef.current = null;
    setRemainingSec(null);
    setStatus('idle');
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    reset();
  }, [reset, trackerId]);

  return {
    status,
    remainingSec,
    start,
    stop,
    reset,
    busy: startMutation.isPending || stopMutation.isPending,
  };
}
