-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  email text unique not null,
  password_hash text not null,
  is_active boolean not null default true,
  chat_assistant_enabled boolean not null default false,
  monitoring_dashboard_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  file_type text,
  parse_status text,
  row_count int not null default 0,
  parsed_columns jsonb not null default '[]'::jsonb,
  parsed_rows jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_ids uuid[] not null default '{}'::uuid[],
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Rename legacy event tables to user_activity_logs when needed.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'usage_events'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_activity_logs'
  ) then
    alter table public.usage_events rename to user_activity_logs;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'activity_events'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_activity_logs'
  ) then
    alter table public.activity_events rename to user_activity_logs;
  end if;
end $$;

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_query_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  query_type text not null check (query_type in ('chatbot', 'visualization')),
  query_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.users(id) on delete cascade,
  country_code text not null default 'US',
  timezone text,
  last_seen_at timestamptz not null default now()
);

-- Idempotent migration support for existing projects.
alter table public.documents add column if not exists file_type text;
alter table public.documents add column if not exists parse_status text;
alter table public.documents add column if not exists row_count int not null default 0;
alter table public.documents add column if not exists parsed_columns jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists parsed_rows jsonb not null default '[]'::jsonb;
alter table public.chat_history add column if not exists document_ids uuid[] not null default '{}'::uuid[];
alter table public.users add column if not exists username text;
alter table public.users add column if not exists is_active boolean not null default true;
alter table public.users add column if not exists chat_assistant_enabled boolean not null default false;
alter table public.users add column if not exists monitoring_dashboard_enabled boolean not null default false;
alter table public.users alter column is_active set default true;
alter table public.users alter column monitoring_dashboard_enabled set default false;
alter table public.users alter column chat_assistant_enabled set default false;

update public.users
set username = lower(split_part(email, '@', 1))
where username is null;

alter table public.users alter column username set not null;

-- For renamed tables, normalize event column to action.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_activity_logs' and column_name = 'event_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_activity_logs' and column_name = 'action'
  ) then
    alter table public.user_activity_logs rename column event_type to action;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_activity_logs' and column_name = 'event_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_activity_logs' and column_name = 'action'
  ) then
    execute 'update public.user_activity_logs set action = coalesce(action, event_type) where action is null';
  end if;
end $$;

alter table public.user_activity_logs add column if not exists action text;
alter table public.user_query_logs add column if not exists query_type text;
alter table public.user_query_logs add column if not exists query_text text;
alter table public.user_presence add column if not exists country_code text not null default 'US';
alter table public.user_presence add column if not exists timezone text;
alter table public.user_presence add column if not exists last_seen_at timestamptz not null default now();

create unique index if not exists idx_users_username_unique on public.users (username);
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_chat_history_user_id on public.chat_history(user_id);
create index if not exists idx_login_events_user_id on public.login_events(user_id);
create index if not exists idx_login_events_created_at on public.login_events(created_at);
create index if not exists idx_user_activity_logs_user_id on public.user_activity_logs(user_id);
create index if not exists idx_user_activity_logs_created_at on public.user_activity_logs(created_at);
create index if not exists idx_user_query_logs_user_id on public.user_query_logs(user_id);
create index if not exists idx_user_query_logs_type on public.user_query_logs(query_type);
create index if not exists idx_user_query_logs_created_at on public.user_query_logs(created_at);
create index if not exists idx_user_presence_last_seen_at on public.user_presence(last_seen_at);
create index if not exists idx_user_presence_country_code on public.user_presence(country_code);
