import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db, useDb } from '@/api/db';
import { deleteItem, itemsForList, markDone, undoDone } from '@/api/items';
import {
  canViewList, getList, inviteMembers, invitedBy, isListDone, isMember, listPeople, listProgress, membership, renameList, respondInvite,
  setViewers, setVisibility, viewerIds,
} from '@/api/lists';
import { isFollowing } from '@/api/profiles';
import { AvatarStack } from '@/components/Avatar';
import { LinkText, Pill } from '@/components/Button';
import { DoneSheet } from '@/components/DoneSheet';
import { FolderTab } from '@/components/FolderTab';
import { Header, SaveAction, TextAction } from '@/components/Header';
import { DoneRow, OpenRow } from '@/components/ItemRow';
import { ListFields } from '@/components/ListFields';
import { Paper } from '@/components/Paper';
import { ProgressBar } from '@/components/ProgressBar';
import { FolderScreen } from '@/components/Screen';
import { Hand, Label, Mono } from '@/components/Text';
import { Choice } from '@/components/VisibilityPicker';
import { names } from '@/lib';
import { colors } from '@/theme';

const SHOW_DONE = 3;

/**
 * A list, yours or a friend's. On yours: tap an item's circle to cross it off.
 * On a friend's: open invites get "i'm down". Owners can also edit: rename, owners, who can see it, take items off.
 */
