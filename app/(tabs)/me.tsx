import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { me } from '@/api/profiles';
import { FolderGrid } from '@/components/FolderGrid';
import { Icon } from '@/components/Icon';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Screen } from '@/components/Screen';
import { Hand, Mono, MonoMedium } from '@/components/Text';
import { colors } from '@/theme';

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
        <View style={styles.top}>
          <MonoMedium size={14} color={colors.paper}>@{person.username}</MonoMedium>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Pressable onPress={() => router.push('/search')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Search">
              <Icon name="search" size={21} color={colors.paper} strokeWidth={1.8} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Settings">
              <Icon name="sliders" size={21} color={colors.paper} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      }
    >
      <ProfileHeader person={person} />
      {rows.length ? <FolderGrid rows={rows} own /> : (
        <View style={{ paddingVertical: 56, alignItems: 'center', gap: 8 }}>
          <Hand size={24} color={colors.paper}>no lists yet</Hand>
          <Mono size={12} color={colors.onDarkSoft}>tap + to start your first one.</Mono>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
