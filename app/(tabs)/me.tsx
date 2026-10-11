import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { me } from '@/api/profiles';
import { FolderGrid } from '@/components/FolderGrid';
import { Icon } from '@/components/Icon';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Screen } from '@/components/Screen';
import { Mono, Sans, Serif } from '@/components/Text';
import { colors, space } from '@/theme';

/** Your lists = your profile. */
export default function Me() {
  useDb();
  const person = me();
  const rows = listsForProfile(person.id);
  return (
    <Screen
      insideTabs
      refreshable
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, minHeight: 44, marginBottom: space.sm }}>
          <Mono size={14}>@{person.username}</Mono>
          <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
            <Icon name="settings" size={24} />
          </Pressable>
        </View>
      }
    >
      <ProfileHeader person={person} />
      {rows.length ? <FolderGrid rows={rows} own /> : (
        <View style={{ paddingVertical: space.xxl * 2, alignItems: 'center', gap: space.sm }}>
          <Serif size={24}>no lists yet</Serif>
          <Sans center color={colors.inkSoft}>Tap + to start your first one.</Sans>
        </View>
      )}
    </Screen>
  );
}
