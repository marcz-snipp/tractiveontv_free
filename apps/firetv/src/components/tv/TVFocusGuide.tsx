import type { ReactNode } from 'react';
import { Platform, View, type ViewProps } from 'react-native';

let TVFocusGuideViewImpl: React.ComponentType<TVFocusGuideViewProps> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TVFocusGuideViewImpl = require('react-native').TVFocusGuideView ?? null;
} catch {
  TVFocusGuideViewImpl = null;
}

interface TVFocusGuideViewProps extends ViewProps {
  destinations?: unknown[];
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
  children?: ReactNode;
}

export function TVFocusGuide(props: TVFocusGuideViewProps) {
  if (TVFocusGuideViewImpl && Platform.isTV) {
    const Comp = TVFocusGuideViewImpl;
    return <Comp {...props} />;
  }
  const { children, style, ...rest } = props;
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}
