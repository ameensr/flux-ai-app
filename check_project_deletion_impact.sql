-- ══════════════════════════════════════════════════════════════════════════════
-- Check What Happens When Project is Deleted
-- Run this in Supabase SQL Editor to see current configuration
-- ══════════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo 'PROJECT DELETION - DATA IMPACT ANALYSIS'
\echo '══════════════════════════════════════════════════════════════'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Check Foreign Key Constraints
-- ══════════════════════════════════════════════════════════════════════════════

\echo '1. Foreign Key Constraints (What happens on DELETE):'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule AS on_delete_action,
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ Data WILL BE DELETED'
    WHEN 'SET NULL' THEN '⚠️  Data WILL BE KEPT (project_id becomes NULL)'
    WHEN 'RESTRICT' THEN '🛡️  PREVENTS deletion if data exists'
    WHEN 'NO ACTION' THEN '⚠️  Data WILL BE KEPT (no action)'
    ELSE rc.delete_rule
  END AS impact
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
ORDER BY 
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN 1
    WHEN 'SET NULL' THEN 2
    WHEN 'RESTRICT' THEN 3
    ELSE 4
  END,
  tc.table_name;

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Count Data by Project
-- ══════════════════════════════════════════════════════════════════════════════

\echo '2. Data Count by Project (What would be affected):'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.status,
  COUNT(DISTINCT pm.id) AS member_count,
  COUNT(DISTINCT wr.id) AS qa_report_count,
  COUNT(DISTINCT dsl.id) AS support_log_count,
  COUNT(DISTINCT drts.id) AS release_testing_count,
  CASE 
    WHEN COUNT(DISTINCT wr.id) + COUNT(DISTINCT dsl.id) + COUNT(DISTINCT drts.id) = 0
    THEN '✅ Safe to delete (no data)'
    ELSE '⚠️  Has data that will become orphaned'
  END AS deletion_impact
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN weekly_reports wr ON p.id = wr.project_id
LEFT JOIN daily_support_logs dsl ON p.id = dsl.project_id
LEFT JOIN daily_release_testing_status drts ON p.id = drts.project_id
GROUP BY p.id, p.name, p.status
ORDER BY 
  (COUNT(DISTINCT wr.id) + COUNT(DISTINCT dsl.id) + COUNT(DISTINCT drts.id)) DESC,
  p.created_at DESC;

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Orphaned Data Check
-- ══════════════════════════════════════════════════════════════════════════════

\echo '3. Currently Orphaned Data (project_id IS NULL):'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  'Weekly Reports (QA)' AS data_type,
  COUNT(*) AS orphaned_count,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record
FROM weekly_reports
WHERE project_id IS NULL

UNION ALL

SELECT 
  'Support Logs (Daily)' AS data_type,
  COUNT(*) AS orphaned_count,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record
FROM daily_support_logs
WHERE project_id IS NULL

UNION ALL

SELECT 
  'Release Testing (Daily)' AS data_type,
  COUNT(*) AS orphaned_count,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record
FROM daily_release_testing_status
WHERE project_id IS NULL;

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Simulate Project Deletion Impact
-- ══════════════════════════════════════════════════════════════════════════════

\echo '4. Deletion Impact Simulation (What would happen):'
\echo '──────────────────────────────────────────────────────────────'
\echo ''
\echo 'If you delete a project right now:'
\echo ''
\echo '  ✅ WILL BE DELETED:'
\echo '     • Project record'
\echo '     • Project members (CASCADE)'
\echo ''
\echo '  ⚠️  WILL REMAIN (Orphaned, project_id becomes NULL):'
\echo '     • QA Weekly Reports → /qa-report page'
\echo '     • Daily Support & Exception Logs → /daily-report page'
\echo '     • Daily Release Testing Status → /daily-report page'
\echo ''
\echo '  ❓ POTENTIAL ISSUES:'
\echo '     • Orphaned data takes up database space'
\echo '     • Data might still appear in user views'
\echo '     • Loss of project context for historical data'
\echo '     • Cannot filter by deleted project'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Recommendations
-- ══════════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo 'RECOMMENDATIONS'
\echo '══════════════════════════════════════════════════════════════'
\echo ''
\echo 'Current Behavior: ON DELETE SET NULL'
\echo '  → Data is KEPT but becomes orphaned'
\echo ''
\echo 'Consider implementing one of these solutions:'
\echo ''
\echo '1. CASCADE DELETE (Clean Removal)'
\echo '   Pros: Clean deletion, no orphans'
\echo '   Cons: Permanent data loss'
\echo '   Use case: Temporary/test projects'
\echo ''
\echo '2. SOFT DELETE (Archive) ⭐ RECOMMENDED'
\echo '   Pros: Data preserved, can restore'
\echo '   Cons: More complex'
\echo '   Use case: Production with audit requirements'
\echo ''
\echo '3. RESTRICT DELETE (Prevent if data exists)'
\echo '   Pros: Prevents accidental loss'
\echo '   Cons: More friction'
\echo '   Use case: Critical data protection'
\echo ''
\echo 'See: PROJECT_DELETION_DATA_IMPACT_ANALYSIS.md for details'
\echo ''
\echo '══════════════════════════════════════════════════════════════'
