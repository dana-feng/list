import { useState } from 'react';
import { View } from 'react-native';
import { useDb } from '@/api/db';
import { searchPeople } from '@/api/profiles';
import { BackButton } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
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
      <PeopleList people={people} />
      {q.trim() && !people.length ? <Sans color={colors.inkSoft} style={{ marginTop: space.md }}>No one by that name yet.</Sans> : null}
      {!q.trim() ? <Sans color={colors.inkSoft} style={{ marginTop: space.md }}>Type a name or username.</Sans> : null}
    </Screen>
  );
}
