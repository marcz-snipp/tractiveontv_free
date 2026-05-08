import type {
  ChargingState,
  HardwareReport,
  PositionReport,
  SensorUsed,
  TrackableObject,
  Tracker,
  TrackerCommandState,
  TrackerDisplayStatus,
  TrackerSnapshot,
} from '@tot/shared';

export interface PetEntry {
  id: string;
  name: string;
  trackerId: string;
  avatarResourceId?: string | null;
  homeLocation?: { lat: number; lon: number } | null;
  petType?: string | null;
}

export interface TrackerLiveData {
  position: PositionReport | null;
  hardware: HardwareReport | null;
  liveCommand: TrackerCommandState | null;
}

export interface TrackerComposite {
  pet: PetEntry;
  tracker: Tracker | null;
  trackable: TrackableObject | null;
  data: TrackerLiveData;
}

export interface SnapshotComputed {
  snapshot: TrackerSnapshot;
  statuses: TrackerDisplayStatus[];
}

export type { TrackerDisplayStatus, TrackerSnapshot, ChargingState, SensorUsed };
