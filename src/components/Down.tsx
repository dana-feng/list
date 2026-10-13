import { View } from 'react-native';
import { useDb } from '@/api/db';
import { getItem, interestedPeople, isInterested, isInvitedTo, toggleInterest } from '@/api/items';
import { isMember } from '@/api/lists';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { Pill } from './Button';
import { Mono } from './Text';

/** Whether you can say you're down: an open invite that includes you, still open, on someone else's list. */
export function canSayDown(itemId: string) {
  const item = getItem(itemId);
  return !!item && isInvitedTo(itemId) && !isMember(item.list_id);
}

/** "interested" on an open invite: an outline until you tap it, filled in once you are. Hidden on your own lists and on anything not asked about. */
export function DownButton({ itemId }: { itemId: string }) {
  useDb();
  if (!canSayDown(itemId)) return null;
  const on = isInterested(itemId);
  const title = getItem(itemId)?.title ?? '';
  return (
    <Pill
      label="interested"
      on={on}
      filled={on}
      onPress={() => toggleInterest(itemId)}
      accessibilityLabel={on ? `You're interested in ${title}. Tap to take it back` : `I'm interested in ${title}`}
    />
  );
}

/** "3 interested", or nothing when no one is yet. */
export function downText(itemId: string) {
  const n = interestedPeople(itemId).length;
  return n ? `${n} interested` : '';
}

export function DownCount({ itemId, size = 11, faces = 20 }: { itemId: string; size?: number; faces?: number }) {
  useDb();
  const people = interestedPeople(itemId);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      {people.length && faces ? <AvatarStack people={people} size={faces} max={3} /> : null}
      <Mono size={size} color={colors.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{downText(itemId)}</Mono>
    </View>
  );
}
