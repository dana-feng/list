import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { getProfileByUsername } from '@/api/profiles';
import { FolderGrid } from '@/components/FolderGrid';
import { FollowButton } from '@/components/FollowButton';
import { Header } from '@/components/Header';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Screen } from '@/components/Screen';
import { Mono, Sans, Serif } from '@/components/Text';
import { colors, space } from '@/theme';

/** Someone else's lists. */
export default function User() {
  useDb();
  const { username } = useLocalSearchParams<{ username: string }>();
  const person = getProfileByUsername(username);
  if (!person) {
    return (
      <Screen tabBar="home" header={<Header />}>
        <Serif size={24}>nobody here</Serif>
        <Sans color={colors.inkSoft}>@{username} doesn't exist.</Sans>
      </Screen>
    );
  }
  const rows = listsForProfile(person.id);
  return (
    <Screen tabBar="home" header={<Header center={<Mono size={14} center>@{person.username}</Mono>} right={<View style={{ width: 26 }} />} />}>
      <ProfileHeader person={person} action={<FollowButton userId={person.id} />} />
      {rows.length ? <FolderGrid rows={rows} /> : (
        <View style={{ paddingVertical: space.xxl * 2, alignItems: 'center', gap: space.sm }}>
          <Serif size={22}>nothing to see yet</Serif>
          <Sans center color={colors.inkSoft} style={{ maxWidth: 280 }}>
            {person.name}'s lists are for followers or specific people. Follow to see the ones open to followers.
          </Sans>
        </View>
      )}
    </Screen>
  );
}
