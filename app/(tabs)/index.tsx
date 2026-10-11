import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { feedAll, openInvites } from '@/api/feed';
import { FeedPost } from '@/components/FeedPost';
import { Icon } from '@/components/Icon';
import { OpenInviteRow } from '@/components/OpenInviteRow';
import { Screen } from '@/components/Screen';
import { Sans, SansBold, Serif } from '@/components/Text';
import { colors, space } from '@/theme';

type Tab = 'all' | 'open';

export default function Home() {
  useDb();
  const [tab, setTab] = useState<Tab>('all');
  const posts = feedAll();
  const invites = openInvites();
  return (
    <Screen
      insideTabs
      header={
        <View style={{ paddingHorizontal: space.xl }}>
          <View style={styles.top}>
            <Serif size={42} style={{ lineHeight: 48 }}>list</Serif>
            <Pressable onPress={() => router.push('/search')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Search people">
              <Icon name="search" size={24} strokeWidth={2.2} />
            </Pressable>
          </View>
          <View style={styles.tabs} accessibilityRole="tablist">
            <FeedTab label="All" on={tab === 'all'} onPress={() => setTab('all')} />
            <FeedTab label="Open Invite" on={tab === 'open'} onPress={() => setTab('open')} />
          </View>
        </View>
      }
    >
      {tab === 'all' ? (
        posts.length ? posts.map((e) => <FeedPost key={e.id} event={e} />) : (
          <Empty title="quiet in here" body="Follow a few people, or start a list. What you and your people do shows up here." />
        )
      ) : invites.length ? invites.map((r) => <OpenInviteRow key={r.item.id} {...r} />) : (
        <Empty title="no open invites" body="When someone you follow asks who's in, it lands here." />
      )}
    </Screen>
  );
}

function FeedTab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const Label = on ? SansBold : Sans;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && { borderBottomColor: colors.ink }]}>
      <Label size={17} color={on ? colors.ink : colors.inkSoft}>{label}</Label>
    </Pressable>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: space.xxl * 2, alignItems: 'center', gap: space.sm }}>
      <Serif size={24}>{title}</Serif>
      <Sans center color={colors.inkSoft} style={{ maxWidth: 280 }}>{body}</Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  tabs: { flexDirection: 'row', gap: space.xl, borderBottomWidth: 1.5, borderBottomColor: colors.line, marginTop: space.sm, marginHorizontal: -4 },
  tab: { paddingHorizontal: 4, paddingBottom: 10, paddingTop: 6, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1.5 },
});
