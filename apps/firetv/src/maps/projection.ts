const TILE_SIZE = 256;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Pixel {
  x: number;
  y: number;
}

export interface ProjectedPoint extends Pixel {
  visible: boolean;
}

function project(lat: number, lon: number): [number, number] {
  const x = (lon + 180) / 360;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return [x, y];
}

export function latLonToPixel(
  pos: LatLon,
  center: LatLon,
  zoom: number,
  imgW: number,
  imgH: number,
): ProjectedPoint {
  const [cx, cy] = project(center.lat, center.lon);
  const [px, py] = project(pos.lat, pos.lon);
  const scale = Math.pow(2, zoom) * TILE_SIZE;
  const x = imgW / 2 + (px - cx) * scale;
  const y = imgH / 2 + (py - cy) * scale;
  return {
    x,
    y,
    visible: x >= 0 && x <= imgW && y >= 0 && y <= imgH,
  };
}

export function fitBoundsToZoom(
  points: LatLon[],
  viewportW: number,
  viewportH: number,
  paddingPx: number,
  minZoom: number,
  maxZoom: number,
): { center: LatLon; zoom: number } | null {
  if (points.length === 0 || viewportW <= 0 || viewportH <= 0) return null;
  if (points.length === 1) {
    return { center: { lat: points[0]!.lat, lon: points[0]!.lon }, zoom: maxZoom };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  const center: LatLon = { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };

  const [x1, y1] = project(maxLat, minLon);
  const [x2, y2] = project(minLat, maxLon);
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  const availW = Math.max(1, viewportW - paddingPx * 2);
  const availH = Math.max(1, viewportH - paddingPx * 2);
  const zoomX = dx > 0 ? Math.log2(availW / (dx * TILE_SIZE)) : Infinity;
  const zoomY = dy > 0 ? Math.log2(availH / (dy * TILE_SIZE)) : Infinity;
  const z = Math.floor(Math.min(zoomX, zoomY));
  const clamped = Math.max(minZoom, Math.min(maxZoom, z));
  return { center, zoom: clamped };
}

export function distanceMeters(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
