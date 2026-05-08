export type GeofenceShape = 'POLYGON' | 'CIRCLE';

export interface GeofencePolygon {
  _id: string;
  _type: 'geofence';
  _version: string;
  name: string;
  shape: 'POLYGON';
  active: boolean;
  trigger?: 'IN_OUT' | 'OUT_IN';
  polygon: Array<[lat: number, lon: number]>;
}

export interface GeofenceCircle {
  _id: string;
  _type: 'geofence';
  _version: string;
  name: string;
  shape: 'CIRCLE';
  active: boolean;
  trigger?: 'IN_OUT' | 'OUT_IN';
  center: [lat: number, lon: number];
  radius: number;
}

export type Geofence = GeofencePolygon | GeofenceCircle;
