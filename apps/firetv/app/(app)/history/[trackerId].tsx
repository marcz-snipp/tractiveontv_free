import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Flame, Pause, Play, Route } from 'lucide-react-native';
import { TVCard, TVPressable, TVText } from '@/components/tv';
import { TVFocusColumn, TVFocusRow } from '@/components/tv/TVFocusRow';
import { StaticMap } from '@/components/map/StaticMap';
import { CatPin } from '@/components/map/CatPin';
import { MapZoomControls } from '@/components/map/MapZoomControls';
import { HeatmapOverlay, type HeatmapPoint } from '@/components/map/HeatmapOverlay';
import { latLonToPixel } from '@/maps/projection';
import { usePositions } from '@/features/map/use-positions';
import { usePlayback } from '@/features/map/use-playback';
import { useGeofences } from '@/features/map/use-geofences';
import { useHomeBase } from '@/features/map/use-home-base';
import { findHomeGeofenceId } from '@/maps/home-base';
import { useTileCache } from '@/features/map/use-tile-cache';
import { useTrackers } from '@/features/map/use-trackers';
import { useBulkPoll } from '@/features/map/use-bulk-poll';
import { distanceMeters, fitBoundsToZoom, type LatLon } from '@/maps/projection';
import { ZOOMS, type MapZoom } from '@/maps/cache';
import { tokens } from '@/design/tokens';
import { dayjs } from '@/lib/dayjs';
import { iconForSpecies } from '@/lib/pet-icon';

const RANGES = [
  { label: '1 h', hours: 1 },
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
  { label: '7 j', hours: 24 * 7 },
] as const;

