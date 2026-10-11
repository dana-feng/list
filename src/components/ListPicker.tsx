import { Pressable, StyleSheet, View } from 'react-native';
import type { List } from '@/api/db';
import { listProgress, myLists } from '@/api/lists';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { Label, Mono, MonoMedium } from './Text';

/** Inside the folder tab on a new item: the chosen list (dashed underline) and a chevron. */
export function ListPickerTab({ list, open, onPress }: { list?: List; open: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`Which list: ${list?.title ?? 'none picked'}`}>
      <MonoMedium size={12} numberOfLines={1} style={{ flexShrink: 1 }}>{list ? list.title : 'pick a list'}</MonoMedium>
      <Icon name="down" size={13} strokeWidth={2.2} />
    </Pressable>
  );
}

/** "add it to": your lists, how far along each is, and "+ start a new list". */
export function ListPicker({ value, onPick, onNew }: { value?: string; onPick: (list: List) => void; onNew: () => void }) {
  const lists = myLists();
  return (
    <Paper fill={colors.cream} edge="ink" shape={3} style={styles.box}>
      <Label size={10.5} style={{ marginHorizontal: 8, marginTop: 4, marginBottom: 6 }}>add it to</Label>
      {lists.map((l) => {
        const { done, total } = listProgress(l.id);
        const on = l.id === value;
        return (
          <Pressable key={l.id} onPress={() => onPick(l)} style={[styles.row, on && { backgroundColor: colors.sage }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Mono size={12.5} numberOfLines={1}>{l.title}</Mono>
              <Mono size={10} color={colors.inkSoft}>{done ? `${done} of ${total} done` : `${total} to do`}</Mono>
            </View>
            {on ? <Icon name="check" size={16} strokeWidth={2.2} /> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={onNew} style={styles.newRow} accessibilityRole="button">
        <Mono size={12}>+ start a new list</Mono>
      </Pressable>
    </Paper>
  );
}

const styles = StyleSheet.create({
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1.4, borderStyle: 'dashed', borderColor: colors.ink, maxWidth: 280, minHeight: 28 },
  box: {
    position: 'absolute', top: 0, left: 2, width: 260, zIndex: 20, padding: 8, borderTopLeftRadius: 6,
    shadowColor: '#3A1000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 10, borderRadius: 8 },
  newRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, marginTop: 4, borderTopWidth: 1.2, borderStyle: 'dashed', borderColor: colors.rule },
});
