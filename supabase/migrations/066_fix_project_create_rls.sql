-- ============================================================
-- 066: Fix project create RLS (INSERT … RETURNING)
--
-- After 065, projects_select is admin OR member only. createProject()
-- does INSERT … SELECT before the creator is added as a member, so
-- Postgres rejects RETURNING with:
--   "new row violates row-level security policy for table projects"
--
-- Fix:
--   1. Auto-add created_by as owner via AFTER INSERT trigger
--   2. Allow creators to SELECT their own projects (created_by)
--   3. Allow users to SELECT their own project_members rows
-- ============================================================

-- ── 1. Auto-assign project creator as owner ──────────────────────────────────
CREATE OR REPLACE FUNCTION private.add_project_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, project_role, assigned_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_add_creator_as_owner ON public.projects;
CREATE TRIGGER projects_add_creator_as_owner
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.add_project_creator_as_owner();

COMMENT ON FUNCTION private.add_project_creator_as_owner() IS
  'After a project is created, inserts the creator as owner so SELECT RLS and membership work immediately.';

-- ── 2. projects SELECT: admin, member, or creator ────────────────────────────
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
FOR SELECT USING (
  private.is_admin()
  OR private.is_project_member(id)
  OR created_by = auth.uid()
);

COMMENT ON POLICY "projects_select" ON public.projects IS
  'Admins see all. Members see their projects. Creators can always read projects they created (needed for INSERT RETURNING).';

-- ── 3. project_members SELECT: own rows + shared project members ─────────────
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select" ON public.project_members
FOR SELECT USING (
  private.is_admin()
  OR user_id = auth.uid()
  OR private.is_project_member(project_id)
);

COMMENT ON POLICY "project_members_select" ON public.project_members IS
  'Admins see all. Users always see their own membership rows. Members see others in the same project.';
