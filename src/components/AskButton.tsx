import { Pressable } from 'react-native';
import { useDb } from '@/api/db';
import { getItem, toggleOpenInvite } from '@/api/items';
import { colors } from '@/theme';
import { Icon } from './Icon';

/** The paper plane that puts a thing on Open Invite. Filled while it's out there. */
export function AskButton({ itemId }: { itemId: string }) {
  useDb();
  const item = getItem(itemId);
  if (!item || item.done_at) return null;
  return (
    <Pressable
      onPress={() => toggleOpenInvite(itemId)}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityState={{ checked: item.open_invite }}
      accessibilityLabel="Ask who's in"
    >
      <Icon name="plane" size={22} color={colors.ink} fill={item.open_invite ? colors.ink : 'none'} />
    </Pressable>
  );
}
