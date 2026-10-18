// node --experimental-strip-types --test supabase/functions/push/message.test.ts
// (also runs under `deno test`)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessages, link, sentence, who, type Claim } from './message.ts';

const base: Claim = {
  id: 'n1',
  kind: 'comment',
  count: 1,
  body: 'so fun!!',
  list_id: 'l1',
  item_id: 'i1',
  actors: ['dana'],
  actor_count: 1,
  list_title: 'fall weekends',
  item_title: 'apple picking',
  tokens: [{ token: 'ExponentPushToken[a]', platform: 'ios', quiet: false }],
};

test('names', () => {
  assert.equal(who([], 0), 'someone');
  assert.equal(who(['jo'], 1), 'jo');
  assert.equal(who(['jo', 'tochi'], 2), 'jo and tochi');
  assert.equal(who(['jo', 'tochi'], 3), 'jo, tochi and 1 other');
  assert.equal(who(['jo', 'tochi'], 5), 'jo, tochi and 3 others');
});

test('sentences match the notifications screen', () => {
  assert.equal(sentence(base), 'dana commented on apple picking: “so fun!!”');
  assert.equal(sentence({ ...base, kind: 'list_invite', body: '' }), 'dana invited you to the list fall weekends');
  assert.equal(sentence({ ...base, kind: 'like', body: '', actors: ['jo', 'tochi'], actor_count: 3 }), 'jo, tochi and 1 other liked apple picking');
  assert.equal(sentence({ ...base, kind: 'interested', actors: ['jo', 'tochi'], actor_count: 2 }), 'jo and tochi are interested in apple picking');
  assert.equal(sentence({ ...base, kind: 'item_done', count: 4 }), 'dana crossed off 4 things on fall weekends');
  assert.equal(sentence({ ...base, kind: 'borrow_has', item_title: 'black heels' }), 'dana has black heels you can borrow');
  assert.equal(sentence({ ...base, kind: 'done_with' }), 'dana did apple picking with you');
  assert.equal(sentence({ ...base, kind: 'list_done' }), 'fall weekends is finished');
});

test('taps open the same place as the row', () => {
  assert.equal(link(base), '/item/i1');
  assert.equal(link({ ...base, kind: 'item_done', count: 3 }), '/list/l1');
  assert.equal(link({ ...base, kind: 'list_done' }), '/list/l1');
  assert.equal(link({ ...base, item_id: null, list_id: null }), '/notifications');
});

test('one message per phone; quiet hours are silent and passive', () => {
  const msgs = buildMessages({
    ...base,
    tokens: [
      { token: 'ExponentPushToken[a]', platform: 'ios', quiet: false },
      { token: 'ExponentPushToken[b]', platform: 'ios', quiet: true },
    ],
  });
  assert.equal(msgs.length, 2);
  assert.deepEqual(msgs[0], {
    to: 'ExponentPushToken[a]',
    body: 'dana commented on apple picking: “so fun!!”',
    data: { url: '/item/i1', notification_id: 'n1' },
    sound: 'default',
    priority: 'high',
    interruptionLevel: 'active',
    channelId: 'default',
  });
  assert.equal(msgs[1].sound, null);
  assert.equal(msgs[1].interruptionLevel, 'passive');
});

test('long comments are clipped', () => {
  const [m] = buildMessages({ ...base, body: 'x'.repeat(400) });
  assert.ok(m.body.length <= 178);
  assert.ok(m.body.endsWith('…'));
});
