-- ============================================================
-- 012: Widen profiles.role check constraint to include all
--      enterprise roles added in migration 008.
-- ============================================================

-- Drop the old constraint that only allowed free|pro|admin
alter table public.profiles
  drop constraint if exists profiles_role_check;

-- Re-add with all current role_key values
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'free', 'pro', 'admin',
    'super_admin', 'manager', 'qa_lead', 'qa_engineer',
    'developer', 'standard', 'guest'
  ));
