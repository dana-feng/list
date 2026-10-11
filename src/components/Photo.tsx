import { StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ItemPhoto } from '@/api/db';
import { photoUri } from '@/api/items';
import { colors, isDark, swatchFor } from '@/theme';
import { Icon } from './Icon';
import { Sans } from './Text';

/** A photo, or a flat placeholder block when there's no file yet. */
export function Photo({ photo, style, label, radius = 16 }: { photo: Pick<ItemPhoto, 'id' | 'path'>; style?: StyleProp<ViewStyle>; label?: boolean; radius?: number }) {
  const base = [{ borderRadius: radius, overflow: 'hidden' as const }, style];
  const uri = photo.path ? photoUri(photo.path) : undefined;
  if (uri) {
    const source = { uri };
    return (
      <View style={base}>
        <Image source={source} style={{ flex: 1 }} contentFit="cover" transition={150} />
      </View>
    );
  }
  const fill = swatchFor(photo.id);
  const ink = isDark(fill) ? colors.onDark : colors.ink;
  return (
    <LinearGradient colors={[fill, fill, shade(fill)]} style={[...base, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }]}>
      {label ? (
        <>
          <Icon name="image" size={20} color={ink} />
          <Sans color={ink}>photo</Sans>
        </>
      ) : null}
    </LinearGradient>
  );
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * 0.86).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
