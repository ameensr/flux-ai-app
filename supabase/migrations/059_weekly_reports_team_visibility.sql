-- Migration 059: Enable team-based visibility for weekly_reports
-- Allow managers and team members to see each other's reports within same project/team
-- Created: 2026-07-22
-- Purpose: Fix visibility issue where QA Managers cannot see QA Lead reports

-- ============================================================================
-- Step 1: Add project_id column if it doesn't exist
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'weekly_reports' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.weekly_reports 
    ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_id 
    ON public.weekly_reports(project_id);
    
    COMMENT ON COLUMN public.weekly_reports.project_id IS 'Foreign key to projects table for team-based visibility';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Drop old restrictive policies
-- ============================================================================
DROP POLICY IF EXISTS "weekly_reports_select_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_insert_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_update_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_delete_own" ON public.weekly_reports;

-- ============================================================================
-- Step 3: SELECT POLICY - Team-based visibility
-- ============================================================================
-- Users can see reports from:
-- 1. Their own reports (always)
-- 2. Reports from team members in same projects (if they're a manager/qa_lead)
-- 3. All reports (if they're admin/super_admin)
CREATE POLICY "weekly_reports_select_team" ON public.weekly_reports
  FOR SELECT USING (
    -- Rule 1: Own reports
    auth.uid() = user_id
    
    OR
    
    -- Rule 2: Manager/QA Lead can see reports from team members in shared projects
    (
      -- User is a manager or qa_lead
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'qa_lead')
      )
      AND
      -- Both users are members of at least one shared project
      EXISTS (
        SELECT 1 FROM public.project_members pm1
        INNER JOIN public.project_members pm2 
          ON pm1.project_id = pm2.project_id
        WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = weekly_reports.user_id
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

-- ============================================================================
-- Step 4: INSERT POLICY - Users can only create their own reports
-- ============================================================================
CREATE POLICY "weekly_reports_insert_own" ON public.weekly_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Step 5: UPDATE POLICY - Own reports OR managers can update team reports
-- ============================================================================
CREATE POLICY "weekly_reports_update_team" ON public.weekly_reports
  FOR UPDATE USING (
    -- Own reports
    auth.uid() = user_id
    
    OR
    
    -- Managers and admins can update any report
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- Step 6: DELETE POLICY - Own reports OR managers/admins can delete team reports
-- ============================================================================
CREATE POLICY "weekly_reports_delete_team" ON public.weekly_reports
  FOR DELETE USING (
    -- Own reports
    auth.uid() = user_id
    
    OR
    
    -- Managers and admins can delete any report
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- Step 7: Add helpful comments
-- ============================================================================
COMMENT ON TABLE public.weekly_reports IS 'QA Weekly Reports with team-based visibility. Managers and QA Leads can see reports from team members in shared projects.';

COMMENT ON POLICY "weekly_reports_select_team" ON public.weekly_reports IS 'Users can see: their own reports, team reports from shared projects (if manager/qa_lead), or all reports (if admin)';

COMMENT ON POLICY "weekly_reports_update_team" ON public.weekly_reports IS 'Users can update their own reports. Managers and admins can update any report.';

COMMENT ON POLICY "weekly_reports_delete_team" ON public.weekly_reports IS 'Users can delete their own reports. Managers and admins can delete any report.';

