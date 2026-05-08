import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { fetchTrackersBundle } from './api';
import type { PetEntry } from './types';

interface RawPet {
  _id: string;
  _type: string;
  device_id?: string;
  home_location?: [number, number] | null;
  details?: {
    name?: string;
    profile_picture_id?: string | null;
    pet_type?: string | null;
  };
}

interface RawTracker {
  _id: string;
  _type: string;
}

interface TrackersBundleParsed {
  trackers: RawTracker[];
  pets: RawPet[];
  composedPets: PetEntry[];
}

function parsePets(rawPets: RawPet[], rawTrackers: RawTracker[]): PetEntry[] {
  const trackerIdsUpper = new Set(rawTrackers.map((t) => t._id.toUpperCase()));
  const out: PetEntry[] = [];
  for (const p of rawPets) {
    const trackerId = (p.device_id ?? '').toUpperCase();
    if (!trackerId) continue;
    if (rawTrackers.length > 0 && !trackerIdsUpper.has(trackerId)) continue;
    const home =
      Array.isArray(p.home_location) && p.home_location.length === 2
        ? { lat: p.home_location[0], lon: p.home_location[1] }
        : null;
    out.push({
      id: p._id,
      name: p.details?.name ?? trackerId,
      trackerId,
      avatarResourceId: p.details?.profile_picture_id ?? null,
      homeLocation: home,
      petType: p.details?.pet_type ?? null,
    });
  }
  return out;
}

export function useTrackers() {
  const session = useAuthStore((s) => s.session);
  return useQuery<TrackersBundleParsed>({
    queryKey: ['trackers', session?.userId],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      if (!session) throw new Error('No session');
      const bundle = await fetchTrackersBundle(session, signal);
      const trackers = bundle.trackers as unknown as RawTracker[];
      const pets = bundle.pets as unknown as RawPet[];
      return {
        trackers,
        pets,
        composedPets: parsePets(pets, trackers),
      };
    },
    staleTime: 5 * 60_000,
  });
}
