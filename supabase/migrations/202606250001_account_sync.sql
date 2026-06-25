-- Spanish Learning Center account and sync schema.
-- Run this in the Supabase SQL editor or through Supabase CLI after creating the project.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_data_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null check (
    namespace in (
      'settings',
      'training_preferences',
      'learning_progress',
      'mistakes',
      'favorites',
      'test_history',
      'recent_learning',
      'neural_state'
    )
  ),
  schema_version integer not null default 1,
  revision bigint not null default 1,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace)
);

alter table public.profiles enable row level security;
alter table public.user_data_documents enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_data_documents_select_own" on public.user_data_documents;
drop policy if exists "user_data_documents_insert_own" on public.user_data_documents;
drop policy if exists "user_data_documents_update_own" on public.user_data_documents;
drop policy if exists "user_data_documents_delete_own" on public.user_data_documents;

create policy "user_data_documents_select_own"
  on public.user_data_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_data_documents_insert_own"
  on public.user_data_documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_data_documents_update_own"
  on public.user_data_documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_data_documents_delete_own"
  on public.user_data_documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_data_documents_set_updated_at on public.user_data_documents;
create trigger user_data_documents_set_updated_at
  before update on public.user_data_documents
  for each row
  execute function public.set_updated_at();
