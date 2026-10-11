import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item, List } from '@/api/db';
import { listPeople } from '@/api/lists';
import { dayParts } from '@/lib';
import { colors, space } from '@/theme';
import { AvatarStack } from './Avatar';
import { InterestButton } from './InterestButton';
import { Mono, SansBold, Serif } from './Text';

/** Date block, who, thing, list, star. */
export function OpenInviteRow({ item, list }: { item: Item; list: List }) {
  const people = listPeople(list.id);
  const date = item.date ? dayParts(item.date) : null;
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={() => router.push(`/item/${item.id}`)} accessibilityRole="button">
      {date ? (
        <View style={[styles.date, { backgroundColor: colors.gold }]}>
          <Mono size={10.5}>{date.weekday}</Mono>
          <Serif size={21} style={{ lineHeight: 23 }}>{date.day}</Serif>
        </View>
      ) : (
        <View style={[styles.date, styles.noDate]} accessibilityLabel="No date yet">
          <Serif size={20}>?</Serif>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <AvatarStack people={people} size={20} ring="rgba(247,242,227,0.5)" />
          <SansBold size={13.5}>{people.map((p) => p.name).join(' + ')}</SansBold>
        </View>
        <Serif size={20} style={{ lineHeight: 23 }}>{item.title}</Serif>
        <Mono color={colors.inkSoft} style={{ marginTop: 4 }}>{list.title}</Mono>
      </View>
      </Pressable>
      <InterestButton itemId={item.id} showCount />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: colors.line },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  date: { width: 50, height: 54, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noDate: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkSoft },
});
