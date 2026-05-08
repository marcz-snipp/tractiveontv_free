import type { ComponentType } from 'react';
import { Cat, Dog, PawPrint, type LucideProps } from 'lucide-react-native';

export function iconForSpecies(species?: string | null): ComponentType<LucideProps> {
  const s = (species ?? '').trim().toLowerCase();
  if (s === 'cat') return Cat;
  if (s === 'dog') return Dog;
  return PawPrint;
}
