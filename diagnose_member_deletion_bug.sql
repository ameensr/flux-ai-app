-- Diagnose the Member deletion bug where all data gets deleted
-- 
-- PROBLEM: syncRowsToDatabase() uses "delete all + reinsert" strategy
-- This causes ALL project data to be deleted when a Member deletes a single row
--
-- ROOT CAUSE: Lines 663-675 in store.ts:
--   await supabase.from('daily_support_logs').delete().eq('project_id', selectedProjectId)
--
-- This query deletes ALL rows for the project, regardless of who should see them.
-- After deletion, only rows in the user's local state get reinserted.
-- If a Member's state is stale or incomplete, data is lost.

-- Step 1: Check current RLS policies for DELETE operations
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename IN ('daily_support_logs', 'daily_release_testing_status')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- Step 2: Test what a Member can see vs delete
-- Replace 'MEMBER_USER_ID' with actual member user ID
-- Replace 'PROJECT_ID' with actual project ID

-- What can Member see?
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'MEMBER_USER_ID';

SELECT COUNT(*) as visible_rows
FROM daily_support_logs
WHERE project_id = 'PROJECT_ID';

-- What can Member delete? (This should be the same as what they can see)
-- But the DELETE policy might be more restrictive than SELECT

-- Step 3: Check the helper functions used in RLS policies
SELECT routine_schema, routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name IN ('is_project_member', 'can_edit_in_project', 'is_admin');

-- RECOMMENDED FIX:
-- Option 1: Use row-by-row deletion instead of bulk delete
--   Delete only the specific row IDs that were removed from state
--   This requires tracking which rows were deleted from the UI
--
-- Option 2: Fix the WHERE clause to only delete user's own rows
--   Change: .delete().eq('project_id', selectedProjectId)
--   To: .delete().eq('project_id', selectedProjectId).eq('user_id', user.id)
--   But this breaks team-based permissions where Members can delete others' rows
--
-- Option 3: Use UPDATE instead of DELETE+INSERT (safer)
--   Use upsert with conflict resolution
--   Track which rows were actually deleted
--   Send separate DELETE commands for only those rows
--
-- Option 4: Fix the state management issue
--   Ensure Member's supportRows state always contains ALL project data
--   before calling syncRowsToDatabase()
