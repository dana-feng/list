-- "just me": a list only the people on it can see.
--
-- can_view_list() already lets members (and people invited) in no matter what, and none of its
-- other branches match this value, so no rule or function needs to change.
--
-- A new enum value can't be used in the same transaction that adds it, so lists that were
-- "specific people" with nobody picked are moved over in the next migration.
alter type public.list_visibility add value if not exists 'just_me';
