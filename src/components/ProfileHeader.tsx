import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { Profile } from '@/api/db';
import { listsDoneCount, listsForProfile } from '@/api/lists';
import { followCounts } from '@/api/profiles';
import { colors, space } from '@/theme';
import { Avatar } from './Avatar';
import { Sans, Serif } from './Text';

/** Photo, lists / followers / following counts, name, lists done. */
export function ProfileHeader({ person, action }: { person: Profile; action?: ReactNode }) {
  const lists = listsForProfile(person.id).filter((r) => !r.invited).length;
  const { followers, following } = followCounts(person.id);
  const done = listsDoneCount(person.id);
  return (
    <View style={{ marginBottom: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar person={person} size={80} ring={colors.cream} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingLeft: space.lg }}>
          <Count n={lists} label={lists === 1 ? 'list' : 'lists'} />
          <Count n={followers} label="followers" onPress={() => router.push(`/user/${person.username}/follows?mode=followers`)} />
          <Count n={following} label="following" onPress={() => router.push(`/user/${person.username}/follows?mode=following`)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg }}>
        <View style={{ flex: 1 }}>
          <Serif size={23}>{person.name}</Serif>
          <Sans color={colors.inkSoft}>{done} {done === 1 ? 'list' : 'lists'} done</Sans>
        </View>
        {action}
      </View>
    </View>
  );
}

function Count({ n, label, onPress }: { n: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={10} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${n} ${label}`} style={{ alignItems: 'center' }}>
      <Serif size={23}>{n}</Serif>
      <Sans size={13}>{label}</Sans>
    </Pressable>
  );
}
