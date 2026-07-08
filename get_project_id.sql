-- ============================================
-- GET PROJECT ID FOR YOUR DATA
-- ============================================

-- Step 1: List all active projects
-- Copy the 'id' column value from the project you want to use
SELECT 
  id as project_id,
  name as project_name,
  project_code,
  status,
  created_at
FROM projects 
WHERE status = 'active'
ORDER BY created_at DESC;

-- ============================================
-- After you have the project_id from above,
-- run these UPDATE queries:
-- ============================================

-- Step 2: Update Release Testing Status rows
-- REPLACE 'YOUR-PROJECT-ID-HERE' with actual UUID from Step 1
UPDATE daily_release_testing_status 
SET project_id = 'YOUR-PROJECT-ID-HERE'
WHERE project_id IS NULL;

-- Step 3: Update Support Logs rows  
-- REPLACE 'YOUR-PROJECT-ID-HERE' with actual UUID from Step 1
UPDATE daily_support_logs
SET project_id = 'YOUR-PROJECT-ID-HERE'
WHERE project_id IS NULL;

-- ============================================
-- Verify the update worked:
-- ============================================

-- Step 4: Check Release Testing Status
SELECT 
  id,
  task_id,
  description,
  project_id,
  user_id,
  created_at
FROM daily_release_testing_status
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Check Support Logs
SELECT 
  id,
  support_id,
  description,
  project_id,
  user_id,
  created_at
FROM daily_support_logs
ORDER BY created_at DESC
LIMIT 10;
