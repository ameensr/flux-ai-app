-- ============================================================================
-- Migration 103: Atomic Sync with Staging Tables
-- ============================================================================
-- Purpose: Enable atomic data commitment for background synchronization
-- - Data written to staging tables during sync (invisible to users)
-- - Only committed to production tables on successful completion
-- - Failed/cancelled syncs don't affect user-visible data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Staging Table: ticket_bowl_work_packages_staging
-- ----------------------------------------------------------------------------
-- Temporary storage for work packages during active sync
-- Same schema as production table but with job_id for isolation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_work_packages_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  work_package_id BIGINT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  type_id INTEGER,
  type_name TEXT NOT NULL,
  status_id INTEGER,
  status_name TEXT NOT NULL,
  priority_id INTEGER,
  priority_name TEXT NOT NULL DEFAULT 'Normal',
  author_id INTEGER,
  author_name TEXT,
  assignee_id INTEGER,
  assignee_name TEXT,
  responsible_id INTEGER,
  responsible_name TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  release_tag TEXT,
  version_name TEXT,
  percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  start_date DATE,
  due_date DATE,
  is_overdue BOOLEAN DEFAULT FALSE,
  created_at_op TIMESTAMPTZ,
  updated_at_op TIMESTAMPTZ,
  latest_forwarded_at TIMESTAMPTZ,
  latest_forwarded_by_id INTEGER,
  latest_forwarded_by_name TEXT,
  forwarding_count INTEGER DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  history_verification_status TEXT NOT NULL DEFAULT 'unavailable',
  history_checked_at TIMESTAMPTZ,
  history_error TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_staging_job_wp UNIQUE (job_id, project_id, work_package_id)
);

-- Index for fast job-based queries
CREATE INDEX IF NOT EXISTS idx_staging_wp_job_id ON ticket_bowl_work_packages_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_wp_project_id ON ticket_bowl_work_packages_staging(project_id);

-- ----------------------------------------------------------------------------
-- 2. Staging Table: ticket_bowl_forwarding_history_staging
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_forwarding_history_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  work_package_id BIGINT NOT NULL,
  activity_id BIGINT,
  previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL DEFAULT 'Forwarded to the Testing Team',
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  source TEXT NOT NULL DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_staging_fwd_history UNIQUE (job_id, project_id, work_package_id, activity_id, changed_at)
);

CREATE INDEX IF NOT EXISTS idx_staging_fwd_job_id ON ticket_bowl_forwarding_history_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_fwd_project_id ON ticket_bowl_forwarding_history_staging(project_id);

-- ----------------------------------------------------------------------------
-- 3. Staging Table: ticket_bowl_testing_status_history_staging
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_testing_status_history_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  work_package_id BIGINT NOT NULL,
  activity_id BIGINT,
  previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_staging_status_history UNIQUE (job_id, project_id, work_package_id, activity_id, changed_at)
);

CREATE INDEX IF NOT EXISTS idx_staging_status_job_id ON ticket_bowl_testing_status_history_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_status_project_id ON ticket_bowl_testing_status_history_staging(project_id);

