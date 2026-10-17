// The `push` Edge Function. The database calls it (through pg_net, from the notifications_push
// trigger) with a notification id whenever a notification is added or merged into. It asks
// claim_push() whether that should buzz and for what to say, sends it through Expo's push
// service, and forgets phones Expo says are gone.
//
// Secrets (supabase secrets set …):
//   PUSH_SECRET        must match the `push_secret` Vault secret the trigger sends
//   EXPO_ACCESS_TOKEN  optional; only needed if "enhanced push security" is on in EAS
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildMessages, type Claim } from './message.ts';

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';

const secret = Deno.env.get('PUSH_SECRET');
const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Ticket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });
  if (!secret || req.headers.get('x-push-secret') !== secret) return reply(401, { error: 'unauthorized' });

  const { notification_id } = await req.json().catch(() => ({}));
  if (typeof notification_id !== 'string') return reply(400, { error: 'notification_id missing' });

  const { data: claim, error } = await supabase.rpc('claim_push', { p_notification: notification_id });
  if (error) {
    console.error('claim_push failed', error.message);
    return reply(500, { error: error.message });
  }
  // not one that buzzes (or not now, or no phones)
  if (!claim) return reply(200, { sent: 0 });

  const messages = buildMessages(claim as Claim);
  if (!messages.length) return reply(200, { sent: 0 });

  const res = await fetch(EXPO_SEND, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.data) {
    console.error('expo push failed', res.status, JSON.stringify(result?.errors ?? result));
    return reply(502, { error: 'expo push failed' });
  }

  // tickets come back in the same order as the messages
  const tickets = result.data as Ticket[];
  const gone = messages
    .filter((_, i) => tickets[i]?.status === 'error' && (tickets[i] as { details?: { error?: string } }).details?.error === 'DeviceNotRegistered')
    .map((m) => m.to);
  if (gone.length) {
    const { error: dropError } = await supabase.rpc('drop_push_tokens', { p_tokens: gone });
    if (dropError) console.error('drop_push_tokens failed', dropError.message);
  }
  for (const t of tickets) if (t.status === 'error') console.warn('push ticket error', t.message);

  return reply(200, { sent: tickets.filter((t) => t.status === 'ok').length, dropped: gone.length });
});
