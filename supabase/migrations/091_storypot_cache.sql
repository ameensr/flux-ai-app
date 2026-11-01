-- Migration: StoryPot Cache Table for OpenProject Work Packages
-- This creates a local cache of OpenProject data with pre-computed testing transition dates
-- Enables instant filtering by "Forwarded to Testing" date without N+1 API calls

-- 1. Create the cache table
CREATE TABLE IF NOT EXISTS openproject_work_packages_cache (
  -- Primary identifier (OpenProject work package ID)
  id BIGINT PRIMARY KEY,
  
  -- Project references
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER, -- OpenProject project ID (optional, for filtering)
  op_project_name TEXT,
  
  -- Core work package data
  subject TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  
  -- People
  author TEXT,
  assignee TEXT,
  responsible TEXT,
  
  -- Custom fields for QA workflow
  release_tag TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  
  -- CRITICAL: Pre-computed transition data (the prime feature)
  forwarded_to_testing_at TIMESTAMPTZ,
  forwarded_to_testing_by TEXT,
  handoff_verified BOOLEAN DEFAULT FALSE,
  handoff_count INTEGER DEFAULT 0,
  
  -- Dates
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  -- Progress
  percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  
  -- Overdue flag (computed during sync, not generated)
  is_overdue BOOLEAN DEFAULT FALSE,
  
  -- Version tracking
  version_name TEXT,
  
  -- Raw data for debugging/future use
  raw_data JSONB,
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_source TEXT DEFAULT 'manual' -- 'manual', 'background', 'webhook'
);

-- 2. Create indexes for fast filtering

-- Primary filter: Forwarded to Testing date (THE PRIME FEATURE)
CREATE INDEX idx_wp_cache_forwarded_date 
  ON openproject_work_packages_cache(forwarded_to_testing_at DESC NULLS LAST)
  WHERE forwarded_to_testing_at IS NOT NULL;

-- Composite index for date range queries with project
CREATE INDEX idx_wp_cache_project_forwarded 
  ON openproject_work_packages_cache(project_id, forwarded_to_testing_at DESC NULLS LAST);

-- Type filter (for Bug + Release filtering)
CREATE INDEX idx_wp_cache_type 
  ON openproject_work_packages_cache(type);

-- Release filter (only for Bugs - partial index)
CREATE INDEX idx_wp_cache_bug_release 
  ON openproject_work_packages_cache(release_tag) 
  WHERE type = 'Bug' AND release_tag IS NOT NULL;

-- Project + OpenProject project composite
CREATE INDEX idx_wp_cache_projects 
  ON openproject_work_packages_cache(project_id, op_project_id);

-- Testing status filter
CREATE INDEX idx_wp_cache_testing_status 
  ON openproject_work_packages_cache(testing_status);

-- Status filter
CREATE INDEX idx_wp_cache_status 
  ON openproject_work_packages_cache(status);

-- Priority filter
CREATE INDEX idx_wp_cache_priority 
  ON openproject_work_packages_cache(priority);

-- Author/Assignee filters
CREATE INDEX idx_wp_cache_author 
  ON openproject_work_packages_cache(author);
CREATE INDEX idx_wp_cache_assignee 
  ON openproject_work_packages_cache(assignee);

-- Overdue items (computed at query time based on due_date)
CREATE INDEX idx_wp_cache_due_date 
  ON openproject_work_packages_cache(due_date) 
  WHERE due_date IS NOT NULL;

-- Full-text search on subject
CREATE INDEX idx_wp_cache_subject_search 
  ON openproject_work_packages_cache USING gin(to_tsvector('english', subject));

-- Last synced (for incremental sync)
CREATE INDEX idx_wp_cache_last_synced 
  ON openproject_work_packages_cache(last_synced_at);

-- 3. Create sync status tracking table
CREATE TABLE IF NOT EXISTS openproject_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  
  -- Sync state
  last_full_sync_at TIMESTAMPTZ,
  last_incremental_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  last_sync_error TEXT,
  
  -- Stats
  total_work_packages INTEGER DEFAULT 0,
  work_packages_with_forwarding_date INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, op_project_id)
);

CREATE INDEX idx_sync_status_project ON openproject_sync_status(project_id);

-- 4. RLS Policies

-- Enable RLS
ALTER TABLE openproject_work_packages_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE openproject_sync_status ENABLE ROW LEVEL SECURITY;

-- Cache table: Users can read work packages for projects they're members of
CREATE POLICY "Users can view cached work packages for their projects"
  ON openproject_work_packages_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_work_packages_cache.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Cache table: Only admins and managers can insert/update/delete
CREATE POLICY "Admins can manage cached work packages"
  ON openproject_work_packages_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_work_packages_cache.project_id
        AND pm.user_id = auth.uid()
        AND pm.project_role IN ('owner', 'lead')
    )
  );

-- Sync status: Same policies
CREATE POLICY "Users can view sync status for their projects"
  ON openproject_sync_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_sync_status.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage sync status"
  ON openproject_sync_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 5. Helper function to get work packages with filters
