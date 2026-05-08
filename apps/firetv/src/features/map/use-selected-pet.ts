import { useEffect, useState } from 'react';
import { prefs } from '@/lib/storage';
import type { PetEntry } from './types';

export function useSelectedPet(pets: PetEntry[]): {
  selected: PetEntry | null;
  setSelected: (id: string) => void;
} {
  const [selectedId, setSelectedId] = useState<string | null>(() => prefs.getSelectedTrackerId());

  useEffect(() => {
    if (pets.length === 0) return;
    const stored = selectedId;
    if (stored && pets.some((p) => p.id === stored)) return;
    const fallback = pets[0]?.id ?? null;
    if (fallback && fallback !== stored) {
      setSelectedId(fallback);
      prefs.setSelectedTrackerId(fallback);
    }
  }, [pets, selectedId]);

  const selected = pets.find((p) => p.id === selectedId) ?? null;

  const setSelected = (id: string) => {
    setSelectedId(id);
    prefs.setSelectedTrackerId(id);
  };

  return { selected, setSelected };
}
