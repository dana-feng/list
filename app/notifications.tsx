import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notification, useDb } from '@/api/db';
import { onNewNotification } from '@/api/live';
import { describeNotification, loadNotifications, markNotificationsRead } from '@/api/notifications';
import { refresh } from '@/api/sync';
import { Avatar, SomeoneAvatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { Hand, Mono, MonoMedium } from '@/components/Text';
import { timeAgo } from '@/lib';
import { colors } from '@/theme';

/**
 * Plain rows on the dark background, newest first: "new" (not seen before you opened this) and
 * "earlier". Tapping a row opens the item or list. No mute, no settings, no mark-as-read:
 * opening the screen is reading it.
 */
export default function Notifications() {
  useDb();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Notification[] | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const show = useCallback((got: Notification[] | null) => {
    setRows(got);
    // anything unseen is now on screen
    if (got?.some((n) => !n.seen_at || !n.read_at)) markNotificationsRead();
  }, []);
  const load = useCallback(() => loadNotifications().then(show), [show]);
  useEffect(() => {
    loadNotifications().then(show);
  }, [show]);
  // something new while you're looking at the list: show it (which also marks it read)
  useEffect(() => onNewNotification(() => void loadNotifications().then(show)), [show]);

  const fresh = rows?.filter((n) => !n.seen_at) ?? [];
  const earlier = rows?.filter((n) => n.seen_at) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 6 }}>
        <Header title="notifications" />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.paper}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([load(), refresh()]).finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {rows === undefined ? null : rows === null ? (
          <Quiet title="couldn’t load these" body="pull down to try again." />
        ) : !rows.length ? (
          <Quiet title="nothing yet" body="invites, likes, comments and what happens on your lists show up here." />
        ) : (
          <>
            {fresh.length ? <Section label="new" rows={fresh} first /> : null}
            {earlier.length ? <Section label="earlier" rows={earlier} first={!fresh.length} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ label, rows, first }: { label: string; rows: Notification[]; first?: boolean }) {
  return (
    <View style={{ marginTop: first ? 0 : 22 }}>
      <Mono size={11} color={colors.onDarkSoft} style={{ letterSpacing: 1, paddingVertical: 8 }}>{label}</Mono>
      {rows.map((n) => <Row key={n.id} n={n} />)}
    </View>
  );
}

function Row({ n }: { n: Notification }) {
  const view = describeNotification(n);
  const [a, b] = view.people;
  const sentence = view.parts.map((x) => x.text).join('');
  return (
    <Pressable
      onPress={view.href ? () => router.push(view.href as never) : undefined}
      disabled={!view.href}
      style={styles.row}
      accessibilityRole={view.href ? 'button' : undefined}
      accessibilityLabel={`${sentence}${view.quote ? `. ${view.quote}` : ''}, ${timeAgo(n.updated_at)} ago`}
    >
      <View style={styles.faces}>
        {a && b ? (
          <>
            <View style={{ position: 'absolute', left: 0, top: 0 }}><Avatar person={a} size={26} edge={colors.night} /></View>
            <View style={{ position: 'absolute', right: 0, bottom: 0 }}><Avatar person={b} size={22} edge={colors.night} /></View>
          </>
        ) : a ? (
          <Avatar person={a} size={32} edge={colors.paper} />
        ) : n.kind === 'gift_claim' ? (
          // a surprise gift: nobody's face, just "someone"
          <SomeoneAvatar seed={n.id} size={32} edge={colors.paper} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Mono size={12.5} color={colors.paper} style={{ lineHeight: 19 }}>
          {view.parts.map((x, i) => (x.strong ? <MonoMedium key={i} size={12.5} color={colors.paper}>{x.text}</MonoMedium> : x.text))}
        </Mono>
        {view.quote ? <Mono size={12} color={colors.onDarkSoft} numberOfLines={2} style={{ lineHeight: 18 }}>{view.quote}</Mono> : null}
      </View>
      <Mono size={10.5} color={colors.onDarkSoft} style={{ paddingTop: 2 }}>{timeAgo(n.updated_at)}</Mono>
    </Pressable>
  );
}

function Quiet({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: 56, alignItems: 'center', gap: 8 }}>
      <Hand size={24} color={colors.paper}>{title}</Hand>
      <Mono size={12} center color={colors.onDarkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>{body}</Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(251,239,167,0.15)' },
  faces: { width: 32, height: 32 },
});
