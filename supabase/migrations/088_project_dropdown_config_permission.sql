-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 088: Manage Project-Wise Dropdown Configuration Permission
--
-- Adds a dedicated 'can_manage_dropdown_config' permission to the project-hub
-- module and updates RLS policies on project_dropdown_configs to enforce it.
--
-- Permission behavior:
--   Enabled  → user can view, add, edit, delete dropdown config for the project
--   Disabled → user cannot access or modify dropdown configuration
--   Not set  → treated as disabled (deny by default)
--
-- /daily-report is NOT affected by this migration.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Register the new permission
INSERT INTO public.permissions (permission_key, permission_name, description)
VALUES (
  'can_manage_dropdown_config',
  'Manage Project-Wise Dropdown Configuration',
  'Can view, add, edit, and delete centralized dropdown configuration values for a project (Status, QA Engineers, Priority, Is QA Miss?)'
)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description     = EXCLUDED.description;

-- 2. Seed role_module_permissions for project-hub × can_manage_dropdown_config
DO $$
DECLARE
  v_module_id UUID;
  v_perm_id   UUID;
  v_role      RECORD;
  v_enabled   BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'project-hub';
  SELECT id INTO v_perm_id   FROM public.permissions WHERE permission_key = 'can_manage_dropdown_config';

  IF v_module_id IS NULL OR v_perm_id IS NULL THEN
    RAISE NOTICE 'project-hub module or can_manage_dropdown_config permission not found — skipping seed';
    RETURN;
  END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    -- admin, super_admin, manager → enabled by default
    -- all others → disabled by default (must be explicitly granted)
    v_enabled := v_role.role_key IN ('admin', 'super_admin', 'manager');

    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm_id, v_enabled)
    ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled;
  END LOOP;
END $$;

-- 3. Update RLS policies on project_dropdown_configs to enforce the new permission
--
--    SELECT: any project member (unchanged — read is still open to members)
--    INSERT / UPDATE / DELETE: require can_manage_dropdown_config OR admin/super_admin
--
--    The permission is stored in role_module_permissions and resolved via the
--    existing get_role_permissions RPC. For RLS we check it directly via a
--    helper that mirrors the same logic used by the frontend.
--
--    Implementation note: RLS cannot call the RPC directly, so we inline the
--    equivalent join against role_module_permissions.

DO $$
BEGIN
  -- INSERT
  DROP POLICY IF EXISTS "project_dropdown_insert" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_insert" ON public.project_dropdown_configs
    FOR INSERT TO authenticated
    WITH CHECK (
      -- admin / super_admin bypass
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
      )
      OR
      -- user has can_manage_dropdown_config enabled for their role on project-hub
      EXISTS (
        SELECT 1
        FROM public.profiles          pr
        JOIN public.roles             r   ON r.role_key = pr.role
        JOIN public.modules           m   ON m.module_key = 'project-hub'
        JOIN public.permissions       pm  ON pm.permission_key = 'can_manage_dropdown_config'
        JOIN public.role_module_permissions rmp
          ON rmp.role_id = r.id
         AND rmp.module_id = m.id
         AND rmp.permission_id = pm.id
         AND rmp.is_enabled = true
        WHERE pr.id = auth.uid()
      )
      AND
      -- must also be a member of the target project
      EXISTS (
        SELECT 1 FROM public.project_members pm2
        WHERE pm2.project_id = project_dropdown_configs.project_id
          AND pm2.user_id = auth.uid()
      )
    );

  -- UPDATE
  DROP POLICY IF EXISTS "project_dropdown_update" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_update" ON public.project_dropdown_configs
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.profiles          pr
          JOIN public.roles             r   ON r.role_key = pr.role
          JOIN public.modules           m   ON m.module_key = 'project-hub'
          JOIN public.permissions       pm  ON pm.permission_key = 'can_manage_dropdown_config'
          JOIN public.role_module_permissions rmp
            ON rmp.role_id = r.id
           AND rmp.module_id = m.id
           AND rmp.permission_id = pm.id
           AND rmp.is_enabled = true
          WHERE pr.id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM public.project_members pm2
          WHERE pm2.project_id = project_dropdown_configs.project_id
            AND pm2.user_id = auth.uid()
        )
      )
    );

  -- DELETE
  DROP POLICY IF EXISTS "project_dropdown_delete" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_delete" ON public.project_dropdown_configs
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.profiles          pr
          JOIN public.roles             r   ON r.role_key = pr.role
          JOIN public.modules           m   ON m.module_key = 'project-hub'
          JOIN public.permissions       pm  ON pm.permission_key = 'can_manage_dropdown_config'
          JOIN public.role_module_permissions rmp
            ON rmp.role_id = r.id
           AND rmp.module_id = m.id
           AND rmp.permission_id = pm.id
           AND rmp.is_enabled = true
          WHERE pr.id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM public.project_members pm2
          WHERE pm2.project_id = project_dropdown_configs.project_id
            AND pm2.user_id = auth.uid()
        )
      )
    );

EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
