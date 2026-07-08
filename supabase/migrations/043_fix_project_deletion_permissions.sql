-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 043: Fix Project Deletion Permissions
-- 
-- Description:
--   Restricts project deletion to:
--   - Super Admin (can delete any project)
--   - Admin (can delete any project)
--   - Project Owner ONLY (not Project Leads)
--
-- Changes:
--   1. Create new helper function to check if user is project owner (not lead)
--   2. Update projects_delete RLS policy to only allow owners (not leads)
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Create helper function to check if user is project owner
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid 
      AND user_id = auth.uid() 
      AND project_role = 'owner'
  )
$$;

COMMENT ON FUNCTION public.is_project_owner(UUID) IS 
  'Returns true if the current user is an owner of the specified project (excludes leads)';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Update projects DELETE policy to restrict to owners only
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- DELETE: Only super_admin, admin, and project owners can delete
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (
  public.is_admin() OR public.is_project_owner(id)
);

COMMENT ON POLICY "projects_delete" ON public.projects IS 
  'Only super_admin, admin, and project owners can delete projects. Project leads cannot delete.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Verification Query (commented out - for manual testing)
-- ══════════════════════════════════════════════════════════════════════════════

/*
-- Test as project owner - should succeed
-- Test as project lead - should fail
-- Test as admin - should succeed
-- Test as super_admin - should succeed

SELECT 
  p.id,
  p.name,
  pm.project_role,
  public.is_project_owner(p.id) AS can_delete_as_owner,
  public.is_admin() AS can_delete_as_admin
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = auth.uid()
ORDER BY p.created_at DESC;
*/
