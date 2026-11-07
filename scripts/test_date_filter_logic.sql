-- ============================================================================
-- Test Script: Date Filter Logic Correctness
-- ============================================================================
-- This script tests the corrected date filter logic step-by-step
-- ============================================================================

\echo '=================================================='
\echo 'STEP 1: Raw data check - Forwarding history'
\echo '=================================================='
\echo 'Query: All forwarding events on Oct 30, 2026'
\echo ''

SELECT 
    fh.work_package_id,
    fh.changed_at,
    fh.new_value as forwarded_to_status,
    fh.changed_by_name
FROM ticket_bowl_forwarding_history fh
WHERE fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
  AND fh.changed_at < '2026-10-31T00:00:00Z'::timestamptz
ORDER BY fh.changed_at DESC;

\echo ''
\echo '=================================================='
\echo 'STEP 2: Work package current states'
\echo '=================================================='
\echo 'Query: Current status of all tickets with Oct 30 events'
\echo ''

SELECT 
    wp.work_package_id,
    wp.status_name as current_openproject_status,
    wp.testing_status as current_testing_status,
    wp.type_name,
    wp.latest_forwarded_at,
    wp.history_verification_status
FROM ticket_bowl_work_packages wp
WHERE EXISTS (
    SELECT 1
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
      AND fh.changed_at >= '2026-10-30T00:00:00Z'::timestamptz
      AND fh.changed_at < '2026-10-31T00:00:00Z'::timestamptz
)
ORDER BY wp.work_package_id;

\echo ''
\echo '=================================================='
\echo 'STEP 3: Test WITHOUT status filter'
\echo '=================================================='
\echo 'Query: Date filter only, NO status restriction'
\echo 'Expected: ALL 3 tickets regardless of current status'
\echo ''

SELECT 
    work_package_id,
    SUBSTRING(subject, 1, 40) as subject,
    type_name,
    status_name as current_openproject_status,
    testing_status as current_testing_status,
    matched_forwarded_at,
    matched_forwarded_by
FROM get_ticket_bowl_work_packages(
    p_project_id := (SELECT id FROM projects WHERE name = 'Unina' LIMIT 1),
    p_op_project_id := NULL,
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_type_name := NULL,
    p_status_name := NULL,  -- ⭐ NO status filter
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

\echo ''
\echo '=================================================='
\echo 'STEP 4: Test WITH Closed status filter'
\echo '=================================================='
\echo 'Query: Date filter + status_name = ''Closed'''
\echo 'Expected: Only tickets that are BOTH forwarded on Oct 30 AND currently Closed'
\echo ''

SELECT 
    work_package_id,
    SUBSTRING(subject, 1, 40) as subject,
    status_name as current_openproject_status,
    matched_forwarded_at,
    matched_forwarded_by
FROM get_ticket_bowl_work_packages(
    p_project_id := (SELECT id FROM projects WHERE name = 'Unina' LIMIT 1),
    p_op_project_id := NULL,
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_type_name := NULL,
    p_status_name := 'Closed',  -- ⭐ WITH status filter
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

\echo ''
\echo '=================================================='
\echo 'STEP 5: Test WITH In Progress status filter'
\echo '=================================================='
\echo 'Query: Date filter + status_name = ''In Progress'''
\echo ''

SELECT 
    work_package_id,
    SUBSTRING(subject, 1, 40) as subject,
    status_name as current_openproject_status,
    matched_forwarded_at
FROM get_ticket_bowl_work_packages(
    p_project_id := (SELECT id FROM projects WHERE name = 'Unina' LIMIT 1),
    p_op_project_id := NULL,
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_type_name := NULL,
    p_status_name := 'In Progress',  -- ⭐ WITH status filter
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

\echo ''
\echo '=================================================='
\echo 'STEP 6: Verify ticket count breakdown by status'
\echo '=================================================='
\echo 'Query: Group by current OpenProject Status'
\echo ''

SELECT 
    status_name as current_openproject_status,
    COUNT(*) as count
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

\echo ''
\echo '=================================================='
\echo 'EXPECTED RESULTS SUMMARY'
\echo '=================================================='
\echo 'STEP 1: Should show 1+ events for each of WP 17140, 17003, 16758'
\echo 'STEP 2: Should show 3 work packages with their current statuses'
\echo 'STEP 3: Should return exactly 3 tickets (17140, 17003, 16758)'
\echo '        ALL statuses included (New, In Progress, Resolved, Closed, etc.)'
\echo 'STEP 4: Should return only tickets that are BOTH:'
\echo '        - Forwarded on Oct 30, AND'
\echo '        - Currently have status = Closed'
\echo 'STEP 5: Should return only tickets that are BOTH:'
\echo '        - Forwarded on Oct 30, AND'
\echo '        - Currently have status = In Progress'
\echo 'STEP 6: Should show total of 3 tickets distributed across statuses'
\echo '=================================================='
