-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 084: Dashboard Quick Details Permission
-- 
-- Registers the granular 'can_view_quick_details' permission in public.permissions
-- and seeds default role permissions for the Dashboard module.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure 'can_view_quick_details' is registered in public.permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_view_quick_details', 'Project Pulse', 'Can view the role-based Project Pulse health dashboard and AI risk summary on the main dashboard')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description;

-- 2. Seed Role Permissions for Dashboard Module
DO $$
DECLARE
  v_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'dashboard';
  IF v_module_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_perm FROM public.permissions WHERE permission_key = 'can_view_quick_details';
  IF v_perm IS NULL THEN
    RETURN;
  END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    v_enabled := false;

    -- Roles granted Quick Details by default: admin, super_admin, manager, qa_lead, qa_engineer, pro
    IF v_role.role_key IN ('admin', 'super_admin', 'manager', 'qa_lead', 'qa_engineer', 'pro') THEN
      v_enabled := true;
    END IF;

    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
    ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled;
  END LOOP;
END $$;
