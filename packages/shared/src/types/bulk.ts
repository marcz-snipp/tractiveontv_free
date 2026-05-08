export type CommandKind = 'led_control' | 'buzzer_control' | 'live_tracking';

export type BulkObjectType =
  | 'tracker'
  | 'trackable_object'
  | 'tracker_command_state'
  | 'device_pos_report'
  | 'device_hw_report'
  | 'geofence'
  | (string & {});

export interface BulkRef {
  _type: BulkObjectType;
  _id: string;
}

export interface TrackerCommandStateRef extends BulkRef {
  _type: 'tracker_command_state';
}

export interface TrackerCommandState {
  _id: string;
  _type: 'tracker_command_state';
  _version: string;
  active: boolean;
  pending: boolean;
  started_at: number | null;
  timeout: number;
  remaining: number;
  reconnecting?: boolean;
}

export type BulkRequest = BulkRef[];
export type BulkResponse = Array<Record<string, unknown> & { _id: string; _type: string }>;

export function commandStateId(trackerId: string, kind: CommandKind): string {
  return `${trackerId.toLowerCase()}_${kind}`;
}
