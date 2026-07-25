-- ============================================================
-- 061: Move SECURITY DEFINER helpers out of PostgREST API
--
-- Clears lint 0029 (authenticated_security_definer_function_executable)
-- by relocating helpers to schema `private` (not API-exposed).
--
-- RLS policies keep working (same function OIDs).
-- App/edge RPCs keep working via thin SECURITY INVOKER wrappers
-- for get_role_permissions + check_module_permission only.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, authenticated, service_role;

-- Move definer helpers out of the exposed `public` API schema
ALTER FUNCTION public.can_edit_in_project(uuid) SET SCHEMA private;
ALTER FUNCTION public.can_modify_project_member_role(uuid, text) SET SCHEMA private;
ALTER FUNCTION public.can_remove_project_member(uuid) SET SCHEMA private;
ALTER FUNCTION public.check_module_permission(text, text, text) SET SCHEMA private;
ALTER FUNCTION public.get_my_role() SET SCHEMA private;
ALTER FUNCTION public.get_role_permissions(text) SET SCHEMA private;
ALTER FUNCTION public.get_user_project_role(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_admin() SET SCHEMA private;
ALTER FUNCTION public.is_project_manager() SET SCHEMA private;
ALTER FUNCTION public.is_project_member(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_project_owner(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_project_owner_or_lead(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_super_admin() SET SCHEMA private;
ALTER FUNCTION public.my_org_id() SET SCHEMA private;

-- Ensure authenticated can still execute helpers used inside RLS
GRANT EXECUTE ON FUNCTION private.can_edit_in_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_modify_project_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_remove_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.check_module_permission(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_role_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_project_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_owner_or_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.my_org_id() TO authenticated;

-- Public INVOKER wrappers for intentional RPC entry points only
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_key text)
RETURNS TABLE(module_key text, permission_key text, is_enabled boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT g.module_key, g.permission_key, g.is_enabled
  FROM private.get_role_permissions(p_role_key) AS g;
$$;

CREATE OR REPLACE FUNCTION public.check_module_permission(
  p_role_key text,
  p_module_key text,
  p_permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.check_module_permission(p_role_key, p_module_key, p_permission_key);
$$;

REVOKE ALL ON FUNCTION public.get_role_permissions(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_module_permission(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_permissions(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_module_permission(text, text, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_role_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_module_permission(text, text, text) TO authenticated, service_role;

-- Keep policy expressions readable for future migrations
COMMENT ON SCHEMA private IS
  'Internal SECURITY DEFINER helpers. Not exposed via PostgREST. Used by RLS and public INVOKER RPC wrappers.';
