import { useMemo, type ComponentType } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Heart,
  Moon,
  Smile,
  Wind,
  type LucideProps,
} from 'lucide-react-native';
import { ApiError } from '@/lib/api-client';
import { dayjs } from '@/lib/dayjs';
import { tokens } from '@/design/tokens';
import { TVCard, TVPressable, TVText } from '@/components/tv';
import { useTrackers } from '@/features/map/use-trackers';
import { useHealthOverview } from '@/features/health/use-health-overview';
import { useRestingRates } from '@/features/health/use-resting-rates';
import { ActivityRing } from '@/components/health/ActivityRing';
import { SleepBars } from '@/components/health/SleepBars';
import { iconForSpecies } from '@/lib/pet-icon';
import {
  isCalculatingBaseline,
  totalSleepMinutes,
  type HealthBiometric,
  type HealthSleep,
} from '@tot/shared';
import { formatMinutes } from '@/components/health/format';

export default function HealthScreen() {
  const { petId: rawId } = useLocalSearchParams<{ petId: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { t } = useTranslation();

  const trackersQ = useTrackers();
  const pet = trackersQ.data?.composedPets.find((p) => p.id === petId) ?? null;

  const healthQ = useHealthOverview(petId ?? null);
  const restingQ = useRestingRates(petId ?? null);

  const syncedAgo = useMemo(() => {
    const ts = healthQ.data?.activityDataSyncedAt;
    if (!ts) return null;
    const synced = dayjs(ts);
    if (!synced.isValid()) return null;
    // Si l'horloge locale est en retard sur la date renvoyée par Tractive
    // (ex. AVD non-NTP), `fromNow()` renvoie "dans X jours" qui n'a pas de sens
    // pour un timestamp de synchro. On masque dans ce cas.
    if (synced.isAfter(dayjs())) return null;
    return synced.fromNow();
  }, [healthQ.data?.activityDataSyncedAt]);

  if (!pet && !trackersQ.isLoading) {
    return <NotFoundState />;
  }

  const PetIcon = iconForSpecies(pet?.petType);

  return (
    <View className="flex-1 bg-bg px-10 py-8">
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center gap-3">
          <PetIcon
            color={tokens.colors.accent.strong}
            size={28}
            strokeWidth={2.2}
          />
          <TVText variant="h2">{pet?.name ?? '…'}</TVText>
          <TVText variant="h3" tone="muted">
            · {t('health.title')}
          </TVText>
        </View>
        {syncedAgo ? (
          <TVText variant="caption" tone="muted">
            {t('health.syncedAgo', { time: syncedAgo })}
          </TVText>
        ) : null}
      </View>

      <HealthBody query={healthQ} restingQ={restingQ} />
    </View>
  );
}

interface BodyProps {
  query: ReturnType<typeof useHealthOverview>;
  restingQ: ReturnType<typeof useRestingRates>;
}

function HealthBody({ query, restingQ }: BodyProps) {
  const { t } = useTranslation();

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={tokens.colors.accent.DEFAULT} />
        <TVText variant="caption" tone="muted" className="mt-4">
          {t('common.loading')}
        </TVText>
      </View>
    );
  }

  if (query.error instanceof ApiError) {
    if (
      query.error.status === 403 ||
      query.error.status === 404 ||
      query.error.status === 401
    ) {
      return <PremiumRequiredState />;
    }
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  if (query.error) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  const data = query.data;
  if (!data) return null;

  const activity = data.activity ?? { minutesActive: 0, minutesGoal: 0 };
  const sleep = data.sleep ?? { minutesNightSleep: 0, minutesDaySleep: 0, minutesCalm: 0 };

  return (
    <View className="flex-1 gap-4">
      <View className="flex-1 flex-row gap-4">
        <ActivityCard active={activity.minutesActive} goal={activity.minutesGoal} />
        <SleepCard sleep={sleep} />
      </View>
      <View className="flex-1 flex-row gap-4">
        <BiometricCard
          variant="hr"
          biometric={data.restingHeartRate}
          icon={Heart}
          dayValue={restingQ.data?.heartRate?.average ?? null}
          weekAverage={restingQ.data?.heartRate?.lookback?.average ?? null}
        />
        <BiometricCard
          variant="rr"
          biometric={data.restingRespiratoryRate}
          icon={Wind}
          dayValue={restingQ.data?.respiratoryRate?.average ?? null}
          weekAverage={restingQ.data?.respiratoryRate?.lookback?.average ?? null}
        />
      </View>
    </View>
  );
}

function ActivityCard({ active, goal }: { active: number; goal: number }) {
  const { t } = useTranslation();
  return (
    <TVCard tone="surface" pad="md" className="flex-1 overflow-hidden">
      <View className="flex-1 gap-3">
        <TVText variant="micro" tone="subtle">
          {t('health.activity.title')}
        </TVText>
        <View className="flex-1 flex-row items-center gap-5 justify-center">
          <ActivityRing active={active} goal={goal} size={120} strokeWidth={12} />
          <View className="gap-1">
            <TVText variant="h3">
              {t('health.activity.ratio', { active, goal })}
            </TVText>
            <TVText variant="body" tone="muted">
              {t('health.activity.goalLabel')}
            </TVText>
          </View>
        </View>
      </View>
    </TVCard>
  );
}

