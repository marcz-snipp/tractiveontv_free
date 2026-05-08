import { useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { latLonToPixel, type LatLon } from '@/maps/projection';

export interface HeatmapPoint {
  lat: number;
  lon: number;
  weight: number;
}

export interface HeatmapOverlayProps {
  width: number;
  height: number;
  zoom: number;
  center: LatLon;
  points: HeatmapPoint[];
}

const CELL_SIZE = 12;
const KERNEL_RADIUS = 6;
const KERNEL_SIGMA = 2.6;
const INTENSITY_THRESHOLD = 0.015;

const KERNEL: number[][] = (() => {
  const k: number[][] = [];
  for (let dy = -KERNEL_RADIUS; dy <= KERNEL_RADIUS; dy += 1) {
    const row: number[] = [];
    for (let dx = -KERNEL_RADIUS; dx <= KERNEL_RADIUS; dx += 1) {
      const r2 = dx * dx + dy * dy;
      row.push(Math.exp(-r2 / (2 * KERNEL_SIGMA * KERNEL_SIGMA)));
    }
    k.push(row);
  }
  return k;
})();

const STOPS: Array<{ t: number; r: number; g: number; b: number }> = [
  { t: 0.0, r: 56, g: 130, b: 246 },
  { t: 0.35, r: 74, g: 222, b: 128 },
  { t: 0.6, r: 250, g: 204, b: 21 },
  { t: 0.8, r: 249, g: 115, b: 22 },
  { t: 1.0, r: 220, g: 38, b: 38 },
];

function rampColor(t: number): { color: string; alpha: number } {
  const clamped = Math.max(0, Math.min(1, t));
  let a = STOPS[0]!;
  let b = STOPS[STOPS.length - 1]!;
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    if (clamped <= STOPS[i + 1]!.t) {
      a = STOPS[i]!;
      b = STOPS[i + 1]!;
      break;
    }
  }
  const span = b.t - a.t;
  const f = span > 0 ? (clamped - a.t) / span : 0;
  const r = Math.round(a.r + (b.r - a.r) * f);
  const g = Math.round(a.g + (b.g - a.g) * f);
  const bl = Math.round(a.b + (b.b - a.b) * f);
  const fade = Math.pow(clamped, 0.65);
  const alpha = 0.04 + fade * 0.14;
  return { color: `rgb(${r},${g},${bl})`, alpha };
}

interface Cell {
  cx: number;
  cy: number;
  value: number;
}

export function HeatmapOverlay({ width, height, zoom, center, points }: HeatmapOverlayProps) {
  const cells = useMemo<Cell[]>(() => {
    if (points.length === 0 || width <= 0 || height <= 0) return [];
    const cols = Math.ceil(width / CELL_SIZE);
    const rows = Math.ceil(height / CELL_SIZE);
    const grid = new Float64Array(cols * rows);

    for (const p of points) {
      const px = latLonToPixel(
        { lat: p.lat, lon: p.lon },
        center,
        zoom,
        width,
        height,
      );
      const cx = Math.floor(px.x / CELL_SIZE);
      const cy = Math.floor(px.y / CELL_SIZE);
      if (cx < -KERNEL_RADIUS || cx >= cols + KERNEL_RADIUS) continue;
      if (cy < -KERNEL_RADIUS || cy >= rows + KERNEL_RADIUS) continue;
      for (let dy = -KERNEL_RADIUS; dy <= KERNEL_RADIUS; dy += 1) {
        const yy = cy + dy;
        if (yy < 0 || yy >= rows) continue;
        const krow = KERNEL[dy + KERNEL_RADIUS]!;
        for (let dx = -KERNEL_RADIUS; dx <= KERNEL_RADIUS; dx += 1) {
          const xx = cx + dx;
          if (xx < 0 || xx >= cols) continue;
          grid[yy * cols + xx]! += p.weight * krow[dx + KERNEL_RADIUS]!;
        }
      }
    }

    const nonZero: number[] = [];
    for (let i = 0; i < grid.length; i += 1) {
      if (grid[i]! > 0) nonZero.push(grid[i]!);
    }
    if (nonZero.length === 0) return [];
    nonZero.sort((a, b) => a - b);
    const pct = (q: number) =>
      nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * q))]!;
    const norm = pct(0.92);
    if (norm <= 0) return [];

    const out: Cell[] = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const raw = grid[y * cols + x]! / norm;
        const v = Math.min(1, Math.sqrt(raw));
        if (v < INTENSITY_THRESHOLD) continue;
        out.push({ cx: x * CELL_SIZE, cy: y * CELL_SIZE, value: v });
      }
    }
    return out;
  }, [points, width, height, zoom, center.lat, center.lon]);

  if (cells.length === 0) return null;

  const r = CELL_SIZE * 1.6;
  return (
    <Svg width={width} height={height} pointerEvents="none">
      {cells.map((c, i) => {
        const { color, alpha } = rampColor(c.value);
        return (
          <Circle
            key={i}
            cx={c.cx + CELL_SIZE / 2}
            cy={c.cy + CELL_SIZE / 2}
            r={r}
            fill={color}
            fillOpacity={alpha}
          />
        );
      })}
    </Svg>
  );
}
