import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { followersOf, followingOf, getProfileByUsername } from '@/api/profiles';
import { Header } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
import { Screen } from '@/components/Screen';
import { Mono, Sans } from '@/components/Text';
import { colors, space } from '@/theme';

/** Who follows someone (mode=followers) or who they follow (mode=following). */
export default function Follows() {
  const db = useDb();
  const { username, mode } = useLocalSearchParams<{ username: string; mode: 'followers' | 'following' }>();
  const person = getProfileByUsername(username);
  const following = mode === 'following';
  const own = person?.id === db.me;
  const people = person ? (following ? followingOf(person.id) : followersOf(person.id)) : [];
  const empty = !person
    ? `@${username} doesn't exist.`
    : following
      ? `${own ? "You aren't" : `${person.name} isn't`} following anyone yet.`
      : `No one follows ${own ? 'you' : person.name} yet.`;
  return (
    <Screen refreshable header={<Header center={<Mono size={14} center>@{username}</Mono>} right={<View style={{ width: 26 }} />} />}>
      <Mono size={13} style={{ marginBottom: space.sm }}>{following ? 'following' : 'followers'}</Mono>
      <PeopleList people={people} />
      {!people.length ? <Sans color={colors.inkSoft} style={{ marginTop: space.md }}>{empty}</Sans> : null}
    </Screen>
  );
}
