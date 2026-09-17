-- Migration: Add bug-status module permissions
-- This adds the "What's the Bug Status?" module to the RBAC system

-- Insert the module
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('bug-status', 'What''s the Bug Status?', '/bug-status', 'AlertCircle', true, 15)
ON CONFLICT (module_key) DO NOTHING;

-- Grant permissions to all roles
DO $$
DECLARE
  v_module_id uuid;
  v_perm_view_id uuid;
  v_perm_export_id uuid;
  v_role_id uuid;
  v_role_key text;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'bug-status';
  SELECT id INTO v_perm_view_id FROM public.permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_export_id FROM public.permissions WHERE permission_key = 'can_export';
  
  -- Grant permissions to all roles
  FOR v_role_id, v_role_key IN SELECT id, role_key FROM public.roles
  LOOP
    -- can_view for all roles
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role_id, v_module_id, v_perm_view_id, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    
    -- can_export for admin, super_admin, pro roles
    IF v_role_key IN ('admin', 'super_admin', 'pro') THEN
      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role_id, v_module_id, v_perm_export_id, true)
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
