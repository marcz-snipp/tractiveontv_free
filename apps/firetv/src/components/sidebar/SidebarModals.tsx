import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { PetsListModal } from '@/components/pets/PetsListModal';
import { LogoutConfirmModal } from '@/components/sidebar/LogoutConfirmModal';
import { useSidebarModalsStore } from '@/lib/sidebar-modals-store';
import { useSelectedPetStore } from '@/lib/selected-pet-store';
import { useLiveModeStore } from '@/lib/live-mode-store';
import { isFireTV } from '@/lib/platform-tv';
import { useTrackers } from '@/features/map/use-trackers';
import { useLogout } from '@/features/auth/use-logout';

export function SidebarModals() {
  const router = useRouter();
  const trackersQ = useTrackers();
  const pets = trackersQ.data?.composedPets ?? [];
  const selectedId = useSelectedPetStore((s) => s.selectedId);
  const setSelectedId = useSelectedPetStore((s) => s.setSelectedId);
  const liveStatus = useLiveModeStore((s) => s.status);
  const stopLive = useLiveModeStore((s) => s.stop);
  const logout = useLogout();

  const petsListOpen = useSidebarModalsStore((s) => s.petsListOpen);
  const closePetsList = useSidebarModalsStore((s) => s.closePetsList);
  const logoutOpen = useSidebarModalsStore((s) => s.logoutOpen);
  const closeLogout = useSidebarModalsStore((s) => s.closeLogout);

  const onConfirmLogout = useCallback(async () => {
    closeLogout();
    await logout();
    if (isFireTV()) {
      BackHandler.exitApp();
    } else {
      router.replace('/(auth)/login' as never);
    }
  }, [closeLogout, logout, router]);

  const onSelectPet = useCallback(
    (id: string) => {
      if (id !== selectedId && liveStatus !== 'idle') {
        void stopLive();
      }
      setSelectedId(id);
      closePetsList();
    },
    [closePetsList, liveStatus, selectedId, setSelectedId, stopLive],
  );

  return (
    <>
      {petsListOpen ? (
        <PetsListModal
          pets={pets}
          selectedId={selectedId}
          onSelect={onSelectPet}
        />
      ) : null}

      {logoutOpen ? (
        <LogoutConfirmModal
          onConfirm={onConfirmLogout}
          onCancel={closeLogout}
          willExit={isFireTV()}
        />
      ) : null}
    </>
  );
}
