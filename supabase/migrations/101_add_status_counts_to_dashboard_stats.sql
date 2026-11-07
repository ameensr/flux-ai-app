-- ============================================================================
-- Migration: Add status_counts to dashboard stats function
-- Description: Adds work package status aggregation to the dashboard stats
-- Date: 2024-11-07
-- ============================================================================

-- Drop and recreate the function with the new status_counts column
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
GRANT EXECUTE ON FUNCTION get_ticket_bowl_dashboard_stats TO authenticated;

-- ============================================================================
-- End Migration
-- ============================================================================
