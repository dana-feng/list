// A stand-in for the Supabase client in tests. Every query chain is recorded as one call, e.g.
//   supabase.from('items').update({ done_at: null }).eq('id', 'i1')
// becomes { table: 'items', steps: [['update', { done_at: null }], ['eq', 'id', 'i1']] }.
// Chains resolve to { data: null, error: null } unless a test queues a reply with replyNext().

export type Call = { table?: string; rpc?: string; bucket?: string; args?: unknown; steps: [string, ...unknown[]][] };
type Reply = { data?: unknown; error?: { message: string } | null };

let calls: Call[] = [];
let replies: Reply[] = [];
let writes: { what: string; call: Promise<Call | undefined> }[] = [];

export function resetCalls() {
  calls = [];
  replies = [];
  writes = [];
}

/** The next chain that's awaited gets this reply instead of { data: null, error: null }. */
export const replyNext = (reply: Reply) => replies.push(reply);

/** A chain that records each step and can be awaited (or have .then called on it) once. */
function chain(call: Call): unknown {
  calls.push(call);
  const settle = () => Promise.resolve({ data: null, error: null, ...replies.shift() });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, step: string) {
      if (step === 'then') return (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => settle().then(ok, no);
      return (...args: unknown[]) => {
        call.steps.push([step, ...args]);
        return proxy;
      };
    },
  });
  return proxy;
}

const auth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  startAutoRefresh() {},
  stopAutoRefresh() {},
  signOut: async () => ({ error: null }),
};

export const fakeSupabase = {
  from: (table: string) => chain({ table, steps: [] }),
  rpc: (rpc: string, args?: unknown) => chain({ rpc, args, steps: [] }),
  storage: { from: (bucket: string) => chain({ bucket, steps: [] }) },
  channel: () => chain({ steps: [] }),
  removeChannel: () => undefined,
  auth,
};

/**
 * write() as the app calls it: runs the queued database call (against the fake) and keeps it, so a
 * test can look at what would have been saved. No reload afterwards.
 */
export function recordWrite(run: () => PromiseLike<{ error: unknown }> | Promise<{ error: unknown }>, what = 'that') {
  const before = calls.length;
  const call = Promise.resolve(run()).then(() => calls[before]);
  writes.push({ what, call });
  return call.then(() => true);
}

/** Everything queued with write() so far, once each call has been made. */
export async function savedCalls(): Promise<Call[]> {
  const done = await Promise.all(writes.map((w) => w.call));
  return done.filter((c): c is Call => !!c);
}

/** Every call made on the client so far, saved or not. */
export const allCalls = () => calls;
