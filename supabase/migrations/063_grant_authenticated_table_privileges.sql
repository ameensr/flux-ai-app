-- ============================================================
-- 063: Restore table privileges for authenticated (PostgREST)
--
-- Errors like:
--   permission denied for table role_module_permissions
--   permission denied for table departments
-- are PostgreSQL GRANT issues (not RLS). Run this on every
-- environment (Testing / Staging / Prod) after schema apply.
-- ============================================================

-- Grant DML on EVERY public table to authenticated (RLS still enforces access)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      r.tablename
    );
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Future tables created by postgres/supabase_admin inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Make permission RPC reliable (SECURITY DEFINER bypasses table-grant drift)
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_key text)
RETURNS TABLE(module_key text, permission_key text, is_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.module_key,
    p.permission_key,
    rmp.is_enabled
  FROM public.role_module_permissions rmp
  JOIN public.roles       r ON r.id = rmp.role_id
  JOIN public.modules     m ON m.id = rmp.module_id
  JOIN public.permissions p ON p.id = rmp.permission_id
  WHERE r.role_key = p_role_key;
$$;

REVOKE ALL ON FUNCTION public.get_role_permissions(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_permissions(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(text) TO authenticated;

-- Ensure get_my_profile exists (badge / session load)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Widen admin write policies that were admin-only (exclude super_admin)
DROP POLICY IF EXISTS "modules_admin_write" ON public.modules;
CREATE POLICY "modules_admin_write" ON public.modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "permissions_admin_write" ON public.permissions;
CREATE POLICY "permissions_admin_write" ON public.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
