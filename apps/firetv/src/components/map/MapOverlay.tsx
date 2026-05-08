import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { latLonToPixel, type LatLon } from '@/maps/projection';
import type { Geofence } from '@tot/shared';
import { tokens } from '@/design/tokens';

function buildSmoothPath(points: { x: number; y: number }[]): string | null {
  if (points.length < 2) return null;
  const fmt = (n: number) => n.toFixed(1);
  const first = points[0]!;
  if (points.length === 2) {
    const last = points[1]!;
    return `M${fmt(first.x)},${fmt(first.y)} L${fmt(last.x)},${fmt(last.y)}`;
  }
  const segs: string[] = [`M${fmt(first.x)},${fmt(first.y)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    segs.push(`C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(p2.x)},${fmt(p2.y)}`);
  }
  return segs.join(' ');
}

export interface MapOverlayProps {
  width: number;
  height: number;
  zoom: number;
  center: LatLon;
  history?: LatLon[];
  geofences?: Geofence[];
  highlightOutOfBoundsGeofence?: string;
  homeGeofenceId?: string | null;
  pszCenter?: LatLon | null;
  pszRadiusM?: number;
}

export function MapOverlay({
  width,
  height,
  zoom,
  center,
  history,
  geofences,
  highlightOutOfBoundsGeofence,
  homeGeofenceId,
  pszCenter,
  pszRadiusM,
}: MapOverlayProps) {
  const pxPerMeter =
    (Math.pow(2, zoom) * 256) /
    (40_075_016.686 * Math.cos((center.lat * Math.PI) / 180));
  const trailPath = history
    ? buildSmoothPath(
        history
          .map((p) => latLonToPixel(p, center, zoom, width, height))
          .filter((p) => p.visible)
          .map((p) => ({ x: p.x, y: p.y })),
      )
    : null;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {geofences?.map((g) => {
        const isAlert = g._id === highlightOutOfBoundsGeofence;
        const isHome = !!homeGeofenceId && g._id === homeGeofenceId;
        const stroke = isAlert
          ? tokens.colors.danger.DEFAULT
          : isHome
            ? '#ffffff'
            : tokens.colors.success.DEFAULT;
        const fill = isAlert
          ? tokens.colors.danger.soft
          : isHome
            ? 'rgba(255,255,255,0.06)'
            : tokens.colors.success.soft;
        const dashArray = isHome ? '10,8' : undefined;
        const strokeWidth = isHome ? 2.5 : 3;
        if (g.shape === 'POLYGON') {
          const points = g.polygon
            .map((pt) => latLonToPixel({ lat: pt[0], lon: pt[1] }, center, zoom, width, height))
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ');
          return (
            <Polygon
              key={g._id}
              points={points}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              fill={fill}
              strokeOpacity={0.9}
            />
          );
        }
        const c = latLonToPixel(
          { lat: g.center[0], lon: g.center[1] },
          center,
          zoom,
          width,
          height,
        );
        const radiusPx = Math.max(8, g.radius * pxPerMeter);
        return (
          <Circle
            key={g._id}
            cx={c.x}
            cy={c.y}
            r={radiusPx}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            fill={fill}
            strokeOpacity={0.9}
          />
        );
      })}

      {pszCenter && pszRadiusM && pszRadiusM > 0
        ? (() => {
            const pc = latLonToPixel(pszCenter, center, zoom, width, height);
            const pszRadiusPx = Math.max(6, pszRadiusM * pxPerMeter);
            return (
              <Circle
                cx={pc.x}
                cy={pc.y}
                r={pszRadiusPx}
                stroke={tokens.colors.info.DEFAULT}
                strokeWidth={2}
                strokeDasharray="6,6"
                strokeOpacity={0.9}
                fill={tokens.colors.info.soft}
              />
            );
          })()
        : null}

      {trailPath ? (
        <>
          <Path
            d={trailPath}
            stroke={tokens.colors.info.DEFAULT}
            strokeWidth={14}
            strokeOpacity={0.22}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={trailPath}
            stroke={tokens.colors.info.DEFAULT}
            strokeWidth={4}
            strokeOpacity={0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      ) : null}
    </Svg>
  );
}
