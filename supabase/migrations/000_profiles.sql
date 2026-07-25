-- ============================================================
-- 000: Base profiles table
--
-- Historically created in the Supabase dashboard (not by a numbered
-- migration). Early migrations (001+) reference public.profiles in RLS
-- policies, so local `supabase start` / `db reset` need this first.
--
-- Later migrations extend this table:
--   008  employee_id, department_id, plan_id, status, last_login_at, avatar_url
--   012  widen profiles_role_check for enterprise roles
--   025  phone
--   031  team_id
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'free',
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('free', 'pro', 'admin'))
);

create index if not exists idx_profiles_email on public.profiles (email);

alter table public.profiles enable row level security;

-- Minimal policies so signup / self-service work before 010/011 refine them.
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
