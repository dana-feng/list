import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Item, useDb } from '@/api/db';
import { itemsForList, markDone, undoDone } from '@/api/items';
import { canViewList, getList, invitedBy, isMember, listPeople, listProgress, membership, progressLabel, respondInvite, setVisibility, viewerIds, visibilityLabel } from '@/api/lists';
import { AvatarStack } from '@/components/Avatar';
import { DoneToast } from '@/components/DoneToast';
import { FolderCard } from '@/components/FolderCard';
import { Header } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { ItemRow } from '@/components/ItemRow';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Mono, Sans, SansBold, Serif } from '@/components/Text';
import { VisibilityPicker } from '@/components/VisibilityPicker';
import { colors, space } from '@/theme';

/** A list, yours or a friend's. Members get checkboxes and the paper plane; everyone else gets stars. */
export default function ListScreen() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [toast, setToast] = useState<Item | null>(null);
  const [pickingVisibility, setPickingVisibility] = useState(false);
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
  const owner = list.owner_id === db.me;
  const { done, total } = listProgress(id);
  const { open, done: finished } = itemsForList(id);

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
      header={<Header />}
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
        <Serif size={28} style={{ lineHeight: 32 }}>{list.title}</Serif>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.lg }}>
          <AvatarStack people={listPeople(id)} size={30} />
          {owner ? (
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
        {open.map((item) => <ItemRow key={item.id} item={item} member={member} onCheck={check} />)}
        {member ? (
          <Pressable onPress={() => router.push(`/item/new?list=${id}`)} style={{ paddingHorizontal: 10, paddingVertical: space.lg }} accessibilityRole="button">
            <SansBold size={16} color={colors.dark}>+ add a thing</SansBold>
          </Pressable>
        ) : <View style={{ height: space.md }} />}
        {finished.map((item) => <ItemRow key={item.id} item={item} member={member} onCheck={check} />)}
        {total === 0 && !member ? <Sans color={colors.inkSoft}>Nothing on this list yet.</Sans> : null}
      </View>
    </Screen>
  );
}
