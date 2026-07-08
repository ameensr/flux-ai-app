-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 042: Daily Report Project-Role-Based Access Control
-- 
-- Description:
--   Implements granular access control based on project member roles:
--   - owner, lead, member: Can view, edit, delete all team data in their projects
--   - viewer: Can only view data (read-only access)
--
-- Changes:
--   1. Create helper function to get user's project role
--   2. Update RLS policies for daily_support_logs table
--   3. Update RLS policies for daily_release_testing_status table
--
-- Author: System
-- Date: 2026-07-08
-- ══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PART 1: Create Helper Function to Get User's Project Role
-- ============================================================================

-- Function to get user's role in a specific project
CREATE OR REPLACE FUNCTION public.get_user_project_role(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get the user's role in the specified project
  SELECT project_role INTO v_role
  FROM public.project_members
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_project_role(UUID) IS 
  'Returns the project role (owner, lead, member, viewer) of the current user in the specified project. Returns NULL if user is not a member.';


-- Function to check if user can edit in a project (not a viewer)
CREATE OR REPLACE FUNCTION public.can_edit_in_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Admins can always edit
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- If no project specified, allow edit (for backward compatibility)
  IF p_project_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's project role
  v_role := public.get_user_project_role(p_project_id);
  
  -- Allow edit if role is owner, lead, or member (not viewer, not null)
  RETURN v_role IN ('owner', 'lead', 'member');
END;
$$;

COMMENT ON FUNCTION public.can_edit_in_project(UUID) IS 
  'Returns TRUE if the current user can edit data in the specified project. Viewers return FALSE. Admins always return TRUE.';


-- ============================================================================
-- PART 2: Update RLS Policies for daily_support_logs
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "daily_support_logs_select" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_insert" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_update" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_delete" ON public.daily_support_logs;

-- SELECT: Anyone who is a project member can view
CREATE POLICY "daily_support_logs_select" ON public.daily_support_logs 
FOR SELECT 
USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL) -- Legacy rows without project
);

-- INSERT: Project members who can edit (not viewers)
CREATE POLICY "daily_support_logs_insert" ON public.daily_support_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    public.is_admin()
    OR project_id IS NULL -- Allow insert without project (legacy support)
    OR public.can_edit_in_project(project_id)
  )
);

-- UPDATE: Project members who can edit (not viewers) OR admins OR row creator
CREATE POLICY "daily_support_logs_update" ON public.daily_support_logs 
FOR UPDATE 
USING (
  public.is_admin() 
  OR (
    project_id IS NOT NULL 
    AND public.is_project_member(project_id)
    AND public.can_edit_in_project(project_id)
  )
  OR (
    project_id IS NULL 
    AND user_id = auth.uid() -- Legacy rows: only creator can edit
  )
);

-- DELETE: Project members who can edit (not viewers) OR admins OR row creator
CREATE POLICY "daily_support_logs_delete" ON public.daily_support_logs 
FOR DELETE 
USING (
  public.is_admin() 
  OR (
    project_id IS NOT NULL 
    AND public.is_project_member(project_id)
    AND public.can_edit_in_project(project_id)
  )
  OR (
    project_id IS NULL 
    AND user_id = auth.uid() -- Legacy rows: only creator can delete
  )
);


-- ============================================================================
-- PART 3: Update RLS Policies for daily_release_testing_status
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "daily_release_testing_status_select" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_insert" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_update" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_delete" ON public.daily_release_testing_status;

-- SELECT: Anyone who is a project member can view
CREATE POLICY "daily_release_testing_status_select" ON public.daily_release_testing_status 
FOR SELECT 
USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL) -- Legacy rows without project
);

-- INSERT: Project members who can edit (not viewers)
CREATE POLICY "daily_release_testing_status_insert" ON public.daily_release_testing_status 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    public.is_admin()
    OR project_id IS NULL -- Allow insert without project (legacy support)
    OR public.can_edit_in_project(project_id)
  )
);

-- UPDATE: Project members who can edit (not viewers) OR admins OR row creator
CREATE POLICY "daily_release_testing_status_update" ON public.daily_release_testing_status 
FOR UPDATE 
USING (
  public.is_admin() 
  OR (
    project_id IS NOT NULL 
    AND public.is_project_member(project_id)
    AND public.can_edit_in_project(project_id)
  )
  OR (
    project_id IS NULL 
    AND user_id = auth.uid() -- Legacy rows: only creator can edit
  )
);

-- DELETE: Project members who can edit (not viewers) OR admins OR row creator
CREATE POLICY "daily_release_testing_status_delete" ON public.daily_release_testing_status 
FOR DELETE 
USING (
  public.is_admin() 
  OR (
    project_id IS NOT NULL 
    AND public.is_project_member(project_id)
    AND public.can_edit_in_project(project_id)
  )
  OR (
    project_id IS NULL 
    AND user_id = auth.uid() -- Legacy rows: only creator can delete
  )
);


-- ============================================================================
-- PART 4: Grant Permissions
-- ============================================================================

-- Grant execute permissions on new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_project_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_in_project(UUID) TO authenticated;


-- ============================================================================
-- PART 5: Verification Queries (commented out)
-- ============================================================================

/*
-- Test queries to verify the new access control:

-- 1. Check if current user can edit in a specific project
SELECT public.can_edit_in_project('your-project-uuid-here');

-- 2. Get current user's role in a project
SELECT public.get_user_project_role('your-project-uuid-here');

-- 3. Test SELECT access (should see all project member rows)
SELECT * FROM daily_support_logs WHERE project_id = 'your-project-uuid-here';

-- 4. Test if a viewer can see but not edit:
--    (Run as a user with 'viewer' role in the project)
UPDATE daily_support_logs 
SET comments = 'Test edit' 
WHERE project_id = 'your-project-uuid-here' 
LIMIT 1;
-- Expected: Should fail for viewers, succeed for member/lead/owner

*/


-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
-- To rollback this migration, run:

-- Drop new functions
DROP FUNCTION IF EXISTS public.can_edit_in_project(UUID);
DROP FUNCTION IF EXISTS public.get_user_project_role(UUID);

-- Restore old RLS policies for daily_support_logs
DROP POLICY IF EXISTS "daily_support_logs_select" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_insert" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_update" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_delete" ON public.daily_support_logs;

CREATE POLICY "daily_support_logs_select" ON public.daily_support_logs FOR SELECT USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL)
);

CREATE POLICY "daily_support_logs_insert" ON public.daily_support_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "daily_support_logs_update" ON public.daily_support_logs FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);

CREATE POLICY "daily_support_logs_delete" ON public.daily_support_logs FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- Restore old RLS policies for daily_release_testing_status (similar pattern)
-- [Same as above but for daily_release_testing_status table]

*/
