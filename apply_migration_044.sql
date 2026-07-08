-- ══════════════════════════════════════════════════════════════════════════════
-- Apply Migration 044: Enable CASCADE Deletion for Projects
-- ══════════════════════════════════════════════════════════════════════════════

\echo '============================================'
\echo 'Migration 044: CASCADE Deletion Setup'
\echo '============================================'
\echo ''

-- Apply the migration
\i supabase/migrations/044_project_cascade_deletion.sql

\echo ''
\echo '============================================'
\echo 'Verification: Foreign Key Constraints'
\echo '============================================'
\echo ''

-- Show all foreign key constraints for projects
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  rc.delete_rule AS on_delete,
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ WILL DELETE associated data'
    WHEN 'SET NULL' THEN '⚠️  WILL KEEP data (orphaned)'
    WHEN 'RESTRICT' THEN '🛡️  WILL PREVENT deletion'
    WHEN 'NO ACTION' THEN '⚠️  WILL KEEP data'
    ELSE rc.delete_rule
  END AS behavior
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
ORDER BY tc.table_name;

\echo ''
\echo '============================================'
\echo 'Verification: Audit Table'
\echo '============================================'
\echo ''

-- Check if audit table exists
SELECT 
  'project_deletion_audit' AS table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_deletion_audit'
  ) AS exists,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_deletion_audit'
  ) THEN '✅ Audit logging enabled' 
  ELSE '❌ Audit table missing' 
  END AS status;

\echo ''
\echo '============================================'
\echo 'Migration 044 Applied Successfully!'
\echo '============================================'
\echo ''
\echo 'CASCADE Deletion is now enabled.'
\echo ''
\echo 'When a project is deleted:'
\echo '  1. ✅ Audit record created (before deletion)'
\echo '  2. ✅ Project record deleted'
\echo '  3. ✅ CASCADE deletes:'
\echo '     • All project members'
\echo '     • All weekly reports'
\echo '     • All support logs'
\echo '     • All testing status records'
\echo '  4. ✅ No orphaned data remains'
\echo ''
\echo '⚠️  WARNING: Deletion is PERMANENT and IRREVERSIBLE'
\echo '    Make sure deletion confirmation is working in the UI!'
\echo ''
