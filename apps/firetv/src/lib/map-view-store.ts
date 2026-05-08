import { create } from 'zustand';
import type { LatLon } from '@/maps/projection';
import { DEFAULT_ZOOM, ZOOMS, type MapZoom } from '@/maps/cache';

interface MapViewState {
  zoom: MapZoom;
  centerOverride: LatLon | null;
  setZoom: (z: MapZoom) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  recenterOn: (pos: LatLon) => void;
  clearOverride: () => void;
}

export const useMapViewStore = create<MapViewState>((set) => ({
  zoom: DEFAULT_ZOOM,
  centerOverride: null,
  setZoom: (z) => set({ zoom: z }),
  zoomIn: () =>
    set((state) => {
      const idx = ZOOMS.indexOf(state.zoom);
      const next = ZOOMS[Math.min(idx + 1, ZOOMS.length - 1)] ?? state.zoom;
      return { zoom: next };
    }),
  zoomOut: () =>
    set((state) => {
      const idx = ZOOMS.indexOf(state.zoom);
      const next = ZOOMS[Math.max(idx - 1, 0)] ?? state.zoom;
      return { zoom: next };
    }),
  recenterOn: (pos) => set({ centerOverride: pos }),
  clearOverride: () => set({ centerOverride: null }),
}));
