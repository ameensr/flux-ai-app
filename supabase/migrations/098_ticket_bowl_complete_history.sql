-- ============================================================================
-- Migration: 098_ticket_bowl_complete_history.sql
-- Fixes:
--   1. Add ticket_bowl_testing_status_history table for ALL customField14 changes
--   2. Fix get_ticket_bowl_work_packages: date filter uses ONLY history table
--      (removes the unreliable latest_forwarded_at OR fallback)
--   3. Fix forwarding_count to be recalculated from the history table, not
--      overwritten by a single sync run
--   4. Add index on new_testing_status for fast forwarding event lookups
--   5. Fix get_ticket_bowl_dashboard_stats to match the same filter logic
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Complete Testing Status History Table
--    Stores EVERY customField14 change, not just forwarding events.
--    Forwarding events are identified by new_testing_status = exact target.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_testing_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  work_package_id BIGINT NOT NULL,
  activity_id BIGINT,
  previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL DEFAULT 'Unknown',
  is_forwarding_event BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE when new_testing_status = exact target
  source TEXT NOT NULL DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_tb_ts_history UNIQUE (project_id, work_package_id, activity_id, changed_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tb_ts_hist_proj_wp ON ticket_bowl_testing_status_history(project_id, work_package_id);
CREATE INDEX IF NOT EXISTS idx_tb_ts_hist_proj_changed_at ON ticket_bowl_testing_status_history(project_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_ts_hist_forwarding ON ticket_bowl_testing_status_history(project_id, is_forwarding_event, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_ts_hist_wp_changed_at ON ticket_bowl_testing_status_history(work_package_id, changed_at DESC);

-- Also add index on forwarding history new_testing_status for fast lookups
CREATE INDEX IF NOT EXISTS idx_tb_fwd_new_status ON ticket_bowl_forwarding_history(project_id, new_testing_status, changed_at DESC);

-- RLS
ALTER TABLE ticket_bowl_testing_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ticket bowl testing status history" ON ticket_bowl_testing_status_history;
CREATE POLICY "Users can view ticket bowl testing status history"
  ON ticket_bowl_testing_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_testing_status_history.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can manage ticket bowl testing status history" ON ticket_bowl_testing_status_history;
CREATE POLICY "Authorized users can manage ticket bowl testing status history"
  ON ticket_bowl_testing_status_history FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m ON m.id = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr ON pr.id = auth.uid()
      JOIN roles r ON r.role_key = pr.role
      WHERE m.module_key = 'ticket-bowl'
        AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id
        AND rmp.is_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m ON m.id = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr ON pr.id = auth.uid()
      JOIN roles r ON r.role_key = pr.role
      WHERE m.module_key = 'ticket-bowl'
        AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id
        AND rmp.is_enabled = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_testing_status_history TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Replace get_ticket_bowl_work_packages
--    CRITICAL FIX: Date filter uses ONLY ticket_bowl_forwarding_history.
--    The unreliable "OR wp.latest_forwarded_at" fallback is removed.
--    forwarding_count is recalculated from the history table per ticket.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_ticket_bowl_work_packages(UUID,INTEGER,TIMESTAMPTZ,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER);

CREATE OR REPLACE FUNCTION get_ticket_bowl_work_packages(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL,
  p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL,
  p_type_name TEXT DEFAULT NULL,
  p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL,
  p_testing_status TEXT DEFAULT NULL,
  p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL,
  p_assignee_name TEXT DEFAULT NULL,
  p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  op_project_id INTEGER,
  op_project_name TEXT,
  work_package_id BIGINT,
  subject TEXT,
  description TEXT,
  type_id INTEGER,
  type_name TEXT,
  status_id INTEGER,
  status_name TEXT,
  priority_id INTEGER,
  priority_name TEXT,
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
  percentage_done INTEGER,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  start_date DATE,
  due_date DATE,
  is_overdue BOOLEAN,
  created_at_op TIMESTAMPTZ,
  updated_at_op TIMESTAMPTZ,
  matched_forwarded_at TIMESTAMPTZ,
  matched_forwarded_by TEXT,
  forwarding_count INTEGER,
  sync_status TEXT,
  history_verification_status TEXT,
  history_checked_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  total_matching_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
  v_date_filter_active BOOLEAN;
BEGIN
  v_date_filter_active := (p_forwarded_from IS NOT NULL OR p_forwarded_to IS NOT NULL);

  -- 1. Count distinct matching tickets
  SELECT COUNT(DISTINCT wp.id) INTO v_total
  FROM ticket_bowl_work_packages wp
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (
      p_search IS NULL OR
      wp.subject ILIKE '%' || p_search || '%' OR
      wp.work_package_id::TEXT = p_search
    )
    AND (
      NOT v_date_filter_active
      OR EXISTS (
        SELECT 1
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      )
    );

  -- 2. Return paginated records
  RETURN QUERY
  WITH matched_fwd AS (
    -- Latest forwarding event within the date range per work package
    SELECT DISTINCT ON (fh.work_package_id)
      fh.work_package_id,
      fh.changed_at AS matched_at,
      fh.changed_by_name AS matched_by
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = p_project_id
      AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
    ORDER BY fh.work_package_id, fh.changed_at DESC
  ),
  lifetime_counts AS (
    -- Lifetime forwarding count per work package from history table
    SELECT fh.work_package_id, COUNT(*)::INTEGER AS fwd_count
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = p_project_id
    GROUP BY fh.work_package_id
  )
  SELECT
    wp.id,
    wp.project_id,
    wp.op_project_id,
    wp.op_project_name,
    wp.work_package_id,
    wp.subject,
    wp.description,
    wp.type_id,
    wp.type_name,
    wp.status_id,
    wp.status_name,
    wp.priority_id,
    wp.priority_name,
    wp.author_id,
    wp.author_name,
    wp.assignee_id,
    wp.assignee_name,
    wp.responsible_id,
    wp.responsible_name,
    wp.testing_status,
    wp.is_qa_missed,
    wp.qa_confirmation,
    wp.release_tag,
    wp.version_name,
    wp.percentage_done,
    wp.estimated_time,
    wp.spent_time,
    wp.story_points,
    wp.start_date,
    wp.due_date,
    wp.is_overdue,
    wp.created_at_op,
    wp.updated_at_op,
    COALESCE(mf.matched_at, wp.latest_forwarded_at) AS matched_forwarded_at,
    COALESCE(mf.matched_by, wp.latest_forwarded_by_name) AS matched_forwarded_by,
    COALESCE(lc.fwd_count, wp.forwarding_count, 0) AS forwarding_count,
    wp.sync_status,
    wp.history_verification_status,
    wp.history_checked_at,
    wp.last_synced_at,
    v_total AS total_matching_count
  FROM ticket_bowl_work_packages wp
  LEFT JOIN matched_fwd mf ON mf.work_package_id = wp.work_package_id
  LEFT JOIN lifetime_counts lc ON lc.work_package_id = wp.work_package_id
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (
      p_search IS NULL OR
      wp.subject ILIKE '%' || p_search || '%' OR
      wp.work_package_id::TEXT = p_search
    )
    AND (
      NOT v_date_filter_active
      OR mf.work_package_id IS NOT NULL
    )
  ORDER BY
    COALESCE(mf.matched_at, wp.latest_forwarded_at) DESC NULLS LAST,
    wp.updated_at_op DESC NULLS LAST,
    wp.work_package_id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Replace get_ticket_bowl_dashboard_stats with matching filter logic
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_ticket_bowl_dashboard_stats(UUID,INTEGER,TIMESTAMPTZ,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION get_ticket_bowl_dashboard_stats(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL,
  p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL,
  p_type_name TEXT DEFAULT NULL,
  p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL,
  p_testing_status TEXT DEFAULT NULL,
  p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL,
  p_assignee_name TEXT DEFAULT NULL,
  p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_unique_tickets BIGINT,
  total_forwarding_events BIGINT,
  repeat_forwarded_tickets BIGINT,
  unavailable_history_tickets BIGINT,
  current_testing_status_counts JSONB,
  qa_missed_counts JSONB,
  type_counts JSONB,
  priority_counts JSONB,
  history_verification_counts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_filter_active BOOLEAN;
BEGIN
  v_date_filter_active := (p_forwarded_from IS NOT NULL OR p_forwarded_to IS NOT NULL);

  RETURN QUERY
  WITH matched_wp_ids AS (
    -- Distinct work package IDs that pass all filters
    SELECT wp.id AS wp_id, wp.work_package_id AS wpid
    FROM ticket_bowl_work_packages wp
    WHERE wp.project_id = p_project_id
      AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
      AND (p_type_name IS NULL OR wp.type_name = p_type_name)
      AND (p_status_name IS NULL OR wp.status_name = p_status_name)
      AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
      AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
      AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
      AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
      AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
      AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
      AND (
        p_search IS NULL OR
        wp.subject ILIKE '%' || p_search || '%' OR
        wp.work_package_id::TEXT = p_search
      )
      AND (
        NOT v_date_filter_active
        OR EXISTS (
          SELECT 1
          FROM ticket_bowl_forwarding_history fh
          WHERE fh.project_id = wp.project_id
            AND fh.work_package_id = wp.work_package_id
            AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
            AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        )
      )
  ),
  matched_tickets AS (
    SELECT wp.*
    FROM ticket_bowl_work_packages wp
    JOIN matched_wp_ids m ON m.wp_id = wp.id
  ),
  lifetime_counts AS (
    SELECT fh.work_package_id, COUNT(*)::BIGINT AS fwd_count
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = p_project_id
      AND fh.work_package_id IN (SELECT wpid FROM matched_wp_ids)
    GROUP BY fh.work_package_id
  ),
  events_in_range AS (
    SELECT COUNT(*) AS event_count
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = p_project_id
      AND fh.work_package_id IN (SELECT wpid FROM matched_wp_ids)
      AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  )
  SELECT
    (SELECT COUNT(*) FROM matched_tickets)::BIGINT,
    (SELECT event_count FROM events_in_range)::BIGINT,
    (SELECT COUNT(*) FROM lifetime_counts WHERE fwd_count > 1)::BIGINT,
    (SELECT COUNT(*) FROM matched_tickets WHERE history_verification_status = 'unavailable')::BIGINT,
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(testing_status, 'No Testing Status'), cnt)
       FROM (SELECT testing_status, COUNT(*)::BIGINT AS cnt FROM matched_tickets GROUP BY testing_status) s),
      '{}'::JSONB
    ),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(is_qa_missed, 'Unknown'), cnt)
       FROM (SELECT is_qa_missed, COUNT(*)::BIGINT AS cnt FROM matched_tickets GROUP BY is_qa_missed) s),
      '{}'::JSONB
    ),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(type_name, 'Unknown'), cnt)
       FROM (SELECT type_name, COUNT(*)::BIGINT AS cnt FROM matched_tickets GROUP BY type_name) s),
      '{}'::JSONB
    ),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(priority_name, 'Normal'), cnt)
       FROM (SELECT priority_name, COUNT(*)::BIGINT AS cnt FROM matched_tickets GROUP BY priority_name) s),
      '{}'::JSONB
    ),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(history_verification_status, 'unavailable'), cnt)
       FROM (SELECT history_verification_status, COUNT(*)::BIGINT AS cnt FROM matched_tickets GROUP BY history_verification_status) s),
      '{}'::JSONB
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Function: get_ticket_testing_status_history
--    Returns complete Testing Status history for a single work package,
--    ordered newest-first. Includes all changes, not just forwarding events.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_ticket_testing_status_history(UUID, BIGINT);

CREATE OR REPLACE FUNCTION get_ticket_testing_status_history(
  p_project_id UUID,
  p_work_package_id BIGINT
)
RETURNS TABLE (
  id UUID,
  activity_id BIGINT,
  previous_testing_status TEXT,
  new_testing_status TEXT,
  changed_at TIMESTAMPTZ,
  changed_by_name TEXT,
  is_forwarding_event BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.activity_id,
    h.previous_testing_status,
    h.new_testing_status,
    h.changed_at,
    h.changed_by_name,
    h.is_forwarding_event
  FROM ticket_bowl_testing_status_history h
  WHERE h.project_id = p_project_id
    AND h.work_package_id = p_work_package_id
  ORDER BY h.changed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ticket_bowl_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_bowl_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_testing_status_history TO authenticated;

-- ============================================================================
-- END OF MIGRATION: 098_ticket_bowl_complete_history.sql
-- ============================================================================
