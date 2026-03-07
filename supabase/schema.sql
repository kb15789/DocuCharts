-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  password_hash text not null,
  chat_assistant_enabled boolean not null default true,
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

-- Idempotent migration support for existing projects.
alter table public.documents add column if not exists file_type text;
alter table public.documents add column if not exists parse_status text;
alter table public.documents add column if not exists row_count int not null default 0;
alter table public.documents add column if not exists parsed_columns jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists parsed_rows jsonb not null default '[]'::jsonb;
alter table public.chat_history add column if not exists document_ids uuid[] not null default '{}'::uuid[];
alter table public.users add column if not exists chat_assistant_enabled boolean not null default true;

create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_chat_history_user_id on public.chat_history(user_id);
