-- ============================================
-- STEP 1: Find all tables related to projects
-- ============================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%project%'
ORDER BY table_name;


-- ============================================
-- STEP 2: Show project_members table structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_members'
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================
-- STEP 3: Show existing project_members records
-- ============================================
SELECT * FROM project_members LIMIT 10;


-- ============================================
-- STEP 4: Show your user info
-- ============================================
SELECT 
  auth.uid() as your_user_id,
  auth.email() as your_email;


-- ============================================
-- STEP 5: Show the project_id in your data
-- ============================================
SELECT 'Release Testing' as source, project_id 
FROM daily_release_testing_status 
WHERE project_id IS NOT NULL
UNION
SELECT 'Support Logs' as source, project_id 
FROM daily_support_logs
WHERE project_id IS NOT NULL;


-- ============================================
-- STEP 6: Check if you're already a member
-- ============================================
SELECT * 
FROM project_members 
WHERE user_id = auth.uid();
