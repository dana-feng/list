import { ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Profile } from '@/api/db';
import { listsDoneCount, listsForProfile } from '@/api/lists';
import { followCounts } from '@/api/profiles';
import { colors } from '@/theme';
import { Avatar } from './Avatar';
import { Hand, Mono } from './Text';

/** Big face, lists / followers / following, name, lists done, then an optional action (follow). */
export function ProfileHeader({ person, action }: { person: Profile; action?: ReactNode }) {
  const lists = listsForProfile(person.id).filter((r) => !r.invited).length;
  const { followers, following } = followCounts(person.id);
  const done = listsDoneCount(person.id);
  const [viewing, setViewing] = useState(false);
  const { width, height } = useWindowDimensions();
  const big = Math.min(width, height) - 40;
  const follows = (mode: 'followers' | 'following') => router.push(`/user/${person.username}/follows?mode=${mode}`);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 }}>
        <Pressable onPress={() => setViewing(true)} disabled={!person.profile_photo} accessibilityRole={person.profile_photo ? 'button' : undefined} accessibilityLabel={`${person.name}'s photo`}>
          <Avatar person={person} size={92} edge={colors.paper} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Count n={lists} label={lists === 1 ? 'list' : 'lists'} />
          <Count n={followers} label="followers" onPress={() => follows('followers')} />
          <Count n={following} label="following" onPress={() => follows('following')} />
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 2 }}>
        <Hand size={30} color={colors.paper} style={{ lineHeight: 33 }}>{person.name}</Hand>
        <Mono size={12} color={colors.onDarkSoft}>{done} {done === 1 ? 'list' : 'lists'} done</Mono>
      </View>
      {action ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>{action}</View> : null}
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
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${n} ${label}`} style={{ alignItems: 'center', minWidth: 64, paddingVertical: 6 }}>
      <Hand size={26} color={colors.paper} style={{ lineHeight: 28 }}>{n}</Hand>
      <Mono size={11} color={colors.onDarkSoft}>{label}</Mono>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(40,10,0,0.92)' },
});
