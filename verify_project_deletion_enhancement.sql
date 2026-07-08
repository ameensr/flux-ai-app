-- ══════════════════════════════════════════════════════════════════════════════
-- Verify Project Deletion Enhancement - Complete Verification
-- Run this after deploying Migration 044 and frontend changes
-- ══════════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo 'PROJECT DELETION ENHANCEMENT - VERIFICATION'
\echo '══════════════════════════════════════════════════════════════'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Verify CASCADE Constraints
-- ══════════════════════════════════════════════════════════════════════════════

\echo '1. Foreign Key CASCADE Verification:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  tc.table_name AS "Table",
  kcu.column_name AS "Column",
  rc.delete_rule AS "On Delete",
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ PASS'
    ELSE '❌ FAIL (should be CASCADE)'
  END AS "Status"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'projects'
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'project_id'
ORDER BY tc.table_name;

\echo ''
\echo 'Expected Result: All tables should show CASCADE'
\echo 'Tables checked:'
\echo '  • project_members → CASCADE ✅'
\echo '  • weekly_reports → CASCADE ✅'
\echo '  • daily_support_logs → CASCADE ✅'
\echo '  • daily_release_testing_status → CASCADE ✅'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Verify Audit Table Exists
-- ══════════════════════════════════════════════════════════════════════════════

\echo '2. Audit Table Verification:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  'project_deletion_audit' AS "Table Name",
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_deletion_audit'
  ) AS "Exists",
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_deletion_audit'
  ) THEN '✅ PASS - Audit logging enabled' 
  ELSE '❌ FAIL - Audit table missing' 
  END AS "Status";

\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Verify Trigger Exists
-- ══════════════════════════════════════════════════════════════════════════════

\echo '3. Deletion Trigger Verification:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  tgname AS "Trigger Name",
  tgrelid::regclass AS "Table",
  CASE tgtype::int & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END AS "Timing",
  CASE tgtype::int & 8
    WHEN 8 THEN 'DELETE'
    ELSE 'OTHER'
  END AS "Event",
  '✅ PASS - Trigger exists' AS "Status"
FROM pg_trigger
WHERE tgname = 'projects_deletion_audit'
  AND tgrelid = 'public.projects'::regclass;

\echo ''
\echo 'Expected: Trigger "projects_deletion_audit" on projects table (BEFORE DELETE)'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Verify RLS Policies
-- ══════════════════════════════════════════════════════════════════════════════

\echo '4. RLS Policy Verification:'
\echo '──────────────────────────────────────────────────────────────'

-- Check projects_delete policy
SELECT 
  'projects_delete' AS "Policy",
  EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects'
    AND policyname = 'projects_delete'
  ) AS "Exists",
  CASE WHEN EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects'
    AND policyname = 'projects_delete'
  ) THEN '✅ PASS'
  ELSE '❌ FAIL - Policy missing'
  END AS "Status";

\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Check Current User Permissions
-- ══════════════════════════════════════════════════════════════════════════════

\echo '5. Your Deletion Permissions:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  prof.email AS "User Email",
  prof.role AS "Global Role",
  public.is_admin() AS "Is Admin",
  CASE 
    WHEN public.is_admin() THEN '✅ Can delete ANY project'
    ELSE '⚠️  Can only delete projects where you are owner'
  END AS "Deletion Capability"
FROM profiles prof
WHERE prof.id = auth.uid();

\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Project Data Summary
-- ══════════════════════════════════════════════════════════════════════════════

