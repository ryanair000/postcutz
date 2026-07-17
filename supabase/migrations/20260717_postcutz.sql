create extension if not exists pgcrypto;

create table if not exists public.postcutz_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'client' check (role in ('client','admin')),
  welcome_credits_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.postcutz_posters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text not null default 'Brand',
  preview_path text not null,
  original_path text,
  file_name text,
  mime_type text,
  width integer,
  height integer,
  credit_cost integer not null default 1 check (credit_cost > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.postcutz_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poster_id uuid not null references public.postcutz_posters(id) on delete restrict,
  credits_spent integer not null,
  downloads_count integer not null default 0,
  unlocked_at timestamptz not null default now(),
  unique(user_id, poster_id)
);

create table if not exists public.postcutz_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poster_id uuid not null references public.postcutz_posters(id) on delete restrict,
  downloaded_at timestamptz not null default now()
);

create table if not exists public.postcutz_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  source text not null check (source in ('welcome','purchase','poster_unlock','admin_adjustment','refund')),
  reference text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists postcutz_credit_ledger_reference_unique
  on public.postcutz_credit_ledger(user_id, source, reference)
  where reference is not null;

create table if not exists public.postcutz_credit_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  credits integer not null check (credits > 0),
  amount_kes integer not null check (amount_kes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists postcutz_credit_packages_credits_unique on public.postcutz_credit_packages(credits);

create table if not exists public.postcutz_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  package_id uuid references public.postcutz_credit_packages(id),
  credits integer not null check (credits > 0),
  expected_amount_minor integer not null check (expected_amount_minor > 0),
  paid_amount_minor integer,
  status text not null default 'pending' check (status in ('pending','paid','failed','abandoned')),
  access_code text,
  provider_transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists postcutz_unlocks_user_idx on public.postcutz_unlocks(user_id);
create index if not exists postcutz_downloads_user_idx on public.postcutz_downloads(user_id);
create index if not exists postcutz_ledger_user_idx on public.postcutz_credit_ledger(user_id);
create index if not exists postcutz_payments_user_idx on public.postcutz_payments(user_id);
create index if not exists postcutz_posters_status_idx on public.postcutz_posters(status, published_at desc);

insert into public.postcutz_credit_packages(name, credits, amount_kes)
values ('Starter',1,100),('Five Pack',5,500),('Ten Pack',10,1000),('Studio Pack',20,2000)
on conflict (credits) do update set name = excluded.name, amount_kes = excluded.amount_kes, active = true;

create or replace function public.postcutz_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.postcutz_profiles(id,email,full_name,welcome_credits_granted_at)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','Client'),now())
  on conflict (id) do nothing;

  insert into public.postcutz_credit_ledger(user_id,amount,source,reference,note)
  values(new.id,10,'welcome','welcome-credits','10 free welcome credits')
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.postcutz_handle_new_user() from public, anon, authenticated;

drop trigger if exists postcutz_on_auth_user_created on auth.users;
create trigger postcutz_on_auth_user_created
after insert on auth.users
for each row execute function public.postcutz_handle_new_user();

create or replace function public.postcutz_balance()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(amount),0)::integer from public.postcutz_credit_ledger where user_id = auth.uid();
$$;

revoke all on function public.postcutz_balance() from public;
grant execute on function public.postcutz_balance() to authenticated;

