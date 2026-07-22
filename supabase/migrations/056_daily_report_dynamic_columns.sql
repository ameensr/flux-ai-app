-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 056: QA Daily Update — Dynamic Column Customization
--
-- Introduces a metadata-driven schema for customizing the columns shown in the
-- Daily Update Report's "Support & Exception Log" and "Release Testing Log"
-- tables, scoped per-project or as an organization-wide default.
--
-- Design goals (see spec):
--   - No physical DB columns created when a user adds a custom UI column.
--   - Renaming a column only changes display_name — internal_key (stable ID)
--     never changes, so data mapping and integrations keep working.
--   - Existing hardcoded columns are seeded as protected "System Columns"
--     (is_system = true) so current data/behavior is fully backward compatible.
--   - Resolution priority: Project Specific config → Organization Default.
--     (No "Team" tier — the `teams` table/concept was removed in migration
--     036_remove_teams.sql and replaced by `projects` + `project_members`.)
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Column configuration metadata table
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_report_column_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = Organization Default
  table_key             TEXT NOT NULL CHECK (table_key IN ('support', 'release')),
  internal_key          TEXT NOT NULL, -- stable identifier, NEVER shown to users, NEVER changed by rename
  display_name          TEXT NOT NULL,
  column_type           TEXT NOT NULL DEFAULT 'short_text' CHECK (column_type IN (
                           'short_text', 'long_text', 'number', 'percentage', 'date', 'datetime',
                           'dropdown', 'multiselect', 'status', 'boolean', 'user', 'url'
                         )),
  description           TEXT,           -- help text shown to users filling the field
  placeholder            TEXT,
  is_required            BOOLEAN NOT NULL DEFAULT false,
  is_visible             BOOLEAN NOT NULL DEFAULT true,
  is_system              BOOLEAN NOT NULL DEFAULT false, -- protected column, cannot be permanently deleted
  include_in_qa_report   BOOLEAN NOT NULL DEFAULT true,
  include_in_export      BOOLEAN NOT NULL DEFAULT true,
  default_value          TEXT,
  dropdown_options       JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ id, label, sort_order }] for custom dropdown/multiselect/status columns
  config_category        TEXT,           -- legacy link to daily_report_dropdown_configs.category for system select columns (branch, qa, testing_status, retesting_status, issue_source, smoke_status)
  display_order          INTEGER NOT NULL DEFAULT 0,
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- internal_key must be unique per scope (org default OR per-project), per table
CREATE UNIQUE INDEX IF NOT EXISTS uq_column_configs_org
  ON public.daily_report_column_configs (table_key, internal_key)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_column_configs_project
  ON public.daily_report_column_configs (project_id, table_key, internal_key)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_column_configs_project_table
  ON public.daily_report_column_configs (project_id, table_key);

DROP TRIGGER IF EXISTS column_configs_updated_at ON public.daily_report_column_configs;
CREATE TRIGGER column_configs_updated_at
  BEFORE UPDATE ON public.daily_report_column_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Custom field values (JSONB row-value store for dynamic/custom columns)
