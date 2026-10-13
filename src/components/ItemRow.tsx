import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '@/api/db';
import { interestedPeople, isInvitedTo, toggleOpenInvite } from '@/api/items';
import { monthDay, shortDay } from '@/lib';
import { colors, corners, hash, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { DownButton, downText } from './Down';
import { Icon } from './Icon';
import { useReorderHandle } from './Reorderable';
import { Circle, Strike } from './Scribble';
import { Switch } from './Switch';
import { Hand, HandMedium, Mono } from './Text';

type OpenProps = {
  item: Item;
  index: number;
  /** On the list: you get the circle and the invite switch. Otherwise "interested". */
  member: boolean;
  /** Tapping the circle. */
  onDone?: () => void;
  /** Editing the list: an × to take it off instead of everything else. */
  onRemove?: () => void;
};

/** Something still to do. Tap the circle to cross it off. */
export function OpenRow({ item, index, member, onDone, onRemove }: OpenProps) {
  // inside a Reorderable: holding the row picks it up to drag somewhere else on the list
  const handle = useReorderHandle();
  const onHold = handle?.hold;
  const onMove = handle?.move;
  const open = () => router.push(`/item/${item.id}`);
  const down = item.open_invite ? interestedPeople(item.id) : [];
  // on someone else's list, it's only an open invite for you if you're in its audience
  const invited = !member && isInvitedTo(item.id);

  // a friend's list: date + open invite in the small line, "interested" on the right
  const sub = member
    ? item.open_invite ? downText(item.id) : ''
    : [item.date ? shortDay(item.date) : 'no date yet', invited ? ['open invite', downText(item.id)].filter(Boolean).join(' · ') : null].filter(Boolean).join(' · ');

  return (
    <View style={tilt(index)}>
      <View style={[styles.row, corners(index), { backgroundColor: colors.sage, borderColor: colors.ink, borderWidth: 1.5 }]}>
        {member && !onRemove ? (
          <Pressable onPress={onDone} onLongPress={onHold} delayLongPress={350} style={styles.circle} accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`Mark ${item.title} done`}>
            <Circle />
          </Pressable>
        ) : null}
        <Pressable
          onPress={open}
          onLongPress={onHold}
          delayLongPress={350}
          style={[styles.text, !member && { paddingLeft: 6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          accessibilityHint={onHold ? 'Press and hold, then drag to move it up or down the list' : undefined}
          accessibilityActions={onMove ? [{ name: 'up', label: 'Move up' }, { name: 'down', label: 'Move down' }] : undefined}
          onAccessibilityAction={onMove ? (e) => onMove(e.nativeEvent.actionName === 'up' ? -1 : 1) : undefined}
        >
          <Hand size={18}>{item.title}</Hand>
          {sub ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(member || invited) && down.length ? <AvatarStack people={down} size={19} max={3} /> : null}
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
            <Switch on={item.open_invite} onPress={() => toggleOpenInvite(item.id)} label={item.open_invite ? 'Open invite is on. Turn off' : 'Post as an open invite'} text="invite" stacked />
            <Pressable onPress={open} onLongPress={onHold} delayLongPress={350} style={styles.chevron} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
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
    </View>
  );
}

/** Something crossed off: gold, struck through, when. Tap the circle to un-cross (if it's yours). */
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
  chevron: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingVertical: 8, paddingLeft: 6, paddingRight: 14, minHeight: 48 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bark, alignItems: 'center', justifyContent: 'center' },
});
