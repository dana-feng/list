import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/api/db';
import { addPhoto, getItem, itemsForList, photosFor, removePhoto } from '@/api/items';
import { getList, isListDone, listPeople, listProgress } from '@/api/lists';
import { AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DidItWith } from '@/components/DidItWith';
import { BackButton, goBack, Header } from '@/components/Header';
import { PhotoCarousel } from '@/components/Photo';
import { Paper } from '@/components/Paper';
import { Circle, Strike } from '@/components/Scribble';
import { Screen } from '@/components/Screen';
import { Hand, HandMedium, Mono } from '@/components/Text';
import { monthDay, names } from '@/lib';
import { pickPhotos } from '@/pickPhotos';
import { colors, hash } from '@/theme';

/** Photos and who you did it with for an item you just crossed off, or every item crossed off for a whole list (?kind=list, id = the list). */
export default function Done() {
  useDb();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  // Closing the last item's card turns this same screen into the finished list,
  // rather than swapping one full-screen modal for another.
  const [finishedList, setFinishedList] = useState<string | null>(null);
  if (kind === 'list') return <ListDone listId={id} />;
  if (finishedList) return <ListDone listId={finishedList} />;
  return <ItemDone itemId={id} onListDone={setFinishedList} />;
}

function Nothing() {
  return (
    <Screen header={<Header left={<BackButton icon="x" label="Close" />} />}>
      <Mono size={12} color={colors.paper}>nothing here.</Mono>
    </Screen>
  );
}

function ItemDone({ itemId, onListDone }: { itemId: string; onListDone: (listId: string) => void }) {
  // the photo whose × was tapped, waiting on "remove photo"
  const [removing, setRemoving] = useState<string | null>(null);
  const item = getItem(itemId);
  const list = item && getList(item.list_id);
  if (!item || !list) return <Nothing />;

  const people = listPeople(list.id);
  const { done, total } = listProgress(list.id);
  const photos = photosFor(item.id);
  const add = async () => (await pickPhotos()).forEach((uri) => addPhoto(item.id, uri));
  const finish = () => {
    if (item.done_at && isListDone(list.id)) onListDone(list.id);
    else goBack();
  };

  return (
    <Screen
      contentStyle={{ paddingHorizontal: 0 }}
      header={<Header left={<BackButton icon="x" label="Close" onPress={finish} />} center={<Mono size={11} color={colors.onDarkSoft} style={{ letterSpacing: 1.2 }}>done · {done} of {total}</Mono>} />}
      footer={<Button label="done" tone="paper" onPress={finish} />}
    >
      <View style={{ paddingLeft: 22, marginTop: 6 }}>
        {/* the empty slot is always the last thing to swipe to, so there's always somewhere to add more */}
        {photos.length ? (
          <PhotoCarousel photos={photos} height={392} peek={70} gap={12} count={false} onRemove={setRemoving} last={(size) => <AddPhotos onPress={add} style={size} />} />
        ) : (
          <AddPhotos onPress={add} style={{ height: 392, marginRight: 22 }} />
        )}
      </View>
      <View style={{ marginHorizontal: 22, marginTop: 18, gap: 10 }}>
        <Hand size={26} color={colors.paper} style={{ lineHeight: 29 }}>{item.title}</Hand>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AvatarStack people={people} size={26} />
          <Mono size={11} color={colors.paper}>{names(people)}</Mono>
        </View>
        <DidItWith itemId={item.id} onDark />
        <Mono size={10.5} color={colors.onDarkSoft}>{list.title}</Mono>
      </View>
      {removing ? (
        <ConfirmDialog
          title="remove this photo?"
          body="it comes off for everyone who can see this."
          action="remove photo"
          onConfirm={() => { removePhoto(removing); setRemoving(null); }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </Screen>
  );
}

function AddPhotos({ onPress, style }: { onPress: () => void; style: StyleProp<ViewStyle> }) {
  return (
    <Paper onPress={onPress} edge="dashLight" shape={4} style={[styles.empty, style]} accessibilityLabel="Add photos">
      <Hand size={30} color={colors.paper}>+</Hand>
      <Mono size={13} color={colors.paper}>add photos</Mono>
    </Paper>
  );
}

function ListDone({ listId }: { listId: string }) {
  const list = getList(listId);
  if (!list) return <Nothing />;
  const { done } = itemsForList(listId);
  const close = () => router.dismissTo(`/list/${listId}`);
  return (
    <Screen
      header={<Header left={<BackButton icon="x" label="Close" onPress={close} />} center={<Mono size={11} color={colors.onDarkSoft} style={{ letterSpacing: 1.2 }}>{done.length} of {done.length} done!!</Mono>} />}
      footer={<Button label="done" tone="paper" onPress={close} />}
    >
      <Hand size={32} color={colors.paper} style={{ lineHeight: 35, marginHorizontal: 4, marginTop: 24, marginBottom: 20 }}>{list.title}</Hand>
      <Paper fill={colors.paper} edge="light" shape={2} round={1.3} lean={0} style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 }}>
        {done.slice().reverse().map((item, i) => (
          <View key={item.id} style={[styles.doneRow, i === done.length - 1 && { borderBottomWidth: 0 }]}>
            <Circle filled size={20} />
            <View style={{ flexShrink: 1, marginRight: 'auto' }}>
              <HandMedium size={16} numberOfLines={1}>{item.title}</HandMedium>
              <Strike seed={hash(item.id) % 97} />
            </View>
            <Mono size={10.5} color={colors.inkSoft}>{monthDay(item.done_at!)}</Mono>
          </View>
        ))}
      </Paper>
      <Pressable onPress={() => router.push('/list/new')} style={{ alignSelf: 'center', marginTop: 16, minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
        <Mono size={12} color={colors.paper} style={{ textDecorationLine: 'underline' }}>start another list</Mono>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,239,167,0.08)' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: 1.2, borderStyle: 'dashed', borderColor: colors.rule },
});
