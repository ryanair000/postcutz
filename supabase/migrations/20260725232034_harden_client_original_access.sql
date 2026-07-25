-- Ensure the fixed JBCutz client can never inherit database-admin storage access.
-- Administrative app routes authorize with ADMIN_EMAILS and use the service role.

begin;

update public.poster_portal_profiles
set role = 'client'
where lower(email) = 'jbcutz@postcutz.app';

create or replace function public.poster_portal_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.poster_portal_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and lower(email) <> 'jbcutz@postcutz.app'
  );
$$;

create or replace function public.poster_portal_adjust_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_balance integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_amount = 0 then
    raise exception 'amount_must_not_be_zero';
  end if;

  insert into public.poster_portal_credit_ledger (
    user_id,
    amount,
    type,
    reference,
    note
  )
  values (
    p_user_id,
    p_amount,
    'admin_adjustment',
    pg_catalog.gen_random_uuid()::text,
    p_reason
  );

  select coalesce(sum(amount), 0)::integer
  into next_balance
  from public.poster_portal_credit_ledger
  where user_id = p_user_id;

  return next_balance;
end;
$$;

revoke all on function public.poster_portal_adjust_credits(uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.poster_portal_adjust_credits(uuid, integer, text)
  to service_role;

create or replace function public.poster_portal_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) <> 'jbcutz@postcutz.app' then
    return new;
  end if;

  insert into public.poster_portal_profiles (
    user_id,
    email,
    display_name,
    role,
    welcome_credits_granted_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', 'JBCutz'),
    'client',
    now()
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        role = 'client';

  insert into public.poster_portal_credit_ledger (
    user_id,
    amount,
    type,
    reference,
    note
  )
  values (new.id, 10, 'welcome', 'welcome', 'Welcome credits')
  on conflict (user_id, type, reference) do nothing;

  return new;
end;
$$;

revoke all on function public.poster_portal_handle_new_user()
  from public, anon, authenticated;
grant execute on function public.poster_portal_handle_new_user()
  to service_role;

drop trigger if exists poster_portal_on_auth_user_created on auth.users;
create trigger poster_portal_on_auth_user_created
after insert on auth.users
for each row
when (lower(coalesce(new.email, '')) = 'jbcutz@postcutz.app')
execute function public.poster_portal_handle_new_user();

commit;
