import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { FeedEvent } from '@/api/db';
import { getItem, photosFor } from '@/api/items';
import { getList, listPeople, listProgress } from '@/api/lists';
import { getProfile } from '@/api/profiles';
import { longDay, names, timeAgo } from '@/lib';
import { colors, space } from '@/theme';
import { AvatarStack } from './Avatar';
import { InterestButton } from './InterestButton';
import { Photo } from './Photo';
import { ProgressBar } from './ProgressBar';
import { Mono, Sans, SansBold, Serif } from './Text';

const VERB = {
  open_invite: 'open invite',
  item_added: 'added a thing',
  item_done: 'did it',
  list_done: 'finished a list',
  list_created: 'started a list',
} as const;

/** One post on Home: open invite, added a thing, did it, finished a list, started a list. */
export function FeedPost({ event }: { event: FeedEvent }) {
  const list = getList(event.list_id);
  const item = event.item_id ? getItem(event.item_id) : undefined;
  const actor = getProfile(event.actor_id);
  if (!list || !actor || (event.item_id && !item)) return null;

  // "did it" and "finished" belong to everyone on the list, not just whoever tapped the box
  const shared = event.kind === 'item_done' || event.kind === 'list_done';
  const people = shared ? listPeople(list.id) : [actor];
  const { done, total } = listProgress(list.id);
  // list posts have no photo of their own; anything about an item shows its first one
  const photo = item ? photosFor(item.id).find((p) => p.path != null) : undefined;
  const open = () => router.push(item ? `/item/${item.id}` : `/list/${list.id}`);

  const meta: string[] = [];
  if (item) {
    if (event.kind !== 'item_done' && item.date) meta.push(longDay(item.date));
    meta.push(event.kind === 'item_done' ? `${list.title} · ${done}/${total}` : list.title);
  } else {
    meta.push(`${total} ${total === 1 ? 'thing' : 'things'}`);
  }

  return (
    <View style={styles.post}>
      <Pressable style={styles.who} onPress={() => router.push(`/user/${actor.username}`)}>
        <AvatarStack people={people} size={30} ring="rgba(247,242,227,0.5)" />
        <Sans size={15} color={colors.inkSoft} style={{ flex: 1 }}>
          <SansBold size={15}>{names(people)}</SansBold>
          {shared ? ' ' : ' · '}
          {VERB[event.kind]} · {timeAgo(event.created_at)}
        </Sans>
      </Pressable>
      {photo ? (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={item!.title}>
          <Photo photo={photo} style={styles.photo} />
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable onPress={open} style={{ flex: 1 }} accessibilityRole="button">
          <Serif size={23} style={{ lineHeight: 27 }}>{item ? item.title : list.title}</Serif>
          <Mono color={colors.inkSoft} style={{ marginTop: 5 }}>{meta.join(' · ')}</Mono>
          {event.kind === 'list_done' ? (
            <View style={{ marginTop: space.md }}>
              <ProgressBar done={done} total={total} />
            </View>
          ) : null}
        </Pressable>
        {item && !item.done_at ? <InterestButton itemId={item.id} showCount /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingVertical: space.lg, borderBottomWidth: 1.5, borderBottomColor: colors.line },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  photo: { width: '100%', aspectRatio: 1.17, marginBottom: space.md },
});
