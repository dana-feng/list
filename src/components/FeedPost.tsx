import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, FeedEvent } from '@/api/db';
import { getItem, photosFor } from '@/api/items';
import { getList, listPeople, listProgress } from '@/api/lists';
import { getProfile } from '@/api/profiles';
import { longDay, names, timeAgo } from '@/lib';
import { colors } from '@/theme';
import { Avatar } from './Avatar';
import { Icon, IconName } from './Icon';
import { Photo } from './Photo';
import { Mono, MonoMedium } from './Text';

type Kind = Exclude<FeedEvent['kind'], 'open_invite'>;

/** The small mark on the corner of the face: what kind of thing happened. */
const MARK: Record<Kind, { icon: IconName; fill: string; tint: string }> = {
  list_created: { icon: 'folder', fill: colors.straw, tint: colors.ink },
  list_done: { icon: 'folder', fill: colors.olive, tint: colors.paper },
  item_added: { icon: 'plus', fill: colors.sage, tint: colors.ink },
  item_done: { icon: 'check', fill: colors.olive, tint: colors.paper },
};

/**
 * One line on Home, read like a notification: a face with a small mark for what happened,
 * a sentence ("irina added rooftop dinner to fall plans"), when, and a photo if there is one.
 * Lines are separated by a rule rather than each sitting in its own box.
 */
export function FeedPost({ event, index }: { event: FeedEvent; index: number }) {
  const list = getList(event.list_id);
  const item = event.item_id ? getItem(event.item_id) : undefined;
  const actor = getProfile(event.actor_id);
  // open invites never show here: they live under Open Invite
  if (!list || !actor || (event.item_id && !item) || event.kind === 'open_invite') return null;

  const kind: Kind = event.kind;
  const { done, total } = listProgress(list.id);
  const photos = item ? photosFor(item.id) : [];
  const open = () => router.push(item ? `/item/${item.id}` : `/list/${list.id}`);
  // "done" and "finished" belong to everyone on the list, not just whoever crossed it off
  const people = kind === 'item_done' || kind === 'list_done' ? listPeople(list.id) : [actor];
  const who = names(people.length ? people : [actor]);
  const mark = MARK[kind];

  const sentence = {
    list_created: { verb: 'started a list', what: list.title, tail: '' },
    list_done: { verb: 'finished', what: list.title, tail: '' },
    item_added: { verb: 'added', what: item?.title ?? '', tail: ` to ${list.title}` },
    item_done: { verb: 'did', what: item?.title ?? '', tail: '' },
  }[kind];
  const detail = {
    list_created: null,
    list_done: `all ${total} done`,
    item_added: item?.date ? longDay(item.date) : null,
    item_done: `${list.title} · ${done}/${total}`,
  }[kind];

  return (
    <View style={[styles.row, index > 0 && styles.rule]}>
      <Pressable
        onPress={actor.id === db.me ? undefined : () => router.push(`/user/${actor.username}`)}
        style={styles.face}
        accessibilityRole="button"
        accessibilityLabel={`${actor.name}'s profile`}
      >
        <Avatar person={actor} size={36} />
        <View style={[styles.mark, { backgroundColor: mark.fill }]}>
          <Icon name={mark.icon} size={11} color={mark.tint} strokeWidth={2.4} />
        </View>
      </Pressable>
      <Pressable onPress={open} style={styles.text} accessibilityRole="button">
        <Mono size={12.5} style={{ lineHeight: 18 }}>
          <MonoMedium size={12.5}>{who}</MonoMedium> {sentence.verb} <MonoMedium size={12.5}>{sentence.what}</MonoMedium>{sentence.tail}
        </Mono>
        <Mono size={10.5} color={colors.inkSoft}>{[timeAgo(event.created_at), detail].filter(Boolean).join(' · ')}</Mono>
      </Pressable>
      {kind === 'item_done' && photos.length ? (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}>
          <Photo photo={photos[0]} style={styles.thumb} />
          {photos.length > 1 ? (
            <View style={styles.more}><Mono size={9.5} color={colors.paper}>+{photos.length - 1}</Mono></View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  rule: { borderTopWidth: 1, borderTopColor: colors.rule },
  face: { width: 40, height: 40, justifyContent: 'center' },
  mark: {
    position: 'absolute', right: -2, bottom: -1, width: 19, height: 19, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  thumb: { width: 46, height: 46 },
  more: { position: 'absolute', right: 3, bottom: 3, paddingHorizontal: 4, borderRadius: 6, backgroundColor: 'rgba(58,16,0,0.7)' },
});
