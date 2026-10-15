import { Fragment, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, EventComment, FeedEvent } from '@/api/db';
import { peopleToTag, tagBeingTyped, textParts } from '@/api/mentions';
import { getProfile, me } from '@/api/profiles';
import { addComment, canDeleteComment, deleteComment, likers, threadsFor } from '@/api/reactions';
import { hold, tap } from '@/haptics';
import { timeAgo } from '@/lib';
import { colors, fonts, noOutline } from '@/theme';
import { Avatar } from './Avatar';
import { LinkText } from './Button';
import { PostBody, type describePost } from './FeedPost';
import { Icon } from './Icon';
import { Paper } from './Paper';
import { openProfile } from './PersonRow';
import { ReportSheet } from './ReportSheet';
import { Hand, Mono, MonoMedium } from './Text';

type Post = NonNullable<ReturnType<typeof describePost>>;

/**
 * A post's comments, in a tall sheet over the feed. The post (photos full size) scrolls away with
 * the thread; only the comment box stays pinned. Every face, name and @tag opens that profile.
 * Replies sit indented under the comment they answer; press and hold one of yours to delete it,
 * or someone else's to report it.
 * Render it only while it's open.
 */
export function CommentsSheet({ event, post, index, onClose }: { event: FeedEvent; post: Post; index: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const threads = threadsFor(event.id);
  const [replyTo, setReplyTo] = useState<EventComment | null>(null);
  // Following a link closes the sheet first, then goes, so the new screen isn't under the sheet.
  const go = (to: () => void) => {
    onClose();
    setTimeout(to, 0);
  };
  // Drag the bar at the top down to put the sheet away: past a third of the way, or a flick, and it
  // goes; otherwise it springs back up. The dim fades as it goes.
  const [drop] = useState(() => new Animated.Value(0));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (gone) onClose();
  }, [gone, onClose]);
  const [handle] = useState(() => {
    const away = () =>
      Animated.timing(drop, { toValue: Dimensions.get('window').height, duration: 200, useNativeDriver: true }).start(() => setGone(true));
    const back = () => Animated.spring(drop, { toValue: 0, useNativeDriver: true, friction: 9, tension: 90 }).start();
    return {
      away,
      pan: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => drop.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => (g.dy > Dimensions.get('window').height / 3 || (g.dy > 30 && g.vy > 0.8) ? away() : back()),
        onPanResponderTerminate: back,
      }),
    };
  });
  // A new comment lands at the bottom; a reply lands in its thread, which is already on screen.
  const posted = (reply: boolean) => {
    setReplyTo(null);
    if (!reply) setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: drop.interpolate({ inputRange: [0, 500], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close comments" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { paddingBottom: 10 + insets.bottom, transform: [{ translateY: drop }] }]} accessibilityViewIsModal accessibilityLabel="Comments">
          <View style={styles.bar} {...handle.pan.panHandlers}>
            <View style={styles.handle} />
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel="Close comments">
              <Icon name="x" size={18} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView
            ref={scroller}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // on iOS you can also pull the post down past the top to put the sheet away
            onScrollEndDrag={(e) => {
              if (e.nativeEvent.contentOffset.y < -80) handle.away();
            }}
          >
            <View style={{ gap: 12 }}>
              <PostBody event={event} post={post} index={index} go={go} />
              <LikedBy eventId={event.id} go={go} />
            </View>
            <View style={styles.rule} />
            {threads.map(({ comment, replies }) => (
              <Fragment key={comment.id}>
                <Comment comment={comment} go={go} onReply={setReplyTo} />
                {replies.map((r) => (
                  <Comment key={r.id} comment={r} go={go} onReply={setReplyTo} />
                ))}
              </Fragment>
            ))}
          </ScrollView>
          <Composer eventId={event.id} listId={event.list_id} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onPosted={posted} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** "♥ liked by you, dana feng + 3", each name tappable. Nothing until someone likes it. */
function LikedBy({ eventId, go }: { eventId: string; go: (to: () => void) => void }) {
  const people = likers(eventId);
  if (!people.length) return null;
  const named = people.slice(0, 2);
  const rest = people.length - named.length;
  return (
    <View style={styles.likedBy}>
      <Icon name="heartFilled" size={14} color={colors.olive} strokeWidth={1.8} />
      <Mono size={11} style={{ flex: 1 }}>
        liked by{' '}
        {named.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 ? ', ' : null}
            <Text onPress={() => go(() => openProfile(p))} accessibilityRole="link" accessibilityLabel={`${p.name}'s profile`}>
              <MonoMedium size={11}>{p.id === db.me ? 'you' : p.name}</MonoMedium>
            </Text>
          </Fragment>
        ))}
        {rest > 0 ? ` + ${rest}` : null}
      </Mono>
    </View>
  );
}

