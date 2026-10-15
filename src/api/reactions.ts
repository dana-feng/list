// Likes and comments on posts. A post is an events row; anyone who can see it can react.
import { commit, db, EventComment, now, Profile } from './db';
import { Unfound, tagsToIds } from './mentions';
import { getProfile } from './profiles';
import { supabase } from './supabase';
import { newId, write } from './sync';

export const likesFor = (eventId: string) => db.event_likes.filter((l) => l.event_id === eventId);
export const likedByMe = (eventId: string) => db.event_likes.some((l) => l.event_id === eventId && l.user_id === db.me);

/** Who liked a post, you first, then newest first. */
export function likers(eventId: string): Profile[] {
  return likesFor(eventId)
    .sort((a, b) => (a.user_id === db.me ? -1 : b.user_id === db.me ? 1 : b.created_at.localeCompare(a.created_at)))
    .map((l) => getProfile(l.user_id))
    .filter((p): p is Profile => !!p);
}

export function toggleLike(eventId: string) {
  if (likedByMe(eventId)) {
    db.event_likes = db.event_likes.filter((l) => !(l.event_id === eventId && l.user_id === db.me));
    commit();
    write(() => supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', db.me), 'that unlike');
  } else {
    db.event_likes.push({ event_id: eventId, user_id: db.me, created_at: now() });
    commit();
    write(() => supabase.from('event_likes').insert({ event_id: eventId, user_id: db.me }), 'that like');
  }
}

/** Oldest first, the way a conversation reads. */
export const commentsFor = (eventId: string) =>
  db.event_comments.filter((c) => c.event_id === eventId).sort((a, b) => a.created_at.localeCompare(b.created_at));

export type Thread = { comment: EventComment; replies: EventComment[] };

/** Top-level comments oldest first, each with its replies under it, also oldest first. */
export function threadsFor(eventId: string): Thread[] {
  const all = commentsFor(eventId);
  return all.filter((c) => !c.reply_to).map((comment) => ({ comment, replies: all.filter((r) => r.reply_to === comment.id) }));
}

/** Deleted ones kept as placeholders don't count. */
export const commentCount = (eventId: string) => db.event_comments.filter((c) => c.event_id === eventId && !c.deleted_at).length;

/**
 * `typed` has tags as @username; they're saved as ids. `replyTo` is the comment being answered;
 * a reply to a reply joins its parent's thread. Returns false when there's nothing to post.
 */
export function addComment(eventId: string, typed: string, replyTo?: EventComment | null, unfound: Unfound = {}) {
  const body = tagsToIds(typed.trim(), unfound);
  if (!body) return false;
  const reply_to = replyTo ? (replyTo.reply_to ?? replyTo.id) : null;
  const row: EventComment = { id: newId(), event_id: eventId, author_id: db.me, body, created_at: now(), reply_to, deleted_at: null };
  db.event_comments.push(row);
  commit();
  write(() => supabase.from('event_comments').insert({ id: row.id, event_id: eventId, author_id: db.me, body, reply_to }), 'your comment');
  return true;
}

/** Only your own, and only once. */
export const canDeleteComment = (comment: EventComment) => comment.author_id === db.me && !comment.deleted_at;

/**
 * The same as delete_comment does on the server: a comment with replies stays as a blank
 * "comment deleted" so they keep their place; one without just goes. When the last reply under
 * a deleted comment goes, so does the placeholder.
 */
export function deleteComment(commentId: string) {
  const comment = db.event_comments.find((c) => c.id === commentId);
  if (!comment) return;
  const hasReplies = (id: string) => db.event_comments.some((c) => c.reply_to === id);
  if (hasReplies(comment.id)) {
    db.event_comments = db.event_comments.map((c) => (c.id === comment.id ? { ...c, body: '', deleted_at: now() } : c));
  } else {
    db.event_comments = db.event_comments.filter((c) => c.id !== comment.id);
    const parent = comment.reply_to ? db.event_comments.find((c) => c.id === comment.reply_to) : undefined;
    if (parent?.deleted_at && !hasReplies(parent.id)) db.event_comments = db.event_comments.filter((c) => c.id !== parent.id);
  }
  commit();
  write(() => supabase.rpc('delete_comment', { p_comment: commentId }), 'that delete');
}
