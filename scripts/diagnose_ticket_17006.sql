-- scripts/diagnose_ticket_17006.sql
-- Quick SQL diagnostic for ticket 17006

-- Replace with your actual project UUID
\set project_id 'YOUR_PROJECT_UUID_HERE'

\echo '\n=========================================='
\echo 'TICKET 17006 DIAGNOSTIC'
\echo '=========================================='

-- 1. Check if ticket exists in Supabase
\echo '\n1. Checking if ticket 17006 exists in database...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND in database'
    ELSE '❌ NOT FOUND in database'
  END AS status,
  COUNT(*) as row_count
FROM ticket_bowl_work_packages
WHERE project_id = :'project_id'
  AND work_package_id = 17006;

-- 2. If found, show full details
\echo '\n2. Ticket details (if exists)...'
SELECT 
  work_package_id,
  subject,
  type_name,
  status_name,
  testing_status,
  is_qa_missed,
  sync_status,
  history_verification_status,
  forwarding_count,
  latest_forwarded_at,
  latest_forwarded_by_name,
  last_synced_at,
  created_at_op,
  updated_at_op,
  history_error
FROM ticket_bowl_work_packages
WHERE project_id = :'project_id'
  AND work_package_id = 17006;

-- 3. Check forwarding history
\echo '\n3. Forwarding history...'
SELECT 
  changed_at,
  changed_by_name,
  previous_testing_status,
  new_testing_status,
  verification_status,
  activity_id
FROM ticket_bowl_forwarding_history
WHERE project_id = :'project_id'
  AND work_package_id = 17006
ORDER BY changed_at DESC;

-- 4. Check last sync status
\echo '\n4. Last sync status...'
SELECT 
  sync_status,
  started_at,
  completed_at,
  total_fetched,
  total_inserted,
  total_updated,
  forwarding_events_found,
  history_verified_count,
  history_unavailable_count,
  errors_count,
  error_details
FROM ticket_bowl_sync_status
WHERE project_id = :'project_id'
ORDER BY started_at DESC
LIMIT 1;

-- 5. Check reconciliation data
\echo '\n5. Reconciliation data...'
SELECT 
  reconciliation_status,
  openproject_total,
  supabase_total,
  missing_count,
  last_reconciliation_at,
  CASE 
    WHEN 17006 = ANY(missing_ticket_ids) THEN '✅ YES - Ticket 17006 IS in missing list'
    ELSE '❌ NO - Ticket 17006 is NOT in missing list'
  END AS is_missing
FROM ticket_bowl_sync_status
WHERE project_id = :'project_id'
  AND last_reconciliation_at IS NOT NULL
ORDER BY last_reconciliation_at DESC
LIMIT 1;

-- 6. Check all tickets in similar ID range (to see if there's a pattern)
\echo '\n6. Tickets near ID 17006 (to check for patterns)...'
SELECT 
  work_package_id,
  LEFT(subject, 50) as subject_preview,
  type_name,
  status_name,
  testing_status,
  sync_status,
  last_synced_at
FROM ticket_bowl_work_packages
WHERE project_id = :'project_id'
  AND work_package_id BETWEEN 17000 AND 17010
ORDER BY work_package_id;

-- 7. Count total tickets in database
\echo '\n7. Total tickets in database...'
SELECT 
  COUNT(*) as total_tickets,
  COUNT(DISTINCT work_package_id) as unique_tickets,
  MIN(work_package_id) as lowest_id,
  MAX(work_package_id) as highest_id
FROM ticket_bowl_work_packages
WHERE project_id = :'project_id';

-- 8. Check activity sync cursor for ticket 17006
\echo '\n8. Activity sync cursor (if exists)...'
SELECT 
  work_package_id,
  last_activity_id,
  last_activity_synced_at,
  total_activities_fetched,
  last_sync_at
FROM ticket_bowl_activity_sync_cursor
WHERE project_id = :'project_id'
  AND work_package_id = 17006;

\echo '\n=========================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '=========================================='
\echo ''
\echo 'INTERPRETATION:'
\echo '• If ticket NOT FOUND in step 1: Run full sync or reconciliation'
\echo '• If sync_status = "sync_failed": Check error_details in step 4'
\echo '• If in missing_ticket_ids list: Ticket exists in OpenProject but not synced'
\echo '• If gap in step 6 ID range: Pagination bug (should be fixed now)'
\echo ''
