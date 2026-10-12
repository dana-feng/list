import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '@/api/db';
import { interestedPeople, isInvitedTo, toggleOpenInvite } from '@/api/items';
import { monthDay, shortDay } from '@/lib';
import { colors, corners, hash, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { DownButton, downText } from './Down';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Circle, Strike } from './Scribble';
import { ScribblePad } from './ScribblePad';
import { Hand, HandMedium, Mono, MonoMedium } from './Text';

type OpenProps = {
  item: Item;
  index: number;
  /** On the list: you get the circle, the scribble and the invite chip. Otherwise "i'm down". */
  member: boolean;
  armed?: boolean;
  /** Shake-free nudge after a scribble that didn't reach far enough. */
  nudge?: boolean;
  onArm?: () => void;
  onScribble?: (crossed: boolean) => void;
  /** Editing the list: an × to take it off instead of everything else. */
  onRemove?: () => void;
};

/** Something still to do. Tap the circle, then scribble across the card to cross it off. */
export function OpenRow({ item, index, member, armed, nudge, onArm, onScribble, onRemove }: OpenProps) {
  const open = () => router.push(`/item/${item.id}`);
  const down = item.open_invite ? interestedPeople(item.id) : [];
  // on someone else's list, it's only an open invite for you if you're in its audience
  const invited = !member && isInvitedTo(item.id);

  // a friend's list: date + open invite in the small line, "i'm down" on the right
  const sub = member
    ? item.open_invite ? downText(item.id) : ''
    : [item.date ? shortDay(item.date) : 'no date yet', invited ? `open invite · ${interestedPeople(item.id).length} down` : null].filter(Boolean).join(' · ');

  return (
    <ScribblePad armed={!!armed} onFinish={(crossed) => onScribble?.(crossed)} leftGap={52} style={tilt(index)}>
      <View
        style={[styles.row, corners(index), { backgroundColor: colors.sage, borderColor: armed ? colors.bark : colors.ink, borderWidth: armed ? 2.2 : 1.5 }]}
      >
        {member && !onRemove ? (
          <Pressable
            onPress={onArm}
            style={styles.circle}
            accessibilityActions={[{ name: 'markDone', label: `Mark ${item.title} done now` }]}
            onAccessibilityAction={(e) => e.nativeEvent.actionName === 'markDone' && onScribble?.(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: armed }} accessibilityLabel={armed ? `Cancel crossing off ${item.title}` : `Cross off ${item.title}: tap, then scribble across it`}>
            <Circle filled={armed} />
          </Pressable>
        ) : null}
        <Pressable onPress={open} disabled={armed} style={[styles.text, !member && { paddingLeft: 6 }]} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
          <Hand size={18}>{item.title}</Hand>
          {armed ? (
            <MonoMedium size={11} color={colors.bark}>{nudge ? 'almost — scribble all the way across' : 'now scribble across it →'}</MonoMedium>
          ) : sub ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {member && down.length ? <AvatarStack people={down} size={19} max={3} /> : null}
              <Mono size={11} color={colors.inkSoft}>{sub}</Mono>
            </View>
          ) : null}
        </Pressable>
        {onRemove ? (
          <Pressable onPress={onRemove} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`}>
            <View style={styles.removeDot}><Icon name="x" size={14} color={colors.paper} strokeWidth={2.6} /></View>
          </Pressable>
        ) : member ? (
          <>
            <Paper
              onPress={() => toggleOpenInvite(item.id)}
              fill={item.open_invite ? colors.bark : undefined}
              edge={item.open_invite ? 'none' : 'dash'}
              shape={5}
              round={1.4}
              accessibilityRole="switch"
              accessibilityState={{ checked: item.open_invite }}
              accessibilityLabel={item.open_invite ? 'Open invite is on. Turn off' : 'Post as an open invite'}
              style={styles.chip}
            >
              <Mono size={11} color={item.open_invite ? colors.paper : colors.ink}>{item.open_invite ? 'open invite' : 'invite'}</Mono>
            </Paper>
            <Pressable onPress={open} style={styles.chevron} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
              <Icon name="right" size={16} strokeWidth={2.2} />
            </Pressable>
          </>
        ) : invited ? (
          <DownButton itemId={item.id} />
        ) : (
          <Pressable onPress={open} style={styles.chevron} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
            <Icon name="right" size={16} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </ScribblePad>
  );
}

/** Something crossed off: gold, the scribble over its name, when. Tap the circle to un-cross (if it's yours). */
export function DoneRow({ item, index, onUndo, onRemove }: { item: Item; index: number; onUndo?: () => void; onRemove?: () => void }) {
  return (
    <View style={[styles.done, corners(index + 1), tilt(index + 2)]}>
      {onUndo && !onRemove ? (
        <Pressable onPress={onUndo} style={styles.circle} accessibilityRole="button" accessibilityLabel={`Done: ${item.title}. Tap to un-cross`}>
          <Circle filled />
        </Pressable>
      ) : null}
      <Pressable onPress={() => router.push(`/item/${item.id}`)} style={{ flex: 1, flexDirection: 'row', paddingLeft: onUndo ? 0 : 8 }} accessibilityRole="button" accessibilityLabel={`${item.title}, done`}>
        <View>
          <HandMedium size={15}>{item.title}</HandMedium>
          <Strike seed={hash(item.id) % 97} />
        </View>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`}>
          <View style={styles.removeDot}><Icon name="x" size={14} color={colors.paper} strokeWidth={2.6} /></View>
        </Pressable>
      ) : (
        <Mono size={11} color={colors.inkSoft}>{monthDay(item.done_at!)}</Mono>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingLeft: 8, paddingRight: 6, minHeight: 64 },
  circle: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4, paddingVertical: 2 },
  chip: { height: 32, paddingHorizontal: 10, justifyContent: 'center' },
  chevron: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingVertical: 8, paddingLeft: 6, paddingRight: 14, minHeight: 48 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bark, alignItems: 'center', justifyContent: 'center' },
});
