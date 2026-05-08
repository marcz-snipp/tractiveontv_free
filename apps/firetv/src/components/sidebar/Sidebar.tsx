import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Heart,
  Home,
  LogOut,
  Radio,
  RefreshCw,
  Settings,
  Square,
} from 'lucide-react-native';
import { SidebarItem } from './SidebarItem';
import { TVFocusGuide } from '@/components/tv/TVFocusGuide';
import { useAuthStore } from '@/lib/auth-store';
import { useSelectedPetStore } from '@/lib/selected-pet-store';
import { useLiveModeStore } from '@/lib/live-mode-store';
import { useSidebarModalsStore } from '@/lib/sidebar-modals-store';
import { isFireTV } from '@/lib/platform-tv';
import { useTrackers } from '@/features/map/use-trackers';
import { iconForSpecies } from '@/lib/pet-icon';
import { PetAvatar } from '@/components/pets/PetAvatar';

export interface SidebarProps {
  preferredFocusFirst?: boolean;
}

export function Sidebar({ preferredFocusFirst = true }: SidebarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const selectedId = useSelectedPetStore((s) => s.selectedId);
  const liveStatus = useLiveModeStore((s) => s.status);
  const startLive = useLiveModeStore((s) => s.start);
  const stopLive = useLiveModeStore((s) => s.stop);
  const trackersQ = useTrackers();
  const pets = trackersQ.data?.composedPets ?? [];
  const selected = pets.find((p) => p.id === selectedId) ?? null;
  const openPetsList = useSidebarModalsStore((s) => s.openPetsList);
  const openLogout = useSidebarModalsStore((s) => s.openLogout);

  const isOnHome = pathname === '/' || pathname === '/(app)' || pathname === '';
  const isOnHistory = pathname.startsWith('/history');
  const isOnHealth = pathname.startsWith('/health');
  const isOnSettings = pathname === '/settings' || pathname.endsWith('/settings');

  const onHome = useCallback(() => router.replace('/(app)' as never), [router]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const fetchingBulk = useIsFetching({ queryKey: ['bulk', session?.userId] });
  const fetchingPositions = useIsFetching({ queryKey: ['positions', session?.userId] });
  const fetchingGeofences = useIsFetching({ queryKey: ['geofences', session?.userId] });
  const isRefreshing =
    isManualRefreshing || fetchingBulk > 0 || fetchingPositions > 0 || fetchingGeofences > 0;
  const onRefresh = useCallback(async () => {
    if (!session || isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bulk', session.userId] }),
        queryClient.invalidateQueries({ queryKey: ['positions', session.userId] }),
        queryClient.invalidateQueries({ queryKey: ['geofences', session.userId] }),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
    } finally {
      setIsManualRefreshing(false);
    }
  }, [queryClient, session, isManualRefreshing]);
  const onHistory = useCallback(() => {
    if (!selected) return;
    router.push(`/history/${selected.trackerId}` as never);
  }, [router, selected]);
  const onHealth = useCallback(() => {
    if (!selected) return;
    router.push(`/health/${selected.id}` as never);
  }, [router, selected]);
  const onLive = useCallback(() => {
    if (liveStatus === 'active') {
      void stopLive();
    } else {
      void startLive();
      if (!isOnHome) router.replace('/(app)' as never);
    }
  }, [isOnHome, liveStatus, router, startLive, stopLive]);
  const onConfig = useCallback(() => router.push('/settings' as never), [router]);

  const liveActive = liveStatus === 'active';

  return (
    <View className="h-full px-3 py-6 bg-bg-sunken border-r border-border items-start">
      <TVFocusGuide trapFocusUp trapFocusDown trapFocusLeft>
        <View className="gap-2">
          <SidebarItem
            icon={Home}
            label={t('nav.map')}
            onPress={onHome}
            active={isOnHome}
            hasTVPreferredFocus={preferredFocusFirst && isOnHome}
          />
          <SidebarItem
            icon={RefreshCw}
            label={t('map.refresh')}
            onPress={onRefresh}
            iconSpin={isRefreshing}
          />
          <SidebarItem
            icon={Clock}
            label={t('map.history')}
            onPress={onHistory}
            active={isOnHistory}
            disabled={!selected}
          />
          <SidebarItem
            icon={liveActive ? Square : Radio}
            label={liveActive ? t('map.liveStop') : t('map.live')}
            onPress={onLive}
            tone={liveActive ? 'live' : 'default'}
            disabled={!selected}
          />
          <SidebarItem
            icon={Heart}
            label={t('nav.health')}
            onPress={onHealth}
            active={isOnHealth}
            disabled={!selected}
          />
          <SidebarItem
            icon={iconForSpecies(selected?.petType)}
            label={selected?.name ?? t('pets.menu')}
            onPress={openPetsList}
            disabled={pets.length === 0}
            renderIcon={({ color }) => (
              <PetAvatar
                avatarResourceId={selected?.avatarResourceId}
                species={selected?.petType}
                size={32}
                iconColor={color}
              />
            )}
          />
        </View>

        <View className="mt-auto gap-2">
          <SidebarItem
            icon={Settings}
            label={t('nav.settings')}
            onPress={onConfig}
            active={isOnSettings}
          />
          <SidebarItem
            icon={LogOut}
            label={t(isFireTV() ? 'auth.logout.exit.submit' : 'auth.logout.submit')}
            onPress={openLogout}
            tone="danger"
          />
        </View>
      </TVFocusGuide>
    </View>
  );
}
