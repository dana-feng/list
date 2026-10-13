import { useState } from 'react';
import { View } from 'react-native';
import { useDb } from '@/api/db';
import { searchPeople } from '@/api/profiles';
import { FolderTab } from '@/components/FolderTab';
import { BackButton } from '@/components/Header';
import { PeopleList } from '@/components/PeopleList';
import { FolderScreen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Hand } from '@/components/Text';
import { colors } from '@/theme';

/** People by name or @username. */
export default function Search() {
  useDb();
  const [q, setQ] = useState('');
  const term = q.trim();
  const people = searchPeople(q);
  return (
    <FolderScreen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 18 }}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <SearchField tone="paper" value={q} onChange={setQ} placeholder="find people" autoFocus />
          </View>
        </View>
      }
      folderTabs={<FolderTab label={term ? `people · “${term}”` : 'people'} />}
    >
      <PeopleList people={people} notes />
      {term && !people.length ? (
        <Hand size={20} center color={colors.inkSoft} style={{ marginTop: 30, lineHeight: 26 }}>no one by that name yet</Hand>
      ) : null}
    </FolderScreen>
  );
}
