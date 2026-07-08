-- ══════════════════════════════════════════════════════════════════════════════
-- Test Project Deletion Permissions - Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Verify the new function exists
-- ══════════════════════════════════════════════════════════════════════════════

SELECT '✓ Checking if is_project_owner() function exists...' AS status;

SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'is_project_owner';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Verify the DELETE policy was updated
-- ══════════════════════════════════════════════════════════════════════════════

SELECT '✓ Checking projects_delete RLS policy...' AS status;

SELECT 
  policyname,
  cmd,
  qual AS policy_definition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
  AND policyname = 'projects_delete';

-- Expected: Should see "is_project_owner(id)" in the policy, NOT "is_project_owner_or_lead(id)"

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Check your current user info and permissions
-- ══════════════════════════════════════════════════════════════════════════════

SELECT '✓ Your current user information...' AS status;

SELECT 
  id AS user_id,
  email,
  full_name,
  role AS global_role,
  CASE 
    WHEN role IN ('super_admin', 'admin') THEN '✅ YES - Can delete ANY project'
    ELSE '⚠️  Can only delete projects where you are OWNER'
  END AS deletion_capability
FROM profiles
WHERE id = auth.uid();

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. View all projects with your deletion permissions
-- ══════════════════════════════════════════════════════════════════════════════

SELECT '✓ All projects and your deletion permissions...' AS status;

SELECT 
  p.id,
  p.name,
  p.status,
  p.created_at,
  COALESCE(pm.project_role, '(not a member)') AS your_project_role,
  public.is_project_owner(p.id) AS can_delete_as_owner,
  public.is_admin() AS can_delete_as_admin,
  CASE 
    WHEN public.is_admin() THEN '✅ YES - Admin/Super Admin'
    WHEN public.is_project_owner(p.id) THEN '✅ YES - Project Owner'
    WHEN pm.project_role = 'lead' THEN '❌ NO - Lead (cannot delete after migration 043)'
    WHEN pm.project_role = 'member' THEN '❌ NO - Member'
    WHEN pm.project_role = 'viewer' THEN '❌ NO - Viewer'
    ELSE '❌ NO - Not a member'
  END AS can_delete_project
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = auth.uid()
ORDER BY p.created_at DESC;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Summary of who can delete each project
-- ══════════════════════════════════════════════════════════════════════════════

SELECT '✓ Summary: Who can delete each project...' AS status;

SELECT 
  p.name AS project_name,
  p.status,
  COUNT(CASE WHEN pm.project_role = 'owner' THEN 1 END) AS owner_count,
  COUNT(CASE WHEN pm.project_role = 'lead' THEN 1 END) AS lead_count,
  COUNT(CASE WHEN pm.project_role = 'member' THEN 1 END) AS member_count,
  STRING_AGG(
    CASE WHEN pm.project_role = 'owner' 
    THEN prof.email 
    END, ', '
  ) AS owners_who_can_delete,
  '+ All Admins/Super Admins' AS also_can_delete
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN profiles prof ON pm.user_id = prof.id
GROUP BY p.id, p.name, p.status
ORDER BY p.created_at DESC;

-- ══════════════════════════════════════════════════════════════════════════════
-- FINAL STATUS
-- ══════════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ Migration 043 Verification Complete!' AS status,
  'Project deletion is now restricted to:' AS rule_1,
  '  1. Super Admin (any project)' AS rule_2,
  '  2. Admin (any project)' AS rule_3,
  '  3. Project Owners (only their projects)' AS rule_4,
  '  ❌ Project Leads can NO LONGER delete' AS rule_5;
