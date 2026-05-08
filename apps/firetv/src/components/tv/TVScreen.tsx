import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface TVScreenProps extends Omit<ViewProps, 'children' | 'style'> {
  children: ReactNode;
  className?: string;
  fullBleed?: boolean;
}

export function TVScreen({ children, className, fullBleed = false, ...rest }: TVScreenProps) {
  return (
    <View
      className={cn(
        'flex-1 bg-bg',
        !fullBleed && 'px-safe-x py-safe-y',
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
