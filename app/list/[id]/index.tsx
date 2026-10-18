import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db, useDb } from '@/api/db';
import { deleteItem, itemsForList, markDone, reorderItems, undoDone } from '@/api/items';
import {
  canViewList, deleteList, getList, invitedBy, isListDone, isMember, leaveList, listPeople, listProgress, membership,
  renameList, respondInvite,
} from '@/api/lists';
import { AvatarStack } from '@/components/Avatar';
import { Pill } from '@/components/Button';
import { DoneSheet } from '@/components/DoneSheet';
import { FolderTab } from '@/components/FolderTab';
import { goBack, Header } from '@/components/Header';
import { DoneRow, OpenRow } from '@/components/ItemRow';
import { EditableTitle } from '@/components/ListFields';
import { ListSettingsSheet } from '@/components/ListSettingsSheet';
import { MoreMenu } from '@/components/MoreMenu';
import { Paper } from '@/components/Paper';
import { PeoplePress } from '@/components/PeopleSheet';
import { ProgressBar } from '@/components/ProgressBar';
import { Reorderable } from '@/components/Reorderable';
import { ReportSheet } from '@/components/ReportSheet';
import { FolderScreen } from '@/components/Screen';
import { Hand, Label, Mono } from '@/components/Text';
import { success, tap, toggle } from '@/haptics';
import { names } from '@/lib';
import { colors } from '@/theme';

/**
 * A list, yours or a friend's. On yours: tap an item's circle to cross it off, tap the title to rename it,
 * slide a row left to delete it, and find owners and who can see it under ⋯. There's no edit mode.
 * On a friend's: open invites get "interested".
 */
export default function ListScreen() {
  useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = getList(id);

  const [cele, setCele] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [dragging, setDragging] = useState(false);

  // deleted here: stay blank while the screen slides away
  if (deleted) return <FolderScreen header={<Header />} folderTabs={<FolderTab label=" " />}>{null}</FolderScreen>;
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
  const open = items.open;
  const finished = items.done;
  const others = people.filter((p) => p.id !== db.me);
  const owner = others[0] ?? people[0];
  // whoever started it, for reports: a list can have several owners, and only one of them made it
  // (left out if they've since left it, or that post isn't visible to you)
  const made = db.events.find((e) => e.list_id === id && e.kind === 'list_created');
  const maker = made ? people.find((p) => p.id === made.actor_id) : undefined;

  // ---- crossing things off ----
  const crossOff = (itemId: string) => {
    success();
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

  const destroy = () => {
    setSettings(false);
    setDeleted(true);
    deleteList(id);
    goBack();
  };

  const leave = () => {
    // blank while sliding away, same as deleting: otherwise it flashes the view for people not on the list
    setSettings(false);
    setDeleted(true);
    leaveList(id);
    goBack();
  };

  // only here through an open invite: say so, since the rest of the list is hidden
  const partial = !member && !invited && !whole;

  const celeItem = cele ? items.done.find((i) => i.id === cele) ?? items.open.find((i) => i.id === cele) : undefined;
  const tabLabel = member || invited ? `${list.title} · ${done}/${total}` : list.title;

  return (
    <FolderScreen
      header={
        <Header
          right={member ? (
            <MoreMenu
              label="More: list settings, delete list"
              actions={[
                { label: 'list settings', onPress: () => setSettings(true) },
                { label: 'delete list', confirm: true, onPress: destroy },
              ]}
            />
          ) : !member ? (
            <MoreMenu label="More: report list" actions={[{ label: 'report list', danger: true, onPress: () => setReporting(true) }]} />
          ) : undefined}
        />
      }
      scrollEnabled={!dragging}
      folderTabs={<FolderTab label={tabLabel} onPress={!member && owner ? () => router.push(`/user/${owner.username}`) : undefined} />}
      overlay={celeItem ? <DoneSheet itemId={celeItem.id} title={celeItem.title} count={`${listProgress(id).done} of ${listProgress(id).total} done`} onCard={() => afterCele(true)} onLater={() => afterCele(false)} /> : null}
    >
      <View style={{ paddingHorizontal: 4 }}>
          <EditableTitle value={list.title} onSave={member ? (t) => renameList(id, t) : undefined} size={28} placeholder="untitled list" />
          <PeoplePress people={people} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, alignSelf: 'flex-start' }}>
            <AvatarStack people={people} size={22} />
            <Mono size={11}>{names(people)}</Mono>
          </PeoplePress>
          {!member && whole ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <ProgressBar done={done} total={total} height={9} outlined />
              <Mono size={10.5}>{done} of {total}</Mono>
            </View>
          ) : null}
      </View>

      {invited ? (
        <Paper fill={colors.cream} edge="ink" shape={2} style={{ padding: 14, marginTop: 16, gap: 10 }}>
          <Mono size={12}>{invitedBy(id)?.name ?? 'someone'} invited you to this list.</Mono>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pill label="join" height={36} onPress={() => { toggle(true); respondInvite(id, true); }} />
            <Pill label="no thanks" on height={36} onPress={() => { toggle(false); respondInvite(id, false); router.back(); }} />
          </View>
        </Paper>
      ) : null}

      {/* nothing left to do: no heading, just the done section (and "+ add" if it's yours) */}
      {open.length ? <Label style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 2 }}>{whole ? 'to do' : 'open invites'}</Label> : null}
      <View style={{ gap: member ? 6 : 8, marginTop: open.length ? 0 : 18 }}>
        {/* first, so it's reachable without scrolling; new items land right under it */}
        {member ? (
          <Paper onPress={() => router.push(`/item/new?list=${id}`)} edge="dash" shape={3} style={{ height: 48, justifyContent: 'center', paddingLeft: 18 }} accessibilityLabel="Add an item to this list">
            <Hand size={18} color={colors.inkSoft}>{total ? '+ add' : '+ add the first thing'}</Hand>
          </Paper>
        ) : null}
        {/* nothing on it at all: say so rather than leave the folder blank */}
        {!total && !member ? <Mono size={12} color={colors.inkSoft} style={{ marginHorizontal: 4 }}>nothing on this list yet.</Mono> : null}
        {/* yours: hold a row and drag it to put the list in order */}
        {open.length ? (
          <Reorderable items={open} gap={member ? 6 : 8} onReorder={member ? (ids) => reorderItems(id, ids) : undefined} onDragging={setDragging}>
            {(item) => (
              <OpenRow
                item={item}
                member={member}
                onDone={() => crossOff(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            )}
          </Reorderable>
        ) : null}
      </View>

      {finished.length ? (
        <>
          <Label style={{ marginTop: open.length || member ? 24 : 0, marginBottom: 8, marginHorizontal: 2 }}>done · {finished.length}</Label>
          <View style={{ gap: 4 }}>
            {finished.map((item, i) => (
              <DoneRow
                key={item.id}
                item={item}
                index={i}
                onUndo={member ? () => { tap(); undoDone(item.id); } : undefined}
                onDelete={member ? () => deleteItem(item.id) : undefined}
              />
            ))}
          </View>
        </>
      ) : null}

      {partial ? <Mono size={10.5} color={colors.inkSoft} style={{ marginTop: 22, marginHorizontal: 4, lineHeight: 16 }}>you’re only seeing what you’re invited to on this list</Mono> : null}

      {settings ? <ListSettingsSheet listId={id} onClose={() => setSettings(false)} onDelete={destroy} onLeave={leave} /> : null}
      {reporting ? (
        <ReportSheet what="this list" target={{ profile_id: maker?.id, list_id: id, content: list.title }} person={maker} onClose={() => setReporting(false)} />
      ) : null}
    </FolderScreen>
  );
}
