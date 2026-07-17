-- CoachOS schema for Supabase Postgres.
-- Run in Supabase → SQL Editor (or `supabase db push`).
-- Data rows mirror the FastAPI Pydantic models as jsonb for a 1:1 mapping.
-- The backend uses the service_role key (bypasses RLS). RLS policies below
-- protect any future direct client access so users only touch their own rows.

create table if not exists public.profiles (
  user_id    text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  user_id    text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.signals (
  key        text primary key,           -- "{user_id}:{date}"
  user_id    text not null,
  date       text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition (
  key        text primary key,           -- "{user_id}:{date}"
  user_id    text not null,
  date       text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.skip_history (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  day        text not null,
  title      text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_user on public.signals (user_id);
create index if not exists idx_nutrition_user on public.nutrition (user_id);
create index if not exists idx_decisions_user on public.decisions (user_id, created_at desc);
create index if not exists idx_skip_user on public.skip_history (user_id);

-- Row Level Security ---------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.plans        enable row level security;
alter table public.signals      enable row level security;
alter table public.nutrition    enable row level security;
alter table public.decisions    enable row level security;
alter table public.skip_history enable row level security;

-- Owner-only access for authenticated clients. The service_role key used by the
-- FastAPI backend bypasses these policies automatically.
do $$
declare
  t text;
begin
  foreach t in array array['profiles','plans','signals','nutrition','decisions','skip_history']
  loop
    execute format('drop policy if exists "owner_all_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "owner_all_%1$s" on public.%1$s
         for all
         using (auth.uid()::text = user_id)
         with check (auth.uid()::text = user_id);', t);
  end loop;
end $$;
