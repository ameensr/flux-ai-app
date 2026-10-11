-- ============================================================================
-- Migration 086: Project Data Archive
--
-- Adds:
--   1. project_archive_jobs table — audit trail for every archive operation.
--   2. can_archive_data permission — dedicated RBAC permission key.
--   3. Role grants — admin/super_admin/manager get the permission by default.
--   4. RLS policies — only the initiating user or admins can read/write jobs.
--
-- Tables exported by this feature:
--   • support_issues                (QA Operations Hub — Support Issue Tracker)
--   • release_tasks                 (QA Operations Hub — Release Task Tracker)
--   • daily_support_logs            (Daily Update Report — Support & Exception Log)
--   • daily_release_testing_status  (Daily Update Report — Release Testing Log)
--   • weekly_reports                (Daily Update Report — QA Weekly Reports)
--
-- All three tables already carry a project_id FK to public.projects.
-- Deletion is scoped strictly to rows WHERE project_id = <job.project_id>
-- AND id = ANY(<job.exported_record_ids>) so only the exact snapshot is removed.
-- ============================================================================

-- ── 1. project_archive_jobs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_archive_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  initiated_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Lifecycle status
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'exporting',
      'awaiting_download_confirmation',
      'ready_for_deletion',
      'deleting',
      'completed',
      'failed'
    )),

  -- Export metadata
  export_started_at     TIMESTAMPTZ,
  export_completed_at   TIMESTAMPTZ,
  export_status         TEXT,          -- 'success' | 'failed' | null

  -- Counts captured at export time (immutable snapshot)
  support_logs_count    INTEGER NOT NULL DEFAULT 0,
  release_logs_count    INTEGER NOT NULL DEFAULT 0,
  daily_support_count   INTEGER NOT NULL DEFAULT 0,
  daily_release_count   INTEGER NOT NULL DEFAULT 0,
  weekly_reports_count  INTEGER NOT NULL DEFAULT 0,
  total_records_count   INTEGER NOT NULL DEFAULT 0,

  -- Exact record IDs exported — used to scope deletion to the snapshot
  exported_support_ids        UUID[]  NOT NULL DEFAULT '{}',
  exported_release_ids        UUID[]  NOT NULL DEFAULT '{}',
  exported_daily_support_ids  UUID[]  NOT NULL DEFAULT '{}',
  exported_daily_release_ids  UUID[]  NOT NULL DEFAULT '{}',
  exported_report_ids         UUID[]  NOT NULL DEFAULT '{}',

  -- Deletion metadata
  deletion_started_at       TIMESTAMPTZ,
  deletion_completed_at     TIMESTAMPTZ,
  deletion_status           TEXT,
  deleted_support_count     INTEGER,
  deleted_release_count     INTEGER,
  deleted_daily_support_count INTEGER,
  deleted_daily_release_count INTEGER,
  deleted_report_count      INTEGER,
  total_deleted_count       INTEGER,

  -- Failure details
  failure_details       TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_archive_jobs_project_id   ON public.project_archive_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_initiated_by ON public.project_archive_jobs(initiated_by);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status       ON public.project_archive_jobs(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_archive_jobs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archive_jobs_updated_at ON public.project_archive_jobs;
CREATE TRIGGER archive_jobs_updated_at
  BEFORE UPDATE ON public.project_archive_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_archive_jobs_updated_at();

-- ── 1b. Add new columns if table already existed from a prior migration run ──
ALTER TABLE public.project_archive_jobs
  ADD COLUMN IF NOT EXISTS daily_support_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_release_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exported_daily_support_ids UUID[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exported_daily_release_ids UUID[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_daily_support_count INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_daily_release_count INTEGER;

-- ── 2. RLS for project_archive_jobs ─────────────────────────────────────────
ALTER TABLE public.project_archive_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archive_jobs_select" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_insert" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_update" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_delete" ON public.project_archive_jobs;

-- SELECT: admins see all; initiating user sees their own jobs; project members see jobs for their project
CREATE POLICY "archive_jobs_select" ON public.project_archive_jobs
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR initiated_by = auth.uid()
    OR private.is_project_member(project_id)
  );

-- INSERT: only authenticated users who are project members (permission enforced in app layer)
CREATE POLICY "archive_jobs_insert" ON public.project_archive_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND (private.is_admin() OR private.is_project_member(project_id))
  );

-- UPDATE: only the initiating user or admins can update (status transitions)
CREATE POLICY "archive_jobs_update" ON public.project_archive_jobs
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR initiated_by = auth.uid()
  );

-- DELETE: only admins (audit records must survive operational deletion)
CREATE POLICY "archive_jobs_delete" ON public.project_archive_jobs
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- ── 3. Add can_archive_data permission ───────────────────────────────────────
INSERT INTO public.permissions (permission_key, permission_name, description)
VALUES (
  'can_archive_data',
  'Archive Project Data',
  'Can export project data to Excel and permanently delete archived records from the active database'
)
ON CONFLICT (permission_key) DO NOTHING;

-- ── 4. Grant can_archive_data to admin / super_admin / manager roles ─────────
DO $$
DECLARE
  v_module_id   UUID;
  v_perm_id     UUID;
  v_role        RECORD;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'project-hub';
  SELECT id INTO v_perm_id   FROM public.permissions WHERE permission_key = 'can_archive_data';

  IF v_module_id IS NULL OR v_perm_id IS NULL THEN
    RAISE NOTICE 'project-hub module or can_archive_data permission not found — skipping grant';
    RETURN;
  END IF;

  FOR v_role IN
    SELECT id FROM public.roles WHERE role_key IN ('admin', 'super_admin', 'manager')
  LOOP
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm_id, true)
    ON CONFLICT (role_id, module_id, permission_id)
    DO UPDATE SET is_enabled = true;
  END LOOP;

  -- All other roles: insert with is_enabled = false so they appear in the RBAC matrix
  FOR v_role IN
    SELECT id FROM public.roles WHERE role_key NOT IN ('admin', 'super_admin', 'manager')
  LOOP
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm_id, false)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- ── 5. Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.project_archive_jobs IS
  'Audit trail for Project Data Archive operations. Each row tracks one export+deletion cycle for a project. Never deleted by the archive operation itself.';

COMMENT ON COLUMN public.project_archive_jobs.exported_support_ids IS
  'Exact UUIDs of support_issues rows included in the export.';

COMMENT ON COLUMN public.project_archive_jobs.exported_release_ids IS
  'Exact UUIDs of release_tasks rows included in the export.';

COMMENT ON COLUMN public.project_archive_jobs.exported_daily_support_ids IS
  'Exact UUIDs of daily_support_logs rows included in the export.';

COMMENT ON COLUMN public.project_archive_jobs.exported_daily_release_ids IS
  'Exact UUIDs of daily_release_testing_status rows included in the export.';

COMMENT ON COLUMN public.project_archive_jobs.exported_report_ids IS
  'Exact UUIDs of weekly_reports rows included in the export.';
