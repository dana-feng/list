import { Pressable } from 'react-native';
import { useDb } from '@/api/db';
import { isFollowing, toggleFollow } from '@/api/profiles';
import { colors } from '@/theme';
import { SansBold } from './Text';

/** Dark "Follow" / grey "Following". */
export function FollowButton({ userId }: { userId: string }) {
  const db = useDb();
  if (userId === db.me) return null;
  const on = isFollowing(userId);
  return (
    <Pressable
      onPress={() => toggleFollow(userId)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Following. Tap to unfollow' : 'Follow'}
      style={{ paddingHorizontal: 12, height: 36, minWidth: 84, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'transparent' : colors.dark }}
    >
      <SansBold size={14.5} color={on ? colors.inkSoft : colors.onDark}>{on ? 'Following' : 'Follow'}</SansBold>
    </Pressable>
  );
}
