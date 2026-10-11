import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { List } from '@/api/db';
import { listProgress, myLists } from '@/api/lists';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { SearchField } from './SearchField';
import { Mono, SansBold } from './Text';

/** What sits inside the folder tab on a new thing: the chosen list, or "pick a list". */
export function ListPickerTab({ list }: { list?: List }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Mono size={12.5}>{list ? list.title : 'pick a list'}</Mono>
      <Icon name="down" size={13} />
    </View>
  );
}

/** The dropdown under that tab: search, recent lists, + new list. */
export function ListPicker({ onPick, onNew }: { onPick: (list: List) => void; onNew: () => void }) {
  const [q, setQ] = useState('');
  const lists = myLists().filter((l) => l.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <View style={styles.box}>
      <View style={styles.search}>
        <SearchField value={q} onChange={setQ} placeholder="search your lists" />
      </View>
      <Mono color={colors.inkSoft} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>{q ? 'matches' : 'recent'}</Mono>
      {lists.map((l) => {
        const { done, total } = listProgress(l.id);
        return (
          <Pressable key={l.id} onPress={() => onPick(l)} style={styles.row} accessibilityRole="button">
            <SansBold size={16} style={{ flex: 1 }}>{l.title}</SansBold>
            <Mono color={colors.inkSoft}>{done}/{total}</Mono>
          </Pressable>
        );
      })}
      <Pressable onPress={onNew} style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 6 }]} accessibilityRole="button">
        <SansBold size={16}>+ new list</SansBold>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute', top: 0, left: 0, right: 24, zIndex: 10, backgroundColor: colors.paper, borderRadius: 18, borderTopLeftRadius: 0,
    borderWidth: 1.5, borderColor: colors.ink, paddingBottom: 6,
    shadowColor: '#1B2414', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  search: { padding: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
});
