-- Migration: Add StoryPot module to RBAC system
-- This adds the story-pot module and its permissions to the database

-- 1. Insert the module
INSERT INTO modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('story-pot', 'StoryPot', '/story-pot', 'Soup', true, 25)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  is_active = EXCLUDED.is_active;

-- 2. Get the module ID and insert permissions
DO $$
DECLARE
  v_module_id UUID;
  v_perm_view UUID;
  v_perm_dashboard UUID;
  v_perm_export UUID;
  v_perm_import UUID;
  v_role RECORD;
BEGIN
  -- Get module ID
  SELECT id INTO v_module_id FROM modules WHERE module_key = 'story-pot';

  -- Get permission IDs
  SELECT id INTO v_perm_view FROM permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_dashboard FROM permissions WHERE permission_key = 'can_view_dashboard';
  SELECT id INTO v_perm_export FROM permissions WHERE permission_key = 'can_export';
  SELECT id INTO v_perm_import FROM permissions WHERE permission_key = 'can_import';

  -- Insert role_module_permissions for each role
  FOR v_role IN SELECT id, role_key FROM roles LOOP
    -- can_view - all roles get this
    IF v_perm_view IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_view, true)
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;

    -- can_view_dashboard - admin, super_admin, pro, manager, qa_lead
    IF v_perm_dashboard IS NOT NULL THEN
      IF v_role.role_key IN ('admin', 'super_admin', 'pro', 'manager', 'qa_lead') THEN
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_dashboard, true)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      ELSE
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_dashboard, false)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      END IF;
    END IF;

    -- can_export - all except free
    IF v_perm_export IS NOT NULL THEN
      IF v_role.role_key != 'free' THEN
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_export, true)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      ELSE
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_export, false)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      END IF;
    END IF;

    -- can_import - admin, super_admin, manager only
    IF v_perm_import IS NOT NULL THEN
      IF v_role.role_key IN ('admin', 'super_admin', 'manager') THEN
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_import, true)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      ELSE
        INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_module_id, v_perm_import, false)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;
