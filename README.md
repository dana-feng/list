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
