import { View } from 'react-native';
import { Image } from 'expo-image';
import type { Profile } from '@/api/db';
import { colors, fonts, tintFor } from '@/theme';
import { Hand } from './Text';

type Props = { person: Profile; size?: number; edge?: string; fill?: string };

/** A face: their photo, or their first initial, on a rounded square (like the folders) with a pen line around it. */
export function Avatar({ person, size = 24, edge = colors.ink, fill }: Props) {
  const initial = (person.name || person.username || '?').trim().charAt(0).toLowerCase();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        backgroundColor: fill ?? tintFor(person.id), borderWidth: Math.max(1, size / 22), borderColor: edge,
      }}
      accessibilityLabel={person.name}
    >
      {person.profile_photo ? (
        <Image source={{ uri: person.profile_photo }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
      ) : (
        <Hand size={size * 0.46} style={{ lineHeight: size * 0.6, fontFamily: fonts.hand }}>{initial}</Hand>
      )}
    </View>
  );
}

/** Overlapping faces. */
export function AvatarStack({ people, size = 22, max = 4 }: { people: Profile[]; size?: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, max).map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: max - i }}>
          <Avatar person={p} size={size} />
        </View>
      ))}
    </View>
  );
}
