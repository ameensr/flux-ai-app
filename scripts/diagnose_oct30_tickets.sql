-- Diagnostic: Check tickets with forwarding events on October 30, 2026

-- 1. Check forwarding history for Oct 30, 2026
SELECT 
    fh.work_package_id,
    fh.changed_at,
    fh.changed_by_name,
    fh.old_value,
    fh.new_value
FROM ticket_bowl_forwarding_history fh
WHERE fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
  AND fh.changed_at <= '2026-10-30T23:59:59.999Z'::timestamptz
ORDER BY fh.changed_at DESC;

-- 2. Check work package details for these tickets
SELECT 
    wp.work_package_id,
    wp.subject,
    wp.type_name,
    wp.status_name,
    wp.testing_status,
    wp.history_verification_status,
    wp.latest_forwarded_at,
    wp.forwarding_count
FROM ticket_bowl_work_packages wp
WHERE wp.work_package_id IN (
    SELECT DISTINCT fh.work_package_id
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
      AND fh.changed_at <= '2026-10-30T23:59:59.999Z'::timestamptz
)
ORDER BY wp.work_package_id;

-- 3. Test the stored procedure with October 30 date filter
-- This simulates what the frontend would call
SELECT 
    work_package_id,
    subject,
    type_name,
    status_name,
    testing_status,
    history_verification_status,
    matched_forwarded_at,
    matched_forwarded_by,
    forwarding_count
FROM get_ticket_bowl_work_packages(
    p_project_id := (SELECT id FROM projects WHERE name = 'Unina' LIMIT 1),
    p_op_project_id := NULL,
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_type_name := NULL,
    p_status_name := NULL,
    p_priority_name := NULL,
    p_testing_status := NULL,
    p_is_qa_missed := NULL,
    p_author_name := NULL,
    p_assignee_name := NULL,
    p_history_verification_status := NULL,
    p_search := NULL,
    p_limit := 100,
    p_offset := 0
)
ORDER BY work_package_id;
