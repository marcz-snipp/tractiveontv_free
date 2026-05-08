import { View } from 'react-native';
import { TVText } from '@/components/tv';

export interface MapDebugPillProps {
  cacheReady: boolean;
  cacheLoading: boolean;
  cacheError: string | null;
  missingKey: boolean;
  homeBase: { lat: number; lon: number } | null;
  hasMaptilerKey: boolean;
}

export function MapDebugPill({
  cacheReady,
  cacheLoading,
  cacheError,
  missingKey,
  homeBase,
  hasMaptilerKey,
}: MapDebugPillProps) {
  let label = '?';
  if (missingKey || !hasMaptilerKey) label = 'NO MAPTILER KEY';
  else if (cacheError) label = `ERR: ${cacheError.slice(0, 40)}`;
  else if (cacheLoading) label = 'DOWNLOADING…';
  else if (cacheReady) label = 'OK';
  else if (!homeBase) label = 'NO HOME BASE';
  else label = 'INIT';

  return (
    <View className="rounded-full bg-bg-sunken/80 border border-border-strong px-3 py-1.5">
      <TVText variant="micro" tone="muted">
        map: {label}
        {homeBase ? ` · ${homeBase.lat.toFixed(3)}, ${homeBase.lon.toFixed(3)}` : ''}
      </TVText>
    </View>
  );
}