--    System columns continue to use their existing physical DB columns —
--    this table only stores values for user-added custom columns.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_report_custom_field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id        UUID NOT NULL, -- id of a daily_support_logs or daily_release_testing_status row
  table_key     TEXT NOT NULL CHECK (table_key IN ('support', 'release')),
  column_id     UUID NOT NULL REFERENCES public.daily_report_column_configs(id) ON DELETE CASCADE,
  value         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (row_id, column_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_row ON public.daily_report_custom_field_values (row_id, table_key);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_column ON public.daily_report_custom_field_values (column_id);

DROP TRIGGER IF EXISTS custom_field_values_updated_at ON public.daily_report_custom_field_values;
CREATE TRIGGER custom_field_values_updated_at
  BEFORE UPDATE ON public.daily_report_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Import from DUP → QA Report column mapping preferences
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_report_column_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = organization default mapping
  table_key      TEXT NOT NULL CHECK (table_key IN ('support', 'release')),
  dup_column_id  UUID NOT NULL REFERENCES public.daily_report_column_configs(id) ON DELETE CASCADE,
  action         TEXT NOT NULL DEFAULT 'skip' CHECK (action IN ('map_existing', 'create_new', 'skip')),
  target_field   TEXT, -- existing QA Report field key (map_existing) or new field label (create_new)
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_column_mappings_org
  ON public.daily_report_column_mappings (table_key, dup_column_id)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_column_mappings_project
  ON public.daily_report_column_mappings (project_id, table_key, dup_column_id)
  WHERE project_id IS NOT NULL;

DROP TRIGGER IF EXISTS column_mappings_updated_at ON public.daily_report_column_mappings;
CREATE TRIGGER column_mappings_updated_at
  BEFORE UPDATE ON public.daily_report_column_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Row Level Security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.daily_report_column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_column_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "column_configs_select" ON public.daily_report_column_configs;
DROP POLICY IF EXISTS "column_configs_write" ON public.daily_report_column_configs;

-- SELECT: any authenticated user can read config so the table can render.
-- Actual page-level visibility is already gated by the daily-report module's
-- can_view permission in the frontend router / usePermissions.
CREATE POLICY "column_configs_select" ON public.daily_report_column_configs FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- WRITE (insert/update/delete): org-default rows require org-level config
-- permission; project-scoped rows require project-level config permission
-- OR being the project owner/lead. Admins always pass.
CREATE POLICY "column_configs_write" ON public.daily_report_column_configs FOR ALL USING (
  public.is_admin()
  OR (
    project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND public.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  OR (
    project_id IS NOT NULL AND (
      public.is_project_owner_or_lead(project_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND public.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
) WITH CHECK (
  public.is_admin()
  OR (
    project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND public.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  OR (
    project_id IS NOT NULL AND (
      public.is_project_owner_or_lead(project_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND public.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
);

DROP POLICY IF EXISTS "custom_field_values_select" ON public.daily_report_custom_field_values;
DROP POLICY IF EXISTS "custom_field_values_write" ON public.daily_report_custom_field_values;

-- Visibility of a custom field value is inherited from the underlying row's
-- own RLS policy on daily_support_logs / daily_release_testing_status (the
-- sub-selects below run with the invoking user's privileges, so they are
-- filtered by that table's existing SELECT policy automatically).
CREATE POLICY "custom_field_values_select" ON public.daily_report_custom_field_values FOR SELECT USING (
  (table_key = 'support' AND EXISTS (SELECT 1 FROM public.daily_support_logs r WHERE r.id = row_id))
  OR (table_key = 'release' AND EXISTS (SELECT 1 FROM public.daily_release_testing_status r WHERE r.id = row_id))
);

CREATE POLICY "custom_field_values_write" ON public.daily_report_custom_field_values FOR ALL USING (
  (
    (table_key = 'support' AND EXISTS (SELECT 1 FROM public.daily_support_logs r WHERE r.id = row_id))
    OR (table_key = 'release' AND EXISTS (SELECT 1 FROM public.daily_release_testing_status r WHERE r.id = row_id))
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND (p.role IN ('admin', 'super_admin') OR public.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
) WITH CHECK (
  (
    (table_key = 'support' AND EXISTS (SELECT 1 FROM public.daily_support_logs r WHERE r.id = row_id))
    OR (table_key = 'release' AND EXISTS (SELECT 1 FROM public.daily_release_testing_status r WHERE r.id = row_id))
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND (p.role IN ('admin', 'super_admin') OR public.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
);

DROP POLICY IF EXISTS "column_mappings_select" ON public.daily_report_column_mappings;
DROP POLICY IF EXISTS "column_mappings_write" ON public.daily_report_column_mappings;

CREATE POLICY "column_mappings_select" ON public.daily_report_column_mappings FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "column_mappings_write" ON public.daily_report_column_mappings FOR ALL USING (
  public.is_admin()
  OR (
    project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND public.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  OR (
    project_id IS NOT NULL AND (
      public.is_project_owner_or_lead(project_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND public.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
) WITH CHECK (
  public.is_admin()
  OR (
    project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND public.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  OR (
    project_id IS NOT NULL AND (
      public.is_project_owner_or_lead(project_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND public.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RBAC: new granular permissions for column customization
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_manage_columns',        'Manage Columns',            'Can open the Customize QA Daily Update Columns interface'),
  ('can_add_columns',           'Add Custom Columns',        'Can add new custom columns to the QA Daily Update table'),
  ('can_rename_columns',        'Rename Columns',            'Can rename the display label of existing columns'),
  ('can_reorder_columns',       'Reorder Columns',           'Can reorder columns via drag-and-drop'),
  ('can_hide_show_columns',     'Hide/Show Columns',         'Can toggle column visibility'),
  ('can_delete_custom_columns', 'Delete Custom Columns',     'Can permanently delete custom (non-system) columns'),
  ('can_manage_org_config',     'Manage Organization Config','Can manage the organization-wide default column configuration'),
  ('can_manage_project_config', 'Manage Project Config',     'Can manage the column configuration for a specific project')
ON CONFLICT (permission_key) DO NOTHING;

-- Seed role_module_permissions for the new keys against the daily-report module
DO $$
DECLARE
  m_daily UUID;
  r RECORD;
  p RECORD;
  new_keys TEXT[] := ARRAY[
    'can_manage_columns', 'can_add_columns', 'can_rename_columns', 'can_reorder_columns',
    'can_hide_show_columns', 'can_delete_custom_columns', 'can_manage_org_config', 'can_manage_project_config'
  ];
  is_full_access BOOLEAN;
BEGIN
  SELECT id INTO m_daily FROM public.modules WHERE module_key = 'daily-report';
  IF m_daily IS NULL THEN
    RETURN;
  END IF;

  FOR r IN SELECT id, role_key FROM public.roles LOOP
    -- Full access roles: admin, super_admin, pro, manager, qa_lead get everything enabled.
    -- All other roles (including newly created custom roles) default to false,
    -- consistent with the deny-by-default policy established in migration 046.
    is_full_access := r.role_key IN ('admin', 'super_admin', 'pro', 'manager', 'qa_lead');

    FOR p IN SELECT id, permission_key FROM public.permissions WHERE permission_key = ANY(new_keys) LOOP
      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (r.id, m_daily, p.id, is_full_access)
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Seed System Columns (backward-compatible with existing hardcoded fields)
--    project_id = NULL → these become the Organization Default configuration.
--    internal_key matches the existing physical DB column name exactly, so no
--    data mapping changes are required for existing records.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.daily_report_column_configs
  (project_id, table_key, internal_key, display_name, column_type, is_required, is_visible, is_system, include_in_qa_report, include_in_export, config_category, display_order)
VALUES
  -- Support & Exception Log system columns
  (NULL, 'support', 'support_id',               'Support ID',           'short_text', true,  true, true, true, true, NULL,               1),
  (NULL, 'support', 'bug_id',                    'Bug ID',                'short_text', false, true, true, true, true, NULL,               2),
  (NULL, 'support', 'branch',                    'Branch',                'dropdown',   false, true, true, true, true, 'branch',           3),
  (NULL, 'support', 'description',               'Description',          'long_text',  true,  true, true, true, true, NULL,               4),
  (NULL, 'support', 'received_date',             'Received Date',        'date',       false, true, true, true, true, NULL,               5),
  (NULL, 'support', 'qa',                        'QA',                    'dropdown',   false, true, true, true, true, 'qa',               6),
  (NULL, 'support', 'tc_count',                  'TC Count',              'number',     false, true, true, true, true, NULL,               7),
  (NULL, 'support', 'estimation_hrs',            'Estimation (Hrs)',      'number',     false, true, true, true, true, NULL,               8),
  (NULL, 'support', 'actual_start_date',         'Actual Start Date',     'date',       false, true, true, true, true, NULL,               9),
  (NULL, 'support', 'planned_end_date',          'Planned End Date',      'date',       false, true, true, true, true, NULL,              10),
  (NULL, 'support', 'actual_end_date',           'Actual End Date',       'date',       false, true, true, true, true, NULL,              11),
  (NULL, 'support', 'testing_status',            'Testing Status',        'dropdown',   false, true, true, true, true, 'testing_status',  12),
  (NULL, 'support', 'issue_source',              'Issue Source',          'dropdown',   false, true, true, true, true, 'issue_source',    13),
  (NULL, 'support', 'comments',                  'Comments',              'long_text',  false, true, true, true, true, NULL,              14),
  (NULL, 'support', 'blocked_hours',             'Blocked Hours',         'number',     false, true, true, true, true, NULL,              15),
  (NULL, 'support', 'retesting_status',          'Retesting Status',      'dropdown',   false, true, true, true, true, 'retesting_status',16),
  (NULL, 'support', 'retesting_estimation_hrs',  'Retesting Est (Hrs)',   'number',     false, true, true, true, true, NULL,              17),

  -- Release Testing Log system columns
  (NULL, 'release', 'task_id',                          'Task ID',                 'short_text', true,  true, true, true, true, NULL,              1),
  (NULL, 'release', 'description',                      'Description',             'long_text',  true,  true, true, true, true, NULL,              2),
  (NULL, 'release', 'qa',                               'QA',                       'dropdown',   false, true, true, true, true, 'qa',              3),
  (NULL, 'release', 'initial_round_estimation_hrs',     'Initial Est (Hrs)',       'number',     false, true, true, true, true, NULL,              4),
  (NULL, 'release', 'testing_status',                   'Testing Status',          'dropdown',   false, true, true, true, true, 'testing_status',  5),
  (NULL, 'release', 'smoke_testing_status',             'Smoke Status',            'dropdown',   false, true, true, true, true, 'smoke_status',    6),
  (NULL, 'release', 'scope_of_testing_for_smoke',       'Smoke Test Scope',        'long_text',  false, true, true, true, true, NULL,              7),
  (NULL, 'release', 'smoke_testing_estimation_hrs',     'Smoke Est (Hrs)',         'number',     false, true, true, true, true, NULL,              8),
  (NULL, 'release', 'overall_scope_of_testing',         'Overall Scope',           'long_text',  false, true, true, true, true, NULL,              9),
  (NULL, 'release', 'overall_estimation_hrs',           'Overall Est (Hrs)',       'number',     false, true, true, true, true, NULL,             10)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Comments
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.daily_report_column_configs IS
  'Metadata-driven column configuration for the QA Daily Update tables (Support & Exception Log, Release Testing Log). project_id NULL = Organization Default; project_id set = Project Specific override. Resolution priority: Project → Organization Default.';

COMMENT ON COLUMN public.daily_report_column_configs.internal_key IS
  'Stable identifier used for data mapping. Never changes when display_name is renamed. For system columns this matches the physical DB column name; for custom columns this is a generated key with no corresponding physical column.';

COMMENT ON TABLE public.daily_report_custom_field_values IS
  'JSONB value store for custom (non-system) column data, keyed by row_id + column_id. Keeps custom fields fully metadata-driven without altering the physical schema of daily_support_logs / daily_release_testing_status.';

COMMENT ON TABLE public.daily_report_column_mappings IS
  'Saved user preferences for mapping QA Daily Update columns to QA Report columns during the Import from DUP workflow.';
