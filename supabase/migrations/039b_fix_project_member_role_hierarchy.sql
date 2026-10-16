-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 039: Fix Project Member Role Hierarchy
-- 
-- Prevents leads from modifying owners and enforces role hierarchy
-- Super admins have no restrictions
-- Owner > Lead > Member > Viewer hierarchy enforced
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Enhanced admin check (includes super_admin)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Function to check if user can modify target member's role
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_modify_project_member_role(
  p_member_id UUID,
  p_new_role TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_current_user_role TEXT;
  v_target_current_role TEXT;
  v_project_id UUID;
  v_owner_count INT;
BEGIN
  -- Super admins can do anything
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Admins and managers can do anything
  IF public.is_admin() OR public.is_project_manager() THEN
    RETURN TRUE;
  END IF;

  -- Get project_id and target member's current role
  SELECT project_id, project_role INTO v_project_id, v_target_current_role
  FROM public.project_members
  WHERE id = p_member_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get current user's role in this project
  SELECT project_role INTO v_current_user_role
  FROM public.project_members
  WHERE project_id = v_project_id AND user_id = auth.uid();

  IF v_current_user_role IS NULL THEN
    RETURN FALSE; -- Not a member of this project
  END IF;

  -- Owners can modify anyone except they need to maintain at least one owner
  IF v_current_user_role = 'owner' THEN
    -- Prevent removing/demoting last owner
    IF v_target_current_role = 'owner' AND p_new_role != 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      
      IF v_owner_count <= 1 THEN
        RETURN FALSE; -- Cannot remove/demote last owner
      END IF;
    END IF;
    RETURN TRUE;
  END IF;

  -- Leads CANNOT modify owners or assign owner role
  IF v_current_user_role = 'lead' THEN
    -- Cannot modify anyone with owner role
    IF v_target_current_role = 'owner' THEN
      RETURN FALSE;
    END IF;
    -- Cannot assign owner role
    IF p_new_role = 'owner' THEN
      RETURN FALSE;
    END IF;
    -- Can modify leads, members, and viewers
    RETURN TRUE;
  END IF;

  -- Members and viewers cannot modify anyone
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_modify_project_member_role IS 
  'Enforces role hierarchy: Super admins (no restrictions), Owners (can modify anyone but must keep 1 owner), Leads (cannot touch owners or create owners), Members/Viewers (no modify rights)';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Function to check if user can remove a member
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_remove_project_member(
  p_member_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_current_user_role TEXT;
  v_target_role TEXT;
  v_target_user_id UUID;
  v_project_id UUID;
  v_owner_count INT;
BEGIN
  -- Super admins can remove anyone
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Admins and managers can remove anyone
  IF public.is_admin() OR public.is_project_manager() THEN
    RETURN TRUE;
  END IF;

  -- Get member details
  SELECT project_id, project_role, user_id INTO v_project_id, v_target_role, v_target_user_id
  FROM public.project_members
  WHERE id = p_member_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Users can remove themselves (leave project)
  IF v_target_user_id = auth.uid() THEN
    -- But not if they're the last owner
    IF v_target_role = 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      
      IF v_owner_count <= 1 THEN
        RETURN FALSE; -- Last owner cannot leave
      END IF;
    END IF;
    RETURN TRUE;
  END IF;

  -- Get current user's role
  SELECT project_role INTO v_current_user_role
  FROM public.project_members
  WHERE project_id = v_project_id AND user_id = auth.uid();

  IF v_current_user_role IS NULL THEN
    RETURN FALSE; -- Not a member
  END IF;

  -- Owners can remove anyone except last owner
  IF v_current_user_role = 'owner' THEN
    IF v_target_role = 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count
      FROM public.project_members
      WHERE project_id = v_project_id AND project_role = 'owner';
      
      IF v_owner_count <= 1 THEN
        RETURN FALSE; -- Cannot remove last owner
      END IF;
    END IF;
    RETURN TRUE;
  END IF;

  -- Leads cannot remove owners
  IF v_current_user_role = 'lead' THEN
    IF v_target_role = 'owner' THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  -- Members and viewers cannot remove anyone
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_remove_project_member IS 
  'Enforces removal permissions: Super admins (no restrictions), Users can leave unless last owner, Owners can remove anyone but last owner, Leads cannot remove owners';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Replace RLS policies for project_members
-- ══════════════════════════════════════════════════════════════════════════════

-- UPDATE policy with role hierarchy enforcement
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;

CREATE POLICY "project_members_update" ON public.project_members 
FOR UPDATE 
USING (
  public.can_modify_project_member_role(id, project_role)
);

-- DELETE policy with role hierarchy enforcement
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

CREATE POLICY "project_members_delete" ON public.project_members 
FOR DELETE 
USING (
  public.can_remove_project_member(id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Triggers to prevent last owner removal/demotion
-- ══════════════════════════════════════════════════════════════════════════════

-- Trigger function to prevent last owner role change
CREATE OR REPLACE FUNCTION public.prevent_last_owner_role_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_owner_count INT;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin (they bypass all restrictions)
  SELECT public.is_super_admin() INTO v_is_super_admin;
  IF v_is_super_admin THEN
    RETURN NEW;
  END IF;

  -- Only check if we're changing FROM owner TO something else
  IF OLD.project_role = 'owner' AND NEW.project_role != 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.project_members
    WHERE project_id = OLD.project_id AND project_role = 'owner';
    
    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last project owner. Assign another owner first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_owner_role_change_trigger ON public.project_members;
CREATE TRIGGER prevent_last_owner_role_change_trigger
  BEFORE UPDATE OF project_role ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_role_change();

-- Trigger function to prevent last owner deletion
CREATE OR REPLACE FUNCTION public.prevent_last_owner_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_owner_count INT;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin (they bypass all restrictions)
  SELECT public.is_super_admin() INTO v_is_super_admin;
  IF v_is_super_admin THEN
    RETURN OLD;
  END IF;

  IF OLD.project_role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.project_members
    WHERE project_id = OLD.project_id AND project_role = 'owner';
    
    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last project owner. Assign another owner first.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_owner_deletion_trigger ON public.project_members;
CREATE TRIGGER prevent_last_owner_deletion_trigger
  BEFORE DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_deletion();

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Comments and documentation
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TRIGGER prevent_last_owner_role_change_trigger ON public.project_members IS 
  'Prevents demoting the last project owner (super_admins bypass this)';

COMMENT ON TRIGGER prevent_last_owner_deletion_trigger ON public.project_members IS 
  'Prevents removing the last project owner (super_admins bypass this)';

-- ══════════════════════════════════════════════════════════════════════════════
-- Migration complete
-- ══════════════════════════════════════════════════════════════════════════════
