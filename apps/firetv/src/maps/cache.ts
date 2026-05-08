import { env } from '@/lib/env';
import type { LatLon } from './projection';

export const ZOOMS = [14, 15, 16, 17, 18, 19, 20] as const;
export type MapZoom = (typeof ZOOMS)[number];
export const DEFAULT_ZOOM: MapZoom = 18;
export const TILE_SIZE = 256;
export const TILE_WIDTH = 1280;
export const TILE_HEIGHT = 720;

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return (
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, z)
  );
}

export interface TilePlacement {
  x: number;
  y: number;
  z: number;
  url: string;
  left: number;
  top: number;
}

export interface TileGrid {
  tiles: TilePlacement[];
  centerPixel: { x: number; y: number };
  width: number;
  height: number;
}

export function getTileGrid(
  home: LatLon,
  zoom: MapZoom,
  viewportW: number,
  viewportH: number,
  apiKey: string,
): TileGrid {
  const homeTileX = lonToTileX(home.lon, zoom);
  const homeTileY = latToTileY(home.lat, zoom);

  const halfTilesX = viewportW / (2 * TILE_SIZE);
  const halfTilesY = viewportH / (2 * TILE_SIZE);

  const minX = Math.floor(homeTileX - halfTilesX);
  const minY = Math.floor(homeTileY - halfTilesY);
  const maxX = Math.ceil(homeTileX + halfTilesX);
  const maxY = Math.ceil(homeTileY + halfTilesY);

  const maxTileIndex = Math.pow(2, zoom);
  const tiles: TilePlacement[] = [];
  for (let x = minX; x < maxX; x += 1) {
    for (let y = minY; y < maxY; y += 1) {
      if (y < 0 || y >= maxTileIndex) continue;
      const wrappedX = ((x % maxTileIndex) + maxTileIndex) % maxTileIndex;
      const left = (x - homeTileX) * TILE_SIZE + viewportW / 2;
      const top = (y - homeTileY) * TILE_SIZE + viewportH / 2;
      tiles.push({
        x: wrappedX,
        y,
        z: zoom,
        url: tileUrl(zoom, wrappedX, y, apiKey),
        left,
        top,
      });
    }
  }

  return {
    tiles,
    centerPixel: { x: viewportW / 2, y: viewportH / 2 },
    width: viewportW,
    height: viewportH,
  };
}

export function tileUrl(z: number, x: number, y: number, apiKey: string): string {
  return `https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${encodeURIComponent(apiKey)}`;
}

export function hasMaptilerKey(): boolean {
  return Boolean(env.maptilerKey);
}