function Comment({ comment, go, onReply }: {
  comment: EventComment;
  go: (to: () => void) => void;
  onReply: (c: EventComment) => void;
}) {
  // press and hold a comment to bring it up close, with delete (yours) or report (anyone else's) underneath
  const [peeking, setPeeking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [press] = useState(() => new Animated.Value(1));
  // deleted, but kept so its replies stay in place: no name, no words, nothing to do
  if (comment.deleted_at) {
    return (
      <View style={styles.comment}>
        <View style={styles.gone} />
        <Mono size={12} color={colors.inkFaint} style={{ flex: 1 }}>comment deleted</Mono>
      </View>
    );
  }
  const author = getProfile(comment.author_id);
  if (!author) return null;
  const mine = canDeleteComment(comment);
  const action = mine ? { name: 'delete', label: 'Delete' } : { name: 'report', label: 'Report' };
  // it sinks while you hold it, then a tap from the phone as it comes up
  const sink = (to: number) => Animated.spring(press, { toValue: to, useNativeDriver: true, friction: 8, tension: to < 1 ? 40 : 120 }).start();
  const peek = () => {
    hold();
    sink(1);
    setPeeking(true);
  };
  const name = author.id === db.me ? 'you' : author.name;
  const reply = !!comment.reply_to;
  return (
    <>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Pressable
          onLongPress={peek}
          delayLongPress={350}
          onPressIn={() => sink(0.97)}
          onPressOut={() => sink(1)}
          style={[styles.comment, reply && styles.reply]}
          accessible={false}
        >
          <Pressable onPress={() => go(() => openProfile(author))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${author.name}'s profile`}>
            <Avatar person={author} size={reply ? 24 : 30} />
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Pressable onPress={() => go(() => openProfile(author))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${author.name}'s profile`}>
                <MonoMedium size={11.5}>{name}</MonoMedium>
              </Pressable>
              <Mono size={10.5} color={colors.inkSoft}>{timeAgo(comment.created_at)}</Mono>
              <Pressable onPress={() => onReply(comment)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Reply to ${author.name}`}>
                <MonoMedium size={10.5} color={colors.inkSoft}>reply</MonoMedium>
              </Pressable>
            </View>
            {/* holding can't be done with a screen reader, so the words carry a "delete" or "report" action instead */}
            <View
              accessible
              accessibilityActions={[action]}
              onAccessibilityAction={(e) => e.nativeEvent.actionName === action.name && (mine ? setPeeking(true) : setReporting(true))}
            >
              <CommentText body={comment.body} go={go} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
      {peeking ? <CommentPeek comment={comment} onClose={() => setPeeking(false)} onReport={() => setReporting(true)} /> : null}
      {reporting ? (
        <ReportSheet what="comment" target={{ profile_id: author.id, comment_id: comment.id, content: comment.body }} person={author} onClose={() => setReporting(false)} />
      ) : null}
    </>
  );
}

/** A comment's words, with each @tag in medium weight. With `go`, tapping a tag opens that profile. */
function CommentText({ body, go }: { body: string; go?: (to: () => void) => void }) {
  return (
    <Mono size={13} style={{ lineHeight: 19 }}>
      {textParts(body).map((part, i) =>
        part.person ? (
          <Text
            key={i}
            onPress={go ? () => go(() => openProfile(part.person!)) : undefined}
            accessibilityRole={go ? 'link' : undefined}
            accessibilityLabel={`${part.person.name}, ${part.text}`}
            style={{ fontFamily: fonts.monoMedium }}
          >
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Mono>
  );
}

/**
 * Press and hold a comment, the same as a list folder on your profile: it comes up close over a
 * dimmed screen with "delete comment" underneath, or "report comment" if it isn't yours. Tap
 * anywhere else to put it back.
 */
function CommentPeek({ comment, onClose, onReport }: { comment: EventComment; onClose: () => void; onReport: () => void }) {
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 110 }).start();
  }, [pop]);
  const author = getProfile(comment.author_id);
  if (!author) return null;
  const remove = () => {
    onClose();
    deleteComment(comment.id);
  };
  const flag = () => {
    onClose();
    onReport();
  };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.peekFill} accessibilityViewIsModal>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View style={[styles.peekStack, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <View style={styles.peekCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar person={author} size={30} />
              <MonoMedium size={11.5}>{author.id === db.me ? 'you' : author.name}</MonoMedium>
              <Mono size={10.5} color={colors.inkSoft}>{timeAgo(comment.created_at)}</Mono>
            </View>
            <CommentText body={comment.body} />
          </View>
          <Paper fill={colors.cream} shape={4} round={1.2} style={styles.peekMenu}>
            {canDeleteComment(comment) ? (
              <LinkText label="delete comment" color={colors.bark} onPress={remove} />
            ) : (
              <LinkText label="report comment" color={colors.bark} onPress={flag} />
            )}
          </Paper>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * The comment box. Type @ to tag someone, the same as notes: people on the list come first.
 * Replying starts the box with an @tag for whoever you're answering (unless it's you).
 */
function Composer({ eventId, listId, replyTo, onCancelReply, onPosted }: {
  eventId: string;
  listId: string;
  replyTo: EventComment | null;
  onCancelReply: () => void;
  onPosted: (reply: boolean) => void;
}) {
  const input = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const answering = replyTo ? getProfile(replyTo.author_id) : null;
  // Picking a comment to answer starts the box over with its @tag.
  const [startedFor, setStartedFor] = useState(replyTo);
  if (replyTo !== startedFor) {
    setStartedFor(replyTo);
    if (replyTo) {
      const start = answering && answering.id !== db.me ? `@${answering.username} ` : '';
      setText(start);
      setCursor(start.length);
      setMoveTo(start.length);
    }
  }
  useEffect(() => {
    if (replyTo) input.current?.focus();
  }, [replyTo]);
  const typing = tagBeingTyped(text, Math.min(cursor, text.length));
  const people = typing ? peopleToTag(typing.query, listId, 4) : [];
  const tag = (username: string) => {
    if (!typing) return;
    const before = `${text.slice(0, typing.start)}@${username} `;
    setText(before + text.slice(Math.min(cursor, text.length)).replace(/^ /, ''));
    setCursor(before.length);
    setMoveTo(before.length);
  };
  // what was just posted, so the keyboard can't put it back (see `typed`)
  const sent = useRef<string | null>(null);
  const send = () => {
    if (!addComment(eventId, text, replyTo)) return;
    tap();
    sent.current = text;
    input.current?.clear();
    setText('');
    setCursor(0);
    setMoveTo(null);
    onPosted(!!replyTo);
  };
  // A keyboard still holding a word in progress (autocorrect, or composing on Android) can hand the
  // whole comment back just after it's cleared. Anything else typed counts as typing again.
  const typed = (value: string) => {
    if (value && value === sent.current) {
      input.current?.clear();
      return;
    }
    sent.current = null;
    setText(value);
  };
  const ready = !!text.trim();

  return (
    <View style={styles.composer}>
      {people.length ? (
        <View style={styles.suggestions}>
          {people.map((p) => (
            <Pressable key={p.id} onPress={() => tag(p.username)} style={styles.suggestion} accessibilityRole="button" accessibilityLabel={`Tag ${p.name}, @${p.username}`}>
              <Avatar person={p} size={26} />
              <Hand size={15}>{p.name}</Hand>
              <Mono size={10.5} color={colors.inkSoft}>@{p.username}</Mono>
            </Pressable>
          ))}
        </View>
      ) : null}
      {replyTo ? (
        <View style={styles.replying}>
          <Mono size={11} color={colors.inkSoft} style={{ flex: 1 }} numberOfLines={1}>
            replying to <MonoMedium size={11} color={colors.inkSoft}>{answering?.id === db.me ? 'yourself' : (answering?.name ?? 'someone')}</MonoMedium>
          </Mono>
          <Pressable onPress={onCancelReply} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel reply">
            <Icon name="x" size={14} color={colors.inkSoft} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <Avatar person={me()} size={32} />
        <TextInput
          ref={input}
          value={text}
          onChangeText={typed}
          selection={moveTo === null ? undefined : { start: moveTo, end: moveTo }}
          onSelectionChange={(e) => {
            setCursor(e.nativeEvent.selection.end);
            setMoveTo(null);
          }}
          multiline
          maxLength={1000}
          placeholder={replyTo ? 'write a reply…' : 'write a comment…'}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel={replyTo ? 'Write a reply' : 'Write a comment'}
          style={[styles.input, noOutline]}
        />
        <Pressable
          onPress={send}
          disabled={!ready}
          style={[styles.send, !ready && { opacity: 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel={replyTo ? 'Post reply' : 'Post comment'}
          accessibilityState={{ disabled: !ready }}
        >
          <Icon name="send" size={18} color={colors.paper} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    height: '90%', backgroundColor: colors.paper, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.ink,
    borderTopLeftRadius: 22, borderTopRightRadius: 18, paddingHorizontal: 16,
  },
  // tall enough to grab: it's what you drag to put the sheet away
  bar: { height: 40, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule },
  close: { position: 'absolute', right: 0, top: 4, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  likedBy: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 42, minHeight: 28 },
  rule: { height: 1, backgroundColor: colors.rule, marginTop: 14, marginBottom: 4 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  reply: { marginLeft: 42, gap: 10, paddingVertical: 8 },
  // where a deleted comment's face would be
  gone: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkFaint },
  peekFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  peekStack: { width: '100%', maxWidth: 340 },
  peekCard: {
    padding: 18, gap: 10, backgroundColor: colors.paper,
    borderTopLeftRadius: 16, borderTopRightRadius: 18, borderBottomRightRadius: 16, borderBottomLeftRadius: 19,
  },
  peekMenu: { alignSelf: 'center', alignItems: 'center', marginTop: 14, paddingHorizontal: 18, paddingVertical: 4, maxWidth: 300 },
  replying: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  composer: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: 10 },
  suggestions: { paddingBottom: 6 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 110, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    fontFamily: fonts.mono, fontSize: 13, color: colors.ink, backgroundColor: colors.cream,
    borderWidth: 1.5, borderColor: colors.inkFaint, borderTopLeftRadius: 13, borderTopRightRadius: 11, borderBottomRightRadius: 14, borderBottomLeftRadius: 12,
  },
  send: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bark,
    borderTopLeftRadius: 13, borderTopRightRadius: 12, borderBottomRightRadius: 14, borderBottomLeftRadius: 11,
  },
});
