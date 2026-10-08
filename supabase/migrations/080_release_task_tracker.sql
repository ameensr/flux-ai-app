-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 080: Release Task Tracker Module
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Register Module
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('release-tracker', 'Release Task Tracker', '/release-tracker', 'GitBranch', true, 19)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path  = EXCLUDED.route_path,
  is_active   = EXCLUDED.is_active;

-- 2. Seed Role Permissions
DO $$
DECLARE
  v_module_id UUID;
  v_role      RECORD;
  v_perm      RECORD;
  v_enabled   BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'release-tracker';
  IF v_module_id IS NULL THEN RETURN; END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN
      SELECT id, permission_key FROM public.permissions
      WHERE permission_key IN (
        'can_view','can_view_dashboard','can_create','can_edit','can_delete',
        'can_export','can_import','can_view_history','can_configure_dropdowns','can_manage_permissions'
      )
    LOOP
      v_enabled := false;
      IF v_role.role_key IN ('admin','super_admin') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'manager' THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_delete','can_manage_permissions');
      ELSIF v_role.role_key IN ('qa_engineer','pro') THEN
        v_enabled := v_perm.permission_key IN ('can_view','can_create','can_edit','can_export','can_view_history');
      ELSIF v_role.role_key IN ('standard','free') THEN
        v_enabled := v_perm.permission_key IN ('can_view','can_create');
      END IF;

      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
      ON CONFLICT (role_id, module_id, permission_id)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END LOOP;
  END LOOP;
END $$;

-- 3. release_tasks table
CREATE TABLE IF NOT EXISTS public.release_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no            INTEGER,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  product_code     TEXT,
  release_version  TEXT NOT NULL DEFAULT '',
  task_id          TEXT NOT NULL,
  description      TEXT NOT NULL,
  priority         TEXT NOT NULL DEFAULT 'Medium',
  start_date       DATE,
  target_date      DATE,
  finish_date      DATE,
  assigned_to      TEXT,
  assigned_to_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_hours  NUMERIC(6,2) NOT NULL DEFAULT 0,
  actual_hours     NUMERIC(6,2) NOT NULL DEFAULT 0,
  task_status      TEXT NOT NULL DEFAULT 'Not Started',
  comments         TEXT DEFAULT '',
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_tasks_project_id ON public.release_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_task_id    ON public.release_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_status     ON public.release_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_release_tasks_release    ON public.release_tasks(release_version);

DROP INDEX IF EXISTS uq_release_tasks_task_id;
CREATE UNIQUE INDEX uq_release_tasks_task_id ON public.release_tasks(task_id);

-- 4. release_task_time_logs table
CREATE TABLE IF NOT EXISTS public.release_task_time_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         TEXT NOT NULL,
  release_task_id UUID REFERENCES public.release_tasks(id) ON DELETE CASCADE,
  user_name       TEXT NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours_added     NUMERIC(6,2) NOT NULL,
  comment         TEXT DEFAULT '',
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rel_time_logs_task_id         ON public.release_task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_rel_time_logs_release_task_id ON public.release_task_time_logs(release_task_id);

-- 5. release_task_history table
CREATE TABLE IF NOT EXISTS public.release_task_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      TEXT NOT NULL,
  product_name TEXT NOT NULL,
  release      TEXT,
  user_name    TEXT NOT NULL,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  field        TEXT,
  old_value    TEXT,
  new_value    TEXT,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rel_history_task_id   ON public.release_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_rel_history_timestamp ON public.release_task_history(timestamp DESC);

-- 6. release_task_dropdown_configs table
CREATE TABLE IF NOT EXISTS public.release_task_dropdown_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  color      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rel_dropdown_category ON public.release_task_dropdown_configs(category, sort_order);

DROP INDEX IF EXISTS uq_rel_dropdown_category_value;
CREATE UNIQUE INDEX uq_rel_dropdown_category_value
  ON public.release_task_dropdown_configs (category, lower(value));

-- 7. Enable RLS
ALTER TABLE public.release_tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_time_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_dropdown_configs  ENABLE ROW LEVEL SECURITY;

-- 8. Policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "rel_tasks_all_auth"     ON public.release_tasks;
  CREATE POLICY "rel_tasks_all_auth"     ON public.release_tasks             FOR ALL TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "rel_timelogs_all_auth"  ON public.release_task_time_logs;
  CREATE POLICY "rel_timelogs_all_auth"  ON public.release_task_time_logs    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "rel_history_all_auth"   ON public.release_task_history;
  CREATE POLICY "rel_history_all_auth"   ON public.release_task_history      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "rel_dropdown_all_auth"  ON public.release_task_dropdown_configs;
  CREATE POLICY "rel_dropdown_all_auth"  ON public.release_task_dropdown_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Grants
GRANT ALL ON TABLE public.release_tasks                 TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_time_logs        TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_history          TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_dropdown_configs TO authenticated, anon, service_role;
