-- ============================================================
-- 037: Admin Hub module + RBAC permissions
--
-- Replaces a mistaken JSON dump that was never valid SQL.
-- Adds admin-hub and grants admin/super_admin capabilities.
-- ============================================================

INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES (
  'admin-hub',
  'Admin Hub',
  '/admin',
  'Shield',
  true,
  5
)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permissions (permission_key, permission_name, description)
VALUES
  ('can_manage_users',          'Manage Users',          'Create, update, and deactivate users'),
  ('can_manage_roles',          'Manage Roles',          'Create and edit system roles'),
  ('can_manage_permissions',    'Manage Permissions',    'Edit role-module permission matrix'),
  ('can_manage_ai_providers',   'Manage AI Providers',   'Configure AI provider keys and models'),
  ('can_manage_announcements',  'Manage Announcements',  'Create and manage announcements'),
  ('can_view_audit_logs',       'View Audit Logs',       'View system audit and login history'),
  ('can_manage_templates',      'Manage Templates',      'Manage permission templates'),
  ('can_manage_maintenance',    'Manage Maintenance',    'Toggle maintenance mode'),
  ('can_manage_system',         'Manage System',         'System-level administration')
ON CONFLICT (permission_key) DO NOTHING;

DO $$
DECLARE
  v_module_id UUID;
  v_role_admin UUID;
  v_role_super_admin UUID;
  v_perm RECORD;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'admin-hub';
  SELECT id INTO v_role_admin FROM public.roles WHERE role_key = 'admin';
  SELECT id INTO v_role_super_admin FROM public.roles WHERE role_key = 'super_admin';

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'admin-hub module was not created';
  END IF;

  FOR v_perm IN
    SELECT id FROM public.permissions
    WHERE permission_key IN (
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_manage_users',
      'can_manage_roles',
      'can_manage_permissions',
      'can_manage_ai_providers',
      'can_manage_announcements',
      'can_view_audit_logs',
      'can_manage_templates',
      'can_manage_maintenance',
      'can_manage_system'
    )
  LOOP
    IF v_role_admin IS NOT NULL THEN
      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role_admin, v_module_id, v_perm.id, true)
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = true;
    END IF;

    IF v_role_super_admin IS NOT NULL THEN
      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role_super_admin, v_module_id, v_perm.id, true)
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = true;
    END IF;
  END LOOP;
END $$;
