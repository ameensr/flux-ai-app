-- ══════════════════════════════════════════════════════════════════════════════
-- Verify Project Deletion Permissions
-- 
-- This script helps verify that project deletion permissions are correctly
-- configured after applying migration 043.
-- ══════════════════════════════════════════════════════════════════════════════

\echo '══════════════════════════════════════════════════════════════'
\echo 'PROJECT DELETION PERMISSIONS VERIFICATION'
\echo '══════════════════════════════════════════════════════════════'
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Check if migration 043 functions exist
-- ══════════════════════════════════════════════════════════════════════════════

\echo '1. Checking Helper Functions:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  proname AS function_name,
  CASE 
    WHEN proname = 'is_project_owner' THEN '✓ NEW - Checks owner role only'
    WHEN proname = 'is_project_owner_or_lead' THEN '✓ EXISTS - Checks owner OR lead'
    WHEN proname = 'is_admin' THEN '✓ EXISTS - Checks admin/super_admin'
    ELSE 'Unknown'
  END AS description
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('is_project_owner', 'is_project_owner_or_lead', 'is_admin')
ORDER BY proname;

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Check RLS Policy for projects DELETE
-- ══════════════════════════════════════════════════════════════════════════════

\echo '2. Project DELETE RLS Policy:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  policyname AS policy_name,
  cmd AS command,
  qual AS policy_definition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
  AND policyname = 'projects_delete';

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Show current user's permissions
-- ══════════════════════════════════════════════════════════════════════════════

\echo '3. Current User Information:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  auth.uid() AS user_id,
  prof.email,
  prof.full_name,
  prof.role AS global_role,
  public.is_admin() AS is_admin,
  CASE 
    WHEN public.is_admin() THEN 'Can delete ANY project'
    ELSE 'Can only delete projects where you are owner'
  END AS deletion_capability
FROM profiles prof
WHERE prof.id = auth.uid();

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Show projects and your deletion permissions
-- ══════════════════════════════════════════════════════════════════════════════

\echo '4. Your Projects and Deletion Permissions:'
\echo '──────────────────────────────────────────────────────────────'

SELECT 
  p.id,
  p.name,
  p.status,
  COALESCE(pm.project_role, 'Not a member') AS your_role,
  public.is_project_owner(p.id) AS can_delete_as_owner,
  public.is_admin() AS can_delete_as_admin,
  CASE 
    WHEN public.is_admin() THEN '✓ YES - Admin/Super Admin'
    WHEN public.is_project_owner(p.id) THEN '✓ YES - Project Owner'
    WHEN pm.project_role = 'lead' THEN '✗ NO - Project Lead (restricted)'
    WHEN pm.project_role = 'member' THEN '✗ NO - Project Member'
    WHEN pm.project_role = 'viewer' THEN '✗ NO - Project Viewer'
    ELSE '✗ NO - Not a member'
  END AS can_delete
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = auth.uid()
ORDER BY p.created_at DESC
LIMIT 20;

\echo ''
\echo ''

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Summary of deletion rules
-- ══════════════════════════════════════════════════════════════════════════════

\echo '5. Project Deletion Rules Summary:'
\echo '──────────────────────────────────────────────────────────────'
\echo ''
\echo '  ROLE                    | CAN DELETE ANY | CAN DELETE OWN'
\echo '  ----------------------- | -------------- | --------------'
\echo '  Super Admin             | ✓ YES          | ✓ YES'
\echo '  Admin                   | ✓ YES          | ✓ YES'
\echo '  Manager                 | ✗ NO           | ✗ NO'
\echo '  QA Lead                 | ✗ NO           | ✗ NO'
\echo '  Project Owner           | ✗ NO           | ✓ YES'
\echo '  Project Lead            | ✗ NO           | ✗ NO'
\echo '  Project Member          | ✗ NO           | ✗ NO'
\echo '  Project Viewer          | ✗ NO           | ✗ NO'
\echo ''
\echo '══════════════════════════════════════════════════════════════'
\echo 'VERIFICATION COMPLETE'
\echo '══════════════════════════════════════════════════════════════'
\echo ''
\echo 'Key Changes from Migration 043:'
\echo '  • Project Leads can NO LONGER delete projects'
\echo '  • Only Project Owners can delete their own projects'
\echo '  • Admins and Super Admins can delete any project'
\echo ''
