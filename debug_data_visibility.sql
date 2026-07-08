-- ============================================
-- DEBUG: Why can't I see my data?
-- ============================================

-- 1. Check if data exists with project_id set
SELECT 
  'Release Testing' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as null_project_rows,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as has_project_rows
FROM daily_release_testing_status
UNION ALL
SELECT 
  'Support Logs' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as null_project_rows,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as has_project_rows
FROM daily_support_logs;

-- 2. Show actual project_id values in your data
SELECT 
  'Release Testing' as source,
  id,
  task_id,
  project_id,
  user_id,
  created_at
FROM daily_release_testing_status
ORDER BY created_at DESC
LIMIT 10;

-- 3. Show actual project_id values in support logs
SELECT 
  'Support Logs' as source,
  id,
  support_id,
  project_id,
  user_id,
  created_at
FROM daily_support_logs
ORDER BY created_at DESC
LIMIT 10;

-- 4. Get YOUR current user_id
SELECT 
  auth.uid() as your_user_id,
  auth.email() as your_email;

-- 5. Check if YOU are a member of the project
-- REPLACE 'YOUR-PROJECT-ID' with the project_id you see in step 2/3
SELECT 
  pm.user_id,
  pm.project_id,
  u.email,
  pm.created_at
FROM project_members pm
LEFT JOIN auth.users u ON u.id = pm.user_id
WHERE pm.project_id = 'YOUR-PROJECT-ID';

-- 6. Check project_members for YOUR user
SELECT 
  pm.project_id,
  p.name as project_name,
  p.project_code,
  pm.created_at as member_since
FROM project_members pm
LEFT JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = auth.uid();

-- 7. Test RLS SELECT policy directly
-- This shows if RLS is blocking your view
SELECT 
  id,
  task_id,
  project_id,
  user_id,
  -- Check RLS conditions
  (user_id = auth.uid()) as is_your_row,
  (SELECT is_admin()) as you_are_admin,
  (SELECT is_project_member(project_id)) as you_are_member
FROM daily_release_testing_status
LIMIT 5;
