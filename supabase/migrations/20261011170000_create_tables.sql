-- list v0 schema: tables, indexes, visibility helpers, row-level security.
-- Feed events, list completion and sign-up helpers are in the next migration.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.list_visibility as enum ('anyone', 'followers', 'specific');
create type public.member_status as enum ('invited', 'joined');
create type public.event_kind as enum ('list_created', 'item_added', 'open_invite', 'item_done', 'list_done');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per person. The phone number stays in auth.users and is never copied here,
-- because every signed-in person can read profiles.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,20}$'),
  name text not null check (char_length(name) between 1 and 50),
  profile_photo text,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

-- No owner column: who is on a list lives only in list_members.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  visibility public.list_visibility not null default 'followers',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- The join table. Everyone joined is an equal owner; an invite is a row with status 'invited'.
create table public.list_members (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.member_status not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_members_user_idx on public.list_members (user_id);

-- Only used when lists.visibility = 'specific'.
create table public.list_viewers (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (list_id, user_id)
);
create index list_viewers_user_idx on public.list_viewers (user_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text not null default '',
  date date,
  open_invite boolean not null default false,
  caption text,
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (done_by is null or done_at is not null)
);
create index items_list_idx on public.items (list_id, created_at desc);
create index items_open_invite_idx on public.items (date) where open_invite and done_at is null;

-- Files live in the 'photos' storage bucket; position 0 is the big one.
create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  path text not null,
  position integer not null default 0,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index item_photos_item_idx on public.item_photos (item_id, position);

-- A star. One per person per item.
create table public.interests (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index interests_user_idx on public.interests (user_id);

-- The feed. Written only by triggers and database functions, never by the app.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind public.event_kind not null,
  list_id uuid not null references public.lists (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index events_created_idx on public.events (created_at desc);
create index events_actor_idx on public.events (actor_id, created_at desc);
create index events_item_idx on public.events (item_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- Read in the dashboard only; nobody can read reports through the app.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  list_id uuid references public.lists (id) on delete set null,
  item_id uuid references public.items (id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (profile_id is not null or list_id is not null or item_id is not null)
);

-- ---------------------------------------------------------------------------
-- Visibility helpers. security definer so they can look across tables without
-- tripping each table's own rules (which would loop).
-- ---------------------------------------------------------------------------

create function public.is_blocked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Joined (not just invited).
create function public.is_list_member(p_list uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.list_members
    where list_id = p_list and user_id = (select auth.uid()) and status = 'joined'
  );
$$;

-- The one visibility rule. True when you're on the list or invited to it, or the
-- list's visibility lets you in and nobody on it has blocked you (or you them).
create function public.can_view_list(p_list uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    exists (
      select 1 from public.list_members
      where list_id = p_list and user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.lists l
      where l.id = p_list
        and (
          l.visibility = 'anyone'
          or (l.visibility = 'followers' and exists (
                select 1
                from public.list_members m
                join public.follows f on f.followee_id = m.user_id
                where m.list_id = l.id and m.status = 'joined'
                  and f.follower_id = (select auth.uid())))
          or (l.visibility = 'specific' and exists (
                select 1 from public.list_viewers v
                where v.list_id = l.id and v.user_id = (select auth.uid())))
        )
        and not exists (
          select 1
          from public.list_members m
          join public.blocks b
            on (b.blocker_id = m.user_id and b.blocked_id = (select auth.uid()))
            or (b.blocked_id = m.user_id and b.blocker_id = (select auth.uid()))
          where m.list_id = l.id and m.status = 'joined')
    );
$$;

create function public.list_of_item(p_item uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select list_id from public.items where id = p_item;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security. Everything is closed unless a policy below opens it.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_viewers enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.interests enable row level security;
alter table public.events enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- profiles: everyone signed in can read, except across a block. Only you edit yours.
create policy "read profiles" on public.profiles for select to authenticated
  using (not public.is_blocked((select auth.uid()), id));
create policy "create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- follows: readable for counts; you follow and unfollow as yourself.
create policy "read follows" on public.follows for select to authenticated using (true);
create policy "follow" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked(follower_id, followee_id));
create policy "unfollow" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- lists: created through create_list() so you're always added as joined.
create policy "read lists" on public.lists for select to authenticated
  using (public.can_view_list(id));
create policy "edit lists" on public.lists for update to authenticated
  using (public.is_list_member(id)) with check (public.is_list_member(id));
create policy "delete lists" on public.lists for delete to authenticated
  using (public.is_list_member(id));

-- list_members: anyone on the list invites; you accept, decline or leave yourself.
create policy "read members" on public.list_members for select to authenticated
  using (public.can_view_list(list_id));
create policy "invite" on public.list_members for insert to authenticated
  with check (
    public.is_list_member(list_id)
    and status = 'invited'
    and invited_by = (select auth.uid())
    and user_id <> (select auth.uid())
    and not public.is_blocked((select auth.uid()), user_id));
create policy "accept invite" on public.list_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'joined');
create policy "leave, decline or remove" on public.list_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_list_member(list_id));

-- list_viewers: the chosen people, managed by anyone on the list.
create policy "read viewers" on public.list_viewers for select to authenticated
  using (public.is_list_member(list_id) or user_id = (select auth.uid()));
create policy "add viewers" on public.list_viewers for insert to authenticated
  with check (public.is_list_member(list_id));
create policy "remove viewers" on public.list_viewers for delete to authenticated
  using (public.is_list_member(list_id));

-- items
create policy "read items" on public.items for select to authenticated
  using (public.can_view_list(list_id));
create policy "add items" on public.items for insert to authenticated
  with check (public.is_list_member(list_id));
create policy "edit items" on public.items for update to authenticated
  using (public.is_list_member(list_id)) with check (public.is_list_member(list_id));
create policy "delete items" on public.items for delete to authenticated
  using (public.is_list_member(list_id));

-- item_photos
create policy "read photos" on public.item_photos for select to authenticated
  using (public.can_view_list(public.list_of_item(item_id)));
create policy "add photos" on public.item_photos for insert to authenticated
  with check (public.is_list_member(public.list_of_item(item_id)) and added_by = (select auth.uid()));
create policy "edit photos" on public.item_photos for update to authenticated
  using (public.is_list_member(public.list_of_item(item_id)));
create policy "delete photos" on public.item_photos for delete to authenticated
  using (public.is_list_member(public.list_of_item(item_id)));

-- interests: anyone who can see an open invite can star it, unless it's on a list you're on.
create policy "read stars" on public.interests for select to authenticated
  using (public.can_view_list(public.list_of_item(item_id)));
create policy "star" on public.interests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_list(public.list_of_item(item_id))
    and not public.is_list_member(public.list_of_item(item_id))
    and exists (select 1 from public.items i where i.id = item_id and i.open_invite));
create policy "unstar" on public.interests for delete to authenticated
  using (user_id = (select auth.uid()));

-- events: your own and those of people you follow, on lists you can see.
create policy "read feed" on public.events for select to authenticated
  using (
    public.can_view_list(list_id)
    and (
      actor_id = (select auth.uid())
      or exists (select 1 from public.follows f
                 where f.follower_id = (select auth.uid()) and f.followee_id = actor_id)
    ));

-- blocks: only your own.
create policy "read own blocks" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "block" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "unblock" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- reports: write-only from the app.
create policy "report" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
