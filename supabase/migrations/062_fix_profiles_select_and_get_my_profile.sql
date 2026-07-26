-- ============================================================
-- 062: Fix profiles SELECT for logged-in users + get_my_profile()
--
-- Symptom: SQL Editor shows profiles.role = super_admin, but the app
-- never loads the profile (badge stays missing / free). SQL Editor
-- bypasses RLS; the anon/authenticated client does not.
-- ============================================================

-- Ensure every authenticated user can read profiles (needed for badge/RBAC)
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select
  to authenticated
  using (true);

-- Explicit own-row select (belt and suspenders)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- SECURITY DEFINER loader — always returns the caller's profile even if
-- a future SELECT policy is misconfigured.
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
