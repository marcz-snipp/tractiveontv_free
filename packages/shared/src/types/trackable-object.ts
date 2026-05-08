export type Species = 'cat' | 'dog' | string;

export interface TrackableObjectRef {
  _id: string;
  _type: 'trackable_object';
}

export interface TrackableObject {
  _id: string;
  _type: 'trackable_object';
  _version: string;
  details: {
    name: string;
    pet_type?: Species;
    breed_ids?: string[];
    gender?: 'male' | 'female' | 'unknown';
    birthday?: number;
    weight?: number;
    profile_picture_id?: string | null;
  };
  device_id?: string;
}
