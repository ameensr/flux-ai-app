-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 076: Support Issue Tracker Module
-- 
-- Registers the Support Issue Tracker module, granular permissions,
-- and creates the storage tables for support issues, audit history, and
-- configurable dropdowns with RLS policies.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Register Module
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('support-tracker', 'Support Issue Tracker', '/support-tracker', 'LifeBuoy', true, 18)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  is_active = EXCLUDED.is_active;

-- 2. Register new granular permissions if not already existing
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_view_dashboard',     'View Support Dashboard',  'Can view the Manager Live Dashboard overview and analytics'),
  ('can_view_history',       'View History',            'Can view complete audit history logs and change trails'),
  ('can_configure_dropdowns','Configure Dropdowns',     'Can modify master dropdown lists (testing status, testers)'),
  ('can_import',             'Import Support Issues',   'Can import support issues in bulk from Excel/CSV')
ON CONFLICT (permission_key) DO NOTHING;

-- 3. Seed Role Permissions for Support Issue Tracker
DO $$
DECLARE
  v_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'support-tracker';
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
      -- Permission matrix rules
      v_enabled := false;

      IF v_role.role_key IN ('admin', 'super_admin') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'manager' THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_delete', 'can_manage_permissions');
      ELSIF v_role.role_key IN ('qa_engineer', 'pro') THEN
        v_enabled := v_perm.permission_key IN ('can_view', 'can_create', 'can_edit', 'can_export', 'can_view_history');
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

-- 4. Create support_issues table
CREATE TABLE IF NOT EXISTS public.support_issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no             INTEGER,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  issue_id          TEXT NOT NULL,
  description       TEXT NOT NULL,
  received_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date        DATE,
  finish_date       DATE,
  tester_name       TEXT,
  estimated_hours   NUMERIC(6, 2) NOT NULL DEFAULT 0,
  actual_hours      NUMERIC(6, 2) NOT NULL DEFAULT 0,
  testing_status    TEXT NOT NULL DEFAULT 'Not Started',
  comments          TEXT DEFAULT '',
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_issues_project_id ON public.support_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_issue_id ON public.support_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_status ON public.support_issues(testing_status);
CREATE INDEX IF NOT EXISTS idx_support_issues_tester ON public.support_issues(tester_name);

-- 5. Create support_issue_history table
CREATE TABLE IF NOT EXISTS public.support_issue_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  field         TEXT,
  old_value     TEXT,
  new_value     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_issue_history_issue_id ON public.support_issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_issue_history_timestamp ON public.support_issue_history(timestamp DESC);

-- 6. Create support_issue_dropdown_configs table
CREATE TABLE IF NOT EXISTS public.support_issue_dropdown_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL, -- 'testing_status', 'tester', 'priority'
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  color         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_dropdown_category ON public.support_issue_dropdown_configs(category, sort_order);

-- 7. Enable RLS
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issue_dropdown_configs ENABLE ROW LEVEL SECURITY;

-- 8. Policies for authenticated users
DO $$
BEGIN
  DROP POLICY IF EXISTS "support_issues_all_auth" ON public.support_issues;
  CREATE POLICY "support_issues_all_auth" ON public.support_issues
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_history_all_auth" ON public.support_issue_history;
  CREATE POLICY "support_history_all_auth" ON public.support_issue_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_dropdown_all_auth" ON public.support_issue_dropdown_configs;
  CREATE POLICY "support_dropdown_all_auth" ON public.support_issue_dropdown_configs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
