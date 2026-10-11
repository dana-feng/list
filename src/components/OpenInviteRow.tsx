import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Item, List } from '@/api/db';
import { photosFor } from '@/api/items';
import { listPeople } from '@/api/lists';
import { dayParts } from '@/lib';
import { colors, corners, tilt } from '@/theme';
import { DownButton, DownCount } from './Down';
import { Photo } from './Photo';
import { Hand, Mono } from './Text';

const STUBS = [colors.sage, colors.moss, colors.sage, colors.straw];

/** A ticket: the date stub on the left, then who, the item, how many are down, and "i'm down". */
export function OpenInviteRow({ item, list, index }: { item: Item; list: List; index: number }) {
  const people = listPeople(list.id);
  const date = item.date ? dayParts(item.date) : null;
  const photo = photosFor(item.id)[0];
  return (
    <View style={[styles.ticket, tilt(index, 0.8)]}>
      <View style={[styles.stub, { backgroundColor: STUBS[index % STUBS.length] }]} accessibilityLabel={date ? undefined : 'No date yet'}>
        <Mono size={10} style={{ letterSpacing: 1 }}>{date ? date.weekday.toLowerCase() : 'date'}</Mono>
        <Hand size={28} style={{ lineHeight: 30 }}>{date ? date.day : '?'}</Hand>
      </View>
      <View style={[corners(index), styles.body]}>
        {photo ? <Photo photo={photo} style={{ height: 132 }} /> : null}
        <Pressable onPress={() => router.push(`/item/${item.id}`)} style={{ gap: 3 }} accessibilityRole="button">
          <Mono size={10.5} color={colors.inkSoft} numberOfLines={1}>{people.map((p) => p.name).join(' + ')} · {list.title}</Mono>
          <Hand size={18}>{item.title}</Hand>
        </Pressable>
        <View style={styles.bottom}>
          <DownCount itemId={item.id} faces={0} />
          <DownButton itemId={item.id} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', minHeight: 104 },
  stub: {
    width: 66, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 11, borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  body: {
    flex: 1, marginLeft: -1.5, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.ink, padding: 12, paddingLeft: 14, gap: 8,
    borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
  },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 },
});