export default function ListScreen() {
  useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = getList(id);

  const [cele, setCele] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [invites, setInvites] = useState<string[]>([]);
  const [choice, setChoice] = useState<Choice>('followers');
  const [viewers, setViewerDraft] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  if (!list) {
    return (
      <FolderScreen header={<Header />} folderTabs={<FolderTab label="list" />}>
        <Hand size={24}>can’t open this list</Hand>
        <Mono size={12} color={colors.inkSoft}>it’s private, or it’s gone.</Mono>
      </FolderScreen>
    );
  }

  const member = isMember(id);
  // false when you're only here through an open invite: you get the list's name, its people and what you're invited to
  const whole = canViewList(id);
  const invited = membership(id)?.status === 'invited';
  const people = listPeople(id);
  const { done, total } = listProgress(id);
  const items = itemsForList(id);
  const open = items.open.filter((i) => !removed.includes(i.id));
  const finished = items.done.filter((i) => !removed.includes(i.id));
  const shownDone = allDone || editing ? finished : finished.slice(0, SHOW_DONE);
  const others = people.filter((p) => p.id !== db.me);
  const owner = others[0] ?? people[0];

  // ---- crossing things off ----
  const crossOff = (itemId: string) => {
    markDone(itemId);
    setCele(itemId);
  };
  // once that's out of the way, a finished list gets its own moment
  const afterCele = (toCard: boolean) => {
    const itemId = cele;
    setCele(null);
    if (toCard && itemId) router.push(`/done/${itemId}`);
    else if (isListDone(id)) router.push(`/done/${id}?kind=list`);
  };

  // ---- editing ----
  const startEdit = () => {
    setTitle(list.title);
    setInvites([]);
    setChoice(list.visibility);
    setViewerDraft(viewerIds(id));
    setRemoved([]);
    setEditing(true);
  };
  const stopEdit = () => {
    setRemoved([]);
    setEditing(false);
  };
  const save = () => {
    renameList(id, title);
    if (invites.length) inviteMembers(id, invites);
    if (choice === 'specific') {
      const was = viewerIds(id);
      if (viewers.length !== was.length || viewers.some((v) => !was.includes(v))) setViewers(id, viewers);
    }
    if (choice !== list.visibility) setVisibility(id, choice);
    removed.forEach(deleteItem);
    stopEdit();
  };

  const why =
    member || invited
      ? null
      : !whole
        ? "you're only seeing what you're invited to on this list"
      : list.visibility === 'anyone'
        ? "you can see this list because it's open to anyone"
        : list.visibility === 'specific'
          ? 'you can see this list because they picked you'
          : (() => {
              const followed = people.find((p) => isFollowing(p.id));
              return followed ? `you can see this list because you follow ${followed.name}` : null;
            })();

  const celeItem = cele ? items.done.find((i) => i.id === cele) ?? items.open.find((i) => i.id === cele) : undefined;
  const tabLabel = member || invited ? `${list.title} · ${done}/${total}` : `${owner ? `${owner.name}'s · ` : ''}${list.title}`;

  return (
    <FolderScreen
      header={
        editing ? (
          <Header left={<TextAction label="cancel" onPress={stopEdit} />} title="edit" right={<SaveAction onPress={save} disabled={!title.trim()} />} />
        ) : (
          <Header right={member ? <TextAction label="edit" onPress={startEdit} /> : undefined} />
        )
      }
      folderTabs={<FolderTab label={tabLabel} onPress={!member && owner ? () => router.push(`/user/${owner.username}`) : undefined} />}
      overlay={celeItem ? <DoneSheet title={celeItem.title} count={`${listProgress(id).done} of ${listProgress(id).total} done`} onCard={() => afterCele(true)} onLater={() => afterCele(false)} /> : null}
    >
      {editing ? (
        <ListFields
          title={title}
          onTitle={setTitle}
          owners={invites}
          lockedOwners={db.list_members.filter((m) => m.list_id === id && m.user_id !== db.me).map((m) => m.user_id)}
          onOwners={setInvites}
          choice={choice}
          viewers={viewers}
          onVisibility={(c, v) => { setChoice(c); setViewerDraft(v); }}
        />
      ) : (
        <View style={{ paddingHorizontal: 4 }}>
          <Hand size={28} style={{ lineHeight: 30 }}>{list.title}</Hand>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <AvatarStack people={people} size={22} />
            <Mono size={11}>{names(people)}</Mono>
          </View>
          {!member && whole ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <ProgressBar done={done} total={total} height={9} outlined />
              <Mono size={10.5}>{done} of {total}</Mono>
            </View>
          ) : null}
        </View>
      )}

      {invited ? (
        <Paper fill={colors.cream} edge="ink" shape={2} style={{ padding: 14, marginTop: 16, gap: 10 }}>
          <Mono size={12}>{invitedBy(id)?.name ?? 'someone'} invited you to this list.</Mono>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pill label="join" height={36} onPress={() => respondInvite(id, true)} />
            <Pill label="no thanks" on height={36} onPress={() => { respondInvite(id, false); router.back(); }} />
          </View>
        </Paper>
      ) : null}

      <Label style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 2 }}>{whole ? 'to do' : 'open invites'}</Label>
      <View style={{ gap: member ? 6 : 8 }}>
        {open.map((item, i) => (
          <OpenRow
            key={item.id}
            item={item}
            index={i}
            member={member}
            onDone={() => crossOff(item.id)}
            onRemove={editing ? () => setRemoved((r) => [...r, item.id]) : undefined}
          />
        ))}
        {member && !editing ? (
          <Paper onPress={() => router.push(`/item/new?list=${id}`)} edge="dash" shape={3} style={{ height: 48, justifyContent: 'center', paddingLeft: 18 }} accessibilityLabel="Add an item to this list">
            <Hand size={18} color={colors.inkSoft}>+ write another</Hand>
          </Paper>
        ) : null}
        {!open.length && !member ? <Mono size={12} color={colors.inkSoft}>nothing left to do here.</Mono> : null}
      </View>

      {finished.length ? (
        <>
          <Label style={{ marginTop: 24, marginBottom: 8, marginHorizontal: 2 }}>done · {finished.length}</Label>
          <View style={{ gap: 4 }}>
            {shownDone.map((item, i) => (
              <DoneRow
                key={item.id}
                item={item}
                index={i}
                onUndo={member ? () => undoDone(item.id) : undefined}
                onRemove={editing ? () => setRemoved((r) => [...r, item.id]) : undefined}
              />
            ))}
            {!allDone && !editing && finished.length > SHOW_DONE ? (
              <LinkText label={`show all ${finished.length} done`} onPress={() => setAllDone(true)} />
            ) : null}
          </View>
        </>
      ) : null}

      {editing && removed.length ? (
        <Mono size={11} color={colors.inkSoft} style={{ marginTop: 12 }}>{removed.length} to delete · tap save to confirm</Mono>
      ) : null}
      {why ? <Mono size={10.5} color={colors.inkSoft} style={{ marginTop: 22, marginHorizontal: 4, lineHeight: 16 }}>{why}</Mono> : null}
    </FolderScreen>
  );
}
