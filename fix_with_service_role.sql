-- ============================================
-- FIX: Add data owner to project
-- Run this with SERVICE ROLE or as postgres superuser
-- ============================================

-- Step 1: Find who created the data
SELECT DISTINCT user_id 
FROM daily_release_testing_status 
WHERE project_id = 'cb556709-2a12-40f8-95f4-49e02fe85e64';

-- Step 2: Also check support logs
SELECT DISTINCT user_id 
FROM daily_support_logs
WHERE project_id = 'cb556709-2a12-40f8-95f4-49e02fe85e64';

-- Step 3: Show that user's email (to verify it's the right person)
-- Replace 'USER-ID-FROM-STEP-1' with actual UUID
SELECT id, email 
FROM auth.users 
WHERE id = 'USER-ID-FROM-STEP-1';

-- Step 4: Add that user to the project
-- Replace 'USER-ID-FROM-STEP-1' with actual UUID
INSERT INTO project_members (project_id, user_id)
VALUES (
  'cb556709-2a12-40f8-95f4-49e02fe85e64',
  'USER-ID-FROM-STEP-1'
)
ON CONFLICT (project_id, user_id) DO NOTHING;  -- Skip if already exists

-- Step 5: Verify the member was added
SELECT 
  pm.*,
  u.email
FROM project_members pm
LEFT JOIN auth.users u ON u.id = pm.user_id
WHERE pm.project_id = 'cb556709-2a12-40f8-95f4-49e02fe85e64';
