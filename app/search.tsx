import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { listsForProfile } from '@/api/lists';
import { isFollowing, searchPeople } from '@/api/profiles';
import { BackButton } from '@/components/Header';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Mono, Sans } from '@/components/Text';
import { colors, space } from '@/theme';

/** People by name or @username. */
export default function Search() {
  useDb();
  const [q, setQ] = useState('');
  const people = searchPeople(q);
  return (
    <Screen
      tabBar="home"
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, marginBottom: space.lg }}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <SearchField value={q} onChange={setQ} placeholder="name or @username" autoFocus strong />
          </View>
        </View>
      }
    >
      <Mono size={13} style={{ marginBottom: space.sm }}>people</Mono>
      {people.map((p, i) => {
        const lists = isFollowing(p.id) ? listsForProfile(p.id).length : 0;
        return (
          <View key={p.id} style={{ borderTopWidth: i ? 1.5 : 0, borderTopColor: colors.line, paddingVertical: 4 }}>
            <PersonRow person={p} inline note={lists ? `${lists} ${lists === 1 ? 'list' : 'lists'}` : undefined} onPress={() => router.push(`/user/${p.username}`)} />
          </View>
        );
      })}
      {q.trim() && !people.length ? <Sans color={colors.inkSoft} style={{ marginTop: space.md }}>No one by that name yet.</Sans> : null}
      {!q.trim() ? <Sans color={colors.inkSoft} style={{ marginTop: space.md }}>Type a name or username.</Sans> : null}
    </Screen>
  );
}
