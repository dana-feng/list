import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { followCounts, followersOf, followingOf, getProfileByUsername } from '@/api/profiles';
import { FolderTab } from '@/components/FolderTab';
import { Header } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
import { FolderScreen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Mono } from '@/components/Text';
import { colors } from '@/theme';

type Mode = 'followers' | 'following';

/** Someone's people: who follows them and who they follow, as two folder tabs. */
export default function Follows() {
  const db = useDb();
  const { username, mode } = useLocalSearchParams<{ username: string; mode?: Mode }>();
  const [tab, setTab] = useState<Mode>(mode === 'following' ? 'following' : 'followers');
  const [q, setQ] = useState('');
  const person = getProfileByUsername(username);
  const own = person?.id === db.me;
  const counts = person ? followCounts(person.id) : { followers: 0, following: 0 };
  const all = person ? (tab === 'following' ? followingOf(person.id) : followersOf(person.id)) : [];
  const s = q.trim().toLowerCase().replace(/^@/, '');
  const people = s ? all.filter((p) => p.name.toLowerCase().includes(s) || p.username.includes(s)) : all;
  const empty = !person
    ? `@${username} doesn't exist.`
    : s
      ? 'no one by that name here.'
      : tab === 'following'
        ? `${own ? "you aren't" : `${person.name} isn't`} following anyone yet.`
        : `no one follows ${own ? 'you' : person.name} yet.`;

  return (
    <FolderScreen
      refreshable
      roundCorner={tab === 'following'}
      header={<Header title={person ? `${own ? 'your' : `${person.name}'s`} people` : `@${username}`} />}
      folderTabs={
        <>
          <FolderTab tab label={`${counts.followers} followers`} on={tab === 'followers'} onPress={() => setTab('followers')} />
          <FolderTab tab label={`${counts.following} following`} on={tab === 'following'} onPress={() => setTab('following')} />
        </>
      }
    >
      <View style={{ marginBottom: 14 }}>
        <SearchField value={q} onChange={setQ} placeholder="find someone" />
      </View>
      <PeopleList people={people} />
      {!people.length ? <Mono size={12} color={colors.inkSoft} style={{ marginTop: 12 }}>{empty}</Mono> : null}
    </FolderScreen>
  );
}
