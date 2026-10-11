import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { db, FeedEvent, Profile } from '@/api/db';
import { getItem, itemsForList, photosFor } from '@/api/items';
import { getList, listPeople, listProgress, progressLabel } from '@/api/lists';
import { getProfile } from '@/api/profiles';
import { longDay, names, timeAgo } from '@/lib';
import { colors, hash } from '@/theme';
import { AvatarStack } from './Avatar';
import { DownButton, DownCount } from './Down';
import { Paper } from './Paper';
import { PhotoCarousel, Photo } from './Photo';
import { ProgressBar } from './ProgressBar';
import { Strike } from './Scribble';
import { Hand, Mono, MonoMedium } from './Text';

const VERB = {
  open_invite: 'open invite',
  item_added: 'added an item',
  item_done: 'done',
  list_done: 'finished a list',
  list_created: 'started a list',
} as const;

/** "irina · open invite · 2h", with their face(s). Tapping the name opens their profile. */
function Who({ people, verb, at, joined }: { people: Profile[]; verb: string; at: string; joined?: boolean }) {
  const solo = people.length === 1 ? people[0] : null;
  const label = names(people);
  return (
    <View style={styles.who}>
      <AvatarStack people={people} size={24} />
      <Mono size={11} color={colors.inkSoft} style={{ flex: 1 }}>
        {solo && solo.id !== db.me ? (
          <MonoMedium size={11} onPress={() => router.push(`/user/${solo.username}`)} accessibilityRole="link">{label}</MonoMedium>
        ) : (
          <MonoMedium size={11}>{label}</MonoMedium>
        )}
        {joined ? ' ' : ' · '}
        {verb} · {timeAgo(at)}
      </Mono>
    </View>
  );
}

/** One post on Home. Each kind has its own card: an open invite, a crossed-off item, a new list. */
export function FeedPost({ event, index }: { event: FeedEvent; index: number }) {
  const list = getList(event.list_id);
  const item = event.item_id ? getItem(event.item_id) : undefined;
  const actor = getProfile(event.actor_id);
  if (!list || !actor || (event.item_id && !item)) return null;

  const { done, total } = listProgress(list.id);
  const photos = item ? photosFor(item.id) : [];
  const openItem = () => router.push(item ? `/item/${item.id}` : `/list/${list.id}`);

  // "done" and "finished" belong to everyone on the list, not just whoever crossed it off
  if (event.kind === 'item_done' && item) {
    const people = listPeople(list.id);
    if (!photos.length) {
      return (
        <Paper fill={colors.gold} shape={index} lean={index} style={[styles.card, { gap: 8 }]} onPress={openItem} accessibilityLabel={`${item.title}, done`}>
          <Who people={people} verb={VERB.item_done} at={event.created_at} joined={people.length > 1} />
          <View style={{ alignSelf: 'flex-start' }}>
            <Hand size={18}>{item.title}</Hand>
            <Strike seed={hash(item.id) % 97} />
          </View>
          <Mono size={11}>{list.title} · {done}/{total}</Mono>
        </Paper>
      );
    }
    return (
      <Paper fill={colors.cream} edge="ink" shape={index + 1} lean={index} style={[styles.card, { paddingHorizontal: 6, marginHorizontal: -6 }]}>
        <View style={{ paddingHorizontal: 6 }}>
          <Who people={people} verb={VERB.item_done} at={event.created_at} joined={people.length > 1} />
        </View>
        <PhotoCarousel photos={photos} height={photos.length > 1 ? 360 : 260} />
        <Pressable onPress={openItem} style={{ paddingHorizontal: 6, gap: 4 }} accessibilityRole="button">
          <Hand size={20}>{item.title}</Hand>
          <Mono size={11}>{list.title} · {done}/{total}</Mono>
        </Pressable>
      </Paper>
    );
  }

  if (event.kind === 'list_created' || event.kind === 'list_done') {
    const finished = event.kind === 'list_done';
    const fill = finished ? colors.gold : colors.straw;
    const open = itemsForList(list.id).open.map((i) => i.title);
    const preview = open.length > 3 ? `${open.slice(0, 3).join(' · ')} · +${open.length - 3} more` : open.join(' · ');
    const people = finished ? listPeople(list.id) : [actor];
    return (
      <Pressable onPress={openItem} style={[styles.folderPost, { transform: [{ rotate: `${index % 2 ? 0.3 : -0.3}deg` }] }]} accessibilityRole="button" accessibilityLabel={list.title}>
        <View style={[styles.postTab, { backgroundColor: fill }]}>
          <Mono size={10.5}>{progressLabel(list.id)}</Mono>
        </View>
        <Paper fill={fill} edge="ink" edgeWidth={1.2} shape={2} style={[styles.card, { borderTopLeftRadius: 0, gap: 8 }]}>
          <Who people={people} verb={VERB[event.kind]} at={event.created_at} joined />
          <Hand size={20}>{list.title}</Hand>
          {finished ? (
            <View style={{ flexDirection: 'row' }}><ProgressBar done={done} total={total} outlined /></View>
          ) : preview ? (
            <Mono size={11} style={{ lineHeight: 17 }}>{preview}</Mono>
          ) : null}
        </Paper>
      </Pressable>
    );
  }

  // open invite, or a plain "added an item"
  if (!item) return null;
  const invite = event.kind === 'open_invite';
  const meta = [item.date ? longDay(item.date) : null, list.title].filter(Boolean).join(' · ');
  return (
    <Paper fill={invite ? colors.sage : colors.cream} edge="ink" shape={index} lean={index} style={styles.card}>
      <Who people={[actor]} verb={VERB[event.kind]} at={event.created_at} />
      {invite && photos.length ? <Photo photo={photos[0]} style={{ height: 150 }} /> : null}
      <Pressable onPress={openItem} style={{ gap: 4 }} accessibilityRole="button">
        <Hand size={22} style={{ lineHeight: 25 }}>{item.title}</Hand>
        <Mono size={11}>{meta}</Mono>
      </Pressable>
      {invite && item.open_invite && !item.done_at ? (
        <View style={styles.bottom}>
          <DownCount itemId={item.id} />
          <DownButton itemId={item.id} />
        </View>
      ) : null}
    </Paper>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 },
  folderPost: {},
  postTab: { alignSelf: 'flex-start', height: 28, paddingHorizontal: 12, justifyContent: 'center', borderTopLeftRadius: 9, borderTopRightRadius: 11, borderWidth: 1.2, borderBottomWidth: 0, borderColor: colors.ink, marginBottom: -1.2, zIndex: 2 },
});