\echo '6. Current Projects and Associated Data:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  p.name AS "Project",
  p.status AS "Status",
  COUNT(DISTINCT pm.id) AS "Members",
  COUNT(DISTINCT wr.id) AS "QA Reports",
  COUNT(DISTINCT dsl.id) AS "Support Logs",
  COUNT(DISTINCT drts.id) AS "Testing Records",
  COALESCE(your_pm.project_role, 'Not member') AS "Your Role",
  CASE 
    WHEN public.is_admin() THEN '✅ Can Delete'
    WHEN your_pm.project_role = 'owner' THEN '✅ Can Delete'
    ELSE '❌ Cannot Delete'
  END AS "Can You Delete?"
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN project_members your_pm ON p.id = your_pm.project_id AND your_pm.user_id = auth.uid()
LEFT JOIN weekly_reports wr ON p.id = wr.project_id
LEFT JOIN daily_support_logs dsl ON p.id = dsl.project_id
LEFT JOIN daily_release_testing_status drts ON p.id = drts.project_id
GROUP BY p.id, p.name, p.status, your_pm.project_role
ORDER BY p.created_at DESC
LIMIT 10;

\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Check for Orphaned Data
-- ══════════════════════════════════════════════════════════════════════════════

\echo '7. Orphaned Data Check (Should be 0 or minimal):'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  'weekly_reports' AS "Table",
  COUNT(*) AS "Orphaned Records",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - No orphans'
    ELSE '⚠️  WARNING - Has orphaned data'
  END AS "Status"
FROM weekly_reports
WHERE project_id IS NULL

UNION ALL

SELECT 
  'daily_support_logs',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '⚠️  WARNING' END
FROM daily_support_logs
WHERE project_id IS NULL

UNION ALL

SELECT 
  'daily_release_testing_status',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '⚠️  WARNING' END
FROM daily_release_testing_status
WHERE project_id IS NULL;

\echo ''
\echo 'Note: Some orphaned data may be legacy (before CASCADE was enabled)'
\echo 'New deletions should NOT create orphaned data'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Recent Deletion Audit (if any)
-- ══════════════════════════════════════════════════════════════════════════════

\echo '8. Recent Deletions (Last 5):'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  pda.project_name AS "Deleted Project",
  pda.project_code AS "Code",
  prof.email AS "Deleted By",
  pda.deleted_at AS "When",
  pda.associated_data_counts->>'members' AS "Members",
  pda.associated_data_counts->>'weekly_reports' AS "Reports",
  pda.associated_data_counts->>'support_logs' AS "Logs",
  pda.associated_data_counts->>'testing_status' AS "Testing"
FROM project_deletion_audit pda
LEFT JOIN profiles prof ON pda.deleted_by = prof.id
ORDER BY pda.deleted_at DESC
LIMIT 5;

\echo ''
\echo 'Note: This table only shows deletions AFTER Migration 044'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- FINAL SUMMARY
-- ══════════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo 'VERIFICATION SUMMARY'
\echo '══════════════════════════════════════════════════════════════'
\echo ''
\echo 'Expected Results:'
\echo '  1. ✅ All foreign keys show CASCADE'
\echo '  2. ✅ Audit table exists'
\echo '  3. ✅ Deletion trigger exists'
\echo '  4. ✅ RLS policies in place'
\echo '  5. ✅ Permissions working correctly'
\echo '  6. ✅ Projects show associated data counts'
\echo '  7. ✅ No new orphaned data'
\echo '  8. ✅ Audit log captures deletions'
\echo ''
\echo 'Frontend Verification (Manual):'
\echo '  1. ☐ Delete button only visible to authorized users'
\echo '  2. ☐ Custom modal appears (not browser confirm)'
\echo '  3. ☐ Type-to-confirm validation works'
\echo '  4. ☐ Delete button disabled until name matches'
\echo '  5. ☐ Deletion removes ALL associated data'
\echo '  6. ☐ Success message appears'
\echo '  7. ☐ Project removed from UI'
\echo '  8. ☐ No errors in browser console'
\echo ''
\echo 'Next Steps:'
\echo '  • Review results above'
\echo '  • Test deletion with a non-critical project'
\echo '  • Verify data is fully deleted from database'
\echo '  • Check audit log entry was created'
\echo '  • Run full testing guide for comprehensive validation'
\echo ''
\echo '══════════════════════════════════════════════════════════════'
