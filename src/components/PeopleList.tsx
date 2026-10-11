import { View } from 'react-native';
import { router } from 'expo-router';
import { db, Profile } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { isFollowing } from '@/api/profiles';
import { colors } from '@/theme';
import { PersonRow } from './PersonRow';

/** Divided rows of people, each with a Follow button; tapping one opens their profile. */
export function PeopleList({ people }: { people: Profile[] }) {
  return (
    <>
      {people.map((p, i) => {
        const lists = isFollowing(p.id) ? listsForProfile(p.id).length : 0;
        return (
          <View key={p.id} style={{ borderTopWidth: i ? 1.5 : 0, borderTopColor: colors.line, paddingVertical: 4 }}>
            <PersonRow
              person={p}
              inline
              note={lists ? `${lists} ${lists === 1 ? 'list' : 'lists'}` : undefined}
              onPress={() => router.push(p.id === db.me ? '/me' : `/user/${p.username}`)}
            />
          </View>
        );
      })}
    </>
  );
}
