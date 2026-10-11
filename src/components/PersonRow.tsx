import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { Profile } from '@/api/db';
import { colors, space } from '@/theme';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { Mono, Sans, SansBold } from './Text';

/** Photo, name, @username, then a Follow button (or whatever `right` is, e.g. a checkbox). */
export function PersonRow({ person, onPress, right, note, inline }: { person: Profile; onPress?: () => void; right?: ReactNode; note?: string; inline?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 11 }}>
      <Avatar person={person} size={40} ring="rgba(247,242,227,0.6)" />
      <View style={{ flex: 1 }}>
        {inline ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <SansBold size={16}>{person.name}</SansBold>
            <Mono color={colors.inkSoft}>@{person.username}</Mono>
          </View>
        ) : (
          <>
            <SansBold size={16}>{person.name}</SansBold>
            <Mono color={colors.inkSoft}>@{person.username}</Mono>
          </>
        )}
        {note ? <Sans size={13} color={colors.inkSoft}>{note}</Sans> : null}
      </View>
      </Pressable>
      {right === undefined ? <FollowButton userId={person.id} /> : right}
    </View>
  );
}
