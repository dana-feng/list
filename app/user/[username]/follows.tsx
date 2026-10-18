import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { followCounts, followersOf, followingOf, getProfileByUsername } from '@/api/profiles';
import { Pill } from '@/components/Button';
import { FolderTab } from '@/components/FolderTab';
import { Header } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
import { FolderScreen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { SwipeTabs, useTabPosition } from '@/components/SwipeTabs';
import { Mono } from '@/components/Text';
import { colors } from '@/theme';

const MODES = ['followers', 'following'] as const;
type Mode = (typeof MODES)[number];

/** Someone's people: who follows them and who they follow, as two folder tabs. */
export default function Follows() {
  const db = useDb();
  const { username, mode } = useLocalSearchParams<{ username: string; mode?: Mode }>();
  const [tab, setTab] = useState<Mode>(mode === 'following' ? 'following' : 'followers');
  const tracking = useTabPosition(MODES.indexOf(tab));
  const [q, setQ] = useState('');
  const person = getProfileByUsername(username);
  const own = person?.id === db.me;
  const counts = person ? followCounts(person.id) : { followers: 0, following: 0 };
  const s = q.trim().toLowerCase().replace(/^@/, '');
  // both tabs are drawn side by side, so you can drag from one to the other; the search filters both
  const page = (m: Mode) => {
    const all = person ? (m === 'following' ? followingOf(person.id) : followersOf(person.id)) : [];
    const people = s ? all.filter((p) => p.name.toLowerCase().includes(s) || p.username.includes(s)) : all;
    const empty = !person
      ? `@${username} doesn't exist.`
      : s
        ? `no one called “${q.trim()}” here.`
        : m === 'following'
          ? `${own ? "you aren't" : `${person.name} isn't`} following anyone yet.`
          : `no one follows ${own ? 'you' : person.name} yet.`;
    return (
      <>
        <PeopleList people={people} fill={colors.cream} />
        {!people.length ? <Mono size={12} color={colors.inkSoft} style={{ marginTop: 12 }}>{empty}</Mono> : null}
        {/* your own empty "following": the way to fix it */}
        {!people.length && !s && own && m === 'following' ? (
          <View style={{ alignItems: 'flex-start', marginTop: 12 }}>
            <Pill label="find people" onPress={() => router.push('/search')} height={38} />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <FolderScreen
      refreshable
      roundCorner={tab === 'following'}
      header={<Header />}
      folderTabs={
        <>
          <FolderTab tab label={`${counts.followers} followers`} on={tab === 'followers'} onPress={() => setTab('followers')} open={tracking.position.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' })} />
          <FolderTab tab label={`${counts.following} following`} on={tab === 'following'} onPress={() => setTab('following')} open={tracking.position.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })} />
        </>
      }
    >
      <View style={{ marginBottom: 14 }}>
        <SearchField value={q} onChange={setQ} placeholder="find people" />
      </View>
      <SwipeTabs tabs={MODES} tab={tab} onChange={setTab} bleed={12} tracking={tracking} pages={{ followers: page('followers'), following: page('following') }} />
    </FolderScreen>
  );
}
