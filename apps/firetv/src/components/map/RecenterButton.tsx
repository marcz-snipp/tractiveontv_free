import { Crosshair, type LucideIcon } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { tokens } from '@/design/tokens';

export interface RecenterButtonProps {
  onPress: () => void;
  label?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export function RecenterButton({
  onPress,
  label,
  icon: Icon = Crosshair,
  disabled,
}: RecenterButtonProps) {
  return (
    <TVPressable
      variant="secondary"
      size="md"
      onPress={onPress}
      disabled={disabled}
      className="min-w-16 px-3"
    >
      {({ focused }) => (
        <>
          <Icon color={tokens.colors.text.DEFAULT} size={20} strokeWidth={2.4} />
          {label && focused ? <TVText variant="label">{label}</TVText> : null}
        </>
      )}
    </TVPressable>
  );
}
