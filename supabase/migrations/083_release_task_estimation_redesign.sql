-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 083: Release Task Tracker — Estimation Redesign
--
-- Adds four individual estimation columns, received_date_time, actual_end_date.
-- Migrates existing estimated_hours into functional_testing_estimation_hrs.
-- Adds estimation lock permissions to RBAC.
-- Non-destructive: all existing data preserved.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add new estimation columns (safe: IF NOT EXISTS)
ALTER TABLE public.release_tasks
  ADD COLUMN IF NOT EXISTS test_design_est_hrs        NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_prep_est_hrs          NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS functional_testing_est_hrs NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retesting_est_hrs          NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_date_time         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_date            DATE,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_by  TEXT,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_at  TIMESTAMPTZ;

-- 2. Migrate existing estimated_hours → functional_testing_est_hrs for legacy rows
--    Only migrate where the new column is still 0 and old column has a value.
UPDATE public.release_tasks
SET functional_testing_est_hrs = estimated_hours
WHERE functional_testing_est_hrs = 0
  AND estimated_hours > 0;

-- 3. Seed can_lock_estimated_hours and can_unlock_estimated_hours permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_lock_estimated_hours',   'Lock Estimated Hours',   'Can lock individual estimation fields to prevent further editing'),
  ('can_unlock_estimated_hours', 'Unlock Estimated Hours', 'Can unlock estimation fields for authorized editing'),
  ('can_edit_estimated_hours',   'Edit Estimated Hours',   'Can edit estimation fields when unlocked'),
  ('can_edit_time_logs',         'Edit Time Logs',         'Can correct previously logged time-log entries with mandatory audit reason')
ON CONFLICT (permission_key) DO NOTHING;

-- 4. Seed role permissions for the new permission keys
DO $$
DECLARE
  v_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'release-tracker';
  IF v_module_id IS NULL THEN RETURN; END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions WHERE permission_key IN (
      'can_lock_estimated_hours',
      'can_unlock_estimated_hours',
      'can_edit_estimated_hours',
      'can_edit_time_logs'
    ) LOOP
      v_enabled := false;

      IF v_role.role_key IN ('admin', 'super_admin', 'manager') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := true;
      ELSIF v_role.role_key IN ('qa_engineer', 'pro') THEN
        v_enabled := v_perm.permission_key IN ('can_edit_estimated_hours', 'can_edit_time_logs');
      ELSE
        v_enabled := false;
      END IF;

      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
      ON CONFLICT (role_id, module_id, permission_id)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END LOOP;
  END LOOP;
END $$;

-- 5. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_release_tasks_received_dt  ON public.release_tasks(received_date_time);
CREATE INDEX IF NOT EXISTS idx_release_tasks_actual_end   ON public.release_tasks(actual_end_date);
