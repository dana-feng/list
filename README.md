# list

Expo (React Native) app, iOS first, on Supabase. Everything you do in the app (sign-up, lists, things, check-offs, stars, follows, photos) is saved to the database.

## Run it

```bash
npm install
npx expo start            # scan the QR code with Expo Go, or press i for the iOS simulator
```

The Supabase project URL and publishable key are in `.env`, so a fresh clone runs as is. The publishable key is meant to ship inside the app; the database's rules decide what each person can see. Never put the secret / service_role key in this repo.

**Signing in (v0):** any US phone number, and the code is always `000000`. No text is sent. A new number creates an account; a number that's been used before logs back in. Anyone who knows your number can log in as you, so this is for the first test group only.

Typecheck with `npx tsc --noEmit`.

## Layout

```
app/                  screens (Expo Router)
src/components/       shared pieces: FolderCard, ItemRow, FeedPost, TabBar…
src/screens/          screens reused by more than one route (ItemScreen, AuthStep)
src/theme.ts          colors, fonts, spacing from the mocks
src/api/              data: one file per area, plus db.ts, sync.ts and supabase.ts
supabase/             database migrations and local config
```

## How data flows

- `src/api/db.ts` is a local copy of the tables the signed-in person can see. Screens read it synchronously through the other `src/api/*` files and re-render with `useDb()`.
- `src/api/sync.ts` fills it: `refresh()` selects every table, and the database's rules (`can_view_list` etc.) only return rows you're allowed to see. It runs at sign-in, when the app comes back to the foreground, every minute while open, and after every write.
- Writes change the local copy first (so taps feel instant), then go to Supabase one at a time through `write()`. The refresh after each write picks up what the database's triggers did (feed posts, finished lists) and undoes the local change if the database refused it.
- Photos: item photos upload to the private `photos` bucket (`<list id>/<item id>/<photo id>.jpg`) and are shown through signed links; profile photos go to the public `avatars` bucket.

This "load everything you can see" approach is fine for a small test group. Once there are lots of people and lists, switch the reads to per-screen queries (TanStack Query is the plan).

## Database (Supabase)

The tables live in `supabase/migrations/` as SQL files, applied in order:

- `…_create_tables.sql`: the 11 tables, indexes, `can_view_list` and the read/write rules
- `…_feed_and_functions.sql`: feed posts and list completion (written by the database, not the app), plus `create_list`, `username_available`, `match_contacts`, `delete_account`
- `…_storage.sql`: the private `photos` bucket and public `avatars` bucket
- `…_create_list_with_id.sql`: lets the app pick a new list's id so it can show it right away

Phone sign-in settings on the hosted project (Authentication > Sign In / Providers > Phone): provider on, **Enable phone confirmations off**. The Twilio fields hold placeholders; nothing is sent while confirmations are off. To turn on real texts later: put in real Twilio details, turn confirmations on, and switch `signInWithCode` in `src/api/sync.ts` to `signInWithOtp` / `verifyOtp`.

```bash
npx supabase link --project-ref fljsphilewtthjcqkmmn   # once
npx supabase db push                                  # apply new migrations to the hosted project
npx supabase migration new <name>                     # start a new change
```
