import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, InviteAudience, useDb } from '@/api/db';
import {
  addItem, addPhoto, deleteItem, getItem, interestedPeople, inviteeIds, isInterested, isInvitedTo, markDone, photosFor, removePhoto, setInvite,
  toggleInterest, undoDone, updateItem,
} from '@/api/items';
import { getList, isMember, listPeople, listProgress, viewerIds } from '@/api/lists';
import { tagsToIds, tagsToNames } from '@/api/mentions';
import { AvatarStack } from '@/components/Avatar';
import { Button, LinkText } from '@/components/Button';
import { DateChip, DateField } from '@/components/DateField';
import { canSayDown, downText } from '@/components/Down';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header, SaveAction, TextAction } from '@/components/Header';
import { FieldRow, TitleInput } from '@/components/ListFields';
import { ListPicker, ListPickerTab } from '@/components/ListPicker';
import { NotesField } from '@/components/NotesField';
import { Paper } from '@/components/Paper';
import { PersonPicker } from '@/components/PersonPicker';
import { PhotoStrip } from '@/components/PhotoGrid';
import { Circle } from '@/components/Scribble';
import { FolderScreen } from '@/components/Screen';
import { Switch } from '@/components/Switch';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { INVITE_OPTIONS, VisibilityButton, VisibilityMenu, choiceLabel } from '@/components/VisibilityPicker';
import { monthDay, toDay } from '@/lib';
import { pickPhotos } from '@/pickPhotos';
import { colors } from '@/theme';

/** Saved notes as the editor holds them. */
const editableNotes = (saved: string) => {
  const { text, hidden } = tagsToNames(saved);
  return { notes: text, hidden };
};

type Draft = {
  /** notes are the typed text here: tags as @username, turned into ids on save. hidden: the ids behind any "@(someone)" */
  listId: string | null; title: string; date: string | null; notes: string; hidden: string[]; photos: string[];
  open_invite: boolean; invite_audience: InviteAudience; invitees: string[];
};

/** "followers", "irina's followers", "just me", "3 people"… for an item's list. */
function whoCanSee(listId: string, member: boolean) {
  const list = getList(listId);
  if (!list) return '—';
  const choice = list.visibility;
  if (!member && choice === 'followers') {
    const owner = listPeople(listId)[0];
    return owner ? `${owner.name}'s followers` : 'followers';
  }
  if (!member && choice === 'specific') return 'people they picked';
  if (!member && choice === 'just_me') return 'only the people on it';
  return choiceLabel(choice, viewerIds(listId).length);
}

/** "followers", "irina's followers", "3 people", "people they picked", "anyone": who an item's open invite goes to. */
function whoIsInvited(listId: string, audience: InviteAudience, invitees: number, member: boolean) {
  if (audience === 'anyone') return 'anyone';
  if (audience === 'specific') return member ? `${invitees} ${invitees === 1 ? 'person' : 'people'}` : 'people they picked';
  const owner = member ? undefined : listPeople(listId)[0];
  return owner ? `${owner.name}'s followers` : 'followers';
}

const dayOf = (iso: string) => (toDay(new Date(iso)) === toDay(new Date()) ? 'today' : monthDay(iso));

/**
 * One screen for an item in three modes: viewing, editing, and new.
 * Pass `id` for an existing item; leave it out (optionally with a preselected list) to add one.
 */