create or replace function public.postcutz_unlock(p_poster_id uuid)
returns table(unlock_id uuid, already_unlocked boolean, credit_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost integer;
  v_balance integer;
  v_unlock uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select id into v_unlock from public.postcutz_unlocks where user_id = v_user and poster_id = p_poster_id;
  if v_unlock is not null then
    return query select v_unlock, true, coalesce((select sum(amount)::integer from public.postcutz_credit_ledger where user_id=v_user),0);
    return;
  end if;

  select credit_cost into v_cost from public.postcutz_posters where id=p_poster_id and status='published' and original_path is not null;
  if v_cost is null then raise exception 'Poster is not available for download'; end if;

  select coalesce(sum(amount),0)::integer into v_balance from public.postcutz_credit_ledger where user_id=v_user;
  if v_balance < v_cost then raise exception 'Insufficient credits'; end if;

  insert into public.postcutz_credit_ledger(user_id,amount,source,reference,note)
  values(v_user,-v_cost,'poster_unlock',p_poster_id::text,'Permanent poster unlock');

  insert into public.postcutz_unlocks(user_id,poster_id,credits_spent)
  values(v_user,p_poster_id,v_cost)
  returning id into v_unlock;

  return query select v_unlock, false, v_balance-v_cost;
end;
$$;

revoke all on function public.postcutz_unlock(uuid) from public;
grant execute on function public.postcutz_unlock(uuid) to authenticated;

create or replace function public.postcutz_record_download(p_poster_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists(select 1 from public.postcutz_unlocks where user_id=v_user and poster_id=p_poster_id) then
    raise exception 'Poster is not unlocked';
  end if;
  insert into public.postcutz_downloads(user_id,poster_id) values(v_user,p_poster_id);
  update public.postcutz_unlocks set downloads_count=downloads_count+1 where user_id=v_user and poster_id=p_poster_id;
end;
$$;

revoke all on function public.postcutz_record_download(uuid) from public;
grant execute on function public.postcutz_record_download(uuid) to authenticated;

create or replace function public.postcutz_fulfil_payment(p_reference text,p_amount_minor integer,p_transaction_id text)
returns table(fulfilled boolean, credits_added integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.postcutz_payments%rowtype;
begin
  select * into v_payment from public.postcutz_payments where reference=p_reference for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status='paid' then return query select false,v_payment.credits; return; end if;
  if p_amount_minor <> v_payment.expected_amount_minor then raise exception 'Payment amount mismatch'; end if;

  update public.postcutz_payments set status='paid',paid_amount_minor=p_amount_minor,provider_transaction_id=p_transaction_id,paid_at=now() where id=v_payment.id;
  insert into public.postcutz_credit_ledger(user_id,amount,source,reference,note)
  values(v_payment.user_id,v_payment.credits,'purchase',p_reference,'Paystack credit purchase')
  on conflict do nothing;
  return query select true,v_payment.credits;
end;
$$;

revoke all on function public.postcutz_fulfil_payment(text,integer,text) from public, anon, authenticated;
grant execute on function public.postcutz_fulfil_payment(text,integer,text) to service_role;

alter table public.postcutz_profiles enable row level security;
alter table public.postcutz_posters enable row level security;
alter table public.postcutz_unlocks enable row level security;
alter table public.postcutz_downloads enable row level security;
alter table public.postcutz_credit_ledger enable row level security;
alter table public.postcutz_credit_packages enable row level security;
alter table public.postcutz_payments enable row level security;

drop policy if exists "profiles select own" on public.postcutz_profiles;
create policy "profiles select own" on public.postcutz_profiles for select to authenticated using (id=auth.uid());
drop policy if exists "posters select published" on public.postcutz_posters;
create policy "posters select published" on public.postcutz_posters for select to authenticated using (status='published');
drop policy if exists "unlocks select own" on public.postcutz_unlocks;
create policy "unlocks select own" on public.postcutz_unlocks for select to authenticated using (user_id=auth.uid());
drop policy if exists "downloads select own" on public.postcutz_downloads;
create policy "downloads select own" on public.postcutz_downloads for select to authenticated using (user_id=auth.uid());
drop policy if exists "ledger select own" on public.postcutz_credit_ledger;
create policy "ledger select own" on public.postcutz_credit_ledger for select to authenticated using (user_id=auth.uid());
drop policy if exists "packages select active" on public.postcutz_credit_packages;
create policy "packages select active" on public.postcutz_credit_packages for select to authenticated using (active=true);
drop policy if exists "payments select own" on public.postcutz_payments;
create policy "payments select own" on public.postcutz_payments for select to authenticated using (user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('postcutz-previews','postcutz-previews',true,8388608,array['image/png','image/jpeg','image/webp']),
       ('postcutz-originals','postcutz-originals',false,20971520,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public poster previews" on storage.objects;
create policy "public poster previews" on storage.objects for select to public using (bucket_id='postcutz-previews');
