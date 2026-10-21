import { useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useDb } from '@/api/db';
import { getItem, interestedPeople, isInterested, isInvitedTo, toggleInterest } from '@/api/items';
import { isMember } from '@/api/lists';
import { toggle } from '@/haptics';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { Logo } from './Logo';
import { Mono } from './Text';

/** Whether you can say you're down: an open invite that includes you, still open, on someone else's list. */
export function canSayDown(itemId: string) {
  const item = getItem(itemId);
  return !!item && isInvitedTo(itemId) && !isMember(item.list_id);
}

/**
 * On an open invite: the echi logo (the one for light or dark mode) is the "i'm interested" button. Faded until you
 * tap it, then full strength (with a little pop). Hidden on your own lists and on anything not asked about.
 */
export function DownButton({ itemId, size = 40 }: { itemId: string; size?: number }) {
  useDb();
  const [pop] = useState(() => new Animated.Value(1));
  if (!canSayDown(itemId)) return null;
  const on = isInterested(itemId);
  const title = getItem(itemId)?.title ?? '';
  return (
    <Pressable
      onPress={() => {
        toggle(!on);
        toggleInterest(itemId);
        pop.setValue(on ? 0.9 : 1.25);
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
      }}
      hitSlop={6}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? `You're interested in ${title}. Tap to take it back` : `I'm interested in ${title}`}
    >
      <Animated.View style={{ transform: [{ scale: pop }], opacity: on ? 1 : 0.4 }}>
        <Logo size={size} />
      </Animated.View>
    </Pressable>
  );
}

/** What the interested button says, before and after you've said you are. */
export const interestLabel = (on: boolean) => (on ? "you're interested" : "i'm interested");

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
