-- ============================================================
-- 026: Cleanup Module Permissions - Remove Meaningless Permissions
-- Audit all modules and keep only permissions that are actually meaningful
-- Based on MODULE_PERMISSIONS registry in modulePermissions.ts
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- STEP 1: Remove all existing role_module_permissions
-- We'll rebuild them with only meaningful permissions
-- ══════════════════════════════════════════════════════════════
DELETE FROM public.role_module_permissions;

-- ══════════════════════════════════════════════════════════════
-- STEP 2: Seed module-specific permissions
-- Each module gets ONLY the permissions it actually uses
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  r_admin UUID; r_super_admin UUID; r_pro UUID; r_free UUID;
  m_dashboard UUID; m_bug UUID; m_test UUID; m_writing UUID; 
  m_qa_report UUID; m_daily UUID; m_settings UUID; m_admin UUID;
  m_announcements UUID; m_history UUID;
  
  p_view UUID; p_create UUID; p_edit UUID; p_delete UUID;
  p_export UUID; p_gen_ai UUID; p_adv_ai UUID; p_share UUID; p_configure UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO r_admin FROM public.roles WHERE role_key = 'admin';
  SELECT id INTO r_super_admin FROM public.roles WHERE role_key = 'super_admin';
  SELECT id INTO r_pro FROM public.roles WHERE role_key = 'pro';
  SELECT id INTO r_free FROM public.roles WHERE role_key = 'free';

  -- Get module IDs
  SELECT id INTO m_dashboard FROM public.modules WHERE module_key = 'dashboard';
  SELECT id INTO m_bug FROM public.modules WHERE module_key = 'bug-refiner';
  SELECT id INTO m_test FROM public.modules WHERE module_key = 'test-generator';
  SELECT id INTO m_writing FROM public.modules WHERE module_key = 'writing-assistant';
  SELECT id INTO m_qa_report FROM public.modules WHERE module_key = 'qa-report';
  SELECT id INTO m_daily FROM public.modules WHERE module_key = 'daily-report';
  SELECT id INTO m_settings FROM public.modules WHERE module_key = 'settings';
  SELECT id INTO m_admin FROM public.modules WHERE module_key = 'admin';
  SELECT id INTO m_announcements FROM public.modules WHERE module_key = 'announcements';
  SELECT id INTO m_history FROM public.modules WHERE module_key = 'history';

  -- Get permission IDs
  SELECT id INTO p_view FROM public.permissions WHERE permission_key = 'can_view';
  SELECT id INTO p_create FROM public.permissions WHERE permission_key = 'can_create';
  SELECT id INTO p_edit FROM public.permissions WHERE permission_key = 'can_edit';
  SELECT id INTO p_delete FROM public.permissions WHERE permission_key = 'can_delete';
  SELECT id INTO p_export FROM public.permissions WHERE permission_key = 'can_export';
  SELECT id INTO p_gen_ai FROM public.permissions WHERE permission_key = 'can_generate_ai';
  SELECT id INTO p_adv_ai FROM public.permissions WHERE permission_key = 'can_use_advanced_ai';
  SELECT id INTO p_share FROM public.permissions WHERE permission_key = 'can_share';
  SELECT id INTO p_configure FROM public.permissions WHERE permission_key = 'can_configure';

  -- ══════════════════════════════════════════════════════════════
  -- ADMIN: Full access to everything
  -- ══════════════════════════════════════════════════════════════
  
  -- Dashboard: view, export
  IF r_admin IS NOT NULL AND m_dashboard IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_dashboard, p_view, true),
      (r_admin, m_dashboard, p_export, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Bug Refiner: all 8 permissions
  IF r_admin IS NOT NULL AND m_bug IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_bug, p_view, true),
      (r_admin, m_bug, p_create, true),
      (r_admin, m_bug, p_edit, true),
      (r_admin, m_bug, p_delete, true),
      (r_admin, m_bug, p_export, true),
      (r_admin, m_bug, p_gen_ai, true),
      (r_admin, m_bug, p_adv_ai, true),
      (r_admin, m_bug, p_share, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Test Generator: all 8 permissions
  IF r_admin IS NOT NULL AND m_test IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_test, p_view, true),
      (r_admin, m_test, p_create, true),
      (r_admin, m_test, p_edit, true),
      (r_admin, m_test, p_delete, true),
      (r_admin, m_test, p_export, true),
      (r_admin, m_test, p_gen_ai, true),
      (r_admin, m_test, p_adv_ai, true),
      (r_admin, m_test, p_share, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Writing Assistant: 7 permissions (no share)
  IF r_admin IS NOT NULL AND m_writing IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_writing, p_view, true),
      (r_admin, m_writing, p_create, true),
      (r_admin, m_writing, p_edit, true),
      (r_admin, m_writing, p_delete, true),
      (r_admin, m_writing, p_export, true),
      (r_admin, m_writing, p_gen_ai, true),
      (r_admin, m_writing, p_adv_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- QA Report: 7 permissions
  IF r_admin IS NOT NULL AND m_qa_report IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_qa_report, p_view, true),
      (r_admin, m_qa_report, p_create, true),
      (r_admin, m_qa_report, p_edit, true),
      (r_admin, m_qa_report, p_delete, true),
      (r_admin, m_qa_report, p_export, true),
      (r_admin, m_qa_report, p_gen_ai, true),
      (r_admin, m_qa_report, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Daily Report: 6 permissions
  IF r_admin IS NOT NULL AND m_daily IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_daily, p_view, true),
      (r_admin, m_daily, p_create, true),
      (r_admin, m_daily, p_edit, true),
      (r_admin, m_daily, p_delete, true),
      (r_admin, m_daily, p_export, true),
      (r_admin, m_daily, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Settings: 2 permissions only
  IF r_admin IS NOT NULL AND m_settings IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_settings, p_view, true),
      (r_admin, m_settings, p_edit, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Admin Panel: 2 permissions
  IF r_admin IS NOT NULL AND m_admin IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_admin, p_view, true),
      (r_admin, m_admin, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Announcements: 5 permissions
  IF r_admin IS NOT NULL AND m_announcements IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_announcements, p_view, true),
      (r_admin, m_announcements, p_create, true),
      (r_admin, m_announcements, p_edit, true),
      (r_admin, m_announcements, p_delete, true),
      (r_admin, m_announcements, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- History: 3 permissions
  IF r_admin IS NOT NULL AND m_history IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_history, p_view, true),
      (r_admin, m_history, p_delete, true),
      (r_admin, m_history, p_export, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- PRO: Premium modules with appropriate permissions
  -- ══════════════════════════════════════════════════════════════

  -- Dashboard: view, export
  IF r_pro IS NOT NULL AND m_dashboard IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_dashboard, p_view, true),
      (r_pro, m_dashboard, p_export, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Bug Refiner: all except share (7 permissions)
  IF r_pro IS NOT NULL AND m_bug IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_bug, p_view, true),
      (r_pro, m_bug, p_create, true),
      (r_pro, m_bug, p_edit, true),
      (r_pro, m_bug, p_delete, true),
      (r_pro, m_bug, p_export, true),
      (r_pro, m_bug, p_gen_ai, true),
      (r_pro, m_bug, p_adv_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Test Generator: all except share (7 permissions)
  IF r_pro IS NOT NULL AND m_test IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_test, p_view, true),
      (r_pro, m_test, p_create, true),
      (r_pro, m_test, p_edit, true),
      (r_pro, m_test, p_delete, true),
      (r_pro, m_test, p_export, true),
      (r_pro, m_test, p_gen_ai, true),
      (r_pro, m_test, p_adv_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Writing Assistant: 7 permissions
  IF r_pro IS NOT NULL AND m_writing IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_writing, p_view, true),
      (r_pro, m_writing, p_create, true),
      (r_pro, m_writing, p_edit, true),
      (r_pro, m_writing, p_delete, true),
      (r_pro, m_writing, p_export, true),
      (r_pro, m_writing, p_gen_ai, true),
      (r_pro, m_writing, p_adv_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- QA Report: 7 permissions
  IF r_pro IS NOT NULL AND m_qa_report IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_qa_report, p_view, true),
      (r_pro, m_qa_report, p_create, true),
      (r_pro, m_qa_report, p_edit, true),
      (r_pro, m_qa_report, p_delete, true),
      (r_pro, m_qa_report, p_export, true),
      (r_pro, m_qa_report, p_gen_ai, true),
      (r_pro, m_qa_report, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Daily Report: 6 permissions
  IF r_pro IS NOT NULL AND m_daily IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_daily, p_view, true),
      (r_pro, m_daily, p_create, true),
      (r_pro, m_daily, p_edit, true),
      (r_pro, m_daily, p_delete, true),
      (r_pro, m_daily, p_export, true),
      (r_pro, m_daily, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Settings: view and edit
  IF r_pro IS NOT NULL AND m_settings IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_settings, p_view, true),
      (r_pro, m_settings, p_edit, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- History: view, delete, export
  IF r_pro IS NOT NULL AND m_history IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_history, p_view, true),
      (r_pro, m_history, p_delete, true),
      (r_pro, m_history, p_export, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- FREE: Basic modules with limited permissions
  -- ══════════════════════════════════════════════════════════════

  -- Dashboard: view only
  IF r_free IS NOT NULL AND m_dashboard IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_dashboard, p_view, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Bug Refiner: basic CRUD + AI (no advanced AI, no export, no share)
  IF r_free IS NOT NULL AND m_bug IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_bug, p_view, true),
      (r_free, m_bug, p_create, true),
      (r_free, m_bug, p_edit, false),
      (r_free, m_bug, p_delete, false),
      (r_free, m_bug, p_gen_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Test Generator: basic CRUD + AI
  IF r_free IS NOT NULL AND m_test IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_test, p_view, true),
      (r_free, m_test, p_create, true),
      (r_free, m_test, p_edit, false),
      (r_free, m_test, p_delete, false),
      (r_free, m_test, p_gen_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Writing Assistant: basic
  IF r_free IS NOT NULL AND m_writing IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_writing, p_view, true),
      (r_free, m_writing, p_create, true),
      (r_free, m_writing, p_gen_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- QA Report: view and create only
  IF r_free IS NOT NULL AND m_qa_report IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_qa_report, p_view, true),
      (r_free, m_qa_report, p_create, true),
      (r_free, m_qa_report, p_gen_ai, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Daily Report: view and create
  IF r_free IS NOT NULL AND m_daily IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_daily, p_view, true),
      (r_free, m_daily, p_create, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Settings: view and edit
  IF r_free IS NOT NULL AND m_settings IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_settings, p_view, true),
      (r_free, m_settings, p_edit, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

END $$;

-- ══════════════════════════════════════════════════════════════
-- STEP 3: For any enterprise roles added in migration 008,
-- seed them with NO access by default (so they appear in matrix)
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  m record;
  p record;
BEGIN
  -- For all non-system roles (enterprise roles)
  FOR r IN SELECT id FROM public.roles WHERE is_system = false LOOP
    -- For all modules
    FOR m IN SELECT id FROM public.modules LOOP
      -- For all permissions
      FOR p IN SELECT id FROM public.permissions LOOP
        INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (r.id, m.id, p.id, false)
        ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
