import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useDb } from '@/api/db';
import { asks, feedAll } from '@/api/feed';
import { AskList } from '@/components/AskList';
import { Bell } from '@/components/Bell';
import { Pill } from '@/components/Button';
import { FeedPost } from '@/components/FeedPost';
import { FolderTab } from '@/components/FolderTab';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { FolderScreen } from '@/components/Screen';
import { SwipeTabs, useTabPosition } from '@/components/SwipeTabs';
import { Hand, Mono } from '@/components/Text';
import { colors } from '@/theme';

const TABS = ['all', 'asks'] as const;
type Tab = (typeof TABS)[number];

export default function Home() {
  const db = useDb();
  const [tab, setTab] = useState<Tab>('all');
  const tracking = useTabPosition(0);
  const navigation = useNavigation();
  // tapping Home always lands back on activity
  useEffect(() => navigation.addListener('tabPress' as never, () => setTab('all')), [navigation]);
  const posts = feedAll();
  const followsAnyone = db.follows.some((f) => f.follower_id === db.me);
  return (
    <FolderScreen
      insideTabs
      refreshable
      roundCorner={tab === 'asks'}
      header={
        <View style={styles.top}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="header" accessibilityLabel="echi">
            <Logo size={44} />
            <Hand size={36} color={colors.paper} style={{ lineHeight: 50 }}>echi</Hand>
          </View>
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
            // not following anyone is the usual reason it's empty, and the fix is one tap away
            followsAnyone ? (
              <Empty title="quiet in here" body="nothing new from the people you follow yet. what they add, cross off and ask about shows up here." />
            ) : (
              <Empty title="your feed is empty" body="follow a few people and what they add, cross off and ask about shows up here." action={{ label: 'find people', onPress: () => router.push('/search') }} />
            )
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

function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ paddingVertical: 56, alignItems: 'center', gap: 8 }}>
      <Hand size={24}>{title}</Hand>
      <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>{body}</Mono>
      {action ? <Pill label={action.label} onPress={action.onPress} height={38} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 10, minHeight: 48 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
