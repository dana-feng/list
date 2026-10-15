import { Fragment, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, EventComment, FeedEvent } from '@/api/db';
import { peopleToTag, tagBeingTyped, textParts } from '@/api/mentions';
import { getProfile, me } from '@/api/profiles';
import { addComment, canDeleteComment, commentsFor, deleteComment, likers } from '@/api/reactions';
import { timeAgo } from '@/lib';
import { colors, fonts, noOutline } from '@/theme';
import { Avatar } from './Avatar';
import { PostBody, type describePost } from './FeedPost';
import { Icon } from './Icon';
import { openProfile } from './PersonRow';
import { Hand, Mono, MonoMedium } from './Text';

type Post = NonNullable<ReturnType<typeof describePost>>;

/**
 * A post's comments, in a tall sheet over the feed. The post (photos full size) scrolls away with
 * the thread; only the comment box stays pinned. Every face, name and @tag opens that profile.
 * Render it only while it's open.
 */
export function CommentsSheet({ event, post, index, onClose }: { event: FeedEvent; post: Post; index: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const comments = commentsFor(event.id);
  // Following a link closes the sheet first, then goes, so the new screen isn't under the sheet.
  const go = (to: () => void) => {
    onClose();
    setTimeout(to, 0);
  };
  const posted = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close comments" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: 10 + insets.bottom }]} accessibilityViewIsModal accessibilityLabel="Comments">
          <View style={styles.bar}>
            <View style={styles.handle} />
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel="Close comments">
              <Icon name="x" size={18} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ gap: 12 }}>
              <PostBody event={event} post={post} index={index} go={go} />
              <LikedBy eventId={event.id} go={go} />
            </View>
            <View style={styles.rule} />
            {comments.length ? (
              comments.map((c) => <Comment key={c.id} comment={c} event={event} go={go} />)
            ) : (
              <View style={{ paddingVertical: 32, alignItems: 'center', gap: 6 }}>
                <Hand size={20}>no comments yet</Hand>
                <Mono size={11.5} color={colors.inkSoft}>say something nice.</Mono>
              </View>
            )}
          </ScrollView>
          <Composer eventId={event.id} listId={event.list_id} onPosted={posted} />
        </View>
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

function Comment({ comment, event, go }: { comment: EventComment; event: FeedEvent; go: (to: () => void) => void }) {
  const author = getProfile(comment.author_id);
  if (!author) return null;
  const confirmDelete = () =>
    Alert.alert('Delete this comment?', undefined, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(comment.id) },
    ]);
  const name = author.id === db.me ? 'you' : author.name;
  return (
    <View style={styles.comment}>
      <Pressable onPress={() => go(() => openProfile(author))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${author.name}'s profile`}>
        <Avatar person={author} size={30} />
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Pressable onPress={() => go(() => openProfile(author))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${author.name}'s profile`}>
            <MonoMedium size={11.5}>{name}</MonoMedium>
          </Pressable>
          <Mono size={10.5} color={colors.inkSoft}>{timeAgo(comment.created_at)}</Mono>
          {canDeleteComment(comment, event) ? (
            <Pressable onPress={confirmDelete} hitSlop={8} style={{ marginLeft: 'auto' }} accessibilityRole="button" accessibilityLabel="Delete comment">
              <Mono size={10.5} color={colors.inkSoft}>delete</Mono>
            </Pressable>
          ) : null}
        </View>
        <Mono size={13} style={{ lineHeight: 19 }}>
          {textParts(comment.body).map((part, i) =>
            part.person ? (
              <Text key={i} onPress={() => go(() => openProfile(part.person!))} accessibilityRole="link" accessibilityLabel={`${part.person.name}, ${part.text}`} style={{ fontFamily: fonts.monoMedium }}>
                {part.text}
              </Text>
            ) : (
              part.text
            ),
          )}
        </Mono>
      </View>
    </View>
  );
}

/** The comment box. Type @ to tag someone, the same as notes: people on the list come first. */
function Composer({ eventId, listId, onPosted }: { eventId: string; listId: string; onPosted: () => void }) {
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const typing = tagBeingTyped(text, Math.min(cursor, text.length));
  const people = typing ? peopleToTag(typing.query, listId, 4) : [];
  const tag = (username: string) => {
    if (!typing) return;
    const before = `${text.slice(0, typing.start)}@${username} `;
    setText(before + text.slice(Math.min(cursor, text.length)).replace(/^ /, ''));
    setCursor(before.length);
    setMoveTo(before.length);
  };
  const send = () => {
    if (!addComment(eventId, text)) return;
    setText('');
    setCursor(0);
    onPosted();
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
      <View style={styles.inputRow}>
        <Avatar person={me()} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          selection={moveTo === null ? undefined : { start: moveTo, end: moveTo }}
          onSelectionChange={(e) => {
            setCursor(e.nativeEvent.selection.end);
            setMoveTo(null);
          }}
          multiline
          maxLength={1000}
          placeholder="add a comment…"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Add a comment"
          style={[styles.input, noOutline]}
        />
        <Pressable
          onPress={send}
          disabled={!ready}
          style={[styles.send, !ready && { opacity: 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
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
  bar: { height: 34, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule },
  close: { position: 'absolute', right: 0, top: 4, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  likedBy: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 42, minHeight: 28 },
  rule: { height: 1, backgroundColor: colors.rule, marginTop: 14, marginBottom: 4 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
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
