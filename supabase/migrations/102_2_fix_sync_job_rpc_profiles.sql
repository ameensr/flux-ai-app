-- ============================================================================
-- Migration: 102.2 - Fix sync_jobs RPC to use correct table name
-- Description: Fix reference to 'profiles' table (was incorrectly 'user_profiles')
-- ============================================================================

-- Drop and recreate get_active_sync_job with correct table reference
DROP FUNCTION IF EXISTS get_active_sync_job(UUID);

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
  -- Using 'profiles' table (not 'user_profiles')
  IF NOT (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    sj.id,
    sj.project_id,
    sj.op_project_id,
    sj.op_project_name,
    sj.status,
    sj.phase,
    sj.progress_current,
    sj.progress_total,
    sj.progress_message,
    sj.started_at,
    sj.completed_at,
    sj.error_message,
    sj.result_summary,
    sj.created_at,
    sj.updated_at
  FROM sync_jobs sj
  WHERE sj.project_id = p_project_id
    AND sj.status IN ('pending', 'running')
  ORDER BY sj.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_sync_job TO authenticated;

-- Also fix cancel_sync_job to use correct table reference
DROP FUNCTION IF EXISTS cancel_sync_job(UUID);

CREATE OR REPLACE FUNCTION cancel_sync_job(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user owns this job or is admin
  IF NOT EXISTS (
    SELECT 1 FROM sync_jobs sj 
    WHERE sj.id = p_job_id 
    AND (
      sj.user_id = v_user_id
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_user_id AND p.role IN ('admin', 'super_admin'))
    )
  ) THEN
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

-- Add a function to clean up stuck jobs (jobs running for more than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_stuck_sync_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE sync_jobs
  SET
    status = 'failed',
    error_message = 'Job timed out (stuck for more than 30 minutes)',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE status IN ('pending', 'running')
    AND created_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_stuck_sync_jobs TO authenticated;

COMMENT ON FUNCTION get_active_sync_job IS 'Returns the active sync job for a project (running or pending)';
COMMENT ON FUNCTION cancel_sync_job IS 'Cancels an active sync job owned by the current user or admin';
COMMENT ON FUNCTION cleanup_stuck_sync_jobs IS 'Cleans up sync jobs that have been running for more than 30 minutes';
