// Runs before every test file. Nothing here talks to the network:
//   - @/api/supabase is a fake that records each call (see src/test/fake-supabase.ts)
//   - @/api/sync's write() records what would be saved instead of saving it and reloading,
//     so a test sees the local change the app made and the database call it queued
//   - realtime and push are switched off
jest.mock('@/api/supabase', () => ({ supabase: jest.requireActual('./src/test/fake-supabase').fakeSupabase }));

jest.mock('@/api/sync', () => {
  const { recordWrite } = jest.requireActual('./src/test/fake-supabase');
  let n = 0;
  return {
    newId: () => `id-${++n}`,
    isLocal: (path: string) => /^(file|ph|assets-library|content|blob|data):/.test(path),
    write: recordWrite,
    refresh: jest.fn(async () => undefined),
    uploadImage: jest.fn(async () => ({ error: null })),
    SHARED_CODE: '000000',
    signInWithCode: jest.fn(async () => null),
    startSync: jest.fn(),
    signOut: jest.fn(async () => undefined),
    deleteAccount: jest.fn(async () => null),
  };
});

jest.mock('@/api/live', () => ({ listenForNotifications: jest.fn(), stopListening: jest.fn() }));
jest.mock('@/api/push', () => ({ registerForPush: jest.fn(), forgetPushToken: jest.fn(), useOpenTappedPush: jest.fn() }));
jest.mock('@/haptics', () => ({ tap: jest.fn(), success: jest.fn(), toggle: jest.fn(), hold: jest.fn(), tick: jest.fn() }));

beforeEach(() => {
  jest.requireActual('./src/test/fake-supabase').resetCalls();
});

// Native modules that don't load under Jest
jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  Contact: { getAllDetails: jest.fn(async () => []) },
  ContactField: { PHONES: 'phones' },
}));
