import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { TVFocusGuide } from './TVFocusGuide';
import { cn } from '@/lib/cn';

export interface TVFocusRowProps extends Omit<ViewProps, 'children' | 'style'> {
  children: ReactNode;
  className?: string;
  trapEdges?: boolean;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

const gapClass: Record<NonNullable<TVFocusRowProps['gap']>, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function TVFocusRow({
  children,
  className,
  trapEdges = false,
  gap = 'md',
  ...rest
}: TVFocusRowProps) {
  const content = (
    <View className={cn('flex-row items-center', gapClass[gap], className)} {...rest}>
      {children}
    </View>
  );
  if (!trapEdges) return content;
  return <TVFocusGuide trapFocusLeft trapFocusRight>{content}</TVFocusGuide>;
}

export function TVFocusColumn({
  children,
  className,
  trapEdges = false,
  gap = 'md',
  ...rest
}: TVFocusRowProps) {
  const content = (
    <View className={cn('flex-col items-stretch', gapClass[gap], className)} {...rest}>
      {children}
    </View>
  );
  if (!trapEdges) return content;
  return <TVFocusGuide trapFocusUp trapFocusDown>{content}</TVFocusGuide>;
}
