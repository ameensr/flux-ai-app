-- ============================================
-- STEP 1: Get your user_id (run this first)
-- ============================================
SELECT auth.uid() as your_user_id;

-- ✋ STOP HERE
-- Copy the UUID you see above (looks like: c7fc45e0-b69c-4409-85db-23e7cce1d346)
-- Then continue to STEP 2


-- ============================================
-- STEP 2: Add yourself to the project
-- ============================================
-- ⚠️ Replace 'PASTE-YOUR-USER-ID-HERE' with the UUID from STEP 1

INSERT INTO project_members (project_id, user_id)
VALUES (
  'cb556709-2a12-40f8-95f4-49e02fe85e64',  -- Your project_id (already correct)
  'PASTE-YOUR-USER-ID-HERE'                 -- Replace with YOUR user_id from STEP 1
);

-- If this fails with "null value in column", try this instead:
-- (Some project_members tables have different columns)

/*
INSERT INTO project_members (id, project_id, user_id, member_role)
VALUES (
  gen_random_uuid(),                        -- Generate new ID
  'cb556709-2a12-40f8-95f4-49e02fe85e64',  -- Your project_id
  'PASTE-YOUR-USER-ID-HERE',                -- Your user_id from STEP 1
  'member'                                  -- Default role
);
*/


-- ============================================
-- STEP 3: Verify you're now a member
-- ============================================
SELECT * 
FROM project_members 
WHERE project_id = 'cb556709-2a12-40f8-95f4-49e02fe85e64'
  AND user_id = auth.uid();

-- Should return 1 row showing you're a member!


-- ============================================
-- STEP 4: Check if you can now see the data
-- ============================================
SELECT 
  id,
  task_id,
  description,
  project_id
FROM daily_release_testing_status
WHERE project_id = 'cb556709-2a12-40f8-95f4-49e02fe85e64'
LIMIT 10;

-- If you see rows here, SUCCESS! ✅
-- Now go to your browser:
-- 1. Hard refresh (Ctrl + Shift + R)
-- 2. Select project "cb556709-2a12-40f8-95f4-49e02fe85e64" in dropdown
-- 3. Your data should appear!
