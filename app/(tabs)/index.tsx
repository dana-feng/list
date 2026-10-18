import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useDb } from '@/api/db';
import { asks, feedAll } from '@/api/feed';
import { AskList } from '@/components/AskList';
import { Bell } from '@/components/Bell';
import { FeedPost } from '@/components/FeedPost';
import { FolderTab } from '@/components/FolderTab';
import { Icon } from '@/components/Icon';
import { FolderScreen } from '@/components/Screen';
import { SwipeTabs, useTabPosition } from '@/components/SwipeTabs';
import { Hand, Mono } from '@/components/Text';
import { colors } from '@/theme';

const TABS = ['all', 'asks'] as const;
type Tab = (typeof TABS)[number];

export default function Home() {
  useDb();
  const [tab, setTab] = useState<Tab>('all');
  const tracking = useTabPosition(0);
  const navigation = useNavigation();
  // tapping Home always lands back on activity
  useEffect(() => navigation.addListener('tabPress' as never, () => setTab('all')), [navigation]);
  const posts = feedAll();
  return (
    <FolderScreen
      insideTabs
      refreshable
      roundCorner={tab === 'asks'}
      header={
        <View style={styles.top}>
          <Hand size={40} color={colors.paper} style={{ lineHeight: 44 }}>list</Hand>
          <View style={{ flexDirection: 'row' }}>
            <Bell />
            <Pressable onPress={() => router.push('/search')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Search">
              <Icon name="search" size={21} color={colors.paper} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      }
      folderTabs={
        <>
          <FolderTab tab label="activity" on={tab === 'all'} onPress={() => setTab('all')} open={tracking.position.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' })} />
          <FolderTab tab label="asks" on={tab === 'asks'} onPress={() => setTab('asks')} open={tracking.position.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })} />
        </>
      }
    >
      <SwipeTabs
        tabs={TABS}
        tab={tab}
        onChange={setTab}
        bleed={12}
        tracking={tracking}
        pages={{
          all: posts.length ? posts.map((e, i) => <FeedPost key={e.id} event={e} index={i} />) : (
            <Empty title="quiet in here" body="follow a few people. what they add, cross off and ask about shows up here." />
          ),
          asks: (
            <AskList
              asks={asks}
              empty={{ title: 'nothing to answer', body: 'when friends invite you, add a gift, or need to borrow something, it shows up here.' }}
            />
          ),
        }}
      />
    </FolderScreen>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: 56, alignItems: 'center', gap: 8 }}>
      <Hand size={24}>{title}</Hand>
      <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>{body}</Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 10, minHeight: 48 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
