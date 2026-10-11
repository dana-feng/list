import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/api/db';
import { addItem, addPhoto, deleteItem, getItem, interestedPeople, markDone, photosFor, removePhoto, undoDone, updateItem } from '@/api/items';
import { canViewList, getList, isMember, listPeople, listProgress } from '@/api/lists';
import { AskButton } from '@/components/AskButton';
import { Checkbox } from '@/components/Checkbox';
import { DateField } from '@/components/DateField';
import { Dots } from '@/components/Dots';
import { FolderCard } from '@/components/FolderCard';
import { goBack, Header } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { InterestButton } from '@/components/InterestButton';
import { ListPicker, ListPickerTab } from '@/components/ListPicker';
import { NotesField } from '@/components/NotesField';
import { PeopleRow } from '@/components/PeopleRow';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold, Serif } from '@/components/Text';
import { TextAction } from '@/components/TextAction';
import { TitleField } from '@/components/TitleField';
import { monthDay } from '@/lib';
import { pickPhotos } from '@/pickPhotos';
import { colors, space } from '@/theme';

type Draft = { listId: string | null; title: string; date: string | null; notes: string; open_invite: boolean; photos: string[] };

/**
 * One screen for a thing in three modes: viewing, editing, and new.
 * Pass `id` for an existing thing; leave it out (optionally with a preselected list) to add one.
 */
