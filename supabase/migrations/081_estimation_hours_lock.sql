-- ============================================================================
-- Migration: 081_estimation_hours_lock.sql
-- Description: Implement Estimation Hours Lock feature for both:
--              1. Support Issue Tracker (support_issues)
--              2. Release Task Tracker (release_tasks)
--              Adds independent lock columns, registers permissions, and seeds roles.
-- ============================================================================

-- 1. Add lock columns to public.support_issues
ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS estimated_hours_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_support_issues_locked ON public.support_issues(estimated_hours_locked);

-- 2. Add lock columns to public.release_tasks
ALTER TABLE public.release_tasks
  ADD COLUMN IF NOT EXISTS estimated_hours_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_release_tasks_locked ON public.release_tasks(estimated_hours_locked);

-- 3. Register dedicated permissions in public.permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_lock_estimated_hours',   'Lock Estimated Hours',   'Can lock Estimated Hours for a specific issue or task to prevent edits'),
  ('can_unlock_estimated_hours', 'Unlock Estimated Hours', 'Can unlock Estimated Hours for a specific issue or task'),
  ('can_edit_estimated_hours',   'Edit Estimated Hours',   'Can modify Estimated Hours when the estimation is unlocked')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description;

-- 4. Seed role permissions for both QA Operations Hub modules
DO $$
DECLARE
  v_support_module_id UUID;
  v_release_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_support_module_id FROM public.modules WHERE module_key = 'support-tracker';
  SELECT id INTO v_release_module_id FROM public.modules WHERE module_key = 'release-tracker';

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions 
      WHERE permission_key IN ('can_lock_estimated_hours', 'can_unlock_estimated_hours', 'can_edit_estimated_hours') 
    LOOP
      IF v_role.role_key IN ('super_admin', 'admin', 'manager', 'qa_lead', 'pro') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_engineer' THEN
        IF v_perm.permission_key = 'can_edit_estimated_hours' THEN
          v_enabled := true;
        ELSE
          v_enabled := false;
        END IF;
      ELSE
        v_enabled := false;
      END IF;

      -- Support module
      IF v_support_module_id IS NOT NULL THEN
        INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_support_module_id, v_perm.id, v_enabled)
        ON CONFLICT (role_id, module_id, permission_id)
        DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
      END IF;

      -- Release module
      IF v_release_module_id IS NOT NULL THEN
        INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_release_module_id, v_perm.id, v_enabled)
        ON CONFLICT (role_id, module_id, permission_id)
        DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
      END IF;

    END LOOP;
  END LOOP;
END $$;
