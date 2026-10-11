import { View } from 'react-native';
import { useDb } from '@/api/db';
import { getItem, interestedPeople, isInterested, toggleInterest } from '@/api/items';
import { isMember } from '@/api/lists';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { Pill } from './Button';
import { Mono } from './Text';

/** Whether you can say you're down: it's an open invite, still open, and on someone else's list. */
export function canSayDown(itemId: string) {
  const item = getItem(itemId);
  return !!item && item.open_invite && !item.done_at && !isMember(item.list_id);
}

/** "i'm down" / "down ✓" on an open invite. Hidden on your own lists and on anything not asked about. */
export function DownButton({ itemId }: { itemId: string }) {
  useDb();
  if (!canSayDown(itemId)) return null;
  const on = isInterested(itemId);
  const title = getItem(itemId)?.title ?? '';
  return (
    <Pill
      label={on ? 'down ✓' : "i'm down"}
      on={on}
      onPress={() => toggleInterest(itemId)}
      accessibilityLabel={on ? `You're down for ${title}. Tap to take it back` : `I'm down for ${title}`}
    />
  );
}

/** "3 are down", "you + 2 more are down", or "no one yet", with faces. */
export function downText(itemId: string) {
  const people = interestedPeople(itemId);
  const n = people.length;
  if (!n) return 'no one yet';
  if (isInterested(itemId)) return n === 1 ? "you're down" : `you + ${n - 1} more are down`;
  return `${n} ${n === 1 ? 'is' : 'are'} down`;
}

export function DownCount({ itemId, size = 11, faces = 22 }: { itemId: string; size?: number; faces?: number }) {
  useDb();
  const people = interestedPeople(itemId);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      {people.length && faces ? <AvatarStack people={people} size={faces} max={4} /> : null}
      <Mono size={size} color={colors.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{downText(itemId)}</Mono>
    </View>
  );
}
