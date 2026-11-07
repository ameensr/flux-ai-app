-- ============================================================================
-- MIGRATION 100: Fix Forwarding Date Filter Logic
-- ============================================================================
-- Fix: Remove fallback to wp.latest_forwarded_at when filtering by date range.
-- The forwarding date filter must ONLY match tickets with verified forwarding
-- events in ticket_bowl_forwarding_history within the specified date range.
--
-- Issue: The original logic had an OR condition that would include tickets
-- if wp.latest_forwarded_at was in range, even if no verified history record
-- existed for that date. This caused tickets to appear incorrectly.
--
-- Solution: Remove the fallback condition entirely. Date filtering must be
-- based solely on the EXISTS check against ticket_bowl_forwarding_history.
-- ============================================================================

DROP FUNCTION IF EXISTS get_ticket_bowl_work_packages;
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
BEGIN
  -- 1. Compute total matching tickets count
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
    -- ══════════════════════════════════════════════════════════════════════════
    -- CRITICAL FIX: Date filter logic
    -- ══════════════════════════════════════════════════════════════════════════
    -- When date filter is applied, ONLY include tickets with verified forwarding
    -- events in ticket_bowl_forwarding_history within the date range.
    -- Do NOT fallback to wp.latest_forwarded_at.
    -- ══════════════════════════════════════════════════════════════════════════
    AND (
      -- If no date filter, include all tickets
      (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
      OR
      -- If date filter is applied, MUST have a verified history record in range
      EXISTS (
        SELECT 1
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      )
    );

  -- 2. Return paginated records with the matched forwarding event
  RETURN QUERY
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
    -- If date filtered, pick latest forwarding event WITHIN the date filter; else ticket's latest
    COALESCE(
      (
        SELECT fh.changed_at
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_at
    ) AS matched_forwarded_at,
    COALESCE(
      (
        SELECT fh.changed_by_name
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_by_name
    ) AS matched_forwarded_by,
    wp.forwarding_count,
    wp.sync_status,
    wp.history_verification_status,
    wp.history_checked_at,
    wp.last_synced_at,
    v_total AS total_matching_count
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
    -- ══════════════════════════════════════════════════════════════════════════
    -- CRITICAL FIX: Date filter logic (same as above)
    -- ══════════════════════════════════════════════════════════════════════════
    AND (
      (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
      OR
      EXISTS (
        SELECT 1
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      )
    )
  ORDER BY 
    COALESCE(
      (
        SELECT fh.changed_at
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_at
    ) DESC NULLS LAST,
    wp.updated_at_op DESC NULLS LAST,
    wp.work_package_id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Also fix the dashboard stats function
DROP FUNCTION IF EXISTS get_ticket_bowl_dashboard_stats;
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
  status_counts JSONB,
  priority_counts JSONB,
  history_verification_counts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH matched_tickets AS (
    SELECT wp.*
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
      -- ══════════════════════════════════════════════════════════════════════════
      -- CRITICAL FIX: Date filter logic
      -- ══════════════════════════════════════════════════════════════════════════
      AND (
        (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
        OR
        EXISTS (
          SELECT 1
          FROM ticket_bowl_forwarding_history fh
          WHERE fh.project_id = wp.project_id
            AND fh.work_package_id = wp.work_package_id
            AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
            AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        )
      )
  ),
  events_in_range AS (
    SELECT COUNT(*) AS event_count
    FROM ticket_bowl_forwarding_history fh
    JOIN matched_tickets mt 
      ON mt.project_id = fh.project_id 
     AND mt.work_package_id = fh.work_package_id
    WHERE (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  ),
  testing_status_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(testing_status, 'No Testing Status'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT testing_status, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY testing_status
    ) s
  ),
  qa_missed_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(is_qa_missed, 'Unknown'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT is_qa_missed, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY is_qa_missed
    ) s
  ),
  type_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(type_name, 'Unknown'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT type_name, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY type_name
    ) s
  ),
  status_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(status_name, 'Unknown'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT status_name, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY status_name
    ) s
  ),
  priority_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(priority_name, 'Normal'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT priority_name, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY priority_name
    ) s
  ),
  history_verif_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(history_verification_status, 'unavailable'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT history_verification_status, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY history_verification_status
    ) s
  )
  SELECT 
    (SELECT COUNT(*) FROM matched_tickets)::bigint AS total_unique_tickets,
    (SELECT event_count FROM events_in_range)::bigint AS total_forwarding_events,
    (SELECT COUNT(*) FROM matched_tickets WHERE forwarding_count > 1)::bigint AS repeat_forwarded_tickets,
    (SELECT COUNT(*) FROM matched_tickets WHERE history_verification_status = 'unavailable')::bigint AS unavailable_history_tickets,
    (SELECT agg FROM testing_status_agg) AS current_testing_status_counts,
    (SELECT agg FROM qa_missed_agg) AS qa_missed_counts,
    (SELECT agg FROM type_agg) AS type_counts,
    (SELECT agg FROM status_agg) AS status_counts,
    (SELECT agg FROM priority_agg) AS priority_counts,
    (SELECT agg FROM history_verif_agg) AS history_verification_counts;
END;
$$;

-- Restore permissions
GRANT EXECUTE ON FUNCTION get_ticket_bowl_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_bowl_dashboard_stats TO authenticated;

-- ============================================================================
-- END OF MIGRATION: 100_fix_forwarding_date_filter.sql
-- ============================================================================
