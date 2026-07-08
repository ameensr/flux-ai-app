-- ============================================
-- UNDERSTAND PROJECT_MEMBERS TABLE STRUCTURE
-- ============================================

-- Step 1: See the actual table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'project_members'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: See existing project_members records
SELECT * FROM project_members LIMIT 5;

-- Step 3: What is YOUR user_id?
SELECT auth.uid() as your_user_id;

-- Step 4: What project_id is in your data?
SELECT DISTINCT project_id 
FROM daily_release_testing_status 
WHERE project_id IS NOT NULL;

-- ============================================
-- After seeing the structure above, we'll know
-- how to properly insert you as a member
-- ============================================
