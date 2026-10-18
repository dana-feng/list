-- Feedback, from "help + feedback" in settings.
--
-- The app can only add feedback, never read it (like reports). Each new row is also copied to
-- a Google Sheet so the team can read and triage it in one place: the trigger below posts it
-- to a small Apps Script web app (docs/feedback-sheet.gs) that appends a row.
--
-- The sheet hook is set up with two Vault secrets, added once in the dashboard
-- (SQL editor; see docs/FEEDBACK.md):
--   select vault.create_secret('<web app url>', 'feedback_sheet_url');
--   select vault.create_secret('<shared secret>', 'feedback_sheet_secret');
-- Until both exist, feedback is still saved here; it just isn't copied to the sheet.

create extension if not exists pg_net with schema extensions;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null default auth.uid(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  -- optional: where to reply, when they'd like one
  email text not null default '' check (email = '' or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  -- what they were running, so bugs can be reproduced
  app_version text not null default '' check (char_length(app_version) <= 40),
  platform text not null default '' check (char_length(platform) <= 40),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- write-only from the app; read in the sheet (or the dashboard)
create policy "send feedback" on public.feedback for insert to authenticated
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Copy to the Google Sheet
-- ---------------------------------------------------------------------------

-- pg_net sends the request after the insert commits, in the background, so a slow or broken
-- sheet never stops feedback from being saved. Failed requests are logged in net._http_response.
create function public.feedback_to_sheet()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  url text;
  secret text;
  who public.profiles;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'feedback_sheet_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feedback_sheet_secret';
  if url is null or secret is null then
    return new;
  end if;

  select * into who from public.profiles where id = new.profile_id;

  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'secret', secret,
      'id', new.id,
      'sent', to_char(new.created_at at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI'),
      'kind', new.kind,
      'message', new.message,
      'username', coalesce(who.username, ''),
      'name', coalesce(who.name, ''),
      'email', new.email,
      'app_version', new.app_version,
      'platform', new.platform
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

revoke execute on function public.feedback_to_sheet() from public, anon, authenticated;

create trigger feedback_to_sheet
  after insert on public.feedback
  for each row execute function public.feedback_to_sheet();