export default function HistoryScreen() {
  const { trackerId: rawId } = useLocalSearchParams<{ trackerId: string }>();
  const trackerIdParam = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { t } = useTranslation();

  const [hours, setHours] = useState<number>(6);
  const [mapSize, setMapSize] = useState<{ w: number; h: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<'trail' | 'heatmap'>('trail');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [noMovementDismissed, setNoMovementDismissed] = useState(false);
  const currentRange = RANGES.find((r) => r.hours === hours) ?? RANGES[1];

  const trackersQ = useTrackers();
  const pet = trackersQ.data?.composedPets.find(
    (p) => p.trackerId.toUpperCase() === (trackerIdParam ?? '').toUpperCase(),
  );

  const trackerId = pet?.trackerId ?? null;
  const positionsQ = usePositions(trackerId, hours);
  const geofencesQ = useGeofences(trackerId);
  const bulkQ = useBulkPoll(trackerId, false);

  const currentPosition = bulkQ.data?.position
    ? { lat: bulkQ.data.position.latlong[0], lon: bulkQ.data.position.latlong[1] }
    : null;

  const homeBase = useHomeBase({
    petHomeLocation: pet?.homeLocation ?? null,
    geofences: geofencesQ.data,
    history: positionsQ.data?.trail,
    currentPosition,
  });

  const autoFit = useMemo(() => {
    const trail = positionsQ.data?.trail ?? [];
    if (trail.length === 0 || !mapSize) return null;
    const minZ = ZOOMS[0]!;
    const maxZ = ZOOMS[ZOOMS.length - 1]!;
    return fitBoundsToZoom(trail, mapSize.w, mapSize.h, 96, minZ, maxZ);
  }, [positionsQ.data, mapSize]);

  const [userZoom, setUserZoom] = useState<MapZoom | null>(null);
  const [userCenter, setUserCenter] = useState<LatLon | null>(null);

  useEffect(() => {
    setUserZoom(null);
    setUserCenter(null);
    setIsPlaying(false);
    setIsPeriodOpen(false);
    setNoMovementDismissed(false);
  }, [trackerId, hours]);

  const playbackDurationMs =
    hours >= 24 * 7 ? 120_000 : hours >= 24 ? 60_000 : 30_000;
  const playback = usePlayback({
    points: positionsQ.data?.points ?? [],
    isPlaying,
    durationMs: playbackDurationMs,
  });

  useEffect(() => {
    if (playback.isFinished) setIsPlaying(false);
  }, [playback.isFinished]);

  const playbackPoints = positionsQ.data?.points ?? [];
  const canPlay = playbackPoints.length >= 2;
  const markerPosition =
    isPlaying && playback.position ? playback.position : currentPosition;

  const playPulse = useSharedValue(1);
  useEffect(() => {
    if (isPlaying) {
      playPulse.value = withRepeat(
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      playPulse.value = withTiming(1, { duration: 160 });
    }
  }, [isPlaying, playPulse]);
  const playPulseStyle = useAnimatedStyle(() => ({ opacity: playPulse.value }));

  const fitZoom = (autoFit?.zoom ?? null) as MapZoom | null;
  const zoom: MapZoom = userZoom ?? fitZoom ?? (ZOOMS[ZOOMS.length - 1] as MapZoom);
  const center: LatLon | null = userCenter ?? autoFit?.center ?? homeBase?.center ?? null;

  const zoomIn = useCallback(() => {
    setUserZoom((prev) => {
      const base = prev ?? zoom;
      const idx = ZOOMS.indexOf(base);
      const next = ZOOMS[Math.min(idx + 1, ZOOMS.length - 1)] ?? base;
      return next as MapZoom;
    });
    if (!userCenter && center) setUserCenter(center);
  }, [zoom, userCenter, center]);

  const zoomOut = useCallback(() => {
    setUserZoom((prev) => {
      const base = prev ?? zoom;
      const idx = ZOOMS.indexOf(base);
      const next = ZOOMS[Math.max(idx - 1, 0)] ?? base;
      return next as MapZoom;
    });
    if (!userCenter && center) setUserCenter(center);
  }, [zoom, userCenter, center]);

  const tileCache = useTileCache(pet?.id ?? null, center);

  const heatmapPoints = useMemo<HeatmapPoint[]>(() => {
    const pts = positionsQ.data?.points ?? [];
    if (pts.length === 0) return [];
    const MAX_DT = 5 * 60;
    const DEFAULT_DT = 60;
    const out: HeatmapPoint[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const cur = pts[i]!;
      const next = pts[i + 1];
      const dt = next ? Math.min(Math.max(next.timestamp - cur.timestamp, 1), MAX_DT) : DEFAULT_DT;
      out.push({ lat: cur.lat, lon: cur.lon, weight: Math.sqrt(dt) });
    }
    return out;
  }, [positionsQ.data]);

  const totalDistanceM = useMemo(() => {
    const pts = positionsQ.data?.trail ?? [];
    let d = 0;
    for (let i = 1; i < pts.length; i += 1) {
      d += distanceMeters(pts[i - 1]!, pts[i]!);
    }
    return d;
  }, [positionsQ.data]);

  const onMapLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMapSize((prev) => {
      if (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
      return { w: Math.round(width), h: Math.round(height) };
    });
  }, []);

  if (!pet) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <TVText variant="h2" className="mb-4">
          {t('settings.errors.trackerNotFound')}
        </TVText>
        <TVPressable
          variant="secondary"
          size="md"
          onPress={() => router.back()}
          hasTVPreferredFocus
        >
          <ArrowLeft color={tokens.colors.text.DEFAULT} size={20} />
          <TVText variant="label">{t('common.back')}</TVText>
        </TVPressable>
      </View>
    );
  }

  const distanceLabel =
    totalDistanceM < 1000
      ? `${Math.round(totalDistanceM)} m`
      : `${(totalDistanceM / 1000).toFixed(2)} km`;
  const pointsCount = positionsQ.data?.points.length ?? 0;
  const noMovement = !positionsQ.isLoading && pointsCount === 0;

  return (
    <View className="flex-1 bg-bg relative" onLayout={onMapLayout}>
      {center && mapSize ? (
        <>
          <StaticMap
            petId={pet.id}
            homeBase={center}
            position={markerPosition}
            history={displayMode === 'trail' ? positionsQ.data?.trail : undefined}
            geofences={geofencesQ.data}
            zoom={zoom}
            width={mapSize.w}
            height={mapSize.h}
            cacheReady={tileCache.ready}
            species={pet.petType}
            avatarResourceId={pet.avatarResourceId}
            homeGeofenceId={findHomeGeofenceId(geofencesQ.data)}
            pszCenter={pet.homeLocation ?? null}
            hideMarker={displayMode === 'heatmap'}
          />
          {displayMode === 'heatmap' && heatmapPoints.length > 0 ? (
            <View className="absolute" style={{ left: 0, top: 0, width: mapSize.w, height: mapSize.h }} pointerEvents="none">
              <HeatmapOverlay
                width={mapSize.w}
                height={mapSize.h}
                zoom={zoom}
                center={center}
                points={heatmapPoints}
              />
            </View>
          ) : null}
          {displayMode === 'heatmap' && markerPosition
            ? (() => {
                const px = latLonToPixel(markerPosition, center, zoom, mapSize.w, mapSize.h);
                if (!px.visible) return null;
                return (
                  <View
                    style={{ position: 'absolute', left: px.x - 18, top: px.y - 18 }}
                    pointerEvents="none"
                  >
                    <CatPin
                      size={36}
                      species={pet.petType}
                      avatarResourceId={pet.avatarResourceId}
                    />
                  </View>
                );
              })()
            : null}
        </>
      ) : (
        <View className="flex-1 items-center justify-center bg-bg-raised">
          <ActivityIndicator size="large" color={tokens.colors.accent.DEFAULT} />
        </View>
      )}

      <View className="absolute left-6 top-6 right-6 flex-row items-center justify-between">
        <TVCard tone="surface" pad="md">
          <View className="flex-row items-center gap-3">
            {(() => {
              const PetIcon = iconForSpecies(pet.petType);
              return (
                <PetIcon
                  color={tokens.colors.accent.strong}
                  size={24}
                  strokeWidth={2.2}
                />
              );
            })()}
            <TVText variant="h3">{pet.name}</TVText>
          </View>
          {isPlaying && playback.timestamp ? (
            <View className="flex-row items-center gap-2 mt-1">
              <Animated.View style={playPulseStyle}>
                <Play
                  color={tokens.colors.accent.strong}
                  fill={tokens.colors.accent.strong}
                  size={16}
                  strokeWidth={2.4}
                />
              </Animated.View>
              <TVText variant="label" tone="muted">
                {dayjs.unix(playback.timestamp).format('ddd HH:mm')}
              </TVText>
            </View>
          ) : null}
        </TVCard>
        <TVCard tone="surface" pad="md">
          <View className="flex-row items-center gap-3">
            <Route color={tokens.colors.accent.strong} size={20} strokeWidth={2.2} />
            <TVText variant="label">{distanceLabel}</TVText>
            <TVText variant="caption" tone="muted">
              · {t('history.points', { count: pointsCount })}
            </TVText>
          </View>
        </TVCard>
      </View>

      <View className="absolute right-6 bottom-6">
        <MapZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      </View>

      <View className="absolute left-6 bottom-6">
        <TVFocusRow gap="sm">
          <View className="relative">
            {isPeriodOpen ? (
              <View className="absolute left-0 bottom-full mb-2 min-w-24">
                <TVFocusColumn gap="sm">
                  {RANGES.map((r) => (
                    <TVPressable
                      key={r.hours}
                      variant={r.hours === hours ? 'primary' : 'secondary'}
                      size="sm"
                      hasTVPreferredFocus={r.hours === hours}
                      onPress={() => {
                        setHours(r.hours);
                        setIsPeriodOpen(false);
                      }}
                      focusedClassName="bg-white border-white"
                    >
                      {({ focused }) => (
                        <TVText
                          variant="caption"
                          numberOfLines={1}
                          className="font-bold"
                          tone={focused || r.hours === hours ? 'inverse' : 'default'}
                        >
                          {r.label}
                        </TVText>
                      )}
                    </TVPressable>
                  ))}
                </TVFocusColumn>
              </View>
            ) : null}
            <TVPressable
              variant={isPeriodOpen ? 'primary' : 'secondary'}
              size="md"
              hasTVPreferredFocus
              onPress={() => setIsPeriodOpen((o) => !o)}
              focusedClassName="bg-white border-white"
            >
              {({ focused }) => (
                <TVText
                  variant="label"
                  tone={focused || isPeriodOpen ? 'inverse' : 'default'}
                >
                  {currentRange?.label ?? ''}
                </TVText>
              )}
            </TVPressable>
          </View>
          <View className="w-px h-8 bg-border-strong mx-1" />
          <TVPressable
            variant={displayMode === 'trail' ? 'primary' : 'secondary'}
            size="md"
            onPress={() => setDisplayMode('trail')}
            focusedClassName="bg-white border-white"
          >
            {({ focused }) => (
              <>
                <Route
                  color={
                    focused || displayMode === 'trail'
                      ? tokens.colors.text.inverse
                      : tokens.colors.text.DEFAULT
                  }
                  size={18}
                  strokeWidth={2.4}
                />
                <TVText
                  variant="label"
                  tone={focused || displayMode === 'trail' ? 'inverse' : 'default'}
                >
                  {t('history.trail')}
                </TVText>
              </>
            )}
          </TVPressable>
          <TVPressable
            variant={displayMode === 'heatmap' ? 'primary' : 'secondary'}
            size="md"
            onPress={() => setDisplayMode('heatmap')}
            focusedClassName="bg-white border-white"
          >
            {({ focused }) => (
              <>
                <Flame
                  color={
                    focused || displayMode === 'heatmap'
                      ? tokens.colors.text.inverse
                      : tokens.colors.text.DEFAULT
                  }
                  size={18}
                  strokeWidth={2.4}
                />
                <TVText
                  variant="label"
                  tone={focused || displayMode === 'heatmap' ? 'inverse' : 'default'}
                >
                  {t('history.heatmap')}
                </TVText>
              </>
            )}
          </TVPressable>
          {canPlay ? (
            <>
              <View className="w-px h-8 bg-border-strong mx-1" />
              <TVPressable
                variant={isPlaying ? 'primary' : 'secondary'}
                size="md"
                onPress={() => setIsPlaying((p) => !p)}
                focusedClassName="bg-white border-white"
              >
                {({ focused }) => {
                  const Icon = isPlaying ? Pause : Play;
                  const tone =
                    focused || isPlaying ? tokens.colors.text.inverse : tokens.colors.text.DEFAULT;
                  return (
                    <>
                      <Icon color={tone} size={18} strokeWidth={2.4} />
                      <TVText
                        variant="label"
                        tone={focused || isPlaying ? 'inverse' : 'default'}
                      >
                        {isPlaying ? t('history.pause') : t('history.play')}
                      </TVText>
                    </>
                  );
                }}
              </TVPressable>
            </>
          ) : null}
        </TVFocusRow>
      </View>

      {noMovement && !noMovementDismissed ? (
        <View
          className="absolute items-center justify-center"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,15,20,0.7)',
          }}
        >
          <View className="rounded-2xl border border-border-strong bg-bg-raised px-8 py-6 items-center">
            <TVText variant="h3" className="mb-2">
              {t('history.noMovementTitle')}
            </TVText>
            <TVText variant="body" tone="muted" className="mb-5">
              {t('history.noMovementHint', { name: pet.name })}
            </TVText>
            <TVPressable
              variant="primary"
              size="md"
              hasTVPreferredFocus
              onPress={() => setNoMovementDismissed(true)}
              focusedClassName="bg-white border-white"
            >
              {() => (
                <TVText variant="label" tone="inverse">
                  {t('common.ok')}
                </TVText>
              )}
            </TVPressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
