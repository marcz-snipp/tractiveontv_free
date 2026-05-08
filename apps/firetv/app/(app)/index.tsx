import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TVText } from '@/components/tv';
import { StaticMap } from '@/components/map/StaticMap';
import { MapZoomControls } from '@/components/map/MapZoomControls';
import { CompactPetCard } from '@/components/map/CompactPetCard';
import { RecenterButton } from '@/components/map/RecenterButton';
import { Home } from 'lucide-react-native';
import { PSZBlockedBanner } from '@/components/map/PSZBlockedBanner';
import { GeofenceAlertBanner } from '@/components/map/GeofenceAlertBanner';
import { useTrackers } from '@/features/map/use-trackers';
import { findHomeGeofenceId } from '@/maps/home-base';
import { useBulkPoll } from '@/features/map/use-bulk-poll';
import { usePositions } from '@/features/map/use-positions';
import { useGeofences } from '@/features/map/use-geofences';
import { useHomeBase } from '@/features/map/use-home-base';
import { useTileCache } from '@/features/map/use-tile-cache';
import { useGeofenceAlert } from '@/features/map/use-geofence-alert';
import { buildSnapshot } from '@/features/map/snapshot';
import { useSyncSelectedPet } from '@/lib/selected-pet-store';
import { useLiveModeStore } from '@/lib/live-mode-store';
import { useMapViewStore } from '@/lib/map-view-store';
import { tokens } from '@/design/tokens';

export default function MapScreen() {
  const { t } = useTranslation();

  const trackersQ = useTrackers();
  const pets = trackersQ.data?.composedPets ?? [];
  const { selected } = useSyncSelectedPet(pets);

  const trackerId = selected?.trackerId ?? null;

  const setLiveTrackerId = useLiveModeStore((s) => s.setTrackerId);
  const liveStatus = useLiveModeStore((s) => s.status);
  const liveResetStore = useLiveModeStore((s) => s.reset);
  const live = liveStatus === 'active';

  useEffect(() => {
    setLiveTrackerId(trackerId);
  }, [setLiveTrackerId, trackerId]);

  const bulkQ = useBulkPoll(trackerId, live);
  const positionsQ = usePositions(trackerId, 6);
  const geofencesQ = useGeofences(trackerId);

  const trackerData = bulkQ.data ?? null;

  const composite = useMemo(() => {
    if (!selected || !trackerData) return null;
    return { pet: selected, tracker: null, trackable: null, data: trackerData };
  }, [selected, trackerData]);

  const snapshot = composite ? buildSnapshot(composite) : null;

  const homeBase = useHomeBase({
    petHomeLocation: selected?.homeLocation ?? null,
    geofences: geofencesQ.data,
    history: positionsQ.data?.trail,
    currentPosition: snapshot?.position
      ? { lat: snapshot.position.lat, lon: snapshot.position.lon }
      : null,
  });

  const zoom = useMapViewStore((s) => s.zoom);
  const zoomIn = useMapViewStore((s) => s.zoomIn);
  const zoomOut = useMapViewStore((s) => s.zoomOut);
  const centerOverride = useMapViewStore((s) => s.centerOverride);
  const recenterOn = useMapViewStore((s) => s.recenterOn);
  const clearOverride = useMapViewStore((s) => s.clearOverride);

  const viewCenter = centerOverride ?? homeBase?.center ?? null;
  const tileCache = useTileCache(selected?.id ?? null, viewCenter);

  const geofenceAlert = useGeofenceAlert(
    snapshot?.position ? { lat: snapshot.position.lat, lon: snapshot.position.lon } : null,
    geofencesQ.data,
  );
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [pszDismissed, setPszDismissed] = useState(false);
  const [mapSize, setMapSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (liveStatus === 'blocked_psz') setPszDismissed(false);
    else setPszDismissed(true);
  }, [liveStatus]);

  const onMapLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMapSize((prev) => {
      if (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
      return { w: Math.round(width), h: Math.round(height) };
    });
  }, []);

  const onRecenter = useCallback(() => {
    if (snapshot?.position) {
      recenterOn({ lat: snapshot.position.lat, lon: snapshot.position.lon });
    }
  }, [recenterOn, snapshot?.position]);

  if (trackersQ.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color={tokens.colors.accent.DEFAULT} />
        <TVText variant="caption" tone="muted" className="mt-4">
          {t('common.loading')}
        </TVText>
      </View>
    );
  }

  if (trackersQ.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <TVText variant="h2" tone="danger" className="mb-4">
          {t('settings.errors.loadTrackersTitle')}
        </TVText>
        <TVText variant="body" tone="muted">
          {t('settings.errors.loadTrackers')}
        </TVText>
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <TVText variant="h2" className="mb-4">
          {t('settings.errors.noPetsTitle')}
        </TVText>
        <TVText variant="body" tone="muted" className="text-center max-w-[640px]">
          {t('settings.errors.noPetsHint')}
        </TVText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg relative" onLayout={onMapLayout}>
      {viewCenter && selected && mapSize ? (
        <StaticMap
          petId={selected.id}
          homeBase={viewCenter}
          position={
            snapshot?.position
              ? { lat: snapshot.position.lat, lon: snapshot.position.lon }
              : null
          }
          geofences={geofencesQ.data}
          pulse={live}
          alertGeofenceId={geofenceAlert?.geofenceId}
          zoom={zoom}
          width={mapSize.w}
          height={mapSize.h}
          cacheReady={tileCache.ready}
          species={selected.petType}
          avatarResourceId={selected.avatarResourceId}
          homeGeofenceId={findHomeGeofenceId(geofencesQ.data)}
          pszCenter={selected.homeLocation ?? null}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-bg-raised">
          <ActivityIndicator size="large" color={tokens.colors.accent.DEFAULT} />
          <TVText variant="caption" tone="muted" className="mt-4">
            {tileCache.missingKey
              ? t('settings.errors.missingMaptilerKey')
              : !viewCenter
                ? t('settings.errors.waitingPosition')
                : t('common.loading')}
          </TVText>
        </View>
      )}

      {snapshot ? (
        <View className="absolute right-6 top-6">
          <CompactPetCard snapshot={snapshot} />
        </View>
      ) : null}

      <View className="absolute right-6 bottom-6 items-end gap-3">
        <MapZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} />
        <RecenterButton
          onPress={onRecenter}
          label={t('map.recenter')}
          disabled={!snapshot?.position}
        />
        {centerOverride ? (
          <RecenterButton onPress={clearOverride} label={t('map.home')} icon={Home} />
        ) : null}
      </View>

{liveStatus === 'blocked_psz' && !pszDismissed && selected ? (
        <PSZBlockedBanner
          petName={selected.name}
          onDismiss={() => {
            setPszDismissed(true);
            liveResetStore();
          }}
        />
      ) : null}

      {geofenceAlert && geofenceAlert.geofenceId !== dismissedAlertId && selected ? (
        <View className="absolute left-6 right-6 bottom-32 items-center">
          <GeofenceAlertBanner
            petName={selected.name}
            zoneName={geofenceAlert.geofenceName}
            onDismiss={() => setDismissedAlertId(geofenceAlert.geofenceId)}
          />
        </View>
      ) : null}
    </View>
  );
}
