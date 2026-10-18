-- The hosted feedback table was created from an early draft of 20261023000000_feedback.sql,
-- before it had the optional reply email, so saving feedback failed on the missing column.
-- Adds it with the same rule as that migration (a no-op where the table already has it).

alter table public.feedback
  add column if not exists email text not null default ''
  check (email = '' or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- so the API sees the new column right away
notify pgrst, 'reload schema';
