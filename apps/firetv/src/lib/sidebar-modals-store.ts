import { create } from 'zustand';

interface SidebarModalsState {
  petsListOpen: boolean;
  logoutOpen: boolean;
  openPetsList: () => void;
  closePetsList: () => void;
  openLogout: () => void;
  closeLogout: () => void;
}

export const useSidebarModalsStore = create<SidebarModalsState>((set) => ({
  petsListOpen: false,
  logoutOpen: false,
  openPetsList: () => set({ petsListOpen: true }),
  closePetsList: () => set({ petsListOpen: false }),
  openLogout: () => set({ logoutOpen: true }),
  closeLogout: () => set({ logoutOpen: false }),
}));
