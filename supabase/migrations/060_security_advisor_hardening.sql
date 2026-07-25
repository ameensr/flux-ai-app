-- ============================================================
-- 060: Security Advisor hardening
--
-- Addresses Supabase Database Linter warnings:
--   - function_search_path_mutable
--   - anon_security_definer_function_executable
--   - authenticated_security_definer_function_executable (triggers)
--   - rls_policy_always_true (audit insert policies)
--
-- Intentional remaining pattern:
--   SECURITY DEFINER helpers used in RLS / app RPC stay executable
--   by authenticated (and service_role where needed). anon is revoked.
-- ============================================================

-- ── 1. Pin search_path on all flagged functions ─────────────────────────────

ALTER FUNCTION public.can_edit_in_project(uuid) SET search_path = public;
ALTER FUNCTION public.can_modify_project_member_role(uuid, text) SET search_path = public;
ALTER FUNCTION public.can_remove_project_member(uuid) SET search_path = public;
ALTER FUNCTION public.check_module_permission(text, text, text) SET search_path = public;
ALTER FUNCTION public.get_my_role() SET search_path = public;
ALTER FUNCTION public.get_role_permissions(text) SET search_path = public;
ALTER FUNCTION public.get_user_project_role(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_project_manager() SET search_path = public;
ALTER FUNCTION public.is_project_member(uuid) SET search_path = public;
ALTER FUNCTION public.is_project_owner(uuid) SET search_path = public;
ALTER FUNCTION public.is_project_owner_or_lead(uuid) SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.log_project_deletion() SET search_path = public;
ALTER FUNCTION public.my_org_id() SET search_path = public;
ALTER FUNCTION public.prevent_last_owner_deletion() SET search_path = public;
ALTER FUNCTION public.prevent_last_owner_role_change() SET search_path = public;
ALTER FUNCTION public.set_announcement_author() SET search_path = public;
ALTER FUNCTION public.set_projects_updated_at() SET search_path = public;
ALTER FUNCTION public.set_teams_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_announcements_updated_at() SET search_path = public;
ALTER FUNCTION public.update_team_capacity_updated_at() SET search_path = public;

-- ── 2. Revoke broad EXECUTE; re-grant only where intentional ────────────────

-- Default PUBLIC execute is the main source of anon exposure
REVOKE ALL ON FUNCTION public.can_edit_in_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_modify_project_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_remove_project_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_module_permission(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_role_permissions(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_project_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_manager() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_owner_or_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_project_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_last_owner_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_last_owner_role_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_announcement_author() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_projects_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_teams_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_announcements_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_team_capacity_updated_at() FROM PUBLIC;

-- Explicitly block anonymous RPC access
REVOKE EXECUTE ON FUNCTION public.can_edit_in_project(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_modify_project_member_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_remove_project_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_module_permission(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_role_permissions(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_project_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_owner_or_lead(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_project_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_org_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_last_owner_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_last_owner_role_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_announcement_author() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_projects_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_teams_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_announcements_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_team_capacity_updated_at() FROM anon;

-- Trigger-only / internal definer functions: not callable via PostgREST RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_deletion() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_owner_deletion() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_owner_role_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_announcement_author() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_projects_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_teams_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_announcements_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_team_capacity_updated_at() FROM authenticated;

-- RLS helpers + intentional app/edge RPCs
GRANT EXECUTE ON FUNCTION public.can_edit_in_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_project_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_remove_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_module_permission(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_project_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner_or_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_org_id() TO authenticated;

-- ── 3. Tighten overly permissive audit INSERT policies ─────────────────────

DROP POLICY IF EXISTS "audit_service_insert" ON public.audit_logs;
CREATE POLICY "audit_service_insert" ON public.audit_logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Inserts come from SECURITY DEFINER trigger log_project_deletion (bypasses RLS)
DROP POLICY IF EXISTS "project_deletion_audit_insert" ON public.project_deletion_audit;
CREATE POLICY "project_deletion_audit_insert" ON public.project_deletion_audit
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_admin()
    OR public.is_super_admin()
  );
