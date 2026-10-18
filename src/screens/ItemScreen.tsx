import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, useDb } from '@/api/db';
import {
  addItem, addPhoto, canClaimGift, canSayHave, claimGift, deleteItem, getItem, giftOf, havesFor, iHaveIt, interestedPeople, isInterested,
  isInvitedTo, markDone, noTag, photosFor, removePhoto, setTag, TagChoice, tagChoiceOf, toggleHave, toggleInterest, undoDone, updateItem,
} from '@/api/items';
import { inviteHosts } from '@/api/feed';
import { getList, isListDone, isMember, listPeople, listProgress } from '@/api/lists';
import { tagsToIds, tagsToNames, Unfound } from '@/api/mentions';
import { getProfile } from '@/api/profiles';
import { AvatarStack } from '@/components/Avatar';
import { Button, LinkText } from '@/components/Button';
import { DateChip, DateField } from '@/components/DateField';
import { DidItWith } from '@/components/DidItWith';
import { DoneSheet } from '@/components/DoneSheet';
import { canSayDown, interestLabel } from '@/components/Down';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header, TextAction } from '@/components/Header';
import { EditableTitle, FieldRow, TitleInput } from '@/components/ListFields';
import { ListPicker, ListPickerTab } from '@/components/ListPicker';
import { MoreMenu } from '@/components/MoreMenu';
import { NotesField } from '@/components/NotesField';
import { Paper } from '@/components/Paper';
import { PeopleList } from '@/components/PeopleList';
import { PeoplePress } from '@/components/PeopleSheet';
import { PhotoStrip } from '@/components/PhotoGrid';
import { ReportSheet } from '@/components/ReportSheet';
import { Circle } from '@/components/Scribble';
import { FolderScreen } from '@/components/Screen';
import { Stepper, TagBadge, TagField } from '@/components/TagField';
import { Hand, Label, Mono, MonoMedium } from '@/components/Text';
import { success, tap, toggle } from '@/haptics';
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
  listId: string | null; title: string; date: string | null; notes: string; unfound: Unfound; photos: string[]; tag: TagChoice;
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
  const [deleted, setDeleted] = useState(false);
  const [reporting, setReporting] = useState(false);
  // just crossed off here: "you did it!" over the screen
  const [cele, setCele] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    listId: item?.list_id ?? listId ?? null, title: item?.title ?? '', date: item?.date ?? null, ...editableNotes(item?.notes ?? ''), photos: [],
    tag: noTag(),
  }));
  const [howMany, setHowMany] = useState<number | null>(null);
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
  // who to report it about: whoever added it (left out if that post isn't visible to you)
  const added = item ? db.events.find((e) => e.item_id === item.id && e.kind === 'item_added') : undefined;
  const addedBy = added ? getProfile(added.actor_id) : undefined;
  const tagValue: TagChoice = item ? tagChoiceOf(item) : draft.tag;
  const gift = item ? giftOf(item.id) : { quantity: draft.tag.quantity, claimed: 0, mine: 0, left: draft.tag.quantity };

  // ---- changes: straight to the item, or into the draft for a new one ----
  const setDate = (date: string | null) => (item ? updateItem(item.id, { date }) : set({ date }));
  const changeTag = (next: TagChoice) => (item ? setTag(item.id, next) : set({ tag: next }));
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
      list_id: draft.listId, title: draft.title, date: draft.date, notes: tagsToIds(draft.notes, draft.unfound), photos: draft.photos, tag: draft.tag,
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
    success();
    markDone(item!.id);
    setCele(true);
  };
  // same as on the list: once that's out of the way, a finished list gets its own moment
  const afterCele = (toCard: boolean) => {
    setCele(false);
    if (toCard) router.push(`/done/${item!.id}`);
    else if (isListDone(list!.id)) router.push(`/done/${list!.id}?kind=list`);
  };

  // ---- header + folder tab ----
  let header;
  let tab;
  if (isNew) {
    header = <Header left={<TextAction label="cancel" onPress={goBack} />} title="new item" />;
    tab = <FolderTab label={<ListPickerTab list={list} open={picking} onPress={() => setPicking(!picking)} />} />;
  } else {
    header = (
      <Header
        right={member ? (
          <MoreMenu label="More: delete" actions={[{ label: 'delete item', confirm: true, onPress: destroy }]} />
        ) : addedBy?.id !== db.me ? (
          <MoreMenu label="More: report item" actions={[{ label: 'report item', danger: true, onPress: () => setReporting(true) }]} />
        ) : undefined}
      />
    );
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
  // a tag is for something still to do
  const tagField = member && !done ? <TagField value={tagValue} onChange={changeTag} claimed={gift.claimed} interested={down.length} /> : null;
  const isGift = item?.tag === 'gift';
  const isBorrow = item?.tag === 'borrow';
  // the list's people, for "from" on a friend's gift or borrow ask
  const askers = list ? listPeople(list.id) : [];
  const haves = isBorrow ? havesFor(item!.id) : [];
  const ownerName = askers.length === 1 ? askers[0].name : 'they';
  const ownerObject = askers.length === 1 ? askers[0].name : 'them';
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
        <DateField value={item ? item.date : draft.date} onChange={setDate} beside={tagField} />
      ) : item!.date || isGift || isBorrow ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {item!.date ? <DateChip value={item!.date} /> : null}
          {isGift || isBorrow ? <TagBadge tag={item!.tag!} /> : null}
        </View>
      ) : null}

      {/* a friend's gift or borrow ask: whose it is, and for gifts how many are left (never who's getting them) */}
      {!member && (isGift || isBorrow) ? (
        <View style={{ gap: 4 }}>
          <FieldRow label="from">
            <PeoplePress people={askers} hitSlop={6} style={styles.from}>
              <AvatarStack people={askers} size={22} max={3} />
              <MonoMedium size={11.5} numberOfLines={1} style={{ flexShrink: 1 }}>{askers.map((p) => p.name).join(' + ')}</MonoMedium>
            </PeoplePress>
          </FieldRow>
          {isGift ? <FieldRow label="available"><MonoMedium size={11.5}>{gift.left} of {gift.quantity}</MonoMedium></FieldRow> : null}
        </View>
      ) : null}
      {member && isGift ? (
        <FieldRow label="available"><MonoMedium size={11.5}>{gift.left} of {gift.quantity}</MonoMedium></FieldRow>
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

      {/* who it was done with, on any kind of item: yours, tap to change; someone else's, "untag me" if that's you */}
      {item && done ? <DidItWith itemId={item.id} /> : null}

      <PhotoStrip
        photos={photos}
        onAdd={member ? addPhotos : undefined}
        onRemove={member ? (isNew ? removeNew : removePhoto) : undefined}
      />
    </Paper>
  );

  return (
    <FolderScreen
      header={header}
      folderTabs={tab}
      overlay={cele && item && list ? (
        <DoneSheet itemId={item.id} title={item.title} count={`${progress!.done} of ${progress!.total} done`} onCard={() => afterCele(true)} onLater={() => afterCele(false)} />
      ) : null}
    >
      {card}

      {member && item && done ? (
        <View style={styles.doneRow}>
          <View style={styles.doneChip}><MonoMedium size={11.5} color={colors.paper}>done · {dayOf(item.done_at!)}</MonoMedium></View>
          <Pressable onPress={() => router.push(`/done/${item.id}`)} style={{ height: 40, justifyContent: 'center' }} accessibilityRole="button">
            <MonoMedium size={12}>add photos →</MonoMedium>
          </Pressable>
          <View style={{ marginLeft: 'auto' }}>
            <LinkText label="undo" onPress={() => { tap(); undoDone(item.id); }} />
          </View>
        </View>
      ) : null}

      {/* a friend's open invite */}
      {!member && item && canDown ? (
        <>
          <Button
            label={interestLabel(iAmDown)}
            tone={iAmDown ? 'bark' : 'outline'}
            onPress={() => {
              toggle(!iAmDown);
              toggleInterest(item.id);
            }}
            style={{ marginTop: 16 }}
          />
          {iAmDown ? (
            <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>
              {`${owner?.name ?? 'they'} can see you're interested. tap again if plans change.`}
            </Mono>
          ) : null}
        </>
      ) : null}
      {!member && done && !(isGift && gift.mine) ? <Mono size={12} style={{ marginTop: 14, marginHorizontal: 4 }}>done · {dayOf(item!.done_at!)}</Mono> : null}

      {/* a friend's gift: "i'll get it" (with how many, when more than one is wanted). Tap again to take it back. */}
      {!member && item && isGift ? <GiftClaim itemId={item.id} owner={ownerObject} howMany={howMany} setHowMany={setHowMany} /> : null}

      {/* your gift: how many are left shows on the card; who's getting them never does */}
      {member && item && isGift ? (
        <Mono size={11} color={colors.inkSoft} style={{ marginTop: 12, marginHorizontal: 4, lineHeight: 17 }}>
          {item.auto_done && done ? `all ${gift.quantity} are covered, so it's marked done. tap undo to open it back up.` : "you'll see how many are left, never who's getting them."}
        </Mono>
      ) : null}

      {/* a friend's borrow ask */}
      {!member && item && canSayHave(item.id) ? (
        <>
          <Button
            label="i have it"
            tone={iHaveIt(item.id) ? 'bark' : 'outline'}
            onPress={() => { toggle(!iHaveIt(item.id)); toggleHave(item.id); }}
            accessibilityLabel={iHaveIt(item.id) ? `You said you have ${item.title}. Tap to take it back` : `I have ${item.title}`}
            style={{ marginTop: 16 }}
          />
          <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>
            {iHaveIt(item.id) ? `${ownerName} can see you have it. tap again to take it back.` : `${ownerName} sees who has it and reaches out.`}
          </Mono>
        </>
      ) : null}

      {member || item?.notes ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 8, marginHorizontal: 2 }}>{member ? 'notes' : `${owner?.name ?? 'their'}'s notes`}</Label>
          <NotesField value={member ? draft.notes : item!.notes} onChange={(notes) => set({ notes })} onBlur={isNew ? undefined : saveNotes} editing={member} listId={draft.listId} />
        </>
      ) : null}

      {item && isBorrow ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 8, marginHorizontal: 2 }}>who has</Label>
          {haves.length ? (
            <PeopleList people={haves} fill={colors.cream} />
          ) : (
            <Mono size={12} color={colors.inkSoft} style={{ marginHorizontal: 2, lineHeight: 18 }}>
              {member ? "no one yet. we'll let you know when someone has it." : 'no one yet.'}
            </Mono>
          )}
        </>
      ) : null}

      {isNew ? <Button label="save" disabled={!draft.title.trim() || !draft.listId} onPress={save} style={{ marginTop: 22 }} /> : null}

      {isNew && picking ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ListPicker
            value={draft.listId ?? undefined}
            onPick={(l) => { set({ listId: l.id }); setPicking(false); }}
          />
        </View>
      ) : null}
      {reporting && item ? (
        <ReportSheet
          what="this item"
          target={{ profile_id: addedBy?.id, item_id: item.id, content: [item.title, item.notes, item.caption].filter(Boolean).join(' · ') }}
          person={addedBy}
          onClose={() => setReporting(false)}
        />
      ) : null}
    </FolderScreen>
  );
}