CREATE OR REPLACE FUNCTION get_storypot_work_packages(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL,
  p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_release_tag TEXT DEFAULT NULL,
  p_testing_status TEXT DEFAULT NULL,
  p_author TEXT DEFAULT NULL,
  p_assignee TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  subject TEXT,
  description TEXT,
  type TEXT,
  status TEXT,
  priority TEXT,
  author TEXT,
  assignee TEXT,
  release_tag TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  forwarded_to_testing_at TIMESTAMPTZ,
  forwarded_to_testing_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  due_date DATE,
  is_overdue BOOLEAN,
  percentage_done INTEGER,
  op_project_name TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Get total count first
  SELECT COUNT(*) INTO v_total
  FROM openproject_work_packages_cache c
  WHERE c.project_id = p_project_id
    AND (p_op_project_id IS NULL OR c.op_project_id = p_op_project_id)
    AND (p_forwarded_from IS NULL OR c.forwarded_to_testing_at >= p_forwarded_from)
    AND (p_forwarded_to IS NULL OR c.forwarded_to_testing_at <= p_forwarded_to)
    AND (p_type IS NULL OR c.type = p_type)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_priority IS NULL OR c.priority = p_priority)
    AND (p_release_tag IS NULL OR c.release_tag = p_release_tag)
    AND (p_testing_status IS NULL OR c.testing_status ILIKE '%' || p_testing_status || '%')
    AND (p_author IS NULL OR c.author ILIKE '%' || p_author || '%')
    AND (p_assignee IS NULL OR c.assignee ILIKE '%' || p_assignee || '%')
    AND (p_search IS NULL OR (
      c.subject ILIKE '%' || p_search || '%' OR
      c.id::TEXT = p_search
    ));

  RETURN QUERY
  SELECT 
    c.id,
    c.subject,
    c.description,
    c.type,
    c.status,
    c.priority,
    c.author,
    c.assignee,
    c.release_tag,
    c.testing_status,
    c.is_qa_missed,
    c.qa_confirmation,
    c.forwarded_to_testing_at,
    c.forwarded_to_testing_by,
    c.created_at,
    c.updated_at,
    c.due_date,
    (c.due_date IS NOT NULL AND c.due_date < CURRENT_DATE AND c.status NOT IN ('Closed', 'Done', 'Rejected') AND c.percentage_done < 100) as is_overdue,
    c.percentage_done,
    c.op_project_name,
    v_total
  FROM openproject_work_packages_cache c
  WHERE c.project_id = p_project_id
    AND (p_op_project_id IS NULL OR c.op_project_id = p_op_project_id)
    AND (p_forwarded_from IS NULL OR c.forwarded_to_testing_at >= p_forwarded_from)
    AND (p_forwarded_to IS NULL OR c.forwarded_to_testing_at <= p_forwarded_to)
    AND (p_type IS NULL OR c.type = p_type)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_priority IS NULL OR c.priority = p_priority)
    AND (p_release_tag IS NULL OR c.release_tag = p_release_tag)
    AND (p_testing_status IS NULL OR c.testing_status ILIKE '%' || p_testing_status || '%')
    AND (p_author IS NULL OR c.author ILIKE '%' || p_author || '%')
    AND (p_assignee IS NULL OR c.assignee ILIKE '%' || p_assignee || '%')
    AND (p_search IS NULL OR (
      c.subject ILIKE '%' || p_search || '%' OR
      c.id::TEXT = p_search
    ))
  ORDER BY c.forwarded_to_testing_at DESC NULLS LAST, c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 6. Function to get aggregated stats
CREATE OR REPLACE FUNCTION get_storypot_stats(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  with_forwarding_date BIGINT,
  overdue_count BIGINT,
  unassigned_count BIGINT,
  by_status JSONB,
  by_type JSONB,
  by_priority JSONB,
  by_testing_status JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE c.forwarded_to_testing_at IS NOT NULL)::BIGINT as with_forwarding_date,
    COUNT(*) FILTER (WHERE c.due_date IS NOT NULL AND c.due_date < CURRENT_DATE AND c.status NOT IN ('Closed', 'Done', 'Rejected') AND c.percentage_done < 100)::BIGINT as overdue_count,
    COUNT(*) FILTER (WHERE c.assignee IS NULL OR c.assignee = 'Unassigned')::BIGINT as unassigned_count,
    COALESCE(jsonb_object_agg(c.status, status_count) FILTER (WHERE c.status IS NOT NULL), '{}'::JSONB) as by_status,
    COALESCE(jsonb_object_agg(c.type, type_count) FILTER (WHERE c.type IS NOT NULL), '{}'::JSONB) as by_type,
    COALESCE(jsonb_object_agg(c.priority, priority_count) FILTER (WHERE c.priority IS NOT NULL), '{}'::JSONB) as by_priority,
    COALESCE(jsonb_object_agg(c.testing_status, ts_count) FILTER (WHERE c.testing_status IS NOT NULL), '{}'::JSONB) as by_testing_status
  FROM (
    SELECT 
      status,
      type,
      priority,
      testing_status,
      due_date,
      percentage_done,
      assignee,
      forwarded_to_testing_at,
      COUNT(*) OVER (PARTITION BY status) as status_count,
      COUNT(*) OVER (PARTITION BY type) as type_count,
      COUNT(*) OVER (PARTITION BY priority) as priority_count,
      COUNT(*) OVER (PARTITION BY testing_status) as ts_count
    FROM openproject_work_packages_cache
    WHERE project_id = p_project_id
      AND (p_op_project_id IS NULL OR op_project_id = p_op_project_id)
  ) c;
END;
$$;

-- 7. Grant permissions
GRANT SELECT ON openproject_work_packages_cache TO authenticated;
GRANT SELECT ON openproject_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_storypot_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_storypot_stats TO authenticated;
