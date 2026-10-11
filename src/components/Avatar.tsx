import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import type { Profile } from '@/api/db';
import { colors, tintFor } from '@/theme';

export function Avatar({ person, size = 32, ring }: { person: Profile; size?: number; ring?: string }) {
  const border = ring ? Math.max(1.5, size * 0.04) : 0;
  const tint = tintFor(person.id);
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: tint.bg, borderWidth: border, borderColor: ring }}
      accessibilityLabel={person.name}
    >
      {person.profile_photo ? (
        <Image source={{ uri: person.profile_photo }} style={{ flex: 1 }} contentFit="cover" />
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 40 40">
          <Circle cx={20} cy={15.5} r={7} fill={tint.fg} />
          <Ellipse cx={20} cy={37} rx={12.5} ry={10} fill={tint.fg} />
        </Svg>
      )}
    </View>
  );
}

export function AvatarStack({ people, size = 28, ring = colors.folder, max = 4 }: { people: Profile[]; size?: number; ring?: string; max?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, max).map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar person={p} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}
