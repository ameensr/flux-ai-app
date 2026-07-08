-- ============================================
-- STEP-BY-STEP: Fix Your Data Visibility
-- Run each query ONE AT A TIME and follow instructions
-- ============================================

-- ============================================
-- STEP 1: What project_id is in your data?
-- ============================================
-- Run this first, then COPY the project_id value you see
SELECT DISTINCT project_id 
FROM daily_release_testing_status 
WHERE project_id IS NOT NULL;

-- Expected output: A UUID like "dadb0db7-a1dd-464c-b2f6-e55d49585b53"
-- ✋ STOP HERE - Copy the UUID, then continue to STEP 2


-- ============================================
-- STEP 2: What is YOUR user_id?
-- ============================================
SELECT auth.uid() as your_user_id;

-- Expected output: Your UUID like "c7fc45e0-b69c-4409-85db-23e7cce1d346"
-- ✋ STOP HERE - Copy YOUR UUID, then continue to STEP 3


-- ============================================
-- STEP 3: Are you a member of that project?
-- ============================================
-- ⚠️ PASTE the project_id from STEP 1 below (replace the placeholder)
SELECT * 
FROM project_members 
WHERE project_id = 'PASTE-PROJECT-ID-HERE'
  AND user_id = auth.uid();

-- If this returns 0 rows → YOU ARE NOT A MEMBER! Go to STEP 4
-- If this returns 1 row → You ARE a member! Go to STEP 5


-- ============================================
-- STEP 4: Add yourself as a project member
-- ============================================
-- ⚠️ ONLY RUN THIS if STEP 3 returned 0 rows!
-- ⚠️ PASTE the project_id from STEP 1 below
INSERT INTO project_members (project_id, user_id)
VALUES (
  'PASTE-PROJECT-ID-HERE',  -- Replace with actual UUID from STEP 1
  auth.uid()                 -- This automatically gets YOUR user_id
);

-- After running this, go to STEP 5


-- ============================================
-- STEP 5: Verify you can now see the data
-- ============================================
-- ⚠️ PASTE the project_id from STEP 1 below
SELECT 
  id,
  task_id,
  description,
  project_id,
  user_id
FROM daily_release_testing_status
WHERE project_id = 'PASTE-PROJECT-ID-HERE'
LIMIT 10;

-- If you see rows here, SUCCESS! ✅
-- Now refresh your browser and select the project in the dropdown


-- ============================================
-- STEP 6: Check RLS is allowing access
-- ============================================
-- This tells you WHY you can/can't see the data
-- ⚠️ PASTE the project_id from STEP 1 below
SELECT 
  (SELECT auth.uid()) as your_user_id,
  (SELECT is_admin()) as you_are_admin,
  (SELECT is_project_member('PASTE-PROJECT-ID-HERE')) as you_are_project_member,
  (SELECT can_edit_in_project('PASTE-PROJECT-ID-HERE')) as you_can_edit;

-- Expected:
-- you_are_admin: true OR you_are_project_member: true
-- If both are false, you still can't access the data!
