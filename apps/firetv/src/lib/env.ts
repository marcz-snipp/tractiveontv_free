function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  maptilerKey: process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '',
  pszRadiusMeters: parsePositiveNumber(process.env.EXPO_PUBLIC_PSZ_RADIUS_M, 120),
} as const;

export const isDev = __DEV__;
