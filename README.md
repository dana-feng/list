# list

Expo (React Native) app, iOS first, on Supabase. Everything you do in the app (sign-up, lists, things, check-offs, stars, follows, photos) is saved to the database.

The build plan (data model, visibility rules, screens, what's left before TestFlight) is in [docs/PLAN.md](docs/PLAN.md).

## Run it

You need Node and, on your phone, the Expo Go app (or Xcode on a Mac for the iOS simulator).

```bash
npm install               # first time, and after pulling changes to package.json
npx expo start            # scan the QR code with Expo Go, or press i for the iOS simulator
```

Saving a file reloads the app. Other things that come up:

```bash
npx expo start --clear    # start with a clean cache, when the app shows stale code or assets
npx expo start --tunnel   # when your phone and computer aren't on the same Wi-Fi
npx expo install <name>   # add a package (use this, not npm install, so the version matches the Expo SDK)
```

The Supabase project URL and publishable key are in `.env`, so a fresh clone runs as is. The publishable key is meant to ship inside the app; the database's rules decide what each person can see. Never put the secret / service_role key in this repo. Restart `npx expo start` after changing `.env`.

**Signing in (v0):** any US phone number, and the code is always `000000`. No text is sent. A new number creates an account; a number that's been used before logs back in. Anyone who knows your number can log in as you, so this is for the first test group only.

Before opening a pull request:

```bash
npx tsc --noEmit          # typecheck
npx expo lint             # lint
```

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
- The bell's dot is also live: `src/api/live.ts` listens on Supabase's real-time feed for your own notifications, so a new one lights the dot right away instead of on the next refresh.
- Writes change the local copy first (so taps feel instant), then go to Supabase one at a time through `write()`. The refresh after each write picks up what the database's triggers did (feed posts, finished lists) and undoes the local change if the database refused it.
- Photos: item photos upload to the private `photos` bucket (`<list id>/<item id>/<photo id>.jpg`) and are shown through signed links; profile photos go to the public `avatars` bucket.

This "load everything you can see" approach is fine for a small test group. Once there are lots of people and lists, switch the reads to per-screen queries (TanStack Query is the plan).

## Database (Supabase)

The tables live in `supabase/migrations/` as SQL files, applied in order:

- `…_create_tables.sql`: the 11 tables, indexes, `can_view_list` and the read/write rules
- `…_feed_and_functions.sql`: feed posts and list completion (written by the database, not the app), plus `create_list`, `username_available`, `match_contacts`, `delete_account`
- `…_storage.sql`: the private `photos` bucket and public `avatars` bucket
- `…_create_list_with_id.sql`: lets the app pick a new list's id so it can show it right away
- `…_avatar_read_policy.sql`: lets signed-in people read the `avatars` bucket, which profile photo uploads need
- `…_invite_audience.sql`: an open invite gets its own audience (followers, specific people, anyone), separate from who can see the list. The app needs this one applied before it will load.
- `…_always_post_item_added.sql`: adding an item always posts "added an item", even when its open invite is on from the start
- `…_item_order.sql`: `items.position` and `reorder_items`, so a list's to-dos keep the order they're dragged into. Until it's applied, dragging a row shows "Couldn't save the new order" and the row goes back.
- `…_notifications.sql`: the `notifications` table behind the bell on Home, written only by triggers (invites, sharing, tags, comments, replies, likes, interested, things added / crossed off / finished), plus `mark_notifications_read`. Until it's applied, the bell never shows a dot and the notifications screen says it couldn't load.
- `…_item_tags.sql`: one tag per item (`items.tag`: invite, gift or borrow), `gift_quantity`, and two tables: `gift_claims` (readable only by whoever made the claim; counts come from `gift_status()`, claiming goes through `claim_gift()`) and `borrow_haves`. `open_invite` stays and is kept in step with the tag. **Apply this before shipping the app from that branch**: the app loads `borrow_haves` and `gift_status` on every refresh and saves new items with a `tag`.
- `…_borrow_has_notification.sql`: tells a list's people when someone says they have the thing a borrow ask is for (`borrow_has`). Gift claims never notify anyone.
- `…_notifications_realtime.sql`: puts `notifications` on the `supabase_realtime` publication so the bell's dot updates live. The table's read rule means each person only hears about their own rows. Until it's applied, the dot still updates on the one-minute refresh.
- `…_push_notifications.sql`: push notifications off the same table. `push_tokens` (each person's phones, saved with `save_push_token` / removed with `forget_push_token`), a `notifications_push` trigger that asks the `push` Edge Function to send (through `pg_net`, only once the two Vault secrets below exist), and `claim_push()`, which decides what buzzes. Safe to apply before push is set up: without the secrets the trigger does nothing.
- `…_feedback.sql`: the `feedback` table (write-only from the app) and a trigger that copies each new row to the team's Google Sheet. The sheet needs a one-time setup: see [docs/FEEDBACK.md](docs/FEEDBACK.md).

Phone sign-in settings on the hosted project (Authentication > Sign In / Providers > Phone): provider on, **Enable phone confirmations off**. The Twilio fields hold placeholders; nothing is sent while confirmations are off. To turn on real texts later: put in real Twilio details, turn confirmations on, and switch `signInWithCode` in `src/api/sync.ts` to `signInWithOtp` / `verifyOtp`.

### Push notifications

What buzzes is decided in `claim_push()` (`…_push_notifications.sql`):

| | kinds |
|---|---|
| right away | invites, sharing, tags, comments, replies, someone joined, interested, "has one you can borrow", a list finished |
| at most every 30 min | likes, things crossed off (the next push rolls them up: "jo, tochi and 3 others liked…") |
| never | things added to a list (still in the bell) |

10pm to 8am on the phone's clock, pushes still arrive but silently (iOS "passive": no sound, the screen doesn't light up). Opening the bell or taking something back never pushes. No badge numbers, same as the bell.

The flow: a notification row is added or merged into → `notifications_push` trigger → `pg_net` POST to the `push` Edge Function (`supabase/functions/push`) → `claim_push()` → Expo's push service → the phone. Tapping it opens the item or list, like tapping the row in the bell.

To turn it on (none of this is needed for the rest of the app to work):

1. **EAS project** (a free Expo account is enough): `npx eas-cli@latest init` adds `extra.eas.projectId` to `app.json`. Without it the app skips push setup.
2. **Testing now, no Apple account:** on an iPhone, Expo Go can receive pushes (it uses Expo's own push key). Run `npx expo start`, open in Expo Go and say yes to notifications. (Android dropped push from Expo Go in SDK 53.)
3. **For TestFlight / the App Store** (needs the Apple developer account): `npx eas-cli@latest credentials` → iOS → Push Notifications → let EAS create the key, then `npx eas-cli@latest build`. Android needs an FCM key instead, whenever Android happens.
4. **The function**, with a long random secret:
   ```bash
   npx supabase secrets set PUSH_SECRET=<random string>
   npx supabase functions deploy push
   ```
5. **Vault secrets** so the database can call it (SQL editor on the hosted project):
   ```sql
   select vault.create_secret('https://fljsphilewtthjcqkmmn.supabase.co/functions/v1/push', 'push_function_url');
   select vault.create_secret('<the same random string>', 'push_secret');
   ```
6. Sign in on a phone, say yes to notifications, and have someone comment on your post.

Tests for the message wording: `node --experimental-strip-types --test supabase/functions/push/message.test.ts`.

### Updating the database

The app talks to the hosted Supabase project, so a database change only takes effect once it is pushed there. Never edit a migration that has already been pushed; add a new one.

One-time setup on a new machine:

```bash
npx supabase login                                     # opens the browser to sign in
npx supabase link --project-ref fljsphilewtthjcqkmmn   # asks for the database password
```

Making a change:

```bash
npx supabase migration new <name>     # creates an empty SQL file in supabase/migrations/
# write the SQL in that file, then:
npx supabase db push --dry-run        # shows which migrations would be applied
npx supabase db push                  # applies them to the hosted project
```

After pulling someone else's migrations, `npx supabase db push` applies the ones the hosted project doesn't have yet. `npx supabase migration list` shows which are applied locally and remotely.

If a change adds or renames a table or column the app reads, update the matching type in `src/api/db.ts` and the queries in `src/api/sync.ts`.
