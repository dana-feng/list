import { Pressable, StyleSheet, View } from 'react-native';
import { activityFor } from '@/api/feed';
import { colors } from '@/theme';
import { FeedPost } from './FeedPost';
import { Hand, Mono, MonoMedium } from './Text';

export type ProfileTab = 'lists' | 'activity';

/** "lists 3 · activity" under the bio: small mono words with an underline on the open one. */
export function ProfileTabs({ tab, onChange, lists }: { tab: ProfileTab; onChange: (tab: ProfileTab) => void; lists: number }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      <Word label="lists" count={lists} on={tab === 'lists'} onPress={() => onChange('lists')} />
      <Word label="activity" on={tab === 'activity'} onPress={() => onChange('activity')} />
    </View>
  );
}

function Word({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
  const Label = on ? MonoMedium : Mono;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.word, on && styles.on]}
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
  word: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  on: { borderBottomColor: colors.paper },
  paper: {
    marginTop: 18, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.paper,
    borderTopLeftRadius: 18, borderTopRightRadius: 22, borderBottomRightRadius: 20, borderBottomLeftRadius: 16,
  },
});
