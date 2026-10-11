import { ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
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
  const [viewing, setViewing] = useState(false);
  const { width, height } = useWindowDimensions();
  const big = Math.min(width, height) - space.xl * 2;
  return (
    <View style={{ marginBottom: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => setViewing(true)} disabled={!person.profile_photo} accessibilityRole={person.profile_photo ? 'button' : undefined} accessibilityLabel={`View ${person.name}'s photo`}>
          <Avatar person={person} size={80} ring={colors.cream} />
        </Pressable>
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
      <Modal visible={viewing} transparent animationType="fade" onRequestClose={() => setViewing(false)}>
        <Pressable style={styles.dim} onPress={() => setViewing(false)} accessibilityRole="button" accessibilityLabel="Close photo">
          <Image source={{ uri: person.profile_photo ?? undefined }} style={{ width: big, height: big, borderRadius: big / 2 }} contentFit="cover" transition={150} />
        </Pressable>
      </Modal>
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

const styles = StyleSheet.create({
  dim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43,53,36,0.9)' },
});
