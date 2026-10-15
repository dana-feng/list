import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { db, FeedEvent, Profile } from '@/api/db';
import { getItem, photosFor } from '@/api/items';
import { getList, listPeople } from '@/api/lists';
import { getProfile } from '@/api/profiles';
import { commentCount, likedByMe, likesFor, toggleLike } from '@/api/reactions';
import { tap } from '@/haptics';
import { longDay, names, timeAgo } from '@/lib';
import { colors } from '@/theme';
import { AvatarStack } from './Avatar';
import { CommentsSheet } from './CommentsSheet';
import { Icon, IconName } from './Icon';
import { PeoplePress } from './PeopleSheet';
import { openProfile } from './PersonRow';
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

/** Everything a post shows, or null when it can't be shown (open invites, or something you can't see). */
export function describePost(event: FeedEvent) {
  const list = getList(event.list_id);
  const item = event.item_id ? getItem(event.item_id) : undefined;
  const actor = getProfile(event.actor_id);
  // open invites never show here: they live under Open Invite
  if (!list || !actor || (event.item_id && !item) || event.kind === 'open_invite') return null;

  const kind: Kind = event.kind;
  // "done" and "finished" belong to everyone on the list, not just whoever crossed it off
  const crew = kind === 'item_done' || kind === 'list_done' ? listPeople(list.id) : [actor];
  const people = crew.length ? crew : [actor];
  // stacked, biggest in the middle: who + what they did (small), the item or list (big), where it lives (small)
  const verb = { list_created: 'started a list', list_done: 'finished a list', item_added: 'added', item_done: 'did' }[kind];
  const under = {
    list_created: null,
    list_done: null,
    item_added: [list.title, item?.date ? `due ${longDay(item.date)}` : null].filter(Boolean).join(' · '),
    item_done: list.title,
  }[kind];
  return {
    kind, list, item, people, verb, under,
    title: item ? item.title : list.title,
    photos: item ? photosFor(item.id) : [],
    path: item ? `/item/${item.id}` : `/list/${list.id}`,
  };
}

type Post = NonNullable<ReturnType<typeof describePost>>;

/**
 * One post on Home, read like a notification: a mark for what happened, the faces of who did it,
 * what they did, the item or list in big type, where it lives, and the item's photos underneath (tap one to see it big).
 * Under that, likes and comments: comments open in a sheet, never inline.
 * Lines are separated by a rule rather than each sitting in its own box.
 */
export function FeedPost({ event, index }: { event: FeedEvent; index: number }) {
  const [talking, setTalking] = useState(false);
  const post = describePost(event);
  if (!post) return null;
  return (
    <View style={[styles.post, index > 0 && styles.rule]}>
      <PostBody event={event} post={post} index={index} />
      <Reactions event={event} onComments={() => setTalking(true)} />
      {talking ? <CommentsSheet event={event} post={post} index={index} onClose={() => setTalking(false)} /> : null}
    </View>
  );
}

/**
 * The post itself, without likes and comments. Also the top of the comments sheet, where `go`
 * closes the sheet before following a link.
 */
export function PostBody({ event, post, index, go = (to) => to() }: { event: FeedEvent; post: Post; index: number; go?: (to: () => void) => void }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const { kind, people, verb, title, under, photos, path } = post;
  const mark = MARK[kind];
  const who = names(people);
  // up to three photos in a row under the sentence; one photo gets the full width
  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;

  return (
    <>
      <View style={styles.row}>
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">
          <Icon name={mark.icon} size={22} color={mark.color} strokeWidth={kind === 'item_done' ? 2.4 : 1.9} />
        </View>
        <View style={styles.text}>
          {/* faces of everyone who did it (up to three), small, with when on the right */}
          <View style={styles.top}>
            <PeoplePress people={people} go={go} hitSlop={8}>
              <AvatarStack people={people} size={22} max={3} />
            </PeoplePress>
            <Mono size={11.5} numberOfLines={1} style={{ flexShrink: 1 }}>
              <PeopleNames people={people} go={go} /> {verb}
            </Mono>
            <Mono size={10.5} color={colors.inkSoft} style={{ marginLeft: 'auto' }}>{timeAgo(event.created_at)}</Mono>
          </View>
          <Pressable onPress={() => go(() => router.push(path as never))} style={{ gap: 3 }} accessibilityRole="button" accessibilityLabel={`${who} ${verb} ${title}`}>
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
    </>
  );
}

/** "you + dana feng", each name opening that person's profile. */
export function PeopleNames({ people, go = (to) => to() }: { people: Profile[]; go?: (to: () => void) => void }) {
  return (
    <>
      {people.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 ? ' + ' : null}
          <Text onPress={() => go(() => openProfile(p))} accessibilityRole="link" accessibilityLabel={`${p.name}'s profile`}>
            <MonoMedium size={11.5}>{p.id === db.me ? 'you' : p.name}</MonoMedium>
          </Text>
        </Fragment>
      ))}
    </>
  );
}

/** ♡ and comments under a post, lined up with the text. Counts show once there are any. */
function Reactions({ event, onComments }: { event: FeedEvent; onComments: () => void }) {
  const liked = likedByMe(event.id);
  const likes = likesFor(event.id).length;
  const comments = commentCount(event.id);
  return (
    <View style={styles.reactions}>
      <Pressable
        onPress={() => {
          tap();
          toggleLike(event.id);
        }}
        hitSlop={8}
        style={styles.reaction}
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={`${liked ? 'Unlike' : 'Like'}${likes ? `, ${likes} ${likes === 1 ? 'like' : 'likes'}` : ''}`}
      >
        <Icon name={liked ? 'heartFilled' : 'heart'} size={17} color={liked ? colors.olive : colors.inkSoft} strokeWidth={1.8} />
        {likes ? <Mono size={11} color={liked ? colors.ink : colors.inkSoft}>{likes}</Mono> : null}
      </Pressable>
      <Pressable onPress={onComments} hitSlop={8} style={styles.reaction} accessibilityRole="button" accessibilityLabel={comments ? `${comments} comments` : 'Comment'}>
        <Icon name="comment" size={17} color={comments ? colors.ink : colors.inkSoft} strokeWidth={1.8} />
        <Mono size={11} color={comments ? colors.ink : colors.inkSoft}>{comments ? `${comments} ${comments === 1 ? 'comment' : 'comments'}` : 'reply'}</Mono>
      </Pressable>
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
  reactions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginLeft: 42, marginTop: -2 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
});