-- ----------------------------------------------------------------------------
-- 4. RPC Function: commit_sync_data
-- ----------------------------------------------------------------------------
-- Atomically moves staging data to production tables
-- Called only when sync completes successfully
-- Uses transaction to ensure all-or-nothing commitment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION commit_sync_data(p_job_id UUID, p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wp_inserted INT := 0;
  v_wp_updated INT := 0;
  v_fwd_inserted INT := 0;
  v_status_inserted INT := 0;
  v_job_status TEXT;
BEGIN
  -- Verify job exists and is in correct state
  SELECT status INTO v_job_status
  FROM sync_jobs
  WHERE id = p_job_id AND project_id = p_project_id;
  
  IF v_job_status IS NULL THEN
    RAISE EXCEPTION 'Sync job not found: %', p_job_id;
  END IF;
  
  IF v_job_status = 'cancelled' THEN
    -- Clean up staging data for cancelled job
    DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id;
    DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id;
    DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Job was cancelled, staging data cleaned up',
      'wp_inserted', 0,
      'wp_updated', 0,
      'fwd_inserted', 0,
      'status_inserted', 0
    );
  END IF;
  
  -- BEGIN ATOMIC COMMIT TRANSACTION
  -- All operations succeed or all fail together
  
  -- 1. Commit work packages (upsert from staging to production)
  -- Count before upsert
  SELECT COUNT(*) INTO v_wp_inserted
  FROM ticket_bowl_work_packages_staging
  WHERE job_id = p_job_id AND project_id = p_project_id
    AND work_package_id NOT IN (
      SELECT work_package_id FROM ticket_bowl_work_packages WHERE project_id = p_project_id
    );
  
  -- Count existing records that will be updated
  v_wp_updated := (
    SELECT COUNT(*) 
    FROM ticket_bowl_work_packages_staging s
    WHERE s.job_id = p_job_id AND s.project_id = p_project_id
      AND EXISTS (
        SELECT 1 FROM ticket_bowl_work_packages p 
        WHERE p.project_id = s.project_id AND p.work_package_id = s.work_package_id
      )
  );
  
  -- Perform the upsert
  INSERT INTO ticket_bowl_work_packages (
    project_id, op_project_id, op_project_name, work_package_id,
    subject, description, type_id, type_name, status_id, status_name,
    priority_id, priority_name, author_id, author_name, assignee_id, assignee_name,
    responsible_id, responsible_name, testing_status, is_qa_missed, qa_confirmation,
    release_tag, version_name, percentage_done, estimated_time, spent_time,
    story_points, start_date, due_date, is_overdue, created_at_op, updated_at_op,
    latest_forwarded_at, latest_forwarded_by_id, latest_forwarded_by_name,
    forwarding_count, sync_status, history_verification_status,
    history_checked_at, history_error, last_synced_at, raw_custom_fields,
    created_at, updated_at
  )
  SELECT 
    project_id, op_project_id, op_project_name, work_package_id,
    subject, description, type_id, type_name, status_id, status_name,
    priority_id, priority_name, author_id, author_name, assignee_id, assignee_name,
    responsible_id, responsible_name, testing_status, is_qa_missed, qa_confirmation,
    release_tag, version_name, percentage_done, estimated_time, spent_time,
    story_points, start_date, due_date, is_overdue, created_at_op, updated_at_op,
    latest_forwarded_at, latest_forwarded_by_id, latest_forwarded_by_name,
    forwarding_count, sync_status, history_verification_status,
    history_checked_at, history_error, last_synced_at, raw_custom_fields,
    created_at, updated_at
  FROM ticket_bowl_work_packages_staging
  WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id)
  DO UPDATE SET
    op_project_id = EXCLUDED.op_project_id,
    op_project_name = EXCLUDED.op_project_name,
    subject = EXCLUDED.subject,
    description = EXCLUDED.description,
    type_id = EXCLUDED.type_id,
    type_name = EXCLUDED.type_name,
    status_id = EXCLUDED.status_id,
    status_name = EXCLUDED.status_name,
    priority_id = EXCLUDED.priority_id,
    priority_name = EXCLUDED.priority_name,
    author_id = EXCLUDED.author_id,
    author_name = EXCLUDED.author_name,
    assignee_id = EXCLUDED.assignee_id,
    assignee_name = EXCLUDED.assignee_name,
    responsible_id = EXCLUDED.responsible_id,
    responsible_name = EXCLUDED.responsible_name,
    testing_status = EXCLUDED.testing_status,
    is_qa_missed = EXCLUDED.is_qa_missed,
    qa_confirmation = EXCLUDED.qa_confirmation,
    release_tag = EXCLUDED.release_tag,
    version_name = EXCLUDED.version_name,
    percentage_done = EXCLUDED.percentage_done,
    estimated_time = EXCLUDED.estimated_time,
    spent_time = EXCLUDED.spent_time,
    story_points = EXCLUDED.story_points,
    start_date = EXCLUDED.start_date,
    due_date = EXCLUDED.due_date,
    is_overdue = EXCLUDED.is_overdue,
    created_at_op = EXCLUDED.created_at_op,
    updated_at_op = EXCLUDED.updated_at_op,
    latest_forwarded_at = EXCLUDED.latest_forwarded_at,
    latest_forwarded_by_id = EXCLUDED.latest_forwarded_by_id,
    latest_forwarded_by_name = EXCLUDED.latest_forwarded_by_name,
    forwarding_count = EXCLUDED.forwarding_count,
    sync_status = EXCLUDED.sync_status,
    history_verification_status = EXCLUDED.history_verification_status,
    history_checked_at = EXCLUDED.history_checked_at,
    history_error = EXCLUDED.history_error,
    last_synced_at = EXCLUDED.last_synced_at,
    raw_custom_fields = EXCLUDED.raw_custom_fields,
    updated_at = EXCLUDED.updated_at;
  
  -- 2. Commit forwarding history
  INSERT INTO ticket_bowl_forwarding_history (
    project_id, op_project_id, work_package_id, activity_id,
    previous_testing_status, new_testing_status, changed_at,
    changed_by_id, changed_by_name, verification_status, source, created_at
  )
  SELECT 
    project_id, op_project_id, work_package_id, activity_id,
    previous_testing_status, new_testing_status, changed_at,
    changed_by_id, changed_by_name, verification_status, source, created_at
  FROM ticket_bowl_forwarding_history_staging
  WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id, activity_id, changed_at)
  DO NOTHING;
  
  GET DIAGNOSTICS v_fwd_inserted = ROW_COUNT;
  
  -- 3. Commit testing status history
  INSERT INTO ticket_bowl_testing_status_history (
    project_id, op_project_id, work_package_id, activity_id,
    previous_testing_status, new_testing_status, changed_at,
    changed_by_id, changed_by_name, source, created_at
  )
  SELECT 
    project_id, op_project_id, work_package_id, activity_id,
    previous_testing_status, new_testing_status, changed_at,
    changed_by_id, changed_by_name, source, created_at
  FROM ticket_bowl_testing_status_history_staging
  WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id, activity_id, changed_at)
  DO NOTHING;
  
  GET DIAGNOSTICS v_status_inserted = ROW_COUNT;
  
  -- 4. Clean up staging tables
  DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id;
  DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id;
  DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sync data committed successfully',
    'wp_inserted', v_wp_inserted,
    'wp_updated', v_wp_updated,
    'fwd_inserted', v_fwd_inserted,
    'status_inserted', v_status_inserted
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC Function: cleanup_staging_data
-- ----------------------------------------------------------------------------
-- Removes staging data for failed/cancelled jobs
-- Called during error handling or cancellation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_staging_data(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wp_deleted INT := 0;
  v_fwd_deleted INT := 0;
  v_status_deleted INT := 0;
BEGIN
  DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id;
  GET DIAGNOSTICS v_wp_deleted = ROW_COUNT;
  
  DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id;
  GET DIAGNOSTICS v_fwd_deleted = ROW_COUNT;
  
  DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id;
  GET DIAGNOSTICS v_status_deleted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staging data cleaned up',
    'wp_deleted', v_wp_deleted,
    'fwd_deleted', v_fwd_deleted,
    'status_deleted', v_status_deleted
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Grant Permissions
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_work_packages_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_forwarding_history_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_testing_status_history_staging TO authenticated;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION commit_sync_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_staging_data(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Add RLS Policies for Staging Tables
-- ----------------------------------------------------------------------------
ALTER TABLE ticket_bowl_work_packages_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_forwarding_history_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_testing_status_history_staging ENABLE ROW LEVEL SECURITY;

-- Users can only access staging data for their own projects
CREATE POLICY "staging_wp_access" ON ticket_bowl_work_packages_staging
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
         OR p.created_by = auth.uid()
         OR EXISTS (
           SELECT 1 FROM profiles up
           WHERE up.id = auth.uid()
             AND up.role IN ('admin', 'manager')
         )
    )
  );

CREATE POLICY "staging_fwd_access" ON ticket_bowl_forwarding_history_staging
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
         OR p.created_by = auth.uid()
         OR EXISTS (
           SELECT 1 FROM profiles up
           WHERE up.id = auth.uid()
             AND up.role IN ('admin', 'manager')
         )
    )
  );

CREATE POLICY "staging_status_access" ON ticket_bowl_testing_status_history_staging
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
         OR p.created_by = auth.uid()
         OR EXISTS (
           SELECT 1 FROM profiles up
           WHERE up.id = auth.uid()
             AND up.role IN ('admin', 'manager')
         )
    )
  );

-- ============================================================================
-- End of Migration 103
-- ============================================================================
