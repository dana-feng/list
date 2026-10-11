import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '@/api/db';
import { interestedPeople } from '@/api/items';
import { listPeople } from '@/api/lists';
import { monthDay, shortDay } from '@/lib';
import { colors, space } from '@/theme';
import { db } from '@/api/db';
import { AskButton } from './AskButton';
import { Checkbox } from './Checkbox';
import { InterestButton } from './InterestButton';
import { Mono, Serif } from './Text';

/** One thing on a list: open (yours), open (a friend's), or done. */
export function ItemRow({ item, member, onCheck }: { item: Item; member: boolean; onCheck?: (item: Item) => void }) {
  const done = !!item.done_at;
  const meta: string[] = [];
  if (member) {
    const others = listPeople(item.list_id).filter((p) => p.id !== db.me);
    if (others.length) meta.push(`with ${others.map((p) => p.name).join(' + ')}`);
  }
  if (done) meta.push(monthDay(item.done_at!));
  else {
    if (item.date && !member) meta.push(shortDay(item.date));
    if (member) {
      const stars = interestedPeople(item.id).length;
      if (stars) meta.push(`★ ${stars}`);
      if (item.asking) meta.push('on the feed');
    }
  }
  return (
    <View style={[styles.row, done ? styles.done : styles.open]}>
      {member ? <Checkbox checked={done} onPress={() => onCheck?.(item)} label={done ? `Undo ${item.title}` : `Mark ${item.title} done`} /> : null}
      <Pressable style={styles.text} onPress={() => router.push(`/item/${item.id}`)} accessibilityRole="button">
        <Serif size={18} color={done ? colors.inkSoft : colors.ink} style={done && { textDecorationLine: 'line-through' }}>
          {item.title}
        </Serif>
        {meta.length ? <Mono color={colors.inkSoft} style={{ marginTop: 3 }}>{meta.join(' · ')}</Mono> : null}
      </Pressable>
      {done ? null : member ? <AskButton itemId={item.id} /> : <InterestButton itemId={item.id} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: 16, marginBottom: 10, minHeight: 56 },
  text: { flex: 1, paddingVertical: 14, justifyContent: 'center' },
  open: { backgroundColor: colors.cream, borderBottomWidth: 2, borderBottomColor: 'rgba(43,53,36,0.12)' },
  done: { backgroundColor: colors.doneCard },
});
