-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 034: Project Hub - Replace Teams with Project-based Organization
-- 
-- Creates projects table and project_members junction table.
-- Projects are the new organizational unit for QA work.
-- Managers and QA Leads can create projects and assign team members.
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Projects table
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  project_code      TEXT, -- e.g., "PROJ-001", "QA-MOBILE-2026"
  status            TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  start_date        DATE,
  target_end_date   DATE,
  actual_end_date   DATE,
  tags              TEXT[], -- array of project tags/categories
  metadata          JSONB DEFAULT '{}', -- flexible storage for custom fields
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(project_code);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_projects_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Project Members junction table
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_role  TEXT NOT NULL DEFAULT 'member'
    CHECK (project_role IN ('owner', 'lead', 'member', 'viewer')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Add project_id to existing feature tables
-- ══════════════════════════════════════════════════════════════════════════════

-- Weekly reports
ALTER TABLE public.weekly_reports 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_id ON public.weekly_reports(project_id);

-- Daily support logs
ALTER TABLE public.daily_support_logs 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_daily_support_logs_project_id ON public.daily_support_logs(project_id);

-- Daily release testing status
ALTER TABLE public.daily_release_testing_status 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_daily_release_testing_status_project_id ON public.daily_release_testing_status(project_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Helper functions for project access control
-- ══════════════════════════════════════════════════════════════════════════════

-- Check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
$$;

-- Check if user is manager or qa_lead
CREATE OR REPLACE FUNCTION public.is_project_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('manager', 'qa_lead', 'admin', 'super_admin')
  )
$$;

-- Check if user is a member of a specific project
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid AND user_id = auth.uid()
  )
$$;

-- Check if user is project owner or lead
CREATE OR REPLACE FUNCTION public.is_project_owner_or_lead(project_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid 
      AND user_id = auth.uid() 
      AND project_role IN ('owner', 'lead')
  )
$$;

-- Get user's organization_id (returns NULL if no organization support)
CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULL::UUID
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Row-Level Security for projects
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- SELECT: Admins see all, managers see all, others see projects they're members of
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (
  public.is_admin() 
  OR public.is_project_manager()
  OR public.is_project_member(id)
);

-- INSERT: Admins, managers, and qa_leads can create projects
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (
  public.is_admin() OR public.is_project_manager()
);

-- UPDATE: Admins, project owners/leads, or managers can update
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (
  public.is_admin() 
  OR public.is_project_owner_or_lead(id)
  OR public.is_project_manager()
);

-- DELETE: Only admins and project owners can delete
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (
  public.is_admin() OR public.is_project_owner_or_lead(id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Row-Level Security for project_members
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

-- SELECT: Anyone who can see the project can see its members
CREATE POLICY "project_members_select" ON public.project_members FOR SELECT USING (
  public.is_admin() 
  OR public.is_project_member(project_id)
  OR public.is_project_manager()
);

-- INSERT: Admins, project owners/leads, or managers can assign members
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT WITH CHECK (
  public.is_admin() 
  OR public.is_project_owner_or_lead(project_id)
  OR public.is_project_manager()
);

-- UPDATE: Admins, project owners/leads, or managers can update roles
CREATE POLICY "project_members_update" ON public.project_members FOR UPDATE USING (
  public.is_admin() 
  OR public.is_project_owner_or_lead(project_id)
  OR public.is_project_manager()
);

-- DELETE: Admins, project owners/leads, or managers can remove members
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE USING (
  public.is_admin() 
  OR public.is_project_owner_or_lead(project_id)
  OR user_id = auth.uid() -- users can leave projects themselves
  OR public.is_project_manager()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Update RLS policies for feature tables to use project_id
-- ══════════════════════════════════════════════════════════════════════════════

-- Weekly Reports: Allow access if user is project member or admin
DROP POLICY IF EXISTS "weekly_reports_select" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_insert" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_update" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_delete" ON public.weekly_reports;

CREATE POLICY "weekly_reports_select" ON public.weekly_reports FOR SELECT USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL) -- legacy data without project
);

CREATE POLICY "weekly_reports_insert" ON public.weekly_reports FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "weekly_reports_update" ON public.weekly_reports FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);

CREATE POLICY "weekly_reports_delete" ON public.weekly_reports FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- Daily Support Logs
DROP POLICY IF EXISTS "daily_support_logs_select" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_insert" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_update" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_delete" ON public.daily_support_logs;

CREATE POLICY "daily_support_logs_select" ON public.daily_support_logs FOR SELECT USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL)
);

CREATE POLICY "daily_support_logs_insert" ON public.daily_support_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "daily_support_logs_update" ON public.daily_support_logs FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);

CREATE POLICY "daily_support_logs_delete" ON public.daily_support_logs FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- Daily Release Testing Status
DROP POLICY IF EXISTS "daily_release_testing_status_select" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_insert" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_update" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_delete" ON public.daily_release_testing_status;

CREATE POLICY "daily_release_testing_status_select" ON public.daily_release_testing_status FOR SELECT USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL)
);

CREATE POLICY "daily_release_testing_status_insert" ON public.daily_release_testing_status FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "daily_release_testing_status_update" ON public.daily_release_testing_status FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);

CREATE POLICY "daily_release_testing_status_delete" ON public.daily_release_testing_status FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Comments
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.projects IS 
  'Projects are the primary organizational unit for QA work. Each project has members with specific roles.';

COMMENT ON TABLE public.project_members IS 
  'Junction table linking users to projects with project-specific roles (owner, lead, member, viewer).';

COMMENT ON COLUMN public.projects.status IS 
  'Project lifecycle status: active (in progress), on_hold (paused), completed (finished), archived (closed)';

COMMENT ON COLUMN public.project_members.project_role IS 
  'Project-specific role: owner (full control), lead (manage members), member (contribute), viewer (read-only)';
