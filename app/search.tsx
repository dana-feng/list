import { useState } from 'react';
import { View } from 'react-native';
import { useDb } from '@/api/db';
import { searchPeople } from '@/api/profiles';
import { FolderTab } from '@/components/FolderTab';
import { Header } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
import { FolderScreen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Mono } from '@/components/Text';
import { colors } from '@/theme';

/** People by name or @username. */
export default function Search() {
  useDb();
  const [q, setQ] = useState('');
  const term = q.trim();
  const people = searchPeople(q);
  return (
    <FolderScreen
      header={<Header />}
      folderTabs={<FolderTab label={term ? `people · “${term}”` : 'people'} />}
    >
      <View style={{ marginBottom: 14 }}>
        <SearchField value={q} onChange={setQ} placeholder="find people" autoFocus />
      </View>
      <PeopleList people={people} notes />
      {term && !people.length ? (
        <Mono size={12} center color={colors.inkSoft} style={{ marginTop: 24 }}>no results</Mono>
      ) : null}
    </FolderScreen>
  );
}
