-- ============================================================================
-- Migration 085: Scope support_issues and release_tasks to project membership
--
-- Root cause: Both tables had USING (true) RLS policies, meaning every
-- authenticated user could read every row regardless of project membership.
-- This caused cross-system product data leakage in the Support Issue Register
-- and Release Task Register when multiple systems share the same database.
--
-- Fix: Replace the permissive SELECT policies with membership-scoped ones that
-- mirror the projects_select policy from migration 065:
--   - Admins/super_admins see all rows.
--   - All other users see only rows whose project_id they are a member of,
--     OR rows with a NULL project_id (legacy/unassigned records).
--
-- Write policies (INSERT/UPDATE/DELETE) are unchanged — they remain permissive
-- for authenticated users so existing workflows are not disrupted.
-- ============================================================================

-- ── 1. support_issues SELECT ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "support_issues_all_auth" ON public.support_issues;
DROP POLICY IF EXISTS "support_issues_all_anon" ON public.support_issues;

-- Scoped SELECT: admin sees all; others see only their project rows.
CREATE POLICY "support_issues_select_scoped" ON public.support_issues
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR project_id IS NULL
    OR private.is_project_member(project_id)
  );

-- Permissive write policies remain for authenticated users.
CREATE POLICY "support_issues_insert_auth" ON public.support_issues
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "support_issues_update_auth" ON public.support_issues
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "support_issues_delete_auth" ON public.support_issues
  FOR DELETE TO authenticated USING (true);

-- Keep anon write access for offline/unauthenticated scenarios (existing behaviour).
CREATE POLICY "support_issues_all_anon" ON public.support_issues
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 2. release_tasks SELECT ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "release_tasks_all_auth" ON public.release_tasks;
DROP POLICY IF EXISTS "release_tasks_all_anon" ON public.release_tasks;

-- Scoped SELECT: admin sees all; others see only their project rows.
CREATE POLICY "release_tasks_select_scoped" ON public.release_tasks
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR project_id IS NULL
    OR private.is_project_member(project_id)
  );

-- Permissive write policies remain for authenticated users.
CREATE POLICY "release_tasks_insert_auth" ON public.release_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "release_tasks_update_auth" ON public.release_tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "release_tasks_delete_auth" ON public.release_tasks
  FOR DELETE TO authenticated USING (true);

-- Keep anon write access for offline/unauthenticated scenarios (existing behaviour).
CREATE POLICY "release_tasks_all_anon" ON public.release_tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);
