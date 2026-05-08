import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export interface BiometricStatProps {
  icon: ComponentType<LucideProps>;
  title: string;
  value: number | null;
  unit: string;
  /** Affiché si value est connue (ex. "Stable sur 7 derniers j."). */
  caption?: string;
  /** Affiché à la place de la valeur quand value est null (apprentissage). */
  calculatingLabel?: string;
}

export function BiometricStat({
  icon: Icon,
  title,
  value,
  unit,
  caption,
  calculatingLabel,
}: BiometricStatProps) {
  const hasValue = value != null && Number.isFinite(value);
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <Icon color={tokens.colors.accent.strong} size={32} strokeWidth={2.2} />
        <TVText variant="micro" tone="subtle">
          {title}
        </TVText>
      </View>
      {hasValue ? (
        <View className="flex-row items-baseline gap-3">
          <TVText variant="hero" tone="default">
            {Math.round(value as number)}
          </TVText>
          <TVText variant="h3" tone="muted">
            {unit}
          </TVText>
        </View>
      ) : (
        <TVText variant="h3" tone="muted">
          {calculatingLabel ?? '—'}
        </TVText>
      )}
      {hasValue && caption ? (
        <TVText variant="body" tone="muted">
          {caption}
        </TVText>
      ) : null}
    </View>
  );
}
