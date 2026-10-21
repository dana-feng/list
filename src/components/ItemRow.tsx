import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '@/api/db';
import { companionsFor, giftOf, interestedPeople, isInvitedTo } from '@/api/items';
import { monthDay, names, shortDay } from '@/lib';
import { colors, corners, hash, tilt } from '@/theme';
import { AvatarStack } from './Avatar';
import { DownButton, downText } from './Down';
import { Icon } from './Icon';
import { useReorderHandle } from './Reorderable';
import { Circle, Strike } from './Scribble';
import { SwipeToDelete } from './SwipeToDelete';
import { Hand, HandMedium, Mono } from './Text';
import { Surface } from './Surface';

type OpenProps = {
  item: Item;
  /** On the list: you get the circle. Otherwise "interested". */
  member: boolean;
  /** Tapping the circle. */
  onDone?: () => void;
  /** Yours: slide the row left to delete it. */
  onDelete?: () => void;
};

/** Something still to do. Tap the circle to cross it off. */
export function OpenRow({ item, member, onDone, onDelete }: OpenProps) {
  // its tilt and corners come with it when it's dragged somewhere else, rather than from the spot it lands in
  const shape = hash(item.id);
  // inside a Reorderable: holding the row picks it up to drag somewhere else on the list
  const handle = useReorderHandle();
  const onHold = handle?.hold;
  const onMove = handle?.move;
  const open = () => router.push(`/item/${item.id}`);
  // on someone else's list, it's only an open invite for you if you're in its audience
  const invited = !member && isInvitedTo(item.id);
  const down = invited && item.open_invite ? interestedPeople(item.id) : [];

  // yours: just the title (the invite lives on the item). a friend's: date + open invite in the small line, "interested" on the right
  const sub = member
    ? ''
    : [
        item.date ? `due ${shortDay(item.date)}` : 'no due date',
        invited ? ['open invite', downText(item.id)].filter(Boolean).join(' · ') : null,
        item.tag === 'gift' ? `gift · ${giftOf(item.id).left} left` : item.tag === 'borrow' ? 'borrow' : null,
      ].filter(Boolean).join(' · ');

  return (
    <SwipeToDelete onDelete={member ? onDelete : undefined} label={item.title}>
    <Surface tone="light">
    <View style={tilt(shape)}>
      <View style={[styles.row, corners(shape), { backgroundColor: colors.sage, borderColor: colors.ink, borderWidth: 1.5 }]}>
        {member ? (
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
              {down.length ? <AvatarStack people={down} size={19} max={3} /> : null}
              <Mono size={11} color={colors.inkSoft}>{sub}</Mono>
            </View>
          ) : null}
        </Pressable>
        {member ? (
          <Pressable onPress={open} onLongPress={onHold} delayLongPress={350} style={styles.chevron} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
            <Icon name="right" size={16} strokeWidth={2.2} />
          </Pressable>
        ) : invited ? (
          <DownButton itemId={item.id} />
        ) : (
          <Pressable onPress={open} style={styles.chevron} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
            <Icon name="right" size={16} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    </View>
    </Surface>
    </SwipeToDelete>
  );
}

/** Something crossed off: gold, struck through, who it was done with, when. Tap the circle to un-cross (if it's yours). */
export function DoneRow({ item, index, onUndo, onDelete }: { item: Item; index: number; onUndo?: () => void; onDelete?: () => void }) {
  const withPeople = companionsFor(item.id);
  return (
    <SwipeToDelete onDelete={onDelete} label={item.title}>
    <Surface tone="light">
    <View style={[styles.done, corners(index + 1), tilt(index + 2)]}>
      {onUndo ? (
        <Pressable onPress={onUndo} style={styles.circle} accessibilityRole="button" accessibilityLabel={`Done: ${item.title}. Tap to un-cross`}>
          <Circle filled />
        </Pressable>
      ) : null}
      <Pressable onPress={() => router.push(`/item/${item.id}`)} style={{ flex: 1, flexDirection: 'row', paddingLeft: onUndo ? 0 : 8 }} accessibilityRole="button" accessibilityLabel={`${item.title}, done${withPeople.length ? ` with ${names(withPeople)}` : ''}`}>
        <View>
          <HandMedium size={15}>{item.title}</HandMedium>
          <Strike seed={hash(item.id) % 97} />
        </View>
      </Pressable>
      {withPeople.length ? <AvatarStack people={withPeople} size={19} max={3} /> : null}
      <Mono size={11} color={colors.inkSoft}>{monthDay(item.done_at!)}</Mono>
    </View>
    </Surface>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingLeft: 8, paddingRight: 6, minHeight: 64 },
  circle: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4, paddingVertical: 2 },
  chevron: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingVertical: 8, paddingLeft: 6, paddingRight: 14, minHeight: 48 },
});
