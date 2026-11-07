-- ============================================================================
-- Migration: 102.1 - Fix sync_jobs RPC functions
-- Description: Fix column naming conflicts and update schema
-- ============================================================================

-- 1. Drop and recreate get_active_sync_job with correct return columns
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
  IF NOT (
    EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager'))
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

-- 2. Update cancel_sync_job to return JSONB
DROP FUNCTION IF EXISTS cancel_sync_job(UUID);

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

-- 3. Rename columns in sync_jobs table if needed (safe migration)
DO $$
BEGIN
  -- Rename current_count to progress_current
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_jobs' AND column_name = 'current_count'
  ) THEN
    ALTER TABLE sync_jobs RENAME COLUMN current_count TO progress_current;
  END IF;
  
  -- Rename total_count to progress_total
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_jobs' AND column_name = 'total_count'
  ) THEN
    ALTER TABLE sync_jobs RENAME COLUMN total_count TO progress_total;
  END IF;
  
  -- Add result_summary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_jobs' AND column_name = 'result_summary'
  ) THEN
    ALTER TABLE sync_jobs ADD COLUMN result_summary JSONB;
  END IF;
  
  -- Drop total_synced and events_found if they exist (replaced by result_summary)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_jobs' AND column_name = 'total_synced'
  ) THEN
    ALTER TABLE sync_jobs DROP COLUMN total_synced;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_jobs' AND column_name = 'events_found'
  ) THEN
    ALTER TABLE sync_jobs DROP COLUMN events_found;
  END IF;
  
  -- Add default for user_id if it doesn't have one
  ALTER TABLE sync_jobs ALTER COLUMN user_id SET DEFAULT auth.uid();
END $$;

COMMENT ON FUNCTION get_active_sync_job IS 'Returns the active sync job for a project (running or pending)';
COMMENT ON FUNCTION cancel_sync_job IS 'Cancels an active sync job owned by the current user';
