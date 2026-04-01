create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('director', 'office', 'engineer');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type public.job_type as enum ('Electrical', 'Fire');
  end if;

  if not exists (select 1 from pg_type where typname = 'workflow_stage') then
    create type public.workflow_stage as enum (
      'quote_sent',
      'accepted',
      'declined',
      'po_received',
      'materials_ordered',
      'booked',
      'completed',
      'not_completed',
      'report_complete',
      'invoice_sent'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('draft', 'due', 'paid', 'overdue');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'New user',
  role public.app_role not null default 'engineer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  primary_contact text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  address text,
  notes text,
  primary_engineer_name text,
  last_visit_at timestamptz,
  next_visit_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  title text not null,
  job_type public.job_type not null default 'Electrical',
  stage public.workflow_stage not null default 'quote_sent',
  assignee_name text,
  scheduled_for timestamptz,
  value_gbp numeric(12,2) not null default 0,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  visit_date timestamptz not null default now(),
  title text not null,
  visit_type text not null default 'Visit report',
  engineer_name text,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_images (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  image_url text,
  caption text,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  directors_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  amount_gbp numeric(12,2) not null default 0,
  status public.invoice_status not null default 'draft',
  due_date date,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'New user')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at
before update on public.jobs
for each row execute procedure public.touch_updated_at();

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'engineer'::public.app_role)
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.jobs enable row level security;
alter table public.site_visits enable row level security;
alter table public.site_images enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
on public.profiles
for select
using (auth.role() = 'authenticated');

drop policy if exists "profiles users update self or directors update all" on public.profiles;
create policy "profiles users update self or directors update all"
on public.profiles
for update
using (auth.uid() = id or public.current_role() = 'director')
with check (auth.uid() = id or public.current_role() = 'director');

drop policy if exists "customers readable by authenticated users" on public.customers;
create policy "customers readable by authenticated users"
on public.customers
for select
using (auth.role() = 'authenticated');

drop policy if exists "customers writable by office and directors" on public.customers;
create policy "customers writable by office and directors"
on public.customers
for all
using (public.current_role() in ('office', 'director'))
with check (public.current_role() in ('office', 'director'));

drop policy if exists "sites readable by authenticated users" on public.sites;
create policy "sites readable by authenticated users"
on public.sites
for select
using (auth.role() = 'authenticated');

drop policy if exists "sites writable by office and directors" on public.sites;
create policy "sites writable by office and directors"
on public.sites
for all
using (public.current_role() in ('office', 'director'))
with check (public.current_role() in ('office', 'director'));

drop policy if exists "jobs readable by authenticated users" on public.jobs;
create policy "jobs readable by authenticated users"
on public.jobs
for select
using (auth.role() = 'authenticated');

drop policy if exists "jobs updatable by authenticated users" on public.jobs;
create policy "jobs updatable by authenticated users"
on public.jobs
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "jobs insertable by office and directors" on public.jobs;
create policy "jobs insertable by office and directors"
on public.jobs
for insert
with check (public.current_role() in ('office', 'director'));

drop policy if exists "site visits readable by authenticated users" on public.site_visits;
create policy "site visits readable by authenticated users"
on public.site_visits
for select
using (auth.role() = 'authenticated');

drop policy if exists "site visits insertable by authenticated users" on public.site_visits;
create policy "site visits insertable by authenticated users"
on public.site_visits
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "site visits updatable by office and directors" on public.site_visits;
create policy "site visits updatable by office and directors"
on public.site_visits
for update
using (public.current_role() in ('office', 'director'))
with check (public.current_role() in ('office', 'director'));

drop policy if exists "site images readable by authenticated users" on public.site_images;
create policy "site images readable by authenticated users"
on public.site_images
for select
using (auth.role() = 'authenticated');

drop policy if exists "site images insertable by authenticated users" on public.site_images;
create policy "site images insertable by authenticated users"
on public.site_images
for insert
with check (auth.role() = 'authenticated');

drop policy if exists "site images updatable by office and directors" on public.site_images;
create policy "site images updatable by office and directors"
on public.site_images
for update
using (public.current_role() in ('office', 'director'))
with check (public.current_role() in ('office', 'director'));

drop policy if exists "chat threads visible to permitted users" on public.chat_threads;
create policy "chat threads visible to permitted users"
on public.chat_threads
for select
using (
  auth.role() = 'authenticated'
  and (directors_only = false or public.current_role() = 'director')
);

drop policy if exists "chat threads manageable by directors" on public.chat_threads;
create policy "chat threads manageable by directors"
on public.chat_threads
for all
using (public.current_role() = 'director')
with check (public.current_role() = 'director');

drop policy if exists "chat messages visible to permitted users" on public.chat_messages;
create policy "chat messages visible to permitted users"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (t.directors_only = false or public.current_role() = 'director')
  )
);

drop policy if exists "chat messages insertable by authenticated users" on public.chat_messages;
create policy "chat messages insertable by authenticated users"
on public.chat_messages
for insert
with check (
  auth.role() = 'authenticated'
  and (author_id is null or author_id = auth.uid())
  and exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (t.directors_only = false or public.current_role() = 'director')
  )
);

drop policy if exists "invoices readable by office and directors" on public.invoices;
create policy "invoices readable by office and directors"
on public.invoices
for select
using (public.current_role() in ('office', 'director'));

drop policy if exists "invoices writable by office and directors" on public.invoices;
create policy "invoices writable by office and directors"
on public.invoices
for all
using (public.current_role() in ('office', 'director'))
with check (public.current_role() in ('office', 'director'));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
