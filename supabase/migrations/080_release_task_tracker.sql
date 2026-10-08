-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 080: Release Task Tracker Module
-- 
-- Registers the Release Task Tracker module under QA Operations Hub,
-- seeds granular RBAC role permissions, and creates storage tables for
-- release tasks, cumulative time logs, audit history, and configurable dropdowns.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Register Module in public.modules
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('release-tracker', 'Release Task Tracker', '/release-tracker', 'Rocket', true, 19)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  is_active = EXCLUDED.is_active;

-- 2. Ensure granular permissions are registered in public.permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_view_dashboard',     'View Dashboard',           'Can view the Manager Live Dashboard overview and analytics'),
  ('can_view_history',       'View History',             'Can view complete audit history logs and change trails'),
  ('can_configure_dropdowns','Configure Dropdowns',      'Can modify master dropdown lists (status, priority, etc.)'),
  ('can_import',             'Import Data',              'Can import records in bulk from Excel/CSV')
ON CONFLICT (permission_key) DO NOTHING;

-- 3. Seed Role Permissions for Release Task Tracker
DO $$
DECLARE
  v_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'release-tracker';
  IF v_module_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions WHERE permission_key IN (
      'can_view',
      'can_view_dashboard',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export',
      'can_import',
      'can_view_history',
      'can_configure_dropdowns',
      'can_manage_permissions'
    ) LOOP
      v_enabled := false;

      IF v_role.role_key IN ('admin', 'super_admin', 'manager') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_delete', 'can_manage_permissions');
      ELSIF v_role.role_key IN ('qa_engineer') THEN
        v_enabled := v_perm.permission_key IN ('can_view', 'can_create', 'can_edit', 'can_export', 'can_view_history');
      ELSIF v_role.role_key = 'pro' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_manage_permissions');
      ELSIF v_role.role_key IN ('standard', 'free') THEN
        v_enabled := v_perm.permission_key IN ('can_view', 'can_create');
      ELSIF v_role.role_key = 'guest' THEN
        v_enabled := false;
      END IF;

      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
      ON CONFLICT (role_id, module_id, permission_id) 
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END LOOP;
  END LOOP;
END $$;

-- 4. Create release_tasks table
CREATE TABLE IF NOT EXISTS public.release_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no                 INTEGER,
  project_id            UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  product_code          TEXT,
  release_version       TEXT NOT NULL DEFAULT 'Release 1.0',
  task_id               TEXT NOT NULL,
  description           TEXT NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'Medium',
  start_date            DATE,
  target_date           DATE,
  finish_date           DATE,
  assigned_to_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name      TEXT NOT NULL DEFAULT 'Unassigned',
  estimated_hours       NUMERIC(6, 2) NOT NULL DEFAULT 0,
  actual_hours          NUMERIC(6, 2) NOT NULL DEFAULT 0,
  task_status           TEXT NOT NULL DEFAULT 'Not Started',
  comments              TEXT DEFAULT '',
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on task_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_release_tasks_task_id ON public.release_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_project_id ON public.release_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_release ON public.release_tasks(release_version);
CREATE INDEX IF NOT EXISTS idx_release_tasks_status ON public.release_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_release_tasks_priority ON public.release_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_release_tasks_assigned ON public.release_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_deleted ON public.release_tasks(is_deleted);

-- 5. Create release_task_time_logs table (Cumulative work hours)
CREATE TABLE IF NOT EXISTS public.release_task_time_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           TEXT NOT NULL,
  release_task_id   UUID REFERENCES public.release_tasks(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours_added       NUMERIC(6, 2) NOT NULL,
  comment           TEXT NOT NULL DEFAULT '',
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_time_logs_task_str ON public.release_task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_release_time_logs_task_id ON public.release_task_time_logs(release_task_id);
CREATE INDEX IF NOT EXISTS idx_release_time_logs_logged_at ON public.release_task_time_logs(logged_at DESC);

-- 6. Create release_task_history table (Audit trail)
CREATE TABLE IF NOT EXISTS public.release_task_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  release_version   TEXT NOT NULL,
  user_name         TEXT NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  field             TEXT,
  old_value         TEXT,
  new_value         TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_task_history_task_id ON public.release_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_release_task_history_timestamp ON public.release_task_history(timestamp DESC);

-- 7. Create release_task_dropdown_configs table
CREATE TABLE IF NOT EXISTS public.release_task_dropdown_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL, -- 'task_status', 'priority'
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  color         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_release_dropdown_category_value
  ON public.release_task_dropdown_configs (category, lower(value));

-- Seed default dropdown configs
INSERT INTO public.release_task_dropdown_configs (category, label, value, color, is_active, sort_order)
VALUES
  ('task_status', 'Not Started', 'Not Started', '#94a3b8', true, 1),
  ('task_status', 'Assigned',    'Assigned',    '#3b82f6', true, 2),
  ('task_status', 'In Progress', 'In Progress', '#8b5cf6', true, 3),
  ('task_status', 'Blocked',     'Blocked',     '#ef4444', true, 4),
  ('task_status', 'In Review',   'In Review',   '#f59e0b', true, 5),
  ('task_status', 'Completed',   'Completed',   '#10b981', true, 6),
  ('task_status', 'Cancelled',   'Cancelled',   '#6b7280', true, 7),
  ('priority',    'Critical',    'Critical',    '#ef4444', true, 1),
  ('priority',    'High',        'High',        '#f97316', true, 2),
  ('priority',    'Medium',      'Medium',      '#3b82f6', true, 3),
  ('priority',    'Low',         'Low',         '#10b981', true, 4)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- 8. Enable Row Level Security
ALTER TABLE public.release_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_dropdown_configs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (fully permissive for authenticated and anon to ensure 100% reliable operations)
DO $$
BEGIN
  DROP POLICY IF EXISTS "release_tasks_all_auth" ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_all_anon" ON public.release_tasks;
  CREATE POLICY "release_tasks_all_auth" ON public.release_tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_tasks_all_anon" ON public.release_tasks
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_time_logs_all_auth" ON public.release_task_time_logs;
  DROP POLICY IF EXISTS "release_time_logs_all_anon" ON public.release_task_time_logs;
  CREATE POLICY "release_time_logs_all_auth" ON public.release_task_time_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_time_logs_all_anon" ON public.release_task_time_logs
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_history_all_auth" ON public.release_task_history;
  DROP POLICY IF EXISTS "release_history_all_anon" ON public.release_task_history;
  CREATE POLICY "release_history_all_auth" ON public.release_task_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_history_all_anon" ON public.release_task_history
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_dropdown_all_auth" ON public.release_task_dropdown_configs;
  DROP POLICY IF EXISTS "release_dropdown_all_anon" ON public.release_task_dropdown_configs;
  CREATE POLICY "release_dropdown_all_auth" ON public.release_task_dropdown_configs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_dropdown_all_anon" ON public.release_task_dropdown_configs
    FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 10. Grant table privileges
GRANT ALL ON TABLE public.release_tasks TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_time_logs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_history TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_dropdown_configs TO authenticated, anon, service_role;