/**
 * "i'll get it" on a friend's gift. Filled once you've said you will; tap again to take it back.
 * When more than one is wanted, a stepper beside it picks how many. Nobody sees who's getting
 * what, only how many are left.
 */
function GiftClaim({ itemId, owner, howMany, setHowMany }: { itemId: string; owner: string; howMany: number | null; setHowMany: (n: number) => void }) {
  const { quantity, mine, left } = giftOf(itemId);
  if (!canClaimGift(itemId)) {
    return (
      <>
        <View style={styles.taken}><Mono size={13} color={colors.inkSoft}>someone’s getting this</Mono></View>
        <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>it’s off the asks tab now so no one doubles up.</Mono>
      </>
    );
  }
  const most = left + mine;
  const n = Math.min(most, Math.max(1, howMany ?? (mine || 1)));
  const button = (
    <Button
      label="i'll get it"
      tone={mine ? 'bark' : 'outline'}
      onPress={() => {
        toggle(!mine);
        claimGift(itemId, mine ? 0 : n);
      }}
      accessibilityLabel={mine ? `You're getting ${mine}. Tap to take it back` : `I'll get ${quantity > 1 ? n : 'it'}`}
      style={quantity > 1 ? { flex: 1 } : undefined}
    />
  );
  return (
    <>
      {quantity > 1 ? (
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Stepper
            big
            value={n}
            min={1}
            max={most}
            onChange={(next) => {
              setHowMany(next);
              // already getting some: the new number is what you're getting
              if (mine) claimGift(itemId, next);
            }}
          />
          {button}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>{button}</View>
      )}
      <Mono size={11} color={colors.inkSoft} style={{ marginTop: 8, marginHorizontal: 4, lineHeight: 17 }}>
        {mine ? `you're getting ${quantity > 1 ? mine : 'it'}. tap again to uncheck.` : `no one sees who's getting it, not even ${owner}. just how many are left.`}
      </Mono>
    </>
  );
}

const styles = StyleSheet.create({
  taken: { marginTop: 16, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink, borderTopLeftRadius: 13, borderTopRightRadius: 11, borderBottomRightRadius: 14, borderBottomLeftRadius: 12 },
  card: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  close: { alignItems: 'center', gap: 2, paddingTop: 2 },
  doneRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  doneChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11, backgroundColor: colors.bark },
});
