import { View } from 'react-native';
import type { List } from '@/api/db';
import { folderColor, gridCovers } from '@/theme';
import { ListFolderCard } from './ListFolderCard';
import { useScheme } from './Surface';

/** Two columns of list folders, as on a profile. */
export function FolderGrid({ rows, own }: { rows: { list: List; invited: boolean }[]; own?: boolean }) {
  const scheme = useScheme();
  // no two folders side by side, above and below, or diagonal get the same cover
  const covers = gridCovers(rows.map((r) => ({ id: r.list.id, on: folderColor(r.list.id, scheme, r.invited) })), scheme);
  const pairs: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2));
  return (
    <View style={{ gap: 22, marginTop: 22 }}>
      {pairs.map((pair, p) => (
        <View key={pair[0].list.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          {pair.map((r, i) => <ListFolderCard key={r.list.id} list={r.list} invited={r.invited} own={own} index={p * 2 + i} cover={covers[p * 2 + i]} />)}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
