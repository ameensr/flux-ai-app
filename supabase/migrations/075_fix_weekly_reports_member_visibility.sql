-- Migration 075: Fix weekly_reports visibility for project members
-- Issue: Regular 'member' users who belong to a project cannot see
--        that project's report history entries (only admin/manager/qa_lead could).
-- Fix:   Allow ANY project member to see reports scoped to their shared project.

-- Drop the restrictive policy from migration 059
DROP POLICY IF EXISTS "weekly_reports_select_team" ON public.weekly_reports;

-- New SELECT policy: any project member can see reports for projects they belong to
CREATE POLICY "weekly_reports_select_team" ON public.weekly_reports
  FOR SELECT USING (
    -- Rule 1: Own reports (always visible)
    auth.uid() = user_id

    OR

    -- Rule 2: Any member of the same project can see the report
    (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.project_id = weekly_reports.project_id
      )
    )

    OR

    -- Rule 3: Admins see everything
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON POLICY "weekly_reports_select_team" ON public.weekly_reports
  IS 'Users can see: their own reports, any report belonging to a project they are a member of, or all reports (if admin/super_admin).';
