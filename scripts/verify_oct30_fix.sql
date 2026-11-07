-- ============================================================================
-- Verification Script: October 30, 2026 Forwarding Date Filter
-- ============================================================================
-- This script verifies that the forwarding date filter correctly includes
-- ALL tickets with verified forwarding events on October 30, 2026,
-- regardless of their current OpenProject Status.
-- ============================================================================

-- Test 1: List all forwarding events on October 30, 2026
-- Expected: Should show events for WP 17140, 17003, 16758
\echo '=================================================='
\echo 'Test 1: Forwarding events on October 30, 2026'
\echo '=================================================='
SELECT 
    fh.work_package_id,
    fh.changed_at,
    fh.changed_by_name,
    fh.new_value as testing_status_set_to
FROM ticket_bowl_forwarding_history fh
WHERE fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
  AND fh.changed_at < '2026-10-31T00:00:00Z'::timestamptz
ORDER BY fh.work_package_id;

-- Test 2: Check current status of these work packages
-- Expected: Should show current OpenProject Status for each ticket,
-- including 'Closed' status
\echo ''
\echo '=================================================='
\echo 'Test 2: Current status of tickets with Oct 30 events'
\echo '=================================================='
SELECT 
    wp.work_package_id,
    wp.subject,
    wp.type_name,
    wp.status_name as current_op_status,
    wp.testing_status as current_testing_status,
    wp.history_verification_status,
    wp.latest_forwarded_at,
    wp.forwarding_count
FROM ticket_bowl_work_packages wp
WHERE wp.work_package_id IN (
    SELECT DISTINCT fh.work_package_id
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
      AND fh.changed_at < '2026-10-31T00:00:00Z'::timestamptz
)
ORDER BY wp.work_package_id;

-- Test 3: Execute the stored procedure with October 30 date filter
-- Expected: Should return exactly 3 tickets (17140, 17003, 16758)
-- regardless of their current status
\echo ''
\echo '=================================================='
\echo 'Test 3: Stored procedure results for Oct 30 filter'
\echo '=================================================='
SELECT 
    work_package_id,
    SUBSTRING(subject, 1, 50) as subject,
    type_name,
    status_name as current_op_status,
    testing_status as current_testing_status,
    matched_forwarded_at,
    matched_forwarded_by,
    forwarding_count,
    history_verification_status
FROM get_ticket_bowl_work_packages(
    p_project_id := (SELECT id FROM projects WHERE name = 'Unina' LIMIT 1),
    p_op_project_id := NULL,
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_type_name := NULL,
    p_status_name := NULL,  -- NO status filter - include all statuses
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

-- Test 4: Verify that Closed tickets are NOT excluded
-- Expected: Should show any Closed tickets that were forwarded on Oct 30
\echo ''
\echo '=================================================='
\echo 'Test 4: Closed tickets with Oct 30 forwarding events'
\echo '=================================================='
SELECT 
    work_package_id,
    SUBSTRING(subject, 1, 50) as subject,
    status_name as current_op_status,
    matched_forwarded_at,
    matched_forwarded_by
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
WHERE status_name = 'Closed'
ORDER BY work_package_id;

-- Test 5: Verify regression tests
-- Check tickets forwarded on Oct 30 with different current statuses
\echo ''
\echo '=================================================='
\echo 'Test 5: Breakdown by current OpenProject Status'
\echo '=================================================='
SELECT 
    status_name as current_op_status,
    COUNT(*) as ticket_count,
    STRING_AGG(work_package_id::TEXT, ', ' ORDER BY work_package_id) as ticket_ids
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
GROUP BY status_name
ORDER BY status_name;

-- Test 6: Verify the total count
\echo ''
\echo '=================================================='
\echo 'Test 6: Total matching count'
\echo '=================================================='
SELECT 
    total_matching_count,
    COUNT(*) as returned_rows
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
GROUP BY total_matching_count;

\echo ''
\echo '=================================================='
\echo 'Expected Results Summary:'
\echo '=================================================='
\echo 'Test 1: Should show 3+ forwarding events (one or more per ticket)'
\echo 'Test 2: Should show 3 tickets with their current statuses'
\echo 'Test 3: Should return exactly 3 tickets: 17140, 17003, 16758'
\echo 'Test 4: Should show any Closed tickets (if applicable)'
\echo 'Test 5: Should show breakdown by status, total should be 3'
\echo 'Test 6: Should show total_matching_count = 3'
\echo '=================================================='