export function ItemScreen({ id, listId }: { id?: string; listId?: string }) {
  useDb();
  const item = id ? getItem(id) : undefined;
  const isNew = !id;
  const [editing, setEditing] = useState(isNew);
  const [picking, setPicking] = useState(isNew && !listId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [inviteMenu, setInviteMenu] = useState(false);
  const [pickingInvitees, setPickingInvitees] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    listId: item?.list_id ?? listId ?? null, title: item?.title ?? '', date: item?.date ?? null, ...editableNotes(item?.notes ?? ''), photos: [],
    open_invite: item?.open_invite ?? false, invite_audience: item?.invite_audience ?? 'followers', invitees: item ? inviteeIds(item.id) : [],
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

  const startEdit = () => {
    if (item) set({ title: item.title, date: item.date, ...editableNotes(item.notes), open_invite: item.open_invite, invite_audience: item.invite_audience, invitees: inviteeIds(item.id) });
    setInviteMenu(false);
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
      addItem({
        list_id: draft.listId, title: draft.title, date: draft.date, notes: tagsToIds(draft.notes, draft.hidden), photos: draft.photos,
        open_invite: draft.open_invite, invite_audience: draft.invite_audience, invitees: draft.invitees,
      });
      // from a list's "+ write another", go back to it; from the + menu, land on the list
      if (listId) goBack();
      else router.replace(`/list/${draft.listId}`);
      return;
    }
    updateItem(item!.id, { title: draft.title.trim() || item!.title, date: draft.date, notes: tagsToIds(draft.notes, draft.hidden) });
    setInvite(item!.id, { open: draft.open_invite, audience: draft.invite_audience, invitees: draft.invitees });
    setEditing(false);
  };
  const addPhotos = async () => {
    const uris = await pickPhotos();
    if (item) uris.forEach((uri) => addPhoto(item.id, uri));
    else set({ photos: [...draft.photos, ...uris] });
  };
  const removeNew = (photoId: string) => set({ photos: draft.photos.filter((_, i) => `new${i}` !== photoId) });
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
  } else if (editing) {
    header = <Header left={<TextAction label="cancel" onPress={() => setEditing(false)} />} title="edit" right={<SaveAction onPress={save} disabled={!draft.title.trim()} />} />;
    tab = <FolderTab label={list!.title} />;
  } else {
    header = <Header right={member ? <TextAction label="edit" onPress={startEdit} /> : undefined} />;
    tab = (
      <FolderTab
        label={member ? `${list!.title} · ${progress!.done}/${progress!.total}` : `${owner ? `${owner.name}'s · ` : ''}${list!.title}`}
        onPress={() => router.push(`/list/${list!.id}`)}
      />
    );
  }

  const down = item?.open_invite ? interestedPeople(item.id) : [];
  const canDown = !!item && canSayDown(item.id);
  const iAmDown = !!item && isInterested(item.id);
  // someone else's item: only an open invite for you if you're in its audience
  const invitedHere = !!item && !member && isInvitedTo(item.id);
  const showInvite = member || invitedHere;
  const inviteOn = editing ? draft.open_invite : member ? !!item?.open_invite : invitedHere;
  const invitedLabel = editing
    ? whoIsInvited(draft.listId ?? '', draft.invite_audience, draft.invitees.length, true)
    : item ? whoIsInvited(item.list_id, item.invite_audience, inviteeIds(item.id).length, member) : '';
  const pickAudience = (audience: InviteAudience) => {
    setInviteMenu(false);
    if (audience === 'specific') setPickingInvitees(true);
    else set({ invite_audience: audience, invitees: [] });
  };

  const card = (
    <Paper fill={done ? colors.gold : colors.sage} edge="ink" edgeWidth={1.5} shape={4} lean={0} style={styles.card}>
      {editing ? (
        <TitleInput value={draft.title} onChange={(title) => set({ title })} placeholder="what's the item?" size={28} autoFocus={isNew && !picking} />
      ) : (
        <Hand size={28} color={done ? colors.inkSoft : colors.ink} style={{ lineHeight: 30 }}>{item!.title}</Hand>
      )}
      {editing ? <DateField value={draft.date} onChange={(date) => set({ date })} /> : item!.date ? <DateChip value={item!.date} /> : null}

      <View style={{ gap: 4 }}>
        {showInvite ? (
          <FieldRow label="open invite">
            {editing ? (
              <Switch on={draft.open_invite} onPress={() => { setInviteMenu(false); set({ open_invite: !draft.open_invite }); }} label="Open invite" text={draft.open_invite ? 'on' : 'off'} />
            ) : inviteOn ? (
              <>
                {down.length ? <AvatarStack people={down} size={22} /> : null}
                <Mono size={11.5}>{member ? `on · ${downText(item!.id)}` : downText(item!.id)}</Mono>
              </>
            ) : (
              <Mono size={11.5}>off</Mono>
            )}
          </FieldRow>
        ) : null}
        {/* who the invite goes to: its own choice, whatever the list is set to */}
        {inviteOn ? (
          <FieldRow label="invited">
            <VisibilityButton what="Who’s invited" label={invitedLabel} open={inviteMenu} onPress={editing ? () => setInviteMenu(!inviteMenu) : undefined} />
          </FieldRow>
        ) : null}
        {editing && inviteOn && inviteMenu ? (
          <View style={{ marginLeft: 102 }}>
            <VisibilityMenu value={draft.invite_audience} options={INVITE_OPTIONS} onPick={pickAudience} />
          </View>
        ) : null}
        <FieldRow label="sees list">
          <VisibilityButton what="Who can see the list" label={list ? whoCanSee(list.id, member) : 'pick a list first'} />
        </FieldRow>
      </View>

      <PhotoStrip
        photos={photos}
        onAdd={member ? addPhotos : undefined}
        onRemove={editing ? (isNew ? removeNew : removePhoto) : undefined}
      />
    </Paper>
  );

  return (
    <FolderScreen header={header} folderTabs={tab}>
      {editing && !isNew ? <Mono size={11} color={colors.inkSoft} style={{ marginHorizontal: 4, marginBottom: 10 }}>editing — tap anything dashed</Mono> : null}

      {card}

      {/* crossing it off (yours) */}
      {member && !editing && item && !done ? (
        <Paper onPress={finish} edge="ink" edgeWidth={1.4} shape={4} accessibilityLabel={`Mark ${item.title} as done`} style={styles.arm}>
          <Circle size={24} />
          <MonoMedium size={13} style={{ flex: 1 }}>mark as done</MonoMedium>
        </Paper>
      ) : null}
      {member && !editing && item && done ? (
        <View style={styles.doneRow}>
          <View style={styles.doneChip}><MonoMedium size={11.5} color={colors.paper}>done · {dayOf(item.done_at!)}</MonoMedium></View>
          <Pressable onPress={() => router.push(`/done/${item.id}`)} style={{ height: 40, justifyContent: 'center' }} accessibilityRole="button">
            <MonoMedium size={12}>make the card →</MonoMedium>
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
            label={iAmDown ? "you're down ✓" : "i'm down"}
            tone={iAmDown ? 'outline' : 'bark'}
            onPress={() => toggleInterest(item.id)}
            style={{ marginTop: 16 }}
          />
          <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>
            {iAmDown ? `${owner?.name ?? 'they'} can see you're down. tap again if plans change.` : `${owner?.name ?? 'they'} can see who's down — they decide who comes`}
          </Mono>
        </>
      ) : null}
      {!member && done ? <Mono size={12} style={{ marginTop: 14, marginHorizontal: 4 }}>done · {dayOf(item!.done_at!)}</Mono> : null}

      {editing || item?.notes ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 8, marginHorizontal: 2 }}>{member ? 'notes' : `${owner?.name ?? 'their'}'s notes`}</Label>
          <NotesField value={editing ? draft.notes : item!.notes} onChange={(notes) => set({ notes })} editing={editing} listId={draft.listId} />
        </>
      ) : null}

      {isNew ? <Button label="add it" disabled={!draft.title.trim() || !draft.listId} onPress={save} style={{ marginTop: 22 }} /> : null}

      {editing && item ? (
        confirmingDelete ? (
          <View style={{ marginTop: 22, gap: 4 }}>
            <Mono size={12} color={colors.inkSoft} style={{ lineHeight: 18 }}>this takes it off the list for good, with its photos and who’s down.</Mono>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <LinkText label="delete it" color={colors.bark} onPress={destroy} />
              <LinkText label="keep it" onPress={() => setConfirmingDelete(false)} />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            <LinkText label="delete this from the list" color={colors.bark} wavy onPress={() => setConfirmingDelete(true)} />
          </View>
        )
      ) : null}

      {pickingInvitees ? (
        <PersonPicker
          title="who’s invited"
          initial={draft.invitees}
          onClose={() => setPickingInvitees(false)}
          onDone={(ids) => {
            if (ids.length) set({ invite_audience: 'specific', invitees: ids });
            setPickingInvitees(false);
          }}
        />
      ) : null}

      {isNew && picking ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ListPicker
            value={draft.listId ?? undefined}
            onPick={(l) => { set({ listId: l.id }); setPicking(false); }}
            onNew={() => { setPicking(false); router.push('/list/new'); }}
          />
        </View>
      ) : null}
    </FolderScreen>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  arm: { marginTop: 16, height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 14 },
  doneRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  doneChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11, backgroundColor: colors.bark },
});
