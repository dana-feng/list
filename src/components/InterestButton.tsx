import { Pressable, View } from 'react-native';
import { useDb } from '@/api/db';
import { getItem, interestedPeople, isInterested, toggleInterest } from '@/api/items';
import { isMember } from '@/api/lists';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Mono, SansBold } from './Text';

/** Star + "interested?". Gold once tapped; hidden on your own things and on things nobody asked about. */
export function InterestButton({ itemId, showCount }: { itemId: string; showCount?: boolean }) {
  useDb();
  const item = getItem(itemId);
  if (!item || !item.open_invite || isMember(item.list_id)) return null;
  const on = isInterested(itemId);
  const count = interestedPeople(itemId).length;
  return (
    <Pressable
      onPress={() => toggleInterest(itemId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? 'Interested. Tap to undo' : 'Interested?'}
      style={{ alignItems: 'center', minWidth: 76 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="star" size={24} color={on ? colors.goldDeep : colors.ink} fill={on ? colors.gold : 'none'} />
        {showCount && count > 0 ? <SansBold size={14}>{count}</SansBold> : null}
      </View>
      <Mono size={10.5} color={colors.inkSoft} style={{ marginTop: 3 }}>{on ? 'interested' : 'interested?'}</Mono>
    </Pressable>
  );
}
