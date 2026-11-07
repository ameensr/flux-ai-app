-- ============================================================================
-- Migration: 102_sync_job_tracking.sql
-- Description: Background synchronization job tracking for non-blocking sync
-- ============================================================================

-- Create sync job tracking table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  
  -- Job status
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  
  -- Progress tracking
  phase TEXT,
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_message TEXT,
  
  -- Results
  result_summary JSONB,
  error_message TEXT,
  
  -- Metadata
  op_project_id INTEGER,
  op_project_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient job queries
CREATE INDEX IF NOT EXISTS idx_sync_jobs_project_status ON sync_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_created ON sync_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_updated ON sync_jobs(status, updated_at DESC);

-- Enable RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sync jobs for their accessible projects
DROP POLICY IF EXISTS "Users can view sync jobs" ON sync_jobs;
CREATE POLICY "Users can view sync jobs"
  ON sync_jobs FOR SELECT
  USING (
    -- Admin/manager can see all
    EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin', 'manager'))
    OR
    -- Project members can see jobs for their projects
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sync_jobs.project_id AND pm.user_id = auth.uid())
  );

-- Policy: Users can create sync jobs for projects they can sync
DROP POLICY IF EXISTS "Users can create sync jobs" ON sync_jobs;
CREATE POLICY "Users can create sync jobs"
  ON sync_jobs FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- Must be for current user
    user_id = auth.uid()
    AND
    -- Must have sync permission on the project:
    -- Either global admin/manager OR project member with owner/lead role
    (
      -- Global admins and managers can sync any project
      EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin', 'manager'))
      OR
      -- Project members (owner or lead) can sync their project
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = sync_jobs.project_id
        AND pm.user_id = auth.uid()
        AND pm.project_role IN ('owner', 'lead')
      )
    )
  );

-- Policy: Users can update their own sync jobs
DROP POLICY IF EXISTS "Users can update sync jobs" ON sync_jobs;
CREATE POLICY "Users can update sync jobs"
  ON sync_jobs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sync_jobs TO authenticated;

-- Function to get active sync job for a project
CREATE OR REPLACE FUNCTION get_active_sync_job(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  op_project_id INTEGER,
  op_project_name TEXT,
  status TEXT,
  phase TEXT,
  progress_current INTEGER,
  progress_total INTEGER,
  progress_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result_summary JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to this project
  IF NOT (
    EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    sync_jobs.id,
    sync_jobs.project_id,
    sync_jobs.op_project_id,
    sync_jobs.op_project_name,
    sync_jobs.status,
    sync_jobs.phase,
    sync_jobs.progress_current,
    sync_jobs.progress_total,
    sync_jobs.progress_message,
    sync_jobs.started_at,
    sync_jobs.completed_at,
    sync_jobs.error_message,
    sync_jobs.result_summary,
    sync_jobs.created_at,
    sync_jobs.updated_at
  FROM sync_jobs
  WHERE sync_jobs.project_id = p_project_id
    AND sync_jobs.status IN ('pending', 'running')
  ORDER BY sync_jobs.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_sync_job TO authenticated;

-- Function to cancel a sync job
CREATE OR REPLACE FUNCTION cancel_sync_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns this job
  IF NOT EXISTS (SELECT 1 FROM sync_jobs WHERE id = p_job_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access denied');
  END IF;

  -- Update job status to cancelled
  UPDATE sync_jobs
  SET
    status = 'cancelled',
    updated_at = NOW(),
    completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE completed_at END
  WHERE id = p_job_id
    AND status IN ('pending', 'running');

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Job cancelled successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Job not found or already completed');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_sync_job TO authenticated;

-- Add comment
COMMENT ON TABLE sync_jobs IS 'Background synchronization job tracking for non-blocking OpenProject sync';
COMMENT ON COLUMN sync_jobs.status IS 'Job status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN sync_jobs.phase IS 'Current sync phase for progress tracking';
COMMENT ON CONSTRAINT sync_jobs_unique_running ON sync_jobs IS 'Prevent multiple concurrent sync jobs for the same project';

