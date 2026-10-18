import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { db, useDb } from '@/api/db';
import { CommentsSheet } from '@/components/CommentsSheet';
import { describePost } from '@/components/FeedPost';
import { goBack } from '@/components/Header';

/**
 * One post, from a notification: the same comments sheet as on Home (the post on top, likes,
 * the thread), over whatever screen you were on. Dragging it down goes back. A post that isn't
 * loaded or can't be shown opens its item instead (?item=), or nothing.
 */
export default function Post() {
  useDb();
  const { id, item } = useLocalSearchParams<{ id: string; item?: string }>();
  const event = db.events.find((e) => e.id === id);
  const post = event ? describePost(event) : null;
  const missing = !event || !post;
  useEffect(() => {
    if (!missing) return;
    if (item) router.replace(`/item/${item}`);
    else goBack();
  }, [missing, item]);
  if (!event || !post) return null;
  return <CommentsSheet event={event} post={post} index={0} onClose={goBack} />;
}
