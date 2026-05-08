import { useEffect } from 'react';
import { create } from 'zustand';
import { prefs } from './storage';
import type { PetEntry } from '@/features/map/types';

interface SelectedPetState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export const useSelectedPetStore = create<SelectedPetState>((set) => ({
  selectedId: prefs.getSelectedTrackerId(),
  setSelectedId: (id) => {
    prefs.setSelectedTrackerId(id);
    set({ selectedId: id });
  },
}));

export function useSyncSelectedPet(pets: PetEntry[]): {
  selected: PetEntry | null;
  setSelected: (id: string) => void;
} {
  const selectedId = useSelectedPetStore((s) => s.selectedId);
  const setSelectedId = useSelectedPetStore((s) => s.setSelectedId);

  useEffect(() => {
    if (pets.length === 0) return;
    if (selectedId && pets.some((p) => p.id === selectedId)) return;
    const fallback = pets[0]?.id ?? null;
    if (fallback) setSelectedId(fallback);
  }, [pets, selectedId, setSelectedId]);

  const selected = pets.find((p) => p.id === selectedId) ?? null;
  return { selected, setSelected: setSelectedId };
}
