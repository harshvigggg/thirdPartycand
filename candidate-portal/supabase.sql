-- Run once in the Supabase SQL editor.

create table if not exists submissions (
  id bigint generated always as identity primary key,
  ref text unique not null,
  created_at timestamptz not null default now(),
  full_name text,
  email text,
  phone text,
  data jsonb not null
);

-- No policies: only the server (secret key) can read or write.
alter table submissions enable row level security;

-- Private bucket: PDF/JPG/PNG only, 10 MB max per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-files', 'candidate-files', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
