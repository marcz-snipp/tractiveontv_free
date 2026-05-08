import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const textStyles = cva('text-text', {
  variants: {
    variant: {
      hero: 'text-hero font-display font-bold',
      display: 'text-display font-display font-bold',
      h1: 'text-h1 font-display font-semibold',
      h2: 'text-h2 font-display font-semibold',
      h3: 'text-h3 font-sans font-semibold',
      'body-lg': 'text-body-lg font-sans',
      body: 'text-body font-sans',
      caption: 'text-caption font-sans text-text-muted',
      micro: 'text-micro font-sans uppercase tracking-wider text-text-subtle',
      label: 'text-body font-sans font-medium',
    },
    tone: {
      default: 'text-text',
      muted: 'text-text-muted',
      subtle: 'text-text-subtle',
      accent: 'text-accent-strong',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      live: 'text-live',
      inverse: 'text-text-inverse',
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

export interface TVTextProps
  extends Omit<TextProps, 'children' | 'style'>,
    VariantProps<typeof textStyles> {
  className?: string;
  children: ReactNode;
}

export function TVText({ variant, tone, className, children, ...rest }: TVTextProps) {
  return (
    <Text className={cn(textStyles({ variant, tone }), className)} {...rest}>
      {children}
    </Text>
  );
}
