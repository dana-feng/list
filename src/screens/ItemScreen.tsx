import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, useDb } from '@/api/db';
import {
  addItem, addPhoto, deleteItem, getItem, interestedPeople, inviteeIds, isInterested, isInvitedTo, markDone, photosFor, removePhoto, setInvite,
  toggleInterest, undoDone, updateItem,
} from '@/api/items';
import { inviteHosts } from '@/api/feed';
import { getList, isMember, listPeople, listProgress } from '@/api/lists';
import { tagsToIds, tagsToNames, Unfound } from '@/api/mentions';
import { AvatarStack } from '@/components/Avatar';
import { Button, LinkText } from '@/components/Button';
import { DateChip, DateField } from '@/components/DateField';
import { canSayDown, interestLabel } from '@/components/Down';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header, TextAction } from '@/components/Header';
import { Invite, InviteChip, InviteSheet } from '@/components/InviteSheet';
import { EditableTitle, FieldRow, TitleInput } from '@/components/ListFields';
import { ListPicker, ListPickerTab } from '@/components/ListPicker';
import { MoreMenu } from '@/components/MoreMenu';
import { NotesField } from '@/components/NotesField';
import { Paper } from '@/components/Paper';
import { PeoplePress } from '@/components/PeopleSheet';
import { PhotoStrip } from '@/components/PhotoGrid';
import { Circle } from '@/components/Scribble';
import { FolderScreen } from '@/components/Screen';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { monthDay, names, toDay } from '@/lib';
import { pickPhotos } from '@/pickPhotos';
import { colors } from '@/theme';

/** Saved notes as the editor holds them. */
const editableNotes = (saved: string) => {
  const { text, unfound } = tagsToNames(saved);
  return { notes: text, unfound };
};

/**
 * What's typed but not saved yet. For a new item that's everything, until "save".
 * For an existing one it's only the notes, which save when you tap away from them.
 */
type Draft = {
  /** notes are the typed text here: tags as @username, turned into ids on save. unfound: tagged people who can't be found, to keep their tags */
  listId: string | null; title: string; date: string | null; notes: string; unfound: Unfound; photos: string[]; invite: Invite;
};

const dayOf = (iso: string) => (toDay(new Date(iso)) === toDay(new Date()) ? 'today' : monthDay(iso));

/**
 * One screen for an item, new or existing. There's no edit mode: on yours, everything dashed is something
 * to fill in, everything filled in can be tapped to change, and each change saves as you make it.
 * Pass `id` for an existing item; leave it out (optionally with a preselected list) to add one.
 */
