export type BiometricStatus =
  | 'NORMAL'
  | 'LOW'
  | 'HIGH'
  | 'CALCULATING_BASELINE'
  | string;

export interface HealthActivity {
  minutesGoal: number;
  minutesActive: number;
}

export interface HealthSleep {
  minutesDaySleep: number;
  minutesNightSleep: number;
  minutesCalm: number;
}

/**
 * Le `health/overview` Tractive ne renvoie *pas* la valeur numérique (BPM/RPM)
 * dans la vue d'ensemble — uniquement le statut et le `dayOffset`.
 * La valeur quotidienne moyenne s'obtient via un endpoint de détail séparé
 * (à creuser : `/health/heartRate?date=…` et `/health/respiratoryRate?date=…`).
 */
export interface HealthBiometric {
  status: BiometricStatus;
  dayOffset: number;
  value?: number | null;
}

export interface HealthAlerts {
  unseenCount: number;
}

export interface HealthOverview {
  petId: string;
  activityDataSyncedAt?: string | null;
  activity?: HealthActivity;
  sleep?: HealthSleep;
  rest?: unknown;
  bark?: unknown;
  scratch?: unknown;
  restingHeartRate?: HealthBiometric;
  restingRespiratoryRate?: HealthBiometric;
  healthAlerts?: HealthAlerts;
  associatedData?: Array<{ type: string }>;
}

/**
 * Réponse des endpoints `/api/1/pet/{petId}/resting-{heart|respiratory}-rate/day-overview?date=YYYY-MM-DD`.
 * Contient la valeur moyenne du jour + bornes faible/normale/élevée + lookback 7 jours.
 */
export interface BiometricBounds {
  min: number;
  lower: number;
  upper: number;
  max: number;
}

export interface BiometricLookbackDay {
  dayOffset: number;
  average: number | null;
  status: BiometricStatus | null;
  bounds: { lower: number; upper: number } | null;
}

export interface BiometricLookback {
  average: number;
  days: BiometricLookbackDay[];
}

export interface BiometricDayOverview {
  status: BiometricStatus;
  average: number;
  bounds: BiometricBounds;
  ageGroup?: string;
  lookback: BiometricLookback;
}

export function isCalculatingBaseline(b: HealthBiometric | undefined): boolean {
  if (!b) return false;
  return b.status === 'CALCULATING_BASELINE';
}

export function totalSleepMinutes(s: HealthSleep | undefined): number {
  if (!s) return 0;
  return (s.minutesNightSleep ?? 0) + (s.minutesDaySleep ?? 0) + (s.minutesCalm ?? 0);
}
