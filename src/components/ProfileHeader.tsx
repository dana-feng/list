import { ReactNode } from 'react';
import { View } from 'react-native';
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
          <Count n={followers} label="followers" />
          <Count n={following} label="following" />
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

function Count({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Serif size={23}>{n}</Serif>
      <Sans size={13}>{label}</Sans>
    </View>
  );
}
