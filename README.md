# list

Expo (React Native) app, iOS first. This is the UI mock-up of the simplified design boards: every screen is built and tappable, running on fake in-memory data instead of Supabase.

## Run it

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press i for the iOS simulator
```

Sign-up accepts any 10-digit number and any 6-digit code. To skip sign-up and land on the feed as `@dana`:

```bash
EXPO_PUBLIC_SKIP_AUTH=1 npx expo start
```

Typecheck with `npx tsc --noEmit`.

## Layout

```
app/                  screens (Expo Router)
src/components/       shared pieces: FolderCard, ItemRow, FeedPost, TabBar…
src/screens/          screens reused by more than one route (ItemScreen, AuthStep)
src/theme.ts          colors, fonts, spacing from the mocks
src/api/              one file per table, plus db.ts (in-memory tables) and seed.ts (fake data)
assets/               icons and the sample feed photo
```

## What's mocked

`src/api/db.ts` holds the nine tables from the build plan as plain arrays, and the other `src/api/*` files read and write them with the same rules the database will enforce (`canViewList` mirrors `can_view_list`, feed events are written where triggers would write them). Screens only talk to `src/api`, so moving to Supabase means rewriting those files, not the screens. Data resets on reload.

Not wired yet: Supabase, TanStack Query, real SMS codes, contacts matching (`expo-contacts`), photo upload (picked photos stay on the device).

One thing the mocks need that the plan's schema doesn't have: a caption on "you did it". It's stored as `items.caption` here; the "say something about it" text on a finished list isn't stored anywhere.

## Database (Supabase)

The tables live in `supabase/migrations/` as SQL files, applied in order:

- `…_create_tables.sql`: the 11 tables, indexes, `can_view_list` and the read/write rules
- `…_feed_and_functions.sql`: feed posts and list completion (written by the database, not the app), plus `create_list`, `username_available`, `match_contacts`, `delete_account`
- `…_storage.sql`: the private `photos` bucket and public `avatars` bucket

Sign-in for v0 is phone + code with no texts: every tester's number is a test number whose code is always `000000`. Add numbers under `[auth.sms.test_otp]` in `supabase/config.toml` (local) and in the dashboard under Authentication > Sign In / Providers > Phone (hosted).

```bash
npx supabase link --project-ref <project ref>   # once
npx supabase db push                            # apply new migrations to the hosted project
npx supabase migration new <name>               # start a new change
```
