-- Consolidate can_manage into can_configure (they serve the same purpose).
-- Transfer all existing can_manage assignments to can_configure, then remove can_manage.

DO $$
DECLARE
  p_manage_id UUID;
  p_configure_id UUID;
BEGIN
  SELECT id INTO p_manage_id FROM public.permissions WHERE permission_key = 'can_manage';
  SELECT id INTO p_configure_id FROM public.permissions WHERE permission_key = 'can_configure';

  -- If can_configure doesn't exist yet (shouldn't happen, but safety)
  IF p_configure_id IS NULL THEN
    INSERT INTO public.permissions (permission_key, permission_name, description)
    VALUES ('can_configure', 'Configure', 'Can modify module settings and configurations')
    RETURNING id INTO p_configure_id;
  END IF;

  -- If can_manage exists, migrate its assignments to can_configure
  IF p_manage_id IS NOT NULL THEN
    -- Insert can_configure entries for any role+module that had can_manage but not can_configure
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    SELECT rmp.role_id, rmp.module_id, p_configure_id, rmp.is_enabled
    FROM public.role_module_permissions rmp
    WHERE rmp.permission_id = p_manage_id
      AND NOT EXISTS (
        SELECT 1 FROM public.role_module_permissions existing
        WHERE existing.role_id = rmp.role_id
          AND existing.module_id = rmp.module_id
          AND existing.permission_id = p_configure_id
      )
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;

    -- Delete all can_manage assignments
    DELETE FROM public.role_module_permissions WHERE permission_id = p_manage_id;

    -- Delete the can_manage permission itself
    DELETE FROM public.permissions WHERE id = p_manage_id;
  END IF;
END $$;

-- Update RLS policy on projects table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can manage projects" ON projects';
    EXECUTE '
      CREATE POLICY "Admins and managers can manage projects"
        ON projects FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                p.role = ''super_admin'' OR
                p.role = ''admin'' OR
                public.check_module_permission(p.role, ''qa-report'', ''can_configure'')
              )
          )
        )';
  END IF;
END $$;
