import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useDb } from '@/api/db';
import { feedAll, openInvites } from '@/api/feed';
import { FeedPost } from '@/components/FeedPost';
import { FolderTab } from '@/components/FolderTab';
import { Icon } from '@/components/Icon';
import { OpenInviteRow } from '@/components/OpenInviteRow';
import { FolderScreen } from '@/components/Screen';
import { Hand, Mono } from '@/components/Text';
import { colors } from '@/theme';

type Tab = 'all' | 'invites';

export default function Home() {
  useDb();
  const [tab, setTab] = useState<Tab>('all');
  const navigation = useNavigation();
  // tapping Home always lands back on the feed
  useEffect(() => navigation.addListener('tabPress' as never, () => setTab('all')), [navigation]);
  const posts = feedAll();
  const invites = openInvites();
  return (
    <FolderScreen
      insideTabs
      refreshable
      roundCorner={tab === 'invites'}
      header={
        <View style={styles.top}>
          <Hand size={40} color={colors.paper} style={{ lineHeight: 44 }}>list</Hand>
          <Pressable onPress={() => router.push('/search')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Find people">
            <Icon name="search" size={21} color={colors.paper} strokeWidth={1.8} />
          </Pressable>
        </View>
      }
      folderTabs={
        <>
          <FolderTab tab label="feed" on={tab === 'all'} onPress={() => setTab('all')} />
          <FolderTab tab label={`open invites · ${invites.length}`} on={tab === 'invites'} onPress={() => setTab('invites')} />
        </>
      }
    >
      <View style={{ gap: tab === 'all' ? 0 : 22 }}>
        {tab === 'all' ? (
          posts.length ? posts.map((e, i) => <FeedPost key={e.id} event={e} index={i} />) : (
            <Empty title="quiet in here" body="follow a few people. what they add, cross off and ask about shows up here." />
          )
        ) : invites.length ? (
          invites.map((r, i) => <OpenInviteRow key={r.item.id} {...r} index={i} />)
        ) : (
          <Empty title="no open invites" body="when someone you follow wants company for something, it lands here." />
        )}
      </View>
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
