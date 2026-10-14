-- Única authentication.
-- Creates empty tables for users and sessions.
-- Does not insert users, does not change passwords, and does not delete data.
--
-- Server environment variables, set only on the Vercel server
-- (Production, Preview, and Development). Never use a VITE_ prefix.
--   SUPABASE_URL                  Project URL from Supabase Settings > API.
--   SUPABASE_SECRET_KEY           Secret key starting with sb_secret_.
--                                 The legacy SUPABASE_SERVICE_ROLE_KEY is still accepted.
-- The service_role key bypasses row level security and must not be shipped
-- to the browser.

create table if not exists public.unica_users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null,
  department text not null default '',
  avatar text not null default '',
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.unica_sessions (
  token_hash text primary key,
  user_id text not null references public.unica_users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists unica_sessions_user_id_idx on public.unica_sessions (user_id);
create index if not exists unica_sessions_expires_at_idx on public.unica_sessions (expires_at);

alter table public.unica_users enable row level security;
alter table public.unica_sessions enable row level security;

revoke all on table public.unica_users from anon, authenticated;
revoke all on table public.unica_sessions from anon, authenticated;
