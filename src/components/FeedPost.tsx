import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, FeedEvent } from '@/api/db';
import { getItem, photosFor } from '@/api/items';
import { getList, listPeople, listProgress } from '@/api/lists';
import { getProfile } from '@/api/profiles';
import { longDay, names, timeAgo } from '@/lib';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { Icon, IconName } from './Icon';
import { Photo } from './Photo';
import { PhotoViewer } from './PhotoViewer';
import { Hand, Mono, MonoMedium } from './Text';

type Kind = Exclude<FeedEvent['kind'], 'open_invite'>;

/** The icon at the start of each post: what kind of thing happened. */
const MARK: Record<Kind, { icon: IconName; color: string }> = {
  list_created: { icon: 'folder', color: colors.ink },
  list_done: { icon: 'folder', color: colors.olive },
  item_added: { icon: 'plus', color: colors.ink },
  item_done: { icon: 'check', color: colors.olive },
};

/**
 * One post on Home, read like a notification: a mark for what happened, the faces of who did it,
 * what they did, the item or list in big type, where it lives, and the item's photos underneath (tap one to see it big).
 * Lines are separated by a rule rather than each sitting in its own box.
 */
export function FeedPost({ event, index }: { event: FeedEvent; index: number }) {
  const [viewing, setViewing] = useState<number | null>(null);
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

  // stacked, biggest in the middle: who + what they did (small), the item or list (big), where it lives (small)
  const verb = { list_created: 'started a list', list_done: 'finished a list', item_added: 'added', item_done: 'did' }[kind];
  const title = item ? item.title : list.title;
  const under = {
    list_created: null,
    list_done: `all ${total} done`,
    item_added: [list.title, item?.date ? longDay(item.date) : null].filter(Boolean).join(' · '),
    item_done: `${list.title} · ${done}/${total}`,
  }[kind];

  // up to three photos in a row under the sentence; one photo gets the full width
  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;

  const everyone = people.length ? people : [actor];
  const solo = everyone.length === 1 && everyone[0].id !== db.me ? everyone[0] : null;

  return (
    <View style={[styles.post, index > 0 && styles.rule]}>
      <View style={styles.row}>
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">
          <Icon name={mark.icon} size={22} color={mark.color} strokeWidth={kind === 'item_done' ? 2.4 : 1.9} />
        </View>
        <View style={styles.text}>
          {/* faces of everyone who did it (up to three), small, with when on the right */}
          <View style={styles.top}>
            <Pressable
              onPress={solo ? () => router.push(`/user/${solo.username}`) : undefined}
              disabled={!solo}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={solo ? `${solo.name}'s profile` : who}
            >
              <AvatarStack people={everyone} size={22} max={3} />
            </Pressable>
            <Mono size={11.5} numberOfLines={1} style={{ flexShrink: 1 }}>
              <MonoMedium size={11.5}>{who}</MonoMedium> {verb}
            </Mono>
            <Mono size={10.5} color={colors.inkSoft} style={{ marginLeft: 'auto' }}>{timeAgo(event.created_at)}</Mono>
          </View>
          <Pressable onPress={open} style={{ gap: 3 }} accessibilityRole="button" accessibilityLabel={`${who} ${verb} ${title}`}>
            <Hand size={21} style={{ lineHeight: 25 }}>{title}</Hand>
            {under ? <Mono size={11} color={colors.inkSoft}>{under}</Mono> : null}
          </Pressable>
        </View>
      </View>
      {shown.length ? (
        <View style={styles.photos}>
          {shown.map((photo, i) => (
            <Pressable key={photo.id} onPress={() => setViewing(i)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`View photo ${i + 1} of ${photos.length}`}>
              <Photo photo={photo} shape={index + i} style={{ height: shown.length === 1 ? 170 : 104 }} />
              {extra > 0 && i === shown.length - 1 ? (
                <View style={styles.more}><Mono size={10.5} color={colors.paper}>+{extra}</Mono></View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      <PhotoViewer photos={photos} start={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingVertical: 20, paddingHorizontal: 4, gap: 12 },
  rule: { borderTopWidth: 1, borderTopColor: colors.rule },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  // just the icon, lined up with the faces on the top line; olive when something got done
  mark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30 },
  // lined up under the sentence, not under the mark
  photos: { flexDirection: 'row', gap: 6, marginLeft: 42 },
  more: { position: 'absolute', right: 5, bottom: 5, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 7, backgroundColor: 'rgba(58,16,0,0.7)' },
});
