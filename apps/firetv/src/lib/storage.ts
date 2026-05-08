import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'tot.prefs' });

const KEY = {
  locale: 'locale',
  rememberMe: 'rememberMe',
  selectedTrackerId: 'selectedTrackerId',
  timezone: 'timezone',
  geofenceSound: 'geofenceSound',
} as const;

export const prefs = {
  getLocale(): string | null {
    return storage.getString(KEY.locale) ?? null;
  },
  setLocale(value: string) {
    storage.set(KEY.locale, value);
  },
  getRememberMe(): boolean {
    return storage.getBoolean(KEY.rememberMe) ?? false;
  },
  setRememberMe(value: boolean) {
    storage.set(KEY.rememberMe, value);
  },
  getSelectedTrackerId(): string | null {
    return storage.getString(KEY.selectedTrackerId) ?? null;
  },
  setSelectedTrackerId(value: string | null) {
    if (value === null) storage.delete(KEY.selectedTrackerId);
    else storage.set(KEY.selectedTrackerId, value);
  },
  getTimezone(): string | null {
    return storage.getString(KEY.timezone) ?? null;
  },
  setTimezone(value: string | null) {
    if (value === null) storage.delete(KEY.timezone);
    else storage.set(KEY.timezone, value);
  },
  getGeofenceSound(): boolean {
    return storage.getBoolean(KEY.geofenceSound) ?? true;
  },
  setGeofenceSound(value: boolean) {
    storage.set(KEY.geofenceSound, value);
  },
  clearAll() {
    storage.clearAll();
  },
};
