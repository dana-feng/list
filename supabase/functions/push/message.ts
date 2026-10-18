// Turns what claim_push() returns into Expo push messages. No Deno or network here, so it can
// be tested on its own (message.test.ts). The words match the notifications screen
// (src/api/notifications.ts describeNotification), as one line of plain text.

export type Kind =
  | 'list_invite' | 'viewer_added' | 'item_invite' | 'invite_accepted' | 'mention' | 'comment' | 'reply'
  | 'like' | 'interested' | 'item_added' | 'item_done' | 'list_done' | 'borrow_has' | 'done_with' | 'gift_claim';

/** The row claim_push() returns. */
export type Claim = {
  id: string;
  kind: Kind;
  count: number;
  /** a comment's words, tags as @username */
  body: string;
  list_id: string | null;
  item_id: string | null;
  /** the post a tap opens (likes, comments, "did"…), when there is one */
  event_id?: string | null;
  /** up to 2 names, newest first */
  actors: string[];
  /** how many people in all */
  actor_count: number;
  list_title: string | null;
  item_title: string | null;
  tokens: { token: string; platform: 'ios' | 'android'; quiet: boolean }[];
};

export type ExpoMessage = {
  to: string;
  body: string;
  data: { url: string; notification_id: string };
  sound: 'default' | null;
  priority: 'high' | 'normal';
  interruptionLevel: 'active' | 'passive';
  channelId: string;
};

/** The Android channel the app creates (src/api/push.ts). */
export const CHANNEL = 'default';
const MAX = 178;

/** "jo", "jo and tochi", "jo, tochi and 2 others" */
export function who(names: string[], total: number): string {
  const [a, b] = names;
  if (!a) return 'someone';
  if (total <= 1 || !b) return a;
  if (total === 2) return `${a} and ${b}`;
  const rest = total - 2;
  return `${a}, ${b} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}

/** The one line the phone shows. */
export function sentence(c: Claim): string {
  const by = who(c.actors, c.actor_count);
  const many = c.actor_count > 1;
  const thing = c.item_title ?? c.list_title ?? 'a post';
  const list = c.list_title ?? 'a list';
  const quote = c.body ? `: “${c.body}”` : '';
  switch (c.kind) {
    case 'list_invite': return `${by} invited you to the list ${list}`;
    case 'viewer_added': return `${by} shared ${list} with you`;
    case 'item_invite': return `${by} invited you to ${thing}`;
    case 'invite_accepted': return `${by} joined ${list}`;
    case 'mention': return `${by} tagged you on ${thing}${quote}`;
    case 'comment': return `${by} commented on ${thing}${quote}`;
    case 'reply': return `${by} replied to you on ${thing}${quote}`;
    case 'like': return `${by} liked ${thing}`;
    case 'interested': return `${by} ${many ? 'are' : 'is'} interested in ${thing}`;
    case 'item_added': return c.count > 1 ? `${by} added ${c.count} things to ${list}` : `${by} added ${thing} to ${list}`;
    case 'item_done': return c.count > 1 ? `${by} crossed off ${c.count} things on ${list}` : `${by} crossed off ${thing}`;
    case 'borrow_has': return `${by} ${many ? 'have' : 'has'} ${thing} you can borrow`;
    case 'done_with': return `${by} did ${thing} with you`;
    case 'list_done': return `${list} is finished`;
    // a surprise gift has no names: "someone", or how many people
    case 'gift_claim':
      if (!c.actor_count) return c.count > 1 ? `${c.count} people are getting ${thing}` : `someone is getting ${thing}`;
      return `${by} ${many ? 'are' : 'is'} getting ${thing}`;
  }
}

/** Where a tap goes: same as tapping the row on the notifications screen. */
export function link(c: Claim): string {
  const toList = c.kind === 'list_done' || ((c.kind === 'item_added' || c.kind === 'item_done') && c.count > 1);
  const aboutPost = ['like', 'comment', 'reply', 'mention', 'item_added', 'item_done', 'done_with'].includes(c.kind);
  if (aboutPost && !toList && c.event_id) return `/post/${c.event_id}${c.item_id ? `?item=${c.item_id}` : ''}`;
  if (c.item_id && !toList) return `/item/${c.item_id}`;
  if (c.list_id) return `/list/${c.list_id}`;
  return '/notifications';
}

function clip(text: string): string {
  return text.length <= MAX ? text : `${text.slice(0, MAX - 1).trimEnd()}…`;
}

/** One message per phone. In quiet hours: no sound, and passive (doesn't light up the screen). */
export function buildMessages(c: Claim): ExpoMessage[] {
  const body = clip(sentence(c));
  const url = link(c);
  return (c.tokens ?? []).map((t) => ({
    to: t.token,
    body,
    data: { url, notification_id: c.id },
    sound: t.quiet ? null : 'default',
    priority: t.quiet ? 'normal' : 'high',
    interruptionLevel: t.quiet ? 'passive' : 'active',
    channelId: CHANNEL,
  }));
}