function SleepCard({ sleep }: { sleep: HealthSleep }) {
  const { t } = useTranslation();
  const total = totalSleepMinutes(sleep);
  return (
    <TVCard tone="surface" pad="md" className="flex-1 overflow-hidden">
      <View className="flex-1 gap-3">
        <View className="flex-row items-center gap-3">
          <Moon color={tokens.colors.accent.strong} size={20} strokeWidth={2.2} />
          <TVText variant="micro" tone="subtle">
            {t('health.sleep.title')}
          </TVText>
        </View>
        <View className="flex-1 flex-row items-center gap-5">
          <TVText variant="h3" tone="default">
            {formatMinutes(total)}
          </TVText>
          <View className="flex-1">
            <SleepBars
              rows={[
                { label: t('health.sleep.night'), minutes: sleep.minutesNightSleep },
                { label: t('health.sleep.day'), minutes: sleep.minutesDaySleep },
                { label: t('health.sleep.calm'), minutes: sleep.minutesCalm, tone: 'muted' },
              ]}
            />
          </View>
        </View>
      </View>
    </TVCard>
  );
}

function BiometricCard({
  variant,
  biometric,
  icon: Icon,
  dayValue,
  weekAverage,
}: {
  variant: 'hr' | 'rr';
  biometric: HealthBiometric | undefined;
  icon: ComponentType<LucideProps>;
  dayValue: number | null;
  weekAverage: number | null;
}) {
  const { t } = useTranslation();
  const titleKey = variant === 'hr' ? 'health.heartRate.title' : 'health.respiratoryRate.title';
  const unitKey = variant === 'hr' ? 'health.heartRate.unit' : 'health.respiratoryRate.unit';

  const status = biometric?.status ?? 'UNKNOWN';
  const calculating = isCalculatingBaseline(biometric);

  // Mapping statut → ton couleur + icône d'humeur (cf. UX mobile)
  const tone: 'success' | 'warning' | 'muted' =
    status === 'NORMAL' ? 'success' : status === 'LOW' || status === 'HIGH' ? 'warning' : 'muted';
  const StatusIcon = status === 'NORMAL' ? Smile : status === 'LOW' || status === 'HIGH' ? AlertTriangle : Smile;
  const iconColor =
    tone === 'success'
      ? tokens.colors.success.DEFAULT
      : tone === 'warning'
        ? tokens.colors.warning.DEFAULT
        : tokens.colors.text.subtle;

  const statusLabel = calculating
    ? t('health.calculating', { day: Math.max(0, biometric?.dayOffset ?? 0) })
    : t(`health.status.${status}`, { defaultValue: t('health.status.UNKNOWN') });

  return (
    <TVCard tone="surface" pad="md" className="flex-1 overflow-hidden">
      <View className="flex-1 gap-3">
        <View className="flex-row items-center gap-3">
          <Icon color={tokens.colors.accent.strong} size={20} strokeWidth={2.2} />
          <TVText variant="micro" tone="subtle">
            {t(titleKey)}
          </TVText>
        </View>
        <View className="flex-1 flex-row items-center gap-4 justify-center">
          <View
            className="rounded-full items-center justify-center"
            style={{
              width: 56,
              height: 56,
              backgroundColor:
                tone === 'success'
                  ? tokens.colors.success.soft
                  : tone === 'warning'
                    ? tokens.colors.warning.soft
                    : tokens.colors.surface.muted,
            }}
          >
            <StatusIcon color={iconColor} size={28} strokeWidth={2} />
          </View>
          <View className="gap-1">
            <TVText
              variant="h3"
              tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'muted'}
            >
              {statusLabel}
            </TVText>
            {dayValue != null ? (
              <TVText variant="body-lg" tone="default">
                {Math.round(dayValue)} {t(unitKey)}
              </TVText>
            ) : null}
            {weekAverage != null ? (
              <TVText variant="caption" tone="muted">
                {t('health.weekAverage', {
                  value: Math.round(weekAverage),
                  unit: t(unitKey),
                })}
              </TVText>
            ) : null}
          </View>
        </View>
      </View>
    </TVCard>
  );
}

function PremiumRequiredState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center">
      <TVCard tone="raised" pad="lg" className="max-w-[640px] items-center">
        <View className="gap-4 items-center">
          <Heart color={tokens.colors.accent.strong} size={40} strokeWidth={2.2} />
          <TVText variant="h2" className="text-center">
            {t('health.premiumRequired.title')}
          </TVText>
          <TVText variant="body" tone="muted" className="text-center">
            {t('health.premiumRequired.body')}
          </TVText>
          <TVPressable
            variant="primary"
            size="md"
            hasTVPreferredFocus
            onPress={() => {
              void Linking.openURL('https://tractive.com');
            }}
          >
            <TVText variant="label" tone="inverse">
              {t('health.premiumRequired.cta')}
            </TVText>
          </TVPressable>
        </View>
      </TVCard>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center">
      <TVCard tone="surface" pad="lg" className="max-w-[640px] items-center">
        <View className="gap-4 items-center">
          <TVText variant="h3" tone="danger">
            {t('health.loadError')}
          </TVText>
          <TVPressable variant="primary" size="md" hasTVPreferredFocus onPress={onRetry}>
            <TVText variant="label" tone="inverse">
              {t('common.retry')}
            </TVText>
          </TVPressable>
        </View>
      </TVCard>
    </View>
  );
}

function NotFoundState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <TVText variant="h2" tone="muted">
        {t('settings.errors.trackerNotFound')}
      </TVText>
    </View>
  );
}
