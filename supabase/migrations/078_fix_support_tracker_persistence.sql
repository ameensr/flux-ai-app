-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 078: Fix Support Tracker Permissions & Foreign Key Constraints
-- 
-- Fixes persistence across browser refreshes:
-- 1. Grants DML permissions on support tracker tables to authenticated, anon, and service_role.
-- 2. Relaxes project_id foreign key constraint to support custom/sample projects gracefully.
-- 3. Ensures RLS policies allow authenticated and anon access.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Grant table privileges
GRANT ALL ON TABLE public.support_issues TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_history TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_dropdown_configs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_time_logs TO authenticated, anon, service_role;

-- 2. Relax project_id foreign key constraint and not-null requirement
ALTER TABLE public.support_issues DROP CONSTRAINT IF EXISTS support_issues_project_id_fkey;
ALTER TABLE public.support_issues ALTER COLUMN project_id DROP NOT NULL;

-- 3. Update RLS policies to be fully permissive for all app roles
DO $$
BEGIN
  DROP POLICY IF EXISTS "support_issues_all_auth" ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_all_anon" ON public.support_issues;
  CREATE POLICY "support_issues_all_auth" ON public.support_issues
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "support_issues_all_anon" ON public.support_issues
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_history_all_auth" ON public.support_issue_history;
  DROP POLICY IF EXISTS "support_history_all_anon" ON public.support_issue_history;
  CREATE POLICY "support_history_all_auth" ON public.support_issue_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "support_history_all_anon" ON public.support_issue_history
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_dropdown_all_auth" ON public.support_issue_dropdown_configs;
  DROP POLICY IF EXISTS "support_dropdown_all_anon" ON public.support_issue_dropdown_configs;
  CREATE POLICY "support_dropdown_all_auth" ON public.support_issue_dropdown_configs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "support_dropdown_all_anon" ON public.support_issue_dropdown_configs
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_time_logs_all_auth" ON public.support_issue_time_logs;
  DROP POLICY IF EXISTS "support_time_logs_all_anon" ON public.support_issue_time_logs;
  CREATE POLICY "support_time_logs_all_auth" ON public.support_issue_time_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "support_time_logs_all_anon" ON public.support_issue_time_logs
    FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
