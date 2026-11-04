-- Migration: Fix StoryPot RLS policies for managers
-- Issue: Managers with module access couldn't see filters because sync_status RLS was too restrictive

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view sync status for their projects" ON openproject_sync_status;
DROP POLICY IF EXISTS "Users can view cached work packages for their projects" ON openproject_work_packages_cache;

-- Recreate with admin/manager bypass
CREATE POLICY "Users can view sync status for their projects"
  ON openproject_sync_status
  FOR SELECT
  USING (
    -- Admins and managers can view all
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin', 'manager')
    )
    OR
    -- Project members can view their projects
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_sync_status.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view cached work packages for their projects"
  ON openproject_work_packages_cache
  FOR SELECT
  USING (
    -- Admins and managers can view all
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin', 'manager')
    )
    OR
    -- Project members can view their projects
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_work_packages_cache.project_id
        AND pm.user_id = auth.uid()
    )
  );
