import { Platform } from 'react-native';

export function isFireTV(): boolean {
  if (Platform.OS !== 'android') return false;
  const manufacturer = (
    Platform.constants as { Manufacturer?: string }
  ).Manufacturer;
  return manufacturer?.toLowerCase() === 'amazon';
}
