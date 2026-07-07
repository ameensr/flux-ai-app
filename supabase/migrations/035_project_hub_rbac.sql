-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 035: Add Project Hub module to RBAC system
-- 
-- Adds the 'project-hub' module with granular permissions and assigns them
-- to appropriate roles (admin, super_admin, manager, qa_lead, etc.)
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Insert Project Hub module
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES (
  'project-hub',
  'Project Hub',
  '/project-hub',
  'FolderKanban',
  true,
  15 -- Position after dashboard, before other modules
)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Insert Project Hub permissions
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.permissions (permission_key, permission_name, description)
VALUES
  ('can_view', 'Can View', 'View projects and project details'),
  ('can_create', 'Can Create', 'Create new projects'),
  ('can_edit', 'Can Edit', 'Edit existing projects'),
  ('can_delete', 'Can Delete', 'Delete or archive projects'),
  ('can_assign_members', 'Can Assign Members', 'Add/remove members to/from projects'),
  ('can_manage_roles', 'Can Manage Roles', 'Change project roles for members')
ON CONFLICT (permission_key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Grant permissions to roles
-- ══════════════════════════════════════════════════════════════════════════════

-- Get IDs
DO $$
DECLARE
  v_module_id UUID;
  v_role_admin UUID;
  v_role_super_admin UUID;
  v_role_manager UUID;
  v_role_qa_lead UUID;
  v_role_qa_engineer UUID;
  v_role_developer UUID;
  v_role_standard UUID;
  v_role_pro UUID;
  v_role_free UUID;
  v_role_guest UUID;
  v_perm_view UUID;
  v_perm_create UUID;
  v_perm_edit UUID;
  v_perm_delete UUID;
  v_perm_assign UUID;
  v_perm_manage_roles UUID;
BEGIN
  -- Get module and role IDs
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'project-hub';
  SELECT id INTO v_role_admin FROM public.roles WHERE role_key = 'admin';
  SELECT id INTO v_role_super_admin FROM public.roles WHERE role_key = 'super_admin';
  SELECT id INTO v_role_manager FROM public.roles WHERE role_key = 'manager';
  SELECT id INTO v_role_qa_lead FROM public.roles WHERE role_key = 'qa_lead';
  SELECT id INTO v_role_qa_engineer FROM public.roles WHERE role_key = 'qa_engineer';
  SELECT id INTO v_role_developer FROM public.roles WHERE role_key = 'developer';
  SELECT id INTO v_role_standard FROM public.roles WHERE role_key = 'standard';
  SELECT id INTO v_role_pro FROM public.roles WHERE role_key = 'pro';
  SELECT id INTO v_role_free FROM public.roles WHERE role_key = 'free';
  SELECT id INTO v_role_guest FROM public.roles WHERE role_key = 'guest';
  
  -- Get permission IDs
  SELECT id INTO v_perm_view FROM public.permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_create FROM public.permissions WHERE permission_key = 'can_create';
  SELECT id INTO v_perm_edit FROM public.permissions WHERE permission_key = 'can_edit';
  SELECT id INTO v_perm_delete FROM public.permissions WHERE permission_key = 'can_delete';
  SELECT id INTO v_perm_assign FROM public.permissions WHERE permission_key = 'can_assign_members';
  SELECT id INTO v_perm_manage_roles FROM public.permissions WHERE permission_key = 'can_manage_roles';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- admin: Full access (all permissions)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_admin IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_admin, v_module_id, v_perm_view, true),
      (v_role_admin, v_module_id, v_perm_create, true),
      (v_role_admin, v_module_id, v_perm_edit, true),
      (v_role_admin, v_module_id, v_perm_delete, true),
      (v_role_admin, v_module_id, v_perm_assign, true),
      (v_role_admin, v_module_id, v_perm_manage_roles, true)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- super_admin: Full access (all permissions)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_super_admin IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_super_admin, v_module_id, v_perm_view, true),
      (v_role_super_admin, v_module_id, v_perm_create, true),
      (v_role_super_admin, v_module_id, v_perm_edit, true),
      (v_role_super_admin, v_module_id, v_perm_delete, true),
      (v_role_super_admin, v_module_id, v_perm_assign, true),
      (v_role_super_admin, v_module_id, v_perm_manage_roles, true)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- manager: Can create, edit, assign members, manage roles (org-wide)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_manager IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_manager, v_module_id, v_perm_view, true),
      (v_role_manager, v_module_id, v_perm_create, true),
      (v_role_manager, v_module_id, v_perm_edit, true),
      (v_role_manager, v_module_id, v_perm_delete, true),
      (v_role_manager, v_module_id, v_perm_assign, true),
      (v_role_manager, v_module_id, v_perm_manage_roles, true)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- qa_lead: Can create, edit own projects, assign members to own projects
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_qa_lead IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_qa_lead, v_module_id, v_perm_view, true),
      (v_role_qa_lead, v_module_id, v_perm_create, true),
      (v_role_qa_lead, v_module_id, v_perm_edit, true),
      (v_role_qa_lead, v_module_id, v_perm_delete, false), -- Can't delete by default
      (v_role_qa_lead, v_module_id, v_perm_assign, true),
      (v_role_qa_lead, v_module_id, v_perm_manage_roles, true)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- qa_engineer: View assigned projects only (no creation)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_qa_engineer IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_qa_engineer, v_module_id, v_perm_view, true),
      (v_role_qa_engineer, v_module_id, v_perm_create, false),
      (v_role_qa_engineer, v_module_id, v_perm_edit, false),
      (v_role_qa_engineer, v_module_id, v_perm_delete, false),
      (v_role_qa_engineer, v_module_id, v_perm_assign, false),
      (v_role_qa_engineer, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- developer: View assigned projects only
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_developer IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_developer, v_module_id, v_perm_view, true),
      (v_role_developer, v_module_id, v_perm_create, false),
      (v_role_developer, v_module_id, v_perm_edit, false),
      (v_role_developer, v_module_id, v_perm_delete, false),
      (v_role_developer, v_module_id, v_perm_assign, false),
      (v_role_developer, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- standard: View assigned projects only
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_standard IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_standard, v_module_id, v_perm_view, true),
      (v_role_standard, v_module_id, v_perm_create, false),
      (v_role_standard, v_module_id, v_perm_edit, false),
      (v_role_standard, v_module_id, v_perm_delete, false),
      (v_role_standard, v_module_id, v_perm_assign, false),
      (v_role_standard, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- pro: View assigned projects, can create personal projects
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_pro IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_pro, v_module_id, v_perm_view, true),
      (v_role_pro, v_module_id, v_perm_create, true),
      (v_role_pro, v_module_id, v_perm_edit, true),
      (v_role_pro, v_module_id, v_perm_delete, false),
      (v_role_pro, v_module_id, v_perm_assign, false),
      (v_role_pro, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- free: View only (no creation)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_free IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_free, v_module_id, v_perm_view, true),
      (v_role_free, v_module_id, v_perm_create, false),
      (v_role_free, v_module_id, v_perm_edit, false),
      (v_role_free, v_module_id, v_perm_delete, false),
      (v_role_free, v_module_id, v_perm_assign, false),
      (v_role_free, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- guest: View only (read-only)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF v_role_guest IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES
      (v_role_guest, v_module_id, v_perm_view, true),
      (v_role_guest, v_module_id, v_perm_create, false),
      (v_role_guest, v_module_id, v_perm_edit, false),
      (v_role_guest, v_module_id, v_perm_delete, false),
      (v_role_guest, v_module_id, v_perm_assign, false),
      (v_role_guest, v_module_id, v_perm_manage_roles, false)
    ON CONFLICT (role_id, module_id, permission_id) 
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Comments
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.modules.icon IS 
  'Lucide icon name for the module. Project Hub uses "FolderKanban".';
