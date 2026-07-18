-- The base schema already enforces these uniqueness constraints. The preceding
-- hardening migration briefly added equivalent named indexes; retain the
-- constraint-backed indexes and remove only the redundant copies.
drop index if exists public.poster_portal_unlocks_user_poster_unique;
drop index if exists public.poster_portal_payments_reference_unique;
drop index if exists public.poster_portal_ledger_reference_unique;
