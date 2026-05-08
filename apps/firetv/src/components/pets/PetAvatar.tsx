import { useState } from 'react';
import { Image, View } from 'react-native';
import { TRACTIVE_BASE_URL } from '@tot/shared';
import { iconForSpecies } from '@/lib/pet-icon';
import { tokens } from '@/design/tokens';

export interface PetAvatarProps {
  avatarResourceId?: string | null;
  species?: string | null;
  size: number;
  iconColor?: string;
  iconStrokeWidth?: number;
}

export function petAvatarUrl(resourceId: string, sizePx: number): string {
  const px = Math.max(64, Math.ceil(sizePx));
  return `${TRACTIVE_BASE_URL}/4/media/resource/${resourceId}.${px}_${px}_1.jpg`;
}

export function PetAvatar({
  avatarResourceId,
  species,
  size,
  iconColor,
  iconStrokeWidth = 2.2,
}: PetAvatarProps) {
  const [errored, setErrored] = useState(false);

  if (avatarResourceId && !errored) {
    return (
      <Image
        source={{ uri: petAvatarUrl(avatarResourceId, size * 2) }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setErrored(true)}
      />
    );
  }

  const Icon = iconForSpecies(species);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon
        color={iconColor ?? tokens.colors.text.muted}
        size={Math.round(size * 0.65)}
        strokeWidth={iconStrokeWidth}
      />
    </View>
  );
}
