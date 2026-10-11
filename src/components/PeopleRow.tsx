import { ReactNode } from 'react';
import { View } from 'react-native';
import type { Profile } from '@/api/db';
import { names } from '@/lib';
import { colors, space } from '@/theme';
import { AvatarStack } from './Avatar';
import { Sans } from './Text';

/** Who's doing it, then who's interested + count. */
export function PeopleRow({ doing, interested, action }: { doing: Profile[]; interested: Profile[]; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 }}>
      <AvatarStack people={doing} size={34} ring={colors.cream} />
      {interested.length ? (
        <>
          <View style={{ width: 1.5, height: 30, backgroundColor: colors.line }} />
          <AvatarStack people={interested} size={30} ring={colors.cream} />
          <Sans size={14.5} color={colors.inkSoft} style={{ flex: 1 }}>{interested.length} interested</Sans>
        </>
      ) : (
        <Sans size={14.5} color={colors.inkSoft} style={{ flex: 1 }}>{doing.length > 1 ? names(doing) : ''}</Sans>
      )}
      {action}
    </View>
  );
}
