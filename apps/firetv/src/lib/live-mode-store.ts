import { useEffect } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { LIVE_COMMAND_RECHECK_MS, LIVE_MAX_DURATION_MS } from '@tot/shared';
import { useAuthStore } from './auth-store';
import { queryClient } from './query-client';
import { setLiveTracking } from '@/features/map/api';
import type { TrackerLiveData } from '@/features/map/types';

export type LiveStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'blocked_psz'
  | 'error';

interface LiveModeState {
  trackerId: string | null;
  status: LiveStatus;
  remainingSec: number | null;
  startedAt: number | null;

  setTrackerId: (id: string | null) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
  _tick: () => void;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;
let recheckInterval: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (recheckInterval) {
    clearInterval(recheckInterval);
    recheckInterval = null;
  }
}

export const useLiveModeStore = create<LiveModeState>((set, get) => ({
  trackerId: null,
  status: 'idle',
  remainingSec: null,
  startedAt: null,

  setTrackerId: (id) => {
    if (get().trackerId !== id) {
      clearTimers();
      set({ trackerId: id, status: 'idle', remainingSec: null, startedAt: null });
    }
  },

  start: async () => {
    const { trackerId, status } = get();
    const session = useAuthStore.getState().session;
    if (!trackerId || !session) return;
    if (status === 'active' || status === 'starting') return;

    set({ status: 'starting' });
    try {
      const res = await setLiveTracking(session, trackerId, 'on');
      const isActive = Boolean(res.state?.active);
      if (!isActive) {
        const cached = queryClient.getQueryData<TrackerLiveData>([
          'bulk',
          session.userId,
          trackerId,
        ]);
        const inPSZ =
          Boolean(cached?.hardware?.power_saving_zone_id) ||
          Boolean(cached?.position?.power_saving_zone_id);
        set({ status: inPSZ ? 'blocked_psz' : 'error' });
        return;
      }
      const startedAt = Date.now();
      set({
        status: 'active',
        startedAt,
        remainingSec: Math.floor(LIVE_MAX_DURATION_MS / 1000),
      });
      tickInterval = setInterval(() => get()._tick(), 1000);
    } catch {
      set({ status: 'error' });
    }
  },

  stop: async () => {
    const { trackerId, status } = get();
    const session = useAuthStore.getState().session;
    if (!trackerId || !session) return;
    if (status === 'idle') return;
    set({ status: 'stopping' });
    clearTimers();
    try {
      await setLiveTracking(session, trackerId, 'off');
    } finally {
      set({ status: 'idle', startedAt: null, remainingSec: null });
    }
  },

  reset: () => {
    clearTimers();
    set({ status: 'idle', startedAt: null, remainingSec: null });
  },

  _tick: () => {
    const { startedAt, status } = get();
    if (status !== 'active' || !startedAt) return;
    const elapsed = Date.now() - startedAt;
    const remain = Math.max(0, Math.floor((LIVE_MAX_DURATION_MS - elapsed) / 1000));
    set({ remainingSec: remain });
    if (remain <= 0) void get().stop();
  },
}));

export function useBindLiveModeRefresh(): void {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const trackerId = useLiveModeStore((s) => s.trackerId);
  const status = useLiveModeStore((s) => s.status);

  useEffect(() => {
    if (status !== 'active' || !trackerId || !session) return;
    recheckInterval = setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: ['bulk', session.userId, trackerId],
      });
    }, LIVE_COMMAND_RECHECK_MS);
    return () => {
      if (recheckInterval) {
        clearInterval(recheckInterval);
        recheckInterval = null;
      }
    };
  }, [queryClient, session, status, trackerId]);
}