export function ItemScreen({ id, listId }: { id?: string; listId?: string }) {
  useDb();
  const item = id ? getItem(id) : undefined;
  const isNew = !id;
  const [editing, setEditing] = useState(isNew);
  const [picking, setPicking] = useState(isNew && !listId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    listId: item?.list_id ?? listId ?? null, title: item?.title ?? '', date: item?.date ?? null, notes: item?.notes ?? '', open_invite: false, photos: [],
  });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const list = draft.listId ? getList(draft.listId) : undefined;

  // deleted here: stay blank while the screen slides away
  if (deleted) return <Screen header={<Header />}>{null}</Screen>;
  if (!isNew && (!item || !list || !canViewList(list.id))) {
    return (
      <Screen header={<Header />}>
        <Serif size={24}>can't open this</Serif>
        <Sans color={colors.inkSoft}>It's on a private list, or it's gone.</Sans>
      </Screen>
    );
  }

  const member = isNew || (!!list && isMember(list.id));
  const done = !!item?.done_at;
  const progress = list ? listProgress(list.id) : null;
  const photos = item ? photosFor(item.id) : draft.photos.map((path, i) => ({ id: `new${i}`, path }));

  const startEdit = () => {
    if (item) set({ title: item.title, date: item.date, notes: item.notes });
    setConfirmingDelete(false);
    setEditing(true);
  };
  const destroy = () => {
    setDeleted(true);
    deleteItem(item!.id);
    goBack();
  };
  const save = () => {
    if (isNew) {
      if (!draft.listId) return;
      const newId = addItem({ list_id: draft.listId, title: draft.title, date: draft.date, notes: draft.notes, open_invite: draft.open_invite, photos: draft.photos });
      router.replace(`/item/${newId}`);
    } else {
      updateItem(item!.id, { title: draft.title.trim() || item!.title, date: draft.date, notes: draft.notes });
      setEditing(false);
    }
  };
  const addPhotos = async () => {
    const uris = await pickPhotos();
    if (item) uris.forEach((uri) => addPhoto(item.id, uri));
    else set({ photos: [...draft.photos, ...uris] });
  };
  const removeNew = (photoId: string) => set({ photos: draft.photos.filter((_, i) => `new${i}` !== photoId) });

  const header = isNew ? (
    <Header left={<TextAction label="Cancel" quiet onPress={goBack} />} right={<TextAction label="Add" disabled={!draft.title.trim() || !draft.listId} onPress={save} />} />
  ) : editing ? (
    <Header left={<TextAction label="Cancel" quiet onPress={() => setEditing(false)} />} right={<TextAction label="Done" onPress={save} />} />
  ) : (
    <Header right={member ? <TextAction label="Edit" onPress={startEdit} /> : undefined} />
  );

  return (
    <Screen header={header}>
      <FolderCard
        color={colors.cream}
        tabColor={colors.folder}
        dashedTab={isNew}
        tab={isNew ? <ListPickerTab list={list} /> : `${list!.title} · ${progress!.done}/${progress!.total}`}
        onTabPress={isNew ? () => setPicking(!picking) : editing ? undefined : () => router.push(`/list/${list!.id}`)}
        style={{ marginHorizontal: -6 }}
      >
        {picking ? (
          <ListPicker
            onPick={(l) => { set({ listId: l.id }); setPicking(false); }}
            onNew={() => router.push('/list/new')}
          />
        ) : null}

        <TitleField value={editing ? draft.title : item!.title} onChange={(title) => set({ title })} editing={editing} placeholder="what's the thing?" autoFocus={isNew && !picking} />
        <View style={{ marginTop: space.md }}>
          <DateField value={editing ? draft.date : item!.date} onChange={(date) => set({ date })} editing={editing} />
        </View>

        {!editing && member && item ? (
          done ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg }}>
              <Checkbox checked onPress={() => undoDone(item.id)} label="Undo done" />
              <Mono size={13}>done · {monthDay(item.done_at!)}</Mono>
            </View>
          ) : (
            <Pressable
              onPress={() => { markDone(item.id); router.push(`/done/${item.id}`); }}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.dark, borderRadius: 14, height: 54, paddingHorizontal: space.lg, marginTop: space.lg }}
            >
              <Checkbox checked={false} onDark size={22} />
              <SansBold size={17} color={colors.onDark}>Mark as done</SansBold>
            </Pressable>
          )
        ) : null}
        {!editing && !member && done ? <Mono size={13} style={{ marginTop: space.md }}>done · {monthDay(item!.done_at!)}</Mono> : null}

        <Dots />

        {isNew ? (
          <Pressable onPress={() => set({ open_invite: !draft.open_invite })} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="switch" accessibilityState={{ checked: draft.open_invite }}>
            <View style={{ flex: 1 }}>
              <SansBold size={16}>Ask who's in</SansBold>
              <Sans size={13.5} color={colors.inkSoft}>followers can ★ it from their feed</Sans>
            </View>
            <Icon name="plane" size={22} fill={draft.open_invite ? colors.ink : 'none'} />
          </Pressable>
        ) : (
          <>
            <Mono size={13} style={{ marginBottom: space.md }}>people</Mono>
            <PeopleRow
              doing={listPeople(list!.id)}
              interested={item!.open_invite ? interestedPeople(item!.id) : []}
              action={member ? <AskButton itemId={item!.id} /> : <InterestButton itemId={item!.id} />}
            />
          </>
        )}

        {photos.length || member ? (
          <>
            <Dots />
            <Mono size={13} style={{ marginBottom: space.md }}>photos</Mono>
            <PhotoGrid photos={photos} onAdd={member ? addPhotos : undefined} onRemove={editing ? (isNew ? removeNew : removePhoto) : undefined} />
          </>
        ) : null}

        {editing || item?.notes ? (
          <>
            <Dots />
            <Mono size={13} style={{ marginBottom: space.md }}>notes</Mono>
            <NotesField value={editing ? draft.notes : item!.notes} onChange={(notes) => set({ notes })} editing={editing} />
          </>
        ) : null}

        {editing && item ? (
          <>
            <Dots />
            {confirmingDelete ? (
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <Sans center color={colors.inkSoft} style={{ maxWidth: 280 }}>This takes it off the list for good, with its photos and stars.</Sans>
                <View style={{ flexDirection: 'row', gap: space.xl }}>
                  <Pressable onPress={destroy} hitSlop={8} accessibilityRole="button"><SansBold color={colors.danger}>Delete it</SansBold></Pressable>
                  <Pressable onPress={() => setConfirmingDelete(false)} hitSlop={8} accessibilityRole="button"><SansBold>Keep it</SansBold></Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmingDelete(true)} style={{ alignItems: 'center' }} accessibilityRole="button">
                <SansBold size={16} color={colors.danger}>Delete this thing</SansBold>
              </Pressable>
            )}
          </>
        ) : null}
      </FolderCard>
    </Screen>
  );
}
