# list: React Native build plan

Last updated Oct 11, 2026. Designs live on the design canvas (claude.ai artifact "*-list, simplified"); this file is the build plan that goes with them.

## Summary

v0 is an Expo (React Native) app on Supabase, iOS only, matching the design canvas: phone sign-up, lists you share with friends, things with photos and notes, stars for "interested?", and a feed of what your people are doing.

**Where things stand:** the screens are built, the database is live, and the app reads and writes Supabase (PRs #1–#4). What's left is testing on phones, fixing what that turns up, and the TestFlight items in phase 6.

**Not in v0:** notifications, turning interest into a plan ("actually going"), people you may know, share links, Android, wishlists.

## Stack

| Piece | Choice | Notes |
| --- | --- | --- |
| App | Expo SDK 57 + TypeScript, Expo Router | Test with Expo Go; EAS for TestFlight |
| Data | supabase-js through a local copy (`src/api/db.ts` + `sync.ts`) | Loads everything you can see, writes go straight to Supabase. Move to per-screen queries (TanStack Query) once there are lots of users |
| Auth | Supabase phone + password | v0: any US number, code `000000` (used as the password), "Enable phone confirmations" off, Twilio fields hold placeholders. Real texts later: Twilio Verify, ~$0.06 a sign-in |
| Database | Supabase Postgres + row-level security | Visibility rules live in the database, not the app |
| Photos | Supabase Storage | `photos` (private, same visibility as the list), `avatars` (public) |
| Fonts | Fraunces, Instrument Sans, DM Mono | Same type as the mocks |
| Phone features | expo-image-picker, expo-contacts, expo-image, expo-sqlite (saved sign-in) | |
| Ship | EAS Build + Submit | |

Project: Supabase `fljsphilewtthjcqkmmn`. The URL and publishable key are committed in `.env`; never commit the secret / service_role key.

```
app/                   screens (Expo Router)
src/components/        shared pieces (see Components)
src/screens/           screens used by more than one route (ItemScreen, AuthStep)
src/theme.ts           colors, fonts, spacing from the mocks
src/api/               supabase.ts (client), sync.ts (load + write queue), db.ts (local copy),
                       profiles.ts, lists.ts, items.ts, feed.ts
supabase/migrations/   SQL, one file per change; apply with `npx supabase db push`
```

## Data model

Eleven tables. The feed is its own `events` table written by database triggers, so a post is never edited after the fact; turning on an open invite later makes a new post.

| Table | Key columns | Notes |
| --- | --- | --- |
| profiles | id (= auth user), username (unique, lowercase), name, profile_photo | Phone stays in auth.users, never exposed |
| follows | follower_id, followee_id, created_at | One row per pair; no follow requests in v0 |
| lists | id, title, visibility (anyone / followers / specific), completed_at, created_at | No owner column. completed_at set when the last thing is done, cleared if one is unchecked |
| list_members | list_id, user_id, status (invited / joined), invited_by | The join table: who's on a list. Everyone joined is an equal owner; creating a list adds you as joined. An invite is a row with status invited (the yellow folder) |
| list_viewers | list_id, user_id | Only used when visibility = specific |
| items | id, list_id, title, notes, date, open_invite, caption, done_at, done_by, created_at | open_invite = the paper plane; caption = the "you did it" words. Open things show newest first |
| item_photos | id, item_id, path, position, added_by | Files in the photos bucket at `<list>/<item>/<photo>.jpg`; position 0 is the big one |
| interests | item_id, user_id, created_at | A star, one per person per item; only on open invites |
| events | id, actor_id, kind, list_id, item_id, created_at | kind: list_created, item_added, open_invite, item_done, list_done. Unchecking deletes the item_done (and list_done) post |
| blocks | blocker_id, blocked_id, created_at | Hides each other's profiles, lists and posts both ways; removes follows |
| reports | id, reporter_id, profile_id, list_id, item_id, reason, created_at | Read in the dashboard only |

Database functions the app calls: `create_list` (list + you as joined + viewers + invites in one step), `username_available`, `match_contacts` (phone numbers in, matching profiles out, never numbers), `delete_account`.

## Who can see what

One function, `can_view_list(list_id)`, decides visibility, and every table's read rule uses it, so a list, its things, photos, stars and feed posts can never disagree. It's true when you're on the list or invited to it, or:

- visibility = anyone, or
- visibility = followers and you follow anyone on the list, or
- visibility = specific and you're in list_viewers

…and nobody on the list has blocked you (or you them).

| Table | Read | Write |
| --- | --- | --- |
| profiles | everyone signed in (not across a block) | only your own row |
| lists, items, item_photos | can_view_list | anyone on the list |
| list_members | can_view_list | anyone on the list invites; you accept, decline or leave |
| interests | can_view_list | your own star, only on open invites on lists you're not on |
| events | can_view_list, and the actor is you or someone you follow | triggers only |
| photos bucket | can_view_list for the photo's list | anyone on the list |
| avatars bucket | public | only your own folder |

Feeds: **All** is posts from you and people you follow, newest first. **Open Invite** is open, not-done things on lists you can see but aren't on, soonest date first.

## Screens

There's one list screen and one item screen, whether it's yours or a friend's. Members get checkboxes, Edit and the paper plane; everyone else gets the "interested?" star.

| Route | Canvas board | Shows |
| --- | --- | --- |
| (auth)/welcome, phone, code, profile, friends | Signing up row | Phone + 000000, name + username + photo, contacts match, then home |
| (tabs)/index | Home: Everything / Open Invite | Feed with the All / Open Invite tabs, search icon |
| (tabs)/me | Your lists = your profile | Counts, folders, invites |
| plus (modal) | Tap + | Start a list / Add a thing |
| list/new, list/[id]/people | Starting a list row | Name, who's on it, who can see it, follower picker |
| list/[id] | A list / A friend's list | Members: check off, add a thing. Others: stars |
| item/new | Add a thing | Same layout as edit, list picker in the tab |
| item/[id] | Viewing a thing / A friend's thing | View and edit for members; star for others |
| done/[id] | You did it | Add pics, Post (always posts) |
| user/[username] | Someone else's lists | Follow, their folders |
| search | Search | People by name or @username |
| settings | Settings, Settings: editing | Account edit, help, log out, delete account |

## Components

View, edit and new are one screen each with a mode, so a list or thing looks the same whether you're reading, editing or creating it.

| Component | What it is |
| --- | --- |
| Screen | Sage gradient background + safe area |
| FolderCard | Card with a tab sticking up from its top-left ("5/9 done", "new list", "invited") |
| ProgressBar | Row of small segments under a list, one per thing, filled when done |
| TextAction | Plain-text header action (Edit, Save, Create, Add, Cancel) |
| Avatar, AvatarStack | Round photo; overlapping row of them |
| TabBar | Home, +, lists as folder tabs |
| TitleField, NotesField, DateField | Text in view mode, dashed-underline inputs in edit |
| PhotoGrid | Big first photo + smaller ones; add button when you can add |
| ListPicker | List dropdown inside the folder tab (search, recent, + new list) |
| VisibilityPicker | Anyone / Followers / Specific people |
| PersonPicker | Searchable follower list with checkboxes (select or invite) |
| UsernameField | Input with live available / taken message |
| Checkbox | The square you tick to mark done |
| InterestButton | Star + "interested?" label; gold when tapped; hidden on your own things |
| AskButton | The paper plane that turns on an open invite |
| ItemRow | One thing on a list: open (yours), open (a friend's), or done |
| ListFolderCard | A list on a profile grid; invited version with Join / No thanks |
| PeopleRow | Who's doing it, then who's interested + count |
| FeedPost, OpenInviteRow | Feed posts; Open Invite rows with the date block |
| PersonRow, FollowButton | Photo, name, @username; dark "Follow" / grey "Following" |
| ProfileHeader | Photo, lists / followers / following counts, name, lists done |
| DoneToast | "Done: …" with Add pics / Undo / Later |

## Build phases

1. **Foundations** — done: Expo app, theme, components, Supabase project linked, migrations.
2. **Sign-up and profile** — built, needs testing on phones: phone + 000000, profile step with username check and photo, find your people, saved sign-in.
3. **Lists and things** — built, needs testing: your lists page, start a list, check off + undo, add/edit a thing, photos, you did it.
4. **Other people** — built, needs testing: profiles, follow, their lists and things with the star, invites, search.
5. **Feed** — built, needs testing: triggers write posts; All and Open Invite tabs.
6. **Ready for TestFlight** — to do:
   - [ ] Test every flow above on two phones with two accounts (visibility, invites, stars, feed)
   - [ ] Block and report on profiles (Apple requires it for apps with user posts)
   - [ ] Empty states: new user's feed and lists
   - [ ] Remove the share icons (no share links in v0)
   - [ ] Real texts: Twilio Verify in Supabase, turn confirmations on, switch `signInWithCode` to `signInWithOtp` / `verifyOtp`; keep one 000000 test number for the App Store reviewer
   - [ ] App icon, splash, EAS build, TestFlight, privacy details in App Store Connect

## Decisions

- **Checking something off always posts.** "Later" on the toast posts without photos; Undo is the only way back.
- **Open invite things are visible to everyone who can view the list**, and the same people see who's interested.
- **iOS only for v0.** Android later from the same code.
- **No share links in v0.**
- **Everyone on a list is an equal owner.** No owner column; who's on a list lives in list_members.
- **v0 sign-in: any number, code 000000.** Anyone who knows your number can log in as you, which is fine for the first test group only.
- **SMS cost:** Twilio charges per text; set a budget cap before a wider launch.
