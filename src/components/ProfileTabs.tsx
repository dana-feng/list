import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { activityFor } from '@/api/feed';
import { colors } from '@/theme';
import { FeedPost } from './FeedPost';
import type { TabPosition } from './SwipeTabs';
import { Hand, Mono, MonoMedium } from './Text';

export const PROFILE_TABS = ['lists', 'activity'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

type Span = { x: number; width: number };

// the underline is drawn this wide and stretched to fit each word, so the phone can animate it
const LINE = 100;

/**
 * "lists 3 · activity" under the bio: small mono words with an underline under the open one.
 * The underline slides along with `position` (SwipeTabs' drag), stretching from one word to the next.
 */
export function ProfileTabs({ tab, onChange, lists, position }: { tab: ProfileTab; onChange: (tab: ProfileTab) => void; lists: number; position: TabPosition['position'] }) {
  const [spans, setSpans] = useState<Partial<Record<ProfileTab, Span>>>({});
  const measure = (t: ProfileTab) => ({ nativeEvent: { layout } }: { nativeEvent: { layout: Span } }) =>
    setSpans((was) => (was[t]?.x === layout.x && was[t]?.width === layout.width ? was : { ...was, [t]: { x: layout.x, width: layout.width } }));
  const all = PROFILE_TABS.map((t) => spans[t]);
  const measured = all.every(Boolean) ? (all as Span[]) : null;
  const inputRange = PROFILE_TABS.map((_, i) => i);
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      <Word label="lists" count={lists} on={tab === 'lists'} onPress={() => onChange('lists')} onLayout={measure('lists')} />
      <Word label="activity" on={tab === 'activity'} onPress={() => onChange('activity')} onLayout={measure('activity')} />
      {measured ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.underline,
            {
              transform: [
                // scaling stretches from the middle, so move the middle to the middle of the word
                { translateX: position.interpolate({ inputRange, outputRange: measured.map((s) => s.x + (s.width - LINE) / 2), extrapolate: 'clamp' }) },
                { scaleX: position.interpolate({ inputRange, outputRange: measured.map((s) => s.width / LINE), extrapolate: 'clamp' }) },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function Word({ label, count, on, onPress, onLayout }: {
  label: string;
  count?: number;
  on: boolean;
  onPress: () => void;
  onLayout: (e: { nativeEvent: { layout: Span } }) => void;
}) {
  const Label = on ? MonoMedium : Mono;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={styles.word}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
    >
      <Label size={13} color={on ? colors.paper : colors.onDarkSoft}>{label}</Label>
      {count !== undefined ? <Mono size={11} color={colors.onDarkSoft}>{count}</Mono> : null}
    </Pressable>
  );
}

/** Someone's posts on a paper sheet, the same posts (likes and comments too) as on Home. */
export function ActivityList({ userId, empty }: { userId: string; empty: string }) {
  const posts = activityFor(userId);
  return (
    <View style={styles.paper}>
      {posts.length ? (
        posts.map((e, i) => <FeedPost key={e.id} event={e} index={i} />)
      ) : (
        <View style={{ paddingVertical: 44, alignItems: 'center', gap: 8 }}>
          <Hand size={22}>nothing yet</Hand>
          <Mono size={12} center color={colors.inkSoft} style={{ maxWidth: 260, lineHeight: 18 }}>{empty}</Mono>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 26, marginTop: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(251,239,167,0.18)' },
  word: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42 },
  underline: { position: 'absolute', left: 0, bottom: -1, width: LINE, height: 2, backgroundColor: colors.paper },
  paper: {
    marginTop: 18, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.paper,
    borderTopLeftRadius: 18, borderTopRightRadius: 22, borderBottomRightRadius: 20, borderBottomLeftRadius: 16,
  },
});
