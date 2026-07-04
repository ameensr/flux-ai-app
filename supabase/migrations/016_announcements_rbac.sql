-- Add Announcements module and new permissions to the RBAC system
-- so they appear in Enterprise RBAC > Roles & Permissions matrix.

-- ── Add new permissions (if not already present) ──────────────────────────────
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_share',     'Share',     'Can share items with others or external stakeholders'),
  ('can_configure', 'Configure', 'Can modify module settings and configurations')
ON CONFLICT (permission_key) DO NOTHING;

-- ── Add the Announcements module ──────────────────────────────────────────────
INSERT INTO public.modules (module_key, module_name, route_path, icon, sort_order) VALUES
  ('announcements', 'Announcements', '/announcements', 'Megaphone', 11)
ON CONFLICT (module_key) DO NOTHING;

-- ── Seed default permissions for announcements per role ───────────────────────
DO $$
DECLARE
  r_admin UUID; r_pro UUID; r_free UUID;
  m_ann UUID;
  p_view UUID; p_create UUID; p_edit UUID; p_delete UUID;
  p_share UUID; p_configure UUID;
BEGIN
  SELECT id INTO r_admin FROM public.roles WHERE role_key = 'admin';
  SELECT id INTO r_pro   FROM public.roles WHERE role_key = 'pro';
  SELECT id INTO r_free  FROM public.roles WHERE role_key = 'free';
  SELECT id INTO m_ann   FROM public.modules WHERE module_key = 'announcements';

  SELECT id INTO p_view      FROM public.permissions WHERE permission_key = 'can_view';
  SELECT id INTO p_create    FROM public.permissions WHERE permission_key = 'can_create';
  SELECT id INTO p_edit      FROM public.permissions WHERE permission_key = 'can_edit';
  SELECT id INTO p_delete    FROM public.permissions WHERE permission_key = 'can_delete';
  SELECT id INTO p_share     FROM public.permissions WHERE permission_key = 'can_share';
  SELECT id INTO p_configure FROM public.permissions WHERE permission_key = 'can_configure';

  -- Admin: full access to announcements
  IF r_admin IS NOT NULL AND m_ann IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_admin, m_ann, p_view,      true),
      (r_admin, m_ann, p_create,    true),
      (r_admin, m_ann, p_edit,      true),
      (r_admin, m_ann, p_delete,    true),
      (r_admin, m_ann, p_share,     true),
      (r_admin, m_ann, p_configure, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Pro: view only
  IF r_pro IS NOT NULL AND m_ann IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_pro, m_ann, p_view, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;

  -- Free: view only
  IF r_free IS NOT NULL AND m_ann IS NOT NULL THEN
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled) VALUES
      (r_free, m_ann, p_view, true)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;
END $$;
