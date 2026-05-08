import type { SensorUsed } from './tracker';

export interface PositionSegment {
  time_start: number;
  time_end: number;
  positions: PositionPoint[];
}

export type PositionPoint = [
  lat: number,
  lon: number,
  accuracy: number,
  timestamp: number,
  sensor: SensorUsed,
];

export interface PositionsRange {
  time_from: number;
  time_to: number;
}
