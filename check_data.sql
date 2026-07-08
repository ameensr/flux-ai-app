-- Run this in Supabase SQL Editor to check your data

-- 1. Count total rows in both tables
SELECT 'Support Logs' as table_name, COUNT(*) as total_rows FROM daily_support_logs
UNION ALL
SELECT 'Release Testing' as table_name, COUNT(*) as total_rows FROM daily_release_testing_status;

-- 2. Show recent Support Log entries
SELECT 
  id, 
  support_id, 
  description, 
  user_id,
  project_id,
  created_at 
FROM daily_support_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Show recent Release Testing entries
SELECT 
  id, 
  task_id, 
  description, 
  user_id,
  project_id,
  created_at 
FROM daily_release_testing_status 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if RLS is blocking your view
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('daily_support_logs', 'daily_release_testing_status');
