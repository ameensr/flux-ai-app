-- ============================================================
-- 065: Scope project visibility to membership (managers included)
--
-- Problem:
--   projects_select / project_members_select use is_project_manager(),
--   so ANY manager can see (and often manage) EVERY project — including
--   projects created by other managers they were never added to.
--
-- Desired:
--   - Admin / super_admin: unrestricted
--   - Manager (and all other roles): only projects they are members of
--   - Same membership boundary applies to Daily Update + QA Weekly Report
--     project pickers (they read from projects / project_members)
-- ============================================================

-- ── 1. projects SELECT: admin OR member only ─────────────────────────────────
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
FOR SELECT USING (
  private.is_admin()
  OR private.is_project_member(id)
);

COMMENT ON POLICY "projects_select" ON public.projects IS
  'Admins see all projects. Everyone else (including managers) only sees projects they belong to.';

-- ── 2. projects UPDATE: admin OR owner/lead (no blanket manager bypass) ──────
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
FOR UPDATE USING (
  private.is_admin()
  OR private.is_project_owner_or_lead(id)
);

COMMENT ON POLICY "projects_update" ON public.projects IS
  'Admins, or project owners/leads, can update project metadata.';

-- ── 3. project_members SELECT: admin OR member of that project ───────────────
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select" ON public.project_members
FOR SELECT USING (
  private.is_admin()
  OR private.is_project_member(project_id)
);

COMMENT ON POLICY "project_members_select" ON public.project_members IS
  'Admins see all memberships. Others only see memberships for projects they belong to.';

-- ── 4. project_members INSERT: admin, owner/lead, or creator self-bootstrap ──
-- Managers must NOT be able to join arbitrary projects. Creators still need to
-- insert their own initial owner row right after createProject().
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
CREATE POLICY "project_members_insert" ON public.project_members
FOR INSERT WITH CHECK (
  private.is_admin()
  OR private.is_project_owner_or_lead(project_id)
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.created_by = auth.uid()
    )
  )
);

COMMENT ON POLICY "project_members_insert" ON public.project_members IS
  'Admins / owners / leads can add members. Project creators may add themselves as the initial owner.';

-- ── 5. Member role/remove helpers: only admins get global bypass ─────────────
-- Managers previously bypassed hierarchy for EVERY project via is_project_manager().
CREATE OR REPLACE FUNCTION private.can_modify_project_member_role(
  p_member_id uuid,
  p_new_role  text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_role text;
  v_target_current_role text;
  v_project_id uuid;
  v_owner_count int;
BEGIN
  IF private.is_admin() THEN
    RETURN true;
  END IF;

  SELECT project_id, project_role INTO v_project_id, v_target_current_role
  FROM public.project_members WHERE id = p_member_id;

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT project_role INTO v_current_user_role
  FROM public.project_members
  WHERE project_id = v_project_id AND user_id = auth.uid();

  IF v_current_user_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_current_user_role = 'owner' THEN
    IF v_target_current_role = 'owner' AND p_new_role != 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      IF v_owner_count <= 1 THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF v_current_user_role = 'lead' THEN
    IF v_target_current_role = 'owner' THEN
      RETURN false;
    END IF;
    IF p_new_role = 'owner' THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_remove_project_member(
  p_member_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_role text;
  v_target_role text;
  v_target_user_id uuid;
  v_project_id uuid;
  v_owner_count int;
BEGIN
  IF private.is_admin() THEN
    RETURN true;
  END IF;

  SELECT project_id, project_role, user_id
  INTO v_project_id, v_target_role, v_target_user_id
  FROM public.project_members WHERE id = p_member_id;

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Users can leave a project themselves (except last owner)
  IF v_target_user_id = auth.uid() THEN
    IF v_target_role = 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      IF v_owner_count <= 1 THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  SELECT project_role INTO v_current_user_role
  FROM public.project_members
  WHERE project_id = v_project_id AND user_id = auth.uid();

  IF v_current_user_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_current_user_role = 'owner' THEN
    IF v_target_role = 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      IF v_owner_count <= 1 THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF v_current_user_role = 'lead' THEN
    IF v_target_role = 'owner' THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ── 6. weekly_reports UPDATE/DELETE: managers only within shared projects ────
DROP POLICY IF EXISTS "weekly_reports_update_team" ON public.weekly_reports;
CREATE POLICY "weekly_reports_update_team" ON public.weekly_reports
FOR UPDATE USING (
  auth.uid() = user_id
  OR private.is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('manager', 'qa_lead')
    )
    AND EXISTS (
      SELECT 1
      FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = weekly_reports.user_id
    )
  )
);

DROP POLICY IF EXISTS "weekly_reports_delete_team" ON public.weekly_reports;
CREATE POLICY "weekly_reports_delete_team" ON public.weekly_reports
FOR DELETE USING (
  auth.uid() = user_id
  OR private.is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('manager', 'qa_lead')
    )
    AND EXISTS (
      SELECT 1
      FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = weekly_reports.user_id
    )
  )
);

COMMENT ON POLICY "weekly_reports_update_team" ON public.weekly_reports IS
  'Own reports, admins, or managers/qa_leads who share a project with the author.';

COMMENT ON POLICY "weekly_reports_delete_team" ON public.weekly_reports IS
  'Own reports, admins, or managers/qa_leads who share a project with the author.';
