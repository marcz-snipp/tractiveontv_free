import { View } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { TVPressable, TVText } from '@/components/tv';
import { ZOOMS, type MapZoom } from '@/maps/cache';
import { tokens } from '@/design/tokens';

export interface MapZoomControlsProps {
  zoom: MapZoom;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function MapZoomControls({ zoom, onZoomIn, onZoomOut }: MapZoomControlsProps) {
  const min = ZOOMS[0];
  const max = ZOOMS[ZOOMS.length - 1];
  const canIn = zoom < (max ?? 20);
  const canOut = zoom > (min ?? 14);
  return (
    <View className="items-center gap-2 rounded-full border border-border-strong bg-bg-sunken/85 p-2">
      <TVPressable
        variant="ghost"
        size="sm"
        onPress={onZoomIn}
        disabled={!canIn}
        className="h-12 w-12 px-0"
        focusedClassName="bg-white rounded-full border-white"
      >
        {({ focused }) => (
          <Plus
            color={
              focused
                ? tokens.colors.accent.strong
                : canIn
                  ? tokens.colors.text.DEFAULT
                  : tokens.colors.text.subtle
            }
            size={22}
            strokeWidth={2.6}
          />
        )}
      </TVPressable>
      <TVText variant="micro" tone="muted">
        z{zoom}
      </TVText>
      <TVPressable
        variant="ghost"
        size="sm"
        onPress={onZoomOut}
        disabled={!canOut}
        className="h-12 w-12 px-0"
        focusedClassName="bg-white rounded-full border-white"
      >
        {({ focused }) => (
          <Minus
            color={
              focused
                ? tokens.colors.accent.strong
                : canOut
                  ? tokens.colors.text.DEFAULT
                  : tokens.colors.text.subtle
            }
            size={22}
            strokeWidth={2.6}
          />
        )}
      </TVPressable>
    </View>
  );
}
