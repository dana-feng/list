import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { addPhoto, getItem, itemsForList, photosFor, updateItem } from '@/api/items';
import { getList, listPeople, listProgress } from '@/api/lists';
import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { goBack } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Photo } from '@/components/Photo';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold, Serif } from '@/components/Text';
import { monthDay, names } from '@/lib';
import { pickPhotos } from '@/pickPhotos';
import { colors, fonts, noOutline, space } from '@/theme';

/** "You did it" for a thing, or "you finished" for a whole list (?kind=list, id = the list). */
export default function Done() {
  const db = useDb();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  return kind === 'list' ? <ListDone listId={id} /> : <ThingDone itemId={id} me={db.me} />;
}

function Close() {
  return (
    <View style={{ alignItems: 'flex-end', paddingHorizontal: space.xl, minHeight: 44, justifyContent: 'center' }}>
      <Pressable onPress={goBack} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
        <Icon name="x" size={26} color={colors.onDark} />
      </Pressable>
    </View>
  );
}

function ThingDone({ itemId, me }: { itemId: string; me: string }) {
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  const [picked, setPicked] = useState<string[]>([]);
  const [caption, setCaption] = useState(item?.caption ?? '');
  if (!item || !list) return <Screen tone="night" header={<Close />}><Sans color={colors.onDark}>Nothing here.</Sans></Screen>;

  const people = listPeople(list.id);
  const others = people.filter((p) => p.id !== me);
  const { done, total } = listProgress(list.id);

  const post = () => {
    picked.forEach((uri) => addPhoto(item.id, uri));
    if (caption.trim()) updateItem(item.id, { caption: caption.trim() });
    if (list.completed_at) router.replace(`/done/${list.id}?kind=list`);
    else goBack();
  };

  return (
    <Screen tone="night" header={<Close />} footer={<Button label="Post" tone="gold" onPress={post} />}>
      <View style={{ alignItems: 'center' }}>
        <AvatarStack people={people} size={62} ring={colors.cream} />
        <Serif size={44} color={colors.onDark} style={{ marginTop: space.md }}>you did it</Serif>
        <Sans size={18} color={colors.onDark} center style={{ marginTop: 2 }}>{item.title}</Sans>
        <View style={{ width: '64%', marginTop: space.md }}>
          <ProgressBar done={done} total={total} tone="gold" />
        </View>
        <Mono size={12.5} color={colors.onDarkSoft} style={{ marginTop: space.sm }}>{done}/{total} · {list.title}</Mono>
      </View>

      <Pressable onPress={async () => setPicked([...picked, ...(await pickPhotos())])} style={styles.drop} accessibilityRole="button" accessibilityLabel="Add photos">
        {picked.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {picked.map((uri, i) => <Photo key={i} photo={{ id: uri, path: uri }} radius={10} style={{ width: 72, height: 72 }} />)}
          </View>
        ) : (
          <Icon name="camera" size={26} color={colors.gold} />
        )}
        <SansBold size={17} color={colors.onDark}>{picked.length ? 'Add more' : 'Add photos'}</SansBold>
        {others.length ? <Sans size={14} color={colors.onDarkSoft}>{names(others)} can add theirs too</Sans> : null}
      </Pressable>

      <SansBold color={colors.onDark} style={{ marginTop: space.xl, marginBottom: space.sm }}>Caption</SansBold>
      <TextInput value={caption} onChangeText={setCaption} placeholder="How was it?" placeholderTextColor="rgba(247,242,227,0.4)" accessibilityLabel="Caption" style={[styles.input, noOutline]} />
    </Screen>
  );
}

function ListDone({ listId }: { listId: string }) {
  const list = getList(listId);
  const [words, setWords] = useState('');
  if (!list) return <Screen tone="night" header={<Close />}><Sans color={colors.onDark}>Nothing here.</Sans></Screen>;

  const { done } = itemsForList(listId);
  const total = done.length;
  const stamps = done.map((i) => i.done_at!).sort();
  const photoCount = done.reduce((n, i) => n + photosFor(i.id).length, 0);
  const close = () => router.dismissTo(`/list/${listId}`);

  return (
    <Screen tone="night" header={<Close />} footer={<Button label="Post" tone="gold" onPress={close} />}>
      <View style={{ alignItems: 'center' }}>
        <Mono size={13.5} color={colors.gold}>list complete · {total}/{total}</Mono>
        <Serif size={36} color={colors.onDark} center style={{ lineHeight: 40, marginTop: space.sm }}>you finished{'\n'}{list.title}</Serif>
        <View style={{ width: '70%', marginTop: space.md }}>
          <ProgressBar done={total} total={total} tone="gold" height={9} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
          <AvatarStack people={listPeople(listId)} size={24} ring={colors.cream} />
          <Mono size={12.5} color={colors.onDarkSoft}>
            {stamps.length ? `${monthDay(stamps[0])} to ${monthDay(stamps[stamps.length - 1])} · ` : ''}{photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </Mono>
        </View>
      </View>

      <View style={styles.grid}>
        {done.slice().reverse().map((item) => {
          const photo = photosFor(item.id)[0] ?? { id: item.id, path: null };
          return (
            <View key={item.id} style={styles.tile}>
              <Photo photo={photo} radius={12} style={{ flex: 1 }} />
              <View style={styles.tileLabel}>
                <Mono size={10.5} numberOfLines={1}>{item.title.toLowerCase()}</Mono>
              </View>
            </View>
          );
        })}
      </View>

      <SansBold color={colors.onDark} style={{ marginTop: space.xl, marginBottom: space.sm }}>Say something about it</SansBold>
      <TextInput value={words} onChangeText={setWords} placeholder="best fall ever" placeholderTextColor="rgba(247,242,227,0.4)" accessibilityLabel="Say something about it" style={[styles.input, noOutline]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  drop: {
    marginTop: space.xl, minHeight: 168, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(247,242,227,0.6)',
    backgroundColor: 'rgba(247,242,227,0.06)', alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.lg,
  },
  input: {
    height: 50, borderRadius: 14, paddingHorizontal: 16, fontFamily: fonts.sans, fontSize: 16, color: colors.onDark,
    backgroundColor: 'rgba(247,242,227,0.08)', borderWidth: 1, borderColor: 'rgba(247,242,227,0.25)',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2.15%', marginTop: space.xl },
  tile: { width: '31.9%', aspectRatio: 1.17 },
  tileLabel: { position: 'absolute', left: 6, right: 6, bottom: 6, backgroundColor: 'rgba(247,242,227,0.82)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
});
