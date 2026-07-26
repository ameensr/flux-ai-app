-- ============================================================
-- 063: Restore table privileges for authenticated (PostgREST)
--
-- Error seen in app: "permission denied for table role_module_permissions"
-- That is a PostgreSQL GRANT issue (not RLS). RLS policies alone are not
-- enough — the role still needs SELECT/INSERT/UPDATE/DELETE on the table.
-- ============================================================

-- Core RBAC (Role Management / Permission Templates)
GRANT SELECT ON TABLE
  public.roles,
  public.modules,
  public.permissions,
  public.role_module_permissions
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.roles,
  public.modules,
  public.permissions,
  public.role_module_permissions
TO authenticated;

-- Profiles + common app tables used by modules (skip if missing)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'projects',
    'project_members',
    'weekly_reports',
    'announcements',
    'announcement_reads',
    'announcement_acknowledgements',
    'login_events',
    'audit_logs',
    'maintenance_config',
    'ai_provider_configs',
    'ai_usage_logs',
    'ai_module_prompts',
    'permission_templates',
    'daily_support_logs',
    'daily_release_testing_status',
    'daily_report_dropdown_configs',
    'daily_report_custom_columns',
    'daily_report_custom_field_values',
    'daily_report_column_configs',
    'departments',
    'plans'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Sequences used by inserts (if any identity/serial cols exist)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure public RPC wrappers can read the matrix even if grants drift again
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

-- Keep SELECT policies usable by authenticated (idempotent)
DROP POLICY IF EXISTS "rmp_read_all" ON public.role_module_permissions;
CREATE POLICY "rmp_read_all" ON public.role_module_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
CREATE POLICY "roles_read_all" ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "modules_read_all" ON public.modules;
CREATE POLICY "modules_read_all" ON public.modules
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;
CREATE POLICY "permissions_read_all" ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow super_admin to manage modules/permissions (was admin-only)
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
