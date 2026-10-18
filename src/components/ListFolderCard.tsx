import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, List } from '@/api/db';
import { isInvitedTo } from '@/api/items';
import { invitedBy, listPeople, listProgress, progressLabel, respondInvite, visibilityLabel } from '@/api/lists';
import { hold, toggle } from '@/haptics';
import { colors, folderFills, hash, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { Icon } from './Icon';
import { ListPeek } from './ListPeek';
import { Pill } from './Button';
import { ProgressBar } from './ProgressBar';
import { choiceIcon } from './VisibilityPicker';
import { Hand, Mono, MonoMedium } from './Text';

/** Open invites on the list that include you. */
const openInviteCount = (listId: string) => db.items.filter((i) => i.list_id === listId && isInvitedTo(i.id)).length;

/**
 * A list as a folder on a profile: a tab with how far along it is, a cover placeholder, the name and a progress bar.
 * `invited` is the olive "invited" folder with join / no. Who's on it always shows; `own` adds who can see it.
 */
export function ListFolderCard({ list, invited, own, index }: { list: List; invited?: boolean; own?: boolean; index: number }) {
  const { done, total } = listProgress(list.id);
  const fill = invited ? colors.cream : folderFills[hash(list.id) % folderFills.length];
  const inviter = invitedBy(list.id);
  const invites = own ? 0 : openInviteCount(list.id);
  const pct = total ? Math.round((100 * done) / total) : 0;
  const open = () => router.push(`/list/${list.id}`);
  // press and hold one of your own lists to bring it up close, with delete underneath
  const [peeking, setPeeking] = useState(false);
  const [press] = useState(() => new Animated.Value(1));
  const canPeek = !!own && !invited;
  // the folder sinks while you hold it, then a tap from the phone as it comes up
  const sink = (to: number) => Animated.spring(press, { toValue: to, useNativeDriver: true, friction: 8, tension: to < 1 ? 40 : 120 }).start();
  const peek = () => {
    hold();
    sink(1);
    setPeeking(true);
  };

  return (
    <View style={[{ flex: 1 }, invited ? null : tilt(index)]}>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <View style={[styles.tab, { backgroundColor: invited ? colors.olive : fill, borderColor: invited ? colors.olive : colors.paper }]}>
          <MonoMedium size={11} color={invited ? colors.paper : colors.ink}>{invited ? 'invited' : progressLabel(list.id)}</MonoMedium>
        </View>
        <Pressable
          onPress={open}
          onLongPress={canPeek ? peek : undefined}
          delayLongPress={350}
          onPressIn={canPeek ? () => sink(0.94) : undefined}
          onPressOut={canPeek ? () => sink(1) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Open ${list.title}`}
          accessibilityHint={canPeek ? 'Press and hold for a closer look and to delete' : undefined}
          style={[styles.body, { backgroundColor: fill, borderColor: invited ? colors.olive : colors.paper, borderWidth: invited ? 2 : 1.6 }]}
        >
          {/* placeholder until lists get their own cover images */}
          <View style={[styles.cover, { backgroundColor: invited ? colors.sage : fill === colors.paper ? colors.sage : colors.paper }]}>
            <Icon name="image" size={22} />
          </View>
          <Hand size={17} style={{ lineHeight: 19 }}>{list.title}</Hand>
          {invited ? (
            <>
              <Mono size={10.5}>{inviter ? `${inviter.name} invited you` : 'you were invited'}</Mono>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                <Pill label="join" height={34} onPress={() => { toggle(true); respondInvite(list.id, true); }} accessibilityLabel={`Join ${list.title}`} />
                <Pill label="no" on height={34} onPress={() => { toggle(false); respondInvite(list.id, false); }} accessibilityLabel={`Say no to ${list.title}`} />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ProgressBar done={done} total={total} />
                {own ? null : <Mono size={10}>{pct}%</Mono>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <AvatarStack people={listPeople(list.id)} size={22} max={3} />
                {own ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }} accessibilityLabel={`Who can see it: ${visibilityLabel(list)}`}>
                    <Icon name={choiceIcon(list.visibility)} size={12} strokeWidth={1.8} />
                    <Mono size={10} numberOfLines={1} style={{ flexShrink: 1 }}>{visibilityLabel(list)}</Mono>
                  </View>
                ) : invites ? (
                  <View style={styles.chip}>
                    <Mono size={10} color={colors.paper}>{invites} open invite{invites > 1 ? 's' : ''}</Mono>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>
      {peeking ? <ListPeek list={list} onOpen={() => { setPeeking(false); open(); }} onClose={() => setPeeking(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { alignSelf: 'flex-start', height: 32, minWidth: 64, paddingHorizontal: 12, justifyContent: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 12, borderWidth: 1.6, borderBottomWidth: 0, marginBottom: -1.6, zIndex: 2 },
  body: { padding: 12, paddingBottom: 10, gap: 8, borderTopLeftRadius: 0, borderTopRightRadius: 14, borderBottomRightRadius: 12, borderBottomLeftRadius: 15 },
  cover: { height: 66, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: colors.bark },
});
