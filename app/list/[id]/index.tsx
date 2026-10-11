import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Item, useDb } from '@/api/db';
import { deleteItem, itemsForList, markDone, undoDone } from '@/api/items';
import { canViewList, getList, invitedBy, isMember, listPeople, listProgress, membership, progressLabel, renameList, respondInvite, setVisibility, viewerIds, visibilityLabel } from '@/api/lists';
import { AvatarStack } from '@/components/Avatar';
import { DoneToast } from '@/components/DoneToast';
import { FolderCard } from '@/components/FolderCard';
import { Header } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { ItemRow } from '@/components/ItemRow';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold, Serif } from '@/components/Text';
import { TextAction } from '@/components/TextAction';
import { TitleField } from '@/components/TitleField';
import { VisibilityPicker } from '@/components/VisibilityPicker';
import { colors, space } from '@/theme';

/**
 * A list, yours or a friend's. Members get checkboxes and the paper plane; everyone else gets stars.
 * Members can also Edit: rename the list and take things off it. Nothing changes until Done.
 */
export default function ListScreen() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [toast, setToast] = useState<Item | null>(null);
  const [pickingVisibility, setPickingVisibility] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [removed, setRemoved] = useState<string[]>([]);
  const list = getList(id);

  if (!list || !canViewList(id)) {
    return (
      <Screen tabBar="home" header={<Header />}>
        <Serif size={24}>can't open this list</Serif>
        <Sans color={colors.inkSoft}>It's private, or it's gone.</Sans>
      </Screen>
    );
  }

  const member = isMember(id);
  const invited = membership(id)?.status === 'invited';
  const owner = member; // everyone on a list is an equal owner
  const { done, total } = listProgress(id);
  const items = itemsForList(id);
  const open = items.open.filter((i) => !removed.includes(i.id));
  const finished = items.done.filter((i) => !removed.includes(i.id));

  const startEdit = () => {
    setTitle(list.title);
    setRemoved([]);
    setToast(null);
    setPickingVisibility(false);
    setEditing(true);
  };
  const stopEdit = () => {
    setRemoved([]);
    setEditing(false);
  };
  const save = () => {
    renameList(id, title);
    removed.forEach(deleteItem);
    stopEdit();
  };
  const remove = editing ? (item: Item) => setRemoved((r) => [...r, item.id]) : undefined;

  const check = (item: Item) => {
    if (item.done_at) {
      undoDone(item.id);
      setToast(null);
    } else {
      markDone(item.id);
      setToast(item);
    }
  };
  // once the post is out, a finished list gets its own "you finished" moment
  const afterToast = () => {
    setToast(null);
    if (getList(id)?.completed_at) router.push(`/done/${id}?kind=list`);
  };

  return (
    <Screen
      tabBar={member ? 'lists' : 'home'}
      header={
        editing ? (
          <Header left={<TextAction label="Cancel" quiet onPress={stopEdit} />} right={<TextAction label="Done" onPress={save} />} />
        ) : (
          <Header right={member ? <TextAction label="Edit" onPress={startEdit} /> : undefined} />
        )
      }
      overlay={
        toast ? (
          <DoneToast
            title={toast.title}
            onAddPics={() => { setToast(null); router.push(`/done/${toast.id}`); }}
            onUndo={() => { undoDone(toast.id); setToast(null); }}
            onLater={afterToast}
          />
        ) : null
      }
    >
      <FolderCard tab={progressLabel(id)} style={{ marginHorizontal: -4, marginBottom: space.lg }}>
        {editing ? (
          <TitleField editing value={title} onChange={setTitle} placeholder="name your list" />
        ) : (
          <Serif size={28} style={{ lineHeight: 32 }}>{list.title}</Serif>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.lg }}>
          <AvatarStack people={listPeople(id)} size={30} />
          {owner && !editing ? (
            <Pressable onPress={() => setPickingVisibility(!pickingVisibility)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityRole="button" accessibilityLabel={`Who can see it: ${visibilityLabel(list)}`}>
              <Mono size={13}>{visibilityLabel(list)}</Mono>
              <Icon name="down" size={14} />
            </Pressable>
          ) : (
            <Mono size={13}>{visibilityLabel(list)}</Mono>
          )}
        </View>
        {owner && pickingVisibility ? (
          <View style={{ marginBottom: space.lg }}>
            <VisibilityPicker
              value={list.visibility}
              specificCount={viewerIds(id).length}
              onChange={(v) => { setVisibility(id, v); setPickingVisibility(false); }}
              onPickPeople={() => router.push(`/list/${id}/people?mode=viewers`)}
            />
            <Pressable onPress={() => router.push(`/list/${id}/people?mode=members`)} style={{ paddingTop: space.md }} accessibilityRole="button">
              <SansBold>+ invite people to this list</SansBold>
            </Pressable>
          </View>
        ) : null}
        <ProgressBar done={done} total={total} height={8} />
      </FolderCard>

      {invited ? (
        <View style={{ backgroundColor: colors.cream, borderRadius: 16, borderWidth: 2, borderColor: colors.gold, padding: space.lg, marginHorizontal: -4, marginBottom: space.lg }}>
          <Sans>{invitedBy(id)?.name} invited you to this list.</Sans>
          <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.md }}>
            <Pressable onPress={() => respondInvite(id, true)} accessibilityRole="button"><SansBold>Join</SansBold></Pressable>
            <Pressable onPress={() => { respondInvite(id, false); router.back(); }} accessibilityRole="button"><Sans color={colors.inkSoft}>No thanks</Sans></Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ marginHorizontal: -4 }}>
        {open.map((item) => <ItemRow key={item.id} item={item} member={member} onCheck={check} onRemove={remove} />)}
        {member && !editing ? (
          <Pressable onPress={() => router.push(`/item/new?list=${id}`)} style={{ paddingHorizontal: 10, paddingVertical: space.lg }} accessibilityRole="button">
            <SansBold size={16} color={colors.dark}>+ add a thing</SansBold>
          </Pressable>
        ) : <View style={{ height: space.md }} />}
        {finished.map((item) => <ItemRow key={item.id} item={item} member={member} onCheck={check} onRemove={remove} />)}
        {removed.length ? <Mono color={colors.inkSoft} style={{ paddingHorizontal: 10, paddingTop: space.sm }}>{removed.length} to delete · tap Done to confirm</Mono> : null}
        {total === 0 && !member ? <Sans color={colors.inkSoft}>Nothing on this list yet.</Sans> : null}
      </View>
    </Screen>
  );
}
