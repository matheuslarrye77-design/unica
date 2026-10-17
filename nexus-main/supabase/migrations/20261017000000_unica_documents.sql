-- Stores the mural and the suggestions as complete documents.
-- Does not delete existing rows. The server reads and writes these
-- documents with the same secret key used for authentication.
-- Row level security stays enabled. The browser has no access.

create table if not exists public.unica_documents (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.unica_documents enable row level security;

revoke all on table public.unica_documents from anon, authenticated;
