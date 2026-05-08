import { useMemo } from 'react';
import { Image, View } from 'react-native';
import { Compass, MapPinned } from 'lucide-react-native';
import {
  DEFAULT_ZOOM,
  TILE_SIZE,
  getTileGrid,
  hasMaptilerKey,
  type MapZoom,
} from '@/maps/cache';
import { latLonToPixel, type LatLon } from '@/maps/projection';
import { MapOverlay } from './MapOverlay';
import { CatPin } from './CatPin';
import { TVPressable, TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';
import { env } from '@/lib/env';
import type { Geofence } from '@tot/shared';

export interface StaticMapProps {
  petId: string;
  homeBase: LatLon;
  position: LatLon | null;
  zoom?: MapZoom;
  history?: LatLon[];
  geofences?: Geofence[];
  pulse?: boolean;
  alertGeofenceId?: string;
  width: number;
  height: number;
  cacheReady: boolean;
  onRecenter?: () => void;
  species?: string | null;
  homeGeofenceId?: string | null;
  avatarResourceId?: string | null;
  pszCenter?: LatLon | null;
  hideMarker?: boolean;
}

export function StaticMap({
  homeBase,
  position,
  zoom = DEFAULT_ZOOM,
  history,
  geofences,
  pulse = false,
  alertGeofenceId,
  width,
  height,
  onRecenter,
  species,
  homeGeofenceId,
  avatarResourceId,
  pszCenter,
  hideMarker = false,
}: StaticMapProps) {
  const grid = useMemo(() => {
    if (!hasMaptilerKey()) return null;
    return getTileGrid(homeBase, zoom, width, height, env.maptilerKey);
  }, [homeBase.lat, homeBase.lon, zoom, width, height]);

  const marker = position
    ? latLonToPixel(position, homeBase, zoom, width, height)
    : null;

  return (
    <View
      style={{ width, height }}
      className="overflow-hidden rounded-md bg-bg-sunken"
    >
      {grid ? (
        grid.tiles.map((tile) => (
          <Image
            key={`${tile.z}-${tile.x}-${tile.y}`}
            source={{ uri: tile.url }}
            style={{
              position: 'absolute',
              left: tile.left,
              top: tile.top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            resizeMode="cover"
          />
        ))
      ) : (
        <View
          className="absolute inset-0 items-center justify-center bg-bg-raised"
          style={{ width, height }}
        >
          <MapPinned color={tokens.colors.text.muted} size={64} strokeWidth={1.5} />
          <TVText variant="caption" tone="muted" className="mt-4">
            EXPO_PUBLIC_MAPTILER_KEY manquante
          </TVText>
        </View>
      )}

      <View
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
        pointerEvents="none"
      >
        <MapOverlay
          width={width}
          height={height}
          zoom={zoom}
          center={homeBase}
          history={history}
          geofences={geofences}
          highlightOutOfBoundsGeofence={alertGeofenceId}
          homeGeofenceId={homeGeofenceId}
          pszCenter={pszCenter}
          pszRadiusM={env.pszRadiusMeters}
        />
      </View>

      {marker?.visible && !hideMarker ? (
        <View
          style={{
            position: 'absolute',
            left: marker.x - 18,
            top: marker.y - 18,
          }}
          pointerEvents="none"
        >
          <CatPin
            size={36}
            pulse={pulse}
            species={species}
            avatarResourceId={avatarResourceId}
          />
        </View>
      ) : null}

      {position && marker && !marker.visible ? (
        <View className="absolute bottom-6 left-6">
          <TVPressable variant="secondary" size="md" onPress={onRecenter ?? (() => undefined)}>
            <Compass color={tokens.colors.text.DEFAULT} size={20} />
            <TVText variant="label">Recentrer</TVText>
          </TVPressable>
        </View>
      ) : null}
    </View>
  );
}
