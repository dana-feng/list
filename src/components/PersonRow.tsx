import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db, Profile, useDb } from '@/api/db';
import { isFollowing, toggleFollow } from '@/api/profiles';
import { cardFills, colors } from '@/theme';
import { Avatar } from './Avatar';
import { Pill } from './Button';
import { Paper } from './Paper';
import { Hand, Mono } from './Text';

/** "follow" (dark) / "following" (outlined). Nothing on your own row. */
export function FollowButton({ userId }: { userId: string }) {
  useDb();
  if (userId === db.me) return null;
  const on = isFollowing(userId);
  return <Pill label={on ? 'following' : 'follow'} on={on} height={36} onPress={() => toggleFollow(userId)} accessibilityLabel={on ? 'Following. Tap to unfollow' : 'Follow'} />;
}

export const openProfile = (p: Profile) => router.push(p.id === db.me ? '/me' : `/user/${p.username}`);

/** A person on a slip of paper: face, name, @username, a short line, and a follow button (or whatever `right` is). */
export function PersonRow({ person, index, sub, right, onPress }: { person: Profile; index: number; sub?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Paper fill={cardFills[(index + 1) % cardFills.length]} shape={index} lean={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingLeft: 12 }}>
      <Pressable onPress={onPress ?? (() => openProfile(person))} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="button" accessibilityLabel={`${person.name}, @${person.username}`}>
        <Avatar person={person} size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Hand size={17}>{person.name}</Hand>
            <Mono size={10.5} color={colors.inkSoft}>@{person.username}</Mono>
          </View>
          {sub ? <Mono size={10.5} color={colors.inkSoft}>{sub}</Mono> : null}
        </View>
      </Pressable>
      {right === undefined ? <FollowButton userId={person.id} /> : right}
    </Paper>
  );
}
