import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { getProfileByUsername, isFollowing, toggleFollow } from '@/api/profiles';
import { Button } from '@/components/Button';
import { FolderGrid } from '@/components/FolderGrid';
import { Header } from '@/components/Header';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Screen } from '@/components/Screen';
import { Hand, Mono, MonoMedium } from '@/components/Text';
import { colors } from '@/theme';

/** Someone else's lists. */
export default function User() {
  const db = useDb();
  const { username } = useLocalSearchParams<{ username: string }>();
  const person = getProfileByUsername(username);
  if (!person) {
    return (
      <Screen header={<Header />}>
        <Hand size={24} color={colors.paper}>nobody here</Hand>
        <Mono size={12} color={colors.onDarkSoft}>@{username} doesn’t exist.</Mono>
      </Screen>
    );
  }
  const rows = listsForProfile(person.id);
  const following = isFollowing(person.id);
  const follow =
    person.id === db.me ? undefined : (
      <Button
        label={following ? 'following ✓' : 'follow'}
        tone={following ? 'outlineLight' : 'paper'}
        onPress={() => toggleFollow(person.id)}
        accessibilityLabel={following ? `Following ${person.name}. Tap to unfollow` : `Follow ${person.name}`}
        style={{ flex: 1, height: 44 }}
      />
    );
  return (
    <Screen refreshable header={<Header center={<MonoMedium size={14} color={colors.paper}>@{person.username}</MonoMedium>} />}>
      <ProfileHeader person={person} action={follow} />
      {rows.length ? <FolderGrid rows={rows} /> : (
        <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
          <Hand size={22} color={colors.paper}>nothing to see yet</Hand>
          <Mono size={12} center color={colors.onDarkSoft} style={{ maxWidth: 280, lineHeight: 18 }}>
            {person.name}’s lists are for followers or specific people. follow to see the ones open to followers.
          </Mono>
        </View>
      )}
    </Screen>
  );
}
