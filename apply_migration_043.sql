-- ══════════════════════════════════════════════════════════════════════════════
-- Apply Migration 043: Fix Project Deletion Permissions
-- ══════════════════════════════════════════════════════════════════════════════

\echo '============================================'
\echo 'Migration 043: Fix Project Deletion Permissions'
\echo '============================================'
\echo ''

-- Apply the migration
\i supabase/migrations/043_fix_project_deletion_permissions.sql

\echo ''
\echo '============================================'
\echo 'Verification: Check RLS Policies'
\echo '============================================'
\echo ''

-- Show the updated DELETE policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
  AND policyname = 'projects_delete';

\echo ''
\echo '============================================'
\echo 'Verification: Check Helper Functions'
\echo '============================================'
\echo ''

-- Show the new helper function
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_project_owner', 'is_project_owner_or_lead', 'is_admin');

\echo ''
\echo '============================================'
\echo 'Migration 043 Applied Successfully!'
\echo '============================================'
\echo ''
\echo 'Project Deletion Permissions:'
\echo '  ✓ Super Admin - Can delete ANY project'
\echo '  ✓ Admin - Can delete ANY project'
\echo '  ✓ Project Owner - Can delete ONLY their projects'
\echo '  ✗ Project Lead - CANNOT delete projects'
\echo '  ✗ Project Member - CANNOT delete projects'
\echo '  ✗ Project Viewer - CANNOT delete projects'
\echo ''
