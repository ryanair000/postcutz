-- PostCutz production hardening for the isolated poster_portal_* schema.
-- The portal's original schema migrations were applied directly to the shared Jenga project.
-- This migration intentionally removes only obsolete PostCutz bootstrap/import infrastructure.

begin;

drop trigger if exists poster_portal_process_payment_event_trigger
  on public.poster_portal_payment_events;
drop function if exists public.poster_portal_process_payment_event();
drop function if exists public.poster_portal_fulfil_payment(text, integer, text, text);

drop table if exists public.poster_portal_payment_events;
drop table if exists public.poster_portal_runtime_secrets;
drop table if exists public.poster_portal_upload_chunks;
drop table if exists public.poster_portal_media_staging;

delete from public.poster_portal_posters
where slug = 'decoder-test'
  and not exists (
    select 1 from public.poster_portal_unlocks
    where poster_id = poster_portal_posters.id
  );

revoke all on function public.poster_portal_fulfil_payment_service(text, integer, text)
  from public, anon, authenticated;
grant execute on function public.poster_portal_fulfil_payment_service(text, integer, text)
  to service_role;

create unique index if not exists poster_portal_unlocks_user_poster_unique
  on public.poster_portal_unlocks(user_id, poster_id);
create unique index if not exists poster_portal_payments_reference_unique
  on public.poster_portal_payments(reference);
create unique index if not exists poster_portal_ledger_reference_unique
  on public.poster_portal_credit_ledger(user_id, type, reference);

update storage.buckets
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'poster-originals';

update storage.buckets
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'poster-previews';

commit;
