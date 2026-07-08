-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 044: Enable CASCADE Deletion for Projects
-- 
-- Description:
--   Changes foreign key constraints from ON DELETE SET NULL to ON DELETE CASCADE
--   so that when a project is deleted, ALL associated data is permanently removed.
--
-- Affected Tables:
--   - weekly_reports (QA Report History)
--   - daily_support_logs (Support & Exception Logs)
--   - daily_release_testing_status (Release Testing Logs)
--   - project_members (already CASCADE - keeping as is)
--
-- Impact:
--   DELETE FROM projects WHERE id = '<project-id>' will now:
--   ✅ Delete the project record
--   ✅ Delete all project members (already working)
--   ✅ Delete all QA weekly reports
--   ✅ Delete all daily support logs
--   ✅ Delete all daily release testing status records
--   ⚠️  This is PERMANENT and IRREVERSIBLE
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Update weekly_reports to CASCADE delete
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint
ALTER TABLE public.weekly_reports 
  DROP CONSTRAINT IF EXISTS weekly_reports_project_id_fkey;

-- Add new constraint with CASCADE
ALTER TABLE public.weekly_reports 
  ADD CONSTRAINT weekly_reports_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT weekly_reports_project_id_fkey ON public.weekly_reports IS 
  'Cascade delete: When a project is deleted, all associated weekly reports are permanently deleted';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Update daily_support_logs to CASCADE delete
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint
ALTER TABLE public.daily_support_logs 
  DROP CONSTRAINT IF EXISTS daily_support_logs_project_id_fkey;

-- Add new constraint with CASCADE
ALTER TABLE public.daily_support_logs 
  ADD CONSTRAINT daily_support_logs_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT daily_support_logs_project_id_fkey ON public.daily_support_logs IS 
  'Cascade delete: When a project is deleted, all associated support logs are permanently deleted';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Update daily_release_testing_status to CASCADE delete
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint
ALTER TABLE public.daily_release_testing_status 
  DROP CONSTRAINT IF EXISTS daily_release_testing_status_project_id_fkey;

-- Add new constraint with CASCADE
ALTER TABLE public.daily_release_testing_status 
  ADD CONSTRAINT daily_release_testing_status_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT daily_release_testing_status_project_id_fkey ON public.daily_release_testing_status IS 
  'Cascade delete: When a project is deleted, all associated release testing records are permanently deleted';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Verification Query (commented out - for manual testing)
-- ══════════════════════════════════════════════════════════════════════════════

/*
-- Verify CASCADE constraints are in place
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ Will delete associated data'
    WHEN 'SET NULL' THEN '⚠️  Will keep data (orphaned)'
    WHEN 'RESTRICT' THEN '🛡️  Will prevent deletion'
    ELSE rc.delete_rule
  END AS behavior
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'projects'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Expected results:
-- weekly_reports → CASCADE
-- daily_support_logs → CASCADE
-- daily_release_testing_status → CASCADE
-- project_members → CASCADE
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Add audit log function (optional - for tracking deletions)
-- ══════════════════════════════════════════════════════════════════════════════

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  project_code TEXT,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associated_data_counts JSONB DEFAULT '{}', -- Store counts of deleted records
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE public.project_deletion_audit IS 
  'Audit trail for deleted projects. Records project information before permanent deletion.';

-- Create trigger function to log deletions
CREATE OR REPLACE FUNCTION public.log_project_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert audit record before deletion
  INSERT INTO public.project_deletion_audit (
    project_id,
    project_name,
    project_code,
    deleted_by,
    associated_data_counts,
    metadata
  )
  SELECT
    OLD.id,
    OLD.name,
    OLD.project_code,
    auth.uid(),
    jsonb_build_object(
      'members', (SELECT COUNT(*) FROM project_members WHERE project_id = OLD.id),
      'weekly_reports', (SELECT COUNT(*) FROM weekly_reports WHERE project_id = OLD.id),
      'support_logs', (SELECT COUNT(*) FROM daily_support_logs WHERE project_id = OLD.id),
      'testing_status', (SELECT COUNT(*) FROM daily_release_testing_status WHERE project_id = OLD.id)
    ),
    jsonb_build_object(
      'status', OLD.status,
      'created_at', OLD.created_at,
      'created_by', OLD.created_by,
      'tags', OLD.tags
    );
  
  RETURN OLD;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS projects_deletion_audit ON public.projects;
CREATE TRIGGER projects_deletion_audit
  BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_deletion();

COMMENT ON TRIGGER projects_deletion_audit ON public.projects IS 
  'Logs project deletion details before CASCADE delete removes all associated data';

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Grant appropriate permissions
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on audit table
ALTER TABLE public.project_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion audit
DROP POLICY IF EXISTS "project_deletion_audit_select" ON public.project_deletion_audit;
CREATE POLICY "project_deletion_audit_select" ON public.project_deletion_audit 
  FOR SELECT USING (public.is_admin());

-- System can insert audit records
DROP POLICY IF EXISTS "project_deletion_audit_insert" ON public.project_deletion_audit;
CREATE POLICY "project_deletion_audit_insert" ON public.project_deletion_audit 
  FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ══════════════════════════════════════════════════════════════════════════════

/*
SUMMARY:
  ✅ weekly_reports → CASCADE DELETE enabled
  ✅ daily_support_logs → CASCADE DELETE enabled
  ✅ daily_release_testing_status → CASCADE DELETE enabled
  ✅ project_members → Already CASCADE (no change)
  ✅ Deletion audit logging enabled
  
BEHAVIOR:
  When a project is deleted:
  1. Audit record is created (before deletion)
  2. Project record is deleted
  3. CASCADE automatically deletes:
     - All project members
     - All weekly reports
     - All support logs
     - All testing status records
  4. No orphaned data remains
  
WARNING:
  This is PERMANENT and IRREVERSIBLE.
  Make sure your application has proper confirmation dialogs!
*/
