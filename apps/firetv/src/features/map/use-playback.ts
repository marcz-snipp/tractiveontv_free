import { useEffect, useRef, useState } from 'react';
import type { LatLon } from '@/maps/projection';
import type { PositionPointFlat } from './use-positions';

export interface PlaybackInput {
  points: PositionPointFlat[];
  isPlaying: boolean;
  durationMs?: number;
}

export interface PlaybackResult {
  position: LatLon | null;
  timestamp: number | null;
  progress: number;
  isFinished: boolean;
}

const DEFAULT_DURATION_MS = 30_000;

function interpolate(points: PositionPointFlat[], progress: number): {
  position: LatLon;
  timestamp: number;
} {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const tStart = first.timestamp;
  const tEnd = last.timestamp;
  if (tEnd <= tStart) {
    return { position: { lat: first.lat, lon: first.lon }, timestamp: first.timestamp };
  }
  const tNow = tStart + (tEnd - tStart) * progress;

  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.timestamp <= tNow) lo = mid;
    else hi = mid;
  }
  const a = points[lo]!;
  const b = points[hi]!;
  const seg = b.timestamp - a.timestamp;
  const f = seg <= 0 ? 0 : Math.min(1, Math.max(0, (tNow - a.timestamp) / seg));
  return {
    position: {
      lat: a.lat + (b.lat - a.lat) * f,
      lon: a.lon + (b.lon - a.lon) * f,
    },
    timestamp: tNow,
  };
}

export function usePlayback({
  points,
  isPlaying,
  durationMs = DEFAULT_DURATION_MS,
}: PlaybackInput): PlaybackResult {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    setIsFinished(false);
  }, [points]);

  useEffect(() => {
    if (!isPlaying || points.length < 2) return;

    const startedAt = Date.now() - progress * durationMs;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p >= 1) {
        setIsFinished(true);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, points, durationMs]);

  if (points.length < 2) {
    return { position: null, timestamp: null, progress: 0, isFinished: false };
  }

  const { position, timestamp } = interpolate(points, progress);
  return { position, timestamp, progress, isFinished };
}
