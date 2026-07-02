-- ============================================================
-- 011: Fix recursive RLS on profiles — restore admin access
-- ============================================================

-- Step 1: Drop all policies we added that may be causing recursion
drop policy if exists "profiles_admin_read"             on public.profiles;
drop policy if exists "profiles_admin_update"           on public.profiles;
drop policy if exists "profiles_admin_delete"           on public.profiles;
drop policy if exists "profiles_read_authenticated"     on public.profiles;
drop policy if exists "profiles_self_update"            on public.profiles;
drop policy if exists "profiles_admin_update_by_service" on public.profiles;

-- Step 2: Create a SECURITY DEFINER helper that checks role
-- without triggering RLS (avoids infinite recursion)
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

grant execute on function public.get_my_role() to authenticated, anon;

-- Step 3: Re-create safe non-recursive policies

-- All authenticated users can read all profiles (no sensitive secrets here)
create policy "profiles_read_authenticated" on public.profiles
  for select
  using ( auth.role() = 'authenticated' );

-- Users can insert their own profile (signup trigger)
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert
  with check ( auth.uid() = id );

-- Users can update their own profile
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- Admins can update ANY profile (uses security definer fn — no recursion)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update
  using ( public.get_my_role() in ('admin', 'super_admin') )
  with check ( public.get_my_role() in ('admin', 'super_admin') );

-- Admins can delete any profile
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
  for delete
  using ( public.get_my_role() in ('admin', 'super_admin') );
