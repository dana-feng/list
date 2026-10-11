import { View } from 'react-native';
import type { List } from '@/api/db';
import { space } from '@/theme';
import { ListFolderCard } from './ListFolderCard';

/** Two columns of list folders, as on a profile. */
export function FolderGrid({ rows, own }: { rows: { list: List; invited: boolean }[]; own?: boolean }) {
  const columns = [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 2 === 1)];
  return (
    <View style={{ flexDirection: 'row', gap: space.md, marginHorizontal: -4 }}>
      {columns.map((col, c) => (
        <View key={c} style={{ flex: 1 }}>
          {col.map((r) => (
            <ListFolderCard key={r.list.id} list={r.list} invited={r.invited} own={own} />
          ))}
        </View>
      ))}
    </View>
  );
}
