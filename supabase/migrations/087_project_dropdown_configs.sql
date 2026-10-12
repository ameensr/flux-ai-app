-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 087: Centralized Project-Wise Dropdown Configuration
--
-- Creates a single project_dropdown_configs table with 4 centralized categories:
--
--   status        → Testing Status, Retesting Status, Task Status, QA Report Testing Status
--   qa_engineers  → QA Engineers (Testers), Assigned To (QA Engineers)
--   priority      → Release Tracker Priority, QA Report Priority
--   is_qa_miss    → Is QA Miss? (independent)
--
-- /daily-report is NOT connected to this table and remains unchanged.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create the centralized table
CREATE TABLE IF NOT EXISTS public.project_dropdown_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Centralized category keys:
  --   status       | qa_engineers | priority | is_qa_miss
  category    TEXT NOT NULL,
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  color       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate values within the same project + category
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_dropdown_project_cat_val
  ON public.project_dropdown_configs (project_id, category, lower(value));

CREATE INDEX IF NOT EXISTS idx_project_dropdown_project_id
  ON public.project_dropdown_configs (project_id);

CREATE INDEX IF NOT EXISTS idx_project_dropdown_category
  ON public.project_dropdown_configs (project_id, category, sort_order);

-- 2. Enable RLS
ALTER TABLE public.project_dropdown_configs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "project_dropdown_select" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_select" ON public.project_dropdown_configs
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_dropdown_configs.project_id
          AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
      )
    );

  DROP POLICY IF EXISTS "project_dropdown_insert" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_insert" ON public.project_dropdown_configs
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_dropdown_configs.project_id
          AND pm.user_id = auth.uid()
          AND pm.project_role IN ('owner', 'lead')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin', 'manager')
      )
    );

  DROP POLICY IF EXISTS "project_dropdown_update" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_update" ON public.project_dropdown_configs
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_dropdown_configs.project_id
          AND pm.user_id = auth.uid()
          AND pm.project_role IN ('owner', 'lead')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin', 'manager')
      )
    );

  DROP POLICY IF EXISTS "project_dropdown_delete" ON public.project_dropdown_configs;
  CREATE POLICY "project_dropdown_delete" ON public.project_dropdown_configs
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_dropdown_configs.project_id
          AND pm.user_id = auth.uid()
          AND pm.project_role IN ('owner', 'lead')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin', 'manager')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Grant privileges
GRANT ALL ON TABLE public.project_dropdown_configs TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Migrate existing support_issue_dropdown_configs → centralized categories
--    testing_status  → status
--    tester          → qa_engineers
--    is_qa_miss      → is_qa_miss
--    retesting_status → status (merged — same pool of status values)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project RECORD;
  v_row     RECORD;
BEGIN
  FOR v_project IN
    SELECT DISTINCT project_id FROM public.support_issues
    WHERE project_id IS NOT NULL
  LOOP
    -- testing_status → status
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.support_issue_dropdown_configs
      WHERE category = 'testing_status'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'status', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;

    -- retesting_status → status (merged into same pool)
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.support_issue_dropdown_configs
      WHERE category = 'retesting_status'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'status', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;

    -- tester → qa_engineers
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.support_issue_dropdown_configs
      WHERE category = 'tester'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'qa_engineers', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;

    -- is_qa_miss → is_qa_miss (stays independent)
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.support_issue_dropdown_configs
      WHERE category = 'is_qa_miss'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'is_qa_miss', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Migrate existing release_task_dropdown_configs → centralized categories
--    task_status → status
--    priority    → priority
--    assigned_to → qa_engineers
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project RECORD;
  v_row     RECORD;
BEGIN
  FOR v_project IN
    SELECT DISTINCT project_id FROM public.release_tasks
    WHERE project_id IS NOT NULL AND is_deleted = false
  LOOP
    -- task_status → status (merged into same pool)
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.release_task_dropdown_configs
      WHERE category = 'task_status'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'status', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;

    -- priority → priority
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.release_task_dropdown_configs
      WHERE category = 'priority'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'priority', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;

    -- assigned_to → qa_engineers (merged into same pool)
    FOR v_row IN
      SELECT category, label, value, color, is_active, sort_order
      FROM public.release_task_dropdown_configs
      WHERE category = 'assigned_to'
      ORDER BY sort_order
    LOOP
      INSERT INTO public.project_dropdown_configs
        (project_id, category, label, value, color, is_active, sort_order)
      VALUES
        (v_project.project_id, 'qa_engineers', v_row.label, v_row.value,
         v_row.color, v_row.is_active, v_row.sort_order)
      ON CONFLICT (project_id, category, lower(value)) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Seed default values for all projects that have no config yet
--    Uses hardcoded defaults (daily_report_dropdown_configs has no label/color columns)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project RECORD;
BEGIN
  FOR v_project IN SELECT id FROM public.projects LOOP

    -- Default status values (covers testing, retesting, task status, QA report status)
    INSERT INTO public.project_dropdown_configs (project_id, category, label, value, color, is_active, sort_order)
    VALUES
      (v_project.id, 'status', 'Not Started', 'Not Started', '#94a3b8', true, 1),
      (v_project.id, 'status', 'Assigned',    'Assigned',    '#3b82f6', true, 2),
      (v_project.id, 'status', 'In Testing',  'In Testing',  '#8b5cf6', true, 3),
      (v_project.id, 'status', 'In Progress', 'In Progress', '#8b5cf6', true, 4),
      (v_project.id, 'status', 'Blocked',     'Blocked',     '#ef4444', true, 5),
      (v_project.id, 'status', 'Retesting',   'Retesting',   '#06b6d4', true, 6),
      (v_project.id, 'status', 'In Review',   'In Review',   '#f59e0b', true, 7),
      (v_project.id, 'status', 'Completed',   'Completed',   '#10b981', true, 8),
      (v_project.id, 'status', 'Cancelled',   'Cancelled',   '#6b7280', true, 9),
      (v_project.id, 'status', 'Pass',        'Pass',        '#10b981', true, 10),
      (v_project.id, 'status', 'Fail',        'Fail',        '#ef4444', true, 11)
    ON CONFLICT (project_id, category, lower(value)) DO NOTHING;

    -- Default priority values
    INSERT INTO public.project_dropdown_configs (project_id, category, label, value, color, is_active, sort_order)
    VALUES
      (v_project.id, 'priority', 'Critical', 'Critical', '#ef4444', true, 1),
      (v_project.id, 'priority', 'High',     'High',     '#f97316', true, 2),
      (v_project.id, 'priority', 'Medium',   'Medium',   '#3b82f6', true, 3),
      (v_project.id, 'priority', 'Low',      'Low',      '#10b981', true, 4)
    ON CONFLICT (project_id, category, lower(value)) DO NOTHING;

    -- Default is_qa_miss values
    INSERT INTO public.project_dropdown_configs (project_id, category, label, value, color, is_active, sort_order)
    VALUES
      (v_project.id, 'is_qa_miss', 'Yes',            'Yes',            NULL, true, 1),
      (v_project.id, 'is_qa_miss', 'No',             'No',             NULL, true, 2),
      (v_project.id, 'is_qa_miss', 'Under Review',   'Under Review',   NULL, true, 3),
      (v_project.id, 'is_qa_miss', 'Not Applicable', 'Not Applicable', NULL, true, 4)
    ON CONFLICT (project_id, category, lower(value)) DO NOTHING;

    -- qa_engineers: intentionally left empty — admins add their team members per project

  END LOOP;
END $$;
