export type TrackerId = string;

export interface TrackerRef {
  _id: TrackerId;
  _type: 'tracker';
  _version?: string;
}

export interface Tracker {
  _id: TrackerId;
  _type: 'tracker';
  _version: string;
  model_number?: string;
  hw_id?: string;
  state?: string;
  charging_state?: string;
  battery_save_mode?: boolean;
  fw_version?: string;
  capabilities?: string[];
}

export type ChargingState = 'NOT_CHARGING' | 'CHARGING' | 'CHARGED' | string;
export type SensorUsed = 'GPS' | 'WIFI' | 'CELLULAR' | 'KNOWN_WIFI' | 'BLUETOOTH';

export interface HardwareReport {
  _id: string;
  _type: 'device_hw_report';
  _version: string;
  time: number;
  battery_level: number;
  charging_state: ChargingState;
  tracker_state?: string;
  power_saving_zone_id?: string | null;
}

export interface PositionReport {
  _id: string;
  _type: 'device_pos_report';
  _version: string;
  time: number;
  time_rcvd?: number;
  latlong: [number, number];
  speed?: number | null;
  altitude?: number | null;
  course?: number | null;
  pos_uncertainty?: number;
  sensor_used: SensorUsed;
  power_saving_zone_id?: string | null;
}