export function ItemScreen({ id, listId }: { id?: string; listId?: string }) {
  useDb();
  const item = id ? getItem(id) : undefined;
  const isNew = !id;
  const [picking, setPicking] = useState(isNew && !listId);
  const [inviting, setInviting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    listId: item?.list_id ?? listId ?? null, title: item?.title ?? '', date: item?.date ?? null, ...editableNotes(item?.notes ?? ''), photos: [],
    invite: { open: false, audience: 'followers', invitees: [] },
  }));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const list = draft.listId ? getList(draft.listId) : undefined;

  // deleted here: stay blank while the screen slides away
  if (deleted) return <FolderScreen header={<Header />} folderTabs={<FolderTab label=" " />}>{null}</FolderScreen>;
  // having the item means you may see it: it's on a list you can see, or it's an open invite that includes you
  if (!isNew && (!item || !list)) {
    return (
      <FolderScreen header={<Header />} folderTabs={<FolderTab label="item" />}>
        <Hand size={24}>can’t open this</Hand>
        <Mono size={12} color={colors.inkSoft}>it’s on a private list, or it’s gone.</Mono>
      </FolderScreen>
    );
  }

  const member = isNew || (!!list && isMember(list.id));
  const done = !!item?.done_at;
  const progress = list ? listProgress(list.id) : null;
  const owner = list ? listPeople(list.id).find((p) => p.id !== db.me) ?? listPeople(list.id)[0] : undefined;
  const photos = item ? photosFor(item.id) : draft.photos.map((path, i) => ({ id: `new${i}`, path }));
  const invite: Invite = item ? { open: item.open_invite, audience: item.invite_audience, invitees: inviteeIds(item.id) } : draft.invite;

  // ---- changes: straight to the item, or into the draft for a new one ----
  const setDate = (date: string | null) => (item ? updateItem(item.id, { date }) : set({ date }));
  const changeInvite = (next: Invite) => {
    setInviting(false);
    if (item) setInvite(item.id, next);
    else set({ invite: next });
  };
  const addPhotos = async () => {
    const uris = await pickPhotos();
    if (item) uris.forEach((uri) => addPhoto(item.id, uri));
    else set({ photos: [...draft.photos, ...uris] });
  };
  const removeNew = (photoId: string) => set({ photos: draft.photos.filter((_, i) => `new${i}` !== photoId) });
  // notes save themselves when you tap away
  const saveNotes = () => {
    if (!item) return;
    const notes = tagsToIds(draft.notes, draft.unfound);
    if (notes !== item.notes) updateItem(item.id, { notes });
  };
  const save = () => {
    if (!draft.listId) return;
    addItem({
      list_id: draft.listId, title: draft.title, date: draft.date, notes: tagsToIds(draft.notes, draft.unfound), photos: draft.photos,
      open_invite: draft.invite.open, invite_audience: draft.invite.audience, invitees: draft.invite.invitees,
    });
    // from a list's "+ add", go back to it; from the + menu, land on the list
    if (listId) goBack();
    else router.replace(`/list/${draft.listId}`);
  };
  const destroy = () => {
    setDeleted(true);
    deleteItem(item!.id);
    goBack();
  };
  const finish = () => {
    const finishedList = markDone(item!.id);
    if (finishedList) router.push(`/done/${list!.id}?kind=list`);
  };

  // ---- header + folder tab ----
  let header;
  let tab;
  if (isNew) {
    header = <Header left={<TextAction label="cancel" onPress={goBack} />} title="new item" />;
    tab = <FolderTab label={<ListPickerTab list={list} open={picking} onPress={() => setPicking(!picking)} />} />;
  } else {
    header = <Header right={member ? <MoreMenu label="More: delete" actions={[{ label: 'delete item', confirm: true, onPress: destroy }]} /> : undefined} />;
    tab = (
      <FolderTab
        label={member ? `${list!.title} · ${progress!.done}/${progress!.total}` : list!.title}
        onPress={() => router.push(`/list/${list!.id}`)}
      />
    );
  }

  const down = item?.open_invite ? interestedPeople(item.id) : [];
  const canDown = !!item && canSayDown(item.id);
  const iAmDown = !!item && isInterested(item.id);
  // someone else's item: only an open invite for you if you're in its audience
  const invitedHere = !!item && !member && isInvitedTo(item.id);
  // an invite is for something still to do
  const inviteChip = member && !done ? <InviteChip invite={invite} down={down.length} onPress={() => setInviting(true)} /> : null;
  // a friend's invite: whose it is, so you know who you'd be joining
  const hosts = invitedHere ? inviteHosts(item!) : [];

  const card = (
    <Paper fill={done ? colors.gold : colors.sage} edge="ink" edgeWidth={1.5} shape={4} lean={0} style={styles.card}>
      {isNew ? (
        <TitleInput value={draft.title} onChange={(title) => set({ title })} placeholder="untitled item" size={28} autoFocus={!picking} />
      ) : (
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <EditableTitle value={item!.title} onSave={member ? (title) => updateItem(item!.id, { title }) : undefined} size={28} color={done ? colors.inkSoft : colors.ink} placeholder="untitled item" />
          </View>
          {/* crossing it off (yours) */}
          {member && !done ? (
            <Pressable onPress={finish} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={`Mark ${item!.title} done`}>
              <Circle size={30} />
              <Mono size={10.5}>done</Mono>
            </Pressable>
          ) : null}
        </View>
      )}

      {member ? (
        <DateField value={item ? item.date : draft.date} onChange={setDate} beside={inviteChip} />
      ) : item!.date ? (
        <DateChip value={item!.date} />
      ) : null}

      {/* a friend's open invite that includes you: whose it is, and who's interested so far */}
      {invitedHere ? (
        <View style={{ gap: 4 }}>
          <FieldRow label="from">
            <PeoplePress people={hosts} hitSlop={6} style={styles.from}>
              <AvatarStack people={hosts} size={22} max={3} />
              <MonoMedium size={11.5} numberOfLines={1} style={{ flexShrink: 1 }}>{hosts.map((p) => p.name).join(' + ')}</MonoMedium>
            </PeoplePress>
          </FieldRow>
          <FieldRow label="interested">
            <PeoplePress people={down} hitSlop={6} style={styles.from}>
              {down.length ? <AvatarStack people={down} size={22} max={3} /> : null}
              <Mono size={11.5} numberOfLines={2} style={{ flexShrink: 1 }}>{down.length ? names(down) : 'no one yet'}</Mono>
            </PeoplePress>
          </FieldRow>
        </View>
      ) : null}

      <PhotoStrip
        photos={photos}
        onAdd={member ? addPhotos : undefined}
        onRemove={member ? (isNew ? removeNew : removePhoto) : undefined}
      />
    </Paper>
  );

  return (
    <FolderScreen header={header} folderTabs={tab}>
      {card}

      {member && item && done ? (
        <View style={styles.doneRow}>
          <View style={styles.doneChip}><MonoMedium size={11.5} color={colors.paper}>done · {dayOf(item.done_at!)}</MonoMedium></View>
          <Pressable onPress={() => router.push(`/done/${item.id}`)} style={{ height: 40, justifyContent: 'center' }} accessibilityRole="button">
            <MonoMedium size={12}>add photos →</MonoMedium>
          </Pressable>
          <View style={{ marginLeft: 'auto' }}>
            <LinkText label="undo" onPress={() => undoDone(item.id)} />
          </View>
        </View>
      ) : null}

      {/* a friend's open invite */}
      {!member && item && canDown ? (
        <>
          <Button
            label={interestLabel(iAmDown)}
            tone={iAmDown ? 'bark' : 'outline'}
            onPress={() => toggleInterest(item.id)}
            style={{ marginTop: 16 }}
          />
          {iAmDown ? (
            <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>
              {`${owner?.name ?? 'they'} can see you're interested. tap again if plans change.`}
            </Mono>
          ) : null}
        </>
      ) : null}
      {!member && done ? <Mono size={12} style={{ marginTop: 14, marginHorizontal: 4 }}>done · {dayOf(item!.done_at!)}</Mono> : null}

      {member || item?.notes ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 8, marginHorizontal: 2 }}>{member ? 'notes' : `${owner?.name ?? 'their'}'s notes`}</Label>
          <NotesField value={member ? draft.notes : item!.notes} onChange={(notes) => set({ notes })} onBlur={isNew ? undefined : saveNotes} editing={member} listId={draft.listId} />
        </>
      ) : null}

      {isNew ? <Button label="save" disabled={!draft.title.trim() || !draft.listId} onPress={save} style={{ marginTop: 22 }} /> : null}

      {inviting ? <InviteSheet invite={invite} onDone={changeInvite} /> : null}

      {isNew && picking ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ListPicker
            value={draft.listId ?? undefined}
            onPick={(l) => { set({ listId: l.id }); setPicking(false); }}
          />
        </View>
      ) : null}
    </FolderScreen>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  close: { alignItems: 'center', gap: 2, paddingTop: 2 },
  doneRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  doneChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11, backgroundColor: colors.bark },
});
